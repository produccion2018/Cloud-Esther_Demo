import { useSyncExternalStore } from "react";

/* Ubicación sugerida: src/lib/cloud-esther/pacientes.ts

   Los pacientes viven a nivel módulo para que se compartan entre la página de Pacientes y las
   páginas de acceso directo del sidebar (Historia, Recetas, Estudios…).
   TODO backend: reemplazar este store por las consultas a la API (GET /pacientes, etc.). */

export type EstadoPaciente = "Activo" | "Inactivo";

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
  documento: "95222294",
  fechaNacimiento: "",
  genero: "",
  email: "mauro.pinto@example.com",
  telefono: "+54 11 5555-8899",
  sucursal: "",
  obraSocial: "OSDE",
  afiliado: "OS-45892177",
  direccion: "",
  nota: "",
  estado: "Activo",
  foto: null,
};

type Estado = {
  pacientes: Paciente[];
  /** Paciente elegido en las páginas de acceso directo; se mantiene al pasar de una sección a otra. */
  activoId: number | null;
};

let estado: Estado = { pacientes: [PACIENTE_EJEMPLO], activoId: null };
const oyentes = new Set<() => void>();

const suscribir = (f: () => void) => {
  oyentes.add(f);
  return () => {
    oyentes.delete(f);
  };
};
const leer = () => estado;
const poner = (siguiente: Estado) => {
  estado = siguiente;
  oyentes.forEach((f) => f());
};

export function usePacientes() {
  const actual = useSyncExternalStore(suscribir, leer, leer);

  const setPacientes = (fn: (prev: Paciente[]) => Paciente[]) =>
    poner({ ...estado, pacientes: fn(estado.pacientes) });

  const setActivoId = (id: number | null) => poner({ ...estado, activoId: id });

  return { pacientes: actual.pacientes, activoId: actual.activoId, setPacientes, setActivoId };
}