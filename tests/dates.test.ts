import { describe, it, expect } from "vitest";
import { debutDuJour, debutPeriode, periodeValide } from "@/domain/dates";

describe("jour du magasin (UTC+1)", () => {
  it("23h30 UTC est déjà le lendemain au Bénin", () => {
    expect(debutDuJour(new Date("2026-10-08T23:30:00Z")).toISOString()).toBe("2026-10-08T23:00:00.000Z");
  });
  it("10h UTC appartient au jour commencé la veille à 23h UTC", () => {
    expect(debutDuJour(new Date("2026-10-08T10:00:00Z")).toISOString()).toBe("2026-10-07T23:00:00.000Z");
  });
  it("périodes", () => {
    const n = new Date("2026-10-08T10:00:00Z");
    expect(debutPeriode("jour", n).toISOString()).toBe("2026-10-07T23:00:00.000Z");
    expect(debutPeriode("7j", n).toISOString()).toBe("2026-10-01T23:00:00.000Z");
  });
  it("période inconnue => 7 jours", () => expect(periodeValide("zzz")).toBe("7j"));
});
