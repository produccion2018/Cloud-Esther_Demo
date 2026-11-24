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
  /** Responsable / tutor (para pacientes menores de edad). Opcional. */
  tutor?: string;
  tutorTelefono?: string;
  /** Etiquetas propias de la clínica (VIP, Debe dinero, Miedo al dentista…). */
  etiquetas?: string[];
};

/* Catálogo de etiquetas de cada clínica (nombre y color). Lo arma la clínica a su criterio. */
export type Etiqueta = { nombre: string; color: string };
export const COLORES_ETIQUETA = ["violeta", "rosa", "rojo", "ambar", "verde", "azul", "gris"] as const;
export const ETIQUETAS_SUGERIDAS: Etiqueta[] = [
  { nombre: "VIP", color: "violeta" },
  { nombre: "Debe dinero", color: "rojo" },
  { nombre: "Miedo al dentista", color: "ambar" },
  { nombre: "Ortodoncia", color: "azul" },
  { nombre: "Recomienda pacientes", color: "verde" },
];

type Estado = {
  pacientes: Paciente[];
  /** Paciente elegido en las páginas de acceso directo; se mantiene al pasar de una sección a otra. */
  activoId: number | null;
  /** Etiquetas de la clínica (opcional en datos viejos: se usan las sugeridas). */
  etiquetas?: Etiqueta[];
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

/** Etiquetas de la clínica y de cada paciente */
export function useEtiquetas() {
  const actual = store.usar();
  const catalogo = actual.etiquetas ?? ETIQUETAS_SUGERIDAS;
  const setCatalogo = (fn: (prev: Etiqueta[]) => Etiqueta[]) => {
    const e = store.leer();
    store.poner({ ...e, etiquetas: fn(e.etiquetas ?? ETIQUETAS_SUGERIDAS) });
  };
  const crear = (nombre: string, color: string) => {
    const n = nombre.trim().slice(0, 30);
    if (!n) return "";
    const existe = catalogo.find((x) => x.nombre.toLowerCase() === n.toLowerCase());
    if (existe) return existe.nombre;
    setCatalogo((prev) => [...prev, { nombre: n, color }]);
    return n;
  };
  const borrar = (nombre: string) => {
    const e = store.leer();
    store.poner({
      ...e,
      etiquetas: (e.etiquetas ?? ETIQUETAS_SUGERIDAS).filter((x) => x.nombre !== nombre),
      pacientes: e.pacientes.map((p) =>
        p.etiquetas?.includes(nombre) ? { ...p, etiquetas: p.etiquetas.filter((x) => x !== nombre) } : p,
      ),
    });
  };
  const alternar = (pacienteId: number, nombre: string) => {
    const e = store.leer();
    store.poner({
      ...e,
      pacientes: e.pacientes.map((p) => {
        if (p.id !== pacienteId) return p;
        const ya = p.etiquetas ?? [];
        return { ...p, etiquetas: ya.includes(nombre) ? ya.filter((x) => x !== nombre) : [...ya, nombre] };
      }),
    });
  };
  const colorDe = (nombre: string) => catalogo.find((x) => x.nombre === nombre)?.color ?? "gris";
  return { catalogo, crear, borrar, alternar, colorDe };
}