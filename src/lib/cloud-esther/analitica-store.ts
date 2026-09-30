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
  { persistir: "analitica" },
);

export function setAnalitica<K extends keyof EstadoAnalitica>(
  clave: K,
  fn: (prev: EstadoAnalitica[K]) => EstadoAnalitica[K],
) {
  const actual = storeAnalitica.leer();
  storeAnalitica.poner({ ...actual, [clave]: fn(actual[clave]) });
}
