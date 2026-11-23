import { useSyncExternalStore } from "react";

/* Ubicación: src/lib/cloud-esther/precios-modulos.ts

   Precio mensual de cada MÓDULO ADICIONAL (el que una clínica Start/Pro/Plus puede sumar sin
   cambiar de plan). Lo fija el Dueño desde el panel administrativo (/admin/planes → «Precios de
   módulos adicionales») y lo lee la app de la clínica para mostrarlo antes de contratar.

   Se guarda en el navegador (localStorage) con UNA sola clave, compartida entre el panel admin y
   la app de la clínica porque son la MISMA aplicación (mismo origen): lo que el Dueño guarda en el
   panel, la clínica lo ve al instante en el demo.
   CON SERVIDOR (producción): los precios viven en el servidor. La app los trae de GET /modulos/precios
   (público) y el panel los guarda con PUT /admin/modulos/precios/:modulo. Así los ve cualquier clínica
   desde cualquier dispositivo. Acá queda una copia en memoria para mostrarlos al instante.
   Si la clínica paga ANUAL, el servidor le calcula: mensual × 12 con el descuento anual de su plan. */

const API_URL = (import.meta.env["VITE_ADMIN_API_URL"] as string | undefined)?.replace(/\/$/, "");
/** true = los precios los guarda el servidor (no el navegador) */
export const PRECIOS_EN_SERVIDOR = Boolean(API_URL);

const CLAVE = "cloud-esther:precios-modulos:v1";

/** { idDelMódulo: precioMensualUSD }. Sin entrada = sin precio definido (no se muestra monto). */
export type PreciosModulos = Record<string, number>;

const VACIO: PreciosModulos = {};
let cache: PreciosModulos | null = null;
const oyentes = new Set<() => void>();

function leerLS(): PreciosModulos {
  if (typeof window === "undefined" || PRECIOS_EN_SERVIDOR) return VACIO;
  try {
    const raw = window.localStorage.getItem(CLAVE);
    return raw ? (JSON.parse(raw) as PreciosModulos) : {};
  } catch {
    return {};
  }
}

/** Precios actuales (referencia estable hasta que se guarde un cambio). */
export function leerPreciosModulos(): PreciosModulos {
  if (cache === null) {
    cache = leerLS();
    void traerDelServidor();
  }
  return cache;
}

let pedido: Promise<void> | null = null;
let ultimaVez = 0;
/** Trae los precios del servidor (como mucho una vez por minuto). */
export function traerDelServidor(forzar = false): Promise<void> {
  if (!PRECIOS_EN_SERVIDOR || typeof window === "undefined") return Promise.resolve();
  if (pedido) return pedido;
  if (!forzar && Date.now() - ultimaVez < 60_000) return Promise.resolve();
  pedido = fetch(`${API_URL}/modulos/precios`)
    .then((r) => (r.ok ? (r.json() as Promise<PreciosModulos>) : null))
    .then((p) => {
      ultimaVez = Date.now();
      if (p) {
        cache = p;
        avisar();
      }
    })
    .catch(() => undefined)
    .finally(() => {
      pedido = null;
    });
  return pedido;
}

function avisar() {
  oyentes.forEach((f) => f());
}

/** Fija (o borra, con null) el precio mensual de un módulo adicional.
 *  Con servidor, el panel primero lo guarda en el servidor (guardarPrecioModuloServidor) y después
 *  llama a esto para verlo al instante. */
export function guardarPrecioModulo(id: string, precio: number | null) {
  const actual: PreciosModulos = { ...leerPreciosModulos() };
  if (precio === null || !Number.isFinite(precio)) delete actual[id];
  else actual[id] = Math.round(precio * 100) / 100;
  cache = actual;
  if (typeof window !== "undefined" && !PRECIOS_EN_SERVIDOR) {
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

/** Texto para mostrar: «USD 12 / mes» (o «/ año»). Si no hay precio cargado, devuelve undefined. */
export function formatearPrecioModulo(
  n: number | null | undefined,
  ciclo: "mensual" | "anual" = "mensual",
): string | undefined {
  if (n === null || n === undefined || !Number.isFinite(n)) return undefined;
  const monto = n % 1 === 0 ? String(n) : n.toFixed(2);
  return `USD ${monto} / ${ciclo === "anual" ? "año" : "mes"}`;
}
