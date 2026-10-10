import Link from "next/link";
import { ScanLine } from "lucide-react";
import { exigerSession } from "@/lib/session";
import { db } from "@/lib/db";
import { debutDuJour, heure } from "@/domain/dates";
import { fcfa } from "@/domain/alertes";

export const dynamic = "force-dynamic";

export default async function MaJournee() {
  const s = await exigerSession();
  const ventes = await db.vente.findMany({
    where: { vendeurId: s.user.id, statut: "VALIDE", date: { gte: debutDuJour() } }, orderBy: { date: "desc" },
    include: { article: { select: { produit: { select: { nom: true } } } } },
  });
  const total = ventes.reduce((t, v) => t + v.montant, 0);

  return (
    <main className="page">
      <h1>Ma journée</h1>
      <div className="chiffres">
        <div className="carte chiffre"><span className="muted">Ventes</span><b>{ventes.length}</b></div>
        <div className="carte chiffre"><span className="muted">Montant</span><b>{fcfa(total)}</b></div>
      </div>
      {ventes.length === 0 ? (
        <div className="carte vide"><p>Aucune vente pour le moment.</p><Link className="btn btn-plein" href="/vendeur"><ScanLine size={20} /> Scanner un article</Link></div>
      ) : (
        <ul className="liste">{ventes.map((v) => (
          <li key={v.id} className="ligne-vente"><span className="muted">{heure(v.date)}</span><span>{v.article.produit.nom}</span><b>{fcfa(v.montant)}</b></li>))}
        </ul>
      )}
    </main>
  );
}
