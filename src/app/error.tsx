"use client";
export default function Erreur({ reset }: { error: Error; reset: () => void }) {
  return <main className="page" style={{ paddingTop: 96, textAlign: "center" }}><h1>Une erreur est survenue</h1><p className="muted">Rien n&apos;est perdu. Réessaie, ou reviens à l&apos;accueil.</p>
    <button className="btn btn-plein" onClick={reset}>Réessayer</button><a className="lien" href="/">Retour à l&apos;accueil</a></main>;
}
