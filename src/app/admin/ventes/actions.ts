"use server";
import { revalidatePath } from "next/cache";
import { sessionCourante } from "@/lib/session";
import { ErreurMetier } from "@/domain/erreurs";
import { annulerVente } from "@/services/articles.service";

export async function annulerVenteAction(venteId: string, motif: string) {
  try {
    const s = await sessionCourante();
    if (!s || s.user.role !== "ADMIN") return { erreur: "Accès refusé." };
    await annulerVente({ id: s.user.id, role: s.user.role }, venteId, motif);
    revalidatePath("/admin", "layout");
    return { ok: true as const };
  } catch (e) {
    if (e instanceof ErreurMetier) return { erreur: e.message };
    console.error(e); return { erreur: "Une erreur est survenue. Réessaie." };
  }
}
