import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const createMercadoPagoPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ orderId: z.string().uuid(), paymentMethod: z.literal("pix") }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { createPixOrder, getOrderPayment, mapMercadoPagoStatus } =
      await import("@/lib/mercadopago.server");

    const { data: order, error } = await supabase
      .from("orders")
      .select(
        "id, buyer_id, status, total_cents, expires_at, buyer_email, buyer_name, buyer_cpf, order_items(title)",
      )
      .eq("id", data.orderId)
      .maybeSingle();
    if (error || !order) throw new Error("Pedido não encontrado");
    if (order.buyer_id !== userId) throw new Error("Pedido não pertence a você");
    if (order.status !== "pending") throw new Error("Pedido já processado");
    if (order.expires_at && new Date(order.expires_at) < new Date())
      throw new Error("Pedido expirado");

    const { data: existing } = await supabaseAdmin
      .from("payments")
      .select("id, provider_payment_id, status, expires_at, pix_qr_code")
      .eq("order_id", order.id)
      .in("status", ["pending", "approved"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existing && (existing.status === "approved" || existing.pix_qr_code)) {
      return {
        paymentId: existing.id,
        expiresAt: existing.expires_at,
        pixCode: existing.pix_qr_code,
      };
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name, email, cpf")
      .eq("id", userId)
      .maybeSingle();
    const payerEmail = order.buyer_email || profile?.email;
    if (!payerEmail) throw new Error("Cadastre um e-mail válido antes de pagar");

    const expiresAt = order.expires_at ?? new Date(Date.now() + 30 * 60_000).toISOString();
    const description = order.order_items.map((item) => item.title).join(" + ") || "Compra PAGOU";
    const mpOrder = await createPixOrder({
      orderId: order.id,
      amountCents: order.total_cents,
      description,
      payerEmail,
      payerName: order.buyer_name || profile?.full_name,
      payerCpf: order.buyer_cpf || profile?.cpf,
    });
    const mpPayment = getOrderPayment(mpOrder);

    if (Math.round(Number(mpOrder.total_amount) * 100) !== order.total_cents) {
      throw new Error("O provedor retornou um valor diferente do pedido");
    }

    const paymentValues = {
      order_id: order.id,
      provider: "mercadopago",
      method: "pix" as const,
      provider_payment_id: mpPayment.id,
      provider_ref: mpOrder.id,
      status: mapMercadoPagoStatus(mpOrder.status),
      amount_cents: order.total_cents,
      pix_qr_code: mpPayment.payment_method?.qr_code ?? null,
      pix_qr_code_base64: mpPayment.payment_method?.qr_code_base64 ?? null,
      expires_at: expiresAt,
      paid_at:
        mpOrder.status === "processed"
          ? (mpOrder.last_updated_date ?? new Date().toISOString())
          : null,
      raw_status: [mpOrder.status, mpOrder.status_detail].filter(Boolean).join(":"),
    };
    // O webhook pode chegar imediatamente após a resposta do Mercado Pago.
    // Consulte novamente para atualizar o registro criado por ele, evitando duplicidade.
    const { data: providerExisting } = await supabaseAdmin
      .from("payments")
      .select("id")
      .or(`provider_ref.eq.${mpOrder.id},provider_payment_id.eq.${mpPayment.id}`)
      .limit(1)
      .maybeSingle();
    const paymentTarget = providerExisting ?? existing;
    const paymentQuery = paymentTarget
      ? supabaseAdmin.from("payments").update(paymentValues).eq("id", paymentTarget.id)
      : supabaseAdmin.from("payments").insert(paymentValues);
    const { data: payment, error: paymentError } = await paymentQuery
      .select("id, expires_at, pix_qr_code")
      .single();
    if (paymentError || !payment) {
      throw new Error(paymentError?.message ?? "Falha ao registrar pagamento");
    }

    return {
      paymentId: payment.id,
      expiresAt: payment.expires_at,
      pixCode: payment.pix_qr_code,
    };
  });

export const simulateApproveDemo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ orderId: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    if (process.env.PAYMENTS_DEMO_MODE !== "true") {
      throw new Error("Simulação de pagamento desativada");
    }

    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabase
      .from("orders")
      .select("id, buyer_id, status")
      .eq("id", data.orderId)
      .maybeSingle();
    if (!order || order.buyer_id !== userId) throw new Error("Pedido não encontrado");
    if (order.status === "paid") return { ok: true };

    const { data: payment } = await supabaseAdmin
      .from("payments")
      .select("id, provider_payment_id")
      .eq("order_id", order.id)
      .like("provider_payment_id", "demo-%")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!payment) throw new Error("Pagamento demonstrativo não encontrado");

    const { error } = await supabaseAdmin
      .from("payments")
      .update({
        status: "approved",
        raw_status: "approved_demo",
        paid_at: new Date().toISOString(),
      })
      .eq("id", payment.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
