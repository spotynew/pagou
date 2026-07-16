import { createFileRoute } from "@tanstack/react-router";

/**
 * Endpoint público para o webhook do Mercado Pago.
 * Ainda não processa notificações reais: valida cabeçalhos básicos, registra
 * a chamada no console e responde 200 para não deixar o provedor em retry loop
 * durante a fase de demonstração.
 *
 * Quando as credenciais reais estiverem configuradas, este handler deverá:
 *  1. Ler MERCADO_PAGO_WEBHOOK_SECRET (process.env, server-only)
 *  2. Validar a assinatura x-signature em tempo constante
 *  3. Buscar o pagamento em https://api.mercadopago.com/v1/payments/{id}
 *  4. Localizar o pedido por external_reference
 *  5. Comparar amount_cents e atualizar o status de forma idempotente
 *  6. Registrar audit_log
 */
export const Route = createFileRoute("/api/public/webhooks/mercadopago")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const signature = request.headers.get("x-signature") ?? "";
        const requestId = request.headers.get("x-request-id") ?? "";
        const body = await request.text();
        console.log("[mercadopago-webhook] received", { signature: signature.slice(0, 12), requestId, size: body.length });
        // Sempre 200 para não reprocessar em loop enquanto integração não está ativa.
        return new Response(JSON.stringify({ received: true, demo: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      },
      GET: async () =>
        new Response(
          JSON.stringify({ status: "ok", message: "Mercado Pago webhook endpoint (demo)" }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
    },
  },
});