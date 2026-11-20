// La fiche d'un personnage (équipement, arbres de talents, talents) copiée depuis l'addon Babillard Forever FR.
// Les textes viennent d'un code collé par le joueur: ils sont toujours affichés comme du texte (jamais du HTML), et la
// fiche dit clairement qu'elle n'est pas vérifiée.
import { useEffect, useState } from 'react'
import './fiche.css'
import { depuis } from './commun.jsx'
import { lireFiche } from './store.js'
import { CLASSES, couleurTexteClasse } from './data.js'

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

// Les images viennent des serveurs d'images de Blizzard puis de Wowhead (le site ne garde aucun fichier de Blizzard). Le nom de l'icône
// est validé à la lecture du code et par la base (minuscules, chiffres, soulignés), alors l'adresse reste sûre.
// Mettre `false` pour ne plus afficher d'images (la fiche reste lisible sans elles).
export const ICONES_ACTIVES = true
// Deux serveurs d'images, essayés dans l'ordre: celui de Blizzard (le même que l'Armurerie), puis celui de Wowhead. Si un
// bloqueur de publicités ou de traqueurs refuse l'un, l'autre prend le relais.
const sourcesIcone = (nom, grande) => [
  `https://render.worldofwarcraft.com/us/icons/${grande ? 56 : 36}/${nom}.jpg`,
  `https://wow.zamimg.com/images/wow/icons/${grande ? 'large' : 'medium'}/${nom}.jpg`,
]

// WoW Forever donne aux addons un numéro de fichier d'icône (« f132345 » dans le code), pas un nom. La table numéro -> nom
// (public/icones-jeu.txt, faite par scripts/construire-icones.py) est chargée une seule fois, et seulement quand une
// fiche en a besoin.
let tableIcones = null
function chargerTableIcones() {
  if (!tableIcones) {
    tableIcones = fetch('/icones-jeu.txt')
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error('table des icônes absente'))))
      .then((texte) => {
        const noms = new Map()
        let numero = 0
        for (const ligne of texte.split('\n')) {
          const i = ligne.indexOf(':')
          if (i < 1) continue
          numero += Number(ligne.slice(0, i))
          noms.set(numero, ligne.slice(i + 1))
        }
        return noms
      })
      .catch(() => {
        tableIcones = null // réessayer à la prochaine fiche
        return new Map()
      })
  }
  return tableIcones
}

// Le nom d'image d'une icône: tel quel, ou retrouvé dans la table quand c'est un numéro. `null` = en attente, `''` = inconnue.
function useNomIcone(nom) {
  const fichier = /^f(\d{1,10})$/.exec(nom ?? '')
  const [trouve, setTrouve] = useState(null)
  useEffect(() => {
    if (!fichier) return undefined
    let actif = true
    chargerTableIcones().then((noms) => {
      if (actif) setTrouve(noms.get(Number(fichier[1])) ?? '')
    })
    return () => {
      actif = false
    }
  }, [nom]) // eslint-disable-line react-hooks/exhaustive-deps
  return fichier ? trouve : nom
}

// Une icône qui ne charge pas (nom inconnu, réseau bloqué) disparaît au lieu de laisser un carré cassé; `repli` (un
// texte court) prend alors sa place quand il y en a un.
function Icone({ nom, grande = false, repli = null }) {
  const [essai, setEssai] = useState(0)
  const reel = useNomIcone(nom)
  const sources = reel ? sourcesIcone(reel, grande) : []
  if (!ICONES_ACTIVES || !reel || essai >= sources.length) return repli
  const taille = grande ? 40 : 24
  return (
    <img key={essai} className="icone-jeu" src={sources[essai]} alt="" width={taille} height={taille} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setEssai(essai + 1)} />
  )
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

// ---------- La poupée d'équipement, comme la fenêtre du personnage du jeu ----------
// Colonne de gauche, colonne de droite, armes en bas. La chemise (4) et le tabard (19) n'ont pas de données: ces deux
// cases sont décoratives (elles ne disent pas « vide »).
const COLONNE_GAUCHE = [1, 2, 3, 15, 5, 4, 19, 9]
const COLONNE_DROITE = [10, 6, 7, 8, 11, 12, 13, 14]
const ARMES = [16, 17, 18]
const SANS_DONNEES = new Set([4, 19])
const COURT = { 1: 'Tête', 2: 'Cou', 3: 'Épa.', 5: 'Torse', 6: 'Taille', 7: 'Jamb.', 8: 'Pieds', 9: 'Poign.', 10: 'Mains', 11: 'Bague', 12: 'Bague', 13: 'Bijou', 14: 'Bijou', 15: 'Dos', 16: 'Main d.', 17: 'Main g.', 18: 'Dist.' }

function describePiece(p) {
  const morceaux = [QUALITES[p.qualite] ?? '', p.ilvl > 0 ? `niveau d'objet ${p.ilvl}` : '', p.enchant > 0 ? 'enchantée' : '']
  return `${NOMS_EMPLACEMENTS[p.slot] ?? `Emplacement ${p.slot}`}: ${p.nom}${morceaux.filter(Boolean).length ? ` (${morceaux.filter(Boolean).join(', ')})` : ''}`
}

function Poupee({ equipement, nom, classe, niveau }) {
  const parSlot = new Map(equipement.map((p) => [p.slot, p]))
  const [choisi, setChoisi] = useState(null)
  const cls = CLASSES.find((c) => c.id === classe)
  const avecNiveau = equipement.filter((p) => p.ilvl > 0)
  const moyen = avecNiveau.length > 0 ? Math.round(avecNiveau.reduce((t, p) => t + p.ilvl, 0) / avecNiveau.length) : 0
  const pieceChoisie = choisi ? parSlot.get(choisi) : null

  const caseDe = (slot) => {
    if (SANS_DONNEES.has(slot)) return <li key={slot} className="emp sans-donnees" aria-hidden="true" />
    const p = parSlot.get(slot)
    if (!p) {
      return (
        <li key={slot} className="emp libre" title={`${NOMS_EMPLACEMENTS[slot]}: rien de lu`}>
          <span className="sr">{NOMS_EMPLACEMENTS[slot]}: rien de lu</span>
        </li>
      )
    }
    const q = Math.min(Math.max(p.qualite, 0), 6)
    return (
      <li key={slot} className={`emp q${q}${choisi === slot ? ' choisie' : ''}`}>
        <button type="button" title={describePiece(p)} aria-label={describePiece(p)} aria-pressed={choisi === slot} onClick={() => setChoisi(choisi === slot ? null : slot)}>
          <Icone nom={p.icone} grande repli={<span className="repli">{COURT[slot]}</span>} />
          {p.ilvl > 0 && <span className="ilvl">{p.ilvl}</span>}
          {p.enchant > 0 && <span className="ench" aria-hidden="true" />}
        </button>
      </li>
    )
  }

  return (
    <div className="poupee">
      <ul className="poupee-col gauche">{COLONNE_GAUCHE.map(caseDe)}</ul>
      <div className="poupee-centre">
        <svg className="silhouette" viewBox="0 0 100 160" aria-hidden="true" focusable="false">
          <circle cx="50" cy="28" r="17" />
          <path d="M20 150c0-38 8-80 30-80s30 42 30 80z" />
        </svg>
        <div className="poupee-nom" style={{ color: couleurTexteClasse(classe) }}>{nom || 'Personnage'}</div>
        <div className="poupee-sous">{[niveau ? `Niveau ${niveau}` : '', cls?.nom].filter(Boolean).join(' · ')}</div>
        {moyen > 0 && <div className="poupee-ilvl">Niveau d'objet moyen {moyen}</div>}
      </div>
      <ul className="poupee-col droite">{COLONNE_DROITE.map(caseDe)}</ul>
      <ul className="poupee-armes">{ARMES.map(caseDe)}</ul>
      <p className="poupee-detail" aria-live="polite">
        {pieceChoisie ? describePiece(pieceChoisie) : 'Touche une pièce pour voir son nom.'}
      </p>
    </div>
  )
}

// ---------- Les arbres de talents, en grille comme dans le jeu ----------
// L'addon n'envoie que les talents appris, avec leur place (rangée, colonne): les cases vides sont celles qu'on n'a
// pas apprises (ou dont on ne connaît pas le contenu).
const COLONNES = 4

function Arbres({ arbres, talents, principal }) {
  const [actif, setActif] = useState(principal >= 0 ? principal : 0)
  const [choisi, setChoisi] = useState(null)
  if (arbres.length === 0) return null
  const arbre = arbres[Math.min(actif, arbres.length - 1)]
  const dedans = talents.filter((t) => t.arbre === actif + 1)
  const places = dedans.filter((t) => t.ligne)
  const sansPlace = dedans.filter((t) => !t.ligne)
  const lignes = Math.max(7, ...places.map((t) => t.ligne))
  const parCase = new Map(places.map((t) => [`${t.ligne}-${t.col}`, t]))
  const talentChoisi = choisi && dedans.includes(choisi) ? choisi : null

  return (
    <div className="talents-jeu">
      <div className="talents-onglets" role="tablist" aria-label="Arbres de talents">
        {arbres.map((a, i) => (
          <button key={i} type="button" role="tab" aria-selected={i === actif} className={i === actif ? 'actif' : ''} onClick={() => { setActif(i); setChoisi(null) }}>
            <Icone nom={a.icone} />
            <span className="nom">{a.nom}</span>
            <span className="pts">{a.points}</span>
          </button>
        ))}
      </div>
      <div className="talents-cadre" role="tabpanel">
        {places.length > 0 ? (
          <ul className="talents-grille" style={{ gridTemplateRows: `repeat(${lignes}, var(--s-tal))` }}>
            {Array.from({ length: lignes * COLONNES }, (_, k) => {
              const l = Math.floor(k / COLONNES) + 1
              const c = (k % COLONNES) + 1
              const t = parCase.get(`${l}-${c}`)
              if (!t) return <li key={k} className="tal libre" aria-hidden="true" />
              const plein = t.rang >= t.max
              return (
                <li key={k} className={`tal appris${plein ? ' plein' : ''}${talentChoisi === t ? ' choisi' : ''}`}>
                  <button type="button" title={`${t.nom}: rang ${t.rang}/${t.max}`} aria-label={`${t.nom}: rang ${t.rang} sur ${t.max}`} aria-pressed={talentChoisi === t} onClick={() => setChoisi(talentChoisi === t ? null : t)}>
                    <Icone nom={t.icone} grande repli={<span className="repli">{t.nom.slice(0, 3)}</span>} />
                    <span className="rang-badge">{t.rang}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        ) : (
          dedans.length === 0 && <p className="aide talents-vide">Aucun talent appris dans cet arbre.</p>
        )}
        {sansPlace.length > 0 && (
          <ul className="talents-liste">
            {sansPlace.map((t, k) => (
              <li key={k}>
                <Icone nom={t.icone} />
                {t.nom} <span className="rang">{t.rang}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="talents-detail" aria-live="polite">
          {talentChoisi ? `${talentChoisi.nom}: rang ${talentChoisi.rang}${talentChoisi.max ? `/${talentChoisi.max}` : ''}` : `${arbre.nom}: ${arbre.points} ${arbre.points > 1 ? 'points' : 'point'}`}
        </p>
      </div>
    </div>
  )
}

export function FicheAffichage({ fiche, maj, nom, classe, niveau }) {
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
      {equipement.length > 0 && (
        <section aria-label="Équipement">
          <h4>Équipement</h4>
          <Poupee equipement={equipement} nom={fiche.perso || nom} classe={classe} niveau={niveau} />
        </section>
      )}

      {arbres.length > 0 && (
        <section aria-label="Talents">
          <h4>Talents</h4>
          <Arbres arbres={arbres} talents={talents} principal={principal} />
        </section>
      )}

      <details className="fiche-liste">
        <summary>Voir en liste</summary>
        {equipement.length > 0 && (
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
        )}
        {talents.length > 0 &&
          arbres.map((a, i) => {
            const dedans = talents.filter((t) => t.arbre === i + 1)
            if (dedans.length === 0) return null
            return (
              <p key={i} className="fiche-talents-texte">
                <strong>{a.nom} ({a.points})</strong>: {dedans.map((t) => `${t.nom} ${t.rang}${t.max ? `/${t.max}` : ''}`).join(', ')}
              </p>
            )
          })}
      </details>

      <p className="aide fiche-note">
        Copié par le joueur depuis l'addon{maj ? `, ${depuis(maj)}` : ''}. Ce n'est pas vérifié par le site.
        {arbres.length > 0 && ' Dans les arbres, les cases vides sont les talents non appris.'}
      </p>
    </div>
  )
}

// Sur la carte d'un joueur: la fiche se charge quand on ouvre le bloc (une seule fois), pour ne pas la demander
// pour tous les joueurs de la liste.
export function FicheDeJoueur({ userId, classe, niveau }) {
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
      {etat === 'pret' && fiche && <FicheAffichage fiche={fiche} maj={fiche.maj} classe={classe} niveau={niveau} />}
    </details>
  )
}
