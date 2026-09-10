import {
  calculateLandedCost,
  type LandedCostBreakdown,
  type LandedCostInput,
} from "../landed-cost/calculate";
import { lookupReunionTariffs } from "./lookup";
import type { ResolvedTariffLookup, TariffDataset, TariffLookupResult } from "./model";

export type AutomaticLandedCostInput = Readonly<{
  nomenclatureCode: string;
  referenceDate: string;
  dataset: TariffDataset;
  landedCost: Omit<LandedCostInput, "octroiDeMerRate" | "octroiDeMerRegionalRate">;
}>;

export type AutomaticLandedCostResult =
  | Readonly<{
      status: "calculated";
      tariffLookup: ResolvedTariffLookup;
      breakdown: LandedCostBreakdown;
    }>
  | Readonly<{
      status: "tariff-unresolved";
      tariffLookup: Exclude<TariffLookupResult, ResolvedTariffLookup>;
    }>;

export function calculateLandedCostWithReunionTariffs(
  input: AutomaticLandedCostInput,
): AutomaticLandedCostResult {
  const tariffLookup = lookupReunionTariffs({
    nomenclatureCode: input.nomenclatureCode,
    referenceDate: input.referenceDate,
    dataset: input.dataset,
  });

  if (tariffLookup.status !== "resolved") {
    return { status: "tariff-unresolved", tariffLookup };
  }

  return {
    status: "calculated",
    tariffLookup,
    breakdown: calculateLandedCost({
      ...input.landedCost,
      octroiDeMerRate: tariffLookup.octroiDeMerRate,
      octroiDeMerRegionalRate: tariffLookup.octroiDeMerRegionalRate,
    }),
  };
}
