-- Babillard Forever FR - Lecture des annonces du chat (français et anglais)
-- Aucun appel à l'API du jeu ici: ce fichier se teste hors jeu (addon/tests).
-- Les annonces lues dans le chat s'affichent au babillard avec « [chat] », pour qu'il ne soit pas vide
-- quand peu de joueurs ont l'addon.
local ADDON, ns = ...

-- Formes normalisées (minuscules, sans accents ni apostrophes ni tirets) par clé d'activité (voir Data.lua).
-- Le nom français de chaque activité (Data.lua) est ajouté automatiquement.
local ALIASES = {
    RFC    = { "rfc", "ragefire chasm", "ragefire", "gouffre de ragefeu", "ragefeu" },
    THANES = { "hall of thanes", "thanes", "salle des thanes" },
    LORD   = { "ruins of lordaeron", "lordaeron", "ruines de lordaeron" },
    WC     = { "wc", "wailing caverns", "wailing", "cavernes des lamentations", "lamentations" },
    VC     = { "vc", "dm", "deadmines", "the deadmines", "mortemines", "les mortemines", "mines de la mort" },
    SFK    = { "sfk", "shadowfang keep", "shadowfang", "ombrecroc", "donjon dombrecroc" },
    BFD    = { "bfd", "blackfathom deeps", "blackfathom", "brassenoire", "profondeurs de brassenoire" },
    STOCK  = { "stockade", "stockades", "the stockade", "prison", "la prison", "prison de hurlevent" },
    EXCAV  = { "excavation site", "excavation", "excavations" },
    DALA   = { "city of dalaran", "dalaran", "cite de dalaran" },
    RFK    = { "rfk", "razorfen kraul", "kraul", "kraal", "kraal de tranchebauge" },
    GNOMER = { "gnomer", "gnomeregan" },
    SMGY   = { "sm gy", "sm graveyard", "smgy", "sm cimetiere", "cimetiere", "graveyard" },
    SMLIB  = { "sm lib", "sm library", "smlib", "sm biblio", "sm bibliotheque", "bibliotheque", "library" },
    SMARM  = { "sm arm", "sm armory", "smarm", "sm armurerie", "armurerie", "armory" },
    SMCATH = { "sm cath", "sm cathedral", "smcath", "sm cathedrale", "cathedrale", "cathedral" },
    SUNKC  = { "drowned city", "the drowned city", "cite submergee", "sunken city" },
    RFD    = { "rfd", "razorfen downs", "souilles", "souilles de tranchebauge" },
    KROL   = { "kroldok", "krol dok", "kroldok stronghold", "forteresse de kroldok" },
    ULDA   = { "ulda", "uldaman", "uldam" },
    ZF     = { "zf", "zulfarrak", "zul farrak" },
    MARA   = { "mara", "maraudon" },
    ALCAZ  = { "alcaz", "alcaz island prison", "alcaz island", "prison dalcaz" },
    ST     = { "st", "temple of atalhakkar", "sunken temple", "atalhakkar", "temple datalhakkar", "temple englouti" },
    BRD    = { "brd", "blackrock depths", "profondeurs de blackrock", "profondeurs de rochenoire", "prof blackrock" },
    DME    = { "dme", "dm e", "dm east", "dire maul east", "hache tripes est", "dm est" },
    DMW    = { "dmw", "dm w", "dm west", "dire maul west", "hache tripes ouest", "dm ouest" },
    DMN    = { "dmn", "dm n", "dm north", "dire maul north", "hache tripes nord", "dm nord", "tribut", "tribute" },
    LBRS   = { "lbrs", "lower blackrock spire", "pic blackrock inferieur", "pic rochenoire inferieur" },
    MACHE  = { "blackmaw hold", "blackmaw", "forteresse de machenoire", "machenoire" },
    SHAPER = { "shapers terrace", "shaper terrace", "shapers", "terrasse du faconneur", "faconneur" },
    STRAT  = { "strat", "stratholme", "strat live", "strat living", "strat ud", "strat undead", "strat vivant" },
    SCHOLO = { "scholo", "scholomance" },
    UBRS   = { "ubrs", "upper blackrock spire", "pic blackrock superieur", "pic rochenoire superieur" },
    ONY    = { "onyxia", "ony", "onyxias lair", "repaire donyxia" },
    HYJAL  = { "hyjal summit", "hyjal", "sommet dhyjal" },
    BARROW = { "barrow deeps", "barrow", "profondeurs des tertres" },
    WSG    = { "wsg", "warsong gulch", "goulet des chanteguerres", "goulet" },
    AB     = { "arathi basin", "bassin darathi", "arathi" },
    DSI    = { "iles sombrelance", "darkspear isles" },
    AV     = { "alterac valley", "vallee dalterac", "alterac" },
    WPVP   = { "pvp", "bg", "bgs", "wpvp", "pvp sauvage", "world pvp", "champ de bataille", "champs de bataille" },
    QUEST  = { "quete", "quetes", "quest", "quests", "quete de groupe", "elite" },
    FARM   = { "farm", "farming" },
}

---------------------------------------------------------------------------
-- Normalisation: minuscules, sans accents, ponctuation en espaces, chiffres séparés des lettres.
---------------------------------------------------------------------------
local ACCENTS = {
    [160] = "a", [161] = "a", [162] = "a", [164] = "a", [167] = "c", [168] = "e", [169] = "e", [170] = "e", [171] = "e",
    [172] = "i", [173] = "i", [174] = "i", [175] = "i", [178] = "o", [179] = "o", [180] = "o", [182] = "o",
    [185] = "u", [186] = "u", [187] = "u", [188] = "u",
    [128] = "a", [130] = "a", [132] = "a", [135] = "c", [136] = "e", [137] = "e", [138] = "e", [139] = "e",
    [142] = "i", [143] = "i", [148] = "o", [150] = "o", [153] = "u", [155] = "u", [156] = "u",
}

function ns.NormalizeText(text)
    local s = tostring(text or "")
    s = s:gsub("|c%x%x%x%x%x%x%x%x", ""):gsub("|r", "")          -- couleurs
    s = s:gsub("|H.-|h(.-)|h", "%1")                              -- liens: on garde le texte
    s = s:gsub("\226\128[\152\153]", "")                          -- guillemets simples typographiques
    s = s:gsub("\226\128.", " ")                                  -- tirets longs et autres signes
    s = s:gsub("\197\147", "oe"):gsub("\197\146", "oe")
    s = s:gsub("\195(.)", function(c) return ACCENTS[c:byte()] or " " end)
    s = s:lower():gsub("'", "")
    s = s:gsub("[^%w]", " ")
    s = s:gsub("(%d)(%a)", "%1 %2"):gsub("(%a)(%d)", "%1 %2")
    s = s:gsub("%s+", " ")
    s = s:gsub("^ ", ""):gsub(" $", "")
    return " " .. s .. " "
end
local normalize = ns.NormalizeText

local function words(normalized)
    local t = {}
    for w in normalized:gmatch("%S+") do t[#t + 1] = w end
    return t
end

---------------------------------------------------------------------------
-- Vocabulaire
---------------------------------------------------------------------------
local ROLE = {
    tank = "TANK", tanks = "TANK", tk = "TANK", tanker = "TANK",
    heal = "HEAL", heals = "HEAL", healer = "HEAL", healers = "HEAL", healeur = "HEAL", healeurs = "HEAL",
    soigneur = "HEAL", soigneurs = "HEAL", soin = "HEAL", soins = "HEAL",
    dps = "DPS", dd = "DPS", degat = "DPS", degats = "DPS", cac = "DPS", melee = "DPS", range = "DPS",
    ranged = "DPS", caster = "DPS", casters = "DPS",
}
local SEEK  = { cherche = true, cherchons = true, cherchent = true, recherche = true, recherchons = true,
                besoin = true, need = true, needs = true, manque = true, manquent = true, lf = true }
local GROUP = { groupe = true, grp = true, group = true, party = true, team = true, equipe = true, gang = true }
local SPAM  = { wts = true, wtb = true, wtt = true, vend = true, vends = true, vendre = true, achete = true,
                acheter = true, recrute = true, recrutement = true, recrutons = true, boost = true, boosts = true,
                carry = true }
local SMALL = { un = true, une = true, des = true, ["1"] = true }

-- Table des alias, construite au premier besoin (Data.lua doit être chargé).
local aliasList
local function BuildAliases()
    aliasList = {}
    for key, list in pairs(ALIASES) do
        if ns.ACT_BY_KEY[key] then
            for _, alias in ipairs(list) do tinsert(aliasList, { alias = alias, key = key }) end
        end
    end
    for key, a in pairs(ns.ACT_BY_KEY) do
        local n = normalize(a.name):gsub("^ ", ""):gsub(" $", "")
        if n ~= "" then tinsert(aliasList, { alias = n, key = key }) end
    end
end

local function FindActivity(normalized)
    if not aliasList then BuildAliases() end
    local best, bestPos, bestLen
    for _, e in ipairs(aliasList) do
        local pos = normalized:find(" " .. e.alias .. " ", 1, true)
        if pos and (not bestPos or pos < bestPos or (pos == bestPos and #e.alias > bestLen)) then
            best, bestPos, bestLen = e.key, pos, #e.alias
        end
    end
    return best
end

---------------------------------------------------------------------------
-- Analyse d'un message de chat. Retourne nil quand ce n'est pas une annonce de groupe, sinon:
-- { type = "LFM"|"LFG", roles = { TANK = true, ... }, akey = clé d'activité ou nil, level = n ou nil }
---------------------------------------------------------------------------
function ns.ParseChat(text)
    if type(text) ~= "string" or text == "" or #text > 400 then return nil end
    local n = normalize(text)
    local t = words(n)
    if #t == 0 then return nil end

    local present = {}
    for _, w in ipairs(t) do
        present[w] = true
        if SPAM[w] then return nil end
    end

    local roles, foundRole = {}, false
    for _, w in ipairs(t) do
        if ROLE[w] then
            roles[ROLE[w]] = true
            foundRole = true
        end
    end

    local akey = FindActivity(n)

    local kind
    if present.lfm or n:find(" lf %d m ", 1, false) then
        kind = "LFM"
    elseif present.lfg then
        kind = "LFG"
    else
        for i, w in ipairs(t) do
            if SEEK[w] then
                local j = i + 1
                if SMALL[t[j] or ""] then j = j + 1 end
                if t[j] and GROUP[t[j]] then kind = "LFG"; break end
            end
        end
        if not kind then
            for i, w in ipairs(t) do
                if SEEK[w] then
                    for j = i + 1, math.min(i + 4, #t) do
                        if ROLE[t[j]] then kind = "LFM"; break end
                    end
                    if kind then break end
                end
            end
        end
        if not kind and present.dispo and (akey or foundRole) then kind = "LFG" end
    end
    if not kind then return nil end

    -- Les annonces de guilde sans activité ne sont pas des groupes.
    if (present.guilde or present.guild) and not akey then return nil end
    if not akey and not foundRole then return nil end

    local level
    for i, w in ipairs(t) do
        if w == "lvl" or w == "niv" or w == "level" or w == "lv" or w == "niveau" or w == "lvls" then
            local a = tonumber(t[i + 1] or "")
            if a and a >= 1 and a <= 60 then level = a end
            break
        end
    end

    return { type = kind, roles = roles, akey = akey, level = level }
end

---------------------------------------------------------------------------
-- Texte d'une annonce publiée dans le chat. Il se relit avec ns.ParseChat (voir les tests).
-- l = annonce (type, akey, roles, note, level)
---------------------------------------------------------------------------
function ns.ChatText(l)
    local a = ns.ACT_BY_KEY[l.akey or ""]
    local parts = { l.type == "LFG" and "LFG" or "LFM", a and a.name or "" }
    local names = {}
    for _, key in ipairs(ns.ROLE_ORDER) do
        if l.roles and l.roles[key] then tinsert(names, ns.ROLE_INFO[key].name) end
    end
    if #names > 0 then
        tinsert(parts, (l.type == "LFG" and "" or "- ") .. table.concat(names, ", "))
    end
    if l.type == "LFG" and l.level and l.level > 0 then tinsert(parts, "niv " .. l.level) end
    local text = table.concat(parts, " ")
    if l.note and l.note ~= "" then text = text .. " - " .. l.note end
    return (text .. " [Babillard FR]"):sub(1, 250)
end
