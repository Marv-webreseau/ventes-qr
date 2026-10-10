import type { ReactNode } from "react";
import type { Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { EnregistrerSW } from "@/components/enregistrer-sw";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
export const metadata = {
  title: "Ventes QR", description: "Suivi des ventes en temps réel",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "Ventes QR", statusBarStyle: "default" as const },
};
export const viewport: Viewport = { themeColor: "#2563eb", width: "device-width", initialScale: 1 };

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className={inter.variable}>
      <body>{children}<EnregistrerSW /></body>
    </html>
  );
}
