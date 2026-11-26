-- Babillard Forever FR - Interface : la fenêtre et ses six onglets (Groupes, Guildes, Mon perso, En ligne, Chat, Commandes)
local ADDON, ns = ...
local L = ns.L

-- Bâti à ADDON_LOADED (Core.lua), une fois la langue choisie: tous les textes passent par L.
function ns.BuildUI()

local UI = {}
ns.UI = UI

-- Mesures de la fenêtre (en unités d'interface)
local WIN_W, WIN_H = 640, 610
local HEADER_H, TAB_H, FOOT_H = 48, 30, 26
local TOP = HEADER_H + TAB_H                -- haut de la zone des onglets
local VIEW_H = WIN_H - TOP - FOOT_H         -- hauteur de la zone des onglets
local PAD = 14                              -- marge à gauche et à droite des onglets
local ROW_H = 38                            -- lignes à deux étages (groupes, guildes)
local LINE_H = 26                           -- lignes simples (en ligne)
local COL_W = 120                           -- colonne des boutons Publier / Retirer

local state = {
    view         = 1,
    mode         = "LFM",   -- l'addon sert à former des groupes: il n'y a plus de mode « je cherche un groupe »
    cat          = "Donjons",
    akey         = nil,
    lfmRoles     = { DPS = true },
    lfmCounts    = {},      -- places par rôle (raids et PvP): { TANK = 2, HEAL = 8, DPS = 25 }
    filterCat    = "Tous",
    scroll       = 0,
    guildFocus   = "PVE",
    guildScroll  = 0,
    onlineScroll = 0,
    restoredFor  = nil,
}

---------------------------------------------------------------------------
-- Look du site: fond nuit, filets et titres dorés. Chaque étape délicate est protégée: si le jeu en refuse une,
-- le reste de l'interface s'affiche quand même.
---------------------------------------------------------------------------
local Skin = {}
ns.Skin = Skin
ns.skinErrors = 0
local WHITE = "Interface\\Buttons\\WHITE8X8"
local ICONS = ns.MEDIA .. "Icons"
local GOLD = { 0.79, 0.64, 0.29 }      -- #c9a24a, le doré des cadres du site

local function Try(f, ...)
    local ok = pcall(f, ...)
    if not ok then ns.skinErrors = ns.skinErrors + 1 end
    return ok
end

-- Traits d'un pixel exact. À une échelle d'interface qui n'est pas ronde (ex. 0,89), un trait d'une unité tombe entre
-- deux pixels et disparaît par endroits: on le règle sur un vrai pixel de l'écran (PixelUtil), et on recommence quand
-- l'échelle change.
local thinLines = {}
local function Px(tex, horizontal)
    if PixelUtil and PixelUtil.SetHeight then
        if horizontal then PixelUtil.SetHeight(tex, 1, 1) else PixelUtil.SetWidth(tex, 1, 1) end
    elseif horizontal then
        tex:SetHeight(1)
    else
        tex:SetWidth(1)
    end
end
local function ThinLine(tex, horizontal)
    thinLines[#thinLines + 1] = { tex, horizontal }
    Px(tex, horizontal)
    return tex
end
function Skin.SnapLines()
    for _, l in ipairs(thinLines) do pcall(Px, l[1], l[2]) end
end

-- Fond uni
function Skin.Fill(frame, r, g, b, a, layer, sublevel)
    local t = frame:CreateTexture(nil, layer or "BACKGROUND", nil, sublevel or 0)
    t:SetAllPoints()
    t:SetColorTexture(r, g, b, a)
    return t
end

-- Cadre d'un pixel
function Skin.Border(frame, c, a, layer)
    local lines = {}
    for i = 1, 4 do
        lines[i] = frame:CreateTexture(nil, layer or "BORDER")
        lines[i]:SetColorTexture(c[1], c[2], c[3], a)
    end
    lines[1]:SetPoint("TOPLEFT");    lines[1]:SetPoint("TOPRIGHT");    ThinLine(lines[1], true)
    lines[2]:SetPoint("BOTTOMLEFT"); lines[2]:SetPoint("BOTTOMRIGHT"); ThinLine(lines[2], true)
    lines[3]:SetPoint("TOPLEFT");    lines[3]:SetPoint("BOTTOMLEFT");  ThinLine(lines[3], false)
    lines[4]:SetPoint("TOPRIGHT");   lines[4]:SetPoint("BOTTOMRIGHT"); ThinLine(lines[4], false)
    return lines
end

function Skin.BorderColor(lines, r, g, b, a)
    for _, l in ipairs(lines or {}) do l:SetColorTexture(r, g, b, a) end
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

function Skin.GradientFill(frame, bottom, top, layer, sublevel)
    local t = frame:CreateTexture(nil, layer or "BACKGROUND", nil, sublevel or 0)
    t:SetAllPoints()
    return Skin.Gradient(t, "VERTICAL", bottom[1], bottom[2], bottom[3], bottom[4], top[1], top[2], top[3], top[4])
end

-- Trait doré qui s'efface vers la droite (titres, séparateurs)
function Skin.FadeLine(parent, layer, alpha)
    local t = parent:CreateTexture(nil, layer or "ARTWORK")
    ThinLine(t, true)
    Skin.Gradient(t, "HORIZONTAL", GOLD[1], GOLD[2], GOLD[3], alpha or 0.8, GOLD[1], GOLD[2], GOLD[3], 0)
    return t
end

-- Icônes de l'addon (Media/Icons: 8 x 4 cases, blanches, teintées à l'usage)
local ICON_INDEX = {
    party = 0, banner = 1, online = 2, chat = 3, card = 4, terminal = 5, refresh = 6, gear = 7,
    close = 8, dungeon = 9, raid = 10, pvp = 11, other = 12, send = 13, globe = 14, bell = 15,
    check = 16, chevron = 17, plus = 18, minus = 19, arrowdown = 20, dot = 21, link = 22, search = 23,
    ring = 24,
}
function Skin.SetIcon(tex, name)
    local i = ICON_INDEX[name] or ICON_INDEX.dot
    local col, row = i % 8, math.floor(i / 8)
    tex:SetTexture(ICONS)
    tex:SetTexCoord(col / 8, (col + 1) / 8, row / 4, (row + 1) / 4)
end

local function Icon(parent, name, size, layer, r, g, b, a)
    local t = parent:CreateTexture(nil, layer or "ARTWORK")
    t:SetSize(size, size)
    Skin.SetIcon(t, name)
    t:SetVertexColor(r or 1, g or 1, b or 1, a or 1)
    return t
end

local CAT_ICON = { Donjons = "dungeon", Raids = "raid", PvP = "pvp", Autre = "other" }

local function HexRGB(hex)
    hex = type(hex) == "string" and #hex == 8 and hex or "ffffffff"
    return tonumber(hex:sub(3, 4), 16) / 255, tonumber(hex:sub(5, 6), 16) / 255, tonumber(hex:sub(7, 8), 16) / 255
end

---------------------------------------------------------------------------
-- Polices: quelques tailles seulement, toujours les mêmes couleurs
---------------------------------------------------------------------------
local FONT_FILE = (GameFontNormal and GameFontNormal.GetFont and GameFontNormal:GetFont()) or STANDARD_TEXT_FONT
local F = {}
local function MakeFont(key, size, r, g, b, shadow)
    local name = "BabillardFRFont" .. key
    local fo = rawget(_G, name) or CreateFont(name)
    if not fo:SetFont(FONT_FILE, size, "") and STANDARD_TEXT_FONT then fo:SetFont(STANDARD_TEXT_FONT, size, "") end
    fo:SetTextColor(r, g, b)
    if shadow == false then
        fo:SetShadowOffset(0, 0)
    else
        fo:SetShadowOffset(1, -1)
        fo:SetShadowColor(0, 0, 0, 0.9)
    end
    F[key] = fo
    return fo
end
local TXT, DIM, GLD = { 0.93, 0.94, 0.96 }, { 0.60, 0.64, 0.72 }, { 1, 0.84, 0.3 }
MakeFont("Title",    17, GLD[1], GLD[2], GLD[3])
MakeFont("Huge",     20, GLD[1], GLD[2], GLD[3])
MakeFont("Head",     13, GLD[1], GLD[2], GLD[3])
MakeFont("Text",     12, TXT[1], TXT[2], TXT[3])
MakeFont("TextDim",  12, DIM[1], DIM[2], DIM[3])
MakeFont("Small",    11, TXT[1], TXT[2], TXT[3])
MakeFont("SmallDim", 11, DIM[1], DIM[2], DIM[3])
MakeFont("SmallGold", 11, GLD[1], GLD[2], GLD[3])
MakeFont("Tiny",     10, DIM[1], DIM[2], DIM[3])
MakeFont("Link",     11, 0.45, 0.72, 1)
MakeFont("Btn",      12, GLD[1], GLD[2], GLD[3])
MakeFont("BtnHi",    12, 1, 0.95, 0.75)
MakeFont("BtnOff",   12, 0.42, 0.43, 0.47)
MakeFont("BtnDark",  12, 0.14, 0.08, 0.01, false)
MakeFont("BtnSmall", 11, GLD[1], GLD[2], GLD[3])
MakeFont("BtnSmallHi", 11, 1, 0.95, 0.75)
MakeFont("BtnSmallOff", 11, 0.42, 0.43, 0.47)
MakeFont("SegOn",    11, GLD[1], GLD[2], GLD[3])
MakeFont("SegOff",   11, 0.66, 0.70, 0.78)
MakeFont("TabOn",    12, GLD[1], GLD[2], GLD[3])
MakeFont("TabOff",   12, 0.66, 0.70, 0.78)
MakeFont("Badge",    10, 0.14, 0.08, 0.01, false)
MakeFont("BadgeLight", 10, 0.86, 0.89, 0.95, false)
ns.Fonts = F

local function Text(parent, font, layer)
    local s = parent:CreateFontString(nil, layer or "OVERLAY")
    s:SetFontObject(F[font] or F.Text)
    return s
end

local Plural = ns.Plural   -- « 1 groupe », « 2 groupes » (Locale.lua)

---------------------------------------------------------------------------
-- Boutons
---------------------------------------------------------------------------
local BTN_BOTTOM, BTN_TOP   = { 0.05, 0.055, 0.09, 1 }, { 0.15, 0.165, 0.25, 1 }
local SEL_BOTTOM, SEL_TOP   = { 0.20, 0.15, 0.05, 1 }, { 0.40, 0.30, 0.09, 1 }
local GOLD_BOTTOM, GOLD_TOP = { 0.62, 0.43, 0.10, 1 }, { 0.98, 0.82, 0.40, 1 }
local OFF_BOTTOM, OFF_TOP   = { 0.06, 0.06, 0.07, 1 }, { 0.11, 0.11, 0.13, 1 }

-- Fond et cadre selon l'état: désactivé (gris), principal (doré), choisi (doré foncé) ou normal (nuit)
local function ButtonLook(b)
    if not b.bg then return end
    local on = b:IsEnabled()
    local bottom, top
    if not on then
        bottom, top = OFF_BOTTOM, OFF_TOP
    elseif b.primary then
        bottom, top = GOLD_BOTTOM, GOLD_TOP
    elseif b.selected then
        bottom, top = SEL_BOTTOM, SEL_TOP
    else
        bottom, top = BTN_BOTTOM, BTN_TOP
    end
    Skin.Gradient(b.bg, "VERTICAL", bottom[1], bottom[2], bottom[3], bottom[4], top[1], top[2], top[3], top[4])
    if not on then
        Skin.BorderColor(b.border, 0.5, 0.5, 0.55, 0.25)
    elseif b.primary then
        Skin.BorderColor(b.border, 1, 0.9, 0.55, 0.95)
    else
        Skin.BorderColor(b.border, GOLD[1], GOLD[2], GOLD[3], b.selected and 0.9 or 0.45)
    end
    if b.shine then b.shine:SetAlpha(on and 1 or 0.3) end
end
Skin.ButtonLook = ButtonLook

-- style: nil (normal), "primary" (doré, texte foncé) ou "small" (police plus petite)
local function NewButton(parent, text, w, h, style)
    local b = CreateFrame("Button", nil, parent)
    b:SetSize(w, h)
    b.primary = style == "primary"
    local small = style == "small"
    b.bg = b:CreateTexture(nil, "BACKGROUND")
    b.bg:SetAllPoints()
    Try(function()
        b.shine = b:CreateTexture(nil, "BORDER")
        b.shine:SetPoint("TOPLEFT", 1, -1)
        b.shine:SetPoint("TOPRIGHT", -1, -1)
        ThinLine(b.shine, true)
        b.shine:SetColorTexture(1, 1, 1, b.primary and 0.35 or 0.10)
    end)
    b.border = Skin.Border(b, GOLD, 0.45)
    Try(function()
        local hl = b:CreateTexture(nil, "HIGHLIGHT")
        hl:SetAllPoints()
        if b.primary then
            Skin.Gradient(hl, "VERTICAL", 1, 1, 1, 0.04, 1, 1, 1, 0.26)
        else
            Skin.Gradient(hl, "VERTICAL", 1, 0.82, 0.3, 0.22, 1, 0.82, 0.3, 0.04)
        end
        hl:SetBlendMode("ADD")
        b:SetHighlightTexture(hl)
    end)
    local fs = b:CreateFontString(nil, "OVERLAY")
    fs:SetPoint("CENTER", 0, 0)
    fs:SetFontObject(b.primary and F.BtnDark or (small and F.BtnSmall or F.Btn))   -- police dès le départ (SetText)
    b:SetFontString(fs)
    if b.primary then
        b:SetNormalFontObject(F.BtnDark)
        b:SetHighlightFontObject(F.BtnDark)
        b:SetDisabledFontObject(F.BtnOff)
    elseif small then
        b:SetNormalFontObject(F.BtnSmall)
        b:SetHighlightFontObject(F.BtnSmallHi)
        b:SetDisabledFontObject(F.BtnSmallOff)
    else
        b:SetNormalFontObject(F.Btn)
        b:SetHighlightFontObject(F.BtnHi)
        b:SetDisabledFontObject(F.BtnOff)
    end
    Try(function() b:SetPushedTextOffset(1, -1) end)
    b:SetText(text or "")
    Try(function()
        b:HookScript("OnEnable", ButtonLook)
        b:HookScript("OnDisable", ButtonLook)
    end)
    ButtonLook(b)
    return b
end
Skin.NewButton = NewButton

-- Activer / désactiver un bouton et mettre son look à jour (même si le jeu n'appelle pas OnEnable / OnDisable)
local function SetEnabled(b, on)
    if on then b:Enable() else b:Disable() end
    ButtonLook(b)
end

-- Petit bouton icône (en-tête): l'icône s'allume en doré au survol
local function IconButton(parent, icon, size, title, text, onClick)
    local b = CreateFrame("Button", nil, parent)
    b:SetSize(size, size)
    b.icon = Icon(b, icon, size - 10, "ARTWORK", 0.72, 0.76, 0.85)
    b.icon:SetPoint("CENTER")
    Try(function()
        local hl = b:CreateTexture(nil, "HIGHLIGHT")
        hl:SetAllPoints()
        hl:SetColorTexture(1, 0.84, 0.3, 0.10)
        b:SetHighlightTexture(hl)
    end)
    b:SetScript("OnEnter", function(self)
        self.icon:SetVertexColor(1, 0.84, 0.3)
        GameTooltip:SetOwner(self, "ANCHOR_BOTTOM")
        GameTooltip:AddLine(title)
        if text then GameTooltip:AddLine(text, 1, 1, 1, true) end
        GameTooltip:Show()
    end)
    b:SetScript("OnLeave", function(self)
        self.icon:SetVertexColor(0.72, 0.76, 0.85)
        GameTooltip:Hide()
    end)
    b:SetScript("OnMouseDown", function(self) self.icon:SetPoint("CENTER", 1, -1) end)
    b:SetScript("OnMouseUp", function(self) self.icon:SetPoint("CENTER", 0, 0) end)
    b:SetScript("OnClick", onClick)
    return b
end

-- Ancien look pour les boutons du jeu (UIPanelButtonTemplate), gardé pour le panneau d'options
local function Blank(tex)
    if not tex then return end
    pcall(tex.SetTexture, tex, nil)
    pcall(tex.SetAtlas, tex, nil)
    pcall(tex.SetAlpha, tex, 0)
    pcall(tex.Hide, tex)
end

function Skin.SetButtonColors(b, bottom, top)
    if b.skinBg then
        Skin.Gradient(b.skinBg, "VERTICAL", bottom[1], bottom[2], bottom[3], bottom[4], top[1], top[2], top[3], top[4])
    end
end

function Skin.Button(b)
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
    Try(function() b.skinBg = Skin.GradientFill(b, BTN_BOTTOM, BTN_TOP) end)
    Try(function() b.skinBorder = Skin.Border(b, GOLD, 0.55) end)
    Try(function()
        b:SetHighlightTexture(WHITE)
        local h = b:GetHighlightTexture()
        if h then
            h:SetBlendMode("ADD")
            Skin.Gradient(h, "VERTICAL", 1, 0.82, 0.3, 0.22, 1, 0.82, 0.3, 0.04)
        end
    end)
    Try(function() b:SetPushedTextOffset(1, -1) end)
    Try(function()
        local fs = b:GetFontString()
        if fs then fs:SetDrawLayer("OVERLAY"); fs:SetTextColor(1, 0.84, 0.25) end
    end)
end

function Skin.Primary(b)
    Try(Skin.SetButtonColors, b, GOLD_BOTTOM, GOLD_TOP)
    Try(function()
        for _, line in ipairs(b.skinBorder or {}) do line:SetColorTexture(1, 0.9, 0.55, 0.9) end
        local fs = b:GetFontString()
        if fs then fs:SetTextColor(0.12, 0.07, 0.01); fs:SetShadowColor(1, 0.95, 0.7, 0.35) end
    end)
end

---------------------------------------------------------------------------
-- Petits outils pour bâtir les onglets
---------------------------------------------------------------------------
-- Panneau: fond un peu plus clair que la fenêtre, cadre fin, filet doré en haut.
-- top: décalage du haut; bottom < 0: décalage du bas depuis le haut, sinon marge depuis le bas.
local function MakePanel(parent, top, bottom)
    local p = CreateFrame("Frame", nil, parent)
    Try(function()
        Skin.GradientFill(p, { 0.035, 0.04, 0.065, 0.96 }, { 0.07, 0.08, 0.12, 0.96 })
        Skin.Border(p, GOLD, 0.22)
        local accent = p:CreateTexture(nil, "BORDER")
        accent:SetPoint("TOPLEFT", 1, -1)
        accent:SetPoint("TOPRIGHT", -1, -1)
        accent:SetHeight(2)
        Skin.Gradient(accent, "HORIZONTAL", GOLD[1], GOLD[2], GOLD[3], 0.75, GOLD[1], GOLD[2], GOLD[3], 0.03)
    end)
    p:SetPoint("TOPLEFT", PAD, top)
    if bottom < 0 then
        p:SetPoint("BOTTOMRIGHT", parent, "TOPRIGHT", -PAD, bottom)
    else
        p:SetPoint("BOTTOMRIGHT", -PAD, bottom)
    end
    return p
end

-- Titre de section: texte doré, puis un filet qui s'efface (sauf noLine)
local function SectionTitle(parent, text, x, y, noLine)
    local s = Text(parent, "Head")
    s:SetPoint("TOPLEFT", x, y)
    s:SetText(text)
    if not noLine then
        Try(function()
            local line = Skin.FadeLine(parent, "ARTWORK", 0.6)
            line:SetPoint("LEFT", s, "RIGHT", 10, 0)
            line:SetWidth(200)
        end)
    end
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
local function MakeSegmented(parent, items, width, x, y, isSelected, onSelect, h)
    local buttons = {}
    for i, it in ipairs(items) do
        local b = NewButton(parent, it.label, width, h or 22, "small")
        b:SetPoint("TOPLEFT", x + (i - 1) * (width + 4), y)
        b.value = it.value
        b.selBar = b:CreateTexture(nil, "OVERLAY")
        b.selBar:SetPoint("BOTTOMLEFT", 1, 1)
        b.selBar:SetPoint("BOTTOMRIGHT", -1, 1)
        b.selBar:SetHeight(2)
        b.selBar:SetColorTexture(1, 0.84, 0.3, 1)
        b.selBar:Hide()
        b:SetScript("OnClick", function()
            ns.PlayClick()
            onSelect(it.value)
        end)
        buttons[i] = b
    end
    buttons.Update = function()
        for _, b in ipairs(buttons) do
            local sel = isSelected(b.value) and true or false
            b.selected = sel
            b:SetNormalFontObject(sel and F.SegOn or F.SegOff)
            b.selBar:SetShown(sel)
            ButtonLook(b)
        end
    end
    return buttons
end

-- Icônes de rôles (on peut en choisir plusieurs). Le premier bouton est placé par l'appelant, les autres suivent.
-- getCounts / countsActive (facultatifs): places par rôle, réglées à la molette quand l'activité a plus de 5 places
local function MakeRoleIcons(parent, size, getSet, onChange, getCounts, countsActive)
    local btns = {}
    for i, key in ipairs(ns.ROLE_ORDER) do
        local info = ns.ROLE_INFO[key]
        local b = CreateFrame("Button", nil, parent)
        b:SetSize(size, size)
        if i > 1 then b:SetPoint("LEFT", btns[i - 1], "RIGHT", 8, 0) end
        b.icon = b:CreateTexture(nil, "ARTWORK")
        b.icon:SetAllPoints()
        ns.SetIcon(b.icon, info.atlas, info.icon)
        b.ring = Icon(b, "ring", size + 8, "OVERLAY", 1, 0.84, 0.3)
        b.ring:SetPoint("CENTER")
        Try(function()
            local hl = b:CreateTexture(nil, "HIGHLIGHT")
            hl:SetPoint("CENTER")
            hl:SetSize(size + 8, size + 8)
            Skin.SetIcon(hl, "ring")
            hl:SetVertexColor(1, 1, 1, 0.35)
            b:SetHighlightTexture(hl)
        end)
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
            b.num:SetPoint("BOTTOMRIGHT", 4, -2)
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
            b.ring:SetShown(sel)
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
local function MakeInput(parent, placeholder, width, maxLetters, x, y, h)
    local eb = CreateFrame("EditBox", nil, parent)
    eb:SetSize(width, h or 22)
    eb:SetPoint("TOPLEFT", x, y)
    eb:SetFontObject(F.Text)
    eb:EnableMouse(true)
    eb:SetAutoFocus(false)
    eb:SetMaxLetters(maxLetters)
    eb:SetTextInsets(7, 7, 0, 0)
    Try(function()
        Skin.GradientFill(eb, { 0.015, 0.02, 0.035, 1 }, { 0.05, 0.055, 0.085, 1 })
        eb.skinBorder = Skin.Border(eb, GOLD, 0.35)
        local function Glow(a) Skin.BorderColor(eb.skinBorder, GOLD[1], GOLD[2], GOLD[3], a) end
        eb:HookScript("OnEditFocusGained", function() Glow(1) end)
        eb:HookScript("OnEditFocusLost", function() Glow(0.35) end)
    end)
    eb.ph = Text(eb, "TextDim", "ARTWORK")
    eb.ph:SetPoint("LEFT", 7, 0)
    eb.ph:SetPoint("RIGHT", -7, 0)
    eb.ph:SetJustifyH("LEFT")
    eb.ph:SetWordWrap(false)
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

-- Case à cocher: carré sombre, crochet doré; un clic sur le texte coche aussi
local function MakeCheck(parent, label)
    local cb = CreateFrame("CheckButton", nil, parent)
    cb:SetSize(16, 16)
    Try(function()
        Skin.Fill(cb, 0.015, 0.02, 0.035, 1)
        cb.skinBorder = Skin.Border(cb, GOLD, 0.55)
    end)
    Try(function()
        cb:SetCheckedTexture(ICONS)
        local t = cb:GetCheckedTexture()
        local i = ICON_INDEX.check
        t:SetTexCoord((i % 8) / 8, (i % 8 + 1) / 8, math.floor(i / 8) / 4, (math.floor(i / 8) + 1) / 4)
        t:SetVertexColor(1, 0.84, 0.3)
    end)
    Try(function()
        local hl = cb:CreateTexture(nil, "HIGHLIGHT")
        hl:SetAllPoints()
        hl:SetColorTexture(1, 0.84, 0.3, 0.18)
        cb:SetHighlightTexture(hl)
    end)
    cb.label = Text(cb, "Small")
    cb.label:SetPoint("LEFT", cb, "RIGHT", 6, 0)
    cb.label:SetText(label)
    Try(function() cb:SetHitRectInsets(0, -(cb.label:GetStringWidth() + 8), -3, -3) end)
    return cb
end

-- Chuchoter / inviter
local function DoWhisper(name, d, customText)
    name = ns.WhisperName(name)
    -- Message de présentation déjà écrit dans la boîte de chat: tu appuies sur Entrée pour l'envoyer.
    -- On n'écrit pas « /w Nom Prénom texte »: le jeu prendrait seulement le premier mot comme destinataire. On ouvre plutôt
    -- la boîte « Chuchoter à » comme le clic droit, puis on y met le texte.
    local text = customText or (d and ns.db.opts.whisperTemplate and ns.WhisperText(d))
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

-- Lignes de liste: survol = lueur dorée + boutons d'action + info-bulle
local function RowLeave(row)
    if row:IsMouseOver() then return end
    row.hl:Hide()
    row.hlBar:Hide()
    for _, b in ipairs(row.actions) do b:Hide() end
    for _, r in ipairs(row.hideOnHover) do r:SetAlpha(1) end
    if row.OnHoverLayout then row:OnHoverLayout(false) end
    GameTooltip:Hide()
end

local function MakeRow(list, i, h, onTooltip, top)
    local row = CreateFrame("Frame", nil, list)
    local y = -(top or 4) - (i - 1) * h
    row:SetHeight(h)
    row:SetPoint("TOPLEFT", 4, y)
    row:SetPoint("TOPRIGHT", -9, y)
    row:EnableMouse(true)
    Try(function()
        row.sep = row:CreateTexture(nil, "BACKGROUND")
        row.sep:SetPoint("BOTTOMLEFT", 6, 0)
        row.sep:SetPoint("BOTTOMRIGHT", -6, 0)
        ThinLine(row.sep, true)
        row.sep:SetColorTexture(1, 1, 1, 0.05)
    end)
    row.hl = row:CreateTexture(nil, "BORDER")
    row.hl:SetAllPoints()
    Skin.Gradient(row.hl, "HORIZONTAL", 1, 0.82, 0.3, 0.16, 1, 0.82, 0.3, 0.02)
    row.hl:Hide()
    row.hlBar = row:CreateTexture(nil, "ARTWORK")
    row.hlBar:SetPoint("TOPLEFT")
    row.hlBar:SetPoint("BOTTOMLEFT")
    row.hlBar:SetWidth(2)
    row.hlBar:SetColorTexture(1, 0.84, 0.3, 1)
    row.hlBar:Hide()
    -- Ma propre annonce: un filet doré permanent à gauche
    row.mine = row:CreateTexture(nil, "ARTWORK")
    row.mine:SetPoint("TOPLEFT", 0, -3)
    row.mine:SetPoint("BOTTOMLEFT", 0, 3)
    row.mine:SetWidth(2)
    row.mine:SetColorTexture(1, 0.84, 0.3, 0.8)
    row.mine:Hide()
    row.actions = {}
    row.hideOnHover = {}
    row:SetScript("OnEnter", function(self)
        if not self.data then return end
        self.hl:Show()
        self.hlBar:Show()
        local any = false
        for _, b in ipairs(self.actions) do
            if b.enabledFor(self.data) then b:Show(); any = true else b:Hide() end
        end
        if any then
            for _, r in ipairs(self.hideOnHover) do r:SetAlpha(0) end
            if self.OnHoverLayout then self:OnHoverLayout(true) end
        end
        GameTooltip:SetOwner(self, "ANCHOR_RIGHT")
        onTooltip(self.data)
        GameTooltip:Show()
    end)
    row:SetScript("OnLeave", RowLeave)
    row:Hide()
    return row
end

local function AddRowAction(row, text, width, enabledFor, onClick, primary)
    local b = NewButton(row, text, width, 22, primary and "primary" or "small")
    local prev = row.actions[#row.actions]
    if prev then
        b:SetPoint("RIGHT", prev, "LEFT", -4, 0)
    else
        b:SetPoint("RIGHT", -6, 0)
    end
    b.enabledFor = enabledFor
    b:SetScript("OnClick", function() onClick(row.data) end)
    b:SetScript("OnLeave", function() RowLeave(row) end)
    b:Hide()
    tinsert(row.actions, b)
    return b
end

-- En-tête de colonnes (liste En ligne)
local function HeaderText(list, text, x)
    local h = Text(list, "SmallGold")
    h:SetPoint("TOPLEFT", x, -8)
    h:SetText(text)
    return h
end

local function HeaderLine(list)
    Try(function()
        local band = list:CreateTexture(nil, "BACKGROUND", nil, 1)
        band:SetPoint("TOPLEFT", 1, -3)
        band:SetPoint("TOPRIGHT", -1, -3)
        band:SetHeight(21)
        Skin.Gradient(band, "VERTICAL", 1, 0.84, 0.3, 0.02, 1, 0.84, 0.3, 0.07)
        local line = list:CreateTexture(nil, "ARTWORK")
        line:SetPoint("TOPLEFT", 6, -24)
        line:SetPoint("TOPRIGHT", -6, -24)
        ThinLine(line, true)
        Skin.Gradient(line, "HORIZONTAL", GOLD[1], GOLD[2], GOLD[3], 0.6, GOLD[1], GOLD[2], GOLD[3], 0.08)
    end)
end

-- Repère de défilement (fin, à droite de la liste): visible seulement quand tout ne tient pas
local function MakeScrollMark(list, top)
    local m = {}
    m.track = list:CreateTexture(nil, "ARTWORK")
    m.track:SetPoint("TOPRIGHT", -3, -(top or 4))
    m.track:SetPoint("BOTTOMRIGHT", -3, 4)
    m.track:SetWidth(3)
    m.track:SetColorTexture(1, 1, 1, 0.06)
    m.thumb = list:CreateTexture(nil, "OVERLAY")
    m.thumb:SetWidth(3)
    m.thumb:SetColorTexture(1, 0.84, 0.3, 0.7)
    m.Update = function(total, shown, offset)
        if total <= shown then
            m.track:Hide()
            m.thumb:Hide()
            return
        end
        local trackH = math.max(20, (list:GetHeight() or 0) - (top or 4) - 4)
        local h = math.max(18, trackH * shown / total)
        local y = (trackH - h) * offset / math.max(1, total - shown)
        m.thumb:ClearAllPoints()
        m.thumb:SetPoint("TOPRIGHT", -3, -(top or 4) - y)
        m.thumb:SetHeight(h)
        m.track:Show()
        m.thumb:Show()
    end
    return m
end

-- Pourquoi on ne peut pas grouper avec ce joueur (nil si on peut)
local function CantGroupReason(faction, ruleset)
    if faction and faction ~= "" and faction ~= ns.MyFaction() then
        return L["Autre faction : vous ne pouvez pas grouper ni vous chuchoter."]
    end
    if not ns.RulesetMatches(ruleset) then
        return L["Autre type de serveur ("] .. (ns.RulesetName(ruleset) or "?") .. L[") : vous ne pouvez pas grouper ensemble."]
    end
end

local function FactionTag(faction)
    if faction == ns.MyFaction() then return "" end
    if faction == "Horde" then return " |cffff5555[H]|r" end
    if faction == "Alliance" then return " |cff5599ff[A]|r" end
    return ""
end

local DOT = "  |cff4d5466·|r  "     -- séparateur discret entre deux infos

---------------------------------------------------------------------------
-- Fenêtre principale
---------------------------------------------------------------------------
local f = CreateFrame("Frame", "BabillardFRFrame", UIParent)
f:SetSize(WIN_W, WIN_H)
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

-- Ombre douce autour de la fenêtre (Media/Shadow, découpée en coins et bords)
Try(function()
    local S = 16
    local function Piece(l, r, t, b, p1, x1, y1, p2, x2, y2)
        local tex = f:CreateTexture(nil, "BACKGROUND", nil, -8)
        tex:SetTexture(ns.MEDIA .. "Shadow")
        tex:SetTexCoord(l, r, t, b)
        tex:SetVertexColor(0, 0, 0, 0.85)
        tex:SetPoint("TOPLEFT", f, p1, x1, y1)
        tex:SetPoint("BOTTOMRIGHT", f, p2, x2, y2)
    end
    Piece(0, 0.25, 0, 0.25, "TOPLEFT", -S, S, "TOPLEFT", 0, 0)
    Piece(0.25, 0.75, 0, 0.25, "TOPLEFT", 0, S, "TOPRIGHT", 0, 0)
    Piece(0.75, 1, 0, 0.25, "TOPRIGHT", 0, S, "TOPRIGHT", S, 0)
    Piece(0, 0.25, 0.25, 0.75, "TOPLEFT", -S, 0, "BOTTOMLEFT", 0, 0)
    Piece(0.75, 1, 0.25, 0.75, "TOPRIGHT", 0, 0, "BOTTOMRIGHT", S, 0)
    Piece(0, 0.25, 0.75, 1, "BOTTOMLEFT", -S, 0, "BOTTOMLEFT", 0, -S)
    Piece(0.25, 0.75, 0.75, 1, "BOTTOMLEFT", 0, 0, "BOTTOMRIGHT", 0, -S)
    Piece(0.75, 1, 0.75, 1, "BOTTOMRIGHT", 0, 0, "BOTTOMRIGHT", S, -S)
end)
-- Fond nuit et cadre doré
Try(function()
    local bg = f:CreateTexture(nil, "BACKGROUND", nil, -7)
    bg:SetAllPoints()
    Skin.Gradient(bg, "VERTICAL", 0.022, 0.026, 0.045, 0.98, 0.065, 0.075, 0.12, 0.98)
end)
f.border = Skin.Border(f, GOLD, 0.65, "OVERLAY")

-- En-tête: emblème, titre, qui est en ligne, boutons
local header = CreateFrame("Frame", nil, f)
header:SetPoint("TOPLEFT", 1, -1)
header:SetPoint("TOPRIGHT", -1, -1)
header:SetHeight(HEADER_H - 1)
Try(function()
    Skin.GradientFill(header, { 0.05, 0.06, 0.095, 1 }, { 0.11, 0.12, 0.19, 1 })
    local glow = header:CreateTexture(nil, "BORDER")
    glow:SetPoint("TOPLEFT")
    glow:SetPoint("BOTTOMLEFT")
    glow:SetWidth(340)
    Skin.Gradient(glow, "HORIZONTAL", 1, 0.8, 0.35, 0.12, 1, 0.8, 0.35, 0)
end)
local emblem = header:CreateTexture(nil, "ARTWORK")
emblem:SetSize(40, 40)
emblem:SetPoint("LEFT", 8, 0)
emblem:SetTexture(ns.EMBLEM64)
local title = Text(header, "Title")
title:SetPoint("TOPLEFT", 56, -8)
title:SetText("Babillard Forever FR")
local subtitle = Text(header, "SmallDim")
subtitle:SetPoint("TOPLEFT", 56, -29)
subtitle:SetPoint("TOPRIGHT", -110, -29)
subtitle:SetJustifyH("LEFT")
subtitle:SetWordWrap(false)

local closeBtn = IconButton(header, "close", 26, L["Fermer"], nil, function() f:Hide() end)
closeBtn:SetPoint("RIGHT", -8, 0)
local optBtn = IconButton(header, "gear", 26, L["Options"], L["Alertes, chat, affichage, taille de la fenêtre et repérage des francophones."], function()
    ns.PlayClick()
    f:Hide()
    if ns.OpenOptions then ns.OpenOptions() end
end)
optBtn:SetPoint("RIGHT", closeBtn, "LEFT", -2, 0)
local refreshBtn = IconButton(header, "refresh", 26, L["Actualiser"], L["Redemande les annonces actives aux autres joueurs qui ont l'addon (groupes et guildes). Les nouvelles annonces arrivent d'elles-mêmes: ce bouton sert surtout après ta connexion ou si le babillard te semble vide."], function()
    ns.RefreshListings()
end)
refreshBtn:SetPoint("RIGHT", optBtn, "LEFT", -2, 0)

-- Barre des onglets
local tabBar = CreateFrame("Frame", nil, f)
tabBar:SetPoint("TOPLEFT", 1, -HEADER_H)
tabBar:SetPoint("TOPRIGHT", -1, -HEADER_H)
tabBar:SetHeight(TAB_H)
Try(function()
    Skin.Fill(tabBar, 0.02, 0.024, 0.04, 1)
    local top = tabBar:CreateTexture(nil, "BORDER")
    top:SetPoint("TOPLEFT")
    top:SetPoint("TOPRIGHT")
    ThinLine(top, true)
    top:SetColorTexture(GOLD[1], GOLD[2], GOLD[3], 0.35)
    local bottom = tabBar:CreateTexture(nil, "BORDER")
    bottom:SetPoint("BOTTOMLEFT")
    bottom:SetPoint("BOTTOMRIGHT")
    ThinLine(bottom, true)
    bottom:SetColorTexture(GOLD[1], GOLD[2], GOLD[3], 0.25)
end)

local tabs = {}
local TAB_INFO = {
    { L["Groupes"], "party" }, { L["Guildes"], "banner" }, { L["Mon perso"], "card" },
    { L["En ligne"], "online" }, { L["Chat"], "chat" }, { L["Commandes"], "terminal" },
}
local TAB_BADGE = { [1] = true, [4] = true, [5] = true }   -- onglets qui peuvent avoir une pastille
for i, info in ipairs(TAB_INFO) do
    local t = CreateFrame("Button", nil, tabBar)
    t:SetHeight(TAB_H)
    t.glow = t:CreateTexture(nil, "BACKGROUND")
    t.glow:SetAllPoints()
    Skin.Gradient(t.glow, "VERTICAL", 1, 0.8, 0.35, 0.16, 1, 0.8, 0.35, 0)
    t.glow:Hide()
    t.bar = t:CreateTexture(nil, "ARTWORK")
    t.bar:SetPoint("BOTTOMLEFT", 8, 1)
    t.bar:SetPoint("BOTTOMRIGHT", -8, 1)
    t.bar:SetHeight(2)
    t.bar:SetColorTexture(1, 0.84, 0.3, 1)
    t.bar:Hide()
    if i < #TAB_INFO then
        Try(function()
            local sep = t:CreateTexture(nil, "BORDER")
            sep:SetPoint("TOPRIGHT", 0, -8)
            sep:SetPoint("BOTTOMRIGHT", 0, 8)
            ThinLine(sep, false)
            sep:SetColorTexture(1, 1, 1, 0.07)
        end)
    end
    Try(function()
        local hl = t:CreateTexture(nil, "HIGHLIGHT")
        hl:SetAllPoints()
        hl:SetColorTexture(1, 1, 1, 0.04)
        t:SetHighlightTexture(hl)
    end)
    t.label = Text(t, "TabOff")
    t.label:SetPoint("CENTER", TAB_BADGE[i] and 0 or 9, 0)
    t.label:SetText(info[1])
    t.icon = Icon(t, info[2], 14, "ARTWORK", 0.66, 0.70, 0.78)
    t.icon:SetPoint("RIGHT", t.label, "LEFT", -5, 0)
    -- Pastille (nombre de groupes, de joueurs en ligne, de messages non lus)
    t.badge = CreateFrame("Frame", nil, t)
    t.badge:SetHeight(13)
    t.badge:SetPoint("LEFT", t.label, "RIGHT", 4, 1)
    t.badge.bg = t.badge:CreateTexture(nil, "ARTWORK")
    t.badge.bg:SetAllPoints()
    t.badge.bg:SetColorTexture(1, 0.80, 0.30, 0.9)
    t.badge.text = Text(t.badge, "Badge")
    t.badge.text:SetPoint("CENTER", 0, 0)
    t.badge:Hide()
    t:SetScript("OnClick", function()
        ns.PlayClick()
        UI.SelectView(i)
    end)
    tabs[i] = t
end
f.Tabs = tabs
do
    local want, total = {}, 0
    for i, t in ipairs(tabs) do
        want[i] = 14 + 5 + (t.label:GetStringWidth() or 60) + (TAB_BADGE[i] and 24 or 0) + 22
        total = total + want[i]
    end
    local extra = ((WIN_W - 2) - total) / #tabs
    local x = 0
    for i, t in ipairs(tabs) do
        local w = want[i] + extra
        t:SetWidth(w)
        t:SetPoint("TOPLEFT", x, 0)
        x = x + w
    end
end

local function SetBadge(i, n, muted)
    local t = tabs[i]
    if not t then return end
    if not n or n <= 0 then t.badge:Hide() return end
    t.badge.text:SetText(n > 99 and "99+" or tostring(n))
    t.badge.text:SetFontObject(muted and F.BadgeLight or F.Badge)
    t.badge:SetWidth(math.max(15, (t.badge.text:GetStringWidth() or 8) + 9))
    if muted then
        t.badge.bg:SetColorTexture(0.20, 0.23, 0.32, 1)
    else
        t.badge.bg:SetColorTexture(1, 0.80, 0.30, 0.95)
    end
    t.badge:Show()
end

local function UpdateTabs()
    for i, t in ipairs(tabs) do
        local sel = i == state.view
        t.label:SetFontObject(sel and F.TabOn or F.TabOff)
        if sel then t.icon:SetVertexColor(1, 0.84, 0.3) else t.icon:SetVertexColor(0.66, 0.70, 0.78) end
        t.glow:SetShown(sel)
        t.bar:SetShown(sel)
    end
end

-- Pied de fenêtre: état de la connexion à gauche, le site à droite
local foot = CreateFrame("Frame", nil, f)
foot:SetPoint("BOTTOMLEFT", 1, 1)
foot:SetPoint("BOTTOMRIGHT", -1, 1)
foot:SetHeight(FOOT_H - 1)
Try(function()
    Skin.Fill(foot, 0.015, 0.018, 0.03, 1)
    local line = foot:CreateTexture(nil, "BORDER")
    line:SetPoint("TOPLEFT")
    line:SetPoint("TOPRIGHT")
    ThinLine(line, true)
    line:SetColorTexture(GOLD[1], GOLD[2], GOLD[3], 0.3)
end)

local channelStatus = Text(foot, "Tiny")
channelStatus:SetPoint("LEFT", 12, 0)
channelStatus:SetPoint("RIGHT", -12, 0)
channelStatus:SetJustifyH("LEFT")
channelStatus:SetWordWrap(false)

-- Zone des onglets (entre la barre des onglets et le pied)
local views = {}
for i = 1, 6 do
    views[i] = CreateFrame("Frame", nil, f)
    views[i]:SetPoint("TOPLEFT", 0, -TOP)
    views[i]:SetPoint("BOTTOMRIGHT", 0, FOOT_H)
    views[i]:Hide()
end

---------------------------------------------------------------------------
-- Bannière « Communauté », collée au-dessus de la fenêtre: bien visible tant que le joueur n'en fait pas partie.
--   Une communauté existe pour moi : bouton Rejoindre (ouvre la fenêtre du jeu pour la rejoindre).
--   Aucune pour ma faction ou ma région : on demande à un joueur de la créer (l'addon partage ensuite le lien).
---------------------------------------------------------------------------
local banner = CreateFrame("Frame", nil, f)
banner:SetSize(WIN_W, 58)
banner:SetPoint("BOTTOM", f, "TOP", 0, 4)
banner:EnableMouse(true)
Try(function()
    Skin.GradientFill(banner, { 0.10, 0.06, 0.015, 0.97 }, { 0.30, 0.20, 0.06, 0.97 })
    Skin.Border(banner, GOLD, 1)
end)
banner.icon = banner:CreateTexture(nil, "ARTWORK")
banner.icon:SetSize(42, 42)
banner.icon:SetPoint("LEFT", 10, 0)
banner.icon:SetTexture(ns.EMBLEM64)
banner.title = Text(banner, "Head")
banner.title:SetPoint("TOPLEFT", 62, -10)
banner.title:SetPoint("TOPRIGHT", -150, -10)
banner.title:SetJustifyH("LEFT")
banner.title:SetWordWrap(false)
banner.text = Text(banner, "Small")
banner.text:SetPoint("TOPLEFT", banner.title, "BOTTOMLEFT", 0, -4)
banner.text:SetPoint("TOPRIGHT", banner.title, "BOTTOMRIGHT", 0, -4)
banner.text:SetJustifyH("LEFT")
banner.text:SetMaxLines(2)
banner.join = NewButton(banner, L["Rejoindre"], 104, 28, "primary")
banner.join:SetPoint("RIGHT", -34, 0)
banner.close = IconButton(banner, "close", 20, L["Fermer"], L["Cacher la bannière jusqu'à ta prochaine connexion."], function(self)
    ns.bannerHidden = true   -- jusqu'à la prochaine connexion
    self:GetParent():Hide()
end)
banner.close:SetPoint("TOPRIGHT", -4, -4)
banner:Hide()

function UI.JoinCommunity()
    ns.PlayClick()
    local code = ns.CommunityInvite()
    if code and ns.RememberJoinAttempt then ns.RememberJoinAttempt(code) end
    if code and SetItemRef then
        -- Comme un clic sur le lien dans le chat: le jeu ouvre sa fenêtre pour rejoindre la communauté.
        local link = "clubTicket:" .. code
        if pcall(SetItemRef, link, "|H" .. link .. "|h[" .. ns.COMMUNITY_NAME .. "]|h", "LeftButton") then
            ns.Print(L["si la fenêtre ne s'est pas ouverte, clique ici: |cff66ccff|H"] .. link .. L["|h[Rejoindre "] .. ns.COMMUNITY_NAME .. "]|h|r")
            return
        end
    end
    ns.ShowCommunityInvite()
end
banner.join:SetScript("OnClick", function() UI.JoinCommunity() end)
banner.join:SetScript("OnEnter", function(self)
    GameTooltip:SetOwner(self, "ANCHOR_RIGHT")
    GameTooltip:AddLine(L["Rejoindre la communauté"])
    GameTooltip:AddLine(L["Ouvre la fenêtre du jeu pour rejoindre « "] .. ns.COMMUNITY_NAME .. L[" ». Le lien est aussi écrit dans ton chat et prêt à copier."], 1, 1, 1, true)
    GameTooltip:Show()
end)
banner.join:SetScript("OnLeave", function() GameTooltip:Hide() end)

function UI.UpdateBanner()
    if ns.bannerHidden or ns.CommunityId() or (UI.WelcomeShown and UI.WelcomeShown()) then banner:Hide() return end
    if not ns.MyRuleset() then
        banner.title:SetText(L["Joue avec les francophones de TOUS les serveurs!"])
        banner.text:SetText(L["Choisis d'abord ton type de serveur dans l'onglet Mon perso, puis rejoins la communauté."])
        banner.join:Hide()
    elseif ns.CommunityInvite() then
        banner.title:SetText(L["Joue avec les francophones de TOUS les serveurs!"])
        local by = ns.CommunityInviteBy and ns.CommunityInviteBy()
        banner.text:SetText(L["Sans la communauté, tu ne vois que les joueurs de ton serveur. Un clic pour la rejoindre."]
            .. (by and ("  |cffb9a77a(" .. L["partagée par "] .. ns.ShortName(by) .. ")|r") or ""))
        banner.join:Show()
    else
        banner.title:SetText(L["Aucune communauté francophone pour ta faction... crée-la!"])
        banner.text:SetText(L["Crée une communauté nommée « "] .. ns.COMMUNITY_NAME .. L[" » (touche J), puis un lien d'invitation qui n'expire jamais: l'addon le partagera tout seul."])
        banner.join:Hide()
    end
    banner:Show()
end

---------------------------------------------------------------------------
-- Vue 1 : Groupes
---------------------------------------------------------------------------
local gv = views[1]
local G = {}   -- éléments de la vue Groupes

SectionTitle(gv, L["Mon annonce"], PAD, -12)
local my = MakePanel(gv, -32, -138)

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
    dd = NewButton(parent, L["Choisir une activité"], width, 24)
    dd:SetPoint("TOPLEFT", x, y)
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

local catItems = {}
for _, c in ipairs(ns.CATEGORIES) do tinsert(catItems, { label = ns.CatName(c), value = c }) end
G.cat = MakeSegmented(my, catItems, 84, 10, -10,
    function(v) return state.cat == v end,
    function(v) state.cat = v; UI.UpdateMyPanel() end)

G.picker = MakeActivityPicker(my, 10, -41, 240)

G.rolesLabel = Text(my, "SmallDim")
G.rolesLabel:SetPoint("TOPLEFT", 264, -49)
G.rolesLabel:SetText(L["Rôles recherchés"])
G.roles = MakeRoleIcons(my, 24, MyRolesSet, nil,
    function() return state.lfmCounts end,
    function() local a = state.akey and ns.ACT_BY_KEY[state.akey]; return a and a.size > 5 end)
G.roles[1]:SetPoint("LEFT", G.rolesLabel, "RIGHT", 10, 0)

G.note = MakeInput(my, L["Note : QC, vocal Discord, débutants bienvenus"], 318, 60, 10, -74)

G.alsoChat = MakeCheck(my, L["Aussi dans le chat"])
G.alsoChat:SetPoint("LEFT", G.note, "RIGHT", 12, 0)
G.alsoChat:SetScript("OnClick", function(self)
    ns.db.opts.alsoChat = self:GetChecked() and true or false
    ns.PlayClick()
end)
Tooltip(G.alsoChat, L["Aussi dans le chat"],
    L["Au clic sur Publier, l'annonce est aussi envoyée dans « Recherche de groupe » (ou « Général »). Une fois par minute au maximum."])

G.pub = NewButton(my, L["Publier"], COL_W, 28, "primary")
G.pub:SetPoint("TOPRIGHT", -10, -10)
G.del = NewButton(my, L["Retirer"], COL_W, 22, "small")
G.del:SetPoint("TOP", G.pub, "BOTTOM", 0, -6)
G.status = Text(my, "SmallDim")
G.status:SetPoint("TOP", G.del, "BOTTOM", 0, -6)
G.status:SetWidth(COL_W + 16)
G.status:SetJustifyH("CENTER")

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

-- Liste des annonces: titre, filtres et « À mon niveau » sur la même ligne
SectionTitle(gv, L["Annonces"], PAD, -152, true)
local filterItems = { { label = ns.CatName("Tous"), value = "Tous" } }
for _, c in ipairs(ns.CATEGORIES) do tinsert(filterItems, { label = ns.CatName(c), value = c }) end
G.filter = MakeSegmented(gv, filterItems, 78, 100, -147,
    function(v) return state.filterCat == v end,
    function(v) state.filterCat = v; state.scroll = 0; UI.Refresh() end)

G.levelCB = MakeCheck(gv, L["À mon niveau"])
G.levelCB:SetPoint("TOPLEFT", 100 + 5 * 82 + 4, -150)
G.levelCB:SetScript("OnClick", function(self)
    ns.db.opts.levelOnly = self:GetChecked() and true or false
    ns.PlayClick()
    state.scroll = 0
    UI.Refresh()
end)
Tooltip(G.levelCB, L["À mon niveau"], L["Coché: cache les groupes qui ne sont pas de ton niveau. Décoché: tout le monde est affiché, et ces groupes sont en gris à la fin de la liste."])

local glist = MakePanel(gv, -178, 10)
local GROUP_ROWS = math.floor((VIEW_H - 178 - 10 - 8) / ROW_H)
G.scrollMark = MakeScrollMark(glist)

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
    local why = CantGroupReason(d.faction, d.ruleset)
    if why then GameTooltip:AddLine(why, 1, 0.45, 0.45, true) end
    local levels = a.min == a.max and (L["Niveau "] .. a.min) or (L["Niveaux "] .. a.min .. L[" à "] .. a.max)
    if ns.ActivityInRange(a, ns.MyLevel()) then
        GameTooltip:AddLine(levels, 0.6, 0.8, 1)
    else
        GameTooltip:AddLine(levels .. L[" (pas ton niveau)"], 1, 0.6, 0.2)
    end
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
    local row = MakeRow(glist, i, ROW_H, GroupTooltip)
    row.icon = row:CreateTexture(nil, "ARTWORK")
    row.icon:SetSize(22, 22)
    row.icon:SetPoint("LEFT", 9, 0)
    row.title = Text(row, "Text")
    row.title:SetPoint("TOPLEFT", 42, -6)
    row.title:SetPoint("TOPRIGHT", -84, -6)
    row.title:SetJustifyH("LEFT")
    row.title:SetWordWrap(false)
    row.sub = Text(row, "SmallDim")
    row.sub:SetPoint("TOPLEFT", 42, -22)
    row.sub:SetPoint("TOPRIGHT", -84, -22)
    row.sub:SetJustifyH("LEFT")
    row.sub:SetWordWrap(false)
    row.age = Text(row, "Tiny")
    row.age:SetPoint("TOPRIGHT", -8, -7)
    row.roleIcons = {}
    for j = 1, 3 do
        local ic = row:CreateTexture(nil, "ARTWORK")
        ic:SetSize(15, 15)
        if j == 1 then ic:SetPoint("BOTTOMRIGHT", -7, 5) else ic:SetPoint("RIGHT", row.roleIcons[j - 1], "LEFT", -2, 0) end
        row.roleIcons[j] = ic
        tinsert(row.hideOnHover, ic)
    end
    tinsert(row.hideOnHover, row.age)
    -- Au survol, le texte s'arrête avant les boutons Chuchoter / Ignorer
    function row:OnHoverLayout(on)
        local right = on and -170 or -84
        self.title:SetPoint("TOPRIGHT", right, -6)
        self.sub:SetPoint("TOPRIGHT", right, -22)
    end
    -- Boutons au survol (le premier ajouté est le plus à droite)
    AddRowAction(row, L["Chuchoter"], 86,
        function(d) return not ns.IsMe(d.sender) and ns.CanGroupWith(d.faction, d.ruleset) end,
        function(d) DoWhisper(d.sender, d) end, true)
    AddRowAction(row, L["Ignorer"], 64,
        function(d) return not ns.IsMe(d.sender) end,
        function(d) ns.PlayClick(); ns.Ignore(d.sender) end)
    G.rows[i] = row
end

-- Liste vide ou presque: un mot pour aider, et un bouton vers ceux qui sont en ligne
G.empty = Text(glist, "TextDim")
G.empty:SetPoint("CENTER", 0, -6)
G.empty:SetWidth(430)
G.empty:SetSpacing(3)
G.emptyBtn = NewButton(glist, L["Voir qui est en ligne"], 190, 26)
G.emptyBtn:SetPoint("TOP", G.empty, "BOTTOM", 0, -14)
G.emptyBtn:SetScript("OnClick", function() ns.PlayClick(); UI.SelectView(4) end)
G.tip = Text(glist, "SmallDim")
G.tip:SetPoint("BOTTOM", 0, 14)
G.tip:SetWidth(520)
G.tip:SetSpacing(2)
G.mark = glist:CreateTexture(nil, "BACKGROUND", nil, 2)
G.mark:SetSize(96, 96)
G.mark:SetTexture(ns.EMBLEM)
G.mark:SetAlpha(0.10)
G.mark:SetDesaturated(true)
G.tipBtn = NewButton(glist, L["Voir qui est en ligne"], 190, 24, "small")
G.tipBtn:SetPoint("BOTTOM", 0, 54)
G.tipBtn:SetScript("OnClick", function() ns.PlayClick(); UI.SelectView(4) end)
G.scrollText = Text(glist, "Tiny")
G.scrollText:SetPoint("BOTTOMRIGHT", -12, 6)

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
    G.alsoChat:SetChecked(ns.db.opts.alsoChat)
    if rebuild ~= false then G.picker:Rebuild() end
    if ns.my then
        local left = math.max(0, math.ceil((ns.EXPIRE - (GetTime() - ns.my.time)) / 60))
        G.status:SetText(L["|cff33dd55Annonce active|r\n"] .. left .. L[" min restantes"])
        G.pub:SetText(L["Republier"])
        SetEnabled(G.del, true)
    else
        G.status:SetText(L["Aucune annonce active"])
        G.pub:SetText(L["Publier"])
        SetEnabled(G.del, false)
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

-- Nombre de groupes que le joueur peut voir (pastille de l'onglet), même quand l'onglet est fermé
local function CountGroups()
    local o, n, seen = ns.db.opts, 0, {}
    for _, l in pairs(ns.listings) do
        local key = ns.BareName(l.sender)
        if l.type == "LFM" and not seen[key] and not ns.IsMe(l.sender) and not ns.IsIgnored(l.sender) and ns.ACT_BY_KEY[l.akey]
            and (l.source ~= "chat" or o.chatReading) and ns.RulesetOK(l.ruleset)
            and not (o.sameFaction and l.faction ~= ns.MyFaction())
            and not (o.levelOnly and not ns.ActivityInRange(ns.ACT_BY_KEY[l.akey], ns.MyLevel())) then
            seen[key] = true
            n = n + 1
        end
    end
    return n
end

local function RefreshGroups()
    local o = ns.db.opts
    local myLevel, myFaction = ns.MyLevel(), ns.MyFaction()
    local counts = { Tous = 0 }
    local visible = {}
    local outOfRange = {}       -- [annonce] = true: activité hors de mon niveau (affichée en gris, après les autres)
    local cantGroup = {}        -- [annonce] = true: autre faction ou autre type de serveur (en gris, tout à la fin)
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
        if show and not ns.ActivityInRange(a, myLevel) then
            if o.levelOnly then show = false else outOfRange[l] = true end
        end
        if show and not ns.CanGroupWith(l.faction, l.ruleset) then
            if (o.sameFaction and l.faction ~= myFaction) or not ns.RulesetOK(l.ruleset) then show = false
            else cantGroup[l] = true end
        end
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
        if (cantGroup[x] or false) ~= (cantGroup[y] or false) then return not cantGroup[x] end
        if (outOfRange[x] or false) ~= (outOfRange[y] or false) then return not outOfRange[x] end
        return x.time > y.time
    end)

    for _, b in ipairs(G.filter) do
        local n = counts[b.value] or 0
        b:SetText(ns.CatName(b.value) .. "  " .. (n > 0 and "|cffd9c48a" or "|cff6b7180") .. n .. "|r")
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
            local mine = ns.IsMe(d.sender)
            Skin.SetIcon(row.icon, CAT_ICON[d.cat] or "other")
            row.icon:SetVertexColor(HexRGB(ns.CAT_COLORS[d.cat]))
            -- 1re ligne: l'activité, la taille du groupe et les marques
            local title
            if outOfRange[d] then
                local lv = a.min == a.max and tostring(a.min) or (a.min .. "-" .. a.max)
                title = "|cff9aa0ab" .. a.name .. "|r  |cffd08a3c" .. L["niv "] .. lv .. "|r"
            else
                title = a.name
            end
            if d.source == "chat" then
                title = title .. L["  |cff33aaff[chat]|r"]
            elseif d.type == "LFM" then
                title = title .. "  |cff8a93a6" .. d.groupCount .. "/" .. d.size .. "|r"
            end
            if ns.HasRequest(d.sender) then title = title .. L["  |cff88ccff[demandé]|r"] end
            row.title:SetText(title)
            -- 2e ligne: qui, son niveau, sa note
            local sub = "|c" .. ns.ClassHex(d.class) .. ns.ShortName(d.sender) .. "|r" .. FactionTag(d.faction)
            if mine then sub = sub .. L[" |cff888888(toi)|r"] end
            if d.level > 0 then sub = sub .. DOT .. L["niv "] .. d.level end
            if d.note ~= "" then sub = sub .. DOT .. d.note end
            row.sub:SetText(sub)
            -- Rôles recherchés, dans l'ordre tank, soigneur, DPS (le dernier est collé à droite)
            local wanted = {}
            for _, key in ipairs(ns.ROLE_ORDER) do if d.roles[key] then tinsert(wanted, key) end end
            for k = 1, 3 do
                local key = wanted[#wanted - k + 1]
                if key then
                    local info = ns.ROLE_INFO[key]
                    ns.SetIcon(row.roleIcons[k], info.tiny, info.icon)
                    row.roleIcons[k]:Show()
                else
                    row.roleIcons[k]:Hide()
                end
            end
            row.mine:SetShown(mine)
            row:SetAlpha(cantGroup[d] and 0.5 or (outOfRange[d] and 0.72 or 1))
            row.age:SetText(ns.Ago(d.time))
            row:Show()
            if row:IsMouseOver() then row:GetScript("OnEnter")(row) end
        else
            row:Hide()
        end
    end

    G.emptyBtn:Hide()
    if #visible == 0 then
        local msg
        if hiddenByOptions > 0 and counts.Tous == 0 then
            msg = hiddenByOptions .. (hiddenByOptions > 1 and L[" annonces sont cachées"] or L[" annonce est cachée"])
                .. L[" par tes options (niveau, faction, type de serveur ou lecture du chat).\nOuvre |cffffd100/bf options|r pour les voir."]
        elseif counts.Tous > 0 then
            msg = L["Aucun groupe dans cette catégorie.\nClique sur |cffffd100Tous|r pour voir les "] .. counts.Tous .. L[" autres."]
        else
            msg = L["Aucun groupe pour l'instant.\nPublie le tien en haut: les francophones qui ont l'addon le verront tout de suite."]
            if not o.chatReading then
                msg = msg .. L["\n|cff888888La lecture du chat est coupée: active-la dans |cffffd100/bf options|r|cff888888 pour voir les annonces du général.|r"]
            end
            G.emptyBtn:Show()
        end
        G.empty:SetText(msg)
        G.empty:Show()
    else
        G.empty:Hide()
    end
    -- Peu de groupes: un mot d'encouragement dans l'espace libre (et le bouton vers En ligne s'il y a de la place)
    local few = #visible > 0 and #visible <= GROUP_ROWS - 3 and state.filterCat == "Tous"
    if few then
        G.tip:SetText(L["C'est tranquille pour l'instant. Plus il y a de francophones avec l'addon, plus le babillard se remplit: parles-en à tes amis et à ta guilde!"])
    end
    G.tip:SetShown(few)
    G.tipBtn:SetShown(few and #visible <= 3)
    -- Emblème en filigrane: au-dessus du message quand la liste est vide, sinon au-dessus du bouton
    G.mark:ClearAllPoints()
    if #visible == 0 then
        G.mark:SetPoint("BOTTOM", G.empty, "TOP", 0, 14)
    else
        G.mark:SetPoint("BOTTOM", 0, 92)
    end
    G.mark:SetShown((few and #visible <= 3) or #visible == 0)
    if maxOffset > 0 then
        G.scrollText:SetText(string.format(L["%d-%d sur %d (molette)"], state.scroll + 1,
            math.min(state.scroll + GROUP_ROWS, #visible), #visible))
    else
        G.scrollText:SetText("")
    end
    G.scrollMark.Update(#visible, GROUP_ROWS, state.scroll)
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

SectionTitle(vv, L["Annoncer ma guilde"], PAD, -12)
local gp = MakePanel(vv, -32, -138)

GU.guildName = Text(gp, "Text")
GU.guildName:SetPoint("TOPLEFT", 12, -14)
GU.guildName:SetPoint("TOPRIGHT", -(COL_W + 24), -14)
GU.guildName:SetJustifyH("LEFT")
GU.guildName:SetWordWrap(false)

local focusItems = {}
for _, k in ipairs(ns.GUILD_FOCUS_ORDER) do tinsert(focusItems, { label = ns.GUILD_FOCUS[k], value = k }) end
GU.focus = MakeSegmented(gp, focusItems, 110, 10, -41,
    function(v) return state.guildFocus == v end,
    function(v) state.guildFocus = v; GU.focus.Update() end)

GU.note = MakeInput(gp, L["Description : ex. guilde QC détendue, raids 2 soirs par semaine"], 428, 60, 10, -74)

GU.pub = NewButton(gp, L["Publier"], COL_W, 28, "primary")
GU.pub:SetPoint("TOPRIGHT", -10, -10)
GU.del = NewButton(gp, L["Retirer"], COL_W, 22, "small")
GU.del:SetPoint("TOP", GU.pub, "BOTTOM", 0, -6)
GU.status = Text(gp, "SmallDim")
GU.status:SetPoint("TOP", GU.del, "BOTTOM", 0, -6)
GU.status:SetWidth(COL_W + 16)
GU.status:SetJustifyH("CENTER")

GU.pub:SetScript("OnClick", function()
    ns.EnsureChannel()
    ns.PublishGuild(state.guildFocus, GU.note:GetText())
end)
GU.del:SetScript("OnClick", function()
    ns.PlayClick()
    ns.WithdrawGuild()
end)

SectionTitle(vv, L["Guildes francophones"], PAD, -152)
GU.scrollText = Text(vv, "SmallDim")
GU.scrollText:SetPoint("TOPRIGHT", -PAD - 2, -154)

local gulist = MakePanel(vv, -178, 10)
local GUILD_ROWS = math.floor((VIEW_H - 178 - 10 - 8) / ROW_H)
GU.scrollMark = MakeScrollMark(gulist)

local function GuildTooltip(d)
    local why = CantGroupReason(d.faction, d.ruleset)
    if d.detected then
        GameTooltip:AddLine("|cffc28cff<" .. d.guild .. ">|r" .. FactionTag(d.faction))
        if why then GameTooltip:AddLine(why, 1, 0.45, 0.45, true) end
        GameTooltip:AddLine(L["Guilde francophone repérée en jeu, pas encore annoncée avec l'addon."], 1, 1, 1, true)
        if d.sender ~= "" then GameTooltip:AddLine(L["Dernier membre croisé : "] .. ns.ShortName(d.sender), 0.8, 0.8, 0.8) end
        GameTooltip:AddLine(L["Vue le "] .. date(ns.lang == "en" and "%Y-%m-%d" or "%d/%m/%Y", d.seenAt), 0.5, 0.5, 0.5)
        return
    end
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
    local row = MakeRow(gulist, i, ROW_H, GuildTooltip)
    row.icon = Icon(row, "banner", 20, "ARTWORK")
    row.icon:SetPoint("LEFT", 10, 0)
    row.title = Text(row, "Text")
    row.title:SetPoint("TOPLEFT", 42, -6)
    row.title:SetPoint("TOPRIGHT", -110, -6)
    row.title:SetJustifyH("LEFT")
    row.title:SetWordWrap(false)
    row.sub = Text(row, "SmallDim")
    row.sub:SetPoint("TOPLEFT", 42, -22)
    row.sub:SetPoint("TOPRIGHT", -110, -22)
    row.sub:SetJustifyH("LEFT")
    row.sub:SetWordWrap(false)
    row.focus = Text(row, "Small")
    row.focus:SetPoint("RIGHT", -10, 0)
    row.focus:SetJustifyH("RIGHT")
    tinsert(row.hideOnHover, row.focus)
    AddRowAction(row, L["Chuchoter"], 86,
        function(d) return d.sender ~= "" and not ns.IsMe(d.sender) and ns.CanGroupWith(d.faction, d.ruleset) end,
        function(d) DoWhisper(d.sender) end, true)
    GU.rows[i] = row
end

GU.empty = Text(gulist, "TextDim")
GU.empty:SetPoint("CENTER", 0, 10)
GU.empty:SetWidth(470)
GU.empty:SetSpacing(3)
GU.empty:SetText(L["Aucune guilde annoncée pour l'instant.\nTa guilde recrute? Annonce-la en haut!"])

vv:EnableMouseWheel(true)
vv:SetScript("OnMouseWheel", function(_, delta)
    state.guildScroll = math.max(0, state.guildScroll - delta)
    UI.Refresh()
end)

local FOCUS_COLOR = { PVE = "ff4aa8ff", PVP = "ffb35cf5", SOC = "ff3fe03f", LVL = "ffffd100" }

local function RefreshGuilds()
    local guild = GetGuildInfo("player")
    if guild then
        GU.guildName:SetText(L["Ta guilde : |cff40ff40<"] .. guild .. ">|r")
        SetEnabled(GU.pub, true)
    else
        GU.guildName:SetText(L["|cff888888Tu n'es dans aucune guilde. Tu peux quand même voir celles qui recrutent.|r"])
        SetEnabled(GU.pub, false)
    end
    GU.focus.Update()
    if ns.myGuild then
        local left = math.max(0, math.ceil((ns.GUILD_EXPIRE - (GetTime() - ns.myGuild.time)) / 60))
        GU.status:SetText(L["|cff33dd55Annonce active|r\n"] .. left .. L[" min restantes"])
        GU.pub:SetText(L["Republier"])
        SetEnabled(GU.del, true)
    else
        GU.status:SetText(L["Aucune annonce active"])
        GU.pub:SetText(L["Publier"])
        SetEnabled(GU.del, false)
    end

    local o = ns.db.opts
    local visible = {}
    for _, g in pairs(ns.guilds) do
        if (not o.sameFaction or g.faction == ns.MyFaction()) and ns.RulesetOK(g.ruleset) then tinsert(visible, g) end
    end
    -- Celles qu'on peut rejoindre d'abord; les autres (autre faction, autre type de serveur) en gris à la fin
    table.sort(visible, function(x, y)
        local cx, cy = ns.CanGroupWith(x.faction, x.ruleset), ns.CanGroupWith(y.faction, y.ruleset)
        if cx ~= cy then return cx end
        return x.time > y.time
    end)
    -- Puis les guildes francophones repérées en jeu qui ne sont pas (encore) annoncées avec l'addon
    if o.spotGuilds then
        local announced = {}
        for _, g in pairs(ns.guilds) do announced[g.guild] = true end
        local mine = ns.MyFaction()
        for _, e in ipairs(ns.KnownFrenchGuilds()) do
            if not announced[e.guild] and (not o.sameFaction or not e.faction or e.faction == mine) then
                tinsert(visible, { guild = e.guild, detected = true, sender = e.who or "", faction = e.faction or "",
                    class = "", level = 0, note = L["Repérée en jeu"], seenAt = e.t })
            end
        end
    end
    -- Repérées de ma faction avant celles de l'autre faction (l'ordre des plus récentes est gardé)
    local first, last = {}, {}
    for _, g in ipairs(visible) do
        if g.detected and not ns.CanGroupWith(g.faction) then tinsert(last, g) else tinsert(first, g) end
    end
    visible = first
    for _, g in ipairs(last) do tinsert(visible, g) end

    local maxOffset = math.max(0, #visible - GUILD_ROWS)
    state.guildScroll = math.min(state.guildScroll, maxOffset)
    for i, row in ipairs(GU.rows) do
        local d = visible[i + state.guildScroll]
        row.data = d
        if d then row:SetAlpha(ns.CanGroupWith(d.faction, d.ruleset) and 1 or 0.5) end
        if d and d.detected then
            row.icon:SetVertexColor(0.76, 0.55, 1)
            row.title:SetText("|cffc28cff<" .. d.guild .. ">|r" .. FactionTag(d.faction))
            row.sub:SetText((d.sender ~= "" and (L["Dernier membre croisé : "] .. ns.ShortName(d.sender)) or L["Croisée en jeu"]))
            row.focus:SetText("|cffc28cff" .. L["Repérée"] .. "|r")
            row:Show()
        elseif d then
            row.icon:SetVertexColor(0.25, 1, 0.25)
            row.title:SetText("|cff40ff40<" .. d.guild .. ">|r" .. FactionTag(d.faction))
            local sub = "|c" .. ns.ClassHex(d.class) .. ns.ShortName(d.sender) .. "|r"
            if d.note ~= "" then sub = sub .. DOT .. d.note end
            row.sub:SetText(sub)
            row.focus:SetText("|c" .. (FOCUS_COLOR[d.focus] or "ffffffff") .. (ns.GUILD_FOCUS[d.focus] or "") .. "|r")
            row:Show()
        else
            row:Hide()
        end
    end
    GU.empty:SetShown(#visible == 0)
    GU.scrollText:SetText(#visible > 0 and Plural(#visible, L["guilde"], L["guildes"]) or "")
    GU.scrollMark.Update(#visible, GUILD_ROWS, state.guildScroll)
end

---------------------------------------------------------------------------
-- Vue 3 : Mon perso
---------------------------------------------------------------------------
local mv = views[3]
local M = {}

SectionTitle(mv, L["Mon personnage"], PAD, -12)
local mp = MakePanel(mv, -32, -268)

M.badge = Icon(mp, "card", 34, "ARTWORK", 1, 0.84, 0.3)
M.badge:SetPoint("TOPLEFT", 14, -14)
M.name = Text(mp, "Title")
M.name:SetPoint("TOPLEFT", 58, -13)
M.name:SetPoint("TOPRIGHT", -14, -13)
M.name:SetJustifyH("LEFT")
M.name:SetWordWrap(false)
M.line = Text(mp, "SmallDim")
M.line:SetPoint("TOPLEFT", 58, -35)
M.line:SetPoint("TOPRIGHT", -14, -35)
M.line:SetJustifyH("LEFT")
M.line:SetWordWrap(false)

local LABELS = { L["Niveau d'objet"], L["Métiers"], L["Talents"] }
M.values = {}
for i, label in ipairs(LABELS) do
    local y = -64 - (i - 1) * 20
    local l = Text(mp, "SmallDim")
    l:SetPoint("TOPLEFT", 16, y)
    l:SetText(label)
    local v = Text(mp, "Small")
    v:SetPoint("TOPLEFT", 150, y)
    v:SetPoint("TOPRIGHT", -14, y)
    v:SetJustifyH("LEFT")
    v:SetWordWrap(false)
    M.values[i] = v
end

-- Type de serveur: le jeu n'a pas de fonction pour le lire, alors le joueur le choisit
local RS_SHORT = { normal = "PvE", pvp = "PvP", rp = "RP", rp_pvp = "RP-PvP" }
local rsl = Text(mp, "SmallGold")
rsl:SetPoint("TOPLEFT", 16, -138)
rsl:SetText(L["Type de serveur"])
local rsItems = {}
for _, id in ipairs(ns.RULESET_ORDER) do tinsert(rsItems, { label = RS_SHORT[id] or ns.RulesetName(id), value = id }) end
M.ruleset = MakeSegmented(mp, rsItems, 78, 150, -133,
    function(v) return ns.MyRuleset() == v end,
    function(v)
        ns.db.ruleset = v
        if ns.RequestInvite then C_Timer.After(1, ns.RequestInvite) end
        ns.Refresh()
    end)
for _, b in ipairs(M.ruleset) do
    Tooltip(b, L["Type de serveur"], L["Normal (PvE), PvP, RP ou RP-PvP. On ne groupe qu'avec le même type: les annonces des autres types sont cachées. Clique pour changer."])
end
M.rulesetHint = Text(mp, "Tiny")
M.rulesetHint:SetPoint("LEFT", M.ruleset[#M.ruleset], "RIGHT", 10, 0)
M.rulesetHint:SetWidth(120)
M.rulesetHint:SetJustifyH("LEFT")

local rl = Text(mp, "SmallGold")
rl:SetPoint("TOPLEFT", 16, -180)
rl:SetText(L["Mes rôles"])
M.roles = MakeRoleIcons(mp, 28, function() return ns.db.myRoles end, function() UI.Refresh() end)
M.roles[1]:SetPoint("TOPLEFT", 154, -172)
local rh = Text(mp, "Tiny")
rh:SetPoint("LEFT", M.roles[3], "RIGHT", 16, 0)
rh:SetWidth(WIN_W - 2 * PAD - 154 - 3 * 28 - 16 - 16 - 16)
rh:SetJustifyH("LEFT")
rh:SetText(L["Utilisés pour les alertes: l'addon te prévient quand un groupe cherche un de tes rôles."])

local function RefreshMe()
    local c = ns.GetCharacterInfo()
    M.name:SetText("|c" .. ns.ClassHex(c.classFile) .. c.name .. "|r" .. ((c.realm or "") ~= "" and ("|cff8a93a6 - " .. c.realm .. "|r") or ""))
    M.badge:SetVertexColor(HexRGB(ns.ClassHex(c.classFile)))
    local guild = c.guild ~= "" and ("|cff40ff40<" .. c.guild .. ">|r") or ("|cff6b7180" .. L["Sans guilde"] .. "|r")
    M.line:SetText(L["Niveau "] .. c.level .. DOT .. c.race .. " " .. c.className .. DOT .. c.faction
        .. (c.region ~= "" and (DOT .. c.region) or "") .. DOT .. guild)
    local pieces = #c.equipment > 0 and ("  |cff888888(" .. #c.equipment .. L[" pièces)|r"]) or ""
    M.values[1]:SetText(c.ilvl and (tostring(c.ilvl) .. pieces) or ("|cff888888" .. L["Inconnu"] .. "|r"))
    local profs = {}
    for _, p in ipairs(c.professions) do tinsert(profs, p.name .. " " .. p.rank .. "/" .. p.max) end
    M.values[2]:SetText(#profs > 0 and table.concat(profs, ", ") or ("|cff888888" .. L["Aucun"] .. "|r"))
    local main = ns.MainTalentTab(c.talentTabs)
    local trees = {}
    for i, t in ipairs(c.talentTabs) do
        local text = t.name .. " " .. t.points
        tinsert(trees, i == main and ("|cffffd100" .. text .. "|r") or text)
    end
    M.values[3]:SetText(#trees > 0 and table.concat(trees, " / ") or L["|cff888888Indisponibles (tape /bf diag et envoie le résultat)|r"])
    M.ruleset.Update()
    M.rulesetHint:SetText(ns.MyRuleset() and "" or L["|cffff8800Choisis ton type de serveur|r"])
    M.roles.Update()
end

---------------------------------------------------------------------------
-- Vue 4 : En ligne
---------------------------------------------------------------------------
local ov = views[4]
local O = {}
SectionTitle(ov, L["Francophones en ligne"], PAD, -12)

-- Rejoindre la communauté, ou afficher son chat si on en fait déjà partie
O.commu = NewButton(ov, "", 236, 24, "primary")
O.commu:SetPoint("TOPRIGHT", -PAD, -8)
O.commu:SetScript("OnClick", function()
    if ns.CommunityId() then ns.PlayClick(); ns.ShowCommunityInChat(true) else UI.JoinCommunity() end
end)

O.summary = Text(ov, "Small")
O.summary:SetPoint("TOPLEFT", PAD + 2, -40)
O.summary:SetPoint("TOPRIGHT", -PAD - 2, -40)
O.summary:SetJustifyH("LEFT")
O.summary:SetWordWrap(false)

local olist = MakePanel(ov, -60, 10)
local ONLINE_ROWS = math.floor((VIEW_H - 60 - 10 - 30) / LINE_H)
O.scrollMark = MakeScrollMark(olist, 28)
O.scrollText = Text(olist, "Tiny")
O.scrollText:SetPoint("TOPRIGHT", -12, -9)
HeaderText(olist, L["Joueur"], 12)
HeaderText(olist, L["Niv."], 206)
HeaderText(olist, L["Où"], 250)
HeaderText(olist, "Addon", 470)
HeaderLine(olist)

local function WhereText(d)
    if d.here and d.commu then return L["Ton serveur + communauté"] end
    if d.here then return L["Ton serveur"] end
    if d.commu then return L["Autre serveur (communauté)"] end
    if d.spotted then return L["Repéré dans le chat"] end
    return "<" .. (d.guildFr or "?") .. ">"
end

local function WhereColor(d)
    if d.here then return "|cff33dd55" end
    if d.commu then return "|cff66aaff" end
    if d.spotted then return "|cffffb347" end
    return "|cffc28cff"
end

local function OnlineTooltip(d)
    GameTooltip:AddLine("|c" .. ns.ClassHex(d.class) .. ns.ShortName(d.sender) .. "|r" .. FactionTag(d.faction))
    local why = CantGroupReason(d.faction, d.ruleset)
    if why then GameTooltip:AddLine(why, 1, 0.45, 0.45, true) end
    if (d.level or 0) > 0 then GameTooltip:AddLine(L["Niveau "] .. d.level, 0.8, 0.8, 0.8) end
    GameTooltip:AddLine(WhereText(d), 0.6, 0.8, 1)
    if d.version then
        GameTooltip:AddLine("Babillard Forever FR " .. d.version, 0.2, 0.67, 1)
    elseif d.commu then
        GameTooltip:AddLine(L["Dans la communauté (addon pas vu sur ton serveur)"], 0.6, 0.6, 0.6, true)
    else
        if d.spotted then
            GameTooltip:AddLine(L["Parle français dans le chat, mais n'a pas encore l'addon ni la communauté."], 1, 0.7, 0.28, true)
        end
        if d.guildFr then
            GameTooltip:AddLine(L["Membre de la guilde francophone <"] .. d.guildFr .. ">.", 0.76, 0.55, 1, true)
        end
        GameTooltip:AddLine(L["« Faire connaître » écrit une invitation dans ta boîte de chuchotement : tu l'envoies avec Entrée."], 0.7, 0.7, 0.7, true)
    end
    if d.away then GameTooltip:AddLine(L["Absent"], 1, 0.6, 0.2) end
end

O.rows = {}
for i = 1, ONLINE_ROWS do
    local row = MakeRow(olist, i, LINE_H, OnlineTooltip, 28)
    row.dot = Icon(row, "dot", 8, "ARTWORK")
    row.dot:SetPoint("LEFT", 6, 0)
    row.name = Text(row, "Small")
    row.name:SetPoint("LEFT", 18, 0)
    row.name:SetWidth(176)
    row.name:SetJustifyH("LEFT")
    row.name:SetWordWrap(false)
    row.level = Text(row, "SmallDim")
    row.level:SetPoint("LEFT", 202, 0)
    row.level:SetWidth(36)
    row.level:SetJustifyH("LEFT")
    row.where = Text(row, "Small")
    row.where:SetPoint("LEFT", 246, 0)
    row.where:SetWidth(210)
    row.where:SetJustifyH("LEFT")
    row.where:SetWordWrap(false)
    row.version = Text(row, "Tiny")
    row.version:SetPoint("LEFT", 466, 0)
    tinsert(row.hideOnHover, row.version)
    AddRowAction(row, L["Chuchoter"], 86,
        function(d) return not ns.IsMe(d.sender) and d.canGroup ~= false end,
        function(d) DoWhisper(d.sender) end, true)
    AddRowAction(row, L["Inviter"], 62,
        function(d) return not ns.IsMe(d.sender) and d.canGroup ~= false end,
        function(d) ns.PlayClick(); DoInvite(d.sender) end)
    AddRowAction(row, L["Faire connaître"], 112,
        function(d) return (d.spotted or d.guildFr) and not d.here and not d.commu and d.canGroup ~= false end,
        function(d) DoWhisper(d.sender, nil, ns.RecruitText()) end)
    O.rows[i] = row
end

O.empty = Text(olist, "TextDim")
O.empty:SetPoint("CENTER", 0, 10)
O.empty:SetWidth(480)
O.empty:SetSpacing(3)

ov:EnableMouseWheel(true)
ov:SetScript("OnMouseWheel", function(_, delta)
    state.onlineScroll = math.max(0, (state.onlineScroll or 0) - delta)
    UI.Refresh()
end)
ov:SetScript("OnShow", function() ns.FocusCommunity() end)

local function RefreshOnline()
    if ns.CommunityId() then
        O.commu:SetText(L["Afficher le chat de la communauté"])
        O.commu:Show()
    elseif ns.CommunityInvite() then
        O.commu:SetText(L["Rejoindre la communauté"])
        O.commu:Show()
    else
        O.commu:Hide()
    end
    local list = ns.OnlineList()
    local here, commu, spotted, guild = 0, 0, 0, 0
    for _, d in ipairs(list) do
        if d.here then here = here + 1
        elseif d.commu then commu = commu + 1
        elseif d.spotted then spotted = spotted + 1
        elseif d.guildFr then guild = guild + 1 end
    end
    local function Count(color, n, one, many) return color .. n .. "|r " .. (Plural(n, one, many):gsub("^%d+ ", "")) end
    O.summary:SetText(Count("|cffffd100", #list, L["en ligne"], L["en ligne"]) .. DOT
        .. Count("|cff33dd55", here, L["avec l'addon"], L["avec l'addon"]) .. DOT
        .. Count("|cff66aaff", commu, L["autre serveur"], L["autres serveurs"]) .. DOT
        .. Count("|cffffb347", spotted, L["repéré au chat"], L["repérés au chat"]) .. DOT
        .. Count("|cffc28cff", guild, L["par sa guilde"], L["par leur guilde"]))
    local maxOffset = math.max(0, #list - ONLINE_ROWS)
    state.onlineScroll = math.min(state.onlineScroll or 0, maxOffset)
    for i, row in ipairs(O.rows) do
        local d = list[i + state.onlineScroll]
        row.data = d
        if d then
            row.name:SetText("|c" .. ns.ClassHex(d.class) .. ns.ShortName(d.sender) .. "|r" .. FactionTag(d.faction)
                .. (d.away and (" |cffff9933" .. L["(absent)"] .. "|r") or ""))
            row:SetAlpha(d.canGroup == false and 0.5 or 1)
            row.dot:SetVertexColor(HexRGB("ff" .. WhereColor(d):sub(5, 10)))
            row.level:SetText((d.level or 0) > 0 and d.level or "")
            row.where:SetText(WhereColor(d) .. WhereText(d) .. "|r")
            row.version:SetText(d.version and ("v" .. d.version) or "-")
            row:Show()
        else
            row:Hide()
        end
    end
    if #list == 0 then
        O.empty:SetText(ns.CommunityId() and L["Personne d'autre en ligne pour l'instant.\nLes joueurs avec l'addon apparaissent ici quelques secondes après leur connexion."]
            or L["Personne d'autre en ligne sur ton serveur pour l'instant.\nRejoins la communauté (|cffffd100/bf communaute|r) pour voir aussi les autres serveurs."])
    end
    O.empty:SetShown(#list == 0)
    O.scrollText:SetText(#list > ONLINE_ROWS and string.format(L["%d-%d sur %d (molette)"], state.onlineScroll + 1,
        math.min(#list, state.onlineScroll + ONLINE_ROWS), #list) or "")
    O.scrollMark.Update(#list, ONLINE_ROWS, state.onlineScroll)
end

---------------------------------------------------------------------------
-- Vue 5 : Chat. Le fil Général de la communauté, dans la fenêtre du babillard.
---------------------------------------------------------------------------
local chv = views[5]
local CH = {}

SectionTitle(chv, L["Chat de la communauté"], PAD, -12)

-- Rejoindre la communauté, ou la mettre aussi dans la fenêtre de chat du jeu
CH.top = NewButton(chv, "", 236, 24, "primary")
CH.top:SetPoint("TOPRIGHT", -PAD, -8)
CH.top:SetScript("OnClick", function()
    if ns.CommunityId() then ns.PlayClick(); ns.ShowCommunityInChat(true) else UI.JoinCommunity() end
end)

CH.status = Text(chv, "Small")
CH.status:SetPoint("TOPLEFT", PAD + 2, -40)
CH.status:SetPoint("TOPRIGHT", -PAD - 2, -40)
CH.status:SetJustifyH("LEFT")
CH.status:SetWordWrap(false)

local cpanel = MakePanel(chv, -60, 46)

local smf = CreateFrame("ScrollingMessageFrame", nil, cpanel)
smf:SetPoint("TOPLEFT", 12, -10)
smf:SetPoint("BOTTOMRIGHT", -12, 10)
smf:SetFontObject(ChatFontNormal or F.Text)
smf:SetJustifyH("LEFT")
smf:SetFading(false)
smf:SetMaxLines(250)
Try(function() smf:SetInsertMode("BOTTOM") end)
Try(function() smf:SetHyperlinksEnabled(true) end)
-- Clic sur un nom: chuchoter (clic gauche) ou menu du joueur (clic droit), comme dans le chat du jeu
smf:SetScript("OnHyperlinkClick", function(_, link, text, button)
    pcall(SetItemRef, link, text, button, DEFAULT_CHAT_FRAME)
end)
smf:EnableMouseWheel(true)
smf:SetScript("OnMouseWheel", function(self, delta)
    if IsShiftKeyDown() then
        if delta > 0 then self:ScrollToTop() else self:ScrollToBottom() end
    elseif delta > 0 then
        self:ScrollUp()
    else
        self:ScrollDown()
    end
end)

CH.empty = Text(cpanel, "TextDim")
CH.empty:SetPoint("CENTER")
CH.empty:SetWidth(480)
CH.empty:SetSpacing(3)

-- Champ pour écrire + Envoyer
CH.input = MakeInput(chv, L["Écris ton message et appuie sur Entrée"], WIN_W - 2 * PAD - 112, 255, PAD, 0, 26)
CH.input:ClearAllPoints()
CH.input:SetPoint("BOTTOMLEFT", PAD, 12)
CH.send = NewButton(chv, L["Envoyer"], 100, 26, "primary")
CH.send:SetPoint("BOTTOMRIGHT", -PAD, 12)

local function SendFromInput()
    local text = CH.input:GetText()
    if ns.SendCommunityChat(text) then
        CH.input:SetText("")
    end
end
CH.input:SetScript("OnEnterPressed", function(self)
    SendFromInput()
    self:ClearFocus()
end)
CH.input:SetScript("OnEscapePressed", function(self) self:ClearFocus() end)
CH.send:SetScript("OnClick", function()
    ns.PlayClick()
    SendFromInput()
end)

-- Une ligne de chat: [heure] Nom: message. Le nom est cliquable et a la couleur de sa classe.
local function ChatLine(e)
    local name = ns.ShortName(e.name)
    local link = "|Hplayer:" .. e.name .. "|h|c" .. ns.ClassHex(e.class) .. name .. "|r|h"
    local text = e.text
    -- Mon prénom dans le message: la ligne ressort en doré
    local me = ns.BareName(ns.MyFullName()):match("^%S+")
    if not e.self and me and me ~= "" and text:lower():find(me:lower(), 1, true) then
        text = "|cffffd100" .. text .. "|r"
    end
    return "|cff6f7a90" .. date("%H:%M", e.t) .. "|r  " .. link .. ": " .. text
end

-- Pastille de l'onglet: le nombre de messages qui attendent
function UI.UpdateChatTab()
    SetBadge(5, ns.chatUnread or 0)
end

function UI.RefreshChat()
    smf:Clear()
    for _, e in ipairs(ns.chatLog) do
        smf:AddMessage(ChatLine(e), 0.92, 0.94, 1)
    end
    smf:ScrollToBottom()
end

-- Nouveau message (appelé par Core): affiché tout de suite si l'onglet est ouvert, sinon compté comme non lu
function UI.OnChatMessage(e)
    if f:IsShown() and state.view == 5 then
        ns.chatUnread = 0
        smf:AddMessage(ChatLine(e), 0.92, 0.94, 1)
        CH.empty:Hide()
    end
    UI.UpdateChatTab()
end

local function RefreshChatView()
    ns.chatUnread = 0
    UI.UpdateChatTab()
    local member = ns.CommunityId()
    if member then
        local online = 0
        for _, d in ipairs(ns.OnlineList()) do if d.commu then online = online + 1 end end
        CH.status:SetText(L["Les francophones de tous les serveurs"] .. DOT .. "|cff66aaff" .. online .. "|r "
            .. (Plural(online, L["membre en ligne"], L["membres en ligne"]):gsub("^%d+ ", "")))
        CH.top:SetText(L["Aussi dans ma fenêtre de chat"])
        CH.top:SetShown(ns.db.communityChatAdded ~= member)
        CH.input:Show()
        CH.send:Show()
        CH.empty:SetText(L["Aucun message pour l'instant. Dis bonjour!"])
        CH.empty:SetShown(#ns.chatLog == 0)
    else
        CH.status:SetText(L["Tu n'es pas encore dans la communauté."])
        CH.top:SetText(L["Rejoindre la communauté"])
        CH.top:SetShown(ns.CommunityInvite() ~= nil)
        CH.input:Hide()
        CH.send:Hide()
        CH.empty:SetText(ns.CommunityInvite()
            and L["Rejoins la communauté pour discuter avec les francophones de tous les serveurs."]
            or L["Pas encore de communauté pour ta faction ou ta région: crée-la (onglet Commandes, bouton Accueil)."])
        CH.empty:Show()
    end
end

chv:SetScript("OnShow", function()
    ns.LoadChatHistory()
    UI.RefreshChat()
end)

---------------------------------------------------------------------------
-- Vue 6 : Commandes. Un bouton par commande /bf, avec la commande écrite dessous pour l'apprendre.
-- Chaque bouton fait exactement la même chose que la commande tapée dans le chat.
---------------------------------------------------------------------------
local cv = views[6]
local CMD = {}

StaticPopupDialogs["BABILLARDFR_CLEAR_IGNORED"] = {
    text = L["Retirer tous les joueurs de ta liste d'ignorés?"],
    button1 = YES or "Oui",
    button2 = NO or "Non",
    OnAccept = function() SlashCmdList.BABILLARDFR("ignores vider") end,
    timeout = 0, whileDead = true, hideOnEscape = true, preferredIndex = 3,
}

local function RunSlash(arg)
    SlashCmdList.BABILLARDFR(arg)
end

local LANG_NEXT = { auto = "fr", fr = "en", en = "auto" }

-- { titre de section, { { étiquette, commande affichée, description, action(bouton), icône }, ... } }
local SECTIONS = {
    { L["Babillard"], {
        { L["Groupes"], ns.Cmd(""), L["Ouvre ou ferme le babillard des groupes."], function() UI.SelectView(1) end, "party" },
        { L["Guildes"], ns.Cmd("guildes"), L["Les guildes francophones qui recrutent ou qui ont été repérées."], function() UI.SelectView(2) end, "banner" },
        { L["Mon perso"], ns.Cmd("perso"), L["Ton personnage et tes rôles."], function() UI.SelectView(3) end, "card" },
        { L["En ligne"], ns.Cmd("enligne"), L["Les francophones en ligne en ce moment."], function() UI.SelectView(4) end, "online" },
    } },
    { L["Communauté"], {
        { L["Chat"], ns.Cmd("chat"), L["Le chat de la communauté: parle avec les francophones de tous les serveurs."], function() UI.SelectView(5) end, "chat" },
        { L["Communauté"], ns.Cmd("communaute"), L["Rejoindre la communauté qui réunit les francophones de tous les serveurs, ou afficher son chat si tu en fais déjà partie."], function() ns.PlayClick(); RunSlash("communaute") end, "link" },
        { L["Accueil"], ns.Cmd("bienvenue"), L["Revoir l'accueil: langue, type de serveur, rôles et communauté."], function() ns.PlayClick(); RunSlash("bienvenue") end, "other" },
    } },
    { L["Alertes et joueurs"], {
        { L["Favoris"], ns.Cmd("favoris"), L["Choisir les activités qui déclenchent une alerte."], function(b) ns.PlayClick(); if ns.OpenFavMenu then ns.OpenFavMenu(b) end end, "bell" },
        { L["Demandes"], ns.Cmd("demandes"), L["Les groupes à qui tu as chuchoté, écrits dans le chat."], function() ns.PlayClick(); RunSlash("demandes") end, "send" },
        { L["Ignorés"], ns.Cmd("ignores"), L["Les joueurs que tu as ignorés, écrits dans le chat."], function() ns.PlayClick(); RunSlash("ignores") end, "minus" },
        { L["Vider les ignorés"], ns.Cmd("ignores vider"), L["Retire tous les joueurs de ta liste d'ignorés (on te demande de confirmer)."], function() ns.PlayClick(); StaticPopup_Show("BABILLARDFR_CLEAR_IGNORED") end, "close" },
    } },
    { L["Réglages"], {
        { L["Options"], ns.Cmd("options"), L["Alertes, chat, affichage et repérage des francophones."], function() ns.PlayClick(); RunSlash("options") end, "gear" },
        { L["Langue"], ns.Cmd("langue"), L["Français, English ou Auto (la langue du jeu). Un clic passe à la suivante; l'interface se recharge."], function() ns.PlayClick(); RunSlash("langue " .. (LANG_NEXT[ns.db.opts.lang or "auto"] or "auto")) end, "chat" },
        { L["Diagnostic"], ns.Cmd("diag"), L["Un texte à copier si les talents ou l'équipement ne s'affichent pas bien."], function() ns.PlayClick(); RunSlash("diag") end, "search" },
        { L["Aide"], ns.Cmd("aide"), L["Écrit la liste de toutes les commandes dans le chat."], function() ns.PlayClick(); RunSlash("aide") end, "terminal" },
    } },
}

SectionTitle(cv, L["Commandes"], PAD, -12)
local cmdIntro = Text(cv, "SmallDim")
cmdIntro:SetPoint("TOPLEFT", PAD + 2, -34)
cmdIntro:SetPoint("TOPRIGHT", -PAD - 2, -34)
cmdIntro:SetJustifyH("LEFT")
cmdIntro:SetText(L["Chaque bouton fait la même chose que la commande écrite dessous: tu peux aussi la taper dans le chat."])

local GAP = 8
local BTN_W, BTN_H = math.floor((WIN_W - 2 * PAD - 3 * GAP) / 4), 46
local y = -60
CMD.buttons = {}
for _, sec in ipairs(SECTIONS) do
    local st = Text(cv, "SmallGold")
    st:SetPoint("TOPLEFT", PAD + 2, y)
    st:SetText(sec[1])
    Try(function()
        local line = Skin.FadeLine(cv, "ARTWORK", 0.5)
        line:SetPoint("LEFT", st, "RIGHT", 8, 0)
        line:SetWidth(220)
    end)
    for i, item in ipairs(sec[2]) do
        local b = NewButton(cv, "", BTN_W, BTN_H)
        b:SetPoint("TOPLEFT", PAD + (i - 1) * (BTN_W + GAP), y - 18)
        b.icon = Icon(b, item[5], 16, "ARTWORK", 1, 0.84, 0.3)
        b.icon:SetPoint("TOPLEFT", 10, -9)
        b.label = Text(b, "Btn")
        b.label:SetPoint("LEFT", b.icon, "RIGHT", 7, 0)
        b.label:SetWidth(BTN_W - 10 - 16 - 7 - 8)
        b.label:SetJustifyH("LEFT")
        b.label:SetWordWrap(false)
        b.label:SetText(item[1])
        b.cmd = Text(b, "Tiny")
        b.cmd:SetPoint("BOTTOMLEFT", 10, 8)
        b.cmd:SetPoint("BOTTOMRIGHT", -8, 8)
        b.cmd:SetJustifyH("LEFT")
        b.cmd:SetWordWrap(false)
        b.cmd:SetText(item[2])
        b:SetScript("OnClick", function(self) item[4](self) end)
        b:SetScript("OnEnter", function(self)
            GameTooltip:SetOwner(self, "ANCHOR_TOP")
            GameTooltip:AddLine(self.label:GetText() or item[1])
            GameTooltip:AddLine(item[3], 1, 1, 1, true)
            GameTooltip:AddLine(item[2], 0.6, 0.6, 0.6)
            GameTooltip:Show()
        end)
        b:SetScript("OnLeave", GameTooltip_Hide)
        CMD.buttons[item[2] .. "|" .. item[1]] = b
        if item[2] == ns.Cmd("langue") then CMD.lang = b end
        if item[2] == ns.Cmd("communaute") then CMD.commu = b end
        if item[2] == ns.Cmd("ignores vider") then CMD.clear = b end
    end
    y = y - 18 - BTN_H - 16
end

local cmdTip = Text(cv, "SmallDim")
cmdTip:SetPoint("TOPLEFT", PAD + 2, y - 2)
cmdTip:SetPoint("TOPRIGHT", -PAD - 2, y - 2)
cmdTip:SetJustifyH("LEFT")
cmdTip:SetSpacing(2)
cmdTip:SetText(L["Astuce: fais |cffffd100/who|r dans une zone achalandée (ex. |cffffd100/who 20-30|r) pour repérer d'un coup les guildes francophones autour de toi."])

local function RefreshCommands()
    if CMD.lang then
        CMD.lang.label:SetText(L["Langue"] .. " : " .. (ns.db.opts.lang == "fr" and "FR" or ns.db.opts.lang == "en" and "EN" or "Auto"))
    end
    if CMD.commu then
        CMD.commu.label:SetText(ns.CommunityId() and L["Chat commu."] or L["Communauté"])
    end
    if CMD.clear then
        local any = next(ns.db.ignored) ~= nil
        SetEnabled(CMD.clear, any)
        CMD.clear.label:SetAlpha(any and 1 or 0.4)
        CMD.clear.cmd:SetAlpha(any and 1 or 0.4)
        CMD.clear.icon:SetAlpha(any and 1 or 0.3)
    end
end

---------------------------------------------------------------------------
-- Navigation et rafraîchissement
---------------------------------------------------------------------------
function UI.SelectView(i)
    state.view = i
    for k, v in ipairs(views) do v:SetShown(k == i) end
    UpdateTabs()
    UI.Refresh()
end

function UI.Refresh()
    if not f:IsShown() or not ns.db then return end
    ns.Prune()
    -- Pied: connexion au canal et à la communauté (pastilles du jeu: la police n'a pas le caractère « ● »)
    local GREEN = "|TInterface\\COMMON\\Indicator-Green:12:12|t"
    local status
    if ns.ChannelIndex() then
        status = GREEN .. " " .. L["Connecté"]
    elseif ns.channelFailed then
        status = "|TInterface\\COMMON\\Indicator-Red:12:12|t " .. L["Canal indisponible"]
    else
        status = "|TInterface\\COMMON\\Indicator-Yellow:12:12|t " .. L["Connexion..."]
    end
    if ns.CommunityId() then
        status = status .. "    " .. GREEN .. " " .. L["Communauté"]
    else
        status = status .. "    |TInterface\\COMMON\\Indicator-Gray:12:12|t |cff6b7180" .. L["Pas dans la communauté"] .. "|r"
    end
    if ns.newVersion then status = status .. "    |cffff8800v" .. ns.newVersion .. L[" disponible|r"] end
    channelStatus:SetText(status)

    -- En-tête: combien de francophones en ligne et de groupes (ça donne envie de rester!)
    local nOnline = #ns.OnlineList()
    local nGroups = CountGroups()
    if nOnline > 0 or nGroups > 0 then
        subtitle:SetText("|cff33dd55" .. Plural(nOnline, L["francophone en ligne"], L["francophones en ligne"]) .. "|r" .. DOT
            .. Plural(nGroups, L["groupe"], L["groupes"]) .. DOT .. "v" .. ns.VERSION)
    else
        subtitle:SetText(L["Le point de rencontre des francophones de Forever"] .. DOT .. "v" .. ns.VERSION)
    end
    SetBadge(1, nGroups, true)
    SetBadge(4, nOnline, true)
    UI.UpdateBanner()
    UI.UpdateChatTab()
    if UI.UpdateWelcome then UI.UpdateWelcome() end
    if state.view == 1 then
        RefreshGroups()
    elseif state.view == 2 then
        RefreshGuilds()
    elseif state.view == 3 then
        RefreshMe()
    elseif state.view == 4 then
        RefreshOnline()
    elseif state.view == 5 then
        RefreshChatView()
    else
        RefreshCommands()
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

-- Taille de la fenêtre (Options): de 70 % à 150 %
function UI.ApplyScale()
    local s = tonumber(ns.db and ns.db.opts.uiScale) or 1
    s = math.max(0.7, math.min(1.5, s))
    f:SetScale(s)
    Skin.SnapLines()
end

f:RegisterEvent("UI_SCALE_CHANGED")
f:RegisterEvent("DISPLAY_SIZE_CHANGED")
f:SetScript("OnEvent", function() Skin.SnapLines() end)

---------------------------------------------------------------------------
-- Accueil guidé: s'ouvre une fois, par-dessus la fenêtre (langue, perso, communauté). /bf bienvenue pour le revoir.
---------------------------------------------------------------------------
local wz = CreateFrame("Frame", nil, f)
wz:SetAllPoints(f)
wz:SetFrameLevel(f:GetFrameLevel() + 40)
wz:EnableMouse(true)
wz:EnableMouseWheel(true)
wz:SetScript("OnMouseWheel", function() end)
wz:Hide()
Try(function()
    local veil = wz:CreateTexture(nil, "BACKGROUND")
    veil:SetPoint("TOPLEFT", 1, -1)
    veil:SetPoint("BOTTOMRIGHT", -1, 1)
    Skin.Gradient(veil, "VERTICAL", 0, 0, 0, 0.92, 0.02, 0.03, 0.06, 0.88)
end)

local card = CreateFrame("Frame", nil, wz)
card:SetSize(470, 400)
card:SetPoint("CENTER", 0, -4)
Try(function()
    Skin.GradientFill(card, { 0.03, 0.035, 0.06, 0.98 }, { 0.09, 0.10, 0.16, 0.98 })
    Skin.Border(card, GOLD, 0.8)
    local glow = card:CreateTexture(nil, "BORDER")
    glow:SetPoint("TOPLEFT", 1, -1)
    glow:SetPoint("TOPRIGHT", -1, -1)
    glow:SetHeight(130)
    Skin.Gradient(glow, "VERTICAL", 1, 0.8, 0.35, 0, 1, 0.8, 0.35, 0.10)
end)

local wzEmblem = card:CreateTexture(nil, "ARTWORK")
wzEmblem:SetSize(84, 84)
wzEmblem:SetPoint("TOP", 0, -16)
wzEmblem:SetTexture(ns.EMBLEM)

local wzTitle = Text(card, "Huge")
wzTitle:SetPoint("TOP", 0, -108)

local wzText = Text(card, "Small")
wzText:SetPoint("TOP", 0, -138)
wzText:SetWidth(410)
wzText:SetJustifyH("CENTER")
wzText:SetSpacing(3)

local wzSkip = CreateFrame("Button", nil, card)
wzSkip:SetSize(90, 20)
wzSkip:SetPoint("TOPRIGHT", -8, -6)
wzSkip.text = Text(wzSkip, "SmallDim")
wzSkip.text:SetPoint("RIGHT")
wzSkip.text:SetText(L["Passer »"])
wzSkip:SetScript("OnEnter", function(self) self.text:SetFontObject(F.Small) end)
wzSkip:SetScript("OnLeave", function(self) self.text:SetFontObject(F.SmallDim) end)

local wsteps = {}
for i = 1, 3 do
    wsteps[i] = CreateFrame("Frame", nil, card)
    wsteps[i]:SetAllPoints()
    wsteps[i]:Hide()
end

local function SmallLabel(parent, text, yy)
    local s = Text(parent, "SmallGold")
    s:SetPoint("TOP", 0, yy)
    s:SetText(text)
    return s
end

-- Étape 1: langue
SmallLabel(wsteps[1], "Langue de l'addon  ·  Addon language", -214)
local langSeg = MakeSegmented(wsteps[1], { { label = "Français", value = "fr" }, { label = "English", value = "en" } }, 150, 83, -236,
    function(v) return ns.lang == v end,
    function(v)
        if v ~= ns.lang then
            ns.db.onboardStep = 2          -- après le rechargement, l'accueil reprend à l'étape 2 dans la nouvelle langue
            ns.SetLanguageChoice(v)
        end
    end, 30)
local langNote = Text(wsteps[1], "Tiny")
langNote:SetPoint("TOP", 0, -280)
langNote:SetWidth(400)
langNote:SetText(L["Changer de langue recharge l'interface (quelques secondes)."])

-- Étape 2: type de serveur et rôles
SmallLabel(wsteps[2], L["Ton type de serveur"], -196)
local rsSeg = MakeSegmented(wsteps[2], rsItems, 100, 29, -216,
    function(v) return ns.MyRuleset() == v end,
    function(v)
        ns.db.ruleset = v
        if ns.RequestInvite then C_Timer.After(1, ns.RequestInvite) end
        UI.UpdateWelcome()
        ns.Refresh()
    end, 26)
SmallLabel(wsteps[2], L["Tes rôles"], -256)
local wzRoles = MakeRoleIcons(wsteps[2], 32, function() return ns.db.myRoles end, function() ns.Refresh() end)
wzRoles[1]:SetPoint("TOPLEFT", 235 - (3 * 32 + 16) / 2, -276)
local rsHint = Text(wsteps[2], "Tiny")
rsHint:SetPoint("TOP", 0, -318)
rsHint:SetWidth(420)

-- Étape 3: la communauté
local commuStatus = Text(wsteps[3], "Text")
commuStatus:SetPoint("TOP", 0, -220)
commuStatus:SetWidth(420)
local commuBtn = NewButton(wsteps[3], L["Rejoindre la communauté"], 240, 32, "primary")
commuBtn:SetPoint("TOP", 0, -246)
commuBtn:SetScript("OnClick", function()
    if ns.CommunityId() then
        if ns.ShowCommunityInChat then ns.ShowCommunityInChat(true) end
    else
        UI.JoinCommunity()
    end
end)
local commuNote = Text(wsteps[3], "Tiny")
commuNote:SetPoint("TOP", 0, -290)
commuNote:SetWidth(420)
commuNote:SetSpacing(2)

-- Navigation
local wzBack = NewButton(card, L["Précédent"], 110, 28)
wzBack:SetPoint("BOTTOMLEFT", 16, 14)
local wzNext = NewButton(card, L["Suivant"], 150, 28, "primary")
wzNext:SetPoint("BOTTOMRIGHT", -16, 14)
local dots = {}
for i = 1, 3 do
    local d = card:CreateTexture(nil, "OVERLAY")
    d:SetSize(8, 8)
    d:SetPoint("BOTTOM", (i - 2) * 16, 24)
    dots[i] = d
end

local wzStep = 1
local function FinishWelcome()
    ns.db.onboarded = true
    ns.db.onboardStep = nil
    wz:Hide()
    UI.SelectView(ns.MyRuleset() and 1 or 3)
end

function UI.WelcomeShown()
    return wz:IsShown()
end

function UI.UpdateWelcome()
    if not wz:IsShown() then return end
    for i, s in ipairs(wsteps) do s:SetShown(i == wzStep) end
    for i, d in ipairs(dots) do
        if i == wzStep then d:SetColorTexture(1, 0.84, 0.3, 1) else d:SetColorTexture(0.4, 0.4, 0.45, 0.8) end
    end
    wzBack:SetShown(wzStep > 1)
    wzNext:SetText(wzStep == 3 and L["C'est parti!"] or L["Suivant"])
    SetEnabled(wzNext, true)
    if wzStep == 1 then
        wzTitle:SetText(L["Bienvenue!"])
        wzText:SetText(L["Babillard Forever FR est le point de rencontre des joueurs francophones de WoW Forever : groupes, guildes, communauté et qui est en ligne."])
        langSeg.Update()
    elseif wzStep == 2 then
        wzTitle:SetText(L["Ton personnage"])
        wzText:SetText(L["Dans Forever, on ne groupe qu'avec le même type de serveur. Ton choix sert à te montrer les bonnes annonces."])
        rsSeg.Update()
        wzRoles.Update()
        if ns.MyRuleset() then
            rsHint:SetText(L["|cff33dd55Parfait!|r Tes rôles servent aux alertes : l'addon te prévient quand un groupe cherche ton rôle."])
        else
            rsHint:SetText(L["|cffff8800Choisis ton type de serveur pour continuer.|r"])
            SetEnabled(wzNext, false)
        end
    else
        wzTitle:SetText(L["Rejoins tous les francophones"])
        wzText:SetText(L["Forever te place sur un serveur parmi plusieurs. La communauté Babillard Forever FR relie les francophones de TOUS les serveurs : son chat, ses annonces et qui est en ligne."])
        if ns.CommunityId() then
            commuStatus:SetText("|TInterface\\RaidFrame\\ReadyCheck-Ready:16:16|t " .. L["|cff33dd55Tu fais partie de la communauté!|r"])
            commuBtn:SetText(L["Afficher son chat"])
            commuBtn:Show()
            commuNote:SetText(L["Ajoute le chat de la communauté à ta fenêtre de chat pour parler avec tout le monde."])
        elseif ns.CommunityInvite() then
            commuStatus:SetText("")
            commuBtn:SetText(L["Rejoindre la communauté"])
            commuBtn:Show()
            local by = ns.CommunityInviteBy and ns.CommunityInviteBy()
            commuNote:SetText(L["Le jeu ouvre sa fenêtre pour rejoindre : accepte, et c'est fait!"]
                .. (by and ("\n|cff999999" .. L["Communauté partagée par "] .. ns.ShortName(by) .. "|r") or ""))
        else
            commuStatus:SetText(L["|cffffd100Pas encore de communauté pour ta faction ou ta région.|r"])
            commuBtn:Hide()
            commuNote:SetText(L["Crée-la! Touche J, puis « Créer une communauté » nommée « "] .. ns.COMMUNITY_NAME
                .. L[" », puis un lien d'invitation qui n'expire jamais et sans limite: l'addon le partagera tout seul avec les autres francophones."])
        end
    end
end

wzBack:SetScript("OnClick", function()
    ns.PlayClick()
    wzStep = math.max(1, wzStep - 1)
    UI.UpdateWelcome()
end)
wzNext:SetScript("OnClick", function()
    ns.PlayClick()
    if wzStep >= 3 then FinishWelcome() return end
    wzStep = wzStep + 1
    UI.UpdateWelcome()
end)
wzSkip:SetScript("OnClick", function()
    ns.PlayClick()
    FinishWelcome()
end)

function UI.ShowWelcome(step)
    if not f:IsShown() then f:Show() end
    wzStep = step or ns.db.onboardStep or 1
    wz:Show()
    banner:Hide()
    UI.UpdateWelcome()
end

f:SetScript("OnShow", function(self)
    if UIFrameFadeIn then pcall(UIFrameFadeIn, self, 0.15, 0, 1) end
    UI.ApplyScale()
    ns.EnsureChannel()
    ns.RequestAll()
    RestoreFormFromListing()
    UI.UpdateMyPanel()
    UI.SelectView(state.view)
    if not ns.db.onboarded then UI.ShowWelcome() end
end)

end -- ns.BuildUI
