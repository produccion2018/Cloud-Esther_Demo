import { crearStorePorEmpresa } from "@/lib/cloud-esther/tenant-store";

/* Ubicación: src/lib/cloud-esther/modulos-extra-store.ts
   Módulos adicionales comprados por la empresa: Start, Pro y Plus pueden sumar módulos que su
   plan no incluye. Se guardan por empresa (nunca se cruzan entre clínicas).
   El precio de cada módulo lo informa el backend. TODO backend: /suscripcion/modulos. */

export type ModuloExtra = { id: string; desde: string; usuario: string };
export type EstadoModulosExtra = { activos: ModuloExtra[] };

export const storeModulosExtra = crearStorePorEmpresa<EstadoModulosExtra>(() => ({ activos: [] }), {
  persistir: "modulos-extra",
});

export function modulosExtra(): string[] {
  return storeModulosExtra.leer().activos.map((m) => m.id);
}

export function agregarModuloExtra(id: string, usuario: string) {
  const e = storeModulosExtra.leer();
  if (e.activos.some((m) => m.id === id)) return;
  storeModulosExtra.poner({
    activos: [...e.activos, { id, desde: new Date().toISOString(), usuario }],
  });
}

export function quitarModuloExtra(id: string) {
  const e = storeModulosExtra.leer();
  storeModulosExtra.poner({ activos: e.activos.filter((m) => m.id !== id) });
}
