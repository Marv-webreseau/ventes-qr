import { describe, it, expect } from "vitest";
import * as m from "@/domain/mot-de-passe";

describe("mots de passe", () => {
  it("refuse les mots de passe faibles", () => {
    expect(m.validerMotDePasse("abc1")).toBe("Au moins 8 caractères.");
    expect(m.validerMotDePasse("abcdefgh")).toContain("lettres et des chiffres");
    expect(m.validerMotDePasse("12345678")).toContain("lettres et des chiffres");
    expect(m.validerMotDePasse("motdepasse123")).toContain("trop simple");
    expect(m.validerMotDePasse("x".repeat(80) + "1")).toContain("72");
  });
  it("accepte un mot de passe correct", () => expect(m.validerMotDePasse("Soleil2026")).toBeNull());
});

describe("codes générés", () => {
  it("code de récupération : 3 groupes de 4, sans caractères ambigus", () => {
    for (let i = 0; i < 200; i++) {
      const c = m.genererCodeRecuperation();
      expect(c).toMatch(/^[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}$/);
    }
  });
  it("deux codes ne sont (presque) jamais identiques", () => {
    expect(new Set(Array.from({ length: 500 }, m.genererCodeRecuperation)).size).toBe(500);
  });
  it("mot de passe provisoire lisible", () => expect(m.genererMotDePasseProvisoire()).toMatch(/^[a-z2-9]{4}-[a-z2-9]{4}$/));
  it("la saisie du code tolère minuscules, espaces et tirets", () => {
    expect(m.normaliserCode(" k7qm 4pxd-92hb ")).toBe("K7QM4PXD92HB");
  });
});

describe("identifiants et téléphones", () => {
  it("normalise et valide l'identifiant", () => {
    expect(m.normaliserIdentifiant("  Awa ")).toBe("awa");
    expect(m.identifiantValide("awa.k")).toBe(true);
    expect(m.identifiantValide("a")).toBe(false);
    expect(m.identifiantValide("awa k")).toBe(false);
  });
  it("normalise le téléphone", () => {
    expect(m.normaliserTelephone("+229 01 23 45 67 89")).toBe("22901234567" + "89");
    expect(m.normaliserTelephone("00229012345678")).toBe("229012345678");
    expect(m.normaliserTelephone("12")).toBeNull();
  });
});

describe("verrouillage", () => {
  const t0 = new Date("2026-10-07T10:00:00Z");
  it("compte les échecs puis verrouille au 5e", () => {
    let e = 0, v: Date | null = null;
    for (let i = 1; i <= 4; i++) { ({ echecs: e, verrouilleJusqua: v } = m.apresEchec(e, t0)); expect(v).toBeNull(); expect(e).toBe(i); }
    ({ echecs: e, verrouilleJusqua: v } = m.apresEchec(e, t0));
    expect(v).not.toBeNull(); expect(e).toBe(0);
    expect(m.verrouActif(v, t0)).toBe(true);
    expect(m.minutesRestantes(v!, t0)).toBe(15);
  });
  it("le verrou expire", () => {
    const v = new Date(t0.getTime() + 15 * 60000);
    expect(m.verrouActif(v, new Date(t0.getTime() + 16 * 60000))).toBe(false);
  });
});
