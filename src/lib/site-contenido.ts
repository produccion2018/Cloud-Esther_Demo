import { useEffect, useState } from "react";

/* Ubicación: src/lib/site-contenido.ts
   Contenido dinámico del sitio público que se administra desde el panel administrativo.
   Hoy se usan datos de prueba; el panel podrá reemplazarlos llamando a
   guardarPanelCaracteristicas() (o el backend respondiendo GET /sitio/contenido).
   TODO backend: GET/PUT /sitio/contenido/panel-caracteristicas. */

export type TipoHallazgo = "historia" | "agenda" | "pacientes" | "crecimiento";

export type PanelCaracteristicas = {
  titulo: string;
  clinica: string;
  actualizado: string; // ISO
  /** true mientras no se conecten datos reales: se muestra «Datos de ejemplo». */
  ejemplo: boolean;
  indicadores: { etiqueta: string; valor: string; variacion?: string }[];
  hallazgos: { tipo: TipoHallazgo; categoria: string; texto: string; accion: string }[];
};

export const PANEL_CARACTERISTICAS_PRUEBA: PanelCaracteristicas = {
  titulo: "Resumen de Esther IA",
  clinica: "Clínica de ejemplo",
  actualizado: "",
  ejemplo: true,
  indicadores: [
    { etiqueta: "Turnos de hoy", valor: "18", variacion: "+12%" },
    { etiqueta: "Asistencia", valor: "94%", variacion: "+3 pts" },
    { etiqueta: "Presupuestos aceptados", valor: "68%", variacion: "+8%" },
  ],
  hallazgos: [
    {
      tipo: "historia",
      categoria: "Historia clínica",
      texto: "Resumen listo de la historia clínica de Laura Gómez antes de su consulta.",
      accion: "Ver resumen",
    },
    {
      tipo: "agenda",
      categoria: "Agenda",
      texto: "3 horarios libres el jueves por la tarde para ofrecer a la lista de espera.",
      accion: "Completar agenda",
    },
    {
      tipo: "pacientes",
      categoria: "Pacientes",
      texto: "12 pacientes sin turno hace más de 8 meses. Conviene invitarlos a un control.",
      accion: "Ver pacientes",
    },
    {
      tipo: "crecimiento",
      categoria: "Rendimiento",
      texto: "Los tratamientos de ortodoncia crecieron 22% este trimestre.",
      accion: "Ver reporte",
    },
  ],
};

const CLAVE = "cloud-esther:sitio:panel-caracteristicas";

function leer(): PanelCaracteristicas {
  try {
    const raw = localStorage.getItem(CLAVE);
    if (raw)
      return {
        ...PANEL_CARACTERISTICAS_PRUEBA,
        ...(JSON.parse(raw) as Partial<PanelCaracteristicas>),
      };
  } catch {
    /* sin almacenamiento */
  }
  return PANEL_CARACTERISTICAS_PRUEBA;
}

/** Lo usa el panel administrativo para actualizar lo que muestra el sitio. */
export function guardarPanelCaracteristicas(datos: Partial<PanelCaracteristicas>) {
  try {
    localStorage.setItem(
      CLAVE,
      JSON.stringify({ ...leer(), ...datos, actualizado: new Date().toISOString() }),
    );
    window.dispatchEvent(new Event(CLAVE));
  } catch {
    /* sin almacenamiento */
  }
}

export function usePanelCaracteristicas(): PanelCaracteristicas {
  // En el servidor y en el primer render se muestran los datos de prueba (sin desajustes).
  const [datos, setDatos] = useState(PANEL_CARACTERISTICAS_PRUEBA);
  useEffect(() => {
    const sync = () => setDatos(leer());
    sync();
    window.addEventListener(CLAVE, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CLAVE, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return datos;
}
