import { useState } from "react";
import {
  ClipboardList,
  FileText,
  History,
  Lightbulb,
  Loader2,
  Mic,
  MicOff,
  ScanSearch,
  Search,
  Send,
  Smile,
  Sparkles,
  Stethoscope,
  BarChart3,
  Check,
  X,
} from "lucide-react";
import { askEsther, type EstherSection } from "@/lib/cloud-esther/esther-ai";
import type { Bloque } from "@/lib/cloud-esther/esther-motor";
import type { PlanId } from "@/lib/cloud-esther/data";
import { EstherBloques } from "@/components/cloud-esther/esther-ai/EstherBloques";
import { useMicrofono } from "@/components/cloud-esther/esther-ai/microfono";
import {
  cambiarRegistro,
  useRegistrosPacientes,
} from "@/components/cloud-esther/PacienteSecciones";
import { storeRayosX, TIPOS_RX } from "@/lib/cloud-esther/rayos-x";
import { TEETH_BY_FDI, TOOTH_STATE_META, type ToothState } from "@/lib/odontogram/fdi";

/* Ubicación: src/components/cloud-esther/odontograma3d/EstherOdontograma.tsx
   Esther IA dentro del Odontograma 3D. Las 8 funciones trabajan con el contexto de la pieza
   seleccionada y del paciente, siempre con los datos de esta clínica.
   Motor: el motor local de Cloud Esther (reglas sobre los registros del paciente). No se envía
   información a servicios externos. TODO backend: modelo de lenguaje clínico conectado. */

type Herramienta = "rayosx" | "sonrisa";

type Props = {
  pacienteId: number;
  fdi: number | null;
  chart: Record<number, ToothState>;
  plan: PlanId;
  profesional: string;
  onToast: (msg: string) => void;
  onIrHerramienta: (h: Herramienta) => void;
};

type Resultado = { titulo: string; texto: string; bloques?: Bloque[]; editable?: boolean };

const incluye = (campo: string | undefined, fdi: number) =>
  (campo ?? "").split(/[^0-9]+/).includes(String(fdi));

export function EstherOdontograma({
  pacienteId,
  fdi,
  chart,
  plan,
  profesional,
  onToast,
  onIrHerramienta,
}: Props) {
  const registros = useRegistrosPacientes().de(pacienteId);
  const rx = storeRayosX.usar();
  const [pregunta, setPregunta] = useState("");
  const [cargando, setCargando] = useState<string | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [borrador, setBorrador] = useState("");
  const [descartadas, setDescartadas] = useState<string[]>([]);
  const nombrePieza = fdi ? `pieza ${fdi} (${TEETH_BY_FDI[fdi]?.name ?? ""})` : null;

  const consultar = async (
    titulo: string,
    texto: string,
    section: EstherSection,
    editable = false,
  ) => {
    setCargando(titulo);
    try {
      const r = await askEsther(texto, {
        section,
        plan,
        rol: "odontologo",
        usuario: profesional,
        pacienteId,
      });
      setResultado({
        titulo,
        texto: r.text,
        ...(r.bloques ? { bloques: r.bloques } : {}),
        editable,
      });
      if (editable) setBorrador(textoPlano(r.text, r.bloques));
    } finally {
      setCargando(null);
    }
  };

  const microfono = useMicrofono({
    onTexto: (t) => {
      setPregunta(t);
      void consultar("Consulta por voz", t, "paciente");
    },
  });

  /* ───── Funciones locales con contexto de la pieza ───── */

  const datosPieza = (n: number) => {
    const hallazgos = rx.analisis
      .filter((a) => a.pacienteId === pacienteId)
      .flatMap((a) =>
        a.hallazgos.filter((h) => h.pieza === String(n) && h.estado !== "Descartado"),
      );
    return {
      estado: chart[n] ?? "sano",
      diagnosticos: registros.diagnosticos.filter((d) => incluye(d.pieza, n)),
      tratamientos: registros.tratamientos.filter((t) => incluye(t.pieza, n)),
      notas: registros.notasClinicas.filter((x) => incluye(x.piezas, n)),
      estudios: registros.estudios.filter((e) => incluye(e.pieza, n)),
      fotos: registros.fotografias.filter((f) => incluye(f.pieza, n)),
      hallazgos,
    };
  };

  const analizarPieza = () => {
    if (!fdi) return onToast("Seleccioná una pieza en el modelo 3D");
    const d = datosPieza(fdi);
    const lineas = [
      `Estado registrado: ${TOOTH_STATE_META[d.estado].label}.`,
      d.diagnosticos.length
        ? `Diagnósticos: ${d.diagnosticos.map((x) => `${x.titulo} (${x.estado.toLowerCase()})`).join("; ")}.`
        : "Sin diagnósticos cargados.",
      d.tratamientos.length
        ? `Tratamientos: ${d.tratamientos.map((t) => `${t.nombre} · ${t.estado}`).join("; ")}.`
        : "Sin tratamientos cargados.",
      d.hallazgos.length
        ? `Rayos X: ${d.hallazgos.map((h) => `${TIPOS_RX[h.tipo].nombre} (${h.severidad.toLowerCase()})`).join("; ")}.`
        : "Sin hallazgos de rayos X para esta pieza.",
      `${d.notas.length} notas, ${d.fotos.length} imágenes y ${d.estudios.length} estudios asociados.`,
    ];
    setResultado({
      titulo: `Análisis asistido · ${nombrePieza}`,
      texto: lineas.join("\n"),
      bloques: [
        {
          tipo: "aviso",
          texto: "Asistencia para el profesional: no es un diagnóstico definitivo.",
        },
      ],
    });
  };

  const revisarOdontograma = () => {
    const piezas = Object.entries(chart).filter(([, e]) => e !== "sano");
    const por = new Map<ToothState, number[]>();
    piezas.forEach(([n, e]) => por.set(e, [...(por.get(e) ?? []), Number(n)]));
    setResultado({
      titulo: "Revisión del odontograma",
      texto: piezas.length
        ? `${piezas.length} piezas con hallazgos y ${32 - piezas.length} sanas.`
        : "Todas las piezas están registradas como sanas.",
      bloques: [
        {
          tipo: "lista",
          titulo: "Por estado",
          items: [...por.entries()].map(([e, ns]) => ({
            texto: `${TOOTH_STATE_META[e].label}: ${ns.sort((a, b) => a - b).join(", ")}`,
            tono: e === "caries" ? ("alerta" as const) : ("info" as const),
          })),
        },
      ],
    });
  };

  /* Observaciones y recomendaciones de apoyo (el profesional acepta, edita o descarta). */
  const sugerencias = (() => {
    if (!fdi) return [];
    const d = datosPieza(fdi);
    const s: string[] = [];
    if (
      d.estado === "caries" &&
      !d.tratamientos.some((t) => !["Completado", "Finalizado", "Cancelado"].includes(t.estado))
    )
      s.push(
        `Pieza ${fdi} con caries sin tratamiento activo: evaluar restauración y registrar el plan.`,
      );
    if (d.estado === "endodoncia" && !d.tratamientos.some((t) => /corona/i.test(t.nombre)))
      s.push(`Pieza ${fdi} con endodoncia: considerar protección con corona.`);
    if (d.hallazgos.some((h) => h.tipo === "periapical"))
      s.push(
        `Imagen periapical en la pieza ${fdi}: correlacionar con vitalidad pulpar y síntomas.`,
      );
    if (d.diagnosticos.some((x) => x.estado === "Activo") && d.estudios.length === 0)
      s.push(
        `Diagnóstico activo sin estudios: valorar una radiografía periapical de la pieza ${fdi}.`,
      );
    if (d.notas.length === 0)
      s.push(`Todavía no hay notas clínicas de la pieza ${fdi}: registrar la evaluación.`);
    return s.filter((x) => !descartadas.includes(x));
  })();

  const aceptarSugerencia = (texto: string) => {
    if (!fdi) return;
    const hoy = new Date();
    cambiarRegistro(pacienteId, "notasClinicas", (prev) => [
      {
        id: Math.max(0, ...prev.map((n) => n.id)) + 1,
        fecha: hoy.toISOString().slice(0, 10),
        hora: hoy.toTimeString().slice(0, 5),
        profesional,
        motivoConsulta: "Observación asistida (revisada por el profesional)",
        anamnesis: "",
        diagnostico: "",
        procedimiento: "",
        evolucion: "",
        indicaciones: "",
        proximoControl: "",
        observaciones: texto,
        piezas: String(fdi),
        tratamientoId: null,
        fotografiaIds: [],
        estudioIds: [],
        recetaId: null,
        odontogramaRef: `Pieza ${fdi}`,
        odontograma3DRef: `Pieza ${fdi}`,
      },
      ...prev,
    ]);
    setDescartadas((x) => [...x, texto]);
    onToast(`Observación guardada en la pieza ${fdi}`);
  };

  const guardarInforme = () => {
    if (!borrador.trim()) return;
    const hoy = new Date();
    cambiarRegistro(pacienteId, "notasClinicas", (prev) => [
      {
        id: Math.max(0, ...prev.map((n) => n.id)) + 1,
        fecha: hoy.toISOString().slice(0, 10),
        hora: hoy.toTimeString().slice(0, 5),
        profesional,
        motivoConsulta: "Informe clínico (borrador asistido, revisado)",
        anamnesis: "",
        diagnostico: "",
        procedimiento: "",
        evolucion: "",
        indicaciones: "",
        proximoControl: "",
        observaciones: borrador.trim(),
        piezas: fdi ? String(fdi) : "",
        tratamientoId: null,
        fotografiaIds: [],
        estudioIds: [],
        recetaId: null,
        odontogramaRef: "",
        odontograma3DRef: "",
      },
      ...prev,
    ]);
    onToast("Informe guardado en la Historia Clínica");
  };

  const FUNCIONES: {
    id: string;
    label: string;
    icon: typeof Sparkles;
    accion: () => void;
    requierePieza?: boolean;
  }[] = [
    {
      id: "analisis",
      label: "Análisis asistido de la pieza",
      icon: Stethoscope,
      accion: analizarPieza,
      requierePieza: true,
    },
    {
      id: "historia",
      label: "Resumen de historia clínica",
      icon: History,
      accion: () =>
        void consultar(
          "Resumen de historia clínica",
          "Resumí la historia clínica del paciente",
          "historia",
        ),
    },
    {
      id: "odontograma",
      label: "Revisión del odontograma",
      icon: ClipboardList,
      accion: revisarOdontograma,
    },
    {
      id: "informe",
      label: "Borrador de informe",
      icon: FileText,
      accion: () =>
        void consultar("Borrador de informe", "Prepará un informe del paciente", "informe", true),
    },
    {
      id: "registros",
      label: "Análisis de registros",
      icon: BarChart3,
      accion: () =>
        void consultar(
          "Análisis de registros",
          "Analizá los tratamientos del paciente",
          "paciente",
        ),
    },
    {
      id: "observaciones",
      label: "Observaciones y recomendaciones",
      icon: Lightbulb,
      accion: () => setResultado({ titulo: "Observaciones y recomendaciones", texto: "" }),
      requierePieza: true,
    },
  ];

  return (
    <div className="card-grad overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-primary via-primary/60 to-primary/20" />
      <div className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="size-5" />
            </span>
            <div>
              <p className="text-sm font-bold">Esther IA en el odontograma</p>
              <p className="text-xs text-muted-foreground">
                Contexto:{" "}
                {nombrePieza ? (
                  <b className="text-foreground">{nombrePieza}</b>
                ) : (
                  "todo el paciente"
                )}{" "}
                · datos de esta clínica
              </p>
            </div>
          </div>
          <span
            className="rounded-full bg-amber-500/15 px-2.5 py-1 text-[10.5px] font-semibold text-amber-800 dark:text-amber-300"
            title="Las respuestas salen de los registros del paciente. No se envía información a servicios externos."
          >
            Motor local · IA externa pendiente de integración
          </span>
        </div>

        {/* 8 funciones */}
        <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-3">
          {FUNCIONES.map(({ id, label, icon: I, accion, requierePieza }) => (
            <button
              key={id}
              type="button"
              onClick={accion}
              disabled={!!cargando || (requierePieza && !fdi)}
              title={requierePieza && !fdi ? "Seleccioná una pieza en el modelo 3D" : undefined}
              className="flex items-center gap-2 rounded-xl border border-primary/15 bg-card px-3 py-2.5 text-left text-xs font-semibold transition hover:border-primary/40 hover:bg-primary/[0.04] disabled:opacity-50"
            >
              <I className="size-4 shrink-0 text-primary" />
              {label}
            </button>
          ))}
        </div>

        {/* 5) Búsqueda + 7) voz */}
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (pregunta.trim())
              void consultar("Búsqueda de información", pregunta.trim(), "paciente");
          }}
        >
          <label className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={microfono.escuchando ? microfono.parcial || "Escuchando…" : pregunta}
              onChange={(e) => setPregunta(e.target.value)}
              placeholder="Buscar información o preguntarle a Esther sobre este paciente"
              className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/15"
            />
          </label>
          <button
            type="button"
            onClick={microfono.alternar}
            disabled={!microfono.soportado}
            title={
              microfono.soportado
                ? "Asistente por voz (pide permiso al micrófono)"
                : "Este navegador no tiene dictado por voz: usá el texto"
            }
            aria-label="Asistente por voz"
            className={`grid size-10 place-items-center rounded-xl border ${microfono.escuchando ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-primary"} disabled:opacity-50`}
          >
            {microfono.soportado ? <Mic className="size-4" /> : <MicOff className="size-4" />}
          </button>
          <button type="submit" className="btn-ce !h-10" disabled={!!cargando}>
            <Send /> Consultar
          </button>
        </form>
        {microfono.aviso && (
          <p className="mt-1 text-[11px] text-muted-foreground">{microfono.aviso}</p>
        )}

        {/* Funciones adicionales */}
        <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
          <span className="py-1 font-semibold text-muted-foreground">También:</span>
          <button
            type="button"
            onClick={() => onIrHerramienta("rayosx")}
            className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 font-semibold text-primary"
          >
            <ScanSearch className="size-3" /> Análisis de radiografías
          </button>
          <button
            type="button"
            onClick={() =>
              void consultar(
                "Plan de tratamiento",
                "Analizá los tratamientos del paciente",
                "paciente",
              )
            }
            className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 font-semibold text-primary"
          >
            <ClipboardList className="size-3" /> Asistencia para el plan de tratamiento
          </button>
          <button
            type="button"
            onClick={() => onIrHerramienta("sonrisa")}
            className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 font-semibold text-primary"
          >
            <Smile className="size-3" /> Simulación de sonrisa
          </button>
        </div>

        {/* Resultado */}
        {cargando && (
          <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Esther está revisando:{" "}
            {cargando.toLowerCase()}…
          </p>
        )}
        {resultado && !cargando && (
          <div className="mt-4 rounded-2xl border border-primary/15 bg-background/80 p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-bold">{resultado.titulo}</p>
              <button
                type="button"
                onClick={() => setResultado(null)}
                aria-label="Cerrar"
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>
            {resultado.titulo === "Observaciones y recomendaciones" ? (
              sugerencias.length === 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  No hay recomendaciones nuevas para la pieza {fdi}.
                </p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {sugerencias.map((t) => (
                    <li
                      key={t}
                      className="flex flex-wrap items-center gap-2 rounded-xl bg-primary/[0.04] p-2.5 text-xs"
                    >
                      <span className="min-w-0 flex-1">{t}</span>
                      <button
                        type="button"
                        className="btn-ce !h-7"
                        onClick={() => aceptarSugerencia(t)}
                      >
                        <Check /> Aceptar y guardar
                      </button>
                      <button
                        type="button"
                        className="btn-ce-outline !h-7"
                        onClick={() => setDescartadas((x) => [...x, t])}
                      >
                        Descartar
                      </button>
                    </li>
                  ))}
                  <li className="text-[10.5px] text-muted-foreground">
                    Sugerencias de apoyo: el profesional decide. Al aceptar, se guardan como nota de
                    la pieza.
                  </li>
                </ul>
              )
            ) : resultado.editable ? (
              <>
                <textarea
                  value={borrador}
                  onChange={(e) => setBorrador(e.target.value)}
                  rows={8}
                  className="mt-2 w-full rounded-xl border border-border bg-background p-3 text-xs outline-none focus:border-primary/50"
                />
                <div className="mt-2 flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    className="btn-ce-outline"
                    onClick={() =>
                      void navigator.clipboard
                        ?.writeText(borrador)
                        .then(() => onToast("Informe copiado"))
                    }
                  >
                    Copiar
                  </button>
                  <button type="button" className="btn-ce" onClick={guardarInforme}>
                    Guardar en la Historia Clínica
                  </button>
                </div>
                <p className="mt-1 text-[10.5px] text-muted-foreground">
                  Borrador generado con los registros: revisalo y editalo antes de guardarlo.
                </p>
              </>
            ) : (
              <>
                {resultado.texto && (
                  <p className="mt-2 whitespace-pre-line text-xs leading-relaxed">
                    {resultado.texto}
                  </p>
                )}
                {resultado.bloques && (
                  <div className="mt-2">
                    <EstherBloques
                      bloques={resultado.bloques}
                      onPregunta={(q) => void consultar("Consulta", q, "paciente")}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Texto plano de una respuesta (para el borrador de informe editable). */
function textoPlano(texto: string, bloques?: Bloque[]) {
  const partes = [texto];
  bloques?.forEach((b) => {
    if (b.tipo === "informe")
      partes.push(b.titulo, ...b.secciones.map((s) => `${s.titulo}\n${s.texto}`));
    if (b.tipo === "lista")
      partes.push(...b.items.map((i) => `• ${i.texto}${i.detalle ? ` — ${i.detalle}` : ""}`));
  });
  return partes.filter(Boolean).join("\n\n");
}
