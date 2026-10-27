// Petits sons de notification, fabriqués par le navigateur (aucun fichier audio).
// Le choix « Sons » est gardé dans ce navigateur; le navigateur exige un premier clic ou une touche sur la page avant de laisser jouer un son.

const CLE_SON = 'forever-son'

export function sonActif() {
  try {
    return localStorage.getItem(CLE_SON) !== '0'
  } catch {
    return true
  }
}

export function reglerSon(actif) {
  try {
    localStorage.setItem(CLE_SON, actif ? '1' : '0')
  } catch {
    // navigation privée: le choix dure jusqu'à la fermeture de la page
  }
  if (actif) jouerSon('annonce', true) // petit aperçu
}

let contexte = null
let dernier = 0

function obtenirContexte() {
  if (contexte) return contexte
  const Classe = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)
  if (!Classe) return null
  try {
    contexte = new Classe()
  } catch {
    contexte = null
  }
  return contexte
}

// Le premier geste de la personne « réveille » le son pour la suite.
if (typeof window !== 'undefined') {
  const reveiller = () => {
    const c = obtenirContexte()
    if (c && c.state === 'suspended') c.resume().catch(() => {})
    window.removeEventListener('pointerdown', reveiller)
    window.removeEventListener('keydown', reveiller)
  }
  window.addEventListener('pointerdown', reveiller)
  window.addEventListener('keydown', reveiller)
}

const NOTES = {
  message: [{ f: 880, t: 0 }, { f: 1320, t: 0.11 }], // « ding ding » court: quelqu'un t'écrit
  annonce: [{ f: 523, t: 0 }, { f: 659, t: 0.1 }, { f: 784, t: 0.2 }], // petit arpège: nouvelle annonce
}

// Joue un son (« message » ou « annonce »). Jamais plus d'un son toutes les 2 secondes. Silencieux si le choix est coupé.
export function jouerSon(type, forcer = false) {
  if (!forcer && !sonActif()) return
  const maintenant = Date.now()
  if (maintenant - dernier < 2000) return
  const c = obtenirContexte()
  if (!c) return
  try {
    if (c.state === 'suspended') c.resume().catch(() => {})
    if (c.state === 'suspended') return // pas encore de geste de la personne: le navigateur refuse
    dernier = maintenant
    const depart = c.currentTime + 0.01
    for (const { f, t } of NOTES[type] ?? NOTES.message) {
      const osc = c.createOscillator()
      const gain = c.createGain()
      osc.type = 'triangle'
      osc.frequency.value = f
      gain.gain.setValueAtTime(0.0001, depart + t)
      gain.gain.exponentialRampToValueAtTime(0.14, depart + t + 0.015)
      gain.gain.exponentialRampToValueAtTime(0.0001, depart + t + 0.32)
      osc.connect(gain)
      gain.connect(c.destination)
      osc.start(depart + t)
      osc.stop(depart + t + 0.35)
    }
  } catch {
    // pas de son: ce n'est pas grave
  }
}
