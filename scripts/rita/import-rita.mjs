#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { parseArgs } from "node:util";
import { parseRitaMeasureCsv } from "./rita-csv.mjs";

const OFFICIAL_SOURCE_URL =
  "https://form.douane.gouv.fr/rita-encyclopedie/public/experts/mesures/init.action";

function usage() {
  return "Usage : npm run rita:import -- --file <export.csv> --date AAAA-MM-JJ [--out <dataset.json>]";
}

async function run() {
  const { values } = parseArgs({
    options: {
      file: { type: "string", short: "f" },
      date: { type: "string", short: "d" },
      out: { type: "string", short: "o" },
    },
    strict: true,
  });

  if (!values.file || !values.date) throw new Error(usage());

  const inputPath = resolve(values.file);
  const outputPath = resolve(values.out ?? "src/data/rita-tariffs.generated.json");
  const sourceFileName = basename(inputPath);
  const sourceBytes = await readFile(inputPath);
  const sourceText = sourceBytes.toString("utf8");
  if (/synthetic|synthétique|synthetique/i.test(`${sourceFileName}\n${sourceText}`)) {
    throw new Error(
      "Une fixture synthétique ne peut pas être importée comme référentiel officiel RITA.",
    );
  }
  const sourceSha256 = createHash("sha256").update(sourceBytes).digest("hex");
  const parsed = parseRitaMeasureCsv(sourceText, {
    referenceDate: values.date,
    sourceFileName,
    sourceUrl: OFFICIAL_SOURCE_URL,
  });

  if (parsed.issues.length > 0) {
    for (const issue of parsed.issues) {
      process.stderr.write(`Ligne ${issue.line} [${issue.code}] : ${issue.message}\n`);
    }
    throw new Error(
      `${parsed.issues.length} ligne(s) non comprise(s) : aucun dataset n’a été écrit.`,
    );
  }
  if (parsed.measures.length === 0) {
    throw new Error("Aucune mesure OM/OMR exploitable : aucun dataset n’a été écrit.");
  }

  const dataset = {
    schemaVersion: 1,
    datasetId: `rita-reunion-${values.date}-${sourceSha256.slice(0, 12)}`,
    territory: "REUNION",
    source: "RITA",
    sourceReferenceDate: values.date,
    sourceFileName,
    sourceSha256,
    measures: parsed.measures,
  };
  const bundle = { schemaVersion: 1, availability: "official-import", dataset };

  await writeFile(outputPath, `${JSON.stringify(bundle, null, 2)}\n`, "utf8");
  process.stdout.write(
    `${parsed.measures.length} mesure(s) importée(s) depuis ${sourceFileName} vers ${outputPath}.\n`,
  );
}

run().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
