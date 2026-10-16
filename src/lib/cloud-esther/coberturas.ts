import { useCloudEstherOpcional } from "@/lib/cloud-esther/data";
import { storePresupuestos, type Cobertura, type TipoCobertura } from "@/lib/cloud-esther/presupuestos-store";
import { useClinicSettings } from "@/lib/cloud-esther/settings-store";

/* Ubicación: src/lib/cloud-esther/coberturas.ts
   COBERTURAS Y NOMENCLADOR (Argentina y el resto de los países).
   - Cada clínica arma SU catálogo: puede sumar de una vez las coberturas más conocidas de su país
     (lista sugerida, solo nombres: revisarla) o importarlas desde Excel/CSV.
   - El nombre cambia según el país: obra social / prepaga (AR), mutualista (UY), Isapre/Fonasa (CL),
     EPS (CO), seguro (MX, PE, ES…).
   - Se guarda junto a los aranceles (módulo «presupuestos-config»: lo cambia solo el Administrador).
   No se precargan códigos oficiales de prácticas: cambian por país y por entidad, así que el
   nomenclador lo arma cada clínica (desde sus aranceles o importando la planilla de la entidad). */

/** Coberturas conocidas por país (solo nombres, para empezar rápido; la clínica las revisa) */
export const COBERTURAS_SUGERIDAS: Record<string, { nombre: string; tipo: TipoCobertura }[]> = {
  AR: [
    { nombre: "OSDE", tipo: "Prepaga" },
    { nombre: "Swiss Medical", tipo: "Prepaga" },
    { nombre: "Galeno", tipo: "Prepaga" },
    { nombre: "Medifé", tipo: "Prepaga" },
    { nombre: "OMINT", tipo: "Prepaga" },
    { nombre: "Sancor Salud", tipo: "Prepaga" },
    { nombre: "Medicus", tipo: "Prepaga" },
    { nombre: "Prevención Salud", tipo: "Prepaga" },
    { nombre: "Accord Salud", tipo: "Prepaga" },
    { nombre: "Avalian", tipo: "Prepaga" },
    { nombre: "Federada Salud", tipo: "Prepaga" },
    { nombre: "Hospital Italiano – Plan de Salud", tipo: "Prepaga" },
    { nombre: "Hospital Alemán – Plan Médico", tipo: "Prepaga" },
    { nombre: "OSECAC", tipo: "Obra social" },
    { nombre: "OSDEPYM", tipo: "Obra social" },
    { nombre: "OSPRERA", tipo: "Obra social" },
    { nombre: "IOSFA", tipo: "Obra social" },
    { nombre: "PAMI", tipo: "Obra social" },
    { nombre: "IOMA (Buenos Aires)", tipo: "Obra social" },
    { nombre: "APROSS (Córdoba)", tipo: "Obra social" },
    { nombre: "IAPOS (Santa Fe)", tipo: "Obra social" },
    { nombre: "OSEP (Mendoza)", tipo: "Obra social" },
  ],
  UY: [
    { nombre: "ASSE", tipo: "Pública" },
    { nombre: "CASMU", tipo: "Mutualista" },
    { nombre: "Médica Uruguaya", tipo: "Mutualista" },
    { nombre: "Asociación Española", tipo: "Mutualista" },
    { nombre: "Hospital Británico", tipo: "Mutualista" },
    { nombre: "Hospital Evangélico", tipo: "Mutualista" },
    { nombre: "Círculo Católico", tipo: "Mutualista" },
    { nombre: "SMI – Servicio Médico Integral", tipo: "Mutualista" },
    { nombre: "MP – Medicina Personalizada", tipo: "Seguro" },
    { nombre: "SEMM", tipo: "Seguro" },
  ],
  CL: [
    { nombre: "Fonasa", tipo: "Pública" },
    { nombre: "Isapre Banmédica", tipo: "Prepaga" },
    { nombre: "Isapre Colmena", tipo: "Prepaga" },
    { nombre: "Isapre Consalud", tipo: "Prepaga" },
    { nombre: "Isapre Cruz Blanca", tipo: "Prepaga" },
    { nombre: "Isapre Nueva Masvida", tipo: "Prepaga" },
    { nombre: "Isapre Vida Tres", tipo: "Prepaga" },
    { nombre: "Isapre Esencial", tipo: "Prepaga" },
  ],
  MX: [
    { nombre: "IMSS", tipo: "Pública" },
    { nombre: "ISSSTE", tipo: "Pública" },
    { nombre: "GNP Seguros", tipo: "Seguro" },
    { nombre: "AXA Seguros", tipo: "Seguro" },
    { nombre: "MetLife", tipo: "Seguro" },
    { nombre: "Seguros Monterrey New York Life", tipo: "Seguro" },
    { nombre: "Allianz", tipo: "Seguro" },
    { nombre: "Mapfre", tipo: "Seguro" },
  ],
  CO: [
    { nombre: "Nueva EPS", tipo: "Obra social" },
    { nombre: "EPS Sura", tipo: "Obra social" },
    { nombre: "EPS Sanitas", tipo: "Obra social" },
    { nombre: "Compensar EPS", tipo: "Obra social" },
    { nombre: "Salud Total EPS", tipo: "Obra social" },
    { nombre: "Famisanar EPS", tipo: "Obra social" },
    { nombre: "Coosalud EPS", tipo: "Obra social" },
    { nombre: "Colsanitas (medicina prepagada)", tipo: "Prepaga" },
    { nombre: "Colmédica (medicina prepagada)", tipo: "Prepaga" },
  ],
  PE: [
    { nombre: "EsSalud", tipo: "Pública" },
    { nombre: "SIS – Seguro Integral de Salud", tipo: "Pública" },
    { nombre: "Rímac Seguros", tipo: "Seguro" },
    { nombre: "Pacífico Seguros", tipo: "Seguro" },
    { nombre: "Mapfre Perú", tipo: "Seguro" },
    { nombre: "La Positiva", tipo: "Seguro" },
    { nombre: "Sanitas Perú", tipo: "Seguro" },
  ],
  EC: [
    { nombre: "IESS", tipo: "Pública" },
    { nombre: "Salud S.A.", tipo: "Prepaga" },
    { nombre: "Confiamed", tipo: "Prepaga" },
    { nombre: "BMI", tipo: "Seguro" },
  ],
  PY: [
    { nombre: "IPS – Instituto de Previsión Social", tipo: "Pública" },
    { nombre: "Asismed", tipo: "Prepaga" },
    { nombre: "Santa Clara", tipo: "Prepaga" },
  ],
  BO: [
    { nombre: "Caja Nacional de Salud", tipo: "Pública" },
    { nombre: "Caja Petrolera de Salud", tipo: "Pública" },
    { nombre: "Caja Bancaria Estatal de Salud", tipo: "Pública" },
  ],
  ES: [
    { nombre: "Sanitas", tipo: "Seguro" },
    { nombre: "Adeslas", tipo: "Seguro" },
    { nombre: "DKV", tipo: "Seguro" },
    { nombre: "Asisa", tipo: "Seguro" },
    { nombre: "Mapfre Salud", tipo: "Seguro" },
    { nombre: "Cigna", tipo: "Seguro" },
    { nombre: "Caser Salud", tipo: "Seguro" },
  ],
};

/** Cómo se le dice a la cobertura en cada país */
export function nombreCobertura(pais: string): { singular: string; plural: string } {
  switch (pais) {
    case "AR":
      return { singular: "Obra social / prepaga", plural: "Obras sociales y prepagas" };
    case "UY":
      return { singular: "Mutualista / seguro", plural: "Mutualistas y seguros" };
    case "CL":
      return { singular: "Isapre / Fonasa", plural: "Isapres y Fonasa" };
    case "CO":
      return { singular: "EPS / prepagada", plural: "EPS y medicina prepagada" };
    case "ES":
      return { singular: "Aseguradora", plural: "Aseguradoras" };
    default:
      return { singular: "Seguro / cobertura", plural: "Seguros y coberturas" };
  }
}

export const PARTICULAR = "No aplica / particular";

/** País de la clínica (Configuración → datos de la clínica); Argentina si no está cargado */
export function usePaisClinica(): string {
  const ctx = useCloudEstherOpcional();
  const s = useClinicSettings(ctx?.clinic ?? "demo");
  return s.datosClinica.pais || "AR";
}

/** Nombres para elegir en la ficha del paciente: las coberturas activas de la clínica
    (o la lista de siempre si todavía no armó su catálogo). */
export function useNombresCobertura(respaldo: string[]): string[] {
  const { coberturas = [] } = storePresupuestos.usar();
  const activas = coberturas.filter((c) => c.activa).map((c) => c.nombre);
  if (!activas.length) return respaldo;
  return [PARTICULAR, ...activas.sort((a, b) => a.localeCompare(b, "es"))];
}

export function nuevaCobertura(nombre: string, tipo: TipoCobertura, pais: string): Cobertura {
  return {
    id: `cob-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    nombre: nombre.trim().slice(0, 80),
    tipo,
    pais,
    codigo: "",
    activa: true,
    requiereAutorizacion: false,
    notas: "",
  };
}
