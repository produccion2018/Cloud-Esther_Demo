import { Component, type ReactNode } from "react";
import { Box, RotateCcw } from "lucide-react";

/* Ubicación: src/components/odontogram/Carga3D.tsx
   Estados de carga y error del Odontograma 3D. */

/** Indicador mientras se descarga y prepara el modelo 3D. */
export function Cargando3D() {
  return (
    <div className="grid h-full place-items-center bg-[#0f1720]">
      <div className="flex flex-col items-center gap-3 text-center text-white/85">
        <span className="relative grid size-14 place-items-center rounded-2xl bg-white/10">
          <Box className="size-6" />
          <span className="absolute inset-0 animate-spin rounded-2xl border-2 border-white/10 border-t-white/70" />
        </span>
        <p className="text-sm font-semibold">Preparando el modelo 3D…</p>
        <p className="max-w-xs text-xs text-white/55">
          Se cargan las 32 piezas, la boca y la iluminación. La próxima vez abre más rápido.
        </p>
      </div>
    </div>
  );
}

/** Si el 3D falla (conexión, WebGL no disponible), muestra el motivo y permite reintentar. */
export class Limite3D extends Component<
  { children: ReactNode; onReintentar: () => void },
  { error: Error | null }
> {
  override state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  override render() {
    if (!this.state.error) return this.props.children;
    const webgl = /webgl|context/i.test(this.state.error.message);
    return (
      <div className="grid h-full place-items-center bg-[#0f1720] p-6">
        <div className="max-w-sm text-center text-white/85">
          <p className="text-base font-semibold">No se pudo mostrar el odontograma 3D</p>
          <p className="mt-1 text-xs text-white/60">
            {webgl
              ? "Este navegador o equipo no tiene la aceleración 3D (WebGL) disponible. Probá con Chrome, Edge o Firefox actualizados."
              : "Hubo un problema al cargar el modelo. Revisá la conexión y volvé a intentar."}
          </p>
          <button
            type="button"
            onClick={() => {
              this.setState({ error: null });
              this.props.onReintentar();
            }}
            className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#0f1720]"
          >
            <RotateCcw className="size-3.5" /> Volver a intentar
          </button>
        </div>
      </div>
    );
  }
}
