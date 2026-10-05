import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  Clock,
  Download,
  KeyRound,
  LogIn,
  MonitorSmartphone,
  ShieldAlert,
  Users,
} from "lucide-react";
import { useState } from "react";

import { Cargando, KpiCard, Seccion, Vacio } from "@/components/admin/bits";
import { Pestanas, Pildora, Tabla, descargarCSV } from "@/components/admin/formularios";
import { RestrictedView } from "@/components/admin/restricted";
import { canAccess, roleLabel, useRole, type AdminRole } from "@/components/admin/role";
import { AdminShell } from "@/components/admin/shell";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useActividad, useIntentos, useSesionesPanel } from "@/lib/admin/consultas";
import { fecha, haceCuanto } from "@/lib/admin/formato";
import { INACTIVIDAD_MS } from "@/lib/admin/sesion";
import type { EventoActividad } from "@/lib/admin/tipos";
import type { SesionPanel } from "@/lib/admin/tipos-empresa";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/auditoria")({
  head: () => ({
    meta: [
      { title: "Auditoría — Cloud Esther Administración" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AuditoriaPage,
});

type Vista = "resumen" | "sesiones" | "intentos" | "acciones";
type EstadoSesion = "Activa" | "Cerrada" | "Por inactividad" | "Vencida";

function estadoDe(s: SesionPanel): EstadoSesion {
  if (s.fin) return s.cierre === "Inactividad" ? "Por inactividad" : "Cerrada";
  return Date.now() - new Date(s.ultimaActividad).getTime() > INACTIVIDAD_MS ? "Vencida" : "Activa";
}
const TONO_ESTADO = {
  Activa: "ok",
  Cerrada: "neutro",
  "Por inactividad": "alerta",
  Vencida: "alerta",
} as const;

function duracion(s: SesionPanel) {
  const fin = s.fin ?? (estadoDe(s) === "Activa" ? new Date().toISOString() : s.ultimaActividad);
  const min = Math.max(
    0,
    Math.round((new Date(fin).getTime() - new Date(s.inicio).getTime()) / 60000),
  );
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${min % 60} min`;
}
const minutos = (s: SesionPanel) =>
  (new Date(s.fin ?? s.ultimaActividad).getTime() - new Date(s.inicio).getTime()) / 60000;

const rolTexto = (r: string) => roleLabel[r as AdminRole] ?? r;

const TIPOS: Record<EventoActividad["tipo"], { label: string; color: string }> = {
  acceso: { label: "Accesos", color: "bg-primary" },
  demo: { label: "Demos", color: "bg-primary-glow" },
  pago: { label: "Pagos", color: "bg-success" },
  plan: { label: "Planes", color: "bg-warning" },
  equipo: { label: "Equipo", color: "bg-primary-deep" },
  sistema: { label: "Empresa y sistema", color: "bg-muted-foreground" },
};

const SELECT =
  "h-9 rounded-xl border border-input bg-card px-3 text-xs font-semibold outline-none focus:border-primary/50";

function AuditoriaPage() {
  const { role } = useRole();
  const [vista, setVista] = useState<Vista>("resumen");
  const sesiones = useSesionesPanel();
  const intentos = useIntentos();
  const actividad = useActividad();
  if (!canAccess(role, "/admin/auditoria")) return <RestrictedView />;
  const cargando = sesiones.isLoading || intentos.isLoading || actividad.isLoading;
  return (
    <AdminShell
      title="Auditoría del panel"
      description="Quién entró al panel, cuándo, desde qué dispositivo y cuánto tiempo; los intentos de acceso fallidos y cada acción del equipo. Sirve para controlar la seguridad y revisar cambios."
    >
      <div className="rounded-2xl border border-primary/15 bg-primary/[0.04] px-4 py-3 text-xs leading-relaxed text-muted-foreground">
        <b className="text-foreground">Cómo se registra:</b> cada ingreso abre una sesión con
        dispositivo y navegador; se actualiza la última actividad mientras usás el panel y se cierra
        al salir o a los 30 minutos sin uso. La <b>dirección IP</b> y la ubicación las registra el
        servidor (pendiente de backend): el navegador no puede conocerlas de forma confiable.
      </div>
      <Pestanas
        valor={vista}
        onCambiar={setVista}
        opciones={[
          { id: "resumen", label: "Resumen" },
          { id: "sesiones", label: "Sesiones", cantidad: (sesiones.data ?? []).length },
          { id: "intentos", label: "Intentos fallidos", cantidad: (intentos.data ?? []).length },
          { id: "acciones", label: "Acciones del equipo" },
        ]}
      />
      {cargando ? (
        <Cargando />
      ) : vista === "resumen" ? (
        <Resumen
          sesiones={sesiones.data ?? []}
          intentos={intentos.data ?? []}
          actividad={actividad.data ?? []}
          ir={setVista}
        />
      ) : vista === "sesiones" ? (
        <Sesiones sesiones={sesiones.data ?? []} />
      ) : vista === "intentos" ? (
        <Intentos />
      ) : (
        <Acciones lista={actividad.data ?? []} />
      )}
    </AdminShell>
  );
}

/* ───────────── Resumen ───────────── */

function Resumen({
  sesiones,
  intentos,
  actividad,
  ir,
}: {
  sesiones: SesionPanel[];
  intentos: { fecha: string }[];
  actividad: EventoActividad[];
  ir: (v: Vista) => void;
}) {
  const hace7 = Date.now() - 7 * 86_400_000;
  const hoy = new Date().toDateString();
  const activas = sesiones.filter((s) => estadoDe(s) === "Activa");
  const cerradas = sesiones.filter((s) => s.fin);
  const promedio = cerradas.length
    ? cerradas.reduce((t, s) => t + minutos(s), 0) / cerradas.length
    : 0;
  const porUsuario = Object.entries(
    sesiones.reduce<Record<string, number>>(
      (acc, s) => ({ ...acc, [s.usuario]: (acc[s.usuario] ?? 0) + 1 }),
      {},
    ),
  ).sort((a, b) => b[1] - a[1]);
  const max = porUsuario[0]?.[1] ?? 1;

  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-5">
        <KpiCard
          accent
          label="Sesiones activas"
          value={String(activas.length)}
          hint="Ahora"
          icon={<Users className="h-4 w-4" />}
        />
        <KpiCard
          label="Ingresos hoy"
          value={String(sesiones.filter((s) => new Date(s.inicio).toDateString() === hoy).length)}
          icon={<LogIn className="h-4 w-4" />}
        />
        <KpiCard
          label="Duración promedio"
          value={promedio ? `${Math.round(promedio)} min` : "—"}
          hint="Sesiones cerradas"
          icon={<Clock className="h-4 w-4" />}
        />
        <KpiCard
          label="Intentos fallidos"
          value={String(intentos.filter((i) => new Date(i.fecha).getTime() > hace7).length)}
          hint="Últimos 7 días"
          icon={<ShieldAlert className="h-4 w-4" />}
          tono="destructive"
        />
        <KpiCard
          label="Acciones"
          value={String(actividad.filter((a) => new Date(a.fecha).getTime() > hace7).length)}
          hint="Últimos 7 días"
          icon={<Activity className="h-4 w-4" />}
        />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Seccion
          titulo="Ingresos por persona"
          descripcion="Cantidad de sesiones registradas."
          acciones={
            <Button size="sm" variant="outline" onClick={() => ir("sesiones")}>
              Ver sesiones
            </Button>
          }
        >
          {porUsuario.length === 0 ? (
            <Vacio titulo="Sin sesiones registradas" />
          ) : (
            <ul className="space-y-3">
              {porUsuario.map(([u, n]) => (
                <li key={u}>
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold">{u}</span>
                    <span className="tabular-nums text-muted-foreground">{n}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-primary/10">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${(n / max) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Seccion>
        <Seccion
          titulo="Actividad reciente"
          acciones={
            <Button size="sm" variant="outline" onClick={() => ir("acciones")}>
              Ver todo
            </Button>
          }
        >
          <LineaTiempo lista={actividad.slice(0, 6)} />
        </Seccion>
      </div>
    </>
  );
}

/* ───────────── Sesiones ───────────── */

function Sesiones({ sesiones }: { sesiones: SesionPanel[] }) {
  const [usuario, setUsuario] = useState("");
  const [estado, setEstado] = useState<EstadoSesion | "">("");
  const [desde, setDesde] = useState("");
  const [detalle, setDetalle] = useState<SesionPanel | null>(null);
  const usuarios = [...new Set(sesiones.map((s) => s.usuario))];
  const filas = sesiones
    .filter(
      (s) =>
        (!usuario || s.usuario === usuario) &&
        (!estado || estadoDe(s) === estado) &&
        (!desde || s.inicio.slice(0, 10) >= desde),
    )
    .sort((a, b) => b.inicio.localeCompare(a.inicio));
  return (
    <>
      <Seccion
        titulo="Sesiones del panel"
        descripcion="Tocá una fila para ver el detalle."
        sinPadding
        acciones={
          <>
            <select
              className={SELECT}
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              aria-label="Persona"
            >
              <option value="">Todas las personas</option>
              {usuarios.map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
            <select
              className={SELECT}
              value={estado}
              onChange={(e) => setEstado(e.target.value as EstadoSesion | "")}
              aria-label="Estado"
            >
              <option value="">Todos los estados</option>
              {(Object.keys(TONO_ESTADO) as EstadoSesion[]).map((e) => (
                <option key={e}>{e}</option>
              ))}
            </select>
            <input
              type="date"
              className={SELECT}
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              aria-label="Desde"
              title="Desde"
            />
            <Button
              size="sm"
              variant="outline"
              disabled={!filas.length}
              onClick={() =>
                descargarCSV("sesiones-panel", [
                  [
                    "Persona",
                    "Email",
                    "Rol",
                    "Entrada",
                    "Salida",
                    "Duración",
                    "Estado",
                    "Dispositivo",
                    "Navegador",
                  ],
                  ...filas.map((s) => [
                    s.usuario,
                    s.email,
                    rolTexto(s.rol),
                    s.inicio,
                    s.fin ?? "",
                    duracion(s),
                    estadoDe(s),
                    s.dispositivo,
                    s.navegador,
                  ]),
                ])
              }
            >
              <Download className="mr-1 h-4 w-4" /> CSV
            </Button>
          </>
        }
      >
        {filas.length === 0 ? (
          <div className="p-5">
            <Vacio titulo="No hay sesiones con este filtro" />
          </div>
        ) : (
          <Tabla
            columnas={["Persona", "Entrada", "Salida", "Duración", "Dispositivo", "Estado"]}
            minimo={860}
          >
            {filas.map((s) => {
              const e = estadoDe(s);
              return (
                <tr
                  key={s.id}
                  onClick={() => setDetalle(s)}
                  className="cursor-pointer border-t border-border/60 hover:bg-primary/[0.03]"
                >
                  <td className="py-3 pl-5 pr-3">
                    <p className="font-semibold">{s.usuario}</p>
                    <p className="text-xs text-muted-foreground">{rolTexto(s.rol)}</p>
                  </td>
                  <td className="px-3 py-3 text-xs">{fecha(s.inicio, true)}</td>
                  <td className="px-3 py-3 text-xs">
                    {s.fin ? fecha(s.fin, true) : e === "Activa" ? "En curso" : "—"}
                  </td>
                  <td className="px-3 py-3 text-xs tabular-nums">{duracion(s)}</td>
                  <td className="px-3 py-3 text-xs">
                    {s.dispositivo}
                    <span className="block text-muted-foreground">{s.navegador}</span>
                  </td>
                  <td className="py-3 pl-3 pr-5">
                    <Pildora tono={TONO_ESTADO[e]}>{e}</Pildora>
                  </td>
                </tr>
              );
            })}
          </Tabla>
        )}
      </Seccion>
      <Sheet open={!!detalle} onOpenChange={(v) => !v && setDetalle(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
          {detalle && (
            <div className="space-y-4">
              <SheetTitle className="flex items-center gap-2 text-lg">
                <MonitorSmartphone className="h-5 w-5 text-primary" /> Detalle de la sesión
              </SheetTitle>
              <dl className="grid grid-cols-[130px_1fr] gap-y-2.5 text-sm">
                {(
                  [
                    ["Persona", detalle.usuario],
                    ["Email", detalle.email],
                    ["Rol", rolTexto(detalle.rol)],
                    ["Entrada", fecha(detalle.inicio, true)],
                    [
                      "Última actividad",
                      `${fecha(detalle.ultimaActividad, true)} (${haceCuanto(detalle.ultimaActividad).toLowerCase()})`,
                    ],
                    ["Salida", detalle.fin ? fecha(detalle.fin, true) : "—"],
                    [
                      "Cierre",
                      detalle.cierre === "Inactividad"
                        ? "Automático por inactividad"
                        : detalle.cierre === "Manual"
                          ? "La persona cerró sesión"
                          : "Sesión abierta",
                    ],
                    ["Duración", duracion(detalle)],
                    ["Dispositivo", detalle.dispositivo],
                    ["Navegador", detalle.navegador],
                    [
                      "Dirección IP",
                      detalle.ip ?? "La registra el servidor (pendiente de backend)",
                    ],
                    [
                      "Secciones usadas",
                      detalle.secciones?.length
                        ? detalle.secciones
                            .map((p) => p.replace(/^\/admin\/?/, "") || "resumen")
                            .join(", ")
                        : "—",
                    ],
                  ] as const
                ).map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
              <Pildora tono={TONO_ESTADO[estadoDe(detalle)]}>{estadoDe(detalle)}</Pildora>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

/* ───────────── Intentos fallidos ───────────── */

function Intentos() {
  const { data } = useIntentos();
  const lista = [...(data ?? [])].sort((a, b) => b.fecha.localeCompare(a.fecha));
  const porEmail = lista.reduce<Record<string, number>>(
    (acc, i) => ({ ...acc, [i.email]: (acc[i.email] ?? 0) + 1 }),
    {},
  );
  return (
    <Seccion
      titulo="Intentos de acceso fallidos"
      descripcion="Contraseñas incorrectas, correos sin acceso o cuentas desactivadas. Varios intentos seguidos del mismo correo pueden indicar un intento de intrusión."
      sinPadding
    >
      {lista.length === 0 ? (
        <div className="p-5">
          <Vacio
            titulo="Sin intentos fallidos"
            texto="Bien: nadie intentó entrar con datos incorrectos."
          />
        </div>
      ) : (
        <Tabla
          columnas={["Fecha", "Correo usado", "Motivo", "Dispositivo", "Intentos de ese correo"]}
        >
          {lista.map((i) => (
            <tr key={i.id} className="border-t border-border/60">
              <td className="py-3 pl-5 pr-3 text-xs">{fecha(i.fecha, true)}</td>
              <td className="px-3 py-3 font-semibold">{i.email}</td>
              <td className="px-3 py-3">
                <Pildora tono={i.motivo === "Contraseña incorrecta" ? "alerta" : "peligro"}>
                  <KeyRound className="mr-1 h-3 w-3" />
                  {i.motivo}
                </Pildora>
              </td>
              <td className="px-3 py-3 text-xs">
                {i.dispositivo}
                <span className="block text-muted-foreground">{i.navegador}</span>
              </td>
              <td className="py-3 pl-3 pr-5 text-xs tabular-nums">
                <span className={cn((porEmail[i.email] ?? 0) >= 3 && "font-bold text-destructive")}>
                  {porEmail[i.email]}
                </span>
              </td>
            </tr>
          ))}
        </Tabla>
      )}
    </Seccion>
  );
}

/* ───────────── Acciones del equipo ───────────── */

function LineaTiempo({ lista }: { lista: EventoActividad[] }) {
  if (!lista.length) return <Vacio titulo="Sin eventos" />;
  return (
    <ol className="relative space-y-4 border-l-2 border-primary/15 pl-6">
      {lista.map((e) => (
        <li key={e.id} className="relative">
          <span
            className={cn(
              "absolute -left-[31px] top-1.5 h-3 w-3 rounded-full border-2 border-card",
              TIPOS[e.tipo].color,
            )}
          />
          <p className="text-sm font-medium">{e.accion}</p>
          <p className="text-xs text-muted-foreground">
            {e.actor} · {fecha(e.fecha, true)} · {TIPOS[e.tipo].label}
          </p>
        </li>
      ))}
    </ol>
  );
}

function Acciones({ lista }: { lista: EventoActividad[] }) {
  const [tipo, setTipo] = useState<EventoActividad["tipo"] | "">("");
  const [actor, setActor] = useState("");
  const [buscar, setBuscar] = useState("");
  const [pagina, setPagina] = useState(0);
  const actores = [...new Set(lista.map((e) => e.actor))];
  const filas = lista.filter(
    (e) =>
      (!tipo || e.tipo === tipo) &&
      (!actor || e.actor === actor) &&
      (!buscar || e.accion.toLowerCase().includes(buscar.toLowerCase())),
  );
  const POR_PAGINA = 20;
  const paginas = Math.max(1, Math.ceil(filas.length / POR_PAGINA));
  const visibles = filas.slice(pagina * POR_PAGINA, (pagina + 1) * POR_PAGINA);
  return (
    <Seccion
      titulo="Acciones del equipo"
      descripcion="Ingresos, cambios de planes, demos, pagos, equipo y módulos internos (personal, nómina, gastos, soporte)."
      acciones={
        <>
          <input
            className={cn(SELECT, "w-44")}
            placeholder="Buscar acción…"
            value={buscar}
            onChange={(e) => (setBuscar(e.target.value), setPagina(0))}
            aria-label="Buscar"
          />
          <select
            className={SELECT}
            value={tipo}
            onChange={(e) => (
              setTipo(e.target.value as EventoActividad["tipo"] | ""),
              setPagina(0)
            )}
            aria-label="Tipo"
          >
            <option value="">Todos los tipos</option>
            {(Object.keys(TIPOS) as EventoActividad["tipo"][]).map((t) => (
              <option key={t} value={t}>
                {TIPOS[t].label}
              </option>
            ))}
          </select>
          <select
            className={SELECT}
            value={actor}
            onChange={(e) => (setActor(e.target.value), setPagina(0))}
            aria-label="Persona"
          >
            <option value="">Todas las personas</option>
            {actores.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
          <Button
            size="sm"
            variant="outline"
            disabled={!filas.length}
            onClick={() =>
              descargarCSV("acciones-panel", [
                ["Fecha", "Persona", "Acción", "Tipo"],
                ...filas.map((e) => [e.fecha, e.actor, e.accion, TIPOS[e.tipo].label]),
              ])
            }
          >
            <Download className="mr-1 h-4 w-4" /> CSV
          </Button>
        </>
      }
    >
      <LineaTiempo lista={visibles} />
      {paginas > 1 && (
        <div className="mt-5 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {filas.length} eventos · página {pagina + 1} de {paginas}
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={pagina === 0}
              onClick={() => setPagina((p) => p - 1)}
            >
              Anterior
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={pagina >= paginas - 1}
              onClick={() => setPagina((p) => p + 1)}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </Seccion>
  );
}
