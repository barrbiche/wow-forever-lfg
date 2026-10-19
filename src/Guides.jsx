import { Fragment, useEffect, useId, useMemo, useRef, useState } from 'react'
import {
  GUIDES,
  SOURCES,
  bossTrouve,
  correspondRecherche,
  decouper,
  nomBoss,
  nomDonjon,
  trouverGuide,
} from './guides-data.js'
import { NOMS_BOSS_FR } from './guides/noms-boss.js'
import { Icone, LienDirect } from './commun.jsx'
import { LangueJeu, useLangueJeu } from './langue.jsx'

// ---------- Onglet « Guides » ----------
// Un guide par donjon, en français. Les noms (boss, capacités) suivent la langue du jeu choisie par la personne:
// voir guides-data.js pour la forme des textes. Tout vient de sources publiques citées en bas de chaque guide.

const TYPES = [
  ['tous', 'Tous'],
  ['nouveaux', 'Nouveaux dans Forever'],
  ['classiques', 'Classiques'],
]

const plage = ([a, b]) => (a === b ? `${a}` : `${a}–${b}`)

// Un texte avec ses noms de boss et ses capacités dans la langue du jeu.
function Texte({ texte, langue }) {
  return decouper(texte).map((m, i) => {
    if (m.t === 'txt') return <Fragment key={i}>{m.v}</Fragment>
    if (m.t === 'boss') {
      const nom = langue === 'fr' ? (m.fr ?? NOMS_BOSS_FR[m.en] ?? m.en) : m.en
      return <span key={i} className="g-nom">{nom}</span>
    }
    if (langue === 'fr' && m.fr) {
      return <span key={i} className="g-cap fr" title={`En anglais: ${m.en}`}>{m.fr}</span>
    }
    return <em key={i} className="g-cap" lang="en">{m.en}</em>
  })
}

function Boss({ boss, langue }) {
  return (
    <li className="g-boss">
      <h4>
        <span className="g-nom">{nomBoss(boss.nom, langue)}</span>
        {boss.special && <span className="chip g-puce">Optionnel, rare ou secret</span>}
      </h4>
      <ul className="g-notes">
        {boss.notes.map((n, i) => (
          <li key={i}><Texte texte={n} langue={langue} /></li>
        ))}
      </ul>
    </li>
  )
}

function Corps({ g, langue, idCorps }) {
  const officielDiffere = g.officiel && (g.officiel[0] !== g.niveaux[0] || g.officiel[1] !== g.niveaux[1])
  return (
    <div className="guide-corps" id={idCorps}>
      {g.fiche && (
        <p className="g-avis" role="note">
          Fiche courte: ce donjon n'est pas encore dans la bêta, donc il n'y a pas de guide. Voici ce que les sources
          confirment.
        </p>
      )}
      {g.classique && (
        <p className="g-avis" role="note">
          Guide écrit pour WoW Classic. Forever a modifié certains donjons: des détails peuvent avoir changé, vérifie en
          jeu.
        </p>
      )}

      <dl className="g-infos">
        <div>
          <dt>Niveaux</dt>
          <dd>
            {plage(g.niveaux)}
            {officielDiffere && <span className="g-detail"> (Blizzard: {plage(g.officiel)})</span>}
          </dd>
        </div>
        {g.rdg && (
          <div>
            <dt>Recherche de groupe</dt>
            <dd>dès le niveau {g.rdg}</dd>
          </div>
        )}
        {g.duree && (
          <div>
            <dt>Durée</dt>
            <dd>{g.duree}</dd>
          </div>
        )}
        {g.acces && (
          <div className="large">
            <dt>Accès</dt>
            <dd><Texte texte={g.acces} langue={langue} /></dd>
          </div>
        )}
        {g.quetes && (
          <div className="large">
            <dt>Quêtes</dt>
            <dd><Texte texte={g.quetes} langue={langue} /></dd>
          </div>
        )}
        {g.extras?.map((x) => (
          <div className="large" key={x.titre}>
            <dt>{x.titre}</dt>
            <dd><Texte texte={x.texte} langue={langue} /></dd>
          </div>
        ))}
      </dl>

      {g.boss.length > 0 && (
        <section aria-label="Boss">
          <h3 className="g-titre">Boss</h3>
          <ol className="g-boss-liste">
            {g.boss.map((b, i) => (
              <Boss key={i} boss={b} langue={langue} />
            ))}
          </ol>
        </section>
      )}

      {g.pieges.length > 0 && (
        <section aria-label="Monstres à surveiller">
          <h3 className="g-titre">Monstres et pièges à surveiller</h3>
          <ul className="g-notes">
            {g.pieges.map((p, i) => (
              <li key={i}><Texte texte={p} langue={langue} /></li>
            ))}
          </ul>
        </section>
      )}

      {g.manque.length > 0 && (
        <section className="g-manque" aria-label="Ce que les sources ne disent pas">
          <h3 className="g-titre">Ce que les sources ne disent pas, ou se contredisent</h3>
          <ul className="g-notes">
            {g.manque.map((p, i) => (
              <li key={i}><Texte texte={p} langue={langue} /></li>
            ))}
          </ul>
        </section>
      )}

      <section aria-label="Sources">
        <h3 className="g-titre">Sources</h3>
        <ul className="g-sources">
          {g.src.map((id) => {
            const s = SOURCES[id]
            if (!s) return null
            return (
              <li key={id}>
                <a href={s.url} target="_blank" rel="noopener noreferrer">
                  {s.site}: {s.titre}
                </a>
              </li>
            )
          })}
        </ul>
      </section>

      <div className="g-actions">
        <LienDirect type="guide" id={g.id} />
      </div>
    </div>
  )
}

function CarteGuide({ g, langue, ouvert, basculer, trouve }) {
  const idCorps = useId()
  const titre = nomDonjon(g, langue)
  // On montre l'autre langue en petit pour qu'on se reconnaisse dans les deux jeux.
  const autre = langue === 'fr' ? g.nom[0] : g.nom[1]
  return (
    <li className={`guide${ouvert ? ' ouvert' : ''}${g.nouveau ? ' nouveau' : ''}`} id={`guide-${g.id}`} tabIndex={-1}>
      <h2 className="guide-haut">
        <button type="button" className="guide-bouton" aria-expanded={ouvert} aria-controls={ouvert ? idCorps : undefined} onClick={basculer}>
          <span className="guide-niveau">
            <span className="guide-niveau-nb">{plage(g.niveaux)}</span>
            <span className="guide-niveau-unite">niveau</span>
          </span>
          <span className="guide-titres">
            <span className="guide-nom">{titre}</span>
            {autre && autre !== titre && <span className="guide-autre" lang={langue === 'fr' ? 'en' : 'fr'}>{autre}</span>}
            <span className="guide-puces">
              {g.nouveau && <span className="chip fort">Nouveau dans Forever</span>}
              {g.fiche && <span className="chip">Fiche courte</span>}
              {!g.fiche && <span className="chip">{g.boss.length} boss</span>}
              {trouve && <span className="chip depart">Boss: {trouve}</span>}
            </span>
          </span>
          <span className="guide-fleche" aria-hidden="true" />
        </button>
      </h2>
      {ouvert && <Corps g={g} langue={langue} idCorps={idCorps} />}
    </li>
  )
}

export default function Guides({ cible }) {
  const [langue] = useLangueJeu()
  const [recherche, setRecherche] = useState('')
  const [niveau, setNiveau] = useState('')
  const [type, setType] = useState('tous')
  const [ouverts, setOuverts] = useState(() => new Set())
  const [ciblee, setCiblee] = useState(null)
  const deja = useRef(null)

  // Depuis une annonce ou une adresse directe: on enlève les filtres, on ouvre le guide et on y défile.
  useEffect(() => {
    if (!cible || deja.current === cible.n) return
    deja.current = cible.n
    const g = trouverGuide(cible.valeur)
    if (!g) return
    setRecherche('')
    setNiveau('')
    setType('tous')
    setOuverts((o) => new Set(o).add(g.id))
    setCiblee({ id: g.id, n: cible.n })
  }, [cible])

  useEffect(() => {
    if (!ciblee) return undefined
    const carte = document.getElementById(`guide-${ciblee.id}`)
    if (!carte) return undefined
    const reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    carte.scrollIntoView({ block: 'start', behavior: reduit ? 'auto' : 'smooth' })
    carte.focus({ preventScroll: true })
    carte.classList.add('ciblee')
    const minuterie = setTimeout(() => carte.classList.remove('ciblee'), 3500)
    return () => {
      clearTimeout(minuterie)
      carte.classList.remove('ciblee')
    }
  }, [ciblee])

  const n = Number(niveau)
  const visibles = useMemo(
    () =>
      GUIDES.filter((g) => {
        if (type === 'nouveaux' && !g.nouveau) return false
        if (type === 'classiques' && g.nouveau) return false
        if (n && (n < g.niveaux[0] || n > g.niveaux[1])) return false
        return correspondRecherche(g, recherche)
      }),
    [type, n, recherche],
  )
  const filtresActifs = !!(recherche.trim() || n || type !== 'tous')

  const basculer = (id) =>
    setOuverts((o) => {
      const suite = new Set(o)
      if (suite.has(id)) suite.delete(id)
      else suite.add(id)
      return suite
    })

  return (
    <>
      <section className="filtres guides-filtres" aria-label="Chercher un guide">
        <p className="intro-guildes">
          Les donjons de WoW Forever, du niveau 13 au 60, expliqués en français. Seulement ce que des sources publiques
          confirment: ce qui manque ou se contredit est écrit dans chaque guide.
        </p>

        <div className="guides-langue">
          <LangueJeu />
          <p className="aide">
            {langue === 'fr'
              ? "Ton jeu est en français: les boss portent leur nom français quand il est confirmé, et les capacités sont expliquées en mots simples."
              : "Ton jeu est en anglais: les noms de boss et de capacités restent en anglais, comme tu les vois en jeu. Le reste est expliqué en français."}
          </p>
        </div>

        <div className="filtres-ligne">
          <label className="champ recherche">
            <span>Chercher un donjon, un boss ou une zone</span>
            <input
              type="search"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Ex.: Deadmines, Taragaman, Tanaris"
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          <label className="champ niveau">
            <span>Mon niveau</span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={60}
              value={niveau}
              onChange={(e) => setNiveau(e.target.value)}
              placeholder="1 à 60"
            />
          </label>
        </div>

        <div className="pastilles" role="group" aria-label="Type de donjon">
          {TYPES.map(([id, nom]) => (
            <button key={id} type="button" className="pastille" aria-pressed={type === id} onClick={() => setType(id)}>
              {nom}
            </button>
          ))}
        </div>
      </section>

      <div className="resume" aria-live="polite">
        <strong>
          {visibles.length} {visibles.length > 1 ? 'donjons' : 'donjon'}
        </strong>
        {filtresActifs && (
          <button
            type="button"
            className="lien"
            onClick={() => {
              setRecherche('')
              setNiveau('')
              setType('tous')
            }}
          >
            Effacer les filtres
          </button>
        )}
        {ouverts.size > 0 && (
          <button type="button" className="lien" onClick={() => setOuverts(new Set())}>
            Tout refermer
          </button>
        )}
      </div>

      {visibles.length === 0 ? (
        <div className="vide">
          <span className="vide-icone" aria-hidden="true"><Icone nom="livre" taille={30} /></span>
          <p>Aucun donjon ne correspond.</p>
          <p className="aide">Essaie un autre mot, ou enlève un filtre.</p>
        </div>
      ) : (
        <ul className="liste guides-liste">
          {visibles.map((g) => (
            <CarteGuide
              key={g.id}
              g={g}
              langue={langue}
              ouvert={ouverts.has(g.id)}
              basculer={() => basculer(g.id)}
              trouve={bossTrouve(g, recherche, langue)}
            />
          ))}
        </ul>
      )}

      <p className="aide guides-pied">
        Les guides viennent de sites publics (Icy Veins, Method, Warcraft Tavern, Wowhead, Kami-labs, Gamewave), cités sous
        chaque donjon. Les noms français de boss viennent des textes de la bêta, relevés par Kami-labs; un boss qui n'y
        est pas reste en anglais plutôt que d'être deviné. La bêta peut encore changer avant le 4 novembre: vérifie en
        jeu. Les versions à 10 joueurs ne sont pas couvertes. Ce site n'est pas affilié à Blizzard.
      </p>
    </>
  )
}
