import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// Infobulle « à la WoW »: une petite fenêtre sombre au cadre doré qui explique un donjon, un rôle ou une classe.
// - Souris: elle s'ouvre quand on survole l'élément.
// - Cellulaire: on touche l'élément pour l'ouvrir, on touche ailleurs (ou on fait défiler) pour la fermer.
// - Échap la ferme. Elle est placée dans <body> pour ne jamais être coupée par une carte.
// L'infobulle ne contient que de l'information en plus: tout ce qu'elle dit se trouve aussi ailleurs sur la page
// (guides, aide), alors l'élément reste un simple texte pour le clavier et les lecteurs d'écran.
//
// contenu: { titre, couleur, type, lignes: [{ texte, ton: 'or' | 'doux' | 'ok' | undefined }] }

export function Infobulle({ as: Balise = 'span', contenu, children, ...reste }) {
  const [ouvert, setOuvert] = useState(false)
  const ancre = useRef(null)
  const id = useId()

  useEffect(() => {
    if (!ouvert) return undefined
    const fermer = () => setOuvert(false)
    const dehors = (e) => {
      if (!ancre.current?.contains(e.target)) setOuvert(false)
    }
    const touche = (e) => e.key === 'Escape' && setOuvert(false)
    document.addEventListener('pointerdown', dehors)
    document.addEventListener('keydown', touche)
    window.addEventListener('scroll', fermer, true)
    window.addEventListener('resize', fermer)
    return () => {
      document.removeEventListener('pointerdown', dehors)
      document.removeEventListener('keydown', touche)
      window.removeEventListener('scroll', fermer, true)
      window.removeEventListener('resize', fermer)
    }
  }, [ouvert])

  if (!contenu) return <Balise {...reste}>{children}</Balise>

  return (
    <Balise
      {...reste}
      ref={ancre}
      className={`${reste.className ?? ''} avec-infobulle`.trim()}
      aria-describedby={ouvert ? id : undefined}
      onPointerEnter={(e) => e.pointerType === 'mouse' && setOuvert(true)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && setOuvert(false)}
      onClick={() => setOuvert(true)}
    >
      {children}
      {ouvert && <Bulle id={id} ancre={ancre} contenu={contenu} />}
    </Balise>
  )
}

function Bulle({ id, ancre, contenu }) {
  const bulle = useRef(null)
  const [place, setPlace] = useState(null)

  useLayoutEffect(() => {
    const a = ancre.current?.getBoundingClientRect()
    const b = bulle.current?.getBoundingClientRect()
    if (!a || !b) return
    const marge = 8
    const largeurPage = document.documentElement.clientWidth
    let gauche = a.left + a.width / 2 - b.width / 2
    gauche = Math.max(marge, Math.min(gauche, largeurPage - b.width - marge))
    // Au-dessus de l'élément s'il y a de la place, sinon en dessous.
    const dessus = a.top - b.height - 8
    const haut = dessus >= marge ? dessus : a.bottom + 8
    setPlace({ gauche, haut })
  }, [ancre, contenu])

  return createPortal(
    <div
      ref={bulle}
      id={id}
      role="tooltip"
      className="infobulle"
      style={place ? { left: place.gauche, top: place.haut } : { left: 0, top: 0, visibility: 'hidden' }}
    >
      <strong className="infobulle-titre" style={contenu.couleur ? { color: contenu.couleur } : undefined}>
        {contenu.titre}
      </strong>
      {contenu.type && <span className="infobulle-type">{contenu.type}</span>}
      {contenu.lignes?.map((l, i) => (
        <span key={i} className={`infobulle-ligne ${l.ton ?? ''}`.trim()}>
          {l.texte}
        </span>
      ))}
    </div>,
    document.body,
  )
}

// ---------- Le contenu des infobulles ----------

const COULEUR_ACTIVITE = { donjon: '#5fb0ff', raid: '#ffa245', guilde: '#f3dc9a' }

const TEXTE_ROLE = {
  tank: { titre: 'Tank', couleur: '#7fb0ff', lignes: ["Encaisse les coups et garde l'attention des monstres.", 'Un seul par groupe de donjon.'] },
  heal: { titre: 'Heal', couleur: '#6fdca0', lignes: ['Soigne le groupe et le garde en vie.', 'Un seul par groupe de donjon.'] },
  dps: { titre: 'DPS', couleur: '#ff9a8a', lignes: ['Inflige les dégâts qui éliminent les monstres.', 'Trois par groupe de donjon.'] },
}

export function contenuRole(id) {
  const t = TEXTE_ROLE[id]
  if (!t) return null
  return { titre: t.titre, couleur: t.couleur, type: 'Rôle dans le groupe', lignes: t.lignes.map((texte) => ({ texte })) }
}

// plage: [niveauMin, niveauMax] ou undefined; aGuide: le guide des boss existe dans l'onglet Guides.
export function contenuDonjon({ nom, plage, aGuide, raid }) {
  const lignes = []
  if (raid) {
    lignes.push({ texte: `Raid de ${raid} joueurs`, ton: 'or' })
    lignes.push({ texte: 'Niveau 60 requis' })
  } else {
    if (plage) lignes.push({ texte: plage[0] === plage[1] ? `Niveau ${plage[0]}` : `Niveaux ${plage[0]} à ${plage[1]}`, ton: 'or' })
    lignes.push({ texte: 'Groupe de 5: 1 Tank, 1 Heal, 3 DPS' })
  }
  if (aGuide) lignes.push({ texte: 'Les boss et la stratégie sont dans le guide du donjon.', ton: 'doux' })
  return { titre: nom, couleur: COULEUR_ACTIVITE[raid ? 'raid' : 'donjon'], type: raid ? 'Raid' : 'Donjon', lignes }
}

// specs: liste { id, fr, en } de la classe; choisie: id de la spécialisation du personnage (peut être vide).
export function contenuClasse({ nom, couleur, specs, choisie, langue = 'fr' }) {
  const lignes = [{ texte: 'Spécialisations', ton: 'doux' }]
  for (const s of specs ?? []) {
    lignes.push({ texte: `${s.id === choisie ? '▸ ' : ''}${langue === 'en' ? s.en : s.fr}`, ton: s.id === choisie ? 'or' : undefined })
  }
  return { titre: nom, couleur, type: 'Classe', lignes }
}
