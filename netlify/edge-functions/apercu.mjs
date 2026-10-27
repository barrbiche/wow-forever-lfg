// Quand on colle le lien d'une annonce ou d'une guilde (?annonce=ID ou ?guilde=ID) dans Discord, Facebook, Messenger
// ou ailleurs, ces services lisent la page sans exécuter le site. Cette fonction écrit alors le titre et la description
// de l'annonce dans la page, pour que l'aperçu dise « Donjon: The Deadmines — cherche DPS » au lieu du texte général.
//
// Elle lit la base avec la clé publique (la même que dans le site). Si quelque chose manque ou échoue, la page normale
// est servie: le site ne casse jamais à cause de cette fonction.
import { apercuAnnonce, apercuGuilde, ecrireApercu, idValide } from './apercu-texte.mjs'

const COLONNES_ANNONCE = 'activite,cible,faction,niveau_min,niveau_max,roles,perso,note,genre,expires_at'
const COLONNES_GUILDE = 'nom,faction,region,description,expires_at'

async function lireLigne(base, cle, table, colonnes, id) {
  const adresse = `${base}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}&select=${colonnes}&limit=1`
  const reponse = await fetch(adresse, {
    headers: { apikey: cle, Authorization: `Bearer ${cle}` },
    signal: AbortSignal.timeout(1500),
  })
  if (!reponse.ok) return null
  const lignes = await reponse.json()
  const ligne = Array.isArray(lignes) ? lignes[0] : null
  if (!ligne || (ligne.expires_at && new Date(ligne.expires_at).getTime() <= Date.now())) return null
  return ligne
}

export default async function apercu(requete, contexte) {
  const reponse = await contexte.next()
  try {
    const url = new URL(requete.url)
    const annonce = url.searchParams.get('annonce')
    const guilde = url.searchParams.get('guilde')
    const id = annonce || guilde
    if (!id || !idValide(id) || !(reponse.headers.get('content-type') ?? '').includes('text/html')) return reponse

    const env = globalThis.Netlify?.env
    const base = env?.get('VITE_SUPABASE_URL') || env?.get('SUPABASE_URL')
    const cle = env?.get('VITE_SUPABASE_ANON_KEY') || env?.get('SUPABASE_ANON_KEY')
    if (!base || !cle) return reponse

    const ligne = annonce
      ? await lireLigne(base, cle, 'annonces', COLONNES_ANNONCE, id)
      : await lireLigne(base, cle, 'guildes', COLONNES_GUILDE, id)
    if (!ligne) return reponse

    const texte = annonce ? apercuAnnonce(ligne) : apercuGuilde(ligne)
    const html = ecrireApercu(await reponse.text(), { ...texte, url: url.href })
    const entetes = new Headers(reponse.headers)
    entetes.delete('content-length')
    entetes.set('Cache-Control', 'public, max-age=0, must-revalidate')
    return new Response(html, { status: reponse.status, headers: entetes })
  } catch {
    return reponse
  }
}

export const config = { path: ['/', '/index.html'] }
