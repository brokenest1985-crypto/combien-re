import { describe, expect, it } from "vitest";
import {
  applyFiscalRate,
  calculateLandedCost,
  centsFromInteger,
  fiscalRateFromBasisPoints,
  formatEuroAmount,
  formatFiscalRate,
  parseEuroAmount,
  parseFiscalRate,
  REUNION_HIGH_TECH_DEMO_PROFILE,
  type Cents,
  type LandedCostInput,
} from "./index";

function input(overrides: Partial<LandedCostInput> = {}): LandedCostInput {
  return {
    goodsValueCents: centsFromInteger(10_000),
    shippingToEntryCents: centsFromInteger(0),
    insuranceToEntryCents: centsFromInteger(0),
    postEntryAccessoryCostsCents: centsFromInteger(0),
    carrierFeeCents: centsFromInteger(0),
    octroiDeMerRate: fiscalRateFromBasisPoints(0),
    octroiDeMerRegionalRate: fiscalRateFromBasisPoints(0),
    fiscalProfile: REUNION_HIGH_TECH_DEMO_PROFILE,
    ...overrides,
  };
}

describe("moteur fiscal V0.2a", () => {
  it("applique le taux TVA Réunion configuré à 8,5 %", () => {
    const result = calculateLandedCost(input());

    expect(result.vatBaseCents).toBe(10_000);
    expect(result.vatCents).toBe(850);
    expect(result.ratesUsed.vat.basisPoints).toBe(850);
    expect(formatFiscalRate(result.ratesUsed.vat)).toBe("8,5 %");
  });

  it("accepte un taux OM nul", () => {
    const result = calculateLandedCost(input({
      shippingToEntryCents: centsFromInteger(2_000),
      octroiDeMerRegionalRate: fiscalRateFromBasisPoints(250),
    }));

    expect(result.octroiDeMerCents).toBe(0);
    expect(result.octroiDeMerRegionalCents).toBe(300);
  });

  it("accepte un taux OMR nul", () => {
    const result = calculateLandedCost(input({ octroiDeMerRate: fiscalRateFromBasisPoints(650) }));

    expect(result.octroiDeMerCents).toBe(650);
    expect(result.octroiDeMerRegionalCents).toBe(0);
  });

  it("calcule plusieurs taux exacts avec une seule stratégie d’arrondi", () => {
    const result = calculateLandedCost(input({
      shippingToEntryCents: centsFromInteger(2_000),
      insuranceToEntryCents: centsFromInteger(500),
      postEntryAccessoryCostsCents: centsFromInteger(500),
      carrierFeeCents: centsFromInteger(1_000),
      octroiDeMerRate: fiscalRateFromBasisPoints(650),
      octroiDeMerRegionalRate: fiscalRateFromBasisPoints(250),
    }));

    expect(result).toMatchObject({
      customsValueCents: 12_500,
      vatBaseCents: 13_000,
      octroiDeMerCents: 813,
      octroiDeMerRegionalCents: 313,
      vatCents: 1_105,
      carrierFeeCents: 1_000,
      totalLandedCostCents: 16_231,
      exemptionApplied: false,
    });
  });

  it("calcule OM et OMR sur la valeur en douane incluant transport et assurance", () => {
    const result = calculateLandedCost(input({
      shippingToEntryCents: centsFromInteger(2_000),
      insuranceToEntryCents: centsFromInteger(500),
      octroiDeMerRate: fiscalRateFromBasisPoints(1_000),
      octroiDeMerRegionalRate: fiscalRateFromBasisPoints(200),
    }));

    expect(result.customsValueCents).toBe(12_500);
    expect(result.octroiDeMerCents).toBe(1_250);
    expect(result.octroiDeMerRegionalCents).toBe(250);
  });

  it("exclut explicitement OM et OMR de la base TVA", () => {
    const result = calculateLandedCost(input({
      octroiDeMerRate: fiscalRateFromBasisPoints(2_000),
      octroiDeMerRegionalRate: fiscalRateFromBasisPoints(1_000),
    }));

    expect(result.octroiDeMerCents).toBe(2_000);
    expect(result.octroiDeMerRegionalCents).toBe(1_000);
    expect(result.vatBaseCents).toBe(10_000);
    expect(result.vatBaseExcludesOctroiDeMer).toBe(true);
    expect(result.vatCents).toBe(850);
    expect(result.vatCents).not.toBe(1_105); // résultat fautif si la TVA incluait OM + OMR
  });

  it("ajoute les frais accessoires postérieurs à l’entrée à la seule base TVA", () => {
    const result = calculateLandedCost(input({
      postEntryAccessoryCostsCents: centsFromInteger(1_000),
      octroiDeMerRate: fiscalRateFromBasisPoints(1_000),
    }));

    expect(result.customsValueCents).toBe(10_000);
    expect(result.octroiDeMerCents).toBe(1_000);
    expect(result.vatBaseCents).toBe(11_000);
    expect(result.vatCents).toBe(935);
  });

  it("ajoute les frais privés du transporteur au total sans les traiter comme une taxe", () => {
    const result = calculateLandedCost(input({ carrierFeeCents: centsFromInteger(1_500) }));

    expect(result.carrierFeeCents).toBe(1_500);
    expect(result.vatBaseCents).toBe(10_000);
    expect(result.totalLandedCostCents).toBe(12_350);
  });

  it("accepte un scénario entièrement nul", () => {
    const result = calculateLandedCost(input({ goodsValueCents: centsFromInteger(0) }));

    expect(result.customsValueCents).toBe(0);
    expect(result.vatCents).toBe(0);
    expect(result.totalLandedCostCents).toBe(0);
    expect(result.exemptionApplied).toBe(true);
  });

  it.each([
    ["21,99", true],
    ["22,00", true],
    ["22,01", false],
  ])("applique la franchise à la valeur intrinsèque %s € : %s", (goodsValue, exempt) => {
    const result = calculateLandedCost(input({
      goodsValueCents: parseEuroAmount(goodsValue),
      shippingToEntryCents: centsFromInteger(1_000),
      octroiDeMerRate: fiscalRateFromBasisPoints(1_000),
      octroiDeMerRegionalRate: fiscalRateFromBasisPoints(200),
    }));

    expect(result.exemptionApplied).toBe(exempt);
    if (exempt) {
      expect([result.vatCents, result.octroiDeMerCents, result.octroiDeMerRegionalCents]).toEqual([0, 0, 0]);
    } else {
      expect(result.vatCents).toBeGreaterThan(0);
      expect(result.octroiDeMerCents).toBeGreaterThan(0);
      expect(result.octroiDeMerRegionalCents).toBeGreaterThan(0);
    }
  });

  it("arrondit de façon déterministe les limites au demi-centime", () => {
    const rate = fiscalRateFromBasisPoints(100);

    expect(applyFiscalRate(centsFromInteger(49), rate, "nearest-cent-half-up")).toBe(0);
    expect(applyFiscalRate(centsFromInteger(50), rate, "nearest-cent-half-up")).toBe(1);
  });

  it("préserve les calculs intermédiaires exacts jusqu’à la limite sûre", () => {
    expect(applyFiscalRate(
      centsFromInteger(Number.MAX_SAFE_INTEGER),
      fiscalRateFromBasisPoints(10_000),
      "nearest-cent-half-up",
    )).toBe(Number.MAX_SAFE_INTEGER);
  });

  it("refuse les dépassements d’entier sûr lors des additions et du total", () => {
    expect(() => calculateLandedCost(input({
      goodsValueCents: centsFromInteger(Number.MAX_SAFE_INTEGER),
      shippingToEntryCents: centsFromInteger(1),
    }))).toThrow(/valeur en douane.*limite/i);

    expect(() => calculateLandedCost(input({
      goodsValueCents: centsFromInteger(Number.MAX_SAFE_INTEGER),
      octroiDeMerRate: fiscalRateFromBasisPoints(10_000),
    }))).toThrow(/coût total.*limite/i);
  });
});

describe("entrées monétaires et fiscales exactes", () => {
  it.each([
    ["19,99", 1_999, "19,99 €"],
    ["0.10", 10, "0,10 €"],
    ["001,5", 150, "1,50 €"],
  ])("convertit %s sans flottant", (text, expected, display) => {
    const amount = parseEuroAmount(text);
    expect(amount).toBe(expected);
    expect(formatEuroAmount(amount)).toBe(display);
  });

  it.each(["-1", "-0,01", " -20 "])("refuse un montant négatif : %s", (value) => {
    expect(() => parseEuroAmount(value)).toThrow(/négatif/);
  });

  it.each(["", "abc", "1,234", ",50", "1e2", "Infinity", "12 €"])(
    "refuse un montant invalide : %s",
    (value) => expect(() => parseEuroAmount(value)).toThrow(TypeError),
  );

  it.each([
    ["0", 0, "0 %"],
    ["8,5", 850, "8,5 %"],
    ["6.25", 625, "6,25 %"],
  ])("convertit le taux %s exactement", (text, expected, display) => {
    const rate = parseFiscalRate(text);
    expect(rate.basisPoints).toBe(expected);
    expect(formatFiscalRate(rate)).toBe(display);
  });

  it.each(["", "abc", "1,234", "-1", ".5", "NaN"])("refuse un taux invalide : %s", (value) => {
    expect(() => parseFiscalRate(value)).toThrow();
  });

  it.each([-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
    "refuse des centimes invalides même hors interface : %s",
    (value) => {
      expect(() => centsFromInteger(value)).toThrow(RangeError);
      expect(() => calculateLandedCost(input({ goodsValueCents: value as Cents }))).toThrow(RangeError);
    },
  );

  it("préserve exactement la valeur monétaire sûre maximale", () => {
    const maximum = parseEuroAmount("90071992547409,91");
    expect(maximum).toBe(Number.MAX_SAFE_INTEGER);
    expect(formatEuroAmount(maximum)).toBe("90071992547409,91 €");
    expect(() => parseEuroAmount("90071992547409,92")).toThrow(/trop élevé/);
  });
});
