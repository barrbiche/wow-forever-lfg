import { useEffect, useRef } from 'react'
import { SectionDonnees } from './Confidentialite.jsx'
import { pubsActives } from './Pub.jsx'

// Fenêtre « Comment ça marche »: les étapes, les règles du site et ce qu'il fait des données.
// Le texte décrit ce que le site fait vraiment (à mettre à jour si le site change).
export default function Aide({ ouvert, fermer }) {
  const dialogue = useRef(null)

  useEffect(() => {
    const d = dialogue.current
    if (!d) return
    if (ouvert && !d.open) d.showModal()
    if (!ouvert && d.open) d.close()
  }, [ouvert])

  return (
    <dialog
      ref={dialogue}
      className="dialogue aide-fenetre"
      onClose={fermer}
      onClick={(e) => e.target === dialogue.current && fermer()}
      aria-labelledby="titre-aide"
    >
      <div className="dialogue-contenu">
        <div className="dialogue-haut">
          <h2 id="titre-aide">Comment ça marche</h2>
          <button type="button" className="bouton petit" onClick={fermer}>Fermer</button>
        </div>

        <section>
          <h3>En quatre étapes</h3>
          <ol className="etapes">
            <li>
              <strong>Regarde les annonces.</strong> Tout se lit sans compte: donjons, raids et PvP, Alliance et Horde,
              Amérique et Europe.
            </li>
            <li>
              <strong>Connecte-toi pour rejoindre ou publier.</strong> Avec ton compte Google, ou avec ton
              courriel et un mot de passe (un courriel de confirmation est envoyé seulement à la création du compte). Les
              liens de guilde ne sont montrés qu'aux gens connectés.
            </li>
            <li>
              <strong>Publie ton annonce.</strong> Un groupe qui cherche des joueurs, ou un joueur seul qui cherche un
              groupe. Elle disparaît toute seule: après 1 à 6 heures, ou 1 heure après le départ si tu l'as planifiée.
              Les guildes restent de 7 à 30 jours. Tu peux avoir 5 annonces et 2 guildes à la fois.
            </li>
            <li>
              <strong>Réponds aux demandes.</strong> Les joueurs demandent à rejoindre ton groupe: tu vois leur
              personnage et leur rôle, tu acceptes ou tu refuses. Ton BattleTag n'est donné qu'à ceux que tu acceptes.
            </li>
            <li>
              <strong>Relance-la si besoin.</strong> Le bouton « Renouveler » apparaît sur ton annonce quand il lui reste
              moins de la moitié de son temps. Quand tu as trouvé quelqu'un, utilise « Tank trouvé », « Heal trouvé » ou
              « DPS trouvé ». Pour un raid, ça enlève un joueur à la fois.
            </li>
          </ol>
        </section>

        <section>
          <h3>Rejoindre un groupe et discuter</h3>
          <ul className="puces">
            <li>
              Sur une annonce, « Demander à rejoindre » envoie ton personnage (nom, classe, niveau), le rôle que tu veux
              jouer et un petit mot au chef du groupe. Il faut avoir créé ton profil. Pour une annonce de joueur seul,
              le bouton est « Proposer un groupe ».
            </li>
            <li>
              Le chef regarde les demandes, les filtre par rôle ou par classe, puis accepte ou refuse (personne n'est
              averti d'un refus). Il peut aussi retirer quelqu'un du groupe. Un groupe compte 40 joueurs au plus.
            </li>
            <li>
              Une fois accepté, tu as accès au chat du groupe (onglet Messages) et tu reçois le contact du chef. Seuls
              le chef et les joueurs acceptés lisent le chat. Quand l'annonce se termine (expirée ou retirée), le chat
              quitte ta liste de groupes et passe dans « Groupes terminés »; il est effacé 24 heures plus tard.
            </li>
            <li>
              Tu peux aussi écrire à tes amis: « Écrire » sur leur carte, dans l'onglet Joueurs. Ces messages-là sont
              gardés 30 jours. Tu peux effacer tes propres messages, et signaler ceux des autres: trois signalements de
              personnes différentes masquent un message, et les personnes qui modèrent le site peuvent le lire pour
              décider.
            </li>
            <li>
              « La Taverne » est un salon ouvert à tous les joueurs connectés, dans l'onglet Messages. Il faut avoir un
              personnage dans « Mon profil » pour y écrire: ton nom et ta classe s'affichent à côté de tes messages. Les
              messages sont effacés après 48 heures. Garde ça respectueux: les signalements et les suspensions de compte
              s'appliquent là aussi.
            </li>
            <li>
              Un groupe de donjon (le chef et 4 joueurs) ou un raid avec composition devient « Groupe complet » tout seul
              quand le dernier joueur est accepté, et les demandes se ferment. Le chef peut aussi fermer ou rouvrir les
              demandes à la main (« Groupe complet » sur sa carte). Si quelqu'un part, le groupe se rouvre.
            </li>
            <li>
              Quand l'annonce est terminée, le chat te propose de donner un pouce aux joueurs avec qui ça a bien été: ça
              compte dans leur réputation (page Joueurs).
            </li>
            <li>
              Les alertes sur l'appareil (onglet Messages, « Activer les alertes ») affichent une notification quand on
              demande à rejoindre ton groupe, qu'on t'accepte, qu'on écrit dans ton groupe ou qu'un ami t'écrit, même si
              le site est fermé. Elles ne contiennent jamais le texte du message. Chaque appareil s'active séparément et on
              peut les couper en tout temps. Sur iPhone, ajoute d'abord le site à l'écran d'accueil.
            </li>
            <li>
              Pour éviter le spam: 10 demandes en attente et 20 par jour, 15 messages par 30 secondes, 500 caractères par
              message. Les adresses écrites dans le chat ne sont pas cliquables.
            </li>
          </ul>
        </section>

        <section>
          <h3>Publier plus vite</h3>
          <ul className="puces">
            <li>
              « Reprendre ma dernière annonce » (en haut du formulaire) remplit tout avec ta dernière annonce; tu changes
              ce que tu veux avant de publier. Elle est gardée seulement dans ton navigateur.
            </li>
            <li>
              Une annonce avec une heure de départ peut se répéter chaque semaine (case « Répéter chaque semaine », ou le
              bouton sur ta carte): la nouvelle annonce est publiée 24 heures avant, à la même heure (heure de l'Est).
              « Arrêter la répétition » la coupe. Maximum 3 répétitions.
            </li>
            <li>
              En bas de la page, « Quand est-ce que ça joue le plus? » montre les heures où il se forme le plus de groupes.
            </li>
          </ul>
        </section>

        <section>
          <h3>Écrire ou inviter dans le jeu</h3>
          <ul className="puces">
            <li>
              Sur une annonce de groupe, « Copier » met <code>/w Nom</code> dans ton presse-papiers: dans le jeu, ouvre le
              clavardage (Entrée), colle, ajoute un espace, écris ton message, puis Entrée. Sur une annonce de joueur seul
              ou sur la carte d'un joueur, la commande est <code>/invite Nom</code>: le joueur reçoit ton invitation de
              groupe.
            </li>
            <li>
              Dis au site dans quelle langue est ton jeu (« Mon jeu est en »): en français, il te donne{' '}
              <code>/inviter</code>; en anglais, <code>/invite</code> (qui marche aussi dans le jeu en français). Si la
              personne est sur un autre royaume, il faut parfois écrire <code>/invite Nom-Royaume</code>.
            </li>
            <li>
              Le BattleTag (<code>Nom#1234</code>), quand le joueur l'a écrit dans son profil, sert à l'ajouter comme ami
              Battle.net. Il ne sert pas à l'inviter dans un groupe: pour ça, c'est le nom du personnage.
            </li>
          </ul>
        </section>

        <section>
          <h3>Ne rien manquer</h3>
          <ul className="puces">
            <li>
              <strong>Alerte de nouvelles annonces.</strong> Règle les filtres de l'onglet Groupes, puis « M'alerter des
              nouvelles annonces ». Tant que le site reste ouvert dans un onglet, chaque nouvelle annonce qui correspond
              est signalée dans la page et, si tu l'autorises, par une notification de ton navigateur. Rien n'est envoyé
              à un serveur: l'alerte reste dans ton navigateur et s'arrête si tu fermes l'onglet.
            </li>
            <li>
              <strong>Groupe planifié.</strong> « Ajouter à mon calendrier » télécharge un fichier qui s'ouvre dans Google
              Agenda, Apple Calendrier, Outlook et les autres. Il contient le jour, l'heure, le nom du personnage et le
              lien de l'annonce, jamais le contact.
            </li>
          </ul>
        </section>

        <section>
          <h3>Guides de donjons</h3>
          <ul className="puces">
            <li>
              L'onglet « Guides » explique chaque donjon, du niveau 13 au 60: comment s'y rendre, les boss, les pièges.
              Cherche un donjon, un boss ou une zone, ou donne ton niveau pour ne voir que ceux qui te conviennent. Sur
              une annonce de donjon, « Voir le guide » ouvre le bon.
            </li>
            <li>
              Dis au site dans quelle langue est ton jeu: en français, les boss portent leur nom français quand il est
              confirmé et les capacités sont expliquées en mots simples; en anglais, les noms restent ceux que tu vois en
              jeu et le reste est expliqué en français.
            </li>
            <li>
              Les guides viennent de sources publiques écrites avant le lancement (les sources sont sous chaque guide).
              Chacun dit aussi ce que les sources ne donnent pas ou contredisent. Quelques donjons ne sont pas encore dans
              la bêta: ils n'ont qu'une fiche courte. Les versions à 10 joueurs ne sont pas couvertes. Vérifie en jeu.
            </li>
          </ul>
        </section>

        <section>
          <h3>Amis</h3>
          <ul className="puces">
            <li>
              Sur la carte d'un joueur, « Ajouter en ami » lui envoie une demande. La personne voit ton personnage (nom,
              classe, niveau) et choisit: accepter, refuser ou bloquer. Si vous vous demandez en même temps, c'est
              accepté tout de suite. Il faut avoir créé ton profil.
            </li>
            <li>
              Une fois amis, vous êtes dans la liste « Mes amis » l'un de l'autre (onglet Joueurs): qui est en ligne, la
              commande pour l'inviter dans le jeu et son BattleTag s'il l'a écrit. Être ami ne donne pas accès à plus
              d'information qu'un profil visible. Si un ami cache son profil, il reste dans ta liste, mais tu ne vois plus son
              BattleTag ni quand il est en ligne.
            </li>
            <li>
              Refuser n'avertit pas l'autre personne, qui ne peut pas redemander avant 30 jours. Bloquer retire l'amitié et
              empêche la personne de te redemander: elle ne le sait pas, sa demande n'arrive simplement pas. Tu peux
              débloquer quelqu'un dans « Mes amis ».
            </li>
            <li>
              Pour éviter le spam: 10 nouvelles demandes par jour, 30 en attente et 100 amis au plus. Quelqu'un te harcèle
              avec des demandes? Bloque-le et signale-le.
            </li>
          </ul>
        </section>

        <section>
          <h3>Soutenir le site</h3>
          <ul className="puces">
            <li>
              {pubsActives
                ? "Le site est gratuit. Une pub peut s'afficher en bas de la liste des groupes si tu l'acceptes (tu peux la refuser, et changer d'idée en bas de la page). Si tu veux aider"
                : 'Le site est gratuit et sans pub, et il va le rester. Si tu veux aider'}{' '}
               à le garder en ligne, un don est
              possible (bouton « Soutenir le site » en bas de la page, quand il est activé). Les gens qui donnent peuvent
              recevoir un badge « Supporter » à côté du nom de leur personnage{pubsActives ? ' et ne voient pas la pub' : ''}. Ça ne donne aucun avantage dans les groupes.
            </li>
          </ul>
        </section>

        <section>
          <h3>Les règles</h3>
          <ul className="puces">
            <li>Sois respectueux. Pas d'insultes ni de harcèlement.</li>
            <li>Pas de spam ni de publicité: une annonce, c'est un vrai groupe ou un vrai joueur.</li>
            <li>Écris un vrai BattleTag. Un faux contact fait perdre du temps à tout le monde.</li>
            <li>Pas de vente d'or, de comptes ou de services payants.</li>
            <li>Dans Forever, l'Alliance et la Horde ne se mélangent pas: une annonce est pour un seul camp.</li>
            <li>
              Les pouces sont pour les gens avec qui tu as vraiment joué. Pas de pouces échangés entre amis pour gonfler
              une réputation, ni avec de faux comptes.
            </li>
            <li>
              Tu vois un problème? Utilise « Signaler » sur l'annonce. Trois signalements de personnes différentes la
              retirent automatiquement. Pour un joueur, trois signalements mettent sa réputation « en vérification »:
              ses pouces ne sont plus affichés.
            </li>
            <li>
              Les personnes qui modèrent le site examinent les signalements. Elles peuvent écarter un signalement, retirer
              une annonce, une guilde, un profil ou un message, ou suspendre un compte qui abuse (il ne peut plus publier ni
              écrire). Elles voient alors le contact de l'annonce signalée, ou le message signalé et ceux d'avant.
            </li>
          </ul>
        </section>

        <SectionDonnees />

        <p className="aide">
          Babillard Forever est un site de fans, sans lien avec Blizzard Entertainment. World of Warcraft est une marque de
          Blizzard Entertainment, Inc.
        </p>
      </div>
    </dialog>
  )
}
