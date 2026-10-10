"use client";
import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LayoutDashboard, Receipt, Package, Bell, Users, ScanLine, ListChecks, User, LogOut, KeyRound, MoreHorizontal, ClipboardCheck, Settings } from "lucide-react";

const ICONES = { dashboard: LayoutDashboard, ventes: Receipt, catalogue: Package, alertes: Bell, equipe: Users, scan: ScanLine, journee: ListChecks, compte: User, plus: MoreHorizontal, inventaire: ClipboardCheck, reglages: Settings };
export interface Entree { href: string; label: string; icone: keyof typeof ICONES; badge?: number; racine?: boolean; aussi?: string[]; secondaire?: boolean }

/**
 * Cadre commun. Ordinateur : barre latérale fixe. Mobile : barre du haut + barre d'onglets en bas (zone du pouce).
 */
export function Shell({ entrees, nom, role, plus, children }: { entrees: Entree[]; nom: string; role: string; plus?: string; children: ReactNode }) {
  const chemin = usePathname();
  const actif = (e: Entree) => (e.racine ? chemin === e.href : [e.href, ...(e.aussi ?? [])].some((h) => chemin.startsWith(h)));
  const principales = entrees.filter((e) => !e.secondaire);
  const plusActif = !!plus && (chemin.startsWith(plus) || entrees.some((e) => e.secondaire && actif(e)));
  const sortir = () => signOut({ callbackUrl: "/connexion" });
  const Pastille = ({ n }: { n?: number }) => (n ? <span className="badge" aria-label={`${n} à traiter`}>{n > 99 ? "99+" : n}</span> : null);

  return (
    <div className="app">
      <aside className="rail">
        <div className="rail-marque"><span className="cx-logo"><ScanLine size={22} /></span>Ventes QR</div>
        <nav aria-label="Navigation principale" className="rail-nav">
          {entrees.map((e) => { const I = ICONES[e.icone]; return (
            <Link key={e.href} href={e.href} className={`rail-lien ${actif(e) ? "actif" : ""}`} aria-current={actif(e) ? "page" : undefined}>
              <I size={20} /><span>{e.label}</span><Pastille n={e.badge} />
            </Link>); })}
        </nav>
        <div className="rail-pied">
          <div className="rail-user"><b>{nom}</b><span className="muted">{role}</span></div>
          <Link href="/changer-mot-de-passe" className="rail-lien"><KeyRound size={18} /><span>Mon mot de passe</span></Link>
          <button className="rail-lien" onClick={sortir}><LogOut size={18} /><span>Se déconnecter</span></button>
        </div>
      </aside>

      <header className="topbar">
        <div className="rail-marque"><span className="cx-logo"><ScanLine size={20} /></span>Ventes QR</div>
        <div className="topbar-actions">
          <Link href="/changer-mot-de-passe" aria-label="Mon mot de passe" className="icone-btn"><KeyRound size={20} /></Link>
          <button onClick={sortir} aria-label="Se déconnecter" className="icone-btn"><LogOut size={20} /></button>
        </div>
      </header>

      <div className="contenu">{children}</div>

      <nav className="tabbar" aria-label="Navigation principale">
        {principales.map((e) => { const I = ICONES[e.icone]; return (
          <Link key={e.href} href={e.href} className={`tab ${actif(e) ? "actif" : ""}`} aria-current={actif(e) ? "page" : undefined}>
            <span className="tab-icone"><I size={22} /><Pastille n={e.badge} /></span><span>{e.label}</span>
          </Link>); })}
        {plus && <Link href={plus} className={`tab ${plusActif ? "actif" : ""}`} aria-current={plusActif ? "page" : undefined}><span className="tab-icone"><MoreHorizontal size={22} /></span><span>Plus</span></Link>}
      </nav>
    </div>
  );
}
