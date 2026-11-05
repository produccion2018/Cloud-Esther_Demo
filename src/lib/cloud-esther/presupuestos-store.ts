import { crearStorePorEmpresa } from "@/lib/cloud-esther/tenant-store";

/* Ubicación: src/lib/cloud-esther/presupuestos-store.ts

   Configuración comercial de Presupuestos, por empresa: aranceles (lista de precios),
   plantillas de tratamientos, planes de financiación y reglas. Los presupuestos en sí se
   guardan en la ficha de cada paciente (así los ve el portal del paciente).
   TODO backend: tablas aranceles / plantillas / planes_financiacion por clinicId. */

export const CATEGORIAS_ARANCEL = [
  "Diagnóstico",
  "Prevención",
  "Operatoria",
  "Endodoncia",
  "Periodoncia",
  "Cirugía",
  "Implantes",
  "Prótesis",
  "Ortodoncia",
  "Estética",
] as const;
export type CategoriaArancel = (typeof CATEGORIAS_ARANCEL)[number];

export type Arancel = {
  id: string;
  codigo: string;
  nombre: string;
  categoria: CategoriaArancel;
  precio: number;
  duracion: number; // minutos
  activo: boolean;
};

export type Plantilla = {
  id: string;
  nombre: string;
  descripcion: string;
  items: { arancelId: string; cantidad: number }[];
};

export type PlanFinanciacion = {
  id: string;
  nombre: string;
  cuotas: number;
  recargoPct: number; // negativo = descuento
  activo: boolean;
};

export type ConfigPresupuestos = {
  validezDias: number;
  descuentoMaxPct: number;
  recordatorioDias: number;
  condiciones: string;
};

export const MOTIVOS_RECHAZO = [
  "Precio",
  "Prefiere otra clínica",
  "No tiene cobertura",
  "Va a pensarlo más adelante",
  "Otro tratamiento indicado",
] as const;

export type EstadoPresupuestosConfig = {
  aranceles: Arancel[];
  plantillas: Plantilla[];
  planes: PlanFinanciacion[];
  config: ConfigPresupuestos;
  /** Coberturas (obras sociales, prepagas, mutualistas, seguros…) con las que trabaja la clínica */
  coberturas?: Cobertura[];
  /** Nomenclador: código de cada práctica y lo que reconoce cada cobertura */
  nomenclador?: PracticaNomenclador[];
};

export type TipoCobertura = "Obra social" | "Prepaga" | "Mutualista" | "Seguro" | "Pública" | "Otra";
export type Cobertura = {
  id: string;
  nombre: string;
  tipo: TipoCobertura;
  /** Código ISO del país (AR, UY, CL…) */
  pais: string;
  /** Código o número de prestador de la entidad (opcional) */
  codigo: string;
  activa: boolean;
  requiereAutorizacion: boolean;
  notas: string;
};
export type ValorCobertura = { cubre: number; coseguro: number; autorizacion: boolean };
export type PracticaNomenclador = {
  id: string;
  codigo: string;
  descripcion: string;
  /** Arancel de la clínica con el que se relaciona (para cobrar y liquidar) */
  arancelId: string;
  valores: Record<string, ValorCobertura>;
};

/* Catálogos vacíos: vienen del backend. Se mantiene el export por si otro archivo lo importa. */
export const ARANCELES_INICIALES: Arancel[] = [];

export const storePresupuestos = crearStorePorEmpresa<EstadoPresupuestosConfig>(
  () => ({
    aranceles: ARANCELES_INICIALES,
    plantillas: [],
    planes: [],
    config: {
      validezDias: 30,
      descuentoMaxPct: 15,
      recordatorioDias: 3,
      condiciones:
        "Presupuesto válido por 30 días. Los valores pueden cambiar si el diagnóstico se modifica durante el tratamiento. Seña del 30% para reservar los turnos.",
    },
  }),
  { persistir: "presupuestos-config" },
);

export function setPresupuestos<K extends keyof EstadoPresupuestosConfig>(
  clave: K,
  fn: (prev: EstadoPresupuestosConfig[K]) => EstadoPresupuestosConfig[K],
) {
  const actual = storePresupuestos.leer();
  storePresupuestos.poner({ ...actual, [clave]: fn(actual[clave]) });
}

/** Total con plan de financiación aplicado y valor de cada cuota. */
export function conPlan(total: number, plan: PlanFinanciacion | undefined) {
  if (!plan) return { final: total, cuota: total, cuotas: 1 };
  const final = Math.round(total * (1 + plan.recargoPct / 100));
  return { final, cuota: Math.round(final / Math.max(1, plan.cuotas)), cuotas: plan.cuotas };
}