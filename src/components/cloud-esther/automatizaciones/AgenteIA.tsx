import { useMemo, useState } from "react";
import {
  AlarmClock,
  Bot,
  CheckCircle2,
  Clock3,
  MessageCircle,
  Pause,
  Play,
  Plug,
  Plus,
  ShieldAlert,
  Siren,
  Trash2,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import { CaraEsther } from "@/components/cloud-esther/esther-ai/CaraEsther";
import type { PlanId } from "@/lib/cloud-esther/data";
import {
  storeAgenteIA,
  metricasAgente,
  type ConfigAgente,
  type EstadoAgente,
} from "@/lib/cloud-esther/agente-ia-store";
import { ProbadorAgente } from "@/components/cloud-esther/automatizaciones/ProbadorAgente";
import {
  BTN_PRIMARIO,
  BTN_SECUNDARIO,
  CHIP,
  Field,
  INPUT,
  hace,
} from "@/components/cloud-esther/rrhh/ui";

/* Ubicación: src/components/cloud-esther/automatizaciones/AgenteIA.tsx
   Panel destacado del Agente de IA 24/7 (atención por WhatsApp). HONESTO: el canal de WhatsApp
   figura "pendiente de conexión" hasta integrar los servicios externos (WhatsApp Business + n8n +
   IA/transcripción). Las métricas salen de conversaciones reales; el Probador deja probar el cerebro
   (IA + agenda reales) sin fingir la conexión de WhatsApp. */

const ETIQUETA_ESTADO: Record<EstadoAgente, { t: string; cls: string; i: LucideIcon }> = {
  activo: { t: "Activo", cls: "border-emerald-200 bg-emerald-50 text-emerald-700", i: CheckCircle2 },
  pausado: { t: "Pausado", cls: "border-amber-200 bg-amber-50 text-amber-700", i: Pause },
  desconectado: { t: "Desconectado", cls: "border-slate-200 bg-slate-50 text-slate-600", i: Clock3 },
};

export function AgenteIA({
  plan: _plan,
  usuario,
  onToast,
}: {
  plan: PlanId;
  usuario: string;
  onToast: (m: string) => void;
}) {
  const est = storeAgenteIA.usar();
  const m = useMemo(() => metricasAgente(est), [est]);
  const [verConfig, setVerConfig] = useState(false);

  const setEstado = (estado: EstadoAgente) => {
    storeAgenteIA.poner({ ...storeAgenteIA.leer(), estado });
    onToast(
      estado === "activo"
        ? "Agente activado (atenderá cuando WhatsApp esté conectado)."
        : estado === "pausado"
          ? "Agente en pausa."
          : "Agente desconectado.",
    );
  };

  const metricas: { l: string; v: number; i: LucideIcon }[] = [
    { l: "Mensajes atendidos", v: m.mensajesAtendidos, i: MessageCircle },
    { l: "Turnos generados", v: m.turnosGenerados, i: AlarmClock },
    { l: "Nuevos pacientes", v: m.nuevosPacientes, i: UserPlus },
    { l: "Urgencias detectadas", v: m.urgencias, i: Siren },
    { l: "Derivadas al equipo", v: m.derivadas, i: Users },
    { l: "Conversaciones", v: m.conversaciones, i: Bot },
  ];

  return (
    <div className="space-y-5">
      {/* ───────── Hero ───────── */}
      <section className="relative overflow-hidden rounded-[26px] text-white shadow-[0_26px_60px_-30px_rgba(76,29,149,0.9)]"
        style={{ background: "linear-gradient(135deg,#3b1673 0%,#6d28d9 52%,#a855f7 100%)" }}>
        <div className="pointer-events-none absolute -right-16 -top-20 size-72 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-10 size-72 rounded-full bg-fuchsia-300/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between md:p-8">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em]">
              Nuevo · Enterprise
            </span>
            <h2 className="mt-3 flex items-center gap-2 text-[30px] font-bold leading-none tracking-[-0.03em] md:text-[38px]">
              <Bot className="size-8 shrink-0" /> Agente de IA 24/7
            </h2>
            <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-white/85">
              Atención inteligente por WhatsApp, incluso cuando tu clínica está cerrada. Recibe mensajes
              y audios, entiende qué necesita el paciente, agenda turnos reales y deriva las urgencias.
            </p>
          </div>
          <div className="shrink-0 self-center">
            <div className="grid size-28 place-items-center rounded-full bg-white/10 ring-1 ring-white/20 md:size-32">
              <CaraEsther className="size-24" />
            </div>
          </div>
        </div>
      </section>

      {/* ───────── Estado + control ───────── */}
      <section className="grid gap-3 md:grid-cols-[1.3fr_1fr]">
        <div className="card-grad p-4">
          <p className="text-[12px] font-semibold text-muted-foreground">Estado del agente</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {(["activo", "pausado", "desconectado"] as const).map((e) => {
              const meta = ETIQUETA_ESTADO[e];
              const activo = est.estado === e;
              return (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEstado(e)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition ${
                    activo ? meta.cls : "border-primary/15 bg-white text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  <meta.i className="size-3.5" />
                  {meta.t}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {est.estado === "activo" ? (
              <button type="button" className={BTN_SECUNDARIO} onClick={() => setEstado("pausado")}>
                <Pause className="size-4" /> Pausar agente
              </button>
            ) : (
              <button type="button" className={BTN_PRIMARIO} onClick={() => setEstado("activo")}>
                <Play className="size-4" /> Activar agente
              </button>
            )}
            <button
              type="button"
              className={BTN_SECUNDARIO}
              onClick={() => {
                setEstado("pausado");
                onToast(`Atención transferida a una persona (${est.config.derivarA}).`);
              }}
            >
              <Users className="size-4" /> Transferir a una persona
            </button>
          </div>
        </div>

        {/* WhatsApp: estado honesto */}
        <div className="card-grad flex flex-col justify-between p-4">
          <div>
            <p className="text-[12px] font-semibold text-muted-foreground">Conexión de WhatsApp</p>
            <div className="mt-2">
              {est.whatsappConectado ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[12px] font-bold text-emerald-700">
                  <CheckCircle2 className="size-3.5" /> WhatsApp conectado
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[12px] font-bold text-amber-700">
                  <Plug className="size-3.5" /> Pendiente de conexión
                </span>
              )}
            </div>
          </div>
          <p className="mt-3 text-[11.5px] leading-relaxed text-muted-foreground">
            Mientras WhatsApp no esté conectado, el agente no atiende mensajes reales. Podés probar su
            funcionamiento abajo, en el <b>Probador</b>.
          </p>
        </div>
      </section>

      {/* ───────── Cómo activarlo (honesto) ───────── */}
      {!est.whatsappConectado && (
        <section className="rounded-2xl border border-amber-300/40 bg-amber-500/[0.06] p-4">
          <p className="flex items-center gap-1.5 text-[13px] font-semibold text-amber-700">
            <ShieldAlert className="size-4" /> Cómo se activa la atención real por WhatsApp
          </p>
          <p className="mt-1 text-[12px] leading-relaxed text-amber-900/80 dark:text-amber-100/80">
            Para que el agente atienda WhatsApp de verdad (recibir mensajes y audios, transcribir y
            agendar solo), falta conectar servicios externos. Hasta entonces, acá figura como pendiente
            —nunca se simula una conexión real—.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {[
              { t: "WhatsApp Business API", d: "Número y credenciales de la clínica." },
              { t: "n8n (motor de flujos)", d: "Orquesta el ida y vuelta de los mensajes." },
              { t: "IA + transcripción", d: "Entiende el texto y los audios." },
            ].map((x) => (
              <div key={x.t} className="rounded-xl border border-amber-200/60 bg-white/70 p-3 dark:bg-white/5">
                <p className="flex items-center gap-1.5 text-[12px] font-semibold">
                  <Clock3 className="size-3.5 text-amber-600" /> {x.t}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{x.d}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ───────── Métricas (reales) ───────── */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[13px] font-semibold">Actividad del agente</p>
          <span className="text-[11px] text-muted-foreground">Datos reales · sin números inventados</span>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {metricas.map((x) => (
            <div key={x.l} className="card-grad p-3 text-center">
              <x.i className="mx-auto size-4 text-primary" />
              <p className="mt-1 text-[22px] font-bold leading-none tabular-nums">{x.v}</p>
              <p className="mt-1 text-[10.5px] leading-tight text-muted-foreground">{x.l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ───────── Probador (IA + agenda reales) ───────── */}
      <ProbadorAgente usuario={usuario} onToast={onToast} />

      {/* ───────── Historial de conversaciones ───────── */}
      <section className="card-grad p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-[13px] font-semibold">
            <MessageCircle className="size-4 text-primary" /> Historial de conversaciones
          </p>
          <span className="text-[11px] text-muted-foreground">{est.conversaciones.length}</span>
        </div>
        {est.conversaciones.length === 0 ? (
          <div className="rounded-xl border border-dashed border-primary/20 bg-white/60 p-6 text-center dark:bg-white/5">
            <Bot className="mx-auto size-6 text-primary/50" />
            <p className="mt-2 text-[12.5px] font-medium">Todavía no hay conversaciones.</p>
            <p className="mt-0.5 text-[11.5px] text-muted-foreground">
              Cuando el agente atienda por WhatsApp (o uses el Probador), las conversaciones aparecen acá.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {est.conversaciones
              .slice()
              .reverse()
              .slice(0, 12)
              .map((c) => (
                <li
                  key={c.id}
                  className="flex items-center gap-3 rounded-xl border border-primary/10 bg-white/80 px-3 py-2.5 dark:bg-white/5"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                    <MessageCircle className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-semibold">
                      {c.paciente}
                      {c.prueba && (
                        <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">
                          prueba
                        </span>
                      )}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {c.mensajes[c.mensajes.length - 1]?.texto ?? ""} · {hace(c.fecha)}
                    </p>
                  </div>
                  <ResultadoPill resultado={c.resultado} />
                </li>
              ))}
          </ul>
        )}
      </section>

      {/* ───────── Configuración ───────── */}
      <section className="card-grad p-4">
        <button
          type="button"
          onClick={() => setVerConfig((v) => !v)}
          className="flex w-full items-center justify-between text-left"
        >
          <span className="flex items-center gap-1.5 text-[13px] font-semibold">
            <Bot className="size-4 text-primary" /> Configuración del agente
          </span>
          <span className="text-[11px] font-semibold text-primary">{verConfig ? "Ocultar" : "Configurar"}</span>
        </button>
        {verConfig && <ConfigForm onToast={onToast} />}
      </section>
    </div>
  );
}

function ResultadoPill({ resultado }: { resultado: string }) {
  const map: Record<string, { t: string; cls: string }> = {
    turno: { t: "Turno agendado", cls: "bg-emerald-100 text-emerald-700" },
    urgencia: { t: "Urgencia", cls: "bg-rose-100 text-rose-700" },
    derivada: { t: "Derivada", cls: "bg-amber-100 text-amber-700" },
    consulta: { t: "Consulta", cls: "bg-sky-100 text-sky-700" },
    abierta: { t: "Abierta", cls: "bg-slate-100 text-slate-600" },
  };
  const v = map[resultado] ?? map["abierta"]!;
  return <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${v.cls}`}>{v.t}</span>;
}

/* ───────── Configuración ───────── */
function ConfigForm({ onToast }: { onToast: (m: string) => void }) {
  const est = storeAgenteIA.usar();
  const [c, setC] = useState<ConfigAgente>(est.config);

  const set = <K extends keyof ConfigAgente>(k: K, v: ConfigAgente[K]) => setC((p) => ({ ...p, [k]: v }));

  const guardar = () => {
    storeAgenteIA.poner({ ...storeAgenteIA.leer(), config: c });
    onToast("Configuración del agente guardada.");
  };

  return (
    <div className="mt-4 space-y-4">
      <Field label="Mensaje de bienvenida">
        <textarea
          value={c.bienvenida}
          onChange={(e) => set("bienvenida", e.target.value)}
          rows={2}
          className={`${INPUT} resize-none`}
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex items-center gap-2 rounded-xl border border-primary/15 bg-white/70 px-3 py-2.5 text-[12.5px] dark:bg-white/5">
          <input
            type="checkbox"
            checked={c.atiende24_7}
            onChange={(e) => set("atiende24_7", e.target.checked)}
          />
          Atender las 24 horas (todos los días)
        </label>
        <Field label="Deriva urgencias / casos complejos a">
          <input value={c.derivarA} onChange={(e) => set("derivarA", e.target.value)} className={INPUT} />
        </Field>
      </div>

      {!c.atiende24_7 && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Atiende desde">
            <input type="time" value={c.horarioAutoDesde} onChange={(e) => set("horarioAutoDesde", e.target.value)} className={INPUT} />
          </Field>
          <Field label="Atiende hasta">
            <input type="time" value={c.horarioAutoHasta} onChange={(e) => set("horarioAutoHasta", e.target.value)} className={INPUT} />
          </Field>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Duración del turno (min)">
          <input
            type="number"
            min={10}
            step={5}
            value={c.duracionTurnoMin}
            onChange={(e) => set("duracionTurnoMin", Number(e.target.value) || 30)}
            className={INPUT}
          />
        </Field>
        <Field label="Recordatorio: anticipación (horas)">
          <input
            type="number"
            min={1}
            value={c.anticipacionRecordatorioHoras}
            onChange={(e) => set("anticipacionRecordatorioHoras", Number(e.target.value) || 24)}
            className={INPUT}
          />
        </Field>
      </div>

      <ListaChips
        label="Tipos de consulta"
        items={c.tiposConsulta}
        onChange={(v) => set("tiposConsulta", v)}
        placeholder="Agregar tipo…"
      />
      <ListaChips
        label="Palabras que disparan el protocolo de urgencia"
        items={c.palabrasUrgencia}
        onChange={(v) => set("palabrasUrgencia", v)}
        placeholder="Agregar palabra…"
      />

      <div className="flex justify-end">
        <button type="button" className={BTN_PRIMARIO} onClick={guardar}>
          <CheckCircle2 className="size-4" /> Guardar configuración
        </button>
      </div>
    </div>
  );
}

function ListaChips({
  label,
  items,
  onChange,
  placeholder,
}: {
  label: string;
  items: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
}) {
  const [txt, setTxt] = useState("");
  const agregar = () => {
    const v = txt.trim();
    if (!v || items.includes(v)) return;
    onChange([...items, v]);
    setTxt("");
  };
  return (
    <Field label={label}>
      <div className="flex flex-wrap gap-1.5">
        {items.map((it) => (
          <span key={it} className={`${CHIP(false)} gap-1`}>
            {it}
            <button type="button" onClick={() => onChange(items.filter((x) => x !== it))} aria-label={`Quitar ${it}`}>
              <Trash2 className="size-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <input
          value={txt}
          onChange={(e) => setTxt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              agregar();
            }
          }}
          placeholder={placeholder}
          className={INPUT}
        />
        <button type="button" className={BTN_SECUNDARIO} onClick={agregar}>
          <Plus className="size-4" />
        </button>
      </div>
    </Field>
  );
}
