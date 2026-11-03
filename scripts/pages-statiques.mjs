// Pages de texte lisibles sans JavaScript: un guide par donjon, « À propos » et « Comment ça marche ».
// Le site est une application: ce que Google lit au départ est presque vide. Ce script, lancé après « vite build »,
// écrit dans dist/ de vraies pages HTML avec le texte des guides (le même que dans l'onglet Guides) et des explications,
// puis refait sitemap.xml. Aucune dépendance: du Node simple. Lancer: node scripts/pages-statiques.mjs [dossier]
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { GUIDES, SOURCES, aplatir, nomBoss } from '../src/guides-data.js'

const SITE = 'https://babillard-forever.com'
const racine = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = resolve(process.argv[2] ?? join(racine, 'dist'))
const aujourdhui = new Date().toISOString().slice(0, 10)

const e = (t) =>
  String(t ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
const fr = (texte) => e(aplatir(texte, 'fr'))
const plage = ([a, b]) => (a === b ? `${a}` : `${a} à ${b}`)
const nomFr = (g) => g.nom[1] ?? g.nom[0]

const CSS = `
:root{color-scheme:dark}
*{box-sizing:border-box}
body{margin:0;background:#12100d;color:#efe6d4;font:17px/1.7 Georgia,'Times New Roman',serif}
a{color:#f3c969}
a:hover{color:#ffe09a}
a:focus-visible{outline:3px solid #f3c969;outline-offset:2px}
.haut{background:#1c1813;border-bottom:1px solid #4a3d24}
.haut-in,.page,.bas-in{max-width:780px;margin:0 auto;padding:0 18px}
.haut-in{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px 20px;padding-top:14px;padding-bottom:14px}
.marque{font:700 1.15rem/1.2 Georgia,serif;letter-spacing:.06em;text-transform:uppercase;text-decoration:none;color:#f3c969}
.haut nav{display:flex;flex-wrap:wrap;gap:6px 18px;font:500 .95rem/1.4 system-ui,sans-serif}
.page{padding-top:28px;padding-bottom:48px}
h1{font-size:2rem;line-height:1.2;margin:0 0 6px;color:#fff4dc}
h2{font-size:1.45rem;line-height:1.3;margin:2.2em 0 .5em;color:#f3c969}
h3{font-size:1.15rem;margin:1.6em 0 .3em;color:#fff4dc}
p,li{max-width:68ch}
.sous{margin:0 0 1.4em;color:#cdbf9f;font:1rem/1.5 system-ui,sans-serif}
.avis{margin:1em 0;padding:10px 14px;border-left:4px solid #e9ab1e;background:#1f1a12;font:.95rem/1.55 system-ui,sans-serif}
dl.infos{display:grid;grid-template-columns:max-content 1fr;gap:8px 18px;margin:1.2em 0;padding:14px 16px;border:1px solid #4a3d24;background:#1a160f;font:.97rem/1.55 system-ui,sans-serif}
dl.infos dt{font-weight:700;color:#f3c969}
dl.infos dd{margin:0}
.cta{display:inline-block;margin:.4em 0;padding:10px 18px;border-radius:6px;background:#e9ab1e;color:#1a1306;font:700 1rem/1.3 system-ui,sans-serif;text-decoration:none}
.cta:hover{background:#ffc94a;color:#1a1306}
.liste-guides{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.liste-guides li{padding:10px 14px;border:1px solid #3a2f1c;background:#1a160f}
.liste-guides .niveaux{color:#cdbf9f;font:.92rem/1.4 system-ui,sans-serif}
.pas{display:flex;flex-wrap:wrap;justify-content:space-between;gap:10px;margin-top:2.4em;font:.97rem/1.4 system-ui,sans-serif}
.bas{border-top:1px solid #4a3d24;background:#1c1813;font:.9rem/1.6 system-ui,sans-serif;color:#cdbf9f}
.bas-in{padding-top:18px;padding-bottom:26px}
.bas nav{display:flex;flex-wrap:wrap;gap:6px 18px;margin-bottom:8px}
@media (max-width:560px){h1{font-size:1.6rem}dl.infos{grid-template-columns:1fr}}
`

function page({ chemin, titre, description, corps }) {
  const url = `${SITE}${chemin}`
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e(titre)}</title>
<meta name="description" content="${e(description)}">
<link rel="canonical" href="${url}">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<meta name="theme-color" content="#12100d">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Babillard Forever">
<meta property="og:locale" content="fr_CA">
<meta property="og:title" content="${e(titre)}">
<meta property="og:description" content="${e(description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE}/og.jpg">
<meta name="twitter:card" content="summary_large_image">
<style>${CSS}</style>
</head>
<body>
<header class="haut"><div class="haut-in">
<a class="marque" href="/">Babillard Forever</a>
<nav aria-label="Navigation">
<a href="/">Trouver un groupe</a>
<a href="/guides/">Guides de donjons</a>
<a href="/comment-ca-marche/">Comment ça marche</a>
<a href="/a-propos/">À propos</a>
</nav></div></header>
<main class="page">
${corps}
</main>
<footer class="bas"><div class="bas-in">
<nav aria-label="Pied de page">
<a href="/">Babillard Forever</a>
<a href="/guides/">Guides</a>
<a href="/comment-ca-marche/">Comment ça marche</a>
<a href="/a-propos/">À propos</a>
<a href="/confidentialite">Confidentialité</a>
</nav>
<p>Babillard Forever est un site de fans, sans lien avec Blizzard Entertainment. World of Warcraft est une marque de Blizzard Entertainment.</p>
</div></footer>
</body>
</html>
`
}

const ecrire = (chemin, html) => {
  const fichier = join(dist, chemin, 'index.html')
  mkdirSync(dirname(fichier), { recursive: true })
  writeFileSync(fichier, html)
}

// ---------- Guides ----------

const infosGuide = (g) => {
  const lignes = [['Niveaux', plage(g.niveaux)]]
  if (g.officiel && (g.officiel[0] !== g.niveaux[0] || g.officiel[1] !== g.niveaux[1])) {
    lignes[0][1] += ` (niveaux annoncés par Blizzard: ${plage(g.officiel)})`
  }
  if (g.rdg) lignes.push(['Recherche de groupe', `dès le niveau ${g.rdg}`])
  if (g.duree) lignes.push(['Durée', e(g.duree)])
  const html = lignes.map(([t, v]) => `<dt>${e(t)}</dt><dd>${t === 'Durée' ? v : e(v)}</dd>`)
  if (g.acces) html.push(`<dt>Accès</dt><dd>${fr(g.acces)}</dd>`)
  if (g.quetes) html.push(`<dt>Quêtes</dt><dd>${fr(g.quetes)}</dd>`)
  for (const x of g.extras ?? []) html.push(`<dt>${e(x.titre)}</dt><dd>${fr(x.texte)}</dd>`)
  return `<dl class="infos">${html.join('')}</dl>`
}

function pageGuide(g, i) {
  const nom = nomFr(g)
  const precedent = GUIDES[i - 1]
  const suivant = GUIDES[i + 1]
  const nbBoss = g.boss.length
  const intro =
    `${nom}${g.nom[1] ? ` (${g.nom[0]} en anglais)` : ''} est un donjon de WoW Forever pour les niveaux ${plage(g.niveaux)}. ` +
    `${g.rdg ? `La recherche de groupe de Blizzard l'offre dès le niveau ${g.rdg}. ` : ''}` +
    `Ce guide résume ${g.fiche ? 'ce que les sources confirment' : `l'accès, ${nbBoss > 1 ? `les ${nbBoss} boss` : nbBoss === 1 ? 'le boss' : 'les monstres'} et les pièges`} ` +
    `en français, à partir des sources citées en bas de page.`
  const avis = []
  if (g.fiche) {
    avis.push(
      "Fiche courte: ce donjon n'est pas encore dans la bêta, donc il n'y a pas de guide complet. Voici ce que les sources confirment.",
    )
  }
  if (g.classique) {
    avis.push(
      'Guide écrit pour WoW Classic. Forever a modifié certains donjons: des détails peuvent avoir changé, vérifie en jeu.',
    )
  }
  const boss = g.boss.length
    ? `<h2>Les boss</h2>\n${g.boss
        .map(
          (b) =>
            `<h3>${e(nomBoss(b.nom, 'fr'))}${b.special ? ' <small>(optionnel, rare ou secret)</small>' : ''}</h3>\n<ul>${b.notes
              .map((n) => `<li>${fr(n)}</li>`)
              .join('')}</ul>`,
        )
        .join('\n')}`
    : ''
  const pieges = g.pieges.length
    ? `<h2>Monstres et pièges à surveiller</h2>\n<ul>${g.pieges.map((p) => `<li>${fr(p)}</li>`).join('')}</ul>`
    : ''
  const manque = g.manque.length
    ? `<h2>Ce que les sources ne disent pas, ou se contredisent</h2>\n<ul>${g.manque.map((p) => `<li>${fr(p)}</li>`).join('')}</ul>`
    : ''
  const sources = g.src
    .map((id) => SOURCES[id])
    .filter(Boolean)
    .map((s) => `<li><a href="${e(s.url)}" rel="noopener noreferrer">${e(s.site)}: ${e(s.titre)}</a></li>`)
    .join('')
  const corps = `<nav aria-label="Fil d'Ariane" class="sous"><a href="/">Babillard Forever</a> › <a href="/guides/">Guides</a> › ${e(nom)}</nav>
<h1>${e(nom)}: guide du donjon</h1>
<p class="sous">${e(g.nom[0])} · niveaux ${plage(g.niveaux)} · WoW Forever</p>
<p>${e(intro)}</p>
${avis.map((a) => `<p class="avis" role="note">${e(a)}</p>`).join('\n')}
${infosGuide(g)}
${boss}
${pieges}
${manque}
<h2>Sources</h2>
<p>Ce guide est un résumé en français. Les détails complets sont chez les auteurs:</p>
<ul>${sources}</ul>
<h2>Trouver un groupe pour ${e(nom)}</h2>
<p>Sur Babillard Forever, tu publies une annonce ou tu rejoins celle d'un joueur du Québec ou de la francophonie. Il faut la même faction, la même région et le même type de serveur pour jouer ensemble.</p>
<p><a class="cta" href="/?guide=${encodeURIComponent(g.id)}">Ouvrir ce guide dans le site</a></p>
<div class="pas">
${precedent ? `<a href="/guides/${precedent.id}/">« ${e(nomFr(precedent))}</a>` : '<span></span>'}
${suivant ? `<a href="/guides/${suivant.id}/">${e(nomFr(suivant))} »</a>` : '<span></span>'}
</div>`
  ecrire(
    `guides/${g.id}`,
    page({
      chemin: `/guides/${g.id}/`,
      titre: `${nom}: guide du donjon (niveaux ${plage(g.niveaux)}) | Babillard Forever`,
      description: `Guide en français du donjon ${nom} (${g.nom[0]}), WoW Forever: niveaux ${plage(g.niveaux)}, accès, boss et pièges.`,
      corps,
    }),
  )
}

function pageGuides() {
  const item = (g) =>
    `<li><a href="/guides/${g.id}/"><strong>${e(nomFr(g))}</strong></a>${g.nom[1] ? ` <span class="niveaux">(${e(g.nom[0])})</span>` : ''}<br><span class="niveaux">Niveaux ${plage(g.niveaux)}${g.rdg ? ` · recherche de groupe dès le ${g.rdg}` : ''}${g.fiche ? ' · fiche courte' : ''}</span></li>`
  const nouveaux = GUIDES.filter((g) => g.nouveau)
  const autres = GUIDES.filter((g) => !g.nouveau)
  const corps = `<h1>Guides des donjons de WoW Forever</h1>
<p class="sous">${GUIDES.length} donjons, du niveau ${GUIDES[0].niveaux[0]} au niveau 60, en français</p>
<p>WoW Forever réunit des donjons de WoW Classic et de nouveaux donjons ajoutés par Blizzard. Chaque guide explique comment s'y rendre, ce que font les boss, quels monstres sont dangereux et quelles quêtes y mènent. Rien n'est inventé: chaque page cite ses sources (Icy Veins, Method, Wowhead, Kami-labs et d'autres) et dit clairement ce qu'elles ne disent pas ou ce sur quoi elles se contredisent.</p>
<p>Les noms de boss sont donnés en français quand la traduction est confirmée. Les capacités sont expliquées en mots simples, avec leur nom anglais, parce que c'est ce que tu vois dans le jeu. Pour retrouver un donjon par le nom d'un boss, d'une zone ou d'un niveau, utilise l'onglet Guides du site.</p>
<p><a class="cta" href="/?guide=${encodeURIComponent(GUIDES[0].id)}">Ouvrir les guides dans le site</a></p>
<h2>Nouveaux donjons de Forever</h2>
<ul class="liste-guides">${nouveaux.map(item).join('')}</ul>
<h2>Donjons classiques</h2>
<ul class="liste-guides">${autres.map(item).join('')}</ul>`
  ecrire(
    'guides',
    page({
      chemin: '/guides/',
      titre: 'Guides des donjons de WoW Forever en français | Babillard Forever',
      description: `${GUIDES.length} guides de donjons de WoW Forever en français: accès, boss, pièges et quêtes, du niveau ${GUIDES[0].niveaux[0]} au niveau 60.`,
      corps,
    }),
  )
}

// ---------- À propos ----------

function pageApropos() {
  const corps = `<h1>À propos de Babillard Forever</h1>
<p class="sous">Un babillard de groupes pour les joueurs francophones de WoW Forever</p>
<p>Babillard Forever est un site pour trouver du monde avec qui jouer à WoW Forever, la version du jeu qui revient sur le contenu classique. Il est fait pour le Québec et pour toute la francophonie, de l'Amérique à l'Europe. L'idée est simple: au lieu de crier « cherche tank pour les Mortemines » dans le canal général pendant vingt minutes, tu publies une annonce, et les joueurs qui correspondent te trouvent.</p>
<h2>Pourquoi ce site existe</h2>
<p>Le jeu a ses outils pour former des groupes, mais ils ne distinguent pas la langue. Quand tu veux jouer en français, avec des gens de ta région et de ton heure de jeu, c'est difficile de se retrouver. Le site ajoute ce qui manque: un filtre par langue, des annonces qui tiennent compte de ta faction, de ta région et de ton type de serveur, des profils de joueurs avec leur réputation, des guildes qui recrutent et des événements planifiés.</p>
<h2>Ce que tu y trouves</h2>
<ul>
<li><strong>Des groupes</strong> pour les donjons, les raids, le PvP et les quêtes, avec le rôle recherché (tank, heal, DPS) et les niveaux visés.</li>
<li><strong>Des joueurs</strong> qui cherchent un groupe, avec leur classe, leur niveau, leurs rôles et les pouces que d'autres leur ont donnés.</li>
<li><strong>Des guildes</strong> qui recrutent, avec ce qu'elles font et le style de jeu qu'elles visent.</li>
<li><strong>Des événements</strong> planifiés jusqu'à 60 jours d'avance, avec inscriptions et heure affichée à Montréal et à Paris.</li>
<li><strong>Des guides</strong> de donjons en français, avec leurs sources.</li>
<li><strong>Un compteur par serveur</strong> pour voir où jouent les gens du site.</li>
</ul>
<h2>Un site de fans, indépendant</h2>
<p>Babillard Forever est un projet de fans, créé et entretenu par un joueur du Québec. Il n'a aucun lien avec Blizzard Entertainment, qui n'a ni approuvé ni commandité le site. World of Warcraft et WoW Forever sont des marques de Blizzard Entertainment. Le site ne demande jamais ton mot de passe du jeu ni ton compte Battle.net.</p>
<h2>Gratuit et respectueux de ta vie privée</h2>
<p>Le site est gratuit. Un don facultatif aide à le garder en ligne. Tes contacts (BattleTag, Discord) ne sont montrés qu'aux joueurs connectés, et ton BattleTag n'est donné qu'à ceux que tu acceptes dans ton groupe. Tu peux cacher ton profil ou le supprimer en tout temps. Les détails sont dans la <a href="/confidentialite">politique de confidentialité</a>.</p>
<h2>Un bogue, une idée?</h2>
<p>Le site est en bêta et s'améliore avec tes commentaires. Dans le site, le lien « Un bogue ou une idée? » en bas de page envoie ton message directement à la personne qui s'occupe du site.</p>
<p><a class="cta" href="/">Trouver un groupe</a></p>`
  ecrire(
    'a-propos',
    page({
      chemin: '/a-propos/',
      titre: 'À propos de Babillard Forever, le babillard de groupes de WoW Forever en français',
      description:
        'Babillard Forever aide les joueurs francophones du Québec et de la francophonie à trouver un groupe pour les donjons, raids, quêtes et champs de bataille de WoW Forever.',
      corps,
    }),
  )
}

// ---------- Comment ça marche ----------

function pageCommentCaMarche() {
  const corps = `<h1>Comment ça marche</h1>
<p class="sous">Tout ce qu'il faut savoir pour trouver ou former un groupe sur Babillard Forever</p>
<p>Tu peux regarder les annonces sans compte. Pour demander à rejoindre un groupe, publier une annonce ou écrire à quelqu'un, il faut te connecter avec Google ou avec un courriel et un mot de passe, puis remplir ton profil.</p>

<h2>Trouver un groupe</h2>
<p>L'onglet Groupes montre les annonces actives. Filtre par type (donjon, raid, PvP, quêtes), par rôle, par niveau, par style de jeu ou par langue. Chaque annonce dit qui cherche quoi, le niveau visé, le type de serveur, la région et l'heure de départ si elle est planifiée. Quand tu te connectes avec un profil, tu ne vois d'abord que les groupes que l'un de tes personnages peut rejoindre; une pastille permet de voir les autres.</p>
<p>« Demander à rejoindre » envoie ton personnage (nom, classe, niveau), le rôle que tu veux jouer et un petit mot au chef du groupe. Il accepte ou refuse. Une fois accepté, tu as accès au chat du groupe et au contact du chef.</p>

<h2>Publier une annonce</h2>
<p>Choisis avec quel personnage tu publies, l'activité, le donjon ou le raid, les rôles dont tu as besoin et quand le groupe part: maintenant, ou plus tard avec une date et une heure. L'annonce disparaît toute seule après 1 à 6 heures, ou 1 heure après le départ si elle est planifiée. Quand tu as trouvé quelqu'un, les boutons « Tank trouvé », « Heal trouvé » et « DPS trouvé » mettent l'annonce à jour. Tu peux avoir 5 annonces actives à la fois.</p>

<h2>Qui peut jouer avec qui</h2>
<p>Dans WoW Forever, pour se voir en jeu et partir ensemble en donjon ou en quête, il faut trois choses identiques:</p>
<ul>
<li><strong>La même faction</strong>: Alliance avec Alliance, Horde avec Horde.</li>
<li><strong>La même région</strong>: Amérique (US) ou Europe (EU).</li>
<li><strong>Le même type de serveur</strong>: Normal (PvE), PvP, Jeu de rôle ou Jeu de rôle PvP, choisi à la création du personnage.</li>
</ul>
<p>Le site vérifie ces trois règles pour toi. Si aucun de tes personnages ne convient, tu ne vois pas le bouton pour rejoindre, et la raison est écrite à la place. Tu peux avoir jusqu'à 3 personnages dans ton profil.</p>

<h2>Les joueurs, les amis et les messages</h2>
<p>L'onglet Joueurs liste les profils visibles: classe, niveau, rôles, langue, style de jeu et réputation. Tu peux chercher un personnage, filtrer par classe ou par rôle, ne garder que ceux avec qui tu peux grouper, et voir qui est « dispo maintenant ». Un joueur peut se déclarer disponible pour 30 minutes, 1 heure ou 2 heures: il remonte alors en haut de la liste.</p>
<p>Pour ajouter un ami, trouve son personnage et envoie une demande: il doit l'accepter. Tes amis se retrouvent dans l'onglet Amis, avec la commande à copier pour les inviter dans le jeu. L'onglet Messages regroupe le chat de tes groupes, les discussions avec tes amis et la Taverne, un salon ouvert à tous les joueurs connectés.</p>

<h2>Les guildes</h2>
<p>Une guilde qui recrute s'inscrit pour 7 à 30 jours, avec ce qu'elle fait (donjons, raids, PvP, quêtes), le style de jeu, les rôles recherchés et le niveau minimum. Le lien d'invitation ou le contact de la guilde n'est montré qu'aux joueurs connectés.</p>

<h2>Les événements</h2>
<p>Dans l'onglet Groupes, la section « Événements à venir » sert pour un raid de guilde, une soirée donjons ou un tournoi PvP prévus jusqu'à 60 jours d'avance. Les joueurs s'inscrivent avec un de leurs personnages et leur rôle, en « présent » ou « peut-être ». Quand l'événement a un nombre de places, seuls les présents comptent. L'heure s'affiche dans ton fuseau, avec celle de Montréal et de Paris à côté, et tu peux l'ajouter à ton calendrier.</p>

<h2>Les alertes</h2>
<p>Tu peux demander une alerte pour les nouvelles annonces qui correspondent à tes filtres, et activer les notifications sur ton appareil pour être prévenu même quand le site est fermé: demande à rejoindre ton groupe, acceptation, message d'un ami, départ dans 15 minutes. Les notifications ne contiennent jamais le texte d'un message. Chaque appareil s'active séparément et tu peux tout couper en tout temps.</p>

<h2>Réputation et sécurité</h2>
<p>À la fin d'un groupe, tu peux donner un pouce aux joueurs avec qui ça a bien été. Une réputation positive aide les autres à te choisir. Les comportements comme le leave ninja ou le need sur tout peuvent aussi être signalés, mais seulement par ceux qui étaient dans le même groupe. Les annonces, guildes, messages et joueurs peuvent être signalés: trois signalements de personnes différentes masquent le contenu en attendant que les modérateurs le vérifient. Les comptes qui abusent sont suspendus.</p>

<h2>Questions fréquentes</h2>
<h3>Est-ce que le site est gratuit?</h3>
<p>Oui. Un don facultatif aide à le garder en ligne.</p>
<h3>Est-ce que j'ai besoin de mon compte Battle.net?</h3>
<p>Non. Le site te demande seulement un compte pour t'identifier. Ton BattleTag est facultatif et n'est donné qu'aux joueurs que tu acceptes.</p>
<h3>Et si je joue en anglais?</h3>
<p>Le site est en français, mais les annonces peuvent être en anglais, et un filtre « Français seulement » permet de les cacher.</p>
<h3>Comment inviter quelqu'un dans le jeu?</h3>
<p>Sur la carte du joueur ou de l'annonce, le bouton « Copier » met la commande <code>/invite Nom</code> ou <code>/w Nom</code> dans ton presse-papiers. Dans le jeu, ouvre le clavardage, colle la commande, puis valide.</p>
<h3>Comment supprimer mon profil?</h3>
<p>Dans « Mon profil », tu peux cacher ton profil de la liste ou le supprimer complètement.</p>
<p><a class="cta" href="/">Essayer le site</a></p>`
  ecrire(
    'comment-ca-marche',
    page({
      chemin: '/comment-ca-marche/',
      titre: 'Comment ça marche | Babillard Forever, groupes WoW Forever en français',
      description:
        "Comment trouver ou former un groupe de donjon, de raid ou de PvP sur Babillard Forever: annonces, règles pour jouer ensemble, profils, amis, guildes, événements et alertes.",
      corps,
    }),
  )
}

// ---------- Plan du site ----------

function sitemap() {
  const urls = [
    ['/', 1.0],
    ['/guides/', 0.8],
    ['/comment-ca-marche/', 0.7],
    ['/a-propos/', 0.5],
    ...GUIDES.map((g) => [`/guides/${g.id}/`, 0.6]),
    ['/confidentialite', 0.3],
  ]
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(([u, p]) => `  <url><loc>${SITE}${u}</loc><lastmod>${aujourdhui}</lastmod><priority>${p}</priority></url>`).join('\n')}
</urlset>
`
  writeFileSync(join(dist, 'sitemap.xml'), xml)
  return urls.length
}

GUIDES.forEach(pageGuide)
pageGuides()
pageApropos()
pageCommentCaMarche()
const n = sitemap()
console.log(`Pages statiques: ${GUIDES.length} guides, la liste des guides, À propos et Comment ça marche; plan du site: ${n} adresses (${dist})`)
