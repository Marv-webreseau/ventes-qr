import { randomInt } from "node:crypto";

export const MAX_ECHECS = 5;
export const VERROU_MINUTES = 15;

// Sans I, L, O, 0, 1 : impossibles à confondre à la lecture ou sur une photo.
const MAJ = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const MIN = "abcdefghjkmnpqrstuvwxyz23456789";
const tirer = (n: number, alphabet: string) => Array.from({ length: n }, () => alphabet[randomInt(alphabet.length)]).join("");

export const genererCodeRecuperation = () => [tirer(4, MAJ), tirer(4, MAJ), tirer(4, MAJ)].join("-");
export const genererMotDePasseProvisoire = () => `${tirer(4, MIN)}-${tirer(4, MIN)}`;
export const normaliserCode = (c: string) => c.toUpperCase().replace(/[^A-Z0-9]/g, "");
export const normaliserIdentifiant = (s: string) => s.trim().toLowerCase();

const TROP_SIMPLES = ["motdepasse1", "motdepasse123", "password1", "password123", "azerty123", "12345678"];

/** Renvoie le message d'erreur à afficher, ou null si le mot de passe est acceptable. */
export function validerMotDePasse(mdp: string): string | null {
  if (mdp.length < 8) return "Au moins 8 caractères.";
  if (mdp.length > 72) return "72 caractères au maximum.";
  if (!/[A-Za-z]/.test(mdp) || !/\d/.test(mdp)) return "Mélange des lettres et des chiffres.";
  if (TROP_SIMPLES.includes(mdp.toLowerCase())) return "Ce mot de passe est trop simple.";
  return null;
}

export const identifiantValide = (s: string) => /^[a-z0-9._-]{3,30}$/.test(s);

/** Garde les chiffres (indicatif compris). Renvoie null si le numéro est inutilisable. */
export function normaliserTelephone(brut: string): string | null {
  let d = brut.replace(/[^\d]/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  return d.length >= 8 && d.length <= 15 ? d : null;
}

export const verrouActif = (jusqua: Date | null, maintenant = new Date()) => !!jusqua && jusqua > maintenant;
export const minutesRestantes = (jusqua: Date, maintenant = new Date()) => Math.max(1, Math.ceil((jusqua.getTime() - maintenant.getTime()) / 60000));

/** Après un échec : compteur à jour, ou verrouillage de 15 minutes au 5e échec. */
export function apresEchec(echecs: number, maintenant = new Date()) {
  const n = echecs + 1;
  return n >= MAX_ECHECS
    ? { echecs: 0, verrouilleJusqua: new Date(maintenant.getTime() + VERROU_MINUTES * 60000) }
    : { echecs: n, verrouilleJusqua: null };
}
