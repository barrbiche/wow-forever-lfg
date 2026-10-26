import { useEffect, useRef, useState } from 'react'
import { envoyerRetour } from './store.js'

const LONGUEUR = 1000

const CATEGORIES = [
  { id: 'bogue', nom: 'Un bogue' },
  { id: 'idee', nom: 'Une idée' },
  { id: 'autre', nom: 'Autre chose' },
]

// Boîte à messages: un bogue, une idée, un mot pour la personne qui fait le site. Les messages restent dans la base.
export default function DialogueRetour({ fermer, utilisateur, onConnexion, annoncer }) {
  const dialogue = useRef(null)
  const [categorie, setCategorie] = useState('bogue')
  const [texte, setTexte] = useState('')
  const [probleme, setProbleme] = useState('')
  const [envoi, setEnvoi] = useState(false)

  useEffect(() => {
    const d = dialogue.current
    if (d && !d.open) d.showModal()
  }, [])

  const envoyer = async (e) => {
    e.preventDefault()
    const t = texte.trim()
    if (!t) {
      setProbleme('Écris ton message avant de l’envoyer.')
      return
    }
    setProbleme('')
    setEnvoi(true)
    try {
      await envoyerRetour(categorie, t)
      annoncer('Merci! Ton message est bien reçu.')
      fermer()
    } catch (err) {
      setProbleme(
        err?.code === '54000'
          ? 'Tu as déjà envoyé beaucoup de messages aujourd’hui. Réessaie demain.'
          : err?.code === '42883' || err?.code === 'PGRST202'
            ? 'La boîte à messages n’est pas encore prête. Réessaie plus tard.'
            : 'Le message n’est pas parti. Vérifie ta connexion, puis réessaie.',
      )
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
      aria-labelledby="titre-retour"
    >
      <div className="dialogue-connexion">
        <div className="dialogue-haut">
          <h2 id="titre-retour">Un bogue ou une idée?</h2>
          <button type="button" className="bouton petit" onClick={fermer}>Fermer</button>
        </div>
        {!utilisateur ? (
          <>
            <p>Le site est en test. Connecte-toi pour nous écrire: ça nous évite les messages en double et le pourriel.</p>
            <button
              type="button"
              className="bouton principal"
              onClick={() => {
                fermer()
                onConnexion()
              }}
            >
              Se connecter
            </button>
          </>
        ) : (
          <form className="formulaire-courriel" onSubmit={envoyer} noValidate>
            <p>
              Dis-nous ce qui ne marche pas, ou ce qui te ferait aimer le site encore plus. Si c’est un bogue, écris ce
              que tu faisais et ce qui s’est passé.
            </p>
            <label className="champ">
              <span>C’est…</span>
              <select value={categorie} onChange={(e) => setCategorie(e.target.value)}>
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>{c.nom}</option>
                ))}
              </select>
            </label>
            <label className="champ">
              <span>Ton message</span>
              <textarea
                rows={5}
                maxLength={LONGUEUR}
                value={texte}
                onChange={(e) => {
                  setTexte(e.target.value)
                  setProbleme('')
                }}
                aria-invalid={probleme ? 'true' : undefined}
              />
              <span className="compteur">{texte.length} / {LONGUEUR}</span>
            </label>
            {probleme && <p className="msg-erreur" role="alert">{probleme}</p>}
            <button type="submit" className="bouton principal" disabled={envoi}>
              {envoi ? 'Envoi…' : 'Envoyer'}
            </button>
            <p className="petit-texte">
              Ton message est lu par la personne qui fait le site. Il est gardé avec le nom de ton personnage, mais jamais
              avec ton courriel.
            </p>
          </form>
        )}
      </div>
    </dialog>
  )
}
