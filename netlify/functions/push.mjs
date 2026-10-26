// Reçoit une alerte de la base de données (Supabase) et la remet aux appareils des joueurs (notifications push).
// La base appelle cette adresse avec le secret « PUSH_SECRET »; sans lui, personne ne peut faire envoyer d'alertes.
// Réglages à mettre dans Netlify (Site configuration > Environment variables): PUSH_SECRET, VAPID_PUBLIC, VAPID_PRIVE, VAPID_SUJET.
import { timingSafeEqual } from 'node:crypto'
import webpush from 'web-push'

const JSON_ENTETES = { 'Content-Type': 'application/json' }
const reponse = (statut, corps) => new Response(JSON.stringify(corps), { status: statut, headers: JSON_ENTETES })

function memeSecret(recu, attendu) {
  const a = Buffer.from(String(recu ?? ''))
  const b = Buffer.from(String(attendu ?? ''))
  return a.length === b.length && a.length > 0 && timingSafeEqual(a, b)
}

const texteCourt = (v, max) => typeof v === 'string' && v.length > 0 && v.length <= max

// `envoyer(abonnement, message)` est remplaçable pour les tests.
export async function traiter(requete, { env, envoyer }) {
  if (requete.method !== 'POST') return reponse(405, { erreur: 'POST seulement' })
  if (!env.PUSH_SECRET) return reponse(500, { erreur: 'PUSH_SECRET manque dans Netlify' })
  const entete = requete.headers.get('authorization') ?? ''
  if (!entete.startsWith('Bearer ') || !memeSecret(entete.slice(7), env.PUSH_SECRET)) return reponse(401, { erreur: 'refusé' })

  let corps
  try {
    corps = await requete.json()
  } catch {
    return reponse(400, { erreur: 'JSON invalide' })
  }
  const { titre, texte, url, abonnes } = corps ?? {}
  if (!texteCourt(titre, 80) || !texteCourt(texte, 200) || !texteCourt(url, 200) || !url.startsWith('/') || url.startsWith('//')) {
    return reponse(400, { erreur: 'message invalide' })
  }
  if (!Array.isArray(abonnes) || abonnes.length === 0 || abonnes.length > 50) return reponse(400, { erreur: 'abonnés invalides' })
  const valides = abonnes.filter(
    (a) => a && typeof a.endpoint === 'string' && a.endpoint.startsWith('https://') && texteCourt(a.p256dh, 200) && texteCourt(a.auth, 100),
  )
  const message = JSON.stringify({ titre, texte, url })
  const resultats = await Promise.allSettled(valides.map((a) => envoyer(a, message)))
  const envoyes = resultats.filter((r) => r.status === 'fulfilled').length
  return reponse(200, { envoyes, echecs: resultats.length - envoyes, ignores: abonnes.length - valides.length })
}

export default async (requete) => {
  const env = process.env
  if (env.VAPID_PUBLIC && env.VAPID_PRIVE) {
    webpush.setVapidDetails(env.VAPID_SUJET || 'https://babillard-forever.com', env.VAPID_PUBLIC, env.VAPID_PRIVE)
  }
  return traiter(requete, {
    env,
    envoyer: (a, message) =>
      webpush.sendNotification({ endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } }, message, { TTL: 3600, urgency: 'normal' }),
  })
}
