import { NextResponse } from "next/server";
import { reponseErreur } from "@/lib/http";
import { recuperer } from "@/services/comptes.service";

export async function POST(req: Request) {
  const { identifiant, code, nouveau } = await req.json().catch(() => ({}));
  if ([identifiant, code, nouveau].some((v) => typeof v !== "string")) return NextResponse.json({ message: "Requête invalide." }, { status: 400 });
  try { return NextResponse.json(await recuperer(identifiant, code, nouveau)); }
  catch (e) { return reponseErreur(e); }
}
