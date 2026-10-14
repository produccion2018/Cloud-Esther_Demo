import type { RolClinica } from "@/lib/clinica/api";
import type { PlanId } from "@/lib/cloud-esther/data";

/** Plan del servidor (START, PRO…) → plan de las pantallas */
export const PLAN_DE_CODIGO: Record<string, PlanId> = {
  START: "inicial",
  PRO: "profesional",
  PLUS: "avanzada",
  ENTERPRISE: "grupo",
};

/* Ubicación: src/lib/clinica/permisos.ts
   QUÉ VE CADA ROL en una clínica real (además de lo que incluya su plan).
   El servidor aplica las mismas reglas a los datos (clinic-data.policy.ts del backend):
   la pantalla oculta, pero quien decide es el servidor.
   - Administrador: todo.
   - Odontólogo/a: lo clínico, comunicación y avisos.
   - Secretaría: recepción (agenda de todos, pacientes, comunicación, cobros). Sin datos de salud.
   - Asistente: agenda y pacientes; lo clínico para leer; estudios y laboratorio. */
const ACCESO_ROL: Record<Exclude<RolClinica, "admin">, string[]> = {
  odontologo: [
    "dashboard", "agenda", "pacientes", "historia", "odontograma", "odontograma3d", "recetas",
    "estudios", "laboratorio", "tratamientos", "comunicaciones", "notificaciones", "presupuestos", "ia",
  ],
  secretaria: [
    "dashboard", "agenda", "pacientes", "comunicaciones", "notificaciones", "presupuestos", "facturacion",
    "marketing", "portal-paciente",
  ],
  asistente: [
    "dashboard", "agenda", "pacientes", "historia", "odontograma", "odontograma3d", "estudios", "laboratorio",
    "tratamientos", "notificaciones",
  ],
};

export function puedeVer(rol: RolClinica | null, moduloId: string): boolean {
  if (!rol) return false;
  return rol === "admin" || (ACCESO_ROL[rol]?.includes(moduloId) ?? false);
}

/* Módulos que YA guardan en el servidor para las clínicas reales. Los demás muestran
   «se está preparando» (nunca datos de ejemplo, y nunca guardan en el navegador). */
const HABILITADOS = new Set([
  "dashboard", "agenda", "pacientes", "equipo", "notificaciones",
  // Plan Start completo (14 oct): ficha clínica, odontograma 2D, estudios, comunicación y configuración
  "historia", "odontograma", "recetas", "estudios", "laboratorio", "tratamientos", "comunicaciones", "configuracion",
]);
export const moduloHabilitado = (id: string) => HABILITADOS.has(id);

/* Secciones de la ficha del paciente que cada rol ve (la Secretaría no ve datos de salud) */
const SECCIONES_SECRETARIA = new Set(["resumen", "documentos", "presupuestos", "turnos", "cuenta", "profesionales"]);
export function puedeVerSeccionPaciente(rol: RolClinica | null, seccion: string): boolean {
  if (rol === "secretaria") return SECCIONES_SECRETARIA.has(seccion);
  return true;
}

export const NOMBRE_ROL: Record<RolClinica, string> = {
  admin: "Administrador",
  odontologo: "Odontólogo/a",
  secretaria: "Secretaría",
  asistente: "Asistente",
};
