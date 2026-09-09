declare const centsBrand: unique symbol;

/** Un montant EUR en centimes entiers, positif ou nul et sûr pour JavaScript. */
export type Cents = number & { readonly [centsBrand]: true };

export function centsFromInteger(value: number): Cents {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError("Le montant doit être un entier de centimes positif ou nul, dans la limite autorisée.");
  }
  return value as Cents;
}

/** Conversion textuelle : ne passe jamais par un nombre décimal en euros. */
export function parseEuroAmount(input: string): Cents {
  const value = input.trim();

  if (value.startsWith("-")) {
    throw new RangeError("Le montant ne peut pas être négatif.");
  }
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(value)) {
    throw new TypeError("Saisissez un montant valide, avec au maximum deux décimales (ex. : 19,90).");
  }

  const [euros, decimals = ""] = value.split(/[.,]/);
  const cents = Number(`${euros}${decimals.padEnd(2, "0")}`);
  if (!Number.isSafeInteger(cents)) {
    throw new RangeError("Ce montant est trop élevé.");
  }
  return centsFromInteger(cents);
}

/** Format français exact, sans division décimale ni arrondi. */
export function formatEuroAmount(amount: Cents): string {
  const digits = String(centsFromInteger(amount)).padStart(3, "0");
  return `${digits.slice(0, -2)},${digits.slice(-2)} €`;
}
