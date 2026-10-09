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

## Brancher la connexion Discord

1. discord.com/developers/applications > New Application.
2. OAuth2: copie le Client ID et le Client Secret.
3. Supabase > Authentication > Sign In / Providers > Discord: active-le et colle le Client ID et le Client Secret. Copie l'adresse « Callback URL » que Supabase affiche.
4. De retour dans Discord > OAuth2 > Redirects: colle cette adresse et sauvegarde.
5. Supabase > Authentication > URL Configuration: mets l'adresse de ton site Netlify dans « Site URL ».

Sans Supabase, le bouton de connexion est simulé (mode démo).

## Limites de la version 1

- Connexion Discord obligatoire pour publier (5 annonces actives par joueur au maximum). La connexion Battle.net avec import du personnage viendra après, une fois qu'on aura confirmé que l'API de Blizzard voit les personnages de Forever.
- Les annonces expirent automatiquement (1 à 6 heures). Le joueur peut retirer son annonce ou marquer un rôle comme trouvé; rien d'autre n'est modifiable.
- Les noms de donjons et de champs de bataille viennent de guides publics écrits avant le lancement (4 novembre 2026): à revérifier après la sortie.
