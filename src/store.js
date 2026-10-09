// Couche de données. Deux modes:
//  - Supabase, si VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY sont définies (vrai site)
//  - Démo, sinon: les annonces restent dans le navigateur (pour essayer le site sans rien configurer)
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const cle = import.meta.env.VITE_SUPABASE_ANON_KEY

export const modeDemo = !(url && cle)
const supabase = modeDemo ? null : createClient(url, cle)

const CLE_DEMO = 'forever-demo-annonces'
const CLE_CONNEXION_DEMO = 'forever-demo-connecte'
const EVENEMENT_DEMO = 'forever-demo-connexion'
const UTILISATEUR_DEMO = { id: 'demo', nom: 'Joueur démo', contact: 'ton_discord' }

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
      ruleset: 'normal', region: 'US', niveau_min: 33, niveau_max: 41,
      roles: ['tank', 'heal'], perso: 'Thalyn', contact: 'thalyn#2481',
      note: 'On est 3 DPS, on part dans 10 min. Micro pas obligatoire.',
    },
    {
      id: 'demo-2', created_at: minutes(18), expires_at: dansHeures(1.6),
      user_id: 'demo-autre', activite: 'pvp', cible: 'Warsong Gulch', faction: 'horde',
      ruleset: 'pvp', region: 'US', niveau_min: 10, niveau_max: 19,
      roles: [], perso: 'Grumash', contact: 'Grumash#1190',
      note: 'Groupe de 5 pour jouer ensemble, on cherche 5 autres Québécois.',
    },
    {
      id: 'demo-3', created_at: minutes(41), expires_at: dansHeures(5),
      user_id: 'demo-autre', activite: 'donjon', cible: 'The Deadmines', faction: 'alliance',
      ruleset: 'normal', region: 'EU', niveau_min: 17, niveau_max: 24,
      roles: ['dps', 'dps'], perso: 'Mirabelle', contact: 'mirabelle_wow',
      note: 'Tank et heal sont prêts, il nous manque du DPS. Ce soir à 20 h.',
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

export async function lireAnnonces() {
  if (modeDemo) {
    const maintenant = Date.now()
    return lireDemo()
      .filter((a) => new Date(a.expires_at).getTime() > maintenant)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  }
  const { data, error } = await supabase
    .from('annonces')
    .select('*')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) throw error
  return data
}

export async function creerAnnonce(champs, heures) {
  const annonce = { ...champs, expires_at: dansHeures(heures) }
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
    nom: m.custom_claims?.global_name || m.full_name || m.name || 'Joueur',
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

// Un rôle est trouvé: on l'enlève de la liste des rôles recherchés.
export async function retirerRole(annonce, role) {
  const roles = annonce.roles.filter((r) => r !== role)
  if (modeDemo) {
    ecrireDemo(lireDemo().map((a) => (a.id === annonce.id ? { ...a, roles } : a)))
    return
  }
  const { error } = await supabase.from('annonces').update({ roles }).eq('id', annonce.id)
  if (error) throw error
}
