import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sessionCourante } from "@/lib/session";

/**
 * Cherche un article par son code complet (QR) ou par sa référence courte imprimée sur l'étiquette
 * (6 derniers caractères), pour les QR abîmés. Limité au magasin de l'utilisateur.
 */
export async function GET(_: Request, { params }: { params: Promise<{ code: string }> }) {
  const s = await sessionCourante();
  if (!s) return NextResponse.json({ message: "Session expirée. Reconnecte-toi." }, { status: 401 });
  const saisie = decodeURIComponent((await params).code).trim().toLowerCase();
  if (!/^[a-z0-9]{4,40}$/.test(saisie)) return NextResponse.json({ message: "Ce code n'est pas valide." }, { status: 400 });

  const where = { magasinId: s.user.magasinId, code: saisie.length > 12 ? saisie : { endsWith: saisie } };
  const trouves = await db.article.findMany({ where, include: { produit: true }, take: 2 });
  if (trouves.length === 0) return NextResponse.json({ message: "Ce code ne correspond à aucun article du magasin." }, { status: 404 });
  if (trouves.length > 1) return NextResponse.json({ message: "Plusieurs articles ont cette référence. Scanne le QR code." }, { status: 409 });
  return NextResponse.json({ article: trouves[0] });
}
