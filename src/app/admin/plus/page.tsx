import Link from "next/link";
import { Users, ClipboardCheck, Settings, KeyRound, ChevronRight } from "lucide-react";
import { BoutonDeconnexion } from "@/components/bouton-deconnexion";

const LIENS = [
  { href: "/admin/equipe", label: "Équipe", aide: "Vendeurs et mots de passe", I: Users },
  { href: "/admin/inventaire", label: "Inventaire", aide: "Vérifier le rayon par scan", I: ClipboardCheck },
  { href: "/admin/reglages", label: "Réglages", aide: "Notifications, alertes, installation", I: Settings },
  { href: "/changer-mot-de-passe", label: "Mon mot de passe", aide: "Le changer", I: KeyRound },
];
export default function Plus() {
  return (
    <main className="page">
      <h1>Plus</h1>
      <ul className="liste">{LIENS.map(({ href, label, aide, I }) => (
        <li key={href}><Link href={href} className="lien-liste"><I size={22} /><span><b>{label}</b><span className="muted">{aide}</span></span><ChevronRight size={18} /></Link></li>))}</ul>
      <BoutonDeconnexion />
    </main>
  );
}
