import Link from "next/link";
import { exigerSession } from "@/lib/session";
import { db } from "@/lib/db";
import { fcfa } from "@/domain/alertes";
import { creerProduit, creerArticles, modifierProduitAction } from "./actions";
import { BoutonRemise, FormulaireLot } from "./boutons";

export const dynamic = "force-dynamic";
const A_TRAITER = { RETOURNE: ["Retourné", "pastille-neutre"], ENDOMMAGE: ["Endommagé", "pastille-err"], PERDU: ["Perdu", "pastille-err"] } as const;

export default async function Catalogue() {
  const s = await exigerSession();
  const magasinId = s.user.magasinId;
  const [produits, groupes, traiter] = await Promise.all([
    db.produit.findMany({ where: { magasinId }, orderBy: { nom: "asc" } }),
    db.article.groupBy({ by: ["produitId", "statut"], where: { magasinId }, _count: true }),
    db.article.findMany({
      where: { magasinId, statut: { in: ["RETOURNE", "ENDOMMAGE", "PERDU"] } }, orderBy: { creeLe: "desc" }, take: 100,
      include: { produit: { select: { nom: true } }, mouvements: { orderBy: { date: "desc" }, take: 1, select: { motif: true } } },
    }),
  ]);
  const actifs = produits.filter((p) => p.actif), archives = produits.filter((p) => !p.actif);
  const stock = new Map<string, Record<string, number>>();
  for (const g of groupes) stock.set(g.produitId, { ...(stock.get(g.produitId) ?? {}), [g.statut]: g._count });

  return (
    <main className="page large">
      <h1>Catalogue</h1>
      <form action="/admin/articles" method="get" className="recherche" role="search">
        <input name="ref" placeholder="Chercher un article par sa référence" aria-label="Référence de l'article" autoCapitalize="characters" autoComplete="off" />
        <button className="btn" style={{ width: "auto", minHeight: 48, padding: "0 20px" }}>Chercher</button>
      </form>

      {traiter.length > 0 && (
        <section className="carte" style={{ borderLeft: "4px solid var(--warn)" }}>
          <h2 className="h2">À traiter ({traiter.length})</h2>
          <p className="muted">Ces articles ne sont pas vendables. Après contrôle, remets-les en rayon : les signalements ouverts sont alors écartés.</p>
          <ul className="liste">{traiter.map((a) => (
            <li key={a.id} className="ligne-alerte">
              <div><Link className="lien-tableau" href={`/admin/articles/${a.id}`}><b>{a.produit.nom}</b></Link><span className="muted">Réf. {a.code.slice(-6).toUpperCase()}{a.mouvements[0]?.motif ? ` · ${a.mouvements[0].motif}` : ""}</span></div>
              <div className="actions-ligne"><span className={`pastille ${A_TRAITER[a.statut as keyof typeof A_TRAITER][1]}`}>{A_TRAITER[a.statut as keyof typeof A_TRAITER][0]}</span><BoutonRemise articleId={a.id} /></div>
            </li>))}</ul>
        </section>
      )}

      <form action={creerProduit} className="carte">
        <h2 className="h2">Nouveau produit</h2>
        <div className="ligne">
          <div className="champ" style={{ flex: 2, minWidth: 180 }}><label htmlFor="nom">Nom</label><input id="nom" name="nom" placeholder="Robe wax" required /></div>
          <div className="champ" style={{ flex: 1, minWidth: 140 }}><label htmlFor="prix">Prix (FCFA)</label><input id="prix" name="prix" type="number" inputMode="numeric" min={1} required /></div>
          <div className="champ" style={{ flex: 1, minWidth: 140 }}><label htmlFor="seuil">Alerte stock bas à</label><input id="seuil" name="seuil" type="number" inputMode="numeric" min={0} defaultValue={0} /></div>
        </div>
        <button className="btn btn-plein" style={{ maxWidth: 260 }}>Ajouter le produit</button>
      </form>

      {actifs.length === 0 ? <div className="carte vide"><p>Aucun produit pour le moment. Ajoute le premier ci-dessus.</p></div> : (
        <section className="grille-produits">{actifs.map((p) => {
          const st = stock.get(p.id) ?? {};
          const rayon = st.EN_RAYON ?? 0, enStock = st.EN_STOCK ?? 0, vendus = st.VENDU ?? 0;
          const bas = p.seuilStockBas > 0 && rayon <= p.seuilStockBas;
          const total = Object.values(st).reduce((a, b) => a + b, 0);
          return (
            <article key={p.id} className="carte produit">
              <div className="entete"><div><h2 className="h2"><Link className="lien-tableau" href={`/admin/produits/${p.id}`}>{p.nom}</Link></h2><span className="muted">{fcfa(p.prix)}</span></div>
                {bas && <span className="pastille pastille-warn">Stock bas</span>}</div>
              <dl className="stock">
                <div><dt>En rayon</dt><dd className={bas ? "bas" : ""}>{rayon}</dd></div>
                <div><dt>En stock</dt><dd>{enStock}</dd></div>
                <div><dt>Vendus</dt><dd>{vendus}</dd></div>
              </dl>
              {enStock > 0 && <FormulaireLot produitId={p.id} enStock={enStock} />}
              <form action={creerArticles} className="ligne" style={{ alignItems: "center" }}>
                <input type="hidden" name="produitId" value={p.id} />
                <input name="quantite" type="number" min={1} max={200} defaultValue={1} aria-label={`Quantité d'articles à créer pour ${p.nom}`} style={{ width: 88, padding: 10 }} />
                <label className="case"><input type="checkbox" name="enRayon" defaultChecked />En rayon</label>
                <button className="btn" style={{ width: "auto", minHeight: 44, padding: "0 16px", fontSize: 15 }}>Créer et imprimer</button>
              </form>
              <div className="actions-ligne" style={{ justifyContent: "flex-start" }}>
                {total > 0 && <Link className="lien" href={`/admin/etiquettes?produit=${p.id}&n=${Math.min(total, 200)}`}>Réimprimer les étiquettes</Link>}
              </div>
              <details className="modifier"><summary>Modifier le produit</summary>
                <form action={modifierProduitAction} className="champs-modif">
                  <input type="hidden" name="id" value={p.id} />
                  <div className="champ"><label>Nom<input name="nom" defaultValue={p.nom} required /></label></div>
                  <div className="champ"><label>Prix (FCFA)<input name="prix" type="number" min={1} defaultValue={p.prix} required /></label></div>
                  <div className="champ"><label>Alerte stock bas à<input name="seuil" type="number" min={0} defaultValue={p.seuilStockBas} /></label></div>
                  <button className="btn btn-plein" style={{ minHeight: 48, fontSize: 16 }}>Enregistrer</button>
                  <p className="muted">Changer le prix n&apos;affecte pas les ventes déjà faites.</p>
                </form>
              </details>
            </article>);
        })}</section>
      )}
      {archives.length > 0 && (
        <details className="carte"><summary className="h2" style={{ cursor: "pointer" }}>Produits archivés ({archives.length})</summary>
          <ul className="liste" style={{ marginTop: 12 }}>{archives.map((p) => <li key={p.id}><Link href={`/admin/produits/${p.id}`} className="carte-vente"><b>{p.nom}</b><span className="muted">{fcfa(p.prix)}</span></Link></li>)}</ul></details>
      )}
    </main>
  );
}
