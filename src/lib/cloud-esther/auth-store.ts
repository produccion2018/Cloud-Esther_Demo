import { useSyncExternalStore } from "react";
import { capitalizarNombre } from "@/lib/utils";

/* Ubicación: src/lib/cloud-esther/auth-store.ts

   Sesión multiempresa. Cada cuenta pertenece a UNA clínica (clinicId) y todos los
   datos de la app tienen que colgar de ese clinicId para que no se crucen.
   TODO backend: reemplazar registrarCuenta / iniciarSesion / cerrarSesion por
   POST /auth/register, POST /auth/login y POST /auth/logout. El JWT debe traer clinicId. */

export type Clinica = { id: string; nombre: string };
export type Usuario = { id: string; nombre: string; email: string; clinicId: string };
export type Sesion = { usuario: Usuario; clinica: Clinica };

type Resultado = { ok: true; sesion: Sesion } | { ok: false; error: string };

type CuentaGuardada = Sesion;

const KEY_CUENTAS = "cloud-esther:auth:cuentas";
const KEY_SESION = "cloud-esther:auth:sesion";

function nuevoId(prefijo: string) {
  const azar =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefijo}_${azar}`;
}

function leerJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function escribirJSON(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* almacenamiento no disponible: se ignora */
  }
}

function normalizarEmail(email: string) {
  return email.trim().toLowerCase();
}

/* ---------- store de sesión ---------- */

let sesionActual: Sesion | null | undefined = undefined; // undefined = todavía no leída
const oyentes = new Set<() => void>();

const suscribir = (f: () => void) => {
  oyentes.add(f);
  return () => {
    oyentes.delete(f);
  };
};

/* Cuentas guardadas antes de normalizar nombres: se muestran igual con mayúscula inicial. */
function normalizarSesion(s: Sesion | null): Sesion | null {
  if (!s) return s;
  return {
    usuario: { ...s.usuario, nombre: capitalizarNombre(s.usuario.nombre) },
    clinica: { ...s.clinica, nombre: capitalizarNombre(s.clinica.nombre) },
  };
}

const leer = (): Sesion | null => {
  if (sesionActual === undefined) {
    sesionActual = normalizarSesion(leerJSON<Sesion | null>(KEY_SESION, null));
  }
  return sesionActual;
};

const leerServidor = (): Sesion | null => null;

function ponerSesion(sesion: Sesion | null) {
  sesionActual = sesion;
  if (typeof window !== "undefined") {
    try {
      if (sesion) window.localStorage.setItem(KEY_SESION, JSON.stringify(sesion));
      else window.localStorage.removeItem(KEY_SESION);
    } catch {
      /* se ignora */
    }
  }
  oyentes.forEach((f) => f());
}

/* ---------- acciones ---------- */

export function registrarCuenta(datos: {
  clinica: string;
  nombre: string;
  email: string;
}): Resultado {
  const email = normalizarEmail(datos.email);
  const cuentas = leerJSON<CuentaGuardada[]>(KEY_CUENTAS, []);

  if (cuentas.some((c) => c.usuario.email === email)) {
    return { ok: false, error: "Ya existe una cuenta con ese correo. Iniciá sesión." };
  }

  // Cada registro crea una clínica NUEVA: es lo que separa una empresa de otra.
  const clinica: Clinica = { id: nuevoId("clinica"), nombre: capitalizarNombre(datos.clinica) };
  const usuario: Usuario = {
    id: nuevoId("usuario"),
    nombre: capitalizarNombre(datos.nombre),
    email,
    clinicId: clinica.id,
  };
  const sesion: Sesion = { usuario, clinica };

  escribirJSON(KEY_CUENTAS, [...cuentas, sesion]);
  ponerSesion(sesion);
  return { ok: true, sesion };
}

/* Demo: se identifica por correo. La contraseña la valida el backend cuando se conecte. */
export function iniciarSesion(emailCrudo: string): Resultado {
  const email = normalizarEmail(emailCrudo);
  const cuentas = leerJSON<CuentaGuardada[]>(KEY_CUENTAS, []);
  const cuenta = cuentas.find((c) => c.usuario.email === email);

  if (!cuenta) {
    return {
      ok: false,
      error: "No encontramos una cuenta con ese correo. Creá una cuenta primero.",
    };
  }
  const sesion = normalizarSesion(cuenta) as Sesion;
  ponerSesion(sesion);
  return { ok: true, sesion };
}

export function cerrarSesion() {
  ponerSesion(null);
}

/* ---------- acceso fuera de React ---------- */

/** Clínica (empresa) de la sesión actual, o null si no hay sesión. En el servidor siempre es null. */
export function clinicaActualId(): string | null {
  return leer()?.clinica.id ?? null;
}

/** Avisa cada vez que cambia la sesión (login, registro o logout). */
export const suscribirSesion = suscribir;

/* ---------- hook ---------- */

export function useSesion() {
  const sesion = useSyncExternalStore(suscribir, leer, leerServidor);
  return {
    sesion,
    usuario: sesion?.usuario ?? null,
    clinica: sesion?.clinica ?? null,
    clinicId: sesion?.clinica.id ?? null,
  };
}
