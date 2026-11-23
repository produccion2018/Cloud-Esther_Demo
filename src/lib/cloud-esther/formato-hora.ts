import { useCloudEsther } from "@/lib/cloud-esther/data";
import { useClinicSettings } from "@/lib/cloud-esther/settings-store";
import { paisEfectivo } from "@/lib/cloud-esther/terminologia";

/* ───────────────────────────────────────────────────────────────
   Formato de hora internacional (pedido de Camilo, nov 2026).
   Cloud Esther es internacional: no se impone el reloj de 24 h.
   Cada clínica muestra la hora en 12 h (a. m./p. m.) o 24 h según
   su preferencia; en "auto" se decide por el país.
   NUNCA cambia la hora real guardada: solo cómo se muestra.
   ─────────────────────────────────────────────────────────────── */

export type FormatoHora = "auto" | "12h" | "24h";

// Países (código ISO) donde se usa por costumbre el reloj de 12 h (a. m./p. m.).
// El resto (Argentina, Uruguay, Chile, Paraguay, España...) van en 24 h.
const PAISES_12H = new Set([
  "MX", "CO", "PE", "EC", "BO", "VE",
  "CR", "PA", "GT", "HN", "SV", "NI",
  "DO", "PR", "CU", "US",
]);

/** ¿Mostrar en 12 h (a. m./p. m.)? Según la preferencia o, en "auto", el país. */
export function usa12h(formato: FormatoHora, pais: string): boolean {
  if (formato === "12h") return true;
  if (formato === "24h") return false;
  return PAISES_12H.has((pais ?? "").trim().toUpperCase());
}

/** Convierte una hora a texto respetando 12/24 h. Acepta Date, ISO, o "HH:mm". */
export function formatearHora(
  valor: Date | string | number,
  formato: FormatoHora,
  pais: string,
): string {
  const fecha = aFecha(valor);
  if (!fecha) return typeof valor === "string" ? valor : "";
  return fecha.toLocaleTimeString("es", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: usa12h(formato, pais),
  });
}

// Acepta "HH:mm", "HH:mm:ss", un ISO completo, un Date o un timestamp.
function aFecha(valor: Date | string | number): Date | null {
  if (valor instanceof Date) return isNaN(valor.getTime()) ? null : valor;
  if (typeof valor === "number") {
    const d = new Date(valor);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof valor === "string") {
    const m = valor.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (m) {
      const d = new Date();
      d.setHours(Number(m[1]), Number(m[2]), m[3] ? Number(m[3]) : 0, 0);
      return d;
    }
    const d = new Date(valor);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/** Hook: un formateador de hora ligado a los ajustes de la clínica actual. */
export function useFormatoHora(): (valor: Date | string | number) => string {
  const { clinic } = useCloudEsther();
  const settings = useClinicSettings(clinic);
  const formato = settings.formatoHora ?? "auto";
  // País cargado en Configuración; si no, el que contrató (o el del navegador en el demo)
  const pais = paisEfectivo(settings.datosClinica?.pais);
  return (valor) => formatearHora(valor, formato, pais);
}
