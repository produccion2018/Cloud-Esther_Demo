import type { CuentaDemo, EstadoPago, PlanConfig, PlanId } from "./tipos";

/* Ubicación: src/lib/admin/formato.ts
   Cálculos y textos compartidos por las pantallas del panel. */

export const NOMBRE_PLAN: Record<PlanId, string> = {
  inicial: "Start",
  profesional: "Pro",
  avanzada: "Plus",
  grupo: "Enterprise",
};

export const ETIQUETA_PAGO: Record<EstadoPago, string> = {
  "al-dia": "Al día",
  pendiente: "Falta pagar",
  mora: "En mora",
  suspendida: "Suspendida",
};

const numero = new Intl.NumberFormat("es-AR");
export const miles = (n: number) => numero.format(n);
/** Un límite de plan: Infinity = sin límite. */
export const limiteTexto = (n: number) => (Number.isFinite(n) ? miles(n) : "sin límite");

export function fecha(isoTexto: string | null, conHora = false) {
  if (!isoTexto) return "—";
  const d = new Date(isoTexto.length === 10 ? `${isoTexto}T12:00:00` : isoTexto);
  return d.toLocaleString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(conHora ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

/** «hace 3 h», «hace 2 días»… */
export function haceCuanto(isoTexto: string | null) {
  if (!isoTexto) return "Nunca";
  const min = Math.round((Date.now() - new Date(isoTexto).getTime()) / 60000);
  if (min < 1) return "Recién";
  if (min < 60) return `Hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `Hace ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "Ayer" : `Hace ${d} días`;
}

/** Días hasta una fecha (negativo si ya pasó). */
export function diasHasta(diaISO: string) {
  return Math.round((new Date(`${diaISO}T12:00:00`).getTime() - Date.now()) / 86_400_000);
}

export function precio(n: number | null) {
  return n === null ? "US$ —" : `US$\u00a0${miles(n)}`;
}

export function precioAnual(p: Pick<PlanConfig, "precioMensual" | "descuentoAnual">) {
  return p.precioMensual === null
    ? null
    : Math.round(p.precioMensual * 12 * (1 - p.descuentoAnual));
}

/* ───────────── Demos ───────────── */

export type Interes = "Alto" | "Medio" | "Bajo";

export function resumenDemo(d: CuentaDemo) {
  const minutos = d.ingresos.reduce((s, i) => s + i.minutos, 0);
  const modulos = new Map<string, number>();
  d.ingresos.forEach((i) => i.modulos.forEach((m) => modulos.set(m, (modulos.get(m) ?? 0) + 1)));
  const planes = Array.from(new Set(d.ingresos.flatMap((i) => i.planes)));
  const ultimo = d.ingresos.reduce<string | null>(
    (u, i) => (!u || i.inicio > u ? i.inicio : u),
    null,
  );
  const ingresos = d.ingresos.length;
  // Interés: frecuencia de ingresos, tiempo de uso y cantidad de módulos recorridos.
  const puntos =
    Math.min(ingresos, 5) * 2 + Math.min(minutos / 15, 6) + Math.min(modulos.size / 2, 4);
  const interes: Interes = puntos >= 12 ? "Alto" : puntos >= 6 ? "Medio" : "Bajo";
  return {
    ingresos,
    minutos,
    promedio: ingresos ? Math.round(minutos / ingresos) : 0,
    ultimo,
    planes,
    modulos: Array.from(modulos.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([nombre, veces]) => ({ nombre, veces })),
    expiraciones: d.ingresos.filter((i) => i.cierre === "Expiró").length,
    interes,
  };
}

export function minutosTexto(min: number) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** Importe con su moneda (sueldos, gastos, pagos internos). */
export function importe(n: number, moneda: string = "ARS") {
  return `${moneda === "USD" ? "US$" : moneda === "ARS" ? "$" : moneda} ${miles(Math.round(n))}`;
}

/** Día de hoy en formato ISO (AAAA-MM-DD). */
export const hoyISO = () => new Date().toISOString().slice(0, 10);

/** Período actual (AAAA-MM). */
export const periodoActual = () => new Date().toISOString().slice(0, 7);

/** «2026-09» → «septiembre 2026». */
export function periodoTexto(p: string) {
  const d = new Date(`${p}-15T12:00:00`);
  return Number.isNaN(d.getTime())
    ? p
    : d.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
}

/** Enlace de WhatsApp para un teléfono. Si el número no trae el código del país (+54…),
 *  se le agrega el del país de la clínica (AR, CL…). null = no es un teléfono usable. */
const CODIGO_TELEFONO: Record<string, string> = {
  AR: "54", CL: "56", CO: "57", PE: "51", EC: "593", VE: "58", MX: "52", ES: "34",
};
export function enlaceWhatsApp(telefono: string, paisCodigo?: string): string | null {
  const t = telefono.trim();
  let digitos = t.replace(/[^0-9]/g, "");
  if (digitos.length < 7) return null;
  if (!t.startsWith("+")) {
    const codigo = paisCodigo ? CODIGO_TELEFONO[paisCodigo.toUpperCase()] : undefined;
    if (codigo && !digitos.startsWith(codigo)) digitos = codigo + digitos.replace(/^0+/, "");
  }
  return `https://wa.me/${digitos}`;
}

/* NOMBRES PROLIJOS en el panel (también los que llegaron antes de que el servidor los acomode):
   cada palabra escrita toda en mayúsculas o toda en minúsculas se acomoda
   («PINTO CASTRO mauro» → «Pinto Castro Mauro»); las que traen números o mezcla se respetan. */
const PARTICULAS = new Set(["de", "del", "la", "las", "los", "y", "e", "da", "das", "do", "dos", "van", "von", "di"]);
const may = (w: string) => (w ? w.charAt(0).toLocaleUpperCase("es") + w.slice(1) : w);
export function nombreProlijo(raw: string): string {
  return raw
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((w, i) => {
      if (/\d/.test(w)) return w;
      const lower = w.toLocaleLowerCase("es");
      if (w !== lower && w !== w.toLocaleUpperCase("es")) return w;
      if (i > 0 && PARTICULAS.has(lower)) return lower;
      return lower
        .split("-")
        .map((p) => p.split("'").map(may).join("'"))
        .join("-");
    })
    .join(" ");
}
/** Clínicas: solo si vinieron todo en mayúsculas o todo en minúsculas («OSDE Dental» queda igual) */
export function clinicaProlija(raw: string): string {
  const limpio = raw.trim().replace(/\s+/g, " ");
  const letras = limpio.replace(/[^\p{L}]/gu, "");
  return letras && (letras === letras.toLocaleLowerCase("es") || letras === letras.toLocaleUpperCase("es"))
    ? nombreProlijo(limpio)
    : limpio;
}
