import type { Role, Statut } from "@prisma/client";
import { ErreurMetier } from "./erreurs";

export type Action =
  | "METTRE_EN_RAYON" | "VENDRE" | "RETOURNER" | "SIGNALER_ENDOMMAGE"
  | "SIGNALER_PERDU" | "REMETTRE_EN_RAYON" | "ANNULER_VENTE";

interface Regle { de: Statut[]; vers: Statut; roles: Role[] }

/** Seule source de vérité du cycle de vie d'un article (dossier de conception, §4). */
export const REGLES: Record<Action, Regle> = {
  METTRE_EN_RAYON:    { de: ["EN_STOCK"],                       vers: "EN_RAYON", roles: ["ADMIN"] },
  VENDRE:             { de: ["EN_RAYON"],                       vers: "VENDU",    roles: ["VENDEUR", "ADMIN"] },
  RETOURNER:          { de: ["VENDU"],                          vers: "RETOURNE", roles: ["VENDEUR", "ADMIN"] },
  SIGNALER_ENDOMMAGE: { de: ["EN_RAYON"],                       vers: "ENDOMMAGE", roles: ["VENDEUR", "ADMIN"] },
  SIGNALER_PERDU:     { de: ["EN_RAYON", "EN_STOCK"],           vers: "PERDU",    roles: ["VENDEUR", "ADMIN"] },
  REMETTRE_EN_RAYON:  { de: ["RETOURNE", "PERDU", "ENDOMMAGE"], vers: "EN_RAYON", roles: ["ADMIN"] },
  ANNULER_VENTE:      { de: ["VENDU"],                          vers: "EN_RAYON", roles: ["ADMIN"] },
};

const PHRASE_STATUT: Record<Statut, string> = {
  EN_STOCK: "n'est pas encore en rayon. Prévenez le propriétaire.",
  EN_RAYON: "est déjà en rayon.",
  VENDU: "a déjà été vendu.",
  RETOURNE: "a été retourné. Il doit d'abord être remis en rayon par le propriétaire.",
  ENDOMMAGE: "est signalé endommagé.",
  PERDU: "est signalé perdu.",
};

export function messageRefus(statutActuel: Statut): string {
  return `Cet article ${PHRASE_STATUT[statutActuel]}`;
}

/** Vérifie le rôle et l'état ; renvoie l'état d'arrivée ou lève une erreur lisible. */
export function verifierTransition(action: Action, statutActuel: Statut, role: Role): Statut {
  const regle = REGLES[action];
  if (!regle.roles.includes(role)) {
    throw new ErreurMetier("NON_AUTORISE", "Cette action est réservée au propriétaire.");
  }
  if (!regle.de.includes(statutActuel)) {
    throw new ErreurMetier("TRANSITION_REFUSEE", messageRefus(statutActuel));
  }
  return regle.vers;
}
