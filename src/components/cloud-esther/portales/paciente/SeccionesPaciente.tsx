import { useState } from "react";
import {
  CalendarCheck2,
  CalendarClock,
  ChevronDown,
  Download,
  FileText,
  FlaskConical,
  History,
  LifeBuoy,
  Mail,
  MessageCircle,
  Phone,
  Pill,
  ReceiptText,
  Send,
  Stethoscope,
  Wallet,
} from "lucide-react";

import type { Registros } from "@/components/cloud-esther/PacienteSecciones";
import { totalesPresupuesto } from "@/components/cloud-esther/presupuestos/Presupuestos";
import type { Turno } from "@/lib/cloud-esther/agenda-store";
import { setComunicacion, storeComunicacion } from "@/lib/cloud-esther/comunicacion-store";
import type { Paciente } from "@/lib/cloud-esther/pacientes";
import { storePresupuestos } from "@/lib/cloud-esther/presupuestos-store";
import { cargarSettings } from "@/lib/cloud-esther/settings-store";
import { KpiPortal, PestanasPortal, TarjetaPortal } from "../PortalShell";

/* Ubicación: src/components/cloud-esther/portales/paciente/SeccionesPaciente.tsx
   Secciones nuevas del Portal del paciente (Plan 4): Estado de cuenta (pagos, cuotas,
   vencimientos y comprobantes), Soporte y ayuda, e Historial del paciente. Usan los mismos datos
   de la clínica (cuenta corriente, presupuestos, agenda, carpeta y Comunicación), por empresa. */

const ars = (n: number) => `$ ${Math.round(n).toLocaleString("es-AR")}`;
const fecha = (iso: string) =>
  iso
    ? new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";
const hoy = () => new Date().toISOString().slice(0, 10);
const escapar = (t: string) =>
  t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);

function sumarMeses(iso: string, n: number) {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  d.setMonth(d.getMonth() + n);
  return d.toISOString().slice(0, 10);
}

function imprimir(titulo: string, cuerpo: string, clinica: string) {
  const w = window.open("", "_blank", "width=720,height=900");
  if (!w) return;
  w.document.write(`<html><head><meta charset="utf-8"><title>${escapar(titulo)}</title>
<style>body{font-family:Inter,Arial,sans-serif;padding:32px;color:#1f1535}h1{font-size:20px}
table{width:100%;border-collapse:collapse;margin-top:12px}td,th{border-bottom:1px solid #e6e0f5;padding:8px;text-align:left}
.n{text-align:right}.marca{color:#6d28d9;font-weight:700}</style></head><body>
<p class="marca">${escapar(clinica)}</p><h1>${escapar(titulo)}</h1>${cuerpo}
<p style="margin-top:28px;color:#777;font-size:11px">Comprobante interno generado desde el Portal del paciente. No válido como factura.</p>
<script>window.onload=()=>window.print()</script></body></html>`);
  w.document.close();
}

/* ───────────── Estado de cuenta ───────────── */

type Cuota = {
  presupuesto: string;
  numero: number;
  total: number;
  vence: string;
  monto: number;
  pagada: boolean;
  /** Lo que falta pagar de esta cuota (pagos parciales). */
  resta: number;
};

export function EstadoCuenta({
  registros,
  nombre,
  clinica,
  onPagar,
}: {
  registros: Registros;
  nombre: string;
  clinica: string;
  onPagar?: () => void;
}) {
  const [vista, setVista] = useState<"resumen" | "cuotas" | "comprobantes">("resumen");
  const cargos = registros.cuenta
    .filter((m) => m.tipo === "Cargo")
    .reduce((a, m) => a + m.monto, 0);
  const pagos = registros.cuenta.filter((m) => m.tipo !== "Cargo");
  const pagado = pagos.reduce((a, m) => a + m.monto, 0);
  const saldo = cargos - pagado;
  const planes = storePresupuestos.leer().planes;

  // Cuotas de los presupuestos aprobados con plan de financiación. Lo pagado se aplica a las
  // cuotas en orden (aproximación hasta tener la imputación real del backend).
  let disponible = pagado;
  const cuotas: Cuota[] = registros.presupuestos
    .filter((p) => p.estado === "Aprobado")
    .flatMap((p) => {
      const t = totalesPresupuesto(p, planes);
      const inicio = p.respondido || p.fecha;
      return Array.from({ length: t.cuotas }, (_, i) => ({
        presupuesto: p.numero,
        numero: i + 1,
        total: t.cuotas,
        vence: sumarMeses(inicio, i),
        monto: t.cuota,
        pagada: false,
        resta: t.cuota,
      }));
    })
    .sort((a, b) => a.vence.localeCompare(b.vence))
    .map((c) => {
      const aplicado = Math.min(disponible, c.monto);
      disponible -= aplicado;
      return { ...c, pagada: aplicado >= c.monto, resta: c.monto - aplicado };
    });
  const vencidas = cuotas.filter((c) => !c.pagada && c.vence < hoy());
  const proxima = cuotas.find((c) => !c.pagada && c.vence >= hoy());

  const comprobante = (m: (typeof pagos)[number]) =>
    imprimir(
      "Comprobante de pago",
      `<p>Paciente: <b>${escapar(nombre)}</b> · ${fecha(m.fecha)}</p><table><tr><th>Concepto</th><th>Medio</th><th class="n">Importe</th></tr><tr><td>${escapar(m.concepto)}</td><td>${escapar(m.medio || "—")}</td><td class="n">${ars(m.monto)}</td></tr></table>`,
      clinica,
    );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiPortal
          titulo="Saldo"
          valor={saldo > 0 ? ars(saldo) : "Al día"}
          detalle={saldo > 0 ? "Pendiente de pago" : "Sin deudas"}
          icon={Wallet}
          tono={saldo > 0 ? "rosa" : "verde"}
          {...(onPagar && saldo > 0 ? { onClick: onPagar } : {})}
        />
        <KpiPortal
          titulo="Pagado"
          valor={ars(pagado)}
          detalle={`${pagos.length} pagos`}
          icon={ReceiptText}
          tono="verde"
        />
        <KpiPortal
          titulo="Próximo vencimiento"
          valor={proxima ? fecha(proxima.vence) : "—"}
          detalle={
            proxima
              ? `Cuota ${proxima.numero}/${proxima.total} · ${ars(proxima.monto)}`
              : "Sin cuotas pendientes"
          }
          icon={CalendarClock}
          tono="ambar"
        />
        <KpiPortal
          titulo="Cuotas vencidas"
          valor={String(vencidas.length)}
          detalle={vencidas.length ? ars(vencidas.reduce((a, c) => a + c.resta, 0)) : "Ninguna"}
          icon={CalendarCheck2}
          tono={vencidas.length ? "rosa" : "violeta"}
        />
      </div>

      <PestanasPortal
        valor={vista}
        onCambiar={setVista}
        opciones={[
          { id: "resumen", label: "Movimientos", cantidad: registros.cuenta.length },
          { id: "cuotas", label: "Cuotas y vencimientos", cantidad: cuotas.length },
          { id: "comprobantes", label: "Comprobantes", cantidad: pagos.length },
        ]}
      />

      {vista === "resumen" && (
        <TarjetaPortal titulo="Movimientos de tu cuenta" icon={Wallet}>
          {registros.cuenta.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Todavía no hay movimientos.
            </p>
          ) : (
            <ul className="divide-y divide-border/60">
              {[...registros.cuenta]
                .sort((a, b) => `${b.fecha}${b.id}`.localeCompare(`${a.fecha}${a.id}`))
                .map((m) => (
                  <li key={m.id} className="flex items-center gap-3 py-2.5">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{m.concepto}</span>
                      <span className="block text-xs text-muted-foreground">
                        {fecha(m.fecha)} ·{" "}
                        {m.tipo === "Cargo"
                          ? "Prestación"
                          : `${m.tipo}${m.medio ? ` · ${m.medio}` : ""}`}
                      </span>
                    </span>
                    <span
                      className={`text-sm font-bold tabular-nums ${m.tipo === "Cargo" ? "" : "text-emerald-600"}`}
                    >
                      {m.tipo === "Cargo" ? "" : "− "}
                      {ars(m.monto)}
                    </span>
                  </li>
                ))}
            </ul>
          )}
        </TarjetaPortal>
      )}

      {vista === "cuotas" && (
        <TarjetaPortal
          titulo="Cuotas y vencimientos"
          detalle="De tus presupuestos aprobados con financiación"
          icon={CalendarClock}
        >
          {cuotas.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No tenés planes en cuotas.
            </p>
          ) : (
            <ul className="divide-y divide-border/60">
              {cuotas.map((c) => {
                const vencida = !c.pagada && c.vence < hoy();
                return (
                  <li
                    key={`${c.presupuesto}-${c.numero}`}
                    className="flex items-center gap-3 py-2.5"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">
                        Cuota {c.numero} de {c.total}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        Presupuesto {c.presupuesto} · vence {fecha(c.vence)}
                        {!c.pagada && c.resta < c.monto ? ` · resta ${ars(c.resta)}` : ""}
                      </span>
                    </span>
                    <span className="text-sm font-bold tabular-nums">{ars(c.monto)}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
                        c.pagada
                          ? "bg-emerald-100 text-emerald-700"
                          : vencida
                            ? "bg-rose-100 text-rose-700"
                            : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {c.pagada ? "Pagada" : vencida ? "Vencida" : "Pendiente"}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </TarjetaPortal>
      )}

      {vista === "comprobantes" && (
        <TarjetaPortal
          titulo="Comprobantes"
          detalle="Descargalos o imprimilos cuando quieras"
          icon={ReceiptText}
        >
          {pagos.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Todavía no hay pagos.</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {pagos.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center gap-3 py-2.5">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{m.concepto}</span>
                    <span className="block text-xs text-muted-foreground">
                      {fecha(m.fecha)} · {m.medio || m.tipo}
                    </span>
                  </span>
                  <span className="text-sm font-bold tabular-nums text-emerald-600">
                    {ars(m.monto)}
                  </span>
                  <button
                    type="button"
                    onClick={() => comprobante(m)}
                    className="btn-ce-outline !min-h-10"
                  >
                    <Download className="size-4" /> Comprobante
                  </button>
                </li>
              ))}
            </ul>
          )}
        </TarjetaPortal>
      )}
    </div>
  );
}

/* ───────────── Soporte y ayuda ───────────── */

const PREGUNTAS = [
  [
    "¿Cómo cambio o cancelo un turno?",
    "En «Mis turnos» elegí el turno y tocá «Reprogramar» o «Cancelar». La clínica recibe el aviso al instante.",
  ],
  [
    "¿Dónde veo mis recetas y estudios?",
    "En «Recetas y estudios». Podés descargarlos o imprimirlos.",
  ],
  [
    "¿Qué es una autorización?",
    "Es tu permiso para un tratamiento, una receta o el uso de tus datos. Las revisás en «Autorizaciones» y podés revocarlas en «Privacidad y permisos».",
  ],
  [
    "¿Cómo pago mi saldo?",
    "En «Estado de cuenta» o «Pagos» ves tu saldo, tus cuotas y podés pagar online si la clínica lo tiene habilitado.",
  ],
  [
    "¿Mis datos son privados?",
    "Sí. Solo los ve el equipo de tu clínica, y cada acceso queda registrado.",
  ],
] as const;

const TEMAS = ["Turnos", "Pagos", "Tratamientos", "Recetas y estudios", "Mis datos", "Otro"];

export function SoporteAyuda({
  paciente,
  nombre,
  clinica,
  onToast,
  onMensajes,
}: {
  paciente: Paciente;
  nombre: string;
  clinica: string;
  onToast: (m: string) => void;
  onMensajes: () => void;
}) {
  const { conversaciones } = storeComunicacion.usar();
  const datos = cargarSettings("centro").datosClinica;
  const [abierta, setAbierta] = useState<number | null>(0);
  const [tema, setTema] = useState(TEMAS[0] ?? "Otro");
  const [texto, setTexto] = useState("");
  const conv = conversaciones.find((c) => c.paciente === nombre);
  const consultas = (conv?.mensajes ?? []).filter(
    (m) => m.de === "paciente" && m.texto.startsWith("[Consulta"),
  );
  const telefono = datos.telefono || "";

  const enviar = () => {
    const limpio = texto.trim();
    if (!limpio) return;
    const msg = {
      id: Date.now(),
      de: "paciente" as const,
      texto: `[Consulta · ${tema}] ${limpio}`,
      fecha: new Date().toISOString(),
    };
    if (conv)
      setComunicacion("conversaciones", (prev) =>
        prev.map((c) =>
          c.id === conv.id
            ? {
                ...c,
                estado: "Pendiente",
                noLeidos: c.noLeidos + 1,
                mensajes: [...c.mensajes, msg],
              }
            : c,
        ),
      );
    else
      setComunicacion("conversaciones", (prev) => [
        {
          id: Date.now() + 1,
          paciente: nombre,
          telefono: paciente.telefono,
          email: paciente.email,
          canal: "WhatsApp",
          estado: "Pendiente",
          asignado: "",
          etiquetas: ["Portal", "Soporte"],
          noLeidos: 1,
          fijada: false,
          mensajes: [msg],
        },
        ...prev,
      ]);
    setTexto("");
    onToast("Consulta enviada. La clínica te responde en Mensajes.");
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
      <div className="space-y-4">
        <TarjetaPortal titulo="Preguntas frecuentes" icon={LifeBuoy}>
          <ul className="divide-y divide-border/60">
            {PREGUNTAS.map(([p, r], i) => (
              <li key={p}>
                <button
                  type="button"
                  onClick={() => setAbierta(abierta === i ? null : i)}
                  aria-expanded={abierta === i}
                  className="flex w-full items-center gap-3 py-3 text-left text-sm font-semibold"
                >
                  <span className="flex-1">{p}</span>
                  <ChevronDown
                    className={`size-4 transition ${abierta === i ? "rotate-180" : ""}`}
                  />
                </button>
                {abierta === i && <p className="pb-3 text-sm text-muted-foreground">{r}</p>}
              </li>
            ))}
          </ul>
        </TarjetaPortal>
        <TarjetaPortal
          titulo="Mis consultas"
          detalle="Seguimiento de lo que le preguntaste a la clínica"
          icon={MessageCircle}
        >
          {consultas.length === 0 ? (
            <p className="py-5 text-center text-sm text-muted-foreground">
              Todavía no hiciste consultas.
            </p>
          ) : (
            <ul className="divide-y divide-border/60">
              {consultas
                .slice()
                .reverse()
                .map((m) => {
                  const respondida = (conv?.mensajes ?? []).some(
                    (x) => x.de === "clinica" && x.fecha > m.fecha,
                  );
                  return (
                    <li key={m.id} className="flex items-start gap-3 py-2.5">
                      <span className="min-w-0 flex-1 text-sm">{m.texto}</span>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
                          respondida
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {respondida ? "Respondida" : "En revisión"}
                      </span>
                    </li>
                  );
                })}
            </ul>
          )}
          <button type="button" onClick={onMensajes} className="btn-ce-outline mt-3 !min-h-10">
            <MessageCircle className="size-4" /> Ver la conversación
          </button>
        </TarjetaPortal>
      </div>
      <div className="space-y-4">
        <TarjetaPortal titulo={`Contacto con ${clinica}`} icon={Phone}>
          <div className="space-y-2 text-sm">
            {telefono ? (
              <a
                href={`tel:${telefono.replace(/[^0-9+]/g, "")}`}
                className="flex items-center gap-2 font-semibold text-primary"
              >
                <Phone className="size-4" /> {telefono}
              </a>
            ) : (
              <p className="text-muted-foreground">La clínica todavía no cargó su teléfono.</p>
            )}
            {datos.email && (
              <a
                href={`mailto:${datos.email}`}
                className="flex items-center gap-2 font-semibold text-primary"
              >
                <Mail className="size-4" /> {datos.email}
              </a>
            )}
            {datos.direccion && <p className="text-muted-foreground">{datos.direccion}</p>}
          </div>
        </TarjetaPortal>
        <TarjetaPortal titulo="Nueva consulta" detalle="Te responden en Mensajes" icon={Send}>
          <label className="block text-xs font-semibold">
            Tema
            <select
              value={tema}
              onChange={(e) => setTema(e.target.value)}
              className="mt-1 h-11 w-full rounded-xl border border-primary/15 bg-card px-3 text-base sm:h-10 sm:text-sm"
            >
              {TEMAS.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="mt-3 block text-xs font-semibold">
            Tu consulta
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={4}
              className="mt-1 w-full rounded-xl border border-primary/15 bg-card px-3 py-2 text-base outline-none focus:border-primary/45 sm:text-sm"
            />
          </label>
          <button
            type="button"
            onClick={enviar}
            disabled={!texto.trim()}
            className="btn-ce mt-3 !min-h-11 w-full justify-center"
          >
            <Send className="size-4" /> Enviar consulta
          </button>
        </TarjetaPortal>
      </div>
    </div>
  );
}

/* ───────────── Historial del paciente ───────────── */

type Evento = {
  fecha: string;
  tipo: string;
  titulo: string;
  detalle: string;
  icon: typeof History;
};

export function HistorialPaciente({
  registros,
  turnos,
}: {
  registros: Registros;
  turnos: Turno[];
}) {
  const [filtro, setFiltro] = useState("Todo");
  const eventos: Evento[] = [
    ...turnos
      .filter((t) => t.fecha <= hoy())
      .map((t) => ({
        fecha: t.fecha,
        tipo: "Turnos",
        titulo: `${t.tratamiento} · ${t.estado}`,
        detalle: `${t.hora} · ${t.odontologo} · ${t.sucursal}`,
        icon: CalendarCheck2,
      })),
    ...registros.tratamientos.map((t) => ({
      fecha: t.inicio,
      tipo: "Tratamientos",
      titulo: `${t.nombre}${t.pieza ? ` · pieza ${t.pieza}` : ""}`,
      detalle: `${t.estado} · ${t.profesional}`,
      icon: Stethoscope,
    })),
    ...registros.estudios.map((e) => ({
      fecha: e.fecha,
      tipo: "Estudios",
      titulo: e.tipo,
      detalle: `${e.zona || e.pieza || ""} · informe ${e.estadoInforme.toLowerCase()}`,
      icon: FlaskConical,
    })),
    ...registros.recetas.map((r) => ({
      fecha: r.fecha,
      tipo: "Recetas",
      titulo: `Receta ${r.numero}`,
      detalle: `${r.medicamentos.map((m) => m.nombre).join(", ") || r.diagnostico} · ${r.profesional}`,
      icon: Pill,
    })),
    ...registros.documentos.map((d) => ({
      fecha: d.fecha,
      tipo: "Documentos",
      titulo: d.titulo,
      detalle: `${d.categoria} · ${d.estado}`,
      icon: FileText,
    })),
  ].sort((a, b) => b.fecha.localeCompare(a.fecha));
  const tipos = ["Todo", ...new Set(eventos.map((e) => e.tipo))];
  const visibles = eventos.filter((e) => filtro === "Todo" || e.tipo === filtro);
  const cuenta = (t: string) => eventos.filter((e) => e.tipo === t).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiPortal
          titulo="Consultas"
          valor={String(cuenta("Turnos"))}
          detalle="turnos realizados"
          icon={CalendarCheck2}
        />
        <KpiPortal
          titulo="Tratamientos"
          valor={String(cuenta("Tratamientos"))}
          detalle="en tu historia"
          icon={Stethoscope}
          tono="verde"
        />
        <KpiPortal
          titulo="Estudios"
          valor={String(cuenta("Estudios"))}
          detalle="imágenes e informes"
          icon={FlaskConical}
          tono="azul"
        />
        <KpiPortal
          titulo="Documentos"
          valor={String(cuenta("Documentos") + cuenta("Recetas"))}
          detalle="recetas y archivos"
          icon={FileText}
          tono="ambar"
        />
      </div>
      <PestanasPortal
        valor={filtro}
        onCambiar={setFiltro}
        opciones={tipos.map((t) => ({
          id: t,
          label: t,
          ...(t !== "Todo" ? { cantidad: cuenta(t) } : {}),
        }))}
      />
      <TarjetaPortal
        titulo="Resumen de actividad"
        detalle="Todo lo que pasó en tu atención"
        icon={History}
      >
        {visibles.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Todavía no hay actividad.
          </p>
        ) : (
          <ol className="relative space-y-3 border-l-2 border-primary/15 pl-5">
            {visibles.map((e, i) => (
              <li key={i} className="relative">
                <span className="absolute -left-[31px] grid size-6 place-items-center rounded-full bg-gradient-to-br from-primary to-fuchsia-500 text-white shadow">
                  <e.icon className="size-3" />
                </span>
                <p className="text-sm font-semibold">{e.titulo}</p>
                <p className="text-xs text-muted-foreground">
                  {fecha(e.fecha)} · {e.tipo} · {e.detalle}
                </p>
              </li>
            ))}
          </ol>
        )}
      </TarjetaPortal>
    </div>
  );
}
