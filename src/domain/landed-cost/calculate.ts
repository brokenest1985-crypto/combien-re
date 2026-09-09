import { applyFiscalRate, fiscalRateFromBasisPoints, type FiscalRate } from "./fiscal-rate";
import type { FiscalProfile } from "./fiscal-profile";
import { addCents, centsFromInteger, ZERO_CENTS, type Cents } from "./money";

export type LandedCostInput = Readonly<{
  goodsValueCents: Cents;
  shippingToEntryCents: Cents;
  insuranceToEntryCents: Cents;
  postEntryAccessoryCostsCents: Cents;
  carrierFeeCents: Cents;
  octroiDeMerRate: FiscalRate;
  octroiDeMerRegionalRate: FiscalRate;
  fiscalProfile: FiscalProfile;
}>;

export type LandedCostBreakdown = Readonly<{
  goodsValueCents: Cents;
  shippingToEntryCents: Cents;
  insuranceToEntryCents: Cents;
  customsValueCents: Cents;
  postEntryAccessoryCostsCents: Cents;
  vatBaseCents: Cents;
  /** Garde-fou documentaire et testable : OM et OMR ne composent jamais la base TVA. */
  vatBaseExcludesOctroiDeMer: true;
  vatCents: Cents;
  octroiDeMerCents: Cents;
  octroiDeMerRegionalCents: Cents;
  carrierFeeCents: Cents;
  totalLandedCostCents: Cents;
  exemptionApplied: boolean;
  ratesUsed: Readonly<{
    vat: FiscalRate;
    octroiDeMer: FiscalRate;
    octroiDeMerRegional: FiscalRate;
  }>;
  fiscalProfileId: string;
  fiscalProfileReferenceDate: string;
  roundingStrategy: FiscalProfile["roundingStrategy"];
}>;

function validateProfile(profile: FiscalProfile): void {
  if (!profile.id.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(profile.referenceDate)) {
    throw new TypeError("Le profil fiscal doit avoir un identifiant et une date ISO valides.");
  }

  fiscalRateFromBasisPoints(profile.vatRate.basisPoints);
  centsFromInteger(profile.commercialIntrinsicValueExemptionThresholdCents);
}

export function calculateLandedCost(input: LandedCostInput): LandedCostBreakdown {
  validateProfile(input.fiscalProfile);

  const goodsValueCents = centsFromInteger(input.goodsValueCents);
  const shippingToEntryCents = centsFromInteger(input.shippingToEntryCents);
  const insuranceToEntryCents = centsFromInteger(input.insuranceToEntryCents);
  const postEntryAccessoryCostsCents = centsFromInteger(input.postEntryAccessoryCostsCents);
  const carrierFeeCents = centsFromInteger(input.carrierFeeCents);
  const octroiDeMerRate = fiscalRateFromBasisPoints(input.octroiDeMerRate.basisPoints);
  const octroiDeMerRegionalRate = fiscalRateFromBasisPoints(
    input.octroiDeMerRegionalRate.basisPoints,
  );

  const customsValueCents = addCents(
    "La valeur en douane",
    goodsValueCents,
    shippingToEntryCents,
    insuranceToEntryCents,
  );

  // Article 45 de la loi n° 2004-639 : OM et OMR sont explicitement exclus de cette base.
  const vatBaseCents = addCents(
    "La base TVA",
    customsValueCents,
    postEntryAccessoryCostsCents,
  );

  const exemptionApplied =
    goodsValueCents <=
    centsFromInteger(input.fiscalProfile.commercialIntrinsicValueExemptionThresholdCents);

  const octroiDeMerCents = exemptionApplied
    ? ZERO_CENTS
    : applyFiscalRate(customsValueCents, octroiDeMerRate, input.fiscalProfile.roundingStrategy);
  const octroiDeMerRegionalCents = exemptionApplied
    ? ZERO_CENTS
    : applyFiscalRate(
        customsValueCents,
        octroiDeMerRegionalRate,
        input.fiscalProfile.roundingStrategy,
      );
  const vatCents = exemptionApplied
    ? ZERO_CENTS
    : applyFiscalRate(vatBaseCents, input.fiscalProfile.vatRate, input.fiscalProfile.roundingStrategy);

  const totalLandedCostCents = addCents(
    "Le coût total rendu",
    goodsValueCents,
    shippingToEntryCents,
    insuranceToEntryCents,
    postEntryAccessoryCostsCents,
    octroiDeMerCents,
    octroiDeMerRegionalCents,
    vatCents,
    carrierFeeCents,
  );

  return Object.freeze({
    goodsValueCents,
    shippingToEntryCents,
    insuranceToEntryCents,
    customsValueCents,
    postEntryAccessoryCostsCents,
    vatBaseCents,
    vatBaseExcludesOctroiDeMer: true,
    vatCents,
    octroiDeMerCents,
    octroiDeMerRegionalCents,
    carrierFeeCents,
    totalLandedCostCents,
    exemptionApplied,
    ratesUsed: Object.freeze({
      vat: input.fiscalProfile.vatRate,
      octroiDeMer: octroiDeMerRate,
      octroiDeMerRegional: octroiDeMerRegionalRate,
    }),
    fiscalProfileId: input.fiscalProfile.id,
    fiscalProfileReferenceDate: input.fiscalProfile.referenceDate,
    roundingStrategy: input.fiscalProfile.roundingStrategy,
  });
}
