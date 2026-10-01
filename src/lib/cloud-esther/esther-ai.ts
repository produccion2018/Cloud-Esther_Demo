import { responderRRHH } from "@/lib/cloud-esther/rrhh-store";
import { responder, type Bloque } from "@/lib/cloud-esther/esther-motor";
import { auditarConsulta, type RolIA } from "@/lib/cloud-esther/ia-store";
import type { PlanId } from "@/lib/cloud-esther/data";

export type EstherContext = {
  section?: EstherSection;
  recordId?: string;
  /** Plan, rol y sede de quien pregunta: la IA solo responde lo que ese usuario puede ver. */
  plan?: PlanId;
  rol?: RolIA;
  sede?: string;
  usuario?: string;
  pacienteId?: number | undefined;
  /** n8n (solo Enterprise o con el módulo adicional): ofrece automatizar lo consultado. */
  n8n?: boolean;
};

export type EstherSection =
  "general" | "paciente" | "odontograma" | "historia" | "turnos" | "informe" | "rrhh";

export type EstherReply = {
  text: string;
  needsRealData: boolean;
  bloques?: Bloque[];
  modulo?: string;
  resultado?: "Respondida" | "Sin permiso" | "Fuera del plan" | "Sin datos";
};

/** Consultas que tienen una automatización natural en n8n (Enterprise). */
const AUTOMATIZABLE: Record<string, string> = {
  presupuestos: "Automatizar el seguimiento con n8n",
  agenda: "Automatizar recordatorios con n8n",
  facturacion: "Automatizar la cobranza con n8n",
  inventario: "Automatizar la reposición con n8n",
  pacientes: "Automatizar la reactivación con n8n",
};

export const contextProgress: Record<EstherSection, string> = {
  general: "Estoy revisando la información disponible...",
  paciente: "Estoy revisando la información del paciente...",
  odontograma: "Estoy analizando el odontograma...",
  historia: "Estoy preparando un resumen de la historia clínica...",
  turnos: "Estoy revisando los próximos turnos...",
  informe: "Estoy preparando el informe...",
  rrhh: "Estoy revisando legajos, asistencia y licencias del equipo...",
};

export type EstherQuickAction = {
  id: string;
  label: string;
  section: EstherSection;
  /** Pregunta que se envía (si no, se usa el label). */
  prompt?: string;
  /** Abre una herramienta en lugar de preguntar. */
  herramienta?: "imagen" | "sonrisa";
};

export const estherQuickActions: EstherQuickAction[] = [
  {
    id: "analizar-paciente",
    label: "Analizar paciente",
    section: "paciente",
    prompt: "Analizá este paciente antes de la consulta",
  },
  {
    id: "resumir-historia",
    label: "Resumir historia clínica",
    section: "historia",
    prompt: "Resumí la historia clínica del paciente",
  },
  {
    id: "revisar-odontograma",
    label: "Revisar odontograma",
    section: "odontograma",
    prompt: "Revisá el odontograma del paciente",
  },
  {
    id: "preparar-informe",
    label: "Preparar informe",
    section: "informe",
    prompt: "Preparar informe del paciente",
  },
  {
    id: "buscar-informacion",
    label: "Buscar información",
    section: "general",
    prompt: "¿Qué puedo consultarte?",
  },
  {
    id: "analizar-registros",
    label: "Analizar registros",
    section: "turnos",
    prompt: "Revisar pendientes",
  },
  {
    id: "analizar-radiografia",
    label: "Analizar radiografía",
    section: "paciente",
    herramienta: "imagen",
  },
  { id: "simular-sonrisa", label: "Simular sonrisa", section: "paciente", herramienta: "sonrisa" },
  {
    id: "analizar-tratamientos",
    label: "Analizar tratamientos",
    section: "general",
    prompt: "¿Qué tratamientos están pendientes?",
  },
  {
    id: "revisar-presupuestos",
    label: "Revisar presupuestos",
    section: "general",
    prompt: "¿Cuántos presupuestos pendientes hay?",
  },
  {
    id: "analizar-agenda",
    label: "Analizar agenda",
    section: "turnos",
    prompt: "¿Cuántas citas tenemos esta semana?",
  },
  {
    id: "pacientes-inactivos",
    label: "Pacientes inactivos",
    section: "general",
    prompt: "Pacientes que no regresaron",
  },
  {
    id: "consultar-datos",
    label: "Consultar datos",
    section: "general",
    prompt: "¿Cuánto facturamos este mes?",
  },
  { id: "equipo-hoy", label: "¿Quién falta hoy?", section: "rrhh" },
  { id: "resolver-rrhh", label: "Pendientes de RRHH", section: "rrhh" },
  { id: "costo-equipo", label: "Costo laboral del mes", section: "rrhh" },
];

/** Preguntas de Recursos humanos: se responden con los datos reales del equipo. */
const TEMAS_RRHH =
  /rrhh|recursos humanos|emplead.*(falta|ausen|licencia)|legajo|vacacion|licencia|ausen.* equipo|falta hoy|fich|asistencia|llega(da)? tarde|sueldo|nomina|nómina|costo laboral|contrato|capacitaci|cumplea|pendientes de rrhh/i;

export async function askEsther(
  message: string,
  context: EstherContext = {},
): Promise<EstherReply> {
  await new Promise((resolve) => setTimeout(resolve, 300));

  const section = context.section ?? "general";
  const rol = context.rol ?? "admin";
  const base = {
    usuario: context.usuario ?? "Usuario",
    rol,
    sede: context.sede ?? "Todas",
  };
  if (section === "rrhh" || TEMAS_RRHH.test(message)) {
    if (rol !== "admin") {
      auditarConsulta({ ...base, pregunta: message, modulo: "rrhh", resultado: "Sin permiso" });
      return {
        text: "La información de Recursos humanos solo la puede consultar un administrador.",
        needsRealData: false,
        modulo: "rrhh",
        resultado: "Sin permiso",
      };
    }
    const pregunta = /pendientes de rrhh/i.test(message) ? "¿Qué tengo que resolver?" : message;
    auditarConsulta({ ...base, pregunta: message, modulo: "rrhh", resultado: "Respondida" });
    return {
      text: responderRRHH(pregunta),
      needsRealData: false,
      modulo: "rrhh",
      resultado: "Respondida",
    };
  }
  const r = responder(message, {
    plan: context.plan ?? "avanzada",
    rol,
    sede: base.sede,
    usuario: base.usuario,
    pacienteId: context.pacienteId,
    seccion: section,
  });
  auditarConsulta({ ...base, pregunta: message, modulo: r.modulo, resultado: r.resultado });
  let bloques = r.bloques;
  const auto = AUTOMATIZABLE[r.modulo];
  if (context.n8n && auto && r.resultado === "Respondida")
    bloques = [
      ...(bloques ?? []),
      { tipo: "acciones", items: [{ label: auto, to: "/demo/automatizaciones" }] },
    ];
  return {
    text: r.texto,
    needsRealData: false,
    modulo: r.modulo,
    resultado: r.resultado,
    ...(bloques ? { bloques } : {}),
  };
}
