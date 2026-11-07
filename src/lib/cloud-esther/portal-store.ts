import { crearStorePorEmpresa, claveTenant } from "@/lib/cloud-esther/tenant-store";

/* Ubicación: src/lib/cloud-esther/portal-store.ts

   Portal del paciente, separado por empresa:
   - accesos: qué pacientes pueden entrar (código de acceso, estado, último ingreso).
   - eventos: todo lo que hacen los pacientes en el portal (lo monitorea el dueño).
   - documentación que la clínica les pide y ellos suben.
   TODO backend: login del paciente con magic link / código por correo o WhatsApp,
   tokens por pacienteId + clinicId, y auditoría en la base. */

export type EstadoAcceso = "Invitado" | "Activo" | "Revocado";
export type AccesoPortal = {
  estado: EstadoAcceso;
  codigo: string;
  invitado: string; // ISO
  ultimoIngreso?: string; // ISO
  ingresos: number;
  /** Contraseña propia que creó el paciente (solo huella SHA-256 con sal; nunca el texto).
      Si la clínica le da un «Nuevo código», la contraseña se borra (blanqueo). */
  clave?: { sal: string; huella: string; fecha: string };
};

/** Huella de la contraseña del paciente (SHA-256 de sal + contraseña). */
export async function huellaClavePortal(sal: string, clave: string) {
  const datos = new TextEncoder().encode(`${sal}:${clave}`);
  const h = await crypto.subtle.digest("SHA-256", datos);
  return Array.from(new Uint8Array(h), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Crea la huella de una contraseña nueva (con sal al azar). */
export async function nuevaClavePortal(clave: string) {
  const sal = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");
  return { sal, huella: await huellaClavePortal(sal, clave), fecha: new Date().toISOString() };
}

/** ¿Lo que escribió el paciente es su código o su contraseña? */
export async function credencialPortalValida(a: AccesoPortal, escrito: string) {
  const t = escrito.trim();
  if (!t) return false;
  if (t === a.codigo) return true;
  return !!a.clave && (await huellaClavePortal(a.clave.sal, escrito)) === a.clave.huella;
}

/** Reglas de una contraseña segura: 8+ caracteres, con letras y números. */
export function problemaClavePortal(clave: string) {
  if (clave.length < 8) return "Usá al menos 8 caracteres.";
  if (!/[a-zA-Z]/.test(clave) || !/\d/.test(clave)) return "Combiná letras y números.";
  return "";
}

export type TipoEventoPortal =
  | "Ingreso"
  | "Turno pedido"
  | "Turno confirmado"
  | "Turno cambiado"
  | "Turno cancelado"
  | "Presupuesto aprobado"
  | "Presupuesto rechazado"
  | "Pago online"
  | "Documento subido"
  | "Mensaje"
  | "Datos actualizados"
  | "Contraseña cambiada";

export type EventoPortal = {
  id: string;
  fecha: string;
  pacienteId: number;
  tipo: TipoEventoPortal;
  detalle: string;
};

export type EstadoDoc = "Pendiente" | "En revisión" | "Aprobada" | "Rechazada";
export type DocSolicitada = {
  id: string;
  titulo: string;
  descripcion: string;
  obligatorio: boolean;
  estado: EstadoDoc;
  archivo?: string;
  observacion?: string;
};

export const DOCS_BASE: DocSolicitada[] = [
  {
    id: "dni",
    titulo: "DNI (frente y dorso)",
    descripcion: "Foto o PDF legible de ambos lados.",
    obligatorio: true,
    estado: "Pendiente",
  },
  {
    id: "credencial",
    titulo: "Credencial de obra social",
    descripcion: "Necesaria para facturar las prestaciones a tu cobertura.",
    obligatorio: true,
    estado: "Pendiente",
  },
  {
    id: "consentimiento",
    titulo: "Consentimiento informado firmado",
    descripcion: "Descargalo, firmalo y subilo escaneado.",
    obligatorio: true,
    estado: "Pendiente",
  },
  {
    id: "estudios",
    titulo: "Estudios previos",
    descripcion: "Radiografías o tomografías que tengas de otras consultas.",
    obligatorio: false,
    estado: "Pendiente",
  },
];

export type ConfigPortal = {
  turnosOnline: boolean;
  pagosOnline: boolean;
  presupuestosOnline: boolean;
  mensajes: boolean;
  horasMinimasCancelar: number;
  bienvenida: string;
  /** Qué secciones ve el paciente (las que faltan se consideran visibles) */
  secciones?: Partial<Record<SeccionPortalPaciente, boolean>>;
  /** «automatico»: lo que carga la clínica aparece solo; «aprobacion»: hay que enviarlo al portal */
  envio?: "automatico" | "aprobacion";
  /** Roles que, además del Administrador, pueden enviar cosas al portal */
  publican?: string[];
  /** Personas de confianza (por correo, en minúsculas) que pueden enviar aunque su rol no pueda */
  publicanPersonas?: string[];
};

/** ¿Esta persona puede enviar al portal? Administrador siempre; si no, por su rol o por su correo. */
export function puedePublicarPortal(
  config: Pick<ConfigPortal, "publican" | "publicanPersonas">,
  rol: string,
  email?: string | null,
) {
  if (rol === "admin" || rol === "administrador") return true;
  if ((config.publican ?? []).includes(rol)) return true;
  const e = (email ?? "").trim().toLowerCase();
  return !!e && (config.publicanPersonas ?? []).includes(e);
}

/** Secciones del portal que el Administrador puede mostrar u ocultar */
export type SeccionPortalPaciente =
  | "turnos"
  | "tratamientos"
  | "documentos"
  | "historial"
  | "autorizaciones"
  | "documentacion"
  | "cuenta"
  | "pagos"
  | "mensajes";

/** Lo que se envía al portal con aprobación: «pacienteId:tipo:id» → quién y cuándo */
export type TipoPublicable = "receta" | "estudio" | "presupuesto" | "documento";
export type Publicacion = { por: string; fecha: string };
export const clavePublicacion = (pacienteId: number, tipo: TipoPublicable, id: number | string) =>
  `${pacienteId}:${tipo}:${id}`;

type EstadoPortal = {
  config: ConfigPortal;
  accesos: Record<number, AccesoPortal>;
  eventos: EventoPortal[];
  docs: Record<number, DocSolicitada[]>;
  /** Envíos al portal aprobados (modo «con aprobación») */
  publicados?: Record<string, Publicacion>;
};


export function nuevoCodigo() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/** Estado vacío del portal: sin pacientes, sin eventos, sin documentos.
   El demo arranca igual que una clínica real (vacío y con aprobación). */
function estadoVacioPortal(): EstadoPortal {
  return {
    config: {
      turnosOnline: true,
      pagosOnline: true,
      presupuestosOnline: true,
      mensajes: true,
      horasMinimasCancelar: 24,
      bienvenida: "",
      envio: "aprobacion",
    },
    accesos: {},
    eventos: [],
    docs: {},
    publicados: {},
  };
}

export const storePortal = crearStorePorEmpresa<EstadoPortal>(estadoVacioPortal, {

  persistir: "portal",
  // Clínica real: arranca vacía y CON APROBACIÓN (nada le llega al paciente hasta que el
  // Administrador, o quien él autorice, lo envía al portal)
  vacio: estadoVacioPortal,
});

export function setPortal<K extends keyof EstadoPortal>(
  clave: K,
  fn: (prev: EstadoPortal[K]) => EstadoPortal[K],
) {
  const actual = storePortal.leer();
  storePortal.poner({ ...actual, [clave]: fn(actual[clave]) });
}

export function registrarEventoPortal(pacienteId: number, tipo: TipoEventoPortal, detalle: string) {
  setPortal("eventos", (prev) => [
    {
      id: `${Date.now()}-${Math.random()}`,
      fecha: new Date().toISOString(),
      pacienteId,
      tipo,
      detalle,
    },
    ...prev,
  ]);
}

export function docsDe(docs: Record<number, DocSolicitada[]>, pacienteId: number) {
  return docs[pacienteId] ?? DOCS_BASE;
}

/* Sesión del paciente en el portal (por empresa, se mantiene al recargar la pestaña). */
const CLAVE_SESION = "cloud-esther:portal:sesion";

export function leerSesionPortal(): number | null {
  try {
    const v = sessionStorage.getItem(claveTenant(CLAVE_SESION));
    return v ? Number(v) : null;
  } catch {
    return null;
  }
}

export function guardarSesionPortal(pacienteId: number | null) {
  try {
    if (pacienteId === null) sessionStorage.removeItem(claveTenant(CLAVE_SESION));
    else sessionStorage.setItem(claveTenant(CLAVE_SESION), String(pacienteId));
  } catch {
    /* sin almacenamiento disponible */
  }
}
