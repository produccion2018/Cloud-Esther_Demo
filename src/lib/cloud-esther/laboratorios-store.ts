import { crearStorePorEmpresa } from "@/lib/cloud-esther/tenant-store";

/* Ubicación: src/lib/cloud-esther/laboratorios-store.ts
   LABORATORIOS DENTALES de la clínica (por empresa): directorio (nombre, contacto, WhatsApp,
   correo, plazo habitual) y pagos hechos a cada uno (para la cuenta corriente).
   Los TRABAJOS siguen en la ficha de cada paciente (registros.laboratorio); acá no hay datos
   de salud. En una clínica real se guarda en el módulo «laboratorios» del servidor.
   Arranca vacío: cada clínica carga sus propios laboratorios. */

export type Laboratorio = {
  id: string;
  nombre: string;
  contacto: string;
  telefono: string;
  email: string;
  /** Días que suele tardar (para avisar atrasos si el trabajo no tiene fecha) */
  plazoDias: number;
  notas: string;
  /** Lista de precios: cuánto cobra y cuánto tarda cada trabajo (completa la orden sola). */
  precios?: PrecioLaboratorio[];
  /** Hasta cuándo anda el enlace que tiene el laboratorio para ver sus órdenes (ISO). */
  enlaceVence?: string;
};
export type PrecioLaboratorio = { id: string; trabajo: string; precio: number; dias: number };
/** Precio de lista de ese trabajo en ese laboratorio (sin distinguir mayúsculas). */
export function precioDeLista(labs: Laboratorio[], proveedor: string, trabajo: string): PrecioLaboratorio | null {
  const k = (v: string) => v.trim().toLowerCase();
  const lab = labs.find((l) => k(l.nombre) === k(proveedor));
  return lab?.precios?.find((p) => k(p.trabajo) === k(trabajo)) ?? null;
}
export type PagoLaboratorio = {
  id: string;
  labId: string;
  fecha: string;
  monto: number;
  medio: string;
  nota: string;
  por: string;
};

type Estado = { laboratorios: Laboratorio[]; pagos: PagoLaboratorio[] };

export const storeLaboratorios = crearStorePorEmpresa<Estado>(
  () => ({
    laboratorios: [],
    pagos: [],
  }),
  { persistir: "laboratorios" },
);

export function cambiarLaboratorios(fn: (e: Estado) => Estado) {
  storeLaboratorios.poner(fn(storeLaboratorios.leer()));
}