"use server";
import { revalidatePath } from "next/cache";
import { sessionCourante } from "@/lib/session";
import { ErreurMetier } from "@/domain/erreurs";
import { creerVendeur, reinitialiser, definirActif, modifierVendeur } from "@/services/comptes.service";

async function acteur() {
  const s = await sessionCourante();
  if (!s || s.user.role !== "ADMIN") throw new ErreurMetier("NON_AUTORISE", "Accès refusé.");
  return { id: s.user.id, role: s.user.role };
}

function enErreur(e: unknown) {
  if (e instanceof ErreurMetier) return { erreur: e.message };
  console.error(e);
  return { erreur: "Une erreur est survenue. Réessaie." };
}

export async function creerVendeurAction(d: { nom: string; identifiant: string; telephone: string }) {
  try {
    const r = await creerVendeur(await acteur(), d);
    revalidatePath("/admin/equipe");
    return { ...r, nom: d.nom.trim(), telephone: d.telephone.replace(/\D/g, "") || null };
  } catch (e) { return enErreur(e); }
}

export async function reinitialiserAction(id: string) {
  try {
    const r = await reinitialiser(await acteur(), id);
    revalidatePath("/admin/equipe");
    return r;
  } catch (e) { return enErreur(e); }
}

export async function definirActifAction(id: string, actif: boolean) {
  try {
    await definirActif(await acteur(), id, actif);
    revalidatePath("/admin/equipe");
    return { ok: true as const };
  } catch (e) { return enErreur(e); }
}

export async function modifierVendeurAction(id: string, nom: string, telephone: string) {
  try {
    await modifierVendeur(await acteur(), { id, nom, telephone });
    revalidatePath("/admin/equipe");
    revalidatePath(`/admin/equipe/${id}`);
    return { ok: true as const };
  } catch (e) { return enErreur(e); }
}
