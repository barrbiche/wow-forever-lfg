import { useEffect, useState } from 'react'

// Bouton « Installer l'app » (dans le pied de page). Le site peut s'installer comme une app, avec son icône:
// - Chrome, Edge, Brave (ordinateur et Android): le navigateur nous donne un événement, le bouton l'utilise.
// - iPhone et iPad (Safari): pas d'événement possible, on explique le geste « Sur l'écran d'accueil ».
// Le bouton ne s'affiche pas si le site est déjà installé ou si le navigateur ne peut pas l'installer.

export const dejaInstalle = () => {
  try {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
  } catch {
    return false
  }
}

export const surIos = () => {
  const ua = window.navigator.userAgent || ''
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && window.navigator.maxTouchPoints > 1)
}

export function BoutonInstaller() {
  const [evenement, setEvenement] = useState(null)
  const [ios, setIos] = useState(false)
  const [installe, setInstalle] = useState(false)
  const [aideIos, setAideIos] = useState(false)

  useEffect(() => {
    setInstalle(dejaInstalle())
    setIos(surIos())
    const avant = (e) => {
      e.preventDefault()
      setEvenement(e)
    }
    const apres = () => {
      setEvenement(null)
      setInstalle(true)
    }
    window.addEventListener('beforeinstallprompt', avant)
    window.addEventListener('appinstalled', apres)
    return () => {
      window.removeEventListener('beforeinstallprompt', avant)
      window.removeEventListener('appinstalled', apres)
    }
  }, [])

  if (installe || (!evenement && !ios)) return null

  async function installer() {
    if (!evenement) {
      setAideIos((v) => !v)
      return
    }
    try {
      await evenement.prompt()
      await evenement.userChoice
    } catch {
      // le navigateur a refusé: rien à faire
    }
    setEvenement(null)
  }

  return (
    <>
      <button type="button" className="lien" onClick={installer} aria-expanded={evenement ? undefined : aideIos}>
        Installer l'app
      </button>
      {aideIos && !evenement && (
        <p className="aide installer-aide" role="status">
          Dans Safari, touche le bouton Partager, puis « Sur l'écran d'accueil ». Le site s'ouvre ensuite comme une app.
        </p>
      )}
    </>
  )
}
