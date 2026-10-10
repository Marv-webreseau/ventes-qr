"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { annulerVenteAction } from "../actions";

export function AnnulerVente({ venteId }: { venteId: string }) {
  const [ouvert, setOuvert] = useState(false);
  const [motif, setMotif] = useState("");
  const [erreur, setErreur] = useState("");
  const [occupe, go] = useTransition();
  const router = useRouter();

  if (!ouvert) return <button className="btn" onClick={() => setOuvert(true)}>Annuler cette vente</button>;
  return (
    <div className="carte" style={{ borderLeft: "4px solid var(--err)" }}>
      <h2 className="h2">Annuler la vente</h2>
      <p className="muted">L&apos;article revient en rayon et la vente ne compte plus dans le chiffre d&apos;affaires. L&apos;historique est conservé.</p>
      <label htmlFor="motif" style={{ fontWeight: 600 }}>Motif (obligatoire)</label>
      <textarea id="motif" rows={3} maxLength={300} value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Ex. erreur de scan, mauvais prix" />
      {erreur && <p className="avis avis-err" role="alert">{erreur}</p>}
      <div className="ligne">
        <button className="btn btn-plein" style={{ background: "var(--err)", borderColor: "var(--err)", flex: 1 }} disabled={occupe || !motif.trim()}
          onClick={() => go(async () => { const r = await annulerVenteAction(venteId, motif); if ("erreur" in r && r.erreur) setErreur(r.erreur); else router.refresh(); })}>
          {occupe ? "Annulation…" : "Confirmer l'annulation"}</button>
        <button className="btn" style={{ flex: 1 }} onClick={() => setOuvert(false)}>Garder la vente</button>
      </div>
    </div>
  );
}
