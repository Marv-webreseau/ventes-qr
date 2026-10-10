export type CodeErreur =
  | "NON_AUTORISE" | "COMPTE_DESACTIVE" | "INTROUVABLE" | "TRANSITION_REFUSEE"
  | "CONFLIT" | "DONNEE_INVALIDE" | "VERROUILLE";

const STATUT_HTTP: Record<CodeErreur, number> = {
  NON_AUTORISE: 403, COMPTE_DESACTIVE: 401, INTROUVABLE: 404,
  TRANSITION_REFUSEE: 409, CONFLIT: 409, DONNEE_INVALIDE: 400, VERROUILLE: 429,
};

/** Erreur attendue : son message est déjà écrit pour l'utilisateur final. */
export class ErreurMetier extends Error {
  readonly statutHttp: number;
  constructor(public readonly code: CodeErreur, message: string) {
    super(message);
    this.statutHttp = STATUT_HTTP[code];
  }
}
