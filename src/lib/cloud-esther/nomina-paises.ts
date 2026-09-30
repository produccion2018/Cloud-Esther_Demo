/* Ubicación: src/lib/cloud-esther/nomina-paises.ts

   Países donde la clínica puede contratar y los tipos de contrato de cada uno, con los
   porcentajes de referencia para liquidar. Son valores orientativos y editables desde
   RRHH → Reportes y ajustes → Configuración (cada país tiene su normativa y cambia seguido).
   TODO backend: tablas de tasas por país versionadas por fecha y validadas por un contador. */

export type PaisId = "AR" | "CO" | "MX" | "CL" | "UY" | "PE" | "ES" | "US";

/** dependencia: empleado en relación de dependencia (aportes + contribuciones).
    independiente: factura sus honorarios (sin aportes; puede tener retención de impuestos). */
export type ClaseContrato = "dependencia" | "independiente";

export type ContratoDef = {
  id: string;
  nombre: string;
  clase: ClaseContrato;
  aportesPct: number; // a cargo de la persona (jubilación, salud, etc.)
  patronalPct: number; // a cargo de la clínica
  retencionPct: number; // impuesto retenido en la fuente
  requiereFactura: boolean;
  plazoFijo: boolean;
  detalle: string;
};

export type PaisDef = {
  id: PaisId;
  nombre: string;
  bandera: string;
  moneda: string;
  cuenta: string; // cómo se llama el dato bancario
  adicionalesAR: boolean; // antigüedad y presentismo por convenio (Argentina)
  contratos: ContratoDef[];
};

const c = (
  id: string,
  nombre: string,
  clase: ClaseContrato,
  aportesPct: number,
  patronalPct: number,
  retencionPct: number,
  detalle: string,
  extra: Partial<ContratoDef> = {},
): ContratoDef => ({
  id,
  nombre,
  clase,
  aportesPct,
  patronalPct,
  retencionPct,
  requiereFactura: clase === "independiente",
  plazoFijo: false,
  detalle,
  ...extra,
});

export const PAISES: PaisDef[] = [
  {
    id: "AR",
    nombre: "Argentina",
    bandera: "🇦🇷",
    moneda: "ARS",
    cuenta: "CBU / alias",
    adicionalesAR: true,
    contratos: [
      c(
        "ar-dep",
        "Relación de dependencia",
        "dependencia",
        17,
        24,
        0,
        "Jubilación 11%, obra social 3%, PAMI 3%. Contribuciones patronales ~24%.",
      ),
      c(
        "ar-plazo",
        "Plazo fijo",
        "dependencia",
        17,
        24,
        0,
        "Igual que dependencia, con fecha de fin.",
        { plazoFijo: true },
      ),
      c(
        "ar-eventual",
        "Eventual por horas",
        "dependencia",
        17,
        24,
        0,
        "Se liquida por horas trabajadas.",
      ),
      c(
        "ar-mono",
        "Monotributo",
        "independiente",
        0,
        0,
        0,
        "Factura C por honorarios. Sin aportes ni retenciones.",
      ),
      c(
        "ar-pasantia",
        "Pasantía",
        "dependencia",
        0,
        2,
        0,
        "Asignación estímulo + ART. Sin aportes jubilatorios.",
      ),
    ],
  },
  {
    id: "CO",
    nombre: "Colombia",
    bandera: "🇨🇴",
    moneda: "COP",
    cuenta: "Cuenta bancaria",
    adicionalesAR: false,
    contratos: [
      c(
        "co-indef",
        "Término indefinido",
        "dependencia",
        8,
        30,
        0,
        "Salud 4% y pensión 4%. Empleador: pensión, ARL, caja, ICBF, SENA (~30%).",
      ),
      c("co-fijo", "Término fijo", "dependencia", 8, 30, 0, "Como indefinido, con fecha de fin.", {
        plazoFijo: true,
      }),
      c(
        "co-servicios",
        "Prestación de servicios",
        "independiente",
        0,
        0,
        10,
        "Cuenta de cobro/factura. Retención en la fuente 10%.",
      ),
      c(
        "co-horas",
        "Contrato por horas",
        "dependencia",
        8,
        30,
        0,
        "Salario proporcional a las horas trabajadas.",
      ),
    ],
  },
  {
    id: "MX",
    nombre: "México",
    bandera: "🇲🇽",
    moneda: "MXN",
    cuenta: "CLABE",
    adicionalesAR: false,
    contratos: [
      c(
        "mx-nomina",
        "Sueldos y salarios",
        "dependencia",
        3,
        25,
        10,
        "IMSS obrero ~3% e ISR retenido. Cuotas patronales ~25%.",
      ),
      c(
        "mx-asimilados",
        "Asimilados a salarios",
        "independiente",
        0,
        0,
        10,
        "Sin IMSS. Retención de ISR.",
        { requiereFactura: false },
      ),
      c(
        "mx-honorarios",
        "Honorarios (RESICO)",
        "independiente",
        0,
        0,
        1.25,
        "CFDI de honorarios. Retención ISR 1,25%.",
      ),
    ],
  },
  {
    id: "CL",
    nombre: "Chile",
    bandera: "🇨🇱",
    moneda: "CLP",
    cuenta: "Cuenta bancaria",
    adicionalesAR: false,
    contratos: [
      c(
        "cl-indef",
        "Contrato indefinido",
        "dependencia",
        19,
        5,
        0,
        "AFP ~11,4%, salud 7%, seguro de cesantía 0,6%.",
      ),
      c("cl-plazo", "Plazo fijo", "dependencia", 19, 5, 0, "Con fecha de término.", {
        plazoFijo: true,
      }),
      c(
        "cl-honorarios",
        "Boleta de honorarios",
        "independiente",
        0,
        0,
        15.25,
        "Retención de honorarios 15,25%.",
      ),
    ],
  },
  {
    id: "UY",
    nombre: "Uruguay",
    bandera: "🇺🇾",
    moneda: "UYU",
    cuenta: "Cuenta bancaria",
    adicionalesAR: false,
    contratos: [
      c("uy-dep", "Dependiente", "dependencia", 19.6, 12.6, 0, "BPS 15%, FONASA 4,5%, FRL 0,1%."),
      c(
        "uy-unipersonal",
        "Empresa unipersonal",
        "independiente",
        0,
        0,
        0,
        "Factura sus servicios.",
      ),
    ],
  },
  {
    id: "PE",
    nombre: "Perú",
    bandera: "🇵🇪",
    moneda: "PEN",
    cuenta: "Cuenta bancaria / CCI",
    adicionalesAR: false,
    contratos: [
      c(
        "pe-planilla",
        "Planilla (indeterminado)",
        "dependencia",
        13,
        9,
        0,
        "ONP 13% o AFP. EsSalud 9% a cargo del empleador.",
      ),
      c(
        "pe-honorarios",
        "Recibo por honorarios",
        "independiente",
        0,
        0,
        8,
        "4.ª categoría: retención 8%.",
      ),
    ],
  },
  {
    id: "ES",
    nombre: "España",
    bandera: "🇪🇸",
    moneda: "EUR",
    cuenta: "IBAN",
    adicionalesAR: false,
    contratos: [
      c(
        "es-indef",
        "Indefinido",
        "dependencia",
        6.47,
        31.4,
        15,
        "Seguridad Social 6,47% + IRPF. Empresa ~31,4%.",
      ),
      c("es-temporal", "Temporal", "dependencia", 6.47, 32.6, 15, "Con fecha de fin.", {
        plazoFijo: true,
      }),
      c(
        "es-autonomo",
        "Autónomo (factura)",
        "independiente",
        0,
        0,
        15,
        "Factura con retención de IRPF 15%.",
      ),
    ],
  },
  {
    id: "US",
    nombre: "Estados Unidos",
    bandera: "🇺🇸",
    moneda: "USD",
    cuenta: "Routing + account",
    adicionalesAR: false,
    contratos: [
      c(
        "us-w2",
        "Employee (W-2)",
        "dependencia",
        7.65,
        9.65,
        12,
        "FICA 7,65% + federal withholding. Empleador FICA + FUTA/SUTA.",
      ),
      c(
        "us-1099",
        "Contractor (1099)",
        "independiente",
        0,
        0,
        0,
        "Factura sus servicios, sin retenciones.",
      ),
    ],
  },
];

export const ESQUEMAS = ["Mensual", "Por hora", "Por comisión", "Mixto"] as const;
export type EsquemaPago = (typeof ESQUEMAS)[number];

export function paisDe(id: string | undefined): PaisDef {
  return PAISES.find((p) => p.id === id) ?? PAISES[0]!;
}
export function contratoDe(id: string | undefined, pais?: string): ContratoDef {
  for (const p of PAISES) {
    const x = p.contratos.find((k) => k.id === id);
    if (x) return x;
  }
  return paisDe(pais).contratos[0]!;
}
/** Contrato por nombre (para datos guardados antes de que existieran los países). */
export function contratoPorNombre(nombre: string): ContratoDef {
  const n = nombre.toLocaleLowerCase("es");
  for (const p of PAISES) {
    const x = p.contratos.find((k) => k.nombre.toLocaleLowerCase("es") === n);
    if (x) return x;
  }
  return PAISES[0]!.contratos[0]!;
}

/** Cotizaciones de referencia: cuántas unidades de cada moneda equivalen a 1 USD. */
export const COTIZACIONES_INICIALES: Record<string, number> = {
  USD: 1,
  ARS: 1450,
  COP: 4100,
  MXN: 18.5,
  CLP: 950,
  UYU: 40,
  PEN: 3.75,
  EUR: 0.92,
};

export function formatoMoneda(n: number, moneda: string) {
  const simbolo: Record<string, string> = {
    ARS: "$",
    COP: "$",
    MXN: "$",
    CLP: "$",
    UYU: "$U",
    PEN: "S/",
    EUR: "€",
    USD: "US$",
  };
  const decimales = moneda === "EUR" || moneda === "USD" || moneda === "PEN" ? 2 : 0;
  return `${simbolo[moneda] ?? moneda} ${n.toLocaleString("es-AR", { minimumFractionDigits: decimales, maximumFractionDigits: decimales })}${moneda === "ARS" ? "" : ` ${moneda}`}`;
}
