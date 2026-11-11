import { Component, lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import type { ViewName, MatMode } from "./MouthScene";
import { ORDER, TYPE_LABEL } from "./anatomy";

/* Ubicación: src/components/odontograma-realista/BocaRealista.tsx
   Boca 3D realista (del repo «Real Eye Mouth»), integrada al demo como visor del odontograma /
   periodontograma. PASO 1: se ve y funciona (vistas, arcadas, abrir/cerrar, elegir pieza).
   PASO 2 (siguiente): se conectan los datos clínicos (estados, periodontograma, Esther).
   El modelo 3D (three.js) se descarga solo cuando se muestra, para no frenar el resto. */

const MouthScene = lazy(() => import("./MouthScene"));

/* Si el navegador no puede abrir el 3D (sin WebGL, poca memoria de video o demasiados contextos
   gráficos abiertos), en vez de tumbar toda la sección se muestra un aviso y un botón para
   recargar. Así el resto de la pantalla sigue usable. */
class Limite3D extends Component<
  { children: ReactNode },
  { error: boolean; intentos: number }
> {
  state = { error: false, intentos: 0 };
  timer: ReturnType<typeof setTimeout> | null = null;
  static getDerivedStateFromError() {
    return { error: true };
  }
  componentDidCatch(e: unknown) {
    console.error("[Boca 3D]", e);
    // Reintento automático: a veces el navegador libera un contexto gráfico y el 3D abre al
    // segundo intento. Se prueba hasta 2 veces antes de mostrar el aviso.
    if (this.state.intentos < 2) {
      this.timer = setTimeout(() => {
        this.setState((s) => ({ error: false, intentos: s.intentos + 1 }));
      }, 800);
    }
  }
  componentWillUnmount() {
    if (this.timer) clearTimeout(this.timer);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="grid h-full place-items-center text-sm text-muted-foreground">
          Abriendo el modelo 3D…
        </div>
      );
    }
    if (this.state.intentos >= 2) {
      // Falló aun con reintentos: aviso claro, sin tumbar la pantalla.
      return (
        <Reintento3D
          intentos={this.state.intentos}
          key={this.state.intentos}
          onReintentar={() => this.setState({ error: false, intentos: 0 })}
        >
          {this.props.children}
        </Reintento3D>
      );
    }
    return <div key={this.state.intentos}>{this.props.children}</div>;
  }
}

/* Último recurso: si tras los reintentos el navegador sigue sin poder abrir el 3D, se muestra un
   aviso con la causa más común (muchas pestañas) y un botón para reintentar sin recargar. */
function Reintento3D({
  children,
  onReintentar,
}: {
  children: ReactNode;
  intentos: number;
  onReintentar: () => void;
}) {
  return (
    <ReintentoBoundary onReintentar={onReintentar}>{children}</ReintentoBoundary>
  );
}

/* Diagnóstico de WebGL: intenta crear un contexto de prueba y dice qué encontró.
   Sirve para distinguir "no hay WebGL / aceleración apagada" de "demasiados contextos". */
function diagnosticoWebGL(): string {
  if (typeof document === "undefined") return "Sin navegador (render del servidor).";
  try {
    const lienzo = document.createElement("canvas");
    const gl =
      (lienzo.getContext("webgl2") as WebGLRenderingContext | null) ||
      (lienzo.getContext("webgl") as WebGLRenderingContext | null) ||
      (lienzo.getContext("experimental-webgl") as WebGLRenderingContext | null);
    if (!gl) {
      return "WebGL NO disponible en este navegador. Suele ser la aceleración por hardware apagada (Configuración → Sistema) o la placa de video en lista negra.";
    }
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : "desconocida";
    const software = /swiftshader|software|llvmpipe|basic render/i.test(renderer);
    return software
      ? `WebGL va por SOFTWARE (sin placa de video real): "${renderer}". La aceleración por hardware está apagada o no hay GPU disponible.`
      : `WebGL sí funciona en una prueba simple (placa: "${renderer}"). El fallo es al abrir ESTA escena: probablemente demasiados contextos 3D abiertos a la vez.`;
  } catch (e) {
    return `No se pudo ni probar WebGL: ${(e as Error)?.message ?? String(e)}`;
  }
}

class ReintentoBoundary extends Component<
  { children: ReactNode; onReintentar: () => void },
  { error: boolean; detalle: string; diag: string }
> {
  state = { error: false, detalle: "", diag: "" };
  static getDerivedStateFromError(e: unknown) {
    return {
      error: true,
      detalle: (e as Error)?.message ? String((e as Error).message) : String(e),
      diag: diagnosticoWebGL(),
    };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="grid h-full place-items-center p-6 text-center">
          <div className="max-w-sm">
            <p className="text-sm font-semibold text-foreground">No se pudo abrir la vista 3D</p>
            <p className="mx-auto mt-1 max-w-xs text-xs text-muted-foreground">
              Tu navegador no pudo iniciar el gráfico 3D. La causa más común es tener{" "}
              <strong>muchas pestañas abiertas</strong> (Chrome limita el 3D para todo el
              navegador). Cerrá las que no uses —sobre todo otras de Cloud Esther— y probá de nuevo.
            </p>
            <p className="mx-auto mt-2 max-w-xs rounded-lg bg-muted px-3 py-2 text-left text-[11px] leading-snug text-muted-foreground">
              <span className="font-semibold text-foreground">Diagnóstico:</span> {this.state.diag}
              {this.state.detalle && (
                <>
                  <br />
                  <span className="font-semibold text-foreground">Error:</span> {this.state.detalle}
                </>
              )}
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  this.setState({ error: false });
                  this.props.onReintentar();
                }}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
              >
                Reintentar
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted"
              >
                Recargar página
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const VIEW_LABELS: [ViewName, string][] = [
  ["front", "Frontal"],
  ["top", "Superior"],
  ["bottom", "Inferior"],
  ["side", "Lateral"],
];

/** Acabados del modelo 3D (como el visor STL de Oclu). */
const MAT_LABELS: [MatMode, string][] = [
  ["realista", "Realista"],
  ["yeso", "Yeso"],
  ["glossy", "Glossy"],
  ["wireframe", "Wireframe"],
];

/** Nombre y ubicación de la pieza por su número FDI. */
function describirPieza(id: number) {
  const quad = Math.floor(id / 10);
  const idx = (id % 10) - 1;
  const arcada = quad <= 2 ? "Arcada superior" : "Arcada inferior";
  const lado = quad === 1 || quad === 4 ? "derecha" : "izquierda";
  const tipo = ORDER[idx] ? TYPE_LABEL[ORDER[idx]] : "Pieza";
  return { nombre: tipo, donde: `${arcada} · ${lado}` };
}

export function BocaRealista({
  pacienteNombre,
  titulo = "Odontograma 3D",
  estados = {},
  selected: selectedProp,
  onSeleccion,
  mostrarInfo = true,
  leyenda,
}: {
  pacienteNombre?: string;
  /** Título que se muestra arriba: "Odontograma 3D" o "Periodoncia" según dónde se use. */
  titulo?: string;
  /** Color de cada pieza por su número FDI (estado clínico / periodontal). */
  estados?: Record<number, string>;
  /** Pieza elegida, controlada desde afuera (para sincronizar con la ficha clínica). */
  selected?: number | null;
  /** Avisa qué pieza eligió el profesional (para abrir su ficha clínica). */
  onSeleccion?: (id: number | null) => void;
  /** Mostrar el cartelito con el nombre de la pieza (se oculta cuando afuera ya hay ficha). */
  mostrarInfo?: boolean;
  /** Referencia de colores (leyenda de estados), opcional. */
  leyenda?: import("react").ReactNode;
}) {
  const [montado, setMontado] = useState(false);
  const [view, setView] = useState<ViewName>("front");
  const [nonce, setNonce] = useState(0);
  const [open, setOpen] = useState(true);
  const [upper, setUpper] = useState(true);
  const [lower, setLower] = useState(true);
  const [material, setMaterial] = useState<MatMode>("realista");
  const [selInterna, setSelInterna] = useState<number | null>(null);
  const selected = selectedProp !== undefined ? selectedProp : selInterna;
  useEffect(() => setMontado(true), []);
  const info = selected ? describirPieza(selected) : null;
  const elegir = (id: number | null) => {
    if (selectedProp === undefined) setSelInterna(id);
    onSeleccion?.(id);
  };

  const chip = (active: boolean) =>
    `rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-all ${
      active
        ? "bg-gradient-to-r from-primary to-fuchsia-500 text-white shadow-[0_8px_18px_-10px_rgba(124,58,237,0.9)]"
        : "border border-primary/15 bg-card text-muted-foreground hover:border-primary/35 hover:text-foreground"
    }`;

  return (
    <div className="card-grad overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-primary/10 bg-gradient-to-r from-primary/[0.07] via-fuchsia-500/[0.04] to-transparent px-4 py-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Boca 3D realista</p>
          <p className="font-display text-base font-bold leading-tight">
            {titulo} · Modelo 3D{pacienteNombre ? ` · ${pacienteNombre}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {VIEW_LABELS.map(([v, l]) => (
            <button
              key={v}
              type="button"
              className={chip(view === v)}
              onClick={() => {
                setView(v);
                setNonce((n) => n + 1);
              }}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="relative h-[380px] bg-[radial-gradient(circle_at_50%_30%,#f3efff,#ece6fb_60%,#e7e0f7)] dark:bg-[radial-gradient(circle_at_50%_30%,#1e1b3a,#151228)]">
        {montado ? (
          <Limite3D>
            <Suspense
              fallback={
                <div className="grid h-full place-items-center text-sm text-muted-foreground">Cargando el modelo 3D…</div>
              }
            >
              <MouthScene
                view={view}
                nonce={nonce}
                open={open}
                estados={estados}
                material={material}
                selected={selected}
                onSelect={elegir}
                showUpper={upper}
                showLower={lower}
              />
            </Suspense>
          </Limite3D>
        ) : (
          <div className="grid h-full place-items-center text-sm text-muted-foreground">Cargando el modelo 3D…</div>
        )}

        <div className="absolute left-4 top-4 flex flex-col gap-2">
          <button type="button" className={chip(upper)} onClick={() => setUpper((x) => !x || !lower)}>
            Arcada superior
          </button>
          <button type="button" className={chip(lower)} onClick={() => setLower((x) => !x || !upper)}>
            Arcada inferior
          </button>
          <button type="button" className={chip(open)} onClick={() => setOpen((x) => !x)}>
            {open ? "Boca abierta" : "En oclusión"}
          </button>
        </div>

        {/* Acabado del modelo 3D (como el visor STL de Oclu) */}
        <div className="absolute right-4 top-4 rounded-2xl border border-primary/12 bg-card/85 p-2 shadow-[0_18px_40px_-28px_rgba(76,29,149,0.7)] backdrop-blur">
          <p className="mb-1.5 px-1 text-[9px] font-bold uppercase tracking-[0.16em] text-primary">Acabado</p>
          <div className="flex flex-col gap-1.5">
            {MAT_LABELS.map(([m, l]) => (
              <button key={m} type="button" className={chip(material === m)} onClick={() => setMaterial(m)}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {leyenda && (
          <div className="absolute left-4 bottom-4 max-w-[60%] rounded-2xl border border-primary/12 bg-card/90 p-2.5 shadow-[0_18px_40px_-28px_rgba(76,29,149,0.7)] backdrop-blur">
            {leyenda}
          </div>
        )}
        {mostrarInfo && (
        <div className="absolute bottom-4 right-4 w-64 rounded-2xl border border-primary/12 bg-card/90 p-4 shadow-[0_18px_40px_-28px_rgba(76,29,149,0.7)] backdrop-blur">
          {info ? (
            <>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Pieza {selected}</p>
              <p className="mt-1 font-display text-lg font-bold">{info.nombre}</p>
              <p className="text-sm text-muted-foreground">{info.donde}</p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Tocá un diente para seleccionarlo. Arrastrá para rotar y usá la rueda para acercar.
            </p>
          )}
        </div>
        )}
        {/* Marca de versión: si ves "v4" es la última versión; si no, es caché viejo. */}
        <div className="pointer-events-none absolute bottom-1.5 right-2 text-[10px] font-bold text-primary/50">
          3D v4
        </div>
      </div>
    </div>
  );
}
