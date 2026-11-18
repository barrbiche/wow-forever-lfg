-- Babillard Forever FR - Options et bouton de la minimap
local ADDON, ns = ...

---------------------------------------------------------------------------
-- Panneau d'options (Échap > Options > AddOns > Babillard Forever FR)
---------------------------------------------------------------------------
local panel = CreateFrame("Frame")
panel.name = "Babillard Forever FR"

local title = panel:CreateFontString(nil, "ARTWORK", "GameFontNormalLarge")
title:SetPoint("TOPLEFT", 16, -16)
title:SetText("Babillard Forever FR")

local sub = panel:CreateFontString(nil, "ARTWORK", "GameFontHighlightSmall")
sub:SetPoint("TOPLEFT", title, "BOTTOMLEFT", 0, -6)
sub:SetText("Version " .. ns.VERSION .. "  ·  /bf pour ouvrir le babillard  ·  /bf aide pour les commandes")

-- { clé, texte, aide }
local OPTIONS = {
    { "header", "Alertes" },
    { "alerts",          "Alertes quand un groupe cherche un de mes rôles",
      "Message à l'écran quand un groupe cherche ton rôle pour une activité à ton niveau, ou quand quelqu'un cherche un groupe pour ce que ton groupe fait." },
    { "alertSound",      "Jouer un son avec les alertes" },
    { "alertInInstance", "Alertes même dans un donjon, un raid ou un champ de bataille" },
    { "favsOnly",        "Alertes seulement pour mes activités favorites",
      "Choisis-les avec le bouton « Activités favorites » plus bas, ou avec /bf favoris. Si tu n'en as choisi aucune, toutes les activités déclenchent une alerte." },
    { "alertChat",       "Alertes aussi pour les annonces lues dans le chat",
      "Par défaut, seules les annonces des joueurs qui ont l'addon déclenchent une alerte: le chat contient beaucoup d'annonces." },
    { "header", "Chat" },
    { "chatReading",     "Lire les annonces du chat et les ajouter au babillard",
      "Les annonces « LFM / LFG » du chat (général, recherche de groupe, cris) apparaissent avec la mention [chat]. Elles sont lues à l'écran seulement: rien n'est envoyé." },
    { "alsoChat",        "Publier aussi mon annonce dans le chat",
      "Quand tu cliques sur Publier, l'annonce est aussi envoyée dans « Recherche de groupe » (ou « Général »). Une fois par minute au maximum, seulement quand tu cliques." },
    { "header", "Mon annonce" },
    { "autoRemove",      "Retirer mon annonce automatiquement",
      "Quand tu rejoins un groupe, quand ton groupe est complet ou quand tu entres dans une instance." },
    { "remind",          "Me rappeler 2 minutes avant que mon annonce expire" },
    { "autoUpdate",      "Mettre à jour mon annonce quand des joueurs rejoignent mon groupe",
      "Met à jour le nombre de joueurs et retire le rôle tank ou soigneur quand quelqu'un du groupe l'a d'assigné." },
    { "header", "Affichage" },
    { "sameFaction",     "Montrer seulement ma faction" },
    { "sameRuleset",     "Montrer seulement mon type de serveur (PvE, PvP, RP)",
      "Cache les annonces d'un autre type de serveur: on ne peut pas grouper ensemble. Choisis ton type dans l'onglet Mon perso." },
    { "levelOnly",       "Montrer seulement les activités à mon niveau" },
    { "tooltipFlag",     "Afficher [FR] dans l'info-bulle des joueurs qui ont l'addon" },
    { "minimap",         "Afficher le bouton de la minimap" },
}

local checks = {}
local y = -64
for _, opt in ipairs(OPTIONS) do
    if opt[1] == "header" then
        y = y - 8
        local h = panel:CreateFontString(nil, "ARTWORK", "GameFontNormal")
        h:SetPoint("TOPLEFT", 16, y)
        h:SetText(opt[2])
        y = y - 22
    else
        local cb = ns.SafeCreate("CheckButton", nil, panel, "UICheckButtonTemplate", "OptionsBaseCheckButtonTemplate")
        cb:SetSize(26, 26)
        cb:SetPoint("TOPLEFT", 20, y)
        local label = panel:CreateFontString(nil, "ARTWORK", "GameFontHighlight")
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
        ns.Print("le menu des favoris n'est pas disponible dans cette version du jeu.")
        return
    end
    MenuUtil.CreateContextMenu(owner or UIParent, function(_, root)
        root:CreateTitle("Alertes : activités favorites")
        for _, cat in ipairs(ns.CATEGORIES) do
            local sub = root:CreateButton(cat)
            for _, a in ipairs(ns.ACTIVITIES[cat]) do
                sub:CreateCheckbox(a.name,
                    function() return ns.db.favs[a.key] and true or false end,
                    function() ns.db.favs[a.key] = (not ns.db.favs[a.key]) or nil end)
            end
        end
        root:CreateButton("Tout décocher", function() wipe(ns.db.favs) end)
    end)
end

local favBtn = CreateFrame("Button", nil, panel, "UIPanelButtonTemplate")
favBtn:SetSize(200, 24)
favBtn:SetPoint("TOPLEFT", 20, y - 16)
favBtn:SetText("Activités favorites")
favBtn:SetScript("OnClick", function(self) ns.OpenFavMenu(self) end)

local siteBtn = CreateFrame("Button", nil, panel, "UIPanelButtonTemplate")
siteBtn:SetSize(200, 24)
siteBtn:SetPoint("TOPLEFT", 230, y - 16)
siteBtn:SetText("Lien du site")
siteBtn:SetScript("OnClick", function() ns.ShowSiteLink() end)

panel:SetScript("OnShow", function()
    if not ns.db then return end
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
mm:SetHighlightTexture("Interface\\Minimap\\UI-Minimap-ZoomButton-Highlight")

local bg = mm:CreateTexture(nil, "BACKGROUND")
bg:SetTexture("Interface\\Minimap\\UI-Minimap-Background")
bg:SetSize(20, 20)
bg:SetPoint("TOPLEFT", 7, -5)

local icon = mm:CreateTexture(nil, "ARTWORK")
icon:SetTexture(ns.ICON)
icon:SetSize(17, 17)
icon:SetPoint("TOPLEFT", 7, -6)
icon:SetTexCoord(0.08, 0.92, 0.08, 0.92)

local border = mm:CreateTexture(nil, "OVERLAY")
border:SetTexture("Interface\\Minimap\\MiniMap-TrackingBorder")
border:SetSize(53, 53)
border:SetPoint("TOPLEFT")

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
    if button == "RightButton" then
        ns.ShowSiteLink()
    elseif ns.UI then
        ns.UI.Toggle()
    end
end)

mm:SetScript("OnEnter", function(self)
    GameTooltip:SetOwner(self, "ANCHOR_LEFT")
    GameTooltip:AddLine("Babillard Forever FR")
    local n = 0
    for _ in pairs(ns.listings) do n = n + 1 end
    GameTooltip:AddLine(n .. " annonce(s) active(s)", 0.6, 0.8, 1)
    if ns.my then GameTooltip:AddLine("Ton annonce est active", 0.2, 0.87, 0.33) end
    GameTooltip:AddLine(" ")
    GameTooltip:AddLine("Clic gauche : ouvrir le babillard", 1, 1, 1)
    GameTooltip:AddLine("Clic droit : lien du site", 1, 1, 1)
    GameTooltip:AddLine("Glisser : déplacer ce bouton", 0.7, 0.7, 0.7)
    GameTooltip:Show()
end)
mm:SetScript("OnLeave", GameTooltip_Hide)

-- Aussi dans le menu des addons de la minimap (le bouton « AddOns » de Blizzard),
-- au cas où le bouton rond serait caché par une autre interface.
function BabillardFR_OnCompartmentClick(_, button)
    ns.EnsureChannel()
    if button == "RightButton" then
        ns.ShowSiteLink()
    elseif ns.UI then
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
