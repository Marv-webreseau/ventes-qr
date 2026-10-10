import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { ErreurMetier } from "@/domain/erreurs";
import {
  apresEchec, genererCodeRecuperation, genererMotDePasseProvisoire, identifiantValide, minutesRestantes,
  normaliserCode, normaliserIdentifiant, normaliserTelephone, validerMotDePasse, verrouActif,
} from "@/domain/mot-de-passe";
import { acteurActif, type Acteur } from "./articles.service";

type Tx = Prisma.TransactionClient;
const COUT = 10;
const FAUX_HASH = bcrypt.hashSync("faux-mot-de-passe", COUT); // égalise le temps de réponse si l'identifiant n'existe pas
const ERREUR_RECUP = "Identifiant ou code incorrect.";

const journaliser = (tx: Tx, magasinId: string, cibleId: string, acteurId: string | null, action: string) =>
  tx.journalCompte.create({ data: { magasinId, cibleId, acteurId, action } });

async function proprietaire(tx: Tx, acteur: Acteur) {
  const u = await acteurActif(tx, acteur);
  if (u.role !== "ADMIN") throw new ErreurMetier("NON_AUTORISE", "Cette action est réservée au propriétaire.");
  return u;
}

async function vendeurDuMagasin(tx: Tx, magasinId: string, id: string) {
  const v = await tx.user.findUnique({ where: { id } });
  if (!v || v.magasinId !== magasinId || v.role !== "VENDEUR") throw new ErreurMetier("INTROUVABLE", "Vendeur introuvable.");
  return v;
}

/** Connexion : vérifie le verrouillage, compte les échecs. Renvoie l'utilisateur ou null. */
export async function verifierConnexion(identifiantBrut: string, motDePasse: string) {
  const u = await db.user.findUnique({ where: { identifiant: normaliserIdentifiant(identifiantBrut) } });
  if (!u) { await bcrypt.compare(motDePasse, FAUX_HASH); return null; }
  if (verrouActif(u.verrouilleJusqua)) throw new Error("VERROUILLE");
  const ok = await bcrypt.compare(motDePasse, u.motDePasse);
  if (!ok) {
    await db.user.update({ where: { id: u.id }, data: apresEchec(u.echecsConnexion) });
    return null;
  }
  if (!u.actif) return null;
  if (u.echecsConnexion > 0 || u.verrouilleJusqua) await db.user.update({ where: { id: u.id }, data: { echecsConnexion: 0, verrouilleJusqua: null } });
  return u;
}

export async function creerVendeur(acteur: Acteur, d: { nom: string; identifiant: string; telephone?: string }) {
  const nom = d.nom.trim();
  const identifiant = normaliserIdentifiant(d.identifiant);
  if (!nom) throw new ErreurMetier("DONNEE_INVALIDE", "Indique le nom du vendeur.");
  if (!identifiantValide(identifiant)) throw new ErreurMetier("DONNEE_INVALIDE", "Identifiant : 3 à 30 caractères (lettres, chiffres, point, tiret).");
  let telephone: string | null = null;
  if (d.telephone?.trim()) {
    telephone = normaliserTelephone(d.telephone);
    if (!telephone) throw new ErreurMetier("DONNEE_INVALIDE", "Numéro WhatsApp invalide. Mets l'indicatif du pays, par exemple +229…");
  }
  const mdpProvisoire = genererMotDePasseProvisoire();
  const motDePasse = await bcrypt.hash(mdpProvisoire, COUT);
  try {
    const id = await db.$transaction(async (tx) => {
      const p = await proprietaire(tx, acteur);
      const v = await tx.user.create({ data: { magasinId: p.magasinId, nom, identifiant, telephone, motDePasse, doitChangerMdp: true } });
      await journaliser(tx, p.magasinId, v.id, p.id, "COMPTE_CREE");
      return v.id;
    });
    return { id, identifiant, mdpProvisoire };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") throw new ErreurMetier("CONFLIT", "Cet identifiant est déjà utilisé.");
    throw e;
  }
}

/** Dernier recours : mot de passe provisoire, anciennes sessions et ancien code invalidés. */
export async function reinitialiser(acteur: Acteur, cibleId: string) {
  const mdpProvisoire = genererMotDePasseProvisoire();
  const motDePasse = await bcrypt.hash(mdpProvisoire, COUT);
  return db.$transaction(async (tx) => {
    const p = await proprietaire(tx, acteur);
    const v = await vendeurDuMagasin(tx, p.magasinId, cibleId);
    await tx.user.update({ where: { id: v.id }, data: {
      motDePasse, doitChangerMdp: true, codeRecuperationHash: null, echecsConnexion: 0, verrouilleJusqua: null, sessionVersion: { increment: 1 },
    } });
    await journaliser(tx, p.magasinId, v.id, p.id, "MOT_DE_PASSE_REINITIALISE");
    return { nom: v.nom, identifiant: v.identifiant, telephone: v.telephone, mdpProvisoire };
  });
}

export async function modifierVendeur(acteur: Acteur, d: { id: string; nom: string; telephone: string }) {
  const nom = d.nom.trim();
  if (!nom) throw new ErreurMetier("DONNEE_INVALIDE", "Indique le nom du vendeur.");
  let telephone: string | null = null;
  if (d.telephone.trim()) {
    telephone = normaliserTelephone(d.telephone);
    if (!telephone) throw new ErreurMetier("DONNEE_INVALIDE", "Numéro WhatsApp invalide. Mets l'indicatif du pays, par exemple +229…");
  }
  return db.$transaction(async (tx) => {
    const p = await proprietaire(tx, acteur);
    const v = await vendeurDuMagasin(tx, p.magasinId, d.id);
    await tx.user.update({ where: { id: v.id }, data: { nom, telephone } });
    await journaliser(tx, p.magasinId, v.id, p.id, "COMPTE_MODIFIE");
  });
}

export async function definirActif(acteur: Acteur, cibleId: string, actif: boolean) {
  return db.$transaction(async (tx) => {
    const p = await proprietaire(tx, acteur);
    const v = await vendeurDuMagasin(tx, p.magasinId, cibleId);
    await tx.user.update({ where: { id: v.id }, data: { actif, sessionVersion: { increment: 1 } } });
    await journaliser(tx, p.magasinId, v.id, p.id, actif ? "COMPTE_REACTIVE" : "COMPTE_DESACTIVE");
  });
}

export async function listerEquipe(acteur: Acteur) {
  const p = await db.$transaction((tx) => proprietaire(tx, acteur));
  return db.user.findMany({
    where: { magasinId: p.magasinId, role: "VENDEUR" }, orderBy: { nom: "asc" },
    select: { id: true, nom: true, identifiant: true, telephone: true, actif: true, doitChangerMdp: true },
  });
}

/** Le vendeur change son propre mot de passe. Un code de récupération est créé s'il n'en a pas. */
export async function changerMotDePasse(userId: string, ancien: string, nouveau: string) {
  const u = await db.user.findUnique({ where: { id: userId } });
  if (!u || !u.actif) throw new ErreurMetier("COMPTE_DESACTIVE", "Compte désactivé. Contacte le propriétaire.");
  if (!(await bcrypt.compare(ancien, u.motDePasse))) throw new ErreurMetier("DONNEE_INVALIDE", "Le mot de passe actuel est incorrect.");
  const invalide = validerMotDePasse(nouveau);
  if (invalide) throw new ErreurMetier("DONNEE_INVALIDE", invalide);
  if (nouveau === ancien) throw new ErreurMetier("DONNEE_INVALIDE", "Choisis un mot de passe différent de l'actuel.");

  const code = u.codeRecuperationHash ? null : genererCodeRecuperation();
  await db.$transaction(async (tx) => {
    await tx.user.update({ where: { id: u.id }, data: {
      motDePasse: await bcrypt.hash(nouveau, COUT), doitChangerMdp: false, sessionVersion: { increment: 1 },
      ...(code ? { codeRecuperationHash: await bcrypt.hash(normaliserCode(code), COUT) } : {}),
    } });
    await journaliser(tx, u.magasinId, u.id, u.id, "MOT_DE_PASSE_CHANGE");
  });
  return { codeRecuperation: code };
}

/** Mot de passe oublié, sans aide : identifiant + code de récupération personnel (usage unique). */
export async function recuperer(identifiantBrut: string, codeBrut: string, nouveau: string) {
  const u = await db.user.findUnique({ where: { identifiant: normaliserIdentifiant(identifiantBrut) } });
  const hash = u?.codeRecuperationHash ?? FAUX_HASH;
  if (u && verrouActif(u.verrouilleJusqua)) {
    throw new ErreurMetier("VERROUILLE", `Trop d'essais. Réessaie dans ${minutesRestantes(u.verrouilleJusqua!)} minutes.`);
  }
  const ok = await bcrypt.compare(normaliserCode(codeBrut), hash);
  if (!u || !u.actif || !u.codeRecuperationHash || !ok) {
    if (u) await db.user.update({ where: { id: u.id }, data: apresEchec(u.echecsConnexion) });
    throw new ErreurMetier("DONNEE_INVALIDE", ERREUR_RECUP);
  }
  const invalide = validerMotDePasse(nouveau);
  if (invalide) throw new ErreurMetier("DONNEE_INVALIDE", invalide);

  const code = genererCodeRecuperation();
  await db.$transaction(async (tx) => {
    await tx.user.update({ where: { id: u.id }, data: {
      motDePasse: await bcrypt.hash(nouveau, COUT), codeRecuperationHash: await bcrypt.hash(normaliserCode(code), COUT),
      doitChangerMdp: false, echecsConnexion: 0, verrouilleJusqua: null, sessionVersion: { increment: 1 },
    } });
    await journaliser(tx, u.magasinId, u.id, u.id, "MOT_DE_PASSE_RECUPERE_PAR_CODE");
  });
  return { codeRecuperation: code };
}
