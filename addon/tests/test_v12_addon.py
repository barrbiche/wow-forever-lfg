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
IsInGroup = function() return false end
IsInRaid = function() return false end
local membres = 1
GetNumGroupMembers = function() return membres end
local roles = {}                                   -- [unité] = rôle assigné
UnitExists = function(u) return u == "player" or (u:match("^party(%d)$") and tonumber(u:match("%d")) < membres) or false end
UnitGroupRolesAssigned = function(u) return roles[u] or "NONE" end
UnitName = function() return "Barrbiche" end
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
Ambiguate = function(nom) return (nom:gsub("%-.*$", "")) end
GetChannelName = function() return 5 end
local canaux = { 1, "1. Général - Elwynn", false, 2, "2. Recherche de groupe", false, 5, "BabillardFR", false }
GetChannelList = function() return unpack(canaux) end
local ENVOYES, CHAT = {}, {}
C_ChatInfo = { RegisterAddonMessagePrefix = function() end,
               SendAddonMessage = function(prefixe, msg) ENVOYES[#ENVOYES + 1] = msg; return 0 end }
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
chat("Cherche groupe Mortemines niv 19", "Bob")                       -- sans royaume
verifier(ns.listings["Bob-ForeverRealm"] ~= nil and ns.listings["Bob-ForeverRealm"].level == 19, "royaume ajouté, niveau lu")
chat("LFM RFC tank", "Gardien-ForeverRealm", "3. Défense locale", "LocalDefense")
verifier(ns.listings["Gardien-ForeverRealm"] == nil, "défense locale ignorée")
chat("LFM RFC tank", "Barrbiche-ForeverRealm")
verifier(ns.listings["Barrbiche-ForeverRealm"] == nil, "mes propres messages ignorés")
chat("SECRET", "Eve-ForeverRealm")
chat("LFM WC tank", "SECRET")
verifier(ns.listings["Eve-ForeverRealm"] == nil and compter(ns.listings) == 2, "valeurs secrètes ignorées")
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

-- ---------- 4. Avis de nouvelle version ----------
egal(ns.VersionNumber("1.2.0"), 1002000, "numéro de version")
verifier(ns.VersionNumber("1.2") == nil and ns.VersionNumber("a.b.c") == nil and ns.VersionNumber("1.2.0;x") == nil
  and ns.VersionNumber(nil) == nil and ns.VersionNumber("1.2.99999") == nil, "versions invalides refusées")
recevoir("L2;LFM;Donjons;WC;T;WARRIOR;20;Horde;5;1;0;;normal;1.1.0", "Vieux-ForeverRealm")
recevoir("L2;LFM;Donjons;WC;T;WARRIOR;20;Horde;5;1;0;;normal;1.2.3", "Pareil-ForeverRealm")
recevoir("L2;LFM;Donjons;WC;T;WARRIOR;20;Horde;5;1;0;;normal;pirate", "Faux-ForeverRealm")
recevoir("L2;LFM;Donjons;WC;T;WARRIOR;20;Horde;5;1;0;;normal", "SansVersion-ForeverRealm")
egal(ns.newVersion, nil, "pas d'avis pour une version égale, ancienne ou invalide")
recevoir("L2;LFM;Donjons;WC;T;WARRIOR;20;Horde;5;1;0;;normal;1.3.0", "Neuf-ForeverRealm")
egal(ns.newVersion, "1.3.0", "avis pour une version plus récente")
egal(ns.db.newestSeen, 1003000, "version vue sauvegardée")
recevoir("G2;Les Pas Fins;PVE;Horde;ROGUE;60;0;note;normal;1.3.0", "Neuf2-ForeverRealm")
recevoir("H2;20;MAGE;1.3.0", "Neuf3-ForeverRealm")
egal(nbImprimes("nouvelle version"), 1, "l'avis n'est dit qu'une fois par version")
recevoir("H2;20;MAGE;1.4.0", "Neuf4-ForeverRealm")
egal(ns.newVersion, "1.4.0", "une version encore plus récente remplace l'avis")
egal(nbImprimes("nouvelle version"), 2, "un nouvel avis pour 1.4.0")

-- Mon message contient ma version (L2 et G2)
ns.db.opts.autoRemove = false
vider()
avancer(100)
ns.PublishListing({ type = "LFM", akey = "WC", roles = { TANK = true, HEAL = true, DPS = true }, note = "essai" })
egal(ENVOYES[#ENVOYES]:match(";([^;]*)$"), "1.2.3", "L2 publié termine par la version")
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
  else recevoir("L2;LFM;Donjons;" .. akey .. ";D;MAGE;20;Horde;5;1;0;;normal;1.2.0", "Alerte-ForeverRealm") end
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
membres = 3
cadre(nil, "GROUP_ROSTER_UPDATE")
verifier(ns.my == nil or ns.my.groupCount ~= 3, "LFG: pas de mise à jour du nombre")

return table.concat(echecs, "\n")
""", ADDON)

echecs = [e for e in RESULTAT.split("\n") if e]
print(f"Addon testé: {ADDON}")
if echecs:
    print("\n".join("ÉCHEC: " + e for e in echecs))
    sys.exit(1)
print("Nouveautés 1.2.0: OK")
