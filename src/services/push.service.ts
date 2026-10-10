import webpush from "web-push";
import { db } from "@/lib/db";

let configure: boolean | null = null;
function configurer() {
  if (configure !== null) return configure;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY, sujet = process.env.VAPID_SUBJECT;
  if (!pub || !priv || !sujet) { console.warn("[push] Notifications désactivées : clés VAPID absentes de .env"); return (configure = false); }
  webpush.setVapidDetails(sujet, pub, priv);
  return (configure = true);
}

/**
 * Envoie les notifications de la boîte d'envoi. Sûr à appeler plusieurs fois en parallèle :
 * chaque notification est « réservée » (compteur d'essais) avant l'envoi, donc jamais envoyée en double.
 */
export async function envoyerNotificationsEnAttente(max = 50) {
  if (!configurer()) return { envoyees: 0, desactive: true };
  const attente = await db.notification.findMany({ where: { envoyeeLe: null, tentatives: { lt: 5 } }, orderBy: { creeLe: "asc" }, take: max });
  let envoyees = 0;
  for (const n of attente) {
    const { count } = await db.notification.updateMany({ where: { id: n.id, envoyeeLe: null, tentatives: n.tentatives }, data: { tentatives: { increment: 1 } } });
    if (count === 0) continue;
    const abonnements = await db.abonnementPush.findMany({ where: { userId: n.userId } });
    if (abonnements.length === 0) { await db.notification.update({ where: { id: n.id }, data: { envoyeeLe: new Date(), erreur: "Aucun appareil abonné" } }); continue; }

    const charge = JSON.stringify({ titre: n.titre, corps: n.corps, url: n.lien ?? "/admin" });
    let reussi = false, erreur = "";
    for (const a of abonnements) {
      try {
        await webpush.sendNotification({ endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } }, charge, { TTL: 3600, urgency: "high" });
        reussi = true;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) await db.abonnementPush.deleteMany({ where: { id: a.id } }); // appareil désinstallé
        else erreur = String(code ?? (e as Error).message);
      }
    }
    if (reussi) { envoyees++; await db.notification.update({ where: { id: n.id }, data: { envoyeeLe: new Date(), erreur: null } }); }
    else if (!erreur) await db.notification.update({ where: { id: n.id }, data: { envoyeeLe: new Date(), erreur: "Abonnements expirés" } });
    else await db.notification.update({ where: { id: n.id }, data: { erreur } });
  }
  return { envoyees, desactive: false };
}
