/* Cloud Esther · service worker (PWA)
   - Instalación como aplicación y apertura en modo app.
   - Páginas: primero la red; si no hay conexión, la última versión guardada o la página offline.
   - JS y CSS: primero la red (así una versión nueva se ve enseguida); sin conexión, la guardada.
   - Imágenes y fuentes: desde caché y se actualizan en segundo plano.
   - Notificaciones push: listo para cuando el backend envíe avisos (eventos push y notificationclick).
   Nunca se guardan respuestas de la API ni datos de pacientes en caché. */

const VERSION = "ce-v2";
const CACHE_PAGINAS = `${VERSION}-paginas`;
const CACHE_ESTATICOS = `${VERSION}-estaticos`;
const OFFLINE = "/offline.html";
const PRECARGA = [OFFLINE, "/favicon.svg", "/icons/icon-192.png", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_ESTATICOS).then((c) => c.addAll(PRECARGA)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((claves) =>
        Promise.all(claves.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

const esEstatico = (url) =>
  /\.(?:js|css|png|jpg|jpeg|webp|svg|ico|woff2?|ttf|glb|gltf)$/i.test(url.pathname) ||
  url.pathname.startsWith("/assets/");

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Solo el mismo sitio. Nada de API ni de otros dominios.
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api")) return;

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copia = res.clone();
          caches.open(CACHE_PAGINAS).then((c) => c.put(req, copia));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match(OFFLINE))),
    );
    return;
  }

  if (/\.(?:js|css)$/i.test(url.pathname)) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copia = res.clone();
            caches.open(CACHE_ESTATICOS).then((c) => c.put(req, copia));
          }
          return res;
        })
        .catch(() => caches.match(req)),
    );
    return;
  }

  if (esEstatico(url)) {
    event.respondWith(
      caches.open(CACHE_ESTATICOS).then((cache) =>
        cache.match(req).then((guardado) => {
          const red = fetch(req)
            .then((res) => {
              if (res.ok) cache.put(req, res.clone());
              return res;
            })
            .catch(() => guardado);
          return guardado || red;
        }),
      ),
    );
  }
});

/* ── Notificaciones push (preparado para el backend) ── */
self.addEventListener("push", (event) => {
  let datos = { titulo: "Cloud Esther", cuerpo: "Tenés una novedad.", url: "/" };
  try {
    if (event.data) datos = { ...datos, ...event.data.json() };
  } catch {
    /* aviso sin formato */
  }
  event.waitUntil(
    self.registration.showNotification(datos.titulo, {
      body: datos.cuerpo,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-maskable-192.png",
      data: { url: datos.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destino = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((ventanas) => {
      const abierta = ventanas.find((v) => v.url.includes(destino));
      return abierta ? abierta.focus() : self.clients.openWindow(destino);
    }),
  );
});
