import { useEffect, useState } from 'react'

// Langue du jeu de la personne (English ou Français). Elle sert à deux choses: la commande d'invitation que les
// boutons « Copier » donnent, et les noms (donjons, boss, capacités) dans les guides. Gardée dans le navigateur.

const CLE = 'forever-langue-jeu'
const EVENEMENT = 'forever-langue-jeu'

export const LANGUES_JEU = [
  { id: 'fr', nom: 'Français' },
  { id: 'en', nom: 'English' },
]

function lireStockage() {
  try {
    const v = localStorage.getItem(CLE)
    return v === 'en' || v === 'fr' ? v : 'fr'
  } catch {
    return 'fr'
  }
}

// Valeur courante en mémoire: elle reste juste même si le navigateur refuse de garder le choix.
let courante = lireStockage()

export function lireLangueJeu() {
  return courante
}

export function ecrireLangueJeu(id) {
  if (id !== 'en' && id !== 'fr') return
  courante = id
  try {
    localStorage.setItem(CLE, id)
  } catch {
    // navigation privée: le choix n'est pas gardé pour la prochaine visite
  }
  window.dispatchEvent(new Event(EVENEMENT))
}

export function useLangueJeu() {
  const [langue, setLangue] = useState(lireLangueJeu)
  useEffect(() => {
    const maj = () => setLangue(lireLangueJeu())
    const autreOnglet = (e) => {
      if (e.key !== CLE) return
      courante = lireStockage()
      maj()
    }
    window.addEventListener(EVENEMENT, maj)
    window.addEventListener('storage', autreOnglet)
    return () => {
      window.removeEventListener(EVENEMENT, maj)
      window.removeEventListener('storage', autreOnglet)
    }
  }, [])
  return [langue, ecrireLangueJeu]
}

// « /invite » est comprise par le jeu en français et en anglais; « /inviter » seulement par le jeu en français.
export const commandeInviter = (langue) => (langue === 'fr' ? '/inviter' : '/invite')

// Petit choix « Mon jeu est en: Français / English ». `court`: version compacte pour les cartes.
export function LangueJeu({ court = false }) {
  const [langue, choisir] = useLangueJeu()
  return (
    <div className="langue-jeu" role="group" aria-label="Langue de ton jeu">
      <span className="langue-jeu-titre">{court ? 'Jeu en' : 'Mon jeu est en'}</span>
      {LANGUES_JEU.map((l) => (
        <button
          key={l.id}
          type="button"
          className="pastille petite"
          aria-pressed={langue === l.id}
          onClick={() => choisir(l.id)}
        >
          {l.nom}
        </button>
      ))}
    </div>
  )
}
