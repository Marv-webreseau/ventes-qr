# Mise en ligne de Ventes QR

Hébergement recommandé : **Vercel** (application) + **Neon** (base de données, déjà utilisée). Tout est en HTTPS automatiquement, ce qui est **indispensable** pour la caméra et les notifications sur téléphone.

## 0. Avant de commencer
- Ne mets jamais `.env` sur GitHub (il est déjà exclu par `.gitignore`).
- La base de **production** doit être **neuve et séparée** de ta base de test : crée un nouveau projet Neon (région Francfort) nommé par exemple `ventes-qr-prod`.
- Ne jamais lancer `npm run seed` en production (il refuse de s'exécuter de toute façon).

## 1. Préparer la base de production
Dans Neon (projet de production), récupère l'adresse **directe** (option « Pooled connection » désactivée). Depuis ton ordinateur, dans le dossier du projet :

    set DATABASE_URL=ADRESSE_DIRECTE_DE_PRODUCTION
    npx prisma db push
    npm run db:protections
    npm run proprietaire

La dernière commande te demande ton nom, ton identifiant et ton mot de passe (masqué), puis affiche ton **code de secours une seule fois**. Note-le sur papier.
(`set` ne vaut que pour la fenêtre de terminal ouverte : ferme-la ensuite pour ne pas viser la production par erreur.)

## 2. Mettre le code sur GitHub puis sur Vercel
1. Crée un dépôt GitHub **privé** et envoie le projet (sans `node_modules`, sans `.env`).
2. Sur vercel.com : « Add New → Project », choisis ce dépôt. La région des fonctions est déjà réglée sur Francfort (`vercel.json`), proche de Neon.
3. Dans **Settings → Environment Variables**, ajoute :

| Nom | Valeur |
|---|---|
| `DATABASE_URL` | adresse **poolée** de la base de production, terminée par `?sslmode=require&pgbouncer=true&connect_timeout=15` |
| `NEXTAUTH_SECRET` | une **nouvelle** valeur : `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `NEXTAUTH_URL` | l'adresse HTTPS finale, ex. `https://ventes-qr.vercel.app` ou ton domaine |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | clé publique (**nouvelles clés** pour la production) |
| `VAPID_PRIVATE_KEY` | clé privée correspondante |
| `VAPID_SUBJECT` | `mailto:ton-email` |
| `CRON_SECRET` | une longue valeur aléatoire |

Nouvelles clés de notification : `npx web-push generate-vapid-keys`. Ne réutilise ni les secrets ni les clés de ton ordinateur.

4. Lance le déploiement (« Deploy »). Si une page affiche un problème de sécurité de contenu, ajoute la variable `DESACTIVER_CSP` = `1` le temps de m'envoyer l'erreur.

## 3. Renvoi des notifications en échec (facultatif, recommandé)
Les notifications partent déjà à chaque vente. Pour renvoyer celles qui échouent, crée une tâche gratuite sur cron-job.org :
- Adresse : `https://TON-SITE/api/cron/notifications`
- Fréquence : toutes les 5 minutes
- En-tête : `Authorization: Bearer TA_VALEUR_CRON_SECRET`

## 4. Contrôles après la mise en ligne
1. `https://TON-SITE/api/sante` répond `{"ok":true}`.
2. Connexion avec ton compte, puis **Mon mot de passe** pour vérifier que tout fonctionne.
3. **Réglages → Activer sur cet appareil → Envoyer un test**, sur ton téléphone. iPhone : installer d'abord l'application sur l'écran d'accueil.
4. Crée un vendeur, imprime une étiquette, fais une vraie vente test depuis un téléphone, puis annule-la.
5. Supervision gratuite : UptimeRobot sur `/api/sante`.

## 5. Sauvegardes
Les données de ventes sont ton historique : elles ne doivent pas se perdre. Vérifie dans Neon la durée de conservation de l'historique de ton offre (courte sur l'offre gratuite) et, au minimum, crée régulièrement une **branche** Neon comme instantané. Passe à une offre payante dès que le magasin travaille réellement avec l'outil.

## 6. Limites connues
- Pas de vente hors ligne (volontaire, pour éviter les doubles ventes).
- Les alertes détectent des écarts : elles ne prouvent rien, c'est toi qui juges.
- L'outil de test (`vitest`) a des alertes de sécurité connues. Il ne sert qu'en développement et n'est pas mis en ligne.
- Une alerte de sécurité subsiste dans Next.js 15 (PostCSS, corrigée par une surcharge de version). Prévois une montée vers la version majeure suivante après la mise en service.
