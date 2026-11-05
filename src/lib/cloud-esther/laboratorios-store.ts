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
};
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