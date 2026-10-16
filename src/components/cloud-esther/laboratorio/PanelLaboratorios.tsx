import { useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Building2,
  CheckCircle2,
  Clock3,
  FileSpreadsheet,
  FileText,
  FlaskConical,
  Lock,
  Mail,
  Phone,
  Plus,
  Search,
  Trash2,
  Wallet,
} from "lucide-react";

import { IconoWhatsApp } from "@/components/cloud-esther/IconoWhatsApp";
import {
  useRegistrosPacientes,
  useTodosLosRegistros,
  type TrabajoLaboratorio,
} from "@/components/cloud-esther/PacienteSecciones";
import { useCloudEsther, planLevel } from "@/lib/cloud-esther/data";
import { SUCURSAL_GENERAL, setFinanzas, storeFinanzas } from "@/lib/cloud-esther/finanzas-store";
import {
  cambiarLaboratorios,
  storeLaboratorios,
  type Laboratorio,
} from "@/lib/cloud-esther/laboratorios-store";
import { membreteHTML, useMarca } from "@/lib/cloud-esther/marca";
import { usePacientes } from "@/lib/cloud-esther/pacientes";
import { useSesion } from "@/lib/cloud-esther/auth-store";
import { useClinicaReal } from "@/lib/clinica/modo-clinica";
import { descargarPDF } from "@/lib/descargas";
import { normalizarBusqueda } from "@/lib/utils";

/* Ubicación: src/components/cloud-esther/laboratorio/PanelLaboratorios.tsx
   LABORATORIOS DENTALES (desde el plan Pro): todos los trabajos de la clínica en un lugar.
   - Órdenes: cada trabajo de cada paciente con su laboratorio, plazos y ALERTAS DE ATRASO;
     avanzar el estado, WhatsApp al laboratorio y PDF de la orden.
   - Laboratorios: directorio y CUENTA CORRIENTE de cada uno (lo que se le debe por trabajos
     listos/entregados menos lo pagado). Registrar un pago lo pasa a Finanzas (egreso
     «Laboratorio») cuando el plan y el usuario lo permiten.
   - Reportes: 6 reportes con exportación a Excel.
   Los trabajos se cargan en la ficha del paciente (sección Laboratorio). Datos por empresa. */

type Vista = "ordenes" | "laboratorios" | "reportes";
type Fila = { pid: number; paciente: string; t: TrabajoLaboratorio };

const ESTADOS = ["Enviado", "En proceso", "Listo para retirar", "Entregado"] as const;
const COLOR_ESTADO: Record<string, string> = {
  Enviado: "bg-sky-100 text-sky-700",
  "En proceso": "bg-violet-100 text-violet-700",
  "Listo para retirar": "bg-amber-100 text-amber-700",
  Entregado: "bg-emerald-100 text-emerald-700",
};
const INPUT =
  "h-10 w-full rounded-xl border border-primary/15 bg-card px-3 text-sm outline-none transition focus:border-primary/45 focus:ring-4 focus:ring-primary/10";
const pesos = (n: number) => `$ ${Math.round(n).toLocaleString("es-AR")}`;
const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const fechaCorta = (f: string) => (f ? f.split("-").reverse().join("/") : "—");
const mismo = (a: string, b: string) => normalizarBusqueda(a).trim() === normalizarBusqueda(b).trim();
const esc = (t: string) =>
  t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);
const activo = (t: TrabajoLaboratorio) => t.estado === "Enviado" || t.estado === "En proceso";
const atrasado = (t: TrabajoLaboratorio) => activo(t) && !!t.fechaEntregaEstimada && t.fechaEntregaEstimada < hoyISO();
const adeuda = (t: TrabajoLaboratorio) => t.estado === "Listo para retirar" || t.estado === "Entregado";
const diasEntre = (a: string, b: string) =>
  Math.round((new Date(`${b}T12:00:00`).getTime() - new Date(`${a}T12:00:00`).getTime()) / 86_400_000);

function whatsapp(tel: string, texto: string) {
  const n = tel.replace(/\D/g, "");
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(texto)}` : null;
}

export function PanelLaboratorios({ onToast }: { onToast: (m: string) => void }) {
  const { plan } = useCloudEsther();
  const [vista, setVista] = useState<Vista>("ordenes");
  const registros = useTodosLosRegistros();
  const { pacientes } = usePacientes();
  const { laboratorios, pagos } = storeLaboratorios.usar();

  const filas: Fila[] = useMemo(
    () =>
      pacientes.flatMap((p) =>
        (registros[p.id]?.laboratorio ?? []).map((t) => ({ pid: p.id, paciente: `${p.nombre} ${p.apellido}`, t })),
      ),
    [pacientes, registros],
  );

  if (planLevel(plan) < 2)
    return (
      <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-primary/25 bg-gradient-to-br from-primary/[0.05] to-fuchsia-500/[0.05] px-6 py-12 text-center">
        <span className="grid size-14 place-items-center rounded-full bg-gradient-to-br from-primary to-fuchsia-500 text-white shadow-lg">
          <Lock className="size-6" />
        </span>
        <p className="font-display text-lg font-bold">Panel de laboratorios: desde el plan Pro</p>
        <p className="max-w-md text-sm text-muted-foreground">
          Todas las órdenes en un lugar, alertas de atraso, cuenta corriente con cada laboratorio, WhatsApp, PDF de la orden y reportes.
        </p>
      </div>
    );

  const enCurso = filas.filter((f) => activo(f.t)).length;
  const atrasos = filas.filter((f) => atrasado(f.t)).length;
  const listos = filas.filter((f) => f.t.estado === "Listo para retirar").length;
  const deuda = laboratorios.reduce((a, l) => a + saldoDe(l, filas, pagos), 0);

  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-[26px] bg-[linear-gradient(118deg,#4c1d95,#7c3aed_45%,#c026d3)] p-5 text-white shadow-[0_26px_60px_-36px_rgba(91,33,182,0.95)]">
        <div aria-hidden className="pointer-events-none absolute -right-12 -top-16 size-56 rounded-full bg-fuchsia-300/30 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:16px_16px] [mask-image:linear-gradient(100deg,transparent_45%,black)]" />
        <div className="relative flex flex-wrap items-center gap-4">
          <span className="grid size-12 place-items-center rounded-2xl border border-white/30 bg-white/15">
            <FlaskConical className="size-6" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.2em] text-white/70">Laboratorios dentales</p>
            <h2 className="font-display text-xl font-bold tracking-tight">Órdenes, cuenta corriente y reportes</h2>
            <p className="text-sm text-white/85">{laboratorios.length} laboratorios · {filas.length} trabajos</p>
          </div>
          <div className="inline-flex gap-1 rounded-2xl bg-white/15 p-1 backdrop-blur" role="tablist">
            {(
              [
                ["ordenes", "Órdenes"],
                ["laboratorios", "Laboratorios"],
                ["reportes", "Reportes"],
              ] as const
            ).map(([id, l]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={vista === id}
                onClick={() => setVista(id)}
                className={`min-h-9 rounded-xl px-3.5 text-[13px] font-semibold transition ${vista === id ? "bg-white text-primary shadow" : "text-white/85 hover:bg-white/10"}`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {(
          [
            ["En curso", String(enCurso), Clock3, "from-primary to-fuchsia-500"],
            ["Atrasados", String(atrasos), AlertTriangle, "from-rose-500 to-pink-500"],
            ["Listos para retirar", String(listos), CheckCircle2, "from-amber-500 to-orange-500"],
            ["Deuda con laboratorios", pesos(deuda), Wallet, "from-emerald-500 to-teal-500"],
          ] as const
        ).map(([t, v, I, c]) => (
          <div key={t} className="relative overflow-hidden rounded-3xl border border-primary/10 bg-card p-4 shadow-[0_18px_40px_-30px_rgba(76,29,149,0.6)]">
            <span aria-hidden className={`absolute -right-10 -top-12 size-32 rounded-full bg-gradient-to-br ${c} opacity-15 blur-2xl`} />
            <div className="relative flex items-start justify-between gap-2">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{t}</p>
              <span className={`grid size-10 place-items-center rounded-2xl bg-gradient-to-br ${c} text-white shadow-md`}>
                <I className="size-[18px]" />
              </span>
            </div>
            <p className="relative mt-1.5 truncate font-display text-[26px] font-bold tabular-nums">{v}</p>
          </div>
        ))}
      </div>

      {vista === "ordenes" && <Ordenes filas={filas} laboratorios={laboratorios} onToast={onToast} />}
      {vista === "laboratorios" && <Directorio filas={filas} onToast={onToast} />}
      {vista === "reportes" && <Reportes filas={filas} laboratorios={laboratorios} onToast={onToast} />}
    </div>
  );
}

function saldoDe(l: Laboratorio, filas: Fila[], pagos: { labId: string; monto: number }[]) {
  const debe = filas.filter((f) => mismo(f.t.proveedor, l.nombre) && adeuda(f.t)).reduce((a, f) => a + (f.t.costo || 0), 0);
  const pagado = pagos.filter((p) => p.labId === l.id).reduce((a, p) => a + p.monto, 0);
  return Math.max(0, debe - pagado);
}

/* ───────────── Órdenes ───────────── */

function Ordenes({ filas, laboratorios, onToast }: { filas: Fila[]; laboratorios: Laboratorio[]; onToast: (m: string) => void }) {
  const { cambiar } = useRegistrosPacientes();
  const marca = useMarca();
  const { clinica } = useSesion();
  const [q, setQ] = useState("");
  const [lab, setLab] = useState("");
  const [filtro, setFiltro] = useState<"activos" | "atrasados" | "listos" | "todos">("activos");
  const labDe = (t: TrabajoLaboratorio) => laboratorios.find((l) => mismo(l.nombre, t.proveedor));
  const lista = filas
    .filter((f) => (filtro === "activos" ? activo(f.t) : filtro === "atrasados" ? atrasado(f.t) : filtro === "listos" ? f.t.estado === "Listo para retirar" : true))
    .filter((f) => !lab || mismo(f.t.proveedor, lab))
    .filter((f) => !q || normalizarBusqueda(`${f.paciente} ${f.t.tipo} ${f.t.pieza} ${f.t.proveedor}`).includes(normalizarBusqueda(q)))
    .sort((a, b) => Number(atrasado(b.t)) - Number(atrasado(a.t)) || (a.t.fechaEntregaEstimada || "9").localeCompare(b.t.fechaEntregaEstimada || "9"));

  const avanzar = (f: Fila) => {
    const i = ESTADOS.indexOf(f.t.estado as (typeof ESTADOS)[number]);
    const sig = ESTADOS[Math.min(ESTADOS.length - 1, i + 1)]!;
    if (sig === f.t.estado) return;
    cambiar(f.pid, "laboratorio", (prev) =>
      prev.map((x) => (x.id === f.t.id ? { ...x, estado: sig, historial: [...(x.historial ?? []).filter((h) => h.estado !== sig), { estado: sig, fecha: hoyISO() }] } : x)),
    );
    onToast(`${f.t.tipo} de ${f.paciente}: ${sig.toLowerCase()}`);
  };
  const pdf = async (f: Fila) => {
    const l = labDe(f.t);
    const html = `<!doctype html><html><head><meta charset="utf-8"><style>
      body{font-family:"Plus Jakarta Sans",Arial,sans-serif;color:#1e1b2e;margin:0;padding:34px 40px;font-size:12.5px}
      h1{font-family:Sora,Arial,sans-serif;font-size:20px;margin:0 0 4px}.sub{color:#6b6189;margin-bottom:16px}
      table{width:100%;border-collapse:collapse}th{text-align:left;width:34%;color:#6b6189;font-weight:600;padding:8px;border-bottom:1px solid #f1eefb}td{padding:8px;border-bottom:1px solid #f1eefb}
      .firma{margin-top:60px;display:flex;gap:40px}.firma div{flex:1;border-top:1px solid #9e93bd;padding-top:6px;text-align:center;color:#6b6189}
    </style></head><body>${membreteHTML(marca, clinica?.nombre ?? "Clínica")}
    <h1>Orden de trabajo de laboratorio</h1><div class="sub">Orden N.º ${f.pid}-${f.t.id} · ${fechaCorta(f.t.fechaEnvio)}</div>
    <table>
      <tr><th>Laboratorio</th><td>${esc(f.t.proveedor || "—")}${l?.telefono ? ` · ${esc(l.telefono)}` : ""}</td></tr>
      <tr><th>Paciente</th><td>${esc(f.paciente)}</td></tr>
      <tr><th>Trabajo</th><td>${esc(f.t.tipo)}</td></tr>
      <tr><th>Pieza / zona</th><td>${esc(f.t.pieza || "—")}</td></tr>
      <tr><th>Material</th><td>${esc(f.t.material || "—")}</td></tr>
      <tr><th>Color (VITA)</th><td>${esc(f.t.color || "—")}</td></tr>
      <tr><th>Profesional</th><td>${esc(f.t.profesional || "—")}</td></tr>
      <tr><th>Entrega pedida</th><td>${fechaCorta(f.t.fechaEntregaEstimada)}</td></tr>
      <tr><th>Indicaciones</th><td>${esc(f.t.notas || "—")}</td></tr>
    </table>
    <div class="firma"><div>Firma del profesional</div><div>Recibido por el laboratorio</div></div></body></html>`;
    const ok = await descargarPDF(html, `Orden laboratorio ${f.paciente} ${f.t.tipo}`);
    onToast(ok ? "PDF de la orden descargado" : "No se pudo armar el PDF");
  };

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary/70" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar paciente, trabajo o pieza" className={`${INPUT} pl-10`} />
        </label>
        <select value={lab} onChange={(e) => setLab(e.target.value)} className={`${INPUT} !w-auto`} aria-label="Laboratorio">
          <option value="">Todos los laboratorios</option>
          {[...new Set([...laboratorios.map((l) => l.nombre), ...filas.map((f) => f.t.proveedor).filter(Boolean)])].map((n) => (
            <option key={n}>{n}</option>
          ))}
        </select>
        <div className="inline-flex gap-1 rounded-2xl border border-primary/10 bg-card p-1" role="tablist">
          {(
            [
              ["activos", "En curso"],
              ["atrasados", "Atrasados"],
              ["listos", "Listos"],
              ["todos", "Todos"],
            ] as const
          ).map(([id, l]) => (
            <button key={id} type="button" role="tab" aria-selected={filtro === id} onClick={() => setFiltro(id)} className={`min-h-8 rounded-xl px-3 text-xs font-semibold transition ${filtro === id ? "bg-gradient-to-r from-primary to-fuchsia-500 text-white" : "text-muted-foreground hover:text-foreground"}`}>
              {l}
            </button>
          ))}
        </div>
      </div>
      {lista.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-primary/25 px-4 py-10 text-center text-sm text-muted-foreground">
          No hay trabajos en esta vista. Se cargan en la ficha de cada paciente → Laboratorio.
        </p>
      ) : (
        <ul className="space-y-2">
          {lista.map((f) => {
            const l = labDe(f.t);
            const tarde = atrasado(f.t);
            const wa = l
              ? whatsapp(l.telefono, `Hola ${l.contacto || l.nombre}, te escribimos por el trabajo de ${f.t.tipo}${f.t.pieza ? ` (pieza ${f.t.pieza})` : ""} del paciente ${f.paciente}, enviado el ${fechaCorta(f.t.fechaEnvio)}. ¿Cómo viene?`)
              : null;
            return (
              <li key={`${f.pid}-${f.t.id}`} className={`flex flex-wrap items-center gap-3 rounded-2xl border bg-card p-3 shadow-[0_14px_30px_-26px_rgba(76,29,149,0.7)] ${tarde ? "border-rose-300 ring-2 ring-rose-100" : "border-primary/10"}`}>
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary/15 to-fuchsia-500/10 text-primary">
                  <FlaskConical className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">
                    {f.t.tipo}
                    {f.t.pieza ? ` · pieza ${f.t.pieza}` : ""}
                  </span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {f.paciente} · {f.t.proveedor || "Sin laboratorio"} · enviado {fechaCorta(f.t.fechaEnvio)} · entrega {fechaCorta(f.t.fechaEntregaEstimada)}
                  </span>
                </span>
                {tarde && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-500 px-2.5 py-1 text-[10.5px] font-bold text-white">
                    <AlertTriangle className="size-3" /> {diasEntre(f.t.fechaEntregaEstimada, hoyISO())} días de atraso
                  </span>
                )}
                <span className={`rounded-full px-2.5 py-1 text-[10.5px] font-bold ${COLOR_ESTADO[f.t.estado] ?? "bg-muted"}`}>{f.t.estado}</span>
                <div className="flex w-full flex-wrap gap-1.5 sm:w-auto">
                  {f.t.estado !== "Entregado" && (
                    <button type="button" onClick={() => avanzar(f)} className="btn-ce !min-h-9">
                      <CheckCircle2 className="size-4" /> {f.t.estado === "Listo para retirar" ? "Entregado" : "Avanzar"}
                    </button>
                  )}
                  {wa && (
                    <a href={wa} target="_blank" rel="noreferrer" className="btn-wa !min-h-9">
                      <IconoWhatsApp /> WhatsApp
                    </a>
                  )}
                  <button type="button" onClick={() => void pdf(f)} className="btn-ce-outline !min-h-9">
                    <FileText className="size-4" /> PDF
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/* ───────────── Directorio y cuenta corriente ───────────── */

function Directorio({ filas, onToast }: { filas: Fila[]; onToast: (m: string) => void }) {
  const { laboratorios, pagos } = storeLaboratorios.usar();
  const { plan } = useCloudEsther();
  const real = useClinicaReal();
  const { usuario } = useSesion();
  const fin = storeFinanzas.usar();
  const [nuevo, setNuevo] = useState({ nombre: "", contacto: "", telefono: "", email: "" });
  const [pagando, setPagando] = useState<string | null>(null);
  const [monto, setMonto] = useState("");
  const [medio, setMedio] = useState("Transferencia");
  // Pasar el pago a Finanzas: plan con Finanzas (Pro+) y, en una clínica real, solo el Administrador
  const aFinanzas = planLevel(plan) >= 2 && (!real || real.rol === "admin") && fin.cuentas.length > 0;
  const quien = usuario?.nombre ?? "Administración";

  const pagar = (l: Laboratorio) => {
    const n = Number(monto.replace(/[^0-9]/g, ""));
    if (!n) return;
    const fecha = hoyISO();
    const id = `pl-${Date.now()}`;
    cambiarLaboratorios((e) => ({ ...e, pagos: [...e.pagos, { id, labId: l.id, fecha, monto: n, medio, nota: "", por: quien }] }));
    if (aFinanzas) {
      const movId = `mv-${Date.now()}`;
      setFinanzas("movimientos", (p) => [
        ...p,
        { id: movId, fecha, tipo: "Egreso", categoria: "Laboratorio", concepto: `Pago a ${l.nombre}`, monto: n, cuentaId: fin.cuentas[0]!.id, sucursal: SUCURSAL_GENERAL, origen: "Proveedores", comprobante: "", ref: `labpago:${id}` },
      ]);
      // Los trabajos que cubre el pago dejan de figurar como «por cargar» en Cuentas a pagar
      let resto = n;
      const cubiertos: string[] = [];
      for (const f of filas
        .filter((x) => mismo(x.t.proveedor, l.nombre) && adeuda(x.t) && !fin.laboratorioRegistrado.includes(`${x.pid}:${x.t.id}`))
        .sort((a, b) => a.t.fechaEnvio.localeCompare(b.t.fechaEnvio))) {
        if (resto < (f.t.costo || 0)) break;
        resto -= f.t.costo || 0;
        cubiertos.push(`${f.pid}:${f.t.id}`);
      }
      if (cubiertos.length) setFinanzas("laboratorioRegistrado", (p) => [...p, ...cubiertos]);
    }
    setPagando(null);
    setMonto("");
    onToast(`Pago de ${pesos(n)} a ${l.nombre} registrado${aFinanzas ? " y pasado a Finanzas" : ""}`);
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
      <ul className="grid gap-3 md:grid-cols-2">
        {laboratorios.map((l) => {
          const trabajos = filas.filter((f) => mismo(f.t.proveedor, l.nombre));
          const debe = trabajos.filter((f) => adeuda(f.t)).reduce((a, f) => a + (f.t.costo || 0), 0);
          const pagado = pagos.filter((p) => p.labId === l.id).reduce((a, p) => a + p.monto, 0);
          const saldo = Math.max(0, debe - pagado);
          const tel = l.telefono.replace(/\D/g, "");
          return (
            <li key={l.id} className="relative overflow-hidden rounded-3xl border border-primary/12 bg-card p-4 shadow-[0_18px_40px_-32px_rgba(76,29,149,0.7)]">
              <span aria-hidden className="pointer-events-none absolute -right-14 -top-16 size-40 rounded-full bg-gradient-to-br from-primary/12 to-fuchsia-400/12 blur-3xl" />
              <div className="relative flex items-start gap-3">
                <span className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-primary to-fuchsia-500 text-white shadow-md">
                  <Building2 className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-bold">{l.nombre}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {l.contacto || "Sin contacto"} · {trabajos.filter((f) => activo(f.t)).length} en curso · plazo {l.plazoDias} días
                  </p>
                </div>
                <button type="button" aria-label="Quitar laboratorio" onClick={() => cambiarLaboratorios((e) => ({ ...e, laboratorios: e.laboratorios.filter((x) => x.id !== l.id) }))} className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-rose-50 hover:text-rose-600">
                  <Trash2 className="size-4" />
                </button>
              </div>
              <div className="relative mt-3 grid grid-cols-3 gap-2 text-center">
                {[
                  ["Trabajos", pesos(debe)],
                  ["Pagado", pesos(pagado)],
                  ["Saldo", pesos(saldo)],
                ].map(([k, v], i) => (
                  <div key={k} className={`rounded-2xl px-2 py-2 ${i === 2 ? (saldo ? "bg-gradient-to-br from-rose-500 to-pink-500 text-white" : "bg-gradient-to-br from-emerald-500 to-teal-500 text-white") : "bg-muted/50"}`}>
                    <p className={`text-[10px] font-bold uppercase tracking-[0.1em] ${i === 2 ? "text-white/80" : "text-muted-foreground"}`}>{k}</p>
                    <p className="truncate font-display text-sm font-bold tabular-nums">{v}</p>
                  </div>
                ))}
              </div>
              <div className="relative mt-3 flex flex-wrap gap-1.5">
                {tel && (
                  <a href={`https://wa.me/${tel}`} target="_blank" rel="noreferrer" className="btn-wa !min-h-9">
                    <IconoWhatsApp /> WhatsApp
                  </a>
                )}
                {l.email && (
                  <a href={`mailto:${l.email}`} className="btn-ce-outline !min-h-9">
                    <Mail className="size-4" /> Correo
                  </a>
                )}
                <button type="button" onClick={() => { setPagando(l.id); setMonto(saldo ? String(saldo) : ""); }} className="btn-ce !min-h-9">
                  <Wallet className="size-4" /> Registrar pago
                </button>
              </div>
              {pagando === l.id && (
                <div className="relative mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3 text-xs">
                  <input inputMode="numeric" value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="Importe" className="h-9 w-28 rounded-lg border border-emerald-200 bg-card px-2 text-right tabular-nums" />
                  <select value={medio} onChange={(e) => setMedio(e.target.value)} className="h-9 rounded-lg border border-emerald-200 bg-card px-2">
                    {["Transferencia", "Efectivo", "Cheque", "Tarjeta"].map((m) => (
                      <option key={m}>{m}</option>
                    ))}
                  </select>
                  <button type="button" onClick={() => pagar(l)} className="btn-ce !min-h-9">Confirmar</button>
                  <button type="button" onClick={() => setPagando(null)} className="btn-ce-outline !min-h-9">Cancelar</button>
                  {aFinanzas && <span className="w-full text-[10.5px] text-emerald-800">Se registra también como egreso «Laboratorio» en Finanzas.</span>}
                </div>
              )}
              {pagos.some((p) => p.labId === l.id) && (
                <ul className="relative mt-3 space-y-1 border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
                  {pagos
                    .filter((p) => p.labId === l.id)
                    .slice(-3)
                    .reverse()
                    .map((p) => (
                      <li key={p.id} className="flex justify-between gap-2">
                        <span>{fechaCorta(p.fecha)} · {p.medio} · {p.por}</span>
                        <b className="tabular-nums text-foreground">{pesos(p.monto)}</b>
                      </li>
                    ))}
                </ul>
              )}
            </li>
          );
        })}
        {laboratorios.length === 0 && (
          <li className="rounded-3xl border border-dashed border-primary/25 px-4 py-10 text-center text-sm text-muted-foreground md:col-span-2">
            Cargá los laboratorios con los que trabajás (panel de la derecha).
          </li>
        )}
      </ul>
      <aside className="rounded-3xl border border-primary/12 bg-card p-4 shadow-[0_18px_40px_-32px_rgba(76,29,149,0.7)]">
        <p className="flex items-center gap-2 font-display text-sm font-bold">
          <Plus className="size-4 text-primary" /> Nuevo laboratorio
        </p>
        <form
          className="mt-3 space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!nuevo.nombre.trim()) return;
            cambiarLaboratorios((s) => ({
              ...s,
              laboratorios: [...s.laboratorios, { id: `lab-${Date.now()}`, nombre: nuevo.nombre.trim().slice(0, 80), contacto: nuevo.contacto.trim(), telefono: nuevo.telefono.trim(), email: nuevo.email.trim(), plazoDias: 7, notas: "" }],
            }));
            setNuevo({ nombre: "", contacto: "", telefono: "", email: "" });
            onToast("Laboratorio agregado");
          }}
        >
          <input value={nuevo.nombre} onChange={(e) => setNuevo((x) => ({ ...x, nombre: e.target.value }))} placeholder="Nombre del laboratorio" className={INPUT} />
          <input value={nuevo.contacto} onChange={(e) => setNuevo((x) => ({ ...x, contacto: e.target.value }))} placeholder="Persona de contacto" className={INPUT} />
          <label className="relative block">
            <Phone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary/70" />
            <input value={nuevo.telefono} onChange={(e) => setNuevo((x) => ({ ...x, telefono: e.target.value }))} placeholder="WhatsApp (con código de país)" className={`${INPUT} pl-10`} />
          </label>
          <input type="email" value={nuevo.email} onChange={(e) => setNuevo((x) => ({ ...x, email: e.target.value }))} placeholder="Correo" className={INPUT} />
          <button type="submit" disabled={!nuevo.nombre.trim()} className="btn-ce !min-h-10 w-full justify-center disabled:opacity-50">
            <Plus className="size-4" /> Agregar
          </button>
        </form>
        <p className="mt-3 text-[11px] text-muted-foreground">
          El nombre tiene que coincidir con el que se pone en el trabajo del paciente para sumar su cuenta corriente.
        </p>
      </aside>
    </div>
  );
}

/* ───────────── Reportes (6) ───────────── */

function Reportes({ filas, laboratorios, onToast }: { filas: Fila[]; laboratorios: Laboratorio[]; onToast: (m: string) => void }) {
  const nombres = [...new Set([...laboratorios.map((l) => l.nombre), ...filas.map((f) => f.t.proveedor || "Sin laboratorio")])];
  const de = (n: string) => filas.filter((f) => mismo(f.t.proveedor || "Sin laboratorio", n));
  const meses = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i), 1);
    return d.toISOString().slice(0, 7);
  });
  const promedio = (n: string) => {
    const tiempos = de(n)
      .map((f) => f.t.historial?.find((h) => h.estado === "Listo para retirar" || h.estado === "Entregado")?.fecha)
      .map((fin, i) => (fin ? diasEntre(de(n)[i]!.t.fechaEnvio, fin) : null))
      .filter((x): x is number => x != null && x >= 0);
    return tiempos.length ? Math.round(tiempos.reduce((a, b) => a + b, 0) / tiempos.length) : 0;
  };
  const profesionales = [...new Set(filas.map((f) => f.t.profesional || "Sin asignar"))];

  const REPORTES: { id: string; titulo: string; filas: { k: string; v: number; txt: string }[] }[] = [
    { id: "porLab", titulo: "Trabajos por laboratorio", filas: nombres.map((n) => ({ k: n, v: de(n).length, txt: String(de(n).length) })) },
    { id: "porEstado", titulo: "Trabajos por estado", filas: ESTADOS.map((e) => { const n = filas.filter((f) => f.t.estado === e).length; return { k: e, v: n, txt: String(n) }; }) },
    { id: "atrasos", titulo: "Atrasos por laboratorio", filas: nombres.map((n) => { const x = de(n).filter((f) => atrasado(f.t)).length; return { k: n, v: x, txt: String(x) }; }) },
    { id: "costos", titulo: "Costo de laboratorio por mes", filas: meses.map((m) => { const x = filas.filter((f) => f.t.fechaEnvio.startsWith(m)).reduce((a, f) => a + (f.t.costo || 0), 0); return { k: new Date(`${m}-15T12:00:00`).toLocaleDateString("es-AR", { month: "short", year: "2-digit" }), v: x, txt: pesos(x) }; }) },
    { id: "tiempos", titulo: "Días promedio de entrega", filas: nombres.map((n) => { const x = promedio(n); return { k: n, v: x, txt: x ? `${x} días` : "—" }; }) },
    { id: "profesional", titulo: "Trabajos por profesional", filas: profesionales.map((p) => { const x = filas.filter((f) => (f.t.profesional || "Sin asignar") === p).length; return { k: p, v: x, txt: String(x) }; }) },
  ];

  const excel = async () => {
    const { descargarExcel } = await import("@/components/cloud-esther/rrhh/excel");
    await descargarExcel(`reportes-laboratorio-${hoyISO()}.xlsx`, [
      ...REPORTES.map((r) => ({
        nombre: r.titulo.slice(0, 31),
        columnas: [
          { titulo: "Detalle", clave: "k", ancho: 32 },
          { titulo: "Valor", clave: "v", ancho: 16, ...(r.id === "costos" ? { moneda: true } : {}) },
        ],
        filas: r.filas.map((f) => ({ k: f.k, v: f.v })),
      })),
      {
        nombre: "Órdenes",
        columnas: [
          { titulo: "Paciente", clave: "p", ancho: 24 },
          { titulo: "Trabajo", clave: "t", ancho: 24 },
          { titulo: "Pieza", clave: "pz", ancho: 10 },
          { titulo: "Laboratorio", clave: "l", ancho: 22 },
          { titulo: "Enviado", clave: "e", ancho: 12 },
          { titulo: "Entrega", clave: "en", ancho: 12 },
          { titulo: "Estado", clave: "s", ancho: 18 },
          { titulo: "Costo", clave: "c", ancho: 14, moneda: true },
        ],
        filas: filas.map((f) => ({ p: f.paciente, t: f.t.tipo, pz: f.t.pieza, l: f.t.proveedor, e: fechaCorta(f.t.fechaEnvio), en: fechaCorta(f.t.fechaEntregaEstimada), s: f.t.estado, c: f.t.costo || 0 })),
      },
    ]);
    onToast("Reportes de laboratorio exportados a Excel");
  };

  return (
    <section className="space-y-3">
      <div className="flex justify-end">
        <button type="button" onClick={() => void excel()} className="btn-ce !min-h-10">
          <FileSpreadsheet className="size-4" /> Exportar todo a Excel
        </button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {REPORTES.map((r) => {
          const max = Math.max(1, ...r.filas.map((f) => f.v));
          return (
            <article key={r.id} className="rounded-3xl border border-primary/12 bg-card p-4 shadow-[0_18px_40px_-32px_rgba(76,29,149,0.7)]">
              <p className="flex items-center gap-2 font-display text-sm font-bold">
                <BarChart3 className="size-4 text-primary" /> {r.titulo}
              </p>
              {r.filas.length === 0 ? (
                <p className="mt-4 text-xs text-muted-foreground">Sin datos todavía.</p>
              ) : (
                <ul className="mt-3 space-y-2.5">
                  {r.filas.map((f, i) => (
                    <li key={f.k} className="grid grid-cols-[minmax(0,110px)_1fr_auto] items-center gap-2 text-xs">
                      <span className="truncate font-semibold">{f.k}</span>
                      <span className="relative h-2.5 overflow-hidden rounded-full bg-muted">
                        <span className="ce-portal-crecer absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary to-fuchsia-500" style={{ width: `${f.v ? Math.max(4, (f.v / max) * 100) : 0}%`, animationDelay: `${i * 60}ms` }} />
                      </span>
                      <b className="tabular-nums">{f.txt}</b>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
