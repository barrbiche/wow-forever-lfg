// Couche de données. Deux modes:
//  - Supabase, si VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY sont définies (vrai site)
//  - Démo, sinon: les annonces restent dans le navigateur (pour essayer le site sans rien configurer)
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const cle = import.meta.env.VITE_SUPABASE_ANON_KEY

export const modeDemo = !(url && cle)
const supabase = modeDemo ? null : createClient(url, cle)

const CLE_DEMO = 'forever-demo-annonces'

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
      activite: 'donjon', cible: 'Scarlet Monastery: Library', faction: 'alliance',
      ruleset: 'normal', region: 'US', niveau_min: 33, niveau_max: 41,
      roles: ['tank', 'heal'], perso: 'Thalyn', contact: 'thalyn#2481',
      note: 'On est 3 DPS, on part dans 10 min. Micro pas obligatoire.',
    },
    {
      id: 'demo-2', created_at: minutes(18), expires_at: dansHeures(1.6),
      activite: 'pvp', cible: 'Warsong Gulch', faction: 'horde',
      ruleset: 'pvp', region: 'US', niveau_min: 10, niveau_max: 19,
      roles: [], perso: 'Grumash', contact: 'Grumash#1190',
      note: 'Groupe de 5 pour jouer ensemble, on cherche 5 autres Québécois.',
    },
    {
      id: 'demo-3', created_at: minutes(41), expires_at: dansHeures(5),
      activite: 'donjon', cible: 'The Deadmines', faction: 'alliance',
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
    const complete = { ...annonce, id: `demo-${Date.now()}`, created_at: new Date().toISOString() }
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
