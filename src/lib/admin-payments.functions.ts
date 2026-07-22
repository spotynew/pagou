import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

type AuthContext = { supabase: SupabaseClient<Database>; userId: string };

async function requireAdmin(context: AuthContext) {
  const { data: isAdmin, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!isAdmin) throw new Error("Apenas administradores podem gerenciar pagamentos.");
}

function providerOrderIdFromPayment(payment: {
  provider_ref: string | null;
  provider_payment_id: string | null;
}) {
  const candidates = [payment.provider_ref, payment.provider_payment_id].filter(
    (value): value is string => Boolean(value),
  );
  return candidates.find((value) => /^ORD[A-Z0-9]+$/i.test(value)) ?? null;
}

export const listAdminPayments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: payments, error } = await supabaseAdmin
      .from("payments")
      .select(
        "id, order_id, provider, provider_ref, provider_payment_id, status, raw_status, amount_cents, paid_at, created_at, updated_at",
      )
      .eq("provider", "mercadopago")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);

    const orderIds = [...new Set((payments ?? []).map((payment) => payment.order_id))];
    const { data: orders, error: orderError } = orderIds.length
      ? await supabaseAdmin
          .from("orders")
          .select("id, status, buyer_name, buyer_email, total_cents, paid_at, created_at")
          .in("id", orderIds)
      : { data: [], error: null };
    if (orderError) throw new Error(orderError.message);

    return (payments ?? []).map((payment) => {
      const order = orders?.find((item) => item.id === payment.order_id);
      return {
        id: payment.id,
        orderId: payment.order_id,
        providerOrderId: providerOrderIdFromPayment(payment),
        providerPaymentId: payment.provider_payment_id,
        paymentStatus: payment.status,
        orderStatus: order?.status ?? "pending",
        rawStatus: payment.raw_status,
        amountCents: payment.amount_cents,
        buyerName: order?.buyer_name ?? "Cliente",
        buyerEmail: order?.buyer_email ?? "",
        paidAt: payment.paid_at ?? order?.paid_at ?? null,
        createdAt: payment.created_at,
        updatedAt: payment.updated_at,
        canReconcile: Boolean(providerOrderIdFromPayment(payment)),
      };
    });
  });

export const reconcileAdminPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ paymentId: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: payment, error } = await supabaseAdmin
      .from("payments")
      .select("id, provider, provider_ref, provider_payment_id")
      .eq("id", data.paymentId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!payment || payment.provider !== "mercadopago") {
      throw new Error("Pagamento do Mercado Pago não encontrado.");
    }

    const providerOrderId = providerOrderIdFromPayment(payment);
    if (!providerOrderId) {
      throw new Error("Este pagamento não possui o ID da order do Mercado Pago.");
    }

    const { syncMercadoPagoOrder } = await import("@/lib/mercadopago-sync.server");
    return syncMercadoPagoOrder({
      supabaseAdmin,
      providerOrderId,
      source: "admin",
      actorId: context.userId,
    });
  });

export const reconcilePendingMercadoPagoPayments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: pending, error } = await supabaseAdmin
      .from("payments")
      .select("id, provider_ref, provider_payment_id")
      .eq("provider", "mercadopago")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(50);
    if (error) throw new Error(error.message);

    const { syncMercadoPagoOrder } = await import("@/lib/mercadopago-sync.server");
    let synchronized = 0;
    let ignored = 0;
    const failures: Array<{ paymentId: string; error: string }> = [];

    for (const payment of pending ?? []) {
      const providerOrderId = providerOrderIdFromPayment(payment);
      if (!providerOrderId) {
        ignored += 1;
        continue;
      }
      try {
        const result = await syncMercadoPagoOrder({
          supabaseAdmin,
          providerOrderId,
          source: "admin",
          actorId: context.userId,
        });
        if (result.ignored) ignored += 1;
        else synchronized += 1;
      } catch (error) {
        failures.push({
          paymentId: payment.id,
          error: error instanceof Error ? error.message : "Falha desconhecida",
        });
      }
    }

    return {
      checked: pending?.length ?? 0,
      synchronized,
      ignored,
      failures,
    };
  });
