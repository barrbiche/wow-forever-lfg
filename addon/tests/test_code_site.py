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

local ns = {}
for _, f in ipairs({ "Data.lua", "Core.lua" }) do
  assert(loadfile(ADDON_DIR .. "/" .. f))("BabillardForeverFR", ns)
end
ns.db = { myRoles = PERSO.roles or {} }
return ns.BuildExportCode()
""", ADDON)


CAS = [
    {
        "nom": "personnage complet",
        "perso": dict(nom="Barrbiche", royaume="Forever", region="EU", faction="Horde", classe="ROGUE", niveau=60,
                      guilde="Les Pas Fins", metiers=[["Herboristerie", 225, 300], ["Pêche", 75, 150]],
                      roles={"TANK": True, "DPS": True}),
        "attendu": dict(perso="Barrbiche", niveau="60", classe="voleur", faction="horde", region="EU",
                        guilde="Les Pas Fins", roles=["tank", "dps"]),
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
    "  BFFR1;n=Tester;lv=12;c=hunter;f=HORDE;rg=eu;ro=TXZ;g=" + "G" * 80 + "  \n",
    "BFFR1;n=Tester;lv=12;p=Mine:1:2:3,:5:6,Forge:10:50",
    "BFFR1;" + "n=Tester;" * 400,
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
    for cle in ("classe", "region", "faction", "niveau"):
        if cle not in c["attendu"]:
            verifier(cle not in lu["valeurs"], f"{c['nom']}: {cle} ne devrait pas être rempli")
    verifier(len(lu["metiers"]) == c["metiers"], f"{c['nom']}: {len(lu['metiers'])} métiers au lieu de {c['metiers']}")
    if "avertissements" in c:
        verifier(set(lu["avertissements"]) >= c["avertissements"], f"{c['nom']}: avertissements {lu['avertissements']}")
verifier(lus[0]["metiers"][0] == {"nom": "Herboristerie", "rang": 225, "max": 300}, "métier lu avec son rang")

refuses = lus[len(CAS):]
for texte, lu in zip(MAIN[:8], refuses[:8]):
    verifier(not lu["ok"], f"refusé: {texte[:40]!r}")
verifier(refuses[8]["ok"] and "niveau" not in refuses[8]["valeurs"], "niveau 99 ignoré (le reste est gardé)")
verifier(refuses[9]["ok"] and "niveau" not in refuses[9]["valeurs"], "niveau illisible ignoré")
r = refuses[10]
verifier(r["ok"] and r["valeurs"]["classe"] == "chasseur" and r["valeurs"]["faction"] == "horde" and r["valeurs"]["region"] == "EU",
         "espaces autour, majuscules et minuscules acceptés")
verifier(r["valeurs"]["roles"] == ["tank"] and len(r["valeurs"]["guilde"]) == 40, "rôles inconnus ignorés, guilde coupée à 40")
verifier(refuses[11]["ok"] and refuses[11]["metiers"] == [{"nom": "Forge", "rang": 10, "max": 50}], "métiers mal formés ignorés")
verifier(not refuses[12]["ok"], "texte trop long refusé")

print(f"{total - len(echecs)}/{total} vérifications réussies")
sys.exit(1 if echecs else 0)
