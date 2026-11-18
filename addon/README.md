> Ce dossier contient deux addons. **BabillardForeverFR** (`addon/BabillardForeverFR`) est celui qui parle au site: il génère le code d'import du profil (voir le README à la racine). **lfgFR** (`addon/lfgFR`, décrit plus bas) lit le chat et exporte un autre format que le site ne lit pas encore. Ne mets pas les deux dans le jeu en même temps: ils rejoignent chacun leur canal.

# lfgFR — addon pour WoW Forever

Addon en français pour trouver un groupe et partager son personnage. Il fait deux choses, indépendantes du site:

1. **Groupes**: lit le chat (général, commerce, recherche de groupe, cris et le canal `lfgFR`), reconnaît les annonces « LFM / LFG » en français et en anglais, et les affiche dans une fenêtre avec filtres (type, rôle, donjon). On peut chuchoter ou inviter en un clic, et publier sa propre annonce sur le canal `lfgFR`.
2. **Mon perso**: exporte les talents, l'équipement et les métiers en un texte à coller sur babillard-forever.com.

## Installation

Copie le dossier `lfgFR` (celui qui contient `lfgFR.toc`) dans:

```
World of Warcraft/_forever_/Interface/AddOns/lfgFR
```

Dans l'application Battle.net: *World of Warcraft: Forever* > l'engrenage à côté de *Jouer* > *Afficher dans l'explorateur*. Pendant la bêta le dossier s'appelait `_classic_beta_`; si `_forever_` n'existe pas chez toi, prends celui qui contient déjà `Interface/AddOns`.

Si le jeu dit que l'addon est « périmé », coche « Charger les addons périmés » à l'écran de sélection du personnage. Le numéro d'interface (`## Interface: 16001` dans `lfgFR.toc`) vient de guides publics: vérifie-le en jeu avec `/dump select(4, GetBuildInfo())` et corrige-le au besoin.

## Commandes

| Commande | Effet |
| --- | --- |
| `/lfgfr` | ouvre la fenêtre (liste des groupes) |
| `/lfgfr publier` | publie une annonce sur le canal lfgFR |
| `/lfgfr export` | exporte le personnage |
| `/lfgfr canal` | rejoint ou quitte le canal lfgFR (rejoint par défaut, 10 s après la connexion) |
| `/lfgfr vider` | vide la liste |
| `/lfgfr test <message>` | montre comment l'addon comprend un message |
| `/lfgfr debug` | liste les fonctions du jeu trouvées ou absentes: **à m'envoyer en cas de problème** |

## Ce qui est testé, et ce qui ne l'est pas

`python3 addon/tests/test_addon.py` et `python3 addon/tests/test_ui_smoke.py` (nécessitent `pip install lupa`) exécutent l'addon dans un vrai Lua 5.1:

- testé: la reconnaissance des annonces, la composition du texte publié, l'encodage de l'export (comparé à Python), la lecture du personnage et l'interface avec une **fausse** API du jeu;
- **pas testé**: le comportement réel dans Forever. Ces points sont à vérifier en jeu: la lecture des talents (la forme de `GetTalentInfo` varie selon les versions), la jonction du canal lfgFR, la publication sur le canal, le masquage du canal dans le chat, l'affichage des fenêtres.

## Limites connues

- Les noms français des **nouveaux** donjons de Forever ne sont pas connus: seuls leurs noms anglais sont reconnus.
- Le canal `lfgFR` n'est vu que par les joueurs qui ont l'addon.
- Pendant les combats de boss ou en instance, le jeu peut rendre le texte du chat « secret » pour les addons: ces messages sont ignorés (compteur `secrets` dans `/lfgfr debug`).
- L'export est une déclaration du joueur: le site ne peut pas la vérifier.

## Format de l'export

`LFGFR1:<adler32 en hexadécimal>:<base64 du JSON UTF-8>`. Le JSON contient `v`, `addon`, `jeu`, `quand`, `perso`, `talents`, `equipement` et `metiers` (voir `Export.lua`).
