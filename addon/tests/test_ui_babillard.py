"""Charge l'interface de l'addon Babillard Forever FR avec une fausse API du jeu, remplit la liste et vérifie
ce qui s'affiche: pas de doublon, seulement le même type de serveur.

    python3 addon/tests/test_ui_babillard.py     (nécessite lupa)

Attrape les fautes de Lua (variable nulle, mauvaise fonction); ne dit rien de l'apparence réelle dans le jeu.
"""
import os
import sys

from lupa.lua51 import LuaRuntime

ADDON = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "BabillardForeverFR")).replace("\\", "/")
lua = LuaRuntime(unpack_returned_tuples=True)
RESULTAT = lua.execute(r"""
local ADDON_DIR = ...
local erreurs = {}
local function erreur(m) erreurs[#erreurs + 1] = m end

-- Fausse API: chaque objet accepte n'importe quelle méthode; seules quelques-unes gardent un état.
local objets = {}
local methodes = {}
local function nouveau()
  local o = { _scripts = {}, _texte = "", _montre = true, _coche = false }
  objets[#objets + 1] = o
  return setmetatable(o, { __index = function(t, k)
    if methodes[k] then return methodes[k] end
    if type(k) == "string" and k:find("^[A-Z]") then return function() return nouveau() end end
    return nil
  end })
end
methodes.SetText = function(self, t) self._texte = tostring(t == nil and "" or t) end
methodes.GetText = function(self) return self._texte end
methodes.Show = function(self) self._montre = true end
methodes.Hide = function(self) self._montre = false end
methodes.SetShown = function(self, v) self._montre = v and true or false end
methodes.IsShown = function(self) return self._montre end
methodes.SetChecked = function(self, v) self._coche = v end
methodes.GetChecked = function(self) return self._coche end
methodes.SetScript = function(self, n, f) self._scripts[n] = f end
methodes.HookScript = function(self, n, f) self._scripts["hook_" .. n] = f end
methodes.GetScript = function(self, n) return self._scripts[n] end
methodes.SetHeight = function(self, h) self._h = h end
methodes.SetSize = function(self, w, h) self._h = h end
methodes.SetVerticalScroll = function(self, v) self._defile = v end
methodes.GetVerticalScroll = function(self) return self._defile or 0 end
methodes.GetVerticalScrollRange = function(self) return self._plage or 0 end
methodes.GetWidth = function() return 100 end
methodes.GetHeight = function() return 20 end
methodes.GetStringWidth = function() return 50 end
methodes.GetNumPoints = function() return 0 end
methodes.IsMouseOver = function() return false end
methodes.IsEnabled = function() return true end
methodes.GetParent = function(self) return self end
methodes.CreateFontString = function() return nouveau() end
methodes.CreateTexture = function() return nouveau() end
methodes.CreateAnimationGroup = function() return nouveau() end
methodes.CreateAnimation = function() return nouveau() end

local U = nouveau()
setmetatable(_G, { __index = function(_, k) if k:find("^[A-Z]") and not k:find("^[A-Z_]+$") then return nil end return nil end })
CreateFrame = function() return nouveau() end
UIParent, Minimap, GameTooltip = nouveau(), nouveau(), nouveau()
GameTooltip_Hide = function() end
StaticPopupDialogs, SlashCmdList, UISpecialFrames = {}, {}, {}
StaticPopup_Show, StaticPopup_Hide = function() end, function() end
C_Timer = { After = function() end, NewTicker = function() end }
C_ChatInfo = { RegisterAddonMessagePrefix = function() end, SendAddonMessage = function() return 0 end }
strtrim = function(s) return (s:gsub("^%s+", ""):gsub("%s+$", "")) end
strsplit = function(sep, s)
  local t = {}
  for p in (s .. sep):gmatch("(.-)" .. sep:gsub("%-", "%%-")) do t[#t + 1] = p end
  return unpack(t)
end
tinsert = table.insert
CopyTable = function(t) local c = {}; for k, v in pairs(t) do c[k] = type(v) == "table" and CopyTable(v) or v end; return c end
time = function() return 1790000000 end
local horloge = 100
GetTime = function() return horloge end
issecretvalue = function() return false end
InCombatLockdown = function() return false end
IsInInstance = function() return false end
IsInGroup = function() return false end
UnitIsGroupLeader = function() return true end
GetNumGroupMembers = function() return 1 end
UnitName = function() return "Barrbiche" end
UnitFullName = function() return "Barrbiche", "Forever Realm" end
GetNormalizedRealmName = function() return "ForeverRealm" end
UnitClass = function() return "Voleur", "ROGUE" end
UnitRace = function() return "Orc" end
UnitLevel = function() return 20 end
UnitFactionGroup = function() return "Horde" end
GetGuildInfo = function() return nil end
GetCurrentRegionName = function() return "EU" end
Ambiguate = function(nom) return (nom:gsub("%-.*$", "")) end
GetChannelName = function() return 5 end
RAID_CLASS_COLORS = {}
NUM_CHAT_WINDOWS = 1
math.atan2 = math.atan2 or function(y, x) return math.atan(y / x) end
local imprimes = {}
print = function(...) imprimes[#imprimes + 1] = table.concat({ ... }, " ") end

local ns = {}
for _, f in ipairs({ "Data.lua", "Chat.lua", "Core.lua", "UI.lua", "Options.lua" }) do
  local chunk, e = loadfile(ADDON_DIR .. "/" .. f)
  if not chunk and f == "Chat.lua" then chunk = function() end end   -- absent des anciennes versions
  if not chunk then error(e) end
  local ok, e2 = pcall(chunk, "BabillardForeverFR", ns)
  if not ok then erreur("chargement de " .. f .. ": " .. tostring(e2)) end
end
if #erreurs > 0 then return table.concat(erreurs, "\n") end

-- Récupère le script OnEvent du cadre d'événements de Core.lua
local cadre
for _, o in ipairs(objets) do if o._scripts.OnEvent and o._scripts.OnEvent ~= nil then cadre = o._scripts.OnEvent end end
if not cadre then return "pas de cadre d'événements" end
cadre(nil, "ADDON_LOADED", "BabillardForeverFR")

local function recevoir(msg, expediteur) cadre(nil, "CHAT_MSG_ADDON", "BabillardFR", msg, "CHANNEL", expediteur) end
recevoir("L2;LFM;Donjons;WC;T;WARRIOR;20;Horde;5;1;0;PvE;normal", "Alice-ForeverRealm")
recevoir("L2;LFM;Donjons;WC;H;PRIEST;20;Horde;5;1;0;PvP;pvp", "Bob-ForeverRealm")
recevoir("L2;LFM;Donjons;WC;D;MAGE;20;Horde;5;1;0;ancienne version", "Carl-ForeverRealm")
-- Alice écrite de deux façons: une seule ligne attendue
recevoir("L2;LFM;Donjons;VC;T;WARRIOR;20;Horde;5;1;0;PvE;normal", "Alice")
ns.listings["Alice"] = ns.listings["Alice"] or nil

local function lignesVisibles(vue)
  local noms = {}
  for _, o in ipairs(objets) do
    if o.data and o.data.sender and o.IsShown(o) then noms[#noms + 1] = o.data.sender end
  end
  table.sort(noms)
  return table.concat(noms, ",")
end

-- Bouton « Actualiser » au pied de la fenêtre: il existe et son clic ne plante pas
do
  local bouton
  for _, o in ipairs(objets) do
    if o._texte == "Actualiser" and o._scripts.OnClick then bouton = o end
  end
  if not bouton then erreur("pas de bouton Actualiser")
  else
    local ok2, e2 = pcall(bouton._scripts.OnClick, bouton)
    if not ok2 then erreur("clic sur Actualiser: " .. tostring(e2)) end
  end
end

-- Panneau d'options: tout le contenu est dans une zone défilante dont la hauteur couvre toutes les options
do
  local zone
  for _, o in ipairs(objets) do
    if o._scripts.OnMouseWheel and o._scripts.OnSizeChanged then zone = o end
  end
  if not zone then
    erreur("panneau d'options: pas de zone défilante")
  else
    zone._plage = 300
    zone._scripts.OnMouseWheel(zone, -1)
    if zone._defile ~= 40 then erreur("molette vers le bas: défilement de 40, obtenu " .. tostring(zone._defile)) end
    zone._scripts.OnMouseWheel(zone, 1)
    zone._scripts.OnMouseWheel(zone, 5)
    if zone._defile ~= 0 then erreur("molette vers le haut: jamais en dessous de 0, obtenu " .. tostring(zone._defile)) end
    zone._scripts.OnMouseWheel(zone, -100)
    if zone._defile ~= 300 then erreur("molette: jamais au-delà de la plage (300), obtenu " .. tostring(zone._defile)) end
    local haut = 0
    for _, o in ipairs(objets) do
      if o._h and o._h > haut and o._h < 5000 then haut = o._h end
    end
    if haut < 700 then erreur("le contenu des options doit couvrir toutes les cases (hauteur " .. haut .. ")") end
  end
end

-- Ouvre l'interface et rafraîchit
ns.db.ruleset = "normal"
local ok, e = pcall(ns.UI.Open, 1)
if not ok then erreur("ns.UI.Open: " .. tostring(e)) end
ok, e = pcall(ns.UI.Refresh)
if not ok then erreur("ns.UI.Refresh: " .. tostring(e)) end
local visibles_normal = lignesVisibles()

ns.db.ruleset = "pvp"
ok, e = pcall(ns.UI.Refresh)
if not ok then erreur("ns.UI.Refresh pvp: " .. tostring(e)) end
local visibles_pvp = lignesVisibles()

ns.db.opts.sameRuleset = false
pcall(ns.UI.Refresh)
local visibles_tous = lignesVisibles()

-- L'onglet Mon perso et son bouton de type de serveur
ns.db.opts.sameRuleset = true
ns.db.ruleset = nil
ok, e = pcall(ns.UI.Open, 3)
if not ok then erreur("ns.UI.Open(3): " .. tostring(e)) end
local bouton
for _, o in ipairs(objets) do if o._scripts.OnClick and o._texte:find("Choisis ton type de serveur") then bouton = o end end
if not bouton then erreur("le bouton « Choisis ton type de serveur » est introuvable") else
  bouton._scripts.OnClick(bouton)
  if ns.db.ruleset ~= "normal" then erreur("un clic devrait choisir « normal », on a " .. tostring(ns.db.ruleset)) end
  bouton._scripts.OnClick(bouton)
  if ns.db.ruleset ~= "pvp" then erreur("2e clic: « pvp » attendu, on a " .. tostring(ns.db.ruleset)) end
  for i = 1, 2 do bouton._scripts.OnClick(bouton) end
  if ns.db.ruleset ~= "rp_pvp" then erreur("4 clics: « rp_pvp » attendu") end
  bouton._scripts.OnClick(bouton)
  if ns.db.ruleset ~= "normal" then erreur("le cycle devrait revenir à « normal »") end
end

-- Le look (fond nuit, cadres dorés): aucune étape ne doit avoir échoué avec la fausse API
if ns.skinErrors ~= 0 then erreur("le look du site a eu " .. tostring(ns.skinErrors) .. " erreur(s)") end
if not ns.Skin or not ns.Skin.Button then erreur("ns.Skin absent") end

-- Annonce lue dans le chat: affichée avec [chat], niveau « - », et les boutons ne plantent pas
if ns.OnChat then
  ns.db.ruleset = "normal"
  cadre(nil, "CHAT_MSG_CHANNEL", "LFM RFC tank heal", "Zoe-ForeverRealm", "", "2. Recherche de groupe", "", "", 0, 2, "LookingForGroup")
  cadre(nil, "CHAT_MSG_CHANNEL", "LFM wc tank", "Yan-ForeverRealm", "", "2. Recherche de groupe", "", "", 0, 2, "LookingForGroup")
  ok, e = pcall(ns.UI.Open, 1)
  if not ok then erreur("UI.Open(1) avec annonce du chat: " .. tostring(e)) end
  local vuChat, vuTexte = false, false
  for _, o in ipairs(objets) do
    if o.data and o.data.source == "chat" and o.IsShown(o) then vuChat = true end
    if o._texte and o._texte:find("%[chat%]") then vuTexte = true end
  end
  if not vuChat then erreur("l'annonce du chat n'est dans aucune ligne visible") end
  if not vuTexte then erreur("la mention [chat] n'est pas affichée") end
  ns.db.opts.chatReading = false
  ok, e = pcall(ns.UI.Refresh)
  if not ok then erreur("Refresh chat coupé: " .. tostring(e)) end
  for _, o in ipairs(objets) do
    if o.data and o.data.source == "chat" and o.IsShown(o) then erreur("annonce du chat visible alors que la lecture est coupée") end
  end
  -- Message du babillard vide: dit pourquoi il est vide (options, catégorie ou vraiment rien)
  local function texteVisible(motif)
    for _, o in ipairs(objets) do
      if o._texte and o._texte:find(motif) and o.IsShown(o) then return true end
    end
    return false
  end
  for k in pairs(ns.listings) do ns.listings[k] = nil end
  ns.db.opts.chatReading = true
  cadre(nil, "CHAT_MSG_CHANNEL", "LFM RFC tank heal", "Zoe-ForeverRealm", "", "2. Recherche de groupe", "", "", 0, 2, "LookingForGroup")
  ns.db.opts.chatReading = false
  pcall(ns.UI.Refresh)
  if not texteVisible("annonce est cach") then erreur("babillard vide à cause des options: le message doit le dire") end
  for k in pairs(ns.listings) do ns.listings[k] = nil end
  pcall(ns.UI.Refresh)
  if not texteVisible("Aucun groupe pour l'instant") then erreur("babillard vraiment vide: message attendu") end
  if not texteVisible("lecture du chat est coup") then erreur("lecture du chat coupée: le message doit le rappeler") end
  ns.db.opts.chatReading = true
  pcall(ns.UI.Refresh)
  if texteVisible("lecture du chat est coup") then erreur("lecture du chat active: pas de rappel") end
  -- Menu des activités favorites (faux menu du jeu qui garde les cases à cocher)
do
  local cases = {}
  local function faux() local m = {}
    m.CreateTitle = function() end
    m.CreateButton = function(self, texte, f) if f then f() end return faux() end
    m.CreateCheckbox = function(self, texte, estCoche, change) cases[#cases + 1] = { texte = texte, estCoche = estCoche, change = change } end
    return m end
  MenuUtil = { CreateContextMenu = function(_, generateur) generateur(nil, faux()) end }
  wipe = function(t) for k in pairs(t) do t[k] = nil end end
  local ok3, e3 = pcall(ns.OpenFavMenu)
  if not ok3 then erreur("menu des favoris: " .. tostring(e3)) end
  if #cases < 30 then erreur("le menu des favoris devrait lister toutes les activités, il en a " .. #cases) end
  local wc
  for _, c in ipairs(cases) do if c.texte == "Cavernes des Lamentations" then wc = c end end
  if not wc then erreur("Cavernes des Lamentations absente du menu") else
    if wc.estCoche() then erreur("case cochée au départ") end
    wc.change()
    if not (wc.estCoche() and ns.db.favs.WC) then erreur("la case WC devrait être cochée") end
    wc.change()
    if wc.estCoche() or ns.db.favs.WC then erreur("la case WC devrait se décocher") end
  end
  MenuUtil = nil
  ok3, e3 = pcall(ns.OpenFavMenu)
  if not ok3 then erreur("menu des favoris sans MenuUtil: " .. tostring(e3)) end
end

-- Molette sur les icônes de rôle (places par rôle) et clics: aucune erreur
for _, o in ipairs(objets) do
  local roue = o._scripts.OnMouseWheel
  if roue then
    for _, delta in ipairs({ 1, -1 }) do
      local okr, er = pcall(roue, o, delta)
      if not okr then erreur("molette: " .. tostring(er)) end
    end
  end
end

-- Toutes les cases et tous les boutons de la fenêtre et des options
  for _, o in ipairs(objets) do
    local clic = o._scripts.OnClick
    if clic then
      local ok2, e2 = pcall(clic, o, "LeftButton")
      -- Les boutons des lignes vides n'existent pas à l'écran: un clic sans données n'est pas une erreur.
      if not ok2 and not tostring(e2):find("local 'd'", 1, true) then erreur("clic: " .. tostring(e2)) end
    end
  end
end

return table.concat(erreurs, "\n") .. "\n@@" .. visibles_normal .. "@@" .. visibles_pvp .. "@@" .. visibles_tous
""", ADDON)

erreurs, normal, pvp, tous = RESULTAT.split("@@") if RESULTAT.count("@@") == 3 else (RESULTAT, "", "", "")
echecs = [e for e in erreurs.strip().split("\n") if e]


def verifier(obtenu, attendu, message):
    if obtenu != attendu:
        echecs.append(f"{message}: {obtenu!r}, attendu {attendu!r}")


if not echecs:
    verifier(normal, "Alice-ForeverRealm,Carl-ForeverRealm", "joueur PvE: voit Alice (une seule fois) et Carl (type inconnu), pas Bob (PvP)")
    verifier(pvp, "Bob-ForeverRealm,Carl-ForeverRealm", "joueur PvP: voit Bob et Carl, pas Alice")
    verifier(tous, "Alice-ForeverRealm,Bob-ForeverRealm,Carl-ForeverRealm", "filtre coupé: tout le monde")

if echecs:
    print("\n".join("ÉCHEC: " + e for e in echecs))
    sys.exit(1)
print("Interface de l'addon: OK")
