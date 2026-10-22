// Demandes pour rejoindre, chat de groupe et chat entre amis (supabase/ameliorations8.sql).
// Le serveur décide de tout (qui peut lire, écrire, limites, blocages). Ici, on appelle les fonctions du serveur;
// en mode démo, tout reste dans le navigateur et de faux joueurs répondent pour qu'on puisse essayer.
import {
  UTILISATEUR_DEMO,
  estConnecte,
  lireAmisDemo,
  lireDemo,
  lireJoueursDemo,
  minutes,
  modeDemo,
  supabase,
} from './store.js'

const MOI = UTILISATEUR_DEMO.id
const CLE_CHAT_DEMO = 'forever-demo-chat'
const DUREE_APRES_FIN = 24 * 3600000

export const LONGUEUR_MESSAGE = 500
export const LONGUEUR_MOT = 140

// Vrai si la base n'a pas encore reçu ameliorations8.sql (fonction inconnue).
export const messagerieAbsente = (e) =>
  e?.code === 'PGRST202' || e?.code === '42883' || /could not find the function|schema cache/i.test(e?.message ?? '')

const erreur = (message, code) => Object.assign(new Error(message), { code })

// ---------- Démo: tout est gardé dans le navigateur ----------

function etatInitial() {
  return {
    seq: 100,
    groupes: {},
    demandes: [],
    messages: [],
    amisMessages: [
      { id: 1, de: 'demo-j-thalyn', pour: MOI, texte: 'Salut! Tu joues ce soir?', created_at: minutes(55), masque: false },
      { id: 2, de: MOI, pour: 'demo-j-thalyn', texte: 'Oui, vers 20 h. On fait un donjon?', created_at: minutes(50), masque: false },
      { id: 3, de: 'demo-j-thalyn', pour: MOI, texte: "Parfait, je t'invite quand je suis prêt.", created_at: minutes(48), masque: false },
    ],
    lectures: { 'a:demo-j-thalyn': 2 },
    reponses: [],
    signalements: [],
  }
}

function lireEtat() {
  try {
    const brut = localStorage.getItem(CLE_CHAT_DEMO)
    if (brut) return JSON.parse(brut)
  } catch {
    // navigation privée: on repart d'un état neuf
  }
  return etatInitial()
}

function ecrireEtat(etat) {
  try {
    localStorage.setItem(CLE_CHAT_DEMO, JSON.stringify(etat))
  } catch {
    // navigation privée: les changements durent jusqu'au prochain chargement
  }
}

const REPONSES = [
  'Haha, ok!',
  "Je suis dispo, dis-moi quand tu es prêt.",
  'Parfait, on se retrouve en jeu.',
  'Bien reçu.',
  "Super, j'arrive dans 5 minutes.",
]

function profilDemo(id) {
  return lireJoueursDemo().find((j) => j.user_id === id)
}

function persoDe(id) {
  if (id === MOI) return lireJoueursDemo().find((j) => j.moi)?.perso ?? UTILISATEUR_DEMO.nom
  return profilDemo(id)?.perso ?? 'Joueur'
}

function nouveauId(etat) {
  etat.seq += 1
  return etat.seq
}

function creerGroupeDemo(etat, a) {
  const g = {
    id: `g-${a.id}`,
    annonce_id: a.id,
    chef: a.user_id,
    titre: `${a.activite}: ${a.cible}`,
    perso: a.perso,
    contact: a.contact ?? '',
    genre: a.genre ?? 'groupe',
    created_at: a.created_at,
    fin_le: a.expires_at,
    ferme: false,
    complet: false,
  }
  etat.groupes[g.id] = g
  return g
}

// De fausses demandes sur les annonces de la personne qui essaie le site.
const FAUSSES_DEMANDES = [
  ['demo-j-mirabelle', 'heal', 'Disponible tout de suite!', 20],
  ['demo-j-brokk', 'tank', 'Tank niveau 25, on y va?', 12],
  ['demo-j-thalyn', 'dps', "Mage givre, j'ai déjà fait ce donjon.", 7],
  ['demo-j-lyra', 'heal', 'English-speaking healer, is that ok?', 3],
]

// Garde l'état cohérent avec les annonces, simule les réponses des faux joueurs et efface ce qui est trop vieux.
function synchroniser(etat) {
  const maintenant = Date.now()
  const annonces = lireDemo()
  let change = false

  for (const a of annonces) {
    if (a.user_id === MOI && !etat.groupes[`g-${a.id}`]) {
      creerGroupeDemo(etat, a)
      change = true
    }
    // Les premières demandes arrivent quelques secondes après la publication (pour voir d'abord « Annonce publiée »).
    const g = etat.groupes[`g-${a.id}`]
    if (a.user_id === MOI && g && !g.demandes_semees && maintenant - new Date(a.created_at).getTime() > 6000) {
      g.demandes_semees = true
      FAUSSES_DEMANDES.forEach(([de, role, message, min]) => {
        if (a.genre === 'joueur' && role !== 'tank') return
        etat.demandes.push({ id: `d-${g.id}-${de}`, groupe_id: g.id, de, role, message, statut: 'en_attente', created_at: minutes(min) })
      })
      change = true
    }
  }

  for (const g of Object.values(etat.groupes)) {
    if (!g.annonce_id) continue
    const a = annonces.find((x) => x.id === g.annonce_id)
    if (!a) {
      g.annonce_id = null
      g.fin_le = new Date(Math.min(new Date(g.fin_le).getTime(), maintenant)).toISOString()
      change = true
    } else if (g.fin_le !== a.expires_at) {
      g.fin_le = a.expires_at
      change = true
    }
  }

  // Les faux chefs répondent aux demandes de la personne après 3 secondes (un d'eux refuse, pour voir les deux cas).
  for (const d of etat.demandes) {
    const g = etat.groupes[d.groupe_id]
    if (d.de !== MOI || d.statut !== 'en_attente' || !g || g.chef === MOI) continue
    if (maintenant - new Date(d.created_at).getTime() < 3000) continue
    d.repondu_le = new Date().toISOString()
    if (g.chef === 'demo-j-grumash') {
      d.statut = 'refusee'
    } else {
      d.statut = 'acceptee'
      etat.messages.push({ id: nouveauId(etat), groupe_id: g.id, de: MOI, genre: 'rejoint', texte: '', created_at: new Date().toISOString(), masque: false })
      etat.messages.push({
        id: nouveauId(etat), groupe_id: g.id, de: g.chef, genre: 'texte', masque: false, created_at: new Date().toISOString(),
        texte: "Salut! Bienvenue dans le groupe. Je t'invite dès que tu es prêt.",
      })
    }
    change = true
  }

  // Réponses des faux joueurs aux messages écrits.
  const dues = etat.reponses.filter((r) => r.quand <= maintenant)
  if (dues.length) {
    etat.reponses = etat.reponses.filter((r) => r.quand > maintenant)
    for (const r of dues) {
      const texte = REPONSES[r.n % REPONSES.length]
      if (r.type === 'ami') {
        etat.amisMessages.push({ id: nouveauId(etat), de: r.de, pour: MOI, texte, created_at: new Date().toISOString(), masque: false })
      } else if (etat.groupes[r.groupe_id]) {
        etat.messages.push({ id: nouveauId(etat), groupe_id: r.groupe_id, de: r.de, genre: 'texte', texte, created_at: new Date().toISOString(), masque: false })
      }
    }
    change = true
  }

  // 24 heures après la fin de l'annonce, le groupe et ses messages disparaissent.
  for (const g of Object.values(etat.groupes)) {
    if (new Date(g.fin_le).getTime() < maintenant - DUREE_APRES_FIN) {
      delete etat.groupes[g.id]
      etat.demandes = etat.demandes.filter((d) => d.groupe_id !== g.id)
      etat.messages = etat.messages.filter((m) => m.groupe_id !== g.id)
      change = true
    }
  }
  return change
}

// Lit l'état, le met à jour, et le garde s'il a changé. `fn` peut modifier l'état.
function avecEtat(fn) {
  const etat = lireEtat()
  const change = synchroniser(etat)
  const resultat = fn ? fn(etat) : undefined
  if (change || fn) ecrireEtat(etat)
  return resultat
}

// Joueurs à accepter (sans le chef) pour que le groupe soit plein, ou null si on ne le sait pas (comme groupe_places_max en SQL).
function placesMaxDemo(a) {
  if (!a) return null
  if (a.activite === 'donjon') return 4
  if (a.activite === 'raid' && a.roles_nb) return Object.values(a.roles_nb).reduce((n, v) => n + (Number(v) > 0 ? Number(v) : 0), 0) || null
  return null
}

function ajusterCompletDemo(etat, g) {
  const maxi = placesMaxDemo(lireDemo().find((x) => x.id === g.annonce_id))
  if (!maxi) return
  const nb = etat.demandes.filter((d) => d.groupe_id === g.id && d.statut === 'acceptee').length
  g.complet = nb >= maxi
}

const membresDemo = (etat, gid) => etat.demandes.filter((d) => d.groupe_id === gid && d.statut === 'acceptee')
const estMembreDemo = (etat, g) => !!g && (g.chef === MOI || membresDemo(etat, g.id).some((d) => d.de === MOI))
const groupeOuvert = (g) => !!g && new Date(g.fin_le).getTime() > Date.now() - DUREE_APRES_FIN

function exigerMembre(etat, gid) {
  const g = etat.groupes[gid]
  if (!groupeOuvert(g) || !estMembreDemo(etat, g)) throw erreur('groupe introuvable', 'P0002')
  return g
}

function planifierReponse(etat, type, g, de) {
  etat.reponses.push({ type, groupe_id: g?.id, de, quand: Date.now() + 2200, n: etat.seq })
}

function texteValide(texte) {
  const t = String(texte ?? '').trim()
  if (!t || t.length > LONGUEUR_MESSAGE) throw erreur('message invalide', '22023')
  return t
}

// ---------- Mes demandes et mes conversations ----------

// [{ id, annonce_id, groupe_id, statut, role }]: l'état de mes demandes (pour les cartes d'annonces).
export async function lireMesDemandes() {
  if (!(await estConnecte())) return []
  if (modeDemo) {
    return avecEtat((etat) =>
      etat.demandes
        .filter((d) => d.de === MOI && ['en_attente', 'acceptee', 'refusee', 'expulse'].includes(d.statut))
        .filter((d) => etat.groupes[d.groupe_id]?.annonce_id && groupeOuvert(etat.groupes[d.groupe_id]))
        .map((d) => ({ id: d.id, annonce_id: etat.groupes[d.groupe_id].annonce_id, groupe_id: d.groupe_id, statut: d.statut, role: d.role })),
    )
  }
  const { data, error } = await supabase.rpc('mes_demandes')
  if (error) throw error
  return data ?? []
}

// [{ annonce_id, complet, acceptes, par_role }]: qui est déjà dans chaque groupe (nombres seulement). Vide si la base n'est pas à jour.
export async function lirePlaces() {
  if (modeDemo) {
    if (!(await estConnecte())) return []
    return avecEtat((etat) =>
      Object.values(etat.groupes)
        .filter((g) => g.annonce_id && !g.ferme && groupeOuvert(g) && new Date(g.fin_le).getTime() > Date.now())
        .map((g) => {
          const membres = membresDemo(etat, g.id)
          const par_role = {}
          for (const d of membres) if (d.role) par_role[d.role] = (par_role[d.role] ?? 0) + 1
          return { annonce_id: g.annonce_id, complet: !!g.complet, acceptes: membres.length, par_role }
        })
        .filter((p) => p.complet || p.acceptes > 0),
    )
  }
  try {
    const { data, error } = await supabase.rpc('places_groupes')
    return error ? [] : data ?? []
  } catch {
    return []
  }
}

// Le chef ferme (true) ou rouvre (false) les demandes de son groupe.
export async function reglerComplet(groupe, complet) {
  if (modeDemo) {
    return avecEtat((etat) => {
      const g = etat.groupes[groupe]
      if (!g || g.chef !== MOI) throw erreur('réservé au chef du groupe', '42501')
      g.complet = !!complet
      return g.complet
    })
  }
  const { data, error } = await supabase.rpc('groupe_complet', { p_groupe: groupe, p_complet: !!complet })
  if (error) throw error
  return data
}

// Groupes où je suis chef ou accepté + amis avec qui j'ai écrit. Chaque ligne:
// { type: 'groupe'|'ami', cible, annonce_id, titre, sous_titre, classe, est_chef, contact, nb_membres, nb_en_attente,
//   non_lus, dernier_le, dernier_genre, extrait, fin_le, ferme }
export async function lireConversations() {
  if (!(await estConnecte())) return []
  if (modeDemo) {
    return avecEtat((etat) => {
      const lignes = []
      for (const g of Object.values(etat.groupes)) {
        if (!groupeOuvert(g) || !estMembreDemo(etat, g)) continue
        const msgs = etat.messages.filter((m) => m.groupe_id === g.id)
        const dernier = msgs[msgs.length - 1]
        const lu = etat.lectures[`g:${g.id}`]
        const nonLus = Math.max(
          msgs.filter((m) => m.id > (lu ?? 0) && m.de !== MOI && !m.masque).length,
          lu === undefined && g.chef !== MOI ? 1 : 0,
        )
        lignes.push({
          type: 'groupe', cible: g.id, annonce_id: g.annonce_id, titre: g.titre,
          sous_titre: g.chef === MOI ? 'Ton groupe' : `Chef: ${g.perso || '?'}`, classe: null, est_chef: g.chef === MOI,
          contact: g.contact ?? '', nb_membres: 1 + membresDemo(etat, g.id).length,
          nb_en_attente: g.chef === MOI ? etat.demandes.filter((d) => d.groupe_id === g.id && d.statut === 'en_attente').length : 0,
          non_lus: nonLus, dernier_le: dernier?.created_at ?? null, dernier_genre: dernier?.genre ?? null,
          extrait: dernier?.genre === 'texte' && !dernier.masque ? dernier.texte.slice(0, 80) : '',
          fin_le: g.fin_le, ferme: g.ferme,
        })
      }
      const amis = lireAmisDemo()
      for (const [id, l] of Object.entries(amis)) {
        if (l.lien !== 'ami') continue
        const msgs = etat.amisMessages.filter((m) => (m.de === id && m.pour === MOI) || (m.de === MOI && m.pour === id))
        if (msgs.length === 0) continue
        const dernier = msgs[msgs.length - 1]
        const lu = etat.lectures[`a:${id}`] ?? 0
        const p = profilDemo(id)
        lignes.push({
          type: 'ami', cible: id, annonce_id: null, titre: p?.perso ?? 'Joueur', sous_titre: '', classe: p?.classe ?? null,
          est_chef: false, contact: '', nb_membres: 2, nb_en_attente: 0,
          non_lus: msgs.filter((m) => m.id > lu && m.de === id && !m.masque).length,
          dernier_le: dernier.created_at, dernier_genre: 'texte', extrait: dernier.masque ? '' : dernier.texte.slice(0, 80),
          fin_le: null, ferme: false,
        })
      }
      return lignes.sort((a, b) => new Date(b.dernier_le ?? 0) - new Date(a.dernier_le ?? 0))
    })
  }
  const { data, error } = await supabase.rpc('mes_conversations')
  if (error) throw error
  return data ?? []
}

// ---------- Demandes ----------

// Retourne 'en_attente' (ou 'acceptee' si c'était déjà fait).
export async function demanderRejoindre(annonce, role, message) {
  const mot = String(message ?? '').trim()
  if (modeDemo) {
    return avecEtat((etat) => {
      if (!lireJoueursDemo().some((j) => j.moi)) throw erreur('crée ton profil avant de demander à rejoindre', '22023')
      if (annonce.user_id === MOI) throw erreur("c'est ta propre annonce", '22023')
      if (mot.length > LONGUEUR_MOT) throw erreur('demande invalide', '22023')
      const g = etat.groupes[`g-${annonce.id}`] ?? creerGroupeDemo(etat, lireDemo().find((x) => x.id === annonce.id) ?? annonce)
      const d = etat.demandes.find((x) => x.groupe_id === g.id && x.de === MOI)
      if (d && ['en_attente', 'acceptee'].includes(d.statut)) return d.statut
      if (d && d.statut !== 'quitte') throw erreur('demande refusée', '42501')
      if (g.complet) throw erreur('groupe complet', '55000')
      if (etat.demandes.filter((x) => x.de === MOI && x.statut === 'en_attente').length >= 10) throw erreur('trop de demandes en attente', '54000')
      const neuve = { id: `d-${g.id}-${MOI}`, groupe_id: g.id, de: MOI, role: role || null, message: mot, statut: 'en_attente', created_at: new Date().toISOString() }
      if (d) Object.assign(d, neuve)
      else etat.demandes.push(neuve)
      return 'en_attente'
    })
  }
  const { data, error } = await supabase.rpc('demander_rejoindre', {
    p_annonce: annonce.id,
    p_role: role || null,
    p_message: mot,
  })
  if (error) throw error
  return data
}

// Les demandes d'un de mes groupes (chef seulement). Chaque ligne:
// { id, user_id, statut, role, message, created_at, perso, classe, specialisation, niveau, roles, guilde, langue, style, bio }
export async function lireDemandesGroupe(groupe) {
  if (modeDemo) {
    return avecEtat((etat) => {
      const g = etat.groupes[groupe]
      if (!g || g.chef !== MOI) return []
      return etat.demandes
        .filter((d) => d.groupe_id === groupe && ['en_attente', 'acceptee', 'refusee'].includes(d.statut))
        .map((d) => {
          const p = profilDemo(d.de) ?? {}
          return {
            id: d.id, user_id: d.de, statut: d.statut, role: d.role, message: d.message, created_at: d.created_at,
            perso: p.perso ?? 'Joueur', classe: p.classe ?? null, specialisation: p.specialisation ?? '', niveau: p.niveau ?? null,
            roles: p.roles ?? [], guilde: p.guilde ?? '', langue: p.langue ?? 'fr', style: p.style ?? 'relax', bio: p.bio ?? '',
          }
        })
        .sort((a, b) => ({ en_attente: 0, acceptee: 1, refusee: 2 })[a.statut] - ({ en_attente: 0, acceptee: 1, refusee: 2 })[b.statut] ||
          new Date(b.created_at) - new Date(a.created_at))
    })
  }
  const { data, error } = await supabase.rpc('lister_demandes', { p_groupe: groupe })
  if (error) throw error
  return data ?? []
}

// Chef: 'accepter', 'refuser', 'expulser'. Joueur: 'annuler', 'quitter'. Retourne le nouveau statut.
export async function agirDemande(demande, action) {
  if (modeDemo) {
    return avecEtat((etat) => {
      const d = etat.demandes.find((x) => x.id === demande)
      if (!d) throw erreur('demande introuvable', 'P0002')
      const g = etat.groupes[d.groupe_id]
      const maintenant = new Date().toISOString()
      const message = (genre, de) =>
        etat.messages.push({ id: nouveauId(etat), groupe_id: g.id, de, genre, texte: '', created_at: maintenant, masque: false })
      if (action === 'annuler') {
        if (d.de !== MOI || d.statut !== 'en_attente') throw erreur('demande déjà traitée', '22023')
        etat.demandes = etat.demandes.filter((x) => x.id !== d.id)
        return 'aucun'
      }
      if (action === 'quitter') {
        if (d.de !== MOI || d.statut !== 'acceptee') throw erreur("tu n'es pas dans ce groupe", '22023')
        d.statut = 'quitte'
        message('quitte', MOI)
        ajusterCompletDemo(etat, g)
        return 'quitte'
      }
      if (g.chef !== MOI) throw erreur('réservé au chef du groupe', '42501')
      if (action === 'accepter') {
        if (d.statut === 'acceptee') return 'acceptee'
        if (g.ferme) throw erreur('groupe fermé', '42501')
        if (membresDemo(etat, g.id).length >= 39) throw erreur('le groupe est plein', '54000')
        d.statut = 'acceptee'
        d.repondu_le = maintenant
        message('rejoint', d.de)
        etat.messages.push({
          id: nouveauId(etat), groupe_id: g.id, de: d.de, genre: 'texte', masque: false, created_at: maintenant,
          texte: d.role === 'tank' ? "Merci! J'arrive, je suis prêt." : 'Merci de m’avoir accepté! J’arrive.',
        })
        ajusterCompletDemo(etat, g)
        return 'acceptee'
      }
      if (action === 'refuser') {
        if (d.statut !== 'en_attente') throw erreur('demande déjà traitée', '22023')
        d.statut = 'refusee'
        d.repondu_le = maintenant
        return 'refusee'
      }
      if (d.statut !== 'acceptee') throw erreur("ce joueur n'est pas dans le groupe", '22023')
      d.statut = 'expulse'
      message('expulse', d.de)
      ajusterCompletDemo(etat, g)
      return 'expulse'
    })
  }
  const { data, error } = await supabase.rpc('agir_demande', { p_demande: demande, p_action: action })
  if (error) throw error
  return data
}

// Les membres d'un groupe: [{ user_id, perso, classe, specialisation, niveau, role, est_chef }]
export async function lireMembres(groupe) {
  if (modeDemo) {
    return avecEtat((etat) => {
      const g = exigerMembre(etat, groupe)
      const chef = profilDemo(g.chef)
      const lui = { user_id: g.chef, perso: g.chef === MOI ? persoDe(MOI) : chef?.perso ?? g.perso, classe: chef?.classe ?? null,
        specialisation: chef?.specialisation ?? '', niveau: chef?.niveau ?? null, role: null, est_chef: true }
      const autres = membresDemo(etat, g.id).map((d) => {
        const p = d.de === MOI ? lireJoueursDemo().find((j) => j.moi) : profilDemo(d.de)
        return { user_id: d.de, perso: p?.perso ?? 'Joueur', classe: p?.classe ?? null, specialisation: p?.specialisation ?? '',
          niveau: p?.niveau ?? null, role: d.role, est_chef: false }
      })
      return [lui, ...autres]
    })
  }
  const { data, error } = await supabase.rpc('membres_groupe', { p_groupe: groupe })
  if (error) throw error
  return data ?? []
}

// ---------- Messages ----------
// Chaque message: { id, user_id, genre ('texte', 'rejoint', 'quitte', 'expulse'), texte, masque, created_at, perso, classe, moi }
// `apres`: ne donne que les messages plus récents que cet identifiant (0 = les 100 derniers). Lire marque comme lu.

function versMessage(m, de) {
  const p = de === MOI ? lireJoueursDemo().find((j) => j.moi) : profilDemo(de)
  return {
    id: m.id, user_id: de, genre: m.genre ?? 'texte', texte: m.masque ? '' : m.texte, masque: !!m.masque, created_at: m.created_at,
    perso: p?.perso ?? (de === MOI ? UTILISATEUR_DEMO.nom : 'Joueur'), classe: p?.classe ?? null, moi: de === MOI,
  }
}

export async function lireMessagesGroupe(groupe, apres = 0) {
  if (modeDemo) {
    return avecEtat((etat) => {
      exigerMembre(etat, groupe)
      const tous = etat.messages.filter((m) => m.groupe_id === groupe)
      if (tous.length) etat.lectures[`g:${groupe}`] = Math.max(etat.lectures[`g:${groupe}`] ?? 0, tous[tous.length - 1].id)
      else etat.lectures[`g:${groupe}`] = etat.lectures[`g:${groupe}`] ?? 0
      return tous.filter((m) => m.id > apres).slice(-100).map((m) => versMessage(m, m.de))
    })
  }
  const { data, error } = await supabase.rpc('lire_groupe', { p_groupe: groupe, p_apres: apres })
  if (error) throw error
  return data ?? []
}

export async function ecrireGroupe(groupe, texte) {
  const t = texteValide(texte)
  if (modeDemo) {
    return avecEtat((etat) => {
      const g = exigerMembre(etat, groupe)
      if (g.ferme) throw erreur('ce groupe est fermé', '42501')
      const recents = etat.messages.filter((m) => m.de === MOI && m.genre === 'texte' && Date.now() - new Date(m.created_at).getTime() < 30000)
      if (recents.length >= 15) throw erreur('trop de messages, attends un peu', '54000')
      const id = nouveauId(etat)
      etat.messages.push({ id, groupe_id: groupe, de: MOI, genre: 'texte', texte: t, created_at: new Date().toISOString(), masque: false })
      etat.lectures[`g:${groupe}`] = id
      const fakes = g.chef === MOI ? membresDemo(etat, groupe).map((d) => d.de) : [g.chef]
      if (fakes.length) planifierReponse(etat, 'groupe', g, fakes[id % fakes.length])
      return id
    })
  }
  const { data, error } = await supabase.rpc('ecrire_groupe', { p_groupe: groupe, p_texte: t })
  if (error) throw error
  return data
}

export async function lireMessagesAmi(ami, apres = 0) {
  if (modeDemo) {
    return avecEtat((etat) => {
      if (lireAmisDemo()[ami]?.lien !== 'ami') throw erreur('conversation introuvable', 'P0002')
      const tous = etat.amisMessages.filter((m) => (m.de === ami && m.pour === MOI) || (m.de === MOI && m.pour === ami))
      if (tous.length) etat.lectures[`a:${ami}`] = Math.max(etat.lectures[`a:${ami}`] ?? 0, tous[tous.length - 1].id)
      return tous.filter((m) => m.id > apres).slice(-100).map((m) => versMessage(m, m.de))
    })
  }
  const { data, error } = await supabase.rpc('lire_ami', { p_ami: ami, p_apres: apres })
  if (error) throw error
  return data ?? []
}

export async function ecrireAmi(ami, texte) {
  const t = texteValide(texte)
  if (modeDemo) {
    return avecEtat((etat) => {
      if (lireAmisDemo()[ami]?.lien !== 'ami') throw erreur('conversation introuvable', 'P0002')
      const recents = etat.amisMessages.filter((m) => m.de === MOI && Date.now() - new Date(m.created_at).getTime() < 30000)
      if (recents.length >= 15) throw erreur('trop de messages, attends un peu', '54000')
      const id = nouveauId(etat)
      etat.amisMessages.push({ id, de: MOI, pour: ami, texte: t, created_at: new Date().toISOString(), masque: false })
      etat.lectures[`a:${ami}`] = id
      planifierReponse(etat, 'ami', null, ami)
      return id
    })
  }
  const { data, error } = await supabase.rpc('ecrire_ami', { p_ami: ami, p_texte: t })
  if (error) throw error
  return data
}

// Efface un de mes messages.
export async function effacerMessage(type, id) {
  if (modeDemo) {
    avecEtat((etat) => {
      if (type === 'groupe') etat.messages = etat.messages.filter((m) => !(m.id === id && m.de === MOI && m.genre === 'texte'))
      else etat.amisMessages = etat.amisMessages.filter((m) => !(m.id === id && m.de === MOI))
    })
    return
  }
  const { error } = await supabase.rpc('effacer_message', { p_type: type, p_id: id })
  if (error) throw error
}

// Signaler le message de quelqu'un d'autre. Trois personnes différentes le masquent.
export async function signalerMessage(type, id, motif) {
  if (modeDemo) {
    avecEtat((etat) => {
      const source = type === 'groupe' ? etat.messages : etat.amisMessages
      const m = source.find((x) => x.id === id)
      if (!m || m.de === MOI) throw erreur('message introuvable', 'P0002')
      if (etat.signalements.some((s) => s.type === type && s.message_id === id)) return
      const g = type === 'groupe' ? etat.groupes[m.groupe_id] : null
      etat.signalements.push({
        type, message_id: id, nb: 1, motifs: [motif], dernier: new Date().toISOString(), auteur: m.de,
        auteur_perso: persoDe(m.de), texte: m.texte, contexte: '', lieu: g ? `Groupe « ${g.titre} »` : 'Message privé entre amis',
        masque: false, suspendu: false,
      })
    })
    return
  }
  const { error } = await supabase.rpc('signaler_message', { p_type: type, p_id: id, p_motif: motif })
  if (error) throw error
}

// ---------- Modération des messages signalés ----------

// [{ type, message_id, nb, motifs, dernier, auteur, auteur_perso, texte, contexte, lieu, masque, suspendu }]
export async function lireMessagesSignales() {
  if (modeDemo) return avecEtat((etat) => [...etat.signalements])
  const { data, error } = await supabase.rpc('mod_messages_signales')
  if (error) throw error
  return data ?? []
}

// action: 'ecarter' (garder le message) ou 'effacer'.
export async function actionMessageModeration(action, type, id) {
  if (modeDemo) {
    avecEtat((etat) => {
      etat.signalements = etat.signalements.filter((s) => !(s.type === type && s.message_id === id))
      if (action === 'effacer') {
        if (type === 'groupe') etat.messages = etat.messages.filter((m) => m.id !== id)
        else etat.amisMessages = etat.amisMessages.filter((m) => m.id !== id)
      }
    })
    return
  }
  const { error } = await supabase.rpc(action === 'effacer' ? 'mod_message_effacer' : 'mod_message_ecarter', { p_type: type, p_id: id })
  if (error) throw error
}
