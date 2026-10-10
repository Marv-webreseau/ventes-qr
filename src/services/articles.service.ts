import { Prisma, type Role, type Statut } from "@prisma/client";
import { db } from "@/lib/db";
import { ErreurMetier } from "@/domain/erreurs";
import { verifierTransition, messageRefus, REGLES, type Action } from "@/domain/transitions";
import { baissePrixPct, fcfa } from "@/domain/alertes";
import { debutDuJour } from "@/domain/dates";

type Tx = Prisma.TransactionClient;
export interface Acteur { id: string; role: Role }

/** Relit le compte en base : un compte désactivé perd l'accès immédiatement. */
export async function acteurActif(tx: Tx, acteur: Acteur) {
  const u = await tx.user.findUnique({ where: { id: acteur.id } });
  if (!u || !u.actif) throw new ErreurMetier("COMPTE_DESACTIVE", "Compte désactivé. Contactez le propriétaire.");
  return u;
}

/**
 * Cœur du cycle de vie : relit l'état réel, vérifie la règle, puis écrit en
 * conditionnant l'UPDATE à l'état attendu. Deux appels simultanés : un seul passe.
 */
async function transitionner(tx: Tx, p: { action: Action; articleId: string; acteur: Acteur; motif?: string }) {
  const article = await tx.article.findUnique({ where: { id: p.articleId }, include: { produit: true } });
  if (!article) throw new ErreurMetier("INTROUVABLE", "Article introuvable.");
  const vers = verifierTransition(p.action, article.statut, p.acteur.role);

  const { count } = await tx.article.updateMany({
    where: { id: p.articleId, statut: { in: REGLES[p.action].de } },
    data: { statut: vers },
  });
  if (count === 0) {
    const actuel = await tx.article.findUniqueOrThrow({ where: { id: p.articleId }, select: { statut: true } });
    throw new ErreurMetier("CONFLIT", `${messageRefus(actuel.statut)} (action simultanée d'un autre utilisateur)`);
  }
  await tx.mouvement.create({ data: { articleId: p.articleId, de: article.statut, vers, userId: p.acteur.id, motif: p.motif } });
  return article;
}

async function notifierAdmins(tx: Tx, magasinId: string, titre: string, corps: string, lien = "/admin") {
  const admins = await tx.user.findMany({ where: { magasinId, role: "ADMIN", actif: true }, select: { id: true } });
  if (admins.length) await tx.notification.createMany({ data: admins.map((a) => ({ userId: a.id, titre, corps, lien })) });
}

const convertirConflit = (e: unknown): never => {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
    throw new ErreurMetier("CONFLIT", "Cet article vient d'être vendu par un autre utilisateur.");
  throw e;
};

export async function vendre(acteur: Acteur, articleId: string, montant?: number) {
  if (montant !== undefined && (!Number.isInteger(montant) || montant <= 0))
    throw new ErreurMetier("DONNEE_INVALIDE", "Le prix doit être un nombre entier supérieur à 0.");
  try {
    return await db.$transaction(async (tx) => {
      const vendeur = await acteurActif(tx, acteur);
      const article = await transitionner(tx, { action: "VENDRE", articleId, acteur });
      const prixCatalogue = article.produit.prix;
      const encaisse = montant ?? prixCatalogue;
      const vente = await tx.vente.create({
        data: { magasinId: article.magasinId, articleId, vendeurId: acteur.id, prixCatalogue, montant: encaisse },
      });
      await notifierAdmins(tx, article.magasinId, "Vente", `${vendeur.nom} · ${article.produit.nom} · ${fcfa(encaisse)}`, "/admin/ventes");

      const magasin = await tx.magasin.findUniqueOrThrow({ where: { id: article.magasinId } });
      const baisse = baissePrixPct(prixCatalogue, encaisse);
      if (baisse > magasin.seuilBaissePrixPct) {
        await tx.anomalie.create({ data: {
          magasinId: article.magasinId, type: "BAISSE_PRIX", articleId, venteId: vente.id, userId: acteur.id,
          detail: `Vendu ${fcfa(encaisse)} au lieu de ${fcfa(prixCatalogue)} (−${Math.round(baisse)} %). À vérifier.`,
        } });
      }
      // Ventes en rafale : un même vendeur, N ventes en moins de X minutes (une seule alerte par fenêtre).
      const fenetre = new Date(Date.now() - magasin.rafaleMinutes * 60_000);
      const recentes = await tx.vente.count({ where: { vendeurId: acteur.id, statut: "VALIDE", date: { gte: fenetre } } });
      if (recentes >= magasin.rafaleNombre) {
        const dejaSignale = await tx.anomalie.count({ where: { magasinId: article.magasinId, type: "RAFALE_VENTES", userId: acteur.id, creeLe: { gte: fenetre } } });
        if (!dejaSignale) await tx.anomalie.create({ data: { magasinId: article.magasinId, type: "RAFALE_VENTES", userId: acteur.id, venteId: vente.id, detail: `${vendeur.nom} a enregistré ${recentes} ventes en ${magasin.rafaleMinutes} minutes. À vérifier.` } });
      }
      if (article.produit.seuilStockBas > 0) {
        const restant = await tx.article.count({ where: { produitId: article.produitId, statut: "EN_RAYON" } });
        const dejaSignale = await tx.anomalie.count({ where: { magasinId: article.magasinId, type: "STOCK_BAS", produitId: article.produitId, statut: "A_VERIFIER" } });
        if (restant <= article.produit.seuilStockBas && !dejaSignale) {
          const detail = `Stock bas : ${restant} « ${article.produit.nom} » en rayon (seuil ${article.produit.seuilStockBas}). À réapprovisionner.`;
          await tx.anomalie.create({ data: { magasinId: article.magasinId, type: "STOCK_BAS", produitId: article.produitId, detail } });
          await notifierAdmins(tx, article.magasinId, "Stock bas", detail, "/admin/alertes");
        }
      }
      return vente;
    });
  } catch (e) { return convertirConflit(e); }
}

export async function retourner(acteur: Acteur, articleId: string, motif: string) {
  if (!motif?.trim()) throw new ErreurMetier("DONNEE_INVALIDE", "Indiquez le motif du retour.");
  return db.$transaction(async (tx) => {
    const u = await acteurActif(tx, acteur);
    const article = await transitionner(tx, { action: "RETOURNER", articleId, acteur, motif: motif.trim() });
    await tx.vente.updateMany({ where: { articleId, statut: "VALIDE" }, data: { statut: "RETOURNEE" } });
    await notifierAdmins(tx, article.magasinId, "Retour", `${u.nom} · ${article.produit.nom} · ${motif.trim()}`, "/admin/ventes");

    const magasin = await tx.magasin.findUniqueOrThrow({ where: { id: article.magasinId } });
    const debut = debutDuJour();
    const retours = await tx.mouvement.count({ where: { userId: acteur.id, vers: "RETOURNE", date: { gte: debut } } });
    if (retours === magasin.retoursParJour) {
      await tx.anomalie.create({ data: {
        magasinId: article.magasinId, type: "RETOURS_REPETES", userId: acteur.id,
        detail: `${u.nom} a enregistré ${retours} retours aujourd'hui. À vérifier.`,
      } });
    }
  });
}

export async function signaler(acteur: Acteur, articleId: string, type: "ENDOMMAGE" | "PERDU", motif?: string) {
  return db.$transaction(async (tx) => {
    const u = await acteurActif(tx, acteur);
    const article = await transitionner(tx, { action: type === "PERDU" ? "SIGNALER_PERDU" : "SIGNALER_ENDOMMAGE", articleId, acteur, motif });
    const libelle = type === "PERDU" ? "perdu" : "endommagé";
    await tx.anomalie.create({ data: {
      magasinId: article.magasinId, type: "ARTICLE_A_VERIFIER", articleId, userId: acteur.id,
      detail: `${article.produit.nom} signalé ${libelle} par ${u.nom}. À vérifier.`,
    } });
    await notifierAdmins(tx, article.magasinId, "Article à vérifier", `${article.produit.nom} signalé ${libelle} par ${u.nom}`, "/admin/alertes");
  });
}

export async function mettreEnRayon(acteur: Acteur, articleId: string) {
  return db.$transaction(async (tx) => { await acteurActif(tx, acteur); await transitionner(tx, { action: "METTRE_EN_RAYON", articleId, acteur }); });
}

/** Le propriétaire a contrôlé l'article : il revient en rayon, les signalements ouverts sont écartés. */
export async function remettreEnRayon(acteur: Acteur, articleId: string) {
  return db.$transaction(async (tx) => {
    await acteurActif(tx, acteur);
    await transitionner(tx, { action: "REMETTRE_EN_RAYON", articleId, acteur });
    await tx.anomalie.updateMany({ where: { articleId, statut: "A_VERIFIER", type: "ARTICLE_A_VERIFIER" }, data: { statut: "ECARTEE", traiteeLe: new Date() } });
  });
}

export async function annulerVente(acteur: Acteur, venteId: string, motif: string) {
  if (!motif?.trim()) throw new ErreurMetier("DONNEE_INVALIDE", "Indiquez le motif de l'annulation.");
  return db.$transaction(async (tx) => {
    await acteurActif(tx, acteur);
    const vente = await tx.vente.findUnique({ where: { id: venteId } });
    if (!vente) throw new ErreurMetier("INTROUVABLE", "Vente introuvable.");
    if (vente.statut !== "VALIDE") throw new ErreurMetier("TRANSITION_REFUSEE", "Cette vente n'est plus valide.");
    await transitionner(tx, { action: "ANNULER_VENTE", articleId: vente.articleId, acteur, motif: motif.trim() });
    await tx.vente.update({ where: { id: venteId }, data: { statut: "ANNULEE", motifAnnulation: motif.trim() } });
  });
}

export async function creerArticles(acteur: Acteur, produitId: string, quantite: number, enRayon: boolean) {
  if (acteur.role !== "ADMIN") throw new ErreurMetier("NON_AUTORISE", "Cette action est réservée au propriétaire.");
  const n = Math.floor(quantite);
  if (!(n >= 1 && n <= 200)) throw new ErreurMetier("DONNEE_INVALIDE", "Quantité entre 1 et 200.");
  return db.$transaction(async (tx) => {
    await acteurActif(tx, acteur);
    const produit = await tx.produit.findUnique({ where: { id: produitId } });
    if (!produit) throw new ErreurMetier("INTROUVABLE", "Produit introuvable.");
    if (!produit.actif) throw new ErreurMetier("TRANSITION_REFUSEE", "Ce produit est archivé. Réactive-le pour créer des articles.");
    const cree = await tx.article.createManyAndReturn({ data: Array.from({ length: n }, () => ({ produitId, magasinId: produit.magasinId })) });
    await tx.mouvement.createMany({ data: cree.map((a) => ({ articleId: a.id, de: null, vers: "EN_STOCK" as Statut, userId: acteur.id })) });
    if (enRayon) {
      await tx.article.updateMany({ where: { id: { in: cree.map((a) => a.id) } }, data: { statut: "EN_RAYON" } });
      await tx.mouvement.createMany({ data: cree.map((a) => ({ articleId: a.id, de: "EN_STOCK" as Statut, vers: "EN_RAYON" as Statut, userId: acteur.id })) });
    }
    return cree.length;
  });
}

/** Passe en rayon les n plus anciens articles en stock d'un produit. */
export async function mettreEnRayonLot(acteur: Acteur, produitId: string, quantite: number) {
  const n = Math.floor(quantite);
  if (!(n >= 1 && n <= 500)) throw new ErreurMetier("DONNEE_INVALIDE", "Quantité entre 1 et 500.");
  return db.$transaction(async (tx) => {
    const u = await acteurActif(tx, acteur);
    if (u.role !== "ADMIN") throw new ErreurMetier("NON_AUTORISE", "Cette action est réservée au propriétaire.");
    const ids = (await tx.article.findMany({ where: { produitId, magasinId: u.magasinId, statut: "EN_STOCK" }, orderBy: { creeLe: "asc" }, take: n, select: { id: true } })).map((a) => a.id);
    if (ids.length === 0) throw new ErreurMetier("TRANSITION_REFUSEE", "Aucun article en stock pour ce produit.");
    const { count } = await tx.article.updateMany({ where: { id: { in: ids }, statut: "EN_STOCK" }, data: { statut: "EN_RAYON" } });
    if (count !== ids.length) throw new ErreurMetier("CONFLIT", "Le stock a changé pendant l'opération. Réessaie.");
    await tx.mouvement.createMany({ data: ids.map((id) => ({ articleId: id, de: "EN_STOCK" as Statut, vers: "EN_RAYON" as Statut, userId: u.id })) });
    return ids.length;
  });
}
