import { NextResponse, after } from "next/server";
import { envoyerNotificationsEnAttente } from "@/services/push.service";
import { acteurCourant, reponseErreur } from "@/lib/http";
import { vendre } from "@/services/articles.service";

export async function POST(req: Request) {
  const acteur = await acteurCourant();
  if (!acteur) return NextResponse.json({ message: "Session expirée. Reconnecte-toi." }, { status: 401 });
  const { articleId, montant } = await req.json().catch(() => ({}));
  if (typeof articleId !== "string") return NextResponse.json({ message: "Requête invalide." }, { status: 400 });
  try {
    const vente = await vendre(acteur, articleId, montant);
    after(() => envoyerNotificationsEnAttente()); // la réponse part tout de suite, la notification suit
    return NextResponse.json({ vente }, { status: 201 });
  } catch (e) { return reponseErreur(e); }
}
