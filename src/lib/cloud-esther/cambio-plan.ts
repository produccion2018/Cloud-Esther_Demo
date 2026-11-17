import type { PlanId } from "@/lib/cloud-esther/data";

/* Ubicación: src/lib/cloud-esther/cambio-plan.ts
   Consecuencias de subir o bajar de plan, en un solo lugar para que digan EXACTAMENTE lo mismo
   en la clínica (pantalla «Mi plan») y en el panel de Cloud Esther (recordatorio para el asesor).
   Nada de esto borra datos: bajar de plan solo impide SUMAR por encima del nuevo tope.
   Pedido de Camilo (nov 2026): que el asesor recuerde avisarle al cliente antes de cambiar el plan. */

export const ORDEN_PLANES: PlanId[] = ["inicial", "profesional", "avanzada", "grupo"];

/** -1 si `destino` es inferior, 0 igual, 1 superior respecto del plan actual. */
export function direccionCambio(actual: PlanId, destino: PlanId): -1 | 0 | 1 {
  const d = ORDEN_PLANES.indexOf(destino) - ORDEN_PLANES.indexOf(actual);
  return d === 0 ? 0 : d > 0 ? 1 : -1;
}

/** Qué pasa al SUBIR de plan (más capacidad y módulos). */
export const CONSECUENCIAS_SUBIR: string[] = [
  "Se amplía la capacidad incluida: más pacientes activos, más usuarios internos y más sucursales.",
  "Se habilitan los módulos que incluye el plan superior.",
  "El nuevo precio se refleja en la próxima factura de Cloud Esther; no se pierde ningún dato.",
];

/** Qué pasa al BAJAR de plan (importante avisarlo antes). */
export const CONSECUENCIAS_BAJAR: string[] = [
  "No se borra ningún dato: los pacientes, historias, turnos y documentos quedan intactos.",
  "Si ya se supera el tope del plan menor, no se podrán cargar nuevos pacientes, usuarios ni sucursales hasta estar por debajo del límite (lo existente no se toca).",
  "Los módulos exclusivos del plan superior dejan de estar disponibles; sus datos quedan guardados y vuelven si se reactiva el plan.",
  "El nuevo precio, menor, se aplica desde el próximo período de facturación.",
];

/** Recordatorio corto para el asesor antes de cambiarle el plan a un cliente. */
export const RECORDATORIO_ASESOR =
  "Antes de cambiar el plan, recordale al cliente: al SUBIR se amplía la capacidad y se habilitan módulos (se ajusta la factura); al BAJAR no se borra nada, pero si ya supera el tope del plan menor no podrá cargar nuevos pacientes/usuarios/sucursales hasta estar por debajo del límite, y los módulos del plan superior dejan de estar disponibles.";

/** Las consecuencias que corresponde mostrar según la dirección del cambio. */
export function consecuenciasDe(actual: PlanId, destino: PlanId): string[] {
  const dir = direccionCambio(actual, destino);
  if (dir === 1) return CONSECUENCIAS_SUBIR;
  if (dir === -1) return CONSECUENCIAS_BAJAR;
  return [];
}
