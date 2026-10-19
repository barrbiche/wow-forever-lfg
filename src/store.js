// Couche de données. Deux modes:
//  - Supabase, si VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY sont définies (vrai site)
//  - Démo, sinon: les annonces restent dans le navigateur (pour essayer le site sans rien configurer)
import { createClient } from '@supabase/supabase-js'
import { normaliserBattleTag } from './data.js'

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

// type: 'annonce', 'guilde' ou 'joueur'. Signaler deux fois la même chose n'est pas une erreur.
export async function signaler(type, id, motif) {
  if (type === 'joueur') return signalerJoueur(id, motif)
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

// ---------- Joueurs: profils, présence en ligne et réputation ----------
// La liste n'est donnée qu'aux gens connectés. Un profil ne contient jamais de contact.

const CLE_JOUEURS_DEMO = 'forever-demo-joueurs'
const EN_LIGNE_DEMO = ['demo-j-thalyn', 'demo-j-mirabelle']
const JOUEUR_VIDE = {
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
      user_id: 'demo-j-thalyn', perso: 'Thalyn', classe: 'mage', niveau: 38, roles: ['dps'], faction: 'alliance',
      region: 'US', langue: 'fr', style: 'relax', guilde: 'Les Braves du Nord',
      bio: 'Mage de Québec, je joue surtout en soirée.', battletag: 'Thalyn#1234', vu_le: minutes(4),
      pouces: 12, etiquettes: { sympa: 9, ponctuel: 7, competent: 4 },
    }),
    j({
      user_id: 'demo-j-mirabelle', perso: 'Mirabelle', classe: 'druide', niveau: 22, roles: ['heal', 'tank'],
      faction: 'alliance', region: 'EU', langue: 'fr', style: 'apprentissage',
      bio: 'Je cherche un groupe régulier pour apprendre les donjons.', vu_le: minutes(11),
      pouces: 5, etiquettes: { patient: 4, sympa: 3 },
    }),
    j({
      user_id: 'demo-j-grumash', perso: 'Grumash', classe: 'chasseur', niveau: 55, roles: ['dps'], faction: 'horde',
      region: 'US', langue: 'fr', style: 'competitif', guilde: 'Sang et Fer', battletag: 'Grumash#5678', vu_le: minutes(95),
      pouces: 8, etiquettes: { competent: 6, bon_chef: 3 },
    }),
    j({
      user_id: 'demo-j-lyra', perso: 'Lyra', classe: 'pretre', niveau: 47, roles: ['heal'], faction: 'alliance',
      region: 'US', langue: 'en', style: 'carry', bio: 'English-speaking healer, happy to help.',
      vu_le: minutes(300), pouces: 3, etiquettes: { sympa: 3 },
    }),
    j({
      user_id: 'demo-j-brokk', perso: 'Brokk', classe: 'guerrier', niveau: 25, roles: ['tank'], faction: 'horde',
      region: 'US', langue: 'fr', style: 'relax', vu_le: minutes(26 * 60),
    }),
    j({
      user_id: 'demo-j-zulgar', perso: 'Zulgar', classe: 'voleur', niveau: 30, roles: ['dps'], faction: 'horde',
      region: 'EU', langue: 'fr', style: 'relax', vu_le: minutes(30 * 60),
      en_revision: true, pouces: null, etiquettes: null,
    }),
  ]
}

function lireJoueursDemo() {
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

// Crée le profil à partir d'une première annonce, sans toucher à un profil qui existe déjà.
// Retourne vrai si le profil vient d'être créé.
export async function assurerProfil(champs) {
  const ligne = versLigneProfil(champs)
  if (modeDemo) {
    const liste = lireJoueursDemo()
    if (liste.some((j) => j.moi)) return false
    ecrireJoueursDemo([
      { ...JOUEUR_VIDE, ...ligne, user_id: UTILISATEUR_DEMO.id, moi: true, vu_le: new Date().toISOString() },
      ...liste,
    ])
    return true
  }
  const uid = await idConnecte()
  if (!uid) return false
  const { data, error } = await supabase
    .from('profils')
    .upsert({ user_id: uid, ...ligne }, { onConflict: 'user_id', ignoreDuplicates: true })
    .select('user_id')
  if (error) throw error
  return (data?.length ?? 0) > 0
}

export async function enregistrerProfil(champs) {
  // Le BattleTag n'est écrit que par ce formulaire (jamais par le profil créé avec une annonce).
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
  let { error } = await supabase.from('profils').upsert({ user_id: uid, ...ligne }, { onConflict: 'user_id' })
  if (error?.code === 'PGRST204' && !ligne.battletag) {
    // La base n'a pas encore la colonne « battletag » (ameliorations4.sql pas encore roulé de nouveau): on enregistre le reste.
    const sansBattleTag = { ...ligne }
    delete sansBattleTag.battletag
    ;({ error } = await supabase.from('profils').upsert({ user_id: uid, ...sansBattleTag }, { onConflict: 'user_id' }))
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

// ---------- Modération (ameliorations5.sql) ----------
// Réservée aux modérateurs: chaque fonction du serveur revérifie le compte. Ici, on affiche seulement la page.

const CLE_MODERATION_DEMO = 'forever-demo-moderation'

export const MESSAGE_COMPTE_SUSPENDU =
  "Ton compte est suspendu: tu ne peux plus publier. Si tu penses que c'est une erreur, écris à l'équipe du serveur Discord."

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
