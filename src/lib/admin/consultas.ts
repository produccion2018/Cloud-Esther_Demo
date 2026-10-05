import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import * as api from "./api";

/* Ubicación: src/lib/admin/consultas.ts
   Hooks de datos (React Query) sobre src/lib/admin/api.ts. Cachean y refrescan cada sección. */

export const useEquipo = () => useQuery({ queryKey: ["equipo"], queryFn: api.obtenerEquipo });
export const usePlanes = () => useQuery({ queryKey: ["planes"], queryFn: api.obtenerPlanes });
export const useClinicas = () => useQuery({ queryKey: ["clinicas"], queryFn: api.obtenerClinicas });
export const useDemos = () =>
  useQuery({ queryKey: ["demos"], queryFn: api.obtenerDemos, refetchInterval: 60_000 });
export const useConfigDemo = () =>
  useQuery({ queryKey: ["config-demo"], queryFn: api.obtenerConfigDemo });
export const useTickets = () => useColeccion("ticketsSoporte");

/** Colección de los módulos internos (personal, nómina, gastos, soporte…). */
export function useColeccion<K extends keyof api.Colecciones>(k: K) {
  return useQuery({ queryKey: [k], queryFn: () => api.listar(k) });
}
export const useNotificaciones = () =>
  useQuery({
    queryKey: ["notificaciones"],
    queryFn: api.obtenerNotificaciones,
    refetchInterval: 60_000,
  });
export const useSesionesPanel = () =>
  useQuery({ queryKey: ["sesiones"], queryFn: api.obtenerSesiones });
export const useIntentos = () => useQuery({ queryKey: ["intentos"], queryFn: api.obtenerIntentos });
export const useActividad = () =>
  useQuery({ queryKey: ["actividad"], queryFn: api.obtenerActividad });
export const useConsumoIA = () =>
  useQuery({ queryKey: ["consumo-ia"], queryFn: api.obtenerConsumoIA });
export const useCrecimiento = () =>
  useQuery({ queryKey: ["crecimiento"], queryFn: api.obtenerCrecimiento });

/** Mutación con aviso y refresco de las listas afectadas. */
export function useAccion<A, R = unknown>(
  fn: (a: A) => Promise<R>,
  claves: string[],
  mensaje?: string | ((a: A) => string),
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (_r, a) => {
      [...claves, "actividad"].forEach((k) => void qc.invalidateQueries({ queryKey: [k] }));
      if (mensaje) toast.success(typeof mensaje === "function" ? mensaje(a) : mensaje);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudo guardar."),
  });
}

/** Guardar o borrar en una colección interna, con aviso y refresco. */
export function useGuardarEn<K extends keyof api.Colecciones>(k: K, mensaje = "Cambios guardados") {
  return useAccion(
    (a: { item: api.Colecciones[K][number]; accion?: string }) =>
      api.guardarEn(k, a.item, a.accion),
    [k],
    mensaje,
  );
}
export function useBorrarDe<K extends keyof api.Colecciones>(k: K, mensaje = "Eliminado") {
  return useAccion(
    (a: { id: string; accion?: string }) => api.borrarDe(k, a.id, a.accion),
    [k],
    mensaje,
  );
}
