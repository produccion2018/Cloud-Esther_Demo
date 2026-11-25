import { useCloudEstherOpcional } from "@/lib/cloud-esther/data";
import { useClinicSettings } from "@/lib/cloud-esther/settings-store";
import { useSesion } from "@/lib/cloud-esther/auth-store";

/* Ubicación: src/lib/cloud-esther/terminologia.ts
   Terminología por país (pedido de Camilo, nov 2026). Cloud Esther es internacional: cada país
   llama distinto al documento de identidad del paciente y a la matrícula del profesional. Mostrar
   el término local evita que la gente se confunda (un colombiano busca «cédula», no «DNI»).
   El país sale de la configuración de la clínica (settings.datosClinica.pais, código ISO).
   Si no hay país cargado, se usan términos neutros («Documento», «Matrícula / registro»). */

type Termino = {
  /** Etiqueta corta para formularios y columnas (ej. "DNI", "Cédula", "RUT"). */
  doc: string;
  /** Nombre completo para textos y ayudas (ej. "Cédula de ciudadanía"). */
  docLargo: string;
  /** Etiqueta del número de habilitación profesional (ej. "Matrícula", "Cédula profesional"). */
  matricula: string;
};

const NEUTRO: Termino = { doc: "Documento", docLargo: "Documento de identidad", matricula: "Matrícula / registro" };

// Términos por país (código ISO del país de la clínica). Revisados con Camilo.
const POR_PAIS: Record<string, Termino> = {
  AR: { doc: "DNI", docLargo: "DNI", matricula: "Matrícula" },
  UY: { doc: "CI", docLargo: "Cédula de identidad", matricula: "N° de registro (MSP)" },
  CL: { doc: "RUT", docLargo: "RUT", matricula: "N° de registro" },
  CO: { doc: "Cédula", docLargo: "Cédula de ciudadanía", matricula: "Registro profesional" },
  PE: { doc: "DNI", docLargo: "DNI", matricula: "N° de colegiatura" },
  EC: { doc: "Cédula", docLargo: "Cédula de identidad", matricula: "Registro profesional" },
  BO: { doc: "CI", docLargo: "Cédula de identidad", matricula: "Matrícula profesional" },
  PY: { doc: "CI", docLargo: "Cédula de identidad", matricula: "Registro profesional" },
  CR: { doc: "Cédula", docLargo: "Cédula de identidad", matricula: "Código de colegiado" },
  PA: { doc: "Cédula", docLargo: "Cédula de identidad personal", matricula: "N° de registro (idoneidad)" },
  GT: { doc: "DPI", docLargo: "Documento Personal de Identificación (DPI)", matricula: "N° de colegiado" },
  HN: { doc: "DNI", docLargo: "Documento Nacional de Identificación", matricula: "N° de colegiación" },
  SV: { doc: "DUI", docLargo: "Documento Único de Identidad (DUI)", matricula: "JVPO (registro profesional)" },
  DO: { doc: "Cédula", docLargo: "Cédula de identidad y electoral", matricula: "Exequátur" },
  PR: { doc: "ID", docLargo: "Identificación (licencia o ID)", matricula: "N° de licencia" },
  MX: { doc: "CURP", docLargo: "CURP", matricula: "Cédula profesional" },
  ES: { doc: "DNI/NIE", docLargo: "DNI o NIE", matricula: "N° de colegiado" },
  VE: { doc: "Cédula", docLargo: "Cédula de identidad", matricula: "N° de colegio (COV)" },
};

/** Términos del país indicado (código ISO). Sin país → términos neutros. */
export function terminologiaDe(pais: string | undefined): Termino {
  return POR_PAIS[(pais ?? "").trim().toUpperCase()] ?? NEUTRO;
}

// Zonas horarias → país, para los mercados que atendemos. Se usa solo si el navegador
// no trae el país en el idioma.
const TZ_PAIS: Record<string, string> = {
  "America/Argentina": "AR",
  "America/Buenos_Aires": "AR",
  "America/Cordoba": "AR",
  "America/Mendoza": "AR",
  "America/Montevideo": "UY",
  "America/La_Paz": "BO",
  "America/Asuncion": "PY",
  "America/Costa_Rica": "CR",
  "America/Panama": "PA",
  "America/Guatemala": "GT",
  "America/Tegucigalpa": "HN",
  "America/El_Salvador": "SV",
  "America/Santo_Domingo": "DO",
  "America/Puerto_Rico": "PR",
  "America/Caracas": "VE",
  "America/Santiago": "CL",
  "America/Punta_Arenas": "CL",
  "America/Bogota": "CO",
  "America/Lima": "PE",
  "America/Guayaquil": "EC",
  "America/Mexico_City": "MX",
  "America/Monterrey": "MX",
  "America/Cancun": "MX",
  "America/Tijuana": "MX",
  "Europe/Madrid": "ES",
  "Atlantic/Canary": "ES",
};

/** Detecta el país del navegador (idioma y, si no, zona horaria) para los países que atendemos.
    Sirve para que el DEMO (y cualquier clínica sin país configurado) muestre el término correcto
    sin que nadie toque la configuración. Devuelve "" si no lo puede determinar. */
export function detectarPais(): string {
  if (typeof window === "undefined") return "";
  try {
    // 1) Zona horaria: dice DÓNDE está ("America/Argentina/Buenos_Aires", "Europe/Madrid"…).
    //    Va primero: muchos celulares en español vienen con el idioma «es-ES» aunque estén en
    //    Argentina, y eso hacía pedir el DNI español (con letra).
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
    for (const prefijo of Object.keys(TZ_PAIS)) {
      if (tz.startsWith(prefijo)) return TZ_PAIS[prefijo] ?? "";
    }
    // 2) Idioma: "es-AR", "es_MX"… el sufijo es el país.
    const idiomas = [navigator.language, ...(navigator.languages ?? [])];
    for (const l of idiomas) {
      const cc = /[-_]([A-Za-z]{2})$/.exec(l ?? "")?.[1]?.toUpperCase();
      if (cc && POR_PAIS[cc]) return cc;
    }
  } catch {
    /* algún navegador sin estas APIs: términos neutros */
  }
  return "";
}

/** Clínica real: el país con el que contrató (viene en la sesión). "" en el demo. */
export function paisDeSesionClinica(): string {
  if (typeof window === "undefined") return "";
  try {
    const slug = window.sessionStorage.getItem("cloud-esther-clinica:activa");
    if (!slug) return "";
    const s = JSON.parse(window.sessionStorage.getItem(`cloud-esther-clinica:${slug}`) ?? "null") as {
      clinica?: { pais?: string };
    } | null;
    return (s?.clinica?.pais ?? "").toUpperCase();
  } catch {
    return "";
  }
}

/** País de la clínica: el que cargó en Configuración; si no, el que contrató; si no (demo),
    el del navegador. "" si no se sabe. */
export function paisEfectivo(configurado: string | undefined): string {
  return (configurado ?? "").trim().toUpperCase() || paisDeSesionClinica() || detectarPais();
}

/** Hook: términos según el país configurado en la clínica actual. Fuera del proveedor
    (ej. pantallas públicas) devuelve términos neutros, nunca rompe. */
export function useTerminologia(): Termino {
  const ctx = useCloudEstherOpcional();
  // Fuera del proveedor (portal público del paciente) no hay ctx, pero la sesión sí tiene la
  // clínica: así el portal también muestra el término del país correcto.
  const { clinica } = useSesion();
  const clinicId = ctx?.clinic ?? clinica?.id ?? "";
  const settings = useClinicSettings(clinicId);
  // Si la clínica configuró su país, manda ese. Si no (típico en el demo), se detecta del
  // navegador para mostrar igual el término correcto; si no se puede, quedan términos neutros.
  const pais = paisEfectivo(settings.datosClinica?.pais);
  return terminologiaDe(pais);
}

/* ───────────── Documento del paciente según el país ─────────────
   Cada país tiene su formato: DNI argentino (7-8 dígitos), CI uruguaya, RUT chileno (con dígito
   verificador que puede ser K), cédula colombiana (hasta 10), CURP mexicana (18 letras y números),
   DNI/NIE español (con letra), DPI guatemalteco (13)… Se guarda sin puntos ni guiones. */
type ReglaDoc = { re: RegExp; ejemplo: string; texto: string; numerico: boolean };
const DOC_POR_PAIS: Record<string, ReglaDoc> = {
  // DNI (7 u 8 dígitos; los viejos de 6) o CUIL/CUIT (11 dígitos)
  AR: { re: /^(\d{6,8}|\d{11})$/, ejemplo: "30.123.456", texto: "DNI de 7 u 8 dígitos o CUIL", numerico: true },
  UY: { re: /^\d{6,8}$/, ejemplo: "4.123.456-7", texto: "6 a 8 dígitos", numerico: true },
  CL: { re: /^\d{7,8}[\dK]$/, ejemplo: "12.345.678-K", texto: "RUT con dígito verificador", numerico: false },
  CO: { re: /^\d{6,10}$/, ejemplo: "1.020.304.050", texto: "6 a 10 dígitos", numerico: true },
  PE: { re: /^\d{8}$/, ejemplo: "45678912", texto: "8 dígitos", numerico: true },
  EC: { re: /^\d{10}$/, ejemplo: "1712345678", texto: "10 dígitos", numerico: true },
  BO: { re: /^[\dA-Z]{5,12}$/, ejemplo: "4567890", texto: "5 a 12 caracteres", numerico: false },
  PY: { re: /^\d{5,9}$/, ejemplo: "4.567.890", texto: "5 a 9 dígitos", numerico: true },
  CR: { re: /^\d{9,12}$/, ejemplo: "1-0234-0567", texto: "9 a 12 dígitos", numerico: true },
  PA: { re: /^[\dA-Z]{5,13}$/, ejemplo: "8-123-456", texto: "5 a 13 caracteres", numerico: false },
  GT: { re: /^\d{13}$/, ejemplo: "2345 67890 0101", texto: "13 dígitos", numerico: true },
  HN: { re: /^\d{13}$/, ejemplo: "0801-1990-12345", texto: "13 dígitos", numerico: true },
  SV: { re: /^\d{9}$/, ejemplo: "01234567-8", texto: "9 dígitos", numerico: true },
  DO: { re: /^\d{11}$/, ejemplo: "001-1234567-8", texto: "11 dígitos", numerico: true },
  MX: { re: /^[A-Z]{4}\d{6}[A-Z]{6}[\dA-Z]\d$/, ejemplo: "GOMC800101HDFRRR09", texto: "CURP de 18 caracteres", numerico: false },
  ES: { re: /^(\d{8}[A-Z]|[XYZ]\d{7}[A-Z])$/, ejemplo: "12345678Z", texto: "DNI o NIE con letra", numerico: false },
  VE: { re: /^[VE]?\d{6,9}$/, ejemplo: "V-12.345.678", texto: "6 a 9 dígitos", numerico: false },
  PR: { re: /^[\dA-Z]{4,20}$/, ejemplo: "1234567", texto: "4 a 20 caracteres", numerico: false },
};
const DOC_NEUTRO: ReglaDoc = { re: /^[\dA-Z]{4,20}$/, ejemplo: "12345678", texto: "4 a 20 letras o números", numerico: false };

/** Documento sin puntos, guiones ni espacios (y en mayúsculas). */
export function normalizarDocumento(v: string): string {
  return (v ?? "").toUpperCase().replace(/[^0-9A-ZÑ]/g, "");
}
export function reglaDocumento(pais: string | undefined): ReglaDoc {
  return DOC_POR_PAIS[(pais ?? "").trim().toUpperCase()] ?? DOC_NEUTRO;
}
/** null si está bien; si no, el motivo para mostrar.
 *  estricto=false (el país no lo configuró la clínica, solo se adivinó del navegador): se acepta
 *  también cualquier documento razonable, así nunca se rechaza un documento válido por error. */
export function validarDocumento(v: string, pais: string | undefined, estricto = true): string | null {
  const r = reglaDocumento(pais);
  const n = normalizarDocumento(v);
  if (r.re.test(n)) return null;
  if (!estricto && DOC_NEUTRO.re.test(n)) return null;
  return `Ingresá un documento válido (${r.texto}).`;
}
/** Cómo se muestra: con puntos de miles cuando es solo número (AR, UY, PY, CO); RUT con guion. */
export function formatoDocumento(doc: string, pais: string | undefined): string {
  const n = normalizarDocumento(doc);
  if (!n) return "";
  const p = (pais ?? "").trim().toUpperCase();
  const miles = (d: string) => d.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  if (p === "CL" && /^\d{7,8}[\dK]$/.test(n)) return `${miles(n.slice(0, -1))}-${n.slice(-1)}`;
  if (["AR", "UY", "PY", "CO", ""].includes(p) && /^\d+$/.test(n)) return miles(n);
  return n;
}
