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

/* Versión de los datos guardados: subirla cuando cambian los datos de ejemplo o su forma,
   así cada navegador arranca de nuevo con los datos actualizados. */
const VERSION_DATOS = "v1";

type OpcionesStore = {
  /** Si se indica, los datos de cada empresa se guardan en el navegador (localStorage) con
      esta clave y se sincronizan entre pestañas (ej.: el Portal del paciente y Cloud Esther). */
  persistir?: string;
};

export function crearStorePorEmpresa<T>(inicial: () => T, opciones: OpcionesStore = {}) {
  const porEmpresa = new Map<string, T>();
  const oyentes = new Set<() => void>();
  const cargados = new Set<string>();
  const clave = (tenant: string) => `cloud-esther:${VERSION_DATOS}:${opciones.persistir}:${tenant}`;

  const de = (tenant: string): T => {
    if (!porEmpresa.has(tenant)) porEmpresa.set(tenant, inicial());
    return porEmpresa.get(tenant) as T;
  };

  const avisar = () => oyentes.forEach((f) => f());

  // Se lee del navegador recién después de hidratar (nunca en el primer render),
  // para que el HTML del servidor y el del cliente coincidan.
  const cargar = (tenant: string) => {
    if (!opciones.persistir || cargados.has(tenant) || typeof window === "undefined") return;
    cargados.add(tenant);
    try {
      const guardado = window.localStorage.getItem(clave(tenant));
      if (guardado) {
        porEmpresa.set(tenant, JSON.parse(guardado) as T);
        avisar();
      }
    } catch {
      /* datos corruptos o sin almacenamiento: se usan los de ejemplo */
    }
  };

  const guardar = (tenant: string, valor: T) => {
    if (!opciones.persistir || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(clave(tenant), JSON.stringify(valor));
    } catch {
      /* sin espacio o bloqueado: sigue funcionando en memoria */
    }
  };

  const leer = (): T => de(tenantActual());
  // En el servidor no hay sesión: siempre el espacio demo (evita diferencias de hidratación).
  const leerServidor = (): T => de(TENANT_DEMO);

  const poner = (siguiente: T) => {
    const tenant = tenantActual();
    porEmpresa.set(tenant, siguiente);
    guardar(tenant, siguiente);
    avisar();
  };

  // Otra pestaña guardó cambios de esta empresa: se toman al instante.
  if (opciones.persistir && typeof window !== "undefined") {
    window.addEventListener("storage", (e) => {
      if (!e.key || !e.newValue) return;
      const tenant = tenantActual();
      if (e.key !== clave(tenant)) return;
      try {
        porEmpresa.set(tenant, JSON.parse(e.newValue) as T);
        avisar();
      } catch {
        /* ignorar */
      }
    });
  }

  const suscribir = (f: () => void) => {
    oyentes.add(f);
    const dejarSesion = suscribirSesion(() => {
      queueMicrotask(() => cargar(tenantActual()));
      f();
    });
    queueMicrotask(() => cargar(tenantActual()));
    return () => {
      oyentes.delete(f);
      dejarSesion();
    };
  };

  function usar(): T {
    return useSyncExternalStore(suscribir, leer, leerServidor);
  }

  /* leer/poner fuera de React (setters de otros módulos) también toman lo guardado. */
  const leerConCarga = (): T => {
    if (typeof window !== "undefined") cargar(tenantActual());
    return leer();
  };

  return { leer: leerConCarga, poner, usar };
}

/** Borra los datos de práctica guardados de la empresa activa (vuelven los de ejemplo). */
export function borrarDatosGuardados() {
  try {
    const sufijo = `:${tenantActual()}`;
    Object.keys(window.localStorage)
      .filter((k) => k.startsWith("cloud-esther:v") && k.endsWith(sufijo))
      .forEach((k) => window.localStorage.removeItem(k));
  } catch {
    /* ignorar */
  }
}

/** Hook: id de la empresa activa (para recargar datos de localStorage al cambiar de sesión). */
export function useTenantActual(): string {
  return useSyncExternalStore(suscribirSesion, tenantActual, () => TENANT_DEMO);
}
