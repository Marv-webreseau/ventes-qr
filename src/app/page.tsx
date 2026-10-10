import { redirect } from "next/navigation";
import { sessionCourante } from "@/lib/session";

export default async function Accueil() {
  const s = await sessionCourante();
  if (!s) redirect("/connexion");
  redirect(s.user.role === "ADMIN" ? "/admin" : "/vendeur");
}
