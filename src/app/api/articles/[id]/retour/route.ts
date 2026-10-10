import { NextResponse, after } from "next/server";
import { envoyerNotificationsEnAttente } from "@/services/push.service";
import { acteurCourant, reponseErreur } from "@/lib/http";
import { retourner } from "@/services/articles.service";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const acteur = await acteurCourant();
  if (!acteur) return NextResponse.json({ message: "Session expirée. Reconnecte-toi." }, { status: 401 });
  const { motif } = await req.json().catch(() => ({}));
  try { await retourner(acteur, (await params).id, String(motif ?? ""));
    after(() => envoyerNotificationsEnAttente());
    return NextResponse.json({ ok: true }); }
  catch (e) { return reponseErreur(e); }
}
