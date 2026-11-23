import { useEffect, useState, type ReactNode } from "react";
import { Bot, CheckCircle2, Copy, KeyRound, Link2, Loader2, Plug, RefreshCw, Send, ShieldCheck, Unplug, Workflow, XCircle } from "lucide-react";
import { IconoWhatsApp } from "@/components/cloud-esther/IconoWhatsApp";
import { BTN_PRIMARIO, BTN_SECUNDARIO, Field, INPUT } from "@/components/cloud-esther/rrhh/ui";
import {
  guardarConexionAutomatizaciones,
  probarN8n,
  probarWhatsappBusiness,
  renovarSecretoAutomatizaciones,
} from "@/lib/clinica/api";
import { ponerEstadoAutomatizaciones, recargarEstadoAutomatizaciones, useEstadoAutomatizaciones } from "@/lib/clinica/automatizaciones";
import { useClinicaReal } from "@/lib/clinica/modo-clinica";

/* Ubicación: src/components/cloud-esther/automatizaciones/ConexionReal.tsx
   CONEXIÓN DE VERDAD (clínica real), solo el Administrador:
   · WhatsApp Business (API oficial de Meta): el número de la clínica manda los mensajes de las
     automatizaciones y el Agente IA responde los que llegan. Las llaves se prueban contra Meta
     antes de guardarse, se guardan cifradas y nunca vuelven completas a la pantalla.
   · n8n (opcional): cada evento de la clínica se le manda firmado, y n8n puede pedirle acciones a
     Cloud Esther (WhatsApp, correo, tareas, avisos, IA) con el secreto de la clínica.
   · Inteligencia artificial: si el servidor tiene la llave, la IA redacta, clasifica y responde. */

function Copiable({ valor, etiqueta, onToast }: { valor: string; etiqueta: string; onToast: (m: string) => void }) {
  return (
    <div className="flex gap-2">
      <input className={`${INPUT} font-mono text-xs`} value={valor} readOnly aria-label={etiqueta} />
      <button
        type="button"
        className={BTN_SECUNDARIO}
        aria-label={`Copiar ${etiqueta}`}
        onClick={() => {
          void navigator.clipboard?.writeText(valor);
          onToast(`${etiqueta} copiado`);
        }}
      >
        <Copy className="size-4" />
      </button>
    </div>
  );
}

function Estado({ ok, si, no }: { ok: boolean; si: string; no: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${ok ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
    >
      {ok ? <CheckCircle2 className="size-3.5" /> : <XCircle className="size-3.5" />}
      {ok ? si : no}
    </span>
  );
}

function Tarjeta({ icono, titulo, estado, children }: { icono: ReactNode; titulo: string; estado: ReactNode; children: ReactNode }) {
  return (
    <section className="card-grad p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-base font-bold">
          <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-fuchsia-500 text-white">{icono}</span>
          {titulo}
        </h3>
        {estado}
      </div>
      {children}
    </section>
  );
}

export function ConexionReal({ onToast }: { onToast: (m: string) => void }) {
  const real = useClinicaReal();
  const est = useEstadoAutomatizaciones();
  const [wa, setWa] = useState({ phoneId: "", token: "", appSecret: "", plantilla: "", idioma: "es" });
  const [n8nUrl, setN8nUrl] = useState("");
  const [telPrueba, setTelPrueba] = useState("");
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (real) void recargarEstadoAutomatizaciones(real.slug);
  }, [real?.slug]);
  useEffect(() => {
    if (!est) return;
    setWa((w) => ({ ...w, phoneId: est.whatsapp.phoneId, plantilla: est.whatsapp.plantilla, idioma: est.whatsapp.idioma || "es" }));
    setN8nUrl(est.n8n.eventosUrl);
  }, [est?.whatsapp.phoneId, est?.whatsapp.plantilla, est?.n8n.eventosUrl]);

  if (!real) return null;
  if (real.rol !== "admin")
    return <p className="card-grad p-5 text-sm text-muted-foreground">La conexión la configura el Administrador de la clínica.</p>;
  if (!est)
    return (
      <p className="card-grad flex items-center gap-2 p-5 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Cargando la conexión…
      </p>
    );

  const hacer = async (id: string, fn: () => Promise<void>) => {
    setOcupado(id);
    setError(null);
    try {
      await fn();
    } catch (e) {
      const m = e instanceof Error ? e.message : "No se pudo completar. Probá de nuevo.";
      setError(m);
      onToast(m);
    } finally {
      setOcupado(null);
    }
  };

  return (
    <div className="space-y-4">
      {!est.habilitado && (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Automatizaciones no está incluido en tu plan. Podés sumarlo como módulo adicional desde <b>Configuración › Mi plan</b>:
          se activa al instante y va en tu próxima factura.
        </p>
      )}
      {error && <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}

      {/* ───────── WhatsApp Business ───────── */}
      <Tarjeta
        icono={<IconoWhatsApp className="size-4" />}
        titulo="WhatsApp Business (API oficial de Meta)"
        estado={<Estado ok={est.whatsapp.conectado} si={`Conectado ${est.whatsapp.numero ? `· ${est.whatsapp.numero}` : ""}`} no="Sin conectar" />}
      >
        <p className="mb-3 text-[12.5px] text-muted-foreground">
          Con WhatsApp Business conectado, las automatizaciones y los recordatorios salen solos desde el número de tu clínica, y el
          Agente IA responde los mensajes que llegan. Los datos los sacás de tu app en <b>developers.facebook.com</b> › WhatsApp ›
          Configuración de la API.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Identificador del número (Phone number ID)">
            <input className={INPUT} inputMode="numeric" value={wa.phoneId} onChange={(e) => setWa({ ...wa, phoneId: e.target.value.replace(/\D/g, "") })} placeholder="Ej.: 109876543210987" />
          </Field>
          <Field label="Token de acceso (permanente)">
            <input className={INPUT} type="password" value={wa.token} onChange={(e) => setWa({ ...wa, token: e.target.value.trim() })} placeholder={est.whatsapp.token || "EAAG…"} autoComplete="off" />
          </Field>
          <Field label="App Secret (para recibir mensajes)">
            <input className={INPUT} type="password" value={wa.appSecret} onChange={(e) => setWa({ ...wa, appSecret: e.target.value.trim() })} placeholder={est.whatsapp.appSecret || "Configuración › Básica › Clave secreta"} autoComplete="off" />
          </Field>
          <div className="grid grid-cols-[1fr_90px] gap-2">
            <Field label="Plantilla aprobada (opcional)">
              <input className={INPUT} value={wa.plantilla} onChange={(e) => setWa({ ...wa, plantilla: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })} placeholder="aviso_clinica" />
            </Field>
            <Field label="Idioma">
              <input className={INPUT} value={wa.idioma} onChange={(e) => setWa({ ...wa, idioma: e.target.value.trim() })} placeholder="es" />
            </Field>
          </div>
        </div>
        <p className="mt-2 text-[11.5px] text-muted-foreground">
          Regla de Meta: para escribirle primero a un paciente (recordatorios, seguimientos) hace falta una <b>plantilla aprobada</b>{" "}
          con una variable en el cuerpo (ej.: «Hola, te escribimos de la clínica: {"{{1}}"}»). Si el paciente escribió en las últimas
          24 h, se le responde con texto libre.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className={BTN_PRIMARIO}
            disabled={!!ocupado || !est.habilitado}
            onClick={() =>
              void hacer("wa", async () => {
                const e = await guardarConexionAutomatizaciones(real.slug, {
                  whatsapp: { phoneId: wa.phoneId, ...(wa.token ? { token: wa.token } : {}), ...(wa.appSecret ? { appSecret: wa.appSecret } : {}), plantilla: wa.plantilla, idioma: wa.idioma },
                });
                ponerEstadoAutomatizaciones(e);
                setWa((w) => ({ ...w, token: "", appSecret: "" }));
                onToast("WhatsApp Business conectado: Meta confirmó las llaves");
              })
            }
          >
            {ocupado === "wa" ? <Loader2 className="size-4 animate-spin" /> : <Plug className="size-4" />} Guardar y probar con Meta
          </button>
          {est.whatsapp.conectado && (
            <button
              type="button"
              className={BTN_SECUNDARIO}
              disabled={!!ocupado}
              onClick={() =>
                window.confirm("¿Desconectar WhatsApp Business? Las automatizaciones dejan de mandar WhatsApp.") &&
                void hacer("wa-off", async () => {
                  ponerEstadoAutomatizaciones(await guardarConexionAutomatizaciones(real.slug, { whatsapp: { phoneId: "", plantilla: "", idioma: "es", desconectar: true } }));
                  onToast("WhatsApp Business desconectado");
                })
              }
            >
              <Unplug className="size-4" /> Desconectar
            </button>
          )}
        </div>

        {est.whatsapp.conectado && (
          <div className="mt-4 grid gap-3 border-t border-primary/10 pt-4 md:grid-cols-2">
            <div>
              <p className="mb-1.5 text-[12px] font-semibold">Mandar un WhatsApp de prueba</p>
              <div className="flex gap-2">
                <input className={INPUT} value={telPrueba} onChange={(e) => setTelPrueba(e.target.value)} placeholder="+54 9 11 1234-5678" />
                <button
                  type="button"
                  className={BTN_SECUNDARIO}
                  disabled={!!ocupado || telPrueba.replace(/\D/g, "").length < 8}
                  onClick={() =>
                    void hacer("wa-test", async () => {
                      await probarWhatsappBusiness(real.slug, telPrueba);
                      onToast("WhatsApp de prueba enviado");
                    })
                  }
                >
                  {ocupado === "wa-test" ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-[12px] font-semibold">Para recibir mensajes (Agente IA): en Meta › WhatsApp › Configuración › Webhook</p>
              <Copiable valor={est.whatsapp.webhook} etiqueta="URL de devolución de llamada" onToast={onToast} />
              <Copiable valor={est.whatsapp.verifyToken} etiqueta="Token de verificación" onToast={onToast} />
              <p className="text-[11px] text-muted-foreground">Después suscribí el campo «messages».</p>
            </div>
          </div>
        )}
      </Tarjeta>

      {/* ───────── n8n ───────── */}
      <Tarjeta icono={<Workflow className="size-4" />} titulo="n8n (opcional)" estado={<Estado ok={!!est.n8n.eventosUrl} si="Recibe los eventos" no="Sin conectar" />}>
        <p className="mb-3 text-[12.5px] text-muted-foreground">
          No hace falta para que las automatizaciones funcionen: Cloud Esther las ejecuta solo. Si usás n8n, cada evento de tu clínica
          (turno nuevo, cancelado, presupuesto, paciente nuevo…) se le manda firmado, y n8n puede pedirle acciones a Cloud Esther.
        </p>
        <Field label="Webhook de n8n que recibe los eventos (nodo Webhook, método POST)">
          <div className="flex gap-2">
            <input className={INPUT} value={n8nUrl} onChange={(e) => setN8nUrl(e.target.value.trim())} placeholder="https://tu-n8n.com/webhook/cloud-esther" />
            <button
              type="button"
              className={BTN_PRIMARIO}
              disabled={!!ocupado || !est.habilitado}
              onClick={() =>
                void hacer("n8n", async () => {
                  ponerEstadoAutomatizaciones(await guardarConexionAutomatizaciones(real.slug, { n8nEventsUrl: n8nUrl }));
                  onToast(n8nUrl ? "n8n guardado" : "n8n desconectado");
                })
              }
            >
              {ocupado === "n8n" ? <Loader2 className="size-4 animate-spin" /> : <Link2 className="size-4" />} Guardar
            </button>
            {est.n8n.eventosUrl && (
              <button
                type="button"
                className={BTN_SECUNDARIO}
                disabled={!!ocupado}
                onClick={() =>
                  void hacer("n8n-test", async () => {
                    await probarN8n(real.slug);
                    onToast("n8n recibió el evento de prueba");
                  })
                }
              >
                {ocupado === "n8n-test" ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Probar
              </button>
            )}
          </div>
        </Field>
        <div className="mt-4 grid gap-3 border-t border-primary/10 pt-4 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-[12px] font-semibold">Para que n8n le pida acciones a Cloud Esther (nodo HTTP Request, POST)</p>
            <Copiable valor={est.n8n.webhookAcciones} etiqueta="Webhook de acciones" onToast={onToast} />
            <p className="text-[11px] leading-5 text-muted-foreground">
              Acciones: <code>whatsapp.enviar</code>, <code>correo.enviar</code>, <code>tarea.crear</code>, <code>aviso.crear</code>,{" "}
              <code>ia.redactar</code>. Cada pedido lleva <code>X-CloudEsther-Fecha</code> (milisegundos) y{" "}
              <code>X-CloudEsther-Firma</code> = <code>sha256=</code> HMAC-SHA256 de «fecha.cuerpo» con el secreto.
            </p>
          </div>
          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-[12px] font-semibold">
              <KeyRound className="size-3.5" /> Secreto de tu clínica (firma en los dos sentidos)
            </p>
            <Copiable valor={est.n8n.secreto} etiqueta="Secreto" onToast={onToast} />
            <button
              type="button"
              className={BTN_SECUNDARIO}
              disabled={!!ocupado}
              onClick={() =>
                window.confirm("¿Generar un secreto nuevo? Vas a tener que actualizarlo en n8n.") &&
                void hacer("secreto", async () => {
                  ponerEstadoAutomatizaciones(await renovarSecretoAutomatizaciones(real.slug));
                  onToast("Secreto nuevo generado");
                })
              }
            >
              <RefreshCw className="size-4" /> Generar uno nuevo
            </button>
          </div>
        </div>
      </Tarjeta>

      {/* ───────── IA ───────── */}
      <Tarjeta
        icono={<Bot className="size-4" />}
        titulo="Inteligencia artificial"
        estado={<Estado ok={est.ia.habilitada && est.ia.conLlave} si="Activa" no={est.ia.habilitada ? "Sin llave en el servidor" : "No incluida en tu plan"} />}
      >
        <p className="text-[12.5px] text-muted-foreground">
          {est.ia.habilitada && est.ia.conLlave
            ? "Esther Infinity redacta los mensajes, clasifica las respuestas, prioriza y el Agente IA responde por WhatsApp."
            : est.ia.habilitada
              ? "Mientras Cloud Esther no active la IA en el servidor, los mensajes salen con textos armados (igual se envían)."
              : "Sumá IA Esther como módulo adicional desde Mi plan. Mientras tanto, los mensajes salen con textos armados."}
        </p>
        <p className="mt-2 flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
          <ShieldCheck className="size-3.5 text-primary" /> La IA solo ve los datos del evento (nunca la historia clínica completa) y
          cada clínica tiene un límite diario de consultas.
        </p>
      </Tarjeta>
    </div>
  );
}
