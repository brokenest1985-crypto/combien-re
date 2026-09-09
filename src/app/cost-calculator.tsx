"use client";

import { useRef, useState, type FormEvent } from "react";
import { calculateLandedCost, formatEuroAmount, parseEuroAmount, type Cents } from "@/domain/landed-cost";

type Field = "product" | "shipping";
const fields: ReadonlyArray<{ name: Field; label: string; placeholder: string }> = [
  { name: "product", label: "Prix du produit", placeholder: "100,00" },
  { name: "shipping", label: "Frais de livraison", placeholder: "20,00" },
];

export function CostCalculator() {
  const [values, setValues] = useState<Record<Field, string>>({ product: "", shipping: "" });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [calculationError, setCalculationError] = useState<string | null>(null);
  const [total, setTotal] = useState<Cents | null>(null);
  const inputs = useRef<Partial<Record<Field, HTMLInputElement | null>>>({});

  function calculate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTotal(null);
    setCalculationError(null);
    const parsed: Partial<Record<Field, Cents>> = {};
    const nextErrors: Partial<Record<Field, string>> = {};

    for (const { name } of fields) {
      try {
        parsed[name] = parseEuroAmount(values[name]);
      } catch (error) {
        nextErrors[name] = error instanceof Error ? error.message : "Saisie invalide.";
      }
    }
    setErrors(nextErrors);
    const invalidField = fields.find(({ name }) => nextErrors[name]);
    if (invalidField) {
      inputs.current[invalidField.name]?.focus();
      return;
    }
    if (parsed.product === undefined || parsed.shipping === undefined) return;

    try {
      setTotal(calculateLandedCost({ productPriceCents: parsed.product, shippingCostCents: parsed.shipping }).totalCents);
    } catch (error) {
      setCalculationError(error instanceof Error ? error.message : "Le calcul n’a pas pu aboutir.");
    }
  }

  return (
    <form onSubmit={calculate} noValidate>
      <div className="fields">
        {fields.map(({ name, label, placeholder }) => (
          <div className="field" key={name}>
            <label htmlFor={name}>{label}</label>
            <div className="input-wrap">
              <input
                ref={(element) => { inputs.current[name] = element; }}
                id={name}
                name={name}
                type="text"
                inputMode="decimal"
                required
                autoComplete="off"
                spellCheck={false}
                placeholder={placeholder}
                value={values[name]}
                aria-invalid={Boolean(errors[name])}
                aria-describedby={errors[name] ? `${name}-error amount-hint` : "amount-hint"}
                onChange={(event) => {
                  setValues({ ...values, [name]: event.target.value });
                  setErrors({ ...errors, [name]: undefined });
                  setCalculationError(null);
                  setTotal(null);
                }}
              />
              <span className="currency" aria-hidden="true">€</span>
            </div>
            {errors[name] && <p className="field-error" id={`${name}-error`} role="alert">{errors[name]}</p>}
          </div>
        ))}
      </div>
      <p id="amount-hint" className="hint">Montants en euros. Livraison offerte ? Saisissez 0.</p>
      <button type="submit">Calculer <span aria-hidden="true">→</span></button>
      {calculationError && <p className="field-error" role="alert">{calculationError}</p>}
      <div className={`result${total !== null ? " result-ready" : ""}`} role="status" aria-live="polite" aria-atomic="true">
        {total === null ? <p>Votre coût provisoire s’affichera ici.</p> : <p>Coût provisoire rendu : <strong>{formatEuroAmount(total)}</strong></p>}
      </div>
    </form>
  );
}
