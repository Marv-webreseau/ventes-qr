"use client";
export function BoutonImprimer() {
  return <button className="btn btn-plein no-print" style={{ maxWidth: 260 }} onClick={() => window.print()}>Imprimer les étiquettes</button>;
}
