import { Building2, Loader2, Plus, Send, TrendingUp, Users, UserRound, X } from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  actualizarLimitesSesion,
  comprarCapacidad,
  pedirCapacidad,
  verCapacidad,
  type CapacidadClinica,
  type PrecioCapacidad,
  type TipoCapacidad,
} from "@/lib/clinica/api";
import { useClinicaReal } from "@/lib/clinica/modo-clinica";
import { PLANS, useCloudEsther } from "@/lib/cloud-esther/data";
import { topeDe } from "@/lib/cloud-esther/planes-config";
import { usePreciosModulos } from "@/lib/cloud-esther/precios-modulos";

/* Ubicación: src/components/clinica/pedir-capacidad.tsx
   CAPACIDAD DEL PLAN (pacientes activos, personas del equipo, sucursales).
   · «Capacidad de tu plan» (en Mi plan): cuánto usa la clínica de cada cosa y botón «Sumar más».
   · «Sumar más»: si Cloud Esther publicó el precio (Panel › Planes y precios › Capacidad extra), la
     clínica elige cuánto suma (50, 100, 300 pacientes…), ve cuánto le cuesta y lo suma al instante:
     el límite sube en el momento y el cargo va en su PRÓXIMA FACTURA (con Paddle se cobra solo;
     si no, el panel recibe el aviso para facturarlo). Si no hay precio publicado, manda un pedido.
   · Barra «Usás X de Y» (Pacientes y Equipo): aparece desde el 80 %.
   Solo el Administrador suma o pide capacidad. Los pacientes archivados o inactivos no cuentan. */

const NOMBRE: Record<TipoCapacidad, { plural: string; unidad: string; una: string }> = {
  pacientes: { plural: "pacientes activos", unidad: "pacientes", una: "paciente" },
  usuarios: { plural: "personas del equipo", unidad: "personas", una: "persona" },
  sucursales: { plural: "sucursales", unidad: "sucursales", una: "sucursal" },
};
const OPCIONES: Record<TipoCapacidad, number[]> = {
  pacientes: [50, 100, 200, 300, 500, 1000],
  usuarios: [1, 2, 3, 5, 10],
  sucursales: [1, 2, 3],
};
const CLAVE_PRECIO: Record<TipoCapacidad, string> = {
  pacientes: "cap-pacientes",
  usuarios: "cap-usuarios",
  sucursales: "cap-sucursales",
};
const CADA: Record<TipoCapacidad, number> = { pacientes: 100, usuarios: 1, sucursales: 1 };
const miles = (n: number) => n.toLocaleString("es-AR");
const usd = (n: number) => `USD ${n.toLocaleString("es-AR", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;

/** Lo que cuesta sumar `cantidad` por período (mismo cálculo que el servidor). */
function costo(p: NonNullable<PrecioCapacidad>, cantidad: number) {
  const mensualCents = Math.ceil((Math.round(p.mensual * 100) * cantidad) / p.cada);
  const factor = p.mensual > 0 ? p.porPeriodo / p.mensual : 1;
  return Math.round(mensualCents * factor) / 100;
}

/** Datos de capacidad de MI clínica (real), con recarga. */
function useCapacidad() {
  const real = useClinicaReal();
  const [datos, setDatos] = useState<CapacidadClinica | null>(null);
  const recargar = useCallback(async () => {
    if (!real) return;
    try {
      setDatos(await verCapacidad(real.slug));
    } catch {
      /* sin conexión: no se muestra */
    }
  }, [real?.slug]);
  useEffect(() => {
    void recargar();
  }, [recargar]);
  return { datos, recargar };
}

/* ───────────── Tarjeta «Capacidad de tu plan» (Mi plan) ───────────── */

export function CapacidadDeMiPlan({ onToast, alCambiar }: { onToast?: (m: string) => void; alCambiar?: () => void }) {
  const real = useClinicaReal();
  const { plan } = useCloudEsther();
  const { datos, recargar } = useCapacidad();
  const [sumar, setSumar] = useState<TipoCapacidad | null>(null);
  if (real && real.rol !== "admin") return null;
  if (real && !datos) return null;

  const cada = datos?.ciclo === "anual" ? "por año" : "por mes";
  const filas: { tipo: TipoCapacidad; icono: ReactNode; usados: number | null; limite: number | null; extra: number }[] = [
    {
      tipo: "pacientes",
      icono: <UserRound className="size-4" />,
      usados: datos ? datos.uso.pacientes : null,
      limite: datos ? datos.limites.pacientes : topeDe(plan, "pacientes"),
      extra: datos?.extra.pacientes ?? 0,
    },
    {
      tipo: "usuarios",
      icono: <Users className="size-4" />,
      usados: datos ? datos.uso.usuarios : null,
      limite: datos ? datos.limites.usuarios : topeDe(plan, "usuarios"),
      extra: datos?.extra.usuarios ?? 0,
    },
    {
      tipo: "sucursales",
      icono: <Building2 className="size-4" />,
      usados: null,
      limite: datos ? datos.limites.sucursales : topeDe(plan, "sucursales"),
      extra: datos?.extra.sucursales ?? 0,
    },
  ];

  return (
    <div className="card-grad p-4">
      <div className="mb-3">
        <p className="text-sm font-semibold">Capacidad de tu plan</p>
        <p className="text-[12px] text-muted-foreground">
          Lo que trae tu plan {PLANS[plan].name}. Si necesitás más, sumalo acá sin cambiar de plan: se activa al instante
          {real ? " y el cargo va en tu próxima factura." : " (en el demo se muestra cómo funciona)."} Los pacientes
          archivados o inactivos no cuentan.
        </p>
        {!!datos?.importeActual && datos.importeActual > 0 && (
          <p className="mt-1 text-[12px] font-semibold text-primary">
            Hoy pagás por capacidad extra: {usd(datos.importeActual)} {cada}
          </p>
        )}
      </div>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {filas.map((f) => {
          const pct = f.usados !== null && f.limite ? Math.min(100, Math.round((f.usados / f.limite) * 100)) : null;
          return (
            <li key={f.tipo} className="rounded-2xl bg-card/90 px-3 py-2.5 ring-1 ring-primary/10">
              <div className="flex items-center gap-2">
                <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">{f.icono}</span>
                <div className="min-w-0 flex-1">
                  <b className="block text-[13px] font-semibold capitalize leading-snug">{NOMBRE[f.tipo].plural}</b>
                  <span className="block text-[11.5px] text-muted-foreground">
                    {f.limite === null
                      ? "Sin límite"
                      : f.usados !== null
                        ? `${miles(f.usados)} de ${miles(f.limite)}`
                        : `Hasta ${miles(f.limite)}`}
                    {f.extra > 0 ? ` (incluye +${miles(f.extra)} extra)` : ""}
                  </span>
                </div>
              </div>
              {pct !== null && (
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/[0.06]">
                  <div
                    className={`h-full rounded-full ${pct >= 100 ? "bg-destructive" : pct >= 90 ? "bg-amber-500" : "bg-primary"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              )}
              {f.limite !== null && (
                <button
                  type="button"
                  onClick={() => setSumar(f.tipo)}
                  className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-primary hover:underline"
                >
                  <Plus className="size-3.5" /> Sumar más
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <PedirCapacidadDialogo
        tipo={sumar ?? "pacientes"}
        abierto={!!sumar}
        datos={datos}
        onCerrar={() => setSumar(null)}
        onListo={(m) => {
          void recargar();
          alCambiar?.();
          onToast?.(m);
        }}
      />
    </div>
  );
}

/* ───────────── Barra «Usás X de Y» (Pacientes y Equipo) ───────────── */

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
          {esAdmin
            ? "Si necesitás más, sumalo al instante sin cambiar de plan."
            : "Si necesitan más, avisale al Administrador de tu clínica."}
        </p>
      </div>
      {esAdmin && (
        <Button size="sm" className="rounded-full" onClick={() => setAbierto(true)}>
          Sumar más capacidad
        </Button>
      )}
      <PedirCapacidadDialogo tipo={tipo} abierto={abierto} onCerrar={() => setAbierto(false)} />
    </div>
  );
}

/* ───────────── Ventana «Sumar más» (o pedido, si no hay precio) ───────────── */

export function PedirCapacidadDialogo({
  tipo,
  abierto,
  onCerrar,
  datos: datosDados,
  onListo,
}: {
  tipo: TipoCapacidad;
  abierto: boolean;
  onCerrar: () => void;
  /** Si ya se tienen los datos de capacidad (si no, se traen al abrir) */
  datos?: CapacidadClinica | null;
  /** Al sumar o pedir, con el mensaje para mostrar */
  onListo?: (mensaje: string) => void;
}) {
  const real = useClinicaReal();
  const preciosDemo = usePreciosModulos();
  const [datos, setDatos] = useState<CapacidadClinica | null>(datosDados ?? null);
  const [cantidad, setCantidad] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [modoPedido, setModoPedido] = useState(false);
  const [enviando, setEnviando] = useState(false);
  useEffect(() => {
    if (!abierto) {
      setCantidad("");
      setMensaje("");
      setModoPedido(false);
      return;
    }
    if (datosDados) setDatos(datosDados);
    else if (real) void verCapacidad(real.slug).then(setDatos).catch(() => undefined);
  }, [abierto, datosDados, real?.slug]);
  if (!abierto) return null;

  // Precio publicado: el del servidor (clínica real) o el del panel (demo)
  const precio: PrecioCapacidad = real
    ? (datos?.precios?.[tipo] ?? null)
    : preciosDemo[CLAVE_PRECIO[tipo]] !== undefined
      ? { cada: CADA[tipo], mensual: preciosDemo[CLAVE_PRECIO[tipo]]!, porPeriodo: preciosDemo[CLAVE_PRECIO[tipo]]! }
      : null;
  const cargando = !!real && !datos;
  const n = Number(cantidad.replace(/\D/g, "")) || 0;
  const cada = datos?.ciclo === "anual" ? "por año" : "por mes";
  const conPrecio = !!precio && !modoPedido;
  const esAdmin = !real || real.rol === "admin";

  const sumarAhora = async () => {
    if (!precio || n <= 0) return;
    setEnviando(true);
    try {
      if (!real) {
        const m = `Demo: +${miles(n)} ${NOMBRE[tipo].unidad} por ${usd(costo(precio, n))} ${cada}. En la clínica real sube el límite al instante y va en la próxima factura.`;
        toast.success(m);
        onListo?.(m);
        onCerrar();
        return;
      }
      const r = await comprarCapacidad(real.slug, { tipo, cantidad: n });
      actualizarLimitesSesion(real.slug, r.limites);
      const m = `Listo: +${miles(n)} ${NOMBRE[tipo].unidad}. Ya podés usarlos. Se suman ${usd(r.suma)} ${r.ciclo === "anual" ? "por año" : "por mes"} a tu próxima factura.`;
      toast.success(m);
      onListo?.(m);
      onCerrar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo sumar la capacidad. Probá de nuevo.");
    } finally {
      setEnviando(false);
    }
  };

  const enviarPedido = async () => {
    if (!real) {
      toast.success("Demo: en la clínica real el pedido le llega al panel de Cloud Esther.");
      onCerrar();
      return;
    }
    setEnviando(true);
    try {
      await pedirCapacidad(real.slug, { tipo, cantidad: n > 0 ? n : null, mensaje: mensaje.trim() });
      const m = "Listo: le avisamos a Cloud Esther. Te van a contactar con la propuesta.";
      toast.success(m);
      onListo?.(m);
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
      aria-label="Sumar más capacidad"
      onMouseDown={() => !enviando && onCerrar()}
    >
      <div
        className="relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-[24px] border border-primary/15 bg-card p-6 shadow-2xl"
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
        <h2 className="text-lg font-bold">Sumar más {NOMBRE[tipo].unidad}</h2>

        {!esAdmin ? (
          <p className="mt-2 text-sm text-muted-foreground">Solo el Administrador de la clínica puede sumar capacidad.</p>
        ) : cargando ? (
          <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Cargando precios…
          </p>
        ) : conPrecio && precio ? (
          <>
            <p className="mt-1 text-sm text-muted-foreground">
              {usd(precio.porPeriodo)} {cada} cada {precio.cada === 1 ? NOMBRE[tipo].una : `${miles(precio.cada)} ${NOMBRE[tipo].unidad}`}
              {datos?.ciclo === "anual" ? " (tu plan es anual, con su descuento)" : ""}. Se activa al instante, sin cambiar de
              plan, y va en tu <b>próxima factura</b>
              {datos?.cobroAutomatico ? " (se cobra solo con tu tarjeta)" : ""}. Precio sin impuestos.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {OPCIONES[tipo].map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => setCantidad(String(o))}
                  className={`rounded-full px-3 py-1.5 text-sm font-semibold ring-1 transition ${
                    n === o ? "bg-primary text-primary-foreground ring-primary" : "bg-card ring-primary/20 hover:ring-primary/40"
                  }`}
                >
                  +{miles(o)}
                </button>
              ))}
            </div>
            <label className="mt-3 block text-sm">
              <span className="mb-1.5 block font-semibold">Otra cantidad</span>
              <input
                inputMode="numeric"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder={tipo === "pacientes" ? "Ej.: 250" : "Ej.: 4"}
                className="h-11 w-full rounded-xl border border-input bg-card px-3 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
              />
            </label>
            {n > 0 && (
              <p className="mt-3 rounded-xl bg-primary/[0.06] px-3 py-2 text-sm">
                +{miles(n)} {NOMBRE[tipo].unidad}: <b>{usd(costo(precio, n))} {cada}</b>
                {datos?.importeActual ? ` (con lo que ya tenés: ${usd(datos.importeActual + costo(precio, n))} ${cada})` : ""}
              </p>
            )}
            <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                className="text-[12.5px] font-medium text-muted-foreground underline-offset-2 hover:underline"
                onClick={() => setModoPedido(true)}
              >
                Necesito otra cosa: hablar con Cloud Esther
              </button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onCerrar} disabled={enviando}>
                  Cancelar
                </Button>
                <Button onClick={() => void sumarAhora()} disabled={enviando || n <= 0}>
                  {enviando ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <Plus className="mr-1.5 size-4" />}
                  Sumar ahora
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            <p className="mt-1 text-sm text-muted-foreground">
              Le avisamos al equipo de Cloud Esther. Te contactan con el precio y, cuando lo confirmes, te suman la capacidad
              sin cambiar de plan ni perder nada.
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
              <Button onClick={() => void enviarPedido()} disabled={enviando}>
                {enviando ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <Send className="mr-1.5 size-4" />}
                Enviar pedido
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
