import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, Clock3, HandCoins, ReceiptText, Wallet, type LucideIcon } from "lucide-react";

import { useTodosLosRegistros, type PresupuestoPaciente } from "@/components/cloud-esther/PacienteSecciones";
import { ars } from "@/components/cloud-esther/rrhh/ui";
import { MODULES, availableIn, useCloudEsther } from "@/lib/cloud-esther/data";

/* Ubicación: src/components/cloud-esther/dashboard/PresupuestosMes.tsx
   PRESUPUESTOS DEL MES (Dashboard, demo y clínica; solo si la clínica tiene Presupuestos):
   · Presupuestado: lo enviado o respondido este mes (sin borradores).
   · Aprobado: lo que los pacientes aprobaron este mes.
   · Esperando respuesta: todo lo enviado que todavía no se respondió.
   · Aceptación: aprobados sobre respondidos (aprobados + rechazados) del mes.
   · Cobrado del mes: pagos registrados en las cuentas de los pacientes este mes. */

const total = (p: PresupuestoPaciente) => {
  const sub = p.lineas.reduce((a, l) => a + l.cantidad * l.precio, 0);
  return sub - Math.round((sub * (p.descuentoPct ?? 0)) / 100);
};

export function PresupuestosMes() {
  const { plan } = useCloudEsther();
  const registros = useTodosLosRegistros();
  const modulo = MODULES.find((m) => m.id === "presupuestos");
  const visible = !!modulo && availableIn(modulo, plan);

  const d = useMemo(() => {
    const mes = new Date().toISOString().slice(0, 7);
    let presupuestado = 0;
    let nPres = 0;
    let aprobado = 0;
    let nApr = 0;
    let rechazados = 0;
    let esperando = 0;
    let nEsp = 0;
    let cobrado = 0;
    for (const r of Object.values(registros)) {
      for (const p of r.presupuestos ?? []) {
        const t = total(p);
        const enviadoMes = (p.enviado ?? p.fecha).startsWith(mes);
        const respondidoMes = (p.respondido ?? p.fecha).startsWith(mes);
        if (p.estado !== "Borrador" && enviadoMes) {
          presupuestado += t;
          nPres++;
        }
        if (p.estado === "Aprobado" && respondidoMes) {
          aprobado += t;
          nApr++;
        }
        if (p.estado === "Rechazado" && respondidoMes) rechazados++;
        if (p.estado === "Enviado") {
          esperando += t;
          nEsp++;
        }
      }
      for (const m of r.cuenta ?? []) if (m.tipo === "Pago" && m.fecha.startsWith(mes)) cobrado += m.monto;
    }
    const respondidos = nApr + rechazados;
    return {
      presupuestado,
      nPres,
      aprobado,
      nApr,
      esperando,
      nEsp,
      cobrado,
      aceptacion: respondidos ? Math.round((nApr / respondidos) * 100) : null,
      rechazados,
    };
  }, [registros]);

  if (!visible) return null;
  const nombreMes = new Date().toLocaleDateString("es-AR", { month: "long" });

  const tarjetas: [string, string, string, LucideIcon, string][] = [
    ["Presupuestado", ars(d.presupuestado), `${d.nPres} presupuesto${d.nPres === 1 ? "" : "s"}`, ReceiptText, "from-primary to-fuchsia-500"],
    ["Aprobado", ars(d.aprobado), `${d.nApr} aprobado${d.nApr === 1 ? "" : "s"}`, CheckCircle2, "from-emerald-500 to-teal-500"],
    ["Esperando respuesta", ars(d.esperando), `${d.nEsp} enviado${d.nEsp === 1 ? "" : "s"}`, Clock3, "from-amber-500 to-orange-500"],
    [
      "Aceptación",
      d.aceptacion === null ? "—" : `${d.aceptacion}%`,
      d.aceptacion === null ? "sin respuestas este mes" : `${d.nApr} de ${d.nApr + d.rechazados} respondidos`,
      HandCoins,
      "from-sky-500 to-indigo-500",
    ],
  ];

  return (
    <section className="rounded-3xl border border-primary/12 bg-card p-4 shadow-[0_18px_40px_-32px_rgba(76,29,149,0.7)] sm:p-5">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary to-fuchsia-500 text-white shadow-[0_10px_22px_-12px_rgba(124,58,237,0.9)]">
          <ReceiptText className="size-5" />
        </span>
        <div className="min-w-[10rem] flex-1">
          <h2 className="font-display text-[15px] font-bold tracking-tight">Presupuestos de {nombreMes}</h2>
          <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Wallet className="size-3.5 text-emerald-600" /> Cobrado este mes: <b className="text-foreground">{ars(d.cobrado)}</b>
          </p>
        </div>
        <Link to="/demo/presupuestos" className="btn-ce-outline !min-h-10">
          Ver presupuestos
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {tarjetas.map(([t, v, s, Icon, tono]) => (
          <div key={t} className="relative overflow-hidden rounded-2xl border border-primary/10 bg-card p-3">
            <span className={`absolute right-2.5 top-2.5 grid size-7 place-items-center rounded-lg bg-gradient-to-br ${tono} text-white`}>
              <Icon className="size-3.5" />
            </span>
            <p className="pr-8 text-[10.5px] font-bold uppercase tracking-[0.08em] text-muted-foreground">{t}</p>
            <p className="mt-1 truncate font-display text-lg font-bold tabular-nums">{v}</p>
            <p className="truncate text-[11px] text-muted-foreground">{s}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
