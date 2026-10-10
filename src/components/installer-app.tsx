"use client";
import { useEffect, useState } from "react";
import { Smartphone } from "lucide-react";

type Evt = Event & { prompt: () => Promise<void> };

export function InstallerApp() {
  const [evt, setEvt] = useState<Evt | null>(null);
  const [installe, setInstalle] = useState(false);
  const [ios, setIos] = useState(false);
  useEffect(() => {
    setInstalle(window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true);
    setIos(/iPhone|iPad|iPod/.test(navigator.userAgent));
    const avant = (e: Event) => { e.preventDefault(); setEvt(e as Evt); };
    window.addEventListener("beforeinstallprompt", avant);
    window.addEventListener("appinstalled", () => setInstalle(true));
    return () => window.removeEventListener("beforeinstallprompt", avant);
  }, []);
  return (
    <div className="carte">
      <h2 className="h2">Installer l&apos;application</h2>
      {installe ? <p className="avis" style={{ background: "var(--ok-f)", color: "#166534" }}>Application installée sur cet appareil.</p> : (<>
        <p className="muted">Une icône sur l&apos;écran d&apos;accueil, un plein écran, et les notifications. Sans passer par une boutique d&apos;applications.</p>
        {evt ? <button className="btn btn-plein" onClick={async () => { await evt.prompt(); setEvt(null); }}><Smartphone size={20} /> Installer</button>
          : <p className="avis avis-warn">{ios ? "Dans Safari : touche Partager, puis « Sur l'écran d'accueil »." : "Dans le menu du navigateur (⋮), choisis « Installer l'application » ou « Ajouter à l'écran d'accueil »."}</p>}
      </>)}
    </div>
  );
}
