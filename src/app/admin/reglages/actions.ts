"use server";
import { revalidatePath } from "next/cache";
import { sessionCourante } from "@/lib/session";
import { db } from "@/lib/db";
import { envoyerNotificationsEnAttente } from "@/services/push.service";

const borne = (v: FormDataEntryValue | null, min: number, max: number, defaut: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : defaut;
};

export async function enregistrerReglages(f: FormData) {
  const s = await sessionCourante();
  if (!s || s.user.role !== "ADMIN") return;
  await db.magasin.update({ where: { id: s.user.magasinId }, data: {
    nom: String(f.get("nom") ?? "").trim().slice(0, 80) || "Mon magasin",
    seuilBaissePrixPct: borne(f.get("baisse"), 1, 99, 20),
    retoursParJour: borne(f.get("retours"), 1, 50, 3),
    rafaleNombre: borne(f.get("rafaleN"), 2, 100, 5),
    rafaleMinutes: borne(f.get("rafaleM"), 1, 120, 5),
  } });
  revalidatePath("/admin/reglages");
}

export async function envoyerTestAction() {
  const s = await sessionCourante();
  if (!s || s.user.role !== "ADMIN") return { erreur: "Accès refusé." };
  const appareils = await db.abonnementPush.count({ where: { userId: s.user.id } });
  if (appareils === 0) return { erreur: "Aucun appareil abonné. Active d'abord les notifications ci-dessus." };
  await db.notification.create({ data: { userId: s.user.id, titre: "Test", corps: "Les notifications fonctionnent sur cet appareil.", lien: "/admin" } });
  const r = await envoyerNotificationsEnAttente();
  return r.desactive ? { erreur: "Clés de notification absentes du fichier .env (voir README)." } : { ok: true as const };
}
