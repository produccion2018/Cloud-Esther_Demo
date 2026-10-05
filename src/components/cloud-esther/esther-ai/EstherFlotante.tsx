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
        className="group fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-4 z-[60] lg:bottom-5 lg:right-5 flex items-center gap-2 rounded-full border border-primary/20 bg-card p-1.5 sm:pr-4 shadow-[0_14px_34px_-14px_rgba(124,58,237,0.75)] transition hover:-translate-y-0.5 hover:border-primary/40"
      >
        <span
          aria-hidden
          className="grid size-10 place-items-center rounded-full bg-gradient-to-b from-primary/15 to-primary/35 bg-no-repeat text-primary"
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
        <span className="hidden text-left leading-tight sm:block">
          <span className="block text-xs font-bold text-foreground">Esther IA</span>
          <span className="block text-[10.5px] text-muted-foreground">
            {abierto ? "Cerrar" : "Preguntame algo"}
          </span>
        </span>
      </button>
    </>
  );
}
