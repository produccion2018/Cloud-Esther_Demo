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
};

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
  | "Datos actualizados";

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
};

type EstadoPortal = {
  config: ConfigPortal;
  accesos: Record<number, AccesoPortal>;
  eventos: EventoPortal[];
  docs: Record<number, DocSolicitada[]>;
};

function hace(horas: number) {
  return new Date(Date.now() - horas * 3_600_000).toISOString();
}

export function nuevoCodigo() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export const storePortal = crearStorePorEmpresa<EstadoPortal>(() => ({
  config: {
    turnosOnline: true,
    pagosOnline: true,
    presupuestosOnline: true,
    mensajes: true,
    horasMinimasCancelar: 24,
    bienvenida: "",
  },
  accesos: {
    1: {
      estado: "Activo",
      codigo: "482913",
      invitado: hace(24 * 40),
      ultimoIngreso: hace(26),
      ingresos: 7,
    },
    2: { estado: "Invitado", codigo: "735104", invitado: hace(30), ingresos: 0 },
    3: {
      estado: "Activo",
      codigo: "219846",
      invitado: hace(24 * 20),
      ultimoIngreso: hace(5),
      ingresos: 3,
    },
    4: {
      estado: "Activo",
      codigo: "660172",
      invitado: hace(24 * 12),
      ultimoIngreso: hace(24 * 4),
      ingresos: 2,
    },
  },
  eventos: [
    { id: "e1", fecha: hace(26), pacienteId: 1, tipo: "Ingreso", detalle: "Entró al portal" },
    {
      id: "e2",
      fecha: hace(25.8),
      pacienteId: 1,
      tipo: "Documento subido",
      detalle: "DNI (frente y dorso)",
    },
    { id: "e3", fecha: hace(5), pacienteId: 3, tipo: "Ingreso", detalle: "Entró al portal" },
    {
      id: "e4",
      fecha: hace(4.9),
      pacienteId: 3,
      tipo: "Documento subido",
      detalle: "Credencial de obra social",
    },
    { id: "e5", fecha: hace(24 * 4), pacienteId: 4, tipo: "Ingreso", detalle: "Entró al portal" },
    {
      id: "e6",
      fecha: hace(24 * 4 - 0.2),
      pacienteId: 4,
      tipo: "Pago online",
      detalle: "$ 25.000 con tarjeta de débito",
    },
  ],
  docs: {
    1: DOCS_BASE.map((d) =>
      d.id === "dni" ? { ...d, estado: "Aprobada" as const, archivo: "dni-mauro.pdf" } : d,
    ),
    3: DOCS_BASE.map((d) =>
      d.id === "credencial"
        ? { ...d, estado: "En revisión" as const, archivo: "credencial-osde-julian.jpg" }
        : d,
    ),
  },
}), { persistir: "portal" });

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
