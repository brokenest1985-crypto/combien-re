import { fiscalRateFromBasisPoints, type FiscalRate, type FiscalRoundingStrategy } from "./fiscal-rate";
import { centsFromInteger, type Cents } from "./money";

export type FiscalProfile = Readonly<{
  id: string;
  referenceDate: string;
  vatRate: FiscalRate;
  commercialIntrinsicValueExemptionThresholdCents: Cents;
  roundingStrategy: FiscalRoundingStrategy;
}>;

/**
 * Configuration versionnée du scénario de démonstration V0.2a.
 * Les taux OM/OMR en sont volontairement absents : l'utilisateur doit les fournir.
 */
export const REUNION_HIGH_TECH_DEMO_PROFILE: FiscalProfile = Object.freeze({
  id: "reunion-high-tech-v0.2a-2026-09-09",
  referenceDate: "2026-09-09",
  vatRate: fiscalRateFromBasisPoints(850),
  commercialIntrinsicValueExemptionThresholdCents: centsFromInteger(2_200),
  roundingStrategy: "nearest-cent-half-up",
});
