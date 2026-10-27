# Babillard Forever

Petit site pour trouver du monde avec qui jouer dans WoW Forever: annonces de groupes (donjons, raids, PvP) ou de joueurs seuls, agenda des sorties planifiées, babillard de guildes qui recrutent, avec filtres (faction, règles de jeu, région, rôle, niveau, langue), liste de joueurs et d'amis, guides de donjons et une page de modération.

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

9. SQL Editor > New query: colle aussi `supabase/ameliorations4.sql`, puis Run (page « Joueurs »: profils, spécialisation, pouces de réputation, signalements de joueurs). Il se roule **après** `ameliorations3.sql`, avant ou après le déploiement du site qui s'en sert: tant que la base n'est pas à jour, l'onglet Joueurs affiche « pas encore disponible » et le reste du site marche normalement. On peut le relancer sans problème.

10. SQL Editor > New query: colle aussi `supabase/ameliorations5.sql`, puis Run (page « Modération »: modérateurs, comptes suspendus, journal). Il se roule **après** `ameliorations4.sql`. Tant qu'il n'est pas roulé, personne n'est modérateur et le lien « Modération » n'apparaît pas; le reste du site marche. Pour te donner l'accès, suis les étapes en commentaire au début du fichier (tu écris ton propre identifiant dans la table `moderateurs`; ne le mets jamais dans GitHub). On peut le relancer sans problème.

11. SQL Editor > New query: colle aussi `supabase/ameliorations6.sql`, puis Run (amis: demandes, liste, blocage). Il se roule **après** `ameliorations5.sql` (il refuse de rouler sans lui, avec un message clair). Tant qu'il n'est pas roulé, les boutons d'amis n'apparaissent pas et « Mes amis » dit « pas encore disponibles »; le reste du site marche. On peut le relancer sans problème.

12. SQL Editor > New query: colle aussi `supabase/ameliorations8.sql`, puis Run (demandes pour rejoindre, chat de groupe, chat entre amis, messages signalés). Il se roule **après** `ameliorations7.sql` (il refuse de rouler sans les tables d'amis et de modération). **Attention:** il retire le droit de lire la colonne `contact` des annonces aux joueurs connectés (les visiteurs ne l'avaient déjà pas): le contact ne passe plus que par le chat du groupe. Le site mis à jour marche avec les deux états de la base; tant que ce fichier n'est pas roulé, les cartes disent « Les demandes pour rejoindre arrivent bientôt » et l'onglet Messages dit « pas encore activée ». On peut le relancer sans problème.

13. (Facultatif, pour le badge « Supporter ») SQL Editor > New query: colle `supabase/ameliorations9.sql`, puis Run. Voir la section « Dons et badge » plus bas. Sans ce fichier, le site marche pareil: il n'y a juste pas de badge.

14. SQL Editor > New query: colle `supabase/ameliorations10.sql`, puis Run (groupe complet, statistiques, annonces qui se répètent, alertes). À rouler après `ameliorations8.sql` (et 9 si tu l'as). Chaque partie du fichier a un titre « PARTIE n »; on peut le relancer sans problème (si tu relances `ameliorations8.sql`, relance `ameliorations10.sql` juste après). Le site marche avec ou sans ce fichier: tant qu'une partie manque, la fonction correspondante ne s'affiche tout simplement pas.

15. SQL Editor > New query: colle `supabase/ameliorations11.sql`, puis Run (la boîte à messages « Un bogue ou une idée? »). Les messages arrivent dans Table Editor > `retours` (les plus récents en premier). Sans ce fichier, le formulaire s'affiche mais répond que la boîte n'est pas prête.

16. SQL Editor > New query: colle `supabase/ameliorations12.sql`, puis Run (« La Taverne », le salon de discussion ouvert à tous). À rouler après `ameliorations8.sql` (le chat). Les messages du salon sont effacés après 48 h; les signalements passent par la fenêtre « Modération ». Sans ce fichier, la Taverne s'affiche mais dit qu'elle n'est pas encore activée.

17. SQL Editor > New query: colle `supabase/ameliorations13.sql`, puis Run (nouveau type d'annonce « Quêtes » pour monter de niveau ensemble). **À rouler avant de pousser la mise à jour du site**: sans lui, publier une annonce de quêtes échoue. Les annonces de quêtes n'ont pas de rôles; un groupe de quêtes se remplit à 5 joueurs comme un donjon.

18. SQL Editor > New query: colle `supabase/ameliorations14.sql`, puis Run (compteur « N visiteurs aujourd'hui » dans l'en-tête). Une visite est comptée une fois par jour et par navigateur; la base ne garde qu'un nombre par jour (Table Editor > `visites_jour` pour l'historique). Sans ce fichier, le compteur est simplement caché.

19. SQL Editor > New query: colle `supabase/ameliorations15.sql`, puis Run (compteur « N groupes formés aujourd'hui » dans l'en-tête). Un groupe compte comme formé quand son chef a accepté au moins une personne aujourd'hui (heure du Québec). La ligne n'apparaît que s'il y en a au moins un. Sans ce fichier, elle est simplement cachée.

## Aperçu des liens (Discord, Facebook, Messenger)

Quand on colle un lien `?annonce=...` ou `?guilde=...`, `netlify/edge-functions/apercu.mjs` écrit le titre et la description de l'annonce dans la page, pour que l'aperçu dise par exemple « Donjon: The Deadmines — Babillard Forever » et « Mirabelle forme un groupe · cherche DPS · niveaux 18-23 ». Elle lit la base avec la clé publique `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`. Si Netlify ne les donne pas aux fonctions (Site configuration > Environment variables: la portée doit inclure « Functions »), ou si l'annonce est expirée, la page normale est servie. Discord garde un aperçu en mémoire un moment: pour retester un lien, ajoute `&test=2` à la fin.

## Connexion par courriel

Elle marche dès que le projet Supabase existe (le fournisseur « Email » est activé par défaut).

1. Supabase > Authentication > URL Configuration: mets l'adresse de ton site Netlify dans « Site URL ».
2. Avant le lancement, branche un vrai service de courriel (Supabase > Authentication > SMTP Settings, par exemple avec Resend). Le service de courriel intégré à Supabase envoie seulement quelques messages par heure, ce qui ne suffira pas quand le monde va arriver.

## Connexion Google (recommandée)

Google est la connexion la plus simple pour la plupart des gens, et elle ne dépend pas de l'envoi de courriels. Le bouton « Continuer avec Google » reste caché tant que la variable Netlify n'est pas mise (étape 8).

1. Supabase > Authentication > Sign In / Providers > **Google**: ouvre la page sans rien remplir et copie la « Callback URL » (elle ressemble à `https://<ton-projet>.supabase.co/auth/v1/callback`).
2. console.cloud.google.com: crée un projet (par exemple « Babillard Forever »).
3. Menu > **Google Auth Platform** > Get started (ou Branding): nom de l'application « Babillard Forever », ton courriel d'assistance, public (Audience) **External**, ton courriel de contact. Dans Branding, mets l'adresse du site comme page d'accueil.
4. **Audience** > **Publish app** (« In production »). Sinon, seuls les comptes que tu ajoutes comme testeurs peuvent se connecter. Le site ne demande que les permissions de base (courriel et profil): d'après la doc de Supabase, seules les permissions sensibles demandent une vérification de Google.
5. **Clients** > Create client > type **Web application**:
   - Authorized JavaScript origins: l'adresse du site (`https://babillard-forever.com`).
   - Authorized redirect URIs: la « Callback URL » copiée à l'étape 1.
   - Copie le **Client ID** et le **Client Secret**.
6. Retourne dans Supabase, même page Google: active-le, colle le Client ID et le Client Secret, **Save**.
7. Supabase > Authentication > URL Configuration: vérifie que « Site URL » est l'adresse du site et que cette adresse est dans « Redirect URLs » (c'est déjà le cas si la connexion par courriel ou Discord marche).
8. Netlify > Site configuration > Environment variables: ajoute `VITE_GOOGLE_ACTIF` = `1`, puis Deploys > Trigger deploy > **Clear cache and deploy site** (les variables `VITE_` sont lues au moment de la construction du site).
9. Essaie dans une fenêtre privée: Se connecter > Continuer avec Google.

À savoir:
- Le site reçoit le nom complet, le courriel et l'adresse de la photo du compte Google. Il n'affiche que le prénom à la personne elle-même, ne préremplit jamais le nom complet comme contact, et ne montre jamais le nom ni le courriel aux autres joueurs.
- Google refuse la connexion dans le navigateur intégré d'autres applications (Messenger, Facebook, Instagram…, erreur `disallowed_useragent`). Le site détecte la plupart de ces cas et suggère d'ouvrir le site dans le navigateur ou d'utiliser le courriel.
- Si le bouton Google mène à une page d'erreur de Supabase (« provider is not enabled »), l'étape 6 n'est pas faite ou pas sauvegardée.

## Connexion: Google seulement

La connexion se fait avec Google (voir plus haut). Il n'y a plus de connexion Discord ni de lien par courriel quand `VITE_GOOGLE_ACTIF` = `1`. Sans cette variable (et en mode démo), le site retombe sur le lien par courriel, pour pouvoir l'essayer sans configuration.

Les variables Netlify `VITE_DISCORD_ACTIF` et `VITE_DISCORD_INVITE` ne servent plus: tu peux les supprimer. Les comptes créés avec Discord avant restent dans la base.

12. SQL Editor > New query: colle aussi `supabase/ameliorations7.sql`, puis Run (arrête l'envoi des annonces et des guildes dans Discord; voir plus bas). Il se roule **après** `ameliorations6.sql`. On peut le relancer sans problème.

Pour tout rouler d'un coup (4, 5, 6 et 7), il existe aussi un seul fichier « mise à jour complète » qui les colle dans le bon ordre.

Sans Supabase, la connexion est simulée (mode démo).

### Donner l'accès « Modération » à un compte Google

Le lien « Modération » apparaît pour les comptes listés dans la table `moderateurs`. Dans le SQL Editor du projet du Babillard (pas celui d'un autre projet), remplace le courriel par celui du compte Google:

```sql
insert into public.moderateurs (user_id)
select id from auth.users where email = 'ton.courriel@gmail.com'
on conflict do nothing;

-- vérification: la liste des modérateurs avec leur courriel
select m.user_id, u.email from public.moderateurs m join auth.users u on u.id = m.user_id;
```

## Discord: ce qui reste

Le site ne renvoie plus les gens vers un Discord: plus de bouton « Rejoindre le Discord », et les nouvelles annonces et guildes ne sont plus envoyées dans un canal (`ameliorations7.sql` supprime les envois et efface les réglages `discord_webhook`, `discord_webhook_donjon`, `_raid`, `_pvp`, `_guilde` et `discord_role_*`). La variable Netlify `VITE_DISCORD_INVITE` ne sert plus: tu peux la supprimer.

Ce qui reste volontairement:
- L'alerte **privée** de signalement: si le réglage `discord_webhook_moderation` est rangé dans `reglages`, chaque signalement y est envoyé (« Signalement 2/3 »; à 3, l'annonce, la guilde ou la réputation est masquée). Pour l'arrêter aussi: `delete from public.reglages where cle = 'discord_webhook_moderation';`.
- Les joueurs peuvent écrire leur BattleTag (ou leur nom Discord) comme contact. Une guilde peut mettre une invitation Discord, un site, une page Facebook ou un BattleTag: les adresses https deviennent des liens cliquables (jamais un autre protocole).

### Réglage facultatif (table `reglages`)

| `cle` | Rôle |
| --- | --- |
| `discord_webhook_moderation` | Canal privé qui reçoit un message à chaque signalement (« Signalement 2/3 »). |

Ancienne installation (gardée pour mémoire): `supabase/discord.sql` créait l'envoi des annonces avec un webhook rangé dans `reglages`. `ameliorations7.sql` l'enlève.

## Contacts, signalements et modération

- Le contact d'une annonce (BattleTag) n'est visible ni des visiteurs ni des autres joueurs connectés: depuis `ameliorations8.sql`, la colonne `annonces.contact` n'est lisible que par la base elle-même. Le chef et les joueurs qu'il accepte le reçoivent dans le chat du groupe (copie dans `groupes.contact`); les modérateurs le voient dans la file de modération. Seul le BattleTag que quelqu'un écrit lui-même dans son profil reste visible de toutes les personnes connectées. Le contact des guildes reste visible des gens connectés.
- Chaque personne connectée peut signaler une annonce, une guilde ou un joueur (une fois chacun). Après 3 signalements de comptes différents, elle est masquée automatiquement. Des faux comptes pourraient abuser de ça: surveille le canal de modération.
- Les guildes restent affichées 7, 14 ou 30 jours; 2 inscriptions actives par joueur.

## Dons et badge « Supporter »

- Le bouton « Soutenir le site » (en bas de page) n'apparaît que si la variable `VITE_LIEN_DONS` est définie dans Netlify (Site configuration > Environment variables), avec une adresse qui commence par `https://` (ta page Ko-fi, Buy Me a Coffee, etc.). Après l'avoir ajoutée, relance un déploiement (Deploys > Trigger deploy).
- Pour le badge: colle `supabase/ameliorations9.sql` dans le SQL Editor (étape 13), puis, pour chaque personne qui donne, Table Editor > `supporters` > Insert row avec son `user_id` (Authentication > Users > User UID). Supprime la ligne pour retirer le badge. Seuls les gens connectés voient le badge.
- Rien n'est vérifié automatiquement: c'est toi qui décides qui reçoit le badge.

## Connexion par courriel et mot de passe (en plus de Google)

- Sur le vrai site, `VITE_COURRIEL_ACTIF=1` (Netlify, puis redéployer) ajoute sous le bouton Google un formulaire courriel + mot de passe: se connecter, créer un compte, « mot de passe oublié ». Se connecter n'envoie aucun courriel; seuls la création du compte (confirmation) et le mot de passe oublié en envoient. En démo, le formulaire garde son lien simulé.
- **Réglages Supabase** (Authentication): Sign In / Providers > Email avec « Confirm email » activé et longueur minimale du mot de passe à 8. Emails > SMTP Settings: Resend (smtp.resend.com, port 465, utilisateur `resend`, mot de passe = clé API Resend, expéditeur `no-reply@babillard-forever.com`). Emails > Templates: « Confirm sign up » et « Reset Password » en français (modèles dans le dépôt de la conversation, couleurs du site).
- URL Configuration: `https://babillard-forever.com` comme Site URL et `https://babillard-forever.com/**` dans les Redirect URLs.
- Un compte créé avec Google peut aussi se choisir un mot de passe avec « Mot de passe oublié » (même adresse courriel).
- Pour éviter les faux comptes en série, on peut plus tard activer un CAPTCHA (Authentication > Attack Protection).

## Publicité (Google AdSense)

- La balise de vérification (`<meta name="google-adsense-account">` dans `index.html`) et `public/ads.txt` sont déjà en place. Elles ne chargent rien de Google.
- Rien ne s'affiche tant que ces deux variables ne sont pas réglées dans Netlify (puis redéployer): `VITE_ADSENSE_CLIENT` = `ca-pub-8930239787504104` et `VITE_ADSENSE_SLOT` = le numéro de l'unité d'annonce, créée dans AdSense (Annonces > Par unité d'annonce > Display) une fois le site approuvé.
- Avec ces variables, le site demande son choix à chaque visiteur (bandeau, « Refuser » aussi facile qu'« Accepter »). Google n'est chargé qu'après un « Accepter ». Le choix se change dans le pied de page.
- Une seule pub, en bas de la liste des groupes. Jamais dans Messages. Les supporters ne la voient pas.
- Les textes d'aide et de confidentialité changent tout seuls quand les variables sont réglées.
- Pour les visiteurs de l'Europe, Google exige son propre outil de consentement certifié: ils verront peu ou pas de pub. Rien à faire.

## Groupe complet, statistiques, annonces qui se répètent (`ameliorations10.sql`)

- **Groupe complet** (partie 1): `groupes.complet`. Un donjon (chef + 4) ou un raid avec composition se ferme tout seul quand le dernier joueur est accepté, et se rouvre si quelqu'un part. Le chef peut fermer ou rouvrir à la main. Quand c'est complet, `demander_rejoindre` refuse (erreur `55000`) et la carte dit « Groupe complet ». `places_groupes()` donne aux cartes les nombres d'acceptés par rôle (aucun nom; lisible même sans compte).
- **Quand ça joue le plus** (partie 2): table `activite_horaire` (semaine, jour, heure, nombre), remplie par un déclencheur sur `annonces` (heure de l'Est, départ prévu sinon heure de publication). Aucun lien avec un compte; 12 semaines gardées. Le graphique, en bas de page, ne s'affiche qu'à partir de 30 annonces.
- **Annonces qui se répètent** (partie 3): table `recurrences` (copie de l'annonce, contact compris; table fermée). Une annonce de groupe avec heure de départ peut se répéter chaque semaine (3 au plus par personne). `generer_recurrences()` publie l'annonce 24 h avant le départ; le site l'appelle quand quelqu'un est connecté (au plus aux 5 minutes), donc pas de tâche programmée à installer. Si personne ne vient avant, la semaine est sautée. Un compte suspendu perd ses répétitions; 5 annonces actives au plus s'applique toujours.
- **Reprendre ma dernière annonce**: gardé dans le navigateur (`forever-derniere-annonce`), aucun réglage.
- **Pouces de fin de soirée**: dans le chat d'un groupe terminé; utilise les pouces existants (`recommander`), aucun réglage.

## Alertes sur l'appareil (notifications push)

Facultatif. Sans ces réglages, rien ne s'affiche et le reste du site marche pareil.

1. **Netlify** (Site configuration > Environment variables), 5 variables: `VAPID_PUBLIC` (clé publique), `VAPID_PRIVE` (clé privée, à ne jamais partager), `VAPID_SUJET` (`https://babillard-forever.com`), `PUSH_SECRET` (mot de passe entre la base et le site) et `VITE_VAPID_PUBLIC` (la même valeur que `VAPID_PUBLIC`). Puis Deploys > Trigger deploy. Pour fabriquer de nouvelles clés: `npx web-push generate-vapid-keys`.
2. **Supabase** (SQL Editor): roule `ameliorations10.sql`, puis ces deux lignes (avec ton adresse et le même `PUSH_SECRET`):

```sql
insert into public.reglages (cle, valeur) values
  ('push_url', 'https://babillard-forever.com/.netlify/functions/push'),
  ('push_secret', 'LE_MEME_PUSH_SECRET')
on conflict (cle) do update set valeur = excluded.valeur;
```

3. Sur le site, onglet Messages > « Activer les alertes sur cet appareil ». Pour tester: avec un 2e compte (ou un ami), demande à rejoindre ton groupe: une alerte doit s'afficher.

Comment ça marche: un déclencheur dans la base (demande reçue ou acceptée, message de groupe, message d'ami) appelle la fonction Netlify `netlify/functions/push.mjs` avec le mot de passe `PUSH_SECRET`; la fonction envoie l'alerte avec les clés VAPID. L'alerte ne contient jamais le texte du message, et une seule alerte est envoyée par conversation toutes les 2 minutes. Les abonnements sont dans `push_abonnements` (5 appareils au plus par personne, retirés après 60 jours sans visite). Le service worker est `public/sw.js` (aucun cache). Le site est aussi installable sur l'écran d'accueil (`public/manifest.webmanifest`), ce qui est nécessaire pour les alertes sur iPhone.

Si les alertes n'arrivent pas: Netlify > Functions > `push` > Logs (erreur 401 = les deux `PUSH_SECRET` ne sont pas pareils), puis Supabase > Database > Extensions (`pg_net` doit être activée) et la table `net._http_response` (réponses de la fonction).

## Demandes pour rejoindre, chat de groupe et chat d'amis

- Sur une annonce, « Demander à rejoindre » (ou « Proposer un groupe » pour un joueur seul) envoie le personnage du joueur, son rôle et un mot de 140 caractères au chef. Il faut un profil. Le chef accepte, refuse ou retire quelqu'un depuis sa carte (bouton « Demandes »). Le chat du groupe s'ouvre dans la carte de l'annonce (« Ouvrir le chat »); l'onglet **Messages** ne garde que la Taverne, les amis et les « Groupes terminés », avec des filtres par état, rôle et classe. Un refus n'avertit personne et la demande ne peut pas être refaite; quitter ou annuler permet de redemander.
- Un groupe est créé automatiquement pour chaque annonce (table `groupes`, par un déclencheur). Une annonce retirée par son chef garde son groupe; une annonce retirée par la modération (ou par 3 signalements, ou un compte suspendu) **ferme** son groupe (lecture seule). Le chat est effacé **24 h après la fin de l'annonce**; le nettoyage se fait à chaque nouvelle annonce, demande ou message, et les lectures refusent déjà ce qui est périmé. Messages d'amis: effacés après 30 jours. Messages signalés (copie + 4 messages d'avant): effacés après 30 jours.
- Limites voulues (erreur `54000`): 10 demandes en attente et 20 par 24 h; 40 joueurs par groupe; 15 messages par 30 s et 1000 par jour; 500 caractères par message; 1500 messages par groupe, 2000 par paire d'amis. Un compte suspendu ne peut rien écrire. Les blocages sont respectés (impossible de demander à quelqu'un qui t'a bloqué; on ne lit pas les messages de quelqu'un qu'on a bloqué).
- Un message signalé par 3 personnes différentes est masqué (colonne `masque`). La page « Modération » liste les messages signalés avec les messages d'avant, et permet de garder, d'effacer ou de suspendre l'auteur (`mod_messages_signales`, `mod_message_ecarter`, `mod_message_effacer`). Les modérateurs peuvent lire tous les messages dans Table Editor.
- Les tables ne sont pas lisibles directement: tout passe par des fonctions (`demander_rejoindre`, `agir_demande`, `lister_demandes`, `mes_demandes`, `mes_conversations`, `lire_groupe`, `ecrire_groupe`, `lire_ami`, `ecrire_ami`, `effacer_message`, `signaler_message`, `membres_groupe`). Le site relit les conversations toutes les 10 secondes et le chat ouvert toutes les 4 secondes (pas de temps réel Supabase: plus simple, sans réglage). Le code est dans `src/messagerie.js`, `src/Messages.jsx`; le mode démo simule de faux joueurs qui répondent.
- Les adresses écrites dans le chat ne sont pas cliquables (moins d'hameçonnage). Limite connue: le chat est du texte seulement, sans notification quand le site est fermé.

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

## Page Joueurs, réputation et présence

- L'onglet « Joueurs » liste les profils: personnage, classe, niveau, rôles, faction, région, langue, style, guilde, petit mot, réputation et « en ligne » / « vu il y a ». **Seules les personnes connectées la voient**; elle ne contient jamais le contact des annonces ni de courriel. Le **BattleTag** y figure seulement si le joueur l'écrit lui-même dans « Mon profil » (colonne `profils.battletag`, format `Nom#1234` vérifié par la base): toute personne connectée peut donc le lire et le moissonner, comme le contact des annonces. Un profil caché (`visible = false`) cache aussi son BattleTag.
- Chaque carte de joueur a un bouton « Copier » pour la commande d'invitation du jeu (selon le réglage « Mon jeu est en »: `/inviter Nom` si le jeu est en français, ce qui est le réglage de départ, ou `/invite Nom` si le jeu est en anglais; `/invite` marche dans le client français et anglais, `/inviter` seulement en français; vérifié dans les chaînes du client) et un autre pour le BattleTag. Il n'y a pas de champ « royaume »: entre royaumes, le jeu peut demander `/invite Nom-Royaume`.
- **Le profil est obligatoire pour publier une annonce**: nom du personnage, classe, spécialisation, niveau (1 à 60) et au moins un rôle. « Publier une annonce » ouvre d'abord « Mon profil » si l'un manque (avec un bandeau qui l'explique), puis le formulaire d'annonce s'ouvre tout seul après l'enregistrement; le formulaire reprend le nom, la classe, la faction, la région et la langue du profil. Un profil ne peut plus s'enregistrer incomplet. Le profil est visible par défaut; chacun peut se cacher ou supprimer son profil (`profils.visible`). Ça choisit **l'inscription obligatoire pour publier, avec retrait facile**: à revoir si on préfère une inscription volontaire (Loi 25). La règle est **seulement dans le site** (rien ne l'impose dans la base): quelqu'un qui appellerait l'API directement pourrait publier sans profil. Si ça devient un problème, on pourra ajouter une règle SQL sur `annonces`.
- **Spécialisation**: 3 par classe (colonne `profils.specialisation`, identifiant sans accent; la base vérifie qu'elle appartient à la classe: contrainte `profils_specialisation_ok`). Noms français de seemeta.com/fr/wow-forever/classes, noms anglais de warcrafttavern.com/forever/guides/classes (Combat farouche = « Feral Combat »): à revérifier une fois le jeu sorti. Elle s'affiche à côté de la classe (« Mage Givre »), dans la langue du réglage « Mon jeu est en ». Tant que `ameliorations4.sql` n'est pas roulé de nouveau, le site n'exige pas la spécialisation et cache le champ.
- Un **ruban jaune défile en haut de toutes les pages** pour rappeler de garder son personnage à jour dans « Mon profil » (composant `Ruban` dans `src/App.jsx`, texte dans `TEXTE_RUBAN`). Il s'arrête sous la souris ou au clavier; pour les gens qui ont demandé moins d'animations dans leur appareil, le texte reste fixe. Cliquer ouvre « Mon profil » (ou la connexion pour un visiteur). Pour le changer ou l'enlever, modifie ou retire `Ruban` et `TEXTE_RUBAN`.
- Les données passent par `lister_joueurs()` (fonction SQL réservée aux connectés). Les tables `recommandations` et `signalements_joueurs` ne sont lisibles que par toi, dans Supabase > Table Editor: personne d'autre ne voit qui a donné un pouce ou un signalement.
- Réputation: un pouce par joueur (avec des étiquettes facultatives: Ponctuel, Sympa, Compétent, Patient, Bon chef de groupe), 10 nouveaux pouces et 5 signalements par 24 h par personne, un profil requis pour recommander. On ne peut pas vérifier que deux joueurs ont vraiment joué ensemble, et des faux comptes pourraient se recommander entre eux: surveille les profils neufs avec beaucoup de pouces.
- 3 signalements de personnes différentes mettent la réputation « en vérification » (les pouces et étiquettes ne sont plus donnés par la base). Pour la rétablir, supprime les lignes de `signalements_joueurs` concernées. Si `discord_webhook_moderation` est rangée dans `reglages`, chaque signalement de joueur y est envoyé (nom du personnage seulement).
- « En ligne »: présence en temps réel de Supabase (canal `joueurs-en-ligne`), seulement pour les gens connectés dont le profil est visible. Si Realtime est coupé dans le projet, le point vert n'apparaît pas mais le reste marche. Le canal est public: quelqu'un qui a la clé `anon` peut y voir les identifiants (UUID) des joueurs en ligne, sans nom; comme `annonces.user_id` est lisible par tous, il pourrait deviner qu'un auteur d'annonce est en ligne. Pour l'éviter plus tard: canaux privés de Realtime avec une règle sur `realtime.messages`. L'heure de dernière visite (`vu_le`) est mise à jour toutes les 10 minutes et arrondie par la base.

## Alertes et calendrier

- « M'alerter des nouvelles annonces » (sous le nombre d'annonces, onglet Groupes) garde les filtres du moment comme alerte (`src/alertes.jsx`). Tant que le site est ouvert dans un onglet, chaque nouvelle annonce qui correspond est signalée dans la page et, si la personne l'a permis, par une notification du navigateur. C'est le navigateur qui surveille: il n'y a ni serveur, ni courriel, ni notification quand le site est fermé. Le choix est gardé dans le navigateur (`forever-alerte`). Les notifications de certains navigateurs mobiles sont refusées: l'alerte reste alors dans la page.
- « Ajouter à mon calendrier » (groupes planifiés) télécharge un fichier `.ics` fabriqué dans le navigateur (`src/calendrier.js`): jour, heure (réservée pour 2 h), personnage et lien de l'annonce, **sans le contact**.

## Guides de donjons

- L'onglet « Guides » (`src/Guides.jsx`) contient 35 donjons du niveau 13 au 60. Les données sont dans `src/guides/donjons-a.js`, `-b.js` et `-c.js`; `src/guides-data.js` fait la recherche, les noms et les sources. Une annonce de donjon qui a un guide montre « Voir le guide » (adresse directe: `/?guide=ID`).
- **Règle de contenu: rien d'inventé.** Chaque guide liste ses sources (`src`, adresses dans `SOURCES`) et une section « Ce que les sources ne disent pas, ou se contredisent » (`manque`). Pour ajouter ou corriger un guide, relis les sources et mets ce qu'elles taisent dans `manque` plutôt que de deviner.
- **Noms français:** seulement ceux confirmés dans les pages françaises de kami-labs (textes de la bêta de Forever), dans `src/guides/noms-boss.js` ou donnés à côté du nom dans le guide. Un nom non confirmé reste en anglais. Les données de serveurs privés (AzerothCore, Questie) ne sont pas utilisées.
- **Langue du jeu** (« Mon jeu est en »: Français ou English, gardé dans `forever-langue-jeu`): en français, les boss portent leur nom français quand il est confirmé et les capacités sont expliquées en mots simples (le nom anglais reste en infobulle); en anglais, les noms de boss et de capacités restent ceux du jeu. Le même choix donne `/inviter` ou `/invite` aux boutons « Copier ». Le texte des guides utilise `[[Nom]]`, `[[Nom|FR]]`, `{{Capacité|description en français}}` et `{{Capacité}}`.
- Les niveaux d'un guide (Icy Veins, Method) peuvent différer des niveaux suggérés par le formulaire (`NIVEAUX_DONJONS` dans `src/data.js`): les deux sont des estimations d'avant le lancement. Cinq donjons (Drowned City, Krol'dok Stronghold, Alcaz Island Prison, Blackmaw Hold, Shaper's Terrace) n'ont qu'une fiche courte, faute de contenu publié. Les versions à 10 joueurs ne sont pas couvertes. **Tout est à revérifier après le lancement.**

## Modération

- Le lien « Modération » (à côté de « Mon profil ») n'apparaît que pour les comptes de la table `moderateurs`. La page liste ce qui a été signalé avec le motif, le contact (que les visiteurs ne voient pas) et les actions: écarter, retirer, remettre en ligne, suspendre ou rétablir un compte. Un compte suspendu ne peut plus publier et son profil reste caché. Chaque action est revérifiée par la base et notée dans `moderation_journal` (à lire dans Table Editor).
- Pour ajouter ou retirer un modérateur, voir les commentaires au début de `supabase/ameliorations5.sql`.

## Amis

- Sur la carte d'un joueur: « Ajouter en ami » (demande), « Accepter sa demande », « Annuler », « Bloquer ». L'onglet Joueurs a deux vues: « Tous les joueurs » et « Mes amis » (demandes reçues, amis avec « en ligne », commande d'invitation et BattleTag, demandes envoyées, personnes bloquées). Une pastille dorée sur l'onglet Joueurs montre le nombre de demandes reçues; une nouvelle demande reçue pendant que le site est ouvert est annoncée (la liste se relit toutes les 30 secondes). Le code est dans `src/Amis.jsx` et `src/store.js` (`lireAmis`, `agirAmi`).
- Les données sont dans `amities` et `blocages` (`supabase/ameliorations6.sql`). Aucune n'est lisible directement: tout passe par `lister_amis()` et `agir_ami(joueur, action)`, qui vérifient le compte à chaque appel (actions: demander, accepter, refuser, annuler, retirer, bloquer, debloquer). Tu peux les lire dans Supabase > Table Editor.
- Règles voulues: la demande doit être acceptée; **refuser n'avertit personne** (la ligne reste, « refusée », et empêche une nouvelle demande pendant 30 jours); **bloquer est silencieux** (la demande de la personne bloquée a l'air d'être envoyée, mais rien n'est enregistré); limites de 10 nouvelles demandes par 24 h, 30 en attente, 100 amis, 200 blocages; un compte suspendu ne peut pas demander et ses demandes ne s'affichent pas; on ne demande qu'à un profil visible; supprimer son profil (ou son compte) efface ses amitiés, ses demandes et ses blocages.
- Être ami ne donne **pas** accès à plus d'information: BattleTag et « en ligne » viennent du profil visible, comme dans la liste des joueurs. Un ami qui cache son profil reste dans la liste, sans BattleTag ni « en ligne ». Une idée pour plus tard: une visibilité « amis seulement ».
- Limites connues: l'autre personne ne voit jamais pourquoi une demande n'arrive pas; on peut contourner la limite quotidienne en annulant puis en redemandant (la limite de 30 demandes en attente et le blocage restent); pas de notification quand le site est fermé.

## Look « babillard d'auberge »

Les annonces sont des papiers épinglés sur un tableau: liège pour le style Neutre (bois sombre en mode sombre), feutre matelassé avec boutons de laiton pour Alliance, plaques de fer rivetées pour Horde. L'en-tête et la barre de navigation sont en bois, l'onglet actif est une plaque de laiton, et chaque annonce porte la bannière de sa faction. Sur cellulaire, les cinq onglets passent dans une barre en bas de l'écran (sous le pouce) avec un bouton « Publier » flottant; sur ordinateur, la barre reste collée en haut quand on défile.

Tout ça vit dans deux fichiers: `src/textures.css` (les textures, en SVG dans le CSS, aucune image à télécharger) et `src/babillard.css` (couleurs et habillage). `src/index.css` garde la structure. Pour revenir au look sobre, retire les imports de `textures.css` et `babillard.css` dans `src/main.jsx`.

## Limites de la version 1

- Connexion obligatoire pour publier, par Google (activé par une variable Netlify; sans elle, par courriel) (5 annonces actives par joueur au maximum). La connexion Battle.net avec import du personnage viendra après, une fois qu'on aura confirmé que l'API de Blizzard voit les personnages de Forever.
- Les annonces expirent automatiquement (1 à 6 heures, ou 1 heure après le départ pour une annonce planifiée, dans les 3 prochains jours). Le joueur peut retirer son annonce ou marquer un rôle comme trouvé; le renouvellement est la seule autre modification.
- Donjons et raids demandent les mêmes règles de jeu (Normal, PvP, Jeu de rôle); les champs de bataille peuvent les mélanger. Le style de jeu reprend les quatre choix de l'outil de groupe du jeu.
- Pas de champ « royaume » pour l'instant: on l'ajoutera quand la liste des royaumes de Forever sera connue.
- Le type « Raid » s'ouvre le 9 décembre 2026 (Barrow Deeps 10, Hyjal Summit 20, Onyxia's Lair 40). Les niveaux suggérés par donjon sont dans `src/data.js` (`NIVEAUX_DONJONS`).
- Les noms de donjons et de champs de bataille viennent de guides publics écrits avant le lancement (4 novembre 2026): à revérifier après la sortie.
