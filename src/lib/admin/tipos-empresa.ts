/* Ubicación: src/lib/admin/tipos-empresa.ts
   Módulos internos para administrar la empresa Cloud Esther (no las clínicas clientes):
   personal, asistencia, ausencias, documentación, nómina, pagos, anticipos, gastos,
   proveedores, contratos, soporte técnico, incidentes, tareas, notificaciones y auditoría
   del panel. Son los mismos objetos que devolverá el backend. */

/* ───────────── Personal ───────────── */

export type Empleado = {
  id: string;
  nombre: string;
  documento: string;
  cargo: string;
  area: "Dirección" | "Desarrollo" | "Soporte" | "Comercial" | "Administración" | "Otra";
  ingreso: string; // día ISO
  contratacion: "Relación de dependencia" | "Monotributo / factura" | "Freelance" | "Pasantía";
  /** Sueldo base mensual (dato sensible: solo Dueño y Socio). */
  sueldoBase: number;
  moneda: "ARS" | "USD" | "UYU" | "CLP";
  jornadaHoras: number; // horas semanales
  horario: string; // ej. «Lun a Vie 9 a 18»
  estado: "Activo" | "Licencia" | "Baja";
  email: string;
  telefono: string;
};

export type Asistencia = {
  id: string;
  empleadoId: string;
  fecha: string; // día ISO
  entrada: string; // HH:MM
  salida: string; // HH:MM ("" si todavía no salió)
  horasExtra: number;
  tipo: "Presente" | "Llegada tarde" | "Ausente" | "Ausente justificado";
  observaciones: string;
};

export type Ausencia = {
  id: string;
  empleadoId: string;
  tipo: "Vacaciones" | "Licencia médica" | "Licencia por estudio" | "Licencia personal" | "Otra";
  desde: string;
  hasta: string;
  estado: "Solicitada" | "Aprobada" | "Rechazada";
  observaciones: string;
};

export type DocumentoInterno = {
  id: string;
  titulo: string;
  categoria:
    | "Contrato laboral"
    | "Recibo de sueldo"
    | "Legajo"
    | "Política interna"
    | "Contrato comercial"
    | "Otro";
  empleadoId: string | null;
  fecha: string;
  vence: string | null;
  /** El archivo se sube al backend; acá solo se guarda el nombre. */
  archivo: string;
};

/* ───────────── Nómina y pagos ───────────── */

export type ConceptoNomina = {
  id: string;
  nombre: string;
  tipo: "Haber" | "Descuento";
  importe: number;
};

export type Liquidacion = {
  id: string;
  empleadoId: string;
  periodo: string; // AAAA-MM
  jurisdiccion: string; // país / régimen configurable
  conceptos: ConceptoNomina[];
  estado: "Borrador" | "Aprobada";
  creada: string;
};

export type PagoNomina = {
  id: string;
  liquidacionId: string;
  empleadoId: string;
  periodo: string;
  importe: number;
  fecha: string;
  metodo: "Transferencia" | "Efectivo" | "Cheque" | "Otro";
  referencia: string;
  observaciones: string;
};

export type Anticipo = {
  id: string;
  empleadoId: string;
  periodo: string; // período en que se descuenta
  importe: number;
  fecha: string;
  observaciones: string;
};

/* ───────────── Gastos, proveedores y contratos ───────────── */

export type Proveedor = {
  id: string;
  nombre: string;
  rubro: string;
  contacto: string;
  email: string;
  telefono: string;
};

export type Gasto = {
  id: string;
  fecha: string;
  categoria:
    | "Infraestructura y servidores"
    | "Software y licencias"
    | "Marketing"
    | "Oficina"
    | "Servicios profesionales"
    | "Impuestos"
    | "Otro";
  descripcion: string;
  proveedorId: string | null;
  importe: number;
  moneda: "ARS" | "USD";
  comprobante: string;
  estado: "Pendiente" | "Pagado";
};

export type Contrato = {
  id: string;
  titulo: string;
  contraparte: string;
  tipo: "Proveedor" | "Cliente" | "Laboral" | "Otro";
  inicio: string;
  fin: string | null;
  importe: number | null;
  estado: "Vigente" | "Por renovar" | "Finalizado";
};

/* ───────────── Soporte técnico, incidentes y tareas ───────────── */

export type EstadoTicket =
  "Nuevo" | "En revisión" | "En progreso" | "En espera" | "Resuelto" | "Cerrado";

export type TicketSoporte = {
  id: string;
  asunto: string;
  descripcion: string;
  clinica: string; // «Interno» si no es de una clínica
  categoria:
    "Acceso" | "Facturación" | "Error del sistema" | "Consulta" | "Mejora" | "Integraciones";
  prioridad: "Alta" | "Media" | "Baja";
  estado: EstadoTicket;
  responsable: string | null;
  abierto: string; // ISO
  resuelto: string | null; // ISO
  notasInternas: { fecha: string; autor: string; texto: string }[];
  historial: { fecha: string; autor: string; cambio: string }[];
};

export type Incidente = {
  id: string;
  titulo: string;
  impacto: "Crítico" | "Alto" | "Medio" | "Bajo";
  estado: "Abierto" | "Mitigado" | "Resuelto";
  inicio: string;
  fin: string | null;
  descripcion: string;
};

export type TareaInterna = {
  id: string;
  titulo: string;
  responsable: string | null;
  vence: string | null;
  estado: "Pendiente" | "En curso" | "Hecha";
};

/* ───────────── Notificaciones y auditoría del panel ───────────── */

export type CategoriaNotificacion =
  "Clínicas" | "Suscripciones" | "Pagos" | "Comercial" | "Soporte" | "Seguridad" | "Sistema";

export type Notificacion = {
  id: string;
  fecha: string;
  categoria: CategoriaNotificacion;
  prioridad: "Alta" | "Media" | "Baja";
  titulo: string;
  detalle: string;
  enlace: string | null;
  leida: boolean;
  archivada: boolean;
};

export type SesionPanel = {
  id: string;
  usuario: string;
  email: string;
  rol: string;
  inicio: string;
  ultimaActividad: string;
  fin: string | null;
  cierre: "Manual" | "Inactividad" | null;
  dispositivo: string;
  navegador: string;
  /** Dirección IP: la completa el backend (el navegador no la conoce). */
  ip?: string | null;
  /** Secciones del panel visitadas durante la sesión (módulo utilizado). */
  secciones?: string[];
};

export type IntentoFallido = {
  id: string;
  fecha: string;
  email: string;
  motivo: string;
  dispositivo: string;
  navegador: string;
};

/* ───────────── Países donde opera Cloud Esther ───────────── */

export type EstadoPais = "Activo" | "Próximamente" | "Pausado";

/** País habilitado para vender Cloud Esther: moneda, facturación e impuestos de cada uno. */
export type PaisOperacion = {
  id: string;
  /** Código ISO de dos letras (AR, UY, CL…). */
  codigo: string;
  nombre: string;
  estado: EstadoPais;
  moneda: string;
  /** Organismo o sistema de facturación electrónica del país. */
  facturacion: string;
  impuesto: string;
  zonaHoraria: string;
  /** Fecha en que se habilitó la venta (ISO, día) o vacío si todavía no. */
  desde: string;
  notas: string;
};
