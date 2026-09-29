import { useSyncExternalStore } from "react";
import { clinicaActualId, suscribirSesion } from "@/lib/cloud-esther/auth-store";

/* Ubicación: src/lib/cloud-esther/tenant-store.ts

   Aislamiento multiempresa de los datos de práctica del demo.
   Cada empresa (clinicId de la sesión) tiene su PROPIA copia de los datos: lo que una
   empresa crea, edita o borra nunca aparece en otra. Al cambiar de sesión (login,
   registro o logout) los módulos pasan solos a los datos de la empresa nueva.
   Sin sesión se usa un espacio "demo" separado.
   TODO backend: reemplazar por las consultas a la API filtradas por clinicId (JWT). */

export const TENANT_DEMO = "demo";

/** Empresa activa para separar datos: clinicId de la sesión o "demo". */
export function tenantActual(): string {
  return clinicaActualId() ?? TENANT_DEMO;
}

/** Clave de localStorage separada por empresa. */
export function claveTenant(base: string): string {
  return `${base}:${tenantActual()}`;
}

export function crearStorePorEmpresa<T>(inicial: () => T) {
  const porEmpresa = new Map<string, T>();
  const oyentes = new Set<() => void>();

  const de = (tenant: string): T => {
    if (!porEmpresa.has(tenant)) porEmpresa.set(tenant, inicial());
    return porEmpresa.get(tenant) as T;
  };

  const leer = (): T => de(tenantActual());
  // En el servidor no hay sesión: siempre el espacio demo (evita diferencias de hidratación).
  const leerServidor = (): T => de(TENANT_DEMO);

  const poner = (siguiente: T) => {
    porEmpresa.set(tenantActual(), siguiente);
    oyentes.forEach((f) => f());
  };

  const suscribir = (f: () => void) => {
    oyentes.add(f);
    const dejarSesion = suscribirSesion(f);
    return () => {
      oyentes.delete(f);
      dejarSesion();
    };
  };

  function usar(): T {
    return useSyncExternalStore(suscribir, leer, leerServidor);
  }

  return { leer, poner, usar };
}

/** Hook: id de la empresa activa (para recargar datos de localStorage al cambiar de sesión). */
export function useTenantActual(): string {
  return useSyncExternalStore(suscribirSesion, tenantActual, () => TENANT_DEMO);
}
