import { NextResponse } from "next/server";
import { sessionCourante } from "@/lib/session";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const s = await sessionCourante();
  if (!s) return NextResponse.json({ message: "Session expirée." }, { status: 401 });
  const b = await req.json().catch(() => null);
  const endpoint = b?.endpoint, p256dh = b?.keys?.p256dh, auth = b?.keys?.auth;
  if (typeof endpoint !== "string" || !endpoint.startsWith("https://") || typeof p256dh !== "string" || typeof auth !== "string")
    return NextResponse.json({ message: "Abonnement invalide." }, { status: 400 });
  await db.abonnementPush.upsert({ where: { endpoint }, update: { userId: s.user.id, p256dh, auth }, create: { userId: s.user.id, endpoint, p256dh, auth } });
  const anciens = await db.abonnementPush.findMany({ where: { userId: s.user.id }, orderBy: { creeLe: "desc" }, skip: 10, select: { id: true } });
  if (anciens.length) await db.abonnementPush.deleteMany({ where: { id: { in: anciens.map((a) => a.id) } } });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const s = await sessionCourante();
  if (!s) return NextResponse.json({ message: "Session expirée." }, { status: 401 });
  const { endpoint } = (await req.json().catch(() => ({}))) as { endpoint?: string };
  if (typeof endpoint === "string") await db.abonnementPush.deleteMany({ where: { endpoint, userId: s.user.id } });
  return NextResponse.json({ ok: true });
}
