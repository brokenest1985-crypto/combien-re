const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const SHA_256 = /^[a-f0-9]{64}$/;

export class ReunionTariffManifestError extends TypeError {}

function object(value, label) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ReunionTariffManifestError(`${label} doit être un objet.`);
  }
  return value;
}

function text(value, label) {
  if (typeof value !== "string" || !value.trim()) {
    throw new ReunionTariffManifestError(`${label} doit être une chaîne non vide.`);
  }
  return value;
}

function date(value, label) {
  const result = text(value, label);
  if (!ISO_DATE.test(result) || Number.isNaN(Date.parse(`${result}T00:00:00Z`))) {
    throw new ReunionTariffManifestError(`${label} doit être une date ISO valide.`);
  }
  return result;
}

function positiveInteger(value, label) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new ReunionTariffManifestError(`${label} doit être un entier sûr strictement positif.`);
  }
  return value;
}

function officialUrl(value) {
  const result = text(value, "publicUrl");
  let parsed;
  try {
    parsed = new URL(result);
  } catch {
    throw new ReunionTariffManifestError("publicUrl doit être une URL valide.");
  }
  if (parsed.protocol !== "https:" || !(parsed.hostname === "regionreunion.com" || parsed.hostname.endsWith(".regionreunion.com"))) {
    throw new ReunionTariffManifestError("publicUrl doit appartenir au domaine officiel regionreunion.com.");
  }
  return result;
}

export function parseReunionTariffSourceManifest(value) {
  const manifest = object(value, "manifest");
  const pages = object(manifest.tariffPages, "tariffPages");
  const effectiveFrom = date(manifest.effectiveFrom, "effectiveFrom");
  const effectiveTo = manifest.effectiveTo === null ? null : date(manifest.effectiveTo, "effectiveTo");
  const verifiedThrough = date(manifest.verifiedThrough, "verifiedThrough");

  if (manifest.schemaVersion !== 1) throw new ReunionTariffManifestError("schemaVersion doit valoir 1.");
  if (text(manifest.institution, "institution") !== "Conseil régional de La Réunion") {
    throw new ReunionTariffManifestError("L’institution source n’est pas reconnue.");
  }
  if (!/^DCP\d{4}_\d{4}$/.test(text(manifest.deliberationNumber, "deliberationNumber"))) {
    throw new ReunionTariffManifestError("Numéro de délibération invalide.");
  }
  if (!SHA_256.test(text(manifest.documentSha256, "documentSha256"))) {
    throw new ReunionTariffManifestError("SHA-256 du document invalide.");
  }
  if (effectiveTo !== null && effectiveTo < effectiveFrom) {
    throw new ReunionTariffManifestError("effectiveTo précède effectiveFrom.");
  }
  if (verifiedThrough < effectiveFrom) {
    throw new ReunionTariffManifestError("verifiedThrough précède effectiveFrom.");
  }
  if (manifest.extraction !== "native-pdf-text-no-ocr") {
    throw new ReunionTariffManifestError("Seule l’extraction native sans OCR peut être activée.");
  }
  if (manifest.verificationStatus !== `verified-current-through-${verifiedThrough}`) {
    throw new ReunionTariffManifestError("Le statut de vérification est incohérent.");
  }

  return Object.freeze({
    schemaVersion: 1,
    institution: manifest.institution,
    publicUrl: officialUrl(manifest.publicUrl),
    deliberationNumber: manifest.deliberationNumber,
    sessionDate: date(manifest.sessionDate, "sessionDate"),
    publicationDate: date(manifest.publicationDate, "publicationDate"),
    effectiveFrom,
    effectiveTo,
    retrievedAt: date(manifest.retrievedAt, "retrievedAt"),
    documentSha256: manifest.documentSha256,
    documentName: text(manifest.documentName, "documentName"),
    tariffPages: Object.freeze({
      pdfFrom: positiveInteger(pages.pdfFrom, "tariffPages.pdfFrom"),
      pdfTo: positiveInteger(pages.pdfTo, "tariffPages.pdfTo"),
      annex: text(pages.annex, "tariffPages.annex"),
    }),
    verificationStatus: manifest.verificationStatus,
    verifiedThrough,
    supersededDeliberation: manifest.supersededDeliberation === null ? null : text(manifest.supersededDeliberation, "supersededDeliberation"),
    extraction: manifest.extraction,
  });
}
