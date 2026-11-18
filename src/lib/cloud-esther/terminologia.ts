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
  CL: { doc: "RUT", docLargo: "RUT", matricula: "N° de registro" },
  CO: { doc: "Cédula", docLargo: "Cédula de ciudadanía", matricula: "Registro profesional" },
  PE: { doc: "DNI", docLargo: "DNI", matricula: "N° de colegiatura" },
  EC: { doc: "Cédula", docLargo: "Cédula de identidad", matricula: "Registro profesional" },
  MX: { doc: "CURP", docLargo: "CURP", matricula: "Cédula profesional" },
  ES: { doc: "DNI/NIE", docLargo: "DNI o NIE", matricula: "N° de colegiado" },
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
    // 1) Idioma: "es-AR", "es_MX", "es-ES"… el sufijo es el país.
    const idiomas = [navigator.language, ...(navigator.languages ?? [])];
    for (const l of idiomas) {
      const cc = /[-_]([A-Za-z]{2})$/.exec(l ?? "")?.[1]?.toUpperCase();
      if (cc && POR_PAIS[cc]) return cc;
    }
    // 2) Zona horaria: "America/Argentina/Buenos_Aires", "Europe/Madrid"…
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
    for (const prefijo of Object.keys(TZ_PAIS)) {
      if (tz.startsWith(prefijo)) return TZ_PAIS[prefijo] ?? "";
    }
  } catch {
    /* algún navegador sin estas APIs: términos neutros */
  }
  return "";
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
  const pais = settings.datosClinica?.pais || detectarPais();
  return terminologiaDe(pais);
}
