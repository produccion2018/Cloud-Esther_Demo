import { CheckCircle2, Hourglass, History, Plus, TimerOff, TimerReset } from "lucide-react";
import { useEffect, useState } from "react";

import { INPUT } from "./formularios";
import { Button } from "@/components/ui/button";
import { atenderPedidoDemo, cambiarTiempoDemo } from "@/lib/admin/api";
import { useAccion, useHistorialTiempoDemo } from "@/lib/admin/consultas";
import { fecha } from "@/lib/admin/formato";
import type { CuentaDemo } from "@/lib/admin/tipos";
import { cn } from "@/lib/utils";

/* Ubicación: src/components/admin/reloj-demo.tsx
   El RELOJ de cada demo (con servidor). Dueño, Socio y Secretaría pueden:
   - darle más tiempo (minutos, horas o días),
   - dejarle un tiempo exacto desde ahora, o terminarlo,
   y ver el historial (quién, cuánto, cuándo vencía antes y después, y por qué).
   El servidor es el que cuenta el tiempo: lo que se ve acá es lo que dice el servidor. */

type Unidad = "min" | "h" | "d";
const FACTOR: Record<Unidad, number> = { min: 1, h: 60, d: 1440 };
const RAPIDOS: { t: string; min: number }[] = [
  { t: "+30 min", min: 30 },
  { t: "+1 h", min: 60 },
  { t: "+5 h", min: 300 },
  { t: "+1 día", min: 1440 },
  { t: "+2 días", min: 2880 },
  { t: "+3 días", min: 4320 },
];

/** "2 días 3 h 5 min" */
export function duracionTexto(totalMin: number) {
  if (totalMin <= 0) return "0 min";
  const d = Math.floor(totalMin / 1440);
  const h = Math.floor((totalMin % 1440) / 60);
  const m = Math.floor(totalMin % 60);
  return [d ? `${d} ${d === 1 ? "día" : "días"}` : "", h ? `${h} h` : "", m ? `${m} min` : ""]
    .filter(Boolean)
    .join(" ");
}

/** Cuenta regresiva que avanza sola (parte de lo que dijo el servidor). */
function useRestante(segundos: number | undefined) {
  const [base, setBase] = useState(() => Date.now());
  const [ahora, setAhora] = useState(() => Date.now());
  // Cada vez que llega un dato nuevo del servidor, la cuenta arranca de ahí
  useEffect(() => {
    const t = Date.now();
    setBase(t);
    setAhora(t);
  }, [segundos]);
  useEffect(() => {
    const t = window.setInterval(() => setAhora(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  if (segundos === undefined) return null;
  return Math.max(0, segundos - Math.floor((ahora - base) / 1000));
}

function restanteTexto(seg: number) {
  if (seg <= 0) return "Vencido";
  if (seg < 3600) {
    const m = Math.floor(seg / 60);
    const s = seg % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return duracionTexto(Math.floor(seg / 60));
}

export function RelojDemo({ demo, puedeGestionar }: { demo: CuentaDemo; puedeGestionar: boolean }) {
  const restante = useRestante(demo.restanteSegundos);
  const historial = useHistorialTiempoDemo(demo.id);
  const [modo, setModo] = useState<"sumar" | "dejar">("sumar");
  const [cantidad, setCantidad] = useState("1");
  const [unidad, setUnidad] = useState<Unidad>("h");
  const [motivo, setMotivo] = useState("");
  const [confirmarFin, setConfirmarFin] = useState(false);

  const cambiar = useAccion(
    (c: { modo: "sumar" | "dejar"; minutos: number; motivo?: string }) => cambiarTiempoDemo(demo.id, c),
    ["demos"],
    (c) =>
      c.modo === "sumar"
        ? `Le diste ${duracionTexto(c.minutos)} más`
        : c.minutos === 0
          ? "Demo terminado"
          : `Ahora le quedan ${duracionTexto(c.minutos)}`,
  );
  const atender = useAccion(
    (solicitudId: string) => atenderPedidoDemo(demo.id, solicitudId),
    ["demos"],
    "Pedido marcado como atendido",
  );

  const n = Number(cantidad.replace(",", "."));
  const minutos = Number.isFinite(n) ? Math.round(n * FACTOR[unidad]) : NaN;
  const valido =
    Number.isInteger(minutos) && minutos >= (modo === "sumar" ? 1 : 0) && minutos <= 525_600;
  const conMotivo = (min: number, m: "sumar" | "dejar") => ({
    modo: m,
    minutos: min,
    ...(motivo.trim() ? { motivo: motivo.trim() } : {}),
  });

  const vencido = restante !== null ? restante === 0 : !!demo.vencido;
  const pedidos = (demo.solicitudes ?? []).filter((s) => s.id);

  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/[0.03] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-bold">
            <Hourglass className="h-4 w-4 text-primary" /> Tiempo del demo
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Empezó {fecha(demo.inicio ?? demo.registrado, true)} · vence{" "}
            {demo.venceEl ? fecha(demo.venceEl, true) : "—"}
          </p>
        </div>
        <span
          className={cn(
            "rounded-full px-3 py-1 text-sm font-bold tabular-nums",
            vencido ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success",
          )}
        >
          {restante === null ? "—" : vencido ? "Vencido" : `Le quedan ${restanteTexto(restante)}`}
        </span>
      </div>

      {puedeGestionar && (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {RAPIDOS.map((r) => (
              <Button
                key={r.t}
                size="sm"
                variant="outline"
                disabled={cambiar.isPending}
                onClick={() => cambiar.mutate(conMotivo(r.min, "sumar"))}
              >
                {r.t}
              </Button>
            ))}
          </div>

          <div className="grid gap-2 sm:grid-cols-[auto_1fr_auto]">
            <select
              aria-label="Qué hacer"
              className={INPUT}
              value={modo}
              onChange={(e) => setModo(e.target.value as "sumar" | "dejar")}
            >
              <option value="sumar">Darle más tiempo</option>
              <option value="dejar">Que le quede exactamente</option>
            </select>
            <div className="flex gap-2">
              <input
                aria-label="Cantidad"
                className={INPUT}
                inputMode="decimal"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value.replace(/[^0-9.,]/g, ""))}
              />
              <select
                aria-label="Unidad"
                className={cn(INPUT, "w-28")}
                value={unidad}
                onChange={(e) => setUnidad(e.target.value as Unidad)}
              >
                <option value="min">minutos</option>
                <option value="h">horas</option>
                <option value="d">días</option>
              </select>
            </div>
            <Button
              disabled={!valido || cambiar.isPending}
              onClick={() => cambiar.mutate(conMotivo(minutos, modo))}
            >
              {modo === "sumar" ? <Plus className="mr-1 h-4 w-4" /> : <TimerReset className="mr-1 h-4 w-4" />}
              Aplicar
            </Button>
          </div>
          <input
            aria-label="Motivo"
            className={INPUT}
            maxLength={300}
            placeholder="Motivo (opcional): por ejemplo «lo pidió para mostrárselo al socio»"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
          {!valido && cantidad !== "" && (
            <p className="text-xs text-destructive">
              Poné un tiempo válido (como máximo 1 año{modo === "sumar" ? ", y más de 0" : ""}).
            </p>
          )}

          {!vencido &&
            (confirmarFin ? (
              <div className="flex flex-wrap items-center gap-2 rounded-xl bg-destructive/10 px-3 py-2 text-xs">
                <span className="font-semibold text-destructive">¿Terminar el demo ahora?</span>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={cambiar.isPending}
                  onClick={() => {
                    cambiar.mutate(conMotivo(0, "dejar"));
                    setConfirmarFin(false);
                  }}
                >
                  Sí, terminarlo
                </Button>
                <Button size="sm" variant="outline" onClick={() => setConfirmarFin(false)}>
                  No
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmarFin(true)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-destructive hover:underline"
              >
                <TimerOff className="h-3.5 w-3.5" /> Terminar el demo ahora
              </button>
            ))}
        </div>
      )}

      {/* Pedidos hechos desde el demo */}
      {pedidos.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
            Pedidos desde el demo
          </p>
          <ul className="mt-2 space-y-1.5">
            {pedidos.map((p) => (
              <li
                key={p.id}
                className={cn(
                  "rounded-xl px-3 py-2 text-xs",
                  p.atendida ? "bg-muted/60 text-muted-foreground" : "bg-warning/15",
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold">
                    {p.tipo} · {fecha(p.fecha, true)}
                  </span>
                  {p.atendida ? (
                    <span className="inline-flex items-center gap-1 text-success">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Atendido
                    </span>
                  ) : (
                    puedeGestionar && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={atender.isPending}
                        onClick={() => p.id && atender.mutate(p.id)}
                      >
                        Marcar atendido
                      </Button>
                    )
                  )}
                </div>
                {p.mensaje && <p className="mt-1 text-foreground/80">«{p.mensaje}»</p>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Historial del reloj */}
      <div className="mt-4">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
          <History className="h-3.5 w-3.5" /> Historial del tiempo
        </p>
        {historial.isLoading ? (
          <p className="mt-2 text-xs text-muted-foreground">Cargando…</p>
        ) : (historial.data ?? []).length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">Sin cambios todavía.</p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {(historial.data ?? []).map((h) => (
              <li key={h.id} className="rounded-xl border border-border/70 px-3 py-2 text-xs">
                <p className="font-semibold">
                  {h.modo === "inicial"
                    ? `Tiempo inicial: ${duracionTexto(h.minutos)}`
                    : h.modo === "sumar"
                      ? `+${duracionTexto(h.minutos)}`
                      : h.minutos === 0
                        ? "Lo terminó"
                        : `Le dejó ${duracionTexto(h.minutos)}`}{" "}
                  <span className="font-normal text-muted-foreground">
                    · {h.quien} · {fecha(h.fecha, true)}
                  </span>
                </p>
                <p className="text-muted-foreground">
                  {h.venciaAntes ? `Vencía ${fecha(h.venciaAntes, true)} → ` : ""}vence{" "}
                  {fecha(h.venceDespues, true)}
                  {h.motivo ? ` · «${h.motivo}»` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
