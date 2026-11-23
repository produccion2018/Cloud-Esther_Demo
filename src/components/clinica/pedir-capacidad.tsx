import { Loader2, Send, TrendingUp, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { pedirCapacidad, type TipoCapacidad } from "@/lib/clinica/api";
import { useClinicaReal } from "@/lib/clinica/modo-clinica";

/* Ubicación: src/components/clinica/pedir-capacidad.tsx
   USO DEL PLAN + «PEDIR MÁS CAPACIDAD» (clínica real).
   Cuando la clínica se acerca al tope de su plan (pacientes activos, personas del equipo), ve
   cuánto usa y puede pedir más con un botón: el pedido le llega al panel de Cloud Esther, que le
   suma capacidad extra (con su precio) sin cambiar de plan. Solo el Administrador puede pedirla. */

const NOMBRE: Record<TipoCapacidad, { plural: string; unidad: string }> = {
  pacientes: { plural: "pacientes activos", unidad: "pacientes" },
  usuarios: { plural: "personas del equipo", unidad: "personas" },
  sucursales: { plural: "sucursales", unidad: "sucursales" },
};
const miles = (n: number) => n.toLocaleString("es-AR");

/** Barra «Usás X de Y». Aparece desde el 80 % (o siempre, con `siempre`). */
export function UsoDelPlan({
  tipo,
  usados,
  limite,
  siempre = false,
}: {
  tipo: TipoCapacidad;
  usados: number;
  limite: number | null;
  siempre?: boolean;
}) {
  const real = useClinicaReal();
  const [abierto, setAbierto] = useState(false);
  if (!real || limite === null || limite <= 0) return null;
  const pct = Math.min(100, Math.round((usados / limite) * 100));
  if (!siempre && pct < 80) return null;
  const lleno = usados >= limite;
  const esAdmin = real.rol === "admin";
  return (
    <div
      role="status"
      className={`flex flex-wrap items-center gap-3 rounded-2xl border px-4 py-3 text-sm ${
        lleno
          ? "border-destructive/30 bg-destructive/[0.06]"
          : pct >= 90
            ? "border-amber-500/35 bg-amber-500/[0.08]"
            : "border-primary/20 bg-primary/[0.04]"
      }`}
    >
      <TrendingUp className={`size-5 shrink-0 ${lleno ? "text-destructive" : "text-primary"}`} />
      <div className="min-w-[200px] flex-1">
        <p className="font-semibold">
          {lleno
            ? `Llegaste al límite de ${NOMBRE[tipo].plural} de tu plan (${miles(limite)}).`
            : `Usás ${miles(usados)} de ${miles(limite)} ${NOMBRE[tipo].plural} de tu plan.`}
        </p>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-black/[0.06]">
          <div
            className={`h-full rounded-full ${lleno ? "bg-destructive" : pct >= 90 ? "bg-amber-500" : "bg-primary"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-1 text-[11.5px] text-muted-foreground">
          {tipo === "pacientes"
            ? "Los pacientes archivados o inactivos no cuentan. "
            : tipo === "usuarios"
              ? "Las personas desactivadas no cuentan. "
              : ""}
          {esAdmin ? "Si necesitás más, pedilo y te lo sumamos sin cambiar de plan." : "Si necesitan más, avisale al Administrador de tu clínica."}
        </p>
      </div>
      {esAdmin && (
        <Button size="sm" className="rounded-full" onClick={() => setAbierto(true)}>
          Pedir más capacidad
        </Button>
      )}
      <PedirCapacidadDialogo tipo={tipo} abierto={abierto} onCerrar={() => setAbierto(false)} />
    </div>
  );
}

export function PedirCapacidadDialogo({
  tipo,
  abierto,
  onCerrar,
}: {
  tipo: TipoCapacidad;
  abierto: boolean;
  onCerrar: () => void;
}) {
  const real = useClinicaReal();
  const [cantidad, setCantidad] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);
  useEffect(() => {
    if (!abierto) {
      setCantidad("");
      setMensaje("");
    }
  }, [abierto]);
  if (!abierto || !real) return null;
  const enviar = async () => {
    setEnviando(true);
    try {
      const n = Number(cantidad.replace(/\D/g, ""));
      await pedirCapacidad(real.slug, { tipo, cantidad: n > 0 ? n : null, mensaje: mensaje.trim() });
      toast.success("Listo: le avisamos a Cloud Esther. Te van a contactar con la propuesta.");
      onCerrar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo enviar el pedido. Probá de nuevo.");
    } finally {
      setEnviando(false);
    }
  };
  return (
    <div
      className="fixed inset-0 z-[90] grid place-items-center bg-black/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Pedir más capacidad"
      onMouseDown={() => !enviando && onCerrar()}
    >
      <div
        className="relative w-full max-w-md rounded-[24px] border border-primary/15 bg-card p-6 shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar"
          className="absolute right-3 top-3 grid size-8 place-items-center rounded-xl text-muted-foreground hover:bg-muted"
        >
          <X className="size-4" />
        </button>
        <h2 className="text-lg font-bold">Pedir más {NOMBRE[tipo].unidad}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Le avisamos al equipo de Cloud Esther. Te contactan con el precio y, cuando lo confirmes, te suman la
          capacidad sin cambiar de plan ni perder nada.
        </p>
        <label className="mt-4 block text-sm">
          <span className="mb-1.5 block font-semibold">¿Cuántos {NOMBRE[tipo].unidad} más necesitás? (aprox.)</span>
          <input
            inputMode="numeric"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value.replace(/\D/g, "").slice(0, 7))}
            placeholder="Ej.: 500"
            className="h-11 w-full rounded-xl border border-input bg-card px-3 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
          />
        </label>
        <label className="mt-3 block text-sm">
          <span className="mb-1.5 block font-semibold">Mensaje (opcional)</span>
          <textarea
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value.slice(0, 500))}
            rows={3}
            placeholder="Ej.: Abrimos una sede nueva en marzo."
            className="w-full resize-none rounded-xl border border-input bg-card px-3 py-2 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
          />
        </label>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onCerrar} disabled={enviando}>
            Cancelar
          </Button>
          <Button onClick={() => void enviar()} disabled={enviando}>
            {enviando ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <Send className="mr-1.5 size-4" />}
            Enviar pedido
          </Button>
        </div>
      </div>
    </div>
  );
}
