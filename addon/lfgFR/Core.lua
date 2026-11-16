-- lfgFR: événements du chat, canal « lfgFR », liste des annonces et commandes.
local ADDON, ns = ...
ns = ns or {}

local GetMeta = (C_AddOns and C_AddOns.GetAddOnMetadata) or GetAddOnMetadata
ns.version = (GetMeta and GetMeta(ADDON, "Version")) or "?"
ns.CANAL = "lfgFR"
ns.SITE = "babillard-forever.com"

local DEFAUTS = {
  canal = true, -- rejoindre le canal lfgFR au démarrage
  masquerCanal = true, -- ne pas afficher le canal dans les fenêtres de chat
  duree = 20, -- minutes avant qu'une annonce disparaisse de la liste
  filtre = { type = "tous", role = "tous", donjon = "tous" },
}

ns.entrees = {} -- une annonce par joueur (la plus récente)
ns.stats = { recus = 0, annonces = 0, secrets = 0, ignores = 0 }

function ns.imprimer(message)
  print("|cff8fd6fflfgFR|r: " .. message)
end

local function moi()
  return UnitName and UnitName("player") or ""
end

local function nomCourt(nom)
  return (Ambiguate and Ambiguate(nom, "short")) or nom
end
ns.nomCourt = nomCourt

-- ------------------------------------------------------------
-- Réception des messages
-- ------------------------------------------------------------
local function estSecret(v)
  return issecretvalue and issecretvalue(v)
end

function ns.recevoir(texte, auteur, canal, viaAddon)
  ns.stats.recus = ns.stats.recus + 1
  local resultat = ns.Parser.analyser(texte)
  if not resultat then
    ns.stats.ignores = ns.stats.ignores + 1
    return nil
  end
  ns.stats.annonces = ns.stats.annonces + 1
  local cle = auteur:lower()
  ns.entrees[cle] = {
    cle = cle,
    auteur = auteur,
    texte = texte,
    canal = canal,
    ts = time(),
    moi = nomCourt(auteur) == moi(),
    viaAddon = viaAddon or false,
    type = resultat.type,
    tank = resultat.tank,
    heal = resultat.heal,
    dps = resultat.dps,
    donjon = resultat.donjon,
    niveauMin = resultat.niveauMin,
    niveauMax = resultat.niveauMax,
  }
  if ns.UI and ns.UI.rafraichir then
    ns.UI.rafraichir()
  end
  return ns.entrees[cle]
end

function ns.purger()
  local limite = time() - (lfgFRDB and lfgFRDB.duree or 20) * 60
  for cle, e in pairs(ns.entrees) do
    if e.ts < limite then
      ns.entrees[cle] = nil
    end
  end
end

-- Annonces filtrées, les plus récentes d'abord.
function ns.liste()
  ns.purger()
  local f = lfgFRDB and lfgFRDB.filtre or DEFAUTS.filtre
  local liste = {}
  for _, e in pairs(ns.entrees) do
    local ok = true
    if f.type ~= "tous" and e.type ~= f.type then
      ok = false
    end
    if ok and f.role ~= "tous" then
      -- Pour un groupe (LFM), le rôle demandé; pour un joueur (LFG), le rôle offert; sans précision, on garde.
      local aucunRole = (e.tank + e.heal + e.dps) == 0
      if not aucunRole and (e[f.role] or 0) == 0 then
        ok = false
      end
    end
    if ok and f.donjon ~= "tous" and (not e.donjon or e.donjon.id ~= f.donjon) then
      ok = false
    end
    if ok then
      liste[#liste + 1] = e
    end
  end
  table.sort(liste, function(a, b)
    return a.ts > b.ts
  end)
  return liste
end

-- ------------------------------------------------------------
-- Canal lfgFR
-- ------------------------------------------------------------
function ns.idCanal()
  local id = GetChannelName and GetChannelName(ns.CANAL)
  if type(id) == "number" and id > 0 then
    return id
  end
  return nil
end

function ns.masquerCanal()
  if not (lfgFRDB and lfgFRDB.masquerCanal) or not ChatFrame_RemoveChannel then
    return
  end
  for i = 1, (NUM_CHAT_WINDOWS or 10) do
    local fenetre = _G["ChatFrame" .. i]
    if fenetre then
      pcall(ChatFrame_RemoveChannel, fenetre, ns.CANAL)
    end
  end
end

function ns.rejoindreCanal()
  if ns.idCanal() then
    ns.masquerCanal()
    return true
  end
  if JoinChannelByName then
    pcall(JoinChannelByName, ns.CANAL)
    C_Timer.After(2, ns.masquerCanal)
    return true
  end
  return false
end

function ns.quitterCanal()
  if ns.idCanal() and LeaveChannelByName then
    pcall(LeaveChannelByName, ns.CANAL)
  end
end

-- Publie un texte sur le canal lfgFR (à appeler depuis un clic de bouton). Retourne ok, raison.
function ns.publier(texte)
  local id = ns.idCanal()
  if not id then
    return false, "Tu n'es pas sur le canal lfgFR. Tape /lfgfr canal pour le rejoindre."
  end
  local ok, erreur = pcall(SendChatMessage, texte, "CHANNEL", nil, id)
  if not ok then
    return false, "Le jeu a refusé le message: " .. tostring(erreur)
  end
  return true
end

-- ------------------------------------------------------------
-- Événements
-- ------------------------------------------------------------
local cadre = CreateFrame("Frame")
ns.cadre = cadre
cadre:RegisterEvent("ADDON_LOADED")
cadre:RegisterEvent("PLAYER_LOGIN")
cadre:RegisterEvent("CHAT_MSG_CHANNEL")
cadre:RegisterEvent("CHAT_MSG_YELL")

local function appliquerDefauts()
  lfgFRDB = lfgFRDB or {}
  for k, v in pairs(DEFAUTS) do
    if lfgFRDB[k] == nil then
      if type(v) == "table" then
        lfgFRDB[k] = {}
        for k2, v2 in pairs(v) do
          lfgFRDB[k][k2] = v2
        end
      else
        lfgFRDB[k] = v
      end
    end
  end
end

cadre:SetScript("OnEvent", function(_, event, ...)
  if event == "ADDON_LOADED" then
    if ... == ADDON then
      appliquerDefauts()
    end
  elseif event == "PLAYER_LOGIN" then
    ns.imprimer("chargé. Tape /lfgfr pour ouvrir la fenêtre.")
    -- On attend un peu: rejoindre un canal trop tôt peut décaler les numéros des canaux du jeu.
    C_Timer.After(10, function()
      if lfgFRDB and lfgFRDB.canal then
        ns.rejoindreCanal()
      end
    end)
  elseif event == "CHAT_MSG_CHANNEL" or event == "CHAT_MSG_YELL" then
    local texte, auteur = ...
    if estSecret(texte) or estSecret(auteur) then
      ns.stats.secrets = ns.stats.secrets + 1
      return
    end
    if type(texte) ~= "string" or type(auteur) ~= "string" or auteur == "" then
      return
    end
    local canal, nomBase
    if event == "CHAT_MSG_CHANNEL" then
      canal = select(4, ...)
      nomBase = select(9, ...)
      -- La défense locale ne contient pas d'annonces de groupe.
      local verifie = ns.Parser.normaliser(tostring(nomBase or canal or ""))
      if verifie:find("defense", 1, true) or verifie:find("defence", 1, true) then
        return
      end
    else
      canal = "Cri"
    end
    local viaAddon = (nomBase or canal) == ns.CANAL
    ns.recevoir(texte, auteur, canal, viaAddon)
  end
end)

-- ------------------------------------------------------------
-- Commandes
-- ------------------------------------------------------------
local function dispo(chemin)
  local v = _G
  for morceau in chemin:gmatch("[^%.]+") do
    if type(v) ~= "table" then
      return false
    end
    v = v[morceau]
  end
  return v ~= nil
end

local function debogage()
  ns.imprimer("version " .. ns.version .. ", jeu " .. tostring(select(4, GetBuildInfo())))
  local fonctions = {
    "GetNumTalentTabs", "GetTalentTabInfo", "GetTalentInfo", "C_Traits", "C_ClassTalents",
    "GetInventoryItemLink", "C_Item.GetItemInfo", "GetItemInfo", "GetNumSkillLines", "GetProfessions",
    "JoinChannelByName", "GetChannelName", "ChatFrame_RemoveChannel", "C_PartyInfo.InviteUnit",
    "C_ChatInfo.SendAddonMessage", "issecretvalue", "C_Timer.After", "Ambiguate",
  }
  local presentes, absentes = {}, {}
  for _, nom in ipairs(fonctions) do
    table.insert(dispo(nom) and presentes or absentes, nom)
  end
  ns.imprimer("présentes: " .. table.concat(presentes, ", "))
  ns.imprimer("absentes: " .. (#absentes > 0 and table.concat(absentes, ", ") or "aucune"))
  local id = ns.idCanal()
  ns.imprimer("canal lfgFR: " .. (id and ("n° " .. id) or "non rejoint"))
  ns.imprimer(string.format("messages lus: %d, annonces reconnues: %d, ignorés: %d, secrets: %d, en liste: %d",
    ns.stats.recus, ns.stats.annonces, ns.stats.ignores, ns.stats.secrets, #ns.liste()))
  local _, _, etat = ns.Export.exporter()
  ns.imprimer(string.format("export: %d talents, %d objets, %d métiers%s", etat.talents, etat.equipement, etat.metiers,
    etat.erreurTalents and (" (talents: " .. etat.erreurTalents .. ")") or ""))
end

local function tester(message)
  local r = ns.Parser.analyser(message)
  if not r then
    ns.imprimer("pas une annonce de groupe.")
    return
  end
  ns.imprimer(string.format("%s | %s | tank %d, heal %d, dps %d | niveau %s", r.type,
    r.donjon and r.donjon.fr or "aucune activité", r.tank, r.heal, r.dps,
    r.niveauMin and (r.niveauMin .. "-" .. r.niveauMax) or "?"))
end

SLASH_LFGFR1 = "/lfgfr"
SlashCmdList["LFGFR"] = function(texte)
  local commande, reste = (texte or ""):match("^%s*(%S*)%s*(.-)%s*$")
  commande = (commande or ""):lower()
  if commande == "" or commande == "liste" or commande == "groupes" then
    ns.UI.ouvrir("liste")
  elseif commande == "publier" then
    ns.UI.ouvrir("publier")
  elseif commande == "export" or commande == "perso" then
    ns.UI.ouvrir("perso")
  elseif commande == "canal" then
    if ns.idCanal() then
      lfgFRDB.canal = false
      ns.quitterCanal()
      ns.imprimer("canal lfgFR quitté. Tape /lfgfr canal pour le rejoindre de nouveau.")
    else
      lfgFRDB.canal = true
      ns.rejoindreCanal()
      ns.imprimer("canal lfgFR rejoint.")
    end
  elseif commande == "vider" then
    ns.entrees = {}
    ns.UI.rafraichir()
    ns.imprimer("liste vidée.")
  elseif commande == "debug" then
    debogage()
  elseif commande == "test" then
    tester(reste)
  else
    ns.imprimer("/lfgfr (liste), /lfgfr publier, /lfgfr export, /lfgfr canal, /lfgfr vider, /lfgfr debug, /lfgfr test <message>")
  end
end
