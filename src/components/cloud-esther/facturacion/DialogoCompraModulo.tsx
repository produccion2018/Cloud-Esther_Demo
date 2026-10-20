import { useEffect, useState } from "react";
import { Check, Loader2, ShieldCheck, Sparkles, X } from "lucide-react";

import { ModuleIcon } from "@/lib/cloud-esther/data";

/* Ubicación: src/components/cloud-esther/facturacion/DialogoCompraModulo.tsx
   Tarjeta de confirmación antes de contratar un módulo adicional.
   Muestra «¿Está seguro de que desea adquirir este módulo?», el módulo elegido y qué pasa al
   confirmar. Al aceptar ejecuta onConfirmar (que activa, registra y avisa). */

export function DialogoCompraModulo({
  abierto,
  modulo,
  precio,
  planContratado,
  onCerrar,
  onConfirmar,
}: {
  abierto: boolean;
  /** Módulo a contratar: nombre e ícono. */
  modulo: { label: string; icon: string } | null;
  /** Texto del cargo, si el backend lo informa (ej. "$ 12.000 / mes"). Opcional. */
  precio?: string;
  /** true en la clínica real (el cargo va a la próxima factura); false en el demo (se activa al instante). */
  planContratado?: boolean;
  onCerrar: () => void;
  /** Debe activar, registrar y avisar. Puede ser async (clínica real avisa al panel primero). */
  onConfirmar: () => void | Promise<void>;
}) {
  const [enviando, setEnviando] = useState(false);
  useEffect(() => {
    if (!abierto) setEnviando(false);
  }, [abierto]);
  if (!abierto || !modulo) return null;
  return (
    <div
      className="fixed inset-0 z-[90] grid place-items-center bg-[radial-gradient(circle_at_50%_30%,rgba(76,29,149,0.4),rgba(15,10,30,0.62))] p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Confirmar compra de módulo"
      onMouseDown={() => !enviando && onCerrar()}
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-[26px] border border-primary/15 bg-card p-6 text-center shadow-[0_40px_80px_-30px_rgba(76,29,149,0.6)]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-primary via-fuchsia-500 to-primary" />
        <span aria-hidden className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-fuchsia-400/15 blur-3xl" />
        {!enviando && (
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="absolute right-3 top-3 grid size-8 place-items-center rounded-xl text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        )}

        <span className="relative mx-auto mt-2 grid size-16 place-items-center rounded-[22px] bg-gradient-to-br from-primary to-fuchsia-500 text-white shadow-[0_16px_34px_-14px_rgba(124,58,237,0.9)]">
          <span aria-hidden className="absolute inset-0 rounded-[22px] bg-primary/30 motion-safe:animate-ping [animation-duration:2.6s]" />
          <ModuleIcon name={modulo.icon} className="relative size-7" />
        </span>

        <h2 className="relative mt-5 font-display text-xl font-bold tracking-tight text-foreground">
          ¿Está seguro de que desea adquirir este módulo?
        </h2>
        <p className="relative mt-1.5 text-sm text-muted-foreground">
          Vas a contratar{" "}
          <b className="font-semibold text-foreground">{modulo.label}</b>
          {precio ? ` · ${precio}` : ""}.
        </p>

        <div className="relative mt-4 space-y-2 rounded-2xl border border-primary/12 bg-gradient-to-br from-primary/[0.05] to-fuchsia-500/[0.04] p-3 text-left">
          <p className="flex items-start gap-2 text-[12.5px]">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>
              {planContratado
                ? "Se activa al instante y el cargo se suma a tu próxima factura de Cloud Esther."
                : "Se activa al instante para que lo pruebes en el demo."}
            </span>
          </p>
          <p className="flex items-start gap-2 text-[12.5px]">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" />
            <span>Queda registrado (módulo, fecha y hora) y se avisa a Administración, al socio y a la secretaría.</span>
          </p>
        </div>

        <div className="relative mt-5 flex justify-center gap-2">
          <button type="button" className="btn-ce-outline !min-h-11 flex-1 justify-center" disabled={enviando} onClick={onCerrar}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn-ce !min-h-11 flex-1 justify-center"
            disabled={enviando}
            onClick={async () => {
              setEnviando(true);
              try {
                await onConfirmar();
              } finally {
                setEnviando(false);
              }
            }}
          >
            {enviando ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            {enviando ? "Activando…" : "Sí, contratar"}
          </button>
        </div>
      </div>
    </div>
  );
}
