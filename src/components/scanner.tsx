"use client";
import { useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";

/**
 * Caméra arrière ; appelle onCode une fois, puis s'arrête (le parent remonte le composant avec une nouvelle clé pour rescanner).
 * Chaque montage crée son propre élément : sûr avec le double montage de React en développement, et avec les changements d'écran rapides.
 */
export function Scanner({ onCode, onErreur }: { onCode: (c: string) => void; onErreur: (m: string) => void }) {
  const hote = useRef<HTMLDivElement>(null);
  const rappels = useRef({ onCode, onErreur });
  rappels.current = { onCode, onErreur };

  useEffect(() => {
    const el = document.createElement("div");
    el.id = `lecteur-${Math.random().toString(36).slice(2)}`;
    hote.current!.appendChild(el);
    const lecteur = new Html5Qrcode(el.id);
    let termine = false;

    const demarrage = lecteur.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 240, height: 240 } }, (texte) => {
      if (termine) return;
      termine = true;
      lecteur.stop().catch(() => {}).finally(() => rappels.current.onCode(texte.trim()));
    }, () => {});
    demarrage.catch(() => { if (!termine) rappels.current.onErreur("Impossible d'ouvrir la caméra. Autorise-la dans les réglages du navigateur."); });

    return () => {
      termine = true;
      demarrage.then(() => lecteur.stop()).catch(() => {}).finally(() => { try { lecteur.clear(); } catch { /* déjà nettoyé */ } el.remove(); });
    };
  }, []);

  return <div ref={hote} className="cadre" />;
}
