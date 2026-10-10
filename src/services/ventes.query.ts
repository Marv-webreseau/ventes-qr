import { db } from "@/lib/db";
import { debutPeriode, type Periode } from "@/domain/dates";

export const LIMITE = 500;

export function chercherVentes(magasinId: string, f: { periode: Periode; vendeurId?: string }) {
  return db.vente.findMany({
    where: { magasinId, date: { gte: debutPeriode(f.periode) }, ...(f.vendeurId ? { vendeurId: f.vendeurId } : {}) },
    orderBy: { date: "desc" },
    take: LIMITE + 1, // +1 pour savoir si la liste est tronquée
    include: { vendeur: { select: { nom: true } }, article: { select: { code: true, produit: { select: { nom: true } } } } },
  });
}
