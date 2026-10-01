import { useEffect, useRef, useState, type DragEvent } from "react";
import {
  AlertTriangle,
  Brush,
  Check,
  ChevronDown,
  Columns2,
  Download,
  Eye,
  FileImage,
  History,
  ImagePlus,
  Loader2,
  Maximize2,
  PlugZap,
  Printer,
  RefreshCw,
  Save,
  ShieldCheck,
  Smile,
  Sparkles,
  SplitSquareHorizontal,
  Trash2,
  Wand2,
  X,
  type LucideIcon,
} from "lucide-react";
import { usePacientes } from "@/lib/cloud-esther/pacientes";
import { useSesion } from "@/lib/cloud-esther/auth-store";
import { cambiarRegistro } from "@/components/cloud-esther/PacienteSecciones";
import { imprimirHTML } from "@/components/cloud-esther/rrhh/ui";
import { cargar, reducir } from "@/components/cloud-esther/esther-ai/imagenes";
import {
  SERVICIO_IA_CONECTADO,
  ServicioIANoDisponible,
  TRATAMIENTOS_ESTETICOS,
  actualizarSimulacion,
  eliminarSimulacion,
  fotoCasoDemo,
  generarSimulacion,
  guardarSimulacion,
  storeSimulador,
  type OrigenFoto,
  type Propuesta,
  type SimulacionGuardada,
  type TratamientoEstetico,
} from "@/lib/cloud-esther/simulador-sonrisa";

/* Ubicación: src/components/cloud-esther/simulador/SimuladorSonrisa.tsx
   Simulador de Sonrisa con IA: carga de fotos, elección de tratamientos estéticos,
   comparación antes/después y propuestas guardadas en la historia del paciente.
   Diferenciado del Odontograma 2D y 3D. Las imágenes son siempre orientativas. */

type Estado = "vacio" | "lista" | "procesando" | "resultado" | "error";

const ICONO: Record<TratamientoEstetico, LucideIcon> = {
  blanqueamiento: Sparkles,
  carillas: Smile,
  diseno: Wand2,
  alineacion: Columns2,
  forma: Brush,
  restauraciones: ShieldCheck,
};
const TIPOS = ["image/jpeg", "image/png", "image/webp"];
const MAX_MB = 10;
const MIN_W = 480;
const MIN_H = 320;

const fechaHora = (iso: string) =>
  new Date(iso).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

/* ───────────── Comparador antes / después ───────────── */

function Comparador({ antes, despues }: { antes: string; despues: string }) {
  const [corte, setCorte] = useState(50);
  const caja = useRef<HTMLDivElement>(null);
  const arrastrando = useRef(false);
  const mover = (clientX: number) => {
    const r = caja.current?.getBoundingClientRect();
    if (r) setCorte(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)));
  };
  return (
    <div
      ref={caja}
      className="relative aspect-[19/13] w-full cursor-ew-resize select-none overflow-hidden rounded-2xl bg-muted"
      onPointerDown={(e) => {
        arrastrando.current = true;
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        mover(e.clientX);
      }}
      onPointerMove={(e) => arrastrando.current && mover(e.clientX)}
      onPointerUp={() => (arrastrando.current = false)}
      role="slider"
      aria-label="Comparar antes y después"
      aria-valuenow={Math.round(corte)}
      aria-valuemin={0}
      aria-valuemax={100}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") setCorte((c) => Math.max(0, c - 5));
        if (e.key === "ArrowRight") setCorte((c) => Math.min(100, c + 5));
      }}
    >
      <img
        src={despues}
        alt="Simulación"
        className="absolute inset-0 size-full object-cover"
        draggable={false}
      />
      <img
        src={antes}
        alt="Foto original"
        className="absolute inset-0 size-full object-cover"
        style={{ clipPath: `inset(0 ${100 - corte}% 0 0)` }}
        draggable={false}
      />
      <span className="absolute left-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-white">
        Antes
      </span>
      <span className="absolute right-3 top-3 rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground">
        Simulación
      </span>
      <div
        className="absolute inset-y-0 w-0.5 bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.15)]"
        style={{ left: `${corte}%` }}
      >
        <span className="absolute left-1/2 top-1/2 grid size-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-primary shadow-lg">
          <SplitSquareHorizontal className="size-4" />
        </span>
      </div>
    </div>
  );
}

/* ───────────── Página ───────────── */

export function SimuladorSonrisa() {
  const { pacientes, activoId } = usePacientes();
  const { usuario } = useSesion();
  const historial = storeSimulador.usar().simulaciones;
  const [pacienteId, setPacienteId] = useState<number | undefined>(activoId ?? undefined);
  const [foto, setFoto] = useState("");
  const [archivo, setArchivo] = useState("");
  const [origen, setOrigen] = useState<OrigenFoto>("paciente");
  const [aviso, setAviso] = useState("");
  const [tratamientos, setTratamientos] = useState<TratamientoEstetico[]>(["blanqueamiento"]);
  const [estado, setEstado] = useState<Estado>("vacio");
  const [error, setError] = useState("");
  const [propuestas, setPropuestas] = useState<Propuesta[]>([]);
  const [activa, setActiva] = useState(0);
  const [vistaComparar, setVistaComparar] = useState<"deslizador" | "alternativas">("deslizador");
  const [consentimiento, setConsentimiento] = useState(false);
  const [guardadaId, setGuardadaId] = useState<string | null>(null);
  const [presentando, setPresentando] = useState(false);
  const [toast, setToast] = useState("");
  const [arrastre, setArrastre] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (pacienteId === undefined && pacientes[0]) setPacienteId(activoId ?? pacientes[0].id);
  }, [pacientes, activoId, pacienteId]);
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(""), 3000);
    return () => window.clearTimeout(t);
  }, [toast]);

  const paciente = pacientes.find((p) => p.id === pacienteId);
  const nombre = paciente ? `${paciente.nombre} ${paciente.apellido}` : "";
  const propuesta = propuestas[activa];
  const delPaciente = historial.filter((s) => s.pacienteId === pacienteId);

  const reiniciarResultado = () => {
    setPropuestas([]);
    setActiva(0);
    setGuardadaId(null);
    setError("");
  };

  const cargarArchivo = async (f: File | undefined) => {
    if (!f) return;
    setAviso("");
    if (!TIPOS.includes(f.type)) {
      setAviso("Formato no admitido. Usá una foto JPG, PNG o WEBP.");
      return;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      setAviso(`La foto pesa más de ${MAX_MB} MB. Probá con una versión más liviana.`);
      return;
    }
    try {
      const url = URL.createObjectURL(f);
      const img = await cargar(url);
      URL.revokeObjectURL(url);
      if (img.width < MIN_W || img.height < MIN_H) {
        setAviso(
          `La foto es muy chica (${img.width}×${img.height}). Necesitamos al menos ${MIN_W}×${MIN_H} px para ver bien los dientes.`,
        );
        return;
      }
      if (img.height > img.width * 1.4)
        setAviso(
          "Sugerencia: una foto horizontal, de frente y con la sonrisa completa da mejores resultados.",
        );
      setFoto(reducir(img, 900, 0.85));
      setArchivo(f.name);
      setOrigen("paciente");
      setEstado("lista");
      reiniciarResultado();
    } catch {
      setAviso("No pudimos leer la imagen. Probá con otro archivo.");
    }
  };

  const usarDemo = () => {
    setFoto(fotoCasoDemo());
    setArchivo("caso-demostracion.jpg");
    setOrigen("demo");
    setAviso("");
    setEstado("lista");
    reiniciarResultado();
  };

  const quitarFoto = () => {
    setFoto("");
    setArchivo("");
    setEstado("vacio");
    reiniciarResultado();
  };

  const alternar = (t: TratamientoEstetico) =>
    setTratamientos((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  const generar = async () => {
    if (!foto || !tratamientos.length) return;
    setEstado("procesando");
    reiniciarResultado();
    try {
      const r = await generarSimulacion({ origen, foto, tratamientos });
      setPropuestas(r);
      setEstado("resultado");
    } catch (e) {
      setError(
        e instanceof ServicioIANoDisponible
          ? e.message
          : "No se pudo generar la simulación. Intentá de nuevo.",
      );
      setEstado("error");
    }
  };

  const guardar = () => {
    if (!pacienteId || !foto) return;
    const ahora = new Date();
    const id = guardadaId ?? `sim-${ahora.getTime()}`;
    const s: SimulacionGuardada = {
      id,
      fecha: ahora.toISOString(),
      pacienteId,
      profesional: usuario?.nombre ?? "Profesional",
      origen,
      foto,
      propuestas,
      estado: "Guardada",
      consentimiento,
      nota: "",
    };
    guardarSimulacion(s);
    // También queda en la historia del paciente (fotografías y simulaciones de su ficha).
    if (!guardadaId) {
      const hoy = ahora.toISOString().slice(0, 10);
      const base = ahora.getTime();
      cambiarRegistro(pacienteId, "fotografias", (p) => [
        ...p,
        {
          id: base,
          fecha: hoy,
          profesional: s.profesional,
          tipo: "Frontal sonrisa",
          observacion:
            origen === "demo"
              ? "Caso de demostración (simulador)"
              : "Foto para simulación de sonrisa",
          tratamientoId: null,
          pieza: "",
          archivoNombre: archivo || "sonrisa.jpg",
          url: foto,
        },
      ]);
      propuestas.forEach((pr, i) =>
        cambiarRegistro(pacienteId, "simulaciones", (p) => [
          ...p,
          {
            id: base + 1 + i,
            fecha: hoy,
            profesional: s.profesional,
            tipo: pr.titulo,
            fotografiaId: base,
            tratamientoId: null,
            imagenSimuladaNombre: `simulacion-${i + 1}.jpg`,
            imagenSimuladaUrl: pr.url,
            estado: "Guardada",
            observacion:
              "Simulación orientativa del Simulador de Sonrisa. No garantiza el resultado clínico.",
          },
        ]),
      );
    }
    setGuardadaId(id);
    setToast(
      propuestas.length
        ? `Simulación guardada en la historia de ${nombre}`
        : `Foto guardada en la historia de ${nombre}`,
    );
  };

  const exportar = async () => {
    if (!propuesta) return;
    const [a, d] = await Promise.all([cargar(foto), cargar(propuesta.url)]);
    const w = 760;
    const h = Math.round((a.height / a.width) * w);
    const c = document.createElement("canvas");
    c.width = w * 2 + 30;
    c.height = h + 110;
    const g = c.getContext("2d");
    if (!g) return;
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, c.width, c.height);
    g.drawImage(a, 10, 50, w, h);
    g.drawImage(d, w + 20, 50, w, h);
    g.fillStyle = "#4c1d95";
    g.font = "700 22px Inter, system-ui, sans-serif";
    g.fillText("Antes", 14, 34);
    g.fillText(`Simulación · ${propuesta.titulo}`, w + 24, 34);
    g.fillStyle = "#6b7280";
    g.font = "15px Inter, system-ui, sans-serif";
    g.fillText(
      `Cloud Esther · ${nombre || "Paciente"} · ${new Date().toLocaleDateString("es-AR")} · Simulación orientativa: no garantiza el resultado clínico.`,
      14,
      h + 86,
    );
    const link = document.createElement("a");
    link.href = c.toDataURL("image/png");
    link.download = `simulacion-sonrisa-${(nombre || "paciente").toLowerCase().replace(/\s+/g, "-")}.png`;
    link.click();
  };

  const imprimir = () => {
    if (!propuestas.length) return;
    imprimirHTML(
      `Propuesta estética · ${nombre}`,
      `<h1>Propuesta estética</h1><p style="color:#6b7280">${nombre} · ${new Date().toLocaleDateString("es-AR")}</p>
      <h2>Foto original</h2><img src="${foto}" style="max-width:100%;border-radius:12px">
      ${propuestas.map((p) => `<h2>${p.titulo}</h2><img src="${p.url}" style="max-width:100%;border-radius:12px">`).join("")}
      <p style="margin-top:24px;color:#6b7280;font-size:12px">Las imágenes son simulaciones orientativas y no representan una garantía del resultado clínico. El resultado real depende del estado bucal, la técnica y la respuesta de cada paciente.</p>`,
    );
  };

  const abrirGuardada = (s: SimulacionGuardada) => {
    setPacienteId(s.pacienteId);
    setFoto(s.foto);
    setOrigen(s.origen);
    setArchivo("");
    setPropuestas(s.propuestas);
    setActiva(0);
    setGuardadaId(s.id);
    setConsentimiento(s.consentimiento);
    setEstado(s.propuestas.length ? "resultado" : "lista");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="relative min-h-full overflow-clip bg-[#faf9ff]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_5%,rgba(124,58,237,0.15),transparent_28%),radial-gradient(circle_at_92%_12%,rgba(236,72,153,0.10),transparent_27%),linear-gradient(135deg,#f8f6ff_0%,#f3effd_48%,#faf8ff_100%)]"
      />
      <div className="relative mx-auto w-full max-w-[1420px] px-4 py-6 md:px-6 lg:px-8">
        {/* Encabezado */}
        <section className="relative overflow-hidden rounded-[30px] border border-primary/15 bg-gradient-to-br from-white via-white/96 to-primary/[0.045] shadow-[0_20px_55px_-38px_rgba(76,29,149,0.55)]">
          <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-primary/55 via-primary to-pink-400/60" />
          <div className="relative flex flex-wrap items-start justify-between gap-5 p-5 md:p-7">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/10 bg-primary/[0.07] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
                  <Smile className="size-3.5" />
                  Odontología digital
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold ${SERVICIO_IA_CONECTADO ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}
                >
                  <PlugZap className="size-3.5" />
                  {SERVICIO_IA_CONECTADO ? "IA Esther conectada" : "IA de simulación: próximamente"}
                </span>
              </div>
              <h1 className="mt-4 text-[32px] font-bold tracking-[-0.035em] md:text-[40px]">
                Simulador de Sonrisa con IA
              </h1>
              <p className="mt-2 max-w-2xl text-[13px] leading-6 text-muted-foreground md:text-sm">
                Cargá una foto de la sonrisa del paciente, elegí los tratamientos estéticos y
                mostrale propuestas de antes y después. Es independiente del odontograma 2D y 3D y
                queda guardado en su historia clínica.
              </p>
            </div>
            <div className="w-full max-w-xs">
              <label className="block">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  Paciente
                </span>
                <span className="relative block">
                  <select
                    aria-label="Paciente"
                    value={pacienteId ?? ""}
                    onChange={(e) => {
                      setPacienteId(Number(e.target.value));
                      setGuardadaId(null);
                    }}
                    className="h-10 w-full appearance-none rounded-xl border border-primary/15 bg-card pl-3 pr-8 text-sm font-medium outline-none focus:border-primary/45 focus:ring-4 focus:ring-primary/10"
                  >
                    {pacientes.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} {p.apellido}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                </span>
              </label>
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                {delPaciente.length
                  ? `${delPaciente.length} ${delPaciente.length === 1 ? "simulación guardada" : "simulaciones guardadas"}`
                  : "Sin simulaciones guardadas"}
              </p>
            </div>
          </div>
        </section>

        <p className="mt-4 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-2.5 text-[12.5px] text-amber-900">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
          Las imágenes generadas son simulaciones orientativas. No representan una garantía del
          resultado clínico ni reemplazan la evaluación del profesional.
        </p>

        <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_380px]">
          {/* Imagen principal */}
          <div className="card-grad min-w-0 p-4">
            {!foto ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setArrastre(true);
                }}
                onDragLeave={() => setArrastre(false)}
                onDrop={(e: DragEvent) => {
                  e.preventDefault();
                  setArrastre(false);
                  void cargarArchivo(e.dataTransfer.files[0]);
                }}
                className={`grid aspect-[19/13] w-full place-items-center rounded-2xl border-2 border-dashed p-6 text-center transition ${arrastre ? "border-primary bg-primary/[0.06]" : "border-primary/20 bg-primary/[0.02]"}`}
              >
                <div className="max-w-sm">
                  <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
                    <ImagePlus className="size-6" />
                  </span>
                  <p className="mt-3 text-base font-semibold">Cargá la foto de la sonrisa</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Foto de frente, con buena luz y la sonrisa completa. JPG, PNG o WEBP, hasta{" "}
                    {MAX_MB} MB.
                  </p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    <button type="button" className="btn-ce" onClick={() => input.current?.click()}>
                      <ImagePlus className="size-4" /> Elegir foto
                    </button>
                    <button type="button" className="btn-ce-outline" onClick={usarDemo}>
                      <Eye className="size-4" /> Probar con el caso de demostración
                    </button>
                  </div>
                  {aviso && (
                    <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-[12px] font-medium text-amber-800">
                      {aviso}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <FileImage className="size-4 shrink-0 text-primary" />
                    <p className="truncate text-sm font-semibold">
                      {origen === "demo"
                        ? "Caso de demostración (ilustración)"
                        : archivo || "Foto del paciente"}
                    </p>
                    {origen === "demo" && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                        Demo
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      className="btn-ce-outline"
                      onClick={() => input.current?.click()}
                    >
                      <RefreshCw className="size-3.5" /> Reemplazar
                    </button>
                    <button
                      type="button"
                      onClick={quitarFoto}
                      aria-label="Eliminar foto"
                      className="grid size-9 place-items-center rounded-xl border border-primary/12 bg-white text-muted-foreground transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
                {aviso && (
                  <p className="rounded-xl bg-amber-50 px-3 py-2 text-[12px] font-medium text-amber-800">
                    {aviso}
                  </p>
                )}

                {estado === "resultado" && propuesta ? (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap gap-1.5">
                        {propuestas.map((p, i) => (
                          <button
                            key={p.titulo}
                            type="button"
                            onClick={() => {
                              setActiva(i);
                              setVistaComparar("deslizador");
                            }}
                            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${i === activa && vistaComparar === "deslizador" ? "bg-primary text-primary-foreground" : "border border-primary/15 bg-white text-muted-foreground hover:text-foreground"}`}
                          >
                            {p.titulo}
                          </button>
                        ))}
                      </div>
                      {propuestas.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setVistaComparar((v) =>
                              v === "deslizador" ? "alternativas" : "deslizador",
                            )
                          }
                          className="btn-ce-outline"
                        >
                          <Columns2 className="size-3.5" />
                          {vistaComparar === "deslizador"
                            ? "Comparar alternativas"
                            : "Ver antes y después"}
                        </button>
                      )}
                    </div>
                    {vistaComparar === "deslizador" ? (
                      <Comparador antes={foto} despues={propuesta.url} />
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <figure className="overflow-hidden rounded-2xl border border-primary/10 bg-white">
                          <img
                            src={foto}
                            alt="Foto original"
                            className="aspect-[19/13] w-full object-cover"
                          />
                          <figcaption className="px-3 py-2 text-xs font-semibold">
                            Original
                          </figcaption>
                        </figure>
                        {propuestas.map((p, i) => (
                          <figure
                            key={p.titulo}
                            className="cursor-pointer overflow-hidden rounded-2xl border border-primary/10 bg-white transition hover:border-primary/40"
                            onClick={() => {
                              setActiva(i);
                              setVistaComparar("deslizador");
                            }}
                          >
                            <img
                              src={p.url}
                              alt={p.titulo}
                              className="aspect-[19/13] w-full object-cover"
                            />
                            <figcaption className="px-3 py-2 text-xs font-semibold text-primary">
                              {p.titulo}
                            </figcaption>
                          </figure>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="relative overflow-hidden rounded-2xl">
                    <img
                      src={foto}
                      alt="Foto original"
                      className="aspect-[19/13] w-full rounded-2xl object-cover"
                    />
                    {estado === "procesando" && (
                      <div className="absolute inset-0 grid place-items-center bg-primary/25 backdrop-blur-[2px]">
                        <div className="rounded-2xl bg-white/95 px-5 py-4 text-center shadow-xl">
                          <Loader2 className="mx-auto size-6 animate-spin text-primary" />
                          <p className="mt-2 text-sm font-semibold">Procesando la simulación…</p>
                          <p className="text-[11px] text-muted-foreground">
                            {tratamientos.length}{" "}
                            {tratamientos.length === 1 ? "tratamiento" : "tratamientos"}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {estado === "error" && (
                  <div className="flex items-start gap-3 rounded-2xl border border-primary/15 bg-primary/[0.04] p-4">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                      <PlugZap className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">Simulación no disponible todavía</p>
                      <p className="mt-0.5 text-[13px] text-muted-foreground">{error}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="btn-ce"
                          onClick={guardar}
                          disabled={!consentimiento}
                        >
                          <Save className="size-4" /> Guardar la foto en la historia
                        </button>
                        <button type="button" className="btn-ce-outline" onClick={usarDemo}>
                          <Eye className="size-4" /> Ver el caso de demostración
                        </button>
                      </div>
                      {!consentimiento && (
                        <p className="mt-2 text-[11px] text-muted-foreground">
                          Para guardar, confirmá el consentimiento del paciente en el panel.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            <input
              ref={input}
              type="file"
              accept={TIPOS.join(",")}
              hidden
              onChange={(e) => {
                void cargarArchivo(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </div>

          {/* Panel de tratamientos y acciones */}
          <div className="space-y-4">
            <div className="card-grad p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                Tratamientos a simular
              </p>
              <ul className="mt-2.5 space-y-1.5">
                {(Object.keys(TRATAMIENTOS_ESTETICOS) as TratamientoEstetico[]).map((t) => {
                  const Icon = ICONO[t];
                  const sel = tratamientos.includes(t);
                  return (
                    <li key={t}>
                      <button
                        type="button"
                        aria-pressed={sel}
                        onClick={() => alternar(t)}
                        className={`flex w-full items-start gap-2.5 rounded-2xl border px-3 py-2 text-left transition ${sel ? "border-primary/40 bg-primary/[0.06]" : "border-primary/10 bg-white hover:border-primary/25"}`}
                      >
                        <span
                          className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg ${sel ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"}`}
                        >
                          {sel ? <Check className="size-3.5" /> : <Icon className="size-3.5" />}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[13px] font-semibold">
                            {TRATAMIENTOS_ESTETICOS[t].nombre}
                          </span>
                          <span className="block text-[11px] leading-4 text-muted-foreground">
                            {TRATAMIENTOS_ESTETICOS[t].detalle}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <label className="mt-3 flex cursor-pointer items-start gap-2 text-[12px] text-muted-foreground">
                <input
                  type="checkbox"
                  checked={consentimiento}
                  onChange={(e) => setConsentimiento(e.target.checked)}
                  className="mt-0.5 size-4 accent-[var(--primary)]"
                />
                El paciente autorizó el uso de sus fotografías para esta simulación.
              </label>
              <button
                type="button"
                className="btn-ce mt-3 w-full justify-center"
                disabled={!foto || !tratamientos.length || estado === "procesando"}
                onClick={() => void generar()}
              >
                {estado === "procesando" ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Procesando…
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4" /> Generar simulación
                  </>
                )}
              </button>
              {!foto && (
                <p className="mt-2 text-center text-[11px] text-muted-foreground">
                  Primero cargá una foto.
                </p>
              )}
              {foto && origen === "paciente" && !SERVICIO_IA_CONECTADO && (
                <p className="mt-2 text-[11px] leading-4 text-muted-foreground">
                  Con fotos reales, la generación por IA se activa cuando se conecte el servicio de
                  IA Esther. Ya podés guardar la foto en la historia del paciente.
                </p>
              )}
            </div>

            {estado === "resultado" && (
              <div className="card-grad space-y-2 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  Propuesta
                </p>
                <button
                  type="button"
                  className="btn-ce w-full justify-center"
                  onClick={guardar}
                  disabled={!consentimiento || !pacienteId}
                >
                  <Save className="size-4" />{" "}
                  {guardadaId ? "Guardada en la historia" : "Guardar en la historia clínica"}
                </button>
                {!consentimiento && (
                  <p className="text-[11px] text-muted-foreground">
                    Confirmá el consentimiento para guardar.
                  </p>
                )}
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    className="btn-ce-outline justify-center"
                    onClick={() => setPresentando(true)}
                  >
                    <Maximize2 className="size-3.5" /> Presentar
                  </button>
                  <button
                    type="button"
                    className="btn-ce-outline justify-center"
                    onClick={() => void exportar()}
                  >
                    <Download className="size-3.5" /> Exportar
                  </button>
                  <button
                    type="button"
                    className="btn-ce-outline justify-center"
                    onClick={imprimir}
                  >
                    <Printer className="size-3.5" /> Imprimir
                  </button>
                </div>
              </div>
            )}

            <p className="flex items-start gap-2 px-1 text-[11px] leading-4 text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-primary" />
              Las fotos quedan solo en la clínica de esta cuenta y en la historia del paciente.
            </p>
          </div>
        </div>

        {/* Historial */}
        <section className="card-grad mt-5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <History className="size-4 text-primary" /> Historial de simulaciones
              {nombre && <span className="font-normal text-muted-foreground">· {nombre}</span>}
            </p>
          </div>
          {delPaciente.length === 0 ? (
            <p className="mt-3 rounded-2xl border border-dashed border-primary/15 bg-primary/[0.02] px-4 py-6 text-center text-sm text-muted-foreground">
              Todavía no hay simulaciones guardadas para este paciente.
            </p>
          ) : (
            <ul className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {delPaciente.map((s) => (
                <li
                  key={s.id}
                  className="overflow-hidden rounded-2xl border border-primary/10 bg-white"
                >
                  <div className="grid grid-cols-2">
                    <img
                      src={s.foto}
                      alt="Original"
                      className="aspect-[19/13] w-full object-cover"
                    />
                    {s.propuestas[0] ? (
                      <img
                        src={s.propuestas[0].url}
                        alt="Simulación"
                        className="aspect-[19/13] w-full object-cover"
                      />
                    ) : (
                      <div className="grid aspect-[19/13] place-items-center bg-primary/[0.04] text-[11px] text-muted-foreground">
                        Sin simulación
                      </div>
                    )}
                  </div>
                  <div className="space-y-1 p-3">
                    <p className="truncate text-[13px] font-semibold">
                      {s.propuestas.length
                        ? s.propuestas.map((p) => p.titulo).join(" · ")
                        : "Foto guardada"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {fechaHora(s.fecha)} · {s.profesional}
                      {s.origen === "demo" ? " · Caso de demostración" : ""}
                    </p>
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${s.estado === "Presentada al paciente" ? "bg-emerald-50 text-emerald-700" : "bg-primary/10 text-primary"}`}
                      >
                        {s.estado}
                      </span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          className="btn-ce-outline"
                          onClick={() => abrirGuardada(s)}
                        >
                          <Eye className="size-3.5" /> Ver
                        </button>
                        <button
                          type="button"
                          aria-label="Eliminar simulación"
                          onClick={() => {
                            if (window.confirm("¿Eliminar esta simulación del historial?"))
                              eliminarSimulacion(s.id);
                          }}
                          className="grid size-8 place-items-center rounded-xl border border-primary/12 text-muted-foreground transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Presentación al paciente */}
      {presentando && propuesta && (
        <div className="fixed inset-0 z-[80] flex flex-col bg-[#1b1033]/95 p-4 text-white md:p-8">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/60">
                Propuesta para
              </p>
              <p className="text-xl font-bold">{nombre}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setPresentando(false);
                if (guardadaId)
                  actualizarSimulacion(guardadaId, { estado: "Presentada al paciente" });
              }}
              className="grid size-10 place-items-center rounded-full bg-white/10 hover:bg-white/20"
              aria-label="Cerrar presentación"
            >
              <X className="size-5" />
            </button>
          </div>
          <div className="mx-auto mt-4 flex w-full max-w-5xl flex-1 flex-col justify-center gap-4">
            <div className="flex flex-wrap justify-center gap-1.5">
              {propuestas.map((p, i) => (
                <button
                  key={p.titulo}
                  type="button"
                  onClick={() => setActiva(i)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${i === activa ? "bg-white text-primary" : "bg-white/10 text-white/80 hover:bg-white/20"}`}
                >
                  {p.titulo}
                </button>
              ))}
            </div>
            <Comparador antes={foto} despues={propuesta.url} />
            <p className="text-center text-sm text-white/80">
              Esta imagen muestra una idea de cómo podría verse tu sonrisa con{" "}
              {propuesta.tratamientos.map((t) => TRATAMIENTOS_ESTETICOS[t].paciente).join(" y ")}.
              Es una simulación orientativa: el resultado real depende de tu caso y lo vas a
              conversar con tu odontólogo.
            </p>
          </div>
        </div>
      )}

      {toast && (
        <div
          role="status"
          className="fixed bottom-24 left-1/2 z-[70] -translate-x-1/2 rounded-full bg-foreground px-4 py-2 text-xs font-medium text-background shadow-xl"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
