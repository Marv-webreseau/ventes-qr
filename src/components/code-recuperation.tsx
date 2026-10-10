"use client";
import { useState } from "react";
import { Copy, Check } from "lucide-react";

/** Affiche un code une seule fois, avec copie. */
export function CodeRecuperation({ code, onTermine, libelle }: { code: string; onTermine: () => void; libelle: string }) {
  const [copie, setCopie] = useState(false);
  return (
    <div className="carte">
      <h1>Ton code de récupération</h1>
      <p className="muted">Note-le sur papier ou prends-le en photo. Il t'aidera si tu oublies ton mot de passe. <b>Il ne sera plus affiché.</b></p>
      <div className="code-box" aria-label="Code de récupération">{code}</div>
      <button className="btn" onClick={async () => { await navigator.clipboard?.writeText(code).catch(() => {}); setCopie(true); }}>
        {copie ? <><Check size={18} /> Copié</> : <><Copy size={18} /> Copier le code</>}
      </button>
      <button className="btn btn-plein" onClick={onTermine}>{libelle}</button>
    </div>
  );
}
