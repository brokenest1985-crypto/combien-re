import { centsFromInteger, type Cents } from "./money";

declare const fiscalRateBrand: unique symbol;

/** Taux exact en points de base : 1 point de base = 0,01 %. */
export type FiscalRate = Readonly<{
  basisPoints: number;
  readonly [fiscalRateBrand]: true;
}>;

export type FiscalRoundingStrategy = "nearest-cent-half-up";

export function fiscalRateFromBasisPoints(basisPoints: number): FiscalRate {
  if (!Number.isSafeInteger(basisPoints) || basisPoints < 0) {
    throw new RangeError("Le taux doit être un nombre entier positif ou nul de points de base.");
  }

  return Object.freeze({ basisPoints }) as FiscalRate;
}

/** Conversion textuelle exacte, limitée au centième de pourcentage. */
export function parseFiscalRate(input: string): FiscalRate {
  const value = input.trim();

  if (value.startsWith("-")) {
    throw new RangeError("Le taux ne peut pas être négatif.");
  }
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(value)) {
    throw new TypeError("Saisissez un taux valide, avec au maximum deux décimales (ex. : 8,50).");
  }

  const [percentage, decimals = ""] = value.split(/[.,]/);
  const basisPoints = Number(`${percentage}${decimals.padEnd(2, "0")}`);

  return fiscalRateFromBasisPoints(basisPoints);
}

export function formatFiscalRate(rate: FiscalRate): string {
  const basisPoints = fiscalRateFromBasisPoints(rate.basisPoints).basisPoints;
  const digits = String(basisPoints).padStart(3, "0");
  const percentage = digits.slice(0, -2);
  const decimals = digits.slice(-2).replace(/0+$/, "");

  return `${percentage}${decimals ? `,${decimals}` : ""} %`;
}

/**
 * Arrondi centralisé au centime le plus proche, les demi-centimes vers le haut.
 * Cette stratégie est déterministe mais reste provisoire sur le plan fiscal.
 */
export function applyFiscalRate(
  baseCents: Cents,
  rate: FiscalRate,
  strategy: FiscalRoundingStrategy,
): Cents {
  const base = BigInt(centsFromInteger(baseCents));
  const basisPoints = BigInt(fiscalRateFromBasisPoints(rate.basisPoints).basisPoints);
  const denominator = 10_000n;
  const rawNumerator = base * basisPoints;
  const quotient = rawNumerator / denominator;
  const remainder = rawNumerator % denominator;

  let rounded: bigint;
  switch (strategy) {
    case "nearest-cent-half-up":
      rounded = quotient + (remainder * 2n >= denominator ? 1n : 0n);
      break;
    default: {
      const exhaustiveCheck: never = strategy;
      throw new TypeError(`Stratégie d'arrondi inconnue : ${String(exhaustiveCheck)}`);
    }
  }

  if (rounded > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new RangeError("Le montant fiscal calculé dépasse la limite des entiers sûrs.");
  }

  return centsFromInteger(Number(rounded));
}
