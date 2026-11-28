import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowDownRight, ArrowUpRight, Building2, CalendarCheck, UserPlus, Wallet, AlertCircle } from "lucide-react";
import { storeAgenda } from "@/lib/cloud-esther/agenda-store";
import { usePacientes } from "@/lib/cloud-esther/pacientes";
import { useClinicSettings } from "@/lib/cloud-esther/settings-store";
import { useCloudEsther } from "@/lib/cloud-esther/data";
import { useLibro } from "@/components/cloud-esther/finanzas/libro";
import { useTodosLosRegistros } from "@/components/cloud-esther/PacienteSecciones";
import { deudaDe, paisFiscal } from "@/lib/cloud-esther/facturacion-store";
import { formatoMoneda } from "@/lib/cloud-esther/nomina-paises";
import { mesISO, nombreMes } from "@/lib/cloud-esther/finanzas-store";

/* Ubicación: src/components/cloud-esther/TableroSedes.tsx
   TABLERO DEL GRUPO: cada sede comparada con sus números reales del mes (y contra el mes
   anterior). Todo sale de lo cargado: Agenda (turnos, asistencia, pacientes nuevos), cobros
   (Facturación y «Cobrar hoy», por la sede del turno) y cuentas corrientes (lo que se debe,
   por la sede del paciente). Sin datos de ejemplo. */

type Fila = {
  sede: string;
  turnos: number;
  atendidos: number;
  ausentes: number;
  nuevos: number;
  cobrado: number;
  deuda: number;
  deudores: number;
  turnosAntes: number;
  cobradoAntes: number;
};

const OTRA = "Sin sede asignada";

export function TableroSedes({ nombreClinica }: { nombreClinica: string }) {
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);
  const { clinic } = useCloudEsther();
  const settings = useClinicSettings(clinic);
  const { turnos } = storeAgenda.usar();
  const { pacientes } = usePacientes();
  const registros = useTodosLosRegistros();
  const libro = useLibro();
  const [mesAtras, setMesAtras] = useState(0);
  if (!montado) return null;

  const moneda = paisFiscal(libro.fac.config.pais).moneda;
  const $ = (n: number) => formatoMoneda(Math.round(n), moneda);
  const sedes = settings.sucursales.length ? settings.sucursales : [nombreClinica];
  const mes = mesISO(mesAtras);
  const antes = mesISO(mesAtras + 1);
  const deSede = (s: string | undefined) => (s && sedes.includes(s) ? s : sedes.length === 1 ? sedes[0]! : OTRA);

  const filas = new Map<string, Fila>();
  const fila = (s: string) => {
    let f = filas.get(s);
    if (!f) filas.set(s, (f = { sede: s, turnos: 0, atendidos: 0, ausentes: 0, nuevos: 0, cobrado: 0, deuda: 0, deudores: 0, turnosAntes: 0, cobradoAntes: 0 }));
    return f;
  };
  for (const s of sedes) fila(s);

  // Turnos del mes (sin los cancelados), asistencia y pacientes atendidos por primera vez
  const primerTurno = new Map<string, { fecha: string; sede: string }>();
  for (const t of [...turnos].sort((a, b) => `${a.fecha}${a.hora}`.localeCompare(`${b.fecha}${b.hora}`))) {
    if (t.estado === "Cancelada") continue;
    const sede = deSede(t.sucursal);
    const quien = t.paciente.trim().toLowerCase();
    // Paciente nuevo = su primera atención en la clínica
    if (t.estado === "Atendida" && !primerTurno.has(quien)) primerTurno.set(quien, { fecha: t.fecha, sede });
    if (t.fecha.startsWith(mes)) {
      const f = fila(sede);
      f.turnos++;
      if (t.estado === "Atendida") f.atendidos++;
      if (t.estado === "Ausente") f.ausentes++;
    } else if (t.fecha.startsWith(antes)) fila(sede).turnosAntes++;
  }
  for (const p of primerTurno.values()) if (p.fecha.startsWith(mes)) fila(p.sede).nuevos++;

  // Lo cobrado (los ingresos de cada sede; lo general de la clínica no se reparte)
  for (const a of libro.operativos) {
    if (a.tipo !== "Ingreso" || !sedes.includes(a.sucursal)) continue;
    if (a.fecha.startsWith(mes)) fila(a.sucursal).cobrado += a.monto;
    else if (a.fecha.startsWith(antes)) fila(a.sucursal).cobradoAntes += a.monto;
  }

  // Lo que se debe hoy, por la sede del paciente
  for (const p of pacientes) {
    const { saldo } = deudaDe(registros[p.id]?.cuenta);
    if (saldo > 0) {
      const f = fila(deSede(p.sucursal));
      f.deuda += saldo;
      f.deudores++;
    }
  }

  const lista = [...filas.values()].filter((f) => f.sede !== OTRA || f.turnos || f.cobrado || f.deuda);
  const total = lista.reduce(
    (t, f) => ({ turnos: t.turnos + f.turnos, cobrado: t.cobrado + f.cobrado, deuda: t.deuda + f.deuda, nuevos: t.nuevos + f.nuevos }),
    { turnos: 0, cobrado: 0, deuda: 0, nuevos: 0 },
  );
  const maxCobrado = Math.max(1, ...lista.map((f) => f.cobrado));
  const mejor = lista.length > 1 && total.cobrado > 0 ? [...lista].sort((a, b) => b.cobrado - a.cobrado)[0]?.sede : null;
  const hayAlgo = total.turnos > 0 || total.cobrado > 0 || total.deuda > 0;

  const Cambio = ({ ahora, antes: a }: { ahora: number; antes: number }) => {
    if (!a) return null;
    const pct = Math.round(((ahora - a) / a) * 100);
    if (!pct) return <span className="text-[10.5px] text-muted-foreground">igual que el mes anterior</span>;
    const sube = pct > 0;
    return (
      <span className={`inline-flex items-center gap-0.5 text-[10.5px] font-semibold ${sube ? "text-emerald-600" : "text-rose-600"}`}>
        {sube ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
        {sube ? "+" : ""}
        {pct} % vs. {nombreMes(antes)}
      </span>
    );
  };

  return (
    <section className="rounded-3xl border border-primary/15 bg-card/85 p-5 shadow-sm backdrop-blur-md md:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Tus sedes en {nombreMes(mes, true)}</h2>
          <p className="text-xs text-muted-foreground">Con los números reales de cada sede: turnos, lo cobrado y lo que se debe.</p>
        </div>
        <div className="flex items-center gap-1 rounded-full border border-primary/15 bg-card p-1 text-xs font-semibold">
          {[0, 1].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setMesAtras(n)}
              className={`rounded-full px-3 py-1.5 transition ${mesAtras === n ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {n === 0 ? "Este mes" : "Mes pasado"}
            </button>
          ))}
        </div>
      </div>

      {!hayAlgo ? (
        <div className="rounded-2xl border border-dashed border-primary/25 bg-primary/[0.03] p-5 text-center text-sm text-muted-foreground">
          Todavía no hay turnos ni cobros en {nombreMes(mes, true)}. Cuando la Agenda y la caja empiecen a moverse, acá vas a ver cómo
          va cada sede.
          <div className="mt-3">
            <Link to={"/demo/agenda" as never} className="btn-ce-outline">
              Ir a la Agenda
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-4">
            {[
              { l: "Turnos", v: String(total.turnos), i: CalendarCheck },
              { l: "Cobrado", v: $(total.cobrado), i: Wallet },
              { l: "Pacientes nuevos", v: String(total.nuevos), i: UserPlus },
              { l: "Se debe hoy", v: $(total.deuda), i: AlertCircle },
            ].map((k) => (
              <div key={k.l} className="rounded-2xl bg-primary/[0.05] px-3 py-2.5">
                <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <k.i className="size-3.5 text-primary" /> {k.l}
                </p>
                <p className="mt-0.5 truncate text-lg font-bold tabular-nums text-foreground">{k.v}</p>
              </div>
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" data-movil="1col">
            {lista.map((f) => {
              const asistencia = f.atendidos + f.ausentes ? Math.round((f.atendidos / (f.atendidos + f.ausentes)) * 100) : null;
              return (
                <div key={f.sede} className={`rounded-2xl border bg-white/85 p-4 ${f.sede === mejor ? "border-primary/40 shadow-sm" : "border-primary/10"}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                        <Building2 className="size-4" />
                      </span>
                      <b className="truncate text-sm">{f.sede}</b>
                    </span>
                    {f.sede === mejor && (
                      <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10.5px] font-semibold text-primary">La que más cobró</span>
                    )}
                  </div>
                  <div className="mt-3">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[11px] text-muted-foreground">Cobrado</span>
                      <b className="text-base tabular-nums">{$(f.cobrado)}</b>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-primary/10">
                      <div className="h-full rounded-full bg-gradient-to-r from-primary to-fuchsia-500" style={{ width: `${(f.cobrado / maxCobrado) * 100}%` }} />
                    </div>
                    <Cambio ahora={f.cobrado} antes={f.cobradoAntes} />
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[12px]">
                    <dt className="text-muted-foreground">Turnos</dt>
                    <dd className="text-right font-semibold tabular-nums">
                      {f.turnos}
                      {f.turnosAntes > 0 && (
                        <span className="block font-normal">
                          <Cambio ahora={f.turnos} antes={f.turnosAntes} />
                        </span>
                      )}
                    </dd>
                    <dt className="text-muted-foreground">Asistencia</dt>
                    <dd className={`text-right font-semibold tabular-nums ${asistencia !== null && asistencia < 80 ? "text-amber-600" : ""}`}>
                      {asistencia === null ? "—" : `${asistencia} %`}
                      {f.ausentes > 0 && <span className="font-normal text-muted-foreground"> · {f.ausentes} no vino{f.ausentes === 1 ? "" : "eron"}</span>}
                    </dd>
                    <dt className="text-muted-foreground">Pacientes nuevos</dt>
                    <dd className="text-right font-semibold tabular-nums">{f.nuevos}</dd>
                    <dt className="text-muted-foreground">Se debe hoy</dt>
                    <dd className={`text-right font-semibold tabular-nums ${f.deuda > 0 ? "text-rose-600" : ""}`}>
                      {$(f.deuda)}
                      {f.deudores > 0 && <span className="font-normal text-muted-foreground"> · {f.deudores} pac.</span>}
                    </dd>
                  </dl>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Los cobros van a la sede del turno; lo que se debe, a la sede del paciente. Lo que es de toda la clínica (obras sociales, gastos generales) se ve en Finanzas.
          </p>
        </>
      )}
    </section>
  );
}
