"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { definirProduitActifAction } from "../actions";

export function Archiver({ id, actif }: { id: string; actif: boolean }) {
  const [erreur, setErreur] = useState("");
  const [occupe, go] = useTransition();
  const router = useRouter();
  return (
    <div className="carte">
      <h2 className="h2">{actif ? "Ne plus vendre ce produit" : "Produit archivé"}</h2>
      <p className="muted">{actif ? "L'archivage le retire du catalogue. L'historique des ventes et des articles est conservé. Il faut d'abord qu'il ne reste aucun article en stock ni en rayon." : "Ce produit n'apparaît plus dans le catalogue. Réactive-le pour créer de nouveaux articles."}</p>
      {erreur && <p className="avis avis-err" role="alert">{erreur}</p>}
      <button className="btn" style={{ maxWidth: 260 }} disabled={occupe}
        onClick={() => { if (actif && !confirm("Archiver ce produit ?")) return; go(async () => { const r = await definirProduitActifAction(id, !actif); if ("erreur" in r && r.erreur) setErreur(r.erreur); else router.refresh(); }); }}>
        {actif ? "Archiver le produit" : "Réactiver le produit"}</button>
    </div>
  );
}
