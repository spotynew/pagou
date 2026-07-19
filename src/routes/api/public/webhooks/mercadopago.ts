import { createFileRoute } from "@tanstack/react-router";

type NotificationBody = {
  type?: string;
  action?: string;
  data?: { id?: string | number };
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

export const Route = createFileRoute("/api/public/webhooks/mercadopago")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const contentLength = Number(request.headers.get("content-length") ?? 0);
          if (contentLength > 1_000_000) return json({ error: "payload_too_large" }, 413);

          const rawBody = await request.text();
          let body: NotificationBody;
          try {
            body = JSON.parse(rawBody) as NotificationBody;
          } catch {
            return json({ error: "invalid_json" }, 400);
          }

          const url = new URL(request.url);
          const dataId = String(
            url.searchParams.get("data.id") ?? url.searchParams.get("id") ?? body.data?.id ?? "",
          );
          const topic = url.searchParams.get("type") ?? body.type ?? "";
          if (topic && topic !== "order") return json({ received: true, ignored: true });
          if (!dataId) return json({ error: "missing_order_id" }, 400);

          const signature = request.headers.get("x-signature") ?? "";
          const requestId = request.headers.get("x-request-id") ?? "";
          const {
            getMercadoPagoOrder,
            getOrderPayment,
            mapMercadoPagoStatus,
            validateMercadoPagoSignature,
          } = await import("@/lib/mercadopago.server");
          const validSignature = await validateMercadoPagoSignature({
            signature,
            requestId,
            dataId,
          });
          if (!validSignature) return json({ error: "invalid_signature" }, 401);

          const providerOrder = await getMercadoPagoOrder(dataId);
          const providerPayment = getOrderPayment(providerOrder);
          const orderId = providerOrder.external_reference ?? "";
          if (
            !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
              orderId,
            )
          ) {
            return json({ received: true, ignored: true });
          }

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: order } = await supabaseAdmin
            .from("orders")
            .select("id, total_cents, status")
            .eq("id", orderId)
            .maybeSingle();
          if (!order) return json({ received: true, ignored: true });

          const amountCents = Math.round(Number(providerOrder.total_amount) * 100);
          if (amountCents !== order.total_cents) {
            await supabaseAdmin.from("audit_logs").insert({
              action: "payment_amount_mismatch",
              target_table: "orders",
              target_id: order.id,
              metadata: {
                provider_order_id: providerOrder.id,
                provider_payment_id: providerPayment.id,
                expected_cents: order.total_cents,
                received_cents: amountCents,
              },
            });
            return json({ error: "amount_mismatch" }, 409);
          }

          const status = mapMercadoPagoStatus(providerOrder.status);
          const paymentValues = {
            status,
            amount_cents: amountCents,
            method: "pix" as const,
            provider: "mercadopago",
            provider_ref: providerOrder.id,
            provider_payment_id: providerPayment.id,
            paid_at:
              providerOrder.status === "processed"
                ? (providerOrder.last_updated_date ?? new Date().toISOString())
                : null,
            pix_qr_code: providerPayment.payment_method?.qr_code ?? null,
            pix_qr_code_base64: providerPayment.payment_method?.qr_code_base64 ?? null,
            raw_status: [providerOrder.status, providerOrder.status_detail]
              .filter(Boolean)
              .join(":"),
          };

          const { data: existing } = await supabaseAdmin
            .from("payments")
            .select("id")
            .eq("provider_ref", providerOrder.id)
            .maybeSingle();

          const paymentResult = existing
            ? await supabaseAdmin.from("payments").update(paymentValues).eq("id", existing.id)
            : await supabaseAdmin.from("payments").insert({
                ...paymentValues,
                order_id: order.id,
              });
          if (paymentResult.error) throw new Error(paymentResult.error.message);

          await supabaseAdmin.from("audit_logs").insert({
            action: "mercadopago_webhook_processed",
            target_table: "orders",
            target_id: order.id,
            metadata: {
              provider_order_id: providerOrder.id,
              provider_payment_id: providerPayment.id,
              provider_status: providerOrder.status,
              action: body.action ?? null,
              request_id: requestId,
            },
          });

          return json({ received: true });
        } catch (error) {
          console.error("[mercadopago-webhook]", error);
          return json({ error: "processing_failed" }, 500);
        }
      },
      GET: async () =>
        json({
          status: "ok",
          provider: "mercadopago",
          configured: Boolean(
            process.env.MERCADO_PAGO_ACCESS_TOKEN && process.env.MERCADO_PAGO_WEBHOOK_SECRET,
          ),
        }),
    },
  },
});
