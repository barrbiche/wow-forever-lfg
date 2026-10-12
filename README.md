# Babillard Forever

Petit site pour trouver du monde avec qui jouer dans WoW Forever: annonces de groupes pour les donjons et le PvP, avec filtres (faction, règles de jeu, région, rôle, niveau).

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

## Limites de la version 1

- Connexion obligatoire pour publier, par courriel (Discord en option) (5 annonces actives par joueur au maximum). La connexion Battle.net avec import du personnage viendra après, une fois qu'on aura confirmé que l'API de Blizzard voit les personnages de Forever.
- Les annonces expirent automatiquement (1 à 6 heures). Le joueur peut retirer son annonce ou marquer un rôle comme trouvé; rien d'autre n'est modifiable.
- Les noms de donjons et de champs de bataille viennent de guides publics écrits avant le lancement (4 novembre 2026): à revérifier après la sortie.
