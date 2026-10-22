import { useEffect, useRef, useState } from 'react'
import { modeDemo } from './store.js'

// Publicité (Google AdSense). Rien ne se charge tant que le joueur n'a pas dit oui, et rien ne s'affiche
// tant que les deux variables ne sont pas réglées dans Netlify:
//   VITE_ADSENSE_CLIENT = ca-pub-XXXXXXXXXXXXXXXX
//   VITE_ADSENSE_SLOT   = numéro de l'unité d'annonce (créée dans AdSense une fois le site approuvé)
const client = (import.meta.env.VITE_ADSENSE_CLIENT || '').trim()
const slot = (import.meta.env.VITE_ADSENSE_SLOT || '').trim()
export const pubsActives = !modeDemo && /^ca-pub-\d{10,20}$/.test(client) && /^\d{6,20}$/.test(slot)

const CLE = 'forever-pubs'
const EVENEMENT = 'forever-pubs-change'

// Choix du joueur: 'oui', 'non' ou null (pas encore répondu). Le localStorage peut être bloqué: on le protège.
export function lireChoixPubs() {
  try {
    const v = localStorage.getItem(CLE)
    return v === 'oui' || v === 'non' ? v : null
  } catch {
    return null
  }
}

function ecrireChoixPubs(choix) {
  try {
    if (choix) localStorage.setItem(CLE, choix)
    else localStorage.removeItem(CLE)
  } catch {
    /* tant pis: le choix vaudra pour cette visite seulement */
  }
  window.dispatchEvent(new Event(EVENEMENT))
}

function useChoixPubs() {
  const [choix, setChoix] = useState(lireChoixPubs)
  useEffect(() => {
    const maj = () => setChoix(lireChoixPubs())
    window.addEventListener(EVENEMENT, maj)
    return () => window.removeEventListener(EVENEMENT, maj)
  }, [])
  return choix
}

let scriptCharge = null
function chargerScript() {
  if (!scriptCharge) {
    scriptCharge = new Promise((resolve, reject) => {
      const s = document.createElement('script')
      s.async = true
      s.crossOrigin = 'anonymous'
      s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`
      s.onload = resolve
      s.onerror = () => {
        scriptCharge = null
        reject(new Error('pub bloquée'))
      }
      document.head.appendChild(s)
    })
  }
  return scriptCharge
}

// Bandeau de choix, en bas de l'écran. « Refuser » est aussi facile que « Accepter ».
export function BandeauPubs() {
  const choix = useChoixPubs()
  const [ouvert, setOuvert] = useState(false)
  useEffect(() => {
    const rouvrir = () => setOuvert(true)
    window.addEventListener('forever-pubs-rouvrir', rouvrir)
    return () => window.removeEventListener('forever-pubs-rouvrir', rouvrir)
  }, [])
  if (!pubsActives || (choix && !ouvert)) return null

  const repondre = (reponse) => {
    const avant = lireChoixPubs()
    ecrireChoixPubs(reponse)
    setOuvert(false)
    // Si Google était déjà chargé, on recharge pour qu'il ne reste rien en route.
    if (avant === 'oui' && reponse === 'non') window.location.reload()
  }

  return (
    <div className="bandeau-pubs" role="dialog" aria-label="Choix de publicité">
      <p>
        Le site est gratuit. Pour couvrir ses frais, il peut afficher une publicité Google en bas de la liste des
        groupes. Si tu acceptes, Google peut utiliser des témoins (cookies) pour choisir cette pub. Si tu refuses, aucune
        pub ne s'affiche et rien de Google n'est chargé. Tu peux changer d'idée en bas de la page.{' '}
        <a className="lien" href="/confidentialite" target="_blank" rel="noopener noreferrer">Détails</a>
      </p>
      <div className="bandeau-pubs-actions">
        <button type="button" className="bouton" onClick={() => repondre('non')}>Refuser</button>
        <button type="button" className="bouton" onClick={() => repondre('oui')}>Accepter</button>
      </div>
    </div>
  )
}

// Lien du pied de page pour rouvrir le choix.
export function ChoixPubs() {
  const choix = useChoixPubs()
  if (!pubsActives) return null
  return (
    <p>
      <button type="button" className="lien" onClick={() => window.dispatchEvent(new Event('forever-pubs-rouvrir'))}>
        Choix de publicité ({choix === 'oui' ? 'acceptée' : choix === 'non' ? 'refusée' : 'pas encore choisi'})
      </button>
    </p>
  )
}

// L'emplacement de la pub: affiché seulement si le joueur a accepté (et jamais pour un supporter).
export function Pub({ masquer = false }) {
  const choix = useChoixPubs()
  const bloc = useRef(null)
  const [echec, setEchec] = useState(false)
  const actif = pubsActives && choix === 'oui' && !masquer

  useEffect(() => {
    if (!actif) return undefined
    let annule = false
    chargerScript()
      .then(() => {
        if (annule || !bloc.current || bloc.current.dataset.adsbygoogleStatus) return
        try {
          ;(window.adsbygoogle = window.adsbygoogle || []).push({})
        } catch {
          setEchec(true)
        }
      })
      .catch(() => setEchec(true))
    return () => {
      annule = true
    }
  }, [actif])

  if (!actif || echec) return null
  return (
    <aside className="pub" aria-label="Publicité">
      <span className="pub-etiquette">Publicité</span>
      <ins
        ref={bloc}
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  )
}
