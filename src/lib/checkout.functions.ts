import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { computeOrderFees, PLATFORM_FEE_BPS } from "@/lib/pricing";
import { z } from "zod";

const RESERVATION_MINUTES = 30;
const MAX_QTY_HARD_CAP = 10;
const BUYER_RECONCILIATION_INTERVAL_MS = 8_000;

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
  });

export const getDraftOrder = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ orderId: z.string().min(1) }).parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const loadSnapshot = async () => {
      const { data: order, error } = await supabase
        .from("orders")
        .select(
          "id, status, subtotal_cents, discount_cents, platform_fee_cents, payment_fee_cents, total_cents, payment_method, expires_at, paid_at, buyer_id, order_items(id, title, quantity, unit_price_cents, total_cents, event_id, course_id, ticket_batch_id)",
        )
        .eq("id", data.orderId)
        .maybeSingle();
      if (error || !order) throw new Error("Pedido não encontrado");

      const { data: payment, error: paymentError } = await supabase
        .from("payments")
        .select(
          "id, status, amount_cents, provider, provider_payment_id, provider_ref, raw_status, pix_qr_code, pix_qr_code_base64, expires_at, updated_at",
        )
        .eq("order_id", order.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (paymentError) throw new Error("Não foi possível consultar o pagamento");
      return { order, payment };
    };

    let snapshot = await loadSnapshot();
    if (snapshot.order.buyer_id !== userId) throw new Error("Pedido não pertence a você");

    const shouldReconcile = Boolean(
      snapshot.order.status === "pending" &&
      snapshot.payment?.status === "pending" &&
      snapshot.payment.provider_ref?.startsWith("ORD") &&
      Date.now() - new Date(snapshot.payment.updated_at).getTime() >=
        BUYER_RECONCILIATION_INTERVAL_MS,
    );

    if (shouldReconcile && snapshot.payment?.provider_ref) {
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { syncMercadoPagoOrder } = await import("@/lib/mercadopago-sync.server");
        await syncMercadoPagoOrder({
          supabaseAdmin,
          providerOrderId: snapshot.payment.provider_ref,
          source: "buyer_reconciliation",
          actorId: userId,
        });
        snapshot = await loadSnapshot();
      } catch (error) {
        console.warn("[checkout-buyer-reconciliation]", error);
      }
    }

    return snapshot;
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

    const { platformFeeCents, paymentFeeCents, totalCents } = computeOrderFees(
      order.subtotal_cents,
      order.discount_cents,
      data.paymentMethod,
    );

    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update({
        payment_method: data.paymentMethod === "card" ? "credit_card" : "pix",
        platform_fee_cents: platformFeeCents,
        payment_fee_cents: paymentFeeCents,
        fee_cents: platformFeeCents,
        total_cents: totalCents,
      })
      .eq("id", order.id);
    if (updateError) throw new Error(updateError.message);

    return { ok: true };
  });
