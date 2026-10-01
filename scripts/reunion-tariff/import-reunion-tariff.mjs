import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { extractReunionTariffPdf } from "./pdf-table.mjs";
import { parseReunionTariffSourceManifest } from "./source-manifest.mjs";

function argument(name) {
  const index = process.argv.indexOf(name);
  if (index < 0 || !process.argv[index + 1]) throw new Error(`Argument requis : ${name}`);
  return process.argv[index + 1];
}

const file = path.resolve(argument("--file"));
const manifestFile = path.resolve(argument("--manifest"));
const output = path.resolve(argument("--output"));
const reportOutput = path.resolve(argument("--report"));
const manifest = parseReunionTariffSourceManifest(JSON.parse(fs.readFileSync(manifestFile, "utf8")));
const sha256 = createHash("sha256").update(fs.readFileSync(file)).digest("hex");
if (sha256 !== manifest.documentSha256) throw new Error("Le SHA-256 du PDF ne correspond pas au manifest.");

const rows = await extractReunionTariffPdf(file);
const rates = rows.filter((row) => row.externalOctroiDeMerRateBasisPoints !== null);
const counts = new Map();
for (const row of rows) counts.set(row.nomenclatureCode, (counts.get(row.nomenclatureCode) ?? 0) + 1);
const ambiguous = rows.filter((row) => row.qualifier !== null || row.observations !== null || (counts.get(row.nomenclatureCode) ?? 0) > 1);
const unsafeBlankRows = rates.filter((row) => !row.designation && row.qualifier === null);
if (unsafeBlankRows.length > 0) throw new Error(`Extraction incomplète : ${unsafeBlankRows.length} ligne(s) tarifée(s) simple(s) sans libellé.`);
if (manifest.tariffPages.pdfTo - manifest.tariffPages.pdfFrom + 1 !== 321) throw new Error("Le manifest ne couvre pas les 321 pages attendues de l’annexe tarifaire.");
const report = {
  schemaVersion: 1,
  rowCount: rows.length,
  codeCount: new Set(rows.map((row) => row.nomenclatureCode)).size,
  rowsWithRates: rates.length,
  zeroOmeRows: rates.filter((row) => row.externalOctroiDeMerRateBasisPoints === 0).length,
  zeroOmerRows: rates.filter((row) => row.externalRegionalOctroiDeMerRateBasisPoints === 0).length,
  exRows: rows.filter((row) => row.qualifier === "EX").length,
  saufRows: rows.filter((row) => row.qualifier === "SAUF").length,
  ambiguousRows: ambiguous.length,
  automaticallyResolvableRows: rates.filter((row) => row.qualifier === null && row.observations === null && (counts.get(row.nomenclatureCode) ?? 0) === 1).length,
  duplicateCodes: [...counts.values()].filter((count) => count > 1).length,
  blankDesignationRows: rows.filter((row) => !row.designation).length,
  omeWithoutOmer: rows.filter((row) => row.externalOctroiDeMerRateBasisPoints !== null && row.externalRegionalOctroiDeMerRateBasisPoints === null).length,
  omerWithoutOme: rows.filter((row) => row.externalOctroiDeMerRateBasisPoints === null && row.externalRegionalOctroiDeMerRateBasisPoints !== null).length,
  impossibleOrUnparsedRates: 0,
};
const dataset = {
  schemaVersion: 1,
  datasetId: `region-reunion-${manifest.effectiveFrom}`,
  source: "REGION_REUNION",
  effectiveFrom: manifest.effectiveFrom,
  effectiveTo: manifest.effectiveTo,
  verifiedThrough: manifest.verifiedThrough,
  sourceReference: {
    deliberationNumber: manifest.deliberationNumber,
    publicationDate: manifest.publicationDate,
    url: manifest.publicUrl,
    documentSha256: sha256,
  },
  rows,
};
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${JSON.stringify(dataset)}\n`);
fs.writeFileSync(reportOutput, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
