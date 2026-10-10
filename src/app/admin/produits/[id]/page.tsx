import Link from "next/link";
import { notFound } from "next/navigation";
import { exigerSession } from "@/lib/session";
import { db } from "@/lib/db";
import { fcfa } from "@/domain/alertes";
import { dateCourte } from "@/domain/dates";
import { STATUT_ARTICLE } from "@/domain/libelles";
import { Archiver } from "./archiver";

export const dynamic = "force-dynamic";

export default async function Produit({ params }: { params: Promise<{ id: string }> }) {
  const s = await exigerSession();
  const p = await db.produit.findUnique({ where: { id: (await params).id } });
  if (!p || p.magasinId !== s.user.magasinId) notFound();
  const [groupes, articles] = await Promise.all([
    db.article.groupBy({ by: ["statut"], where: { produitId: p.id }, _count: true }),
    db.article.findMany({ where: { produitId: p.id }, orderBy: { creeLe: "desc" }, take: 200, select: { id: true, code: true, statut: true, creeLe: true } }),
  ]);
  const n = (st: string) => groupes.find((g) => g.statut === st)?._count ?? 0;

  return (
    <main className="page large">
      <Link className="lien retour" href="/admin/produits">← Catalogue</Link>
      <div className="entete"><div><h1>{p.nom}</h1><span className="muted">{fcfa(p.prix)} · alerte stock bas : {p.seuilStockBas > 0 ? `à ${p.seuilStockBas}` : "désactivée"}</span></div>
        {!p.actif && <span className="pastille pastille-neutre">Archivé</span>}</div>

      <div className="chiffres quatre">
        {(["EN_RAYON", "EN_STOCK", "VENDU", "RETOURNE"] as const).map((k) => (
          <div key={k} className="carte chiffre"><span className="muted">{STATUT_ARTICLE[k].label}</span><b>{n(k)}</b></div>))}
      </div>

      <Archiver id={p.id} actif={p.actif} />

      <section className="carte"><h2 className="h2">Articles ({articles.length}{articles.length === 200 ? " les plus récents" : ""})</h2>
        {articles.length === 0 ? <p className="muted">Aucun article pour ce produit.</p> : (
          <ul className="liste">{articles.map((a) => (
            <li key={a.id}><Link href={`/admin/articles/${a.id}`} className="carte-vente"><div><b>Réf. {a.code.slice(-6).toUpperCase()}</b><span className="muted">créé le {dateCourte(a.creeLe)}</span></div>
              <span className={`pastille ${STATUT_ARTICLE[a.statut].classe}`}>{STATUT_ARTICLE[a.statut].label}</span></Link></li>))}</ul>)}
      </section>
    </main>
  );
}
