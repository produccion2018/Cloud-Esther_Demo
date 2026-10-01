import { crearStorePorEmpresa } from "@/lib/cloud-esther/tenant-store";

/* Ubicación sugerida: src/lib/cloud-esther/pacientes.ts

   Los pacientes viven a nivel módulo para que se compartan entre la página de Pacientes y las
   páginas de acceso directo del sidebar (Historia, Recetas, Estudios…).
   TODO backend: reemplazar este store por las consultas a la API (GET /pacientes, etc.). */

/** «Archivado»: se conserva con su Historia Clínica y se puede consultar, pero no cuenta para
    el límite de pacientes activos del plan. */
export type EstadoPaciente = "Activo" | "Inactivo" | "Archivado";

/** Pacientes que consumen el límite del plan (los inactivos y archivados no cuentan). */
export function contarPacientesActivos(lista: { estado: EstadoPaciente }[]) {
  return lista.filter((p) => p.estado === "Activo").length;
}

export type Paciente = {
  id: number;
  nombre: string;
  apellido: string;
  documento: string; // solo dígitos
  fechaNacimiento: string;
  genero: string;
  email: string;
  telefono: string;
  sucursal: string;
  obraSocial: string;
  afiliado: string;
  direccion: string;
  nota: string;
  estado: EstadoPaciente;
  foto: string | null;
};

// Dato de ejemplo (borrar al conectar el backend)
export const PACIENTE_EJEMPLO: Paciente = {
  id: 1,
  nombre: "Mauro",
  apellido: "Pinto",
  documento: "95193944",
  fechaNacimiento: "1988-04-12",
  genero: "Masculino",
  email: "mauro.pinto@example.com",
  telefono: "+54 11 5555-8899",
  sucursal: "Clínica Centro",
  obraSocial: "OSDE",
  afiliado: "OS-45892177",
  direccion: "",
  nota: "",
  estado: "Activo",
  foto: null,
};

/* Más pacientes de ejemplo para practicar: son los mismos que aparecen en la Agenda. */
const EJEMPLOS: [string, string, string, string, string, string, string, EstadoPaciente][] = [
  ["Marina", "Delgado", "30111222", "1990-06-03", "Femenino", "Swiss Medical", "Clínica Centro", "Activo"],
  ["Julián", "Ortega", "28444555", "1985-11-20", "Masculino", "OSDE", "Clínica Centro", "Activo"],
  ["Lucía", "Paz", "35666777", "1994-02-14", "Femenino", "Galeno", "Clínica Norte", "Activo"],
  ["Ramiro", "Sosa", "26888999", "1979-09-08", "Masculino", "No aplica / particular", "Clínica Centro", "Activo"],
  ["Paula", "Medina", "33222111", "1992-12-01", "Femenino", "Medicus", "Clínica Centro", "Activo"],
  ["Sergio", "Luna", "31555444", "1989-03-27", "Masculino", "IOMA", "Clínica Norte", "Activo"],
  ["Ana", "Torres", "40123456", "1998-07-19", "Femenino", "OSDE", "Clínica Sur", "Activo"],
  ["Diego", "Ruiz", "27999888", "1981-05-05", "Masculino", "PAMI", "Clínica Centro", "Activo"],
  ["Valeria", "Gómez", "36777666", "1995-10-30", "Femenino", "Swiss Medical", "Clínica Norte", "Activo"],
  ["Carlos", "Méndez", "22333444", "1970-01-15", "Masculino", "PAMI", "Clínica Centro", "Inactivo"],
  ["Florencia", "Díaz", "38444333", "1996-08-22", "Femenino", "Galeno", "Clínica Sur", "Activo"],
];

const PACIENTES_EJEMPLO: Paciente[] = [
  PACIENTE_EJEMPLO,
  ...EJEMPLOS.map(([nombre, apellido, documento, fechaNacimiento, genero, obraSocial, sucursal, estado], i) => ({
    id: i + 2,
    nombre,
    apellido,
    documento,
    fechaNacimiento,
    genero,
    email: `${nombre}.${apellido}@example.com`
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, ""),
    telefono: `+54 11 5${String(100 + i * 37).padStart(3, "0")}-${String(2000 + i * 413).slice(0, 4)}`,
    sucursal,
    obraSocial,
    afiliado: obraSocial.startsWith("No aplica") ? "" : `OS-${documento.slice(0, 6)}`,
    direccion: "",
    nota: "",
    estado,
    foto: null,
  })),
];

type Estado = {
  pacientes: Paciente[];
  /** Paciente elegido en las páginas de acceso directo; se mantiene al pasar de una sección a otra. */
  activoId: number | null;
};

/* Separado por empresa: cada clínica tiene su propio listado de pacientes. */
const store = crearStorePorEmpresa<Estado>(() => ({ pacientes: PACIENTES_EJEMPLO, activoId: null }), { persistir: "pacientes" });

/** Lectura sin hooks (Esther IA). */
export function leerPacientes(): Paciente[] {
  return store.leer().pacientes;
}

export function usePacientes() {
  const actual = store.usar();

  const setPacientes = (fn: (prev: Paciente[]) => Paciente[]) => {
    const estado = store.leer();
    store.poner({ ...estado, pacientes: fn(estado.pacientes) });
  };

  const setActivoId = (id: number | null) => store.poner({ ...store.leer(), activoId: id });

  return { pacientes: actual.pacientes, activoId: actual.activoId, setPacientes, setActivoId };
}