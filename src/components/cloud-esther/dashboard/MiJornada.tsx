import { useEffect, useMemo, useState } from "react";
import { Clock3, LogIn, LogOut, Users } from "lucide-react";
import { useClinicaReal } from "@/lib/clinica/modo-clinica";
import { ficharServidor, verFichaje, type EstadoFichaje } from "@/lib/clinica/api";
import { setEquipoPortal, storeEquipoPortal } from "@/lib/cloud-esther/portal-equipo-store";
import { useEquipo } from "@/lib/cloud-esther/equipo-store";
import { aMinutos, horarioDe, storeRRHH } from "@/lib/cloud-esther/rrhh-store";
import { setNotificaciones } from "@/lib/cloud-esther/notificaciones-store";

/* Ubicación: src/components/cloud-esther/dashboard/MiJornada.tsx
   · MiJornada: cada uno ficha su entrada y su salida con un toque desde el inicio (celular o PC).
     En la clínica real la hora la pone el servidor (no se puede fichar «a mano»).
   · HoyEquipo (solo el Administrador): quién está trabajando, quién llegó tarde y quién no fichó
     (según su horario de Equipo y la tolerancia de RRHH). Avisa una vez por día en Notificaciones. */

const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const horaActual = () => new Date().toTimeString().slice(0, 5);
const durac = (min: number) => `${Math.floor(min / 60)} h ${min % 60} min`;
const DEMO_YO = "demo-yo";

export function MiJornada({ onToast }: { onToast: (m: string) => void }) {
  const real = useClinicaReal();
  const { fichajes } = storeEquipoPortal.usar();
  const [serv, setServ] = useState<EstadoFichaje | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [, setTic] = useState(0);
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);
  const soporte = !!real?.sesion.soporte;

  useEffect(() => {
    if (!real || soporte) return;
    let vivo = true;
    verFichaje(real.slug)
      .then((e) => vivo && setServ(e))
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, [real?.slug, soporte]);
  // El contador de horas se actualiza solo cada minuto
  useEffect(() => {
    const t = window.setInterval(() => setTic((x) => x + 1), 60_000);
    return () => window.clearInterval(t);
  }, []);

  if (soporte || !montado) return null;
  // Demo: se guarda en este navegador
  const hoy = hoyISO();
  const misDemo = fichajes.filter((f) => f.miembroId === DEMO_YO && f.fecha === hoy);
  const abiertoDemo = misDemo.find((f) => !f.salida);
  const abierto = real ? serv?.abierto : abiertoDemo ? { entrada: abiertoDemo.entrada } : null;
  const hechos = real ? (serv?.fichajes.length ?? 0) : misDemo.length;
  const minutos = real
    ? (serv?.minutos ?? 0)
    : misDemo.reduce((a, f) => a + Math.max(0, aMinutos(f.salida ?? horaActual()) - aMinutos(f.entrada)), 0);

  const fichar = async () => {
    const accion = abierto ? "salida" : "entrada";
    if (!real) {
      const h = horaActual();
      if (abiertoDemo) setEquipoPortal("fichajes", (prev) => prev.map((f) => (f.id === abiertoDemo.id ? { ...f, salida: h } : f)));
      else setEquipoPortal("fichajes", (prev) => [...prev, { id: `f-${Date.now()}`, miembroId: DEMO_YO, fecha: hoy, entrada: h }]);
      return onToast(accion === "entrada" ? `Entrada a las ${h}` : `Salida a las ${h}. ¡Buen descanso!`);
    }
    setOcupado(true);
    try {
      const e = await ficharServidor(real.slug, accion);
      setServ(e);
      onToast(
        accion === "entrada"
          ? `Entrada a las ${e.abierto?.entrada ?? e.hora}${e.tarde ? ` (${e.tarde} min después de tu horario)` : ""}`
          : `Salida a las ${e.hora}. ¡Buen descanso!`,
      );
    } catch (err) {
      onToast(err instanceof Error ? err.message : "No se pudo fichar. Probá de nuevo.");
    } finally {
      setOcupado(false);
    }
  };

  return (
    <div className="mt-4 flex items-center gap-3 rounded-2xl border border-primary/12 bg-card px-3.5 py-2.5 shadow-[0_10px_24px_-20px_rgba(124,58,237,0.6)]">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
        <Clock3 className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold">
          {abierto ? "Trabajando" : hechos ? "Jornada cerrada" : "Mi jornada"}
        </p>
        <p className="truncate text-[11px] text-muted-foreground">
          {abierto ? `Desde las ${abierto.entrada} · ${durac(minutos)}` : hechos ? `${durac(minutos)} hoy` : real && serv?.horario ? `Tu horario de hoy: ${serv.horario.desde} a ${serv.horario.hasta}` : "Fichá tu entrada al llegar"}
        </p>
      </div>
      <button
        type="button"
        disabled={ocupado || (!!real && !serv)}
        onClick={() => void fichar()}
        className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-[12.5px] font-semibold transition hover:-translate-y-0.5 disabled:opacity-60 ${abierto ? "border border-primary/25 bg-white text-primary" : "bg-gradient-to-r from-primary to-fuchsia-500 text-white shadow-[0_8px_18px_-10px_rgba(124,58,237,0.9)]"}`}
      >
        {abierto ? <LogOut className="size-4" /> : <LogIn className="size-4" />}
        {ocupado ? "…" : abierto ? "Fichar salida" : "Fichar entrada"}
      </button>
    </div>
  );
}

type FilaHoy = { id: string; nombre: string; estado: "trabajando" | "se-fue" | "falta" | "licencia"; tarde: number; detalle: string };

export function HoyEquipo() {
  const real = useClinicaReal();
  const { miembros, ausencias } = useEquipo();
  const { fichajes } = storeEquipoPortal.usar();
  const tolerancia = storeRRHH.usar().config.toleranciaMin ?? 10;
  const esAdmin = !real || real.rol === "admin";
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);
  const hoy = hoyISO();
  const ahora = horaActual();
  const filas = useMemo(() => {
    const out: FilaHoy[] = [];
    for (const m of miembros.filter((x) => x.status !== "inactivo")) {
      const nombre = `${m.firstName} ${m.lastName}`.trim() || m.email;
      const h = horarioDe(m, hoy);
      const suyos = fichajes.filter((f) => f.miembroId === m.id && f.fecha === hoy).sort((a, b) => a.entrada.localeCompare(b.entrada));
      const licencia = ausencias.find((a) => a.miembroId === m.id && a.desde <= hoy && a.hasta >= hoy);
      if (licencia) {
        out.push({ id: m.id, nombre, estado: "licencia", tarde: 0, detalle: licencia.tipo });
        continue;
      }
      const primera = suyos[0];
      const tarde = primera && h ? Math.max(0, aMinutos(primera.entrada) - aMinutos(h.start)) : 0;
      if (primera) {
        const abierto = suyos.find((f) => !f.salida);
        out.push({
          id: m.id,
          nombre,
          estado: abierto ? "trabajando" : "se-fue",
          tarde: tarde > tolerancia ? tarde : 0,
          detalle: abierto ? `desde las ${primera.entrada}` : `de ${primera.entrada} a ${suyos.at(-1)?.salida ?? ""}`,
        });
      } else if (h && aMinutos(ahora) > aMinutos(h.start) + tolerancia && aMinutos(ahora) < aMinutos(h.end)) {
        out.push({ id: m.id, nombre, estado: "falta", tarde: 0, detalle: `entraba a las ${h.start}` });
      }
    }
    return out;
  }, [miembros, ausencias, fichajes, tolerancia, hoy, ahora]);

  // Aviso en Notificaciones, una vez por día por persona (llegó tarde o no fichó)
  useEffect(() => {
    if (!esAdmin) return;
    const avisos = filas.filter((f) => f.estado === "falta" || f.tarde);
    if (!avisos.length) return;
    setNotificaciones("manuales", (prev) => {
      const nuevos = avisos
        .map((f) => ({
          id: `jornada-${f.estado === "falta" ? "falta" : "tarde"}-${f.id}-${hoy}`,
          titulo: f.estado === "falta" ? `${f.nombre} todavía no fichó` : `${f.nombre} llegó ${f.tarde} min tarde`,
          detalle: f.estado === "falta" ? `Hoy ${f.detalle}.` : `Fichó ${f.detalle}.`,
          categoria: "Equipo" as const,
          prioridad: "Normal" as const,
          asignado: "Administración",
          vence: hoy,
          horaVence: "",
          creada: new Date().toISOString(),
          creadaPor: "Mi jornada",
        }))
        .filter((n) => !prev.some((p) => p.id === n.id));
      return nuevos.length ? [...nuevos, ...prev] : prev;
    });
  }, [filas, esAdmin, hoy]);

  if (!montado || !esAdmin || miembros.length === 0) return null;
  const trabajando = filas.filter((f) => f.estado === "trabajando").length;
  const tardes = filas.filter((f) => f.tarde).length;
  const faltan = filas.filter((f) => f.estado === "falta").length;
  const conHorario = miembros.some((m) => (m.schedule ?? []).some((d) => d.active));
  const destacados = filas.filter((f) => f.estado === "falta" || f.tarde || f.estado === "trabajando");
  return (
    <div className="rounded-3xl border border-primary/10 bg-card p-4 shadow-[0_14px_34px_-24px_rgba(124,58,237,0.6)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Users className="size-4 text-primary" /> El equipo hoy
        </p>
        <div className="flex flex-wrap gap-1.5 text-[11px] font-semibold">
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">{trabajando} trabajando</span>
          {tardes > 0 && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-800">{tardes} tarde</span>}
          {faltan > 0 && <span className="rounded-full bg-rose-50 px-2 py-0.5 text-rose-700">{faltan} sin fichar</span>}
        </div>
      </div>
      {destacados.length === 0 ? (
        <p className="mt-2 text-[12px] text-muted-foreground">
          {conHorario
            ? "Nadie fichó todavía y nadie está atrasado."
            : "Cargá el horario de cada integrante en Equipo para saber quién llegó tarde o no vino."}
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-primary/[0.07]">
          {destacados.map((f) => (
            <li key={f.id} className="flex items-center justify-between gap-2 py-1.5 text-[12.5px]">
              <span className="truncate font-medium">{f.nombre}</span>
              <span
                className={`shrink-0 text-[11.5px] ${f.estado === "falta" ? "text-rose-700" : f.tarde ? "text-amber-800" : "text-emerald-700"}`}
              >
                {f.estado === "falta" ? `No fichó (${f.detalle})` : f.tarde ? `${f.tarde} min tarde · ${f.detalle}` : `Trabajando ${f.detalle}`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
