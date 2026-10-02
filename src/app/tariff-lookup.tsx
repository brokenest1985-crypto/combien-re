"use client";

import { useRef, useState } from "react";
import { formatFiscalRate } from "@/domain/landed-cost/fiscal-rate";
import type { RegionTariffLookupResult } from "@/domain/tariffs/reunion-region";

type Resolved = Extract<RegionTariffLookupResult, { status: "resolved" }>;
type ApiResponse = Readonly<{ datasetStatus: "available"; result: RegionTariffLookupResult }>;

type TariffLookupProps = Readonly<{
  onResolved: (result: Resolved) => void;
  onLookupInputChanged: () => void;
}>;

export function TariffLookup({ onResolved, onLookupInputChanged }: TariffLookupProps) {
  const [nomenclatureCode, setNomenclatureCode] = useState("");
  const [referenceDate, setReferenceDate] = useState("2026-10-01");
  const [result, setResult] = useState<RegionTariffLookupResult | null>(null);
  const [pending, setPending] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const requestRevision = useRef(0);

  async function searchTariffs() {
    const revision = ++requestRevision.current;
    setPending(true);
    setRequestError(null);
    try {
      const response = await fetch(`/api/tariffs/reunion?code=${encodeURIComponent(nomenclatureCode)}&date=${encodeURIComponent(referenceDate)}`);
      if (!response.ok) throw new Error("La recherche tarifaire est momentanément indisponible.");
      const payload = await response.json() as ApiResponse;
      if (revision !== requestRevision.current) return;
      setResult(payload.result);
      if (payload.result.status === "resolved") onResolved(payload.result);
    } catch (error) {
      if (revision === requestRevision.current) {
        setRequestError(error instanceof Error ? error.message : "La recherche tarifaire a échoué.");
      }
    } finally {
      if (revision === requestRevision.current) setPending(false);
    }
  }

  function changeInput(update: () => void) {
    requestRevision.current += 1;
    update(); setResult(null); setRequestError(null); setPending(false); onLookupInputChanged();
  }

  return (
    <section className="tariff-lookup" aria-labelledby="tariff-lookup-title">
      <div className="section-heading">
        <div><p className="section-kicker">V0.2b2 · Région Réunion</p><h2 id="tariff-lookup-title">Recherche tarifaire</h2></div>
        <span className="dataset-status dataset-available">Tarif vérifié au 01/10/2026</span>
      </div>
      <div className="fields tariff-fields">
        <div className="field">
          <label htmlFor="nomenclature">Code douanier / nomenclature</label>
          <input id="nomenclature" name="nomenclature" type="text" inputMode="numeric" autoComplete="off" spellCheck={false} placeholder="ex. 84 71 30 00" value={nomenclatureCode} aria-describedby="nomenclature-hint" onChange={(event) => changeInput(() => setNomenclatureCode(event.target.value))} />
          <p id="nomenclature-hint" className="hint">Code NC connu — la classification automatique viendra dans une prochaine version.</p>
        </div>
        <div className="field">
          <label htmlFor="tariff-date">Date du tarif</label>
          <input id="tariff-date" name="tariff-date" type="date" value={referenceDate} onChange={(event) => changeInput(() => setReferenceDate(event.target.value))} />
        </div>
      </div>
      <button className="secondary-button" type="button" disabled={pending} onClick={() => void searchTariffs()}>{pending ? "Recherche…" : "Rechercher les taux OME/OMER"}</button>
      {requestError ? <p className="lookup-message lookup-warning" role="alert">{requestError}</p> : <LookupResult result={result} />}
    </section>
  );
}

function LookupResult({ result }: Readonly<{ result: RegionTariffLookupResult | null }>) {
  if (result === null) return null;
  if (result.status === "ambiguous") return <div className="lookup-message lookup-warning" role="alert"><strong>Statut : ambigu</strong><p>Plusieurs mesures tarifaires sont possibles. Une précision supplémentaire est nécessaire.</p><p>{result.alternatives.length} règle(s) potentielle(s) — aucun taux n’a été injecté.</p></div>;
  if (result.status === "not-found") return <p className="lookup-message" role="status">Statut : non trouvé. Aucun tarif exact n’est disponible.</p>;
  if (result.status === "unsupported") return <p className="lookup-message lookup-warning" role="alert">Statut : non pris en charge. {result.message}</p>;
  return (
    <div className="lookup-message lookup-resolved" role="status">
      <strong>Statut : résolu</strong>
      <dl className="tariff-result">
        <div><dt>Nomenclature</dt><dd>{result.nomenclatureCode}</dd></div>
        <div><dt>Libellé tarifaire</dt><dd>{result.designation}</dd></div>
        <div><dt>OME</dt><dd>{formatFiscalRate(result.octroiDeMerRate)}</dd></div>
        <div><dt>OMER</dt><dd>{formatFiscalRate(result.octroiDeMerRegionalRate)}</dd></div>
        <div><dt>Date consultée</dt><dd>{result.referenceDate}</dd></div>
        <div><dt>Source</dt><dd>Région Réunion · {result.sourceReference.deliberationNumber}</dd></div>
      </dl>
      <details className="rate-trace"><summary>Pourquoi ce taux ?</summary><p>Tarif général externe publié le {result.sourceReference.publicationDate}, page PDF {result.row.sourcePage}. Code publié : {result.row.publishedCode}.</p></details>
      <p className="indicative-note">Estimation basée sur le tarif publié par la Région Réunion, sous réserve de la bonne classification douanière du produit.</p>
    </div>
  );
}
