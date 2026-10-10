"use client";
import { useEffect, useState, useTransition } from "react";
import { Bell, BellOff } from "lucide-react";

const cle = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const versUint8 = (b64: string) => { const p = "=".repeat((4 - (b64.length % 4)) % 4); const r = atob((b64 + p).replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from([...r].map((c) => c.charCodeAt(0))); };

export function Notifications({ tester }: { tester: () => Promise<{ erreur?: string; ok?: true }> }) {
  const [etat, setEtat] = useState<"chargement" | "indisponible" | "bloque" | "actif" | "inactif">("chargement");
  const [msg, setMsg] = useState("");
  const [ios, setIos] = useState(false);
  const [occupe, go] = useTransition();

  useEffect(() => {
    setIos(/iPhone|iPad|iPod/.test(navigator.userAgent));
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window) || !cle) return setEtat("indisponible");
      if (Notification.permission === "denied") return setEtat("bloque");
      const reg = await navigator.serviceWorker.ready;
      setEtat((await reg.pushManager.getSubscription()) ? "actif" : "inactif");
    })().catch(() => setEtat("indisponible"));
  }, []);

  const activer = () => go(async () => {
    setMsg("");
    try {
      if ((await Notification.requestPermission()) !== "granted") return setEtat("bloque");
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: versUint8(cle!) });
      const r = await fetch("/api/push/abonnement", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sub.toJSON()) });
      if (!r.ok) throw new Error();
      setEtat("actif");
    } catch { setMsg("Impossible d'activer les notifications. Réessaie."); }
  });
  const desactiver = () => go(async () => {
    const reg = await navigator.serviceWorker.ready; const sub = await reg.pushManager.getSubscription();
    if (sub) { await fetch("/api/push/abonnement", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) }); await sub.unsubscribe(); }
    setEtat("inactif");
  });

  return (
    <div className="carte">
      <h2 className="h2">Notifications de vente</h2>
      <p className="muted">Reçois une notification sur cet appareil à chaque vente, retour ou alerte, même quand l&apos;application est fermée.</p>
      {etat === "chargement" && <p className="muted">Vérification…</p>}
      {etat === "indisponible" && <p className="avis avis-warn">{!cle ? "Les notifications ne sont pas encore configurées sur ce serveur (clés manquantes)." : ios ? "Sur iPhone, installe d'abord l'application sur l'écran d'accueil (Partager → Sur l'écran d'accueil), puis rouvre-la depuis l'icône." : "Ce navigateur ne gère pas les notifications."}</p>}
      {etat === "bloque" && <p className="avis avis-err">Les notifications sont bloquées pour ce site. Autorise-les dans les réglages du navigateur, puis reviens ici.</p>}
      {etat === "inactif" && <button className="btn btn-plein" disabled={occupe} onClick={activer}><Bell size={20} /> Activer sur cet appareil</button>}
      {etat === "actif" && (<>
        <p className="avis" style={{ background: "var(--ok-f)", color: "#166534" }}>Notifications activées sur cet appareil.</p>
        <div className="ligne">
          <button className="btn" style={{ width: "auto", padding: "0 20px" }} disabled={occupe} onClick={() => go(async () => { const r = await tester(); setMsg(r.erreur ?? "Notification de test envoyée."); })}>Envoyer un test</button>
          <button className="lien" disabled={occupe} onClick={desactiver}><BellOff size={14} /> Désactiver</button>
        </div>
      </>)}
      {msg && <p className="muted" role="status">{msg}</p>}
    </div>
  );
}
