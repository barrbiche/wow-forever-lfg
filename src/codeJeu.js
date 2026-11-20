// Lit le « code » que l'addon Babillard Forever FR (commande /bf perso) fait copier au joueur.
// Format de l'addon (voir ns.BuildExportCode): BFFR1;n=Nom;r=Royaume;rg=EU;f=Horde;c=ROGUE;ra=Orc;lv=60;g=Guilde;il=;ro=TD;rs=pvp;p=Métier:rang:max,...;t=1790000000
// Ce texte vient du presse-papiers de quelqu'un: on ne lui fait jamais confiance. Chaque champ est validé, et un
// code illisible donne une erreur claire plutôt qu'un profil à moitié rempli. Le code n'est pas une preuve:
// n'importe qui peut en écrire un à la main, donc le résultat sert seulement à pré-remplir le formulaire.

import { specialisationsDe } from './data.js'

export const PREFIXE_CODE = 'BFFR1'
const LONGUEUR_MAX = 9000 // équipement et talents (tous ceux de l'arbre) allongent le code: environ 6 000 caractères au pire

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

// ---------- Équipement, arbres de talents et talents (champs eq, tr, ta) ----------
// Même méfiance que pour le reste: chaque nombre est borné, chaque nom est nettoyé (pas de < ni >, pas de caractères
// de contrôle) et les listes ont une longueur maximale. Le site affiche ces noms comme du texte, jamais comme du HTML.
const nomPropre = (t, max) => String(t ?? '').replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max)
const entier = (t, min, max) => {
  const s = String(t ?? '').trim()
  if (!/^\d{1,9}$/.test(s)) return null
  const n = Number(s)
  return n >= min && n <= max ? n : null
}
const sansAccents = (t) => String(t ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()

export const EMPLACEMENTS_FICHE = 19 // numéros d'emplacement du jeu (1 à 19)

// Nom d'icône du jeu (« inv_helmet_01 »): lettres minuscules, chiffres et soulignés seulement. Le nom sert à bâtir
// une adresse d'image, donc rien d'autre n'est accepté.
const ICONE = /^[a-z0-9_]{1,64}$/
const iconeValide = (t) => {
  const s = String(t ?? '').trim().toLowerCase()
  return ICONE.test(s) ? s : ''
}

function lireEquipement(brut, brutIcones) {
  const icones = new Map()
  for (const morceau of String(brutIcones ?? '').split(',')) {
    const [slot, icone] = morceau.split(':')
    const s = entier(slot, 1, EMPLACEMENTS_FICHE)
    if (s !== null && iconeValide(icone)) icones.set(s, iconeValide(icone))
  }
  const parSlot = new Map()
  for (const morceau of String(brut ?? '').split(',')) {
    const p = morceau.split(':')
    if (p.length < 6) continue
    const slot = entier(p[0], 1, EMPLACEMENTS_FICHE)
    const id = entier(p[1], 1, 9999999)
    if (slot === null || id === null) continue
    const ilvl = entier(p[2], 0, 1000) ?? 0
    const qualite = entier(p[3], 0, 6) ?? 1
    const enchant = entier(p[4], 0, 999999) ?? 0
    const nom = nomPropre(p.slice(5).join(' '), 60) || '?'
    parSlot.set(slot, { slot, id, ilvl, qualite, enchant, nom, ...(icones.has(slot) ? { icone: icones.get(slot) } : {}) })
    if (parSlot.size >= 17) break
  }
  return [...parSlot.values()].sort((a, b) => a.slot - b.slot)
}

function lireArbres(brut, brutIcones) {
  const icones = String(brutIcones ?? '').split(',')
  const arbres = []
  for (const [i, morceau] of String(brut ?? '').split(',').entries()) {
    const p = morceau.split(':')
    if (p.length !== 2) continue
    const points = entier(p[1], 0, 60)
    const nom = nomPropre(p[0], 30)
    if (points === null || !nom) continue
    const icone = iconeValide(icones[i])
    arbres.push({ nom, points, ...(icone ? { icone } : {}) })
    if (arbres.length >= 3) break
  }
  return arbres
}

function lireTalents(brut, nbArbres, brutIcones, brutPlaces) {
  const icones = String(brutIcones ?? '').split(',')
  // Place dans la grille de l'arbre: trois chiffres « rangée (1-9), colonne (1-4), rangs max (1-5) », même ordre que les talents.
  const places = String(brutPlaces ?? '').split(',')
  const talents = []
  // L'icône d'un talent est à la même place que lui dans la liste de départ (même si un autre talent est refusé).
  for (const [i, morceau] of String(brut ?? '').split(',').entries()) {
    const p = morceau.split(':')
    if (p.length !== 3) continue
    const rang = entier(p[1], 0, 5)
    const arbre = entier(p[2], 1, 3)
    const nom = nomPropre(p[0], 40)
    if (rang === null || arbre === null || !nom || arbre > Math.max(nbArbres, 1)) continue
    const icone = iconeValide(icones[i])
    const place = /^([1-9])([1-4])([1-5])$/.exec((places[i] ?? '').trim())
    const grille = place && rang <= Number(place[3]) ? { ligne: Number(place[1]), col: Number(place[2]), max: Number(place[3]) } : {}
    // Rang 0 = talent pas appris: gardé seulement avec sa place dans la grille (sinon il ne servirait à rien).
    if (rang === 0 && !grille.ligne) continue
    talents.push({ nom, rang, arbre, ...(icone ? { icone } : {}), ...grille })
    if (talents.length >= 70) break
  }
  return talents
}

// L'arbre où il y a le plus de points = la spécialisation. On la reconnaît d'abord par son nom (français ou anglais);
// sinon par sa place: les trois arbres sont toujours dans le même ordre que SPECIALISATIONS (data.js). Dans ce cas
// `incertaine` est vrai: le formulaire la remplit quand même, et la personne vérifie avant d'enregistrer.
export function specialisationDeFiche(classe, arbres) {
  let meilleur = -1
  let max = 0
  arbres.forEach((a, i) => {
    if (a.points > max) {
      max = a.points
      meilleur = i
    }
  })
  if (meilleur < 0) return null
  const specs = specialisationsDe(classe)
  if (specs.length === 0) return null
  const nom = sansAccents(arbres[meilleur].nom)
  const parNom = specs.find((s) => sansAccents(s.fr) === nom || sansAccents(s.en) === nom)
  if (parNom) return { id: parNom.id, incertaine: false }
  return specs[meilleur] ? { id: specs[meilleur].id, incertaine: true } : null
}

// Retourne { ok: true, valeurs, metiers, ilvl, fiche, avertissements } ou { ok: false, erreur }.
// `fiche` ({ equipement, arbres, talents }) vaut null quand le code n'en contient pas (ancien addon).
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

  // Équipement et talents (addon récent seulement)
  const equipement = lireEquipement(champs.eq, champs.ic)
  const arbres = lireArbres(champs.tr, champs.tri)
  const talents = lireTalents(champs.ta, arbres.length, champs.ti, champs.tp)
  const fiche = equipement.length > 0 || arbres.length > 0 ? { equipement, arbres, talents } : null
  let specIncertaine = false
  if (fiche && valeurs.classe) {
    const spec = specialisationDeFiche(valeurs.classe, arbres)
    if (spec) {
      valeurs.specialisation = spec.id
      specIncertaine = spec.incertaine
    }
  }

  return { ok: true, valeurs, metiers, ilvl, fiche, specIncertaine, avertissements, royaume: (champs.r ?? '').slice(0, 40) }
}
