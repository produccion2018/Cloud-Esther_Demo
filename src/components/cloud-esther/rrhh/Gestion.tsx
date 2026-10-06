import { useRef, useState } from "react";
import {
  BarChart3,
  Check,
  Download,
  FileText,
  FileWarning,
  FolderOpen,
  History,
  Settings2,
  ShieldCheck,
  Trash2,
  Upload,
  Workflow,
  X,
} from "lucide-react";
import { useEquipo } from "@/lib/cloud-esther/equipo-store";
import type { TeamRole } from "@/lib/cloud-esther/equipo-profesional-data";
import {
  TIPOS_DOCUMENTO,
  auditar,
  calcularRecibo,
  diaISO,
  diasAusencia,
  diasEntre,
  legajoDe,
  marcas,
  nombreDe,
  nombrePeriodo,
  saldoVacaciones,
  setRRHH,
  storeRRHH,
  tasasDe,
  type ConfigRRHH,
  type TipoDocumento,
} from "@/lib/cloud-esther/rrhh-store";
import { normalizarBusqueda } from "@/lib/utils";
import { COTIZACIONES_INICIALES, PAISES } from "@/lib/cloud-esther/nomina-paises";
import {
  Acciones,
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
  ROL_LABEL,
  Sel,
  ars,
  descargarCSV,
  fecha,
  fechaHora,
  type Ctx,
} from "./ui";

export const REQUERIDOS: Record<TeamRole, TipoDocumento[]> = {
  odontologo: [
    "DNI",
    "Título",
    "Matrícula profesional",
    "Seguro de mala praxis",
    "Vacuna hepatitis B",
  ],
  asistente: ["DNI", "Contrato firmado", "Vacuna hepatitis B", "Alta ART"],
  secretaria: ["DNI", "Contrato firmado", "Alta ART"],
  administrador: ["DNI", "Alta ART"],
};

/* ───────────── Documentos ───────────── */

export function Documentos({ ctx }: { ctx: Ctx }) {
  const { miembros } = useEquipo();
  const { documentos, legajos } = storeRRHH.usar();
  const [filtro, setFiltro] = useState<"" | "vencidos" | "porVencer">("");
  const [q, setQ] = useState("");
  const [cargar, setCargar] = useState<{ miembroId?: string; tipo?: TipoDocumento } | null>(null);
  const hoy = diaISO();
  const activos = miembros.filter((m) => m.status !== "inactivo" && !legajos[m.id]?.baja);
  const estado = (vence: string) => (!vence ? null : diasEntre(hoy, vence));
  const lista = documentos
    .filter((d) => activos.some((m) => m.id === d.miembroId))
    .filter((d) => {
      const e = estado(d.vence);
      return filtro === "vencidos"
        ? e !== null && e < 0
        : filtro === "porVencer"
          ? e !== null && e >= 0 && e <= 30
          : true;
    })
    .filter(
      (d) =>
        !q ||
        normalizarBusqueda(
          `${d.tipo} ${d.archivo} ${nombreDe(miembros.find((m) => m.id === d.miembroId) ?? { firstName: "", lastName: "" })}`,
        ).includes(normalizarBusqueda(q)),
    )
    .sort((a, b) => (a.vence || "9999").localeCompare(b.vence || "9999"));
  const faltantes = activos.flatMap((m) =>
    REQUERIDOS[m.role]
      .filter((t) => !documentos.some((d) => d.miembroId === m.id && d.tipo === t))
      .map((t) => ({ m, t })),
  );

  return (
    <div className="space-y-3">
      <Encabezado
        icon={FolderOpen}
        titulo="Documentación del personal"
        descripcion="Legajo digital: lo obligatorio según el puesto, con vencimientos y avisos."
      >
        <button type="button" className={BTN_PRIMARIO} onClick={() => setCargar({})}>
          <Upload className="size-4" />
          Cargar documento
        </button>
      </Encabezado>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Mini label="Documentos" valor={String(documentos.length)} icon={FileText} />
        <Mini
          label="Vencidos"
          valor={String(documentos.filter((d) => (estado(d.vence) ?? 1) < 0).length)}
          icon={FileWarning}
          tono="text-rose-600"
        />
        <Mini
          label="Vencen en 30 días"
          valor={String(
            documentos.filter((d) => {
              const e = estado(d.vence);
              return e !== null && e >= 0 && e <= 30;
            }).length,
          )}
          icon={FileWarning}
          tono="text-amber-600"
        />
        <Mini
          label="Faltan cargar"
          valor={String(faltantes.length)}
          icon={ShieldCheck}
          tono={faltantes.length ? "text-orange-600" : "text-emerald-600"}
        />
      </div>

      <div className="card-grad p-4">
        <p className="text-sm font-semibold">Checklist por puesto</p>
        <p className="text-[11px] text-muted-foreground">
          Tocá una casilla vacía para cargar el documento que falta.
        </p>
        <div className="scroll-sutil mt-3 overflow-x-auto">
          <table className="w-full min-w-[760px] text-xs">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-[0.06em] text-muted-foreground">
                <th className="pb-2 font-semibold">Persona</th>
                {(
                  [
                    "DNI",
                    "Contrato firmado",
                    "Título",
                    "Matrícula profesional",
                    "Seguro de mala praxis",
                    "Vacuna hepatitis B",
                    "Alta ART",
                  ] as TipoDocumento[]
                ).map((t) => (
                  <th key={t} className="pb-2 text-center font-semibold">
                    {t
                      .replace(" profesional", "")
                      .replace("Seguro de mala praxis", "Mala praxis")
                      .replace("Vacuna hepatitis B", "Hepatitis B")
                      .replace(" firmado", "")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activos.map((m) => (
                <tr key={m.id} className="border-t border-primary/10">
                  <td className="py-1.5 pr-2">
                    <p className="font-medium">{nombreDe(m)}</p>
                    <p className="text-[10px] text-muted-foreground">{ROL_LABEL[m.role]}</p>
                  </td>
                  {(
                    [
                      "DNI",
                      "Contrato firmado",
                      "Título",
                      "Matrícula profesional",
                      "Seguro de mala praxis",
                      "Vacuna hepatitis B",
                      "Alta ART",
                    ] as TipoDocumento[]
                  ).map((t) => {
                    const d = documentos.find((x) => x.miembroId === m.id && x.tipo === t);
                    const req = REQUERIDOS[m.role].includes(t);
                    const e = d ? estado(d.vence) : null;
                    return (
                      <td key={t} className="py-1.5 text-center">
                        {d ? (
                          <span
                            title={d.archivo}
                            className={`inline-grid size-6 place-items-center rounded-full ${e !== null && e < 0 ? "bg-rose-100 text-rose-700" : e !== null && e <= 30 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}
                          >
                            {e !== null && e < 0 ? (
                              <X className="size-3.5" />
                            ) : (
                              <Check className="size-3.5" />
                            )}
                          </span>
                        ) : req ? (
                          <button
                            type="button"
                            aria-label={`Cargar ${t} de ${nombreDe(m)}`}
                            onClick={() => setCargar({ miembroId: m.id, tipo: t })}
                            className="inline-grid size-6 place-items-center rounded-full border-2 border-dashed border-orange-300 text-orange-500 hover:bg-orange-50"
                          >
                            +
                          </button>
                        ) : (
                          <span className="text-muted-foreground/40">·</span>
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

      <div className="card-grad space-y-2.5 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar documento o persona"
            className={`${INPUT} max-w-sm`}
          />
          {(
            [
              ["", "Todos"],
              ["vencidos", "Vencidos"],
              ["porVencer", "Por vencer"],
            ] as const
          ).map(([v, l]) => (
            <button
              key={v}
              type="button"
              className={CHIP(filtro === v)}
              onClick={() => setFiltro(v)}
            >
              {l}
            </button>
          ))}
        </div>
        <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {lista.map((d) => {
            const m = miembros.find((x) => x.id === d.miembroId);
            const e = estado(d.vence);
            return (
              <li
                key={d.id}
                className="flex items-center gap-3 rounded-xl bg-white/85 px-3 py-2 ring-1 ring-primary/10"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <FileText className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {d.tipo} · <span className="font-normal">{m ? nombreDe(m) : "—"}</span>
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {d.archivo} · {fecha(d.subido)}
                  </p>
                </div>
                {e !== null && (
                  <Pill
                    clase={
                      e < 0
                        ? "bg-rose-100 text-rose-700"
                        : e <= 30
                          ? "bg-amber-100 text-amber-700"
                          : "bg-muted text-muted-foreground"
                    }
                  >
                    {e < 0 ? `Venció ${fecha(d.vence)}` : `Vence ${fecha(d.vence)}`}
                  </Pill>
                )}
                {e !== null && e <= 30 && (
                  <button
                    type="button"
                    className="text-[11px] font-semibold text-primary hover:underline"
                    onClick={() => setCargar({ miembroId: d.miembroId, tipo: d.tipo })}
                  >
                    Renovar
                  </button>
                )}
                <button
                  type="button"
                  aria-label="Eliminar documento"
                  className={BTN_ICONO}
                  onClick={() => {
                    setRRHH("documentos", (p) => p.filter((x) => x.id !== d.id));
                    auditar(
                      ctx.usuario,
                      "Documento eliminado",
                      `${d.tipo} de ${m ? nombreDe(m) : ""}`,
                    );
                    ctx.onToast("Documento eliminado");
                  }}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      {cargar && (
        <Modal titulo="Cargar documento" onClose={() => setCargar(null)}>
          <DocumentoForm
            ctx={ctx}
            inicial={cargar}
            personas={activos.map((m) => ({ value: m.id, label: nombreDe(m) }))}
            onCancel={() => setCargar(null)}
            onListo={(t) => {
              setCargar(null);
              ctx.onToast(t);
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function DocumentoForm({
  ctx,
  inicial,
  personas,
  onCancel,
  onListo,
}: {
  ctx: Ctx;
  inicial: { miembroId?: string; tipo?: TipoDocumento };
  personas: { value: string; label: string }[];
  onCancel: () => void;
  onListo: (t: string) => void;
}) {
  const [id, setId] = useState(inicial.miembroId ?? personas[0]?.value ?? "");
  const [tipo, setTipo] = useState<TipoDocumento>(inicial.tipo ?? "DNI");
  const [archivo, setArchivo] = useState("");
  const [vence, setVence] = useState("");
  const [error, setError] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  const venceSugerido = [
    "Matrícula profesional",
    "Seguro de mala praxis",
    "Contrato firmado",
    "Certificado de curso",
  ].includes(tipo);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!archivo) return setError("Elegí el archivo (PDF o imagen).");
        if (venceSugerido && !vence) return setError("Este documento vence: indicá la fecha.");
        setRRHH("documentos", (p) => [
          ...p.filter((d) => !(d.miembroId === id && d.tipo === tipo)),
          { id: `d-${Date.now()}`, miembroId: id, tipo, archivo, subido: diaISO(), vence },
        ]);
        const nombre = personas.find((p) => p.value === id)?.label ?? "";
        auditar(ctx.usuario, "Documento", `${tipo} de ${nombre} (${archivo})`);
        onListo(`${tipo} cargado en el legajo de ${nombre}`);
      }}
      className="space-y-3"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Persona">
          <Sel value={id} onChange={setId} opciones={personas} etiqueta="Persona" />
        </Field>
        <Field label="Tipo">
          <Sel value={tipo} onChange={setTipo} opciones={TIPOS_DOCUMENTO} />
        </Field>
      </div>
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-primary/25 bg-primary/[0.03] px-4 py-6 text-sm text-muted-foreground hover:border-primary/45"
      >
        <Upload className="size-4 text-primary" />
        {archivo || "Elegir archivo (PDF, JPG o PNG)"}
      </button>
      <input
        ref={ref}
        type="file"
        accept=".pdf,image/*"
        className="hidden"
        aria-label="Archivo del documento"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) setArchivo(f.name);
        }}
      />
      <Field label={venceSugerido ? "Vencimiento *" : "Vencimiento (si tiene)"}>
        <input
          type="date"
          value={vence}
          onChange={(e) => setVence(e.target.value)}
          className={INPUT}
        />
      </Field>
      {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
      <Acciones etiqueta="Guardar en el legajo" onCancel={onCancel} icon={Upload} />
    </form>
  );
}

/* ───────────── Reportes, automatizaciones, configuración y auditoría ───────────── */

export function Gestion({ ctx }: { ctx: Ctx }) {
  const { miembros, ausencias } = useEquipo();
  const rrhh = storeRRHH.usar();
  const { legajos, flujos, config, auditoria, periodos, fichajes } = rrhh;
  const [pestana, setPestana] = useState<
    "reportes" | "automatizaciones" | "configuracion" | "auditoria"
  >("reportes");
  const [cfg, setCfg] = useState<ConfigRRHH>(config);
  const [q, setQ] = useState("");
  const hoy = diaISO();
  const activos = miembros.filter((m) => m.status !== "inactivo" && !legajos[m.id]?.baja);
  const bajasAnio = Object.values(legajos).filter(
    (l) => l.baja && l.baja.fecha.startsWith(hoy.slice(0, 4)),
  ).length;
  const rotacion = activos.length ? (bajasAnio / (activos.length + bajasAnio)) * 100 : 0;
  const diasLaborables30 = activos.length * 22;
  const ausentes30 = ausencias
    .filter((a) => a.tipo !== "Vacaciones" && a.hasta >= diaISO(-30) && a.desde <= hoy)
    .reduce((s, a) => s + Math.min(diasAusencia(a), 30), 0);
  const ausentismo = diasLaborables30 ? (ausentes30 / diasLaborables30) * 100 : 0;
  const todas = marcas(fichajes, miembros, config.toleranciaMin);
  const costoPorPeriodo = periodos.map((p) => ({
    p,
    costo: activos.reduce(
      (a, m) => a + calcularRecibo(m, legajoDe(m, legajos), p, config, todas, ausencias).costoBase,
      0,
    ),
  }));
  const maxCosto = Math.max(1, ...costoPorPeriodo.map((x) => x.costo));
  const minCosto = Math.min(...costoPorPeriodo.map((x) => x.costo));
  const altura = (c: number) =>
    40 + (maxCosto === minCosto ? 60 : ((c - minCosto) / (maxCosto - minCosto)) * 70);

  const REPORTES: { t: string; d: string; filas: () => (string | number)[][] }[] = [
    {
      t: "Dotación",
      d: "Personas activas por rol, sucursal y modalidad",
      filas: () => [
        ["Legajo", "Nombre", "Rol", "Puesto", "Sucursal", "Modalidad", "Ingreso"],
        ...activos.map((m) => {
          const l = legajoDe(m, legajos);
          return [
            l.numero,
            nombreDe(m),
            ROL_LABEL[m.role],
            l.puesto,
            l.sucursal,
            l.modalidad,
            fecha(l.ingreso),
          ];
        }),
      ],
    },
    {
      t: "Ausentismo y licencias",
      d: "Todas las licencias del año con días",
      filas: () => [
        ["Persona", "Tipo", "Desde", "Hasta", "Días"],
        ...ausencias.map((a) => [
          nombreDe(miembros.find((m) => m.id === a.miembroId) ?? { firstName: "?", lastName: "" }),
          a.tipo,
          fecha(a.desde),
          fecha(a.hasta),
          diasAusencia(a),
        ]),
      ],
    },
    {
      t: "Vacaciones pendientes",
      d: "Saldo disponible por persona",
      filas: () => [
        ["Persona", "Corresponden", "Usados", "Disponibles"],
        ...activos.map((m) => {
          const s = saldoVacaciones(m.id, legajoDe(m, legajos).ingreso, ausencias);
          return [nombreDe(m), s.total, s.usados, s.disponibles];
        }),
      ],
    },
    {
      t: "Llegadas tarde y horas",
      d: "Últimos 30 días",
      filas: () => [
        ["Persona", "Días fichados", "Horas", "Llegadas tarde"],
        ...activos.map((m) => {
          const f = todas.filter((x) => x.miembroId === m.id && diasEntre(x.fecha, hoy) <= 30);
          return [
            nombreDe(m),
            f.length,
            f.reduce((a, x) => a + x.horas, 0).toFixed(1),
            f.filter((x) => x.tarde).length,
          ];
        }),
      ],
    },
    {
      t: "Costo laboral",
      d: "Por período liquidado",
      filas: () => [
        ["Período", "Estado", "Costo"],
        ...costoPorPeriodo.map(({ p, costo }) => [nombrePeriodo(p.periodo), p.estado, costo]),
      ],
    },
  ];

  return (
    <div className="space-y-3">
      <Encabezado
        icon={BarChart3}
        titulo="Reportes y ajustes"
        descripcion="Indicadores del área, automatizaciones, reglas de liquidación y auditoría de cambios."
      >
        <div className="flex flex-wrap gap-1 rounded-full bg-white/80 p-1 ring-1 ring-primary/10">
          {(
            [
              ["reportes", "Reportes"],
              ["automatizaciones", "Automatizaciones"],
              ["configuracion", "Configuración"],
              ["auditoria", "Auditoría"],
            ] as const
          ).map(([k, l]) => (
            <button
              key={k}
              type="button"
              className={CHIP(pestana === k)}
              onClick={() => setPestana(k)}
            >
              {l}
            </button>
          ))}
        </div>
      </Encabezado>

      {pestana === "reportes" && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Mini
              label="Dotación activa"
              valor={String(activos.length)}
              icon={ShieldCheck}
              sub={`${Object.values(legajos).filter((l) => l.ingreso.startsWith(hoy.slice(0, 4))).length} ingresos este año`}
            />
            <Mini
              label="Rotación anual"
              valor={`${rotacion.toFixed(1)}%`}
              icon={History}
              sub={`${bajasAnio} bajas en ${hoy.slice(0, 4)}`}
            />
            <Mini
              label="Ausentismo (30 días)"
              valor={`${ausentismo.toFixed(1)}%`}
              icon={FileWarning}
              tono={ausentismo > 5 ? "text-rose-600" : "text-emerald-600"}
              sub="Sin contar vacaciones"
            />
            <Mini
              label="Antigüedad promedio"
              valor={`${(activos.reduce((a, m) => a + diasEntre(legajoDe(m, legajos).ingreso, hoy), 0) / Math.max(1, activos.length) / 365).toFixed(1)} años`}
              icon={BarChart3}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div className="card-grad p-4">
              <p className="text-sm font-semibold">Costo laboral por período</p>
              <div className="mt-4 flex h-40 items-end gap-3">
                {costoPorPeriodo.map(({ p, costo }) => (
                  <div key={p.periodo} className="flex flex-1 flex-col items-center gap-1">
                    <span className="text-[10px] font-semibold text-primary">
                      {`$\u00a0${(costo / 1_000_000).toFixed(2)}\u00a0M`}
                    </span>
                    <div
                      className="w-full rounded-t-xl bg-gradient-to-t from-primary to-fuchsia-400"
                      style={{ height: `${altura(costo)}px` }}
                    />
                    <span className="text-[10px] text-muted-foreground">
                      {nombrePeriodo(p.periodo).split(" ")[0]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="card-grad p-4">
              <p className="text-sm font-semibold">Dotación por rol</p>
              <ul className="mt-3 space-y-2.5">
                {(Object.keys(ROL_LABEL) as TeamRole[]).map((r) => {
                  const n = activos.filter((m) => m.role === r).length;
                  return (
                    <li key={r}>
                      <div className="mb-1 flex justify-between text-xs">
                        <span>{ROL_LABEL[r]}</span>
                        <b>{n}</b>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-primary/10">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-primary to-fuchsia-500"
                          style={{ width: `${activos.length ? (n / activos.length) * 100 : 0}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
            {REPORTES.map((r) => (
              <li key={r.t} className="card-grad flex flex-col p-4">
                <p className="text-sm font-semibold">{r.t}</p>
                <p className="text-[11px] text-muted-foreground">{r.d}</p>
                <button
                  type="button"
                  className={`${BTN_SECUNDARIO} mt-3 self-start`}
                  onClick={() => {
                    descargarCSV(
                      `rrhh-${normalizarBusqueda(r.t).replace(/[^a-z0-9]+/g, "-")}-${hoy}.csv`,
                      r.filas(),
                    );
                    auditar(ctx.usuario, "Reporte", `Descargó ${r.t}`);
                  }}
                >
                  <Download className="size-4" />
                  Descargar
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {pestana === "automatizaciones" && (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {flujos.map((f) => (
            <li key={f.id} className="card-grad flex items-start gap-3 p-4">
              <span
                className={`grid size-10 shrink-0 place-items-center rounded-2xl ${f.activo ? "bg-gradient-to-br from-primary to-fuchsia-500 text-white" : "bg-muted text-muted-foreground"}`}
              >
                <Workflow className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{f.nombre}</p>
                <p className="text-[11px] text-muted-foreground">{f.detalle}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {f.ejecuciones} ejecuciones
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={f.activo}
                aria-label={f.nombre}
                onClick={() => {
                  setRRHH("flujos", (p) =>
                    p.map((x) => (x.id === f.id ? { ...x, activo: !x.activo } : x)),
                  );
                  auditar(
                    ctx.usuario,
                    "Automatización",
                    `${f.nombre}: ${f.activo ? "desactivada" : "activada"}`,
                  );
                  ctx.onToast(`${f.nombre}: ${f.activo ? "desactivada" : "activada"}`);
                }}
                className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${f.activo ? "bg-primary" : "bg-muted-foreground/30"}`}
              >
                <span
                  className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-all ${f.activo ? "left-[18px]" : "left-0.5"}`}
                />
              </button>
            </li>
          ))}
        </ul>
      )}

      {pestana === "configuracion" && (
        <form
          className="card-grad space-y-3 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            setRRHH("config", () => cfg);
            auditar(ctx.usuario, "Configuración", "Actualizó las reglas de RRHH");
            ctx.onToast("Configuración guardada: la nómina se recalcula con las nuevas reglas");
          }}
        >
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {(
              [
                ["toleranciaMin", "Tolerancia llegada tarde (min)"],
                ["presentismoPct", "Presentismo (%)"],
                ["antiguedadPct", "Antigüedad por año (%)"],
                ["recargoExtraPct", "Recargo horas extra (%)"],
                ["aportesPct", "Aportes del empleado (%)"],
                ["contribucionesPct", "Contribuciones patronales (%)"],
                ["diaPago", "Día de pago"],
              ] as const
            ).map(([k, l]) => (
              <Field key={k} label={l}>
                <input
                  type="number"
                  step="any"
                  min={0}
                  value={cfg[k]}
                  onChange={(e) => setCfg((p) => ({ ...p, [k]: Number(e.target.value) }))}
                  className={INPUT}
                  aria-label={l}
                />
              </Field>
            ))}
          </div>
          <p className="pt-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-primary">
            Cotizaciones (unidades por 1 USD)
          </p>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {Object.entries(cfg.cotizaciones ?? COTIZACIONES_INICIALES).map(([mon, v]) => (
              <Field key={mon} label={mon}>
                <input
                  type="number"
                  step="any"
                  min={0}
                  value={v}
                  disabled={mon === "USD"}
                  onChange={(e) =>
                    setCfg((p) => ({
                      ...p,
                      cotizaciones: {
                        ...(p.cotizaciones ?? COTIZACIONES_INICIALES),
                        [mon]: Number(e.target.value),
                      },
                    }))
                  }
                  className={INPUT}
                  aria-label={`Cotización ${mon}`}
                />
              </Field>
            ))}
          </div>
          <p className="pt-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-primary">
            Tasas por país y tipo de contrato (%)
          </p>
          <div className="scroll-sutil max-h-[420px] overflow-auto rounded-2xl ring-1 ring-primary/10">
            <table className="w-full min-w-[640px] text-xs">
              <thead className="sticky top-0 bg-white">
                <tr className="text-left text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                  <th className="p-2 font-semibold">País · contrato</th>
                  <th className="p-2 font-semibold">Aportes persona</th>
                  <th className="p-2 font-semibold">Contrib. clínica</th>
                  <th className="p-2 font-semibold">Retención</th>
                </tr>
              </thead>
              <tbody>
                {PAISES.flatMap((pa) =>
                  pa.contratos.map((k) => {
                    const t = tasasDe(k, cfg);
                    const set = (campo: "aportesPct" | "patronalPct" | "retencionPct", v: number) =>
                      setCfg((p) => ({
                        ...p,
                        tasas: { ...(p.tasas ?? {}), [k.id]: { ...tasasDe(k, p), [campo]: v } },
                      }));
                    return (
                      <tr key={k.id} className="border-t border-primary/10">
                        <td className="p-2">
                          <span className="font-medium">
                            {pa.bandera} {pa.nombre}
                          </span>{" "}
                          · {k.nombre}
                        </td>
                        {(["aportesPct", "patronalPct", "retencionPct"] as const).map((campo) => (
                          <td key={campo} className="p-1.5">
                            <input
                              type="number"
                              step="any"
                              min={0}
                              value={t[campo]}
                              onChange={(e) => set(campo, Number(e.target.value))}
                              className={`${INPUT} h-8 w-24`}
                              aria-label={`${k.nombre} ${campo}`}
                            />
                          </td>
                        ))}
                      </tr>
                    );
                  }),
                )}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Valores de referencia: revisalos con tu contador en cada país antes de liquidar.
          </p>
          <div className="flex justify-end gap-2">
            <button type="button" className={BTN_SECUNDARIO} onClick={() => setCfg(config)}>
              Descartar
            </button>
            <button type="submit" className={BTN_PRIMARIO}>
              <Settings2 className="size-4" />
              Guardar reglas
            </button>
          </div>
        </form>
      )}

      {pestana === "auditoria" && (
        <div className="card-grad space-y-2.5 p-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar en la auditoría"
            className={`${INPUT} max-w-sm`}
          />
          <ul className="scroll-sutil max-h-[520px] space-y-1.5 overflow-y-auto pr-1">
            {auditoria
              .filter(
                (a) =>
                  !q ||
                  normalizarBusqueda(`${a.accion} ${a.detalle} ${a.usuario}`).includes(
                    normalizarBusqueda(q),
                  ),
              )
              .map((a) => (
                <li
                  key={a.id}
                  className="flex items-center gap-3 rounded-xl bg-white/85 px-3 py-2 ring-1 ring-primary/10"
                >
                  <Pill clase="bg-primary/10 text-primary">{a.accion}</Pill>
                  <span className="min-w-0 flex-1 truncate text-xs">{a.detalle}</span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {a.usuario} · {fechaHora(a.fecha)}
                  </span>
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}
