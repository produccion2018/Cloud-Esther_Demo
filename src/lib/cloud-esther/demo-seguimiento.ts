import { useEffect, useState } from "react";

/* Ubicación: src/lib/cloud-esther/demo-seguimiento.ts

   Seguimiento de las cuentas de demo para el panel de administración de Cloud Esther:
   quién entró, cuántas veces, cuánto tiempo, qué módulos recorrió y qué planes probó.
   Así se mide el interés de cada clínica que prueba la plataforma.

   - Cada ingreso de una cuenta de demo dura lo que configure el dueño (30 minutos por defecto). Al vencer se cierra
     la sesión; se puede volver a entrar (y eso cuenta como un ingreso más).
   - Los eventos se guardan en este navegador y, si está configurada VITE_PANEL_API_URL, se envían
     al backend del panel: POST {VITE_PANEL_API_URL}/demo/eventos (un evento por pedido, JSON).
   TODO backend: el backend valida el vencimiento de la sesión (no solo el navegador) y guarda los
   eventos por cuenta de demo para el panel (GET /admin/demos). */

/* ───────────── Límites del demo (los maneja el dueño desde el panel) ─────────────
   El panel guarda la configuración en el servidor y el SaaS la lee de
   GET {VITE_PANEL_API_URL}/demo/config. Sin backend se usan los valores por defecto. */

export type ConfigDemo = {
  /** false = el demo no tiene límite de tiempo para nadie. */
  limiteActivo: boolean;
  /** Duración de cada ingreso. */
  minutos: number;
  /** Espera antes de volver a entrar después de agotar el tiempo (0 = sin espera). */
  esperaMinutos: number;
  /** Aviso antes del cierre. */
  avisoMinutos: number;
  /** Correos de cuentas de demo sin límite (las habilita el dueño desde el panel). */
  exentos: string[];
};

/* Mientras no haya backend el límite queda APAGADO: nadie ve contador ni corte.
   Se enciende desde el panel del dueño cuando el servidor esté conectado. */
export const CONFIG_DEMO_INICIAL: ConfigDemo = {
  limiteActivo: false,
  minutos: 30,
  esperaMinutos: 60,
  avisoMinutos: 5,
  exentos: [],
};

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
/** expira null = ingreso sin límite de tiempo (límite desactivado o cuenta exenta). */
type IngresoActual = Contacto & { id: string; inicio: number; expira: number | null };

const KEY_EVENTOS = "cloud-esther:demo:eventos";
const KEY_INGRESO = "cloud-esther:demo:ingreso";
const KEY_ESPERA = "cloud-esther:demo:espera";
const KEY_VISITANTE = "cloud-esther:demo:visitante";
const KEY_ULTIMO = "cloud-esther:demo:ultimo-contacto";
const KEY_CONFIG = "cloud-esther:demo:config";
const KEY_DUENO = "cloud-esther:demo:dueno";

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

/* ───────────── Configuración de límites ───────────── */

export function configDemo(): ConfigDemo {
  return { ...CONFIG_DEMO_INICIAL, ...leer<Partial<ConfigDemo>>(KEY_CONFIG, {}) };
}

export const avisoDemoMs = () => configDemo().avisoMinutos * 60_000;

let configPedida = false;
/** Trae del servidor los límites que configuró el dueño en el panel (una vez por carga). */
export function cargarConfigDemo() {
  const url = import.meta.env["VITE_PANEL_API_URL"] as string | undefined;
  if (!url || !enNavegador() || configPedida) return;
  configPedida = true;
  void fetch(`${url.replace(/\/$/, "")}/demo/config`)
    .then((r) => (r.ok ? (r.json() as Promise<Partial<ConfigDemo>>) : null))
    .then((c) => {
      if (!c) return;
      escribir(KEY_CONFIG, c);
      oyentes.forEach((o) => o());
    })
    .catch(() => {});
}

/** ¿Este contacto tiene límite de tiempo? */
function tieneLimite(email: string) {
  const c = configDemo();
  return c.limiteActivo && !c.exentos.map((e) => e.toLowerCase()).includes(email.toLowerCase());
}

/* ───────────── Modo dueño ─────────────
   El dueño de Cloud Esther entra por /dueno con su código y usa el SaaS sin límite de tiempo.
   Sus visitas no se registran como demos (no ensucian las métricas del panel).
   Solo se guarda el hash del código; se puede reemplazar con VITE_DUENO_CLAVE_HASH
   (SHA-256 de «cloud-esther-dueno:<código>»).
   TODO backend: validar el acceso del dueño en el servidor. */

const HASH_DUENO =
  (import.meta.env["VITE_DUENO_CLAVE_HASH"] as string | undefined) ??
  "704d198ca2dd413d6bfa96800e3a0e3591fe175cf3462d94dfc0499485cbd174";
const DURACION_MODO_DUENO_MS = 30 * 86_400_000;

async function hashCodigo(codigo: string) {
  const datos = new TextEncoder().encode(`cloud-esther-dueno:${codigo.trim().toUpperCase()}`);
  const digest = await crypto.subtle.digest("SHA-256", datos);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function esModoDueno() {
  const hasta = leer<number | null>(KEY_DUENO, null);
  return hasta !== null && hasta > Date.now();
}

/** Activa el modo dueño en este navegador (30 días). Devuelve false si el código no es válido. */
export async function activarModoDueno(codigo: string) {
  if ((await hashCodigo(codigo)) !== HASH_DUENO) return false;
  escribir(KEY_DUENO, Date.now() + DURACION_MODO_DUENO_MS);
  // Sin contador ni espera para este navegador. El ingreso en curso se descarta sin registrarlo.
  escribir(KEY_INGRESO, null);
  escribir(KEY_ESPERA, null);
  oyentes.forEach((o) => o());
  return true;
}

export function salirModoDueno() {
  escribir(KEY_DUENO, null);
  oyentes.forEach((o) => o());
}

export function useModoDueno() {
  const [activo, setActivo] = useState(false);
  useEffect(() => {
    const leerEstado = () => setActivo(esModoDueno());
    leerEstado();
    oyentes.add(leerEstado);
    return () => {
      oyentes.delete(leerEstado);
    };
  }, []);
  return activo;
}

/* ───────────── API para el resto de la app ───────────── */

/** Se llama al crear la cuenta de demo y en cada inicio de sesión de demo. */
export function iniciarIngresoDemo(c: Contacto, esRegistro = false) {
  if (esModoDueno()) return;
  const ahora = Date.now();
  escribir(KEY_ULTIMO, c);
  escribir(KEY_INGRESO, {
    ...c,
    id: nuevoId(),
    inicio: ahora,
    expira: tieneLimite(c.email) ? ahora + configDemo().minutos * 60_000 : null,
  });
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
  const esperaMs = configDemo().esperaMinutos * 60_000;
  if (motivo === "expiracion" && esperaMs > 0) {
    // Período de espera para esa cuenta y para este navegador.
    const hasta = Date.now() + esperaMs;
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
  if (esModoDueno() || !tieneLimite(identidad)) return null;
  const hasta = leer<Record<string, number>>(KEY_ESPERA, {})[identidad];
  return hasta && hasta > Date.now() ? hasta : null;
}

/** Pedido de información comercial o de contratación desde el demo. */
export function registrarSolicitudDemo(tipo: "Información comercial" | "Contratación") {
  if (esModoDueno()) return;
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
      setRestante(
        ingreso && ingreso.expira !== null && !esModoDueno() && configDemo().limiteActivo
          ? Math.max(0, ingreso.expira - Date.now())
          : null,
      );
    };
    cargarConfigDemo();
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
