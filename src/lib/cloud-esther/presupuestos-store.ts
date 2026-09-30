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
};

const a = (
  id: string,
  codigo: string,
  nombre: string,
  categoria: CategoriaArancel,
  precio: number,
  duracion: number,
): Arancel => ({
  id,
  codigo,
  nombre,
  categoria,
  precio,
  duracion,
  activo: true,
});

export const ARANCELES_INICIALES: Arancel[] = [
  a("a1", "DX-01", "Consulta y diagnóstico", "Diagnóstico", 25000, 30),
  a("a2", "DX-02", "Radiografía periapical", "Diagnóstico", 12000, 10),
  a("a3", "DX-03", "Radiografía panorámica", "Diagnóstico", 38000, 15),
  a("a4", "PR-01", "Limpieza y profilaxis", "Prevención", 45000, 40),
  a("a5", "PR-02", "Aplicación de flúor", "Prevención", 18000, 15),
  a("a6", "PR-03", "Sellador de fosas y fisuras", "Prevención", 22000, 20),
  a("a7", "OP-01", "Restauración de resina simple", "Operatoria", 55000, 40),
  a("a8", "OP-02", "Restauración de resina compuesta", "Operatoria", 72000, 60),
  a("a9", "EN-01", "Endodoncia unirradicular", "Endodoncia", 120000, 60),
  a("a10", "EN-02", "Endodoncia multirradicular", "Endodoncia", 180000, 90),
  a("a11", "PE-01", "Raspaje y alisado por cuadrante", "Periodoncia", 60000, 45),
  a("a12", "CI-01", "Extracción simple", "Cirugía", 50000, 30),
  a("a13", "CI-02", "Extracción de tercer molar", "Cirugía", 140000, 60),
  a("a14", "IM-01", "Implante de titanio", "Implantes", 650000, 90),
  a("a15", "IM-02", "Pilar protésico", "Implantes", 180000, 30),
  a("a16", "PT-01", "Corona de disilicato", "Prótesis", 280000, 60),
  a("a17", "PT-02", "Corona metal-porcelana", "Prótesis", 210000, 60),
  a("a18", "PT-03", "Prótesis removible parcial", "Prótesis", 390000, 60),
  a("a19", "OR-01", "Ortodoncia con brackets (tratamiento)", "Ortodoncia", 480000, 60),
  a("a20", "OR-02", "Alineadores invisibles (tratamiento)", "Ortodoncia", 1200000, 60),
  a("a21", "OR-03", "Control de ortodoncia", "Ortodoncia", 35000, 20),
  a("a22", "ES-01", "Blanqueamiento en consultorio", "Estética", 90000, 60),
  a("a23", "ES-02", "Carilla de resina", "Estética", 95000, 60),
  a("a24", "ES-03", "Carilla de porcelana", "Estética", 380000, 60),
];

export const storePresupuestos = crearStorePorEmpresa<EstadoPresupuestosConfig>(
  () => ({
    aranceles: ARANCELES_INICIALES,
    plantillas: [
      {
        id: "t1",
        nombre: "Implante completo",
        descripcion: "Implante, pilar y corona definitiva.",
        items: [
          { arancelId: "a3", cantidad: 1 },
          { arancelId: "a14", cantidad: 1 },
          { arancelId: "a15", cantidad: 1 },
          { arancelId: "a16", cantidad: 1 },
        ],
      },
      {
        id: "t2",
        nombre: "Endodoncia + corona",
        descripcion: "Tratamiento de conducto con rehabilitación.",
        items: [
          { arancelId: "a2", cantidad: 2 },
          { arancelId: "a10", cantidad: 1 },
          { arancelId: "a16", cantidad: 1 },
        ],
      },
      {
        id: "t3",
        nombre: "Ortodoncia con brackets",
        descripcion: "Tratamiento completo con 12 controles.",
        items: [
          { arancelId: "a3", cantidad: 1 },
          { arancelId: "a19", cantidad: 1 },
          { arancelId: "a21", cantidad: 12 },
        ],
      },
      {
        id: "t4",
        nombre: "Puesta a punto",
        descripcion: "Consulta, limpieza, flúor y radiografías.",
        items: [
          { arancelId: "a1", cantidad: 1 },
          { arancelId: "a4", cantidad: 1 },
          { arancelId: "a5", cantidad: 1 },
          { arancelId: "a2", cantidad: 2 },
        ],
      },
      {
        id: "t5",
        nombre: "Sonrisa estética",
        descripcion: "Blanqueamiento y 4 carillas de resina.",
        items: [
          { arancelId: "a22", cantidad: 1 },
          { arancelId: "a23", cantidad: 4 },
        ],
      },
    ],
    planes: [
      { id: "f1", nombre: "Contado / transferencia", cuotas: 1, recargoPct: -10, activo: true },
      { id: "f2", nombre: "3 cuotas sin interés", cuotas: 3, recargoPct: 0, activo: true },
      { id: "f3", nombre: "6 cuotas", cuotas: 6, recargoPct: 15, activo: true },
      { id: "f4", nombre: "12 cuotas", cuotas: 12, recargoPct: 32, activo: true },
      {
        id: "f5",
        nombre: "Financiación propia 18 meses",
        cuotas: 18,
        recargoPct: 45,
        activo: false,
      },
    ],
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
