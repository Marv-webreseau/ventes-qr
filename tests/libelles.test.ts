import { describe, it, expect } from "vitest";
import { libelleMouvement } from "@/domain/libelles";

describe("parcours d'un article", () => {
  it("décrit chaque étape", () => {
    expect(libelleMouvement(null, "EN_STOCK")).toBe("Article créé");
    expect(libelleMouvement("EN_STOCK", "EN_RAYON")).toBe("Mis en rayon");
    expect(libelleMouvement("EN_RAYON", "VENDU")).toBe("Vendu");
    expect(libelleMouvement("VENDU", "RETOURNE")).toBe("Retour enregistré");
    expect(libelleMouvement("RETOURNE", "EN_RAYON")).toBe("Remis en rayon après contrôle");
    expect(libelleMouvement("VENDU", "EN_RAYON")).toBe("Vente annulée, remis en rayon");
    expect(libelleMouvement("EN_RAYON", "PERDU")).toBe("Signalé perdu");
  });
});
