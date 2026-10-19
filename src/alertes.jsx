import { FACTIONS, LANGUES, REGIONS, ROLES, STYLES, nomDe } from './data.js'
import { Icone, NOMS_ACTIVITE } from './commun.jsx'

// Alertes de nouvelles annonces. La personne garde les filtres de l'onglet Groupes comme « alerte »: tant que le site
// reste ouvert dans un onglet, chaque nouvelle annonce qui correspond est signalée dans la page et, si elle l'a
// permis, par une notification du navigateur. Rien n'est envoyé à un serveur: le choix reste dans le navigateur.

const CLE = 'forever-alerte'

// Les filtres de l'onglet Groupes qu'une alerte retient.
export const CLES_ALERTE = ['activite', 'faction', 'region', 'role', 'niveau', 'style', 'langue', 'genre', 'planifies']

export function filtresDeAlerte(filtres) {
  return Object.fromEntries(CLES_ALERTE.map((k) => [k, filtres[k]]))
}

export function lireAlerte() {
  try {
    const v = JSON.parse(localStorage.getItem(CLE) ?? 'null')
    if (v && typeof v === 'object' && v.filtres && typeof v.filtres === 'object') return { filtres: v.filtres }
  } catch {
    // contenu abîmé: pas d'alerte
  }
  return null
}

export function ecrireAlerte(alerte) {
  try {
    if (alerte) localStorage.setItem(CLE, JSON.stringify(alerte))
    else localStorage.removeItem(CLE)
  } catch {
    // navigation privée: l'alerte dure jusqu'à la fermeture de la page
  }
}

// « Donjons, Alliance, niveau 20, français »
export function decrireFiltres(f) {
  const parties = []
  if (f.activite && f.activite !== 'tout') parties.push({ donjon: 'Donjons', raid: 'Raids', pvp: 'PvP' }[f.activite])
  if (f.genre === 'groupe') parties.push('groupes')
  if (f.genre === 'joueur') parties.push('joueurs seuls')
  if (f.planifies) parties.push('planifiés')
  if (f.faction) parties.push(nomDe(FACTIONS, f.faction))
  if (f.niveau) parties.push(`niveau ${f.niveau}`)
  if (f.role) parties.push(`rôle ${nomDe(ROLES, f.role)}`)
  if (f.langue) parties.push(f.langue === 'fr' ? 'en français' : `en ${nomDe(LANGUES, f.langue)}`)
  if (f.region) parties.push(nomDe(REGIONS, f.region))
  if (f.style) parties.push(`style ${nomDe(STYLES, f.style).toLowerCase()}`)
  const texte = parties.join(', ')
  return texte ? texte.charAt(0).toUpperCase() + texte.slice(1) : 'Toutes les annonces'
}

export const memesFiltres = (a, b) => CLES_ALERTE.every((k) => (a[k] ?? '') === (b[k] ?? ''))

// ---------- Notifications du navigateur ----------

// 'indisponibles' | 'bloquees' | 'autorisees' | 'a-demander'
export function etatNotifications() {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'indisponibles'
  if (Notification.permission === 'granted') return 'autorisees'
  if (Notification.permission === 'denied') return 'bloquees'
  return 'a-demander'
}

export async function demanderNotifications() {
  if (etatNotifications() !== 'a-demander') return etatNotifications()
  try {
    await Notification.requestPermission()
  } catch {
    // très vieux navigateurs: pas de promesse; on relit l'état plus bas
  }
  return etatNotifications()
}

export function texteNouvelleAnnonce(a) {
  const niveaux = a.niveau_min === a.niveau_max ? `niveau ${a.niveau_min}` : `niveaux ${a.niveau_min}–${a.niveau_max}`
  const roles = ROLES.filter((r) => (a.roles ?? []).includes(r.id)).map((r) => r.nom)
  const cherche = roles.length ? `${a.genre === 'joueur' ? 'joue' : 'cherche'} ${roles.join(', ')}` : ''
  return {
    titre: `Nouvelle annonce ${nomDe(FACTIONS, a.faction)}`,
    corps: [`${NOMS_ACTIVITE[a.activite] ?? 'Groupe'}: ${a.cible}`, niveaux, cherche, a.perso ? `(${a.perso})` : '']
      .filter(Boolean)
      .join(' · '),
  }
}

// Une notification du navigateur pour une annonce. Retourne true si elle a été envoyée.
export function notifierAnnonce(a, surClic) {
  if (etatNotifications() !== 'autorisees') return false
  const { titre, corps } = texteNouvelleAnnonce(a)
  try {
    const n = new Notification(titre, { body: corps, tag: `annonce-${a.id}`, icon: '/favicon.svg' })
    n.onclick = () => {
      window.focus()
      surClic?.()
      n.close()
    }
    return true
  } catch {
    // certains navigateurs mobiles refusent « new Notification »: l'alerte reste dans la page
    return false
  }
}

// ---------- Interface (sous le nombre d'annonces) ----------

export function Alerte({ alerte, filtres, etat, activer, remplacer, arreter, autoriser }) {
  if (!alerte) {
    return (
      <div className="alerte">
        <button type="button" className="bouton petit" onClick={activer}>
          <Icone nom="cloche" taille={15} />
          M'alerter des nouvelles annonces
        </button>
        <span className="alerte-aide">
          {decrireFiltres(filtres)}. Marche tant que le site est ouvert dans un onglet.
        </span>
      </div>
    )
  }
  const identiques = memesFiltres(alerte.filtres, filtres)
  return (
    <div className="alerte actif" role="group" aria-label="Alerte de nouvelles annonces">
      <span className="alerte-etat">
        <Icone nom="cloche" taille={15} />
        <span>
          <strong>Alerte active:</strong> {decrireFiltres(alerte.filtres)}
        </span>
      </span>
      <span className="alerte-actions">
        {!identiques && (
          <button type="button" className="lien" onClick={remplacer}>
            Utiliser mes filtres actuels
          </button>
        )}
        {etat === 'a-demander' && (
          <button type="button" className="lien" onClick={autoriser}>
            Autoriser les notifications
          </button>
        )}
        <button type="button" className="lien" onClick={arreter}>
          Arrêter
        </button>
      </span>
      <span className="alerte-aide">
        {etat === 'autorisees' && "Quand le site est dans un autre onglet, une notification du navigateur t'avertit. "}
        {etat === 'bloquees' && "Les notifications sont bloquées dans ton navigateur: tu seras averti dans la page seulement. "}
        {etat === 'indisponibles' && "Ton navigateur n'a pas les notifications: tu seras averti dans la page seulement. "}
        Le site doit rester ouvert dans un onglet.
      </span>
    </div>
  )
}
