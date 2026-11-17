import { useCloudEstherOpcional } from "@/lib/cloud-esther/data";
import { useClinicSettings } from "@/lib/cloud-esther/settings-store";

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

/** Hook: términos según el país configurado en la clínica actual. Fuera del proveedor
    (ej. pantallas públicas) devuelve términos neutros, nunca rompe. */
export function useTerminologia(): Termino {
  const ctx = useCloudEstherOpcional();
  const settings = useClinicSettings(ctx?.clinic ?? "");
  return terminologiaDe(settings.datosClinica?.pais);
}
