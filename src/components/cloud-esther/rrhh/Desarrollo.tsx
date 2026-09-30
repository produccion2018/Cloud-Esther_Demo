import { useState } from "react";
import {
  Award,
  BookOpen,
  Check,
  GraduationCap,
  Pencil,
  Plus,
  Sparkles,
  Star,
  Target,
  Trash2,
  UserPlus,
} from "lucide-react";
import { useEquipo } from "@/lib/cloud-esther/equipo-store";
import {
  COMPETENCIAS,
  auditar,
  diaISO,
  diasEntre,
  nombreDe,
  setRRHH,
  storeRRHH,
  type Capacitacion,
  type Competencia,
  type EstadoCurso,
  type Evaluacion,
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
  fecha,
  titulo,
  type Ctx,
} from "./ui";

const ESTADO_CURSO: Record<EstadoCurso, string> = {
  Pendiente: "bg-amber-100 text-amber-700",
  "En curso": "bg-sky-100 text-sky-700",
  Completada: "bg-emerald-100 text-emerald-700",
};
const promedio = (e: Evaluacion) =>
  Object.values(e.puntajes).reduce((a, b) => a + b, 0) / COMPETENCIAS.length;

/** Borrador de devolución armado por Esther a partir de los puntajes (el evaluador lo revisa). */
export function sugerirDevolucion(nombre: string, p: Record<Competencia, number>) {
  const orden = [...COMPETENCIAS].sort((a, b) => p[b] - p[a]);
  const altas = orden.filter((c) => p[c] >= 4).slice(0, 2);
  const bajas = orden
    .filter((c) => p[c] <= 3)
    .reverse()
    .slice(0, 2);
  const nombreCorto = nombre.split(" ")[0];
  const frases: Record<Competencia, [string, string, string]> = {
    "Atención al paciente": [
      "trato cálido y claro con los pacientes",
      "dedicar más tiempo a explicar cada tratamiento",
      "Lograr que el 90% de las encuestas de satisfacción sean de 5 estrellas.",
    ],
    "Calidad técnica": [
      "muy buena calidad en los tratamientos",
      "reforzar protocolos técnicos y registros clínicos",
      "Completar una capacitación técnica de su especialidad.",
    ],
    "Trabajo en equipo": [
      "colabora con el resto del equipo",
      "coordinar mejor con asistentes y recepción",
      "Participar de la reunión clínica mensual con un caso.",
    ],
    Puntualidad: [
      "cumple con los horarios",
      "mejorar la puntualidad al inicio del turno",
      "Cero llegadas tarde en el próximo trimestre.",
    ],
    Comunicación: [
      "se comunica con claridad",
      "avisar con anticipación cambios y novedades",
      "Usar el portal del equipo para comunicar novedades a diario.",
    ],
  };
  return {
    fortalezas: altas.length
      ? `${nombreCorto} se destaca por ${altas.map((c) => frases[c][0]).join(" y ")}.`
      : `${nombreCorto} muestra compromiso con su trabajo.`,
    mejoras: bajas.length
      ? `Como oportunidad de mejora: ${bajas.map((c) => frases[c][1]).join(" y ")}.`
      : "Mantener el nivel actual y sumar nuevas responsabilidades.",
    objetivos: (bajas.length ? bajas : altas.slice(0, 1)).map((c) => frases[c][2]).join(" "),
  };
}

export function Desarrollo({ ctx }: { ctx: Ctx }) {
  const { miembros } = useEquipo();
  const { capacitaciones, evaluaciones, legajos } = storeRRHH.usar();
  const [pestana, setPestana] = useState<"capacitaciones" | "evaluaciones">("capacitaciones");
  const [curso, setCurso] = useState<Capacitacion | "nuevo" | null>(null);
  const [evalu, setEvalu] = useState<Evaluacion | "nueva" | null>(null);
  const activos = miembros.filter((m) => m.status !== "inactivo" && !legajos[m.id]?.baja);
  const nombre = (id: string) => {
    const m = miembros.find((x) => x.id === id);
    return m ? nombreDe(m) : "—";
  };
  const asign = capacitaciones.flatMap((c) => c.asignados);
  const hoy = diaISO();
  const vencidas = capacitaciones.flatMap((c) =>
    c.vigenciaMeses
      ? c.asignados
          .filter(
            (a) =>
              a.estado === "Completada" &&
              a.completada &&
              diasEntre(hoy, diaISO(Math.round(c.vigenciaMeses * 30.4), a.completada)) < 30,
          )
          .map((a) => ({ c, a }))
      : [],
  );
  const cerradas = evaluaciones.filter((e) => e.estado === "Cerrada");

  const cambiarEstado = (c: Capacitacion, miembroId: string, estado: EstadoCurso) => {
    setRRHH("capacitaciones", (p) =>
      p.map((x) =>
        x.id === c.id
          ? {
              ...x,
              asignados: x.asignados.map((a) =>
                a.miembroId === miembroId
                  ? { ...a, estado, completada: estado === "Completada" ? diaISO() : "" }
                  : a,
              ),
            }
          : x,
      ),
    );
    if (estado === "Completada") {
      auditar(ctx.usuario, "Capacitación", `${nombre(miembroId)} completó ${c.titulo}`);
      setRRHH("documentos", (p) => [
        ...p,
        {
          id: `d-${Date.now()}`,
          miembroId,
          tipo: "Certificado de curso",
          archivo: `certificado-${c.titulo.toLowerCase().replace(/\s+/g, "-").slice(0, 30)}.pdf`,
          subido: diaISO(),
          vence: c.vigenciaMeses ? diaISO(Math.round(c.vigenciaMeses * 30.4)) : "",
        },
      ]);
    }
    ctx.onToast(
      estado === "Completada"
        ? `${nombre(miembroId)} completó el curso: el certificado quedó en su legajo`
        : `Estado: ${estado}`,
    );
  };

  return (
    <div className="space-y-3">
      <Encabezado
        icon={GraduationCap}
        titulo="Desarrollo y desempeño"
        descripcion="Capacitaciones obligatorias con vencimiento y evaluaciones por competencias."
      >
        <div className="flex gap-1 rounded-full bg-white/80 p-1 ring-1 ring-primary/10">
          <button
            type="button"
            className={CHIP(pestana === "capacitaciones")}
            onClick={() => setPestana("capacitaciones")}
          >
            Capacitaciones
          </button>
          <button
            type="button"
            className={CHIP(pestana === "evaluaciones")}
            onClick={() => setPestana("evaluaciones")}
          >
            Evaluaciones
          </button>
        </div>
        <button
          type="button"
          className={BTN_PRIMARIO}
          onClick={() => (pestana === "capacitaciones" ? setCurso("nuevo") : setEvalu("nueva"))}
        >
          <Plus className="size-4" />
          {pestana === "capacitaciones" ? "Nueva capacitación" : "Nueva evaluación"}
        </button>
      </Encabezado>

      {pestana === "capacitaciones" ? (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Mini
              label="Cursos"
              valor={String(capacitaciones.length)}
              icon={BookOpen}
              sub={`${capacitaciones.filter((c) => c.tipo === "Obligatoria").length} obligatorios`}
            />
            <Mini
              label="Completados"
              valor={`${asign.filter((a) => a.estado === "Completada").length} / ${asign.length}`}
              icon={Check}
              tono="text-emerald-600"
            />
            <Mini
              label="Horas de formación"
              valor={`${capacitaciones.reduce((a, c) => a + c.horas * c.asignados.filter((x) => x.estado === "Completada").length, 0)} h`}
              icon={GraduationCap}
            />
            <Mini
              label="Certificados por vencer"
              valor={String(vencidas.length)}
              icon={Award}
              tono={vencidas.length ? "text-amber-600" : "text-foreground"}
            />
          </div>
          <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {capacitaciones.map((c) => {
              const hechos = c.asignados.filter((a) => a.estado === "Completada").length;
              return (
                <li key={c.id} className="card-grad flex flex-col p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{c.titulo}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {c.modalidad} · {c.horas} h · {fecha(c.fecha)}{" "}
                        {c.vigenciaMeses ? `· vigencia ${c.vigenciaMeses} meses` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Pill
                        clase={
                          c.tipo === "Obligatoria"
                            ? "bg-rose-100 text-rose-700"
                            : "bg-primary/10 text-primary"
                        }
                      >
                        {c.tipo}
                      </Pill>
                      <button
                        type="button"
                        aria-label={`Editar ${c.titulo}`}
                        className={BTN_ICONO}
                        onClick={() => setCurso(c)}
                      >
                        <Pencil className="size-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-primary/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-500"
                      style={{
                        width: `${c.asignados.length ? (hechos / c.asignados.length) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <ul className="mt-3 space-y-1.5">
                    {c.asignados.map((a) => (
                      <li
                        key={a.miembroId}
                        className="flex items-center gap-2 rounded-xl bg-white/80 px-2.5 py-1.5 ring-1 ring-primary/10"
                      >
                        <span className="min-w-0 flex-1 truncate text-xs font-medium">
                          {nombre(a.miembroId)}
                        </span>
                        {a.completada && (
                          <span className="text-[10px] text-muted-foreground">
                            {fecha(a.completada)}
                          </span>
                        )}
                        <select
                          aria-label={`Estado de ${nombre(a.miembroId)} en ${c.titulo}`}
                          value={a.estado}
                          onChange={(e) =>
                            cambiarEstado(c, a.miembroId, e.target.value as EstadoCurso)
                          }
                          className={`rounded-full border-0 px-2 py-0.5 text-[10.5px] font-semibold ${ESTADO_CURSO[a.estado]}`}
                        >
                          {(["Pendiente", "En curso", "Completada"] as const).map((x) => (
                            <option key={x}>{x}</option>
                          ))}
                        </select>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Mini label="Evaluaciones cerradas" valor={String(cerradas.length)} icon={Star} />
            <Mini
              label="Promedio del equipo"
              valor={
                cerradas.length
                  ? `${(cerradas.reduce((a, e) => a + promedio(e), 0) / cerradas.length).toFixed(1)} / 5`
                  : "—"
              }
              icon={Award}
              tono="text-primary"
            />
            <Mini
              label="En borrador"
              valor={String(evaluaciones.filter((e) => e.estado === "Borrador").length)}
              icon={Pencil}
            />
            <Mini
              label="Sin evaluar"
              valor={String(
                activos.filter((m) => !evaluaciones.some((e) => e.miembroId === m.id)).length,
              )}
              icon={UserPlus}
              tono="text-amber-600"
            />
          </div>
          <div className="card-grad p-4">
            <p className="text-sm font-semibold">Promedio por competencia</p>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-5">
              {COMPETENCIAS.map((c) => {
                const v = cerradas.length
                  ? cerradas.reduce((a, e) => a + e.puntajes[c], 0) / cerradas.length
                  : 0;
                return (
                  <div
                    key={c}
                    className="rounded-2xl bg-white/80 p-3 text-center ring-1 ring-primary/10"
                  >
                    <p className="text-2xl font-bold text-primary">{v.toFixed(1)}</p>
                    <p className="text-[11px] text-muted-foreground">{c}</p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-primary/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-fuchsia-500"
                        style={{ width: `${(v / 5) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {[...evaluaciones]
              .sort((a, b) => b.fecha.localeCompare(a.fecha))
              .map((e) => {
                const m = miembros.find((x) => x.id === e.miembroId);
                return (
                  <li key={e.id} className="card-grad flex flex-col p-4">
                    <div className="flex items-start gap-3">
                      {m && <Avatar m={m} />}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">{nombre(e.miembroId)}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {e.ciclo} · evaluó {e.evaluador} · {fecha(e.fecha)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-primary">{promedio(e).toFixed(1)}</p>
                        <Pill
                          clase={
                            e.estado === "Cerrada"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-muted text-muted-foreground"
                          }
                        >
                          {e.estado}
                        </Pill>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-5 gap-1.5">
                      {COMPETENCIAS.map((c) => (
                        <div
                          key={c}
                          title={c}
                          className="rounded-lg bg-white/80 py-1 text-center ring-1 ring-primary/10"
                        >
                          <p className="text-sm font-bold">{e.puntajes[c]}</p>
                          <p className="truncate px-1 text-[9px] text-muted-foreground">
                            {c.split(" ")[0]}
                          </p>
                        </div>
                      ))}
                    </div>
                    {e.fortalezas && (
                      <p className="mt-2 text-xs">
                        <b>Fortalezas:</b> {e.fortalezas}
                      </p>
                    )}
                    {e.mejoras && (
                      <p className="mt-1 text-xs">
                        <b>A mejorar:</b> {e.mejoras}
                      </p>
                    )}
                    {e.objetivos && (
                      <p className="mt-1 flex gap-1 text-xs">
                        <Target className="mt-0.5 size-3.5 shrink-0 text-primary" /> {e.objetivos}
                      </p>
                    )}
                    <div className="mt-auto flex justify-end pt-3">
                      <button type="button" className={BTN_SECUNDARIO} onClick={() => setEvalu(e)}>
                        <Pencil className="size-4" />
                        {e.estado === "Borrador" ? "Completar" : "Ver / editar"}
                      </button>
                    </div>
                  </li>
                );
              })}
          </ul>
        </>
      )}

      {curso && (
        <Modal
          titulo={curso === "nuevo" ? "Nueva capacitación" : `Editar ${curso.titulo}`}
          onClose={() => setCurso(null)}
          ancho="max-w-2xl"
        >
          <CursoForm
            inicial={curso === "nuevo" ? null : curso}
            personas={activos.map((m) => ({ id: m.id, nombre: nombreDe(m) }))}
            onCancel={() => setCurso(null)}
            onListo={(t) => {
              auditar(ctx.usuario, "Capacitación", t);
              setCurso(null);
              ctx.onToast(t);
            }}
          />
        </Modal>
      )}
      {evalu && (
        <Modal
          titulo={
            evalu === "nueva" ? "Nueva evaluación" : `Evaluación de ${nombre(evalu.miembroId)}`
          }
          onClose={() => setEvalu(null)}
          ancho="max-w-2xl"
        >
          <EvaluacionForm
            ctx={ctx}
            inicial={evalu === "nueva" ? null : evalu}
            personas={activos.map((m) => ({ value: m.id, label: nombreDe(m) }))}
            onCancel={() => setEvalu(null)}
            onListo={(t) => {
              setEvalu(null);
              ctx.onToast(t);
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function CursoForm({
  inicial,
  personas,
  onCancel,
  onListo,
}: {
  inicial: Capacitacion | null;
  personas: { id: string; nombre: string }[];
  onCancel: () => void;
  onListo: (t: string) => void;
}) {
  const [f, setF] = useState({
    titulo: inicial?.titulo ?? "",
    tipo: inicial?.tipo ?? ("Obligatoria" as Capacitacion["tipo"]),
    modalidad: inicial?.modalidad ?? ("Presencial" as Capacitacion["modalidad"]),
    horas: String(inicial?.horas ?? 4),
    fecha: inicial?.fecha ?? diaISO(14),
    vigencia: String(inicial?.vigenciaMeses ?? 12),
  });
  const [sel, setSel] = useState<string[]>(inicial?.asignados.map((a) => a.miembroId) ?? []);
  const [error, setError] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!f.titulo.trim()) return setError("Escribí el nombre del curso.");
        if (!sel.length) return setError("Asigná al menos una persona.");
        const datos = {
          titulo: f.titulo.trim()[0]!.toUpperCase() + f.titulo.trim().slice(1),
          tipo: f.tipo,
          modalidad: f.modalidad,
          horas: Number(f.horas) || 1,
          fecha: f.fecha,
          vigenciaMeses: Number(f.vigencia) || 0,
          asignados: sel.map(
            (id) =>
              inicial?.asignados.find((a) => a.miembroId === id) ?? {
                miembroId: id,
                estado: "Pendiente" as const,
                completada: "",
              },
          ),
        };
        if (inicial)
          setRRHH("capacitaciones", (p) =>
            p.map((c) => (c.id === inicial.id ? { ...c, ...datos } : c)),
          );
        else setRRHH("capacitaciones", (p) => [{ ...datos, id: `c-${Date.now()}` }, ...p]);
        onListo(`${datos.titulo}: ${sel.length} personas asignadas`);
      }}
      className="space-y-3"
    >
      <Field label="Curso *">
        <input
          autoFocus
          value={f.titulo}
          onChange={(e) => setF((p) => ({ ...p, titulo: e.target.value }))}
          className={INPUT}
          placeholder="Ej: Manejo de residuos patogénicos"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Field label="Tipo">
          <Sel
            value={f.tipo}
            onChange={(v) => setF((p) => ({ ...p, tipo: v }))}
            opciones={["Obligatoria", "Opcional"] as const}
          />
        </Field>
        <Field label="Modalidad">
          <Sel
            value={f.modalidad}
            onChange={(v) => setF((p) => ({ ...p, modalidad: v }))}
            opciones={["Presencial", "Virtual"] as const}
          />
        </Field>
        <Field label="Horas">
          <input
            type="number"
            min={1}
            value={f.horas}
            onChange={(e) => setF((p) => ({ ...p, horas: e.target.value }))}
            className={INPUT}
          />
        </Field>
        <Field label="Fecha">
          <input
            type="date"
            value={f.fecha}
            onChange={(e) => setF((p) => ({ ...p, fecha: e.target.value }))}
            className={INPUT}
          />
        </Field>
        <Field label="Vigencia (meses)">
          <input
            type="number"
            min={0}
            value={f.vigencia}
            onChange={(e) => setF((p) => ({ ...p, vigencia: e.target.value }))}
            className={INPUT}
          />
        </Field>
      </div>
      <Field label="Asignar a">
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            className={CHIP(sel.length === personas.length)}
            onClick={() => setSel(sel.length === personas.length ? [] : personas.map((p) => p.id))}
          >
            Todos
          </button>
          {personas.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`${CHIP(sel.includes(p.id))} ring-1 ring-primary/10`}
              onClick={() =>
                setSel((s) => (s.includes(p.id) ? s.filter((x) => x !== p.id) : [...s, p.id]))
              }
            >
              {p.nombre}
            </button>
          ))}
        </div>
      </Field>
      {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
      <Acciones
        etiqueta={inicial ? "Guardar" : "Crear capacitación"}
        onCancel={onCancel}
        extra={
          inicial ? (
            <button
              type="button"
              className={BTN_SECUNDARIO}
              onClick={() => {
                setRRHH("capacitaciones", (p) => p.filter((c) => c.id !== inicial.id));
                onListo(`${inicial.titulo} eliminada`);
              }}
            >
              <Trash2 className="size-4" />
              Eliminar
            </button>
          ) : undefined
        }
      />
    </form>
  );
}

function EvaluacionForm({
  ctx,
  inicial,
  personas,
  onCancel,
  onListo,
}: {
  ctx: Ctx;
  inicial: Evaluacion | null;
  personas: { value: string; label: string }[];
  onCancel: () => void;
  onListo: (t: string) => void;
}) {
  const semestre = new Date().getMonth() < 6 ? "1er" : "2do";
  const [id, setId] = useState(inicial?.miembroId ?? personas[0]?.value ?? "");
  const [ciclo, setCiclo] = useState(
    inicial?.ciclo ?? `${diaISO().slice(0, 4)} · ${semestre} semestre`,
  );
  const [p, setP] = useState<Record<Competencia, number>>(
    inicial?.puntajes ??
      (Object.fromEntries(COMPETENCIAS.map((c) => [c, 3])) as Record<Competencia, number>),
  );
  const [fortalezas, setFortalezas] = useState(inicial?.fortalezas ?? "");
  const [mejoras, setMejoras] = useState(inicial?.mejoras ?? "");
  const [objetivos, setObjetivos] = useState(inicial?.objetivos ?? "");
  const nombreSel = personas.find((x) => x.value === id)?.label ?? "";
  const guardar = (estado: Evaluacion["estado"]) => {
    const datos: Evaluacion = {
      id: inicial?.id ?? `e-${Date.now()}`,
      miembroId: id,
      ciclo,
      fecha: diaISO(),
      evaluador: titulo(ctx.usuario),
      puntajes: p,
      fortalezas: fortalezas.trim(),
      mejoras: mejoras.trim(),
      objetivos: objetivos.trim(),
      estado,
    };
    setRRHH("evaluaciones", (prev) =>
      inicial ? prev.map((e) => (e.id === inicial.id ? datos : e)) : [datos, ...prev],
    );
    auditar(ctx.usuario, "Evaluación", `${nombreSel} · ${ciclo} (${estado.toLowerCase()})`);
    onListo(estado === "Cerrada" ? `Evaluación de ${nombreSel} cerrada` : "Borrador guardado");
  };
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        guardar("Cerrada");
      }}
      className="space-y-3"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Persona">
          {inicial ? (
            <input value={nombreSel} readOnly className={`${INPUT} bg-muted/40`} />
          ) : (
            <Sel value={id} onChange={setId} opciones={personas} etiqueta="Persona evaluada" />
          )}
        </Field>
        <Field label="Ciclo">
          <input value={ciclo} onChange={(e) => setCiclo(e.target.value)} className={INPUT} />
        </Field>
      </div>
      <div className="space-y-2 rounded-2xl bg-primary/[0.04] p-3">
        {COMPETENCIAS.map((c) => (
          <div key={c} className="flex items-center justify-between gap-2">
            <span className="text-sm">{c}</span>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-label={`${c}: ${n}`}
                  onClick={() => setP((x) => ({ ...x, [c]: n }))}
                >
                  <Star
                    className={`size-5 ${n <= p[c] ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
                  />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        className={BTN_SECUNDARIO}
        onClick={() => {
          const s = sugerirDevolucion(nombreSel, p);
          setFortalezas(s.fortalezas);
          setMejoras(s.mejoras);
          setObjetivos(s.objetivos);
          ctx.onToast("Esther redactó un borrador: revisalo antes de cerrar");
        }}
      >
        <Sparkles className="size-4" />
        Redactar con Esther
      </button>
      {(
        [
          ["Fortalezas", fortalezas, setFortalezas],
          ["Oportunidades de mejora", mejoras, setMejoras],
          ["Objetivos para el próximo ciclo", objetivos, setObjetivos],
        ] as const
      ).map(([l, v, s]) => (
        <Field key={l} label={l}>
          <textarea
            rows={2}
            value={v}
            onChange={(e) => s(e.target.value)}
            className="w-full rounded-xl border border-primary/12 bg-white px-3 py-2 text-sm outline-none focus:border-primary/45"
          />
        </Field>
      ))}
      <Acciones
        etiqueta="Cerrar evaluación"
        onCancel={onCancel}
        extra={
          <button type="button" className={BTN_SECUNDARIO} onClick={() => guardar("Borrador")}>
            Guardar borrador
          </button>
        }
      />
    </form>
  );
}
