const API_BASE = "https://api.mercadopago.com";

export type MercadoPagoPayment = {
  id: number | string;
  status: string;
  status_detail?: string | null;
  external_reference?: string | null;
  transaction_amount: number;
  date_approved?: string | null;
  date_of_expiration?: string | null;
  payment_method_id?: string | null;
  transaction_data?: {
    qr_code?: string | null;
    qr_code_base64?: string | null;
    ticket_url?: string | null;
  } | null;
};

function accessToken() {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN?.trim();
  if (!token) throw new Error("MERCADO_PAGO_ACCESS_TOKEN não configurado");
  return token;
}

async function mercadoPagoRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");
  headers.set("Authorization", `Bearer ${accessToken()}`);
  if (init?.body) headers.set("Content-Type", "application/json");

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  });

  const payload = (await response.json().catch(() => null)) as
    (T & { message?: string; error?: string }) | null;
  if (!response.ok || !payload) {
    const detail = payload?.message ?? payload?.error ?? `HTTP ${response.status}`;
    throw new Error(`Mercado Pago: ${detail}`);
  }
  return payload;
}

export async function createPixPayment(input: {
  orderId: string;
  amountCents: number;
  description: string;
  payerEmail: string;
  payerName?: string | null;
  payerCpf?: string | null;
  expiresAt: string;
}) {
  const notificationUrl = process.env.MERCADO_PAGO_NOTIFICATION_URL;
  // Sandbox detection is server-side only, based on the configured token prefix.
  // Test tokens start with "TEST-"; production tokens with "APP_USR-".
  const isSandbox = accessToken().startsWith("TEST-");

  const realNameParts = input.payerName?.trim().split(/\s+/).filter(Boolean) ?? [];
  const payer: Record<string, unknown> = isSandbox
    ? {
        // Fixed sandbox payer required by Mercado Pago to approve test PIX.
        email: "test_user_br@testuser.com",
        first_name: "APRO",
        last_name: "PAGOU",
      }
    : {
        email: input.payerEmail,
        first_name: realNameParts[0] || "Cliente",
        last_name: realNameParts.slice(1).join(" ") || "PAGOU",
      };
  const cpf = input.payerCpf?.replace(/\D/g, "");
  if (cpf?.length === 11) payer.identification = { type: "CPF", number: cpf };

  return mercadoPagoRequest<MercadoPagoPayment>("/v1/payments", {
    method: "POST",
    headers: { "X-Idempotency-Key": `pagou-${input.orderId}-pix-v1` },
    body: JSON.stringify({
      transaction_amount: input.amountCents / 100,
      description: input.description.slice(0, 250),
      payment_method_id: "pix",
      external_reference: input.orderId,
      date_of_expiration: input.expiresAt,
      ...(notificationUrl ? { notification_url: notificationUrl } : {}),
      payer,
    }),
  });
}

export function getMercadoPagoPayment(paymentId: string) {
  if (!/^\d+$/.test(paymentId)) throw new Error("ID de pagamento inválido");
  return mercadoPagoRequest<MercadoPagoPayment>(`/v1/payments/${paymentId}`);
}

function hexToBytes(value: string) {
  if (!/^[a-f0-9]{64}$/i.test(value)) return null;
  return Uint8Array.from(value.match(/.{2}/g) ?? [], (byte) => Number.parseInt(byte, 16));
}

export async function validateMercadoPagoSignature(input: {
  signature: string;
  requestId: string;
  dataId: string;
}) {
  const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
  if (!secret) throw new Error("MERCADO_PAGO_WEBHOOK_SECRET não configurado");

  const parts = Object.fromEntries(
    input.signature.split(",").map((part) => {
      const [key, ...rest] = part.trim().split("=");
      return [key, rest.join("=")];
    }),
  );
  if (!parts.ts || !parts.v1 || !input.requestId || !input.dataId) return false;

  const manifest = `id:${input.dataId.toLowerCase()};request-id:${input.requestId};ts:${parts.ts};`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const expected = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(manifest)),
  );
  const received = hexToBytes(parts.v1);
  if (!received || received.length !== expected.length) return false;

  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) {
    difference |= expected[index] ^ received[index];
  }
  return difference === 0;
}

export function mapMercadoPagoStatus(status: string) {
  if (status === "approved") return "approved" as const;
  if (status === "refunded" || status === "charged_back") return "refunded" as const;
  if (["rejected", "cancelled"].includes(status)) return "rejected" as const;
  return "pending" as const;
}
