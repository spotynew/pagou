import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/_diag/mp")({
  server: {
    handlers: {
      GET: async () => {
        const token = process.env.MERCADO_PAGO_ACCESS_TOKEN ?? "";
        const trimmed = token.trim();
        const shape = {
          present: Boolean(trimmed),
          has_bearer_prefix: /^bearer\s/i.test(trimmed),
          has_quotes: /^["'].*["']$/.test(trimmed),
          has_whitespace: /\s/.test(trimmed),
          looks_like_public_key: trimmed.startsWith("APP_USR-") && trimmed.length < 80,
          length: trimmed.length,
        };
        let mpStatus: number | null = null;
        try {
          const res = await fetch("https://api.mercadopago.com/users/me", {
            headers: { authorization: `Bearer ${trimmed}` },
          });
          mpStatus = res.status;
        } catch {
          mpStatus = 0;
        }
        let pix: { status: number; ok: boolean; id?: string | number; err?: string } | null = null;
        try {
          const orderId = crypto.randomUUID();
          const res = await fetch("https://api.mercadopago.com/v1/payments", {
            method: "POST",
            headers: {
              authorization: `Bearer ${trimmed}`,
              "content-type": "application/json",
              "x-idempotency-key": `pagou-diag-${orderId}`,
            },
            body: JSON.stringify({
              transaction_amount: 1,
              description: "PAGOU diag PIX",
              payment_method_id: "pix",
              external_reference: orderId,
              payer: { email: "test_user_diag@testuser.com", first_name: "Diag", last_name: "PAGOU" },
            }),
          });
          const body = (await res.json().catch(() => null)) as { id?: string | number; message?: string } | null;
          pix = { status: res.status, ok: res.ok, id: body?.id, err: res.ok ? undefined : body?.message };
        } catch (e) {
          pix = { status: 0, ok: false, err: (e as Error).message };
        }
        return new Response(JSON.stringify({ shape, mp_status: mpStatus, pix }), {
          status: 200,
          headers: { "content-type": "application/json", "cache-control": "no-store" },
        });
      },
    },
  },
});