import { exigerSession } from "@/lib/session";
import { db } from "@/lib/db";
import { Notifications } from "@/components/notifications";
import { InstallerApp } from "@/components/installer-app";
import { enregistrerReglages, envoyerTestAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function Reglages() {
  const s = await exigerSession();
  const m = await db.magasin.findUniqueOrThrow({ where: { id: s.user.magasinId } });
  return (
    <main className="page large">
      <h1>Réglages</h1>
      <div className="grille-reglages">
        <div className="colonne">
          <Notifications tester={envoyerTestAction} />
          <InstallerApp />
        </div>
        <form action={enregistrerReglages} className="carte">
          <h2 className="h2">Magasin et alertes</h2>
          <div className="champ"><label htmlFor="nom">Nom du magasin</label><input id="nom" name="nom" defaultValue={m.nom} maxLength={80} /></div>
          <div className="champ"><label htmlFor="baisse">Alerte si le prix baisse de plus de (%)</label><input id="baisse" name="baisse" type="number" min={1} max={99} defaultValue={m.seuilBaissePrixPct} /></div>
          <div className="champ"><label htmlFor="retours">Alerte à partir de (retours par vendeur et par jour)</label><input id="retours" name="retours" type="number" min={1} max={50} defaultValue={m.retoursParJour} /></div>
          <div className="ligne">
            <div className="champ" style={{ flex: 1 }}><label htmlFor="rafaleN">Ventes en rafale : nombre</label><input id="rafaleN" name="rafaleN" type="number" min={2} defaultValue={m.rafaleNombre} /></div>
            <div className="champ" style={{ flex: 1 }}><label htmlFor="rafaleM">en moins de (minutes)</label><input id="rafaleM" name="rafaleM" type="number" min={1} defaultValue={m.rafaleMinutes} /></div>
          </div>
          <button className="btn btn-plein">Enregistrer</button>
          <p className="muted">Une alerte signale, elle n&apos;accuse jamais : c&apos;est toi qui juges.</p>
        </form>
      </div>
    </main>
  );
}
