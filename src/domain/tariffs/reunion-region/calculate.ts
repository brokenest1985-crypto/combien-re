import { calculateLandedCost, type LandedCostInput } from "../../landed-cost/calculate";
import { lookupRegionReunionTariff } from "./lookup";
import type { RegionTariffDataset } from "./model";

export function calculateWithRegionReunionTariff(input: Readonly<{
  nomenclatureCode: string; referenceDate: string; dataset: RegionTariffDataset | null;
  landedCost: Omit<LandedCostInput, "octroiDeMerRate" | "octroiDeMerRegionalRate">;
}>) {
  const tariffLookup = lookupRegionReunionTariff(input);
  if (tariffLookup.status !== "resolved") return { status: "tariff-unresolved" as const, tariffLookup };
  return { status: "calculated" as const, tariffLookup, breakdown: calculateLandedCost({ ...input.landedCost, octroiDeMerRate: tariffLookup.octroiDeMerRate, octroiDeMerRegionalRate: tariffLookup.octroiDeMerRegionalRate }) };
}
