import { Fragment, Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BoutonInstaller, dejaInstalle, surIos } from './installer.jsx'
import {
  connecter,
  compteSuspendu,
  creerAnnonce,
  creerRecurrence,
  lireRecurrences,
  arreterRecurrence,
  genererRecurrences,
  deconnecter,
  compterVisite,
  lireGroupesFormes,
  envoyerLienCourriel,
  connecterParMotDePasse,
  creerCompte,
  demanderNouveauMotDePasse,
  suivreRecuperation,
  changerMotDePasse,
  messageConnexion,
  MOT_DE_PASSE_MIN,
  googleActif,
  courrielActif,
  lienDons,
  lireSupporters,
  ecrireProfil,
  estModerateur,
  lireAnnonces,
  lireGuildes,
  lireAmis,
  lireApercuJoueurs,
  lireJoueurs,
  lireProfil,
  estConnecte,
  MESSAGE_COMPTE_SUSPENDU,
  modeDemo,
  retirerAnnonce,
  renouvelerAnnonce,
  retirerRole,
  suivrePresence,
  suivreUtilisateur,
  toucherProfil,
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
  NOMS_CHAMPS_PROFIL,
  PVP_PEU_IMPORTE,
  QUETE_PEU_IMPORTE,
  AUTRE_ZONE,
  ZONES_QUETES,
  RAIDS,
  REGIONS,
  ROLES,
  RULESETS,
  STYLES,
  champsManquants,
  nomDe,
  raidsOuverts,
} from './data.js'
import {
  ChipClasse,
  CommandeAnnonce,
  Icone,
  OuvrirChat,
  Supporters,
  BadgeSupporter,
  LienDirect,
  NOMS_ACTIVITE,
  Signalement,
  Decompte,
  DureeAnnonce,
  compteARebours,
  depuis,
  departParDefaut,
  departTexte,
  jourTexte,
  partRestante,
  SANS_ROLES,
  versChampDate,
} from './commun.jsx'
import { telechargerIcs } from './calendrier.js'
import Achalandage from './Achalandage.jsx'
import { BandeauPubs, ChoixPubs, Pub, pubsActives } from './Pub.jsx'
import {
  activerPush,
  ecouterChangementPush,
  enregistrerAlerteAnnonces,
  etatPush,
  lireAlerteAnnonces,
  pushConfigure,
  rafraichirPush,
  retirerAlerteAnnonces,
  retirerAlertesAppareil,
} from './push.js'
import { jouerSon, reglerSon, sonActif } from './sons.js'
import {
  Alerte,
  InvitationAlertes,
  demanderNotifications,
  ecrireAlerte,
  etatNotifications,
  filtresDeAlerte,
  invitationAlertesVisible,
  lireAlerte,
  notifierAnnonce,
  reporterInvitationAlertes,
  texteNouvelleAnnonce,
} from './alertes.jsx'
import Aide from './Aide.jsx'
import DialogueRetour from './Retours.jsx'
import { DialogueDemande, SectionMessages, ZoneRejoindre } from './Messages.jsx'
import { lireConversations, lireMesDemandes, lirePlaces, messagerieAbsente } from './messagerie.js'
import SectionGuildes from './Guildes.jsx'
import SectionJoueurs, { ProfilJoueur } from './Joueurs.jsx'

// La page de modération ne sert qu'aux modérateurs: elle n'est chargée que quand on l'ouvre.
const Moderation = lazy(() => import('./Moderation.jsx').then((m) => ({ default: m.Moderation })))
// Les guides de donjons (beaucoup de texte) ne sont chargés que quand on ouvre l'onglet.
const Guides = lazy(() => import('./Guides.jsx'))
// Tous les donjons de ces listes ont un guide (voir guides-data.js).
const AVEC_GUIDE = new Set([...DONJONS_NOUVEAUX, ...DONJONS_CLASSIQUES])

const TITRE_PAGE = 'Babillard Forever'

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
  // Onglet Joueurs
  classe: '',
  recherche: '',
  enLigne: false,
}

// Les filtres qui comptent dans chaque onglet (faction, langue, région et rôle sont partagés).
const CLES_GROUPES = ['activite', 'faction', 'region', 'role', 'niveau', 'style', 'langue', 'genre', 'planifies']
const CLES_JOUEURS = ['faction', 'langue', 'region', 'role', 'classe', 'recherche', 'enLigne']

function correspondJoueur(j, f, enLigne) {
  if (f.langue && j.langue !== f.langue) return false
  if (f.region && j.region !== f.region) return false
  if (f.role && !j.roles.includes(f.role)) return false
  if (f.classe && j.classe !== f.classe) return false
  if (f.enLigne && !enLigne.has(j.user_id)) return false
  const q = f.recherche.trim().toLowerCase()
  if (q && !j.perso.toLowerCase().includes(q)) return false
  return true
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

// Adresse directe vers une annonce, une guilde ou un guide: ?annonce=ID, ?guilde=ID ou ?guide=ID.
function lireLienDirect() {
  const p = new URLSearchParams(window.location.search)
  if (p.get('guide')) return { type: 'guide', id: p.get('guide') }
  if (p.get('annonce')) return { type: 'annonce', id: p.get('annonce') }
  if (p.get('guilde')) return { type: 'guilde', id: p.get('guilde') }
  return null
}

// ---------- Ruban défilant: rappel de garder son profil à jour ----------

const TEXTE_RUBAN = "N'oublie pas de mettre à jour ton personnage dans « Mon profil » pour un bon déroulement sur le site."

// Le texte défile sans arrêt (il s'arrête sous la souris ou au clavier). Pour les gens qui demandent moins de
// mouvement, il reste fixe, sur une seule ligne qui se replie. Cliquer ouvre « Mon profil » (ou la connexion).
// Le texte est répété pour remplir les très grands écrans; seul le premier est lu par les lecteurs d'écran.
function Ruban({ connecte, onClick }) {
  return (
    <div className="ruban">
      <button
        type="button"
        className="ruban-bouton"
        onClick={onClick}
        aria-label={`${TEXTE_RUBAN} ${connecte ? 'Ouvrir mon profil.' : 'Se connecter.'}`}
      >
        <span className="ruban-piste" aria-hidden="true">
          {[0, 1].map((g) => (
            <span key={g} className="ruban-groupe">
              {Array.from({ length: 6 }, (_, i) => (
                <span key={i} className="ruban-texte">{TEXTE_RUBAN}</span>
              ))}
            </span>
          ))}
        </span>
      </button>
    </div>
  )
}

// ---------- Page ----------

export default function App() {
  const [annonces, setAnnonces] = useState([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState('')
  const [filtres, setFiltres] = useState(FILTRES_VIDES)
  const [formulaireOuvert, setFormulaireOuvert] = useState(false)
  const [message, setMessage] = useState('')
  const [nouveauMdp, setNouveauMdp] = useState(false)
  const [utilisateur, setUtilisateur] = useState(null)
  const [styleSite, setStyleSite] = useState(styleEnregistre)

  const choisirStyle = (style) => {
    appliquerStyle(style)
    setStyleSite(style)
  }

  const [guildes, setGuildes] = useState(null) // null: pas encore disponibles (ex.: base pas à jour)
  const [vue, setVue] = useState(() => (new URLSearchParams(window.location.search).get('vue') === 'messages' ? 'messages' : 'groupes'))
  const [aideOuverte, setAideOuverte] = useState(false)
  const [retourOuvert, setRetourOuvert] = useState(false)
  const [lien] = useState(lireLienDirect)
  const [lienTraite, setLienTraite] = useState(false)
  const [ciblee, setCiblee] = useState(null) // { type: 'annonce' | 'guilde', id }
  const [guideCible, setGuideCible] = useState(null) // { valeur: id ou nom du donjon, n }
  const [recurrences, setRecurrences] = useState([])
  const dernierGenRef = useRef(0)
  const [places, setPlaces] = useState(() => new Map())
  const [supporters, setSupporters] = useState(() => new Set())
  const [joueurs, setJoueurs] = useState([]) // null: pas encore disponibles (ex.: base pas à jour)
  const [enLigne, setEnLigne] = useState(() => new Set())
  const [apercuJoueurs, setApercuJoueurs] = useState(null) // visiteur non connecté: { liste, total } (null: indisponible)
  const [amis, setAmis] = useState([]) // null: pas encore disponibles (ameliorations6.sql pas roulé)
  const [vueJoueurs, setVueJoueurs] = useState('tous') // 'tous' ou 'amis'
  const demandesVuesRef = useRef(null)
  const [profilOuvert, setProfilOuvert] = useState(false)
  // Vrai quand la fenêtre « Mon profil » s'est ouverte parce qu'il faut un profil complet pour publier.
  const [publierApresProfil, setPublierApresProfil] = useState(false)
  // Vrai une fois la liste des joueurs lue pour le compte connecté (avant, on ne sait pas si son profil est complet).
  const [joueursPrets, setJoueursPrets] = useState(false)
  const lectureRef = useRef(0)
  const [moderateur, setModerateur] = useState(false)
  const [moderationOuverte, setModerationOuverte] = useState(false)
  // Messagerie (ameliorations8.sql): groupes, chat entre amis, et l'état de mes demandes pour rejoindre.
  const [son, setSon] = useState(sonActif)
  const [visites, setVisites] = useState(null) // visiteurs d'aujourd'hui (null: pas disponible)
  const [formes, setFormes] = useState(null) // groupes formés aujourd'hui (null: pas disponible)
  const [conversations, setConversations] = useState([]) // null: pas activée (le SQL n'est pas roulé)
  const [mesDemandes, setMesDemandes] = useState([])
  const [chatCible, setChatCible] = useState(null) // { type: 'groupe' | 'ami', id, panneau, n }
  const [demandeAnnonce, setDemandeAnnonce] = useState(null) // l'annonce à laquelle on demande à rejoindre
  const totauxChatRef = useRef(null)
  const vueRef = useRef('groupes')

  // Alertes de nouvelles annonces: voir alertes.jsx. `vues` retient les annonces déjà connues (la première lecture
  // n'est jamais « nouvelle »); les refs permettent à `charger` de rester stable.
  const [alerte, setAlerte] = useState(lireAlerte)
  const [etatNotif, setEtatNotif] = useState(etatNotifications)
  const [pushEtat, setPushEtat] = useState(null) // alertes de cet appareil: { supporte, bloque, actif } (null: pas connecté)
  const [alerteServeur, setAlerteServeur] = useState(false) // l'alerte est aussi gardée avec le compte (site fermé)
  const [occupeAlertes, setOccupeAlertes] = useState(false)
  const [problemeAlertes, setProblemeAlertes] = useState('')
  const [invitation, setInvitation] = useState(invitationAlertesVisible)
  const syncAlerteRef = useRef('')
  const [nouvelles, setNouvelles] = useState(() => new Set())
  const [avis, setAvis] = useState(null) // { texte, ids }
  const vuesRef = useRef(null)
  const alerteRef = useRef(alerte)
  const utilisateurRef = useRef(null)
  const voirAvisRef = useRef(null)
  const nonLusRef = useRef(0)
  // Une alerte sur l'appareil ouvre l'onglet Messages (ouverture du site ou clic sur une alerte quand le site est déjà ouvert).
  useEffect(() => {
    compterVisite().then(setVisites)
  }, [])

  // Groupes formés aujourd'hui: relu chaque minute tant que la page est visible.
  useEffect(() => {
    let actif = true
    const lire = () => {
      if (document.visibilityState === 'hidden') return
      lireGroupesFormes().then((n) => actif && setFormes(n))
    }
    lire()
    const minuterie = setInterval(lire, 60000)
    return () => {
      actif = false
      clearInterval(minuterie)
    }
  }, [])

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('vue') === 'messages') {
      window.history.replaceState(null, '', window.location.pathname)
    }
    const sw = navigator.serviceWorker
    if (!sw) return undefined
    const ecoute = (e) => {
      if (e.data?.type === 'ouvrir' && String(e.data.url).includes('vue=messages')) setVue('messages')
    }
    sw.addEventListener('message', ecoute)
    return () => sw.removeEventListener('message', ecoute)
  }, [])

  useEffect(() => {
    if (utilisateur?.id) rafraichirPush(utilisateur.id)
  }, [utilisateur?.id])

  // L'état des alertes de cet appareil (pour l'invitation et le bouton d'alerte), relu quand on les active ou coupe.
  useEffect(() => {
    const id = utilisateur?.id
    if (!id || !pushConfigure) {
      setPushEtat(null)
      return undefined
    }
    let actif = true
    const lire = () => etatPush(id).then((e) => actif && setPushEtat(e))
    lire()
    const arreter = ecouterChangementPush(lire)
    return () => {
      actif = false
      arreter()
    }
  }, [utilisateur?.id])

  // L'alerte de nouvelles annonces suit le compte: elle est gardée sur le serveur pour t'avertir site fermé, et une
  // personne qui se connecte sur un autre appareil retrouve son alerte.
  useEffect(() => {
    const id = utilisateur?.id
    if (!id || !pushConfigure) {
      syncAlerteRef.current = ''
      setAlerteServeur(false)
      return undefined
    }
    let actif = true
    ;(async () => {
      if (alerte) {
        const filtresAlerte = filtresDeAlerte({ ...FILTRES_VIDES, ...alerte.filtres })
        const cle = id + JSON.stringify(filtresAlerte)
        if (syncAlerteRef.current === cle) return
        const ok = await enregistrerAlerteAnnonces(filtresAlerte)
        if (!actif) return
        syncAlerteRef.current = ok ? cle : ''
        setAlerteServeur(ok)
      } else {
        const serveur = await lireAlerteAnnonces()
        if (!actif) return
        if (!serveur) {
          setAlerteServeur(false)
          return
        }
        const filtresAlerte = filtresDeAlerte({ ...FILTRES_VIDES, ...serveur, activite: serveur.activite || 'tout' })
        syncAlerteRef.current = id + JSON.stringify(filtresAlerte)
        ecrireAlerte({ filtres: filtresAlerte })
        setAlerte({ filtres: filtresAlerte })
        setAlerteServeur(true)
      }
    })()
    return () => {
      actif = false
    }
  }, [utilisateur?.id, alerte])

  useEffect(() => {
    alerteRef.current = alerte
  }, [alerte])
  useEffect(() => {
    utilisateurRef.current = utilisateur
  }, [utilisateur])

  const detecterNouvelles = useCallback((liste) => {
    if (vuesRef.current === null) {
      vuesRef.current = new Set(liste.map((a) => a.id))
      return
    }
    const vues = vuesRef.current
    const neuves = liste.filter((a) => !vues.has(a.id))
    neuves.forEach((a) => vues.add(a.id))
    const miennes = utilisateurRef.current?.id
    const autres = neuves.filter((a) => !miennes || a.user_id !== miennes)
    if (autres.length === 0) return
    setNouvelles((avant) => new Set([...avant, ...autres.map((a) => a.id)]))
    const regle = alerteRef.current
    // Un petit son pour une nouvelle annonce: avec une alerte, seulement pour celles qui t'intéressent.
    const concernees = regle ? autres.filter((a) => correspond(a, { ...FILTRES_VIDES, ...regle.filtres })) : autres
    if (concernees.length > 0) jouerSon('annonce')
    if (!regle || concernees.length === 0) return
    const ids = concernees.map((a) => a.id)
    setAvis({
      ids,
      texte:
        concernees.length === 1
          ? texteNouvelleAnnonce(concernees[0]).corps
          : `${concernees.length} nouvelles annonces qui t'intéressent`,
    })
    if (document.hidden) {
      nonLusRef.current += concernees.length
      document.title = `(${nonLusRef.current}) ${TITRE_PAGE}`
      concernees.slice(0, 3).forEach((a) => notifierAnnonce(a, () => voirAvisRef.current?.({ ids: [a.id] })))
    }
  }, [])

  // Les amis et les demandes. Une nouvelle demande reçue pendant que le site est ouvert est annoncée une fois.
  const chargerAmis = useCallback(async () => {
    try {
      const liste = await lireAmis()
      setAmis(liste)
      const recues = liste.filter((a) => a.lien === 'recue')
      if (demandesVuesRef.current === null) {
        demandesVuesRef.current = new Set(recues.map((a) => a.user_id))
        return
      }
      const neuves = recues.filter((a) => !demandesVuesRef.current.has(a.user_id))
      neuves.forEach((a) => demandesVuesRef.current.add(a.user_id))
      if (neuves.length === 1) setMessage(`${neuves[0].perso} t'a envoyé une demande d'ami.`)
      else if (neuves.length > 1) setMessage(`${neuves.length} nouvelles demandes d'ami.`)
    } catch {
      setAmis(null)
    }
  }, [])

  // Les demandes à traiter et les messages non lus. Une nouvelle demande ou un nouveau message est annoncé une fois
  // quand on n'est pas dans l'onglet Messages.
  const chargerPlaces = useCallback(async () => {
    try {
      setPlaces(new Map((await lirePlaces()).map((p) => [p.annonce_id, p])))
    } catch {
      // pas grave: les cartes n'affichent simplement pas les places
    }
  }, [])

  const chargerMessagerie = useCallback(async () => {
    chargerPlaces()
    try {
      const [conv, dem] = await Promise.all([lireConversations(), lireMesDemandes()])
      setConversations(conv)
      setMesDemandes(dem)
      const demandes = conv.reduce((n, c) => n + (c.nb_en_attente || 0), 0)
      const messages = conv.reduce((n, c) => n + (c.non_lus || 0), 0)
      const avant = totauxChatRef.current
      totauxChatRef.current = { demandes, messages }
      if (avant && (demandes > avant.demandes || messages > avant.messages)) jouerSon('message')
      if (avant && vueRef.current !== 'messages') {
        if (demandes > avant.demandes) {
          setMessage(demandes - avant.demandes > 1 ? 'Nouvelles demandes pour rejoindre ton groupe.' : 'Nouvelle demande pour rejoindre ton groupe.')
        } else if (messages > avant.messages) {
          setMessage('Nouveau message.')
        }
      }
    } catch (e) {
      if (messagerieAbsente(e)) {
        setConversations(null)
        setMesDemandes([])
      }
    }
  }, [chargerPlaces])

  const charger = useCallback(async () => {
    // Une lecture plus récente (par exemple après une connexion) remplace une plus ancienne qui finit en retard.
    const lecture = ++lectureRef.current
    try {
      const liste = await lireAnnonces()
      setAnnonces(liste)
      detecterNouvelles(liste)
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
    try {
      const liste = await lireJoueurs()
      if (lecture === lectureRef.current) {
        setJoueurs(liste)
        setJoueursPrets(true)
      }
    } catch {
      setJoueurs(null)
    }
    try {
      // Un visiteur ne reçoit pas la liste des joueurs, seulement un petit aperçu pour lui donner le goût d'essayer.
      const apercu = (await estConnecte()) ? null : await lireApercuJoueurs()
      if (lecture === lectureRef.current) setApercuJoueurs(apercu)
    } catch {
      setApercuJoueurs(null)
    }
    setSupporters(await lireSupporters())
    try {
      // Les annonces qui se répètent: la première personne connectée avant le départ les publie.
      if (Date.now() - dernierGenRef.current > 5 * 60000) {
        dernierGenRef.current = Date.now()
        if ((await genererRecurrences()) > 0) setAnnonces(await lireAnnonces())
      }
      setRecurrences(await lireRecurrences())
    } catch {
      setRecurrences([])
    }
    await chargerAmis()
    await chargerMessagerie()
  }, [detecterNouvelles, chargerAmis, chargerMessagerie])

  useEffect(() => {
    const minuterie = setInterval(charger, 30000)
    return () => clearInterval(minuterie)
  }, [charger])

  useEffect(() => suivreUtilisateur(setUtilisateur), [])
  useEffect(() => suivreRecuperation(() => setNouveauMdp(true)), [])

  useEffect(() => {
    vueRef.current = vue
  }, [vue])

  // Les demandes et les messages sont relus plus souvent que le reste (toutes les 10 secondes).
  useEffect(() => {
    if (!utilisateur) return undefined
    const minuterie = setInterval(() => !document.hidden && chargerMessagerie(), 10000)
    return () => clearInterval(minuterie)
  }, [utilisateur?.id, chargerMessagerie]) // eslint-disable-line react-hooks/exhaustive-deps

  // Adresse directe (?annonce=... ou ?guilde=...): une fois la liste chargée, on montre la bonne section,
  // on enlève les filtres, puis on défile jusqu'à la carte et on la met en évidence un instant.
  useEffect(() => {
    if (!lien || lienTraite) return
    if (lien.type === 'guide') {
      // Un guide ne dépend pas des annonces: on y va tout de suite.
      setLienTraite(true)
      setVue('guides')
      setGuideCible({ valeur: lien.id, n: 1 })
      return
    }
    if (chargement) return
    const liste = lien.type === 'guilde' ? guildes : annonces
    if (liste === null) return
    setLienTraite(true)
    if (!liste.some((x) => x.id === lien.id)) {
      setMessage(`${lien.type === 'guilde' ? 'Cette guilde' : 'Cette annonce'} n'est plus affichée: elle a expiré ou a été retirée.`)
      return
    }
    setVue(lien.type === 'guilde' ? 'guildes' : 'groupes')
    setFiltres(FILTRES_VIDES)
    setCiblee({ type: lien.type, id: lien.id })
  }, [lien, lienTraite, chargement, annonces, guildes])

  useEffect(() => {
    if (!ciblee) return
    const carte = document.getElementById(`${ciblee.type}-${ciblee.id}`)
    if (!carte) return
    const reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    carte.scrollIntoView({ block: 'center', behavior: reduit ? 'auto' : 'smooth' })
    carte.focus({ preventScroll: true })
    carte.classList.add('ciblee')
    const minuterie = setTimeout(() => carte.classList.remove('ciblee'), 3500)
    return () => {
      clearTimeout(minuterie)
      carte.classList.remove('ciblee')
    }
  }, [ciblee])

  // Ton profil de joueur (la liste te renvoie toujours le tien, même caché) et la présence « en ligne ».
  const monProfil = useMemo(() => (joueurs ?? []).find((j) => j.moi) ?? null, [joueurs])
  const partagerPresence = !!monProfil && monProfil.visible

  // Profil obligatoire pour publier: nom, classe, spécialisation, niveau et au moins un rôle. La spécialisation n'est
  // exigée que si la base la connaît (ameliorations4.sql); sans la liste des joueurs, on n'enferme personne.
  const exigerSpec = !monProfil || 'specialisation' in monProfil
  const manquants = champsManquants(monProfil, exigerSpec)
  const besoinProfil = !!utilisateur && joueursPrets && joueurs !== null && manquants.length > 0
  useEffect(() => {
    if (!utilisateur) {
      setEnLigne(new Set())
      return undefined
    }
    return suivrePresence(utilisateur.id, partagerPresence, setEnLigne)
  }, [utilisateur?.id, partagerPresence]) // eslint-disable-line react-hooks/exhaustive-deps

  // « Vu pour la dernière fois »: à l'arrivée, puis toutes les 10 minutes tant que le site est ouvert.
  const aProfil = !!monProfil
  useEffect(() => {
    if (!utilisateur || !aProfil) return undefined
    toucherProfil()
    const minuterie = setInterval(toucherProfil, 600000)
    return () => clearInterval(minuterie)
  }, [utilisateur?.id, aProfil]) // eslint-disable-line react-hooks/exhaustive-deps

  // Le lien « Modération » n'apparaît que pour un modérateur (le serveur revérifie chaque action).
  useEffect(() => {
    let actif = true
    setModerateur(false)
    setModerationOuverte(false)
    if (utilisateur) {
      estModerateur().then((oui) => {
        if (actif) setModerateur(oui)
      })
    }
    return () => {
      actif = false
    }
  }, [utilisateur?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Connexion ou déconnexion: on recharge, car les contacts ne sont envoyés qu'aux gens connectés.
  useEffect(() => {
    demandesVuesRef.current = null // la première lecture des demandes d'un compte n'est pas « nouvelle »
    totauxChatRef.current = null
    setChatCible(null)
    setVueJoueurs('tous')
    setJoueursPrets(false)
    setPublierApresProfil(false)
    charger()
  }, [charger, utilisateur?.id])

  useEffect(() => {
    if (!message) return
    const minuterie = setTimeout(() => setMessage(''), Math.max(3500, message.length * 70))
    return () => clearTimeout(minuterie)
  }, [message])

  useEffect(() => {
    if (!avis) return undefined
    const minuterie = setTimeout(() => setAvis(null), 15000)
    return () => clearTimeout(minuterie)
  }, [avis])

  // De retour sur l'onglet: on enlève le compteur du titre et on relit la permission des notifications.
  useEffect(() => {
    const auRetour = () => {
      if (document.hidden) return
      nonLusRef.current = 0
      document.title = TITRE_PAGE
      setEtatNotif(etatNotifications())
    }
    document.addEventListener('visibilitychange', auRetour)
    return () => document.removeEventListener('visibilitychange', auRetour)
  }, [])

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

  // « Ce soir »: les groupes planifiés qui commencent d'ici la fin de la soirée (4 h du matin), du plus proche départ au
  // plus lointain. Ils passent en haut de la liste. Quand l'agenda (filtre « Planifiés ») est ouvert, il fait déjà ce travail.
  const { ceSoir, autres } = useMemo(() => {
    if (filtres.planifies) return { ceSoir: [], autres: visibles }
    const maintenant = new Date()
    const fin = new Date(maintenant)
    fin.setHours(4, 0, 0, 0)
    if (fin <= maintenant) fin.setDate(fin.getDate() + 1)
    const soir = visibles
      .filter((a) => a.debut && new Date(a.debut) < fin)
      .sort((a, b) => new Date(a.debut) - new Date(b.debut))
    const ids = new Set(soir.map((a) => a.id))
    return { ceSoir: soir, autres: visibles.filter((a) => !ids.has(a.id)) }
  }, [visibles, filtres.planifies])
  const ordre = useMemo(() => (filtres.planifies ? visibles : [...ceSoir, ...autres]), [filtres.planifies, visibles, ceSoir, autres])
  // Une annonce seule dans sa section (« Ce soir », « Autres annonces », un jour de l'agenda) prend toute la largeur: pas de trou à côté.
  const sections = ordre.map((a, i) => (i < ceSoir.length ? 'soir' : filtres.planifies ? jourTexte(a.debut) : 'autres'))
  const seule = (i) => sections[i - 1] !== sections[i] && sections[i + 1] !== sections[i]

  const guildesSansFaction = useMemo(
    () => (guildes ?? []).filter((g) => !filtres.langue || g.langue === filtres.langue),
    [guildes, filtres.langue],
  )
  const guildesVisibles = useMemo(
    () => (filtres.faction ? guildesSansFaction.filter((g) => g.faction === filtres.faction) : guildesSansFaction),
    [guildesSansFaction, filtres.faction],
  )
  const joueursSansFaction = useMemo(
    () => (joueurs ?? []).filter((j) => correspondJoueur(j, filtres, enLigne)),
    [joueurs, filtres, enLigne],
  )
  // En ligne d'abord, puis les plus récemment vus, puis les mieux recommandés.
  const joueursVisibles = useMemo(() => {
    const liste = filtres.faction ? joueursSansFaction.filter((j) => j.faction === filtres.faction) : joueursSansFaction
    return [...liste].sort(
      (a, b) =>
        Number(enLigne.has(b.user_id)) - Number(enLigne.has(a.user_id)) ||
        new Date(b.vu_le) - new Date(a.vu_le) ||
        (b.pouces ?? -1) - (a.pouces ?? -1),
    )
  }, [joueursSansFaction, filtres.faction, enLigne])
  const comptes = vue === 'guildes' ? guildesSansFaction : vue === 'joueurs' ? joueursSansFaction : sansFaction
  // Nombre d'annonces par type, avec tous les autres filtres appliqués.
  const sansActivite = useMemo(
    () => annonces.filter((a) => correspond(a, { ...filtres, activite: 'tout' })),
    [annonces, filtres],
  )
  const nombreActivite = (id) => (id === 'tout' ? sansActivite.length : sansActivite.filter((a) => a.activite === id).length)
  const nbPlanifies = useMemo(() => annonces.filter((a) => a.debut).length, [annonces])

  const filtresActifs = CLES_GROUPES.some((k) => filtres[k] !== FILTRES_VIDES[k])
  const filtresJoueursActifs = CLES_JOUEURS.some((k) => filtres[k] !== FILTRES_VIDES[k])
  const nbAutres = [filtres.region, filtres.role, filtres.style].filter(Boolean).length
  const raids = raidsOuverts()
  const compte = compteARebours()

  const changer = (cle) => (e) => setFiltres((f) => ({ ...f, [cle]: e.target.value }))
  const basculerFaction = (id) => setFiltres((f) => ({ ...f, faction: f.faction === id ? '' : id }))
  const basculer = (cle, valeur) => setFiltres((f) => ({ ...f, [cle]: f[cle] === valeur ? FILTRES_VIDES[cle] : valeur }))
  const ouvrirConnexion = () => setFormulaireOuvert(true)
  // « Publier une annonce »: sans profil complet, on commence par le profil, puis le formulaire s'ouvre tout seul.
  const completerProfil = () => {
    setFormulaireOuvert(false)
    setPublierApresProfil(true)
    setProfilOuvert(true)
  }
  const ouvrirPublication = () => (besoinProfil ? completerProfil() : setFormulaireOuvert(true))
  const joueursParId = useMemo(() => new Map((joueurs ?? []).map((j) => [j.user_id, j])), [joueurs])
  const liensAmis = useMemo(() => new Map((amis ?? []).map((a) => [a.user_id, a.lien])), [amis])
  const nbDemandesAmis = (amis ?? []).filter((a) => a.lien === 'recue').length
  const demandesParAnnonce = useMemo(() => new Map((mesDemandes ?? []).map((d) => [d.annonce_id, d])), [mesDemandes])
  const groupesParAnnonce = useMemo(
    () => new Map((conversations ?? []).filter((c) => c.type === 'groupe' && c.annonce_id).map((c) => [c.annonce_id, c])),
    [conversations],
  )
  // Les chats de groupe vivent sur les annonces (onglet Groupes); l'onglet Messages garde la Taverne et les amis.
  const finieConv = (c) => !!c.fin_le && new Date(c.fin_le).getTime() <= Date.now()
  const nbGroupesAlerte = (conversations ?? [])
    .filter((c) => c.type === 'groupe' && !finieConv(c))
    .reduce((n, c) => n + (c.nb_en_attente || 0) + (c.non_lus || 0), 0)
  const nbMessagerie = (conversations ?? [])
    .filter((c) => c.type !== 'groupe')
    .reduce((n, c) => n + (c.nb_en_attente || 0) + (c.non_lus || 0), 0)
  const ouvrirChat = useCallback((type, id, panneau) => {
    setVue('messages')
    setChatCible({ type, id, panneau, n: Date.now() })
  }, [])
  const contexteChat = useMemo(() => ({ ouvrirAmi: (id) => ouvrirChat('ami', id) }), [ouvrirChat])
  // Depuis une annonce: aller au profil de son auteur, dans l'onglet Joueurs.
  const voirProfil = (id) => {
    setVue('joueurs')
    setVueJoueurs('tous')
    setFiltres(FILTRES_VIDES)
    setCiblee({ type: 'joueur', id })
  }
  // Depuis la carte d'un joueur: aller à son annonce, dans l'onglet Groupes.
  const voirAnnonce = (id) => {
    setVue('groupes')
    setFiltres(FILTRES_VIDES)
    setCiblee({ type: 'annonce', id })
  }

  // Depuis une annonce de donjon: ouvrir le guide de ce donjon.
  const voirGuide = (donjon) => {
    setVue('guides')
    setGuideCible({ valeur: donjon, n: Date.now() })
  }

  // Depuis une alerte: une seule annonce -> on va à sa carte; plusieurs -> on montre la liste avec les filtres de l'alerte.
  const voirAvis = (a) => {
    setAvis(null)
    setVue('groupes')
    setFiltres(a.ids.length > 1 && alerte ? { ...FILTRES_VIDES, ...alerte.filtres } : FILTRES_VIDES)
    setCiblee({ type: 'annonce', id: a.ids[0] })
  }
  voirAvisRef.current = voirAvis

  // Active les alertes de cet appareil (notifications même site fermé). Retourne true si c'est fait.
  const activerAppareil = async () => {
    if (!utilisateur || !pushConfigure) return false
    setOccupeAlertes(true)
    setProblemeAlertes('')
    try {
      await activerPush(utilisateur.id)
      setEtatNotif(etatNotifications())
      return true
    } catch (e) {
      setProblemeAlertes(
        e?.code === 'refuse'
          ? 'Les alertes sont refusées. Autorise-les dans les réglages du site de ton navigateur, puis réessaie.'
          : "Les alertes n'ont pas pu être activées. Réessaie dans un instant.",
      )
      setEtatNotif(etatNotifications())
      return false
    } finally {
      setOccupeAlertes(false)
    }
  }

  const activerAlerte = async () => {
    const regle = { filtres: filtresDeAlerte(filtres) }
    ecrireAlerte(regle)
    setAlerte(regle)
    // Connecté avec des alertes possibles sur cet appareil: on les active aussi (un seul clic, une seule permission).
    if (pushEtat?.supporte && !pushEtat.bloque && !pushEtat.actif && (await activerAppareil())) {
      setMessage("Alerte activée. Tu seras averti sur cet appareil même quand le site est fermé.")
      return
    }
    const etat = await demanderNotifications()
    setEtatNotif(etat)
    setMessage(
      pushEtat?.actif
        ? "Alerte activée. Tu seras averti sur cet appareil même quand le site est fermé."
        : etat === 'autorisees'
          ? 'Alerte activée. Une notification du navigateur t\'avertira quand le site est dans un autre onglet.'
          : 'Alerte activée. Tu seras averti dans la page.',
    )
  }
  const remplacerAlerte = () => {
    const regle = { filtres: filtresDeAlerte(filtres) }
    ecrireAlerte(regle)
    setAlerte(regle)
    setMessage('Alerte mise à jour avec tes filtres.')
  }
  const arreterAlerte = async () => {
    // D'abord le serveur: sinon la page reprendrait l'alerte du compte en voyant qu'il n'y en a plus ici.
    if (utilisateur && pushConfigure) await retirerAlerteAnnonces()
    syncAlerteRef.current = ''
    setAlerteServeur(false)
    ecrireAlerte(null)
    setAlerte(null)
    setMessage('Alerte arrêtée.')
  }

  // Invitation à activer les alertes: connecté, alertes possibles ici (ou iPhone à installer), pas encore activées.
  const invitationIos = !!utilisateur && !!pushEtat && !pushEtat.supporte && surIos() && !dejaInstalle()
  const invitationVisible =
    invitation && !!utilisateur && pushConfigure && !!pushEtat && !pushEtat.actif && !pushEtat.bloque && (pushEtat.supporte || invitationIos)
  const plusTardAlertes = () => {
    reporterInvitationAlertes()
    setInvitation(false)
  }
  const activerDepuisInvitation = async () => {
    if (await activerAppareil()) setMessage('Alertes activées sur cet appareil.')
  }
  const autoriserNotifications = async () => setEtatNotif(await demanderNotifications())

  return (
    <OuvrirChat.Provider value={contexteChat}>
    <Supporters.Provider value={supporters}>
      <Ruban
        connecte={!!utilisateur}
        onClick={() => (utilisateur ? setProfilOuvert(true) : ouvrirConnexion())}
      />

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
              <a
                href="/"
                className="titre-lien"
                aria-label="Babillard Forever, retour à l'accueil"
                onClick={(e) => {
                  if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return // ouvrir dans un nouvel onglet: comportement normal
                  e.preventDefault()
                  setVue('groupes')
                  setChatCible(null)
                  setCiblee(null)
                  window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
                }}
              >
                <span>Babillard</span> <span>Forever</span>
              </a>
            </h1>
            <p className="sous-titre">
              Trouve ton groupe pour les donjons{raids ? ', les raids' : ''}, le PvP et les quêtes. Pour le Québec et la
              francophonie.
            </p>
            <p className="beta-note">
              <span className="etiquette-beta">Bêta</span>
              Le site est en test: des bogues sont possibles.
              <button type="button" className="lien" onClick={() => setRetourOuvert(true)}>Écris-nous</button>
            </p>
            <div className="actions">
              {utilisateur ? (
                <div className="session">
                  <span className="session-id">
                    <span className="session-avatar" aria-hidden="true">{(utilisateur.nom || '?').trim().charAt(0).toUpperCase()}</span>
                    <span className="session-nom">
                      <small>Connecté</small>
                      <strong>{utilisateur.nom}</strong>
                    </span>
                  </span>
                  <span className="session-actions">
                    <button type="button" className="session-bouton" onClick={() => setProfilOuvert(true)}>
                      <Icone nom="joueur" taille={15} />
                      Mon profil
                    </button>
                    {moderateur && (
                      <button type="button" className="session-bouton" onClick={() => setModerationOuverte(true)}>
                        <Icone nom="bouclier" taille={15} />
                        Modération
                      </button>
                    )}
                    <button type="button" className="session-bouton discret" onClick={async () => { await retirerAlertesAppareil(); await deconnecter() }}>
                      <Icone nom="sortie" taille={15} />
                      Se déconnecter
                    </button>
                  </span>
                </div>
              ) : (
                <button type="button" className="bouton" onClick={ouvrirConnexion}>
                  Se connecter
                </button>
              )}
              <button type="button" className="bouton principal" onClick={ouvrirPublication}>
                Publier une annonce
              </button>
              <button type="button" className="bouton bouton-taverne" onClick={() => ouvrirChat('salon', 'taverne')}>
                <Icone nom="discussion" taille={18} />
                Taverne
              </button>
              {lienDons && (
                <a className="bouton bouton-soutien" href={lienDons} target="_blank" rel="noopener noreferrer">
                  <Icone nom="coeur" taille={18} />
                  Soutenir le site
                </a>
              )}
            </div>
            <div className="statut">
              {!chargement && (
                <p className="vivant">
                  <span className="point" aria-hidden="true" />
                  {annonces.length === 0
                    ? "Aucune annonce pour l'instant. Sois le premier."
                    : `${annonces.length} ${annonces.length > 1 ? 'annonces actives' : 'annonce active'} en ce moment`}
                </p>
              )}
              {formes !== null && formes > 0 && (
                <p className="compte formes">
                  <Icone nom="donjon" taille={16} />
                  <span>{formes} {formes > 1 ? 'groupes formés' : 'groupe formé'} aujourd'hui</span>
                </p>
              )}
              {visites !== null && (
                <p className="compte visites">
                  <Icone nom="amis" taille={16} />
                  <span>{visites} {visites > 1 ? 'visiteurs' : 'visiteur'} aujourd'hui</span>
                </p>
              )}
              {compte && (
                <p className="compte">
                  <Icone nom="horloge" taille={16} />
                  <span>
                    {compte.cible ? <>{compte.prefixe} <Decompte fin={compte.cible} /></> : compte.texte}
                    {compte.date && <span className="compte-date"> ({compte.date})</span>}
                  </span>
                </p>
              )}
              <button
                type="button"
                role="switch"
                className="bouton-son"
                aria-checked={son}
                aria-label="Sons de notification"
                onClick={() => {
                  setSon(!son)
                  reglerSon(!son)
                }}
              >
                <Icone nom={son ? 'son' : 'sonCoupe'} taille={15} />
                <span>Sons</span>
                <span className="interrupteur" aria-hidden="true">
                  <span className="interrupteur-bouton" />
                </span>
              </button>
              <button type="button" className="lien aide-lien" onClick={() => setAideOuverte(true)}>
                Comment ça marche?
              </button>
              <BoutonInstaller classe="lien aide-lien" />
            </div>
          </div>
          <div className="styles" role="group" aria-label="Apparence du site">
            {STYLES_SITE.map(([id, nom]) => (
              <button
                key={id || 'neutre'}
                type="button"
                data-style={id || 'neutre'}
                aria-pressed={styleSite === id}
                title={`Style ${nom}`}
                onClick={() => choisirStyle(id)}
              >
                {nom}
              </button>
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

        {invitationVisible && (
          <InvitationAlertes
            ios={invitationIos}
            activer={activerDepuisInvitation}
            plusTard={plusTardAlertes}
            occupe={occupeAlertes}
            probleme={problemeAlertes}
          />
        )}

        <div className="barre">
          <div className="onglets" role="group" aria-label="Section du site">
            <button type="button" className="onglet" aria-pressed={vue === 'groupes'} onClick={() => setVue('groupes')}>
              <Icone nom="donjon" taille={22} />
              <span className="onglet-nom">Groupes</span> <span className="onglet-nombre">{annonces.length}</span>
              {utilisateur && nbGroupesAlerte > 0 && (
                <span className="onglet-alerte en-ligne" role="img" aria-label={`${nbGroupesAlerte} à voir dans tes groupes`}>
                  {nbGroupesAlerte}
                </span>
              )}
            </button>
            <button type="button" className="onglet" aria-pressed={vue === 'guildes'} onClick={() => setVue('guildes')}>
              <Icone nom="guilde" taille={22} />
              <span className="onglet-nom">Guildes</span> <span className="onglet-nombre">{guildes ? guildes.length : 0}</span>
            </button>
            <button type="button" className="onglet" aria-pressed={vue === 'joueurs'} onClick={() => setVue('joueurs')}>
              <Icone nom="joueur" taille={22} />
              <span className="onglet-nom">Joueurs</span>
              {utilisateur && joueurs && <span className="onglet-nombre">{joueurs.length}</span>}
              {utilisateur && nbDemandesAmis > 0 && (
                <span
                  className="onglet-alerte"
                  role="img"
                  aria-label={`${nbDemandesAmis} ${nbDemandesAmis > 1 ? 'demandes' : 'demande'} d'ami`}
                >
                  {nbDemandesAmis}
                </span>
              )}
            </button>
            <button type="button" className="onglet" aria-pressed={vue === 'messages'} onClick={() => setVue('messages')}>
              <Icone nom="discussion" taille={22} />
              <span className="onglet-nom">Messages</span>
              {utilisateur && nbMessagerie > 0 && (
                <span className="onglet-alerte en-ligne" role="img" aria-label={`${nbMessagerie} à voir dans les messages`}>
                  {nbMessagerie}
                </span>
              )}
            </button>
            <button type="button" className="onglet" aria-pressed={vue === 'guides'} onClick={() => setVue('guides')}>
              <Icone nom="livre" taille={22} />
              <span className="onglet-nom">Guides</span>
            </button>
          </div>

          {vue !== 'guides' && vue !== 'messages' && (
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
          )}
        </div>

        {vue === 'guides' ? (
          <Suspense fallback={<p className="aide" role="status">Chargement des guides…</p>}>
            <Guides cible={guideCible} />
          </Suspense>
        ) : vue === 'messages' ? (
          <SectionMessages
            utilisateur={utilisateur}
            onConnexion={ouvrirConnexion}
            conversations={conversations}
            demandes={mesDemandes}
            amis={amis}
            cible={chatCible}
            apres={chargerMessagerie}
            annoncer={setMessage}
            aProfil={aProfil}
            ouvrirProfil={() => setProfilOuvert(true)}
          />
        ) : vue === 'joueurs' ? (
          <SectionJoueurs
            apercu={apercuJoueurs}
            joueurs={joueurs}
            visibles={joueursVisibles}
            enLigne={enLigne}
            utilisateur={utilisateur}
            monProfil={monProfil}
            onConnexion={ouvrirConnexion}
            ouvrirProfil={() => setProfilOuvert(true)}
            apres={charger}
            annoncer={setMessage}
            voirAnnonce={voirAnnonce}
            amis={amis}
            liens={liensAmis}
            sousVue={vueJoueurs}
            changerSousVue={setVueJoueurs}
            apresAmis={chargerAmis}
            filtres={filtres}
            changer={changer}
            basculer={basculer}
            filtresActifs={filtresJoueursActifs}
            effacerFiltres={() =>
              setFiltres((f) => ({ ...f, ...Object.fromEntries(CLES_JOUEURS.map((k) => [k, FILTRES_VIDES[k]])) }))
            }
          />
        ) : vue === 'guildes' ? (
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
                    ['quete', 'Quêtes'],
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

            <Alerte
              alerte={alerte}
              filtres={filtres}
              etat={etatNotif}
              activer={activerAlerte}
              remplacer={remplacerAlerte}
              arreter={arreterAlerte}
              autoriser={autoriserNotifications}
              appareil={pushEtat}
              serveur={alerteServeur}
              activerAppareil={activerAppareil}
              occupe={occupeAlertes}
            />
            {problemeAlertes && alerte && <p className="erreur" role="alert">{problemeAlertes}</p>}

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
                <button type="button" className="bouton" onClick={ouvrirPublication}>
                  Publier la première annonce
                </button>
              </div>
            ) : (
              <ul className="liste">
                {ordre.map((a, i) => (
                  <Fragment key={a.id}>
                    {filtres.planifies && (i === 0 || jourTexte(a.debut) !== jourTexte(ordre[i - 1].debut)) && (
                      <li className="jour"><h2>{jourTexte(a.debut)}</h2></li>
                    )}
                    {ceSoir.length > 0 && i === 0 && (
                      <li className="jour jour-soir">
                        <h2>
                          <Icone nom="horloge" taille={18} />
                          Ce soir
                          <span className="jour-nombre">{ceSoir.length}</span>
                        </h2>
                      </li>
                    )}
                    {ceSoir.length > 0 && autres.length > 0 && i === ceSoir.length && (
                      <li className="jour"><h2>Autres annonces</h2></li>
                    )}
                    <li className={seule(i) ? 'seule' : undefined}>
                      <Carte
                        annonce={a}
                        nouvelle={nouvelles.has(a.id)}
                        profil={joueursParId.get(a.user_id)}
                        voirProfil={voirProfil}
                        voirGuide={voirGuide}
                        proprietaire={!!utilisateur && a.user_id === utilisateur.id}
                        utilisateur={utilisateur}
                        onConnexion={ouvrirConnexion}
                        apres={charger}
                        demande={demandesParAnnonce.get(a.id)}
                        conv={groupesParAnnonce.get(a.id)}
                        places={places.get(a.id)}
                        repetition={recurrences.find((r) => r.source === a.id || r.derniere === a.id)}
                        messagerie={conversations !== null}
                        ouvrirDemande={setDemandeAnnonce}
                        annoncer={setMessage}
                      />
                    </li>
                  </Fragment>
                ))}
              </ul>
            )}
            <Pub masquer={!!utilisateur && supporters.has(utilisateur.id)} />
          </>
        )}

        <footer className="pied">
          <Achalandage />
          <p className="pied-note">
            Les annonces disparaissent toutes seules quand leur durée est écoulée. Dans Forever, les groupes
            Alliance et Horde ne se mélangent pas.
          </p>
          <div className="pied-zones">
            <nav className="pied-liens" aria-label="Aide et contact">
              <button type="button" className="lien" onClick={() => setAideOuverte(true)}>
                Comment ça marche, règles et données personnelles
              </button>
              <button type="button" className="lien" onClick={() => setRetourOuvert(true)}>
                Un bogue ou une idée?
              </button>
              <BoutonInstaller />
            </nav>
            <div className="pied-soutien">
              <ChoixPubs />
              {lienDons && (
                <p className="soutien">
                  <a className="bouton petit" href={lienDons} target="_blank" rel="noopener noreferrer">
                    <Icone nom="coeur" taille={15} />
                    Soutenir le site
                  </a>
                  <span className="aide">
                    {pubsActives
                      ? 'Le site est gratuit. Un don aide à le garder en ligne. Les supporters reçoivent un badge et ne voient pas la pub.'
                      : 'Le site est gratuit et sans pub. Un don aide à le garder en ligne. Les supporters reçoivent un badge.'}
                  </span>
                </p>
              )}
            </div>
          </div>
          <p className="avis">
            Babillard Forever est un site de fans, sans lien avec Blizzard Entertainment. World of Warcraft est une
            marque de Blizzard Entertainment, Inc.
          </p>
        </footer>
      </main>

      {vue !== 'guides' && vue !== 'messages' && (
        <button type="button" className="fab" onClick={ouvrirPublication}>
          <Icone nom="plus" taille={22} />
          Publier
        </button>
      )}

      <Aide ouvert={aideOuverte} fermer={() => setAideOuverte(false)} />
      {retourOuvert && (
        <DialogueRetour
          fermer={() => setRetourOuvert(false)}
          utilisateur={utilisateur}
          onConnexion={ouvrirConnexion}
          annoncer={setMessage}
        />
      )}
      <BandeauPubs />
      {nouveauMdp && <NouveauMotDePasse fermer={() => setNouveauMdp(false)} annoncer={setMessage} />}

      <DialogueDemande
        annonce={demandeAnnonce}
        fermer={() => setDemandeAnnonce(null)}
        profil={monProfil}
        ouvrirProfil={() => setProfilOuvert(true)}
        apres={charger}
        annoncer={setMessage}
      />

      {moderateur && moderationOuverte && (
        <Suspense fallback={null}>
          <Moderation ouvert fermer={() => setModerationOuverte(false)} apres={charger} annoncer={setMessage} />
        </Suspense>
      )}

      <ProfilJoueur
        ouvert={profilOuvert && !!utilisateur}
        fermer={() => {
          setProfilOuvert(false)
          setPublierApresProfil(false)
        }}
        profil={monProfil}
        factionParDefaut={styleSite === 'horde' ? 'horde' : 'alliance'}
        apres={charger}
        annoncer={setMessage}
        pourPublier={publierApresProfil}
        exigerSpec={exigerSpec}
        apresEnregistrement={() => {
          if (publierApresProfil) setFormulaireOuvert(true)
        }}
      />

      <Formulaire
        factionParDefaut={styleSite === 'horde' ? 'horde' : 'alliance'}
        utilisateur={utilisateur}
        ouvert={formulaireOuvert}
        fermer={() => setFormulaireOuvert(false)}
        profil={monProfil}
        manquants={besoinProfil ? manquants : []}
        completerProfil={completerProfil}
        apresPublication={async (note) => {
          setFormulaireOuvert(false)
          setMessage(note ? `Annonce publiée. ${note}` : 'Annonce publiée.')
          setVue('groupes')
          await charger()
        }}
      />

      {avis && (
        <div className="toast alerte-toast" role="status">
          <Icone nom="cloche" taille={16} />
          <span>{avis.texte}</span>
          <button type="button" className="lien" onClick={() => voirAvis(avis)}>Voir</button>
          <button type="button" className="lien" onClick={() => setAvis(null)}>Fermer</button>
        </div>
      )}

      {message && <div className="toast" role="status">{message}</div>}
    </Supporters.Provider>
    </OuvrirChat.Provider>
  )
}

// ---------- Carte d'annonce ----------

function Carte({ annonce: a, nouvelle, profil, voirProfil, voirGuide, proprietaire, utilisateur, onConnexion, apres, demande, conv, places, repetition, messagerie, ouvrirDemande, annoncer }) {
  const [probleme, setProbleme] = useState('')
  const joueur = a.genre === 'joueur'
  const classe = CLASSES.find((c) => c.id === a.classe)
  // Raid qui cherche un nombre précis de joueurs par rôle (ex.: 2 tanks, 5 heals, 12 DPS).
  const composition = a.activite === 'raid' && a.roles_nb ? a.roles_nb : null
  const tailleRaid = a.activite === 'raid' ? RAIDS.find((r) => r.nom === a.cible)?.taille : undefined
  const acceptes = places?.acceptes ?? 0
  const parRole = places?.par_role ?? {}
  // Ce qui reste à trouver: la composition du raid moins les joueurs déjà acceptés.
  const restant = (r) => (composition ? Math.max(0, (composition[r] || 0) - (parRole[r] || 0)) : 0)
  const manque = composition ? ROLES.reduce((n, r) => n + restant(r.id), 0) : 0
  const rolesVisibles = ROLES.filter((r) => a.roles.includes(r.id) && !(composition?.[r.id] > 0 && restant(r.id) === 0))
  const groupeComplet = !joueur && (!!places?.complet || (!SANS_ROLES.has(a.activite) && a.roles.length === 0))
  const effectif = tailleRaid ? Math.max(0, tailleRaid - manque) : 0
  const dureeTotale = new Date(a.expires_at) - new Date(a.created_at)
  const peutRenouveler = !a.debut && partRestante(a) < 0.5
  const aGuide = a.activite === 'donjon' && AVEC_GUIDE.has(a.cible)

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
    <article className={`carte ${a.faction}`} id={`annonce-${a.id}`} tabIndex={-1}>
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
          {nouvelle && <li className="chip nouveau">Nouveau</li>}
          <ChipClasse classe={a.classe} specialisation={profil?.classe === a.classe ? profil?.specialisation : ''} />
          {a.activite === 'raid' && (
            <li className="chip fort">{RAIDS.find((r) => r.nom === a.cible)?.taille ?? ''} joueurs</li>
          )}
          {!joueur && acceptes > 0 && (
            <li className="chip fort">
              {a.activite === 'donjon' || a.activite === 'quete' ? `${acceptes} / 4 acceptés` : `${acceptes} accepté${acceptes > 1 ? 's' : ''}`}
            </li>
          )}
          {a.debut && (
            <li className="chip depart">
              <Icone nom="horloge" taille={14} />
              Départ {departTexte(a.debut)}
            </li>
          )}
          {a.debut && repetition && (
            <li className="chip">Chaque {new Date(a.debut).toLocaleDateString('fr-CA', { weekday: 'long' })}</li>
          )}
          {a.activite !== 'pvp' && a.ruleset && a.ruleset !== 'normal' && (
            <li className="chip">{RULESETS.find((r) => r.id === a.ruleset)?.carte ?? a.ruleset}</li>
          )}
          <li className="chip">{a.region}</li>
          {a.style && <li className="chip">{nomDe(STYLES, a.style)}</li>}
          {a.langue && <li className="chip">{a.langue === 'en' ? 'English' : 'Français'}</li>}
        </ul>

        {rolesVisibles.length > 0 && (
          <p className="roles">
            <span>{joueur ? 'Joue' : 'Cherche'}</span>
            {rolesVisibles.map((r) => (
              <span key={r.id} className={`role ${r.id}`}>
                <Icone nom={r.id} taille={15} />
                {r.nom}
                {composition?.[r.id] > 0 && <span className="role-nombre">×{restant(r.id)}</span>}
              </span>
            ))}
          </p>
        )}

        {composition && tailleRaid > 0 && manque > 0 && (
          <div
            className="effectif"
            role="img"
            aria-label={`Le groupe compte ${effectif} joueurs sur ${tailleRaid}. Il en manque ${manque}.`}
          >
            <span className="effectif-barre"><span style={{ width: `${Math.round((effectif / tailleRaid) * 100)}%` }} /></span>
            <span className="effectif-texte">{effectif} / {tailleRaid} joueurs</span>
          </div>
        )}

        {groupeComplet && (
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
              <span className="auteur-nom">
                <strong>{a.perso}</strong>
                <BadgeSupporter id={a.user_id} />
                {profil && !profil.en_revision && profil.pouces > 0 && (
                  <span className="respect-mini" title={`Respect: ${profil.pouces} ${profil.pouces > 1 ? 'pouces' : 'pouce'}`}>
                    <Icone nom="pouce" taille={13} />
                    {profil.pouces}
                    <span className="sr"> {profil.pouces > 1 ? 'pouces' : 'pouce'} de respect</span>
                  </span>
                )}
              </span>
              <DureeAnnonce annonce={a} />
            </div>
          </div>
        </div>

        <ZoneRejoindre
          annonce={a}
          proprietaire={proprietaire}
          utilisateur={utilisateur}
          onConnexion={onConnexion}
          demande={demande}
          conv={conv}
          disponible={messagerie}
          complet={groupeComplet}
          ouvrirDemande={ouvrirDemande}
          apres={apres}
          annoncer={annoncer}
        />

        {!proprietaire && <CommandeAnnonce annonce={a} />}

        {proprietaire ? (
          <div className="gestion">
            {!joueur &&
              ROLES.filter((r) => a.roles.includes(r.id)).map((r) => (
                <button key={r.id} type="button" className="bouton petit" onClick={() => gerer(() => retirerRole(a, r.id))}>
                  {r.nom} trouvé
                </button>
              ))}
            {peutRenouveler && (
              <button type="button" className="bouton petit" onClick={() => gerer(() => renouvelerAnnonce(a))}>
                Renouveler pour {Math.max(1, Math.round(Math.min(dureeTotale, 6 * 3600000) / 3600000))} h
              </button>
            )}
            <button type="button" className="bouton petit danger" onClick={() => gerer(() => retirerAnnonce(a.id))}>
              {joueur ? "J'ai trouvé un groupe" : "Retirer l'annonce"}
            </button>
            {a.debut && !joueur && (
              repetition ? (
                <button type="button" className="bouton petit" onClick={() => gerer(() => arreterRecurrence(repetition.id))}>
                  Arrêter la répétition
                </button>
              ) : (
                <button type="button" className="bouton petit" onClick={() => gerer(() => creerRecurrence(a.id))}>
                  Répéter chaque semaine
                </button>
              )
            )}
            {a.debut && (
              <button type="button" className="lien signaler" onClick={() => telechargerIcs(a)}>
                Ajouter à mon calendrier
              </button>
            )}
            {aGuide && (
              <button type="button" className="lien signaler" onClick={() => voirGuide(a.cible)}>
                Voir le guide
              </button>
            )}
            <LienDirect type="annonce" id={a.id} invitation={!joueur} titre={a.cible} />
            {probleme && <p className="msg-erreur" role="alert">{probleme}</p>}
          </div>
        ) : (
          <div className="signaler-ligne">
            {profil && (
              <button type="button" className="lien signaler" onClick={() => voirProfil(profil.user_id)}>
                Voir le profil
              </button>
            )}
            {a.debut && (
              <button type="button" className="lien signaler" onClick={() => telechargerIcs(a)}>
                Ajouter à mon calendrier
              </button>
            )}
            {aGuide && (
              <button type="button" className="lien signaler" onClick={() => voirGuide(a.cible)}>
                Voir le guide
              </button>
            )}
            <LienDirect type="annonce" id={a.id} />
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
  roles_nb: { tank: 0, heal: 0, dps: 0 }, // raids seulement: combien de joueurs par rôle
  perso: '',
  contact: '',
  note: '',
  quand: 'maintenant',
  debut: '',
  heures: 3,
  repeter: false,
}

const totalNombres = (nb) => ROLES.reduce((n, r) => n + (nb?.[r.id] ?? 0), 0)

// Ce qui est gardé dans le navigateur d'une annonce à l'autre.
const CHAMPS_DU_PROFIL = ['perso', 'classe', 'contact', 'faction', 'region', 'langue']
const versProfil = (champs) => Object.fromEntries(CHAMPS_DU_PROFIL.map((cle) => [cle, champs[cle]]))

// La dernière annonce publiée, pour la reprendre en un clic (gardée seulement dans ce navigateur).
const CLE_DERNIERE = 'forever-derniere-annonce'
const CHAMPS_DERNIERE = ['genre', 'activite', 'cible', 'faction', 'style', 'langue', 'classe', 'region', 'niveau_min', 'niveau_max', 'roles', 'roles_nb', 'perso', 'contact', 'note', 'heures']

function lireDerniere(id) {
  try {
    const brut = JSON.parse(localStorage.getItem(CLE_DERNIERE) || 'null')
    return brut && brut.uid === id && brut.champs ? brut.champs : null
  } catch {
    return null
  }
}

function ecrireDerniere(id, champs) {
  try {
    localStorage.setItem(CLE_DERNIERE, JSON.stringify({ uid: id, champs: Object.fromEntries(CHAMPS_DERNIERE.map((c) => [c, champs[c]])) }))
  } catch {
    // navigation privée: la reprise n'est simplement pas offerte
  }
}

const CHOIX_GENRE = [
  ['groupe', 'Un groupe', 'On cherche des joueurs.'],
  ['joueur', 'Un joueur seul', 'Je cherche un groupe.'],
]

const CHOIX_ACTIVITE = [
  ['donjon', 'Un donjon', 'Un donjon à faire.'],
  ['raid', 'Un raid', '10, 20 ou 40 joueurs.'],
  ['pvp', 'Du PvP', 'Champ de bataille ou monde ouvert.'],
  ['quete', 'Des quêtes', 'Monter de niveau ensemble.'],
]

function Formulaire({ factionParDefaut, utilisateur, ouvert, fermer, apresPublication, profil, manquants, completerProfil }) {
  const dialogue = useRef(null)
  const [champs, setChamps] = useState(() => {
    const profil = lireProfil()
    const garde = Object.fromEntries(
      CHAMPS_DU_PROFIL.filter((cle) => typeof profil[cle] === 'string' && profil[cle]).map((cle) => [cle, profil[cle]]),
    )
    return { ...FORMULAIRE_VIDE, faction: factionParDefaut, ...garde }
  })
  const [erreurs, setErreurs] = useState({})
  const [derniere, setDerniere] = useState(null)
  const [envoi, setEnvoi] = useState(false)
  const [erreurServeur, setErreurServeur] = useState('')
  const raids = raidsOuverts()
  const premierPassage = useRef(true)

  useEffect(() => {
    const d = dialogue.current
    if (!d) return
    if (ouvert && !d.open) {
      setDerniere(lireDerniere(utilisateur?.id))
      // Le personnage de l'annonce est celui du profil (modifiable pour cette annonce seulement).
      if (profil) {
        setChamps((c) => ({
          ...c,
          perso: profil.perso || c.perso,
          classe: profil.classe || c.classe,
          faction: profil.faction || c.faction,
          region: profil.region || c.region,
          langue: profil.langue || c.langue,
        }))
      }
      d.showModal()
    }
    if (!ouvert && d.open) d.close()
    // Le profil sert seulement à l'ouverture: une relecture de la liste ne doit pas écraser ce que la personne écrit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    activite === 'pvp' ? PVP_PEU_IMPORTE : activite === 'quete' ? QUETE_PEU_IMPORTE : genre === 'joueur' && activite === 'donjon' ? DONJON_PEU_IMPORTE : ''

  // Un joueur seul n'a qu'un niveau (le sien): on garde minimum et maximum identiques.
  const changerGenre = (genre) => {
    setChamps((c) => ({
      ...c,
      genre,
      // Dans un raid, les rôles sont choisis autrement (nombres ou cases): on repart de zéro.
      ...(c.activite === 'raid' ? { roles: [], roles_nb: { ...FORMULAIRE_VIDE.roles_nb } } : {}),
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
      roles_nb: { ...FORMULAIRE_VIDE.roles_nb },
      niveau_min: activite === 'raid' ? '60' : c.activite === 'raid' ? '' : c.niveau_min,
      niveau_max: activite === 'raid' ? '60' : c.activite === 'raid' ? '' : c.niveau_max,
    }))
    setErreurs((e) => ({ ...e, cible: undefined, roles: undefined, niveau_min: undefined, niveau_max: undefined }))
  }

  // Pour un groupe, choisir un donjon remplit les niveaux suggérés (modifiables ensuite).
  const choisirCible = (cible) => {
    const plage = NIVEAUX_DONJONS[cible]
    const tailleRaid = RAIDS.find((r) => r.nom === cible)?.taille
    setChamps((c) => ({
      ...c,
      cible,
      // Un raid plus petit: si le nombre de joueurs recherchés ne tient plus, on repart de zéro.
      ...(c.activite === 'raid' && tailleRaid && totalNombres(c.roles_nb) > tailleRaid - 1
        ? { roles: [], roles_nb: { ...FORMULAIRE_VIDE.roles_nb } }
        : {}),
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

  // Raid: ajouter ou enlever un joueur recherché pour un rôle. Le groupe compte déjà son auteur,
  // donc on ne peut pas chercher plus que (taille du raid - 1) joueurs.
  const changerNombre = (id, delta) => {
    setChamps((c) => {
      const taille = RAIDS.find((r) => r.nom === c.cible)?.taille ?? 40
      if (delta > 0 && totalNombres(c.roles_nb) >= taille - 1) return c
      const nb = { ...c.roles_nb, [id]: Math.max(0, c.roles_nb[id] + delta) }
      return { ...c, roles_nb: nb, roles: ROLES.filter((r) => nb[r.id] > 0).map((r) => r.id) }
    })
    setErreurs((e) => (e.roles ? { ...e, roles: undefined } : e))
  }

  const reprendre = () => {
    setChamps((c) => ({ ...c, ...derniere, quand: 'maintenant', debut: '' }))
    setErreurs({})
    setDerniere(null)
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
    if (!champs.contact.trim()) e.contact = 'Écris ton BattleTag pour que les gens te trouvent.'
    if (!SANS_ROLES.has(champs.activite) && champs.roles.length === 0) {
      e.roles = joueur
        ? 'Choisis au moins un rôle que tu joues.'
        : champs.activite === 'raid'
          ? 'Indique combien de joueurs tu cherches pour au moins un rôle.'
          : 'Choisis au moins un rôle recherché.'
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
      const publiee = await creerAnnonce(
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
          roles: SANS_ROLES.has(champs.activite) ? [] : champs.roles,
          // Seuls les raids envoient les nombres: un donjon continue de fonctionner même si la base n'est pas à jour.
          ...(champs.activite === 'raid' && !joueur
            ? { roles_nb: Object.fromEntries(ROLES.filter((r) => champs.roles_nb[r.id] > 0).map((r) => [r.id, champs.roles_nb[r.id]])) }
            : {}),
          perso: champs.perso.trim(),
          contact: champs.contact.trim(),
          note: champs.note.trim(),
          debut: champs.quand === 'plus_tard' ? new Date(champs.debut).toISOString() : null,
        },
        Number(champs.heures),
      )
      let note = ''
      if (champs.repeter && champs.quand === 'plus_tard' && !joueur) {
        try {
          await creerRecurrence(publiee.id)
          note = 'Elle se répétera chaque semaine.'
        } catch {
          note = 'La répétition n’a pas pu être activée.'
        }
      }
      ecrireProfil(versProfil(champs))
      ecrireDerniere(utilisateur?.id, champs)
      setChamps((c) => ({ ...FORMULAIRE_VIDE, ...versProfil(c) }))
      setErreurs({})
      await apresPublication(note)
    } catch (e) {
      setErreurServeur(compteSuspendu(e) ? MESSAGE_COMPTE_SUSPENDU : "L'annonce n'a pas été publiée. Réessaie dans un instant.")
    } finally {
      setEnvoi(false)
    }
  }

  const erreur = (cle) => (erreurs[cle] ? <span className="msg-erreur">{erreurs[cle]}</span> : null)
  const pvp = champs.activite === 'pvp'
  const quete = champs.activite === 'quete'
  const sansRoles = SANS_ROLES.has(champs.activite)
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
      ) : manquants.length > 0 ? (
        <div className="besoin-profil">
          <div className="dialogue-haut">
            <h2 id="titre-formulaire">Complète ton profil d'abord</h2>
            <button type="button" className="bouton petit" onClick={fermer}>Fermer</button>
          </div>
          <p>
            Pour publier une annonce, ton profil doit être complet, pour que les autres sachent qui tu es. Il manque:
          </p>
          <ul className="besoin-liste">
            {manquants.map((m) => <li key={m}>{NOMS_CHAMPS_PROFIL[m]}</li>)}
          </ul>
          <button type="button" className="bouton principal large" onClick={completerProfil}>
            Compléter mon profil
          </button>
        </div>
      ) : (
        <form onSubmit={envoyer} noValidate>
          <div className="dialogue-haut">
            <h2 id="titre-formulaire">Publier une annonce</h2>
            <button type="button" className="bouton petit" onClick={fermer}>Fermer</button>
          </div>

          {derniere && (
            <div className="reprise">
              <button type="button" className="bouton petit" onClick={reprendre}>Reprendre ma dernière annonce</button>
              <span className="aide">
                {derniere.genre === 'joueur' ? 'Joueur seul' : NOMS_ACTIVITE[derniere.activite]}: {derniere.cible}
                {derniere.niveau_min === derniere.niveau_max ? `, niveau ${derniere.niveau_min}` : `, niveaux ${derniere.niveau_min} à ${derniere.niveau_max}`}
              </span>
            </div>
          )}

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
            <div className="choix-activite quatre">
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
            <span>{pvp ? 'Champ de bataille (facultatif)' : quete ? 'Zone (facultatif)' : raid ? 'Raid' : 'Donjon'}</span>
            <select value={champs.cible} onChange={(e) => choisirCible(e.target.value)} aria-invalid={!!erreurs.cible}>
              {pvp ? (
                <>
                  <option value={PVP_PEU_IMPORTE}>Peu importe</option>
                  {CHAMPS_DE_BATAILLE.map((d) => <option key={d}>{d}</option>)}
                </>
              ) : quete ? (
                <>
                  <option value={QUETE_PEU_IMPORTE}>Peu importe</option>
                  {ZONES_QUETES.map((z) => <option key={z}>{z}</option>)}
                  <option>{AUTRE_ZONE}</option>
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

          {!sansRoles && raid && !joueur && (
            <fieldset className="groupe">
              <legend>Joueurs recherchés</legend>
              <div className="nombres">
                {ROLES.map((r) => (
                  <div key={r.id} className="nombre">
                    <span className="nombre-nom">
                      <Icone nom={r.id} taille={16} />
                      {r.nom}
                    </span>
                    <button
                      type="button"
                      className="bouton petit"
                      aria-label={`Un ${r.nom} de moins`}
                      disabled={champs.roles_nb[r.id] === 0}
                      onClick={() => changerNombre(r.id, -1)}
                    >
                      −
                    </button>
                    <output className="nombre-valeur" aria-label={`${r.nom} recherchés`}>{champs.roles_nb[r.id]}</output>
                    <button
                      type="button"
                      className="bouton petit"
                      aria-label={`Un ${r.nom} de plus`}
                      onClick={() => changerNombre(r.id, 1)}
                    >
                      +
                    </button>
                  </div>
                ))}
              </div>
              <p className="aide">
                {(() => {
                  const taille = RAIDS.find((r) => r.nom === champs.cible)?.taille
                  const total = totalNombres(champs.roles_nb)
                  return taille
                    ? `${total} joueur${total > 1 ? 's' : ''} recherché${total > 1 ? 's' : ''}. Le groupe compte déjà ${taille - total} joueur${taille - total > 1 ? 's' : ''} sur ${taille}, toi compris.`
                    : 'Choisis un raid pour voir combien de joueurs il te manque.'
                })()}
              </p>
              {erreur('roles')}
            </fieldset>
          )}

          {!sansRoles && !(raid && !joueur) && (
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
              <span>Contact (BattleTag)</span>
              <input type="text" maxLength={48} autoComplete="off" value={champs.contact} onChange={(e) => maj('contact', e.target.value)} aria-invalid={!!erreurs.contact} placeholder="Ex.: Nom#1234" />
              {erreur('contact')}
            </label>
          </div>
          <p className="aide">
            Ton contact reste caché. Les joueurs demandent à rejoindre ton groupe, tu acceptes ou refuses, et seuls ceux que
            tu acceptes le reçoivent dans le chat du groupe. Il est gardé pour ta prochaine annonce.
          </p>

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

          {champs.quand === 'plus_tard' && !joueur && (
            <label className="case">
              <input type="checkbox" checked={champs.repeter} onChange={(e) => maj('repeter', e.target.checked)} />
              <span>Répéter chaque semaine, à la même heure (publiée 24 h avant le départ)</span>
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

// Le « G » de Google (logo officiel, quatre couleurs), pour le bouton « Continuer avec Google ».
function LogoGoogle() {
  return (
    <svg className="logo-google" viewBox="0 0 48 48" width="20" height="20" aria-hidden="true" focusable="false">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
}

// Vrai quand le site est ouvert dans le navigateur intégré d'une autre appli (Messenger, Facebook, Instagram, TikTok…).
// Google refuse de se connecter là-dedans (erreur « disallowed_useragent »).
function dansNavigateurIntegre() {
  const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent
  if (/FBAN|FBAV|FB_IAB|FBIOS|Instagram|Messenger|TikTok|musical_ly|Snapchat|Line\/|MicroMessenger|Twitter/i.test(ua)) return true
  if (/; wv\)/i.test(ua)) return true // WebView Android
  return /(iPhone|iPod|iPad)/i.test(ua) && /AppleWebKit/i.test(ua) && !/Safari\//i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua)
}

function PanneauConnexion({ fermer }) {
  const [courriel, setCourriel] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [voir, setVoir] = useState(false)
  const [mode, setMode] = useState('connexion') // 'connexion' | 'creation' | 'oubli'
  const [etat, setEtat] = useState('attente')
  const [probleme, setProbleme] = useState('')
  const [problemeMdp, setProblemeMdp] = useState('')
  const [problemeCompte, setProblemeCompte] = useState('')
  const integre = googleActif && dansNavigateurIntegre()
  // En démo, le courriel simule un lien (aucun vrai courriel); sur le vrai site, c'est un mot de passe.
  const avecMotDePasse = !modeDemo

  const continuerAvecGoogle = () => {
    setProblemeCompte('')
    connecter().catch(() => {
      setProblemeCompte("La connexion avec Google n'a pas marché. Réessaie dans quelques minutes.")
    })
  }

  const changerMode = (m) => {
    setMode(m)
    setEtat('attente')
    setProbleme('')
    setProblemeMdp('')
    setProblemeCompte('')
  }

  const envoyer = async (e) => {
    e.preventDefault()
    setProblemeCompte('')
    if (!/^\S+@\S+\.\S+$/.test(courriel.trim())) {
      setProbleme('Écris une adresse courriel valide.')
      return
    }
    setProbleme('')
    if (!avecMotDePasse) {
      setEtat('envoi')
      try {
        const resultat = await envoyerLienCourriel(courriel.trim())
        setEtat(resultat === 'envoye' ? 'envoye' : 'attente')
      } catch {
        setEtat('attente')
        setProbleme("Le courriel n'a pas été envoyé. Réessaie dans quelques minutes.")
      }
      return
    }
    if (mode !== 'oubli') {
      if (!motDePasse) {
        setProblemeMdp('Écris ton mot de passe.')
        return
      }
      if (mode === 'creation' && motDePasse.length < MOT_DE_PASSE_MIN) {
        setProblemeMdp(`Mets au moins ${MOT_DE_PASSE_MIN} caractères.`)
        return
      }
    }
    setProblemeMdp('')
    setEtat('envoi')
    try {
      if (mode === 'connexion') {
        await connecterParMotDePasse(courriel.trim(), motDePasse)
        setEtat('attente') // la connexion change l'écran toute seule
      } else if (mode === 'creation') {
        const r = await creerCompte(courriel.trim(), motDePasse)
        setEtat(r === 'envoye' ? 'envoye' : 'attente')
      } else {
        await demanderNouveauMotDePasse(courriel.trim())
        setEtat('envoye')
      }
    } catch (err) {
      setEtat('attente')
      setProblemeCompte(messageConnexion(err))
    }
  }

  const titre = avecMotDePasse && mode === 'creation' ? 'Créer un compte' : avecMotDePasse && mode === 'oubli' ? 'Mot de passe oublié' : 'Se connecter'
  const verbe = !avecMotDePasse ? 'Recevoir un lien de connexion' : mode === 'creation' ? 'Créer mon compte' : mode === 'oubli' ? 'Recevoir un lien' : 'Se connecter'

  return (
    <div className="dialogue-connexion">
      <div className="dialogue-haut">
        <h2 id="titre-formulaire">{titre}</h2>
        <button type="button" className="bouton petit" onClick={fermer}>Fermer</button>
      </div>

      {etat === 'envoye' ? (
        <>
          {!avecMotDePasse ? (
            <p role="status">
              Courriel envoyé à <strong>{courriel.trim()}</strong>. Clique sur le lien dans le message pour te
              connecter. Regarde aussi dans tes pourriels.
            </p>
          ) : mode === 'creation' ? (
            <p role="status">
              Presque fini! Si <strong>{courriel.trim()}</strong> n'a pas déjà un compte, on vient de t'envoyer un
              courriel de confirmation. Clique sur le lien dedans, puis tu seras connecté. Regarde aussi dans tes
              pourriels. Si tu as déjà un compte, connecte-toi, ou utilise « Mot de passe oublié ».
            </p>
          ) : (
            <p role="status">
              Si un compte existe avec <strong>{courriel.trim()}</strong>, un courriel vient de partir. Clique sur le lien
              dedans pour choisir un nouveau mot de passe. Regarde aussi dans tes pourriels.
            </p>
          )}
          {avecMotDePasse && (
            <p>
              <button type="button" className="lien" onClick={() => changerMode('connexion')}>Retour à la connexion</button>
            </p>
          )}
        </>
      ) : (
        <>
          <p>
            Il faut être connecté pour publier, et tu pourras retirer ton annonce quand ton groupe est
            complet.
          </p>
          {googleActif && (
            <button type="button" className="bouton-google large" onClick={continuerAvecGoogle}>
              <LogoGoogle />
              <span>Continuer avec Google</span>
            </button>
          )}
          {integre && (
            <p className="astuce" role="note">
              Tu es dans le navigateur d'une autre appli (Messenger, Facebook, Instagram…). Google risque de refuser ici:
              ouvre le site dans ton navigateur habituel (Chrome, Safari…) et réessaie.
            </p>
          )}
          {problemeCompte && <p className="erreur" role="alert">{problemeCompte}</p>}
          {courrielActif && (
          <form className="formulaire-courriel" onSubmit={envoyer} noValidate>
            <label className="champ">
              <span>
                {!avecMotDePasse
                  ? googleActif ? 'Ou reçois un lien par courriel, sans mot de passe' : 'Reçois un lien par courriel, sans mot de passe'
                  : googleActif ? 'Ou avec ton courriel' : 'Courriel'}
              </span>
              <input
                type="email"
                autoComplete="email"
                value={courriel}
                onChange={(e) => setCourriel(e.target.value)}
                aria-invalid={!!probleme}
              />
              {probleme && <span className="msg-erreur" role="alert">{probleme}</span>}
            </label>
            {avecMotDePasse && mode !== 'oubli' && (
              <label className="champ">
                <span>Mot de passe</span>
                <span className="champ-mdp">
                  <input
                    type={voir ? 'text' : 'password'}
                    autoComplete={mode === 'creation' ? 'new-password' : 'current-password'}
                    value={motDePasse}
                    onChange={(e) => setMotDePasse(e.target.value)}
                    aria-invalid={!!problemeMdp}
                  />
                  <button type="button" className="bouton petit" onClick={() => setVoir((v) => !v)} aria-pressed={voir}>
                    {voir ? 'Cacher' : 'Voir'}
                  </button>
                </span>
                {mode === 'creation' && !problemeMdp && (
                  <small className="aide">Au moins {MOT_DE_PASSE_MIN} caractères. On t'envoie un courriel pour confirmer ton adresse.</small>
                )}
                {problemeMdp && <span className="msg-erreur" role="alert">{problemeMdp}</span>}
              </label>
            )}
            <button type="submit" className="bouton large principal" disabled={etat === 'envoi'}>
              {etat === 'envoi' ? 'Un instant…' : verbe}
            </button>
            {avecMotDePasse && (
              <p className="liens-connexion">
                {mode === 'connexion' && (
                  <>
                    <button type="button" className="lien" onClick={() => changerMode('creation')}>Créer un compte</button>
                    <button type="button" className="lien" onClick={() => changerMode('oubli')}>Mot de passe oublié?</button>
                  </>
                )}
                {mode === 'creation' && (
                  <button type="button" className="lien" onClick={() => changerMode('connexion')}>J'ai déjà un compte</button>
                )}
                {mode === 'oubli' && (
                  <button type="button" className="lien" onClick={() => changerMode('connexion')}>Retour à la connexion</button>
                )}
              </p>
            )}
          </form>
          )}
          <p className="petit-texte">Ton nom et ton courriel ne sont jamais affichés sur le site.</p>
        </>
      )}
    </div>
  )
}

// Fenêtre « choisis ton nouveau mot de passe », ouverte par le lien du courriel « mot de passe oublié ».
function NouveauMotDePasse({ fermer, annoncer }) {
  const dialogue = useRef(null)
  const [mdp, setMdp] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [voir, setVoir] = useState(false)
  const [probleme, setProbleme] = useState('')
  const [envoi, setEnvoi] = useState(false)

  useEffect(() => {
    const d = dialogue.current
    if (d && !d.open) d.showModal()
  }, [])

  const enregistrer = async (e) => {
    e.preventDefault()
    if (mdp.length < MOT_DE_PASSE_MIN) {
      setProbleme(`Mets au moins ${MOT_DE_PASSE_MIN} caractères.`)
      return
    }
    if (mdp !== confirmation) {
      setProbleme('Les deux mots de passe ne sont pas pareils.')
      return
    }
    setProbleme('')
    setEnvoi(true)
    try {
      await changerMotDePasse(mdp)
      annoncer('Mot de passe changé. Tu es connecté.')
      fermer()
    } catch (err) {
      setProbleme(messageConnexion(err))
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <dialog ref={dialogue} className="dialogue" onClose={fermer} aria-labelledby="titre-nouveau-mdp">
      <div className="dialogue-connexion">
        <div className="dialogue-haut">
          <h2 id="titre-nouveau-mdp">Choisis ton nouveau mot de passe</h2>
          <button type="button" className="bouton petit" onClick={fermer}>Plus tard</button>
        </div>
        <form className="formulaire-courriel" onSubmit={enregistrer} noValidate>
          <label className="champ">
            <span>Nouveau mot de passe</span>
            <span className="champ-mdp">
              <input type={voir ? 'text' : 'password'} autoComplete="new-password" value={mdp} onChange={(e) => setMdp(e.target.value)} />
              <button type="button" className="bouton petit" onClick={() => setVoir((v) => !v)} aria-pressed={voir}>
                {voir ? 'Cacher' : 'Voir'}
              </button>
            </span>
            <small className="aide">Au moins {MOT_DE_PASSE_MIN} caractères.</small>
          </label>
          <label className="champ">
            <span>Écris-le encore une fois</span>
            <input type={voir ? 'text' : 'password'} autoComplete="new-password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} />
          </label>
          {probleme && <p className="erreur" role="alert">{probleme}</p>}
          <button type="submit" className="bouton large principal" disabled={envoi}>
            {envoi ? 'Un instant…' : 'Enregistrer'}
          </button>
        </form>
      </div>
    </dialog>
  )
}
