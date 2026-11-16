-- lfgFR: export du personnage en texte à coller sur babillard-forever.com.
-- Première partie: encodage (JSON, base64, somme de contrôle), sans API du jeu, testé hors jeu.
-- Deuxième partie: lecture du personnage dans le jeu. Chaque lecture est protégée: si une fonction
-- n'existe pas dans Forever, la section correspondante reste vide au lieu de faire planter l'addon.
local _, ns = ...
ns = ns or {}
local E = {}
ns.Export = E

E.FORMAT = "LFGFR1"

-- ------------------------------------------------------------
-- JSON compact (clés triées pour que le résultat soit toujours le même)
-- ------------------------------------------------------------
local ECHAPPES = { ['"'] = '\\"', ["\\"] = "\\\\", ["\n"] = "\\n", ["\r"] = "\\r", ["\t"] = "\\t" }

local function chaine(s)
  s = tostring(s):gsub('[%c"\\]', function(c)
    return ECHAPPES[c] or string.format("\\u%04x", c:byte())
  end)
  return '"' .. s .. '"'
end

local function estListe(t)
  local n = 0
  for k in pairs(t) do
    if type(k) ~= "number" or k < 1 or k ~= math.floor(k) then
      return false
    end
    n = n + 1
  end
  return n == #t
end

local function json(v)
  local tv = type(v)
  if tv == "nil" then
    return "null"
  elseif tv == "boolean" then
    return v and "true" or "false"
  elseif tv == "number" then
    if v ~= v or v == math.huge or v == -math.huge then
      return "null"
    end
    if v == math.floor(v) then
      return string.format("%d", v)
    end
    return string.format("%.2f", v)
  elseif tv == "string" then
    return chaine(v)
  elseif tv == "table" then
    if estListe(v) then
      local morceaux = {}
      for i = 1, #v do
        morceaux[i] = json(v[i])
      end
      return "[" .. table.concat(morceaux, ",") .. "]"
    end
    local cles = {}
    for k in pairs(v) do
      cles[#cles + 1] = tostring(k)
    end
    table.sort(cles)
    local morceaux = {}
    for _, k in ipairs(cles) do
      local valeur = v[k]
      if valeur == nil then
        valeur = v[tonumber(k)]
      end
      morceaux[#morceaux + 1] = chaine(k) .. ":" .. json(valeur)
    end
    return "{" .. table.concat(morceaux, ",") .. "}"
  end
  return "null"
end
E.json = json

-- ------------------------------------------------------------
-- base64 (sans opérateurs binaires: le Lua du jeu est un 5.1)
-- ------------------------------------------------------------
local ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"

function E.base64(donnees)
  local sortie = {}
  local n = #donnees
  for i = 1, n, 3 do
    local a, b, c = donnees:byte(i, i + 2)
    local reste = n - i + 1
    local valeur = a * 65536 + (b or 0) * 256 + (c or 0)
    local c1 = math.floor(valeur / 262144) % 64
    local c2 = math.floor(valeur / 4096) % 64
    local c3 = math.floor(valeur / 64) % 64
    local c4 = valeur % 64
    sortie[#sortie + 1] = ALPHABET:sub(c1 + 1, c1 + 1) .. ALPHABET:sub(c2 + 1, c2 + 1)
      .. (reste >= 2 and ALPHABET:sub(c3 + 1, c3 + 1) or "=")
      .. (reste >= 3 and ALPHABET:sub(c4 + 1, c4 + 1) or "=")
  end
  return table.concat(sortie)
end

-- Somme de contrôle (Adler-32): détecte une copie coupée ou abîmée. Ce n'est PAS une protection contre la triche.
function E.somme(donnees)
  local a, b = 1, 0
  for i = 1, #donnees do
    a = (a + donnees:byte(i)) % 65521
    b = (b + a) % 65521
  end
  return string.format("%04x%04x", b, a)
end

-- Texte final: LFGFR1:<somme>:<base64 du JSON>
function E.encoder(table_)
  local texte = json(table_)
  return E.FORMAT .. ":" .. E.somme(texte) .. ":" .. E.base64(texte)
end

-- ------------------------------------------------------------
-- Lecture du personnage dans le jeu
-- ------------------------------------------------------------
local function proteger(f, ...)
  if type(f) ~= "function" then
    return nil
  end
  local ok, a, b, c, d, e, g, h = pcall(f, ...)
  if ok then
    return a, b, c, d, e, g, h
  end
  return nil
end

local function texteSur(v)
  -- Les valeurs « secrètes » de l'API moderne ne se lisent pas: on les ignore.
  if issecretvalue and issecretvalue(v) then
    return nil
  end
  return v
end

local REGIONS = { [1] = "US", [2] = "KR", [3] = "EU", [4] = "TW", [5] = "CN" }

-- Emplacements d'équipement (le numéro est celui de l'API; on saute la chemise et le tabard).
local EMPLACEMENTS = { 1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18 }

local function lirePerso()
  local nomClasse, jetonClasse = proteger(UnitClass, "player")
  local nomRace, jetonRace = proteger(UnitRace, "player")
  local faction = proteger(UnitFactionGroup, "player")
  local region = proteger(GetCurrentRegion)
  return {
    nom = texteSur(proteger(UnitName, "player")),
    royaume = texteSur(proteger(GetRealmName)),
    niveau = proteger(UnitLevel, "player"),
    classe = nomClasse,
    classeJeton = jetonClasse,
    race = nomRace,
    raceJeton = jetonRace,
    faction = faction and faction:lower() or nil,
    region = REGIONS[region or 0],
    guilde = (proteger(GetGuildInfo, "player")),
    langue = proteger(GetLocale),
  }
end

local function lireEquipement()
  local liste = {}
  for _, slot in ipairs(EMPLACEMENTS) do
    local lien = proteger(GetInventoryItemLink, "player", slot)
    if type(lien) == "string" then
      local id = tonumber(lien:match("item:(%d+)"))
      local enchant = tonumber(lien:match("item:%d+:(%d+)")) or 0
      local nom, niveauObjet, qualite
      local infos
      if C_Item and C_Item.GetItemInfo then
        infos = { proteger(C_Item.GetItemInfo, lien) }
      else
        infos = { proteger(GetItemInfo, lien) }
      end
      nom = infos[1]
      qualite = infos[3]
      niveauObjet = infos[4]
      if not nom then
        nom = lien:match("|h%[(.-)%]|h")
      end
      if id then
        liste[#liste + 1] = { slot, id, nom or "?", niveauObjet or 0, qualite or 0, enchant }
      end
    end
  end
  return liste
end

-- Talents: API de Classic (onglets et talents). Le format de retour diffère selon les versions du jeu;
-- si on ne reconnaît rien, on le dit avec `etat` plutôt que d'inventer des données.
local function lireTalents()
  local etat = {}
  local nbOnglets = proteger(GetNumTalentTabs)
  if type(nbOnglets) ~= "number" or nbOnglets < 1 then
    etat.erreur = "GetNumTalentTabs absent ou vide"
    return {}, etat
  end
  local onglets = {}
  for tab = 1, nbOnglets do
    local r = { proteger(GetTalentTabInfo, tab) }
    local nom, points
    if type(r[1]) == "string" then
      nom, points = r[1], r[3]
    else
      nom, points = r[2], r[5]
    end
    local talents = {}
    local nb = proteger(GetNumTalents, tab) or 0
    for i = 1, nb do
      local t = { proteger(GetTalentInfo, tab, i) }
      if type(t[1]) == "string" then
        local rang = t[5] or 0
        if type(rang) == "number" and rang > 0 then
          talents[#talents + 1] = { t[1], rang, t[6] or 0, t[3] or 0, t[4] or 0 }
        end
      else
        etat.erreur = "format de GetTalentInfo non reconnu"
      end
    end
    onglets[#onglets + 1] = { nom = type(nom) == "string" and nom or "?", points = tonumber(points) or 0, talents = talents }
  end
  return onglets, etat
end

local ENTETES_METIERS = {
  ["professions"] = true, ["secondary skills"] = true, ["metiers"] = true, ["competences secondaires"] = true,
  ["professions secondaires"] = true, ["metiers secondaires"] = true,
}

local function lireMetiers()
  local liste = {}
  -- Les lignes sous un en-tête replié n'apparaissent pas: ExpandSkillHeader(0) déplie tout (le panneau des
  -- compétences reste déplié ensuite, sans autre effet).
  if ExpandSkillHeader then
    proteger(ExpandSkillHeader, 0)
  end
  local nbLignes = proteger(GetNumSkillLines)
  if type(nbLignes) == "number" then
    local dansMetiers = false
    for i = 1, nbLignes do
      local nom, entete, _, rang, _, _, maxRang = proteger(GetSkillLineInfo, i)
      if type(nom) == "string" then
        if entete then
          local normal = ns.Parser and ns.Parser.normaliser(nom):gsub("^ ", ""):gsub(" $", "") or nom:lower()
          dansMetiers = ENTETES_METIERS[normal] or false
        elseif dansMetiers then
          liste[#liste + 1] = { nom, rang or 0, maxRang or 0 }
        end
      end
    end
  elseif GetProfessions then
    for _, index in ipairs({ proteger(GetProfessions) }) do
      local nom, _, rang, maxRang = proteger(GetProfessionInfo, index)
      if type(nom) == "string" then
        liste[#liste + 1] = { nom, rang or 0, maxRang or 0 }
      end
    end
  end
  return liste
end

-- Retourne (texte à copier, table lue, état de lecture pour /lfgfr debug).
function E.exporter()
  local perso = lirePerso()
  local talents, etatTalents = lireTalents()
  local equipement = lireEquipement()
  local metiers = lireMetiers()
  local donnees = {
    v = 1,
    addon = ns.version or "?",
    jeu = (select(4, proteger(GetBuildInfo))) or 0,
    quand = (proteger(time)) or 0,
    perso = perso,
    talents = talents,
    equipement = equipement,
    metiers = metiers,
  }
  local etat = {
    talents = #talents,
    erreurTalents = etatTalents.erreur,
    equipement = #equipement,
    metiers = #metiers,
  }
  return E.encoder(donnees), donnees, etat
end

return E
