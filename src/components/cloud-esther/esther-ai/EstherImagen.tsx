import { useRef, useState } from "react";
import {
  Check,
  Copy,
  ImagePlus,
  Loader2,
  Printer,
  ScanSearch,
  ShieldAlert,
  Sparkles,
  X,
} from "lucide-react";
import { usePacientes } from "@/lib/cloud-esther/pacientes";
import { cambiarRegistro } from "@/components/cloud-esther/PacienteSecciones";
import { setIA, type AnalisisImagen, type HallazgoImagen } from "@/lib/cloud-esther/ia-store";
import { imprimirHTML } from "@/components/cloud-esther/rrhh/ui";
import { cargar, leerImagen, radiografiaEjemplo } from "./imagenes";

/* Analizar imagen (radiografía o fotografía clínica).
   Demo: el análisis se simula en el navegador a partir de la imagen (zonas de mayor contraste),
   siempre como ASISTENCIA para el profesional, nunca como diagnóstico.
   TODO backend: modelo de visión odontológico (detección de caries, lesiones periapicales,
   pérdida ósea, restauraciones) con coordenadas reales y nivel de confianza. */

type Tipo = AnalisisImagen["tipo"];
const TIPOS: Tipo[] = [
  "Radiografía panorámica",
  "Radiografía periapical",
  "Bite-wing",
  "Fotografía intraoral",
];

const CATALOGO: Record<
  "rx" | "foto",
  { tipo: string; sev: HallazgoImagen["severidad"]; prof: string; pac: string }[]
> = {
  rx: [
    {
      tipo: "Posible caries (zona radiolúcida)",
      sev: "Importante",
      prof: "Radiolucidez coronaria compatible con lesión cariosa; correlacionar con examen clínico y exploración.",
      pac: "Se ve una zona más oscura en el diente que podría ser una caries. El odontólogo la va a revisar.",
    },
    {
      tipo: "Posible lesión periapical",
      sev: "Importante",
      prof: "Imagen radiolúcida en región periapical; evaluar vitalidad pulpar y sintomatología.",
      pac: "En la punta de la raíz hay una sombra que conviene controlar.",
    },
    {
      tipo: "Restauración existente",
      sev: "Revisar",
      prof: "Radiopacidad compatible con restauración previa; verificar adaptación marginal.",
      pac: "Hay un arreglo anterior que se ve en buen estado general; solo se controla el borde.",
    },
    {
      tipo: "Posible desgaste",
      sev: "Moderado",
      prof: "Pérdida de estructura en borde oclusal/incisal; descartar bruxismo.",
      pac: "Se nota algo de desgaste, que puede venir de apretar los dientes.",
    },
    {
      tipo: "Área a revisar",
      sev: "Revisar",
      prof: "Variación de densidad no concluyente; sugerida evaluación complementaria.",
      pac: "Hay un área que el profesional va a mirar con más detalle.",
    },
  ],
  foto: [
    {
      tipo: "Posible mancha o lesión de esmalte",
      sev: "Moderado",
      prof: "Cambio de coloración en superficie de esmalte; evaluar desmineralización.",
      pac: "Hay una mancha en el esmalte que conviene revisar.",
    },
    {
      tipo: "Posible inflamación gingival",
      sev: "Moderado",
      prof: "Encía con aspecto eritematoso; evaluar índice de sangrado.",
      pac: "La encía se ve un poco inflamada en esa zona.",
    },
    {
      tipo: "Área a revisar",
      sev: "Revisar",
      prof: "Hallazgo visual no concluyente.",
      pac: "Hay una zona que el profesional va a mirar.",
    },
  ],
};
const COLOR: Record<HallazgoImagen["severidad"], string> = {
  Importante: "#e34948",
  Moderado: "#eda100",
  Revisar: "#2a78d6",
};

function piezaDe(x: number, y: number) {
  const lado = x < 50 ? "der" : "izq"; // lado del paciente: la imagen está espejada
  const pos = Math.min(8, Math.max(1, Math.ceil((Math.abs(x - 50) / 50) * 8)));
  if (y < 50) return String(lado === "der" ? 10 + pos : 20 + pos);
  return String(lado === "der" ? 40 + pos : 30 + pos);
}

/** Busca las zonas con más contraste local (candidatas) y arma hallazgos orientativos. */
async function analizar(src: string, tipo: Tipo): Promise<HallazgoImagen[]> {
  const img = await cargar(src);
  const W = 60;
  const H = Math.max(20, Math.round((img.height / img.width) * W));
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d");
  if (!g) return [];
  g.drawImage(img, 0, 0, W, H);
  const d = g.getImageData(0, 0, W, H).data;
  const lum = (x: number, y: number) => {
    const i = (y * W + x) * 4;
    return ((d[i] ?? 0) * 0.3 + (d[i + 1] ?? 0) * 0.59 + (d[i + 2] ?? 0) * 0.11) / 255;
  };
  const candidatos: { x: number; y: number; s: number }[] = [];
  for (let y = 3; y < H - 3; y += 2)
    for (let x = 3; x < W - 3; x += 2) {
      const centro = lum(x, y);
      let alrededor = 0;
      for (const [dx, dy] of [
        [-3, 0],
        [3, 0],
        [0, -3],
        [0, 3],
      ] as const)
        alrededor += lum(x + dx, y + dy);
      alrededor /= 4;
      // Zona oscura rodeada de estructura clara (típico de radiolucidez) o viceversa.
      const s = alrededor > 0.45 ? alrededor - centro : 0;
      if (s > 0.12) candidatos.push({ x, y, s });
    }
  candidatos.sort((a, b) => b.s - a.s);
  const elegidos: typeof candidatos = [];
  for (const k of candidatos) {
    if (elegidos.every((e) => Math.hypot(e.x - k.x, e.y - k.y) > 9)) elegidos.push(k);
    if (elegidos.length >= 4) break;
  }
  const cat = tipo === "Fotografía intraoral" ? CATALOGO.foto : CATALOGO.rx;
  return elegidos.map((k, i) => {
    const def = cat[i % cat.length]!;
    const x = (k.x / W) * 100;
    const y = (k.y / H) * 100;
    return {
      id: `h${i}`,
      tipo: def.tipo,
      zona: y < 50 ? "Maxilar superior" : "Mandíbula",
      pieza: tipo === "Fotografía intraoral" ? "—" : piezaDe(x, y),
      confianza: Math.min(0.92, 0.55 + k.s),
      severidad: def.sev,
      x,
      y,
      r: 4.5,
    };
  });
}

function textos(h: HallazgoImagen[], tipo: Tipo, paciente: string) {
  const cat = [...CATALOGO.rx, ...CATALOGO.foto];
  const prof = h.length
    ? `${tipo} de ${paciente}. Se identificaron ${h.length} áreas de atención asistidas por IA:\n` +
      h
        .map(
          (x, i) =>
            `${i + 1}. ${x.tipo}${x.pieza !== "—" ? ` · pieza ${x.pieza} (estimada)` : ""} · ${x.zona} · confianza ${Math.round(x.confianza * 100)} %. ${cat.find((c) => c.tipo === x.tipo)?.prof ?? ""}`,
        )
        .join("\n") +
      "\n\nSugerencia: correlacionar con el examen clínico y, si corresponde, estudios complementarios. Los números de pieza son estimados por posición."
    : `${tipo} de ${paciente}. No se detectaron áreas de atención con el nivel de contraste analizado. Esto no descarta patologías: requiere evaluación profesional.`;
  const pac = h.length
    ? `Revisamos tu ${tipo.toLowerCase()} con ayuda de inteligencia artificial. Encontramos ${h.length === 1 ? "una zona" : `${h.length} zonas`} que tu odontólogo va a revisar con más detalle:\n` +
      h.map((x) => `• ${cat.find((c) => c.tipo === x.tipo)?.pac ?? x.tipo}`).join("\n") +
      "\n\nNo es un diagnóstico: tu profesional te va a explicar qué significa cada punto y si hace falta algún tratamiento."
    : `Revisamos tu ${tipo.toLowerCase()} con ayuda de inteligencia artificial y no marcó zonas para revisar. Igualmente, tu odontólogo es quien confirma el resultado.`;
  return { prof, pac };
}

export function EstherImagen({
  pacienteInicial,
  usuario,
  onToast,
}: {
  pacienteInicial?: number | undefined;
  usuario: string;
  onToast: (t: string) => void;
}) {
  const { pacientes } = usePacientes();
  const [pacienteId, setPacienteId] = useState<number | undefined>(
    pacienteInicial ?? pacientes[0]?.id,
  );
  const [tipo, setTipo] = useState<Tipo>("Radiografía panorámica");
  const [imagen, setImagen] = useState("");
  const [archivo, setArchivo] = useState("");
  const [estado, setEstado] = useState<"" | "analizando" | "listo">("");
  const [paso, setPaso] = useState("");
  const [hallazgos, setHallazgos] = useState<
    (HallazgoImagen & { ok?: boolean; descartado?: boolean })[]
  >([]);
  const [vista, setVista] = useState<"prof" | "pac">("prof");
  const [informe, setInforme] = useState({ prof: "", pac: "" });
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const paciente = pacientes.find((p) => p.id === pacienteId);
  const nombre = paciente ? `${paciente.nombre} ${paciente.apellido}` : "el paciente";

  const correr = async (src = imagen) => {
    if (!src) return;
    setEstado("analizando");
    for (const p of [
      "Normalizando contraste…",
      "Ubicando piezas dentarias…",
      "Buscando áreas de atención…",
    ]) {
      setPaso(p);
      await new Promise((r) => setTimeout(r, 450));
    }
    const h = await analizar(src, tipo);
    setHallazgos(h);
    setInforme(textos(h, tipo, nombre));
    setEstado("listo");
  };
  const subir = async (f: File | undefined) => {
    if (!f) return;
    try {
      setError("");
      const src = await leerImagen(f, 900);
      setImagen(src);
      setArchivo(f.name);
      setEstado("");
      setHallazgos([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo leer la imagen");
    }
  };
  const vigentes = hallazgos.filter((h) => !h.descartado);
  const regenerar = (lista: typeof hallazgos) =>
    setInforme(
      textos(
        lista.filter((h) => !h.descartado),
        tipo,
        nombre,
      ),
    );

  const guardar = () => {
    if (!pacienteId) return setError("Elegí el paciente");
    const hoy = new Date().toISOString().slice(0, 10);
    const id = Date.now();
    cambiarRegistro(pacienteId, "estudios", (p) => [
      ...p,
      {
        id,
        tipo,
        fecha: hoy,
        zona: "Arcadas completas",
        solicitante: usuario,
        profesional: usuario,
        diagnostico: vigentes.length
          ? `Análisis asistido por IA: ${vigentes.length} áreas a revisar`
          : "Análisis asistido por IA sin áreas marcadas",
        observaciones: informe.prof,
        archivoNombre: archivo || `${tipo.toLowerCase().replace(/\s+/g, "-")}.jpg`,
        url: imagen,
        estadoInforme: "Informado",
        tratamientoId: null,
      },
    ]);
    setIA("analisis", (p) =>
      [
        {
          id: `ai-${id}`,
          fecha: new Date().toISOString(),
          pacienteId,
          tipo,
          archivo: archivo || "imagen",
          imagen,
          hallazgos: vigentes,
          informeProfesional: informe.prof,
          explicacionPaciente: informe.pac,
          revisadoPor: usuario,
          guardado: true,
        },
        ...p,
      ].slice(0, 30),
    );
    onToast(`Análisis guardado en los estudios de ${nombre}`);
  };

  return (
    <div className="space-y-4">
      <p className="flex items-start gap-2 rounded-xl border border-amber-300/50 bg-amber-500/10 px-3 py-2 text-[12px]">
        <ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />
        Asistencia para el profesional: marca áreas a revisar, no es un diagnóstico. El resultado lo
        confirma siempre el odontólogo.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Paciente
          <select
            value={pacienteId ?? ""}
            onChange={(e) => setPacienteId(Number(e.target.value))}
            className="mt-1 h-9 w-full rounded-xl border border-border bg-background px-2 text-sm font-normal normal-case tracking-normal text-foreground"
          >
            {pacientes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre} {p.apellido}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Tipo de imagen
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as Tipo)}
            className="mt-1 h-9 w-full rounded-xl border border-border bg-background px-2 text-sm font-normal normal-case tracking-normal text-foreground"
          >
            {TIPOS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <div className="flex items-end gap-2">
          <button
            type="button"
            className="btn-ce-outline flex-1"
            onClick={() => input.current?.click()}
          >
            <ImagePlus className="size-4" /> Subir imagen
          </button>
          <input
            ref={input}
            type="file"
            accept="image/*"
            className="hidden"
            aria-label="Imagen a analizar"
            onChange={(e) => void subir(e.target.files?.[0])}
          />
        </div>
      </div>
      {!imagen ? (
        <div className="grid place-items-center rounded-2xl border border-dashed border-primary/30 bg-primary/[0.04] px-4 py-10 text-center">
          <ScanSearch className="size-8 text-primary" />
          <p className="mt-2 text-sm font-semibold">Subí una radiografía o una foto clínica</p>
          <p className="text-[12px] text-muted-foreground">
            JPG o PNG. La imagen se procesa en tu navegador.
          </p>
          <button
            type="button"
            className="mt-3 text-[12px] font-semibold text-primary hover:underline"
            onClick={() => {
              const src = radiografiaEjemplo();
              setImagen(src);
              setArchivo("panoramica-ejemplo.jpg");
              setTipo("Radiografía panorámica");
            }}
          >
            Usar una radiografía de ejemplo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.35fr_1fr]">
          <div>
            <div className="relative overflow-hidden rounded-2xl border border-border bg-black">
              <img src={imagen} alt={`${tipo} de ${nombre}`} className="block w-full" />
              {vigentes.map((h, i) => (
                <div
                  key={h.id}
                  className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px]"
                  style={{
                    left: `${h.x}%`,
                    top: `${h.y}%`,
                    width: `${h.r * 2}%`,
                    aspectRatio: "1",
                    borderColor: COLOR[h.severidad],
                    boxShadow: `0 0 0 3px ${COLOR[h.severidad]}33`,
                  }}
                >
                  <span
                    className="absolute -right-2 -top-2 grid size-5 place-items-center rounded-full text-[10px] font-bold text-white"
                    style={{ background: COLOR[h.severidad] }}
                  >
                    {i + 1}
                  </span>
                </div>
              ))}
              {estado === "analizando" && (
                <div className="absolute inset-0 grid place-items-center bg-black/55 text-sm font-semibold text-white">
                  <span className="flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" /> {paso}
                  </span>
                </div>
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
              {(Object.keys(COLOR) as HallazgoImagen["severidad"][]).map((s) => (
                <span key={s} className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full" style={{ background: COLOR[s] }} /> {s}
                </span>
              ))}
              <button
                type="button"
                className="ml-auto font-semibold text-primary hover:underline"
                onClick={() => {
                  setImagen("");
                  setEstado("");
                  setHallazgos([]);
                }}
              >
                Cambiar imagen
              </button>
            </div>
          </div>
          <div className="space-y-3">
            {estado !== "listo" ? (
              <button
                type="button"
                className="btn-ce w-full"
                disabled={estado === "analizando"}
                onClick={() => void correr()}
              >
                <Sparkles className="size-4" />{" "}
                {estado === "analizando" ? "Analizando…" : "Analizar con Esther"}
              </button>
            ) : (
              <>
                <ul className="space-y-1.5">
                  {hallazgos.map((h, i) => (
                    <li
                      key={h.id}
                      className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 text-[12px] ${h.descartado ? "opacity-45 line-through" : ""}`}
                      style={{ borderColor: `${COLOR[h.severidad]}66` }}
                    >
                      <span
                        className="grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white"
                        style={{ background: COLOR[h.severidad] }}
                      >
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <b className="block truncate">{h.tipo}</b>
                        <span className="text-[11px] text-muted-foreground">
                          {h.pieza !== "—" ? `Pieza ${h.pieza} (estimada) · ` : ""}
                          {h.zona} · {Math.round(h.confianza * 100)} %
                        </span>
                      </span>
                      <button
                        type="button"
                        title="Confirmar"
                        aria-label={`Confirmar hallazgo ${i + 1}`}
                        onClick={() =>
                          setHallazgos((p) =>
                            p.map((x) =>
                              x.id === h.id ? { ...x, ok: !x.ok, descartado: false } : x,
                            ),
                          )
                        }
                        className={`grid size-6 place-items-center rounded-lg border ${h.ok ? "border-emerald-500 bg-emerald-500 text-white" : "border-border text-muted-foreground"}`}
                      >
                        <Check className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        title="Descartar"
                        aria-label={`Descartar hallazgo ${i + 1}`}
                        onClick={() => {
                          const n = hallazgos.map((x) =>
                            x.id === h.id ? { ...x, descartado: !x.descartado, ok: false } : x,
                          );
                          setHallazgos(n);
                          regenerar(n);
                        }}
                        className="grid size-6 place-items-center rounded-lg border border-border text-muted-foreground"
                      >
                        <X className="size-3.5" />
                      </button>
                    </li>
                  ))}
                  {!hallazgos.length && (
                    <li className="text-[12px] text-muted-foreground">
                      No se marcaron áreas de atención.
                    </li>
                  )}
                </ul>
                <div className="flex rounded-full bg-primary/[0.06] p-1">
                  {(["prof", "pac"] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setVista(v)}
                      className={`flex-1 rounded-full px-3 py-1 text-[11.5px] font-semibold ${vista === v ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                    >
                      {v === "prof" ? "Informe profesional" : "Para el paciente"}
                    </button>
                  ))}
                </div>
                <textarea
                  aria-label={
                    vista === "prof" ? "Informe profesional" : "Explicación para el paciente"
                  }
                  value={vista === "prof" ? informe.prof : informe.pac}
                  onChange={(e) => setInforme((x) => ({ ...x, [vista]: e.target.value }))}
                  className="scroll-sutil h-44 w-full resize-none rounded-xl border border-border bg-background p-2.5 text-[12px] leading-relaxed"
                />
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn-ce" onClick={guardar}>
                    <Check className="size-4" /> Guardar en estudios
                  </button>
                  <button
                    type="button"
                    className="btn-ce-outline"
                    onClick={() => {
                      void navigator.clipboard
                        ?.writeText(vista === "prof" ? informe.prof : informe.pac)
                        .catch(() => {});
                      onToast("Texto copiado");
                    }}
                  >
                    <Copy className="size-4" /> Copiar
                  </button>
                  <button
                    type="button"
                    className="btn-ce-outline"
                    onClick={() =>
                      imprimirHTML(
                        `${tipo} · ${nombre}`,
                        `<h1>${tipo}</h1><p>${nombre} · ${new Date().toLocaleDateString("es-AR")}</p><img src="${imagen}" style="max-width:100%;border-radius:8px"><h2>${vista === "prof" ? "Informe profesional" : "Explicación para el paciente"}</h2><p style="white-space:pre-line">${(vista === "prof" ? informe.prof : informe.pac).replace(/</g, "&lt;")}</p><p style="color:#6b7280;font-size:11px">Análisis asistido por IA. No constituye diagnóstico: lo confirma el profesional.</p>`,
                      )
                    }
                  >
                    <Printer className="size-4" /> PDF
                  </button>
                </div>
              </>
            )}
            {error && <p className="text-[12px] font-medium text-rose-600">{error}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
