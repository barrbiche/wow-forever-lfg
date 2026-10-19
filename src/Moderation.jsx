import { useCallback, useEffect, useRef, useState } from 'react'
import { MOTIFS_JOUEUR, MOTIFS_SIGNALEMENT } from './data.js'
import { actionModeration, lireModeration } from './store.js'
import { depuis } from './commun.jsx'

// Page réservée aux modérateurs (le lien « Modération » n'apparaît que pour eux, et chaque action est revérifiée par
// le serveur: voir supabase/ameliorations5.sql). Elle liste ce qui a été signalé, avec le contact que les visiteurs
// ne voient pas, et permet d'écarter, retirer, remettre en ligne ou suspendre un compte.

const NOM_MOTIF = Object.fromEntries([...MOTIFS_SIGNALEMENT, ...MOTIFS_JOUEUR].map((m) => [m.id, m.nom.split(' ou ')[0]]))
const NOM_TYPE = { annonce: 'Annonce', guilde: 'Guilde', joueur: 'Joueur' }

function ilYA(iso) {
  const heures = Math.round((Date.now() - new Date(iso).getTime()) / 3600000)
  if (heures >= 48) return `il y a ${Math.round(heures / 24)} jours`
  return depuis(iso)
}

const cle = (x) => `${x.type}:${x.cible_id}`

function Fiche({ element: x, occupe, suspension, ouvrirSuspension, fermerSuspension, agir }) {
  const [raison, setRaison] = useState('')
  const enSuspension = suspension === cle(x)
  const retirable = x.actif
  const remettable = !x.actif && x.type !== 'joueur'
  return (
    <article className="mod-fiche" aria-label={`${NOM_TYPE[x.type]}: ${x.titre}`}>
      <div className="mod-fiche-haut">
        <span className={`chip mod-type ${x.type}`}>{NOM_TYPE[x.type]}</span>
        <strong className="mod-titre">{x.titre}</strong>
        {!x.actif && <span className="chip mod-etat">{x.type === 'joueur' ? 'Profil caché' : 'Retiré du site'}</span>}
        {x.suspendu && <span className="chip mod-etat danger">Compte suspendu</span>}
      </div>
      <p className="mod-meta">
        <strong>{x.nb}</strong> {x.nb > 1 ? 'signalements' : 'signalement'}
        {x.motifs?.length ? `: ${x.motifs.map((m) => NOM_MOTIF[m] ?? m).join(', ').toLowerCase()}` : ''} ·{' '}
        {ilYA(x.dernier)} · personnage <strong>{x.perso}</strong>
      </p>
      {x.detail && <p className="mod-detail">« {x.detail} »</p>}
      {x.contact && (
        <p className="mod-contact">
          {x.type === 'joueur' ? 'BattleTag' : 'Contact'}: <code>{x.contact}</code>
        </p>
      )}

      {enSuspension ? (
        <div className="mod-suspension">
          <label className="champ">
            <span>Raison (facultatif, gardée dans le journal)</span>
            <input
              type="text"
              maxLength={200}
              autoComplete="off"
              value={raison}
              onChange={(e) => setRaison(e.target.value)}
              placeholder="Ex.: spam répété"
            />
          </label>
          <p className="aide">
            Ses annonces et guildes actives sont retirées, son profil est caché et il ne peut plus publier, jusqu'à ce que
            tu le rétablisses.
          </p>
          <div className="mod-actions">
            <button type="button" className="bouton petit danger" disabled={!!occupe} onClick={() => agir('suspendre', x, raison)}>
              Suspendre ce compte
            </button>
            <button type="button" className="bouton petit" onClick={fermerSuspension}>
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <div className="mod-actions">
          <button type="button" className="bouton petit" disabled={!!occupe} onClick={() => agir('ecarter', x)}>
            Écarter
          </button>
          {retirable && (
            <button type="button" className="bouton petit" disabled={!!occupe} onClick={() => agir('retirer', x)}>
              {x.type === 'joueur' ? 'Cacher le profil' : 'Retirer du site'}
            </button>
          )}
          {remettable && (
            <button type="button" className="bouton petit" disabled={!!occupe} onClick={() => agir('remettre', x)}>
              Remettre en ligne
            </button>
          )}
          {x.suspendu ? (
            <button type="button" className="bouton petit" disabled={!!occupe} onClick={() => agir('retablir', x)}>
              Rétablir le compte
            </button>
          ) : (
            <button type="button" className="bouton petit danger" disabled={!!occupe} onClick={() => ouvrirSuspension(cle(x))}>
              Suspendre le compte…
            </button>
          )}
        </div>
      )}
    </article>
  )
}

export function Moderation({ ouvert, fermer, apres, annoncer }) {
  const dialogue = useRef(null)
  const [donnees, setDonnees] = useState(null)
  const [erreur, setErreur] = useState('')
  const [occupe, setOccupe] = useState(false)
  const [suspension, setSuspension] = useState(null)

  const charger = useCallback(async () => {
    try {
      setDonnees(await lireModeration())
      setErreur('')
    } catch {
      setErreur("Impossible de charger la file de modération. Vérifie ta connexion, puis réessaie.")
    }
  }, [])

  useEffect(() => {
    const d = dialogue.current
    if (!d) return
    if (ouvert && !d.open) {
      setSuspension(null)
      setDonnees(null)
      d.showModal()
      charger()
    }
    if (!ouvert && d.open) d.close()
  }, [ouvert, charger])

  const agir = async (action, x, raison = '') => {
    setOccupe(true)
    setErreur('')
    try {
      const pourCompte = action === 'suspendre' || action === 'retablir'
      await actionModeration(action, x.type, pourCompte ? x.auteur : x.cible_id, raison.trim())
      setSuspension(null)
      annoncer(
        {
          ecarter: 'Signalements écartés.',
          retirer: x.type === 'joueur' ? 'Profil caché de la liste.' : 'Retiré du site.',
          remettre: 'Remis en ligne.',
          suspendre: 'Compte suspendu.',
          retablir: 'Compte rétabli.',
        }[action],
      )
      await Promise.all([charger(), apres()])
    } catch {
      setErreur("L'action n'a pas été faite. Réessaie dans un instant (ton accès de modérateur est revérifié à chaque fois).")
    } finally {
      setOccupe(false)
    }
  }

  const suspendus = donnees?.suspendus ?? []
  return (
    <dialog
      ref={dialogue}
      className="dialogue mod-dialogue"
      onClose={fermer}
      onClick={(e) => e.target === dialogue.current && fermer()}
      aria-labelledby="titre-moderation"
    >
      <div className="dialogue-contenu">
        <div className="dialogue-haut">
          <h2 id="titre-moderation">Modération</h2>
          <button type="button" className="bouton petit" onClick={fermer}>Fermer</button>
        </div>
        <p className="aide">
          Ce qui a été signalé, du plus signalé au moins signalé. Trois signalements de trois personnes retirent déjà une
          annonce ou une guilde d'eux-mêmes: tu peux la remettre en ligne si c'était à tort. Chaque action est notée dans le
          journal de la base de données.
        </p>
        {erreur && <p className="erreur" role="alert">{erreur}</p>}
        {!donnees && !erreur && <p className="aide" role="status">Chargement…</p>}

        {donnees && (
          <section aria-label="À traiter">
            <h3 className="mod-sous-titre">À traiter <span className="onglet-nombre">{donnees.aTraiter.length}</span></h3>
            {donnees.aTraiter.length === 0 ? (
              <p className="mod-vide">Rien à traiter pour l'instant. Aucun signalement en attente.</p>
            ) : (
              <div className="mod-liste">
                {donnees.aTraiter.map((x) => (
                  <Fiche
                    key={cle(x)}
                    element={x}
                    occupe={occupe}
                    suspension={suspension}
                    ouvrirSuspension={setSuspension}
                    fermerSuspension={() => setSuspension(null)}
                    agir={agir}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {donnees && suspendus.length > 0 && (
          <section aria-label="Comptes suspendus">
            <h3 className="mod-sous-titre">Comptes suspendus <span className="onglet-nombre">{suspendus.length}</span></h3>
            <ul className="mod-suspendus">
              {suspendus.map((s) => (
                <li key={s.user_id}>
                  <span>
                    <strong>{s.perso ?? 'Profil supprimé'}</strong>
                    {s.raison ? ` · ${s.raison}` : ''} · {ilYA(s.depuis)}
                  </span>
                  <button
                    type="button"
                    className="bouton petit"
                    disabled={occupe}
                    onClick={() => agir('retablir', { type: 'joueur', auteur: s.user_id, cible_id: s.user_id })}
                  >
                    Rétablir
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </dialog>
  )
}
