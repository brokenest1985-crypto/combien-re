import { CostCalculator } from "./cost-calculator";

export default function Home() {
  return (
    <main className="page">
      <header className="brand"><span className="brand-mark" aria-hidden="true">c.</span> combien<span className="destination">La Réunion · 974</span></header>
      <section className="calculator" aria-labelledby="page-title">
        <div className="eyebrow"><span aria-hidden="true" /> V0.2b2 · tarif Région Réunion</div>
        <h1 id="page-title">Combien ça me coûte vraiment ?</h1>
        <p className="intro">Estimez le coût d’un achat vendu hors TVA métropolitaine et expédié depuis la France métropolitaine vers La Réunion.</p>
        <CostCalculator />
        <p className="notice">Prototype expérimental — cette estimation ne remplace pas la liquidation officielle de la douane ni la facture du transporteur.</p>
      </section>
      <footer>Un peu plus de clarté avant d’acheter.</footer>
    </main>
  );
}
