import { describe, expect, it } from "vitest";
import { safeAuthRedirect } from "./auth-redirect";

describe("retorno após autenticação", () => {
  it("preserva evento, lote e quantidade em um caminho interno", () => {
    const path = "/eventos/show?batch=123&qty=2&buyNow=1";
    expect(safeAuthRedirect(path)).toBe(path);
  });

  it("bloqueia URLs externas e protocolos relativos", () => {
    expect(safeAuthRedirect("https://example.com")).toBeNull();
    expect(safeAuthRedirect("//example.com")).toBeNull();
  });

  it("impede retorno para login e redirecionamentos aninhados", () => {
    expect(safeAuthRedirect("/auth?redirect=/admin")).toBeNull();
    expect(safeAuthRedirect("/minhas-compras?redirect=/admin")).toBeNull();
  });
});
