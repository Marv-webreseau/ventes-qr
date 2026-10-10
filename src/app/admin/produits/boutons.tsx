"use client";
import { useState, useTransition } from "react";
import { mettreEnRayonLotAction, remettreEnRayonAction } from "./actions";

export function BoutonRemise({ articleId }: { articleId: string }) {
  const [erreur, setErreur] = useState("");
  const [occupe, go] = useTransition();
  return (
    <span className="remise">
      <button className="btn" style={{ width: "auto", minHeight: 44, padding: "0 16px", fontSize: 15 }} disabled={occupe}
        onClick={() => go(async () => { const r = await remettreEnRayonAction(articleId); if ("erreur" in r) setErreur(r.erreur); })}>
        {occupe ? "…" : "Remettre en rayon"}
      </button>
      {erreur && <span className="muted" role="alert" style={{ color: "var(--err)" }}>{erreur}</span>}
    </span>
  );
}

export function FormulaireLot({ produitId, enStock }: { produitId: string; enStock: number }) {
  const [n, setN] = useState(enStock);
  const [msg, setMsg] = useState("");
  const [occupe, go] = useTransition();
  return (
    <div className="ligne" style={{ alignItems: "center" }}>
      <input type="number" min={1} max={enStock} value={n} onChange={(e) => setN(Number(e.target.value))} aria-label="Nombre d'articles à mettre en rayon" style={{ width: 88, padding: 10 }} />
      <button className="btn" style={{ width: "auto", minHeight: 44, padding: "0 16px", fontSize: 15 }} disabled={occupe || n < 1}
        onClick={() => go(async () => { const r = await mettreEnRayonLotAction(produitId, n); setMsg("erreur" in r ? r.erreur! : `${r.n} article(s) en rayon`); })}>
        Mettre en rayon
      </button>
      {msg && <span className="muted" role="status">{msg}</span>}
    </div>
  );
}
