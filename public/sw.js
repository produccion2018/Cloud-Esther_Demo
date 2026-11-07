/* Service worker DESACTIVADO (kill-switch).
   Cloud Esther es una app conectada: no necesita caché offline, y ese caché venía causando
   versiones viejas pegadas, pantallas en blanco y recargas. Este service worker ya no cachea
   nada: se autodesinstala, borra todas las cachés y recarga las pestañas abiertas una vez.
   A partir de ahí la app se sirve siempre fresca desde el CDN (con sus archivos versionados). */
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const claves = await caches.keys();
        await Promise.all(claves.map((k) => caches.delete(k)));
      } catch {
        /* ignorar */
      }
      try {
        await self.registration.unregister();
      } catch {
        /* ignorar */
      }
      try {
        const clientes = await self.clients.matchAll({ type: "window" });
        clientes.forEach((c) => c.navigate(c.url));
      } catch {
        /* ignorar */
      }
    })(),
  );
});

// Sin handler de fetch: el navegador va directo a la red (nada de caché).
