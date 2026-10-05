import { useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  Clock,
  Eye,
  FileClock,
  Info,
  KeyRound,
  LockKeyhole,
  LogIn,
  MonitorSmartphone,
  Search,
  ShieldCheck,
  Timer,
  Users,
  X,
} from "lucide-react";
import type { PlanId } from "@/lib/cloud-esther/data";
import type { ClinicSettings } from "@/lib/cloud-esther/settings-store";
import { useSesion } from "@/lib/cloud-esther/auth-store";
import {
  aplicarRetencion,
  estadoSesion,
  useAuditoria,
  type EventoAuditoria,
  type SesionAuditoria,
  type TipoEventoAuditoria,
} from "@/lib/cloud-esther/auditoria-store";
import { InicioSesionCorporativo } from "@/components/cloud-esther/InicioSesionCorporativo";

/* Ubicación: src/components/cloud-esther/configuracion/SeguridadAuditoria.tsx
   Configuración → Seguridad (Plus y Enterprise): todo lo de auditoría en un solo lugar.
   Explica qué es, muestra indicadores, sesiones activas, historial de accesos, registro de
   actividad y la configuración (qué se registra siempre, qué es opcional y cuánto se conserva). */

type Sub = "resumen" | "sesiones" | "accesos" | "actividad" | "ajustes";

const SUBS: { id: Sub; label: string; icon: typeof Activity }[] = [
  { id: "resumen", label: "Resumen", icon: ShieldCheck },
  { id: "sesiones", label: "Sesiones activas", icon: MonitorSmartphone },
  { id: "accesos", label: "Historial de accesos", icon: LogIn },
  { id: "actividad", label: "Registro de actividad", icon: FileClock },
  { id: "ajustes", label: "Configuración", icon: KeyRound },
];

const CARD =
  "rounded-2xl border border-border/70 bg-card/95 p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_4px_14px_rgba(16,24,40,0.04)]";
const INPUT =
  "h-9 rounded-xl border border-border bg-background px-3 text-xs outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/15";
const POR_PAGINA = 10;

const hora = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleTimeString("es-AR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "—";
const dia = (iso: string) =>
  new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
function duracion(ms: number) {
  const min = Math.max(0, Math.round(ms / 60000));
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${min % 60} min`;
}

const IP_PENDIENTE = "La informa el servidor";

type Props = {
  plan: PlanId;
  settings: ClinicSettings;
  actualizar: <K extends keyof ClinicSettings>(key: K, value: ClinicSettings[K]) => void;
  onToast: (msg: string) => void;
};

export function SeguridadAuditoria({ plan, settings, actualizar, onToast }: Props) {
  const { clinicId } = useSesion();
  const registro = useAuditoria(clinicId ?? "sin-sesion");
  const [sub, setSub] = useState<Sub>("resumen");

  return (
    <div className="space-y-4">
      {/* Qué es la auditoría */}
      <div className={`${CARD} bg-gradient-to-br from-card via-card to-primary/[0.05]`}>
        <div className="flex flex-wrap items-start gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
            <ShieldCheck className="size-6" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold tracking-tight">Seguridad y auditoría</h2>
            <p className="mt-1 max-w-4xl text-sm leading-relaxed text-muted-foreground">
              Con la auditoría de Cloud Esther podés consultar quién accedió al sistema, cuándo
              ingresó, desde qué dispositivo se conectó, cuánto duró su sesión y qué acciones
              relevantes realizó dentro de la clínica. Sirve para el control interno, la
              trazabilidad y la seguridad de los datos de tus pacientes.
            </p>
            <div className="mt-3 grid gap-2 text-xs md:grid-cols-3">
              <Dato titulo="Quién la ve">
                El propietario de la clínica y los administradores a los que les dé permiso. El
                resto del equipo no tiene acceso.
              </Dato>
              <Dato titulo="Qué registra">
                Ingresos y salidas, intentos fallidos, módulos abiertos, altas, cambios y bajas,
                cambios de permisos y de configuración.
              </Dato>
              <Dato titulo="Qué no guarda">
                Datos clínicos: solo referencias (por ejemplo «Paciente #12») para identificar el
                evento sin exponer información sensible.
              </Dato>
            </div>
            <p className="mt-3 flex items-start gap-1.5 rounded-xl bg-amber-500/10 px-3 py-2 text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
              <Info className="mt-0.5 size-3.5 shrink-0" />
              Demo: se registra lo que ocurre en este navegador. La dirección IP y la ubicación
              aproximada las agrega el servidor cuando Cloud Esther esté conectado al backend.
            </p>
          </div>
        </div>
        <nav
          className="mt-4 flex flex-wrap gap-1.5 rounded-2xl border border-primary/10 bg-primary/[0.025] p-1.5"
          aria-label="Secciones de seguridad"
        >
          {SUBS.map(({ id, label, icon: I }) => (
            <button
              key={id}
              type="button"
              onClick={() => setSub(id)}
              aria-pressed={sub === id}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                sub === id
                  ? "bg-primary text-primary-foreground shadow-[0_8px_18px_-10px_rgba(124,58,237,0.8)]"
                  : "text-muted-foreground hover:bg-card hover:text-foreground"
              }`}
            >
              <I className="size-3.5" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {!clinicId ? (
        <Vacio
          titulo="Ingresá con tu cuenta para ver la auditoría"
          texto="La auditoría pertenece a cada clínica. En el recorrido sin cuenta no hay sesiones que registrar."
        />
      ) : sub === "resumen" ? (
        <Resumen sesiones={registro.sesiones} eventos={registro.eventos} onIr={setSub} />
      ) : sub === "sesiones" ? (
        <SesionesActivas sesiones={registro.sesiones} />
      ) : sub === "accesos" ? (
        <HistorialAccesos sesiones={registro.sesiones} />
      ) : sub === "actividad" ? (
        <RegistroActividad eventos={registro.eventos} />
      ) : (
        <Ajustes
          plan={plan}
          settings={settings}
          actualizar={actualizar}
          onToast={onToast}
          clinicId={clinicId}
        />
      )}
    </div>
  );
}

function Dato({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/70 p-3">
      <p className="font-semibold text-foreground">{titulo}</p>
      <p className="mt-0.5 leading-relaxed text-muted-foreground">{children}</p>
    </div>
  );
}

function Vacio({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className={`${CARD} border-dashed text-center`}>
      <FileClock className="mx-auto size-7 text-muted-foreground" />
      <p className="mt-3 text-sm font-semibold">{titulo}</p>
      <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-muted-foreground">{texto}</p>
    </div>
  );
}

function Kpi({
  icon: I,
  label,
  valor,
  sub,
}: {
  icon: typeof Activity;
  label: string;
  valor: string;
  sub: string;
}) {
  return (
    <div className="rounded-[20px] border border-primary/20 bg-gradient-to-br from-card to-primary/[0.06] p-4">
      <div className="flex items-start justify-between">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-primary/80">
          {label}
        </p>
        <I className="size-4 text-primary" />
      </div>
      <p className="mt-1 text-[26px] font-bold leading-tight text-primary">{valor}</p>
      <p className="text-[11px] text-muted-foreground">{sub}</p>
    </div>
  );
}

function Resumen({
  sesiones,
  eventos,
  onIr,
}: {
  sesiones: SesionAuditoria[];
  eventos: EventoAuditoria[];
  onIr: (s: Sub) => void;
}) {
  const activas = sesiones.filter((s) => estadoSesion(s) === "Activa");
  const cerradas = sesiones.filter((s) => s.fin);
  const promedio = cerradas.length
    ? cerradas.reduce(
        (t, s) => t + (new Date(s.fin ?? s.inicio).getTime() - new Date(s.inicio).getTime()),
        0,
      ) / cerradas.length
    : 0;
  const fallidos = eventos.filter((e) => e.tipo === "Intento fallido").length;
  const seguridad = eventos.filter(
    (e) => e.tipo === "Intento fallido" || e.tipo === "Permisos" || e.tipo === "Seguridad",
  ).length;
  const porModulo = contar(
    eventos.filter((e) => e.tipo === "Acceso a módulo").map((e) => e.modulo),
  ).slice(0, 6);
  const porUsuario = contar(eventos.map((e) => e.usuario)).slice(0, 5);
  const maxModulo = porModulo[0]?.[1] ?? 1;

  if (!sesiones.length && !eventos.length)
    return (
      <Vacio
        titulo="Todavía no hay registros"
        texto="Los ingresos, salidas y acciones de tu equipo van a aparecer acá a medida que usen Cloud Esther."
      />
    );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
        <Kpi
          icon={LogIn}
          label="Accesos"
          valor={String(eventos.filter((e) => e.tipo === "Inicio de sesión").length)}
          sub="Ingresos registrados"
        />
        <Kpi
          icon={Users}
          label="Usuarios activos"
          valor={String(new Set(activas.map((s) => s.email)).size)}
          sub="Con sesión abierta"
        />
        <Kpi
          icon={MonitorSmartphone}
          label="Sesiones abiertas"
          valor={String(activas.length)}
          sub="En este momento"
        />
        <Kpi
          icon={Timer}
          label="Duración promedio"
          valor={duracion(promedio)}
          sub="De sesiones cerradas"
        />
        <Kpi
          icon={AlertTriangle}
          label="Intentos fallidos"
          valor={String(fallidos)}
          sub="Contraseña incorrecta"
        />
        <Kpi
          icon={ShieldCheck}
          label="Eventos de seguridad"
          valor={String(seguridad)}
          sub="Fallidos y permisos"
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className={CARD}>
          <p className="text-sm font-semibold">Actividad por módulo</p>
          <ul className="mt-3 space-y-2.5">
            {porModulo.length === 0 && (
              <li className="text-xs text-muted-foreground">Sin accesos a módulos registrados.</li>
            )}
            {porModulo.map(([m, n]) => (
              <li key={m}>
                <div className="flex justify-between text-xs">
                  <span className="font-medium">{m}</span>
                  <span className="text-muted-foreground">{n}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${(n / maxModulo) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className={CARD}>
          <p className="text-sm font-semibold">Usuarios con más actividad</p>
          <ul className="mt-3 space-y-2">
            {porUsuario.map(([u, n]) => (
              <li
                key={u}
                className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2 text-xs"
              >
                <span className="font-medium">{u}</span>
                <span className="text-muted-foreground">{n} eventos</span>
              </li>
            ))}
          </ul>
        </div>
        <div className={CARD}>
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Actividad reciente</p>
            <button
              type="button"
              onClick={() => onIr("actividad")}
              className="text-[11px] font-semibold text-primary hover:underline"
            >
              Ver todo
            </button>
          </div>
          <ul className="mt-3 space-y-2">
            {eventos.slice(0, 6).map((e) => (
              <li key={e.id} className="text-xs">
                <p className="font-medium">{e.accion}</p>
                <p className="text-muted-foreground">
                  {e.usuario} · {dia(e.fecha)} {hora(e.fecha)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function contar(lista: string[]) {
  const m = new Map<string, number>();
  lista.forEach((x) => m.set(x, (m.get(x) ?? 0) + 1));
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

function EstadoPill({ estado }: { estado: ReturnType<typeof estadoSesion> }) {
  const c =
    estado === "Activa"
      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      : estado === "Vencida"
        ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
        : "bg-muted text-muted-foreground";
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${c}`}>
      {estado}
    </span>
  );
}

function SesionesActivas({ sesiones }: { sesiones: SesionAuditoria[] }) {
  const activas = sesiones.filter((s) => estadoSesion(s) === "Activa");
  if (!activas.length)
    return (
      <Vacio
        titulo="No hay sesiones abiertas"
        texto="Cuando alguien de tu equipo esté usando Cloud Esther, su sesión aparece acá."
      />
    );
  return (
    <div className={CARD}>
      <p className="text-sm font-semibold">Sesiones abiertas</p>
      <p className="text-xs text-muted-foreground">
        El tiempo es provisional: la duración final se conoce cuando la persona cierra sesión o la
        sesión vence (30 minutos sin actividad).
      </p>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {activas.map((s) => (
          <div key={s.id} className="rounded-xl border border-border/70 p-3 text-xs">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">{s.usuario}</p>
              <EstadoPill estado="Activa" />
            </div>
            <p className="text-muted-foreground">
              {s.email} · {s.rol}
            </p>
            <dl className="mt-2 grid grid-cols-2 gap-1.5">
              <Campo k="Ingreso" v={`${dia(s.inicio)} ${hora(s.inicio)}`} />
              <Campo
                k="Tiempo hasta ahora"
                v={`${duracion(Date.now() - new Date(s.inicio).getTime())} (provisional)`}
              />
              <Campo k="Última actividad" v={hora(s.ultimaActividad)} />
              <Campo k="Dispositivo" v={`${s.dispositivo} · ${s.sistema} · ${s.navegador}`} />
              <Campo k="IP registrada" v={s.ip ?? IP_PENDIENTE} />
            </dl>
          </div>
        ))}
      </div>
    </div>
  );
}

function Campo({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {k}
      </dt>
      <dd className="font-medium">{v}</dd>
    </div>
  );
}

function Paginador({
  pagina,
  total,
  onCambiar,
}: {
  pagina: number;
  total: number;
  onCambiar: (p: number) => void;
}) {
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  return (
    <div className="flex items-center justify-between border-t border-border/60 pt-3 text-xs text-muted-foreground">
      <span>
        {total} {total === 1 ? "registro" : "registros"}
      </span>
      <span className="flex items-center gap-1">
        <button
          type="button"
          disabled={pagina === 0}
          onClick={() => onCambiar(pagina - 1)}
          className="btn-ce-outline !h-7 !px-2.5"
        >
          Anterior
        </button>
        <span className="px-2">
          {pagina + 1} / {paginas}
        </span>
        <button
          type="button"
          disabled={pagina + 1 >= paginas}
          onClick={() => onCambiar(pagina + 1)}
          className="btn-ce-outline !h-7 !px-2.5"
        >
          Siguiente
        </button>
      </span>
    </div>
  );
}

function HistorialAccesos({ sesiones }: { sesiones: SesionAuditoria[] }) {
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState("");
  const [rol, setRol] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [orden, setOrden] = useState<"desc" | "asc">("desc");
  const [pagina, setPagina] = useState(0);
  const [detalle, setDetalle] = useState<SesionAuditoria | null>(null);
  const roles = [...new Set(sesiones.map((s) => s.rol))];

  const filtradas = useMemo(
    () =>
      sesiones
        .filter((s) => {
          const t = q.trim().toLowerCase();
          const d = s.inicio.slice(0, 10);
          return (
            (!t || `${s.usuario} ${s.email}`.toLowerCase().includes(t)) &&
            (!estado || estadoSesion(s) === estado) &&
            (!rol || s.rol === rol) &&
            (!desde || d >= desde) &&
            (!hasta || d <= hasta)
          );
        })
        .sort((a, b) =>
          orden === "desc" ? b.inicio.localeCompare(a.inicio) : a.inicio.localeCompare(b.inicio),
        ),
    [sesiones, q, estado, rol, desde, hasta, orden],
  );
  const pagina0 = filtradas.slice(pagina * POR_PAGINA, (pagina + 1) * POR_PAGINA);

  return (
    <div className={CARD}>
      <p className="text-sm font-semibold">Historial de accesos</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <label className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPagina(0);
            }}
            placeholder="Buscar usuario o correo"
            className={`${INPUT} w-full pl-8`}
          />
        </label>
        <select
          value={rol}
          onChange={(e) => {
            setRol(e.target.value);
            setPagina(0);
          }}
          className={INPUT}
          aria-label="Rol"
        >
          <option value="">Todos los roles</option>
          {roles.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
        <select
          value={estado}
          onChange={(e) => {
            setEstado(e.target.value);
            setPagina(0);
          }}
          className={INPUT}
          aria-label="Estado"
        >
          <option value="">Todos los estados</option>
          <option>Activa</option>
          <option>Cerrada</option>
          <option>Vencida</option>
        </select>
        <input
          type="date"
          value={desde}
          onChange={(e) => setDesde(e.target.value)}
          className={INPUT}
          aria-label="Desde"
        />
        <input
          type="date"
          value={hasta}
          onChange={(e) => setHasta(e.target.value)}
          className={INPUT}
          aria-label="Hasta"
        />
        <button
          type="button"
          onClick={() => setOrden((o) => (o === "desc" ? "asc" : "desc"))}
          className="btn-ce-outline !h-9"
        >
          {orden === "desc" ? "Más recientes" : "Más antiguos"}
        </button>
      </div>
      {filtradas.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
          No hay accesos con esos filtros.
        </p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-xs">
            <thead className="text-[10.5px] uppercase tracking-wide text-muted-foreground">
              <tr className="border-b border-border/60">
                {[
                  "Usuario",
                  "Rol",
                  "Fecha",
                  "Entrada",
                  "Salida",
                  "Duración",
                  "IP",
                  "Dispositivo",
                  "Estado",
                ].map((h) => (
                  <th key={h} className="py-2 pr-3 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pagina0.map((s) => {
                const est = estadoSesion(s);
                return (
                  <tr
                    key={s.id}
                    onClick={() => setDetalle(s)}
                    className="cursor-pointer border-b border-border/40 hover:bg-primary/[0.03]"
                  >
                    <td className="py-2.5 pr-3 font-semibold">{s.usuario}</td>
                    <td className="py-2.5 pr-3">{s.rol}</td>
                    <td className="py-2.5 pr-3">{dia(s.inicio)}</td>
                    <td className="py-2.5 pr-3 tabular-nums">{hora(s.inicio)}</td>
                    <td className="py-2.5 pr-3 tabular-nums">{s.fin ? hora(s.fin) : "—"}</td>
                    <td className="py-2.5 pr-3">
                      {s.fin
                        ? duracion(new Date(s.fin).getTime() - new Date(s.inicio).getTime())
                        : est === "Activa"
                          ? "En curso"
                          : "Sin cierre registrado"}
                    </td>
                    <td className="py-2.5 pr-3 text-muted-foreground">{s.ip ?? IP_PENDIENTE}</td>
                    <td className="py-2.5 pr-3">
                      {s.dispositivo} · {s.navegador}
                    </td>
                    <td className="py-2.5 pr-3">
                      <EstadoPill estado={est} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-3">
        <Paginador pagina={pagina} total={filtradas.length} onCambiar={setPagina} />
      </div>
      {detalle && (
        <Detalle titulo={`Sesión de ${detalle.usuario}`} onCerrar={() => setDetalle(null)}>
          <Campo k="Correo" v={detalle.email} />
          <Campo k="Rol" v={detalle.rol} />
          <Campo k="Identificador de sesión" v={detalle.id} />
          <Campo k="Estado" v={estadoSesion(detalle)} />
          <Campo k="Ingreso" v={`${dia(detalle.inicio)} ${hora(detalle.inicio)}`} />
          <Campo
            k="Salida"
            v={detalle.fin ? `${dia(detalle.fin)} ${hora(detalle.fin)}` : "Sin salida registrada"}
          />
          <Campo
            k="Última actividad"
            v={`${dia(detalle.ultimaActividad)} ${hora(detalle.ultimaActividad)}`}
          />
          <Campo k="Dispositivo" v={detalle.dispositivo} />
          <Campo k="Sistema operativo" v={detalle.sistema} />
          <Campo k="Navegador" v={detalle.navegador} />
          <Campo k="IP registrada" v={detalle.ip ?? IP_PENDIENTE} />
          <Campo k="Ubicación aproximada" v="Pendiente de integración (derivada de la IP)" />
        </Detalle>
      )}
    </div>
  );
}

const TIPOS: TipoEventoAuditoria[] = [
  "Inicio de sesión",
  "Cierre de sesión",
  "Intento fallido",
  "Acceso a módulo",
  "Alta",
  "Modificación",
  "Baja",
  "Configuración",
  "Permisos",
  "Seguridad",
];

function RegistroActividad({ eventos }: { eventos: EventoAuditoria[] }) {
  const [q, setQ] = useState("");
  const [tipo, setTipo] = useState("");
  const [resultado, setResultado] = useState("");
  const [desde, setDesde] = useState("");
  const [pagina, setPagina] = useState(0);
  const [detalle, setDetalle] = useState<EventoAuditoria | null>(null);
  const filtrados = eventos.filter((e) => {
    const t = q.trim().toLowerCase();
    return (
      (!t ||
        `${e.usuario} ${e.accion} ${e.modulo} ${e.registro ?? ""}`.toLowerCase().includes(t)) &&
      (!tipo || e.tipo === tipo) &&
      (!resultado || e.resultado === resultado) &&
      (!desde || e.fecha.slice(0, 10) >= desde)
    );
  });
  const pagina0 = filtrados.slice(pagina * POR_PAGINA, (pagina + 1) * POR_PAGINA);
  return (
    <div className={CARD}>
      <p className="text-sm font-semibold">Registro de actividad</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <label className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPagina(0);
            }}
            placeholder="Buscar usuario, acción o módulo"
            className={`${INPUT} w-full pl-8`}
          />
        </label>
        <select
          value={tipo}
          onChange={(e) => {
            setTipo(e.target.value);
            setPagina(0);
          }}
          className={INPUT}
          aria-label="Tipo"
        >
          <option value="">Todos los eventos</option>
          {TIPOS.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <select
          value={resultado}
          onChange={(e) => {
            setResultado(e.target.value);
            setPagina(0);
          }}
          className={INPUT}
          aria-label="Resultado"
        >
          <option value="">Todos los resultados</option>
          <option>Correcto</option>
          <option>Fallido</option>
          <option>Denegado</option>
        </select>
        <input
          type="date"
          value={desde}
          onChange={(e) => setDesde(e.target.value)}
          className={INPUT}
          aria-label="Desde"
        />
      </div>
      {filtrados.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
          No hay eventos con esos filtros.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-border/50">
          {pagina0.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                onClick={() => setDetalle(e)}
                className="flex w-full flex-wrap items-center gap-3 py-2.5 text-left text-xs hover:bg-primary/[0.03]"
              >
                <span
                  className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${e.resultado === "Correcto" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}
                >
                  {e.tipo}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{e.accion}</span>
                  <span className="text-muted-foreground">
                    {e.usuario} · {e.modulo}
                    {e.registro ? ` · ${e.registro}` : ""}
                  </span>
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {dia(e.fecha)} {hora(e.fecha)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3">
        <Paginador pagina={pagina} total={filtrados.length} onCambiar={setPagina} />
      </div>
      {detalle && (
        <Detalle titulo={detalle.accion} onCerrar={() => setDetalle(null)}>
          <Campo k="Tipo" v={detalle.tipo} />
          <Campo k="Resultado" v={detalle.resultado} />
          <Campo k="Usuario" v={`${detalle.usuario} (${detalle.email})`} />
          <Campo k="Rol" v={detalle.rol} />
          <Campo k="Fecha y hora" v={`${dia(detalle.fecha)} ${hora(detalle.fecha)}`} />
          <Campo k="Módulo" v={detalle.modulo} />
          <Campo k="Registro afectado" v={detalle.registro ?? "—"} />
          <Campo k="Sesión" v={detalle.sesionId ?? "—"} />
        </Detalle>
      )}
    </div>
  );
}

function Detalle({
  titulo,
  onCerrar,
  children,
}: {
  titulo: string;
  onCerrar: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-center bg-black/45 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onCerrar}
    >
      <div
        className="w-full max-w-lg rounded-[24px] border border-border bg-card p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-base font-bold">{titulo}</p>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="grid size-8 place-items-center rounded-lg hover:bg-muted"
          >
            <X className="size-4" />
          </button>
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-xs">{children}</dl>
      </div>
    </div>
  );
}

const RETENCION = [90, 180, 365, 730];

function Ajustes({ plan, settings, actualizar, onToast, clinicId }: Props & { clinicId: string }) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <div className={CARD}>
        <p className="flex items-center gap-2 text-sm font-semibold">
          <LockKeyhole className="size-4 text-primary" /> Qué se registra
        </p>
        <div className="mt-3 rounded-xl bg-primary/[0.05] p-3 text-xs">
          <p className="font-semibold">Siempre (por seguridad, no se puede desactivar)</p>
          <p className="mt-0.5 text-muted-foreground">
            Ingresos y salidas, intentos fallidos, cambios de permisos, cambios de configuración y
            altas o bajas de registros.
          </p>
        </div>
        <div className="mt-3 flex items-start justify-between gap-4 rounded-xl border border-border/70 p-3">
          <div className="text-xs">
            <p className="font-semibold">Registrar cada módulo que abre un usuario</p>
            <p className="mt-0.5 leading-relaxed text-muted-foreground">
              Agrega al registro cada vez que alguien entra a Agenda, Pacientes, Facturación, etc.
              Da más detalle del uso, pero genera más registros.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.auditLogEnabled}
            onClick={() => {
              actualizar("auditLogEnabled", !settings.auditLogEnabled);
              onToast(
                settings.auditLogEnabled
                  ? "Ya no se registran los accesos a módulos"
                  : "Se registran los accesos a módulos",
              );
            }}
            className={`relative h-6 w-11 shrink-0 rounded-full transition ${settings.auditLogEnabled ? "bg-primary" : "bg-muted-foreground/30"}`}
          >
            <span
              className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${settings.auditLogEnabled ? "left-[22px]" : "left-0.5"}`}
            />
          </button>
        </div>
        <div className="mt-3 rounded-xl border border-border/70 p-3 text-xs">
          <p className="font-semibold">Conservación de los registros</p>
          <p className="mt-0.5 text-muted-foreground">
            Cuánto tiempo se guardan. Revisá los plazos que exige la normativa de tu país antes de
            elegir uno corto.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <select
              value={settings.auditRetentionDays}
              onChange={(e) => actualizar("auditRetentionDays", Number(e.target.value))}
              className={INPUT}
              aria-label="Días de conservación"
            >
              {RETENCION.map((d) => (
                <option key={d} value={d}>
                  {d >= 365 ? `${d / 365} ${d === 365 ? "año" : "años"}` : `${d} días`}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn-ce-outline"
              onClick={() => {
                if (
                  window.confirm(
                    `¿Borrar los registros de más de ${settings.auditRetentionDays} días?`,
                  )
                ) {
                  aplicarRetencion(clinicId, settings.auditRetentionDays);
                  onToast("Se aplicó la conservación elegida");
                }
              }}
            >
              <Clock /> Aplicar ahora
            </button>
          </div>
        </div>
        <div className="mt-3 rounded-xl border border-border/70 p-3 text-xs">
          <p className="flex items-center gap-1.5 font-semibold">
            <Eye className="size-3.5 text-primary" /> Quién puede consultarla
          </p>
          <p className="mt-0.5 text-muted-foreground">
            El propietario y los administradores con el permiso «Auditoría» (Equipo → Permisos y
            accesos). El resto de los roles no la ve. Cuando haya backend, el servidor también
            valida este permiso.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className={CARD}>
          <p className="flex items-center gap-2 text-sm font-semibold">
            <ShieldCheck className="size-4 text-primary" /> Protección del acceso
          </p>
          <ul className="mt-3 space-y-2 text-xs">
            {[
              ["Verificación en dos pasos", "Código adicional al ingresar."],
              [
                "Bloqueo por intentos fallidos",
                "Bloquea la cuenta tras varios intentos con contraseña incorrecta.",
              ],
              ["Cierre por inactividad", "Cierra la sesión tras 30 minutos sin uso."],
            ].map(([t, d]) => (
              <li
                key={t}
                className="flex items-start justify-between gap-3 rounded-xl border border-border/70 p-3"
              >
                <span>
                  <span className="block font-semibold">{t}</span>
                  <span className="text-muted-foreground">{d}</span>
                </span>
                <span className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10.5px] font-semibold text-amber-700 dark:text-amber-300">
                  Pendiente de backend
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className={CARD}>
          <InicioSesionCorporativo
            plan={plan}
            settings={settings}
            actualizar={actualizar}
            onToast={onToast}
          />
        </div>
      </div>
    </div>
  );
}
