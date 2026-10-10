"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sessionCourante } from "@/lib/session";
import { db } from "@/lib/db";
import { ErreurMetier } from "@/domain/erreurs";
import { creerArticles as creer, mettreEnRayonLot, remettreEnRayon } from "@/services/articles.service";
import { modifierProduit, definirProduitActif } from "@/services/catalogue.service";

async function admin() {
  const s = await sessionCourante();
  if (!s || s.user.role !== "ADMIN") throw new ErreurMetier("NON_AUTORISE", "Accès refusé.");
  return s.user;
}
function enErreur(e: unknown) {
  if (e instanceof ErreurMetier) return { erreur: e.message };
  console.error(e);
  return { erreur: "Une erreur est survenue. Réessaie." };
}

export async function creerProduit(f: FormData) {
  const u = await admin();
  const nom = String(f.get("nom") ?? "").trim();
  const prix = Math.round(Number(f.get("prix")));
  const seuil = Math.max(0, Math.round(Number(f.get("seuil") ?? 0)) || 0);
  if (!nom || !(prix > 0)) return;
  await db.produit.create({ data: { nom, prix, seuilStockBas: seuil, magasinId: u.magasinId } });
  revalidatePath("/admin/produits");
}

export async function creerArticles(f: FormData) {
  const u = await admin();
  const produitId = String(f.get("produitId") ?? "");
  const n = await creer({ id: u.id, role: u.role }, produitId, Number(f.get("quantite")), f.get("enRayon") === "on");
  redirect(`/admin/etiquettes?produit=${produitId}&n=${n}`);
}

export async function modifierProduitAction(f: FormData) {
  const u = await admin();
  try {
    await modifierProduit({ id: u.id, role: u.role }, { id: String(f.get("id")), nom: String(f.get("nom") ?? ""), prix: Math.round(Number(f.get("prix"))), seuilStockBas: Math.round(Number(f.get("seuil") ?? 0)) });
  } catch (e) { console.error(e); }
  revalidatePath("/admin/produits");
}

export async function mettreEnRayonLotAction(produitId: string, quantite: number) {
  try {
    const u = await admin();
    const n = await mettreEnRayonLot({ id: u.id, role: u.role }, produitId, quantite);
    revalidatePath("/admin/produits");
    return { ok: true as const, n };
  } catch (e) { return enErreur(e); }
}

export async function remettreEnRayonAction(articleId: string) {
  try {
    const u = await admin();
    await remettreEnRayon({ id: u.id, role: u.role }, articleId);
    revalidatePath("/admin/produits");
    return { ok: true as const };
  } catch (e) { return enErreur(e); }
}

export async function definirProduitActifAction(id: string, actif: boolean) {
  try {
    const u = await admin();
    await definirProduitActif({ id: u.id, role: u.role }, id, actif);
    revalidatePath("/admin/produits"); revalidatePath(`/admin/produits/${id}`); revalidatePath("/admin", "layout");
    return { ok: true as const };
  } catch (e) { return enErreur(e); }
}
