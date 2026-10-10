"use client";
import { useCallback, useState } from "react";
import { CheckCircle2, AlertTriangle, Undo2, PackageX, SearchX, Keyboard } from "lucide-react";
import { Scanner } from "@/components/scanner";

type Article = { id: string; statut: string; produit: { nom: string; prix: number } };
type Mode = "retour" | "endommage" | "perdu";
type Etat =
  | { v: "scan"; essai: number; erreurCamera?: string }
  | { v: "fiche"; article: Article }
  | { v: "fin"; ok: boolean; titre: string; detail?: string };

const BLOQUE: Record<string, string> = {
  EN_STOCK: "Cet article n'est pas encore en rayon. Préviens le propriétaire.",
  RETOURNE: "Cet article a été retourné. Le propriétaire doit d'abord le remettre en rayon.",
  ENDOMMAGE: "Cet article est signalé endommagé. Il ne peut pas être vendu.",
  PERDU: "Cet article est signalé perdu. Il ne peut pas être vendu.",
};
const MOTIFS_RETOUR = ["Taille ou modèle", "Défaut", "Changement d'avis", "Autre"];
const TEXTES: Record<Mode, { titre: string; consigne: string; bouton: string; succes: string; echec: string }> = {
  retour: { titre: "Retour de l'article", consigne: "Pourquoi le client le rapporte-t-il ?", bouton: "Confirmer le retour", succes: "Retour enregistré", echec: "Retour non enregistré" },
  endommage: { titre: "Article endommagé", consigne: "Qu'est-ce qui est abîmé ? (facultatif)", bouton: "Signaler l'article endommagé", succes: "Signalement envoyé", echec: "Signalement non envoyé" },
  perdu: { titre: "Article perdu", consigne: "Dernier endroit où il était ? (facultatif)", bouton: "Signaler l'article perdu", succes: "Signalement envoyé", echec: "Signalement non envoyé" },
};
const fcfa = (n: number) => `${n.toLocaleString("fr-FR")} FCFA`;

export default function Vendeur() {
  const [etat, setEtat] = useState<Etat>({ v: "scan", essai: 0 });
  const [attente, setAttente] = useState(false);
  const [prix, setPrix] = useState(0);
  const [edition, setEdition] = useState(false);
  const [mode, setMode] = useState<Mode | null>(null);
  const [motif, setMotif] = useState("");
  const [erreurLocale, setErreurLocale] = useState("");
  const [saisie, setSaisie] = useState<string | null>(null); // saisie manuelle du code (QR abîmé)

  const relancer = () => {
    setEdition(false); setMode(null); setMotif(""); setErreurLocale(""); setSaisie(null);
    setEtat((e) => ({ v: "scan", essai: (e.v === "scan" ? e.essai : 0) + 1 }));
  };

  const trouve = useCallback(async (code: string) => {
    const r = await fetch(`/api/scan/${encodeURIComponent(code)}`).catch(() => null);
    if (!r?.ok) {
      const m = r ? (await r.json().catch(() => null))?.message : null;
      return setEtat({ v: "fin", ok: false, titre: "Article non trouvé", detail: m ?? "Pas de connexion. Réessaie." });
    }
    const { article } = await r.json();
    navigator.vibrate?.(60);
    setPrix(article.produit.prix);
    setEtat({ v: "fiche", article });
  }, []);
  const erreurCamera = useCallback((m: string) => setEtat({ v: "scan", essai: 99, erreurCamera: m }), []);

  async function appeler(a: Article, url: string, corps: unknown, succes: string, echec: string, detail: string) {
    setAttente(true);
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corps) }).catch(() => null);
    setAttente(false);
    if (!r?.ok) {
      const m = r ? (await r.json().catch(() => null))?.message : null;
      return setEtat({ v: "fin", ok: false, titre: echec, detail: m ?? "Pas de connexion. Réessaie." });
    }
    setEtat({ v: "fin", ok: true, titre: succes, detail });
  }

  const vendre = (a: Article) => appeler(a, "/api/ventes", { articleId: a.id, montant: prix }, "Vente enregistrée", "Vente non enregistrée", `${a.produit.nom} · ${fcfa(prix)}`);

  function envoyerMotif(a: Article) {
    if (!mode) return;
    const t = TEXTES[mode];
    if (mode === "retour" && !motif.trim()) return setErreurLocale("Indique le motif du retour.");
    setErreurLocale("");
    if (mode === "retour") return appeler(a, `/api/articles/${a.id}/retour`, { motif }, t.succes, t.echec, a.produit.nom);
    return appeler(a, `/api/articles/${a.id}/signalement`, { type: mode === "perdu" ? "PERDU" : "ENDOMMAGE", motif }, t.succes, t.echec, `${a.produit.nom} · le propriétaire est prévenu`);
  }

  const ouvrir = (m: Mode) => { setMode(m); setMotif(""); setErreurLocale(""); };

  if (etat.v === "fin") return (
    <main className="page"><div className={`resultat ${etat.ok ? "ok" : "ko"}`}>
      {etat.ok ? <CheckCircle2 size={72} strokeWidth={1.6} /> : <AlertTriangle size={72} strokeWidth={1.6} />}
      <h1>{etat.titre}</h1>{etat.detail && <p className="muted">{etat.detail}</p>}
      <button className="btn btn-plein" style={{ marginTop: 16 }} onClick={relancer}>Scanner un autre article</button>
      <a className="lien" href="/vendeur/journee">Voir ma journée</a>
    </div></main>
  );

  if (etat.v === "fiche") {
    const a = etat.article;
    if (mode) { const t = TEXTES[mode]; return (
      <main className="page"><section className="carte">
        <div><p className="muted">{a.produit.nom}</p><h1>{t.titre}</h1></div>
        <label htmlFor="motif" style={{ fontWeight: 600 }}>{t.consigne}</label>
        {mode === "retour" && <div className="chips" role="group" aria-label="Motifs fréquents">{MOTIFS_RETOUR.map((m) => (
          <button key={m} type="button" className={`chip ${motif === m ? "actif" : ""}`} onClick={() => setMotif(m)}>{m}</button>))}</div>}
        <textarea id="motif" value={motif} onChange={(e) => setMotif(e.target.value)} rows={3} maxLength={300} placeholder={mode === "retour" ? "Ou écris le motif" : "Détails"} />
        {erreurLocale && <p className="avis avis-err" role="alert">{erreurLocale}</p>}
        <button className="btn btn-plein" disabled={attente} onClick={() => envoyerMotif(a)}>{attente ? "Envoi…" : t.bouton}</button>
        <button className="lien" onClick={() => setMode(null)}>← Retour à l&apos;article</button>
      </section></main>
    ); }

    return (
      <main className="page"><section className="carte">
        <h1>{a.produit.nom}</h1>
        {a.statut === "EN_RAYON" && (<>
          {edition
            ? <input type="number" inputMode="numeric" value={prix} onChange={(e) => setPrix(Number(e.target.value))} aria-label="Prix en FCFA" autoFocus />
            : <div className="entete"><span className="prix">{fcfa(prix)}</span><button className="lien" onClick={() => setEdition(true)}>Changer le prix</button></div>}
          <button className="btn btn-plein" disabled={attente || prix <= 0} onClick={() => vendre(a)}>{attente ? "Enregistrement…" : "Confirmer la vente"}</button>
          <div className="actions-secondaires">
            <button className="btn" onClick={() => ouvrir("endommage")}><PackageX size={18} /> Endommagé</button>
            <button className="btn" onClick={() => ouvrir("perdu")}><SearchX size={18} /> Perdu</button>
          </div>
        </>)}
        {a.statut === "VENDU" && (<>
          <p className="avis avis-warn">Cet article a déjà été vendu.</p>
          <button className="btn btn-plein" onClick={() => ouvrir("retour")}><Undo2 size={20} /> Enregistrer un retour</button>
        </>)}
        {BLOQUE[a.statut] && <p className="avis avis-err">{BLOQUE[a.statut]}</p>}
        <button className="lien" onClick={relancer}>Annuler</button>
      </section></main>
    );
  }

  return (
    <main className="page">
      <h1>Scanner</h1>
      {etat.erreurCamera
        ? <p className="avis avis-err" role="alert">{etat.erreurCamera}</p>
        : <><Scanner key={etat.essai} onCode={trouve} onErreur={erreurCamera} /><p className="muted" style={{ textAlign: "center" }}>Place le QR code dans le cadre</p></>}

      {saisie === null ? (
        <button className="lien" style={{ alignSelf: "center" }} onClick={() => setSaisie("")}><Keyboard size={14} /> QR abîmé ? Saisir la référence</button>
      ) : (
        <form className="carte" onSubmit={(e) => { e.preventDefault(); if (saisie.trim()) trouve(saisie.trim()); }}>
          <label htmlFor="ref" style={{ fontWeight: 600 }}>Référence sur l&apos;étiquette</label>
          <input id="ref" value={saisie} onChange={(e) => setSaisie(e.target.value)} autoCapitalize="characters" autoComplete="off" spellCheck={false} placeholder="Ex. 7K2QX9" autoFocus />
          <button className="btn btn-plein" disabled={!saisie.trim()}>Chercher l&apos;article</button>
          <button type="button" className="lien" onClick={() => setSaisie(null)}>Annuler</button>
        </form>
      )}
    </main>
  );
}
