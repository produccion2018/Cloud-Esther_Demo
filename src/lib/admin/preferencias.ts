import { useSyncExternalStore } from "react";

/* Ubicación: src/lib/admin/preferencias.ts
   Apariencia del panel (modo claro/oscuro y color del menú). Es propia del panel: no
   comparte nada con el demo ni con las clínicas. Se guarda en este navegador.
   TODO backend: guardarla en el perfil del usuario para que lo siga en otros equipos. */

export type Tema = "claro" | "oscuro" | "sistema";
export type ColorLateral = "violeta" | "medianoche" | "grafito" | "ciruela" | "claro";
export type Preferencias = { tema: Tema; lateral: ColorLateral };

export const COLORES_LATERAL: { id: ColorLateral; label: string; muestra: string }[] = [
  { id: "violeta", label: "Violeta", muestra: "oklch(0.26 0.09 291)" },
  { id: "medianoche", label: "Medianoche", muestra: "oklch(0.2 0.04 270)" },
  { id: "grafito", label: "Grafito", muestra: "oklch(0.22 0.01 290)" },
  { id: "ciruela", label: "Ciruela", muestra: "oklch(0.28 0.1 335)" },
  { id: "claro", label: "Claro", muestra: "oklch(0.975 0.012 300)" },
];

const KEY = "cloud-esther-admin:preferencias";
const INICIAL: Preferencias = { tema: "claro", lateral: "violeta" };
let actual: Preferencias | null = null;
const oyentes = new Set<() => void>();

export function leerPreferencias(): Preferencias {
  if (actual) return actual;
  if (typeof window === "undefined") return INICIAL;
  try {
    actual = {
      ...INICIAL,
      ...(JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as Partial<Preferencias>),
    };
  } catch {
    actual = INICIAL;
  }
  return actual;
}

function oscuroDelSistema() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Aplica la apariencia al documento (se llama al entrar al panel y al cambiarla). */
export function aplicarPreferencias(p = leerPreferencias()) {
  if (typeof document === "undefined") return;
  const raiz = document.documentElement;
  raiz.classList.toggle(
    "dark",
    p.tema === "oscuro" || (p.tema === "sistema" && oscuroDelSistema()),
  );
  raiz.dataset["lateral"] = p.lateral;
}

/** Quita la apariencia del panel (por ejemplo, al salir a una pantalla pública). */
export function limpiarPreferencias() {
  if (typeof document === "undefined") return;
  document.documentElement.classList.remove("dark");
  delete document.documentElement.dataset["lateral"];
}

export function guardarPreferencias(cambios: Partial<Preferencias>) {
  actual = { ...leerPreferencias(), ...cambios };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(actual));
  } catch {
    /* sin almacenamiento */
  }
  aplicarPreferencias(actual);
  oyentes.forEach((o) => o());
}

export function usePreferencias() {
  return useSyncExternalStore(
    (o) => {
      oyentes.add(o);
      return () => oyentes.delete(o);
    },
    leerPreferencias,
    () => INICIAL,
  );
}
