import { useCloudEstherOpcional, type PlanId } from "@/lib/cloud-esther/data";

/* Ubicación: src/lib/cloud-esther/niveles.ts
   Nivel de funcionalidad de cada módulo según el plan contratado.
   USO INTERNO: estas palabras nunca se muestran en la interfaz. El menú muestra solo el nombre
   profesional del módulo y cada pantalla habilita o no sus funciones según este nivel.

   - basico:   lo esencial para trabajar (Start).
   - avanzado: herramientas de gestión y seguimiento (Pro).
   - completo: todo, con automatizaciones e IA (Plus y Enterprise). */

export type NivelModulo = "basico" | "avanzado" | "completo";

const B = "basico" as const;
const A = "avanzado" as const;
const C = "completo" as const;

/** Nivel por módulo y plan. Un módulo que el plan no incluye no figura (no se usa). */
const NIVELES: Record<string, Partial<Record<PlanId, NivelModulo>>> = {
  agenda: { inicial: B, profesional: A, avanzada: C, grupo: C },
  odontograma: { inicial: B, profesional: A },
  estudios: { inicial: B, profesional: A, avanzada: C, grupo: C },
  laboratorio: { inicial: B, profesional: A, avanzada: C, grupo: C },
  comunicaciones: { inicial: B, profesional: A, avanzada: C, grupo: C },
  notificaciones: { inicial: B, profesional: A, avanzada: C, grupo: C },
  configuracion: { inicial: B, profesional: A, avanzada: C, grupo: C },
  facturacion: { profesional: A, avanzada: C, grupo: C },
  integraciones: { profesional: B, avanzada: A, grupo: C },
};

const ORDEN: Record<NivelModulo, number> = { basico: 1, avanzado: 2, completo: 3 };

export function nivelModulo(modulo: string, plan: PlanId): NivelModulo {
  return NIVELES[modulo]?.[plan] ?? C;
}

/** ¿El nivel del módulo en este plan llega al pedido? */
export function tieneNivel(modulo: string, plan: PlanId, minimo: NivelModulo) {
  return ORDEN[nivelModulo(modulo, plan)] >= ORDEN[minimo];
}

/** Hook: nivel del módulo para el plan actual y ayudante para preguntar por un mínimo. */
export function useNivel(modulo: string) {
  // Fuera del SaaS (portales) no hay plan en contexto: se muestra la versión completa.
  const plan = useCloudEstherOpcional()?.plan ?? "grupo";
  const nivel = nivelModulo(modulo, plan);
  return {
    plan,
    nivel,
    /** true si el plan tiene al menos ese nivel en este módulo. */
    desde: (minimo: NivelModulo) => ORDEN[nivel] >= ORDEN[minimo],
  };
}
