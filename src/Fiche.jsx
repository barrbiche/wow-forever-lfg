// La fiche d'un personnage (équipement, arbres de talents, talents) copiée depuis l'addon Babillard Forever FR.
// Les textes viennent d'un code collé par le joueur: ils sont toujours affichés comme du texte (jamais du HTML), et la
// fiche dit clairement qu'elle n'est pas vérifiée.
import { useState } from 'react'
import './fiche.css'
import { depuis } from './commun.jsx'
import { lireFiche } from './store.js'

// Numéros d'emplacement de l'API du jeu (sans la chemise ni le tabard).
export const NOMS_EMPLACEMENTS = {
  1: 'Tête',
  2: 'Cou',
  3: 'Épaules',
  5: 'Torse',
  6: 'Taille',
  7: 'Jambes',
  8: 'Pieds',
  9: 'Poignets',
  10: 'Mains',
  11: 'Anneau',
  12: 'Anneau',
  13: 'Bijou',
  14: 'Bijou',
  15: 'Dos',
  16: 'Main droite',
  17: 'Main gauche',
  18: 'À distance',
}

const QUALITES = ['médiocre', 'ordinaire', 'inhabituel', 'rare', 'épique', 'légendaire', 'artéfact']

// Résumé en une ligne: « 15 pièces · talents 31 / 20 / 0 ».
export function resumeFiche(fiche) {
  if (!fiche) return ''
  const morceaux = []
  const n = fiche.equipement?.length ?? 0
  if (n > 0) morceaux.push(`${n} ${n > 1 ? 'pièces' : 'pièce'}`)
  if (fiche.arbres?.length > 0) morceaux.push(`talents ${fiche.arbres.map((a) => a.points).join(' / ')}`)
  return morceaux.join(' · ')
}

export function FicheAffichage({ fiche, maj }) {
  const equipement = [...(fiche.equipement ?? [])].sort((a, b) => a.slot - b.slot)
  const arbres = fiche.arbres ?? []
  const talents = fiche.talents ?? []
  let principal = -1
  let max = 0
  arbres.forEach((a, i) => {
    if (a.points > max) {
      max = a.points
      principal = i
    }
  })

  return (
    <div className="fiche">
      {arbres.length > 0 && (
        <section aria-label="Talents">
          <h4>Talents</h4>
          <ul className="fiche-arbres">
            {arbres.map((a, i) => (
              <li key={i} className={i === principal ? 'principal' : ''}>
                <strong>{a.nom}</strong>
                <span>{a.points}</span>
              </li>
            ))}
          </ul>
          {talents.length > 0 &&
            arbres.map((a, i) => {
              const dedans = talents.filter((t) => t.arbre === i + 1)
              if (dedans.length === 0) return null
              return (
                <details key={i} className="fiche-talents">
                  <summary>
                    {a.nom}: {dedans.length} {dedans.length > 1 ? 'talents appris' : 'talent appris'}
                  </summary>
                  <ul>
                    {dedans.map((t, k) => (
                      <li key={k}>
                        {t.nom} <span className="rang">{t.rang}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              )
            })}
        </section>
      )}

      {equipement.length > 0 && (
        <section aria-label="Équipement">
          <h4>Équipement</h4>
          <ul className="fiche-equipement">
            {equipement.map((p) => (
              <li key={p.slot} className={`q${Math.min(Math.max(p.qualite, 0), 6)}`}>
                <span className="emplacement">{NOMS_EMPLACEMENTS[p.slot] ?? `Emplacement ${p.slot}`}</span>
                <span className="objet">
                  <span className="sr">{QUALITES[p.qualite] ?? ''} </span>
                  {p.nom}
                </span>
                <span className="niveau-objet">{p.ilvl > 0 ? p.ilvl : ''}</span>
                {p.enchant > 0 && <span className="enchant">enchanté</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="aide fiche-note">
        Copié par le joueur depuis l'addon{maj ? `, ${depuis(maj)}` : ''}. Ce n'est pas vérifié par le site.
      </p>
    </div>
  )
}

// Sur la carte d'un joueur: la fiche se charge quand on ouvre le bloc (une seule fois), pour ne pas la demander
// pour tous les joueurs de la liste.
export function FicheDeJoueur({ userId }) {
  const [etat, setEtat] = useState('ferme') // ferme | charge | vide
  const [fiche, setFiche] = useState(null)

  const surOuverture = async (e) => {
    if (!e.currentTarget.open || etat !== 'ferme') return
    setEtat('charge')
    const f = await lireFiche(userId)
    setFiche(f)
    setEtat(f ? 'pret' : 'vide')
  }

  return (
    <details className="fiche-joueur" onToggle={surOuverture}>
      <summary>Équipement et talents</summary>
      {etat === 'charge' && <p className="aide">Chargement…</p>}
      {etat === 'vide' && (
        <p className="aide">Ce joueur n'a pas importé son équipement. Il le fait avec l'addon Babillard Forever FR, dans son profil.</p>
      )}
      {etat === 'pret' && fiche && <FicheAffichage fiche={fiche} maj={fiche.maj} />}
    </details>
  )
}
