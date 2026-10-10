import Link from "next/link";
import { notFound } from "next/navigation";
import { exigerSession } from "@/lib/session";
import { db } from "@/lib/db";
import { dateHeure } from "@/domain/dates";
import { fcfa, baissePrixPct } from "@/domain/alertes";
import { STATUT_ARTICLE } from "@/domain/libelles";
import { AnnulerVente } from "./annuler";

export const dynamic = "force-dynamic";
const STATUT_VENTE = { VALIDE: ["Valide", "pastille-ok"], RETOURNEE: ["Retournée", "pastille-neutre"], ANNULEE: ["Annulée", "pastille-err"] } as const;

export default async function Vente({ params }: { params: Promise<{ id: string }> }) {
  const s = await exigerSession();
  const v = await db.vente.findUnique({ where: { id: (await params).id }, include: { vendeur: { select: { id: true, nom: true } }, article: { include: { produit: true } } } });
  if (!v || v.magasinId !== s.user.magasinId) notFound();
  const baisse = Math.round(baissePrixPct(v.prixCatalogue, v.montant));
  const st = STATUT_VENTE[v.statut];

  return (
    <main className="page">
      <Link className="lien retour" href="/admin/ventes">← Ventes</Link>
      <div className="entete"><h1>{fcfa(v.montant)}</h1><span className={`pastille ${st[1]}`}>{st[0]}</span></div>
      <section className="carte">
        <dl className="details">
          <div><dt>Article</dt><dd><Link className="lien-tableau" href={`/admin/articles/${v.articleId}`}>{v.article.produit.nom}</Link> <span className={`pastille ${STATUT_ARTICLE[v.article.statut].classe}`}>{STATUT_ARTICLE[v.article.statut].label}</span></dd></div>
          <div><dt>Vendeur</dt><dd><Link className="lien-tableau" href={`/admin/equipe/${v.vendeur.id}`}>{v.vendeur.nom}</Link></dd></div>
          <div><dt>Date et heure</dt><dd>{dateHeure(v.date)}</dd></div>
          <div><dt>Prix du catalogue</dt><dd>{fcfa(v.prixCatalogue)}</dd></div>
          <div><dt>Prix encaissé</dt><dd>{fcfa(v.montant)}{baisse > 0 && <span className="pastille pastille-warn" style={{ marginLeft: 8 }}>−{baisse} %</span>}</dd></div>
          {v.motifAnnulation && <div><dt>Motif d&apos;annulation</dt><dd>{v.motifAnnulation}</dd></div>}
        </dl>
      </section>
      {v.statut === "VALIDE" && <AnnulerVente venteId={v.id} />}
      {v.statut === "RETOURNEE" && <p className="avis avis-warn">Cet article a été retourné par le client : cette vente ne compte plus.</p>}
    </main>
  );
}
