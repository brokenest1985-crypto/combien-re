import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Combien — estimation du coût rendu à La Réunion",
  description: "Estimez la TVA, l’octroi de mer et le coût rendu d’un achat expédié vers La Réunion.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fr"><body>{children}</body></html>;
}
