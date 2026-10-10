"use client";
import { useState, useTransition } from "react";
import { modifierVendeurAction } from "../actions";

export function FormulaireVendeur({ id, nom, telephone }: { id: string; nom: string; telephone: string }) {
  const [n, setN] = useState(nom), [t, setT] = useState(telephone);
  const [msg, setMsg] = useState(""), [ok, setOk] = useState(false);
  const [occupe, go] = useTransition();
  return (
    <form className="carte" onSubmit={(e) => { e.preventDefault(); go(async () => { const r = await modifierVendeurAction(id, n, t); setOk(!("erreur" in r)); setMsg("erreur" in r ? r.erreur! : "Enregistré."); }); }}>
      <h2 className="h2">Informations</h2>
      <div className="champ"><label htmlFor="n">Nom</label><input id="n" value={n} onChange={(e) => setN(e.target.value)} required /></div>
      <div className="champ"><label htmlFor="t">Numéro WhatsApp (facultatif)</label><input id="t" value={t} onChange={(e) => setT(e.target.value)} inputMode="tel" placeholder="+229…" /></div>
      {msg && <p className={`avis ${ok ? "" : "avis-err"}`} style={ok ? { background: "var(--ok-f)", color: "#166534" } : undefined} role="status">{msg}</p>}
      <button className="btn btn-plein" style={{ maxWidth: 260 }} disabled={occupe}>Enregistrer</button>
    </form>
  );
}
