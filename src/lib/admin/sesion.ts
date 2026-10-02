import { useSyncExternalStore } from "react";
import type { SesionAdmin } from "./tipos";

/* Ubicación: src/lib/admin/sesion.ts
   Sesión del panel. «Recordarme» la guarda en el navegador; si no, dura hasta cerrar la pestaña.
   Por seguridad se cierra sola tras INACTIVIDAD_MS sin uso.
   TODO backend: el token vence también en el servidor (no alcanza con el navegador). */

export const INACTIVIDAD_MS = 30 * 60 * 1000;

const KEY = "cloud-esther-admin:sesion";
const KEY_ACTIVIDAD = "cloud-esther-admin:ultima-actividad";
const KEY_MOTIVO = "cloud-esther-admin:motivo-cierre";

let actual: SesionAdmin | null | undefined;
const oyentes = new Set<() => void>();

function almacen(recordar: boolean) {
  return recordar ? window.localStorage : window.sessionStorage;
}

export function leerSesion(): SesionAdmin | null {
  if (typeof window === "undefined") return null;
  if (actual === undefined) {
    try {
      const raw = window.sessionStorage.getItem(KEY) ?? window.localStorage.getItem(KEY) ?? "null";
      actual = JSON.parse(raw) as SesionAdmin | null;
    } catch {
      actual = null;
    }
  }
  return actual ?? null;
}

export function guardarSesion(s: SesionAdmin, recordar: boolean) {
  actual = s;
  try {
    window.sessionStorage.removeItem(KEY);
    window.localStorage.removeItem(KEY);
    almacen(recordar).setItem(KEY, JSON.stringify(s));
    window.localStorage.setItem(KEY_ACTIVIDAD, String(Date.now()));
    window.sessionStorage.removeItem(KEY_MOTIVO);
  } catch {
    /* sin almacenamiento */
  }
  oyentes.forEach((o) => o());
}

/** Actualiza los datos del usuario en la sesión (por ejemplo, después de editar el perfil). */
export function actualizarUsuarioSesion(cambios: Partial<SesionAdmin["usuario"]>) {
  const s = leerSesion();
  if (!s) return;
  const enLocal = window.localStorage.getItem(KEY) !== null;
  guardarSesion({ ...s, usuario: { ...s.usuario, ...cambios } }, enLocal);
}

export function cerrarSesionAdmin(motivo?: "inactividad") {
  actual = null;
  try {
    window.sessionStorage.removeItem(KEY);
    window.localStorage.removeItem(KEY);
    if (motivo) window.sessionStorage.setItem(KEY_MOTIVO, motivo);
  } catch {
    /* sin almacenamiento */
  }
  oyentes.forEach((o) => o());
}

/** Motivo del último cierre automático (para avisarlo en el login). */
export function motivoCierre(): string | null {
  try {
    return window.sessionStorage.getItem(KEY_MOTIVO);
  } catch {
    return null;
  }
}

export function marcarActividad() {
  try {
    window.localStorage.setItem(KEY_ACTIVIDAD, String(Date.now()));
  } catch {
    /* sin almacenamiento */
  }
}

export function inactivoDesde(): number {
  try {
    return Number(window.localStorage.getItem(KEY_ACTIVIDAD) ?? Date.now());
  } catch {
    return Date.now();
  }
}

export function useSesionAdmin() {
  return useSyncExternalStore(
    (o) => {
      oyentes.add(o);
      return () => oyentes.delete(o);
    },
    leerSesion,
    () => null,
  );
}
