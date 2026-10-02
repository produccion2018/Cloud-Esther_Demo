import { useSyncExternalStore } from "react";

/* Ubicación: src/lib/cloud-esther/auditoria-store.ts

   Auditoría de la clínica (Seguridad → Auditoría, planes Plus y Enterprise).
   Registra sesiones (ingreso, salida, duración, dispositivo, navegador) y eventos relevantes
   (inicios y cierres de sesión, intentos fallidos, accesos a módulos, altas, cambios y bajas,
   cambios de configuración y de permisos). Cada clínica tiene su propio registro: se guarda
   por clinicId y ninguna empresa ve el de otra.

   IMPORTANTE (demo): hoy se registra solo lo que pasa en ESTE navegador. La IP y la ubicación
   aproximada no se pueden obtener desde el navegador: las informa el backend.
   No se copian datos clínicos: solo referencias (por ejemplo «Paciente #12»).
   TODO backend: POST /auditoria/eventos y /auditoria/sesiones, GET con filtros y paginación,
   autorización por rol en el servidor y política de retención. */

export type TipoEventoAuditoria =
  | "Inicio de sesión"
  | "Cierre de sesión"
  | "Intento fallido"
  | "Acceso a módulo"
  | "Alta"
  | "Modificación"
  | "Baja"
  | "Configuración"
  | "Permisos"
  | "Seguridad";

export type EventoAuditoria = {
  id: string;
  fecha: string; // ISO
  tipo: TipoEventoAuditoria;
  usuario: string;
  email: string;
  rol: string;
  accion: string;
  modulo: string;
  /** Referencia al registro afectado, sin datos sensibles. */
  registro?: string;
  resultado: "Correcto" | "Fallido" | "Denegado";
  sesionId?: string;
};

export type SesionAuditoria = {
  id: string;
  usuario: string;
  email: string;
  rol: string;
  inicio: string; // ISO
  ultimaActividad: string; // ISO
  fin: string | null; // ISO
  cierre: "Manual" | "Vencida" | null;
  dispositivo: string;
  sistema: string;
  navegador: string;
};

type Registro = { sesiones: SesionAuditoria[]; eventos: EventoAuditoria[] };

/** Tiempo sin actividad tras el cual una sesión abierta se considera vencida. */
export const VENCIMIENTO_SESION_MS = 30 * 60 * 1000;
const MAX_EVENTOS = 1000;
const MAX_SESIONES = 300;

const clave = (clinicId: string) => `cloud-esther:auditoria:${clinicId}`;
const VACIO: Registro = { sesiones: [], eventos: [] };
const cache = new Map<string, Registro>();
const oyentes = new Set<() => void>();

function leer(clinicId: string): Registro {
  const enCache = cache.get(clinicId);
  if (enCache) return enCache;
  let r = VACIO;
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(clave(clinicId)) : null;
    if (raw) r = JSON.parse(raw) as Registro;
  } catch {
    /* sin almacenamiento */
  }
  cache.set(clinicId, r);
  return r;
}

function escribir(clinicId: string, r: Registro) {
  cache.set(clinicId, r);
  try {
    window.localStorage.setItem(clave(clinicId), JSON.stringify(r));
  } catch {
    /* sin almacenamiento */
  }
  oyentes.forEach((o) => o());
}

const nuevoId = (p: string) =>
  `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** Dispositivo, sistema y navegador a partir del agente del navegador (aproximado). */
export function datosDispositivo() {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const navegador = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /Chrome\//.test(ua)
        ? "Chrome"
        : /Firefox\//.test(ua)
          ? "Firefox"
          : /Safari\//.test(ua)
            ? "Safari"
            : "Otro";
  const sistema = /Windows/.test(ua)
    ? "Windows"
    : /Android/.test(ua)
      ? "Android"
      : /iPhone|iPad/.test(ua)
        ? "iOS"
        : /Mac OS X/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "Otro";
  const dispositivo = /iPad|Tablet/.test(ua)
    ? "Tablet"
    : /Mobi|Android|iPhone/.test(ua)
      ? "Celular"
      : "Computadora";
  return { dispositivo, sistema, navegador };
}

type Quien = { usuario: string; email: string; rol: string };

export function registrarEventoAuditoria(
  clinicId: string,
  e: Omit<EventoAuditoria, "id" | "fecha" | "resultado"> & {
    resultado?: EventoAuditoria["resultado"];
  },
) {
  const r = leer(clinicId);
  const evento: EventoAuditoria = {
    id: nuevoId("ev"),
    fecha: new Date().toISOString(),
    resultado: "Correcto",
    ...e,
  };
  escribir(clinicId, { ...r, eventos: [evento, ...r.eventos].slice(0, MAX_EVENTOS) });
}

/** Abre una sesión y devuelve su identificador. */
export function abrirSesionAuditoria(clinicId: string, quien: Quien) {
  const r = leer(clinicId);
  const ahora = new Date().toISOString();
  const sesion: SesionAuditoria = {
    id: nuevoId("ses"),
    ...quien,
    inicio: ahora,
    ultimaActividad: ahora,
    fin: null,
    cierre: null,
    ...datosDispositivo(),
  };
  escribir(clinicId, { ...r, sesiones: [sesion, ...r.sesiones].slice(0, MAX_SESIONES) });
  registrarEventoAuditoria(clinicId, {
    ...quien,
    tipo: "Inicio de sesión",
    accion: "Ingresó a Cloud Esther",
    modulo: "Acceso",
    sesionId: sesion.id,
  });
  return sesion.id;
}

export function cerrarSesionAuditoria(clinicId: string, motivo: "Manual" | "Vencida" = "Manual") {
  const r = leer(clinicId);
  const abierta = r.sesiones.find((s) => !s.fin);
  if (!abierta) return;
  const ahora = new Date().toISOString();
  escribir(clinicId, {
    ...r,
    sesiones: r.sesiones.map((s) =>
      s.id === abierta.id ? { ...s, fin: ahora, cierre: motivo } : s,
    ),
  });
  registrarEventoAuditoria(clinicId, {
    usuario: abierta.usuario,
    email: abierta.email,
    rol: abierta.rol,
    tipo: "Cierre de sesión",
    accion: motivo === "Manual" ? "Cerró sesión" : "La sesión venció por inactividad",
    modulo: "Acceso",
    sesionId: abierta.id,
  });
}

/** Marca actividad en la sesión abierta y, si corresponde, registra el acceso al módulo. */
export function registrarActividadAuditoria(
  clinicId: string,
  modulo: string | null,
  registrarModulo: boolean,
) {
  const r = leer(clinicId);
  const abierta = r.sesiones.find((s) => !s.fin);
  if (!abierta) return;
  const ahora = new Date().toISOString();
  escribir(clinicId, {
    ...r,
    sesiones: r.sesiones.map((s) => (s.id === abierta.id ? { ...s, ultimaActividad: ahora } : s)),
  });
  if (modulo && registrarModulo)
    registrarEventoAuditoria(clinicId, {
      usuario: abierta.usuario,
      email: abierta.email,
      rol: abierta.rol,
      tipo: "Acceso a módulo",
      accion: `Abrió ${modulo}`,
      modulo,
      sesionId: abierta.id,
    });
}

/** Estado de una sesión: abierta, vencida por inactividad o cerrada. */
export function estadoSesion(s: SesionAuditoria): "Activa" | "Vencida" | "Cerrada" {
  if (s.fin) return s.cierre === "Vencida" ? "Vencida" : "Cerrada";
  return Date.now() - new Date(s.ultimaActividad).getTime() > VENCIMIENTO_SESION_MS
    ? "Vencida"
    : "Activa";
}

/** Borra los registros más antiguos que el período de conservación elegido. */
export function aplicarRetencion(clinicId: string, dias: number) {
  const r = leer(clinicId);
  const limite = Date.now() - dias * 86_400_000;
  escribir(clinicId, {
    sesiones: r.sesiones.filter((s) => new Date(s.inicio).getTime() >= limite),
    eventos: r.eventos.filter((e) => new Date(e.fecha).getTime() >= limite),
  });
}

export function useAuditoria(clinicId: string): Registro {
  return useSyncExternalStore(
    (o) => {
      oyentes.add(o);
      return () => oyentes.delete(o);
    },
    () => leer(clinicId),
    () => VACIO,
  );
}
