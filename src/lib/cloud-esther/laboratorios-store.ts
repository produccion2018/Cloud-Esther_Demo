import { crearStorePorEmpresa } from "@/lib/cloud-esther/tenant-store";

/* Ubicación: src/lib/cloud-esther/laboratorios-store.ts
   LABORATORIOS DENTALES de la clínica (por empresa): directorio (nombre, contacto, WhatsApp,
   correo, plazo habitual) y pagos hechos a cada uno (para la cuenta corriente).
   Los TRABAJOS siguen en la ficha de cada paciente (registros.laboratorio); acá no hay datos
   de salud. En una clínica real se guarda en el módulo «laboratorios» del servidor. */

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
    laboratorios: [
      { id: "lab-1", nombre: "ProDent Lab", contacto: "Raúl Medina", telefono: "+54 11 4555-0190", email: "pedidos@prodentlab.com", plazoDias: 7, notas: "" },
      { id: "lab-2", nombre: "OrthoLab Argentina", contacto: "Paula Ríos", telefono: "+54 11 4777-2211", email: "hola@ortholab.com", plazoDias: 10, notas: "" },
    ],
    pagos: [],
  }),
  { persistir: "laboratorios" },
);

export function cambiarLaboratorios(fn: (e: Estado) => Estado) {
  storeLaboratorios.poner(fn(storeLaboratorios.leer()));
}
