import { crearStorePorEmpresa } from "@/lib/cloud-esther/tenant-store";

/* Ubicación: src/lib/cloud-esther/n8n-store.ts
   Automatizaciones con n8n (Enterprise). Separación de responsabilidades:
   - Cloud Esther emite EVENTOS (presupuesto creado, turno próximo, factura vencida…).
   - n8n detecta el evento y ejecuta el WORKFLOW (esperas, condiciones, canales externos).
   - Los pasos "Esther IA" le piden a Cloud Esther IA que analice, redacte o clasifique.
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
  | "stock_bajo"
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
    nombre: "Paciente inactivo",
    detalle: "Sin turnos hace más de 6 meses",
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
  stock_bajo: {
    nombre: "Stock bajo",
    detalle: "Insumo por debajo del mínimo",
    modulo: "Inventario",
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
    quien: "Esther IA" | "n8n" | "Cloud Esther";
    detalle: string;
    defecto: ConfigPaso;
  }
> = {
  ia: {
    nombre: "Esther IA",
    quien: "Esther IA",
    detalle: "Analiza, redacta o clasifica con el contexto permitido",
    defecto: { tarea: "Redactar mensaje" },
  },
  esperar: { nombre: "Esperar", quien: "n8n", detalle: "Pausa el flujo", defecto: { dias: "3" } },
  condicion: {
    nombre: "Condición",
    quien: "n8n",
    detalle: "Sigue solo si se cumple",
    defecto: { regla: "Sin respuesta del paciente" },
  },
  whatsapp: {
    nombre: "Enviar WhatsApp",
    quien: "n8n",
    detalle: "WhatsApp Business",
    defecto: { mensaje: "Mensaje redactado por Esther IA" },
  },
  email: {
    nombre: "Enviar correo",
    quien: "n8n",
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
    quien: "n8n",
    detalle: "Llama a otro servicio",
    defecto: { url: "https://hooks.ejemplo.com/cloud-esther" },
  },
  notificar: {
    nombre: "Notificar al equipo",
    quien: "n8n",
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
  "Prioridad alta según Esther IA",
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
  estado: "Completada" | "En espera" | "Detenida" | "Error";
  pasos: PasoEjecutado[];
  modo: "Prueba" | "Automática";
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
      "Si el paciente no responde en 3 días, Esther redacta un mensaje personalizado y n8n lo envía por WhatsApp.",
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
    descripcion: "Esther redacta un recordatorio amable y n8n lo manda por correo y WhatsApp.",
    evento: "factura_vencida",
    pasos: () => [
      p("ia", { tarea: "Redactar mensaje" }),
      p("email", { asunto: "Recordatorio de pago" }),
      p("whatsapp"),
      p("actualizar", { accion: "Crear aviso en Notificaciones" }),
    ],
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
    id: "contact-center",
    nombre: "Contact Center por WhatsApp",
    descripcion:
      "Mensaje entrante → Esther IA lo interpreta → agenda o deriva → n8n confirma por WhatsApp.",
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
    instancia: "https://n8n.clinicaesther.com",
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
        detalle: "+54 9 11 4455-1200",
      },
      { id: "smtp", nombre: "Correo (SMTP)", conectada: true, detalle: "turnos@clinicaesther.com" },
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
