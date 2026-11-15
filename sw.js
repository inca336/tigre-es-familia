/* Service worker de Tigre es Familia: permite jugar SIN CONEXIÓN.
   - Mismo origen (el juego, audio, íconos): "primero la red" -> si hay internet baja siempre la última versión
     y la guarda; si no hay internet (o tarda más de 5 s) usa la copia guardada.
   - Tipografías de Google y fotos de 1902historiatigre.com: se guardan al verlas (poco espacio) para que se vean sin internet.
   - Supabase (cuenta, clasificación) NO se toca: necesita internet.
   Para forzar que todos limpien la copia guardada, subir el número de VERSION. */
const VERSION = 'tef-v3';
const EXT = 'tef-ext-v1';
const EXT_MAX = 60;
const BASE = self.registration.scope;
const CORE = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'taller-de-caras.html'];
const AUDIO = ["cancion-droga.mp3", "cancion-gente.mp3", "cancion-vida.mp3", "grito-gol.mp3", "tribuna-arsenal-2007.mp3", "tribuna-cai-2007.mp3", "tribuna-chacarita-2006.mp3", "tribuna-chacarita-2007.mp3", "tribuna-gimnasia-2008.mp3", "tribuna-independiente-2008.mp3", "tribuna-platense-2006.mp3", "tribuna-racing-2007-a.mp3", "tribuna-racing-2007-b.mp3", "tribuna-san-martin.mp3"];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    await Promise.all(CORE.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => {})));
    await Promise.all(AUDIO.map(u => c.add(new Request('audio/' + u, { cache: 'reload' })).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VERSION && k !== EXT) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.hostname.endsWith('supabase.co')) return;
  if (u.origin === location.origin) e.respondWith(propio(r, u));
  else if (/(^|\.)(googleapis|gstatic)\.com$|(^|\.)1902historiatigre\.com$/.test(u.hostname)) e.respondWith(externo(r));
});

async function propio(r, u) {
  const c = await caches.open(VERSION);
  const clave = new Request(u.origin + u.pathname);
  const guardada = await c.match(clave);
  const red = fetch(r).then(resp => {
    if (resp && resp.ok && resp.status === 200) c.put(clave, resp.clone()).catch(() => {});
    return resp;
  });
  if (!guardada) {
    try { return await red; }
    catch (err) {
      if (r.mode === 'navigate') { const idx = await c.match(new Request(BASE + 'index.html')); if (idx) return idx; }
      return new Response('Sin conexión y todavía no hay copia guardada. Abrí el juego una vez con internet.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }
  }
  red.catch(() => {});
  return Promise.race([
    red.then(resp => (resp && resp.status >= 500 ? guardada : resp)),
    new Promise(res => setTimeout(() => res(guardada), 5000))
  ]).catch(() => guardada);
}

async function externo(r) {
  const c = await caches.open(EXT);
  const guardada = await c.match(r);
  const red = fetch(r).then(resp => {
    if (resp && (resp.ok || resp.type === 'opaque')) {
      c.put(r, resp.clone()).then(async () => {
        const ks = await c.keys();
        for (let i = 0; i < ks.length - EXT_MAX; i++) await c.delete(ks[i]);
      }).catch(() => {});
    }
    return resp;
  });
  if (guardada) { red.catch(() => {}); return guardada; }
  return red.catch(() => Response.error());
}
