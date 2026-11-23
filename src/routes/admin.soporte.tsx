import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  CircleSlash,
  Database,
  HardDriveDownload,
  ImageIcon,
  Inbox,
  LifeBuoy,
  Mail,
  Plus,
  RefreshCw,
  Server,
  Timer,
  WalletCards,
  Bot,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

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
import { BotonExcel, RespuestasListas } from "@/components/admin/herramientas-atencion";
import {
  FichaClinica,
  Guias,
  LIMITE_HORAS,
  TiempoTicket,
  fueraDeTiempo,
  horasTicket,
} from "@/components/admin/herramientas-soporte";
import { AdminShell } from "@/components/admin/shell";
import { descargarExcel } from "@/lib/admin/excel";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  CON_BACKEND,
  anotarRespaldo,
  guardarEn,
  nuevoIdLocal,
  nuevoNumero,
  obtenerEstadoSistema,
} from "@/lib/admin/api";
import {
  useAccion,
  useColeccion,
  useEquipo,
  useEstadoSistema,
  useRespaldos,
} from "@/lib/admin/consultas";
import type { ChequeoSistema, EstadoServicio } from "@/lib/admin/tipos";
import { fecha, haceCuanto } from "@/lib/admin/formato";
import { useSesionAdmin } from "@/lib/admin/sesion";
import type {
  EstadoTicket,
  Incidente,
  TareaInterna,
  TicketSoporte,
} from "@/lib/admin/tipos-empresa";
import { cn } from "@/lib/utils";
import { Seleccion } from "@/components/ui/seleccion";

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

type Vista = "tickets" | "ficha" | "guias" | "respuestas" | "incidentes" | "tareas" | "sistema";

function SupportPage() {
  const { data: tickets } = useColeccion("ticketsSoporte");
  const { data: incidentes } = useColeccion("incidentes");
  const { data: tareas } = useColeccion("tareas");
  const [vista, setVista] = useState<Vista>("tickets");
  const { role } = useRole();
  const editableSoporte = permisos.gestionarTickets(role);
  const [ticketDesdeFicha, setTicketDesdeFicha] = useState<string | null>(null);
  const { data: sistema } = useEstadoSistema();
  const problemas = sistema?.chequeos.filter((c) => c.estado === "error").length ?? 0;
  return (
    <AdminShell
      title="Soporte técnico"
      description="Problemas y consultas de las clínicas, ficha técnica de cada clínica, guías y soluciones, incidentes de la plataforma y tareas internas. Cada ticket muestra cuánto lleva y se pone en rojo si se pasa del tiempo."
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
          { id: "ficha", label: "Ficha de clínica" },
          { id: "guias", label: "Guías y soluciones" },
          { id: "respuestas", label: "Respuestas listas" },
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
          {
            id: "sistema",
            label: problemas ? "Estado del sistema ⚠" : "Estado del sistema",
            ...(problemas ? { cantidad: problemas } : {}),
          },
        ]}
      />
      {vista === "tickets" ? (
        <Tickets abrirId={ticketDesdeFicha} onAbierto={() => setTicketDesdeFicha(null)} />
      ) : vista === "ficha" ? (
        <FichaClinica
          onAbrirTicket={(id) => {
            setTicketDesdeFicha(id);
            setVista("tickets");
          }}
        />
      ) : vista === "guias" ? (
        <Guias editable={editableSoporte} />
      ) : vista === "respuestas" ? (
        <RespuestasListas area="Soporte" editable={editableSoporte} />
      ) : vista === "sistema" ? (
        <EstadoDelSistema />
      ) : vista === "incidentes" ? (
        <Incidentes />
      ) : (
        <Tareas />
      )}
    </AdminShell>
  );
}

function useAutor() {
  return useSesionAdmin()?.usuario.nombre ?? "Equipo";
}

function Tickets({ abrirId, onAbierto }: { abrirId: string | null; onAbierto: () => void }) {
  const { role } = useRole();
  const editable = permisos.gestionarTickets(role);
  const { data: tickets, isLoading } = useColeccion("ticketsSoporte");
  const [filtro, setFiltro] = useState<"abiertos" | "tarde" | EstadoTicket | "todos">("abiertos");
  const [abierto, setAbierto] = useState<string | null>(abrirId);
  useEffect(() => {
    if (abrirId) {
      setAbierto(abrirId);
      onAbierto();
    }
  }, [abrirId, onAbierto]);
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
          : filtro === "tarde"
            ? fueraDeTiempo(t)
            : t.estado === filtro,
    )
    .sort((a, b) => b.abierto.localeCompare(a.abierto));
  const seleccionado = lista.find((t) => t.id === abierto) ?? null;

  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-6">
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
          label="Fuera de tiempo"
          value={String(lista.filter((t) => fueraDeTiempo(t)).length)}
          hint={`Alta ${LIMITE_HORAS.Alta} h · Media ${LIMITE_HORAS.Media} h · Baja ${LIMITE_HORAS.Baja} h`}
          icon={<Timer className="h-4 w-4" />}
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
            <Seleccion
              value={filtro}
              onChange={(e) => setFiltro(e.target.value as typeof filtro)}
              className="h-9 rounded-xl border border-input bg-card px-3 text-xs font-semibold"
              aria-label="Estado"
            >
              <option value="abiertos">Abiertos</option>
              <option value="tarde">Fuera de tiempo</option>
              <option value="todos">Todos</option>
              {ESTADOS.map((e) => (
                <option key={e}>{e}</option>
              ))}
            </Seleccion>
            <BotonExcel onClick={() => exportarTickets(filas)} />
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
          <Tabla columnas={["Ticket", "Categoría", "Prioridad", "Responsable", "Tiempo", "Estado"]}>
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
                <td className="px-3 py-3">
                  <TiempoTicket t={t} />
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

function exportarTickets(lista: TicketSoporte[]) {
  descargarExcel("tickets-soporte", "Tickets", [
    ["Ticket", "Abierto", "Clínica", "Asunto", "Categoría", "Prioridad", "Estado", "Responsable", "Resuelto", "Horas", "Fuera de tiempo", "Descripción"],
    ...lista.map((t) => [
      t.id,
      t.abierto.slice(0, 16).replace("T", " "),
      t.clinica,
      t.asunto,
      t.categoria,
      t.prioridad,
      t.estado,
      t.responsable ?? "",
      t.resuelto ? t.resuelto.slice(0, 16).replace("T", " ") : "",
      Math.round(horasTicket(t) * 10) / 10,
      fueraDeTiempo(t) ? "Sí" : "No",
      t.descripcion,
    ]),
  ]);
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
            <Seleccion
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
            </Seleccion>
          </Campo>
          <Campo label="Responsable">
            <Seleccion
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
            </Seleccion>
          </Campo>
          <Campo label="Prioridad">
            <Seleccion
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
            </Seleccion>
          </Campo>
          <Campo label="Categoría">
            <Seleccion
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
            </Seleccion>
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
            id: nuevoNumero("T"),
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
          <Seleccion
            className={INPUT}
            value={f.categoria}
            onChange={(e) =>
              setF({ ...f, categoria: e.target.value as TicketSoporte["categoria"] })
            }
          >
            {CATEGORIAS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Seleccion>
        </Campo>
        <Campo label="Prioridad">
          <Seleccion
            className={INPUT}
            value={f.prioridad}
            onChange={(e) =>
              setF({ ...f, prioridad: e.target.value as TicketSoporte["prioridad"] })
            }
          >
            {(["Alta", "Media", "Baja"] as const).map((p) => (
              <option key={p}>{p}</option>
            ))}
          </Seleccion>
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
                <Seleccion
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
                </Seleccion>
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
          <Seleccion
            className={INPUT}
            value={f.impacto}
            onChange={(e) => setF({ ...f, impacto: e.target.value as Incidente["impacto"] })}
          >
            {(["Crítico", "Alto", "Medio", "Bajo"] as const).map((x) => (
              <option key={x}>{x}</option>
            ))}
          </Seleccion>
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
        <Seleccion
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
        </Seleccion>
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
              <Seleccion
                className={SELECT}
                value={t.estado}
                onChange={(e) =>
                  guardar.mutate({ ...t, estado: e.target.value as TareaInterna["estado"] })
                }
              >
                {(["Pendiente", "En curso", "Hecha"] as const).map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </Seleccion>
            </li>
          ))}
        </ul>
      )}
    </Seccion>
  );
}

/* -------------------------------------------------------------------------- */
/*   ESTADO DEL SISTEMA: servidor, base, Paddle, Resend, Cloudinary y respaldo   */
/* -------------------------------------------------------------------------- */

const ICONO_SERVICIO: Record<ChequeoSistema["id"], LucideIcon> = {
  backend: Server,
  base: Database,
  paddle: WalletCards,
  correo: Mail,
  imagenes: ImageIcon,
  respaldo: HardDriveDownload,
  ia: Bot,
};
const ESTILO_ESTADO: Record<EstadoServicio, { texto: string; icono: LucideIcon; clase: string }> = {
  ok: { texto: "Funciona", icono: CheckCircle2, clase: "text-success bg-success/10 border-success/25" },
  aviso: { texto: "Revisar", icono: AlertTriangle, clase: "text-warning-foreground bg-warning/15 border-warning/30" },
  error: { texto: "Con problemas", icono: XCircle, clase: "text-destructive bg-destructive/10 border-destructive/30" },
  apagado: { texto: "Apagado", icono: CircleSlash, clase: "text-muted-foreground bg-muted border-border" },
};
const NOMBRE_DATO: Record<string, string> = {
  entorno: "Entorno",
  node: "Node",
  version: "Versión publicada",
  memoriaMB: "Memoria (MB)",
  tamañoMB: "Tamaño (MB)",
  migraciones: "Migraciones",
  ultimoAviso: "Último aviso de Paddle",
  avisosConError7dias: "Avisos con error (7 días)",
  remitente: "Remitente",
  modoPrueba: "Modo prueba",
  cuenta: "Cuenta",
  ultimoAnotado: "Último anotado",
  donde: "Dónde",
  archivoContinuo: "Archivo continuo",
};
const esFecha = (v: unknown) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v);

function EstadoDelSistema() {
  const { data: estado, isLoading, isFetching } = useEstadoSistema();
  const qc = useQueryClient();
  const [revisando, setRevisando] = useState(false);
  const [anotar, setAnotar] = useState(false);

  if (!CON_BACKEND) {
    return (
      <Seccion titulo="Estado del sistema">
        <Vacio
          titulo="Disponible con el servidor conectado"
          texto="Con datos de ejemplo no hay servidor, base de datos ni servicios externos que revisar."
        />
      </Seccion>
    );
  }
  const revisarAhora = async () => {
    setRevisando(true);
    try {
      qc.setQueryData(["estadoSistema"], await obtenerEstadoSistema(true));
    } finally {
      setRevisando(false);
    }
  };
  const general = estado ? ESTILO_ESTADO[estado.general] : null;
  return (
    <>
      <Seccion
        titulo="Estado del sistema"
        descripcion="Se revisa en vivo cada minuto. Nunca se muestran llaves ni contraseñas."
        acciones={
          <Button variant="outline" size="sm" disabled={revisando || isFetching} onClick={() => void revisarAhora()}>
            <RefreshCw className={cn("mr-1.5 h-4 w-4", (revisando || isFetching) && "animate-spin")} /> Revisar ahora
          </Button>
        }
      >
        {isLoading || !estado ? (
          <Cargando />
        ) : (
          <>
            {general && (
              <div className={cn("mb-4 flex items-center gap-3 rounded-2xl border px-4 py-3", general.clase)}>
                <Activity className="h-5 w-5 shrink-0" />
                <p className="text-sm font-bold">
                  {estado.general === "ok"
                    ? "Todo funciona bien."
                    : estado.general === "error"
                      ? "Hay servicios con problemas: revisalos abajo."
                      : "Funciona, pero hay cosas para revisar."}
                </p>
                <span className="ml-auto text-xs opacity-80">Revisado {haceCuanto(estado.revisado)}</span>
              </div>
            )}
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {estado.chequeos.map((c) => {
                const e = ESTILO_ESTADO[c.estado];
                const Icono = ICONO_SERVICIO[c.id] ?? Server;
                const datos = Object.entries(c.datos).filter(([, v]) => v !== null && v !== "");
                return (
                  <div key={c.id} className="rounded-2xl border border-border bg-card p-4">
                    <div className="flex items-start gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                        <Icono className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold">{c.nombre}</p>
                        <span
                          className={cn(
                            "mt-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                            e.clase,
                          )}
                        >
                          <e.icono className="h-3 w-3" /> {e.texto}
                          {c.ms !== null && <span className="opacity-70">· {c.ms} ms</span>}
                        </span>
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-foreground/85">{c.detalle}</p>
                    {datos.length > 0 && (
                      <dl className="mt-3 space-y-1 border-t border-border/60 pt-2 text-[11px]">
                        {datos.map(([k, v]) => (
                          <div key={k} className="flex justify-between gap-3">
                            <dt className="text-muted-foreground">{NOMBRE_DATO[k] ?? k}</dt>
                            <dd className="truncate text-right font-semibold" title={String(v)}>
                              {esFecha(v) ? `${fecha(String(v))} (${haceCuanto(String(v))})` : String(v)}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    )}
                    {c.id === "respaldo" && (
                      <Button size="sm" variant="outline" className="mt-3" onClick={() => setAnotar(true)}>
                        <Plus className="mr-1.5 h-3.5 w-3.5" /> Anotar respaldo
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Seccion>
      <Respaldos abierto={anotar} onAbrir={setAnotar} />
    </>
  );
}

function Respaldos({ abierto, onAbrir }: { abierto: boolean; onAbrir: (v: boolean) => void }) {
  const { data: respaldos, isLoading } = useRespaldos();
  const ahoraLocal = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  };
  const [f, setF] = useState({ fecha: ahoraLocal(), donde: "", nota: "" });
  const [error, setError] = useState<string | null>(null);
  const anotarR = useAccion(anotarRespaldo, ["respaldos", "estadoSistema"], "Respaldo anotado");
  const guardar = () => {
    setError(null);
    if (!f.fecha) return setError("Poné la fecha del respaldo.");
    if (f.donde.trim().length < 2) return setError("Escribí dónde quedó el respaldo.");
    anotarR.mutate(
      { fecha: new Date(f.fecha).toISOString(), donde: f.donde.trim(), nota: f.nota.trim() },
      {
        onSuccess: () => {
          onAbrir(false);
          setF({ fecha: ahoraLocal(), donde: "", nota: "" });
        },
        onError: (e) => setError(e instanceof Error ? e.message : "No se pudo anotar."),
      },
    );
  };
  const lista = respaldos ?? [];
  return (
    <Seccion
      titulo="Respaldos de la base"
      descripcion="Anotá cada respaldo que hagas o verifiques (por ejemplo, el diario del proveedor de la base). Si el último tiene más de 7 días, el estado avisa."
      acciones={
        <Button size="sm" onClick={() => onAbrir(true)}>
          <Plus className="mr-1.5 h-4 w-4" /> Anotar respaldo
        </Button>
      }
    >
      {isLoading ? (
        <Cargando />
      ) : lista.length === 0 ? (
        <Vacio titulo="Todavía no hay respaldos anotados" />
      ) : (
        <Tabla columnas={["Fecha", "Dónde quedó", "Nota", "Anotó"]} minimo={620}>
          {lista.map((b) => (
            <tr key={b.id} className="border-t border-border/60">
              <td className="py-2.5 pl-5 pr-3 text-sm font-semibold">{fecha(b.fecha)}</td>
              <td className="px-3 py-2.5 text-sm">{b.donde}</td>
              <td className="px-3 py-2.5 text-xs text-muted-foreground">{b.nota || "—"}</td>
              <td className="py-2.5 pl-3 pr-5 text-xs text-muted-foreground">
                {b.quien} · {haceCuanto(b.anotado)}
              </td>
            </tr>
          ))}
        </Tabla>
      )}
      <DialogoFormulario
        abierto={abierto}
        titulo="Anotar un respaldo"
        descripcion="Queda en la actividad del panel con tu nombre."
        onCerrar={() => onAbrir(false)}
        onGuardar={guardar}
        guardando={anotarR.isPending}
        error={error}
        textoGuardar="Anotar"
      >
        <Campo label="Fecha y hora del respaldo">
          <input
            type="datetime-local"
            className={INPUT}
            value={f.fecha}
            max={ahoraLocal()}
            onChange={(e) => setF({ ...f, fecha: e.target.value })}
          />
        </Campo>
        <Campo label="Dónde quedó" ayuda="Ej.: Render (backup automático diario) · Google Drive · disco externo">
          <input
            className={INPUT}
            value={f.donde}
            maxLength={200}
            onChange={(e) => setF({ ...f, donde: e.target.value })}
          />
        </Campo>
        <Campo label="Nota (opcional)">
          <Textarea value={f.nota} maxLength={500} rows={2} onChange={(e) => setF({ ...f, nota: e.target.value })} />
        </Campo>
      </DialogoFormulario>
    </Seccion>
  );
}
