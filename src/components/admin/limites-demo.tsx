import { Crown, Infinity as Infinito, Plus, Timer, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Seccion } from "./bits";
import { INPUT } from "./formularios";
import { permisos, useRole } from "./role";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { CON_BACKEND, guardarConfigDemo } from "@/lib/admin/api";
import { useAccion, useConfigDemo } from "@/lib/admin/consultas";
import type { ConfigDemo } from "@/lib/admin/tipos";

/* Ubicación: src/components/admin/limites-demo.tsx
   El dueño decide cómo funciona el período de prueba del SaaS: si hay límite, cuánto dura cada
   ingreso, cuánto hay que esperar para volver a entrar y qué cuentas no tienen límite.
   El SaaS lo lee del servidor (GET /demo/config). Solo el Dueño puede cambiarlo. */

const MINUTOS = [15, 30, 45, 60, 90, 120];
const ESPERAS = [
  { v: 0, t: "Sin espera" },
  { v: 30, t: "30 minutos" },
  { v: 60, t: "1 hora" },
  { v: 120, t: "2 horas" },
  { v: 240, t: "4 horas" },
  { v: 1440, t: "1 día" },
];
const AVISOS = [1, 3, 5, 10];

export function useGuardarConfigDemo() {
  return useAccion(
    (a: { c: ConfigDemo; accion: string }) => guardarConfigDemo(a.c, a.accion),
    ["config-demo"],
    "Límites del demo guardados",
  );
}

export function LimitesDemo() {
  return CON_BACKEND ? <TiempoDemosNuevos /> : <LimitesDemoLocal />;
}

/** Con servidor: cada demo tiene su propio reloj (se maneja desde su detalle). Acá solo se
 *  elige cuánto tiempo recibe cada demo NUEVO y cuántos minutos antes se le avisa. */
function TiempoDemosNuevos() {
  const { role } = useRole();
  const editable = permisos.configurarDemo(role);
  const { data } = useConfigDemo();
  const guardar = useGuardarConfigDemo();
  const [cantidad, setCantidad] = useState("");
  const [unidad, setUnidad] = useState<"min" | "h" | "d">("min");
  const [aviso, setAviso] = useState(5);
  useEffect(() => {
    if (!data) return;
    const m = data.minutos;
    if (m % 1440 === 0) {
      setCantidad(String(m / 1440));
      setUnidad("d");
    } else if (m % 60 === 0) {
      setCantidad(String(m / 60));
      setUnidad("h");
    } else {
      setCantidad(String(m));
      setUnidad("min");
    }
    setAviso(data.avisoMinutos);
  }, [data]);
  if (!data) return null;
  const factor = unidad === "d" ? 1440 : unidad === "h" ? 60 : 1;
  const n = Number(cantidad.replace(",", "."));
  const minutos = Number.isFinite(n) ? Math.round(n * factor) : NaN;
  const valido = Number.isInteger(minutos) && minutos >= 1 && minutos <= 525_600;
  const cambiado = valido && (minutos !== data.minutos || aviso !== data.avisoMinutos);

  return (
    <Seccion
      titulo="Tiempo de los demos nuevos"
      descripcion="Cuánto tiempo recibe cada persona que se registra en el demo. A cada demo le podés dar más tiempo (o terminarlo) desde su detalle."
      acciones={
        editable && (
          <Button
            size="sm"
            disabled={!cambiado || guardar.isPending}
            onClick={() =>
              guardar.mutate({
                c: { ...data, minutos, avisoMinutos: aviso },
                accion: "Cambió el tiempo de los demos nuevos",
              })
            }
          >
            Guardar cambios
          </Button>
        )
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1.5">
          <span className="flex items-center gap-1.5 text-xs font-semibold">
            <Timer className="h-3.5 w-3.5 text-primary" /> Tiempo inicial de cada demo
          </span>
          <div className="flex gap-2">
            <input
              className={INPUT}
              inputMode="decimal"
              disabled={!editable}
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value.replace(/[^0-9.,]/g, ""))}
            />
            <select
              className={INPUT}
              disabled={!editable}
              value={unidad}
              onChange={(e) => setUnidad(e.target.value as "min" | "h" | "d")}
            >
              <option value="min">minutos</option>
              <option value="h">horas</option>
              <option value="d">días</option>
            </select>
          </div>
          {!valido && (
            <span className="block text-xs text-destructive">
              Entre 1 minuto y 1 año (en números enteros de minutos).
            </span>
          )}
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-semibold">Aviso antes de que termine</span>
          <select
            className={INPUT}
            disabled={!editable}
            value={aviso}
            onChange={(e) => setAviso(Number(e.target.value))}
          >
            {[0, 1, 3, 5, 10, 15, 30, 60].map((m) => (
              <option key={m} value={m}>
                {m === 0 ? "Sin aviso" : `${m} min antes`}
              </option>
            ))}
          </select>
        </label>
      </div>
      {!editable && (
        <p className="mt-4 text-xs text-muted-foreground">
          Solo el Dueño y el Socio pueden cambiar el tiempo de los demos nuevos.
        </p>
      )}
    </Seccion>
  );
}

function LimitesDemoLocal() {
  const { role } = useRole();
  const editable = permisos.configurarDemo(role);
  const { data } = useConfigDemo();
  const guardar = useGuardarConfigDemo();
  const [c, setC] = useState<ConfigDemo | null>(null);
  const [email, setEmail] = useState("");
  useEffect(() => {
    if (data) setC(data);
  }, [data]);
  if (!c) return null;
  const cambiado = JSON.stringify(c) !== JSON.stringify(data);
  const agregar = () => {
    const e = email.trim().toLowerCase();
    if (!e.includes("@") || c.exentos.includes(e)) return;
    setC({ ...c, exentos: [...c.exentos, e] });
    setEmail("");
  };

  return (
    <Seccion
      titulo="Límites del período de prueba"
      descripcion="Vos decidís cómo funciona el demo del SaaS. Los cambios se aplican en el próximo ingreso de cada persona."
      acciones={
        editable && (
          <Button
            size="sm"
            disabled={!cambiado || guardar.isPending}
            onClick={() => guardar.mutate({ c, accion: "Cambió los límites del demo" })}
          >
            Guardar cambios
          </Button>
        )
      }
    >
      <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-4">
          <label className="flex items-start justify-between gap-4 rounded-2xl border border-border p-4">
            <span>
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Timer className="h-4 w-4 text-primary" /> Límite de tiempo activado
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Si lo apagás, todos pueden usar el demo sin límite.
              </span>
            </span>
            <Switch
              checked={c.limiteActivo}
              disabled={!editable}
              onCheckedChange={(v) => setC({ ...c, limiteActivo: v })}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="space-y-1.5">
              <span className="text-xs font-semibold">Duración de cada ingreso</span>
              <select
                className={INPUT}
                disabled={!editable || !c.limiteActivo}
                value={c.minutos}
                onChange={(e) => setC({ ...c, minutos: Number(e.target.value) })}
              >
                {MINUTOS.map((m) => (
                  <option key={m} value={m}>
                    {m} minutos
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold">Espera para reingresar</span>
              <select
                className={INPUT}
                disabled={!editable || !c.limiteActivo}
                value={c.esperaMinutos}
                onChange={(e) => setC({ ...c, esperaMinutos: Number(e.target.value) })}
              >
                {ESPERAS.map((x) => (
                  <option key={x.v} value={x.v}>
                    {x.t}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold">Aviso antes del cierre</span>
              <select
                className={INPUT}
                disabled={!editable || !c.limiteActivo}
                value={c.avisoMinutos}
                onChange={(e) => setC({ ...c, avisoMinutos: Number(e.target.value) })}
              >
                {AVISOS.map((m) => (
                  <option key={m} value={m}>
                    {m} min antes
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="rounded-2xl border border-primary/15 bg-primary/[0.04] p-4 text-xs leading-relaxed text-muted-foreground">
            <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Crown className="h-4 w-4 text-primary" /> Tu acceso como dueño
            </p>
            <p className="mt-1">
              Entrá al SaaS por <b className="text-foreground">/dueno</b> (por ejemplo
              tusitio.com/dueno) con tu código de dueño. Así usás el SaaS sin límite y tus visitas
              no se cuentan como demos.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-border p-4">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Infinito className="h-4 w-4 text-primary" /> Cuentas sin límite
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Clínicas a las que les das tiempo libre para probar (por ejemplo, en una negociación).
            También podés activarlo desde el detalle de cada demo.
          </p>
          {editable && (
            <div className="mt-3 flex gap-2">
              <input
                className={INPUT}
                type="email"
                placeholder="correo@clinica.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), agregar())}
              />
              <Button type="button" variant="outline" onClick={agregar}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}
          <ul className="mt-3 space-y-1.5">
            {c.exentos.length === 0 && (
              <li className="text-xs text-muted-foreground">Ninguna por ahora.</li>
            )}
            {c.exentos.map((e) => (
              <li
                key={e}
                className="flex items-center justify-between gap-2 rounded-xl bg-muted/60 px-3 py-2 text-xs"
              >
                <span className="truncate font-medium">{e}</span>
                {editable && (
                  <button
                    type="button"
                    aria-label={`Quitar ${e}`}
                    onClick={() => setC({ ...c, exentos: c.exentos.filter((x) => x !== e) })}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
      {!editable && (
        <p className="mt-4 text-xs text-muted-foreground">
          Solo el Dueño puede cambiar estos límites.
        </p>
      )}
      {!CON_BACKEND && (
        <p className="mt-4 rounded-xl bg-warning/15 px-3 py-2 text-[11px] text-warning-foreground">
          Sin servidor conectado, estos límites se aplican al SaaS en este navegador. Para que
          valgan para todos los visitantes hace falta el backend. Por ahora el límite está apagado.
        </p>
      )}
    </Seccion>
  );
}

/** Interruptor «sin límite» para una cuenta, en el detalle de la demo. */
export function SinLimiteCuenta({ email }: { email: string }) {
  const { role } = useRole();
  const { data } = useConfigDemo();
  const guardar = useGuardarConfigDemo();
  if (!data) return null;
  const correo = email.toLowerCase();
  const exenta = data.exentos.includes(correo);
  return (
    <label className="flex items-center justify-between gap-3 rounded-2xl border border-border p-3">
      <span>
        <span className="block text-sm font-semibold">Sin límite de tiempo</span>
        <span className="block text-xs text-muted-foreground">
          Esta cuenta puede usar el demo sin el corte por tiempo ni la espera.
        </span>
      </span>
      <Switch
        checked={exenta}
        disabled={!permisos.configurarDemo(role) || guardar.isPending}
        onCheckedChange={(v) =>
          guardar.mutate({
            c: {
              ...data,
              exentos: v ? [...data.exentos, correo] : data.exentos.filter((x) => x !== correo),
            },
            accion: `${v ? "Quitó" : "Volvió a poner"} el límite del demo a ${correo}`,
          })
        }
      />
    </label>
  );
}
