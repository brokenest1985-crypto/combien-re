"use client";

import { useRef, useState, type FormEvent } from "react";
import { calculateLandedCost, type LandedCostBreakdown } from "@/domain/landed-cost/calculate";
import { formatFiscalRate, parseFiscalRate, type FiscalRate } from "@/domain/landed-cost/fiscal-rate";
import { REUNION_HIGH_TECH_DEMO_PROFILE } from "@/domain/landed-cost/fiscal-profile";
import { formatEuroAmount, parseEuroAmount, ZERO_CENTS, type Cents } from "@/domain/landed-cost/money";
import type { ResolvedTariffLookup } from "@/domain/tariffs/model";
import { TariffLookup } from "./tariff-lookup";

type AmountField = "product" | "shipping" | "insurance" | "carrierFee";
type RateField = "omRate" | "omrRate";
type Field = AmountField | RateField;

const amountFields: ReadonlyArray<{
  name: AmountField;
  label: string;
  placeholder: string;
  optional?: boolean;
}> = [
  { name: "product", label: "Prix du produit HT", placeholder: "100,00" },
  { name: "shipping", label: "Frais de livraison jusqu’à La Réunion", placeholder: "20,00" },
  { name: "insurance", label: "Assurance", placeholder: "0,00", optional: true },
  { name: "carrierFee", label: "Frais transporteur", placeholder: "0,00", optional: true },
];

const rateFields: ReadonlyArray<{ name: RateField; label: string; placeholder: string }> = [
  { name: "omRate", label: "Taux OM", placeholder: "ex. 6,50" },
  { name: "omrRate", label: "Taux OMR", placeholder: "ex. 2,50" },
];

const fieldOrder: readonly Field[] = [
  ...amountFields.map(({ name }) => name),
  ...rateFields.map(({ name }) => name),
];

const initialValues: Record<Field, string> = {
  product: "",
  shipping: "",
  insurance: "",
  carrierFee: "",
  omRate: "",
  omrRate: "",
};

export function CostCalculator() {
  const [values, setValues] = useState<Record<Field, string>>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [calculationError, setCalculationError] = useState<string | null>(null);
  const [result, setResult] = useState<LandedCostBreakdown | null>(null);
  const [automaticTariff, setAutomaticTariff] = useState<ResolvedTariffLookup | null>(null);
  const [tariffLookupRevision, setTariffLookupRevision] = useState(0);
  const inputs = useRef<Partial<Record<Field, HTMLInputElement | null>>>({});

  function calculate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResult(null);
    setCalculationError(null);
    const amounts: Partial<Record<AmountField, Cents>> = {};
    const rates: Partial<Record<RateField, FiscalRate>> = {};
    const nextErrors: Partial<Record<Field, string>> = {};

    for (const { name, optional } of amountFields) {
      try {
        amounts[name] = optional && values[name].trim() === "" ? ZERO_CENTS : parseEuroAmount(values[name]);
      } catch (error) {
        nextErrors[name] = error instanceof Error ? error.message : "Saisie invalide.";
      }
    }
    for (const { name } of rateFields) {
      try {
        rates[name] = parseFiscalRate(values[name]);
      } catch (error) {
        nextErrors[name] = error instanceof Error ? error.message : "Saisie invalide.";
      }
    }

    setErrors(nextErrors);
    const invalidField = fieldOrder.find((name) => nextErrors[name]);
    if (invalidField) {
      inputs.current[invalidField]?.focus();
      return;
    }
    if (
      amounts.product === undefined ||
      amounts.shipping === undefined ||
      amounts.insurance === undefined ||
      amounts.carrierFee === undefined ||
      rates.omRate === undefined ||
      rates.omrRate === undefined
    ) return;

    try {
      setResult(calculateLandedCost({
        goodsValueCents: amounts.product,
        shippingToEntryCents: amounts.shipping,
        insuranceToEntryCents: amounts.insurance,
        postEntryAccessoryCostsCents: ZERO_CENTS,
        carrierFeeCents: amounts.carrierFee,
        octroiDeMerRate: rates.omRate,
        octroiDeMerRegionalRate: rates.omrRate,
        fiscalProfile: REUNION_HIGH_TECH_DEMO_PROFILE,
      }));
    } catch (error) {
      setCalculationError(error instanceof Error ? error.message : "Le calcul n’a pas pu aboutir.");
    }
  }

  function updateValue(name: Field, value: string) {
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
    setCalculationError(null);
    setResult(null);
    if (name === "omRate" || name === "omrRate") {
      setAutomaticTariff(null);
      setTariffLookupRevision((revision) => revision + 1);
    }
  }

  function applyResolvedTariff(tariff: ResolvedTariffLookup) {
    setValues((current) => ({
      ...current,
      omRate: formatFiscalRate(tariff.octroiDeMerRate).replace(" %", ""),
      omrRate: formatFiscalRate(tariff.octroiDeMerRegionalRate).replace(" %", ""),
    }));
    setErrors((current) => ({ ...current, omRate: undefined, omrRate: undefined }));
    setAutomaticTariff(tariff);
    setCalculationError(null);
    setResult(null);
  }

  function invalidateAutomaticTariff() {
    if (automaticTariff === null) return;
    setAutomaticTariff(null);
    setValues((current) => ({ ...current, omRate: "", omrRate: "" }));
    setResult(null);
  }

  return (
    <form onSubmit={calculate} noValidate>
      <TariffLookup
        key={tariffLookupRevision}
        onResolved={applyResolvedTariff}
        onLookupInputChanged={invalidateAutomaticTariff}
      />

      <fieldset>
        <legend>Votre commande</legend>
        <div className="fields">
          {amountFields.map(({ name, label, placeholder, optional }) => (
            <div className="field" key={name}>
              <label htmlFor={name}>{label}{optional && <span className="optional"> optionnel</span>}</label>
              <div className="input-wrap">
                <input
                  ref={(element) => { inputs.current[name] = element; }}
                  id={name}
                  name={name}
                  type="text"
                  inputMode="decimal"
                  required={!optional}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder={placeholder}
                  value={values[name]}
                  aria-invalid={Boolean(errors[name])}
                  aria-describedby={errors[name] ? `${name}-error amount-hint` : "amount-hint"}
                  onChange={(event) => updateValue(name, event.target.value)}
                />
                <span className="currency" aria-hidden="true">€</span>
              </div>
              {errors[name] && <p className="field-error" id={`${name}-error`} role="alert">{errors[name]}</p>}
            </div>
          ))}
        </div>
        <p id="amount-hint" className="hint">Montants en euros. Les champs optionnels laissés vides valent 0 €.</p>
      </fieldset>

      <fieldset className="fiscal-fields">
        <legend>Configuration fiscale expérimentale</legend>
        <div className="vat-rate" aria-label="Taux de TVA appliqué">
          <span>TVA Réunion</span>
          <strong>{formatFiscalRate(REUNION_HIGH_TECH_DEMO_PROFILE.vatRate)}</strong>
        </div>
        <p className="experimental-notice" id="manual-rate-notice">
          Mode expérimental — les taux d’octroi de mer sont saisis manuellement et ne constituent pas encore un tarif automatique officiel.
        </p>
        {automaticTariff ? (
          <p className="automatic-rate-note">
            Taux renseignés depuis RITA pour la nomenclature {automaticTariff.nomenclatureCode} au {automaticTariff.referenceDate}. Toute modification manuelle retire cette traçabilité.
          </p>
        ) : null}
        <div className="fields rate-fields">
          {rateFields.map(({ name, label, placeholder }) => (
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
                  aria-describedby={errors[name] ? `${name}-error manual-rate-notice` : "manual-rate-notice"}
                  onChange={(event) => updateValue(name, event.target.value)}
                />
                <span className="currency" aria-hidden="true">%</span>
              </div>
              {errors[name] && <p className="field-error" id={`${name}-error`} role="alert">{errors[name]}</p>}
            </div>
          ))}
        </div>
      </fieldset>

      <button type="submit">Calculer l’estimation <span aria-hidden="true">→</span></button>
      {calculationError && <p className="field-error" role="alert">{calculationError}</p>}

      <div className={`result${result ? " result-ready" : ""}`}>
        {!result ? (
          <p role="status">Votre estimation détaillée s’affichera ici.</p>
        ) : (
          <>
            <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
              Coût total estimé rendu : {formatEuroAmount(result.totalLandedCostCents)}
            </p>
            <ResultBreakdown result={result} />
          </>
        )}
      </div>
    </form>
  );
}

function ResultBreakdown({ result }: Readonly<{ result: LandedCostBreakdown }>) {
  const rows: ReadonlyArray<{ label: string; value: Cents; kind?: "tax" }> = [
    { label: "Prix du produit HT", value: result.goodsValueCents },
    { label: "Transport", value: result.shippingToEntryCents },
    { label: "Assurance", value: result.insuranceToEntryCents },
    { label: "Valeur en douane", value: result.customsValueCents },
    { label: `Octroi de mer (${formatFiscalRate(result.ratesUsed.octroiDeMer)})`, value: result.octroiDeMerCents, kind: "tax" },
    { label: `Octroi de mer régional (${formatFiscalRate(result.ratesUsed.octroiDeMerRegional)})`, value: result.octroiDeMerRegionalCents, kind: "tax" },
    { label: `TVA Réunion (${formatFiscalRate(result.ratesUsed.vat)})`, value: result.vatCents, kind: "tax" },
    { label: "Frais privés du transporteur", value: result.carrierFeeCents },
  ];

  return (
    <section className="breakdown" aria-labelledby="result-title">
      <div className="result-heading">
        <div>
          <p className="result-kicker">Estimation V0.2b1</p>
          <h2 id="result-title">Détail du coût rendu</h2>
        </div>
        {result.exemptionApplied && <span className="exemption-badge">Franchise ≤ 22 € appliquée</span>}
      </div>

      <dl className="cost-lines">
        {rows.map(({ label, value, kind }) => (
          <div key={label} className={kind === "tax" ? "tax-line" : undefined}>
            <dt>{label}</dt>
            <dd>{formatEuroAmount(value)}</dd>
          </div>
        ))}
        <div className="total-line">
          <dt>Coût total estimé rendu</dt>
          <dd>{formatEuroAmount(result.totalLandedCostCents)}</dd>
        </div>
      </dl>

      <details>
        <summary>Contrôler les bases de calcul</summary>
        <dl className="calculation-bases">
          <div><dt>Valeur intrinsèque (seuil de franchise)</dt><dd>{formatEuroAmount(result.goodsValueCents)}</dd></div>
          <div><dt>Base OM et OMR : valeur en douane</dt><dd>{formatEuroAmount(result.customsValueCents)}</dd></div>
          <div><dt>Frais accessoires postérieurs à l’entrée intégrés à la TVA</dt><dd>{formatEuroAmount(result.postEntryAccessoryCostsCents)}</dd></div>
          <div><dt>Base TVA, hors OM et OMR</dt><dd>{formatEuroAmount(result.vatBaseCents)}</dd></div>
        </dl>
        <p className="base-note">Valeur en douane = produit + transport + assurance. Base TVA = valeur en douane + frais accessoires postérieurs à l’entrée. OM et OMR en sont exclus.</p>
        <p className="profile-note">Profil {result.fiscalProfileId} · date de référence {result.fiscalProfileReferenceDate} · arrondi provisoire au centime le plus proche, demi-centime vers le haut.</p>
      </details>
    </section>
  );
}
