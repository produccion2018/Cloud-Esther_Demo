import { useEffect, useRef, useState } from "react";
import {
  Check,
  Copy,
  ImagePlus,
  Loader2,
  Printer,
  ShieldAlert,
  Sparkles,
  Smile,
} from "lucide-react";
import { usePacientes } from "@/lib/cloud-esther/pacientes";
import {
  cambiarRegistro,
  useRegistrosPacientes,
} from "@/components/cloud-esther/PacienteSecciones";
import { setIA } from "@/lib/cloud-esther/ia-store";
import { imprimirHTML } from "@/components/cloud-esther/rrhh/ui";
import { cargar, leerImagen, reducir, sonrisaEjemplo } from "./imagenes";

/* Simulador de sonrisa: simulación estética ORIENTATIVA a partir de una foto frontal.
   Demo: el procesamiento se hace en el navegador (aclara y empareja el tono de los dientes en la
   zona de la sonrisa). No es un resultado garantizado ni un diagnóstico.
   TODO backend: modelo generativo de diseño de sonrisa (segmentación de dientes + inpainting). */

const TRATAMIENTOS = [
  { id: "blanqueamiento", nombre: "Blanqueamiento", texto: "aclarar el tono de los dientes" },
  {
    id: "carillas",
    nombre: "Carillas",
    texto: "emparejar color y forma de los dientes frontales con carillas",
  },
  {
    id: "diseno",
    nombre: "Diseño de sonrisa",
    texto: "armonizar color, brillo y proporciones de la sonrisa",
  },
] as const;
type TratId = (typeof TRATAMIENTOS)[number]["id"];

async function simular(
  src: string,
  trat: TratId,
  intensidad: number,
  zona: { x: number; y: number; w: number; h: number },
) {
  const img = await cargar(src);
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const g = c.getContext("2d");
  if (!g) return src;
  g.drawImage(img, 0, 0);
  const datos = g.getImageData(0, 0, c.width, c.height);
  const d = datos.data;
  const cx = (zona.x / 100) * c.width;
  const cy = (zona.y / 100) * c.height;
  const rx = (zona.w / 200) * c.width;
  const ry = (zona.h / 200) * c.height;
  const k = intensidad / 100;
  const fuerza = trat === "blanqueamiento" ? 0.55 : trat === "carillas" ? 0.85 : 0.7;
  const objetivo = trat === "blanqueamiento" ? [246, 244, 236] : [250, 250, 246];
  for (let y = Math.max(0, Math.floor(cy - ry)); y < Math.min(c.height, cy + ry); y++)
    for (let x = Math.max(0, Math.floor(cx - rx)); x < Math.min(c.width, cx + rx); x++) {
      const e = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
      if (e > 1) continue;
      const i = (y * c.width + x) * 4;
      const r = d[i] ?? 0;
      const gg = d[i + 1] ?? 0;
      const b = d[i + 2] ?? 0;
      const max = Math.max(r, gg, b);
      const min = Math.min(r, gg, b);
      const lum = (max + min) / 2 / 255;
      const sat = max === min ? 0 : (max - min) / (255 - Math.abs(max + min - 255));
      // Solo píxeles "de diente": claros y poco saturados (evita labios, encía y piel).
      if (lum < 0.42 || sat > 0.55 || r - b > 90) continue;
      const borde = Math.min(1, (1 - e) * 4); // suaviza el borde de la zona
      const a = fuerza * k * borde * Math.min(1, (lum - 0.42) * 3);
      d[i] = r + ((objetivo[0] ?? 250) - r) * a;
      d[i + 1] = gg + ((objetivo[1] ?? 250) - gg) * a;
      d[i + 2] = b + ((objetivo[2] ?? 245) - b) * a;
    }
  g.putImageData(datos, 0, 0);
  return reducir(c, 900, 0.86);
}

export function EstherSonrisa({
  pacienteInicial,
  usuario,
  onToast,
}: {
  pacienteInicial?: number | undefined;
  usuario: string;
  onToast: (t: string) => void;
}) {
  const { pacientes } = usePacientes();
  const { de } = useRegistrosPacientes();
  const [pacienteId, setPacienteId] = useState<number | undefined>(
    pacienteInicial ?? pacientes[0]?.id,
  );
  const [antes, setAntes] = useState("");
  const [despues, setDespues] = useState("");
  const [archivo, setArchivo] = useState("");
  const [trat, setTrat] = useState<TratId>("blanqueamiento");
  const [intensidad, setIntensidad] = useState(70);
  const [zona, setZona] = useState({ x: 50, y: 58, w: 62, h: 34 });
  const [procesando, setProcesando] = useState(false);
  const [corte, setCorte] = useState(50);
  const [tratamientoId, setTratamientoId] = useState<number | "">("");
  const [explicacion, setExplicacion] = useState("");
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const caja = useRef<HTMLDivElement>(null);
  const paciente = pacientes.find((p) => p.id === pacienteId);
  const nombre = paciente ? `${paciente.nombre} ${paciente.apellido}` : "el paciente";
  const tratPaciente = pacienteId ? de(pacienteId).tratamientos : [];
  const def = TRATAMIENTOS.find((t) => t.id === trat)!;

  useEffect(() => {
    setExplicacion(
      `${paciente?.nombre ?? "Hola"}, esta es una simulación orientativa de cómo podría verse tu sonrisa con ${def.nombre.toLowerCase()}: la idea es ${def.texto}. ` +
        "No es una garantía del resultado: el resultado real depende del estado de tus dientes, de la técnica y de cómo responde cada persona. Tu odontólogo te va a explicar las opciones y los pasos.",
    );
  }, [trat, paciente?.nombre, def.nombre, def.texto]);

  const correr = async () => {
    if (!antes) return;
    setProcesando(true);
    await new Promise((r) => setTimeout(r, 500));
    setDespues(await simular(antes, trat, intensidad, zona));
    setProcesando(false);
    setCorte(50);
  };
  const subir = async (f: File | undefined) => {
    if (!f) return;
    try {
      setError("");
      setAntes(await leerImagen(f, 900));
      setArchivo(f.name);
      setDespues("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo leer la imagen");
    }
  };
  const arrastrar = (clientX: number) => {
    const r = caja.current?.getBoundingClientRect();
    if (r) setCorte(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)));
  };

  const guardar = () => {
    if (!pacienteId || !despues) return;
    const hoy = new Date().toISOString().slice(0, 10);
    const id = Date.now();
    cambiarRegistro(pacienteId, "fotografias", (p) => [
      ...p,
      {
        id,
        fecha: hoy,
        profesional: usuario,
        tipo: "Frontal sonrisa",
        observacion: "Foto base para simulación de sonrisa",
        tratamientoId: tratamientoId === "" ? null : tratamientoId,
        pieza: "",
        archivoNombre: archivo || "sonrisa.jpg",
        url: antes,
      },
    ]);
    cambiarRegistro(pacienteId, "simulaciones", (p) => [
      ...p,
      {
        id: id + 1,
        fecha: hoy,
        profesional: usuario,
        tipo: def.nombre,
        fotografiaId: id,
        tratamientoId: tratamientoId === "" ? null : tratamientoId,
        imagenSimuladaNombre: `simulacion-${def.id}.jpg`,
        imagenSimuladaUrl: despues,
        estado: "Guardada",
        observacion: `Simulación orientativa (${intensidad} %). ${explicacion}`,
      },
    ]);
    setIA("simulaciones", (p) =>
      [
        {
          id: `s-${id}`,
          fecha: new Date().toISOString(),
          pacienteId,
          tratamiento: def.nombre,
          intensidad,
          antes,
          despues,
          explicacion,
          guardada: true,
        },
        ...p,
      ].slice(0, 20),
    );
    onToast(`Simulación guardada en la documentación de ${nombre}`);
  };

  return (
    <div className="space-y-4">
      <p className="flex items-start gap-2 rounded-xl border border-amber-300/50 bg-amber-500/10 px-3 py-2 text-[12px]">
        <ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />
        Simulación estética orientativa. No es un diagnóstico ni garantiza el resultado clínico.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground sm:col-span-2">
          Paciente
          <select
            value={pacienteId ?? ""}
            onChange={(e) => {
              setPacienteId(Number(e.target.value));
              setTratamientoId("");
            }}
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
          Tratamiento a simular
          <select
            value={trat}
            onChange={(e) => setTrat(e.target.value as TratId)}
            className="mt-1 h-9 w-full rounded-xl border border-border bg-background px-2 text-sm font-normal normal-case tracking-normal text-foreground"
          >
            {TRATAMIENTOS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end">
          <button
            type="button"
            className="btn-ce-outline w-full"
            onClick={() => input.current?.click()}
          >
            <ImagePlus className="size-4" /> Foto frontal
          </button>
          <input
            ref={input}
            type="file"
            accept="image/*"
            className="hidden"
            aria-label="Foto frontal"
            onChange={(e) => void subir(e.target.files?.[0])}
          />
        </div>
      </div>
      {!antes ? (
        <div className="grid place-items-center rounded-2xl border border-dashed border-primary/30 bg-primary/[0.04] px-4 py-10 text-center">
          <Smile className="size-8 text-primary" />
          <p className="mt-2 text-sm font-semibold">Subí una foto frontal de la sonrisa</p>
          <p className="text-[12px] text-muted-foreground">
            Con buena luz, labios separados y los dientes visibles.
          </p>
          <button
            type="button"
            className="mt-3 text-[12px] font-semibold text-primary hover:underline"
            onClick={() => {
              setAntes(sonrisaEjemplo());
              setArchivo("sonrisa-ejemplo.jpg");
              setDespues("");
            }}
          >
            Usar una foto de ejemplo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.35fr_1fr]">
          <div>
            <div
              ref={caja}
              className="relative select-none overflow-hidden rounded-2xl border border-border"
              onPointerMove={(e) => e.buttons === 1 && despues && arrastrar(e.clientX)}
              onPointerDown={(e) => despues && arrastrar(e.clientX)}
            >
              <img src={antes} alt="Antes" className="block w-full" draggable={false} />
              {despues && (
                <img
                  src={despues}
                  alt="Simulación"
                  className="absolute inset-0 block h-full w-full"
                  style={{ clipPath: `inset(0 0 0 ${corte}%)` }}
                  draggable={false}
                />
              )}
              {!despues && (
                <div
                  className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-[50%] border-2 border-dashed border-white/90"
                  style={{
                    left: `${zona.x}%`,
                    top: `${zona.y}%`,
                    width: `${zona.w}%`,
                    height: `${zona.h}%`,
                    boxShadow: "0 0 0 9999px rgba(0,0,0,0.25)",
                  }}
                />
              )}
              {despues && (
                <>
                  <div
                    className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow"
                    style={{ left: `${corte}%` }}
                  >
                    <span className="absolute left-1/2 top-1/2 grid size-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-[11px] font-bold text-primary shadow">
                      ↔
                    </span>
                  </div>
                  <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-semibold text-white">
                    Antes
                  </span>
                  <span className="absolute right-2 top-2 rounded-full bg-primary/85 px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">
                    Simulación
                  </span>
                </>
              )}
              {procesando && (
                <div className="absolute inset-0 grid place-items-center bg-black/45 text-sm font-semibold text-white">
                  <span className="flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" /> Generando simulación…
                  </span>
                </div>
              )}
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              {despues
                ? "Deslizá sobre la imagen para comparar antes y después."
                : "Ajustá el óvalo para que cubra la sonrisa."}
            </p>
          </div>
          <div className="space-y-3">
            {!despues ? (
              <>
                {(
                  [
                    ["x", "Horizontal", 20, 80],
                    ["y", "Vertical", 20, 85],
                    ["w", "Ancho", 20, 90],
                    ["h", "Alto", 10, 60],
                  ] as const
                ).map(([k, l, min, max]) => (
                  <label key={k} className="block text-[11px] font-semibold text-muted-foreground">
                    {l}
                    <input
                      type="range"
                      min={min}
                      max={max}
                      value={zona[k]}
                      onChange={(e) => setZona((z) => ({ ...z, [k]: Number(e.target.value) }))}
                      className="w-full accent-[var(--primary)]"
                    />
                  </label>
                ))}
                <label className="block text-[11px] font-semibold text-muted-foreground">
                  Intensidad {intensidad} %
                  <input
                    type="range"
                    min={20}
                    max={100}
                    value={intensidad}
                    onChange={(e) => setIntensidad(Number(e.target.value))}
                    className="w-full accent-[var(--primary)]"
                  />
                </label>
                <button
                  type="button"
                  className="btn-ce w-full"
                  disabled={procesando}
                  onClick={() => void correr()}
                >
                  <Sparkles className="size-4" /> Simular sonrisa
                </button>
              </>
            ) : (
              <>
                <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Asociar al tratamiento
                  <select
                    value={tratamientoId}
                    onChange={(e) => setTratamientoId(e.target.value ? Number(e.target.value) : "")}
                    className="mt-1 h-9 w-full rounded-xl border border-border bg-background px-2 text-sm font-normal normal-case tracking-normal text-foreground"
                  >
                    <option value="">Sin asociar</option>
                    {tratPaciente.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nombre} {t.pieza ? `· pieza ${t.pieza}` : ""} ({t.estado})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Explicación para el paciente
                  <textarea
                    value={explicacion}
                    onChange={(e) => setExplicacion(e.target.value)}
                    className="scroll-sutil mt-1 h-32 w-full resize-none rounded-xl border border-border bg-background p-2.5 text-[12px] font-normal normal-case leading-relaxed tracking-normal text-foreground"
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn-ce" onClick={guardar}>
                    <Check className="size-4" /> Guardar en el paciente
                  </button>
                  <button
                    type="button"
                    className="btn-ce-outline"
                    onClick={() => {
                      void navigator.clipboard?.writeText(explicacion).catch(() => {});
                      onToast("Explicación copiada");
                    }}
                  >
                    <Copy className="size-4" /> Copiar
                  </button>
                  <button
                    type="button"
                    className="btn-ce-outline"
                    onClick={() =>
                      imprimirHTML(
                        `Simulación de sonrisa · ${nombre}`,
                        `<h1>Simulación de sonrisa</h1><p>${nombre} · ${def.nombre} · ${new Date().toLocaleDateString("es-AR")}</p><div style="display:flex;gap:12px"><div style="flex:1"><h2>Antes</h2><img src="${antes}" style="width:100%;border-radius:8px"></div><div style="flex:1"><h2>Simulación</h2><img src="${despues}" style="width:100%;border-radius:8px"></div></div><p style="white-space:pre-line">${explicacion.replace(/</g, "&lt;")}</p><p style="color:#6b7280;font-size:11px">Simulación orientativa generada con IA. No constituye diagnóstico ni garantía del resultado.</p>`,
                      )
                    }
                  >
                    <Printer className="size-4" /> PDF
                  </button>
                  <button type="button" className="btn-ce-outline" onClick={() => setDespues("")}>
                    Ajustar
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
