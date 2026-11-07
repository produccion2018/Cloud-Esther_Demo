import { crearStorePorEmpresa } from "@/lib/cloud-esther/tenant-store";

/* Ubicación: src/lib/cloud-esther/autorizaciones-store.ts
   Autorizaciones y consentimientos del paciente (Plan 4), por empresa.
   Flujo: un profesional o administración pide una autorización (receta, tratamiento, documento,
   estudio, uso de imágenes…) → el paciente la revisa en su portal y la otorga o la rechaza →
   la clínica la gestiona y le hace el seguimiento. Los consentimientos otorgados se pueden
   revocar desde «Privacidad y permisos». Todo queda en el historial.
   TODO backend: /autorizaciones con firma del paciente (fecha, IP y dispositivo) y aviso por mail. */

export type TipoAutorizacion =
  | "Receta"
  | "Tratamiento"
  | "Documento"
  | "Estudio"
  | "Consentimiento informado"
  | "Uso de imágenes"
  | "Compartir datos"
  | "Otro";

export const TIPOS_AUTORIZACION: TipoAutorizacion[] = [
  "Receta",
  "Tratamiento",
  "Documento",
  "Estudio",
  "Consentimiento informado",
  "Uso de imágenes",
  "Compartir datos",
  "Otro",
];

export type EstadoAutorizacion = "Pendiente" | "Autorizada" | "Rechazada" | "Revocada";
export type GestionAutorizacion = "Sin gestionar" | "En gestión" | "Finalizada";

export type EventoAutorizacion = { fecha: string; accion: string; por: string };

export type Autorizacion = {
  id: string;
  pacienteId: number;
  paciente: string;
  tipo: TipoAutorizacion;
  titulo: string;
  detalle: string;
  solicitadoPor: string;
  origen: "Profesional" | "Administración" | "Paciente";
  fecha: string; // ISO
  /** Hasta cuándo se puede responder (ISO, día). */
  vence?: string;
  estado: EstadoAutorizacion;
  /** Permiso que queda vigente una vez otorgado (ej.: consentimientos). Se puede revocar. */
  permanente?: boolean;
  respuesta?: { fecha: string; por: string; comentario: string };
  gestion: GestionAutorizacion;
  historial: EventoAutorizacion[];
};

/* Sin datos de ejemplo: el demo arranca vacío, igual que una clínica real. */
const EJEMPLOS: Autorizacion[] = [];

type Estado = { autorizaciones: Autorizacion[] };

export const storeAutorizaciones = crearStorePorEmpresa<Estado>(
  () => ({ autorizaciones: EJEMPLOS }),
  { persistir: "autorizaciones" },
);

const ahora = () => new Date().toISOString();

function actualizar(id: string, fn: (a: Autorizacion) => Autorizacion) {
  const e = storeAutorizaciones.leer();
  storeAutorizaciones.poner({
    autorizaciones: e.autorizaciones.map((a) => (a.id === id ? fn(a) : a)),
  });
}

export function crearAutorizacion(
  a: Omit<Autorizacion, "id" | "fecha" | "estado" | "gestion" | "historial">,
) {
  const nueva: Autorizacion = {
    ...a,
    id: `aut-${Date.now().toString(36)}`,
    fecha: ahora(),
    estado: "Pendiente",
    gestion: "Sin gestionar",
    historial: [{ fecha: ahora(), accion: "Solicitud enviada al paciente", por: a.solicitadoPor }],
  };
  const e = storeAutorizaciones.leer();
  storeAutorizaciones.poner({ autorizaciones: [nueva, ...e.autorizaciones] });
  return nueva;
}

/** El paciente responde: autoriza o rechaza (con comentario opcional). */
export function responderAutorizacion(id: string, autoriza: boolean, por: string, comentario = "") {
  actualizar(id, (a) => ({
    ...a,
    estado: autoriza ? "Autorizada" : "Rechazada",
    respuesta: { fecha: ahora(), por, comentario },
    historial: [
      ...a.historial,
      { fecha: ahora(), accion: autoriza ? "El paciente autorizó" : "El paciente rechazó", por },
    ],
  }));
}

/** El paciente revoca un permiso otorgado (Privacidad y permisos). */
export function revocarAutorizacion(id: string, por: string) {
  actualizar(id, (a) => ({
    ...a,
    estado: "Revocada",
    historial: [...a.historial, { fecha: ahora(), accion: "El paciente revocó el permiso", por }],
  }));
}

/** La clínica gestiona la solicitud (seguimiento). */
export function gestionarAutorizacion(id: string, gestion: GestionAutorizacion, por: string) {
  actualizar(id, (a) => ({
    ...a,
    gestion,
    historial: [...a.historial, { fecha: ahora(), accion: `Gestión: ${gestion}`, por }],
  }));
}

export function recordarAutorizacion(id: string, por: string) {
  actualizar(id, (a) => ({
    ...a,
    historial: [
      ...a.historial,
      { fecha: ahora(), accion: "Recordatorio enviado al paciente", por },
    ],
  }));
}

export const TONO_ESTADO_AUT: Record<EstadoAutorizacion, string> = {
  Pendiente: "bg-amber-100 text-amber-700",
  Autorizada: "bg-emerald-100 text-emerald-700",
  Rechazada: "bg-rose-100 text-rose-700",
  Revocada: "bg-muted text-muted-foreground",
};
