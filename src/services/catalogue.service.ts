import { db } from "@/lib/db";
import { ErreurMetier } from "@/domain/erreurs";
import { acteurActif, type Acteur } from "./articles.service";

export async function modifierProduit(acteur: Acteur, d: { id: string; nom: string; prix: number; seuilStockBas: number }) {
  const nom = d.nom.trim();
  if (!nom) throw new ErreurMetier("DONNEE_INVALIDE", "Indique le nom du produit.");
  if (!Number.isInteger(d.prix) || d.prix <= 0) throw new ErreurMetier("DONNEE_INVALIDE", "Le prix doit être un nombre entier supérieur à 0.");
  if (!Number.isInteger(d.seuilStockBas) || d.seuilStockBas < 0 || d.seuilStockBas > 100000) throw new ErreurMetier("DONNEE_INVALIDE", "Seuil de stock bas invalide.");
  return db.$transaction(async (tx) => {
    const u = await acteurActif(tx, acteur);
    if (u.role !== "ADMIN") throw new ErreurMetier("NON_AUTORISE", "Cette action est réservée au propriétaire.");
    const p = await tx.produit.findUnique({ where: { id: d.id } });
    if (!p || p.magasinId !== u.magasinId) throw new ErreurMetier("INTROUVABLE", "Produit introuvable.");
    await tx.produit.update({ where: { id: d.id }, data: { nom, prix: d.prix, seuilStockBas: d.seuilStockBas } });
  });
}

/** Archive un produit qu'on ne vend plus. Impossible tant qu'il reste des articles en stock ou en rayon. */
export async function definirProduitActif(acteur: Acteur, id: string, actif: boolean) {
  return db.$transaction(async (tx) => {
    const u = await acteurActif(tx, acteur);
    if (u.role !== "ADMIN") throw new ErreurMetier("NON_AUTORISE", "Cette action est réservée au propriétaire.");
    const p = await tx.produit.findUnique({ where: { id } });
    if (!p || p.magasinId !== u.magasinId) throw new ErreurMetier("INTROUVABLE", "Produit introuvable.");
    if (!actif) {
      const restants = await tx.article.count({ where: { produitId: id, statut: { in: ["EN_STOCK", "EN_RAYON"] } } });
      if (restants > 0) throw new ErreurMetier("TRANSITION_REFUSEE", `Il reste ${restants} article(s) en stock ou en rayon. Vends-les, ou signale-les perdus, avant d'archiver.`);
    }
    await tx.produit.update({ where: { id }, data: { actif } });
  });
}
