import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  ChevronDown,
  Headset,
  Info,
  Mic,
  MicOff,
  ShieldCheck,
  Sparkles,
  Volume2,
  VolumeX,
  Workflow,
} from "lucide-react";
import { PLANS, useCloudEsther } from "@/lib/cloud-esther/data";
import { usePacientes } from "@/lib/cloud-esther/pacientes";
import { useSesion } from "@/lib/cloud-esther/auth-store";
import { sucursalesDelPlan } from "@/lib/cloud-esther/inventario-store";
import { useConN8n } from "@/lib/cloud-esther/n8n-acceso";
import { storeN8n } from "@/lib/cloud-esther/n8n-store";
import { conexionesEsther, hallazgosEsther } from "@/lib/cloud-esther/esther-conexiones";
import { ROL_IA_LABEL } from "@/lib/cloud-esther/esther-motor";
import type { RolIA } from "@/lib/cloud-esther/ia-store";
import { Modal } from "@/components/cloud-esther/rrhh/ui";
import { RayosXIA } from "@/components/cloud-esther/odontograma3d/RayosXIA";
import { SimuladorSonrisa } from "@/components/cloud-esther/simulador/SimuladorSonrisa";
import { ContactCenter } from "./ContactCenter";
import type { EstherContext, EstherQuickAction } from "@/lib/cloud-esther/esther-ai";
import { EstherCharacter } from "./EstherCharacter";
import { EstherConversation } from "./EstherConversation";
import { EstherGlow } from "./EstherGlow";
import { EstherMessage } from "./EstherMessage";
import { EstherParticles } from "./EstherParticles";
import { EstherQuickActions as EstherQuickActionsBlock } from "./EstherQuickActions";
import { estherStates, type EstherState } from "./esther-states";
import { useEstherAI, vozDisponible } from "./useEstherAI";
import { useMicrofono } from "./microfono";
import "./esther-ai.css";

export type EstherAIProps = {
  state?: EstherState;
  message?: string;
  context?: EstherContext;
  onAction?: (action: EstherQuickAction) => void;
  variant?: "panel" | "compact";
  /** Dentro de un portal que ya tiene su propio encabezado: sin título grande ni Contact Center. */
  embebido?: boolean;
};

const SEL =
  "h-9 w-full appearance-none rounded-xl border border-primary/15 bg-card pl-3 pr-8 text-xs font-medium text-foreground outline-none transition focus:border-primary/45 focus:ring-4 focus:ring-primary/10";

function Selector({
  etiqueta,
  value,
  onChange,
  children,
}: {
  etiqueta: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
        {etiqueta}
      </span>
      <span className="relative block">
        <select
          aria-label={etiqueta}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={SEL}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
      </span>
    </label>
  );
}

export function EstherAI({
  state: controlledState,
  message: controlledMessage,
  context,
  onAction,
  variant = "panel",
  embebido = false,
}: EstherAIProps) {
  // Quién pregunta y sobre qué: la IA responde solo lo que ese usuario puede ver.
  const { plan } = useCloudEsther();
  const { pacientes } = usePacientes();
  const { usuario } = useSesion();
  const navigate = useNavigate();
  const [pacienteId, setPacienteId] = useState<number | undefined>(undefined);
  const [rol, setRol] = useState<RolIA>(() =>
    context?.rol && context.rol in ROL_IA_LABEL ? (context.rol as RolIA) : "admin",
  );
  const [sede, setSede] = useState("Todas");
  const [herramienta, setHerramienta] = useState<"imagen" | "sonrisa" | null>(null);
  const [aviso, setAviso] = useState("");
  const [modo, setModo] = useState<"asistente" | "contact">("asistente");
  const [montado, setMontado] = useState(false);
  const sedes = sucursalesDelPlan(plan === "grupo");
  const conN8n = useConN8n();
  const n8n = storeN8n.usar();
  const nombreUsuario = context?.usuario ?? usuario?.nombre ?? "Jesús Méndez";
  const primerNombre = nombreUsuario.split(" ")[0] ?? "";
  const esther = useEstherAI({
    context: { ...context, plan, rol, sede, usuario: nombreUsuario, pacienteId, n8n: conN8n },
    saludo: `Hola${primerNombre ? ` ${primerNombre}` : ""}, soy Esther. Puedo consultar pacientes, agenda, historia clínica, odontograma, presupuestos, facturación y más, siempre con los datos de esta clínica. ¿En qué te ayudo?`,
  });
  const microfono = useMicrofono({
    onTexto: (t) => void esther.send(t),
    onEstado: esther.escuchar,
  });
  useEffect(() => setMontado(true), []);
  useEffect(() => {
    if (!aviso) return;
    const t = window.setTimeout(() => setAviso(""), 3000);
    return () => window.clearTimeout(t);
  }, [aviso]);
  const state = controlledState ?? esther.state;
  const message = controlledMessage ?? esther.message;
  const config = estherStates[state];
  const paciente = pacientes.find((p) => p.id === pacienteId);

  const handleAction = (action: EstherQuickAction) => {
    onAction?.(action);
    if (action.herramienta) {
      setHerramienta(action.herramienta);
      return;
    }
    void esther.send(action.prompt ?? action.label, action.section);
  };

  if (variant === "compact") {
    return (
      <div className="esther-ai glass-panel relative flex items-center gap-4 overflow-hidden rounded-2xl p-4">
        <div className="relative h-[200px] w-[130px] shrink-0">
          <EstherCharacter state={state} pose={esther.pose} compact />
        </div>
        <div className="min-w-0">
          <EstherMessage state={state} message={message} />
        </div>
      </div>
    );
  }

  const conexiones = montado ? conexionesEsther(plan, conN8n) : [];
  const hallazgos = montado ? hallazgosEsther(plan) : [];
  const sugerencias = paciente
    ? [
        "Analizá este paciente antes de la consulta",
        "Resumí la historia clínica",
        "Revisá el odontograma del paciente",
        "Preparar informe del paciente",
      ]
    : [
        "¿Qué turnos hay hoy?",
        "¿Cuánto facturamos este mes?",
        "Pacientes que no regresaron",
        "Revisar pendientes",
      ];
  const ultimaEj = n8n.ejecuciones[0];

  return (
    <section
      className="esther-ai relative min-h-full overflow-clip bg-[#faf9ff]"
      aria-label="Cloud Esther IA"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_5%,rgba(124,58,237,0.15),transparent_28%),radial-gradient(circle_at_92%_12%,rgba(236,72,153,0.10),transparent_27%),linear-gradient(135deg,#f8f6ff_0%,#f3effd_48%,#faf8ff_100%)]"
      />
      <div className="relative mx-auto w-full max-w-[1420px] px-4 py-6 md:px-6 lg:px-8">
        {/* Encabezado */}
        <section className="relative overflow-hidden rounded-[30px] border border-primary/15 bg-gradient-to-br from-white via-white/96 to-primary/[0.045] shadow-[0_20px_55px_-38px_rgba(76,29,149,0.55)]">
          <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-primary/55 via-primary to-pink-400/60" />
          <div className="pointer-events-none absolute -right-24 -top-28 size-72 rounded-full bg-primary/[0.055] blur-2xl" />
          <div className="relative p-5 md:p-7">
            <div
              className={`flex flex-wrap items-start justify-between gap-5 ${embebido ? "hidden" : ""}`}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/10 bg-primary/[0.07] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
                    <Sparkles className="size-3.5" />
                    Plan {PLANS[plan].name}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-700">
                    <ShieldCheck className="size-3.5" />
                    Solo datos de esta clínica
                  </span>
                  {conN8n && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-[11px] font-bold text-rose-600">
                      <Workflow className="size-3.5" />
                      n8n {n8n.conectado ? "conectado" : "en modo prueba"}
                    </span>
                  )}
                </div>
                <h1 className="mt-4 text-[34px] font-bold tracking-[-0.035em] md:text-[42px]">
                  Esther IA
                </h1>
                <p className="mt-2 max-w-2xl text-[13px] leading-6 text-muted-foreground md:text-sm">
                  Preguntale por escrito o por voz. Esther consulta los módulos de tu plan, analiza
                  pacientes antes y después de la consulta y prepara informes. Asiste al
                  profesional: no reemplaza el diagnóstico.
                </p>
              </div>
              <div
                className="flex shrink-0 rounded-2xl border border-primary/10 bg-primary/[0.03] p-1"
                role="tablist"
                aria-label="Modo de Esther"
              >
                {(
                  [
                    ["asistente", "Asistente", Sparkles],
                    ["contact", "Contact Center", Headset],
                  ] as const
                ).map(([id, l, I]) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={modo === id}
                    onClick={() => setModo(id)}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${modo === id ? "text-primary-foreground shadow-[var(--shadow-glow)]" : "text-muted-foreground hover:bg-card hover:text-foreground"}`}
                    style={modo === id ? { background: "var(--gradient-esther)" } : {}}
                  >
                    <I className="size-3.5" />
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {modo === "asistente" && (
              <div
                className={`${embebido ? "" : "mt-5"} grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr]`}
              >
                <Selector
                  etiqueta="Paciente en contexto"
                  value={pacienteId ? String(pacienteId) : ""}
                  onChange={(v) => setPacienteId(v ? Number(v) : undefined)}
                >
                  <option value="">Sin paciente seleccionado</option>
                  {pacientes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} {p.apellido}
                    </option>
                  ))}
                </Selector>
                <Selector
                  etiqueta="Consultar como"
                  value={rol}
                  onChange={(v) => setRol(v as RolIA)}
                >
                  {(Object.keys(ROL_IA_LABEL) as RolIA[]).map((r2) => (
                    <option key={r2} value={r2}>
                      {ROL_IA_LABEL[r2]}
                    </option>
                  ))}
                </Selector>
                {sedes.length > 1 ? (
                  <Selector etiqueta="Sede" value={sede} onChange={setSede}>
                    <option value="Todas">Todas las sedes</option>
                    {sedes.map((x) => (
                      <option key={x} value={x}>
                        {x}
                      </option>
                    ))}
                  </Selector>
                ) : (
                  <div>
                    <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                      Sede
                    </span>
                    <p className="flex h-9 items-center rounded-xl border border-primary/10 bg-primary/[0.03] px-3 text-xs font-medium text-muted-foreground">
                      {sedes[0] ?? "Sede principal"}
                    </p>
                  </div>
                )}
              </div>
            )}

            {modo === "asistente" && conexiones.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  Conectada con {conexiones.length} módulos de tu plan
                </p>
                <div className="scroll-sutil -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                  {conexiones.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      disabled={esther.isBusy}
                      onClick={() =>
                        c.to
                          ? void navigate({ to: c.to as never })
                          : c.pregunta
                            ? void esther.send(c.pregunta)
                            : setModo("contact")
                      }
                      className={`group shrink-0 rounded-2xl border px-3 py-2 text-left transition hover:-translate-y-0.5 disabled:opacity-60 ${
                        c.id === "n8n"
                          ? "border-rose-200 bg-rose-50/70 hover:border-rose-300"
                          : "border-primary/12 bg-card hover:border-primary/35"
                      }`}
                    >
                      <span className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
                        <span
                          className={`size-1.5 rounded-full ${c.alerta ? "bg-amber-500" : c.id === "n8n" ? "bg-rose-500" : "bg-emerald-500"}`}
                        />
                        {c.nombre}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-muted-foreground">
                        {c.dato}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {modo === "contact" ? (
          <div className="mt-5">
            <ContactCenter usuario={nombreUsuario} automatizado={conN8n} />
          </div>
        ) : (
          <div className="mt-5 grid gap-5 lg:grid-cols-[380px_1fr]">
            {/* Escenario de Esther */}
            <div className="space-y-4">
              <div
                className="relative overflow-hidden rounded-[28px] border border-primary/15 shadow-[var(--shadow-glass)]"
                style={{ background: "var(--gradient-stage)" }}
              >
                <EstherGlow intensity={config.glow} pulseKey={state} />
                <EstherParticles
                  count={config.particles}
                  drift={config.drift}
                  dataFlow={config.dataFlow}
                  compact
                />
                <div className="relative flex items-center justify-between gap-2 p-4 pb-0">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-card/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
                    <span className="relative flex size-2">
                      <span
                        className="absolute inset-0 rounded-full"
                        style={{ background: "var(--gradient-esther)" }}
                      />
                      {state !== "idle" && (
                        <span
                          className="absolute inset-0 rounded-full bg-primary"
                          style={{ animation: "esther-wave 1.4s ease-out infinite" }}
                        />
                      )}
                    </span>
                    {esther.label}
                  </span>
                  {paciente && (
                    <span className="truncate rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                      {paciente.nombre} {paciente.apellido}
                    </span>
                  )}
                </div>
                <div className="relative px-5 pt-3">
                  <div className="relative rounded-2xl border border-primary/12 bg-card/95 px-4 py-2.5 text-center text-sm font-medium leading-snug text-foreground shadow-sm">
                    {microfono.escuchando && microfono.parcial ? `“${microfono.parcial}”` : message}
                    <span className="absolute -bottom-1.5 left-1/2 size-3 -translate-x-1/2 rotate-45 border-b border-r border-primary/12 bg-card" />
                  </div>
                </div>
                <div className="relative h-[330px]">
                  <EstherCharacter state={state} pose={esther.pose} alto={300} />
                </div>
                <div className="relative space-y-2 p-4 pt-1">
                  <button
                    type="button"
                    onClick={microfono.alternar}
                    disabled={esther.isBusy}
                    className={`relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl px-4 py-3 text-sm font-semibold transition disabled:opacity-50 ${microfono.escuchando ? "text-primary-foreground" : "border border-primary/20 bg-card text-primary hover:border-primary/40"}`}
                    style={microfono.escuchando ? { background: "var(--gradient-esther)" } : {}}
                  >
                    {microfono.escuchando ? (
                      <>
                        <MicOff className="size-4" /> Terminar de hablar
                        <span className="ml-1 flex items-center gap-[3px]">
                          {[0, 1, 2, 3].map((i) => (
                            <span
                              key={i}
                              className="h-3.5 w-[3px] rounded-full bg-white/90"
                              style={{
                                animation: `esther-bar 0.8s ease-in-out ${i * 0.1}s infinite`,
                              }}
                            />
                          ))}
                        </span>
                      </>
                    ) : (
                      <>
                        <Mic className="size-4" /> Hablar con Esther
                      </>
                    )}
                  </button>
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => esther.setLeerEnVoz(!esther.leerEnVoz)}
                      disabled={montado && !vozDisponible()}
                      aria-pressed={esther.leerEnVoz}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition disabled:opacity-40 ${esther.leerEnVoz ? "bg-primary text-primary-foreground" : "bg-card/90 text-muted-foreground hover:text-foreground"}`}
                    >
                      {esther.leerEnVoz ? (
                        <Volume2 className="size-3.5" />
                      ) : (
                        <VolumeX className="size-3.5" />
                      )}
                      Respuesta en voz alta
                    </button>
                    <span className="text-[10.5px] text-muted-foreground">Decí “Esther, …”</span>
                  </div>
                  {microfono.aviso && (
                    <p className="rounded-xl bg-amber-50 px-3 py-2 text-[11px] font-medium text-amber-700">
                      {microfono.aviso}
                    </p>
                  )}
                </div>
              </div>

              {hallazgos.length > 0 && (
                <div className="card-grad p-4">
                  <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                    <Sparkles className="size-3.5 text-primary" /> Esther detectó
                  </p>
                  <ul className="mt-2.5 space-y-2">
                    {hallazgos.map((h) => (
                      <li key={h.texto}>
                        <button
                          type="button"
                          disabled={esther.isBusy}
                          onClick={() => void esther.send(h.pregunta)}
                          className="flex w-full items-start gap-2.5 rounded-2xl border border-primary/10 bg-card px-3 py-2 text-left transition hover:border-primary/30 disabled:opacity-60"
                        >
                          {h.tono === "alerta" ? (
                            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
                          ) : (
                            <Info className="mt-0.5 size-4 shrink-0 text-primary" />
                          )}
                          <span className="min-w-0">
                            <span className="block text-[13px] font-semibold">{h.texto}</span>
                            <span className="block text-[11px] text-muted-foreground">
                              {h.detalle}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {conN8n && (
                <div className="card-grad p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                      <Workflow className="size-3.5 text-rose-500" /> Esther + n8n
                    </p>
                    <button
                      type="button"
                      onClick={() => void navigate({ to: "/demo/automatizaciones" as never })}
                      className="text-[11px] font-semibold text-primary hover:underline"
                    >
                      Ver flujos
                    </button>
                  </div>
                  <p className="mt-2 text-[13px] font-semibold">
                    {n8n.flujos.filter((f) => f.activo).length} flujos activos usan a Esther
                  </p>
                  <p className="mt-0.5 text-[11px] leading-5 text-muted-foreground">
                    {ultimaEj
                      ? `Última ejecución: ${ultimaEj.flujo} (${ultimaEj.estado.toLowerCase()}).`
                      : "n8n le pide a Esther que redacte, priorice o clasifique, y ejecuta la acción."}
                  </p>
                </div>
              )}
            </div>

            {/* Conversación */}
            <div className="flex min-w-0 flex-col gap-4">
              <div className="card-grad flex h-[640px] flex-col p-4 lg:h-[680px]">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-primary/10 pb-3">
                  <p className="text-sm font-semibold">Conversación</p>
                  <div className="flex flex-wrap gap-1.5 text-[11px]">
                    <span className="rounded-full bg-primary/[0.07] px-2.5 py-1 font-medium text-primary">
                      {paciente ? `${paciente.nombre} ${paciente.apellido}` : "Toda la clínica"}
                    </span>
                    <span className="rounded-full bg-primary/[0.07] px-2.5 py-1 font-medium text-primary">
                      {ROL_IA_LABEL[rol]}
                    </span>
                    <span className="rounded-full bg-primary/[0.07] px-2.5 py-1 font-medium text-primary">
                      {sede === "Todas" ? "Todas las sedes" : sede}
                    </span>
                  </div>
                </div>
                <EstherConversation
                  messages={esther.messages}
                  isBusy={esther.isBusy}
                  onSend={(text) => void esther.send(text)}
                  onTyping={esther.notifyTyping}
                  microfono={microfono}
                  sugerencias={sugerencias}
                />
              </div>

              <div className="card-grad p-4">
                <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  Acciones rápidas
                </h2>
                <EstherQuickActionsBlock disabled={esther.isBusy} onAction={handleAction} />
                <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
                  Esther responde solo con datos de esta empresa, según el rol y la sede elegidos.
                  Cada consulta queda registrada en auditoría.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
      {herramienta &&
        createPortal(
          <Modal
            modulo="Cloud Esther IA"
            titulo={
              herramienta === "imagen"
                ? "Rayos X con IA"
                : `Simulador de sonrisa${paciente ? ` · ${paciente.nombre} ${paciente.apellido}` : ""}`
            }
            onClose={() => setHerramienta(null)}
            ancho="max-w-5xl"
          >
            {herramienta === "imagen" ? (
              <RayosXIA pacienteId={pacienteId} onToast={setAviso} />
            ) : (
              <SimuladorSonrisa pacienteFijo={pacienteId ?? pacientes[0]?.id} compacto />
            )}
          </Modal>,
          document.body,
        )}
      {aviso && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-[70] -translate-x-1/2 rounded-full bg-foreground px-4 py-2 text-xs font-medium text-background shadow-xl"
        >
          {aviso}
        </div>
      )}
    </section>
  );
}
