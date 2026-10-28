import { FACTIONS, LANGUES, REGIONS, ROLES, STYLES, nomDe } from './data.js'
import { Icone, NOMS_ACTIVITE } from './commun.jsx'
import { pushConfigure } from './push.js'

// Alertes de nouvelles annonces. La personne garde les filtres de l'onglet Groupes comme « alerte »: tant que le site
// reste ouvert dans un onglet, chaque nouvelle annonce qui correspond est signalée dans la page et, si elle l'a
// permis, par une notification du navigateur. Une personne connectée qui a activé les alertes sur son appareil
// (push.js) est aussi avertie site fermé: ses filtres sont alors gardés avec son compte (ameliorations16.sql).

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
  if (f.activite && f.activite !== 'tout') parties.push({ donjon: 'Donjons', raid: 'Raids', pvp: 'PvP', quete: 'Quêtes' }[f.activite])
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

// `appareil`: { supporte, bloque, actif } pour la personne connectée (null: pas connectée ou alertes pas configurées).
// `serveur`: l'alerte est aussi gardée avec le compte, donc le serveur peut avertir même quand le site est fermé.
export function Alerte({ alerte, filtres, etat, activer, remplacer, arreter, autoriser, appareil = null, serveur = false, activerAppareil, occupe = false }) {
  const possible = !!appareil && appareil.supporte && !appareil.bloque
  const sitefermeOk = possible && appareil.actif
  if (!alerte) {
    return (
      <div className="alerte">
        <button type="button" className="bouton petit" onClick={activer}>
          <Icone nom="cloche" taille={15} />
          M'alerter des nouvelles annonces
        </button>
        <span className="alerte-aide">
          {decrireFiltres(filtres)}.{' '}
          {sitefermeOk
            ? 'Tu seras averti même quand le site est fermé.'
            : possible
              ? "Le bouton active aussi les alertes sur cet appareil, pour t'avertir même quand le site est fermé."
              : pushConfigure && !appareil
                ? "Marche tant que le site est ouvert dans un onglet. Connecte-toi pour être averti même quand il est fermé."
                : 'Marche tant que le site est ouvert dans un onglet.'}
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
        {possible && !appareil.actif && (
          <button type="button" className="lien" onClick={activerAppareil} disabled={occupe}>
            Activer les alertes sur cet appareil
          </button>
        )}
        {!possible && etat === 'a-demander' && (
          <button type="button" className="lien" onClick={autoriser}>
            Autoriser les notifications
          </button>
        )}
        <button type="button" className="lien" onClick={arreter}>
          Arrêter
        </button>
      </span>
      <span className="alerte-aide">
        {sitefermeOk && serveur ? (
          "Tu es averti sur tes appareils où les alertes sont activées, même quand le site est fermé."
        ) : (
          <>
            {etat === 'autorisees' && "Quand le site est dans un autre onglet, une notification du navigateur t'avertit. "}
            {etat === 'bloquees' && "Les notifications sont bloquées dans ton navigateur: tu seras averti dans la page seulement. "}
            {etat === 'indisponibles' && "Ton navigateur n'a pas les notifications: tu seras averti dans la page seulement. "}
            Le site doit rester ouvert dans un onglet{possible && !appareil.actif ? ", sauf si tu actives les alertes sur cet appareil" : ''}.
          </>
        )}
      </span>
    </div>
  )
}

// Invitation à activer les alertes de l'appareil, juste après la connexion. `ios`: iPhone ou iPad où le site n'est pas
// encore installé (les alertes n'y marchent qu'à partir de l'icône sur l'écran d'accueil).
export function InvitationAlertes({ ios, activer, plusTard, occupe, probleme }) {
  return (
    <section className="invitation-alertes" aria-label="Alertes sur ton cellulaire">
      <span className="invitation-icone" aria-hidden="true">
        <Icone nom="cloche" taille={20} />
      </span>
      <div className="invitation-texte">
        <strong>Reçois des alertes sur ton cellulaire</strong>
        {ios ? (
          <p>
            Sur iPhone et iPad, installe d'abord le site: touche le bouton Partager, puis « Sur l'écran d'accueil ».
            Ouvre-le ensuite depuis l'icône et reviens ici pour activer les alertes.
          </p>
        ) : (
          <p>
            Une alerte quand on te répond, quand ton groupe va partir ou quand une annonce t'intéresse, même si le site est
            fermé. Le texte de tes messages n'est jamais envoyé.
          </p>
        )}
        {probleme && <p className="msg-erreur" role="alert">{probleme}</p>}
      </div>
      <div className="invitation-actions">
        {!ios && (
          <button type="button" className="bouton principal petit" onClick={activer} disabled={occupe}>
            Activer les alertes
          </button>
        )}
        <button type="button" className="bouton petit" onClick={plusTard}>
          {ios ? 'Compris' : 'Plus tard'}
        </button>
      </div>
    </section>
  )
}

const CLE_INVITATION = 'forever-push-invite'
const SEPT_JOURS = 7 * 24 * 3600 * 1000

// L'invitation est cachée 7 jours après « Plus tard » (ou « Compris »).
export function invitationAlertesVisible() {
  try {
    const v = Number(localStorage.getItem(CLE_INVITATION))
    return !v || Date.now() - v > SEPT_JOURS
  } catch {
    return true
  }
}

export function reporterInvitationAlertes() {
  try {
    localStorage.setItem(CLE_INVITATION, String(Date.now()))
  } catch {
    // navigation privée: elle reviendra à la prochaine visite
  }
}
