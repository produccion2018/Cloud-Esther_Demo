import { useState } from "react";
import {
  AlarmClock,
  CalendarDays,
  CalendarPlus,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  LogIn,
  Palmtree,
  Pencil,
  Plus,
  UserCheck,
  UserX,
  X,
} from "lucide-react";
import { TIPOS_AUSENCIA, useEquipo, type TipoAusencia } from "@/lib/cloud-esther/equipo-store";
import { storeEquipoPortal } from "@/lib/cloud-esther/portal-equipo-store";
import {
  aMinutos,
  aprobarSolicitud,
  auditar,
  diaISO,
  diaSemana,
  diasAusencia,
  diasEntre,
  horarioDe,
  legajoDe,
  marcas,
  nombreDe,
  saldoVacaciones,
  setRRHH,
  solicitarLicencia,
  storeRRHH,
  type Marca,
} from "@/lib/cloud-esther/rrhh-store";
import {
  Acciones,
  Avatar,
  BTN_ICONO,
  BTN_PRIMARIO,
  BTN_SECUNDARIO,
  CHIP,
  Encabezado,
  Field,
  INPUT,
  Mini,
  Modal,
  Pill,
  Sel,
  Vacio,
  descargarCSV,
  fecha,
  hace,
  type Ctx,
} from "./ui";

/* ───────────── Asistencia ───────────── */

export function Asistencia({ ctx }: { ctx: Ctx }) {
  const { miembros, ausencias } = useEquipo();
  const { legajos, fichajes, config } = storeRRHH.usar();
  storeEquipoPortal.usar(); // se re-renderiza cuando alguien ficha desde el portal
  const [dia, setDia] = useState(diaISO());
  const [semana, setSemana] = useState(0);
  const [editar, setEditar] = useState<{ miembroId: string; fecha: string; marca?: Marca } | null>(
    null,
  );
  const activos = miembros.filter(
    (m) =>
      m.status === "activo" &&
      !legajos[m.id]?.baja &&
      ctx.sucursales.includes(legajoDe(m, legajos).sucursal),
  );
  const todas = marcas(fichajes, miembros, config.toleranciaMin);
  const hoy = diaISO();
  const estadoDe = (id: string, f: string) => {
    const m = activos.find((x) => x.id === id)!;
    const h = horarioDe(m, f);
    const marca = todas.find((x) => x.miembroId === id && x.fecha === f);
    const lic = ausencias.find((a) => a.miembroId === id && a.desde <= f && a.hasta >= f);
    if (lic) return { t: lic.tipo, c: "bg-amber-100 text-amber-700", marca, h };
    if (!h) return { t: "Franco", c: "bg-muted text-muted-foreground", marca, h };
    if (marca)
      return marca.tarde
        ? { t: `Tarde ${marca.tarde}′`, c: "bg-orange-100 text-orange-700", marca, h }
        : { t: "Presente", c: "bg-emerald-100 text-emerald-700", marca, h };
    const yaPaso =
      f < hoy ||
      (f === hoy &&
        aMinutos(new Date().toTimeString().slice(0, 5)) > aMinutos(h.start) + config.toleranciaMin);
    return yaPaso
      ? { t: "Sin fichar", c: "bg-rose-100 text-rose-700", marca, h }
      : { t: "Por llegar", c: "bg-sky-100 text-sky-700", marca, h };
  };
  const delDia = activos.map((m) => ({ m, e: estadoDe(m.id, dia) }));
  const conHorario = delDia.filter((x) => x.e.h);
  const mes = dia.slice(0, 7);
  const delMes = todas.filter(
    (f) => f.fecha.startsWith(mes) && activos.some((m) => m.id === f.miembroId),
  );
  const inicioSemana = diaISO(
    -((new Date(`${diaISO(semana * 7)}T12:00:00`).getDay() + 6) % 7) + semana * 7,
  );
  const diasSemana = Array.from({ length: 6 }, (_, i) => diaISO(i, inicioSemana));

  return (
    <div className="space-y-3">
      <Encabezado
        icon={Clock}
        titulo="Asistencia y control horario"
        descripcion="Fichadas del portal del equipo, llegadas tarde y horas trabajadas. Podés corregir o cargar a mano."
      >
        <button
          type="button"
          className={BTN_SECUNDARIO}
          onClick={() =>
            descargarCSV(`asistencia-${mes}.csv`, [
              ["Fecha", "Persona", "Entrada", "Salida", "Horas", "Tarde (min)", "Origen", "Nota"],
              ...delMes
                .sort((a, b) => a.fecha.localeCompare(b.fecha))
                .map((f) => [
                  fecha(f.fecha),
                  nombreDe(miembros.find((m) => m.id === f.miembroId)!),
                  f.entrada,
                  f.salida,
                  f.horas.toFixed(1),
                  f.tarde,
                  f.origen,
                  f.nota,
                ]),
            ])
          }
        >
          <Download className="size-4" />
          Exportar mes
        </button>
        <button
          type="button"
          className={BTN_PRIMARIO}
          onClick={() => setEditar({ miembroId: activos[0]?.id ?? "", fecha: dia })}
        >
          <Plus className="size-4" />
          Cargar fichaje
        </button>
      </Encabezado>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Mini
          label={dia === hoy ? "Presentes hoy" : "Presentes"}
          valor={`${delDia.filter((x) => x.e.marca).length} / ${conHorario.length}`}
          icon={UserCheck}
          tono="text-emerald-600"
        />
        <Mini
          label="Llegadas tarde"
          valor={String(delDia.filter((x) => x.e.marca?.tarde).length)}
          icon={AlarmClock}
          tono="text-orange-600"
          sub={`Tolerancia ${config.toleranciaMin} min`}
        />
        <Mini
          label="Sin fichar"
          valor={String(delDia.filter((x) => x.e.t === "Sin fichar").length)}
          icon={UserX}
          tono="text-rose-600"
        />
        <Mini
          label="Horas del mes"
          valor={`${Math.round(delMes.reduce((a, f) => a + f.horas, 0))} h`}
          icon={Clock}
          sub={`${delMes.filter((f) => f.tarde).length} llegadas tarde`}
        />
      </div>

      <div className="card-grad p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold">
            {diaSemana(dia)} {fecha(dia)}
          </p>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              aria-label="Día anterior"
              className={BTN_ICONO}
              onClick={() => setDia(diaISO(-1, dia))}
            >
              <ChevronLeft className="size-4" />
            </button>
            <input
              type="date"
              value={dia}
              onChange={(e) => e.target.value && setDia(e.target.value)}
              className={`${INPUT} w-40`}
              aria-label="Día"
            />
            <button
              type="button"
              aria-label="Día siguiente"
              className={BTN_ICONO}
              onClick={() => setDia(diaISO(1, dia))}
            >
              <ChevronRight className="size-4" />
            </button>
            {dia !== hoy && (
              <button type="button" className={CHIP(false)} onClick={() => setDia(hoy)}>
                Hoy
              </button>
            )}
          </div>
        </div>
        <ul className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
          {delDia.map(({ m, e }) => (
            <li
              key={m.id}
              className="flex items-center gap-3 rounded-2xl bg-white/85 p-2.5 ring-1 ring-primary/10"
            >
              <Avatar m={m} tam="size-9" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{nombreDe(m)}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {e.h ? `Horario ${e.h.start}–${e.h.end}` : "Sin horario"}
                  {e.marca &&
                    ` · ${e.marca.entrada}${e.marca.salida ? `–${e.marca.salida}` : " (trabajando)"}`}
                  {e.marca?.origen === "Manual" && " · manual"}
                </p>
              </div>
              <Pill clase={e.c}>{e.t}</Pill>
              {e.h && (
                <button
                  type="button"
                  aria-label={`Editar fichaje de ${nombreDe(m)}`}
                  className={BTN_ICONO}
                  onClick={() =>
                    setEditar(
                      e.marca
                        ? { miembroId: m.id, fecha: dia, marca: e.marca }
                        : { miembroId: m.id, fecha: dia },
                    )
                  }
                >
                  <Pencil className="size-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="card-grad overflow-hidden p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold">Planilla semanal</p>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              aria-label="Semana anterior"
              className={BTN_ICONO}
              onClick={() => setSemana((s) => s - 1)}
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="text-xs text-muted-foreground">
              {fecha(diasSemana[0]!)} al {fecha(diasSemana[5]!)}
            </span>
            <button
              type="button"
              aria-label="Semana siguiente"
              className={BTN_ICONO}
              disabled={semana >= 0}
              onClick={() => setSemana((s) => Math.min(0, s + 1))}
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
        <div className="scroll-sutil mt-3 overflow-x-auto">
          <table className="w-full min-w-[720px] text-xs">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                <th className="pb-2 font-semibold">Persona</th>
                {diasSemana.map((d) => (
                  <th
                    key={d}
                    className={`pb-2 text-center font-semibold ${d === hoy ? "text-primary" : ""}`}
                  >
                    {diaSemana(d).slice(0, 3)} {d.slice(8)}
                  </th>
                ))}
                <th className="pb-2 text-right font-semibold">Horas</th>
              </tr>
            </thead>
            <tbody>
              {activos.map((m) => {
                const horas = todas
                  .filter((f) => f.miembroId === m.id && diasSemana.includes(f.fecha))
                  .reduce((a, f) => a + f.horas, 0);
                return (
                  <tr key={m.id} className="border-t border-primary/10">
                    <td className="py-2 pr-2 font-medium">{nombreDe(m)}</td>
                    {diasSemana.map((d) => {
                      if (d > hoy)
                        return (
                          <td key={d} className="py-2 text-center text-muted-foreground/40">
                            ·
                          </td>
                        );
                      const e = estadoDe(m.id, d);
                      return (
                        <td key={d} className="py-2 text-center">
                          <button
                            type="button"
                            onClick={() =>
                              e.h &&
                              setEditar(
                                e.marca
                                  ? { miembroId: m.id, fecha: d, marca: e.marca }
                                  : { miembroId: m.id, fecha: d },
                              )
                            }
                            className="disabled:cursor-default"
                            disabled={!e.h}
                          >
                            <Pill clase={e.c}>
                              {e.marca ? e.marca.entrada : e.t === "Franco" ? "—" : e.t}
                            </Pill>
                          </button>
                        </td>
                      );
                    })}
                    <td className="py-2 text-right font-semibold">{horas.toFixed(1)} h</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {editar && (
        <Modal
          titulo={editar.marca ? "Corregir fichaje" : "Cargar fichaje"}
          onClose={() => setEditar(null)}
        >
          <FichajeForm
            ctx={ctx}
            inicial={editar}
            personas={activos.map((m) => ({ value: m.id, label: nombreDe(m) }))}
            onCancel={() => setEditar(null)}
            onListo={(t) => {
              setEditar(null);
              ctx.onToast(t);
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function FichajeForm({
  ctx,
  inicial,
  personas,
  onCancel,
  onListo,
}: {
  ctx: Ctx;
  inicial: { miembroId: string; fecha: string; marca?: Marca };
  personas: { value: string; label: string }[];
  onCancel: () => void;
  onListo: (t: string) => void;
}) {
  const { miembros } = useEquipo();
  const [id, setId] = useState(inicial.miembroId);
  const [f, setF] = useState(inicial.fecha);
  const m = miembros.find((x) => x.id === id);
  const h = m ? horarioDe(m, f) : null;
  const [entrada, setEntrada] = useState(inicial.marca?.entrada ?? h?.start ?? "09:00");
  const [salida, setSalida] = useState(inicial.marca?.salida ?? "");
  const [nota, setNota] = useState(inicial.marca?.nota ?? "");
  const [error, setError] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (salida && aMinutos(salida) <= aMinutos(entrada))
          return setError("La salida tiene que ser posterior a la entrada.");
        if (!nota.trim())
          return setError("Contá brevemente por qué se carga o corrige (queda en la auditoría).");
        setRRHH("fichajes", (p) => [
          ...p.filter((x) => !(x.miembroId === id && x.fecha === f)),
          {
            id: `fm-${Date.now()}`,
            miembroId: id,
            fecha: f,
            entrada,
            salida,
            origen: "Manual",
            nota: nota.trim(),
          },
        ]);
        const nombre = m ? nombreDe(m) : id;
        auditar(
          ctx.usuario,
          inicial.marca ? "Corrección de fichaje" : "Fichaje manual",
          `${nombre} ${fecha(f)} ${entrada}${salida ? `–${salida}` : ""}: ${nota.trim()}`,
        );
        onListo(`Fichaje de ${nombre} guardado`);
      }}
      className="space-y-3"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Persona">
          <Sel value={id} onChange={setId} opciones={personas} etiqueta="Persona" />
        </Field>
        <Field label="Fecha">
          <input
            type="date"
            value={f}
            max={diaISO()}
            onChange={(e) => setF(e.target.value)}
            className={INPUT}
          />
        </Field>
        <Field label="Entrada">
          <input
            type="time"
            value={entrada}
            onChange={(e) => setEntrada(e.target.value)}
            className={INPUT}
            aria-label="Entrada"
          />
        </Field>
        <Field label="Salida">
          <input
            type="time"
            value={salida}
            onChange={(e) => setSalida(e.target.value)}
            className={INPUT}
            aria-label="Salida"
          />
        </Field>
      </div>
      <Field label="Motivo *">
        <input
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          className={INPUT}
          placeholder="Ej: se olvidó de fichar, falla del celular"
        />
      </Field>
      {h && (
        <p className="text-[11px] text-muted-foreground">
          Horario de ese día: {h.start}–{h.end}
        </p>
      )}
      {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
      <Acciones etiqueta="Guardar" onCancel={onCancel} icon={LogIn} />
    </form>
  );
}

/* ───────────── Licencias y vacaciones ───────────── */

export function Licencias({ ctx }: { ctx: Ctx }) {
  const { miembros, ausencias, setAusencias } = useEquipo();
  const { legajos, solicitudes } = storeRRHH.usar();
  const [mes, setMes] = useState(0);
  const [nueva, setNueva] = useState(false);
  const [responder, setResponder] = useState<{ id: string; aprobar: boolean } | null>(null);
  const activos = miembros.filter(
    (m) =>
      m.status !== "inactivo" &&
      !legajos[m.id]?.baja &&
      ctx.sucursales.includes(legajoDe(m, legajos).sucursal),
  );
  const nombre = (id: string) => {
    const m = miembros.find((x) => x.id === id);
    return m ? nombreDe(m) : "—";
  };
  const pendientes = solicitudes.filter((s) => s.estado === "Pendiente");
  const resueltas = solicitudes.filter((s) => s.estado !== "Pendiente").slice(0, 8);
  const hoy = diaISO();
  const base = new Date(`${hoy.slice(0, 8)}01T12:00:00`);
  base.setMonth(base.getMonth() + mes);
  const anioMes = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, "0")}`;
  const diasMes = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
  const offset = (base.getDay() + 6) % 7;
  const celdas = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: diasMes }, (_, i) => `${anioMes}-${String(i + 1).padStart(2, "0")}`),
  ];
  const conflictos = (s: { miembroId: string; desde: string; hasta: string }) => {
    const rol = miembros.find((m) => m.id === s.miembroId)?.role;
    return ausencias.filter(
      (a) =>
        a.miembroId !== s.miembroId &&
        a.desde <= s.hasta &&
        s.desde <= a.hasta &&
        miembros.find((m) => m.id === a.miembroId)?.role === rol,
    );
  };
  const COLOR: Record<TipoAusencia, string> = {
    Vacaciones: "bg-emerald-100 text-emerald-700",
    "Licencia médica": "bg-rose-100 text-rose-700",
    Capacitación: "bg-sky-100 text-sky-700",
    "Trámite personal": "bg-amber-100 text-amber-700",
  };

  return (
    <div className="space-y-3">
      <Encabezado
        icon={Palmtree}
        titulo="Licencias y vacaciones"
        descripcion="Lo que se aprueba acá bloquea la agenda del profesional y se ve en Equipo."
      >
        <button type="button" className={BTN_PRIMARIO} onClick={() => setNueva(true)}>
          <CalendarPlus className="size-4" />
          Nueva licencia
        </button>
      </Encabezado>

      <div className="card-grad p-4">
        <p className="text-sm font-semibold">Solicitudes pendientes ({pendientes.length})</p>
        {pendientes.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">
            No hay solicitudes esperando respuesta.
          </p>
        ) : (
          <ul className="mt-2 grid grid-cols-1 gap-2 lg:grid-cols-2">
            {pendientes.map((s) => {
              const m = miembros.find((x) => x.id === s.miembroId);
              const saldo = m
                ? saldoVacaciones(m.id, legajoDe(m, legajos).ingreso, ausencias)
                : null;
              const dias = diasAusencia(s, s.desde.slice(0, 4));
              const choques = conflictos(s);
              return (
                <li key={s.id} className="rounded-2xl bg-white/85 p-3 ring-1 ring-primary/10">
                  <div className="flex items-start gap-3">
                    {m && <Avatar m={m} tam="size-9" />}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">
                        {nombre(s.miembroId)} ·{" "}
                        <span className="font-medium text-primary">{s.tipo}</span>
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {fecha(s.desde)} al {fecha(s.hasta)} · {dias} {dias === 1 ? "día" : "días"}{" "}
                        · {s.origen} · {hace(s.creada)}
                      </p>
                      {s.motivo && <p className="mt-1 text-xs italic">“{s.motivo}”</p>}
                      {s.tipo === "Vacaciones" && saldo && (
                        <p
                          className={`mt-1 text-[11px] font-medium ${dias > saldo.disponibles ? "text-rose-600" : "text-emerald-700"}`}
                        >
                          Le quedan {saldo.disponibles} días
                          {dias > saldo.disponibles ? " (no le alcanzan)" : ""}
                        </p>
                      )}
                      {choques.length > 0 && (
                        <p className="mt-1 text-[11px] font-medium text-amber-700">
                          ⚠ Coincide con{" "}
                          {choques
                            .map((a) => `${nombre(a.miembroId)} (${a.tipo.toLowerCase()})`)
                            .join(", ")}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      className={BTN_SECUNDARIO}
                      onClick={() => setResponder({ id: s.id, aprobar: false })}
                    >
                      <X className="size-4" />
                      Rechazar
                    </button>
                    <button
                      type="button"
                      className={BTN_PRIMARIO}
                      onClick={() => setResponder({ id: s.id, aprobar: true })}
                    >
                      <Check className="size-4" />
                      Aprobar
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.35fr_1fr]">
        <div className="card-grad p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <CalendarDays className="size-4 text-primary" />
              {base
                .toLocaleDateString("es-AR", { month: "long", year: "numeric" })
                .replace(/^\p{L}/u, (c) => c.toUpperCase())}
            </p>
            <div className="flex gap-1.5">
              <button
                type="button"
                aria-label="Mes anterior"
                className={BTN_ICONO}
                onClick={() => setMes((x) => x - 1)}
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                type="button"
                aria-label="Mes siguiente"
                className={BTN_ICONO}
                onClick={() => setMes((x) => x + 1)}
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase text-muted-foreground">
            {["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"].map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {celdas.map((d, i) => {
              if (!d) return <span key={`v${i}`} />;
              const aus = ausencias.filter(
                (a) => a.desde <= d && a.hasta >= d && activos.some((m) => m.id === a.miembroId),
              );
              return (
                <div
                  key={d}
                  className={`min-h-[62px] rounded-xl p-1 ring-1 ${d === hoy ? "bg-primary/[0.08] ring-primary/40" : "bg-white/75 ring-primary/10"}`}
                >
                  <p
                    className={`text-[10px] font-semibold ${d === hoy ? "text-primary" : "text-muted-foreground"}`}
                  >
                    {Number(d.slice(8))}
                  </p>
                  <div className="mt-0.5 flex flex-wrap gap-0.5">
                    {aus.slice(0, 3).map((a) => {
                      const m = miembros.find((x) => x.id === a.miembroId);
                      return (
                        <span
                          key={a.id}
                          title={`${nombre(a.miembroId)} · ${a.tipo}`}
                          className={`rounded px-1 text-[9px] font-bold ${COLOR[a.tipo]}`}
                        >
                          {m ? `${m.firstName[0]}${m.lastName[0]}` : "?"}
                        </span>
                      );
                    })}
                    {aus.length > 3 && (
                      <span className="text-[9px] text-muted-foreground">+{aus.length - 3}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {TIPOS_AUSENCIA.map((t) => (
              <Pill key={t} clase={COLOR[t]}>
                {t}
              </Pill>
            ))}
          </div>
        </div>

        <div className="card-grad p-4">
          <p className="text-sm font-semibold">Saldo de vacaciones {hoy.slice(0, 4)}</p>
          <p className="text-[11px] text-muted-foreground">
            Según antigüedad (Ley de Contrato de Trabajo, art. 150).
          </p>
          <ul className="scroll-sutil mt-3 max-h-[360px] space-y-2.5 overflow-y-auto pr-1">
            {activos.map((m) => {
              const l = legajoDe(m, legajos);
              const s = saldoVacaciones(m.id, l.ingreso, ausencias);
              return (
                <li key={m.id}>
                  <div className="mb-1 flex justify-between gap-2 text-xs">
                    <span className="truncate font-medium">{nombreDe(m)}</span>
                    <span className="shrink-0 text-muted-foreground">
                      <b className="text-foreground">{s.disponibles}</b> de {s.total} días
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-primary/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-primary"
                      style={{ width: `${s.total ? (s.disponibles / s.total) * 100 : 0}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className="card-grad p-4">
        <p className="text-sm font-semibold">Próximas y en curso</p>
        {ausencias.filter((a) => a.hasta >= hoy).length === 0 ? (
          <Vacio icon={Palmtree} texto="No hay licencias próximas." />
        ) : (
          <ul className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
            {ausencias
              .filter((a) => a.hasta >= hoy && activos.some((m) => m.id === a.miembroId))
              .sort((a, b) => a.desde.localeCompare(b.desde))
              .map((a) => (
                <li
                  key={a.id}
                  className="flex items-center gap-2 rounded-xl bg-white/85 px-3 py-2 ring-1 ring-primary/10"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold">{nombre(a.miembroId)}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {fecha(a.desde)} al {fecha(a.hasta)}{" "}
                      {a.desde <= hoy ? "· en curso" : `· en ${diasEntre(hoy, a.desde)} días`}
                    </p>
                  </div>
                  <Pill clase={COLOR[a.tipo]}>{a.tipo}</Pill>
                  <button
                    type="button"
                    aria-label="Cancelar licencia"
                    className={BTN_ICONO}
                    onClick={() => {
                      setAusencias((p) => p.filter((x) => x.id !== a.id));
                      auditar(
                        ctx.usuario,
                        "Licencia cancelada",
                        `${nombre(a.miembroId)}: ${a.tipo} ${fecha(a.desde)}`,
                      );
                      ctx.onToast("Licencia cancelada: la agenda vuelve a estar disponible");
                    }}
                  >
                    <X className="size-3.5" />
                  </button>
                </li>
              ))}
          </ul>
        )}
        {resueltas.length > 0 && (
          <>
            <p className="mt-4 text-xs font-semibold text-muted-foreground">Últimas respuestas</p>
            <ul className="mt-1.5 space-y-1">
              {resueltas.map((s) => (
                <li
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-2 text-[11px]"
                >
                  <span>
                    <b>{nombre(s.miembroId)}</b> · {s.tipo} {fecha(s.desde)}{" "}
                    {s.respuesta && <span className="text-muted-foreground">· {s.respuesta}</span>}
                  </span>
                  <Pill
                    clase={
                      s.estado === "Aprobada"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-rose-100 text-rose-700"
                    }
                  >
                    {s.estado}
                  </Pill>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {responder && (
        <Modal
          titulo={responder.aprobar ? "Aprobar solicitud" : "Rechazar solicitud"}
          onClose={() => setResponder(null)}
        >
          <Respuesta
            aprobar={responder.aprobar}
            onCancel={() => setResponder(null)}
            onListo={(txt) => {
              const s = solicitudes.find((x) => x.id === responder.id);
              if (responder.aprobar) aprobarSolicitud(responder.id, ctx.usuario, txt);
              else {
                setRRHH("solicitudes", (p) =>
                  p.map((x) =>
                    x.id === responder.id ? { ...x, estado: "Rechazada", respuesta: txt } : x,
                  ),
                );
                auditar(
                  ctx.usuario,
                  "Licencia rechazada",
                  `${s ? nombre(s.miembroId) : ""}: ${txt}`,
                );
              }
              setResponder(null);
              ctx.onToast(
                responder.aprobar
                  ? "Aprobada: ya figura en Equipo y bloquea la agenda"
                  : "Solicitud rechazada",
              );
            }}
          />
        </Modal>
      )}
      {nueva && (
        <Modal titulo="Nueva licencia" onClose={() => setNueva(false)}>
          <NuevaLicencia
            ctx={ctx}
            personas={activos.map((m) => ({ value: m.id, label: nombreDe(m) }))}
            onCancel={() => setNueva(false)}
            onListo={(t) => {
              setNueva(false);
              ctx.onToast(t);
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function Respuesta({
  aprobar,
  onCancel,
  onListo,
}: {
  aprobar: boolean;
  onCancel: () => void;
  onListo: (t: string) => void;
}) {
  const sugeridas = aprobar
    ? ["Aprobada, que la disfrutes.", "Aprobada. Coordiná la cobertura con tu equipo."]
    : ["No hay cobertura para esas fechas.", "Superás los días disponibles."];
  const [t, setT] = useState(sugeridas[0]!);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onListo(t.trim());
      }}
      className="space-y-3"
    >
      <div className="flex flex-wrap gap-1">
        {sugeridas.map((s) => (
          <button key={s} type="button" className={CHIP(t === s)} onClick={() => setT(s)}>
            {s}
          </button>
        ))}
      </div>
      <Field label="Mensaje para la persona">
        <textarea
          rows={3}
          value={t}
          onChange={(e) => setT(e.target.value)}
          className="w-full rounded-xl border border-primary/12 bg-white px-3 py-2 text-sm outline-none focus:border-primary/45"
        />
      </Field>
      <Acciones
        etiqueta={aprobar ? "Aprobar" : "Rechazar"}
        onCancel={onCancel}
        icon={aprobar ? Check : X}
      />
    </form>
  );
}

function NuevaLicencia({
  ctx,
  personas,
  onCancel,
  onListo,
}: {
  ctx: Ctx;
  personas: { value: string; label: string }[];
  onCancel: () => void;
  onListo: (t: string) => void;
}) {
  const [id, setId] = useState(personas[0]?.value ?? "");
  const [tipo, setTipo] = useState<TipoAusencia>("Vacaciones");
  const [desde, setDesde] = useState(diaISO(7));
  const [hasta, setHasta] = useState(diaISO(13));
  const [motivo, setMotivo] = useState("");
  const [aprobarYa, setAprobarYa] = useState(true);
  const [error, setError] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (hasta < desde) return setError("La fecha de fin no puede ser anterior al inicio.");
        solicitarLicencia({
          miembroId: id,
          tipo,
          desde,
          hasta,
          motivo: motivo.trim(),
          origen: "RRHH",
        });
        const s = storeRRHH.leer().solicitudes[0];
        if (aprobarYa && s) aprobarSolicitud(s.id, ctx.usuario, "Cargada y aprobada por RRHH");
        else
          auditar(
            ctx.usuario,
            "Solicitud",
            `${personas.find((p) => p.value === id)?.label}: ${tipo}`,
          );
        onListo(
          aprobarYa
            ? `${tipo} registrada y aprobada`
            : "Solicitud creada: queda pendiente de aprobación",
        );
      }}
      className="space-y-3"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Persona">
          <Sel value={id} onChange={setId} opciones={personas} etiqueta="Persona" />
        </Field>
        <Field label="Tipo">
          <Sel value={tipo} onChange={setTipo} opciones={TIPOS_AUSENCIA} />
        </Field>
        <Field label="Desde">
          <input
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            className={INPUT}
          />
        </Field>
        <Field label="Hasta">
          <input
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            className={INPUT}
          />
        </Field>
      </div>
      <Field label="Motivo o certificado">
        <input
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          className={INPUT}
          placeholder="Opcional"
        />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={aprobarYa}
          onChange={(e) => setAprobarYa(e.target.checked)}
          className="size-4 accent-primary"
        />
        Aprobar directamente
      </label>
      {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
      <Acciones etiqueta="Guardar" onCancel={onCancel} icon={CalendarPlus} />
    </form>
  );
}
