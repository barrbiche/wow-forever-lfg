import { createContext, useContext, useState, useSyncExternalStore } from 'react'
import { CLASSES, LANCEMENT_LE, MOTIFS_JOUEUR, MOTIFS_SIGNALEMENT, RAIDS_OUVERTS_LE, nomSpecialisation } from './data.js'
import { signaler } from './store.js'
import { LangueJeu, commandeInviter, useLangueJeu } from './langue.jsx'

// ---------- Petites icônes (dessinées à la main, héritent la couleur du texte) ----------

export const CHEMINS = {
  donjon: 'M5 21V10a7 7 0 0114 0v11M3 21h18M12 21v-6',
  pvp: 'M4 4l16 16M20 4L4 20M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
  tank: 'M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6l7-3z',
  heal: 'M12 5v14M5 12h14',
  plus: 'M12 5v14M5 12h14',
  dps: 'M6 18L18 6M13 6h5v5M6 14l4 4M4 20l3-3',
  quete: 'M12 3.5v11M12 19v1',
  son: 'M11 5L6 9H3v6h3l5 4V5zM15.5 8.5a5 5 0 010 7M18.5 5.5a9 9 0 010 13',
  sonCoupe: 'M11 5L6 9H3v6h3l5 4V5zM16 9.5l5 5M21 9.5l-5 5',
  sortie: 'M10 4H5v16h5M15 8l4 4-4 4M19 12H9',
  bouclier: 'M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6l7-3zM9 12l2 2 4-4',
  raid: 'M4 21V8h3v3h3V8h4v3h3V8h3v13M3 21h18M10 21v-4a2 2 0 014 0v4',
  horloge: 'M12 7v5l3 2M12 3a9 9 0 100 18 9 9 0 000-18z',
  joueur: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0',
  guilde: 'M5 3h14v10c0 4-3 6-7 8-4-2-7-4-7-8V3zM9 8h6M9 12h6',
  cloche: 'M6 8a6 6 0 1112 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 003.4 0',
  telephone: 'M8 2h8a2 2 0 012 2v16a2 2 0 01-2 2H8a2 2 0 01-2-2V4a2 2 0 012-2zM12 6.5v6M9.5 10.5l2.5 2.5 2.5-2.5M11 18.5h2',
  coeur: 'M12 21l-1.4-1.3C5.4 15 2 11.9 2 8.5 2 5.4 4.4 3 7.5 3c1.7 0 3.4.8 4.5 2.1C13.1 3.8 14.8 3 16.5 3 19.6 3 22 5.4 22 8.5c0 3.4-3.4 6.5-8.6 11.2L12 21z',
  discussion: 'M5 4h14a2 2 0 012 2v9a2 2 0 01-2 2h-7l-5 4v-4H5a2 2 0 01-2-2V6a2 2 0 012-2zM8 10h.01M12 10h.01M16 10h.01',
  livre: 'M4 4h7a2 2 0 012 2v14a2 2 0 00-2-2H4V4zM20 4h-7a2 2 0 00-2 2v14a2 2 0 012-2h7V4z',
  ami: 'M10 12a4 4 0 100-8 4 4 0 000 8zM2 21a8 8 0 0116 0M19 8v6M16 11h6',
  amis: 'M9 11a4 4 0 100-8 4 4 0 000 8zM2 21a7 7 0 0114 0M16 3.1a4 4 0 010 7.8M22 21a7 7 0 00-5-6.7',
  coche: 'M5 12.5l4.5 4.5L19 7',
  pouce: 'M3 11h4v10H3zM7 12l4-8c1.7 0 2.7 1.1 2.7 2.6V10h5.2c1.4 0 2.4 1.3 2.1 2.6l-1.4 6.2c-.2 1.2-1.2 2-2.4 2H7',
}
// Permet à n'importe quelle carte de joueur d'ouvrir le chat avec un ami: ouvrirAmi(idDeLAmi).
export const OuvrirChat = createContext({ ouvrirAmi: null })

// Ensemble des comptes « Supporter » (voir supabase/ameliorations9.sql). Vide pour un visiteur ou si la base n'est pas à jour.
export const Supporters = createContext(new Set())

export function BadgeSupporter({ id }) {
  const ensemble = useContext(Supporters)
  if (!id || !ensemble.has(id)) return null
  return (
    <span className="badge-supporter" title="Supporter du site: merci!">
      <Icone nom="coeur" taille={12} />
      Supporter
    </span>
  )
}

export const NOMS_ACTIVITE = { donjon: 'Donjon', raid: 'Raid', pvp: 'PvP', quete: 'Quêtes' }

// Activités sans rôles à choisir (tout le monde est le bienvenu).
export const SANS_ROLES = new Set(['pvp', 'quete'])

// La classe d'un personnage, avec sa spécialisation quand on la connaît (« Mage Givre »). Les noms de spécialisations
// suivent la langue du jeu de la personne qui regarde.
export function ChipClasse({ classe: id, specialisation }) {
  const [langue] = useLangueJeu()
  const classe = CLASSES.find((c) => c.id === id)
  if (!classe) return null
  const spec = nomSpecialisation(id, specialisation, langue)
  return (
    <li className="chip classe">
      <span className="classe-point" style={{ background: classe.couleur }} aria-hidden="true" />
      {classe.nom}
      {spec && <span className="spec">{spec}</span>}
    </li>
  )
}

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

// « Vu il y a 3 h » (l'heure exacte est arrondie par la base, donc on reste approximatif).
export function vuTexte(iso) {
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (min < 60) return 'Vu récemment'
  const h = Math.floor(min / 60)
  if (h < 24) return `Vu il y a ${h} h`
  const j = Math.floor(h / 24)
  return `Vu il y a ${j} ${j > 1 ? 'jours' : 'jour'}`
}

export function depuis(iso) {
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (min < 1) return "à l'instant"
  if (min < 60) return `il y a ${min} min`
  return `il y a ${Math.floor(min / 60)} h`
}

// ---------- Minuteries qui descendent à la seconde ----------

// Une seule horloge pour toute la page (une fois par seconde), partagée par tous les compteurs affichés.
let instant = Math.floor(Date.now() / 1000) * 1000
let abonnes = new Set()
let horloge = null

function abonner(rappel) {
  abonnes.add(rappel)
  if (!horloge) {
    horloge = setInterval(() => {
      instant = Math.floor(Date.now() / 1000) * 1000
      abonnes.forEach((f) => f())
    }, 1000)
  }
  instant = Math.floor(Date.now() / 1000) * 1000
  return () => {
    abonnes.delete(rappel)
    if (abonnes.size === 0 && horloge) {
      clearInterval(horloge)
      horloge = null
    }
  }
}

export function useMaintenant() {
  return useSyncExternalStore(abonner, () => instant, () => instant)
}

// 3 jours 4 h 05 min 09 s -> « 3 j 4 h 05 min 09 s »; sous une heure: « 29 min 41 s »; sous une minute: « 41 s ».
export function formaterDuree(ms) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const j = Math.floor(total / 86400)
  const h = Math.floor((total % 86400) / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const p = (n) => String(n).padStart(2, '0')
  if (j > 0) return `${j} j ${h} h ${p(m)} min ${p(s)} s`
  if (h > 0) return `${h} h ${p(m)} min ${p(s)} s`
  if (m > 0) return `${m} min ${p(s)} s`
  return `${s} s`
}

// Le temps qui reste avant une date, mis à jour chaque seconde.
export function Decompte({ fin }) {
  const maintenant = useMaintenant()
  return <span className="decompte" role="timer">{formaterDuree(new Date(fin).getTime() - maintenant)}</span>
}

// Sous le nom de l'auteur d'une annonce: « Expire dans … » ou « Départ dans … », et la barre qui se vide.
export function DureeAnnonce({ annonce: a }) {
  const maintenant = useMaintenant()
  const fin = new Date(a.expires_at).getTime()
  const debut = a.debut ? new Date(a.debut).getTime() : null
  const total = fin - new Date(a.created_at).getTime()
  const part = total <= 0 ? 0 : Math.max(0, Math.min(1, (fin - maintenant) / total))
  let texte
  if (debut !== null) texte = debut <= maintenant ? 'Départ en cours' : `Départ dans ${formaterDuree(debut - maintenant)}`
  else texte = fin <= maintenant ? 'Expirée' : `Expire dans ${formaterDuree(fin - maintenant)}`
  return (
    <>
      <span className="decompte" role="timer">{texte}</span>
      <span className="duree" aria-hidden="true">
        <span style={{ width: `${Math.round(part * 100)}%` }} />
      </span>
    </>
  )
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
  if (jeu > 0) return { texte: `Le jeu sort ${quand(jeu)}`, prefixe: 'Le jeu sort dans', cible: LANCEMENT_LE, date: '4 novembre' }
  const raids = joursAvant(RAIDS_OUVERTS_LE)
  if (raids === 0) return { texte: "Les raids ouvrent aujourd'hui!", date: '' }
  if (raids > 0) return { texte: `Les raids ouvrent ${quand(raids)}`, prefixe: 'Les raids ouvrent dans', cible: RAIDS_OUVERTS_LE, date: '9 décembre' }
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

// Une adresse écrite sans « https:// » devient une adresse complète quand c'est clair que c'en est une: elle commence par
// « www. », elle a un chemin (monsite.ca/guilde), ou c'est un site connu (discord.gg/…, facebook.com/…).
// Tout le reste (BattleTag, nom Discord comme « jean.tremblay ») reste tel quel.
const SITES_CONNUS = 'discord\\.gg|discord\\.com|facebook\\.com|fb\\.com|fb\\.me|instagram\\.com|youtube\\.com|youtu\\.be|twitch\\.tv|reddit\\.com|x\\.com|twitter\\.com|linktr\\.ee'
const ADRESSE_SANS_PROTOCOLE = new RegExp(
  `^(www\\.[a-z0-9-]+(\\.[a-z0-9-]+)*\\.[a-z]{2,}(/\\S*)?|(${SITES_CONNUS})(/\\S*)?|[a-z0-9-]+(\\.[a-z0-9-]+)*\\.[a-z]{2,}/\\S*)$`,
  'i',
)

export function adresseComplete(texte) {
  const t = texte.trim()
  return ADRESSE_SANS_PROTOCOLE.test(t) ? `https://${t}` : t
}

// Adresse https sûre à afficher comme lien, ou null. Seul « https » est accepté, jamais un autre protocole.
function lienSur(texte) {
  if (!/^https:\/\/[^\s<>"'`]+$/i.test(texte)) return null
  try {
    const u = new URL(texte)
    return u.protocol === 'https:' && u.hostname.includes('.') ? u : null
  } catch {
    return null
  }
}

// Contact d'une annonce ou d'une guilde. Les visiteurs non connectés ne le reçoivent pas du serveur.
// Une invitation Discord (discord.gg/…) devient un lien. Pour une guilde (`lienLibre`), n'importe quelle adresse https
// (site, page Facebook…) devient un lien aussi; tout le reste reste du texte simple.
export function Contact({ contact, onConnexion, lienLibre = false }) {
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
  const lien = invitation ? new URL(contact) : lienLibre ? lienSur(contact) : null

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
      {lien ? (
        <a className="invitation" href={lien.href} target="_blank" rel="noopener noreferrer nofollow ugc">
          {contact.replace('https://', '').replace(/\/$/, '')}
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

// Bouton « Copier le lien du site »: pour inviter des amis à venir sur le site.
export function BoutonLienSite() {
  const [etat, setEtat] = useState('')
  const copier = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/`)
      setEtat('ok')
    } catch {
      setEtat('non')
    }
    setTimeout(() => setEtat(''), 3000)
  }
  return (
    <span className="lien-site">
      <button type="button" className="bouton petit" onClick={copier}>
        {etat === 'ok' ? 'Lien copié' : 'Copier le lien du site'}
      </button>
      {etat === 'non' && (
        <span className="aide" role="status">
          Copie impossible ici: l'adresse du site est en haut de ton navigateur.
        </span>
      )}
    </span>
  )
}

// Une ligne « titre, texte, bouton Copier » (commande d'invitation, BattleTag). Le bouton garde « Copié » à l'écran
// quelques secondes, avec un petit conseil facultatif. Si le presse-papiers est bloqué, le texte s'affiche pour
// être copié à la main.
export function LigneCopie({ titre, valeur, conseil }) {
  const [copie, setCopie] = useState(false)

  const copier = async () => {
    try {
      await navigator.clipboard.writeText(valeur)
    } catch {
      window.prompt('Copie ceci:', valeur)
      return
    }
    setCopie(true)
    setTimeout(() => setCopie(false), 3500)
  }

  return (
    <div className="ligne-copie">
      <span className="ligne-copie-titre">{titre}</span>
      <code>{valeur}</code>
      <button type="button" className="bouton petit" onClick={copier} aria-label={`Copier ${titre}: ${valeur}`}>
        {copie ? 'Copié' : 'Copier'}
      </button>
      <span className="sr" role="status">{copie ? 'Copié' : ''}</span>
      {copie && conseil && <span className="ligne-copie-conseil">{conseil}</span>}
    </div>
  )
}

// Commande du jeu à copier depuis une annonce: « /w Nom » pour écrire à l'auteur d'un groupe, « /invite Nom » (ou
// « /inviter Nom » dans le jeu en français) pour inviter un joueur seul. Le jeu n'a pas de champ « royaume » ici:
// si la personne est sur un autre royaume, la commande peut demander « Nom-Royaume ».
export function CommandeAnnonce({ annonce }) {
  const [langue] = useLangueJeu()
  const joueurSeul = annonce.genre === 'joueur'
  const valeur = `${joueurSeul ? commandeInviter(langue) : '/w'} ${annonce.perso}`
  return (
    <div className="inviter dans-le-jeu">
      <LigneCopie
        titre={joueurSeul ? 'Inviter dans le jeu' : 'Écrire dans le jeu'}
        valeur={valeur}
        conseil={
          joueurSeul
            ? "Colle-le dans le clavardage du jeu (touche Entrée), puis Entrée pour l'envoyer."
            : 'Colle-le dans le clavardage du jeu (touche Entrée), ajoute un espace, écris ton message, puis Entrée.'
        }
      />
      {joueurSeul && <LangueJeu court />}
    </div>
  )
}

// Copie l'adresse directe d'une annonce ou d'une guilde (type: 'annonce' ou 'guilde').
export function LienDirect({ type, id, titre = '', invitation = false }) {
  const [copie, setCopie] = useState(false)

  const copier = async () => {
    const adresse = `${window.location.origin}/?${type}=${encodeURIComponent(id)}`
    // Sur téléphone, « Inviter » ouvre le partage du téléphone (Messenger, texto...). Ailleurs, le lien est copié.
    if (invitation && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: titre || 'Babillard Forever', text: titre ? `Rejoins mon groupe: ${titre}` : 'Rejoins mon groupe', url: adresse })
        return
      } catch (e) {
        if (e?.name === 'AbortError') return
      }
    }
    try {
      await navigator.clipboard.writeText(adresse)
      setCopie(true)
      setTimeout(() => setCopie(false), 2000)
    } catch {
      // presse-papiers bloqué: on affiche l'adresse pour qu'elle puisse être copiée à la main
      window.prompt('Copie ce lien:', adresse)
    }
  }

  if (invitation) {
    return (
      <button type="button" className="bouton petit" onClick={copier}>
        {copie ? 'Lien copié' : 'Inviter des amis'}
      </button>
    )
  }
  return (
    <button type="button" className="lien signaler" onClick={copier}>
      {copie ? 'Lien copié' : 'Copier le lien'}
    </button>
  )
}

// Bouton « Signaler » avec un petit formulaire en ligne. Trois personnes différentes retirent l'annonce
// (ou, pour un joueur, mettent sa réputation en vérification).
export function Signalement({ type, id, utilisateur, onConnexion }) {
  const motifs = type === 'joueur' ? MOTIFS_JOUEUR : MOTIFS_SIGNALEMENT
  const [ouvert, setOuvert] = useState(false)
  const [motif, setMotif] = useState(motifs[0].id)
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
    } catch (e) {
      setEtat(e?.code === '54000' ? 'limite' : 'erreur')
    }
  }

  return (
    <form className="signalement" onSubmit={envoyer}>
      <label className="champ">
        <span>Pourquoi signaler?</span>
        <select value={motif} onChange={(e) => setMotif(e.target.value)}>
          {motifs.map((m) => <option key={m.id} value={m.id}>{m.nom}</option>)}
        </select>
      </label>
      <div className="signalement-actions">
        <button type="submit" className="bouton petit danger" disabled={etat === 'envoi'}>Envoyer</button>
        <button type="button" className="bouton petit" onClick={() => setOuvert(false)}>Annuler</button>
      </div>
      {etat === 'erreur' && <p className="msg-erreur" role="alert">Le signalement n'a pas été envoyé. Réessaie.</p>}
      {etat === 'limite' && (
        <p className="msg-erreur" role="alert">Tu as déjà fait beaucoup de signalements aujourd'hui. Réessaie demain.</p>
      )}
    </form>
  )
}
