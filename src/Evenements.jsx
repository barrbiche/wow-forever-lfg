import { useCallback, useContext, useEffect, useRef, useState } from 'react'
import {
  MESSAGE_COMPTE_SUSPENDU,
  annulerEvenement,
  compteSuspendu,
  creerEvenement,
  desinscrireEvenement,
  inscrireEvenement,
  lireEvenements,
  lireProfil,
  modeDemo,
} from './store.js'
import {
  FACTIONS,
  LANGUES,
  REGIONS,
  ROLES,
  RULESETS,
  compatibilite,
  exigencesAnnonce,
  nomDe,
  nomRuleset,
} from './data.js'
import { Contact, ContextePersos, Icone, LienDirect, adresseComplete, departFuseaux, departTexte, versChampDate } from './commun.jsx'
import { telechargerIcs } from './calendrier.js'

// ---------- « Événements »: un rendez-vous planifié (raid de guilde, soirée donjons…) avec des inscriptions ----------
// Voir supabase/ameliorations25.sql. Les visiteurs voient les totaux; les gens connectés voient qui est inscrit.

export const TYPES_EVENEMENT = [
  { id: 'raid', nom: 'Raid', icone: 'raid' },
  { id: 'donjon', nom: 'Donjons', icone: 'donjon' },
  { id: 'pvp', nom: 'PvP', icone: 'pvp' },
  { id: 'soiree', nom: 'Soirée entre joueurs', icone: 'amis' },
]
const nomType = (id) => TYPES_EVENEMENT.find((t) => t.id === id)?.nom ?? id

const STATUTS = { oui: 'Présent', peut_etre: 'Peut-être' }

export default function SectionEvenements({ utilisateur, onConnexion, ouvrirProfil, annoncer, cible, commutateur }) {
  const [evenements, setEvenements] = useState(undefined) // undefined: chargement; null: pas disponible
  const [formulaireOuvert, setFormulaireOuvert] = useState(false)
  const ciblesFaites = useRef(null)

  const charger = useCallback(async () => {
    try {
      setEvenements(await lireEvenements())
    } catch {
      setEvenements(null)
    }
  }, [])

  // Chargé à l'ouverture et quand la connexion change (les noms des inscrits n'arrivent qu'aux gens connectés).
  useEffect(() => {
    charger()
  }, [charger, utilisateur?.id])

  // Lien direct (?evenement=ID): on défile jusqu'à la carte une fois la liste là.
  useEffect(() => {
    if (!cible || !Array.isArray(evenements) || ciblesFaites.current === cible) return
    ciblesFaites.current = cible
    const carte = document.getElementById(`evenement-${cible}`)
    if (carte) {
      carte.scrollIntoView({ block: 'center' })
      carte.focus({ preventScroll: true })
    } else {
      annoncer?.("Cet événement n'est plus affiché: il est terminé ou a été annulé.")
    }
  }, [cible, evenements, annoncer])

  const organiser = () => (utilisateur ? setFormulaireOuvert(true) : onConnexion())
  const liste = Array.isArray(evenements) ? evenements : []

  return (
    <>
      {commutateur}
      <section className="filtres" aria-label="Événements">
        <p className="intro-guildes">
          Un raid de guilde, une soirée donjons, un tournoi PvP? Annonce-le jusqu'à 60 jours d'avance: les joueurs s'inscrivent avec
          leur personnage et leur rôle.
        </p>
        <div className="pastilles">
          <button type="button" className="bouton principal petit" onClick={organiser}>
            Organiser un événement
          </button>
        </div>
      </section>

      <div className="resume" aria-live="polite">
        <strong>
          {liste.length} {liste.length > 1 ? 'événements' : 'événement'}
        </strong>
        <span className="resume-detail">à venir</span>
      </div>

      {evenements === undefined ? (
        <p className="aide" role="status">Chargement des événements…</p>
      ) : evenements === null ? (
        <p className="erreur" role="status">
          Les événements ne sont pas encore disponibles. Réessaie dans un moment.
        </p>
      ) : liste.length === 0 ? (
        <div className="vide">
          <span className="vide-icone" aria-hidden="true"><Icone nom="horloge" taille={30} /></span>
          <p>Aucun événement n'est prévu pour l'instant.</p>
          <button type="button" className="bouton" onClick={organiser}>Organiser le premier</button>
        </div>
      ) : (
        <ul className="liste">
          {liste.map((e) => (
            <li key={e.id}>
              <CarteEvenement
                evenement={e}
                utilisateur={utilisateur}
                onConnexion={onConnexion}
                ouvrirProfil={ouvrirProfil}
                apres={charger}
                annoncer={annoncer}
              />
            </li>
          ))}
        </ul>
      )}

      <FormulaireEvenement
        utilisateur={utilisateur}
        ouvert={formulaireOuvert}
        fermer={() => setFormulaireOuvert(false)}
        apresCreation={async () => {
          setFormulaireOuvert(false)
          annoncer?.('Événement publié.')
          await charger()
        }}
      />
    </>
  )
}

// ---------- Carte d'un événement ----------

const messageErreurInscription = (e) => {
  const m = e?.message ?? ''
  if (compteSuspendu(e)) return MESSAGE_COMPTE_SUSPENDU
  if (/complet/i.test(m)) return 'Il ne reste plus de place pour les présents. Tu peux t’inscrire en « peut-être ».'
  if (/incompatible/i.test(m)) return 'Ce personnage ne peut pas participer (faction, région ou type de serveur différent).'
  if (/termin/i.test(m)) return 'Cet événement est déjà commencé ou terminé.'
  return "L'inscription n'a pas fonctionné. Réessaie dans un instant."
}

function CarteEvenement({ evenement: e, utilisateur, onConnexion, ouvrirProfil, apres, annoncer }) {
  const persos = useContext(ContextePersos)
  const proprietaire = !!utilisateur && e.user_id === utilisateur.id
  const compatibles = (persos ?? []).filter((p) => compatibilite(p, e).ok)
  const [perso, setPerso] = useState('')
  const [role, setRole] = useState('')
  const [occupe, setOccupe] = useState(false)
  const [probleme, setProbleme] = useState('')
  const [confirmer, setConfirmer] = useState(false)

  const persoChoisi = compatibles.find((p) => p.perso === (perso || e.mon_perso)) ?? compatibles[0]
  const roleChoisi = role || e.mon_role || persoChoisi?.roles?.[0] || 'dps'
  const place = e.places != null ? `${e.nb_oui} / ${e.places}` : `${e.nb_oui}`
  const complet = e.places != null && e.nb_oui >= e.places
  const commence = new Date(e.debut).getTime() <= Date.now()
  const type = TYPES_EVENEMENT.find((t) => t.id === e.type)

  const agir = async (action, message) => {
    setOccupe(true)
    setProbleme('')
    try {
      await action()
      await apres()
      if (message) annoncer?.(message)
    } catch (err) {
      setProbleme(messageErreurInscription(err))
    } finally {
      setOccupe(false)
    }
  }

  const sInscrire = (statut) =>
    agir(() => inscrireEvenement(e.id, persoChoisi.perso, roleChoisi, statut), statut === 'oui' ? 'Tu es inscrit.' : 'Noté: peut-être.')

  const annuler = () => agir(() => annulerEvenement(e.id), 'Événement annulé.')

  const ics = () =>
    telechargerIcs({
      id: e.id,
      param_lien: 'evenement',
      debut: e.debut,
      cible: e.titre,
      activite: e.type,
      genre: 'groupe',
      faction: e.faction,
      niveau_min: e.niveau_min,
      niveau_max: e.niveau_max,
      roles: [],
      perso: e.perso,
      note: e.description,
    })

  return (
    <article className={`carte evenement ${e.faction}`} data-activite="evenement" id={`evenement-${e.id}`} tabIndex={-1}>
      <div className="carte-plaque">
        <Icone nom={type?.icone ?? 'horloge'} taille={30} />
        <span className="plaque-unite">{nomType(e.type)}</span>
        {e.niveau_min > 1 || e.niveau_max < 60 ? (
          <span className="plaque-unite">niv. {e.niveau_min === e.niveau_max ? e.niveau_min : `${e.niveau_min}–${e.niveau_max}`}</span>
        ) : null}
      </div>

      <div className="carte-corps">
        <div className="carte-haut">
          <div className="carte-titre">
            <h2>{e.titre}</h2>
            <span className={`faction ${e.faction}`}>{nomDe(FACTIONS, e.faction)}</span>
          </div>
        </div>

        <ul className="infos">
          <li className="chip depart">
            <Icone nom="horloge" taille={14} />
            {commence ? 'Commencé ' : ''}
            {departTexte(e.debut)}
            {departFuseaux(e.debut) && <span className="depart-fuseaux"> ({departFuseaux(e.debut)})</span>}
          </li>
          <li className="chip fort">
            {place} {e.places != null ? 'présents' : e.nb_oui > 1 ? 'présents' : 'présent'}
            {complet ? ' · complet' : ''}
          </li>
          {e.nb_peut_etre > 0 && <li className="chip">{e.nb_peut_etre} peut-être</li>}
          <li className="chip chip-serveur">{RULESETS.find((r) => r.id === (e.ruleset || 'normal'))?.carte ?? e.ruleset}</li>
          <li className="chip">{e.region}</li>
          <li className="chip">{e.langue === 'en' ? 'English' : 'Français'}</li>
          {e.guilde && <li className="chip fort">{e.guilde}</li>}
        </ul>

        <p className="roles" aria-label="Rôles des présents">
          {ROLES.map((r) => (
            <span key={r.id} className={`role ${r.id}`}>
              <Icone nom={r.id} taille={15} />
              {r.nom} {e[`nb_${r.id}`] ?? 0}
            </span>
          ))}
        </p>

        {e.description && <p className="note">{e.description}</p>}

        <div className="carte-bas">
          <div className="auteur">
            <span className="avatar" aria-hidden="true">{(e.perso || '?').trim().charAt(0).toUpperCase()}</span>
            <div className="auteur-texte">
              <strong>{e.perso}</strong>
              <span>Organisateur</span>
            </div>
          </div>
          <Contact contact={e.contact} onConnexion={onConnexion} lienLibre />
        </div>

        {/* Inscription */}
        {commence ? null : !utilisateur ? (
          <div className="inscription">
            <button type="button" className="bouton principal petit" onClick={onConnexion}>
              Se connecter pour s'inscrire
            </button>
          </div>
        ) : !persos || persos.length === 0 ? (
          <div className="inscription">
            <p className="aide">Il faut un profil avec ton personnage pour s'inscrire.</p>
            <button type="button" className="bouton petit" onClick={ouvrirProfil}>Créer mon profil</button>
          </div>
        ) : compatibles.length === 0 ? (
          <p className="inviter-bloque" role="note">
            Aucun de tes personnages ne peut participer: il faut {exigencesAnnonce(e)}.
          </p>
        ) : (
          <div className="inscription">
            {e.mon_statut && (
              <p className="inscription-etat" role="status">
                <Icone nom="coche" taille={15} /> Tu es inscrit: <strong>{STATUTS[e.mon_statut]}</strong> avec {e.mon_perso} (
                {nomDe(ROLES, e.mon_role)}).
              </p>
            )}
            <div className="inscription-choix">
              {compatibles.length > 1 && (
                <label className="champ">
                  <span>Personnage</span>
                  <select value={persoChoisi?.perso ?? ''} onChange={(ev) => setPerso(ev.target.value)}>
                    {compatibles.map((p) => <option key={p.perso} value={p.perso}>{p.perso}</option>)}
                  </select>
                </label>
              )}
              <label className="champ">
                <span>Rôle</span>
                <select value={roleChoisi} onChange={(ev) => setRole(ev.target.value)}>
                  {ROLES.map((r) => <option key={r.id} value={r.id}>{r.nom}</option>)}
                </select>
              </label>
            </div>
            <div className="inscription-boutons">
              <button
                type="button"
                className="bouton principal petit"
                disabled={occupe || (complet && e.mon_statut !== 'oui')}
                onClick={() => sInscrire('oui')}
              >
                {e.mon_statut === 'oui' ? 'Mettre à jour' : complet ? 'Complet' : 'Je serai là'}
              </button>
              <button type="button" className="bouton petit" disabled={occupe} onClick={() => sInscrire('peut_etre')}>
                Peut-être
              </button>
              {e.mon_statut && (
                <button
                  type="button"
                  className="bouton petit"
                  disabled={occupe}
                  onClick={() => agir(() => desinscrireEvenement(e.id), 'Tu es désinscrit.')}
                >
                  Me désinscrire
                </button>
              )}
            </div>
          </div>
        )}
        {probleme && <p className="msg-erreur" role="alert">{probleme}</p>}

        {Array.isArray(e.inscrits) && e.inscrits.length > 0 && (
          <details className="inscrits">
            <summary>Qui vient? ({e.inscrits.length})</summary>
            <ul>
              {e.inscrits.map((i, n) => (
                <li key={`${i.perso}-${n}`}>
                  <strong>{i.perso}</strong>
                  <span className={`role ${i.role}`}>
                    <Icone nom={i.role} taille={14} />
                    {nomDe(ROLES, i.role)}
                  </span>
                  <span className="aide">{STATUTS[i.statut]}</span>
                </li>
              ))}
            </ul>
          </details>
        )}

        <div className={proprietaire ? 'gestion' : 'signaler-ligne'}>
          {proprietaire && !confirmer && (
            <button type="button" className="bouton petit danger" disabled={occupe} onClick={() => setConfirmer(true)}>
              Annuler l'événement
            </button>
          )}
          {proprietaire && confirmer && (
            <>
              <button type="button" className="bouton petit danger" disabled={occupe} onClick={annuler}>
                Oui, annuler pour tout le monde
              </button>
              <button type="button" className="bouton petit" onClick={() => setConfirmer(false)}>
                Garder l'événement
              </button>
            </>
          )}
          <button type="button" className="lien signaler" onClick={ics}>
            Ajouter à mon calendrier
          </button>
          <LienDirect type="evenement" id={e.id} />
        </div>
      </div>
    </article>
  )
}

// ---------- Formulaire: organiser un événement ----------

const EVENEMENT_VIDE = {
  titre: '',
  type: 'raid',
  debut: '',
  faction: 'alliance',
  region: 'US',
  ruleset: 'normal',
  niveau_min: '1',
  niveau_max: '60',
  places: '',
  langue: 'fr',
  guilde: '',
  description: '',
  perso: '',
  contact: '',
}

// Demain à 20 h: l'heure où ça joue le plus.
const departParDefautEvenement = () => {
  const d = new Date(Date.now() + 86400000)
  d.setHours(20, 0, 0, 0)
  return versChampDate(d)
}

function FormulaireEvenement({ utilisateur, ouvert, fermer, apresCreation }) {
  const dialogue = useRef(null)
  const persos = useContext(ContextePersos)
  const [champs, setChamps] = useState(() => {
    const profil = lireProfil()
    return {
      ...EVENEMENT_VIDE,
      debut: departParDefautEvenement(),
      ...(profil.faction ? { faction: profil.faction } : {}),
      ...(profil.region ? { region: profil.region } : {}),
      ...(profil.ruleset ? { ruleset: profil.ruleset } : {}),
      ...(profil.langue ? { langue: profil.langue } : {}),
      ...(profil.perso ? { perso: profil.perso } : {}),
      ...(profil.guilde ? { guilde: profil.guilde } : {}),
    }
  })
  const [erreurs, setErreurs] = useState({})
  const [envoi, setEnvoi] = useState(false)
  const [erreurServeur, setErreurServeur] = useState('')
  const avecPersos = !!persos && persos.length > 0

  useEffect(() => {
    const d = dialogue.current
    if (!d) return
    if (ouvert && !d.open) d.showModal()
    if (!ouvert && d.open) d.close()
  }, [ouvert])

  useEffect(() => {
    if (utilisateur?.contact) setChamps((c) => (c.contact ? c : { ...c, contact: utilisateur.contact }))
  }, [utilisateur])

  // Avec des personnages enregistrés: l'événement se publie avec l'un d'eux (faction, région et type de serveur suivent).
  useEffect(() => {
    if (!avecPersos) return
    setChamps((c) => {
      const choisi = persos.find((p) => p.perso === c.perso) ?? persos[0]
      return choisi.perso === c.perso && choisi.faction === c.faction && choisi.region === c.region && choisi.ruleset === c.ruleset
        ? c
        : { ...c, perso: choisi.perso, faction: choisi.faction, region: choisi.region, ruleset: choisi.ruleset }
    })
  }, [avecPersos, persos])

  const maj = (cle, valeur) => {
    setChamps((c) => ({ ...c, [cle]: valeur }))
    setErreurs((e) => (e[cle] ? { ...e, [cle]: undefined } : e))
  }

  const choisirPerso = (nom) => {
    const p = persos.find((x) => x.perso === nom)
    if (p) setChamps((c) => ({ ...c, perso: p.perso, faction: p.faction, region: p.region, ruleset: p.ruleset }))
  }

  const valider = () => {
    const e = {}
    const mn = Number(champs.niveau_min)
    const mx = Number(champs.niveau_max)
    const t = new Date(champs.debut).getTime()
    if (champs.titre.trim().length < 2) e.titre = 'Donne un titre à ton événement (2 lettres ou plus).'
    if (!champs.debut || Number.isNaN(t)) e.debut = 'Choisis la date et l’heure.'
    else if (t < Date.now() + 10 * 60000) e.debut = 'Le départ doit être dans au moins 10 minutes.'
    else if (t > Date.now() + 60 * 86400000) e.debut = 'Le départ doit être dans les 60 prochains jours.'
    if (!(mn >= 1 && mn <= 60)) e.niveau_min = 'Entre 1 et 60.'
    if (!(mx >= 1 && mx <= 60)) e.niveau_max = 'Entre 1 et 60.'
    else if (mx < mn) e.niveau_max = 'Au moins le niveau minimum.'
    if (champs.places !== '' && !(Number(champs.places) >= 2 && Number(champs.places) <= 40)) e.places = 'Entre 2 et 40, ou laisse vide.'
    if (!champs.perso.trim()) e.perso = 'Écris le nom de ton personnage.'
    if (adresseComplete(champs.contact).length > 80) e.contact = 'Ce lien est trop long (80 caractères au plus).'
    setErreurs(e)
    return Object.keys(e).length === 0
  }

  const envoyer = async (ev) => {
    ev.preventDefault()
    if (!valider()) return
    setEnvoi(true)
    setErreurServeur('')
    try {
      await creerEvenement({
        titre: champs.titre.trim(),
        type: champs.type,
        debut: new Date(champs.debut).toISOString(),
        faction: champs.faction,
        region: champs.region,
        ruleset: champs.ruleset,
        niveau_min: Number(champs.niveau_min),
        niveau_max: Number(champs.niveau_max),
        places: champs.places === '' ? null : Number(champs.places),
        description: champs.description.trim(),
        perso: champs.perso.trim(),
        guilde: champs.guilde.trim(),
        langue: champs.langue,
        contact: adresseComplete(champs.contact.trim()),
      })
      setChamps((c) => ({ ...EVENEMENT_VIDE, debut: departParDefautEvenement(), faction: c.faction, region: c.region, ruleset: c.ruleset, langue: c.langue, perso: c.perso, guilde: c.guilde, contact: c.contact }))
      setErreurs({})
      await apresCreation()
    } catch (e) {
      const m = e?.message ?? ''
      setErreurServeur(
        compteSuspendu(e)
          ? MESSAGE_COMPTE_SUSPENDU
          : /trop d/i.test(m)
            ? 'Tu as déjà 3 événements à venir. Annule-en un ou attends qu’il passe.'
            : /date/i.test(m)
              ? 'La date doit être dans au moins 10 minutes et au plus 60 jours.'
              : /personnage/i.test(m)
                ? 'Aucun de tes personnages ne correspond à cet événement (faction, région et type de serveur).'
                : "L'événement n'a pas été publié. Réessaie dans un instant.",
      )
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
      aria-labelledby="titre-evenement"
    >
      {utilisateur && (
        <form onSubmit={envoyer} noValidate>
          <div className="dialogue-haut">
            <h2 id="titre-evenement">Organiser un événement</h2>
            <button type="button" className="bouton petit" onClick={fermer}>Fermer</button>
          </div>

          <label className="champ">
            <span>Titre</span>
            <input type="text" maxLength={60} autoComplete="off" value={champs.titre} onChange={(e) => maj('titre', e.target.value)} aria-invalid={!!erreurs.titre} placeholder="Ex.: Raid de guilde, soirée donjons" />
            {erreur('titre')}
          </label>

          <div className="deux">
            <label className="champ">
              <span>Type</span>
              <select value={champs.type} onChange={(e) => maj('type', e.target.value)}>
                {TYPES_EVENEMENT.map((t) => <option key={t.id} value={t.id}>{t.nom}</option>)}
              </select>
            </label>
            <label className="champ">
              <span>Départ (ton heure)</span>
              <input type="datetime-local" value={champs.debut} onChange={(e) => maj('debut', e.target.value)} aria-invalid={!!erreurs.debut} />
              {erreur('debut')}
            </label>
          </div>

          {avecPersos ? (
            <label className="champ">
              <span>Avec quel personnage?</span>
              <select value={champs.perso} onChange={(e) => choisirPerso(e.target.value)}>
                {persos.map((p) => (
                  <option key={p.perso} value={p.perso}>
                    {p.perso} · {nomDe(FACTIONS, p.faction)} · {nomRuleset(p.ruleset)} · {p.region}
                  </option>
                ))}
              </select>
              <small className="aide">L'événement prend la faction, la région et le type de serveur de ce personnage.</small>
            </label>
          ) : (
            <>
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
                  <span>Type de serveur</span>
                  <select value={champs.ruleset} onChange={(e) => maj('ruleset', e.target.value)}>
                    {RULESETS.map((r) => <option key={r.id} value={r.id}>{r.nom}</option>)}
                  </select>
                </label>
                <label className="champ">
                  <span>Ton personnage</span>
                  <input type="text" maxLength={24} autoComplete="off" value={champs.perso} onChange={(e) => maj('perso', e.target.value)} aria-invalid={!!erreurs.perso} />
                  {erreur('perso')}
                </label>
              </div>
            </>
          )}

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

          <div className="deux">
            <label className="champ">
              <span>Nombre de places (facultatif)</span>
              <input type="number" inputMode="numeric" min="2" max="40" value={champs.places} onChange={(e) => maj('places', e.target.value)} aria-invalid={!!erreurs.places} placeholder="Illimité" />
              {erreur('places')}
            </label>
            <label className="champ">
              <span>Langue</span>
              <select value={champs.langue} onChange={(e) => maj('langue', e.target.value)}>
                {LANGUES.map((l) => <option key={l.id} value={l.id}>{l.nom}</option>)}
              </select>
            </label>
          </div>

          <label className="champ">
            <span>Guilde (facultatif)</span>
            <input type="text" maxLength={40} autoComplete="off" value={champs.guilde} onChange={(e) => maj('guilde', e.target.value)} />
          </label>

          <label className="champ">
            <span>Description (facultatif)</span>
            <textarea rows="3" maxLength={240} value={champs.description} onChange={(e) => maj('description', e.target.value)} placeholder="Ex.: rendez-vous à l'entrée, apporte tes potions." />
            <small>{champs.description.length} / 240</small>
          </label>

          <label className="champ">
            <span>Contact ou lien (facultatif)</span>
            <input type="text" maxLength={80} autoComplete="off" value={champs.contact} onChange={(e) => maj('contact', e.target.value)} aria-invalid={!!erreurs.contact} placeholder="https://discord.gg/… ou ton BattleTag" />
            {erreur('contact')}
            <small className="aide">Visible seulement pour les gens connectés.</small>
          </label>

          {modeDemo && (
            <p className="bandeau" role="note">
              Mode démo: seul ton navigateur verra cet événement.
            </p>
          )}
          {erreurServeur && <p className="erreur" role="alert">{erreurServeur}</p>}

          <button type="submit" className="bouton principal large" disabled={envoi}>
            {envoi ? 'Publication…' : 'Publier l’événement'}
          </button>
        </form>
      )}
    </dialog>
  )
}
