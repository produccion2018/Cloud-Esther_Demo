import { crearStorePorEmpresa, claveTenant } from "@/lib/cloud-esther/tenant-store";

/* Ubicación: src/lib/cloud-esther/portal-equipo-store.ts

   Portal del equipo (odontólogos, secretarias, asistentes y administración), por empresa:
   accesos con código, fichajes de entrada/salida, checklist diario del gabinete y actividad.
   El dueño lo monitorea desde Equipo → Portal del equipo.
   TODO backend: login del equipo con el usuario real (JWT con clinicId + rol + permisos). */

export type AccesoEquipo = {
  codigo: string;
  estado: "Activo" | "Revocado";
  ultimoIngreso?: string;
  ingresos: number;
};
export type Fichaje = {
  id: string;
  miembroId: string;
  fecha: string;
  entrada: string;
  salida?: string;
};
export type EventoEquipo = {
  id: string;
  fecha: string;
  miembroId: string;
  accion: string;
  detalle: string;
};

export const CHECKLIST_GABINETE = [
  "Esterilizar instrumental del turno",
  "Reponer guantes, barbijos y baberos",
  "Desinfectar sillón y superficies",
  "Preparar bandeja del primer paciente",
  "Revisar autoclave y registrar ciclo",
  "Controlar anestesia y descartables",
];

type Estado = {
  accesos: Record<string, AccesoEquipo>;
  fichajes: Fichaje[];
  checklist: Record<string, string[]>; // `${miembroId}:${fecha}` -> tareas hechas
  eventos: EventoEquipo[];
};

function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Código de 6 dígitos fijo por integrante (para practicar sin tener que anotarlo). */
export function codigoInicial(miembroId: string) {
  let h = 0;
  for (const c of miembroId) h = (h * 31 + c.charCodeAt(0)) % 900000;
  return String(100000 + ((h * 7919 + 424242) % 900000));
}

export const storeEquipoPortal = crearStorePorEmpresa<Estado>(
  () => ({
    accesos: {
      "1": {
        codigo: codigoInicial("1"),
        estado: "Activo",
        ultimoIngreso: new Date(Date.now() - 3 * 3_600_000).toISOString(),
        ingresos: 18,
      },
      "3": {
        codigo: codigoInicial("3"),
        estado: "Activo",
        ultimoIngreso: new Date(Date.now() - 5 * 3_600_000).toISOString(),
        ingresos: 11,
      },
      "8": {
        codigo: codigoInicial("8"),
        estado: "Activo",
        ultimoIngreso: new Date(Date.now() - 1 * 3_600_000).toISOString(),
        ingresos: 9,
      },
      "4": {
        codigo: codigoInicial("4"),
        estado: "Activo",
        ultimoIngreso: new Date(Date.now() - 2 * 3_600_000).toISOString(),
        ingresos: 25,
      },
    },
    fichajes: [
      { id: "f0", miembroId: "8", fecha: hoyISO(), entrada: "08:52" },
      { id: "f1", miembroId: "4", fecha: hoyISO(), entrada: "07:56" },
      { id: "f2", miembroId: "1", fecha: hoyISO(), entrada: "07:58" },
    ],
    checklist: {},
    eventos: [],
  }),
  { persistir: "portal-equipo" },
);

export function setEquipoPortal<K extends keyof Estado>(
  clave: K,
  fn: (prev: Estado[K]) => Estado[K],
) {
  const actual = storeEquipoPortal.leer();
  storeEquipoPortal.poner({ ...actual, [clave]: fn(actual[clave]) });
}

export function registrarEventoEquipo(miembroId: string, accion: string, detalle: string) {
  setEquipoPortal("eventos", (prev) =>
    [
      {
        id: `${Date.now()}-${Math.random()}`,
        fecha: new Date().toISOString(),
        miembroId,
        accion,
        detalle,
      },
      ...prev,
    ].slice(0, 300),
  );
}

/** Acceso del integrante; si no tiene y está activo, se crea con su código inicial. */
export function asegurarAcceso(miembroId: string): AccesoEquipo {
  const actual = storeEquipoPortal.leer().accesos[miembroId];
  if (actual) return actual;
  const nuevo: AccesoEquipo = { codigo: codigoInicial(miembroId), estado: "Activo", ingresos: 0 };
  setEquipoPortal("accesos", (prev) => ({ ...prev, [miembroId]: nuevo }));
  return nuevo;
}

const CLAVE_SESION = "cloud-esther:portal-equipo:sesion";
export function leerSesionEquipo(): string | null {
  try {
    return sessionStorage.getItem(claveTenant(CLAVE_SESION));
  } catch {
    return null;
  }
}
export function guardarSesionEquipo(id: string | null) {
  try {
    if (id === null) sessionStorage.removeItem(claveTenant(CLAVE_SESION));
    else sessionStorage.setItem(claveTenant(CLAVE_SESION), id);
  } catch {
    /* sin almacenamiento */
  }
}
