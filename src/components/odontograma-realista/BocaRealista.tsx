import { lazy, Suspense, useEffect, useState } from "react";
import type { ViewName } from "./MouthScene";
import { ORDER, TYPE_LABEL } from "./anatomy";

/* Ubicación: src/components/odontograma-realista/BocaRealista.tsx
   Boca 3D realista (del repo «Real Eye Mouth»), integrada al demo como visor del odontograma /
   periodontograma. PASO 1: se ve y funciona (vistas, arcadas, abrir/cerrar, elegir pieza).
   PASO 2 (siguiente): se conectan los datos clínicos (estados, periodontograma, Esther).
   El modelo 3D (three.js) se descarga solo cuando se muestra, para no frenar el resto. */

const MouthScene = lazy(() => import("./MouthScene"));

const VIEW_LABELS: [ViewName, string][] = [
  ["front", "Frontal"],
  ["top", "Superior"],
  ["bottom", "Inferior"],
  ["side", "Lateral"],
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
  onSeleccion,
}: {
  pacienteNombre?: string;
  /** Para el PASO 2: avisar qué pieza eligió el profesional (para abrir su ficha clínica). */
  onSeleccion?: (id: number | null) => void;
}) {
  const [montado, setMontado] = useState(false);
  const [view, setView] = useState<ViewName>("front");
  const [nonce, setNonce] = useState(0);
  const [open, setOpen] = useState(true);
  const [upper, setUpper] = useState(true);
  const [lower, setLower] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);
  useEffect(() => setMontado(true), []);
  const info = selected ? describirPieza(selected) : null;
  const elegir = (id: number | null) => {
    setSelected(id);
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
            Periodoncia · Modelo 3D{pacienteNombre ? ` · ${pacienteNombre}` : ""}
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

      <div className="relative h-[520px] bg-[radial-gradient(circle_at_50%_30%,#f3efff,#ece6fb_60%,#e7e0f7)] dark:bg-[radial-gradient(circle_at_50%_30%,#1e1b3a,#151228)]">
        {montado ? (
          <Suspense
            fallback={
              <div className="grid h-full place-items-center text-sm text-muted-foreground">Cargando el modelo 3D…</div>
            }
          >
            <MouthScene
              view={view}
              nonce={nonce}
              open={open}
              selected={selected}
              onSelect={elegir}
              showUpper={upper}
              showLower={lower}
            />
          </Suspense>
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
      </div>
    </div>
  );
}
