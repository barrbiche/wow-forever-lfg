// Lit le « code » que l'addon Babillard Forever FR (commande /bf perso) fait copier au joueur.
// Format de l'addon (voir ns.BuildExportCode): BFFR1;n=Nom;r=Royaume;rg=EU;f=Horde;c=ROGUE;ra=Orc;lv=60;g=Guilde;il=;ro=TD;rs=pvp;p=Métier:rang:max,...;t=1790000000
// Ce texte vient du presse-papiers de quelqu'un: on ne lui fait jamais confiance. Chaque champ est validé, et un
// code illisible donne une erreur claire plutôt qu'un profil à moitié rempli. Le code n'est pas une preuve:
// n'importe qui peut en écrire un à la main, donc le résultat sert seulement à pré-remplir le formulaire.

export const PREFIXE_CODE = 'BFFR1'
const LONGUEUR_MAX = 2000

// Jeton de classe du jeu (UnitClass) -> identifiant de classe du site (data.js).
const CLASSES_DU_JEU = {
  WARRIOR: 'guerrier',
  PALADIN: 'paladin',
  HUNTER: 'chasseur',
  ROGUE: 'voleur',
  PRIEST: 'pretre',
  SHAMAN: 'chaman',
  MAGE: 'mage',
  WARLOCK: 'demoniste',
  DRUID: 'druide',
}

// Lettre de rôle de l'addon -> identifiant de rôle du site.
const ROLES_DU_JEU = { T: 'tank', H: 'heal', D: 'dps' }

const FACTIONS_DU_JEU = { alliance: 'alliance', horde: 'horde' }

// Type de serveur choisi dans l'addon (mêmes identifiants que le site, voir RULESETS dans data.js).
const TYPES_DE_SERVEUR = ['normal', 'pvp', 'rp', 'rp_pvp']

// Retourne { ok: true, valeurs, metiers, ilvl, avertissements } ou { ok: false, erreur }.
// `valeurs` ne contient que les champs reconnus et valides, avec les identifiants du site.
export function lireCodeJeu(texte) {
  const brut = String(texte ?? '').trim()
  if (!brut) return { ok: false, erreur: 'Colle le code copié dans le jeu.' }
  if (brut.length > LONGUEUR_MAX) return { ok: false, erreur: 'Ce texte est trop long pour être un code du jeu.' }
  if (!brut.startsWith(PREFIXE_CODE + ';')) {
    return { ok: false, erreur: 'Ce texte ne ressemble pas à un code du jeu. Dans le jeu, tape /bf perso puis « Copier mon code ».' }
  }

  const champs = {}
  for (const morceau of brut.split(';').slice(1)) {
    const i = morceau.indexOf('=')
    if (i < 1) continue
    champs[morceau.slice(0, i)] = morceau.slice(i + 1).trim()
  }

  const valeurs = {}
  const avertissements = []

  // Le nom: les noms de personnages n'ont pas d'espaces; le formulaire du site non plus.
  const nom = (champs.n ?? '').replace(/\s/g, '')
  if (nom.length < 2 || nom.length > 24 || !/^[\p{L}]+$/u.test(nom)) {
    return { ok: false, erreur: 'Le code ne contient pas de nom de personnage valide. Génère-en un nouveau dans le jeu.' }
  }
  valeurs.perso = nom

  const niveau = Number(champs.lv)
  if (Number.isInteger(niveau) && niveau >= 1 && niveau <= 60) valeurs.niveau = String(niveau)
  else avertissements.push('niveau')

  const classe = CLASSES_DU_JEU[(champs.c ?? '').toUpperCase()]
  if (classe) valeurs.classe = classe
  else avertissements.push('classe')

  const faction = FACTIONS_DU_JEU[(champs.f ?? '').toLowerCase()]
  if (faction) valeurs.faction = faction
  else avertissements.push('faction')

  // Le type de serveur est facultatif: l'addon ne peut pas le lire seul, le joueur le choisit.
  const ruleset = (champs.rs ?? '').toLowerCase()
  if (TYPES_DE_SERVEUR.includes(ruleset)) valeurs.ruleset = ruleset

  // Le site ne gère que les régions US et EU.
  const region = (champs.rg ?? '').toUpperCase()
  if (region === 'US' || region === 'EU') valeurs.region = region
  else avertissements.push('region')

  // Pas de guilde = « aucune »: on efface l'ancienne seulement si le code en dit explicitement une autre ou aucune.
  valeurs.guilde = (champs.g ?? '').replace(/\s+/g, ' ').slice(0, 40)

  const roles = [...new Set([...(champs.ro ?? '')].map((l) => ROLES_DU_JEU[l]).filter(Boolean))]
  if (roles.length > 0) valeurs.roles = roles

  const metiers = (champs.p ?? '')
    .split(',')
    .map((m) => m.split(':'))
    .filter((m) => m.length === 3 && m[0].trim() && Number.isInteger(Number(m[1])) && Number.isInteger(Number(m[2])))
    .map(([n, rang, max]) => ({ nom: n.trim().slice(0, 30), rang: Number(rang), max: Number(max) }))
    .slice(0, 6)

  const ilvl = Number.isInteger(Number(champs.il)) && Number(champs.il) > 0 ? Number(champs.il) : null

  return { ok: true, valeurs, metiers, ilvl, avertissements, royaume: (champs.r ?? '').slice(0, 40) }
}
