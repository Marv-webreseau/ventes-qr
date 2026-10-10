import { NextResponse } from "next/server";
import { envoyerNotificationsEnAttente } from "@/services/push.service";

// Filet de sécurité : à appeler toutes les minutes par un planificateur (ex. cron-job.org) pour renvoyer les échecs.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ message: "Accès refusé." }, { status: 401 });
  return NextResponse.json(await envoyerNotificationsEnAttente());
}
