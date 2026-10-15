import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  connecter,
  creerAnnonce,
  deconnecter,
  discordActif,
  envoyerLienCourriel,
  lireAnnonces,
  modeDemo,
  retirerAnnonce,
  retirerRole,
  suivreUtilisateur,
} from './store.js'
import {
  AUTRE_DONJON,
  CHAMPS_DE_BATAILLE,
  DONJONS_CLASSIQUES,
  DONJONS_NOUVEAUX,
  DUREES,
  FACTIONS,
  PVP_PEU_IMPORTE,
  REGIONS,
  ROLES,
  RULESETS,
  nomDe,
} from './data.js'

// ---------- Petites icônes (dessinées à la main, héritent la couleur du texte) ----------

const CHEMINS = {
  donjon: 'M5 21V10a7 7 0 0114 0v11M3 21h18M12 21v-6',
  pvp: 'M4 4l16 16M20 4L4 20M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
  tank: 'M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6l7-3z',
  heal: 'M12 5v14M5 12h14',
  dps: 'M6 18L18 6M13 6h5v5M6 14l4 4M4 20l3-3',
}

function Icone({ nom, taille = 18 }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={taille}
      height={taille}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={CHEMINS[nom]} />
    </svg>
  )
}

// ---------- Utilitaires ----------

function depuis(iso) {
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (min < 1) return "à l'instant"
  if (min < 60) return `il y a ${min} min`
  return `il y a ${Math.floor(min / 60)} h`
}

function reste(iso) {
  const min = Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 60000))
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h} h ${m} min` : `${h} h`
}

function partRestante(a) {
  const total = new Date(a.expires_at).getTime() - new Date(a.created_at).getTime()
  const restant = new Date(a.expires_at).getTime() - Date.now()
  if (total <= 0) return 0
  return Math.max(0, Math.min(1, restant / total))
}

const FILTRES_VIDES = { activite: 'tout', faction: '', ruleset: '', region: '', role: '', niveau: '' }

function correspond(a, f) {
  const niveau = Number(f.niveau)
  if (f.activite !== 'tout' && a.activite !== f.activite) return false
  if (f.faction && a.faction !== f.faction) return false
  if (f.ruleset && a.ruleset !== f.ruleset) return false
  if (f.region && a.region !== f.region) return false
  if (f.role && !a.roles.includes(f.role)) return false
  if (niveau && (niveau < a.niveau_min || niveau > a.niveau_max)) return false
  return true
}

// ---------- Page ----------

export default function App() {
  const [annonces, setAnnonces] = useState([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState('')
  const [filtres, setFiltres] = useState(FILTRES_VIDES)
  const [formulaireOuvert, setFormulaireOuvert] = useState(false)
  const [message, setMessage] = useState('')
  const [utilisateur, setUtilisateur] = useState(null)

  const charger = useCallback(async () => {
    try {
      setAnnonces(await lireAnnonces())
      setErreur('')
    } catch {
      setErreur('Impossible de charger les annonces. Vérifie ta connexion, puis réessaie.')
    } finally {
      setChargement(false)
    }
  }, [])

  useEffect(() => {
    charger()
    const minuterie = setInterval(charger, 30000)
    return () => clearInterval(minuterie)
  }, [charger])

  useEffect(() => suivreUtilisateur(setUtilisateur), [])

  useEffect(() => {
    if (!message) return
    const minuterie = setTimeout(() => setMessage(''), 3500)
    return () => clearTimeout(minuterie)
  }, [message])

  // Les compteurs Alliance / Horde tiennent compte de tous les filtres sauf la faction elle-même.
  const sansFaction = useMemo(
    () => annonces.filter((a) => correspond(a, { ...filtres, faction: '' })),
    [annonces, filtres],
  )
  const visibles = useMemo(
    () => (filtres.faction ? sansFaction.filter((a) => a.faction === filtres.faction) : sansFaction),
    [sansFaction, filtres.faction],
  )

  const filtresActifs = JSON.stringify(filtres) !== JSON.stringify(FILTRES_VIDES)
  const nbAutres = [filtres.ruleset, filtres.region, filtres.role].filter(Boolean).length

  const changer = (cle) => (e) => setFiltres((f) => ({ ...f, [cle]: e.target.value }))
  const basculerFaction = (id) => setFiltres((f) => ({ ...f, faction: f.faction === id ? '' : id }))

  return (
    <>
      <header className="haut">
        <div className="haut-contenu">
          <div className="titre-bloc">
            <span className="marque" aria-hidden="true">∞</span>
            <div>
              <h1>Babillard Forever</h1>
              <p className="sous-titre">
                Trouve ton groupe pour les donjons et le PvP. Pour le Québec et la francophonie.
              </p>
            </div>
          </div>
          <div className="actions">
            {utilisateur ? (
              <p className="session">
                <span>Connecté: <strong>{utilisateur.nom}</strong></span>
                <button type="button" className="lien" onClick={deconnecter}>Se déconnecter</button>
              </p>
            ) : (
              <button type="button" className="bouton" onClick={() => setFormulaireOuvert(true)}>
                Se connecter
              </button>
            )}
            <button type="button" className="bouton principal" onClick={() => setFormulaireOuvert(true)}>
              Publier une annonce
            </button>
          </div>
        </div>
      </header>

      <main className="page">
        <div className="factions" role="group" aria-label="Filtrer par faction">
          {FACTIONS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`faction-bouton ${f.id}`}
              aria-pressed={filtres.faction === f.id}
              onClick={() => basculerFaction(f.id)}
            >
              <span className="faction-nombre">{sansFaction.filter((a) => a.faction === f.id).length}</span>
              <span className="faction-nom">{f.nom}</span>
            </button>
          ))}
        </div>

        {modeDemo && (
          <p className="bandeau" role="note">
            Mode démo: les annonces restent dans ton navigateur et personne d'autre ne les voit.
          </p>
        )}

        <section className="filtres" aria-label="Filtres">
          <div className="filtres-ligne">
            <div className="segments" role="group" aria-label="Type d'activité">
              {[
                ['tout', 'Tout'],
                ['donjon', 'Donjons'],
                ['pvp', 'PvP'],
              ].map(([id, nom]) => (
                <button
                  key={id}
                  type="button"
                  className="segment"
                  aria-pressed={filtres.activite === id}
                  onClick={() => setFiltres((f) => ({ ...f, activite: id }))}
                >
                  {nom}
                </button>
              ))}
            </div>
            <label className="champ niveau">
              <span>Mon niveau</span>
              <input
                type="number"
                inputMode="numeric"
                min="1"
                max="60"
                placeholder="1 à 60"
                value={filtres.niveau}
                onChange={changer('niveau')}
              />
            </label>
          </div>

          <details className="plus">
            <summary>
              Autres filtres{nbAutres > 0 ? ` (${nbAutres})` : ''}
            </summary>
            <div className="grille-filtres">
              <label className="champ">
                <span>Règles de jeu</span>
                <select value={filtres.ruleset} onChange={changer('ruleset')}>
                  <option value="">Toutes</option>
                  {RULESETS.map((r) => (
                    <option key={r.id} value={r.id}>{r.nom}</option>
                  ))}
                </select>
              </label>
              <label className="champ">
                <span>Région</span>
                <select value={filtres.region} onChange={changer('region')}>
                  <option value="">Toutes</option>
                  {REGIONS.map((r) => (
                    <option key={r.id} value={r.id}>{r.nom}</option>
                  ))}
                </select>
              </label>
              <label className="champ">
                <span>Rôle recherché</span>
                <select value={filtres.role} onChange={changer('role')}>
                  <option value="">Tous</option>
                  {ROLES.map((r) => (
                    <option key={r.id} value={r.id}>{r.nom}</option>
                  ))}
                </select>
              </label>
            </div>
          </details>
        </section>

        <div className="resume" aria-live="polite">
          <strong>
            {visibles.length} {visibles.length > 1 ? 'annonces' : 'annonce'}
          </strong>
          {filtresActifs && (
            <button type="button" className="lien" onClick={() => setFiltres(FILTRES_VIDES)}>
              Effacer les filtres
            </button>
          )}
        </div>

        {erreur && <p className="erreur" role="alert">{erreur}</p>}

        {chargement ? (
          <p className="vide">Chargement des annonces…</p>
        ) : visibles.length === 0 && !erreur ? (
          <div className="vide">
            <p>
              {filtresActifs
                ? 'Aucune annonce avec ces filtres.'
                : "Personne n'a publié d'annonce pour l'instant."}
            </p>
            <button type="button" className="bouton" onClick={() => setFormulaireOuvert(true)}>
              Publier la première annonce
            </button>
          </div>
        ) : (
          <ul className="liste">
            {visibles.map((a) => (
              <li key={a.id}>
                <Carte annonce={a} proprietaire={!!utilisateur && a.user_id === utilisateur.id} apres={charger} />
              </li>
            ))}
          </ul>
        )}

        <footer className="pied">
          Les annonces disparaissent toutes seules quand leur durée est écoulée. Les groupes Alliance et
          Horde ne peuvent pas se mélanger dans Forever.
        </footer>
      </main>

      <Formulaire
        utilisateur={utilisateur}
        ouvert={formulaireOuvert}
        fermer={() => setFormulaireOuvert(false)}
        apresPublication={async () => {
          setFormulaireOuvert(false)
          setMessage('Annonce publiée.')
          await charger()
        }}
      />

      {message && <div className="toast" role="status">{message}</div>}
    </>
  )
}

// ---------- Carte d'annonce ----------

function Carte({ annonce: a, proprietaire, apres }) {
  const [copie, setCopie] = useState(false)
  const [probleme, setProbleme] = useState('')

  const gerer = async (action) => {
    setProbleme('')
    try {
      await action()
      await apres()
    } catch {
      setProbleme("Le changement n'a pas fonctionné. Réessaie dans un instant.")
    }
  }

  const copier = async () => {
    try {
      await navigator.clipboard.writeText(a.contact)
      setCopie(true)
      setTimeout(() => setCopie(false), 2000)
    } catch {
      // presse-papiers bloqué: le contact reste visible et sélectionnable à la main
    }
  }

  return (
    <article className={`carte ${a.faction}`}>
      <div className="carte-haut">
        <span className="carte-icone">
          <Icone nom={a.activite} taille={22} />
          <span className="sr">{a.activite === 'donjon' ? 'Donjon' : 'PvP'}</span>
        </span>
        <div className="carte-titre">
          <h2>{a.cible}</h2>
          <span className={`faction ${a.faction}`}>{nomDe(FACTIONS, a.faction)}</span>
        </div>
        <span className="depuis">{depuis(a.created_at)}</span>
      </div>

      <ul className="infos">
        <li className="chip fort">
          {a.niveau_min === a.niveau_max ? `Niveau ${a.niveau_min}` : `Niveaux ${a.niveau_min} à ${a.niveau_max}`}
        </li>
        <li className="chip">{RULESETS.find((r) => r.id === a.ruleset)?.carte ?? a.ruleset}</li>
        <li className="chip">{a.region}</li>
      </ul>

      {a.roles.length > 0 && (
        <p className="roles">
          <span>Cherche</span>
          {ROLES.filter((r) => a.roles.includes(r.id)).map((r) => (
            <span key={r.id} className="role">
              <Icone nom={r.id} taille={15} />
              {r.nom}
            </span>
          ))}
        </p>
      )}

      {a.activite === 'donjon' && a.roles.length === 0 && (
        <p className="roles"><span className="role complet">Groupe complet</span></p>
      )}

      {a.note && <p className="note">{a.note}</p>}

      <div className="carte-bas">
        <div className="auteur">
          <strong>{a.perso}</strong>
          <span>Expire dans {reste(a.expires_at)}</span>
        </div>
        <div className="contact">
          <code>{a.contact}</code>
          <button type="button" className="bouton petit" onClick={copier}>
            {copie ? 'Copié' : 'Copier le contact'}
          </button>
        </div>
      </div>

      <div className="duree" aria-hidden="true">
        <span style={{ width: `${Math.round(partRestante(a) * 100)}%` }} />
      </div>

      {proprietaire && (
        <div className="gestion">
          {ROLES.filter((r) => a.roles.includes(r.id)).map((r) => (
            <button key={r.id} type="button" className="bouton petit" onClick={() => gerer(() => retirerRole(a, r.id))}>
              {r.nom} trouvé
            </button>
          ))}
          <button type="button" className="bouton petit danger" onClick={() => gerer(() => retirerAnnonce(a.id))}>
            Retirer l'annonce
          </button>
          {probleme && <p className="msg-erreur" role="alert">{probleme}</p>}
        </div>
      )}
    </article>
  )
}

// ---------- Formulaire de publication ----------

const FORMULAIRE_VIDE = {
  activite: 'donjon',
  cible: '',
  faction: 'alliance',
  ruleset: 'normal',
  region: 'US',
  niveau_min: '',
  niveau_max: '',
  roles: [],
  perso: '',
  contact: '',
  note: '',
  heures: 3,
}

function Formulaire({ utilisateur, ouvert, fermer, apresPublication }) {
  const dialogue = useRef(null)
  const [champs, setChamps] = useState(FORMULAIRE_VIDE)
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

  // En PvP, aucun champ de bataille précis n'est exigé: « Groupe PvP » est choisi d'avance.
  const changerActivite = (activite) => {
    setChamps((c) => ({ ...c, activite, cible: activite === 'pvp' ? PVP_PEU_IMPORTE : '', roles: [] }))
    setErreurs((e) => ({ ...e, cible: undefined, roles: undefined }))
  }

  const basculerRole = (id) => {
    setChamps((c) => ({
      ...c,
      roles: c.roles.includes(id) ? c.roles.filter((r) => r !== id) : [...c.roles, id],
    }))
    setErreurs((e) => (e.roles ? { ...e, roles: undefined } : e))
  }

  const valider = () => {
    const e = {}
    const min = Number(champs.niveau_min)
    const max = Number(champs.niveau_max)
    if (champs.activite === 'donjon' && !champs.cible) e.cible = 'Choisis un donjon.'
    if (!(min >= 1 && min <= 60)) e.niveau_min = 'Entre 1 et 60.'
    if (!(max >= 1 && max <= 60)) e.niveau_max = 'Entre 1 et 60.'
    else if (max < min) e.niveau_max = 'Doit être au moins égal au niveau minimum.'
    if (!champs.perso.trim()) e.perso = 'Écris le nom de ton personnage.'
    if (!champs.contact.trim()) e.contact = 'Écris ton Discord ou ton BattleTag pour que les gens te trouvent.'
    if (champs.activite === 'donjon' && champs.roles.length === 0) e.roles = 'Choisis au moins un rôle recherché.'
    setErreurs(e)
    return Object.keys(e).length === 0
  }

  const envoyer = async (ev) => {
    ev.preventDefault()
    if (!valider()) return
    setEnvoi(true)
    setErreurServeur('')
    try {
      await creerAnnonce(
        {
          activite: champs.activite,
          cible: champs.cible || PVP_PEU_IMPORTE,
          faction: champs.faction,
          ruleset: champs.ruleset,
          region: champs.region,
          niveau_min: Number(champs.niveau_min),
          niveau_max: Number(champs.niveau_max),
          roles: champs.roles,
          perso: champs.perso.trim(),
          contact: champs.contact.trim(),
          note: champs.note.trim(),
        },
        Number(champs.heures),
      )
      setChamps((c) => ({
        ...FORMULAIRE_VIDE,
        faction: c.faction,
        ruleset: c.ruleset,
        region: c.region,
        perso: c.perso,
        contact: c.contact,
      }))
      setErreurs({})
      await apresPublication()
    } catch {
      setErreurServeur("L'annonce n'a pas été publiée. Réessaie dans un instant.")
    } finally {
      setEnvoi(false)
    }
  }

  const erreur = (cle) => (erreurs[cle] ? <span className="msg-erreur">{erreurs[cle]}</span> : null)
  const pvp = champs.activite === 'pvp'

  return (
    <dialog
      ref={dialogue}
      className="dialogue"
      onClose={fermer}
      onClick={(e) => e.target === dialogue.current && fermer()}
      aria-labelledby="titre-formulaire"
    >
      {!utilisateur ? (
        <PanneauConnexion fermer={fermer} />
      ) : (
        <form onSubmit={envoyer} noValidate>
          <div className="dialogue-haut">
            <h2 id="titre-formulaire">Publier une annonce</h2>
            <button type="button" className="bouton petit" onClick={fermer}>Fermer</button>
          </div>

          <fieldset className="groupe">
            <legend>Tu cherches un groupe pour</legend>
            <div className="choix-activite">
              {[
                ['donjon', 'Un donjon', 'Choisis le donjon et les rôles qu’il te manque.'],
                ['pvp', 'Du PvP', 'Champ de bataille ou PvP en monde ouvert.'],
              ].map(([id, titre, description]) => (
                <button
                  key={id}
                  type="button"
                  className="choix"
                  aria-pressed={champs.activite === id}
                  onClick={() => changerActivite(id)}
                >
                  <Icone nom={id} taille={24} />
                  <strong>{titre}</strong>
                  <span>{description}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <label className="champ">
            <span>{pvp ? 'Champ de bataille (facultatif)' : 'Donjon'}</span>
            <select value={champs.cible} onChange={(e) => maj('cible', e.target.value)} aria-invalid={!!erreurs.cible}>
              {pvp ? (
                <>
                  <option value={PVP_PEU_IMPORTE}>Peu importe</option>
                  {CHAMPS_DE_BATAILLE.map((d) => <option key={d}>{d}</option>)}
                </>
              ) : (
                <>
                  <option value="">Choisir…</option>
                  <optgroup label="Nouveaux dans Forever">
                    {DONJONS_NOUVEAUX.map((d) => <option key={d}>{d}</option>)}
                  </optgroup>
                  <optgroup label="Classiques">
                    {DONJONS_CLASSIQUES.map((d) => <option key={d}>{d}</option>)}
                  </optgroup>
                  <option>{AUTRE_DONJON}</option>
                </>
              )}
            </select>
            {erreur('cible')}
          </label>

          <div className="deux">
            <label className="champ">
              <span>Niveau minimum</span>
              <input type="number" inputMode="numeric" min="1" max="60" value={champs.niveau_min} onChange={(e) => maj('niveau_min', e.target.value)} aria-invalid={!!erreurs.niveau_min} />
              {erreur('niveau_min')}
            </label>
            <label className="champ">
              <span>Niveau maximum</span>
              <input type="number" inputMode="numeric" min="1" max="60" value={champs.niveau_max} onChange={(e) => maj('niveau_max', e.target.value)} aria-invalid={!!erreurs.niveau_max} />
              {erreur('niveau_max')}
            </label>
          </div>

          <div className="trois">
            <label className="champ">
              <span>Faction</span>
              <select value={champs.faction} onChange={(e) => maj('faction', e.target.value)}>
                {FACTIONS.map((f) => <option key={f.id} value={f.id}>{f.nom}</option>)}
              </select>
            </label>
            <label className="champ">
              <span>Règles de jeu</span>
              <select value={champs.ruleset} onChange={(e) => maj('ruleset', e.target.value)}>
                {RULESETS.map((r) => <option key={r.id} value={r.id}>{r.nom}</option>)}
              </select>
            </label>
            <label className="champ">
              <span>Région</span>
              <select value={champs.region} onChange={(e) => maj('region', e.target.value)}>
                {REGIONS.map((r) => <option key={r.id} value={r.id}>{r.nom}</option>)}
              </select>
            </label>
          </div>

          {!pvp && (
            <fieldset className="groupe">
              <legend>Rôles recherchés</legend>
              <div className="cases">
                {ROLES.map((r) => (
                  <label key={r.id} className="case">
                    <input type="checkbox" checked={champs.roles.includes(r.id)} onChange={() => basculerRole(r.id)} />
                    <Icone nom={r.id} taille={16} />
                    <span>{r.nom}</span>
                  </label>
                ))}
              </div>
              {erreur('roles')}
            </fieldset>
          )}

          <div className="deux">
            <label className="champ">
              <span>Nom de ton personnage</span>
              <input type="text" maxLength={24} autoComplete="off" value={champs.perso} onChange={(e) => maj('perso', e.target.value)} aria-invalid={!!erreurs.perso} />
              {erreur('perso')}
            </label>
            <label className="champ">
              <span>Contact (Discord ou BattleTag)</span>
              <input type="text" maxLength={48} autoComplete="off" value={champs.contact} onChange={(e) => maj('contact', e.target.value)} aria-invalid={!!erreurs.contact} />
              {erreur('contact')}
            </label>
          </div>

          <label className="champ">
            <span>Message (facultatif)</span>
            <textarea rows="2" maxLength={160} value={champs.note} onChange={(e) => maj('note', e.target.value)} placeholder="Ex.: on part à 20 h, micro pas obligatoire." />
            <small>{champs.note.length} / 160</small>
          </label>

          <label className="champ">
            <span>L'annonce reste affichée</span>
            <select value={champs.heures} onChange={(e) => maj('heures', e.target.value)}>
              {DUREES.map((d) => <option key={d.heures} value={d.heures}>{d.nom}</option>)}
            </select>
          </label>

          {modeDemo && (
            <p className="bandeau" role="note">
              Mode démo: seul ton navigateur verra cette annonce.
            </p>
          )}
          {erreurServeur && <p className="erreur" role="alert">{erreurServeur}</p>}

          <button type="submit" className="bouton principal large" disabled={envoi}>
            {envoi ? 'Publication…' : "Publier l'annonce"}
          </button>
        </form>
      )}
    </dialog>
  )
}

// ---------- Connexion ----------

function PanneauConnexion({ fermer }) {
  const [courriel, setCourriel] = useState('')
  const [etat, setEtat] = useState('attente')
  const [probleme, setProbleme] = useState('')

  const envoyer = async (e) => {
    e.preventDefault()
    if (!/^\S+@\S+\.\S+$/.test(courriel.trim())) {
      setProbleme('Écris une adresse courriel valide.')
      return
    }
    setEtat('envoi')
    setProbleme('')
    try {
      const resultat = await envoyerLienCourriel(courriel.trim())
      setEtat(resultat === 'envoye' ? 'envoye' : 'attente')
    } catch {
      setEtat('attente')
      setProbleme("Le courriel n'a pas été envoyé. Réessaie dans quelques minutes.")
    }
  }

  return (
    <div className="dialogue-connexion">
      <div className="dialogue-haut">
        <h2 id="titre-formulaire">Se connecter</h2>
        <button type="button" className="bouton petit" onClick={fermer}>Fermer</button>
      </div>

      {etat === 'envoye' ? (
        <p role="status">
          Courriel envoyé à <strong>{courriel.trim()}</strong>. Clique sur le lien dans le message pour te
          connecter. Regarde aussi dans tes pourriels.
        </p>
      ) : (
        <>
          <p>
            Il faut être connecté pour publier, et tu pourras retirer ton annonce quand ton groupe est
            complet.
          </p>
          {discordActif && (
            <button type="button" className="bouton principal large" onClick={() => connecter().catch(() => {})}>
              Se connecter avec Discord
            </button>
          )}
          <form className="formulaire-courriel" onSubmit={envoyer} noValidate>
            <label className="champ">
              <span>Ou reçois un lien par courriel, sans mot de passe</span>
              <input
                type="email"
                autoComplete="email"
                value={courriel}
                onChange={(e) => setCourriel(e.target.value)}
                aria-invalid={!!probleme}
              />
              {probleme && <span className="msg-erreur" role="alert">{probleme}</span>}
            </label>
            <button type="submit" className={`bouton large${discordActif ? '' : ' principal'}`} disabled={etat === 'envoi'}>
              {etat === 'envoi' ? 'Envoi…' : 'Recevoir un lien de connexion'}
            </button>
          </form>
          <p className="petit-texte">Ton courriel n'est jamais affiché sur le site.</p>
        </>
      )}
    </div>
  )
}
