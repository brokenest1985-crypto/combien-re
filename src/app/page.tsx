import { CostCalculator } from "./cost-calculator";

export default function Home() {
  return (
    <main className="page">
      <header className="brand"><span className="brand-mark" aria-hidden="true">c.</span> combien<span className="destination">La Réunion · 974</span></header>
      <section className="calculator" aria-labelledby="page-title">
        <div className="eyebrow"><span aria-hidden="true" /> Votre achat, livraison comprise</div>
        <h1 id="page-title">Combien ça me coûte vraiment ?</h1>
        <p className="intro">Un premier calcul pour vos achats livrés à La Réunion. Indiquez le prix et la livraison, on fait l’addition.</p>
        <CostCalculator />
        <p className="notice">Prototype — taxes et octroi de mer non encore pris en compte.</p>
      </section>
      <footer>Un peu plus de clarté avant d’acheter.</footer>
    </main>
  );
}
