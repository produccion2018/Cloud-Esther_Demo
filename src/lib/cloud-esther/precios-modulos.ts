import { useSyncExternalStore } from "react";

/* Ubicación: src/lib/cloud-esther/precios-modulos.ts

   Precio mensual de cada MÓDULO ADICIONAL (el que una clínica Start/Pro/Plus puede sumar sin
   cambiar de plan). Lo fija el Dueño desde el panel administrativo (/admin/planes → «Precios de
   módulos adicionales») y lo lee la app de la clínica para mostrarlo antes de contratar.

   Se guarda en el navegador (localStorage) con UNA sola clave, compartida entre el panel admin y
   la app de la clínica porque son la MISMA aplicación (mismo origen): lo que el Dueño guarda en el
   panel, la clínica lo ve al instante en el demo.
   TODO backend: exponer estos precios en GET /planes (pública) y guardarlos en PUT /admin/planes
   para que también viajen entre distintos navegadores/dispositivos en producción. */

const CLAVE = "cloud-esther:precios-modulos:v1";

/** { idDelMódulo: precioMensualUSD }. Sin entrada = sin precio definido (no se muestra monto). */
export type PreciosModulos = Record<string, number>;

const VACIO: PreciosModulos = {};
let cache: PreciosModulos | null = null;
const oyentes = new Set<() => void>();

function leerLS(): PreciosModulos {
  if (typeof window === "undefined") return VACIO;
  try {
    const raw = window.localStorage.getItem(CLAVE);
    return raw ? (JSON.parse(raw) as PreciosModulos) : {};
  } catch {
    return {};
  }
}

/** Precios actuales (referencia estable hasta que se guarde un cambio). */
export function leerPreciosModulos(): PreciosModulos {
  if (cache === null) cache = leerLS();
  return cache;
}

function avisar() {
  oyentes.forEach((f) => f());
}

/** Fija (o borra, con null) el precio mensual de un módulo adicional. */
export function guardarPrecioModulo(id: string, precio: number | null) {
  const actual: PreciosModulos = { ...leerPreciosModulos() };
  if (precio === null || !Number.isFinite(precio)) delete actual[id];
  else actual[id] = Math.round(precio * 100) / 100;
  cache = actual;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(CLAVE, JSON.stringify(actual));
    } catch {
      /* sin espacio o bloqueado: sigue en memoria */
    }
  }
  avisar();
}

// Otra pestaña (o el panel admin en otra pestaña) guardó cambios: se toman al instante.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key !== CLAVE) return;
    cache = leerLS();
    avisar();
  });
}

/** Hook reactivo: los precios de los módulos adicionales. */
export function usePreciosModulos(): PreciosModulos {
  return useSyncExternalStore(
    (f) => {
      oyentes.add(f);
      return () => oyentes.delete(f);
    },
    leerPreciosModulos,
    () => VACIO,
  );
}

/** Precio mensual de un módulo, o null si el Dueño todavía no lo cargó. */
export function precioModulo(id: string): number | null {
  const n = leerPreciosModulos()[id];
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

/** Texto para mostrar: «USD 12 / mes». Si no hay precio cargado, devuelve undefined. */
export function formatearPrecioModulo(n: number | null | undefined): string | undefined {
  if (n === null || n === undefined || !Number.isFinite(n)) return undefined;
  const monto = n % 1 === 0 ? String(n) : n.toFixed(2);
  return `USD ${monto} / mes`;
}
