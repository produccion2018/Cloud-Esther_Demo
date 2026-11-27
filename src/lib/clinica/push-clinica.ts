import { pedirAClinica } from "@/lib/clinica/api";
import { clinicaReal } from "@/lib/clinica/modo-clinica";
import { activarPushEnEsteDispositivo, desactivarPushLocal, pushDeEsteDispositivo, pushSoportado } from "@/lib/pwa";

/* Ubicación: src/lib/clinica/push-clinica.ts
   AVISOS EN EL CELULAR / COMPU para el equipo de la clínica (aunque la app esté cerrada).
   Cada persona los activa en cada dispositivo y elige qué quiere recibir ahí.
   En el demo no hay servidor: el aviso de prueba se muestra desde este mismo navegador. */

export const TIPOS_AVISO = [
  { id: "menciones", label: "Cuando me nombran con @", detalle: "En la comunicación interna" },
  { id: "privados", label: "Mensajes privados", detalle: "Alguien del equipo te escribe" },
  { id: "comunicados", label: "Comunicados", detalle: "Para leer y confirmar" },
  { id: "tareas", label: "Tareas para mí o mi área", detalle: "Cuando te asignan una tarea" },
  { id: "urgentes", label: "Avisos urgentes sin asignar", detalle: "Solo al Administrador" },
  { id: "resumen", label: "Tu día, cada mañana", detalle: "Tus turnos y tareas del día" },
] as const;
export type TipoAviso = (typeof TIPOS_AVISO)[number]["id"];

export type EstadoAvisos = {
  /** El navegador puede recibir avisos */
  soportado: boolean;
  /** El servidor tiene los avisos encendidos (en el demo, siempre true: es una prueba local) */
  disponible: boolean;
  /** Este dispositivo los tiene activados */
  activo: boolean;
  tipos: TipoAviso[];
  /** Permiso del navegador */
  permiso: NotificationPermission | "no";
};

const TODOS = TIPOS_AVISO.map((t) => t.id) as TipoAviso[];

export async function estadoAvisos(): Promise<EstadoAvisos> {
  const soportado = pushSoportado();
  const permiso = soportado ? Notification.permission : "no";
  const sub = soportado ? await pushDeEsteDispositivo().catch(() => null) : null;
  const real = clinicaReal();
  if (!real) return { soportado, disponible: true, activo: permiso === "granted" && !!localStorage.getItem("ce:avisos-demo"), tipos: TODOS, permiso };
  const r = await pedirAClinica<{ disponible: boolean; esteDispositivo: { tipos: TipoAviso[] } | null }>(
    real.slug,
    "GET",
    `/push${sub ? `?endpoint=${encodeURIComponent(sub.endpoint)}` : ""}`,
  );
  return { soportado, disponible: r.disponible, activo: !!(sub && r.esteDispositivo), tipos: r.esteDispositivo?.tipos ?? TODOS, permiso };
}

export async function activarAvisos(tipos: TipoAviso[]): Promise<void> {
  const real = clinicaReal();
  if (!real) {
    // Demo: solo se pide el permiso del navegador para poder mostrar la prueba
    if (!pushSoportado()) throw new Error("Este navegador no permite avisos. En iPhone, primero instalá la app (Compartir → Agregar a inicio).");
    const p = await Notification.requestPermission();
    if (p !== "granted") throw new Error("No diste permiso para los avisos. Podés activarlo en la configuración del navegador.");
    localStorage.setItem("ce:avisos-demo", "1");
    return;
  }
  const estado = await pedirAClinica<{ disponible: boolean; clavePublica: string | null }>(real.slug, "GET", "/push");
  if (!estado.disponible || !estado.clavePublica) throw new Error("Los avisos en el celular todavía no están activados en el servidor.");
  const sub = await activarPushEnEsteDispositivo(estado.clavePublica);
  await pedirAClinica(real.slug, "POST", "/push", { endpoint: sub.endpoint, keys: sub.keys, tipos });
}

/** Cambia qué recibe este dispositivo (ya activado). */
export async function cambiarTiposAvisos(tipos: TipoAviso[]): Promise<void> {
  const real = clinicaReal();
  if (!real) return;
  const sub = await pushDeEsteDispositivo();
  if (!sub) throw new Error("Los avisos no están activados en este dispositivo.");
  const j = sub.toJSON();
  await pedirAClinica(real.slug, "POST", "/push", { endpoint: j.endpoint, keys: j.keys, tipos });
}

export async function desactivarAvisos(): Promise<void> {
  const real = clinicaReal();
  if (!real) {
    localStorage.removeItem("ce:avisos-demo");
    return;
  }
  const endpoint = await desactivarPushLocal();
  if (endpoint) await pedirAClinica(real.slug, "POST", "/push/quitar", { endpoint });
}

export async function probarAvisos(): Promise<void> {
  const real = clinicaReal();
  if (real) {
    const r = await pedirAClinica<{ enviados: number }>(real.slug, "POST", "/push/probar", {});
    if (!r.enviados) throw new Error("No llegó a ningún dispositivo. Activá los avisos en este dispositivo primero.");
    return;
  }
  // Demo: el aviso se muestra desde este navegador (igual que llega uno real)
  let reg = await navigator.serviceWorker.getRegistration();
  if (!reg) {
    await navigator.serviceWorker.register("/sw.js");
    reg = await navigator.serviceWorker.ready;
  }
  await reg.showNotification("Ana Ruiz te mencionó", {
    body: "Te nombró en General. Tocá para leerlo.",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: "prueba",
    data: { url: "/demo/comunicacion-interna", prefijo: "/demo", abrir: "/demo/comunicacion-interna" },
  });
}
