"""Tests de la logique pure de lfgFR, exécutés dans un vrai Lua 5.1 (celui du jeu).

    python3 addon/tests/test_addon.py

Ne teste pas l'interface ni les événements du jeu (impossible hors jeu): voir addon/README.md.
"""
import base64
import json
import os
import sys
import zlib

from lupa.lua51 import LuaRuntime

RACINE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "lfgFR")
echecs = []
total = 0


def verifier(condition, message):
    global total
    total += 1
    if not condition:
        echecs.append(message)
        print("ÉCHEC:", message)


def runtime():
    lua = LuaRuntime(unpack_returned_tuples=True)
    lua.execute("ns = { version = 'test' }")
    return lua


def charger(lua, fichier):
    lua.execute(
        'local f = assert(loadfile("%s")); f("lfgFR", ns)' % os.path.join(RACINE, fichier).replace("\\", "/")
    )


# ------------------------------------------------------------
# Analyseur de messages
# ------------------------------------------------------------
lua = runtime()
charger(lua, "Parser.lua")
analyser = lua.eval("function(t) local r = ns.Parser.analyser(t); if not r then return nil end; "
                    "return { type = r.type, tank = r.tank, heal = r.heal, dps = r.dps, "
                    "donjon = r.donjon and r.donjon.id or '', nmin = r.niveauMin or 0, nmax = r.niveauMax or 0 } end")


def cas(message, type_=None, donjon="", tank=0, heal=0, dps=0, nmin=0, nmax=0):
    r = analyser(message)
    if type_ is None:
        verifier(r is None, f"« {message} » ne devrait pas être une annonce (obtenu {dict(r) if r else None})")
        return
    if r is None:
        verifier(False, f"« {message} » devrait être {type_}, obtenu rien")
        return
    attendu = dict(type=type_, donjon=donjon, tank=tank, heal=heal, dps=dps, nmin=nmin, nmax=nmax)
    obtenu = {k: r[k] for k in attendu}
    verifier(obtenu == attendu, f"« {message} »: attendu {attendu}, obtenu {obtenu}")


cas("LFM RFC need tank and heal", "LFM", "Ragefire Chasm", tank=1, heal=1)
cas("lfm sfk 2 dps", "LFM", "Shadowfang Keep", dps=2)
cas("Cherche tank pour Mortemines", "LFM", "The Deadmines", tank=1)
cas("Heal lfg RFC", "LFG", "Ragefire Chasm", heal=1)
cas("cherche un groupe pour les Cavernes des Lamentations", "LFG", "Wailing Caverns")
cas("LFM SM cath x2 dps lvl 38-42", "LFM", "Scarlet Monastery: Cathedral", dps=2, nmin=38, nmax=42)
cas("LFM DM East tank heal", "LFM", "Dire Maul: East", tank=1, heal=1)
cas("LFM DM 2 dps", "LFM", "The Deadmines", dps=2)
cas("LF2M BFD", "LFM", "Blackfathom Deeps")
cas("Besoin d'un healer pour Gnomeregan", "LFM", "Gnomeregan", heal=1)
cas("Cherche soigneur Uldaman", "LFM", "Uldaman", heal=1)
cas("LFM Monastère écarlate cathédrale tank", "LFM", "Scarlet Monastery: Cathedral", tank=1)
cas("LF healer for Deadmines", "LFM", "The Deadmines", heal=1)
cas("dispo pour RFC, heal", "LFG", "Ragefire Chasm", heal=1)
cas("Tank LFG", "LFG", tank=1)
cas("LFM Onyxia 40 all classes", "LFM", "Onyxia's Lair")
cas("LFM Hall of Thanes tank heal 3 dps lvl 15", "LFM", "Hall of Thanes", tank=1, heal=1, dps=3, nmin=15, nmax=15)
cas("LFM Zul’Farrak 2x dps", "LFM", "Zul'Farrak", dps=2)
cas("lfm zf/mara tank", "LFM", "Zul'Farrak", tank=1)  # la première activité nommée gagne
cas("Recherche groupe pour Maraudon niv 46", "LFG", "Maraudon", nmin=46, nmax=46)
# Ce qui ne doit PAS ressortir
cas("WTS Linen Cloth 20g")
cas("LFM boost RFC 5g")
cas("La guilde Les Bâtisseurs recrute des joueurs sociaux")
cas("bonjour à tous")
cas("lfm")
cas("cherche groupe")
cas("on a fini RFC hier, c'était long")
cas("")
cas("x" * 500)

# Composer: ce qu'on publie doit se relire correctement
lua.execute("""
function composerEtRelire(opts)
  local texte = ns.Parser.composer(opts)
  local r = ns.Parser.analyser(texte)
  return texte, r and r.type or '', r and r.donjon and r.donjon.id or '', r and r.tank or -1, r and r.heal or -1,
         r and r.dps or -1, r and r.niveauMin or 0, r and r.niveauMax or 0
end
""")
composer = lua.eval("composerEtRelire")
texte, t, d, tk, hl, dp, nmin, nmax = composer(lua.table_from({
    "type": "LFM", "abr": "RFC", "tank": 1, "heal": 1, "dps": 3, "niveau": "15-20", "commentaire": "Salut!"}))
verifier(texte == "LFM RFC - tank heal 3 dps lvl 15-20 - Salut! [lfgFR]", f"composer LFM: {texte}")
verifier((t, d, tk, hl, dp, nmin, nmax) == ("LFM", "Ragefire Chasm", 1, 1, 3, 15, 20), "relecture LFM")
texte, t, d, tk, hl, dp, nmin, nmax = composer(lua.table_from({
    "type": "LFG", "abr": "SM Cathedrale", "heal": 1, "niveau": 40}))
verifier((t, d, hl, tk, dp) == ("LFG", "Scarlet Monastery: Cathedral", 1, 0, 0), f"relecture LFG: {texte}")
# Chaque donjon publié par l'addon doit se relire comme lui-même (sinon l'abréviation est mal choisie)
ids = lua.eval("(function() local t = {}; for _, d in ipairs(ns.Parser.DONJONS) do t[#t + 1] = d.abr .. '|' .. d.id end; return t end)()")
for entree in ids.values():
    abr, id_ = entree.split("|", 1)
    texte, t, d, *_ = composer(lua.table_from({"type": "LFM", "abr": abr, "tank": 1}))
    verifier(d == id_, f"abréviation « {abr} » relue comme « {d} » au lieu de « {id_} »")

age = lua.eval("ns.Parser.age")
verifier((age(5), age(59), age(60), age(185)) == ("5 s", "59 s", "1 min", "3 min"), "âge lisible")

# ------------------------------------------------------------
# Encodage: comparé à Python (json, base64, adler32)
# ------------------------------------------------------------
lua2 = runtime()
charger(lua2, "Parser.lua")
charger(lua2, "Export.lua")
# Les octets bruts passent par un runtime sans conversion de texte (encoding=None).
lua_octets = LuaRuntime(encoding=None)
lua_octets.execute("ns = { version = 'test' }")
charger(lua_octets, "Parser.lua")
charger(lua_octets, "Export.lua")
b64 = lua_octets.eval("ns.Export.base64")
for brut in [b"", b"M", b"Ma", b"Man", "Éric — «Voleur»".encode(), bytes(range(256))]:
    verifier(b64(brut) == base64.b64encode(brut), f"base64 de {brut[:12]!r}")
somme = lua_octets.eval("ns.Export.somme")
for brut in [b"", b"a", "Éric".encode(), b"x" * 5000]:
    verifier(somme(brut) == ("%08x" % zlib.adler32(brut)).encode(), f"adler32 de {brut[:8]!r}")

attendu = {
    "v": 1,
    "perso": {"nom": 'Éric "le" Rouge\\', "niveau": 42, "faction": "horde", "notes": "ligne\nsuivante\t"},
    "equipement": [[1, 12345, "Casque d'épreuve", 25, 3, 0], [2, 99, "Collier", 20, 2, 0]],
    "vide": [],
}
encode = lua2.eval("ns.Export.encoder")


def en_lua(valeur):
    if isinstance(valeur, dict):
        return lua2.table_from({k: en_lua(v) for k, v in valeur.items()})
    if isinstance(valeur, list):
        return lua2.table_from([en_lua(v) for v in valeur])
    return valeur


texte = encode(en_lua(attendu))
format_, crc, corps = texte.split(":", 2)
brut = base64.b64decode(corps)
verifier(format_ == "LFGFR1", "préfixe de format")
verifier(crc == "%08x" % zlib.adler32(brut), "somme de contrôle du texte exporté")
verifier(json.loads(brut.decode("utf-8")) == attendu, "le JSON relu par Python est identique à l'original")
verifier(brut == json.dumps(attendu, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode(), "JSON trié et compact")

# ------------------------------------------------------------
# Lecture du personnage avec une fausse API du jeu
# ------------------------------------------------------------
lua3 = runtime()
lua3.execute("""
UnitName = function() return "Barrbiche" end
GetRealmName = function() return "Forever" end
UnitLevel = function() return 60 end
UnitClass = function() return "Voleur", "ROGUE" end
UnitRace = function() return "Orc", "Orc" end
UnitFactionGroup = function() return "Horde", "Horde" end
GetCurrentRegion = function() return 3 end
GetGuildInfo = function() return "Les Pas Fins", "Chef", 0 end
GetLocale = function() return "frFR" end
GetBuildInfo = function() return "1.60.1", "69913", "Nov 4 2026", 16001 end
time = function() return 1790000000 end
GetNumTalentTabs = function() return 2 end
GetTalentTabInfo = function(i) if i == 1 then return "Assassinat", "icone", 31, "fond", 0 else return "Finesse", "icone", 20, "fond", 0 end end
GetNumTalents = function(i) return 3 end
GetTalentInfo = function(tab, i)
  if i == 3 then return "Vide", "icone", 2, 2, 0, 5 end
  return "Talent " .. tab .. "-" .. i, "icone", i, 1, i + 1, 5
end
GetInventoryItemLink = function(unit, slot)
  if slot == 1 then return "|cff0070dd|Hitem:12345:2564:0:0:0:0:0:0:60|h[Casque d'épreuve]|h|r" end
  if slot == 16 then return "|cffffffff|Hitem:777::::::::60|h[Dague]|h|r" end
end
GetItemInfo = function(lien)
  if lien:find("12345") then return "Casque d'épreuve", lien, 3, 25 end
  return nil
end
local ouvert = false
ExpandSkillHeader = function(i) ouvert = true end
GetNumSkillLines = function() return 6 end
GetSkillLineInfo = function(i)
  local lignes = {
    { "Compétences d'armes", true }, { "Dagues", false, true, 300, 0, 0, 300 },
    { "Métiers", true }, { "Herboristerie", false, true, 225, 0, 0, 300 },
    { "Compétences secondaires", true }, { "Pêche", false, true, 75, 0, 0, 150 },
  }
  local l = lignes[i]
  return l[1], l[2], l[3], l[4], l[5], l[6], l[7]
end
""")
charger(lua3, "Parser.lua")
charger(lua3, "Export.lua")
texte, donnees, etat = lua3.eval("ns.Export.exporter")()
corps = json.loads(base64.b64decode(texte.split(":", 2)[2]).decode("utf-8"))
verifier(corps["perso"]["nom"] == "Barrbiche" and corps["perso"]["faction"] == "horde", "perso: nom et faction")
verifier(corps["perso"]["region"] == "EU" and corps["perso"]["classeJeton"] == "ROGUE", "perso: région et classe")
verifier(corps["perso"]["guilde"] == "Les Pas Fins" and corps["perso"]["niveau"] == 60, "perso: guilde et niveau")
verifier(corps["jeu"] == 16001 and corps["quand"] == 1790000000, "version du jeu et date")
verifier(len(corps["talents"]) == 2 and corps["talents"][0]["points"] == 31, "talents: onglets")
verifier(len(corps["talents"][0]["talents"]) == 2, "talents: seuls ceux avec des points sont gardés")
verifier(corps["talents"][0]["talents"][0] == ["Talent 1-1", 2, 5, 1, 1], f"talents: détail {corps['talents'][0]['talents'][0]}")
verifier([e[0] for e in corps["equipement"]] == [1, 16], "équipement: emplacements")
verifier(corps["equipement"][0] == [1, 12345, "Casque d'épreuve", 25, 3, 2564], f"équipement: objet complet {corps['equipement'][0]}")
verifier(corps["equipement"][1][2] == "Dague", "équipement: nom pris dans le lien si l'objet n'est pas en cache")
verifier([m[0] for m in corps["metiers"]] == ["Herboristerie", "Pêche"], f"métiers: seuls les métiers {corps['metiers']}")
verifier(etat["talents"] == 2 and etat["equipement"] == 2 and etat["metiers"] == 2, "état de lecture")

# Une API absente ne doit pas planter l'export
lua4 = runtime()
charger(lua4, "Parser.lua")
charger(lua4, "Export.lua")
texte, donnees, etat = lua4.eval("ns.Export.exporter")()
corps = json.loads(base64.b64decode(texte.split(":", 2)[2]).decode("utf-8"))
verifier(corps["talents"] == [] and corps["equipement"] == [] and corps["metiers"] == [], "sans API: sections vides")
verifier(etat["erreurTalents"] is not None, "sans API: l'erreur de talents est signalée")

print(f"{total - len(echecs)}/{total} vérifications réussies")
sys.exit(1 if echecs else 0)
