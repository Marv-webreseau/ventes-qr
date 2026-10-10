import { NextResponse } from "next/server";
import { sessionCourante } from "@/lib/session";
import { reponseErreur } from "@/lib/http";
import { changerMotDePasse } from "@/services/comptes.service";

export async function POST(req: Request) {
  const s = await sessionCourante();
  if (!s) return NextResponse.json({ message: "Session expirée. Reconnecte-toi." }, { status: 401 });
  const { ancien, nouveau } = await req.json().catch(() => ({}));
  if (typeof ancien !== "string" || typeof nouveau !== "string") return NextResponse.json({ message: "Requête invalide." }, { status: 400 });
  try { return NextResponse.json(await changerMotDePasse(s.user.id, ancien, nouveau)); }
  catch (e) { return reponseErreur(e); }
}
