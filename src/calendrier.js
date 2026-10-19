// « Ajouter à mon calendrier »: fabrique un fichier .ics (iCalendar) pour un groupe planifié.
// Il marche avec Google Agenda, Apple Calendrier, Outlook, Thunderbird, etc. Le contact de l'annonce n'y est pas mis
// (un fichier de calendrier se partage facilement): seulement le nom du personnage et le lien de l'annonce.

const DUREE_PREVUE_MS = 2 * 3600000 // le calendrier a besoin d'une fin: on réserve 2 h
const ACTIVITES = { donjon: 'Donjon', raid: 'Raid', pvp: 'PvP' }
const ROLES = { tank: 'tank', heal: 'heal', dps: 'DPS' }

// Date au format iCalendar, en UTC: 20261104T200000Z
export const dateIcs = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

// Texte d'une propriété: on protège \ ; , et les retours à la ligne.
export const echapperIcs = (texte) =>
  String(texte ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')

// Une ligne iCalendar ne dépasse pas 75 octets: on la coupe (sans casser un caractère) et on continue avec une espace.
export function plier(ligne) {
  const encodeur = new TextEncoder()
  if (encodeur.encode(ligne).length <= 75) return ligne
  const morceaux = []
  let courant = ''
  let taille = 0
  let limite = 75
  for (const car of ligne) {
    const n = encodeur.encode(car).length
    if (taille + n > limite) {
      morceaux.push(courant)
      courant = ''
      taille = 0
      limite = 74 // les lignes suivantes commencent par une espace
    }
    courant += car
    taille += n
  }
  if (courant) morceaux.push(courant)
  return morceaux.join('\r\n ')
}

export function fabriquerIcs(annonce, origine, maintenant = new Date()) {
  const debut = new Date(annonce.debut)
  const fin = new Date(debut.getTime() + DUREE_PREVUE_MS)
  const joueurSeul = annonce.genre === 'joueur'
  const faction = annonce.faction === 'horde' ? 'Horde' : 'Alliance'
  const niveaux =
    annonce.niveau_min === annonce.niveau_max
      ? `niveau ${annonce.niveau_min}`
      : `niveaux ${annonce.niveau_min} à ${annonce.niveau_max}`
  const roles = (annonce.roles ?? []).map((r) => ROLES[r] ?? r)
  const lignesTexte = [
    `${joueurSeul ? 'Joueur seul' : 'Groupe'} ${faction}, ${niveaux}.`,
    roles.length ? `${joueurSeul ? 'Joue' : 'Cherche'}: ${roles.join(', ')}.` : '',
    annonce.perso ? `Personnage: ${annonce.perso}.` : '',
    annonce.note ? `Message: ${annonce.note}` : '',
    annonce.id ? `Annonce: ${origine}/?annonce=${encodeURIComponent(annonce.id)}` : '',
    "Le contact est sur l'annonce (connecte-toi pour le voir).",
  ].filter(Boolean)

  const lignes = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Babillard Forever//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:annonce-${annonce.id}@babillard-forever`,
    `DTSTAMP:${dateIcs(maintenant)}`,
    `DTSTART:${dateIcs(debut)}`,
    `DTEND:${dateIcs(fin)}`,
    `SUMMARY:${echapperIcs(`${ACTIVITES[annonce.activite] ?? 'Groupe'}: ${annonce.cible}`)}`,
    `DESCRIPTION:${echapperIcs(lignesTexte.join('\n'))}`,
    annonce.id ? `URL:${origine}/?annonce=${encodeURIComponent(annonce.id)}` : '',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${echapperIcs(`Départ dans 15 minutes: ${annonce.cible}`)}`,
    'TRIGGER:-PT15M',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean)

  return lignes.map(plier).join('\r\n') + '\r\n'
}

// Nom de fichier sûr: « groupe-the-deadmines.ics »
export function nomFichierIcs(annonce) {
  const base = String(annonce.cible ?? 'groupe')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `groupe-${base || 'forever'}.ics`
}

// Déclenche le téléchargement du fichier (le navigateur propose ensuite de l'ouvrir dans le calendrier).
export function telechargerIcs(annonce) {
  const contenu = fabriquerIcs(annonce, window.location.origin)
  const blob = new Blob([contenu], { type: 'text/calendar;charset=utf-8' })
  const adresse = URL.createObjectURL(blob)
  const lien = document.createElement('a')
  lien.href = adresse
  lien.download = nomFichierIcs(annonce)
  document.body.appendChild(lien)
  lien.click()
  lien.remove()
  setTimeout(() => URL.revokeObjectURL(adresse), 10000)
}
