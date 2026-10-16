import { crearStorePorEmpresa } from "@/lib/cloud-esther/tenant-store";

/* Ubicación: src/lib/cloud-esther/liquidaciones-pro-store.ts
   LIQUIDACIÓN DE PROFESIONALES (por empresa): porcentaje general de cada profesional,
   excepciones por práctica y el estado de cada liquidación mensual
   (Borrador → Aprobada → Pagada). El cálculo se hace con las prestaciones atendidas de la Agenda
   y los aranceles de Presupuestos; acá solo se guarda lo que decide la clínica.
   TODO backend: guardar en el servidor de la clínica (mismo circuito que el resto de los módulos). */

export type EstadoLiquidacion = "Borrador" | "Aprobada" | "Pagada";

export type LiquidacionGuardada = {
  /** «2026-10:<id del profesional>» */
  clave: string;
  estado: EstadoLiquidacion;
  total: number;
  aprobadaPor?: string;
  aprobadaEl?: string;
  pagadaEl?: string;
  medio?: string;
};

type Estado = {
  /** % general por profesional (si no hay, se usa el de su ficha en Equipo) */
  porcentajes: Record<string, number>;
  /** Excepciones: profesional → práctica (en minúsculas) → % */
  excepciones: Record<string, Record<string, number>>;
  liquidaciones: Record<string, LiquidacionGuardada>;
};

export const storeLiquidacionesPro = crearStorePorEmpresa<Estado>(
  () => ({ porcentajes: {}, excepciones: {}, liquidaciones: {} }),
  { persistir: "liquidaciones-profesionales" },
);

export function cambiarLiquidacionesPro(fn: (e: Estado) => Estado) {
  storeLiquidacionesPro.poner(fn(storeLiquidacionesPro.leer()));
}
