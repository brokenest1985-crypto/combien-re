"use client";

import { useState } from "react";
import tariffBundle from "@/data/rita-tariffs.generated.json";
import { formatFiscalRate } from "@/domain/landed-cost/fiscal-rate";
import { parseTariffDatasetBundle } from "@/domain/tariffs/dataset";
import { lookupReunionTariffs } from "@/domain/tariffs/lookup";
import type { ResolvedTariffLookup, TariffLookupResult } from "@/domain/tariffs/model";

const datasetAvailability = parseTariffDatasetBundle(tariffBundle);

type TariffLookupProps = Readonly<{
  onResolved: (result: ResolvedTariffLookup) => void;
  onLookupInputChanged: () => void;
}>;

export function TariffLookup({ onResolved, onLookupInputChanged }: TariffLookupProps) {
  const [nomenclatureCode, setNomenclatureCode] = useState("");
  const [referenceDate, setReferenceDate] = useState("2026-09-09");
  const [result, setResult] = useState<TariffLookupResult | null>(null);

  function searchTariffs() {
    if (datasetAvailability.status !== "available") return;
    const nextResult = lookupReunionTariffs({
      nomenclatureCode,
      referenceDate,
      dataset: datasetAvailability.dataset,
    });
    setResult(nextResult);
    if (nextResult.status === "resolved") onResolved(nextResult);
  }

  return (
    <section className="tariff-lookup" aria-labelledby="tariff-lookup-title">
      <div className="section-heading">
        <div>
          <p className="section-kicker">V0.2b1 · RITA</p>
          <h2 id="tariff-lookup-title">Recherche tarifaire</h2>
        </div>
        <span className={`dataset-status dataset-${datasetAvailability.status}`}>
          {datasetAvailability.status === "available" ? "Référentiel chargé" : "Référentiel indisponible"}
        </span>
      </div>

      <div className="fields tariff-fields">
        <div className="field">
          <label htmlFor="nomenclature">Code douanier / nomenclature</label>
          <input
            id="nomenclature"
            name="nomenclature"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            spellCheck={false}
            placeholder="ex. 84 71 30 00 00"
            value={nomenclatureCode}
            aria-describedby="nomenclature-hint"
            onChange={(event) => {
              setNomenclatureCode(event.target.value);
              setResult(null);
              onLookupInputChanged();
            }}
          />
          <p id="nomenclature-hint" className="hint">
            Code NC/TARIC connu — la classification automatique viendra dans une prochaine version.
          </p>
        </div>
        <div className="field">
          <label htmlFor="tariff-date">Date du tarif</label>
          <input
            id="tariff-date"
            name="tariff-date"
            type="date"
            value={referenceDate}
            onChange={(event) => {
              setReferenceDate(event.target.value);
              setResult(null);
              onLookupInputChanged();
            }}
          />
        </div>
      </div>

      <button
        className="secondary-button"
        type="button"
        disabled={datasetAvailability.status !== "available"}
        onClick={searchTariffs}
      >
        Rechercher les taux OM/OMR
      </button>

      {datasetAvailability.status === "unavailable" ? (
        <p className="dataset-message" role="status">
          Recherche automatique désactivée : {datasetAvailability.reason} La saisie manuelle ci-dessous reste disponible.
        </p>
      ) : (
        <LookupResult result={result} />
      )}
    </section>
  );
}

function LookupResult({ result }: Readonly<{ result: TariffLookupResult | null }>) {
  if (result === null) return null;
  if (result.status === "ambiguous") {
    return (
      <div className="lookup-message lookup-warning" role="alert">
        <strong>Statut : ambigu</strong>
        <p>Plusieurs mesures tarifaires sont possibles. Une précision supplémentaire est nécessaire.</p>
        <p>{result.alternatives.length} mesure(s) potentiellement applicable(s) — aucun taux n’a été injecté dans le calcul.</p>
      </div>
    );
  }
  if (result.status === "not-found") {
    return <p className="lookup-message" role="status">Statut : non trouvé. Aucun couple OM/OMR complet n’est applicable à cette date.</p>;
  }
  if (result.status === "unsupported") {
    return <p className="lookup-message lookup-warning" role="alert">Statut : non pris en charge. {result.message}</p>;
  }

  const measures = [result.measures.octroiDeMer, result.measures.octroiDeMerRegional];
  return (
    <div className="lookup-message lookup-resolved" role="status">
      <strong>Statut : résolu</strong>
      <dl className="tariff-result">
        <div><dt>Nomenclature normalisée</dt><dd>{result.nomenclatureCode}</dd></div>
        <div><dt>Taux OM</dt><dd>{formatFiscalRate(result.octroiDeMerRate)}</dd></div>
        <div><dt>Taux OMR</dt><dd>{formatFiscalRate(result.octroiDeMerRegionalRate)}</dd></div>
        <div><dt>Date consultée</dt><dd>{result.referenceDate}</dd></div>
        <div><dt>Date du référentiel</dt><dd>{result.measures.octroiDeMer.source.referenceDate}</dd></div>
      </dl>
      <details className="rate-trace">
        <summary>Pourquoi ce taux ?</summary>
        {measures.map((measure) => (
          <p key={`${measure.measureType}-${measure.taxCode}`}>
            Source RITA · {measure.measureTypeCode} · code taxe {measure.taxCode}
            {measure.additionalCode ? ` · code additionnel ${measure.additionalCode}` : ""}
            {` · ${measure.source.reference}`}
          </p>
        ))}
      </details>
      <p className="indicative-note">Données RITA indicatives : cette résolution n’est pas une liquidation juridiquement opposable.</p>
    </div>
  );
}
