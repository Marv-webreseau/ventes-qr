import Link from "next/link";
import { Bell, PackageMinus } from "lucide-react";
import { exigerSession } from "@/lib/session";
import { db } from "@/lib/db";
import { debutDuJour, debutPeriode, heure, dateCourte } from "@/domain/dates";
import { fcfa } from "@/domain/alertes";
import { Rafraichir } from "@/components/rafraichir";

export const dynamic = "force-dynamic";
const JOUR = 86_400_000;

export default async function Aujourdhui() {
  const s = await exigerSession();
  const magasinId = s.user.magasinId;
  const debut7 = debutPeriode("7j"), aujourdhui = debutDuJour();

  const [ventes, alertes, produits, rayon] = await Promise.all([
    db.vente.findMany({ where: { magasinId, statut: "VALIDE", date: { gte: debut7 } }, orderBy: { date: "desc" }, include: { vendeur: { select: { nom: true } }, article: { select: { produit: { select: { nom: true } } } } } }),
    db.anomalie.count({ where: { magasinId, statut: "A_VERIFIER" } }),
    db.produit.findMany({ where: { magasinId, actif: true, seuilStockBas: { gt: 0 } }, select: { id: true, nom: true, seuilStockBas: true } }),
    db.article.groupBy({ by: ["produitId"], where: { magasinId, statut: "EN_RAYON" }, _count: true }),
  ]);

  const jour = Array.from({ length: 7 }, (_, i) => { const d = new Date(debut7.getTime() + i * JOUR); return { d, n: 0, somme: 0 }; });
  for (const v of ventes) { const k = jour[Math.min(6, Math.floor((v.date.getTime() - debut7.getTime()) / JOUR))]!; k.n++; k.somme += v.montant; }
  const auj = jour[6]!, hier = jour[5]!;
  const delta = auj.n - hier.n;
  const max = Math.max(1, ...jour.map((j) => j.somme));
  const duJour = ventes.filter((v) => v.date >= aujourdhui);
  const parVendeur = new Map<string, { nom: string; n: number; somme: number }>();
  for (const v of duJour) { const l = parVendeur.get(v.vendeurId) ?? { nom: v.vendeur.nom, n: 0, somme: 0 }; l.n++; l.somme += v.montant; parVendeur.set(v.vendeurId, l); }
  const enRayon = new Map(rayon.map((r) => [r.produitId, r._count]));
  const bas = produits.filter((p) => (enRayon.get(p.id) ?? 0) <= p.seuilStockBas).map((p) => ({ ...p, restant: enRayon.get(p.id) ?? 0 }));
  const maxV = Math.max(1, ...[...parVendeur.values()].map((l) => l.somme));

  return (
    <main className="page large">
      <div className="entete"><div><h1>Aujourd&apos;hui</h1><span className="muted">{dateCourte(new Date())}</span></div><Rafraichir /></div>

      <div className="chiffres quatre">
        <div className="carte chiffre"><span className="muted">Ventes</span><b>{auj.n}</b>
          <span className={`delta ${delta > 0 ? "haut" : delta < 0 ? "bas" : ""}`}>{delta === 0 ? "Comme hier" : `${delta > 0 ? "+" : ""}${delta} par rapport à hier`}</span></div>
        <div className="carte chiffre"><span className="muted">Chiffre d&apos;affaires</span><b>{fcfa(auj.somme)}</b><span className="muted">Hier : {fcfa(hier.somme)}</span></div>
        <Link href="/admin/alertes" className={`carte chiffre lien-carte ${alertes ? "attention" : ""}`}><span className="muted"><Bell size={14} /> Alertes à vérifier</span><b>{alertes}</b><span className="muted">{alertes ? "Voir et traiter" : "Rien à signaler"}</span></Link>
        <Link href="/admin/produits" className={`carte chiffre lien-carte ${bas.length ? "attention" : ""}`}><span className="muted"><PackageMinus size={14} /> Stock bas</span><b>{bas.length}</b><span className="muted">{bas.length ? bas.slice(0, 2).map((p) => `${p.nom} (${p.restant})`).join(", ") : "Tout est approvisionné"}</span></Link>
      </div>

      <section className="carte"><h2 className="h2">Chiffre d&apos;affaires, 7 derniers jours</h2>
        {ventes.length === 0 ? <p className="muted">Les ventes apparaîtront ici dès le premier scan.</p> : (
          <div className="barres" role="img" aria-label={jour.map((j) => `${dateCourte(j.d)} : ${fcfa(j.somme)}`).join(". ")}>
            {jour.map((j, i) => (
              <div key={i} className="barre-col" title={`${dateCourte(j.d)} : ${fcfa(j.somme)} (${j.n} vente${j.n > 1 ? "s" : ""})`}>
                <span className="barre-val">{j.somme ? Math.round(j.somme / 1000) + "k" : ""}</span>
                <div className={`barre ${i === 6 ? "auj" : ""}`} style={{ height: `${Math.max(j.somme ? 4 : 1, (j.somme / max) * 100)}%` }} />
                <span className="barre-lab">{j.d.toLocaleDateString("fr-FR", { weekday: "short", timeZone: "Africa/Porto-Novo" })}</span>
              </div>))}
          </div>)}
      </section>

      <div className="deux">
        <section className="carte"><h2 className="h2">Par vendeur aujourd&apos;hui</h2>
          {parVendeur.size === 0 ? <p className="muted">Aucune vente pour le moment.</p> : (
            <ul className="liste">{[...parVendeur.values()].sort((a, b) => b.somme - a.somme).map((l) => (
              <li key={l.nom} className="vendeur-barre"><div className="entete"><b>{l.nom}</b><span>{fcfa(l.somme)} · {l.n}</span></div><div className="piste"><div style={{ width: `${(l.somme / maxV) * 100}%` }} /></div></li>))}</ul>)}
        </section>
        <section className="carte"><div className="entete"><h2 className="h2">Dernières ventes</h2><Link className="lien" href="/admin/ventes">Tout voir</Link></div>
          {duJour.length === 0 ? <p className="muted">Les ventes apparaîtront ici en direct.</p> : (
            <ul className="liste">{duJour.slice(0, 8).map((v) => (
              <li key={v.id} className="ligne-vente"><span className="muted">{heure(v.date)}</span><span>{v.article.produit.nom}<span className="muted"> · {v.vendeur.nom}</span></span><b>{fcfa(v.montant)}</b></li>))}</ul>)}
        </section>
      </div>
    </main>
  );
}
