"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sessionCourante } from "@/lib/session";
import { ErreurMetier } from "@/domain/erreurs";
import { demarrerInventaire, cloturerInventaire } from "@/services/inventaire.service";

export async function demarrerInventaireAction() {
  const s = await sessionCourante();
  if (!s || s.user.role !== "ADMIN") redirect("/connexion");
  const id = await demarrerInventaire({ id: s.user.id, role: s.user.role });
  redirect(`/admin/inventaire/${id}`);
}

export async function cloturerInventaireAction(id: string, abandon: boolean) {
  try {
    const s = await sessionCourante();
    if (!s || s.user.role !== "ADMIN") return { erreur: "Accès refusé." };
    const r = await cloturerInventaire({ id: s.user.id, role: s.user.role }, id, abandon);
    revalidatePath("/admin/inventaire"); revalidatePath("/admin", "layout");
    return r;
  } catch (e) {
    if (e instanceof ErreurMetier) return { erreur: e.message };
    console.error(e); return { erreur: "Une erreur est survenue. Réessaie." };
  }
}
