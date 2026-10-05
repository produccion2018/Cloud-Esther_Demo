import {
  AlertTriangle,
  CalendarDays,
  ChevronRight,
  Clock3,
  Droplets,
  FileText,
  Hash,
  HeartPulse,
  Mail,
  MapPin,
  MessageCircle,
  Pencil,
  Phone,
  Pill,
  ReceiptText,
  ShieldCheck,
  Stethoscope,
  User,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { Paciente } from "@/lib/cloud-esther/pacientes";
import type { Registros } from "@/components/cloud-esther/PacienteSecciones";

/* Ubicación: src/components/cloud-esther/pacientes/ResumenPaciente.tsx
   Carpeta del paciente: menú lateral agrupado con contadores y la vista «Resumen» con la
   ficha del paciente, sus indicadores clave, datos, contacto y alertas médicas. */

export type SeccionCarpeta =
  | "resumen"
  | "historia"
  | "tratamientos"
  | "odontograma"
  | "documentos"
  | "recetas"
  | "estudios"
  | "laboratorio"
  | "presupuestos"
  | "turnos"
  | "cuenta"
  | "profesionales";

export type ItemCarpeta = { id: SeccionCarpeta; label: string; icon: LucideIcon };

const GRUPOS: { titulo: string; ids: SeccionCarpeta[] }[] = [
  { titulo: "General", ids: ["resumen"] },
  {
    titulo: "Clínico",
    ids: ["historia", "tratamientos", "odontograma", "recetas", "estudios", "laboratorio"],
  },
  { titulo: "Administración", ids: ["presupuestos", "turnos", "cuenta"] },
  { titulo: "Archivo y equipo", ids: ["documentos", "profesionales"] },
];

function contador(id: SeccionCarpeta, d: Registros): number {
  switch (id) {
    case "historia":
      return d.notasClinicas.length + d.historia.length;
    case "tratamientos":
      return d.tratamientos.filter(
        (t) => t.estado === "En tratamiento" || t.estado === "Planificado",
      ).length;
    case "documentos":
      return d.documentos.length;
    case "recetas":
      return d.recetas.length;
    case "estudios":
      return d.estudios.length;
    case "laboratorio":
      return d.laboratorio.length;
    case "presupuestos":
      return d.presupuestos.filter((p) => p.estado === "Enviado" || p.estado === "Borrador").length;
    case "turnos":
      return d.turnos.length;
    case "profesionales":
      return d.profesionales.length;
    default:
      return 0;
  }
}

function saldoCuenta(d: Registros) {
  return d.cuenta.reduce((a, m) => a + (m.tipo === "Cargo" ? m.monto : -m.monto), 0);
}

export function NavCarpeta({
  items,
  activa,
  datos,
  onElegir,
}: {
  items: ItemCarpeta[];
  activa: SeccionCarpeta;
  datos: Registros;
  onElegir: (s: SeccionCarpeta) => void;
}) {
  const porId = Object.fromEntries(items.map((i) => [i.id, i])) as Record<
    SeccionCarpeta,
    ItemCarpeta
  >;
  const saldo = saldoCuenta(datos);
  return (
    <nav
      aria-label="Secciones de la carpeta"
      className="border-b border-primary/10 bg-gradient-to-b from-primary/[0.07] via-primary/[0.025] to-card p-3 md:border-b-0 md:border-r"
    >
      <div className="md:sticky md:top-4">
        <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-primary/70">
          Carpeta del paciente
        </p>
        <div className="flex gap-1 overflow-x-auto md:block md:space-y-3 md:overflow-visible">
          {GRUPOS.map((g) => (
            <div key={g.titulo} className="flex shrink-0 gap-1 md:block">
              <p className="hidden px-2 pb-1 pt-2 text-[9.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/80 md:block">
                {g.titulo}
              </p>
              <div className="flex gap-1 md:flex-col md:gap-0.5">
                {g.ids
                  .map((id) => porId[id])
                  .filter(Boolean)
                  .map((s) => {
                    const Icon = s.icon;
                    const on = s.id === activa;
                    const n = contador(s.id, datos);
                    const alerta = s.id === "cuenta" && saldo > 0;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => onElegir(s.id)}
                        aria-current={on ? "page" : undefined}
                        className={`group relative flex shrink-0 items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[13px] font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:pointer-events-none disabled:opacity-50 ${
                          on
                            ? "bg-gradient-to-r from-primary to-fuchsia-500 text-white shadow-[0_10px_22px_-12px_rgba(124,58,237,0.9)]"
                            : "text-foreground/70 hover:bg-card hover:text-foreground hover:shadow-[0_6px_16px_-12px_rgba(124,58,237,0.5)]"
                        }`}
                      >
                        <span
                          className={`grid size-7 shrink-0 place-items-center rounded-lg transition ${
                            on
                              ? "bg-white/20 text-white"
                              : "bg-primary/[0.08] text-primary group-hover:bg-primary/15"
                          }`}
                        >
                          <Icon className="size-3.5" />
                        </span>
                        <span className="min-w-0 flex-1 truncate">{s.label}</span>
                        {alerta ? (
                          <span
                            className={`size-2 rounded-full ${on ? "bg-white" : "bg-rose-500"}`}
                            title="Saldo pendiente"
                          />
                        ) : n > 0 ? (
                          <span
                            className={`min-w-5 rounded-full px-1.5 text-center text-[10px] font-bold tabular-nums ${
                              on ? "bg-white/25 text-white" : "bg-primary/10 text-primary"
                            }`}
                          >
                            {n}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </nav>
  );
}

/* ───────────── Resumen ───────────── */

type Turno = { fecha: string; hora: string; motivo: string; profesional?: string };

const fechaCorta = (iso: string) => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : "");
const moneda = (n: number) => `$ ${Math.round(n).toLocaleString("es-AR")}`;
function edad(nac: string) {
  if (!nac) return null;
  const d = new Date(`${nac}T12:00:00`);
  const h = new Date();
  let e = h.getFullYear() - d.getFullYear();
  if (h.getMonth() < d.getMonth() || (h.getMonth() === d.getMonth() && h.getDate() < d.getDate()))
    e--;
  return e;
}
function diasHasta(iso: string) {
  const a = new Date(`${iso}T12:00:00`).getTime();
  const b = new Date(`${new Date().toISOString().slice(0, 10)}T12:00:00`).getTime();
  return Math.round((a - b) / 86_400_000);
}

function Indicador({
  icon: Icon,
  etiqueta,
  valor,
  detalle,
  tono = "primary",
  onClick,
}: {
  icon: LucideIcon;
  etiqueta: string;
  valor: string;
  detalle: string;
  tono?: "primary" | "emerald" | "rose" | "amber";
  onClick?: () => void;
}) {
  const T = {
    primary: {
      valor: "text-primary",
      icono: "from-primary to-fuchsia-500",
      borde: "border-primary/20",
    },
    emerald: {
      valor: "text-emerald-600 dark:text-emerald-400",
      icono: "from-emerald-500 to-teal-500",
      borde: "border-emerald-200/80 dark:border-emerald-500/30",
    },
    rose: {
      valor: "text-rose-600 dark:text-rose-400",
      icono: "from-rose-500 to-pink-500",
      borde: "border-rose-200/80 dark:border-rose-500/30",
    },
    amber: {
      valor: "text-amber-600 dark:text-amber-400",
      icono: "from-amber-500 to-orange-500",
      borde: "border-amber-200/80 dark:border-amber-500/30",
    },
  }[tono];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative min-h-[118px] overflow-hidden rounded-[22px] border bg-gradient-to-br from-card via-card to-primary/[0.07] p-4 text-left shadow-[0_14px_30px_-22px_rgba(124,58,237,0.55)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_36px_-22px_rgba(124,58,237,0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${T.borde}`}
    >
      <span className="pointer-events-none absolute -right-8 -top-10 size-28 rounded-full bg-primary/[0.04] ring-[14px] ring-primary/[0.035]" />
      <div className="relative flex items-start justify-between gap-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
          {etiqueta}
        </p>
        <span
          className={`grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white shadow-[0_8px_16px_-8px_rgba(124,58,237,0.7)] ${T.icono}`}
        >
          <Icon className="size-4" />
        </span>
      </div>
      <p
        className={`relative mt-1 line-clamp-2 text-[19px] font-bold leading-tight tracking-tight ${T.valor}`}
        title={valor}
      >
        {valor}
      </p>
      <p className="relative mt-1 flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
        <span className="truncate">{detalle}</span>
        {onClick && (
          <ChevronRight className="size-3 opacity-0 transition group-hover:opacity-100" />
        )}
      </p>
    </button>
  );
}

function Fila({
  icon: Icon,
  etiqueta,
  valor,
}: {
  icon: LucideIcon;
  etiqueta: string;
  valor: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-primary/[0.03]">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/[0.08] text-primary">
        <Icon className="size-3.5" />
      </span>
      <div className="min-w-0">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {etiqueta}
        </p>
        <p className="truncate text-sm font-semibold text-foreground/90" title={valor}>
          {valor || "—"}
        </p>
      </div>
    </div>
  );
}

const PANEL =
  "rounded-[22px] border border-primary/12 bg-gradient-to-br from-card via-card to-primary/[0.04] p-4 shadow-[0_14px_30px_-24px_rgba(124,58,237,0.5)]";

export function ResumenPaciente({
  paciente,
  datos,
  proximoTurno,
  obraSocial,
  documento,
  onEditar,
  onIr,
}: {
  paciente: Paciente;
  datos: Registros;
  proximoTurno: Turno | null;
  obraSocial: string;
  documento: string;
  onEditar: () => void;
  onIr: (s: SeccionCarpeta) => void;
}) {
  const nombre = `${paciente.nombre} ${paciente.apellido}`.trim();
  const iniciales = `${paciente.nombre.charAt(0)}${paciente.apellido.charAt(0)}`.toUpperCase();
  const anios = edad(paciente.fechaNacimiento);
  const enCurso = datos.tratamientos.filter((t) => t.estado === "En tratamiento");
  const planificados = datos.tratamientos.filter((t) => t.estado === "Planificado");
  const actual = enCurso[0] ?? planificados[0] ?? null;
  const saldo = saldoCuenta(datos);
  const presPend = datos.presupuestos.filter((p) => p.estado === "Enviado");
  const ultimaVisita = [
    ...datos.notasClinicas.map((n) => n.fecha),
    ...datos.historia.map((h) => h.fecha),
  ]
    .sort()
    .reverse()[0];
  const ant = datos.antecedentes;
  const alertas = [
    ...ant.alergias.map((a) => ({ t: `Alergia: ${a}`, fuerte: true })),
    ...ant.enfermedades.map((e) => ({ t: e, fuerte: false })),
  ];
  const tel = paciente.telefono.replace(/\D/g, "");
  const dias = proximoTurno ? diasHasta(proximoTurno.fecha) : null;

  return (
    <div className="space-y-4">
      {/* Ficha */}
      <section className="relative overflow-hidden rounded-[26px] border border-primary/15 bg-gradient-to-br from-primary/[0.09] via-card to-fuchsia-500/[0.06] p-5 shadow-[0_18px_40px_-30px_rgba(124,58,237,0.7)]">
        <span className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-primary/[0.08] blur-2xl" />
        <span className="pointer-events-none absolute -bottom-24 left-1/3 size-56 rounded-full bg-fuchsia-400/[0.08] blur-2xl" />
        <div className="relative flex flex-wrap items-center gap-4">
          <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-[20px] bg-gradient-to-br from-primary to-fuchsia-500 text-xl font-bold text-white shadow-[0_14px_28px_-12px_rgba(124,58,237,0.8)] ring-4 ring-card">
            {paciente.foto ? (
              <img src={paciente.foto} alt={nombre} className="size-full object-cover" />
            ) : (
              iniciales
            )}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="truncate text-[22px] font-bold tracking-[-0.02em] text-foreground">
                {nombre}
              </h4>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${paciente.estado === "Activo" ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/15 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-400/30" : "bg-muted text-muted-foreground"}`}
              >
                <span
                  className={`size-1.5 rounded-full ${paciente.estado === "Activo" ? "bg-emerald-500" : "bg-muted-foreground/50"}`}
                />
                {paciente.estado}
              </span>
              {ant.alergias[0] && (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-semibold text-rose-600 ring-1 ring-inset ring-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-400/30">
                  <AlertTriangle className="size-3" /> Alergia: {ant.alergias.join(", ")}
                </span>
              )}
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted-foreground">
              <span>DNI {documento}</span>
              {anios !== null && <span>· {anios} años</span>}
              <span className="inline-flex items-center gap-1">
                · <ShieldCheck className="size-3.5 text-primary" /> {obraSocial}
              </span>
              {paciente.sucursal && (
                <span className="inline-flex items-center gap-1">
                  · <MapPin className="size-3.5 text-primary" /> {paciente.sucursal}
                </span>
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {tel && (
              <a
                href={`https://wa.me/${tel}`}
                target="_blank"
                rel="noreferrer"
                className="btn-ce-outline"
                aria-label={`Escribir por WhatsApp a ${nombre}`}
              >
                <MessageCircle className="size-4" /> WhatsApp
              </a>
            )}
            <button type="button" onClick={onEditar} className="btn-ce">
              <Pencil className="size-4" /> Editar paciente
            </button>
          </div>
        </div>
      </section>

      {/* Indicadores */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-4">
        <Indicador
          icon={CalendarDays}
          etiqueta="Próximo turno"
          valor={
            proximoTurno
              ? `${fechaCorta(proximoTurno.fecha).slice(0, 5)} · ${proximoTurno.hora} hs`
              : "Sin turno"
          }
          detalle={
            proximoTurno
              ? `${dias === 0 ? "Hoy" : dias === 1 ? "Mañana" : `En ${dias} días`} · ${proximoTurno.motivo}`
              : "Agendá el próximo control"
          }
          onClick={() => onIr("turnos")}
        />
        <Indicador
          icon={Stethoscope}
          etiqueta="Tratamiento actual"
          valor={actual ? actual.nombre : "Ninguno"}
          detalle={
            actual
              ? `${actual.pieza ? `Pieza ${actual.pieza} · ` : ""}${actual.estado}${enCurso.length + planificados.length > 1 ? ` · +${enCurso.length + planificados.length - 1}` : ""}`
              : "Sin tratamientos en curso"
          }
          tono="emerald"
          onClick={() => onIr("tratamientos")}
        />
        <Indicador
          icon={Wallet}
          etiqueta="Cuenta corriente"
          valor={saldo > 0 ? moneda(saldo) : "Al día"}
          detalle={
            saldo > 0
              ? "Saldo pendiente de pago"
              : saldo < 0
                ? `A favor ${moneda(-saldo)}`
                : "Sin deuda"
          }
          tono={saldo > 0 ? "rose" : "emerald"}
          onClick={() => onIr("cuenta")}
        />
        <Indicador
          icon={ReceiptText}
          etiqueta="Presupuestos"
          valor={
            presPend.length
              ? `${presPend.length} pendiente${presPend.length === 1 ? "" : "s"}`
              : `${datos.presupuestos.length} en total`
          }
          detalle={presPend.length ? "Sin respuesta del paciente" : "Todo respondido"}
          tono={presPend.length ? "amber" : "primary"}
          onClick={() => onIr("presupuestos")}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        {/* Datos personales */}
        <section className={PANEL}>
          <div className="mb-2 flex items-center justify-between">
            <h5 className="text-sm font-bold tracking-tight">Datos del paciente</h5>
            {ultimaVisita && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/[0.07] px-2.5 py-1 text-[11px] font-semibold text-primary">
                <Clock3 className="size-3" /> Última visita {fechaCorta(ultimaVisita)}
              </span>
            )}
          </div>
          <div className="grid gap-1 sm:grid-cols-2">
            <Fila icon={FileText} etiqueta="Documento" valor={documento} />
            <Fila
              icon={CalendarDays}
              etiqueta="Nacimiento"
              valor={
                paciente.fechaNacimiento
                  ? `${fechaCorta(paciente.fechaNacimiento)}${anios !== null ? ` · ${anios} años` : ""}`
                  : ""
              }
            />
            <Fila icon={User} etiqueta="Sexo / género" valor={paciente.genero} />
            <Fila icon={HeartPulse} etiqueta="Sucursal" valor={paciente.sucursal} />
            <Fila icon={ShieldCheck} etiqueta="Obra social" valor={obraSocial} />
            <Fila icon={Hash} etiqueta="N.º de afiliado" valor={paciente.afiliado} />
          </div>
        </section>

        <div className="space-y-4">
          {/* Contacto */}
          <section className={PANEL}>
            <h5 className="mb-2 text-sm font-bold tracking-tight">Contacto</h5>
            <div className="space-y-1">
              <Fila icon={Phone} etiqueta="Teléfono" valor={paciente.telefono} />
              <Fila icon={Mail} etiqueta="Correo" valor={paciente.email} />
              <Fila icon={MapPin} etiqueta="Dirección" valor={paciente.direccion} />
            </div>
            {paciente.nota && (
              <p className="mt-2 rounded-xl bg-primary/[0.05] px-3 py-2 text-xs text-foreground/80">
                <b className="text-primary">Nota:</b> {paciente.nota}
              </p>
            )}
          </section>

          {/* Alertas médicas */}
          <section className={PANEL}>
            <div className="mb-2 flex items-center justify-between">
              <h5 className="text-sm font-bold tracking-tight">Alertas médicas</h5>
              <button
                type="button"
                onClick={() => onIr("historia")}
                className="text-[11px] font-semibold text-primary hover:underline"
              >
                Ver historia
              </button>
            </div>
            {alertas.length || ant.medicacion || ant.grupoSanguineo ? (
              <div className="space-y-2">
                {alertas.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {alertas.map((a) => (
                      <span
                        key={a.t}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${a.fuerte ? "bg-rose-50 text-rose-600 ring-1 ring-inset ring-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-400/30" : "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-400/30"}`}
                      >
                        <AlertTriangle className="size-3" />
                        {a.t}
                      </span>
                    ))}
                  </div>
                )}
                {ant.medicacion && (
                  <p className="flex items-start gap-2 text-xs text-foreground/80">
                    <Pill className="mt-0.5 size-3.5 shrink-0 text-primary" /> {ant.medicacion}
                  </p>
                )}
                {ant.grupoSanguineo && (
                  <p className="flex items-center gap-2 text-xs text-foreground/80">
                    <Droplets className="size-3.5 text-primary" /> Grupo sanguíneo{" "}
                    {ant.grupoSanguineo}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Sin alertas registradas.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}