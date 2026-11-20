"""Le code que l'addon Babillard Forever FR génère (vraie fonction Lua 5.1) doit être lu correctement par le site (src/codeJeu.js).

    python3 addon/tests/test_code_site.py     (nécessite lupa et node)
"""
import json
import os
import subprocess
import sys

from lupa.lua51 import LuaRuntime

ICI = os.path.dirname(os.path.abspath(__file__))
ADDON = os.path.join(ICI, "..", "BabillardForeverFR").replace("\\", "/")
echecs = []
total = 0


def verifier(condition, message):
    global total
    total += 1
    if not condition:
        echecs.append(message)
        print("ÉCHEC:", message)


def code_de(perso, fonction="BuildExportCode"):
    """Charge Data.lua et Core.lua avec une fausse API et retourne ns.BuildExportCode() pour ce personnage."""
    lua = LuaRuntime(unpack_returned_tuples=True)
    def en_lua(v):
        if isinstance(v, dict):
            return lua.table_from({k: en_lua(x) for k, x in v.items()})
        if isinstance(v, list):
            return lua.table_from([en_lua(x) for x in v])  # les listes Lua commencent à 1
        return v

    lua.globals().PERSO = en_lua(perso)
    return lua.execute(r"""
local ADDON_DIR, FONCTION = ...
local U = {}
setmetatable(U, { __index = function() return U end, __call = function() return U end })
setmetatable(_G, { __index = function() return U end })
StaticPopupDialogs = {}
SlashCmdList = {}
C_Timer = { After = function() end, NewTicker = function() end }
strtrim = function(s) return (s:gsub("^%s+", ""):gsub("%s+$", "")) end
strsplit = function(sep, s) local t = {}; for p in (s .. sep):gmatch("(.-)" .. sep) do t[#t + 1] = p end; return unpack(t) end
tinsert = table.insert
CopyTable = function(t) local c = {}; for k, v in pairs(t) do c[k] = type(v) == "table" and CopyTable(v) or v end; return c end
time = function() return 1790000000 end
GetTime = function() return 100 end
issecretvalue = function() return false end
UnitFullName = function() return PERSO.nom, PERSO.royaume end
GetNormalizedRealmName = function() return PERSO.royaume end
UnitClass = function() return PERSO.classeNom or "Classe", PERSO.classe end
UnitRace = function() return PERSO.race or "Orc" end
UnitLevel = function() return PERSO.niveau end
UnitFactionGroup = function() return PERSO.faction end
GetGuildInfo = function() return PERSO.guilde end
GetCurrentRegionName = function() return PERSO.region end
rawset(_G, 'GetAverageItemLevel', false)
GetProfessions = function()
  if not PERSO.metiers then return end
  return 1, 2
end
GetProfessionInfo = function(i)
  local m = PERSO.metiers[i]
  return m[1], nil, m[2], m[3]
end

-- Équipement et talents (seulement si le personnage de test en a)
local QUALITE_COULEUR = { [0] = "9d9d9d", [1] = "ffffff", [2] = "1eff00", [3] = "0070dd", [4] = "a335ee", [5] = "ff8000" }
if PERSO.equipement then
  GetInventoryItemLink = function(unit, slot)
    local e = PERSO.equipement[slot]
    if not e then return nil end
    return "|cff" .. QUALITE_COULEUR[e.qualite or 1] .. "|Hitem:" .. e.id .. ":" .. (e.enchant or 0) .. ":0:0|h[" .. e.nom .. "]|h|r"
  end
  GetInventoryItemTexture = function(unit, slot)
    local e = PERSO.equipement[slot]
    return e and e.texture or nil
  end
  C_Item = { GetItemInfo = function(lien)
    local id = tonumber(lien:match("item:(%d+)"))
    for _, e in pairs(PERSO.equipement) do
      if e.id == id and not e.horsMemoire then return e.nom, lien, e.qualite or 1, e.ilvl or 0 end
    end
    return nil  -- objet pas encore en mémoire: l'addon doit lire le nom dans le lien
  end }
end
if PERSO.arbres then
  GetNumTalentTabs = function() return #PERSO.arbres end
  GetTalentTabInfo = function(i) return PERSO.arbres[i].nom, PERSO.arbres[i].texture or 12345, PERSO.arbres[i].points, "fond" end
  GetNumTalents = function(i) return #PERSO.arbres[i].talents end
  GetTalentInfo = function(i, j) local t = PERSO.arbres[i].talents[j]; return t[1], t[4] or 67890, t[5], t[6], t[2], t[3] end
end

-- WoW Forever: pas de GetTalentInfo, les talents passent par C_Traits (config « CamelotCombat »)
if PERSO.traits then
  rawset(_G, "GetNumTalentTabs", false)
  local T = PERSO.traits
  C_ClassTalents = { GetActiveConfigID = function() return 77 end }
  C_Traits = {
    GetConfigInfo = function(id) return { treeIDs = { 1117 } } end,
    GetGroupDisplayInfoByTreeID = function() return T.groupes end,
    GetTreeNodes = function() local ids = {}; for _, n in ipairs(T.noeuds) do ids[#ids + 1] = n.id end; return ids end,
    GetNodeInfo = function(cfg, id) for _, n in ipairs(T.noeuds) do if n.id == id then return n.info end end end,
    GetEntryInfo = function(cfg, e) return { definitionID = e + 1000 } end,
    GetDefinitionInfo = function(d) return { spellID = d - 1000 } end,
    GetConditionInfo = function(cfg, cid) return T.conditions and T.conditions[cid] end,
  }
  C_Spell = { GetSpellInfo = function(sid) local s = T.sorts[sid]; if s then return { name = s[1], iconID = s[2] } end end }
end

local ns = {}
for _, f in ipairs({ "Data.lua", "Core.lua" }) do
  assert(loadfile(ADDON_DIR .. "/" .. f))("BabillardForeverFR", ns)
end
ns.db = { myRoles = PERSO.roles or {}, ruleset = PERSO.ruleset }
return ns[FONCTION]()
""", ADDON, fonction)


CAS = [
    {
        "nom": "personnage complet",
        "perso": dict(nom="Barrbiche", royaume="Forever", region="EU", faction="Horde", classe="ROGUE", niveau=60,
                      guilde="Les Pas Fins", metiers=[["Herboristerie", 225, 300], ["Pêche", 75, 150]],
                      roles={"TANK": True, "DPS": True}, ruleset="pvp"),
        "attendu": dict(perso="Barrbiche", niveau="60", classe="voleur", faction="horde", region="EU",
                        guilde="Les Pas Fins", roles=["tank", "dps"], ruleset="pvp"),
        "metiers": 2,
    },
    {
        "nom": "sans guilde ni métiers ni rôles",
        "perso": dict(nom="Lyra", royaume="Forever", region="US", faction="Alliance", classe="MAGE", niveau=7, roles={}),
        "attendu": dict(perso="Lyra", niveau="7", classe="mage", faction="alliance", region="US", guilde=""),
        "metiers": 0,
    },
    {
        "nom": "caractères spéciaux dans la guilde et nom accentué",
        "perso": dict(nom="Éloïse", royaume="Forever", region="EU", faction="Alliance", classe="PRIEST", niveau=33,
                      guilde="A;B=C|D,E:F", roles={"HEAL": True}),
        "attendu": dict(perso="Éloïse", niveau="33", classe="pretre", faction="alliance", region="EU",
                        guilde="A B C D E F", roles=["heal"]),
        "metiers": 0,
    },
    {
        "nom": "classe et région que le site ne connaît pas",
        "perso": dict(nom="Arthas", royaume="Forever", region="KR", faction="Horde", classe="DEATHKNIGHT", niveau=60),
        "attendu": dict(perso="Arthas", niveau="60", faction="horde"),
        "avertissements": {"classe", "region"},
        "metiers": 0,
    },
]

# Équipement et talents: ce que l'addon lit dans le jeu doit arriver intact sur le site.
GEAR_ROGUE = {
    1: dict(id=12345, nom="Casque du Crépuscule", ilvl=62, qualite=4, enchant=0, texture="Interface\\Icons\\INV_Helmet_01"),
    5: dict(id=22222, nom="Plastron; spécial|piégé", ilvl=58, qualite=3, enchant=1234, texture="Interface/Icons/INV_Chest_Cloth_05.blp"),
    16: dict(id=33333, nom="Dague sans nom en mémoire", ilvl=0, qualite=2, enchant=0, horsMemoire=True, texture=132345),
}
ARBRES_ROGUE = [
    dict(nom="Assassinat", points=5, texture="Interface\\Icons\\Ability_Rogue_Eviscerate", talents=[["Malice", 5, 5, "Interface\\Icons\\Ability_Racial_BloodRage", 1, 3]]),
    dict(nom="Combat", points=31, talents=[["Précision", 2, 5, "Interface\\Icons\\INV_Weapon_ShortBlade_05", 2, 2], ["Coups précis", 3, 3]]),
    dict(nom="Finesse", points=15, talents=[["Initiative", 3, 3]]),
]
CAS += [
    {
        "nom": "équipement et talents",
        "perso": dict(nom="Furtif", royaume="Forever", region="EU", faction="Horde", classe="ROGUE", niveau=60,
                      equipement=GEAR_ROGUE, arbres=ARBRES_ROGUE),
        "attendu": dict(perso="Furtif", classe="voleur", specialisation="combat", faction="horde", region="EU", niveau="60", guilde=""),
        "metiers": 0,
        "fiche": dict(equipement=3, arbres=["Assassinat:5", "Combat:31", "Finesse:15"], talents=4),
    },
    {
        "nom": "arbres en anglais",
        "perso": dict(nom="Mystic", royaume="Forever", region="US", faction="Alliance", classe="MAGE", niveau=40,
                      arbres=[dict(nom="Arcane", points=0, talents=[]), dict(nom="Fire", points=22, talents=[["Ignite", 3, 3]]),
                              dict(nom="Frost", points=3, talents=[])]),
        "attendu": dict(perso="Mystic", classe="mage", specialisation="feu", faction="alliance", region="US", niveau="40", guilde=""),
        "metiers": 0,
        "fiche": dict(equipement=0, arbres=["Arcane:0", "Fire:22", "Frost:3"], talents=1),
    },
    {
        "nom": "arbres au nom inconnu: reconnus par leur place",
        "perso": dict(nom="Inconnu", royaume="Forever", region="EU", faction="Horde", classe="PRIEST", niveau=50,
                      arbres=[dict(nom="Voie A", points=1, talents=[]), dict(nom="Voie B", points=2, talents=[]),
                              dict(nom="Voie C", points=30, talents=[])]),
        "attendu": dict(perso="Inconnu", classe="pretre", specialisation="ombre", faction="horde", region="EU", niveau="50", guilde=""),
        "metiers": 0,
        "fiche": dict(equipement=0, arbres=["Voie A:1", "Voie B:2", "Voie C:30"], talents=0),
        "incertaine": True,
    },
    {
        "nom": "aucun point de talent",
        "perso": dict(nom="Debutant", royaume="Forever", region="EU", faction="Horde", classe="WARRIOR", niveau=5,
                      arbres=[dict(nom="Armes", points=0, talents=[]), dict(nom="Fureur", points=0, talents=[]),
                              dict(nom="Protection", points=0, talents=[])]),
        "attendu": dict(perso="Debutant", classe="guerrier", faction="horde", region="EU", niveau="5", guilde=""),
        "metiers": 0,
        "fiche": dict(equipement=0, arbres=["Armes:0", "Fureur:0", "Protection:0"], talents=0),
        "sans_specialisation": True,
    },
]

def noeud(id, groupe, col, rangee, rang, maximum, entree, porte=None, y=None):
    """Un nœud de l'arbre de traits: coordonnées à une échelle arbitraire (300 par colonne, 250 par rangée).
    `porte` = points requis par la porte de la rangée (condition isGate), `y` = coordonnée Y si elle ne suit pas la rangée."""
    info = dict(groupIDs=[9999, groupe], posX=col * 300 + 100, posY=rangee * 250 if y is None else y, currentRank=rang, maxRanks=maximum,
                activeEntry=dict(entryID=entree))
    if porte is not None:
        info["conditionIDs"] = [7000, 7000 + porte]  # une condition qui n'est pas une porte + la porte
    return dict(id=id, info=info)


# Conditions: 7000 = niveau requis (pas une porte); 7000 + N = porte « N points dépensés »
CONDITIONS = {7000: dict(condID=7000, isGate=False, type=3)}
for _n in (0, 5, 10, 15, 20, 25, 30):
    CONDITIONS[7000 + _n] = dict(condID=7000 + _n, isGate=True, spentAmountRequired=_n, isMet=True, type=2)


TRAITS_ROGUE = dict(
    groupes=[dict(groupID=13, displayName="Finesse", icon=626003, orderIndex=2),
             dict(groupID=11, displayName="Assassinat", icon=626001, orderIndex=0),
             dict(groupID=12, displayName="Combat", icon=626002, orderIndex=1)],
    noeuds=[noeud(1, 11, 3, 1, 5, 5, 1), noeud(2, 11, 2, 1, 0, 3, 2),
            noeud(3, 12, 1, 1, 5, 5, 3), noeud(4, 12, 2, 2, 3, 5, 4), noeud(5, 12, 4, 3, 0, 1, 5),
            noeud(6, 13, 3, 2, 3, 3, 6),
            # nœuds non appris qui complètent la largeur des onglets (colonnes 1 à 4)
            noeud(7, 13, 1, 1, 0, 1, 7), noeud(8, 13, 4, 1, 0, 1, 8), noeud(9, 11, 1, 1, 0, 1, 9), noeud(10, 11, 4, 1, 0, 1, 10)],
    sorts={1: ["Malice", 132001], 2: ["Vitalité", 132002], 3: ["Précision", 132003], 4: ["Coups précis", 132004],
           5: ["Frappe", 132005], 6: ["Initiative", 132006], 7: ["A", 1], 8: ["B", 2], 9: ["C", 3], 10: ["D", 4]},
)
# Coordonnées réelles relevées dans WoW Forever (/bf diag d'un démoniste): Vie volée améliorée à Y=2120 alors que Suppression et
# Corruption améliorée sont à Y=2130 (même rangée), rangées à 600 d'écart, colonnes à 600 d'écart; l'onglet 2 est 4000 plus loin
# et l'onglet 3 n'occupe que trois colonnes (X=9080, 9680, 10280). Aucune porte (portes=0).
def reel(id, groupe, x, y, rang, maximum, entree):
    return dict(id=id, info=dict(groupIDs=[9999, groupe], posX=x, posY=y, currentRank=rang, maxRanks=maximum, activeEntry=dict(entryID=entree)))

TRAITS_REELS = dict(
    groupes=[dict(groupID=11, displayName="Affliction", icon=1, orderIndex=0),
             dict(groupID=12, displayName="Demonology", icon=2, orderIndex=1),
             dict(groupID=13, displayName="Destruction", icon=3, orderIndex=2)],
    noeuds=[reel(1, 11, 1020, 2120, 1, 2, 1), reel(2, 11, 1620, 2130, 5, 5, 2), reel(3, 11, 2220, 2130, 5, 5, 3),
            reel(4, 11, 1020, 2730, 0, 2, 4), reel(5, 11, 1620, 2730, 0, 2, 5), reel(6, 11, 2220, 2730, 0, 3, 6),
            reel(7, 11, 2220, 3320, 0, 1, 7), reel(8, 11, 1020, 3330, 0, 2, 8), reel(9, 11, 2820, 5730, 0, 1, 9),
            reel(10, 12, 5020, 2130, 0, 3, 10), reel(11, 12, 6820, 5730, 0, 1, 11),
            reel(12, 13, 9680, 2130, 0, 5, 12), reel(13, 13, 10280, 3330, 0, 3, 13), reel(14, 13, 9080, 4530, 0, 2, 14)],
    sorts={1: ["Vie volée améliorée", 10], 2: ["Suppression", 11], 3: ["Corruption améliorée", 12], 4: ["Fouet de malédiction", 13],
           5: ["Moisson d'âmes", 14], 6: ["Drains améliorés", 15], 7: ["Malédiction amplifiée", 16], 8: ["Fléau d'agonie amélioré", 17],
           9: ["Ruine", 18], 10: ["Maîtrise du démon", 19], 11: ["Métamorphose", 20], 12: ["Cataclysme", 21], 13: ["Embrasement", 22],
           14: ["Dévastation", 23]},
    conditions=CONDITIONS,
)
# Onglet qui ne couvre que les colonnes 2 et 3: on ne sait pas laquelle est la première, donc pas de colonne
TRAITS_INCOMPLET = dict(
    groupes=TRAITS_ROGUE["groupes"],
    noeuds=[noeud(1, 12, 2, 1, 2, 3, 1), noeud(2, 12, 3, 2, 1, 1, 2)],
    sorts={1: ["Un", 132001], 2: ["Deux", 132002]},
)
CAS += [
    {
        "nom": "WoW Forever: talents lus par C_Traits",
        "perso": dict(nom="Forever", royaume="Forever", region="EU", faction="Horde", classe="ROGUE", niveau=60,
                      equipement={16: dict(id=33333, nom="Dague", ilvl=60, qualite=5, enchant=0, texture=132345)},
                      traits=TRAITS_ROGUE),
        "attendu": dict(perso="Forever", classe="voleur", specialisation="combat", faction="horde", region="EU", niveau="60", guilde=""),
        "metiers": 0,
        "fiche": dict(equipement=1, arbres=["Assassinat:5", "Combat:8", "Finesse:3"], talents=10),
    },
    {
        "nom": "WoW Forever: coordonnées réelles",
        "perso": dict(nom="Reels", royaume="Forever", region="EU", faction="Horde", classe="WARLOCK", niveau=20, traits=TRAITS_REELS),
        "attendu": dict(perso="Reels", classe="demoniste", faction="horde", region="EU", niveau="20", guilde=""),
        "metiers": 0,
        "fiche": dict(equipement=0, arbres=["Affliction:11", "Demonology:0", "Destruction:0"], talents=14),
    },
    {
        "nom": "WoW Forever: onglet incomplet",
        "perso": dict(nom="Partiel", royaume="Forever", region="EU", faction="Horde", classe="ROGUE", niveau=30, traits=TRAITS_INCOMPLET),
        "attendu": dict(perso="Partiel", classe="voleur", specialisation="combat", faction="horde", region="EU", niveau="30", guilde=""),
        "metiers": 0,
        "fiche": dict(equipement=0, arbres=["Assassinat:0", "Combat:3", "Finesse:0"], talents=2),
    },
]

codes = [code_de(c["perso"]) for c in CAS]
for c, code in zip(CAS, codes):
    verifier(code.startswith("BFFR1;"), f"{c['nom']}: le code de l'addon commence par BFFR1 ({code[:20]})")

# Cas faits à la main: ce que le site doit refuser ou nettoyer
MAIN = [
    "",
    "   ",
    "bonjour",
    "BFFR2;n=Test;lv=10",
    "BFFR1;n=;lv=10",
    "BFFR1;n=A;lv=10",
    "BFFR1;n=<script>alert(1)</script>;lv=10",
    "BFFR1;n=" + "A" * 30 + ";lv=10",
    "BFFR1;n=Tester;lv=99;c=ROGUE;f=Horde;rg=EU",
    "BFFR1;n=Tester;lv=abc;c=ROGUE;f=Horde;rg=EU",
    "  BFFR1;n=Tester;lv=12;c=hunter;f=HORDE;rg=eu;ro=TXZ;rs=RP_PVP;g=" + "G" * 80 + "  \n",
    "BFFR1;n=Tester;lv=12;rs=hacker",
    "BFFR1;n=Tester;lv=12;p=Mine:1:2:3,:5:6,Forge:10:50",
    "BFFR1;" + "n=Tester;" * 1500,
    "BFFR1;n=Tester;lv=60;c=WARRIOR;eq=0:1:1:1:1:Zéro,20:1:1:1:1:Vingt,1:0:1:1:1:SansId,2:x:1:1:1:Lettres,3:5:5:5:5,4:123:9999:9:9:Limites",
    "BFFR1;n=Tester;lv=60;c=WARRIOR;tr=A:61,B:x,:3,C:5,D:6,E:7,F:8;ta=Bon:5:1,Rang6:6:1,Arbre4:1:4,Rang0:0:1,<b>Gras</b>:2:1",
    "BFFR1;n=Tester;lv=60;c=WARRIOR;eq=" + ",".join(f"{(i % 19) + 1}:{i + 1}:10:1:0:Objet {i}" for i in range(200)),
    "BFFR1;n=Tester;lv=60;c=WARRIOR;tr=Armes:10,Fureur:5,Protection:0;ta=" + ",".join(f"Talent {i}:1:1" for i in range(300)),
    "BFFR1;n=Tester;lv=60;c=WARRIOR;eq=1:1:1:1:1:Casque,5:2:1:1:1:Torse,6:3:1:1:1:Taille,7:4:1:1:1:Jambes;"
    "ic=1:../../x,5:INV_Chest,6:a b,7:" + "z" * 65 + ",8:inv_ok;tr=A:1;tri=<img src=x>;ta=T:1:1;ti=javascript:alert(1)",
    "BFFR1;n=Tester;lv=60;c=WARRIOR;tr=Armes:10,Fureur:5,Protection:0;"
    "ta=Bon:2:1,Ligne0:1:1,Ligne10:1:1,Col5:1:1,Max6:1:1,Surrang:4:1,Lettres:1:2,Court:1:2,Long:1:2,Espace:1:3,Limite:5:3;"
    "tp=135,015,105,155,166,423,a35,13,1355, 235 ,945",
    # talents pas appris (rang 0): gardés seulement avec une place valide
    "BFFR1;n=Tester;lv=60;c=WARRIOR;tr=Armes:10,Fureur:5,Protection:0;"
    "ta=Un:0:1,Deux:2:1,Trois:0:2,SansPlace:0:1,PlaceFausse:0:1,Surrang:4:1;tp=125,113,414,,015,123",
]
resultat = subprocess.run(["node", os.path.join(ICI, "decoder.mjs")], input=json.dumps(codes + MAIN), capture_output=True,
                          text=True, cwd=ICI)
if resultat.returncode != 0:
    print(resultat.stderr)
    sys.exit(1)
lus = json.loads(resultat.stdout)

for c, lu in zip(CAS, lus[: len(CAS)]):
    verifier(lu["ok"], f"{c['nom']}: le site lit le code ({lu})")
    if not lu["ok"]:
        continue
    for cle, valeur in c["attendu"].items():
        verifier(lu["valeurs"].get(cle) == valeur, f"{c['nom']}: {cle} = {lu['valeurs'].get(cle)!r}, attendu {valeur!r}")
    for cle in ("classe", "region", "faction", "niveau", "ruleset"):
        if cle not in c["attendu"]:
            verifier(cle not in lu["valeurs"], f"{c['nom']}: {cle} ne devrait pas être rempli")
    verifier(len(lu["metiers"]) == c["metiers"], f"{c['nom']}: {len(lu['metiers'])} métiers au lieu de {c['metiers']}")
    if "fiche" in c:
        fiche = lu.get("fiche")
        verifier(fiche is not None, f"{c['nom']}: la fiche est lue")
        if fiche:
            verifier(len(fiche["equipement"]) == c["fiche"]["equipement"], f"{c['nom']}: {len(fiche['equipement'])} pièces")
            verifier([f"{a['nom']}:{a['points']}" for a in fiche["arbres"]] == c["fiche"]["arbres"], f"{c['nom']}: arbres {fiche['arbres']}")
            verifier(len(fiche["talents"]) == c["fiche"]["talents"], f"{c['nom']}: {len(fiche['talents'])} talents")
        verifier(bool(lu.get("specIncertaine")) == c.get("incertaine", False), f"{c['nom']}: spécialisation incertaine = {lu.get('specIncertaine')}")
        if c.get("sans_specialisation"):
            verifier("specialisation" not in lu["valeurs"], f"{c['nom']}: pas de spécialisation sans points")
    elif c["nom"] in ("personnage complet", "sans guilde ni métiers ni rôles"):
        verifier(lu.get("fiche") is None, f"{c['nom']}: sans talents ni équipement, pas de fiche")
    if "avertissements" in c:
        verifier(set(lu["avertissements"]) >= c["avertissements"], f"{c['nom']}: avertissements {lu['avertissements']}")
verifier(lus[0]["metiers"][0] == {"nom": "Herboristerie", "rang": 225, "max": 300}, "métier lu avec son rang")
furtif = next(lu for c, lu in zip(CAS, lus) if c["nom"] == "équipement et talents")
pieces = {p["slot"]: p for p in furtif["fiche"]["equipement"]}
verifier(pieces[1] == dict(slot=1, id=12345, ilvl=62, qualite=4, enchant=0, nom="Casque du Crépuscule", icone="inv_helmet_01"), f"casque lu intact: {pieces.get(1)}")
verifier(pieces[5]["nom"] == "Plastron spécial piégé" and pieces[5]["enchant"] == 1234, f"nom nettoyé, enchantement lu: {pieces.get(5)}")
verifier(pieces[16]["nom"] == "Dague sans nom en mémoire" and pieces[16]["qualite"] == 2, f"objet hors mémoire: nom et couleur lus dans le lien: {pieces.get(16)}")
verifier(pieces[16].get("icone") == "f132345", f"icône donnée comme un numéro de fichier (WoW Forever): gardée comme « f132345 »: {pieces.get(16)}")
verifier({"nom": "Coups précis", "rang": 3, "arbre": 2, "icone": "f67890"} in furtif["fiche"]["talents"], "un talent dont l'icône est un numéro de fichier: gardé en « f… »")
verifier(pieces[1].get("icone") == "inv_helmet_01", f"icône du casque: chemin Windows nettoyé et en minuscules: {pieces.get(1)}")
verifier(pieces[5].get("icone") == "inv_chest_cloth_05", f"icône du plastron: extension .blp retirée: {pieces.get(5)}")
verifier(furtif["fiche"]["arbres"][0].get("icone") == "ability_rogue_eviscerate" and furtif["fiche"]["arbres"][1].get("icone") == "f12345", "icône d'arbre lue (chemin) et numéro de fichier gardé en « f… »")
verifier({"nom": "Malice", "rang": 5, "arbre": 1, "icone": "ability_racial_bloodrage", "ligne": 1, "col": 3, "max": 5} in furtif["fiche"]["talents"], "icône d'un talent lue")
verifier({"nom": "Précision", "rang": 2, "arbre": 2, "icone": "inv_weapon_shortblade_05", "ligne": 2, "col": 2, "max": 5} in furtif["fiche"]["talents"], "l'icône suit son talent (même ordre)")

forever = next(lu for c, lu in zip(CAS, lus) if c["nom"].startswith("WoW Forever"))
ft = {t["nom"]: t for t in forever["fiche"]["talents"]}
verifier([a["nom"] for a in forever["fiche"]["arbres"]] == ["Assassinat", "Combat", "Finesse"], "onglets remis dans l'ordre du jeu (orderIndex)")
verifier({n for n, t in ft.items() if t["rang"] > 0} == {"Malice", "Précision", "Coups précis", "Initiative"}, f"talents appris: {ft.keys()}")
verifier(set(ft) == {"Malice", "Vitalité", "Précision", "Coups précis", "Frappe", "Initiative", "A", "B", "C", "D"}, f"tous les talents de l'arbre sont envoyés, appris ou non: {set(ft)}")
verifier(all(t["ligne"] and t["col"] and t["max"] for t in ft.values()), "chaque talent a sa place, appris ou non")
verifier((ft["Vitalité"]["rang"], ft["Vitalité"]["arbre"], ft["Vitalité"]["ligne"], ft["Vitalité"]["col"], ft["Vitalité"]["max"]) == (0, 1, 1, 2, 3), f"talent pas appris: rang 0 avec sa place: {ft['Vitalité']}")
verifier((ft["Frappe"]["rang"], ft["Frappe"]["arbre"], ft["Frappe"]["ligne"], ft["Frappe"]["col"]) == (0, 2, 3, 4), f"Frappe pas appris en rangée 3, colonne 4: {ft['Frappe']}")
verifier((ft["Malice"]["arbre"], ft["Malice"]["ligne"], ft["Malice"]["col"], ft["Malice"]["max"], ft["Malice"]["rang"]) == (1, 1, 3, 5, 5), f"Malice: {ft['Malice']}")
verifier((ft["Précision"]["arbre"], ft["Précision"]["ligne"], ft["Précision"]["col"]) == (2, 1, 1), f"Précision en haut à gauche de Combat: {ft['Précision']}")
verifier((ft["Coups précis"]["ligne"], ft["Coups précis"]["col"], ft["Coups précis"]["rang"], ft["Coups précis"]["max"]) == (2, 2, 3, 5), f"Coups précis: {ft['Coups précis']}")
verifier((ft["Initiative"]["arbre"], ft["Initiative"]["ligne"], ft["Initiative"]["col"]) == (3, 2, 3), f"Initiative dans Finesse: {ft['Initiative']}")
reels = next(lu for c, lu in zip(CAS, lus) if c["nom"] == "WoW Forever: coordonnées réelles")
pt = {x["nom"]: x for x in reels["fiche"]["talents"]}
place = lambda n: (pt[n]["arbre"], pt[n]["ligne"], pt[n]["col"], pt[n]["max"])
verifier(place("Vie volée améliorée") == (1, 1, 1, 2), f"Y=2120 et Y=2130 = même rangée 1: {pt['Vie volée améliorée']}")
verifier(place("Suppression") == (1, 1, 2, 5) and place("Corruption améliorée") == (1, 1, 3, 5), f"Suppression et Corruption en rangée 1: {pt['Suppression']}")
verifier(place("Fouet de malédiction") == (1, 2, 1, 2) and place("Moisson d'âmes") == (1, 2, 2, 2) and place("Drains améliorés") == (1, 2, 3, 3), "rangée 2 d'Affliction")
verifier(place("Malédiction amplifiée") == (1, 3, 3, 1) and place("Fléau d'agonie amélioré") == (1, 3, 1, 2), "rangée 3 (Y=3320 et 3330 ensemble)")
verifier(place("Ruine") == (1, 7, 4, 1), f"dernière rangée 7, colonne 4: {pt['Ruine']}")
verifier(place("Maîtrise du démon") == (2, 1, 1, 3) and place("Métamorphose") == (2, 7, 4, 1), "deuxième onglet décalé de 4000")
verifier(place("Cataclysme") == (3, 1, 2, 5) and place("Embrasement") == (3, 3, 3, 3) and place("Dévastation") == (3, 5, 1, 2),
         f"troisième onglet à trois colonnes: colonnes retrouvées par la position: {pt['Cataclysme']} {pt['Dévastation']}")
verifier(reels["fiche"]["arbres_points"] == [11, 0, 0] if "arbres_points" in reels["fiche"] else True, "points")
partiel = next(lu for c, lu in zip(CAS, lus) if c["nom"] == "WoW Forever: onglet incomplet")
verifier(all("ligne" not in x and "col" not in x for x in partiel["fiche"]["talents"]), f"onglet qui ne couvre pas 4 colonnes: talents gardés sans place (liste): {partiel['fiche']['talents']}")
verifier(ft["Malice"].get("icone") == "f132001" and forever["fiche"]["arbres"][1].get("icone") == "f626002", "icônes en numéros de fichier gardées")

diag = code_de(next(c["perso"] for c in CAS if c["nom"].startswith("WoW Forever: talents")), "Diagnostic")
verifier("lecture=3 arbres, 10 talents dont 4 appris, 10 placés" in diag and "points=5/8/3" in diag, f"/bf diag: résumé de la lecture: {diag}")
verifier("treeID=1117" in diag and "configID=77" in diag and "nœuds=10" in diag and "texture de la tête" in diag, "/bf diag: arbre, config, nœuds et texture")
verifier("onglet1 X=" in diag and "onglet3 Y=" in diag and "appris=" in diag and "#1@" in diag, f"/bf diag: coordonnées brutes par onglet et talents appris: {diag[-420:]}")
verifier("champs d'un nœud=" in diag and "posX/posY du 1er=" in diag, "/bf diag: champs d'un nœud")
verifier("Forever" not in diag.replace("WoW Forever", ""), "/bf diag: aucun nom de personnage dans la ligne")

refuses = lus[len(CAS):]
for texte, lu in zip(MAIN[:8], refuses[:8]):
    verifier(not lu["ok"], f"refusé: {texte[:40]!r}")
verifier(refuses[8]["ok"] and "niveau" not in refuses[8]["valeurs"], "niveau 99 ignoré (le reste est gardé)")
verifier(refuses[9]["ok"] and "niveau" not in refuses[9]["valeurs"], "niveau illisible ignoré")
r = refuses[10]
verifier(r["ok"] and r["valeurs"]["classe"] == "chasseur" and r["valeurs"]["faction"] == "horde" and r["valeurs"]["region"] == "EU",
         "espaces autour, majuscules et minuscules acceptés")
verifier(r["valeurs"]["roles"] == ["tank"] and len(r["valeurs"]["guilde"]) == 40, "rôles inconnus ignorés, guilde coupée à 40")
verifier(r["valeurs"]["ruleset"] == "rp_pvp", "type de serveur en majuscules accepté")
verifier(refuses[11]["ok"] and "ruleset" not in refuses[11]["valeurs"], "type de serveur inconnu ignoré")
verifier(refuses[12]["ok"] and refuses[12]["metiers"] == [{"nom": "Forge", "rang": 10, "max": 50}], "métiers mal formés ignorés")
verifier(not refuses[13]["ok"], "texte trop long refusé")
eq_mal = refuses[14]["fiche"]["equipement"]
verifier([p["slot"] for p in eq_mal] == [4] and eq_mal[0]["ilvl"] == 0 and eq_mal[0]["qualite"] == 1,
         f"équipement mal formé refusé (emplacement 0 ou 20, objet 0, lettres, nom manquant); limites remplacées: {eq_mal}")
ar_mal = refuses[15]["fiche"]
verifier([a["nom"] for a in ar_mal["arbres"]] == ["C", "D", "E"], f"arbres mal formés refusés (61 points, lettres, nom vide), trois au plus: {ar_mal['arbres']}")
verifier(all(0 <= a["points"] <= 60 for a in ar_mal["arbres"]), "points d'arbre bornés")
verifier([t["nom"] for t in ar_mal["talents"]] == ["Bon", "bGras/b"], f"talents hors limites refusés (rang 6, arbre 4, rang 0), < et > retirés: {ar_mal['talents']}")
verifier(len(refuses[16]["fiche"]["equipement"]) <= 17, "pas plus de 17 pièces")
verifier(len(refuses[17]["fiche"]["talents"]) <= 70, f"pas plus de 70 talents: {len(refuses[17]['fiche']['talents'])}")
ic_mal = refuses[18]["fiche"]
verifier([p.get("icone") for p in ic_mal["equipement"]] == [None, "inv_chest", None, None], f"icônes piégées refusées (chemin, espace, trop long), majuscules acceptées en minuscules: {ic_mal['equipement']}")
verifier("icone" not in ic_mal["arbres"][0] and "icone" not in ic_mal["talents"][0], "icônes d'arbre et de talent piégées refusées")

tp_mal = refuses[19]["fiche"]["talents"]
places = {t["nom"]: (t.get("ligne"), t.get("col"), t.get("max")) for t in tp_mal}
verifier(places["Bon"] == (1, 3, 5), f"place valide lue: {places['Bon']}")
for nom in ("Ligne0", "Ligne10", "Col5", "Max6", "Surrang", "Lettres", "Court", "Long"):
    verifier(places[nom] == (None, None, None), f"place refusée (le talent est gardé sans place): {nom} {places[nom]}")
verifier(places["Espace"] == (2, 3, 5), f"espaces autour d'une place tolérés: {places['Espace']}")
verifier(places["Limite"] == (9, 4, 5), f"place aux limites acceptée: {places['Limite']}")
combattant = next(t for t in furtif["fiche"]["talents"] if t["nom"] == "Coups précis")
verifier("ligne" not in combattant and "col" not in combattant and "max" not in combattant, "talent dont le jeu ne donne pas la place: aucune place inventée")

zero = {t["nom"]: t for t in refuses[20]["fiche"]["talents"]}
verifier(set(zero) == {"Un", "Deux", "Trois", "Surrang"}, f"rang 0 gardé seulement avec une place valide: {set(zero)}")
verifier("ligne" not in zero["Surrang"] and zero["Surrang"]["rang"] == 4, f"rang plus grand que le max: la place est refusée, le talent appris reste: {zero['Surrang']}")
verifier(zero["Un"]["rang"] == 0 and zero["Un"]["ligne"] == 1 and zero["Un"]["col"] == 2 and zero["Un"]["max"] == 5, f"rang 0: {zero['Un']}")
verifier(zero["Trois"]["arbre"] == 2 and zero["Trois"]["ligne"] == 4, f"talent pas appris dans le 2e arbre: {zero['Trois']}")
verifier(len(code_de(next(c["perso"] for c in CAS if c["nom"].startswith("WoW Forever: talents")))) < 9000, "le code reste sous la limite du site")

print(f"{total - len(echecs)}/{total} vérifications réussies")
sys.exit(1 if echecs else 0)
