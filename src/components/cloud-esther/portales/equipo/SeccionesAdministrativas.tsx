import { useState } from "react";
import {
  ArrowDownCircle,
  BadgeCheck,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Coins,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  History,
  Percent,
  Phone,
  Plus,
  ReceiptText,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";

import {
  SeccionPaciente,
  useRegistrosPacientes,
  useTodosLosRegistros,
  type Registros,
} from "@/components/cloud-esther/PacienteSecciones";
import { useNombresCobertura } from "@/lib/cloud-esther/coberturas";
import { ImportarPacientes } from "@/components/cloud-esther/pacientes/ImportarPacientes";
import { setTareasStore, storeAgenda, type Turno } from "@/lib/cloud-esther/agenda-store";
import { useAuditoria } from "@/lib/cloud-esther/auditoria-store";
import type { TeamMember } from "@/lib/cloud-esther/equipo-profesional-data";
import {
  cambiarLiquidacionesPro,
  storeLiquidacionesPro,
  type EstadoLiquidacion,
} from "@/lib/cloud-esther/liquidaciones-pro-store";
import { usePacientes, type Paciente } from "@/lib/cloud-esther/pacientes";
import { registrarEventoEquipo, storeEquipoPortal } from "@/lib/cloud-esther/portal-equipo-store";
import { storePresupuestos } from "@/lib/cloud-esther/presupuestos-store";
import { descargarPDF } from "@/lib/descargas";
import { normalizarBusqueda } from "@/lib/utils";
import {
  AvatarPortal,
  FiltroPeriodo,
  KpiPortal,
  PestanasPortal,
  TarjetaPortal,
  VacioPortal,
} from "../PortalShell";

/* Ubicación: src/components/cloud-esther/portales/equipo/SeccionesAdministrativas.tsx
   Secciones propias del Portal administrativo (Administración): Caja del día, Pacientes (alta,
   importación desde Excel/CSV, búsqueda, ficha y documentación), Tareas con responsable y
   vencimiento, Liquidación de profesionales (comisiones, aprobar, pagar y PDF para firmar) y
   Auditoría (con exportación a Excel y PDF). Cada una se muestra solo si el propietario dio el
   permiso correspondiente. Datos por empresa: nunca se mezclan clínicas. */

const pesos = (n: number) => `$\u00a0${Math.round(n).toLocaleString("es-AR")}`;
const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const ayerISO = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const nombreDe = (m: TeamMember) => `${m.firstName} ${m.lastName}`.trim();
const fechaCorta = (iso: string) => iso.split("-").reverse().join("/");
const esc = (t: string) =>
  t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);
const INPUT =
  "h-11 w-full rounded-xl border border-primary/15 bg-card px-3 text-base outline-none transition focus:border-primary/45 focus:ring-4 focus:ring-primary/10 sm:h-10 sm:text-sm";
const saldoDe = (r: Registros | undefined) =>
  r ? r.cuenta.reduce((s, m) => s + (m.tipo === "Cargo" ? m.monto : -m.monto), 0) : 0;

/* ───────────── Dona por medio de pago ───────────── */

const COLORES_MEDIO = ["#7c3aed", "#d946ef", "#0ea5e9", "#10b981", "#f59e0b", "#f43f5e"];

function DonaMedios({ datos }: { datos: { medio: string; total: number }[] }) {
  const total = datos.reduce((a, d) => a + d.total, 0);
  const r = 52;
  const c = 2 * Math.PI * r;
  let acum = 0;
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative size-44">
        <div aria-hidden className="absolute inset-4 rounded-full bg-gradient-to-br from-primary/15 to-fuchsia-400/15 blur-xl" />
        <svg viewBox="0 0 140 140" className="relative size-full -rotate-90" role="img" aria-label="Cobros por medio de pago">
          <circle cx="70" cy="70" r={r} fill="none" stroke="currentColor" strokeWidth="16" className="text-muted" />
          {datos.map((d, i) => {
            const largo = total ? (d.total / total) * c : 0;
            const seg = (
              <circle
                key={d.medio}
                cx="70"
                cy="70"
                r={r}
                fill="none"
                stroke={COLORES_MEDIO[i % COLORES_MEDIO.length]}
                strokeWidth="16"
                strokeLinecap="round"
                strokeDasharray={`${Math.max(0, largo - 3)} ${c}`}
                strokeDashoffset={-acum}
                className="ce-grafico-trazo"
              />
            );
            acum += largo;
            return seg;
          })}
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Total</p>
            <p className="font-display text-lg font-bold tabular-nums">{pesos(total)}</p>
          </div>
        </div>
      </div>
      <ul className="w-full space-y-1.5 text-sm">
        {datos.map((d, i) => (
          <li key={d.medio} className="flex items-center gap-2.5 rounded-xl bg-muted/40 px-3 py-2">
            <span className="size-2.5 rounded-full" style={{ background: COLORES_MEDIO[i % COLORES_MEDIO.length] }} />
            <span className="flex-1 truncate">{d.medio}</span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {total ? Math.round((d.total / total) * 100) : 0}%
            </span>
            <b className="tabular-nums">{pesos(d.total)}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ───────────── Caja del día ───────────── */

export function CajaPortal() {
  const registros = useTodosLosRegistros();
  const { pacientes } = usePacientes();
  const [dia, setDia] = useState(hoyISO());
  const movs = pacientes.flatMap((p) =>
    (registros[p.id]?.cuenta ?? []).map((m) => ({ ...m, paciente: `${p.nombre} ${p.apellido}` })),
  );
  const delDia = movs.filter((m) => m.fecha === dia).sort((a, b) => b.id - a.id);
  const ingresos = delDia.filter((m) => m.tipo === "Pago");
  const total = ingresos.reduce((a, m) => a + m.monto, 0);
  const porMedio = [...new Set(ingresos.map((m) => m.medio || "Sin medio"))]
    .map((medio) => ({
      medio,
      total: ingresos
        .filter((m) => (m.medio || "Sin medio") === medio)
        .reduce((a, m) => a + m.monto, 0),
    }))
    .sort((a, b) => b.total - a.total);
  const mes = dia.slice(0, 7);
  const delMes = movs
    .filter((m) => m.tipo === "Pago" && m.fecha.startsWith(mes))
    .reduce((a, m) => a + m.monto, 0);
  const atajos = [
    { id: hoyISO(), label: "Hoy" },
    { id: ayerISO(), label: "Ayer" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <FiltroPeriodo label="Día" valor={dia} onCambiar={setDia} icon={CalendarDays} />
        {atajos.map((a) => (
          <button
            key={a.label}
            type="button"
            onClick={() => setDia(a.id)}
            className={`min-h-10 rounded-xl px-3.5 text-sm font-semibold transition ${
              dia === a.id
                ? "bg-gradient-to-r from-primary to-fuchsia-500 text-white shadow-[0_10px_22px_-12px_rgba(124,58,237,0.9)]"
                : "border border-primary/12 bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiPortal
          titulo="Ingresos del día"
          valor={pesos(total)}
          detalle={`${ingresos.length} cobros`}
          icon={ArrowDownCircle}
          tono="verde"
          progreso={delMes ? (total / delMes) * 100 : 0}
        />
        <KpiPortal titulo="Operaciones" valor={String(delDia.length)} detalle="cargos y pagos" icon={ReceiptText} />
        <KpiPortal titulo="Ingresos del mes" valor={pesos(delMes)} detalle="cobrado en el mes" icon={Coins} tono="azul" />
        <KpiPortal
          titulo="Medios usados"
          valor={String(porMedio.length)}
          detalle={porMedio.map((x) => x.medio).join(", ") || "—"}
          icon={Wallet}
          tono="ambar"
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <TarjetaPortal titulo="Operaciones del día" detalle={fechaCorta(dia)} icon={ReceiptText}>
          {delDia.length === 0 ? (
            <VacioPortal
              icon={ReceiptText}
              titulo="Sin movimientos este día"
              texto="Cuando se registre un cobro o un cargo en la cuenta de un paciente, aparece acá al instante."
            />
          ) : (
            <ul className="space-y-2">
              {delDia.map((m) => {
                const pago = m.tipo === "Pago";
                return (
                  <li
                    key={`${m.paciente}-${m.id}`}
                    className="group flex items-center gap-3 rounded-2xl border border-transparent bg-muted/30 p-2.5 transition hover:border-primary/15 hover:bg-card hover:shadow-[0_12px_28px_-22px_rgba(76,29,149,0.7)]"
                  >
                    <AvatarPortal nombre={m.paciente} tam="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{m.paciente}</span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                        <span
                          className={`rounded-full px-2 py-0.5 font-semibold ${pago ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
                        >
                          {m.tipo}
                        </span>
                        <span className="truncate">{m.concepto}</span>
                        {m.medio && <span className="rounded-full bg-primary/10 px-2 py-0.5 font-semibold text-primary">{m.medio}</span>}
                      </span>
                    </span>
                    <span className={`font-display text-base font-bold tabular-nums ${pago ? "text-emerald-600" : ""}`}>
                      {pago ? "+" : ""}
                      {pesos(m.monto)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </TarjetaPortal>
        <TarjetaPortal titulo="Por medio de pago" detalle="Cómo pagaron hoy" icon={Wallet}>
          {porMedio.length === 0 ? (
            <VacioPortal compacto icon={Wallet} titulo="Sin cobros" texto="El reparto por medio de pago aparece con el primer cobro." />
          ) : (
            <DonaMedios datos={porMedio} />
          )}
          <p className="mt-4 rounded-xl bg-primary/[0.05] px-3 py-2 text-[11px] text-muted-foreground">
            El arqueo y la facturación fiscal están en Facturación → Caja (si tenés permiso).
          </p>
        </TarjetaPortal>
      </div>
    </div>
  );
}

/* ───────────── Pacientes (alta, importación, búsqueda, ficha y documentación) ───────────── */

const OBRAS = ["Particular", "OSDE", "Swiss Medical", "Galeno", "Medicus", "IOMA", "PAMI", "Otra"];
const obraCorta = (o: string) => (!o || /particular|no aplica/i.test(o) ? "Particular" : o);

export function PacientesAdministracion({
  puedeCrear,
  puedeEditar,
  onToast,
  abrirInicial,
}: {
  puedeCrear: boolean;
  puedeEditar: boolean;
  onToast: (m: string) => void;
  abrirInicial?: string | null;
}) {
  const { pacientes, setPacientes } = usePacientes();
  const registros = useRegistrosPacientes();
  const todos = useTodosLosRegistros();
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState<"todos" | "activos" | "inactivos" | "saldo">("todos");
  const [alta, setAlta] = useState(false);
  const [importar, setImportar] = useState(false);
  const [actual, setActual] = useState<number | null>(
    () => pacientes.find((p) => `${p.nombre} ${p.apellido}` === abrirInicial)?.id ?? null,
  );
  const [pestana, setPestana] = useState<"ficha" | "documentos" | "turnos" | "cuenta">("ficha");
  const texto = q.trim().toLowerCase();
  const saldo = (p: Paciente) => saldoDe(todos[p.id]);
  const conSaldo = pacientes.filter((p) => saldo(p) > 0);
  const activos = pacientes.filter((p) => p.estado === "Activo").length;
  const deudaTotal = conSaldo.reduce((a, p) => a + saldo(p), 0);
  const obras = pacientes.filter((p) => obraCorta(p.obraSocial) !== "Particular").length;
  const lista = pacientes
    .filter((p) =>
      filtro === "activos"
        ? p.estado === "Activo"
        : filtro === "inactivos"
          ? p.estado !== "Activo"
          : filtro === "saldo"
            ? saldo(p) > 0
            : true,
    )
    .filter(
      (p) =>
        !texto ||
        `${p.nombre} ${p.apellido}`.toLowerCase().includes(texto) ||
        p.documento.includes(texto.replace(/\D/g, "") || "~") ||
        p.telefono.replace(/\D/g, "").includes(texto.replace(/\D/g, "") || "~"),
    );
  const paciente = pacientes.find((p) => p.id === actual);

  if (paciente) {
    const r = registros.de(paciente.id);
    const s = saldoDe(r);
    const nombre = `${paciente.nombre} ${paciente.apellido}`;
    return (
      <div className="space-y-4">
        <section className="ce-portal-entrar relative overflow-hidden rounded-[26px] border border-primary/12 bg-card p-5 shadow-[0_22px_50px_-36px_rgba(76,29,149,0.65)]">
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-primary/15 via-fuchsia-400/10 to-sky-400/10" />
          <div className="relative flex flex-wrap items-center gap-4">
            <AvatarPortal nombre={nombre} tam="lg" className="ring-4 ring-card" />
            <div className="min-w-0 flex-1">
              <h2 className="truncate font-display text-xl font-bold tracking-tight">{nombre}</h2>
              <div className="mt-1 flex flex-wrap gap-1.5 text-[11px] font-semibold">
                <span className="rounded-full bg-muted px-2.5 py-1">DNI {paciente.documento || "—"}</span>
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-primary">{obraCorta(paciente.obraSocial)}</span>
                <span className="rounded-full bg-muted px-2.5 py-1">{paciente.sucursal}</span>
                <span className={`rounded-full px-2.5 py-1 ${paciente.estado === "Activo" ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                  {paciente.estado}
                </span>
                {s > 0 && <span className="rounded-full bg-rose-100 px-2.5 py-1 text-rose-700">Saldo {pesos(s)}</span>}
              </div>
            </div>
            <button type="button" onClick={() => setActual(null)} className="btn-ce-outline !min-h-10">
              Volver al listado
            </button>
          </div>
          <div className="relative mt-4">
            <PestanasPortal
              valor={pestana}
              onCambiar={setPestana}
              opciones={[
                { id: "ficha", label: "Ficha" },
                { id: "documentos", label: "Documentación", cantidad: r.documentos.length },
                { id: "turnos", label: "Turnos", cantidad: r.turnos.length },
                { id: "cuenta", label: "Cuenta corriente", cantidad: r.cuenta.length },
              ]}
            />
          </div>
        </section>
        <div className="rounded-[26px] border border-primary/10 bg-card p-3 shadow-[0_22px_50px_-40px_rgba(76,29,149,0.6)] sm:p-5">
          {pestana === "ficha" ? (
            <dl className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
              {(
                [
                  ["Teléfono", paciente.telefono],
                  ["Email", paciente.email],
                  ["Dirección", paciente.direccion],
                  ["Nacimiento", paciente.fechaNacimiento ? fechaCorta(paciente.fechaNacimiento) : ""],
                  ["Obra social", obraCorta(paciente.obraSocial)],
                  ["Afiliado", paciente.afiliado],
                  ["Sucursal", paciente.sucursal],
                  ["Estado", paciente.estado],
                ] as const
              ).map(([k, v]) => (
                <div key={k} className="rounded-2xl border border-primary/10 bg-gradient-to-br from-primary/[0.03] to-transparent px-3.5 py-3">
                  <dt className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{k}</dt>
                  <dd className="mt-1 truncate font-semibold">{v || "—"}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <SeccionPaciente
              key={`${paciente.id}-${pestana}`}
              seccion={pestana}
              datos={r}
              cambiar={(clave, fn) =>
                puedeEditar
                  ? registros.cambiar(paciente.id, clave, fn)
                  : onToast("Tu usuario solo puede consultar")
              }
              onToast={onToast}
              contexto={{ paciente: nombre, email: paciente.email }}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiPortal titulo="Pacientes" valor={String(pacientes.length)} detalle="en la clínica" icon={Users} />
        <KpiPortal
          titulo="Activos"
          valor={String(activos)}
          detalle={`${pacientes.length - activos} inactivos o archivados`}
          icon={BadgeCheck}
          tono="verde"
          progreso={pacientes.length ? (activos / pacientes.length) * 100 : 0}
        />
        <KpiPortal titulo="Con saldo" valor={String(conSaldo.length)} detalle={`${pesos(deudaTotal)} por cobrar`} icon={Wallet} tono="rosa" onClick={() => setFiltro("saldo")} />
        <KpiPortal titulo="Con obra social" valor={String(obras)} detalle={`${pacientes.length - obras} particulares`} icon={ShieldCheck} tono="azul" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-primary/70" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre, DNI o teléfono"
            className={`${INPUT} !h-12 rounded-2xl pl-10 shadow-[0_10px_26px_-22px_rgba(76,29,149,0.6)]`}
          />
        </label>
        {puedeCrear && (
          <>
            <button type="button" onClick={() => setImportar(true)} className="btn-ce-outline !min-h-12">
              <Upload className="size-4" /> Importar
            </button>
            <button type="button" onClick={() => setAlta(true)} className="btn-ce !min-h-12">
              <UserPlus className="size-4" /> Alta de paciente
            </button>
          </>
        )}
      </div>
      <PestanasPortal
        valor={filtro}
        onCambiar={setFiltro}
        opciones={[
          { id: "todos", label: "Todos", cantidad: pacientes.length },
          { id: "activos", label: "Activos", cantidad: activos },
          { id: "inactivos", label: "Inactivos", cantidad: pacientes.length - activos },
          { id: "saldo", label: "Con saldo", cantidad: conSaldo.length },
        ]}
      />
      {importar && <ImportarPacientes onCerrar={() => setImportar(false)} onToast={onToast} />}
      {alta && (
        <AltaPaciente
          onCerrar={() => setAlta(false)}
          onGuardar={(p) => {
            const id = Math.max(0, ...pacientes.map((x) => x.id)) + 1;
            setPacientes((prev) => [{ ...p, id }, ...prev]);
            onToast(`Paciente ${p.nombre} ${p.apellido} dado de alta`);
            setAlta(false);
            setActual(id);
          }}
        />
      )}
      {lista.length === 0 ? (
        <TarjetaPortal>
          <VacioPortal
            icon={Users}
            titulo={pacientes.length ? "Ningún paciente coincide" : "Todavía no hay pacientes"}
            texto={
              pacientes.length
                ? "Probá con otro nombre, DNI o teléfono, o cambiá el filtro."
                : "Dá de alta el primero o importá tu listado desde Excel para empezar en minutos."
            }
            {...(!pacientes.length && puedeCrear
              ? {
                  accion: (
                    <button type="button" onClick={() => setImportar(true)} className="btn-ce !min-h-11">
                      <FileSpreadsheet className="size-4" /> Importar desde Excel
                    </button>
                  ),
                }
              : {})}
          />
        </TarjetaPortal>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {lista.slice(0, 60).map((p, i) => {
            const nombre = `${p.nombre} ${p.apellido}`;
            const s = saldo(p);
            return (
              <li key={p.id} className="ce-portal-entrar" style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }}>
                <button
                  type="button"
                  onClick={() => setActual(p.id)}
                  className="group relative flex w-full flex-col gap-3 overflow-hidden rounded-[22px] border border-primary/10 bg-card p-4 text-left shadow-[0_16px_36px_-30px_rgba(76,29,149,0.7)] transition duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_24px_48px_-28px_rgba(76,29,149,0.75)]"
                >
                  <span aria-hidden className="pointer-events-none absolute -right-10 -top-12 size-28 rounded-full bg-gradient-to-br from-primary/12 to-fuchsia-400/12 blur-2xl transition group-hover:scale-150" />
                  <span className="relative flex items-center gap-3">
                    <AvatarPortal nombre={nombre} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-bold tracking-tight">{nombre}</span>
                      <span className="block truncate text-xs text-muted-foreground">DNI {p.documento || "—"}</span>
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${p.estado === "Activo" ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}
                    >
                      {p.estado}
                    </span>
                  </span>
                  <span className="relative flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/[0.08] px-2.5 py-1 font-semibold text-primary">
                      <ShieldCheck className="size-3" /> {obraCorta(p.obraSocial)}
                    </span>
                    {p.telefono && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
                        <Phone className="size-3" /> {p.telefono}
                      </span>
                    )}
                  </span>
                  <span className="relative flex items-center justify-between border-t border-border/60 pt-2.5 text-xs">
                    {s > 0 ? (
                      <span className="font-semibold text-rose-600">Saldo {pesos(s)}</span>
                    ) : (
                      <span className="text-emerald-600">Cuenta al día</span>
                    )}
                    <span className="inline-flex items-center gap-0.5 font-semibold text-primary opacity-70 transition group-hover:translate-x-0.5 group-hover:opacity-100">
                      Abrir ficha <ChevronRight className="size-3.5" />
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function AltaPaciente({
  onCerrar,
  onGuardar,
}: {
  onCerrar: () => void;
  onGuardar: (p: Omit<Paciente, "id">) => void;
}) {
  const [f, setF] = useState({
    nombre: "",
    apellido: "",
    documento: "",
    fechaNacimiento: "",
    telefono: "",
    email: "",
    obraSocial: "Particular",
    sucursal: "Clínica Centro",
  });
  const [error, setError] = useState("");
  const obrasCatalogo = useNombresCobertura(OBRAS);
  const campo = (k: keyof typeof f, label: string, type = "text") => (
    <label className="text-xs font-semibold">
      {label}
      <input
        type={type}
        value={f[k]}
        onChange={(e) => setF((x) => ({ ...x, [k]: e.target.value }))}
        className={`${INPUT} mt-1`}
      />
    </label>
  );
  return (
    <TarjetaPortal
      titulo="Alta de paciente"
      detalle="Datos básicos: el resto se completa en la ficha"
      icon={UserPlus}
    >
      <form
        className="grid gap-3 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!f.nombre.trim() || !f.apellido.trim())
            return setError("Completá nombre y apellido.");
          if (!/^\d{6,10}$/.test(f.documento.replace(/\D/g, "")))
            return setError("El documento tiene que tener entre 6 y 10 dígitos.");
          onGuardar({
            nombre: f.nombre.trim(),
            apellido: f.apellido.trim(),
            documento: f.documento.replace(/\D/g, ""),
            fechaNacimiento: f.fechaNacimiento,
            genero: "",
            email: f.email.trim(),
            telefono: f.telefono.trim(),
            sucursal: f.sucursal,
            obraSocial: f.obraSocial === "Particular" ? "No aplica / particular" : f.obraSocial,
            afiliado: "",
            direccion: "",
            nota: "",
            estado: "Activo",
            foto: null,
          });
        }}
      >
        {campo("nombre", "Nombre")}
        {campo("apellido", "Apellido")}
        {campo("documento", "Documento")}
        {campo("fechaNacimiento", "Nacimiento", "date")}
        {campo("telefono", "Teléfono", "tel")}
        {campo("email", "Email", "email")}
        <label className="text-xs font-semibold">
          Obra social
          <select
            value={f.obraSocial}
            onChange={(e) => setF((x) => ({ ...x, obraSocial: e.target.value }))}
            className={`${INPUT} mt-1`}
          >
            {obrasCatalogo.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold">
          Sucursal
          <select
            value={f.sucursal}
            onChange={(e) => setF((x) => ({ ...x, sucursal: e.target.value }))}
            className={`${INPUT} mt-1`}
          >
            {["Clínica Centro", "Clínica Norte", "Clínica Sur"].map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </label>
        {error && <p className="text-xs text-destructive sm:col-span-2">{error}</p>}
        <div className="flex gap-2 sm:col-span-2">
          <button
            type="button"
            onClick={onCerrar}
            className="btn-ce-outline !min-h-11 flex-1 justify-center"
          >
            Cancelar
          </button>
          <button type="submit" className="btn-ce !min-h-11 flex-1 justify-center">
            Dar de alta
          </button>
        </div>
      </form>
    </TarjetaPortal>
  );
}

/* ───────────── Tareas con responsable y vencimiento ───────────── */

export function TareasAdministrativas({
  yo,
  miembros,
  puedeCrear,
  puedeEliminar,
  vista,
  onToast,
}: {
  yo: TeamMember;
  miembros: TeamMember[];
  puedeCrear: boolean;
  puedeEliminar: boolean;
  vista: boolean;
  onToast: (m: string) => void;
}) {
  const { tareas } = storeAgenda.usar();
  const [filtro, setFiltro] = useState<"pendientes" | "vencidas" | "mias" | "hechas">("pendientes");
  const [texto, setTexto] = useState("");
  const [responsable, setResponsable] = useState(nombreDe(yo));
  const [vence, setVence] = useState("");
  const hoy = hoyISO();
  // Personas a las que se puede asignar: el equipo activo + yo (sin repetir)
  const asignables = Array.from(
    new Set([nombreDe(yo), ...miembros.filter((m) => m.status === "activo").map((m) => nombreDe(m))]),
  );
  const reasignar = (id: number, quien: string, textoTarea: string) => {
    if (vista) return;
    setTareasStore((prev) => prev.map((x) => (x.id === id ? { ...x, responsable: quien } : x)));
    registrarEventoEquipo(yo.id, "Reasignó una tarea", `${textoTarea} → ${quien || "sin responsable"}`);
    onToast(quien ? `Tarea asignada a ${quien}` : "La tarea quedó sin responsable");
  };
  // Fecha límite: la de Administración (vence) o la del recordatorio cargado en la Agenda
  const limiteDe = (t: (typeof tareas)[number]) => t.vence || t.fecha || "";
  const cumple = (t: (typeof tareas)[number], f: typeof filtro) =>
    f === "pendientes"
      ? !t.hecha
      : f === "vencidas"
        ? !t.hecha && !!limiteDe(t) && limiteDe(t) < hoy
        : f === "mias"
          ? !t.hecha && t.responsable === nombreDe(yo)
          : t.hecha;
  const visibles = tareas
    .filter((t) => cumple(t, filtro))
    .sort((a, b) => (limiteDe(a) || "9999").localeCompare(limiteDe(b) || "9999"));
  const contar = (f: typeof filtro) => tareas.filter((t) => cumple(t, f)).length;
  const hechas = contar("hechas");

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiPortal titulo="Pendientes" valor={String(contar("pendientes"))} detalle="del equipo" icon={ClipboardList} onClick={() => setFiltro("pendientes")} />
        <KpiPortal titulo="Vencidas" valor={String(contar("vencidas"))} detalle="pasaron la fecha" icon={CalendarClock} tono="rosa" onClick={() => setFiltro("vencidas")} />
        <KpiPortal titulo="A mi cargo" valor={String(contar("mias"))} detalle={nombreDe(yo)} icon={UserPlus} tono="azul" onClick={() => setFiltro("mias")} />
        <KpiPortal
          titulo="Completadas"
          valor={`${tareas.length ? Math.round((hechas / tareas.length) * 100) : 0}%`}
          detalle={`${hechas} de ${tareas.length} tareas`}
          icon={CheckCircle2}
          tono="verde"
          progreso={tareas.length ? (hechas / tareas.length) * 100 : 0}
          onClick={() => setFiltro("hechas")}
        />
      </div>
      {puedeCrear && (
        <TarjetaPortal titulo="Nueva tarea" detalle="Con responsable y fecha límite" icon={Plus}>
          <form
            className="grid gap-3 sm:grid-cols-[1fr_200px_170px_auto]"
            onSubmit={(e) => {
              e.preventDefault();
              if (vista || !texto.trim()) return;
              setTareasStore((prev) => [
                {
                  id: Date.now(),
                  texto: texto.trim(),
                  categoria: "Administración",
                  paciente: "",
                  fecha: vence,
                  hecha: false,
                  responsable,
                  ...(vence ? { vence } : {}),
                },
                ...prev,
              ]);
              registrarEventoEquipo(yo.id, "Creó una tarea", `${texto.trim()} → ${responsable || "sin responsable"}`);
              setTexto("");
              setVence("");
              onToast("Tarea creada");
            }}
          >
            <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="¿Qué hay que hacer?" className={INPUT} />
            <select value={responsable} onChange={(e) => setResponsable(e.target.value)} className={INPUT} aria-label="Responsable">
              {asignables.map((n) => (
                <option key={n} value={n}>
                  {n === nombreDe(yo) ? `${n} (yo)` : n}
                </option>
              ))}
              <option value="">Sin responsable</option>
            </select>
            <input type="date" value={vence} onChange={(e) => setVence(e.target.value)} className={INPUT} aria-label="Vence" />
            <button type="submit" disabled={!texto.trim()} className="btn-ce !min-h-11 justify-center disabled:opacity-50">
              <Plus className="size-4" /> Crear
            </button>
          </form>
        </TarjetaPortal>
      )}
      <PestanasPortal
        valor={filtro}
        onCambiar={setFiltro}
        opciones={[
          { id: "pendientes", label: "Pendientes", cantidad: contar("pendientes") },
          { id: "vencidas", label: "Vencidas", cantidad: contar("vencidas") },
          { id: "mias", label: "A mi cargo", cantidad: contar("mias") },
          { id: "hechas", label: "Hechas", cantidad: hechas },
        ]}
      />
      <TarjetaPortal icon={ClipboardList} titulo={`${visibles.length} ${visibles.length === 1 ? "tarea" : "tareas"}`} detalle="Ordenadas por vencimiento">
        {visibles.length === 0 ? (
          <VacioPortal
            icon={CheckCircle2}
            titulo={filtro === "hechas" ? "Todavía no se completó ninguna" : "¡Todo al día!"}
            texto={filtro === "hechas" ? "Las tareas que marques como hechas quedan acá." : "No hay tareas en esta vista."}
          />
        ) : (
          <ul className="space-y-2">
            {visibles.map((t) => {
              const limite = limiteDe(t);
              const vencida = !t.hecha && !!limite && limite < hoy;
              const venceHoy = !t.hecha && limite === hoy;
              return (
                <li
                  key={t.id}
                  className={`group flex items-center gap-3 rounded-2xl border p-3 transition hover:shadow-[0_14px_30px_-24px_rgba(76,29,149,0.7)] ${
                    vencida ? "border-rose-200 bg-rose-50/60 dark:border-rose-500/30 dark:bg-rose-500/5" : "border-primary/10 bg-muted/25 hover:bg-card"
                  }`}
                >
                  <button
                    type="button"
                    aria-label={t.hecha ? "Marcar pendiente" : "Marcar hecha"}
                    disabled={vista}
                    onClick={() => {
                      setTareasStore((prev) => prev.map((x) => (x.id === t.id ? { ...x, hecha: !x.hecha } : x)));
                      registrarEventoEquipo(yo.id, t.hecha ? "Reabrió una tarea" : "Completó una tarea", t.texto);
                      onToast(t.hecha ? "La tarea volvió a pendientes" : "¡Tarea completada!");
                    }}
                    className={`grid size-9 shrink-0 place-items-center rounded-xl border-2 transition ${
                      t.hecha
                        ? "border-transparent bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-[0_8px_18px_-8px_rgba(16,185,129,0.8)]"
                        : "border-primary/25 bg-card text-transparent hover:border-primary hover:text-primary/40"
                    }`}
                  >
                    <CheckCircle2 className="size-4" />
                  </button>
                  <span className="min-w-0 flex-1">
                    <span className={`block text-sm ${t.hecha ? "text-muted-foreground line-through" : "font-semibold"}`}>{t.texto}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                      {t.responsable && <AvatarPortal nombre={t.responsable} tam="sm" className="!size-5 !rounded-md !text-[8px]" />}
                      {puedeCrear && !vista && !t.hecha ? (
                        // Reasignar en el momento (o dejarla sin responsable)
                        <select
                          value={t.responsable ?? ""}
                          onChange={(e) => reasignar(t.id, e.target.value, t.texto)}
                          aria-label={`Responsable de «${t.texto}»`}
                          className="h-7 max-w-[11rem] cursor-pointer rounded-full border border-primary/15 bg-card px-2 text-[11px] font-semibold text-foreground/80 outline-none transition hover:border-primary/40 focus:ring-4 focus:ring-primary/10"
                        >
                          <option value="">Sin responsable</option>
                          {Array.from(new Set([...(t.responsable ? [t.responsable] : []), ...asignables])).map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span>{t.responsable || "Sin responsable"}</span>
                      )}
                      {!t.responsable && !t.hecha && !vista && (
                        <button
                          type="button"
                          onClick={() => reasignar(t.id, nombreDe(yo), t.texto)}
                          className="rounded-full bg-gradient-to-r from-primary to-fuchsia-500 px-2.5 py-0.5 text-[10.5px] font-bold text-white shadow-[0_6px_14px_-8px_rgba(124,58,237,0.9)]"
                        >
                          Me la quedo
                        </button>
                      )}
                      {t.paciente && <span>· {t.paciente}</span>}
                    </span>
                  </span>
                  {limite && (
                    <span
                      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10.5px] font-semibold ${
                        vencida ? "bg-rose-500 text-white" : venceHoy ? "bg-amber-100 text-amber-700" : "bg-primary/10 text-primary"
                      }`}
                    >
                      <CalendarClock className="size-3" />
                      {vencida ? "Vencida" : venceHoy ? "Hoy" : fechaCorta(limite)}
                    </span>
                  )}
                  {puedeEliminar && (
                    <button
                      type="button"
                      aria-label="Eliminar"
                      disabled={vista}
                      onClick={() => {
                        if (!window.confirm(`¿Eliminar la tarea «${t.texto}»?`)) return;
                        setTareasStore((prev) => prev.filter((x) => x.id !== t.id));
                        registrarEventoEquipo(yo.id, "Eliminó una tarea", t.texto);
                        onToast("Tarea eliminada");
                      }}
                      className="grid size-9 place-items-center rounded-xl text-muted-foreground opacity-60 transition hover:bg-rose-50 hover:text-destructive group-hover:opacity-100"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </TarjetaPortal>
    </div>
  );
}

/* ───────────── Liquidación de profesionales ─────────────
   Comisiones calculadas solas con las prestaciones atendidas (Agenda) × arancel (Presupuestos)
   × % del profesional (general o una excepción por práctica). Circuito: Borrador → Aprobada →
   Pagada, vista previa del detalle y PDF con espacio para la firma. Una liquidación aprobada
   queda congelada (no cambia si después se tocan aranceles o porcentajes). */

const ESTADO_LIQ: Record<EstadoLiquidacion, string> = {
  Borrador: "bg-muted text-muted-foreground",
  Aprobada: "bg-sky-100 text-sky-700",
  Pagada: "bg-emerald-100 text-emerald-700",
};
const MEDIOS_PAGO_LIQ = ["Transferencia", "Efectivo", "Cheque"];

function nombreMes(mes: string) {
  const [a = 0, m = 1] = mes.split("-").map(Number);
  const t = new Date(a, m - 1, 1).toLocaleDateString("es-AR", { month: "long", year: "numeric" });
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function LiquidacionesPortal({
  miembros,
  turnos,
  yo,
  onToast,
}: {
  miembros: TeamMember[];
  turnos: Turno[];
  yo?: TeamMember;
  onToast?: (m: string) => void;
}) {
  const aranceles = storePresupuestos.usar().aranceles;
  const liq = storeLiquidacionesPro.usar();
  const [mes, setMes] = useState(hoyISO().slice(0, 7));
  const [abierto, setAbierto] = useState<string | null>(null);
  const [pagando, setPagando] = useState<string | null>(null);
  const [medio, setMedio] = useState(MEDIOS_PAGO_LIQ[0]!);
  const avisar = (m: string) => onToast?.(m);
  const quien = yo ? nombreDe(yo) : "Administración";

  // Arancel de la práctica: nombre igual o, si no, el que comparte más palabras («Primera
  // consulta» → «Consulta y diagnóstico»; «Restauración» → «Restauración de resina simple»).
  const palabras = (t: string) =>
    normalizarBusqueda(t)
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 3);
  const precioDe = (tratamiento: string) => {
    const t = normalizarBusqueda(tratamiento);
    const exacto = aranceles.find((a) => normalizarBusqueda(a.nombre) === t);
    if (exacto) return exacto.precio;
    const pt = palabras(tratamiento);
    let mejor = { precio: 0, puntos: 0 };
    for (const a of aranceles) {
      const puntos = palabras(a.nombre).filter((w) => pt.includes(w)).length;
      if (puntos > mejor.puntos) mejor = { precio: a.precio, puntos };
    }
    return mejor.precio;
  };
  const filas = miembros
    .filter((m) => m.role === "odontologo")
    .map((m) => {
      const general =
        liq.porcentajes[m.id] ??
        m.commissions?.find((c) => c.service === "Tratamientos")?.percentage ??
        m.commissions?.[0]?.percentage ??
        0;
      const excepciones = liq.excepciones[m.id] ?? {};
      const practicas = turnos
        .filter((t) => t.odontologo === nombreDe(m) && t.estado === "Atendida" && t.fecha.startsWith(mes))
        .sort((a, b) => a.fecha.localeCompare(b.fecha))
        .map((t) => {
          const arancel = precioDe(t.tratamiento);
          const pct = excepciones[t.tratamiento.toLowerCase()] ?? general;
          return { t, arancel, pct, comision: Math.round((arancel * pct) / 100) };
        });
      const facturado = practicas.reduce((a, x) => a + x.arancel, 0);
      const calculada = practicas.reduce((a, x) => a + x.comision, 0);
      const guardada = liq.liquidaciones[`${mes}:${m.id}`];
      const estado: EstadoLiquidacion = guardada?.estado ?? "Borrador";
      return {
        m,
        general,
        excepciones,
        practicas,
        facturado,
        comision: estado === "Borrador" ? calculada : (guardada?.total ?? calculada),
        estado,
        guardada,
      };
    });
  const total = filas.reduce((a, f) => a + f.comision, 0);
  const pagado = filas.filter((f) => f.estado === "Pagada").reduce((a, f) => a + f.comision, 0);
  const aprobadas = filas.filter((f) => f.estado !== "Borrador").length;

  const guardar = (id: string, cambio: Partial<{ estado: EstadoLiquidacion; total: number; aprobadaPor: string; aprobadaEl: string; pagadaEl: string; medio: string }>) =>
    cambiarLiquidacionesPro((e) => {
      const clave = `${mes}:${id}`;
      const previa = e.liquidaciones[clave] ?? { clave, estado: "Borrador" as EstadoLiquidacion, total: 0 };
      return { ...e, liquidaciones: { ...e.liquidaciones, [clave]: { ...previa, ...cambio } } };
    });

  const pdf = async (f: (typeof filas)[number]) => {
    const filasHtml = f.practicas
      .map(
        (x) =>
          `<tr><td>${fechaCorta(x.t.fecha)}</td><td>${esc(x.t.paciente)}</td><td>${esc(x.t.tratamiento)}</td><td class="n">${pesos(x.arancel)}</td><td class="n">${x.pct}%</td><td class="n">${pesos(x.comision)}</td></tr>`,
      )
      .join("");
    const html = `<!doctype html><html><head><meta charset="utf-8"><style>
      body{font-family:Inter,Arial,sans-serif;color:#1e1b2e;margin:0;padding:36px 40px;font-size:12px}
      .cab{background:linear-gradient(118deg,#4c1d95,#7c3aed 50%,#c026d3);color:#fff;border-radius:18px;padding:22px 26px}
      .cab p{margin:0;opacity:.8;font-size:10px;letter-spacing:.18em;text-transform:uppercase;font-weight:700}
      .cab h1{margin:4px 0 2px;font-size:22px}
      .meta{display:flex;gap:10px;margin:18px 0}
      .meta div{flex:1;border:1px solid #e9e3ff;border-radius:12px;padding:10px 12px}
      .meta b{display:block;font-size:15px;margin-top:3px}
      table{width:100%;border-collapse:collapse;margin-top:8px}
      th{text-align:left;font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:#7c6f9b;border-bottom:2px solid #ede9fe;padding:8px 6px}
      td{padding:8px 6px;border-bottom:1px solid #f1eefb}.n{text-align:right;font-variant-numeric:tabular-nums}
      .tot td{font-weight:700;font-size:13px;border-bottom:0}
      .firmas{display:flex;gap:40px;margin-top:70px}.firmas div{flex:1;border-top:1px solid #9e93bd;padding-top:6px;text-align:center;color:#6b6189}
      .pie{margin-top:28px;font-size:9.5px;color:#9e93bd}
    </style></head><body>
      <div class="cab"><p>Liquidación de profesionales</p><h1>${esc(nombreDe(f.m))}</h1><span>${esc(nombreMes(mes))} · ${esc(f.m.licenseNumber ?? "")}</span></div>
      <div class="meta"><div>Prácticas atendidas<b>${f.practicas.length}</b></div><div>Facturado<b>${pesos(f.facturado)}</b></div><div>Comisión general<b>${f.general}%</b></div><div>Estado<b>${f.estado}</b></div></div>
      <table><thead><tr><th>Fecha</th><th>Paciente</th><th>Práctica</th><th class="n">Arancel</th><th class="n">%</th><th class="n">Comisión</th></tr></thead>
      <tbody>${filasHtml || '<tr><td colspan="6">Sin prácticas atendidas en el período.</td></tr>'}
      <tr class="tot"><td colspan="5">Total a liquidar</td><td class="n">${pesos(f.comision)}</td></tr></tbody></table>
      ${f.guardada?.aprobadaPor ? `<p class="pie">Aprobada por ${esc(f.guardada.aprobadaPor)} el ${esc(f.guardada.aprobadaEl ?? "")}${f.guardada.pagadaEl ? ` · Pagada el ${esc(f.guardada.pagadaEl)} (${esc(f.guardada.medio ?? "")})` : ""}</p>` : ""}
      <div class="firmas"><div>Firma del profesional<br/>${esc(nombreDe(f.m))}</div><div>Firma y aclaración<br/>Administración</div></div>
    </body></html>`;
    const ok = await descargarPDF(html, `Liquidación ${nombreDe(f.m)} ${mes}`);
    avisar(ok ? "PDF de la liquidación descargado" : "No se pudo armar el PDF");
  };

  return (
    <div className="space-y-5">
      <FiltroPeriodo label="Período" tipo="month" valor={mes} onCambiar={setMes} icon={CalendarDays} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiPortal titulo="A liquidar" valor={pesos(total)} detalle={nombreMes(mes)} icon={Coins} tono="verde" />
        <KpiPortal titulo="Pagado" valor={pesos(pagado)} detalle={`${pesos(total - pagado)} pendiente`} icon={Wallet} tono="azul" progreso={total ? (pagado / total) * 100 : 0} />
        <KpiPortal titulo="Prácticas atendidas" valor={String(filas.reduce((a, f) => a + f.practicas.length, 0))} detalle="en el período" icon={CalendarClock} />
        <KpiPortal titulo="Aprobadas" valor={`${aprobadas}/${filas.length}`} detalle="liquidaciones del mes" icon={BadgeCheck} tono="ambar" progreso={filas.length ? (aprobadas / filas.length) * 100 : 0} />
      </div>

      {filas.length === 0 ? (
        <TarjetaPortal>
          <VacioPortal icon={Users} titulo="No hay profesionales" texto="Sumá odontólogos en Equipo → Integrantes para liquidar sus comisiones." />
        </TarjetaPortal>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {filas.map((f) => {
            const bloqueada = f.estado !== "Borrador";
            const verDetalle = abierto === f.m.id;
            return (
              <section
                key={f.m.id}
                className="ce-portal-entrar relative overflow-hidden rounded-[26px] border border-primary/12 bg-card p-5 shadow-[0_22px_50px_-36px_rgba(76,29,149,0.65)]"
              >
                <span aria-hidden className="pointer-events-none absolute -right-16 -top-20 size-48 rounded-full bg-gradient-to-br from-primary/12 to-fuchsia-400/12 blur-3xl" />
                <div className="relative flex items-center gap-3">
                  <AvatarPortal nombre={nombreDe(f.m)} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-bold tracking-tight">{nombreDe(f.m)}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {(f.m.specialties ?? []).join(" · ") || "Odontología"} {f.m.licenseNumber ? `· ${f.m.licenseNumber}` : ""}
                    </p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${ESTADO_LIQ[f.estado]}`}>{f.estado}</span>
                </div>

                <div className="relative mt-4 grid grid-cols-3 gap-2 text-center">
                  {[
                    ["Atendidas", String(f.practicas.length)],
                    ["Facturado", pesos(f.facturado)],
                    ["A liquidar", pesos(f.comision)],
                  ].map(([k, v], i) => (
                    <div key={k} className={`rounded-2xl px-2 py-2.5 ${i === 2 ? "bg-gradient-to-br from-primary to-fuchsia-500 text-white shadow-[0_12px_24px_-14px_rgba(124,58,237,0.9)]" : "bg-muted/50"}`}>
                      <p className={`text-[10px] font-bold uppercase tracking-[0.1em] ${i === 2 ? "text-white/75" : "text-muted-foreground"}`}>{k}</p>
                      <p className="mt-0.5 truncate font-display text-base font-bold tabular-nums">{v}</p>
                    </div>
                  ))}
                </div>

                <div className="relative mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-primary/10 bg-primary/[0.03] px-3 py-2 text-xs">
                  <Percent className="size-3.5 text-primary" />
                  <span className="font-semibold">Comisión general</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    disabled={bloqueada}
                    value={f.general}
                    onChange={(e) => {
                      const v = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                      cambiarLiquidacionesPro((x) => ({ ...x, porcentajes: { ...x.porcentajes, [f.m.id]: v } }));
                    }}
                    aria-label={`Porcentaje de ${nombreDe(f.m)}`}
                    className="h-8 w-16 rounded-lg border border-primary/15 bg-card px-2 text-right font-bold tabular-nums outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
                  />
                  <span>%</span>
                  {Object.keys(f.excepciones).length > 0 && (
                    <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-700">
                      {Object.keys(f.excepciones).length} excepciones
                    </span>
                  )}
                </div>

                {verDetalle && (
                  <div className="relative mt-3 space-y-2">
                    {f.practicas.length === 0 ? (
                      <VacioPortal compacto icon={CalendarClock} titulo="Sin prácticas atendidas" texto="Se cuentan los turnos marcados como «Atendida» en la Agenda." />
                    ) : (
                      <ul className="divide-y divide-border/60 rounded-2xl border border-primary/10">
                        {f.practicas.map((x) => {
                          const clave = x.t.tratamiento.toLowerCase();
                          const tieneExc = clave in f.excepciones;
                          return (
                            <li key={x.t.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-xs">
                              <span className="w-12 tabular-nums text-muted-foreground">{fechaCorta(x.t.fecha).slice(0, 5)}</span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate font-semibold">{x.t.tratamiento}</span>
                                <span className="block truncate text-muted-foreground">{x.t.paciente}</span>
                              </span>
                              <span className="tabular-nums">{pesos(x.arancel)}</span>
                              <label className="inline-flex items-center gap-1" title="Excepción para esta práctica">
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  disabled={bloqueada}
                                  value={x.pct}
                                  onChange={(e) => {
                                    const v = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                                    cambiarLiquidacionesPro((s) => {
                                      const exc = { ...(s.excepciones[f.m.id] ?? {}) };
                                      if (v === f.general) delete exc[clave];
                                      else exc[clave] = v;
                                      return { ...s, excepciones: { ...s.excepciones, [f.m.id]: exc } };
                                    });
                                  }}
                                  className={`h-7 w-12 rounded-md border px-1 text-right tabular-nums outline-none disabled:opacity-60 ${tieneExc ? "border-amber-300 bg-amber-50" : "border-primary/15 bg-card"}`}
                                />
                                %
                              </label>
                              <b className="w-20 text-right tabular-nums">{pesos(x.comision)}</b>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                    {!bloqueada && f.practicas.length > 0 && (
                      <p className="text-[11px] text-muted-foreground">
                        Cambiá el % de una práctica para crear una excepción (queda marcada en amarillo).
                      </p>
                    )}
                  </div>
                )}

                {pagando === f.m.id && (
                  <div className="relative mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs dark:border-emerald-500/30 dark:bg-emerald-500/5">
                    <span className="font-semibold">Pagado con</span>
                    <select value={medio} onChange={(e) => setMedio(e.target.value)} className="h-9 rounded-lg border border-emerald-200 bg-card px-2">
                      {MEDIOS_PAGO_LIQ.map((m) => (
                        <option key={m}>{m}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="btn-ce !min-h-9"
                      onClick={() => {
                        guardar(f.m.id, { estado: "Pagada", pagadaEl: fechaCorta(hoyISO()), medio });
                        setPagando(null);
                        avisar(`Liquidación de ${nombreDe(f.m)} marcada como pagada`);
                      }}
                    >
                      Confirmar pago
                    </button>
                    <button type="button" className="btn-ce-outline !min-h-9" onClick={() => setPagando(null)}>
                      Cancelar
                    </button>
                  </div>
                )}

                <div className="relative mt-4 flex flex-wrap gap-2">
                  <button type="button" className="btn-ce-outline !min-h-10" onClick={() => setAbierto(verDetalle ? null : f.m.id)}>
                    <Eye className="size-4" /> {verDetalle ? "Ocultar detalle" : "Vista previa"}
                  </button>
                  {f.estado === "Borrador" && (
                    <button
                      type="button"
                      className="btn-ce !min-h-10"
                      disabled={f.practicas.length === 0}
                      onClick={() => {
                        guardar(f.m.id, { estado: "Aprobada", total: f.comision, aprobadaPor: quien, aprobadaEl: fechaCorta(hoyISO()) });
                        avisar(`Liquidación de ${nombreDe(f.m)} aprobada`);
                      }}
                    >
                      <BadgeCheck className="size-4" /> Aprobar
                    </button>
                  )}
                  {f.estado === "Aprobada" && (
                    <>
                      <button type="button" className="btn-ce !min-h-10" onClick={() => setPagando(f.m.id)}>
                        <Wallet className="size-4" /> Marcar pagada
                      </button>
                      <button
                        type="button"
                        className="btn-ce-outline !min-h-10"
                        onClick={() => {
                          guardar(f.m.id, { estado: "Borrador" });
                          avisar("Volvió a borrador: se recalcula");
                        }}
                      >
                        Reabrir
                      </button>
                    </>
                  )}
                  <button type="button" className="btn-ce-outline !min-h-10" onClick={() => void pdf(f)}>
                    <Download className="size-4" /> PDF para firmar
                  </button>
                </div>
                {f.guardada?.aprobadaPor && (
                  <p className="relative mt-3 text-[11px] text-muted-foreground">
                    Aprobada por {f.guardada.aprobadaPor} el {f.guardada.aprobadaEl}
                    {f.estado === "Pagada" ? ` · pagada el ${f.guardada.pagadaEl} (${f.guardada.medio})` : ""}
                  </p>
                )}
              </section>
            );
          })}
        </div>
      )}
      <p className="text-[11px] text-muted-foreground">
        Cálculo con los aranceles de Presupuestos y los turnos «Atendida» de la Agenda. Sueldos y recibos están en Recursos Humanos.
      </p>
    </div>
  );
}

/* ───────────── Auditoría ───────────── */

export function AuditoriaPortal({
  clinicId,
  miembros,
  onToast,
}: {
  clinicId: string | null;
  miembros: TeamMember[];
  onToast?: (m: string) => void;
}) {
  const { eventos: eventosClinica } = useAuditoria(clinicId ?? "demo");
  const { eventos: eventosPortal } = storeEquipoPortal.usar();
  const [q, setQ] = useState("");
  const [origen, setOrigen] = useState<"todo" | "portal" | "clinica">("todo");
  const nombre = (id: string) => {
    const m = miembros.find((x) => x.id === id);
    return m ? nombreDe(m) : "Integrante";
  };
  const todas = [
    ...eventosPortal.map((e) => ({
      id: e.id,
      fecha: e.fecha,
      quien: nombre(e.miembroId),
      accion: e.accion,
      detalle: e.detalle,
      origen: "Portal del equipo",
      resultado: "Correcto",
    })),
    ...eventosClinica.map((e) => ({
      id: e.id,
      fecha: e.fecha,
      quien: e.usuario,
      accion: e.accion,
      detalle: e.modulo,
      origen: "Clínica",
      resultado: e.resultado,
    })),
  ].sort((a, b) => b.fecha.localeCompare(a.fecha));
  const filas = todas
    .filter((f) => origen === "todo" || (origen === "portal" ? f.origen === "Portal del equipo" : f.origen === "Clínica"))
    .filter((f) => !q || `${f.quien} ${f.accion} ${f.detalle}`.toLowerCase().includes(q.toLowerCase()))
    .slice(0, 300);
  const hoy = hoyISO();
  const deHoy = todas.filter((f) => f.fecha.startsWith(hoy)).length;
  const personas = new Set(todas.map((f) => f.quien)).size;
  const fallidas = todas.filter((f) => f.resultado !== "Correcto").length;
  const cuando = (iso: string) =>
    new Date(iso).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });

  const excel = async () => {
    const { descargarExcel } = await import("@/components/cloud-esther/rrhh/excel");
    await descargarExcel(`auditoria-${hoy}.xlsx`, [
      {
        nombre: "Auditoría",
        nota: `Auditoría de la clínica · exportada el ${fechaCorta(hoy)} · ${filas.length} acciones`,
        columnas: [
          { titulo: "Fecha y hora", clave: "fecha", ancho: 18 },
          { titulo: "Persona", clave: "quien", ancho: 22 },
          { titulo: "Acción", clave: "accion", ancho: 34 },
          { titulo: "Detalle / módulo", clave: "detalle", ancho: 30 },
          { titulo: "Origen", clave: "origen", ancho: 18 },
          { titulo: "Resultado", clave: "resultado", ancho: 12 },
        ],
        filas: filas.map((f) => ({ fecha: cuando(f.fecha), quien: f.quien, accion: f.accion, detalle: f.detalle, origen: f.origen, resultado: f.resultado })),
      },
    ]);
    onToast?.("Auditoría exportada a Excel");
  };
  const pdf = async () => {
    const html = `<!doctype html><html><head><meta charset="utf-8"><style>
      body{font-family:Inter,Arial,sans-serif;color:#1e1b2e;margin:0;padding:32px 36px;font-size:11px}
      .cab{background:linear-gradient(118deg,#4c1d95,#7c3aed 50%,#c026d3);color:#fff;border-radius:16px;padding:18px 22px;margin-bottom:16px}
      .cab p{margin:0;opacity:.8;font-size:9px;letter-spacing:.18em;text-transform:uppercase;font-weight:700}.cab h1{margin:4px 0 0;font-size:20px}
      table{width:100%;border-collapse:collapse}th{text-align:left;font-size:8.5px;letter-spacing:.12em;text-transform:uppercase;color:#7c6f9b;border-bottom:2px solid #ede9fe;padding:7px 5px}
      td{padding:7px 5px;border-bottom:1px solid #f1eefb;vertical-align:top}
    </style></head><body><div class="cab"><p>Auditoría completa</p><h1>Quién hizo qué y cuándo</h1><span>Exportada el ${fechaCorta(hoy)} · ${filas.length} acciones</span></div>
    <table><thead><tr><th>Fecha</th><th>Persona</th><th>Acción</th><th>Detalle</th><th>Origen</th></tr></thead><tbody>
    ${filas.map((f) => `<tr><td>${esc(cuando(f.fecha))}</td><td>${esc(f.quien)}</td><td>${esc(f.accion)}</td><td>${esc(f.detalle)}</td><td>${esc(f.origen)}</td></tr>`).join("") || '<tr><td colspan="5">Sin acciones registradas.</td></tr>'}
    </tbody></table></body></html>`;
    const ok = await descargarPDF(html, `Auditoría ${hoy}`);
    onToast?.(ok ? "Auditoría exportada a PDF" : "No se pudo armar el PDF");
  };

  // Agrupadas por día para la línea de tiempo
  const dias = [...new Set(filas.map((f) => f.fecha.slice(0, 10)))];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiPortal titulo="Acciones registradas" valor={String(todas.length)} detalle="historial completo" icon={History} />
        <KpiPortal titulo="Hoy" valor={String(deHoy)} detalle="acciones del día" icon={CalendarDays} tono="azul" />
        <KpiPortal titulo="Personas" valor={String(personas)} detalle="con actividad" icon={Users} tono="verde" />
        <KpiPortal titulo="Fallidas o denegadas" valor={String(fallidas)} detalle="intentos sin permiso" icon={ShieldCheck} tono={fallidas ? "rosa" : "ambar"} />
      </div>
      <TarjetaPortal
        titulo="Auditoría de acciones"
        detalle="Quién hizo qué, cuándo y desde dónde"
        icon={ShieldCheck}
        acciones={
          <div className="flex gap-2">
            <button type="button" onClick={() => void excel()} className="btn-ce-outline !min-h-10">
              <FileSpreadsheet className="size-4" /> Excel
            </button>
            <button type="button" onClick={() => void pdf()} className="btn-ce-outline !min-h-10">
              <FileText className="size-4" /> PDF
            </button>
          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary/70" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar persona o acción" className={`${INPUT} pl-10`} />
          </label>
          <PestanasPortal
            valor={origen}
            onCambiar={setOrigen}
            opciones={[
              { id: "todo", label: "Todo" },
              { id: "portal", label: "Portal del equipo" },
              { id: "clinica", label: "Clínica" },
            ]}
          />
        </div>
        {filas.length === 0 ? (
          <VacioPortal
            icon={ShieldCheck}
            titulo="Todavía no hay acciones registradas"
            texto="Cada ingreso, cobro, turno o cambio en pacientes queda anotado acá automáticamente, con persona, fecha y hora."
          />
        ) : (
          <div className="mt-4 space-y-5">
            {dias.map((d) => (
              <div key={d}>
                <p className="mb-2 flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  <span className="h-1 w-3 rounded-full bg-gradient-to-r from-primary to-fuchsia-500" />
                  {d === hoy ? "Hoy" : fechaCorta(d)}
                </p>
                <ol className="relative space-y-1 border-l-2 border-dashed border-primary/15 pl-5">
                  {filas
                    .filter((f) => f.fecha.startsWith(d))
                    .map((f) => (
                      <li key={`${f.origen}-${f.id}`} className="relative rounded-2xl px-3 py-2 transition hover:bg-primary/[0.04]">
                        <span
                          aria-hidden
                          className={`absolute -left-[27px] top-3.5 size-3 rounded-full ring-4 ring-card ${f.resultado === "Correcto" ? "bg-gradient-to-br from-primary to-fuchsia-500" : "bg-rose-500"}`}
                        />
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <AvatarPortal nombre={f.quien} tam="sm" className="!size-6 !rounded-lg !text-[9px]" />
                          <b className="text-sm">{f.quien}</b>
                          <span className="text-sm text-foreground/85">{f.accion}</span>
                          <span className="ml-auto text-[11px] tabular-nums text-muted-foreground">
                            {new Date(f.fecha).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <p className="mt-0.5 pl-8 text-xs text-muted-foreground">
                          {f.detalle} · <span className="rounded-full bg-muted px-1.5 py-px text-[10px] font-semibold">{f.origen}</span>
                        </p>
                      </li>
                    ))}
                </ol>
              </div>
            ))}
          </div>
        )}
      </TarjetaPortal>
    </div>
  );
}
