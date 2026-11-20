-- Babillard Forever FR - Cœur : communication, annonces, alertes, retrait auto, rappel, export
local ADDON, ns = ...

ns.listings = {}   -- [expediteur] = annonce de groupe
ns.guilds   = {}   -- [nomGuilde-faction] = annonce de guilde
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
        alertChat       = false,   -- alertes aussi pour les annonces lues dans le chat
        alsoChat        = false,   -- publier aussi dans le chat (au clic seulement)
        chatTag         = false,   -- ajouter « [Babillard FR] » aux annonces du chat
        autoUpdate      = true,    -- mettre à jour tout seul le nombre de joueurs et les rôles manquants
        favsOnly        = false,   -- alertes seulement pour mes activités favorites
        whisperTemplate = true,    -- Chuchoter écrit déjà un message de présentation (jamais envoyé tout seul)
    },
    favs     = {},     -- activités favorites : [cléActivité] = true
    ignored  = {},     -- joueurs ignorés : [nomEnMinuscules] = true
    known    = {},     -- joueurs qui ont l'addon : [Nom-Royaume] = date
    welcomed = false,
}

local function ApplyDefaults(db, defaults)
    for k, v in pairs(defaults) do
        if db[k] == nil then
            db[k] = (type(v) == "table") and CopyTable(v) or v
        elseif type(v) == "table" and type(db[k]) == "table" and k ~= "myRoles" and k ~= "known" then
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
    return m < 1 and "à l'instant" or (m .. " min")
end

function ns.SafeCreate(frameType, name, parent, template, fallback)
    local ok, fr = pcall(CreateFrame, frameType, name, parent, template)
    if ok and fr then return fr end
    return CreateFrame(frameType, name, parent, fallback)
end

function ns.Me()
    local n, r = UnitFullName("player")
    r = (r and r ~= "") and r or (GetNormalizedRealmName() or "")
    return (n or "?") .. "-" .. r
end

function ns.NormalizeName(name)
    if name and not name:find("-", 1, true) then
        name = name .. "-" .. (GetNormalizedRealmName() or "")
    end
    return name
end

function ns.ShortName(name)
    local short = Ambiguate(name or "?", "none")
    -- Le jeu écrit parfois « Nom Royaume » (espace) au lieu de « Nom-Royaume »: un nom de personnage n'a jamais d'espace.
    return (short:gsub("%s.*$", ""))
end

-- Le nom du personnage seul, en minuscules: sert à comparer deux joueurs même si le royaume est écrit
-- « Nom-Royaume », « Nom Royaume » ou pas du tout.
function ns.BareName(name)
    if type(name) ~= "string" then return "" end
    return (name:match("^[^%-%s]+") or name):lower()
end

-- Nom utilisable pour chuchoter ou inviter: « Nom Royaume » redevient « Nom-Royaume ».
function ns.WhisperName(name)
    if type(name) ~= "string" then return name end
    if name:find("-", 1, true) then return name end
    return (name:gsub("%s+", "-", 1))
end

-- Est-ce moi? Le jeu écrit parfois le royaume autrement dans les messages reçus (« Nom-Royaume »):
-- on compare seulement le nom, sinon sa propre annonce revenait en double.
function ns.IsMe(name)
    if not name then return false end
    return ns.BareName(name) == ns.BareName(UnitName("player"))
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
    ns.Print("choisis d'abord ton type de serveur (PvE, PvP, RP ou RP-PvP) dans l'onglet |cffffd100Mon perso|r: ton annonce restera visible seulement pour les joueurs du même type.")
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
        ns.Print("une nouvelle version de l'addon est disponible (" .. v .. "). Tape |cffffd100/bf site|r pour le lien de téléchargement.")
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

function ns.ActivityFits(a, level)
    return a ~= nil and level >= a.min and level <= a.max
end

-- Activités d'une catégorie faisables à ton niveau
function ns.AvailableActivities(cat)
    local level, out = ns.MyLevel(), {}
    for _, a in ipairs(ns.ACTIVITIES[cat] or {}) do
        if ns.ActivityFits(a, level) then tinsert(out, a) end
    end
    return out
end

function ns.ActivityLabel(a)
    local s = a.name .. "  |cff888888(" .. (a.min == a.max and a.min or (a.min .. "-" .. a.max))
    if a.cat == "Raids" or (a.cat == "PvP" and a.size > 5) then
        s = s .. ", " .. a.size .. " joueurs"
    end
    return s .. ")|r"
end

function ns.Refresh()
    if ns.UI and ns.UI.Refresh then ns.UI.Refresh() end
end

---------------------------------------------------------------------------
-- Canal caché
---------------------------------------------------------------------------
ns.channelFailed = false

local function ChannelIndex()
    local id = GetChannelName(ns.CHANNEL)
    if id and id > 0 then return id end
end
ns.ChannelIndex = ChannelIndex

local function HideChannelFromChat()
    local remove = ChatFrame_RemoveChannel or (ChatFrameUtil and ChatFrameUtil.RemoveChannel)
    if not remove then return end
    for i = 1, (NUM_CHAT_WINDOWS or 10) do
        local cf = _G["ChatFrame" .. i]
        if cf then pcall(remove, cf, ns.CHANNEL) end
    end
end

-- Joint le canal s'il ne l'est pas déjà. Appelé aussi lors des clics (plus fiable).
function ns.EnsureChannel()
    if ChannelIndex() then
        ns.channelFailed = false
        return true
    end
    pcall(JoinChannelByName, ns.CHANNEL)
    C_Timer.After(1, HideChannelFromChat)
    C_Timer.After(3, function()
        ns.channelFailed = not ChannelIndex()
        ns.Refresh()
    end)
    return false
end

function ns.Send(msg)
    local id = ChannelIndex()
    if not id then
        ns.EnsureChannel()
        return false
    end
    local ok, res = pcall(C_ChatInfo.SendAddonMessage, ns.PREFIX, msg, "CHANNEL", id)
    if not ok or res == false then return false end
    if type(res) == "number" and res ~= 0 then return false end   -- Enum.SendAddonMessageResult.Success = 0
    return true
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
        ns.Print("attends quelques secondes avant de republier.")
        return false
    end
    p.type = "LFM"   -- l'addon sert à former des groupes, pas à en chercher un
    local a = ns.ACT_BY_KEY[p.akey or ""]
    if not a then
        ns.Print("choisis une activité avant de publier.")
        return false
    end
    if not ns.ActivityFits(a, ns.MyLevel()) then
        ns.Print("cette activité n'est pas à ton niveau.")
        return false
    end
    if not p.roles or not next(p.roles) then
        ns.Print("choisis au moins un rôle.")
        return false
    end
    if not ns.RequireRuleset() then return false end
    local _, class = UnitClass("player")
    local l = {
        sender = ns.Me(), type = p.type, cat = a.cat, akey = a.key, roles = CopyTable(p.roles),
        baseRoles = CopyTable(p.roles), counts = CopyTable(p.counts or {}), baseCounts = CopyTable(p.counts or {}),
        class = class or "", level = ns.MyLevel(), faction = ns.MyFaction(), size = a.size,
        groupCount = math.max(1, GetNumGroupMembers()), note = ns.Clean(p.note):sub(1, 120),
        time = GetTime(), ruleset = ns.MyRuleset() or "",
    }
    if not ns.Send(ListingMessage(l)) then
        ns.Print("connexion au canal en cours, réessaie dans quelques secondes.")
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
        ns.Print("tu dois être dans une guilde pour l'annoncer.")
        return false
    end
    if not ns.GUILD_FOCUS[focus or ""] then
        ns.Print("choisis le type de ta guilde.")
        return false
    end
    if not ns.RequireRuleset() then return false end
    local _, class = UnitClass("player")
    local g = {
        sender = ns.Me(), guild = ns.Clean(guild), focus = focus, faction = ns.MyFaction(),
        class = class or "", level = ns.MyLevel(), note = ns.Clean(note):sub(1, 120), time = GetTime(),
        ruleset = ns.MyRuleset() or "",
    }
    if not ns.Send(GuildMessage(g)) then
        ns.Print("connexion au canal en cours, réessaie dans quelques secondes.")
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

function ns.RequestAll()
    if GetTime() - lastRequest < 30 then return end
    if ns.Send("Q2") then lastRequest = GetTime() end
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
    local chat = {}
    for k, l in pairs(ns.listings) do
        if l.source == "chat" then tinsert(chat, { k, l.time }) end
    end
    if #chat > ns.CHAT_MAX then
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

    if l.type == "LFM" and not IsInGroup() and ns.ActivityFits(a, ns.MyLevel()) then
        -- Un groupe cherche un de mes rôles
        local r = FirstCommonRole(l.roles, ns.db.myRoles)
        if r then
            text = string.format("%s cherche un %s pour %s", who, ns.ROLE_INFO[r].name:lower(), a.name)
        end
    end
    if not text then return end

    lastAlert = GetTime()
    if o.alertSound then ns.PlaySoundKit("READY_CHECK", "RAID_WARNING", "TELL_MESSAGE") end
    if RaidNotice_AddMessage and RaidWarningFrame and ChatTypeInfo and ChatTypeInfo["RAID_WARNING"] then
        RaidNotice_AddMessage(RaidWarningFrame, "|cff33aaff[Babillard FR]|r " .. text, ChatTypeInfo["RAID_WARNING"])
    end
    ns.Print(text .. ". Tape |cffffd100/bf|r pour voir.")
    if ns.FlashMinimap then ns.FlashMinimap() end
end

---------------------------------------------------------------------------
-- Retrait automatique
---------------------------------------------------------------------------
local function CheckAutoRemove()
    if not ns.my or not ns.db or not ns.db.opts.autoRemove then return end
    if ns.my.type == "LFM" and GetNumGroupMembers() >= (ns.my.size or 5) then
        ns.WithdrawListing("annonce retirée : ton groupe est complet!")
    end
end

local function CheckEnteredInstance()
    if not ns.my or not ns.db or not ns.db.opts.autoRemove then return end
    local inInstance, instanceType = IsInInstance()
    if inInstance and (instanceType == "party" or instanceType == "raid" or instanceType == "pvp") then
        ns.WithdrawListing("annonce retirée : tu es entré dans une instance.")
    end
end

---------------------------------------------------------------------------
-- Rappel avant expiration
---------------------------------------------------------------------------
StaticPopupDialogs["BABILLARDFR_REMIND"] = {
    text = "Ton annonce sur le Babillard expire dans 2 minutes.\n\nVeux-tu la republier?",
    button1 = "Republier",
    button2 = "Laisser expirer",
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
    text = "%s\n\nFais |cffffd100Ctrl+C|r pour copier.",
    button1 = CLOSE or "Fermer",
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
    ns.ShowCopy("Lien du site Babillard Forever :", ns.SITE_URL)
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

-- Nom d'une icône du jeu: « Interface\\Icons\\INV_Helmet_01 » -> « inv_helmet_01 ». Vide si on ne reconnaît pas un
-- chemin (par exemple un simple numéro de fichier): le site n'affiche alors pas d'image pour cette pièce.
local function IconName(texture)
    if type(texture) ~= "string" or (issecretvalue and issecretvalue(texture)) then return "" end
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

-- Talents (API de Classic): trois arbres, points dépensés dans chacun, et chaque talent avec au moins un rang.
-- Si le jeu n'a pas ces fonctions ou les renvoie autrement, on rend une liste vide: rien n'est inventé.
local function Pack(f, ...)
    if type(f) ~= "function" then return {} end
    local res = { pcall(f, ...) }
    if not res[1] then return {} end
    table.remove(res, 1)
    return res
end

function ns.GetTalents()
    local tabs, talents = {}, {}
    local n = Pack(GetNumTalentTabs)[1]
    if type(n) ~= "number" or n < 1 then return tabs, talents end
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
    local name, realm = UnitFullName("player")
    local className, classFile = UnitClass("player")
    local race = UnitRace("player")
    return {
        name = name or "?",
        realm = (realm and realm ~= "") and realm or (GetNormalizedRealmName() or ""),
        region = (GetCurrentRegionName and GetCurrentRegionName()) or "",
        faction = ns.MyFaction(),
        className = className or "",
        classFile = classFile or "",
        race = race or "",
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
--   ta = talents appris   nom:rang:arbre(1-3),...
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
        realm = (realm and realm ~= "") and realm:gsub("[%s%-]", "") or (GetNormalizedRealmName() or "")
        local full = name .. "-" .. realm
        if ns.db.known[full] or full == ns.Me() then
            tt:AddLine("|cff33aaff[FR]|r |cffaaaaaaBabillard Forever FR|r")
        end
    end)
end

if TooltipDataProcessor and TooltipDataProcessor.AddTooltipPostCall and Enum and Enum.TooltipDataType then
    TooltipDataProcessor.AddTooltipPostCall(Enum.TooltipDataType.Unit, AddFlagToTooltip)
else
    GameTooltip:HookScript("OnTooltipSetUnit", AddFlagToTooltip)
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

    ns.Refresh()
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
    local who = (className and className ~= "" and (className:lower() .. " ") or "") .. "niv " .. ns.MyLevel()
    local role = ns.db and ns.db.myRoles and d.roles and FirstCommonRole(d.roles, ns.db.myRoles)
    local text = "Salut, " .. who
    if role then text = text .. ", je peux faire " .. ns.ROLE_INFO[role].name end
    return (text .. " pour " .. a.name .. "."):sub(1, 250)
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
            local name = UnitName(unit)
            if name then ns.requests[ns.BareName(name)] = nil end
        end
    end
end

function ns.IsIgnored(name)
    return ns.db and ns.db.ignored and ns.db.ignored[ns.BareName(name)] and true or false
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
    ns.Print(ns.ShortName(name) .. " est ignoré: ses annonces ne s'affichent plus. |cffffd100/bf ignores|r pour voir ou vider la liste.")
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
function ns.OnChat(text, sender, channelBase)
    local o = ns.db and ns.db.opts
    if not o or not o.chatReading then return end
    if issecretvalue and (issecretvalue(text) or issecretvalue(sender) or issecretvalue(channelBase)) then return end
    if type(text) ~= "string" or type(sender) ~= "string" or sender == "" then return end
    if ns.IsMe(sender) or ns.IsIgnored(sender) then return end
    -- La défense locale ne contient pas d'annonces de groupe.
    local base = ns.NormalizeText(tostring(channelBase or ""))
    if base:find("defense", 1, true) or base:find("defence", 1, true) then return end

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
        note = ns.Clean(note):sub(1, 100), time = GetTime(), ruleset = "", source = "chat",
    }
    ns.listings[sender] = l
    if not prev or prev.akey ~= l.akey or prev.type ~= l.type then
        ns.CheckAlert(l)
    end
    ns.Refresh()
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
        ns.Print("annonce non publiée dans le chat (attends encore " .. math.ceil(wait) .. " s pour ne pas faire de spam).")
        return false
    end
    local id = FindChatChannel()
    if not id then
        ns.Print("aucun canal « Recherche de groupe » ou « Général » trouvé: ton annonce n'est pas dans le chat.")
        return false
    end
    local send = (C_ChatInfo and C_ChatInfo.SendChatMessage) or SendChatMessage
    local ok = pcall(send, ns.ChatText(l, ns.db.opts.chatTag), "CHANNEL", nil, id)
    if not ok then
        ns.Print("le jeu a refusé d'envoyer l'annonce dans le chat.")
        return false
    end
    lastChatPost = GetTime()
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
    local limit = time() - 60 * 24 * 3600
    for name, t in pairs(ns.db.known) do
        if type(t) ~= "number" or t < limit then ns.db.known[name] = nil end
    end
end

local ev = CreateFrame("Frame")
ev:RegisterEvent("ADDON_LOADED")
ev:RegisterEvent("PLAYER_LOGIN")
ev:RegisterEvent("PLAYER_ENTERING_WORLD")
ev:RegisterEvent("CHAT_MSG_ADDON")
ev:RegisterEvent("GROUP_ROSTER_UPDATE")
ev:RegisterEvent("PLAYER_LEVEL_UP")
ev:RegisterEvent("PLAYER_GUILD_UPDATE")
ev:RegisterEvent("CHAT_MSG_CHANNEL")
ev:RegisterEvent("CHAT_MSG_YELL")
pcall(ev.RegisterEvent, ev, "PLAYER_ROLES_ASSIGNED")   -- n'existe pas dans toutes les versions du jeu

ev:SetScript("OnEvent", function(_, event, ...)
    if event == "ADDON_LOADED" then
        if ... ~= ADDON then return end
        BabillardForeverFRDB = BabillardForeverFRDB or {}
        ns.db = BabillardForeverFRDB
        ApplyDefaults(ns.db, DEFAULTS)
        PruneKnown()
        if ns.OnDBReady then ns.OnDBReady() end

    elseif event == "PLAYER_LOGIN" then
        RestoreMyState()
        -- Une version plus récente vue lors d'une session passée reste affichée tant qu'on ne met pas à jour.
        local newest, mine = ns.VersionNumber(ns.db.newestText), ns.VersionNumber(ns.VERSION)
        if newest and mine and newest > mine then ns.newVersion = ns.db.newestText else ns.db.newestSeen, ns.db.newestText = nil, nil end
        -- Les canaux ne sont pas prêts tout de suite à la connexion
        C_Timer.After(5, function()
            ns.EnsureChannel()
            C_Timer.After(3, function()
                local _, class = UnitClass("player")
                ns.Send("H2;" .. ns.MyLevel() .. ";" .. (class or "") .. ";" .. ns.VERSION)
                ns.RequestAll()
            end)
        end)
        if not ns.db.welcomed then
            ns.db.welcomed = true
            C_Timer.After(8, function()
                ns.Print("installé! Tape |cffffd100/bf|r ou clique sur le bouton de la minimap pour ouvrir le babillard.")
            end)
        end
        -- Vérifications régulières : expiration, rappel, canal
        C_Timer.NewTicker(10, function()
            ns.Prune()
            CheckReminder()
            ns.Refresh()
        end)
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
        ns.OnChat(text, sender, channelBase)

    elseif event == "CHAT_MSG_YELL" then
        local text, sender = ...
        ns.OnChat(text, sender, "")

    elseif event == "GROUP_ROSTER_UPDATE" or event == "PLAYER_ROLES_ASSIGNED" then
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
    if arg == "site" then
        ns.ShowSiteLink()
    elseif arg == "options" then
        if ns.OpenOptions then ns.OpenOptions() end
    elseif arg == "favoris" then
        ns.OpenFavMenu()
    elseif arg == "demandes" then
        local n = 0
        for _, r in pairs(ns.requests) do
            n = n + 1
            local a = ns.ACT_BY_KEY[r.akey]
            local age = GetTime() - r.time
            print("  " .. ns.ShortName(r.sender) .. " : " .. (a and a.name or "?") .. " (il y a " .. math.floor(age / 60) .. " min" ..
                (age > 300 and ", sans réponse" or "") .. ")")
        end
        if n == 0 then ns.Print("aucune demande en cours. Elles s'affichent ici après un clic sur Chuchoter.") end
    elseif arg == "ignores" or arg == "ignorés" then
        local names = {}
        for bare in pairs(ns.db.ignored) do tinsert(names, bare) end
        table.sort(names)
        if #names == 0 then ns.Print("aucun joueur ignoré.") else ns.Print("joueurs ignorés : " .. table.concat(names, ", ")) end
    elseif arg == "ignores vider" then
        wipe(ns.db.ignored)
        ns.Print("la liste des joueurs ignorés est vide.")
        ns.Refresh()
    elseif arg == "guildes" then
        if ns.UI then ns.UI.Open(2) end
    elseif arg == "perso" or arg == "code" then
        if ns.UI then ns.UI.Open(3) end
    elseif arg == "aide" then
        ns.Print("commandes :")
        print("  |cffffd100/bf|r : ouvrir ou fermer le babillard")
        print("  |cffffd100/bf guildes|r : guildes francophones")
        print("  |cffffd100/bf perso|r : mon personnage et code pour le site")
        print("  |cffffd100/bf site|r : lien du site")
        print("  |cffffd100/bf favoris|r : choisir les activités qui déclenchent une alerte")
        print("  |cffffd100/bf demandes|r : les groupes à qui tu as chuchoté")
        print("  |cffffd100/bf ignores|r : joueurs ignorés (|cffffd100/bf ignores vider|r pour tout retirer)")
        print("  |cffffd100/bf options|r : options")
    else
        if ns.UI then ns.UI.Toggle() end
    end
end
