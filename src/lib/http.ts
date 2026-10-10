import { NextResponse } from "next/server";
import { sessionCourante } from "./session";
import { ErreurMetier } from "@/domain/erreurs";
import type { Acteur } from "@/services/articles.service";

export async function acteurCourant(): Promise<Acteur | null> {
  const s = await sessionCourante();
  return s ? { id: s.user.id, role: s.user.role } : null;
}

export function reponseErreur(e: unknown) {
  if (e instanceof ErreurMetier) return NextResponse.json({ message: e.message, code: e.code }, { status: e.statutHttp });
  console.error(e);
  return NextResponse.json({ message: "Une erreur est survenue. Réessaie." }, { status: 500 });
}
