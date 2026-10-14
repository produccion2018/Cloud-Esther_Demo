/* Ubicación: src/lib/admin/tipos.ts
   Modelo de datos del panel de administración de Cloud Esther.
   Son los mismos objetos que va a devolver el backend (ver CONTRATO en src/lib/admin/api.ts). */

/* ───────────── Equipo interno (quién entra al panel) ───────────── */

/** owner = Dueño · partner = Socio · support = Soporte técnico / Desarrollo ·
 *  customer-care = Asistente / Secretaría. */
export type AdminRole = "owner" | "partner" | "support" | "customer-care";

/** Permisos que se eligen persona por persona en «Equipo y accesos» (el servidor los valida). */
export type Permiso =
  | "demos"
  | "contrataciones"
  | "cobranza"
  | "importes"
  | "atencion"
  | "soporte"
  | "personal"
  | "nomina"
  | "gastos"
  | "paises"
  | "ia"
  | "reportes"
  | "auditoria"
  | "actividad"
  | "marketing";

export type AdminUser = {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  rol: AdminRole;
  /** Permisos que tiene (Dueño y Socio: todos). Lo manda el servidor. */
  permisos?: Permiso[];
  activo: boolean;
  ultimoAcceso: string | null; // ISO
  creado: string; // ISO
};

export type SesionAdmin = {
  usuario: AdminUser;
  /** Token del backend (JWT). En modo sin backend es un identificador local. */
  token: string;
  inicio: string; // ISO
};

/* ───────────── Planes (lo mismo que ven las clínicas) ───────────── */

export type PlanId = "inicial" | "profesional" | "avanzada" | "grupo";

export type PlanConfig = {
  id: PlanId;
  nombre: "Start" | "Pro" | "Plus" | "Enterprise";
  /** null = todavía sin definir (en la web se ve «US$ —»). */
  precioMensual: number | null;
  /** MONTO INICIAL del plan en US$: se cobra UNA SOLA VEZ al contratar (alta / implementación).
   *  null = sin definir. Lo administra el dueño (backend: PUT /admin/planes/:id). */
  precioInicial?: number | null;
  /** 0,15 = 15 % de descuento pagando anual. */
  descuentoAnual: number;
  /** Límites del plan. Infinity = SIN LÍMITE (el backend lo manda como null). */
  sucursales: number;
  usuariosInternos: number;
  pacientesActivos: number;
  /** Regla fija del producto: Start/Pro → 2D · Plus/Enterprise → 3D. No se edita. */
  odontograma: "2D" | "3D";
};

/** Lo que se manda al guardar un plan. En los límites, null = sin límite. */
export type CambiosPlan = {
  precioMensual?: number | null;
  precioInicial?: number | null;
  descuentoAnual?: number;
  sucursales?: number | null;
  usuariosInternos?: number | null;
  pacientesActivos?: number | null;
};

/* ───────────── Clínicas clientes ───────────── */

export type EstadoPago = "al-dia" | "pendiente" | "mora" | "suspendida";

export type Clinica = {
  id: string;
  nombre: string;
  ciudad: string;
  pais: string;
  plan: PlanId;
  ciclo: "Mensual" | "Anual";
  /** MONTO MENSUAL en US$: importe recurrente de esta clínica (null = sin definir; lo carga el
   *  backend/admin). Si falta, se toma el precio mensual del plan. */
  importe: number | null;
  /** MONTO INICIAL en US$: lo que paga la clínica al comenzar (implementación/alta).
   *  null = sin definir; lo carga el backend/admin. Nunca se inventa. */
  montoInicial?: number | null;
  estadoPago: EstadoPago;
  proximoCobro: string; // ISO (día)
  clienteDesde: string; // ISO (día)
  contacto: { nombre: string; email: string; telefono: string };
  uso: {
    sucursales: number;
    usuariosInternos: number;
    pacientesActivos: number;
    pacientesArchivados: number;
    minutosIA: number;
  };
  ultimoAcceso: string | null; // ISO
  /** Dirección web de la clínica (cloudesther.com/<slug>). Solo con backend. */
  slug?: string;
  /** Solicitud de contratación con la que se activó (si vino de la web). */
  contratacionId?: string | null;
};

/* ───────────── Contrataciones (formulario «Contratar servicio») ─────────────
   Es DISTINTO del demo: la clínica pide contratar. Llega al panel; la ven Dueño, Socio y
   Secretaría. Después de revisar y cobrar, el Dueño o el Socio aprietan «Activar». */

export type EstadoContratacion = "pendiente" | "activada" | "rechazada";

export type Contratacion = {
  id: string;
  /** Número para hablar con el cliente: CT-1A2B3C */
  codigo: string;
  fecha: string; // ISO
  estado: EstadoContratacion;
  clinica: string;
  pais: string;
  paisNombre: string;
  ciudad: string;
  contacto: { nombre: string; email: string; telefono: string };
  plan: PlanId;
  ciclo: "Mensual" | "Anual";
  modulos: string[];
  sucursales: string;
  profesionales: string;
  comentarios: string;
  /** Notas internas del equipo */
  notas: string;
  /** Si el mismo correo probó el demo */
  demo: { id: string; verificado: boolean; ingresosUsados: number } | null;
  clinicaId: string | null;
  resueltaEl: string | null; // ISO
  resueltaPor: string | null;
  /** Referencia del pago (activada) o motivo (rechazada) */
  nota: string;
  /** Pago en línea (Paddle): sin_iniciar · iniciado · pagado · fallido */
  pagoEnLinea?: "sin_iniciar" | "iniciado" | "pagado" | "fallido";
  /** Historial de notas del equipo (la más nueva primero). Las tareas sin hacer se ven en rojo. */
  historial?: NotaContratacion[];
  /** Cuántas tareas faltan hacer */
  tareasPendientes?: number;
};

export type NotaContratacion = {
  id: string;
  texto: string;
  autor: string;
  fecha: string;
  tarea: boolean;
  hecha: boolean;
  hechaPor: string | null;
  hechaEl: string | null;
};

/* ───────────── Facturación en línea (Paddle) — solo Dueño y Socio ───────────── */

export type Facturacion = {
  pagosEnLinea: boolean;
  suscripciones: {
    id: string;
    paddleId: string;
    clinica: string;
    plan: PlanId | null;
    ciclo: "Mensual" | "Anual";
    /** pendiente · activa · gracia · pago_rechazado · vencida · suspendida · cancelada */
    estado: string;
    proximoCobro: string | null;
    periodoHasta: string | null;
    canceladaEl: string | null;
  }[];
  pagos: {
    id: string;
    paddleId: string;
    clinica: string;
    /** alta · renovacion · otro */
    tipo: string;
    /** pagado · fallido · vencido */
    estado: string;
    moneda: string;
    sinImpuestos: number;
    impuestos: number;
    total: number;
    pais: string | null;
    comprobante: string | null;
    fecha: string;
  }[];
  ajustes: {
    id: string;
    paddleId: string;
    cobro: string;
    tipo: string;
    estado: string;
    moneda: string;
    impuestos: number;
    total: number;
    motivo: string;
    fecha: string;
  }[];
};

/* ───────────── Demos (espejo de lo que hacen en el demo) ───────────── */

export type EstadoDemo = "En curso" | "Sin actividad" | "Contactada" | "Convertida" | "Descartada";

export type IngresoDemo = {
  id: string;
  inicio: string; // ISO
  minutos: number;
  /** Cómo terminó: la persona salió, o se cerró a los 30 minutos. */
  cierre: "Salió" | "Expiró" | "En curso";
  modulos: string[];
  planes: string[];
};

export type CuentaDemo = {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  clinica: string;
  pais: string;
  planElegido: string;
  registrado: string; // ISO
  ingresos: IngresoDemo[];
  estado: EstadoDemo;
  notas: string;
  /** Persona del equipo que hace el seguimiento. */
  responsable: string | null;
  /** Pedidos hechos desde el demo (al terminar el tiempo o desde los botones). */
  solicitudes?: {
    fecha: string;
    tipo: "Información comercial" | "Contratación" | "Más tiempo" | "Más ingresos";
    /** Con servidor: */
    id?: string;
    mensaje?: string;
    atendida?: boolean;
    /** pendiente · autorizada · denegada · atendida */
    estado?: string;
    nota?: string;
  }[];
  /* ── Reloj del demo (solo con servidor: lo calcula el backend) ── */
  responsableId?: string | null;
  inicio?: string; // ISO
  venceEl?: string; // ISO
  restanteSegundos?: number;
  vencido?: boolean;
  ultimoAcceso?: string | null;
  pedidosPendientes?: number;
  /* ── Ingresos (5 + autorizados) y verificación del correo (con servidor) ── */
  ingresosUsados?: number;
  ingresosPermitidos?: number;
  verificado?: boolean;
  /** Otros demos registrados desde la misma conexión (señal, no prueba) */
  mismaConexion?: number;
  autorizaciones?: AutorizacionDemo[];
};

/** Ingresos extra autorizados a un demo (se pueden revocar). */
export type AutorizacionDemo = {
  id: string;
  fecha: string;
  quien: string;
  cantidad: number;
  motivo: string;
  pedidoId: string | null;
  revocada: boolean;
  revocadaEl: string | null;
  revocadaPor: string | null;
  motivoRevocacion: string | null;
};

/** Un cambio en el reloj de un demo (historial). */
export type CambioTiempoDemo = {
  id: string;
  fecha: string; // ISO
  quien: string;
  /** inicial = al registrarse · sumar = le dieron X más · dejar = que le queden X */
  modo: "inicial" | "sumar" | "dejar";
  minutos: number;
  venciaAntes: string | null;
  venceDespues: string;
  motivo: string;
};

/** Límites del período de prueba. Los maneja el dueño; el SaaS los lee de GET /demo/config. */
export type ConfigDemo = {
  limiteActivo: boolean;
  minutos: number;
  esperaMinutos: number;
  avisoMinutos: number;
  /** Correos de cuentas de demo sin límite de tiempo. */
  exentos: string[];
};

/* ───────────── Operación ───────────── */

export type EventoActividad = {
  id: string;
  fecha: string; // ISO
  actor: string;
  accion: string;
  tipo: "acceso" | "pago" | "demo" | "plan" | "equipo" | "sistema";
};

export type ConsumoIAMensual = { mes: string; minutos: number };
