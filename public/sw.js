// People App — Service Worker
const CACHE_NAME = 'people-v7.3.5-mpcqdcam';
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/favicon.png',
  '/icons/pwa/icon-192x192.png',
  '/icons/pwa/icon-512x512.png',
  '/images/blackdog.png',
  '/images/Naz_Logo.jpg',
  '/sounds/bark.mp3',
  '/sounds/meow.mp3',
];

// Install: pre-cache shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch(() => {
        // If some assets fail, continue anyway
      });
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch: Network-first for API calls, Cache-first for assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only handle http/https — skip chrome-extension://, data:, etc.
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // ── PUNCH INTERCEPT (POST a process_timelog / insert_manual_timelog) ──
  // Red de seguridad nivel SW: si el backend está caído o devuelve 5xx,
  // capturamos el body y lo reenviamos a /api/punch-beacon. Si TAMBIÉN falla
  // ese reenvío, lo encolamos en IndexedDB del SW y registramos un Background
  // Sync para reintentar cuando vuelva la red. Devolvemos al cliente una
  // respuesta sintética {success:true, queued_by_sw:true} para que el flujo
  // de UI no muestre error.
  if (event.request.method === 'POST') {
    const isPunchRpc = url.pathname.includes('/rpc/process_timelog') ||
                       url.pathname.includes('/rpc/insert_manual_timelog');
    if (isPunchRpc) {
      event.respondWith(handlePunchPost(event.request));
      return;
    }
  }

  // Skip non-GET (rest of fetch handler)
  if (event.request.method !== 'GET') return;

  // Skip range requests — the Cache API can't store partial (206) responses,
  // and they bubble up as TypeError("Partial response is unsupported").
  if (event.request.headers.has('range')) return;

  // Helper: only put successful, non-partial, basic/cors responses into the cache.
  const isCacheable = (response) =>
    response &&
    response.status === 200 &&
    (response.type === 'basic' || response.type === 'cors');

  // Skip analytics, launcher, API calls, auth, supabase, and external services
  if (
    url.pathname.startsWith('/analytics') ||
    url.pathname.startsWith('/launcher') ||
    url.pathname.startsWith('/rest/') ||
    url.pathname.startsWith('/auth/') ||
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('supabase') ||
    url.hostname.includes('auth0') ||
    url.hostname.includes('ipify') ||
    url.hostname.includes('ipapi')
  ) {
    return;
  }

  // For navigation requests — network first with cache fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (isCacheable(response)) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone)).catch(() => {});
          }
          return response;
        })
        .catch(() => caches.match('/index.html').then((r) => r ?? fetch('/index.html')))
    );
    return;
  }

  // For static assets — cache first with network fallback
  if (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|ico|woff2?|ttf|mp3|webp)$/)
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (isCacheable(response)) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone)).catch(() => {});
          }
          return response;
        }).catch(() => new Response('', { status: 503 }));
      })
    );
    return;
  }

  // Everything else — network first
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then((r) => r ?? new Response('', { status: 503 })))
  );
});

// Push notification handler
self.addEventListener('push', (event) => {
  let data = { title: 'People', body: 'Nueva notificación', icon: '/icons/pwa/icon-192x192.png' };
  try {
    if (event.data) {
      data = { ...data, ...event.data.json() };
    }
  } catch (e) {
    if (event.data) {
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/icons/pwa/icon-192x192.png',
      badge: '/icons/pwa/icon-96x96.png',
      vibrate: [100, 50, 100],
      data: data.data || {},
    })
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});

// ─────────────────────────────────────────────────────────────────────
// PUNCH RESCUE LAYER — Service Worker level
// ─────────────────────────────────────────────────────────────────────
// Cuando la app intenta POSTear a /rest/v1/rpc/process_timelog y el backend
// está apagado (deploy, restart, 502) o lento (timeout), el cliente normal
// vería un error. Aquí lo capturamos: reintentamos contra /api/punch-beacon
// que SIEMPRE devuelve 200 si pudo escribir a disco. Si todo falla, encolamos
// en una IDB privada del SW y registramos Background Sync para reintentar.
//
// Diseño deliberado: NUNCA devolvemos un error al cliente para una marcación.
// La peor respuesta posible es {success:true, queued_by_sw:true} — la app la
// trata como éxito y el banner persistente de PunchQueueService eventualmente
// muestra el conteo cuando los datos lleguen al frontend desde otra capa.

const SW_DB_NAME = 'sw_punch_queue';
const SW_DB_VERSION = 1;
const SW_STORE = 'queue';
const SW_SYNC_TAG = 'sw-punch-queue-sync';

function swOpenDB() {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(SW_DB_NAME, SW_DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(SW_STORE)) {
          db.createObjectStore(SW_STORE, { keyPath: 'id', autoIncrement: true });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch { resolve(null); }
  });
}

async function swQueueEnqueue(payload) {
  const db = await swOpenDB();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(SW_STORE, 'readwrite');
      tx.objectStore(SW_STORE).add({ payload, enqueued_at: Date.now() });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
      tx.onabort = () => resolve(false);
    } catch { resolve(false); }
  });
}

async function swQueueGetAll() {
  const db = await swOpenDB();
  if (!db) return [];
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(SW_STORE, 'readonly');
      const req = tx.objectStore(SW_STORE).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    } catch { resolve([]); }
  });
}

async function swQueueDelete(id) {
  const db = await swOpenDB();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(SW_STORE, 'readwrite');
      tx.objectStore(SW_STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch { resolve(); }
  });
}

/**
 * Extrae los campos del payload de process_timelog (con prefijo p_) para
 * mapearlos al shape esperado por /api/punch-beacon.
 */
function mapRpcPayloadToBeacon(rpcBody) {
  return {
    employee_id: rpcBody.p_employee_id ?? rpcBody.employee_id,
    branch_id: rpcBody.p_branch_id ?? rpcBody.branch_id,
    company_id: rpcBody.p_company_id ?? rpcBody.company_id,
    type: rpcBody.p_type ?? rpcBody.type,
    punched_at: rpcBody.p_punched_at ?? rpcBody.punched_at ?? new Date().toISOString(),
    ip: rpcBody.p_ip ?? rpcBody.ip ?? null,
    invalid_ip: rpcBody.p_invalid_ip ?? rpcBody.invalid_ip ?? false,
    auth_method: rpcBody.p_auth_method ?? rpcBody.auth_method ?? null,
    reason: rpcBody.p_reason ?? 'SW rescue (RPC falló o timeout)',
  };
}

async function postToBeacon(beaconPayload) {
  try {
    const r = await fetch('/api/punch-beacon', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(beaconPayload),
      credentials: 'omit',
      keepalive: true,
    });
    return r.ok;
  } catch { return false; }
}

async function handlePunchPost(request) {
  // Clonar primero — el body es un stream y sólo se puede leer una vez.
  let bodyText = '';
  let parsedBody = {};
  try {
    bodyText = await request.clone().text();
    parsedBody = bodyText ? JSON.parse(bodyText) : {};
  } catch { /* malformed body, igual continuamos */ }

  // 1) Camino feliz: dejar pasar el request original. Si el backend responde
  //    bien (status < 500), devolver esa respuesta al cliente sin tocar nada.
  try {
    const upstream = await fetch(request.clone());
    if (upstream.status < 500) {
      return upstream;
    }
    // Backend respondió 5xx — caer a rescate.
    console.warn('[SW Punch Rescue] upstream', upstream.status);
  } catch (err) {
    // Network error / timeout — caer a rescate.
    console.warn('[SW Punch Rescue] fetch failed', err);
  }

  // 2) Rescate: mandar al beacon.
  const beaconPayload = mapRpcPayloadToBeacon(parsedBody);
  const beaconOk = await postToBeacon(beaconPayload);
  if (beaconOk) {
    return new Response(JSON.stringify({
      success: true,
      queued_by_sw: true,
      rescued_via: 'beacon',
      // Devolvemos shape mínimo compatible con lo que esperaría process_timelog
      timelog_id: null,
      hasSchedule: false,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  // 3) Beacon también falló: encolar en IDB del SW + registrar Background Sync.
  await swQueueEnqueue(beaconPayload);
  try {
    if ('sync' in self.registration) {
      await self.registration.sync.register(SW_SYNC_TAG);
    }
  } catch { /* sync no soportado: el cliente seguirá reintentando */ }

  return new Response(JSON.stringify({
    success: true,
    queued_by_sw: true,
    rescued_via: 'idb',
    timelog_id: null,
    hasSchedule: false,
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

async function drainSwQueue() {
  const items = await swQueueGetAll();
  for (const item of items) {
    const ok = await postToBeacon(item.payload);
    if (ok) await swQueueDelete(item.id);
  }
}

// Background Sync: el navegador llama esto cuando vuelve la red.
self.addEventListener('sync', (event) => {
  if (event.tag === SW_SYNC_TAG) {
    event.waitUntil(drainSwQueue());
  }
});

// Periodic Sync (donde esté soportado): drenar cada hora.
self.addEventListener('periodicsync', (event) => {
  if (event.tag === SW_SYNC_TAG) {
    event.waitUntil(drainSwQueue());
  }
});

// Permite que el cliente fuerce drain via postMessage.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SW_DRAIN_PUNCH_QUEUE') {
    event.waitUntil(drainSwQueue());
  }
});
