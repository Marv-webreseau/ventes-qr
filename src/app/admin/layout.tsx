import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { sessionCourante } from "@/lib/session";
import { db } from "@/lib/db";
import { Shell } from "@/components/shell";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const s = await sessionCourante();
  if (!s || s.user.role !== "ADMIN") redirect("/connexion");
  const alertes = await db.anomalie.count({ where: { magasinId: s.user.magasinId, statut: "A_VERIFIER" } });
  return (
    <Shell nom={s.user.name ?? "Propriétaire"} role="Propriétaire" plus="/admin/plus" entrees={[
      { href: "/admin", label: "Aujourd'hui", icone: "dashboard", racine: true },
      { href: "/admin/ventes", label: "Ventes", icone: "ventes" },
      { href: "/admin/alertes", label: "Alertes", icone: "alertes", badge: alertes },
      { href: "/admin/produits", label: "Catalogue", icone: "catalogue", aussi: ["/admin/etiquettes", "/admin/articles"] },
      { href: "/admin/equipe", label: "Équipe", icone: "equipe", secondaire: true },
      { href: "/admin/inventaire", label: "Inventaire", icone: "inventaire", secondaire: true },
      { href: "/admin/reglages", label: "Réglages", icone: "reglages", secondaire: true },
    ]}>{children}</Shell>
  );
}
