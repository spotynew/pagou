import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/_diag/mp")({
  server: {
    handlers: {
      POST: async () => {
        try {
          const { createPixPayment } = await import("@/lib/mercadopago.server");
          const orderId = crypto.randomUUID();
          const payment = await createPixPayment({
            orderId,
            amountCents: 100,
            description: "Diagnostico PIX",
            payerEmail: "diag@example.com",
            payerName: "Diag Test",
            payerCpf: null,
            expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
          });
          return new Response(
            JSON.stringify({ id: String(payment.id), status: payment.status }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        } catch (error) {
          return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : "unknown" }),
            { status: 500, headers: { "content-type": "application/json" } },
          );
        }
      },
    },
  },
});