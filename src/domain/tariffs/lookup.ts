import { normalizeIsoDate, normalizeNomenclatureCode, TariffInputError } from "./normalization";
import type {
  AmbiguousTariffLookup,
  NotFoundTariffLookup,
  TariffLookupInput,
  TariffLookupResult,
  TariffMeasure,
  UnsupportedTariffLookup,
} from "./model";

function isActive(measure: TariffMeasure, referenceDate: string): boolean {
  return measure.validFrom <= referenceDate && (measure.validTo === null || referenceDate <= measure.validTo);
}

function unsupported(
  input: TariffLookupInput,
  reason: UnsupportedTariffLookup["reason"],
  message: string,
): UnsupportedTariffLookup {
  return {
    status: "unsupported",
    nomenclatureCode: input.nomenclatureCode,
    referenceDate: input.referenceDate,
    territory: "REUNION",
    reason,
    message,
  };
}

function ambiguous(
  nomenclatureCode: string,
  referenceDate: string,
  reason: AmbiguousTariffLookup["reason"],
  alternatives: readonly TariffMeasure[],
): AmbiguousTariffLookup {
  return {
    status: "ambiguous",
    nomenclatureCode,
    referenceDate,
    territory: "REUNION",
    reason,
    alternatives,
  };
}

function notFound(
  nomenclatureCode: string,
  referenceDate: string,
  reason: NotFoundTariffLookup["reason"],
): NotFoundTariffLookup {
  return { status: "not-found", nomenclatureCode, referenceDate, territory: "REUNION", reason };
}

export function lookupReunionTariffs(input: TariffLookupInput): TariffLookupResult {
  let nomenclatureCode: string;
  let referenceDate: string;
  try {
    nomenclatureCode = normalizeNomenclatureCode(input.nomenclatureCode);
  } catch (error) {
    return unsupported(
      input,
      "invalid-nomenclature",
      error instanceof TariffInputError ? error.message : "Nomenclature invalide.",
    );
  }
  try {
    referenceDate = normalizeIsoDate(input.referenceDate);
  } catch (error) {
    return unsupported(
      input,
      "invalid-date",
      error instanceof TariffInputError ? error.message : "Date invalide.",
    );
  }

  const activeMeasures = input.dataset.measures.filter((measure) => isActive(measure, referenceDate));
  const exactMeasures = activeMeasures.filter(
    (measure) => measure.nomenclatureCode === nomenclatureCode,
  );

  if (exactMeasures.length === 0) {
    const descendants = activeMeasures.filter((measure) =>
      measure.nomenclatureCode.startsWith(nomenclatureCode),
    );
    return descendants.length > 0
      ? ambiguous(nomenclatureCode, referenceDate, "insufficient-nomenclature", descendants)
      : notFound(nomenclatureCode, referenceDate, "no-applicable-measure");
  }

  if (exactMeasures.some((measure) => measure.additionalCode !== null)) {
    return ambiguous(nomenclatureCode, referenceDate, "additional-code-required", exactMeasures);
  }
  if (exactMeasures.some((measure) => measure.conditionCode !== null)) {
    return ambiguous(nomenclatureCode, referenceDate, "condition-requires-review", exactMeasures);
  }

  const octroiDeMer = exactMeasures.filter((measure) => measure.measureType === "octroi-de-mer");
  const octroiDeMerRegional = exactMeasures.filter(
    (measure) => measure.measureType === "octroi-de-mer-regional",
  );

  if (octroiDeMer.length === 0) return notFound(nomenclatureCode, referenceDate, "missing-octroi-de-mer");
  if (octroiDeMerRegional.length === 0) {
    return notFound(nomenclatureCode, referenceDate, "missing-octroi-de-mer-regional");
  }
  if (octroiDeMer.length !== 1 || octroiDeMerRegional.length !== 1) {
    return ambiguous(nomenclatureCode, referenceDate, "multiple-applicable-measures", exactMeasures);
  }

  const omMeasure = octroiDeMer[0];
  const omrMeasure = octroiDeMerRegional[0];
  if (!omMeasure || !omrMeasure) {
    return notFound(nomenclatureCode, referenceDate, "no-applicable-measure");
  }

  return {
    status: "resolved",
    nomenclatureCode,
    referenceDate,
    territory: "REUNION",
    octroiDeMerRate: omMeasure.rate,
    octroiDeMerRegionalRate: omrMeasure.rate,
    measures: { octroiDeMer: omMeasure, octroiDeMerRegional: omrMeasure },
  };
}
