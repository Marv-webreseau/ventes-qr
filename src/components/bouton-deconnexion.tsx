"use client";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
export function BoutonDeconnexion() {
  return <button className="btn" onClick={() => signOut({ callbackUrl: "/connexion" })}><LogOut size={18} /> Se déconnecter</button>;
}
