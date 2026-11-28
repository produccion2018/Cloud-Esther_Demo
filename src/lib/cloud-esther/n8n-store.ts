import { crearStorePorEmpresa } from "@/lib/cloud-esther/tenant-store";

/* Ubicación: src/lib/cloud-esther/n8n-store.ts
   Automatizaciones con n8n (Enterprise). Separación de responsabilidades:
   - Cloud Esther emite EVENTOS (presupuesto creado, turno próximo, factura vencida…).
   - n8n detecta el evento y ejecuta el WORKFLOW (esperas, condiciones, canales externos).
   - Los pasos "Esther Infinity" le piden a Cloud Esther Infinity que analice, redacte o clasifique.
   - n8n ejecuta la ACCIÓN y el resultado vuelve a Cloud Esther (auditoría).
   Todo por empresa (tenant) y sede. TODO backend: webhooks firmados por tenant y API de n8n. */

export type EventoId =
  | "presupuesto_creado"
  | "presupuesto_sin_respuesta"
  | "turno_creado"
  | "turno_proximo"
  | "turno_cancelado"
  | "paciente_inactivo"
  | "paciente_nuevo"
  | "tratamiento_finalizado"
  | "factura_vencida"
  | "saldo_pendiente"
  | "stock_bajo"
  | "estudio_pendiente"
  | "laboratorio_listo"
  | "laboratorio_atrasado"
  | "tratamiento_inconcluso"
  | "encuesta_satisfaccion"
  | "indicaciones_postoperatorias"
  | "cumpleanos"
  | "resumen_equipo"
  | "mensaje_contact_center";

export const EVENTOS: Record<EventoId, { nombre: string; detalle: string; modulo: string }> = {
  presupuesto_creado: {
    nombre: "Presupuesto creado",
    detalle: "Cuando se emite un presupuesto",
    modulo: "Presupuestos",
  },
  presupuesto_sin_respuesta: {
    nombre: "Presupuesto sin respuesta",
    detalle: "Enviado y sin respuesta después de X días",
    modulo: "Presupuestos",
  },
  turno_creado: { nombre: "Turno creado", detalle: "Cuando se agenda un turno", modulo: "Agenda" },
  turno_proximo: { nombre: "Turno próximo", detalle: "24 h antes de cada turno", modulo: "Agenda" },
  turno_cancelado: {
    nombre: "Turno cancelado",
    detalle: "Cuando un turno se cancela",
    modulo: "Agenda",
  },
  paciente_inactivo: {
    nombre: "Paciente para volver a llamar",
    detalle: "Sin venir hace los meses que elige la clínica en Pacientes (y sin turno)",
    modulo: "Pacientes",
  },
  paciente_nuevo: {
    nombre: "Paciente nuevo",
    detalle: "Primera consulta registrada",
    modulo: "Pacientes",
  },
  tratamiento_finalizado: {
    nombre: "Tratamiento finalizado",
    detalle: "Al completar un tratamiento",
    modulo: "Tratamientos",
  },
  factura_vencida: {
    nombre: "Factura vencida",
    detalle: "Factura con saldo después del vencimiento",
    modulo: "Facturación",
  },
  saldo_pendiente: {
    nombre: "Paciente con saldo pendiente",
    detalle: "Debe en su cuenta corriente hace 15 días o más (una vez por deuda)",
    modulo: "Pagos",
  },
  stock_bajo: {
    nombre: "Stock bajo",
    detalle: "Insumo por debajo del mínimo",
    modulo: "Inventario",
  },
  estudio_pendiente: {
    nombre: "Estudio pedido sin recibir",
    detalle: "Orden de estudio pendiente hace 7 días o más",
    modulo: "Estudios",
  },
  laboratorio_listo: {
    nombre: "Trabajo de laboratorio listo",
    detalle: "El trabajo volvió del laboratorio (listo o entregado): avisar al paciente",
    modulo: "Laboratorio",
  },
  laboratorio_atrasado: {
    nombre: "Trabajo de laboratorio atrasado",
    detalle: "Pasó la fecha de entrega y el trabajo no llegó: reclamar al laboratorio",
    modulo: "Laboratorio",
  },
  tratamiento_inconcluso: {
    nombre: "Tratamiento sin terminar",
    detalle: "Tratamiento en curso sin turno y sin venir hace 30 días: invitar a retomarlo",
    modulo: "Tratamientos",
  },
  encuesta_satisfaccion: {
    nombre: "Encuesta después del turno",
    detalle: "Al marcar un turno como Atendida: pedirle su opinión (1 a 5) con un enlace",
    modulo: "Agenda",
  },
  indicaciones_postoperatorias: {
    nombre: "Indicaciones después del tratamiento",
    detalle: "Al registrar una sesión (extracción, cirugía, endodoncia…): mandarle los cuidados de tu plantilla",
    modulo: "Tratamientos",
  },
  cumpleanos: {
    nombre: "Cumpleaños del paciente",
    detalle: "El día de su cumpleaños: saludo con tu plantilla «Feliz cumpleaños»",
    modulo: "Pacientes",
  },
  resumen_equipo: {
    nombre: "Resumen del día para el equipo",
    detalle: "Cada mañana, a la hora del resumen diario: a cada integrante con teléfono, sus turnos y tareas del día",
    modulo: "Equipo",
  },
  mensaje_contact_center: {
    nombre: "Mensaje del Contact Center",
    detalle: "Mensaje entrante de WhatsApp o webchat",
    modulo: "Contact Center",
  },
};

export type TipoPaso =
  | "ia"
  | "esperar"
  | "condicion"
  | "whatsapp"
  | "email"
  | "tarea"
  | "actualizar"
  | "webhook"
  | "notificar";
export type ConfigPaso = {
  tarea?: string;
  dias?: string;
  regla?: string;
  mensaje?: string;
  asunto?: string;
  texto?: string;
  accion?: string;
  url?: string;
  canal?: string;
};
export type Paso = { id: string; tipo: TipoPaso; config: ConfigPaso };

export const PASOS: Record<
  TipoPaso,
  {
    nombre: string;
    quien: "Esther Infinity" | "Automatización" | "Cloud Esther";
    detalle: string;
    defecto: ConfigPaso;
  }
> = {
  ia: {
    nombre: "Esther Infinity",
    quien: "Esther Infinity",
    detalle: "Analiza, redacta o clasifica con el contexto permitido",
    defecto: { tarea: "Redactar mensaje" },
  },
  esperar: { nombre: "Esperar", quien: "Automatización", detalle: "Pausa el flujo", defecto: { dias: "3" } },
  condicion: {
    nombre: "Condición",
    quien: "Automatización",
    detalle: "Sigue solo si se cumple",
    defecto: { regla: "Sin respuesta del paciente" },
  },
  whatsapp: {
    nombre: "Enviar WhatsApp",
    quien: "Automatización",
    detalle: "WhatsApp Business",
    defecto: { mensaje: "Mensaje redactado por Esther Infinity" },
  },
  email: {
    nombre: "Enviar correo",
    quien: "Automatización",
    detalle: "SMTP / Gmail",
    defecto: { asunto: "Novedades de tu clínica" },
  },
  tarea: {
    nombre: "Crear tarea",
    quien: "Cloud Esther",
    detalle: "Tarea para el equipo en la Agenda",
    defecto: { texto: "Llamar al paciente" },
  },
  actualizar: {
    nombre: "Actualizar Cloud Esther",
    quien: "Cloud Esther",
    detalle: "Registra el resultado",
    defecto: { accion: "Registrar seguimiento" },
  },
  webhook: {
    nombre: "Webhook externo",
    quien: "Automatización",
    detalle: "Llama a otro servicio",
    defecto: { url: "https://hooks.ejemplo.com/cloud-esther" },
  },
  notificar: {
    nombre: "Notificar al equipo",
    quien: "Automatización",
    detalle: "Slack, correo o aviso interno",
    defecto: { canal: "Aviso interno" },
  },
};

export const TAREAS_IA = [
  "Analizar contexto",
  "Redactar mensaje",
  "Clasificar respuesta",
  "Priorizar",
] as const;
export const REGLAS = [
  "Sin respuesta del paciente",
  "Monto mayor a $ 300.000",
  "Paciente con WhatsApp",
  "Prioridad alta según Esther Infinity",
] as const;
export const ACCIONES = [
  "Registrar seguimiento",
  "Crear aviso en Notificaciones",
  "Marcar para llamar",
] as const;

export type Flujo = {
  id: string;
  nombre: string;
  evento: EventoId;
  pasos: Paso[];
  activo: boolean;
  sedes: string; // "Todas" o una sede
  creado: string;
  plantilla?: string;
};

export type PasoEjecutado = {
  tipo: TipoPaso;
  titulo: string;
  resultado: string;
  estado: "ok" | "omitido" | "espera" | "error";
};
export type Ejecucion = {
  id: string;
  flujoId: string;
  flujo: string;
  fecha: string;
  disparador: string;
  sede: string;
  estado: "Completada" | "En espera" | "Detenida" | "Error" | "En curso";
  pasos: PasoEjecutado[];
  /** Prueba (simulada en la pantalla), Automática (la corrió el servidor) o Manual (de verdad, a pedido) */
  modo: "Prueba" | "Automática" | "Manual";
  /** Clínica real: cuándo se retoma un paso «Esperar» */
  retomaEl?: string | null;
};

export type Credencial = { id: string; nombre: string; conectada: boolean; detalle: string };

export type EstadoN8n = {
  instancia: string;
  apiKey: string;
  conectado: boolean;
  ultimaPrueba: string;
  flujos: Flujo[];
  ejecuciones: Ejecucion[];
  credenciales: Credencial[];
};

const p = (tipo: TipoPaso, config: ConfigPaso = {}): Paso => ({
  id: `${tipo}-${Math.random().toString(36).slice(2, 8)}`,
  tipo,
  config: { ...PASOS[tipo].defecto, ...config },
});

export const PLANTILLAS: {
  id: string;
  nombre: string;
  descripcion: string;
  evento: EventoId;
  pasos: () => Paso[];
}[] = [
  {
    id: "seguimiento-presupuesto",
    nombre: "Seguimiento de presupuestos",
    descripcion:
      "Si el paciente no responde en 3 días, Esther redacta un mensaje personalizado y lo envía por WhatsApp.",
    evento: "presupuesto_sin_respuesta",
    pasos: () => [
      p("esperar", { dias: "3" }),
      p("condicion", { regla: "Sin respuesta del paciente" }),
      p("ia", { tarea: "Redactar mensaje" }),
      p("whatsapp"),
      p("actualizar", { accion: "Registrar seguimiento" }),
    ],
  },
  {
    id: "recordatorio-turno",
    nombre: "Recordatorio y confirmación de turno",
    descripcion:
      "24 h antes se envía el recordatorio; Esther interpreta la respuesta y confirma, cancela o reprograma.",
    evento: "turno_proximo",
    pasos: () => [
      p("ia", { tarea: "Redactar mensaje" }),
      p("whatsapp"),
      p("ia", { tarea: "Clasificar respuesta" }),
      p("actualizar", { accion: "Registrar seguimiento" }),
    ],
  },
  {
    id: "reactivacion",
    nombre: "Reactivación de pacientes inactivos",
    descripcion: "Esther prioriza a quién contactar y redacta la invitación a un control.",
    evento: "paciente_inactivo",
    pasos: () => [
      p("ia", { tarea: "Priorizar" }),
      p("condicion", { regla: "Paciente con WhatsApp" }),
      p("ia", { tarea: "Redactar mensaje" }),
      p("whatsapp"),
      p("tarea", { texto: "Llamar si no responde en 5 días" }),
    ],
  },
  {
    id: "presupuesto-alto",
    nombre: "Presupuestos altos: llamado personal",
    descripcion:
      "Cuando se crea un presupuesto grande, Esther analiza el contexto y se crea una tarea para recepción.",
    evento: "presupuesto_creado",
    pasos: () => [
      p("condicion", { regla: "Monto mayor a $ 300.000" }),
      p("ia", { tarea: "Analizar contexto" }),
      p("tarea", { texto: "Llamar al paciente para explicar el presupuesto" }),
      p("notificar"),
    ],
  },
  {
    id: "cobranza",
    nombre: "Recordatorio de facturas vencidas",
    descripcion: "Esther redacta un recordatorio amable y lo manda por correo y WhatsApp.",
    evento: "factura_vencida",
    pasos: () => [
      p("ia", { tarea: "Redactar mensaje" }),
      p("email", { asunto: "Recordatorio de pago" }),
      p("whatsapp"),
      p("actualizar", { accion: "Crear aviso en Notificaciones" }),
    ],
  },
  {
    id: "saldos",
    nombre: "Recordatorio de saldos pendientes",
    descripcion: "A los 15 días con saldo, se le escribe al paciente con el link para ver cómo pagar y avisar «ya pagué».",
    evento: "saldo_pendiente",
    pasos: () => [p("whatsapp"), p("actualizar", { accion: "Crear aviso en Notificaciones" })],
  },
  {
    id: "stock",
    nombre: "Reposición de insumos",
    descripcion:
      "Cuando un insumo baja del mínimo, se avisa al equipo y se envía el pedido al proveedor por webhook.",
    evento: "stock_bajo",
    pasos: () => [
      p("notificar", { canal: "Aviso interno" }),
      p("webhook", { url: "https://proveedor.ejemplo.com/pedidos" }),
    ],
  },
  {
    id: "estudio-pendiente",
    nombre: "Recordar estudios pedidos",
    descripcion:
      "Si el paciente no trajo la radiografía o tomografía en 7 días, se le recuerda por WhatsApp y se avisa al equipo.",
    evento: "estudio_pendiente",
    pasos: () => [
      p("whatsapp", {
        mensaje:
          "Hola {paciente}, te recordamos que tenés pendiente tu estudio ({dato}). Cuando lo tengas, mandanos una foto o el archivo por acá.",
      }),
      p("notificar", { canal: "Aviso interno" }),
    ],
  },
  {
    id: "laboratorio-listo",
    nombre: "Avisar que llegó el trabajo de laboratorio",
    descripcion:
      "Cuando la corona, prótesis o placa vuelve del laboratorio, se le avisa al paciente por WhatsApp para coordinar la colocación.",
    evento: "laboratorio_listo",
    pasos: () => [
      p("whatsapp", {
        mensaje:
          "Hola {paciente}, ya tenemos tu {dato} del laboratorio. Respondé este mensaje y coordinamos el turno para colocarlo.",
      }),
      p("notificar", { canal: "Aviso interno" }),
    ],
  },
  {
    id: "laboratorio-atrasado",
    nombre: "Reclamar trabajos de laboratorio atrasados",
    descripcion:
      "Si pasó la fecha de entrega y el trabajo no llegó, se le escribe al laboratorio por WhatsApp y se avisa al equipo.",
    evento: "laboratorio_atrasado",
    pasos: () => [
      p("whatsapp", {
        mensaje:
          "Hola {paciente}, te escribimos por el trabajo de {dato}. Todavía no lo recibimos: ¿nos confirmás para cuándo lo tenés? ¡Gracias!",
      }),
      p("notificar", { canal: "Aviso interno" }),
    ],
  },
  {
    id: "tratamiento-inconcluso",
    nombre: "Retomar tratamientos sin terminar",
    descripcion:
      "Si un paciente dejó un tratamiento por la mitad (30 días sin venir ni turno), se le escribe por WhatsApp para retomarlo y se avisa al equipo.",
    evento: "tratamiento_inconcluso",
    pasos: () => [
      p("whatsapp", {
        mensaje: "Hola {paciente}, ¿cómo estás? Vimos que tu {dato} quedó sin terminar. Respondé este mensaje y te damos un turno para continuarlo.",
      }),
      p("notificar", { canal: "Aviso interno" }),
    ],
  },
  {
    id: "encuesta-satisfaccion",
    nombre: "Encuesta después del turno",
    descripcion:
      "Cuando el turno queda Atendida, se le manda al paciente un enlace para puntuar la atención. Si pone 4 o 5 se lo invita a dejar su reseña en Google; si pone 1 a 3, la clínica recibe la alerta.",
    evento: "encuesta_satisfaccion",
    pasos: () => [p("whatsapp", { mensaje: "Hola {paciente}, ¡gracias por venir! ¿Nos contás cómo te atendimos? Es un toque: {dato}" })],
  },
  {
    id: "indicaciones-postoperatorias",
    nombre: "Indicaciones después del tratamiento",
    descripcion:
      "Cuando se registra una sesión de extracción, cirugía, endodoncia u otro tratamiento con cuidados, se le manda al paciente la plantilla de indicaciones que escribió tu clínica (Comunicación → Plantillas). Si no hay plantilla, no se manda nada.",
    evento: "indicaciones_postoperatorias",
    pasos: () => [p("whatsapp", { mensaje: "{dato}" })],
  },
  {
    id: "cumpleanos",
    nombre: "Saludo de cumpleaños",
    descripcion:
      "Cada mañana, a los pacientes que cumplen años se les manda tu plantilla «Feliz cumpleaños». Una vez por año y solo a quienes aceptan recibir novedades.",
    evento: "cumpleanos",
    pasos: () => [p("whatsapp", { mensaje: "{dato}" })],
  },
  {
    id: "resumen-equipo",
    nombre: "Tu día por WhatsApp",
    descripcion:
      "Cada mañana, a la hora del resumen diario (Notificaciones → Preferencias), le llega por WhatsApp a cada integrante del equipo con teléfono cargado cuántos turnos y tareas tiene. Sin nombres de pacientes.",
    evento: "resumen_equipo",
    pasos: () => [p("whatsapp", { mensaje: "{dato}" })],
  },
  {
    id: "contact-center",
    nombre: "Contact Center por WhatsApp",
    descripcion:
      "Mensaje entrante → Esther Infinity lo interpreta → agenda o deriva → Esther confirma por WhatsApp.",
    evento: "mensaje_contact_center",
    pasos: () => [
      p("ia", { tarea: "Clasificar respuesta" }),
      p("actualizar", { accion: "Registrar seguimiento" }),
      p("whatsapp", { mensaje: "Confirmación del turno" }),
    ],
  },
];

export const storeN8n = crearStorePorEmpresa<EstadoN8n>(
  () => ({
    instancia: "https://automatizacion.clinicaesther.com",
    apiKey: "",
    conectado: false,
    ultimaPrueba: "",
    flujos: [PLANTILLAS[0]!, PLANTILLAS[1]!, PLANTILLAS[4]!].map((t, i) => ({
      id: `f${i + 1}`,
      nombre: t.nombre,
      evento: t.evento,
      pasos: t.pasos(),
      activo: i < 2,
      sedes: "Todas",
      creado: new Date(Date.now() - (20 - i * 5) * 86_400_000).toISOString(),
      plantilla: t.id,
    })),
    ejecuciones: [],
    credenciales: [
      {
        id: "whatsapp",
        nombre: "WhatsApp Business",
        conectada: true,
        detalle: "Demo (se simula)",
      },
      { id: "smtp", nombre: "Correo (SMTP)", conectada: true, detalle: "Demo (se simula)" },
      { id: "gcal", nombre: "Google Calendar", conectada: false, detalle: "" },
      { id: "slack", nombre: "Slack", conectada: false, detalle: "" },
    ],
  }),
  { persistir: "n8n" },
);

export function setN8n<K extends keyof EstadoN8n>(
  clave: K,
  fn: (prev: EstadoN8n[K]) => EstadoN8n[K],
) {
  const a = storeN8n.leer();
  storeN8n.poner({ ...a, [clave]: fn(a[clave]) });
}

export const nuevoPaso = p;
