import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { vendre, retourner, remettreEnRayon, creerArticles } from "@/services/articles.service";

// Test d'intégration : nécessite une base PostgreSQL de test (DATABASE_URL) avec le schéma et protections.sql appliqués.
describe.skipIf(!process.env.DATABASE_URL)("concurrence (base réelle)", () => {
  const tag = `t${Date.now()}`;
  let magasinId = "", admin = { id: "", role: "ADMIN" as const }, v1 = { id: "", role: "VENDEUR" as const }, v2 = { id: "", role: "VENDEUR" as const }, produitId = "";

  beforeAll(async () => {
    const m = await db.magasin.create({ data: { nom: tag } }); magasinId = m.id;
    const mk = (nom: string, role: "ADMIN" | "VENDEUR") => db.user.create({ data: { magasinId, nom, identifiant: `${nom}${tag}`, motDePasse: "x", role } });
    admin.id = (await mk("admin", "ADMIN")).id; v1.id = (await mk("v1", "VENDEUR")).id; v2.id = (await mk("v2", "VENDEUR")).id;
    produitId = (await db.produit.create({ data: { magasinId, nom: "Test", prix: 10000 } })).id;
  });
  afterAll(async () => { await db.$disconnect(); });

  const nouvelArticle = async () => {
    await creerArticles(admin, produitId, 1, true);
    return db.article.findFirstOrThrow({ where: { produitId }, orderBy: { creeLe: "desc" } });
  };

  it("deux vendeurs scannent en même temps : une seule vente", async () => {
    const a = await nouvelArticle();
    const r = await Promise.allSettled([vendre(v1, a.id), vendre(v2, a.id)]);
    expect(r.filter((x) => x.status === "fulfilled")).toHaveLength(1);
    expect(await db.vente.count({ where: { articleId: a.id, statut: "VALIDE" } })).toBe(1);
  });

  it("vente, retour, remise en rayon, revente : tout est tracé", async () => {
    const a = await nouvelArticle();
    await vendre(v1, a.id); await retourner(v1, a.id, "Taille"); await remettreEnRayon(admin, a.id); await vendre(v2, a.id);
    const mv = await db.mouvement.findMany({ where: { articleId: a.id }, orderBy: { date: "asc" } });
    expect(mv.map((m) => m.vers)).toEqual(["EN_STOCK", "EN_RAYON", "VENDU", "RETOURNE", "EN_RAYON", "VENDU"]);
  });

  it("le journal est en ajout seul", async () => {
    const m = await db.mouvement.findFirstOrThrow({ where: { userId: admin.id } });
    await expect(db.mouvement.delete({ where: { id: m.id } })).rejects.toThrow();
  });

  it("une baisse de prix de plus de 20 % crée une alerte", async () => {
    const a = await nouvelArticle();
    await vendre(v1, a.id, 7000);
    expect(await db.anomalie.count({ where: { articleId: a.id, type: "BAISSE_PRIX" } })).toBe(1);
  });

  it("un compte désactivé ne peut plus vendre", async () => {
    const a = await nouvelArticle();
    await db.user.update({ where: { id: v2.id }, data: { actif: false } });
    await expect(vendre(v2, a.id)).rejects.toThrow("Compte désactivé");
  });
});
