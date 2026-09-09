import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Combien — coût provisoire rendu à La Réunion",
  description: "Additionnez le prix d’un produit et sa livraison à La Réunion. Prototype sans taxes ni octroi de mer.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fr"><body>{children}</body></html>;
}
