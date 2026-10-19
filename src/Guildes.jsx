import { useEffect, useRef, useState } from 'react'
import { creerGuilde, lireProfil, modeDemo, retirerGuilde } from './store.js'
import {
  DUREES_GUILDE,
  FACTIONS,
  FOCUS_GUILDE,
  LANGUES,
  REGIONS,
  ROLES,
  RULESETS,
  STYLES,
  nomDe,
} from './data.js'
import { Contact, Icone, Signalement, depuis } from './commun.jsx'

// ---------- Onglet « Guildes qui recrutent » ----------

export default function SectionGuildes({
  guildes,
  disponible,
  utilisateur,
  onConnexion,
  apres,
  langueFr,
  basculerLangue,
  filtresActifs,
  effacerFiltres,
  annoncer,
}) {
  const [formulaireOuvert, setFormulaireOuvert] = useState(false)

  const inscrire = () => (utilisateur ? setFormulaireOuvert(true) : onConnexion())

  return (
    <>
      <section className="filtres" aria-label="Filtres des guildes">
        <p className="intro-guildes">
          Une guilde qui recrute? Inscris-la ici: elle reste affichée jusqu'à 30 jours.
        </p>
        <div className="pastilles">
          <button type="button" className="pastille" aria-pressed={langueFr} onClick={basculerLangue}>
            Français seulement
          </button>
          <button type="button" className="bouton principal petit" onClick={inscrire}>
            Inscrire ma guilde
          </button>
        </div>
      </section>

      <div className="resume" aria-live="polite">
        <strong>
          {guildes.length} {guildes.length > 1 ? 'guildes' : 'guilde'}
        </strong>
        {filtresActifs && (
          <button type="button" className="lien" onClick={effacerFiltres}>
            Effacer les filtres
          </button>
        )}
      </div>

      {!disponible ? (
        <p className="erreur" role="status">
          Les guildes ne sont pas encore disponibles. Réessaie dans un moment.
        </p>
      ) : guildes.length === 0 ? (
        <div className="vide">
          <span className="vide-icone" aria-hidden="true"><Icone nom="guilde" taille={30} /></span>
          <p>{filtresActifs ? 'Aucune guilde avec ces filtres.' : "Aucune guilde n'est inscrite pour l'instant."}</p>
          <button type="button" className="bouton" onClick={inscrire}>Inscrire la première guilde</button>
        </div>
      ) : (
        <ul className="liste">
          {guildes.map((g) => (
            <li key={g.id}>
              <CarteGuilde
                guilde={g}
                proprietaire={!!utilisateur && g.user_id === utilisateur.id}
                utilisateur={utilisateur}
                onConnexion={onConnexion}
                apres={apres}
              />
            </li>
          ))}
        </ul>
      )}

      <FormulaireGuilde
        utilisateur={utilisateur}
        ouvert={formulaireOuvert}
        fermer={() => setFormulaireOuvert(false)}
        apresInscription={async () => {
          setFormulaireOuvert(false)
          annoncer('Guilde inscrite.')
          await apres()
        }}
      />
    </>
  )
}

// ---------- Carte d'une guilde ----------

function CarteGuilde({ guilde: g, proprietaire, utilisateur, onConnexion, apres }) {
  const [probleme, setProbleme] = useState('')

  const retirer = async () => {
    setProbleme('')
    try {
      await retirerGuilde(g.id)
      await apres()
    } catch {
      setProbleme("Le retrait n'a pas fonctionné. Réessaie dans un instant.")
    }
  }

  const jours = Math.max(0, Math.ceil((new Date(g.expires_at).getTime() - Date.now()) / 86400000))

  return (
    <article className={`carte guilde ${g.faction}`}>
      <div className="carte-plaque">
        <Icone nom="guilde" taille={30} />
        <span className="plaque-unite">Guilde</span>
        {g.niveau_min > 1 && <span className="plaque-unite">dès le niv. {g.niveau_min}</span>}
      </div>

      <div className="carte-corps">
        <div className="carte-haut">
          <div className="carte-titre">
            <h2>{g.nom}</h2>
            <span className={`faction ${g.faction}`}>{nomDe(FACTIONS, g.faction)}</span>
          </div>
          <span className="depuis">{depuis(g.created_at)}</span>
        </div>

        <ul className="infos">
          {g.focus?.map((f) => (
            <li key={f} className="chip fort">{nomDe(FOCUS_GUILDE, f)}</li>
          ))}
          <li className="chip">{RULESETS.find((r) => r.id === g.ruleset)?.carte ?? g.ruleset}</li>
          <li className="chip">{g.region}</li>
          <li className="chip">{nomDe(STYLES, g.style)}</li>
          <li className="chip">{g.langue === 'en' ? 'English' : 'Français'}</li>
        </ul>

        {g.roles?.length > 0 && (
          <p className="roles">
            <span>Recrute</span>
            {ROLES.filter((r) => g.roles.includes(r.id)).map((r) => (
              <span key={r.id} className={`role ${r.id}`}>
                <Icone nom={r.id} taille={15} />
                {r.nom}
              </span>
            ))}
          </p>
        )}

        {g.description && <p className="note">{g.description}</p>}

        <div className="carte-bas">
          <div className="auteur">
            <span className="avatar" aria-hidden="true">{(g.perso || '?').trim().charAt(0).toUpperCase()}</span>
            <div className="auteur-texte">
              <strong>{g.perso}</strong>
              <span>Encore {jours} {jours > 1 ? 'jours' : 'jour'}</span>
            </div>
          </div>
          <Contact contact={g.contact} onConnexion={onConnexion} />
        </div>

        {proprietaire ? (
          <div className="gestion">
            <button type="button" className="bouton petit danger" onClick={retirer}>
              Retirer la guilde
            </button>
            {probleme && <p className="msg-erreur" role="alert">{probleme}</p>}
          </div>
        ) : (
          <div className="signaler-ligne">
            <Signalement type="guilde" id={g.id} utilisateur={utilisateur} onConnexion={onConnexion} />
          </div>
        )}
      </div>
    </article>
  )
}

// ---------- Formulaire d'inscription d'une guilde ----------

const GUILDE_VIDE = {
  nom: '',
  faction: 'alliance',
  region: 'US',
  ruleset: 'normal',
  langue: 'fr',
  style: 'relax',
  focus: ['donjon'],
  roles: [],
  niveau_min: '1',
  description: '',
  perso: '',
  contact: '',
  jours: 14,
}

function FormulaireGuilde({ utilisateur, ouvert, fermer, apresInscription }) {
  const dialogue = useRef(null)
  const [champs, setChamps] = useState(() => {
    const profil = lireProfil()
    return {
      ...GUILDE_VIDE,
      ...(profil.faction ? { faction: profil.faction } : {}),
      ...(profil.region ? { region: profil.region } : {}),
      ...(profil.ruleset ? { ruleset: profil.ruleset } : {}),
      ...(profil.langue ? { langue: profil.langue } : {}),
      ...(profil.perso ? { perso: profil.perso } : {}),
    }
  })
  const [erreurs, setErreurs] = useState({})
  const [envoi, setEnvoi] = useState(false)
  const [erreurServeur, setErreurServeur] = useState('')

  useEffect(() => {
    const d = dialogue.current
    if (!d) return
    if (ouvert && !d.open) d.showModal()
    if (!ouvert && d.open) d.close()
  }, [ouvert])

  useEffect(() => {
    if (utilisateur?.contact) setChamps((c) => (c.contact ? c : { ...c, contact: utilisateur.contact }))
  }, [utilisateur])

  const maj = (cle, valeur) => {
    setChamps((c) => ({ ...c, [cle]: valeur }))
    setErreurs((e) => (e[cle] ? { ...e, [cle]: undefined } : e))
  }

  const basculer = (cle, id) => {
    setChamps((c) => ({
      ...c,
      [cle]: c[cle].includes(id) ? c[cle].filter((x) => x !== id) : [...c[cle], id],
    }))
    setErreurs((e) => (e[cle] ? { ...e, [cle]: undefined } : e))
  }

  const valider = () => {
    const e = {}
    const niveau = Number(champs.niveau_min)
    if (champs.nom.trim().length < 2) e.nom = 'Écris le nom de ta guilde (2 lettres ou plus).'
    if (champs.focus.length === 0) e.focus = 'Choisis au moins une activité.'
    if (!(niveau >= 1 && niveau <= 60)) e.niveau_min = 'Entre 1 et 60.'
    if (!champs.perso.trim()) e.perso = 'Écris le nom de ton personnage.'
    if (!champs.contact.trim()) e.contact = 'Écris un lien d’invitation Discord ou ton BattleTag.'
    setErreurs(e)
    return Object.keys(e).length === 0
  }

  const envoyer = async (ev) => {
    ev.preventDefault()
    if (!valider()) return
    setEnvoi(true)
    setErreurServeur('')
    try {
      await creerGuilde(
        {
          nom: champs.nom.trim(),
          faction: champs.faction,
          region: champs.region,
          ruleset: champs.ruleset,
          langue: champs.langue,
          style: champs.style,
          focus: champs.focus,
          roles: champs.roles,
          niveau_min: Number(champs.niveau_min),
          description: champs.description.trim(),
          perso: champs.perso.trim(),
          contact: champs.contact.trim(),
        },
        Number(champs.jours),
      )
      setChamps((c) => ({ ...GUILDE_VIDE, faction: c.faction, region: c.region, ruleset: c.ruleset, langue: c.langue, perso: c.perso, contact: c.contact }))
      setErreurs({})
      await apresInscription()
    } catch {
      setErreurServeur("La guilde n'a pas été inscrite. Réessaie dans un instant (2 guildes actives au maximum par joueur).")
    } finally {
      setEnvoi(false)
    }
  }

  const erreur = (cle) => (erreurs[cle] ? <span className="msg-erreur">{erreurs[cle]}</span> : null)

  return (
    <dialog
      ref={dialogue}
      className="dialogue"
      onClose={fermer}
      onClick={(e) => e.target === dialogue.current && fermer()}
      aria-labelledby="titre-guilde"
    >
      {utilisateur && (
        <form onSubmit={envoyer} noValidate>
          <div className="dialogue-haut">
            <h2 id="titre-guilde">Inscrire ma guilde</h2>
            <button type="button" className="bouton petit" onClick={fermer}>Fermer</button>
          </div>

          <label className="champ">
            <span>Nom de la guilde</span>
            <input type="text" maxLength={40} autoComplete="off" value={champs.nom} onChange={(e) => maj('nom', e.target.value)} aria-invalid={!!erreurs.nom} />
            {erreur('nom')}
          </label>

          <div className="deux">
            <label className="champ">
              <span>Faction</span>
              <select value={champs.faction} onChange={(e) => maj('faction', e.target.value)}>
                {FACTIONS.map((f) => <option key={f.id} value={f.id}>{f.nom}</option>)}
              </select>
            </label>
            <label className="champ">
              <span>Région</span>
              <select value={champs.region} onChange={(e) => maj('region', e.target.value)}>
                {REGIONS.map((r) => <option key={r.id} value={r.id}>{r.nom}</option>)}
              </select>
            </label>
          </div>

          <div className="deux">
            <label className="champ">
              <span>Règles de jeu</span>
              <select value={champs.ruleset} onChange={(e) => maj('ruleset', e.target.value)}>
                {RULESETS.map((r) => <option key={r.id} value={r.id}>{r.nom}</option>)}
              </select>
            </label>
            <label className="champ">
              <span>Langue</span>
              <select value={champs.langue} onChange={(e) => maj('langue', e.target.value)}>
                {LANGUES.map((l) => <option key={l.id} value={l.id}>{l.nom}</option>)}
              </select>
            </label>
          </div>

          <fieldset className="groupe">
            <legend>Ce que fait la guilde</legend>
            <div className="cases">
              {FOCUS_GUILDE.map((f) => (
                <label key={f.id} className="case">
                  <input type="checkbox" checked={champs.focus.includes(f.id)} onChange={() => basculer('focus', f.id)} />
                  <span>{f.nom}</span>
                </label>
              ))}
            </div>
            {erreur('focus')}
          </fieldset>

          <div className="deux">
            <label className="champ">
              <span>Style de jeu</span>
              <select value={champs.style} onChange={(e) => maj('style', e.target.value)}>
                {STYLES.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
              </select>
            </label>
            <label className="champ">
              <span>Niveau minimum pour entrer</span>
              <input type="number" inputMode="numeric" min="1" max="60" value={champs.niveau_min} onChange={(e) => maj('niveau_min', e.target.value)} aria-invalid={!!erreurs.niveau_min} />
              {erreur('niveau_min')}
            </label>
          </div>

          <fieldset className="groupe">
            <legend>Rôles recherchés (facultatif)</legend>
            <div className="cases">
              {ROLES.map((r) => (
                <label key={r.id} className="case">
                  <input type="checkbox" checked={champs.roles.includes(r.id)} onChange={() => basculer('roles', r.id)} />
                  <Icone nom={r.id} taille={16} />
                  <span>{r.nom}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <label className="champ">
            <span>Description (facultatif)</span>
            <textarea rows="3" maxLength={240} value={champs.description} onChange={(e) => maj('description', e.target.value)} placeholder="Ex.: guilde québécoise, ambiance relax, on vise les raids du 9 décembre." />
            <small>{champs.description.length} / 240</small>
          </label>

          <div className="deux">
            <label className="champ">
              <span>Ton personnage</span>
              <input type="text" maxLength={24} autoComplete="off" value={champs.perso} onChange={(e) => maj('perso', e.target.value)} aria-invalid={!!erreurs.perso} />
              {erreur('perso')}
            </label>
            <label className="champ">
              <span>L'inscription reste affichée</span>
              <select value={champs.jours} onChange={(e) => maj('jours', e.target.value)}>
                {DUREES_GUILDE.map((d) => <option key={d.jours} value={d.jours}>{d.nom}</option>)}
              </select>
            </label>
          </div>

          <label className="champ">
            <span>Contact (lien d'invitation Discord ou BattleTag)</span>
            <input type="text" maxLength={80} autoComplete="off" value={champs.contact} onChange={(e) => maj('contact', e.target.value)} aria-invalid={!!erreurs.contact} placeholder="https://discord.gg/…" />
            {erreur('contact')}
            <small className="aide">Visible seulement pour les gens connectés.</small>
          </label>

          {modeDemo && (
            <p className="bandeau" role="note">
              Mode démo: seul ton navigateur verra cette guilde.
            </p>
          )}
          {erreurServeur && <p className="erreur" role="alert">{erreurServeur}</p>}

          <button type="submit" className="bouton principal large" disabled={envoi}>
            {envoi ? 'Inscription…' : 'Inscrire la guilde'}
          </button>
        </form>
      )}
    </dialog>
  )
}
