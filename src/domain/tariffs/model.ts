import type { FiscalRate } from "../landed-cost/fiscal-rate";
import type { TariffSource } from "./source";

export type TariffMeasureType = "octroi-de-mer" | "octroi-de-mer-regional";
export type TariffTerritory = "REUNION";

export type TariffMeasureSource = Readonly<{
  name: Extract<TariffSource, "RITA">;
  url: string;
  referenceDate: string;
  reference: string;
  sourceLine: number;
  rawFields: Readonly<Record<string, string>>;
}>;

export type TariffMeasure = Readonly<{
  nomenclatureCode: string;
  measureType: TariffMeasureType;
  measureTypeCode: "OEA" | "OEB" | "ORA" | "ORB";
  taxCode: string;
  rate: FiscalRate;
  territory: TariffTerritory;
  validFrom: string;
  validTo: string | null;
  additionalCode: string | null;
  conditionCode: string | null;
  source: TariffMeasureSource;
}>;

declare const tariffDatasetBrand: unique symbol;

export type TariffDataset = Readonly<{
  schemaVersion: 1;
  datasetId: string;
  territory: TariffTerritory;
  source: Extract<TariffSource, "RITA">;
  sourceReferenceDate: string;
  sourceFileName: string;
  sourceSha256: string;
  measures: readonly TariffMeasure[];
  readonly [tariffDatasetBrand]: true;
}>;

export type TariffLookupInput = Readonly<{
  nomenclatureCode: string;
  referenceDate: string;
  dataset: TariffDataset;
}>;

export type ResolvedTariffLookup = Readonly<{
  status: "resolved";
  nomenclatureCode: string;
  referenceDate: string;
  territory: TariffTerritory;
  octroiDeMerRate: FiscalRate;
  octroiDeMerRegionalRate: FiscalRate;
  measures: Readonly<{
    octroiDeMer: TariffMeasure;
    octroiDeMerRegional: TariffMeasure;
  }>;
}>;

export type AmbiguousTariffLookup = Readonly<{
  status: "ambiguous";
  nomenclatureCode: string;
  referenceDate: string;
  territory: TariffTerritory;
  reason:
    | "additional-code-required"
    | "condition-requires-review"
    | "insufficient-nomenclature"
    | "multiple-applicable-measures";
  alternatives: readonly TariffMeasure[];
}>;

export type NotFoundTariffLookup = Readonly<{
  status: "not-found";
  nomenclatureCode: string;
  referenceDate: string;
  territory: TariffTerritory;
  reason: "missing-octroi-de-mer" | "missing-octroi-de-mer-regional" | "no-applicable-measure";
}>;

export type UnsupportedTariffLookup = Readonly<{
  status: "unsupported";
  nomenclatureCode: string;
  referenceDate: string;
  territory: TariffTerritory;
  reason: "invalid-date" | "invalid-nomenclature";
  message: string;
}>;

export type TariffLookupResult =
  | ResolvedTariffLookup
  | AmbiguousTariffLookup
  | NotFoundTariffLookup
  | UnsupportedTariffLookup;
