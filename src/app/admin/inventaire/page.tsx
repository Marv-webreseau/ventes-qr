import { ClipboardCheck } from "lucide-react";
import Link from "next/link";
import { exigerSession } from "@/lib/session";
import { db } from "@/lib/db";
import { dateHeure } from "@/domain/dates";
import { demarrerInventaireAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function Inventaire() {
  const s = await exigerSession();
  const [ouvert, passes, enRayon] = await Promise.all([
    db.inventaire.findFirst({ where: { magasinId: s.user.magasinId, cloture: null }, include: { _count: { select: { lignes: true } } } }),
    db.inventaire.findMany({ where: { magasinId: s.user.magasinId, cloture: { not: null } }, orderBy: { cloture: "desc" }, take: 10, include: { _count: { select: { lignes: true } } } }),
    db.article.count({ where: { magasinId: s.user.magasinId, statut: "EN_RAYON" } }),
  ]);
  return (
    <main className="page large">
      <h1>Inventaire</h1>
      <p className="muted">Scanne ce qui est réellement en rayon. À la fin, l&apos;application compare avec ce qui devrait y être et signale les écarts, sans accuser personne.</p>
      <section className="carte">
        <p><b>{enRayon}</b> article(s) devraient être en rayon aujourd&apos;hui.</p>
        {ouvert ? (
          <>
            <p className="avis avis-warn">Un inventaire est en cours ({ouvert._count.lignes} article(s) comptés).</p>
            <Link className="btn btn-plein" href={`/admin/inventaire/${ouvert.id}`}><ClipboardCheck size={20} /> Reprendre l&apos;inventaire</Link>
          </>
        ) : (
          <form action={demarrerInventaireAction}><button className="btn btn-plein"><ClipboardCheck size={20} /> Démarrer un inventaire</button></form>
        )}
      </section>
      {passes.length > 0 && (
        <section className="carte"><h2 className="h2">Inventaires précédents</h2>
          <ul className="liste">{passes.map((i) => (
            <li key={i.id} className="ligne-alerte">
              <Link href={`/admin/inventaire/${i.id}`} className="lien-tableau" style={{ display: "flex", flexDirection: "column" }}><b>{dateHeure(i.cloture!)}</b><span className="muted">{i._count.lignes} article(s) comptés</span></Link>
              {i.manquants === null ? <span className="pastille pastille-neutre">Abandonné</span>
                : i.manquants + (i.inattendus ?? 0) === 0 ? <span className="pastille pastille-ok">Aucun écart</span>
                : <span className="pastille pastille-warn">{i.manquants} manquant(s) · {i.inattendus} inattendu(s)</span>}
            </li>))}</ul></section>
      )}
    </main>
  );
}
