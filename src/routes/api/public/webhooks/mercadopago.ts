import { createFileRoute } from "@tanstack/react-router";

type NotificationBody = {
  type?: string;
  topic?: string;
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
          ).trim();
          const topic = (
            url.searchParams.get("type") ??
            url.searchParams.get("topic") ??
            body.type ??
            body.topic ??
            ""
          ).toLowerCase();

          if (topic && !["order", "orders"].includes(topic)) {
            return json({ received: true, ignored: true, reason: "unsupported_topic" });
          }
          if (!dataId) return json({ error: "missing_order_id" }, 400);

          const signature = request.headers.get("x-signature") ?? "";
          const requestId = request.headers.get("x-request-id") ?? "";
          const { validateMercadoPagoSignature } = await import("@/lib/mercadopago.server");
          const validSignature = await validateMercadoPagoSignature({
            signature,
            requestId,
            dataId,
          });
          if (!validSignature) return json({ error: "invalid_signature" }, 401);

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          await supabaseAdmin.from("audit_logs").insert({
            action: "mercadopago_webhook_received",
            target_table: "mercadopago_webhooks",
            metadata: {
              topic: topic || "order",
              data_id: dataId,
              request_id: requestId,
              payload: {
                type: body.type ?? null,
                topic: body.topic ?? null,
                action: body.action ?? null,
                data: body.data?.id == null ? null : { id: String(body.data.id) },
              },
            },
          });

          const { syncMercadoPagoOrder } = await import("@/lib/mercadopago-sync.server");
          const result = await syncMercadoPagoOrder({
            supabaseAdmin,
            providerOrderId: dataId,
            source: "webhook",
            requestId,
            notificationAction: body.action ?? null,
          });

          return json({ received: true, ...result });
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
