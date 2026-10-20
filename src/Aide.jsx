import { useEffect, useRef } from 'react'
import { LIEN_DISCORD } from './config.js'

// Fenêtre « Comment ça marche »: les étapes, les règles du site et ce qu'il fait des données.
// Le texte décrit ce que le site fait vraiment (à mettre à jour si le site change, par exemple quand il aura des pubs).
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
              <strong>Connecte-toi pour contacter ou publier.</strong> Avec Discord, ou avec un lien envoyé par courriel.
              Il n'y a pas de mot de passe. Les contacts (Discord, BattleTag) ne sont montrés qu'aux gens connectés.
            </li>
            <li>
              <strong>Publie ton annonce.</strong> Un groupe qui cherche des joueurs, ou un joueur seul qui cherche un
              groupe. Elle disparaît toute seule: après 1 à 6 heures, ou 1 heure après le départ si tu l'as planifiée.
              Les guildes restent de 7 à 30 jours. Tu peux avoir 5 annonces et 2 guildes à la fois.
            </li>
            <li>
              <strong>Relance-la si besoin.</strong> Le bouton « Renouveler » apparaît sur ton annonce quand il lui reste
              moins de la moitié de son temps. Quand tu as trouvé quelqu'un, utilise « Tank trouvé », « Heal trouvé » ou
              « DPS trouvé ». Pour un raid, ça enlève un joueur à la fois.
            </li>
          </ol>
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
          <h3>Les règles</h3>
          <ul className="puces">
            <li>Sois respectueux. Pas d'insultes ni de harcèlement.</li>
            <li>Pas de spam ni de publicité: une annonce, c'est un vrai groupe ou un vrai joueur.</li>
            <li>Écris un vrai contact. Un faux contact fait perdre du temps à tout le monde.</li>
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
              une annonce, une guilde ou un profil, ou suspendre un compte qui abuse (il ne peut plus publier). Elles voient
              alors le contact de l'annonce signalée.
            </li>
          </ul>
        </section>

        <section>
          <h3>Tes données</h3>
          <ul className="puces">
            <li>
              <strong>Ton compte.</strong> Avec Discord, le site reçoit les informations de base de ton compte (nom
              d'utilisateur, identifiant et, selon tes réglages Discord, ton courriel). Avec le courriel, il reçoit ton
              adresse pour t'envoyer le lien de connexion. Il ne reçoit aucun mot de passe.
            </li>
            <li>
              <strong>Tes annonces.</strong> Ce que tu écris (personnage, contact, message) est enregistré dans la base du
              site. Le contact n'est montré qu'aux gens connectés.
              {LIEN_DISCORD
                ? " Chaque nouvelle annonce est aussi publiée, contact compris, dans le Discord de la communauté: ses membres la voient."
                : ''}{' '}
              Une annonce n'est plus affichée une fois son temps écoulé.
            </li>
            <li>
              <strong>Ton profil de joueur.</strong> Il est créé quand tu publies ta première annonce, ou quand tu le
              remplis toi-même dans « Mon profil ». Il contient ton personnage (nom, faction, région, langue, style et, si
              tu les donnes, classe, niveau, rôles, guilde et petit mot) et, seulement si tu l'écris, ton BattleTag. Le
              contact de tes annonces n'y est jamais. Seules les personnes connectées voient la liste des joueurs et les
              BattleTag. Dans « Mon profil », tu peux tout modifier, te cacher de la liste ou
              supprimer ton profil.
            </li>
            <li>
              <strong>Tes amis.</strong> Ta liste d'amis, tes demandes et les personnes que tu as bloquées ne sont visibles
              que par toi: personne ne voit qui t'a refusé ou bloqué. Une personne à qui tu envoies une demande voit ton
              personnage (nom, classe, niveau, etc.), jamais ton contact ni ton BattleTag. Supprimer ton profil efface tes
              amitiés, tes demandes et tes blocages. Les personnes qui gèrent le site peuvent les lire dans la base de
              données.
            </li>
            <li>
              <strong>En ligne et dernière visite.</strong> Le point vert « en ligne » s'affiche tant que le site est ouvert
              dans ton navigateur et que ton profil est visible. Le site garde aussi l'heure approximative de ta dernière
              visite pour afficher « Vu il y a 3 h ». Si tu te caches, tu n'apparais plus du tout.
            </li>
            <li>
              <strong>Les pouces.</strong> Un pouce est lié à ton compte, mais les autres joueurs ne voient jamais qui l'a
              donné: seulement le nombre et les étiquettes. Les personnes qui gèrent le site peuvent le voir dans la base
              de données. Tes signalements restent eux aussi privés.
            </li>
            <li>
              <strong>Dans ton navigateur.</strong> Le site garde chez toi le style que tu as choisi, la langue de ton jeu,
              ton alerte de nouvelles annonces, ton personnage et ton contact (pour préremplir tes prochaines annonces) et
              ta connexion. Il n'y a ni publicité, ni témoin de suivi, ni outil de statistiques.
            </li>
            <li>
              <strong>Les services utilisés.</strong> Le site est hébergé par Netlify, et sa base de données et la
              connexion passent par Supabase. Les polices sont sur le site même: aucune requête vers Google.
            </li>
            <li>
              <strong>Effacer tes données.</strong> Tu peux supprimer ton profil toi-même dans « Mon profil »: les pouces que
              tu as reçus partent avec lui. Pour faire retirer ton compte et tes annonces,{' '}
              {LIEN_DISCORD ? (
                <>
                  écris-nous sur{' '}
                  <a className="invitation" href={LIEN_DISCORD} target="_blank" rel="noopener noreferrer">
                    le Discord de la communauté
                  </a>
                  .
                </>
              ) : (
                'écris à la personne qui gère le site.'
              )}
            </li>
          </ul>
        </section>

        <p className="aide">
          Babillard Forever est un site de fans, sans lien avec Blizzard Entertainment. World of Warcraft est une marque de
          Blizzard Entertainment, Inc.
        </p>
      </div>
    </dialog>
  )
}
