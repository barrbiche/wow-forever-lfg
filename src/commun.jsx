import { useState } from 'react'
import { LANCEMENT_LE, MOTIFS_SIGNALEMENT, RAIDS_OUVERTS_LE } from './data.js'
import { signaler } from './store.js'

// ---------- Petites icônes (dessinées à la main, héritent la couleur du texte) ----------

export const CHEMINS = {
  donjon: 'M5 21V10a7 7 0 0114 0v11M3 21h18M12 21v-6',
  pvp: 'M4 4l16 16M20 4L4 20M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
  tank: 'M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6l7-3z',
  heal: 'M12 5v14M5 12h14',
  dps: 'M6 18L18 6M13 6h5v5M6 14l4 4M4 20l3-3',
  raid: 'M4 21V8h3v3h3V8h4v3h3V8h3v13M3 21h18M10 21v-4a2 2 0 014 0v4',
  horloge: 'M12 7v5l3 2M12 3a9 9 0 100 18 9 9 0 000-18z',
  joueur: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0',
  guilde: 'M5 3h14v10c0 4-3 6-7 8-4-2-7-4-7-8V3zM9 8h6M9 12h6',
}
export const NOMS_ACTIVITE = { donjon: 'Donjon', raid: 'Raid', pvp: 'PvP' }

export function Icone({ nom, taille = 18 }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={taille}
      height={taille}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={CHEMINS[nom]} />
    </svg>
  )
}

// ---------- Utilitaires ----------

export function depuis(iso) {
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (min < 1) return "à l'instant"
  if (min < 60) return `il y a ${min} min`
  return `il y a ${Math.floor(min / 60)} h`
}

export function reste(iso) {
  const min = Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 60000))
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h} h ${m} min` : `${h} h`
}

// Nombre de jours (calendrier local) d'ici une date: 0 aujourd'hui, 1 demain, négatif si c'est passé.
export function joursAvant(date) {
  return Math.round((new Date(date).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000)
}

// Compte à rebours de l'en-tête: la sortie du jeu, puis l'ouverture des raids. Rien ensuite.
// Retourne { texte, date } ou null.
export function compteARebours() {
  const quand = (j) => (j === 1 ? 'demain' : `dans ${j} jours`)
  const jeu = joursAvant(LANCEMENT_LE)
  if (jeu === 0) return { texte: "Le jeu sort aujourd'hui!", date: '' }
  if (jeu > 0) return { texte: `Le jeu sort ${quand(jeu)}`, date: '4 novembre' }
  const raids = joursAvant(RAIDS_OUVERTS_LE)
  if (raids === 0) return { texte: "Les raids ouvrent aujourd'hui!", date: '' }
  if (raids > 0) return { texte: `Les raids ouvrent ${quand(raids)}`, date: '9 décembre' }
  return null
}

// « aujourd'hui 20 h », « demain 19 h 30 », « samedi 20 h »
export function departTexte(iso) {
  const d = new Date(iso)
  const jours = Math.round((new Date(d).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000)
  const h = d.getHours()
  const m = d.getMinutes()
  const heure = `${h} h${m ? ` ${String(m).padStart(2, '0')}` : ''}`
  const jour = jours <= 0 ? "aujourd'hui" : jours === 1 ? 'demain' : d.toLocaleDateString('fr-CA', { weekday: 'long' })
  return `${jour} ${heure}`
}

export function avantDepart(iso) {
  return new Date(iso).getTime() <= Date.now() ? 'Départ en cours' : `Départ dans ${reste(iso)}`
}

// Valeur pour <input type="datetime-local">, en heure locale.
export function versChampDate(d) {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

// Proposition de départ: la prochaine heure pile, au moins 30 minutes plus tard.
export function departParDefaut() {
  const d = new Date(Date.now() + 30 * 60000)
  d.setMinutes(0, 0, 0)
  d.setHours(d.getHours() + 1)
  return versChampDate(d)
}

export function partRestante(a) {
  const total = new Date(a.expires_at).getTime() - new Date(a.created_at).getTime()
  const restant = new Date(a.expires_at).getTime() - Date.now()
  if (total <= 0) return 0
  return Math.max(0, Math.min(1, restant / total))
}

// « Aujourd'hui », « Demain », « Samedi 17 octobre » (séparateurs de l'agenda des groupes planifiés).
export function jourTexte(iso) {
  const d = new Date(iso)
  const jours = Math.round((new Date(d).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000)
  if (jours <= 0) return "Aujourd'hui"
  if (jours === 1) return 'Demain'
  const t = d.toLocaleDateString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long' })
  return t.charAt(0).toUpperCase() + t.slice(1)
}

// Contact d'une annonce ou d'une guilde. Les visiteurs non connectés ne le reçoivent pas du serveur.
// Une invitation Discord (discord.gg/…) devient un lien; tout le reste reste du texte simple.
export function Contact({ contact, onConnexion }) {
  const [copie, setCopie] = useState(false)

  if (!contact) {
    return (
      <div className="contact">
        <button type="button" className="bouton petit" onClick={onConnexion}>
          Se connecter pour voir le contact
        </button>
      </div>
    )
  }

  const invitation = /^https:\/\/(discord\.gg|discord\.com\/invite)\/[\w-]+$/i.test(contact)

  const copier = async () => {
    try {
      await navigator.clipboard.writeText(contact)
      setCopie(true)
      setTimeout(() => setCopie(false), 2000)
    } catch {
      // presse-papiers bloqué: le contact reste visible et sélectionnable à la main
    }
  }

  return (
    <div className="contact">
      {invitation ? (
        <a className="invitation" href={contact} target="_blank" rel="noopener noreferrer">
          {contact.replace('https://', '')}
        </a>
      ) : (
        <code>{contact}</code>
      )}
      <button type="button" className="bouton petit" onClick={copier}>
        {copie ? 'Copié' : 'Copier le contact'}
      </button>
    </div>
  )
}

// Copie l'adresse directe d'une annonce ou d'une guilde (type: 'annonce' ou 'guilde').
export function LienDirect({ type, id }) {
  const [copie, setCopie] = useState(false)

  const copier = async () => {
    const adresse = `${window.location.origin}/?${type}=${encodeURIComponent(id)}`
    try {
      await navigator.clipboard.writeText(adresse)
      setCopie(true)
      setTimeout(() => setCopie(false), 2000)
    } catch {
      // presse-papiers bloqué: on affiche l'adresse pour qu'elle puisse être copiée à la main
      window.prompt('Copie ce lien:', adresse)
    }
  }

  return (
    <button type="button" className="lien signaler" onClick={copier}>
      {copie ? 'Lien copié' : 'Copier le lien'}
    </button>
  )
}

// Bouton « Signaler » avec un petit formulaire en ligne. Trois personnes différentes retirent l'annonce.
export function Signalement({ type, id, utilisateur, onConnexion }) {
  const [ouvert, setOuvert] = useState(false)
  const [motif, setMotif] = useState('spam')
  const [etat, setEtat] = useState('')

  if (etat === 'fait') return <p className="aide signale">Merci, ton signalement est envoyé.</p>

  if (!ouvert) {
    return (
      <button
        type="button"
        className="lien signaler"
        onClick={() => (utilisateur ? setOuvert(true) : onConnexion())}
      >
        Signaler
      </button>
    )
  }

  const envoyer = async (e) => {
    e.preventDefault()
    setEtat('envoi')
    try {
      await signaler(type, id, motif)
      setEtat('fait')
    } catch {
      setEtat('erreur')
    }
  }

  return (
    <form className="signalement" onSubmit={envoyer}>
      <label className="champ">
        <span>Pourquoi signaler?</span>
        <select value={motif} onChange={(e) => setMotif(e.target.value)}>
          {MOTIFS_SIGNALEMENT.map((m) => <option key={m.id} value={m.id}>{m.nom}</option>)}
        </select>
      </label>
      <div className="signalement-actions">
        <button type="submit" className="bouton petit danger" disabled={etat === 'envoi'}>Envoyer</button>
        <button type="button" className="bouton petit" onClick={() => setOuvert(false)}>Annuler</button>
      </div>
      {etat === 'erreur' && <p className="msg-erreur" role="alert">Le signalement n'a pas été envoyé. Réessaie.</p>}
    </form>
  )
}
