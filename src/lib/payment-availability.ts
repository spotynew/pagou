export type PaymentEnvironment = Record<string, string | undefined>;

export type PaymentAvailability = {
  enabled: boolean;
  sandbox: boolean;
  reason: "ready" | "disabled" | "demo" | "missing_credentials" | "invalid_credentials";
};

export function getMercadoPagoAvailability(env: PaymentEnvironment): PaymentAvailability {
  if (env.MERCADO_PAGO_ENABLED !== "true") {
    return { enabled: false, sandbox: false, reason: "disabled" };
  }
  if (env.PAYMENTS_DEMO_MODE === "true") {
    return { enabled: false, sandbox: false, reason: "demo" };
  }

  const token = env.MERCADO_PAGO_ACCESS_TOKEN?.trim() ?? "";
  const webhookSecret = env.MERCADO_PAGO_WEBHOOK_SECRET?.trim() ?? "";
  if (!token || !webhookSecret) {
    return { enabled: false, sandbox: false, reason: "missing_credentials" };
  }

  const sandbox = token.startsWith("TEST-");
  const production = token.startsWith("APP_USR-");
  if (!sandbox && !production) {
    return { enabled: false, sandbox: false, reason: "invalid_credentials" };
  }
  if (/\s/.test(token) || token.includes("Bearer")) {
    return { enabled: false, sandbox: false, reason: "invalid_credentials" };
  }

  return { enabled: true, sandbox, reason: "ready" };
}

export function assertMercadoPagoAvailable(env: PaymentEnvironment) {
  const availability = getMercadoPagoAvailability(env);
  if (!availability.enabled) {
    throw new Error(
      "Pagamentos online estão temporariamente indisponíveis. Ingressos gratuitos continuam funcionando.",
    );
  }
  return availability;
}
