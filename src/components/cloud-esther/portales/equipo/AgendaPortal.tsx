import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CalendarOff,
  CalendarPlus,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Columns3,
  Palmtree,
  Plus,
  RefreshCcw,
  Trash2,
  UserX,
  X,
} from "lucide-react";

import { setFeriadosStore, setTurnosStore, storeAgenda, type Turno } from "@/lib/cloud-esther/agenda-store";
import type { ScheduleDay, TeamMember } from "@/lib/cloud-esther/equipo-profesional-data";
import { useEquipo } from "@/lib/cloud-esther/equipo-store";
import { registrarEventoEquipo } from "@/lib/cloud-esther/portal-equipo-store";
import { AvatarPortal, PestanasPortal, TarjetaPortal, VacioPortal } from "../PortalShell";

/* Ubicación: src/components/cloud-esther/portales/equipo/AgendaPortal.tsx
   Agenda completa de los portales del equipo: vista día, POR PROFESIONAL (columnas con la
   grilla horaria), semana, mes y disponibilidad según los horarios de cada profesional.
   - Detecta turnos que se SUPERPONEN (mismo profesional, horarios que se pisan) y los marca.
   - Muestra FERIADOS (los carga cada clínica) y VACACIONES / ausencias del equipo (Equipo → RRHH).
   - Bloqueos de horario de la clínica, rayados en la grilla.
   En el portal administrativo además se reprograma, cancela, confirma y se marcan ausencias de
   cualquier profesional (si el permiso lo permite). Misma agenda de la clínica (por empresa). */

type Vista = "dia" | "profesionales" | "semana" | "mes" | "disponibilidad";

const DIAS_CORTOS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const DIAS_LARGOS: ScheduleDay["day"][] = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];
const ESTADO: Record<Turno["estado"], string> = {
  Confirmada: "bg-emerald-100 text-emerald-700",
  Pendiente: "bg-amber-100 text-amber-700",
  Atendida: "bg-primary/10 text-primary",
  Ausente: "bg-muted text-muted-foreground",
  Cancelada: "bg-rose-100 text-rose-700",
};
/** Bloque de color en la grilla por profesional */
const BLOQUE: Record<Turno["estado"], string> = {
  Confirmada: "from-primary to-fuchsia-500 text-white",
  Pendiente: "from-amber-400 to-orange-400 text-white",
  Atendida: "from-emerald-500 to-teal-500 text-white",
  Ausente: "from-slate-300 to-slate-200 text-slate-700",
  Cancelada: "from-rose-200 to-rose-100 text-rose-700",
};
const INPUT =
  "h-11 w-full rounded-xl border border-primary/15 bg-card px-3 text-base outline-none focus:border-primary/45 sm:h-10 sm:text-sm";
/** Duración estimada de un turno (minutos) para la grilla y los solapamientos */
const DURACION = 45;

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const desdeISO = (s: string) => new Date(`${s}T12:00:00`);
function sumar(s: string, n: number) {
  const d = desdeISO(s);
  d.setDate(d.getDate() + n);
  return iso(d);
}
function lunesDe(s: string) {
  const d = desdeISO(s);
  const dow = (d.getDay() + 6) % 7;
  return sumar(s, -dow);
}
const minutos = (h: string) => {
  const [a = 0, b = 0] = h.split(":").map(Number);
  return a * 60 + b;
};
const etiqueta = (s: string) =>
  desdeISO(s).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });

/** Ids de turnos que se pisan con otro del MISMO profesional el mismo día */
function superpuestos(turnos: Turno[]): Map<number, Turno> {
  const choca = new Map<number, Turno>();
  const activos = turnos.filter((t) => t.estado !== "Cancelada" && t.estado !== "Ausente");
  for (let i = 0; i < activos.length; i++) {
    for (let j = i + 1; j < activos.length; j++) {
      const a = activos[i]!;
      const b = activos[j]!;
      if (a.fecha !== b.fecha || a.odontologo !== b.odontologo) continue;
      if (Math.abs(minutos(a.hora) - minutos(b.hora)) < DURACION) {
        choca.set(a.id, b);
        choca.set(b.id, a);
      }
    }
  }
  return choca;
}

export function AgendaPortal({
  modo,
  turnos,
  profesionales,
  yo,
  puedeEditar,
  puedeGestionar,
  vista: vistaPrevia,
  onToast,
  onAbrirPaciente,
  onNuevoTurno,
}: {
  modo: "profesional" | "administracion";
  turnos: Turno[];
  /** Profesionales visibles (para filtros y disponibilidad). */
  profesionales: TeamMember[];
  yo: TeamMember;
  puedeEditar: boolean;
  /** Reprogramar y cancelar (portal administrativo). */
  puedeGestionar: boolean;
  vista: boolean;
  onToast: (m: string) => void;
  onAbrirPaciente: (paciente: string, turno?: Turno) => void;
  onNuevoTurno?: () => void;
}) {
  const hoy = iso(new Date());
  const [vista, setVista] = useState<Vista>(modo === "administracion" ? "profesionales" : "dia");
  const [fecha, setFecha] = useState(hoy);
  const [prof, setProf] = useState("");
  const [reprogramar, setReprogramar] = useState<Turno | null>(null);
  const [panelFeriados, setPanelFeriados] = useState(false);
  const { bloqueos, feriados = [] } = storeAgenda.usar();
  const { ausencias } = useEquipo();
  const nombre = (m: TeamMember) => `${m.firstName} ${m.lastName}`.trim();
  const quien = nombre(yo);

  const filtrados = useMemo(
    () => turnos.filter((t) => !prof || t.odontologo === prof),
    [turnos, prof],
  );
  const choques = useMemo(() => superpuestos(turnos), [turnos]);
  const delDia = (d: string) =>
    filtrados.filter((t) => t.fecha === d).sort((a, b) => a.hora.localeCompare(b.hora));
  const feriadoDe = (d: string) => feriados.find((f) => f.fecha === d);
  const ausenteEl = (m: TeamMember, d: string) =>
    ausencias.find((a) => a.miembroId === m.id && a.desde <= d && a.hasta >= d);

  const cambiarEstado = (t: Turno, estado: Turno["estado"]) => {
    if (vistaPrevia) return onToast("En la vista previa no se modifican turnos.");
    setTurnosStore((prev) => prev.map((x) => (x.id === t.id ? { ...x, estado } : x)));
    registrarEventoEquipo(
      yo.id,
      `Turno ${estado.toLowerCase()}`,
      `${t.paciente} · ${t.fecha} ${t.hora}`,
    );
    onToast(`Turno de ${t.paciente}: ${estado.toLowerCase()}`);
  };

  const mover = (paso: number) => {
    if (vista === "dia" || vista === "profesionales") setFecha(sumar(fecha, paso));
    else if (vista === "semana" || vista === "disponibilidad") setFecha(sumar(fecha, paso * 7));
    else {
      const d = desdeISO(fecha);
      d.setMonth(d.getMonth() + paso, 1);
      setFecha(iso(d));
    }
  };

  const titulo =
    vista === "dia" || vista === "profesionales"
      ? etiqueta(fecha)
      : vista === "mes"
        ? desdeISO(fecha).toLocaleDateString("es-AR", { month: "long", year: "numeric" })
        : `Semana del ${desdeISO(lunesDe(fecha)).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}`;

  const fila = (t: Turno, compacta = false) => {
    const otro = choques.get(t.id);
    return (
      <li
        key={t.id}
        className={`group relative flex flex-wrap items-center gap-2.5 overflow-hidden rounded-2xl border bg-card px-3 py-2.5 transition hover:shadow-[0_14px_30px_-24px_rgba(76,29,149,0.7)] ${
          otro ? "border-rose-300 ring-2 ring-rose-200/70 dark:border-rose-500/40 dark:ring-rose-500/20" : "border-primary/10"
        }`}
      >
        <span aria-hidden className={`absolute inset-y-0 left-0 w-1 bg-gradient-to-b ${BLOQUE[t.estado].split(" text-")[0]}`} />
        <span className="grid min-w-14 place-items-center rounded-xl bg-gradient-to-br from-primary/12 to-fuchsia-500/10 px-2 py-1.5 text-center ring-1 ring-primary/10">
          <span className="text-sm font-bold tabular-nums text-primary">{t.hora}</span>
        </span>
        <button
          type="button"
          onClick={() => onAbrirPaciente(t.paciente, t)}
          className="min-w-0 flex-1 text-left"
        >
          <span className="block truncate text-sm font-semibold">{t.paciente}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {t.tratamiento}
            {modo === "administracion" || !compacta ? ` · ${t.odontologo}` : ""} · {t.sucursal}
          </span>
          {otro && (
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10.5px] font-semibold text-rose-700">
              <AlertTriangle className="size-3" /> Se superpone con {otro.hora} · {otro.paciente}
            </span>
          )}
        </button>
        <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${ESTADO[t.estado]}`}>
          {t.estado}
        </span>
        {!compacta && puedeEditar && t.estado !== "Cancelada" && t.estado !== "Atendida" && (
          <div className="flex w-full flex-wrap gap-1.5 sm:w-auto">
            {t.estado === "Pendiente" && (
              <button
                type="button"
                onClick={() => cambiarEstado(t, "Confirmada")}
                className="btn-ce !min-h-9 flex-1 justify-center sm:flex-none"
              >
                <Check className="size-3.5" /> Confirmar
              </button>
            )}
            {modo === "profesional" && (
              <button
                type="button"
                onClick={() => cambiarEstado(t, "Atendida")}
                className="btn-ce !min-h-9 flex-1 justify-center sm:flex-none"
              >
                <Check className="size-3.5" /> Atendido
              </button>
            )}
            <button
              type="button"
              onClick={() => cambiarEstado(t, "Ausente")}
              className="btn-ce-outline !min-h-9 flex-1 justify-center sm:flex-none"
            >
              <UserX className="size-3.5" /> Ausente
            </button>
            {puedeGestionar && (
              <>
                <button
                  type="button"
                  onClick={() => setReprogramar(t)}
                  className="btn-ce-outline !min-h-9 flex-1 justify-center sm:flex-none"
                >
                  <RefreshCcw className="size-3.5" /> Reprogramar
                </button>
                <button
                  type="button"
                  onClick={() => cambiarEstado(t, "Cancelada")}
                  className="btn-ce-outline !min-h-9 flex-1 justify-center text-rose-600 sm:flex-none"
                >
                  <X className="size-3.5" /> Cancelar
                </button>
              </>
            )}
          </div>
        )}
      </li>
    );
  };

  const semana = Array.from({ length: 6 }, (_, i) => sumar(lunesDe(fecha), i));
  const primeroMes = (() => {
    const d = desdeISO(fecha);
    d.setDate(1);
    return iso(d);
  })();
  const celdasMes = Array.from({ length: 42 }, (_, i) => sumar(lunesDe(primeroMes), i));
  const mesActual = desdeISO(fecha).getMonth();
  const feriadoHoy = feriadoDe(fecha);
  const ausentesDia = profesionales
    .map((m) => ({ m, a: ausenteEl(m, fecha) }))
    .filter((x) => x.a);
  const choquesDia = turnos.filter((t) => t.fecha === fecha && choques.has(t.id)).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <PestanasPortal
          valor={vista}
          onCambiar={setVista}
          opciones={[
            { id: "dia", label: "Día" },
            ...(profesionales.length > 1 ? [{ id: "profesionales" as const, label: "Por profesional" }] : []),
            { id: "semana", label: "Semana" },
            { id: "mes", label: "Mes" },
            { id: "disponibilidad", label: "Disponibilidad" },
          ]}
        />
        <div className="flex flex-wrap items-center gap-2">
          {profesionales.length > 1 && vista !== "profesionales" && (
            <select
              value={prof}
              onChange={(e) => setProf(e.target.value)}
              className="h-10 rounded-xl border border-primary/15 bg-card px-3 text-sm shadow-[0_10px_26px_-22px_rgba(76,29,149,0.6)]"
              aria-label="Profesional"
            >
              <option value="">Todos los profesionales</option>
              {profesionales.map((m) => (
                <option key={m.id} value={nombre(m)}>
                  {nombre(m)}
                </option>
              ))}
            </select>
          )}
          <button type="button" onClick={() => setPanelFeriados(true)} className="btn-ce-outline !min-h-10">
            <Palmtree className="size-4" /> Feriados y vacaciones
          </button>
          {onNuevoTurno && puedeEditar && (
            <button type="button" onClick={onNuevoTurno} className="btn-ce !min-h-10">
              <CalendarPlus className="size-4" /> Nuevo turno
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-2xl border border-primary/10 bg-card/90 px-2 py-1.5 shadow-[0_14px_34px_-28px_rgba(76,29,149,0.7)] backdrop-blur">
        <button
          type="button"
          aria-label="Anterior"
          onClick={() => mover(-1)}
          className="grid size-10 place-items-center rounded-xl bg-primary/[0.06] text-primary transition hover:bg-primary hover:text-white"
        >
          <ChevronLeft className="size-4" />
        </button>
        <p className="min-w-0 flex-1 truncate text-center font-display text-[15px] font-bold tracking-tight">
          {titulo.charAt(0).toUpperCase() + titulo.slice(1)}
        </p>
        <button
          type="button"
          onClick={() => setFecha(hoy)}
          className={`rounded-xl px-3.5 py-2 text-xs font-bold transition ${fecha === hoy ? "bg-gradient-to-r from-primary to-fuchsia-500 text-white" : "text-primary hover:bg-primary/10"}`}
        >
          Hoy
        </button>
        <button
          type="button"
          aria-label="Siguiente"
          onClick={() => mover(1)}
          className="grid size-10 place-items-center rounded-xl bg-primary/[0.06] text-primary transition hover:bg-primary hover:text-white"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      {(vista === "dia" || vista === "profesionales") && (feriadoHoy || ausentesDia.length > 0 || choquesDia > 0) && (
        <div className="flex flex-wrap gap-2">
          {feriadoHoy && (
            <span className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 px-3.5 py-2 text-xs font-semibold text-white shadow-[0_10px_22px_-12px_rgba(244,63,94,0.8)]">
              <CalendarOff className="size-4" /> Feriado: {feriadoHoy.nombre}
            </span>
          )}
          {ausentesDia.map(({ m, a }) => (
            <span key={m.id} className="inline-flex items-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-800 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200">
              <Palmtree className="size-4" /> {nombre(m)}: {a?.tipo.toLowerCase()} hasta el {a?.hasta.split("-").reverse().join("/")}
            </span>
          ))}
          {choquesDia > 0 && (
            <span className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
              <AlertTriangle className="size-4" /> {choquesDia} turnos se superponen
            </span>
          )}
        </div>
      )}

      {vista === "dia" && (
        <TarjetaPortal
          titulo={`${delDia(fecha).length} turnos`}
          detalle={etiqueta(fecha)}
          icon={CalendarClock}
        >
          {delDia(fecha).length === 0 ? (
            <VacioPortal
              icon={CalendarClock}
              titulo={feriadoHoy ? "Feriado: la clínica no atiende" : "No hay turnos este día"}
              texto="Elegí otro día con las flechas o tocá «Nuevo turno»."
            />
          ) : (
            <ul className="space-y-2">{delDia(fecha).map((t) => fila(t))}</ul>
          )}
        </TarjetaPortal>
      )}

      {vista === "profesionales" && (
        <GrillaProfesionales
          fecha={fecha}
          turnos={turnos.filter((t) => t.fecha === fecha)}
          profesionales={profesionales}
          bloqueos={bloqueos.filter((b) => b.fecha === fecha)}
          feriado={feriadoHoy?.nombre}
          ausenteEl={(m) => ausenteEl(m, fecha)}
          choques={choques}
          onAbrir={(t) => onAbrirPaciente(t.paciente, t)}
        />
      )}

      {vista === "semana" && (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {semana.map((d) => {
            const f = feriadoDe(d);
            return (
              <TarjetaPortal
                key={d}
                titulo={`${DIAS_CORTOS[desdeISO(d).getDay()]} ${d.slice(8, 10)}/${d.slice(5, 7)}`}
                detalle={f ? `Feriado · ${f.nombre}` : `${delDia(d).length} turnos`}
                className={d === hoy ? "ring-2 ring-primary/40" : f ? "ring-2 ring-rose-300/60" : ""}
              >
                {delDia(d).length === 0 ? (
                  <p className="py-3 text-center text-xs text-muted-foreground">{f ? "No se atiende" : "Sin turnos"}</p>
                ) : (
                  <ul className="space-y-1.5">{delDia(d).map((t) => fila(t, true))}</ul>
                )}
              </TarjetaPortal>
            );
          })}
        </div>
      )}

      {vista === "mes" && (
        <TarjetaPortal>
          {/* Calendario mensual premium: cada día muestra sus primeros turnos, cuán cargado está
              (barra de ocupación), feriados y «Hoy» resaltado. Tocar un día abre su agenda. */}
          <div className="grid grid-cols-7 gap-1.5 pb-1 text-center text-[10.5px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
            {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d, i) => (
              <span key={d} className={`py-1.5 ${i >= 5 ? "text-muted-foreground/60" : ""}`}>
                {d}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {celdasMes.map((d, idx) => {
              const turnosDia = delDia(d).filter((t) => t.estado !== "Cancelada");
              const n = turnosDia.length;
              const fuera = desdeISO(d).getMonth() !== mesActual;
              const esHoy = d === hoy;
              const finde = idx % 7 >= 5;
              const carga = Math.min(1, n / 8);
              const f = feriadoDe(d);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    setFecha(d);
                    setVista("dia");
                  }}
                  aria-label={`${Number(d.slice(8, 10))}: ${n} turno${n === 1 ? "" : "s"}${f ? `, feriado ${f.nombre}` : ""}`}
                  className={`group relative flex aspect-square flex-col overflow-hidden rounded-2xl border p-1.5 text-left transition-all duration-300 ease-out sm:aspect-auto sm:h-[104px] sm:p-2 ${
                    esHoy
                      ? "border-transparent bg-gradient-to-br from-primary to-fuchsia-500 text-white shadow-[0_14px_30px_-16px_rgba(124,58,237,0.9)]"
                      : f
                        ? "border-rose-200 bg-[repeating-linear-gradient(135deg,rgba(244,63,94,0.06)_0_6px,transparent_6px_12px)] dark:border-rose-500/30"
                        : `${finde ? "bg-primary/[0.025]" : "bg-card"} border-border/60 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_14px_28px_-20px_rgba(124,58,237,0.6)]`
                  } ${fuera ? "opacity-40" : ""}`}
                >
                  <span className="flex items-center justify-between gap-1">
                    <span className={`text-[13px] font-semibold tabular-nums leading-none ${esHoy ? "" : f ? "text-rose-600" : "text-foreground/85"}`}>
                      {Number(d.slice(8, 10))}
                    </span>
                    {esHoy && (
                      <span className="hidden rounded-full bg-white/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide sm:inline">Hoy</span>
                    )}
                    {!esHoy && n > 0 && (
                      <span className="rounded-full bg-primary/10 px-1.5 text-[10px] font-semibold tabular-nums text-primary sm:hidden">{n}</span>
                    )}
                  </span>
                  {f && (
                    <span className={`mt-1 hidden truncate rounded-md px-1.5 py-0.5 text-[10px] font-semibold sm:block ${esHoy ? "bg-white/20" : "bg-rose-100 text-rose-700"}`}>
                      {f.nombre}
                    </span>
                  )}
                  <span className="mt-1.5 hidden min-w-0 flex-1 flex-col gap-1 sm:flex">
                    {turnosDia.slice(0, f ? 1 : 2).map((t) => (
                      <span
                        key={t.id}
                        className={`flex min-w-0 items-center gap-1 truncate rounded-md px-1.5 py-0.5 text-[10.5px] leading-tight ${
                          esHoy ? "bg-white/18 text-white" : "bg-primary/[0.07] text-foreground/80"
                        }`}
                      >
                        <span className={`shrink-0 tabular-nums ${esHoy ? "text-white/80" : "text-primary"}`}>{t.hora}</span>
                        <span className="truncate">{t.paciente}</span>
                      </span>
                    ))}
                    {n > (f ? 1 : 2) && (
                      <span className={`px-1 text-[10px] ${esHoy ? "text-white/80" : "text-muted-foreground"}`}>+{n - (f ? 1 : 2)} más</span>
                    )}
                  </span>
                  {n > 0 && (
                    <span className={`absolute inset-x-2 bottom-1.5 hidden h-1 overflow-hidden rounded-full sm:block ${esHoy ? "bg-white/20" : "bg-primary/10"}`}>
                      <span
                        className={`block h-full rounded-full ${esHoy ? "bg-white/80" : "bg-gradient-to-r from-primary to-fuchsia-500"}`}
                        style={{ width: `${Math.max(12, carga * 100)}%` }}
                      />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-gradient-to-br from-primary to-fuchsia-500" /> Hoy
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-rose-200" /> Feriado
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1 w-5 rounded-full bg-gradient-to-r from-primary to-fuchsia-500" /> Ocupación del día
            </span>
            <span>Tocá un día para ver su agenda</span>
          </p>
        </TarjetaPortal>
      )}

      {vista === "disponibilidad" && (
        <TarjetaPortal
          titulo="Disponibilidad de la semana"
          detalle="Horario de atención menos los turnos ya dados"
          icon={Clock3}
        >
          <div className="space-y-5">
            {(prof ? profesionales.filter((m) => nombre(m) === prof) : profesionales).map((m) => (
              <div key={m.id}>
                <p className="mb-2 flex items-center gap-2 text-sm font-bold">
                  <AvatarPortal nombre={nombre(m)} tam="sm" />
                  {nombre(m)}
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                  {semana.map((d, i) => {
                    const h = m.schedule.find((s) => s.day === DIAS_LARGOS[i]);
                    const ocupados = turnos.filter(
                      (t) =>
                        t.fecha === d && t.odontologo === nombre(m) && t.estado !== "Cancelada",
                    ).length;
                    const total = h?.active
                      ? Math.max(0, Math.floor((minutos(h.end) - minutos(h.start)) / DURACION))
                      : 0;
                    const libres = Math.max(0, total - ocupados);
                    const f = feriadoDe(d);
                    const aus = ausenteEl(m, d);
                    const cerrado = !!f || !!aus;
                    return (
                      <div
                        key={d}
                        className={`relative overflow-hidden rounded-2xl border p-2.5 ${cerrado ? "border-rose-200 bg-rose-50/60 dark:border-rose-500/30 dark:bg-rose-500/5" : "border-primary/10 bg-gradient-to-br from-primary/[0.04] to-transparent"}`}
                      >
                        <p className="text-[11px] font-bold">
                          {DIAS_CORTOS[desdeISO(d).getDay()]} {d.slice(8, 10)}
                        </p>
                        {f ? (
                          <p className="text-[11px] font-semibold text-rose-600">Feriado · {f.nombre}</p>
                        ) : aus ? (
                          <p className="text-[11px] font-semibold text-sky-700">{aus.tipo}</p>
                        ) : h?.active ? (
                          <>
                            <p className="text-[11px] text-muted-foreground">
                              {h.start}–{h.end}
                            </p>
                            <p className={`mt-1 text-xs font-bold ${libres ? "text-emerald-600" : "text-rose-600"}`}>
                              {libres} libres · {ocupados} dados
                            </p>
                            <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-muted">
                              <span
                                className="block h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
                                style={{ width: `${total ? (libres / total) * 100 : 0}%` }}
                              />
                            </span>
                          </>
                        ) : (
                          <p className="text-[11px] text-muted-foreground">No atiende</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Turnos estimados de {DURACION} minutos. Los horarios se cargan en Equipo → Agendas y horarios; las vacaciones, en Equipo o RRHH.
          </p>
        </TarjetaPortal>
      )}

      {panelFeriados && (
        <FeriadosYVacaciones
          puedeEditar={puedeGestionar && !vistaPrevia}
          profesionales={profesionales}
          onCerrar={() => setPanelFeriados(false)}
          onToast={onToast}
        />
      )}

      {reprogramar && (
        <Reprogramar
          turno={reprogramar}
          onCerrar={() => setReprogramar(null)}
          onGuardar={(f, h) => {
            setTurnosStore((prev) =>
              prev.map((x) =>
                x.id === reprogramar.id ? { ...x, fecha: f, hora: h, estado: "Pendiente" } : x,
              ),
            );
            registrarEventoEquipo(yo.id, "Reprogramó turno", `${reprogramar.paciente} → ${f} ${h}`);
            onToast(`Turno de ${reprogramar.paciente} movido al ${f} a las ${h}`);
            setReprogramar(null);
          }}
          quien={quien}
        />
      )}
    </div>
  );
}

/* ───────────── Grilla por profesional (columnas) ───────────── */

const PX_HORA = 84;
/** Aire arriba y abajo de la grilla (para que la primera hora no se corte) */
const AIRE = 14;

function GrillaProfesionales({
  fecha,
  turnos,
  profesionales,
  bloqueos,
  feriado,
  ausenteEl,
  choques,
  onAbrir,
}: {
  fecha: string;
  turnos: Turno[];
  profesionales: TeamMember[];
  bloqueos: { id: number; desde: string; hasta: string; motivo: string }[];
  feriado: string | undefined;
  ausenteEl: (m: TeamMember) => { tipo: string } | undefined;
  choques: Map<number, Turno>;
  onAbrir: (t: Turno) => void;
}) {
  const nombre = (m: TeamMember) => `${m.firstName} ${m.lastName}`.trim();
  const dia = DIAS_LARGOS[(desdeISO(fecha).getDay() + 6) % 7];
  const horarios = profesionales.map((m) => m.schedule.find((s) => s.day === dia && s.active));
  const minTurno = Math.min(...turnos.map((t) => minutos(t.hora)), Infinity);
  const maxTurno = Math.max(...turnos.map((t) => minutos(t.hora) + DURACION), -Infinity);
  const inicio = Math.floor(Math.min(8 * 60, minTurno, ...horarios.filter(Boolean).map((h) => minutos(h!.start))) / 60);
  const fin = Math.ceil(Math.max(18 * 60, maxTurno, ...horarios.filter(Boolean).map((h) => minutos(h!.end))) / 60);
  const horas = Array.from({ length: fin - inicio }, (_, i) => inicio + i);
  const alto = horas.length * PX_HORA + AIRE * 2;
  const y = (min: number) => AIRE + ((min - inicio * 60) / 60) * PX_HORA;
  const ahora = new Date();
  const esHoy = fecha === iso(ahora);
  const minAhora = ahora.getHours() * 60 + ahora.getMinutes();

  if (!profesionales.length)
    return (
      <TarjetaPortal>
        <VacioPortal icon={Columns3} titulo="No hay profesionales" texto="Sumalos en Equipo → Integrantes." />
      </TarjetaPortal>
    );

  return (
    <section className="ce-portal-entrar relative overflow-hidden rounded-[26px] border border-primary/12 bg-card shadow-[0_22px_50px_-36px_rgba(76,29,149,0.65)]">
      <div className="overflow-x-auto">
        <div style={{ minWidth: 72 + profesionales.length * 190 }}>
          {/* Encabezado: una columna por profesional */}
          <div className="sticky top-0 z-10 grid border-b border-primary/10 bg-card/95 backdrop-blur" style={{ gridTemplateColumns: `72px repeat(${profesionales.length}, minmax(190px, 1fr))` }}>
            <div className="grid place-items-center text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Hora</div>
            {profesionales.map((m, i) => {
              const aus = ausenteEl(m);
              const h = horarios[i];
              const cant = turnos.filter((t) => t.odontologo === nombre(m) && t.estado !== "Cancelada").length;
              return (
                <div key={m.id} className="flex items-center gap-2.5 border-l border-primary/10 px-3 py-3">
                  <AvatarPortal nombre={nombre(m)} tam="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{nombre(m)}</p>
                    <p className={`truncate text-[11px] ${aus ? "font-semibold text-sky-700" : "text-muted-foreground"}`}>
                      {aus ? aus.tipo : h ? `${h.start}–${h.end} · ${cant} turnos` : "No atiende hoy"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          {/* Cuerpo */}
          <div className="relative grid" style={{ gridTemplateColumns: `72px repeat(${profesionales.length}, minmax(190px, 1fr))`, height: alto }}>
            <div className="relative">
              {horas.map((h) => (
                <span key={h} className="absolute right-3 -translate-y-1/2 text-[11px] font-semibold tabular-nums text-muted-foreground" style={{ top: y(h * 60) }}>
                  {String(h).padStart(2, "0")}:00
                </span>
              ))}
            </div>
            {profesionales.map((m, i) => {
              const aus = ausenteEl(m);
              const h = horarios[i];
              const suyos = turnos.filter((t) => t.odontologo === nombre(m));
              return (
                <div key={m.id} className="relative border-l border-primary/10">
                  {/* Líneas de cada hora y media hora */}
                  {horas.map((hh) => (
                    <span key={hh} aria-hidden className="absolute inset-x-0 border-t border-border/60" style={{ top: y(hh * 60) }}>
                      <span className="absolute inset-x-0 border-t border-dashed border-border/35" style={{ top: PX_HORA / 2 }} />
                    </span>
                  ))}
                  {/* Fuera de horario: gris suave */}
                  {h && (
                    <>
                      <span aria-hidden className="absolute inset-x-0 top-0 bg-muted/45" style={{ height: Math.max(0, y(minutos(h.start))) }} />
                      <span aria-hidden className="absolute inset-x-0 bottom-0 bg-muted/45" style={{ top: y(minutos(h.end)) }} />
                    </>
                  )}
                  {!h && !aus && <span aria-hidden className="absolute inset-0 bg-muted/45" />}
                  {/* Vacaciones / ausencia o feriado: rayado */}
                  {(aus || feriado) && (
                    <span className="absolute inset-0 z-[1] grid place-items-center bg-[repeating-linear-gradient(135deg,rgba(14,165,233,0.08)_0_8px,transparent_8px_16px)]">
                      <span className="rounded-full bg-card/90 px-3 py-1 text-[11px] font-bold text-sky-700 shadow-sm">
                        {feriado ? `Feriado · ${feriado}` : aus?.tipo}
                      </span>
                    </span>
                  )}
                  {/* Bloqueos de horario de la clínica */}
                  {bloqueos.map((b) => (
                    <span
                      key={b.id}
                      className="absolute inset-x-1 z-[1] overflow-hidden rounded-lg border border-dashed border-slate-300 bg-[repeating-linear-gradient(135deg,rgba(100,116,139,0.1)_0_6px,transparent_6px_12px)] px-2 py-1 text-[10px] font-semibold text-slate-600"
                      style={{ top: y(minutos(b.desde)), height: Math.max(18, y(minutos(b.hasta)) - y(minutos(b.desde))) }}
                    >
                      {b.motivo || "Bloqueado"}
                    </span>
                  ))}
                  {/* Turnos */}
                  {suyos.map((t) => {
                    const otro = choques.get(t.id);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => onAbrir(t)}
                        title={`${t.hora} · ${t.paciente} · ${t.tratamiento}${otro ? ` — se superpone con ${otro.hora} ${otro.paciente}` : ""}`}
                        className={`absolute inset-x-1.5 z-[2] overflow-hidden rounded-xl bg-gradient-to-br px-2.5 py-1.5 text-left shadow-[0_10px_22px_-14px_rgba(76,29,149,0.9)] transition hover:z-[3] hover:scale-[1.02] ${BLOQUE[t.estado]} ${otro ? "ring-2 ring-rose-500 ring-offset-1 ring-offset-card" : ""} ${t.estado === "Cancelada" ? "line-through opacity-60" : ""}`}
                        style={{ top: y(minutos(t.hora)) + 1, height: (DURACION / 60) * PX_HORA - 3 }}
                      >
                        <span className="flex items-center gap-1 truncate text-[10.5px] font-semibold tabular-nums opacity-90">
                          <b>{t.hora}</b>
                          {otro && <AlertTriangle className="size-3 shrink-0" />}
                          <span className="truncate">· {t.tratamiento}</span>
                        </span>
                        <span className="mt-0.5 block truncate text-[13px] font-bold leading-tight">{t.paciente}</span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
            {/* Línea de «ahora» */}
            {esHoy && minAhora >= inicio * 60 && minAhora <= fin * 60 && (
              <span aria-hidden className="pointer-events-none absolute right-0 z-[4] h-0.5 bg-gradient-to-r from-rose-500 to-pink-500" style={{ top: y(minAhora), left: 72 }}>
                <span className="absolute -left-1.5 -top-[5px] size-3 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.8)]" />
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-3 border-t border-primary/10 px-4 py-2.5 text-[11px] text-muted-foreground">
        {(["Confirmada", "Pendiente", "Atendida"] as const).map((e) => (
          <span key={e} className="inline-flex items-center gap-1.5">
            <span className={`size-2.5 rounded-full bg-gradient-to-br ${BLOQUE[e].split(" text-")[0]}`} /> {e}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-full ring-2 ring-rose-500" /> Se superpone
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-4 rounded-sm bg-[repeating-linear-gradient(135deg,rgba(14,165,233,0.35)_0_3px,transparent_3px_6px)]" /> Vacaciones / feriado
        </span>
      </div>
    </section>
  );
}

/* ───────────── Feriados y vacaciones ───────────── */

function FeriadosYVacaciones({
  puedeEditar,
  profesionales,
  onCerrar,
  onToast,
}: {
  puedeEditar: boolean;
  profesionales: TeamMember[];
  onCerrar: () => void;
  onToast: (m: string) => void;
}) {
  const { feriados = [] } = storeAgenda.usar();
  const { ausencias } = useEquipo();
  const [f, setF] = useState("");
  const [n, setN] = useState("");
  const hoy = iso(new Date());
  const proximas = ausencias
    .filter((a) => a.hasta >= hoy && profesionales.some((m) => m.id === a.miembroId))
    .sort((a, b) => a.desde.localeCompare(b.desde));
  const nombreDe = (id: string) => {
    const m = profesionales.find((x) => x.id === id);
    return m ? `${m.firstName} ${m.lastName}` : "Integrante";
  };
  const lindo = (d: string) => desdeISO(d).toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" });
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-[radial-gradient(circle_at_50%_0%,rgba(124,58,237,0.3),rgba(15,5,30,0.5))] backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={onCerrar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Feriados y vacaciones"
        onMouseDown={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full overflow-y-auto rounded-t-[28px] border border-primary/15 bg-card shadow-[0_40px_90px_-30px_rgba(76,29,149,0.8)] sm:max-w-xl sm:rounded-[28px]"
      >
        <div className="relative overflow-hidden bg-[linear-gradient(118deg,#be123c,#e11d48_40%,#c026d3)] px-5 py-5 text-white sm:px-6">
          <div aria-hidden className="pointer-events-none absolute -right-10 -top-14 size-40 rounded-full bg-white/20 blur-2xl" />
          <div className="relative flex items-start gap-3">
            <span className="grid size-11 place-items-center rounded-2xl border border-white/30 bg-white/15">
              <Palmtree className="size-5" />
            </span>
            <div className="flex-1">
              <h2 className="font-display text-xl font-bold">Feriados y vacaciones</h2>
              <p className="text-sm text-white/85">Días sin atención: se marcan en la agenda y no se ofrecen turnos.</p>
            </div>
            <button type="button" onClick={onCerrar} aria-label="Cerrar" className="grid size-9 place-items-center rounded-xl bg-white/15 hover:bg-white/25">
              <X className="size-4" />
            </button>
          </div>
        </div>
        <div className="space-y-5 p-5 sm:p-6">
          <section>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Feriados de la clínica</p>
            {puedeEditar && (
              <form
                className="mb-3 grid gap-2 sm:grid-cols-[150px_1fr_auto]"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!f || !n.trim()) return;
                  if (feriados.some((x) => x.fecha === f)) return onToast("Ese día ya está cargado");
                  setFeriadosStore((prev) => [...(prev ?? []), { id: Date.now(), fecha: f, nombre: n.trim().slice(0, 60) }].sort((a, b) => a.fecha.localeCompare(b.fecha)));
                  setF("");
                  setN("");
                  onToast("Feriado agregado a la agenda");
                }}
              >
                <input type="date" value={f} onChange={(e) => setF(e.target.value)} className={INPUT} aria-label="Fecha" />
                <input value={n} onChange={(e) => setN(e.target.value)} placeholder="Ej.: Día de la Independencia" className={INPUT} aria-label="Nombre" />
                <button type="submit" disabled={!f || !n.trim()} className="btn-ce !min-h-10 justify-center disabled:opacity-50">
                  <Plus className="size-4" /> Agregar
                </button>
              </form>
            )}
            {feriados.length === 0 ? (
              <VacioPortal compacto icon={CalendarOff} titulo="Sin feriados cargados" texto="Cargá los feriados de tu país o ciudad y los días que la clínica cierra." />
            ) : (
              <ul className="space-y-1.5">
                {feriados.map((x) => (
                  <li key={x.id} className={`flex items-center gap-3 rounded-2xl border px-3 py-2 ${x.fecha < hoy ? "border-border/60 opacity-60" : "border-rose-200 bg-rose-50/50 dark:border-rose-500/30 dark:bg-rose-500/5"}`}>
                    <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 text-xs font-bold text-white">{Number(x.fecha.slice(8, 10))}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{x.nombre}</span>
                      <span className="block text-[11px] capitalize text-muted-foreground">{lindo(x.fecha)}</span>
                    </span>
                    {puedeEditar && (
                      <button type="button" aria-label="Quitar" onClick={() => setFeriadosStore((prev) => (prev ?? []).filter((y) => y.id !== x.id))} className="grid size-9 place-items-center rounded-xl text-muted-foreground hover:bg-rose-100 hover:text-rose-600">
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Vacaciones y ausencias del equipo</p>
            {proximas.length === 0 ? (
              <VacioPortal compacto icon={Palmtree} titulo="Nadie de vacaciones" texto="Las ausencias se cargan en Equipo → Integrantes o en RRHH → Licencias." />
            ) : (
              <ul className="space-y-1.5">
                {proximas.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 rounded-2xl border border-sky-200 bg-sky-50/60 px-3 py-2 dark:border-sky-500/30 dark:bg-sky-500/5">
                    <AvatarPortal nombre={nombreDe(a.miembroId)} tam="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{nombreDe(a.miembroId)}</span>
                      <span className="block text-[11px] text-muted-foreground">
                        {a.tipo} · {lindo(a.desde)} → {lindo(a.hasta)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function Reprogramar({
  turno,
  onCerrar,
  onGuardar,
}: {
  turno: Turno;
  onCerrar: () => void;
  onGuardar: (fecha: string, hora: string) => void;
  quien: string;
}) {
  const [f, setF] = useState(turno.fecha);
  const [h, setH] = useState(turno.hora);
  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-end bg-black/45 p-0 sm:place-items-center sm:p-4"
      onClick={onCerrar}
    >
      <div
        className="w-full max-w-md rounded-t-3xl border border-primary/15 bg-card p-5 shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-base font-bold">Reprogramar turno</p>
        <p className="text-xs text-muted-foreground">
          {turno.paciente} · {turno.tratamiento} · {turno.odontologo}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="text-xs font-semibold">
            Fecha
            <input
              type="date"
              value={f}
              onChange={(e) => setF(e.target.value)}
              className={`${INPUT} mt-1`}
            />
          </label>
          <label className="text-xs font-semibold">
            Hora
            <input
              type="time"
              value={h}
              onChange={(e) => setH(e.target.value)}
              className={`${INPUT} mt-1`}
            />
          </label>
        </div>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onCerrar}
            className="btn-ce-outline !min-h-11 flex-1 justify-center"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onGuardar(f, h)}
            className="btn-ce !min-h-11 flex-1 justify-center"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
