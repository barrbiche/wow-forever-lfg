-- Babillard Forever FR - Interface : onglets Groupes, Guildes et Mon perso
local ADDON, ns = ...
local L = ns.L

-- Bâti à ADDON_LOADED (Core.lua), une fois la langue choisie: tous les textes passent par L.
function ns.BuildUI()

local UI = {}
ns.UI = UI

local GROUP_ROWS = 10
local GUILD_ROWS = 12

local state = {
    view        = 1,
    mode        = "LFM",   -- l'addon sert à former des groupes: il n'y a plus de mode « je cherche un groupe »
    cat         = "Donjons",
    akey        = nil,
    lfmRoles    = { DPS = true },
    lfmCounts   = {},      -- places par rôle (raids et PvP): { TANK = 2, HEAL = 8, DPS = 25 }
    filterCat   = "Tous",
    scroll      = 0,
    guildFocus  = "PVE",
    guildScroll = 0,
    restoredFor = nil,
}

---------------------------------------------------------------------------
-- Look du site (fond nuit, cadres et titres dorés). Tout est protégé par pcall: si le jeu refuse une
-- étape (modèle de bouton différent, par exemple), le reste de l'interface s'affiche quand même.
---------------------------------------------------------------------------
local Skin = {}
ns.Skin = Skin
ns.skinErrors = 0
local WHITE = "Interface\\Buttons\\WHITE8X8"
local GOLD  = { 0.79, 0.64, 0.29 }    -- #c9a24a, le doré des cadres du site
local NIGHT = { 0.04, 0.05, 0.08 }    -- fond des panneaux

local function Try(f, ...)
    local ok = pcall(f, ...)
    if not ok then ns.skinErrors = ns.skinErrors + 1 end
    return ok
end

-- Fond uni derrière le contenu
function Skin.Fill(frame, r, g, b, a, layer, sublevel)
    local t = frame:CreateTexture(nil, layer or "BACKGROUND", nil, sublevel or 0)
    t:SetAllPoints()
    t:SetColorTexture(r, g, b, a)
    return t
end

-- Cadre d'un pixel
function Skin.Border(frame, c, a)
    local lines = {}
    for i = 1, 4 do
        lines[i] = frame:CreateTexture(nil, "BORDER")
        lines[i]:SetColorTexture(c[1], c[2], c[3], a)
    end
    lines[1]:SetPoint("TOPLEFT");     lines[1]:SetPoint("TOPRIGHT");    lines[1]:SetHeight(1)
    lines[2]:SetPoint("BOTTOMLEFT");  lines[2]:SetPoint("BOTTOMRIGHT"); lines[2]:SetHeight(1)
    lines[3]:SetPoint("TOPLEFT");     lines[3]:SetPoint("BOTTOMLEFT");  lines[3]:SetWidth(1)
    lines[4]:SetPoint("TOPRIGHT");    lines[4]:SetPoint("BOTTOMRIGHT"); lines[4]:SetWidth(1)
    return lines
end

-- Dégradé sur une texture. VERTICAL: couleur du bas, puis du haut. HORIZONTAL: gauche, puis droite.
-- Le jeu a changé de fonction selon les versions: on essaie la nouvelle, l'ancienne, sinon une couleur unie.
function Skin.Gradient(tex, orient, r1, g1, b1, a1, r2, g2, b2, a2)
    tex:SetColorTexture(1, 1, 1, 1)
    if CreateColor and tex.SetGradient
        and pcall(tex.SetGradient, tex, orient, CreateColor(r1, g1, b1, a1), CreateColor(r2, g2, b2, a2)) then
        return tex
    end
    if tex.SetGradientAlpha and pcall(tex.SetGradientAlpha, tex, orient, r1, g1, b1, a1, r2, g2, b2, a2) then return tex end
    tex:SetColorTexture((r1 + r2) / 2, (g1 + g2) / 2, (b1 + b2) / 2, (a1 + a2) / 2)
    return tex
end

-- Fond en dégradé vertical (bas foncé, haut plus clair)
function Skin.GradientFill(frame, bottom, top, layer, sublevel)
    local t = frame:CreateTexture(nil, layer or "BACKGROUND", nil, sublevel or 0)
    t:SetAllPoints()
    return Skin.Gradient(t, "VERTICAL", bottom[1], bottom[2], bottom[3], bottom[4], top[1], top[2], top[3], top[4])
end

-- Trait doré qui s'efface vers la droite (titres, séparateurs)
function Skin.FadeLine(parent, layer, alpha)
    local t = parent:CreateTexture(nil, layer or "ARTWORK")
    t:SetHeight(1)
    Skin.Gradient(t, "HORIZONTAL", GOLD[1], GOLD[2], GOLD[3], alpha or 0.8, GOLD[1], GOLD[2], GOLD[3], 0)
    return t
end

local BTN_BOTTOM, BTN_TOP = { 0.05, 0.055, 0.09, 1 }, { 0.16, 0.18, 0.27, 1 }
local SEL_BOTTOM, SEL_TOP = { 0.20, 0.15, 0.05, 1 }, { 0.42, 0.32, 0.10, 1 }
local GOLD_BOTTOM, GOLD_TOP = { 0.55, 0.38, 0.08, 1 }, { 0.98, 0.82, 0.40, 1 }

-- Couleurs du fond d'un bouton (normal, choisi, doré)
function Skin.SetButtonColors(b, bottom, top)
    if b.skinBg then
        Skin.Gradient(b.skinBg, "VERTICAL", bottom[1], bottom[2], bottom[3], bottom[4], top[1], top[2], top[3], top[4])
    end
end

-- Chaque étape est protégée à part: si le jeu en refuse une (les modèles de bouton changent d'une version à l'autre), les
-- autres se font quand même. Avant, un seul refus laissait le bouton sans fond (texte seul) ou avec le rouge du jeu dessous.
local function Blank(tex)
    if not tex then return end
    pcall(tex.SetTexture, tex, nil)
    pcall(tex.SetAtlas, tex, nil)
    pcall(tex.SetAlpha, tex, 0)
    pcall(tex.Hide, tex)
end

function Skin.Button(b)
    -- 1. Enlever le look rouge du jeu: morceaux nommés, textures d'état et toute texture déjà présente.
    for _, k in ipairs({ "Left", "Middle", "Center", "Right", "LeftSeparator", "RightSeparator" }) do
        if type(b[k]) == "table" then Blank(b[k]) end
    end
    for _, get in ipairs({ "GetNormalTexture", "GetPushedTexture", "GetDisabledTexture" }) do
        if b[get] then
            local ok, tex = pcall(b[get], b)
            if ok then Blank(tex) end
        end
    end
    local ok, regions = pcall(function() return { b:GetRegions() } end)
    if ok then
        for _, r in ipairs(regions) do
            if r.GetObjectType and r:GetObjectType() == "Texture" then Blank(r) end
        end
    end
    -- 2. Notre fond en relief (dégradé), un reflet en haut et le cadre doré (créés après le ménage).
    Try(function() b.skinBg = Skin.GradientFill(b, BTN_BOTTOM, BTN_TOP) end)
    Try(function()
        local shine = b:CreateTexture(nil, "BORDER")
        shine:SetPoint("TOPLEFT", 1, -1)
        shine:SetPoint("TOPRIGHT", -1, -1)
        shine:SetHeight(1)
        shine:SetColorTexture(1, 1, 1, 0.12)
    end)
    Try(function() b.skinBorder = Skin.Border(b, GOLD, 0.55) end)
    -- 3. Survol: lueur dorée qui monte du bas.
    Try(function()
        b:SetHighlightTexture(WHITE)
        local h = b:GetHighlightTexture()
        if h then
            h:SetBlendMode("ADD")
            Skin.Gradient(h, "VERTICAL", 1, 0.82, 0.3, 0.22, 1, 0.82, 0.3, 0.04)
        end
    end)
    -- 4. Enfoncé au clic, texte doré bien lisible au-dessus du fond.
    Try(function() b:SetPushedTextOffset(1, -1) end)
    Try(function()
        local fs = b:GetFontString()
        if fs then fs:SetDrawLayer("OVERLAY"); fs:SetTextColor(1, 0.84, 0.25) end
    end)
end

-- Bouton principal (Publier, Rejoindre, Copier mon code): doré, texte foncé.
function Skin.Primary(b)
    Try(Skin.SetButtonColors, b, GOLD_BOTTOM, GOLD_TOP)
    Try(function()
        for _, line in ipairs(b.skinBorder or {}) do line:SetColorTexture(1, 0.9, 0.55, 0.9) end
        local fs = b:GetFontString()
        if fs then fs:SetTextColor(0.12, 0.07, 0.01); fs:SetShadowColor(1, 0.95, 0.7, 0.35) end
        local h = b:GetHighlightTexture()
        if h then Skin.Gradient(h, "VERTICAL", 1, 1, 1, 0.05, 1, 1, 1, 0.28) end
    end)
end

---------------------------------------------------------------------------
-- Petits outils pour bâtir l'interface
---------------------------------------------------------------------------
local function MakePanel(parent, top, bottom)
    local p = CreateFrame("Frame", nil, parent)
    Try(function()
        Skin.GradientFill(p, { 0.03, 0.035, 0.06, 0.97 }, { 0.075, 0.085, 0.13, 0.97 })
        Skin.Border(p, GOLD, 0.35)
        -- Filet doré en haut, plus vif à gauche
        local accent = p:CreateTexture(nil, "BORDER")
        accent:SetPoint("TOPLEFT", 1, -1)
        accent:SetPoint("TOPRIGHT", -1, -1)
        accent:SetHeight(2)
        Skin.Gradient(accent, "HORIZONTAL", GOLD[1], GOLD[2], GOLD[3], 0.9, GOLD[1], GOLD[2], GOLD[3], 0.05)
    end)
    p:SetPoint("TOPLEFT", 12, top)
    if bottom < 0 then
        p:SetPoint("BOTTOMRIGHT", parent, "TOPRIGHT", -12, bottom)
    else
        p:SetPoint("BOTTOMRIGHT", -12, bottom)
    end
    return p
end

local function SectionTitle(parent, text, x, y)
    local s = parent:CreateFontString(nil, "OVERLAY", "GameFontNormal")
    s:SetPoint("TOPLEFT", x, y)
    s:SetText(text)
    Try(function()
        s:SetTextColor(1, 0.84, 0.3)
        s:SetShadowOffset(1, -1)
        local line = Skin.FadeLine(parent, "ARTWORK", 0.7)
        line:SetPoint("LEFT", s, "RIGHT", 8, 0)
        line:SetWidth(180)
    end)
    return s
end

local function Tooltip(frame, title, text)
    frame:HookScript("OnEnter", function(self)
        GameTooltip:SetOwner(self, "ANCHOR_TOP")
        GameTooltip:AddLine(title)
        if text then GameTooltip:AddLine(text, 1, 1, 1, true) end
        GameTooltip:Show()
    end)
    frame:HookScript("OnLeave", GameTooltip_Hide)
end

-- Rangée de boutons où un seul est choisi
local function MakeSegmented(parent, items, width, x, y, isSelected, onSelect, small)
    local buttons = {}
    for i, it in ipairs(items) do
        local b = CreateFrame("Button", nil, parent, "UIPanelButtonTemplate")
        Skin.Button(b)
        b:SetSize(width, 22)
        b:SetPoint("TOPLEFT", x + (i - 1) * (width + 4), y)
        b:SetText(it.label)
        b.value = it.value
        Try(function()
            b.selBar = b:CreateTexture(nil, "OVERLAY")
            b.selBar:SetPoint("BOTTOMLEFT", 2, 1)
            b.selBar:SetPoint("BOTTOMRIGHT", -2, 1)
            b.selBar:SetHeight(2)
            b.selBar:SetColorTexture(1, 0.84, 0.3, 1)
            b.selBar:Hide()
        end)
        b:SetScript("OnClick", function()
            ns.PlayClick()
            onSelect(it.value)
        end)
        buttons[i] = b
    end
    buttons.Update = function()
        for _, b in ipairs(buttons) do
            local sel = isSelected(b.value)
            if sel then
                b:SetNormalFontObject(small and "GameFontNormalSmall" or "GameFontNormal")
                Try(Skin.SetButtonColors, b, SEL_BOTTOM, SEL_TOP)
            else
                b:SetNormalFontObject(small and "GameFontDisableSmall" or "GameFontDisable")
                Try(Skin.SetButtonColors, b, BTN_BOTTOM, BTN_TOP)
            end
            if b.selBar then b.selBar:SetShown(sel) end
            b:SetHighlightFontObject(small and "GameFontHighlightSmall" or "GameFontHighlight")
        end
    end
    return buttons
end

-- Icônes de rôles (on peut en choisir plusieurs)
-- getCounts / countsActive (facultatifs): places par rôle, réglées à la molette quand l'activité a plus de 5 places
local function MakeRoleIcons(parent, x, y, size, getSet, onChange, getCounts, countsActive)
    local btns = {}
    for i, key in ipairs(ns.ROLE_ORDER) do
        local info = ns.ROLE_INFO[key]
        local b = CreateFrame("Button", nil, parent)
        b:SetSize(size, size)
        b:SetPoint("TOPLEFT", x + (i - 1) * (size + 6), y)
        b.icon = b:CreateTexture(nil, "ARTWORK")
        b.icon:SetAllPoints()
        ns.SetIcon(b.icon, info.atlas, info.icon)
        b.check = b:CreateTexture(nil, "OVERLAY")
        b.check:SetTexture("Interface\\Buttons\\CheckButtonHilight")
        b.check:SetBlendMode("ADD")
        b.check:SetAllPoints()
        b:SetHighlightTexture("Interface\\Buttons\\ButtonHilight-Square", "ADD")
        b.key = key
        b:SetScript("OnClick", function()
            local set = getSet()
            set[key] = (not set[key]) or nil
            ns.PlayClick()
            btns.Update()
            if onChange then onChange() end
        end)
        if getCounts then
            b.num = b:CreateFontString(nil, "OVERLAY", "NumberFontNormal")
            b.num:SetPoint("BOTTOMRIGHT", 2, 0)
            b:EnableMouseWheel(true)
            b:SetScript("OnMouseWheel", function(_, delta)
                if not (countsActive and countsActive()) then return end
                local set, counts = getSet(), getCounts()
                local n = (counts[key] or 1) + (delta > 0 and 1 or -1)
                counts[key] = math.max(1, math.min(40, n))
                set[key] = true
                ns.PlayClick()
                btns.Update()
                if onChange then onChange() end
            end)
        end
        b:SetScript("OnEnter", function(self)
            GameTooltip:SetOwner(self, "ANCHOR_TOP")
            GameTooltip:AddLine(info.name)
            GameTooltip:AddLine(L["Clique pour l'activer ou le désactiver."], 1, 1, 1)
            if getCounts and countsActive and countsActive() then
                GameTooltip:AddLine(L["Molette : combien de joueurs de ce rôle tu cherches (raid, champ de bataille)."], 0.7, 0.9, 1, true)
            end
            GameTooltip:Show()
        end)
        b:SetScript("OnLeave", GameTooltip_Hide)
        btns[i] = b
    end
    btns.Update = function()
        local set = getSet() or {}
        for _, b in ipairs(btns) do
            local sel = set[b.key] and true or false
            b.icon:SetDesaturated(not sel)
            b.icon:SetAlpha(sel and 1 or 0.35)
            b.check:SetShown(sel)
            if b.num then
                local n = getCounts and getCounts()[b.key]
                local show = sel and n and countsActive and countsActive()
                b.num:SetText(show and n or "")
            end
        end
    end
    return btns
end

-- Champ texte avec un exemple en gris quand il est vide
local function MakeInput(parent, placeholder, width, maxLetters, x, y)
    local eb = CreateFrame("EditBox", nil, parent, "InputBoxTemplate")
    eb:SetSize(width, 22)
    eb:SetPoint("TOPLEFT", x, y)
    eb:SetAutoFocus(false)
    eb:SetMaxLetters(maxLetters)
    -- Look du site: fond foncé, cadre doré qui s'allume quand on écrit.
    for _, k in ipairs({ "Left", "Middle", "Right" }) do
        if type(eb[k]) == "table" then Blank(eb[k]) end
    end
    Try(function()
        Skin.GradientFill(eb, { 0.02, 0.025, 0.04, 1 }, { 0.06, 0.065, 0.1, 1 })
        eb.skinBorder = Skin.Border(eb, GOLD, 0.4)
        eb:SetTextInsets(6, 6, 0, 0)
        local function Glow(a) for _, l in ipairs(eb.skinBorder) do l:SetColorTexture(GOLD[1], GOLD[2], GOLD[3], a) end end
        eb:HookScript("OnEditFocusGained", function() Glow(1) end)
        eb:HookScript("OnEditFocusLost", function() Glow(0.4) end)
    end)
    eb.ph = eb:CreateFontString(nil, "ARTWORK", "GameFontDisable")
    eb.ph:SetPoint("LEFT", 6, 0)
    eb.ph:SetText(placeholder)
    local function UpdatePh() eb.ph:SetShown(eb:GetText() == "" and not eb:HasFocus()) end
    eb:HookScript("OnEditFocusGained", UpdatePh)
    eb:HookScript("OnEditFocusLost", UpdatePh)
    eb:HookScript("OnTextChanged", UpdatePh)
    eb:SetScript("OnEnterPressed", eb.ClearFocus)
    eb:SetScript("OnEscapePressed", eb.ClearFocus)
    eb.UpdatePh = UpdatePh
    return eb
end

local function MakeButton(parent, text, w, h)
    local b = CreateFrame("Button", nil, parent, "UIPanelButtonTemplate")
    Skin.Button(b)
    b:SetSize(w, h)
    b:SetText(text)
    return b
end

local function MakeCheck(parent, label)
    local cb = ns.SafeCreate("CheckButton", nil, parent, "UICheckButtonTemplate", "OptionsBaseCheckButtonTemplate")
    cb:SetSize(24, 24)
    cb.label = parent:CreateFontString(nil, "OVERLAY", "GameFontHighlightSmall")
    cb.label:SetPoint("LEFT", cb, "RIGHT", 2, 0)
    cb.label:SetText(label)
    return cb
end

-- Chuchoter / inviter
local function DoWhisper(name, d)
    name = ns.WhisperName(name)
    -- Message de présentation déjà écrit dans la boîte de chat: tu appuies sur Entrée pour l'envoyer.
    -- On n'écrit pas « /w Nom Prénom texte »: le jeu prendrait seulement le premier mot comme destinataire. On ouvre plutôt
    -- la boîte « Chuchoter à » comme le clic droit, puis on y met le texte.
    local text = d and ns.db.opts.whisperTemplate and ns.WhisperText(d)
    if d then ns.RecordRequest(d) end
    local sendTell = ChatFrame_SendTell or (ChatFrameUtil and ChatFrameUtil.SendTell)
    if not sendTell then return end
    sendTell(name)
    if text then
        local getActive = ChatEdit_GetActiveWindow or (ChatFrameUtil and ChatFrameUtil.GetActiveWindow)
        local box = getActive and getActive()
        if box and box.SetText then box:SetText(text) end
    end
end

local function DoInvite(name)
    name = ns.WhisperName(name)
    if C_PartyInfo and C_PartyInfo.InviteUnit then
        C_PartyInfo.InviteUnit(name)
    elseif InviteUnit then
        InviteUnit(name)
    end
end

-- Lignes de liste : survol = surbrillance + boutons + info-bulle
local function RowLeave(row)
    if row:IsMouseOver() then return end
    row.hl:Hide()
    row.hlBar:Hide()
    for _, b in ipairs(row.actions) do b:Hide() end
    if row.age then row.age:Show() end
    GameTooltip:Hide()
end

local function MakeRow(list, i, onTooltip)
    local row = CreateFrame("Frame", nil, list)
    row:SetHeight(26)
    row:SetPoint("TOPLEFT", 4, -28 - (i - 1) * 27)
    row:SetPoint("TOPRIGHT", -4, -28 - (i - 1) * 27)
    row:EnableMouse(true)
    row.bg = row:CreateTexture(nil, "BACKGROUND")
    row.bg:SetAllPoints()
    row.bg:SetColorTexture(1, 0.9, 0.6, (i % 2 == 0) and 0.035 or 0)
    row.hl = row:CreateTexture(nil, "BORDER")
    row.hl:SetAllPoints()
    Skin.Gradient(row.hl, "HORIZONTAL", 1, 0.82, 0.3, 0.2, 1, 0.82, 0.3, 0.02)
    row.hl:Hide()
    row.hlBar = row:CreateTexture(nil, "ARTWORK")
    row.hlBar:SetPoint("TOPLEFT")
    row.hlBar:SetPoint("BOTTOMLEFT")
    row.hlBar:SetWidth(2)
    row.hlBar:SetColorTexture(1, 0.84, 0.3, 1)
    row.hlBar:Hide()
    row.actions = {}
    row:SetScript("OnEnter", function(self)
        if not self.data then return end
        self.hl:Show()
        self.hlBar:Show()
        local any = false
        for _, b in ipairs(self.actions) do
            if b.enabledFor(self.data) then b:Show(); any = true else b:Hide() end
        end
        if any and self.age then self.age:Hide() end
        GameTooltip:SetOwner(self, "ANCHOR_RIGHT")
        onTooltip(self.data)
        GameTooltip:Show()
    end)
    row:SetScript("OnLeave", RowLeave)
    row:Hide()
    return row
end

local function AddRowAction(row, text, width, enabledFor, onClick)
    local b = MakeButton(row, text, width, 20)
    local prev = row.actions[#row.actions]
    if prev then
        b:SetPoint("RIGHT", prev, "LEFT", -2, 0)
    else
        b:SetPoint("RIGHT", -2, 0)
    end
    b.enabledFor = enabledFor
    b:SetScript("OnClick", function() onClick(row.data) end)
    b:SetScript("OnLeave", function() RowLeave(row) end)
    b:Hide()
    tinsert(row.actions, b)
    return b
end

local function HeaderText(list, text, x)
    local h = list:CreateFontString(nil, "OVERLAY", "GameFontNormalSmall")
    h:SetPoint("TOPLEFT", x, -8)
    h:SetText(text)
    return h
end

local function HeaderLine(list)
    -- Bande d'en-tête un peu plus claire, puis un trait doré plus vif au centre.
    Try(function()
        local band = list:CreateTexture(nil, "BACKGROUND", nil, 1)
        band:SetPoint("TOPLEFT", 1, -3)
        band:SetPoint("TOPRIGHT", -1, -3)
        band:SetHeight(21)
        Skin.Gradient(band, "VERTICAL", 1, 0.84, 0.3, 0.02, 1, 0.84, 0.3, 0.08)
    end)
    local left = list:CreateTexture(nil, "ARTWORK")
    left:SetHeight(1)
    left:SetPoint("TOPLEFT", 6, -24)
    left:SetPoint("TOPRIGHT", list, "TOP", 0, -24)
    Skin.Gradient(left, "HORIZONTAL", GOLD[1], GOLD[2], GOLD[3], 0.1, GOLD[1], GOLD[2], GOLD[3], 0.8)
    local right = list:CreateTexture(nil, "ARTWORK")
    right:SetHeight(1)
    right:SetPoint("TOPLEFT", list, "TOP", 0, -24)
    right:SetPoint("TOPRIGHT", -6, -24)
    Skin.Gradient(right, "HORIZONTAL", GOLD[1], GOLD[2], GOLD[3], 0.8, GOLD[1], GOLD[2], GOLD[3], 0.1)
end

local function FactionTag(faction)
    if faction == ns.MyFaction() then return "" end
    if faction == "Horde" then return " |cffff5555[H]|r" end
    if faction == "Alliance" then return " |cff5599ff[A]|r" end
    return ""
end

---------------------------------------------------------------------------
-- Fenêtre principale
---------------------------------------------------------------------------
local f = ns.SafeCreate("Frame", "BabillardFRFrame", UIParent, "PortraitFrameTemplate", "BasicFrameTemplateWithInset")
f:SetSize(600, 600)
f:SetPoint("CENTER")
f:SetMovable(true)
f:SetClampedToScreen(true)
f:EnableMouse(true)
f:RegisterForDrag("LeftButton")
f:SetScript("OnDragStart", f.StartMoving)
f:SetScript("OnDragStop", f.StopMovingOrSizing)
f:SetFrameStrata("HIGH")
f:SetToplevel(true)
f:Hide()
tinsert(UISpecialFrames, "BabillardFRFrame")
UI.frame = f

if f.SetTitle then
    f:SetTitle("Babillard Forever FR")
else
    local t = f:CreateFontString(nil, "OVERLAY", "GameFontHighlight")
    t:SetPoint("TOP", 0, -5)
    t:SetText("Babillard Forever FR")
end
if f.SetPortraitToAsset then f:SetPortraitToAsset(ns.ICON) end
-- Fond nuit derrière tout le contenu (sous le cadre et le titre du jeu)
Try(function()
    local night = f:CreateTexture(nil, "BACKGROUND", nil, 7)
    night:SetPoint("TOPLEFT", 6, -26)
    night:SetPoint("BOTTOMRIGHT", -6, 26)
    Skin.Gradient(night, "VERTICAL", 0.025, 0.03, 0.05, 1, 0.085, 0.095, 0.15, 1)
end)
-- Lueur dorée discrète sous le titre
Try(function()
    local glow = f:CreateTexture(nil, "BACKGROUND", nil, 7)
    glow:SetPoint("TOPLEFT", 6, -26)
    glow:SetPoint("TOPRIGHT", -6, -26)
    glow:SetHeight(90)
    Skin.Gradient(glow, "VERTICAL", 1, 0.8, 0.35, 0, 1, 0.8, 0.35, 0.07)
end)
-- Pied de fenêtre: bande plus foncée séparée par un trait doré
Try(function()
    local foot = f:CreateTexture(nil, "BACKGROUND", nil, 7)
    foot:SetPoint("BOTTOMLEFT", 6, 4)
    foot:SetPoint("BOTTOMRIGHT", -6, 4)
    foot:SetHeight(28)
    Skin.Gradient(foot, "VERTICAL", 0.015, 0.018, 0.03, 1, 0.04, 0.045, 0.07, 1)
    local line = f:CreateTexture(nil, "BORDER")
    line:SetPoint("BOTTOMLEFT", foot, "TOPLEFT", 0, 0)
    line:SetPoint("BOTTOMRIGHT", foot, "TOPRIGHT", 0, 0)
    line:SetHeight(1)
    line:SetColorTexture(GOLD[1], GOLD[2], GOLD[3], 0.45)
end)
-- Ouverture en fondu
f:HookScript("OnShow", function(self)
    if UIFrameFadeIn then pcall(UIFrameFadeIn, self, 0.15, 0, 1) end
end)

local views = {}
for i = 1, 3 do
    views[i] = CreateFrame("Frame", nil, f)
    views[i]:SetAllPoints()
    views[i]:Hide()
end

---------------------------------------------------------------------------
-- Bannière « Communauté », collée au-dessus de la fenêtre: bien visible tant que le joueur n'en fait pas partie.
--   Une communauté existe pour moi : bouton Rejoindre (ouvre la fenêtre du jeu pour la rejoindre).
--   Aucune pour ma faction ou ma région : on demande à un joueur de la créer et d'envoyer le lien sur le site.
---------------------------------------------------------------------------
local banner = CreateFrame("Frame", nil, f)
banner:SetSize(600, 56)
banner:SetPoint("BOTTOM", f, "TOP", 0, 2)
banner:EnableMouse(true)
Try(function()
    Skin.GradientFill(banner, { 0.10, 0.06, 0.015, 0.97 }, { 0.30, 0.20, 0.06, 0.97 })
    Skin.Border(banner, GOLD, 1)
end)
banner.icon = banner:CreateTexture(nil, "ARTWORK")
banner.icon:SetSize(36, 36)
banner.icon:SetPoint("LEFT", 10, 0)
banner.icon:SetTexture(ns.ICON)
banner.title = banner:CreateFontString(nil, "OVERLAY", "GameFontNormalLarge")
banner.title:SetPoint("TOPLEFT", banner.icon, "TOPRIGHT", 10, 0)
banner.title:SetPoint("RIGHT", -150, 0)
banner.title:SetJustifyH("LEFT")
banner.text = banner:CreateFontString(nil, "OVERLAY", "GameFontHighlightSmall")
banner.text:SetPoint("TOPLEFT", banner.title, "BOTTOMLEFT", 0, -3)
banner.text:SetPoint("RIGHT", -150, 0)
banner.text:SetJustifyH("LEFT")
banner.join = MakeButton(banner, L["Rejoindre"], 110, 26)
Skin.Primary(banner.join)
banner.join:SetPoint("RIGHT", -34, 0)
banner.close = CreateFrame("Button", nil, banner, "UIPanelCloseButton")
banner.close:SetSize(24, 24)
banner.close:SetPoint("TOPRIGHT", -2, -2)
banner.close:SetScript("OnClick", function()
    ns.bannerHidden = true   -- jusqu'à la prochaine connexion
    banner:Hide()
end)
banner:Hide()

banner.join:SetScript("OnClick", function()
    ns.PlayClick()
    local code = ns.CommunityInvite()
    if code and SetItemRef then
        -- Comme un clic sur le lien dans le chat: le jeu ouvre sa fenêtre pour rejoindre la communauté.
        local link = "clubTicket:" .. code
        if pcall(SetItemRef, link, "|H" .. link .. "|h[" .. ns.COMMUNITY_NAME .. "]|h", "LeftButton") then
            ns.Print(L["si la fenêtre ne s'est pas ouverte, clique ici: |cff66ccff|H"] .. link .. L["|h[Rejoindre "] .. ns.COMMUNITY_NAME .. "]|h|r")
            return
        end
    end
    ns.ShowCommunityInvite()
end)
banner.join:SetScript("OnEnter", function(self)
    GameTooltip:SetOwner(self, "ANCHOR_RIGHT")
    GameTooltip:AddLine(L["Rejoindre la communauté"])
    GameTooltip:AddLine(L["Ouvre la fenêtre du jeu pour rejoindre « "] .. ns.COMMUNITY_NAME .. L[" ». Le lien est aussi écrit dans ton chat et prêt à copier."], 1, 1, 1, true)
    GameTooltip:Show()
end)
banner.join:SetScript("OnLeave", function() GameTooltip:Hide() end)

function UI.UpdateBanner()
    if ns.bannerHidden or ns.CommunityId() then banner:Hide() return end
    if not ns.MyRuleset() then
        banner.title:SetText(L["|cffffd100Joue avec les francophones de TOUS les serveurs!|r"])
        banner.text:SetText(L["Choisis d'abord ton type de serveur dans l'onglet Mon perso, puis rejoins la communauté."])
        banner.join:Hide()
    elseif ns.CommunityInvite() then
        banner.title:SetText(L["|cffffd100Joue avec les francophones de TOUS les serveurs!|r"])
        banner.text:SetText(L["Forever te place sur un serveur parmi plusieurs: sans la communauté, tu ne vois que le tien. Rejoins « "]
            .. ns.COMMUNITY_NAME .. L[" » en un clic."])
        banner.join:Show()
    else
        banner.title:SetText(L["|cffffd100Aucune communauté francophone pour ta faction... crée-la!|r"])
        banner.text:SetText(L["Crée une communauté nommée « "] .. ns.COMMUNITY_NAME .. L[" » (touche J), fais un lien d'invitation qui n'expire pas et envoie-le sur babillard-forever.com."])
        banner.join:Hide()
    end
    banner:Show()
end

-- Pied de fenêtre
local channelStatus = f:CreateFontString(nil, "OVERLAY", "GameFontNormalSmall")
channelStatus:SetPoint("BOTTOMLEFT", 18, 10)

local siteBtn = MakeButton(f, "babillard-forever.com", 180, 20)
siteBtn:SetPoint("BOTTOM", 0, 6)
siteBtn:SetScript("OnClick", function() ns.PlayClick(); ns.ShowSiteLink() end)
Tooltip(siteBtn, L["Le site du Babillard"], L["Annonces, guildes et profils, même hors du jeu."])

local refreshBtn = MakeButton(f, L["Actualiser"], 90, 20)
refreshBtn:SetPoint("BOTTOMRIGHT", -110, 6)
refreshBtn:SetScript("OnClick", function() ns.RefreshListings() end)
Tooltip(refreshBtn, L["Actualiser"], L["Redemande les annonces actives aux autres joueurs qui ont l'addon (groupes et guildes). Les nouvelles annonces arrivent d'elles-mêmes: ce bouton sert surtout après ta connexion ou si le babillard te semble vide."])

local optBtn = MakeButton(f, L["Options"], 90, 20)
optBtn:SetPoint("BOTTOMRIGHT", -14, 6)
optBtn:SetScript("OnClick", function()
    ns.PlayClick()
    f:Hide()
    if ns.OpenOptions then ns.OpenOptions() end
end)

-- Onglets du bas
local tabs = {}
local TAB_NAMES = { L["Groupes"], L["Guildes"], L["Mon perso"] }
for i, name in ipairs(TAB_NAMES) do
    local t = ns.SafeCreate("Button", "BabillardFRFrameTab" .. i, f, "PanelTabButtonTemplate", "UIPanelButtonTemplate")
    t:SetID(i)
    t:SetText(name)
    if t:GetWidth() < 10 then t:SetSize(110, 24) end
    if PanelTemplates_TabResize then pcall(PanelTemplates_TabResize, t, 0) end
    if i == 1 then
        t:SetPoint("TOPLEFT", f, "BOTTOMLEFT", 12, 2)
    else
        t:SetPoint("TOPLEFT", tabs[i - 1], "TOPRIGHT", 3, 0)
    end
    t:SetScript("OnClick", function()
        ns.PlayClick()
        UI.SelectView(i)
    end)
    tabs[i] = t
end
f.Tabs = tabs
f.numTabs = #tabs

---------------------------------------------------------------------------
-- Vue 1 : Groupes
---------------------------------------------------------------------------
local gv = views[1]
local G = {}   -- éléments de la vue Groupes

SectionTitle(gv, L["Mon annonce"], 70, -40)
local my = MakePanel(gv, -60, -208)

local function MyRolesSet()
    return state.lfmRoles
end

local function ValidateActivity()
    local a = state.akey and ns.ACT_BY_KEY[state.akey]
    if a and (a.cat ~= state.cat or not ns.ActivityFits(a, ns.MyLevel())) then
        state.akey = nil
    end
end

-- Menu déroulant des activités (seulement celles à ton niveau)
local function MakeActivityPicker(parent, x, y, width)
    local dd
    local ok = pcall(function()
        dd = CreateFrame("DropdownButton", nil, parent, "WowStyle1DropdownTemplate")
    end)
    if ok and dd and dd.SetupMenu then
        dd:SetWidth(width)
        dd:SetPoint("TOPLEFT", x, y)
        if dd.SetDefaultText then dd:SetDefaultText(L["Choisir une activité"]) end
        dd:SetupMenu(function(_, root)
            local list = ns.AvailableActivities(state.cat)
            root:CreateTitle(ns.CatName(state.cat) .. L[" faisables à ton niveau ("] .. ns.MyLevel() .. ")")
            if #list == 0 then
                root:CreateTitle(L["|cff888888Rien de faisable à ton niveau dans cette catégorie|r"])
            end
            for _, a in ipairs(list) do
                root:CreateRadio(ns.ActivityLabel(a),
                    function() return state.akey == a.key end,
                    function() state.akey = a.key; UI.UpdateMyPanel(false) end)
            end
        end)
        dd.Rebuild = function(self) if self.GenerateMenu then self:GenerateMenu() end end
        return dd
    end
    -- Plan B : bouton qui fait défiler les activités disponibles
    dd = MakeButton(parent, L["Choisir une activité"], width, 22)
    dd:SetPoint("TOPLEFT", x, y + 2)
    dd.Rebuild = function(self)
        local a = state.akey and ns.ACT_BY_KEY[state.akey]
        self:SetText(a and a.name or L["Choisir une activité"])
    end
    dd:SetScript("OnClick", function(self)
        local list = ns.AvailableActivities(state.cat)
        if #list == 0 then ns.Print(L["rien de faisable à ton niveau dans cette catégorie."]) return end
        local idx = 0
        for i, a in ipairs(list) do if a.key == state.akey then idx = i end end
        state.akey = list[idx % #list + 1].key
        ns.PlayClick()
        self:Rebuild()
        UI.UpdateMyPanel(false)
    end)
    return dd
end

G.mode = my:CreateFontString(nil, "OVERLAY", "GameFontNormal")
G.mode:SetPoint("TOPLEFT", 16, -14)
G.mode:SetText(L["Je forme un groupe"])

local catItems = {}
for _, c in ipairs(ns.CATEGORIES) do tinsert(catItems, { label = ns.CatName(c), value = c }) end
G.cat = MakeSegmented(my, catItems, 80, 12, -38,
    function(v) return state.cat == v end,
    function(v) state.cat = v; UI.UpdateMyPanel() end)

G.picker = MakeActivityPicker(my, 12, -68, 220)

G.rolesLabel = my:CreateFontString(nil, "OVERLAY", "GameFontNormalSmall")
G.rolesLabel:SetPoint("TOPRIGHT", my, "TOPLEFT", 326, -77)
G.rolesLabel:SetJustifyH("RIGHT")
G.roles = MakeRoleIcons(my, 332, -66, 28, MyRolesSet, nil,
    function() return state.lfmCounts end,
    function() local a = state.akey and ns.ACT_BY_KEY[state.akey]; return a and a.size > 5 end)

G.note = MakeInput(my, L["Note (optionnel) : ex. QC, vocal Discord, débutants bienvenus"], 410, 60, 18, -110)

G.alsoChat = MakeCheck(my, L["Aussi dans le chat"])
G.alsoChat:SetPoint("TOPLEFT", 316, -8)
G.alsoChat:SetScript("OnClick", function(self)
    ns.db.opts.alsoChat = self:GetChecked() and true or false
    ns.PlayClick()
end)
Tooltip(G.alsoChat, L["Aussi dans le chat"],
    L["Au clic sur Publier, l'annonce est aussi envoyée dans « Recherche de groupe » (ou « Général »). Une fois par minute au maximum."])

G.pub = MakeButton(my, L["Publier"], 120, 30)
Skin.Primary(G.pub)
G.pub:SetPoint("TOPRIGHT", -10, -10)
G.del = MakeButton(my, L["Retirer"], 120, 22)
G.del:SetPoint("TOP", G.pub, "BOTTOM", 0, -6)
G.status = my:CreateFontString(nil, "OVERLAY", "GameFontDisableSmall")
G.status:SetPoint("TOP", G.del, "BOTTOM", 0, -8)
G.status:SetWidth(130)

G.pub:SetScript("OnClick", function()
    ns.EnsureChannel()
    if IsInGroup() and not UnitIsGroupLeader("player") then
        ns.Print(L["c'est mieux que le chef du groupe publie l'annonce."])
    end
    local published = ns.PublishListing({
        type = state.mode, akey = state.akey, roles = MyRolesSet(), note = G.note:GetText(),
        counts = (ns.ACT_BY_KEY[state.akey or ""] or { size = 5 }).size > 5 and state.lfmCounts or nil,
    })
    if published and ns.db.opts.alsoChat then ns.PostToChat(ns.my) end
    if published and ns.db.opts.alsoCommunity then ns.PostToCommunity(ns.my) end
end)
G.del:SetScript("OnClick", function()
    ns.PlayClick()
    ns.WithdrawListing()
end)

-- Liste des annonces
SectionTitle(gv, L["Annonces"], 18, -214)
G.scrollText = gv:CreateFontString(nil, "OVERLAY", "GameFontDisableSmall")
G.scrollText:SetPoint("TOPRIGHT", -18, -216)

local filterItems = { { label = ns.CatName("Tous"), value = "Tous" } }
for _, c in ipairs(ns.CATEGORIES) do tinsert(filterItems, { label = ns.CatName(c), value = c }) end
G.filter = MakeSegmented(gv, filterItems, 78, 12, -232,
    function(v) return state.filterCat == v end,
    function(v) state.filterCat = v; state.scroll = 0; UI.Refresh() end, true)

G.levelCB = MakeCheck(gv, L["À mon niveau"])
G.levelCB:SetPoint("TOPLEFT", 418, -231)
G.levelCB:SetScript("OnClick", function(self)
    ns.db.opts.levelOnly = self:GetChecked() and true or false
    ns.PlayClick()
    state.scroll = 0
    UI.Refresh()
end)
Tooltip(G.levelCB, L["À mon niveau"], L["Cache les annonces pour des activités que tu ne peux pas faire."])

local glist = MakePanel(gv, -258, 32)
HeaderText(glist, L["Type"], 8)
HeaderText(glist, L["Rôles"], 100)
HeaderText(glist, L["Joueur"], 152)
HeaderText(glist, "Niv.", 282)
HeaderText(glist, L["Activité"], 314)
local ageH = glist:CreateFontString(nil, "OVERLAY", "GameFontNormalSmall")
ageH:SetPoint("TOPRIGHT", -10, -8)
ageH:SetText(L["Publié"])
HeaderLine(glist)

local function GroupTooltip(d)
    local a = ns.ACT_BY_KEY[d.akey]
    local t = ns.TYPES[d.type]
    GameTooltip:AddLine("|c" .. ns.ClassHex(d.class) .. ns.ShortName(d.sender) .. "|r" .. FactionTag(d.faction))
    if d.source == "chat" then
        GameTooltip:AddLine(L["Lu dans le chat"] .. (d.level > 0 and (L[" · niveau "] .. d.level) or "") .. "  ·  " .. d.faction, 0.8, 0.8, 0.8)
    else
        GameTooltip:AddLine(L["Niveau "] .. d.level .. "  ·  " .. d.faction, 0.8, 0.8, 0.8)
    end
    if ns.RulesetName(d.ruleset) then GameTooltip:AddLine(L["Serveur : "] .. ns.RulesetName(d.ruleset), 0.8, 0.8, 0.8) end
    GameTooltip:AddLine(" ")
    GameTooltip:AddLine("|c" .. t.color .. t.name .. "|r")
    GameTooltip:AddLine("|c" .. (ns.CAT_COLORS[d.cat] or "ffffffff") .. ns.CatName(d.cat) .. "|r : " .. a.name, 1, 1, 1, true)
    GameTooltip:AddLine(L["Niveaux "] .. a.min .. L[" à "] .. a.max, 0.6, 0.8, 1)
    local hasRoles = next(d.roles) ~= nil
    if d.type == "LFM" then
        if hasRoles then GameTooltip:AddLine(L["Recherche : "] .. ns.RolesText(d.roles, d.counts), 1, 0.82, 0) end
        if d.source ~= "chat" then GameTooltip:AddLine(L["Groupe : "] .. d.groupCount .. "/" .. d.size, 0.8, 0.8, 0.8) end
    elseif hasRoles then
        GameTooltip:AddLine(L["Peut jouer : "] .. ns.RolesText(d.roles), 1, 0.82, 0)
    end
    if d.note ~= "" then GameTooltip:AddLine(d.note, 0.7, 0.7, 0.7, true) end
    GameTooltip:AddLine(L["Publié : "] .. ns.Ago(d.time), 0.5, 0.5, 0.5)
end

G.rows = {}
for i = 1, GROUP_ROWS do
    local row = MakeRow(glist, i, GroupTooltip)
    row.typeText = row:CreateFontString(nil, "OVERLAY", "GameFontHighlightSmall")
    row.typeText:SetPoint("LEFT", 4, 0)
    row.typeText:SetWidth(90)
    row.typeText:SetJustifyH("LEFT")
    row.roleIcons = {}
    for j = 1, 3 do
        local ic = row:CreateTexture(nil, "ARTWORK")
        ic:SetSize(14, 14)
        ic:SetPoint("LEFT", 96 + (j - 1) * 16, 0)
        row.roleIcons[j] = ic
    end
    row.name = row:CreateFontString(nil, "OVERLAY", "GameFontHighlightSmall")
    row.name:SetPoint("LEFT", 148, 0)
    row.name:SetWidth(128)
    row.name:SetJustifyH("LEFT")
    row.name:SetWordWrap(false)
    row.level = row:CreateFontString(nil, "OVERLAY", "GameFontHighlightSmall")
    row.level:SetPoint("LEFT", 278, 0)
    row.level:SetWidth(28)
    row.level:SetJustifyH("LEFT")
    row.activity = row:CreateFontString(nil, "OVERLAY", "GameFontHighlightSmall")
    row.activity:SetPoint("LEFT", 310, 0)
    row.activity:SetWidth(200)
    row.activity:SetJustifyH("LEFT")
    row.activity:SetWordWrap(false)
    row.age = row:CreateFontString(nil, "OVERLAY", "GameFontDisableSmall")
    row.age:SetPoint("RIGHT", -6, 0)
    -- Boutons au survol (le premier ajouté est le plus à droite)
    AddRowAction(row, L["Chuchoter"], 80,
        function(d) return not ns.IsMe(d.sender) end,
        function(d) DoWhisper(d.sender, d) end)
    AddRowAction(row, L["Ignorer"], 60,
        function(d) return not ns.IsMe(d.sender) end,
        function(d) ns.PlayClick(); ns.Ignore(d.sender) end)
    G.rows[i] = row
end

G.empty = glist:CreateFontString(nil, "OVERLAY", "GameFontDisable")
G.empty:SetPoint("CENTER", 0, 10)
G.empty:SetWidth(440)

gv:EnableMouseWheel(true)
gv:SetScript("OnMouseWheel", function(_, delta)
    state.scroll = math.max(0, state.scroll - delta)
    UI.Refresh()
end)

function UI.UpdateMyPanel(rebuild)
    if not ns.db then return end
    ValidateActivity()
    G.cat.Update()
    G.roles.Update()
    G.rolesLabel:SetText(L["Rôles recherchés"])
    G.alsoChat:SetChecked(ns.db.opts.alsoChat)
    if rebuild ~= false then G.picker:Rebuild() end
    if ns.my then
        local left = math.max(0, math.ceil((ns.EXPIRE - (GetTime() - ns.my.time)) / 60))
        local a = ns.ACT_BY_KEY[ns.my.akey]
        G.status:SetText(L["|cff33dd55Annonce active|r\n"] .. (a and a.name or "") .. "\n" .. left .. L[" min restantes"])
        G.pub:SetText(L["Republier"])
        G.del:Enable()
    else
        G.status:SetText(L["Aucune annonce active"])
        G.pub:SetText(L["Publier"])
        G.del:Disable()
    end
end

-- Remet dans le formulaire l'annonce active (ex. après un /reload)
local function RestoreFormFromListing()
    if ns.my and state.restoredFor ~= ns.my then
        state.restoredFor = ns.my
        state.cat = ns.my.cat
        state.akey = ns.my.akey
        if ns.my.type == "LFM" then
            state.lfmRoles = CopyTable(ns.my.baseRoles or ns.my.roles)
            state.lfmCounts = CopyTable(ns.my.baseCounts or {})
        end
        G.note:SetText(ns.my.note or "")
        G.note:UpdatePh()
    end
end

local function RefreshGroups()
    local o = ns.db.opts
    local myLevel, myFaction = ns.MyLevel(), ns.MyFaction()
    local counts = { Tous = 0 }
    local visible = {}
    local hiddenByOptions = 0   -- annonces cachées par les options (niveau, faction, type de serveur, lecture du chat)

    -- Une seule annonce par joueur (la plus récente), même si le jeu a écrit son royaume de deux façons.
    local latest = {}
    for _, l in pairs(ns.listings) do
        local key = ns.BareName(l.sender)
        if l.type == "LFM" and not ns.IsIgnored(l.sender) and (not latest[key] or l.time > latest[key].time) then latest[key] = l end
    end

    for _, l in pairs(latest) do
        local a = ns.ACT_BY_KEY[l.akey]
        local show = a ~= nil
        if show and l.source == "chat" and not o.chatReading then show = false end
        if show and o.levelOnly and not ns.ActivityInRange(a, myLevel) then show = false end
        if show and o.sameFaction and l.faction ~= myFaction then show = false end
        if show and not ns.RulesetOK(l.ruleset) then show = false end
        if ns.IsMe(l.sender) then show = true end
        if not show and a then hiddenByOptions = hiddenByOptions + 1 end
        if show then
            counts.Tous = counts.Tous + 1
            counts[l.cat] = (counts[l.cat] or 0) + 1
            if state.filterCat == "Tous" or l.cat == state.filterCat then
                tinsert(visible, l)
            end
        end
    end
    table.sort(visible, function(x, y)
        if ns.IsMe(x.sender) ~= ns.IsMe(y.sender) then return ns.IsMe(x.sender) end
        return x.time > y.time
    end)

    for i, b in ipairs(G.filter) do
        b:SetText(b.value .. " (" .. (counts[b.value] or 0) .. ")")
    end
    G.filter.Update()
    G.levelCB:SetChecked(o.levelOnly)

    local maxOffset = math.max(0, #visible - GROUP_ROWS)
    state.scroll = math.min(state.scroll, maxOffset)

    for i, row in ipairs(G.rows) do
        local d = visible[i + state.scroll]
        row.data = d
        if d then
            local a = ns.ACT_BY_KEY[d.akey]
            local t = ns.TYPES[d.type]
            row.typeText:SetText("|c" .. t.color .. t.short .. "|r")
            local j = 1
            for _, key in ipairs(ns.ROLE_ORDER) do
                if d.roles[key] then
                    local info = ns.ROLE_INFO[key]
                    ns.SetIcon(row.roleIcons[j], info.tiny, info.icon)
                    row.roleIcons[j]:Show()
                    j = j + 1
                end
            end
            for k = j, 3 do row.roleIcons[k]:Hide() end
            local nameText = "|c" .. ns.ClassHex(d.class) .. ns.ShortName(d.sender) .. "|r" .. FactionTag(d.faction)
            if ns.IsMe(d.sender) then nameText = nameText .. L[" |cff888888(toi)|r"] end
            row.name:SetText(nameText)
            row.level:SetText(d.level > 0 and d.level or "-")
            local txt = ""
            if state.filterCat == "Tous" then
                txt = "|c" .. (ns.CAT_COLORS[d.cat] or "ffffffff") .. ns.CatName(d.cat) .. "|r  "
            end
            txt = txt .. a.name
            if ns.HasRequest(d.sender) then txt = txt .. L["  |cff88ccff[demandé]|r"] end
            if d.source == "chat" then
                txt = txt .. L["  |cff33aaff[chat]|r"]
            else
                if d.type == "LFM" then txt = txt .. " |cffaaaaaa(" .. d.groupCount .. "/" .. d.size .. ")|r" end
                if d.note ~= "" then txt = txt .. "  |cff888888" .. d.note .. "|r" end
            end
            row.activity:SetText(txt)
            row.age:SetText(ns.Ago(d.time))
            row:Show()
            if row:IsMouseOver() then row:GetScript("OnEnter")(row) end
        else
            row:Hide()
        end
    end

    if #visible == 0 then
        local msg
        if hiddenByOptions > 0 and counts.Tous == 0 then
            msg = hiddenByOptions .. (hiddenByOptions > 1 and L[" annonces sont cachées"] or L[" annonce est cachée"])
                .. L[" par tes options (niveau, faction, type de serveur ou lecture du chat).\nOuvre |cffffd100/bf options|r pour les voir."]
        elseif counts.Tous > 0 then
            msg = L["Aucun groupe dans cette catégorie.\nClique sur |cffffd100Tous|r pour voir les "] .. counts.Tous .. L[" autres."]
        else
            msg = L["Aucun groupe pour l'instant.\nPublie le tien en haut avec |cffffd100Publier|r: plus il y a de joueurs avec l'addon,\nplus le babillard se remplit. Invite tes amis à l'installer!"]
            if not o.chatReading then
                msg = msg .. L["\n|cff888888La lecture du chat est coupée: active-la dans |cffffd100/bf options|r|cff888888 pour voir les annonces du général.|r"]
            end
        end
        G.empty:SetText(msg)
        G.empty:Show()
    else
        G.empty:Hide()
    end
    if maxOffset > 0 then
        G.scrollText:SetText(string.format(L["%d-%d sur %d (molette)"], state.scroll + 1,
            math.min(state.scroll + GROUP_ROWS, #visible), #visible))
    else
        G.scrollText:SetText(#visible > 0 and (#visible .. L[" annonce(s)"]) or "")
    end
    if o.sameRuleset and not ns.MyRuleset() then
        G.scrollText:SetText(L["|cffff8800Choisis ton type de serveur dans Mon perso|r"])
    end

    UI.UpdateMyPanel(false)
end

---------------------------------------------------------------------------
-- Vue 2 : Guildes
---------------------------------------------------------------------------
local vv = views[2]
local GU = {}

SectionTitle(vv, L["Annoncer ma guilde"], 70, -40)
local gp = MakePanel(vv, -60, -170)

GU.guildName = gp:CreateFontString(nil, "OVERLAY", "GameFontHighlight")
GU.guildName:SetPoint("TOPLEFT", 12, -12)
GU.guildName:SetWidth(420)
GU.guildName:SetJustifyH("LEFT")

local focusItems = {}
for _, k in ipairs(ns.GUILD_FOCUS_ORDER) do tinsert(focusItems, { label = ns.GUILD_FOCUS[k], value = k }) end
GU.focus = MakeSegmented(gp, focusItems, 100, 12, -36,
    function(v) return state.guildFocus == v end,
    function(v) state.guildFocus = v; GU.focus.Update() end, true)

GU.note = MakeInput(gp, L["Description : ex. guilde QC détendue, raids 2 soirs par semaine"], 410, 60, 18, -72)

GU.pub = MakeButton(gp, L["Publier"], 120, 30)
Skin.Primary(GU.pub)
GU.pub:SetPoint("TOPRIGHT", -10, -10)
GU.del = MakeButton(gp, L["Retirer"], 120, 22)
GU.del:SetPoint("TOP", GU.pub, "BOTTOM", 0, -6)
GU.status = gp:CreateFontString(nil, "OVERLAY", "GameFontDisableSmall")
GU.status:SetPoint("TOP", GU.del, "BOTTOM", 0, -6)
GU.status:SetWidth(130)

GU.pub:SetScript("OnClick", function()
    ns.EnsureChannel()
    ns.PublishGuild(state.guildFocus, GU.note:GetText())
end)
GU.del:SetScript("OnClick", function()
    ns.PlayClick()
    ns.WithdrawGuild()
end)

SectionTitle(vv, L["Guildes francophones"], 18, -178)
GU.scrollText = vv:CreateFontString(nil, "OVERLAY", "GameFontDisableSmall")
GU.scrollText:SetPoint("TOPRIGHT", -18, -180)

local gulist = MakePanel(vv, -196, 32)
HeaderText(gulist, L["Guilde"], 8)
HeaderText(gulist, L["Type"], 170)
HeaderText(gulist, L["Contact"], 262)
HeaderText(gulist, L["Description"], 392)
HeaderLine(gulist)

local function GuildTooltip(d)
    GameTooltip:AddLine("|cff40ff40<" .. d.guild .. ">|r" .. FactionTag(d.faction))
    GameTooltip:AddLine(ns.GUILD_FOCUS[d.focus] .. "  ·  " .. d.faction, 0.8, 0.8, 0.8)
    if ns.RulesetName(d.ruleset) then GameTooltip:AddLine(L["Serveur : "] .. ns.RulesetName(d.ruleset), 0.8, 0.8, 0.8) end
    if d.note ~= "" then
        GameTooltip:AddLine(" ")
        GameTooltip:AddLine(d.note, 1, 1, 1, true)
    end
    GameTooltip:AddLine(" ")
    GameTooltip:AddLine(L["Contact : |c"] .. ns.ClassHex(d.class) .. ns.ShortName(d.sender) .. L["|r (niveau "] .. d.level .. ")")
    GameTooltip:AddLine(L["Publié : "] .. ns.Ago(d.time), 0.5, 0.5, 0.5)
end

GU.rows = {}
for i = 1, GUILD_ROWS do
    local row = MakeRow(gulist, i, GuildTooltip)
    row.guild = row:CreateFontString(nil, "OVERLAY", "GameFontHighlightSmall")
    row.guild:SetPoint("LEFT", 4, 0)
    row.guild:SetWidth(160)
    row.guild:SetJustifyH("LEFT")
    row.guild:SetWordWrap(false)
    row.focus = row:CreateFontString(nil, "OVERLAY", "GameFontHighlightSmall")
    row.focus:SetPoint("LEFT", 166, 0)
    row.focus:SetWidth(90)
    row.focus:SetJustifyH("LEFT")
    row.contact = row:CreateFontString(nil, "OVERLAY", "GameFontHighlightSmall")
    row.contact:SetPoint("LEFT", 258, 0)
    row.contact:SetWidth(128)
    row.contact:SetJustifyH("LEFT")
    row.contact:SetWordWrap(false)
    row.desc = row:CreateFontString(nil, "OVERLAY", "GameFontDisableSmall")
    row.desc:SetPoint("LEFT", 388, 0)
    row.desc:SetWidth(170)
    row.desc:SetJustifyH("LEFT")
    row.desc:SetWordWrap(false)
    AddRowAction(row, L["Chuchoter"], 80,
        function(d) return not ns.IsMe(d.sender) end,
        function(d) DoWhisper(d.sender) end)
    GU.rows[i] = row
end

GU.empty = gulist:CreateFontString(nil, "OVERLAY", "GameFontDisable")
GU.empty:SetPoint("CENTER", 0, 10)
GU.empty:SetWidth(440)
GU.empty:SetText(L["Aucune guilde annoncée pour l'instant.\nTa guilde recrute? Annonce-la en haut!"])

vv:EnableMouseWheel(true)
vv:SetScript("OnMouseWheel", function(_, delta)
    state.guildScroll = math.max(0, state.guildScroll - delta)
    UI.Refresh()
end)

local function RefreshGuilds()
    local guild = GetGuildInfo("player")
    if guild then
        GU.guildName:SetText(L["Ta guilde : |cff40ff40<"] .. guild .. ">|r")
        GU.pub:Enable()
    else
        GU.guildName:SetText(L["|cff888888Tu n'es dans aucune guilde. Tu peux quand même voir celles qui recrutent.|r"])
        GU.pub:Disable()
    end
    GU.focus.Update()
    if ns.myGuild then
        local left = math.max(0, math.ceil((ns.GUILD_EXPIRE - (GetTime() - ns.myGuild.time)) / 60))
        GU.status:SetText(L["|cff33dd55Annonce active|r\n"] .. left .. L[" min restantes"])
        GU.pub:SetText(L["Republier"])
        GU.del:Enable()
    else
        GU.status:SetText(L["Aucune annonce active"])
        GU.pub:SetText(L["Publier"])
        GU.del:Disable()
    end

    local o = ns.db.opts
    local visible = {}
    for _, g in pairs(ns.guilds) do
        if (not o.sameFaction or g.faction == ns.MyFaction()) and ns.RulesetOK(g.ruleset) then tinsert(visible, g) end
    end
    table.sort(visible, function(x, y) return x.time > y.time end)

    local maxOffset = math.max(0, #visible - GUILD_ROWS)
    state.guildScroll = math.min(state.guildScroll, maxOffset)
    for i, row in ipairs(GU.rows) do
        local d = visible[i + state.guildScroll]
        row.data = d
        if d then
            row.guild:SetText("|cff40ff40<" .. d.guild .. ">|r" .. FactionTag(d.faction))
            row.focus:SetText(ns.GUILD_FOCUS[d.focus] or "")
            row.contact:SetText("|c" .. ns.ClassHex(d.class) .. ns.ShortName(d.sender) .. "|r")
            row.desc:SetText(d.note)
            row:Show()
        else
            row:Hide()
        end
    end
    GU.empty:SetShown(#visible == 0)
    GU.scrollText:SetText(#visible > 0 and (#visible .. L[" guilde(s)"]) or "")
end

---------------------------------------------------------------------------
-- Vue 3 : Mon perso
---------------------------------------------------------------------------
local mv = views[3]
local M = {}

SectionTitle(mv, L["Mon personnage"], 70, -40)
local mp = MakePanel(mv, -60, -274)

local LABELS = { L["Personnage"], L["Niveau et classe"], L["Faction"], L["Guilde"], L["Niveau d'objet"], L["Métiers"], L["Talents"] }
M.values = {}
for i, label in ipairs(LABELS) do
    local l = mp:CreateFontString(nil, "OVERLAY", "GameFontNormal")
    l:SetPoint("TOPLEFT", 14, -14 - (i - 1) * 22)
    l:SetText(label)
    local v = mp:CreateFontString(nil, "OVERLAY", "GameFontHighlight")
    v:SetPoint("TOPLEFT", 160, -14 - (i - 1) * 22)
    v:SetWidth(390)
    v:SetJustifyH("LEFT")
    v:SetWordWrap(false)
    M.values[i] = v
end

-- Type de serveur: le jeu n'a pas de fonction pour le lire, alors le joueur le choisit (un clic change).
M.ruleset = MakeButton(mp, "", 250, 22)
M.ruleset:SetPoint("TOPLEFT", 290, -14 - 2 * 22 + 4)
M.ruleset:SetScript("OnClick", function()
    local order, current = ns.RULESET_ORDER, ns.MyRuleset()
    local nextIndex = 1
    for i, id in ipairs(order) do
        if id == current then nextIndex = i % #order + 1 end
    end
    ns.db.ruleset = order[nextIndex]
    ns.PlayClick()
    ns.Refresh()
end)
Tooltip(M.ruleset, L["Type de serveur"], L["Normal (PvE), PvP, RP ou RP-PvP. On ne groupe qu'avec le même type: les annonces des autres types sont cachées. Clique pour changer."])

local rl = mp:CreateFontString(nil, "OVERLAY", "GameFontNormal")
rl:SetPoint("TOPLEFT", 14, -172)
rl:SetText(L["Mes rôles"])
M.roles = MakeRoleIcons(mp, 160, -164, 30, function() return ns.db.myRoles end, function() UI.Refresh() end)
local rh = mp:CreateFontString(nil, "OVERLAY", "GameFontDisableSmall")
rh:SetPoint("TOPLEFT", 280, -172)
rh:SetWidth(270)
rh:SetJustifyH("LEFT")
rh:SetText(L["Utilisés pour les alertes: l'addon te prévient quand un groupe cherche un de tes rôles."])

SectionTitle(mv, L["Lier mon personnage au site"], 18, -282)
local ep = MakePanel(mv, -300, 32)
local steps = ep:CreateFontString(nil, "OVERLAY", "GameFontHighlight")
steps:SetPoint("TOPLEFT", 16, -16)
steps:SetWidth(540)
steps:SetJustifyH("LEFT")
steps:SetSpacing(4)
steps:SetText(
    L["|cffffd1001.|r Clique sur « Copier mon code ».\n"] ..
    L["|cffffd1002.|r Fais |cffffd100Ctrl+C|r pour le copier.\n"] ..
    L["|cffffd1003.|r Sur |cff33aaffbabillard-forever.com|r, va dans ton profil et colle le code.\n\n"] ..
    L["|cffaaaaaaLe code contient ton nom, ton niveau, ta classe, ta guilde, tes rôles, tes métiers, ton équipement "] ..
    L["et tes talents. Génère un nouveau code quand tu changes d'équipement ou de talents pour garder ton profil à jour.|r"])

M.export = MakeButton(ep, L["Copier mon code"], 200, 30)
Skin.Primary(M.export)
M.export:SetPoint("BOTTOM", 0, 24)
M.export:SetScript("OnClick", function()
    ns.PlayClick()
    ns.ShowCopy(L["Ton code pour babillard-forever.com :"], ns.BuildExportCode())
end)

local function RefreshMe()
    local c = ns.GetCharacterInfo()
    M.values[1]:SetText("|c" .. ns.ClassHex(c.classFile) .. c.name .. "|r - " .. c.realm .. (c.region ~= "" and (" (" .. c.region .. ")") or ""))
    M.values[2]:SetText(c.level .. "  ·  " .. c.race .. " " .. c.className)
    M.values[3]:SetText(c.faction)
    local rs = ns.MyRuleset()
    M.ruleset:SetText(rs and (L["Serveur : "] .. ns.RulesetName(rs)) or L["|cffff8800Choisis ton type de serveur|r"])
    M.values[4]:SetText(c.guild ~= "" and ("<" .. c.guild .. ">") or "|cff888888Aucune|r")
    local pieces = #c.equipment > 0 and ("  |cff888888(" .. #c.equipment .. L[" pièces)|r"]) or ""
    M.values[5]:SetText(c.ilvl and (tostring(c.ilvl) .. pieces) or "|cff888888Inconnu|r")
    local profs = {}
    for _, p in ipairs(c.professions) do tinsert(profs, p.name .. " " .. p.rank .. "/" .. p.max) end
    M.values[6]:SetText(#profs > 0 and table.concat(profs, ", ") or "|cff888888Aucun|r")
    local main = ns.MainTalentTab(c.talentTabs)
    local trees = {}
    for i, t in ipairs(c.talentTabs) do
        local text = t.name .. " " .. t.points
        tinsert(trees, i == main and ("|cffffd100" .. text .. "|r") or text)
    end
    M.values[7]:SetText(#trees > 0 and table.concat(trees, " / ") or L["|cff888888Indisponibles (tape /bf diag et envoie le résultat)|r"])
    M.roles.Update()
end

---------------------------------------------------------------------------
-- Navigation et rafraîchissement
---------------------------------------------------------------------------
function UI.SelectView(i)
    state.view = i
    for k, v in ipairs(views) do v:SetShown(k == i) end
    if PanelTemplates_SetTab then pcall(PanelTemplates_SetTab, f, i) end
    UI.Refresh()
end

function UI.Refresh()
    if not f:IsShown() or not ns.db then return end
    ns.Prune()
    local status
    if ns.ChannelIndex() then
        status = L["|cff33dd55●|r Connecté"]
    elseif ns.channelFailed then
        status = L["|cffff5555●|r Canal indisponible"]
    else
        status = L["|cffffd100●|r Connexion..."]
    end
    if ns.CommunityId() then status = status .. L["  |cff33dd55●|r Communauté"] end
    if ns.newVersion then status = status .. "  |cffff8800v" .. ns.newVersion .. L[" disponible|r"] end
    channelStatus:SetText(status)
    UI.UpdateBanner()
    if state.view == 1 then
        RefreshGroups()
    elseif state.view == 2 then
        RefreshGuilds()
    else
        RefreshMe()
    end
end

function UI.Open(view)
    f:Show()
    UI.SelectView(view or state.view)
end

function UI.IsShown()
    return f:IsShown()
end

function UI.Toggle()
    if f:IsShown() then f:Hide() else UI.Open() end
end

f:SetScript("OnShow", function()
    ns.EnsureChannel()
    ns.RequestAll()
    RestoreFormFromListing()
    UI.UpdateMyPanel()
    UI.SelectView(state.view)
end)

end -- ns.BuildUI
