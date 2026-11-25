import QRCode from "qrcode";
import { API_URL, pedirAClinica } from "@/lib/clinica/api";
import { SLUG_DEMO } from "@/lib/clinica/demo-admin";

/* Ubicación: src/lib/cloud-esther/verificacion-receta.ts

   QR DE VERIFICACIÓN DE RECETAS (anti falsificación).
   · Cada receta emitida tiene un código de 20 caracteres AL AZAR: no sale del número de receta,
     así nadie puede inventar uno válido.
   · Se puede cambiar cuando se quiera: el código anterior queda revocado y su QR deja de servir.
   · Al escanearlo se ve si la receta es válida, está anulada, vencida o ya fue dispensada.
   · Solo se publica un resumen mínimo: iniciales del paciente, nunca el nombre completo.
   En una clínica real el código lo genera y guarda el servidor (cualquier farmacia lo verifica).
   En el demo se guarda en este navegador (se verifica en el mismo equipo). */

export type ResumenVerificacion = {
  numero: string;
  fecha: string;
  vencimiento: string;
  profesional: string;
  matricula: string;
  iniciales: string;
  clinica: string;
  medicamentos: { nombre: string; presentacion: string; cantidad: number | string; posologia: string }[];
};

export type RecetaParaVerificar = {
  id: number;
  numero: string;
  fecha: string;
  vencimiento: string;
  estado: string;
  profesional: string;
  matricula: string;
  medicamentos: { nombre: string; presentacion: string; cantidad: number; posologia: string }[];
};

export type ResultadoVerificacion =
  | {
      resultado: "encontrada";
      estado: string;
      resumen: ResumenVerificacion;
      clinica: string;
      actualizada?: string;
    }
  | { resultado: "revocada"; clinica?: string }
  | { resultado: "no_encontrada" }
  | { resultado: "demasiadas" }
  | { resultado: "sin_conexion" };

const ALFABETO = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const CLAVE_LOCAL = "cloud-esther:verif-recetas";
export const FORMATO_CODIGO = /^[2-9A-HJ-NP-Z]{20}$/;

function codigoAlAzar(): string {
  const n = new Uint32Array(20);
  crypto.getRandomValues(n);
  return Array.from(n, (x) => ALFABETO[x % ALFABETO.length]).join("");
}

/** «Laura Gómez» → «L. G.» */
export function iniciales(nombre: string | undefined): string {
  return (nombre ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((p) => `${p[0]?.toUpperCase() ?? ""}.`)
    .join(" ");
}

export const refReceta = (r: { id: number; numero: string }) => `${r.id}-${r.numero}`.slice(0, 60);

function resumenDe(r: RecetaParaVerificar, paciente?: string | undefined, clinica?: string | undefined): ResumenVerificacion {
  return {
    numero: r.numero,
    fecha: r.fecha,
    vencimiento: r.vencimiento ?? "",
    profesional: r.profesional,
    matricula: r.matricula ?? "",
    iniciales: iniciales(paciente),
    clinica: clinica ?? "",
    medicamentos: r.medicamentos.slice(0, 20).map((m) => ({
      nombre: m.nombre,
      presentacion: m.presentacion ?? "",
      cantidad: m.cantidad,
      posologia: m.posologia ?? "",
    })),
  };
}

/* ── Registro local (demo) ── */
type Local = Record<string, { ref: string; estado: string; resumen: ResumenVerificacion; revocada: boolean }>;
function leerLocal(): Local {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_LOCAL) ?? "{}") as Local;
  } catch {
    return {};
  }
}
function guardarLocal(v: Local) {
  try {
    localStorage.setItem(CLAVE_LOCAL, JSON.stringify(v));
  } catch {
    /* sin espacio: el QR igual se muestra */
  }
}

const esReal = (slug: string | null | undefined): slug is string => Boolean(slug && slug !== SLUG_DEMO && API_URL);

/** Registra la receta para verificar y devuelve su código. renovar=true → código nuevo (el viejo deja de servir). */
export async function registrarVerificacion(
  slug: string | null | undefined,
  r: RecetaParaVerificar,
  datos: { paciente?: string | undefined; clinica?: string | undefined; renovar?: boolean },
): Promise<string> {
  const resumen = resumenDe(r, datos.paciente, datos.clinica);
  const ref = refReceta(r);
  if (esReal(slug)) {
    const res = await pedirAClinica<{ codigo: string }>(slug, "POST", "/recetas/verificacion", {
      recetaRef: ref,
      estado: r.estado,
      resumen,
      renovar: Boolean(datos.renovar),
    });
    return res.codigo;
  }
  const local = leerLocal();
  const activo = Object.entries(local).find(([, v]) => v.ref === ref && !v.revocada);
  if (activo && !datos.renovar) {
    local[activo[0]] = { ...activo[1], estado: r.estado, resumen };
    guardarLocal(local);
    return activo[0];
  }
  if (activo) local[activo[0]] = { ...activo[1], revocada: true };
  const codigo = codigoAlAzar();
  local[codigo] = { ref, estado: r.estado, resumen, revocada: false };
  guardarLocal(local);
  return codigo;
}

/** Actualiza el estado (Dispensada, Anulada…) que se ve al escanear. */
export async function actualizarEstadoVerificacion(
  slug: string | null | undefined,
  r: { id: number; numero: string },
  estado: string,
): Promise<void> {
  const ref = refReceta(r);
  if (esReal(slug)) {
    await pedirAClinica(slug, "POST", "/recetas/verificacion/estado", { recetaRef: ref, estado });
    return;
  }
  const local = leerLocal();
  for (const [k, v] of Object.entries(local)) if (v.ref === ref && !v.revocada) local[k] = { ...v, estado };
  guardarLocal(local);
}

/** Lo que ve quien escanea el QR. */
export async function consultarVerificacion(codigoCrudo: string): Promise<ResultadoVerificacion> {
  const codigo = codigoCrudo.trim().toUpperCase();
  if (!FORMATO_CODIGO.test(codigo)) return { resultado: "no_encontrada" };
  const local = leerLocal()[codigo];
  if (local) {
    if (local.revocada) return { resultado: "revocada", clinica: local.resumen.clinica };
    return { resultado: "encontrada", estado: local.estado, resumen: local.resumen, clinica: local.resumen.clinica };
  }
  if (!API_URL) return { resultado: "no_encontrada" };
  try {
    const r = await fetch(`${API_URL}/public/recetas/verificar/${codigo}`, { cache: "no-store" });
    if (r.status === 429) return { resultado: "demasiadas" };
    if (!r.ok) return { resultado: "sin_conexion" };
    return (await r.json()) as ResultadoVerificacion;
  } catch {
    return { resultado: "sin_conexion" };
  }
}

/** Dirección que abre el QR. */
export function urlVerificacion(codigo: string): string {
  // La misma dirección desde donde se emitió (demo o producción): ahí vive la página /verificar
  const base = typeof window !== "undefined" ? window.location.origin : "";
  return `${base}/verificar/${codigo}`;
}

/** Código en grupos de 4 para leerlo fácil: ABCD-EFGH-… */
export const codigoLegible = (c: string) => c.match(/.{1,4}/g)?.join("-") ?? c;

/** QR como SVG (sincrónico, sirve para el PDF y la pantalla). */
export function qrSvg(texto: string, tam = 96): string {
  const qr = QRCode.create(texto, { errorCorrectionLevel: "M" });
  const n = qr.modules.size;
  const margen = 2;
  const total = n + margen * 2;
  let d = "";
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) if (qr.modules.get(x, y)) d += `M${x + margen} ${y + margen}h1v1h-1z`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" width="${tam}" height="${tam}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path d="${d}" fill="#111"/></svg>`;
}
