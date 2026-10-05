import { useEffect, useState } from "react";

import type { PaisOperacion } from "@/lib/admin/tipos-empresa";

/* Ubicación: src/lib/paises.ts
   Países donde se vende Cloud Esther. Los elige el dueño en su panel (/admin/paises → «Países
   seleccionados») y la configuración de cada clínica solo ofrece esos países.
   TODO backend: GET /paises (públicos, solo los seleccionados) y PUT /admin/empresa/paises. */

/** Países hispanohablantes de Latinoamérica y España (incluye México). Brasil queda afuera
 *  hasta tener la versión en portugués. Datos fiscales de referencia: verificarlos con un
 *  contador de cada país antes de facturar. Datos de ejemplo hasta conectar el backend. */
export const PAISES_BASE: PaisOperacion[] = [
  {
    id: "pais-ar",
    codigo: "AR",
    nombre: "Argentina",
    estado: "Activo",
    moneda: "ARS · Peso argentino",
    facturacion: "ARCA (ex AFIP) · factura electrónica",
    impuesto: "IVA 21 %",
    zonaHoraria: "America/Argentina/Buenos_Aires (UTC−3)",
    desde: "2025-03-01",
    notas: "País de origen. Cobro en pesos y en dólares.",
  },
  {
    id: "pais-uy",
    codigo: "UY",
    nombre: "Uruguay",
    estado: "Activo",
    moneda: "UYU · Peso uruguayo",
    facturacion: "DGI · CFE (comprobante fiscal electrónico)",
    impuesto: "IVA 22 %",
    zonaHoraria: "America/Montevideo (UTC−3)",
    desde: "2026-02-01",
    notas: "",
  },
  {
    id: "pais-cl",
    codigo: "CL",
    nombre: "Chile",
    estado: "Activo",
    moneda: "CLP · Peso chileno",
    facturacion: "SII · boleta y factura electrónica",
    impuesto: "IVA 19 %",
    zonaHoraria: "America/Santiago (UTC−4/−3)",
    desde: "2026-06-01",
    notas: "",
  },
  {
    id: "pais-mx",
    codigo: "MX",
    nombre: "México",
    estado: "Próximamente",
    moneda: "MXN · Peso mexicano",
    facturacion: "SAT · CFDI 4.0",
    impuesto: "IVA 16 %",
    zonaHoraria: "America/Mexico_City (UTC−6)",
    desde: "",
    notas: "",
  },
  {
    id: "pais-co",
    codigo: "CO",
    nombre: "Colombia",
    estado: "Próximamente",
    moneda: "COP · Peso colombiano",
    facturacion: "DIAN · factura electrónica",
    impuesto: "IVA 19 %",
    zonaHoraria: "America/Bogota (UTC−5)",
    desde: "",
    notas: "",
  },
  {
    id: "pais-pe",
    codigo: "PE",
    nombre: "Perú",
    estado: "Próximamente",
    moneda: "PEN · Sol",
    facturacion: "SUNAT · comprobante de pago electrónico",
    impuesto: "IGV 18 %",
    zonaHoraria: "America/Lima (UTC−5)",
    desde: "",
    notas: "",
  },
  {
    id: "pais-ec",
    codigo: "EC",
    nombre: "Ecuador",
    estado: "Próximamente",
    moneda: "USD · Dólar estadounidense",
    facturacion: "SRI · comprobante electrónico",
    impuesto: "IVA 15 %",
    zonaHoraria: "America/Guayaquil (UTC−5)",
    desde: "",
    notas: "",
  },
  {
    id: "pais-bo",
    codigo: "BO",
    nombre: "Bolivia",
    estado: "Próximamente",
    moneda: "BOB · Boliviano",
    facturacion: "SIN · facturación en línea",
    impuesto: "IVA 13 %",
    zonaHoraria: "America/La_Paz (UTC−4)",
    desde: "",
    notas: "",
  },
  {
    id: "pais-py",
    codigo: "PY",
    nombre: "Paraguay",
    estado: "Próximamente",
    moneda: "PYG · Guaraní",
    facturacion: "DNIT (ex SET) · SIFEN",
    impuesto: "IVA 10 %",
    zonaHoraria: "America/Asuncion (UTC−3)",
    desde: "",
    notas: "Evaluando socio local para la implementación.",
  },
  {
    id: "pais-ve",
    codigo: "VE",
    nombre: "Venezuela",
    estado: "Próximamente",
    moneda: "VES · Bolívar",
    facturacion: "SENIAT · factura fiscal",
    impuesto: "IVA 16 %",
    zonaHoraria: "America/Caracas (UTC−4)",
    desde: "",
    notas: "",
  },
  {
    id: "pais-cr",
    codigo: "CR",
    nombre: "Costa Rica",
    estado: "Próximamente",
    moneda: "CRC · Colón",
    facturacion: "Ministerio de Hacienda · comprobante electrónico",
    impuesto: "IVA 13 %",
    zonaHoraria: "America/Costa_Rica (UTC−6)",
    desde: "",
    notas: "",
  },
  {
    id: "pais-pa",
    codigo: "PA",
    nombre: "Panamá",
    estado: "Próximamente",
    moneda: "PAB / USD",
    facturacion: "DGI · factura electrónica",
    impuesto: "ITBMS 7 %",
    zonaHoraria: "America/Panama (UTC−5)",
    desde: "",
    notas: "",
  },
  {
    id: "pais-gt",
    codigo: "GT",
    nombre: "Guatemala",
    estado: "Próximamente",
    moneda: "GTQ · Quetzal",
    facturacion: "SAT · FEL (factura electrónica en línea)",
    impuesto: "IVA 12 %",
    zonaHoraria: "America/Guatemala (UTC−6)",
    desde: "",
    notas: "",
  },
  {
    id: "pais-hn",
    codigo: "HN",
    nombre: "Honduras",
    estado: "Próximamente",
    moneda: "HNL · Lempira",
    facturacion: "SAR · facturación",
    impuesto: "ISV 15 %",
    zonaHoraria: "America/Tegucigalpa (UTC−6)",
    desde: "",
    notas: "",
  },
  {
    id: "pais-sv",
    codigo: "SV",
    nombre: "El Salvador",
    estado: "Próximamente",
    moneda: "USD · Dólar estadounidense",
    facturacion: "Ministerio de Hacienda · DTE",
    impuesto: "IVA 13 %",
    zonaHoraria: "America/El_Salvador (UTC−6)",
    desde: "",
    notas: "",
  },
  {
    id: "pais-ni",
    codigo: "NI",
    nombre: "Nicaragua",
    estado: "Próximamente",
    moneda: "NIO · Córdoba",
    facturacion: "DGI · facturación",
    impuesto: "IVA 15 %",
    zonaHoraria: "America/Managua (UTC−6)",
    desde: "",
    notas: "",
  },
  {
    id: "pais-do",
    codigo: "DO",
    nombre: "República Dominicana",
    estado: "Próximamente",
    moneda: "DOP · Peso dominicano",
    facturacion: "DGII · e-CF (comprobante fiscal electrónico)",
    impuesto: "ITBIS 18 %",
    zonaHoraria: "America/Santo_Domingo (UTC−4)",
    desde: "",
    notas: "",
  },
  {
    id: "pais-cu",
    codigo: "CU",
    nombre: "Cuba",
    estado: "Próximamente",
    moneda: "CUP · Peso cubano",
    facturacion: "ONAT",
    impuesto: "A definir",
    zonaHoraria: "America/Havana (UTC−5/−4)",
    desde: "",
    notas: "",
  },
  {
    id: "pais-pr",
    codigo: "PR",
    nombre: "Puerto Rico",
    estado: "Próximamente",
    moneda: "USD · Dólar estadounidense",
    facturacion: "Departamento de Hacienda · SURI",
    impuesto: "IVU 11,5 %",
    zonaHoraria: "America/Puerto_Rico (UTC−4)",
    desde: "",
    notas: "",
  },
  {
    id: "pais-es",
    codigo: "ES",
    nombre: "España",
    estado: "Próximamente",
    moneda: "EUR · Euro",
    facturacion: "AEAT · factura electrónica (Verifactu)",
    impuesto: "IVA 21 % (sanidad: exento)",
    zonaHoraria: "Europe/Madrid (UTC+1/+2)",
    desde: "",
    notas: "",
  },
];

/** Completa una lista guardada con los países que falten (sin pisar lo que eligió el dueño). */
export function completarPaises(guardados: PaisOperacion[]): PaisOperacion[] {
  const codigos = new Set(guardados.map((p) => p.codigo.toUpperCase()));
  return [...guardados, ...PAISES_BASE.filter((p) => !codigos.has(p.codigo))];
}

/** Todos los países donde Cloud Esther puede operar (para selectores de configuración). */
export const PAISES_SOPORTADOS = PAISES_BASE;

/** Un país está «seleccionado» (se vende y las clínicas pueden elegirlo) cuando está Activo. */
export const estaSeleccionado = (p: PaisOperacion) => p.estado === "Activo";

/** Bandera a partir del código ISO (AR → 🇦🇷). */
export function bandera(codigo: string) {
  const c = codigo.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(c)) return "🌐";
  return String.fromCodePoint(...[...c].map((l) => 0x1f1e6 + l.charCodeAt(0) - 65));
}

/** Países seleccionados por el dueño. En modo local se leen de los datos del panel. */
export function leerPaisesSeleccionados(): PaisOperacion[] {
  let lista = PAISES_BASE;
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem("cloud-esther-admin:datos");
      const guardados = raw
        ? (JSON.parse(raw) as { colecciones?: { paises?: PaisOperacion[] } }).colecciones?.paises
        : undefined;
      if (Array.isArray(guardados) && guardados.length) lista = completarPaises(guardados);
    } catch {
      /* datos corruptos: se usan los de ejemplo */
    }
  }
  return lista.filter(estaSeleccionado);
}

/** Hook: países seleccionados (se leen después de montar, igual en servidor y cliente). */
export function usePaisesSeleccionados() {
  const [paises, setPaises] = useState<PaisOperacion[]>(() => PAISES_BASE.filter(estaSeleccionado));
  useEffect(() => setPaises(leerPaisesSeleccionados()), []);
  return paises;
}
