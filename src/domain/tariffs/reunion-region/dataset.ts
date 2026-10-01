import { fiscalRateFromBasisPoints } from "../../landed-cost/fiscal-rate";
import { normalizeIsoDate, normalizeNomenclatureCode } from "../normalization";
import type { RegionTariffDataset, RegionTariffQualifier, RegionTariffRow } from "./model";

export class RegionTariffDatasetError extends TypeError {}

function object(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new RegionTariffDatasetError(`${label} doit être un objet.`);
  return value as Record<string, unknown>;
}
function text(value: unknown, label: string, allowEmpty = false): string {
  if (typeof value !== "string" || (!allowEmpty && !value.trim())) throw new RegionTariffDatasetError(`${label} doit être une chaîne${allowEmpty ? "" : " non vide"}.`);
  return value;
}
function nullableText(value: unknown, label: string): string | null {
  return value === null ? null : text(value, label);
}
function safeInteger(value: unknown, label: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) throw new RegionTariffDatasetError(`${label} doit être un entier sûr positif ou nul.`);
  return value as number;
}
function rate(value: unknown, label: string) {
  return value === null ? null : fiscalRateFromBasisPoints(safeInteger(value, label));
}
function qualifier(value: unknown): RegionTariffQualifier {
  if (value === null || value === "EX" || value === "SAUF") return value;
  throw new RegionTariffDatasetError("qualifier est inconnu.");
}
function officialUrl(value: unknown): string {
  const url = text(value, "sourceReference.url");
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || !(parsed.hostname === "regionreunion.com" || parsed.hostname.endsWith(".regionreunion.com"))) {
    throw new RegionTariffDatasetError("sourceReference.url doit appartenir au domaine officiel regionreunion.com.");
  }
  return url;
}
function parseRow(value: unknown): RegionTariffRow {
  const row = object(value, "row");
  const nomenclatureCode = normalizeNomenclatureCode(text(row.nomenclatureCode, "row.nomenclatureCode"));
  if (row.nomenclatureLevel !== nomenclatureCode.length) throw new RegionTariffDatasetError("nomenclatureLevel est incohérent.");
  const ome = rate(row.externalOctroiDeMerRateBasisPoints, "OME");
  const omer = rate(row.externalRegionalOctroiDeMerRateBasisPoints, "OMER");
  if ((ome === null) !== (omer === null)) throw new RegionTariffDatasetError("OME et OMER doivent être tous deux présents ou absents.");
  return Object.freeze({
    publishedCode: text(row.publishedCode, "row.publishedCode"), nomenclatureCode,
    nomenclatureLevel: nomenclatureCode.length as 2 | 4 | 6 | 8 | 10,
    designation: text(row.designation, "row.designation", true),
    externalOctroiDeMerRate: ome, externalRegionalOctroiDeMerRate: omer,
    qualifier: qualifier(row.qualifier), observations: nullableText(row.observations, "row.observations"),
    sourcePage: safeInteger(row.sourcePage, "row.sourcePage"),
  });
}

export function parseRegionTariffDataset(value: unknown): RegionTariffDataset {
  const document = object(value, "dataset");
  if (document.schemaVersion !== 1 || document.source !== "REGION_REUNION" || !Array.isArray(document.rows)) throw new RegionTariffDatasetError("Dataset Région Réunion invalide.");
  const effectiveFrom = normalizeIsoDate(text(document.effectiveFrom, "effectiveFrom"));
  const effectiveToRaw = nullableText(document.effectiveTo, "effectiveTo");
  const effectiveTo = effectiveToRaw === null ? null : normalizeIsoDate(effectiveToRaw);
  if (effectiveTo !== null && effectiveTo < effectiveFrom) throw new RegionTariffDatasetError("effectiveTo précède effectiveFrom.");
  const verifiedThrough = normalizeIsoDate(text(document.verifiedThrough, "verifiedThrough"));
  if (verifiedThrough < effectiveFrom) throw new RegionTariffDatasetError("verifiedThrough précède effectiveFrom.");
  const source = object(document.sourceReference, "sourceReference");
  const sha = text(source.documentSha256, "sourceReference.documentSha256");
  if (!/^[a-f0-9]{64}$/.test(sha)) throw new RegionTariffDatasetError("SHA-256 invalide.");
  return Object.freeze({
    schemaVersion: 1, datasetId: text(document.datasetId, "datasetId"), source: "REGION_REUNION",
    effectiveFrom, effectiveTo, verifiedThrough,
    sourceReference: Object.freeze({
      deliberationNumber: text(source.deliberationNumber, "sourceReference.deliberationNumber"),
      publicationDate: normalizeIsoDate(text(source.publicationDate, "sourceReference.publicationDate")),
      url: officialUrl(source.url), documentSha256: sha,
    }),
    rows: Object.freeze(document.rows.map(parseRow)),
  }) as RegionTariffDataset;
}
