import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/**
 * Placeholder para integração com Mercado Pago.
 * Nesta etapa não chamamos a API real: geramos apenas um registro de pagamento
 * pendente com um "PIX simulado". Nenhuma credencial trafega pelo frontend.
 *
 * Quando a integração real for ativada, este handler deverá:
 *  1. Ler MERCADO_PAGO_ACCESS_TOKEN de process.env (server-only)
 *  2. Chamar POST /v1/payments com idempotency key
 *  3. Persistir provider_payment_id, pix_qr_code e pix_qr_code_base64
 *  4. Nunca retornar o access token ao browser
 */
export const createMercadoPagoPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        orderId: z.string().uuid(),
        paymentMethod: z.enum(["pix", "card"]),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: order, error } = await supabase
      .from("orders")
      .select("id, buyer_id, status, total_cents, expires_at")
      .eq("id", data.orderId)
      .maybeSingle();
    if (error || !order) throw new Error("Pedido não encontrado");
    if (order.buyer_id !== userId) throw new Error("Pedido não pertence a você");
    if (order.status !== "pending") throw new Error("Pedido já processado");
    if (order.expires_at && new Date(order.expires_at) < new Date())
      throw new Error("Pedido expirado");

    const expiresAt = new Date(Date.now() + 30 * 60_000).toISOString();
    const idem = `pagou-${order.id}-${data.paymentMethod}`;
    const pixCode =
      data.paymentMethod === "pix"
        ? `00020126360014BR.GOV.BCB.PIX0114DEMO-${order.id.slice(0, 8).toUpperCase()}52040000530398654${String(order.total_cents / 100).padStart(6, "0")}5802BR5905PAGOU6009SAO PAULO62070503***6304ABCD`
        : null;

    const { data: payment, error: pErr } = await supabase
      .from("payments")
      .insert({
        order_id: order.id,
        provider: "mercadopago",
        provider_payment_id: `demo-${idem}-${Date.now()}`,
        status: "pending",
        amount_cents: order.total_cents,
        pix_qr_code: pixCode,
        pix_qr_code_base64: null,
        expires_at: expiresAt,
        raw_status: "pending_demo",
      })
      .select("id")
      .single();
    if (pErr) throw new Error(pErr.message);

    return { paymentId: payment.id, expiresAt, pixCode };
  });

/**
 * Modo demonstração: aprova o pagamento localmente. Em produção, esta
 * transição só pode ser feita pelo webhook do Mercado Pago após consulta
 * autenticada à API do provedor.
 */
export const simulateApproveDemo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ orderId: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: order } = await supabase
      .from("orders")
      .select("id, buyer_id, status")
      .eq("id", data.orderId)
      .maybeSingle();
    if (!order || order.buyer_id !== userId) throw new Error("Pedido não encontrado");
    if (order.status === "paid") return { ok: true };

    const { data: payment } = await supabase
      .from("payments")
      .select("id")
      .eq("order_id", order.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!payment) throw new Error("Pagamento não iniciado");

    const { error } = await supabase
      .from("payments")
      .update({ status: "approved", raw_status: "approved_demo" })
      .eq("id", payment.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });