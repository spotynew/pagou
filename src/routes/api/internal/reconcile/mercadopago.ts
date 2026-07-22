import { createFileRoute } from "@tanstack/react-router";

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

function safeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

function getProviderOrderId(payment: {
  provider_ref: string | null;
  provider_payment_id: string | null;
}) {
  return [payment.provider_ref, payment.provider_payment_id]
    .filter((value): value is string => Boolean(value))
    .find((value) => /^ORD[A-Z0-9]+$/i.test(value));
}

export const Route = createFileRoute("/api/internal/reconcile/mercadopago")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const configuredSecret = process.env.PAYMENT_RECONCILIATION_SECRET?.trim();
        if (!configuredSecret) return json({ error: "reconciliation_not_configured" }, 503);

        const authorization = request.headers.get("authorization") ?? "";
        const providedSecret = authorization.replace(/^Bearer\s+/i, "").trim();
        if (!providedSecret || !safeEqual(providedSecret, configuredSecret)) {
          return json({ error: "unauthorized" }, 401);
        }

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const cutoff = new Date(Date.now() - 2 * 60_000).toISOString();
          const { data: payments, error } = await supabaseAdmin
            .from("payments")
            .select("id, provider_ref, provider_payment_id")
            .eq("provider", "mercadopago")
            .eq("status", "pending")
            .lt("created_at", cutoff)
            .order("created_at", { ascending: true })
            .limit(100);
          if (error) throw new Error(error.message);

          const { syncMercadoPagoOrder } = await import("@/lib/mercadopago-sync.server");
          let synchronized = 0;
          let ignored = 0;
          const failures: Array<{ paymentId: string; error: string }> = [];

          for (const payment of payments ?? []) {
            const providerOrderId = getProviderOrderId(payment);
            if (!providerOrderId) {
              ignored += 1;
              continue;
            }

            try {
              const result = await syncMercadoPagoOrder({
                supabaseAdmin,
                providerOrderId,
                source: "scheduled_reconciliation",
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

          return json({
            checked: payments?.length ?? 0,
            synchronized,
            ignored,
            failures,
          });
        } catch (error) {
          console.error("[mercadopago-reconciliation]", error);
          return json({ error: "reconciliation_failed" }, 500);
        }
      },
    },
  },
});
