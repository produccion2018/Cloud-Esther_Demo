import { useSyncExternalStore } from "react";
import type { PlanId } from "@/lib/cloud-esther/data";

/* Ubicación: src/lib/cloud-esther/planes-config.ts
   Configuración comercial de los planes: precio, descuento anual, límites y el odontograma que
   usa cada plan. Es de la plataforma (no de cada clínica): la administra Cloud Esther desde su
   panel. Mientras no hay backend se guarda en el navegador con estos valores iniciales.
   TODO backend: GET /planes (lectura pública) y PUT /admin/planes/:id (panel administrativo). */

export type ModuloOdontograma = "2d" | "3d";

export type ConfigPlan = {
  /** Precio mensual en US$. null = todavía sin definir (se muestra «US$ —»). */
  precioMensual: number | null;
  /** Descuento de la modalidad anual (0,15 = 15 %). */
  descuentoAnual: number;
  sucursales: number;
  usuariosInternos: number;
  /** Los pacientes archivados no cuentan para este límite. */
  pacientesActivos: number;
  odontograma: ModuloOdontograma;
};

export const CONFIG_PLANES_INICIAL: Record<PlanId, ConfigPlan> = {
  inicial: {
    precioMensual: null,
    descuentoAnual: 0.15,
    sucursales: 1,
    usuariosInternos: 5,
    pacientesActivos: 500,
    odontograma: "2d",
  },
  profesional: {
    precioMensual: null,
    descuentoAnual: 0.15,
    sucursales: 3,
    usuariosInternos: 15,
    pacientesActivos: 2000,
    odontograma: "2d",
  },
  avanzada: {
    precioMensual: null,
    descuentoAnual: 0.15,
    sucursales: 6,
    usuariosInternos: 40,
    pacientesActivos: 5000,
    odontograma: "3d",
  },
  grupo: {
    precioMensual: null,
    descuentoAnual: 0.15,
    sucursales: 20,
    usuariosInternos: 150,
    pacientesActivos: 15000,
    odontograma: "3d",
  },
};

const CLAVE = "cloud-esther:config-planes";
const oyentes = new Set<() => void>();
let actual: Record<PlanId, ConfigPlan> = CONFIG_PLANES_INICIAL;
let cargado = false;

function cargar() {
  if (cargado || typeof window === "undefined") return;
  cargado = true;
  try {
    const raw = window.localStorage.getItem(CLAVE);
    if (raw) {
      const guardado = JSON.parse(raw) as Partial<Record<PlanId, Partial<ConfigPlan>>>;
      actual = Object.fromEntries(
        (Object.keys(CONFIG_PLANES_INICIAL) as PlanId[]).map((id) => [
          id,
          // El odontograma de cada plan es una regla fija del producto: no se toma del guardado.
          {
            ...CONFIG_PLANES_INICIAL[id],
            ...guardado[id],
            odontograma: CONFIG_PLANES_INICIAL[id].odontograma,
          },
        ]),
      ) as Record<PlanId, ConfigPlan>;
    }
  } catch {
    /* sin almacenamiento: valores iniciales */
  }
}

export function leerConfigPlanes() {
  cargar();
  return actual;
}

/** Para el panel administrativo (y luego el backend). */
export function guardarConfigPlan(id: PlanId, cambios: Partial<Omit<ConfigPlan, "odontograma">>) {
  cargar();
  actual = { ...actual, [id]: { ...actual[id], ...cambios } };
  try {
    window.localStorage.setItem(CLAVE, JSON.stringify(actual));
  } catch {
    /* sin almacenamiento */
  }
  oyentes.forEach((o) => o());
}

export function useConfigPlanes() {
  return useSyncExternalStore(
    (o) => {
      oyentes.add(o);
      return () => oyentes.delete(o);
    },
    leerConfigPlanes,
    () => CONFIG_PLANES_INICIAL,
  );
}

/* ───────────── Reglas ───────────── */

/** START y PRO → Odontograma 2D · PLUS y ENTERPRISE → Odontograma 3D. Son módulos distintos. */
export function odontogramaDelPlan(plan: PlanId): ModuloOdontograma {
  return CONFIG_PLANES_INICIAL[plan].odontograma;
}

/** Precio anual = precio mensual × 12 × (1 − descuento). */
export function precioAnual(c: ConfigPlan) {
  return c.precioMensual === null
    ? null
    : Math.round(c.precioMensual * 12 * (1 - c.descuentoAnual));
}

export function formatearPrecio(n: number | null) {
  return n === null ? "US$ —" : `US$\u00a0${n.toLocaleString("es-AR")}`;
}

const miles = (n: number) => n.toLocaleString("es-AR");

export function textoLimites(c: ConfigPlan) {
  return {
    sucursales: c.sucursales === 1 ? "1 sucursal" : `Hasta ${miles(c.sucursales)} sucursales`,
    usuarios: `Hasta ${miles(c.usuariosInternos)} usuarios internos`,
    pacientes: `Hasta ${miles(c.pacientesActivos)} pacientes activos`,
  };
}

export function notaCapacidad(plan: PlanId) {
  return plan === "grupo"
    ? "Capacidad ampliada según necesidad."
    : "Capacidad adicional disponible bajo solicitud.";
}

export type TipoLimite = "pacientes" | "usuarios" | "sucursales";

export const MENSAJE_LIMITE: Record<TipoLimite, string> = {
  pacientes:
    "Has alcanzado el límite de pacientes activos incluido en tu plan. Contacta con administración para ampliar la capacidad.",
  usuarios:
    "Has alcanzado el límite de usuarios internos incluido en tu plan. Contacta con administración para ampliar la capacidad.",
  sucursales:
    "Has alcanzado el límite de sucursales incluido en tu plan. Contacta con administración para ampliar la capacidad.",
};

/** ¿Se puede sumar uno más? (no borra nada: solo impide superar el límite). */
export function dentroDelLimite(plan: PlanId, tipo: TipoLimite, usados: number) {
  const c = leerConfigPlanes()[plan];
  const max =
    tipo === "pacientes"
      ? c.pacientesActivos
      : tipo === "usuarios"
        ? c.usuariosInternos
        : c.sucursales;
  return usados < max;
}
