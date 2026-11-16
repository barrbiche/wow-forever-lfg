-- lfgFR: fenêtre (liste des annonces, publier, export du personnage).
-- Construite à la première ouverture, dans un pcall: si quelque chose ne marche pas dans Forever,
-- l'erreur s'affiche dans le chat au lieu de bloquer le jeu.
local _, ns = ...
ns = ns or {}
local UI = {}
ns.UI = UI

local NB_LIGNES = 12
local HAUT_LIGNE = 22
local COULEUR_TYPE = { LFM = "|cff55ff55", LFG = "|cff66ccff" }
local NOMS_ROLES = { tank = "Tank", heal = "Heal", dps = "DPS" }

local f -- la fenêtre
local page_niveau -- la boîte du niveau (page Publier)
local selection -- clé de l'annonce choisie
local decalage = 0
local etat = { type = "LFM", activite = 1, tank = 1, heal = 1, dps = 3, role = "dps", commentaire = "" }

-- Liste des activités qu'on peut publier ou filtrer: donjons, raids, PvP, quêtes.
local function activites()
  if not ns.listeActivites then
    local l = {}
    for _, d in ipairs(ns.Parser.DONJONS) do
      l[#l + 1] = d
    end
    l[#l + 1] = ns.Parser.PVP
    l[#l + 1] = ns.Parser.QUETES
    ns.listeActivites = l
  end
  return ns.listeActivites
end

local function nomActivite(a)
  return a.fr or a.id
end

local function texteRoles(e)
  local morceaux = {}
  for _, r in ipairs({ "tank", "heal", "dps" }) do
    local n = e[r] or 0
    if n > 0 then
      morceaux[#morceaux + 1] = (n > 1 and (n .. " ") or "") .. NOMS_ROLES[r]
    end
  end
  return table.concat(morceaux, ", ")
end

local function bouton(parent, texte, largeur, x, y, surClic)
  local b = CreateFrame("Button", nil, parent, "UIPanelButtonTemplate")
  b:SetSize(largeur, 22)
  b:SetPoint("TOPLEFT", parent, "TOPLEFT", x, y)
  b:SetText(texte)
  b:RegisterForClicks("LeftButtonUp", "RightButtonUp")
  b:SetScript("OnClick", function(self, bouton_)
    surClic(self, bouton_)
  end)
  return b
end

local function etiquette(parent, texte, x, y, largeur, police)
  local t = parent:CreateFontString(nil, "OVERLAY", police or "GameFontHighlightSmall")
  t:SetPoint("TOPLEFT", parent, "TOPLEFT", x, y)
  if largeur then
    t:SetWidth(largeur)
  end
  t:SetJustifyH("LEFT")
  t:SetText(texte)
  return t
end

-- Fait défiler une liste de valeurs: clic gauche = suivant, clic droit = précédent. Retourne le nouvel index.
local function tourner(index, taille, bouton_)
  if bouton_ == "RightButton" then
    return (index - 2) % taille + 1
  end
  return index % taille + 1
end

-- ------------------------------------------------------------
-- Page « Groupes »
-- ------------------------------------------------------------
local function construireListe(page)
  local filtre = lfgFRDB.filtre
  local types = { "tous", "LFM", "LFG" }
  local roles = { "tous", "tank", "heal", "dps" }
  local libelleType = { tous = "Tout", LFM = "Groupes (LFM)", LFG = "Joueurs (LFG)" }

  local function indexDans(liste, valeur)
    for i, v in ipairs(liste) do
      if v == valeur then
        return i
      end
    end
    return 1
  end

  page.btnType = bouton(page, "", 130, 0, 0, function(self, b)
    local i = tourner(indexDans(types, filtre.type), #types, b)
    filtre.type = types[i]
    UI.rafraichir()
  end)
  page.btnRole = bouton(page, "", 100, 136, 0, function(self, b)
    local i = tourner(indexDans(roles, filtre.role), #roles, b)
    filtre.role = roles[i]
    UI.rafraichir()
  end)
  page.btnDonjon = bouton(page, "", 220, 242, 0, function(self, b)
    local tous = { "tous" }
    for _, a in ipairs(activites()) do
      tous[#tous + 1] = a.id
    end
    local i = tourner(indexDans(tous, filtre.donjon), #tous, b)
    filtre.donjon = tous[i]
    UI.rafraichir()
  end)
  page.libelleType = libelleType

  page.lignes = {}
  for i = 1, NB_LIGNES do
    local ligne = CreateFrame("Button", nil, page)
    ligne:SetSize(486, HAUT_LIGNE)
    ligne:SetPoint("TOPLEFT", page, "TOPLEFT", 0, -30 - (i - 1) * HAUT_LIGNE)
    ligne.fond = ligne:CreateTexture(nil, "BACKGROUND")
    ligne.fond:SetAllPoints()
    ligne.fond:SetColorTexture(0.3, 0.6, 1, 0)
    ligne.type = ligne:CreateFontString(nil, "OVERLAY", "GameFontNormalSmall")
    ligne.type:SetPoint("LEFT", 4, 0)
    ligne.type:SetWidth(34)
    ligne.type:SetJustifyH("LEFT")
    ligne.resume = ligne:CreateFontString(nil, "OVERLAY", "GameFontHighlightSmall")
    ligne.resume:SetPoint("LEFT", 40, 0)
    ligne.resume:SetWidth(290)
    ligne.resume:SetJustifyH("LEFT")
    ligne.auteur = ligne:CreateFontString(nil, "OVERLAY", "GameFontNormalSmall")
    ligne.auteur:SetPoint("LEFT", 334, 0)
    ligne.auteur:SetWidth(100)
    ligne.auteur:SetJustifyH("LEFT")
    ligne.age = ligne:CreateFontString(nil, "OVERLAY", "GameFontDisableSmall")
    ligne.age:SetPoint("RIGHT", -4, 0)
    ligne.age:SetJustifyH("RIGHT")
    ligne:SetScript("OnEnter", function(self)
      if self.cle ~= selection then
        self.fond:SetColorTexture(1, 1, 1, 0.08)
      end
      if self.texteComplet and GameTooltip then
        GameTooltip:SetOwner(self, "ANCHOR_RIGHT")
        GameTooltip:SetText(self.texteComplet, 1, 1, 1, 1, true)
        GameTooltip:Show()
      end
    end)
    ligne:SetScript("OnLeave", function(self)
      if GameTooltip then
        GameTooltip:Hide()
      end
      UI.rafraichir()
    end)
    ligne:SetScript("OnClick", function(self)
      selection = self.cle
      UI.rafraichir()
    end)
    page.lignes[i] = ligne
  end

  page:EnableMouseWheel(true)
  page:SetScript("OnMouseWheel", function(_, delta)
    decalage = math.max(0, decalage - delta * 3)
    UI.rafraichir()
  end)

  page.vide = etiquette(page, "", 8, -60, 470, "GameFontNormal")
  page.vide:SetJustifyH("CENTER")
  page.pied = etiquette(page, "", 0, -30 - NB_LIGNES * HAUT_LIGNE - 8, 300)

  page.btnChuchoter = bouton(page, "Chuchoter", 90, 0, -30 - NB_LIGNES * HAUT_LIGNE - 28, function()
    local e = ns.entrees[selection or ""]
    if not e then
      return
    end
    local pour = e.donjon and (" pour " .. (e.donjon.abr or nomActivite(e.donjon))) or ""
    local message
    if e.type == "LFM" then
      message = "Salut! Il te reste de la place dans ton groupe" .. pour .. "? (lfgFR)"
    else
      message = "Salut! Ça t'intéresse de faire un groupe" .. pour .. "? (lfgFR)"
    end
    pcall(SendChatMessage, message, "WHISPER", nil, e.auteur)
  end)
  page.btnInviter = bouton(page, "Inviter", 80, 96, -30 - NB_LIGNES * HAUT_LIGNE - 28, function()
    local e = ns.entrees[selection or ""]
    if not e then
      return
    end
    if C_PartyInfo and C_PartyInfo.InviteUnit then
      pcall(C_PartyInfo.InviteUnit, e.auteur)
    elseif InviteUnit then
      pcall(InviteUnit, e.auteur)
    end
  end)
  page.btnVider = bouton(page, "Vider", 70, 416, -30 - NB_LIGNES * HAUT_LIGNE - 28, function()
    ns.entrees = {}
    selection = nil
    UI.rafraichir()
  end)
end

local function rafraichirListe(page)
  local filtre = lfgFRDB.filtre
  page.btnType:SetText("Type: " .. page.libelleType[filtre.type])
  page.btnRole:SetText("Rôle: " .. (filtre.role == "tous" and "tous" or NOMS_ROLES[filtre.role]))
  local donjonFiltre = "tous"
  for _, a in ipairs(activites()) do
    if a.id == filtre.donjon then
      donjonFiltre = nomActivite(a)
    end
  end
  page.btnDonjon:SetText(donjonFiltre == "tous" and "Donjon: tous" or donjonFiltre)

  local liste = ns.liste()
  decalage = math.max(0, math.min(decalage, math.max(0, #liste - NB_LIGNES)))
  local maintenant = time()
  for i = 1, NB_LIGNES do
    local ligne = page.lignes[i]
    local e = liste[decalage + i]
    if e then
      ligne.cle = e.cle
      ligne.texteComplet = e.texte
      ligne.type:SetText((COULEUR_TYPE[e.type] or "") .. e.type .. "|r")
      local morceaux = { e.donjon and nomActivite(e.donjon) or "Activité non précisée" }
      local roles = texteRoles(e)
      if roles ~= "" then
        morceaux[#morceaux + 1] = roles
      end
      if e.niveauMin then
        morceaux[#morceaux + 1] = "niv " .. (e.niveauMax ~= e.niveauMin and (e.niveauMin .. "-" .. e.niveauMax) or e.niveauMin)
      end
      ligne.resume:SetText(table.concat(morceaux, " · "))
      ligne.auteur:SetText((e.viaAddon and "|cffffd100*|r " or "") .. ns.nomCourt(e.auteur) .. (e.moi and " (toi)" or ""))
      ligne.age:SetText(ns.Parser.age(maintenant - e.ts))
      ligne.fond:SetColorTexture(0.3, 0.6, 1, e.cle == selection and 0.3 or 0)
      ligne:Show()
    else
      ligne.cle = nil
      ligne.texteComplet = nil
      ligne:Hide()
    end
  end

  if #liste == 0 then
    page.vide:SetText("Aucune annonce pour l'instant.\nElles apparaissent quand quelqu'un cherche un groupe dans le chat ou sur le canal lfgFR.")
  else
    page.vide:SetText("")
  end
  local e = ns.entrees[selection or ""]
  page.btnChuchoter:SetEnabled(e ~= nil and not e.moi)
  page.btnInviter:SetEnabled(e ~= nil and e.type == "LFG" and not e.moi)
  local canal = ns.idCanal()
  page.pied:SetText(string.format("%d annonce%s · canal lfgFR: %s · * = vient de l'addon", #liste, #liste > 1 and "s" or "",
    canal and ("n° " .. canal) or "non rejoint"))
end

-- ------------------------------------------------------------
-- Page « Publier »
-- ------------------------------------------------------------
local function texteAPublier()
  local a = activites()[etat.activite]
  local opts = { type = etat.type, abr = a.abr, commentaire = etat.commentaire }
  if etat.type == "LFM" then
    opts.tank, opts.heal, opts.dps = etat.tank, etat.heal, etat.dps
  else
    opts[etat.role] = 1
  end
  local niv = page_niveau and page_niveau:GetText() or ""
  if niv ~= "" then
    opts.niveau = niv
  end
  return ns.Parser.composer(opts)
end

local function plageNiveau(a)
  if a.niv and a.niv[1] and a.niv[2] and a.niv[2] > 0 then
    return a.niv[1] == a.niv[2] and tostring(a.niv[1]) or (a.niv[1] .. "-" .. a.niv[2])
  end
  return ""
end

local function construirePublier(page)
  -- Activité par défaut: le premier donjon qui convient au niveau du joueur.
  local niveau = UnitLevel and UnitLevel("player") or 1
  for i, a in ipairs(activites()) do
    if a.niv and not a.raid and niveau >= a.niv[1] and niveau <= a.niv[2] then
      etat.activite = i
      break
    end
  end

  etiquette(page, "Type d'annonce", 0, 0, 120)
  page.btnType = bouton(page, "", 150, 0, -16, function()
    etat.type = etat.type == "LFM" and "LFG" or "LFM"
    if etat.type == "LFG" then
      page_niveau:SetText(tostring(niveau))
    else
      page_niveau:SetText(plageNiveau(activites()[etat.activite]))
    end
    UI.rafraichir()
  end)
  etiquette(page, "Activité (clic gauche: suivante, droit: précédente)", 0, -48, 400)
  page.btnActivite = bouton(page, "", 300, 0, -64, function(self, b)
    etat.activite = tourner(etat.activite, #activites(), b)
    if etat.type == "LFM" then
      page_niveau:SetText(plageNiveau(activites()[etat.activite]))
    end
    UI.rafraichir()
  end)

  page.titreRoles = etiquette(page, "", 0, -96, 400)
  page.btnTank = bouton(page, "", 90, 0, -112, function(self, b)
    etat.tank = (etat.tank + (b == "RightButton" and 2 or 1)) % 3
    UI.rafraichir()
  end)
  page.btnHeal = bouton(page, "", 90, 96, -112, function(self, b)
    etat.heal = (etat.heal + (b == "RightButton" and 2 or 1)) % 3
    UI.rafraichir()
  end)
  page.btnDps = bouton(page, "", 90, 192, -112, function(self, b)
    etat.dps = (etat.dps + (b == "RightButton" and 4 or 1)) % 6
    UI.rafraichir()
  end)
  page.btnRole = bouton(page, "", 150, 0, -112, function()
    local ordre = { "tank", "heal", "dps" }
    for i, r in ipairs(ordre) do
      if r == etat.role then
        etat.role = ordre[i % 3 + 1]
        break
      end
    end
    UI.rafraichir()
  end)

  etiquette(page, "Niveau (ex.: 15-20)", 0, -146, 150)
  page_niveau = CreateFrame("EditBox", nil, page, "InputBoxTemplate")
  page_niveau:SetSize(70, 20)
  page_niveau:SetPoint("TOPLEFT", page, "TOPLEFT", 8, -162)
  page_niveau:SetAutoFocus(false)
  page_niveau:SetMaxLetters(7)
  page_niveau:SetText(plageNiveau(activites()[etat.activite]))
  page_niveau:SetScript("OnTextChanged", function()
    UI.rafraichir()
  end)
  page_niveau:SetScript("OnEscapePressed", function(self)
    self:ClearFocus()
  end)

  etiquette(page, "Commentaire (facultatif)", 0, -192, 200)
  local commentaire = CreateFrame("EditBox", nil, page, "InputBoxTemplate")
  commentaire:SetSize(320, 20)
  commentaire:SetPoint("TOPLEFT", page, "TOPLEFT", 8, -208)
  commentaire:SetAutoFocus(false)
  commentaire:SetMaxLetters(50)
  commentaire:SetScript("OnTextChanged", function(self)
    etat.commentaire = self:GetText() or ""
    UI.rafraichir()
  end)
  commentaire:SetScript("OnEscapePressed", function(self)
    self:ClearFocus()
  end)

  etiquette(page, "Aperçu", 0, -240, 200)
  page.apercu = etiquette(page, "", 0, -256, 470, "GameFontNormal")
  page.btnPublier = bouton(page, "Publier sur le canal lfgFR", 200, 0, -290, function()
    local ok, raison = ns.publier(texteAPublier())
    page.resultat:SetText(ok and "|cff55ff55Publié.|r Ton annonce apparaît chez les joueurs qui ont lfgFR." or ("|cffff6666" .. raison .. "|r"))
  end)
  page.resultat = etiquette(page, "", 0, -320, 470)
  page.note = etiquette(page, "Seuls les joueurs avec l'addon voient le canal lfgFR. Pour tout le monde, écris aussi ton annonce dans le chat habituel.", 0, -350, 470)
end

local function rafraichirPublier(page)
  local a = activites()[etat.activite]
  page.btnType:SetText(etat.type == "LFM" and "Mon groupe cherche du monde (LFM)" or "Je cherche un groupe (LFG)")
  page.btnActivite:SetText(nomActivite(a))
  if etat.type == "LFM" then
    page.titreRoles:SetText("Rôles recherchés (clic gauche: +1, droit: -1)")
    page.btnRole:Hide()
    page.btnTank:SetText("Tank: " .. etat.tank)
    page.btnHeal:SetText("Heal: " .. etat.heal)
    page.btnDps:SetText("DPS: " .. etat.dps)
    page.btnTank:Show()
    page.btnHeal:Show()
    page.btnDps:Show()
  else
    page.titreRoles:SetText("Ton rôle")
    page.btnTank:Hide()
    page.btnHeal:Hide()
    page.btnDps:Hide()
    page.btnRole:SetText(NOMS_ROLES[etat.role])
    page.btnRole:Show()
  end
  page.apercu:SetText(texteAPublier())
  local canal = ns.idCanal()
  page.btnPublier:SetEnabled(canal ~= nil)
  if not canal then
    page.resultat:SetText("Tu n'es pas sur le canal lfgFR. Tape /lfgfr canal pour le rejoindre.")
  end
end

-- ------------------------------------------------------------
-- Page « Mon perso » (export vers le site)
-- ------------------------------------------------------------
local function construirePerso(page)
  etiquette(page, "Envoie ton personnage sur " .. ns.SITE .. ": talents, équipement et métiers.\n"
    .. "1. Clique « Préparer l'export ».\n"
    .. "2. Clique dans la boîte ci-dessous (tout se sélectionne), puis fais Ctrl+C.\n"
    .. "3. Sur le site, colle le texte dans « Importer mon personnage ».", 0, 0, 470, "GameFontHighlight")
  page.btnExporter = bouton(page, "Préparer l'export", 160, 0, -86, function()
    local ok, texte, donnees, etat_ = pcall(ns.Export.exporter)
    if not ok then
      page.resume:SetText("|cffff6666L'export a échoué: " .. tostring(texte) .. "|r\nTape /lfgfr debug et envoie le résultat à Barrbiche.")
      return
    end
    page.boite.texteFixe = texte
    page.boite:SetText(texte)
    page.boite:SetFocus()
    page.boite:HighlightText()
    local p = donnees.perso
    local lignes = {
      string.format("%s, %s niveau %s: %d talents (points), %d objets, %d métiers.", p.nom or "?", p.classe or "?",
        tostring(p.niveau or "?"), etat_.talents, etat_.equipement, etat_.metiers),
    }
    if etat_.talents == 0 then
      lignes[#lignes + 1] = "|cffffd100Talents non lus" .. (etat_.erreurTalents and (" (" .. etat_.erreurTalents .. ")") or "")
        .. ". Tape /lfgfr debug et envoie le résultat à Barrbiche.|r"
    end
    page.resume:SetText(table.concat(lignes, "\n"))
  end)
  page.boite = CreateFrame("EditBox", nil, page, "InputBoxTemplate")
  page.boite:SetSize(470, 22)
  page.boite:SetPoint("TOPLEFT", page, "TOPLEFT", 8, -124)
  page.boite:SetAutoFocus(false)
  page.boite:SetMaxLetters(1000000)
  page.boite:SetMaxBytes(1000000)
  page.boite:SetScript("OnTextChanged", function(self, parUtilisateur)
    if parUtilisateur and self.texteFixe then
      self:SetText(self.texteFixe)
      self:HighlightText()
    end
  end)
  page.boite:SetScript("OnEditFocusGained", function(self)
    self:HighlightText()
  end)
  page.boite:SetScript("OnEscapePressed", function(self)
    self:ClearFocus()
  end)
  page.resume = etiquette(page, "", 0, -158, 470)
  etiquette(page, "Les données viennent de ton jeu mais le site ne peut pas les vérifier: elles s'affichent comme « déclarées par le joueur ».",
    0, -230, 470)
end

-- ------------------------------------------------------------
-- Fenêtre
-- ------------------------------------------------------------
local PAGES = { "liste", "publier", "perso" }
local TITRES = { liste = "Groupes", publier = "Publier", perso = "Mon perso" }

local function construire()
  local ok, cadre = pcall(CreateFrame, "Frame", "lfgFRFenetre", UIParent, "BasicFrameTemplateWithInset")
  if not ok or not cadre then
    cadre = CreateFrame("Frame", "lfgFRFenetre", UIParent, "BackdropTemplate")
    cadre:SetBackdrop({
      bgFile = "Interface\\DialogFrame\\UI-DialogBox-Background",
      edgeFile = "Interface\\DialogFrame\\UI-DialogBox-Border",
      tile = true, tileSize = 32, edgeSize = 32, insets = { left = 8, right = 8, top = 8, bottom = 8 },
    })
  end
  f = cadre
  f:SetSize(520, 430)
  f:SetPoint("CENTER")
  f:SetFrameStrata("HIGH")
  f:SetMovable(true)
  f:EnableMouse(true)
  f:SetClampedToScreen(true)
  f:RegisterForDrag("LeftButton")
  f:SetScript("OnDragStart", f.StartMoving)
  f:SetScript("OnDragStop", f.StopMovingOrSizing)
  if f.TitleText then
    f.TitleText:SetText("lfgFR")
  else
    local titre = f:CreateFontString(nil, "OVERLAY", "GameFontNormal")
    titre:SetPoint("TOP", 0, -12)
    titre:SetText("lfgFR")
  end
  if UISpecialFrames then
    table.insert(UISpecialFrames, "lfgFRFenetre")
  end

  f.onglets = {}
  for i, nom in ipairs(PAGES) do
    f.onglets[nom] = bouton(f, TITRES[nom], 110, 12 + (i - 1) * 114, -30, function()
      UI.ouvrir(nom)
    end)
  end

  f.pages = {}
  for _, nom in ipairs(PAGES) do
    local page = CreateFrame("Frame", nil, f)
    page:SetPoint("TOPLEFT", f, "TOPLEFT", 16, -64)
    page:SetPoint("BOTTOMRIGHT", f, "BOTTOMRIGHT", -16, 12)
    page:Hide()
    f.pages[nom] = page
  end
  construireListe(f.pages.liste)
  construirePublier(f.pages.publier)
  construirePerso(f.pages.perso)
  f.pret = true
  f:Hide()

  -- Garde l'âge des annonces à jour pendant que la fenêtre est ouverte.
  local reste = 0
  f:SetScript("OnUpdate", function(_, ecoule)
    reste = reste + ecoule
    if reste >= 5 then
      reste = 0
      UI.rafraichir()
    end
  end)
end

function UI.rafraichir()
  if not f or not f.pret or not f:IsShown() then
    return
  end
  if f.pages.liste:IsShown() then
    rafraichirListe(f.pages.liste)
  elseif f.pages.publier:IsShown() then
    rafraichirPublier(f.pages.publier)
  end
end

function UI.ouvrir(nom)
  if not f then
    local ok, erreur = pcall(construire)
    if not ok then
      f = nil
      ns.imprimer("|cffff6666la fenêtre n'a pas pu s'ouvrir:|r " .. tostring(erreur))
      ns.imprimer("Tape /lfgfr debug et envoie le résultat avec ce message à Barrbiche.")
      return
    end
  end
  nom = nom or "liste"
  for _, p in ipairs(PAGES) do
    f.pages[p]:SetShown(p == nom)
    f.onglets[p]:SetEnabled(p ~= nom)
  end
  f:Show()
  UI.rafraichir()
end
