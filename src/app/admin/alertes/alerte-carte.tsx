"use client";
import { useState, useTransition } from "react";
import { traiterAlerteAction } from "./actions";

export function AlerteCarte({ id }: { id: string }) {
  const [note, setNote] = useState("");
  const [erreur, setErreur] = useState("");
  const [occupe, demarrer] = useTransition();
  const traiter = (statut: "ECARTEE" | "CONFIRMEE") => demarrer(async () => {
    setErreur("");
    const r = await traiterAlerteAction(id, statut, note);
    if ("erreur" in r && r.erreur) setErreur(r.erreur);
  });
  return (
    <div className="alerte-actions">
      <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="Note (facultatif)" aria-label="Note sur cette alerte" />
      <div className="ligne">
        <button className="btn" style={{ minHeight: 48 }} disabled={occupe} onClick={() => traiter("ECARTEE")}>Rien d&apos;anormal</button>
        <button className="btn btn-plein" style={{ minHeight: 48, fontSize: 16 }} disabled={occupe} onClick={() => traiter("CONFIRMEE")}>Confirmer le problème</button>
      </div>
      {erreur && <p className="avis avis-err" role="alert">{erreur}</p>}
    </div>
  );
}
