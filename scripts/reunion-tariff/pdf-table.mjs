import fs from "node:fs";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

export class ReunionTariffImportError extends Error {}

export function parseRateBasisPoints(value) {
  const normalized = value.trim().replace(/\s+/g, "");
  const match = /^(\d+)(?:,(\d{1,2}))?%$/.exec(normalized);
  if (!match) throw new ReunionTariffImportError(`Taux illisible : ${value}`);
  const basisPoints = Number(`${match[1]}${(match[2] ?? "").padEnd(2, "0")}`);
  if (!Number.isSafeInteger(basisPoints) || basisPoints > 20_000) {
    throw new ReunionTariffImportError(`Taux impossible : ${value}`);
  }
  return basisPoints;
}

export function normalizePublishedCode(value) {
  const compact = value.trim().replace(/\s+/g, " ").toUpperCase();
  const qualifier = compact.startsWith("EX ") ? "EX" : compact.startsWith("SAUF ") ? "SAUF" : null;
  const code = compact.replace(/^(?:EX|SAUF)\s+/, "").replace(/^CHAP(?:ITRE)?\s+/, "").replace(/\s/g, "");
  if (!/^\d{1,10}$/.test(code) || ![1, 2, 4, 6, 8, 10].includes(code.length)) {
    throw new ReunionTariffImportError(`Code NC illisible : ${value}`);
  }
  return { publishedCode: compact, nomenclatureCode: code.padStart(code.length === 1 ? 2 : code.length, "0"), qualifier };
}

function join(items) {
  return items.sort((a, b) => b.y - a.y || a.x - b.x).map((item) => item.text.trim()).filter(Boolean).join(" ").replace(/\s+/g, " ").replace(/(\p{L}) - (\p{Ll})/gu, "$1$2").trim();
}

function leftAnchors(items) {
  const left = items.filter((item) => item.x < 89 && item.y > 32 && item.y < 765);
  const groups = [];
  for (const item of left.sort((a, b) => b.y - a.y || a.x - b.x)) {
    const group = groups.find((candidate) => Math.abs(candidate.y - item.y) <= 0.6);
    if (group) group.items.push(item);
    else groups.push({ y: item.y, items: [item] });
  }
  return groups.map(({ y, items: groupItems }) => ({ y, raw: groupItems.sort((a, b) => a.x - b.x).map((item) => item.text).join(" ").replace(/\s+/g, " ").trim() }))
    .filter(({ raw }) => /^(?:(?:EX|SAUF)\s+)?\d{2}(?:\s?\d{2}){0,4}$/i.test(raw) || /^(?:EX\s+)?CHAP(?:ITRE)?\s+\d{1,2}$/i.test(raw));
}

export function extractRowsFromPage(rawItems, sourcePage) {
  const items = rawItems.filter((item) => item.text.trim());
  const anchors = leftAnchors(items);
  const located = anchors.map((anchor, index) => {
    const nextY = anchors[index + 1]?.y ?? 32;
    const ome = items.filter((item) => item.x >= 317 && item.x < 350 && /%/.test(item.text) && item.y <= anchor.y + 4 && item.y > nextY + 1);
    const omer = items.filter((item) => item.x >= 350 && item.x < 380 && /%/.test(item.text) && item.y <= anchor.y + 4 && item.y > nextY + 1);
    if (ome.length > 1 || omer.length > 1) throw new ReunionTariffImportError(`Plusieurs taux dans une ligne, page ${sourcePage}, code ${anchor.raw}.`);
    if ((ome.length === 0) !== (omer.length === 0)) throw new ReunionTariffImportError(`Ligne externe incomplète, page ${sourcePage}, code ${anchor.raw}.`);
    const rateY = ome[0]?.y ?? anchor.y;
    return { ...anchor, ome, omer, top: Math.min(765, anchor.y + (ome[0] ? Math.max(1, anchor.y - rateY) + 1 : 4.5)) };
  });
  return located.map((anchor, index) => {
    const lower = located[index + 1]?.top ?? 32;
    const region = items.filter((item) => item.y <= anchor.top && item.y > lower);
    const code = normalizePublishedCode(anchor.raw);
    const designation = join(region.filter((item) => item.x >= 89 && item.x < 317));
    const listCondition = join(region.filter((item) => item.x >= 445 && item.x < 480 && !/^[AB]$/.test(item.text.trim())));
    const observationCell = join(region.filter((item) => item.x >= 480));
    const observations = [listCondition, observationCell].filter(Boolean).join(" · ");
    return {
      ...code,
      qualifier: code.qualifier ?? (/\bSAUF\b/i.test(listCondition) ? "SAUF" : null),
      nomenclatureLevel: code.nomenclatureCode.length,
      designation,
      externalOctroiDeMerRateBasisPoints: anchor.ome[0] ? parseRateBasisPoints(anchor.ome[0].text) : null,
      externalRegionalOctroiDeMerRateBasisPoints: anchor.omer[0] ? parseRateBasisPoints(anchor.omer[0].text) : null,
      observations: observations || null,
      sourcePage,
    };
  });
}

export async function extractReunionTariffPdf(file) {
  const data = new Uint8Array(fs.readFileSync(file));
  const document = await pdfjs.getDocument({ data, verbosity: 0, useSystemFonts: true }).promise;
  const tariffPages = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = content.items.map((item) => item.str).join(" ");
    const label = /Page\s+(\d+)\s+de\s+321/.exec(text);
    if (!text.includes("TARIF GENERAL D'OCTROI DE MER ET D'OCTROI DE MER REGIONAL") || !label) continue;
    tariffPages.push({
      pageNumber,
      label: Number(label[1]),
      items: content.items.map((item) => ({ text: item.str, x: item.transform[4], y: item.transform[5] })),
    });
  }
  if (tariffPages.length !== 321 || tariffPages.some((page, index) => page.label !== index + 1)) {
    throw new ReunionTariffImportError(`Annexe tarifaire incomplète : ${tariffPages.length}/321 pages détectées.`);
  }
  return tariffPages.flatMap((page) => extractRowsFromPage(page.items, page.pageNumber));
}
