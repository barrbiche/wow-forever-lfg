import { useEffect, useRef, useState } from 'react'
import {
  ecrireProfil,
  enregistrerProfil,
  lireProfil,
  modeDemo,
  recommander,
  retirerReco,
  supprimerProfil,
} from './store.js'
import {
  BATTLETAG_FORMAT,
  CLASSES,
  ETIQUETTES,
  FACTIONS,
  LANGUES,
  REGIONS,
  ROLES,
  STYLES,
  nomDe,
  normaliserBattleTag,
} from './data.js'
import { Icone, LigneCopie, Signalement } from './commun.jsx'
import { LangueJeu, commandeInviter, useLangueJeu } from './langue.jsx'

// ---------- Onglet « Joueurs »: les profils, qui est en ligne, la réputation ----------

// « Vu il y a 3 h » (l'heure exacte est arrondie par la base, donc on reste approximatif).
export function vuTexte(iso) {
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (min < 60) return 'Vu récemment'
  const h = Math.floor(min / 60)
  if (h < 24) return `Vu il y a ${h} h`
  const j = Math.floor(h / 24)
  return `Vu il y a ${j} ${j > 1 ? 'jours' : 'jour'}`
}

export default function SectionJoueurs({
  joueurs,
  visibles,
  enLigne,
  utilisateur,
  monProfil,
  onConnexion,
  ouvrirProfil,
  apres,
  annoncer,
  voirAnnonce,
  filtres,
  changer,
  basculer,
  filtresActifs,
  effacerFiltres,
}) {
  const [langue] = useLangueJeu()

  if (!utilisateur) {
    return (
      <div className="vide">
        <span className="vide-icone" aria-hidden="true"><Icone nom="joueur" taille={30} /></span>
        <p>La liste des joueurs est réservée aux gens connectés.</p>
        <button type="button" className="bouton principal" onClick={onConnexion}>Se connecter</button>
      </div>
    )
  }

  if (joueurs === null) {
    return (
      <p className="erreur" role="status">
        La liste des joueurs n'est pas encore disponible. Réessaie dans un moment.
      </p>
    )
  }

  const nbEnLigne = joueurs.filter((j) => enLigne.has(j.user_id)).length

  return (
    <>
      <section className="filtres" aria-label="Filtres des joueurs">
        {!monProfil && (
          <p className="intro-guildes">
            Crée ton profil pour apparaître dans la liste et recommander les joueurs avec qui tu as joué.
          </p>
        )}
        {monProfil && !monProfil.visible && (
          <p className="intro-guildes">
            Ton profil est caché: toi seul le vois. Tu peux le remettre dans la liste quand tu veux.
          </p>
        )}

        <div className="filtres-ligne">
          <label className="champ recherche">
            <span className="sr">Chercher un personnage</span>
            <input
              type="search"
              autoComplete="off"
              maxLength={24}
              placeholder="Chercher un personnage"
              value={filtres.recherche}
              onChange={changer('recherche')}
            />
          </label>
          <button type="button" className="bouton" onClick={ouvrirProfil}>
            {monProfil ? 'Mon profil' : 'Créer mon profil'}
          </button>
        </div>

        <div className="pastilles">
          <button type="button" className="pastille" aria-pressed={filtres.enLigne} onClick={() => basculer('enLigne', true)}>
            En ligne maintenant ({nbEnLigne})
          </button>
          <button type="button" className="pastille" aria-pressed={filtres.langue === 'fr'} onClick={() => basculer('langue', 'fr')}>
            Français seulement
          </button>
        </div>

        <details className="plus">
          <summary>
            Autres filtres{[filtres.role, filtres.classe, filtres.region].filter(Boolean).length > 0
              ? ` (${[filtres.role, filtres.classe, filtres.region].filter(Boolean).length})`
              : ''}
          </summary>
          <div className="grille-filtres">
            <label className="champ">
              <span>Rôle</span>
              <select value={filtres.role} onChange={changer('role')}>
                <option value="">Tous</option>
                {ROLES.map((r) => <option key={r.id} value={r.id}>{r.nom}</option>)}
              </select>
            </label>
            <label className="champ">
              <span>Classe</span>
              <select value={filtres.classe} onChange={changer('classe')}>
                <option value="">Toutes</option>
                {CLASSES.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
            </label>
            <label className="champ">
              <span>Région</span>
              <select value={filtres.region} onChange={changer('region')}>
                <option value="">Toutes</option>
                {REGIONS.map((r) => <option key={r.id} value={r.id}>{r.nom}</option>)}
              </select>
            </label>
          </div>
        </details>
      </section>

      <div className="resume" aria-live="polite">
        <strong>
          {visibles.length} {visibles.length > 1 ? 'joueurs' : 'joueur'}
        </strong>
        <span className="resume-detail">{nbEnLigne} en ligne</span>
        {filtresActifs && (
          <button type="button" className="lien" onClick={effacerFiltres}>
            Effacer les filtres
          </button>
        )}
        <LangueJeu />
      </div>

      {visibles.length === 0 ? (
        <div className="vide">
          <span className="vide-icone" aria-hidden="true"><Icone nom="joueur" taille={30} /></span>
          <p>
            {filtresActifs
              ? 'Aucun joueur avec ces filtres.'
              : "Personne n'est dans la liste pour l'instant. Publie une annonce ou crée ton profil."}
          </p>
          {!filtresActifs && !monProfil && (
            <button type="button" className="bouton" onClick={ouvrirProfil}>Créer mon profil</button>
          )}
        </div>
      ) : (
        <ul className="liste">
          {visibles.map((j) => (
            <li key={j.user_id}>
              <CarteJoueur
                joueur={j}
                commande={commandeInviter(langue)}
                enLigne={enLigne.has(j.user_id)}
                utilisateur={utilisateur}
                aProfil={!!monProfil}
                ouvrirProfil={ouvrirProfil}
                apres={apres}
                annoncer={annoncer}
                voirAnnonce={voirAnnonce}
                onConnexion={onConnexion}
              />
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

// ---------- Carte d'un joueur ----------

function CarteJoueur({ joueur: j, commande, enLigne, utilisateur, aProfil, ouvrirProfil, apres, annoncer, voirAnnonce, onConnexion }) {
  const classe = CLASSES.find((c) => c.id === j.classe)
  const [choisir, setChoisir] = useState(false)
  const [choix, setChoix] = useState([])
  const [occupe, setOccupe] = useState(false)
  const [probleme, setProbleme] = useState('')
  const etiquettes = Object.entries(j.etiquettes ?? {})
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)

  const erreurDe = (e) =>
    e?.code === '54000'
      ? "Tu as donné beaucoup de pouces aujourd'hui. Réessaie demain."
      : e?.code === '22023'
        ? "Crée d'abord ton profil pour recommander quelqu'un."
        : "Le pouce n'a pas été enregistré. Réessaie dans un instant."

  const donner = async (ev) => {
    ev.preventDefault()
    setOccupe(true)
    setProbleme('')
    try {
      await recommander(j.user_id, choix)
      setChoisir(false)
      setChoix([])
      annoncer('Pouce envoyé. Merci!')
      await apres()
    } catch (e) {
      setProbleme(erreurDe(e))
    } finally {
      setOccupe(false)
    }
  }

  const retirer = async () => {
    setOccupe(true)
    setProbleme('')
    try {
      await retirerReco(j.user_id)
      await apres()
    } catch {
      setProbleme("Le pouce n'a pas été retiré. Réessaie dans un instant.")
    } finally {
      setOccupe(false)
    }
  }

  const basculerEtiquette = (id) =>
    setChoix((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]))

  return (
    <article className={`carte joueur ${j.faction}`} id={`joueur-${j.user_id}`} tabIndex={-1}>
      <div className="carte-plaque">
        <Icone nom="joueur" taille={26} />
        <strong className="plaque-niveau" aria-hidden="true">{j.niveau ?? '?'}</strong>
        <span className="plaque-unite" aria-hidden="true">niveau</span>
        <span className="sr">{j.niveau ? `Niveau ${j.niveau}` : 'Niveau non précisé'}</span>
      </div>

      <div className="carte-corps">
        <div className="carte-haut">
          <div className="carte-titre">
            <h2>{j.perso}</h2>
            <span className={`faction ${j.faction}`}>{nomDe(FACTIONS, j.faction)}</span>
          </div>
          {enLigne ? (
            <span className="depuis en-ligne">
              <span className="point" aria-hidden="true" />
              En ligne
            </span>
          ) : (
            <span className="depuis">{vuTexte(j.vu_le)}</span>
          )}
        </div>

        <ul className="infos">
          {classe && (
            <li className="chip classe">
              <span className="classe-point" style={{ background: classe.couleur }} aria-hidden="true" />
              {classe.nom}
            </li>
          )}
          {j.guilde && <li className="chip fort">{j.guilde}</li>}
          <li className="chip">{j.region}</li>
          <li className="chip">{nomDe(STYLES, j.style)}</li>
          <li className="chip">{nomDe(LANGUES, j.langue)}</li>
        </ul>

        {j.roles.length > 0 && (
          <p className="roles">
            <span>Joue</span>
            {ROLES.filter((r) => j.roles.includes(r.id)).map((r) => (
              <span key={r.id} className={`role ${r.id}`}>
                <Icone nom={r.id} taille={15} />
                {r.nom}
              </span>
            ))}
          </p>
        )}

        {j.bio && <p className="note">{j.bio}</p>}

        {j.en_revision ? (
          <p className="reputation revision">
            <Icone nom="pouce" taille={16} />
            Respect: réputation en vérification
          </p>
        ) : (
          <div className="reputation">
            <span className="respect-titre">Respect</span>
            <span className="pouces" aria-label={`${j.pouces} ${j.pouces > 1 ? 'pouces' : 'pouce'}`}>
              <Icone nom="pouce" taille={16} />
              <strong>{j.pouces}</strong>
              <span aria-hidden="true">{j.pouces > 1 ? 'pouces' : 'pouce'}</span>
            </span>
            {etiquettes.map(([id, n]) => (
              <span key={id} className="etiquette">{nomDe(ETIQUETTES, id)} <span className="etiquette-n">×{n}</span></span>
            ))}
            {j.pouces === 0 && <span className="aide">Pas encore de pouce.</span>}
          </div>
        )}

        {(!j.moi || j.battletag) && (
          <div className="inviter">
            {!j.moi && (
              <LigneCopie
                titre="Inviter dans le jeu"
                valeur={`${commande} ${j.perso}`}
                conseil="Dans le jeu: ouvre le chat (Entrée), colle, puis Entrée."
              />
            )}
            {j.battletag && (
              <LigneCopie
                titre="BattleTag"
                valeur={j.battletag}
                conseil="Colle-le dans Battle.net pour l'ajouter comme ami."
              />
            )}
          </div>
        )}

        {j.moi ? (
          <div className="gestion">
            <span className="moi">C'est ton profil{j.visible ? '' : ' (caché de la liste)'}</span>
            <button type="button" className="bouton petit" onClick={ouvrirProfil}>Modifier mon profil</button>
            {j.annonce_id && (
              <button type="button" className="lien signaler" onClick={() => voirAnnonce(j.annonce_id)}>
                Voir mon annonce
              </button>
            )}
          </div>
        ) : (
          <>
            {choisir && (
              <form className="recommandation" onSubmit={donner}>
                {aProfil ? (
                  <>
                    <fieldset className="groupe">
                      <legend>Qu'est-ce qui décrit bien {j.perso}? (facultatif)</legend>
                      <div className="cases">
                        {ETIQUETTES.map((e) => (
                          <label key={e.id} className="case">
                            <input type="checkbox" checked={choix.includes(e.id)} onChange={() => basculerEtiquette(e.id)} />
                            <span>{e.nom}</span>
                          </label>
                        ))}
                      </div>
                    </fieldset>
                    <p className="aide">Recommande seulement quelqu'un avec qui tu as vraiment joué.</p>
                    <div className="signalement-actions">
                      <button type="submit" className="bouton petit principal" disabled={occupe}>Donner un pouce</button>
                      <button type="button" className="bouton petit" onClick={() => setChoisir(false)}>Annuler</button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="aide">Crée d'abord ton profil pour recommander quelqu'un.</p>
                    <div className="signalement-actions">
                      <button type="button" className="bouton petit principal" onClick={ouvrirProfil}>Créer mon profil</button>
                      <button type="button" className="bouton petit" onClick={() => setChoisir(false)}>Annuler</button>
                    </div>
                  </>
                )}
              </form>
            )}
            <div className="joueur-actions">
              {j.ma_reco ? (
                <button type="button" className="bouton petit" onClick={retirer} disabled={occupe}>
                  <Icone nom="pouce" taille={15} />
                  Retirer mon pouce
                </button>
              ) : (
                !choisir && (
                  <button type="button" className="bouton petit" onClick={() => setChoisir(true)}>
                    <Icone nom="pouce" taille={15} />
                    Recommander
                  </button>
                )
              )}
              {j.annonce_id && (
                <button type="button" className="bouton petit" onClick={() => voirAnnonce(j.annonce_id)}>
                  Voir son annonce
                </button>
              )}
              <span className="joueur-signaler">
                {j.mon_signalement ? (
                  <span className="aide signale">Signalé</span>
                ) : (
                  <Signalement type="joueur" id={j.user_id} utilisateur={utilisateur} onConnexion={onConnexion} />
                )}
              </span>
            </div>
            {probleme && <p className="msg-erreur" role="alert">{probleme}</p>}
          </>
        )}
      </div>
    </article>
  )
}

// ---------- Fenêtre « Mon profil » ----------

const PROFIL_VIDE = {
  perso: '',
  classe: '',
  niveau: '',
  roles: [],
  faction: 'alliance',
  region: 'US',
  langue: 'fr',
  style: 'relax',
  guilde: '',
  bio: '',
  battletag: '',
  visible: true,
}

// Ce qui est déjà connu du joueur: son profil s'il existe, sinon ce qu'il a écrit dans ses annonces.
function champsInitiaux(profil, factionParDefaut) {
  if (profil) {
    return {
      ...PROFIL_VIDE,
      perso: profil.perso ?? '',
      classe: profil.classe ?? '',
      niveau: profil.niveau ? String(profil.niveau) : '',
      roles: profil.roles ?? [],
      faction: profil.faction,
      region: profil.region,
      langue: profil.langue,
      style: profil.style,
      guilde: profil.guilde ?? '',
      bio: profil.bio ?? '',
      battletag: profil.battletag ?? '',
      visible: profil.visible !== false,
    }
  }
  const garde = lireProfil()
  const texte = (cle) => (typeof garde[cle] === 'string' && garde[cle] ? { [cle]: garde[cle] } : {})
  return {
    ...PROFIL_VIDE,
    faction: factionParDefaut,
    ...texte('perso'),
    ...texte('classe'),
    ...texte('faction'),
    ...texte('region'),
    ...texte('langue'),
  }
}

export function ProfilJoueur({ ouvert, fermer, profil, factionParDefaut, apres, annoncer }) {
  const dialogue = useRef(null)
  const [champs, setChamps] = useState(() => champsInitiaux(profil, factionParDefaut))
  const [erreurs, setErreurs] = useState({})
  const [envoi, setEnvoi] = useState(false)
  const [erreurServeur, setErreurServeur] = useState('')
  const [confirmer, setConfirmer] = useState(false)

  useEffect(() => {
    const d = dialogue.current
    if (!d) return
    if (ouvert && !d.open) {
      setChamps(champsInitiaux(profil, factionParDefaut))
      setErreurs({})
      setErreurServeur('')
      setConfirmer(false)
      d.showModal()
    }
    if (!ouvert && d.open) d.close()
    // On recharge les champs seulement à l'ouverture, pas à chaque rafraîchissement de la liste.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ouvert])

  const maj = (cle, valeur) => {
    setChamps((c) => ({ ...c, [cle]: valeur }))
    setErreurs((e) => (e[cle] ? { ...e, [cle]: undefined } : e))
  }

  const basculerRole = (id) =>
    setChamps((c) => ({ ...c, roles: c.roles.includes(id) ? c.roles.filter((r) => r !== id) : [...c.roles, id] }))

  const valider = () => {
    const e = {}
    if (!champs.perso.trim()) e.perso = 'Écris le nom de ton personnage.'
    if (champs.niveau !== '' && !(Number(champs.niveau) >= 1 && Number(champs.niveau) <= 60)) {
      e.niveau = 'Entre 1 et 60, ou laisse vide.'
    }
    if (champs.battletag.trim() && !BATTLETAG_FORMAT.test(normaliserBattleTag(champs.battletag))) {
      e.battletag = "Écris-le comme Nom#1234: un nom de 3 à 12 caractères, un dièse, puis 4 à 8 chiffres."
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
      await enregistrerProfil(champs)
      // Les annonces suivantes se remplissent avec les mêmes choix.
      ecrireProfil({
        ...lireProfil(),
        perso: champs.perso.trim(),
        classe: champs.classe,
        faction: champs.faction,
        region: champs.region,
        langue: champs.langue,
      })
      annoncer('Profil enregistré.')
      await apres()
      fermer()
    } catch {
      setErreurServeur("Le profil n'a pas été enregistré. Réessaie dans un instant.")
    } finally {
      setEnvoi(false)
    }
  }

  const supprimer = async () => {
    setEnvoi(true)
    setErreurServeur('')
    try {
      await supprimerProfil()
      annoncer('Profil supprimé.')
      await apres()
      fermer()
    } catch {
      setErreurServeur("Le profil n'a pas été supprimé. Réessaie dans un instant.")
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
      aria-labelledby="titre-profil"
    >
      <form onSubmit={envoyer} noValidate>
        <div className="dialogue-haut">
          <h2 id="titre-profil">{profil ? 'Mon profil' : 'Créer mon profil'}</h2>
          <button type="button" className="bouton petit" onClick={fermer}>Fermer</button>
        </div>

        <label className="champ">
          <span>Nom de ton personnage</span>
          <input type="text" maxLength={24} autoComplete="off" value={champs.perso} onChange={(e) => maj('perso', e.target.value)} aria-invalid={!!erreurs.perso} />
          {erreur('perso')}
        </label>

        <div className="deux court">
          <label className="champ">
            <span>Classe</span>
            <select value={champs.classe} onChange={(e) => maj('classe', e.target.value)}>
              <option value="">Non précisée</option>
              {CLASSES.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
          </label>
          <label className="champ">
            <span>Niveau (facultatif)</span>
            <input type="number" inputMode="numeric" min="1" max="60" value={champs.niveau} onChange={(e) => maj('niveau', e.target.value)} aria-invalid={!!erreurs.niveau} />
            {erreur('niveau')}
          </label>
        </div>

        <fieldset className="groupe">
          <legend>Rôle(s) que tu joues</legend>
          <div className="cases">
            {ROLES.map((r) => (
              <label key={r.id} className="case">
                <input type="checkbox" checked={champs.roles.includes(r.id)} onChange={() => basculerRole(r.id)} />
                <Icone nom={r.id} taille={16} />
                <span>{r.nom}</span>
              </label>
            ))}
          </div>
        </fieldset>

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
          <label className="champ">
            <span>Langue</span>
            <select value={champs.langue} onChange={(e) => maj('langue', e.target.value)}>
              {LANGUES.map((l) => <option key={l.id} value={l.id}>{l.nom}</option>)}
            </select>
          </label>
          <label className="champ">
            <span>Style de jeu</span>
            <select value={champs.style} onChange={(e) => maj('style', e.target.value)}>
              {STYLES.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
            </select>
          </label>
        </div>

        <label className="champ">
          <span>Guilde (facultatif)</span>
          <input type="text" maxLength={40} autoComplete="off" value={champs.guilde} onChange={(e) => maj('guilde', e.target.value)} />
        </label>

        <label className="champ">
          <span>Petit mot (facultatif)</span>
          <textarea rows="2" maxLength={160} value={champs.bio} onChange={(e) => maj('bio', e.target.value)} placeholder="Ex.: souvent là en soirée, j'aime les donjons tranquilles." />
          <small>{champs.bio.length} / 160</small>
        </label>

        <label className="champ">
          <span>BattleTag (facultatif)</span>
          <input
            type="text"
            maxLength={24}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            placeholder="Nom#1234"
            value={champs.battletag}
            onChange={(e) => maj('battletag', e.target.value)}
            aria-invalid={!!erreurs.battletag}
            aria-describedby="aide-battletag"
          />
          {erreur('battletag')}
        </label>
        <p className="aide" id="aide-battletag">
          Pour que les autres joueurs puissent t'ajouter comme ami. Toutes les personnes connectées au site le voient sur
          ton profil, avec un bouton pour le copier. Laisse vide pour ne pas le montrer.
        </p>

        <label className="case visibilite">
          <input type="checkbox" checked={champs.visible} onChange={(e) => maj('visible', e.target.checked)} />
          <span>Apparaître dans la liste des joueurs</span>
        </label>
        <p className="aide">
          Seules les personnes connectées voient la liste, et tu y es « en ligne » quand le site est ouvert. Le contact de
          tes annonces n'y est jamais. Décoche la case pour te cacher en tout temps (ton BattleTag aussi).
        </p>

        {modeDemo && (
          <p className="bandeau" role="note">
            Mode démo: seul ton navigateur verra ce profil.
          </p>
        )}
        {erreurServeur && <p className="erreur" role="alert">{erreurServeur}</p>}

        <button type="submit" className="bouton principal large" disabled={envoi}>
          {envoi ? 'Enregistrement…' : 'Enregistrer mon profil'}
        </button>

        {profil && (
          <div className="suppression">
            {confirmer ? (
              <>
                <p className="aide">
                  Ton profil et les pouces que tu as reçus seront supprimés. Tes annonces ne changent pas.
                </p>
                <div className="signalement-actions">
                  <button type="button" className="bouton petit danger" onClick={supprimer} disabled={envoi}>
                    Oui, supprimer mon profil
                  </button>
                  <button type="button" className="bouton petit" onClick={() => setConfirmer(false)}>Annuler</button>
                </div>
              </>
            ) : (
              <button type="button" className="lien signaler" onClick={() => setConfirmer(true)}>
                Supprimer mon profil
              </button>
            )}
          </div>
        )}
      </form>
    </dialog>
  )
}
