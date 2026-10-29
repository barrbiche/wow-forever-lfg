// Listes utilisées par les filtres et le formulaire.
// Les noms viennent des guides publics sur WoW Forever (avant le lancement du 4 novembre 2026):
// à revérifier une fois le jeu sorti.

export const DONJONS_NOUVEAUX = [
  'Hall of Thanes',
  'Ruins of Lordaeron',
  'Excavation Site: Wetlands',
  'City of Dalaran',
  'The Drowned City',
  "Krol'dok Stronghold",
  'Alcaz Island Prison',
  'Blackmaw Hold',
  "Shaper's Terrace",
]

export const DONJONS_CLASSIQUES = [
  'Ragefire Chasm',
  'Wailing Caverns',
  'The Deadmines',
  'Shadowfang Keep',
  'Blackfathom Deeps',
  'The Stockade',
  'Gnomeregan',
  'Razorfen Kraul',
  'Scarlet Monastery: Graveyard',
  'Scarlet Monastery: Library',
  'Scarlet Monastery: Armory',
  'Scarlet Monastery: Cathedral',
  'Razorfen Downs',
  "Zul'Farrak",
  'Uldaman',
  'Maraudon',
  "Temple of Atal'Hakkar",
  'Blackrock Depths',
  'Lower Blackrock Spire',
  'Upper Blackrock Spire',
  'Stratholme: Living',
  'Stratholme: Undead',
  'Scholomance',
  'Dire Maul: East',
  'Dire Maul: West',
  'Dire Maul: North',
]

export const AUTRE_DONJON = 'Autre donjon'

// Un joueur seul qui n'a pas de donjon précis en tête.
export const DONJON_PEU_IMPORTE = 'Un donjon, peu importe'

// Plages de niveaux suggérées: elles se remplissent toutes seules quand on choisit un donjon
// (et restent modifiables). Nouveaux donjons: guides publics avant le lancement.
// Pour Excavation Site, les sources se contredisent (24-29 ou 26-31): on prend la plage la plus large.
// Donjons classiques: plages habituelles de WoW Classic, à revérifier dans Forever.
export const NIVEAUX_DONJONS = {
  'Hall of Thanes': [13, 18],
  'Ruins of Lordaeron': [15, 20],
  'Excavation Site: Wetlands': [24, 31],
  'City of Dalaran': [28, 33],
  'The Drowned City': [35, 40],
  "Krol'dok Stronghold": [40, 45],
  'Alcaz Island Prison': [48, 53],
  'Blackmaw Hold': [55, 60],
  "Shaper's Terrace": [58, 60],
  'Ragefire Chasm': [13, 18],
  'Wailing Caverns': [15, 25],
  'The Deadmines': [18, 23],
  'Shadowfang Keep': [22, 30],
  'Blackfathom Deeps': [24, 32],
  'The Stockade': [24, 31],
  Gnomeregan: [29, 38],
  'Razorfen Kraul': [30, 40],
  'Scarlet Monastery: Graveyard': [26, 36],
  'Scarlet Monastery: Library': [29, 39],
  'Scarlet Monastery: Armory': [32, 42],
  'Scarlet Monastery: Cathedral': [35, 45],
  'Razorfen Downs': [40, 50],
  Uldaman: [42, 52],
  "Zul'Farrak": [44, 54],
  Maraudon: [46, 55],
  "Temple of Atal'Hakkar": [50, 60],
  'Blackrock Depths': [52, 60],
  'Lower Blackrock Spire': [55, 60],
  'Upper Blackrock Spire': [58, 60],
  'Stratholme: Living': [58, 60],
  'Stratholme: Undead': [58, 60],
  Scholomance: [58, 60],
  'Dire Maul: East': [58, 60],
  'Dire Maul: West': [58, 60],
  'Dire Maul: North': [58, 60],
}

// Les raids ouvrent le 9 décembre 2026 (niveau 60 requis). Avant, le formulaire montre « Dès le 9 décembre ».
export const RAIDS = [
  { nom: 'Barrow Deeps', taille: 10 },
  { nom: 'Hyjal Summit', taille: 20 },
  { nom: "Onyxia's Lair", taille: 40 },
]
export const RAIDS_OUVERTS_LE = new Date(2026, 11, 9)
export const raidsOuverts = () => Date.now() >= RAIDS_OUVERTS_LE.getTime()

// Sortie du jeu: le 4 novembre 2026 (sert au compte à rebours de l'en-tête).
export const LANCEMENT_LE = new Date(2026, 10, 4)

// Valeur par défaut du formulaire PvP: pas besoin de choisir un champ de bataille précis.
export const PVP_PEU_IMPORTE = 'Groupe PvP'

// Quêtes et leveling: un joueur ou un groupe qui cherche du monde pour monter de niveau ensemble.
export const QUETE_PEU_IMPORTE = 'Quêtes, peu importe la zone'
export const AUTRE_ZONE = 'Autre zone'
export const ZONES_QUETES = [
  'Elwynn Forest', 'Dun Morogh', 'Teldrassil', 'Durotar', 'Mulgore', 'Tirisfal Glades',
  'Westfall', 'Loch Modan', 'Darkshore', 'Silverpine Forest', 'The Barrens', 'Redridge Mountains',
  'Duskwood', 'Wetlands', 'Ashenvale', 'Stonetalon Mountains', 'Hillsbrad Foothills', 'Alterac Mountains',
  'Arathi Highlands', 'Stranglethorn Vale', 'Desolace', 'Dustwallow Marsh', 'Thousand Needles', 'Badlands',
  'Swamp of Sorrows', 'The Hinterlands', 'Tanaris', 'Feralas', 'Searing Gorge', 'Burning Steppes',
  "Un'Goro Crater", 'Azshara', 'Felwood', 'Blasted Lands', 'Western Plaguelands', 'Eastern Plaguelands',
  'Winterspring', 'Silithus',
]

export const CHAMPS_DE_BATAILLE = [
  'Warsong Gulch',
  'Arathi Basin',
  'Darkspear Islands',
  'Alterac Valley',
  'PvP en monde ouvert',
  'Autre PvP',
]

export const FACTIONS = [
  { id: 'alliance', nom: 'Alliance' },
  { id: 'horde', nom: 'Horde' },
]

// Les règles de jeu servent seulement aux guildes; les annonces n’en demandent plus.
// Hardcore arrive après le lancement: on l'ajoutera à ce moment-là.
export const RULESETS = [
  { id: 'normal', nom: 'Normal', carte: 'Règles normales' },
  { id: 'pvp', nom: 'PvP', carte: 'Règles PvP' },
  { id: 'rp', nom: 'Jeu de rôle', carte: 'Règles jeu de rôle' },
]

// Les mêmes quatre styles que l'outil de groupe du jeu (Blizzard ne les a pas encore définis).
export const STYLES = [
  { id: 'apprentissage', nom: 'Apprentissage' },
  { id: 'relax', nom: 'Relax' },
  { id: 'competitif', nom: 'Compétitif' },
  { id: 'carry', nom: 'Carry offert' },
]

// Les neuf classes de WoW Classic (couleurs officielles du jeu, utilisées en petits points seulement).
export const CLASSES = [
  { id: 'guerrier', nom: 'Guerrier', couleur: '#C79C6E' },
  { id: 'paladin', nom: 'Paladin', couleur: '#F58CBA' },
  { id: 'chasseur', nom: 'Chasseur', couleur: '#ABD473' },
  { id: 'voleur', nom: 'Voleur', couleur: '#FFF569' },
  { id: 'pretre', nom: 'Prêtre', couleur: '#FFFFFF' },
  { id: 'chaman', nom: 'Chaman', couleur: '#0070DE' },
  { id: 'mage', nom: 'Mage', couleur: '#69CCF0' },
  { id: 'demoniste', nom: 'Démoniste', couleur: '#9482C9' },
  { id: 'druide', nom: 'Druide', couleur: '#FF7D0A' },
]

// Couleur de classe pour du TEXTE sur fond sombre (le bleu officiel du chaman est trop foncé pour se lire bien).
export function couleurTexteClasse(id) {
  const c = CLASSES.find((x) => x.id === id)
  if (!c) return undefined
  return id === 'chaman' ? '#4da3ff' : c.couleur
}

// Les trois spécialisations (arbres de talents) de chaque classe. L'identifiant est celui que la base accepte
// (ameliorations4.sql: profils_specialisation_ok): ne le change pas sans changer la base.
// Noms français: seemeta.com/fr/wow-forever/classes. Noms anglais: warcrafttavern.com/forever/guides/classes.
// À revérifier une fois le jeu sorti.
export const SPECIALISATIONS = {
  guerrier: [
    { id: 'armes', fr: 'Armes', en: 'Arms' },
    { id: 'fureur', fr: 'Fureur', en: 'Fury' },
    { id: 'protection', fr: 'Protection', en: 'Protection' },
  ],
  paladin: [
    { id: 'sacre', fr: 'Sacré', en: 'Holy' },
    { id: 'protection', fr: 'Protection', en: 'Protection' },
    { id: 'vindicte', fr: 'Vindicte', en: 'Retribution' },
  ],
  chasseur: [
    { id: 'maitrise_des_betes', fr: 'Maîtrise des bêtes', en: 'Beast Mastery' },
    { id: 'precision', fr: 'Précision', en: 'Marksmanship' },
    { id: 'survie', fr: 'Survie', en: 'Survival' },
  ],
  voleur: [
    { id: 'assassinat', fr: 'Assassinat', en: 'Assassination' },
    { id: 'combat', fr: 'Combat', en: 'Combat' },
    { id: 'finesse', fr: 'Finesse', en: 'Subtlety' },
  ],
  pretre: [
    { id: 'discipline', fr: 'Discipline', en: 'Discipline' },
    { id: 'sacre', fr: 'Sacré', en: 'Holy' },
    { id: 'ombre', fr: 'Ombre', en: 'Shadow' },
  ],
  chaman: [
    { id: 'elementaire', fr: 'Élémentaire', en: 'Elemental' },
    { id: 'amelioration', fr: 'Amélioration', en: 'Enhancement' },
    { id: 'restauration', fr: 'Restauration', en: 'Restoration' },
  ],
  mage: [
    { id: 'arcanes', fr: 'Arcanes', en: 'Arcane' },
    { id: 'feu', fr: 'Feu', en: 'Fire' },
    { id: 'givre', fr: 'Givre', en: 'Frost' },
  ],
  demoniste: [
    { id: 'affliction', fr: 'Affliction', en: 'Affliction' },
    { id: 'demonologie', fr: 'Démonologie', en: 'Demonology' },
    { id: 'destruction', fr: 'Destruction', en: 'Destruction' },
  ],
  druide: [
    { id: 'equilibre', fr: 'Équilibre', en: 'Balance' },
    { id: 'combat_farouche', fr: 'Combat farouche', en: 'Feral Combat' },
    { id: 'restauration', fr: 'Restauration', en: 'Restoration' },
  ],
}

export const specialisationsDe = (classe) => SPECIALISATIONS[classe] ?? []

// Nom d'une spécialisation dans la langue du jeu de la personne ('fr' ou 'en'); vide si elle est inconnue.
export function nomSpecialisation(classe, id, langue = 'fr') {
  const s = specialisationsDe(classe).find((x) => x.id === id)
  return s ? (langue === 'en' ? s.en : s.fr) : ''
}

// Ce qu'il faut avoir rempli dans son profil pour publier une annonce: nom, classe, spécialisation, niveau et
// au moins un rôle. Retourne la liste de ce qui manque (vide: le profil est complet).
// `exigerSpec` est faux quand la base n'a pas encore la colonne (ameliorations4.sql pas roulé): on n'enferme alors personne.
export function champsManquants(profil, exigerSpec = true) {
  const p = profil ?? {}
  const manque = []
  if (!String(p.perso ?? '').trim()) manque.push('perso')
  if (!p.classe) manque.push('classe')
  if (exigerSpec && !specialisationsDe(p.classe).some((s) => s.id === p.specialisation)) manque.push('specialisation')
  const niveau = Number(p.niveau)
  if (!(Number.isInteger(niveau) && niveau >= 1 && niveau <= 60)) manque.push('niveau')
  if (!Array.isArray(p.roles) || p.roles.length === 0) manque.push('roles')
  return manque
}

export const NOMS_CHAMPS_PROFIL = {
  perso: 'le nom de ton personnage',
  classe: 'ta classe',
  specialisation: 'ta spécialisation',
  niveau: 'ton niveau',
  roles: 'au moins un rôle',
}

export const MOTIFS_SIGNALEMENT = [
  { id: 'spam', nom: 'Spam ou publicité' },
  { id: 'faux_contact', nom: 'Faux contact' },
  { id: 'inapproprie', nom: 'Contenu inapproprié' },
  { id: 'autre', nom: 'Autre' },
]

// Étiquettes qu'on peut ajouter à un pouce de réputation.
export const ETIQUETTES = [
  { id: 'ponctuel', nom: 'Ponctuel' },
  { id: 'sympa', nom: 'Sympa' },
  { id: 'competent', nom: 'Compétent' },
  { id: 'patient', nom: 'Patient' },
  { id: 'bon_chef', nom: 'Bon chef de groupe' },
]

export const MOTIFS_JOUEUR = [
  { id: 'comportement', nom: 'Comportement toxique ou harcèlement' },
  { id: 'faux_profil', nom: 'Faux profil ou faux nom' },
  { id: 'arnaque', nom: 'Arnaque ou vente' },
  { id: 'autre', nom: 'Autre' },
]

// Motifs pour signaler un message de chat (supabase/ameliorations8.sql).
export const MOTIFS_MESSAGE = [
  { id: 'harcelement', nom: 'Insultes ou harcèlement' },
  { id: 'spam', nom: 'Spam ou publicité' },
  { id: 'inapproprie', nom: 'Contenu inapproprié' },
  { id: 'autre', nom: 'Autre' },
]

export const FOCUS_GUILDE = [
  { id: 'donjon', nom: 'Donjons' },
  { id: 'raid', nom: 'Raids' },
  { id: 'pvp', nom: 'PvP' },
]

export const DUREES_GUILDE = [
  { jours: 7, nom: '7 jours' },
  { jours: 14, nom: '14 jours' },
  { jours: 30, nom: '30 jours' },
]

export const LANGUES = [
  { id: 'fr', nom: 'Français' },
  { id: 'en', nom: 'English' },
]

export const REGIONS = [
  { id: 'US', nom: 'Amérique (US)' },
  { id: 'EU', nom: 'Europe (EU)' },
]

export const ROLES = [
  { id: 'tank', nom: 'Tank' },
  { id: 'heal', nom: 'Heal' },
  { id: 'dps', nom: 'DPS' },
]

export const DUREES = [
  { heures: 1, nom: '1 heure' },
  { heures: 2, nom: '2 heures' },
  { heures: 3, nom: '3 heures' },
  { heures: 6, nom: '6 heures' },
]

export const nomDe = (liste, id) => liste.find((x) => x.id === id)?.nom ?? id

// BattleTag: un nom de 3 à 12 caractères sans espace, un dièse, puis 4 à 8 chiffres (même règle que la base).
export const BATTLETAG_FORMAT = /^[^\s#]{3,12}#[0-9]{4,8}$/u

export function normaliserBattleTag(texte) {
  return String(texte ?? '').replace(/\s+/g, '')
}
