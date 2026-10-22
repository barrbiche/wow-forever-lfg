import { useState } from 'react'
import { lireAchalandage } from './store.js'

// Quand les groupes se forment, par jour et par heure (heure de l'Est). Ne se charge qu'à l'ouverture.
const JOURS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
const ORDRE = [1, 2, 3, 4, 5, 6, 0]
const HEURES = [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1]
const SEUIL = 30 // en dessous, les chiffres ne veulent encore rien dire

const jourDeLEst = () => {
  const nom = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'America/Toronto' }).format(new Date())
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(nom)
}

export default function Achalandage() {
  const [stats, setStats] = useState(undefined) // undefined: pas chargé; null: indisponible
  const [jour, setJour] = useState(jourDeLEst)

  const ouvrir = async (e) => {
    if (e.currentTarget.open && stats === undefined) setStats(await lireAchalandage())
  }

  const lignes = stats?.lignes ?? []
  const total = lignes.reduce((n, l) => n + l.n, 0)
  const valeur = (j, h) => lignes.find((l) => l.jour === j && l.heure === h)?.n ?? 0
  const duJour = HEURES.map((h) => valeur(jour, h))
  const maxi = Math.max(1, ...duJour)
  const meilleur = lignes.reduce((m, l) => (l.n > (m?.n ?? 0) ? l : m), null)

  return (
    <details className="achalandage" onToggle={ouvrir}>
      <summary>Quand est-ce que ça joue le plus?</summary>
      {stats === undefined && <p className="aide" role="status">Chargement…</p>}
      {stats === null && <p className="aide">Les statistiques ne sont pas encore disponibles.</p>}
      {stats && total < SEUIL && (
        <p className="aide">
          Pas encore assez d’annonces pour en tirer quelque chose. Les heures les plus occupées s’afficheront ici
          quand le site aura un peu plus d’historique.
        </p>
      )}
      {stats && total >= SEUIL && (
        <>
          {stats.demo && <p className="aide">Données de démonstration.</p>}
          <p>
            Le plus de groupes se forment le <strong>{JOURS[meilleur.jour].toLowerCase()}</strong> vers{' '}
            <strong>{meilleur.heure} h</strong> (heure de l’Est, 8 dernières semaines).
          </p>
          <div className="achalandage-jours" role="group" aria-label="Jour de la semaine">
            {ORDRE.map((j) => (
              <button key={j} type="button" className="pastille" aria-pressed={jour === j} onClick={() => setJour(j)}>
                {JOURS[j].slice(0, 3)}
              </button>
            ))}
          </div>
          <ol className="barres" aria-label={`Annonces par heure, ${JOURS[jour].toLowerCase()}`}>
            {HEURES.map((h, i) => (
              <li key={h}>
                <span className="barre" style={{ height: `${Math.max(3, Math.round((duJour[i] / maxi) * 100))}%` }} />
                <span className="barre-heure" aria-hidden="true">{i % 2 === 0 ? h : ''}</span>
                <span className="sr">{h} h: {duJour[i]} annonce{duJour[i] > 1 ? 's' : ''}</span>
              </li>
            ))}
          </ol>
        </>
      )}
    </details>
  )
}
