import { redirect } from "next/navigation";
import { Search } from "lucide-react";
import { exigerSession } from "@/lib/session";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function RechercheArticle({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const s = await exigerSession();
  const r = ((await searchParams).ref ?? "").trim().toLowerCase();
  let message = "";
  if (r) {
    if (!/^[a-z0-9]{4,40}$/.test(r)) message = "Cette référence n'est pas valide (lettres et chiffres, 4 caractères minimum).";
    else {
      const t = await db.article.findMany({ where: { magasinId: s.user.magasinId, code: r.length > 12 ? r : { endsWith: r } }, select: { id: true }, take: 2 });
      if (t.length === 1) redirect(`/admin/articles/${t[0]!.id}`);
      message = t.length === 0 ? "Aucun article avec cette référence." : "Plusieurs articles ont cette référence : saisis plus de caractères.";
    }
  }
  return (
    <main className="page">
      <a className="lien retour" href="/admin/produits">← Catalogue</a>
      <h1>Chercher un article</h1>
      <p className="muted">Entre la référence imprimée sur l&apos;étiquette (6 caractères) pour voir tout son parcours.</p>
      <form className="carte" method="get">
        <label htmlFor="ref" style={{ fontWeight: 600 }}>Référence</label>
        <input id="ref" name="ref" defaultValue={r.toUpperCase()} autoCapitalize="characters" autoComplete="off" placeholder="Ex. 7K2QX9" />
        {message && <p className="avis avis-warn" role="status">{message}</p>}
        <button className="btn btn-plein"><Search size={20} /> Chercher</button>
      </form>
    </main>
  );
}
