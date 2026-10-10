import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { exigerSession } from "@/lib/session";
import { db } from "@/lib/db";
import { dateHeure } from "@/domain/dates";
import { AlerteCarte } from "./alerte-carte";

export const dynamic = "force-dynamic";
const TYPE = {
  BAISSE_PRIX: "Prix inférieur au catalogue", RETOURS_REPETES: "Retours répétés", RAFALE_VENTES: "Ventes en rafale",
  STOCK_BAS: "Stock bas", ARTICLE_A_VERIFIER: "Article à vérifier", ECART_INVENTAIRE: "Écart d'inventaire",
} as const;
const ETAT = { A_VERIFIER: ["À vérifier", "pastille-warn"], ECARTEE: ["Rien d'anormal", "pastille-neutre"], CONFIRMEE: ["Confirmée", "pastille-err"] } as const;

export default async function Alertes() {
  const s = await exigerSession();
  const [ouvertes, traitees] = await Promise.all([
    db.anomalie.findMany({ where: { magasinId: s.user.magasinId, statut: "A_VERIFIER" }, orderBy: { creeLe: "desc" } }),
    db.anomalie.findMany({ where: { magasinId: s.user.magasinId, statut: { not: "A_VERIFIER" } }, orderBy: { traiteeLe: "desc" }, take: 20 }),
  ]);

  return (
    <main className="page large">
      <h1>Alertes</h1>
      <p className="muted">Le système signale ce qui sort de l&apos;ordinaire. Une alerte n&apos;est jamais une accusation : à toi de juger.</p>

      {ouvertes.length === 0 ? (
        <div className="carte vide"><CheckCircle2 size={40} color="var(--ok)" /><p><b>Rien à vérifier.</b></p><p className="muted">Les nouvelles alertes apparaîtront ici et dans le menu.</p></div>
      ) : (
        <section className="grille-alertes">{ouvertes.map((a) => (
          <article key={a.id} className="carte alerte">
            <div className="entete"><span className="pastille pastille-warn">{TYPE[a.type]}</span><span className="muted">{dateHeure(a.creeLe)}</span></div>
            <p>{a.detail}</p>
            <div className="liens-alerte">
              {a.articleId && <Link className="lien" href={`/admin/articles/${a.articleId}`}>Voir l&apos;article</Link>}
              {a.venteId && <Link className="lien" href={`/admin/ventes/${a.venteId}`}>Voir la vente</Link>}
              {a.userId && <Link className="lien" href={`/admin/equipe/${a.userId}`}>Voir le vendeur</Link>}
              {a.produitId && <Link className="lien" href={`/admin/produits/${a.produitId}`}>Voir le produit</Link>}
            </div>
            <AlerteCarte id={a.id} />
          </article>))}</section>
      )}

      {traitees.length > 0 && (
        <section className="carte"><h2 className="h2">Traitées récemment</h2>
          <ul className="liste">{traitees.map((a) => (
            <li key={a.id} className="ligne-alerte">
              <div><b>{TYPE[a.type]}</b><span className="muted">{a.detail}</span>{a.note && <span>Note : {a.note}</span>}</div>
              <span className={`pastille ${ETAT[a.statut][1]}`}>{ETAT[a.statut][0]}</span>
            </li>))}</ul></section>
      )}
    </main>
  );
}
