import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

/** Session valide ou null (compte désactivé ou session fermée => null). À utiliser partout. */
export async function sessionCourante() {
  const s = await getServerSession(authOptions);
  return s?.user?.id ? s : null;
}

/** Pour les pages protégées : renvoie la session, ou redirige vers la connexion (jamais d'erreur si le compte vient d'être désactivé). */
export async function exigerSession() {
  const s = await sessionCourante();
  if (!s) redirect("/connexion");
  return s;
}
