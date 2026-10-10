import Link from "next/link";
import { KeyRound } from "lucide-react";
import { exigerSession } from "@/lib/session";
import { db } from "@/lib/db";
import { BoutonDeconnexion } from "@/components/bouton-deconnexion";

export const dynamic = "force-dynamic";

export default async function Compte() {
  const s = await exigerSession();
  const u = await db.user.findUnique({ where: { id: s.user.id }, select: { nom: true, identifiant: true } });
  return (
    <main className="page">
      <h1>Compte</h1>
      <div className="carte">
        <div><span className="muted">Nom</span><p><b>{u?.nom}</b></p></div>
        <div><span className="muted">Identifiant de connexion</span><p><b>{u?.identifiant}</b></p></div>
      </div>
      <Link className="btn" href="/changer-mot-de-passe"><KeyRound size={18} /> Changer mon mot de passe</Link>
      <p className="muted">Mot de passe oublié plus tard ? Utilise ton code de récupération sur la page de connexion.</p>
      <BoutonDeconnexion />
    </main>
  );
}
