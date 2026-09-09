import { describe, expect, it } from "vitest";
import { calculateLandedCost, centsFromInteger, formatEuroAmount, parseEuroAmount, type Cents } from "./index";

describe("coût provisoire rendu", () => {
  it.each([
    ["100", "20", 12000, "120,00 €"],
    ["100", "0", 10000, "100,00 €"],
    ["19,99", "4,95", 2494, "24,94 €"],
    ["0.10", "0.20", 30, "0,30 €"],
    ["0", "0", 0, "0,00 €"],
    ["001,5", " 2.05 ", 355, "3,55 €"],
  ])("%s € + %s €", (product, shipping, expectedCents, expectedDisplay) => {
    const result = calculateLandedCost({
      productPriceCents: parseEuroAmount(product),
      shippingCostCents: parseEuroAmount(shipping),
    });
    expect(result.totalCents).toBe(expectedCents);
    expect(formatEuroAmount(result.totalCents)).toBe(expectedDisplay);
  });

  it.each(["-1", "-0,01", " -20 "])("refuse une saisie négative : %s", (value) => {
    expect(() => parseEuroAmount(value)).toThrow(/négatif/);
  });

  it.each(["", " ", "abc", "12abc", "1,234", "1.234", "1,", ",50", "1e2", "Infinity", "NaN", "0x10", "1 000", "12 €", "+2", "1,2.3"])(
    "refuse une saisie invalide : %s", (value) => {
      expect(() => parseEuroAmount(value)).toThrow(TypeError);
    },
  );

  it.each([-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
    "refuse des centimes invalides même hors interface : %s", (value) => {
      expect(() => centsFromInteger(value)).toThrow(RangeError);
      expect(() => calculateLandedCost({ productPriceCents: value as Cents, shippingCostCents: centsFromInteger(0) })).toThrow(RangeError);
      expect(() => calculateLandedCost({ productPriceCents: centsFromInteger(0), shippingCostCents: value as Cents })).toThrow(RangeError);
    },
  );

  it("préserve exactement la limite des entiers sûrs", () => {
    const maximum = parseEuroAmount("90071992547409,91");
    expect(maximum).toBe(Number.MAX_SAFE_INTEGER);
    expect(formatEuroAmount(maximum)).toBe("90071992547409,91 €");
    expect(() => parseEuroAmount("90071992547409,92")).toThrow(/trop élevé/);
    expect(() => parseEuroAmount("999999999999999999999999999999")).toThrow(/trop élevé/);
  });

  it("refuse le dépassement lors de l’addition", () => {
    expect(() => calculateLandedCost({
      productPriceCents: centsFromInteger(Number.MAX_SAFE_INTEGER),
      shippingCostCents: centsFromInteger(1),
    })).toThrow(/total est trop élevé/);
  });
});
