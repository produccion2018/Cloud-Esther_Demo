import { useEffect, useRef, useState, type MouseEvent } from "react";
import {
  AlertTriangle,
  Check,
  Crosshair,
  Download,
  Eye,
  EyeOff,
  FileText,
  ImagePlus,
  Loader2,
  PlugZap,
  Printer,
  RefreshCw,
  Save,
  ScanSearch,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { usePacientes } from "@/lib/cloud-esther/pacientes";
import { useSesion } from "@/lib/cloud-esther/auth-store";
import { cambiarRegistro } from "@/components/cloud-esther/PacienteSecciones";
import { imprimirHTML } from "@/components/cloud-esther/rrhh/ui";
import { cargar, radiografiaEjemplo, reducir } from "@/components/cloud-esther/esther-ai/imagenes";
import type { ToothState } from "@/lib/odontogram/fdi";
import {
  RX_IA_CONECTADA,
  TIPOS_RX,
  analizarRadiografia,
  eliminarAnalisisRX,
  guardarAnalisisRX,
  imagenAnotada,
  nuevoHallazgoManual,
  storeRayosX,
  type AnalisisRX,
  type HallazgoRX,
  type OrigenRX,
  type Severidad,
  type TipoHallazgoRX,
} from "@/lib/cloud-esther/rayos-x";

/* Ubicación: src/components/cloud-esther/odontograma3d/RayosXIA.tsx
   Análisis de rayos X (pestaña del Odontograma 3D y herramienta de Esther IA): detección
   asistida, marcado manual por colores, informe profesional y para el paciente, y pase de los
   hallazgos confirmados al odontograma 3D. Siempre requiere confirmación del profesional. */

const ESTUDIOS = [
  "Radiografía panorámica",
  "Radiografía periapical",
  "Bite-wing",
  "Tomografía (corte)",
];
const SEV_COLOR: Record<Severidad, string> = {
  Leve: "bg-emerald-50 text-emerald-700",
  Moderada: "bg-amber-50 text-amber-700",
  Severa: "bg-rose-50 text-rose-700",
};
const SEL =
  "h-8 rounded-lg border border-primary/15 bg-white px-2 text-xs outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10";

export function RayosXIA({
  pacienteId: pacienteFijo,
  onToast,
  onPasarOdontograma,
}: {
  pacienteId?: number | undefined;
  onToast: (t: string) => void;
  /** Desde el Odontograma 3D: marca la pieza con el estado del hallazgo. */
  onPasarOdontograma?: ((fdi: number, estado: ToothState) => void) | undefined;
}) {
  const { pacientes } = usePacientes();
  const { usuario } = useSesion();
  const historial = storeRayosX.usar().analisis;
  const [pacienteId, setPacienteId] = useState<number | undefined>(
    pacienteFijo ?? pacientes[0]?.id,
  );
  const [imagen, setImagen] = useState("");
  const [archivo, setArchivo] = useState("");
  const [origen, setOrigen] = useState<OrigenRX>("paciente");
  const [tipoEstudio, setTipoEstudio] = useState(ESTUDIOS[0] ?? "Radiografía panorámica");
  const [hallazgos, setHallazgos] = useState<HallazgoRX[]>([]);
  const [analizando, setAnalizando] = useState(false);
  const [analizado, setAnalizado] = useState(false);
  const [marcar, setMarcar] = useState<TipoHallazgoRX | null>(null);
  const [verMarcas, setVerMarcas] = useState(true);
  const [vista, setVista] = useState<"prof" | "pac">("prof");
  const [aviso, setAviso] = useState("");
  const [guardadoId, setGuardadoId] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (pacienteFijo !== undefined) setPacienteId(pacienteFijo);
  }, [pacienteFijo]);

  const paciente = pacientes.find((p) => p.id === pacienteId);
  const nombre = paciente ? `${paciente.nombre} ${paciente.apellido}` : "el paciente";
  const vigentes = hallazgos.filter((h) => h.estado !== "Descartado");
  const delPaciente = historial.filter((a) => a.pacienteId === pacienteId);

  const reset = () => {
    setHallazgos([]);
    setAnalizado(false);
    setGuardadoId(null);
    setMarcar(null);
  };
  const subir = async (f: File | undefined) => {
    if (!f) return;
    setAviso("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) {
      setAviso("Formato no admitido. Exportá la radiografía como JPG o PNG.");
      return;
    }
    try {
      const url = URL.createObjectURL(f);
      const img = await cargar(url);
      URL.revokeObjectURL(url);
      if (img.width < 400) {
        setAviso("La imagen es muy chica para analizarla (mínimo 400 px de ancho).");
        return;
      }
      setImagen(reducir(img, 1100, 0.86));
      setArchivo(f.name);
      setOrigen("paciente");
      reset();
    } catch {
      setAviso("No pudimos leer la imagen.");
    }
  };
  const usarDemo = () => {
    setImagen(radiografiaEjemplo());
    setArchivo("panoramica-demostracion.jpg");
    setOrigen("demo");
    setTipoEstudio("Radiografía panorámica");
    setAviso("");
    reset();
  };
  const analizar = async () => {
    if (!imagen) return;
    setAnalizando(true);
    const r = await analizarRadiografia(imagen, origen);
    setHallazgos((prev) => [...prev.filter((h) => h.origen === "manual"), ...r]);
    setAnalizando(false);
    setAnalizado(true);
    onToast(
      r.length
        ? `${r.length} ${origen === "demo" ? "hallazgos del caso de demostración" : "áreas a revisar marcadas"}`
        : "No se marcaron áreas. Podés marcar a mano.",
    );
  };
  const clickImagen = (e: MouseEvent<HTMLDivElement>) => {
    if (!marcar) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    setHallazgos((p) => [...p, nuevoHallazgoManual(x, y, marcar)]);
    setAnalizado(true);
  };
  const cambiar = (id: string, c: Partial<HallazgoRX>) =>
    setHallazgos((p) => p.map((h) => (h.id === id ? { ...h, ...c } : h)));

  const textoProf = () =>
    vigentes.length
      ? vigentes
          .map(
            (h, i) =>
              `${i + 1}. Pieza ${h.pieza} · ${TIPOS_RX[h.tipo].nombre} (${h.severidad.toLowerCase()}, ${h.estado.toLowerCase()}). ${TIPOS_RX[h.tipo].profesional}`,
          )
          .join("\n")
      : "Sin hallazgos marcados en este estudio.";
  const textoPac = () =>
    vigentes.length
      ? `${paciente?.nombre ?? "Hola"}, en tu ${tipoEstudio.toLowerCase()} el odontólogo marcó ${vigentes.length} ${vigentes.length === 1 ? "punto" : "puntos"}: ` +
        vigentes.map((h) => `en la pieza ${h.pieza}, ${TIPOS_RX[h.tipo].paciente}`).join("; ") +
        ". Tu odontólogo te va a explicar qué conviene hacer en cada caso."
      : "En este estudio no se marcaron hallazgos.";

  const guardar = () => {
    if (!pacienteId || !imagen) return;
    const ahora = new Date();
    const id = guardadoId ?? `rx-${ahora.getTime()}`;
    const a: AnalisisRX = {
      id,
      fecha: ahora.toISOString(),
      pacienteId,
      profesional: usuario?.nombre ?? "Profesional",
      tipoEstudio,
      origen,
      imagen,
      hallazgos,
    };
    guardarAnalisisRX(a);
    if (!guardadoId)
      cambiarRegistro(pacienteId, "estudios", (p) => [
        ...p,
        {
          id: ahora.getTime(),
          tipo: tipoEstudio,
          fecha: ahora.toISOString().slice(0, 10),
          zona: "Arcadas completas",
          solicitante: a.profesional,
          profesional: a.profesional,
          diagnostico: vigentes.length
            ? `Análisis de rayos X: ${vigentes.length} hallazgos (${[...new Set(vigentes.map((h) => TIPOS_RX[h.tipo].nombre))].join(", ")})`
            : "Análisis de rayos X sin hallazgos marcados",
          observaciones: textoProf(),
          archivoNombre: archivo || "radiografia.jpg",
          url: imagen,
          estadoInforme: "Informado",
          tratamientoId: null,
        },
      ]);
    setGuardadoId(id);
    onToast(`Análisis guardado en los estudios de ${nombre}`);
  };

  const pasarAlOdontograma = () => {
    if (!onPasarOdontograma) return;
    const conEstado = vigentes.filter(
      (h) => h.estado === "Confirmado" && TIPOS_RX[h.tipo].estado3D && Number(h.pieza),
    );
    conEstado.forEach((h) => onPasarOdontograma(Number(h.pieza), TIPOS_RX[h.tipo].estado3D!));
    onToast(
      conEstado.length
        ? `${conEstado.length} ${conEstado.length === 1 ? "pieza actualizada" : "piezas actualizadas"} en el odontograma 3D`
        : "Confirmá hallazgos de caries, restauración, conducto o corona para pasarlos al odontograma",
    );
  };

  const imprimir = async () => {
    const anotada = await imagenAnotada(imagen, hallazgos);
    const conteo = Object.entries(
      vigentes.reduce<Record<string, number>>(
        (a, h) => ({ ...a, [h.tipo]: (a[h.tipo] ?? 0) + 1 }),
        {},
      ),
    );
    imprimirHTML(
      `Informe de rayos X · ${nombre}`,
      `<h1>Informe de ${tipoEstudio.toLowerCase()}</h1>
      <p style="color:#6b7280">${nombre} · ${new Date().toLocaleDateString("es-AR")} · ${usuario?.nombre ?? ""}</p>
      <img src="${anotada}" style="width:100%;border-radius:10px;margin:8px 0">
      <p>${conteo
        .map(
          ([t, n]) =>
            `<span style="display:inline-block;margin:2px 6px 2px 0;padding:3px 10px;border-radius:999px;background:${TIPOS_RX[t as TipoHallazgoRX].color}22;color:${TIPOS_RX[t as TipoHallazgoRX].color};font-weight:600">● ${TIPOS_RX[t as TipoHallazgoRX].nombre}: ${n}</span>`,
        )
        .join("")}</p>
      <table><tr><th>#</th><th>Pieza</th><th>Hallazgo</th><th>Severidad</th><th>Estado</th></tr>
      ${vigentes
        .map(
          (h, i) =>
            `<tr><td>${i + 1}</td><td>${h.pieza}</td><td><span style="color:${TIPOS_RX[h.tipo].color};font-weight:700">●</span> ${TIPOS_RX[h.tipo].nombre}</td><td>${h.severidad}</td><td>${h.estado}</td></tr>`,
        )
        .join("")}</table>
      <h2>${vista === "prof" ? "Informe profesional" : "Explicación para el paciente"}</h2>
      <p style="white-space:pre-line">${(vista === "prof" ? textoProf() : textoPac()).replace(/</g, "&lt;")}</p>
      <p style="color:#6b7280;font-size:11px;margin-top:20px">Análisis asistido: las marcas las revisa y confirma el profesional. No constituye un diagnóstico por sí mismo.</p>`,
    );
  };
  const descargar = async () => {
    const a = document.createElement("a");
    a.href = await imagenAnotada(imagen, hallazgos);
    a.download = `rx-anotada-${nombre.toLowerCase().replace(/\s+/g, "-")}.jpg`;
    a.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold ${RX_IA_CONECTADA ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}
        >
          <PlugZap className="size-3.5" />
          {RX_IA_CONECTADA ? "IA de rayos X conectada" : "IA de rayos X: se conecta en producción"}
        </span>
        <span className="text-[11px] text-muted-foreground">
          Asistencia para el profesional: cada marca se confirma o descarta. No es un diagnóstico.
        </span>
      </div>

      {pacienteFijo === undefined && (
        <label className="block max-w-xs text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Paciente
          <select
            value={pacienteId ?? ""}
            onChange={(e) => setPacienteId(Number(e.target.value))}
            className="mt-1 h-9 w-full rounded-xl border border-primary/15 bg-white px-2 text-sm font-normal normal-case tracking-normal text-foreground"
          >
            {pacientes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre} {p.apellido}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        {/* Imagen */}
        <div className="min-w-0 rounded-2xl border border-primary/12 bg-white p-3">
          {!imagen ? (
            <div className="grid aspect-[2/1] place-items-center rounded-xl border-2 border-dashed border-primary/20 bg-primary/[0.02] p-6 text-center">
              <div>
                <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <ScanSearch className="size-6" />
                </span>
                <p className="mt-3 font-semibold">Cargá una radiografía</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Panorámica, periapical o bite-wing en JPG o PNG.
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <button type="button" className="btn-ce" onClick={() => input.current?.click()}>
                    <ImagePlus className="size-4" /> Subir radiografía
                  </button>
                  <button type="button" className="btn-ce-outline" onClick={usarDemo}>
                    <Eye className="size-4" /> Usar caso de demostración
                  </button>
                </div>
                {aviso && <p className="mt-3 text-[12px] font-medium text-amber-700">{aviso}</p>}
              </div>
            </div>
          ) : (
            <>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <select
                    value={tipoEstudio}
                    onChange={(e) => setTipoEstudio(e.target.value)}
                    className={SEL}
                    aria-label="Tipo de estudio"
                  >
                    {ESTUDIOS.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                  {origen === "demo" && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                      Caso de demostración
                    </span>
                  )}
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setVerMarcas((v) => !v)}
                    className="btn-ce-outline"
                    aria-pressed={verMarcas}
                  >
                    {verMarcas ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                    {verMarcas ? "Ocultar marcas" : "Ver marcas"}
                  </button>
                  <button
                    type="button"
                    className="btn-ce-outline"
                    onClick={() => input.current?.click()}
                  >
                    <RefreshCw className="size-3.5" /> Reemplazar
                  </button>
                  <button
                    type="button"
                    aria-label="Quitar radiografía"
                    onClick={() => {
                      setImagen("");
                      reset();
                    }}
                    className="grid size-9 place-items-center rounded-xl border border-primary/12 text-muted-foreground hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
              <div
                className={`relative overflow-hidden rounded-xl bg-black ${marcar ? "cursor-crosshair" : ""}`}
                onClick={clickImagen}
              >
                <img
                  src={imagen}
                  alt="Radiografía"
                  className="w-full select-none"
                  draggable={false}
                />
                {verMarcas &&
                  vigentes.map((h, i) => (
                    <span
                      key={h.id}
                      title={`${i + 1}. ${TIPOS_RX[h.tipo].nombre} · pieza ${h.pieza}`}
                      className={`pointer-events-none absolute grid size-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-[3px] ${h.estado === "Sugerido" ? "border-dashed" : ""}`}
                      style={{
                        left: `${h.x}%`,
                        top: `${h.y}%`,
                        borderColor: TIPOS_RX[h.tipo].color,
                      }}
                    >
                      <span
                        className="absolute -right-2 -top-2 grid size-5 place-items-center rounded-full text-[10px] font-bold text-white"
                        style={{ background: TIPOS_RX[h.tipo].color }}
                      >
                        {i + 1}
                      </span>
                    </span>
                  ))}
                {analizando && (
                  <div className="absolute inset-0 grid place-items-center bg-primary/25 backdrop-blur-[1px]">
                    <div className="rounded-2xl bg-white/95 px-5 py-3 text-center shadow-xl">
                      <Loader2 className="mx-auto size-5 animate-spin text-primary" />
                      <p className="mt-1.5 text-sm font-semibold">Analizando la radiografía…</p>
                    </div>
                  </div>
                )}
              </div>
              {/* Paleta: detectar y marcar a mano */}
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  className="btn-ce"
                  onClick={() => void analizar()}
                  disabled={analizando}
                >
                  <ScanSearch className="size-4" />
                  {origen === "demo" ? "Analizar caso de demostración" : "Detección preliminar"}
                </button>
                <span className="mx-1 text-[11px] text-muted-foreground">Marcar a mano:</span>
                {(Object.keys(TIPOS_RX) as TipoHallazgoRX[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setMarcar((m) => (m === t ? null : t))}
                    aria-pressed={marcar === t}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${marcar === t ? "border-transparent text-white" : "border-primary/12 bg-white text-foreground/80 hover:border-primary/30"}`}
                    style={marcar === t ? { background: TIPOS_RX[t].color } : {}}
                  >
                    <span
                      className="size-2 rounded-full"
                      style={{ background: marcar === t ? "#fff" : TIPOS_RX[t].color }}
                    />
                    {TIPOS_RX[t].nombre}
                  </button>
                ))}
              </div>
              {marcar && (
                <p className="mt-2 flex items-center gap-1.5 text-[11px] text-primary">
                  <Crosshair className="size-3.5" /> Tocá la radiografía para marcar «
                  {TIPOS_RX[marcar].nombre}».
                </p>
              )}
              {origen === "paciente" && analizado && (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  La detección preliminar marca zonas de contraste como «Área a revisar» (algoritmo
                  local, no IA). Clasificalas vos: caries, lesión periapical, restauración, etc.
                </p>
              )}
            </>
          )}
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            onChange={(e) => {
              void subir(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>

        {/* Hallazgos */}
        <div className="space-y-3">
          <div className="rounded-2xl border border-primary/12 bg-white p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">Hallazgos</p>
              <span className="text-[11px] text-muted-foreground">
                {vigentes.filter((h) => h.estado === "Confirmado").length} confirmados ·{" "}
                {vigentes.length} en total
              </span>
            </div>
            {hallazgos.length === 0 ? (
              <p className="mt-3 rounded-xl border border-dashed border-primary/15 px-3 py-5 text-center text-xs text-muted-foreground">
                {imagen
                  ? "Corré la detección o marcá a mano sobre la imagen."
                  : "Primero cargá una radiografía."}
              </p>
            ) : (
              <ul className="scroll-sutil mt-2 max-h-[420px] space-y-2 overflow-y-auto pr-1">
                {hallazgos.map((h) => {
                  const n = vigentes.indexOf(h) + 1;
                  return (
                    <li
                      key={h.id}
                      className={`rounded-xl border p-2.5 ${h.estado === "Descartado" ? "border-dashed border-border opacity-50" : "border-primary/10"}`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="grid size-6 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white"
                          style={{ background: TIPOS_RX[h.tipo].color }}
                        >
                          {n || "–"}
                        </span>
                        <select
                          value={h.tipo}
                          onChange={(e) =>
                            cambiar(h.id, { tipo: e.target.value as TipoHallazgoRX })
                          }
                          className={`${SEL} min-w-0 flex-1`}
                          aria-label="Tipo de hallazgo"
                        >
                          {(Object.keys(TIPOS_RX) as TipoHallazgoRX[]).map((t) => (
                            <option key={t} value={t}>
                              {TIPOS_RX[t].nombre}
                            </option>
                          ))}
                        </select>
                        <input
                          value={h.pieza}
                          onChange={(e) =>
                            cambiar(h.id, { pieza: e.target.value.replace(/\D/g, "").slice(0, 2) })
                          }
                          className={`${SEL} w-12 text-center`}
                          aria-label="Pieza"
                          title="Pieza (FDI)"
                        />
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <select
                          value={h.severidad}
                          onChange={(e) =>
                            cambiar(h.id, { severidad: e.target.value as Severidad })
                          }
                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold outline-none ${SEV_COLOR[h.severidad]}`}
                          aria-label="Severidad"
                        >
                          {(["Leve", "Moderada", "Severa"] as const).map((x) => (
                            <option key={x}>{x}</option>
                          ))}
                        </select>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-muted-foreground">
                            {h.origen === "manual"
                              ? "Manual"
                              : h.origen === "demo"
                                ? "Demo"
                                : "Detección"}
                          </span>
                          <button
                            type="button"
                            aria-label="Confirmar hallazgo"
                            onClick={() => cambiar(h.id, { estado: "Confirmado" })}
                            className={`grid size-7 place-items-center rounded-lg border ${h.estado === "Confirmado" ? "border-emerald-300 bg-emerald-50 text-emerald-600" : "border-primary/12 text-muted-foreground hover:text-emerald-600"}`}
                          >
                            <Check className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            aria-label="Descartar hallazgo"
                            onClick={() =>
                              cambiar(h.id, {
                                estado: h.estado === "Descartado" ? "Sugerido" : "Descartado",
                              })
                            }
                            className={`grid size-7 place-items-center rounded-lg border ${h.estado === "Descartado" ? "border-rose-300 bg-rose-50 text-rose-600" : "border-primary/12 text-muted-foreground hover:text-rose-600"}`}
                          >
                            <X className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          {vigentes.length > 0 && (
            <div className="rounded-2xl border border-primary/12 bg-white p-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                Resumen por color
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(Object.keys(TIPOS_RX) as TipoHallazgoRX[])
                  .map((t) => [t, vigentes.filter((h) => h.tipo === t).length] as const)
                  .filter(([, n]) => n > 0)
                  .map(([t, n]) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                      style={{ background: `${TIPOS_RX[t].color}1a`, color: TIPOS_RX[t].color }}
                    >
                      <span
                        className="size-2 rounded-full"
                        style={{ background: TIPOS_RX[t].color }}
                      />
                      {TIPOS_RX[t].nombre}: {n}
                    </span>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Informe */}
      {imagen && analizado && (
        <div className="rounded-2xl border border-primary/12 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex rounded-xl border border-primary/15 bg-primary/[0.03] p-0.5">
              {(
                [
                  ["prof", "Informe profesional"],
                  ["pac", "Explicación para el paciente"],
                ] as const
              ).map(([id, l]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setVista(id)}
                  className={`rounded-lg px-3 py-1 text-xs font-semibold ${vista === id ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                >
                  {l}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button type="button" className="btn-ce" onClick={guardar} disabled={!pacienteId}>
                <Save className="size-4" />{" "}
                {guardadoId ? "Guardado en estudios" : "Guardar en estudios"}
              </button>
              {onPasarOdontograma && (
                <button type="button" className="btn-ce-outline" onClick={pasarAlOdontograma}>
                  <Send className="size-3.5" /> Pasar al odontograma 3D
                </button>
              )}
              <button type="button" className="btn-ce-outline" onClick={() => void imprimir()}>
                <Printer className="size-3.5" /> Imprimir / PDF
              </button>
              <button type="button" className="btn-ce-outline" onClick={() => void descargar()}>
                <Download className="size-3.5" /> Imagen anotada
              </button>
            </div>
          </div>
          <p className="mt-3 whitespace-pre-line rounded-xl bg-primary/[0.03] p-3 text-sm leading-relaxed">
            {vista === "prof" ? textoProf() : textoPac()}
          </p>
          <p className="mt-2 flex items-start gap-1.5 text-[11px] text-muted-foreground">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
            Las marcas son asistencia para el profesional. El diagnóstico lo confirma el odontólogo.
          </p>
        </div>
      )}

      {/* Historial */}
      {delPaciente.length > 0 && (
        <div className="rounded-2xl border border-primary/12 bg-white p-4">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <FileText className="size-4 text-primary" /> Análisis anteriores de {nombre}
          </p>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {delPaciente.map((a) => (
              <li key={a.id} className="overflow-hidden rounded-xl border border-primary/10">
                <img
                  src={a.imagen}
                  alt={a.tipoEstudio}
                  className="aspect-[2/1] w-full bg-black object-cover"
                />
                <div className="flex items-center justify-between gap-2 p-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold">{a.tipoEstudio}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(a.fecha).toLocaleDateString("es-AR")} ·{" "}
                      {a.hallazgos.filter((h) => h.estado !== "Descartado").length} hallazgos
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      className="btn-ce-outline"
                      onClick={() => {
                        setImagen(a.imagen);
                        setOrigen(a.origen);
                        setTipoEstudio(a.tipoEstudio);
                        setHallazgos(a.hallazgos);
                        setAnalizado(true);
                        setGuardadoId(a.id);
                      }}
                    >
                      <Eye className="size-3.5" /> Ver
                    </button>
                    <button
                      type="button"
                      aria-label="Eliminar análisis"
                      onClick={() => eliminarAnalisisRX(a.id)}
                      className="grid size-8 place-items-center rounded-lg border border-primary/12 text-muted-foreground hover:text-rose-600"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
