// Crée le VRAI compte propriétaire (à utiliser en production à la place du seed). Le mot de passe n'est jamais affiché ni enregistré en clair.
import readline from "node:readline";
import { randomInt } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const ALPHA = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const tirer = (n) => Array.from({ length: n }, () => ALPHA[randomInt(ALPHA.length)]).join("");

function demander(question, secret = false) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (secret) rl._writeToOutput = (s) => process.stdout.write(s.includes(question) ? s : "*");
    rl.question(question, (r) => { rl.close(); if (secret) process.stdout.write("\n"); resolve(r.trim()); });
  });
}

const db = new PrismaClient();
try {
  console.log("Création du compte propriétaire\n");
  const magasinExistant = await db.magasin.findFirst();
  const nomMagasin = magasinExistant ? magasinExistant.nom : (await demander("Nom du magasin : ")) || "Mon magasin";
  const nom = (await demander("Ton nom : ")) || "Propriétaire";
  const identifiant = (await demander("Identifiant de connexion (ex. marvin) : ")).toLowerCase();
  if (!/^[a-z0-9._-]{3,30}$/.test(identifiant)) throw new Error("Identifiant invalide : 3 à 30 caractères (lettres, chiffres, point, tiret).");
  if (await db.user.findUnique({ where: { identifiant } })) throw new Error("Cet identifiant existe déjà.");

  const mdp = await demander("Mot de passe (10 caractères minimum, lettres et chiffres) : ", true);
  if (mdp.length < 10 || mdp.length > 72 || !/[A-Za-z]/.test(mdp) || !/\d/.test(mdp)) throw new Error("Mot de passe trop faible : 10 à 72 caractères avec des lettres et des chiffres.");
  if (mdp !== (await demander("Confirme le mot de passe : ", true))) throw new Error("Les deux mots de passe ne sont pas identiques.");

  const code = `${tirer(4)}-${tirer(4)}-${tirer(4)}`;
  const magasin = magasinExistant ?? (await db.magasin.create({ data: { nom: nomMagasin } }));
  await db.user.create({ data: {
    magasinId: magasin.id, nom, identifiant, role: "ADMIN", motDePasse: await bcrypt.hash(mdp, 12),
    codeRecuperationHash: await bcrypt.hash(code.replace(/-/g, ""), 12),
  } });
  console.log(`\nCompte créé : « ${identifiant} ».`);
  console.log(`Code de secours (affiché UNE SEULE FOIS, note-le sur papier, en lieu sûr) : ${code}`);
} catch (e) {
  console.error("\nErreur :", e.message);
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
