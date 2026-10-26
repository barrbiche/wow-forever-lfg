import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { MESSAGE_COMPTE_SUSPENDU, compteSuspendu, recommander } from './store.js'
import { activerPush, desactiverPush, etatPush, pushConfigure } from './push.js'
import {
  LONGUEUR_MESSAGE,
  LONGUEUR_MOT,
  agirDemande,
  demanderRejoindre,
  ecrireAmi,
  ecrireGroupe,
  effacerMessage,
  lireDemandesGroupe,
  lireMembres,
  lireMessagesAmi,
  lireMessagesGroupe,
  reglerComplet,
  signalerMessage,
} from './messagerie.js'
import { CLASSES, MOTIFS_MESSAGE, ROLES, STYLES, nomDe } from './data.js'
import { ChipClasse, Icone, depuis, reste } from './commun.jsx'
import { SelecteurEmojis, emoticones } from './Emojis.jsx'

// Demandes pour rejoindre, chat de groupe et chat entre amis (supabase/ameliorations8.sql).
// Le serveur décide de tout; ici on affiche, et on traduit les erreurs en phrases claires.

// Message pour l'écran, à partir de l'erreur du serveur.
export function messageMessagerie(e) {
  if (compteSuspendu(e)) return MESSAGE_COMPTE_SUSPENDU
  const t = e?.message ?? ''
  if (e?.code === '54000' || /trop|limite|plein/i.test(t)) {
    if (/plein/i.test(t) && /groupe/i.test(t)) return 'Ce groupe est plein.'
    if (/plein/i.test(t)) return 'Ce chat est plein.'
    if (/aujourd/i.test(t)) return "Tu as fait beaucoup de demandes aujourd'hui. Réessaie demain."
    if (/en attente/i.test(t)) return 'Tu as déjà 10 demandes en attente. Annule-en une avant d’en faire une autre.'
    if (/demandes/i.test(t)) return 'Ce groupe a déjà beaucoup de demandes en attente.'
    return 'Doucement: attends quelques secondes avant d’écrire un autre message.'
  }
  if (e?.code === '55000' || /complet/i.test(t)) return 'Ce groupe est complet.'
  if (/refusée/i.test(t)) return 'Ta demande a été refusée: tu ne peux pas la refaire.'
  if (/profil/i.test(t)) return 'Crée d’abord ton profil: le chef doit voir ton personnage.'
  if (/propre annonce/i.test(t)) return 'C’est ta propre annonce.'
  if (/fermé/i.test(t)) return 'Ce groupe est fermé.'
  if (/impossible/i.test(t)) return 'Ça n’a pas pu se faire avec cette personne.'
  if (/introuvable|terminé/i.test(t) || e?.code === 'P0002') return 'Cette annonce ou cette conversation n’est plus disponible.'
  return "Ça n'a pas marché. Réessaie dans un instant."
}

const heure = (iso) => new Date(iso).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })
const couleurClasse = (id) => CLASSES.find((c) => c.id === id)?.couleur

// ---------- Sur la carte d'une annonce ----------

// Remplace le contact: « Demander à rejoindre » (ou l'état de ma demande), ou, pour le chef, l'accès aux demandes.
export function ZoneRejoindre({ annonce: a, proprietaire, utilisateur, onConnexion, demande, conv, disponible, complet, ouvrirDemande, ouvrirChat, apres, annoncer }) {
  const [occupe, setOccupe] = useState(false)
  const [probleme, setProbleme] = useState('')
  const joueur = a.genre === 'joueur'

  if (disponible === false) {
    return <p className="aide rejoindre-note">Les demandes pour rejoindre arrivent bientôt sur ce site.</p>
  }

  const basculerComplet = async () => {
    setOccupe(true)
    setProbleme('')
    try {
      await reglerComplet(conv.cible, !complet)
      annoncer(complet ? 'Les demandes sont rouvertes.' : 'Groupe marqué complet: plus de nouvelles demandes.')
      await apres()
    } catch (e) {
      setProbleme(messageMessagerie(e))
    } finally {
      setOccupe(false)
    }
  }

  if (proprietaire) {
    if (!conv) return null
    return (
      <div className="rejoindre">
        <button type="button" className="bouton petit principal" onClick={() => ouvrirChat('groupe', conv.cible, 'demandes')}>
          <Icone nom="discussion" taille={15} />
          Demandes
          {conv.nb_en_attente > 0 && <span className="pastille-nombre" aria-label={`${conv.nb_en_attente} en attente`}>{conv.nb_en_attente}</span>}
        </button>
        <button type="button" className="bouton petit" onClick={() => ouvrirChat('groupe', conv.cible)}>
          Ouvrir le chat
        </button>
        {!joueur && (
          <button type="button" className="bouton petit" onClick={basculerComplet} disabled={occupe} aria-pressed={!!complet}>
            {complet ? 'Rouvrir les demandes' : 'Groupe complet'}
          </button>
        )}
        <span className="aide rejoindre-note">Ton contact reste caché jusqu’à ce que tu acceptes quelqu’un.</span>
        {probleme && <p className="msg-erreur" role="alert">{probleme}</p>}
      </div>
    )
  }

  const annuler = async () => {
    setOccupe(true)
    setProbleme('')
    try {
      await agirDemande(demande.id, 'annuler')
      annoncer(joueur ? 'Proposition annulée.' : 'Demande annulée.')
      await apres()
    } catch (e) {
      setProbleme(messageMessagerie(e))
    } finally {
      setOccupe(false)
    }
  }

  const statut = demande?.statut
  return (
    <div className="rejoindre">
      {!statut && complet && (
        <>
          <span className="ami-etat attente">Groupe complet</span>
          <span className="aide rejoindre-note">Le chef ne prend plus de demandes pour le moment.</span>
        </>
      )}
      {!statut && !complet && (
        <>
          <button type="button" className="bouton petit principal" onClick={() => (utilisateur ? ouvrirDemande(a) : onConnexion())}>
            <Icone nom="discussion" taille={15} />
            {joueur ? 'Proposer un groupe' : 'Demander à rejoindre'}
          </button>
          <span className="aide rejoindre-note">
            {joueur ? 'Le joueur te répond ici.' : 'Le chef accepte ou refuse. Son contact t’est donné s’il t’accepte.'}
          </span>
        </>
      )}
      {statut === 'en_attente' && (
        <>
          <span className="ami-etat attente">{joueur ? 'Proposition envoyée' : 'Demande envoyée'}</span>
          <button type="button" className="lien" onClick={annuler} disabled={occupe}>Annuler</button>
        </>
      )}
      {statut === 'acceptee' && (
        <>
          <span className="ami-etat"><Icone nom="coche" taille={15} />{joueur ? 'Accepté' : 'Tu es dans le groupe'}</span>
          <button type="button" className="bouton petit principal" onClick={() => ouvrirChat('groupe', demande.groupe_id)}>
            Ouvrir le chat
          </button>
        </>
      )}
      {statut === 'refusee' && <span className="ami-etat attente">Demande refusée</span>}
      {statut === 'expulse' && <span className="ami-etat attente">Retiré du groupe</span>}
      {probleme && <p className="msg-erreur" role="alert">{probleme}</p>}
    </div>
  )
}

// ---------- Fenêtre « Demander à rejoindre » ----------

export function DialogueDemande({ annonce, fermer, profil, ouvrirProfil, apres, annoncer }) {
  const dialogue = useRef(null)
  const joueur = annonce?.genre === 'joueur'
  const rolesAnnonce = useMemo(() => ROLES.filter((r) => annonce?.roles?.includes(r.id)), [annonce])
  const choixRoles = !joueur ? (rolesAnnonce.length > 0 ? rolesAnnonce : ROLES) : []
  const [role, setRole] = useState('')
  const [mot, setMot] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [probleme, setProbleme] = useState('')

  useEffect(() => {
    const d = dialogue.current
    if (!d) return
    if (annonce && !d.open) {
      const prefere = (profil?.roles ?? []).find((r) => choixRoles.some((c) => c.id === r))
      setRole(prefere ?? '')
      setMot('')
      setProbleme('')
      d.showModal()
    }
    if (!annonce && d.open) d.close()
  }, [annonce]) // eslint-disable-line react-hooks/exhaustive-deps

  const envoyer = async (e) => {
    e.preventDefault()
    if (!joueur && !role) {
      setProbleme('Choisis le rôle que tu veux jouer.')
      return
    }
    setEnvoi(true)
    setProbleme('')
    try {
      await demanderRejoindre(annonce, joueur ? null : role, mot)
      annoncer(joueur ? 'Proposition envoyée.' : 'Demande envoyée. Le chef va répondre ici.')
      fermer()
      await apres()
    } catch (err) {
      setProbleme(messageMessagerie(err))
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <dialog
      ref={dialogue}
      className="dialogue"
      onClose={fermer}
      onClick={(e) => e.target === dialogue.current && fermer()}
      aria-labelledby="titre-demande"
    >
      {annonce && (
        <form className="dialogue-contenu" onSubmit={envoyer}>
          <div className="dialogue-haut">
            <h2 id="titre-demande">{joueur ? `Proposer un groupe à ${annonce.perso}` : `Rejoindre le groupe de ${annonce.perso}`}</h2>
            <button type="button" className="bouton petit" onClick={fermer}>Annuler</button>
          </div>
          <p className="aide">
            <strong>{annonce.cible}</strong> · niveaux {annonce.niveau_min === annonce.niveau_max ? annonce.niveau_min : `${annonce.niveau_min} à ${annonce.niveau_max}`}
          </p>

          {!profil ? (
            <div className="recommandation">
              <p className="aide">Crée d’abord ton profil: {joueur ? 'le joueur' : 'le chef'} verra ton personnage (nom, classe, niveau) avant de répondre.</p>
              <div className="signalement-actions">
                <button type="button" className="bouton petit principal" onClick={() => { fermer(); ouvrirProfil() }}>Créer mon profil</button>
              </div>
            </div>
          ) : (
            <>
              <p className="aide">
                {joueur ? 'Il' : 'Le chef'} verra : <strong>{profil.perso}</strong>
                {profil.classe ? `, ${nomDe(CLASSES, profil.classe).toLowerCase()}` : ''}
                {profil.niveau ? `, niveau ${profil.niveau}` : ''}. Ton courriel et ton nom Google ne sont jamais montrés.
              </p>
              {!joueur && (
                <fieldset className="champ groupe-choix">
                  <legend>Ton rôle</legend>
                  <div className="pastilles">
                    {choixRoles.map((r) => (
                      <button key={r.id} type="button" className="pastille" aria-pressed={role === r.id} onClick={() => setRole(r.id)}>
                        <Icone nom={r.id} taille={15} /> {r.nom}
                      </button>
                    ))}
                  </div>
                </fieldset>
              )}
              <label className="champ">
                <span>Un petit mot (facultatif)</span>
                <textarea
                  rows={3}
                  maxLength={LONGUEUR_MOT}
                  value={mot}
                  onChange={(e) => setMot(e.target.value)}
                  placeholder={joueur ? 'Ex.: On cherche un tank pour ce soir, vers 20 h.' : 'Ex.: Je suis dispo tout de suite, j’ai déjà fait ce donjon.'}
                />
                <small className="compteur">{mot.length} / {LONGUEUR_MOT}</small>
              </label>
              {probleme && <p className="msg-erreur" role="alert">{probleme}</p>}
              <div className="dialogue-actions">
                <button type="submit" className="bouton principal" disabled={envoi}>
                  {envoi ? 'Envoi…' : joueur ? 'Envoyer la proposition' : 'Envoyer la demande'}
                </button>
              </div>
            </>
          )}
        </form>
      )}
    </dialog>
  )
}

// ---------- Le chef: les demandes d'un groupe ----------

const NOM_STATUT = { en_attente: 'En attente', acceptee: 'Acceptés', refusee: 'Refusés' }

function PanneauDemandes({ groupe, genre, apres, annoncer }) {
  const [demandes, setDemandes] = useState(null)
  const [erreur, setErreur] = useState('')
  const [occupe, setOccupe] = useState(false)
  const [statut, setStatut] = useState('en_attente')
  const [role, setRole] = useState('')
  const [classe, setClasse] = useState('')
  const joueur = genre === 'joueur'

  const charger = useCallback(async () => {
    try {
      setDemandes(await lireDemandesGroupe(groupe))
      setErreur('')
    } catch (e) {
      setErreur(messageMessagerie(e))
    }
  }, [groupe])

  useEffect(() => {
    charger()
    const minuterie = setInterval(() => !document.hidden && charger(), 8000)
    return () => clearInterval(minuterie)
  }, [charger])

  const agir = async (d, action) => {
    setOccupe(true)
    setErreur('')
    try {
      await agirDemande(d.id, action)
      annoncer(
        { accepter: `${d.perso} est dans le groupe.`, refuser: 'Demande refusée. Personne n’est averti.', expulser: `${d.perso} est retiré du groupe.` }[action],
      )
      await Promise.all([charger(), apres()])
    } catch (e) {
      setErreur(messageMessagerie(e))
    } finally {
      setOccupe(false)
    }
  }

  const compte = (s) => (demandes ?? []).filter((d) => d.statut === s).length
  const visibles = (demandes ?? []).filter(
    (d) => d.statut === statut && (!role || d.role === role || (!d.role && d.roles?.includes(role))) && (!classe || d.classe === classe),
  )
  const classesPresentes = [...new Set((demandes ?? []).filter((d) => d.statut === statut).map((d) => d.classe).filter(Boolean))]

  return (
    <section className="msg-panneau" aria-label="Demandes pour rejoindre">
      <div className="msg-panneau-haut">
        <h4>{joueur ? 'Propositions reçues' : 'Demandes pour rejoindre'}</h4>
      </div>
      <div className="pastilles" role="group" aria-label="Filtrer par état">
        {Object.entries(NOM_STATUT).map(([id, nom]) => (
          <button key={id} type="button" className="pastille" aria-pressed={statut === id} onClick={() => setStatut(id)}>
            {nom} ({compte(id)})
          </button>
        ))}
      </div>
      {!joueur && (
        <div className="msg-filtres">
          <div className="pastilles" role="group" aria-label="Filtrer par rôle">
            {ROLES.map((r) => (
              <button key={r.id} type="button" className="pastille" aria-pressed={role === r.id} onClick={() => setRole(role === r.id ? '' : r.id)}>
                <Icone nom={r.id} taille={14} /> {r.nom}
              </button>
            ))}
          </div>
          {classesPresentes.length > 1 && (
            <label className="champ champ-court">
              <span className="sr">Classe</span>
              <select value={classe} onChange={(e) => setClasse(e.target.value)}>
                <option value="">Toutes les classes</option>
                {classesPresentes.map((c) => <option key={c} value={c}>{nomDe(CLASSES, c)}</option>)}
              </select>
            </label>
          )}
        </div>
      )}
      {erreur && <p className="msg-erreur" role="alert">{erreur}</p>}
      {!demandes && !erreur && <p className="aide" role="status">Chargement…</p>}
      {demandes && visibles.length === 0 && (
        <p className="aide">
          {statut === 'en_attente'
            ? joueur ? 'Aucune proposition pour l’instant.' : 'Aucune demande en attente pour l’instant. Elles apparaissent ici dès que quelqu’un en fait une.'
            : 'Rien ici pour l’instant.'}
        </p>
      )}
      <ul className="msg-demandes">
        {visibles.map((d) => (
          <li key={d.id} className="msg-demande">
            <div className="msg-demande-haut">
              <strong>{d.perso}</strong>
              <ul className="infos">
                {d.niveau && <li className="chip">Niveau {d.niveau}</li>}
                <ChipClasse classe={d.classe} specialisation={d.specialisation} />
                {d.role && (
                  <li className={`role ${d.role}`}><Icone nom={d.role} taille={14} />{nomDe(ROLES, d.role)}</li>
                )}
              </ul>
              <span className="depuis">{depuis(d.created_at)}</span>
            </div>
            <p className="msg-demande-infos">
              {[d.guilde && `Guilde ${d.guilde}`, nomDe(STYLES, d.style), d.langue === 'en' ? 'English' : 'Français'].filter(Boolean).join(' · ')}
              {d.roles?.length > 0 && !d.role ? ` · joue ${d.roles.map((r) => nomDe(ROLES, r)).join(', ')}` : ''}
            </p>
            {d.message && <p className="note">« {d.message} »</p>}
            <div className="joueur-actions">
              {d.statut !== 'acceptee' && (
                <button type="button" className="bouton petit principal" disabled={occupe} onClick={() => agir(d, 'accepter')}>
                  <Icone nom="coche" taille={15} /> Accepter
                </button>
              )}
              {d.statut === 'en_attente' && (
                <button type="button" className="bouton petit" disabled={occupe} onClick={() => agir(d, 'refuser')}>Refuser</button>
              )}
              {d.statut === 'acceptee' && (
                <button type="button" className="bouton petit danger" disabled={occupe} onClick={() => agir(d, 'expulser')}>Retirer du groupe</button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

// ---------- Les membres d'un groupe ----------

function PanneauMembres({ groupe }) {
  const [membres, setMembres] = useState(null)
  useEffect(() => {
    let actif = true
    lireMembres(groupe).then((m) => actif && setMembres(m)).catch(() => actif && setMembres([]))
    return () => {
      actif = false
    }
  }, [groupe])
  return (
    <section className="msg-panneau" aria-label="Membres du groupe">
      <div className="msg-panneau-haut"><h4>Membres</h4></div>
      {!membres ? (
        <p className="aide" role="status">Chargement…</p>
      ) : (
        <ul className="msg-membres">
          {membres.map((m) => (
            <li key={m.user_id}>
              <strong>{m.perso}</strong>
              <ul className="infos">
                {m.est_chef && <li className="chip fort">Chef</li>}
                {m.niveau && <li className="chip">Niveau {m.niveau}</li>}
                <ChipClasse classe={m.classe} specialisation={m.specialisation} />
                {m.role && <li className={`role ${m.role}`}><Icone nom={m.role} taille={14} />{nomDe(ROLES, m.role)}</li>}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

// ---------- Un message ----------

const TEXTE_SYSTEME = { rejoint: 'a rejoint le groupe.', quitte: 'a quitté le groupe.', expulse: 'a été retiré du groupe.' }

function SignalerMessage({ type, id, fermer, annoncer }) {
  const [motif, setMotif] = useState(MOTIFS_MESSAGE[0].id)
  const [envoi, setEnvoi] = useState(false)
  const [probleme, setProbleme] = useState('')
  const envoyer = async (e) => {
    e.preventDefault()
    setEnvoi(true)
    setProbleme('')
    try {
      await signalerMessage(type, id, motif)
      annoncer('Merci, ton signalement est envoyé. Trois signalements masquent le message.')
      fermer()
    } catch (err) {
      setProbleme(err?.code === '54000' ? "Tu as déjà fait beaucoup de signalements aujourd'hui. Réessaie demain." : "Le signalement n'a pas été envoyé. Réessaie.")
      setEnvoi(false)
    }
  }
  return (
    <form className="signalement" onSubmit={envoyer}>
      <label className="champ">
        <span>Pourquoi signaler ce message?</span>
        <select value={motif} onChange={(e) => setMotif(e.target.value)}>
          {MOTIFS_MESSAGE.map((m) => <option key={m.id} value={m.id}>{m.nom}</option>)}
        </select>
      </label>
      <div className="signalement-actions">
        <button type="submit" className="bouton petit danger" disabled={envoi}>Envoyer</button>
        <button type="button" className="bouton petit" onClick={fermer}>Annuler</button>
      </div>
      {probleme && <p className="msg-erreur" role="alert">{probleme}</p>}
    </form>
  )
}

function Message({ m, type, supprimer, annoncer }) {
  const [signalement, setSignalement] = useState(false)
  // Les messages d'amis n'ont pas de « genre »: sans genre, c'est un message normal.
  if (m.genre && m.genre !== 'texte') {
    return (
      <li className="msg-systeme">
        <time className="msg-heure" dateTime={m.created_at}>{heure(m.created_at)}</time>
        <span><strong>{m.perso}</strong> {TEXTE_SYSTEME[m.genre]}</span>
      </li>
    )
  }
  return (
    <li className={`msg${m.moi ? ' moi' : ''}${m.masque ? ' masque' : ''}`}>
      <time className="msg-heure" dateTime={m.created_at}>{heure(m.created_at)}</time>
      <span className="msg-ligne">
        <strong style={{ '--classe': couleurClasse(m.classe) }} className="msg-auteur">{m.moi ? 'Toi' : m.perso}</strong>
        <span aria-hidden="true">: </span>
        {m.masque ? (
          <span className="msg-texte">Message masqué: il a été signalé et il est en vérification.</span>
        ) : (
          <span className="msg-texte">{m.texte}</span>
        )}
      </span>
      {!m.masque && (
        <span className="msg-outils">
          {m.moi ? (
            <button type="button" className="lien signaler" onClick={() => supprimer(m)}>Effacer</button>
          ) : (
            !signalement && <button type="button" className="lien signaler" onClick={() => setSignalement(true)}>Signaler</button>
          )}
        </span>
      )}
      {signalement && <SignalerMessage type={type} id={m.id} fermer={() => setSignalement(false)} annoncer={annoncer} />}
    </li>
  )
}

// Heure du message (« 16 h 20 ») et séparateur de jour (« Aujourd'hui », « Hier », « 24 octobre »).
const cleJour = (iso) => new Date(iso).toLocaleDateString('fr-CA')
function nomJour(iso) {
  const d = new Date(iso)
  const jour = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const ecart = Math.round((jour(new Date()) - jour(d)) / 86400000)
  if (ecart === 0) return "Aujourd'hui"
  if (ecart === 1) return 'Hier'
  return d.toLocaleDateString('fr-CA', { day: 'numeric', month: 'long' })
}

// ---------- Le fil de messages (groupe ou ami) ----------

function Fil({ type, cible, lire, ecrire, peutEcrire, raison, apresLecture, annoncer, version }) {
  const [messages, setMessages] = useState([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState('')
  const [texte, setTexte] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [probleme, setProbleme] = useState('')
  const dernierRef = useRef(0)
  const defilRef = useRef(null)
  const zoneRef = useRef(null)
  const toutBasRef = useRef(true)
  const tourRef = useRef(0)
  const lireRef = useRef(lire)
  const apresRef = useRef(apresLecture)
  useEffect(() => {
    lireRef.current = lire
    apresRef.current = apresLecture
  })

  const fusionner = (anciens, nouveaux) => {
    const par = new Map(anciens.map((m) => [m.id, m]))
    nouveaux.forEach((m) => par.set(m.id, m))
    return [...par.values()].sort((a, b) => a.id - b.id)
  }

  // Toutes les 4 secondes: les nouveaux messages. Toutes les 20 secondes: tout relire (messages effacés ou masqués).
  const tick = useCallback(async (complet) => {
    try {
      const nouveaux = await lireRef.current(complet ? 0 : dernierRef.current)
      if (complet) {
        setMessages(nouveaux)
        dernierRef.current = nouveaux.reduce((x, m) => Math.max(x, m.id), 0)
      } else if (nouveaux.length) {
        setMessages((anciens) => fusionner(anciens, nouveaux))
        dernierRef.current = nouveaux.reduce((x, m) => Math.max(x, m.id), dernierRef.current)
      }
      setErreur('')
      if (complet || nouveaux.length) apresRef.current?.()
    } catch (e) {
      setErreur(messageMessagerie(e))
    } finally {
      setChargement(false)
    }
  }, [])

  useEffect(() => {
    setMessages([])
    setChargement(true)
    setErreur('')
    setTexte('')
    setProbleme('')
    dernierRef.current = 0
    tourRef.current = 0
    toutBasRef.current = true
    tick(true)
    const minuterie = setInterval(() => {
      if (document.hidden) return
      tourRef.current += 1
      tick(tourRef.current % 5 === 0)
    }, 4000)
    return () => clearInterval(minuterie)
  }, [type, cible, tick])

  // Le chef vient d'accepter ou de retirer quelqu'un: les messages « a rejoint le groupe » arrivent tout de suite.
  useEffect(() => {
    if (version) tick(false)
  }, [version, tick])

  // On reste en bas quand on y était déjà (ou qu'on vient d'écrire).
  useLayoutEffect(() => {
    const el = defilRef.current
    if (el && toutBasRef.current) el.scrollTop = el.scrollHeight
  }, [messages])

  const suivreDefilement = () => {
    const el = defilRef.current
    if (el) toutBasRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
  }

  const envoyer = async (e) => {
    e?.preventDefault()
    const t = emoticones(texte.trim())
    if (!t || envoi) return
    setEnvoi(true)
    setProbleme('')
    try {
      await ecrire(t)
      setTexte('')
      toutBasRef.current = true
      await tick(false)
    } catch (err) {
      setProbleme(messageMessagerie(err))
    } finally {
      setEnvoi(false)
    }
  }

  const supprimer = async (m) => {
    try {
      await effacerMessage(type, m.id)
      setMessages((anciens) => anciens.filter((x) => x.id !== m.id))
    } catch {
      annoncer("Le message n'a pas pu être effacé. Réessaie.")
    }
  }

  // Insère l'émoticône là où est le curseur, puis remet le curseur juste après.
  const ajouterEmoji = (emoji) => {
    const z = zoneRef.current
    const debut = z ? z.selectionStart : texte.length
    const fin = z ? z.selectionEnd : texte.length
    const suite = (texte.slice(0, debut) + emoji + texte.slice(fin)).slice(0, LONGUEUR_MESSAGE)
    setTexte(suite)
    requestAnimationFrame(() => {
      if (!z) return
      z.focus()
      const pos = Math.min(debut + emoji.length, suite.length)
      z.setSelectionRange(pos, pos)
    })
  }

  const touche = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      envoyer()
    }
  }

  return (
    <div className="msg-fil-corps" data-canal={type}>
      <div className="msg-defil" ref={defilRef} onScroll={suivreDefilement} tabIndex={0} aria-label="Messages" role="log" aria-live="polite">
        {chargement && <p className="aide" role="status">Chargement des messages…</p>}
        {erreur && <p className="msg-erreur" role="alert">{erreur}</p>}
        {!chargement && !erreur && messages.length === 0 && (
          <p className="aide msg-vide">Aucun message pour l’instant. Dis bonjour!</p>
        )}
        <ul className="msg-liste-messages">
          {messages.map((m, i) => (
            <Fragment key={m.id}>
              {(i === 0 || cleJour(m.created_at) !== cleJour(messages[i - 1].created_at)) && (
                <li className="msg-jour" aria-hidden="true"><span>{nomJour(m.created_at)}</span></li>
              )}
              <Message m={m} type={type} supprimer={supprimer} annoncer={annoncer} />
            </Fragment>
          ))}
        </ul>
      </div>
      {peutEcrire ? (
        <form className="msg-composer" onSubmit={envoyer}>
          <label className="sr" htmlFor="msg-texte">Ton message</label>
          <textarea
            id="msg-texte"
            ref={zoneRef}
            rows={2}
            maxLength={LONGUEUR_MESSAGE}
            value={texte}
            onChange={(e) => setTexte(e.target.value)}
            onKeyDown={touche}
            placeholder="Écris ton message… (Entrée pour envoyer)"
            autoComplete="off"
          />
          <div className="msg-composer-actions">
            <SelecteurEmojis choisir={ajouterEmoji} />
            <button type="submit" className="bouton principal" disabled={envoi || !texte.trim()}>Envoyer</button>
          </div>
          {texte.length > LONGUEUR_MESSAGE - 100 && <small className="compteur">{texte.length} / {LONGUEUR_MESSAGE}</small>}
          {probleme && <p className="msg-erreur" role="alert">{probleme}</p>}
        </form>
      ) : (
        <p className="aide msg-ferme">{raison}</p>
      )}
    </div>
  )
}

// ---------- Une conversation de groupe ----------

// Après la fin de l'annonce: un pouce pour ceux avec qui ça a bien été (pouces de réputation de la page Joueurs).
function PoucesFin({ conv, moi }) {
  const cle = `forever-pouces-${conv.cible}`
  const [membres, setMembres] = useState(null)
  const [donnes, setDonnes] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(cle) || '[]')
    } catch {
      return []
    }
  })
  const [occupe, setOccupe] = useState('')
  const [probleme, setProbleme] = useState('')

  useEffect(() => {
    let actif = true
    lireMembres(conv.cible).then((m) => actif && setMembres(m)).catch(() => actif && setMembres([]))
    return () => {
      actif = false
    }
  }, [conv.cible])

  const autres = (membres ?? []).filter((m) => m.user_id !== moi)
  if (autres.length === 0) return null

  const donner = async (m) => {
    setOccupe(m.user_id)
    setProbleme('')
    try {
      await recommander(m.user_id, [])
      const suite = [...donnes, m.user_id]
      setDonnes(suite)
      try {
        localStorage.setItem(cle, JSON.stringify(suite))
      } catch {
        // pas grave: le bouton redevient disponible au prochain chargement
      }
    } catch (e) {
      setProbleme(
        e?.code === '54000'
          ? "Tu as donné beaucoup de pouces aujourd'hui. Réessaie demain."
          : e?.code === '22023'
            ? "Crée d'abord ton profil pour donner un pouce."
            : "Le pouce n'a pas été enregistré. Réessaie dans un instant.",
      )
    } finally {
      setOccupe('')
    }
  }

  return (
    <section className="recommandation pouces-fin" aria-label="Pouces de fin de soirée">
      <p><strong>L’annonce est terminée.</strong> Donne un pouce à ceux avec qui ça a bien été: ça aide les autres à les choisir.</p>
      <ul className="msg-membres">
        {autres.map((m) => (
          <li key={m.user_id}>
            <strong>{m.perso}</strong>
            <ul className="infos"><ChipClasse classe={m.classe} specialisation={m.specialisation} /></ul>
            {donnes.includes(m.user_id) ? (
              <span className="ami-etat"><Icone nom="coche" taille={15} />Pouce donné</span>
            ) : (
              <button type="button" className="bouton petit" disabled={occupe === m.user_id} onClick={() => donner(m)}>
                <Icone nom="pouce" taille={15} />
                Donner un pouce
              </button>
            )}
          </li>
        ))}
      </ul>
      {probleme && <p className="msg-erreur" role="alert">{probleme}</p>}
    </section>
  )
}

function ConversationGroupe({ conv, demandeId, panneauDepart, moi, retour, apres, annoncer }) {
  const [panneau, setPanneau] = useState(panneauDepart ?? '')
  const [copie, setCopie] = useState(false)
  const [quitter, setQuitter] = useState(false)
  const [occupe, setOccupe] = useState(false)
  const [probleme, setProbleme] = useState('')
  const [version, setVersion] = useState(0)
  const chef = conv.est_chef
  const apresDecision = async () => {
    setVersion((v) => v + 1)
    await apres()
  }

  useEffect(() => {
    setPanneau(panneauDepart ?? '')
    setQuitter(false)
  }, [conv.cible, panneauDepart])

  const copier = async () => {
    try {
      await navigator.clipboard.writeText(conv.contact)
      setCopie(true)
      setTimeout(() => setCopie(false), 2000)
    } catch {
      // le contact reste visible: on peut le sélectionner à la main
    }
  }

  const quitterGroupe = async () => {
    setOccupe(true)
    setProbleme('')
    try {
      await agirDemande(demandeId, 'quitter')
      annoncer('Tu as quitté le groupe.')
      retour()
      await apres()
    } catch (e) {
      setProbleme(messageMessagerie(e))
    } finally {
      setOccupe(false)
    }
  }

  const termine = conv.fin_le && new Date(conv.fin_le).getTime() <= Date.now()
  const basculer = (nom) => setPanneau((p) => (p === nom ? '' : nom))
  return (
    <section className="msg-fil" aria-label={`Conversation: ${conv.titre}`}>
      <header className="msg-fil-haut">
        <button type="button" className="bouton petit msg-retour" onClick={retour}>← Retour</button>
        <div className="msg-fil-titre">
          <h3>{conv.titre}</h3>
          <p className="aide">
            {chef ? 'Ton groupe' : conv.sous_titre} · {conv.nb_membres} {conv.nb_membres > 1 ? 'joueurs' : 'joueur'}
          </p>
        </div>
        <div className="msg-fil-actions">
          {chef && (
            <button type="button" className="bouton petit" aria-pressed={panneau === 'demandes'} onClick={() => basculer('demandes')}>
              Demandes
              {conv.nb_en_attente > 0 && <span className="pastille-nombre" aria-label={`${conv.nb_en_attente} en attente`}>{conv.nb_en_attente}</span>}
            </button>
          )}
          <button type="button" className="bouton petit" aria-pressed={panneau === 'membres'} onClick={() => basculer('membres')}>Membres</button>
          {!chef && demandeId && !quitter && (
            <button type="button" className="lien signaler" onClick={() => setQuitter(true)}>Quitter</button>
          )}
        </div>
      </header>

      {quitter && (
        <div className="recommandation">
          <p className="aide">Quitter ce groupe? Tu ne pourras plus lire ni écrire dans le chat. Tu pourras redemander à rejoindre.</p>
          <div className="signalement-actions">
            <button type="button" className="bouton petit danger" disabled={occupe} onClick={quitterGroupe}>Quitter le groupe</button>
            <button type="button" className="bouton petit" onClick={() => setQuitter(false)}>Rester</button>
          </div>
          {probleme && <p className="msg-erreur" role="alert">{probleme}</p>}
        </div>
      )}

      {conv.contact && (
        <p className="msg-contact">
          <span>{chef ? 'Ton contact, vu seulement par les joueurs acceptés:' : 'Contact du chef:'}</span>
          <code>{conv.contact}</code>
          {!chef && <button type="button" className="bouton petit" onClick={copier}>{copie ? 'Copié' : 'Copier'}</button>}
        </p>
      )}

      {panneau === 'demandes' && chef && (
        <PanneauDemandes groupe={conv.cible} genre="groupe" apres={apresDecision} annoncer={annoncer} />
      )}
      {panneau === 'membres' && <PanneauMembres groupe={conv.cible} />}
      {termine && !conv.ferme && <PoucesFin conv={conv} moi={moi} />}

      <p className="aide msg-duree">
        {termine
          ? `L’annonce est terminée. Ce chat sera effacé dans ${reste(new Date(new Date(conv.fin_le).getTime() + 24 * 3600000).toISOString())}.`
          : 'Ce chat est effacé 24 h après la fin de l’annonce.'}
      </p>

      <Fil
        type="groupe"
        cible={conv.cible}
        lire={(apresId) => lireMessagesGroupe(conv.cible, apresId)}
        ecrire={(t) => ecrireGroupe(conv.cible, t)}
        peutEcrire={!conv.ferme}
        raison="Ce groupe a été fermé par la modération. Tu peux relire les messages."
        apresLecture={apres}
        annoncer={annoncer}
        version={version}
      />
    </section>
  )
}

// ---------- Une conversation avec un ami ----------

function ConversationAmi({ conv, retour, apres, annoncer }) {
  return (
    <section className="msg-fil" aria-label={`Conversation avec ${conv.titre}`}>
      <header className="msg-fil-haut">
        <button type="button" className="bouton petit msg-retour" onClick={retour}>← Retour</button>
        <div className="msg-fil-titre">
          <h3>{conv.titre}</h3>
          <ul className="infos"><li className="chip"><Icone nom="coche" taille={13} />Ami</li><ChipClasse classe={conv.classe} /></ul>
        </div>
      </header>
      <p className="aide msg-duree">Conversation privée entre vous deux. Les messages sont effacés après 30 jours.</p>
      <Fil
        type="ami"
        cible={conv.cible}
        lire={(apresId) => lireMessagesAmi(conv.cible, apresId)}
        ecrire={(t) => ecrireAmi(conv.cible, t)}
        peutEcrire
        raison=""
        apresLecture={apres}
        annoncer={annoncer}
      />
    </section>
  )
}

// ---------- L'onglet « Messages » ----------

// ---------- Alertes sur cet appareil (notifications push) ----------

function AlertesAppareil({ utilisateur }) {
  const [etat, setEtat] = useState(null) // null: pas encore lu
  const [occupe, setOccupe] = useState(false)
  const [probleme, setProbleme] = useState('')

  useEffect(() => {
    let actif = true
    if (pushConfigure && utilisateur) etatPush(utilisateur.id).then((e) => actif && setEtat(e))
    return () => {
      actif = false
    }
  }, [utilisateur])

  if (!pushConfigure || !utilisateur || !etat) return null

  const changer = async () => {
    setOccupe(true)
    setProbleme('')
    try {
      if (etat.actif) await desactiverPush()
      else await activerPush(utilisateur.id)
      setEtat(await etatPush(utilisateur.id))
    } catch (e) {
      setProbleme(
        e?.code === 'refuse'
          ? 'Les alertes sont refusées. Autorise-les dans les réglages du site de ton navigateur, puis réessaie.'
          : 'Les alertes n’ont pas pu être changées. Réessaie dans un instant.',
      )
      setEtat(await etatPush(utilisateur.id))
    } finally {
      setOccupe(false)
    }
  }

  return (
    <div className="msg-alertes">
      {!etat.supporte ? (
        <p className="aide">
          Les alertes ne marchent pas dans ce navigateur. Sur iPhone et iPad, ajoute d’abord le site à ton écran d’accueil
          (Partager, puis « Sur l’écran d’accueil »), puis ouvre-le depuis l’icône.
        </p>
      ) : etat.bloque && !etat.actif ? (
        <p className="aide">Les alertes sont bloquées dans ton navigateur. Autorise-les dans les réglages du site pour les activer.</p>
      ) : (
        <>
          <button type="button" className="bouton petit" onClick={changer} disabled={occupe} aria-pressed={etat.actif}>
            <Icone nom="cloche" taille={15} />
            {etat.actif ? 'Alertes activées sur cet appareil' : 'Activer les alertes sur cet appareil'}
          </button>
          <span className="aide">
            {etat.actif
              ? 'Cliquer pour les désactiver.'
              : 'Pour savoir quand on te répond, même si le site est fermé. Le texte des messages n’est jamais envoyé.'}
          </span>
        </>
      )}
      {probleme && <p className="msg-erreur" role="alert">{probleme}</p>}
    </div>
  )
}

export function SectionMessages({ utilisateur, onConnexion, conversations, demandes, amis, cible, apres, annoncer }) {
  const [choix, setChoix] = useState(null) // { type, id, panneau }
  const [ami, setAmi] = useState(null) // ami choisi sans conversation encore

  useEffect(() => {
    if (cible) {
      setChoix({ type: cible.type, id: cible.id, panneau: cible.panneau })
      setAmi(cible.type === 'ami' ? cible.id : null)
    }
  }, [cible])

  if (!utilisateur) {
    return (
      <div className="vide">
        <span className="vide-icone" aria-hidden="true"><Icone nom="discussion" taille={30} /></span>
        <p>Connecte-toi pour parler avec les joueurs de ton groupe et avec tes amis.</p>
        <button type="button" className="bouton principal" onClick={onConnexion}>Se connecter</button>
      </div>
    )
  }
  if (conversations === null) {
    return (
      <div className="vide">
        <span className="vide-icone" aria-hidden="true"><Icone nom="discussion" taille={30} /></span>
        <p>La messagerie n’est pas encore activée sur ce site. Elle arrive bientôt.</p>
      </div>
    )
  }

  const groupes = conversations.filter((c) => c.type === 'groupe')
  const discussions = conversations.filter((c) => c.type === 'ami')
  const amisListe = (amis ?? []).filter((a) => a.lien === 'ami')
  const amisSansConv = amisListe.filter((a) => !discussions.some((c) => c.cible === a.user_id))

  // La conversation ouverte: celle de la liste, ou un ami sans message encore.
  let courante = choix ? conversations.find((c) => c.type === choix.type && c.cible === choix.id) : null
  if (!courante && choix?.type === 'ami') {
    const a = amisListe.find((x) => x.user_id === choix.id)
    if (a) courante = { type: 'ami', cible: a.user_id, titre: a.perso, classe: a.classe, non_lus: 0 }
  }
  const demandeCourante = courante?.type === 'groupe' ? demandes.find((d) => d.groupe_id === courante.cible && d.statut === 'acceptee') : null

  const ouvrir = (c) => {
    setChoix({ type: c.type, id: c.cible })
    setAmi(null)
  }
  const retour = () => {
    setChoix(null)
    setAmi(null)
  }

  return (
    <>
      <AlertesAppareil utilisateur={utilisateur} />
    <section className={`messagerie${courante ? ' ouverte' : ''}`} aria-label="Messages">
      <div className="msg-colonne">
        {conversations.length === 0 && amisSansConv.length === 0 && (
          <div className="vide">
            <span className="vide-icone" aria-hidden="true"><Icone nom="discussion" taille={30} /></span>
            <p>
              Pas encore de conversation. Demande à rejoindre une annonce: quand le chef t’accepte, le chat du groupe
              apparaît ici. Tu peux aussi écrire à un ami depuis l’onglet Joueurs.
            </p>
          </div>
        )}
        {groupes.length > 0 && (
          <>
            <h3 className="msg-sous-titre">Groupes</h3>
            <ul className="msg-liste">
              {groupes.map((c) => (
                <li key={c.cible}>
                  <button type="button" className="msg-conv" aria-pressed={courante?.cible === c.cible} onClick={() => ouvrir(c)}>
                    <span className="msg-conv-haut">
                      <strong>{c.titre}</strong>
                      {c.dernier_le && <span className="depuis">{depuis(c.dernier_le)}</span>}
                    </span>
                    <span className="msg-conv-bas">
                      <span className="msg-extrait">{c.extrait || c.sous_titre}</span>
                      {c.nb_en_attente > 0 && <span className="pastille-nombre" aria-label={`${c.nb_en_attente} demandes`}>{c.nb_en_attente} {c.nb_en_attente > 1 ? 'demandes' : 'demande'}</span>}
                      {c.non_lus > 0 && <span className="pastille-nombre" aria-label={`${c.non_lus} non lus`}>{c.non_lus}</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
        {discussions.length > 0 && (
          <>
            <h3 className="msg-sous-titre">Amis</h3>
            <ul className="msg-liste">
              {discussions.map((c) => (
                <li key={c.cible}>
                  <button type="button" className="msg-conv" aria-pressed={courante?.cible === c.cible} onClick={() => ouvrir(c)}>
                    <span className="msg-conv-haut">
                      <strong>{c.titre}</strong>
                      {c.dernier_le && <span className="depuis">{depuis(c.dernier_le)}</span>}
                    </span>
                    <span className="msg-conv-bas">
                      <span className="msg-extrait">{c.extrait}</span>
                      {c.non_lus > 0 && <span className="pastille-nombre" aria-label={`${c.non_lus} non lus`}>{c.non_lus}</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
        {amisSansConv.length > 0 && (
          <details className="msg-nouveau" open={!!ami}>
            <summary>Écrire à un ami</summary>
            <ul className="msg-liste">
              {amisSansConv.map((a) => (
                <li key={a.user_id}>
                  <button
                    type="button"
                    className="msg-conv"
                    aria-pressed={courante?.cible === a.user_id}
                    onClick={() => ouvrir({ type: 'ami', cible: a.user_id })}
                  >
                    <span className="msg-conv-haut"><strong>{a.perso}</strong></span>
                  </button>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>

      <div className="msg-detail">
        {courante?.type === 'groupe' && (
          <ConversationGroupe
            conv={courante}
            demandeId={demandeCourante?.id}
            panneauDepart={choix?.panneau}
            moi={utilisateur?.id}
            retour={retour}
            apres={apres}
            annoncer={annoncer}
          />
        )}
        {courante?.type === 'ami' && <ConversationAmi conv={courante} retour={retour} apres={apres} annoncer={annoncer} />}
        {!courante && (
          <p className="aide msg-choisir">Choisis une conversation dans la liste.</p>
        )}
      </div>
    </section>
    </>
  )
}
