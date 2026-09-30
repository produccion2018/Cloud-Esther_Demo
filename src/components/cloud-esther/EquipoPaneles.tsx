import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  CalendarOff,
  CalendarX2,
  Check,
  Clock3,
  Mail,
  Plus,
  RefreshCcw,
  Send,
  Trash2,
  TrendingUp,
  Trophy,
  UserPlus,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { storeAgenda, type Turno } from "@/lib/cloud-esther/agenda-store";
import { useEquipo, TIPOS_AUSENCIA, type Ausencia, type TipoAusencia } from "@/lib/cloud-esther/equipo-store";
import { emptyMember, permsFor, type TeamMember, type TeamRole } from "@/lib/cloud-esther/equipo-profesional-data";
import { capitalizarNombre } from "@/lib/utils";

/* Ubicación: src/components/cloud-esther/EquipoPaneles.tsx

   Paneles extra de "Integrantes": desempeño (desde la Agenda), ausencias y licencias,
   e invitaciones pendientes. Todo separado por empresa. */

export function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function sumarDias(iso: string, n: number) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function formatearFecha(iso: string) {
  return iso ? iso.split("-").reverse().join("/") : "";
}

export const nombreDe = (m: TeamMember) => `${m.firstName} ${m.lastName}`.trim();

/** Valor orientativo de cada práctica para estimar la producción. */
const VALOR_PRACTICA: Record<string, number> = {
  "Primera consulta": 15000,
  Control: 10000,
  "Limpieza dental": 25000,
  Restauración: 40000,
  Endodoncia: 120000,
  Extracción: 45000,
  "Control de ortodoncia": 40000,
  Blanqueamiento: 90000,
  "Evaluación de implante": 20000,
  Urgencia: 30000,
};

export function ausenteHoy(ausencias: Ausencia[], miembroId: string, dia = hoyISO()) {
  return ausencias.find((a) => a.miembroId === miembroId && a.desde <= dia && a.hasta >= dia);
}

export function turnosDe(turnos: Turno[], m: TeamMember) {
  return turnos.filter((t) => t.odontologo === nombreDe(m));
}

const BTN_PRIMARIO = "btn-ce";
const BTN_SECUNDARIO = "btn-ce-outline";
const INPUT =
  "h-9 w-full rounded-xl border border-primary/12 bg-white px-3 text-sm outline-none transition-all placeholder:text-muted-foreground focus:border-primary/45 focus:ring-4 focus:ring-primary/10";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function Resumen({ label, valor, icon: Icon, tono = "text-foreground" }: { label: string; valor: string; icon: LucideIcon; tono?: string }) {
  return (
    <div className="card-grad flex items-start justify-between p-3.5">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
        <p className={`mt-1 text-xl font-bold ${tono}`}>{valor}</p>
      </div>
      <span className="grid size-8 place-items-center rounded-xl bg-primary/10 text-primary">
        <Icon className="size-4" />
      </span>
    </div>
  );
}

function Avatar({ m, size = "size-10" }: { m: TeamMember; size?: string }) {
  return (
    <span className={`grid ${size} shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-violet-400 text-xs font-bold text-white shadow-sm`}>
      {`${m.firstName[0] ?? ""}${m.lastName[0] ?? ""}`.toUpperCase()}
    </span>
  );
}

function Modal({ titulo, onClose, children }: { titulo: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-border bg-card p-5 shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Equipo</p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight">{titulo}</h2>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="grid size-8 place-items-center rounded-xl text-muted-foreground hover:bg-muted">
            <X className="size-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ───────────── Desempeño ───────────── */

export function DesempenoEquipo() {
  const { miembros } = useEquipo();
  const { turnos } = storeAgenda.usar();
  const [dias, setDias] = useState<7 | 30 | 90>(30);
  const hoy = hoyISO();
  const desde = sumarDias(hoy, -dias);

  const filas = miembros
    .filter((m) => m.role === "odontologo" && m.status !== "inactivo")
    .map((m) => {
      const suyos = turnosDe(turnos, m);
      const periodo = suyos.filter((t) => t.fecha >= desde && t.fecha <= hoy);
      const atendidos = periodo.filter((t) => t.estado === "Atendida");
      const ausentes = periodo.filter((t) => t.estado === "Ausente").length;
      const cancelados = periodo.filter((t) => t.estado === "Cancelada").length;
      const cerrados = atendidos.length + ausentes;
      const produccion = atendidos.reduce((a, t) => a + (VALOR_PRACTICA[t.tratamiento] ?? 20000), 0);
      const pctComision = m.commissions?.length ? m.commissions.reduce((a, c) => a + c.percentage, 0) / m.commissions.length : 0;
      return {
        m,
        atendidos: atendidos.length,
        ausentes,
        cancelados,
        asistencia: cerrados ? Math.round((atendidos.length / cerrados) * 100) : 100,
        proximos: suyos.filter((t) => t.fecha > hoy && t.fecha <= sumarDias(hoy, 7) && t.estado !== "Cancelada").length,
        pacientes: new Set(atendidos.map((t) => t.paciente)).size,
        produccion,
        comision: Math.round((produccion * pctComision) / 100),
        pctComision,
      };
    })
    .sort((a, b) => b.produccion - a.produccion || b.atendidos - a.atendidos);

  const maxProd = Math.max(1, ...filas.map((f) => f.produccion));
  const totalAtendidos = filas.reduce((a, f) => a + f.atendidos, 0);
  const totalProd = filas.reduce((a, f) => a + f.produccion, 0);
  const totalAus = filas.reduce((a, f) => a + f.ausentes, 0);
  const asistenciaGeneral = totalAtendidos + totalAus ? Math.round((totalAtendidos / (totalAtendidos + totalAus)) * 100) : 100;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Calculado con los turnos de la Agenda. Los valores de producción son orientativos.</p>
        <div className="flex rounded-full border border-primary/15 bg-white p-0.5">
          {([7, 30, 90] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDias(d)}
              aria-pressed={dias === d}
              className={`rounded-full px-3 py-1 text-[11px] font-semibold ${dias === d ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >
              {d} días
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <Resumen label="Turnos atendidos" valor={String(totalAtendidos)} icon={Check} tono="text-primary" />
        <Resumen label="Asistencia general" valor={`${asistenciaGeneral}%`} icon={TrendingUp} tono="text-emerald-600" />
        <Resumen label="Ausencias de pacientes" valor={String(totalAus)} icon={CalendarX2} tono={totalAus ? "text-amber-600" : ""} />
        <Resumen label="Producción estimada" valor={`$ ${totalProd.toLocaleString("es-AR")}`} icon={Trophy} />
      </div>
      {filas.length === 0 ? (
        <p className="card-grad p-6 text-center text-sm text-muted-foreground">No hay odontólogos activos para medir.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {filas.map((f, i) => (
            <li key={f.m.id} className="card-grad p-4">
              <div className="flex items-center gap-3">
                <span className="relative">
                  <Avatar m={f.m} size="size-11" />
                  {i === 0 && f.produccion > 0 && (
                    <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-amber-400 text-white shadow" title="Mayor producción">
                      <Trophy className="size-3" />
                    </span>
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{nombreDe(f.m)}</p>
                  <p className="text-[11px] text-muted-foreground">{f.m.specialties?.join(", ") || "Odontología general"}</p>
                </div>
                <div className="text-right">
                  <p className="text-base font-bold">$ {f.produccion.toLocaleString("es-AR")}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {f.pctComision ? `Comisión ${f.pctComision.toFixed(0)}%: $ ${f.comision.toLocaleString("es-AR")}` : "Sin comisión configurada"}
                  </p>
                </div>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-primary/10">
                <div className="h-full rounded-full bg-gradient-to-r from-primary to-fuchsia-500" style={{ width: `${(f.produccion / maxProd) * 100}%` }} />
              </div>
              <div className="mt-3 grid grid-cols-5 gap-1.5 text-center">
                {[
                  ["Atendidos", f.atendidos],
                  ["Pacientes", f.pacientes],
                  ["Ausentes", f.ausentes],
                  ["Cancelados", f.cancelados],
                  ["Próx. 7 días", f.proximos],
                ].map(([l, v]) => (
                  <div key={l} className="rounded-xl bg-white/80 px-1 py-1.5">
                    <p className="text-sm font-bold">{v}</p>
                    <p className="text-[9.5px] leading-tight text-muted-foreground">{l}</p>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Asistencia de sus pacientes: <b className={f.asistencia >= 85 ? "text-emerald-600" : "text-amber-600"}>{f.asistencia}%</b>
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ───────────── Ausencias y licencias ───────────── */

export function AusenciasEquipo({ onToast }: { onToast: (m: string) => void }) {
  const { miembros, ausencias, setAusencias } = useEquipo();
  const { turnos } = storeAgenda.usar();
  const [abierto, setAbierto] = useState(false);
  const [verPasadas, setVerPasadas] = useState(false);
  const hoy = hoyISO();

  const lista = [...ausencias]
    .filter((a) => verPasadas || a.hasta >= hoy)
    .sort((a, b) => a.desde.localeCompare(b.desde));
  const hoyFuera = ausencias.filter((a) => a.desde <= hoy && a.hasta >= hoy);
  const proximas = ausencias.filter((a) => a.desde > hoy && a.desde <= sumarDias(hoy, 30));

  const afectados = (a: Ausencia) => {
    const m = miembros.find((x) => x.id === a.miembroId);
    if (!m) return [];
    return turnosDe(turnos, m).filter((t) => t.fecha >= a.desde && t.fecha <= a.hasta && t.estado !== "Cancelada" && t.estado !== "Atendida");
  };

  const COLOR: Record<TipoAusencia, string> = {
    Vacaciones: "bg-sky-100 text-sky-700",
    "Licencia médica": "bg-rose-100 text-rose-700",
    Capacitación: "bg-violet-100 text-violet-700",
    "Trámite personal": "bg-amber-100 text-amber-700",
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Vacaciones, licencias y capacitaciones. Te avisa si hay turnos que reprogramar.</p>
        <div className="flex gap-2">
          <button className={BTN_SECUNDARIO} onClick={() => setVerPasadas((v) => !v)}>
            <Clock3 className="size-3.5" />
            {verPasadas ? "Ocultar pasadas" : "Ver pasadas"}
          </button>
          <button className={BTN_PRIMARIO} onClick={() => setAbierto(true)}>
            <Plus className="size-4" />
            Registrar ausencia
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3">
        <Resumen label="Fuera hoy" valor={String(hoyFuera.length)} icon={CalendarOff} tono={hoyFuera.length ? "text-amber-600" : ""} />
        <Resumen label="Próximos 30 días" valor={String(proximas.length)} icon={Clock3} tono="text-primary" />
        <Resumen
          label="Turnos a reprogramar"
          valor={String(ausencias.filter((a) => a.hasta >= hoy).reduce((acc, a) => acc + afectados(a).length, 0))}
          icon={RefreshCcw}
          tono="text-destructive"
        />
      </div>
      {lista.length === 0 ? (
        <p className="card-grad p-6 text-center text-sm text-muted-foreground">No hay ausencias registradas.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {lista.map((a) => {
            const m = miembros.find((x) => x.id === a.miembroId);
            if (!m) return null;
            const turnosAfectados = afectados(a);
            const enCurso = a.desde <= hoy && a.hasta >= hoy;
            const dias = Math.round((new Date(`${a.hasta}T12:00:00`).getTime() - new Date(`${a.desde}T12:00:00`).getTime()) / 86_400_000) + 1;
            return (
              <li key={a.id} className={`card-grad p-4 ${a.hasta < hoy ? "opacity-60" : ""}`}>
                <div className="flex items-start gap-3">
                  <Avatar m={m} />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold">
                      {nombreDe(m)}
                      <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${COLOR[a.tipo]}`}>{a.tipo}</span>
                      {enCurso && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10.5px] font-semibold text-amber-700">En curso</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {a.desde === a.hasta ? formatearFecha(a.desde) : `Del ${formatearFecha(a.desde)} al ${formatearFecha(a.hasta)}`} · {dias} {dias === 1 ? "día" : "días"}
                      {a.nota ? ` · ${a.nota}` : ""}
                    </p>
                  </div>
                  <button
                    className="grid size-8 place-items-center rounded-full border border-primary/12 bg-white text-muted-foreground hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Eliminar ausencia"
                    onClick={() => {
                      setAusencias((prev) => prev.filter((x) => x.id !== a.id));
                      onToast("Ausencia eliminada");
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
                {turnosAfectados.length > 0 && a.hasta >= hoy && (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-destructive/15 bg-destructive/[0.05] px-3 py-2">
                    <p className="text-xs text-destructive">
                      {turnosAfectados.length} {turnosAfectados.length === 1 ? "turno agendado" : "turnos agendados"} en esas fechas:{" "}
                      {turnosAfectados.slice(0, 3).map((t) => `${formatearFecha(t.fecha).slice(0, 5)} ${t.paciente}`).join(", ")}
                      {turnosAfectados.length > 3 ? "…" : ""}
                    </p>
                    <Link to="/demo/agenda" className={BTN_SECUNDARIO}>
                      <RefreshCcw className="size-3.5" />
                      Reprogramar
                    </Link>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {abierto && (
        <Modal titulo="Registrar ausencia" onClose={() => setAbierto(false)}>
          <AusenciaForm
            miembros={miembros.filter((m) => m.status !== "inactivo")}
            onCancel={() => setAbierto(false)}
            onSubmit={(a) => {
              setAusencias((prev) => [...prev, { ...a, id: `a-${Date.now()}` }]);
              setAbierto(false);
              const m = miembros.find((x) => x.id === a.miembroId);
              onToast(`Ausencia de ${m ? nombreDe(m) : "integrante"} registrada`);
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function AusenciaForm({ miembros, onSubmit, onCancel }: { miembros: TeamMember[]; onSubmit: (a: Omit<Ausencia, "id">) => void; onCancel: () => void }) {
  const [miembroId, setMiembroId] = useState(miembros[0]?.id ?? "");
  const [tipo, setTipo] = useState<TipoAusencia>("Vacaciones");
  const [desde, setDesde] = useState(hoyISO());
  const [hasta, setHasta] = useState(hoyISO());
  const [nota, setNota] = useState("");
  const [error, setError] = useState("");
  return (
    <form
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        if (!miembroId) return setError("Elegí un integrante.");
        if (hasta < desde) return setError("La fecha de fin no puede ser anterior al inicio.");
        onSubmit({ miembroId, tipo, desde, hasta, nota: nota.trim() });
      }}
      className="space-y-3"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Integrante">
          <select value={miembroId} onChange={(e) => setMiembroId(e.target.value)} className={INPUT}>
            {miembros.map((m) => (
              <option key={m.id} value={m.id}>
                {nombreDe(m)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Tipo">
          <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoAusencia)} className={INPUT}>
            {TIPOS_AUSENCIA.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Field>
        <Field label="Desde">
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className={INPUT} />
        </Field>
        <Field label="Hasta">
          <input type="date" value={hasta} min={desde} onChange={(e) => setHasta(e.target.value)} className={INPUT} />
        </Field>
      </div>
      <Field label="Nota">
        <input value={nota} onChange={(e) => setNota(e.target.value)} className={INPUT} placeholder="Opcional" />
      </Field>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" className={BTN_SECUNDARIO} onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className={BTN_PRIMARIO}>
          <Check className="size-4" />
          Registrar
        </button>
      </div>
    </form>
  );
}

/* ───────────── Invitaciones ───────────── */

const ROLES: { value: TeamRole; label: string }[] = [
  { value: "odontologo", label: "Odontólogo/a" },
  { value: "asistente", label: "Asistente dental" },
  { value: "secretaria", label: "Secretaria" },
  { value: "administrador", label: "Administrador/a" },
];

export function InvitacionesEquipo({ onToast }: { onToast: (m: string) => void }) {
  const { miembros, setMiembros, actualizarMiembro } = useEquipo();
  const pendientes = miembros.filter((m) => m.status === "pendiente");
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [rol, setRol] = useState<TeamRole>("odontologo");
  const [error, setError] = useState("");

  const invitar = (e: FormEvent) => {
    e.preventDefault();
    const limpio = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(limpio)) return setError("Ingresá un correo válido.");
    if (miembros.some((m) => m.email.toLowerCase() === limpio)) return setError("Ese correo ya es parte del equipo.");
    const [firstName = "", ...resto] = capitalizarNombre(nombre.trim() || limpio.split("@")[0] || "").split(" ");
    setMiembros((prev) => [
      ...prev,
      { ...emptyMember(), firstName, lastName: resto.join(" "), email: limpio, role: rol, status: "pendiente", permissions: permsFor(rol) },
    ]);
    setNombre("");
    setEmail("");
    setError("");
    onToast(`Invitación enviada a ${limpio}`);
  };

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[360px_minmax(0,1fr)]">
      <form onSubmit={invitar} className="card-grad h-fit space-y-3 p-4">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <UserPlus className="size-4 text-primary" /> Invitar al equipo
        </p>
        <p className="text-xs text-muted-foreground">Le llega un correo para crear su usuario con el rol y los permisos elegidos.</p>
        <Field label="Nombre y apellido">
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} className={INPUT} placeholder="Ej: Julieta Paredes" />
        </Field>
        <Field label="Correo *">
          <input value={email} onChange={(e) => setEmail(e.target.value)} className={INPUT} placeholder="nombre@clinica.com" />
        </Field>
        <Field label="Rol">
          <select value={rol} onChange={(e) => setRol(e.target.value as TeamRole)} className={INPUT}>
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </Field>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <button type="submit" className={`${BTN_PRIMARIO} w-full`}>
          <Send className="size-3.5" />
          Enviar invitación
        </button>
      </form>

      <div className="space-y-2">
        <p className="px-1 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
          Invitaciones pendientes <span className="rounded-full bg-primary/10 px-1.5 text-primary">{pendientes.length}</span>
        </p>
        {pendientes.length === 0 ? (
          <p className="card-grad p-6 text-center text-sm text-muted-foreground">No hay invitaciones pendientes.</p>
        ) : (
          pendientes.map((m) => (
            <div key={m.id} className="card-grad flex flex-wrap items-center gap-3 p-3.5">
              <Avatar m={m} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{nombreDe(m) || m.email}</p>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Mail className="size-3" />
                  {m.email} · {ROLES.find((r) => r.value === m.role)?.label}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button className={BTN_SECUNDARIO} onClick={() => onToast(`Invitación reenviada a ${m.email}`)}>
                  <RefreshCcw className="size-3.5" />
                  Reenviar
                </button>
                <button
                  className={BTN_SECUNDARIO}
                  onClick={() => {
                    actualizarMiembro(m.id, (x) => ({ ...x, status: "activo" }));
                    onToast(`${nombreDe(m) || m.email} ya forma parte del equipo`);
                  }}
                >
                  <Check className="size-3.5" />
                  Marcar aceptada
                </button>
                <button
                  className="grid size-8 place-items-center rounded-full border border-primary/12 bg-white text-muted-foreground hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                  aria-label="Cancelar invitación"
                  onClick={() => {
                    setMiembros((prev) => prev.filter((x) => x.id !== m.id));
                    onToast("Invitación cancelada");
                  }}
                >
                  <X className="size-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
