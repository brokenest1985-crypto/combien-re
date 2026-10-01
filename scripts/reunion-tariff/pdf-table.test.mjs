import { describe, expect, it } from "vitest";
import { extractRowsFromPage, normalizePublishedCode, parseRateBasisPoints } from "./pdf-table.mjs";

const item = (text, x, y) => ({ text, x, y });

describe("extraction native du tarif Région Réunion", () => {
  it("extrait une ligne réelle identifiée page PDF 26 de DCP2026_0296", () => {
    const [row] = extractRowsFromPage([
      item("0101 29 10", 41.499, 713), item("Chevaux destinés à la boucherie", 90.108, 713.2),
      item("4,00 %", 323.099, 713.1), item("2,50 %", 355.294, 713.1),
    ], 26);
    expect(row).toMatchObject({ nomenclatureCode: "01012910", designation: "Chevaux destinés à la boucherie", externalOctroiDeMerRateBasisPoints: 400, externalRegionalOctroiDeMerRateBasisPoints: 250, sourcePage: 26 });
  });

  it("préserve 0 % et les décimales en points de base exacts", () => {
    expect(parseRateBasisPoints("0,00 %")).toBe(0);
    expect(parseRateBasisPoints("2,50 %")).toBe(250);
  });

  it("normalise les espaces et différents niveaux NC", () => {
    expect(normalizePublishedCode("84").nomenclatureCode).toBe("84");
    expect(normalizePublishedCode("8471").nomenclatureCode).toBe("8471");
    expect(normalizePublishedCode("8471 30").nomenclatureCode).toBe("847130");
    expect(normalizePublishedCode("8471 30 00").nomenclatureCode).toBe("84713000");
  });

  it("conserve une ligne titre sans taux", () => {
    expect(extractRowsFromPage([item("8471", 41.499, 100), item("Machines automatiques", 90.108, 100)], 1)[0]).toMatchObject({ nomenclatureCode: "8471", externalOctroiDeMerRateBasisPoints: null, externalRegionalOctroiDeMerRateBasisPoints: null });
  });

  it("conserve les marqueurs EX et SAUF", () => {
    expect(normalizePublishedCode("EX 3926 20 00").qualifier).toBe("EX");
    expect(normalizePublishedCode("SAUF 3926 20 00").qualifier).toBe("SAUF");
  });

  it("refuse une ligne incomplète, une donnée illisible et un taux impossible", () => {
    expect(() => extractRowsFromPage([item("8471 30 00", 41.499, 100), item("4,00 %", 323.099, 100)], 1)).toThrow(/incomplète/i);
    expect(() => parseRateBasisPoints("illisible")).toThrow(/illisible/i);
    expect(() => parseRateBasisPoints("201,00 %")).toThrow(/impossible/i);
  });
});
