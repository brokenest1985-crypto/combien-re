import type { FiscalRate } from "../../landed-cost/fiscal-rate";

export type RegionTariffQualifier = "EX" | "SAUF" | null;

export type RegionTariffRow = Readonly<{
  publishedCode: string;
  nomenclatureCode: string;
  nomenclatureLevel: 2 | 4 | 6 | 8 | 10;
  designation: string;
  externalOctroiDeMerRate: FiscalRate | null;
  externalRegionalOctroiDeMerRate: FiscalRate | null;
  qualifier: RegionTariffQualifier;
  observations: string | null;
  sourcePage: number;
}>;

export type RegionTariffSourceReference = Readonly<{
  deliberationNumber: string;
  publicationDate: string;
  url: string;
  documentSha256: string;
}>;

declare const regionTariffDatasetBrand: unique symbol;
export type RegionTariffDataset = Readonly<{
  schemaVersion: 1;
  datasetId: string;
  source: "REGION_REUNION";
  effectiveFrom: string;
  effectiveTo: string | null;
  verifiedThrough: string;
  sourceReference: RegionTariffSourceReference;
  rows: readonly RegionTariffRow[];
  readonly [regionTariffDatasetBrand]: true;
}>;

export type RegionTariffLookupResult =
  | Readonly<{
      status: "resolved";
      nomenclatureCode: string;
      referenceDate: string;
      designation: string;
      octroiDeMerRate: FiscalRate;
      octroiDeMerRegionalRate: FiscalRate;
      source: "REGION_REUNION";
      sourceReference: RegionTariffSourceReference;
      row: RegionTariffRow;
    }>
  | Readonly<{
      status: "ambiguous";
      nomenclatureCode: string;
      referenceDate: string;
      reason: "qualified-rule" | "multiple-rules" | "parent-inheritance-not-proven";
      alternatives: readonly RegionTariffRow[];
    }>
  | Readonly<{
      status: "not-found";
      nomenclatureCode: string;
      referenceDate: string;
      reason: "no-rule";
    }>
  | Readonly<{
      status: "unsupported";
      nomenclatureCode: string;
      referenceDate: string;
      reason: "dataset-unavailable" | "invalid-date" | "invalid-nomenclature" | "snapshot-outside-period" | "snapshot-not-verified-for-date";
      message: string;
    }>;
