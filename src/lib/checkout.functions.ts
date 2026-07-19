import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const RESERVATION_MINUTES = 30;
const PLATFORM_FEE_BPS = 1000; // 10.00%
const CARD_FEE_BPS = 399; // 3.99%
const MAX_QTY_HARD_CAP = 10;

function computeFees(subtotalCents: number, discountCents: number, method: "pix" | "card") {
  const base = Math.max(0, subtotalCents - discountCents);
  const platformFee = Math.round((base * PLATFORM_FEE_BPS) / 10000);
  const paymentFee = method === "card" ? Math.round((base * CARD_FEE_BPS) / 10000) : 0;
  return { platformFee, paymentFee, total: base + platformFee + paymentFee };
}

const createDraftInput = z.object({
  kind: z.enum(["event", "course"]),
  eventId: z.string().min(1).optional(),
  ticketBatchId: z.string().min(1).optional(),
  courseId: z.string().min(1).optional(),
  quantity: z.number().int().min(1).max(MAX_QTY_HARD_CAP),
});

export const createDraftOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => createDraftInput.parse(raw))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.kind === "event") {
      if (!data.eventId || !data.ticketBatchId) throw new Error("Lote inválido");
      const { data: orderId, error } = await supabaseAdmin.rpc("create_event_draft_order", {
        _buyer_id: userId,
        _event_id: data.eventId,
        _batch_id: data.ticketBatchId,
        _quantity: data.quantity,
        _reservation_minutes: RESERVATION_MINUTES,
        _platform_fee_bps: PLATFORM_FEE_BPS,
      });
      if (error || !orderId) throw new Error(error?.message ?? "Falha ao criar pedido");
      return { orderId: orderId as string };
    }

    if (!data.courseId) throw new Error("Curso inválido");
    if (data.quantity !== 1) throw new Error("Cursos são vendidos por unidade");
    const { data: orderId, error } = await supabaseAdmin.rpc("create_course_draft_order", {
      _buyer_id: userId,
      _course_id: data.courseId,
      _reservation_minutes: RESERVATION_MINUTES,
      _platform_fee_bps: PLATFORM_FEE_BPS,
    });
    if (error || !orderId) throw new Error(error?.message ?? "Falha ao criar pedido");
    return { orderId: orderId as string };

    /* Fluxo legado mantido apenas como referência durante a migração transacional.
    if (data.kind === "event") {
      if (!data.eventId || !data.ticketBatchId) throw new Error("Lote inválido");
      const { data: batch, error: bErr } = await supabase
        .from("ticket_batches")
        .select("id, price_cents, quantity_total, quantity_sold, active, max_per_order, starts_at, ends_at, ticket_type_id, ticket_types!inner(event_id, name, sector, events!inner(id, title, seller_id, published))")
        .eq("id", data.ticketBatchId)
        .maybeSingle();
      if (bErr || !batch) throw new Error("Lote não encontrado");
      const tt: any = batch.ticket_types;
      const ev = tt.events;
      if (!ev || ev.id !== data.eventId || !ev.published) throw new Error("Evento indisponível");
      if (!batch.active) throw new Error("Lote inativo");
      const now = new Date();
      if (batch.starts_at && new Date(batch.starts_at) > now) throw new Error("Lote ainda não está à venda");
      if (batch.ends_at && new Date(batch.ends_at) < now) throw new Error("Lote encerrado");
      const maxPerOrder = Math.min(batch.max_per_order ?? MAX_QTY_HARD_CAP, MAX_QTY_HARD_CAP);
      if (data.quantity > maxPerOrder) throw new Error(`Máximo ${maxPerOrder} por pedido`);

      const { data: activeResv } = await supabase
        .from("stock_reservations")
        .select("quantity, expires_at, released")
        .eq("ticket_batch_id", batch.id)
        .eq("released", false);
      const reservedNow = (activeResv ?? [])
        .filter((r) => new Date(r.expires_at) > now)
        .reduce((s, r) => s + r.quantity, 0);
      const remaining = batch.quantity_total - batch.quantity_sold - reservedNow;
      if (data.quantity > remaining) throw new Error("Estoque insuficiente para esse lote");

      const subtotal = batch.price_cents * data.quantity;
      const { platformFee, paymentFee, total } = computeFees(subtotal, 0, "pix");
      const expiresAt = new Date(now.getTime() + RESERVATION_MINUTES * 60_000).toISOString();

      const { data: order, error: oErr } = await supabase
        .from("orders")
        .insert({
          buyer_id: userId,
          seller_id: ev.seller_id ?? null,
          status: "pending",
          subtotal_cents: subtotal,
          discount_cents: 0,
          fee_cents: platformFee,
          platform_fee_cents: platformFee,
          payment_fee_cents: paymentFee,
          total_cents: total,
          expires_at: expiresAt,
        })
        .select("id")
        .single();
      if (oErr || !order) throw new Error(oErr?.message ?? "Falha ao criar pedido");

      const unitTotal = batch.price_cents * data.quantity;
      const { error: iErr } = await supabase.from("order_items").insert({
        order_id: order.id,
        event_id: ev.id,
        ticket_batch_id: batch.id,
        title: `${ev.title} · ${tt.name}`,
        quantity: data.quantity,
        unit_price_cents: batch.price_cents,
        total_cents: unitTotal,
      });
      if (iErr) throw new Error(iErr.message);

      const { error: rErr } = await supabase.from("stock_reservations").insert({
        order_id: order.id,
        ticket_batch_id: batch.id,
        quantity: data.quantity,
        expires_at: expiresAt,
      });
      if (rErr) throw new Error(rErr.message);

      return { orderId: order.id };
    }

    // course
    if (!data.courseId) throw new Error("Curso inválido");
    if (data.quantity !== 1) throw new Error("Cursos são vendidos por unidade");
    const { data: course, error: cErr } = await supabase
      .from("courses")
      .select("id, title, price_cents, seller_id, published")
      .eq("id", data.courseId)
      .maybeSingle();
    if (cErr || !course || !course.published) throw new Error("Curso indisponível");

    const { data: existing } = await supabase
      .from("enrollments")
      .select("id")
      .eq("user_id", userId)
      .eq("course_id", course.id)
      .maybeSingle();
    if (existing) throw new Error("Você já é aluno desse curso");

    const subtotal = course.price_cents;
    const { platformFee, paymentFee, total } = computeFees(subtotal, 0, "pix");
    const expiresAt = new Date(Date.now() + RESERVATION_MINUTES * 60_000).toISOString();

    const { data: order, error: oErr } = await supabase
      .from("orders")
      .insert({
        buyer_id: userId,
        seller_id: course.seller_id ?? null,
        status: "pending",
        subtotal_cents: subtotal,
        discount_cents: 0,
        fee_cents: platformFee,
        platform_fee_cents: platformFee,
        payment_fee_cents: paymentFee,
        total_cents: total,
        expires_at: expiresAt,
      })
      .select("id")
      .single();
    if (oErr || !order) throw new Error(oErr?.message ?? "Falha ao criar pedido");

    const { error: iErr } = await supabase.from("order_items").insert({
      order_id: order.id,
      course_id: course.id,
      title: course.title,
      quantity: 1,
      unit_price_cents: course.price_cents,
      total_cents: course.price_cents,
    });
    if (iErr) throw new Error(iErr.message);

    return { orderId: order.id };
    */
  });

export const getDraftOrder = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ orderId: z.string().min(1) }).parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: order, error } = await supabase
      .from("orders")
      .select(
        "id, status, subtotal_cents, discount_cents, platform_fee_cents, payment_fee_cents, total_cents, payment_method, expires_at, paid_at, buyer_id, order_items(id, title, quantity, unit_price_cents, total_cents, event_id, course_id, ticket_batch_id)",
      )
      .eq("id", data.orderId)
      .maybeSingle();
    if (error || !order) throw new Error("Pedido não encontrado");
    if (order.buyer_id !== userId) throw new Error("Pedido não pertence a você");
    const { data: payment } = await supabase
      .from("payments")
      .select(
        "id, status, amount_cents, provider, provider_payment_id, raw_status, pix_qr_code, pix_qr_code_base64, expires_at, updated_at",
      )
      .eq("order_id", order.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return { order, payment };
  });

export const confirmDraftOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        orderId: z.string().min(1),
        paymentMethod: z.enum(["pix", "card"]),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order, error } = await supabase
      .from("orders")
      .select("id, buyer_id, status, subtotal_cents, discount_cents, expires_at")
      .eq("id", data.orderId)
      .maybeSingle();
    if (error || !order) throw new Error("Pedido não encontrado");
    if (order.buyer_id !== userId) throw new Error("Pedido não pertence a você");
    if (order.status !== "pending") throw new Error("Pedido não pode mais ser alterado");
    if (order.expires_at && new Date(order.expires_at) < new Date())
      throw new Error("Pedido expirado — inicie uma nova compra");

    const { platformFee, paymentFee, total } = computeFees(
      order.subtotal_cents,
      order.discount_cents,
      data.paymentMethod,
    );

    const { error: uErr } = await supabaseAdmin
      .from("orders")
      .update({
        payment_method: data.paymentMethod === "card" ? "credit_card" : "pix",
        platform_fee_cents: platformFee,
        payment_fee_cents: paymentFee,
        fee_cents: platformFee,
        total_cents: total,
      })
      .eq("id", order.id);
    if (uErr) throw new Error(uErr.message);

    return { ok: true };
  });
