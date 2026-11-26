-- Babillard Forever FR - Options et bouton de la minimap
local ADDON, ns = ...
local L = ns.L

-- Bâti à ADDON_LOADED (Core.lua), une fois la langue choisie: tous les textes passent par L.
function ns.BuildOptions()

---------------------------------------------------------------------------
-- Panneau d'options (Échap > Options > AddOns > Babillard Forever FR)
---------------------------------------------------------------------------
local panel = CreateFrame("Frame")
panel.name = "Babillard Forever FR"

-- Le panneau est plus haut que la fenêtre d'options du jeu: tout le contenu est dans une zone défilante (molette ou barre).
local scroll = ns.SafeCreate("ScrollFrame", nil, panel, "UIPanelScrollFrameTemplate", "ScrollFrameTemplate")
scroll:SetPoint("TOPLEFT", panel, "TOPLEFT", 0, -4)
scroll:SetPoint("BOTTOMRIGHT", panel, "BOTTOMRIGHT", -28, 4)
local content = CreateFrame("Frame", nil, scroll)
content:SetSize(560, 900)   -- la hauteur réelle est calculée plus bas
scroll:SetScrollChild(content)
scroll:EnableMouseWheel(true)
scroll:SetScript("OnMouseWheel", function(self, delta)
    local range = tonumber(self:GetVerticalScrollRange()) or 0
    local new = (tonumber(self:GetVerticalScroll()) or 0) - (tonumber(delta) or 0) * 40
    if new < 0 then new = 0 elseif new > range then new = range end
    self:SetVerticalScroll(new)
end)
scroll:SetScript("OnSizeChanged", function(_, w)
    if w and w > 100 then content:SetWidth(w) end
end)

local title = content:CreateFontString(nil, "ARTWORK", "GameFontNormalLarge")
title:SetPoint("TOPLEFT", 16, -16)
title:SetText("Babillard Forever FR")

local sub = content:CreateFontString(nil, "ARTWORK", "GameFontHighlightSmall")
sub:SetPoint("TOPLEFT", title, "BOTTOMLEFT", 0, -6)
sub:SetText(L["Version "] .. ns.VERSION .. L["  ·  /bf pour ouvrir le babillard  ·  /bf aide pour les commandes"])

-- { clé, texte, aide }
local OPTIONS = {
    { "header", L["Alertes"] },
    { "alerts",          L["Alertes quand un groupe cherche un de mes rôles"],
      L["Message à l'écran quand un groupe cherche ton rôle pour une activité à ton niveau, ou quand quelqu'un cherche un groupe pour ce que ton groupe fait."] },
    { "alertSound",      L["Jouer un son avec les alertes"] },
    { "alertInInstance", L["Alertes même dans un donjon, un raid ou un champ de bataille"] },
    { "favsOnly",        L["Alertes seulement pour mes activités favorites"],
      L["Choisis-les avec le bouton « Activités favorites » plus bas, ou avec /bf favoris. Si tu n'en as choisi aucune, toutes les activités déclenchent une alerte."] },
    { "alertChat",       L["Alertes aussi pour les annonces lues dans le chat"],
      L["Par défaut, seules les annonces des joueurs qui ont l'addon déclenchent une alerte: le chat contient beaucoup d'annonces."] },
    { "whisperTemplate", L["Chuchoter écrit un message de présentation"],
      L["Le bouton Chuchoter écrit « Salut, voleur niv 20, je peux faire DPS pour Mines de la Mort. » dans la boîte de chat. Rien n'est envoyé tant que tu n'appuies pas sur Entrée."] },
    { "header", L["Chat"] },
    { "chatReading",     L["Lire les annonces du chat et les ajouter au babillard"],
      L["Les annonces « LFM » du chat (un groupe qui cherche des joueurs: général, recherche de groupe, cris) apparaissent avec la mention [chat]. Elles sont lues à l'écran seulement: rien n'est envoyé."] },
    { "spotFrench",      L["Repérer les joueurs qui parlent français dans le chat"],
      L["Les joueurs qui écrivent en français dans le chat public (général, dire, crier) apparaissent dans l'onglet En ligne, même sans l'addon. Tout se fait sur ton écran: rien n'est envoyé."] },
    { "frTag",           L["Afficher [FR] devant les messages des francophones"],
      L["Dans ta fenêtre de chat seulement: [FR] devant les messages des joueurs qui ont l'addon ou qui ont été repérés en train de parler français."] },
    { "spotGuilds",      L["Repérer les guildes francophones (d'après le nom de guilde)"],
      L["Quand tu croises un joueur (survol, cible, noms au-dessus des têtes, groupe, /who), son nom de guilde est vérifié. Les guildes au nom francophone apparaissent dans l'onglet Guildes, et leurs membres croisés dans l'onglet En ligne. Tout se fait sur ton écran: rien n'est envoyé."] },
    { "alsoChat",        L["Publier aussi mon annonce dans le chat"],
      L["Quand tu cliques sur Publier, l'annonce est aussi envoyée dans « Recherche de groupe » (ou « Général »). Une fois par minute au maximum, seulement quand tu cliques."] },
    { "alsoCommunity",   L["Publier aussi mes annonces dans la communauté Babillard Forever FR"],
      L["Au clic sur Publier, l'annonce est aussi envoyée dans la communauté, que voient les francophones de tous les serveurs de Forever. Une fois par minute au maximum. /bf communaute pour la rejoindre."] },
    { "chatTag",         L["Ajouter « [Babillard FR] » à la fin de mes annonces du chat"],
      L["Désactivé par défaut. Ça fait connaître l'addon, mais la politique d'addons de Blizzard interdit d'utiliser un addon pour faire de la promotion: à toi de décider."] },
    { "header", L["Mon annonce"] },
    { "autoRemove",      L["Retirer mon annonce automatiquement"],
      L["Quand tu rejoins un groupe, quand ton groupe est complet ou quand tu entres dans une instance."] },
    { "remind",          L["Me rappeler 2 minutes avant que mon annonce expire"] },
    { "autoUpdate",      L["Mettre à jour mon annonce quand des joueurs rejoignent mon groupe"],
      L["Met à jour le nombre de joueurs et retire le rôle tank ou soigneur quand quelqu'un du groupe l'a d'assigné."] },
    { "header", L["Affichage"] },
    { "sameFaction",     L["Cacher l'autre faction"],
      L["Décoché (par défaut): les groupes, guildes et joueurs de l'autre faction sont affichés en gris, à la fin. On ne peut pas grouper ni se chuchoter entre factions."] },
    { "sameRuleset",     L["Cacher les autres types de serveur (PvE, PvP, RP)"],
      L["Décoché (par défaut): ils sont affichés en gris, à la fin. On ne peut pas grouper entre types de serveur. Choisis ton type dans l'onglet Mon perso."] },
    { "levelOnly",       L["Cacher les groupes qui ne sont pas de mon niveau"],
      L["Décoché (par défaut): tout le monde est affiché, et les groupes qui ne sont pas de ton niveau sont en gris, à la fin de la liste."] },
    { "tooltipFlag",     L["Afficher [FR] dans l'info-bulle des joueurs qui ont l'addon"] },
    { "minimap",         L["Afficher le bouton de la minimap"] },
}

local checks = {}
local y = -64
for _, opt in ipairs(OPTIONS) do
    if opt[1] == "header" then
        y = y - 8
        local h = content:CreateFontString(nil, "ARTWORK", "GameFontNormal")
        h:SetPoint("TOPLEFT", 16, y)
        h:SetText(opt[2])
        y = y - 22
    else
        local cb = ns.SafeCreate("CheckButton", nil, content, "UICheckButtonTemplate", "OptionsBaseCheckButtonTemplate")
        cb:SetSize(26, 26)
        cb:SetPoint("TOPLEFT", 20, y)
        local label = content:CreateFontString(nil, "ARTWORK", "GameFontHighlight")
        label:SetPoint("LEFT", cb, "RIGHT", 4, 0)
        label:SetText(opt[2])
        cb.key = opt[1]
        if opt[3] then
            cb:SetScript("OnEnter", function(self)
                GameTooltip:SetOwner(self, "ANCHOR_RIGHT")
                GameTooltip:AddLine(opt[2])
                GameTooltip:AddLine(opt[3], 1, 1, 1, true)
                GameTooltip:Show()
            end)
            cb:SetScript("OnLeave", GameTooltip_Hide)
        end
        cb:SetScript("OnClick", function(self)
            local on = self:GetChecked() and true or false
            if self.key == "minimap" then
                ns.db.minimap.hide = not on
                if ns.UpdateMinimapButton then ns.UpdateMinimapButton() end
            else
                ns.db.opts[self.key] = on
            end
            ns.PlayClick()
            ns.Refresh()
        end)
        tinsert(checks, cb)
        y = y - 28
    end
end

-- Activités favorites (menu à cases à cocher)
function ns.OpenFavMenu(owner)
    if not ns.db then return end
    if not (MenuUtil and MenuUtil.CreateContextMenu) then
        ns.Print(L["le menu des favoris n'est pas disponible dans cette version du jeu."])
        return
    end
    MenuUtil.CreateContextMenu(owner or UIParent, function(_, root)
        root:CreateTitle(L["Alertes : activités favorites"])
        for _, cat in ipairs(ns.CATEGORIES) do
            local sub = root:CreateButton(ns.CatName and ns.CatName(cat) or cat)
            for _, a in ipairs(ns.ACTIVITIES[cat]) do
                sub:CreateCheckbox(a.name,
                    function() return ns.db.favs[a.key] and true or false end,
                    function() ns.db.favs[a.key] = (not ns.db.favs[a.key]) or nil end)
            end
        end
        root:CreateButton(L["Tout décocher"], function() wipe(ns.db.favs) end)
    end)
end

local favBtn = CreateFrame("Button", nil, content, "UIPanelButtonTemplate")
if ns.Skin and ns.Skin.Button then ns.Skin.Button(favBtn) end
favBtn:SetSize(200, 24)
favBtn:SetPoint("TOPLEFT", 20, y - 16)
favBtn:SetText(L["Activités favorites"])
favBtn:SetScript("OnClick", function(self) ns.OpenFavMenu(self) end)

-- Langue: un clic passe à la suivante (Auto → Français → English).
local langBtn = CreateFrame("Button", nil, content, "UIPanelButtonTemplate")
if ns.Skin and ns.Skin.Button then ns.Skin.Button(langBtn) end
langBtn:SetSize(410, 24)
langBtn:SetPoint("TOPLEFT", 20, y - 48)
local function LangText()
    langBtn:SetText("Langue / Language : " .. ns.LanguageName(ns.db and ns.db.opts.lang or "auto"))
end
LangText()
langBtn:SetScript("OnClick", function()
    local order = { auto = "fr", fr = "en", en = "auto" }
    ns.SetLanguageChoice(order[ns.db.opts.lang or "auto"] or "auto")
    LangText()
end)

-- Taille de la fenêtre du babillard: de 70 % à 150 %, par pas de 5 %
local scaleLabel = content:CreateFontString(nil, "ARTWORK", "GameFontHighlight")
scaleLabel:SetPoint("TOPLEFT", 20, y - 86)
local function ScaleText()
    local s = math.floor(((ns.db and ns.db.opts.uiScale) or 1) * 100 + 0.5)
    scaleLabel:SetText(L["Taille de la fenêtre du babillard : "] .. s .. " %")
end
local function ScaleButton(text, delta, x)
    local b = CreateFrame("Button", nil, content, "UIPanelButtonTemplate")
    if ns.Skin and ns.Skin.Button then ns.Skin.Button(b) end
    b:SetSize(32, 22)
    b:SetPoint("TOPLEFT", x, y - 82)
    b:SetText(text)
    b:SetScript("OnClick", function()
        local s = (ns.db.opts.uiScale or 1) + delta
        ns.db.opts.uiScale = math.max(0.7, math.min(1.5, math.floor(s * 20 + 0.5) / 20))
        ScaleText()
        if ns.UI and ns.UI.ApplyScale then ns.UI.ApplyScale() end
    end)
    return b
end
ScaleButton("-", -0.05, 330)
ScaleButton("+", 0.05, 366)
ScaleText()

-- Hauteur du contenu: jusqu'en bas des boutons, plus une marge.
content:SetHeight(math.max(100, -(y - 86) + 24 + 24))

panel:SetScript("OnShow", function()
    if not ns.db then return end
    ScaleText()
    for _, cb in ipairs(checks) do
        if cb.key == "minimap" then
            cb:SetChecked(not ns.db.minimap.hide)
        else
            cb:SetChecked(ns.db.opts[cb.key])
        end
    end
end)

if Settings and Settings.RegisterCanvasLayoutCategory and Settings.RegisterAddOnCategory then
    local category = Settings.RegisterCanvasLayoutCategory(panel, panel.name)
    Settings.RegisterAddOnCategory(category)
    ns.settingsCategory = category
elseif InterfaceOptions_AddCategory then
    InterfaceOptions_AddCategory(panel)
end

function ns.OpenOptions()
    if Settings and Settings.OpenToCategory and ns.settingsCategory then
        local id = ns.settingsCategory.GetID and ns.settingsCategory:GetID() or ns.settingsCategory.ID
        Settings.OpenToCategory(id)
    elseif InterfaceOptionsFrame_OpenToCategory then
        InterfaceOptionsFrame_OpenToCategory(panel)
        InterfaceOptionsFrame_OpenToCategory(panel)
    end
end

---------------------------------------------------------------------------
-- Bouton de la minimap
---------------------------------------------------------------------------
local mm = CreateFrame("Button", "BabillardFRMinimapButton", Minimap)
mm:SetSize(31, 31)
mm:SetFrameStrata("MEDIUM")
mm:SetFrameLevel(8)
mm:RegisterForClicks("AnyUp")
mm:RegisterForDrag("LeftButton")

-- L'emblème a déjà son anneau doré: pas besoin du cadre rond du jeu.
local icon = mm:CreateTexture(nil, "ARTWORK")
icon:SetTexture(ns.EMBLEM32)
icon:SetSize(28, 28)
icon:SetPoint("CENTER")
mm:SetHighlightTexture(ns.EMBLEM32)
local hl = mm:GetHighlightTexture()
if hl then
    hl:ClearAllPoints()
    hl:SetSize(28, 28)
    hl:SetPoint("CENTER")
    hl:SetBlendMode("ADD")
    hl:SetAlpha(0.35)
end

local function UpdatePosition()
    local a = math.rad(ns.db.minimap.angle or 220)
    local r = (Minimap:GetWidth() / 2) + 10
    mm:ClearAllPoints()
    mm:SetPoint("CENTER", Minimap, "CENTER", math.cos(a) * r, math.sin(a) * r)
end

function ns.UpdateMinimapButton()
    if not ns.db then return end
    UpdatePosition()
    mm:SetShown(not ns.db.minimap.hide)
end

mm:SetScript("OnDragStart", function(self)
    self:SetScript("OnUpdate", function()
        local mx, my = Minimap:GetCenter()
        local cx, cy = GetCursorPosition()
        local s = Minimap:GetEffectiveScale()
        ns.db.minimap.angle = math.deg(math.atan2(cy / s - my, cx / s - mx))
        UpdatePosition()
    end)
end)
mm:SetScript("OnDragStop", function(self) self:SetScript("OnUpdate", nil) end)

mm:SetScript("OnClick", function(_, button)
    ns.EnsureChannel()
    if ns.UI then
        ns.UI.Toggle()
    end
end)

mm:SetScript("OnEnter", function(self)
    GameTooltip:SetOwner(self, "ANCHOR_LEFT")
    GameTooltip:AddLine("Babillard Forever FR")
    local n = 0
    for _ in pairs(ns.listings) do n = n + 1 end
    local online = ns.OnlineList and #ns.OnlineList() or 0
    GameTooltip:AddLine(ns.Plural(online, L["francophone en ligne"], L["francophones en ligne"]), 1, 0.84, 0.3)
    if (ns.chatUnread or 0) > 0 then
        GameTooltip:AddLine(ns.Plural(ns.chatUnread, L["nouveau message dans le chat"], L["nouveaux messages dans le chat"]), 0.4, 0.67, 1)
    end
    GameTooltip:AddLine(ns.Plural(n, L["annonce active"], L["annonces actives"]), 0.6, 0.8, 1)
    if ns.my then GameTooltip:AddLine(L["Ton annonce est active"], 0.2, 0.87, 0.33) end
    GameTooltip:AddLine(" ")
    GameTooltip:AddLine(L["Clic gauche : ouvrir le babillard"], 1, 1, 1)
    GameTooltip:AddLine(L["Glisser : déplacer ce bouton"], 0.7, 0.7, 0.7)
    GameTooltip:Show()
end)
mm:SetScript("OnLeave", GameTooltip_Hide)

-- Aussi dans le menu des addons de la minimap (le bouton « AddOns » de Blizzard),
-- au cas où le bouton rond serait caché par une autre interface.
function BabillardFR_OnCompartmentClick(_, button)
    ns.EnsureChannel()
    if ns.UI then
        ns.UI.Toggle()
    end
end

function BabillardFR_OnCompartmentEnter(_, frame)
    local onEnter = mm:GetScript("OnEnter")
    if onEnter then onEnter(frame or mm) end
end

function BabillardFR_OnCompartmentLeave()
    GameTooltip:Hide()
end

-- Clignote lors d'une alerte
local flash = mm:CreateAnimationGroup()
local fadeOut = flash:CreateAnimation("Alpha")
fadeOut:SetFromAlpha(1)
fadeOut:SetToAlpha(0.25)
fadeOut:SetDuration(0.35)
fadeOut:SetOrder(1)
local fadeIn = flash:CreateAnimation("Alpha")
fadeIn:SetFromAlpha(0.25)
fadeIn:SetToAlpha(1)
fadeIn:SetDuration(0.35)
fadeIn:SetOrder(2)
flash:SetLooping("REPEAT")

function ns.FlashMinimap()
    if not mm:IsShown() then return end
    flash:Play()
    C_Timer.After(4, function() flash:Stop() end)
end

ns.OnDBReady = function()
    ns.UpdateMinimapButton()
end

end -- ns.BuildOptions
