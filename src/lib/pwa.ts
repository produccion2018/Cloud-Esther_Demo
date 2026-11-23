import { useEffect, useState } from "react";

/* Ubicación: src/lib/pwa.ts
   Cloud Esther como PWA (aplicación instalable) para los cuatro perfiles: propietario, clínica,
   profesional y paciente. Es la misma plataforma: cambia solo cómo se abre (modo aplicación).
   - registrarServiceWorker: activa /sw.js (en producción; en desarrollo con VITE_PWA_DEV=1).
   - useInstalarApp: botón «Instalar app» (Android, Chrome y Edge) y ayuda para iPhone/iPad.
   - Push del panel: activarPushEnEsteDispositivo / pushDeEsteDispositivo / desactivarPushLocal
     (la suscripción se manda al servidor; el servidor envía con VAPID según las preferencias). */

type EventoInstalacion = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let pendiente: EventoInstalacion | null = null;
const oyentes = new Set<() => void>();
const avisar = () => oyentes.forEach((o) => o());

export function registrarServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  // Solo en producción (o en desarrollo con VITE_PWA_DEV=1). En desarrollo normal no se registra,
  // para no interferir con el hot-reload.
  const prod =
    import.meta.env.PROD || import.meta.env["VITE_PWA_DEV"] === "1";
  if (!prod) {
    // Dev: limpia cualquier SW viejo para que no queden versiones pegadas mientras se trabaja.
    void navigator.serviceWorker
      .getRegistrations()
      .then((rs) => Promise.all(rs.map((r) => r.unregister())))
      .catch(() => {});
    return;
  }
  // Service worker SEGURO (sw.js): NO cachea la app (siempre fresca desde el CDN); solo habilita
  // la instalación (Android/Chrome) y una pantalla «sin conexión». Ver public/sw.js.
  const registrar = () => {
    void navigator.serviceWorker.register("/sw.js").catch(() => {});
  };
  if (document.readyState === "complete") registrar();
  else window.addEventListener("load", registrar, { once: true });
}

/** Se llama una vez al iniciar: guarda el aviso de instalación del navegador para usarlo luego. */
export function escucharInstalacion() {
  if (typeof window === "undefined") return;
  // Aviso capturado antes de que cargara la app (script del <head> en __root.tsx).
  const temprano = (window as Window & { __ceInstalar?: EventoInstalacion }).__ceInstalar;
  if (temprano) {
    pendiente = temprano;
    avisar();
  }
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

export type Plataforma = {
  /** android · ios (iPhone/iPad) · escritorio */
  so: "android" | "ios" | "escritorio";
  /** iPad o tablet Android (cambia dónde está el botón Compartir en Safari). */
  tablet: boolean;
  navegador: "chrome" | "edge" | "samsung" | "firefox" | "safari" | "opera" | "otro";
  /** Navegador interno de WhatsApp, Instagram, Facebook, etc.: desde ahí no se puede instalar. */
  integrado: boolean;
};

/** Qué dispositivo y navegador está usando la persona, para ofrecerle la instalación que corresponde. */
export function detectarPlataforma(): Plataforma {
  const ua = typeof navigator === "undefined" ? "" : navigator.userAgent;
  const ios = esIOS();
  const android = /Android/i.test(ua);
  const so = ios ? "ios" : android ? "android" : "escritorio";
  const tablet = ios
    ? /iPad/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
    : android && !/Mobile/i.test(ua);
  const navegador = /EdgA?|EdgiOS|Edg\//.test(ua)
    ? "edge"
    : /SamsungBrowser/.test(ua)
      ? "samsung"
      : /OPR\/|OPiOS|OPT\//.test(ua)
        ? "opera"
        : /Firefox|FxiOS/.test(ua)
          ? "firefox"
          : /CriOS|Chrome\//.test(ua)
            ? "chrome"
            : /Safari\//.test(ua)
              ? "safari"
              : "otro";
  const integrado =
    /FBAN|FBAV|FB_IAB|Instagram|WhatsApp|Line\/|MicroMessenger|TikTok|Snapchat|LinkedInApp/i.test(
      ua,
    ) ||
    (android && /; wv\)/.test(ua)) ||
    (ios && !/Safari\//.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua));
  return { so, tablet, navegador, integrado };
}

/** Android: abre la misma dirección en Chrome (para salir del navegador de WhatsApp, Instagram…). */
export function enlaceAbrirEnChrome() {
  if (typeof window === "undefined") return "#";
  const { host, pathname, search } = window.location;
  return `intent://${host}${pathname}${search}#Intent;scheme=https;package=com.android.chrome;end`;
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
    /** La página está en https (o localhost): requisito de los navegadores para instalar. */
    seguro: montado && window.isSecureContext,
    plataforma: montado ? detectarPlataforma() : null,
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

/* ───────────── Notificaciones PUSH (panel del dueño y su equipo) ───────────── */

/** ¿Este navegador puede recibir push? (en iPhone/iPad solo con la app instalada, iOS 16.4+) */
export function pushSoportado(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

async function registroSW(): Promise<ServiceWorkerRegistration> {
  const existente = await navigator.serviceWorker.getRegistration();
  if (existente) return existente;
  // En desarrollo no se registra solo: para probar push se registra acá
  await navigator.serviceWorker.register("/sw.js");
  return navigator.serviceWorker.ready;
}

function claveABytes(base64: string): Uint8Array<ArrayBuffer> {
  const relleno = "=".repeat((4 - (base64.length % 4)) % 4);
  const b = atob((base64 + relleno).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(b.length));
  for (let i = 0; i < b.length; i++) out[i] = b.charCodeAt(i);
  return out;
}

/** Pide permiso y suscribe este dispositivo. Devuelve lo que hay que mandarle al servidor. */
export async function activarPushEnEsteDispositivo(
  clavePublica: string,
): Promise<PushSubscriptionJSON> {
  if (!pushSoportado())
    throw new Error(
      "Este navegador no permite notificaciones. En iPhone, primero instalá el panel como app.",
    );
  const permiso = await Notification.requestPermission();
  if (permiso !== "granted")
    throw new Error(
      "No diste permiso para las notificaciones. Podés activarlo en la configuración del navegador.",
    );
  const reg = await registroSW();
  const actual = await reg.pushManager.getSubscription();
  const sub =
    actual ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: claveABytes(clavePublica),
    }));
  return sub.toJSON();
}

/** La suscripción push de este dispositivo (null = no está activado acá). */
export async function pushDeEsteDispositivo(): Promise<PushSubscription | null> {
  if (!pushSoportado()) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return (await reg?.pushManager.getSubscription()) ?? null;
}

/** Desactiva el push en este dispositivo. Devuelve el endpoint que tenía (para avisarle al servidor). */
export async function desactivarPushLocal(): Promise<string | null> {
  const sub = await pushDeEsteDispositivo();
  if (!sub) return null;
  const endpoint = sub.endpoint;
  await sub.unsubscribe().catch(() => false);
  return endpoint;
}
