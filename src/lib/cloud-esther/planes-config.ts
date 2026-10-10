import { useSyncExternalStore } from "react";
import type { PlanId } from "@/lib/cloud-esther/data";

/* Ubicación: src/lib/cloud-esther/planes-config.ts
   Configuración comercial de los planes: precio, descuento anual, límites y el odontograma que
   usa cada plan. Es de la plataforma (no de cada clínica): la administra Cloud Esther desde su
   panel.
   · CON backend (VITE_ADMIN_API_URL): los valores salen de GET /planes (ruta pública) y se
     vuelven a pedir al volver a la pestaña, así lo que se guarda en el panel se ve en la web.
   · SIN backend: se guarda en el navegador con estos valores iniciales. */

export type ModuloOdontograma = "2d" | "3d";

export type ConfigPlan = {
  /** Precio mensual en US$. null = todavía sin definir (se muestra «US$ —»). */
  precioMensual: number | null;
  /** Monto inicial en US$: se cobra UNA SOLA VEZ al contratar. null = sin definir (no se muestra). */
  precioInicial: number | null;
  /** Descuento de la modalidad anual (0,15 = 15 %). */
  descuentoAnual: number;
  /** Límites. Infinity = SIN LÍMITE (el backend lo manda como null). */
  sucursales: number;
  usuariosInternos: number;
  /** Los pacientes archivados no cuentan para este límite. */
  pacientesActivos: number;
  odontograma: ModuloOdontograma;
};

export const CONFIG_PLANES_INICIAL: Record<PlanId, ConfigPlan> = {
  inicial: {
    precioMensual: null,
    precioInicial: null,
    descuentoAnual: 0.15,
    sucursales: 1,
    usuariosInternos: 5,
    pacientesActivos: 500,
    odontograma: "2d",
  },
  profesional: {
    precioMensual: null,
    precioInicial: null,
    descuentoAnual: 0.15,
    sucursales: 3,
    usuariosInternos: 15,
    pacientesActivos: 2000,
    odontograma: "2d",
  },
  avanzada: {
    precioMensual: null,
    precioInicial: null,
    descuentoAnual: 0.15,
    sucursales: 6,
    usuariosInternos: 40,
    pacientesActivos: 5000,
    odontograma: "3d",
  },
  grupo: {
    precioMensual: null,
    precioInicial: null,
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

/* ───────────── Desde el backend (GET /planes, pública) ───────────── */

const API_URL = (import.meta.env["VITE_ADMIN_API_URL"] as string | undefined)?.replace(/\/$/, "");
const IDS: PlanId[] = ["inicial", "profesional", "avanzada", "grupo"];

type PlanServidor = {
  id: PlanId;
  precioMensual: number | null;
  precioInicial?: number | null;
  descuentoAnual: number;
  sucursales: number | null;
  usuariosInternos: number | null;
  pacientesActivos: number | null;
};

const sinLimite = (n: number | null) => (n === null ? Number.POSITIVE_INFINITY : n);
let ultimoPedido = 0;
let pidiendo = false;

/** Pide los planes al servidor (como mucho cada 15 s) y avisa a todas las pantallas. */
function traerDelServidor() {
  if (!API_URL || typeof window === "undefined" || pidiendo) return;
  if (Date.now() - ultimoPedido < 15_000) return;
  pidiendo = true;
  ultimoPedido = Date.now();
  fetch(`${API_URL}/planes`)
    .then((r) => (r.ok ? (r.json() as Promise<PlanServidor[]>) : Promise.reject(new Error())))
    .then((lista) => {
      const nuevo = { ...actual };
      for (const id of IDS) {
        const p = lista.find((x) => x.id === id);
        if (!p) continue;
        nuevo[id] = {
          precioMensual: p.precioMensual,
          precioInicial: p.precioInicial ?? null,
          descuentoAnual: p.descuentoAnual,
          sucursales: sinLimite(p.sucursales),
          usuariosInternos: sinLimite(p.usuariosInternos),
          pacientesActivos: sinLimite(p.pacientesActivos),
          // El odontograma es una regla fija del producto
          odontograma: CONFIG_PLANES_INICIAL[id].odontograma,
        };
      }
      actual = nuevo;
      oyentes.forEach((o) => o());
    })
    .catch(() => {
      /* sin conexión: se siguen mostrando los valores que ya había */
    })
    .finally(() => {
      pidiendo = false;
    });
}

if (typeof window !== "undefined" && API_URL) {
  window.addEventListener("focus", traerDelServidor);
}

function cargar() {
  if (cargado || typeof window === "undefined") return;
  cargado = true;
  // Con backend, la verdad está en el servidor: no se usa lo guardado en el navegador
  // (el pedido al servidor lo dispara cada pantalla que muestra planes, al abrirse)
  if (API_URL) return;
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
      traerDelServidor();
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
const finito = Number.isFinite;

/** Un límite para mostrar: número o «Sin límite». */
export function mostrarLimite(n: number) {
  return finito(n) ? miles(n) : "Sin límite";
}

export function textoLimites(c: ConfigPlan) {
  return {
    sucursales: !finito(c.sucursales)
      ? "Sucursales sin límite"
      : c.sucursales === 1
        ? "1 sucursal"
        : `Hasta ${miles(c.sucursales)} sucursales`,
    usuarios: finito(c.usuariosInternos)
      ? `Hasta ${miles(c.usuariosInternos)} usuarios internos`
      : "Usuarios internos sin límite",
    pacientes: finito(c.pacientesActivos)
      ? `Hasta ${miles(c.pacientesActivos)} pacientes activos`
      : "Pacientes activos sin límite",
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
