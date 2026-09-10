import { describe, expect, it } from "vitest";
import {
  centsFromInteger,
  fiscalRateFromBasisPoints,
  REUNION_HIGH_TECH_DEMO_PROFILE,
} from "../landed-cost";
import {
  calculateLandedCostWithReunionTariffs,
  lookupReunionTariffs,
  normalizeNomenclatureCode,
  parseTariffDatasetBundle,
  parseTariffDatasetDocument,
  type TariffDataset,
} from "./index";

type RawMeasure = {
  nomenclatureCode: string;
  measureType: "octroi-de-mer" | "octroi-de-mer-regional";
  measureTypeCode: "OEA" | "OEB" | "ORA" | "ORB";
  taxCode: string;
  rateBasisPoints: number;
  territory: "REUNION";
  validFrom: string;
  validTo: string | null;
  additionalCode: string | null;
  conditionCode: string | null;
  source: {
    name: "RITA";
    url: string;
    referenceDate: string;
    reference: string;
    sourceLine: number;
    rawFields: Record<string, string>;
  };
};

function rawMeasure(
  measureType: RawMeasure["measureType"],
  rateBasisPoints: number,
  overrides: Partial<RawMeasure> = {},
): RawMeasure {
  const isOm = measureType === "octroi-de-mer";
  return {
    nomenclatureCode: "8400000001",
    measureType,
    measureTypeCode: isOm ? "OEA" : "ORA",
    taxCode: isOm ? "TAX-OM" : "TAX-OMR",
    rateBasisPoints,
    territory: "REUNION",
    validFrom: "2026-01-01",
    validTo: "2026-12-31",
    additionalCode: null,
    conditionCode: null,
    source: {
      name: "RITA",
      url: "https://form.douane.gouv.fr/rita-encyclopedie/public/experts/mesures/init.action",
      referenceDate: "2026-09-09",
      reference: isOm ? "ligne-2" : "ligne-3",
      sourceLine: isOm ? 2 : 3,
      rawFields: { TEST: "fixture-synthetique" },
    },
    ...overrides,
  };
}

function dataset(measures: RawMeasure[]): TariffDataset {
  return parseTariffDatasetDocument({
    schemaVersion: 1,
    datasetId: "synthetic-test-only",
    territory: "REUNION",
    source: "RITA",
    sourceReferenceDate: "2026-09-09",
    sourceFileName: "synthetic.csv",
    sourceSha256: "a".repeat(64),
    measures,
  });
}

function lookup(measures: RawMeasure[], overrides: Partial<{ nomenclatureCode: string; referenceDate: string }> = {}) {
  return lookupReunionTariffs({
    nomenclatureCode: "8400000001",
    referenceDate: "2026-09-09",
    dataset: dataset(measures),
    ...overrides,
  });
}

describe("référentiel tarifaire RITA normalisé", () => {
  it("accepte le statut de provenance neutre rita-import", () => {
    const availability = parseTariffDatasetBundle({
      schemaVersion: 1,
      availability: "rita-import",
      dataset: {
        schemaVersion: 1,
        datasetId: "empty-import-test",
        territory: "REUNION",
        source: "RITA",
        sourceReferenceDate: "2026-09-09",
        sourceFileName: "rita-export.csv",
        sourceSha256: "a".repeat(64),
        measures: [],
      },
    });

    expect(availability.status).toBe("available");
  });

  it("normalise un code saisi avec des espaces", () => {
    expect(normalizeNomenclatureCode("84 00 00 00 01")).toBe("8400000001");
    const result = lookup([rawMeasure("octroi-de-mer", 650), rawMeasure("octroi-de-mer-regional", 250)], {
      nomenclatureCode: "84 00 00 00 01",
    });
    expect(result.status).toBe("resolved");
    expect(result.nomenclatureCode).toBe("8400000001");
  });

  it("préserve exactement un taux OM nul", () => {
    const result = lookup([rawMeasure("octroi-de-mer", 0), rawMeasure("octroi-de-mer-regional", 250)]);
    expect(result.status).toBe("resolved");
    if (result.status === "resolved") expect(result.octroiDeMerRate.basisPoints).toBe(0);
  });

  it("préserve exactement un taux OMR nul", () => {
    const result = lookup([rawMeasure("octroi-de-mer", 650), rawMeasure("octroi-de-mer-regional", 0)]);
    expect(result.status).toBe("resolved");
    if (result.status === "resolved") expect(result.octroiDeMerRegionalRate.basisPoints).toBe(0);
  });

  it("résout un couple OM/OMR simple et exact en points de base", () => {
    const result = lookup([rawMeasure("octroi-de-mer", 1), rawMeasure("octroi-de-mer-regional", 12_345)]);
    expect(result.status).toBe("resolved");
    if (result.status === "resolved") {
      expect(result.octroiDeMerRate.basisPoints).toBe(1);
      expect(result.octroiDeMerRegionalRate.basisPoints).toBe(12_345);
      expect(result.measures.octroiDeMer.taxCode).toBe("TAX-OM");
    }
  });

  it("sélectionne les mesures actives à la date demandée", () => {
    const measures = [
      rawMeasure("octroi-de-mer", 400, { validTo: "2026-08-31", source: { ...rawMeasure("octroi-de-mer", 400).source, sourceLine: 4 } }),
      rawMeasure("octroi-de-mer", 650, { validFrom: "2026-09-01" }),
      rawMeasure("octroi-de-mer-regional", 250),
    ];
    const result = lookup(measures);
    expect(result.status).toBe("resolved");
    if (result.status === "resolved") expect(result.octroiDeMerRate.basisPoints).toBe(650);
  });

  it("ignore une mesure expirée", () => {
    const result = lookup([
      rawMeasure("octroi-de-mer", 650, { validTo: "2026-09-08" }),
      rawMeasure("octroi-de-mer-regional", 250),
    ]);
    expect(result).toMatchObject({ status: "not-found", reason: "missing-octroi-de-mer" });
  });

  it("ignore une mesure future", () => {
    const result = lookup([
      rawMeasure("octroi-de-mer", 650),
      rawMeasure("octroi-de-mer-regional", 250, { validFrom: "2026-09-10" }),
    ]);
    expect(result).toMatchObject({ status: "not-found", reason: "missing-octroi-de-mer-regional" });
  });

  it("signale une nomenclature inconnue", () => {
    const result = lookup([rawMeasure("octroi-de-mer", 650), rawMeasure("octroi-de-mer-regional", 250)], {
      nomenclatureCode: "8500000001",
    });
    expect(result).toMatchObject({ status: "not-found", reason: "no-applicable-measure" });
  });

  it("refuse un dataset invalide", () => {
    expect(() => parseTariffDatasetDocument({ schemaVersion: 1, measures: [] })).toThrow();
    expect(() => dataset([rawMeasure("octroi-de-mer", 1, { rateBasisPoints: 1.5 })])).toThrow(/entier sûr/i);
  });

  it("retourne ambiguous quand plusieurs taux OM sont applicables", () => {
    const result = lookup([
      rawMeasure("octroi-de-mer", 650),
      rawMeasure("octroi-de-mer", 850, { measureTypeCode: "OEB", taxCode: "TAX-OM-B", source: { ...rawMeasure("octroi-de-mer", 850).source, sourceLine: 4 } }),
      rawMeasure("octroi-de-mer-regional", 250),
    ]);
    expect(result).toMatchObject({ status: "ambiguous", reason: "multiple-applicable-measures" });
  });

  it("ne choisit pas arbitrairement une mesure avec code additionnel", () => {
    const result = lookup([
      rawMeasure("octroi-de-mer", 650, { additionalCode: "1234" }),
      rawMeasure("octroi-de-mer-regional", 250),
    ]);
    expect(result).toMatchObject({ status: "ambiguous", reason: "additional-code-required" });
  });

  it("signale qu’une nomenclature parent ne suffit pas sans remonter automatiquement", () => {
    const result = lookup([rawMeasure("octroi-de-mer", 650), rawMeasure("octroi-de-mer-regional", 250)], {
      nomenclatureCode: "84",
    });
    expect(result).toMatchObject({ status: "ambiguous", reason: "insufficient-nomenclature" });
  });
});

describe("intégration contrôlée avec calculateLandedCost", () => {
  const landedCost = {
    goodsValueCents: centsFromInteger(10_000),
    shippingToEntryCents: centsFromInteger(2_000),
    insuranceToEntryCents: centsFromInteger(0),
    postEntryAccessoryCostsCents: centsFromInteger(0),
    carrierFeeCents: centsFromInteger(0),
    fiscalProfile: REUNION_HIGH_TECH_DEMO_PROFILE,
  };

  it("injecte seulement un couple resolved dans le moteur fiscal existant", () => {
    const result = calculateLandedCostWithReunionTariffs({
      nomenclatureCode: "8400000001",
      referenceDate: "2026-09-09",
      dataset: dataset([rawMeasure("octroi-de-mer", 650), rawMeasure("octroi-de-mer-regional", 250)]),
      landedCost,
    });
    expect(result.status).toBe("calculated");
    if (result.status === "calculated") {
      expect(result.breakdown.ratesUsed.octroiDeMer).toEqual(fiscalRateFromBasisPoints(650));
      expect(result.breakdown.octroiDeMerCents).toBe(780);
      expect(result.breakdown.octroiDeMerRegionalCents).toBe(300);
    }
  });

  it("garantit qu’un résultat ambiguous ne déclenche aucun calcul silencieux", () => {
    const result = calculateLandedCostWithReunionTariffs({
      nomenclatureCode: "8400000001",
      referenceDate: "2026-09-09",
      dataset: dataset([
        rawMeasure("octroi-de-mer", 650),
        rawMeasure("octroi-de-mer", 850, { measureTypeCode: "OEB", source: { ...rawMeasure("octroi-de-mer", 850).source, sourceLine: 4 } }),
        rawMeasure("octroi-de-mer-regional", 250),
      ]),
      landedCost,
    });
    expect(result).toMatchObject({
      status: "tariff-unresolved",
      tariffLookup: { status: "ambiguous" },
    });
    expect("breakdown" in result).toBe(false);
  });
});
