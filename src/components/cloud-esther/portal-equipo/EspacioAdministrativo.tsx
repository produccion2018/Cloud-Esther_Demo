import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowRight,
  CalendarCheck2,
  CalendarClock,
  CalendarPlus,
  Check,
  ClipboardList,
  Clock3,
  Download,
  FileSpreadsheet,
  FileText,
  LayoutDashboard,
  MessageCircle,
  Plus,
  ReceiptText,
  ShieldCheck,
  Trash2,
  UserPlus,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import {
  useRegistrosPacientes,
  useTodosLosRegistros,
  type Movimiento,
  type PresupuestoPaciente,
  type Registros,
} from "@/components/cloud-esther/PacienteSecciones";
import type { TeamMember } from "@/lib/cloud-esther/equipo-profesional-data";
import { usePacientes, type Paciente } from "@/lib/cloud-esther/pacientes";
import {
  setTareasStore,
  setTurnosStore,
  storeAgenda,
  type Turno,
} from "@/lib/cloud-esther/agenda-store";
import { registrarEventoEquipo } from "@/lib/cloud-esther/portal-equipo-store";
import { HeroPortal, KpiPortal } from "@/components/cloud-esther/portales/PortalShell";
import { IconoWhatsApp } from "@/components/cloud-esther/IconoWhatsApp";

/* Ubicación: src/components/cloud-esther/portal-equipo/EspacioAdministrativo.tsx
   Espacio de trabajo de la secretaria / administración dentro del Portal del equipo.
   No es la pantalla del odontólogo: reúne lo administrativo (turnos por confirmar, cobros,
   presupuestos, documentos y planillas, tareas) y respeta los permisos del integrante.
   Las planillas se descargan para Excel (CSV) y los documentos para Word (.doc); la integración
   directa con Microsoft 365 / Google Workspace queda para el backend.
   TODO backend: los mismos datos por API con el token del integrante (clinicId + rol + permisos). */

export type PestanaAdministrativa = Pestana;
/** Secciones del Portal administrativo a las que se puede saltar desde el escritorio. */
export type DestinoEscritorio = "agenda" | "cobros" | "pacientes-admin" | "tareas" | "presupuestos";
type Pestana = "escritorio" | "cobros" | "presupuestos" | "documentos" | "tareas";

const PESTANAS: { id: Pestana; label: string; icon: LucideIcon }[] = [
  { id: "escritorio", label: "Escritorio", icon: LayoutDashboard },
  { id: "cobros", label: "Cobros y pagos", icon: Wallet },
  { id: "presupuestos", label: "Presupuestos", icon: ReceiptText },
  { id: "documentos", label: "Documentos y planillas", icon: FileText },
  { id: "tareas", label: "Tareas", icon: ClipboardList },
];

const MEDIOS = ["Efectivo", "Transferencia", "Tarjeta de débito", "Tarjeta de crédito"];
const INPUT =
  "h-11 w-full rounded-xl border border-primary/15 bg-card px-3 text-base outline-none focus:border-primary/45 focus:ring-4 focus:ring-primary/10 sm:h-10 sm:text-sm";

const pesos = (n: number) => `$\u00a0${Math.round(n).toLocaleString("es-AR")}`;
const nombreCompleto = (p: Paciente) => `${p.nombre} ${p.apellido}`.trim();

function hoyISO(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const PUNTO_ESTADO: Record<Turno["estado"], string> = {
  Pendiente: "bg-amber-400",
  Confirmada: "bg-primary",
  Atendida: "bg-emerald-500",
  Ausente: "bg-rose-500",
  Cancelada: "bg-slate-400",
};

function saludoDelDia() {
  const h = new Date().getHours();
  return h < 12 ? "Buenos días" : h < 20 ? "Buenas tardes" : "Buenas noches";
}

function fechaLarga() {
  const t = new Date().toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function saldoDe(r: Registros | undefined) {
  if (!r) return 0;
  return r.cuenta.reduce((s, m) => s + (m.tipo === "Cargo" ? m.monto : -m.monto), 0);
}

function totalPresupuesto(p: PresupuestoPaciente) {
  const bruto = p.lineas.reduce((s, l) => s + l.cantidad * l.precio, 0);
  return Math.round(bruto * (1 - (p.descuentoPct ?? 0) / 100));
}

function whatsapp(telefono: string, texto: string) {
  const numero = telefono.replace(/[^0-9]/g, "");
  return numero ? `https://wa.me/${numero}?text=${encodeURIComponent(texto)}` : null;
}

/** Planilla para Excel (CSV con separador «;» y BOM, abre bien en Excel en español). */
function descargarPlanilla(nombre: string, filas: (string | number)[][]) {
  const texto = filas
    .map((f) => f.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";"))
    .join("\n");
  descargar(`${nombre}.csv`, new Blob([`\ufeff${texto}`], { type: "text/csv;charset=utf-8" }));
}

/** Documento para Word (.doc a partir de HTML; Word lo abre y permite editarlo). */
function descargarDocumento(nombre: string, titulo: string, cuerpo: string, clinica: string) {
  const html = `<html><head><meta charset="utf-8"><title>${titulo}</title></head>
<body style="font-family:Calibri,Arial,sans-serif;font-size:12pt;line-height:1.5">
<p style="color:#6d28d9;font-weight:bold;margin:0">${clinica}</p>
<h1 style="font-size:18pt;margin:6pt 0 12pt">${titulo}</h1>${cuerpo}
<p style="margin-top:36pt">______________________________<br/>Firma y sello</p>
</body></html>`;
  descargar(`${nombre}.doc`, new Blob([html], { type: "application/msword" }));
}

function descargar(archivo: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = archivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

const escapar = (t: string) =>
  t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);

export function EspacioAdministrativo({
  yo,
  clinica,
  vista,
  puede,
  turnos,
  onToast,
  abrirFicha,
  pestana: pestanaControlada,
  onIr,
  disponibles = [],
}: {
  yo: TeamMember;
  clinica: string;
  vista: boolean;
  /** Si se indica, la pestaña la elige el menú del portal y no se muestra la barra interna. */
  pestana?: Pestana;
  /** ¿El integrante tiene este permiso? (Equipo → Permisos y accesos). */
  puede: (permiso: string) => boolean;
  turnos: Turno[];
  onToast: (m: string) => void;
  abrirFicha: (paciente: string) => void;
  /** Accesos rápidos del escritorio: solo aparecen los destinos que el portal habilita. */
  onIr?: ((destino: DestinoEscritorio) => void) | undefined;
  disponibles?: DestinoEscritorio[] | undefined;
}) {
  const [pestanaInterna, setPestana] = useState<Pestana>("escritorio");
  const pestana = pestanaControlada ?? pestanaInterna;
  const controlada = pestanaControlada !== undefined;
  const { pacientes } = usePacientes();
  const registros = useTodosLosRegistros();
  const { cambiar } = useRegistrosPacientes();
  const { tareas } = storeAgenda.usar();
  const quien = `${yo.firstName} ${yo.lastName}`.trim();

  const verFacturacion = puede("gestionar_facturacion");
  const gestionarTurnos = puede("gestionar_turnos");

  const porNombre = useMemo(
    () => new Map(pacientes.map((p) => [nombreCompleto(p), p])),
    [pacientes],
  );
  const saldos = pacientes
    .map((p) => ({ p, saldo: saldoDe(registros[p.id]) }))
    .filter((x) => x.saldo > 0)
    .sort((a, b) => b.saldo - a.saldo);
  const porCobrar = saldos.reduce((s, x) => s + x.saldo, 0);
  const presupuestos = pacientes
    .flatMap((p) =>
      (registros[p.id]?.presupuestos ?? [])
        .filter((b) => b.estado === "Enviado" || b.estado === "Borrador")
        .map((b) => ({ p, b })),
    )
    .sort((a, b) => b.b.fecha.localeCompare(a.b.fecha));
  const sinConfirmar = turnos
    .filter((t) => (t.fecha === hoyISO() || t.fecha === hoyISO(1)) && t.estado === "Pendiente")
    .sort((a, b) => `${a.fecha}${a.hora}`.localeCompare(`${b.fecha}${b.hora}`));
  const deHoy = turnos.filter((t) => t.fecha === hoyISO());
  const pendientes = tareas.filter((t) => !t.hecha);
  const vencidas = pendientes.filter((t) => t.vence && t.vence < hoyISO()).length;
  const confirmadosHoy = deHoy.filter(
    (t) => t.estado === "Confirmada" || t.estado === "Atendida",
  ).length;
  const avance = deHoy.length ? Math.round((confirmadosHoy / deHoy.length) * 100) : 100;
  const ir = (d: DestinoEscritorio) =>
    onIr && disponibles.includes(d) ? () => onIr(d) : undefined;
  const atajos = (
    [
      { id: "agenda", label: "Nuevo turno", corto: "Turno", icon: CalendarPlus },
      { id: "cobros", label: "Registrar cobro", corto: "Cobrar", icon: Wallet },
      { id: "pacientes-admin", label: "Alta de paciente", corto: "Paciente", icon: UserPlus },
      { id: "tareas", label: "Nueva tarea", corto: "Tarea", icon: ClipboardList },
    ] as const
  ).filter((a) => ir(a.id));

  const confirmar = (t: Turno) => {
    if (vista || !gestionarTurnos) return onToast("Tu rol no puede confirmar turnos");
    setTurnosStore((prev) => prev.map((x) => (x.id === t.id ? { ...x, estado: "Confirmada" } : x)));
    registrarEventoEquipo(yo.id, "Confirmó turno", `${t.paciente} · ${t.fecha} ${t.hora}`);
    onToast(`Turno de ${t.paciente} confirmado`);
  };

  return (
    <div className="space-y-4">
      {!controlada && (
        <header className="rounded-3xl border border-primary/12 bg-card p-4 shadow-sm sm:p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
            Administración
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight">Tu escritorio</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Turnos por confirmar, cobros, presupuestos, documentos y tareas de {clinica}.
          </p>
        </header>
      )}

      {!controlada && (
        <div
          className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0"
          role="tablist"
        >
          {PESTANAS.map((p) => (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={pestana === p.id}
              onClick={() => setPestana(p.id)}
              className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl px-3.5 text-sm font-semibold transition ${
                pestana === p.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "border border-primary/12 bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              <p.icon className="size-4" />
              {p.label}
            </button>
          ))}
        </div>
      )}

      {pestana === "escritorio" && (
        <div className="space-y-5">
          <HeroPortal
            saludo={`${saludoDelDia()} · Escritorio administrativo`}
            titulo={`Hola, ${yo.firstName}`}
            detalle={`${fechaLarga()} · ${clinica}. Hoy hay ${deHoy.length} turnos y ${sinConfirmar.length} esperan confirmación.`}
          >
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <div className="rounded-2xl border border-white/20 bg-white/10 p-3.5 backdrop-blur-md">
                <div className="flex items-center justify-between gap-3 text-xs font-semibold">
                  <span className="text-white/85">Turnos confirmados hoy</span>
                  <span className="tabular-nums">
                    {confirmadosHoy}/{deHoy.length || 0}
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/20">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-white to-fuchsia-200 transition-all"
                    style={{ width: `${avance}%` }}
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-white/75">
                  {avance === 100
                    ? "Agenda del día confirmada."
                    : `${avance}% de la agenda confirmada`}
                </p>
              </div>
              {atajos.length > 0 && (
                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                  {atajos.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => onIr?.(a.id)}
                      className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-3 text-[13px] font-semibold text-white backdrop-blur-md transition hover:bg-white/25 sm:px-3.5 sm:text-sm"
                    >
                      <a.icon className="size-4" />
                      <span className="sm:hidden">{a.corto}</span>
                      <span className="hidden sm:inline">{a.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </HeroPortal>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiPortal
              titulo="Turnos de hoy"
              valor={String(deHoy.length)}
              detalle={`${sinConfirmar.length} por confirmar`}
              icon={CalendarCheck2}
              onClick={ir("agenda")}
            />
            <KpiPortal
              titulo="Por cobrar"
              valor={verFacturacion ? pesos(porCobrar) : "—"}
              detalle={verFacturacion ? `${saldos.length} pacientes con saldo` : "Sin permiso"}
              icon={Wallet}
              tono="verde"
              onClick={verFacturacion ? ir("cobros") : undefined}
            />
            <KpiPortal
              titulo="Presupuestos"
              valor={String(presupuestos.length)}
              detalle="sin respuesta del paciente"
              icon={ReceiptText}
              tono="ambar"
              onClick={ir("presupuestos")}
            />
            <KpiPortal
              titulo="Tareas"
              valor={String(pendientes.length)}
              detalle={vencidas ? `${vencidas} vencidas` : "pendientes"}
              icon={ClipboardList}
              tono={vencidas ? "rosa" : "azul"}
              onClick={ir("tareas")}
            />
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <Bloque
              titulo="Turnos por confirmar"
              icono={CalendarCheck2}
              detalle="Hoy y mañana · confirmá o escribí por WhatsApp"
              acciones={
                sinConfirmar.length > 0 ? (
                  <span className="rounded-full bg-gradient-to-r from-primary to-fuchsia-500 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm">
                    {sinConfirmar.length} pendientes
                  </span>
                ) : undefined
              }
            >
              {sinConfirmar.length === 0 ? (
                <Vacio>No hay turnos pendientes de confirmar.</Vacio>
              ) : (
                <ul className="space-y-2">
                  {sinConfirmar.slice(0, 8).map((t) => {
                    const p = porNombre.get(t.paciente);
                    const wa = p
                      ? whatsapp(
                          p.telefono,
                          `Hola ${p.nombre}, te escribimos de ${clinica} para confirmar tu turno del ${t.fecha === hoyISO() ? "día de hoy" : "día de mañana"} a las ${t.hora}. ¿Nos confirmás?`,
                        )
                      : null;
                    return (
                      <li
                        key={t.id}
                        className="flex flex-wrap items-center gap-3 rounded-2xl border border-primary/10 bg-gradient-to-r from-primary/[0.04] to-transparent p-3 transition hover:border-primary/25 hover:shadow-[0_10px_24px_-18px_rgba(124,58,237,0.7)]"
                      >
                        <span className="grid w-14 shrink-0 place-items-center rounded-xl bg-card py-1.5 text-center shadow-sm ring-1 ring-primary/10">
                          <span className="text-[10px] font-bold uppercase text-muted-foreground">
                            {t.fecha === hoyISO() ? "Hoy" : "Mañana"}
                          </span>
                          <span className="font-display text-sm font-bold tabular-nums text-primary">
                            {t.hora}
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => abrirFicha(t.paciente)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <span className="block truncate text-sm font-semibold">{t.paciente}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {t.tratamiento} · {t.odontologo}
                          </span>
                        </button>
                        <div className="flex w-full gap-2 sm:w-auto">
                          {wa && (
                            <a
                              href={wa}
                              target="_blank"
                              rel="noreferrer"
                              className="btn-wa flex-1 sm:flex-none"
                            >
                              <IconoWhatsApp /> WhatsApp
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => confirmar(t)}
                            className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-primary to-fuchsia-500 px-4 text-sm font-semibold text-white shadow-[0_10px_22px_-12px_rgba(124,58,237,0.9)] transition hover:brightness-110 sm:flex-none"
                          >
                            <Check className="size-4" /> Confirmar
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Bloque>

            <div className="space-y-5">
              <Bloque
                titulo="Agenda de hoy"
                icono={CalendarClock}
                detalle={`${deHoy.length} turnos`}
              >
                {deHoy.length === 0 ? (
                  <Vacio>Hoy no hay turnos cargados.</Vacio>
                ) : (
                  <ol className="relative space-y-3 border-l-2 border-primary/15 pl-4">
                    {[...deHoy]
                      .sort((x, y) => x.hora.localeCompare(y.hora))
                      .slice(0, 6)
                      .map((t) => (
                        <li key={t.id} className="relative">
                          <span
                            className={`absolute -left-[23px] top-1 size-3 rounded-full ring-4 ring-card ${PUNTO_ESTADO[t.estado]}`}
                          />
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-sm font-semibold">
                              <span className="mr-1.5 tabular-nums text-primary">{t.hora}</span>
                              {t.paciente}
                            </p>
                            <span className="shrink-0 text-[11px] font-semibold text-muted-foreground">
                              {t.estado}
                            </span>
                          </div>
                          <p className="truncate text-xs text-muted-foreground">
                            {t.tratamiento} · {t.odontologo}
                          </p>
                        </li>
                      ))}
                  </ol>
                )}
                {ir("agenda") && (
                  <button
                    type="button"
                    onClick={ir("agenda")}
                    className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                  >
                    Ver agenda completa <ArrowRight className="size-3.5" />
                  </button>
                )}
              </Bloque>

              {verFacturacion && saldos.length > 0 && (
                <Bloque titulo="Mayores saldos" icono={Wallet} detalle="Para gestionar el cobro">
                  <ul className="space-y-2.5">
                    {saldos.slice(0, 4).map(({ p, saldo }) => (
                      <li key={p.id}>
                        <div className="flex items-center justify-between gap-2 text-sm">
                          <button
                            type="button"
                            onClick={() => abrirFicha(nombreCompleto(p))}
                            className="truncate text-left font-semibold hover:text-primary"
                          >
                            {nombreCompleto(p)}
                          </button>
                          <span className="shrink-0 font-bold tabular-nums">{pesos(saldo)}</span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-primary/10">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
                            style={{
                              width: `${Math.max(6, Math.round((saldo / (saldos[0]?.saldo || 1)) * 100))}%`,
                            }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                </Bloque>
              )}

              <Bloque
                titulo="Tareas pendientes"
                icono={ClipboardList}
                detalle={`${pendientes.length} abiertas`}
              >
                {pendientes.length === 0 ? (
                  <Vacio>Sin tareas pendientes.</Vacio>
                ) : (
                  <ul className="space-y-2">
                    {[...pendientes]
                      .sort((x, y) => (x.vence ?? "9").localeCompare(y.vence ?? "9"))
                      .slice(0, 4)
                      .map((t) => {
                        const vencida = !!t.vence && t.vence < hoyISO();
                        return (
                          <li
                            key={t.id}
                            className="flex items-start gap-2.5 rounded-xl bg-muted/50 px-3 py-2"
                          >
                            <Clock3
                              className={`mt-0.5 size-4 shrink-0 ${vencida ? "text-rose-500" : "text-primary"}`}
                            />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold">{t.texto}</p>
                              <p
                                className={`text-[11px] ${vencida ? "font-semibold text-rose-600" : "text-muted-foreground"}`}
                              >
                                {t.vence
                                  ? `${vencida ? "Venció" : "Vence"} ${t.vence.split("-").reverse().join("/")}`
                                  : "Sin vencimiento"}
                                {t.responsable ? ` · ${t.responsable}` : ""}
                              </p>
                            </div>
                          </li>
                        );
                      })}
                  </ul>
                )}
              </Bloque>
            </div>
          </div>
        </div>
      )}

      {pestana === "cobros" &&
        (verFacturacion ? (
          <Cobros
            saldos={saldos}
            pacientes={pacientes}
            vista={vista}
            onCobrar={(p, monto, medio) => {
              const mov: Movimiento = {
                id: Date.now(),
                fecha: hoyISO(),
                tipo: "Pago",
                concepto: "Pago registrado por administración",
                medio,
                monto,
                notas: `Registrado por ${quien}`,
              };
              cambiar(p.id, "cuenta", (prev) => [mov, ...prev]);
              registrarEventoEquipo(
                yo.id,
                "Registró un cobro",
                `${nombreCompleto(p)} · ${pesos(monto)} · ${medio}`,
              );
              onToast(`Cobro de ${pesos(monto)} registrado`);
            }}
          />
        ) : (
          <SinPermiso permiso="Gestionar facturación" />
        ))}

      {pestana === "presupuestos" && (
        <Bloque
          titulo="Presupuestos sin respuesta"
          icono={ReceiptText}
          detalle="Enviados o en borrador"
        >
          {presupuestos.length === 0 ? (
            <Vacio>No hay presupuestos pendientes.</Vacio>
          ) : (
            <ul className="divide-y divide-border/60">
              {presupuestos.map(({ p, b }) => {
                const wa = whatsapp(
                  p.telefono,
                  `Hola ${p.nombre}, te escribimos de ${clinica} por el presupuesto ${b.numero}. ¿Pudiste verlo? Quedamos a disposición para cualquier consulta.`,
                );
                return (
                  <li key={`${p.id}-${b.id}`} className="flex flex-wrap items-center gap-2 py-2.5">
                    <button
                      type="button"
                      onClick={() => abrirFicha(nombreCompleto(p))}
                      className="min-w-0 flex-1 text-left"
                    >
                      <span className="block truncate text-sm font-semibold">
                        {nombreCompleto(p)}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {b.numero} · {b.estado} · {b.fecha}
                        {verFacturacion ? ` · ${pesos(totalPresupuesto(b))}` : ""}
                      </span>
                    </button>
                    {wa && (
                      <a
                        href={wa}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-wa w-full sm:w-auto"
                      >
                        <IconoWhatsApp /> Recordar
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Bloque>
      )}

      {pestana === "documentos" && (
        <Documentos
          clinica={clinica}
          pacientes={pacientes}
          registros={registros}
          turnos={turnos}
          saldos={saldos}
          verImportes={verFacturacion}
          onToast={onToast}
        />
      )}

      {pestana === "tareas" && <Tareas vista={vista} onToast={onToast} quien={quien} />}
    </div>
  );
}

function Bloque({
  titulo,
  detalle,
  icono: Icono,
  children,
  acciones,
}: {
  titulo: string;
  detalle?: string;
  icono: LucideIcon;
  children: ReactNode;
  acciones?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-[26px] border border-primary/10 bg-card p-4 shadow-[0_16px_40px_-30px_rgba(124,58,237,0.65)] sm:p-5">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-fuchsia-500 to-pink-400 opacity-80"
      />
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="grid size-10 place-items-center rounded-2xl bg-gradient-to-br from-primary to-fuchsia-500 text-white shadow-[0_8px_18px_-10px_rgba(124,58,237,0.9)]">
            <Icono className="size-[18px]" />
          </span>
          <div>
            <h2 className="font-display text-[15px] font-bold tracking-tight">{titulo}</h2>
            {detalle && <p className="text-xs text-muted-foreground">{detalle}</p>}
          </div>
        </div>
        {acciones}
      </div>
      {children}
    </section>
  );
}

function Vacio({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-2xl border border-dashed border-primary/20 px-3 py-6 text-center text-sm text-muted-foreground">
      {children}
    </p>
  );
}

function SinPermiso({ permiso }: { permiso: string }) {
  return (
    <div className="rounded-3xl border border-primary/12 bg-card p-6 text-center shadow-sm">
      <ShieldCheck className="mx-auto size-8 text-primary" />
      <p className="mt-2 text-sm font-semibold">Tu rol no tiene este permiso</p>
      <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
        Para ver y registrar cobros hace falta el permiso «{permiso}». Lo habilita el dueño o
        administración en Equipo → Permisos y accesos.
      </p>
    </div>
  );
}

function Cobros({
  saldos,
  pacientes,
  vista,
  onCobrar,
}: {
  saldos: { p: Paciente; saldo: number }[];
  pacientes: Paciente[];
  vista: boolean;
  onCobrar: (p: Paciente, monto: number, medio: string) => void;
}) {
  const [pacienteId, setPacienteId] = useState<number | "">("");
  const [monto, setMonto] = useState("");
  const [medio, setMedio] = useState(MEDIOS[0] ?? "Efectivo");
  const elegido = pacientes.find((p) => p.id === pacienteId);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <Bloque titulo="Saldos a cobrar" icono={Wallet} detalle="Cuentas corrientes de los pacientes">
        {saldos.length === 0 ? (
          <Vacio>No hay saldos pendientes.</Vacio>
        ) : (
          <ul className="divide-y divide-border/60">
            {saldos.map(({ p, saldo }) => (
              <li key={p.id} className="flex items-center gap-2 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{nombreCompleto(p)}</span>
                  <span className="block text-xs text-muted-foreground">
                    {p.obraSocial || "Particular"}
                  </span>
                </span>
                <span className="text-sm font-bold tabular-nums text-destructive">
                  {pesos(saldo)}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setPacienteId(p.id);
                    setMonto(String(saldo));
                  }}
                  className="btn-ce-outline !min-h-10"
                >
                  Cobrar
                </button>
              </li>
            ))}
          </ul>
        )}
      </Bloque>

      <Bloque
        titulo="Registrar cobro"
        icono={Plus}
        detalle="Queda en la cuenta corriente del paciente"
      >
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const n = Number(monto.replace(",", "."));
            if (vista) return;
            if (!elegido || !Number.isFinite(n) || n <= 0) return;
            onCobrar(elegido, n, medio);
            setMonto("");
          }}
        >
          <label className="block text-xs font-semibold">
            Paciente
            <select
              value={pacienteId}
              onChange={(e) => setPacienteId(e.target.value ? Number(e.target.value) : "")}
              className={`${INPUT} mt-1`}
            >
              <option value="">Elegí un paciente</option>
              {pacientes.map((p) => (
                <option key={p.id} value={p.id}>
                  {nombreCompleto(p)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-semibold">
            Importe
            <input
              inputMode="decimal"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder="0"
              className={`${INPUT} mt-1`}
            />
          </label>
          <label className="block text-xs font-semibold">
            Medio de pago
            <select
              value={medio}
              onChange={(e) => setMedio(e.target.value)}
              className={`${INPUT} mt-1`}
            >
              {MEDIOS.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={vista || !elegido || !monto}
            className="btn-ce !min-h-11 w-full justify-center"
          >
            <Check className="size-4" /> Registrar cobro
          </button>
          {vista && (
            <p className="text-[11px] text-muted-foreground">Vista previa: no se guardan cobros.</p>
          )}
        </form>
      </Bloque>
    </div>
  );
}

function Documentos({
  clinica,
  pacientes,
  registros,
  turnos,
  saldos,
  verImportes,
  onToast,
}: {
  clinica: string;
  pacientes: Paciente[];
  registros: Record<number, Registros>;
  turnos: Turno[];
  saldos: { p: Paciente; saldo: number }[];
  verImportes: boolean;
  onToast: (m: string) => void;
}) {
  const [pacienteId, setPacienteId] = useState<number | "">("");
  const p = pacientes.find((x) => x.id === pacienteId);
  const hoy = hoyISO();

  const planillas: { titulo: string; detalle: string; accion: () => void; importes?: boolean }[] = [
    {
      titulo: "Agenda del día",
      detalle: "Turnos de hoy con paciente, horario y profesional",
      accion: () =>
        descargarPlanilla(`agenda-${hoy}`, [
          ["Fecha", "Hora", "Paciente", "Tratamiento", "Profesional", "Sucursal", "Estado"],
          ...turnos
            .filter((t) => t.fecha === hoy)
            .sort((a, b) => a.hora.localeCompare(b.hora))
            .map((t) => [
              t.fecha,
              t.hora,
              t.paciente,
              t.tratamiento,
              t.odontologo,
              t.sucursal,
              t.estado,
            ]),
        ]),
    },
    {
      titulo: "Listado de pacientes",
      detalle: "Contacto, obra social y sucursal",
      accion: () =>
        descargarPlanilla("pacientes", [
          ["Paciente", "Documento", "Teléfono", "Email", "Obra social", "Sucursal", "Estado"],
          ...pacientes.map((x) => [
            nombreCompleto(x),
            x.documento,
            x.telefono,
            x.email,
            x.obraSocial,
            x.sucursal,
            x.estado,
          ]),
        ]),
    },
    {
      titulo: "Saldos a cobrar",
      detalle: "Cuentas corrientes con deuda",
      importes: true,
      accion: () =>
        descargarPlanilla(`saldos-${hoy}`, [
          ["Paciente", "Teléfono", "Saldo"],
          ...saldos.map(({ p: x, saldo }) => [nombreCompleto(x), x.telefono, saldo]),
        ]),
    },
  ];

  const documento = (tipo: "constancia" | "recibo" | "presupuesto") => {
    if (!p) return onToast("Elegí un paciente");
    const r = registros[p.id];
    const nombre = escapar(nombreCompleto(p));
    const doc = `DNI ${escapar(p.documento)}`;
    if (tipo === "constancia") {
      const turno = turnos
        .filter((t) => t.paciente === nombreCompleto(p) && t.fecha <= hoy)
        .sort((a, b) => `${b.fecha}${b.hora}`.localeCompare(`${a.fecha}${a.hora}`))[0];
      descargarDocumento(
        `constancia-${p.apellido}`,
        "Constancia de asistencia",
        `<p>Se deja constancia de que <b>${nombre}</b> (${doc}) concurrió a ${escapar(clinica)}${
          turno
            ? ` el día ${turno.fecha} a las ${turno.hora} para ${escapar(turno.tratamiento)}`
            : ""
        }.</p><p>Se extiende la presente a pedido del interesado para ser presentada ante quien corresponda.</p><p>Fecha: ${hoy}</p>`,
        clinica,
      );
    } else if (tipo === "recibo") {
      const pago = r?.cuenta.find((m) => m.tipo === "Pago");
      if (!pago) return onToast("Ese paciente no tiene pagos registrados");
      descargarDocumento(
        `recibo-${p.apellido}-${pago.fecha}`,
        "Recibo de pago",
        `<p>Recibimos de <b>${nombre}</b> (${doc}) la suma de <b>${pesos(pago.monto)}</b> en concepto de ${escapar(pago.concepto)}.</p><p>Medio de pago: ${escapar(pago.medio)} · Fecha: ${pago.fecha}</p><p style="color:#666;font-size:10pt">Documento interno, no válido como factura.</p>`,
        clinica,
      );
    } else {
      const b = r?.presupuestos.find((x) => x.estado !== "Rechazado");
      if (!b) return onToast("Ese paciente no tiene presupuestos");
      const filas = b.lineas
        .map(
          (l) =>
            `<tr><td>${escapar(l.descripcion)}</td><td>${escapar(l.pieza || "—")}</td><td style="text-align:right">${l.cantidad}</td><td style="text-align:right">${pesos(l.precio * l.cantidad)}</td></tr>`,
        )
        .join("");
      descargarDocumento(
        `presupuesto-${b.numero}`,
        `Presupuesto ${escapar(b.numero)}`,
        `<p>Paciente: <b>${nombre}</b> (${doc}) · Fecha: ${b.fecha}</p><table border="1" cellpadding="6" style="border-collapse:collapse;width:100%"><tr><th align="left">Tratamiento</th><th>Pieza</th><th>Cant.</th><th>Importe</th></tr>${filas}</table><p style="text-align:right"><b>Total: ${pesos(totalPresupuesto(b))}</b></p>`,
        clinica,
      );
    }
    onToast("Documento descargado: se abre con Word");
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Bloque
        titulo="Planillas para Excel"
        icono={FileSpreadsheet}
        detalle="Se descargan y se abren con Excel"
      >
        <ul className="space-y-2">
          {planillas
            .filter((x) => !x.importes || verImportes)
            .map((x) => (
              <li key={x.titulo}>
                <button
                  type="button"
                  onClick={() => {
                    x.accion();
                    onToast("Planilla descargada");
                  }}
                  className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-primary/12 bg-card px-3 text-left transition hover:border-primary/30"
                >
                  <FileSpreadsheet className="size-5 shrink-0 text-emerald-600" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{x.titulo}</span>
                    <span className="block text-xs text-muted-foreground">{x.detalle}</span>
                  </span>
                  <Download className="size-4 text-muted-foreground" />
                </button>
              </li>
            ))}
        </ul>
      </Bloque>

      <Bloque
        titulo="Documentos para Word"
        icono={FileText}
        detalle="Listos para imprimir o editar"
      >
        <label className="block text-xs font-semibold">
          Paciente
          <select
            value={pacienteId}
            onChange={(e) => setPacienteId(e.target.value ? Number(e.target.value) : "")}
            className={`${INPUT} mt-1`}
          >
            <option value="">Elegí un paciente</option>
            {pacientes.map((x) => (
              <option key={x.id} value={x.id}>
                {nombreCompleto(x)}
              </option>
            ))}
          </select>
        </label>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => documento("constancia")}
            className="btn-ce-outline !min-h-11 justify-center"
          >
            Constancia
          </button>
          {verImportes && (
            <button
              type="button"
              onClick={() => documento("recibo")}
              className="btn-ce-outline !min-h-11 justify-center"
            >
              Recibo
            </button>
          )}
          <button
            type="button"
            onClick={() => documento("presupuesto")}
            className="btn-ce-outline !min-h-11 justify-center"
          >
            Presupuesto
          </button>
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Los archivos de cada paciente (estudios, consentimientos, imágenes) están en su ficha. La
          integración directa con Microsoft 365 o Google Workspace queda para el backend.
        </p>
      </Bloque>
    </div>
  );
}

function Tareas({
  vista,
  onToast,
  quien,
}: {
  vista: boolean;
  onToast: (m: string) => void;
  quien: string;
}) {
  const { tareas } = storeAgenda.usar();
  const [texto, setTexto] = useState("");
  const ordenadas = [...tareas].sort((a, b) => Number(a.hecha) - Number(b.hecha) || b.id - a.id);

  return (
    <Bloque
      titulo="Tareas administrativas"
      icono={ClipboardList}
      detalle="Se comparten con la Agenda de la clínica"
    >
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (vista || !texto.trim()) return;
          setTareasStore((prev) => [
            {
              id: Date.now(),
              texto: texto.trim(),
              categoria: "Administración",
              paciente: "",
              fecha: hoyISO(),
              hecha: false,
            },
            ...prev,
          ]);
          setTexto("");
          onToast(`Tarea agregada por ${quien}`);
        }}
      >
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Ej.: llamar a la obra social por la autorización"
          className={INPUT}
        />
        <button
          type="submit"
          disabled={vista || !texto.trim()}
          className="btn-ce !min-h-11 shrink-0"
        >
          <Plus className="size-4" /> <span className="hidden sm:inline">Agregar</span>
        </button>
      </form>
      {ordenadas.length === 0 ? (
        <div className="mt-3">
          <Vacio>No hay tareas.</Vacio>
        </div>
      ) : (
        <ul className="mt-3 divide-y divide-border/60">
          {ordenadas.map((t) => (
            <li key={t.id} className="flex items-center gap-3 py-2">
              <button
                type="button"
                aria-label={t.hecha ? "Marcar pendiente" : "Marcar hecha"}
                disabled={vista}
                onClick={() =>
                  setTareasStore((prev) =>
                    prev.map((x) => (x.id === t.id ? { ...x, hecha: !x.hecha } : x)),
                  )
                }
                className={`grid size-7 shrink-0 place-items-center rounded-lg border ${
                  t.hecha ? "border-primary bg-primary text-primary-foreground" : "border-border"
                }`}
              >
                {t.hecha && <Check className="size-4" />}
              </button>
              <span className="min-w-0 flex-1">
                <span
                  className={`block text-sm ${t.hecha ? "text-muted-foreground line-through" : "font-medium"}`}
                >
                  {t.texto}
                </span>
                <span className="block text-[11px] text-muted-foreground">
                  {t.categoria}
                  {t.paciente ? ` · ${t.paciente}` : ""} · {t.fecha}
                </span>
              </span>
              <button
                type="button"
                aria-label="Eliminar tarea"
                disabled={vista}
                onClick={() => setTareasStore((prev) => prev.filter((x) => x.id !== t.id))}
                className="grid size-10 place-items-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Bloque>
  );
}
