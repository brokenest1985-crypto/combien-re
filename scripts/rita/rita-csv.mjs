const REQUIRED_FIELDS = Object.freeze({
  nomenclatureCode: ["NOMENCLATURE", "CODE_NOMENCLATURE", "NOMENCLATURE_CODE", "CODE_NC_TARIC"],
  measureTypeCode: ["TYPE_MESURE", "CODE_TYPE_MESURE", "MESURE", "MEASURE_TYPE_CODE"],
  taxCode: ["CODE_TAXE", "TAX_CODE"],
  rate: ["TAUX", "TAUX_POURCENTAGE", "RATE", "RATE_PERCENT"],
  territory: ["TERRITOIRE", "TERRITOIRE_APPLICATION", "TERRITORY"],
  validFrom: ["DATE_DEBUT", "DEBUT_VALIDITE", "VALID_FROM"],
  validTo: ["DATE_FIN", "FIN_VALIDITE", "VALID_TO"],
  additionalCode: ["CODE_ADDITIONNEL", "ADDITIONAL_CODE"],
  conditionCode: ["CODE_CONDITION", "CONDITION", "CONDITION_CODE"],
});

const OPTIONAL_FIELDS = Object.freeze({
  sourceReference: ["REFERENCE", "REFERENCE_SOURCE", "SOURCE_REFERENCE"],
});

export class RitaCsvError extends TypeError {}

function normalizeHeader(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function parseDelimited(text, delimiter) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  let line = 1;
  let rowLine = 1;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (inQuotes && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (character === delimiter && !inQuotes) {
      row.push(field);
      field = "";
      continue;
    }
    if ((character === "\n" || character === "\r") && !inQuotes) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(field);
      if (row.some((value) => value.trim() !== "")) rows.push({ line: rowLine, fields: row });
      row = [];
      field = "";
      line += 1;
      rowLine = line;
      continue;
    }
    if (character === "\n") line += 1;
    field += character;
  }

  if (inQuotes) throw new RitaCsvError(`Champ CSV entre guillemets non fermé à la ligne ${rowLine}.`);
  row.push(field);
  if (row.some((value) => value.trim() !== "")) rows.push({ line: rowLine, fields: row });
  return rows;
}

function parseRows(input) {
  const text = input.replace(/^\uFEFF/, "");
  const semicolonRows = parseDelimited(text, ";");
  const commaRows = parseDelimited(text, ",");
  const semicolonColumns = semicolonRows[0]?.fields.length ?? 0;
  const commaColumns = commaRows[0]?.fields.length ?? 0;

  if (semicolonColumns <= 1 && commaColumns <= 1) {
    throw new RitaCsvError("Le fichier ne contient pas un en-tête CSV structuré.");
  }
  return semicolonColumns >= commaColumns
    ? { rows: semicolonRows, delimiter: ";" }
    : { rows: commaRows, delimiter: "," };
}

function resolveHeaders(headers) {
  const normalized = headers.map(normalizeHeader);
  if (new Set(normalized).size !== normalized.length) {
    throw new RitaCsvError("L’en-tête contient des colonnes dupliquées après normalisation.");
  }

  const result = {};
  for (const [field, aliases] of Object.entries(REQUIRED_FIELDS)) {
    const index = normalized.findIndex((header) => aliases.includes(header));
    if (index < 0) {
      throw new RitaCsvError(`Colonne RITA requise absente pour ${field} (${aliases.join(" ou ")}).`);
    }
    result[field] = index;
  }
  for (const [field, aliases] of Object.entries(OPTIONAL_FIELDS)) {
    result[field] = normalized.findIndex((header) => aliases.includes(header));
  }

  return { indexes: result, normalizedHeaders: normalized };
}

function normalizeNomenclature(value) {
  const normalized = value.replace(/[\s\u00a0\u202f]/g, "");
  if (!/^\d+$/.test(normalized) || ![2, 4, 6, 8, 10].includes(normalized.length)) {
    throw new RitaCsvError("nomenclature invalide : 2, 4, 6, 8 ou 10 chiffres attendus");
  }
  return normalized;
}

function normalizeDate(value, allowEmpty = false) {
  const trimmed = value.trim();
  if (allowEmpty && trimmed === "") return null;
  let year;
  let month;
  let day;
  let match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (match) {
    [, year, month, day] = match;
  } else {
    match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);
    if (!match) throw new RitaCsvError("date invalide : AAAA-MM-JJ ou JJ/MM/AAAA attendu");
    [, day, month, year] = match;
  }
  const iso = `${year}-${month}-${day}`;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (
    date.getUTCFullYear() !== Number(year) ||
    date.getUTCMonth() !== Number(month) - 1 ||
    date.getUTCDate() !== Number(day)
  ) throw new RitaCsvError("date inexistante");
  return iso;
}

function parseBasisPoints(value) {
  const normalized = value.trim().replace(/[\s\u00a0\u202f%]/g, "").replace(",", ".");
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) {
    throw new RitaCsvError("taux invalide : deux décimales de pourcentage maximum");
  }
  const [percentage, decimals = ""] = normalized.split(".");
  const basisPoints = Number(`${percentage}${decimals.padEnd(2, "0")}`);
  if (!Number.isSafeInteger(basisPoints)) throw new RitaCsvError("taux hors limite entière sûre");
  return basisPoints;
}

function measureType(typeCode) {
  if (typeCode === "OEA" || typeCode === "OEB") return "octroi-de-mer";
  if (typeCode === "ORA" || typeCode === "ORB") return "octroi-de-mer-regional";
  throw new RitaCsvError(`type de mesure inconnu : ${typeCode || "(vide)"}`);
}

function territory(value) {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s_-]/g, "")
    .toUpperCase();
  if (normalized !== "REUNI" && normalized !== "REUNION" && normalized !== "LAREUNION") {
    throw new RitaCsvError(`territoire non pris en charge : ${value || "(vide)"}`);
  }
  return "REUNION";
}

function optionalValue(value) {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function requiredValue(value, label) {
  const trimmed = value.trim();
  if (trimmed === "") throw new RitaCsvError(`${label} vide`);
  return trimmed;
}

export function parseRitaMeasureCsv(input, options) {
  const { rows, delimiter } = parseRows(input);
  if (rows.length < 2) throw new RitaCsvError("Le fichier CSV ne contient aucune ligne de mesure.");

  const headerRow = rows[0];
  const { indexes, normalizedHeaders } = resolveHeaders(headerRow.fields);
  const referenceDate = normalizeDate(options.referenceDate);
  const measures = [];
  const issues = [];

  for (const row of rows.slice(1)) {
    const rawFields = Object.fromEntries(
      normalizedHeaders.map((header, index) => [header, row.fields[index] ?? ""]),
    );
    if (row.fields.length !== headerRow.fields.length) {
      issues.push({
        line: row.line,
        code: "invalid-column-count",
        message: `${headerRow.fields.length} colonnes attendues, ${row.fields.length} reçues.`,
        rawFields,
      });
      continue;
    }

    try {
      const typeCode = row.fields[indexes.measureTypeCode].trim().toUpperCase();
      const validFrom = normalizeDate(row.fields[indexes.validFrom]);
      const validTo = normalizeDate(row.fields[indexes.validTo], true);
      if (validTo !== null && validTo < validFrom) {
        throw new RitaCsvError("date de fin antérieure à la date de début");
      }
      const referenceIndex = indexes.sourceReference;
      const sourceReference = referenceIndex >= 0 ? row.fields[referenceIndex].trim() : "";

      measures.push({
        nomenclatureCode: normalizeNomenclature(row.fields[indexes.nomenclatureCode]),
        measureType: measureType(typeCode),
        measureTypeCode: typeCode,
        taxCode: requiredValue(row.fields[indexes.taxCode], "code taxe"),
        rateBasisPoints: parseBasisPoints(row.fields[indexes.rate]),
        territory: territory(row.fields[indexes.territory]),
        validFrom,
        validTo,
        additionalCode: optionalValue(row.fields[indexes.additionalCode]),
        conditionCode: optionalValue(row.fields[indexes.conditionCode]),
        source: {
          name: "RITA",
          url: options.sourceUrl,
          referenceDate,
          reference: sourceReference || `${options.sourceFileName}:ligne-${row.line}`,
          sourceLine: row.line,
          rawFields,
        },
      });
    } catch (error) {
      issues.push({
        line: row.line,
        code: "unsupported-row",
        message: error instanceof Error ? error.message : "Ligne non comprise.",
        rawFields,
      });
    }
  }

  measures.sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right), "fr"));
  return { measures, issues, delimiter };
}
