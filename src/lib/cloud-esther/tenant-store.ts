import { useSyncExternalStore } from "react";
import { clinicaActualId, suscribirSesion } from "@/lib/cloud-esther/auth-store";
import { PREFIJO_TENANT, clinicaReal } from "@/lib/clinica/modo-clinica";
import { cargarModulo, guardarModulo, registrarModulo } from "@/lib/clinica/sincronizar";

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
const VERSION_DATOS = "v3";

type OpcionesStore<T> = {
  /** Si se indica, los datos de cada empresa se guardan en el navegador (localStorage) con
      esta clave y se sincronizan entre pestañas (ej.: el Portal del paciente y Cloud Esther).
      En una CLÍNICA REAL (Etapa 8b) esta misma clave es el módulo que se guarda en el servidor. */
  persistir?: string;
  /** Cómo arranca una clínica real (sin los datos de ejemplo del demo). Si no se indica:
      las listas empiezan vacías y la configuración queda con sus valores normales. */
  vacio?: () => T;
  /** Partes que son solo de esta pantalla (ej. el paciente elegido): no se guardan en el servidor. */
  soloLocal?: (keyof T)[];
  /** Arreglo que se aplica SIEMPRE a los datos (al cargarlos y al guardarlos), por ejemplo
      los nombres de pacientes con mayúscula inicial («ANDRES felipe» → «Andres Felipe»). */
  normalizar?: (valor: T) => T;
};

/* Clínica real: listas vacías; los "mapas por id" (claves numéricas o compuestas) también vacíos;
   la configuración (objetos con nombres de campos) se deja con sus valores normales. */
const esMapaDeIds = (v: unknown) =>
  !!v &&
  typeof v === "object" &&
  !Array.isArray(v) &&
  Object.keys(v).length > 0 &&
  Object.keys(v).every((k) => /^\d+$/.test(k) || k.includes(":"));

export function vaciarDatosDeEjemplo<T>(valor: T): T {
  if (Array.isArray(valor)) return [] as T;
  if (esMapaDeIds(valor)) return {} as T;
  if (valor && typeof valor === "object") {
    return Object.fromEntries(
      Object.entries(valor as Record<string, unknown>).map(([k, v]) => [
        k,
        Array.isArray(v) ? [] : esMapaDeIds(v) ? {} : v,
      ]),
    ) as T;
  }
  return valor;
}

/** ¿Este espacio es de una clínica real con sesión abierta en esta pestaña? */
const esClinicaRealActiva = (tenant: string) =>
  tenant.startsWith(PREFIJO_TENANT) && clinicaReal()?.slug === tenant.slice(PREFIJO_TENANT.length);

export function crearStorePorEmpresa<T>(inicial: () => T, opciones: OpcionesStore<T> = {}) {
  const porEmpresa = new Map<string, T>();
  const oyentes = new Set<() => void>();
  const cargados = new Set<string>();
  const clave = (tenant: string) => `cloud-esther:${VERSION_DATOS}:${opciones.persistir}:${tenant}`;

  const vacio = (): T => (opciones.vacio ? opciones.vacio() : vaciarDatosDeEjemplo(inicial()));

  const norm = (valor: T): T => {
    if (!opciones.normalizar) return valor;
    try {
      return opciones.normalizar(valor);
    } catch {
      return valor;
    }
  };

  const de = (tenant: string): T => {
    // Una clínica real NUNCA arranca con los datos de ejemplo del demo
    if (!porEmpresa.has(tenant)) porEmpresa.set(tenant, tenant.startsWith(PREFIJO_TENANT) ? vacio() : inicial());
    return porEmpresa.get(tenant) as T;
  };

  // Lo que es solo de esta pantalla se conserva al traer datos del servidor y no se manda
  const quitarLocal = (valor: T): unknown => {
    if (!opciones.soloLocal?.length || !valor || typeof valor !== "object" || Array.isArray(valor)) return valor;
    const copia = { ...(valor as Record<string, unknown>) };
    for (const k of opciones.soloLocal) delete copia[k as string];
    return copia;
  };
  const conLocal = (datos: unknown, actual: T): T => {
    if (!opciones.soloLocal?.length || !datos || typeof datos !== "object" || Array.isArray(datos)) return datos as T;
    const copia = { ...(datos as Record<string, unknown>) };
    for (const k of opciones.soloLocal) copia[k as string] = (actual as Record<string, unknown>)[k as string];
    return copia as T;
  };

  const avisar = () => oyentes.forEach((f) => f());

  // Se lee del navegador recién después de hidratar (nunca en el primer render),
  // para que el HTML del servidor y el del cliente coincidan.
  const cargar = (tenant: string) => {
    if (!opciones.persistir || cargados.has(tenant) || typeof window === "undefined") return;
    // Clínica real: se trae del SERVIDOR (nunca del navegador)
    if (tenant.startsWith(PREFIJO_TENANT)) {
      if (!esClinicaRealActiva(tenant)) return;
      cargados.add(tenant);
      const clave = opciones.persistir;
      registrarModulo(clave, {
        aplicar: (datos) => {
          if (tenantActual() !== tenant) return;
          const nuevo = Array.isArray(datos)
            ? (datos as T)
            : ({ ...vacioCompleto(), ...(conLocal(datos, de(tenant)) as object) } as T);
          porEmpresa.set(tenant, norm(nuevo));
          avisar();
        },
        vacio: () => vacio(),
        paraGuardar: (valor) => quitarLocal(valor as T),
      });
      void cargarModulo(clave);
      return;
    }
    cargados.add(tenant);
    try {
      const guardado = window.localStorage.getItem(clave(tenant));
      if (guardado) {
        porEmpresa.set(tenant, norm(JSON.parse(guardado) as T));
        avisar();
      }
    } catch {
      /* datos corruptos o sin almacenamiento: se usan los de ejemplo */
    }
  };

  // Lo guardado puede ser de una versión anterior: los campos nuevos toman su valor vacío
  const vacioCompleto = (): Partial<T> => {
    const v = vacio();
    return v && typeof v === "object" && !Array.isArray(v) ? v : ({} as Partial<T>);
  };

  const guardar = (tenant: string, valor: T) => {
    if (!opciones.persistir || typeof window === "undefined") return;
    if (tenant.startsWith(PREFIJO_TENANT)) {
      if (esClinicaRealActiva(tenant)) guardarModulo(opciones.persistir, valor);
      return;
    }
    try {
      window.localStorage.setItem(clave(tenant), JSON.stringify(valor));
    } catch {
      /* sin espacio o bloqueado: sigue funcionando en memoria */
    }
  };

  const leer = (): T => de(tenantActual());
  // En el servidor no hay sesión: siempre el espacio demo (evita diferencias de hidratación).
  const leerServidor = (): T => de(TENANT_DEMO);

  const poner = (valor: T) => {
    const siguiente = norm(valor);
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
        porEmpresa.set(tenant, norm(JSON.parse(e.newValue) as T));
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
