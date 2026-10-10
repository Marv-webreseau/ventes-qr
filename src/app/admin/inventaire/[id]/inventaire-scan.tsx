"use client";
import { useCallback, useState } from "react";
import Link from "next/link";
import { CheckCircle2, AlertTriangle, Keyboard } from "lucide-react";
import { Scanner } from "@/components/scanner";
import { cloturerInventaireAction } from "../actions";

type Passage = { cle: number; nom: string; type: "ok" | "deja" | "inattendu" | "erreur"; texte: string };
type Resultat = { abandonne: true } | { abandonne: false; scannes: number; attendus: number; manquants: { nom: string; ref: string }[]; inattendus: { nom: string; ref: string; statut: string }[] };

export function InventaireScan({ id, depart }: { id: string; depart: number }) {
  const [essai, setEssai] = useState(0);
  const [total, setTotal] = useState(depart);
  const [passages, setPassages] = useState<Passage[]>([]);
  const [camera, setCamera] = useState("");
  const [saisie, setSaisie] = useState<string | null>(null);
  const [resultat, setResultat] = useState<Resultat | null>(null);
  const [erreur, setErreur] = useState("");
  const [occupe, setOccupe] = useState(false);

  const ajouter = (p: Omit<Passage, "cle">) => setPassages((l) => [{ ...p, cle: Date.now() + Math.random() }, ...l].slice(0, 6));

  const compter = useCallback(async (code: string) => {
    const r = await fetch("/api/admin/inventaire/scan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ inventaireId: id, code }) }).catch(() => null);
    const d = r ? await r.json().catch(() => null) : null;
    if (!r?.ok) ajouter({ nom: "Non compté", type: "erreur", texte: d?.message ?? "Pas de connexion. Rescanne l'article." });
    else {
      setTotal(d.total); navigator.vibrate?.(40);
      ajouter(d.deja ? { nom: d.nom, type: "deja", texte: "Déjà compté" } : d.attendu ? { nom: d.nom, type: "ok", texte: "Compté" } : { nom: d.nom, type: "inattendu", texte: `Trouvé en rayon alors qu'il est ${d.etat}` });
    }
    setEssai((e) => e + 1); // relance la caméra pour l'article suivant
  }, [id]);
  const erreurCamera = useCallback((m: string) => setCamera(m), []);

  async function terminer(abandon: boolean) {
    if (!abandon && !confirm(`Terminer l'inventaire avec ${total} article(s) comptés ? Les articles en rayon non comptés seront signalés comme écart.`)) return;
    if (abandon && !confirm("Abandonner cet inventaire ? Rien ne sera signalé.")) return;
    setOccupe(true); setErreur("");
    const r = await cloturerInventaireAction(id, abandon);
    setOccupe(false);
    if ("erreur" in r && r.erreur) return setErreur(r.erreur);
    setResultat(r as Resultat);
  }

  if (resultat) return (
    <main className="page large">
      <h1>Inventaire terminé</h1>
      {resultat.abandonne ? <p className="avis avis-warn">Inventaire abandonné : aucun écart enregistré.</p> : (<>
        <div className="chiffres">
          <div className="carte chiffre"><span className="muted">Comptés</span><b>{resultat.scannes}</b></div>
          <div className="carte chiffre"><span className="muted">Attendus en rayon</span><b>{resultat.attendus}</b></div>
          <div className="carte chiffre"><span className="muted">Manquants</span><b>{resultat.manquants.length}</b></div>
          <div className="carte chiffre"><span className="muted">Inattendus</span><b>{resultat.inattendus.length}</b></div>
        </div>
        {resultat.manquants.length + resultat.inattendus.length === 0
          ? <div className="carte vide"><CheckCircle2 size={40} color="var(--ok)" /><p><b>Aucun écart.</b> Le rayon correspond au stock.</p></div>
          : <p className="avis avis-warn">Des écarts ont été signalés dans <Link href="/admin/alertes" className="lien">Alertes</Link>. Ce sont des points à vérifier, pas des accusations.</p>}
        {resultat.manquants.length > 0 && <section className="carte"><h2 className="h2">Attendus mais non retrouvés</h2><ul className="liste">{resultat.manquants.map((m, i) => <li key={i} className="ligne-alerte"><b>{m.nom}</b><span className="muted">Réf. {m.ref}</span></li>)}</ul></section>}
        {resultat.inattendus.length > 0 && <section className="carte"><h2 className="h2">Trouvés en rayon mais ne devant pas y être</h2><ul className="liste">{resultat.inattendus.map((m, i) => <li key={i} className="ligne-alerte"><div><b>{m.nom}</b><span className="muted">Réf. {m.ref}</span></div><span className="pastille pastille-warn">{m.statut}</span></li>)}</ul></section>}
      </>)}
      <Link className="btn btn-plein" href="/admin/inventaire" style={{ maxWidth: 280 }}>Retour aux inventaires</Link>
    </main>
  );

  return (
    <main className="page">
      <div className="entete"><h1>Inventaire</h1><span className="pastille pastille-ok" aria-live="polite">{total} compté(s)</span></div>
      {camera ? <p className="avis avis-err" role="alert">{camera}</p>
        : <><Scanner key={essai} onCode={compter} onErreur={erreurCamera} /><p className="muted" style={{ textAlign: "center" }}>Scanne chaque article du rayon, l&apos;un après l&apos;autre</p></>}

      {passages.length > 0 && <ul className="liste" aria-live="polite">{passages.map((p) => (
        <li key={p.cle} className={`passage passage-${p.type}`}>
          {p.type === "ok" || p.type === "deja" ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
          <span><b>{p.nom}</b><span className="muted">{p.texte}</span></span></li>))}</ul>}

      {saisie === null ? <button className="lien" style={{ alignSelf: "center" }} onClick={() => setSaisie("")}><Keyboard size={14} /> QR abîmé ? Saisir la référence</button>
        : <form className="carte" onSubmit={(e) => { e.preventDefault(); if (saisie.trim()) { compter(saisie.trim()); setSaisie(""); } }}>
            <input value={saisie} onChange={(e) => setSaisie(e.target.value)} placeholder="Référence de l'étiquette" autoCapitalize="characters" autoComplete="off" aria-label="Référence de l'étiquette" />
            <button className="btn btn-plein" disabled={!saisie.trim()}>Compter</button>
            <button type="button" className="lien" onClick={() => setSaisie(null)}>Fermer</button></form>}

      {erreur && <p className="avis avis-err" role="alert">{erreur}</p>}
      <button className="btn btn-plein" disabled={occupe || total === 0} onClick={() => terminer(false)}>Terminer l&apos;inventaire</button>
      <button className="lien" style={{ alignSelf: "center" }} disabled={occupe} onClick={() => terminer(true)}>Abandonner</button>
    </main>
  );
}
