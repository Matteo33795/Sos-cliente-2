// Gestione delle notifiche push, importato dentro il service worker
// generato automaticamente da vite-plugin-pwa (vedi vite.config.ts,
// workbox.importScripts).

self.addEventListener('push', (event) => {
  let data = { title: 'Stoccaggio', body: 'Aggiornamento disponibile' }
  try {
    if (event.data) data = event.data.json()
  } catch {
    // payload non JSON: usa i valori di default sopra
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { materialeId: data.materialeId },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const materialeId = event.notification.data?.materialeId
  const url = materialeId ? `/materiali/${materialeId}` : '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url)
    }),
  )
})
