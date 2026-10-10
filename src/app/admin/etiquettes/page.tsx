import QRCode from "qrcode";
import Link from "next/link";
import { db } from "@/lib/db";
import { BoutonImprimer } from "@/components/bouton-imprimer";

export const dynamic = "force-dynamic";
const fcfa = (n: number) => `${n.toLocaleString("fr-FR")} FCFA`;

export default async function Etiquettes({ searchParams }: { searchParams: Promise<{ produit?: string; n?: string }> }) {
  const { produit, n } = await searchParams;
  const take = Math.min(200, Math.max(1, Number(n) || 1));
  const articles = produit
    ? await db.article.findMany({ where: { produitId: produit }, orderBy: { creeLe: "desc" }, take, include: { produit: true } })
    : [];
  const items = await Promise.all(articles.map(async (a) => ({
    id: a.id, nom: a.produit.nom, prix: a.produit.prix, ref: a.code.slice(-6).toUpperCase(),
    svg: await QRCode.toString(a.code, { type: "svg", margin: 0, errorCorrectionLevel: "M" }),
  })));

  return (
    <main className="page large">
      <div className="no-print" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Link className="lien" href="/admin/produits" style={{ alignSelf: "flex-start" }}>← Retour aux produits</Link>
        <h1>Étiquettes</h1>
        {items.length === 0
          ? <p className="muted">Aucun article à imprimer. <Link className="lien" href="/admin/produits">Retour aux produits</Link></p>
          : <><p className="muted">{items.length} étiquette{items.length > 1 ? "s" : ""} prête{items.length > 1 ? "s" : ""}. Colle chaque étiquette sur son article : un QR ne sert qu&apos;une fois.</p><BoutonImprimer /></>}
      </div>
      <div className="etiquettes">
        {items.map((i) => (
          <div className="etiquette" key={i.id}>
            <div className="qr" dangerouslySetInnerHTML={{ __html: i.svg }} />
            <div className="etiquette-txt"><b>{i.nom}</b><span>{fcfa(i.prix)}</span><small>{i.ref}</small></div>
          </div>
        ))}
      </div>
    </main>
  );
}
