import { describe, expect, it } from "vitest";
import { getMercadoPagoAvailability } from "./payment-availability";

const credentials = {
  MERCADO_PAGO_ACCESS_TOKEN: "APP_USR-example",
  MERCADO_PAGO_WEBHOOK_SECRET: "webhook-example",
};

describe("disponibilidade do Mercado Pago", () => {
  it("mantém pagamentos bloqueados sem a liberação explícita MERCADO_PAGO_ENABLED=true", () => {
    expect(getMercadoPagoAvailability(credentials).enabled).toBe(false);
  });

  it("bloqueia o modo demonstrativo mesmo com credenciais e liberação explícita", () => {
    const result = getMercadoPagoAvailability({
      ...credentials,
      MERCADO_PAGO_ENABLED: "true",
      PAYMENTS_DEMO_MODE: "true",
    });
    expect(result).toMatchObject({ enabled: false, reason: "demo" });
  });

  it("identifica sandbox somente pela credencial TEST do servidor", () => {
    const result = getMercadoPagoAvailability({
      ...credentials,
      MERCADO_PAGO_ACCESS_TOKEN: "TEST-example",
      MERCADO_PAGO_ENABLED: "true",
    });
    expect(result).toMatchObject({ enabled: true, sandbox: true });
  });

  it("rejeita token com Bearer, espaços ou formato desconhecido", () => {
    for (const token of ["Bearer APP_USR-example", "APP_USR-example ", "PUBLIC-example"]) {
      expect(
        getMercadoPagoAvailability({
          ...credentials,
          MERCADO_PAGO_ACCESS_TOKEN: token,
          MERCADO_PAGO_ENABLED: "true",
        }).enabled,
      ).toBe(false);
    }
  });

  it("exige o segredo do webhook antes de liberar cobranças", () => {
    expect(
      getMercadoPagoAvailability({
        MERCADO_PAGO_ACCESS_TOKEN: "APP_USR-example",
        MERCADO_PAGO_ENABLED: "true",
      }).reason,
    ).toBe("missing_credentials");
  });
});
