import { fiscalRateFromBasisPoints } from "../landed-cost/fiscal-rate";
import { normalizeIsoDate, normalizeNomenclatureCode } from "./normalization";
import type { TariffDataset, TariffMeasure, TariffMeasureType } from "./model";

export class TariffDatasetError extends TypeError {}

export type TariffDatasetAvailability =
  | Readonly<{ status: "available"; dataset: TariffDataset }>
  | Readonly<{ status: "unavailable"; reason: string; expectedReferenceDate: string }>;

function record(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TariffDatasetError(`${label} doit être un objet.`);
  }
  return value as Record<string, unknown>;
}

function string(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new TariffDatasetError(`${label} doit être une chaîne non vide.`);
  }
  return value;
}

function nullableString(value: unknown, label: string): string | null {
  if (value === null) return null;
  return string(value, label);
}

function sourceUrl(value: unknown): string {
  const url = string(value, "source.url");
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new TariffDatasetError("source.url doit être une URL officielle RITA valide.");
  }

  if (parsed.protocol !== "https:" || !(parsed.hostname === "douane.gouv.fr" || parsed.hostname.endsWith(".douane.gouv.fr"))) {
    throw new TariffDatasetError("source.url doit appartenir au domaine officiel douane.gouv.fr.");
  }
  return url;
}

function measureType(value: unknown): TariffMeasureType {
  if (value === "octroi-de-mer" || value === "octroi-de-mer-regional") return value;
  throw new TariffDatasetError("measureType doit désigner OM ou OMR.");
}

function measureTypeCode(value: unknown, type: TariffMeasureType): TariffMeasure["measureTypeCode"] {
  if (value !== "OEA" && value !== "OEB" && value !== "ORA" && value !== "ORB") {
    throw new TariffDatasetError("measureTypeCode RITA inconnu.");
  }
  const expectedType = value === "OEA" || value === "OEB" ? "octroi-de-mer" : "octroi-de-mer-regional";
  if (type !== expectedType) {
    throw new TariffDatasetError("measureType et measureTypeCode sont incohérents.");
  }
  return value;
}

function rawFields(value: unknown): Readonly<Record<string, string>> {
  const fields = record(value, "source.rawFields");
  for (const [key, fieldValue] of Object.entries(fields)) {
    if (typeof fieldValue !== "string") {
      throw new TariffDatasetError(`source.rawFields.${key} doit être une chaîne.`);
    }
  }
  return Object.freeze(fields as Record<string, string>);
}

function parseMeasure(value: unknown): TariffMeasure {
  const item = record(value, "measure");
  const type = measureType(item.measureType);
  const validFrom = normalizeIsoDate(string(item.validFrom, "validFrom"));
  const validToValue = nullableString(item.validTo, "validTo");
  const validTo = validToValue === null ? null : normalizeIsoDate(validToValue);
  if (validTo !== null && validTo < validFrom) {
    throw new TariffDatasetError("validTo ne peut pas précéder validFrom.");
  }
  if (item.territory !== "REUNION") {
    throw new TariffDatasetError("Seul le territoire REUNION est accepté.");
  }
  if (!Number.isSafeInteger(item.rateBasisPoints) || (item.rateBasisPoints as number) < 0) {
    throw new TariffDatasetError("rateBasisPoints doit être un entier sûr positif ou nul.");
  }

  const source = record(item.source, "source");
  if (source.name !== "RITA") {
    throw new TariffDatasetError("La seule source autorisée est RITA.");
  }
  if (!Number.isSafeInteger(source.sourceLine) || (source.sourceLine as number) < 2) {
    throw new TariffDatasetError("source.sourceLine doit identifier une ligne de données CSV.");
  }

  return Object.freeze({
    nomenclatureCode: normalizeNomenclatureCode(string(item.nomenclatureCode, "nomenclatureCode")),
    measureType: type,
    measureTypeCode: measureTypeCode(item.measureTypeCode, type),
    taxCode: string(item.taxCode, "taxCode"),
    rate: fiscalRateFromBasisPoints(item.rateBasisPoints as number),
    territory: "REUNION",
    validFrom,
    validTo,
    additionalCode: nullableString(item.additionalCode, "additionalCode"),
    conditionCode: nullableString(item.conditionCode, "conditionCode"),
    source: Object.freeze({
      name: "RITA",
      url: sourceUrl(source.url),
      referenceDate: normalizeIsoDate(string(source.referenceDate, "source.referenceDate")),
      reference: string(source.reference, "source.reference"),
      sourceLine: source.sourceLine as number,
      rawFields: rawFields(source.rawFields),
    }),
  });
}

export function parseTariffDatasetDocument(value: unknown): TariffDataset {
  const document = record(value, "dataset");
  if (document.schemaVersion !== 1) throw new TariffDatasetError("schemaVersion doit valoir 1.");
  if (document.territory !== "REUNION") throw new TariffDatasetError("Le dataset doit cibler REUNION.");
  if (document.source !== "RITA") throw new TariffDatasetError("La seule source autorisée est RITA.");
  if (!Array.isArray(document.measures)) throw new TariffDatasetError("measures doit être un tableau.");

  const sha256 = string(document.sourceSha256, "sourceSha256");
  if (!/^[a-f0-9]{64}$/.test(sha256)) throw new TariffDatasetError("sourceSha256 doit être un SHA-256 hexadécimal.");

  return Object.freeze({
    schemaVersion: 1,
    datasetId: string(document.datasetId, "datasetId"),
    territory: "REUNION",
    source: "RITA",
    sourceReferenceDate: normalizeIsoDate(string(document.sourceReferenceDate, "sourceReferenceDate")),
    sourceFileName: string(document.sourceFileName, "sourceFileName"),
    sourceSha256: sha256,
    measures: Object.freeze(document.measures.map(parseMeasure)),
  }) as TariffDataset;
}

export function parseTariffDatasetBundle(value: unknown): TariffDatasetAvailability {
  const bundle = record(value, "bundle");
  if (bundle.schemaVersion !== 1) throw new TariffDatasetError("bundle.schemaVersion doit valoir 1.");

  if (bundle.availability === "unavailable") {
    return Object.freeze({
      status: "unavailable",
      reason: string(bundle.reason, "bundle.reason"),
      expectedReferenceDate: normalizeIsoDate(
        string(bundle.expectedReferenceDate, "bundle.expectedReferenceDate"),
      ),
    });
  }
  if (bundle.availability === "rita-import") {
    return Object.freeze({ status: "available", dataset: parseTariffDatasetDocument(bundle.dataset) });
  }

  throw new TariffDatasetError("bundle.availability est inconnu.");
}
