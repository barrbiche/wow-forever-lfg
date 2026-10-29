// Couche de données. Deux modes:
//  - Supabase, si VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY sont définies (vrai site)
//  - Démo, sinon: les annonces restent dans le navigateur (pour essayer le site sans rien configurer)
import { createClient } from '@supabase/supabase-js'
import { normaliserBattleTag } from './data.js'

const url = import.meta.env.VITE_SUPABASE_URL
const cle = import.meta.env.VITE_SUPABASE_ANON_KEY

export const modeDemo = !(url && cle)
// La connexion Google s'affiche seulement une fois configurée (VITE_GOOGLE_ACTIF=1 dans Netlify): le bouton reste
// caché tant que Google n'est pas branché dans Supabase. Sans cette variable (et en mode démo), c'est le courriel.
export const googleActif = import.meta.env.VITE_GOOGLE_ACTIF === '1'
// Le lien par courriel s'ajoute à Google seulement une fois l'envoi de courriels branché dans Supabase (SMTP):
// VITE_COURRIEL_ACTIF=1 dans Netlify. Sans Google, le courriel reste toujours affiché.
export const courrielActif = !googleActif || import.meta.env.VITE_COURRIEL_ACTIF === '1'

// Lien pour soutenir le site (Ko-fi, Buy Me a Coffee, etc.): VITE_LIEN_DONS dans Netlify. Sans lien valide, rien ne s'affiche.
const lienBrut = (import.meta.env.VITE_LIEN_DONS || '').trim()
export const lienDons = /^https:\/\/[^\s]+$/i.test(lienBrut) ? lienBrut : ''
export const supabase = modeDemo ? null : createClient(url, cle)

const CLE_DEMO = 'forever-demo-annonces'
const CLE_CONNEXION_DEMO = 'forever-demo-connecte'
const EVENEMENT_DEMO = 'forever-demo-connexion'
const CLE_GUILDES_DEMO = 'forever-demo-guildes'
const CLE_PROFIL = 'forever-profil'
export const UTILISATEUR_DEMO = { id: 'demo', nom: 'Joueur démo', contact: 'ton_discord' }

function connexionDemo() {
  try {
    return localStorage.getItem(CLE_CONNEXION_DEMO) === '1'
  } catch {
    return false
  }
}

export function minutes(n) {
  return new Date(Date.now() - n * 60000).toISOString()
}
function dansHeures(h) {
  return new Date(Date.now() + h * 3600000).toISOString()
}

function annoncesDemo() {
  return [
    {
      id: 'demo-1', created_at: minutes(6), expires_at: dansHeures(2.5),
      user_id: 'demo-j-thalyn', activite: 'donjon', cible: 'Scarlet Monastery: Library', faction: 'alliance',
      ruleset: 'normal', style: 'relax', langue: 'fr', debut: null, region: 'US', niveau_min: 33, niveau_max: 41,
      genre: 'groupe', classe: 'mage',
      roles: ['tank', 'heal'], perso: 'Thalyn', contact: 'thalyn#2481',
      note: 'On est 3 DPS, on part dans 10 min. Micro pas obligatoire.',
    },
    {
      id: 'demo-2', created_at: minutes(18), expires_at: dansHeures(1.6),
      user_id: 'demo-j-grumash', activite: 'pvp', cible: 'Warsong Gulch', faction: 'horde',
      ruleset: 'normal', style: 'competitif', langue: 'fr', debut: null, region: 'US', niveau_min: 10, niveau_max: 19,
      genre: 'groupe', classe: 'chasseur',
      roles: [], perso: 'Grumash', contact: 'Grumash#1190',
      note: 'Groupe de 5 pour jouer ensemble, on cherche 5 autres Québécois.',
    },
    {
      id: 'demo-3', created_at: minutes(41), expires_at: dansHeures(4), debut: dansHeures(3),
      user_id: 'demo-j-mirabelle', activite: 'donjon', cible: 'The Deadmines', faction: 'alliance',
      ruleset: 'normal', style: 'apprentissage', langue: 'fr', region: 'EU', niveau_min: 18, niveau_max: 23,
      genre: 'groupe', classe: 'druide',
      roles: ['dps', 'dps'], perso: 'Mirabelle', contact: 'mirabelle_wow',
      note: 'Tank et heal sont prêts, il nous manque du DPS. Ce soir à 20 h.',
    },
    {
      id: 'demo-4', created_at: minutes(9), expires_at: dansHeures(2), debut: null,
      user_id: 'demo-j-brokk', activite: 'donjon', cible: 'Un donjon, peu importe', faction: 'horde',
      ruleset: 'normal', style: 'relax', langue: 'fr', region: 'US', niveau_min: 25, niveau_max: 25,
      genre: 'joueur', classe: 'guerrier',
      roles: ['tank'], perso: 'Brokk', contact: 'brokk_tank',
      note: 'Tank niveau 25 disponible ce soir, je cherche un groupe sympa.',
    },
  ].map((a) => ({ ...a, roles: [...new Set(a.roles)] }))
}

export function lireDemo() {
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

export async function estConnecte() {
  if (modeDemo) return connexionDemo()
  const { data } = await supabase.auth.getSession()
  return !!data.session
}

export async function lireAnnonces() {
  if (modeDemo) {
    const maintenant = Date.now()
    return lireDemo()
      .filter((a) => new Date(a.expires_at).getTime() > maintenant)
      .map((a) => ({ ...a, contact: null }))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  }
  // Depuis ameliorations8.sql, personne ne reçoit le contact d'une annonce ici: il passe par le chat du groupe.
  const essais = [COLONNES_ANNONCES, COLONNES_ANNONCES_SANS_COMPOSITION, COLONNES_ANNONCES_ANCIENNES, '*']
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
  const { data, error } = await supabase.from('annonces').insert(annonce).select('id,user_id,created_at,expires_at').single()
  if (error) throw error
  return data
}

// ---------- Annonces qui se répètent chaque semaine (supabase/ameliorations10.sql, partie 3) ----------

const CLE_REC_DEMO = 'forever-demo-recurrences'
const SEMAINE = 7 * 24 * 3600000

function lireRecDemo() {
  try {
    return JSON.parse(localStorage.getItem(CLE_REC_DEMO) || '[]')
  } catch {
    return []
  }
}

function ecrireRecDemo(liste) {
  try {
    localStorage.setItem(CLE_REC_DEMO, JSON.stringify(liste))
  } catch {
    // navigation privée: rien n'est gardé
  }
}

// Vrai si la base n'a pas encore reçu la partie 3 de ameliorations10.sql.
export const recurrencesAbsentes = (e) =>
  e?.code === 'PGRST202' || e?.code === '42883' || /could not find the function|schema cache/i.test(e?.message ?? '')

export async function creerRecurrence(idAnnonce) {
  if (modeDemo) {
    const a = lireDemo().find((x) => x.id === idAnnonce)
    if (!a?.debut || a.genre === 'joueur') throw Object.assign(new Error('annonce invalide'), { code: '22023' })
    const liste = lireRecDemo()
    const deja = liste.find((r) => r.source === idAnnonce || r.derniere === idAnnonce)
    if (deja) return deja.id
    if (liste.length >= 3) throw Object.assign(new Error('trop de répétitions'), { code: '54000' })
    const { id: _id, created_at: _c, user_id: _u, ...modele } = a
    const r = { id: `rec-${Date.now()}`, source: a.id, derniere: a.id, modele, prochain: new Date(new Date(a.debut).getTime() + SEMAINE).toISOString() }
    ecrireRecDemo([...liste, r])
    return r.id
  }
  const { data, error } = await supabase.rpc('creer_recurrence', { p_annonce: idAnnonce })
  if (error) throw error
  return data
}

// [{ id, source, derniere, prochain }]; [] pour un visiteur ou si la base n'est pas à jour.
export async function lireRecurrences() {
  if (!(await estConnecte())) return []
  if (modeDemo) return lireRecDemo().map(({ id, source, derniere, prochain }) => ({ id, source, derniere, prochain }))
  const { data, error } = await supabase.rpc('mes_recurrences')
  if (error) return []
  return data ?? []
}

export async function arreterRecurrence(id) {
  if (modeDemo) {
    ecrireRecDemo(lireRecDemo().filter((r) => r.id !== id))
    return
  }
  const { error } = await supabase.rpc('arreter_recurrence', { p_id: id })
  if (error) throw error
}

// Publie les annonces qui partent dans les 24 prochaines heures. Retourne le nombre publié (0 si rien ou base pas à jour).
export async function genererRecurrences() {
  if (!(await estConnecte())) return 0
  if (modeDemo) {
    const maintenant = Date.now()
    let n = 0
    const liste = lireRecDemo().map((r) => {
      let p = new Date(r.prochain).getTime()
      while (p < maintenant - 600000) p += SEMAINE
      if (p > maintenant + 24 * 3600000) return { ...r, prochain: new Date(p).toISOString() }
      const id = `demo-${Date.now()}-${n}`
      const annonce = {
        ...r.modele,
        id,
        user_id: UTILISATEUR_DEMO.id,
        created_at: new Date().toISOString(),
        debut: new Date(p).toISOString(),
        expires_at: new Date(p + 3600000).toISOString(),
      }
      try {
        localStorage.setItem(CLE_DEMO, JSON.stringify([annonce, ...lireDemo()]))
      } catch {
        return r
      }
      n += 1
      return { ...r, derniere: id, prochain: new Date(p + SEMAINE).toISOString() }
    })
    ecrireRecDemo(liste)
    return n
  }
  const { data, error } = await supabase.rpc('generer_recurrences')
  return error ? 0 : Number(data) || 0
}

// ---------- Connexion ----------

// Un compte Google donne le vrai nom complet de la personne. On ne le préremplit jamais comme contact (il se
// retrouverait publié par erreur) et on n'affiche que le prénom. Les anciens comptes Discord gardent leur nom d'utilisateur.
function nomVientDeGoogle(u, m) {
  if (String(m.iss ?? '').includes('google')) return true
  const fournisseurs = [u.app_metadata?.provider, ...(u.app_metadata?.providers ?? []), ...(u.identities ?? []).map((i) => i.provider)]
  return fournisseurs.includes('google') && !fournisseurs.includes('discord')
}

function versUtilisateur(u) {
  if (!u) return null
  const m = u.user_metadata ?? {}
  if (nomVientDeGoogle(u, m)) {
    const complet = String(m.full_name || m.name || '').trim()
    return {
      id: u.id,
      nom: String(m.given_name || '').trim() || complet.split(/\s+/)[0] || u.email?.split('@')[0] || 'Joueur',
      contact: '',
    }
  }
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

// Connexion avec Google. En mode démo, la connexion est simulée.
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
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
      // Google redemande quel compte utiliser au lieu de reprendre le dernier automatiquement
      queryParams: { prompt: 'select_account' },
    },
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

// Connexion par courriel et mot de passe (vrai site seulement; en démo, le formulaire garde le lien simulé).
// Se connecter n'envoie aucun courriel: seuls la création du compte et « mot de passe oublié » en envoient.
export const MOT_DE_PASSE_MIN = 8

export async function connecterParMotDePasse(courriel, motDePasse) {
  const { error } = await supabase.auth.signInWithPassword({ email: courriel, password: motDePasse })
  if (error) throw error
}

// Retourne 'envoye' (courriel de confirmation parti) ou 'connecte' (si Supabase ne demande pas de confirmation).
export async function creerCompte(courriel, motDePasse) {
  const { data, error } = await supabase.auth.signUp({
    email: courriel,
    password: motDePasse,
    options: { emailRedirectTo: window.location.origin },
  })
  if (error) throw error
  return data.session ? 'connecte' : 'envoye'
}

export async function demanderNouveauMotDePasse(courriel) {
  const { error } = await supabase.auth.resetPasswordForEmail(courriel, { redirectTo: window.location.origin })
  if (error) throw error
}

// Appelé quand la personne arrive avec le lien « mot de passe oublié »: elle doit alors choisir un nouveau mot de passe.
export function suivreRecuperation(rappel) {
  if (modeDemo) return () => {}
  const { data } = supabase.auth.onAuthStateChange((evenement) => {
    if (evenement === 'PASSWORD_RECOVERY') rappel()
  })
  return () => data.subscription.unsubscribe()
}

export async function changerMotDePasse(motDePasse) {
  const { error } = await supabase.auth.updateUser({ password: motDePasse })
  if (error) throw error
}

// Texte clair pour une erreur de connexion (les codes viennent de Supabase).
export function messageConnexion(e) {
  const code = e?.code || ''
  const texte = String(e?.message || '')
  if (code === 'invalid_credentials' || /invalid login credentials/i.test(texte)) {
    return "Courriel ou mot de passe incorrect. Si tu t'es connecté avec Google avant, utilise le bouton Google, ou « Mot de passe oublié » pour en choisir un."
  }
  if (code === 'email_not_confirmed' || /not confirmed/i.test(texte)) {
    return "Ton courriel n'est pas encore confirmé. Clique sur le lien dans le courriel qu'on t'a envoyé (regarde aussi dans les pourriels)."
  }
  if (code === 'weak_password' || /password.*(weak|short|at least)/i.test(texte)) {
    return `Mot de passe trop faible. Mets au moins ${MOT_DE_PASSE_MIN} caractères, avec des lettres et des chiffres.`
  }
  if (code === 'same_password') return "C'est déjà ton mot de passe actuel. Choises-en un autre."
  if (e?.status === 429 || /rate limit|too many|seconds/i.test(texte) || code.includes('rate_limit')) {
    return 'Trop d\'essais en peu de temps. Attends une minute et réessaie.'
  }
  return "Ça n'a pas marché. Vérifie ta connexion Internet et réessaie dans quelques minutes."
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

// type: 'annonce', 'guilde' ou 'joueur'. Signaler deux fois la même chose n'est pas une erreur.
export async function signaler(type, id, motif) {
  if (type === 'joueur') return signalerJoueur(id, motif)
  if (modeDemo) return
  const ligne = { motif, [type === 'guilde' ? 'guilde_id' : 'annonce_id']: id }
  const { error } = await supabase.from('signalements').insert(ligne)
  if (error && error.code !== '23505') throw error
}

// ---------- Compteur de visiteurs (supabase/ameliorations14.sql) ----------

// Une visite est comptée une fois par jour et par navigateur: le navigateur retient seulement la date de la dernière visite comptée.
// La base ne garde qu'un nombre par jour. Retourne le total d'aujourd'hui, ou null (démo, base pas à jour, hors ligne).
const CLE_VISITE = 'forever-visite'

function jourLocal() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export async function compterVisite() {
  if (modeDemo) return null
  try {
    const aujourdhui = jourLocal()
    let dejaCompte = false
    let memoire = true
    try {
      dejaCompte = localStorage.getItem(CLE_VISITE) === aujourdhui
      if (!dejaCompte) localStorage.setItem(CLE_VISITE, aujourdhui)
    } catch {
      memoire = false // navigation privée: on lit le total sans en ajouter un à chaque page
    }
    const { data, error } = await supabase.rpc(dejaCompte || !memoire ? 'visites_aujourdhui' : 'compter_visite')
    if (error || typeof data !== 'number') return null
    return data
  } catch {
    return null
  }
}

// Nombre de groupes formés aujourd'hui (le chef a accepté quelqu'un). Retourne null si l'info n'est pas disponible
// (mode démo, ou ameliorations15.sql pas encore roulé).
export async function lireGroupesFormes() {
  if (modeDemo) return null
  try {
    const { data, error } = await supabase.rpc('groupes_formes_aujourdhui')
    if (error || typeof data !== 'number') return null
    return data
  } catch {
    return null
  }
}

// ---------- Boîte à messages (bogue, idée) ----------

export async function envoyerRetour(categorie, texte) {
  if (modeDemo) return
  const { error } = await supabase.rpc('envoyer_retour', {
    p_categorie: categorie,
    p_texte: texte,
    p_navigateur: typeof navigator === 'undefined' ? null : navigator.userAgent,
  })
  if (error) throw error
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

// ---------- Joueurs: profils, présence en ligne et réputation ----------
// La liste n'est donnée qu'aux gens connectés. Un profil ne contient jamais de contact.

const CLE_JOUEURS_DEMO = 'forever-demo-joueurs'
const EN_LIGNE_DEMO = ['demo-j-thalyn', 'demo-j-mirabelle']
const JOUEUR_VIDE = {
  specialisation: '',
  guilde: '',
  bio: '',
  battletag: '',
  visible: true,
  pouces: 0,
  etiquettes: {},
  en_revision: false,
  moi: false,
  ma_reco: false,
  mes_etiquettes: [],
  mon_signalement: false,
}

function joueursDemo() {
  const j = (champs) => ({ ...JOUEUR_VIDE, ...champs })
  return [
    j({
      user_id: 'demo-j-thalyn', perso: 'Thalyn', classe: 'mage', specialisation: 'givre', niveau: 38, roles: ['dps'], faction: 'alliance',
      region: 'US', langue: 'fr', style: 'relax', guilde: 'Les Braves du Nord',
      bio: 'Mage de Québec, je joue surtout en soirée.', battletag: 'Thalyn#1234', vu_le: minutes(4),
      pouces: 12, etiquettes: { sympa: 9, ponctuel: 7, competent: 4 },
    }),
    j({
      user_id: 'demo-j-mirabelle', perso: 'Mirabelle', classe: 'druide', specialisation: 'restauration', niveau: 22, roles: ['heal', 'tank'],
      faction: 'alliance', region: 'EU', langue: 'fr', style: 'apprentissage',
      bio: 'Je cherche un groupe régulier pour apprendre les donjons.', vu_le: minutes(11),
      pouces: 5, etiquettes: { patient: 4, sympa: 3 },
    }),
    j({
      user_id: 'demo-j-grumash', perso: 'Grumash', classe: 'chasseur', specialisation: 'precision', niveau: 55, roles: ['dps'], faction: 'horde',
      region: 'US', langue: 'fr', style: 'competitif', guilde: 'Sang et Fer', battletag: 'Grumash#5678', vu_le: minutes(95),
      pouces: 8, etiquettes: { competent: 6, bon_chef: 3 },
    }),
    j({
      user_id: 'demo-j-lyra', perso: 'Lyra', classe: 'pretre', specialisation: 'sacre', niveau: 47, roles: ['heal'], faction: 'alliance',
      region: 'US', langue: 'en', style: 'carry', bio: 'English-speaking healer, happy to help.',
      vu_le: minutes(300), pouces: 3, etiquettes: { sympa: 3 },
    }),
    j({
      user_id: 'demo-j-brokk', perso: 'Brokk', classe: 'guerrier', specialisation: 'protection', niveau: 25, roles: ['tank'], faction: 'horde',
      region: 'US', langue: 'fr', style: 'relax', vu_le: minutes(26 * 60),
    }),
    j({
      user_id: 'demo-j-zulgar', perso: 'Zulgar', classe: 'voleur', specialisation: 'assassinat', niveau: 30, roles: ['dps'], faction: 'horde',
      region: 'EU', langue: 'fr', style: 'relax', vu_le: minutes(30 * 60),
      en_revision: true, pouces: null, etiquettes: null,
    }),
  ]
}

export function lireJoueursDemo() {
  try {
    const brut = localStorage.getItem(CLE_JOUEURS_DEMO)
    const liste = brut ? JSON.parse(brut) : joueursDemo()
    if (!brut) localStorage.setItem(CLE_JOUEURS_DEMO, JSON.stringify(liste))
    return liste
  } catch {
    return joueursDemo()
  }
}

function ecrireJoueursDemo(liste) {
  try {
    localStorage.setItem(CLE_JOUEURS_DEMO, JSON.stringify(liste))
  } catch {
    // navigation privée: le changement n'est pas gardé
  }
}

// Ce que la base accepte d'un profil (les champs vides deviennent « rien »).
function versLigneProfil(c) {
  return {
    perso: String(c.perso ?? '').trim(),
    classe: c.classe || null,
    // Une spécialisation n'existe qu'avec sa classe (la base le vérifie aussi).
    specialisation: c.classe ? String(c.specialisation ?? '') : '',
    niveau: c.niveau ? Number(c.niveau) : null,
    roles: c.roles ?? [],
    faction: c.faction,
    region: c.region,
    langue: c.langue || 'fr',
    style: c.style || 'relax',
    guilde: String(c.guilde ?? '').trim(),
    bio: String(c.bio ?? '').trim(),
    visible: c.visible !== false,
  }
}

async function idConnecte() {
  const { data } = await supabase.auth.getSession()
  return data.session?.user.id ?? null
}

// Retourne [] pour un visiteur. Lance une erreur si la base n'est pas encore à jour (ameliorations4.sql).
export async function lireJoueurs() {
  if (!(await estConnecte())) return []
  if (modeDemo) {
    const maintenant = Date.now()
    const actives = lireDemo().filter((a) => new Date(a.expires_at).getTime() > maintenant)
    return lireJoueursDemo()
      .filter((j) => j.visible || j.moi)
      .map((j) => ({
        ...j,
        annonce_id: actives.find((a) => a.user_id === j.user_id || a.perso === j.perso)?.id ?? null,
      }))
  }
  const { data, error } = await supabase.rpc('lister_joueurs')
  if (error) throw error
  return data
}

// Quand les groupes se forment: [{ jour (0 = dimanche), heure (heure de l'Est), n }]. Public. null si la base n'est pas à jour.
export async function lireAchalandage() {
  if (modeDemo) {
    // Fausses données de démonstration: surtout en soirée, plus le week-end.
    const lignes = []
    for (let jour = 0; jour < 7; jour += 1) {
      for (let heure = 12; heure < 24; heure += 1) {
        const soir = Math.max(0, 10 - Math.abs(heure - 20.5) * 2.2)
        const fin = jour === 0 || jour === 5 || jour === 6 ? 1.6 : 1
        const n = Math.round(soir * fin + ((jour * 7 + heure) % 3))
        if (n > 0) lignes.push({ jour, heure, n })
      }
    }
    return { lignes, demo: true }
  }
  try {
    const { data, error } = await supabase.rpc('stats_achalandage')
    return error ? null : { lignes: data ?? [], demo: false }
  } catch {
    return null
  }
}

// Comptes « Supporter » (liste tenue à la main dans Supabase, table « supporters »). Retourne un Set vide si on ne peut pas la lire.
export async function lireSupporters() {
  if (!(await estConnecte())) return new Set()
  if (modeDemo) return new Set(['demo-j-mirabelle', 'demo-j-lyra'])
  try {
    const { data, error } = await supabase.rpc('lister_supporters')
    if (error) return new Set()
    return new Set((data ?? []).map((x) => (typeof x === 'string' ? x : x.lister_supporters ?? x.user_id)))
  } catch {
    return new Set()
  }
}

export async function enregistrerProfil(champs) {
  const ligne = { ...versLigneProfil(champs), battletag: normaliserBattleTag(champs.battletag) }
  if (modeDemo) {
    const liste = lireJoueursDemo()
    ecrireJoueursDemo(
      liste.some((j) => j.moi)
        ? liste.map((j) => (j.moi ? { ...j, ...ligne } : j))
        : [{ ...JOUEUR_VIDE, ...ligne, user_id: UTILISATEUR_DEMO.id, moi: true, vu_le: new Date().toISOString() }, ...liste],
    )
    return
  }
  const uid = await idConnecte()
  if (!uid) throw new Error('connexion requise')
  // Si la base n'a pas encore une colonne (ameliorations4.sql pas roulé de nouveau), on enregistre le reste:
  // le BattleTag s'il est vide, et la spécialisation (le site ne l'exige plus tant que la base ne la connaît pas).
  const manquantes = ['specialisation', ...(ligne.battletag ? [] : ['battletag'])]
  let envoi = { ...ligne }
  let { error } = await supabase.from('profils').upsert({ user_id: uid, ...envoi }, { onConflict: 'user_id' })
  for (let i = 0; i < 2 && error?.code === 'PGRST204'; i += 1) {
    const colonne = manquantes.find((c) => error.message?.includes(`'${c}'`))
    if (!colonne) break
    delete envoi[colonne]
    ;({ error } = await supabase.from('profils').upsert({ user_id: uid, ...envoi }, { onConflict: 'user_id' }))
  }
  if (error) throw error
}

export async function supprimerProfil() {
  if (modeDemo) {
    ecrireJoueursDemo(lireJoueursDemo().filter((j) => !j.moi))
    return
  }
  const uid = await idConnecte()
  if (!uid) throw new Error('connexion requise')
  const { error } = await supabase.from('profils').delete().eq('user_id', uid)
  if (error) throw error
}

// Met à jour « vu pour la dernière fois ». Jamais bloquant: une erreur est ignorée.
export async function toucherProfil() {
  if (modeDemo) return
  try {
    const uid = await idConnecte()
    if (uid) await supabase.from('profils').update({ vu_le: new Date().toISOString() }).eq('user_id', uid)
  } catch {
    // pas grave: la prochaine mise à jour passera
  }
}

// Donne (ou change) un pouce avec des étiquettes. Un seul pouce par joueur.
export async function recommander(id, etiquettes) {
  if (modeDemo) {
    ecrireJoueursDemo(
      lireJoueursDemo().map((j) => {
        if (j.user_id !== id) return j
        const compte = { ...(j.etiquettes ?? {}) }
        for (const e of j.mes_etiquettes ?? []) compte[e] = Math.max(0, (compte[e] ?? 0) - 1)
        for (const e of etiquettes) compte[e] = (compte[e] ?? 0) + 1
        for (const e of Object.keys(compte)) if (!compte[e]) delete compte[e]
        return {
          ...j,
          ma_reco: true,
          mes_etiquettes: etiquettes,
          pouces: (j.pouces ?? 0) + (j.ma_reco ? 0 : 1),
          etiquettes: compte,
        }
      }),
    )
    return
  }
  const { error } = await supabase.rpc('recommander', { p_pour: id, p_etiquettes: etiquettes })
  if (error) throw error
}

export async function retirerReco(id) {
  if (modeDemo) {
    ecrireJoueursDemo(
      lireJoueursDemo().map((j) => {
        if (j.user_id !== id || !j.ma_reco) return j
        const compte = { ...(j.etiquettes ?? {}) }
        for (const e of j.mes_etiquettes ?? []) compte[e] = Math.max(0, (compte[e] ?? 0) - 1)
        for (const e of Object.keys(compte)) if (!compte[e]) delete compte[e]
        return { ...j, ma_reco: false, mes_etiquettes: [], pouces: Math.max(0, (j.pouces ?? 1) - 1), etiquettes: compte }
      }),
    )
    return
  }
  const { error } = await supabase.rpc('retirer_reco', { p_pour: id })
  if (error) throw error
}

export async function signalerJoueur(id, motif) {
  if (modeDemo) {
    ecrireJoueursDemo(lireJoueursDemo().map((j) => (j.user_id === id ? { ...j, mon_signalement: true } : j)))
    return
  }
  const { error } = await supabase.rpc('signaler_joueur', { p_pour: id, p_motif: motif })
  if (error) throw error
}

// ---------- Amis (ameliorations6.sql) ----------
// Une demande, une réponse, une liste. Le serveur décide de tout (limites, blocage); le site affiche seulement.
// Liens possibles: 'ami', 'recue' (quelqu'un m'a demandé), 'envoyee' (j'ai demandé), 'bloque'.

const CLE_AMIS_DEMO = 'forever-demo-amis'

function amisDemoInitiaux() {
  return {
    'demo-j-thalyn': { lien: 'ami', depuis: minutes(3 * 24 * 60) },
    'demo-j-mirabelle': { lien: 'recue', depuis: minutes(35) },
  }
}

export function lireAmisDemo() {
  try {
    const brut = localStorage.getItem(CLE_AMIS_DEMO)
    if (brut) return JSON.parse(brut) ?? {}
    const depart = amisDemoInitiaux()
    localStorage.setItem(CLE_AMIS_DEMO, JSON.stringify(depart))
    return depart
  } catch {
    return amisDemoInitiaux()
  }
}

function ecrireAmisDemo(liens) {
  try {
    localStorage.setItem(CLE_AMIS_DEMO, JSON.stringify(liens))
  } catch {
    // navigation privée: le changement n'est pas gardé
  }
}

// Retourne [] pour un visiteur. Lance une erreur si la base n'est pas encore à jour (ameliorations6.sql).
export async function lireAmis() {
  if (!(await estConnecte())) return []
  if (modeDemo) {
    const joueurs = lireJoueursDemo()
    return Object.entries(lireAmisDemo()).flatMap(([id, l]) => {
      const j = joueurs.find((x) => x.user_id === id)
      if (!j) return []
      const montrer = l.lien === 'ami' && j.visible
      return [
        {
          user_id: id, lien: l.lien, depuis: l.depuis,
          perso: j.perso, classe: j.classe, specialisation: j.specialisation, niveau: j.niveau, roles: j.roles, faction: j.faction, region: j.region,
          langue: j.langue, style: j.style, guilde: j.guilde, bio: j.bio, visible: j.visible,
          battletag: montrer ? j.battletag : '',
          vu_le: montrer ? j.vu_le : null,
        },
      ]
    })
  }
  const { data, error } = await supabase.rpc('lister_amis')
  if (error) throw error
  return data
}

// action: 'demander', 'accepter', 'refuser', 'annuler', 'retirer', 'bloquer' ou 'debloquer'.
// Retourne le nouveau lien: 'aucun', 'envoyee', 'ami' ou 'bloque'.
export async function agirAmi(id, action) {
  if (modeDemo) {
    const erreur = (message, code) => Object.assign(new Error(message), { code })
    const liens = { ...lireAmisDemo() }
    const actuel = liens[id]?.lien
    if (action === 'demander') {
      if (!lireJoueursDemo().some((j) => j.moi)) throw erreur("crée ton profil avant d'ajouter des amis", '22023')
      if (actuel === 'bloque') throw erreur("tu as bloqué cette personne, débloque-la d'abord", '22023')
      if (actuel === 'ami') return 'ami'
      if (actuel === 'recue') liens[id] = { lien: 'ami', depuis: new Date().toISOString() }
      else liens[id] = { lien: 'envoyee', depuis: new Date().toISOString() }
    } else if (action === 'accepter') {
      if (actuel !== 'recue') throw erreur('demande introuvable', 'P0002')
      liens[id] = { lien: 'ami', depuis: new Date().toISOString() }
    } else if (action === 'refuser') {
      if (actuel === 'recue') delete liens[id]
    } else if (action === 'annuler') {
      if (actuel === 'envoyee') delete liens[id]
    } else if (action === 'retirer') {
      if (actuel === 'ami') delete liens[id]
    } else if (action === 'bloquer') {
      liens[id] = { lien: 'bloque', depuis: new Date().toISOString() }
    } else if (action === 'debloquer') {
      if (actuel === 'bloque') delete liens[id]
    }
    ecrireAmisDemo(liens)
    return liens[id]?.lien ?? 'aucun'
  }
  const { data, error } = await supabase.rpc('agir_ami', { p_user: id, p_action: action })
  if (error) throw error
  return data
}

// ---------- Modération (ameliorations5.sql) ----------
// Réservée aux modérateurs: chaque fonction du serveur revérifie le compte. Ici, on affiche seulement la page.

const CLE_MODERATION_DEMO = 'forever-demo-moderation'

export const MESSAGE_COMPTE_SUSPENDU =
  "Ton compte est suspendu: tu ne peux plus publier. Si tu penses que c'est une erreur, contacte l'équipe du site."

// Vrai si l'erreur vient d'un compte suspendu par la modération.
export const compteSuspendu = (e) => /compte suspendu/i.test(e?.message ?? '')

function moderationDemoInitiale() {
  const il_y_a = (m) => minutes(m)
  return {
    aTraiter: [
      {
        type: 'annonce', cible_id: 'mod-demo-1', nb: 2, motifs: ['faux_contact', 'spam'], dernier: il_y_a(12),
        auteur: 'mod-demo-u1', perso: 'Pubspam', titre: 'donjon: The Deadmines', detail: 'Ouvre ta porte, vends or WoW pas cher, visite mon site',
        contact: 'pubspam#0000', actif: true, suspendu: false,
      },
      {
        type: 'guilde', cible_id: 'mod-demo-2', nb: 1, motifs: ['autre'], dernier: il_y_a(95),
        auteur: 'mod-demo-u2', perso: 'Chefsuspect', titre: 'Les Faux Frères', detail: 'Guilde de 400 membres, ça rush tout',
        contact: 'chef_suspect', actif: true, suspendu: false,
      },
      {
        type: 'joueur', cible_id: 'mod-demo-u3', nb: 3, motifs: ['arnaque', 'comportement'], dernier: il_y_a(300),
        auteur: 'mod-demo-u3', perso: 'Arnaqueur', titre: 'Arnaqueur', detail: 'Je groupe seulement si on me paie',
        contact: 'Arnaqueur#4242', actif: true, suspendu: false,
      },
    ],
    suspendus: [],
  }
}

function lireModerationDemo() {
  try {
    const brut = localStorage.getItem(CLE_MODERATION_DEMO)
    return brut ? JSON.parse(brut) : moderationDemoInitiale()
  } catch {
    return moderationDemoInitiale()
  }
}

function ecrireModerationDemo(etat) {
  try {
    localStorage.setItem(CLE_MODERATION_DEMO, JSON.stringify(etat))
  } catch {
    // navigation privée: les changements durent jusqu'au prochain chargement
  }
}

// Vrai seulement pour un modérateur. Toute erreur (base pas à jour, pas de réseau) veut dire « non »: le lien
// « Modération » n'apparaît simplement pas.
export async function estModerateur() {
  if (!(await estConnecte())) return false
  if (modeDemo) return true
  try {
    const { data, error } = await supabase.rpc('est_moderateur')
    return !error && data === true
  } catch {
    return false
  }
}

// { aTraiter: [{ type, cible_id, nb, motifs, dernier, auteur, perso, titre, detail, contact, actif, suspendu }], suspendus: [{ user_id, raison, depuis, perso }] }
export async function lireModeration() {
  if (modeDemo) {
    const etat = lireModerationDemo()
    // Même ordre que le serveur: le plus signalé d'abord, puis le plus récent.
    return { ...etat, aTraiter: [...etat.aTraiter].sort((x, y) => y.nb - x.nb || new Date(y.dernier) - new Date(x.dernier)) }
  }
  const [file, suspendus] = await Promise.all([supabase.rpc('mod_a_traiter'), supabase.rpc('mod_suspendus')])
  if (file.error) throw file.error
  if (suspendus.error) throw suspendus.error
  return { aTraiter: file.data ?? [], suspendus: suspendus.data ?? [] }
}

// action: 'ecarter' | 'retirer' | 'remettre' | 'suspendre' | 'retablir'
// type: 'annonce' | 'guilde' | 'joueur' (pour 'suspendre' et 'retablir', `id` est l'identifiant du compte)
export async function actionModeration(action, type, id, raison = '') {
  if (modeDemo) {
    const etat = lireModerationDemo()
    const change = (f) => etat.aTraiter.map((x) => (x.cible_id === id && x.type === type ? f(x) : x))
    if (action === 'ecarter') etat.aTraiter = etat.aTraiter.filter((x) => !(x.cible_id === id && x.type === type))
    else if (action === 'retirer') etat.aTraiter = change((x) => ({ ...x, actif: false }))
    else if (action === 'remettre') etat.aTraiter = etat.aTraiter.filter((x) => !(x.cible_id === id && x.type === type))
    else if (action === 'suspendre') {
      const cible = etat.aTraiter.find((x) => x.auteur === id)
      etat.aTraiter = etat.aTraiter.map((x) => (x.auteur === id ? { ...x, actif: false, suspendu: true } : x))
      etat.suspendus = [{ user_id: id, raison, depuis: new Date().toISOString(), perso: cible?.perso ?? null }, ...etat.suspendus.filter((s) => s.user_id !== id)]
    } else if (action === 'retablir') {
      etat.suspendus = etat.suspendus.filter((s) => s.user_id !== id)
      etat.aTraiter = etat.aTraiter.map((x) => (x.auteur === id ? { ...x, suspendu: false } : x))
    }
    ecrireModerationDemo(etat)
    return
  }
  const appels = {
    ecarter: ['mod_ecarter', { p_type: type, p_id: id }],
    retirer: ['mod_retirer', { p_type: type, p_id: id }],
    remettre: ['mod_remettre', { p_type: type, p_id: id }],
    suspendre: ['mod_suspendre', { p_user: id, p_raison: raison }],
    retablir: ['mod_retablir', { p_user: id }],
  }
  const [fonction, params] = appels[action]
  const { error } = await supabase.rpc(fonction, params)
  if (error) throw error
}

// Qui est sur le site en ce moment. Appelle `rappel` avec l'ensemble des identifiants présents.
// `partager`: vrai si ce joueur accepte d'être vu en ligne (profil visible). Retourne une fonction d'arrêt.
// Si la connexion en temps réel ne marche pas, la liste reste vide: la page fonctionne quand même.
export function suivrePresence(uid, partager, rappel) {
  if (!uid) {
    rappel(new Set())
    return () => {}
  }
  if (modeDemo) {
    rappel(new Set([...EN_LIGNE_DEMO, ...(partager ? [uid] : [])]))
    return () => {}
  }
  let canal
  try {
    canal = supabase.channel('joueurs-en-ligne', { config: { presence: { key: uid } } })
    canal.on('presence', { event: 'sync' }, () => rappel(new Set(Object.keys(canal.presenceState()))))
    canal.subscribe((statut) => {
      if (statut === 'SUBSCRIBED' && partager) canal.track({ en_ligne: true }).catch(() => {})
    })
  } catch {
    rappel(new Set())
    return () => {}
  }
  return () => {
    supabase.removeChannel(canal)
  }
}
