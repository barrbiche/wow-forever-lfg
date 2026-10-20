import { useState } from 'react'
import { MESSAGE_COMPTE_SUSPENDU, agirAmi, compteSuspendu } from './store.js'
import { FACTIONS, LANGUES, ROLES, STYLES, nomDe } from './data.js'
import { ChipClasse, Icone, LigneCopie, depuis, vuTexte } from './commun.jsx'

// ---------- Amis: demandes, liste, blocage (ameliorations6.sql) ----------
// Le serveur décide de tout (limites, blocage, qui voit quoi). Ici on affiche les boutons et les messages.

const MESSAGES_OK = {
  demander: 'Demande envoyée.',
  accepter: 'Vous êtes amis!',
  refuser: 'Demande refusée. Personne n’est averti.',
  annuler: 'Demande annulée.',
  retirer: 'Retiré de tes amis.',
  bloquer: 'Joueur bloqué. Tu peux le débloquer dans « Mes amis ».',
  debloquer: 'Joueur débloqué.',
}

// Message pour l'écran, à partir de l'erreur du serveur.
export function messageAmi(e, action) {
  if (compteSuspendu(e)) return MESSAGE_COMPTE_SUSPENDU
  const t = e?.message ?? ''
  if (/aujourd/i.test(t)) return "Tu as envoyé beaucoup de demandes aujourd'hui. Réessaie demain."
  if (/en attente/i.test(t)) return "Tu as trop de demandes en attente. Annule-en quelques-unes d'abord."
  if (/pleine/i.test(t)) return "Une des deux listes d'amis est pleine (100 amis au plus)."
  if (/récemment/i.test(t)) return 'Tu as déjà envoyé une demande à cette personne récemment. Réessaie dans quelques semaines.'
  if (/bloqué/i.test(t)) return "Tu as bloqué cette personne. Débloque-la d'abord."
  if (/introuvable/i.test(t)) return action === 'accepter' ? "Cette demande n'existe plus." : "Ce joueur n'est plus dans la liste."
  if (/profil/i.test(t)) return "Crée d'abord ton profil pour ajouter des amis."
  return "Ça n'a pas marché. Réessaie dans un instant."
}

// Lance une action, rafraîchit la liste et annonce le résultat. Une erreur s'affiche sous le bouton.
function useActionAmi({ apres, annoncer }) {
  const [occupe, setOccupe] = useState(false)
  const [probleme, setProbleme] = useState('')
  const lancer = async (id, action) => {
    setOccupe(true)
    setProbleme('')
    try {
      await agirAmi(id, action)
      annoncer(MESSAGES_OK[action])
      await apres()
      return true
    } catch (e) {
      setProbleme(messageAmi(e, action))
      return false
    } finally {
      setOccupe(false)
    }
  }
  return { occupe, probleme, lancer }
}

// ---------- Boutons sur la carte d'un joueur ----------

export function BoutonsAmi({ joueur: j, lien, aProfil, ouvrirProfil, apres, annoncer }) {
  const { occupe, probleme, lancer } = useActionAmi({ apres, annoncer })
  const [besoinProfil, setBesoinProfil] = useState(false)

  const demander = () => {
    if (!aProfil) {
      setBesoinProfil(true)
      return
    }
    lancer(j.user_id, 'demander')
  }

  return (
    <>
      {besoinProfil && !aProfil && (
        <div className="recommandation">
          <p className="aide">Crée d'abord ton profil pour ajouter des amis: la personne verra ton personnage.</p>
          <div className="signalement-actions">
            <button type="button" className="bouton petit principal" onClick={ouvrirProfil}>Créer mon profil</button>
            <button type="button" className="bouton petit" onClick={() => setBesoinProfil(false)}>Annuler</button>
          </div>
        </div>
      )}
      <div className="ami-actions">
        {lien === 'ami' && (
          <span className="ami-etat">
            <Icone nom="coche" taille={15} />
            Ami
          </span>
        )}
        {lien === 'envoyee' && (
          <>
            <span className="ami-etat attente">Demande envoyée</span>
            <button type="button" className="lien" onClick={() => lancer(j.user_id, 'annuler')} disabled={occupe}>
              Annuler
            </button>
          </>
        )}
        {lien === 'recue' && (
          <>
            <button type="button" className="bouton petit principal" onClick={() => lancer(j.user_id, 'accepter')} disabled={occupe}>
              Accepter sa demande
            </button>
            <button type="button" className="lien" onClick={() => lancer(j.user_id, 'refuser')} disabled={occupe}>
              Refuser
            </button>
          </>
        )}
        {lien === 'bloque' && (
          <>
            <span className="ami-etat attente">Bloqué</span>
            <button type="button" className="lien" onClick={() => lancer(j.user_id, 'debloquer')} disabled={occupe}>
              Débloquer
            </button>
          </>
        )}
        {!lien && (
          <button type="button" className="bouton petit" onClick={demander} disabled={occupe}>
            <Icone nom="ami" taille={15} />
            Ajouter en ami
          </button>
        )}
        {lien !== 'bloque' && (
          <button type="button" className="lien signaler bloquer" onClick={() => lancer(j.user_id, 'bloquer')} disabled={occupe}>
            Bloquer
          </button>
        )}
      </div>
      {probleme && <p className="msg-erreur" role="alert">{probleme}</p>}
    </>
  )
}

// ---------- Cartes de la section « Mes amis » ----------

// Le haut d'une carte: plaque de niveau, nom, faction, puces, rôles, petit mot.
function CorpsJoueur({ a, droite, children }) {
  return (
    <>
      <div className="carte-plaque">
        <Icone nom="joueur" taille={26} />
        <strong className="plaque-niveau" aria-hidden="true">{a.niveau ?? '?'}</strong>
        <span className="plaque-unite" aria-hidden="true">niveau</span>
        <span className="sr">{a.niveau ? `Niveau ${a.niveau}` : 'Niveau non précisé'}</span>
      </div>
      <div className="carte-corps">
        <div className="carte-haut">
          <div className="carte-titre">
            <h3>{a.perso}</h3>
            <span className={`faction ${a.faction}`}>{nomDe(FACTIONS, a.faction)}</span>
          </div>
          {droite}
        </div>
        <ul className="infos">
          <ChipClasse classe={a.classe} specialisation={a.specialisation} />
          {a.guilde && <li className="chip fort">{a.guilde}</li>}
          <li className="chip">{a.region}</li>
          <li className="chip">{nomDe(STYLES, a.style)}</li>
          <li className="chip">{nomDe(LANGUES, a.langue)}</li>
        </ul>
        {a.roles?.length > 0 && (
          <p className="roles">
            <span>Joue</span>
            {ROLES.filter((r) => a.roles.includes(r.id)).map((r) => (
              <span key={r.id} className={`role ${r.id}`}>
                <Icone nom={r.id} taille={15} />
                {r.nom}
              </span>
            ))}
          </p>
        )}
        {a.bio && <p className="note">{a.bio}</p>}
        {children}
      </div>
    </>
  )
}

function CarteDemande({ a, apres, annoncer }) {
  const { occupe, probleme, lancer } = useActionAmi({ apres, annoncer })
  return (
    <article className={`carte joueur ${a.faction}`} id={`ami-${a.user_id}`} tabIndex={-1}>
      <CorpsJoueur a={a} droite={<span className="depuis">Demande {depuis(a.depuis)}</span>}>
        <p className="aide">
          Si tu acceptes, vous serez dans la liste d'amis l'un de l'autre. Si tu refuses, la personne n'est pas avertie.
        </p>
        <div className="joueur-actions">
          <button type="button" className="bouton petit principal" onClick={() => lancer(a.user_id, 'accepter')} disabled={occupe}>
            <Icone nom="coche" taille={15} />
            Accepter
          </button>
          <button type="button" className="bouton petit" onClick={() => lancer(a.user_id, 'refuser')} disabled={occupe}>
            Refuser
          </button>
          <button type="button" className="lien signaler bloquer" onClick={() => lancer(a.user_id, 'bloquer')} disabled={occupe}>
            Bloquer
          </button>
        </div>
        {probleme && <p className="msg-erreur" role="alert">{probleme}</p>}
      </CorpsJoueur>
    </article>
  )
}

function CarteAmi({ a, enLigne, commande, apres, annoncer }) {
  const { occupe, probleme, lancer } = useActionAmi({ apres, annoncer })
  const [confirmer, setConfirmer] = useState(false)
  return (
    <article className={`carte joueur ${a.faction}`} id={`ami-${a.user_id}`} tabIndex={-1}>
      <CorpsJoueur
        a={a}
        droite={
          enLigne ? (
            <span className="depuis en-ligne">
              <span className="point" aria-hidden="true" />
              En ligne
            </span>
          ) : a.vu_le ? (
            <span className="depuis">{vuTexte(a.vu_le)}</span>
          ) : null
        }
      >
        <div className="inviter">
          <LigneCopie
            titre="Inviter dans le jeu"
            valeur={`${commande} ${a.perso}`}
            conseil="Dans le jeu: ouvre le chat (Entrée), colle, puis Entrée."
          />
          {a.battletag && (
            <LigneCopie titre="BattleTag" valeur={a.battletag} conseil="Colle-le dans Battle.net pour l'ajouter comme ami." />
          )}
        </div>
        {!a.visible && (
          <p className="aide">Cette personne a caché son profil: tu ne vois ni son BattleTag ni quand elle est en ligne.</p>
        )}
        {confirmer ? (
          <div className="joueur-actions">
            <span className="aide">Retirer {a.perso} de tes amis? Il ou elle n'est pas averti.</span>
            <button type="button" className="bouton petit danger" onClick={() => lancer(a.user_id, 'retirer')} disabled={occupe}>
              Oui, retirer
            </button>
            <button type="button" className="bouton petit" onClick={() => setConfirmer(false)}>Annuler</button>
          </div>
        ) : (
          <div className="joueur-actions">
            <button type="button" className="bouton petit" onClick={() => setConfirmer(true)}>
              Retirer de mes amis
            </button>
            <button type="button" className="lien signaler bloquer" onClick={() => lancer(a.user_id, 'bloquer')} disabled={occupe}>
              Bloquer
            </button>
          </div>
        )}
        {probleme && <p className="msg-erreur" role="alert">{probleme}</p>}
      </CorpsJoueur>
    </article>
  )
}

function LigneSimple({ a, texte, actions, apres, annoncer }) {
  const { occupe, probleme, lancer } = useActionAmi({ apres, annoncer })
  return (
    <li className="ami-ligne">
      <span className="ami-ligne-nom">
        <strong>{a.perso}</strong>
        <span className={`faction ${a.faction}`}>{nomDe(FACTIONS, a.faction)}</span>
        {texte && <span className="aide">{texte}</span>}
      </span>
      <span className="ami-ligne-actions">
        {actions.map(([action, nom]) => (
          <button key={action} type="button" className="bouton petit" onClick={() => lancer(a.user_id, action)} disabled={occupe}>
            {nom}
          </button>
        ))}
      </span>
      {probleme && <p className="msg-erreur" role="alert">{probleme}</p>}
    </li>
  )
}

// ---------- La section « Mes amis » ----------

export function SectionAmis({ amis, enLigne, commande, apres, annoncer, voirTous }) {
  if (amis === null) {
    return (
      <p className="erreur" role="status">
        Les amis ne sont pas encore disponibles. Réessaie dans un moment.
      </p>
    )
  }

  const recues = amis.filter((a) => a.lien === 'recue')
  const amisListe = amis
    .filter((a) => a.lien === 'ami')
    .sort(
      (x, y) =>
        Number(enLigne.has(y.user_id)) - Number(enLigne.has(x.user_id)) ||
        new Date(y.vu_le ?? 0) - new Date(x.vu_le ?? 0) ||
        x.perso.localeCompare(y.perso),
    )
  const envoyees = amis.filter((a) => a.lien === 'envoyee')
  const bloques = amis.filter((a) => a.lien === 'bloque')
  const nbEnLigne = amisListe.filter((a) => enLigne.has(a.user_id)).length

  return (
    <div className="amis">
      {recues.length > 0 && (
        <section aria-labelledby="amis-recues">
          <h2 className="amis-titre" id="amis-recues">
            Demandes reçues <span className="onglet-nombre">{recues.length}</span>
          </h2>
          <ul className="liste">
            {recues.map((a) => (
              <li key={a.user_id}>
                <CarteDemande a={a} apres={apres} annoncer={annoncer} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="amis-liste">
        <h2 className="amis-titre" id="amis-liste">
          Mes amis <span className="onglet-nombre">{amisListe.length}</span>
          {amisListe.length > 0 && <span className="resume-detail">{nbEnLigne} en ligne</span>}
        </h2>
        {amisListe.length === 0 ? (
          <div className="vide">
            <span className="vide-icone" aria-hidden="true"><Icone nom="amis" taille={30} /></span>
            <p>
              {recues.length > 0
                ? "Tu n'as pas encore d'amis dans la liste. Accepte une demande ci-dessus."
                : "Tu n'as pas encore d'amis dans la liste. Dans « Tous les joueurs », clique sur « Ajouter en ami »: la personne reçoit ta demande et décide."}
            </p>
            <button type="button" className="bouton" onClick={voirTous}>Voir tous les joueurs</button>
          </div>
        ) : (
          <ul className="liste">
            {amisListe.map((a) => (
              <li key={a.user_id}>
                <CarteAmi a={a} enLigne={enLigne.has(a.user_id)} commande={commande} apres={apres} annoncer={annoncer} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {envoyees.length > 0 && (
        <section aria-labelledby="amis-envoyees">
          <h2 className="amis-titre" id="amis-envoyees">
            Demandes envoyées <span className="onglet-nombre">{envoyees.length}</span>
          </h2>
          <ul className="amis-lignes">
            {envoyees.map((a) => (
              <LigneSimple
                key={a.user_id}
                a={a}
                texte={`en attente, ${depuis(a.depuis)}`}
                actions={[['annuler', 'Annuler la demande']]}
                apres={apres}
                annoncer={annoncer}
              />
            ))}
          </ul>
        </section>
      )}

      {bloques.length > 0 && (
        <details className="plus">
          <summary>Personnes bloquées ({bloques.length})</summary>
          <p className="aide">
            Une personne bloquée ne peut pas te demander en ami: elle ne le sait pas, sa demande n'arrive simplement pas.
          </p>
          <ul className="amis-lignes">
            {bloques.map((a) => (
              <LigneSimple key={a.user_id} a={a} actions={[['debloquer', 'Débloquer']]} apres={apres} annoncer={annoncer} />
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}
