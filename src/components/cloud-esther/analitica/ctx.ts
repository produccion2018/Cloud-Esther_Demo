import type { Hecho, PresupuestoHecho } from "@/lib/cloud-esther/analitica-datos";
import type { EstadoAnalitica } from "@/lib/cloud-esther/analitica-store";
import type {
  DatosAnalitica,
  Filtros,
  Metricas,
  Rango,
} from "@/components/cloud-esther/analitica/datos";

export type SeccionBI =
  | "resumen"
  | "pacientes"
  | "agenda"
  | "profesionales"
  | "tratamientos"
  | "marketing"
  | "finanzas"
  | "sedes"
  | "reportes";

export type CtxBI = {
  $: (n: number) => string; // moneda completa
  $c: (n: number) => string; // moneda compacta ($ 12,4 M)
  n: (n: number) => string;
  p: (n: number) => string; // porcentaje
  nivel: number;
  f: Filtros;
  rango: Rango;
  datos: DatosAnalitica;
  cfg: EstadoAnalitica;
  sedes: string[]; // sedes del filtro
  todasSedes: string[];
  base: Hecho[]; // filtrado por sede/profesional, todas las fechas
  hs: Hecho[]; // período
  hsPrev: Hecho[]; // período anterior
  pres: PresupuestoHecho[];
  presPrev: PresupuestoHecho[];
  m: Metricas;
  mPrev: Metricas;
  meses: string[]; // últimos 12 meses (aaaa-mm), del más viejo al actual
  mensual: Metricas[]; // métricas de cada uno de esos meses
  onToast: (t: string) => void;
  ir: (s: SeccionBI) => void;
};

export function formatos(fmtMoneda: (n: number) => string) {
  const $ = (n: number) => (n < 0 ? `−${fmtMoneda(-n)}` : fmtMoneda(n));
  const $c = (n: number) => {
    const a = Math.abs(n);
    const s = n < 0 ? "−" : "";
    if (a >= 1_000_000) return `${s}$ ${(a / 1_000_000).toFixed(1).replace(".", ",")} M`;
    if (a >= 10_000) return `${s}$ ${Math.round(a / 1000)} k`;
    return $(n);
  };
  const n = (x: number) => Math.round(x).toLocaleString("es-AR");
  const p = (x: number) => `${x.toFixed(1).replace(".", ",")} %`;
  return { $, $c, n, p };
}
