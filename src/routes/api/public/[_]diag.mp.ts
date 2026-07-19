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
        return new Response(JSON.stringify({ shape, mp_status: mpStatus }), {
          status: 200,
          headers: { "content-type": "application/json", "cache-control": "no-store" },
        });
      },
    },
  },
});