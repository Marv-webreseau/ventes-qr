/** Le magasin fonctionne à l'heure du Bénin (UTC+1, sans changement d'heure). « Aujourd'hui » se calcule dans ce fuseau, quel que soit le serveur. */
const DECALAGE_MS = 3_600_000;
const FUSEAU = "Africa/Porto-Novo";

export type Periode = "jour" | "7j" | "30j";
export const PERIODES: Record<Periode, string> = { jour: "Aujourd'hui", "7j": "7 derniers jours", "30j": "30 derniers jours" };
export const periodeValide = (p?: string): Periode => (p === "jour" || p === "7j" || p === "30j" ? p : "7j");

export function debutDuJour(maintenant = new Date()): Date {
  const local = new Date(maintenant.getTime() + DECALAGE_MS);
  local.setUTCHours(0, 0, 0, 0);
  return new Date(local.getTime() - DECALAGE_MS);
}
export function debutPeriode(p: Periode, maintenant = new Date()): Date {
  const jours = p === "jour" ? 0 : p === "7j" ? 6 : 29;
  return new Date(debutDuJour(maintenant).getTime() - jours * 86_400_000);
}
export const heure = (d: Date) => d.toLocaleTimeString("fr-FR", { timeZone: FUSEAU, hour: "2-digit", minute: "2-digit" });
export const dateCourte = (d: Date) => d.toLocaleDateString("fr-FR", { timeZone: FUSEAU, day: "2-digit", month: "2-digit", year: "numeric" });
export const dateHeure = (d: Date) => `${dateCourte(d)} ${heure(d)}`;
