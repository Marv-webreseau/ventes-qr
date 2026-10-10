"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { ScanLine, Eye, EyeOff, Zap, History, ShieldCheck } from "lucide-react";

export default function Connexion() {
  const [erreur, setErreur] = useState("");
  const [attente, setAttente] = useState(false);
  const [visible, setVisible] = useState(false);

  async function envoyer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setAttente(true);
    setErreur("");
    const r = await signIn("credentials", { identifiant: f.get("identifiant"), motDePasse: f.get("mdp"), redirect: false }).catch(() => null);
    if (!r || r.error) {
      setErreur(!r ? "Pas de connexion. Réessaie." : r.error === "VERROUILLE" ? "Trop d'essais. Réessaie dans 15 minutes." : "Identifiant ou mot de passe incorrect.");
      setAttente(false);
      return;
    }
    window.location.href = "/";
  }

  return (
    <main className="cx">
      <section className="cx-visuel" aria-hidden="true">
        <div className="cx-marque"><span className="cx-logo"><ScanLine size={22} /></span>Ventes QR</div>
        <div className="cx-accroche">
          <h2>Chaque vente, en temps réel.</h2>
          <ul className="cx-points">
            <li><Zap size={18} /> Une vente enregistrée en quelques secondes</li>
            <li><History size={18} /> Le parcours de chaque article, conservé</li>
            <li><ShieldCheck size={18} /> Les anomalies signalées, jamais d'accusation</li>
          </ul>
        </div>
      </section>

      <section className="cx-formulaire">
        <form className="cx-boite" onSubmit={envoyer}>
          <div>
            <h1>Content de te revoir</h1>
            <p className="muted">Connecte-toi pour suivre tes ventes.</p>
          </div>

          <div className="champ">
            <label htmlFor="identifiant">Identifiant</label>
            <input id="identifiant" name="identifiant" type="text" autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} required />
          </div>

          <div className="champ">
            <label htmlFor="mdp">Mot de passe</label>
            <div className="champ-mdp">
              <input id="mdp" name="mdp" type={visible ? "text" : "password"} autoComplete="current-password" required />
              <button type="button" className="oeil" onClick={() => setVisible(!visible)} aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}>
                {visible ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {erreur && <p className="avis avis-err" role="alert">{erreur}</p>}

          <button className="btn btn-plein" disabled={attente}>{attente ? "Connexion…" : "Se connecter"}</button>
          <a className="lien" href="/mot-de-passe-oublie" style={{ textAlign: "center" }}>Mot de passe oublié ?</a>
        </form>
      </section>
    </main>
  );
}
