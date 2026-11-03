import { crearStorePorEmpresa } from "@/lib/cloud-esther/tenant-store";
import { capitalizarNombre } from "@/lib/utils";

/* Ubicación: src/lib/cloud-esther/pacientes.ts

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

type Estado = {
  pacientes: Paciente[];
  /** Paciente elegido en las páginas de acceso directo; se mantiene al pasar de una sección a otra. */
  activoId: number | null;
};

/* Separado por empresa: cada clínica tiene su propio listado de pacientes.
   Arranca vacío, igual que producción. */
const store = crearStorePorEmpresa<Estado>(() => ({ pacientes: [], activoId: null }), {
  persistir: "pacientes",
  vacio: () => ({ pacientes: [], activoId: null }),
  // El paciente elegido es de cada pantalla: no se comparte con el resto de la clínica
  soloLocal: ["activoId"],
  // Nombre y apellido SIEMPRE con mayúscula inicial, como sea que se escriban
  // («andres felipe», «ANDRES FELIPE» → «Andres Felipe»). También arregla los ya guardados.
  normalizar: (e) => {
    if (!Array.isArray(e?.pacientes)) return e;
    let cambio = false;
    const pacientes = e.pacientes.map((p) => {
      const nombre = capitalizarNombre(p.nombre ?? "");
      const apellido = capitalizarNombre(p.apellido ?? "");
      if (nombre === p.nombre && apellido === p.apellido) return p;
      cambio = true;
      return { ...p, nombre, apellido };
    });
    return cambio ? { ...e, pacientes } : e;
  },
});

/** Lectura sin hooks (Esther Infinity). */
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