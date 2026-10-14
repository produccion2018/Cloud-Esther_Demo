/* Ubicación: src/lib/pago-en-linea.ts
   PAGO EN LÍNEA de una contratación (Paddle).
   · El resumen (precios SIN impuestos + impuestos de cada concepto + total) lo arma el SERVIDOR
     con los precios oficiales del panel; los impuestos los calcula Paddle según el país.
   · El cobro también lo arma el servidor: el navegador nunca manda importes.
   · La tarjeta se carga en la ventana segura de Paddle: Cloud Esther nunca la ve.
   · La clínica se activa recién cuando Paddle le confirma el pago al servidor. */

const API_URL = (import.meta.env["VITE_ADMIN_API_URL"] as string | undefined)?.replace(/\/$/, "");
const PADDLE_TOKEN = import.meta.env["VITE_PADDLE_CLIENT_TOKEN"] as string | undefined;

/** ¿Se puede pagar en línea desde esta página? (servidor + token de Paddle) */
export const PAGO_EN_LINEA = Boolean(API_URL && PADDLE_TOKEN);

export type LineaResumen = { concepto: string; subtotal: number; impuesto: number; total: number };
export type ResumenPago = {
  codigo: string;
  clinica: string;
  pais: string;
  planNombre: string;
  ciclo: "Mensual" | "Anual";
  moneda: "USD";
  lineas: LineaResumen[];
  primerPago: { subtotal: number; impuesto: number; total: number };
  renovacion: { subtotal: number; impuesto: number; total: number; cada: "mes" | "año" };
  estadoPago: string;
};

type Resultado<T> = { ok: true; datos: T } | { ok: false; error: string; status?: number };
const SIN_CONEXION = "No pudimos conectarnos. Probá de nuevo en unos segundos.";

async function pedir<T>(ruta: string, cuerpo: unknown): Promise<Resultado<T>> {
  if (!API_URL) return { ok: false, error: "El pago en línea no está disponible en esta página." };
  try {
    const r = await fetch(`${API_URL}${ruta}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo),
    });
    if (!r.ok) return { ok: false, error: (await r.text().catch(() => "")) || SIN_CONEXION, status: r.status };
    return { ok: true, datos: (await r.json()) as T };
  } catch {
    return { ok: false, error: SIN_CONEXION };
  }
}

export const obtenerResumen = (token: string) => pedir<ResumenPago>("/pago/resumen", { token });
export const iniciarPago = (token: string) =>
  pedir<{ transactionId: string }>("/pago/iniciar", { token, acepto: true });
export const estadoPago = (token: string) =>
  pedir<{ estadoPago: string; activada: boolean }>("/pago/estado", { token });

/* ───────────── Ventana de pago de Paddle (Paddle.js) ───────────── */

type PaddleEvento = { name?: string };
type PaddleGlobal = {
  Environment: { set: (env: string) => void };
  Initialize: (opts: { token: string; eventCallback?: (e: PaddleEvento) => void }) => void;
  Checkout: { open: (opts: Record<string, unknown>) => void };
};

let cargando: Promise<PaddleGlobal> | null = null;
const oyentes = new Set<(e: PaddleEvento) => void>();

/** Carga Paddle.js (una sola vez) y lo prepara. */
export function prepararPaddle(): Promise<PaddleGlobal> {
  if (!PADDLE_TOKEN) return Promise.reject(new Error("Falta el token de Paddle"));
  if (cargando) return cargando;
  cargando = new Promise<PaddleGlobal>((resolve, reject) => {
    const listo = () => {
      const P = (window as unknown as { Paddle?: PaddleGlobal }).Paddle;
      if (!P) return reject(new Error("No se pudo cargar Paddle"));
      // Los tokens de prueba empiezan con "test_": se usa el Paddle de prueba (sin plata real)
      if (PADDLE_TOKEN.startsWith("test_")) P.Environment.set("sandbox");
      P.Initialize({ token: PADDLE_TOKEN, eventCallback: (e) => oyentes.forEach((o) => o(e)) });
      resolve(P);
    };
    if ((window as unknown as { Paddle?: PaddleGlobal }).Paddle) return listo();
    const s = document.createElement("script");
    s.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
    s.async = true;
    s.onload = listo;
    s.onerror = () => {
      cargando = null;
      reject(new Error("No se pudo cargar la ventana de pago. Revisá tu conexión."));
    };
    document.head.appendChild(s);
  });
  return cargando;
}

/** Escuchar lo que pasa en la ventana de pago (checkout.completed, checkout.closed, …). */
export function escucharPaddle(fn: (e: PaddleEvento) => void) {
  oyentes.add(fn);
  return () => {
    oyentes.delete(fn);
  };
}

/** Abre la ventana de pago de Paddle para el cobro que armó el servidor. */
export async function abrirPago(transactionId: string) {
  const P = await prepararPaddle();
  // El cobro ya tiene el cliente y su país (los puso el servidor)
  P.Checkout.open({
    transactionId,
    settings: { displayMode: "overlay", locale: "es", theme: "light", allowLogout: false },
  });
}

/** Importes: "USD 1.234,50" */
export function usd(n: number) {
  return `USD ${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
