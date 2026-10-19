// Couche de données. Deux modes:
//  - Supabase, si VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY sont définies (vrai site)
//  - Démo, sinon: les annonces restent dans le navigateur (pour essayer le site sans rien configurer)
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const cle = import.meta.env.VITE_SUPABASE_ANON_KEY

export const modeDemo = !(url && cle)
// La connexion Discord s'affiche seulement une fois configurée (VITE_DISCORD_ACTIF=1 dans Netlify).
export const discordActif = import.meta.env.VITE_DISCORD_ACTIF === '1'
const supabase = modeDemo ? null : createClient(url, cle)

const CLE_DEMO = 'forever-demo-annonces'
const CLE_CONNEXION_DEMO = 'forever-demo-connecte'
const EVENEMENT_DEMO = 'forever-demo-connexion'
const CLE_GUILDES_DEMO = 'forever-demo-guildes'
const CLE_PROFIL = 'forever-profil'
const UTILISATEUR_DEMO = { id: 'demo', nom: 'Joueur démo', contact: 'ton_discord' }

function connexionDemo() {
  try {
    return localStorage.getItem(CLE_CONNEXION_DEMO) === '1'
  } catch {
    return false
  }
}

function minutes(n) {
  return new Date(Date.now() - n * 60000).toISOString()
}
function dansHeures(h) {
  return new Date(Date.now() + h * 3600000).toISOString()
}

function annoncesDemo() {
  return [
    {
      id: 'demo-1', created_at: minutes(6), expires_at: dansHeures(2.5),
      user_id: 'demo-autre', activite: 'donjon', cible: 'Scarlet Monastery: Library', faction: 'alliance',
      ruleset: 'normal', style: 'relax', langue: 'fr', debut: null, region: 'US', niveau_min: 33, niveau_max: 41,
      genre: 'groupe', classe: 'mage',
      roles: ['tank', 'heal'], perso: 'Thalyn', contact: 'thalyn#2481',
      note: 'On est 3 DPS, on part dans 10 min. Micro pas obligatoire.',
    },
    {
      id: 'demo-2', created_at: minutes(18), expires_at: dansHeures(1.6),
      user_id: 'demo-autre', activite: 'pvp', cible: 'Warsong Gulch', faction: 'horde',
      ruleset: 'normal', style: 'competitif', langue: 'fr', debut: null, region: 'US', niveau_min: 10, niveau_max: 19,
      genre: 'groupe', classe: 'chasseur',
      roles: [], perso: 'Grumash', contact: 'Grumash#1190',
      note: 'Groupe de 5 pour jouer ensemble, on cherche 5 autres Québécois.',
    },
    {
      id: 'demo-3', created_at: minutes(41), expires_at: dansHeures(4), debut: dansHeures(3),
      user_id: 'demo-autre', activite: 'donjon', cible: 'The Deadmines', faction: 'alliance',
      ruleset: 'normal', style: 'apprentissage', langue: 'fr', region: 'EU', niveau_min: 18, niveau_max: 23,
      genre: 'groupe', classe: 'druide',
      roles: ['dps', 'dps'], perso: 'Mirabelle', contact: 'mirabelle_wow',
      note: 'Tank et heal sont prêts, il nous manque du DPS. Ce soir à 20 h.',
    },
    {
      id: 'demo-4', created_at: minutes(9), expires_at: dansHeures(2), debut: null,
      user_id: 'demo-autre', activite: 'donjon', cible: 'Un donjon, peu importe', faction: 'horde',
      ruleset: 'normal', style: 'relax', langue: 'fr', region: 'US', niveau_min: 25, niveau_max: 25,
      genre: 'joueur', classe: 'guerrier',
      roles: ['tank'], perso: 'Brokk', contact: 'brokk_tank',
      note: 'Tank niveau 25 disponible ce soir, je cherche un groupe sympa.',
    },
  ].map((a) => ({ ...a, roles: [...new Set(a.roles)] }))
}

function lireDemo() {
  try {
    const brut = localStorage.getItem(CLE_DEMO)
    const liste = brut ? JSON.parse(brut) : annoncesDemo()
    if (!brut) localStorage.setItem(CLE_DEMO, JSON.stringify(liste))
    return liste
  } catch {
    return annoncesDemo()
  }
}

// Les visiteurs non connectés ne reçoivent pas la colonne « contact » (le serveur la leur refuse).
// Si la base n'est pas encore à jour, on retombe sur des listes de colonnes plus anciennes.
const COLONNES_ANNONCES_SANS_COMPOSITION =
  'id,user_id,created_at,expires_at,activite,cible,faction,ruleset,region,niveau_min,niveau_max,roles,perso,note,style,langue,debut,genre,classe'
const COLONNES_ANNONCES = `${COLONNES_ANNONCES_SANS_COMPOSITION},roles_nb`
const COLONNES_ANNONCES_ANCIENNES =
  'id,user_id,created_at,expires_at,activite,cible,faction,ruleset,region,niveau_min,niveau_max,roles,perso,note,style,langue,debut'
const COLONNES_GUILDES =
  'id,user_id,created_at,expires_at,nom,faction,region,ruleset,langue,focus,style,roles,niveau_min,description,perso'

async function estConnecte() {
  if (modeDemo) return connexionDemo()
  const { data } = await supabase.auth.getSession()
  return !!data.session
}

export async function lireAnnonces() {
  const connecte = await estConnecte()
  if (modeDemo) {
    const maintenant = Date.now()
    return lireDemo()
      .filter((a) => new Date(a.expires_at).getTime() > maintenant)
      .map((a) => (connecte ? a : { ...a, contact: null }))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  }
  const essais = connecte
    ? ['*']
    : [COLONNES_ANNONCES, COLONNES_ANNONCES_SANS_COMPOSITION, COLONNES_ANNONCES_ANCIENNES, '*']
  let derniereErreur = null
  for (const colonnes of essais) {
    const { data, error } = await supabase
      .from('annonces')
      .select(colonnes)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(200)
    if (!error) return data
    derniereErreur = error
  }
  throw derniereErreur
}

export async function creerAnnonce(champs, heures) {
  // Annonce planifiée: elle reste affichée jusqu'à 1 h après l'heure de départ.
  const expires_at = champs.debut
    ? new Date(new Date(champs.debut).getTime() + 3600000).toISOString()
    : dansHeures(heures)
  const annonce = { ...champs, debut: champs.debut || null, expires_at }
  if (modeDemo) {
    const complete = {
      ...annonce,
      user_id: UTILISATEUR_DEMO.id,
      id: `demo-${Date.now()}`,
      created_at: new Date().toISOString(),
    }
    try {
      localStorage.setItem(CLE_DEMO, JSON.stringify([complete, ...lireDemo()]))
    } catch {
      // navigation privée: l'annonce n'est pas gardée, mais on ne casse pas la page
    }
    return complete
  }
  const { data, error } = await supabase.from('annonces').insert(annonce).select().single()
  if (error) throw error
  return data
}

// ---------- Connexion ----------

function versUtilisateur(u) {
  if (!u) return null
  const m = u.user_metadata ?? {}
  return {
    id: u.id,
    nom: m.custom_claims?.global_name || m.full_name || m.name || u.email?.split('@')[0] || 'Joueur',
    contact: m.full_name || m.name || '',
  }
}

// Appelle `rappel` avec l'utilisateur connecté (ou null) maintenant et à chaque changement.
// Retourne une fonction pour arrêter d'écouter.
export function suivreUtilisateur(rappel) {
  if (modeDemo) {
    const lire = () => {
      try {
        return localStorage.getItem(CLE_CONNEXION_DEMO) === '1' ? UTILISATEUR_DEMO : null
      } catch {
        return null
      }
    }
    const ecouter = () => rappel(lire())
    ecouter()
    window.addEventListener(EVENEMENT_DEMO, ecouter)
    return () => window.removeEventListener(EVENEMENT_DEMO, ecouter)
  }
  supabase.auth.getSession().then(({ data }) => rappel(versUtilisateur(data.session?.user)))
  const { data } = supabase.auth.onAuthStateChange((_evenement, session) =>
    rappel(versUtilisateur(session?.user)),
  )
  return () => data.subscription.unsubscribe()
}

export async function connecter() {
  if (modeDemo) {
    try {
      localStorage.setItem(CLE_CONNEXION_DEMO, '1')
    } catch {
      // navigation privée: la connexion démo ne sera pas gardée
    }
    window.dispatchEvent(new Event(EVENEMENT_DEMO))
    return
  }
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'discord',
    options: { redirectTo: window.location.origin },
  })
  if (error) throw error
}

export async function deconnecter() {
  if (modeDemo) {
    try {
      localStorage.removeItem(CLE_CONNEXION_DEMO)
    } catch {
      // rien à faire
    }
    window.dispatchEvent(new Event(EVENEMENT_DEMO))
    return
  }
  await supabase.auth.signOut()
}

// ---------- Gérer ses annonces ----------

function ecrireDemo(liste) {
  try {
    localStorage.setItem(CLE_DEMO, JSON.stringify(liste))
  } catch {
    // navigation privée: le changement n'est pas gardé
  }
}

export async function retirerAnnonce(id) {
  if (modeDemo) {
    ecrireDemo(lireDemo().filter((a) => a.id !== id))
    return
  }
  const { error } = await supabase.from('annonces').delete().eq('id', id)
  if (error) throw error
}

// Un joueur est trouvé pour ce rôle. Pour un raid qui cherche plusieurs joueurs d'un rôle, on en enlève un seul;
// quand il n'en reste plus, le rôle disparaît de l'annonce.
export async function retirerRole(annonce, role) {
  const reste = (annonce.roles_nb?.[role] ?? 1) - 1
  const roles = reste > 0 ? annonce.roles : annonce.roles.filter((r) => r !== role)
  const miseAJour = { roles }
  if (annonce.roles_nb) {
    const nb = { ...annonce.roles_nb }
    if (reste > 0) nb[role] = reste
    else delete nb[role]
    miseAJour.roles_nb = nb
  }
  if (modeDemo) {
    ecrireDemo(lireDemo().map((a) => (a.id === annonce.id ? { ...a, ...miseAJour } : a)))
    return
  }
  const { error } = await supabase.from('annonces').update(miseAJour).eq('id', annonce.id)
  if (error) throw error
}

// Relance une annonce: même durée qu'au départ, et elle remonte en haut de la liste.
// Le serveur refuse s'il reste plus de la moitié du temps, ou si l'annonce est planifiée.
export async function renouvelerAnnonce(annonce) {
  if (modeDemo) {
    const duree = Math.min(new Date(annonce.expires_at) - new Date(annonce.created_at), 6 * 3600000)
    ecrireDemo(
      lireDemo().map((a) =>
        a.id === annonce.id
          ? { ...a, created_at: new Date().toISOString(), expires_at: new Date(Date.now() + duree).toISOString() }
          : a,
      ),
    )
    return
  }
  const { error } = await supabase.rpc('renouveler_annonce', { p_id: annonce.id })
  if (error) throw error
}

// Connexion par courriel: le joueur reçoit un lien, sans mot de passe.
// Retourne 'envoye' (courriel parti) ou 'connecte' (mode démo: connexion directe).
export async function envoyerLienCourriel(courriel) {
  if (modeDemo) {
    await connecter()
    return 'connecte'
  }
  const { error } = await supabase.auth.signInWithOtp({
    email: courriel,
    options: { emailRedirectTo: window.location.origin },
  })
  if (error) throw error
  return 'envoye'
}

// ---------- Guildes qui recrutent ----------

function guildesDemo() {
  return [
    {
      id: 'g-demo-1', created_at: minutes(300), expires_at: dansHeures(24 * 12), user_id: 'demo-autre',
      nom: 'Les Braves du Nord', faction: 'alliance', region: 'US', ruleset: 'normal', langue: 'fr',
      focus: ['donjon', 'raid'], style: 'relax', roles: ['tank', 'heal'], niveau_min: 1,
      description: 'Guilde québécoise, ambiance relax. On fait les donjons ensemble et on vise les raids du 9 décembre.',
      perso: 'Thalyn', contact: 'https://discord.gg/exemple',
    },
    {
      id: 'g-demo-2', created_at: minutes(1200), expires_at: dansHeures(24 * 5), user_id: 'demo-autre',
      nom: 'Sang et Fer', faction: 'horde', region: 'EU', ruleset: 'pvp', langue: 'fr',
      focus: ['pvp'], style: 'competitif', roles: [], niveau_min: 20,
      description: 'Groupes de champs de bataille tous les soirs. Sérieux mais sans pression.',
      perso: 'Grumash', contact: 'Grumash#1190',
    },
  ]
}

function lireGuildesDemo() {
  try {
    const brut = localStorage.getItem(CLE_GUILDES_DEMO)
    const liste = brut ? JSON.parse(brut) : guildesDemo()
    if (!brut) localStorage.setItem(CLE_GUILDES_DEMO, JSON.stringify(liste))
    return liste
  } catch {
    return guildesDemo()
  }
}

export async function lireGuildes() {
  const connecte = await estConnecte()
  if (modeDemo) {
    const maintenant = Date.now()
    return lireGuildesDemo()
      .filter((g) => new Date(g.expires_at).getTime() > maintenant)
      .map((g) => (connecte ? g : { ...g, contact: null }))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  }
  const { data, error } = await supabase
    .from('guildes')
    .select(connecte ? '*' : COLONNES_GUILDES)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) throw error
  return data
}

export async function creerGuilde(champs, jours) {
  const guilde = { ...champs, expires_at: new Date(Date.now() + jours * 86400000).toISOString() }
  if (modeDemo) {
    const complete = {
      ...guilde,
      user_id: UTILISATEUR_DEMO.id,
      id: `g-demo-${Date.now()}`,
      created_at: new Date().toISOString(),
    }
    try {
      localStorage.setItem(CLE_GUILDES_DEMO, JSON.stringify([complete, ...lireGuildesDemo()]))
    } catch {
      // navigation privée: la guilde n'est pas gardée, mais on ne casse pas la page
    }
    return complete
  }
  const { data, error } = await supabase.from('guildes').insert(guilde).select().single()
  if (error) throw error
  return data
}

export async function retirerGuilde(id) {
  if (modeDemo) {
    try {
      localStorage.setItem(CLE_GUILDES_DEMO, JSON.stringify(lireGuildesDemo().filter((g) => g.id !== id)))
    } catch {
      // rien à faire
    }
    return
  }
  const { error } = await supabase.from('guildes').delete().eq('id', id)
  if (error) throw error
}

// ---------- Signalements ----------

// type: 'annonce' ou 'guilde'. Signaler deux fois la même chose n'est pas une erreur.
export async function signaler(type, id, motif) {
  if (modeDemo) return
  const ligne = { motif, [type === 'guilde' ? 'guilde_id' : 'annonce_id']: id }
  const { error } = await supabase.from('signalements').insert(ligne)
  if (error && error.code !== '23505') throw error
}

// ---------- Profil gardé dans le navigateur (personnage, classe, contact...) ----------

export function lireProfil() {
  try {
    return JSON.parse(localStorage.getItem(CLE_PROFIL) ?? '{}') ?? {}
  } catch {
    return {}
  }
}

export function ecrireProfil(profil) {
  try {
    localStorage.setItem(CLE_PROFIL, JSON.stringify(profil))
  } catch {
    // navigation privée: le profil n'est pas gardé pour la prochaine visite
  }
}
