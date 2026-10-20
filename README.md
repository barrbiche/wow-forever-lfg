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
- Chaque personne connectée peut signaler une annonce, une guilde ou un joueur (une fois chacun). Après 3 signalements de comptes différents, elle est masquée automatiquement. Des faux comptes pourraient abuser de ça: surveille le canal de modération.
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

## Page Joueurs, réputation et présence

- L'onglet « Joueurs » liste les profils: personnage, classe, niveau, rôles, faction, région, langue, style, guilde, petit mot, réputation et « en ligne » / « vu il y a ». **Seules les personnes connectées la voient**; elle ne contient jamais le contact des annonces ni de courriel. Le **BattleTag** y figure seulement si le joueur l'écrit lui-même dans « Mon profil » (colonne `profils.battletag`, format `Nom#1234` vérifié par la base): toute personne connectée peut donc le lire et le moissonner, comme le contact des annonces. Un profil caché (`visible = false`) cache aussi son BattleTag.
- Chaque carte de joueur a un bouton « Copier » pour la commande d'invitation du jeu (selon le réglage « Mon jeu est en »: `/inviter Nom` si le jeu est en français, ce qui est le réglage de départ, ou `/invite Nom` si le jeu est en anglais; `/invite` marche dans le client français et anglais, `/inviter` seulement en français; vérifié dans les chaînes du client) et un autre pour le BattleTag. Il n'y a pas de champ « royaume »: entre royaumes, le jeu peut demander `/invite Nom-Royaume`.
- **Le profil est obligatoire pour publier une annonce**: nom du personnage, classe, spécialisation, niveau (1 à 60) et au moins un rôle. « Publier une annonce » ouvre d'abord « Mon profil » si l'un manque (avec un bandeau qui l'explique), puis le formulaire d'annonce s'ouvre tout seul après l'enregistrement; le formulaire reprend le nom, la classe, la faction, la région et la langue du profil. Un profil ne peut plus s'enregistrer incomplet. Le profil est visible par défaut; chacun peut se cacher ou supprimer son profil (`profils.visible`). Ça choisit **l'inscription obligatoire pour publier, avec retrait facile**: à revoir si on préfère une inscription volontaire (Loi 25). La règle est **seulement dans le site** (rien ne l'impose dans la base): quelqu'un qui appellerait l'API directement pourrait publier sans profil. Si ça devient un problème, on pourra ajouter une règle SQL sur `annonces`.
- **Spécialisation**: 3 par classe (colonne `profils.specialisation`, identifiant sans accent; la base vérifie qu'elle appartient à la classe: contrainte `profils_specialisation_ok`). Noms français de seemeta.com/fr/wow-forever/classes, noms anglais de warcrafttavern.com/forever/guides/classes (Combat farouche = « Feral Combat »): à revérifier une fois le jeu sorti. Elle s'affiche à côté de la classe (« Mage Givre »), dans la langue du réglage « Mon jeu est en ». Tant que `ameliorations4.sql` n'est pas roulé de nouveau, le site n'exige pas la spécialisation et cache le champ.
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

## Limites de la version 1

- Connexion obligatoire pour publier, par courriel (Discord en option) (5 annonces actives par joueur au maximum). La connexion Battle.net avec import du personnage viendra après, une fois qu'on aura confirmé que l'API de Blizzard voit les personnages de Forever.
- Les annonces expirent automatiquement (1 à 6 heures, ou 1 heure après le départ pour une annonce planifiée, dans les 3 prochains jours). Le joueur peut retirer son annonce ou marquer un rôle comme trouvé; le renouvellement est la seule autre modification.
- Donjons et raids demandent les mêmes règles de jeu (Normal, PvP, Jeu de rôle); les champs de bataille peuvent les mélanger. Le style de jeu reprend les quatre choix de l'outil de groupe du jeu.
- Pas de champ « royaume » pour l'instant: on l'ajoutera quand la liste des royaumes de Forever sera connue.
- Le type « Raid » s'ouvre le 9 décembre 2026 (Barrow Deeps 10, Hyjal Summit 20, Onyxia's Lair 40). Les niveaux suggérés par donjon sont dans `src/data.js` (`NIVEAUX_DONJONS`).
- Les noms de donjons et de champs de bataille viennent de guides publics écrits avant le lancement (4 novembre 2026): à revérifier après la sortie.
