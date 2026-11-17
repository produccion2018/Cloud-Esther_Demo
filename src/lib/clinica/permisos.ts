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

/** Módulos que tiene TODO el equipo, sin importar el rol (el chat interno es de todos) */
const PARA_TODOS = new Set(["comunicacion-interna"]);
/** Siempre visibles: el inicio y los avisos */
const SIEMPRE = new Set(["dashboard", "notificaciones"]);

/** ¿Lo puede ver? Rol + lo que el Administrador eligió para esa persona (`modulos`; null = todo lo de su rol).
    El servidor aplica lo mismo: la pantalla solo lo oculta. */
export function puedeVer(rol: RolClinica | null, moduloId: string, modulos?: string[] | null): boolean {
  if (!rol) return false;
  if (rol === "admin" || PARA_TODOS.has(moduloId) || SIEMPRE.has(moduloId)) return true;
  // Lo que eligió el Administrador (cualquier módulo del plan, para cualquier rol)
  if (modulos) return modulos.includes(moduloId);
  return ACCESO_ROL[rol]?.includes(moduloId) ?? false;
}

/** Módulos que el Administrador le puede dar (o sacar) a cada rol, en orden */
export function modulosDelRol(rol: RolClinica): string[] {
  return rol === "admin" ? [] : [...(ACCESO_ROL[rol] ?? [])];
}

/* Módulos que YA guardan en el servidor para las clínicas reales. Los demás muestran
   «se está preparando» (nunca datos de ejemplo, y nunca guardan en el navegador). */
const HABILITADOS = new Set([
  "dashboard", "agenda", "pacientes", "equipo", "notificaciones",
  // Plan Start completo (14 oct): ficha clínica, odontograma 2D, estudios, comunicación y configuración
  "historia", "odontograma", "recetas", "estudios", "laboratorio", "tratamientos", "comunicaciones", "configuracion",
  // Odontograma 3D (Plus y Enterprise): visor andando y guarda en el servidor
  // (misma persistencia que el 2D). El plan ya lo limita a Plus/Enterprise.
  "odontograma3d",
  // Comunicación interna (estilo Teams): todos los planes y todos los roles
  "comunicacion-interna",
  // Pagos, facturación y analítica (punto 20): disponibles de verdad según el plan,
  // sin el cartel de «se está preparando».
  "facturacion", "finanzas", "bi",
  // Presupuestos (punto 15): funciona de verdad desde Pro (minPlan profesional).
  "presupuestos",
  // Equipo y RRHH (punto 10): CRUD real (legajos, nómina, tiempo, desarrollo, gestión)
  // que guarda en el servidor (módulo «rrhh», solo el admin) y arranca vacío.
  "rrhh",
  // Inventario (punto 10): CRUD real (stock, movimientos, alertas, órdenes, proveedores)
  // que guarda en el servidor (módulo «inventario», admin/asistente) y arranca vacío.
  "inventario",
  // Marketing (punto 10): CRUD real (leads, campañas, cupones, referidos, reseñas) que
  // guarda en el servidor (módulo «marketing», admin/secretaría) y arranca vacío.
  "marketing",
  // IA Esther (punto 12): asistente real. askEsther llama a un endpoint de servidor
  // (preguntarIA → proveedor OpenAI/Groq por variables en Vercel) con el contexto real de
  // la clínica, y si no hay clave cae al motor de reglas. El historial guarda en «ia».
  // Solo Plus y Enterprise (minPlan avanzada), como piden las reglas comerciales.
  "ia",
  // Automatizaciones/n8n (punto 11): lo interno (seguimiento, tareas, avisos) se registra de
  // verdad; los envíos EXTERNOS (WhatsApp/email) se SIMULAN y la pantalla lo avisa claramente
  // (no se finge un envío real). Se habilita con esos avisos visibles hasta conectar un n8n
  // real. Solo Enterprise (minPlan grupo).
  "automatizaciones",
  // Portal del paciente (punto 10): real. El admin configura el portal e invita pacientes
  // (código guardado en el módulo «portal»); el paciente entra con DNI/correo + código,
  // verificado contra ese store. En clínica real el código se envía por correo; en el demo
  // se muestra. Solo Enterprise (minPlan grupo).
  "portal-paciente",
  // Multiempresa (punto 13): muestra la clínica real de la sesión y permite cargar clínicas y
  // sucursales, que ahora PERSISTEN en el servidor (módulo «multiempresa»). Sin datos de ejemplo
  // (el feed falso se quitó). Solo Enterprise (minPlan grupo).
  "multiempresa",
]);
export const moduloHabilitado = (id: string) => HABILITADOS.has(id);

/* Secciones de la ficha del paciente que cada rol ve (la Secretaría no ve datos de salud) */
const SECCIONES_SECRETARIA = new Set(["resumen", "documentos", "presupuestos", "turnos", "cuenta", "profesionales"]);
/* Secciones de la ficha que dependen de un módulo: si el Administrador le sacó ese módulo a la
   persona, tampoco ve esa sección en la ficha (el servidor ya no se la entrega). */
const SECCION_MODULO: Record<string, string> = {
  historia: "historia",
  tratamientos: "tratamientos",
  odontograma: "odontograma",
  recetas: "recetas",
  estudios: "estudios",
  laboratorio: "laboratorio",
  presupuestos: "presupuestos",
  turnos: "agenda",
};
export function puedeVerSeccionPaciente(rol: RolClinica | null, seccion: string, modulos?: string[] | null): boolean {
  if (!rol || rol === "admin") return true;
  const mod = SECCION_MODULO[seccion];
  if (modulos && mod) {
    // El odontograma 2D o 3D: alcanza con tener uno de los dos
    return modulos.includes(mod) || (mod === "odontograma" && modulos.includes("odontograma3d"));
  }
  if (rol === "secretaria") return SECCIONES_SECRETARIA.has(seccion);
  return true;
}

export const NOMBRE_ROL: Record<RolClinica, string> = {
  admin: "Administrador",
  odontologo: "Odontólogo/a",
  secretaria: "Secretaría",
  asistente: "Asistente",
};
