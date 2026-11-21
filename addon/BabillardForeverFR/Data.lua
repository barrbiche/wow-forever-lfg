-- Babillard Forever FR - Données (activités, rôles, constantes)
local ADDON, ns = ...

ns.VERSION       = "1.5.10"
ns.PREFIX        = "BabillardFR"          -- préfixe des messages d'addon
ns.CHANNEL       = "BabillardFR"          -- canal caché partagé
ns.SITE_URL      = "https://babillard-forever.com"
ns.ICON          = "Interface\\Icons\\INV_Misc_GroupNeedMore"

ns.EXPIRE        = 15 * 60                -- durée d'une annonce de groupe
ns.GUILD_EXPIRE  = 60 * 60                -- durée d'une annonce de guilde
ns.REMIND_BEFORE = 2 * 60                 -- rappel avant expiration
ns.CHAT_MAX      = 120                    -- annonces lues dans le chat qu'on garde en mémoire
ns.CHAT_POST_GAP = 60                     -- secondes minimum entre deux publications dans le chat

ns.CATEGORIES = { "Donjons", "Raids", "PvP", "Autre" }
-- Couleurs de rareté des objets du jeu, comme sur le site: donjon bleu, raid orange, PvP violet, autre vert
ns.CAT_COLORS = { Donjons = "ff4aa8ff", Raids = "ffff8000", PvP = "ffb35cf5", Autre = "ff3fe03f" }
ns.DEFAULT_SIZE = { Donjons = 5, Raids = 40, PvP = 10, Autre = 5 }

ns.ROLE_ORDER = { "TANK", "HEAL", "DPS" }
ns.ROLE_INFO = {
    TANK = { letter = "T", name = "Tank",     atlas = "groupfinder-icon-role-large-tank", tiny = "roleicon-tiny-tank",   icon = "Interface\\Icons\\Ability_Defend" },
    HEAL = { letter = "H", name = "Soigneur", atlas = "groupfinder-icon-role-large-heal", tiny = "roleicon-tiny-healer", icon = "Interface\\Icons\\Spell_Holy_FlashHeal" },
    DPS  = { letter = "D", name = "DPS",      atlas = "groupfinder-icon-role-large-dps",  tiny = "roleicon-tiny-dps",    icon = "Interface\\Icons\\Ability_DualWield" },
}
ns.ROLE_BY_LETTER = { T = "TANK", H = "HEAL", D = "DPS" }

-- Types d'annonce
ns.TYPES = {
    LFG = { name = "Cherche un groupe",   short = "Cherche groupe", color = "ff66ccff" },
    LFM = { name = "Groupe cherche",      short = "Groupe cherche", color = "ffffd100" },
}

-- Types de serveur (mêmes identifiants que le site): on ne groupe qu'avec le même type.
ns.RULESET_ORDER = { "normal", "pvp", "rp", "rp_pvp" }
ns.RULESETS = {
    normal = "Normal (PvE)",
    pvp    = "PvP",
    rp     = "Jeu de rôle (RP)",
    rp_pvp = "Jeu de rôle PvP (RP-PvP)",
}

-- Orientation des guildes
ns.GUILD_FOCUS_ORDER = { "PVE", "PVP", "SOC", "LVL" }
ns.GUILD_FOCUS = {
    PVE = "PvE",
    PVP = "PvP",
    SOC = "Social",
    LVL = "Montée de niveaux",
}

-- Tout ce qu'on peut faire sur WoW Forever, par catégorie, avec les niveaux requis.
-- Sources : listes de Blizzard (sept.-oct. 2026). Les noms français des nouveautés
-- sont à valider avec le client : corrige-les ici au besoin.
-- size = taille du groupe complet (sert au retrait automatique).
ns.ACTIVITIES = {
    Donjons = {
        { key = "RFC",    name = "Gouffre de Ragefeu",                min = 13, max = 18 },
        { key = "THANES", name = "Salle des Thanes",                  min = 13, max = 18 },
        { key = "LORD",   name = "Ruines de Lordaeron",               min = 15, max = 20 },
        { key = "WC",     name = "Cavernes des Lamentations",         min = 15, max = 24 },
        { key = "VC",     name = "Mines de la Mort",                  min = 17, max = 26 },
        { key = "SFK",    name = "Donjon d'Ombrecroc",                min = 20, max = 30 },
        { key = "BFD",    name = "Profondeurs de Brassenoire",        min = 24, max = 32 },
        { key = "STOCK",  name = "La Prison (Hurlevent)",             min = 25, max = 29 },
        { key = "EXCAV",  name = "Excavations : les Paluns",          min = 26, max = 31 },
        { key = "DALA",   name = "Cité de Dalaran",                   min = 28, max = 33 },
        { key = "RFK",    name = "Kraal de Tranchebauge",             min = 29, max = 38 },
        { key = "GNOMER", name = "Gnomeregan",                        min = 29, max = 38 },
        { key = "SMGY",   name = "Monastère écarlate : Cimetière",    min = 30, max = 38 },
        { key = "SMLIB",  name = "Monastère écarlate : Bibliothèque", min = 33, max = 41 },
        { key = "SMARM",  name = "Monastère écarlate : Armurerie",    min = 36, max = 44 },
        { key = "SMCATH", name = "Monastère écarlate : Cathédrale",   min = 38, max = 46 },
        { key = "SUNKC",  name = "Cité submergée",                    min = 35, max = 40 },
        { key = "RFD",    name = "Souilles de Tranchebauge",          min = 37, max = 46 },
        { key = "KROL",   name = "Forteresse de Krol'dok",            min = 40, max = 45 },
        { key = "ULDA",   name = "Uldaman",                           min = 41, max = 51 },
        { key = "ZF",     name = "Zul'Farrak",                        min = 44, max = 54 },
        { key = "MARA",   name = "Maraudon",                          min = 46, max = 55 },
        { key = "ALCAZ",  name = "Prison d'Alcaz",                    min = 48, max = 53 },
        { key = "ST",     name = "Temple englouti",                   min = 50, max = 60 },
        { key = "BRD",    name = "Profondeurs de Rochenoire",         min = 52, max = 60 },
        { key = "DME",    name = "Hache-Tripes : Est",                min = 54, max = 60 },
        { key = "DMW",    name = "Hache-Tripes : Ouest",              min = 56, max = 60 },
        { key = "DMN",    name = "Hache-Tripes : Nord",               min = 56, max = 60 },
        { key = "LBRS",   name = "Pic Rochenoire inférieur",          min = 55, max = 60 },
        { key = "MACHE",  name = "Forteresse de Mâchenoire",          min = 55, max = 60 },
        { key = "SHAPER", name = "Terrasse du Façonneur",             min = 58, max = 60 },
        { key = "STRAT",  name = "Stratholme",                        min = 58, max = 60 },
        { key = "SCHOLO", name = "Scholomance",                       min = 58, max = 60 },
        { key = "UBRS",   name = "Pic Rochenoire supérieur",          min = 58, max = 60 },
    },
    Raids = {
        { key = "ONY",    name = "Repaire d'Onyxia",                  min = 60, max = 60, size = 40 },
        { key = "HYJAL",  name = "Sommet d'Hyjal",                    min = 60, max = 60, size = 20 },
        { key = "BARROW", name = "Profondeurs des Tertres",           min = 60, max = 60, size = 10 },
    },
    PvP = {
        { key = "WSG",    name = "Goulet des Chanteguerres",          min = 10, max = 60, size = 10 },
        { key = "AB",     name = "Bassin d'Arathi",                   min = 20, max = 60, size = 15 },
        { key = "DSI",    name = "Îles Sombrelance",                  min = 30, max = 60, size = 15 },
        { key = "AV",     name = "Vallée d'Alterac",                  min = 51, max = 60, size = 40 },
        { key = "WPVP",   name = "PvP sauvage",                       min = 1,  max = 60, size = 5 },
    },
    Autre = {
        { key = "QUEST",  name = "Quête de groupe / élite",           min = 1,  max = 60 },
        { key = "FARM",   name = "Farm (or, matériaux, réputation)",  min = 1,  max = 60 },
        { key = "ONYATT", name = "Accord d'Onyxia (amulette)",        min = 60, max = 60 },
        { key = "OTHER",  name = "Autre (précise dans la note)",      min = 1,  max = 60 },
    },
}

-- Index par clé + valeurs par défaut
ns.ACT_BY_KEY = {}
for cat, list in pairs(ns.ACTIVITIES) do
    for _, a in ipairs(list) do
        a.cat = cat
        a.size = a.size or ns.DEFAULT_SIZE[cat]
        ns.ACT_BY_KEY[a.key] = a
    end
end
