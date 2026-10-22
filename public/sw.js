// Service worker de Babillard Forever: affiche les alertes (notifications push) et ouvre le site quand on clique dessus.
// Il ne garde aucun fichier en cache: le site se met à jour normalement.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('push', (event) => {
  let d = {}
  try {
    d = event.data ? event.data.json() : {}
  } catch {
    d = {}
  }
  const url = typeof d.url === 'string' && d.url.startsWith('/') && !d.url.startsWith('//') ? d.url : '/?vue=messages'
  event.waitUntil(
    self.registration.showNotification(typeof d.titre === 'string' && d.titre ? d.titre : 'Babillard Forever', {
      body: typeof d.texte === 'string' && d.texte ? d.texte : 'Nouvelle activité.',
      icon: '/icone-192.png',
      badge: '/icone-192.png',
      tag: 'babillard',
      data: { url },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/?vue=messages'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((fenetres) => {
      for (const f of fenetres) {
        if ('focus' in f) {
          f.postMessage({ type: 'ouvrir', url })
          return f.focus()
        }
      }
      return self.clients.openWindow(url)
    }),
  )
})
