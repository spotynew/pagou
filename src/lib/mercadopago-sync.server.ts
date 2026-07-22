import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  getMercadoPagoOrder,
  getOrderPayment,
  mapMercadoPagoStatus,
} from "@/lib/mercadopago.server";

type AdminClient = SupabaseClient<Database>;

type SyncInput = {
  supabaseAdmin: AdminClient;
  providerOrderId: string;
  source: "webhook" | "admin" | "scheduled_reconciliation" | "buyer_reconciliation";
  actorId?: string | null;
  requestId?: string | null;
  notificationAction?: string | null;
};

export type MercadoPagoSyncResult = {
  ignored: boolean;
  reason?: string;
  orderId?: string;
  paymentId?: string;
  providerOrderId?: string;
  providerPaymentId?: string;
  providerStatus?: string;
  paymentStatus?: Database["public"]["Enums"]["payment_status"];
  orderStatus?: Database["public"]["Enums"]["order_status"];
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

async function findExistingPayment(
  supabaseAdmin: AdminClient,
  providerOrderId: string,
  providerPaymentId: string,
) {
  const byOrder = await supabaseAdmin
    .from("payments")
    .select("id")
    .eq("provider_ref", providerOrderId)
    .limit(1)
    .maybeSingle();
  if (byOrder.error) throw new Error(byOrder.error.message);
  if (byOrder.data) return byOrder.data;

  const byPayment = await supabaseAdmin
    .from("payments")
    .select("id")
    .eq("provider_payment_id", providerPaymentId)
    .limit(1)
    .maybeSingle();
  if (byPayment.error) throw new Error(byPayment.error.message);
  return byPayment.data;
}

export async function syncMercadoPagoOrder(input: SyncInput): Promise<MercadoPagoSyncResult> {
  const providerOrder = await getMercadoPagoOrder(input.providerOrderId);
  const providerPayment = getOrderPayment(providerOrder);
  const orderId = providerOrder.external_reference?.trim() ?? "";

  if (!isUuid(orderId)) {
    return { ignored: true, reason: "invalid_external_reference" };
  }

  const { data: order, error: orderError } = await input.supabaseAdmin
    .from("orders")
    .select("id, total_cents, status, paid_at")
    .eq("id", orderId)
    .maybeSingle();
  if (orderError) throw new Error(orderError.message);
  if (!order) return { ignored: true, reason: "order_not_found" };

  const amountCents = Math.round(Number(providerOrder.total_amount) * 100);
  if (!Number.isFinite(amountCents) || amountCents !== order.total_cents) {
    await input.supabaseAdmin.from("audit_logs").insert({
      actor_id: input.actorId ?? null,
      action: "payment_amount_mismatch",
      target_table: "orders",
      target_id: order.id,
      metadata: {
        source: input.source,
        provider_order_id: providerOrder.id,
        provider_payment_id: providerPayment.id,
        expected_cents: order.total_cents,
        received_cents: Number.isFinite(amountCents) ? amountCents : null,
      },
    });
    throw new Error("O valor confirmado pelo Mercado Pago não corresponde ao pedido");
  }

  const paymentStatus = mapMercadoPagoStatus(providerOrder.status);
  const paidAt =
    paymentStatus === "approved"
      ? (providerOrder.last_updated_date ?? order.paid_at ?? new Date().toISOString())
      : null;
  const paymentValues = {
    status: paymentStatus,
    amount_cents: amountCents,
    method: "pix" as const,
    provider: "mercadopago",
    provider_ref: providerOrder.id,
    provider_payment_id: providerPayment.id,
    paid_at: paidAt,
    pix_qr_code: providerPayment.payment_method?.qr_code ?? null,
    pix_qr_code_base64: providerPayment.payment_method?.qr_code_base64 ?? null,
    raw_status: [providerOrder.status, providerOrder.status_detail, providerPayment.status]
      .filter(Boolean)
      .join(":"),
  };

  const existing = await findExistingPayment(
    input.supabaseAdmin,
    providerOrder.id,
    providerPayment.id,
  );
  const paymentResult = existing
    ? await input.supabaseAdmin
        .from("payments")
        .update(paymentValues)
        .eq("id", existing.id)
        .select("id")
        .single()
    : await input.supabaseAdmin
        .from("payments")
        .insert({ ...paymentValues, order_id: order.id })
        .select("id")
        .single();
  if (paymentResult.error || !paymentResult.data) {
    throw new Error(paymentResult.error?.message ?? "Falha ao sincronizar o pagamento");
  }

  let orderStatus = order.status;
  if (paymentStatus === "approved" && order.status !== "paid") {
    const { error } = await input.supabaseAdmin
      .from("orders")
      .update({
        status: "paid",
        paid_at: paidAt,
        payment_method: "pix",
        external_reference: providerOrder.id,
      })
      .eq("id", order.id);
    if (error) throw new Error(error.message);
    orderStatus = "paid";
  } else if (paymentStatus === "refunded" && order.status !== "refunded") {
    const { error } = await input.supabaseAdmin
      .from("orders")
      .update({ status: "refunded" })
      .eq("id", order.id);
    if (error) throw new Error(error.message);
    orderStatus = "refunded";
  }

  await input.supabaseAdmin.from("audit_logs").insert({
    actor_id: input.actorId ?? null,
    action: "mercadopago_payment_synchronized",
    target_table: "orders",
    target_id: order.id,
    metadata: {
      source: input.source,
      provider_order_id: providerOrder.id,
      provider_payment_id: providerPayment.id,
      provider_status: providerOrder.status,
      payment_status: paymentStatus,
      order_status: orderStatus,
      notification_action: input.notificationAction ?? null,
      request_id: input.requestId ?? null,
    },
  });

  return {
    ignored: false,
    orderId: order.id,
    paymentId: paymentResult.data.id,
    providerOrderId: providerOrder.id,
    providerPaymentId: providerPayment.id,
    providerStatus: providerOrder.status,
    paymentStatus,
    orderStatus,
  };
}
