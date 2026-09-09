import { centsFromInteger, type Cents } from "./money";

export type LandedCostInput = Readonly<{
  productPriceCents: Cents;
  shippingCostCents: Cents;
}>;

export type LandedCostResult = Readonly<{
  totalCents: Cents;
}>;

/** Prototype : prix + livraison uniquement. Aucune règle fiscale appliquée. */
export function calculateLandedCost(input: LandedCostInput): LandedCostResult {
  const product = centsFromInteger(input.productPriceCents);
  const shipping = centsFromInteger(input.shippingCostCents);
  const total = product + shipping;

  if (!Number.isSafeInteger(total)) {
    throw new RangeError("Le total est trop élevé. Réduisez les montants saisis.");
  }
  return { totalCents: centsFromInteger(total) };
}
