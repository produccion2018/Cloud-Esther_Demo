import { crearStorePorEmpresa } from "@/lib/cloud-esther/tenant-store";

/* Ubicación: src/lib/cloud-esther/analitica-store.ts
   Configuración de Analítica por empresa: metas del mes, capacidad de cada sede (para la
   ocupación), reportes guardados y envíos programados. TODO backend: /analitica/*. */

export type Metrica =
  "produccion" | "atenciones" | "nuevos" | "ticket" | "ausentismo" | "presupuestos" | "conversion";
export type Dimension =
  | "mes"
  | "semana"
  | "sucursal"
  | "profesional"
  | "tratamiento"
  | "categoria"
  | "canal"
  | "cobertura"
  | "dia"
  | "edad";
export type Visual = "barras" | "linea" | "tabla";

export type ReporteGuardado = {
  id: string;
  nombre: string;
  metrica: Metrica;
  dimension: Dimension;
  visual: Visual;
  periodo: string;
  creado: string;
};
export type EnvioProgramado = {
  id: string;
  reporteId: string;
  frecuencia: "Semanal" | "Mensual";
  destinatarios: string;
  proximo: string;
};

export type EstadoAnalitica = {
  incluirHistorico: boolean;
  capacidad: Record<string, { gabinetes: number; horas: number }>;
  duracionMin: number;
  metas: {
    produccion: number;
    nuevos: number;
    ocupacion: number;
    ausentismo: number;
    conversion: number;
  };
  reportes: ReporteGuardado[];
  envios: EnvioProgramado[];
};

export const storeAnalitica = crearStorePorEmpresa<EstadoAnalitica>(
  () => ({
    incluirHistorico: true,
    capacidad: {
      "Clínica Centro": { gabinetes: 2, horas: 7 },
      "Clínica Norte": { gabinetes: 1, horas: 7 },
      "Clínica Sur": { gabinetes: 1, horas: 5 },
      "Clínica Belgrano": { gabinetes: 1, horas: 6 },
    },
    duracionMin: 45,
    metas: { produccion: 36_000_000, nuevos: 100, ocupacion: 70, ausentismo: 10, conversion: 50 },
    reportes: [
      {
        id: "r1",
        nombre: "Producción por profesional",
        metrica: "produccion",
        dimension: "profesional",
        visual: "barras",
        periodo: "30d",
        creado: "2026-08-01",
      },
      {
        id: "r2",
        nombre: "Pacientes nuevos por canal",
        metrica: "nuevos",
        dimension: "canal",
        visual: "barras",
        periodo: "90d",
        creado: "2026-08-12",
      },
    ],
    envios: [
      {
        id: "e1",
        reporteId: "r1",
        frecuencia: "Mensual",
        destinatarios: "direccion@clinicaesther.com",
        proximo: "",
      },
    ],
  }),
  {
    persistir: "analitica",
    // Cada clínica arranca en blanco: sin metas, sedes ni reportes de ejemplo (las metas las pone ella)
    vacio: () => ({
      incluirHistorico: false,
      capacidad: {},
      duracionMin: 30,
      metas: { produccion: 0, nuevos: 0, ocupacion: 0, ausentismo: 0, conversion: 0 },
      reportes: [],
      envios: [],
    }),
    // Datos guardados con los valores de ejemplo de antes: se limpian (no son de la clínica)
    normalizar: (e) => {
      if (!e || typeof e !== "object") return e;
      let x = e;
      const m = x.metas;
      if (m && m.produccion === 36_000_000 && m.nuevos === 100 && m.ocupacion === 70 && m.ausentismo === 10 && m.conversion === 50)
        x = { ...x, metas: { produccion: 0, nuevos: 0, ocupacion: 0, ausentismo: 0, conversion: 0 } };
      const EJEMPLO = ["Clínica Centro", "Clínica Norte", "Clínica Sur", "Clínica Belgrano"];
      if (x.capacidad && EJEMPLO.some((k) => k in x.capacidad)) {
        const c = { ...x.capacidad };
        for (const k of EJEMPLO) delete c[k];
        x = { ...x, capacidad: c };
      }
      if (Array.isArray(x.reportes) && x.reportes.some((r) => r.id === "r1" || r.id === "r2"))
        x = { ...x, reportes: x.reportes.filter((r) => r.id !== "r1" && r.id !== "r2"), envios: (x.envios ?? []).filter((v) => v.id !== "e1") };
      return x;
    },
  },
);

export function setAnalitica<K extends keyof EstadoAnalitica>(
  clave: K,
  fn: (prev: EstadoAnalitica[K]) => EstadoAnalitica[K],
) {
  const actual = storeAnalitica.leer();
  storeAnalitica.poner({ ...actual, [clave]: fn(actual[clave]) });
}
