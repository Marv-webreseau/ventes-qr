import { describe, it, expect } from "vitest";
import type { Statut } from "@prisma/client";
import { verifierTransition } from "@/domain/transitions";
import { baissePrixPct } from "@/domain/alertes";
import { ErreurMetier } from "@/domain/erreurs";

describe("cycle de vie d'un article", () => {
  it("autorise le parcours normal", () => {
    expect(verifierTransition("METTRE_EN_RAYON", "EN_STOCK", "ADMIN")).toBe("EN_RAYON");
    expect(verifierTransition("VENDRE", "EN_RAYON", "VENDEUR")).toBe("VENDU");
    expect(verifierTransition("RETOURNER", "VENDU", "VENDEUR")).toBe("RETOURNE");
    expect(verifierTransition("REMETTRE_EN_RAYON", "RETOURNE", "ADMIN")).toBe("EN_RAYON");
  });

  it("autorise la revente après retour", () => {
    verifierTransition("REMETTRE_EN_RAYON", "RETOURNE", "ADMIN");
    expect(verifierTransition("VENDRE", "EN_RAYON", "VENDEUR")).toBe("VENDU");
  });

  it.each<Statut>(["EN_STOCK", "VENDU", "RETOURNE", "ENDOMMAGE", "PERDU"])("refuse de vendre un article %s", (s) => {
    expect(() => verifierTransition("VENDRE", s, "VENDEUR")).toThrow(ErreurMetier);
  });

  it("donne un message clair pour un article déjà vendu", () => {
    expect(() => verifierTransition("VENDRE", "VENDU", "VENDEUR")).toThrow("Cet article a déjà été vendu.");
  });

  it("réserve certaines actions au propriétaire", () => {
    for (const a of ["METTRE_EN_RAYON", "REMETTRE_EN_RAYON", "ANNULER_VENTE"] as const) {
      expect(() => verifierTransition(a, a === "METTRE_EN_RAYON" ? "EN_STOCK" : "VENDU", "VENDEUR")).toThrow("réservée au propriétaire");
    }
  });

  it("n'accepte un retour que sur un article vendu", () => {
    expect(() => verifierTransition("RETOURNER", "EN_RAYON", "VENDEUR")).toThrow(ErreurMetier);
  });
});

describe("baisse de prix", () => {
  it("calcule le pourcentage", () => {
    expect(baissePrixPct(10000, 8000)).toBe(20);
    expect(baissePrixPct(10000, 10000)).toBe(0);
    expect(baissePrixPct(10000, 12000)).toBe(0);
  });
});
