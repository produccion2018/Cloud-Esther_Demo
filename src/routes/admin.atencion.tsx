import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  Building2,
  CalendarClock,
  Headset,
  Inbox,
  Info,
  LifeBuoy,
  MessageSquare,
  PhoneCall,
  Plus,
  Send,
  StickyNote,
} from "lucide-react";
import { useState } from "react";

import { Cargando, KpiCard, Seccion, StatusBadge, Vacio } from "@/components/admin/bits";
import {
  Campo,
  DialogoFormulario,
  INPUT,
  Pestanas,
  Pildora,
  Tabla,
} from "@/components/admin/formularios";
import { permisos, useRole } from "@/components/admin/role";
import { AdminShell } from "@/components/admin/shell";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { guardarEn } from "@/lib/admin/api";
import { useAccion, useClinicas, useColeccion, useEquipo } from "@/lib/admin/consultas";
import { fecha, haceCuanto } from "@/lib/admin/formato";
import { useSesionAdmin } from "@/lib/admin/sesion";
import type { PlanId } from "@/lib/admin/tipos";
import type {
  CasoAtencion,
  EstadoAtencion,
  TicketSoporte,
  TipoAtencion,
} from "@/lib/admin/tipos-empresa";
import { cn } from "@/lib/utils";

/* Ubicación: src/routes/admin.atencion.tsx
   Atención a clínicas: la secretaría / mesa de atención de CLOUD ESTHER. Nuestro equipo registra
   acá las consultas, llamadas, mensajes internos, solicitudes administrativas, incidencias y
   seguimientos de cada clínica cliente, con su estado e historial.
   No es la secretaría de una clínica: esa trabaja en el Portal administrativo de cada clínica,
   con sus propios pacientes y aislada por empresa. Por eso vive en el panel del dueño. */

export const Route = createFileRoute("/admin/atencion")({
  head: () => ({
    meta: [
      { title: "Atención a clínicas — Cloud Esther Administración" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AtencionPage,
});

const TIPOS: TipoAtencion[] = [
  "Consulta",
  "Llamada",
  "Mensaje interno",
  "Solicitud administrativa",
  "Seguimiento",
  "Incidencia",
];
const ESTADOS: EstadoAtencion[] = ["Nuevo", "En curso", "Esperando a la clínica", "Resuelto"];
const CANALES: CasoAtencion["canal"][] = ["Teléfono", "WhatsApp", "Email", "Chat", "Reunión"];
const ESTADO_TONO: Record<EstadoAtencion, "primario" | "alerta" | "ok" | "neutro"> = {
  Nuevo: "primario",
  "En curso": "alerta",
  "Esperando a la clínica": "neutro",
  Resuelto: "ok",
};
const PRIORIDAD_TONO = { Alta: "peligro", Media: "alerta", Baja: "neutro" } as const;
const PLAN: Record<PlanId, string> = {
  inicial: "Start",
  profesional: "Pro",
  avanzada: "Plus",
  grupo: "Enterprise",
};
const SELECT =
  "h-9 rounded-xl border border-input bg-card px-3 text-xs font-semibold outline-none focus:border-primary/50 disabled:opacity-60";

const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const abierto = (c: CasoAtencion) => c.estado !== "Resuelto";

type Vista = "bandeja" | "clinica" | "seguimientos";

function useAutor() {
  return useSesionAdmin()?.usuario.nombre ?? "Equipo";
}

function useGuardarCaso(mensaje = "Caso actualizado") {
  return useAccion(
    (c: CasoAtencion) => guardarEn("atencionClinicas", c),
    ["atencionClinicas"],
    mensaje,
  );
}

function AtencionPage() {
  const { role } = useRole();
  const editable = permisos.gestionarAtencion(role);
  const { data: casos, isLoading } = useColeccion("atencionClinicas");
  const [vista, setVista] = useState<Vista>("bandeja");
  const [abiertoId, setAbiertoId] = useState<string | null>(null);
  const [nuevo, setNuevo] = useState<TipoAtencion | null>(null);
  const [clinica, setClinica] = useState<string>("");
  const lista = casos ?? [];
  const hoy = hoyISO();
  const seleccionado = lista.find((c) => c.id === abiertoId) ?? null;

  return (
    <AdminShell
      title="Atención a clínicas"
      description="La secretaría de Cloud Esther: consultas, llamadas, mensajes internos, solicitudes, incidencias y seguimiento de cada clínica cliente."
      actions={
        editable ? (
          <>
            <Button size="sm" variant="outline" onClick={() => setNuevo("Llamada")}>
              <PhoneCall className="mr-1 h-4 w-4" /> Registrar llamada
            </Button>
            <Button size="sm" onClick={() => setNuevo("Consulta")}>
              <Plus className="mr-1 h-4 w-4" /> Nuevo caso
            </Button>
          </>
        ) : undefined
      }
    >
      <div className="flex items-start gap-3 rounded-2xl border border-primary/15 bg-primary/[0.04] p-4 text-sm">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p className="text-muted-foreground">
          <b className="text-foreground">Equipo de Cloud Esther, no de una clínica.</b> Acá
          atendemos a nuestras clínicas clientes. La secretaría de cada clínica trabaja en su propio{" "}
          <b className="text-foreground">Portal administrativo</b>, con sus pacientes y datos
          separados. Los problemas técnicos se derivan a{" "}
          <Link to="/admin/soporte" className="font-semibold text-primary underline">
            Soporte técnico
          </Link>
          .
        </p>
      </div>

      {isLoading ? (
        <Cargando />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
            <KpiCard
              accent
              label="Casos abiertos"
              value={String(lista.filter(abierto).length)}
              hint="Sin resolver"
              icon={<Inbox className="h-4 w-4" />}
            />
            <KpiCard
              label="Sin responsable"
              value={String(lista.filter((c) => abierto(c) && !c.responsable).length)}
              hint="Asignalos"
              icon={<Headset className="h-4 w-4" />}
              tono="warning"
            />
            <KpiCard
              label="Seguimientos vencidos"
              value={String(
                lista.filter(
                  (c) => abierto(c) && c.proximoSeguimiento && c.proximoSeguimiento < hoy,
                ).length,
              )}
              hint="Contactar hoy"
              icon={<CalendarClock className="h-4 w-4" />}
              tono="destructive"
            />
            <KpiCard
              label="Incidencias abiertas"
              value={String(lista.filter((c) => abierto(c) && c.tipo === "Incidencia").length)}
              hint="Con o sin ticket técnico"
              icon={<AlertTriangle className="h-4 w-4" />}
            />
          </div>

          <Pestanas
            valor={vista}
            onCambiar={setVista}
            opciones={[
              { id: "bandeja", label: "Bandeja", cantidad: lista.filter(abierto).length },
              { id: "clinica", label: "Por clínica" },
              {
                id: "seguimientos",
                label: "Seguimientos",
                cantidad: lista.filter((c) => abierto(c) && c.proximoSeguimiento).length,
              },
            ]}
          />

          {vista === "bandeja" ? (
            <Bandeja lista={lista} onAbrir={setAbiertoId} />
          ) : vista === "clinica" ? (
            <PorClinica
              lista={lista}
              clinica={clinica}
              onClinica={setClinica}
              onAbrir={setAbiertoId}
            />
          ) : (
            <Seguimientos lista={lista} onAbrir={setAbiertoId} />
          )}
        </>
      )}

      <Sheet open={!!seleccionado} onOpenChange={(v) => !v && setAbiertoId(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-xl">
          {seleccionado && (
            <DetalleCaso key={seleccionado.id} caso={seleccionado} editable={editable} />
          )}
        </SheetContent>
      </Sheet>
      <NuevoCaso
        tipo={nuevo}
        clinicaInicial={clinica}
        onCerrar={() => setNuevo(null)}
        siguiente={lista.length}
      />
    </AdminShell>
  );
}

function FilaCaso({ c, onAbrir }: { c: CasoAtencion; onAbrir: (id: string) => void }) {
  const vencido = abierto(c) && c.proximoSeguimiento && c.proximoSeguimiento < hoyISO();
  return (
    <tr
      onClick={() => onAbrir(c.id)}
      className="cursor-pointer border-t border-border/60 hover:bg-primary/[0.03]"
    >
      <td className="py-3 pl-5 pr-3">
        <p className="font-semibold">{c.asunto}</p>
        <p className="text-xs text-muted-foreground">
          {c.id} · {c.clinica} · {haceCuanto(c.creado)}
        </p>
      </td>
      <td className="px-3 py-3 text-xs">
        {c.tipo}
        <span className="block text-muted-foreground">{c.canal}</span>
      </td>
      <td className="px-3 py-3">
        <Pildora tono={PRIORIDAD_TONO[c.prioridad]}>{c.prioridad}</Pildora>
      </td>
      <td className="px-3 py-3 text-xs">
        {c.responsable ?? <span className="text-muted-foreground">Sin asignar</span>}
      </td>
      <td className={cn("px-3 py-3 text-xs", vencido && "font-semibold text-destructive")}>
        {c.proximoSeguimiento ? fecha(c.proximoSeguimiento) : "—"}
      </td>
      <td className="py-3 pl-3 pr-5">
        <Pildora tono={ESTADO_TONO[c.estado]}>{c.estado}</Pildora>
      </td>
    </tr>
  );
}

const COLUMNAS = ["Caso", "Tipo", "Prioridad", "Responsable", "Seguimiento", "Estado"];

function Bandeja({ lista, onAbrir }: { lista: CasoAtencion[]; onAbrir: (id: string) => void }) {
  const [estado, setEstado] = useState<"abiertos" | "todos" | EstadoAtencion>("abiertos");
  const [tipo, setTipo] = useState<"todos" | TipoAtencion>("todos");
  const filas = lista
    .filter((c) =>
      estado === "todos" ? true : estado === "abiertos" ? abierto(c) : c.estado === estado,
    )
    .filter((c) => tipo === "todos" || c.tipo === tipo)
    .sort((a, b) => b.creado.localeCompare(a.creado));
  return (
    <Seccion
      titulo="Bandeja de atención"
      descripcion="Tocá un caso para conversar, dejar notas internas, cambiar el estado o derivarlo."
      acciones={
        <>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as typeof tipo)}
            className={SELECT}
            aria-label="Tipo"
          >
            <option value="todos">Todos los tipos</option>
            {TIPOS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <select
            value={estado}
            onChange={(e) => setEstado(e.target.value as typeof estado)}
            className={SELECT}
            aria-label="Estado"
          >
            <option value="abiertos">Abiertos</option>
            <option value="todos">Todos</option>
            {ESTADOS.map((e) => (
              <option key={e}>{e}</option>
            ))}
          </select>
        </>
      }
      sinPadding
    >
      {filas.length === 0 ? (
        <div className="p-5">
          <Vacio titulo="No hay casos con este filtro" />
        </div>
      ) : (
        <Tabla columnas={COLUMNAS}>
          {filas.map((c) => (
            <FilaCaso key={c.id} c={c} onAbrir={onAbrir} />
          ))}
        </Tabla>
      )}
    </Seccion>
  );
}

function PorClinica({
  lista,
  clinica,
  onClinica,
  onAbrir,
}: {
  lista: CasoAtencion[];
  clinica: string;
  onClinica: (c: string) => void;
  onAbrir: (id: string) => void;
}) {
  const { data: clinicas } = useClinicas();
  const { data: tickets } = useColeccion("ticketsSoporte");
  const todas = clinicas ?? [];
  const actual = todas.find((c) => c.nombre === clinica) ?? todas[0] ?? null;
  if (!actual) return <Cargando />;
  const casos = lista
    .filter((c) => c.clinica === actual.nombre)
    .sort((a, b) => b.creado.localeCompare(a.creado));
  const susTickets = (tickets ?? []).filter((t) => t.clinica === actual.nombre);
  const linea = [
    ...casos.flatMap((c) =>
      c.historial.map((h) => ({ ...h, ref: `${c.id} · ${c.asunto}`, id: c.id })),
    ),
    ...susTickets.map((t) => ({
      fecha: t.abierto,
      autor: "Soporte técnico",
      cambio: `Ticket ${t.estado.toLowerCase()}`,
      ref: `${t.id} · ${t.asunto}`,
      id: null as string | null,
    })),
  ].sort((a, b) => b.fecha.localeCompare(a.fecha));

  return (
    <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
      <Seccion
        titulo="Estado de la clínica"
        acciones={
          <select
            value={actual.nombre}
            onChange={(e) => onClinica(e.target.value)}
            className={cn(SELECT, "max-w-[220px]")}
            aria-label="Clínica"
          >
            {todas.map((c) => (
              <option key={c.id}>{c.nombre}</option>
            ))}
          </select>
        }
      >
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Building2 className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-bold">{actual.nombre}</p>
            <p className="text-xs text-muted-foreground">
              {actual.ciudad}, {actual.pais} · Plan {PLAN[actual.plan]}
            </p>
          </div>
        </div>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">Pago</dt>
            <dd>
              <StatusBadge status={actual.estadoPago} />
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Contacto</dt>
            <dd className="text-right font-semibold">
              {actual.contacto.nombre}
              <span className="block text-xs font-normal text-muted-foreground">
                {actual.contacto.telefono} · {actual.contacto.email}
              </span>
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Último acceso</dt>
            <dd className="font-semibold">{haceCuanto(actual.ultimoAcceso)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Cliente desde</dt>
            <dd className="font-semibold">{fecha(actual.clienteDesde)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Casos abiertos</dt>
            <dd className="font-semibold">{casos.filter(abierto).length}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Tickets técnicos</dt>
            <dd className="font-semibold">{susTickets.length}</dd>
          </div>
        </dl>
      </Seccion>

      <div className="space-y-4">
        <Seccion titulo="Casos de esta clínica" sinPadding>
          {casos.length === 0 ? (
            <div className="p-5">
              <Vacio titulo="Sin casos registrados" texto="Registrá una llamada o un caso nuevo." />
            </div>
          ) : (
            <Tabla columnas={COLUMNAS}>
              {casos.map((c) => (
                <FilaCaso key={c.id} c={c} onAbrir={onAbrir} />
              ))}
            </Tabla>
          )}
        </Seccion>
        <Seccion
          titulo="Historial"
          descripcion="Todo lo que pasó con la clínica, de lo último a lo primero."
        >
          {linea.length === 0 ? (
            <Vacio titulo="Todavía no hay historial" />
          ) : (
            <ol className="space-y-3 border-l-2 border-primary/15 pl-4">
              {linea.slice(0, 20).map((h, i) => (
                <li key={i} className="relative">
                  <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
                  <button
                    type="button"
                    disabled={!h.id}
                    onClick={() => h.id && onAbrir(h.id)}
                    className="text-left disabled:cursor-default"
                  >
                    <p className="text-sm font-semibold">{h.cambio}</p>
                    <p className="text-xs text-muted-foreground">
                      {h.ref} · {h.autor} · {fecha(h.fecha, true)}
                    </p>
                  </button>
                </li>
              ))}
            </ol>
          )}
        </Seccion>
      </div>
    </div>
  );
}

function Seguimientos({
  lista,
  onAbrir,
}: {
  lista: CasoAtencion[];
  onAbrir: (id: string) => void;
}) {
  const hoy = hoyISO();
  const pendientes = lista
    .filter((c) => abierto(c) && c.proximoSeguimiento)
    .sort((a, b) => (a.proximoSeguimiento ?? "").localeCompare(b.proximoSeguimiento ?? ""));
  const grupos: { titulo: string; tono: string; casos: CasoAtencion[] }[] = [
    {
      titulo: "Vencidos",
      tono: "text-destructive",
      casos: pendientes.filter((c) => (c.proximoSeguimiento ?? "") < hoy),
    },
    {
      titulo: "Hoy",
      tono: "text-primary",
      casos: pendientes.filter((c) => c.proximoSeguimiento === hoy),
    },
    {
      titulo: "Próximos",
      tono: "text-muted-foreground",
      casos: pendientes.filter((c) => (c.proximoSeguimiento ?? "") > hoy),
    },
  ];
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {grupos.map((g) => (
        <Seccion key={g.titulo} titulo={`${g.titulo} (${g.casos.length})`}>
          {g.casos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nada por acá.</p>
          ) : (
            <ul className="space-y-2">
              {g.casos.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => onAbrir(c.id)}
                    className="w-full rounded-2xl border border-border/70 bg-card p-3 text-left transition hover:border-primary/30 hover:shadow-sm"
                  >
                    <p className="text-sm font-semibold">{c.asunto}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.clinica} · {c.contacto}
                    </p>
                    <p className={cn("mt-1 text-xs font-semibold", g.tono)}>
                      {fecha(c.proximoSeguimiento)} · {c.responsable ?? "Sin responsable"}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Seccion>
      ))}
    </div>
  );
}

function DetalleCaso({ caso, editable }: { caso: CasoAtencion; editable: boolean }) {
  const autor = useAutor();
  const { data: equipo } = useEquipo();
  const { data: tickets } = useColeccion("ticketsSoporte");
  const [texto, setTexto] = useState("");
  const [interno, setInterno] = useState(false);
  const guardar = useGuardarCaso();
  const crearTicket = useAccion(
    (t: TicketSoporte) => guardarEn("ticketsSoporte", t),
    ["ticketsSoporte"],
    "Derivado a Soporte técnico",
  );
  const ahora = () => new Date().toISOString();
  const cambiar = (cambios: Partial<CasoAtencion>, cambio: string) =>
    guardar.mutate({
      ...caso,
      ...cambios,
      historial: [...caso.historial, { fecha: ahora(), autor, cambio }],
    });

  const enviar = () => {
    if (!texto.trim()) return;
    guardar.mutate({
      ...caso,
      estado: caso.estado === "Nuevo" ? "En curso" : caso.estado,
      mensajes: [...caso.mensajes, { fecha: ahora(), autor, texto: texto.trim(), interno }],
      historial: [
        ...caso.historial,
        { fecha: ahora(), autor, cambio: interno ? "Nota interna" : "Respuesta a la clínica" },
      ],
    });
    setTexto("");
  };

  const derivar = () => {
    const id = `T-${1043 + (tickets ?? []).length}`;
    crearTicket.mutate({
      id,
      asunto: caso.asunto,
      descripcion: `${caso.detalle}\n\nDerivado desde Atención a clínicas (${caso.id}).`,
      clinica: caso.clinica,
      categoria: caso.tipo === "Incidencia" ? "Error del sistema" : "Consulta",
      prioridad: caso.prioridad,
      estado: "Nuevo",
      responsable: null,
      abierto: ahora(),
      resuelto: null,
      notasInternas: [],
      historial: [{ fecha: ahora(), autor, cambio: `Creado desde ${caso.id}` }],
    });
    cambiar({ ticket: id, estado: "En curso" }, `Derivado a Soporte técnico (${id})`);
  };

  return (
    <div>
      <div
        className="px-6 pb-5 pt-6 text-primary-foreground"
        style={{ background: "var(--gradient-primary)" }}
      >
        <SheetTitle className="text-xl font-extrabold text-primary-foreground">
          {caso.asunto}
        </SheetTitle>
        <p className="text-sm opacity-90">
          {caso.id} · {caso.clinica} · {caso.tipo} por {caso.canal.toLowerCase()} ·{" "}
          {fecha(caso.creado, true)}
        </p>
      </div>
      <div className="space-y-5 p-6">
        <p className="rounded-2xl bg-muted/60 p-3 text-sm">
          {caso.detalle || "Sin detalle."}
          <span className="mt-1 block text-xs text-muted-foreground">
            Contacto en la clínica: {caso.contacto}
          </span>
        </p>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <Campo label="Estado">
            <select
              disabled={!editable}
              value={caso.estado}
              className={cn(SELECT, "w-full")}
              onChange={(e) =>
                cambiar({ estado: e.target.value as EstadoAtencion }, `Estado: ${e.target.value}`)
              }
            >
              {ESTADOS.map((e) => (
                <option key={e}>{e}</option>
              ))}
            </select>
          </Campo>
          <Campo label="Responsable">
            <select
              disabled={!editable}
              value={caso.responsable ?? ""}
              className={cn(SELECT, "w-full")}
              onChange={(e) =>
                cambiar(
                  { responsable: e.target.value || null },
                  `Responsable: ${e.target.value || "sin asignar"}`,
                )
              }
            >
              <option value="">Sin asignar</option>
              {caso.responsable && !(equipo ?? []).some((a) => a.nombre === caso.responsable) && (
                <option>{caso.responsable}</option>
              )}
              {(equipo ?? [])
                .filter((a) => a.activo)
                .map((a) => (
                  <option key={a.id}>{a.nombre}</option>
                ))}
            </select>
          </Campo>
          <Campo label="Prioridad">
            <select
              disabled={!editable}
              value={caso.prioridad}
              className={cn(SELECT, "w-full")}
              onChange={(e) =>
                cambiar(
                  { prioridad: e.target.value as CasoAtencion["prioridad"] },
                  `Prioridad: ${e.target.value}`,
                )
              }
            >
              {(["Alta", "Media", "Baja"] as const).map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </Campo>
          <Campo label="Próximo seguimiento">
            <input
              type="date"
              disabled={!editable}
              value={caso.proximoSeguimiento ?? ""}
              className={cn(SELECT, "w-full")}
              onChange={(e) =>
                cambiar(
                  { proximoSeguimiento: e.target.value || null },
                  e.target.value ? `Seguimiento: ${fecha(e.target.value)}` : "Seguimiento quitado",
                )
              }
            />
          </Campo>
        </div>

        {caso.ticket ? (
          <Link
            to="/admin/soporte"
            className="flex items-center gap-2 rounded-2xl border border-primary/15 bg-primary/[0.04] px-3 py-2 text-sm font-semibold text-primary"
          >
            <LifeBuoy className="h-4 w-4" /> Ticket técnico {caso.ticket} en Soporte técnico
          </Link>
        ) : (
          editable && (
            <Button variant="outline" size="sm" onClick={derivar}>
              <LifeBuoy className="mr-1 h-4 w-4" /> Derivar a Soporte técnico
            </Button>
          )
        )}

        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Conversación y notas
          </p>
          {caso.mensajes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todavía no hay mensajes.</p>
          ) : (
            <ul className="space-y-2">
              {caso.mensajes.map((m, i) => (
                <li
                  key={i}
                  className={cn(
                    "rounded-2xl border p-3 text-sm",
                    m.interno ? "border-warning/40 bg-warning/10" : "border-border/70 bg-card",
                  )}
                >
                  <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    {m.interno ? (
                      <StickyNote className="h-3.5 w-3.5" />
                    ) : (
                      <MessageSquare className="h-3.5 w-3.5" />
                    )}
                    {m.autor} · {m.interno ? "nota interna" : "mensaje"} · {fecha(m.fecha, true)}
                  </p>
                  {m.texto}
                </li>
              ))}
            </ul>
          )}
          {editable && (
            <div className="mt-3 space-y-2">
              <Textarea
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder={
                  interno ? "Nota interna para el equipo de Cloud Esther" : "Respuesta a la clínica"
                }
                rows={3}
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-xs font-semibold">
                  <input
                    type="checkbox"
                    checked={interno}
                    onChange={(e) => setInterno(e.target.checked)}
                  />
                  Nota interna (la clínica no la ve)
                </label>
                <Button size="sm" onClick={enviar} disabled={!texto.trim()}>
                  <Send className="mr-1 h-4 w-4" /> {interno ? "Guardar nota" : "Enviar"}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Envío real a la clínica (email / WhatsApp): pendiente de integración.
              </p>
            </div>
          )}
        </div>

        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Historial
          </p>
          <ol className="space-y-1.5 text-xs">
            {[...caso.historial].reverse().map((h, i) => (
              <li key={i} className="flex justify-between gap-3">
                <span className="font-semibold">{h.cambio}</span>
                <span className="shrink-0 text-muted-foreground">
                  {h.autor} · {fecha(h.fecha, true)}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

function NuevoCaso({
  tipo,
  clinicaInicial,
  onCerrar,
  siguiente,
}: {
  tipo: TipoAtencion | null;
  clinicaInicial: string;
  onCerrar: () => void;
  siguiente: number;
}) {
  return tipo ? (
    <FormNuevoCaso
      key={tipo}
      tipo={tipo}
      clinicaInicial={clinicaInicial}
      onCerrar={onCerrar}
      siguiente={siguiente}
    />
  ) : null;
}

function FormNuevoCaso({
  tipo: tipoInicial,
  clinicaInicial,
  onCerrar,
  siguiente,
}: {
  tipo: TipoAtencion;
  clinicaInicial: string;
  onCerrar: () => void;
  siguiente: number;
}) {
  const autor = useAutor();
  const { data: clinicas } = useClinicas();
  const guardar = useGuardarCaso(tipoInicial === "Llamada" ? "Llamada registrada" : "Caso creado");
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState({
    clinica: clinicaInicial || clinicas?.[0]?.nombre || "",
    tipo: tipoInicial,
    canal: (tipoInicial === "Llamada" ? "Teléfono" : "WhatsApp") as CasoAtencion["canal"],
    asunto: "",
    detalle: "",
    contacto: "",
    prioridad: "Media" as CasoAtencion["prioridad"],
    proximoSeguimiento: "",
    resuelto: false,
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));

  const guardarCaso = () => {
    if (!f.clinica || !f.asunto.trim()) {
      setError("Elegí la clínica y escribí el asunto.");
      return;
    }
    const ahora = new Date().toISOString();
    guardar.mutate(
      {
        id: `AT-${2032 + siguiente}`,
        clinica: f.clinica,
        tipo: f.tipo,
        canal: f.canal,
        asunto: f.asunto.trim(),
        detalle: f.detalle.trim(),
        contacto: f.contacto.trim() || "—",
        prioridad: f.prioridad,
        estado: f.resuelto ? "Resuelto" : "Nuevo",
        responsable: autor,
        creado: ahora,
        proximoSeguimiento: f.proximoSeguimiento || null,
        ticket: null,
        mensajes: [],
        historial: [
          {
            fecha: ahora,
            autor,
            cambio: f.tipo === "Llamada" ? "Llamada registrada" : "Caso creado",
          },
        ],
      },
      { onSuccess: onCerrar },
    );
  };

  return (
    <DialogoFormulario
      abierto
      titulo={tipoInicial === "Llamada" ? "Registrar llamada" : "Nuevo caso de atención"}
      descripcion="Queda en la bandeja y en el historial de la clínica."
      onCerrar={onCerrar}
      onGuardar={guardarCaso}
      guardando={guardar.isPending}
      error={error}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo label="Clínica" className="sm:col-span-2">
          <select
            value={f.clinica}
            onChange={(e) => set("clinica", e.target.value)}
            className={INPUT}
          >
            {(clinicas ?? []).map((c) => (
              <option key={c.id}>{c.nombre}</option>
            ))}
          </select>
        </Campo>
        <Campo label="Tipo">
          <select
            value={f.tipo}
            onChange={(e) => set("tipo", e.target.value as TipoAtencion)}
            className={INPUT}
          >
            {TIPOS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Campo>
        <Campo label="Canal">
          <select
            value={f.canal}
            onChange={(e) => set("canal", e.target.value as CasoAtencion["canal"])}
            className={INPUT}
          >
            {CANALES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Campo>
        <Campo label="Asunto" className="sm:col-span-2">
          <input
            value={f.asunto}
            onChange={(e) => set("asunto", e.target.value)}
            className={INPUT}
            placeholder="Ej.: Consulta por cambio de plan"
          />
        </Campo>
        <Campo label="Detalle" className="sm:col-span-2">
          <Textarea value={f.detalle} onChange={(e) => set("detalle", e.target.value)} rows={3} />
        </Campo>
        <Campo label="Contacto en la clínica">
          <input
            value={f.contacto}
            onChange={(e) => set("contacto", e.target.value)}
            className={INPUT}
          />
        </Campo>
        <Campo label="Prioridad">
          <select
            value={f.prioridad}
            onChange={(e) => set("prioridad", e.target.value as CasoAtencion["prioridad"])}
            className={INPUT}
          >
            {(["Alta", "Media", "Baja"] as const).map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </Campo>
        <Campo label="Próximo seguimiento">
          <input
            type="date"
            value={f.proximoSeguimiento}
            onChange={(e) => set("proximoSeguimiento", e.target.value)}
            className={INPUT}
          />
        </Campo>
        <label className="flex items-center gap-2 self-end pb-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={f.resuelto}
            onChange={(e) => set("resuelto", e.target.checked)}
          />
          Ya quedó resuelto
        </label>
      </div>
    </DialogoFormulario>
  );
}
