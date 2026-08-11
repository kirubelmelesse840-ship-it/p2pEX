self.addEventListener('install', (e) => { self.skipWaiting() })
self.addEventListener('activate', (e) => { e.waitUntil(self.clients.claim()) })
self.addEventListener('push', (event) => {
  let p = {}; try { p = event.data ? event.data.json() : {} } catch { p = { title: 'P2PEX', body: event.data ? event.data.text() : 'Notification' } }
  const { title = 'P2PEX', body = 'New update', url = '/', tag = 'p2pex' } = p
  event.waitUntil(self.registration.showNotification(title, { body, icon: '/logo.png', badge: '/logo.png', tag, data: { url }, vibrate: [100, 50, 100] }))
})
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil((async () => { const cs = await self.clients.matchAll({ type: 'window', includeUncontrolled: true }); for (const c of cs) { if ('focus' in c) { try { await c.focus(); if ('navigate' in c) await c.navigate(url); return } catch {} } } if (self.clients.openWindow) { try { await self.clients.openWindow(url) } catch {} } })())
})
