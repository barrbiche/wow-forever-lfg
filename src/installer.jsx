import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icone } from './commun.jsx'

// Bouton « Installer l'app » et sa fenêtre d'explications. Le site s'installe comme une app, avec son icône:
// - Chrome, Edge, Brave (Android et ordinateur): le navigateur nous donne un événement, un bouton installe en un geste.
// - iPhone, iPad et les autres navigateurs: aucun événement possible, on explique le geste étape par étape.
// Le bouton disparaît quand le site est déjà ouvert comme une app installée.
// Les étapes suivent Safari (iOS 26 et avant), Chrome, Firefox et Samsung Internet; les noms exacts des menus
// peuvent varier un peu selon la version du système.

export const dejaInstalle = () => {
  try {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
  } catch {
    return false
  }
}

export const surIos = () => {
  const ua = window.navigator.userAgent || ''
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && window.navigator.maxTouchPoints > 1)
}

// L'événement d'installation n'arrive qu'une fois: on le garde ici pour que tous les boutons (en-tête, pied de page) l'utilisent.
let evenementInstall = null
let installeMaintenant = false
const abonnes = new Set()
const prevenir = () => abonnes.forEach((f) => f())

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    evenementInstall = e
    prevenir()
  })
  window.addEventListener('appinstalled', () => {
    evenementInstall = null
    installeMaintenant = true
    prevenir()
  })
}

function useInstallation() {
  const [, rafraichir] = useState(0)
  useEffect(() => {
    const f = () => rafraichir((n) => n + 1)
    abonnes.add(f)
    return () => abonnes.delete(f)
  }, [])
  return { evenement: evenementInstall, installe: installeMaintenant || dejaInstalle() }
}

export function BoutonInstaller({ classe = 'lien', icone = null, children = "Installer l'app" }) {
  const { installe } = useInstallation()
  const [ouvert, setOuvert] = useState(false)
  if (installe) return null
  return (
    <>
      <button type="button" className={classe} onClick={() => setOuvert(true)} aria-haspopup="dialog">
        {icone && <Icone nom={icone} taille={18} />}
        {children}
      </button>
      <FenetreInstaller ouvert={ouvert} fermer={() => setOuvert(false)} />
    </>
  )
}

function FenetreInstaller({ ouvert, fermer }) {
  const dialogue = useRef(null)
  const { evenement } = useInstallation()
  const [appareil, setAppareil] = useState(() => (surIos() ? 'iphone' : 'android'))
  const [probleme, setProbleme] = useState('')
  const site = typeof window !== 'undefined' ? window.location.hostname || 'babillard-forever.com' : 'babillard-forever.com'

  useEffect(() => {
    const d = dialogue.current
    if (!d) return
    if (ouvert && !d.open) {
      setAppareil(surIos() ? 'iphone' : 'android')
      setProbleme('')
      d.showModal()
    }
    if (!ouvert && d.open) d.close()
  }, [ouvert])

  async function installerMaintenant() {
    if (!evenement) return
    setProbleme('')
    try {
      await evenement.prompt()
      const choix = await evenement.userChoice
      if (choix?.outcome === 'accepted') fermer()
    } catch {
      setProbleme("Ton navigateur n'a pas pu lancer l'installation. Suis les étapes ci-dessous.")
    }
  }

  // Dans <body>, pour ne pas hériter des styles de l'en-tête (texte clair sur fond sombre) où se trouve le bouton.
  return createPortal(
    <dialog
      ref={dialogue}
      className="dialogue aide-fenetre installer-fenetre"
      onClose={fermer}
      onClick={(e) => e.target === dialogue.current && fermer()}
      aria-labelledby="titre-installer"
    >
      <div className="dialogue-contenu">
        <div className="dialogue-haut">
          <h2 id="titre-installer">Installer l'app sur ton cellulaire</h2>
          <button type="button" className="bouton petit" onClick={fermer}>Fermer</button>
        </div>

        <p className="aide">
          Le site s'ouvre alors comme une vraie app: une icône sur ton écran d'accueil, en plein écran, sans la barre du
          navigateur. Sur iPhone, c'est aussi nécessaire pour recevoir les alertes.
        </p>

        {evenement && (
          <div className="installer-rapide">
            <button type="button" className="bouton principal" onClick={installerMaintenant}>Installer maintenant</button>
            <span className="aide">Ton navigateur peut le faire en un seul geste.</span>
          </div>
        )}
        {probleme && <p className="msg-erreur" role="alert">{probleme}</p>}

        <div className="pastilles choix-appareil" role="group" aria-label="Type de cellulaire">
          <button type="button" className="pastille" aria-pressed={appareil === 'iphone'} onClick={() => setAppareil('iphone')}>
            iPhone
          </button>
          <button type="button" className="pastille" aria-pressed={appareil === 'android'} onClick={() => setAppareil('android')}>
            Android
          </button>
        </div>

        {appareil === 'iphone' ? (
          <>
            <section aria-labelledby="installer-safari">
              <h3 id="installer-safari">Avec Safari (le plus simple)</h3>
              <ol className="etapes">
                <li>
                  Ouvre <strong>{site}</strong> dans <strong>Safari</strong>. Si tu viens d'un lien dans Facebook, Messenger,
                  Discord ou Instagram, touche le menu de l'app puis « Ouvrir dans Safari ».
                </li>
                <li>
                  Touche les <strong>trois points (•••)</strong> à droite de la barre d'adresse, puis <strong>« Partager »</strong>.
                  Sur un iPhone avec iOS 18 ou plus ancien, touche plutôt le bouton <strong>Partager</strong> (un carré avec une
                  flèche vers le haut), en bas de l'écran.
                </li>
                <li>
                  Fais défiler la liste vers le bas et touche <strong>« Sur l'écran d'accueil »</strong>.
                </li>
                <li>
                  Laisse l'interrupteur <strong>« Ouvrir comme app web »</strong> (« Open as Web App » si ton iPhone est en
                  anglais) <strong>activé</strong>. S'il est désactivé, l'icône ouvre seulement Safari.
                </li>
                <li>
                  Touche <strong>« Ajouter »</strong> en haut à droite.
                </li>
                <li>
                  Ouvre le site <strong>avec la nouvelle icône</strong> sur ton écran d'accueil, pas depuis Safari.
                </li>
              </ol>
            </section>
            <section aria-labelledby="installer-autres-ios">
              <h3 id="installer-autres-ios">Avec Chrome ou Firefox sur iPhone</h3>
              <ol className="etapes">
                <li>Touche le bouton <strong>Partager</strong> (dans la barre d'adresse ou dans le menu).</li>
                <li>Touche <strong>« Sur l'écran d'accueil »</strong>, puis <strong>« Ajouter »</strong> en haut à droite.</li>
              </ol>
            </section>
            <p className="aide">
              Les alertes sur iPhone demandent iOS 16.4 ou plus récent, et le site ouvert depuis l'icône de l'écran d'accueil.
            </p>
          </>
        ) : (
          <>
            <section aria-labelledby="installer-chrome">
              <h3 id="installer-chrome">Avec Chrome (le plus courant)</h3>
              <ol className="etapes">
                <li>
                  Ouvre <strong>{site}</strong> dans <strong>Chrome</strong>.
                </li>
                <li>
                  Touche les <strong>trois points (⋮)</strong> en haut à droite.
                </li>
                <li>
                  Touche <strong>« Installer l'application »</strong>. Si tu ne la vois pas, touche{' '}
                  <strong>« Ajouter à l'écran d'accueil »</strong>.
                </li>
                <li>
                  Si Chrome te propose un choix, prends <strong>« Installer »</strong> (et non « Créer un raccourci »).
                </li>
                <li>
                  Confirme avec <strong>« Installer »</strong> ou <strong>« Ajouter »</strong>. L'icône apparaît sur ton écran
                  d'accueil ou dans la liste de tes apps.
                </li>
              </ol>
            </section>
            <section aria-labelledby="installer-samsung">
              <h3 id="installer-samsung">Avec Samsung Internet</h3>
              <ol className="etapes">
                <li>Touche le menu <strong>(≡)</strong> en bas à droite.</li>
                <li>Touche <strong>« Ajouter la page à »</strong>, puis <strong>« Écran d'accueil »</strong>.</li>
                <li>Touche <strong>« Ajouter »</strong> (deux fois, si on te le demande).</li>
              </ol>
            </section>
            <section aria-labelledby="installer-firefox">
              <h3 id="installer-firefox">Avec Firefox</h3>
              <ol className="etapes">
                <li>Touche les <strong>trois points (⋮)</strong>.</li>
                <li>Touche <strong>« Installer »</strong> ou <strong>« Ajouter à l'écran d'accueil »</strong>, puis confirme.</li>
              </ol>
            </section>
          </>
        )}

        <p className="aide">
          Les noms exacts des menus changent un peu selon la version de ton téléphone. Sur ordinateur (Chrome, Edge, Brave),
          clique l'icône d'installation à droite de la barre d'adresse. Pour désinstaller, retire l'icône comme n'importe
          quelle app.
        </p>
      </div>
    </dialog>,
    document.body,
  )
}
