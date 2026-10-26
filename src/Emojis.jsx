import { useEffect, useRef, useState } from 'react'

// Petite grille d'émoticônes pour les chats. Les émoticônes sont du texte (Unicode): rien à charger.
const GROUPES = [
  {
    nom: 'Visages',
    liste: [
      ['🙂', 'sourire'], ['😀', 'grand sourire'], ['😄', 'rire'], ['😂', 'larmes de rire'], ['🤣', 'mort de rire'],
      ['😉', 'clin d’œil'], ['😍', 'yeux en cœur'], ['😎', 'lunettes de soleil'], ['🤔', 'réflexion'], ['😅', 'sueur froide'],
      ['😬', 'grimace'], ['😮', 'surpris'], ['😢', 'triste'], ['😭', 'pleure'], ['😡', 'fâché'], ['🥱', 'bâille'],
      ['😴', 'dort'], ['🙏', 'merci'], ['👍', 'pouce en haut'], ['👎', 'pouce en bas'], ['👏', 'applaudit'],
      ['💪', 'muscle'], ['👋', 'salut'], ['🤝', 'poignée de main'],
    ],
  },
  {
    nom: 'Aventure',
    liste: [
      ['⚔️', 'épées'], ['🛡️', 'bouclier'], ['🏹', 'arc'], ['🗡️', 'dague'], ['🪄', 'baguette'], ['🔥', 'feu'],
      ['❄️', 'glace'], ['⚡', 'éclair'], ['☠️', 'tête de mort'], ['💀', 'crâne'], ['💚', 'cœur vert'], ['❤️', 'cœur'],
      ['💙', 'cœur bleu'], ['🩹', 'soin'], ['🧪', 'potion'], ['🐺', 'loup'], ['🐻', 'ours'], ['🐉', 'dragon'],
      ['🏰', 'château'], ['👑', 'couronne'], ['💰', 'or'], ['🎒', 'sac'], ['🍺', 'bière'], ['🍖', 'viande'],
    ],
  },
  {
    nom: 'Autres',
    liste: [
      ['🎉', 'fête'], ['✅', 'oui'], ['❌', 'non'], ['⏰', 'heure'], ['👀', 'regarde'], ['💤', 'dodo'],
      ['🎧', 'écouteurs'], ['🎮', 'manette'], ['⭐', 'étoile'], ['🔔', 'cloche'], ['❓', 'question'], ['❗', 'attention'],
    ],
  },
]

// Raccourcis tapés au clavier: « :) » devient 🙂, etc. Seulement quand ils sont seuls (entourés d'espaces).
const RACCOURCIS = {
  ':)': '🙂', ':-)': '🙂', ':D': '😄', ':-D': '😄', ':(': '🙁', ':-(': '🙁', ';)': '😉', ';-)': '😉',
  '<3': '❤️', ':P': '😛', ':p': '😛', ':-P': '😛', ':o': '😮', ':O': '😮',
}
const MOTIF = /(^|\s)(:-?\)|:-?D|:-?\(|;-?\)|<3|:-?[pP]|:[oO])(?=\s|$)/g
export const emoticones = (t) => t.replace(MOTIF, (_, avant, code) => avant + (RACCOURCIS[code] ?? code))

// Bouton + fenêtre de choix. `choisir(emoji)` insère dans le champ; Échap ou un clic ailleurs referme.
export function SelecteurEmojis({ choisir }) {
  const [ouvert, setOuvert] = useState(false)
  const racine = useRef(null)
  const bouton = useRef(null)

  useEffect(() => {
    if (!ouvert) return undefined
    const dehors = (e) => {
      if (racine.current && !racine.current.contains(e.target)) setOuvert(false)
    }
    const touche = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setOuvert(false)
        bouton.current?.focus()
      }
    }
    document.addEventListener('pointerdown', dehors)
    document.addEventListener('keydown', touche)
    return () => {
      document.removeEventListener('pointerdown', dehors)
      document.removeEventListener('keydown', touche)
    }
  }, [ouvert])

  return (
    <div className="emojis" ref={racine}>
      <button
        type="button"
        ref={bouton}
        className="emojis-bouton"
        aria-label="Ajouter une émoticône"
        aria-expanded={ouvert}
        aria-haspopup="true"
        onClick={() => setOuvert((o) => !o)}
      >
        <span aria-hidden="true">🙂</span>
      </button>
      {ouvert && (
        <div className="emojis-fenetre" role="group" aria-label="Émoticônes">
          {GROUPES.map((g) => (
            <div key={g.nom} className="emojis-groupe">
              <p className="emojis-titre">{g.nom}</p>
              <div className="emojis-grille">
                {g.liste.map(([e, nom]) => (
                  <button key={e} type="button" className="emojis-choix" aria-label={nom} title={nom} onClick={() => choisir(e)}>
                    <span aria-hidden="true">{e}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
