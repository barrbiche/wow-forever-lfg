// Alertes sur l'appareil (notifications push): activées par chaque personne, appareil par appareil.
// La base (supabase/ameliorations10.sql, partie 4) garde l'abonnement; une fonction Netlify (netlify/functions/push.mjs) envoie.
// Rien ne s'affiche tant que VITE_VAPID_PUBLIC n'est pas défini dans Netlify.
import { modeDemo, supabase } from './store.js'

const CLE_PUBLIQUE = (import.meta.env.VITE_VAPID_PUBLIC || '').trim()
const CLE_COMPTE = 'forever-push-compte' // qui a activé les alertes sur cet appareil

export const pushConfigure = !!CLE_PUBLIQUE && !modeDemo

// Quand les alertes de cet appareil changent (activées, coupées), le reste de la page relit l'état.
const EVENEMENT = 'forever-push-change'
const prevenir = () => {
  try {
    window.dispatchEvent(new Event(EVENEMENT))
  } catch {
    // pas grave
  }
}
export function ecouterChangementPush(rappel) {
  window.addEventListener(EVENEMENT, rappel)
  return () => window.removeEventListener(EVENEMENT, rappel)
}

export const pushSupporte = () =>
  typeof navigator !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

const lireCompte = () => {
  try {
    return localStorage.getItem(CLE_COMPTE)
  } catch {
    return null
  }
}

const ecrireCompte = (id) => {
  try {
    if (id) localStorage.setItem(CLE_COMPTE, id)
    else localStorage.removeItem(CLE_COMPTE)
  } catch {
    // navigation privée: on ne retient pas qui a activé les alertes
  }
}

function enOctets(base64url) {
  const base64 = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  const binaire = atob(base64)
  return Uint8Array.from(binaire, (c) => c.charCodeAt(0))
}

async function abonnementActuel() {
  const reg = await navigator.serviceWorker.ready
  return { reg, sub: await reg.pushManager.getSubscription() }
}

// { supporte, bloque, actif } pour la personne connectée (id). `actif`: cet appareil reçoit ses alertes.
export async function etatPush(idCompte) {
  if (!pushConfigure || !pushSupporte()) return { supporte: false, bloque: false, actif: false }
  try {
    const { sub } = await abonnementActuel()
    return {
      supporte: true,
      bloque: Notification.permission === 'denied',
      actif: !!sub && Notification.permission === 'granted' && lireCompte() === idCompte,
    }
  } catch {
    return { supporte: false, bloque: false, actif: false }
  }
}

export async function activerPush(idCompte) {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw Object.assign(new Error('permission refusée'), { code: 'refuse' })
  const { reg, sub: existant } = await abonnementActuel()
  const sub = existant ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: enOctets(CLE_PUBLIQUE) }))
  const j = sub.toJSON()
  const { error } = await supabase.rpc('enregistrer_push', { p_endpoint: j.endpoint, p_p256dh: j.keys?.p256dh, p_auth: j.keys?.auth })
  if (error) throw error
  ecrireCompte(idCompte)
  prevenir()
}

export async function desactiverPush() {
  try {
    const { sub } = await abonnementActuel()
    if (sub) {
      await supabase.rpc('retirer_push', { p_endpoint: sub.endpoint })
      await sub.unsubscribe()
    }
  } finally {
    ecrireCompte(null)
    prevenir()
  }
}

// À la déconnexion: cet appareil ne reçoit plus les alertes de ce compte.
export async function retirerAlertesAppareil() {
  if (!pushConfigure || !pushSupporte() || !lireCompte()) return
  try {
    await desactiverPush()
  } catch {
    // la déconnexion continue quand même
  }
}

// Une fois par visite: on garde l'abonnement à jour (il expire après 60 jours sans visite).
export async function rafraichirPush(idCompte) {
  if (!pushConfigure || !pushSupporte() || lireCompte() !== idCompte || Notification.permission !== 'granted') return
  try {
    const { sub } = await abonnementActuel()
    if (!sub) return
    const j = sub.toJSON()
    await supabase.rpc('enregistrer_push', { p_endpoint: j.endpoint, p_p256dh: j.keys?.p256dh, p_auth: j.keys?.auth })
  } catch {
    // pas grave: ce sera refait à la prochaine visite
  }
}

// ---------- Alerte « nouvelle annonce » gardée sur le serveur (ameliorations16.sql) ----------
// Les filtres de l'alerte sont aussi gardés avec ton compte pour que le serveur t'envoie une alerte sur tes appareils,
// même quand le site est fermé. Chaque fonction retourne sans erreur si la base n'est pas à jour.

export async function enregistrerAlerteAnnonces(filtres) {
  if (!pushConfigure) return false
  try {
    const { error } = await supabase.rpc('enregistrer_alerte_annonces', { p_filtres: filtres })
    return !error
  } catch {
    return false
  }
}

export async function retirerAlerteAnnonces() {
  if (!pushConfigure) return false
  try {
    const { error } = await supabase.rpc('retirer_alerte_annonces')
    return !error
  } catch {
    return false
  }
}

// Les filtres de l'alerte du compte, ou null (pas d'alerte, ou base pas à jour).
export async function lireAlerteAnnonces() {
  if (!pushConfigure) return null
  try {
    const { data, error } = await supabase.rpc('mon_alerte_annonces')
    return !error && data && typeof data === 'object' ? data : null
  } catch {
    return null
  }
}
