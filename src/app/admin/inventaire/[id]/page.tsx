import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { exigerSession } from "@/lib/session";
import { db } from "@/lib/db";
import { dateHeure } from "@/domain/dates";
import { STATUT_ARTICLE } from "@/domain/libelles";
import { InventaireScan } from "./inventaire-scan";

export const dynamic = "force-dynamic";

export default async function InventaireDetail({ params }: { params: Promise<{ id: string }> }) {
  const s = await exigerSession();
  const inv = await db.inventaire.findUnique({
    where: { id: (await params).id },
    include: { _count: { select: { lignes: true } }, ecarts: { include: { article: { select: { id: true, code: true, statut: true, produit: { select: { nom: true } } } } } } },
  });
  if (!inv || inv.magasinId !== s.user.magasinId) notFound();
  if (!inv.cloture) return <InventaireScan id={inv.id} depart={inv._count.lignes} />;

  const manquants = inv.ecarts.filter((e) => e.type === "MANQUANT"), inattendus = inv.ecarts.filter((e) => e.type === "INATTENDU");
  const ligne = (e: (typeof inv.ecarts)[number], pastille?: boolean) => (
    <li key={e.id} className="ligne-alerte"><Link className="lien-tableau" href={`/admin/articles/${e.article.id}`} style={{ display: "flex", flexDirection: "column" }}><b>{e.article.produit.nom}</b><span className="muted">Réf. {e.article.code.slice(-6).toUpperCase()}</span></Link>
      {pastille && <span className={`pastille ${STATUT_ARTICLE[e.article.statut].classe}`}>{STATUT_ARTICLE[e.article.statut].label}</span>}</li>);

  return (
    <main className="page large">
      <Link className="lien retour" href="/admin/inventaire">← Inventaires</Link>
      <h1>Inventaire du {dateHeure(inv.cloture)}</h1>
      {inv.manquants === null ? <p className="avis avis-warn">Cet inventaire a été abandonné : aucun écart n&apos;a été enregistré.</p> : (<>
        <div className="chiffres">
          <div className="carte chiffre"><span className="muted">Comptés</span><b>{inv._count.lignes}</b></div>
          <div className="carte chiffre"><span className="muted">Manquants</span><b>{inv.manquants}</b></div>
          <div className="carte chiffre"><span className="muted">Inattendus</span><b>{inv.inattendus ?? 0}</b></div>
        </div>
        {inv.manquants + (inv.inattendus ?? 0) === 0 && <div className="carte vide"><CheckCircle2 size={40} color="var(--ok)" /><p><b>Aucun écart.</b> Le rayon correspondait au stock.</p></div>}
        {inv.ecarts.length === 0 && inv.manquants + (inv.inattendus ?? 0) > 0 && <p className="avis avis-warn">Le détail des écarts n&apos;a pas été conservé pour cet ancien inventaire. Les alertes correspondantes sont dans Alertes.</p>}
        {manquants.length > 0 && <section className="carte"><h2 className="h2">Attendus mais non retrouvés ({manquants.length})</h2><ul className="liste">{manquants.map((e) => ligne(e, true))}</ul></section>}
        {inattendus.length > 0 && <section className="carte"><h2 className="h2">Trouvés en rayon mais ne devant pas y être ({inattendus.length})</h2><ul className="liste">{inattendus.map((e) => ligne(e, true))}</ul></section>}
      </>)}
    </main>
  );
}
