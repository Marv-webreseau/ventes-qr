import { NextResponse } from "next/server";
import { acteurCourant, reponseErreur } from "@/lib/http";
import { scannerInventaire } from "@/services/inventaire.service";

export async function POST(req: Request) {
  const acteur = await acteurCourant();
  if (!acteur) return NextResponse.json({ message: "Session expirée. Reconnecte-toi." }, { status: 401 });
  const { inventaireId, code } = await req.json().catch(() => ({}));
  if (typeof inventaireId !== "string" || typeof code !== "string") return NextResponse.json({ message: "Requête invalide." }, { status: 400 });
  try { return NextResponse.json(await scannerInventaire(acteur, inventaireId, code)); }
  catch (e) { return reponseErreur(e); }
}
