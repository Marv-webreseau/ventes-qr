import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { ErreurMetier } from "@/domain/erreurs";
import { calculerEcarts } from "@/domain/inventaire";
import { acteurActif, type Acteur } from "./articles.service";

type Tx = Prisma.TransactionClient;
async function proprietaire(tx: Tx, acteur: Acteur) {
  const u = await acteurActif(tx, acteur);
  if (u.role !== "ADMIN") throw new ErreurMetier("NON_AUTORISE", "Cette action est réservée au propriétaire.");
  return u;
}

export async function demarrerInventaire(acteur: Acteur) {
  return db.$transaction(async (tx) => {
    const u = await proprietaire(tx, acteur);
    const ouvert = await tx.inventaire.findFirst({ where: { magasinId: u.magasinId, cloture: null } });
    return (ouvert ?? (await tx.inventaire.create({ data: { magasinId: u.magasinId, creePar: u.id } }))).id;
  });
}

const STATUT_LIBELLE: Record<string, string> = { EN_STOCK: "en stock (réserve)", VENDU: "déjà vendu", RETOURNE: "retourné", ENDOMMAGE: "endommagé", PERDU: "signalé perdu" };

/** Compte un article scanné. Code complet ou référence courte de l'étiquette. */
export async function scannerInventaire(acteur: Acteur, inventaireId: string, saisie: string) {
  const code = saisie.trim().toLowerCase();
  if (!/^[a-z0-9]{4,40}$/.test(code)) throw new ErreurMetier("DONNEE_INVALIDE", "Ce code n'est pas valide.");
  return db.$transaction(async (tx) => {
    const u = await proprietaire(tx, acteur);
    const inv = await tx.inventaire.findUnique({ where: { id: inventaireId } });
    if (!inv || inv.magasinId !== u.magasinId) throw new ErreurMetier("INTROUVABLE", "Inventaire introuvable.");
    if (inv.cloture) throw new ErreurMetier("CONFLIT", "Cet inventaire est terminé.");
    const trouves = await tx.article.findMany({ where: { magasinId: u.magasinId, code: code.length > 12 ? code : { endsWith: code } }, include: { produit: { select: { nom: true } } }, take: 2 });
    if (trouves.length === 0) throw new ErreurMetier("INTROUVABLE", "Ce code ne correspond à aucun article du magasin.");
    if (trouves.length > 1) throw new ErreurMetier("CONFLIT", "Plusieurs articles ont cette référence. Scanne le QR code.");
    const a = trouves[0]!;
    let deja = false;
    try { await tx.ligneInventaire.create({ data: { inventaireId, articleId: a.id } }); }
    catch (e) { if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") deja = true; else throw e; }
    const total = await tx.ligneInventaire.count({ where: { inventaireId } });
    return { nom: a.produit.nom, attendu: a.statut === "EN_RAYON", etat: STATUT_LIBELLE[a.statut] ?? "", deja, total };
  }, { isolationLevel: "ReadCommitted" });
}

const noms = (l: { nom: string }[]) => {
  const c = new Map<string, number>(); for (const x of l) c.set(x.nom, (c.get(x.nom) ?? 0) + 1);
  return [...c].slice(0, 8).map(([n, k]) => `${k} × ${n}`).join(", ") + (c.size > 8 ? "…" : "");
};

export async function cloturerInventaire(acteur: Acteur, inventaireId: string, abandon: boolean) {
  return db.$transaction(async (tx) => {
    const u = await proprietaire(tx, acteur);
    const inv = await tx.inventaire.findUnique({ where: { id: inventaireId }, include: { lignes: { select: { articleId: true } } } });
    if (!inv || inv.magasinId !== u.magasinId) throw new ErreurMetier("INTROUVABLE", "Inventaire introuvable.");
    if (inv.cloture) throw new ErreurMetier("CONFLIT", "Cet inventaire est déjà terminé.");
    if (abandon) { await tx.inventaire.update({ where: { id: inv.id }, data: { cloture: new Date() } }); return { abandonne: true as const }; }

    const scannes = inv.lignes.map((l) => l.articleId);
    const enRayon = await tx.article.findMany({ where: { magasinId: u.magasinId, statut: "EN_RAYON" }, select: { id: true, code: true, produit: { select: { nom: true } } } });
    const { manquants, inattendus } = calculerEcarts(enRayon.map((a) => a.id), scannes);
    const parId = new Map(enRayon.map((a) => [a.id, a]));
    const manquantsDet = manquants.map((id) => ({ nom: parId.get(id)!.produit.nom, ref: parId.get(id)!.code.slice(-6).toUpperCase() }));
    const inattendusArt = inattendus.length ? await tx.article.findMany({ where: { id: { in: inattendus } }, select: { code: true, statut: true, produit: { select: { nom: true } } } }) : [];
    const inattendusDet = inattendusArt.map((a) => ({ nom: a.produit.nom, ref: a.code.slice(-6).toUpperCase(), statut: STATUT_LIBELLE[a.statut] ?? a.statut }));

    await tx.inventaire.update({ where: { id: inv.id }, data: { cloture: new Date(), manquants: manquants.length, inattendus: inattendus.length } });
    const ecarts = [...manquants.map((id) => ({ inventaireId: inv.id, articleId: id, type: "MANQUANT" })), ...inattendus.map((id) => ({ inventaireId: inv.id, articleId: id, type: "INATTENDU" }))];
    if (ecarts.length) await tx.ecartInventaire.createMany({ data: ecarts });
    if (manquants.length) await tx.anomalie.create({ data: { magasinId: u.magasinId, type: "ECART_INVENTAIRE", detail: `Inventaire : ${manquants.length} article(s) attendu(s) en rayon mais non retrouvé(s) : ${noms(manquantsDet)}. À vérifier.` } });
    if (inattendus.length) await tx.anomalie.create({ data: { magasinId: u.magasinId, type: "ECART_INVENTAIRE", detail: `Inventaire : ${inattendus.length} article(s) trouvé(s) en rayon alors qu'ils ne devraient pas y être : ${noms(inattendusDet)}. À vérifier.` } });
    return { abandonne: false as const, scannes: scannes.length, attendus: enRayon.length, manquants: manquantsDet.slice(0, 200), inattendus: inattendusDet.slice(0, 200) };
  });
}
