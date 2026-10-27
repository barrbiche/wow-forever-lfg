// Texte de l'aperçu d'un lien (Discord, Facebook, Messenger...) pour une annonce ou une guilde.
// Fonctions simples, sans dépendance, pour qu'on puisse les tester avec Node.

const ACTIVITES = { donjon: 'Donjon', raid: 'Raid', pvp: 'PvP', quete: 'Quêtes' }
const ROLES = { tank: 'Tank', heal: 'Heal', dps: 'DPS' }
const FACTIONS = { alliance: 'Alliance', horde: 'Horde' }
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const idValide = (id) => typeof id === 'string' && UUID.test(id)

const net = (t, max) => String(t ?? '').replace(/\s+/g, ' ').trim().slice(0, max)

function niveaux(min, max) {
  if (!min && !max) return ''
  if (min && max && min !== max) return `niveaux ${min}-${max}`
  return `niveau ${min || max}`
}

export function apercuAnnonce(a) {
  const activite = ACTIVITES[a.activite] ?? 'Annonce'
  const cible = net(a.cible, 60)
  const niv = niveaux(a.niveau_min, a.niveau_max)
  const faction = FACTIONS[a.faction] ?? ''
  const roles = (Array.isArray(a.roles) ? a.roles : []).map((r) => ROLES[r]).filter(Boolean)
  const seul = a.genre === 'joueur'
  const morceaux = []
  if (a.perso) morceaux.push(seul ? `${net(a.perso, 24)} cherche un groupe` : `${net(a.perso, 24)} forme un groupe`)
  if (!seul && roles.length) morceaux.push(`cherche ${roles.join(', ')}`)
  if (seul && roles.length) morceaux.push(`joue ${roles.join(', ')}`)
  if (niv) morceaux.push(niv)
  if (faction) morceaux.push(faction)
  const note = net(a.note, 140)
  const debut = [morceaux.join(' · '), note ? `« ${note} »` : ''].filter(Boolean).join(' — ')
  return {
    titre: `${activite}${cible ? `: ${cible}` : ''}${seul ? ' (joueur seul)' : ''} — Babillard Forever`,
    description: debut || 'Une annonce sur Babillard Forever. Demande à rejoindre le groupe.',
  }
}

export function apercuGuilde(g) {
  const nom = net(g.nom, 60) || 'Guilde'
  const faction = FACTIONS[g.faction] ?? ''
  const desc = net(g.description, 200)
  const entete = ['Guilde', faction, g.region ? String(g.region).toUpperCase() : ''].filter(Boolean).join(' · ')
  return {
    titre: `${nom} — Guilde sur Babillard Forever`,
    description: [entete, desc].filter(Boolean).join(' — '),
  }
}

const echapper = (t) =>
  String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// Remplace le titre et la description dans la page d'accueil (index.html). Si une balise manque, la page reste telle quelle.
export function ecrireApercu(html, { titre, description, url }) {
  const t = echapper(titre)
  const d = echapper(description)
  const remplace = (h, motif, nouveau) => h.replace(motif, () => nouveau)
  let h = html
  h = remplace(h, /<title>[^<]*<\/title>/, `<title>${t}</title>`)
  h = remplace(h, /<meta name="description" content="[^"]*"\s*\/?>/, `<meta name="description" content="${d}" />`)
  h = remplace(h, /<meta property="og:title" content="[^"]*"\s*\/?>/, `<meta property="og:title" content="${t}" />`)
  h = remplace(h, /<meta property="og:description" content="[^"]*"\s*\/?>/, `<meta property="og:description" content="${d}" />`)
  h = remplace(h, /<meta property="og:url" content="[^"]*"\s*\/?>/, `<meta property="og:url" content="${echapper(url)}" />`)
  return h
}
