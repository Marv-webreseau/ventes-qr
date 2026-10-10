// Données de DÉMONSTRATION pour tester les écrans (graphique, filtres, alertes, export). Interdit en production.
// Elles ne peuvent pas être supprimées une à une (le journal est en ajout seul) : on remet la base à zéro avec « npx prisma db push --force-reset ».
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

if (process.env.NODE_ENV === "production") { console.error("Données de démonstration interdites en production."); process.exit(1); }

const db = new PrismaClient();
const JOUR = 86_400_000, DEC = 3_600_000; // Bénin : UTC+1
const local = new Date(Date.now() + DEC); local.setUTCHours(0, 0, 0, 0);
const debutAujourdhui = new Date(local.getTime() - DEC);
const hasard = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const choisir = (l) => l[Math.floor(Math.random() * l.length)];

try {
  const magasin = await db.magasin.findFirst();
  const admin = magasin && (await db.user.findFirst({ where: { magasinId: magasin.id, role: "ADMIN" } }));
  if (!magasin || !admin) throw new Error("Lance d'abord : npm run seed (ou npm run proprietaire).");
  if (await db.user.findUnique({ where: { identifiant: "demo.awa" } })) throw new Error("Les données de démonstration existent déjà.");

  const mdp = await bcrypt.hash("Demo12345", 10), rec = await bcrypt.hash("DEMO2DEMO2DE", 10);
  const vendeurs = [];
  for (const [identifiant, nom] of [["demo.awa", "Awa"], ["demo.koffi", "Koffi"]])
    vendeurs.push(await db.user.create({ data: { magasinId: magasin.id, identifiant, nom, motDePasse: mdp, codeRecuperationHash: rec } }));

  const modeles = [
    { nom: "Robe wax", prix: 15000, seuil: 3, creer: 12, vendre: 9 },
    { nom: "Chemise lin", prix: 12000, seuil: 2, creer: 10, vendre: 5 },
    { nom: "Sac cuir", prix: 25000, seuil: 0, creer: 8, vendre: 2 },
    { nom: "Sandales", prix: 8000, seuil: 2, creer: 10, vendre: 4 },
  ];
  const prevus = []; // { produit, article }
  const produits = [];
  for (const m of modeles) {
    const p = await db.produit.create({ data: { magasinId: magasin.id, nom: m.nom, prix: m.prix, seuilStockBas: m.seuil } });
    produits.push(p);
    const articles = await db.article.createManyAndReturn({ data: Array.from({ length: m.creer }, () => ({ produitId: p.id, magasinId: magasin.id, statut: "EN_RAYON" })), });
    const depart = new Date(debutAujourdhui.getTime() - 8 * JOUR);
    await db.mouvement.createMany({ data: articles.flatMap((a) => [
      { articleId: a.id, vers: "EN_STOCK", userId: admin.id, date: depart },
      { articleId: a.id, de: "EN_STOCK", vers: "EN_RAYON", userId: admin.id, date: new Date(depart.getTime() + 60_000) },
    ]) });
    articles.slice(0, m.vendre).forEach((a) => prevus.push({ produit: p, article: a }));
  }

  // 20 ventes réparties sur 7 jours, au moins 3 aujourd'hui ; une vente à −30 % pour déclencher une alerte de prix.
  let anomaliePrix = false, ventesCreees = 0, derniereVente = null;
  prevus.sort(() => Math.random() - 0.5);
  for (let i = 0; i < prevus.length; i++) {
    const { produit, article } = prevus[i];
    const decalage = i < 3 ? 0 : hasard(0, 6);
    const date = decalage === 0
      ? new Date(Math.max(debutAujourdhui.getTime() + 60_000, Date.now() - hasard(10, 300) * 60_000))
      : new Date(debutAujourdhui.getTime() - decalage * JOUR + hasard(8, 19) * 3_600_000 + hasard(0, 59) * 60_000);
    const vendeur = choisir(vendeurs);
    const baisse = !anomaliePrix && i === 5;
    const montant = baisse ? Math.round(produit.prix * 0.7) : produit.prix;
    const vente = await db.vente.create({ data: { magasinId: magasin.id, articleId: article.id, vendeurId: vendeur.id, prixCatalogue: produit.prix, montant, date } });
    await db.article.update({ where: { id: article.id }, data: { statut: "VENDU" } });
    await db.mouvement.create({ data: { articleId: article.id, de: "EN_RAYON", vers: "VENDU", userId: vendeur.id, date } });
    ventesCreees++; derniereVente = { vente, vendeur, article, produit };
    if (baisse) {
      anomaliePrix = true;
      await db.anomalie.create({ data: { magasinId: magasin.id, type: "BAISSE_PRIX", articleId: article.id, venteId: vente.id, userId: vendeur.id, detail: `Vendu ${montant.toLocaleString("fr-FR")} FCFA au lieu de ${produit.prix.toLocaleString("fr-FR")} FCFA (−30 %). À vérifier.` } });
    }
  }

  // Un retour (la vente la plus récente d'un autre jour que « aujourd'hui » n'est pas nécessaire : on prend la dernière créée).
  const r = derniereVente;
  await db.vente.update({ where: { id: r.vente.id }, data: { statut: "RETOURNEE" } });
  await db.article.update({ where: { id: r.article.id }, data: { statut: "RETOURNE" } });
  await db.mouvement.create({ data: { articleId: r.article.id, de: "VENDU", vers: "RETOURNE", userId: r.vendeur.id, motif: "Taille ou modèle" } });

  // Un article perdu + alerte, et le stock bas de la robe wax.
  const sandale = await db.article.findFirst({ where: { produitId: produits[3].id, statut: "EN_RAYON" } });
  await db.article.update({ where: { id: sandale.id }, data: { statut: "PERDU" } });
  await db.mouvement.create({ data: { articleId: sandale.id, de: "EN_RAYON", vers: "PERDU", userId: vendeurs[0].id, motif: "Introuvable après la fermeture" } });
  await db.anomalie.create({ data: { magasinId: magasin.id, type: "ARTICLE_A_VERIFIER", articleId: sandale.id, userId: vendeurs[0].id, detail: "Sandales signalé perdu par Awa. À vérifier." } });
  const robesRestantes = await db.article.count({ where: { produitId: produits[0].id, statut: "EN_RAYON" } });
  if (robesRestantes <= 3) await db.anomalie.create({ data: { magasinId: magasin.id, type: "STOCK_BAS", produitId: produits[0].id, detail: `Stock bas : ${robesRestantes} « Robe wax » en rayon (seuil 3). À réapprovisionner.` } });

  console.log(`Données de démonstration créées : ${ventesCreees} ventes sur 7 jours, 1 retour, 1 article perdu, des alertes.`);
  console.log("Vendeurs de démo : demo.awa et demo.koffi, mot de passe : Demo12345");
} catch (e) {
  console.error("Erreur :", e.message);
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
