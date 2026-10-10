# Liste de contrôle : premier test

Coche chaque ligne. Pour un écran qui ne marche pas : **capture d'écran + les lignes rouges du terminal** (sans mot de passe ni adresse de base).
Note la largeur de la fenêtre (grand écran, ou réduite sous 960 px = vue mobile).

## 0. Préparation
- [ ] `npm run seed` puis `npm run demo` (données de démonstration, jamais en production)
- [ ] `npm run dev`, attendre « Ready », ouvrir http://localhost:3000
- Comptes : `proprio` / `motdepasse123` · vendeurs de démo `demo.awa` et `demo.koffi` / `Demo12345`

## 1. Propriétaire, grand écran
- [ ] Connexion : la photo du rayon s'affiche à gauche, le formulaire à droite
- [ ] **Aujourd'hui** : 4 cartes de chiffres, graphique de 7 jours avec barres, « En direct » vert, ventes par vendeur, dernières ventes
- [ ] Barre de gauche : Aujourd'hui, Ventes, Alertes (avec un badge rouge), Catalogue, Équipe, Inventaire, Réglages ; l'onglet actif est en bleu
- [ ] **Ventes** : filtre par période et par vendeur, tableau, bouton « Exporter (Excel) » : le fichier s'ouvre dans Excel avec les accents corrects
- [ ] Clic sur une vente : détail avec prix catalogue/encaissé ; la vente à −30 % affiche une pastille d'écart
- [ ] **Alertes** : 3 alertes (prix, article perdu, stock bas) avec des liens « Voir… » qui fonctionnent ; « Rien d'anormal » fait baisser le badge
- [ ] **Catalogue** : stock par produit, « Robe wax » en « Stock bas », section « À traiter » (article retourné et article perdu), bouton « Remettre en rayon » fonctionne
- [ ] Fiche d'un article : chronologie lisible ; recherche par référence depuis le Catalogue
- [ ] **Équipe** : création d'un vendeur, mot de passe provisoire affiché une seule fois ; fiche du vendeur (modifier le nom, historique du compte)
- [ ] **Inventaire** : démarrer, scanner (ou saisir une référence), terminer ; un écart apparaît dans Alertes ; le détail est consultable ensuite
- [ ] **Réglages** : « Activer sur cet appareil » puis « Envoyer un test » : une notification apparaît

## 2. Vendeur
- [ ] Fenêtre privée : connexion avec un compte neuf créé dans Équipe → écran « Choisis ton mot de passe » → code de récupération affiché une fois → reconnexion
- [ ] Scanner : la caméra s'ouvre (ou le message d'erreur clair + la saisie de référence)
- [ ] Vente : fiche, prix modifiable, confirmation, écran vert ; **la notification arrive chez le propriétaire** et la vente apparaît sur son tableau de bord en moins de 20 s
- [ ] Rescanner l'article vendu : message « déjà vendu » + bouton « Enregistrer un retour » (motif obligatoire)
- [ ] « Endommagé » et « Perdu » : le signalement arrive dans Alertes du propriétaire
- [ ] **Ma journée** et **Compte** s'affichent ; « Se déconnecter » fonctionne
- [ ] « Mot de passe oublié ? » avec identifiant + code de récupération

## 3. Mobile (fenêtre réduite sous 960 px, ou vrai téléphone)
- [ ] Barre du haut (logo, clé, déconnexion) et barre d'onglets en bas ; propriétaire : 4 onglets + « Plus »
- [ ] Ventes en cartes (pas de tableau qui déborde), alertes empilées, aucun défilement horizontal de la page
- [ ] Les boutons se touchent facilement du pouce

## 4. Contrôles de sécurité simples
- [ ] Un vendeur qui ouvre `/admin` est renvoyé à la connexion
- [ ] 5 mauvais mots de passe : « Trop d'essais », compte bloqué 15 minutes
- [ ] Désactiver un vendeur dans Équipe : sa session ouverte est refusée à sa prochaine action
