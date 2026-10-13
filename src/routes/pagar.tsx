import { createFileRoute, Link } from "@tanstack/react-router";
import { CircleCheckBig, Loader2, Lock, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { PublicLayout } from "@/components/site/PublicLayout";
import { PAISES_DEMO } from "@/lib/cloud-esther/demo-servidor";
import {
  abrirPago,
  escucharPaddle,
  estadoPago,
  iniciarPago,
  obtenerResumen,
  PAGO_EN_LINEA,
  prepararPaddle,
  usd,
  type ResumenPago,
} from "@/lib/pago-en-linea";

/* Ubicación: src/routes/pagar.tsx
   RESUMEN Y PAGO de una contratación. Se llega desde el formulario «Contratar servicio» o
   desde el correo (/pagar#t=...). El enlace va después de "#": no queda en los registros
   de ningún servidor.
   1. Resumen: plan, monto inicial, suscripción, impuestos de cada concepto y total.
   2. «Confirmar contratación y pagar» → se abre la ventana segura de Paddle.
   3. Paddle confirma el pago al servidor → la clínica se activa sola. */

export const Route = createFileRoute("/pagar")({
  head: () => ({
    meta: [
      { title: "Resumen y pago | Cloud Esther" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Pagar,
});

type Paso = "cargando" | "resumen" | "abriendo" | "procesando" | "listo" | "pendiente" | "error";

function leerToken(): string {
  if (typeof window === "undefined") return "";
  const m = /[#&]t=([A-Za-z0-9_-]{20,200})/.exec(window.location.hash);
  return m?.[1] ?? "";
}

function Pagar() {
  const [token, setToken] = useState("");
  const [paso, setPaso] = useState<Paso>("cargando");
  const [resumen, setResumen] = useState<ResumenPago | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [acepto, setAcepto] = useState(false);
  const consultando = useRef(false);

  // Cargar el resumen
  useEffect(() => {
    const t = leerToken();
    setToken(t);
    // Paddle a veces vuelve a esta página con ?_ptxn=… (su "enlace de pago"): Paddle.js abre solo la ventana
    if (new URLSearchParams(window.location.search).has("_ptxn") && PAGO_EN_LINEA) {
      setPaso("abriendo");
      void prepararPaddle().catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "No se pudo abrir el pago.");
        setPaso("error");
      });
      return;
    }
    if (!t) {
      setError("Falta el enlace de pago. Abrí el botón «Ver el resumen y pagar» del correo que te mandamos.");
      setPaso("error");
      return;
    }
    if (!PAGO_EN_LINEA) {
      setError("El pago en línea todavía no está disponible. Un asesor te va a contactar para coordinar el pago.");
      setPaso("error");
      return;
    }
    void (async () => {
      const r = await obtenerResumen(t);
      if (!r.ok) {
        setError(r.error);
        setPaso("error");
        return;
      }
      setResumen(r.datos);
      setPaso("resumen");
      void prepararPaddle().catch(() => {}); // se va cargando la ventana de pago
    })();
  }, []);

  // Cuando Paddle avisa que se pagó: se espera la confirmación del servidor
  useEffect(() => {
    return escucharPaddle((e) => {
      if (e.name === "checkout.completed") setPaso("procesando");
      if (e.name === "checkout.closed") setPaso((p) => (p === "abriendo" ? "resumen" : p));
    });
  }, []);

  useEffect(() => {
    if (paso !== "procesando" || consultando.current) return;
    // Sin enlace (se abrió desde Paddle): no se puede consultar; llega el correo igual
    if (!token) {
      setPaso("pendiente");
      return;
    }
    consultando.current = true;
    let vueltas = 0;
    const id = window.setInterval(async () => {
      vueltas++;
      const r = await estadoPago(token);
      if (r.ok && r.datos.activada) {
        window.clearInterval(id);
        setPaso("listo");
      } else if ((!r.ok && (r.status === 401 || r.status === 409)) || vueltas >= 40) {
        // ~2 minutos: el pago puede tardar en confirmarse; le llega el correo igual
        window.clearInterval(id);
        setPaso("pendiente");
      }
    }, 3000);
    return () => window.clearInterval(id);
  }, [paso, token]);

  const pagar = async () => {
    if (!acepto) return setError("Para seguir, aceptá las condiciones de la suscripción.");
    setError(null);
    setPaso("abriendo");
    const r = await iniciarPago(token);
    if (!r.ok) {
      setError(r.error);
      setPaso("resumen");
      return;
    }
    try {
      await abrirPago(r.datos.transactionId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo abrir la ventana de pago.");
      setPaso("resumen");
    }
  };

  const pais = PAISES_DEMO.find((p) => p.codigo === resumen?.pais)?.nombre ?? resumen?.pais ?? "";

  return (
    <PublicLayout>
      <section className="relative overflow-hidden bg-soft">
        <div className="bg-glow pointer-events-none absolute inset-x-0 top-0 h-96" />
        <div className="relative mx-auto max-w-2xl px-5 py-14 lg:py-20">
          {paso === "abriendo" && !resumen && (
            <div className="card-premium flex items-center justify-center gap-2 p-10 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" /> Abriendo el pago seguro…
            </div>
          )}

          {paso === "cargando" && (
            <div className="card-premium flex items-center justify-center gap-2 p-10 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" /> Preparando tu resumen…
            </div>
          )}

          {paso === "error" && (
            <div className="card-premium p-8 text-center">
              <h1 className="text-xl font-bold">No pudimos mostrar el pago</h1>
              <p className="mt-3 text-muted-foreground">{error}</p>
              <Button asChild variant="outlineBrand" size="lg" className="mt-6">
                <Link to="/">Volver al inicio</Link>
              </Button>
            </div>
          )}

          {(paso === "procesando" || paso === "listo" || paso === "pendiente") && (
            <div className="card-premium flex flex-col items-center p-10 text-center">
              {paso === "procesando" ? (
                <Loader2 className="size-10 animate-spin text-primary" />
              ) : (
                <span className="bg-brand flex size-16 items-center justify-center rounded-3xl">
                  <CircleCheckBig className="size-7 text-primary-foreground" />
                </span>
              )}
              <h1 className="mt-6 text-2xl font-bold">
                {paso === "procesando" && "Confirmando tu pago…"}
                {paso === "listo" && "¡Listo! Tu clínica quedó activada"}
                {paso === "pendiente" && "¡Pago recibido!"}
              </h1>
              <p className="mt-3 max-w-md text-muted-foreground">
                {paso === "procesando" && "Paddle nos está confirmando el pago. No cierres esta página."}
                {paso === "listo" && "Te mandamos un correo de bienvenida. Un asesor te contacta para darte los accesos."}
                {paso === "pendiente" &&
                  "La confirmación puede demorar unos minutos. Apenas se confirme, tu clínica se activa sola y te llega un correo."}
              </p>
            </div>
          )}

          {(paso === "resumen" || paso === "abriendo") && resumen && (
            <div className="card-premium p-6 lg:p-8">
              <span className="inline-flex items-center rounded-full border border-primary/20 bg-lavender px-3 py-1 text-xs font-semibold text-lavender-foreground">
                Resumen de contratación · {resumen.codigo}
              </span>
              <h1 className="mt-4 text-2xl font-bold">{resumen.clinica}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Plan <b className="text-foreground">{resumen.planNombre}</b> · {resumen.ciclo} · {pais}
              </p>

              <div className="mt-6 overflow-x-auto rounded-2xl border border-border">
                <table className="w-full min-w-[440px] text-sm">
                  <thead>
                    <tr className="bg-primary/[0.04] text-left text-xs text-muted-foreground">
                      <th className="px-4 py-2.5 font-semibold">Concepto</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Sin impuestos</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Impuestos</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumen.lineas.map((l) => (
                      <tr key={l.concepto} className="border-t border-border/70">
                        <td className="px-4 py-3">{l.concepto}</td>
                        <td className="px-3 py-3 text-right tabular-nums">{usd(l.subtotal)}</td>
                        <td className="px-3 py-3 text-right tabular-nums">{usd(l.impuesto)}</td>
                        <td className="px-4 py-3 text-right font-semibold tabular-nums">{usd(l.total)}</td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-primary/30 bg-primary/[0.03]">
                      <td className="px-4 py-3 font-bold">Total a pagar hoy</td>
                      <td className="px-3 py-3 text-right tabular-nums">{usd(resumen.primerPago.subtotal)}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{usd(resumen.primerPago.impuesto)}</td>
                      <td className="px-4 py-3 text-right text-base font-extrabold text-primary tabular-nums">
                        {usd(resumen.primerPago.total)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
                <li>
                  <b className="text-foreground">Después:</b> {usd(resumen.renovacion.total)} por {resumen.renovacion.cada}{" "}
                  ({usd(resumen.renovacion.subtotal)} + {usd(resumen.renovacion.impuesto)} de impuestos). La suscripción se
                  renueva automáticamente cada {resumen.renovacion.cada}.
                </li>
                <li>Podés cancelar cuando quieras: deja de renovarse al final del período ya pagado.</li>
                <li>
                  Se cobra en <b className="text-foreground">dólares (USD)</b>. Si tu tarjeta es de otra moneda, tu banco hace
                  la conversión con sus propias condiciones.
                </li>
                <li>Los impuestos corresponden a {pais} y los calcula el procesador de pagos (Paddle) según la ley de cada país.</li>
              </ul>

              <label className="mt-6 flex items-start gap-3 rounded-2xl border border-border p-4 text-sm">
                <input
                  type="checkbox"
                  checked={acepto}
                  onChange={(e) => setAcepto(e.target.checked)}
                  className="mt-0.5 size-4 accent-primary"
                />
                <span>
                  Acepto contratar Cloud Esther con <b>renovación automática</b> y entiendo que puedo cancelar cuando quiera.
                </span>
              </label>

              {error && (
                <p role="alert" className="mt-4 text-sm font-medium text-destructive">
                  {error}
                </p>
              )}

              <Button
                type="button"
                variant="hero"
                size="xl"
                className="mt-5 w-full"
                disabled={paso === "abriendo"}
                onClick={() => void pagar()}
              >
                {paso === "abriendo" ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Abriendo el pago seguro…
                  </>
                ) : (
                  <>
                    <Lock className="size-4" /> Confirmar contratación y pagar {usd(resumen.primerPago.total)}
                  </>
                )}
              </Button>
              <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                El pago se hace en la ventana segura de Paddle, nuestro procesador de pagos. Cloud Esther nunca ve ni guarda
                los datos de tu tarjeta.
              </p>
            </div>
          )}
        </div>
      </section>
    </PublicLayout>
  );
}
