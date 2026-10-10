import type { Statut } from "@prisma/client";

export const STATUT_ARTICLE: Record<Statut, { label: string; classe: string }> = {
  EN_STOCK: { label: "En stock", classe: "pastille-neutre" },
  EN_RAYON: { label: "En rayon", classe: "pastille-ok" },
  VENDU: { label: "Vendu", classe: "pastille-neutre" },
  RETOURNE: { label: "Retourné", classe: "pastille-warn" },
  ENDOMMAGE: { label: "Endommagé", classe: "pastille-err" },
  PERDU: { label: "Perdu", classe: "pastille-err" },
};

/** Phrase lisible pour une ligne du parcours d'un article. */
export function libelleMouvement(de: Statut | null, vers: Statut): string {
  if (de === null) return "Article créé";
  if (vers === "VENDU") return "Vendu";
  if (vers === "RETOURNE") return "Retour enregistré";
  if (vers === "ENDOMMAGE") return "Signalé endommagé";
  if (vers === "PERDU") return "Signalé perdu";
  if (vers === "EN_RAYON") return de === "EN_STOCK" ? "Mis en rayon" : de === "VENDU" ? "Vente annulée, remis en rayon" : "Remis en rayon après contrôle";
  return "Changement d'état";
}

export const ACTION_COMPTE: Record<string, string> = {
  COMPTE_CREE: "Compte créé", COMPTE_MODIFIE: "Informations modifiées", MOT_DE_PASSE_REINITIALISE: "Mot de passe réinitialisé par le propriétaire",
  MOT_DE_PASSE_CHANGE: "Mot de passe changé par le vendeur", MOT_DE_PASSE_RECUPERE_PAR_CODE: "Compte récupéré avec le code de récupération",
  COMPTE_DESACTIVE: "Compte désactivé", COMPTE_REACTIVE: "Compte réactivé",
};
