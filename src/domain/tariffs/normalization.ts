const NOMENCLATURE_LENGTHS = new Set([2, 4, 6, 8, 10]);
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export class TariffInputError extends TypeError {}

export function normalizeNomenclatureCode(input: string): string {
  const normalized = input.replace(/[\s\u00a0\u202f]/g, "");

  if (!/^\d+$/.test(normalized) || !NOMENCLATURE_LENGTHS.has(normalized.length)) {
    throw new TariffInputError(
      "La nomenclature doit contenir exactement 2, 4, 6, 8 ou 10 chiffres, avec ou sans espaces.",
    );
  }

  return normalized;
}

export function normalizeIsoDate(input: string): string {
  const value = input.trim();
  const match = ISO_DATE_PATTERN.exec(value);

  if (!match) {
    throw new TariffInputError("La date de référence doit respecter le format AAAA-MM-JJ.");
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new TariffInputError("La date de référence n’existe pas.");
  }

  return value;
}
