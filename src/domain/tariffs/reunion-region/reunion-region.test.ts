import { describe, expect, it } from "vitest";
import { centsFromInteger, REUNION_HIGH_TECH_DEMO_PROFILE } from "../../landed-cost";
import { calculateWithRegionReunionTariff, lookupRegionReunionTariff, parseRegionTariffDataset, RegionTariffDatasetError, type RegionTariffDataset } from ".";

function rawRow(overrides: Record<string, unknown> = {}) {
  return { publishedCode: "8471 30 00", nomenclatureCode: "84713000", nomenclatureLevel: 8, designation: "Ordinateurs portables", externalOctroiDeMerRateBasisPoints: 400, externalRegionalOctroiDeMerRateBasisPoints: 250, qualifier: null, observations: null, sourcePage: 294, ...overrides };
}
function dataset(rows = [rawRow()]): RegionTariffDataset {
  return parseRegionTariffDataset({ schemaVersion: 1, datasetId: "synthetic-test-only", source: "REGION_REUNION", effectiveFrom: "2026-06-12", effectiveTo: null, verifiedThrough: "2026-09-10", sourceReference: { deliberationNumber: "DCP2026_0296", publicationDate: "2026-06-12", url: "https://regionreunion.com/IMG/pdf/test.pdf", documentSha256: "a".repeat(64) }, rows });
}

describe("dataset Région Réunion", () => {
  it("refuse une source, un manifest ou un dataset invalide", () => {
    expect(() => parseRegionTariffDataset({})).toThrow(RegionTariffDatasetError);
    expect(() => dataset([rawRow({ nomenclatureLevel: 6 })])).toThrow(/incohérent/i);
    expect(() => parseRegionTariffDataset({ schemaVersion: 1, source: "REGION_REUNION", rows: [] })).toThrow();
  });
  it("refuse les doublons comme résolution automatique", () => {
    const result = lookupRegionReunionTariff({ nomenclatureCode: "84713000", referenceDate: "2026-09-10", dataset: dataset([rawRow(), rawRow({ designation: "Alternative", externalOctroiDeMerRateBasisPoints: 0 })]) });
    expect(result).toMatchObject({ status: "ambiguous", reason: "multiple-rules" });
  });
});

describe("lookup conservateur Région Réunion", () => {
  it("résout une correspondance exacte simple avec des espaces", () => {
    const result = lookupRegionReunionTariff({ nomenclatureCode: "84 71 30 00", referenceDate: "2026-09-10", dataset: dataset() });
    expect(result).toMatchObject({ status: "resolved", nomenclatureCode: "84713000", designation: "Ordinateurs portables" });
    if (result.status === "resolved") expect([result.octroiDeMerRate.basisPoints, result.octroiDeMerRegionalRate.basisPoints]).toEqual([400, 250]);
  });
  it("retourne ambiguous pour un parent non démontré", () => {
    expect(lookupRegionReunionTariff({ nomenclatureCode: "8471300010", referenceDate: "2026-09-10", dataset: dataset() })).toMatchObject({ status: "ambiguous", reason: "parent-inheritance-not-proven" });
  });
  it("retourne ambiguous pour EX, SAUF ou une observation", () => {
    for (const row of [rawRow({ qualifier: "EX" }), rawRow({ qualifier: "SAUF" }), rawRow({ observations: "condition" })]) {
      expect(lookupRegionReunionTariff({ nomenclatureCode: "84713000", referenceDate: "2026-09-10", dataset: dataset([row]) }).status).toBe("ambiguous");
    }
  });
  it("retourne not-found pour un code inconnu", () => {
    expect(lookupRegionReunionTariff({ nomenclatureCode: "99999999", referenceDate: "2026-09-10", dataset: dataset() }).status).toBe("not-found");
  });
  it("signale un dataset absent et les dates hors période ou non vérifiées", () => {
    expect(lookupRegionReunionTariff({ nomenclatureCode: "84713000", referenceDate: "2026-09-10", dataset: null })).toMatchObject({ status: "unsupported", reason: "dataset-unavailable" });
    expect(lookupRegionReunionTariff({ nomenclatureCode: "84713000", referenceDate: "2026-06-11", dataset: dataset() })).toMatchObject({ status: "unsupported", reason: "snapshot-outside-period" });
    expect(lookupRegionReunionTariff({ nomenclatureCode: "84713000", referenceDate: "2026-09-11", dataset: dataset() })).toMatchObject({ status: "unsupported", reason: "snapshot-not-verified-for-date" });
  });
});

describe("injection contrôlée dans calculateLandedCost", () => {
  const landedCost = { goodsValueCents: centsFromInteger(10_000), shippingToEntryCents: centsFromInteger(2_000), insuranceToEntryCents: centsFromInteger(0), postEntryAccessoryCostsCents: centsFromInteger(0), carrierFeeCents: centsFromInteger(0), fiscalProfile: REUNION_HIGH_TECH_DEMO_PROFILE };
  it("injecte uniquement un résultat resolved", () => {
    const result = calculateWithRegionReunionTariff({ nomenclatureCode: "84713000", referenceDate: "2026-09-10", dataset: dataset(), landedCost });
    expect(result.status).toBe("calculated");
    if (result.status === "calculated") expect(result.breakdown.octroiDeMerCents).toBe(480);
  });
  it("interdit à ambiguous de déclencher un calcul", () => {
    const result = calculateWithRegionReunionTariff({ nomenclatureCode: "84713000", referenceDate: "2026-09-10", dataset: dataset([rawRow({ qualifier: "EX" })]), landedCost });
    expect(result).toMatchObject({ status: "tariff-unresolved", tariffLookup: { status: "ambiguous" } });
    expect("breakdown" in result).toBe(false);
  });
});
