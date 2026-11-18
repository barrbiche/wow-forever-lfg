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
        levelOnly       = true,
    },
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
    return Ambiguate(name or "?", "none")
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

function ns.RolesText(set)
    local t = {}
    for _, key in ipairs(ns.ROLE_ORDER) do
        if set[key] then tinsert(t, ns.ROLE_INFO[key].name) end
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
    return table.concat({ "L2", l.type, l.cat, l.akey, ns.EncodeRoles(l.roles), l.class,
        l.level, l.faction, l.size, l.groupCount, age, l.note }, ";")
end

local function GuildMessage(g)
    local age = math.max(0, math.floor(GetTime() - g.time))
    return table.concat({ "G2", g.guild, g.focus, g.faction, g.class, g.level, age, g.note }, ";")
end

local function SaveMyState()
    if not ns.db then return end
    local now = time()
    if ns.my then
        ns.db.myListing = { type = ns.my.type, akey = ns.my.akey, roles = CopyTable(ns.my.roles),
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
    local _, class = UnitClass("player")
    local l = {
        sender = ns.Me(), type = p.type, cat = a.cat, akey = a.key, roles = CopyTable(p.roles),
        class = class or "", level = ns.MyLevel(), faction = ns.MyFaction(), size = a.size,
        groupCount = math.max(1, GetNumGroupMembers()), note = ns.Clean(p.note):sub(1, 120),
        time = GetTime(),
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
    ns.PublishListing({ type = ns.my.type, akey = ns.my.akey, roles = ns.my.roles, note = ns.my.note })
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
    local _, class = UnitClass("player")
    local g = {
        sender = ns.Me(), guild = ns.Clean(guild), focus = focus, faction = ns.MyFaction(),
        class = class or "", level = ns.MyLevel(), note = ns.Clean(note):sub(1, 120), time = GetTime(),
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
    if not o or not o.alerts or l.sender == ns.Me() then return end
    if InCombatLockdown() then return end
    if IsInInstance() and not o.alertInInstance then return end
    if o.sameFaction and l.faction ~= ns.MyFaction() then return end
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
    elseif l.type == "LFG" and ns.my and ns.my.type == "LFM" and ns.my.akey == l.akey then
        -- Quelqu'un cherche un groupe pour ce que mon groupe fait
        local r = FirstCommonRole(l.roles, ns.my.roles)
        if r then
            text = string.format("%s (%s) cherche un groupe pour %s", who, ns.ROLE_INFO[r].name, a.name)
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
    if ns.my.type == "LFG" and IsInGroup() then
        ns.WithdrawListing("annonce retirée : tu as rejoint un groupe.")
    elseif ns.my.type == "LFM" and GetNumGroupMembers() >= (ns.my.size or 5) then
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

function ns.GetItemLevel()
    if not GetAverageItemLevel then return nil end
    local ok, overall, equipped = pcall(GetAverageItemLevel)
    if ok and (equipped or overall) then return math.floor(equipped or overall) end
end

function ns.GetCharacterInfo()
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
        professions = ns.GetProfessions(),
    }
end

-- Format : BFFR1;cle=valeur;cle=valeur...  (métiers : nom:rang:max,nom:rang:max)
function ns.BuildExportCode()
    local c = ns.GetCharacterInfo()
    local function F(v) return ((tostring(v or "")):gsub("[|;=,:]", " ")) end
    local profs = {}
    for _, p in ipairs(c.professions) do
        tinsert(profs, F(p.name) .. ":" .. p.rank .. ":" .. p.max)
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
        "p=" .. table.concat(profs, ","),
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
    msg = msg:gsub("|", "")
    local f = { strsplit(";", msg) }
    local cmd = f[1]
    ns.MarkKnown(sender)

    if cmd == "L2" then
        local typ, akey = f[2], f[4]
        local a = ns.ACT_BY_KEY[akey or ""]
        if not ns.TYPES[typ or ""] or not a then return end
        local roles = ns.DecodeRoles(f[5])
        if not next(roles) then return end
        local prev = ns.listings[sender]
        local l = {
            sender = sender, type = typ, cat = a.cat, akey = a.key, roles = roles,
            class = f[6] or "", level = tonumber(f[7]) or 0, faction = f[8] or "",
            size = tonumber(f[9]) or a.size, groupCount = tonumber(f[10]) or 1,
            note = f[12] or "", time = GetTime() - ClampAge(f[11], ns.EXPIRE),
        }
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
        }

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
    -- H2 (bonjour) : rien d'autre à faire que MarkKnown

    ns.Refresh()
end

---------------------------------------------------------------------------
-- Événements
---------------------------------------------------------------------------
pcall(C_ChatInfo.RegisterAddonMessagePrefix, ns.PREFIX)

local function RestoreMyState()
    local now = time()
    local saved = ns.db.myListing
    if saved and ns.ACT_BY_KEY[saved.akey or ""] and now - (saved.epoch or 0) < ns.EXPIRE then
        local a = ns.ACT_BY_KEY[saved.akey]
        local _, class = UnitClass("player")
        ns.my = {
            sender = ns.Me(), type = saved.type, cat = a.cat, akey = a.key, roles = saved.roles or {},
            class = class or "", level = ns.MyLevel(), faction = ns.MyFaction(), size = a.size,
            groupCount = math.max(1, GetNumGroupMembers()), note = saved.note or "",
            time = GetTime() - (now - saved.epoch),
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
            time = GetTime() - (now - sg.epoch),
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
        -- Les canaux ne sont pas prêts tout de suite à la connexion
        C_Timer.After(5, function()
            ns.EnsureChannel()
            C_Timer.After(3, function()
                local _, class = UnitClass("player")
                ns.Send("H2;" .. ns.MyLevel() .. ";" .. (class or ""))
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

    elseif event == "GROUP_ROSTER_UPDATE" then
        CheckAutoRemove()
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
        print("  |cffffd100/bf options|r : options")
    else
        if ns.UI then ns.UI.Toggle() end
    end
end
