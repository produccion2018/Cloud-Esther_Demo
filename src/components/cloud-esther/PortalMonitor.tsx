import { useEffect, useRef, useState } from "react";
import { useSesion } from "@/lib/cloud-esther/auth-store";
import { useClinicaReal } from "@/lib/clinica/modo-clinica";
import { IconoWhatsApp } from "@/components/cloud-esther/IconoWhatsApp";
import { telefonoInternacional } from "@/lib/clinica/whatsapp";
import { ControlPortalPaciente } from "@/components/cloud-esther/portales/ControlPortalPaciente";
import type { ReactNode } from "react";
import {
  Activity,
  CalendarCheck2,
  Check,
  Copy,
  CreditCard,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  FileCheck2,
  KeyRound,
  LogIn,
  MessageCircle,
  MonitorSmartphone,
  RefreshCcw,
  Search,
  Send,
  Settings2,
  ShieldOff,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AppShell } from "@/components/cloud-esther/AppShell";
import { CloudEstherProvider } from "@/lib/cloud-esther/data";
import { usePacientes } from "@/lib/cloud-esther/pacientes";
import {
  docsDe,
  nuevoCodigo,
  puedePublicarPortal,
  setPortal,
  storePortal,
  type ConfigPortal,
  type DatosPagoClinica,
  type EstadoAcceso,
  type TipoEventoPortal,
} from "@/lib/cloud-esther/portal-store";
import { normalizarBusqueda } from "@/lib/utils";
import { useRegistrosPacientes } from "@/components/cloud-esther/PacienteSecciones";
import { usePaisClinica } from "@/lib/cloud-esther/coberturas";
import { useTablasApilables } from "@/lib/tablas-movil";
import { Seleccion } from "@/components/ui/seleccion";

/* Ubicación: src/components/cloud-esther/PortalMonitor.tsx

   Lo que ve el dueño/equipo del Portal del paciente: quién tiene acceso, quién entró,
   qué hicieron los pacientes (turnos, pagos, presupuestos, mensajes), documentación
   para revisar y qué funciones del portal están habilitadas. Separado por empresa. */

type Vista = "accesos" | "actividad" | "documentacion" | "configuracion";

const ICONO_EVENTO: Record<TipoEventoPortal, LucideIcon> = {
  Ingreso: LogIn,
  "Turno pedido": CalendarCheck2,
  "Turno confirmado": CalendarCheck2,
  "Turno cambiado": RefreshCcw,
  "Turno cancelado": X,
  "Presupuesto aprobado": Check,
  "Presupuesto rechazado": X,
  "Pago online": CreditCard,
  "Documento subido": FileCheck2,
  Mensaje: MessageCircle,
  "Datos actualizados": UserCheck,
  "Contraseña cambiada": KeyRound,
};

const TONO_EVENTO: Partial<Record<TipoEventoPortal, string>> = {
  "Turno cancelado": "bg-destructive/10 text-destructive",
  "Presupuesto rechazado": "bg-destructive/10 text-destructive",
  "Pago online": "bg-emerald-100 text-emerald-600",
  "Presupuesto aprobado": "bg-emerald-100 text-emerald-600",
  "Documento subido": "bg-sky-100 text-sky-600",
};

const ESTADO_ACCESO: Record<EstadoAcceso | "Sin acceso", string> = {
  Activo: "bg-emerald-100 text-emerald-700",
  Invitado: "bg-amber-100 text-amber-700",
  Revocado: "bg-destructive/10 text-destructive",
  "Sin acceso": "bg-muted text-muted-foreground",
};

function hace(iso?: string) {
  if (!iso) return "Nunca";
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (min < 1) return "recién";
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "ayer" : `hace ${d} días`;
}

const BTN_PRIMARIO = "btn-ce";
const BTN_SECUNDARIO = "btn-ce-outline";
const BTN_ICONO =
  "grid size-8 shrink-0 place-items-center rounded-full border border-primary/12 bg-white text-muted-foreground transition-all hover:border-primary/30 hover:bg-primary/10 hover:text-primary";

function Pill({ children, clase }: { children: ReactNode; clase: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${clase}`}
    >
      {children}
    </span>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  detail,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  trend: string;
  detail: string;
}) {
  return (
    <div className="group relative min-h-[112px] overflow-hidden rounded-[22px] border border-primary/25 bg-gradient-to-br from-white via-white to-primary/[0.065] p-4 shadow-[0_12px_28px_-20px_rgba(124,58,237,0.48)] transition-all hover:-translate-y-0.5 hover:border-primary/45">
      <div className="pointer-events-none absolute -right-7 -top-9 size-[100px] rounded-full bg-primary/[0.035] ring-[13px] ring-primary/[0.035]" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase leading-[1.25] tracking-[0.09em] text-primary/75">
            {label}
          </p>
          <p className="mt-2 text-[27px] font-bold leading-none tracking-tight text-primary">
            {value}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-2 text-[11px] leading-4">
            <span className="font-semibold text-primary">{trend}</span>
            <span className="text-muted-foreground">{detail}</span>
          </div>
        </div>
        <div className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/[0.08] text-primary">
          <Icon className="size-4" strokeWidth={1.7} />
        </div>
      </div>
    </div>
  );
}

export function PortalMonitorPage() {
  return (
    <CloudEstherProvider>
      <AppShell>
        <PortalMonitor />
      </AppShell>
    </CloudEstherProvider>
  );
}

function PortalMonitor() {
  const { pacientes } = usePacientes();
  const { accesos, eventos, docs } = storePortal.usar();
  const [montado, setMontado] = useState(false);
  const [vista, setVista] = useState<Vista>("accesos");
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<number | null>(null);
  useEffect(() => setMontado(true), []);

  const onToast = (m: string) => {
    setToast(m);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), 2800);
  };

  const activosPac = pacientes.filter((p) => p.estado === "Activo");
  const conAcceso = activosPac.filter((p) => accesos[p.id]?.estado === "Activo").length;
  const invitados = activosPac.filter((p) => accesos[p.id]?.estado === "Invitado").length;
  const semana = Date.now() - 7 * 86_400_000;
  const mes = Date.now() - 30 * 86_400_000;
  const ingresos7 = eventos.filter(
    (e) => e.tipo === "Ingreso" && new Date(e.fecha).getTime() >= semana,
  );
  const acciones30 = eventos.filter(
    (e) => e.tipo !== "Ingreso" && new Date(e.fecha).getTime() >= mes,
  );
  const porRevisar = Object.entries(docs).reduce(
    (acc, [, lista]) => acc + lista.filter((d) => d.estado === "En revisión").length,
    0,
  );

  const VISTAS: { id: Vista; label: string; icon: LucideIcon; contador?: number }[] = [
    { id: "accesos", label: "Accesos", icon: KeyRound },
    { id: "actividad", label: "Actividad", icon: Activity },
    { id: "documentacion", label: "Documentación", icon: FileCheck2, contador: porRevisar },
    { id: "configuracion", label: "Configuración", icon: Settings2 },
  ];

  return (
    <div className="relative min-h-full overflow-hidden bg-[#faf9ff]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_5%,rgba(124,58,237,0.15),transparent_28%),radial-gradient(circle_at_92%_12%,rgba(52,211,153,0.10),transparent_27%),linear-gradient(135deg,#f8f6ff_0%,#f3effd_48%,#faf8ff_100%)]"
      />
      <div className="relative mx-auto w-full max-w-[1420px] px-4 py-6 md:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-[30px] border border-primary/15 bg-gradient-to-br from-white via-white/96 to-primary/[0.045] shadow-[0_20px_55px_-38px_rgba(76,29,149,0.55)]">
          <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-primary/55 via-primary to-emerald-400/55" />
          <div className="relative p-5 md:p-7">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/10 bg-primary/[0.07] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
                    <MonitorSmartphone className="size-3.5" />
                    Monitoreo
                  </span>
                  {montado && ingresos7.length > 0 && (
                    <span className="rounded-full border border-emerald-200/70 bg-emerald-50/80 px-3 py-1.5 text-[11px] font-bold text-emerald-700">
                      {ingresos7.length} ingresos esta semana
                    </span>
                  )}
                </div>
                <h1 className="mt-4 text-[34px] font-bold tracking-[-0.035em] md:text-[42px]">
                  Portal del paciente
                </h1>
                <p className="mt-2 max-w-2xl text-[13px] leading-6 text-muted-foreground md:text-sm">
                  Tus pacientes entran con su DNI y un código para ver turnos, tratamientos, recetas
                  y pagos. Desde acá das y quitás accesos, ves todo lo que hacen y revisás la
                  documentación que suben.
                </p>
              </div>
              <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0">
                <button
                  className={BTN_SECUNDARIO}
                  onClick={() => {
                    const url = `${window.location.origin}/portal`;
                    navigator.clipboard?.writeText(url).catch(() => {});
                    onToast(`Enlace copiado: ${url}`);
                  }}
                >
                  <Copy className="size-4" />
                  Copiar enlace
                </button>
                <a href="/portal" target="_blank" rel="noreferrer" className={BTN_PRIMARIO}>
                  <ExternalLink className="size-4" />
                  Abrir portal
                </a>
              </div>
            </div>

            {montado && (
              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  label="Pacientes con acceso"
                  value={String(conAcceso)}
                  icon={Users}
                  trend={`${activosPac.length ? Math.round((conAcceso / activosPac.length) * 100) : 0}% de tus pacientes`}
                  detail={invitados ? `${invitados} invitados sin entrar` : ""}
                />
                <StatCard
                  label="Ingresos (7 días)"
                  value={String(ingresos7.length)}
                  icon={LogIn}
                  trend={`${new Set(ingresos7.map((e) => e.pacienteId)).size} pacientes`}
                  detail="distintos"
                />
                <StatCard
                  label="Acciones (30 días)"
                  value={String(acciones30.length)}
                  icon={Activity}
                  trend={`${acciones30.filter((e) => e.tipo === "Turno pedido" || e.tipo === "Turno confirmado").length} turnos · ${acciones30.filter((e) => e.tipo === "Pago online").length} pagos`}
                  detail="hechos por pacientes"
                />
                <StatCard
                  label="Documentos por revisar"
                  value={String(porRevisar)}
                  icon={FileCheck2}
                  trend={porRevisar ? "Esperan tu revisión" : "Nada pendiente"}
                  detail=""
                />
              </div>
            )}

            <nav
              className="mt-4 flex flex-wrap gap-1.5 rounded-2xl border border-primary/10 bg-primary/[0.025] p-1.5"
              aria-label="Vistas del portal"
            >
              {VISTAS.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setVista(v.id)}
                  aria-pressed={vista === v.id}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                    vista === v.id
                      ? "bg-primary text-primary-foreground shadow-[0_8px_18px_-10px_rgba(124,58,237,0.8)]"
                      : "text-muted-foreground hover:bg-card hover:text-foreground"
                  }`}
                >
                  <v.icon className="size-3.5" />
                  {v.label}
                  {montado && !!v.contador && (
                    <span
                      className={`grid min-w-4 place-items-center rounded-full px-1 text-[10px] ${vista === v.id ? "bg-white/25" : "bg-primary text-primary-foreground"}`}
                    >
                      {v.contador}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </section>

        <div className="mt-5">
          {!montado ? (
            <div className="card-grad h-[420px] animate-pulse" />
          ) : vista === "accesos" ? (
            <Accesos onToast={onToast} />
          ) : vista === "actividad" ? (
            <ActividadPortal onToast={onToast} />
          ) : vista === "documentacion" ? (
            <RevisionDocs onToast={onToast} />
          ) : (
            <ConfiguracionPortal onToast={onToast} />
          )}
        </div>
      </div>
      {toast && (
        <div
          className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-foreground px-4 py-2 text-xs font-medium text-background shadow-xl"
          role="status"
        >
          {toast}
        </div>
      )}
    </div>
  );
}

/* ───────────── Accesos ───────────── */

export function Accesos({ onToast }: { onToast: (m: string) => void }) {
  const { pacientes } = usePacientes();
  const { accesos } = storePortal.usar();
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<"" | EstadoAcceso | "Sin acceso">("");
  const [verCodigo, setVerCodigo] = useState<number | null>(null);
  const texto = normalizarBusqueda(busqueda);
  // En el celular la tabla de accesos se ve como tarjetas.
  const tablaRef = useRef<HTMLDivElement>(null);
  useTablasApilables(tablaRef);

  const lista = pacientes
    .filter((p) => p.estado === "Activo")
    .map((p) => ({
      p,
      a: accesos[p.id],
      estado: (accesos[p.id]?.estado ?? "Sin acceso") as EstadoAcceso | "Sin acceso",
    }))
    .filter(
      ({ p, estado }) =>
        (!filtro || estado === filtro) &&
        (!texto ||
          normalizarBusqueda(`${p.nombre} ${p.apellido} ${p.documento} ${p.email}`).includes(
            texto,
          )),
    )
    .sort((x, y) => (y.a?.ultimoIngreso ?? "").localeCompare(x.a?.ultimoIngreso ?? ""));

  const sinAcceso = pacientes.filter((p) => p.estado === "Activo" && !accesos[p.id]);
  // Link del portal para el celular del paciente (entra con su DNI, correo o teléfono + su código)
  const real = useClinicaReal();
  const { clinica } = useSesion();
  const linkPortal = `${typeof window !== "undefined" ? window.location.origin : ""}${real ? `/mi-portal/${real.slug}` : "/portal"}`;
  const waPortal = (p: { nombre: string; telefono: string }, codigo: string) =>
    `https://wa.me/${telefonoInternacional(p.telefono)}?text=${encodeURIComponent(
      `Hola ${p.nombre}, este es tu portal de ${clinica?.nombre ?? "la clínica"} para ver y manejar tus turnos: ${linkPortal}\nEntrás con tu DNI y este código: ${codigo}`,
    )}`;

  const invitar = (ids: number[]) => {
    setPortal("accesos", (prev) => {
      const sig = { ...prev };
      for (const id of ids)
        sig[id] = {
          estado: "Invitado",
          codigo: nuevoCodigo(),
          invitado: new Date().toISOString(),
          ingresos: prev[id]?.ingresos ?? 0,
        };
      return sig;
    });
  };

  const cambiar = (id: number, estado: EstadoAcceso) =>
    setPortal("accesos", (prev) => {
      const a = prev[id];
      return a ? { ...prev, [id]: { ...a, estado } } : prev;
    });

  return (
    <div className="space-y-3">
      <PagosParaConfirmar onToast={onToast} />
      <div className="card-grad flex flex-wrap items-center gap-2 p-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold">Link del portal para tus pacientes</p>
          <p className="truncate font-mono text-[11px] text-muted-foreground">{linkPortal}</p>
          <p className="text-[11px] text-muted-foreground">Entran desde el celular con su DNI, correo o teléfono y su código. Sin contraseñas.</p>
        </div>
        <button
          type="button"
          className={BTN_SECUNDARIO}
          onClick={() => {
            navigator.clipboard?.writeText(linkPortal).catch(() => {});
            onToast("Link del portal copiado");
          }}
        >
          Copiar link
        </button>
      </div>
      <div className="card-grad flex flex-wrap items-center gap-2 p-2.5">
        <div className="relative min-w-52 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-primary/60" />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar paciente, DNI o correo"
            className="h-8 w-full rounded-xl border border-primary/12 bg-white pl-8 pr-3 text-sm outline-none focus:border-primary/45"
          />
        </div>
        <div className="flex flex-wrap gap-1 rounded-full bg-primary/[0.06] p-0.5">
          {(["", "Activo", "Invitado", "Sin acceso", "Revocado"] as const).map((f) => (
            <button
              key={f || "todos"}
              onClick={() => setFiltro(f)}
              aria-pressed={filtro === f}
              className={`rounded-full px-3 py-1.5 text-[11px] font-semibold ${filtro === f ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >
              {f || "Todos"}
            </button>
          ))}
        </div>
        {sinAcceso.length > 0 && (
          <button
            className={BTN_PRIMARIO}
            onClick={() => {
              invitar(sinAcceso.map((p) => p.id));
              onToast(`${sinAcceso.length === 1 ? "1 paciente" : `${sinAcceso.length} pacientes`} con acceso: mandá cada código con el botón de WhatsApp`);
            }}
          >
            <Send className="size-3.5" />
            Invitar a todos ({sinAcceso.length})
          </button>
        )}
      </div>

      <div className="card-grad overflow-hidden">
        <div ref={tablaRef} className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead className="bg-primary/[0.04] text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Paciente</th>
                <th className="px-3 py-2.5 font-semibold">Acceso</th>
                <th className="px-3 py-2.5 font-semibold">Último ingreso</th>
                <th className="px-3 py-2.5 font-semibold">Ingresos</th>
                <th className="px-3 py-2.5 font-semibold">Código</th>
                <th className="px-3 py-2.5 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/[0.07]">
              {lista.map(({ p, a, estado }) => (
                <tr key={p.id} className="hover:bg-primary/[0.025]">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-xs font-bold text-primary">
                        {`${p.nombre[0] ?? ""}${p.apellido[0] ?? ""}`}
                      </span>
                      <div>
                        <p className="font-semibold">
                          {p.nombre} {p.apellido}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          DNI {p.documento.replace(/\B(?=(\d{3})+(?!\d))/g, ".")} · {p.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <Pill clase={ESTADO_ACCESO[estado]}>{estado}</Pill>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">
                    {hace(a?.ultimoIngreso)}
                  </td>
                  <td className="px-3 py-2.5 text-xs font-semibold">{a?.ingresos ?? 0}</td>
                  <td className="px-3 py-2.5">
                    {a && a.estado !== "Revocado" ? (
                      <span className="inline-flex items-center gap-1 font-mono text-xs">
                        {verCodigo === p.id ? a.codigo : "••••••"}
                        <button
                          className="text-muted-foreground hover:text-primary"
                          aria-label="Mostrar código"
                          onClick={() => setVerCodigo(verCodigo === p.id ? null : p.id)}
                        >
                          {verCodigo === p.id ? (
                            <EyeOff className="size-3.5" />
                          ) : (
                            <Eye className="size-3.5" />
                          )}
                        </button>
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      {estado === "Sin acceso" && (
                        <button
                          className={BTN_PRIMARIO}
                          onClick={() => {
                            invitar([p.id]);
                            onToast(`${p.nombre} ya tiene acceso: mandale su código por WhatsApp`);
                          }}
                        >
                          <Send className="size-3.5" />
                          Invitar
                        </button>
                      )}
                      {(estado === "Invitado" || estado === "Activo") && a && p.telefono && (
                        <a href={waPortal(p, a.codigo)} target="_blank" rel="noreferrer" className="btn-wa !h-8 !px-3 !text-xs" title="Mandarle el link del portal y su código">
                          <IconoWhatsApp className="size-3.5" /> Mandar código
                        </a>
                      )}
                      {(estado === "Invitado" || estado === "Activo") && (
                        <button
                          className={BTN_SECUNDARIO}
                          onClick={() => {
                            setPortal("accesos", (prev) => {
                              const actual = prev[p.id];
                              return actual
                                ? { ...prev, [p.id]: { ...actual, codigo: nuevoCodigo(), clave: undefined } }
                                : prev;
                            });
                            onToast(
                              a?.clave
                                ? `Nuevo código listo. Su contraseña se blanqueó: mandale el código por WhatsApp.`
                                : `Nuevo código listo: mandáselo por WhatsApp`,
                            );
                          }}
                        >
                          <RefreshCcw className="size-3.5" />
                          Nuevo código
                        </button>
                      )}
                      {estado === "Revocado" ? (
                        <button
                          className={BTN_SECUNDARIO}
                          onClick={() => {
                            cambiar(p.id, "Activo");
                            onToast(`${p.nombre} vuelve a tener acceso`);
                          }}
                        >
                          <UserCheck className="size-3.5" />
                          Reactivar
                        </button>
                      ) : (
                        a && (
                          <button
                            className={`${BTN_ICONO} hover:!border-destructive/30 hover:!bg-destructive/10 hover:!text-destructive`}
                            title="Quitar acceso"
                            aria-label="Quitar acceso"
                            onClick={() => {
                              cambiar(p.id, "Revocado");
                              onToast(`Acceso de ${p.nombre} revocado: ya no puede entrar`);
                            }}
                          >
                            <ShieldOff className="size-3.5" />
                          </button>
                        )
                      )}
                      <a
                        href={`/portal?vista=${p.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className={BTN_ICONO}
                        title="Ver como paciente"
                        aria-label="Ver como paciente"
                      >
                        <Eye className="size-3.5" />
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {lista.length === 0 && (
          <p className="p-6 text-center text-sm text-muted-foreground">
            No hay pacientes con ese filtro.
          </p>
        )}
      </div>
    </div>
  );
}

/* ───────────── Actividad ───────────── */

export function ActividadPortal({ onToast }: { onToast: (m: string) => void }) {
  const { pacientes } = usePacientes();
  const { eventos } = storePortal.usar();
  const [tipo, setTipo] = useState<"" | TipoEventoPortal>("");
  const [pacienteId, setPacienteId] = useState("");
  const [limite, setLimite] = useState(25);
  const nombre = (id: number) => {
    const p = pacientes.find((x) => x.id === id);
    return p ? `${p.nombre} ${p.apellido}` : "Paciente";
  };
  const lista = eventos.filter(
    (e) => (!tipo || e.tipo === tipo) && (!pacienteId || e.pacienteId === Number(pacienteId)),
  );
  const tipos = [...new Set(eventos.map((e) => e.tipo))];

  const exportar = () => {
    const filas = [
      ["Fecha", "Hora", "Paciente", "Acción", "Detalle"],
      ...lista.map((e) => [
        e.fecha.slice(0, 10).split("-").reverse().join("/"),
        new Date(e.fecha).toTimeString().slice(0, 5),
        nombre(e.pacienteId),
        e.tipo,
        e.detalle,
      ]),
    ];
    const csv = filas.map((f) => f.map((c) => `"${c.replace(/"/g, '""')}"`).join(";")).join("\n");
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "actividad-portal.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    onToast(`${lista.length} movimientos exportados`);
  };

  return (
    <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="space-y-3">
        <div className="card-grad flex flex-wrap items-center gap-2 p-2.5">
          <Seleccion
            value={tipo}
            onChange={(e) => setTipo(e.target.value as "" | TipoEventoPortal)}
            aria-label="Acción"
            className="h-8 rounded-full border border-border bg-white px-3 text-xs outline-none"
          >
            <option value="">Todas las acciones</option>
            {tipos.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </Seleccion>
          <Seleccion
            value={pacienteId}
            onChange={(e) => setPacienteId(e.target.value)}
            aria-label="Paciente"
            className="h-8 rounded-full border border-border bg-white px-3 text-xs outline-none"
          >
            <option value="">Todos los pacientes</option>
            {[...new Set(eventos.map((e) => e.pacienteId))].map((id) => (
              <option key={id} value={id}>
                {nombre(id)}
              </option>
            ))}
          </Seleccion>
          <button className={`${BTN_SECUNDARIO} ml-auto`} onClick={exportar}>
            <Download className="size-3.5" />
            Exportar
          </button>
        </div>
        {lista.length === 0 ? (
          <p className="card-grad p-8 text-center text-sm text-muted-foreground">
            Todavía no hay actividad en el portal.
          </p>
        ) : (
          <div className="card-grad p-4">
            <ol className="relative space-y-3 border-l-2 border-primary/15 pl-5">
              {lista.slice(0, limite).map((e) => {
                const Icon = ICONO_EVENTO[e.tipo];
                return (
                  <li key={e.id} className="relative">
                    <span
                      className={`absolute -left-[33px] top-0 grid size-7 place-items-center rounded-full ring-4 ring-white ${TONO_EVENTO[e.tipo] ?? "bg-primary/10 text-primary"}`}
                    >
                      <Icon className="size-3.5" />
                    </span>
                    <p className="text-sm">
                      <b className="font-semibold">{nombre(e.pacienteId)}</b>{" "}
                      <span className="text-muted-foreground">·</span> {e.tipo}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {e.detalle} · {hace(e.fecha)}
                    </p>
                  </li>
                );
              })}
            </ol>
            {lista.length > limite && (
              <button
                className="mt-3 text-xs font-semibold text-primary hover:underline"
                onClick={() => setLimite((l) => l + 25)}
              >
                Ver más ({lista.length - limite})
              </button>
            )}
          </div>
        )}
      </div>
      <div className="card-grad h-fit p-4">
        <p className="text-sm font-semibold">Qué hacen tus pacientes</p>
        <ul className="mt-2 space-y-1.5">
          {tipos
            .map((t) => ({ t, n: eventos.filter((e) => e.tipo === t).length }))
            .sort((a, b) => b.n - a.n)
            .map(({ t, n }) => {
              const Icon = ICONO_EVENTO[t];
              const max = Math.max(...tipos.map((x) => eventos.filter((e) => e.tipo === x).length));
              return (
                <li key={t}>
                  <button onClick={() => setTipo(tipo === t ? "" : t)} className="w-full text-left">
                    <p className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5">
                        <Icon className="size-3.5 text-primary" />
                        {t}
                      </span>
                      <b>{n}</b>
                    </p>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-primary/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-fuchsia-500"
                        style={{ width: `${(n / max) * 100}%` }}
                      />
                    </div>
                  </button>
                </li>
              );
            })}
        </ul>
      </div>
    </div>
  );
}

/* ───────────── Revisión de documentación ───────────── */

function RevisionDocs({ onToast }: { onToast: (m: string) => void }) {
  const { pacientes } = usePacientes();
  const { docs, accesos } = storePortal.usar();
  const [rechazar, setRechazar] = useState<{ pid: number; id: string } | null>(null);
  const [motivo, setMotivo] = useState("La imagen no se lee bien, subila de nuevo por favor.");

  const enRevision = Object.entries(docs).flatMap(([pid, lista]) =>
    lista.filter((d) => d.estado === "En revisión").map((d) => ({ pid: Number(pid), d })),
  );
  const conAcceso = pacientes.filter((p) => accesos[p.id]);

  const actualizar = (
    pid: number,
    id: string,
    cambio: { estado: "Aprobada" | "Rechazada"; observacion?: string },
  ) =>
    setPortal("docs", (prev) => ({
      ...prev,
      [pid]: docsDe(prev, pid).map((d) => (d.id === id ? { ...d, ...cambio } : d)),
    }));

  const nombre = (id: number) => {
    const p = pacientes.find((x) => x.id === id);
    return p ? `${p.nombre} ${p.apellido}` : "Paciente";
  };

  return (
    <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-2">
        <p className="px-1 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
          Para revisar{" "}
          <span className="rounded-full bg-primary/10 px-1.5 text-primary">
            {enRevision.length}
          </span>
        </p>
        {enRevision.length === 0 ? (
          <p className="card-grad p-8 text-center text-sm text-muted-foreground">
            No hay documentación pendiente de revisión.
          </p>
        ) : (
          enRevision.map(({ pid, d }) => (
            <div
              key={`${pid}-${d.id}`}
              className="card-grad flex flex-wrap items-center gap-3 p-3.5"
            >
              <span className="grid size-10 place-items-center rounded-full bg-sky-100 text-sky-600">
                <FileCheck2 className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{d.titulo}</p>
                <p className="text-xs text-muted-foreground">
                  {nombre(pid)} · {d.archivo}
                </p>
              </div>
              <button className={BTN_SECUNDARIO} onClick={() => onToast(`Abriendo ${d.archivo}…`)}>
                <Eye className="size-3.5" />
                Ver
              </button>
              <button
                className={BTN_SECUNDARIO}
                onClick={() => {
                  setRechazar({ pid, id: d.id });
                }}
              >
                <X className="size-3.5" />
                Rechazar
              </button>
              <button
                className={BTN_PRIMARIO}
                onClick={() => {
                  actualizar(pid, d.id, { estado: "Aprobada" });
                  onToast(`${d.titulo} de ${nombre(pid)} aprobado`);
                }}
              >
                <Check className="size-3.5" />
                Aprobar
              </button>
            </div>
          ))
        )}
        {rechazar && (
          <div className="card-grad space-y-2 p-4">
            <p className="text-sm font-semibold">¿Qué tiene que corregir el paciente?</p>
            <input
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="h-9 w-full rounded-xl border border-primary/12 bg-white px-3 text-sm outline-none focus:border-primary/45"
            />
            <div className="flex justify-end gap-2">
              <button className={BTN_SECUNDARIO} onClick={() => setRechazar(null)}>
                Cancelar
              </button>
              <button
                className={BTN_PRIMARIO}
                onClick={() => {
                  actualizar(rechazar.pid, rechazar.id, {
                    estado: "Rechazada",
                    observacion: motivo,
                  });
                  onToast("Documento rechazado: el paciente ve el motivo en su portal");
                  setRechazar(null);
                }}
              >
                <Send className="size-3.5" />
                Rechazar y avisar
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="card-grad h-fit p-4">
        <p className="text-sm font-semibold">Documentación por paciente</p>
        <ul className="mt-2 space-y-2">
          {conAcceso.map((p) => {
            const lista = docsDe(docs, p.id);
            const ok = lista.filter((d) => d.estado === "Aprobada").length;
            return (
              <li key={p.id}>
                <p className="flex justify-between text-xs">
                  <span className="font-medium">
                    {p.nombre} {p.apellido}
                  </span>
                  <span className="text-muted-foreground">
                    {ok}/{lista.length} aprobados
                  </span>
                </p>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-primary/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-500"
                    style={{ width: `${(ok / lista.length) * 100}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

/* ───────────── Configuración ───────────── */

function ConfiguracionPortal({ onToast }: { onToast: (m: string) => void }) {
  // Control del Administrador: qué ve el paciente, cómo le llega y quién puede enviarlo
  const real = useClinicaReal();
  const { usuario } = useSesion();
  const { config: cfg } = storePortal.usar();
  const esAdmin = !real || real.rol === "admin";
  return (
    <div className="space-y-5">
      <ControlPortalPaciente
        usuario={usuario?.nombre ?? "Administración"}
        puedeConfigurar={esAdmin}
        puedeEnviar={esAdmin || (!!real && puedePublicarPortal(cfg, real.rol, real.sesion.usuario.email))}
        onToast={onToast}
      />
      <ConfiguracionBasicaPortal onToast={onToast} />
      <DatosDePago onToast={onToast} />
    </div>
  );
}

function ConfiguracionBasicaPortal({ onToast }: { onToast: (m: string) => void }) {
  const { config } = storePortal.usar();
  const set = (cambio: Partial<ConfigPortal>) =>
    setPortal("config", (prev) => ({ ...prev, ...cambio }));
  const OPCIONES: {
    k: "turnosOnline" | "pagosOnline" | "presupuestosOnline" | "mensajes";
    l: string;
    d: string;
    icon: LucideIcon;
  }[] = [
    {
      k: "turnosOnline",
      l: "Pedir turnos online",
      d: "El paciente elige día y horario libre del profesional.",
      icon: CalendarCheck2,
    },
    {
      k: "pagosOnline",
      l: "Pagos online",
      d: "Ve su saldo y te paga por transferencia o con tu link de pago. Vos confirmás que llegó.",
      icon: CreditCard,
    },
    {
      k: "presupuestosOnline",
      l: "Aprobar presupuestos",
      d: "Puede aprobar o rechazar presupuestos desde el portal.",
      icon: FileCheck2,
    },
    {
      k: "mensajes",
      l: "Mensajes con la clínica",
      d: "Los mensajes llegan a la bandeja de Comunicación.",
      icon: MessageCircle,
    },
  ];
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      <div className="card-grad space-y-2 p-4">
        <p className="text-sm font-semibold">Qué pueden hacer tus pacientes</p>
        {OPCIONES.map((o) => (
          <label key={o.k} className="flex items-center gap-3 rounded-xl bg-white/80 p-3">
            <span className="grid size-9 place-items-center rounded-full bg-primary/10 text-primary">
              <o.icon className="size-4" />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-medium">{o.l}</span>
              <span className="block text-[11px] text-muted-foreground">{o.d}</span>
            </span>
            <input
              type="checkbox"
              checked={config[o.k]}
              onChange={(e) => {
                set({ [o.k]: e.target.checked });
                onToast(`${o.l}: ${e.target.checked ? "habilitado" : "deshabilitado"}`);
              }}
              className="size-4 accent-[var(--color-primary)]"
            />
          </label>
        ))}
      </div>
      <div className="card-grad space-y-3 p-4">
        <p className="text-sm font-semibold">Reglas y mensaje de bienvenida</p>
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Cancelación online hasta
          </span>
          <Seleccion
            value={config.horasMinimasCancelar}
            onChange={(e) => set({ horasMinimasCancelar: Number(e.target.value) })}
            className="h-9 w-full rounded-xl border border-primary/12 bg-white px-3 text-sm outline-none"
          >
            {[2, 12, 24, 48].map((h) => (
              <option key={h} value={h}>
                {h} horas antes del turno
              </option>
            ))}
          </Seleccion>
        </label>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Reprogramación online hasta
            </span>
            <Seleccion
              value={config.horasMinimasReprogramar ?? 24}
              onChange={(e) => set({ horasMinimasReprogramar: Number(e.target.value) })}
              className="h-9 w-full rounded-xl border border-primary/12 bg-white px-3 text-sm outline-none"
            >
              {[2, 12, 24, 48].map((h) => (
                <option key={h} value={h}>
                  {h} horas antes
                </option>
              ))}
            </Seleccion>
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Máximo de reprogramaciones
            </span>
            <Seleccion
              value={config.maxReprogramaciones ?? 2}
              onChange={(e) => set({ maxReprogramaciones: Number(e.target.value) })}
              className="h-9 w-full rounded-xl border border-primary/12 bg-white px-3 text-sm outline-none"
            >
              <option value={0}>Sin límite</option>
              {[1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {n} por turno
                </option>
              ))}
            </Seleccion>
          </label>
        </div>

        <label className="flex items-center gap-3 rounded-xl bg-white/80 p-3">
          <span className="grid size-9 place-items-center rounded-full bg-primary/10 text-primary">
            <CalendarCheck2 className="size-4" />
          </span>
          <span className="flex-1">
            <span className="block text-sm font-medium">Recuperación automática de turnos</span>
            <span className="block text-[11px] text-muted-foreground">
              Cuando se cancela un turno, se ofrece a la lista de espera. Requiere Automatizaciones.
            </span>
          </span>
          <input
            type="checkbox"
            checked={config.recuperacionAutomatica !== false}
            onChange={(e) => {
              set({ recuperacionAutomatica: e.target.checked });
              onToast(`Recuperación automática: ${e.target.checked ? "activada" : "desactivada"}`);
            }}
            className="size-4 accent-[var(--color-primary)]"
          />
        </label>

        {config.recuperacionAutomatica !== false && (
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              La oferta del turno liberado vence en
            </span>
            <Seleccion
              value={config.minutosVigenciaOferta ?? 120}
              onChange={(e) => set({ minutosVigenciaOferta: Number(e.target.value) })}
              className="h-9 w-full rounded-xl border border-primary/12 bg-white px-3 text-sm outline-none"
            >
              <option value={30}>30 minutos</option>
              <option value={60}>1 hora</option>
              <option value={120}>2 horas</option>
              <option value={240}>4 horas</option>
              <option value={720}>12 horas</option>
            </Seleccion>
          </label>
        )}

        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Mensaje de bienvenida
          </span>
          <textarea
            rows={3}
            value={config.bienvenida}
            onChange={(e) => set({ bienvenida: e.target.value })}
            placeholder="Ej: ¡Bienvenido! Recordá traer tu credencial a cada turno."
            className="w-full rounded-xl border border-primary/12 bg-white px-3 py-2 text-sm outline-none focus:border-primary/45"
          />
        </label>
        <p className="rounded-xl bg-primary/[0.05] px-3 py-2 text-xs text-muted-foreground">
          Los pacientes entran desde el celular con su DNI, correo o teléfono y un código (sin contraseña). El link
          está en <b className="text-foreground">Accesos</b>, con el botón para mandárselo por WhatsApp.
        </p>
      </div>
    </div>
  );
}

/* ───────────── Pagos que informaron los pacientes ───────────── */

function usePlata() {
  const pais = usePaisClinica();
  return (n: number) => {
    try {
      return new Intl.NumberFormat(`es-${pais}`, { style: "currency", currency: MONEDA_PAIS[pais] ?? "USD", maximumFractionDigits: 0 }).format(n);
    } catch {
      return `$ ${Math.round(n).toLocaleString("es")}`;
    }
  };
}
const MONEDA_PAIS: Record<string, string> = { AR: "ARS", UY: "UYU", CL: "CLP", CO: "COP", PE: "PEN", EC: "USD", VE: "VES", MX: "MXN", ES: "EUR", BO: "BOB", PY: "PYG", US: "USD" };

/** «Ya pagué» de los pacientes: la clínica revisa que haya llegado y lo confirma (va a su cuenta). */
function PagosParaConfirmar({ onToast }: { onToast: (m: string) => void }) {
  const { pagosInformados = [] } = storePortal.usar();
  const { cambiar } = useRegistrosPacientes();
  const plata = usePlata();
  const pendientes = pagosInformados.filter((p) => p.estado === "Pendiente");
  if (pendientes.length === 0) return null;
  const resolver = (id: string, estado: "Confirmado" | "Rechazado") => {
    const p = pagosInformados.find((x) => x.id === id);
    if (!p) return;
    if (estado === "Confirmado")
      cambiar(p.pacienteId, "cuenta", (prev) => [
        ...prev,
        {
          id: Date.now(),
          fecha: new Date().toISOString().slice(0, 10),
          tipo: "Pago",
          concepto: "Pago informado desde el portal",
          medio: p.medio,
          monto: p.monto,
          notas: p.referencia ? `Ref. ${p.referencia}` : "",
        },
      ]);
    setPortal("pagosInformados", (prev = []) => prev.map((x) => (x.id === id ? { ...x, estado } : x)));
    onToast(estado === "Confirmado" ? `Pago de ${p.paciente} confirmado: ya figura en su cuenta` : "Pago marcado como no recibido");
  };
  return (
    <div className="card-grad border-amber-200 p-4 ring-1 ring-amber-200">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <CreditCard className="size-4 text-amber-600" /> Pagos para confirmar ({pendientes.length})
      </p>
      <p className="text-[11px] text-muted-foreground">Los pacientes avisaron que pagaron. Revisá que haya llegado y confirmalo: recién ahí se descuenta de su saldo.</p>
      <ul className="mt-3 space-y-2">
        {pendientes.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-white/90 p-3 ring-1 ring-primary/10">
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">{p.paciente} · {plata(p.monto)}</span>
              <span className="block text-[11px] text-muted-foreground">
                {p.medio}{p.referencia ? ` · ref. ${p.referencia}` : ""} · {new Date(p.fecha).toLocaleDateString("es")}
              </span>
            </span>
            <button type="button" className={BTN_SECUNDARIO} onClick={() => resolver(p.id, "Rechazado")}>
              No llegó
            </button>
            <button type="button" className={BTN_PRIMARIO} onClick={() => resolver(p.id, "Confirmado")}>
              <Check className="size-3.5" /> Confirmar
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Cómo le pagan los pacientes a la clínica: sus datos de transferencia o su propio link de pago. */
function DatosDePago({ onToast }: { onToast: (m: string) => void }) {
  const { config } = storePortal.usar();
  const d: DatosPagoClinica = { titular: "", banco: "", cuenta: "", alias: "", link: "", instrucciones: "", ...(config.datosPago ?? {}) };
  const set = (c: Partial<DatosPagoClinica>) => setPortal("config", (prev) => ({ ...prev, datosPago: { ...d, ...c } }));
  const campo = (k: keyof DatosPagoClinica, l: string, ph: string) => (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{l}</span>
      <input
        value={d[k]}
        onChange={(e) => set({ [k]: e.target.value })}
        placeholder={ph}
        maxLength={k === "instrucciones" ? 500 : 160}
        className="h-9 w-full rounded-xl border border-primary/12 bg-white px-3 text-sm outline-none focus:border-primary/45"
      />
    </label>
  );
  if (!config.pagosOnline) return null;
  const linkMal = !!d.link && !/^https:\/\//.test(d.link.trim());
  return (
    <div className="card-grad space-y-3 p-4">
      <div>
        <p className="text-sm font-semibold">Cómo te pagan tus pacientes</p>
        <p className="text-[11px] text-muted-foreground">
          Lo ven en su portal junto con su saldo. La plata va directo a tu cuenta: Cloud Esther no cobra por vos. Cuando un paciente avisa que pagó, te llega un aviso para confirmarlo.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {campo("titular", "Titular", "Nombre o razón social")}
        {campo("banco", "Banco o billetera", "Ej. Banco Nación, Mercado Pago")}
        {campo("cuenta", "Número de cuenta", "CBU, CVU, IBAN, CLABE…")}
        {campo("alias", "Alias", "Ej. clinica.sonrisa")}
      </div>
      {campo("link", "Tu link de pago (opcional)", "https://… (Mercado Pago, Stripe u otro)")}
      {linkMal && <p className="text-[11px] text-rose-600">El link tiene que empezar con https://</p>}
      {campo("instrucciones", "Indicaciones (opcional)", "Ej. Mandanos el comprobante por WhatsApp")}
      <button type="button" className={BTN_SECUNDARIO} onClick={() => onToast("Datos de pago guardados")}>
        <Check className="size-3.5" /> Listo
      </button>
    </div>
  );
}
