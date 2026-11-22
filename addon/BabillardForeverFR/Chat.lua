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

-- Coupe un texte à n octets au plus sans couper un caractère accentué en deux (é = 2 octets): un caractère coupé est
-- invalide pour le jeu et s'affiche comme un symbole brisé chez les autres joueurs.
function ns.CutUtf8(s, n)
    s = tostring(s or "")
    if #s <= n then return s end
    s = s:sub(1, n)
    local i = #s
    while i > 1 and s:byte(i) >= 128 and s:byte(i) < 192 do i = i - 1 end   -- remonte au début du dernier caractère
    local lead = s:byte(i)
    if lead and lead >= 192 then
        local len = lead >= 240 and 4 or lead >= 224 and 3 or 2
        if #s - i + 1 < len then s = s:sub(1, i - 1) end
    end
    return s
end

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
            for _, alias in ipairs(list) do tinsert(aliasList, { alias = alias, padded = " " .. alias .. " ", key = key }) end
        end
    end
    for key, a in pairs(ns.ACT_BY_KEY) do
        for _, name in ipairs({ a.name, a.fr }) do   -- a.fr: nom français quand l'addon est en anglais
            local n = normalize(name):gsub("^ ", ""):gsub(" $", "")
            if n ~= "" then tinsert(aliasList, { alias = n, padded = " " .. n .. " ", key = key }) end
        end
    end
end

local function FindActivity(normalized)
    if not aliasList then BuildAliases() end
    local best, bestPos, bestLen
    for _, e in ipairs(aliasList) do
        local pos = normalized:find(e.padded, 1, true)
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
    -- Rejet rapide: la grande majorité des messages du chat ne sont pas des annonces de groupe. Une annonce contient toujours
    -- « lf » (lfm, lfg, lf3m…), un verbe de recherche (cherche, recherche, besoin, need, manque) ou « dispo »; sans l'un
    -- d'eux, l'analyse complète donnerait de toute façon nil.
    local low = text:lower()
    if not (low:find("lf", 1, true) or low:find("cherch", 1, true) or low:find("besoin", 1, true) or low:find("need", 1, true)
        or low:find("manque", 1, true) or low:find("dispo", 1, true)) then
        return nil
    end
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
-- withTag: ajoute « [Babillard FR] » à la fin (désactivé par défaut: la politique d'addons de Blizzard interdit la promotion)
function ns.ChatText(l, withTag)
    local a = ns.ACT_BY_KEY[l.akey or ""]
    local parts = { l.type == "LFG" and "LFG" or "LFM", a and a.name or "" }
    local names = {}
    for _, key in ipairs(ns.ROLE_ORDER) do
        if l.roles and l.roles[key] then
            local n = l.counts and l.counts[key]
            tinsert(names, ns.ROLE_INFO[key].name .. ((n and n > 1) and (" x" .. n) or ""))
        end
    end
    if #names > 0 then
        tinsert(parts, (l.type == "LFG" and "" or "- ") .. table.concat(names, ", "))
    end
    if l.type == "LFG" and l.level and l.level > 0 then tinsert(parts, ((ns.lang == "en") and "lvl " or "niv ") .. l.level) end
    local text = table.concat(parts, " ")
    if l.note and l.note ~= "" then text = text .. " - " .. l.note end
    if withTag then text = text .. " [Babillard FR]" end
    return ns.CutUtf8(text, 250)
end

---------------------------------------------------------------------------
-- Repérer le français dans le chat public
-- Sert à trouver les francophones, même ceux qui n'ont pas l'addon. Prudent: un seul mot ne suffit pas. Il faut au
-- moins un mot typiquement français, assez d'indices au total, et plus de français que de mots courants d'autres
-- langues (anglais, espagnol, portugais, néerlandais, allemand, italien).
---------------------------------------------------------------------------
local function Set(list)
    local s = {}
    for w in list:gmatch("%S+") do s[w] = true end
    return s
end

-- Mots qu'on ne voit presque qu'en français (y compris le français du Québec et le langage du chat)
local FR_STRONG = Set([[
je vous nous est pas avec pour mais oui merci salut bonjour bonsoir cherche recherche qqn qq1 quelqu dans sur une des
les aussi très tres alors encore peut veux veut suis chui jsuis fait faire avoir être etre où quoi comment pourquoi
combien quand rien tout tous toute avez ai moi toi lui leur eux notre votre nos vos ici là déjà deja beaucoup svp stp
mdr ptdr bcp pk pcq parce jamais toujours besoin manque groupe donjon guilde ça avant après apres demain soir
pis tsé faque fak chu pantoute icitte tabarnak criss ostie calisse asteure astheure jpense jvais jsais chai bin vais
sais pense peux dois doit fais merde ouais bienvenue niveau
]])
-- Mots courants en français mais aussi dans d'autres langues: ils comptent un peu
local FR_WEAK = Set([[
la le de du un et en on ou que qui il elle ils elles mon ton son ma ta sa mes tes ses ce cet cette ces au aux y tu bon
plus si ne se me te non
]])
-- Mots courants d'autres langues: s'ils dominent, ce n'est pas du français
local OTHER = Set([[
the and you is are for with what need anyone any have has just this that to in of it my your i im can will would should
does did dont want looking lf lfm lfg wts wtb pls plz please thanks thx guys group who how why when where there they
them but not all one get got go going be was were so do he she we us our hello hey yes
some more like know think tonight today time really good now here out up about from by at an or off see come make
take let lets
el los las con para por pero una como es esta está hola gracias alguien busco necesito tengo yo muy más mas
você voce não nao uma com obrigado alguém eu tem isso
ik het een niet wat van voor met zijn hebben ook maar nog wie hoe jij jou
ich und der die das nicht ist mit für fur auch aber noch wer wie sucht suche gruppe kann bin hab habe
che per sono gli della anche cerco ciao grazie qualcuno
]])
-- Préfixes élidés (j'ai, c'est, qu'il, n'importe…): presque uniquement français
local ELISION_STRONG = Set("j c qu n s m t jai cest")
local ELISION_WEAK = Set("l d")
-- Accents très français (è ê à ç ù â î ô û ë ï œ); « é » existe aussi en espagnol et en portugais
local FR_ACCENTS = { "\195\168", "\195\170", "\195\160", "\195\167", "\195\185", "\195\162", "\195\174", "\195\180",
    "\195\187", "\195\171", "\195\175", "\197\147" }
local E_ACUTE = "\195\169"

-- string.lower ne touche pas aux majuscules accentuées (É, À, Ç…): on les met en minuscules nous-mêmes.
local function LowerFr(s)
    s = s:lower()
    return (s:gsub("\195([\128-\158])", function(c) return "\195" .. string.char(c:byte() + 32) end))
end

function ns.LooksFrench(text)
    if type(text) ~= "string" then return false end
    local len = #text
    if len < 8 or len > 400 then return false end
    -- liens et couleurs du jeu enlevés, apostrophe typographique remplacée
    local t = text:gsub("|H.-|h(.-)|h", "%1"):gsub("|c%x%x%x%x%x%x%x%x", ""):gsub("|r", "")
    t = LowerFr(t:gsub("\226\128\153", "'"))
    local strong, weak, other, words = 0, 0, 0, 0
    for w in t:gmatch("[%w\128-\255']+") do
        words = words + 1
        local pre, rest = w:match("^(%w+)'(.*)$")
        if pre then
            if ELISION_STRONG[pre] then strong = strong + 1 elseif ELISION_WEAK[pre] then weak = weak + 1 end
            w = rest
        end
        w = w:gsub("'", "")
        if w ~= "" then
            if FR_STRONG[w] then strong = strong + 1
            elseif FR_WEAK[w] then weak = weak + 1
            elseif OTHER[w] then other = other + 1 end
        end
    end
    -- Au moins deux mots typiquement français, ou un seul avec plusieurs petits mots français autour.
    if words < 3 or strong == 0 or (strong == 1 and weak < 3) then return false end
    local score = strong * 2 + weak * 0.5
    for _, a in ipairs(FR_ACCENTS) do
        if t:find(a, 1, true) then score = score + 1.5 break end
    end
    if t:find(E_ACUTE, 1, true) then score = score + 0.5 end
    return score >= 3 and score > other * 2
end

---------------------------------------------------------------------------
-- Repérer un nom de guilde francophone (« Les Fous du Roi », « Ordre de la Lumière », « Québec Libre »…)
-- Les noms de guilde sont courts: on se fie au vocabulaire typique des guildes en français, aux mots d'identité
-- (Québec, Belgique, francophone…), aux accents et aux articles. Les mots anglais, espagnols, allemands ou néerlandais
-- font pencher vers « pas francophone ».
---------------------------------------------------------------------------
-- Mots d'identité: un seul suffit
local GUILD_IDENTITY = Set([[
québec quebec québécois québécoise québécois quebecois quebecoise qc mtl montréal montreal francophone francophones
francophonie français française françaises francais francaise francaises franco francos belge belges belgique
wallonie suisse romandie romand romands acadie acadien acadiens acadienne gaulois gaule bretagne tabarnak tabarnac
câlisse calisse câlice poutine érable nordiques sacrebleu frenchies french frenchy
]])
-- Vocabulaire de guilde typiquement français (orthographe différente de l'anglais)
local GUILD_FR = Set([[
les des du aux ordre chevaliers chevalier gardiens gardiennes gardien ombres ombre lames lame loups loup lumière
lumiere ténèbres tenebres épée épées epee epees flamme flammes cendres cendre étoile étoiles etoile etoiles lune
soleil ciel enfer paradis âme âmes ame ames coeur coeurs cœur cœurs esprit esprits dieux démons anges ange bêtes
chasse chasseurs chasseur guerriers guerrier sorciers sorcier voleurs voleur aventuriers explorateurs rebelles rois roi
reines reine seigneurs seigneur compagnons compagnie confrérie confrerie fraternité fraternite famille amis potes
copains équipe equipe escouade bande armée armee légion garde gardes cercle conseil royaume terres forêt foret
montagne montagnes nord sud ouest nuit aube crépuscule crepuscule orage tempête tempete tonnerre glace feu vent
pierre fer acier argent noir noirs noire noires blanc blancs blanche blanches rouge rouges vert verts sombre sombres
éternel éternels eternel eternels immortels maudit maudits oubliés oublies perdus sacré sacrés sacre fous fou folie
joyeux vieux vieilles petits grands nouveau nouvelle derniers premiers élite héros heros héritiers croisés croises
croisade enfants fils frères freres soeurs sœurs mercenaires pour vive avec sans nous notre nos écarlate ecarlate
]])
-- Mots courts partagés avec d'autres langues: un petit indice seulement
local GUILD_WEAK = Set("la le de et en un une l d")
-- Mots d'autres langues fréquents dans les noms de guilde
local GUILD_OTHER = Set([[
the of and for knights knight order guild club fan team squad legion brotherhood sons children lords lord kings king
queens queen wolves wolf blades blade shadows shadow light darkness dark black white red blood fire ice storm night day
dawn sun moon star stars iron steel gold silver heroes hero guardians guardian guard army empire kingdom crusade
crusaders hunters hunter warriors warrior raiders raid casual casuals hardcore elite gaming gamers friends family
crew gang house our my we
los las del el y familia hermandad orden caballeros guardianes
der die das und von zu
het van een
]])

-- Les mots sont comparés sans majuscules; les accents sont gardés (ils comptent comme indice).
function ns.LooksFrenchGuild(name)
    if type(name) ~= "string" or name == "" or #name > 60 then return false end
    local t = LowerFr(name:gsub("\226\128\153", "'"))
    local identity, strong, weak, other, words = 0, 0, 0, 0, 0
    for w in t:gmatch("[%w\128-\255']+") do
        words = words + 1
        local pre, rest = w:match("^(%w+)'(.*)$")
        if pre then
            if GUILD_WEAK[pre] then weak = weak + 1 end
            w = rest
        end
        w = w:gsub("'", "")
        if w ~= "" then
            if GUILD_IDENTITY[w] then identity = identity + 1
            elseif GUILD_FR[w] then strong = strong + 1
            elseif GUILD_WEAK[w] then weak = weak + 1
            elseif GUILD_OTHER[w] then other = other + 1 end
        end
    end
    if words == 0 then return false end
    local score = identity * 3 + strong * 2 + weak * 0.5
    for _, a in ipairs(FR_ACCENTS) do
        if t:find(a, 1, true) then score = score + 1.5 break end
    end
    if t:find(E_ACUTE, 1, true) then score = score + 1 end
    if identity > 0 then return other <= identity + strong end
    return score >= 2.5 and score > other * 2
end
