# Ventes QR

Next.js 15 · Prisma · PostgreSQL · NextAuth. Conception : voir le dossier de conception (règles métier, §3 à §5).

    npm install
    # créer un fichier .env (jamais partagé) contenant :
    #   DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL
    npm run db:push             # crée les tables
                                # (après une mise à jour du schéma, si Prisma refuse : npx prisma db push --force-reset
                                #  EFFACE TOUTES LES DONNÉES — acceptable tant que ce sont des données de test)
    npm run db:protections      # journal en ajout seul + anti double vente (à relancer sans risque)
    npm run seed
    npm run dev

## Tests

    npm test                    # règles du cycle de vie (sans base)
    DATABASE_URL=... npm test   # + tests de concurrence sur une base de TEST (jamais la production)

## Architecture

- `src/domain/` : règles pures (transitions d'état, calcul d'alertes), sans base de données.
- `src/services/` : opérations métier transactionnelles. Seul endroit où un article change d'état.
- `src/app/api/` : routes fines qui appellent les services et traduisent les erreurs.
- `prisma/protections.sql` : trigger d'ajout seul sur le journal, index unique anti double vente.

## Comptes

- Pas d'inscription publique : le propriétaire crée les vendeurs dans **Équipe** (mot de passe provisoire, affiché une seule fois, avec bouton WhatsApp).
- Première connexion : le vendeur choisit son mot de passe et reçoit un **code de récupération personnel** (usage unique).
- Mot de passe oublié : identifiant + code de récupération. Dernier recours : réinitialisation par le propriétaire.
- 5 échecs de connexion ou de code : compte bloqué 15 minutes. Changement, réinitialisation ou désactivation : sessions ouvertes fermées.
- Toutes les opérations sur les comptes sont inscrites dans un journal en ajout seul.

## Notifications sur téléphone

1. Générer les clés : `npx web-push generate-vapid-keys`
2. Ajouter dans `.env` :

       NEXT_PUBLIC_VAPID_PUBLIC_KEY="<clé publique>"
       VAPID_PRIVATE_KEY="<clé privée>"
       VAPID_SUBJECT="mailto:ton@email.com"
       CRON_SECRET="<longue valeur aléatoire>"     # facultatif : renvoi des échecs via /api/cron/notifications

3. Redémarrer, puis ouvrir **Réglages → Activer sur cet appareil**.
Sur iPhone : installer d'abord l'application sur l'écran d'accueil (Partager → Sur l'écran d'accueil). Les notifications exigent HTTPS (sauf sur localhost).
