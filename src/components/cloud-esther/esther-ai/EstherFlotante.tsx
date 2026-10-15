import { lazy, Suspense, useState } from "react";
import { X } from "lucide-react";
import { estherPoses } from "./esther-states";

/* Ubicación: src/components/cloud-esther/esther-ai/EstherFlotante.tsx
   Esther a mano en todos los módulos (Plus y Enterprise): un botón flotante abre un chat
   compacto que ya sabe en qué módulo estás. El panel se carga recién al abrirlo. */

const Panel = lazy(() => import("./EstherPanelFlotante"));

export function EstherFlotante({ moduloId, modulo }: { moduloId: string; modulo: string }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      {abierto && (
        <Suspense
          fallback={
            <div className="fixed bottom-[calc(9rem+env(safe-area-inset-bottom))] right-4 z-[60] lg:bottom-24 lg:right-5 h-[560px] w-[min(400px,calc(100vw-2.5rem))] animate-pulse rounded-3xl border border-primary/15 bg-card shadow-2xl" />
          }
        >
          <Panel moduloId={moduloId} modulo={modulo} onClose={() => setAbierto(false)} />
        </Suspense>
      )}
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-label={abierto ? "Cerrar Esther" : "Preguntale a Esther"}
        title={abierto ? "Cerrar Esther" : "Preguntale a Esther"}
        className="group fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-4 z-[60] lg:bottom-5 lg:right-5 flex items-center gap-2.5 overflow-hidden rounded-full border border-primary/20 bg-card/95 p-1.5 sm:pr-4 shadow-[0_14px_34px_-14px_rgba(124,58,237,0.75)] backdrop-blur-md transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_20px_44px_-16px_rgba(124,58,237,0.85)]"
      >
        {/* Brillo que cruza el botón cada tanto (sutil; se apaga con «menos movimiento») */}
        {!abierto && <span aria-hidden className="ce-esther-brillo pointer-events-none absolute inset-0" />}
        <span aria-hidden className={abierto ? "relative grid size-10 shrink-0 place-items-center" : "ce-esther-flotar relative grid size-10 shrink-0 place-items-center"}>
          {!abierto && (
            <>
              {/* Halo que respira y anillo de luz que gira lento: tecnología, sin exagerar */}
              <span className="ce-esther-halo absolute -inset-1 rounded-full bg-gradient-to-br from-violet-500/45 via-fuchsia-500/35 to-sky-400/40 blur-[6px]" />
              <span className="ce-esther-giro absolute -inset-[2.5px] rounded-full bg-[conic-gradient(from_0deg,#8b5cf6,#d946ef,#ec4899,#38bdf8,#8b5cf6)]" />
            </>
          )}
          <span
            className="relative grid size-10 place-items-center rounded-full bg-gradient-to-b from-primary/15 to-primary/35 bg-no-repeat text-primary ring-2 ring-card"
            style={
              abierto
                ? {}
                : {
                    backgroundImage: `url(${estherPoses.resting.url})`,
                    backgroundSize: "auto 440%",
                    backgroundPosition: "50% 3%",
                  }
            }
          >
            {abierto && <X className="size-4" />}
          </span>
          {!abierto && (
            <span className="absolute -bottom-px -right-px flex size-3">
              <span className="absolute inline-flex size-full rounded-full bg-emerald-400 opacity-60 motion-safe:animate-ping [animation-duration:2.4s]" />
              <span className="relative inline-flex size-3 rounded-full border-2 border-card bg-emerald-500" />
            </span>
          )}
        </span>
        <span className="relative hidden text-left leading-tight sm:block">
          <span className="block bg-gradient-to-r from-foreground to-primary bg-clip-text text-xs font-semibold tracking-[-0.005em] text-transparent">
            Esther IA
          </span>
          <span className="block text-[10.5px] text-muted-foreground">
            {abierto ? "Cerrar" : "Preguntame algo"}
          </span>
        </span>
      </button>
    </>
  );
}
