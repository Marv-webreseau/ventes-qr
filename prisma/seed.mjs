import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomInt } from "node:crypto";

if (process.env.NODE_ENV === "production") { console.error("Le seed crée des comptes de TEST : interdit en production. Utilise : npm run proprietaire"); process.exit(1); }
const db = new PrismaClient();
const ALPHA = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const tirer = (n) => Array.from({ length: n }, () => ALPHA[randomInt(ALPHA.length)]).join("");
const codeSecours = `${tirer(4)}-${tirer(4)}-${tirer(4)}`;

const mdp = await bcrypt.hash("motdepasse123", 10);
const magasin = (await db.magasin.findFirst()) ?? (await db.magasin.create({ data: { nom: "Mon magasin" } }));
const admin = await db.user.upsert({
  where: { identifiant: "proprio" }, update: {},
  create: { magasinId: magasin.id, identifiant: "proprio", nom: "Propriétaire", role: "ADMIN", motDePasse: mdp,
    codeRecuperationHash: await bcrypt.hash(codeSecours.replace(/-/g, ""), 10) },
});
const p = await db.produit.create({ data: { magasinId: magasin.id, nom: "Robe wax", prix: 15000 } });
const a = await db.article.create({ data: { magasinId: magasin.id, produitId: p.id, statut: "EN_RAYON" } });
await db.mouvement.createMany({ data: [{ articleId: a.id, vers: "EN_STOCK", userId: admin.id }, { articleId: a.id, de: "EN_STOCK", vers: "EN_RAYON", userId: admin.id }] });

console.log("Propriétaire : identifiant « proprio », mot de passe « motdepasse123 » (à changer dès que possible).");
console.log("Code de secours du propriétaire (à garder en lieu sûr, affiché une seule fois) :", codeSecours);
console.log("Les vendeurs se créent dans l'écran Équipe.");
console.log("Code QR de l'article de test :", a.code);
await db.$disconnect();
