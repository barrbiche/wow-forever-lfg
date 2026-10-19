# Babillard Forever

Petit site pour trouver du monde avec qui jouer dans WoW Forever: annonces de groupes (donjons, raids, PvP) ou de joueurs seuls, agenda des sorties planifiées, babillard de guildes qui recrutent, avec filtres (faction, règles de jeu, région, rôle, niveau, langue).

Stack: Vite + React, base de données Supabase, hébergement Netlify (déploiement automatique à chaque push sur `main`).

## Essayer en local

```
npm install
npm run dev
```

Sans configuration, le site tourne en **mode démo**: les annonces restent dans le navigateur.

## Brancher la vraie base de données (Supabase)

1. Crée un projet sur supabase.com (un projet à part, pas celui du pool).
2. SQL Editor > New query: colle le contenu de `supabase/schema.sql`, puis Run.
3. Project Settings > API: copie l'URL du projet et la clé `anon public`.
4. Netlify > Site configuration > Environment variables: ajoute
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Netlify > Deploys > Trigger deploy.
6. SQL Editor > New query: colle aussi `supabase/ameliorations.sql`, puis Run (style de jeu, langue, heure de départ, raids, message Discord à jour). Roule-le **avant** de déployer une version du site qui s'en sert. On peut le relancer sans problème.
7. SQL Editor > New query: colle aussi `supabase/ameliorations2.sql`, puis Run (joueurs seuls, classe, contacts cachés aux visiteurs, guildes, signalements, alertes Discord par type). Il faut le rouler **après** `ameliorations.sql`, et **juste après** le déploiement du site qui s'en sert: les visiteurs non connectés ne peuvent plus lire la colonne `contact`, et l'ancienne version du site (qui demandait toutes les colonnes) ne marcherait plus. On peut le relancer sans problème.
8. SQL Editor > New query: colle aussi `supabase/ameliorations3.sql`, puis Run (composition de raid avec le nombre de joueurs par rôle, bouton « Renouveler », message Discord avec les nombres). Il se roule **après** `ameliorations2.sql`, avant ou après le déploiement du site qui s'en sert (les deux ordres fonctionnent: le site retombe sur l'ancien comportement tant que la base n'est pas à jour). On peut le relancer sans problème.

## Connexion par courriel

Elle marche dès que le projet Supabase existe (le fournisseur « Email » est activé par défaut).

1. Supabase > Authentication > URL Configuration: mets l'adresse de ton site Netlify dans « Site URL ».
2. Avant le lancement, branche un vrai service de courriel (Supabase > Authentication > SMTP Settings, par exemple avec Resend). Le service de courriel intégré à Supabase envoie seulement quelques messages par heure, ce qui ne suffira pas quand le monde va arriver.

## Connexion Discord (facultative)

1. discord.com/developers/applications > New Application.
2. OAuth2: copie le Client ID et le Client Secret.
3. Supabase > Authentication > Sign In / Providers > Discord: active-le, colle le Client ID et le Client Secret, et copie la « Callback URL ».
4. Discord > OAuth2 > Redirects: colle cette adresse et sauvegarde.
5. Netlify > Environment variables: ajoute `VITE_DISCORD_ACTIF` = `1`, puis redéploie. Le bouton Discord apparaît alors dans la fenêtre de connexion.

Sans Supabase, la connexion est simulée (mode démo).

## Annonces automatiques dans Discord

1. Discord: dans le canal voulu, Modifier le canal > Intégrations > Webhooks > Nouveau webhook > Copier l'URL du webhook.
2. Supabase > SQL Editor: roule le contenu de `supabase/discord.sql`.
3. Dans une autre requête, range l'adresse du webhook dans la table `reglages` (la requête est en commentaire à la fin du fichier). Ne mets jamais cette adresse dans GitHub: le repo est public.

### Réglages facultatifs (table `reglages`, après `ameliorations2.sql`)

Chaque réglage est une ligne `cle` / `valeur`. Tout est facultatif: sans eux, tout va dans le canal du réglage `discord_webhook`.

| `cle` | Rôle |
| --- | --- |
| `discord_webhook_donjon`, `discord_webhook_raid`, `discord_webhook_pvp` | Un canal Discord par type d'annonce (sinon `discord_webhook`). |
| `discord_webhook_guilde` | Canal des guildes qui recrutent (sinon, rien n'est publié). |
| `discord_webhook_moderation` | Canal privé qui reçoit un message à chaque signalement (« Signalement 2/3 »). À 3, l'annonce ou la guilde est masquée. |
| `discord_role_tank`, `discord_role_heal`, `discord_role_dps` | Identifiant (nombre) du rôle Discord à mentionner quand un groupe cherche ce rôle. |

Pour que le monde voie le lien du Discord au bas du site, ajoute la variable Netlify `VITE_DISCORD_INVITE` (adresse d'invitation, par exemple `https://discord.gg/…`) et redéploie.

## Contacts, signalements et modération

- Les contacts (Discord, BattleTag) ne sont visibles que pour les gens connectés: la base refuse de les donner aux visiteurs anonymes. Ça freine le moissonnage en masse, mais tout compte inscrit peut les lire. Le canal Discord, lui, montre le contact: garde-le réservé aux membres.
- Chaque personne connectée peut signaler une annonce ou une guilde (une fois chacune). Après 3 signalements de comptes différents, elle est masquée automatiquement. Des faux comptes pourraient abuser de ça: surveille le canal de modération.
- Les guildes restent affichées 7, 14 ou 30 jours; 2 inscriptions actives par joueur.

## Partage de liens

- Chaque annonce et chaque guilde a un bouton « Copier le lien »: l'adresse est `https://…/?annonce=ID` ou `https://…/?guilde=ID`. Le site défile jusqu'à la carte et la met en évidence; si elle a expiré, il le dit.
- L'aperçu du lien dans Discord et ailleurs vient des balises `og:` de `index.html` et de l'image `public/og.jpg` (1200 x 630). Ces balises contiennent l'adresse complète du site: **à changer si le site prend un nom de domaine.** Discord garde les aperçus en cache un moment.
- Chaque lien montre l'aperçu général du site, pas le contenu de l'annonce (le site est une page unique, sans rendu côté serveur).

## Compte à rebours et page d'aide

- Le compte à rebours de l'en-tête vient de `LANCEMENT_LE` et `RAIDS_OUVERTS_LE` dans `src/data.js`. Il disparaît après l'ouverture des raids.
- La fenêtre « Comment ça marche » (`src/Aide.jsx`) contient les étapes, les règles du site et ce qu'il fait des données. Le texte décrit ce que le site fait vraiment: **à mettre à jour** si on ajoute des publicités, des statistiques de visite ou un autre service (et la règle sur la vente d'or ou de comptes est un choix à confirmer).

## Raids et renouvellement

- Une annonce de raid (groupe) indique combien de joueurs il faut par rôle (ex.: 2 Tank, 5 Heal, 12 DPS). La carte montre « Tank ×2 » et « 6 / 20 joueurs »; « Heal trouvé » en enlève un à la fois. Les nombres sont dans la colonne `roles_nb` (créée par `ameliorations3.sql`); les donjons n'en envoient pas.
- « Renouveler » relance une annonce (même durée qu'au départ) quand il lui reste moins de la moitié de son temps. Une annonce planifiée ne se renouvelle pas, et rien n'est reposté sur Discord. C'est la fonction SQL `renouveler_annonce` qui décide.

## Limites de la version 1

- Connexion obligatoire pour publier, par courriel (Discord en option) (5 annonces actives par joueur au maximum). La connexion Battle.net avec import du personnage viendra après, une fois qu'on aura confirmé que l'API de Blizzard voit les personnages de Forever.
- Les annonces expirent automatiquement (1 à 6 heures, ou 1 heure après le départ pour une annonce planifiée, dans les 3 prochains jours). Le joueur peut retirer son annonce ou marquer un rôle comme trouvé; le renouvellement est la seule autre modification.
- Donjons et raids demandent les mêmes règles de jeu (Normal, PvP, Jeu de rôle); les champs de bataille peuvent les mélanger. Le style de jeu reprend les quatre choix de l'outil de groupe du jeu.
- Le type « Raid » s'ouvre le 9 décembre 2026 (Barrow Deeps 10, Hyjal Summit 20, Onyxia's Lair 40). Les niveaux suggérés par donjon sont dans `src/data.js` (`NIVEAUX_DONJONS`).
- Les noms de donjons et de champs de bataille viennent de guides publics écrits avant le lancement (4 novembre 2026): à revérifier après la sortie.
