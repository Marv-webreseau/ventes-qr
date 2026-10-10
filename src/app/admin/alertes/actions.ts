"use server";
import { revalidatePath } from "next/cache";
import { sessionCourante } from "@/lib/session";
import { ErreurMetier } from "@/domain/erreurs";
import { traiterAnomalie } from "@/services/anomalies.service";

export async function traiterAlerteAction(id: string, statut: "ECARTEE" | "CONFIRMEE", note: string) {
  try {
    const s = await sessionCourante();
    if (!s || s.user.role !== "ADMIN") return { erreur: "Accès refusé." };
    await traiterAnomalie({ id: s.user.id, role: s.user.role }, id, statut, note);
    revalidatePath("/admin/alertes");
    revalidatePath("/admin", "layout"); // met à jour le compteur de la navigation
    return { ok: true as const };
  } catch (e) {
    if (e instanceof ErreurMetier) return { erreur: e.message };
    console.error(e);
    return { erreur: "Une erreur est survenue. Réessaie." };
  }
}
