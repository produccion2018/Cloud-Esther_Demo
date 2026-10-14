import { createFileRoute } from "@tanstack/react-router";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  Megaphone,
  MessageCircle,
  Pencil,
  Plus,
  Search,
  Target,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Cargando, KpiCard, Seccion, Vacio } from "@/components/admin/bits";
import {
  Campo,
  DialogoFormulario,
  INPUT,
  Pestanas,
  Pildora,
  Tabla,
  confirmar,
} from "@/components/admin/formularios";
import { BotonExcel, RespuestasListas, enlaceLlamar, useAutor } from "@/components/admin/herramientas-atencion";
import { RestrictedView } from "@/components/admin/restricted";
import { canAccess, puede, useRole } from "@/components/admin/role";
import { AdminShell } from "@/components/admin/shell";
import { IconoWhatsApp } from "@/components/cloud-esther/IconoWhatsApp";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { borrarDe, guardarEn, nuevoIdLocal } from "@/lib/admin/api";
import { useAccion, useColeccion } from "@/lib/admin/consultas";
import { descargarExcel } from "@/lib/admin/excel";
import { enlaceWhatsApp, fecha } from "@/lib/admin/formato";
import type {
  Campana,
  ContactoRed,
  IdeaMarketing,
  Publicacion,
  RedSocial,
} from "@/lib/admin/tipos-empresa";
import { cn } from "@/lib/utils";

/* Ubicación: src/routes/admin.marketing.tsx
   REDES Y MARKETING de Cloud Esther (para dar a conocer el sistema):
   · Calendario de publicaciones por red, con su estado (idea → en preparación → lista → publicada).
   · Biblioteca de textos, hashtags e ideas para reusar.
   · Contactos que llegan por redes, con seguimiento hasta que prueban el demo o contratan.
   · Campañas con sus resultados (alcance, clics, mensajes, demos y clientes).
   Todo se guarda en el servidor (permiso «Redes y marketing»). */

export const Route = createFileRoute("/admin/marketing")({
  head: () => ({
    meta: [
      { title: "Redes y marketing — Cloud Esther Administración" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: MarketingPage,
});

const REDES: RedSocial[] = ["Instagram", "Facebook", "TikTok", "LinkedIn", "YouTube", "X", "WhatsApp", "Otra"];
const COLOR_RED: Record<RedSocial, string> = {
  Instagram: "bg-pink-500/15 text-pink-700 dark:text-pink-300",
  Facebook: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  TikTok: "bg-zinc-500/15 text-zinc-700 dark:text-zinc-200",
  LinkedIn: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  YouTube: "bg-red-500/15 text-red-700 dark:text-red-300",
  X: "bg-neutral-500/15 text-neutral-700 dark:text-neutral-200",
  WhatsApp: "bg-green-500/15 text-green-700 dark:text-green-300",
  Otra: "bg-primary/10 text-primary",
};
const ESTADOS_PUB: Publicacion["estado"][] = ["Idea", "En preparación", "Lista", "Publicada"];
const TONO_PUB: Record<Publicacion["estado"], "neutro" | "alerta" | "primario" | "ok"> = {
  Idea: "neutro",
  "En preparación": "alerta",
  Lista: "primario",
  Publicada: "ok",
};
const ESTADOS_CONTACTO: ContactoRed["estado"][] = ["Nuevo", "Contactado", "Probando demo", "Contrató", "Descartado"];
const TONO_CONTACTO: Record<ContactoRed["estado"], "primario" | "alerta" | "ok" | "neutro" | "peligro"> = {
  Nuevo: "primario",
  Contactado: "alerta",
  "Probando demo": "alerta",
  Contrató: "ok",
  Descartado: "neutro",
};
const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const etiquetasDe = (t: string) =>
  t
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean)
    .slice(0, 20);
const numero = (v: string) => Math.max(0, Math.floor(Number(v) || 0));

type Vista = "calendario" | "contactos" | "campanas" | "biblioteca" | "respuestas";

function MarketingPage() {
  const { role } = useRole();
  const { data: publicaciones } = useColeccion("publicaciones");
  const { data: contactos } = useColeccion("contactosRedes");
  const { data: campanas } = useColeccion("campanas");
  const [vista, setVista] = useState<Vista>("calendario");
  if (!canAccess(role, "/admin/marketing")) return <RestrictedView />;
  const editable = puede(role, "marketing");
  const hoy = hoyISO();
  const pubs = publicaciones ?? [];
  const cont = contactos ?? [];
  const semana = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);

  return (
    <AdminShell
      title="Redes y marketing"
      description="Publicidad de Cloud Esther en redes: qué se publica y cuándo, textos listos, campañas y las personas que escriben interesadas."
    >
      <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
        <KpiCard
          accent
          label="Publicaciones esta semana"
          value={String(pubs.filter((p) => p.fecha >= hoy && p.fecha <= semana).length)}
          hint="Programadas"
          icon={<CalendarDays className="h-4 w-4" />}
        />
        <KpiCard
          label="Para preparar"
          value={String(pubs.filter((p) => p.estado === "Idea" || p.estado === "En preparación").length)}
          hint="Ideas y en preparación"
          icon={<Megaphone className="h-4 w-4" />}
          tono="warning"
        />
        <KpiCard
          label="Contactos nuevos"
          value={String(cont.filter((c) => c.estado === "Nuevo").length)}
          hint="Responderles"
          icon={<UserPlus className="h-4 w-4" />}
          tono="destructive"
        />
        <KpiCard
          label="Clientes por redes"
          value={String(cont.filter((c) => c.estado === "Contrató").length)}
          hint={`${(campanas ?? []).filter((c) => c.estado === "Activa").length} campañas activas`}
          icon={<Target className="h-4 w-4" />}
          tono="success"
        />
      </div>

      <Pestanas
        valor={vista}
        onCambiar={setVista}
        opciones={[
          { id: "calendario", label: "Calendario" },
          { id: "contactos", label: "Contactos de redes", cantidad: cont.filter((c) => c.estado === "Nuevo").length || undefined },
          { id: "campanas", label: "Campañas" },
          { id: "biblioteca", label: "Textos e ideas" },
          { id: "respuestas", label: "Respuestas listas" },
        ]}
      />

      {vista === "calendario" ? (
        <Calendario editable={editable} />
      ) : vista === "contactos" ? (
        <Contactos editable={editable} />
      ) : vista === "campanas" ? (
        <Campanas editable={editable} />
      ) : vista === "biblioteca" ? (
        <Biblioteca editable={editable} />
      ) : (
        <RespuestasListas area="Marketing" editable={editable} />
      )}
    </AdminShell>
  );
}

/* ───────────── Calendario de publicaciones ───────────── */

function Calendario({ editable }: { editable: boolean }) {
  const { data, isLoading } = useColeccion("publicaciones");
  const [mes, setMes] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [red, setRed] = useState<"" | RedSocial>("");
  const [editando, setEditando] = useState<Publicacion | { nueva: string } | null>(null);
  const hoy = hoyISO();

  const lista = (data ?? []).filter((p) => !red || p.red === red);
  const prefijo = `${mes.y}-${String(mes.m + 1).padStart(2, "0")}`;
  const delMes = lista.filter((p) => p.fecha.startsWith(prefijo)).sort((a, b) => `${a.fecha}${a.hora}`.localeCompare(`${b.fecha}${b.hora}`));

  // Grilla del mes (empieza el lunes)
  const primero = new Date(mes.y, mes.m, 1);
  const dias = new Date(mes.y, mes.m + 1, 0).getDate();
  const vacios = (primero.getDay() + 6) % 7;
  const celdas: (string | null)[] = [
    ...Array.from({ length: vacios }, () => null),
    ...Array.from({ length: dias }, (_, i) => `${prefijo}-${String(i + 1).padStart(2, "0")}`),
  ];
  const mover = (n: number) =>
    setMes((x) => {
      const d = new Date(x.y, x.m + n, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });

  const exportar = () =>
    descargarExcel("publicaciones", "Publicaciones", [
      ["Fecha", "Hora", "Red", "Título", "Texto", "Hashtags", "Estado", "Responsable", "Enlace", "Alcance", "Interacciones", "Mensajes"],
      ...lista
        .slice()
        .sort((a, b) => a.fecha.localeCompare(b.fecha))
        .map((p) => [p.fecha, p.hora, p.red, p.titulo, p.texto, p.hashtags, p.estado, p.responsable ?? "", p.enlace, p.alcance, p.interacciones, p.mensajes]),
    ]);

  return (
    <Seccion
      titulo="Calendario de publicaciones"
      descripcion="Planificá qué se publica en cada red. Tocá un día para agregar una publicación o una publicación para editarla."
      acciones={
        <div className="flex flex-wrap gap-2">
          <select value={red} onChange={(e) => setRed(e.target.value as typeof red)} className={`${INPUT} w-auto`} aria-label="Red">
            <option value="">Todas las redes</option>
            {REDES.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
          <BotonExcel onClick={exportar} />
          {editable && (
            <Button size="sm" onClick={() => setEditando({ nueva: hoy })}>
              <Plus className="mr-1 h-4 w-4" /> Nueva publicación
            </Button>
          )}
        </div>
      }
    >
      <div className="mb-3 flex items-center justify-between">
        <Button size="sm" variant="outline" onClick={() => mover(-1)} aria-label="Mes anterior">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <p className="text-base font-bold">
          {MESES[mes.m]} {mes.y}
        </p>
        <Button size="sm" variant="outline" onClick={() => mover(1)} aria-label="Mes siguiente">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      {isLoading ? (
        <Cargando />
      ) : (
        <>
          <div className="hidden grid-cols-7 gap-1 md:grid">
            {DIAS.map((d) => (
              <p key={d} className="pb-1 text-center text-[11px] font-bold uppercase text-muted-foreground">
                {d}
              </p>
            ))}
            {celdas.map((dia, i) =>
              dia ? (
                <div
                  key={dia}
                  role={editable ? "button" : undefined}
                  tabIndex={editable ? 0 : undefined}
                  onClick={() => editable && setEditando({ nueva: dia })}
                  onKeyDown={(e) => editable && e.key === "Enter" && setEditando({ nueva: dia })}
                  className={cn(
                    "min-h-[92px] rounded-xl border p-1.5 text-left",
                    dia === hoy ? "border-primary bg-primary/[0.04]" : "border-border",
                    editable && "cursor-pointer hover:border-primary/40",
                  )}
                >
                  <p className={cn("text-xs font-bold", dia === hoy ? "text-primary" : "text-muted-foreground")}>{Number(dia.slice(8))}</p>
                  <div className="mt-1 space-y-1">
                    {delMes
                      .filter((p) => p.fecha === dia)
                      .map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditando(p);
                          }}
                          className={cn("block w-full truncate rounded-md px-1.5 py-0.5 text-left text-[11px] font-semibold", COLOR_RED[p.red], p.estado === "Publicada" && "opacity-60")}
                          title={`${p.red} · ${p.estado} · ${p.titulo}`}
                        >
                          {p.hora && `${p.hora} `}
                          {p.titulo}
                        </button>
                      ))}
                  </div>
                </div>
              ) : (
                <div key={`v${i}`} />
              ),
            )}
          </div>

          {/* Lista del mes (en celular se ve solo esto) */}
          <div className="mt-4">
            <p className="mb-2 text-sm font-bold">Publicaciones de {MESES[mes.m].toLowerCase()}</p>
            {delMes.length === 0 ? (
              <Vacio titulo="No hay publicaciones este mes" texto="Agregá la primera con «Nueva publicación»." />
            ) : (
              <ul className="divide-y divide-border/60 rounded-2xl border border-border">
                {delMes.map((p) => (
                  <li key={p.id}>
                    <button type="button" onClick={() => setEditando(p)} className="flex w-full flex-wrap items-center gap-2 px-4 py-2.5 text-left hover:bg-primary/[0.03]">
                      <span className="w-24 shrink-0 text-xs font-semibold text-muted-foreground">
                        {fecha(p.fecha)} {p.hora}
                      </span>
                      <span className={cn("rounded-md px-1.5 py-0.5 text-[11px] font-semibold", COLOR_RED[p.red])}>{p.red}</span>
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{p.titulo}</span>
                      <Pildora tono={TONO_PUB[p.estado]}>{p.estado}</Pildora>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
      {editando && (
        <DialogoPublicacion
          inicial={"nueva" in editando ? null : editando}
          dia={"nueva" in editando ? editando.nueva : undefined}
          editable={editable}
          onCerrar={() => setEditando(null)}
        />
      )}
    </Seccion>
  );
}

function DialogoPublicacion({
  inicial,
  dia,
  editable,
  onCerrar,
}: {
  inicial: Publicacion | null;
  dia?: string;
  editable: boolean;
  onCerrar: () => void;
}) {
  const autor = useAutor();
  const { data: campanas } = useColeccion("campanas");
  const guardar = useAccion((p: Publicacion) => guardarEn("publicaciones", p), ["publicaciones"], "Publicación guardada");
  const borrar = useAccion((id: string) => borrarDe("publicaciones", id), ["publicaciones"], "Publicación eliminada");
  const [error, setError] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [f, setF] = useState<Publicacion>(
    inicial ?? {
      id: nuevoIdLocal("pub"),
      red: "Instagram",
      fecha: dia ?? hoyISO(),
      hora: "",
      titulo: "",
      texto: "",
      hashtags: "",
      estado: "Idea",
      campanaId: null,
      enlace: "",
      responsable: autor,
      alcance: 0,
      interacciones: 0,
      mensajes: 0,
    },
  );
  const set = <K extends keyof Publicacion>(k: K, v: Publicacion[K]) => setF((x) => ({ ...x, [k]: v }));
  const enviar = () => {
    if (!f.titulo.trim()) return setError("Escribí un título.");
    if (f.enlace && !/^https?:\/\//i.test(f.enlace.trim())) return setError("El enlace tiene que empezar con https://");
    setError(null);
    guardar.mutate({ ...f, titulo: f.titulo.trim(), enlace: f.enlace.trim() }, { onSuccess: onCerrar });
  };
  const copiarTexto = async () => {
    try {
      await navigator.clipboard.writeText([f.texto, f.hashtags].filter(Boolean).join("\n\n"));
      setCopiado(true);
    } catch {
      /* sin portapapeles */
    }
  };

  return (
    <DialogoFormulario
      abierto
      titulo={inicial ? "Publicación" : "Nueva publicación"}
      onCerrar={onCerrar}
      onGuardar={editable ? enviar : onCerrar}
      textoGuardar={editable ? "Guardar" : "Cerrar"}
      guardando={guardar.isPending}
      error={error}
      ancho="sm:max-w-2xl"
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <Campo label="Red">
          <select value={f.red} onChange={(e) => set("red", e.target.value as RedSocial)} className={INPUT}>
            {REDES.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </Campo>
        <Campo label="Día">
          <input type="date" value={f.fecha} onChange={(e) => set("fecha", e.target.value)} className={INPUT} />
        </Campo>
        <Campo label="Hora">
          <input type="time" value={f.hora} onChange={(e) => set("hora", e.target.value)} className={INPUT} />
        </Campo>
        <Campo label="Título (para el equipo)" className="sm:col-span-2">
          <input value={f.titulo} onChange={(e) => set("titulo", e.target.value)} maxLength={200} className={INPUT} placeholder="Ej.: Video: la agenda en 30 segundos" />
        </Campo>
        <Campo label="Estado">
          <select value={f.estado} onChange={(e) => set("estado", e.target.value as Publicacion["estado"])} className={INPUT}>
            {ESTADOS_PUB.map((e) => (
              <option key={e}>{e}</option>
            ))}
          </select>
        </Campo>
        <Campo label="Texto de la publicación" className="sm:col-span-3">
          <Textarea value={f.texto} onChange={(e) => set("texto", e.target.value)} rows={5} maxLength={4000} />
        </Campo>
        <Campo label="Hashtags" className="sm:col-span-2">
          <input value={f.hashtags} onChange={(e) => set("hashtags", e.target.value)} maxLength={500} className={INPUT} placeholder="#odontologia #clinicadental" />
        </Campo>
        <div className="flex items-end">
          <Button type="button" variant="outline" className="w-full" onClick={() => void copiarTexto()}>
            {copiado ? <Check className="mr-1 h-4 w-4" /> : <Copy className="mr-1 h-4 w-4" />}
            {copiado ? "Copiado" : "Copiar texto"}
          </Button>
        </div>
        <Campo label="Campaña">
          <select value={f.campanaId ?? ""} onChange={(e) => set("campanaId", e.target.value || null)} className={INPUT}>
            <option value="">Sin campaña</option>
            {(campanas ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </Campo>
        <Campo label="Responsable">
          <input value={f.responsable ?? ""} onChange={(e) => set("responsable", e.target.value || null)} className={INPUT} />
        </Campo>
        <Campo label="Enlace (cuando se publique)">
          <input value={f.enlace} onChange={(e) => set("enlace", e.target.value)} className={INPUT} placeholder="https://…" />
        </Campo>
        {f.estado === "Publicada" && (
          <>
            <Campo label="Alcance">
              <input type="number" min={0} value={f.alcance} onChange={(e) => set("alcance", numero(e.target.value))} className={INPUT} />
            </Campo>
            <Campo label="Interacciones">
              <input type="number" min={0} value={f.interacciones} onChange={(e) => set("interacciones", numero(e.target.value))} className={INPUT} />
            </Campo>
            <Campo label="Mensajes recibidos">
              <input type="number" min={0} value={f.mensajes} onChange={(e) => set("mensajes", numero(e.target.value))} className={INPUT} />
            </Campo>
          </>
        )}
      </div>
      {inicial && editable && (
        <Button
          type="button"
          variant="ghost"
          className="mt-2 text-destructive"
          onClick={() => confirmar("¿Eliminar esta publicación?") && borrar.mutate(inicial.id, { onSuccess: onCerrar })}
        >
          <Trash2 className="mr-1 h-4 w-4" /> Eliminar
        </Button>
      )}
    </DialogoFormulario>
  );
}

/* ───────────── Contactos que llegan por redes ───────────── */

function Contactos({ editable }: { editable: boolean }) {
  const { data, isLoading } = useColeccion("contactosRedes");
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState<"" | ContactoRed["estado"]>("");
  const [editando, setEditando] = useState<ContactoRed | "nuevo" | null>(null);
  const hoy = hoyISO();
  const lista = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (data ?? [])
      .filter((c) => !estado || c.estado === estado)
      .filter((c) => !t || `${c.nombre} ${c.usuario} ${c.clinica} ${c.telefono} ${c.email} ${c.mensaje}`.toLowerCase().includes(t))
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
  }, [data, q, estado]);

  const exportar = () =>
    descargarExcel("contactos-redes", "Contactos", [
      ["Fecha", "Red", "Nombre", "Usuario", "Teléfono", "Email", "País", "Clínica", "Estado", "Responsable", "Próximo contacto", "Mensaje"],
      ...lista.map((c) => [c.fecha, c.red, c.nombre, c.usuario, c.telefono, c.email, c.pais, c.clinica, c.estado, c.responsable ?? "", c.proximoContacto ?? "", c.mensaje]),
    ]);

  return (
    <Seccion
      titulo="Contactos que llegan por redes"
      descripcion="Cada persona que escribe interesada: anotala y seguila hasta que pruebe el demo o contrate."
      acciones={
        <div className="flex flex-wrap gap-2">
          <BotonExcel onClick={exportar} />
          {editable && (
            <Button size="sm" onClick={() => setEditando("nuevo")}>
              <Plus className="mr-1 h-4 w-4" /> Nuevo contacto
            </Button>
          )}
        </div>
      }
      sinPadding
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-border/60 px-5 py-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre, clínica, teléfono…" className={`${INPUT} pl-9`} />
        </div>
        <select value={estado} onChange={(e) => setEstado(e.target.value as typeof estado)} className={`${INPUT} w-auto`} aria-label="Estado">
          <option value="">Todos los estados</option>
          {ESTADOS_CONTACTO.map((e) => (
            <option key={e}>{e}</option>
          ))}
        </select>
      </div>
      {isLoading ? (
        <div className="p-5">
          <Cargando />
        </div>
      ) : lista.length === 0 ? (
        <div className="p-5">
          <Vacio titulo="Todavía no hay contactos" texto="Cuando alguien escriba por Instagram, Facebook o WhatsApp interesado en el sistema, cargalo acá." />
        </div>
      ) : (
        <Tabla columnas={["Persona", "Red", "Estado", "Próximo contacto", ""]} minimo={720}>
          {lista.map((c) => {
            const wa = enlaceWhatsApp(c.telefono);
            const tel = enlaceLlamar(c.telefono);
            return (
              <tr key={c.id} className="border-t border-border/60">
                <td className="py-3 pl-5 pr-3">
                  <button type="button" onClick={() => setEditando(c)} className="text-left">
                    <p className="font-semibold hover:underline">{c.nombre}</p>
                    <p className="text-xs text-muted-foreground">
                      {[c.clinica, c.pais, c.usuario].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </button>
                </td>
                <td className="px-3 py-3">
                  <span className={cn("rounded-md px-1.5 py-0.5 text-[11px] font-semibold", COLOR_RED[c.red])}>{c.red}</span>
                  <p className="mt-1 text-[11px] text-muted-foreground">{fecha(c.fecha)}</p>
                </td>
                <td className="px-3 py-3">
                  <Pildora tono={TONO_CONTACTO[c.estado]}>{c.estado}</Pildora>
                </td>
                <td className={cn("px-3 py-3 text-xs font-semibold", c.proximoContacto && c.proximoContacto < hoy ? "text-destructive" : "text-muted-foreground")}>
                  {c.proximoContacto ? fecha(c.proximoContacto) : "—"}
                </td>
                <td className="py-3 pl-3 pr-5">
                  <div className="flex justify-end gap-1">
                    {wa && (
                      <a href={wa} target="_blank" rel="noreferrer" className="btn-wa !min-h-8 !px-2 !text-xs" title="WhatsApp">
                        <IconoWhatsApp />
                      </a>
                    )}
                    {tel && (
                      <Button asChild size="sm" variant="outline" title="Llamar">
                        <a href={tel}>
                          <MessageCircle className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                    )}
                    {editable && (
                      <Button size="sm" variant="outline" onClick={() => setEditando(c)} title="Editar">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </Tabla>
      )}
      {editando && (
        <DialogoContacto inicial={editando === "nuevo" ? null : editando} editable={editable} onCerrar={() => setEditando(null)} />
      )}
    </Seccion>
  );
}

function DialogoContacto({ inicial, editable, onCerrar }: { inicial: ContactoRed | null; editable: boolean; onCerrar: () => void }) {
  const autor = useAutor();
  const { data: campanas } = useColeccion("campanas");
  const guardar = useAccion((c: ContactoRed) => guardarEn("contactosRedes", c), ["contactosRedes"], "Contacto guardado");
  const [error, setError] = useState<string | null>(null);
  const [nota, setNota] = useState("");
  const [f, setF] = useState<ContactoRed>(
    inicial ?? {
      id: nuevoIdLocal("cr"),
      fecha: hoyISO(),
      red: "Instagram",
      nombre: "",
      usuario: "",
      telefono: "",
      email: "",
      pais: "",
      clinica: "",
      mensaje: "",
      estado: "Nuevo",
      responsable: autor,
      campanaId: null,
      proximoContacto: null,
      notas: [],
    },
  );
  const set = <K extends keyof ContactoRed>(k: K, v: ContactoRed[K]) => setF((x) => ({ ...x, [k]: v }));
  const enviar = () => {
    if (!f.nombre.trim()) return setError("Escribí el nombre.");
    if (f.email && !/^\S+@\S+\.\S+$/.test(f.email.trim())) return setError("El correo no es válido.");
    setError(null);
    const notas = nota.trim() ? [...f.notas, { fecha: new Date().toISOString(), autor, texto: nota.trim() }] : f.notas;
    guardar.mutate({ ...f, nombre: f.nombre.trim(), email: f.email.trim(), notas }, { onSuccess: onCerrar });
  };
  return (
    <DialogoFormulario
      abierto
      titulo={inicial ? f.nombre || "Contacto" : "Nuevo contacto de redes"}
      descripcion="Datos de una persona interesada. Se usan solo para contactarla por Cloud Esther."
      onCerrar={onCerrar}
      onGuardar={editable ? enviar : onCerrar}
      textoGuardar={editable ? "Guardar" : "Cerrar"}
      guardando={guardar.isPending}
      error={error}
      ancho="sm:max-w-2xl"
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <Campo label="Nombre" className="sm:col-span-2">
          <input value={f.nombre} onChange={(e) => set("nombre", e.target.value)} maxLength={120} className={INPUT} />
        </Campo>
        <Campo label="Red">
          <select value={f.red} onChange={(e) => set("red", e.target.value as RedSocial)} className={INPUT}>
            {REDES.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </Campo>
        <Campo label="Usuario en la red">
          <input value={f.usuario} onChange={(e) => set("usuario", e.target.value)} maxLength={120} className={INPUT} placeholder="@clinica" />
        </Campo>
        <Campo label="Teléfono">
          <input value={f.telefono} onChange={(e) => set("telefono", e.target.value)} maxLength={40} className={INPUT} />
        </Campo>
        <Campo label="Correo">
          <input value={f.email} onChange={(e) => set("email", e.target.value)} maxLength={254} className={INPUT} />
        </Campo>
        <Campo label="Clínica">
          <input value={f.clinica} onChange={(e) => set("clinica", e.target.value)} maxLength={160} className={INPUT} />
        </Campo>
        <Campo label="País">
          <input value={f.pais} onChange={(e) => set("pais", e.target.value)} maxLength={60} className={INPUT} />
        </Campo>
        <Campo label="Fecha">
          <input type="date" value={f.fecha} onChange={(e) => set("fecha", e.target.value)} className={INPUT} />
        </Campo>
        <Campo label="Qué escribió" className="sm:col-span-3">
          <Textarea value={f.mensaje} onChange={(e) => set("mensaje", e.target.value)} rows={2} maxLength={2000} />
        </Campo>
        <Campo label="Estado">
          <select value={f.estado} onChange={(e) => set("estado", e.target.value as ContactoRed["estado"])} className={INPUT}>
            {ESTADOS_CONTACTO.map((e) => (
              <option key={e}>{e}</option>
            ))}
          </select>
        </Campo>
        <Campo label="Volver a contactar el">
          <input type="date" value={f.proximoContacto ?? ""} onChange={(e) => set("proximoContacto", e.target.value || null)} className={INPUT} />
        </Campo>
        <Campo label="Campaña">
          <select value={f.campanaId ?? ""} onChange={(e) => set("campanaId", e.target.value || null)} className={INPUT}>
            <option value="">Sin campaña</option>
            {(campanas ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </Campo>
      </div>
      <div className="mt-4">
        <p className="text-sm font-bold">Seguimiento</p>
        {f.notas.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sin notas todavía.</p>
        ) : (
          <ul className="mt-1 space-y-1.5">
            {f.notas
              .slice()
              .reverse()
              .map((n, i) => (
                <li key={`${n.fecha}${i}`} className="rounded-xl bg-muted/50 p-2 text-sm">
                  <p className="whitespace-pre-wrap">{n.texto}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {n.autor} · {fecha(n.fecha, true)}
                  </p>
                </li>
              ))}
          </ul>
        )}
        {editable && (
          <Textarea
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            rows={2}
            maxLength={4000}
            className="mt-2"
            placeholder="Nueva nota (se agrega al guardar): ej. le mandé el enlace del demo"
          />
        )}
      </div>
    </DialogoFormulario>
  );
}

/* ───────────── Campañas ───────────── */

function Campanas({ editable }: { editable: boolean }) {
  const { data, isLoading } = useColeccion("campanas");
  const { data: contactos } = useColeccion("contactosRedes");
  const [editando, setEditando] = useState<Campana | "nueva" | null>(null);
  const lista = (data ?? []).slice().sort((a, b) => b.desde.localeCompare(a.desde));
  const deCampana = (id: string) => (contactos ?? []).filter((c) => c.campanaId === id);

  const exportar = () =>
    descargarExcel("campanas", "Campañas", [
      ["Campaña", "Estado", "Desde", "Hasta", "Redes", "Presupuesto", "Moneda", "Alcance", "Clics", "Mensajes", "Demos", "Clientes", "Contactos cargados", "Objetivo"],
      ...lista.map((c) => [c.nombre, c.estado, c.desde, c.hasta ?? "", c.redes.join(", "), c.presupuesto ?? "", c.moneda, c.alcance, c.clics, c.mensajes, c.demos, c.clientes, deCampana(c.id).length, c.objetivo]),
    ]);

  return (
    <Seccion
      titulo="Campañas"
      descripcion="Cada campaña con sus resultados: cuánta gente la vio, cuántos escribieron, cuántos probaron el demo y cuántos contrataron."
      acciones={
        <div className="flex flex-wrap gap-2">
          <BotonExcel onClick={exportar} />
          {editable && (
            <Button size="sm" onClick={() => setEditando("nueva")}>
              <Plus className="mr-1 h-4 w-4" /> Nueva campaña
            </Button>
          )}
        </div>
      }
    >
      {isLoading ? (
        <Cargando />
      ) : lista.length === 0 ? (
        <Vacio titulo="Todavía no hay campañas" texto="Ej.: «Lanzamiento Argentina», «Promo Chile octubre»." />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {lista.map((c) => {
            const costo = c.presupuesto && c.clientes ? c.presupuesto / c.clientes : null;
            return (
              <button key={c.id} type="button" onClick={() => setEditando(c)} className="rounded-2xl border border-border p-4 text-left hover:border-primary/40">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold">{c.nombre}</p>
                    <p className="text-xs text-muted-foreground">
                      {fecha(c.desde)}
                      {c.hasta ? ` → ${fecha(c.hasta)}` : ""} · {c.redes.join(", ") || "sin redes"}
                    </p>
                  </div>
                  <Pildora tono={c.estado === "Activa" ? "ok" : c.estado === "Planificada" ? "primario" : "neutro"}>{c.estado}</Pildora>
                </div>
                <div className="mt-3 grid grid-cols-5 gap-2 text-center">
                  {[
                    ["Alcance", c.alcance],
                    ["Clics", c.clics],
                    ["Mensajes", c.mensajes],
                    ["Demos", c.demos],
                    ["Clientes", c.clientes],
                  ].map(([k, v]) => (
                    <div key={k} className="rounded-xl bg-muted/50 p-2">
                      <p className="text-base font-extrabold">{Number(v).toLocaleString("es-AR")}</p>
                      <p className="text-[10px] font-semibold uppercase text-muted-foreground">{k}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  <Users className="mr-1 inline h-3.5 w-3.5" />
                  {deCampana(c.id).length} contactos cargados
                  {c.presupuesto !== null ? ` · presupuesto ${c.moneda} ${c.presupuesto.toLocaleString("es-AR")}` : ""}
                  {costo !== null ? ` · ${c.moneda} ${costo.toFixed(0)} por cliente` : ""}
                </p>
              </button>
            );
          })}
        </div>
      )}
      {editando && <DialogoCampana inicial={editando === "nueva" ? null : editando} editable={editable} onCerrar={() => setEditando(null)} />}
    </Seccion>
  );
}

function DialogoCampana({ inicial, editable, onCerrar }: { inicial: Campana | null; editable: boolean; onCerrar: () => void }) {
  const guardar = useAccion((c: Campana) => guardarEn("campanas", c), ["campanas"], "Campaña guardada");
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState<Campana>(
    inicial ?? {
      id: nuevoIdLocal("cmp"),
      nombre: "",
      objetivo: "",
      redes: ["Instagram"],
      desde: hoyISO(),
      hasta: null,
      presupuesto: null,
      moneda: "USD",
      estado: "Planificada",
      alcance: 0,
      clics: 0,
      mensajes: 0,
      demos: 0,
      clientes: 0,
      notas: "",
    },
  );
  const set = <K extends keyof Campana>(k: K, v: Campana[K]) => setF((x) => ({ ...x, [k]: v }));
  const alternarRed = (r: RedSocial) => set("redes", f.redes.includes(r) ? f.redes.filter((x) => x !== r) : [...f.redes, r]);
  const enviar = () => {
    if (!f.nombre.trim()) return setError("Escribí el nombre de la campaña.");
    if (f.hasta && f.hasta < f.desde) return setError("La fecha de fin es anterior al inicio.");
    setError(null);
    guardar.mutate({ ...f, nombre: f.nombre.trim() }, { onSuccess: onCerrar });
  };
  return (
    <DialogoFormulario
      abierto
      titulo={inicial ? "Campaña" : "Nueva campaña"}
      onCerrar={onCerrar}
      onGuardar={editable ? enviar : onCerrar}
      textoGuardar={editable ? "Guardar" : "Cerrar"}
      guardando={guardar.isPending}
      error={error}
      ancho="sm:max-w-2xl"
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <Campo label="Nombre" className="sm:col-span-2">
          <input value={f.nombre} onChange={(e) => set("nombre", e.target.value)} maxLength={160} className={INPUT} />
        </Campo>
        <Campo label="Estado">
          <select value={f.estado} onChange={(e) => set("estado", e.target.value as Campana["estado"])} className={INPUT}>
            <option>Planificada</option>
            <option>Activa</option>
            <option>Terminada</option>
          </select>
        </Campo>
        <Campo label="Desde">
          <input type="date" value={f.desde} onChange={(e) => set("desde", e.target.value)} className={INPUT} />
        </Campo>
        <Campo label="Hasta">
          <input type="date" value={f.hasta ?? ""} onChange={(e) => set("hasta", e.target.value || null)} className={INPUT} />
        </Campo>
        <Campo label="Presupuesto">
          <div className="flex gap-2">
            <select value={f.moneda} onChange={(e) => set("moneda", e.target.value as Campana["moneda"])} className={`${INPUT} w-24`}>
              <option>USD</option>
              <option>ARS</option>
            </select>
            <input
              type="number"
              min={0}
              value={f.presupuesto ?? ""}
              onChange={(e) => set("presupuesto", e.target.value === "" ? null : Math.max(0, Number(e.target.value) || 0))}
              className={INPUT}
            />
          </div>
        </Campo>
        <div className="sm:col-span-3">
          <p className="mb-1 text-xs font-semibold">Redes</p>
          <div className="flex flex-wrap gap-1.5">
            {REDES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => alternarRed(r)}
                className={cn("rounded-full border px-2.5 py-1 text-xs font-semibold", f.redes.includes(r) ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground")}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        <Campo label="Objetivo" className="sm:col-span-3">
          <Textarea value={f.objetivo} onChange={(e) => set("objetivo", e.target.value)} rows={2} maxLength={1000} placeholder="Ej.: 20 clínicas probando el demo en Argentina" />
        </Campo>
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground sm:col-span-3">Resultados</p>
        {(["alcance", "clics", "mensajes", "demos", "clientes"] as const).map((k) => (
          <Campo key={k} label={k[0]!.toUpperCase() + k.slice(1)}>
            <input type="number" min={0} value={f[k]} onChange={(e) => set(k, numero(e.target.value))} className={INPUT} />
          </Campo>
        ))}
        <Campo label="Notas" className="sm:col-span-3">
          <Textarea value={f.notas} onChange={(e) => set("notas", e.target.value)} rows={2} maxLength={2000} />
        </Campo>
      </div>
    </DialogoFormulario>
  );
}

/* ───────────── Biblioteca de textos, hashtags e ideas ───────────── */

function Biblioteca({ editable }: { editable: boolean }) {
  const { data, isLoading } = useColeccion("ideasMarketing");
  const borrar = useAccion((id: string) => borrarDe("ideasMarketing", id), ["ideasMarketing"], "Eliminado");
  const [q, setQ] = useState("");
  const [tipo, setTipo] = useState<"" | IdeaMarketing["tipo"]>("");
  const [editando, setEditando] = useState<IdeaMarketing | "nueva" | null>(null);
  const [copiada, setCopiada] = useState<string | null>(null);
  const lista = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (data ?? [])
      .filter((i) => !tipo || i.tipo === tipo)
      .filter((i) => !t || `${i.titulo} ${i.contenido} ${i.etiquetas.join(" ")}`.toLowerCase().includes(t));
  }, [data, q, tipo]);
  const copiar = async (i: IdeaMarketing) => {
    try {
      await navigator.clipboard.writeText(i.contenido);
      setCopiada(i.id);
    } catch {
      /* sin portapapeles */
    }
  };
  return (
    <Seccion
      titulo="Textos e ideas"
      descripcion="Textos que funcionan, grupos de hashtags e ideas para próximas publicaciones."
      acciones={
        editable ? (
          <Button size="sm" onClick={() => setEditando("nueva")}>
            <Plus className="mr-1 h-4 w-4" /> Agregar
          </Button>
        ) : undefined
      }
    >
      <div className="mb-3 flex flex-wrap gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar" className={`${INPUT} pl-9`} />
        </div>
        <select value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)} className={`${INPUT} w-auto`} aria-label="Tipo">
          <option value="">Todo</option>
          <option>Texto</option>
          <option>Hashtags</option>
          <option>Idea</option>
          <option>Imagen / video</option>
        </select>
      </div>
      {isLoading ? (
        <Cargando />
      ) : lista.length === 0 ? (
        <Vacio titulo="La biblioteca está vacía" texto="Guardá acá los textos y hashtags que más usan." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {lista.map((i) => (
            <div key={i.id} className="flex flex-col rounded-2xl border border-border p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{i.titulo}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <Pildora tono="primario">{i.tipo}</Pildora>
                    {i.red && <Pildora>{i.red}</Pildora>}
                  </div>
                </div>
                {editable && (
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setEditando(i)} title="Editar">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" title="Eliminar" onClick={() => confirmar(`¿Eliminar «${i.titulo}»?`) && borrar.mutate(i.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
              <p className="mt-2 flex-1 whitespace-pre-wrap text-sm text-muted-foreground">{i.contenido}</p>
              <Button size="sm" variant="outline" className="mt-3 self-start" onClick={() => void copiar(i)}>
                {copiada === i.id ? <Check className="mr-1 h-3.5 w-3.5" /> : <Copy className="mr-1 h-3.5 w-3.5" />}
                {copiada === i.id ? "Copiado" : "Copiar"}
              </Button>
            </div>
          ))}
        </div>
      )}
      {editando && <DialogoIdea inicial={editando === "nueva" ? null : editando} onCerrar={() => setEditando(null)} />}
    </Seccion>
  );
}

function DialogoIdea({ inicial, onCerrar }: { inicial: IdeaMarketing | null; onCerrar: () => void }) {
  const guardar = useAccion((i: IdeaMarketing) => guardarEn("ideasMarketing", i), ["ideasMarketing"], "Guardado");
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState<IdeaMarketing>(inicial ?? { id: nuevoIdLocal("ide"), tipo: "Texto", titulo: "", contenido: "", red: null, etiquetas: [] });
  const [etiquetas, setEtiquetas] = useState(f.etiquetas.join(", "));
  const enviar = () => {
    if (!f.titulo.trim()) return setError("Escribí un título.");
    setError(null);
    guardar.mutate({ ...f, titulo: f.titulo.trim(), etiquetas: etiquetasDe(etiquetas) }, { onSuccess: onCerrar });
  };
  return (
    <DialogoFormulario abierto titulo={inicial ? "Editar" : "Agregar a la biblioteca"} onCerrar={onCerrar} onGuardar={enviar} guardando={guardar.isPending} error={error}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo label="Título" className="sm:col-span-2">
          <input value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} maxLength={160} className={INPUT} />
        </Campo>
        <Campo label="Tipo">
          <select value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value as IdeaMarketing["tipo"] })} className={INPUT}>
            <option>Texto</option>
            <option>Hashtags</option>
            <option>Idea</option>
            <option>Imagen / video</option>
          </select>
        </Campo>
        <Campo label="Red">
          <select value={f.red ?? ""} onChange={(e) => setF({ ...f, red: (e.target.value || null) as RedSocial | null })} className={INPUT}>
            <option value="">Cualquiera</option>
            {REDES.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </Campo>
        <Campo label="Contenido" className="sm:col-span-2">
          <Textarea value={f.contenido} onChange={(e) => setF({ ...f, contenido: e.target.value })} rows={5} maxLength={4000} />
        </Campo>
        <Campo label="Etiquetas" ayuda="Separadas por coma" className="sm:col-span-2">
          <input value={etiquetas} onChange={(e) => setEtiquetas(e.target.value)} className={INPUT} />
        </Campo>
      </div>
    </DialogoFormulario>
  );
}
