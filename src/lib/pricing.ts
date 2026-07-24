export const PLATFORM_FEE_BPS = 1000; // 10,00%
export const CARD_FEE_BPS = 399; // 3,99%

export function computeOrderFees(
  subtotalCents: number,
  discountCents: number,
  method: "pix" | "card",
) {
  const baseCents = Math.max(0, subtotalCents - discountCents);
  const platformFeeCents = Math.round((baseCents * PLATFORM_FEE_BPS) / 10_000);
  const paymentFeeCents =
    method === "card" ? Math.round((baseCents * CARD_FEE_BPS) / 10_000) : 0;

  return {
    baseCents,
    platformFeeCents,
    paymentFeeCents,
    totalCents: baseCents + platformFeeCents + paymentFeeCents,
  };
}
