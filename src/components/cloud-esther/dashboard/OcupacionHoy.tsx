import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CalendarClock, Send, Users } from "lucide-react";

import { storeAgenda } from "@/lib/cloud-esther/agenda-store";
import { useEquipo } from "@/lib/cloud-esther/equipo-store";
import { candidatosEspera, recuperarTurno } from "@/lib/cloud-esther/recuperacion-turnos";

/* Ubicación: src/components/cloud-esther/dashboard/OcupacionHoy.tsx
   OCUPACIÓN Y HUECOS LIBRES DE HOY (Dashboard, demo y clínica):
   · Qué porcentaje de la jornada está ocupada (turnos / horarios que atienden los odontólogos).
   · Los próximos horarios libres de hoy y, para cada uno, cuántos pacientes de la lista de
     espera encajan. Con un toque se les ofrece el horario (usa la misma recuperación de turnos
     de la Agenda: el primero que acepta se lo queda).
   Los horarios son los de la Agenda (08:00 a 19:30, cada 30 min) y respetan el horario de cada
   odontólogo cargado en Equipo, sus pausas y los bloqueos del día. */

const SLOTS = Array.from({ length: 24 }, (_, i) => {
  const m = 8 * 60 + i * 30;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${m % 60 === 0 ? "00" : "30"}`;
});
const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const aMin = (h?: string) => {
  const [x = 0, y = 0] = (h ?? "").split(":").map(Number);
  return x * 60 + y;
};
const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

type Hueco = { hora: string; odontologo: string; sucursal: string; candidatos: number };

export function OcupacionHoy({ onToast }: { onToast: (m: string) => void }) {
  const { turnos, bloqueos, espera, ofertas } = storeAgenda.usar();
  const { miembros } = useEquipo();
  const [verTodos, setVerTodos] = useState(false);

  const datos = useMemo(() => {
    const hoy = hoyISO();
    const dia = DIAS[new Date().getDay()];
    const ahora = new Date().toTimeString().slice(0, 5);
    const delDia = turnos.filter((t) => t.fecha === hoy && t.estado !== "Cancelada");
    const odonto = miembros.filter((m) => m.role === "odontologo" && m.status !== "inactivo");
    // Sin equipo cargado: se usan los odontólogos que aparecen en la agenda (o una agenda general)
    const nombres = odonto.length
      ? odonto.map((m) => `${m.firstName} ${m.lastName}`.trim())
      : Array.from(new Set(turnos.map((t) => t.odontologo).filter(Boolean)));
    const columnas = nombres.length ? nombres : [""];
    const atiende = (nombre: string, hora: string) => {
      const m = odonto.find((x) => `${x.firstName} ${x.lastName}`.trim() === nombre);
      if (!m || !m.schedule?.length) return true;
      const d = m.schedule.find((x) => x.day === dia);
      if (!d?.active) return false;
      const t = aMin(hora);
      const pausa = d.breakStart && d.breakEnd && t >= aMin(d.breakStart) && t < aMin(d.breakEnd);
      return t >= aMin(d.start) && t < aMin(d.end) && !pausa;
    };
    const bloqueado = (hora: string) =>
      bloqueos.some((b) => b.fecha === hoy && hora >= b.desde && hora < b.hasta);

    let capacidad = 0;
    const huecos: Hueco[] = [];
    for (const hora of SLOTS) {
      if (bloqueado(hora)) continue;
      for (const o of columnas) {
        if (!atiende(o, hora)) continue;
        capacidad++;
        const ocupado = delDia.some((t) => t.hora === hora && (!o || t.odontologo === o));
        if (!ocupado && hora > ahora) {
          const m = odonto.find((x) => `${x.firstName} ${x.lastName}`.trim() === o);
          const sucursal = m?.office ?? "";
          huecos.push({
            hora,
            odontologo: o,
            sucursal,
            candidatos: candidatosEspera({ fecha: hoy, hora, odontologo: o, sucursal }, espera)
              .length,
          });
        }
      }
    }
    const ocupacion = capacidad ? Math.min(100, Math.round((delDia.length / capacidad) * 100)) : 0;
    return { hoy, ocupacion, turnosHoy: delDia.length, huecos, capacidad };
  }, [turnos, bloqueos, espera, miembros]);

  const yaOfrecido = (h: Hueco) =>
    (ofertas ?? []).some(
      (o) =>
        o.fecha === datos.hoy &&
        o.hora === h.hora &&
        o.odontologo === h.odontologo &&
        o.estado === "ofrecida",
    );

  const ofrecer = (h: Hueco) => {
    const n = recuperarTurno(
      {
        id: Date.now(),
        fecha: datos.hoy,
        hora: h.hora,
        odontologo: h.odontologo,
        sucursal: h.sucursal,
        gabinete: "",
        tratamiento: "Turno disponible hoy",
        paciente: "",
        estado: "Cancelada",
        notas: "",
      },
      { vigenciaMin: 60 },
    );
    onToast(
      n
        ? `Horario de las ${h.hora} ofrecido a ${n} paciente${n > 1 ? "s" : ""} de la lista de espera (vence en 1 hora)`
        : "No hay pacientes de la lista de espera que encajen con ese horario",
    );
  };

  const visibles = verTodos ? datos.huecos : datos.huecos.slice(0, 6);
  const r = 26;
  const c = 2 * Math.PI * r;
  const tono = datos.ocupacion >= 80 ? "#10b981" : datos.ocupacion >= 50 ? "#7c3aed" : "#f59e0b";

  return (
    <section className="rounded-3xl border border-primary/12 bg-card p-4 shadow-[0_18px_40px_-32px_rgba(76,29,149,0.7)] sm:p-5">
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative grid size-[72px] shrink-0 place-items-center">
          <svg viewBox="0 0 64 64" className="absolute inset-0 -rotate-90">
            <circle
              cx="32"
              cy="32"
              r={r}
              fill="none"
              stroke="currentColor"
              strokeWidth="7"
              className="text-primary/10"
            />
            {datos.ocupacion > 0 && (
              <circle
                cx="32"
                cy="32"
                r={r}
                fill="none"
                stroke={tono}
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={`${(datos.ocupacion / 100) * c} ${c}`}
              />
            )}
          </svg>
          <span className="font-display text-base font-bold tabular-nums">{datos.ocupacion}%</span>
        </div>
        <div className="min-w-[10rem] flex-1">
          <h2 className="font-display text-[15px] font-bold tracking-tight">Ocupación de hoy</h2>
          <p className="text-xs text-muted-foreground">
            {datos.turnosHoy} turno{datos.turnosHoy === 1 ? "" : "s"} · {datos.huecos.length}{" "}
            horario
            {datos.huecos.length === 1 ? "" : "s"} libre{datos.huecos.length === 1 ? "" : "s"} por
            delante
          </p>
          <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="size-3.5 text-primary" /> {espera.length} en lista de espera
          </p>
        </div>
        <Link to="/demo/agenda" className="btn-ce-outline !min-h-10">
          <CalendarClock className="size-4" /> Ver agenda
        </Link>
      </div>

      {datos.capacidad === 0 ? (
        <p className="mt-3 rounded-2xl border border-dashed border-primary/20 px-4 py-3 text-sm text-muted-foreground">
          Hoy no hay horarios de atención (fin de semana, bloqueo o sin horarios cargados en
          Equipo).
        </p>
      ) : datos.huecos.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-dashed border-emerald-500/30 bg-emerald-500/[0.06] px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
          No quedan horarios libres por delante hoy.
        </p>
      ) : (
        <>
          <p className="mb-2 mt-4 text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Próximos horarios libres
          </p>
          <ul data-movil="1col" className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {visibles.map((h) => {
              const ofrecido = yaOfrecido(h);
              return (
                <li
                  key={`${h.hora}-${h.odontologo}`}
                  className="flex items-center gap-3 rounded-2xl border border-primary/10 bg-card p-2.5"
                >
                  <span className="rounded-xl bg-primary/10 px-2.5 py-1.5 font-display text-sm font-bold tabular-nums text-primary">
                    {h.hora}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold">
                      {h.odontologo || "Agenda general"}
                    </span>
                    <span className="block text-[11px] text-muted-foreground">
                      {h.candidatos
                        ? `${h.candidatos} en espera encaja${h.candidatos > 1 ? "n" : ""}`
                        : "Nadie en espera encaja"}
                    </span>
                  </span>
                  {ofrecido ? (
                    <span className="rounded-full bg-emerald-500/12 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                      Ofrecido
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={!h.candidatos}
                      onClick={() => ofrecer(h)}
                      title={
                        h.candidatos
                          ? "Ofrecer a la lista de espera"
                          : "No hay nadie en espera para este horario"
                      }
                      className="inline-flex shrink-0 items-center gap-1 rounded-full bg-gradient-to-r from-primary to-fuchsia-500 px-3 py-1.5 text-[11px] font-semibold text-white shadow-[0_8px_18px_-10px_rgba(124,58,237,0.9)] transition hover:brightness-110 disabled:from-muted disabled:to-muted disabled:text-muted-foreground disabled:shadow-none"
                    >
                      <Send className="size-3" /> Ofrecer
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
          {datos.huecos.length > 6 && (
            <button
              type="button"
              onClick={() => setVerTodos((v) => !v)}
              className="mt-2 text-xs font-semibold text-primary hover:underline"
            >
              {verTodos ? "Ver menos" : `Ver los ${datos.huecos.length} horarios libres`}
            </button>
          )}
        </>
      )}
    </section>
  );
}
