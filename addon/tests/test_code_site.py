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


def code_de(perso):
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
local ADDON_DIR = ...
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
  GetTalentTabInfo = function(i) return PERSO.arbres[i].nom, "icone", PERSO.arbres[i].points, "fond" end
  GetNumTalents = function(i) return #PERSO.arbres[i].talents end
  GetTalentInfo = function(i, j) local t = PERSO.arbres[i].talents[j]; return t[1], "icone", 1, 1, t[2], t[3] end
end

local ns = {}
for _, f in ipairs({ "Data.lua", "Core.lua" }) do
  assert(loadfile(ADDON_DIR .. "/" .. f))("BabillardForeverFR", ns)
end
ns.db = { myRoles = PERSO.roles or {}, ruleset = PERSO.ruleset }
return ns.BuildExportCode()
""", ADDON)


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
    1: dict(id=12345, nom="Casque du Crépuscule", ilvl=62, qualite=4, enchant=0),
    5: dict(id=22222, nom="Plastron; spécial|piégé", ilvl=58, qualite=3, enchant=1234),
    16: dict(id=33333, nom="Dague sans nom en mémoire", ilvl=0, qualite=2, enchant=0, horsMemoire=True),
}
ARBRES_ROGUE = [
    dict(nom="Assassinat", points=5, talents=[["Malice", 5, 5]]),
    dict(nom="Combat", points=31, talents=[["Précision", 2, 5], ["Coups précis", 3, 3]]),
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
    "BFFR1;" + "n=Tester;" * 800,
    "BFFR1;n=Tester;lv=60;c=WARRIOR;eq=0:1:1:1:1:Zéro,20:1:1:1:1:Vingt,1:0:1:1:1:SansId,2:x:1:1:1:Lettres,3:5:5:5:5,4:123:9999:9:9:Limites",
    "BFFR1;n=Tester;lv=60;c=WARRIOR;tr=A:61,B:x,:3,C:5,D:6,E:7,F:8;ta=Bon:5:1,Rang6:6:1,Arbre4:1:4,Rang0:0:1,<b>Gras</b>:2:1",
    "BFFR1;n=Tester;lv=60;c=WARRIOR;eq=" + ",".join(f"{(i % 19) + 1}:{i + 1}:10:1:0:Objet {i}" for i in range(200)),
    "BFFR1;n=Tester;lv=60;c=WARRIOR;tr=Armes:10,Fureur:5,Protection:0;ta=" + ",".join(f"Talent {i}:1:1" for i in range(300)),
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
verifier(pieces[1] == dict(slot=1, id=12345, ilvl=62, qualite=4, enchant=0, nom="Casque du Crépuscule"), f"casque lu intact: {pieces.get(1)}")
verifier(pieces[5]["nom"] == "Plastron spécial piégé" and pieces[5]["enchant"] == 1234, f"nom nettoyé, enchantement lu: {pieces.get(5)}")
verifier(pieces[16]["nom"] == "Dague sans nom en mémoire" and pieces[16]["qualite"] == 2, f"objet hors mémoire: nom et couleur lus dans le lien: {pieces.get(16)}")
verifier({"nom": "Coups précis", "rang": 3, "arbre": 2} in furtif["fiche"]["talents"], "un talent lu avec son rang et son arbre")

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

print(f"{total - len(echecs)}/{total} vérifications réussies")
sys.exit(1 if echecs else 0)
