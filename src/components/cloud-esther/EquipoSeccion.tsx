import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Check,
  Clock,
  KeyRound,
  Pencil,
  Plus,
  RotateCcw,
  Stethoscope,
  Trash2,
  X,
} from "lucide-react";
import {
  permsFor,
  type ScheduleDay,
  type TeamMember,
  type TeamRole,
} from "@/lib/cloud-esther/equipo-profesional-data";
import { useEquipo } from "@/lib/cloud-esther/equipo-store";

/* ───────────── Secciones de Equipo profesional ─────────────
   Especialidades, Agendas y horarios, Permisos y accesos. Usan el mismo equipo que
   "Integrantes" (useEquipo), separado por empresa. Los cambios se ven al instante en
   todas las secciones; al conectar el backend se guardarán en la API. */

export type EquipoSeccionId = "especialidades" | "agendas" | "permisos";

const INFO: Record<EquipoSeccionId, { titulo: string; descripcion: string }> = {
  especialidades: {
    titulo: "Especialidades",
    descripcion:
      "Especialidades odontológicas que ofrece tu clínica y los profesionales asignados a cada una.",
  },
  agendas: {
    titulo: "Agendas y horarios",
    descripcion: "Jornada semanal, descansos y consultorio de cada integrante del equipo.",
  },
  permisos: {
    titulo: "Permisos y accesos",
    descripcion: "Qué puede ver y hacer cada integrante dentro de Cloud Esther.",
  },
};

const ROLE_LABEL: Record<TeamRole, string> = {
  odontologo: "Odontólogo/a",
  asistente: "Asistente dental",
  secretaria: "Secretaria",
  administrador: "Administrador/a",
};

const CARD = "card-grad p-4";
const INPUT =
  "h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary/50 focus:ring-2 focus:ring-primary/15";
const INPUT_HORA =
  "h-8 rounded-lg border border-border bg-background px-2 text-xs outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/15 disabled:opacity-40";

const nombre = (m: TeamMember) => `${m.firstName} ${m.lastName}`.trim();
const iniciales = (m: TeamMember) => `${m.firstName[0] ?? ""}${m.lastName[0] ?? ""}`.toUpperCase();

function useToast() {
  const [mensaje, setMensaje] = useState<string | null>(null);
  const timer = useRef<number | null>(null);
  const mostrar = (texto: string) => {
    setMensaje(texto);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMensaje(null), 2400);
  };
  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );
  return { mensaje, mostrar };
}

export function EquipoSeccion({ seccion }: { seccion: EquipoSeccionId }) {
  const data = INFO[seccion];
  const { mensaje, mostrar } = useToast();

  return (
    <div className="relative min-h-full overflow-hidden bg-[#faf9ff]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_5%,rgba(124,58,237,0.15),transparent_28%),radial-gradient(circle_at_92%_12%,rgba(56,189,248,0.10),transparent_27%),linear-gradient(135deg,#f8f6ff_0%,#f3effd_48%,#faf8ff_100%)]"
      />
    <div className="relative mx-auto w-full max-w-[1420px] px-4 py-6 md:px-6 lg:px-8">
      <section className="relative overflow-hidden rounded-[30px] border border-primary/15 bg-gradient-to-br from-white via-white/96 to-primary/[0.045] p-5 shadow-[0_20px_55px_-38px_rgba(76,29,149,0.55)] md:p-7">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-primary/55 via-primary to-sky-400/55" />
        <Link
          to={"/demo/equipo-profesional" as never}
          className="relative inline-flex items-center gap-1.5 rounded-full border border-primary/10 bg-primary/[0.07] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-primary transition-colors hover:bg-primary/15"
        >
          <ArrowLeft className="size-3.5" />
          Equipo profesional
        </Link>
        <h1 className="relative mt-4 text-[30px] font-bold tracking-[-0.035em] md:text-[38px]">{data.titulo}</h1>
        <p className="relative mt-2 max-w-2xl text-[13px] leading-6 text-muted-foreground md:text-sm">{data.descripcion}</p>
      </section>

      <div className="mt-5">
        {seccion === "especialidades" && <Especialidades onToast={mostrar} />}
        {seccion === "agendas" && <Agendas onToast={mostrar} />}
        {seccion === "permisos" && <Permisos onToast={mostrar} />}
      </div>

      {mensaje && (
        <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-foreground px-4 py-2 text-xs font-medium text-background shadow-xl" role="status">
          {mensaje}
        </div>
      )}
    </div>
    </div>
  );
}

/* ───────────── Especialidades ───────────── */

function Especialidades({ onToast }: { onToast: (m: string) => void }) {
  const { miembros, especialidades, setEspecialidades, setMiembros } = useEquipo();
  const [nueva, setNueva] = useState("");
  const [editando, setEditando] = useState<string | null>(null);
  const [textoEdicion, setTextoEdicion] = useState("");
  const profesionales = miembros.filter((m) => m.role === "odontologo");

  const agregar = () => {
    const n = nueva.trim();
    if (!n) return;
    if (especialidades.some((e) => e.toLowerCase() === n.toLowerCase())) {
      onToast("Esa especialidad ya existe");
      return;
    }
    setEspecialidades((prev) => [...prev, n]);
    setNueva("");
    onToast(`Especialidad "${n}" creada`);
  };

  const renombrar = (anterior: string) => {
    const n = textoEdicion.trim();
    setEditando(null);
    if (!n || n === anterior) return;
    setEspecialidades((prev) => prev.map((e) => (e === anterior ? n : e)));
    setMiembros((prev) =>
      prev.map((m) => ({
        ...m,
        specialties: (m.specialties ?? []).map((e) => (e === anterior ? n : e)),
      })),
    );
    onToast("Especialidad renombrada");
  };

  const borrar = (esp: string) => {
    setEspecialidades((prev) => prev.filter((e) => e !== esp));
    setMiembros((prev) =>
      prev.map((m) => ({ ...m, specialties: (m.specialties ?? []).filter((e) => e !== esp) })),
    );
    onToast(`Especialidad "${esp}" eliminada`);
  };

  const alternar = (esp: string, id: string) =>
    setMiembros((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m;
        const actuales = m.specialties ?? [];
        return {
          ...m,
          specialties: actuales.includes(esp)
            ? actuales.filter((e) => e !== esp)
            : [...actuales, esp],
        };
      }),
    );

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          agregar();
        }}
        className={`${CARD} flex flex-wrap items-center gap-2`}
      >
        <input
          value={nueva}
          onChange={(e) => setNueva(e.target.value)}
          placeholder="Nueva especialidad (ej: Estética dental)"
          className={`${INPUT} min-w-56 flex-1`}
        />
        <button type="submit" className="btn-ce" disabled={!nueva.trim()}>
          <Plus />
          Agregar especialidad
        </button>
      </form>

      {especialidades.length === 0 && (
        <p className="text-sm text-muted-foreground">Todavía no hay especialidades cargadas.</p>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {especialidades.map((esp) => {
          const asignados = profesionales.filter((m) => m.specialties?.includes(esp));
          return (
            <div key={esp} className={CARD}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Stethoscope className="size-4" />
                  </span>
                  {editando === esp ? (
                    <input
                      autoFocus
                      value={textoEdicion}
                      onChange={(e) => setTextoEdicion(e.target.value)}
                      onBlur={() => renombrar(esp)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") renombrar(esp);
                        if (e.key === "Escape") setEditando(null);
                      }}
                      className={INPUT}
                    />
                  ) : (
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{esp}</p>
                      <p className="text-xs text-muted-foreground">
                        {asignados.length === 0
                          ? "Sin profesionales asignados"
                          : `${asignados.length} profesional${asignados.length === 1 ? "" : "es"}`}
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    aria-label={`Renombrar ${esp}`}
                    onClick={() => {
                      setEditando(esp);
                      setTextoEdicion(esp);
                    }}
                    className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-primary/10 hover:text-primary"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Eliminar ${esp}`}
                    onClick={() => borrar(esp)}
                    className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>

              <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Asignar profesionales
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {profesionales.length === 0 && (
                  <span className="text-xs text-muted-foreground">
                    No hay odontólogos en el equipo.
                  </span>
                )}
                {profesionales.map((m) => {
                  const activo = m.specialties?.includes(esp) ?? false;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      aria-pressed={activo}
                      onClick={() => alternar(esp, m.id)}
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                        activo
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                      }`}
                    >
                      {activo && <Check className="size-3" />}
                      {nombre(m)}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ───────────── Agendas y horarios ───────────── */

const DIA_CORTO: Record<ScheduleDay["day"], string> = {
  Lunes: "Lun",
  Martes: "Mar",
  Miércoles: "Mié",
  Jueves: "Jue",
  Viernes: "Vie",
  Sábado: "Sáb",
};

function resumenHorario(schedule: ScheduleDay[]) {
  const activos = schedule.filter((d) => d.active);
  if (activos.length === 0) return "Sin días de atención";
  const primero = activos[0]!;
  const mismosHorarios = activos.every((d) => d.start === primero.start && d.end === primero.end);
  const dias = activos.map((d) => DIA_CORTO[d.day]).join(", ");
  return mismosHorarios
    ? `${dias} · ${primero.start} – ${primero.end}`
    : `${dias} · horarios variables`;
}

function Agendas({ onToast }: { onToast: (m: string) => void }) {
  const { miembros, actualizarMiembro } = useEquipo();
  const [seleccionado, setSeleccionado] = useState<string | null>(miembros[0]?.id ?? null);
  const miembro = miembros.find((m) => m.id === seleccionado) ?? miembros[0];

  const cambiarDia = (dia: ScheduleDay["day"], cambios: Partial<ScheduleDay>) => {
    if (!miembro) return;
    actualizarMiembro(miembro.id, (m) => ({
      ...m,
      schedule: m.schedule.map((d) => (d.day === dia ? { ...d, ...cambios } : d)),
    }));
  };

  const copiarLunesATodos = () => {
    if (!miembro) return;
    const lunes = miembro.schedule.find((d) => d.day === "Lunes");
    if (!lunes) return;
    actualizarMiembro(miembro.id, (m) => ({
      ...m,
      schedule: m.schedule.map((d) =>
        d.active
          ? {
              ...d,
              start: lunes.start,
              end: lunes.end,
              ...(lunes.breakStart !== undefined ? { breakStart: lunes.breakStart } : {}),
              ...(lunes.breakEnd !== undefined ? { breakEnd: lunes.breakEnd } : {}),
            }
          : d,
      ),
    }));
    onToast("Horario del lunes copiado a los días activos");
  };

  if (!miembro)
    return (
      <p className="text-sm text-muted-foreground">Todavía no hay integrantes en el equipo.</p>
    );

  return (
    <div className="space-y-4">
    <CoberturaSemanal miembros={miembros} />
    <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
      <ul className={`${CARD} h-fit space-y-1 p-2`}>
        {miembros.map((m) => (
          <li key={m.id}>
            <button
              type="button"
              onClick={() => setSeleccionado(m.id)}
              className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors ${
                m.id === miembro.id ? "bg-primary/10" : "hover:bg-muted/60"
              }`}
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary">
                {iniciales(m)}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{nombre(m)}</span>
                <span className="block truncate text-[11px] text-muted-foreground">
                  {resumenHorario(m.schedule)}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      <div className={CARD}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-base font-semibold">{nombre(miembro)}</p>
            <p className="text-xs text-muted-foreground">{ROLE_LABEL[miembro.role]}</p>
          </div>
          <button type="button" onClick={copiarLunesATodos} className="btn-ce-outline">
            <RotateCcw />
            Copiar lunes a todos
          </button>
        </div>

        <label className="mt-4 block max-w-xs">
          <span className="text-xs font-semibold text-muted-foreground">Consultorio</span>
          <input
            value={miembro.office ?? ""}
            onChange={(e) =>
              actualizarMiembro(miembro.id, (m) => ({ ...m, office: e.target.value }))
            }
            placeholder="Ej: Consultorio 1"
            className={`${INPUT} mt-1`}
          />
        </label>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-xs">
            <thead className="text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="py-2 pr-2 font-semibold">Día</th>
                <th className="py-2 pr-2 font-semibold">Atiende</th>
                <th className="py-2 pr-2 font-semibold">Desde</th>
                <th className="py-2 pr-2 font-semibold">Hasta</th>
                <th className="py-2 pr-2 font-semibold">Descanso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {miembro.schedule.map((d) => (
                <tr key={d.day}>
                  <td className="py-2 pr-2 font-medium">{d.day}</td>
                  <td className="py-2 pr-2">
                    <input
                      type="checkbox"
                      checked={d.active}
                      onChange={(e) => cambiarDia(d.day, { active: e.target.checked })}
                      className="size-4 accent-[var(--color-primary)]"
                      aria-label={`Atiende ${d.day}`}
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      type="time"
                      value={d.start}
                      disabled={!d.active}
                      onChange={(e) => cambiarDia(d.day, { start: e.target.value })}
                      className={INPUT_HORA}
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      type="time"
                      value={d.end}
                      disabled={!d.active}
                      onChange={(e) => cambiarDia(d.day, { end: e.target.value })}
                      className={INPUT_HORA}
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <span className="inline-flex items-center gap-1">
                      <input
                        type="time"
                        value={d.breakStart ?? ""}
                        disabled={!d.active}
                        onChange={(e) => cambiarDia(d.day, { breakStart: e.target.value })}
                        className={INPUT_HORA}
                      />
                      <span className="text-muted-foreground">–</span>
                      <input
                        type="time"
                        value={d.breakEnd ?? ""}
                        disabled={!d.active}
                        onChange={(e) => cambiarDia(d.day, { breakEnd: e.target.value })}
                        className={INPUT_HORA}
                      />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="size-3.5" />
          {resumenHorario(miembro.schedule)}
        </p>
      </div>
    </div>
    </div>
  );
}

/* Cobertura semanal: cuántos odontólogos atienden en cada franja horaria (descontando descansos). */
function CoberturaSemanal({ miembros }: { miembros: TeamMember[] }) {
  const DIAS: ScheduleDay["day"][] = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const HORAS = Array.from({ length: 13 }, (_, i) => 8 + i); // 08 a 20
  const odontologos = miembros.filter((m) => m.role === "odontologo" && m.status !== "inactivo");
  const aMin = (h?: string) => {
    const [a = 0, b = 0] = (h ?? "").split(":").map(Number);
    return a * 60 + b;
  };
  const quienes = (dia: ScheduleDay["day"], hora: number) =>
    odontologos.filter((m) => {
      const d = m.schedule.find((x) => x.day === dia);
      if (!d?.active) return false;
      const t = hora * 60 + 30;
      const enDescanso = d.breakStart && d.breakEnd && t >= aMin(d.breakStart) && t < aMin(d.breakEnd);
      return t >= aMin(d.start) && t < aMin(d.end) && !enDescanso;
    });
  const max = Math.max(1, odontologos.length);
  const huecos = DIAS.flatMap((d) => HORAS.filter((h) => h >= 9 && h < 19 && quienes(d, h).length === 0).map((h) => `${d.slice(0, 3)} ${h}h`));
  return (
    <div className={CARD}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">Cobertura semanal de odontólogos</p>
          <p className="text-xs text-muted-foreground">Cuántos profesionales atienden en cada franja. Pasá el mouse para ver quiénes.</p>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          Menos
          {[0, 0.34, 0.67, 1].map((v) => (
            <span key={v} className="size-3 rounded" style={{ background: v ? `rgba(124,58,237,${0.15 + v * 0.75})` : "rgba(124,58,237,0.05)" }} />
          ))}
          Más
        </div>
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[640px] border-separate border-spacing-1 text-[10px]">
          <thead>
            <tr>
              <th />
              {HORAS.map((h) => (
                <th key={h} className="font-medium text-muted-foreground">
                  {String(h).padStart(2, "0")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DIAS.map((d) => (
              <tr key={d}>
                <td className="pr-2 text-xs font-medium">{d.slice(0, 3)}</td>
                {HORAS.map((h) => {
                  const q = quienes(d, h);
                  return (
                    <td
                      key={h}
                      title={q.length ? `${d} ${h}:00 · ${q.map(nombre).join(", ")}` : `${d} ${h}:00 · sin odontólogos`}
                      className="h-7 rounded-md text-center font-semibold"
                      style={{
                        background: q.length ? `rgba(124,58,237,${0.15 + (q.length / max) * 0.75})` : "rgba(124,58,237,0.05)",
                        color: q.length / max > 0.5 ? "white" : "rgb(91,33,182)",
                      }}
                    >
                      {q.length || ""}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {huecos.length > 0 && (
        <p className="mt-2 text-[11px] text-amber-700">
          Franjas sin odontólogo entre 9 y 19 h: {huecos.slice(0, 8).join(", ")}
          {huecos.length > 8 ? ` y ${huecos.length - 8} más` : ""}.
        </p>
      )}
    </div>
  );
}

/* ───────────── Permisos y accesos ───────────── */

function Permisos({ onToast }: { onToast: (m: string) => void }) {
  const { miembros, actualizarMiembro } = useEquipo();
  const [seleccionado, setSeleccionado] = useState<string | null>(miembros[0]?.id ?? null);
  const miembro = miembros.find((m) => m.id === seleccionado) ?? miembros[0];

  if (!miembro)
    return (
      <p className="text-sm text-muted-foreground">Todavía no hay integrantes en el equipo.</p>
    );

  const activos = miembro.permissions.filter((p) => p.enabled).length;

  const alternar = (key: string) =>
    actualizarMiembro(miembro.id, (m) => ({
      ...m,
      permissions: m.permissions.map((p) => (p.key === key ? { ...p, enabled: !p.enabled } : p)),
    }));

  const cambiarRol = (rol: TeamRole) => {
    actualizarMiembro(miembro.id, (m) => ({ ...m, role: rol, permissions: permsFor(rol) }));
    onToast(`${nombre(miembro)} ahora es ${ROLE_LABEL[rol]} (permisos del rol aplicados)`);
  };

  return (
    <div className="space-y-4">
    <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
      <ul className={`${CARD} h-fit space-y-1 p-2`}>
        {miembros.map((m) => {
          const n = m.permissions.filter((p) => p.enabled).length;
          return (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => setSeleccionado(m.id)}
                className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors ${
                  m.id === miembro.id ? "bg-primary/10" : "hover:bg-muted/60"
                }`}
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary">
                  {iniciales(m)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{nombre(m)}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {ROLE_LABEL[m.role]}
                  </span>
                </span>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  {n === m.permissions.length ? "Total" : `${n}/${m.permissions.length}`}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className={CARD}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-base font-semibold">{nombre(miembro)}</p>
            <p className="text-xs text-muted-foreground">
              {activos} de {miembro.permissions.length} permisos activos
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="block">
              <span className="text-xs font-semibold text-muted-foreground">Rol</span>
              <select
                value={miembro.role}
                onChange={(e) => cambiarRol(e.target.value as TeamRole)}
                className={`${INPUT} mt-1 w-48`}
              >
                {(Object.keys(ROLE_LABEL) as TeamRole[]).map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => {
                actualizarMiembro(miembro.id, (m) => ({ ...m, permissions: permsFor(m.role) }));
                onToast("Permisos restablecidos según el rol");
              }}
              className="btn-ce-outline"
            >
              <RotateCcw />
              Restablecer rol
            </button>
          </div>
        </div>

        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {miembro.permissions.map((p) => (
            <li key={p.key}>
              <button
                type="button"
                role="switch"
                aria-checked={p.enabled}
                onClick={() => alternar(p.key)}
                className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${
                  p.enabled ? "border-primary/30 bg-primary/5" : "border-border hover:bg-muted/50"
                }`}
              >
                <span className="flex items-center gap-2">
                  <KeyRound
                    className={`size-3.5 ${p.enabled ? "text-primary" : "text-muted-foreground"}`}
                  />
                  {p.label}
                </span>
                <span
                  className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                    p.enabled ? "bg-primary" : "bg-muted-foreground/30"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 grid size-4 place-items-center rounded-full bg-white shadow transition-all ${
                      p.enabled ? "left-[18px]" : "left-0.5"
                    }`}
                  >
                    {p.enabled ? (
                      <Check className="size-2.5 text-primary" />
                    ) : (
                      <X className="size-2.5 text-muted-foreground" />
                    )}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
    <MatrizAccesos miembros={miembros} seleccionado={miembro.id} onElegir={setSeleccionado} />
    </div>
  );
}

/* Vista general: qué tiene habilitado cada integrante. */
function MatrizAccesos({ miembros, seleccionado, onElegir }: { miembros: TeamMember[]; seleccionado: string; onElegir: (id: string) => void }) {
  const permisos = miembros[0]?.permissions ?? [];
  return (
    <div className={CARD}>
      <p className="text-sm font-semibold">Resumen de accesos del equipo</p>
      <p className="text-xs text-muted-foreground">Tocá un integrante para editar sus permisos.</p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-xs">
          <thead>
            <tr className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground">
              <th className="py-2 pr-3 font-semibold">Integrante</th>
              {permisos.map((p) => (
                <th key={p.key} className="px-1 py-2 text-center font-semibold" title={p.label}>
                  {p.label.replace("Gestionar ", "").replace("Ver ", "").replace("Acceder a ", "").replace("Crear ", "Crear ")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-primary/[0.07]">
            {miembros.map((m) => (
              <tr
                key={m.id}
                onClick={() => onElegir(m.id)}
                className={`cursor-pointer transition-colors ${m.id === seleccionado ? "bg-primary/[0.07]" : "hover:bg-primary/[0.03]"}`}
              >
                <td className="py-2 pr-3">
                  <p className="font-semibold">{nombre(m)}</p>
                  <p className="text-[10px] text-muted-foreground">{ROLE_LABEL[m.role]}</p>
                </td>
                {permisos.map((p) => {
                  const on = m.permissions.find((x) => x.key === p.key)?.enabled;
                  return (
                    <td key={p.key} className="px-1 py-2 text-center">
                      {on ? (
                        <span className="inline-grid size-5 place-items-center rounded-full bg-primary/15 text-primary">
                          <Check className="size-3" />
                        </span>
                      ) : (
                        <span className="inline-block size-1.5 rounded-full bg-muted-foreground/25" />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
