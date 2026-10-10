import Link from "next/link";
export default function NonTrouve() {
  return <main className="page" style={{ paddingTop: 96, textAlign: "center" }}><h1>Page introuvable</h1><p className="muted">Cette page n&apos;existe pas ou a été déplacée.</p>
    <Link className="btn btn-plein" href="/">Retour à l&apos;accueil</Link></main>;
}
