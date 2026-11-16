"""Test de fumée de l'interface de lfgFR avec une FAUSSE API de jeu.

    python3 addon/tests/test_ui_smoke.py

Ça attrape les fautes de Lua (variable nulle, fonction mal appelée, global qui fuit, pcall qui avale une erreur),
pas les différences de comportement réel de l'API de Forever: ça, seul le jeu peut le dire.
"""
import os
import sys

from lupa.lua51 import LuaRuntime

RACINE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "lfgFR").replace("\\", "/")
lua = LuaRuntime(unpack_returned_tuples=True)

RESULTAT = lua.execute(r"""
local RACINE = ...
local erreurs = {}
local function erreur(m) erreurs[#erreurs + 1] = m end

-- ---------- fausse API ----------
local tous = {}      -- toutes les images créées
local ENVOYES = {}   -- messages envoyés par SendChatMessage
local INVITES = {}

local methodes = {}
local function nouveau(type_)
  local o = { _type = type_, _scripts = {}, _texte = "", _montre = true, _actif = true, _enfants = {} }
  tous[#tous + 1] = o
  return setmetatable(o, { __index = function(t, k)
    local m = methodes[k]
    if m then return m end
    if k:sub(1, 3) == "Set" or k:sub(1, 3) == "Get" or k:sub(1, 2) == "Is" or k:sub(1, 6) == "Enable" or k == "Show" or k == "Hide" or k:find("^[A-Z]") then
      return function() end
    end
    return nil
  end })
end
methodes.SetText = function(self, t) self._texte = t or "" end
methodes.GetText = function(self) return self._texte end
methodes.Show = function(self) self._montre = true end
methodes.Hide = function(self) self._montre = false end
methodes.SetShown = function(self, v) self._montre = v and true or false end
methodes.IsShown = function(self) return self._montre end
methodes.SetEnabled = function(self, v) self._actif = v and true or false end
methodes.SetScript = function(self, nom, fn) self._scripts[nom] = fn end
methodes.CreateFontString = function(self) return nouveau("FontString") end
methodes.CreateTexture = function(self) return nouveau("Texture") end
methodes.GetWidth = function() return 100 end

CreateFrame = function(type_, nom, parent, modele)
  local o = nouveau(type_)
  o._modele = modele
  o._nom = nom
  if modele == "BasicFrameTemplateWithInset" then o.TitleText = nouveau("FontString") end
  if nom then _G[nom] = o end
  return o
end
UIParent = nouveau("Frame")
GameTooltip = nouveau("Frame")
UISpecialFrames = {}
NUM_CHAT_WINDOWS = 3
ChatFrame1 = nouveau("Frame")
ChatFrame_RemoveChannel = function() end
C_Timer = { After = function(_, fn) fn() end }
issecretvalue = function(v) return v == "SECRET" end
Ambiguate = function(nom) return (nom:gsub("%-.*$", "")) end
UnitName = function() return "Barrbiche" end
UnitLevel = function() return 20 end
time = function() return 1000000 end
GetBuildInfo = function() return "1.60.1", "1", "x", 16001 end
local canalRejoint = false
JoinChannelByName = function(nom) canalRejoint = true end
LeaveChannelByName = function(nom) canalRejoint = false end
GetChannelName = function(nom) if canalRejoint then return 5 end return 0 end
SendChatMessage = function(texte, type_, langue, cible) ENVOYES[#ENVOYES + 1] = { texte, type_, cible } end
C_PartyInfo = { InviteUnit = function(nom) INVITES[#INVITES + 1] = nom end }
SlashCmdList = {}

-- Les globaux ne doivent pas fuir (sauf ceux que l'addon crée exprès)
local permis = { lfgFRDB = true, SLASH_LFGFR1 = true, lfgFRFenetre = true }
local imprimes = {}
print = function(...) imprimes[#imprimes + 1] = table.concat({ ... }, " ") end

-- ---------- chargement ----------
local ns = {}
for _, fichier in ipairs({ "Parser.lua", "Export.lua", "Core.lua", "UI.lua" }) do
  local f = assert(loadfile(RACINE .. "/" .. fichier))
  f("lfgFR", ns)
end
setmetatable(_G, { __newindex = function(t, k, v)
  if not permis[k] and not k:match("^ChatFrame") then erreur("global qui fuit: " .. tostring(k)) end
  rawset(t, k, v)
end })

local cadre = ns.cadre
local function evt(nom, ...) return cadre._scripts.OnEvent(cadre, nom, ...) end

evt("ADDON_LOADED", "lfgFR")
evt("PLAYER_LOGIN")
if not canalRejoint then erreur("le canal n'a pas été rejoint au démarrage") end

-- ---------- messages ----------
evt("CHAT_MSG_CHANNEL", "LFM RFC need tank and heal", "Alice-Forever", "", "2. Recherche de groupe", "", "", 0, 2, "LookingForGroup")
evt("CHAT_MSG_CHANNEL", "Cherche un groupe pour les Mortemines niv 20", "Bob", "", "1. Général", "", "", 0, 1, "General")
evt("CHAT_MSG_YELL", "LFM SM cath 2 dps", "Carole")
evt("CHAT_MSG_CHANNEL", "LFM wc healer", "Dede", "", "5. lfgFR", "", "", 0, 5, "lfgFR")
evt("CHAT_MSG_CHANNEL", "WTS Linen Cloth", "Spam")
evt("CHAT_MSG_CHANNEL", "LFM RFC tank", "Gardien", "", "3. Défense locale", "", "", 0, 3, "LocalDefense")
evt("CHAT_MSG_CHANNEL", "SECRET", "Eve")
evt("CHAT_MSG_CHANNEL", "LFM BFD tank", "SECRET")
evt("CHAT_MSG_CHANNEL", 42, nil)
evt("CHAT_MSG_CHANNEL", "LFM Maraudon tank", "Barrbiche", "", "5. lfgFR", "", "", 0, 5, "lfgFR")
if #ns.liste() ~= 5 then erreur("la liste devrait avoir 5 annonces, elle en a " .. #ns.liste()) end
if ns.stats.secrets ~= 2 then erreur("2 messages secrets attendus, " .. ns.stats.secrets) end

-- ---------- filtres ----------
lfgFRDB.filtre.type = "LFG"
if #ns.liste() ~= 1 or ns.liste()[1].auteur ~= "Bob" then erreur("filtre LFG") end
lfgFRDB.filtre.type = "tous"; lfgFRDB.filtre.role = "heal"
local noms = {}
for _, e in ipairs(ns.liste()) do noms[#noms + 1] = e.auteur end
table.sort(noms)
-- Bob n'indique aucun rôle: on le garde (un filtre ne doit pas cacher une annonce qui ne précise rien).
if table.concat(noms, ",") ~= "Alice-Forever,Bob,Dede" then erreur("filtre rôle heal: " .. table.concat(noms, ",")) end
lfgFRDB.filtre.role = "tous"; lfgFRDB.filtre.donjon = "Wailing Caverns"
if #ns.liste() ~= 1 then erreur("filtre donjon") end
lfgFRDB.filtre.donjon = "tous"

-- ---------- fenêtre: ouverture et tous les boutons ----------
SlashCmdList["LFGFR"]("")
if not lfgFRFenetre or not lfgFRFenetre:IsShown() then erreur("la fenêtre ne s'est pas ouverte") end
local function cliquerTout()
  for _, o in ipairs(tous) do
    local clic = o._scripts.OnClick
    if clic and o._type == "Button" then
      for _, b in ipairs({ "LeftButton", "RightButton" }) do
        local ok, e = pcall(clic, o, b)
        if not ok then erreur("clic " .. b .. " sur « " .. (o._texte or "?") .. " »: " .. tostring(e)) end
      end
    end
  end
end

local page = lfgFRFenetre.pages.liste
local affichees = 0
for _, ligne in ipairs(page.lignes) do if ligne:IsShown() then affichees = affichees + 1 end end
if affichees ~= 5 then erreur("5 lignes visibles attendues, " .. affichees) end
if not page.lignes[1].resume._texte:find("Cavernes") and not page.lignes[1].resume._texte:find("Gouffre")
   and not page.lignes[1].resume._texte:find("Monast") and not page.lignes[1].resume._texte:find("Maraudon") then
  erreur("résumé de la première ligne: " .. page.lignes[1].resume._texte)
end

-- Sélection, chuchoter, inviter
local ligneBob
for _, ligne in ipairs(page.lignes) do if ligne.cle == "bob" then ligneBob = ligne end end
if not ligneBob then erreur("pas de ligne pour Bob") else
  ligneBob._scripts.OnEnter(ligneBob)
  ligneBob._scripts.OnClick(ligneBob)
  page.btnChuchoter._scripts.OnClick(page.btnChuchoter, "LeftButton")
  page.btnInviter._scripts.OnClick(page.btnInviter, "LeftButton")
  if #ENVOYES ~= 1 or ENVOYES[1][2] ~= "WHISPER" or ENVOYES[1][3] ~= "Bob" then erreur("chuchotement non envoyé") end
  if not ENVOYES[1][1]:find("groupe") then erreur("texte du chuchotement: " .. ENVOYES[1][1]) end
  if INVITES[1] ~= "Bob" then erreur("invitation non envoyée") end
  ligneBob._scripts.OnLeave(ligneBob)
end
page._scripts.OnMouseWheel(page, -1)
page._scripts.OnMouseWheel(page, 1)

-- Les pages Publier et Mon perso
SlashCmdList["LFGFR"]("publier")
local pub = lfgFRFenetre.pages.publier
if not pub.apercu._texte:find("^LFM") then erreur("aperçu de l'annonce: " .. pub.apercu._texte) end
cliquerTout()                                   -- clique tout (types, activités, rôles, publier, etc.)
SlashCmdList["LFGFR"]("publier")
pub.btnType._scripts.OnClick(pub.btnType, "LeftButton")  -- repasse en LFM ou LFG
local avant = #ENVOYES
pub.btnPublier._scripts.OnClick(pub.btnPublier, "LeftButton")
if #ENVOYES ~= avant + 1 or ENVOYES[#ENVOYES][2] ~= "CHANNEL" or ENVOYES[#ENVOYES][3] ~= 5 then
  erreur("publication sur le canal lfgFR non envoyée")
end
if not ENVOYES[#ENVOYES][1]:find("%[lfgFR%]") then erreur("l'annonce publiée devrait finir par [lfgFR]") end

SlashCmdList["LFGFR"]("export")
local perso = lfgFRFenetre.pages.perso
perso.btnExporter._scripts.OnClick(perso.btnExporter, "LeftButton")
if not (perso.boite.texteFixe or ""):find("^LFGFR1:") then erreur("l'export n'a rien produit") end
-- la boîte ne doit pas se laisser modifier
perso.boite._texte = "modifié"
perso.boite._scripts.OnTextChanged(perso.boite, true)
if perso.boite._texte ~= perso.boite.texteFixe then erreur("la boîte d'export a été modifiée") end

-- Commandes
for _, c in ipairs({ "canal", "canal", "vider", "debug", "test LFM RFC tank", "test bonjour", "aide", "liste" }) do
  local ok, e = pcall(SlashCmdList["LFGFR"], c)
  if not ok then erreur("commande « " .. c .. " »: " .. tostring(e)) end
end
if #ns.liste() ~= 0 then erreur("/lfgfr vider n'a pas vidé la liste") end

return { table.concat(erreurs, "\n"), table.concat(imprimes, "\n") }
""", RACINE)

erreurs, imprimes = RESULTAT[1], RESULTAT[2]
print(imprimes)
print("-" * 60)
if erreurs:
    print("ERREURS:\n" + erreurs)
    sys.exit(1)
print("Test de fumée de l'interface: OK")
