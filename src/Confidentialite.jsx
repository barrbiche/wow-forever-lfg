import { useEffect } from 'react'
import { pubsActives } from './Pub.jsx'

// Courriel de contact pour les questions de vie privée. Il n'est pas écrit dans le code: il se règle dans Netlify
// (variable VITE_COURRIEL_CONTACT) pour que la personne qui gère le site choisisse ce qu'elle rend public.
const COURRIEL_CONTACT = (import.meta.env.VITE_COURRIEL_CONTACT || '').trim()

// Ce que le site fait des données. Utilisé dans la fenêtre « Comment ça marche » et dans la page /confidentialite.
// Le texte décrit ce que le site fait vraiment: à mettre à jour si le site change (par exemple s'il ajoute de la publicité).
export function SectionDonnees() {
  return (
    <section>
      <h3>Tes données</h3>
      <ul className="puces">
        <li>
          <strong>Ton compte.</strong> Avec Google, le site reçoit ton nom, ton adresse courriel et l'adresse de ta
          photo de profil, et aucun mot de passe. Si tu crées un compte avec un courriel, le site garde ton adresse et
          ton mot de passe; le mot de passe est gardé brouillé par Supabase, la personne qui gère le site ne peut pas le
          lire. Des courriels sont envoyés seulement pour confirmer ton adresse ou pour changer ton mot de passe. Les comptes créés avant avec Discord ou avec un courriel
          gardent ce que ces services avaient donné (nom d'utilisateur et identifiant Discord, adresse courriel). Ton nom
          et ton courriel ne sont jamais montrés aux autres joueurs: seul ce que tu écris toi-même dans une annonce ou un
          profil est publié.
        </li>
        <li>
          <strong>Tes annonces.</strong> Ce que tu écris (personnage, contact, message) est enregistré dans la base du
          site. Ton contact (BattleTag) n'est jamais montré dans la liste des annonces: il n'est donné qu'aux joueurs que
          tu acceptes dans ton groupe, dans le chat du groupe. Une annonce n'est plus affichée une fois son temps écoulé.
        </li>
        <li>
          <strong>Les alertes sur l'appareil.</strong> Si tu les actives, le site garde l'adresse d'envoi de ton
          navigateur et ses clés (pas ton nom). Elles servent seulement à t'envoyer des alertes. Une alerte ne contient
          jamais le texte d'un message, seulement une phrase comme « Nouveau message dans ton groupe » ou ce qui est déjà
          public dans une annonce. Elles passent par le service d'alertes de ton navigateur (Google, Apple ou Mozilla). Tu
          peux les couper en tout temps; un appareil sans visite depuis 60 jours est retiré. Si tu as une « alerte de
          nouvelles annonces » et que tu es connecté, ses filtres (activité, faction, niveau, rôle...) sont gardés avec ton
          compte pour t'avertir site fermé; ils sont effacés quand tu arrêtes l'alerte ou que ton compte est supprimé.
        </li>
        <li>
          <strong>Les annonces qui se répètent.</strong> Pour republier ton annonce chaque semaine, le site en garde une
          copie (contact compris, jamais montré) jusqu'à ce que tu arrêtes la répétition ou que ton compte soit supprimé.
        </li>
        <li>
          <strong>Les statistiques.</strong> Le site compte combien d'annonces sont publiées par jour et par heure. Ces
          chiffres ne sont liés à aucun compte et sont gardés 12 semaines.
        </li>
        <li>
          <strong>Le compteur de visiteurs.</strong> Le site compte combien de navigateurs le visitent chaque jour, pour
          afficher « N visiteurs aujourd'hui ». La base ne garde qu'un nombre par jour: ni adresse IP, ni identifiant, ni
          profil. Ton navigateur retient seulement la date de ta dernière visite comptée, pour ne pas te compter deux fois.
        </li>
        <li>
          <strong>Le badge « Supporter ».</strong> Si tu fais un don et que la personne qui gère le site te donne le
          badge, ton identifiant de compte est ajouté à une liste. Les gens connectés voient le badge à côté du nom de
          ton personnage. Le montant du don n'est pas gardé sur le site. Demande-lui de retirer le badge quand tu veux.
        </li>
        <li>
          <strong>Ton profil de joueur.</strong> Il doit être complet pour publier une annonce: le nom de ton
          personnage, ta classe, ta spécialisation, ton niveau et au moins un rôle. Quand tu cliques sur « Publier une
          annonce » sans profil complet, le site ouvre d'abord « Mon profil », puis le formulaire d'annonce. Le profil
          contient aussi ta faction, ta région, ta langue, ton style et, si tu les donnes, ta guilde et un petit mot,
          et, seulement si tu l'écris, ton BattleTag. Le contact de tes annonces n'y est jamais. Seules les personnes
          connectées voient la liste complète des joueurs et les BattleTag. Les visiteurs sans compte voient un petit
          aperçu des profils visibles (nom du personnage, classe, niveau, rôles, faction, région, langue, style,
          guilde et pouces), jamais le BattleTag, le petit mot ni ton compte. Dans « Mon profil », tu peux tout modifier, te
          cacher de la liste ou supprimer ton profil (tu devras alors le refaire pour publier).
        </li>
        <li>
          <strong>Demandes pour rejoindre et chat.</strong> Quand tu demandes à rejoindre un groupe, le chef voit ton
          personnage (nom, classe, niveau, rôle, guilde, petit mot), jamais ton courriel ni ton nom Google. Les messages
          d'un groupe ne sont lisibles que par le chef et les joueurs acceptés, et sont effacés 24 heures après la fin de
          l'annonce (expirée ou retirée). Les messages entre amis ne sont lisibles que par vous deux et sont effacés après
          30 jours. Tu peux effacer tes propres messages. Un message signalé est copié, avec les quelques messages qui le
          précèdent, pour que les personnes qui gèrent le site puissent décider; cette copie est effacée après 30 jours.
          Ces personnes peuvent aussi lire les messages dans la base de données. N'écris pas de mot de passe ni de
          renseignement sensible dans un chat.
        </li>
        <li>
          <strong>La Taverne (salon public).</strong> Les messages que tu écris dans « La Taverne » sont visibles par
          tous les joueurs connectés, avec le nom et la classe de ton personnage. Ils sont effacés après 48 heures. Un
          message signalé est copié, avec les quelques messages qui le précèdent, pour que les personnes qui gèrent le
          site puissent décider (30 jours).
        </li>
        <li>
          <strong>Tes amis.</strong> Ta liste d'amis, tes demandes et les personnes que tu as bloquées ne sont visibles
          que par toi: personne ne voit qui t'a refusé ou bloqué. Une personne à qui tu envoies une demande voit ton
          personnage (nom, classe, niveau, etc.), jamais ton contact ni ton BattleTag. Supprimer ton profil efface tes
          amitiés, tes demandes (d'ami et pour rejoindre) et tes blocages. Les personnes qui gèrent le site peuvent les lire dans la base de
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
          <strong>Les messages « Bogue ou idée ».</strong> Si tu écris à la personne qui fait le site, ton message est
          gardé avec le nom de ton personnage, ton type de navigateur et la date, jamais avec ton courriel. Seules les
          personnes qui gèrent le site peuvent le lire.
        </li>
        <li>
          <strong>Dans ton navigateur.</strong> Le site garde chez toi le style que tu as choisi, la langue de ton jeu,
          ton alerte de nouvelles annonces, ton choix de sons, ton personnage et ton contact (pour préremplir tes prochaines annonces) et
          ta connexion. {pubsActives
            ? "Il n'y a pas d'outil de suivi. Les témoins de publicité ne sont posés que si tu acceptes la publicité (voir plus bas)."
            : "Il n'y a ni publicité, ni témoin de suivi."}
        </li>
        {pubsActives && (
          <li>
            <strong>Publicité.</strong> Une publicité Google (AdSense) peut s'afficher en bas de la liste des groupes.
            Au premier passage, le site te demande ton choix. Si tu refuses, aucune pub ne s'affiche et rien n'est chargé
            depuis Google. Si tu acceptes, Google peut utiliser des témoins (cookies) et des identifiants pour choisir
            la pub et mesurer son affichage; tes messages, tes demandes et tes profils ne lui sont jamais envoyés. Tu
            peux changer d'avis en tout temps avec « Choix de publicité » en bas de la page; refuser après avoir accepté
            recharge la page. Tu peux aussi gérer les pubs de Google sur{' '}
            <a className="lien" href="https://myadcenter.google.com" target="_blank" rel="noopener noreferrer">myadcenter.google.com</a>.
            Les supporters ne voient pas la publicité.
          </li>
        )}
        <li>
          <strong>Les services utilisés.</strong> Le site est hébergé par Netlify, et sa base de données et la
          connexion passent par Supabase. Les polices sont sur le site même: aucune requête vers Google.
        </li>
        <li>
          <strong>Effacer tes données.</strong> Tu peux supprimer ton profil toi-même dans « Mon profil »: les pouces que
          tu as reçus partent avec lui. Pour faire retirer ton compte et tes annonces,{' '}
          écris à la personne qui gère le site.
        </li>
      </ul>
    </section>
  )
}

// Page publique /confidentialite (sans connexion). Google et d'autres services demandent une adresse pour cette politique.
export default function Confidentialite() {
  useEffect(() => {
    const avant = document.title
    document.title = 'Confidentialité – Babillard Forever'
    return () => {
      document.title = avant
    }
  }, [])

  return (
    <main className="page-legale">
      <article className="aide-fenetre">
        <p>
          <a className="lien" href="/">← Retour au Babillard Forever</a>
        </p>
        <h1>Politique de confidentialité</h1>
        <p className="aide">Dernière mise à jour: 22 octobre 2026</p>

        <section>
          <h3>Qui gère le site</h3>
          <p>
            Babillard Forever est un site de fans, géré par une seule personne (Barrbiche), pour aider les joueurs du
            Québec et de la francophonie à trouver un groupe dans World of Warcraft Forever. Il n'a aucun lien avec
            Blizzard Entertainment.
          </p>
          {COURRIEL_CONTACT ? (
            <p>Pour toute question sur tes données: <a className="lien" href={`mailto:${COURRIEL_CONTACT}`}>{COURRIEL_CONTACT}</a>.</p>
          ) : (
            <p>Pour toute question sur tes données, écris à la personne qui gère le site.</p>
          )}
        </section>

        <SectionDonnees />

        <section>
          <h3>Les données reçues de Google</h3>
          <ul className="puces">
            <li>
              <strong>Ce que le site reçoit.</strong> Quand tu choisis « Continuer avec Google », Google donne au site ton
              nom, ton adresse courriel et l'adresse de ta photo de profil. Le site ne demande aucune autre permission: il
              ne lit ni ta boîte courriel, ni tes contacts, ni tes fichiers.
            </li>
            <li>
              <strong>Pourquoi.</strong> Pour créer ton compte et te reconnaître quand tu reviens. Ton prénom s'affiche à toi
              seul dans l'en-tête. Ton nom, ton courriel et ta photo ne sont jamais montrés aux autres joueurs et ne servent
              pas à remplir tes annonces.
            </li>
            <li>
              <strong>Avec qui.</strong> Ces données ne sont ni vendues, ni utilisées pour du profilage, ni envoyées à des annonceurs, ni
              données à d'autres personnes. Elles sont enregistrées chez Supabase, le service qui gère la base de données et la
              connexion du site, et lisibles par la personne qui gère le site.
            </li>
            <li>
              <strong>Combien de temps.</strong> Tant que ton compte existe. Pour faire effacer ton compte et les données reçues
              de Google, écris à la personne qui gère le site.
            </li>
            <li>
              L'utilisation et le transfert, par Babillard Forever, des informations reçues des API Google respectent la{' '}
              <a className="lien" href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">
                politique relative aux données utilisateur des services d'API Google
              </a>
              , y compris les exigences d'utilisation limitée.
            </li>
          </ul>
        </section>

        <section>
          <h3>Où sont gardées les données</h3>
          <p>
            Le site est hébergé par Netlify et sa base de données est chez Supabase. Ces services peuvent garder les données
            dans d'autres pays que le Québec et la France.
          </p>
        </section>

        <section>
          <h3>Tes droits</h3>
          <p>
            Tu peux demander à voir, corriger ou effacer tes données, et retirer ton consentement en tout temps (tu peux déjà
            supprimer ton profil toi-même dans « Mon profil »). Si tu penses que tes droits ne sont pas respectés, tu peux
            écrire à l'autorité de ton pays: la CNIL en France, la Commission d'accès à l'information au Québec.
          </p>
        </section>
      </article>
    </main>
  )
}
