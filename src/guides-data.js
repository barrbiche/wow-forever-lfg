import { NOMS_BOSS_FR } from './guides/noms-boss.js'
import { DONJONS_A } from './guides/donjons-a.js'
import { DONJONS_B } from './guides/donjons-b.js'
import { DONJONS_C } from './guides/donjons-c.js'

// Données et petits outils de la page « Guides ». Le texte des guides utilise trois formes:
//   [[Nom]] ou [[Nom|Autre]]  un boss ou un PNJ. Jeu en anglais: Nom. Jeu en français: le nom français vérifié (table
//                              noms-boss.js) ou, à défaut, Nom tel quel. « Autre » force le nom français.
//   {{Capacité|explication}}   une capacité. Jeu en anglais: Capacité. Jeu en français: l'explication, en français simple.
//   {{Capacité}}               une capacité qu'on ne traduit pas: le nom anglais reste dans les deux cas.
// Rien n'est inventé: chaque guide cite ses sources (SOURCES) et liste ce qui manque ou se contredit.

const IV = 'https://www.icy-veins.com'
const KAMI = 'https://kami-labs.fr'

export const SOURCES = {
  'iv-rfc': { site: 'Icy Veins', titre: 'Ragefire Chasm (Forever)', url: `${IV}/wow-forever/ragefire-chasm-guide` },
  'iv-hot': { site: 'Icy Veins', titre: 'Hall of Thanes (Forever)', url: `${IV}/wow-forever/hall-of-thanes-guide` },
  'iv-rol': { site: 'Icy Veins', titre: 'Ruins of Lordaeron (Forever)', url: `${IV}/wow-forever/ruins-of-lordaeron-guide` },
  'iv-wc': { site: 'Icy Veins', titre: 'Wailing Caverns (Forever)', url: `${IV}/wow-forever/wailing-caverns-guide` },
  'iv-dm': { site: 'Icy Veins', titre: 'Deadmines (Forever)', url: `${IV}/wow-forever/deadmines-guide` },
  'iv-sfk': { site: 'Icy Veins', titre: 'Shadowfang Keep (Forever)', url: `${IV}/wow-forever/shadowfang-keep-guide` },
  'iv-stock': { site: 'Icy Veins', titre: 'The Stockade (Forever)', url: `${IV}/wow-forever/the-stockade-guide` },
  'iv-exc': { site: 'Icy Veins', titre: 'Excavation Site: Wetlands (Forever)', url: `${IV}/wow-forever/excavation-site-wetlands-guide` },
  'iv-bfd': { site: 'Icy Veins', titre: 'Blackfathom Deeps (Classic)', url: `${IV}/wow-classic/blackfathom-deeps-dungeon-guide` },
  'iv-gnomer': { site: 'Icy Veins', titre: 'Gnomeregan (Classic)', url: `${IV}/wow-classic/gnomeregan-dungeon-guide` },
  'iv-rfk': { site: 'Icy Veins', titre: 'Razorfen Kraul (Classic)', url: `${IV}/wow-classic/razorfen-kraul-dungeon-guide` },
  'iv-sm-g': { site: 'Icy Veins', titre: 'Scarlet Monastery: Graveyard (Classic)', url: `${IV}/wow-classic/scarlet-monastery-graveyard-dungeon-guide` },
  'iv-sm-l': { site: 'Icy Veins', titre: 'Scarlet Monastery: Library (Classic)', url: `${IV}/wow-classic/scarlet-monastery-library-dungeon-guide` },
  'iv-sm-a': { site: 'Icy Veins', titre: 'Scarlet Monastery: Armory (Classic)', url: `${IV}/wow-classic/scarlet-monastery-armory-dungeon-guide` },
  'iv-sm-c': { site: 'Icy Veins', titre: 'Scarlet Monastery: Cathedral (Classic)', url: `${IV}/wow-classic/scarlet-monastery-cathedral-dungeon-guide` },
  'iv-rfd': { site: 'Icy Veins', titre: 'Razorfen Downs (Classic)', url: `${IV}/wow-classic/razorfen-downs-dungeon-guide` },
  'iv-uld': { site: 'Icy Veins', titre: 'Uldaman (Classic)', url: `${IV}/wow-classic/uldaman-dungeon-guide` },
  'iv-zf': { site: 'Icy Veins', titre: "Zul'Farrak (Classic)", url: `${IV}/wow-classic/zul-farrak-dungeon-guide` },
  'iv-mara': { site: 'Icy Veins', titre: 'Maraudon (Classic)', url: `${IV}/wow-classic/maraudon-dungeon-guides-hub` },
  'iv-st': { site: 'Icy Veins', titre: 'Sunken Temple (Classic)', url: `${IV}/wow-classic/sunken-temple-dungeon-guide` },
  'iv-brd-d': { site: 'Icy Veins', titre: 'Blackrock Depths: Detention Block (Classic)', url: `${IV}/wow-classic/blackrock-depths-detention-block-dungeon-guide` },
  'iv-brd-u': { site: 'Icy Veins', titre: 'Blackrock Depths: Upper City (Classic)', url: `${IV}/wow-classic/blackrock-depths-upper-city-dungeon-guide` },
  'iv-lbrs': { site: 'Icy Veins', titre: 'Lower Blackrock Spire (Classic)', url: `${IV}/wow-classic/lower-blackrock-spire-guide` },
  'iv-ubrs': { site: 'Icy Veins', titre: 'Upper Blackrock Spire (Classic)', url: `${IV}/wow-classic/upper-blackrock-spire-guide` },
  'iv-scholo': { site: 'Icy Veins', titre: 'Scholomance (Classic)', url: `${IV}/wow-classic/scholomance-dungeon-guide` },
  'iv-strat-l': { site: 'Icy Veins', titre: 'Stratholme: Live (Classic)', url: `${IV}/wow-classic/stratholme-live-dungeon-guide` },
  'iv-strat-u': { site: 'Icy Veins', titre: 'Stratholme: Undead (Classic)', url: `${IV}/wow-classic/stratholme-undead-dungeon-guide` },
  'iv-dme': { site: 'Icy Veins', titre: 'Dire Maul: East (Classic)', url: `${IV}/wow-classic/dire-maul-east-dungeon-guide` },
  'iv-dmw': { site: 'Icy Veins', titre: 'Dire Maul: West (Classic)', url: `${IV}/wow-classic/dire-maul-west-dungeon-guide` },
  'iv-dmn': { site: 'Icy Veins', titre: 'Dire Maul: North (Classic)', url: `${IV}/wow-classic/dire-maul-north-dungeon-guide` },
  'iv-blackmaw': {
    site: 'Icy Veins',
    titre: 'Everything We Know About Blackmaw Hold',
    url: `${IV}/wow-forever/news/everything-we-know-about-blackmaw-hold-in-wow-forever/`,
  },
  'iv-news-9': {
    site: 'Icy Veins',
    titre: "Krol'dok Stronghold level range change, all 9 new dungeons",
    url: `${IV}/wow/news/kroldok-stronghold-dungeon-level-range-change-all-9-dungeons-listed/`,
  },
  'mg-hot': { site: 'Method', titre: 'Hall of Thanes', url: 'https://www.method.gg/wow-forever/dungeons/hall-of-thanes' },
  'mg-exc': { site: 'Method', titre: 'Excavation Site: Wetlands', url: 'https://www.method.gg/wow-forever/dungeons/excavation-site-wetlands' },
  'mg-dal': { site: 'Method', titre: 'City of Dalaran', url: 'https://www.method.gg/wow-forever/dungeons/city-of-dalaran' },
  'wt-rol': { site: 'Warcraft Tavern', titre: 'The Ruins of Lordaeron', url: 'https://www.warcrafttavern.com/forever/guides/the-ruins-of-lordaeron/' },
  'gw-dal': {
    site: 'Gamewave',
    titre: 'Comment invoquer le boss secret de la Cité de Dalaran',
    url: 'https://gamewave.fr/world-of-warcraft-forever/wow-forever-comment-invoquer-le-boss-secret-du-donjon-de-la-cite-de-dalaran/',
  },
  'wh-overview': {
    site: 'Wowhead',
    titre: 'Dungeons overview: locations and details (bêta)',
    url: 'https://www.wowhead.com/forever/tw/guide/dungeons-overview-locations-details',
  },
  'kami-rfc': { site: 'Kami-labs', titre: 'Gouffre de Ragefeu', url: `${KAMI}/gouffre-de-ragefeu-wow-forever/` },
  'kami-hot': { site: 'Kami-labs', titre: 'La Salle des thanes', url: `${KAMI}/la-salle-des-thanes-wow-forever/` },
  'kami-rol': { site: 'Kami-labs', titre: 'Ruines de Lordaeron', url: `${KAMI}/ruines-de-lordaeron-wow-forever/` },
  'kami-wc': { site: 'Kami-labs', titre: 'Cavernes des Lamentations', url: `${KAMI}/cavernes-des-lamentations-wow-forever/` },
  'kami-dm': { site: 'Kami-labs', titre: 'Les Mortemines', url: `${KAMI}/les-mortemines-wow-forever/` },
  'kami-sfk': { site: 'Kami-labs', titre: "Donjon d'Ombrecroc", url: `${KAMI}/donjon-d-ombrecroc-wow-forever/` },
  'kami-bfd': { site: 'Kami-labs', titre: 'Profondeurs de Brassenoire', url: `${KAMI}/profondeurs-de-brassenoire-wow-forever/` },
  'kami-stock': { site: 'Kami-labs', titre: 'La Prison de Hurlevent', url: `${KAMI}/la-prison-de-hurlevent-wow-forever/` },
  'kami-exc': { site: 'Kami-labs', titre: 'Site de fouilles des Paluns', url: `${KAMI}/en/site-de-fouilles-des-paluns-wow-forever/` },
  'kami-dal': { site: 'Kami-labs', titre: 'Cité de Dalaran', url: `${KAMI}/cite-de-dalaran-wow-forever/` },
  'kami-gnomer': { site: 'Kami-labs', titre: 'Gnomeregan', url: `${KAMI}/gnomeregan-wow-forever/` },
  'kami-rfk': { site: 'Kami-labs', titre: 'Kraal de Tranchebauge', url: `${KAMI}/kraal-de-tranchebauge-wow-forever/` },
  'kami-sm': { site: 'Kami-labs', titre: 'Monastère écarlate', url: `${KAMI}/monastere-ecarlate-wow-forever/` },
  'kami-rfd': { site: 'Kami-labs', titre: 'Souilles de Tranchebauge', url: `${KAMI}/souilles-de-tranchebauge-wow-forever/` },
  'kami-uld': { site: 'Kami-labs', titre: 'Uldaman', url: `${KAMI}/uldaman-wow-forever/` },
  'kami-zf': { site: 'Kami-labs', titre: "Zul'Farrak", url: `${KAMI}/zul-farrak-wow-forever/` },
  'kami-mara': { site: 'Kami-labs', titre: 'Maraudon', url: `${KAMI}/maraudon-wow-forever/` },
  'kami-st': { site: 'Kami-labs', titre: 'Le temple englouti', url: `${KAMI}/le-temple-englouti-wow-forever/` },
  'kami-brd': { site: 'Kami-labs', titre: 'Profondeurs de Blackrock', url: `${KAMI}/profondeurs-de-blackrock-wow-forever/` },
  'kami-brs': { site: 'Kami-labs', titre: 'Pic Blackrock', url: `${KAMI}/pic-blackrock-wow-forever/` },
  'kami-dm-hub': { site: 'Kami-labs', titre: 'Hache-tripes', url: `${KAMI}/hache-tripes-wow-forever/` },
  'kami-strat': { site: 'Kami-labs', titre: 'Stratholme', url: `${KAMI}/stratholme-wow-forever/` },
  'kami-scholo': { site: 'Kami-labs', titre: 'Scholomance', url: `${KAMI}/scholomance-wow-forever/` },
  'kami-blackmaw': { site: 'Kami-labs', titre: 'Repaire des Noiregueules', url: `${KAMI}/en/repaire-des-noiregueules-wow-forever/` },
  'kami-defias': { site: 'Kami-labs', titre: 'Prison des Défias', url: `${KAMI}/prison-des-defias-wow-forever/` },
}

// Du plus bas niveau au plus haut.
export const GUIDES = [...DONJONS_A, ...DONJONS_B, ...DONJONS_C].sort(
  (a, b) => a.niveaux[0] - b.niveaux[0] || a.niveaux[1] - b.niveaux[1],
)

const norm = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

// Un guide se retrouve par son id (?guide=ruins-of-lordaeron) ou par le nom du donjon d'une annonce.
export function trouverGuide(valeur) {
  if (!valeur) return null
  return GUIDES.find((g) => g.id === valeur || g.cible === valeur) ?? null
}

export const nomDonjon = (g, langue) => (langue === 'fr' ? (g.nom[1] ?? g.nom[0]) : g.nom[0])

// Un boss, ou deux/trois qui se combattent ensemble (liste de noms).
export function nomBoss(nom, langue) {
  const liste = Array.isArray(nom) ? nom : [nom]
  const noms = liste.map((n) => (langue === 'fr' ? (NOMS_BOSS_FR[n] ?? n) : n))
  return noms.join(langue === 'fr' ? ' et ' : ' & ')
}

const JETON = /\[\[([^\]]+?)\]\]|\{\{([^}]+?)\}\}/g

// Coupe un texte en morceaux: { t: 'txt', v } | { t: 'boss', en, fr } | { t: 'cap', en, fr }.
export function decouper(texte) {
  const morceaux = []
  let fin = 0
  for (const m of String(texte).matchAll(JETON)) {
    if (m.index > fin) morceaux.push({ t: 'txt', v: texte.slice(fin, m.index) })
    const [en, fr] = (m[1] ?? m[2]).split('|')
    morceaux.push({ t: m[1] !== undefined ? 'boss' : 'cap', en, fr })
    fin = m.index + m[0].length
  }
  if (fin < texte.length) morceaux.push({ t: 'txt', v: texte.slice(fin) })
  return morceaux
}

// Le texte sans jetons dans la langue demandée (pour la recherche et les tests).
export function aplatir(texte, langue) {
  return decouper(texte)
    .map((m) => {
      if (m.t === 'txt') return m.v
      if (m.t === 'boss') return langue === 'fr' ? (m.fr ?? NOMS_BOSS_FR[m.en] ?? m.en) : m.en
      return langue === 'fr' ? (m.fr ?? m.en) : m.en
    })
    .join('')
}

// Tout ce qu'on peut taper pour retrouver un donjon, en français comme en anglais: son nom, le nom d'un boss,
// un mot de l'accès (zone, ville).
const index = new Map(
  GUIDES.map((g) => {
    const bosses = g.boss.flatMap((b) => [nomBoss(b.nom, 'en'), nomBoss(b.nom, 'fr')])
    const mots = [...g.nom, ...(g.alias ?? []), g.cible, aplatir(g.acces ?? '', 'en'), ...bosses]
    return [g.id, norm(mots.filter(Boolean).join(' | '))]
  }),
)

export const correspondRecherche = (g, texte) => {
  const q = norm(texte).trim()
  if (!q) return true
  return q.split(/\s+/).every((mot) => index.get(g.id).includes(mot))
}

// Le boss qui a fait trouver le donjon (pour l'afficher dans les résultats).
export function bossTrouve(g, texte, langue) {
  const q = norm(texte).trim()
  if (!q) return null
  const mots = q.split(/\s+/)
  // Si le nom du donjon lui-même correspond, inutile d'ajouter un boss.
  const nomsDonjon = norm([...g.nom, ...(g.alias ?? []), g.cible].filter(Boolean).join(' '))
  if (mots.every((m) => nomsDonjon.includes(m))) return null
  const b = g.boss.find((x) => {
    const t = norm(`${nomBoss(x.nom, 'en')} ${nomBoss(x.nom, 'fr')}`)
    return mots.every((m) => t.includes(m))
  })
  return b ? nomBoss(b.nom, langue) : null
}
