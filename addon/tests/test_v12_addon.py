"""Nouveautés 1.2.0 de l'addon Babillard Forever FR, exécutées dans un vrai Lua 5.1 avec une FAUSSE API du jeu:
  - lecture des annonces du chat (analyse, filtres, annonce de l'addon qui prime, limite);
  - publication dans le chat (canal, limite d'une par minute, texte relisible);
  - avis de nouvelle version; alertes par activités favorites;
  - mise à jour automatique du groupe (joueurs, rôles manquants, renvoi limité).

    python3 addon/tests/test_v12_addon.py     (nécessite lupa)

Ça vérifie la logique, pas le comportement réel de Forever (noms de canaux, rôles assignés, envoi dans le chat).
"""
import os
import sys

from lupa.lua51 import LuaRuntime

ICI = os.path.dirname(os.path.abspath(__file__))
ADDON = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else os.path.join(ICI, "..", "BabillardForeverFR")).replace("\\", "/")

lua = LuaRuntime(unpack_returned_tuples=True)
RESULTAT = lua.execute(r"""
local ADDON_DIR = ...
local echecs = {}
local function verifier(ok, message) if not ok then echecs[#echecs + 1] = message end end
local function egal(obtenu, attendu, message)
  if obtenu ~= attendu then echecs[#echecs + 1] = message .. ": obtenu " .. tostring(obtenu) .. ", attendu " .. tostring(attendu) end
end

-- ---------- fausse API ----------
local U = {}
setmetatable(U, { __index = function() return U end, __call = function() return U end })
setmetatable(_G, { __index = function() return U end })
StaticPopupDialogs, SlashCmdList = {}, {}
local minuteries = {}
C_Timer = { After = function(delai, f) minuteries[#minuteries + 1] = { delai = delai, f = f } end, NewTicker = function() end }
strtrim = function(s) return (s:gsub("^%s+", ""):gsub("%s+$", "")) end
strsplit = function(sep, s)
  local t = {}
  for p in (s .. sep):gmatch("(.-)" .. sep:gsub("%-", "%%-")) do t[#t + 1] = p end
  return unpack(t)
end
tinsert = table.insert
CopyTable = function(t) local c = {}; for k, v in pairs(t) do c[k] = type(v) == "table" and CopyTable(v) or v end; return c end
time = function() return 1790000000 end
local horloge = 1000
GetTime = function() return horloge end
issecretvalue = function(v) return v == "SECRET" end
InCombatLockdown = function() return false end
IsInInstance = function() return false end
local enGroupe, enRaid = false, false
IsInGroup = function() return enGroupe end
IsInRaid = function() return enRaid end
wipe = function(t) for k in pairs(t) do t[k] = nil end end
local ouvertCh = {}
ChatFrame_OpenChat = function(texte) ouvertCh[#ouvertCh + 1] = texte end
local membres = 1
GetNumGroupMembers = function() return membres end
local roles = {}                                   -- [unité] = rôle assigné
UnitExists = function(u)
  if u == "player" then return true end
  local p = u:match("^party(%d)$")
  if p then return tonumber(p) < membres end
  local r = u:match("^raid(%d+)$")
  if r then return tonumber(r) <= membres end
  return false
end
local noms = {}
local niveau = 20
UnitGroupRolesAssigned = function(u) return roles[u] or "NONE" end
UnitName = function(u) return noms[u] or "Barrbiche" end
UnitFullName = function() return "Barrbiche", "Forever Realm" end
GetNormalizedRealmName = function() return "ForeverRealm" end
UnitClass = function() return "Voleur", "ROGUE" end
UnitRace = function() return "Orc" end
UnitLevel = function() return niveau end
UnitFactionGroup = function() return "Horde" end
GetGuildInfo = function() return nil end
GetCurrentRegionName = function() return "EU" end
rawset(_G, "GetAverageItemLevel", false)
rawset(_G, "C_ClassColor", false)
RAID_CLASS_COLORS = {}
rawset(_G, "RaidNotice_AddMessage", false)
rawset(_G, "SOUNDKIT", false)
rawset(_G, "GetProfessions", false)
Ambiguate = function(nom) return (nom:gsub("%-.*$", "")) end
GetChannelName = function() return 5 end
local canaux = { 1, "1. Général - Elwynn", false, 2, "2. Recherche de groupe", false, 5, "BabillardFR", false }
GetChannelList = function() return unpack(canaux) end
local ENVOYES, CHAT = {}, {}
local resEnvoi = 0   -- ce que SendAddonMessage répond (0 = succès, 3 = limite de débit)
C_ChatInfo = { RegisterAddonMessagePrefix = function() end,
               SendAddonMessage = function(prefixe, msg) if resEnvoi == 0 then ENVOYES[#ENVOYES + 1] = msg end; return resEnvoi end }
SendChatMessage = function(texte, type_, langue, cible) CHAT[#CHAT + 1] = { texte = texte, type = type_, cible = cible } end
local cadre
CreateFrame = function()
  local o = { SetScript = function(self, nom, f) if nom == "OnEvent" then cadre = f end end }
  return setmetatable(o, { __index = function() return function() return U end end })
end
local imprimes = {}
print = function(...) imprimes[#imprimes + 1] = table.concat({ ... }, " ") end
local function nbImprimes(motif)
  local n = 0
  for _, l in ipairs(imprimes) do if l:find(motif, 1, true) then n = n + 1 end end
  return n
end

local ns = {}
for _, f in ipairs({ "Data.lua", "Chat.lua", "Core.lua" }) do assert(loadfile(ADDON_DIR .. "/" .. f))("BabillardForeverFR", ns) end
rawset(_G, "BabillardForeverFRDB", {})   -- sinon le faux global répondrait « n'importe quoi » à la place d'une table vide
cadre(nil, "ADDON_LOADED", "BabillardForeverFR")

ns.db.ruleset = "pvp"   -- publier exige d'avoir choisi son type de serveur
local ouvertures = {}
ns.UI = { Open = function(vue) ouvertures[#ouvertures + 1] = vue end }

local function compter(t) local n = 0; for _ in pairs(t) do n = n + 1 end; return n end
local function recevoir(msg, exp) cadre(nil, "CHAT_MSG_ADDON", "BabillardFR", msg, "CHANNEL", exp) end
local function chat(texte, exp, canal, base)
  cadre(nil, "CHAT_MSG_CHANNEL", texte, exp, "", canal or "2. Recherche de groupe", "", "", 0, 2, base or "LookingForGroup")
end
local function vider() for k in pairs(ns.listings) do ns.listings[k] = nil end end
local function avancer(s) horloge = horloge + s end
local function lancerMinuteries()
  local liste = minuteries
  minuteries = {}
  for _, m in ipairs(liste) do m.f() end
end

-- ---------- 1. Analyse des messages du chat ----------
local function analyse(texte) return ns.ParseChat(texte) end
local function roleSet(p) local t = {}; for k in pairs(p.roles) do t[#t + 1] = k end; table.sort(t); return table.concat(t, ",") end

local p = analyse("LFM RFC need tank and heal")
verifier(p and p.type == "LFM" and p.akey == "RFC" and roleSet(p) == "HEAL,TANK", "LFM RFC tank heal")
p = analyse("LFM Mortemines tank heal svp")
verifier(p and p.type == "LFM" and p.akey == "VC", "LFM Mortemines -> VC")
p = analyse("LFM SM cath 2 dps")
verifier(p and p.akey == "SMCATH" and roleSet(p) == "DPS", "SM cath")
p = analyse("LF2M DM east tank")
verifier(p and p.type == "LFM" and p.akey == "DME", "DM east doit gagner sur DM")
p = analyse("LFG Mortemines dps niv 20")
verifier(p and p.type == "LFG" and p.akey == "VC" and p.level == 20, "LFG Mortemines niv 20")
p = analyse("Cherche un groupe pour les Mortemines niv 20")
verifier(p and p.type == "LFG" and p.akey == "VC" and p.level == 20, "cherche un groupe français")
p = analyse("lfm Hache-Tripes Est healer")
verifier(p and p.akey == "DME", "nom français avec tiret et accents")
p = analyse("LFM Monastère écarlate : Cathédrale tank")
verifier(p and p.akey == "SMCATH", "nom complet avec accents")
verifier(analyse("WTS Linen Cloth") == nil, "vente ignorée")
verifier(analyse("LFM RFC tank WTS boost") == nil, "spam ignoré")
verifier(analyse("bonjour tout le monde") == nil, "bavardage ignoré")
verifier(analyse("Recrute pour la guilde, LFM raids") == nil, "recrutement ignoré")
verifier(analyse("LFM guilde pvp") == nil or analyse("LFM guilde pvp").akey ~= nil, "annonce de guilde sans activité")
verifier(analyse(string.rep("LFM RFC ", 100)) == nil, "message trop long ignoré")
verifier(analyse(42) == nil and analyse(nil) == nil, "types invalides")
-- « st » seul est le Temple englouti, mais pas dans un mot
verifier(analyse("LFM stuff pour la guilde tank") == nil or analyse("LFM stuff pour la guilde tank").akey ~= "ST", "st dans un mot")

-- ---------- 2. Texte publié dans le chat: relisible par le même analyseur ----------
local t1 = ns.ChatText({ type = "LFM", akey = "WC", roles = { TANK = true, HEAL = true }, note = "QC vocal" })
local r1 = ns.ParseChat(t1)
verifier(r1 and r1.type == "LFM" and r1.akey == "WC" and roleSet(r1) == "HEAL,TANK", "relecture LFM: " .. t1)
verifier(t1:find("Babillard", 1, true) == nil, "pas de tag par défaut")
local t1b = ns.ChatText({ type = "LFM", akey = "WC", roles = { TANK = true }, note = "" }, true)
verifier(t1b:find("%[Babillard FR%]$") ~= nil and ns.ParseChat(t1b).akey == "WC", "tag seulement si demandé, texte toujours relisible")
local t2 = ns.ChatText({ type = "LFG", akey = "SFK", roles = { DPS = true }, note = "", level = 22 })
local r2 = ns.ParseChat(t2)
verifier(r2 and r2.type == "LFG" and r2.akey == "SFK" and r2.level == 22, "relecture LFG: " .. t2)
verifier(#ns.ChatText({ type = "LFM", akey = "WC", roles = { TANK = true }, note = string.rep("x", 400) }) <= 250, "texte limité à 250")

-- ---------- 3. Lecture du chat -> babillard ----------
chat("LFM WC need tank and heal", "Alice-ForeverRealm")
local a = ns.listings["Alice-ForeverRealm"]
verifier(a ~= nil, "annonce du chat ajoutée")
if a then
  egal(a.source, "chat", "source chat")
  egal(a.akey, "WC", "activité du chat")
  egal(a.type, "LFM", "type du chat")
  verifier(a.roles.TANK and a.roles.HEAL and not a.roles.DPS, "rôles du chat")
  egal(a.faction, "Horde", "faction supposée la mienne")
  egal(a.level, 0, "niveau inconnu")
end
chat("LFM Mortemines tank niv 19", "Bob")                             -- sans royaume
verifier(ns.listings["Bob-ForeverRealm"] ~= nil, "royaume ajouté au nom sans royaume")
-- L'addon ne sert qu'à former des groupes: « je cherche un groupe » est ignoré (chat et addon)
chat("Cherche groupe Mortemines niv 19", "Cleo")
chat("LFG Mortemines dps", "Cleo")
recevoir("L2;LFG;Donjons;VC;D;MAGE;20;Horde;5;1;0;;normal;1.2.0", "Cleo-ForeverRealm")
verifier(ns.listings["Cleo-ForeverRealm"] == nil and ns.listings["Cleo"] == nil, "les « je cherche un groupe » sont ignorés")
chat("LFM RFC tank", "Gardien-ForeverRealm", "3. Défense locale", "LocalDefense")
verifier(ns.listings["Gardien-ForeverRealm"] == nil, "défense locale ignorée")
chat("LFM RFC tank", "Barrbiche-ForeverRealm")
verifier(ns.listings["Barrbiche-ForeverRealm"] == nil, "mes propres messages ignorés")
chat("SECRET", "Eve-ForeverRealm")
chat("LFM WC tank", "SECRET")
verifier(ns.listings["Eve-ForeverRealm"] == nil and compter(ns.listings) == 2, "valeurs secrètes ignorées")  -- Alice + Bob
chat("bonjour", "Fred-ForeverRealm")
verifier(ns.listings["Fred-ForeverRealm"] == nil, "bavardage ignoré")
chat("LFM |cffffffff|Hitem:1:2|h[Épée]|h|r WC tank", "Gus-ForeverRealm")
verifier(ns.listings["Gus-ForeverRealm"] and not ns.listings["Gus-ForeverRealm"].note:find("|", 1, true), "liens du jeu nettoyés")
verifier(ns.listings["Gus-ForeverRealm"].note:find(";", 1, true) == nil, "pas de point-virgule dans la note")
ns.db.opts.chatReading = false
chat("LFM WC tank", "Hans-ForeverRealm")
verifier(ns.listings["Hans-ForeverRealm"] == nil, "lecture du chat coupée")
ns.db.opts.chatReading = true

-- L'annonce de l'addon (plus fiable) remplace celle du chat, et le chat ne la remplace jamais
recevoir("L2;LFM;Donjons;VC;T;WARRIOR;20;Horde;5;2;0;note;normal;1.2.0", "Alice-ForeverRealm")
local al = ns.listings["Alice-ForeverRealm"]
verifier(al and al.source == nil and al.akey == "VC", "l'annonce de l'addon remplace celle du chat")
chat("LFM WC tank", "Alice")                                          -- le chat écrit le nom sans royaume
verifier(ns.listings["Alice-ForeverRealm"].akey == "VC" and ns.listings["Alice"] == nil, "le chat ne remplace pas l'addon")
chat("LFM SFK heal", "Bob-ForeverRealm")
recevoir("L2;LFG;Donjons;SFK;D;MAGE;21;Horde;5;1;0;;normal;1.2.0", "Bob-OtreRoyaume")   -- royaume écrit autrement
local nbBob = 0
for _, l in pairs(ns.listings) do if ns.ShortName(l.sender) == "Bob" then nbBob = nbBob + 1 end end
egal(nbBob, 1, "un seul Bob après l'annonce de l'addon")

-- Limite de mémoire
vider()
for i = 1, ns.CHAT_MAX + 40 do
  avancer(1)
  chat("LFM WC tank", "Joueur" .. i .. "-ForeverRealm")
end
ns.Prune()
local nChat = 0
for _, l in pairs(ns.listings) do if l.source == "chat" then nChat = nChat + 1 end end
egal(nChat, ns.CHAT_MAX, "annonces du chat limitées")
verifier(ns.listings["Joueur" .. (ns.CHAT_MAX + 40) .. "-ForeverRealm"] ~= nil, "les plus récentes sont gardées")
verifier(ns.listings["Joueur1-ForeverRealm"] == nil, "les plus anciennes partent")
-- Expiration comme les autres
avancer(ns.EXPIRE + 10)
ns.Prune()
egal(compter(ns.listings), 0, "les annonces du chat expirent")

-- ---------- 3b. Mon annonce ne doit jamais revenir en double (capture d'écran en jeu: « Barrbiche-Dote » et « Barrbiche Dote ») ----------
vider()
for _, forme in ipairs({ "Barrbiche-Dote", "Barrbiche Dote", "Barrbiche", "barrbiche-ForeverRealm", "Barrbiche-Dote Realm" }) do
  verifier(ns.IsMe(forme), "IsMe doit reconnaître: " .. forme)
  recevoir("L2;LFM;Donjons;VC;T;ROGUE;20;Horde;5;1;0;;normal;1.2.2", forme)
  chat("LFM VC tank", forme)
end
egal(compter(ns.listings), 0, "mes propres annonces reçues sous toutes les formes de nom sont ignorées")
verifier(not ns.IsMe("Barrbiche2-Dote") and not ns.IsMe("Alice-Dote") and not ns.IsMe(nil), "IsMe ne confond pas les autres joueurs")
egal(ns.ShortName("Alice Dote"), "Alice", "ShortName garde seulement le nom")
egal(ns.WhisperName("Alice Dote"), "Alice-Dote", "chuchoter à « Nom Royaume » devient Nom-Royaume")
egal(ns.WhisperName("Alice-Dote"), "Alice-Dote", "Nom-Royaume inchangé")
-- Même joueur étranger, royaume écrit de deux façons, l'annonce de l'addon remplace celle du chat
chat("LFM WC tank", "Zed Dote")
recevoir("L2;LFM;Donjons;VC;T;ROGUE;20;Horde;5;1;0;;normal;1.2.2", "Zed-Dote")
local nbZed = 0
for _, l in pairs(ns.listings) do if ns.BareName(l.sender) == "zed" then nbZed = nbZed + 1 end end
egal(nbZed, 1, "un seul Zed après l'annonce de l'addon")
vider()

-- ---------- 3c. Publier exige le type de serveur (PvE / PvP / RP / RP-PvP) ----------
do
  ns.db.ruleset = nil
  vider(); avancer(100)
  local avant = #ENVOYES
  local ok = ns.PublishListing({ type = "LFM", akey = "WC", roles = { TANK = true }, note = "" })
  verifier(ok == false and #ENVOYES == avant and ns.my == nil, "sans type de serveur: rien n'est publié")
  egal(ouvertures[#ouvertures], 3, "l'onglet Mon perso s'ouvre pour choisir le type de serveur")
  verifier(nbImprimes("choisis d'abord ton type de serveur") >= 1, "message clair")
  verifier(ns.PublishGuild("PVE", "") == false and #ENVOYES == avant, "annonce de guilde aussi bloquée")
  ns.db.ruleset = "pvp"
  avancer(10)
  verifier(ns.PublishListing({ type = "LFM", akey = "WC", roles = { TANK = true }, note = "" }) == true, "avec un type de serveur: publié")
  verifier(ENVOYES[#ENVOYES]:find(";pvp;", 1, true) ~= nil, "l'annonce porte l'étiquette pvp")
  ns.WithdrawListing(); vider()
end

-- ---------- 3d. Places par rôle (raids, PvP) ----------
egal(ns.EncodeCounts({ TANK = 2, HEAL = 8, DPS = 25 }), "T2H8D25", "encodage des places")
local dc = ns.DecodeCounts("T2H8D25")
verifier(dc.TANK == 2 and dc.HEAL == 8 and dc.DPS == 25, "décodage des places")
local mauvais = ns.DecodeCounts("T0H99X5Z;;D")
verifier(next(mauvais) == nil, "places invalides ignorées (0, plus de 40, lettre inconnue)")
egal(ns.EncodeCounts({ TANK = 400 }), "T40", "places limitées à 40")
egal(ns.EncodeCounts({ TANK = 0, HEAL = -1 }), "", "zéro place = rien à envoyer")
egal(ns.RolesText({ TANK = true, DPS = true }, { TANK = 2, DPS = 1 }), "Tank ×2, DPS", "texte des rôles avec places")
recevoir("L2;LFM;Raids;ONY;THD;WARRIOR;60;Horde;40;3;0;;pvp;1.2.5;T2H8D25", "Raid-ForeverRealm")
local rl = ns.listings["Raid-ForeverRealm"]
verifier(rl and rl.counts.TANK == 2 and rl.counts.HEAL == 8 and rl.counts.DPS == 25, "places lues dans l'annonce d'un autre joueur")
recevoir("L2;LFM;Donjons;VC;T;WARRIOR;20;Horde;5;1;0;;pvp;1.2.5", "Ancien-ForeverRealm")
verifier(ns.listings["Ancien-ForeverRealm"] and next(ns.listings["Ancien-ForeverRealm"].counts) == nil, "annonce sans places (ancienne version) lue sans erreur")
vider(); ns.my = nil
-- Publier un raid avec places, puis le décompte avec les rôles assignés du raid
niveau = 60
avancer(100); membres = 1
ns.PublishListing({ type = "LFM", akey = "ONY", roles = { TANK = true, HEAL = true, DPS = true }, counts = { TANK = 2, HEAL = 8, DPS = 25 }, note = "" })
verifier(ns.my ~= nil, "raid publié")
verifier(ENVOYES[#ENVOYES]:match(";([^;]*)$") == "T2H8D25", "les places sont dans le message")
verifier(ns.ChatText(ns.my):find("Tank x2", 1, true) and ns.ParseChat(ns.ChatText(ns.my)).akey == "ONY", "texte du chat avec places, toujours relisible")
enRaid, enGroupe, membres = true, true, 12
roles = {}
for i = 1, 12 do roles["raid" .. i] = (i <= 2) and "TANK" or ((i <= 5) and "HEALER" or "DAMAGER") end
minuteries = {}
cadre(nil, "GROUP_ROSTER_UPDATE")
egal(ns.EncodeCounts(ns.my.counts), "T0H5D18" == "x" and "" or "H5D18", "places restantes après 2 tanks, 3 heals, 7 dps")
verifier(ns.my.roles.TANK == nil and ns.my.roles.HEAL and ns.my.roles.DPS, "le rôle tank n'est plus cherché")
egal(ns.EncodeCounts(ns.my.baseCounts), "T2H8D25", "places de départ intactes")
egal(ns.my.groupCount, 12, "nombre de joueurs du raid")
lancerMinuteries()
verifier(ENVOYES[#ENVOYES]:match(";([^;]*)$") == "H5D18", "le renvoi contient les places restantes")
avancer(100)
ns.Republish()
egal(ns.EncodeCounts(ns.my.counts), "T2H8D25", "republier repart des places demandées")
enRaid, enGroupe, membres, roles = false, false, 1, {}
niveau = 20
ns.my = nil; vider()

-- ---------- 3e. Message de chuchotement ----------
ns.db.myRoles = { DPS = true }
local wc = { akey = "WC", roles = { TANK = true, DPS = true } }
local w1 = ns.WhisperText(wc)
verifier(w1:find("voleur niv 20", 1, true) and w1:find("je peux faire DPS", 1, true) and w1:find("Lamentations", 1, true), "présentation avec classe, niveau, rôle commun: " .. tostring(w1))
local w2 = ns.WhisperText({ akey = "WC", roles = { TANK = true } })
verifier(w2 and not w2:find("je peux faire", 1, true), "sans rôle en commun, pas de rôle annoncé: " .. tostring(w2))
verifier(ns.WhisperText({ akey = "n'existe pas", roles = {} }) == nil and ns.WhisperText(nil) == nil, "sans activité connue, pas de message")
verifier(#w1 <= 250, "message court")

-- ---------- 3f. Demandes envoyées ----------
vider()
ns.RecordRequest({ akey = "WC", sender = "Chef-ForeverRealm" })
verifier(ns.HasRequest("Chef Dote") and ns.HasRequest("chef"), "demande retrouvée quelle que soit l'écriture du nom")
verifier(not ns.HasRequest("Autre-Dote"), "pas de demande pour un autre joueur")
enGroupe, membres, noms.party1 = true, 2, "Chef"
ns.UpdateRequests()
verifier(not ns.HasRequest("Chef"), "demande réglée quand j'entre dans son groupe")
enGroupe, membres, noms.party1 = false, 1, nil
ns.RecordRequest({ akey = "WC", sender = "Lent-ForeverRealm" })
avancer(700)
verifier(not ns.HasRequest("Lent"), "demande périmée après 10 minutes")
ns.Prune()
verifier(next(ns.requests) == nil, "les demandes périmées sont nettoyées")

-- ---------- 3g. Joueurs ignorés ----------
vider()
recevoir("L2;LFM;Donjons;VC;T;WARRIOR;20;Horde;5;1;0;;pvp;1.2.5", "Spam-ForeverRealm")
chat("LFM WC tank", "Spam2-ForeverRealm")
verifier(ns.listings["Spam-ForeverRealm"] and ns.listings["Spam2-ForeverRealm"], "annonces reçues avant d'ignorer")
ns.Ignore("Spam-ForeverRealm")
ns.Ignore("Spam2 Dote")
verifier(ns.listings["Spam-ForeverRealm"] == nil and ns.listings["Spam2-ForeverRealm"] == nil, "ignorer retire les annonces déjà reçues")
recevoir("L2;LFM;Donjons;VC;T;WARRIOR;20;Horde;5;1;0;;pvp;1.2.5", "Spam-ForeverRealm")
chat("LFM WC tank", "Spam2-AutreRoyaume")
verifier(next(ns.listings) == nil, "les nouvelles annonces d'un joueur ignoré sont refusées (même écrites autrement)")
verifier(ns.IsIgnored("SPAM") and not ns.IsIgnored("Spamlike"), "ignoré = même nom de personnage seulement")
ns.Ignore("Barrbiche-Dote")
verifier(not ns.IsIgnored("Barrbiche"), "on ne peut pas s'ignorer soi-même")
ns.Unignore("Spam")
recevoir("L2;LFM;Donjons;VC;T;WARRIOR;20;Horde;5;1;0;;pvp;1.2.5", "Spam-ForeverRealm")
verifier(ns.listings["Spam-ForeverRealm"] ~= nil, "retirer un joueur de la liste le fait revenir")
ns.db.ignored = {}
vider()

-- ---------- 3h. Arbre principal des talents ----------
egal(ns.MainTalentTab({ { name = "A", points = 5 }, { name = "B", points = 31 }, { name = "C", points = 15 } }), 2, "l'arbre avec le plus de points")
egal(ns.MainTalentTab({ { name = "A", points = 0 }, { name = "B", points = 0 } }), nil, "aucun point = pas de spécialisation")
egal(ns.MainTalentTab({ { name = "A", points = 10 }, { name = "B", points = 10 } }), 1, "égalité: le premier arbre")
egal(ns.MainTalentTab(nil), nil, "pas d'arbres")

-- ---------- 4. Avis de nouvelle version ----------
egal(ns.VersionNumber("1.2.0"), 1002000, "numéro de version")
verifier(ns.VersionNumber("1.2") == nil and ns.VersionNumber("a.b.c") == nil and ns.VersionNumber("1.2.0;x") == nil
  and ns.VersionNumber(nil) == nil and ns.VersionNumber("1.2.99999") == nil, "versions invalides refusées")
recevoir("L2;LFM;Donjons;WC;T;WARRIOR;20;Horde;5;1;0;;normal;1.1.0", "Vieux-ForeverRealm")
recevoir("L2;LFM;Donjons;WC;T;WARRIOR;20;Horde;5;1;0;;normal;1.6.2", "Pareil-ForeverRealm")
recevoir("L2;LFM;Donjons;WC;T;WARRIOR;20;Horde;5;1;0;;normal;pirate", "Faux-ForeverRealm")
recevoir("L2;LFM;Donjons;WC;T;WARRIOR;20;Horde;5;1;0;;normal", "SansVersion-ForeverRealm")
egal(ns.newVersion, nil, "pas d'avis pour une version égale, ancienne ou invalide")
recevoir("L2;LFM;Donjons;WC;T;WARRIOR;20;Horde;5;1;0;;normal;1.6.3", "Neuf-ForeverRealm")
egal(ns.newVersion, "1.6.3", "avis pour une version plus récente")
egal(ns.db.newestSeen, 1006003, "version vue sauvegardée")
recevoir("G2;Les Pas Fins;PVE;Horde;ROGUE;60;0;note;normal;1.6.3", "Neuf2-ForeverRealm")
recevoir("H2;20;MAGE;1.6.3", "Neuf3-ForeverRealm")
egal(nbImprimes("nouvelle version"), 1, "l'avis n'est dit qu'une fois par version")
recevoir("H2;20;MAGE;1.7.0", "Neuf4-ForeverRealm")
egal(ns.newVersion, "1.7.0", "une version encore plus récente remplace l'avis")
egal(nbImprimes("nouvelle version"), 2, "un nouvel avis pour 1.7.0")

-- Mon message contient ma version (L2 et G2)
ns.db.opts.autoRemove = false
vider()
avancer(100)
ns.PublishListing({ type = "LFM", akey = "WC", roles = { TANK = true, HEAL = true, DPS = true }, note = "essai" })
egal(ENVOYES[#ENVOYES]:match(";([^;]*)$"), "1.6.2", "L2 publié termine par la version")
verifier(#CHAT == 0, "publier ne parle jamais dans le chat tout seul")

-- ---------- 5. Alertes par activités favorites ----------
local function alertes() return nbImprimes("cherche un dps pour") + nbImprimes("cherche un tank") end
local function alerte(akey, opts, favs, source)
  avancer(30)
  vider()
  ns.db.opts.favsOnly = opts.favsOnly or false
  ns.db.opts.alertChat = opts.alertChat or false
  ns.db.favs = favs or {}
  local avant = nbImprimes("pour")
  if source == "chat" then chat("LFM " .. akey .. " dps", "Alerte-ForeverRealm")
  else recevoir("L2;LFM;Donjons;" .. akey .. ";D;MAGE;20;Horde;5;1;0;;pvp;1.2.0", "Alerte-ForeverRealm") end
  return nbImprimes("pour") > avant
end
ns.db.myRoles = { DPS = true }
verifier(alerte("WC", {}, {}), "alerte normale (aucun favori)")
verifier(not alerte("WC", { favsOnly = true }, { SFK = true }), "favoris seulement: WC n'est pas un favori")
verifier(alerte("SFK", { favsOnly = true }, { SFK = true }), "favoris seulement: SFK est un favori")
verifier(alerte("WC", { favsOnly = true }, {}), "favoris seulement mais aucun choisi: tout alerte")
verifier(not alerte("WC", {}, {}, "chat"), "pas d'alerte pour le chat par défaut")
verifier(alerte("WC", { alertChat = true }, {}, "chat"), "alerte pour le chat si demandée")
verifier(not alerte("WC", { alertChat = true, favsOnly = true }, { SFK = true }, "chat"), "favoris aussi pour le chat")
ns.db.opts.favsOnly, ns.db.opts.alertChat, ns.db.favs = false, false, {}

-- ---------- 6. Publication dans le chat ----------
vider()
avancer(100)
ns.PublishListing({ type = "LFM", akey = "WC", roles = { TANK = true, HEAL = true }, note = "QC" })
verifier(ns.PostToChat(ns.my) == true, "publication dans le chat")
egal(#CHAT, 1, "un message envoyé dans le chat")
if CHAT[1] then
  egal(CHAT[1].type, "CHANNEL", "type de message de chat")
  egal(CHAT[1].cible, 2, "canal Recherche de groupe préféré à Général")
  local r = ns.ParseChat(CHAT[1].texte)
  verifier(r and r.akey == "WC" and r.type == "LFM", "le texte envoyé se relit")
end
verifier(not CHAT[1].texte:find("Babillard", 1, true), "annonce du chat sans tag par défaut")
verifier(ns.PostToChat(ns.my) == false and #CHAT == 1, "pas deux publications en moins d'une minute")
avancer(ns.CHAT_POST_GAP + 1)
ns.db.opts.chatTag = true
verifier(ns.PostToChat(ns.my) == true and #CHAT == 2, "de nouveau possible après une minute")
verifier(CHAT[2].texte:find("%[Babillard FR%]$") ~= nil, "tag ajouté quand l'option est activée")
ns.db.opts.chatTag = false
canaux = { 1, "1. Général - Elwynn", false, 5, "BabillardFR", false }
avancer(ns.CHAT_POST_GAP + 1)
verifier(ns.PostToChat(ns.my) and CHAT[#CHAT].cible == 1, "à défaut, le canal Général")
canaux = { 5, "BabillardFR", false }
avancer(ns.CHAT_POST_GAP + 1)
verifier(ns.PostToChat(ns.my) == false and #CHAT == 3, "aucun canal: rien d'envoyé, pas d'erreur")
canaux = { 2, "2. Recherche de groupe", true }
verifier(ns.PostToChat(ns.my) == false, "canal désactivé ignoré")
verifier(ns.PostToChat(nil) ~= nil, "sans annonce active, pas d'erreur")

-- ---------- 7. Mise à jour automatique du groupe ----------
vider()
ns.db.opts.autoRemove = true
ns.db.opts.autoUpdate = true
avancer(100)
membres = 1
ns.PublishListing({ type = "LFM", akey = "WC", roles = { TANK = true, HEAL = true, DPS = true }, note = "" })
minuteries = {}
local avantEnvoi = #ENVOYES
membres = 3
roles = { player = "TANK", party1 = "HEALER" }
cadre(nil, "GROUP_ROSTER_UPDATE")
egal(ns.my.groupCount, 3, "nombre de joueurs mis à jour")
egal(ns.EncodeRoles(ns.my.roles), "D", "tank et soigneur trouvés: il reste DPS")
egal(ns.EncodeRoles(ns.my.baseRoles), "THD", "rôles de départ conservés")
verifier(ns.my.baseRoles.TANK and ns.my.baseRoles.HEAL and ns.my.baseRoles.DPS, "rôles de départ intacts")
egal(#ENVOYES, avantEnvoi, "pas de renvoi immédiat (on attend un peu)")
egal(#minuteries, 1, "un renvoi est programmé")
membres = 4
cadre(nil, "GROUP_ROSTER_UPDATE")
egal(#minuteries, 1, "un seul renvoi programmé même si le groupe change encore")
lancerMinuteries()
egal(#ENVOYES, avantEnvoi + 1, "un message envoyé après l'attente")
local dernier = ENVOYES[#ENVOYES]
verifier(dernier:find("^L2;LFM;Donjons;WC;D;ROGUE;20;Horde;5;4;") ~= nil, "le renvoi contient 4 joueurs et seulement DPS: " .. dernier)
-- Sans rôle assigné par le jeu: on garde ce que le joueur a demandé
roles = {}
membres = 2
cadre(nil, "GROUP_ROSTER_UPDATE")
egal(ns.EncodeRoles(ns.my.roles), "THD", "sans rôle assigné: rôles demandés conservés")
egal(ns.my.groupCount, 2, "le nombre baisse aussi quand quelqu'un part")
lancerMinuteries()
-- Republier repart des rôles demandés, pas des rôles réduits
roles = { player = "TANK" }
cadre(nil, "GROUP_ROSTER_UPDATE")
lancerMinuteries()
avancer(100)
ns.Republish()
verifier(ns.my.baseRoles.TANK and ns.my.baseRoles.HEAL and ns.my.baseRoles.DPS, "Republier garde les rôles demandés au départ")
-- Un groupe qui n'attendait qu'un tank et l'a trouvé: l'annonce reste valide
vider(); ns.my = nil
avancer(100)
membres = 1
ns.PublishListing({ type = "LFM", akey = "WC", roles = { TANK = true }, note = "" })
roles = { player = "TANK" }
membres = 2
cadre(nil, "GROUP_ROSTER_UPDATE")
egal(ns.EncodeRoles(ns.my.roles), "T", "jamais d'annonce sans rôle")
-- Option coupée
ns.db.opts.autoUpdate = false
membres = 3
cadre(nil, "GROUP_ROSTER_UPDATE")
verifier(ns.my.groupCount ~= 3, "option coupée: nombre inchangé")
ns.db.opts.autoUpdate = true
-- Groupe complet: l'annonce est retirée, sans erreur du renvoi programmé
membres = 5
cadre(nil, "GROUP_ROSTER_UPDATE")
lancerMinuteries()
verifier(ns.my == nil, "groupe complet: annonce retirée")
-- Mode « je cherche un groupe »: rien à mettre à jour
vider()
avancer(100)
membres = 1
ns.PublishListing({ type = "LFG", akey = "WC", roles = { DPS = true }, note = "" })
egal(ns.my and ns.my.type, "LFM", "même si on demande « LFG », l'annonce publiée est toujours un groupe qui cherche")
verifier(ENVOYES[#ENVOYES]:find("^L2;LFM;") ~= nil, "le message envoyé est un LFM")

-- ---------- Compteurs de messages (/bf diag) ----------
do
  local e0, r0, m0 = ns.stats.sent, ns.stats.received, ns.stats.echo
  ns.Send("H2;20;MAGE;1.6.0")
  egal(ns.stats.sent - e0, 1, "un envoi réussi est compté")
  recevoir("H2;20;MAGE;1.6.0", "Barrbiche-ForeverRealm")
  egal(ns.stats.received - r0, 1, "un message reçu est compté")
  egal(ns.stats.echo - m0, 1, "mon propre message qui revient est compté comme écho")
  recevoir("H2;20;MAGE;1.6.0", "Autre-ForeverRealm")
  egal(ns.stats.echo - m0, 1, "le message d'un autre joueur n'est pas un écho")
  local refuses = ns.stats.refused
  resEnvoi = 3
  ns.Send("H2;20;MAGE;1.6.0")
  egal(ns.stats.refused - refuses, 1, "un envoi refusé est compté")
  egal(ns.stats.lastCode, "3", "le code de refus est gardé")
  resEnvoi = 0
end

-- ---------- Un seul canal caché pour tous les serveurs ----------
do
  egal(ns.ChannelName(), "BabillardFR", "le canal est le même pour tous les serveurs")
  local joints, quittes = {}, {}
  local vraiJoin, vraiLeave, vraiGCN = JoinChannelByName, LeaveChannelByName, GetChannelName
  JoinChannelByName = function(n) joints[#joints + 1] = n end
  LeaveChannelByName = function(n) quittes[#quittes + 1] = n end
  -- Pas encore dans le canal: l'addon rejoint le canal partagé
  GetChannelName = function() return 0 end
  ns.EnsureChannel()
  egal(joints[1], "BabillardFR", "il rejoint le canal partagé")
  egal(#joints, 1, "une seule jonction")
  -- Resté dans le canal par serveur des versions 1.6.0 et 1.6.1: il le quitte, pas le canal partagé
  GetChannelName = function(n) return 5 end
  ns.LeaveRealmChannel()
  egal(quittes[1], "BabillardFRForeverRealm", "il quitte le canal par serveur de la 1.6.0")
  egal(#quittes, 1, "il ne quitte que celui-là")
  -- Pas dans le canal par serveur: rien à quitter
  GetChannelName = function(n) if n == "BabillardFRForeverRealm" then return 0 end return 5 end
  quittes = {}
  ns.LeaveRealmChannel()
  egal(#quittes, 0, "pas dans le canal par serveur: rien à quitter")
  -- Les messages partent dans le canal partagé (numéro de ce canal)
  local messageVers
  local vraiSend = C_ChatInfo.SendAddonMessage
  GetChannelName = function(n) if n == "BabillardFR" then return 7 end return 0 end
  C_ChatInfo.SendAddonMessage = function(prefixe, msg, type_, cible) messageVers = { type_, cible } return 0 end
  ns.Send("H2;20;MAGE;1.6.2")
  egal(messageVers and messageVers[2], 7, "envoi dans le canal partagé")
  C_ChatInfo.SendAddonMessage = vraiSend
  JoinChannelByName, LeaveChannelByName, GetChannelName = vraiJoin, vraiLeave, vraiGCN
end

-- ---------- Bouton Actualiser ----------
do
  avancer(100)
  local avant = #ENVOYES
  local ok = ns.RequestAll(true)
  egal(ok, true, "actualiser: la demande part")
  egal(ENVOYES[#ENVOYES], "Q2", "la demande est un Q2")
  local ok2, attente = ns.RequestAll(true)
  egal(ok2, false, "actualiser deux fois de suite: refusé")
  verifier(attente and attente > 0 and attente <= 10, "il dit combien attendre (au plus 10 s): " .. tostring(attente))
  avancer(11)
  egal(ns.RequestAll(false), false, "la demande automatique garde ses 30 secondes")
  egal(ns.RequestAll(true), true, "après 10 secondes, le bouton peut redemander")
  egal(#ENVOYES - avant, 2, "deux demandes envoyées en tout")
  avancer(100)
  local n = #ENVOYES
  ns.RefreshListings()
  egal(#ENVOYES - n, 1, "RefreshListings envoie une demande")
  resEnvoi = 3
  avancer(100)
  local ok3, att3 = ns.RequestAll(true)
  egal(ok3, false, "envoi limité par le jeu: la demande échoue")
  egal(att3, nil, "échec d'envoi: pas de temps d'attente annoncé")
  resEnvoi = 0
end

-- ---------- Activités faisables à mon niveau ----------
do
  local rfc, wc = ns.ACT_BY_KEY.RFC, ns.ACT_BY_KEY.WC            -- RFC 13-18, WC 15-24
  verifier(ns.ActivityFits(rfc, 60) and ns.ActivityFits(rfc, 13), "un petit donjon reste faisable à un niveau plus haut")
  verifier(not ns.ActivityFits(rfc, 12), "pas faisable sous le niveau minimum")
  verifier(not ns.ActivityInRange(rfc, 60) and ns.ActivityInRange(rfc, 15), "la tranche de niveaux garde son sens (alertes, filtre)")
  local cat = rfc.cat
  local ancienNiveau = niveau
  niveau = 20
  local liste = ns.AvailableActivities(cat)
  local pos = {}
  for i, a in ipairs(liste) do pos[a.key] = i end
  verifier(pos.RFC and pos.WC, "niveau 20: le Gouffre de Ragefeu (13-18) et WC (15-24) sont dans la liste")
  verifier(pos.WC < pos.RFC, "niveau 20: ceux de ma tranche (WC) viennent avant les plus bas (RFC)")
  verifier(not pos.BRD, "niveau 20: Rochenoire (52+) n'est pas dans la liste")
  niveau = 60
  local liste60 = ns.AvailableActivities(cat)
  local n = 0
  for _, a in ipairs(ns.ACTIVITIES[cat]) do if a.min <= 60 then n = n + 1 end end
  egal(#liste60, n, "niveau 60: toutes les activités de la catégorie sont faisables")
  niveau = 12
  local sans = {}
  for _, a in ipairs(ns.AvailableActivities(cat)) do sans[a.key] = true end
  verifier(not sans.RFC, "niveau 12: pas encore le Gouffre de Ragefeu")
  niveau = ancienNiveau
end

-- ---------- Raison d'un envoi refusé ----------
resEnvoi = 3
egal(ns.Send("H2;20;MAGE;1.5.7"), false, "envoi limité par le jeu: échec")
egal(ns.lastSendFailure, "limite", "la raison est la limite de débit")
verifier(ns.SendFailureText():find("limite", 1, true) ~= nil, "le message parle de la limite, pas de la connexion")
resEnvoi = 9
egal(ns.Send("H2;20;MAGE;1.5.7"), false, "envoi refusé: échec")
egal(ns.lastSendFailure, "refus", "la raison est un refus du jeu")
resEnvoi = 0
egal(ns.Send("H2;20;MAGE;1.5.7"), true, "envoi accepté")
egal(ns.lastSendFailure, nil, "plus de raison d'échec après un succès")

-- ---------- Coupe sans casser les accents ----------
egal(ns.CutUtf8("abc", 5), "abc", "texte court: inchangé")
egal(ns.CutUtf8("abcdef", 4), "abcd", "texte ASCII coupé net")
egal(ns.CutUtf8("aé", 2), "a", "é (2 octets) ne reste pas à moitié")
egal(ns.CutUtf8("aé", 3), "aé", "é entier gardé")
egal(ns.CutUtf8("€uro", 2), "", "€ (3 octets) ne reste pas à moitié")
egal(ns.CutUtf8("é€", 4), "é", "€ coupé en deux: retiré en entier")
local long = string.rep("é", 100)
egal(#ns.CutUtf8(long, 121) % 2, 0, "toujours un nombre pair d'octets pour des é")
-- Rejet rapide du chat: un message ordinaire n'est pas une annonce, une vraie annonce passe toujours
egal(ns.ParseChat("salut tout le monde, qui sait où est le maître des gryphons?"), nil, "message ordinaire: pas une annonce")
verifier(ns.ParseChat("LFM Mortemines tank heal") ~= nil, "annonce en lfm reconnue")
verifier(ns.ParseChat("cherche un tank pour Ombrecroc") ~= nil, "annonce en « cherche » reconnue")
verifier(ns.ParseChat("BESOIN D'UN HEAL POUR LES MORTEMINES") ~= nil, "annonce en majuscules reconnue")

-- ---------- Rafraîchissement groupé (messages en rafale) ----------
do
  local n, visible = 0, true
  local vraiUI = ns.UI
  ns.UI = { IsShown = function() return visible end, Refresh = function() n = n + 1 end }
  avancer(100)
  local avant = #minuteries
  ns.RefreshSoon()
  egal(n, 1, "premier message d'une série: mise à jour tout de suite")
  ns.RefreshSoon(); ns.RefreshSoon(); ns.RefreshSoon()
  egal(n, 1, "rafale: l'interface n'est pas reconstruite à chaque message")
  egal(#minuteries - avant, 1, "rafale: une seule minuterie en attente")
  minuteries[#minuteries].f()
  egal(n, 2, "la minuterie fait une seule mise à jour pour toute la rafale")
  avancer(1)
  ns.RefreshSoon()
  egal(n, 3, "plus tard, un message remet à jour tout de suite")
  visible = false
  avancer(1)
  local avant2 = #minuteries
  ns.RefreshSoon(); ns.RefreshSoon()
  egal(n, 3, "fenêtre fermée: aucune mise à jour")
  egal(#minuteries - avant2, 0, "fenêtre fermée: aucune minuterie")
  ns.UI = vraiUI
end

return table.concat(echecs, "\n")
""", ADDON)

echecs = [e for e in RESULTAT.split("\n") if e]
print(f"Addon testé: {ADDON}")
if echecs:
    print("\n".join("ÉCHEC: " + e for e in echecs))
    sys.exit(1)
print("Nouveautés 1.2.0: OK")
