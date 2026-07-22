const API_BASE = "https://api.mercadopago.com";

export type MercadoPagoOrderPayment = {
  id: string;
  amount: string;
  status: string;
  status_detail?: string | null;
  payment_method?: {
    id?: string | null;
    type?: string | null;
    ticket_url?: string | null;
    qr_code?: string | null;
    qr_code_base64?: string | null;
  } | null;
};

export type MercadoPagoOrder = {
  id: string;
  status: string;
  status_detail?: string | null;
  external_reference?: string | null;
  total_amount: string;
  created_date?: string | null;
  last_updated_date?: string | null;
  transactions?: {
    payments?: MercadoPagoOrderPayment[] | null;
  } | null;
};

function accessToken() {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN?.trim();
  if (!token) throw new Error("MERCADO_PAGO_ACCESS_TOKEN não configurado");
  if (!token.startsWith("APP_USR-")) {
    throw new Error("Use o Access Token APP_USR da aplicação configurada com API de Orders");
  }
  return token;
}

function isTestMode() {
  return process.env.MERCADO_PAGO_TEST_MODE === "true";
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
    | (T & {
        message?: string;
        error?: string;
        details?: Array<{ message?: string; code?: string }>;
        errors?: Array<{ message?: string; code?: string }>;
      })
    | null;
  if (!response.ok || !payload) {
    const details = [...(payload?.details ?? []), ...(payload?.errors ?? [])]
      .map((item) => item.message)
      .filter(Boolean)
      .join("; ");
    const detail = details || payload?.message || payload?.error || `HTTP ${response.status}`;
    throw new Error(`Mercado Pago: ${detail}`);
  }
  return payload;
}

export function getOrderPayment(order: MercadoPagoOrder) {
  const payments = order.transactions?.payments ?? [];
  const payment =
    payments.find(
      (item) =>
        item.payment_method?.id === "pix" || item.payment_method?.type === "bank_transfer",
    ) ?? payments[0];
  if (!payment) throw new Error("Mercado Pago não retornou a transação PIX");
  return payment;
}

export async function createPixOrder(input: {
  orderId: string;
  amountCents: number;
  description: string;
  payerEmail: string;
  payerName?: string | null;
  payerCpf?: string | null;
}) {
  const amount = (input.amountCents / 100).toFixed(2);
  const nameParts = input.payerName?.trim().split(/\s+/).filter(Boolean) ?? [];
  const payer: Record<string, unknown> = isTestMode()
    ? {
        // Valores exigidos pelo cenário oficial de teste PIX da API de Orders.
        email: "test_user_br@testuser.com",
        first_name: "APRO",
      }
    : {
        email: input.payerEmail,
        first_name: nameParts[0] || "Cliente",
        last_name: nameParts.slice(1).join(" ") || "PAGOU",
      };

  const cpf = input.payerCpf?.replace(/\D/g, "");
  if (!isTestMode() && cpf?.length === 11) {
    payer.identification = { type: "CPF", number: cpf };
  }

  return mercadoPagoRequest<MercadoPagoOrder>("/v1/orders", {
    method: "POST",
    headers: { "X-Idempotency-Key": input.orderId },
    body: JSON.stringify({
      type: "online",
      processing_mode: "automatic",
      external_reference: input.orderId,
      total_amount: amount,
      description: input.description.slice(0, 250),
      payer,
      transactions: {
        payments: [
          {
            amount,
            payment_method: { id: "pix", type: "bank_transfer" },
          },
        ],
      },
    }),
  });
}

export function getMercadoPagoOrder(orderId: string) {
  if (!/^ORD[A-Z0-9]+$/i.test(orderId)) throw new Error("ID de order inválido");
  return mercadoPagoRequest<MercadoPagoOrder>(`/v1/orders/${orderId}`);
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
  const normalized = status.trim().toLowerCase();
  if (["processed", "approved", "accredited"].includes(normalized)) {
    return "approved" as const;
  }
  if (["refunded", "charged_back", "charged-back"].includes(normalized)) {
    return "refunded" as const;
  }
  if (["failed", "canceled", "cancelled", "expired", "rejected"].includes(normalized)) {
    return "rejected" as const;
  }
  return "pending" as const;
}
