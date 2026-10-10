import { NextResponse } from "next/server";
import { sessionCourante } from "@/lib/session";
import { chercherVentes, LIMITE } from "@/services/ventes.query";
import { periodeValide, dateCourte, heure } from "@/domain/dates";

// Neutralise l'injection de formules (=, +, -, @) à l'ouverture dans Excel.
const cellule = (v: string | number) => {
  let t = String(v);
  if (/^[=+\-@\t\r]/.test(t)) t = `'${t}`;
  return /[";\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
};

export async function GET(req: Request) {
  const s = await sessionCourante();
  if (!s || s.user.role !== "ADMIN") return NextResponse.json({ message: "Accès refusé." }, { status: 403 });
  const u = new URL(req.url);
  const periode = periodeValide(u.searchParams.get("p") ?? undefined);
  const ventes = (await chercherVentes(s.user.magasinId, { periode, vendeurId: u.searchParams.get("vendeur") || undefined })).slice(0, LIMITE);

  const lignes = [["Date", "Heure", "Vendeur", "Article", "Référence", "Prix catalogue", "Montant", "État"],
    ...ventes.map((v) => [dateCourte(v.date), heure(v.date), v.vendeur.nom, v.article.produit.nom, v.article.code.slice(-6).toUpperCase(),
      v.prixCatalogue, v.montant, v.statut === "VALIDE" ? "Valide" : v.statut === "RETOURNEE" ? "Retournée" : "Annulée"])];
  const csv = "\uFEFF" + lignes.map((l) => l.map(cellule).join(";")).join("\r\n"); // BOM + « ; » : s'ouvre correctement dans Excel en français

  return new NextResponse(csv, { headers: {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="ventes-${periode}.csv"`,
    "Cache-Control": "no-store",
  } });
}
