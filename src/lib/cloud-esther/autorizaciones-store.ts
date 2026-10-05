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

const dia = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
};

/* Datos de ejemplo (borrar al conectar el backend). */
const EJEMPLOS: Autorizacion[] = [
  {
    id: "aut-1",
    pacienteId: 1,
    paciente: "Mauro Pinto",
    tipo: "Tratamiento",
    titulo: "Endodoncia en pieza 16",
    detalle: "Tratamiento de conducto con anestesia local. Duración estimada: 2 sesiones.",
    solicitadoPor: "Dr. Jesús Méndez",
    origen: "Profesional",
    fecha: dia(-1),
    vence: dia(6).slice(0, 10),
    estado: "Pendiente",
    gestion: "Sin gestionar",
    historial: [
      { fecha: dia(-1), accion: "Solicitud enviada al paciente", por: "Dr. Jesús Méndez" },
    ],
  },
  {
    id: "aut-2",
    pacienteId: 1,
    paciente: "Mauro Pinto",
    tipo: "Uso de imágenes",
    titulo: "Uso de fotografías clínicas con fines académicos",
    detalle: "Fotos intraorales sin datos que permitan identificarte.",
    solicitadoPor: "Administración",
    origen: "Administración",
    fecha: dia(-20),
    estado: "Autorizada",
    permanente: true,
    respuesta: { fecha: dia(-19), por: "Mauro Pinto", comentario: "" },
    gestion: "Finalizada",
    historial: [
      { fecha: dia(-20), accion: "Solicitud enviada al paciente", por: "Administración" },
      { fecha: dia(-19), accion: "El paciente autorizó", por: "Mauro Pinto" },
    ],
  },
  {
    id: "aut-3",
    pacienteId: 1,
    paciente: "Mauro Pinto",
    tipo: "Receta",
    titulo: "Receta de amoxicilina 500 mg",
    detalle: "Renovación de receta por 7 días.",
    solicitadoPor: "Dr. Jesús Méndez",
    origen: "Profesional",
    fecha: dia(-35),
    estado: "Rechazada",
    respuesta: {
      fecha: dia(-34),
      por: "Mauro Pinto",
      comentario: "Prefiero consultarlo en el próximo turno.",
    },
    gestion: "Finalizada",
    historial: [
      { fecha: dia(-35), accion: "Solicitud enviada al paciente", por: "Dr. Jesús Méndez" },
      { fecha: dia(-34), accion: "El paciente rechazó", por: "Mauro Pinto" },
    ],
  },
  {
    id: "aut-4",
    pacienteId: 2,
    paciente: "Marina Delgado",
    tipo: "Consentimiento informado",
    titulo: "Consentimiento para blanqueamiento",
    detalle: "Información sobre sensibilidad temporal y cuidados posteriores.",
    solicitadoPor: "Dra. Laura Martínez",
    origen: "Profesional",
    fecha: dia(-2),
    vence: dia(3).slice(0, 10),
    estado: "Pendiente",
    permanente: true,
    gestion: "En gestión",
    historial: [
      { fecha: dia(-2), accion: "Solicitud enviada al paciente", por: "Dra. Laura Martínez" },
    ],
  },
];

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
