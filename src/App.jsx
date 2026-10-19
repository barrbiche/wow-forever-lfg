import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  connecter,
  creerAnnonce,
  deconnecter,
  discordActif,
  envoyerLienCourriel,
  ecrireProfil,
  lireAnnonces,
  lireGuildes,
  lireProfil,
  modeDemo,
  retirerAnnonce,
  retirerRole,
  suivreUtilisateur,
} from './store.js'
import {
  AUTRE_DONJON,
  CHAMPS_DE_BATAILLE,
  CLASSES,
  DONJONS_CLASSIQUES,
  DONJONS_NOUVEAUX,
  DONJON_PEU_IMPORTE,
  DUREES,
  FACTIONS,
  LANGUES,
  NIVEAUX_DONJONS,
  PVP_PEU_IMPORTE,
  RAIDS,
  REGIONS,
  ROLES,
  RULESETS,
  STYLES,
  nomDe,
  raidsOuverts,
} from './data.js'
import {
  Contact,
  Icone,
  NOMS_ACTIVITE,
  Signalement,
  avantDepart,
  depuis,
  departParDefaut,
  departTexte,
  jourTexte,
  partRestante,
  reste,
  versChampDate,
} from './commun.jsx'
import SectionGuildes from './Guildes.jsx'
import { LIEN_DISCORD } from './config.js'

const FILTRES_VIDES = {
  activite: 'tout',
  faction: '',
  region: '',
  role: '',
  niveau: '',
  style: '',
  langue: '',
  genre: '',
  planifies: false,
}

function correspond(a, f) {
  const niveau = Number(f.niveau)
  if (f.activite !== 'tout' && a.activite !== f.activite) return false
  if (f.genre && (a.genre ?? 'groupe') !== f.genre) return false
  if (f.planifies && !a.debut) return false
  if (f.faction && a.faction !== f.faction) return false
  if (f.region && a.region !== f.region) return false
  if (f.style && a.style !== f.style) return false
  if (f.langue && a.langue !== f.langue) return false
  if (f.role && !a.roles.includes(f.role)) return false
  if (niveau) {
    // Un joueur seul a un seul niveau: on le montre s'il est à 3 niveaux ou moins du tien.
    if ((a.genre ?? 'groupe') === 'joueur') return Math.abs(niveau - a.niveau_min) <= 3
    if (niveau < a.niveau_min || niveau > a.niveau_max) return false
  }
  return true
}

// ---------- Style du site (Neutre, Alliance ou Horde), gardé dans le navigateur ----------

const STYLES_SITE = [
  ['', 'Neutre'],
  ['alliance', 'Alliance'],
  ['horde', 'Horde'],
]
const COULEURS_BARRE = { alliance: '#071229', horde: '#0b0404' }

function styleEnregistre() {
  const v = document.documentElement.dataset.style
  return v === 'alliance' || v === 'horde' ? v : ''
}

function appliquerStyle(style) {
  if (style) document.documentElement.dataset.style = style
  else delete document.documentElement.dataset.style
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', style ? COULEURS_BARRE[style] : m.dataset.defaut))
  try {
    if (style) localStorage.setItem('forever-style', style)
    else localStorage.removeItem('forever-style')
  } catch {
    // navigation privée: le style n'est pas gardé pour la prochaine visite
  }
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
  const [styleSite, setStyleSite] = useState(styleEnregistre)

  const choisirStyle = (style) => {
    appliquerStyle(style)
    setStyleSite(style)
  }

  const [guildes, setGuildes] = useState(null) // null: pas encore disponibles (ex.: base pas à jour)
  const [vue, setVue] = useState('groupes')

  const charger = useCallback(async () => {
    try {
      setAnnonces(await lireAnnonces())
      setErreur('')
    } catch {
      setErreur('Impossible de charger les annonces. Vérifie ta connexion, puis réessaie.')
    } finally {
      setChargement(false)
    }
    try {
      setGuildes(await lireGuildes())
    } catch {
      setGuildes(null)
    }
  }, [])

  useEffect(() => {
    const minuterie = setInterval(charger, 30000)
    return () => clearInterval(minuterie)
  }, [charger])

  useEffect(() => suivreUtilisateur(setUtilisateur), [])

  // Connexion ou déconnexion: on recharge, car les contacts ne sont envoyés qu'aux gens connectés.
  useEffect(() => {
    charger()
  }, [charger, utilisateur?.id])

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
  const visibles = useMemo(() => {
    const liste = filtres.faction ? sansFaction.filter((a) => a.faction === filtres.faction) : sansFaction
    // Agenda: les groupes planifiés, du plus proche départ au plus lointain.
    return filtres.planifies ? [...liste].sort((a, b) => new Date(a.debut) - new Date(b.debut)) : liste
  }, [sansFaction, filtres.faction, filtres.planifies])

  const guildesSansFaction = useMemo(
    () => (guildes ?? []).filter((g) => !filtres.langue || g.langue === filtres.langue),
    [guildes, filtres.langue],
  )
  const guildesVisibles = useMemo(
    () => (filtres.faction ? guildesSansFaction.filter((g) => g.faction === filtres.faction) : guildesSansFaction),
    [guildesSansFaction, filtres.faction],
  )
  const comptes = vue === 'guildes' ? guildesSansFaction : sansFaction
  // Nombre d'annonces par type, avec tous les autres filtres appliqués.
  const sansActivite = useMemo(
    () => annonces.filter((a) => correspond(a, { ...filtres, activite: 'tout' })),
    [annonces, filtres],
  )
  const nombreActivite = (id) => (id === 'tout' ? sansActivite.length : sansActivite.filter((a) => a.activite === id).length)
  const nbPlanifies = useMemo(() => annonces.filter((a) => a.debut).length, [annonces])

  const filtresActifs = JSON.stringify(filtres) !== JSON.stringify(FILTRES_VIDES)
  const nbAutres = [filtres.region, filtres.role, filtres.style].filter(Boolean).length
  const raids = raidsOuverts()

  const changer = (cle) => (e) => setFiltres((f) => ({ ...f, [cle]: e.target.value }))
  const basculerFaction = (id) => setFiltres((f) => ({ ...f, faction: f.faction === id ? '' : id }))
  const basculer = (cle, valeur) => setFiltres((f) => ({ ...f, [cle]: f[cle] === valeur ? FILTRES_VIDES[cle] : valeur }))
  const ouvrirConnexion = () => setFormulaireOuvert(true)

  return (
    <>
      <header className="haut">
        <svg className="haut-infini" viewBox="0 0 240 120" aria-hidden="true" focusable="false">
          <path
            className="eco"
            pathLength="1"
            d="M120 60C148 18 215 14 215 60C215 106 148 102 120 60C92 18 25 14 25 60C25 106 92 102 120 60Z"
          />
          <path
            className="trait"
            pathLength="1"
            d="M120 60C148 18 215 14 215 60C215 106 148 102 120 60C92 18 25 14 25 60C25 106 92 102 120 60Z"
          />
        </svg>
        <div className="haut-contenu">
          <div className="titre-bloc">
            <h1>
              <span>Babillard</span> <span>Forever</span>
            </h1>
            <p className="sous-titre">
              Trouve ton groupe pour les donjons{raids ? ', les raids' : ''} et le PvP. Pour le Québec et la
              francophonie.
            </p>
            <div className="actions">
              {utilisateur ? (
                <p className="session">
                  <span>Connecté: <strong>{utilisateur.nom}</strong></span>
                  <button type="button" className="lien" onClick={deconnecter}>Se déconnecter</button>
                </p>
              ) : (
                <button type="button" className="bouton" onClick={ouvrirConnexion}>
                  Se connecter
                </button>
              )}
              <button type="button" className="bouton principal" onClick={() => setFormulaireOuvert(true)}>
                Publier une annonce
              </button>
            </div>
            {!chargement && (
              <p className="vivant">
                <span className="point" aria-hidden="true" />
                {annonces.length === 0
                  ? "Aucune annonce pour l'instant. Sois le premier."
                  : `${annonces.length} ${annonces.length > 1 ? 'annonces actives' : 'annonce active'} en ce moment`}
              </p>
            )}
          </div>
          <div className="styles" role="group" aria-label="Apparence du site">
            {STYLES_SITE.map(([id, nom]) => (
              <button
                key={id || 'neutre'}
                type="button"
                data-style={id || 'neutre'}
                aria-pressed={styleSite === id}
                aria-label={nom}
                title={nom}
                onClick={() => choisirStyle(id)}
              />
            ))}
          </div>
        </div>
      </header>

      <main className="page">
        {modeDemo && (
          <p className="bandeau demo" role="note">
            Mode démo: les annonces restent dans ton navigateur et personne d'autre ne les voit.
          </p>
        )}

        <div className="barre">
          <div className="onglets" role="group" aria-label="Section du site">
            <button type="button" className="onglet" aria-pressed={vue === 'groupes'} onClick={() => setVue('groupes')}>
              Groupes <span className="onglet-nombre">{annonces.length}</span>
            </button>
            <button type="button" className="onglet" aria-pressed={vue === 'guildes'} onClick={() => setVue('guildes')}>
              Guildes <span className="onglet-nombre">{guildes ? guildes.length : 0}</span>
            </button>
          </div>

          <div className="factions" role="group" aria-label="Filtrer par faction">
            {FACTIONS.map((f) => (
              <button
                key={f.id}
                type="button"
                className={`faction-bouton ${f.id}`}
                aria-pressed={filtres.faction === f.id}
                onClick={() => basculerFaction(f.id)}
              >
                <span className="faction-nombre">{comptes.filter((a) => a.faction === f.id).length}</span>
                <span className="faction-nom">{f.nom}</span>
              </button>
            ))}
          </div>
        </div>

        {vue === 'guildes' ? (
          <SectionGuildes
            guildes={guildesVisibles}
            disponible={guildes !== null}
            utilisateur={utilisateur}
            onConnexion={ouvrirConnexion}
            apres={charger}
            langueFr={filtres.langue === 'fr'}
            basculerLangue={() => basculer('langue', 'fr')}
            filtresActifs={!!(filtres.faction || filtres.langue)}
            effacerFiltres={() => setFiltres((f) => ({ ...f, faction: '', langue: '' }))}
            annoncer={setMessage}
          />
        ) : (
          <>
            <section className="filtres" aria-label="Filtres">
              <div className="filtres-ligne">
                <div className={`segments${raids ? ' quatre' : ''}`} role="group" aria-label="Type d'activité">
                  {[
                    ['tout', 'Tout'],
                    ['donjon', 'Donjons'],
                    ...(raids ? [['raid', 'Raids']] : []),
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
                      <span className="segment-nombre">{nombreActivite(id)}</span>
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

              <div className="pastilles">
                <button type="button" className="pastille" aria-pressed={filtres.langue === 'fr'} onClick={() => basculer('langue', 'fr')}>
                  Français seulement
                </button>
                <button type="button" className="pastille" aria-pressed={filtres.planifies} onClick={() => basculer('planifies', true)}>
                  Planifiés ({nbPlanifies})
                </button>
                <button type="button" className="pastille" aria-pressed={filtres.genre === 'groupe'} onClick={() => basculer('genre', 'groupe')}>
                  Groupes
                </button>
                <button type="button" className="pastille" aria-pressed={filtres.genre === 'joueur'} onClick={() => basculer('genre', 'joueur')}>
                  Joueurs seuls
                </button>
              </div>

              <details className="plus">
                <summary>
                  Autres filtres{nbAutres > 0 ? ` (${nbAutres})` : ''}
                </summary>
                <div className="grille-filtres">
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
                    <span>Rôle (cherché ou joué)</span>
                    <select value={filtres.role} onChange={changer('role')}>
                      <option value="">Tous</option>
                      {ROLES.map((r) => (
                        <option key={r.id} value={r.id}>{r.nom}</option>
                      ))}
                    </select>
                  </label>
                  <label className="champ">
                    <span>Style de jeu</span>
                    <select value={filtres.style} onChange={changer('style')}>
                      <option value="">Tous</option>
                      {STYLES.map((r) => (
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
                <span className="vide-icone" aria-hidden="true"><Icone nom="raid" taille={30} /></span>
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
                {visibles.map((a, i) => (
                  <Fragment key={a.id}>
                    {filtres.planifies && (i === 0 || jourTexte(a.debut) !== jourTexte(visibles[i - 1].debut)) && (
                      <li className="jour"><h2>{jourTexte(a.debut)}</h2></li>
                    )}
                    <li>
                      <Carte
                        annonce={a}
                        proprietaire={!!utilisateur && a.user_id === utilisateur.id}
                        utilisateur={utilisateur}
                        onConnexion={ouvrirConnexion}
                        apres={charger}
                      />
                    </li>
                  </Fragment>
                ))}
              </ul>
            )}
          </>
        )}

        <footer className="pied">
          <p>
            Les annonces disparaissent toutes seules quand leur durée est écoulée. Dans Forever, les groupes
            Alliance et Horde ne se mélangent pas.
          </p>
          {LIEN_DISCORD && (
            <p>
              <a className="invitation" href={LIEN_DISCORD} target="_blank" rel="noopener noreferrer">
                Rejoindre le Discord de la communauté
              </a>
            </p>
          )}
          <p className="avis">
            Babillard Forever est un site de fans, sans lien avec Blizzard Entertainment. World of Warcraft est une
            marque de Blizzard Entertainment, Inc.
          </p>
        </footer>
      </main>

      <Formulaire
        factionParDefaut={styleSite === 'horde' ? 'horde' : 'alliance'}
        utilisateur={utilisateur}
        ouvert={formulaireOuvert}
        fermer={() => setFormulaireOuvert(false)}
        apresPublication={async () => {
          setFormulaireOuvert(false)
          setMessage('Annonce publiée.')
          setVue('groupes')
          await charger()
        }}
      />

      {message && <div className="toast" role="status">{message}</div>}
    </>
  )
}

// ---------- Carte d'annonce ----------

function Carte({ annonce: a, proprietaire, utilisateur, onConnexion, apres }) {
  const [probleme, setProbleme] = useState('')
  const joueur = a.genre === 'joueur'
  const classe = CLASSES.find((c) => c.id === a.classe)

  const gerer = async (action) => {
    setProbleme('')
    try {
      await action()
      await apres()
    } catch {
      setProbleme("Le changement n'a pas fonctionné. Réessaie dans un instant.")
    }
  }

  return (
    <article className={`carte ${a.faction}`}>
      <div className="carte-plaque">
        <Icone nom={joueur ? 'joueur' : a.activite} taille={26} />
        <strong className="plaque-niveau" aria-hidden="true">
          {a.niveau_min === a.niveau_max ? a.niveau_min : `${a.niveau_min}–${a.niveau_max}`}
        </strong>
        <span className="plaque-unite" aria-hidden="true">{a.niveau_min === a.niveau_max ? 'niveau' : 'niveaux'}</span>
        <span className="sr">
          {joueur ? `Joueur seul, ${NOMS_ACTIVITE[a.activite].toLowerCase()}` : NOMS_ACTIVITE[a.activite]}.{' '}
          {a.niveau_min === a.niveau_max ? `Niveau ${a.niveau_min}` : `Niveaux ${a.niveau_min} à ${a.niveau_max}`}
        </span>
      </div>

      <div className="carte-corps">
        <div className="carte-haut">
          <div className="carte-titre">
            <h2>{a.cible}</h2>
            <span className={`faction ${a.faction}`}>
              {nomDe(FACTIONS, a.faction)}
              {joueur ? ' · joueur seul' : ''}
            </span>
          </div>
          <span className="depuis">{depuis(a.created_at)}</span>
        </div>

        <ul className="infos">
          {classe && (
            <li className="chip classe">
              <span className="classe-point" style={{ background: classe.couleur }} aria-hidden="true" />
              {classe.nom}
            </li>
          )}
          {a.activite === 'raid' && (
            <li className="chip fort">{RAIDS.find((r) => r.nom === a.cible)?.taille ?? ''} joueurs</li>
          )}
          {a.debut && (
            <li className="chip depart">
              <Icone nom="horloge" taille={14} />
              Départ {departTexte(a.debut)}
            </li>
          )}
          {a.activite !== 'pvp' && a.ruleset && a.ruleset !== 'normal' && (
            <li className="chip">{RULESETS.find((r) => r.id === a.ruleset)?.carte ?? a.ruleset}</li>
          )}
          <li className="chip">{a.region}</li>
          {a.style && <li className="chip">{nomDe(STYLES, a.style)}</li>}
          {a.langue && <li className="chip">{a.langue === 'en' ? 'English' : 'Français'}</li>}
        </ul>

        {a.roles.length > 0 && (
          <p className="roles">
            <span>{joueur ? 'Joue' : 'Cherche'}</span>
            {ROLES.filter((r) => a.roles.includes(r.id)).map((r) => (
              <span key={r.id} className={`role ${r.id}`}>
                <Icone nom={r.id} taille={15} />
                {r.nom}
              </span>
            ))}
          </p>
        )}

        {!joueur && a.activite !== 'pvp' && a.roles.length === 0 && (
          <p className="roles"><span className="role complet">Groupe complet</span></p>
        )}

        {a.note && <p className="note">{a.note}</p>}

        <div className="carte-bas">
          <div className="auteur">
            <span
              className="avatar"
              aria-hidden="true"
              style={classe ? { '--anneau': classe.couleur } : undefined}
            >
              {(a.perso || '?').trim().charAt(0).toUpperCase()}
            </span>
            <div className="auteur-texte">
              <strong>{a.perso}</strong>
              <span>{a.debut ? avantDepart(a.debut) : `Expire dans ${reste(a.expires_at)}`}</span>
              <span className="duree" aria-hidden="true">
                <span style={{ width: `${Math.round(partRestante(a) * 100)}%` }} />
              </span>
            </div>
          </div>
          <Contact contact={a.contact} onConnexion={onConnexion} />
        </div>

        {proprietaire ? (
          <div className="gestion">
            {!joueur &&
              ROLES.filter((r) => a.roles.includes(r.id)).map((r) => (
                <button key={r.id} type="button" className="bouton petit" onClick={() => gerer(() => retirerRole(a, r.id))}>
                  {r.nom} trouvé
                </button>
              ))}
            <button type="button" className="bouton petit danger" onClick={() => gerer(() => retirerAnnonce(a.id))}>
              {joueur ? "J'ai trouvé un groupe" : "Retirer l'annonce"}
            </button>
            {probleme && <p className="msg-erreur" role="alert">{probleme}</p>}
          </div>
        ) : (
          <div className="signaler-ligne">
            <Signalement type="annonce" id={a.id} utilisateur={utilisateur} onConnexion={onConnexion} />
          </div>
        )}
      </div>
    </article>
  )
}

// ---------- Formulaire de publication ----------

const FORMULAIRE_VIDE = {
  genre: 'groupe',
  activite: 'donjon',
  cible: '',
  faction: 'alliance',
  region: 'US',
  style: 'relax',
  langue: 'fr',
  classe: '',
  niveau_min: '',
  niveau_max: '',
  roles: [],
  perso: '',
  contact: '',
  note: '',
  quand: 'maintenant',
  debut: '',
  heures: 3,
}

// Ce qui est gardé dans le navigateur d'une annonce à l'autre.
const CHAMPS_DU_PROFIL = ['perso', 'classe', 'contact', 'faction', 'region', 'langue']
const versProfil = (champs) => Object.fromEntries(CHAMPS_DU_PROFIL.map((cle) => [cle, champs[cle]]))

const CHOIX_GENRE = [
  ['groupe', 'Un groupe', 'On cherche des joueurs.'],
  ['joueur', 'Un joueur seul', 'Je cherche un groupe.'],
]

const CHOIX_ACTIVITE = [
  ['donjon', 'Un donjon', 'Un donjon à faire.'],
  ['raid', 'Un raid', '10, 20 ou 40 joueurs.'],
  ['pvp', 'Du PvP', 'Champ de bataille ou monde ouvert.'],
]

function Formulaire({ factionParDefaut, utilisateur, ouvert, fermer, apresPublication }) {
  const dialogue = useRef(null)
  const [champs, setChamps] = useState(() => {
    const profil = lireProfil()
    const garde = Object.fromEntries(
      CHAMPS_DU_PROFIL.filter((cle) => typeof profil[cle] === 'string' && profil[cle]).map((cle) => [cle, profil[cle]]),
    )
    return { ...FORMULAIRE_VIDE, faction: factionParDefaut, ...garde }
  })
  const [erreurs, setErreurs] = useState({})
  const [envoi, setEnvoi] = useState(false)
  const [erreurServeur, setErreurServeur] = useState('')
  const raids = raidsOuverts()
  const premierPassage = useRef(true)

  useEffect(() => {
    const d = dialogue.current
    if (!d) return
    if (ouvert && !d.open) d.showModal()
    if (!ouvert && d.open) d.close()
  }, [ouvert])

  // Choisir le style Horde ou Alliance propose aussi cette faction dans le formulaire.
  useEffect(() => {
    if (premierPassage.current) {
      premierPassage.current = false
      return
    }
    setChamps((c) => ({ ...c, faction: factionParDefaut }))
  }, [factionParDefaut])

  useEffect(() => {
    if (utilisateur?.contact) setChamps((c) => (c.contact ? c : { ...c, contact: utilisateur.contact }))
  }, [utilisateur])

  const maj = (cle, valeur) => {
    setChamps((c) => ({ ...c, [cle]: valeur }))
    setErreurs((e) => (e[cle] ? { ...e, [cle]: undefined } : e))
  }

  const cibleParDefaut = (genre, activite) =>
    activite === 'pvp' ? PVP_PEU_IMPORTE : genre === 'joueur' && activite === 'donjon' ? DONJON_PEU_IMPORTE : ''

  // Un joueur seul n'a qu'un niveau (le sien): on garde minimum et maximum identiques.
  const changerGenre = (genre) => {
    setChamps((c) => ({
      ...c,
      genre,
      cible: c.activite === 'donjon' ? cibleParDefaut(genre, 'donjon') : c.cible,
      niveau_max: genre === 'joueur' ? c.niveau_min : c.niveau_max,
    }))
    setErreurs({})
  }

  // En PvP, aucun champ de bataille précis n'est exigé: « Groupe PvP » est choisi d'avance.
  // Un raid est toujours de niveau 60.
  const changerActivite = (activite) => {
    setChamps((c) => ({
      ...c,
      activite,
      cible: cibleParDefaut(c.genre, activite),
      roles: [],
      niveau_min: activite === 'raid' ? '60' : c.activite === 'raid' ? '' : c.niveau_min,
      niveau_max: activite === 'raid' ? '60' : c.activite === 'raid' ? '' : c.niveau_max,
    }))
    setErreurs((e) => ({ ...e, cible: undefined, roles: undefined, niveau_min: undefined, niveau_max: undefined }))
  }

  // Pour un groupe, choisir un donjon remplit les niveaux suggérés (modifiables ensuite).
  const choisirCible = (cible) => {
    const plage = NIVEAUX_DONJONS[cible]
    setChamps((c) => ({
      ...c,
      cible,
      ...(c.activite === 'donjon' && c.genre === 'groupe' && plage
        ? { niveau_min: String(plage[0]), niveau_max: String(plage[1]) }
        : {}),
    }))
    setErreurs((e) => ({ ...e, cible: undefined, niveau_min: undefined, niveau_max: undefined }))
  }

  const changerMonNiveau = (valeur) => {
    setChamps((c) => ({ ...c, niveau_min: valeur, niveau_max: valeur }))
    setErreurs((e) => ({ ...e, niveau_min: undefined, niveau_max: undefined }))
  }

  const choisirQuand = (quand) => {
    setChamps((c) => ({ ...c, quand, debut: quand === 'plus_tard' ? c.debut || departParDefaut() : '' }))
    setErreurs((e) => ({ ...e, debut: undefined }))
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
    const joueur = champs.genre === 'joueur'
    const min = Number(champs.niveau_min)
    const max = joueur ? min : Number(champs.niveau_max)
    if (champs.activite === 'donjon' && !champs.cible) e.cible = 'Choisis un donjon.'
    if (champs.activite === 'raid' && !champs.cible) e.cible = 'Choisis un raid.'
    if (!(min >= 1 && min <= 60)) e.niveau_min = joueur ? 'Écris ton niveau, entre 1 et 60.' : 'Entre 1 et 60.'
    if (!joueur) {
      if (!(max >= 1 && max <= 60)) e.niveau_max = 'Entre 1 et 60.'
      else if (max < min) e.niveau_max = 'Doit être au moins égal au niveau minimum.'
    }
    if (!champs.perso.trim()) e.perso = 'Écris le nom de ton personnage.'
    if (!champs.contact.trim()) e.contact = 'Écris ton Discord ou ton BattleTag pour que les gens te trouvent.'
    if (champs.activite !== 'pvp' && champs.roles.length === 0) {
      e.roles = joueur ? 'Choisis au moins un rôle que tu joues.' : 'Choisis au moins un rôle recherché.'
    }
    if (champs.quand === 'plus_tard') {
      const t = new Date(champs.debut).getTime()
      if (!champs.debut || Number.isNaN(t)) e.debut = 'Choisis la date et l’heure du départ.'
      else if (t <= Date.now()) e.debut = 'Le départ doit être dans le futur.'
      else if (t > Date.now() + 70 * 3600000) e.debut = 'Le départ doit être dans les 3 prochains jours.'
    }
    setErreurs(e)
    return Object.keys(e).length === 0
  }

  const envoyer = async (ev) => {
    ev.preventDefault()
    if (!valider()) return
    setEnvoi(true)
    setErreurServeur('')
    try {
      const joueur = champs.genre === 'joueur'
      await creerAnnonce(
        {
          genre: champs.genre,
          activite: champs.activite,
          cible: champs.cible || PVP_PEU_IMPORTE,
          faction: champs.faction,
          ruleset: 'normal', // le choix des règles n'est plus demandé; la base exige une valeur
          style: champs.style,
          langue: champs.langue,
          classe: champs.classe || null,
          region: champs.region,
          niveau_min: Number(champs.niveau_min),
          niveau_max: joueur ? Number(champs.niveau_min) : Number(champs.niveau_max),
          roles: champs.activite === 'pvp' ? [] : champs.roles,
          perso: champs.perso.trim(),
          contact: champs.contact.trim(),
          note: champs.note.trim(),
          debut: champs.quand === 'plus_tard' ? new Date(champs.debut).toISOString() : null,
        },
        Number(champs.heures),
      )
      ecrireProfil(versProfil(champs))
      setChamps((c) => ({ ...FORMULAIRE_VIDE, ...versProfil(c) }))
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
  const raid = champs.activite === 'raid'
  const joueur = champs.genre === 'joueur'

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
            <legend>Tu publies pour</legend>
            <div className="choix-activite">
              {CHOIX_GENRE.map(([id, titre, description]) => (
                <button
                  key={id}
                  type="button"
                  className="choix"
                  aria-pressed={champs.genre === id}
                  onClick={() => changerGenre(id)}
                >
                  <strong>{titre}</strong>
                  <span>{description}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="groupe">
            <legend>{joueur ? 'Tu veux faire' : 'Votre groupe va faire'}</legend>
            <div className="choix-activite">
              {CHOIX_ACTIVITE.map(([id, titre, description]) => {
                const ferme = id === 'raid' && !raids
                return (
                  <button
                    key={id}
                    type="button"
                    className="choix"
                    aria-pressed={champs.activite === id}
                    disabled={ferme}
                    onClick={() => changerActivite(id)}
                  >
                    <Icone nom={id} taille={24} />
                    <strong>{titre}</strong>
                    <span>{ferme ? 'Dès le 9 décembre.' : description}</span>
                  </button>
                )
              })}
            </div>
          </fieldset>

          <label className="champ">
            <span>{pvp ? 'Champ de bataille (facultatif)' : raid ? 'Raid' : 'Donjon'}</span>
            <select value={champs.cible} onChange={(e) => choisirCible(e.target.value)} aria-invalid={!!erreurs.cible}>
              {pvp ? (
                <>
                  <option value={PVP_PEU_IMPORTE}>Peu importe</option>
                  {CHAMPS_DE_BATAILLE.map((d) => <option key={d}>{d}</option>)}
                </>
              ) : raid ? (
                <>
                  <option value="">Choisir…</option>
                  {RAIDS.map((r) => <option key={r.nom} value={r.nom}>{r.nom} ({r.taille} joueurs)</option>)}
                </>
              ) : (
                <>
                  {joueur ? <option value={DONJON_PEU_IMPORTE}>{DONJON_PEU_IMPORTE}</option> : <option value="">Choisir…</option>}
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

          {joueur ? (
            <label className="champ">
              <span>Mon niveau</span>
              <input type="number" inputMode="numeric" min="1" max="60" value={champs.niveau_min} onChange={(e) => changerMonNiveau(e.target.value)} aria-invalid={!!erreurs.niveau_min} />
              {erreur('niveau_min')}
            </label>
          ) : (
            <>
              <div className="deux court">
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
              {champs.activite === 'donjon' && NIVEAUX_DONJONS[champs.cible] && (
                <p className="aide">Niveaux suggérés pour ce donjon. Tu peux les changer.</p>
              )}
            </>
          )}

          <div className="deux court">
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

          {!pvp && (
            <fieldset className="groupe">
              <legend>{joueur ? 'Rôle(s) que tu joues' : 'Rôles recherchés'}</legend>
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
          <p className="aide">Ton contact n'est visible que pour les gens connectés. Il est gardé pour ta prochaine annonce.</p>

          <label className="champ">
            <span>Message (facultatif)</span>
            <textarea rows="2" maxLength={160} value={champs.note} onChange={(e) => maj('note', e.target.value)} placeholder="Ex.: micro pas obligatoire, on y va tranquille." />
            <small>{champs.note.length} / 160</small>
          </label>

          <fieldset className="groupe">
            <legend>Quand?</legend>
            <div className="choix-activite">
              {[
                ['maintenant', 'Maintenant', 'On part dès que le groupe est plein.'],
                ['plus_tard', 'Plus tard', 'Choisis le jour et l’heure du départ.'],
              ].map(([id, titre, description]) => (
                <button
                  key={id}
                  type="button"
                  className="choix"
                  aria-pressed={champs.quand === id}
                  onClick={() => choisirQuand(id)}
                >
                  <strong>{titre}</strong>
                  <span>{description}</span>
                </button>
              ))}
            </div>
          </fieldset>

          {champs.quand === 'plus_tard' && (
            <label className="champ">
              <span>Départ (dans les 3 prochains jours)</span>
              <input
                type="datetime-local"
                step="300"
                min={versChampDate(new Date())}
                max={versChampDate(new Date(Date.now() + 70 * 3600000))}
                value={champs.debut}
                onChange={(e) => maj('debut', e.target.value)}
                aria-invalid={!!erreurs.debut}
              />
              {erreur('debut')}
              <small className="aide">L'annonce reste affichée jusqu'à 1 heure après le départ.</small>
            </label>
          )}

          <details className="plus">
            <summary>Plus d'options</summary>
            <div className="deux court">
              <label className="champ">
                <span>Style de jeu</span>
                <select value={champs.style} onChange={(e) => maj('style', e.target.value)}>
                  {STYLES.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
                </select>
              </label>
              <label className="champ">
                <span>{joueur ? 'Ta langue' : 'Langue du groupe'}</span>
                <select value={champs.langue} onChange={(e) => maj('langue', e.target.value)}>
                  {LANGUES.map((l) => <option key={l.id} value={l.id}>{l.nom}</option>)}
                </select>
              </label>
              <label className="champ">
                <span>Ta classe</span>
                <select value={champs.classe} onChange={(e) => maj('classe', e.target.value)}>
                  <option value="">Non précisée</option>
                  {CLASSES.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
                </select>
              </label>
              {champs.quand === 'maintenant' && (
                <label className="champ">
                  <span>L'annonce reste affichée</span>
                  <select value={champs.heures} onChange={(e) => maj('heures', e.target.value)}>
                    {DUREES.map((d) => <option key={d.heures} value={d.heures}>{d.nom}</option>)}
                  </select>
                </label>
              )}
            </div>
          </details>

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
