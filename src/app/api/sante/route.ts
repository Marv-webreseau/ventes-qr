import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Pour la supervision (ex. UptimeRobot) : répond 200 si le site ET la base fonctionnent. Aucune donnée n'est exposée.
export const dynamic = "force-dynamic";
export async function GET() {
  try { await db.$queryRaw`SELECT 1`; return NextResponse.json({ ok: true }); }
  catch { return NextResponse.json({ ok: false }, { status: 503 }); }
}
