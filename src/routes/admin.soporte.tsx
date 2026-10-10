import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, Inbox, LifeBuoy, Plus, Timer } from "lucide-react";
import { useState } from "react";

import { Cargando, KpiCard, Seccion, Vacio } from "@/components/admin/bits";
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
import { guardarEn, nuevoIdLocal } from "@/lib/admin/api";
import { useAccion, useColeccion, useEquipo } from "@/lib/admin/consultas";
import { fecha, haceCuanto } from "@/lib/admin/formato";
import { useSesionAdmin } from "@/lib/admin/sesion";
import type {
  EstadoTicket,
  Incidente,
  TareaInterna,
  TicketSoporte,
} from "@/lib/admin/tipos-empresa";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/soporte")({
  head: () => ({
    meta: [
      { title: "Soporte técnico — Cloud Esther Administración" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: SupportPage,
});

const ESTADOS: EstadoTicket[] = [
  "Nuevo",
  "En revisión",
  "En progreso",
  "En espera",
  "Resuelto",
  "Cerrado",
];
const ABIERTOS: EstadoTicket[] = ["Nuevo", "En revisión", "En progreso", "En espera"];
const CATEGORIAS: TicketSoporte["categoria"][] = [
  "Acceso",
  "Facturación",
  "Error del sistema",
  "Consulta",
  "Mejora",
  "Integraciones",
];
const PRIORIDAD_TONO = { Alta: "peligro", Media: "alerta", Baja: "neutro" } as const;
const ESTADO_TONO: Record<EstadoTicket, "primario" | "alerta" | "ok" | "neutro"> = {
  Nuevo: "primario",
  "En revisión": "alerta",
  "En progreso": "alerta",
  "En espera": "neutro",
  Resuelto: "ok",
  Cerrado: "neutro",
};
const SELECT =
  "h-8 rounded-lg border border-input bg-card px-2 text-xs font-semibold outline-none focus:border-primary/50 disabled:opacity-60";

type Vista = "tickets" | "incidentes" | "tareas";

function SupportPage() {
  const { data: tickets } = useColeccion("ticketsSoporte");
  const { data: incidentes } = useColeccion("incidentes");
  const { data: tareas } = useColeccion("tareas");
  const [vista, setVista] = useState<Vista>("tickets");
  return (
    <AdminShell
      title="Soporte técnico"
      description="Problemas y consultas de las clínicas, incidentes de la plataforma y tareas internas del equipo. Asigná responsables y seguí cada caso hasta cerrarlo."
    >
      <Pestanas
        valor={vista}
        onCambiar={setVista}
        opciones={[
          {
            id: "tickets",
            label: "Tickets",
            cantidad: (tickets ?? []).filter((t) => ABIERTOS.includes(t.estado)).length,
          },
          {
            id: "incidentes",
            label: "Incidentes",
            cantidad: (incidentes ?? []).filter((i) => i.estado !== "Resuelto").length,
          },
          {
            id: "tareas",
            label: "Tareas internas",
            cantidad: (tareas ?? []).filter((t) => t.estado !== "Hecha").length,
          },
        ]}
      />
      {vista === "tickets" ? <Tickets /> : vista === "incidentes" ? <Incidentes /> : <Tareas />}
    </AdminShell>
  );
}

function useAutor() {
  return useSesionAdmin()?.usuario.nombre ?? "Equipo";
}

function Tickets() {
  const { role } = useRole();
  const editable = permisos.gestionarTickets(role);
  const { data: tickets, isLoading } = useColeccion("ticketsSoporte");
  const [filtro, setFiltro] = useState<"abiertos" | EstadoTicket | "todos">("abiertos");
  const [abierto, setAbierto] = useState<string | null>(null);
  const [nuevo, setNuevo] = useState(false);
  if (isLoading) return <Cargando />;
  const lista = tickets ?? [];
  const resueltos = lista.filter((t) => t.resuelto);
  const promedioH = resueltos.length
    ? resueltos.reduce(
        (s, t) => s + (new Date(t.resuelto ?? t.abierto).getTime() - new Date(t.abierto).getTime()),
        0,
      ) /
      resueltos.length /
      3_600_000
    : 0;
  const filas = lista
    .filter((t) =>
      filtro === "todos"
        ? true
        : filtro === "abiertos"
          ? ABIERTOS.includes(t.estado)
          : t.estado === filtro,
    )
    .sort((a, b) => b.abierto.localeCompare(a.abierto));
  const seleccionado = lista.find((t) => t.id === abierto) ?? null;

  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-5">
        <KpiCard
          accent
          label="Abiertos"
          value={String(lista.filter((t) => ABIERTOS.includes(t.estado)).length)}
          hint="Sin resolver"
          icon={<Inbox className="h-4 w-4" />}
        />
        <KpiCard
          label="Sin responsable"
          value={String(lista.filter((t) => ABIERTOS.includes(t.estado) && !t.responsable).length)}
          hint="Asignalos"
          icon={<LifeBuoy className="h-4 w-4" />}
          tono="warning"
        />
        <KpiCard
          label="Prioridad alta"
          value={String(
            lista.filter((t) => ABIERTOS.includes(t.estado) && t.prioridad === "Alta").length,
          )}
          hint="Abiertos"
          icon={<AlertTriangle className="h-4 w-4" />}
          tono="destructive"
        />
        <KpiCard
          label="Resueltos"
          value={String(resueltos.length)}
          hint="Resueltos o cerrados"
          icon={<CheckCircle2 className="h-4 w-4" />}
          tono="success"
        />
        <KpiCard
          label="Tiempo de resolución"
          value={promedioH ? `${promedioH.toFixed(1)} h` : "—"}
          hint="Promedio"
          icon={<Timer className="h-4 w-4" />}
        />
      </div>

      <Seccion
        titulo="Bandeja de tickets"
        descripcion="Tocá un ticket para ver el detalle, cambiar el estado y agregar notas internas."
        acciones={
          <>
            <select
              value={filtro}
              onChange={(e) => setFiltro(e.target.value as typeof filtro)}
              className="h-9 rounded-xl border border-input bg-card px-3 text-xs font-semibold"
              aria-label="Estado"
            >
              <option value="abiertos">Abiertos</option>
              <option value="todos">Todos</option>
              {ESTADOS.map((e) => (
                <option key={e}>{e}</option>
              ))}
            </select>
            {editable && (
              <Button size="sm" onClick={() => setNuevo(true)}>
                <Plus className="mr-1 h-4 w-4" /> Nuevo ticket
              </Button>
            )}
          </>
        }
        sinPadding
      >
        {filas.length === 0 ? (
          <div className="p-5">
            <Vacio titulo="No hay tickets en este estado" />
          </div>
        ) : (
          <Tabla columnas={["Ticket", "Categoría", "Prioridad", "Responsable", "Estado"]}>
            {filas.map((t) => (
              <tr
                key={t.id}
                onClick={() => setAbierto(t.id)}
                className="cursor-pointer border-t border-border/60 hover:bg-primary/[0.03]"
              >
                <td className="py-3 pl-5 pr-3">
                  <p className="font-semibold">{t.asunto}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.id} · {t.clinica} · {haceCuanto(t.abierto)}
                  </p>
                </td>
                <td className="px-3 py-3 text-xs">{t.categoria}</td>
                <td className="px-3 py-3">
                  <Pildora tono={PRIORIDAD_TONO[t.prioridad]}>{t.prioridad}</Pildora>
                </td>
                <td className="px-3 py-3 text-xs">
                  {t.responsable ?? <span className="text-muted-foreground">Sin asignar</span>}
                </td>
                <td className="py-3 pl-3 pr-5">
                  <Pildora tono={ESTADO_TONO[t.estado]}>{t.estado}</Pildora>
                </td>
              </tr>
            ))}
          </Tabla>
        )}
      </Seccion>

      <Sheet open={!!seleccionado} onOpenChange={(v) => !v && setAbierto(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-xl">
          {seleccionado && (
            <DetalleTicket key={seleccionado.id} ticket={seleccionado} editable={editable} />
          )}
        </SheetContent>
      </Sheet>
      <NuevoTicket abierto={nuevo} onCerrar={() => setNuevo(false)} siguiente={lista.length} />
    </>
  );
}

function DetalleTicket({ ticket, editable }: { ticket: TicketSoporte; editable: boolean }) {
  const autor = useAutor();
  const { data: equipo } = useEquipo();
  const [nota, setNota] = useState("");
  const guardar = useAccion(
    (t: TicketSoporte) => guardarEn("ticketsSoporte", t),
    ["ticketsSoporte"],
    "Ticket actualizado",
  );
  const ahora = () => new Date().toISOString();
  const cambiar = (cambios: Partial<TicketSoporte>, texto: string) => {
    const resuelto =
      cambios.estado === "Resuelto" || cambios.estado === "Cerrado"
        ? (ticket.resuelto ?? ahora())
        : cambios.estado
          ? null
          : ticket.resuelto;
    guardar.mutate({
      ...ticket,
      ...cambios,
      resuelto,
      historial: [...ticket.historial, { fecha: ahora(), autor, cambio: texto }],
    });
  };

  return (
    <div>
      <div
        className="px-6 pb-5 pt-6 text-primary-foreground"
        style={{ background: "var(--gradient-primary)" }}
      >
        <SheetTitle className="text-xl font-extrabold text-primary-foreground">
          {ticket.asunto}
        </SheetTitle>
        <p className="text-sm opacity-90">
          {ticket.id} · {ticket.clinica} · abierto {fecha(ticket.abierto, true)}
        </p>
      </div>
      <div className="space-y-5 p-6">
        <div className="grid grid-cols-2 gap-3 text-xs">
          <Campo label="Estado">
            <select
              disabled={!editable}
              value={ticket.estado}
              className={SELECT}
              onChange={(e) =>
                cambiar({ estado: e.target.value as EstadoTicket }, `Estado: ${e.target.value}`)
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
              value={ticket.responsable ?? ""}
              className={SELECT}
              onChange={(e) =>
                cambiar(
                  { responsable: e.target.value || null },
                  `Responsable: ${e.target.value || "sin asignar"}`,
                )
              }
            >
              <option value="">Sin asignar</option>
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
              value={ticket.prioridad}
              className={SELECT}
              onChange={(e) =>
                cambiar(
                  { prioridad: e.target.value as TicketSoporte["prioridad"] },
                  `Prioridad: ${e.target.value}`,
                )
              }
            >
              {(["Alta", "Media", "Baja"] as const).map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </Campo>
          <Campo label="Categoría">
            <select
              disabled={!editable}
              value={ticket.categoria}
              className={SELECT}
              onChange={(e) =>
                cambiar(
                  { categoria: e.target.value as TicketSoporte["categoria"] },
                  `Categoría: ${e.target.value}`,
                )
              }
            >
              {CATEGORIAS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Campo>
        </div>
        <div>
          <p className="text-sm font-bold">Descripción</p>
          <p className="mt-1 whitespace-pre-line text-sm text-foreground/85">
            {ticket.descripcion || "Sin descripción."}
          </p>
          {ticket.resuelto && (
            <p className="mt-2 text-xs text-success">Resuelto el {fecha(ticket.resuelto, true)}</p>
          )}
        </div>
        <div>
          <p className="text-sm font-bold">Notas internas</p>
          <p className="text-[11px] text-muted-foreground">
            Solo las ve el equipo de Cloud Esther, no la clínica.
          </p>
          <ul className="mt-2 space-y-2">
            {ticket.notasInternas.map((n, i) => (
              <li key={i} className="rounded-xl bg-muted/60 p-3 text-xs">
                <p>{n.texto}</p>
                <p className="mt-1 text-muted-foreground">
                  {n.autor} · {fecha(n.fecha, true)}
                </p>
              </li>
            ))}
          </ul>
          {editable && (
            <div className="mt-2 space-y-2">
              <Textarea
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                rows={2}
                placeholder="Qué se revisó, qué falta, a quién se consultó…"
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  disabled={!nota.trim()}
                  onClick={() => {
                    guardar.mutate({
                      ...ticket,
                      notasInternas: [
                        ...ticket.notasInternas,
                        { fecha: new Date().toISOString(), autor, texto: nota.trim() },
                      ],
                    });
                    setNota("");
                  }}
                >
                  Agregar nota
                </Button>
              </div>
            </div>
          )}
        </div>
        <div>
          <p className="text-sm font-bold">Historial</p>
          <ol className="mt-2 space-y-1.5 border-l-2 border-primary/15 pl-4 text-xs">
            {[...ticket.historial].reverse().map((h, i) => (
              <li key={i}>
                <span className="font-medium">{h.cambio}</span>{" "}
                <span className="text-muted-foreground">
                  · {h.autor} · {fecha(h.fecha, true)}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

function NuevoTicket({
  abierto,
  onCerrar,
  siguiente,
}: {
  abierto: boolean;
  onCerrar: () => void;
  siguiente: number;
}) {
  const autor = useAutor();
  const vacio = {
    asunto: "",
    descripcion: "",
    clinica: "",
    categoria: "Consulta" as TicketSoporte["categoria"],
    prioridad: "Media" as TicketSoporte["prioridad"],
  };
  const [f, setF] = useState(vacio);
  const [error, setError] = useState<string | null>(null);
  const crear = useAccion(
    (t: TicketSoporte) => guardarEn("ticketsSoporte", t, `Creó el ticket «${t.asunto}»`),
    ["ticketsSoporte"],
    "Ticket creado",
  );
  const cerrar = () => {
    setF(vacio);
    setError(null);
    onCerrar();
  };
  return (
    <DialogoFormulario
      abierto={abierto}
      titulo="Nuevo ticket"
      descripcion="Registrá un problema o consulta de una clínica, o una tarea técnica interna."
      onCerrar={cerrar}
      guardando={crear.isPending}
      error={error}
      onGuardar={() => {
        if (!f.asunto.trim()) return setError("Escribí el asunto.");
        const ahora = new Date().toISOString();
        crear.mutate(
          {
            id: `T-${1043 + siguiente}`,
            asunto: f.asunto.trim(),
            descripcion: f.descripcion.trim(),
            clinica: f.clinica.trim() || "Interno",
            categoria: f.categoria,
            prioridad: f.prioridad,
            estado: "Nuevo",
            responsable: null,
            abierto: ahora,
            resuelto: null,
            notasInternas: [],
            historial: [{ fecha: ahora, autor, cambio: "Ticket creado" }],
          },
          { onSuccess: cerrar },
        );
      }}
    >
      <Campo label="Asunto">
        <input
          className={INPUT}
          value={f.asunto}
          onChange={(e) => setF({ ...f, asunto: e.target.value })}
        />
      </Campo>
      <Campo label="Clínica" ayuda="Dejalo vacío si es un tema interno.">
        <input
          className={INPUT}
          value={f.clinica}
          onChange={(e) => setF({ ...f, clinica: e.target.value })}
        />
      </Campo>
      <div className="grid grid-cols-2 gap-3">
        <Campo label="Categoría">
          <select
            className={INPUT}
            value={f.categoria}
            onChange={(e) =>
              setF({ ...f, categoria: e.target.value as TicketSoporte["categoria"] })
            }
          >
            {CATEGORIAS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Campo>
        <Campo label="Prioridad">
          <select
            className={INPUT}
            value={f.prioridad}
            onChange={(e) =>
              setF({ ...f, prioridad: e.target.value as TicketSoporte["prioridad"] })
            }
          >
            {(["Alta", "Media", "Baja"] as const).map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </Campo>
      </div>
      <Campo label="Descripción del problema">
        <Textarea
          rows={4}
          value={f.descripcion}
          onChange={(e) => setF({ ...f, descripcion: e.target.value })}
        />
      </Campo>
    </DialogoFormulario>
  );
}

function Incidentes() {
  const { role } = useRole();
  const editable = permisos.gestionarTickets(role);
  const { data, isLoading } = useColeccion("incidentes");
  const [nuevo, setNuevo] = useState(false);
  const [f, setF] = useState({
    titulo: "",
    impacto: "Medio" as Incidente["impacto"],
    descripcion: "",
  });
  const guardar = useAccion(
    (i: Incidente) => guardarEn("incidentes", i, `Incidente: ${i.titulo} (${i.estado})`),
    ["incidentes"],
    "Incidente guardado",
  );
  if (isLoading) return <Cargando />;
  return (
    <Seccion
      titulo="Incidentes de la plataforma"
      descripcion="Caídas, lentitud o errores que afectan a varias clínicas."
      acciones={
        editable && (
          <Button size="sm" onClick={() => setNuevo(true)}>
            <Plus className="mr-1 h-4 w-4" /> Registrar incidente
          </Button>
        )
      }
      sinPadding
    >
      {(data ?? []).length === 0 ? (
        <div className="p-5">
          <Vacio titulo="Sin incidentes registrados" />
        </div>
      ) : (
        <Tabla columnas={["Incidente", "Impacto", "Inicio", "Fin", "Estado"]}>
          {(data ?? []).map((i) => (
            <tr key={i.id} className="border-t border-border/60">
              <td className="py-3 pl-5 pr-3">
                <p className="font-semibold">{i.titulo}</p>
                <p className="text-xs text-muted-foreground">{i.descripcion}</p>
              </td>
              <td className="px-3 py-3">
                <Pildora
                  tono={
                    i.impacto === "Crítico" || i.impacto === "Alto"
                      ? "peligro"
                      : i.impacto === "Medio"
                        ? "alerta"
                        : "neutro"
                  }
                >
                  {i.impacto}
                </Pildora>
              </td>
              <td className="px-3 py-3 text-xs">{fecha(i.inicio, true)}</td>
              <td className="px-3 py-3 text-xs">{i.fin ? fecha(i.fin, true) : "—"}</td>
              <td className="py-3 pl-3 pr-5">
                <select
                  disabled={!editable}
                  className={SELECT}
                  value={i.estado}
                  onChange={(e) => {
                    const estado = e.target.value as Incidente["estado"];
                    guardar.mutate({
                      ...i,
                      estado,
                      fin: estado === "Resuelto" ? new Date().toISOString() : null,
                    });
                  }}
                >
                  {(["Abierto", "Mitigado", "Resuelto"] as const).map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </Tabla>
      )}
      <DialogoFormulario
        abierto={nuevo}
        titulo="Registrar incidente"
        onCerrar={() => setNuevo(false)}
        guardando={guardar.isPending}
        onGuardar={() => {
          if (!f.titulo.trim()) return;
          guardar.mutate(
            {
              id: nuevoIdLocal("inc"),
              titulo: f.titulo.trim(),
              impacto: f.impacto,
              estado: "Abierto",
              inicio: new Date().toISOString(),
              fin: null,
              descripcion: f.descripcion.trim(),
            },
            {
              onSuccess: () => {
                setNuevo(false);
                setF({ titulo: "", impacto: "Medio", descripcion: "" });
              },
            },
          );
        }}
      >
        <Campo label="Qué pasa">
          <input
            className={INPUT}
            value={f.titulo}
            onChange={(e) => setF({ ...f, titulo: e.target.value })}
          />
        </Campo>
        <Campo label="Impacto">
          <select
            className={INPUT}
            value={f.impacto}
            onChange={(e) => setF({ ...f, impacto: e.target.value as Incidente["impacto"] })}
          >
            {(["Crítico", "Alto", "Medio", "Bajo"] as const).map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </Campo>
        <Campo label="Detalle">
          <Textarea
            rows={3}
            value={f.descripcion}
            onChange={(e) => setF({ ...f, descripcion: e.target.value })}
          />
        </Campo>
      </DialogoFormulario>
    </Seccion>
  );
}

function Tareas() {
  const { data, isLoading } = useColeccion("tareas");
  const { data: equipo } = useEquipo();
  const [titulo, setTitulo] = useState("");
  const [responsable, setResponsable] = useState("");
  const [vence, setVence] = useState("");
  const guardar = useAccion((t: TareaInterna) => guardarEn("tareas", t), ["tareas"]);
  if (isLoading) return <Cargando />;
  return (
    <Seccion titulo="Tareas internas" descripcion="Pendientes del equipo de Cloud Esther.">
      <form
        className="mb-4 grid gap-2 md:grid-cols-[minmax(0,1fr)_200px_160px_auto]"
        onSubmit={(e) => {
          e.preventDefault();
          if (!titulo.trim()) return;
          guardar.mutate({
            id: nuevoIdLocal("ta"),
            titulo: titulo.trim(),
            responsable: responsable || null,
            vence: vence || null,
            estado: "Pendiente",
          });
          setTitulo("");
          setVence("");
        }}
      >
        <input
          className={INPUT}
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Nueva tarea"
        />
        <select
          className={INPUT}
          value={responsable}
          onChange={(e) => setResponsable(e.target.value)}
          aria-label="Responsable"
        >
          <option value="">Sin responsable</option>
          {(equipo ?? [])
            .filter((a) => a.activo)
            .map((a) => (
              <option key={a.id}>{a.nombre}</option>
            ))}
        </select>
        <input
          type="date"
          className={INPUT}
          value={vence}
          onChange={(e) => setVence(e.target.value)}
          aria-label="Vence"
        />
        <Button type="submit">
          <Plus className="mr-1 h-4 w-4" /> Agregar
        </Button>
      </form>
      {(data ?? []).length === 0 ? (
        <Vacio titulo="Sin tareas" />
      ) : (
        <ul className="space-y-2">
          {(data ?? []).map((t) => (
            <li
              key={t.id}
              className={cn(
                "flex flex-wrap items-center gap-3 rounded-xl border border-border/70 p-3 text-sm",
                t.estado === "Hecha" && "opacity-60",
              )}
            >
              <span className="min-w-0 flex-1">
                <span className={cn("block font-semibold", t.estado === "Hecha" && "line-through")}>
                  {t.titulo}
                </span>
                <span className="text-xs text-muted-foreground">
                  {t.responsable ?? "Sin responsable"}
                  {t.vence ? ` · vence ${fecha(t.vence)}` : ""}
                </span>
              </span>
              <select
                className={SELECT}
                value={t.estado}
                onChange={(e) =>
                  guardar.mutate({ ...t, estado: e.target.value as TareaInterna["estado"] })
                }
              >
                {(["Pendiente", "En curso", "Hecha"] as const).map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </li>
          ))}
        </ul>
      )}
    </Seccion>
  );
}
