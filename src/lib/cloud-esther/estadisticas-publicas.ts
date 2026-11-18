import { useEffect, useState } from "react";

/* Ubicación: src/lib/cloud-esther/estadisticas-publicas.ts
   Trae de la web pública la cantidad REAL de clínicas activas (GET /estadisticas del backend).
   Es solo un número; no expone datos de ninguna clínica. Si no hay backend o falla, devuelve null
   y la página sigue mostrando el número base de siempre. Pedido de Camilo (nov 2026): que el
   contador suba de verdad y cambie de color a medida que se suman empresas. */

const API_URL = (import.meta.env["VITE_ADMIN_API_URL"] as string | undefined)?.replace(/\/$/, "");

/** Cantidad real de clínicas activas. null mientras no se sabe (sin backend o cargando). */
export function useClinicasReales(): number | null {
  const [n, setN] = useState<number | null>(null);
  useEffect(() => {
    if (!API_URL || typeof window === "undefined") return;
    let vivo = true;
    fetch(`${API_URL}/estadisticas`)
      .then((r) => (r.ok ? (r.json() as Promise<{ clinicas: number }>) : Promise.reject(new Error())))
      .then((d) => {
        if (vivo && typeof d.clinicas === "number") setN(d.clinicas);
      })
      .catch(() => {
        /* sin conexión: la página sigue con el número base */
      });
    return () => {
      vivo = false;
    };
  }, []);
  return n;
}
