import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { sessionCourante } from "@/lib/session";
import { Shell } from "@/components/shell";

export default async function VendeurLayout({ children }: { children: ReactNode }) {
  const s = await sessionCourante();
  if (!s) redirect("/connexion");
  return (
    <Shell nom={s.user.name ?? "Vendeur"} role={s.user.role === "ADMIN" ? "Propriétaire" : "Vendeur"} entrees={[
      { href: "/vendeur", label: "Scanner", icone: "scan", racine: true },
      { href: "/vendeur/journee", label: "Ma journée", icone: "journee" },
      { href: "/vendeur/compte", label: "Compte", icone: "compte" },
    ]}>{children}</Shell>
  );
}
