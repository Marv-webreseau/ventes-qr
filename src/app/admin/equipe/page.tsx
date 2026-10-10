import { exigerSession } from "@/lib/session";
import { listerEquipe } from "@/services/comptes.service";
import { EquipeClient } from "./equipe-client";

export const dynamic = "force-dynamic";

export default async function Equipe() {
  const s = await exigerSession(); // le layout /admin a déjà vérifié le rôle
  const membres = await listerEquipe({ id: s.user.id, role: s.user.role });
  return <EquipeClient membres={membres} urlSite={process.env.NEXTAUTH_URL ?? ""} />;
}
