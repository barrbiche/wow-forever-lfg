-- Babillard Forever FR - Cœur : communication, annonces, alertes, retrait auto, rappel, export
local ADDON, ns = ...
local L = ns.L

ns.listings = {}   -- [expediteur] = annonce de groupe
ns.guilds   = {}   -- [nomGuilde-faction] = annonce de guilde
ns.online   = {}   -- [nom] = joueur avec l'addon vu récemment sur mon serveur (voir « Qui est en ligne »)
ns.my       = nil  -- mon annonce de groupe active
ns.myGuild  = nil  -- l'annonce de ma guilde active

---------------------------------------------------------------------------
-- Sauvegarde (entre les sessions)
---------------------------------------------------------------------------
local DEFAULTS = {
    minimap = { angle = 220, hide = false },
    myRoles = { DPS = true },
    opts = {
        alerts          = true,
        alertSound      = true,
        alertInInstance = false,
        autoRemove      = true,
        remind          = true,
        tooltipFlag     = true,
        sameFaction     = true,
        sameRuleset     = true,
        levelOnly       = true,
        chatReading     = true,    -- lire les annonces du chat (« [chat] »)
        spotFrench      = true,    -- repérer les joueurs qui parlent français dans le chat public
        frTag           = true,    -- afficher [FR] devant les messages des francophones dans le chat
        spotGuilds      = true,    -- repérer les guildes francophones (d'après le nom de guilde)
        alertChat       = false,   -- alertes aussi pour les annonces lues dans le chat
        alsoChat        = false,   -- publier aussi dans le chat (au clic seulement)
        chatTag         = false,   -- ajouter « [Babillard FR] » aux annonces du chat
        alsoCommunity   = true,    -- publier aussi dans la communauté Babillard Forever FR (au clic seulement)
        autoUpdate      = true,    -- mettre à jour tout seul le nombre de joueurs et les rôles manquants
        favsOnly        = false,   -- alertes seulement pour mes activités favorites
        whisperTemplate = true,
        lang            = "auto",  -- langue: "auto" (celle du jeu), "fr" ou "en" (après /reload)    -- Chuchoter écrit déjà un message de présentation (jamais envoyé tout seul)
    },
    favs     = {},     -- activités favorites : [cléActivité] = true
    ignored  = {},     -- joueurs ignorés : [nomEnMinuscules] = true
    known    = {},     -- joueurs qui ont l'addon : [Nom-Royaume] = date
    francos  = {},     -- joueurs repérés en train de parler français : [Nom] = date
    frGuilds = {},     -- guildes francophones : [Guilde] = { t = date, who = membre croisé, faction }
    welcomed = false,
}

local function ApplyDefaults(db, defaults)
    for k, v in pairs(defaults) do
        if db[k] == nil then
            db[k] = (type(v) == "table") and CopyTable(v) or v
        elseif type(v) == "table" and type(db[k]) == "table" and k ~= "myRoles" and k ~= "known" and k ~= "francos" and k ~= "frGuilds" then
            ApplyDefaults(db[k], v)
        end
    end
end

---------------------------------------------------------------------------
-- Utilitaires
---------------------------------------------------------------------------
function ns.Print(msg)
    print("|cff33aaffBabillard FR|r : " .. msg)
end

-- Enlève les caractères qui briseraient le format des messages
function ns.Clean(s)
    return strtrim(((s or ""):gsub("[|;=]", " ")))
end

function ns.PlaySoundKit(...)
    if not SOUNDKIT then return end
    for i = 1, select("#", ...) do
        local id = SOUNDKIT[(select(i, ...))]
        if id then PlaySound(id); return end
    end
end

function ns.PlayClick()
    ns.PlaySoundKit("IG_MAINMENU_OPTION_CHECKBOX_ON")
end

-- Atlas moderne si disponible, sinon une icône classique
function ns.SetIcon(tex, atlas, fallback)
    if atlas and C_Texture and C_Texture.GetAtlasInfo and C_Texture.GetAtlasInfo(atlas) then
        tex:SetTexCoord(0, 1, 0, 1)
        tex:SetAtlas(atlas)
    else
        tex:SetTexture(fallback)
        tex:SetTexCoord(0.08, 0.92, 0.08, 0.92)
    end
end

function ns.ClassHex(class)
    if class and class ~= "" then
        if C_ClassColor and C_ClassColor.GetClassColor then
            local c = C_ClassColor.GetClassColor(class)
            if c then return c:GenerateHexColor() end
        end
        local c = RAID_CLASS_COLORS and RAID_CLASS_COLORS[class]
        if c and c.colorStr then return c.colorStr end
    end
    return "ffffffff"
end

function ns.Ago(t)
    local m = math.floor((GetTime() - t) / 60)
    return m < 1 and L["à l'instant"] or (m .. L[" min"])
end

function ns.SafeCreate(frameType, name, parent, template, fallback)
    local ok, fr = pcall(CreateFrame, frameType, name, parent, template)
    if ok and fr then return fr end
    return CreateFrame(frameType, name, parent, fallback)
end

-- Noms dans Forever: « Prénom Nom », et le jeu ne donne souvent aucun royaume (« Chili Flakes- » avec un tiret vide).
-- Forme gardée partout: « Prénom Nom » quand le royaume est inconnu ou vide, « Prénom Nom-Royaume » sinon. Jamais de tiret
-- à la fin: le jeu ne trouve pas « Chili Flakes- » quand on lui chuchote.
local function MyRealm()
    local r = GetNormalizedRealmName and GetNormalizedRealmName()
    if type(r) ~= "string" or (issecretvalue and issecretvalue(r)) then return "" end
    return r
end

function ns.CleanName(name)
    if type(name) ~= "string" then return name end
    name = name:gsub("^%s+", ""):gsub("[%s%-]+$", "")
    return name
end

-- Mon nom complet « Prénom Nom ». Pour son propre personnage, le jeu ne donne normalement aucun royaume à UnitName: une
-- deuxième valeur est donc le nom de famille (Forever le sépare du prénom, comme le chat le montre: « Barrbiche Dote »).
function ns.MyFullName()
    local n, s = UnitName("player")
    n = n or "?"
    if type(s) == "string" and s ~= "" and not (issecretvalue and issecretvalue(s)) and not n:find(" ", 1, true) then
        n = n .. " " .. s
    end
    return n
end

function ns.Me()
    local n = ns.MyFullName()
    local r = MyRealm()
    return r ~= "" and (n .. "-" .. r) or n
end

function ns.NormalizeName(name)
    name = ns.CleanName(name)
    if not name or name == "" then return nil end
    if not name:find("-", 1, true) then
        local r = MyRealm()
        if r ~= "" then name = name .. "-" .. r end
    end
    return name
end

-- Dans Forever, un personnage a un prénom et un nom de famille séparés par une espace (« Mighty Enchilada »): l'espace fait
-- partie du nom. Seul le tiret sépare le nom du royaume (« Mighty Enchilada-Royaume »).
function ns.ShortName(name)
    name = ns.CleanName(name) or "?"
    if name:find("-", 1, true) then name = ns.CleanName(Ambiguate(name, "none")) end
    return name
end

-- Le nom complet du personnage, sans royaume, en minuscules: sert à comparer deux joueurs que le royaume soit écrit ou non.
function ns.BareName(name)
    if type(name) ~= "string" then return "" end
    return (name:match("^[^%-]+") or name):gsub("%s+$", ""):lower()
end

-- Nom utilisable pour chuchoter ou inviter: le nom complet, avec le royaume seulement s'il n'est pas le mien
-- (le jeu chuchote à « Mighty Enchilada », comme le clic droit → Chuchoter).
function ns.WhisperName(name)
    if type(name) ~= "string" then return name end
    return ns.ShortName(name)
end

-- Est-ce moi? Le jeu écrit parfois le royaume autrement dans les messages reçus (« Nom-Royaume »):
-- on compare seulement le nom, sinon sa propre annonce revenait en double.
function ns.IsMe(name)
    if not name then return false end
    return ns.BareName(name) == ns.BareName(ns.MyFullName())
end

-- Type de serveur choisi par le joueur (nil tant qu'il ne l'a pas choisi).
function ns.MyRuleset()
    local r = ns.db and ns.db.ruleset
    if r and ns.RULESETS[r] then return r end
end

-- Publier demande d'avoir choisi son type de serveur: dans Forever, on ne peut pas grouper avec un autre type
-- (PvE, PvP, RP, RP-PvP). Sans ce choix, l'annonce partirait sans étiquette et tout le monde la verrait.
function ns.RequireRuleset()
    if ns.MyRuleset() then return true end
    ns.Print(L["choisis d'abord ton type de serveur (PvE, PvP, RP ou RP-PvP) dans l'onglet |cffffd100Mon perso|r: ton annonce restera visible seulement pour les joueurs du même type."])
    if ns.UI and ns.UI.Open then pcall(ns.UI.Open, 3) end
    return false
end

function ns.RulesetName(id)
    return ns.RULESETS[id or ""]
end

-- Les annonces d'un autre type de serveur (ex. PvP quand je suis PvE) sont cachées: on ne peut pas grouper ensemble.
-- Si l'un des deux ne connaît pas son type (ancienne version de l'addon, choix pas fait), on montre quand même.
function ns.RulesetOK(r)
    local o = ns.db and ns.db.opts
    if not o or not o.sameRuleset then return true end
    local mine = ns.MyRuleset()
    if not mine or not r or r == "" then return true end
    return r == mine
end

-- « 1.2.0 » -> 10200. Les versions viennent d'autres joueurs: seul ce format exact est accepté.
function ns.VersionNumber(v)
    local a, b, c = tostring(v or ""):match("^(%d+)%.(%d+)%.(%d+)$")
    if not a or #a > 3 or #b > 3 or #c > 3 then return nil end
    return tonumber(a) * 1000000 + tonumber(b) * 1000 + tonumber(c)
end

-- Un autre joueur a une version plus récente: on le dit une seule fois par version.
function ns.CheckVersion(v)
    local theirs, mine = ns.VersionNumber(v), ns.VersionNumber(ns.VERSION)
    if not theirs or not mine or theirs <= mine or not ns.db then return end
    if theirs > (ns.db.newestSeen or 0) then
        ns.db.newestSeen, ns.db.newestText = theirs, v
        ns.newVersion = v
        ns.Print(L["une nouvelle version de l'addon est disponible ("] .. v .. L["). Tape |cffffd100/bf site|r pour le lien de téléchargement."])
        ns.Refresh()
    end
end

function ns.MyLevel()   return UnitLevel("player") or 0 end
function ns.MyFaction() return UnitFactionGroup("player") or "" end

function ns.EncodeRoles(set)
    local s = ""
    for _, key in ipairs(ns.ROLE_ORDER) do
        if set[key] then s = s .. ns.ROLE_INFO[key].letter end
    end
    return s
end

function ns.DecodeRoles(s)
    local set = {}
    for letter in (s or ""):gmatch(".") do
        local key = ns.ROLE_BY_LETTER[letter]
        if key then set[key] = true end
    end
    return set
end

-- Places par rôle pour les raids et le PvP: { TANK = 2, HEAL = 8, DPS = 25 } <-> "T2H8D25"
function ns.EncodeCounts(counts)
    local s = ""
    for _, key in ipairs(ns.ROLE_ORDER) do
        local n = counts and counts[key]
        if n and n >= 1 then s = s .. ns.ROLE_INFO[key].letter .. math.min(40, math.floor(n)) end
    end
    return s
end

function ns.DecodeCounts(s)
    local counts = {}
    for letter, digits in tostring(s or ""):gmatch("(%a)(%d+)") do
        local key = ns.ROLE_BY_LETTER[letter]
        local n = tonumber(digits)
        if key and n and n >= 1 and n <= 40 then counts[key] = n end
    end
    return counts
end

function ns.RolesText(set, counts)
    local t = {}
    for _, key in ipairs(ns.ROLE_ORDER) do
        if set[key] then
            local n = counts and counts[key]
            tinsert(t, ns.ROLE_INFO[key].name .. ((n and n > 1) and (" ×" .. n) or ""))
        end
    end
    return table.concat(t, ", ")
end

-- Faisable: le niveau minimum est atteint. Un joueur de niveau 40 peut très bien former un groupe pour les Mines de la
-- Mort (niveaux 17-26): il les garde dans sa liste (pour aider un ami, pour un reroll, pour le butin).
function ns.ActivityFits(a, level)
    return a ~= nil and level >= a.min
end

-- Dans la tranche de niveaux prévue pour l'activité (alertes et filtre « à mon niveau »: pas de bruit avec les petits donjons).
function ns.ActivityInRange(a, level)
    return a ~= nil and level >= a.min and level <= a.max
end

-- Activités d'une catégorie faisables à ton niveau: d'abord celles de ta tranche de niveaux, puis les plus basses (la plus
-- proche de ton niveau en premier).
function ns.AvailableActivities(cat)
    local level, inRange, below = ns.MyLevel(), {}, {}
    for _, a in ipairs(ns.ACTIVITIES[cat] or {}) do
        if ns.ActivityInRange(a, level) then tinsert(inRange, a)
        elseif ns.ActivityFits(a, level) then tinsert(below, a) end
    end
    for i = #below, 1, -1 do tinsert(inRange, below[i]) end
    return inRange
end

function ns.ActivityLabel(a)
    local s = a.name .. "  |cff888888(" .. (a.min == a.max and a.min or (a.min .. "-" .. a.max))
    if a.cat == "Raids" or (a.cat == "PvP" and a.size > 5) then
        s = s .. ", " .. a.size .. L[" joueurs"]
    end
    return s .. ")|r"
end

function ns.Refresh()
    if ns.UI and ns.UI.Refresh then ns.UI.Refresh() end
end

-- Pour les messages reçus du canal et du chat: quand beaucoup arrivent d'un coup (tout le monde répond à une demande, chat
-- chargé), l'interface ne se reconstruit pas à chaque message, mais au plus une fois par REFRESH_GAP. Le premier message
-- d'une série met à jour tout de suite; la fenêtre fermée ne coûte rien.
local REFRESH_GAP = 0.3
local lastSoon, soonSince = -1000, nil
function ns.RefreshSoon()
    if ns.UI and ns.UI.IsShown and not ns.UI.IsShown() then return end
    local now = GetTime()
    if now - lastSoon >= REFRESH_GAP then
        lastSoon = now
        ns.Refresh()
    elseif not soonSince or now - soonSince > 1 then   -- une minuterie perdue ne doit jamais bloquer les mises à jour
        soonSince = now
        C_Timer.After(REFRESH_GAP - (now - lastSoon), function()
            soonSince, lastSoon = nil, GetTime()
            ns.Refresh()
        end)
    end
end

---------------------------------------------------------------------------
-- Canal caché
---------------------------------------------------------------------------
ns.channelFailed = false

-- Un seul canal caché commun, « BabillardFR », le même nom pour tout le monde. Le jeu garde chaque canal sur son serveur
-- (Forever a plusieurs serveurs internes par mode de jeu, et un canal ne traverse pas d'un serveur à l'autre), mais un
-- même nom réunit au moins tous les joueurs du serveur et des serveurs liés, peu importe la version de l'addon.
-- (La 1.6.0 ajoutait le nom du royaume au canal: ça séparait les serveurs liés et les joueurs restés en 1.5.)
function ns.ChannelName()
    return ns.CHANNEL
end

local function ChannelIndex()
    local id = GetChannelName(ns.CHANNEL)
    if type(id) == "number" and id > 0 then return id end
end
ns.ChannelIndex = ChannelIndex

local function HideChannelFromChat(name)
    local remove = ChatFrame_RemoveChannel or (ChatFrameUtil and ChatFrameUtil.RemoveChannel)
    if not remove or not name then return end
    for i = 1, (NUM_CHAT_WINDOWS or 10) do
        local cf = _G["ChatFrame" .. i]
        if cf then pcall(remove, cf, name) end
    end
end

-- La 1.6.0 rejoignait « BabillardFR » + nom du royaume. Le jeu garde les canaux rejoints d'une connexion à l'autre: on
-- quitte celui-là pour ne pas occuper une place de canal pour rien (le jeu en permet dix).
function ns.LeaveLegacyChannel()
    if not LeaveChannelByName then return end
    local realm = select(2, UnitFullName("player"))
    if type(realm) ~= "string" or realm == "" then realm = GetNormalizedRealmName and GetNormalizedRealmName() end
    if type(realm) ~= "string" or realm == "" then return end
    if issecretvalue and issecretvalue(realm) then return end
    local clean = realm:gsub("[^%w]", "")
    if clean == "" then return end
    local old = (ns.CHANNEL .. clean):sub(1, 30)
    local id = GetChannelName(old)
    if type(id) == "number" and id > 0 then pcall(LeaveChannelByName, old) end
end

-- Joint le canal s'il ne l'est pas déjà. Appelé aussi lors des clics (plus fiable).
function ns.EnsureChannel()
    if ChannelIndex() then
        ns.channelFailed = false
        return true
    end
    local name = ns.ChannelName()
    if not name then return false end
    pcall(JoinChannelByName, name)
    C_Timer.After(1, function() HideChannelFromChat(name) end)
    C_Timer.After(3, function()
        ns.channelFailed = not ChannelIndex()
        ns.Refresh()
    end)
    return false
end

-- Pourquoi le dernier envoi a échoué: "canal" (pas encore rejoint) ou "limite" (le jeu limite le débit des messages d'addon:
-- environ 10 d'un coup, puis un par seconde), sinon "refus". Sert à dire la vraie raison au joueur.
ns.lastSendFailure = nil

function ns.Send(msg)
    local id = ChannelIndex()
    if not id then
        ns.lastSendFailure = "canal"
        ns.EnsureChannel()
        return false
    end
    local ok, res = pcall(C_ChatInfo.SendAddonMessage, ns.PREFIX, msg, "CHANNEL", id)
    if not ok or res == false or (type(res) == "number" and res ~= 0) then   -- Enum.SendAddonMessageResult.Success = 0
        -- 3 = AddonMessageThrottle, 8 = ChannelThrottle
        ns.lastSendFailure = (res == 3 or res == 8) and "limite" or "refus"
        return false
    end
    ns.lastSendFailure = nil
    return true
end

-- Texte à montrer quand ns.Send a échoué.
function ns.SendFailureText()
    if ns.lastSendFailure == "limite" then return L["le jeu limite l'envoi de messages, réessaie dans quelques secondes."] end
    if ns.lastSendFailure == "refus" then return L["le jeu a refusé d'envoyer le message, réessaie dans un instant."] end
    return L["connexion au canal en cours, réessaie dans quelques secondes."]
end

---------------------------------------------------------------------------
-- Messages (protocole v2, champs séparés par « ; »)
--   L2 : annonce de groupe     G2 : annonce de guilde
--   D2 : retrait (L ou G)      Q2 : demande des annonces actives
--   H2 : bonjour (présence)
---------------------------------------------------------------------------
local function ListingMessage(l)
    local age = math.max(0, math.floor(GetTime() - l.time))
    local fields = { "L2", l.type, l.cat, l.akey, ns.EncodeRoles(l.roles), l.class,
        l.level, l.faction, l.size, l.groupCount, age, l.note, l.ruleset or "", ns.VERSION }
    -- Places par rôle: champ ajouté seulement s'il y en a (les donjons gardent le même message qu'avant)
    local counts = ns.EncodeCounts(l.counts)
    if counts ~= "" then fields[#fields + 1] = counts end
    return table.concat(fields, ";")
end

local function GuildMessage(g)
    local age = math.max(0, math.floor(GetTime() - g.time))
    return table.concat({ "G2", g.guild, g.focus, g.faction, g.class, g.level, age, g.note, g.ruleset or "", ns.VERSION }, ";")
end

local function SaveMyState()
    if not ns.db then return end
    local now = time()
    if ns.my then
        ns.db.myListing = { type = ns.my.type, akey = ns.my.akey, roles = CopyTable(ns.my.roles),
            baseRoles = CopyTable(ns.my.baseRoles or ns.my.roles),
            counts = CopyTable(ns.my.counts or {}), baseCounts = CopyTable(ns.my.baseCounts or {}),
            note = ns.my.note, epoch = now - math.floor(GetTime() - ns.my.time) }
    else
        ns.db.myListing = nil
    end
    if ns.myGuild then
        ns.db.myGuild = { focus = ns.myGuild.focus, note = ns.myGuild.note,
            epoch = now - math.floor(GetTime() - ns.myGuild.time) }
    else
        ns.db.myGuild = nil
    end
end

---------------------------------------------------------------------------
-- Mon annonce de groupe
---------------------------------------------------------------------------
local lastPublish = 0

-- p = { type = "LFG"/"LFM", akey, roles = {TANK=true...}, note, keepTime }
function ns.PublishListing(p)
    if GetTime() - lastPublish < 5 then
        ns.Print(L["attends quelques secondes avant de republier."])
        return false
    end
    p.type = "LFM"   -- l'addon sert à former des groupes, pas à en chercher un
    local a = ns.ACT_BY_KEY[p.akey or ""]
    if not a then
        ns.Print(L["choisis une activité avant de publier."])
        return false
    end
    if not ns.ActivityFits(a, ns.MyLevel()) then
        ns.Print(L["ton niveau est trop bas pour cette activité (niveau "] .. a.min .. L[" minimum)."])
        return false
    end
    if not p.roles or not next(p.roles) then
        ns.Print(L["choisis au moins un rôle."])
        return false
    end
    if not ns.RequireRuleset() then return false end
    local _, class = UnitClass("player")
    local l = {
        sender = ns.Me(), type = p.type, cat = a.cat, akey = a.key, roles = CopyTable(p.roles),
        baseRoles = CopyTable(p.roles), counts = CopyTable(p.counts or {}), baseCounts = CopyTable(p.counts or {}),
        class = class or "", level = ns.MyLevel(), faction = ns.MyFaction(), size = a.size,
        groupCount = math.max(1, GetNumGroupMembers()), note = ns.CutUtf8(ns.Clean(p.note), 120),
        time = GetTime(), ruleset = ns.MyRuleset() or "",
    }
    if not ns.Send(ListingMessage(l)) then
        ns.Print(ns.SendFailureText())
        return false
    end
    lastPublish = GetTime()
    ns.my = l
    ns.listings[l.sender] = l
    SaveMyState()
    ns.PlaySoundKit("IG_MAINMENU_OPTION_CHECKBOX_ON")
    ns.Refresh()
    return true
end

function ns.Republish()
    if not ns.my then return end
    lastPublish = 0
    ns.PublishListing({ type = ns.my.type, akey = ns.my.akey, roles = ns.my.baseRoles or ns.my.roles,
        counts = ns.my.baseCounts, note = ns.my.note })
end

function ns.WithdrawListing(reason)
    if not ns.my then return end
    ns.Send("D2;L")
    ns.listings[ns.Me()] = nil
    ns.my = nil
    SaveMyState()
    if reason then ns.Print(reason) end
    ns.Refresh()
end

---------------------------------------------------------------------------
-- Annonce de ma guilde
---------------------------------------------------------------------------
function ns.PublishGuild(focus, note)
    local guild = GetGuildInfo("player")
    if not guild then
        ns.Print(L["tu dois être dans une guilde pour l'annoncer."])
        return false
    end
    if not ns.GUILD_FOCUS[focus or ""] then
        ns.Print(L["choisis le type de ta guilde."])
        return false
    end
    if not ns.RequireRuleset() then return false end
    local _, class = UnitClass("player")
    local g = {
        sender = ns.Me(), guild = ns.Clean(guild), focus = focus, faction = ns.MyFaction(),
        class = class or "", level = ns.MyLevel(), note = ns.CutUtf8(ns.Clean(note), 120), time = GetTime(),
        ruleset = ns.MyRuleset() or "",
    }
    if not ns.Send(GuildMessage(g)) then
        ns.Print(ns.SendFailureText())
        return false
    end
    ns.myGuild = g
    ns.guilds[g.guild .. "-" .. g.faction] = g
    SaveMyState()
    ns.PlayClick()
    ns.Refresh()
    return true
end

function ns.WithdrawGuild()
    if not ns.myGuild then return end
    ns.Send("D2;G")
    for k, g in pairs(ns.guilds) do
        if g.sender == ns.Me() then ns.guilds[k] = nil end
    end
    ns.myGuild = nil
    SaveMyState()
    ns.Refresh()
end

---------------------------------------------------------------------------
-- Demande des annonces actives (pour voir celles publiées avant ta connexion)
---------------------------------------------------------------------------
local lastRequest, lastReply = 0, 0

-- Retourne true quand la demande est partie, sinon false et le nombre de secondes à attendre (nil si l'envoi a échoué).
-- Seul le clic sur « Actualiser » (manual) peut demander plus d'une fois par 30 secondes: au plus une fois par 10 secondes.
function ns.RequestAll(manual)
    local wait = (manual and 10 or 30) - (GetTime() - lastRequest)
    if wait > 0 then return false, math.ceil(wait) end
    if ns.Send("Q2") then
        lastRequest = GetTime()
        return true
    end
    return false
end

-- Bouton « Actualiser »: redemande les annonces actives aux autres joueurs et dit ce qui se passe.
function ns.RefreshListings()
    ns.PlayClick()
    local ok, wait = ns.RequestAll(true)
    if ok then
        ns.Print(L["demande envoyée: les annonces actives des autres joueurs arrivent dans quelques secondes."])
    elseif wait then
        ns.Print(L["attends encore "] .. wait .. L[" s avant d'actualiser."])
    else
        ns.Print(ns.SendFailureText())
    end
    ns.Refresh()
end

local function ReplyToRequest()
    if GetTime() - lastReply < 20 then return end
    if not ns.my and not ns.myGuild then return end
    lastReply = GetTime()
    -- Petit délai au hasard pour ne pas que tout le monde réponde en même temps
    C_Timer.After(0.5 + math.random() * 2.5, function()
        if ns.my then ns.Send(ListingMessage(ns.my)) end
        if ns.myGuild then ns.Send(GuildMessage(ns.myGuild)) end
    end)
end

---------------------------------------------------------------------------
-- Nettoyage des annonces expirées
---------------------------------------------------------------------------
function ns.Prune()
    local now = GetTime()
    for k, l in pairs(ns.listings) do
        if now - l.time > ns.EXPIRE then ns.listings[k] = nil end
    end
    for k, g in pairs(ns.guilds) do
        if now - g.time > ns.GUILD_EXPIRE then ns.guilds[k] = nil end
    end
    for k, r in pairs(ns.requests or {}) do
        if now - r.time > 600 then ns.requests[k] = nil end
    end
    -- Les annonces lues dans le chat sont nombreuses: on garde les plus récentes seulement.
    local nChat = 0
    for _, l in pairs(ns.listings) do
        if l.source == "chat" then nChat = nChat + 1 end
    end
    if nChat > ns.CHAT_MAX then
        local chat = {}
        for k, l in pairs(ns.listings) do
            if l.source == "chat" then tinsert(chat, { k, l.time }) end
        end
        table.sort(chat, function(x, y) return x[2] > y[2] end)
        for i = ns.CHAT_MAX + 1, #chat do ns.listings[chat[i][1]] = nil end
    end
    if ns.my and now - ns.my.time > ns.EXPIRE then
        ns.my = nil
        SaveMyState()
    end
    if ns.myGuild and now - ns.myGuild.time > ns.GUILD_EXPIRE then
        ns.myGuild = nil
        SaveMyState()
    end
end

---------------------------------------------------------------------------
-- Alertes
---------------------------------------------------------------------------
local lastAlert = 0

local function FirstCommonRole(a, b)
    for _, key in ipairs(ns.ROLE_ORDER) do
        if a[key] and b[key] then return key end
    end
end

function ns.CheckAlert(l)
    local o = ns.db and ns.db.opts
    if not o or not o.alerts or ns.IsMe(l.sender) then return end
    if l.source == "chat" and not o.alertChat then return end
    if o.favsOnly and ns.db.favs and next(ns.db.favs) and not ns.db.favs[l.akey] then return end
    if InCombatLockdown() then return end
    if IsInInstance() and not o.alertInInstance then return end
    if o.sameFaction and l.faction ~= ns.MyFaction() then return end
    if not ns.RulesetOK(l.ruleset) then return end
    if GetTime() - lastAlert < 15 then return end

    local a = ns.ACT_BY_KEY[l.akey]
    if not a then return end
    local who = "|c" .. ns.ClassHex(l.class) .. ns.ShortName(l.sender) .. "|r"
    local text

    if l.type == "LFM" and not IsInGroup() and ns.ActivityInRange(a, ns.MyLevel()) then
        -- Un groupe cherche un de mes rôles
        local r = FirstCommonRole(l.roles, ns.db.myRoles)
        if r then
            text = string.format(L["%s cherche un %s pour %s"], who, ns.ROLE_INFO[r].name:lower(), a.name)
        end
    end
    if not text then return end

    lastAlert = GetTime()
    if o.alertSound then ns.PlaySoundKit("READY_CHECK", "RAID_WARNING", "TELL_MESSAGE") end
    if RaidNotice_AddMessage and RaidWarningFrame and ChatTypeInfo and ChatTypeInfo["RAID_WARNING"] then
        RaidNotice_AddMessage(RaidWarningFrame, "|cff33aaff[Babillard FR]|r " .. text, ChatTypeInfo["RAID_WARNING"])
    end
    ns.Print(text .. L[". Tape |cffffd100/bf|r pour voir."])
    if ns.FlashMinimap then ns.FlashMinimap() end
end

---------------------------------------------------------------------------
-- Retrait automatique
---------------------------------------------------------------------------
local function CheckAutoRemove()
    if not ns.my or not ns.db or not ns.db.opts.autoRemove then return end
    if ns.my.type == "LFM" and GetNumGroupMembers() >= (ns.my.size or 5) then
        ns.WithdrawListing(L["annonce retirée : ton groupe est complet!"])
    end
end

local function CheckEnteredInstance()
    if not ns.my or not ns.db or not ns.db.opts.autoRemove then return end
    local inInstance, instanceType = IsInInstance()
    if inInstance and (instanceType == "party" or instanceType == "raid" or instanceType == "pvp") then
        ns.WithdrawListing(L["annonce retirée : tu es entré dans une instance."])
    end
end

---------------------------------------------------------------------------
-- Rappel avant expiration
---------------------------------------------------------------------------
StaticPopupDialogs["BABILLARDFR_REMIND"] = {
    text = L["Ton annonce sur le Babillard expire dans 2 minutes.\n\nVeux-tu la republier?"],
    button1 = L["Republier"],
    button2 = L["Laisser expirer"],
    OnAccept = function() ns.Republish() end,
    timeout = 110,
    whileDead = true,
    hideOnEscape = true,
    preferredIndex = 3,
}

local function CheckReminder()
    if not ns.my or not ns.db or not ns.db.opts.remind or ns.my.reminded then return end
    if GetTime() - ns.my.time >= ns.EXPIRE - ns.REMIND_BEFORE then
        ns.my.reminded = true
        if not InCombatLockdown() then StaticPopup_Show("BABILLARDFR_REMIND") end
    end
end

---------------------------------------------------------------------------
-- Copier du texte (lien du site, code d'export) : WoW ne peut pas ouvrir
-- un navigateur ni écrire dans le presse-papiers, alors on sélectionne le
-- texte et le joueur fait Ctrl+C.
---------------------------------------------------------------------------
local copyValue = ""

local function GetPopupEditBox(popup)
    return (popup.GetEditBox and popup:GetEditBox()) or popup.editBox or popup.EditBox
end

StaticPopupDialogs["BABILLARDFR_COPY"] = {
    text = L["%s\n\nFais |cffffd100Ctrl+C|r pour copier."],
    button1 = CLOSE or L["Fermer"],
    hasEditBox = true,
    editBoxWidth = 320,
    maxLetters = 0,
    OnShow = function(self)
        local eb = GetPopupEditBox(self)
        if eb then
            eb:SetMaxLetters(0)
            eb:SetText(copyValue)
            eb:HighlightText()
            eb:SetFocus()
        end
    end,
    EditBoxOnTextChanged = function(self)
        if self:GetText() ~= copyValue then
            self:SetText(copyValue)
            self:HighlightText()
        end
    end,
    EditBoxOnEnterPressed = function(self) self:GetParent():Hide() end,
    EditBoxOnEscapePressed = function(self) self:GetParent():Hide() end,
    timeout = 0,
    whileDead = true,
    hideOnEscape = true,
    preferredIndex = 3,
}

function ns.ShowCopy(title, value)
    copyValue = value
    StaticPopup_Hide("BABILLARDFR_COPY")
    StaticPopup_Show("BABILLARDFR_COPY", title)
end

function ns.ShowSiteLink()
    ns.ShowCopy(L["Lien du site Babillard Forever :"], ns.SITE_URL)
end

---------------------------------------------------------------------------
-- Mon personnage + code d'export pour le site
---------------------------------------------------------------------------
function ns.GetProfessions()
    local out = {}
    if not GetProfessions or not GetProfessionInfo then return out end
    local ok, p1, p2, arch, fish, cook = pcall(GetProfessions)
    if not ok then return out end
    local list = { p1, p2, cook, fish, arch }
    for i = 1, 5 do
        local idx = list[i]
        if idx then
            local okInfo, name, _, rank, maxRank = pcall(GetProfessionInfo, idx)
            if okInfo and name then
                tinsert(out, { name = name, rank = rank or 0, max = maxRank or 0 })
            end
        end
    end
    return out
end

-- Métiers, deuxième méthode: les lignes de compétences (Classic). Les en-têtes « Métiers » et « Compétences
-- secondaires » (français ou anglais) précèdent les lignes qui nous intéressent.
function ns.GetSkillProfessions()
    local out = {}
    if not GetNumSkillLines or not GetSkillLineInfo then return out end
    if ExpandSkillHeader then pcall(ExpandSkillHeader, 0) end
    local okN, count = pcall(GetNumSkillLines)
    if not okN or type(count) ~= "number" then return out end
    local inside = false
    for i = 1, count do
        local ok, name, header, _, rank, _, _, maxRank = pcall(GetSkillLineInfo, i)
        if ok and type(name) == "string" then
            if header then
                local low = name:lower()
                inside = (low:find("profession", 1, true) or low:find("m.-tier") or low:find("secondary", 1, true)
                    or low:find("secondaire")) and true or false
            elseif inside and #out < 8 then
                tinsert(out, { name = name, rank = tonumber(rank) or 0, max = tonumber(maxRank) or 0 })
            end
        end
    end
    return out
end

-- Nom d'une icône du jeu: « Interface\\Icons\\INV_Helmet_01 » -> « inv_helmet_01 ». WoW Forever donne plutôt un numéro de
-- fichier (« 132345 »): on l'écrit « f132345 » et le site retrouve le nom de l'image avec une table. Vide si on ne
-- reconnaît rien: le site n'affiche alors pas d'image.
local function IconName(texture)
    if issecretvalue and issecretvalue(texture) then return "" end
    if type(texture) == "number" then
        if texture >= 1 and texture < 2147483648 and texture == math.floor(texture) then
            return "f" .. string.format("%d", texture)
        end
        return ""
    end
    if type(texture) ~= "string" then return "" end
    local name = (texture:match("([^\\/]+)$") or ""):gsub("%.%a+$", ""):lower()
    if name:match("^[%w_]+$") and #name <= 64 then return name end
    return ""
end
ns.IconName = IconName

-- Équipement porté: une entrée par pièce (chemise et tabard exclus).
local GEAR_SLOTS = { 1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18 }
local QUALITY_BY_COLOR = { ["9d9d9d"] = 0, ["ffffff"] = 1, ["1eff00"] = 2, ["0070dd"] = 3, ["a335ee"] = 4, ["ff8000"] = 5 }

function ns.GetEquipment()
    local out = {}
    if not GetInventoryItemLink then return out end
    local getInfo = (C_Item and C_Item.GetItemInfo) or GetItemInfo
    for _, slot in ipairs(GEAR_SLOTS) do
        local okL, link = pcall(GetInventoryItemLink, "player", slot)
        if okL and type(link) == "string" and not (issecretvalue and issecretvalue(link)) then
            local id = tonumber(link:match("item:(%d+)"))
            if id then
                local enchant = tonumber(link:match("item:%d+:(%d+)")) or 0
                local name, quality, ilvl, icon
                if getInfo then
                    local okI, n, _, q, il, _, _, _, _, _, tex = pcall(getInfo, link)
                    if okI then name, quality, ilvl, icon = n, q, il, tex end
                end
                if GetInventoryItemTexture then
                    local okT, tex = pcall(GetInventoryItemTexture, "player", slot)
                    if okT and tex then icon = tex end
                end
                -- Objet pas encore en mémoire: le nom et la couleur sont dans le lien lui-même.
                name = (type(name) == "string" and name) or link:match("|h%[(.-)%]|h") or "?"
                if type(quality) ~= "number" then
                    local color = link:match("|cff(%x%x%x%x%x%x)")
                    quality = (color and QUALITY_BY_COLOR[color:lower()]) or 1
                end
                tinsert(out, { slot = slot, id = id, name = name, ilvl = tonumber(ilvl) or 0, quality = quality, enchant = enchant,
                    icon = IconName(icon) })
            end
        end
    end
    return out
end

-- Talents: trois arbres, points dépensés dans chacun, et chaque talent avec au moins un rang. API de Classic si le jeu l'a,
-- sinon le système de traits (WoW Forever). Si rien ne répond, on rend une liste vide: rien n'est inventé.
local function Pack(f, ...)
    if type(f) ~= "function" then return {} end
    local res = { pcall(f, ...) }
    if not res[1] then return {} end
    table.remove(res, 1)
    return res
end

-- WoW Forever n'a pas GetTalentInfo: les talents passent par le système de traits (config « CamelotCombat », un arbre par
-- classe, trois onglets = trois « groupes »). On lit tous les nœuds de l'arbre pour placer chaque talent appris dans la
-- grille (rangée, colonne) à partir de ses coordonnées posX / posY, puis le nom et l'icône via le sort du talent.
-- Les colonnes ne sont données que si l'onglet en couvre bien quatre (sinon on ne sait pas laquelle est la première):
-- le talent reste alors sans colonne et le site l'affiche en liste plutôt que mal placé.
-- Les coordonnées de Forever ne sont pas parfaitement alignées: dans l'arbre d'Affliction, Vie volée améliorée est à Y=2120 et
-- Suppression à Y=2130 (même rangée, 10 d'écart), alors que deux rangées voisines sont à 600 l'une de l'autre. On regroupe donc
-- les valeurs proches (moins de 100 d'écart) en une seule ligne ou colonne, puis on mesure le pas réel entre groupes.
local PAS_GRILLE = 600       -- écart entre deux rangées / colonnes dans Forever (BaseRowHeight de l'interface officielle)
local TOLERANCE_GRILLE = 100 -- en dessous: même rangée / même colonne

local function GridIndex(values)
    local raw, seen = {}, {}
    for _, v in ipairs(values) do
        if not seen[v] then seen[v] = true; tinsert(raw, v) end
    end
    table.sort(raw)
    local list = {}  -- début de chaque groupe de valeurs proches
    for _, v in ipairs(raw) do
        if #list == 0 or v - list[#list] >= TOLERANCE_GRILLE then tinsert(list, v) end
    end
    local step
    for i = 2, #list do
        local d = list[i] - list[i - 1]
        if not step or d < step then step = d end
    end
    -- Un écart de plusieurs pas (rangée vide au milieu) ne doit pas être pris pour un pas unique.
    if step and step > PAS_GRILLE * 1.5 then step = step / math.floor(step / PAS_GRILLE + 0.5) end
    local function index(v)
        if not step then return 1 end
        return math.floor((v - list[1]) / step + 0.5) + 1
    end
    -- Deuxième valeur: l'index de la dernière valeur (le nombre de colonnes ou de rangées couvertes).
    return index, #raw > 0 and index(raw[#raw]) or 0
end

-- Les trois onglets sont côte à côte, 4000 d'écart l'un de l'autre, la première colonne du premier à X=1020. Quand un onglet
-- n'occupe pas ses quatre colonnes (Destruction n'en a que trois dans Forever), on retrouve la colonne depuis cette position.
-- Retourne nil si les coordonnées ne tombent pas sur cette grille (on préfère alors la liste à une case fausse).
local function ColonneAncree(tab, x)
    local off = (x - (1020 + 4000 * (tab - 1))) / PAS_GRILLE
    local n = math.floor(off + 0.5)
    if math.abs(off - n) > 0.3 then return nil end
    return n + 1
end

function ns.GetTalentsTraits(debug)
    local tabs, talents = {}, {}
    if type(C_ClassTalents) ~= "table" or type(C_Traits) ~= "table" then return tabs, talents end
    local configID = Pack(C_ClassTalents.GetActiveConfigID)[1]
    if type(configID) ~= "number" then return tabs, talents end
    local cfg = Pack(C_Traits.GetConfigInfo, configID)[1]
    local treeID = type(cfg) == "table" and type(cfg.treeIDs) == "table" and cfg.treeIDs[1]
    if type(treeID) ~= "number" then return tabs, talents end
    local groups = Pack(C_Traits.GetGroupDisplayInfoByTreeID, treeID)[1]
    if type(groups) ~= "table" or #groups == 0 then return tabs, talents end
    local sorted = {}
    for _, g in ipairs(groups) do
        if type(g) == "table" and g.groupID then tinsert(sorted, g) end
    end
    table.sort(sorted, function(a, b) return (a.orderIndex or 0) < (b.orderIndex or 0) end)
    local byGroup = {}
    for i = 1, math.min(#sorted, 3) do
        byGroup[sorted[i].groupID] = i
        tinsert(tabs, { name = type(sorted[i].displayName) == "string" and sorted[i].displayName or "?", points = 0,
            icon = IconName(sorted[i].icon) })
    end
    local nodeIDs = Pack(C_Traits.GetTreeNodes, treeID)[1]
    if type(nodeIDs) ~= "table" then return tabs, talents end

    -- La rangée d'un talent, c'est la « porte » qui le garde: les trois premières rangées demandent 0, 5, 10 points… dépensés
    -- dans l'arbre (condition `isGate`, `spentAmountRequired`). Le cadre de talents du jeu dessine ces nombres à gauche des
    -- rangées. C'est plus sûr que les coordonnées, dont on ne connaît pas l'échelle.
    local condCache = {}
    local function GateRequired(info)
        local best = 0
        if type(info.conditionIDs) == "table" then
            for _, cid in ipairs(info.conditionIDs) do
                if condCache[cid] == nil then
                    local cond = Pack(C_Traits.GetConditionInfo, configID, cid)[1]
                    condCache[cid] = (type(cond) == "table" and cond.isGate and tonumber(cond.spentAmountRequired)) or false
                end
                if condCache[cid] and condCache[cid] > best then best = condCache[cid] end
            end
        end
        return best
    end

    -- Passe 1: tous les nœuds de chaque onglet (pour connaître l'écart entre deux rangées / colonnes).
    local nodes, xs, ys = {}, {}, {}
    for i = 1, #tabs do nodes[i], xs[i], ys[i] = {}, {}, {} end
    for _, id in ipairs(nodeIDs) do
        local info = Pack(C_Traits.GetNodeInfo, configID, id)[1]
        if type(info) == "table" and type(info.groupIDs) == "table" then
            local tab
            for _, gid in ipairs(info.groupIDs) do
                if byGroup[gid] then tab = byGroup[gid]; break end
            end
            if tab and tonumber(info.posX) and tonumber(info.posY) then
                tinsert(nodes[tab], { id = id, info = info, x = info.posX, y = info.posY, gate = GateRequired(info) })
                tinsert(xs[tab], info.posX)
                tinsert(ys[tab], info.posY)
            end
        end
    end

    -- Passe 2: les talents appris.
    for tab = 1, #tabs do
        local col, colSpan = GridIndex(xs[tab])
        local rowByY = GridIndex(ys[tab])
        local gateValues = {}
        for _, nd in ipairs(nodes[tab]) do tinsert(gateValues, nd.gate) end
        -- Colonne: par l'index dans l'onglet quand il couvre quatre colonnes, sinon par la position ancrée (tout ou rien).
        local colOf = function(x) return col(x) end
        if colSpan ~= 4 then
            local ok = #nodes[tab] > 0
            for _, nd in ipairs(nodes[tab]) do
                local c = ColonneAncree(tab, nd.x)
                if not c or c < 1 or c > 4 then ok = false; break end
            end
            colOf = ok and function(x) return ColonneAncree(tab, x) end or function() return nil end
        end
        if debug then
            local gv, seenG = {}, {}
            for _, g in ipairs(gateValues) do if not seenG[g] then seenG[g] = true; tinsert(gv, g) end end
            table.sort(gv)
            debug[tab] = { nodes = #nodes[tab], xs = xs[tab], ys = ys[tab], colSpan = colSpan, gates = gv, byGate = false }
        end
        table.sort(nodes[tab], function(a, b) if a.y ~= b.y then return a.y < b.y end return a.x < b.x end)
        for _, nd in ipairs(nodes[tab]) do
            local info = nd.info
            local rank = tonumber(info.currentRank) or tonumber(info.ranksPurchased) or 0
            local entryID = (type(info.activeEntry) == "table" and info.activeEntry.entryID)
                or (type(info.entryIDs) == "table" and info.entryIDs[1])
            local entry = entryID and Pack(C_Traits.GetEntryInfo, configID, entryID)[1]
            local def = type(entry) == "table" and entry.definitionID and Pack(C_Traits.GetDefinitionInfo, entry.definitionID)[1]
            local name, icon
            if type(def) == "table" then
                name, icon = def.overrideName, def.overrideIcon
                local spellID = def.spellID
                if spellID and type(C_Spell) == "table" then
                    local si = Pack(C_Spell.GetSpellInfo, spellID)[1]
                    if type(si) == "table" then name = name or si.name; icon = icon or si.iconID or si.originalIconID end
                end
                if not name and spellID then name = Pack(GetSpellInfo, spellID)[1] end
            end
            local hasName = type(name) == "string" and name ~= ""
            -- Un nœud sans nom et sans point n'est pas un talent à montrer (case de passage, porte…).
            if rank > 0 or hasName then
                tabs[tab].points = tabs[tab].points + rank
                local r, c = rowByY(nd.y), colOf(nd.x)
                tinsert(talents, { tab = tab, x = nd.x, y = nd.y, gate = nd.gate, id = nd.id, name = hasName and name or "Talent", rank = rank,
                    max = tonumber(info.maxRanks) or 0, icon = IconName(icon),
                    tier = (r >= 1 and r <= 9) and r or nil, col = (c and c >= 1 and c <= 4) and c or nil })
            end
        end
    end
    -- Le code doit rester court (la base garde 70 talents au plus): trop de talents -> seulement ceux qui ont des points.
    if #talents > 70 then
        local learned = {}
        for _, t in ipairs(talents) do if t.rank > 0 then tinsert(learned, t) end end
        talents = learned
    end
    return tabs, talents
end

function ns.GetTalents()
    local tabs, talents = {}, {}
    local n = Pack(GetNumTalentTabs)[1]
    if type(n) ~= "number" or n < 1 then return ns.GetTalentsTraits() end
    for tab = 1, math.min(n, 3) do
        local r = Pack(GetTalentTabInfo, tab)
        local name, points
        if type(r[1]) == "string" then name, points = r[1], r[3] else name, points = r[2], r[5] end
        tinsert(tabs, { name = type(name) == "string" and name or "?", points = tonumber(points) or 0,
            icon = type(r[1]) == "string" and IconName(r[2]) or "" })
        local count = Pack(GetNumTalents, tab)[1]
        if type(count) == "number" then
            for i = 1, math.min(count, 40) do
                local t = Pack(GetTalentInfo, tab, i)
                local rank = tonumber(t[5]) or 0
                if type(t[1]) == "string" and rank > 0 then
                    tinsert(talents, { tab = tab, name = t[1], rank = rank, max = tonumber(t[6]) or 0, icon = IconName(t[2]),
                        tier = tonumber(t[3]), col = tonumber(t[4]) })
                end
            end
        end
    end
    return tabs, talents
end

-- Diagnostic (/bf diag): ce que le jeu met à la disposition de l'addon pour les talents et l'équipement, sur une ligne à
-- copier. Sert à corriger la lecture quand le jeu change; ne contient rien de personnel (pas de nom de personnage).
function ns.Diagnostic()
    local out = {}
    local function add(k, v) tinsert(out, k .. "=" .. tostring(v)) end
    local function kind(v) if v == nil then return "absent" end return type(v) end
    local function member(tbl, name) if type(tbl) ~= "table" then return "absent" end return kind(tbl[name]) end
    local b = Pack(GetBuildInfo)
    add("jeu", tostring(b[1]) .. "/" .. tostring(b[4]))
    add("addon", ns.VERSION)
    add("canal", ns.ChannelIndex() and ("rejoint n° " .. ns.ChannelIndex()) or "pas rejoint")
    add("GetNumTalentTabs", kind(GetNumTalentTabs))
    add("GetTalentInfo", kind(GetTalentInfo))
    add("C_Traits", kind(C_Traits))
    add("C_ClassTalents", kind(C_ClassTalents))
    add("C_Spell", kind(C_Spell))
    for _, f in ipairs({ "GetConfigInfo", "GetTreeNodes", "GetNodeInfo", "GetEntryInfo", "GetDefinitionInfo", "GetGroupDisplayInfoByTreeID" }) do
        add("Traits." .. f, member(C_Traits, f))
    end
    local configID = type(C_ClassTalents) == "table" and Pack(C_ClassTalents.GetActiveConfigID)[1] or nil
    add("configID", configID)
    local cfg = type(C_Traits) == "table" and type(configID) == "number" and Pack(C_Traits.GetConfigInfo, configID)[1] or nil
    local treeID = type(cfg) == "table" and type(cfg.treeIDs) == "table" and cfg.treeIDs[1] or nil
    add("treeID", treeID)
    local groups = treeID and Pack(C_Traits.GetGroupDisplayInfoByTreeID, treeID)[1] or nil
    add("onglets", type(groups) == "table" and #groups or "?")
    if type(groups) == "table" and type(groups[1]) == "table" then
        add("onglet1", tostring(groups[1].displayName) .. "/icône " .. kind(groups[1].icon))
    end
    local nodeIDs = treeID and Pack(C_Traits.GetTreeNodes, treeID)[1] or nil
    add("nœuds", type(nodeIDs) == "table" and #nodeIDs or "?")
    if type(nodeIDs) == "table" and nodeIDs[1] then
        local info = Pack(C_Traits.GetNodeInfo, configID, nodeIDs[1])[1]
        if type(info) == "table" then
            local keys = {}
            for k in pairs(info) do tinsert(keys, tostring(k)) end
            table.sort(keys)
            add("champs d'un nœud", table.concat(keys, ","))
            add("posX/posY du 1er", tostring(info.posX) .. "/" .. tostring(info.posY))
        end
    end
    local dbg = {}
    local okT, tabsT, talentsT = pcall(ns.GetTalentsTraits, dbg)
    if okT then
        for i, d in ipairs(dbg) do
            local function uniq(list)
                local seen, u = {}, {}
                for _, v in ipairs(list) do if not seen[v] then seen[v] = true; tinsert(u, v) end end
                table.sort(u)
                while #u > 14 do table.remove(u) end
                return table.concat(u, ",")
            end
            add("onglet" .. i .. " nœuds/colonnes", d.nodes .. "/" .. tostring(d.colSpan))
            add("onglet" .. i .. " X", uniq(d.xs))
            add("onglet" .. i .. " Y", uniq(d.ys))
            add("onglet" .. i .. " portes", (#d.gates > 0 and table.concat(d.gates, ",") or "aucune") .. " (info seulement)")
        end
        local learned = {}
        for _, t in ipairs(talentsT) do
            tinsert(learned, tostring(t.name):sub(1, 18) .. "#" .. tostring(t.id) .. "@" .. tostring(t.x) .. "," .. tostring(t.y) ..
                " r" .. t.rank .. "/" .. t.max .. " porte" .. tostring(t.gate) .. " i" .. tostring(t.icon))
            if #learned >= 8 then break end
        end
        add("appris", table.concat(learned, "; "))
    end
    local ok, tabs, talents = pcall(ns.GetTalents)
    if ok then
        local placed = 0
        for _, t in ipairs(talents) do if t.tier and t.col then placed = placed + 1 end end
        local learnedCount = 0
        for _, t in ipairs(talents) do if t.rank > 0 then learnedCount = learnedCount + 1 end end
        add("lecture", #tabs .. " arbres, " .. #talents .. " talents dont " .. learnedCount .. " appris, " .. placed .. " placés")
        local pts = {}
        for _, t in ipairs(tabs) do tinsert(pts, t.points) end
        add("points", table.concat(pts, "/"))
        if talents[1] then
            add("1er talent", tostring(talents[1].name) .. " rang " .. talents[1].rank .. "/" .. talents[1].max ..
                " case " .. tostring(talents[1].tier) .. "," .. tostring(talents[1].col) .. " icône " .. tostring(talents[1].icon))
        end
    else
        add("lecture", "ERREUR " .. tostring(tabs))
    end
    add("GetInventoryItemTexture", kind(GetInventoryItemTexture))
    local tex = Pack(GetInventoryItemTexture or function() end, "player", 1)[1]
    add("texture de la tête", kind(tex) .. ":" .. tostring(tex))
    add("C_Item.GetItemInfo", member(C_Item, "GetItemInfo"))
    local okE, eq = pcall(ns.GetEquipment)
    if okE then
        local withIcon = 0
        for _, g in ipairs(eq) do if g.icon ~= "" then withIcon = withIcon + 1 end end
        add("équipement", #eq .. " pièces, " .. withIcon .. " icônes")
    else
        add("équipement", "ERREUR " .. tostring(eq))
    end
    return table.concat(out, " | ")
end

-- Spécialisation = l'arbre où il y a le plus de points (nil s'il n'y en a aucun).
function ns.MainTalentTab(tabs)
    local best, bestPoints = nil, 0
    for i, t in ipairs(tabs or {}) do
        if t.points > bestPoints then best, bestPoints = i, t.points end
    end
    return best
end

function ns.GetItemLevel()
    if not GetAverageItemLevel then return nil end
    local ok, overall, equipped = pcall(GetAverageItemLevel)
    if ok and (equipped or overall) then return math.floor(equipped or overall) end
end

function ns.GetCharacterInfo()
    local tabs, talents = ns.GetTalents()
    -- UnitName donne « Prénom Nom »; UnitFullName mettrait le nom de famille à la place du royaume.
    local name, realm = ns.MyFullName(), GetNormalizedRealmName and GetNormalizedRealmName()
    local className, classFile = UnitClass("player")
    local race, raceFile = UnitRace("player")
    local sex = UnitSex and UnitSex("player")
    return {
        name = name or "?",
        realm = (realm and realm ~= "") and realm or (GetNormalizedRealmName() or ""),
        region = (GetCurrentRegionName and GetCurrentRegionName()) or "",
        faction = ns.MyFaction(),
        className = className or "",
        classFile = classFile or "",
        race = race or "",
        raceFile = type(raceFile) == "string" and raceFile or "",
        sex = (sex == 2 or sex == 3) and sex or 0,
        level = ns.MyLevel(),
        guild = GetGuildInfo("player") or "",
        ilvl = ns.GetItemLevel(),
        professions = (function()
            local p = ns.GetProfessions()
            return #p > 0 and p or ns.GetSkillProfessions()
        end)(),
        equipment = ns.GetEquipment(),
        talentTabs = tabs,
        talents = talents,
    }
end

-- Format : BFFR1;cle=valeur;cle=valeur...
--   p  = métiers   nom:rang:max,...
--   tr = arbres de talents, dans l'ordre du jeu   nom:points,...
--   ta = talents   nom:rang:arbre(1-3),...   (rang 0 = pas appris: seulement avec sa place dans tp)
--   eq = équipement   emplacement:objet:niveau d'objet:qualité:enchantement:nom,...
--   ic = icônes de l'équipement   emplacement:icône,...    tri / ti = icônes des arbres / des talents (même ordre)
--   tp = place de chaque talent appris dans son arbre (même ordre que ta): trois chiffres rangée-colonne-rangs max
--        (« 135 » = rangée 1, colonne 3, 5 rangs au plus), vide si le jeu ne la donne pas
function ns.BuildExportCode()
    local c = ns.GetCharacterInfo()
    local function F(v) return ((tostring(v or "")):gsub("[|;=,:]", " ")) end
    local profs = {}
    for _, p in ipairs(c.professions) do
        tinsert(profs, F(p.name) .. ":" .. p.rank .. ":" .. p.max)
    end
    local trees, talentParts, gear = {}, {}, {}
    for _, t in ipairs(c.talentTabs) do tinsert(trees, F(t.name) .. ":" .. t.points) end
    -- Tous les talents de l'arbre sont envoyés (ceux sans point en gris sur le site), mais un talent sans point n'est utile
    -- que s'il a sa place dans la grille: sans place on ne garde que ceux qui ont des points.
    local sent = {}
    for _, t in ipairs(c.talents) do
        if t.rank > 0 or (t.tier and t.col and t.max and t.max >= 1) then tinsert(sent, t) end
    end
    c.talents = sent
    for _, t in ipairs(c.talents) do tinsert(talentParts, F(t.name) .. ":" .. t.rank .. ":" .. t.tab) end
    for _, g in ipairs(c.equipment) do
        tinsert(gear, g.slot .. ":" .. g.id .. ":" .. g.ilvl .. ":" .. g.quality .. ":" .. g.enchant .. ":" .. F(g.name))
    end
    -- Icônes: listes parallèles (une icône par arbre, par talent), ou « emplacement:icône » pour l'équipement.
    -- Un champ n'est écrit que s'il y a au moins une icône (le code reste court).
    local treeIcons, talentIcons, gearIcons, anyTree, anyTalent = {}, {}, {}, false, false
    for _, t in ipairs(c.talentTabs) do
        tinsert(treeIcons, t.icon or "")
        if (t.icon or "") ~= "" then anyTree = true end
    end
    for _, t in ipairs(c.talents) do
        tinsert(talentIcons, t.icon or "")
        if (t.icon or "") ~= "" then anyTalent = true end
    end
    for _, g in ipairs(c.equipment) do
        if (g.icon or "") ~= "" then tinsert(gearIcons, g.slot .. ":" .. g.icon) end
    end
    -- Place dans la grille de l'arbre (rangée 1-9, colonne 1-4, rangs max 1-5), pour dessiner l'arbre comme en jeu.
    local talentPos, anyPos = {}, false
    for _, t in ipairs(c.talents) do
        local code = ""
        local r, k, m = t.tier, t.col, t.max
        if r and k and m and r >= 1 and r <= 9 and k >= 1 and k <= 4 and m >= 1 and m <= 5 then
            code = string.format("%d%d%d", math.floor(r), math.floor(k), math.floor(m))
            anyPos = true
        end
        tinsert(talentPos, code)
    end
    local parts = {
        "BFFR1",
        "n=" .. F(c.name),
        "r=" .. F(c.realm),
        "rg=" .. F(c.region),
        "f=" .. F(c.faction),
        "c=" .. F(c.classFile),
        "ra=" .. F(c.race),
        "rk=" .. F(c.raceFile),
        "sx=" .. ((c.sex == 2 or c.sex == 3) and c.sex or ""),
        "lv=" .. c.level,
        "g=" .. F(c.guild),
        "il=" .. (c.ilvl or ""),
        "ro=" .. ns.EncodeRoles(ns.db.myRoles),
        "rs=" .. F(ns.MyRuleset() or ""),
        "p=" .. table.concat(profs, ","),
        "tr=" .. table.concat(trees, ","),
        "ta=" .. table.concat(talentParts, ","),
        "eq=" .. table.concat(gear, ","),
        "ic=" .. table.concat(gearIcons, ","),
        "tri=" .. (anyTree and table.concat(treeIcons, ",") or ""),
        "ti=" .. (anyTalent and table.concat(talentIcons, ",") or ""),
        "tp=" .. (anyPos and table.concat(talentPos, ",") or ""),
        "t=" .. time(),
    }
    return table.concat(parts, ";")
end

---------------------------------------------------------------------------
-- [FR] dans l'info-bulle des joueurs qui ont l'addon
---------------------------------------------------------------------------
function ns.MarkKnown(name)
    if ns.db and name then ns.db.known[name] = time() end
end

local function AddFlagToTooltip(tt)
    if tt ~= GameTooltip or not ns.db or not ns.db.opts.tooltipFlag then return end
    if InCombatLockdown() then return end
    pcall(function()
        local _, unit = tt:GetUnit()
        if not unit or not UnitIsPlayer(unit) then return end
        local name, realm = UnitName(unit)
        if issecretvalue and (issecretvalue(name) or issecretvalue(realm)) then return end
        if not name then return end
        -- La deuxième valeur peut être un royaume ou, dans Forever, le nom de famille: on essaie les deux formes.
        local known = ns.db.known
        local me = ns.BareName(ns.MyFullName())
        local found = known[ns.NormalizeName(name)] or ns.BareName(name) == me
        if not found and type(realm) == "string" and realm ~= "" then
            found = known[ns.NormalizeName(name .. " " .. realm)] or known[ns.NormalizeName(name .. "-" .. realm:gsub("[%s%-]", ""))]
                or ns.BareName(name .. " " .. realm) == me
        end
        if found then
            tt:AddLine("|cff33aaff[FR]|r |cffaaaaaaBabillard Forever FR|r")
        else
            local fr = ns.db.francos
            local franco = fr[ns.NormalizeName(name)]
            if not franco and type(realm) == "string" and realm ~= "" then franco = fr[ns.NormalizeName(name .. " " .. realm)] end
            if franco then
                tt:AddLine("|cff33aaff[FR]|r |cffaaaaaa" .. L["Francophone"] .. "|r")
            elseif ns.db.opts.spotGuilds then
                local guild = GetGuildInfo(unit)
                if guild and not (issecretvalue and issecretvalue(guild)) and ns.IsFrenchGuild(guild) then
                    tt:AddLine("|cffc28cff[FR]|r |cffaaaaaa" .. L["Guilde francophone"] .. "|r")
                end
            end
        end
    end)
end

if TooltipDataProcessor and TooltipDataProcessor.AddTooltipPostCall and Enum and Enum.TooltipDataType then
    TooltipDataProcessor.AddTooltipPostCall(Enum.TooltipDataType.Unit, AddFlagToTooltip)
else
    GameTooltip:HookScript("OnTooltipSetUnit", AddFlagToTooltip)
end

---------------------------------------------------------------------------
-- Qui est en ligne
-- Sur mon serveur: chaque addon dit « je suis là » à la connexion (H2) puis toutes les 5 minutes (H3), et répond au
-- « je suis là » des nouveaux venus. Sur les autres serveurs: les membres en ligne de la communauté, que le jeu connaît.
---------------------------------------------------------------------------
ns.ONLINE_TIMEOUT = 12 * 60   -- sans nouvelles depuis 12 min = parti
local lastPresenceReply = -1000

function ns.SendPresence(cmd)
    local _, class = UnitClass("player")
    ns.Send((cmd or "H3") .. ";" .. ns.MyLevel() .. ";" .. (class or "") .. ";" .. ns.VERSION)
end

function ns.SeenOnline(sender, level, class, version)
    if not ns.online[sender] then ns.onlineDirty = true end
    local o = ns.online[sender] or { name = sender }
    o.seen = GetTime()
    level = tonumber(level)
    if level and level > 0 then o.level = level end
    if type(class) == "string" and class ~= "" then o.class = class end
    if type(version) == "string" and version ~= "" then o.version = version end
    ns.online[sender] = o
end

-- Un nouveau venu dit bonjour: on répond une fois (au hasard dans les secondes qui suivent, pour ne pas que tout
-- le monde réponde en même temps), au plus une fois par 30 secondes même si plusieurs arrivent ensemble.
-- Avec beaucoup de monde, seule une partie répond (environ 25 réponses par arrivée): le nouveau venu voit les autres
-- à leur prochain signal régulier (5 minutes au plus). Ça évite des centaines de messages à chaque connexion.
local REPLY_TARGET = 25
local function ReplyPresence()
    if GetTime() - lastPresenceReply < 30 then return end
    local n = 0
    for _ in pairs(ns.online) do n = n + 1 end
    if n > REPLY_TARGET and math.random() > REPLY_TARGET / n then return end
    lastPresenceReply = GetTime()
    C_Timer.After(0.5 + math.random() * 6, function() ns.SendPresence("H3") end)
end

function ns.PruneOnline()
    local limit = GetTime() - ns.ONLINE_TIMEOUT
    for k, o in pairs(ns.online) do
        if o.seen < limit then ns.online[k] = nil; ns.onlineDirty = true end
    end
end

local CLASS_FILES = {}
local function ClassFile(classID)
    if not classID then return "" end
    if CLASS_FILES[classID] == nil then
        local file
        if C_CreatureInfo and C_CreatureInfo.GetClassInfo then
            local ok, info = pcall(C_CreatureInfo.GetClassInfo, classID)
            if ok and type(info) == "table" then file = info.classFile end
        end
        if not file and GetClassInfo then
            local ok, _, f = pcall(GetClassInfo, classID)
            if ok then file = f end
        end
        CLASS_FILES[classID] = file or ""
    end
    return CLASS_FILES[classID]
end

-- Demande au jeu de tenir à jour qui est en ligne dans la communauté (à l'ouverture de l'onglet En ligne).
function ns.FocusCommunity()
    local clubId = ns.CommunityId()
    if clubId and C_Club and C_Club.FocusMembers then pcall(C_Club.FocusMembers, clubId) end
end

-- Membres de la communauté en jeu en ce moment (pas ceux sur l'application mobile). Gardé 15 secondes: une grande
-- communauté peut avoir des centaines de membres, inutile de tout relire à chaque rafraîchissement.
local commuCache, commuCacheTime = nil, -1000

-- Oublie les recherches gardées en mémoire (on vient de rejoindre ou de quitter une communauté).
function ns.ResetCommunityCache()
    commuCacheTime = -1000
    ns.onlineDirty = true
    if ns.ResetCommunitySearch then ns.ResetCommunitySearch() end
end

function ns.CommunityOnline()
    if commuCache and GetTime() - commuCacheTime < 15 then return commuCache end
    local out = {}
    commuCache, commuCacheTime = out, GetTime()
    local clubId = ns.CommunityId()
    if not clubId or not C_Club or not C_Club.GetClubMembers then return out end
    local ok, ids = pcall(C_Club.GetClubMembers, clubId)
    if not ok or type(ids) ~= "table" then return out end
    local P = Enum and Enum.ClubMemberPresence
    for _, id in ipairs(ids) do
        local ok2, m = pcall(C_Club.GetMemberInfo, clubId, id)
        if ok2 and type(m) == "table" and not m.isSelf and type(m.name) == "string" then
            local p = m.presence
            local inGame = P and (p == P.Online or p == P.Away or p == P.Busy) or (not P and p ~= 3 and p ~= 2)
            if inGame then
                tinsert(out, { name = ns.CleanName(m.name), level = m.level, class = ClassFile(m.classID), away = P and p == P.Away })
            end
        end
    end
    return out
end

---------------------------------------------------------------------------
-- Francophones repérés dans le chat public (même sans l'addon)
---------------------------------------------------------------------------
ns.francoSeen = {}            -- [nom] = GetTime() du dernier message vu (pour « En ligne »)
ns.SPOT_ONLINE = 20 * 60      -- vu parler dans les 20 dernières minutes = en ligne
local lastSpotText, lastSpotSender, lastSpotResult

-- Appelé pour chaque message public (et par le filtre du chat). Rapide: un francophone déjà connu n'est pas réanalysé,
-- et le même message vu par plusieurs fenêtres de chat n'est analysé qu'une fois.
function ns.SpotFrench(text, sender)
    local db = ns.db
    if not db or not db.opts.spotFrench then return false end
    if issecretvalue and (issecretvalue(text) or issecretvalue(sender)) then return false end
    if type(text) ~= "string" or type(sender) ~= "string" or sender == "" then return false end
    if text == lastSpotText and sender == lastSpotSender then return lastSpotResult end
    lastSpotText, lastSpotSender = text, sender
    local name = ns.NormalizeName(sender)
    if not name or ns.IsMe(name) then lastSpotResult = false return false end
    local now = GetTime()
    if db.francos[name] or db.known[name] then
        if not ns.francoSeen[name] then ns.onlineDirty = true end
        ns.francoSeen[name] = now
        lastSpotResult = true
        return true
    end
    lastSpotResult = ns.LooksFrench(text)
    if lastSpotResult then
        db.francos[name] = time()
        ns.francoSeen[name] = now
        ns.onlineDirty = true
        ns.RefreshSoon()
    end
    return lastSpotResult
end

function ns.IsFrancophone(name)
    name = ns.NormalizeName(name)
    return name and ns.db and (ns.db.known[name] or ns.db.francos[name]) and true or false
end

-- [FR] devant les messages des francophones (affichage seulement: le message lui-même ne change pas)
local FR_TAG = "|cff33aaff[FR]|r "
local function FrTagFilter(_, _, msg, sender, ...)
    if not ns.db or not ns.db.opts.frTag then return false end
    if issecretvalue and (issecretvalue(msg) or issecretvalue(sender)) then return false end
    if type(msg) ~= "string" or type(sender) ~= "string" then return false end
    ns.SpotFrench(msg, sender)
    local name = ns.NormalizeName(sender)
    if name and not ns.IsMe(name) and (ns.db.known[name] or ns.db.francos[name]) then
        return false, FR_TAG .. msg, sender, ...
    end
    return false
end
if ChatFrame_AddMessageEventFilter then
    for _, e in ipairs({ "CHAT_MSG_CHANNEL", "CHAT_MSG_SAY", "CHAT_MSG_YELL" }) do
        pcall(ChatFrame_AddMessageEventFilter, e, FrTagFilter)
    end
end

-- Message pour faire connaître la communauté et l'addon à un francophone repéré (écrit dans la boîte de chuchotement,
-- envoyé seulement si le joueur appuie sur Entrée).
function ns.RecruitText()
    local code = ns.CommunityInvite()
    local text = L["Salut! On regroupe les francophones de Forever : l'addon Babillard Forever FR (CurseForge)"]
    if code then
        text = text .. L[" et la communauté en jeu : "] .. "https://www.worldofwarcraft.com/invite/" .. code
            .. "?region=" .. ns.MyRegion() .. "&faction=" .. ns.MyFaction()
    end
    return ns.CutUtf8(text .. L[". Au plaisir!"], 250)
end

---------------------------------------------------------------------------
-- Guildes francophones: le nom de guilde des joueurs croisés (survol, cible, plaques de nom, groupe, /qui)
-- Une guilde est francophone si son nom l'est (ns.LooksFrenchGuild), si elle est annoncée par l'addon, ou si deux
-- francophones confirmés (addon ou français dans le chat) en font partie.
---------------------------------------------------------------------------
ns.guildSeen = {}         -- [nom] = { t = GetTime(), guild = "Les Fous du Roi" }: membres croisés (pour « En ligne »)
local guildVerdict = {}   -- [guilde] = true/false: chaque nom de guilde n'est analysé qu'une fois par session
local guildFrancos = {}   -- [guilde] = { [nom] = true }: francophones confirmés vus dans cette guilde

-- Note une guilde francophone (db.frGuilds[guilde] = { t = date, who = dernier membre croisé, faction = ... }).
local function RememberGuild(guild, who, faction)
    local e = ns.db.frGuilds[guild]
    if type(e) ~= "table" then
        e = {}
        ns.db.frGuilds[guild] = e
    end
    e.t = time()
    if who then e.who = who end
    if faction and faction ~= "" then e.faction = faction end
    return e
end

function ns.IsFrenchGuild(guild)
    if type(guild) ~= "string" or guild == "" or not ns.db then return false end
    if ns.db.frGuilds[guild] then return true end
    local v = guildVerdict[guild]
    if v == nil then
        v = ns.LooksFrenchGuild(guild) and true or false
        guildVerdict[guild] = v
    end
    if v then RememberGuild(guild) end
    return v
end

-- Une guilde annoncée par l'addon est francophone par définition.
function ns.RememberAnnouncedGuild(guild, who, faction)
    if ns.db and type(guild) == "string" and guild ~= "" then RememberGuild(guild, who, faction) end
end

-- Nom complet d'une unité. Forever peut renvoyer le nom de famille comme deuxième valeur (voir ns.MyFullName).
local function UnitNameFr(unit)
    local n, r = UnitName(unit)
    if issecretvalue and (issecretvalue(n) or issecretvalue(r)) then return nil end
    if type(n) ~= "string" or n == "" or n == UNKNOWNOBJECT then return nil end
    if type(r) == "string" and r ~= "" and not n:find(" ", 1, true) then n = n .. " " .. r end
    return ns.NormalizeName(n)
end

-- Un joueur croisé fait partie d'une guilde: s'il est de ma faction et que la guilde est francophone, il compte.
local function SeenInGuild(name, guild, faction)
    if not name or type(guild) ~= "string" or guild == "" or ns.IsMe(name) then return end
    if issecretvalue and issecretvalue(guild) then return end
    local db = ns.db
    if not db.frGuilds[guild] and (db.known[name] or db.francos[name]) then
        local set = guildFrancos[guild] or {}
        guildFrancos[guild] = set
        set[name] = true
        local n = 0
        for _ in pairs(set) do n = n + 1 end
        if n >= 2 then RememberGuild(guild, name, faction) end
    end
    if not ns.IsFrenchGuild(guild) then return end
    local mine = not faction or faction == "" or faction == ns.MyFaction()
    RememberGuild(guild, mine and name or nil, faction)
    if mine then
        if not ns.guildSeen[name] then ns.onlineDirty = true end
        ns.guildSeen[name] = { t = GetTime(), guild = guild }
    end
end

function ns.CheckUnitGuild(unit)
    if not ns.db or not ns.db.opts.spotGuilds then return end
    local ok, isPlayer = pcall(UnitIsPlayer, unit)
    if not ok or not isPlayer or UnitIsUnit(unit, "player") then return end
    local guild = GetGuildInfo(unit)
    if not guild then return end
    local faction = UnitFactionGroup(unit)
    if issecretvalue and issecretvalue(faction) then faction = nil end
    SeenInGuild(UnitNameFr(unit), guild, faction)
end

-- Membres de mon groupe ou de mon raid
function ns.ScanGroupGuilds()
    if not ns.db or not ns.db.opts.spotGuilds or not IsInGroup() then return end
    local raid = IsInRaid()
    for i = 1, GetNumGroupMembers() do
        ns.CheckUnitGuild(raid and ("raid" .. i) or ("party" .. i))
    end
end

-- Résultats de /qui (ma faction seulement, comme le jeu)
function ns.ScanWho()
    if not ns.db or not ns.db.opts.spotGuilds then return end
    if not C_FriendList or not C_FriendList.GetNumWhoResults or not C_FriendList.GetWhoInfo then return end
    local ok, n = pcall(C_FriendList.GetNumWhoResults)
    if not ok or type(n) ~= "number" then return end
    for i = 1, math.min(n, 50) do
        local ok2, info = pcall(C_FriendList.GetWhoInfo, i)
        if ok2 and type(info) == "table" then
            SeenInGuild(ns.NormalizeName(info.fullName), info.fullGuildName, ns.MyFaction())
        end
    end
    ns.RefreshSoon()
end

-- Guildes francophones connues, pour l'onglet Guildes: { guild, who, faction, t } triées des plus récentes aux plus vieilles
function ns.KnownFrenchGuilds()
    local out = {}
    for guild, e in pairs(ns.db.frGuilds) do
        if type(e) == "table" then tinsert(out, { guild = guild, who = e.who, faction = e.faction, t = e.t or 0 }) end
    end
    table.sort(out, function(a, b) return a.t > b.t end)
    return out
end

-- Liste combinée, sans doublons: { sender, level, class, version, here (mon serveur), commu (communauté) }
local onlineCache, onlineCacheTime = nil, -1000
function ns.OnlineList()
    if onlineCache and not ns.onlineDirty and GetTime() - onlineCacheTime < 1 then return onlineCache end
    ns.onlineDirty = false
    ns.PruneOnline()
    local byName, list = {}, {}
    local function Get(name)
        local key = ns.BareName(name)
        local e = byName[key]
        if not e then
            e = { sender = name, level = 0, class = "" }
            byName[key] = e
            tinsert(list, e)
        end
        return e
    end
    for name, o in pairs(ns.online) do
        if not ns.IsIgnored(name) then
            local e = Get(name)
            e.here, e.version = true, o.version
            e.level = o.level or e.level
            e.class = o.class or e.class
        end
    end
    for _, m in ipairs(ns.CommunityOnline()) do
        if not ns.IsIgnored(m.name) then
            local e = Get(m.name)
            e.commu, e.away = true, m.away
            if (e.level or 0) == 0 and m.level then e.level = m.level end
            if e.class == "" and m.class then e.class = m.class end
        end
    end
    local limit = GetTime() - ns.SPOT_ONLINE
    for name, t in pairs(ns.francoSeen) do
        if t < limit then
            ns.francoSeen[name] = nil
        elseif not ns.IsIgnored(name) then
            Get(name).spotted = true
        end
    end
    for name, g in pairs(ns.guildSeen) do
        if g.t < limit then
            ns.guildSeen[name] = nil
        elseif not ns.IsIgnored(name) then
            Get(name).guildFr = g.guild
        end
    end
    -- Avec l'addon d'abord, puis la communauté, puis les repérés; par nom dans chaque groupe
    local function Rank(e) return e.here and 1 or (e.commu and 2 or (e.spotted and 3 or 4)) end
    table.sort(list, function(x, y)
        local rx, ry = Rank(x), Rank(y)
        if rx ~= ry then return rx < ry end
        return ns.BareName(x.sender) < ns.BareName(y.sender)
    end)
    onlineCache, onlineCacheTime = list, GetTime()
    return list
end

---------------------------------------------------------------------------
-- Réception des messages
---------------------------------------------------------------------------
local function ClampAge(age, max)
    age = tonumber(age) or 0
    if age < 0 then age = 0 end
    if age > max then age = max end
    return age
end

local function OnMessage(msg, sender)
    if issecretvalue and (issecretvalue(msg) or issecretvalue(sender)) then return end
    sender = ns.NormalizeName(sender)
    if not sender then return end
    -- Mes propres messages reviennent par le canal: mon annonce est déjà dans la liste, on les ignore.
    if ns.IsMe(sender) then return end
    if ns.IsIgnored(sender) then return end
    msg = msg:gsub("|", "")
    local f = { strsplit(";", msg) }
    local cmd = f[1]
    ns.MarkKnown(sender)
    if cmd == "H2" or cmd == "H3" then
        ns.SeenOnline(sender, f[2], f[3], f[4])
        if cmd == "H2" then ReplyPresence() end
    elseif cmd == "L2" then
        ns.SeenOnline(sender, f[7], f[6], f[14])
    elseif cmd == "G2" then
        ns.SeenOnline(sender, f[6], f[5], f[10])
    elseif cmd == "D2" and f[2] == "P" then
        ns.online[sender] = nil   -- il se déconnecte
        ns.onlineDirty = true
    else
        ns.SeenOnline(sender)
    end

    if cmd == "L2" then
        local typ, akey = f[2], f[4]
        local a = ns.ACT_BY_KEY[akey or ""]
        if not ns.TYPES[typ or ""] or not a then return end
        -- L'addon ne sert qu'à former des groupes: les « je cherche un groupe » des anciennes versions sont ignorés.
        if typ ~= "LFM" then return end
        local roles = ns.DecodeRoles(f[5])
        if not next(roles) then return end
        local prev = ns.listings[sender]
        -- Une annonce de l'addon remplace celle qu'on avait lue dans le chat pour le même joueur.
        local short = ns.BareName(sender)
        for k, old in pairs(ns.listings) do
            if old.source == "chat" and ns.BareName(old.sender) == short then ns.listings[k] = nil end
        end
        local l = {
            sender = sender, type = typ, cat = a.cat, akey = a.key, roles = roles,
            class = f[6] or "", level = tonumber(f[7]) or 0, faction = f[8] or "",
            size = tonumber(f[9]) or a.size, groupCount = tonumber(f[10]) or 1,
            note = f[12] or "", time = GetTime() - ClampAge(f[11], ns.EXPIRE),
            ruleset = ns.RULESETS[f[13] or ""] and f[13] or "",
            baseRoles = roles, counts = ns.DecodeCounts(f[15]),
        }
        ns.CheckVersion(f[14])
        ns.listings[sender] = l
        if not prev or prev.akey ~= l.akey or prev.type ~= l.type then
            ns.CheckAlert(l)
        end

    elseif cmd == "G2" then
        local guild, focus = f[2], f[3]
        if not guild or guild == "" or not ns.GUILD_FOCUS[focus or ""] then return end
        local faction = f[4] or ""
        ns.RememberAnnouncedGuild(guild, sender, faction)
        ns.guilds[guild .. "-" .. faction] = {
            sender = sender, guild = guild, focus = focus, faction = faction,
            class = f[5] or "", level = tonumber(f[6]) or 0, note = f[8] or "",
            time = GetTime() - ClampAge(f[7], ns.GUILD_EXPIRE),
            ruleset = ns.RULESETS[f[9] or ""] and f[9] or "",
        }
        ns.CheckVersion(f[10])

    elseif cmd == "D2" then
        if f[2] == "L" then
            ns.listings[sender] = nil
        elseif f[2] == "G" then
            for k, g in pairs(ns.guilds) do
                if g.sender == sender then ns.guilds[k] = nil end
            end
        end

    elseif cmd == "Q2" then
        if sender ~= ns.Me() then ReplyToRequest() end
    end
    if cmd == "H2" then ns.CheckVersion(f[4]) end

    ns.RefreshSoon()
end

---------------------------------------------------------------------------
-- Chuchoter à un chef de groupe: message de présentation, demandes envoyées, joueurs ignorés
---------------------------------------------------------------------------
-- « Salut, voleur niv 20, je peux faire DPS pour Mines de la Mort. » Le message est seulement écrit dans la
-- boîte de chat: c'est toi qui appuies sur Entrée.
function ns.WhisperText(d)
    local a = d and ns.ACT_BY_KEY[d.akey or ""]
    if not a then return nil end
    local className = UnitClass("player")
    local who = (className and className ~= "" and (className:lower() .. " ") or "") .. L["niv "] .. ns.MyLevel()
    local role = ns.db and ns.db.myRoles and d.roles and FirstCommonRole(d.roles, ns.db.myRoles)
    local text = L["Salut, "] .. who
    if role then text = text .. L[", je peux faire "] .. ns.ROLE_INFO[role].name end
    return ns.CutUtf8(text .. L[" pour "] .. a.name .. ".", 250)
end

ns.requests = {}    -- chuchotements envoyés: [nomEnMinuscules] = { akey, time }

function ns.RecordRequest(d)
    if d and d.akey and d.sender then
        ns.requests[ns.BareName(d.sender)] = { akey = d.akey, time = GetTime(), sender = d.sender }
    end
end

function ns.HasRequest(name)
    local r = ns.requests[ns.BareName(name)]
    return r and GetTime() - r.time < 600
end

-- Quand j'entre dans le groupe de quelqu'un à qui j'ai chuchoté, la demande est réglée.
function ns.UpdateRequests()
    if not next(ns.requests) or not IsInGroup() then return end
    local units = {}
    if IsInRaid() then
        for i = 1, GetNumGroupMembers() do tinsert(units, "raid" .. i) end
    else
        units = { "party1", "party2", "party3", "party4" }
    end
    for _, unit in ipairs(units) do
        if UnitExists(unit) then
            -- Nom complet: dans Forever, UnitName peut ne donner que le prénom (le nom de famille vient en 2e valeur)
            local name = UnitNameFr(unit)
            if name then ns.requests[ns.BareName(name)] = nil end
        end
    end
end

function ns.IsIgnored(name)
    local ignored = ns.db and ns.db.ignored
    if not ignored or not next(ignored) then return false end
    local bare = ns.BareName(name)
    if ignored[bare] then return true end
    -- Les versions d'avant la 1.7 gardaient seulement le prénom (« chili »). Les noms de Forever ont toujours deux mots:
    -- une entrée d'un seul mot vient donc d'une ancienne version et vise le prénom.
    local first = bare:match("^(%S+)%s")
    return first and ignored[first] and true or false
end

function ns.Ignore(name)
    if not ns.db or ns.IsMe(name) then return end
    local bare = ns.BareName(name)
    if bare == "" then return end
    ns.db.ignored[bare] = true
    for k, l in pairs(ns.listings) do
        if ns.BareName(l.sender) == bare then ns.listings[k] = nil end
    end
    ns.requests[bare] = nil
    ns.Print(ns.ShortName(name) .. L[" est ignoré: ses annonces ne s'affichent plus. |cffffd100/bf ignores|r pour voir ou vider la liste."])
    ns.Refresh()
end

function ns.Unignore(name)
    if ns.db and ns.db.ignored then ns.db.ignored[ns.BareName(name)] = nil end
end

---------------------------------------------------------------------------
-- Annonces lues dans le chat (général, recherche de groupe, cris...)
-- Elles remplissent le babillard quand peu de joueurs ont l'addon. Elles portent « source = "chat" »:
-- une annonce venue de l'addon (plus fiable: classe, niveau, rôles) les remplace toujours.
---------------------------------------------------------------------------
-- Le nom du canal revient à chaque message: on ne le normalise qu'une fois par nom.
local defenseCache = {}
local function IsDefenseChannel(channelBase)
    channelBase = tostring(channelBase or "")
    local v = defenseCache[channelBase]
    if v == nil then
        local base = ns.NormalizeText(channelBase)
        v = (base:find("defense", 1, true) or base:find("defence", 1, true)) and true or false
        defenseCache[channelBase] = v
    end
    return v
end

function ns.OnChat(text, sender, channelBase, ruleset)
    local o = ns.db and ns.db.opts
    if not o or not o.chatReading then return end
    if issecretvalue and (issecretvalue(text) or issecretvalue(sender) or issecretvalue(channelBase)) then return end
    if type(text) ~= "string" or type(sender) ~= "string" or sender == "" then return end
    if ns.IsMe(sender) or ns.IsIgnored(sender) then return end
    -- La défense locale ne contient pas d'annonces de groupe.
    if IsDefenseChannel(channelBase) then return end

    local p = ns.ParseChat(text)
    local a = p and p.type == "LFM" and ns.ACT_BY_KEY[p.akey or ""]   -- seulement les groupes qui cherchent des joueurs
    if not a then return end

    sender = ns.NormalizeName(sender)
    local short = ns.BareName(sender)
    for _, l in pairs(ns.listings) do
        if l.source ~= "chat" and ns.BareName(l.sender) == short then return end   -- l'addon a déjà la bonne annonce
    end
    local note = text:gsub("|c%x%x%x%x%x%x%x%x", ""):gsub("|r", ""):gsub("|H.-|h(.-)|h", "%1"):gsub("|", "")
    local prev = ns.listings[sender]
    local l = {
        sender = sender, type = p.type, cat = a.cat, akey = a.key, roles = p.roles, class = "",
        level = p.level or 0, faction = ns.MyFaction(), size = a.size, groupCount = 1,
        note = ns.CutUtf8(ns.Clean(note), 100), time = GetTime(), ruleset = ruleset or "", source = "chat",
    }
    ns.listings[sender] = l
    if not prev or prev.akey ~= l.akey or prev.type ~= l.type then
        ns.CheckAlert(l)
    end
    ns.RefreshSoon()
end

-- Canal où publier : « Recherche de groupe » d'abord, sinon « Général ».
local function FindChatChannel()
    if not GetChannelList then return end
    local list = { GetChannelList() }
    local general
    for i = 1, #list, 3 do
        local id, name, disabled = list[i], list[i + 1], list[i + 2]
        if type(id) == "number" and type(name) == "string" and not disabled then
            local n = ns.NormalizeText(name)
            if n:find("recherche de groupe", 1, true) or n:find("lookingforgroup", 1, true)
               or n:find("looking for group", 1, true) then
                return id
            end
            if not general and n:find(" general ", 1, true) then general = id end
        end
    end
    return general
end

local lastChatPost = -1000

-- Publie mon annonce aussi dans le chat. Appelé seulement par un clic du joueur, jamais en arrière-plan.
function ns.PostToChat(l)
    l = l or ns.my
    if not l then return false end
    local wait = ns.CHAT_POST_GAP - (GetTime() - lastChatPost)
    if wait > 0 then
        ns.Print(L["annonce non publiée dans le chat (attends encore "] .. math.ceil(wait) .. L[" s pour ne pas faire de spam)."])
        return false
    end
    local id = FindChatChannel()
    if not id then
        ns.Print(L["aucun canal « Recherche de groupe » ou « Général » trouvé: ton annonce n'est pas dans le chat."])
        return false
    end
    local send = (C_ChatInfo and C_ChatInfo.SendChatMessage) or SendChatMessage
    local ok = pcall(send, ns.ChatText(l, ns.db.opts.chatTag), "CHANNEL", nil, id)
    if not ok then
        ns.Print(L["le jeu a refusé d'envoyer l'annonce dans le chat."])
        return false
    end
    lastChatPost = GetTime()
    return true
end

---------------------------------------------------------------------------
-- Communauté « Babillard Forever FR »
-- Le canal caché reste sur un seul serveur interne. La communauté, elle, réunit les joueurs de tous les serveurs de la
-- même région: les annonces qu'on y publie (texte lisible, même sans l'addon) sont lues comme celles du chat.
---------------------------------------------------------------------------
local REGIONS = { [1] = "US", [2] = "KR", [3] = "EU", [4] = "TW", [5] = "CN" }

function ns.MyRegion()
    local id = GetCurrentRegion and GetCurrentRegion()
    return REGIONS[id or 0] or ""
end

-- Code d'invitation de ma région, de mon type de serveur et de ma faction (nil si aucun ou type pas encore choisi).
function ns.CommunityInvite()
    local byRuleset = ns.COMMUNITY_INVITES and ns.COMMUNITY_INVITES[ns.MyRegion()]
    local byFaction = type(byRuleset) == "table" and byRuleset[ns.MyRuleset() or ""]
    local code = type(byFaction) == "table" and byFaction[ns.MyFaction()]
    if type(code) == "string" and code ~= "" then return code end
end

local communityId
local lastCommunitySearch = -1000
function ns.ResetCommunitySearch()
    lastCommunitySearch = -1000
end
-- Identifiant de la communauté si j'en suis membre, sinon nil. On la reconnaît par son nom.
function ns.CommunityId()
    if not C_Club or not C_Club.GetSubscribedClubs then return nil end
    if not communityId and GetTime() - lastCommunitySearch < 10 then return nil end
    if communityId then
        local ok, info = pcall(C_Club.GetClubInfo, communityId)
        if ok and info then return communityId end
        communityId = nil
    end
    lastCommunitySearch = GetTime()
    local ok, clubs = pcall(C_Club.GetSubscribedClubs)
    if not ok or type(clubs) ~= "table" then return nil end
    local wanted = ns.NormalizeText(ns.COMMUNITY_NAME)
    for _, c in ipairs(clubs) do
        local isWowCommunity = not (Enum and Enum.ClubType) or c.clubType == Enum.ClubType.Character
        if isWowCommunity and type(c.name) == "string" and ns.NormalizeText(c.name) == wanted then
            communityId = c.clubId
            return communityId
        end
    end
end

-- Le fil « Général » de la communauté (le premier fil sinon).
local function CommunityStream(clubId)
    local ok, streams = pcall(C_Club.GetStreams, clubId)
    if not ok or type(streams) ~= "table" or #streams == 0 then return nil end
    for _, s in ipairs(streams) do
        if Enum and Enum.ClubStreamType and s.streamType == Enum.ClubStreamType.General then return s.streamId end
    end
    return streams[1].streamId
end

-- Nom de l'auteur d'un message de la communauté: le jeu le donne déjà complet (« Prénom Nom »), sans royaume.
function ns.CommunityAuthorName(clubId, author)
    return ns.CleanName(author.name)
end

-- Ajoute le fil « Général » de la communauté à la fenêtre de chat principale: sans ça, rejoindre la communauté ne
-- change rien de visible. Le jeu a changé de fonction selon les versions: on essaie les connues, sinon on explique.
function ns.ShowCommunityInChat(userClicked)
    local clubId = ns.CommunityId()
    if not clubId then
        if userClicked then ns.ShowCommunityInvite() end
        return false
    end
    local streamId = CommunityStream(clubId)
    if not streamId then return false end
    local done = false
    if ChatFrame_AddNewCommunitiesChannel then
        done = pcall(ChatFrame_AddNewCommunitiesChannel, 1, clubId, streamId)
    elseif ChatFrameUtil and ChatFrameUtil.AddNewCommunitiesChannel then
        done = pcall(ChatFrameUtil.AddNewCommunitiesChannel, 1, clubId, streamId)
    end
    if not done and C_Club and C_Club.AddClubStreamChatChannel and ChatFrame_AddChannel and ChatFrame1 then
        local ok, channel = pcall(C_Club.AddClubStreamChatChannel, clubId, streamId)
        if ok and type(channel) == "string" then done = pcall(ChatFrame_AddChannel, ChatFrame1, channel) end
    end
    if done then
        ns.db.communityChatAdded = clubId
        ns.Print(L["le chat de la communauté |cffffd100"] .. ns.COMMUNITY_NAME
            .. L["|r est maintenant dans ta fenêtre de chat. Pour y écrire, clique sur son nom devant un de ses messages."])
    elseif userClicked then
        ns.Print(L["pour voir le chat de la communauté: touche |cffffd100J|r, clic droit sur le fil Général de « "]
            .. ns.COMMUNITY_NAME .. L[" », puis « Afficher dans la fenêtre de chat »."])
    end
    return done
end

-- Un message arrive dans une communauté: si c'est la nôtre, on le lit comme une annonce du chat.
function ns.OnCommunityMessage(clubId, streamId, messageId)
    if not clubId or clubId ~= ns.CommunityId() then return end
    local ok, info = pcall(C_Club.GetMessageInfo, clubId, streamId, messageId)
    if not ok or type(info) ~= "table" or type(info.content) ~= "string" then return end
    local author = info.author
    if type(author) ~= "table" or author.isSelf or type(author.name) ~= "string" then return end
    -- Les annonces de l'addon finissent par « (type de serveur) »: le filtre par type de serveur s'applique alors.
    local ruleset
    for _, names in ipairs({ ns.RULESETS_FR, ns.RULESETS }) do
        for id, name in pairs(names) do
            if info.content:find("(" .. name .. ")", 1, true) then ruleset = id end
        end
    end
    ns.OnChat(info.content, ns.CommunityAuthorName(clubId, author), "communaute", ruleset)
end

-- Lien cliquable pour rejoindre la communauté (le jeu ouvre sa fenêtre « Rejoindre »), plus le lien web à copier.
function ns.ShowCommunityInvite()
    if ns.CommunityId() then
        ns.Print(L["tu es déjà dans la communauté |cffffd100"] .. ns.COMMUNITY_NAME .. L["|r. Tes annonces y sont publiées au clic sur Publier."])
        if ns.db.communityChatAdded ~= ns.CommunityId() then ns.ShowCommunityInChat(true) end
        return
    end
    if not ns.RequireRuleset() then return end
    local code = ns.CommunityInvite()
    if not code then
        ns.Print(L["la communauté |cffffd100"] .. ns.COMMUNITY_NAME .. L["|r n'est pas encore ouverte pour toi ("]
            .. (ns.MyRegion() ~= "" and ns.MyRegion() or "?") .. ", " .. (ns.RulesetName(ns.MyRuleset()) or "?") .. ", "
            .. (ns.MyFaction() ~= "" and ns.MyFaction() or "?") .. ").")
        return
    end
    ns.Print(L["rejoins les francophones de tous les serveurs: |cff66ccff|HclubTicket:"] .. code .. L["|h[Rejoindre "] .. ns.COMMUNITY_NAME .. "]|h|r")
    ns.ShowCopy(L["Lien d'invitation de la communauté :"], "https://www.worldofwarcraft.com/invite/" .. code
        .. "?region=" .. ns.MyRegion() .. "&faction=" .. ns.MyFaction())
end

-- Rappel à la connexion pour ceux qui ne sont pas membres: une fois par jour au maximum.
function ns.CommunityReminder()
    if ns.CommunityId() or not ns.CommunityInvite() or not ns.db then return end
    local today = date("%Y-%m-%d")
    if ns.db.communityAsked == today then return end
    ns.db.communityAsked = today
    local code = ns.CommunityInvite()
    ns.Print(L["joueurs francophones sur les autres serveurs de Forever: |cff66ccff|HclubTicket:"] .. code .. L["|h[Rejoindre "] .. ns.COMMUNITY_NAME .. L["]|h|r (ou |cffffd100/bf communaute|r)"])
end

local lastCommunityPost = -1000

-- Publie mon annonce dans la communauté. Appelé seulement par un clic du joueur, jamais en arrière-plan.
function ns.PostToCommunity(l)
    l = l or ns.my
    if not l or not C_Club or not C_Club.SendMessage then return false end
    local clubId = ns.CommunityId()
    if not clubId then return false end
    local wait = ns.CHAT_POST_GAP - (GetTime() - lastCommunityPost)
    if wait > 0 then
        ns.Print(L["annonce non publiée dans la communauté (attends encore "] .. math.ceil(wait) .. L[" s pour ne pas faire de spam)."])
        return false
    end
    local streamId = CommunityStream(clubId)
    if not streamId then return false end
    local text = ns.ChatText(l, false)
    local rs = ns.RulesetName(l.ruleset or ns.MyRuleset())
    if rs then text = ns.CutUtf8(text .. " (" .. rs .. ")", 250) end
    local ok = pcall(C_Club.SendMessage, clubId, streamId, text)
    if not ok then
        ns.Print(L["le jeu a refusé d'envoyer l'annonce dans la communauté."])
        return false
    end
    lastCommunityPost = GetTime()
    return true
end

---------------------------------------------------------------------------
-- Mise à jour automatique de mon groupe (nombre de joueurs, rôles qui manquent)
---------------------------------------------------------------------------
-- Tank et soigneur sont des places uniques: si quelqu'un du groupe a ce rôle d'assigné, on ne le cherche plus.
-- Le jeu ne donne le rôle que si les joueurs l'ont choisi: sans rôle assigné, on garde ce que tu as demandé.
local ASSIGNED = { TANK = "TANK", HEALER = "HEAL", DAMAGER = "DPS" }

-- Retourne les rôles et les places qui manquent encore. Avec des places par rôle (raids, PvP), chaque joueur du
-- groupe qui a un rôle assigné en retire une. Sans places (groupe de 5), tank et soigneur sont des places uniques.
local function MissingRoles(baseRoles, baseCounts)
    local wanted, counts = CopyTable(baseRoles), CopyTable(baseCounts or {})
    if UnitGroupRolesAssigned then
        local units = {}
        if IsInRaid() then
            for i = 1, GetNumGroupMembers() do tinsert(units, "raid" .. i) end
        else
            units = { "player", "party1", "party2", "party3", "party4" }
        end
        for _, unit in ipairs(units) do
            local key = UnitExists(unit) and ASSIGNED[UnitGroupRolesAssigned(unit) or ""]
            if key and wanted[key] then
                if counts[key] then
                    counts[key] = counts[key] - 1
                    if counts[key] <= 0 then counts[key], wanted[key] = nil, nil end
                elseif not IsInRaid() and (key == "TANK" or key == "HEAL") then
                    wanted[key] = nil
                end
            end
        end
    end
    if not next(wanted) then return CopyTable(baseRoles), CopyTable(baseCounts or {}) end
    return wanted, counts
end

local resendPending, lastResend = false, -1000

function ns.AutoUpdateGroup()
    local o = ns.db and ns.db.opts
    if not ns.my or not o or not o.autoUpdate or ns.my.type ~= "LFM" then return end
    local count = math.max(1, GetNumGroupMembers())
    local roles, counts = MissingRoles(ns.my.baseRoles or ns.my.roles, ns.my.baseCounts)
    if count == ns.my.groupCount and ns.EncodeRoles(roles) == ns.EncodeRoles(ns.my.roles)
       and ns.EncodeCounts(counts) == ns.EncodeCounts(ns.my.counts) then return end
    ns.my.groupCount, ns.my.roles, ns.my.counts = count, roles, counts
    SaveMyState()
    ns.Refresh()
    if resendPending then return end
    resendPending = true
    -- On attend un peu: plusieurs joueurs peuvent arriver d'un coup, et le canal limite les messages.
    C_Timer.After(math.max(3, 10 - (GetTime() - lastResend)), function()
        resendPending = false
        if ns.my then
            lastResend = GetTime()
            ns.Send(ListingMessage(ns.my))
        end
    end)
end

---------------------------------------------------------------------------
-- Événements
---------------------------------------------------------------------------
pcall(C_ChatInfo.RegisterAddonMessagePrefix, ns.PREFIX)

local function RestoreMyState()
    local now = time()
    local saved = ns.db.myListing
    if saved and saved.type == "LFM" and ns.ACT_BY_KEY[saved.akey or ""] and now - (saved.epoch or 0) < ns.EXPIRE then
        local a = ns.ACT_BY_KEY[saved.akey]
        local _, class = UnitClass("player")
        ns.my = {
            sender = ns.Me(), type = saved.type, cat = a.cat, akey = a.key, roles = saved.roles or {},
            baseRoles = saved.baseRoles or saved.roles or {},
            counts = saved.counts or {}, baseCounts = saved.baseCounts or saved.counts or {},
            class = class or "", level = ns.MyLevel(), faction = ns.MyFaction(), size = a.size,
            groupCount = math.max(1, GetNumGroupMembers()), note = saved.note or "",
            time = GetTime() - (now - saved.epoch), ruleset = ns.MyRuleset() or "",
        }
        ns.listings[ns.my.sender] = ns.my
    else
        ns.db.myListing = nil
    end
    local sg = ns.db.myGuild
    local guild = GetGuildInfo("player")
    if sg and guild and now - (sg.epoch or 0) < ns.GUILD_EXPIRE then
        local _, class = UnitClass("player")
        ns.myGuild = {
            sender = ns.Me(), guild = ns.Clean(guild), focus = sg.focus, faction = ns.MyFaction(),
            class = class or "", level = ns.MyLevel(), note = sg.note or "",
            time = GetTime() - (now - sg.epoch), ruleset = ns.MyRuleset() or "",
        }
        ns.guilds[ns.myGuild.guild .. "-" .. ns.myGuild.faction] = ns.myGuild
    else
        ns.db.myGuild = nil
    end
end

local function PruneKnown()
    -- Anciennes clés « Nom- » (tiret vide à la fin): même joueur que « Nom »
    for _, tbl in ipairs({ ns.db.known, ns.db.francos }) do
        local moves = {}
        for name, t in pairs(tbl) do
            local clean = ns.NormalizeName(name)
            if clean and clean ~= name then moves[name] = clean end
        end
        for old, clean in pairs(moves) do
            local t = tbl[old]
            tbl[old] = nil
            if type(t) == "number" and (type(tbl[clean]) ~= "number" or tbl[clean] < t) then tbl[clean] = t end
        end
    end
    local limit = time() - 60 * 24 * 3600
    for name, t in pairs(ns.db.known) do
        if type(t) ~= "number" or t < limit then ns.db.known[name] = nil end
    end
    -- Francophones repérés: 60 jours, et au plus 3000 noms (on garde les plus récents)
    local list = {}
    for name, t in pairs(ns.db.francos) do
        if type(t) ~= "number" or t < limit then ns.db.francos[name] = nil else tinsert(list, name) end
    end
    if #list > 3000 then
        table.sort(list, function(a, b) return ns.db.francos[a] > ns.db.francos[b] end)
        for i = 3001, #list do ns.db.francos[list[i]] = nil end
    end
    -- Guildes francophones: 60 jours, et au plus 500
    local guilds = {}
    for g, e in pairs(ns.db.frGuilds) do
        if type(e) ~= "table" or (e.t or 0) < limit then ns.db.frGuilds[g] = nil else tinsert(guilds, g) end
    end
    if #guilds > 500 then
        table.sort(guilds, function(a, b) return ns.db.frGuilds[a].t > ns.db.frGuilds[b].t end)
        for i = 501, #guilds do ns.db.frGuilds[guilds[i]] = nil end
    end
end

local ev = CreateFrame("Frame")
ev:RegisterEvent("ADDON_LOADED")
ev:RegisterEvent("PLAYER_LOGIN")
ev:RegisterEvent("PLAYER_LOGOUT")
ev:RegisterEvent("PLAYER_ENTERING_WORLD")
ev:RegisterEvent("CHAT_MSG_ADDON")
ev:RegisterEvent("GROUP_ROSTER_UPDATE")
ev:RegisterEvent("PLAYER_LEVEL_UP")
ev:RegisterEvent("PLAYER_GUILD_UPDATE")
ev:RegisterEvent("CHAT_MSG_CHANNEL")
ev:RegisterEvent("CHAT_MSG_YELL")
ev:RegisterEvent("CHAT_MSG_SAY")
ev:RegisterEvent("CHAT_MSG_WHISPER")
pcall(ev.RegisterEvent, ev, "CLUB_MESSAGE_ADDED")   -- communautés (absentes de certaines versions du jeu)
pcall(ev.RegisterEvent, ev, "CLUB_ADDED")
ev:RegisterEvent("UPDATE_MOUSEOVER_UNIT")
ev:RegisterEvent("PLAYER_TARGET_CHANGED")
pcall(ev.RegisterEvent, ev, "NAME_PLATE_UNIT_ADDED")
pcall(ev.RegisterEvent, ev, "WHO_LIST_UPDATE")
pcall(ev.RegisterEvent, ev, "PLAYER_ROLES_ASSIGNED")   -- n'existe pas dans toutes les versions du jeu

ev:SetScript("OnEvent", function(_, event, ...)
    if event == "ADDON_LOADED" then
        if ... ~= ADDON then return end
        BabillardForeverFRDB = BabillardForeverFRDB or {}
        ns.db = BabillardForeverFRDB
        ApplyDefaults(ns.db, DEFAULTS)
        PruneKnown()
        -- La langue d'abord: les fenêtres sont bâties avec les textes de la langue choisie.
        ns.SetupLanguage()
        xpcall(ns.BuildUI, geterrorhandler())
        xpcall(ns.BuildOptions, geterrorhandler())
        if ns.OnDBReady then ns.OnDBReady() end

    elseif event == "PLAYER_LOGOUT" then
        -- Au revoir: les autres me retirent tout de suite de « En ligne » (sinon après 12 minutes).
        if ns.ChannelIndex() then pcall(ns.Send, "D2;P") end

    elseif event == "PLAYER_LOGIN" then
        RestoreMyState()
        -- Une version plus récente vue lors d'une session passée reste affichée tant qu'on ne met pas à jour.
        local newest, mine = ns.VersionNumber(ns.db.newestText), ns.VersionNumber(ns.VERSION)
        if newest and mine and newest > mine then ns.newVersion = ns.db.newestText else ns.db.newestSeen, ns.db.newestText = nil, nil end
        -- Les canaux ne sont pas prêts tout de suite à la connexion
        C_Timer.After(5, function()
            ns.EnsureChannel()
            ns.LeaveLegacyChannel()
            C_Timer.After(10, ns.CommunityReminder)
            C_Timer.After(3, function()
                ns.SendPresence("H2")
                ns.RequestAll()
            end)
        end)
        -- L'accueil a demandé un changement de langue: après le rechargement, il reprend où il était.
        if not ns.db.onboarded and ns.db.onboardStep then
            C_Timer.After(2, function()
                if ns.UI and ns.UI.ShowWelcome then ns.UI.ShowWelcome() end
            end)
        end
        if not ns.db.welcomed then
            ns.db.welcomed = true
            C_Timer.After(8, function()
                ns.Print(L["installé! Tape |cffffd100/bf|r ou clique sur le bouton de la minimap pour ouvrir le babillard."])
            end)
        end
        -- Vérifications régulières : expiration, rappel, canal
        C_Timer.NewTicker(10, function()
            ns.Prune()
            CheckReminder()
            ns.Refresh()
        end)
        -- Signal « toujours là » toutes les 5 minutes environ, décalé au hasard pour que tout le monde n'envoie pas en même temps
        local function Heartbeat()
            ns.SendPresence("H3")
            C_Timer.After(270 + math.random() * 60, Heartbeat)
        end
        C_Timer.After(270 + math.random() * 60, Heartbeat)
        C_Timer.NewTicker(30, function()
            if not ChannelIndex() then ns.EnsureChannel() end
        end)

    elseif event == "PLAYER_ENTERING_WORLD" then
        CheckEnteredInstance()

    elseif event == "CHAT_MSG_ADDON" then
        local prefix, msg, channel, sender = ...
        if prefix == ns.PREFIX and channel == "CHANNEL" and msg and sender then
            OnMessage(msg, sender)
        end

    elseif event == "CHAT_MSG_CHANNEL" then
        local text, sender, _, _, _, _, _, _, channelBase = ...
        ns.SpotFrench(text, sender)
        ns.OnChat(text, sender, channelBase)

    elseif event == "CHAT_MSG_YELL" then
        local text, sender = ...
        ns.SpotFrench(text, sender)
        ns.OnChat(text, sender, "")

    elseif event == "CHAT_MSG_SAY" or event == "CHAT_MSG_WHISPER" then
        local text, sender = ...
        ns.SpotFrench(text, sender)

    elseif event == "CLUB_MESSAGE_ADDED" then
        ns.OnCommunityMessage(...)

    elseif event == "CLUB_ADDED" then
        -- Je viens de rejoindre une communauté: si c'est la nôtre, son chat va dans ma fenêtre de chat (une seule fois).
        ns.ResetCommunityCache()
        C_Timer.After(2, function()
            ns.ResetCommunityCache()
            local id = ns.CommunityId()
            if id and ns.db.communityChatAdded ~= id then
                ns.Print(L["bienvenue dans la communauté! Tu vois maintenant les francophones de tous les serveurs dans l'onglet En ligne."])
                ns.ShowCommunityInChat(false)
            end
            ns.Refresh()
        end)

    elseif event == "UPDATE_MOUSEOVER_UNIT" then
        ns.CheckUnitGuild("mouseover")

    elseif event == "PLAYER_TARGET_CHANGED" then
        ns.CheckUnitGuild("target")

    elseif event == "NAME_PLATE_UNIT_ADDED" then
        local unit = ...
        if unit then ns.CheckUnitGuild(unit) end

    elseif event == "WHO_LIST_UPDATE" then
        ns.ScanWho()

    elseif event == "GROUP_ROSTER_UPDATE" or event == "PLAYER_ROLES_ASSIGNED" then
        ns.ScanGroupGuilds()
        CheckAutoRemove()
        ns.AutoUpdateGroup()
        ns.UpdateRequests()
        ns.Refresh()

    elseif event == "PLAYER_LEVEL_UP" then
        -- UnitLevel n'est pas encore à jour pendant l'événement
        C_Timer.After(0.5, ns.Refresh)

    elseif event == "PLAYER_GUILD_UPDATE" then
        ns.Refresh()
    end
end)

---------------------------------------------------------------------------
-- Commandes : /bf, /babillard
---------------------------------------------------------------------------
SLASH_BABILLARDFR1 = "/bf"
SLASH_BABILLARDFR2 = "/babillard"
SlashCmdList.BABILLARDFR = function(arg)
    arg = strtrim(arg or ""):lower()
    ns.EnsureChannel()
    if arg == "site" or arg == "website" then
        ns.ShowSiteLink()
    elseif arg == "commandes" or arg == "commands" or arg == "cmd" then
        if ns.UI and ns.UI.Open then ns.UI.Open(5) end
    elseif arg == "bienvenue" or arg == "welcome" then
        if ns.UI and ns.UI.ShowWelcome then ns.UI.ShowWelcome(1) end
    elseif arg == "enligne" or arg == "online" or arg == "qui" then
        if ns.UI and ns.UI.Open then ns.UI.Open(4) end
    elseif arg:match("^lang") then
        -- /bf langue fr | en | auto
        local choice = arg:match("%s(%a+)$")
        if choice then
            ns.SetLanguageChoice(choice)
        else
            ns.Print("Langue / Language : " .. ns.LanguageName(ns.db.opts.lang) .. " - " .. ns.Cmd("langue") .. " fr, en, auto")
        end
    elseif arg == "communaute" or arg == "communauté" or arg == "commu" or arg == "community" then
        ns.ShowCommunityInvite()
    elseif arg == "options" then
        if ns.OpenOptions then ns.OpenOptions() end
    elseif arg == "favoris" or arg == "favorites" or arg == "favs" then
        ns.OpenFavMenu()
    elseif arg == "demandes" or arg == "requests" then
        local n = 0
        for _, r in pairs(ns.requests) do
            n = n + 1
            local a = ns.ACT_BY_KEY[r.akey]
            local age = GetTime() - r.time
            print("  " .. ns.ShortName(r.sender) .. " : " .. (a and a.name or "?") .. L[" (il y a "] .. math.floor(age / 60) .. L[" min"] ..
                (age > 300 and L[", sans réponse"] or "") .. ")")
        end
        if n == 0 then ns.Print(L["aucune demande en cours. Elles s'affichent ici après un clic sur Chuchoter."]) end
    elseif arg == "ignores" or arg == "ignorés" or arg == "ignored" or arg == "ignore" then
        local names = {}
        for bare in pairs(ns.db.ignored) do tinsert(names, bare) end
        table.sort(names)
        if #names == 0 then ns.Print(L["aucun joueur ignoré."]) else ns.Print(L["joueurs ignorés : "] .. table.concat(names, ", ")) end
    elseif arg == "ignores vider" or arg == "ignored clear" or arg == "ignore clear" then
        wipe(ns.db.ignored)
        ns.Print(L["la liste des joueurs ignorés est vide."])
        ns.Refresh()
    elseif arg == "guildes" or arg == "guilds" then
        if ns.UI then ns.UI.Open(2) end
    elseif arg == "perso" or arg == "code" or arg == "character" or arg == "char" then
        if ns.UI then ns.UI.Open(3) end
    elseif arg == "diag" then
        ns.ShowCopy(L["Diagnostic Babillard Forever FR (colle-le dans la conversation):"], ns.Diagnostic())
    elseif arg == "aide" or arg == "help" then
        ns.Print(L["commandes :"])
        print(L["  |cffffd100/bf|r : ouvrir ou fermer le babillard"])
        print(L["  |cffffd100/bf guildes|r : guildes francophones"])
        print(L["  |cffffd100/bf perso|r : mon personnage et code pour le site"])
        print(L["  |cffffd100/bf site|r : lien du site"])
        print(L["  |cffffd100/bf enligne|r : francophones en ligne"])
        print(L["  |cffffd100/bf bienvenue|r : revoir l'accueil"])
        print(L["  |cffffd100/bf commandes|r : tous ces boutons dans la fenêtre"])
        print(L["  |cffffd100/bf communaute|r : rejoindre les francophones de tous les serveurs"])
        print(L["  |cffffd100/bf diag|r : diagnostic (si les talents ou l'équipement n'apparaissent pas)"])
        print(L["  |cffffd100/bf favoris|r : choisir les activités qui déclenchent une alerte"])
        print(L["  |cffffd100/bf demandes|r : les groupes à qui tu as chuchoté"])
        print(L["  |cffffd100/bf ignores|r : joueurs ignorés (|cffffd100/bf ignores vider|r pour tout retirer)"])
        print(L["  |cffffd100/bf options|r : options"])
        print(L["  |cffffd100/bf langue fr|r, |cffffd100en|r ou |cffffd100auto|r : langue de l'addon"])
    else
        if ns.UI then ns.UI.Toggle() end
    end
end
