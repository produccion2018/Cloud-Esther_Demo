import { useEffect, useState } from "react";

/* Ubicación: src/lib/cloud-esther/demo-servidor.ts

   Demo gratis conectado al SERVIDOR (backend Etapa 3a). Cuando hay backend
   (VITE_ADMIN_API_URL), el tiempo de cada demo lo decide y lo cuenta el servidor:
   el equipo de Cloud Esther lo extiende o lo acorta desde su panel, y nadie puede
   alargarlo tocando el navegador. Acá solo se guarda el enlace (token) del demo de
   esta persona y se muestra lo que dice el servidor.
   Los datos del demo siguen siendo de ejemplo (no hay datos reales de pacientes). */

const API_URL = (import.meta.env["VITE_ADMIN_API_URL"] as string | undefined)?.replace(/\/$/, "");
/** ¿El demo se controla desde el servidor? */
export const DEMO_EN_SERVIDOR = Boolean(API_URL);

/** Países donde está Cloud Esther, con su código de teléfono. La persona tiene que ESTAR en el país
 *  que elige (el servidor lo verifica por su conexión) y el teléfono tiene que ser de ese país. */
export const PAISES_DEMO = [
  { codigo: "AR", nombre: "Argentina", prefijo: "54" },
  { codigo: "CL", nombre: "Chile", prefijo: "56" },
  { codigo: "CO", nombre: "Colombia", prefijo: "57" },
  { codigo: "PE", nombre: "Perú", prefijo: "51" },
  { codigo: "EC", nombre: "Ecuador", prefijo: "593" },
  { codigo: "MX", nombre: "México", prefijo: "52" },
  { codigo: "ES", nombre: "España", prefijo: "34" },
] as const;

export type EstadoDemoServidor = {
  nombre: string;
  email: string;
  clinica: string;
  inicio: string;
  venceEl: string;
  restanteSegundos: number;
  vencido: boolean;
  avisoMinutos: number;
  /** Ingresos: 5 de base + los que autorice el equipo */
  ingresosUsados: number;
  ingresosPermitidos: number;
  /** Por qué está frenado: se terminó el tiempo o no le quedan ingresos */
  bloqueo: "tiempo" | "ingresos" | null;
};

/** Reglas de la contraseña del demo (las mismas que valida el servidor). */
export function problemaClaveDemo(clave: string): string | null {
  if (clave.length < 8) return "La contraseña tiene que tener al menos 8 caracteres.";
  if (clave.length > 128) return "La contraseña es demasiado larga.";
  if (!/[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(clave) || !/[0-9]/.test(clave)) {
    return "La contraseña tiene que combinar letras y números.";
  }
  return null;
}

type Guardado = { email: string; token: string };
const KEY = "cloud-esther:demo:servidor";
const enNavegador = () => typeof window !== "undefined";

function leerGuardado(): Guardado | null {
  if (!enNavegador()) return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Guardado) : null;
  } catch {
    return null;
  }
}

function guardar(g: Guardado | null) {
  if (!enNavegador()) return;
  try {
    if (g) window.localStorage.setItem(KEY, JSON.stringify(g));
    else window.localStorage.removeItem(KEY);
  } catch {
    /* sin almacenamiento */
  }
}

/* ───────────── Estado en memoria (lo que dijo el servidor) ───────────── */

let estado: EstadoDemoServidor | null = null;
/** Momento (reloj de ESTE navegador) en que vence, calculado con lo que faltaba según el servidor.
 *  Así no importa si la hora de la computadora está mal. */
let venceLocal: number | null = null;
const oyentes = new Set<() => void>();
const avisar = () => oyentes.forEach((o) => o());

function ponerEstado(e: EstadoDemoServidor | null) {
  estado = e;
  venceLocal = e ? Date.now() + e.restanteSegundos * 1000 : null;
  avisar();
}

/** ¿Este navegador tiene un demo del servidor (para ese correo, si se indica)? */
export function demoServidorActivo(email?: string): boolean {
  if (!DEMO_EN_SERVIDOR) return false;
  const g = leerGuardado();
  return !!g && (!email || g.email === email.trim().toLowerCase());
}

async function pedir(metodo: string, ruta: string, cuerpo?: unknown, token?: string) {
  return fetch(`${API_URL}${ruta}`, {
    method: metodo,
    headers: {
      ...(cuerpo !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(cuerpo !== undefined ? { body: JSON.stringify(cuerpo) } : {}),
  });
}

async function textoError(r: Response) {
  const t = await r.text().catch(() => "");
  return t || "No pudimos conectarnos. Probá de nuevo en unos segundos.";
}

/* ───────────── Acciones ───────────── */

/** Registrarse en el demo: NO entra todavía. Le llega el correo de bienvenida con el botón
 *  para confirmar el correo y entrar (ahí arranca el reloj). */
export async function registrarDemoEnServidor(datos: {
  nombre: string;
  email: string;
  telefono: string;
  clinica: string;
  pais: string;
  plan?: string;
  clave: string;
}): Promise<{ ok: true; email: string } | { ok: false; error: string }> {
  try {
    const r = await pedir("POST", "/demo/registro", datos);
    if (!r.ok) return { ok: false, error: await textoError(r) };
    const res = (await r.json()) as { email: string };
    return { ok: true, email: res.email };
  } catch {
    return { ok: false, error: "No pudimos conectarnos. Probá de nuevo en unos segundos." };
  }
}

type Entrada = { ok: true; estado: EstadoDemoServidor } | { ok: false; error: string };

async function guardarEntrada(r: Response): Promise<Entrada> {
  const res = (await r.json()) as { token: string; demo: EstadoDemoServidor };
  guardar({ email: res.demo.email, token: res.token });
  ponerEstado(res.demo);
  return { ok: true, estado: res.demo };
}

/** Entrar al demo con correo y contraseña (cuenta como 1 ingreso). */
export async function iniciarSesionDemoServidor(email: string, clave: string): Promise<Entrada> {
  try {
    const r = await pedir("POST", "/demo/ingresar", { email, clave });
    if (!r.ok) return { ok: false, error: await textoError(r) };
    return await guardarEntrada(r);
  } catch {
    return { ok: false, error: "No pudimos conectarnos. Probá de nuevo en unos segundos." };
  }
}

/** Entrar con el enlace del correo (/login#demo=...): confirma el correo la primera vez. */
export async function entrarConEnlaceDemo(token: string): Promise<Entrada> {
  try {
    const r = await pedir("POST", "/demo/enlace", { token });
    if (!r.ok) return { ok: false, error: await textoError(r) };
    return await guardarEntrada(r);
  } catch {
    return { ok: false, error: "No pudimos conectarnos. Probá de nuevo en unos segundos." };
  }
}

/** Cerrar la sesión del demo en este navegador. */
export function olvidarDemoServidor() {
  guardar(null);
  ponerEstado(null);
}

/** «Ya tengo un demo»: el servidor manda un enlace por correo (siempre responde igual). */
export async function pedirEnlaceDemo(email: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const r = await pedir("POST", "/demo/reingreso", { email });
    return r.ok ? { ok: true } : { ok: false, error: await textoError(r) };
  } catch {
    return { ok: false, error: "No pudimos conectarnos. Probá de nuevo en unos segundos." };
  }
}

/** Pregunta al servidor cuánto le queda. Si el enlace dejó de valer, se olvida. */
export async function actualizarEstadoDemo(): Promise<EstadoDemoServidor | null> {
  const g = leerGuardado();
  if (!DEMO_EN_SERVIDOR || !g) return null;
  try {
    const r = await pedir("GET", "/demo/estado", undefined, g.token);
    if (r.status === 401) {
      guardar(null);
      ponerEstado(null);
      return null;
    }
    if (!r.ok) return estado;
    const e = (await r.json()) as EstadoDemoServidor;
    ponerEstado(e);
    return e;
  } catch {
    return estado; // sin conexión: se sigue con lo último que se sabía
  }
}

/** Actividad dentro del demo (no frena nada si falla). */
export function enviarEventoDemo(tipo: "ingreso" | "modulo" | "plan" | "salida", detalle?: string) {
  const g = leerGuardado();
  if (!DEMO_EN_SERVIDOR || !g) return;
  // Los ingresos los cuenta el servidor al abrir la sesión: el navegador no los manda
  if (tipo === "ingreso") return;
  try {
    void fetch(`${API_URL}/demo/eventos`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${g.token}` },
      body: JSON.stringify({ tipo, ...(detalle ? { detalle: detalle.slice(0, 100) } : {}) }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* sin conexión */
  }
}

/** Pedidos al equipo: más tiempo, información comercial o contratar. */
export async function enviarPedidoDemo(
  tipo: "extension" | "ingresos" | "informacion" | "contratacion",
  mensaje?: string,
): Promise<{ ok: boolean; error?: string }> {
  const g = leerGuardado();
  if (!DEMO_EN_SERVIDOR || !g) return { ok: false, error: "No encontramos tu demo." };
  try {
    const r = await pedir("POST", "/demo/solicitudes", { tipo, ...(mensaje ? { mensaje } : {}) }, g.token);
    return r.ok ? { ok: true } : { ok: false, error: await textoError(r) };
  } catch {
    return { ok: false, error: "No pudimos conectarnos. Probá de nuevo en unos segundos." };
  }
}

/** Lo que falta (ms) según el servidor; null si todavía no se sabe. */
export function restanteDemoServidorMs(): number | null {
  return venceLocal === null ? null : Math.max(0, venceLocal - Date.now());
}

/** Estado completo que dio el servidor (null si todavía no se sabe). */
export function estadoDemoServidor(): EstadoDemoServidor | null {
  return estado;
}

export function avisoDemoServidorMs(): number {
  return (estado?.avisoMinutos ?? 5) * 60_000;
}

/* ───────────── Hook ───────────── */

/** Mantiene el estado al día: pregunta al servidor al abrir, cada minuto y al volver a la pestaña. */
export function useEstadoDemoServidor(activo: boolean) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!activo) return;
    const refrescar = () => setTick((t) => t + 1);
    oyentes.add(refrescar);
    void actualizarEstadoDemo();
    // Solo mientras la pestaña está a la vista: una pestaña olvidada en segundo plano no
    // mantiene la sesión abierta (a las 2 horas sin uso se cierra).
    const cadaMinuto = window.setInterval(() => {
      if (document.visibilityState === "visible") void actualizarEstadoDemo();
    }, 60_000);
    const cadaSegundo = window.setInterval(refrescar, 1000);
    const alVolver = () => void actualizarEstadoDemo();
    window.addEventListener("focus", alVolver);
    return () => {
      oyentes.delete(refrescar);
      window.clearInterval(cadaMinuto);
      window.clearInterval(cadaSegundo);
      window.removeEventListener("focus", alVolver);
    };
  }, [activo]);
  return { restanteMs: activo ? restanteDemoServidorMs() : null, avisoMs: avisoDemoServidorMs() };
}
