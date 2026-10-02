import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseReunionTariffSourceManifest, ReunionTariffManifestError } from "./source-manifest.mjs";

function manifest(overrides = {}) {
  return {
    schemaVersion: 1,
    institution: "Conseil régional de La Réunion",
    publicUrl: "https://regionreunion.com/IMG/pdf/recueil.pdf",
    deliberationNumber: "DCP2026_0296",
    sessionDate: "2026-06-05",
    publicationDate: "2026-06-12",
    effectiveFrom: "2026-06-12",
    effectiveTo: null,
    retrievedAt: "2026-09-10",
    documentSha256: "a".repeat(64),
    documentName: "recueil.pdf",
    tariffPages: { pdfFrom: 26, pdfTo: 346, annex: "Annexe 1" },
    verificationStatus: "verified-current-through-2026-10-01",
    verifiedThrough: "2026-10-01",
    supersededDeliberation: null,
    extraction: "native-pdf-text-no-ocr",
    ...overrides,
  };
}

describe("manifest de provenance Région Réunion", () => {
  it("valide le manifest traçable utilisé par l’importeur", () => {
    expect(parseReunionTariffSourceManifest(manifest())).toMatchObject({
      deliberationNumber: "DCP2026_0296",
      effectiveFrom: "2026-06-12",
      tariffPages: { pdfFrom: 26, pdfTo: 346 },
    });
  });

  it("refuse une source non officielle, un SHA invalide et un statut incohérent", () => {
    expect(() => parseReunionTariffSourceManifest(manifest({ publicUrl: "https://example.test/tarif.pdf" }))).toThrow(ReunionTariffManifestError);
    expect(() => parseReunionTariffSourceManifest(manifest({ documentSha256: "invalide" }))).toThrow(/SHA-256/i);
    expect(() => parseReunionTariffSourceManifest(manifest({ verificationStatus: "verified" }))).toThrow(/statut/i);
  });

  it("interdit d’étendre la borne sans modifier explicitement le statut du manifest", () => {
    expect(() => parseReunionTariffSourceManifest(manifest({ verifiedThrough: "2026-10-02" }))).toThrow(/statut/i);
  });

  it("garde la borne du dataset généré alignée sur celle du manifest versionné", () => {
    const directory = new URL("../../data-sources/reunion-tariff/2026-06-12/", import.meta.url);
    const source = parseReunionTariffSourceManifest(JSON.parse(readFileSync(new URL("source.json", directory), "utf8")));
    const dataset = JSON.parse(readFileSync(new URL("dataset.json", directory), "utf8"));

    expect(source.verifiedThrough).toBe("2026-10-01");
    expect(dataset.verifiedThrough).toBe(source.verifiedThrough);
  });

  it("interdit l’activation d’une extraction OCR", () => {
    expect(() => parseReunionTariffSourceManifest(manifest({ extraction: "ocr" }))).toThrow(/sans OCR/i);
  });
});
