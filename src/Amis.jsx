import { useContext, useState } from 'react'
import { MESSAGE_COMPTE_SUSPENDU, agirAmi, compteSuspendu } from './store.js'
import { CLASSES, FACTIONS, LANGUES, RULESETS, ROLES, STYLES, couleurTexteClasse, exigencesAnnonce, nomDe, nomSpecialisation, peutGrouperAvec } from './data.js'
import { useLangueJeu } from './langue.jsx'
import { ChipClasse, ContextePersos, Icone, LigneCopie, OuvrirChat, depuis, vuTexte } from './commun.jsx'

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
  const { ouvrirAmi } = useContext(OuvrirChat)
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
          <>
            <span className="ami-etat">
              <Icone nom="coche" taille={15} />
              Ami
            </span>
            {ouvrirAmi && (
              <button type="button" className="bouton petit" onClick={() => ouvrirAmi(j.user_id)}>
                <Icone nom="discussion" taille={15} />
                Écrire
              </button>
            )}
          </>
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

// « Niv 38 · Mage Givre »: la ligne de détails d'un ami dans la liste.
function resumeJoueur(a, langue) {
  const classe = CLASSES.find((c) => c.id === a.classe)
  const spec = nomSpecialisation(a.classe, a.specialisation, langue)
  return [a.niveau ? `Niv ${a.niveau}` : null, classe ? `${classe.nom}${spec ? ` ${spec}` : ''}` : null].filter(Boolean).join(' · ')
}

function NomClasse({ a }) {
  return <strong className="ami-nom" style={a.classe ? { color: couleurTexteClasse(a.classe) } : undefined}>{a.perso}</strong>
}

// Copie une commande en un geste (« /inviter Nom »), sans ouvrir de fenêtre.
function BoutonCopierRapide({ valeur, titre, children }) {
  const [copie, setCopie] = useState(false)
  const copier = async () => {
    try {
      await navigator.clipboard.writeText(valeur)
    } catch {
      window.prompt('Copie ceci:', valeur)
      return
    }
    setCopie(true)
    setTimeout(() => setCopie(false), 2500)
  }
  return (
    <button type="button" className="bouton petit" onClick={copier} aria-label={`${titre}: copier ${valeur}`} title={valeur}>
      <Icone nom={copie ? 'coche' : 'joueur'} taille={15} />
      {copie ? 'Copié' : children}
    </button>
  )
}

// Une demande reçue, en une ligne: on accepte ou on refuse sans quitter la liste.
function RangDemande({ a, apres, annoncer }) {
  const { occupe, probleme, lancer } = useActionAmi({ apres, annoncer })
  const [langue] = useLangueJeu()
  return (
    <li className="ami-rang demande" id={`ami-${a.user_id}`} tabIndex={-1}>
      <div className="ami-rang-ligne">
        <span className="ami-avatar" aria-hidden="true">{(a.perso || '?').trim().charAt(0).toUpperCase()}</span>
        <span className="ami-rang-texte">
          <NomClasse a={a} />
          <span className="aide">
            {resumeJoueur(a, langue)} · Demande {depuis(a.depuis)}
          </span>
        </span>
        <span className="ami-rang-actions">
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
        </span>
      </div>
      <p className="aide ami-rang-note">Si tu refuses, la personne n'est pas avertie.</p>
      {probleme && <p className="msg-erreur" role="alert">{probleme}</p>}
    </li>
  )
}

// Un ami, en une ligne. On touche la ligne pour voir sa fiche (BattleTag, guilde, retirer, bloquer).
function RangAmi({ a, enLigne, commande, apres, annoncer }) {
  const { occupe, probleme, lancer } = useActionAmi({ apres, annoncer })
  const { ouvrirAmi } = useContext(OuvrirChat)
  const [langue] = useLangueJeu()
  const persos = useContext(ContextePersos)
  const groupable = peutGrouperAvec(persos, a)
  const [ouvert, setOuvert] = useState(false)
  const [confirmer, setConfirmer] = useState(false)
  const statut = enLigne ? 'En ligne' : a.vu_le ? vuTexte(a.vu_le) : 'Hors ligne'
  return (
    <li className={`ami-rang ${enLigne ? 'en-ligne' : 'hors-ligne'}`} id={`ami-${a.user_id}`} tabIndex={-1}>
      <div className="ami-rang-ligne">
        <button type="button" className="ami-rang-bouton" aria-expanded={ouvert} onClick={() => setOuvert((o) => !o)}>
          <span className={`ami-point${enLigne ? ' actif' : ''}`} aria-hidden="true" />
          <span className="ami-rang-texte">
            <span className="ami-rang-nom">
              <NomClasse a={a} />
              <span className={`faction ${a.faction}`}>{nomDe(FACTIONS, a.faction)}</span>
            </span>
            <span className="aide">{resumeJoueur(a, langue)}</span>
          </span>
          <span className={`ami-statut${enLigne ? ' en-ligne' : ''}`}>{statut}</span>
          <span className="ami-chevron" aria-hidden="true" />
        </button>
        <span className="ami-rang-actions">
          {ouvrirAmi && (
            <button type="button" className="bouton petit principal" onClick={() => ouvrirAmi(a.user_id)} aria-label={`Écrire à ${a.perso}`}>
              <Icone nom="discussion" taille={15} />
              Écrire
            </button>
          )}
          {groupable && (
            <BoutonCopierRapide valeur={`${commande} ${a.perso}`} titre={`Inviter ${a.perso} dans le jeu`}>
              Inviter
            </BoutonCopierRapide>
          )}
        </span>
      </div>
      {ouvert && (
        <div className="ami-fiche">
          <ul className="infos">
            <ChipClasse classe={a.classe} specialisation={a.specialisation} />
            {a.guilde && <li className="chip fort">{a.guilde}</li>}
            <li className="chip">{a.region}</li>
            {a.ruleset && <li className="chip chip-serveur">{RULESETS.find((r) => r.id === a.ruleset)?.carte ?? a.ruleset}</li>}
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
          <div className="inviter">
            {groupable ? (
              <LigneCopie
                titre="Inviter dans le jeu"
                valeur={`${commande} ${a.perso}`}
                conseil="Dans le jeu: ouvre le chat (Entrée), colle, puis Entrée."
              />
            ) : (
              <p className="aide inviter-bloque">Tu ne peux pas grouper avec cet ami. Il faut un personnage {exigencesAnnonce(a)}.</p>
            )}
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
        </div>
      )}
      {probleme && <p className="msg-erreur" role="alert">{probleme}</p>}
    </li>
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
  const [recherche, setRecherche] = useState('')
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

  const q = recherche.trim().toLowerCase()
  const filtre = (a) => !q || a.perso.toLowerCase().includes(q) || (a.guilde ?? '').toLowerCase().includes(q)
  const visibles = amisListe.filter(filtre)
  const enLigneListe = visibles.filter((a) => enLigne.has(a.user_id))
  const horsLigne = visibles.filter((a) => !enLigne.has(a.user_id))

  return (
    <div className="amis">
      {recues.length > 0 && (
        <section aria-labelledby="amis-recues">
          <h2 className="amis-titre" id="amis-recues">
            Demandes reçues <span className="onglet-nombre">{recues.length}</span>
          </h2>
          <ul className="ami-liste">
            {recues.map((a) => (
              <RangDemande key={a.user_id} a={a} apres={apres} annoncer={annoncer} />
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
          <>
            {amisListe.length >= 6 && (
              <label className="champ ami-recherche">
                <span>Chercher un ami</span>
                <input
                  type="text"
                  inputMode="search"
                  placeholder="Nom du personnage ou guilde"
                  value={recherche}
                  onChange={(e) => setRecherche(e.target.value)}
                />
              </label>
            )}
            {visibles.length === 0 && <p className="aide">Aucun ami ne correspond à « {recherche} ».</p>}
            {enLigneListe.length > 0 && (
              <>
                <h3 className="ami-groupe">En ligne <span className="onglet-nombre">{enLigneListe.length}</span></h3>
                <ul className="ami-liste">
                  {enLigneListe.map((a) => (
                    <RangAmi key={a.user_id} a={a} enLigne commande={commande} apres={apres} annoncer={annoncer} />
                  ))}
                </ul>
              </>
            )}
            {horsLigne.length > 0 && (
              <>
                <h3 className="ami-groupe">Hors ligne <span className="onglet-nombre">{horsLigne.length}</span></h3>
                <ul className="ami-liste">
                  {horsLigne.map((a) => (
                    <RangAmi key={a.user_id} a={a} enLigne={false} commande={commande} apres={apres} annoncer={annoncer} />
                  ))}
                </ul>
              </>
            )}
          </>
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
