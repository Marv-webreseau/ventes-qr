import { db } from "@/lib/db";
import { ErreurMetier } from "@/domain/erreurs";
import { acteurActif, type Acteur } from "./articles.service";

/** Le propriétaire tranche une alerte : « rien d'anormal » ou « problème confirmé », avec une note. */
export async function traiterAnomalie(acteur: Acteur, id: string, statut: "ECARTEE" | "CONFIRMEE", note?: string) {
  return db.$transaction(async (tx) => {
    const u = await acteurActif(tx, acteur);
    if (u.role !== "ADMIN") throw new ErreurMetier("NON_AUTORISE", "Cette action est réservée au propriétaire.");
    const a = await tx.anomalie.findUnique({ where: { id } });
    if (!a || a.magasinId !== u.magasinId) throw new ErreurMetier("INTROUVABLE", "Alerte introuvable.");
    if (a.statut !== "A_VERIFIER") throw new ErreurMetier("CONFLIT", "Cette alerte a déjà été traitée.");
    await tx.anomalie.update({ where: { id }, data: { statut, note: note?.trim().slice(0, 500) || null, traiteeLe: new Date() } });
  });
}
