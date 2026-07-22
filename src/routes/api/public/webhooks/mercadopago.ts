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

export const Route = createFileRoute("/api/public/webhooks/mercadopago")