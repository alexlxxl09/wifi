import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pokemon PSA Price Tracker",
  description: "Recherchez les cartes Pokémon et comparez les prix PSA 10 avec le ratio pop/prix",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
