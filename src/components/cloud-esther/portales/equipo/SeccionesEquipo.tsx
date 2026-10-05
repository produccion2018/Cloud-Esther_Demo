import { useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  Bot,
  CalendarCheck2,
  Clock3,
  Globe2,
  LogIn,
  LogOut,
  MessageCircle,
  Send,
  ShieldAlert,
  Stethoscope,
  UserRound,
  Users,
} from "lucide-react";

import { EstherAI } from "@/components/cloud-esther/esther-ai/EstherAI";
import { useTodosLosRegistros } from "@/components/cloud-esther/PacienteSecciones";
import type { Turno } from "@/lib/cloud-esther/agenda-store";
import { setComunicacion, storeComunicacion } from "@/lib/cloud-esther/comunicacion-store";
import type { TeamMember } from "@/lib/cloud-esther/equipo-profesional-data";
import { enviarMensajeEquipo, storeMensajesEquipo } from "@/lib/cloud-esther/mensajes-equipo-store";
import { usePacientes } from "@/lib/cloud-esther/pacientes";
import {
  registrarEventoEquipo,
  setEquipoPortal,
  storeEquipoPortal,
} from "@/lib/cloud-esther/portal-equipo-store";
import { claveTenant } from "@/lib/cloud-esther/tenant-store";
import { PAISES_SOPORTADOS, bandera } from "@/lib/paises";
import { KpiPortal, PestanasPortal, TarjetaPortal } from "../PortalShell";

/* Ubicación: src/components/cloud-esther/portales/equipo/SeccionesEquipo.tsx
   Secciones compartidas por el Portal profesional y el Portal administrativo: Jornada (fichaje,
   inicio, cierre y resumen), Mensajes (pacientes y equipo), Reportes, IA asistencial y
   Configuración del profesional (país y preferencias). Todo por empresa. */

const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const horaActual = () => new Date().toTimeString().slice(0, 5);
const minutos = (h: string) => {
  const [a = 0, b = 0] = h.split(":").map(Number);
  return a * 60 + b;
};
const duracion = (m: number) => `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")} min`;
const nombreDe = (m: TeamMember) => `${m.firstName} ${m.lastName}`.trim();

/* ───────────── Jornada ───────────── */

export function JornadaPortal({
  yo,
  turnos,
  vista,
  onToast,
}: {
  yo: TeamMember;
  /** Turnos que atiende o gestiona el integrante (para el resumen). */
  turnos: Turno[];
  vista: boolean;
  onToast: (m: string) => void;
}) {
  const { fichajes } = storeEquipoPortal.usar();
  const hoy = hoyISO();
  const mios = fichajes.filter((f) => f.miembroId === yo.id);
  const deHoy = mios.filter((f) => f.fecha === hoy);
  const abierto = deHoy.find((f) => !f.salida);
  // Nunca negativo: si la entrada de ejemplo es posterior a la hora actual, cuenta 0.
  const trabajados = deHoy.reduce(
    (a, f) => a + Math.max(0, minutos(f.salida ?? horaActual()) - minutos(f.entrada)),
    0,
  );
  const turnosHoy = turnos.filter((t) => t.fecha === hoy && t.estado !== "Cancelada");
  const atendidos = turnosHoy.filter((t) => t.estado === "Atendida").length;
  const ausentes = turnosHoy.filter((t) => t.estado === "Ausente").length;
  const semana = [...new Set(mios.map((f) => f.fecha))].sort().reverse().slice(0, 7);

  const fichar = () => {
    if (vista) return onToast("En la vista previa no se puede fichar.");
    const h = horaActual();
    if (abierto) {
      setEquipoPortal("fichajes", (prev) =>
        prev.map((f) => (f.id === abierto.id ? { ...f, salida: h } : f)),
      );
      registrarEventoEquipo(yo.id, "Cerró la jornada", h);
      onToast(`Jornada cerrada a las ${h}. ¡Buen descanso!`);
    } else {
      setEquipoPortal("fichajes", (prev) => [
        ...prev,
        { id: `f-${Date.now()}`, miembroId: yo.id, fecha: hoy, entrada: h },
      ]);
      registrarEventoEquipo(yo.id, "Inició la jornada", h);
      onToast(`Jornada iniciada a las ${h}`);
    }
  };

  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-primary via-violet-600 to-fuchsia-600 p-5 text-white shadow-[0_24px_60px_-30px_rgba(124,58,237,0.75)] sm:p-6">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-white/10 blur-2xl"
        />
        <p className="relative text-xs font-semibold uppercase tracking-[0.18em] text-white/75">
          Jornada de hoy
        </p>
        <p className="relative mt-1 font-display text-3xl font-bold tabular-nums">
          {duracion(trabajados)}
        </p>
        <p className="relative text-sm text-white/85">
          {abierto
            ? `En curso desde las ${abierto.entrada}`
            : deHoy.length
              ? "Jornada cerrada"
              : "Todavía no iniciaste la jornada"}
        </p>
        <button
          type="button"
          onClick={fichar}
          className="relative mt-4 inline-flex min-h-12 items-center gap-2 rounded-2xl bg-white px-5 text-sm font-bold text-primary shadow-lg transition hover:-translate-y-0.5"
        >
          {abierto ? <LogOut className="size-4" /> : <LogIn className="size-4" />}
          {abierto ? "Cerrar jornada" : "Iniciar jornada"}
        </button>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiPortal titulo="Turnos de hoy" valor={String(turnosHoy.length)} icon={CalendarCheck2} />
        <KpiPortal titulo="Atendidos" valor={String(atendidos)} icon={Stethoscope} tono="verde" />
        <KpiPortal titulo="Ausentes" valor={String(ausentes)} icon={UserRound} tono="rosa" />
        <KpiPortal
          titulo="Fichajes hoy"
          valor={String(deHoy.length)}
          detalle={deHoy.map((f) => `${f.entrada}–${f.salida ?? "…"}`).join(" · ") || "—"}
          icon={Clock3}
          tono="ambar"
        />
      </div>

      <TarjetaPortal titulo="Resumen de jornada" detalle="Últimos días con fichaje" icon={Clock3}>
        {semana.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Todavía no hay fichajes.</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {semana.map((d) => {
              const del = mios.filter((f) => f.fecha === d);
              const total = del.reduce(
                (a, f) =>
                  a +
                  Math.max(
                    0,
                    minutos(f.salida ?? (d === hoy ? horaActual() : f.entrada)) -
                      minutos(f.entrada),
                  ),
                0,
              );
              return (
                <li key={d} className="flex items-center gap-3 py-2.5">
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold capitalize">
                      {new Date(`${d}T12:00:00`).toLocaleDateString("es-AR", {
                        weekday: "long",
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {del.map((f) => `${f.entrada}–${f.salida ?? "en curso"}`).join(" · ")}
                    </span>
                  </span>
                  <span className="text-sm font-bold tabular-nums">{duracion(total)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </TarjetaPortal>
    </div>
  );
}

/* ───────────── Mensajes ───────────── */

export function MensajesPortal({
  yo,
  miembros,
  pacientesVisibles,
  conAvisos,
  vista,
  onToast,
}: {
  yo: TeamMember;
  miembros: TeamMember[];
  /** Nombres de pacientes cuyas conversaciones puede ver (null = todas). */
  pacientesVisibles: string[] | null;
  /** Avisos masivos a pacientes (portal administrativo). */
  conAvisos: boolean;
  vista: boolean;
  onToast: (m: string) => void;
}) {
  const [pestana, setPestana] = useState<"pacientes" | "equipo" | "avisos">("pacientes");
  return (
    <div className="space-y-4">
      <PestanasPortal
        valor={pestana}
        onCambiar={setPestana}
        opciones={[
          { id: "pacientes", label: "Pacientes" },
          { id: "equipo", label: "Equipo" },
          ...(conAvisos ? [{ id: "avisos" as const, label: "Avisos a pacientes" }] : []),
        ]}
      />
      {pestana === "pacientes" && (
        <ChatPacientes yo={yo} visibles={pacientesVisibles} vista={vista} onToast={onToast} />
      )}
      {pestana === "equipo" && <ChatEquipo yo={yo} miembros={miembros} vista={vista} />}
      {pestana === "avisos" && <AvisosPacientes vista={vista} onToast={onToast} />}
    </div>
  );
}

function ChatPacientes({
  yo,
  visibles,
  vista,
  onToast,
}: {
  yo: TeamMember;
  visibles: string[] | null;
  vista: boolean;
  onToast: (m: string) => void;
}) {
  const { conversaciones } = storeComunicacion.usar();
  const lista = conversaciones.filter((c) => !visibles || visibles.includes(c.paciente));
  const [actual, setActual] = useState<number | null>(lista[0]?.id ?? null);
  const [texto, setTexto] = useState("");
  const conv = lista.find((c) => c.id === actual);
  const fin = useRef<HTMLDivElement>(null);
  useEffect(() => fin.current?.scrollIntoView({ block: "end" }), [conv?.mensajes.length, actual]);

  const enviar = () => {
    const t = texto.trim();
    if (!t || !conv) return;
    if (vista) return onToast("En la vista previa no se envían mensajes.");
    setComunicacion("conversaciones", (prev) =>
      prev.map((c) =>
        c.id === conv.id
          ? {
              ...c,
              estado: "Abierta" as const,
              noLeidos: 0,
              mensajes: [
                ...c.mensajes,
                {
                  id: Date.now(),
                  de: "clinica" as const,
                  texto: t,
                  fecha: new Date().toISOString(),
                  autor: nombreDe(yo),
                },
              ],
            }
          : c,
      ),
    );
    setTexto("");
  };

  return (
    <div className="grid gap-3 lg:grid-cols-[300px_1fr]">
      <TarjetaPortal className="!p-2">
        {lista.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">No hay conversaciones.</p>
        ) : (
          <ul className="max-h-[520px] space-y-1 overflow-y-auto">
            {lista.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setActual(c.id)}
                  className={`flex w-full items-center gap-2.5 rounded-2xl px-3 py-2.5 text-left transition ${
                    c.id === actual
                      ? "bg-gradient-to-r from-primary/15 to-fuchsia-500/10"
                      : "hover:bg-muted/60"
                  }`}
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {c.paciente
                      .split(" ")
                      .map((x) => x[0])
                      .slice(0, 2)
                      .join("")}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{c.paciente}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {c.mensajes.at(-1)?.texto ?? ""}
                    </span>
                  </span>
                  {c.noLeidos > 0 && (
                    <span className="grid min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                      {c.noLeidos}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </TarjetaPortal>
      <TarjetaPortal className="flex min-h-[420px] flex-col !p-0 overflow-hidden">
        {!conv ? (
          <p className="m-auto p-6 text-sm text-muted-foreground">Elegí una conversación.</p>
        ) : (
          <>
            <div className="border-b border-border/60 px-4 py-3">
              <p className="text-sm font-bold">{conv.paciente}</p>
              <p className="text-xs text-muted-foreground">
                {conv.canal} · {conv.estado}
              </p>
            </div>
            <div
              className="flex-1 space-y-2 overflow-y-auto bg-primary/[0.02] p-4"
              style={{ maxHeight: 420 }}
            >
              {conv.mensajes
                .filter((m) => m.de === "paciente" || m.de === "clinica")
                .map((m) => (
                  <div key={m.id} className={`flex ${m.de === "clinica" ? "justify-end" : ""}`}>
                    <p
                      className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                        m.de === "clinica"
                          ? "bg-gradient-to-br from-primary to-fuchsia-500 text-white"
                          : "border border-border bg-card"
                      }`}
                    >
                      {m.texto}
                    </p>
                  </div>
                ))}
              <div ref={fin} />
            </div>
            <form
              className="flex gap-2 border-t border-border/60 p-3"
              onSubmit={(e) => {
                e.preventDefault();
                enviar();
              }}
            >
              <input
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="Escribí una respuesta"
                className="h-11 min-w-0 flex-1 rounded-xl border border-primary/15 bg-card px-3 text-base outline-none sm:text-sm"
              />
              <button
                type="submit"
                disabled={!texto.trim()}
                className="btn-ce !min-h-11"
                aria-label="Enviar"
              >
                <Send className="size-4" />
              </button>
            </form>
          </>
        )}
      </TarjetaPortal>
    </div>
  );
}

function ChatEquipo({
  yo,
  miembros,
  vista,
}: {
  yo: TeamMember;
  miembros: TeamMember[];
  vista: boolean;
}) {
  const { mensajes } = storeMensajesEquipo.usar();
  const [para, setPara] = useState("todos");
  const [texto, setTexto] = useState("");
  const visibles = mensajes.filter((m) =>
    para === "todos"
      ? m.para === "todos"
      : (m.deId === yo.id && m.para === para) || (m.deId === para && m.para === yo.id),
  );
  const fin = useRef<HTMLDivElement>(null);
  useEffect(() => fin.current?.scrollIntoView({ block: "end" }), [visibles.length, para]);

  return (
    <TarjetaPortal className="!p-0 overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-border/60 px-4 py-3">
        <Users className="size-4 text-primary" />
        <select
          value={para}
          onChange={(e) => setPara(e.target.value)}
          className="h-10 rounded-full border border-primary/15 bg-card px-3 text-sm"
          aria-label="Conversación"
        >
          <option value="todos">Canal general del equipo</option>
          {miembros
            .filter((m) => m.id !== yo.id && m.status === "activo")
            .map((m) => (
              <option key={m.id} value={m.id}>
                {nombreDe(m)}
              </option>
            ))}
        </select>
      </div>
      <div
        className="space-y-2 overflow-y-auto bg-primary/[0.02] p-4"
        style={{ maxHeight: 420, minHeight: 260 }}
      >
        {visibles.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">Todavía no hay mensajes.</p>
        )}
        {visibles.map((m) => (
          <div key={m.id} className={`flex ${m.deId === yo.id ? "justify-end" : ""}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${m.deId === yo.id ? "bg-gradient-to-br from-primary to-fuchsia-500 text-white" : "border border-border bg-card"}`}
            >
              {m.deId !== yo.id && (
                <p className="text-[11px] font-bold text-primary">{m.deNombre}</p>
              )}
              {m.texto}
            </div>
          </div>
        ))}
        <div ref={fin} />
      </div>
      <form
        className="flex gap-2 border-t border-border/60 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          const t = texto.trim();
          if (!t || vista) return;
          enviarMensajeEquipo({ deId: yo.id, deNombre: nombreDe(yo), para, texto: t });
          setTexto("");
        }}
      >
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Mensaje para el equipo"
          className="h-11 min-w-0 flex-1 rounded-xl border border-primary/15 bg-card px-3 text-base outline-none sm:text-sm"
        />
        <button
          type="submit"
          disabled={!texto.trim()}
          className="btn-ce !min-h-11"
          aria-label="Enviar"
        >
          <Send className="size-4" />
        </button>
      </form>
    </TarjetaPortal>
  );
}

function AvisosPacientes({ vista, onToast }: { vista: boolean; onToast: (m: string) => void }) {
  const { pacientes } = usePacientes();
  const activos = pacientes.filter((p) => p.estado === "Activo");
  const [sel, setSel] = useState<number[]>([]);
  const [texto, setTexto] = useState("");
  const enviar = () => {
    const t = texto.trim();
    if (!t || !sel.length || vista) return;
    const elegidos = activos.filter((p) => sel.includes(p.id));
    setComunicacion("conversaciones", (prev) => {
      let lista = [...prev];
      for (const p of elegidos) {
        const nombre = `${p.nombre} ${p.apellido}`.trim();
        const msg = {
          id: Date.now() + p.id,
          de: "clinica" as const,
          texto: t,
          fecha: new Date().toISOString(),
        };
        const c = lista.find((x) => x.paciente === nombre);
        lista = c
          ? lista.map((x) => (x.id === c.id ? { ...x, mensajes: [...x.mensajes, msg] } : x))
          : [
              {
                id: Date.now() + p.id * 7,
                paciente: nombre,
                telefono: p.telefono,
                email: p.email,
                canal: "WhatsApp",
                estado: "Abierta" as const,
                asignado: "",
                etiquetas: ["Aviso"],
                noLeidos: 0,
                fijada: false,
                mensajes: [msg],
              },
              ...lista,
            ];
      }
      return lista;
    });
    onToast(`Aviso enviado a ${elegidos.length} pacientes`);
    setTexto("");
    setSel([]);
  };
  return (
    <TarjetaPortal
      titulo="Avisos a pacientes"
      detalle="Llega al chat del paciente y a su portal"
      icon={MessageCircle}
    >
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={3}
        placeholder="Ej.: El lunes 12 la clínica abre a las 10."
        className="w-full rounded-xl border border-primary/15 bg-card px-3 py-2 text-base outline-none sm:text-sm"
      />
      <div className="mt-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setSel(sel.length === activos.length ? [] : activos.map((p) => p.id))}
          className="text-xs font-semibold text-primary"
        >
          {sel.length === activos.length ? "Quitar todos" : "Elegir todos"}
        </button>
        <span className="text-xs text-muted-foreground">{sel.length} elegidos</span>
      </div>
      <ul className="mt-2 grid max-h-64 gap-1 overflow-y-auto sm:grid-cols-2">
        {activos.map((p) => (
          <li key={p.id}>
            <label className="flex min-h-11 items-center gap-2 rounded-xl px-2 hover:bg-muted/50">
              <input
                type="checkbox"
                checked={sel.includes(p.id)}
                onChange={(e) =>
                  setSel((s) => (e.target.checked ? [...s, p.id] : s.filter((x) => x !== p.id)))
                }
                className="size-4 accent-[var(--primary)]"
              />
              <span className="text-sm">
                {p.nombre} {p.apellido}
              </span>
            </label>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={enviar}
        disabled={!texto.trim() || !sel.length}
        className="btn-ce mt-3 !min-h-11 w-full justify-center"
      >
        <Send className="size-4" /> Enviar aviso
      </button>
    </TarjetaPortal>
  );
}

/* ───────────── Reportes ───────────── */

function Barras({ datos }: { datos: { label: string; valor: number }[] }) {
  const max = Math.max(1, ...datos.map((d) => d.valor));
  return (
    <ul className="space-y-2">
      {datos.map((d) => (
        <li
          key={d.label}
          className="grid grid-cols-[110px_1fr_40px] items-center gap-2 text-xs sm:grid-cols-[150px_1fr_48px]"
        >
          <span className="truncate font-medium">{d.label}</span>
          <span className="h-2.5 overflow-hidden rounded-full bg-primary/10">
            <span
              className="block h-full rounded-full bg-gradient-to-r from-primary to-fuchsia-500"
              style={{ width: `${(d.valor / max) * 100}%` }}
            />
          </span>
          <span className="text-right font-bold tabular-nums">{d.valor}</span>
        </li>
      ))}
    </ul>
  );
}

export function ReportesPortal({
  modo,
  turnos,
  yo,
}: {
  modo: "profesional" | "administracion";
  turnos: Turno[];
  yo: TeamMember;
}) {
  const registros = useTodosLosRegistros();
  const { pacientes } = usePacientes();
  const { eventos } = storeEquipoPortal.usar();
  const mesActual = hoyISO().slice(0, 7);
  const meses = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i), 1);
    return d.toISOString().slice(0, 7);
  });
  const nombreMes = (m: string) =>
    new Date(`${m}-15T12:00:00`).toLocaleDateString("es-AR", { month: "short" });
  const delMes = turnos.filter((t) => t.fecha.startsWith(mesActual));
  const atendidos = delMes.filter((t) => t.estado === "Atendida");
  const pacientesAtendidos = new Set(atendidos.map((t) => t.paciente)).size;
  const porEstado = (["Atendida", "Confirmada", "Pendiente", "Ausente", "Cancelada"] as const).map(
    (e) => ({
      label: e,
      valor: delMes.filter((t) => t.estado === e).length,
    }),
  );
  const nombre = nombreDe(yo);
  const tratamientos = Object.values(registros).flatMap((r) =>
    r.tratamientos.filter((t) => modo === "administracion" || t.profesional.includes(yo.lastName)),
  );
  const cobros = Object.values(registros).flatMap((r) => r.cuenta.filter((m) => m.tipo === "Pago"));
  const cobrosMes = cobros.filter((m) => m.fecha.startsWith(mesActual));
  const ausentismo = delMes.length
    ? Math.round((delMes.filter((t) => t.estado === "Ausente").length / delMes.length) * 100)
    : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiPortal titulo="Turnos del mes" valor={String(delMes.length)} icon={CalendarCheck2} />
        <KpiPortal
          titulo="Pacientes atendidos"
          valor={String(pacientesAtendidos)}
          detalle="este mes"
          icon={UserRound}
          tono="verde"
        />
        {modo === "profesional" ? (
          <>
            <KpiPortal
              titulo="Tratamientos"
              valor={String(tratamientos.length)}
              detalle={`${tratamientos.filter((t) => t.estado === "Completado" || t.estado === "Finalizado").length} completados`}
              icon={Stethoscope}
              tono="azul"
            />
            <KpiPortal titulo="Ausentismo" valor={`${ausentismo} %`} icon={BarChart3} tono="rosa" />
          </>
        ) : (
          <>
            <KpiPortal
              titulo="Cobros del mes"
              valor={`$ ${cobrosMes.reduce((a, m) => a + m.monto, 0).toLocaleString("es-AR")}`}
              detalle={`${cobrosMes.length} pagos`}
              icon={BarChart3}
              tono="azul"
            />
            <KpiPortal
              titulo="Ausencias"
              valor={String(delMes.filter((t) => t.estado === "Ausente").length)}
              detalle={`${ausentismo} % de los turnos`}
              icon={UserRound}
              tono="rosa"
            />
          </>
        )}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <TarjetaPortal titulo="Turnos por estado" detalle="Mes actual" icon={CalendarCheck2}>
          <Barras datos={porEstado} />
        </TarjetaPortal>
        <TarjetaPortal titulo="Evolución de atenciones" detalle="Últimos 6 meses" icon={BarChart3}>
          <Barras
            datos={meses.map((m) => ({
              label: nombreMes(m),
              valor: turnos.filter((t) => t.fecha.startsWith(m) && t.estado === "Atendida").length,
            }))}
          />
        </TarjetaPortal>
        {modo === "profesional" ? (
          <TarjetaPortal
            titulo="Tratamientos por estado"
            icon={Stethoscope}
            className="lg:col-span-2"
          >
            <Barras
              datos={[...new Set(tratamientos.map((t) => t.estado))].map((e) => ({
                label: e,
                valor: tratamientos.filter((t) => t.estado === e).length,
              }))}
            />
          </TarjetaPortal>
        ) : (
          <>
            <TarjetaPortal titulo="Cobros por mes" icon={BarChart3}>
              <Barras
                datos={meses.map((m) => ({
                  label: nombreMes(m),
                  valor: cobros.filter((c) => c.fecha.startsWith(m)).length,
                }))}
              />
            </TarjetaPortal>
            <TarjetaPortal
              titulo="Actividad del equipo"
              detalle="Últimas acciones en el portal"
              icon={Users}
            >
              <ul className="space-y-1.5 text-xs">
                {eventos.slice(0, 10).map((e) => (
                  <li key={e.id} className="flex gap-2">
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {new Date(e.fecha).toLocaleString("es-AR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span className="font-semibold">{e.accion}</span>
                    <span className="truncate text-muted-foreground">{e.detalle}</span>
                  </li>
                ))}
                {eventos.length === 0 && (
                  <li className="text-muted-foreground">Sin actividad registrada.</li>
                )}
              </ul>
            </TarjetaPortal>
          </>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground">
        {modo === "profesional"
          ? `Datos de la agenda y la carpeta de los pacientes de ${nombre}.`
          : `Datos de toda la clínica (${pacientes.length} pacientes).`}
      </p>
    </div>
  );
}

/* ───────────── IA asistencial ───────────── */

export function IAPortal({
  yo,
  plan,
}: {
  yo: TeamMember;
  plan: "inicial" | "profesional" | "avanzada" | "grupo";
}) {
  const rol =
    yo.role === "odontologo"
      ? "odontologo"
      : yo.role === "asistente"
        ? "asistente"
        : yo.role === "secretaria"
          ? "secretaria"
          : "admin";
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-3xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <ShieldAlert className="mt-0.5 size-5 shrink-0" />
        <p>
          <b>Esther es una herramienta de apoyo.</b> Analiza y organiza la información disponible,
          sugiere y responde consultas, pero <b>nunca reemplaza al profesional</b>: la decisión
          final siempre corresponde al profesional tratante.
        </p>
      </div>
      <TarjetaPortal
        titulo="IA asistencial"
        detalle="Consultas sobre pacientes, agenda, historia clínica e informes"
        icon={Bot}
      >
        <EstherAI
          context={{ section: "general", plan, rol, usuario: nombreDe(yo), n8n: plan === "grupo" }}
        />
      </TarjetaPortal>
    </div>
  );
}

/* ───────────── Configuración del profesional ───────────── */

type PerfilProfesional = {
  pais: string;
  idioma: string;
  avisosTurnos: boolean;
  avisosAutorizaciones: boolean;
};

export function ConfiguracionProfesional({
  yo,
  onToast,
}: {
  yo: TeamMember;
  onToast: (m: string) => void;
}) {
  const clave = useMemo(() => claveTenant(`cloud-esther:perfil-portal:${yo.id}`), [yo.id]);
  const [p, setP] = useState<PerfilProfesional>({
    pais: "AR",
    idioma: "es",
    avisosTurnos: true,
    avisosAutorizaciones: true,
  });
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(clave);
      if (raw) setP((x) => ({ ...x, ...(JSON.parse(raw) as Partial<PerfilProfesional>) }));
    } catch {
      /* sin almacenamiento */
    }
  }, [clave]);
  const guardar = (sig: PerfilProfesional) => {
    setP(sig);
    try {
      window.localStorage.setItem(clave, JSON.stringify(sig));
    } catch {
      /* sin almacenamiento */
    }
    onToast("Preferencias guardadas");
  };
  const elegido = PAISES_SOPORTADOS.find((x) => x.codigo === p.pais);
  return (
    <TarjetaPortal
      titulo="Configuración profesional"
      detalle="País de trabajo y avisos"
      icon={Globe2}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold">
          País
          <select
            value={p.pais}
            onChange={(e) => guardar({ ...p, pais: e.target.value })}
            className="mt-1 h-11 w-full rounded-xl border border-primary/15 bg-card px-3 text-base sm:h-10 sm:text-sm"
          >
            {PAISES_SOPORTADOS.map((x) => (
              <option key={x.codigo} value={x.codigo}>
                {bandera(x.codigo)} {x.nombre}
              </option>
            ))}
          </select>
          {elegido && (
            <span className="mt-1 block text-[11px] font-normal text-muted-foreground">
              {elegido.zonaHoraria} · {elegido.moneda}
            </span>
          )}
        </label>
        <label className="text-xs font-semibold">
          Idioma
          <select
            value={p.idioma}
            onChange={(e) => guardar({ ...p, idioma: e.target.value })}
            className="mt-1 h-11 w-full rounded-xl border border-primary/15 bg-card px-3 text-base sm:h-10 sm:text-sm"
          >
            <option value="es">Español</option>
          </select>
          <span className="mt-1 block text-[11px] font-normal text-muted-foreground">
            Portugués: próximamente.
          </span>
        </label>
        {(
          [
            ["avisosTurnos", "Avisarme de turnos nuevos y cambios"],
            ["avisosAutorizaciones", "Avisarme cuando un paciente responde una autorización"],
          ] as const
        ).map(([k, l]) => (
          <label key={k} className="flex min-h-11 items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              checked={p[k]}
              onChange={(e) => guardar({ ...p, [k]: e.target.checked })}
              className="size-4 accent-[var(--primary)]"
            />
            {l}
          </label>
        ))}
      </div>
    </TarjetaPortal>
  );
}
