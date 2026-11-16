-- lfgFR: analyse des messages de chat (français et anglais).
-- Aucun appel à l'API du jeu ici: ce fichier se teste hors jeu (voir addon/tests).
local _, ns = ...
ns = ns or {}
local P = {}
ns.Parser = P

-- ------------------------------------------------------------
-- Donjons et raids. `id` = le nom anglais utilisé par le site (src/data.js).
-- `fr` = nom affiché; `abr` = abréviation utilisée quand on publie; `niv` = plage de niveaux.
-- `alias` = formes normalisées (minuscules, sans accents ni apostrophes ni tirets).
-- Les noms français des nouveaux donjons ne sont pas connus: seuls les noms anglais sont reconnus pour eux.
-- ------------------------------------------------------------
P.DONJONS = {
  { id = "Ragefire Chasm", fr = "Gouffre de Ragefeu", abr = "RFC", niv = { 13, 18 }, alias = { "rfc", "ragefire chasm", "ragefire", "gouffre de ragefeu", "ragefeu" } },
  { id = "Wailing Caverns", fr = "Cavernes des Lamentations", abr = "WC", niv = { 15, 25 }, alias = { "wc", "wailing caverns", "wailing", "cavernes des lamentations", "lamentations" } },
  { id = "The Deadmines", fr = "Les Mortemines", abr = "VC", niv = { 18, 23 }, alias = { "vc", "dm", "deadmines", "the deadmines", "mortemines", "les mortemines" } },
  { id = "Shadowfang Keep", fr = "Donjon d'Ombrecroc", abr = "SFK", niv = { 22, 30 }, alias = { "sfk", "shadowfang keep", "shadowfang", "ombrecroc", "donjon dombrecroc" } },
  { id = "Blackfathom Deeps", fr = "Profondeurs de Brassenoire", abr = "BFD", niv = { 24, 32 }, alias = { "bfd", "blackfathom deeps", "blackfathom", "brassenoire", "profondeurs de brassenoire" } },
  { id = "The Stockade", fr = "La Prison", abr = "Stockade", niv = { 24, 31 }, alias = { "stockade", "stockades", "the stockade", "prison", "la prison" } },
  { id = "Gnomeregan", fr = "Gnomeregan", abr = "Gnomer", niv = { 29, 38 }, alias = { "gnomer", "gnomeregan" } },
  { id = "Razorfen Kraul", fr = "Kraal de Tranchebauge", abr = "RFK", niv = { 30, 40 }, alias = { "rfk", "razorfen kraul", "kraul", "kraal", "kraal de tranchebauge" } },
  { id = "Scarlet Monastery: Graveyard", fr = "Monastere ecarlate: Cimetiere", abr = "SM Cimetiere", niv = { 26, 36 }, alias = { "sm gy", "sm graveyard", "smgy", "sm cimetiere", "cimetiere", "graveyard" } },
  { id = "Scarlet Monastery: Library", fr = "Monastere ecarlate: Bibliotheque", abr = "SM Biblio", niv = { 29, 39 }, alias = { "sm lib", "sm library", "smlib", "sm biblio", "sm bibliotheque", "bibliotheque", "library" } },
  { id = "Scarlet Monastery: Armory", fr = "Monastere ecarlate: Armurerie", abr = "SM Armurerie", niv = { 32, 42 }, alias = { "sm arm", "sm armory", "smarm", "sm armurerie", "armurerie", "armory" } },
  { id = "Scarlet Monastery: Cathedral", fr = "Monastere ecarlate: Cathedrale", abr = "SM Cathedrale", niv = { 35, 45 }, alias = { "sm cath", "sm cathedral", "smcath", "sm cathedrale", "cathedrale", "cathedral" } },
  { id = "Razorfen Downs", fr = "Souilles de Tranchebauge", abr = "RFD", niv = { 40, 50 }, alias = { "rfd", "razorfen downs", "souilles", "souilles de tranchebauge" } },
  { id = "Zul'Farrak", fr = "Zul'Farrak", abr = "ZF", niv = { 44, 54 }, alias = { "zf", "zulfarrak", "zul farrak" } },
  { id = "Uldaman", fr = "Uldaman", abr = "Ulda", niv = { 42, 52 }, alias = { "ulda", "uldaman", "uldam" } },
  { id = "Maraudon", fr = "Maraudon", abr = "Mara", niv = { 46, 55 }, alias = { "mara", "maraudon" } },
  { id = "Temple of Atal'Hakkar", fr = "Temple d'Atal'Hakkar", abr = "ST", niv = { 50, 60 }, alias = { "st", "temple of atalhakkar", "sunken temple", "atalhakkar", "temple datalhakkar", "temple englouti" } },
  { id = "Blackrock Depths", fr = "Profondeurs de Blackrock", abr = "BRD", niv = { 52, 60 }, alias = { "brd", "blackrock depths", "profondeurs de blackrock", "prof blackrock" } },
  { id = "Lower Blackrock Spire", fr = "Pic Blackrock inferieur", abr = "LBRS", niv = { 55, 60 }, alias = { "lbrs", "lower blackrock spire", "pic blackrock inferieur", "brs inferieur" } },
  { id = "Upper Blackrock Spire", fr = "Pic Blackrock superieur", abr = "UBRS", niv = { 58, 60 }, alias = { "ubrs", "upper blackrock spire", "pic blackrock superieur", "brs superieur" } },
  { id = "Stratholme: Living", fr = "Stratholme: cote vivant", abr = "Strat vivant", niv = { 58, 60 }, alias = { "strat live", "strat living", "strat vivant", "stratholme vivant", "stratholme live", "stratholme living", "strat" } },
  { id = "Stratholme: Undead", fr = "Stratholme: cote mort-vivant", abr = "Strat UD", niv = { 58, 60 }, alias = { "strat ud", "strat undead", "strat mort vivant", "stratholme undead", "stratholme ud", "stratholme mort vivant" } },
  { id = "Scholomance", fr = "Scholomance", abr = "Scholo", niv = { 58, 60 }, alias = { "scholo", "scholomance" } },
  { id = "Dire Maul: East", fr = "Hache-tripes: Est", abr = "DM Est", niv = { 58, 60 }, alias = { "dme", "dm e", "dm east", "dire maul east", "hache tripes est", "dm est" } },
  { id = "Dire Maul: West", fr = "Hache-tripes: Ouest", abr = "DM Ouest", niv = { 58, 60 }, alias = { "dmw", "dm w", "dm west", "dire maul west", "hache tripes ouest", "dm ouest" } },
  { id = "Dire Maul: North", fr = "Hache-tripes: Nord", abr = "DM Nord", niv = { 58, 60 }, alias = { "dmn", "dm n", "dm north", "dire maul north", "hache tripes nord", "dm nord", "tribut", "tribute" } },
  -- Nouveaux donjons de Forever (noms anglais seulement; abréviations inconnues, à compléter après le lancement).
  { id = "Hall of Thanes", fr = "Hall of Thanes", abr = "Hall of Thanes", niv = { 13, 18 }, alias = { "hall of thanes", "thanes" } },
  { id = "Ruins of Lordaeron", fr = "Ruins of Lordaeron", abr = "Ruins of Lordaeron", niv = { 15, 20 }, alias = { "ruins of lordaeron", "lordaeron" } },
  { id = "Excavation Site: Wetlands", fr = "Excavation Site: Wetlands", abr = "Excavation Site", niv = { 24, 31 }, alias = { "excavation site", "excavation" } },
  { id = "City of Dalaran", fr = "City of Dalaran", abr = "City of Dalaran", niv = { 28, 33 }, alias = { "city of dalaran", "dalaran" } },
  { id = "The Drowned City", fr = "The Drowned City", abr = "Drowned City", niv = { 35, 40 }, alias = { "drowned city", "the drowned city" } },
  { id = "Krol'dok Stronghold", fr = "Krol'dok Stronghold", abr = "Krol'dok", niv = { 40, 45 }, alias = { "kroldok", "krol dok", "kroldok stronghold" } },
  { id = "Alcaz Island Prison", fr = "Alcaz Island Prison", abr = "Alcaz", niv = { 48, 53 }, alias = { "alcaz", "alcaz island prison", "alcaz island" } },
  { id = "Blackmaw Hold", fr = "Blackmaw Hold", abr = "Blackmaw Hold", niv = { 55, 60 }, alias = { "blackmaw hold", "blackmaw" } },
  { id = "Shaper's Terrace", fr = "Shaper's Terrace", abr = "Shaper's Terrace", niv = { 58, 60 }, alias = { "shapers terrace", "shaper terrace", "shapers" } },
  -- Raids (ouverture le 9 décembre 2026 selon le site).
  { id = "Barrow Deeps", fr = "Barrow Deeps", abr = "Barrow Deeps", niv = { 60, 60 }, raid = true, alias = { "barrow deeps", "barrow" } },
  { id = "Hyjal Summit", fr = "Hyjal Summit", abr = "Hyjal", niv = { 60, 60 }, raid = true, alias = { "hyjal summit", "hyjal" } },
  { id = "Onyxia's Lair", fr = "Repaire d'Onyxia", abr = "Onyxia", niv = { 60, 60 }, raid = true, alias = { "onyxia", "ony", "onyxias lair", "repaire donyxia" } },
}

-- Activités qui ne sont pas des donjons.
P.QUETES = { id = "Quetes", fr = "Quetes", abr = "Quetes", alias = { "quete", "quetes", "quest", "quests", "leveling", "levelling", "xp", "monter" } }
P.PVP = { id = "PvP", fr = "PvP", abr = "PvP", alias = { "pvp", "bg", "bgs", "wsg", "champ de bataille", "champs de bataille" } }

-- ------------------------------------------------------------
-- Normalisation: minuscules, sans accents, ponctuation en espaces, chiffres séparés des lettres.
-- ------------------------------------------------------------
local ACCENTS = {
  [160] = "a", [161] = "a", [162] = "a", [164] = "a", [167] = "c", [168] = "e", [169] = "e", [170] = "e", [171] = "e",
  [172] = "i", [173] = "i", [174] = "i", [175] = "i", [178] = "o", [179] = "o", [180] = "o", [182] = "o",
  [185] = "u", [186] = "u", [187] = "u", [188] = "u",
  [128] = "a", [130] = "a", [132] = "a", [135] = "c", [136] = "e", [137] = "e", [138] = "e", [139] = "e",
  [142] = "i", [143] = "i", [148] = "o", [150] = "o", [153] = "u", [155] = "u", [156] = "u",
}

function P.normaliser(texte)
  local s = tostring(texte or "")
  s = s:gsub("\226\128[\152\153]", "") -- guillemets simples typographiques
  s = s:gsub("\226\128.", " ") -- tirets longs et autres signes typographiques
  s = s:gsub("\197\147", "oe"):gsub("\197\146", "oe")
  s = s:gsub("\195(.)", function(c)
    return ACCENTS[c:byte()] or " "
  end)
  s = s:lower():gsub("'", "")
  s = s:gsub("[^%w]", " ")
  s = s:gsub("(%d)(%a)", "%1 %2"):gsub("(%a)(%d)", "%1 %2")
  s = s:gsub("%s+", " ")
  s = s:gsub("^ ", ""):gsub(" $", "")
  return " " .. s .. " "
end

local function mots(normalise)
  local t = {}
  for m in normalise:gmatch("%S+") do
    t[#t + 1] = m
  end
  return t
end

local function contient(normalise, alias)
  return normalise:find(" " .. alias .. " ", 1, true)
end

-- ------------------------------------------------------------
-- Vocabulaire
-- ------------------------------------------------------------
local ROLE = {
  tank = "tank", tanks = "tank", tk = "tank", tanker = "tank",
  heal = "heal", heals = "heal", healer = "heal", healers = "heal", healeur = "heal", healeurs = "heal",
  soigneur = "heal", soigneurs = "heal", soin = "heal", soins = "heal",
  dps = "dps", dd = "dps", degat = "dps", degats = "dps", cac = "dps", melee = "dps", range = "dps",
  ranged = "dps", caster = "dps", casters = "dps",
}
local CHERCHE = {
  cherche = true, cherchons = true, cherchent = true, recherche = true, recherchons = true,
  besoin = true, need = true, needs = true, manque = true, manquent = true, lf = true,
}
local GROUPE = { groupe = true, grp = true, group = true, party = true, team = true, equipe = true, gang = true }
local SPAM = {
  wts = true, wtb = true, wtt = true, vend = true, vends = true, vendre = true, achete = true, acheter = true,
  recrute = true, recrutement = true, recrutons = true, boost = true, boosts = true, carry = true,
}
local PETIT = { un = true, une = true, des = true, ["1"] = true, d = true }

-- ------------------------------------------------------------
-- Analyse d'un message. Retourne nil quand ce n'est pas une annonce de groupe, sinon:
-- { type = "LFM"|"LFG", tank = n, heal = n, dps = n, donjon = <entrée>|nil, niveauMin, niveauMax }
-- ------------------------------------------------------------
local function chercherActivite(normalise)
  local meilleur, meilleurePos, meilleureLongueur
  local function essayer(entree)
    for _, alias in ipairs(entree.alias) do
      local pos = contient(normalise, alias)
      if pos and (not meilleurePos or pos < meilleurePos or (pos == meilleurePos and #alias > meilleureLongueur)) then
        meilleur, meilleurePos, meilleureLongueur = entree, pos, #alias
      end
    end
  end
  for _, d in ipairs(P.DONJONS) do
    essayer(d)
  end
  if not meilleur then
    essayer(P.PVP)
    essayer(P.QUETES)
  end
  return meilleur
end

function P.analyser(texte)
  if type(texte) ~= "string" or texte == "" or #texte > 400 then
    return nil
  end
  local n = P.normaliser(texte)
  local t = mots(n)
  if #t == 0 then
    return nil
  end

  local presents = {}
  for _, m in ipairs(t) do
    presents[m] = true
    if SPAM[m] then
      return nil
    end
  end

  -- Rôles avec leur nombre: « 2 dps », « x2 dps », « 2x dps », « dps x2 ».
  local roles = { tank = 0, heal = 0, dps = 0 }
  local trouveRole = false
  for i, m in ipairs(t) do
    local r = ROLE[m]
    if r then
      trouveRole = true
      local nombre = 1
      local avant, avantAvant, apres, apresApres = t[i - 1], t[i - 2], t[i + 1], t[i + 2]
      if avant == "x" and avantAvant and tonumber(avantAvant) then
        nombre = tonumber(avantAvant)
      elseif avant and tonumber(avant) and tonumber(avant) <= 9 then
        nombre = tonumber(avant)
      elseif apres == "x" and apresApres and tonumber(apresApres) and tonumber(apresApres) <= 9 then
        nombre = tonumber(apresApres)
      end
      if nombre > 9 then
        nombre = 1
      end
      roles[r] = roles[r] + nombre
    end
  end

  local activite = chercherActivite(n)

  -- Type: LFM (le groupe cherche du monde) ou LFG (un joueur cherche un groupe).
  local type_
  if presents.lfm or n:find(" lf %d m ", 1, false) then
    type_ = "LFM"
  elseif presents.lfg then
    type_ = "LFG"
  else
    for i, m in ipairs(t) do
      if CHERCHE[m] then
        local j = i + 1
        if PETIT[t[j] or ""] then
          j = j + 1
        end
        if t[j] and GROUPE[t[j]] then
          type_ = "LFG"
          break
        end
      end
    end
    if not type_ then
      for i, m in ipairs(t) do
        if CHERCHE[m] then
          for j = i + 1, math.min(i + 4, #t) do
            if ROLE[t[j]] then
              type_ = "LFM"
              break
            end
          end
          if type_ then
            break
          end
        end
      end
    end
    if not type_ and presents.dispo and (activite or trouveRole) then
      type_ = "LFG"
    end
  end
  if not type_ then
    return nil
  end

  -- Les annonces de guilde sans donjon ne sont pas des groupes.
  if (presents.guilde or presents.guild) and not activite then
    return nil
  end
  if not activite and not trouveRole then
    return nil
  end

  -- Niveau: « lvl 20 », « niv 20 25 » (le tiret devient un espace).
  local niveauMin, niveauMax
  for i, m in ipairs(t) do
    if m == "lvl" or m == "niv" or m == "level" or m == "lv" or m == "niveau" or m == "lvls" then
      local a, b = tonumber(t[i + 1] or ""), tonumber(t[i + 2] or "")
      if a and a >= 1 and a <= 60 then
        niveauMin = a
        niveauMax = (b and b >= a and b <= 60) and b or a
      end
      break
    end
  end

  return {
    type = type_,
    tank = roles.tank,
    heal = roles.heal,
    dps = roles.dps,
    donjon = activite,
    niveauMin = niveauMin,
    niveauMax = niveauMax,
  }
end

-- ------------------------------------------------------------
-- Texte d'une annonce publiée par l'addon. Il se relit avec P.analyser (voir les tests).
-- opts: type ("LFM"|"LFG"), abr, tank, heal, dps, niveau (texte ou nombre), commentaire
-- ------------------------------------------------------------
function P.composer(opts)
  local morceaux = { opts.type == "LFG" and "LFG" or "LFM" }
  if opts.abr and opts.abr ~= "" then
    morceaux[#morceaux + 1] = opts.abr
  end
  local roles = {}
  for _, r in ipairs({ "tank", "heal", "dps" }) do
    local nombre = tonumber(opts[r]) or 0
    if nombre > 0 then
      roles[#roles + 1] = (nombre > 1 and (nombre .. " ") or "") .. r
    end
  end
  if #roles > 0 then
    morceaux[#morceaux + 1] = (opts.type == "LFG" and "" or "- ") .. table.concat(roles, " ")
  end
  if opts.niveau and tostring(opts.niveau) ~= "" then
    morceaux[#morceaux + 1] = "lvl " .. tostring(opts.niveau)
  end
  local texte = table.concat(morceaux, " ")
  if opts.commentaire and opts.commentaire ~= "" then
    texte = texte .. " - " .. opts.commentaire
  end
  return texte .. " [lfgFR]"
end

-- Durée lisible: « 45 s », « 3 min ».
function P.age(secondes)
  secondes = math.max(0, math.floor(secondes or 0))
  if secondes < 60 then
    return secondes .. " s"
  end
  return math.floor(secondes / 60) .. " min"
end

return P
