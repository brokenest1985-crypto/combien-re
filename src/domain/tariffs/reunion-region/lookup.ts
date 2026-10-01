import { normalizeIsoDate, normalizeNomenclatureCode, TariffInputError } from "../normalization";
import type { RegionTariffDataset, RegionTariffLookupResult, RegionTariffRow } from "./model";

const indexes = new WeakMap<RegionTariffDataset, ReadonlyMap<string, readonly RegionTariffRow[]>>();

function rowsByCode(dataset: RegionTariffDataset): ReadonlyMap<string, readonly RegionTariffRow[]> {
  const cached = indexes.get(dataset);
  if (cached) return cached;

  const mutable = new Map<string, RegionTariffRow[]>();
  for (const row of dataset.rows) {
    const matches = mutable.get(row.nomenclatureCode);
    if (matches) matches.push(row);
    else mutable.set(row.nomenclatureCode, [row]);
  }
  const index = new Map([...mutable].map(([code, rows]) => [code, Object.freeze(rows)]));
  indexes.set(dataset, index);
  return index;
}

function unsupported(code: string, date: string, reason: Extract<RegionTariffLookupResult, { status: "unsupported" }>["reason"], message: string): RegionTariffLookupResult {
  return { status: "unsupported", nomenclatureCode: code, referenceDate: date, reason, message };
}

export function lookupRegionReunionTariff(input: Readonly<{ nomenclatureCode: string; referenceDate: string; dataset: RegionTariffDataset | null }>): RegionTariffLookupResult {
  let code: string;
  let date: string;
  try { code = normalizeNomenclatureCode(input.nomenclatureCode); }
  catch (error) { return unsupported(input.nomenclatureCode, input.referenceDate, "invalid-nomenclature", error instanceof TariffInputError ? error.message : "Nomenclature invalide."); }
  try { date = normalizeIsoDate(input.referenceDate); }
  catch (error) { return unsupported(code, input.referenceDate, "invalid-date", error instanceof TariffInputError ? error.message : "Date invalide."); }
  if (input.dataset === null) return unsupported(code, date, "dataset-unavailable", "Le snapshot Région Réunion est absent.");
  if (date < input.dataset.effectiveFrom || (input.dataset.effectiveTo !== null && date > input.dataset.effectiveTo)) {
    return unsupported(code, date, "snapshot-outside-period", "Aucun snapshot vérifié ne couvre cette date.");
  }
  if (date > input.dataset.verifiedThrough) return unsupported(code, date, "snapshot-not-verified-for-date", `Ce snapshot n’est vérifié que jusqu’au ${input.dataset.verifiedThrough}.`);
  const index = rowsByCode(input.dataset);
  const exact = (index.get(code) ?? []).filter((row) => row.externalOctroiDeMerRate !== null);
  if (exact.length > 1) return { status: "ambiguous", nomenclatureCode: code, referenceDate: date, reason: "multiple-rules", alternatives: exact };
  const candidate = exact[0];
  if (candidate) {
    if (candidate.qualifier !== null || candidate.observations !== null) return { status: "ambiguous", nomenclatureCode: code, referenceDate: date, reason: "qualified-rule", alternatives: exact };
    const ome = candidate.externalOctroiDeMerRate;
    const omer = candidate.externalRegionalOctroiDeMerRate;
    if (ome === null || omer === null) return { status: "not-found", nomenclatureCode: code, referenceDate: date, reason: "no-rule" };
    return { status: "resolved", nomenclatureCode: code, referenceDate: date, designation: candidate.designation, octroiDeMerRate: ome, octroiDeMerRegionalRate: omer, source: "REGION_REUNION", sourceReference: input.dataset.sourceReference, row: candidate };
  }
  const parents: RegionTariffRow[] = [];
  for (const length of [2, 4, 6, 8] as const) {
    if (length >= code.length) break;
    parents.push(...(index.get(code.slice(0, length)) ?? []).filter((row) => row.externalOctroiDeMerRate !== null));
  }
  if (parents.length > 0) return { status: "ambiguous", nomenclatureCode: code, referenceDate: date, reason: "parent-inheritance-not-proven", alternatives: parents };
  return { status: "not-found", nomenclatureCode: code, referenceDate: date, reason: "no-rule" };
}
