"use client";
import { useState } from "react";
import { CodeRecuperation } from "@/components/code-recuperation";

export default function MotDePasseOublie() {
  const [erreur, setErreur] = useState("");
  const [attente, setAttente] = useState(false);
  const [nouveauCode, setNouveauCode] = useState<string | null>(null);

  async function envoyer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (f.get("nouveau") !== f.get("confirmation")) return setErreur("Les deux mots de passe ne sont pas identiques.");
    setAttente(true); setErreur("");
    const r = await fetch("/api/recuperation", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifiant: f.get("identifiant"), code: f.get("code"), nouveau: f.get("nouveau") }),
    }).catch(() => null);
    setAttente(false);
    const d = r ? await r.json().catch(() => null) : null;
    if (!r?.ok) return setErreur(d?.message ?? "Pas de connexion. Réessaie.");
    setNouveauCode(d.codeRecuperation);
  }

  if (nouveauCode) return <main className="page"><CodeRecuperation code={nouveauCode} onTermine={() => { window.location.href = "/connexion"; }} libelle="J'ai noté mon nouveau code, me connecter" /></main>;

  return (
    <main className="page" style={{ paddingTop: 48 }}>
      <div><h1>Mot de passe oublié</h1><p className="muted">Entre ton identifiant et ton code de récupération, puis choisis un nouveau mot de passe.</p></div>
      <form className="carte" onSubmit={envoyer}>
        <div className="champ"><label htmlFor="identifiant">Identifiant</label><input id="identifiant" name="identifiant" autoCapitalize="none" autoCorrect="off" spellCheck={false} required /></div>
        <div className="champ"><label htmlFor="code">Code de récupération</label><input id="code" name="code" placeholder="XXXX-XXXX-XXXX" autoCapitalize="characters" autoComplete="off" required /></div>
        <div className="champ"><label htmlFor="nouveau">Nouveau mot de passe</label><input id="nouveau" name="nouveau" type="password" autoComplete="new-password" required /></div>
        <div className="champ"><label htmlFor="confirmation">Confirme le mot de passe</label><input id="confirmation" name="confirmation" type="password" autoComplete="new-password" required /></div>
        {erreur && <p className="avis avis-err" role="alert">{erreur}</p>}
        <button className="btn btn-plein" disabled={attente}>{attente ? "Vérification…" : "Changer mon mot de passe"}</button>
      </form>
      <p className="muted">Tu n'as plus ton code ? Demande au propriétaire de réinitialiser ton mot de passe.</p>
      <a className="lien" href="/connexion">Retour à la connexion</a>
    </main>
  );
}
