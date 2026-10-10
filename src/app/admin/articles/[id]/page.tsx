import Link from "next/link";
import { notFound } from "next/navigation";
import { exigerSession } from "@/lib/session";
import { db } from "@/lib/db";
import { dateHeure } from "@/domain/dates";
import { fcfa } from "@/domain/alertes";
import { STATUT_ARTICLE, libelleMouvement } from "@/domain/libelles";

export const dynamic = "force-dynamic";
const STATUT_VENTE = { VALIDE: ["Valide", "pastille-ok"], RETOURNEE: ["Retournée", "pastille-neutre"], ANNULEE: ["Annulée", "pastille-err"] } as const;

export default async function Article({ params }: { params: Promise<{ id: string }> }) {
  const s = await exigerSession();
  const a = await db.article.findUnique({
    where: { id: (await params).id },
    include: { produit: true, mouvements: { orderBy: { date: "asc" } }, ventes: { orderBy: { date: "desc" }, include: { vendeur: { select: { nom: true } } } } },
  });
  if (!a || a.magasinId !== s.user.magasinId) notFound();
  const acteurs = await db.user.findMany({ where: { id: { in: [...new Set(a.mouvements.map((m) => m.userId))] } }, select: { id: true, nom: true } });
  const nom = new Map(acteurs.map((u) => [u.id, u.nom]));
  const etat = STATUT_ARTICLE[a.statut];

  return (
    <main className="page">
      <Link className="lien retour" href={`/admin/produits/${a.produitId}`}>← {a.produit.nom}</Link>
      <div className="entete"><div><h1>{a.produit.nom}</h1><span className="muted">Réf. {a.code.slice(-6).toUpperCase()} · créé le {dateHeure(a.creeLe)}</span></div>
        <span className={`pastille ${etat.classe}`}>{etat.label}</span></div>

      <section className="carte"><h2 className="h2">Parcours de l&apos;article</h2>
        <ol className="timeline">{a.mouvements.map((m) => (
          <li key={m.id}>
            <b>{libelleMouvement(m.de, m.vers)}</b>
            <span className="muted">{dateHeure(m.date)} · {nom.get(m.userId) ?? "Compte supprimé"}</span>
            {m.motif && <span>Motif : {m.motif}</span>}
          </li>))}</ol>
      </section>

      {a.ventes.length > 0 && (
        <section className="carte"><h2 className="h2">Ventes de cet article</h2>
          <ul className="liste">{a.ventes.map((v) => (
            <li key={v.id}><Link href={`/admin/ventes/${v.id}`} className="carte-vente">
              <div><b>{fcfa(v.montant)}</b><span className="muted">{v.vendeur.nom} · {dateHeure(v.date)}</span></div>
              <span className={`pastille ${STATUT_VENTE[v.statut][1]}`}>{STATUT_VENTE[v.statut][0]}</span></Link></li>))}</ul></section>
      )}
    </main>
  );
}
