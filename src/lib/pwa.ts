import { useEffect, useState } from "react";

/* Ubicación: src/lib/pwa.ts
   Cloud Esther como PWA (aplicación instalable) para los cuatro perfiles: propietario, clínica,
   profesional y paciente. Es la misma plataforma: cambia solo cómo se abre (modo aplicación).
   - registrarServiceWorker: activa /sw.js (en producción; en desarrollo con VITE_PWA_DEV=1).
   - useInstalarApp: botón «Instalar app» (Android, Chrome y Edge) y ayuda para iPhone/iPad.
   TODO backend: notificaciones push (suscripción con VAPID y envío desde el servidor). */

type EventoInstalacion = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let pendiente: EventoInstalacion | null = null;
const oyentes = new Set<() => void>();
const avisar = () => oyentes.forEach((o) => o());

export function registrarServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  const enDesarrollo = import.meta.env.DEV && import.meta.env["VITE_PWA_DEV"] !== "1";
  if (enDesarrollo) {
    // En desarrollo no hay caché de la app: se quita cualquier service worker que haya quedado
    // de una versión instalada antes, para que siempre se vea el código actual.
    void navigator.serviceWorker
      .getRegistrations()
      .then((rs) => Promise.all(rs.map((r) => r.unregister())))
      .catch(() => {});
    if ("caches" in window)
      void caches
        .keys()
        .then((ks) => Promise.all(ks.map((k) => caches.delete(k))))
        .catch(() => {});
    return;
  }
  const registrar = () => void navigator.serviceWorker.register("/sw.js").catch(() => {});
  // La app hidrata cuando la página suele estar ya cargada: en ese caso se registra enseguida.
  if (document.readyState === "complete") registrar();
  else window.addEventListener("load", registrar, { once: true });
}

/** Se llama una vez al iniciar: guarda el aviso de instalación del navegador para usarlo luego. */
export function escucharInstalacion() {
  if (typeof window === "undefined") return;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    pendiente = e as EventoInstalacion;
    avisar();
  });
  window.addEventListener("appinstalled", () => {
    pendiente = null;
    avisar();
  });
}

export function esModoApp() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function esIOS() {
  if (typeof navigator === "undefined") return false;
  return (
    /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function useInstalarApp() {
  const [, forzar] = useState(0);
  const [montado, setMontado] = useState(false);
  useEffect(() => {
    setMontado(true);
    const o = () => forzar((n) => n + 1);
    oyentes.add(o);
    return () => {
      oyentes.delete(o);
    };
  }, []);
  const instalada = montado && esModoApp();
  return {
    /** Ya se abre como aplicación instalada. */
    instalada,
    /** El navegador ofrece instalar con un toque (Android, Chrome, Edge). */
    puedeInstalar: montado && !instalada && pendiente !== null,
    /** iPhone/iPad: se instala desde «Compartir → Agregar a inicio». */
    ios: montado && !instalada && esIOS(),
    instalar: async () => {
      if (!pendiente) return false;
      await pendiente.prompt();
      const { outcome } = await pendiente.userChoice;
      pendiente = null;
      avisar();
      return outcome === "accepted";
    },
  };
}
