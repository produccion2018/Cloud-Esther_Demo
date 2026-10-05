import { useEffect, useState } from "react";

import type { PaisOperacion } from "@/lib/admin/tipos-empresa";

/* Ubicación: src/lib/paises.ts
   Países donde se vende Cloud Esther. Los elige el dueño en su panel (/admin/paises → «Países
   seleccionados») y la configuración de cada clínica solo ofrece esos países.
   TODO backend: GET /paises (públicos, solo los seleccionados) y PUT /admin/empresa/paises. */

/** Datos de ejemplo hasta conectar el backend. */
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
    id: "pais-py",
    codigo: "PY",
    nombre: "Paraguay",
    estado: "Próximamente",
    moneda: "PYG · Guaraní",
    facturacion: "SET · SIFEN",
    impuesto: "IVA 10 %",
    zonaHoraria: "America/Asuncion (UTC−3)",
    desde: "",
    notas: "Evaluando socio local para la implementación.",
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
];

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
      if (Array.isArray(guardados) && guardados.length) lista = guardados;
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
