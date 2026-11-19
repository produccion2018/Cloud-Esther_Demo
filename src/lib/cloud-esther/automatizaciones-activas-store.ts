import { crearStorePorEmpresa } from "@/lib/cloud-esther/tenant-store";
import { TOTAL_AUTOMATIZACIONES } from "@/lib/cloud-esther/automatizaciones-126";

/* Ubicación: src/lib/cloud-esther/automatizaciones-activas-store.ts
   Qué automatizaciones (de las 126) tiene activas la empresa. Guardado por empresa y aislado.
   - Plan 4 (grupo): vienen todas activas por defecto.
   - Plan 3 (avanzada): puede activarlas/desactivarlas (están incluidas en Esther Infinity).
   - Plan 1 y 2: no las activan (es una capacidad de Esther Infinity completo). */

export type EstadoAutoActivas = { activas: number[]; inicializado: boolean };

export const storeAutoActivas = crearStorePorEmpresa<EstadoAutoActivas>(
  () => ({ activas: [], inicializado: false }),
  { persistir: "automatizaciones-activas" },
);

/** Asegura el valor por defecto según el plan (Plan 4: todas; otros: lo que haya). Idempotente. */
export function inicializarAutoActivas(planGrupo: boolean) {
  const e = storeAutoActivas.leer();
  if (e.inicializado) return;
  const activas = planGrupo ? Array.from({ length: TOTAL_AUTOMATIZACIONES }, (_, i) => i + 1) : e.activas;
  storeAutoActivas.poner({ activas, inicializado: true });
}

export function alternarAuto(n: number) {
  const e = storeAutoActivas.leer();
  const activas = e.activas.includes(n) ? e.activas.filter((x) => x !== n) : [...e.activas, n];
  storeAutoActivas.poner({ ...e, activas, inicializado: true });
}

export function activarGrupo(nums: number[], activar: boolean) {
  const e = storeAutoActivas.leer();
  const set = new Set(e.activas);
  for (const n of nums) {
    if (activar) set.add(n);
    else set.delete(n);
  }
  storeAutoActivas.poner({ ...e, activas: [...set], inicializado: true });
}
