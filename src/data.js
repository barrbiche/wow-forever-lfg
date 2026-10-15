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

// Valeur par défaut du formulaire PvP: pas besoin de choisir un champ de bataille précis.
export const PVP_PEU_IMPORTE = 'Groupe PvP'

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
