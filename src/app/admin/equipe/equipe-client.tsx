"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { MessageCircle, Copy, UserPlus, KeyRound } from "lucide-react";
import { creerVendeurAction, reinitialiserAction, definirActifAction } from "./actions";

interface Membre { id: string; nom: string; identifiant: string; telephone: string | null; actif: boolean; doitChangerMdp: boolean }
interface Remise { nom: string; identifiant: string; telephone: string | null; mdpProvisoire: string }

export function EquipeClient({ membres, urlSite }: { membres: Membre[]; urlSite: string }) {
  const [remise, setRemise] = useState<Remise | null>(null);
  const [erreur, setErreur] = useState("");
  const [copie, setCopie] = useState(false);
  const [occupe, demarrer] = useTransition();

  const lancer = (f: () => Promise<unknown>) => demarrer(async () => {
    setErreur("");
    const r = (await f()) as { erreur?: string } & Partial<Remise>;
    if (r.erreur) return setErreur(r.erreur);
    if (r.mdpProvisoire) { setRemise({ nom: r.nom ?? "", identifiant: r.identifiant ?? "", telephone: r.telephone ?? null, mdpProvisoire: r.mdpProvisoire }); setCopie(false); }
  });

  const message = (r: Remise) =>
    `Bonjour ${r.nom}, voici ton accès à Ventes QR.\nIdentifiant : ${r.identifiant}\nMot de passe provisoire : ${r.mdpProvisoire}\nConnecte-toi sur ${urlSite} : tu choisiras ensuite ton propre mot de passe.`;

  return (
    <main className="page large">
      <h1>Équipe</h1>
      <p className="muted">Crée les comptes de tes vendeurs. Chacun choisit son mot de passe à sa première connexion.</p>

      {remise && (
        <section className="carte carte-remise" role="status">
          <h2 className="h2">Mot de passe provisoire de {remise.nom}</h2>
          <div className="code-box">{remise.mdpProvisoire}</div>
          <p className="muted">À transmettre maintenant : <b>il ne sera plus affiché</b>. Identifiant : <b>{remise.identifiant}</b>.</p>
          <div className="ligne">
            <button className="btn" style={{ width: "auto", padding: "0 20px" }} onClick={async () => { await navigator.clipboard?.writeText(message(remise)).catch(() => {}); setCopie(true); }}>
              <Copy size={18} /> {copie ? "Message copié" : "Copier le message"}
            </button>
            {remise.telephone && (
              <a className="btn btn-plein" style={{ width: "auto", padding: "0 20px", minHeight: 56, fontSize: 16 }} target="_blank" rel="noopener noreferrer"
                href={`https://wa.me/${remise.telephone}?text=${encodeURIComponent(message(remise))}`}>
                <MessageCircle size={18} /> Envoyer par WhatsApp
              </a>
            )}
            <button className="lien" onClick={() => setRemise(null)}>Fermer</button>
          </div>
        </section>
      )}

      <form className="carte" onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget; const f = new FormData(form);
        lancer(async () => { const r = await creerVendeurAction({ nom: String(f.get("nom")), identifiant: String(f.get("identifiant")), telephone: String(f.get("telephone") ?? "") }); if (!("erreur" in r)) form.reset(); return r; });
      }}>
        <h2 className="h2">Nouveau vendeur</h2>
        <div className="ligne">
          <div className="champ" style={{ flex: 1, minWidth: 160 }}><label htmlFor="nom">Nom</label><input id="nom" name="nom" required /></div>
          <div className="champ" style={{ flex: 1, minWidth: 160 }}><label htmlFor="identifiant">Identifiant de connexion</label><input id="identifiant" name="identifiant" autoCapitalize="none" spellCheck={false} placeholder="awa" required /></div>
          <div className="champ" style={{ flex: 1, minWidth: 160 }}><label htmlFor="telephone">WhatsApp (optionnel)</label><input id="telephone" name="telephone" inputMode="tel" placeholder="+229…" /></div>
        </div>
        {erreur && <p className="avis avis-err" role="alert">{erreur}</p>}
        <button className="btn btn-plein" style={{ maxWidth: 260 }} disabled={occupe}><UserPlus size={20} /> Créer le compte</button>
      </form>

      <section className="carte">
        <h2 className="h2">Vendeurs</h2>
        {membres.length === 0 ? <p className="muted">Aucun vendeur pour le moment.</p> : (
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead><tr><th>Nom</th><th>Identifiant</th><th>État</th><th /></tr></thead>
              <tbody>{membres.map((m) => (
                <tr key={m.id}>
                  <td><Link className="lien-tableau" href={`/admin/equipe/${m.id}`}>{m.nom}</Link></td><td>{m.identifiant}</td>
                  <td><span className={`pastille ${m.actif ? "pastille-ok" : "pastille-neutre"}`}>{!m.actif ? "Désactivé" : m.doitChangerMdp ? "En attente de 1re connexion" : "Actif"}</span></td>
                  <td className="actions-ligne">
                    <button className="lien" disabled={occupe} onClick={() => confirm(`Réinitialiser le mot de passe de ${m.nom} ? Ses sessions ouvertes seront fermées.`) && lancer(() => reinitialiserAction(m.id))}><KeyRound size={14} /> Réinitialiser</button>
                    <button className="lien" disabled={occupe} onClick={() => (m.actif ? confirm(`Désactiver ${m.nom} ? Son accès est coupé tout de suite, son historique est conservé.`) : true) && lancer(() => definirActifAction(m.id, !m.actif))}>{m.actif ? "Désactiver" : "Réactiver"}</button>
                  </td>
                </tr>))}</tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
