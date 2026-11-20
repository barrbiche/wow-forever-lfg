"""Règles de l'addon Babillard Forever FR, exécutées dans un vrai Lua 5.1 avec une fausse API du jeu:
  - sa propre annonce ne revient pas en double quand le jeu écrit le royaume autrement;
  - on ne voit que les annonces du même type de serveur (PvE, PvP, RP, RP-PvP).

    python3 addon/tests/test_regles_addon.py [dossier de l'addon]     (nécessite lupa)

Sans argument, teste addon/BabillardForeverFR. Avec le dossier d'une ancienne version, on voit le doublon se produire.
"""
import os
import sys

from lupa.lua51 import LuaRuntime

ICI = os.path.dirname(os.path.abspath(__file__))
ADDON = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else os.path.join(ICI, "..", "BabillardForeverFR")).replace("\\", "/")

lua = LuaRuntime(unpack_returned_tuples=True)
RESULTAT = lua.execute(r"""
local ADDON_DIR = ...
local sorties = {}
local function noter(cle, valeur) sorties[#sorties + 1] = cle .. "=" .. tostring(valeur) end

-- ---------- fausse API ----------
local U = {}
setmetatable(U, { __index = function() return U end, __call = function() return U end })
setmetatable(_G, { __index = function() return U end })
StaticPopupDialogs, SlashCmdList = {}, {}
C_Timer = { After = function() end, NewTicker = function() end }
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
GetNumGroupMembers = function() return 1 end
UnitName = function() return "Barrbiche" end
-- Le royaume a une espace: UnitFullName l'écrit « Forever Realm », les messages reçus « ForeverRealm ».
UnitFullName = function() return "Barrbiche", "Forever Realm" end
GetNormalizedRealmName = function() return "ForeverRealm" end
UnitClass = function() return "Voleur", "ROGUE" end
UnitRace = function() return "Orc" end
UnitLevel = function() return 20 end
UnitFactionGroup = function() return "Horde" end
GetGuildInfo = function() return nil end
GetCurrentRegionName = function() return "EU" end
rawset(_G, "GetAverageItemLevel", false)
rawset(_G, "C_ClassColor", false)
RAID_CLASS_COLORS = {}
rawset(_G, "RaidNotice_AddMessage", false)
rawset(_G, "SOUNDKIT", false)
rawset(_G, "GetProfessions", false)
rawset(_G, "BabillardForeverFRDB", {})   -- une vraie table vide, pas le faux global
Ambiguate = function(nom) return (nom:gsub("%-.*$", "")) end
GetChannelName = function() return 5 end
local ENVOYES = {}
C_ChatInfo = { RegisterAddonMessagePrefix = function() end,
               SendAddonMessage = function(prefixe, msg) ENVOYES[#ENVOYES + 1] = msg; return 0 end }
local cadre
CreateFrame = function()
  local o = { SetScript = function(self, nom, f) if nom == "OnEvent" then cadre = f end end }
  return setmetatable(o, { __index = function() return function() return U end end })
end
print = function() end

local ns = {}
for _, f in ipairs({ "Data.lua", "Chat.lua", "Core.lua" }) do
  local chunk = loadfile(ADDON_DIR .. "/" .. f)   -- Chat.lua n'existe pas dans les anciennes versions
  if chunk then chunk("BabillardForeverFR", ns) elseif f ~= "Chat.lua" then error("fichier manquant: " .. f) end
end
cadre(nil, "ADDON_LOADED", "BabillardForeverFR")

local function compter(t) local n = 0; for _ in pairs(t) do n = n + 1 end; return n end
local function recevoir(msg, expediteur) cadre(nil, "CHAT_MSG_ADDON", "BabillardFR", msg, "CHANNEL", expediteur) end

-- ---------- 1. Mon annonce ne revient pas en double ----------
ns.db.ruleset = "pvp"   -- les versions récentes exigent le type de serveur pour publier
ns.PublishListing({ type = "LFM", akey = "WC", roles = { TANK = true }, note = "test" })
local monMessage = ENVOYES[#ENVOYES]
noter("message_publie", monMessage)
recevoir(monMessage, "Barrbiche-ForeverRealm")   -- l'écho, avec le royaume écrit autrement
recevoir(monMessage, "Barrbiche")                -- ou sans royaume
noter("annonces_apres_echo", compter(ns.listings))

-- ---------- 2. Types de serveur ----------
if not ns.RulesetOK then return table.concat(sorties, "\n") .. "\nancienne_version=true" end
ns.db.ruleset = "pvp"
noter("pvp_ok_pvp", ns.RulesetOK("pvp"))
noter("pvp_ok_normal", ns.RulesetOK("normal"))
noter("pvp_ok_rp", ns.RulesetOK("rp"))
noter("pvp_ok_inconnu", ns.RulesetOK(""))
noter("pvp_ok_nil", ns.RulesetOK(nil))
ns.db.ruleset = nil
noter("sans_choix_ok_normal", ns.RulesetOK("normal"))
ns.db.ruleset = "normal"
ns.db.opts.sameRuleset = false
noter("filtre_coupe_ok_pvp", ns.RulesetOK("pvp"))
ns.db.opts.sameRuleset = true

-- Le type de serveur voyage dans les messages
ns.db.ruleset = "rp_pvp"
horloge = horloge + 60
ns.WithdrawListing()
ns.PublishListing({ type = "LFG", akey = "WC", roles = { DPS = true }, note = "" })
local m = ENVOYES[#ENVOYES]
noter("message_ruleset", ns.VERSION and m:match(";([^;]*);[^;]*$") or m:match(";([^;]*)$"))
noter("message_version", m:match(";([^;]*)$"))

-- Un message d'un autre joueur: type valide, type inventé, ancienne version (sans type)
recevoir("L2;LFM;Donjons;WC;T;WARRIOR;15;Horde;5;1;0;note;pvp", "Alice-ForeverRealm")
recevoir("L2;LFM;Donjons;WC;T;WARRIOR;15;Horde;5;1;0;note;hack", "Bob-ForeverRealm")
recevoir("L2;LFM;Donjons;WC;T;WARRIOR;15;Horde;5;1;0;note", "Carl-ForeverRealm")
noter("ruleset_alice", ns.listings["Alice-ForeverRealm"].ruleset)
noter("ruleset_bob", ns.listings["Bob-ForeverRealm"].ruleset)
noter("ruleset_carl", ns.listings["Carl-ForeverRealm"].ruleset)
recevoir("G2;Les Pas Fins;PVE;Horde;ROGUE;60;0;bienvenue;rp", "Dede-ForeverRealm")
noter("ruleset_guilde", ns.guilds["Les Pas Fins-Horde"].ruleset)

-- Le code d'export contient le type de serveur
noter("export_ruleset", ns.BuildExportCode():match(";rs=([^;]*);"))

return table.concat(sorties, "\n")
""", ADDON)

lus = dict(ligne.split("=", 1) for ligne in RESULTAT.split("\n"))
echecs = []
ancienne = "ancienne_version" in lus


def verifier(cle, attendu, explication):
    obtenu = lus.get(cle)
    if obtenu != attendu:
        echecs.append(f"{explication}: {cle} = {obtenu!r}, attendu {attendu!r}")


verifier("annonces_apres_echo", "1", "mon annonce ne doit exister qu'une fois, même quand le message revient")
if ancienne:
    print(f"Addon testé: {ADDON} (ancienne version, sans types de serveur)")
    print("Annonces dans la liste après l'écho de ma propre annonce:", lus["annonces_apres_echo"])
    sys.exit(1 if echecs else 0)
verifier("pvp_ok_pvp", "true", "PvP voit PvP")
verifier("pvp_ok_normal", "false", "PvP ne voit pas PvE")
verifier("pvp_ok_rp", "false", "PvP ne voit pas RP")
verifier("pvp_ok_inconnu", "true", "annonce sans type de serveur: on la montre")
verifier("pvp_ok_nil", "true", "annonce sans type de serveur (nil): on la montre")
verifier("sans_choix_ok_normal", "true", "sans choix de ma part, on ne filtre pas")
verifier("filtre_coupe_ok_pvp", "true", "option coupée: on montre tout")
verifier("message_ruleset", "rp_pvp", "le type de serveur est dans le message publié")
verifier("message_version", "1.5.3", "la version de l'addon est à la fin du message publié")
verifier("ruleset_alice", "pvp", "type reçu")
verifier("ruleset_bob", "", "type inventé refusé")
verifier("ruleset_carl", "", "ancienne version sans type")
verifier("ruleset_guilde", "rp", "type de serveur d'une guilde")
verifier("export_ruleset", "rp_pvp", "type de serveur dans le code d'export")

print(f"Addon testé: {ADDON}")
if echecs:
    print("\n".join("ÉCHEC: " + e for e in echecs))
    sys.exit(1)
print("Règles de l'addon: OK")
