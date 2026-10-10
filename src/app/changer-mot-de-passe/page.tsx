"use client";
import { useState } from "react";
import { signOut } from "next-auth/react";
import { CodeRecuperation } from "@/components/code-recuperation";

export default function ChangerMotDePasse() {
  const [erreur, setErreur] = useState("");
  const [attente, setAttente] = useState(false);
  const [fini, setFini] = useState<{ code: string | null } | null>(null);
  const reconnecter = () => signOut({ callbackUrl: "/connexion" });

  async function envoyer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (f.get("nouveau") !== f.get("confirmation")) return setErreur("Les deux mots de passe ne sont pas identiques.");
    setAttente(true); setErreur("");
    const r = await fetch("/api/compte/mot-de-passe", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ancien: f.get("ancien"), nouveau: f.get("nouveau") }),
    }).catch(() => null);
    setAttente(false);
    const d = r ? await r.json().catch(() => null) : null;
    if (!r?.ok) return setErreur(d?.message ?? "Pas de connexion. Réessaie.");
    setFini({ code: d.codeRecuperation ?? null });
  }

  if (fini?.code) return <main className="page"><CodeRecuperation code={fini.code} onTermine={reconnecter} libelle="J'ai noté mon code, me reconnecter" /></main>;
  if (fini) return (
    <main className="page"><div className="carte">
      <h1>Mot de passe changé</h1><p className="muted">Reconnecte-toi avec ton nouveau mot de passe.</p>
      <button className="btn btn-plein" onClick={reconnecter}>Me reconnecter</button>
    </div></main>
  );

  return (
    <main className="page" style={{ paddingTop: 48 }}>
      <div><h1>Choisis ton mot de passe</h1><p className="muted">Entre le mot de passe actuel (ou le mot de passe provisoire reçu), puis le nouveau.</p></div>
      <form className="carte" onSubmit={envoyer}>
        <div className="champ"><label htmlFor="ancien">Mot de passe actuel</label><input id="ancien" name="ancien" type="password" autoComplete="current-password" required /></div>
        <div className="champ"><label htmlFor="nouveau">Nouveau mot de passe</label><input id="nouveau" name="nouveau" type="password" autoComplete="new-password" required />
          <span className="muted">8 caractères minimum, avec des lettres et des chiffres.</span></div>
        <div className="champ"><label htmlFor="confirmation">Confirme le nouveau mot de passe</label><input id="confirmation" name="confirmation" type="password" autoComplete="new-password" required /></div>
        {erreur && <p className="avis avis-err" role="alert">{erreur}</p>}
        <button className="btn btn-plein" disabled={attente}>{attente ? "Enregistrement…" : "Enregistrer"}</button>
      </form>
      <a className="lien" href="/" style={{ alignSelf: "center" }}>Annuler</a>
    </main>
  );
}
