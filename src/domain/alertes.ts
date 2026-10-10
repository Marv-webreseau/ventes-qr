/** Baisse de prix en pourcentage (0 si pas de baisse). Fonction pure, testable. */
export function baissePrixPct(prixCatalogue: number, montant: number): number {
  if (prixCatalogue <= 0 || montant >= prixCatalogue) return 0;
  return ((prixCatalogue - montant) / prixCatalogue) * 100;
}
export const fcfa = (n: number) => `${n.toLocaleString("fr-FR")} FCFA`;
