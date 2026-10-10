"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
/** Actualise la page toutes les 20 s tant qu'elle est visible : les ventes apparaissent sans recharger. */
export function Rafraichir() {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === "visible") router.refresh(); }, 20_000);
    return () => clearInterval(t);
  }, [router]);
  return <span className="direct" title="Actualisation automatique"><i /> En direct</span>;
}
