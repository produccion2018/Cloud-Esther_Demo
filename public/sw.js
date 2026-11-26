/* Service worker de Cloud Esther — SEGURO, SIN CACHÉ de la app.
   Existe por un solo motivo: que el navegador (Android/Chrome/Edge) ofrezca INSTALAR la app
   (los portales como app propia). Para eso hace falta un service worker con handler de «fetch».

   Clave: NO cachea nada de la app (ni HTML, ni JS, ni CSS). Cada carga va directo a la red, así
   NUNCA quedan versiones viejas pegadas (ese fue el problema que llevó a apagar el SW anterior).
   Lo único que guarda es la pantalla «sin conexión», solo para mostrarla si no hay internet. */

const OFFLINE_CACHE = "ce-offline-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches
      .open(OFFLINE_CACHE)
      .then((c) => c.add(OFFLINE_URL))
      .catch(() => {}),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Borra cualquier caché que no sea la de offline (limpia restos de versiones anteriores).
      try {
        const claves = await caches.keys();
        await Promise.all(claves.filter((k) => k !== OFFLINE_CACHE).map((k) => caches.delete(k)));
      } catch {
        /* ignorar */
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  // Solo las NAVEGACIONES (abrir una página) pasan por acá: red primero y, si no hay conexión,
  // la pantalla «sin conexión». La app nunca se cachea, así que siempre se sirve fresca.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(async () => {
        const c = await caches.open(OFFLINE_CACHE);
        const offline = await c.match(OFFLINE_URL);
        return (
          offline ??
          new Response("Sin conexión", {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          })
        );
      }),
    );
  }
  // Todo lo demás (JS, CSS, imágenes, llamadas a la API): no se intercepta → va directo a la red.
});

/* NOTIFICACIONES PUSH del panel (las manda el servidor según las preferencias de cada persona).
   El aviso trae { title, body, url, tag }. Al tocarlo se abre (o se enfoca) el panel en esa sección. */
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Cloud Esther", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "Cloud Esther";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      tag: data.tag || undefined,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      // url: a dónde ir · prefijo: qué pestañas sirven (panel /admin o clínica /demo) ·
      // abrir: qué abrir si no hay ninguna (la clínica entra por /c/<dirección>#ir=…)
      data: { url: data.url || "/admin/notificaciones", prefijo: data.prefijo || "/admin", abrir: data.abrir || data.url || "/admin/notificaciones" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const d = event.notification.data || {};
  const url = d.url || "/admin/notificaciones";
  const prefijo = d.prefijo || "/admin";
  const abrir = d.abrir || url;
  event.waitUntil(
    (async () => {
      const ventanas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const v of ventanas) {
        if (new URL(v.url).pathname.startsWith(prefijo)) {
          await v.focus();
          if ("navigate" in v) await v.navigate(url).catch(() => {});
          return;
        }
      }
      await self.clients.openWindow(abrir);
    })(),
  );
});
