import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  CalendarCheck2,
  Check,
  ClipboardList,
  Download,
  FileSpreadsheet,
  FileText,
  LayoutDashboard,
  MessageCircle,
  Plus,
  ReceiptText,
  ShieldCheck,
  Trash2,
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

/* Ubicación: src/components/cloud-esther/portal-equipo/EspacioAdministrativo.tsx
   Espacio de trabajo de la secretaria / administración dentro del Portal del equipo.
   No es la pantalla del odontólogo: reúne lo administrativo (turnos por confirmar, cobros,
   presupuestos, documentos y planillas, tareas) y respeta los permisos del integrante.
   Las planillas se descargan para Excel (CSV) y los documentos para Word (.doc); la integración
   directa con Microsoft 365 / Google Workspace queda para el backend.
   TODO backend: los mismos datos por API con el token del integrante (clinicId + rol + permisos). */

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

const pesos = (n: number) => `$ ${Math.round(n).toLocaleString("es-AR")}`;
const nombreCompleto = (p: Paciente) => `${p.nombre} ${p.apellido}`.trim();

function hoyISO(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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
  a.click();
  URL.revokeObjectURL(url);
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
}: {
  yo: TeamMember;
  clinica: string;
  vista: boolean;
  /** ¿El integrante tiene este permiso? (Equipo → Permisos y accesos). */
  puede: (permiso: string) => boolean;
  turnos: Turno[];
  onToast: (m: string) => void;
  abrirFicha: (paciente: string) => void;
}) {
  const [pestana, setPestana] = useState<Pestana>("escritorio");
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

  const confirmar = (t: Turno) => {
    if (vista || !gestionarTurnos) return onToast("Tu rol no puede confirmar turnos");
    setTurnosStore((prev) => prev.map((x) => (x.id === t.id ? { ...x, estado: "Confirmada" } : x)));
    registrarEventoEquipo(yo.id, "Confirmó turno", `${t.paciente} · ${t.fecha} ${t.hora}`);
    onToast(`Turno de ${t.paciente} confirmado`);
  };

  return (
    <div className="space-y-4">
      <header className="rounded-3xl border border-primary/12 bg-card p-4 shadow-sm sm:p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
          Administración
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold tracking-tight">Tu escritorio</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Turnos por confirmar, cobros, presupuestos, documentos y tareas de {clinica}.
        </p>
      </header>

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

      {pestana === "escritorio" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Indicador
              titulo="Turnos de hoy"
              valor={String(deHoy.length)}
              detalle={`${sinConfirmar.length} por confirmar`}
            />
            <Indicador
              titulo="Por cobrar"
              valor={verFacturacion ? pesos(porCobrar) : "—"}
              detalle={verFacturacion ? `${saldos.length} pacientes` : "Sin permiso"}
            />
            <Indicador
              titulo="Presupuestos"
              valor={String(presupuestos.length)}
              detalle="sin respuesta"
            />
            <Indicador titulo="Tareas" valor={String(pendientes.length)} detalle="pendientes" />
          </div>

          <Bloque titulo="Turnos por confirmar" icono={CalendarCheck2} detalle="Hoy y mañana">
            {sinConfirmar.length === 0 ? (
              <Vacio>No hay turnos pendientes de confirmar.</Vacio>
            ) : (
              <ul className="divide-y divide-border/60">
                {sinConfirmar.slice(0, 8).map((t) => {
                  const p = porNombre.get(t.paciente);
                  const wa = p
                    ? whatsapp(
                        p.telefono,
                        `Hola ${p.nombre}, te escribimos de ${clinica} para confirmar tu turno del ${t.fecha === hoyISO() ? "día de hoy" : "día de mañana"} a las ${t.hora}. ¿Nos confirmás?`,
                      )
                    : null;
                  return (
                    <li key={t.id} className="flex flex-wrap items-center gap-2 py-2.5">
                      <button
                        type="button"
                        onClick={() => abrirFicha(t.paciente)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <span className="block truncate text-sm font-semibold">{t.paciente}</span>
                        <span className="block text-xs text-muted-foreground">
                          {t.fecha === hoyISO() ? "Hoy" : "Mañana"} {t.hora} · {t.tratamiento} ·{" "}
                          {t.odontologo}
                        </span>
                      </button>
                      <div className="flex w-full gap-2 sm:w-auto">
                        {wa && (
                          <a
                            href={wa}
                            target="_blank"
                            rel="noreferrer"
                            className="btn-ce-outline !min-h-10 flex-1 justify-center sm:flex-none"
                          >
                            <MessageCircle className="size-4" /> WhatsApp
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => confirmar(t)}
                          className="btn-ce !min-h-10 flex-1 justify-center sm:flex-none"
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
                        className="btn-ce-outline !min-h-10 w-full justify-center sm:w-auto"
                      >
                        <MessageCircle className="size-4" /> Recordar
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

function Indicador({ titulo, valor, detalle }: { titulo: string; valor: string; detalle: string }) {
  return (
    <div className="rounded-2xl border border-primary/12 bg-card p-3.5 shadow-sm">
      <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-primary/80">
        {titulo}
      </p>
      <p className="mt-1 truncate text-2xl font-extrabold tabular-nums text-foreground">{valor}</p>
      <p className="text-xs text-muted-foreground">{detalle}</p>
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
    <section className="rounded-3xl border border-primary/12 bg-card p-4 shadow-sm sm:p-5">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
            <Icono className="size-4" />
          </span>
          <div>
            <h2 className="text-sm font-bold">{titulo}</h2>
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
