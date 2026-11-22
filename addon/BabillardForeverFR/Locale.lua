-- Babillard Forever FR - Langue (français ou anglais)
-- Le texte français est la clé: en français, L["texte"] redonne le même texte; en anglais, sa traduction (ou le
-- français si une traduction manque). La langue est choisie à ADDON_LOADED, avant de bâtir les fenêtres
-- (voir ns.SetupLanguage): changer de langue demande un /reload.
local ADDON, ns = ...

ns.lang = (GetLocale and GetLocale() == "frFR") and "fr" or "en"   -- provisoire, avant de lire les réglages

local EN = {}
ns.L = setmetatable({}, {
    __index = function(_, k)
        if ns.lang == "en" then return EN[k] or k end
        return k
    end,
})

-- Langue choisie dans les options: "auto" (langue du jeu), "fr" ou "en".
function ns.SetupLanguage()
    local choice = ns.db and ns.db.opts and ns.db.opts.lang or "auto"
    if choice == "fr" or choice == "en" then
        ns.lang = choice
    else
        ns.lang = (GetLocale and GetLocale() == "frFR") and "fr" or "en"
    end
    if ns.lang == "en" then ns.ApplyEnglishData() end
end

-- Change la langue (« auto », « fr » ou « en ») et propose de recharger l'interface: les fenêtres sont déjà bâties.
StaticPopupDialogs["BABILLARDFR_RELOAD"] = {
    text = "Babillard Forever FR\n\n%s",
    button1 = RELOADUI or "Reload",
    button2 = CANCEL or "Cancel",
    OnAccept = function() ReloadUI() end,
    timeout = 0, whileDead = true, hideOnEscape = true, preferredIndex = 3,
}

function ns.SetLanguageChoice(choice)
    if not ns.db then return end
    if choice ~= "fr" and choice ~= "en" then choice = "auto" end
    ns.db.opts.lang = choice
    StaticPopup_Show("BABILLARDFR_RELOAD", "Langue : " .. ns.LanguageName(choice) .. "\n(Language: " .. ns.LanguageName(choice)
        .. ")\n\nRecharger l'interface pour l'appliquer?\nReload the interface to apply it?")
end

-- Mots de commande anglais (les mots français marchent toujours, dans les deux langues)
local CMD_EN = {
    guildes = "guilds", perso = "character", enligne = "online", communaute = "community", bienvenue = "welcome",
    commandes = "commands", favoris = "favorites", demandes = "requests", ignores = "ignored",
    ["ignores vider"] = "ignored clear", aide = "help", langue = "language",
}
function ns.Cmd(word)
    if not word or word == "" then return "/bf" end
    return "/bf " .. ((ns.lang == "en" and CMD_EN[word]) or word)
end

function ns.LanguageName(choice)
    if choice == "fr" then return "Français" end
    if choice == "en" then return "English" end
    return ns.lang == "en" and "Auto (game language)" or "Auto (langue du jeu)"
end

---------------------------------------------------------------------------
-- Données (Data.lua) en anglais. Les clés internes (activités, catégories, rôles) ne changent pas: un joueur en
-- français et un joueur en anglais se comprennent toujours. Le nom français reste dans .fr (lecture du chat).
---------------------------------------------------------------------------
local ACT_EN = {
    RFC = "Ragefire Chasm", THANES = "Hall of Thanes", LORD = "Ruins of Lordaeron", WC = "Wailing Caverns",
    VC = "The Deadmines", SFK = "Shadowfang Keep", BFD = "Blackfathom Deeps", STOCK = "The Stockade (Stormwind)",
    EXCAV = "Excavation Site: Wetlands", DALA = "City of Dalaran", RFK = "Razorfen Kraul", GNOMER = "Gnomeregan",
    SMGY = "Scarlet Monastery: Graveyard", SMLIB = "Scarlet Monastery: Library", SMARM = "Scarlet Monastery: Armory",
    SMCATH = "Scarlet Monastery: Cathedral", SUNKC = "The Drowned City", RFD = "Razorfen Downs",
    KROL = "Krol'dok Stronghold", ULDA = "Uldaman", ZF = "Zul'Farrak", MARA = "Maraudon", ALCAZ = "Alcaz Island Prison",
    ST = "Sunken Temple", BRD = "Blackrock Depths", DME = "Dire Maul: East", DMW = "Dire Maul: West",
    DMN = "Dire Maul: North", LBRS = "Lower Blackrock Spire", MACHE = "Blackmaw Hold", SHAPER = "Shaper's Terrace",
    STRAT = "Stratholme", SCHOLO = "Scholomance", UBRS = "Upper Blackrock Spire", ONY = "Onyxia's Lair",
    HYJAL = "Hyjal Summit", BARROW = "Barrow Deeps", WSG = "Warsong Gulch", AB = "Arathi Basin",
    DSI = "Darkspear Isles", AV = "Alterac Valley", WPVP = "World PvP", QUEST = "Group quest / elite",
    FARM = "Farming (gold, materials, reputation)", ONYATT = "Onyxia attunement (amulet)",
    OTHER = "Other (details in the note)",
}
local CAT_EN = { Donjons = "Dungeons", Raids = "Raids", PvP = "PvP", Autre = "Other", Tous = "All" }

-- Nom affiché d'une catégorie (la clé reste « Donjons », « Autre », « Tous »...).
function ns.CatName(c)
    if ns.lang == "en" then return CAT_EN[c] or c end
    return c
end

-- Noms des types de serveur dans les deux langues: les annonces de la communauté peuvent venir de l'une ou l'autre.
ns.RULESETS_FR = {}
for k, v in pairs(ns.RULESETS) do ns.RULESETS_FR[k] = v end

local applied = false
function ns.ApplyEnglishData()
    if applied then return end
    applied = true
    for _, a in pairs(ns.ACT_BY_KEY) do
        a.fr = a.name
        a.name = ACT_EN[a.key] or a.name
    end
    ns.ROLE_INFO.HEAL.name = "Healer"
    ns.TYPES.LFG.name, ns.TYPES.LFG.short = "Looking for a group", "Looking for group"
    ns.TYPES.LFM.name, ns.TYPES.LFM.short = "Group looking for players", "LFM"
    ns.RULESETS.rp, ns.RULESETS.rp_pvp = "Roleplay (RP)", "Roleplay PvP (RP-PvP)"
    ns.GUILD_FOCUS.LVL = "Leveling"
end

---------------------------------------------------------------------------
-- Traductions anglaises des textes de l'interface et des messages
---------------------------------------------------------------------------
EN["à l'instant"] = "just now"
EN[" min"] = " min"
EN["choisis d'abord ton type de serveur (PvE, PvP, RP ou RP-PvP) dans l'onglet |cffffd100Mon perso|r: ton annonce restera visible seulement pour les joueurs du même type."] = "first choose your server type (PvE, PvP, RP or RP-PvP) in the |cffffd100My character|r tab: your listing will only be visible to players of the same type."
EN["une nouvelle version de l'addon est disponible ("] = "a new version of the addon is available ("
EN["). Tape |cffffd100/bf site|r pour le lien de téléchargement."] = "). Type |cffffd100/bf site|r for the download link."
EN[" joueurs"] = " players"
EN["le jeu limite l'envoi de messages, réessaie dans quelques secondes."] = "the game is limiting messages, try again in a few seconds."
EN["le jeu a refusé d'envoyer le message, réessaie dans un instant."] = "the game refused to send the message, try again in a moment."
EN["connexion au canal en cours, réessaie dans quelques secondes."] = "connecting to the channel, try again in a few seconds."
EN["attends quelques secondes avant de republier."] = "wait a few seconds before posting again."
EN["choisis une activité avant de publier."] = "choose an activity before posting."
EN["ton niveau est trop bas pour cette activité (niveau "] = "your level is too low for this activity (level "
EN[" minimum)."] = " minimum)."
EN["choisis au moins un rôle."] = "choose at least one role."
EN["tu dois être dans une guilde pour l'annoncer."] = "you must be in a guild to list it."
EN["choisis le type de ta guilde."] = "choose your guild type."
EN["demande envoyée: les annonces actives des autres joueurs arrivent dans quelques secondes."] = "request sent: other players' active listings will arrive in a few seconds."
EN["attends encore "] = "wait "
EN[" s avant d'actualiser."] = " s before refreshing."
EN["%s cherche un %s pour %s"] = "%s is looking for a %s for %s"
EN[". Tape |cffffd100/bf|r pour voir."] = ". Type |cffffd100/bf|r to see it."
EN["annonce retirée : ton groupe est complet!"] = "listing removed: your group is full!"
EN["annonce retirée : tu es entré dans une instance."] = "listing removed: you entered an instance."
EN["Ton annonce sur le Babillard expire dans 2 minutes.\n\nVeux-tu la republier?"] = "Your Babillard listing expires in 2 minutes.\n\nDo you want to post it again?"
EN["Republier"] = "Post again"
EN["Laisser expirer"] = "Let it expire"
EN["%s\n\nFais |cffffd100Ctrl+C|r pour copier."] = "%s\n\nPress |cffffd100Ctrl+C|r to copy."
EN["Fermer"] = "Close"
EN["Lien du site Babillard Forever :"] = "Babillard Forever website link:"
EN["niv "] = "lvl "
EN["Salut, "] = "Hi, "
EN[", je peux faire "] = ", I can play "
EN[" pour "] = " for "
EN[" est ignoré: ses annonces ne s'affichent plus. |cffffd100/bf ignores|r pour voir ou vider la liste."] = " is ignored: their listings are hidden. |cffffd100/bf ignored|r to see or clear the list."
EN["annonce non publiée dans le chat (attends encore "] = "listing not posted in chat (wait "
EN[" s pour ne pas faire de spam)."] = " more s to avoid spam)."
EN["aucun canal « Recherche de groupe » ou « Général » trouvé: ton annonce n'est pas dans le chat."] = "no 'LookingForGroup' or 'General' channel found: your listing is not in chat."
EN["le jeu a refusé d'envoyer l'annonce dans le chat."] = "the game refused to send the listing to chat."
EN["tu es déjà dans la communauté |cffffd100"] = "you are already in the |cffffd100"
EN["|r. Tes annonces y sont publiées au clic sur Publier."] = "|r community. Your listings are posted there when you click Post."
EN["la communauté |cffffd100"] = "the |cffffd100"
EN["|r n'est pas encore ouverte pour toi ("] = "|r community is not open for you yet ("
EN["rejoins les francophones de tous les serveurs: |cff66ccff|HclubTicket:"] = "join French-speaking players from every server: |cff66ccff|HclubTicket:"
EN["|h[Rejoindre "] = "|h[Join "
EN["Lien d'invitation de la communauté :"] = "Community invite link:"
EN["joueurs francophones sur les autres serveurs de Forever: |cff66ccff|HclubTicket:"] = "French-speaking players on other Forever servers: |cff66ccff|HclubTicket:"
EN["]|h|r (ou |cffffd100/bf communaute|r)"] = "]|h|r (or |cffffd100/bf community|r)"
EN["annonce non publiée dans la communauté (attends encore "] = "listing not posted in the community (wait "
EN["le jeu a refusé d'envoyer l'annonce dans la communauté."] = "the game refused to send the listing to the community."
EN["installé! Tape |cffffd100/bf|r ou clique sur le bouton de la minimap pour ouvrir le babillard."] = "installed! Type |cffffd100/bf|r or click the minimap button to open the board."
EN[" (il y a "] = " ("
EN[", sans réponse"] = ", no answer"
EN["aucune demande en cours. Elles s'affichent ici après un clic sur Chuchoter."] = "no pending requests. They show up here after you click Whisper."
EN["aucun joueur ignoré."] = "no ignored players."
EN["joueurs ignorés : "] = "ignored players: "
EN["la liste des joueurs ignorés est vide."] = "the ignored players list is empty."
EN["Diagnostic Babillard Forever FR (colle-le dans la conversation):"] = "Babillard Forever FR diagnostic (paste it in the conversation):"
EN["commandes :"] = "commands:"
EN["  |cffffd100/bf|r : ouvrir ou fermer le babillard"] = "  |cffffd100/bf|r : open or close the board"
EN["  |cffffd100/bf guildes|r : guildes francophones"] = "  |cffffd100/bf guilds|r : French-speaking guilds"
EN["  |cffffd100/bf perso|r : mon personnage et code pour le site"] = "  |cffffd100/bf character|r : my character and code for the website"
EN["  |cffffd100/bf site|r : lien du site"] = "  |cffffd100/bf site|r : website link"
EN["  |cffffd100/bf communaute|r : rejoindre les francophones de tous les serveurs"] = "  |cffffd100/bf community|r : join French-speaking players from every server"
EN["  |cffffd100/bf diag|r : diagnostic (si les talents ou l'équipement n'apparaissent pas)"] = "  |cffffd100/bf diag|r : diagnostic (if talents or gear don't show up)"
EN["  |cffffd100/bf favoris|r : choisir les activités qui déclenchent une alerte"] = "  |cffffd100/bf favorites|r : choose the activities that trigger an alert"
EN["  |cffffd100/bf demandes|r : les groupes à qui tu as chuchoté"] = "  |cffffd100/bf requests|r : the groups you whispered"
EN["  |cffffd100/bf ignores|r : joueurs ignorés (|cffffd100/bf ignores vider|r pour tout retirer)"] = "  |cffffd100/bf ignored|r : ignored players (|cffffd100/bf ignored clear|r to clear them all)"
EN["  |cffffd100/bf options|r : options"] = "  |cffffd100/bf options|r : options"
EN["Clique pour l'activer ou le désactiver."] = "Click to turn it on or off."
EN["Molette : combien de joueurs de ce rôle tu cherches (raid, champ de bataille)."] = "Mouse wheel: how many players of this role you need (raid, battleground)."
EN["Rejoindre"] = "Join"
EN["si la fenêtre ne s'est pas ouverte, clique ici: |cff66ccff|H"] = "if the window didn't open, click here: |cff66ccff|H"
EN["Rejoindre la communauté"] = "Join the community"
EN["Ouvre la fenêtre du jeu pour rejoindre « "] = "Opens the game window to join '"
EN[" ». Le lien est aussi écrit dans ton chat et prêt à copier."] = "'. The link is also in your chat, ready to copy."
EN["|cffffd100Joue avec les francophones de TOUS les serveurs!|r"] = "|cffffd100Play with French speakers from EVERY server!|r"
EN["Choisis d'abord ton type de serveur dans l'onglet Mon perso, puis rejoins la communauté."] = "First choose your server type in the My character tab, then join the community."
EN["Forever te place sur un serveur parmi plusieurs: sans la communauté, tu ne vois que le tien. Rejoins « "] = "Forever puts you on one of several servers: without the community, you only see yours. Join '"
EN[" » en un clic."] = "' in one click."
EN["|cffffd100Aucune communauté francophone pour ta faction... crée-la!|r"] = "|cffffd100No French-speaking community for your faction yet... create it!|r"
EN["Crée une communauté nommée « "] = "Create a community named '"
EN[" » (touche J), fais un lien d'invitation qui n'expire pas et envoie-le sur babillard-forever.com."] = "' (J key), make an invite link that never expires and send it on babillard-forever.com."
EN["Le site du Babillard"] = "The Babillard website"
EN["Annonces, guildes et profils, même hors du jeu."] = "Listings, guilds and profiles, even outside the game."
EN["Actualiser"] = "Refresh"
EN["Redemande les annonces actives aux autres joueurs qui ont l'addon (groupes et guildes). Les nouvelles annonces arrivent d'elles-mêmes: ce bouton sert surtout après ta connexion ou si le babillard te semble vide."] = "Asks other addon users for their active listings again (groups and guilds). New listings arrive on their own: this button is mostly useful right after logging in or if the board looks empty."
EN["Options"] = "Options"
EN["Groupes"] = "Groups"
EN["Guildes"] = "Guilds"
EN["Mon perso"] = "My character"
EN["Mon annonce"] = "My listing"
EN["Choisir une activité"] = "Choose an activity"
EN[" faisables à ton niveau ("] = " doable at your level ("
EN["|cff888888Rien de faisable à ton niveau dans cette catégorie|r"] = "|cff888888Nothing doable at your level in this category|r"
EN["rien de faisable à ton niveau dans cette catégorie."] = "nothing doable at your level in this category."
EN["Je forme un groupe"] = "I'm forming a group"
EN["Note (optionnel) : ex. QC, vocal Discord, débutants bienvenus"] = "Note (optional): e.g. QC, Discord voice, beginners welcome"
EN["Aussi dans le chat"] = "Also in chat"
EN["Au clic sur Publier, l'annonce est aussi envoyée dans « Recherche de groupe » (ou « Général »). Une fois par minute au maximum."] = "When you click Post, the listing is also sent to 'LookingForGroup' (or 'General'). At most once a minute."
EN["Publier"] = "Post"
EN["Retirer"] = "Remove"
EN["c'est mieux que le chef du groupe publie l'annonce."] = "it's better if the group leader posts the listing."
EN["Annonces"] = "Listings"
EN["À mon niveau"] = "At my level"
EN["Cache les annonces pour des activités que tu ne peux pas faire."] = "Hides listings for activities you can't do."
EN["Type"] = "Type"
EN["Rôles"] = "Roles"
EN["Joueur"] = "Player"
EN["Activité"] = "Activity"
EN["Publié"] = "Posted"
EN["Lu dans le chat"] = "Read in chat"
EN[" · niveau "] = " · level "
EN["Niveau "] = "Level "
EN["Serveur : "] = "Server: "
EN["Niveaux "] = "Levels "
EN[" à "] = " to "
EN["Recherche : "] = "Looking for: "
EN["Groupe : "] = "Group: "
EN["Peut jouer : "] = "Can play: "
EN["Publié : "] = "Posted: "
EN["Chuchoter"] = "Whisper"
EN["Ignorer"] = "Ignore"
EN["Rôles recherchés"] = "Roles needed"
EN["|cff33dd55Annonce active|r\n"] = "|cff33dd55Listing active|r\n"
EN[" min restantes"] = " min left"
EN["Aucune annonce active"] = "No active listing"
EN[" |cff888888(toi)|r"] = " |cff888888(you)|r"
EN["  |cff88ccff[demandé]|r"] = "  |cff88ccff[requested]|r"
EN["  |cff33aaff[chat]|r"] = "  |cff33aaff[chat]|r"
EN[" annonces sont cachées"] = " listings are hidden"
EN[" annonce est cachée"] = " listing is hidden"
EN[" par tes options (niveau, faction, type de serveur ou lecture du chat).\nOuvre |cffffd100/bf options|r pour les voir."] = " by your options (level, faction, server type or chat reading).\nOpen |cffffd100/bf options|r to see them."
EN["Aucun groupe dans cette catégorie.\nClique sur |cffffd100Tous|r pour voir les "] = "No group in this category.\nClick |cffffd100All|r to see the "
EN[" autres."] = " others."
EN["Aucun groupe pour l'instant.\nPublie le tien en haut avec |cffffd100Publier|r: plus il y a de joueurs avec l'addon,\nplus le babillard se remplit. Invite tes amis à l'installer!"] = "No group right now.\nPost yours at the top with |cffffd100Post|r: the more players use the addon,\nthe fuller the board gets. Invite your friends to install it!"
EN["\n|cff888888La lecture du chat est coupée: active-la dans |cffffd100/bf options|r|cff888888 pour voir les annonces du général.|r"] = "\n|cff888888Chat reading is off: turn it on in |cffffd100/bf options|r|cff888888 to see General chat listings.|r"
EN["%d-%d sur %d (molette)"] = "%d-%d of %d (mouse wheel)"
EN[" annonce(s)"] = " listing(s)"
EN["|cffff8800Choisis ton type de serveur dans Mon perso|r"] = "|cffff8800Choose your server type in My character|r"
EN["Annoncer ma guilde"] = "List my guild"
EN["Description : ex. guilde QC détendue, raids 2 soirs par semaine"] = "Description: e.g. relaxed QC guild, raids 2 nights a week"
EN["Guildes francophones"] = "French-speaking guilds"
EN["Guilde"] = "Guild"
EN["Contact"] = "Contact"
EN["Description"] = "Description"
EN["Contact : |c"] = "Contact: |c"
EN["|r (niveau "] = "|r (level "
EN["Aucune guilde annoncée pour l'instant.\nTa guilde recrute? Annonce-la en haut!"] = "No guild listed yet.\nYour guild is recruiting? List it at the top!"
EN["Ta guilde : |cff40ff40<"] = "Your guild: |cff40ff40<"
EN["|cff888888Tu n'es dans aucune guilde. Tu peux quand même voir celles qui recrutent.|r"] = "|cff888888You're not in a guild. You can still see the ones recruiting.|r"
EN[" guilde(s)"] = " guild(s)"
EN["Mon personnage"] = "My character"
EN["Personnage"] = "Character"
EN["Niveau et classe"] = "Level and class"
EN["Faction"] = "Faction"
EN["Niveau d'objet"] = "Item level"
EN["Métiers"] = "Professions"
EN["Talents"] = "Talents"
EN["Type de serveur"] = "Server type"
EN["Normal (PvE), PvP, RP ou RP-PvP. On ne groupe qu'avec le même type: les annonces des autres types sont cachées. Clique pour changer."] = "Normal (PvE), PvP, RP or RP-PvP. You only group with the same type: listings from other types are hidden. Click to change."
EN["Mes rôles"] = "My roles"
EN["Utilisés pour les alertes: l'addon te prévient quand un groupe cherche un de tes rôles."] = "Used for alerts: the addon warns you when a group needs one of your roles."
EN["Lier mon personnage au site"] = "Link my character to the website"
EN["|cffffd1001.|r Clique sur « Copier mon code ».\n"] = "|cffffd1001.|r Click 'Copy my code'.\n"
EN["|cffffd1002.|r Fais |cffffd100Ctrl+C|r pour le copier.\n"] = "|cffffd1002.|r Press |cffffd100Ctrl+C|r to copy it.\n"
EN["|cffffd1003.|r Sur |cff33aaffbabillard-forever.com|r, va dans ton profil et colle le code.\n\n"] = "|cffffd1003.|r On |cff33aaffbabillard-forever.com|r, go to your profile and paste the code.\n\n"
EN["|cffaaaaaaLe code contient ton nom, ton niveau, ta classe, ta guilde, tes rôles, tes métiers, ton équipement "] = "|cffaaaaaaThe code contains your name, level, class, guild, roles, professions, gear "
EN["et tes talents. Génère un nouveau code quand tu changes d'équipement ou de talents pour garder ton profil à jour.|r"] = "and talents. Make a new code when you change gear or talents to keep your profile up to date.|r"
EN["Copier mon code"] = "Copy my code"
EN["Ton code pour babillard-forever.com :"] = "Your code for babillard-forever.com:"
EN["|cffff8800Choisis ton type de serveur|r"] = "|cffff8800Choose your server type|r"
EN[" pièces)|r"] = " pieces)|r"
EN["|cff888888Indisponibles (tape /bf diag et envoie le résultat)|r"] = "|cff888888Unavailable (type /bf diag and send the result)|r"
EN[" disponible|r"] = " available|r"
EN["Version "] = "Version "
EN["  ·  /bf pour ouvrir le babillard  ·  /bf aide pour les commandes"] = "  ·  /bf to open the board  ·  /bf help for commands"
EN["Alertes"] = "Alerts"
EN["Alertes quand un groupe cherche un de mes rôles"] = "Alert me when a group needs one of my roles"
EN["Message à l'écran quand un groupe cherche ton rôle pour une activité à ton niveau, ou quand quelqu'un cherche un groupe pour ce que ton groupe fait."] = "On-screen message when a group needs your role for an activity at your level, or when someone is looking for a group for what your group is doing."
EN["Jouer un son avec les alertes"] = "Play a sound with alerts"
EN["Alertes même dans un donjon, un raid ou un champ de bataille"] = "Alerts even in a dungeon, raid or battleground"
EN["Alertes seulement pour mes activités favorites"] = "Alerts only for my favorite activities"
EN["Choisis-les avec le bouton « Activités favorites » plus bas, ou avec /bf favoris. Si tu n'en as choisi aucune, toutes les activités déclenchent une alerte."] = "Choose them with the 'Favorite activities' button below, or with /bf favorites. If you haven't chosen any, every activity triggers an alert."
EN["Alertes aussi pour les annonces lues dans le chat"] = "Alerts for listings read in chat too"
EN["Par défaut, seules les annonces des joueurs qui ont l'addon déclenchent une alerte: le chat contient beaucoup d'annonces."] = "By default, only listings from players who have the addon trigger an alert: chat has a lot of listings."
EN["Chuchoter écrit un message de présentation"] = "Whisper writes an introduction message"
EN["Le bouton Chuchoter écrit « Salut, voleur niv 20, je peux faire DPS pour Mines de la Mort. » dans la boîte de chat. Rien n'est envoyé tant que tu n'appuies pas sur Entrée."] = "The Whisper button writes 'Hi, rogue lvl 20, I can play DPS for The Deadmines.' in the chat box. Nothing is sent until you press Enter."
EN["Chat"] = "Chat"
EN["Lire les annonces du chat et les ajouter au babillard"] = "Read chat listings and add them to the board"
EN["Les annonces « LFM » du chat (un groupe qui cherche des joueurs: général, recherche de groupe, cris) apparaissent avec la mention [chat]. Elles sont lues à l'écran seulement: rien n'est envoyé."] = "'LFM' listings in chat (a group looking for players: general, LookingForGroup, yells) show up marked [chat]. They're only read on your screen: nothing is sent."
EN["Publier aussi mon annonce dans le chat"] = "Also post my listing in chat"
EN["Quand tu cliques sur Publier, l'annonce est aussi envoyée dans « Recherche de groupe » (ou « Général »). Une fois par minute au maximum, seulement quand tu cliques."] = "When you click Post, the listing is also sent to 'LookingForGroup' (or 'General'). At most once a minute, only when you click."
EN["Publier aussi mes annonces dans la communauté Babillard Forever FR"] = "Also post my listings in the Babillard Forever FR community"
EN["Au clic sur Publier, l'annonce est aussi envoyée dans la communauté, que voient les francophones de tous les serveurs de Forever. Une fois par minute au maximum. /bf communaute pour la rejoindre."] = "When you click Post, the listing is also sent to the community, seen by French speakers on every Forever server. At most once a minute. /bf community to join it."
EN["Ajouter « [Babillard FR] » à la fin de mes annonces du chat"] = "Add '[Babillard FR]' at the end of my chat listings"
EN["Désactivé par défaut. Ça fait connaître l'addon, mais la politique d'addons de Blizzard interdit d'utiliser un addon pour faire de la promotion: à toi de décider."] = "Off by default. It helps people discover the addon, but Blizzard's addon policy forbids using an addon for promotion: your call."
EN["Retirer mon annonce automatiquement"] = "Remove my listing automatically"
EN["Quand tu rejoins un groupe, quand ton groupe est complet ou quand tu entres dans une instance."] = "When you join a group, when your group is full or when you enter an instance."
EN["Me rappeler 2 minutes avant que mon annonce expire"] = "Remind me 2 minutes before my listing expires"
EN["Mettre à jour mon annonce quand des joueurs rejoignent mon groupe"] = "Update my listing when players join my group"
EN["Met à jour le nombre de joueurs et retire le rôle tank ou soigneur quand quelqu'un du groupe l'a d'assigné."] = "Updates the player count and removes the tank or healer role when someone in the group has it assigned."
EN["Affichage"] = "Display"
EN["Montrer seulement ma faction"] = "Show only my faction"
EN["Montrer seulement mon type de serveur (PvE, PvP, RP)"] = "Show only my server type (PvE, PvP, RP)"
EN["Cache les annonces d'un autre type de serveur: on ne peut pas grouper ensemble. Choisis ton type dans l'onglet Mon perso."] = "Hides listings from another server type: you can't group together. Choose your type in the My character tab."
EN["Montrer seulement les activités à mon niveau"] = "Show only activities at my level"
EN["Afficher [FR] dans l'info-bulle des joueurs qui ont l'addon"] = "Show [FR] in the tooltip of players who have the addon"
EN["Afficher le bouton de la minimap"] = "Show the minimap button"
EN["le menu des favoris n'est pas disponible dans cette version du jeu."] = "the favorites menu isn't available in this version of the game."
EN["Alertes : activités favorites"] = "Alerts: favorite activities"
EN["Tout décocher"] = "Uncheck all"
EN["Activités favorites"] = "Favorite activities"
EN["Lien du site"] = "Website link"
EN[" annonce(s) active(s)"] = " active listing(s)"
EN["Ton annonce est active"] = "Your listing is active"
EN["Clic gauche : ouvrir le babillard"] = "Left click: open the board"
EN["Clic droit : lien du site"] = "Right click: website link"
EN["Glisser : déplacer ce bouton"] = "Drag: move this button"
EN["En ligne"] = "Online"
EN["en ligne"] = "online"
EN["Francophones en ligne"] = "French speakers online"
EN["Où"] = "Where"
EN["Ton serveur + communauté"] = "Your server + community"
EN["Ton serveur"] = "Your server"
EN["Autre serveur (communauté)"] = "Other server (community)"
EN["Dans la communauté (addon pas vu sur ton serveur)"] = "In the community (addon not seen on your server)"
EN["Absent"] = "Away"
EN["Inviter"] = "Invite"
EN["francophone(s) en ligne"] = "French speaker(s) online"
EN["sur ton serveur"] = "on your server"
EN["sur d'autres serveurs"] = "on other servers"
EN["Personne d'autre en ligne pour l'instant.\nLes joueurs avec l'addon apparaissent ici quelques secondes après leur connexion."] = "Nobody else online right now.\nPlayers with the addon show up here a few seconds after logging in."
EN["Personne d'autre en ligne sur ton serveur pour l'instant.\nRejoins la communauté (|cffffd100/bf communaute|r) pour voir aussi les autres serveurs."] = "Nobody else online on your server right now.\nJoin the community (|cffffd100/bf community|r) to see other servers too."
EN["Niv."] = "Lvl"
EN["(absent)"] = "(away)"
EN["  |cffffd100/bf enligne|r : francophones en ligne"] = "  |cffffd100/bf online|r : French speakers online"
-- 2.0: accueil, communauté, francophones repérés
-- (Le message « Faire connaître » reste en français: il s'adresse à quelqu'un qui vient d'écrire en français.)
EN["Connecté"] = "Connected"
EN["Canal indisponible"] = "Channel unavailable"
EN["Connexion..."] = "Connecting..."
EN["Communauté"] = "Community"
EN["Francophone"] = "French speaker"
EN["le chat de la communauté |cffffd100"] = "the |cffffd100"
EN["|r est maintenant dans ta fenêtre de chat. Pour y écrire, clique sur son nom devant un de ses messages."] = "|r community chat is now in your chat window. To write in it, click its name in front of one of its messages."
EN["pour voir le chat de la communauté: touche |cffffd100J|r, clic droit sur le fil Général de « "] = "to see the community chat: press |cffffd100J|r, right-click the General stream of '"
EN[" », puis « Afficher dans la fenêtre de chat »."] = "', then 'Show in chat window'."
EN["bienvenue dans la communauté! Tu vois maintenant les francophones de tous les serveurs dans l'onglet En ligne."] = "welcome to the community! You now see French speakers from every server in the Online tab."
EN["Repéré dans le chat"] = "Spotted in chat"
EN["Parle français dans le chat, mais n'a pas encore l'addon ni la communauté."] = "Speaks French in chat, but doesn't have the addon or the community yet."
EN["« Faire connaître » écrit une invitation dans ta boîte de chuchotement : tu l'envoies avec Entrée."] = "'Spread the word' writes an invitation (in French) in your whisper box: send it with Enter."
EN["Faire connaître"] = "Spread the word"
EN["Afficher le chat de la communauté"] = "Show the community chat"
EN["avec l'addon"] = "with the addon"
EN["repéré(s) dans le chat"] = "spotted in chat"
EN["Passer »"] = "Skip »"
EN["Changer de langue recharge l'interface (quelques secondes)."] = "Changing the language reloads the interface (a few seconds)."
EN["Ton type de serveur"] = "Your server type"
EN["Tes rôles"] = "Your roles"
EN["Précédent"] = "Back"
EN["Suivant"] = "Next"
EN["C'est parti!"] = "Let's go!"
EN["Bienvenue!"] = "Welcome!"
EN["Babillard Forever FR est le point de rencontre des joueurs francophones de WoW Forever : groupes, guildes, communauté et qui est en ligne."] = "Babillard Forever FR is the meeting place of French-speaking WoW Forever players: groups, guilds, community and who's online."
EN["Ton personnage"] = "Your character"
EN["Dans Forever, on ne groupe qu'avec le même type de serveur. Ton choix sert à te montrer les bonnes annonces."] = "In Forever, you can only group with the same server type. Your choice is used to show you the right listings."
EN["|cff33dd55Parfait!|r Tes rôles servent aux alertes : l'addon te prévient quand un groupe cherche ton rôle."] = "|cff33dd55Perfect!|r Your roles are used for alerts: the addon tells you when a group needs your role."
EN["|cffff8800Choisis ton type de serveur pour continuer.|r"] = "|cffff8800Choose your server type to continue.|r"
EN["Rejoins tous les francophones"] = "Join every French speaker"
EN["Forever te place sur un serveur parmi plusieurs. La communauté Babillard Forever FR relie les francophones de TOUS les serveurs : son chat, ses annonces et qui est en ligne."] = "Forever puts you on one of several servers. The Babillard Forever FR community links French speakers from EVERY server: its chat, its listings and who's online."
EN["|cff33dd55Tu fais partie de la communauté!|r"] = "|cff33dd55You're in the community!|r"
EN["Afficher son chat"] = "Show its chat"
EN["Ajoute le chat de la communauté à ta fenêtre de chat pour parler avec tout le monde."] = "Add the community chat to your chat window to talk with everyone."
EN["Le jeu ouvre sa fenêtre pour rejoindre : accepte, et c'est fait!"] = "The game opens its join window: accept, and you're in!"
EN["|cffffd100Pas encore de communauté pour ta faction ou ta région.|r"] = "|cffffd100No community for your faction or region yet.|r"
EN["Crée-la! Touche J, puis « Créer une communauté » nommée « "] = "Create it! Press J, then 'Create a community' named '"
EN[" », fais un lien d'invitation qui n'expire pas et envoie-le sur babillard-forever.com."] = "', make an invite link that never expires and send it on babillard-forever.com."
EN["Repérer les joueurs qui parlent français dans le chat"] = "Spot players who speak French in chat"
EN["Les joueurs qui écrivent en français dans le chat public (général, dire, crier) apparaissent dans l'onglet En ligne, même sans l'addon. Tout se fait sur ton écran: rien n'est envoyé."] = "Players who write in French in public chat (general, say, yell) show up in the Online tab, even without the addon. Everything happens on your screen: nothing is sent."
EN["Afficher [FR] devant les messages des francophones"] = "Show [FR] in front of French speakers' messages"
EN["Dans ta fenêtre de chat seulement: [FR] devant les messages des joueurs qui ont l'addon ou qui ont été repérés en train de parler français."] = "In your chat window only: [FR] in front of messages from players who have the addon or were spotted speaking French."
EN["  |cffffd100/bf bienvenue|r : revoir l'accueil"] = "  |cffffd100/bf welcome|r : show the welcome again"
-- 2.1: guildes francophones
EN["Guilde francophone"] = "French-speaking guild"
EN["Guilde francophone repérée en jeu, pas encore annoncée avec l'addon."] = "French-speaking guild spotted in game, not listed with the addon yet."
EN["Dernier membre croisé : "] = "Last member seen: "
EN["Vue le "] = "Seen on "
EN["Repérée en jeu"] = "Spotted in game"
EN["Repérée"] = "Spotted"
EN["Croisée en jeu"] = "Seen in game"
EN["Membre de la guilde francophone <"] = "Member of the French-speaking guild <"
EN["autres serveurs"] = "other servers"
EN["repérés au chat"] = "spotted in chat"
EN["par leur guilde"] = "by their guild"
EN["Repérer les guildes francophones (d'après le nom de guilde)"] = "Spot French-speaking guilds (from the guild name)"
EN["Quand tu croises un joueur (survol, cible, noms au-dessus des têtes, groupe, /who), son nom de guilde est vérifié. Les guildes au nom francophone apparaissent dans l'onglet Guildes, et leurs membres croisés dans l'onglet En ligne. Tout se fait sur ton écran: rien n'est envoyé."] = "When you come across a player (mouseover, target, nameplates, group, /who), their guild name is checked. Guilds with a French name show up in the Guilds tab, and the members you saw in the Online tab. Everything happens on your screen: nothing is sent."
-- 2.2: onglet Commandes
EN["  |cffffd100/bf commandes|r : tous ces boutons dans la fenêtre"] = "  |cffffd100/bf commands|r : all these as buttons in the window"
EN["Commandes"] = "Commands"
EN["Retirer tous les joueurs de ta liste d'ignorés?"] = "Remove every player from your ignore list?"
EN["Babillard"] = "Board"
EN["Ouvre ou ferme le babillard des groupes."] = "Opens or closes the group board."
EN["Les guildes francophones qui recrutent ou qui ont été repérées."] = "French-speaking guilds that are recruiting or were spotted."
EN["Ton personnage, tes rôles et ton code pour le site."] = "Your character, your roles and your code for the website."
EN["Les francophones en ligne en ce moment."] = "French speakers online right now."
EN["Rejoindre la communauté qui réunit les francophones de tous les serveurs, ou afficher son chat si tu en fais déjà partie."] = "Join the community that brings together French speakers from every server, or show its chat if you're already in it."
EN["Site web"] = "Website"
EN["Le lien de babillard-forever.com, prêt à copier."] = "The babillard-forever.com link, ready to copy."
EN["Accueil"] = "Welcome"
EN["Revoir l'accueil: langue, type de serveur, rôles et communauté."] = "Show the welcome again: language, server type, roles and community."
EN["Aide"] = "Help"
EN["Écrit la liste de toutes les commandes dans le chat."] = "Writes the list of every command in the chat."
EN["Alertes et joueurs"] = "Alerts and players"
EN["Favoris"] = "Favorites"
EN["Choisir les activités qui déclenchent une alerte."] = "Choose the activities that trigger an alert."
EN["Demandes"] = "Requests"
EN["Les groupes à qui tu as chuchoté, écrits dans le chat."] = "The groups you whispered, written in the chat."
EN["Ignorés"] = "Ignored"
EN["Les joueurs que tu as ignorés, écrits dans le chat."] = "The players you ignored, written in the chat."
EN["Vider les ignorés"] = "Clear ignored"
EN["Retire tous les joueurs de ta liste d'ignorés (on te demande de confirmer)."] = "Removes every player from your ignore list (you'll be asked to confirm)."
EN["Réglages"] = "Settings"
EN["Alertes, chat, affichage et repérage des francophones."] = "Alerts, chat, display and spotting French speakers."
EN["Langue"] = "Language"
EN["Français, English ou Auto (la langue du jeu). Un clic passe à la suivante; l'interface se recharge."] = "Français, English or Auto (the game's language). One click moves to the next one; the interface reloads."
EN["Diagnostic"] = "Diagnostic"
EN["Un texte à copier si les talents ou l'équipement n'apparaissent pas sur le site."] = "A text to copy if talents or gear don't show up on the website."
EN["Échap"] = "Esc"
EN["Ferme la fenêtre du babillard."] = "Closes the board window."
EN["Chaque bouton fait la même chose que la commande écrite dessous: tu peux aussi la taper dans le chat."] = "Each button does the same thing as the command written under it: you can also type it in the chat."
EN["Astuce: fais |cffffd100/who|r dans une zone achalandée (ex. |cffffd100/who 20-30|r) pour repérer d'un coup les guildes francophones autour de toi."] = "Tip: type |cffffd100/who|r in a busy zone (e.g. |cffffd100/who 20-30|r) to spot the French-speaking guilds around you all at once."
EN["Chat commu."] = "Comm. chat"

EN["Aucune"] = "None"
EN["Aucun"] = "None"
EN["Inconnu"] = "Unknown"
EN["  |cffffd100/bf langue fr|r, |cffffd100en|r ou |cffffd100auto|r : langue de l'addon"] = "  |cffffd100/bf language fr|r, |cffffd100en|r or |cffffd100auto|r : addon language"
