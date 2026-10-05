import { useMemo, useState } from "react";
import {
  CalendarClock,
  CalendarPlus,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  RefreshCcw,
  UserX,
  X,
} from "lucide-react";

import { setTurnosStore, type Turno } from "@/lib/cloud-esther/agenda-store";
import type { ScheduleDay, TeamMember } from "@/lib/cloud-esther/equipo-profesional-data";
import { registrarEventoEquipo } from "@/lib/cloud-esther/portal-equipo-store";
import { PestanasPortal, TarjetaPortal } from "../PortalShell";

/* Ubicación: src/components/cloud-esther/portales/equipo/AgendaPortal.tsx
   Agenda completa de los portales del equipo: vista día, semana y mes, y disponibilidad según
   los horarios de cada profesional. En el portal administrativo además se reprograma, cancela,
   confirma y se marcan ausencias de cualquier profesional (si el permiso lo permite).
   Trabaja sobre la misma agenda de la clínica (por empresa). */

type Vista = "dia" | "semana" | "mes" | "disponibilidad";

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
const INPUT =
  "h-11 w-full rounded-xl border border-primary/15 bg-card px-3 text-base outline-none focus:border-primary/45 sm:h-10 sm:text-sm";

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
  const [vista, setVista] = useState<Vista>("dia");
  const [fecha, setFecha] = useState(hoy);
  const [prof, setProf] = useState("");
  const [reprogramar, setReprogramar] = useState<Turno | null>(null);
  const nombre = (m: TeamMember) => `${m.firstName} ${m.lastName}`.trim();
  const quien = nombre(yo);

  const filtrados = useMemo(
    () => turnos.filter((t) => !prof || t.odontologo === prof),
    [turnos, prof],
  );
  const delDia = (d: string) =>
    filtrados.filter((t) => t.fecha === d).sort((a, b) => a.hora.localeCompare(b.hora));

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
    if (vista === "dia") setFecha(sumar(fecha, paso));
    else if (vista === "semana" || vista === "disponibilidad") setFecha(sumar(fecha, paso * 7));
    else {
      const d = desdeISO(fecha);
      d.setMonth(d.getMonth() + paso, 1);
      setFecha(iso(d));
    }
  };

  const titulo =
    vista === "dia"
      ? etiqueta(fecha)
      : vista === "mes"
        ? desdeISO(fecha).toLocaleDateString("es-AR", { month: "long", year: "numeric" })
        : `Semana del ${desdeISO(lunesDe(fecha)).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}`;

  const fila = (t: Turno, compacta = false) => (
    <li
      key={t.id}
      className="flex flex-wrap items-center gap-2 rounded-2xl border border-primary/10 bg-card px-3 py-2.5 shadow-sm"
    >
      <span className="grid min-w-14 place-items-center rounded-xl bg-primary/10 px-2 py-1.5 text-center">
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
              className="btn-ce-outline !min-h-9 flex-1 justify-center sm:flex-none"
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

  const semana = Array.from({ length: 6 }, (_, i) => sumar(lunesDe(fecha), i));
  const primeroMes = (() => {
    const d = desdeISO(fecha);
    d.setDate(1);
    return iso(d);
  })();
  const celdasMes = Array.from({ length: 42 }, (_, i) => sumar(lunesDe(primeroMes), i));
  const mesActual = desdeISO(fecha).getMonth();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <PestanasPortal
          valor={vista}
          onCambiar={setVista}
          opciones={[
            { id: "dia", label: "Día" },
            { id: "semana", label: "Semana" },
            { id: "mes", label: "Mes" },
            { id: "disponibilidad", label: "Disponibilidad" },
          ]}
        />
        <div className="flex flex-wrap items-center gap-2">
          {profesionales.length > 1 && (
            <select
              value={prof}
              onChange={(e) => setProf(e.target.value)}
              className="h-10 rounded-full border border-primary/15 bg-card px-3 text-sm"
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
          {onNuevoTurno && puedeEditar && (
            <button type="button" onClick={onNuevoTurno} className="btn-ce !min-h-10">
              <CalendarPlus className="size-4" /> Nuevo turno
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-2xl border border-primary/10 bg-card px-2 py-1.5 shadow-sm">
        <button
          type="button"
          aria-label="Anterior"
          onClick={() => mover(-1)}
          className="grid size-10 place-items-center rounded-full hover:bg-primary/10"
        >
          <ChevronLeft className="size-4" />
        </button>
        <p className="min-w-0 flex-1 truncate text-center text-sm font-bold">
          {titulo.charAt(0).toUpperCase() + titulo.slice(1)}
        </p>
        <button
          type="button"
          onClick={() => setFecha(hoy)}
          className="rounded-full px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10"
        >
          Hoy
        </button>
        <button
          type="button"
          aria-label="Siguiente"
          onClick={() => mover(1)}
          className="grid size-10 place-items-center rounded-full hover:bg-primary/10"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      {vista === "dia" && (
        <TarjetaPortal
          titulo={`${delDia(fecha).length} turnos`}
          detalle={etiqueta(fecha)}
          icon={CalendarClock}
        >
          {delDia(fecha).length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No hay turnos este día.
            </p>
          ) : (
            <ul className="space-y-2">{delDia(fecha).map((t) => fila(t))}</ul>
          )}
        </TarjetaPortal>
      )}

      {vista === "semana" && (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {semana.map((d) => (
            <TarjetaPortal
              key={d}
              titulo={`${DIAS_CORTOS[desdeISO(d).getDay()]} ${d.slice(8, 10)}/${d.slice(5, 7)}`}
              detalle={`${delDia(d).length} turnos`}
              className={d === hoy ? "ring-2 ring-primary/40" : ""}
            >
              {delDia(d).length === 0 ? (
                <p className="py-3 text-center text-xs text-muted-foreground">Sin turnos</p>
              ) : (
                <ul className="space-y-1.5">{delDia(d).map((t) => fila(t, true))}</ul>
              )}
            </TarjetaPortal>
          ))}
        </div>
      )}

      {vista === "mes" && (
        <TarjetaPortal>
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
              <span key={d} className="py-1">
                {d}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {celdasMes.map((d) => {
              const n = delDia(d).filter((t) => t.estado !== "Cancelada").length;
              const fuera = desdeISO(d).getMonth() !== mesActual;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    setFecha(d);
                    setVista("dia");
                  }}
                  className={`flex aspect-square flex-col items-center justify-center rounded-xl text-xs transition sm:aspect-auto sm:h-16 ${
                    d === hoy
                      ? "bg-gradient-to-br from-primary to-fuchsia-500 text-white"
                      : "hover:bg-primary/10"
                  } ${fuera ? "opacity-35" : ""}`}
                >
                  <span className="font-semibold">{Number(d.slice(8, 10))}</span>
                  {n > 0 && (
                    <span
                      className={`mt-0.5 rounded-full px-1.5 text-[10px] font-bold ${d === hoy ? "bg-white/25" : "bg-primary/10 text-primary"}`}
                    >
                      {n}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </TarjetaPortal>
      )}

      {vista === "disponibilidad" && (
        <TarjetaPortal
          titulo="Disponibilidad de la semana"
          detalle="Horario de atención menos los turnos ya dados"
          icon={Clock3}
        >
          <div className="space-y-4">
            {(prof ? profesionales.filter((m) => nombre(m) === prof) : profesionales).map((m) => (
              <div key={m.id}>
                <p className="mb-2 text-sm font-bold">{nombre(m)}</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                  {semana.map((d, i) => {
                    const h = m.schedule.find((s) => s.day === DIAS_LARGOS[i]);
                    const ocupados = turnos.filter(
                      (t) =>
                        t.fecha === d && t.odontologo === nombre(m) && t.estado !== "Cancelada",
                    ).length;
                    const total = h?.active
                      ? Math.max(0, Math.floor((minutos(h.end) - minutos(h.start)) / 45))
                      : 0;
                    const libres = Math.max(0, total - ocupados);
                    return (
                      <div
                        key={d}
                        className="rounded-2xl border border-primary/10 bg-primary/[0.03] p-2.5"
                      >
                        <p className="text-[11px] font-bold">
                          {DIAS_CORTOS[desdeISO(d).getDay()]} {d.slice(8, 10)}
                        </p>
                        {h?.active ? (
                          <>
                            <p className="text-[11px] text-muted-foreground">
                              {h.start}–{h.end}
                            </p>
                            <p
                              className={`mt-1 text-xs font-bold ${libres ? "text-emerald-600" : "text-rose-600"}`}
                            >
                              {libres} libres · {ocupados} dados
                            </p>
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
            Turnos estimados de 45 minutos. Los horarios se cargan en Equipo → Agendas y horarios.
          </p>
        </TarjetaPortal>
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
