import { NextResponse, after } from "next/server";
import { envoyerNotificationsEnAttente } from "@/services/push.service";
import { acteurCourant, reponseErreur } from "@/lib/http";
import { signaler } from "@/services/articles.service";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const acteur = await acteurCourant();
  if (!acteur) return NextResponse.json({ message: "Session expirée. Reconnecte-toi." }, { status: 401 });
  const { type, motif } = await req.json().catch(() => ({}));
  if (type !== "ENDOMMAGE" && type !== "PERDU") return NextResponse.json({ message: "Type invalide." }, { status: 400 });
  try { await signaler(acteur, (await params).id, type, motif);
    after(() => envoyerNotificationsEnAttente());
    return NextResponse.json({ ok: true }); }
  catch (e) { return reponseErreur(e); }
}
