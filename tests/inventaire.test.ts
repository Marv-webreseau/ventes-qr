import { describe, it, expect } from "vitest";
import { calculerEcarts } from "@/domain/inventaire";

describe("inventaire", () => {
  it("aucun écart", () => expect(calculerEcarts(["a", "b"], ["b", "a"])).toEqual({ manquants: [], inattendus: [] }));
  it("détecte les manquants", () => expect(calculerEcarts(["a", "b", "c"], ["a"]).manquants).toEqual(["b", "c"]));
  it("détecte les articles inattendus (vendus, retournés…) trouvés en rayon", () => expect(calculerEcarts(["a"], ["a", "x"]).inattendus).toEqual(["x"]));
  it("ignore les doublons de scan", () => expect(calculerEcarts(["a"], ["a", "a"])).toEqual({ manquants: [], inattendus: [] }));
});
