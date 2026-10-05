import { useMemo, useRef, useState, type ReactNode } from "react";
import {
  Camera,
  ClipboardList,
  FileText,
  History,
  ImagePlus,
  Mic,
  Pencil,
  Plus,
  ScanSearch,
  Smile,
  Sparkles,
  Stethoscope,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  PLANNED_TREATMENT_META,
  PLANNED_TREATMENTS,
  TOOTH_STATE_META,
  TOOTH_STATES,
  type ToothDef,
  type ToothState,
} from "@/lib/odontogram/fdi";
import { cargarHistorial } from "@/lib/odontogram/historial";
import { storeRayosX, TIPOS_RX } from "@/lib/cloud-esther/rayos-x";
import { leerImagen } from "@/components/cloud-esther/esther-ai/imagenes";
import {
  cambiarRegistro,
  NotaVozRecorder,
  useRegistrosPacientes,
  type Registros,
} from "@/components/cloud-esther/PacienteSecciones";

/* Ubicación: src/components/cloud-esther/odontograma3d/FichaPieza.tsx
   Ficha clínica de la pieza seleccionada en el Odontograma 3D.
   Todo lo que se carga acá (diagnósticos, tratamientos, notas, imágenes y estudios) se guarda
   en los registros del paciente con el número de pieza, así aparece también en la Historia
   Clínica. Los registros ya están separados por empresa (crearStorePorEmpresa).
   TODO backend: los mismos registros por API, con el token del tenant. */

type Nota = Registros["notasClinicas"][number];
type NotaVoz = Registros["notasVoz"][number];
type Tratamiento = Registros["tratamientos"][number];
type EstadoTratamiento = Tratamiento["estado"];

export type HerramientaPaciente = "rayosx" | "sonrisa";

type Pestana = "resumen" | "tratamientos" | "notas" | "imagenes" | "estudios" | "historial";

const PESTANAS: { id: Pestana; label: string; icon: typeof Stethoscope }[] = [
  { id: "resumen", label: "Estado", icon: Stethoscope },
  { id: "tratamientos", label: "Tratamientos", icon: ClipboardList },
  { id: "notas", label: "Notas", icon: FileText },
  { id: "imagenes", label: "Imágenes", icon: Camera },
  { id: "estudios", label: "Rayos X", icon: ScanSearch },
  { id: "historial", label: "Historial", icon: History },
];

const ESTADOS_TRAT: EstadoTratamiento[] = [
  "Pendiente",
  "Planificado",
  "En tratamiento",
  "Completado",
  "Cancelado",
];

const TIPOS_FOTO = ["Antes", "Después", "Intraoral", "Seguimiento"];
const TIPOS_ESTUDIO = [
  "Radiografía periapical",
  "Radiografía bite-wing",
  "Radiografía panorámica",
  "Tomografía CBCT",
  "Otro estudio",
];

/* Resultado visual orientativo de cada tratamiento sobre la pieza. */
const RESULTADO_TRATAMIENTO: Record<string, ToothState> = {
  Restauración: "tratado",
  Endodoncia: "endodoncia",
  Corona: "corona",
  Extracción: "ausente",
  Implante: "corona",
  Prótesis: "corona",
};

const INPUT =
  "w-full rounded-xl border border-border bg-background px-3 py-2 text-xs outline-none placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/10";
const ITEM = "rounded-2xl border border-border/70 bg-card/80 p-3";
const ETIQUETA = "text-[10px] font-semibold uppercase tracking-wide text-muted-foreground";

const hoy = () => new Date().toISOString().slice(0, 10);
const ahora = () => new Date().toTimeString().slice(0, 5);
const siguienteId = (lista: { id: number }[]) => Math.max(0, ...lista.map((x) => x.id)) + 1;

/** "16", "16, 21" o "Pieza 16" → incluye la pieza. */
function incluyePieza(campo: string | undefined, fdi: number) {
  return (campo ?? "").split(/[^0-9]+/).includes(String(fdi));
}

function fechaCorta(f: string) {
  const d = new Date(f.length === 10 ? `${f}T12:00:00` : f);
  return Number.isNaN(d.getTime())
    ? f
    : d.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
}

type Props = {
  pacienteId: number;
  clavePaciente: string;
  def: ToothDef | null;
  estado: ToothState;
  chart: Record<number, ToothState>;
  profesional: string;
  tieneIA: boolean;
  onSetEstado: (fdi: number, estado: ToothState) => void;
  onElegirPieza: (fdi: number) => void;
  onIrHerramienta: (h: HerramientaPaciente) => void;
  onToast: (msg: string) => void;
};

export function FichaPieza(props: Props) {
  const { pacienteId, def, chart, onElegirPieza } = props;
  const registros = useRegistrosPacientes().de(pacienteId);
  const [pestana, setPestana] = useState<Pestana>("resumen");

  // Piezas con algo registrado: accesos rápidos cuando no hay ninguna seleccionada.
  const piezasConRegistros = useMemo(() => {
    const set = new Set<number>();
    const sumar = (campo: string | undefined) =>
      (campo ?? "")
        .split(/[^0-9]+/)
        .map(Number)
        .filter((n) => n >= 11 && n <= 48)
        .forEach((n) => set.add(n));
    registros.diagnosticos.forEach((x) => sumar(x.pieza));
    registros.tratamientos.forEach((x) => sumar(x.pieza));
    registros.notasClinicas.forEach((x) => sumar(x.piezas));
    registros.fotografias.forEach((x) => sumar(x.pieza));
    registros.estudios.forEach((x) => sumar(x.pieza));
    Object.entries(chart).forEach(([k, v]) => v !== "sano" && set.add(Number(k)));
    return [...set].sort((a, b) => a - b);
  }, [registros, chart]);

  if (!def) {
    return (
      <div className="card-grad flex h-full flex-col overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-primary via-primary/60 to-primary/20" />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Sparkles className="size-6" />
          </span>
          <div>
            <p className="text-base font-bold text-foreground">Ficha clínica por pieza</p>
            <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">
              Seleccioná un diente en el modelo 3D para ver y registrar su estado, diagnóstico,
              tratamientos, notas, imágenes, radiografías e historial. Todo queda en la Historia
              Clínica del paciente.
            </p>
          </div>
          {piezasConRegistros.length > 0 && (
            <div>
              <p className={ETIQUETA}>Piezas con registros</p>
              <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                {piezasConRegistros.map((fdi) => (
                  <button
                    key={fdi}
                    type="button"
                    onClick={() => onElegirPieza(fdi)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-primary/20 bg-white px-2.5 py-1.5 text-xs font-bold text-primary shadow-sm transition hover:border-primary/50 dark:bg-card"
                  >
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: TOOTH_STATE_META[chart[fdi] ?? "sano"].color }}
                    />
                    {fdi}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <FichaDePieza
      {...props}
      def={def}
      registros={registros}
      pestana={pestana}
      setPestana={setPestana}
    />
  );
}

function FichaDePieza({
  pacienteId,
  clavePaciente,
  def,
  estado,
  profesional,
  tieneIA,
  onSetEstado,
  onIrHerramienta,
  onToast,
  registros,
  pestana,
  setPestana,
}: Props & {
  def: ToothDef;
  registros: Registros;
  pestana: Pestana;
  setPestana: (p: Pestana) => void;
}) {
  const fdi = def.fdi;
  const rx = storeRayosX.usar();

  const diagnosticos = registros.diagnosticos.filter((x) => incluyePieza(x.pieza, fdi));
  const tratamientos = registros.tratamientos.filter((x) => incluyePieza(x.pieza, fdi));
  const notas = registros.notasClinicas.filter((x) => incluyePieza(x.piezas, fdi));
  // Notas de voz: el 3D es de Plus y Enterprise, que tienen IA; igual se respeta tieneIA.
  const notasVoz = tieneIA ? registros.notasVoz.filter((x) => incluyePieza(x.piezas, fdi)) : [];
  const fotos = registros.fotografias.filter((x) => incluyePieza(x.pieza, fdi));
  const estudios = registros.estudios.filter((x) => incluyePieza(x.pieza, fdi));
  const hallazgosRX = rx.analisis
    .filter((a) => a.pacienteId === pacienteId)
    .flatMap((a) =>
      a.hallazgos
        .filter((h) => h.pieza === String(fdi) && h.estado !== "Descartado")
        .map((h) => ({ ...h, fecha: a.fecha, profesional: a.profesional, estudio: a.tipoEstudio })),
    );

  const auditar = (accion: string) =>
    cambiarRegistro(pacienteId, "auditoria", (prev) => [
      { id: siguienteId(prev), usuario: profesional, accion, fecha: hoy(), hora: ahora() },
      ...prev,
    ]);

  const contar: Record<Pestana, number> = {
    resumen: diagnosticos.length,
    tratamientos: tratamientos.length,
    notas: notas.length + notasVoz.length,
    imagenes: fotos.length,
    estudios: estudios.length + hallazgosRX.length,
    historial: 0,
  };

  const comun = { pacienteId, fdi, profesional, onToast, auditar };

  return (
    <div className="card-grad flex h-full flex-col overflow-hidden">
      <div className="h-1 shrink-0 bg-gradient-to-r from-primary via-primary/60 to-primary/20" />

      {/* Identificación de la pieza */}
      <div className="shrink-0 border-b border-primary/10 p-4">
        <div className="flex items-center gap-3">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-xl font-bold text-primary-foreground shadow-[0_10px_22px_-12px_rgba(124,58,237,0.9)]">
            {fdi}
          </span>
          <div className="min-w-0 flex-1">
            <p className={ETIQUETA}>Pieza {fdi} · FDI</p>
            <p className="truncate text-base font-bold text-foreground">{def.name}</p>
            <p className="text-xs text-muted-foreground">
              {def.arch === "upper" ? "Arcada superior" : "Arcada inferior"} ·{" "}
              {def.side === "right" ? "derecha" : "izquierda"}
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border/70 bg-background px-2.5 py-1 text-[11px] font-semibold text-foreground">
            <span
              className="size-2.5 rounded-full ring-1 ring-black/10"
              style={{ backgroundColor: TOOTH_STATE_META[estado].color }}
            />
            {TOOTH_STATE_META[estado].label}
          </span>
        </div>

        <div
          className="mt-3 grid grid-cols-3 gap-1"
          role="tablist"
          aria-label={`Ficha de la pieza ${fdi}`}
        >
          {PESTANAS.map(({ id, label, icon: I }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={pestana === id}
              onClick={() => setPestana(id)}
              className={`inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-2 py-1.5 text-[11px] font-semibold transition-all ${
                pestana === id
                  ? "bg-primary text-primary-foreground shadow-[0_8px_18px_-10px_rgba(124,58,237,0.8)]"
                  : "text-muted-foreground hover:bg-primary/[0.06] hover:text-foreground"
              }`}
            >
              <I className="size-3.5" />
              {label}
              {contar[id] > 0 && (
                <span
                  className={`rounded-full px-1.5 text-[10px] ${pestana === id ? "bg-white/25" : "bg-primary/10 text-primary"}`}
                >
                  {contar[id]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {pestana === "resumen" && (
          <SeccionEstado
            {...comun}
            estado={estado}
            diagnosticos={diagnosticos}
            onSetEstado={onSetEstado}
            ultimaNota={notas[0]}
            tratamientoActivo={tratamientos.find(
              (t) => !["Completado", "Finalizado", "Cancelado"].includes(t.estado),
            )}
            onIr={setPestana}
          />
        )}
        {pestana === "tratamientos" && (
          <SeccionTratamientos
            {...comun}
            def={def}
            estado={estado}
            tratamientos={tratamientos}
            onSimularSonrisa={() => onIrHerramienta("sonrisa")}
            tieneIA={tieneIA}
          />
        )}
        {pestana === "notas" && (
          <SeccionNotas {...comun} notas={notas} notasVoz={notasVoz} conVoz={tieneIA} />
        )}
        {pestana === "imagenes" && <SeccionImagenes {...comun} fotos={fotos} />}
        {pestana === "estudios" && (
          <SeccionEstudios
            {...comun}
            estudios={estudios}
            hallazgos={hallazgosRX}
            tieneIA={tieneIA}
            onAnalizar={() => onIrHerramienta("rayosx")}
          />
        )}
        {pestana === "historial" && (
          <SeccionHistorial
            fdi={fdi}
            clavePaciente={clavePaciente}
            diagnosticos={diagnosticos}
            tratamientos={tratamientos}
            notas={notas}
            fotos={fotos}
            estudios={estudios}
            hallazgos={hallazgosRX}
          />
        )}
      </div>

      <p className="shrink-0 border-t border-primary/10 px-4 py-2 text-[10.5px] text-muted-foreground">
        Se guarda en la Historia Clínica del paciente · Pieza {fdi}
      </p>
    </div>
  );
}

/* ───────────── Piezas de la ficha ───────────── */

type Comun = {
  pacienteId: number;
  fdi: number;
  profesional: string;
  onToast: (msg: string) => void;
  auditar: (accion: string) => void;
};

function Titulo({ children, accion }: { children: ReactNode; accion?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <p className="text-xs font-bold text-foreground">{children}</p>
      {accion}
    </div>
  );
}

function Vacio({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-2xl border border-dashed border-primary/20 bg-primary/[0.025] px-3 py-4 text-center text-xs text-muted-foreground">
      {children}
    </p>
  );
}

function Meta({
  fecha,
  profesional,
  extra,
}: {
  fecha: string;
  profesional?: string;
  extra?: string;
}) {
  return (
    <p className="text-[10.5px] text-muted-foreground">
      {fechaCorta(fecha)}
      {extra ? ` · ${extra}` : ""}
      {profesional ? ` · ${profesional}` : ""}
    </p>
  );
}

function BotonAgregar({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="btn-ce-outline !px-2.5 !py-1 !text-[11px]">
      <Plus className="size-3" />
      {children}
    </button>
  );
}

function SeccionEstado({
  pacienteId,
  fdi,
  profesional,
  onToast,
  auditar,
  estado,
  diagnosticos,
  onSetEstado,
  ultimaNota,
  tratamientoActivo,
  onIr,
}: Comun & {
  estado: ToothState;
  diagnosticos: Registros["diagnosticos"];
  onSetEstado: (fdi: number, estado: ToothState) => void;
  ultimaNota: Nota | undefined;
  tratamientoActivo: Tratamiento | undefined;
  onIr: (p: Pestana) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");

  const guardar = () => {
    if (!titulo.trim()) return onToast("Escribí el diagnóstico");
    cambiarRegistro(pacienteId, "diagnosticos", (prev) => [
      {
        id: siguienteId(prev),
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        pieza: String(fdi),
        profesional,
        observacion: "",
        estado: "Activo",
        fecha: hoy(),
      },
      ...prev,
    ]);
    auditar(`Diagnóstico en pieza ${fdi}: ${titulo.trim()}`);
    setTitulo("");
    setDescripcion("");
    setAbierto(false);
    onToast(`Diagnóstico guardado en la pieza ${fdi}`);
  };

  const alternar = (id: number) =>
    cambiarRegistro(pacienteId, "diagnosticos", (prev) =>
      prev.map((d) =>
        d.id === id ? { ...d, estado: d.estado === "Activo" ? "Resuelto" : "Activo" } : d,
      ),
    );

  return (
    <>
      <div>
        <p className={ETIQUETA}>Estado de la pieza</p>
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          {TOOTH_STATES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onSetEstado(fdi, s)}
              className={`flex items-center gap-1.5 rounded-xl border px-2 py-2 text-[11px] font-semibold transition ${
                estado === s
                  ? "border-primary bg-primary text-primary-foreground shadow-[0_8px_18px_-12px_rgba(124,58,237,0.9)]"
                  : "border-border bg-background text-foreground hover:border-primary/40"
              }`}
            >
              <span
                className="size-2.5 shrink-0 rounded-full ring-1 ring-black/10"
                style={{ backgroundColor: TOOTH_STATE_META[s].color }}
              />
              {TOOTH_STATE_META[s].label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onIr("tratamientos")}
          className={`${ITEM} text-left transition hover:border-primary/40`}
        >
          <p className={ETIQUETA}>Tratamiento</p>
          <p className="mt-1 line-clamp-2 text-xs font-semibold text-foreground">
            {tratamientoActivo
              ? `${tratamientoActivo.nombre} · ${tratamientoActivo.estado}`
              : "Sin tratamiento activo"}
          </p>
        </button>
        <button
          type="button"
          onClick={() => onIr("notas")}
          className={`${ITEM} text-left transition hover:border-primary/40`}
        >
          <p className={ETIQUETA}>Última nota</p>
          <p className="mt-1 line-clamp-2 text-xs font-semibold text-foreground">
            {ultimaNota ? ultimaNota.diagnostico || ultimaNota.motivoConsulta : "Sin notas"}
          </p>
        </button>
      </div>

      <Titulo
        accion={
          !abierto && <BotonAgregar onClick={() => setAbierto(true)}>Diagnóstico</BotonAgregar>
        }
      >
        Diagnósticos de la pieza
      </Titulo>

      {abierto && (
        <div className={`${ITEM} space-y-2`}>
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ej.: Caries oclusal, fractura, movilidad…"
            className={INPUT}
          />
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            rows={2}
            placeholder="Descripción y superficies afectadas"
            className={`${INPUT} resize-none`}
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn-ce-outline !py-1 !text-[11px]"
              onClick={() => setAbierto(false)}
            >
              Cancelar
            </button>
            <button type="button" className="btn-ce !py-1 !text-[11px]" onClick={guardar}>
              Guardar diagnóstico
            </button>
          </div>
        </div>
      )}

      {diagnosticos.length === 0 ? (
        <Vacio>Sin diagnósticos registrados para la pieza {fdi}.</Vacio>
      ) : (
        diagnosticos.map((d) => (
          <div key={d.id} className={ITEM}>
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-bold text-foreground">{d.titulo}</p>
              <button
                type="button"
                onClick={() => alternar(d.id)}
                title="Cambiar estado"
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  d.estado === "Activo"
                    ? "bg-amber-500/12 text-amber-700 dark:text-amber-300"
                    : "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
                }`}
              >
                {d.estado}
              </button>
            </div>
            {d.descripcion && (
              <p className="mt-1 text-xs leading-relaxed text-foreground/80">{d.descripcion}</p>
            )}
            {d.observacion && (
              <p className="mt-1 text-[11px] text-muted-foreground">{d.observacion}</p>
            )}
            <div className="mt-1.5">
              <Meta fecha={d.fecha} profesional={d.profesional} />
            </div>
          </div>
        ))
      )}
    </>
  );
}

/* Diente simplificado para la simulación orientativa (antes / después del tratamiento). */
function DienteSimulado({
  estado,
  kind,
  label,
}: {
  estado: ToothState;
  kind: ToothDef["kind"];
  label: string;
}) {
  const color = TOOTH_STATE_META[estado].color;
  const corona =
    kind === "molar"
      ? "M10 10 Q14 2 22 6 Q30 2 34 6 Q42 2 46 10 Q50 26 44 40 L12 40 Q6 26 10 10 Z"
      : kind === "premolar"
        ? "M14 10 Q22 0 28 6 Q34 0 42 10 Q46 26 41 40 L15 40 Q10 26 14 10 Z"
        : "M18 6 Q28 0 38 6 Q42 24 38 40 L18 40 Q14 24 18 6 Z";
  const raices =
    kind === "molar"
      ? "M14 40 Q14 62 20 76 L24 76 Q24 56 26 40 M30 40 Q32 56 32 76 L36 76 Q42 62 42 40"
      : "M20 40 Q22 64 26 80 L30 80 Q34 64 36 40";
  return (
    <div className="flex flex-col items-center gap-1">
      <svg viewBox="0 0 56 84" className="h-24 w-16" aria-hidden>
        {estado !== "ausente" ? (
          <>
            <path d={raices} fill="#efe6d2" stroke="#b9ab8f" strokeWidth="1.2" />
            {estado === "endodoncia" && (
              <path d="M28 18 L28 76" stroke="#c0512f" strokeWidth="2.4" strokeLinecap="round" />
            )}
            <path
              d={corona}
              fill={estado === "caries" ? "#f2ead9" : color}
              stroke="#a8977a"
              strokeWidth="1.4"
            />
            {estado === "caries" && <circle cx="28" cy="14" r="5" fill={color} />}
            {estado === "tratado" && (
              <rect x="21" y="8" width="14" height="8" rx="3" fill="#3f9fd4" opacity="0.9" />
            )}
          </>
        ) : (
          <path d={corona} fill="none" stroke="#8a8f98" strokeWidth="1.4" strokeDasharray="3 3" />
        )}
      </svg>
      <span className="text-[10px] font-semibold text-muted-foreground">{label}</span>
      <span className="text-[11px] font-bold text-foreground">
        {TOOTH_STATE_META[estado].label}
      </span>
    </div>
  );
}

function SeccionTratamientos({
  pacienteId,
  fdi,
  profesional,
  onToast,
  auditar,
  def,
  estado,
  tratamientos,
  onSimularSonrisa,
  tieneIA,
}: Comun & {
  def: ToothDef;
  estado: ToothState;
  tratamientos: Tratamiento[];
  onSimularSonrisa: () => void;
  tieneIA: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState("Restauración");
  const [estadoNuevo, setEstadoNuevo] = useState<EstadoTratamiento>("Planificado");
  const [notas, setNotas] = useState("");

  const opciones = PLANNED_TREATMENTS.filter((t) => t !== "ninguno").map(
    (t) => PLANNED_TREATMENT_META[t].label,
  );
  const activo = tratamientos.find(
    (t) => !["Completado", "Finalizado", "Cancelado"].includes(t.estado),
  );
  const despues = activo ? (RESULTADO_TRATAMIENTO[activo.nombre] ?? estado) : estado;

  const guardar = () => {
    cambiarRegistro(pacienteId, "tratamientos", (prev) => [
      {
        id: siguienteId(prev),
        nombre,
        pieza: String(fdi),
        estado: estadoNuevo,
        profesional,
        inicio: hoy(),
        notas: notas.trim(),
        prioridad: "Media",
        sesionesPlan: 1,
        sesiones: [],
        historial: [{ estado: estadoNuevo, fecha: hoy() }],
      },
      ...prev,
    ]);
    auditar(`Tratamiento en pieza ${fdi}: ${nombre} (${estadoNuevo})`);
    setNotas("");
    setAbierto(false);
    onToast(`${nombre} agregado a la pieza ${fdi}`);
  };

  const cambiarEstado = (id: number, e: EstadoTratamiento) => {
    cambiarRegistro(pacienteId, "tratamientos", (prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              estado: e,
              ...(e === "Completado" ? { fin: hoy() } : {}),
              historial: [...(t.historial ?? []), { estado: e, fecha: hoy() }],
            }
          : t,
      ),
    );
    auditar(`Pieza ${fdi}: tratamiento ${e.toLowerCase()}`);
  };

  return (
    <>
      <Titulo
        accion={
          !abierto && <BotonAgregar onClick={() => setAbierto(true)}>Tratamiento</BotonAgregar>
        }
      >
        Tratamientos de la pieza
      </Titulo>

      {abierto && (
        <div className={`${ITEM} space-y-2`}>
          <div className="flex flex-wrap gap-1">
            {opciones.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => setNombre(o)}
                className={`rounded-lg border px-2 py-1 text-[11px] font-medium ${nombre === o ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:border-primary/40"}`}
              >
                {o}
              </button>
            ))}
          </div>
          <select
            value={estadoNuevo}
            onChange={(e) => setEstadoNuevo(e.target.value as EstadoTratamiento)}
            className={INPUT}
          >
            {ESTADOS_TRAT.map((e) => (
              <option key={e}>{e}</option>
            ))}
          </select>
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            rows={2}
            placeholder="Detalle: material, superficies, sesiones…"
            className={`${INPUT} resize-none`}
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn-ce-outline !py-1 !text-[11px]"
              onClick={() => setAbierto(false)}
            >
              Cancelar
            </button>
            <button type="button" className="btn-ce !py-1 !text-[11px]" onClick={guardar}>
              Guardar tratamiento
            </button>
          </div>
        </div>
      )}

      {tratamientos.length === 0 ? (
        <Vacio>Sin tratamientos para la pieza {fdi}.</Vacio>
      ) : (
        tratamientos.map((t) => (
          <div key={t.id} className={ITEM}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold text-foreground">{t.nombre}</p>
              <select
                value={t.estado}
                onChange={(e) => cambiarEstado(t.id, e.target.value as EstadoTratamiento)}
                className="rounded-lg border border-primary/20 bg-primary/[0.06] px-2 py-0.5 text-[10.5px] font-semibold text-primary outline-none"
              >
                {[...new Set([...ESTADOS_TRAT, t.estado])].map((e) => (
                  <option key={e}>{e}</option>
                ))}
              </select>
            </div>
            {(t.notas || t.diagnostico) && (
              <p className="mt-1 text-xs leading-relaxed text-foreground/80">
                {t.notas || t.diagnostico}
              </p>
            )}
            <div className="mt-1.5">
              <Meta fecha={t.inicio} profesional={t.profesional} />
            </div>
          </div>
        ))
      )}

      {/* Simulación visual orientativa */}
      <div className="rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/[0.06] via-card to-card p-3">
        <Titulo>
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-primary" />
            Simulación orientativa
          </span>
        </Titulo>
        <div className="mt-2 flex items-center justify-center gap-4">
          <DienteSimulado estado={estado} kind={def.kind} label="Actual" />
          <span className="text-lg text-primary/50">→</span>
          <DienteSimulado
            estado={despues}
            kind={def.kind}
            label={activo ? `Tras ${activo.nombre.toLowerCase()}` : "Sin cambios"}
          />
        </div>
        <p className="mt-2 text-[10.5px] leading-snug text-muted-foreground">
          Representación ilustrativa para explicar el tratamiento al paciente. No es un resultado
          garantizado.
        </p>
        <button
          type="button"
          onClick={onSimularSonrisa}
          className="btn-ce-outline mt-2 w-full justify-center !py-1.5 !text-[11px]"
        >
          <Smile className="size-3.5" />
          {tieneIA ? "Simular sonrisa completa con foto" : "Simulador de sonrisa (requiere IA)"}
        </button>
      </div>
    </>
  );
}

const NOTA_VACIA = {
  motivoConsulta: "",
  diagnostico: "",
  procedimiento: "",
  evolucion: "",
  indicaciones: "",
  observaciones: "",
};

function SeccionNotas({
  pacienteId,
  fdi,
  profesional,
  onToast,
  auditar,
  notas,
  notasVoz,
  conVoz,
}: Comun & { notas: Nota[]; notasVoz: NotaVoz[]; conVoz: boolean }) {
  const [editando, setEditando] = useState<number | "nueva" | null>(null);
  const [grabando, setGrabando] = useState(false);
  const [form, setForm] = useState(NOTA_VACIA);

  const abrir = (n?: Nota) => {
    setEditando(n ? n.id : "nueva");
    setForm(
      n
        ? {
            motivoConsulta: n.motivoConsulta,
            diagnostico: n.diagnostico,
            procedimiento: n.procedimiento,
            evolucion: n.evolucion,
            indicaciones: n.indicaciones,
            observaciones: n.observaciones,
          }
        : NOTA_VACIA,
    );
  };

  const guardar = () => {
    if (!form.motivoConsulta.trim() && !form.diagnostico.trim() && !form.procedimiento.trim())
      return onToast("Completá al menos el motivo, el diagnóstico o el procedimiento");
    if (editando === "nueva") {
      cambiarRegistro(pacienteId, "notasClinicas", (prev) => [
        {
          id: siguienteId(prev),
          fecha: hoy(),
          hora: ahora(),
          profesional,
          anamnesis: "",
          proximoControl: "",
          piezas: String(fdi),
          tratamientoId: null,
          fotografiaIds: [],
          estudioIds: [],
          recetaId: null,
          odontogramaRef: `Pieza ${fdi}`,
          odontograma3DRef: `Pieza ${fdi}`,
          ...form,
        },
        ...prev,
      ]);
      auditar(`Nota clínica en pieza ${fdi}`);
      onToast(`Nota guardada en la pieza ${fdi}`);
    } else if (editando !== null) {
      cambiarRegistro(pacienteId, "notasClinicas", (prev) =>
        prev.map((n) =>
          n.id === editando
            ? { ...n, ...form, observaciones: form.observaciones, evolucion: form.evolucion }
            : n,
        ),
      );
      auditar(`Nota clínica editada (pieza ${fdi})`);
      onToast("Nota actualizada");
    }
    setEditando(null);
  };

  const campos: [keyof typeof NOTA_VACIA, string][] = [
    ["motivoConsulta", "Motivo de consulta"],
    ["diagnostico", "Diagnóstico"],
    ["procedimiento", "Procedimiento realizado"],
    ["evolucion", "Evolución"],
    ["indicaciones", "Indicaciones"],
    ["observaciones", "Observaciones"],
  ];

  return (
    <>
      <Titulo
        accion={
          editando === null &&
          !grabando && (
            <div className="flex shrink-0 gap-1.5">
              {conVoz && (
                <button
                  type="button"
                  onClick={() => setGrabando(true)}
                  className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-lg border border-primary/20 px-2 py-1 text-[11px] font-semibold text-primary transition hover:bg-primary/10"
                >
                  <Mic className="size-3" /> Nota de voz
                </button>
              )}
              <BotonAgregar onClick={() => abrir()}>Nota clínica</BotonAgregar>
            </div>
          )
        }
      >
        Notas clínicas de la pieza
      </Titulo>

      {grabando && (
        <div className="space-y-2">
          <NotaVozRecorder
            profesional={profesional}
            onToast={onToast}
            onSave={(nota) => {
              cambiarRegistro(pacienteId, "notasVoz", (prev) => [
                ...prev,
                { ...nota, id: siguienteId(prev), piezas: String(fdi) },
              ]);
              auditar(`Nota de voz en pieza ${fdi}`);
              onToast(`Nota de voz guardada en la pieza ${fdi}`);
              setGrabando(false);
            }}
          />
          <div className="flex justify-end">
            <button
              type="button"
              className="btn-ce-outline !py-1 !text-[11px]"
              onClick={() => setGrabando(false)}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {notasVoz.map((v) => (
        <div key={`voz-${v.id}`} className={ITEM}>
          <div className="flex items-center gap-2">
            <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <Mic className="size-3.5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-foreground">
                Nota de voz · {v.duracionSegundos}s
              </p>
              <Meta fecha={v.fecha} extra={v.hora} profesional={v.profesional} />
            </div>
          </div>
          <audio controls src={v.audioUrl} className="mt-2 h-9 w-full" />
          <p className="mt-1 text-[10.5px] text-muted-foreground">
            Transcripción: {v.estadoTranscripcion.toLowerCase()}.
          </p>
        </div>
      ))}

      {editando !== null && (
        <div className={`${ITEM} space-y-2`}>
          <p className="text-[10.5px] text-muted-foreground">
            {editando === "nueva"
              ? `${fechaCorta(hoy())} · ${ahora()} · ${profesional}`
              : "Editando nota"}
          </p>
          {campos.map(([k, l]) => (
            <label key={k} className="block">
              <span className={ETIQUETA}>{l}</span>
              <textarea
                value={form[k]}
                onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
                rows={k === "motivoConsulta" || k === "diagnostico" ? 1 : 2}
                className={`${INPUT} mt-1 resize-none`}
              />
            </label>
          ))}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn-ce-outline !py-1 !text-[11px]"
              onClick={() => setEditando(null)}
            >
              Cancelar
            </button>
            <button type="button" className="btn-ce !py-1 !text-[11px]" onClick={guardar}>
              Guardar nota
            </button>
          </div>
        </div>
      )}

      {notas.length === 0
        ? notasVoz.length === 0 && <Vacio>Sin notas clínicas para la pieza {fdi}.</Vacio>
        : notas.map((n) => (
            <div key={n.id} className={ITEM}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground">
                    {n.motivoConsulta || n.diagnostico || "Nota clínica"}
                  </p>
                  <Meta fecha={n.fecha} extra={n.hora} profesional={n.profesional} />
                </div>
                <button
                  type="button"
                  onClick={() => abrir(n)}
                  title="Editar nota"
                  className="grid size-7 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary"
                >
                  <Pencil className="size-3.5" />
                </button>
              </div>
              <dl className="mt-1.5 space-y-1 text-xs">
                {campos.slice(1).map(([k, l]) =>
                  n[k] ? (
                    <div key={k}>
                      <dt className="inline font-semibold text-foreground">{l}: </dt>
                      <dd className="inline text-foreground/80">{n[k]}</dd>
                    </div>
                  ) : null,
                )}
              </dl>
            </div>
          ))}
    </>
  );
}

function Miniatura({ url, nombre }: { url: string; nombre: string }) {
  return url ? (
    <img src={url} alt={nombre} className="h-full w-full object-cover" />
  ) : (
    <div className="grid h-full w-full place-items-center bg-gradient-to-br from-primary/10 to-primary/[0.02] text-primary/60">
      <Camera className="size-5" />
    </div>
  );
}

function SeccionImagenes({
  pacienteId,
  fdi,
  profesional,
  onToast,
  auditar,
  fotos,
}: Comun & { fotos: Registros["fotografias"] }) {
  const input = useRef<HTMLInputElement>(null);
  const [tipo, setTipo] = useState("Antes");
  const [observacion, setObservacion] = useState("");
  const [ver, setVer] = useState<string | null>(null);

  const subir = async (files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) return onToast("Elegí una imagen (JPG o PNG)");
    const url = await leerImagen(f, 1100);
    cambiarRegistro(pacienteId, "fotografias", (prev) => [
      {
        id: siguienteId(prev),
        fecha: hoy(),
        profesional,
        tipo,
        observacion: observacion.trim(),
        tratamientoId: null,
        pieza: String(fdi),
        archivoNombre: f.name,
        url,
      },
      ...prev,
    ]);
    auditar(`Imagen (${tipo}) en pieza ${fdi}`);
    setObservacion("");
    onToast(`Imagen guardada en la pieza ${fdi}`);
  };

  const quitar = (id: number) =>
    cambiarRegistro(pacienteId, "fotografias", (prev) => prev.filter((x) => x.id !== id));

  const antes = fotos.find((f) => f.tipo === "Antes" && f.url);
  const despues = fotos.find((f) => f.tipo === "Después" && f.url);

  return (
    <>
      <div className={`${ITEM} space-y-2`}>
        <Titulo>Agregar imagen de la pieza {fdi}</Titulo>
        <div className="flex flex-wrap gap-1">
          {TIPOS_FOTO.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTipo(t)}
              className={`rounded-lg border px-2 py-1 text-[11px] font-medium ${tipo === t ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:border-primary/40"}`}
            >
              {t}
            </button>
          ))}
        </div>
        <input
          value={observacion}
          onChange={(e) => setObservacion(e.target.value)}
          placeholder="Observación (opcional)"
          className={INPUT}
        />
        <input
          ref={input}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            void subir(e.target.files);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="btn-ce w-full justify-center !py-1.5 !text-[11px]"
        >
          <ImagePlus className="size-3.5" />
          Subir imagen
        </button>
      </div>

      {antes && despues && (
        <div className="rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/[0.06] via-card to-card p-3">
          <Titulo>Antes / Después</Titulo>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {[antes, despues].map((f) => (
              <figure key={f.id} className="overflow-hidden rounded-xl border border-border/70">
                <div className="aspect-[4/3]">
                  <Miniatura url={f.url} nombre={f.archivoNombre} />
                </div>
                <figcaption className="px-2 py-1 text-[10.5px] font-semibold text-foreground">
                  {f.tipo} · {fechaCorta(f.fecha)}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      )}

      {fotos.length === 0 ? (
        <Vacio>Sin imágenes para la pieza {fdi}.</Vacio>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {fotos.map((f) => (
            <div
              key={f.id}
              className="group overflow-hidden rounded-2xl border border-border/70 bg-card"
            >
              <button
                type="button"
                onClick={() => f.url && setVer(f.url)}
                className="block aspect-[4/3] w-full"
              >
                <Miniatura url={f.url} nombre={f.archivoNombre} />
              </button>
              <div className="flex items-start justify-between gap-1 p-2">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-foreground">{f.tipo}</p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {f.observacion || fechaCorta(f.fecha)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => quitar(f.id)}
                  title="Quitar"
                  className="text-muted-foreground opacity-0 transition hover:text-destructive group-hover:opacity-100"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {ver && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-6"
          onClick={() => setVer(null)}
        >
          <img src={ver} alt="" className="max-h-full max-w-full rounded-2xl" />
          <button
            type="button"
            className="absolute right-5 top-5 grid size-9 place-items-center rounded-full bg-white/15 text-white"
          >
            <X className="size-4" />
          </button>
        </div>
      )}
    </>
  );
}

type HallazgoPieza = {
  id: string;
  tipo: keyof typeof TIPOS_RX;
  severidad: string;
  estado: string;
  fecha: string;
  profesional: string;
  estudio: string;
};

function SeccionEstudios({
  pacienteId,
  fdi,
  profesional,
  onToast,
  auditar,
  estudios,
  hallazgos,
  tieneIA,
  onAnalizar,
}: Comun & {
  estudios: Registros["estudios"];
  hallazgos: HallazgoPieza[];
  tieneIA: boolean;
  onAnalizar: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [tipo, setTipo] = useState(TIPOS_ESTUDIO[0] ?? "Radiografía periapical");
  const [fecha, setFecha] = useState(hoy());
  const [observacion, setObservacion] = useState("");
  const [ver, setVer] = useState<string | null>(null);

  const guardar = async (files: FileList | null) => {
    const f = files?.[0];
    let url = "";
    let nombre = "";
    if (f) {
      if (f.type.startsWith("image/")) url = await leerImagen(f, 1400);
      else if (f.type === "application/pdf") {
        if (f.size > 3_000_000) return onToast("El PDF supera 3 MB");
        url = await new Promise<string>((r) => {
          const fr = new FileReader();
          fr.onload = () => r(String(fr.result));
          fr.readAsDataURL(f);
        });
      } else return onToast("Elegí una imagen o un PDF");
      nombre = f.name;
    }
    cambiarRegistro(pacienteId, "estudios", (prev) => [
      {
        id: siguienteId(prev),
        tipo,
        fecha,
        zona: "",
        solicitante: profesional,
        profesional,
        diagnostico: "",
        observaciones: observacion.trim(),
        pieza: String(fdi),
        archivoNombre: nombre,
        url,
        estadoInforme: observacion.trim() ? "Informado" : "Sin informar",
        tratamientoId: null,
      },
      ...prev,
    ]);
    auditar(`${tipo} en pieza ${fdi}`);
    setObservacion("");
    onToast(`${tipo} guardada en la pieza ${fdi}`);
  };

  return (
    <>
      <div className={`${ITEM} space-y-2`}>
        <Titulo>Registrar estudio de la pieza {fdi}</Titulo>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={INPUT}>
            {TIPOS_ESTUDIO.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className={`${INPUT} w-[8.5rem]`}
          />
        </div>
        <textarea
          value={observacion}
          onChange={(e) => setObservacion(e.target.value)}
          rows={2}
          placeholder="Observación / informe"
          className={`${INPUT} resize-none`}
        />
        <input
          ref={input}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={(e) => {
            void guardar(e.target.files);
            e.target.value = "";
          }}
        />
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="btn-ce justify-center !py-1.5 !text-[11px]"
          >
            <Upload className="size-3.5" />
            Adjuntar archivo
          </button>
          <button
            type="button"
            onClick={() => void guardar(null)}
            className="btn-ce-outline justify-center !py-1.5 !text-[11px]"
          >
            Guardar sin archivo
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/[0.06] via-card to-card p-3">
        <Titulo
          accion={
            <button
              type="button"
              onClick={onAnalizar}
              className="btn-ce-outline !px-2.5 !py-1 !text-[11px]"
            >
              <ScanSearch className="size-3" />
              {tieneIA ? "Analizar panorámica" : "Rayos X IA"}
            </button>
          }
        >
          Hallazgos de Rayos X en la pieza
        </Titulo>
        {hallazgos.length === 0 ? (
          <p className="mt-2 text-[11px] text-muted-foreground">
            Sin hallazgos para la pieza {fdi}. Los hallazgos del análisis de radiografías se asocian
            solos a cada pieza.
          </p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {hallazgos.map((h) => (
              <li
                key={h.id}
                className="flex items-center gap-2 rounded-xl bg-card/80 px-2.5 py-1.5 text-xs"
              >
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: TIPOS_RX[h.tipo].color }}
                />
                <span className="min-w-0 flex-1">
                  <b className="text-foreground">{TIPOS_RX[h.tipo].nombre}</b>{" "}
                  <span className="text-muted-foreground">
                    · {h.severidad} · {h.estado}
                  </span>
                </span>
                <span className="shrink-0 text-[10px] text-muted-foreground">
                  {fechaCorta(h.fecha)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {estudios.length === 0 ? (
        <Vacio>Sin radiografías ni estudios para la pieza {fdi}.</Vacio>
      ) : (
        estudios.map((e) => (
          <div key={e.id} className={`${ITEM} flex gap-3`}>
            <button
              type="button"
              onClick={() => e.url && !e.url.startsWith("data:application/pdf") && setVer(e.url)}
              className="size-16 shrink-0 overflow-hidden rounded-xl border border-border/70 bg-slate-900"
            >
              {e.url && !e.url.startsWith("data:application/pdf") ? (
                <img src={e.url} alt={e.tipo} className="h-full w-full object-cover" />
              ) : (
                <span className="grid h-full w-full place-items-center text-white/60">
                  {e.url ? <FileText className="size-5" /> : <ScanSearch className="size-5" />}
                </span>
              )}
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-xs font-bold text-foreground">{e.tipo}</p>
                <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  {e.estadoInforme}
                </span>
              </div>
              <p className="mt-0.5 line-clamp-2 text-[11px] text-foreground/80">
                {e.diagnostico || e.observaciones || "Sin observaciones"}
              </p>
              <Meta fecha={e.fecha} profesional={e.profesional ?? e.solicitante} />
              {e.url.startsWith("data:application/pdf") && (
                <a
                  href={e.url}
                  download={e.archivoNombre || "estudio.pdf"}
                  className="text-[11px] font-semibold text-primary"
                >
                  Descargar PDF
                </a>
              )}
            </div>
          </div>
        ))
      )}

      {ver && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-6"
          onClick={() => setVer(null)}
        >
          <img src={ver} alt="" className="max-h-full max-w-full rounded-2xl" />
        </div>
      )}
    </>
  );
}

type Evento = {
  id: string;
  fecha: string;
  tipo: string;
  titulo: string;
  detalle?: string;
  color: string;
};

function SeccionHistorial({
  fdi,
  clavePaciente,
  diagnosticos,
  tratamientos,
  notas,
  fotos,
  estudios,
  hallazgos,
}: {
  fdi: number;
  clavePaciente: string;
  diagnosticos: Registros["diagnosticos"];
  tratamientos: Tratamiento[];
  notas: Nota[];
  fotos: Registros["fotografias"];
  estudios: Registros["estudios"];
  hallazgos: HallazgoPieza[];
}) {
  const eventos: Evento[] = [
    ...cargarHistorial(clavePaciente)
      .filter((h) => h.fdi === fdi)
      .map((h) => ({
        id: `e-${h.id}`,
        fecha: h.fecha,
        tipo: "Estado",
        titulo: `${TOOTH_STATE_META[h.estadoAnterior].label} → ${TOOTH_STATE_META[h.estadoNuevo].label}`,
        color: TOOTH_STATE_META[h.estadoNuevo].color,
      })),
    ...diagnosticos.map((d) => ({
      id: `d-${d.id}`,
      fecha: d.fecha,
      tipo: "Diagnóstico",
      titulo: d.titulo,
      detalle: d.profesional,
      color: "#eda100",
    })),
    ...tratamientos.flatMap((t) =>
      (t.historial?.length ? t.historial : [{ estado: t.estado, fecha: t.inicio }]).map((h, i) => ({
        id: `t-${t.id}-${i}`,
        fecha: h.fecha,
        tipo: "Tratamiento",
        titulo: `${t.nombre} · ${h.estado}`,
        detalle: t.profesional,
        color: "#7c3aed",
      })),
    ),
    ...notas.map((n) => ({
      id: `n-${n.id}`,
      fecha: `${n.fecha}T${n.hora || "12:00"}`,
      tipo: "Nota clínica",
      titulo: n.motivoConsulta || n.diagnostico || "Nota clínica",
      detalle: `${n.hora} · ${n.profesional}`,
      color: "#2a78d6",
    })),
    ...fotos.map((f) => ({
      id: `f-${f.id}`,
      fecha: f.fecha,
      tipo: "Imagen",
      titulo: `Foto ${f.tipo.toLowerCase()}`,
      detalle: f.profesional,
      color: "#1baf7a",
    })),
    ...estudios.map((e) => ({
      id: `s-${e.id}`,
      fecha: e.fecha,
      tipo: "Estudio",
      titulo: e.tipo,
      detalle: e.profesional ?? e.solicitante,
      color: "#64748b",
    })),
    ...hallazgos.map((h) => ({
      id: `h-${h.id}`,
      fecha: h.fecha,
      tipo: "Rayos X",
      titulo: TIPOS_RX[h.tipo].nombre,
      detalle: `${h.severidad} · ${h.profesional}`,
      color: TIPOS_RX[h.tipo].color,
    })),
  ].sort((a, b) => (b.fecha > a.fecha ? 1 : -1));

  if (eventos.length === 0)
    return <Vacio>Todavía no hay evolución registrada para la pieza {fdi}.</Vacio>;

  return (
    <ol className="relative space-y-2 border-l-2 border-primary/15 pl-4">
      {eventos.map((e) => (
        <li key={e.id} className="relative">
          <span
            className="absolute -left-[23px] top-3 size-3 rounded-full border-2 border-card"
            style={{ backgroundColor: e.color }}
          />
          <div className={ITEM}>
            <div className="flex items-center justify-between gap-2">
              <span className="rounded-full bg-primary/[0.08] px-2 py-0.5 text-[10px] font-semibold text-primary">
                {e.tipo}
              </span>
              <span className="text-[10.5px] text-muted-foreground">{fechaCorta(e.fecha)}</span>
            </div>
            <p className="mt-1 text-xs font-semibold text-foreground">{e.titulo}</p>
            {e.detalle && <p className="text-[10.5px] text-muted-foreground">{e.detalle}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
