/* Service worker mínimo: sin caché a propósito (siempre baja la última versión del juego).
   Existe solo para que Chrome permita instalar el juego como app en el celu. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).catch(() => new Response('Sin conexión. Volvé a intentar.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })));
});
