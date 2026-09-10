import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { parseRitaMeasureCsv, RitaCsvError } from "./rita-csv.mjs";

const options = {
  referenceDate: "2026-09-09",
  sourceFileName: "fixture.csv",
  sourceUrl: "https://form.douane.gouv.fr/rita-encyclopedie/public/experts/mesures/init.action",
};

describe("adaptateur CSV RITA", () => {
  it("parse la fixture synthétique sans utiliser de flottants", async () => {
    const csv = await readFile("test/fixtures/rita/measures.synthetic.csv", "utf8");
    const result = parseRitaMeasureCsv(csv, options);

    expect(result.issues).toEqual([]);
    expect(result.delimiter).toBe(";");
    expect(result.measures).toHaveLength(2);
    expect(result.measures.map((measure) => measure.rateBasisPoints).sort((a, b) => a - b)).toEqual([250, 650]);
    expect(result.measures[0].nomenclatureCode).toBe("8400000001");
    expect(result.measures[0].source.rawFields.REFERENCE).toBe("SYNTHETIQUE-TEST-UNIQUEMENT");
  });

  it("signale toute ligne RITA inconnue au lieu de la supprimer", () => {
    const csv = [
      "NOMENCLATURE;TYPE_MESURE;CODE_TAXE;TAUX;TERRITOIRE;DATE_DEBUT;DATE_FIN;CODE_ADDITIONNEL;CODE_CONDITION",
      "8400000001;MESURE-INCONNUE;X;6,50;REUNI;01/01/2026;31/12/2026;;",
    ].join("\n");
    const result = parseRitaMeasureCsv(csv, options);

    expect(result.measures).toEqual([]);
    expect(result.issues).toEqual([
      expect.objectContaining({ line: 2, code: "unsupported-row", message: expect.stringMatching(/inconnu/i) }),
    ]);
  });

  it("refuse une structure de fichier invalide", () => {
    expect(() => parseRitaMeasureCsv("colonne\nvaleur", options)).toThrow(RitaCsvError);
  });

  it("préserve exactement les centièmes de pourcentage", () => {
    const csv = [
      "NOMENCLATURE,TYPE_MESURE,CODE_TAXE,TAUX,TERRITOIRE,DATE_DEBUT,DATE_FIN,CODE_ADDITIONNEL,CODE_CONDITION",
      "8400000001,OEA,X,0.01,REUNION,2026-01-01,2026-12-31,,",
      "8400000001,ORA,Y,123.45,REUNION,2026-01-01,2026-12-31,,",
    ].join("\n");
    const result = parseRitaMeasureCsv(csv, options);

    expect(result.issues).toEqual([]);
    expect(result.measures.map((measure) => measure.rateBasisPoints).sort((a, b) => a - b)).toEqual([1, 12_345]);
  });
});
