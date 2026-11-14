import type { Metadata } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import { DemoBanner } from "@/components/DemoBanner";
import "./globals.css";

const sans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "Tandas — Ahorro rotativo con CoDi",
  description:
    "Organiza tu tanda, genera cobros CoDi directo al beneficiario de cada ronda. Hackatón México 2026 · Pey.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className={`${sans.variable} ${display.variable} font-sans antialiased`}>
        <DemoBanner />
        {children}
      </body>
    </html>
  );
}
