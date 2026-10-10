import Link from "next/link";
import { Download } from "lucide-react";
import { exigerSession } from "@/lib/session";
import { db } from "@/lib/db";
import { chercherVentes, LIMITE } from "@/services/ventes.query";
import { PERIODES, periodeValide, dateCourte, heure } from "@/domain/dates";
import { fcfa } from "@/domain/alertes";

export const dynamic = "force-dynamic";
const STATUT = { VALIDE: ["Valide", "pastille-ok"], RETOURNEE: ["Retournée", "pastille-neutre"], ANNULEE: ["Annulée", "pastille-err"] } as const;

export default async function Ventes({ searchParams }: { searchParams: Promise<{ p?: string; vendeur?: string }> }) {
  const s = await exigerSession();
  const q = await searchParams;
  const periode = periodeValide(q.p);
  const vendeurId = q.vendeur || undefined;

  const [liste, vendeurs] = await Promise.all([
    chercherVentes(s.user.magasinId, { periode, vendeurId }),
    db.user.findMany({ where: { magasinId: s.user.magasinId, role: "VENDEUR" }, orderBy: { nom: "asc" }, select: { id: true, nom: true } }),
  ]);
  const tronquee = liste.length > LIMITE;
  const ventes = liste.slice(0, LIMITE);
  const valides = ventes.filter((v) => v.statut === "VALIDE");
  const total = valides.reduce((t, v) => t + v.montant, 0);
  const exportHref = `/api/admin/ventes/export?p=${periode}${vendeurId ? `&vendeur=${vendeurId}` : ""}`;

  return (
    <main className="page large">
      <div className="entete"><h1>Ventes</h1>
        <a className="btn" style={{ width: "auto", padding: "0 18px", minHeight: 44 }} href={exportHref}><Download size={18} /> Exporter (Excel)</a></div>

      <form className="carte filtres" method="get">
        <div className="champ"><label htmlFor="p">Période</label>
          <select id="p" name="p" defaultValue={periode}>{Object.entries(PERIODES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
        <div className="champ"><label htmlFor="vendeur">Vendeur</label>
          <select id="vendeur" name="vendeur" defaultValue={vendeurId ?? ""}><option value="">Tous les vendeurs</option>{vendeurs.map((v) => <option key={v.id} value={v.id}>{v.nom}</option>)}</select></div>
        <button className="btn btn-plein filtres-btn">Filtrer</button>
      </form>

      <div className="chiffres">
        <div className="carte chiffre"><span className="muted">Ventes valides</span><b>{valides.length}</b></div>
        <div className="carte chiffre"><span className="muted">Chiffre d&apos;affaires</span><b>{fcfa(total)}</b></div>
      </div>

      {ventes.length === 0 ? (
        <div className="carte vide"><p>Aucune vente sur cette période.</p><Link className="lien" href="/admin/ventes?p=30j">Voir les 30 derniers jours</Link></div>
      ) : (
        <>
          <section className="carte tbl-desktop" style={{ overflowX: "auto" }}>
            <table><thead><tr><th>Date</th><th>Heure</th><th>Vendeur</th><th>Article</th><th>État</th><th className="n">Montant</th></tr></thead>
              <tbody>{ventes.map((v) => (
                <tr key={v.id}><td>{dateCourte(v.date)}</td><td>{heure(v.date)}</td><td>{v.vendeur.nom}</td><td><Link className="lien-tableau" href={`/admin/ventes/${v.id}`}>{v.article.produit.nom}</Link></td>
                  <td><span className={`pastille ${STATUT[v.statut][1]}`}>{STATUT[v.statut][0]}</span></td><td className="n">{fcfa(v.montant)}</td></tr>))}</tbody></table>
          </section>
          <ul className="liste cartes-mobile">{ventes.map((v) => (
            <li key={v.id}><Link href={`/admin/ventes/${v.id}`} className="carte-vente">
              <div><b>{v.article.produit.nom}</b><span className="muted">{v.vendeur.nom} · {dateCourte(v.date)} {heure(v.date)}</span></div>
              <div className="droite"><b>{fcfa(v.montant)}</b><span className={`pastille ${STATUT[v.statut][1]}`}>{STATUT[v.statut][0]}</span></div>
            </Link></li>))}</ul>
          {tronquee && <p className="avis avis-warn">Seules les {LIMITE} ventes les plus récentes sont affichées. Réduis la période ou filtre par vendeur ; l&apos;export contient la même limite.</p>}
        </>
      )}
    </main>
  );
}
