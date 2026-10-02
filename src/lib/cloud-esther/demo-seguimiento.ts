import { useEffect, useState } from "react";

/* Ubicación: src/lib/cloud-esther/demo-seguimiento.ts

   Seguimiento de las cuentas de demo para el panel de administración de Cloud Esther:
   quién entró, cuántas veces, cuánto tiempo, qué módulos recorrió y qué planes probó.
   Así se mide el interés de cada clínica que prueba la plataforma.

   - Cada ingreso de una cuenta de demo dura DURACION_DEMO_MS (30 minutos). Al vencer se cierra
     la sesión; se puede volver a entrar (y eso cuenta como un ingreso más).
   - Los eventos se guardan en este navegador y, si está configurada VITE_PANEL_API_URL, se envían
     al backend del panel: POST {VITE_PANEL_API_URL}/demo/eventos (un evento por pedido, JSON).
   TODO backend: el backend valida el vencimiento de la sesión (no solo el navegador) y guarda los
   eventos por cuenta de demo para el panel (GET /admin/demos). */

export const DURACION_DEMO_MS = 30 * 60 * 1000;
/** Aviso antes del cierre. */
export const AVISO_DEMO_MS = 5 * 60 * 1000;
/** Espera antes de que la misma identidad de prueba (cuenta o navegador) pueda volver a entrar.
    TODO backend: el servidor aplica la espera (en el navegador se puede saltear borrando datos). */
export const ESPERA_DEMO_MS = 60 * 60 * 1000;

export type TipoEventoDemo =
  | "registro"
  | "ingreso"
  | "modulo"
  | "plan"
  | "cierre"
  | "expiracion"
  /** Pidió información comercial o quiso contratar desde el demo. */
  | "solicitud";

export type EventoDemo = {
  id: string;
  tipo: TipoEventoDemo;
  fecha: string; // ISO
  email: string;
  nombre: string;
  clinica: string;
  /** Módulo visitado, plan elegido, etc. */
  detalle?: string;
  /** Identificador del ingreso (agrupa los eventos de una misma sesión de 30 minutos). */
  ingresoId?: string;
};

type Contacto = { email: string; nombre: string; clinica: string };
type IngresoActual = Contacto & { id: string; inicio: number; expira: number };

const KEY_EVENTOS = "cloud-esther:demo:eventos";
const KEY_INGRESO = "cloud-esther:demo:ingreso";
const KEY_ESPERA = "cloud-esther:demo:espera";
const KEY_VISITANTE = "cloud-esther:demo:visitante";
const KEY_ULTIMO = "cloud-esther:demo:ultimo-contacto";

const enNavegador = () => typeof window !== "undefined";

function leer<T>(key: string, fallback: T): T {
  if (!enNavegador()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function escribir(key: string, value: unknown) {
  if (!enNavegador()) return;
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* almacenamiento no disponible */
  }
}

const nuevoId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

function enviarAlPanel(evento: EventoDemo) {
  const url = import.meta.env["VITE_PANEL_API_URL"] as string | undefined;
  if (!url || !enNavegador()) return;
  try {
    void fetch(`${url.replace(/\/$/, "")}/demo/eventos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(evento),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* sin conexión: queda guardado en el navegador */
  }
}

function registrar(tipo: TipoEventoDemo, c: Contacto, detalle?: string) {
  const ingreso = leer<IngresoActual | null>(KEY_INGRESO, null);
  const evento: EventoDemo = {
    id: nuevoId(),
    tipo,
    fecha: new Date().toISOString(),
    email: c.email,
    nombre: c.nombre,
    clinica: c.clinica,
    ...(detalle ? { detalle } : {}),
    ...(ingreso ? { ingresoId: ingreso.id } : {}),
  };
  escribir(KEY_EVENTOS, [...leer<EventoDemo[]>(KEY_EVENTOS, []), evento].slice(-500));
  enviarAlPanel(evento);
}

/* ───────────── API para el resto de la app ───────────── */

/** Se llama al crear la cuenta de demo y en cada inicio de sesión de demo. */
export function iniciarIngresoDemo(c: Contacto, esRegistro = false) {
  const ahora = Date.now();
  escribir(KEY_ULTIMO, c);
  escribir(KEY_INGRESO, { ...c, id: nuevoId(), inicio: ahora, expira: ahora + DURACION_DEMO_MS });
  if (esRegistro) registrar("registro", c);
  registrar("ingreso", c);
  oyentes.forEach((o) => o());
}

/** Cierre manual («Salir») o por vencimiento. */
export function terminarIngresoDemo(motivo: "cierre" | "expiracion") {
  const ingreso = leer<IngresoActual | null>(KEY_INGRESO, null);
  if (!ingreso) return;
  const minutos = Math.max(1, Math.round((Date.now() - ingreso.inicio) / 60000));
  registrar(motivo, ingreso, `${minutos} min`);
  if (motivo === "expiracion") {
    // Período de espera para esa cuenta y para este navegador.
    const hasta = Date.now() + ESPERA_DEMO_MS;
    escribir(KEY_ESPERA, {
      ...leer<Record<string, number>>(KEY_ESPERA, {}),
      [ingreso.email]: hasta,
      [identidadVisitante()]: hasta,
    });
  }
  escribir(KEY_INGRESO, null);
  oyentes.forEach((o) => o());
}

export function registrarModuloDemo(modulo: string) {
  const ingreso = leer<IngresoActual | null>(KEY_INGRESO, null);
  if (ingreso) registrar("modulo", ingreso, modulo);
}

export function registrarPlanDemo(plan: string) {
  const ingreso = leer<IngresoActual | null>(KEY_INGRESO, null);
  if (ingreso) registrar("plan", ingreso, plan);
}

/** ¿Hay un ingreso de demo en curso? (se lee del almacenamiento, no del estado de React). */
export function hayIngresoDemo() {
  return leer<IngresoActual | null>(KEY_INGRESO, null) !== null;
}

/** Identidad de prueba del navegador para quien recorre el demo sin cuenta (no es un dato personal). */
export function identidadVisitante() {
  let id = leer<string | null>(KEY_VISITANTE, null);
  if (!id) {
    id = `visitante-${nuevoId()}`;
    escribir(KEY_VISITANTE, id);
  }
  return id;
}

export function contactoVisitante(): Contacto {
  return { email: identidadVisitante(), nombre: "Visitante sin cuenta", clinica: "Sin registrar" };
}

/** Hasta cuándo tiene que esperar esa identidad para volver a entrar (null si puede entrar). */
export function esperaDemoHasta(identidad: string): number | null {
  const hasta = leer<Record<string, number>>(KEY_ESPERA, {})[identidad];
  return hasta && hasta > Date.now() ? hasta : null;
}

/** Pedido de información comercial o de contratación desde el demo. */
export function registrarSolicitudDemo(tipo: "Información comercial" | "Contratación") {
  const c =
    leer<IngresoActual | null>(KEY_INGRESO, null) ??
    leer<Contacto | null>(KEY_ULTIMO, null) ??
    contactoVisitante();
  registrar("solicitud", c, tipo);
}

export function leerEventosDemo(): EventoDemo[] {
  return leer<EventoDemo[]>(KEY_EVENTOS, []);
}

const oyentes = new Set<() => void>();

/** Tiempo que le queda al ingreso de demo actual (null si no hay ingreso de demo en curso). */
export function useTiempoDemo() {
  const [restante, setRestante] = useState<number | null>(null);
  useEffect(() => {
    const calcular = () => {
      const ingreso = leer<IngresoActual | null>(KEY_INGRESO, null);
      setRestante(ingreso ? Math.max(0, ingreso.expira - Date.now()) : null);
    };
    calcular();
    oyentes.add(calcular);
    const t = window.setInterval(calcular, 1000);
    return () => {
      oyentes.delete(calcular);
      window.clearInterval(t);
    };
  }, []);
  return restante;
}

export function formatearRestante(ms: number) {
  const s = Math.ceil(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}
