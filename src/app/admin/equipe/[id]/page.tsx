import Link from "next/link";
import { notFound } from "next/navigation";
import { exigerSession } from "@/lib/session";
import { db } from "@/lib/db";
import { chercherVentes } from "@/services/ventes.query";
import { PERIODES, periodeValide, debutPeriode, dateHeure, dateCourte, heure } from "@/domain/dates";
import { fcfa } from "@/domain/alertes";
import { ACTION_COMPTE } from "@/domain/libelles";
import { FormulaireVendeur } from "./formulaire";

export const dynamic = "force-dynamic";

export default async function Vendeur({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ p?: string }> }) {
  const s = await exigerSession();
  const { id } = await params;
  const periode = periodeValide((await searchParams).p);
  const u = await db.user.findUnique({ where: { id } });
  if (!u || u.magasinId !== s.user.magasinId || u.role !== "VENDEUR") notFound();

  const [liste, retours, alertes, journal] = await Promise.all([
    chercherVentes(u.magasinId, { periode, vendeurId: id }),
    db.mouvement.count({ where: { userId: id, vers: "RETOURNE", date: { gte: debutPeriode(periode) } } }),
    db.anomalie.count({ where: { userId: id, statut: "A_VERIFIER" } }),
    db.journalCompte.findMany({ where: { cibleId: id }, orderBy: { date: "desc" }, take: 10 }),
  ]);
  const ventes = liste.slice(0, 100).filter((v) => v.statut === "VALIDE");
  const total = ventes.reduce((t, v) => t + v.montant, 0);

  return (
    <main className="page large">
      <Link className="lien retour" href="/admin/equipe">← Équipe</Link>
      <div className="entete"><div><h1>{u.nom}</h1><span className="muted">Identifiant : {u.identifiant}</span></div>
        <span className={`pastille ${u.actif ? "pastille-ok" : "pastille-neutre"}`}>{u.actif ? "Actif" : "Désactivé"}</span></div>

      <nav className="pilules" aria-label="Période">{(Object.keys(PERIODES) as (keyof typeof PERIODES)[]).map((k) => (
        <Link key={k} href={`/admin/equipe/${id}?p=${k}`} className={`pilule ${k === periode ? "actif" : ""}`} aria-current={k === periode ? "true" : undefined}>{PERIODES[k]}</Link>))}</nav>

      <div className="chiffres quatre">
        <div className="carte chiffre"><span className="muted">Ventes</span><b>{ventes.length}</b></div>
        <div className="carte chiffre"><span className="muted">Chiffre d&apos;affaires</span><b>{fcfa(total)}</b></div>
        <div className="carte chiffre"><span className="muted">Retours enregistrés</span><b>{retours}</b></div>
        <Link href="/admin/alertes" className={`carte chiffre lien-carte ${alertes ? "attention" : ""}`}><span className="muted">Alertes ouvertes</span><b>{alertes}</b></Link>
      </div>

      <div className="deux">
        <FormulaireVendeur id={u.id} nom={u.nom} telephone={u.telephone ?? ""} />
        <section className="carte"><h2 className="h2">Historique du compte</h2>
          <ol className="timeline">{journal.map((j) => <li key={j.id}><b>{ACTION_COMPTE[j.action] ?? j.action}</b><span className="muted">{dateHeure(j.date)}</span></li>)}</ol></section>
      </div>

      <section className="carte"><h2 className="h2">Ventes</h2>
        {ventes.length === 0 ? <p className="muted">Aucune vente sur cette période.</p> : (
          <ul className="liste">{ventes.map((v) => (
            <li key={v.id}><Link href={`/admin/ventes/${v.id}`} className="carte-vente"><div><b>{v.article.produit.nom}</b><span className="muted">{dateCourte(v.date)} {heure(v.date)}</span></div><b>{fcfa(v.montant)}</b></Link></li>))}</ul>)}
      </section>
    </main>
  );
}
