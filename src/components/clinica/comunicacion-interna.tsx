import {
  ArrowLeft,
  AtSign,
  ChevronDown,
  Pin,
  PinOff,
  ClipboardCheck,
  Building2,
  CalendarDays,
  ChevronRight,
  UserRound,
  Check,
  CheckCheck,
  Download,
  FileText,
  Hash,
  ImageIcon,
  Loader2,
  Lock,
  Megaphone,
  MessagesSquare,
  Palette,
  Paperclip,
  Pencil,
  Plus,
  Search,
  SendHorizontal,
  ShieldCheck,
  Trash2,
  Upload,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { HeroModulo } from "@/components/clinica/hero-modulo";
import { FONDOS, prepararImagenFondo, useFondoChat, type FondoChat } from "@/lib/clinica/fondo-chat";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { RolClinica } from "@/lib/clinica/api";
import {
  AREAS_SUGERIDAS,
  PERMISOS_CHAT_INFO,
  abrirDirecto,
  bajarArchivo,
  buscarEnChat,
  cambiarCanal,
  fijarMensaje,
  verFijados,
  verLoPerdido,
  confirmarLectura,
  crearCanal,
  enviarComunicado,
  enviarMensaje,
  guardarPermisosChat,
  pedirAbrir,
  pesoArchivo,
  prepararArchivo,
  quitarMensaje,
  useVersionChat,
  verChat,
  verMensajes,
  type ArchivoNuevo,
  type CanalChat,
  type MensajeChat,
  type PermisosChat,
  type PersonaChat,
  type ReferenciaChat,
  type PerdidoChat,
  type ResultadoBusqueda,
  type ResumenChat,
  type RolChat,
} from "@/lib/clinica/chat";
import { useNavigate } from "@tanstack/react-router";
import { Seleccion } from "@/components/ui/seleccion";
import {
  PRIORIDADES_NOTIF,
  cambiarEstadoNotif,
  setNotificaciones,
  storeNotificaciones,
  type PrioridadNotif,
} from "@/lib/cloud-esther/notificaciones-store";
import { useClinicaReal } from "@/lib/clinica/modo-clinica";
import { puedeVer } from "@/lib/clinica/permisos";
import { useConIA } from "@/lib/cloud-esther/niveles";
import { preguntarIA } from "@/lib/cloud-esther/esther-llm";
import { CaraEsther } from "@/components/cloud-esther/esther-ai/CaraEsther";
import { usePacientes } from "@/lib/cloud-esther/pacientes";
import { storeAgenda } from "@/lib/cloud-esther/agenda-store";
import { esClinicaReal } from "@/lib/clinica/modo-clinica";

/* Ubicación: src/components/clinica/comunicacion-interna.tsx
   COMUNICACIÓN INTERNA (estilo Teams) — todos los planes.
   Izquierda: canales (General y por área) y mensajes privados. Centro: la conversación.
   Derecha (pantallas grandes): miembros y archivos del canal.
   Comunicados con «Confirmar lectura» y, para quien lo mandó, quién lo leyó y quién falta.
   Lo que cada rol puede hacer lo decide el Administrador («Permisos del chat»). */

const COLOR_ROL: Record<RolClinica, string> = {
  admin: "from-primary to-fuchsia-500",
  odontologo: "from-sky-500 to-sky-700",
  secretaria: "from-amber-400 to-amber-600",
  asistente: "from-emerald-500 to-emerald-700",
};
const CHIP_ROL: Record<RolClinica, string> = {
  admin: "bg-primary/10 text-primary",
  odontologo: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  secretaria: "bg-amber-500/15 text-amber-800 dark:text-amber-200",
  asistente: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
};
const NOMBRE_ROL_CHAT: Record<RolChat, string> = { odontologo: "Odontólogos", secretaria: "Secretaría", asistente: "Asistentes" };

const iniciales = (n: string) =>
  n
    .replace(/\(.*?\)/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "?";

const hora = (iso: string) => new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false });
function cuandoCorto(iso: string) {
  const d = new Date(iso);
  const hoy = new Date();
  if (d.toDateString() === hoy.toDateString()) return hora(iso);
  const ayer = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 1);
  if (d.toDateString() === ayer.toDateString()) return "Ayer";
  return d.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}
function diaLargo(iso: string) {
  const d = new Date(iso);
  const hoy = new Date();
  if (d.toDateString() === hoy.toDateString()) return "Hoy";
  const ayer = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 1);
  if (d.toDateString() === ayer.toDateString()) return "Ayer";
  const t = d.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
  return t.charAt(0).toUpperCase() + t.slice(1);
}
const fechaHora = (iso: string) =>
  new Date(iso).toLocaleString("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });

function Avatar({ nombre, rol, tam = "md" }: { nombre: string; rol: RolClinica; tam?: "sm" | "md" | "lg" }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-bold text-white shadow-sm ring-2 ring-background",
        COLOR_ROL[rol],
        tam === "sm" ? "size-7 text-[10px]" : tam === "lg" ? "size-11 text-sm" : "size-9 text-xs",
      )}
    >
      {iniciales(nombre)}
    </span>
  );
}

function IconoCanal({ c, activo }: { c: CanalChat; activo?: boolean }) {
  const Icono = c.tipo === "general" ? Building2 : Hash;
  return (
    <span
      className={cn(
        "grid size-10 shrink-0 place-items-center rounded-2xl transition-colors",
        c.tipo === "general"
          ? "bg-gradient-to-br from-primary to-fuchsia-500 text-white shadow-[0_8px_18px_-10px_rgba(124,58,237,0.9)]"
          : activo
            ? "bg-primary text-white"
            : "bg-primary/[0.08] text-primary",
      )}
    >
      <Icono className="size-[18px]" />
    </span>
  );
}

/** Interruptor simple (sin dependencias): Sí / No */
function Interruptor({ on, onClick, etiqueta }: { on: boolean; onClick: () => void; etiqueta: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={etiqueta}
      onClick={onClick}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        on ? "bg-gradient-to-r from-primary to-fuchsia-500" : "bg-muted-foreground/25",
      )}
    >
      <span className={cn("size-5 rounded-full bg-white shadow transition-transform", on ? "translate-x-[22px]" : "translate-x-0.5")} />
    </button>
  );
}

/** Lista para elegir personas (con buscador y «todos los de un rol») */
function ElegirPersonas({
  personas,
  elegidas,
  onCambio,
  yo,
}: {
  personas: PersonaChat[];
  elegidas: string[];
  onCambio: (ids: string[]) => void;
  yo: string;
}) {
  const [q, setQ] = useState("");
  const lista = personas.filter((p) => p.id !== yo && (!q || p.nombre.toLowerCase().includes(q.toLowerCase())));
  const roles = [...new Set(personas.filter((p) => p.id !== yo).map((p) => p.rol))];
  const alternar = (id: string) => onCambio(elegidas.includes(id) ? elegidas.filter((x) => x !== id) : [...elegidas, id]);
  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap gap-1.5">
        {roles.map((r) => {
          const ids = personas.filter((p) => p.rol === r && p.id !== yo).map((p) => p.id);
          const todos = ids.every((id) => elegidas.includes(id));
          return (
            <button
              key={r}
              type="button"
              onClick={() => onCambio(todos ? elegidas.filter((x) => !ids.includes(x)) : [...new Set([...elegidas, ...ids])])}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold transition",
                todos ? "bg-primary text-white" : cn(CHIP_ROL[r], "hover:ring-1 hover:ring-primary/30"),
              )}
            >
              {todos ? "✓ " : "+ "}
              {personas.find((p) => p.rol === r)?.rolNombre ?? r}
            </button>
          );
        })}
      </div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar persona" className="h-10 rounded-xl pl-9" />
      </div>
      <ul className="max-h-56 space-y-1 overflow-y-auto pr-1 scroll-sutil">
        {lista.length === 0 && <li className="py-4 text-center text-sm text-muted-foreground">No hay nadie con ese nombre.</li>}
        {lista.map((p) => {
          const on = elegidas.includes(p.id);
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => alternar(p.id)}
                aria-pressed={on}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl px-2.5 py-2 text-left transition",
                  on ? "bg-primary/[0.08] ring-1 ring-primary/30" : "hover:bg-muted/60",
                )}
              >
                <Avatar nombre={p.nombre} rol={p.rol} tam="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{p.nombre}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">{p.rolNombre}</span>
                </span>
                <span
                  className={cn(
                    "grid size-5 place-items-center rounded-md border transition",
                    on ? "border-primary bg-primary text-white" : "border-muted-foreground/30",
                  )}
                >
                  {on && <Check className="size-3.5" />}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ─────────── Mientras no estabas ─────────── */
/** Resumen sin IA: quién te nombró, qué falta confirmar y dónde hubo más movimiento. */
function resumenPorReglas(lista: PerdidoChat[]): string[] {
  const lineas: string[] = [];
  const conMencion = lista.filter((c) => c.menciones > 0);
  if (conMencion.length) {
    const quien = conMencion.flatMap((c) => c.ultimos.filter((u) => u.mencion).map((u) => u.autor));
    lineas.push(`Te nombraron en ${conMencion.map((c) => c.canal).join(", ")}${quien.length ? ` (${[...new Set(quien)].join(", ")})` : ""}.`);
  }
  const pend = lista.reduce((s, c) => s + c.pendientes, 0);
  if (pend) lineas.push(`Tenés ${pend} comunicado${pend === 1 ? "" : "s"} por confirmar.`);
  const privados = lista.filter((c) => c.tipoCanal === "directo" && c.nuevos > 0).map((c) => c.canal);
  if (privados.length) lineas.push(`Te escribieron por privado: ${privados.join(", ")}.`);
  const top = [...lista].filter((c) => c.tipoCanal !== "directo").sort((a, b) => b.nuevos - a.nuevos)[0];
  if (top && top.nuevos) {
    const ult = top.ultimos[top.ultimos.length - 1];
    lineas.push(`Donde más se habló: ${top.canal}${ult ? ` — lo último, ${ult.autor}: «${ult.texto.slice(0, 80)}${ult.texto.length > 80 ? "…" : ""}»` : ""}.`);
  }
  return lineas.slice(0, 3);
}

function MientrasNoEstabas({ onAbrir }: { onAbrir: (canalId: string) => void }) {
  const [lista, setLista] = useState<PerdidoChat[] | null>(null);
  const [cerrado, setCerrado] = useState(false);
  const [resumen, setResumen] = useState<string[] | null>(null);
  const [resumiendo, setResumiendo] = useState(false);
  const conIA = useConIA();
  useEffect(() => {
    verLoPerdido()
      .then(setLista)
      .catch(() => setLista([]));
  }, []);
  if (cerrado || !lista || lista.length === 0) return null;
  const totalNuevos = lista.reduce((s, c) => s + c.nuevos, 0);
  const desde = lista
    .map((c) => c.desde)
    .filter((x): x is string => !!x)
    .sort()[0];
  const resumir = async () => {
    setResumiendo(true);
    try {
      const contexto = lista
        .map(
          (c) =>
            `Conversación ${c.tipoCanal === "directo" ? `privada con ${c.canal}` : c.canal} (${c.nuevos} nuevos${c.pendientes ? `, ${c.pendientes} comunicados por confirmar` : ""}):\n` +
            c.ultimos.map((u) => `- ${u.autor}${u.tipo === "comunicado" ? " (comunicado)" : ""}${u.mencion ? " (me nombra)" : ""}: ${u.texto}`).join("\n"),
        )
        .join("\n\n");
      const r = await preguntarIA({
        data: {
          pregunta:
            "Resumí para esta persona del equipo de la clínica lo que se perdió en el chat interno, en EXACTAMENTE 3 líneas cortas, en español rioplatense. Primero lo que la nombra o le piden a ella y lo que tiene que confirmar; después lo más importante. Sin saludos ni viñetas, una idea por línea. No inventes nada que no esté en el contexto.",
          contexto,
        },
      }).catch(() => null);
      const lineas = (r?.text ?? "")
        .split("\n")
        .map((l) => l.replace(/^[-•*\d.)\s]+/, "").trim())
        .filter(Boolean)
        .slice(0, 3);
      setResumen(lineas.length ? lineas : resumenPorReglas(lista));
    } finally {
      setResumiendo(false);
    }
  };
  return (
    <section className="ce-tarjeta relative overflow-hidden p-4 sm:p-5" aria-label="Mientras no estabas">
      <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-fuchsia-500 to-amber-400" />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-bold tracking-tight">Mientras no estabas</h2>
          <p className="text-xs text-muted-foreground">
            {totalNuevos} mensaje{totalNuevos === 1 ? "" : "s"} en {lista.length} conversaci{lista.length === 1 ? "ón" : "ones"}
            {desde ? ` · desde ${cuandoCorto(desde)}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {conIA && !resumen && (
            <Button onClick={() => void resumir()} disabled={resumiendo} className="ce-boton h-9 rounded-full px-4 text-xs">
              {resumiendo ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <CaraEsther className="mr-1.5 size-4" />}
              Que Esther lo resuma
            </Button>
          )}
          <Button variant="outline" onClick={() => setCerrado(true)} className="h-9 rounded-full px-4 text-xs">
            Listo
          </Button>
        </div>
      </div>
      {resumen && (
        <div className="mt-3 flex gap-3 rounded-2xl bg-gradient-to-br from-primary/[0.07] to-fuchsia-500/[0.05] p-3 ring-1 ring-primary/15">
          <CaraEsther className="size-7 shrink-0" />
          <ul className="min-w-0 space-y-1 text-[13px] leading-relaxed">
            {resumen.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </div>
      )}
      <ul data-movil="1col" className="mt-3 grid gap-2 sm:grid-cols-2">
        {lista.slice(0, 4).map((c) => {
          const ult = c.ultimos[c.ultimos.length - 1];
          return (
            <li key={c.canalId}>
              <button
                type="button"
                onClick={() => {
                  setCerrado(true);
                  onAbrir(c.canalId);
                }}
                className="flex w-full items-start gap-3 rounded-2xl bg-background/70 p-3 text-left ring-1 ring-border/70 transition hover:ring-primary/40"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  {c.tipoCanal === "directo" ? <Lock className="size-4" /> : c.tipoCanal === "general" ? <Building2 className="size-4" /> : <Hash className="size-4" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="truncate text-sm font-semibold">{c.canal}</span>
                    {c.nuevos > 0 && (
                      <span className="rounded-full bg-gradient-to-r from-primary to-fuchsia-500 px-1.5 py-px text-[10px] font-bold text-white">{c.nuevos}</span>
                    )}
                    {c.menciones > 0 && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-fuchsia-500 px-1.5 py-px text-[10px] font-bold text-white">
                        <AtSign className="size-2.5" /> te nombran
                      </span>
                    )}
                    {c.pendientes > 0 && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/15 px-1.5 py-px text-[10px] font-bold text-amber-700 dark:text-amber-300">
                        <Megaphone className="size-2.5" /> {c.pendientes} por confirmar
                      </span>
                    )}
                  </span>
                  {ult && (
                    <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground/80">{ult.autor}:</span> {ult.texto || "📎 Archivo"}
                    </span>
                  )}
                </span>
                <ChevronRight className="mt-2 size-4 shrink-0 text-muted-foreground" />
              </button>
            </li>
          );
        })}
      </ul>
      {lista.length > 4 && <p className="mt-2 text-xs text-muted-foreground">Y {lista.length - 4} conversaciones más en la lista.</p>}
      {!conIA && <p className="mt-3 text-[11px] text-muted-foreground">Desde el plan Plus, Esther te lo resume en 3 líneas.</p>}
    </section>
  );
}

/** Marca lo buscado dentro del texto (sin importar acentos ni mayúsculas). */
function Resaltar({ texto, q }: { texto: string; q: string }) {
  const norm = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  // Misma longitud: el texto normalizado letra por letra (las tildes se quitan de a una)
  const plano = Array.from(texto).map((ch) => norm(ch) || ch).join("");
  const i = plano.indexOf(norm(q));
  if (i < 0 || plano.length !== texto.length) return <>{texto}</>;
  return (
    <>
      {texto.slice(0, i)}
      <mark className="rounded bg-amber-300/60 px-0.5 text-inherit">{texto.slice(i, i + q.length)}</mark>
      {texto.slice(i + q.length)}
    </>
  );
}

/* ─────────── Menciones con @ ─────────── */
const sinAcentosChat = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const escaparRegex = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** El texto con las menciones («@Nombre») resaltadas. */
function TextoConMenciones({ texto, menciones, clara }: { texto: string; menciones: { id: string; nombre: string }[]; clara: boolean }) {
  if (!menciones.length) return <>{texto}</>;
  const nombres = [...menciones.map((m) => m.nombre)].sort((a, b) => b.length - a.length).map(escaparRegex);
  const partes = texto.split(new RegExp(`(@(?:${nombres.join("|")}))`, "g"));
  return (
    <>
      {partes.map((p, i) =>
        i % 2 === 1 ? (
          <span key={i} className={cn("rounded-md px-1 font-semibold", clara ? "bg-white/20" : "bg-primary/10 text-primary")}>
            {p}
          </span>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

/* ─────────── Convertir un mensaje en tarea (va a Notificaciones) ─────────── */
const AREAS_TAREA = ["Recepción", "Administración", "Dirección"];
const idTareaDe = (mensajeId: string) => `chat-${mensajeId}`;

/** ¿Puede esta persona crear tareas? (necesita ver Notificaciones) */
function usePuedeCrearTareas() {
  const real = useClinicaReal();
  return !real || puedeVer(real.rol, "notificaciones", real.sesion.usuario.modulos);
}

/** Estado de la tarea que salió de un mensaje (la ven todos en la conversación). */
function useTareaDeMensaje(mensajeId: string) {
  const { manuales, estados } = storeNotificaciones.usar();
  const id = idTareaDe(mensajeId);
  const t = manuales.find((x) => x.id === id);
  return t ? { ...t, hecha: !!estados[id]?.completada } : null;
}

function TareaDesdeMensaje({
  m,
  res,
  canalNombre,
  onCerrar,
}: {
  m: MensajeChat;
  res: ResumenChat;
  canalNombre: string;
  onCerrar: () => void;
}) {
  const yo = res.personas.find((p) => p.id === res.yo.id)?.nombre ?? "Equipo";
  const base = (m.texto || (m.referencia ? `${m.referencia.tipo === "turno" ? "Turno de" : "Paciente:"} ${m.referencia.nombre}` : "")).replace(/\s+/g, " ").trim();
  const [titulo, setTitulo] = useState(base.length > 80 ? `${base.slice(0, 77)}…` : base);
  const [asignado, setAsignado] = useState(m.mio ? "" : m.autor.id === res.yo.id ? "" : yo);
  const [vence, setVence] = useState(diaLocal());
  const [hora, setHora] = useState("");
  const [prioridad, setPrioridad] = useState<PrioridadNotif>("Normal");
  const [error, setError] = useState("");
  const personas = res.personas.map((p) => p.nombre);
  const guardar = () => {
    if (!titulo.trim()) return setError("Escribí qué hay que hacer.");
    if (vence && vence < diaLocal()) return setError("La fecha no puede ser pasada.");
    const id = idTareaDe(m.id);
    const ref = m.referencia ? `\n${m.referencia.tipo === "turno" ? "Turno" : "Paciente"}: ${m.referencia.nombre}${m.referencia.detalle ? ` (${m.referencia.detalle})` : ""}` : "";
    const detalle = `${m.mio ? yo : m.autor.nombre} en ${canalNombre}: «${m.texto.slice(0, 500)}»${ref}`.trim();
    setNotificaciones("manuales", (prev) => [
      {
        id,
        titulo: titulo.trim(),
        detalle,
        categoria: "Comunicación",
        prioridad,
        asignado,
        vence,
        horaVence: hora,
        creada: new Date().toISOString(),
        creadaPor: yo,
      },
      ...prev.filter((x) => x.id !== id),
    ]);
    cambiarEstadoNotif([{ id, titulo: titulo.trim() }], {}, "Creó desde el chat", yo);
    toast.success(asignado ? `Tarea creada para ${asignado}` : "Tarea creada", { description: "Está en Notificaciones." });
    onCerrar();
  };
  const campo = "h-11 w-full rounded-2xl border border-input bg-background px-3 text-sm outline-none focus:border-primary/45 focus:ring-4 focus:ring-primary/10";
  return (
    <Dialog open onOpenChange={(v) => !v && onCerrar()}>
      <DialogContent className="max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle>Convertir en tarea</DialogTitle>
          <DialogDescription>Queda en Notificaciones con responsable y fecha. El mensaje muestra cuando está hecha.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold">Qué hay que hacer</span>
            <Input autoFocus value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={120} className="h-11 rounded-2xl" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold">Responsable</span>
            <Seleccion value={asignado} onChange={(e) => setAsignado(e.target.value)} className={`${campo} appearance-none pr-8`}>
              <option value="">Sin asignar</option>
              <optgroup label="Personas">
                {personas.map((n) => (
                  <option key={n} value={n}>
                    {n === yo ? `${n} (yo)` : n}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Áreas">
                {AREAS_TAREA.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </optgroup>
            </Seleccion>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold">Para el</span>
              <input type="date" value={vence} min={diaLocal()} onChange={(e) => setVence(e.target.value)} className={campo} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold">Hora (opcional)</span>
              <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} className={campo} />
            </label>
          </div>
          <div>
            <span className="mb-1 block text-xs font-semibold">Prioridad</span>
            <div className="grid grid-cols-4 gap-1 rounded-2xl bg-muted p-1">
              {PRIORIDADES_NOTIF.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPrioridad(p)}
                  aria-pressed={prioridad === p}
                  className={cn(
                    "rounded-xl py-1.5 text-xs font-semibold transition",
                    prioridad === p ? (p === "Urgente" ? "bg-rose-500 text-white" : "bg-card text-primary shadow-sm") : "text-muted-foreground",
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="text-xs font-semibold text-destructive">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={onCerrar} className="rounded-full">
              Cancelar
            </Button>
            <Button onClick={guardar} className="ce-boton rounded-full px-5">
              <ClipboardCheck className="mr-1.5 size-4" /> Crear tarea
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Chip debajo del mensaje cuando ya es una tarea */
function ChipTarea({ mensajeId, clara }: { mensajeId: string; clara: boolean }) {
  const t = useTareaDeMensaje(mensajeId);
  if (!t) return null;
  return (
    <span
      className={cn(
        "mt-2 inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
        t.hecha
          ? clara
            ? "bg-white/20"
            : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          : clara
            ? "bg-white/15"
            : "bg-primary/[0.08] text-primary",
      )}
    >
      {t.hecha ? <CheckCheck className="size-3.5 shrink-0" /> : <ClipboardCheck className="size-3.5 shrink-0" />}
      <span className="truncate">
        {t.hecha ? "Tarea hecha" : "Tarea"}
        {t.asignado ? ` · ${t.asignado}` : ""}
        {!t.hecha && t.vence ? ` · ${t.vence === diaLocal() ? "hoy" : formatearFecha(t.vence).slice(0, 5)}` : ""}
      </span>
    </span>
  );
}

/* ─────────── Hablar de un paciente o un turno ─────────── */
const diaLocal = (masDias = 0) => {
  const d = new Date(Date.now() + masDias * 86_400_000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const hoyISO = () => diaLocal();
const formatearFecha = (iso: string) => iso.slice(0, 10).split("-").reverse().join("/");
const diaTurno = (fecha: string) =>
  fecha === diaLocal() ? "Hoy" : fecha === diaLocal(1) ? "Mañana" : formatearFecha(fecha).slice(0, 5);

/** Ventana para elegir el paciente o el turno del que se habla. */
function ElegirReferencia({ abierto, onCerrar, onElegir }: { abierto: boolean; onCerrar: () => void; onElegir: (r: ReferenciaChat) => void }) {
  const [tab, setTab] = useState<"paciente" | "turno">("paciente");
  const [q, setQ] = useState("");
  const { pacientes } = usePacientes();
  const { turnos } = storeAgenda.usar();
  const norm = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const busca = norm(q.trim());
  const listaPac = pacientes
    .filter((p) => !busca || norm(`${p.nombre} ${p.apellido} ${p.documento ?? ""}`).includes(busca))
    .sort((a, b) => `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`))
    .slice(0, 40);
  // Turnos de la última semana en adelante, los más cercanos primero
  const desde = diaLocal(-7);
  const hoy = hoyISO();
  const listaTur = turnos
    .filter((t) => t.fecha >= desde && (!busca || norm(`${t.paciente} ${t.tratamiento} ${t.odontologo}`).includes(busca)))
    .sort((a, b) => {
      const fa = a.fecha >= hoy ? 0 : 1;
      const fb = b.fecha >= hoy ? 0 : 1;
      return fa - fb || (fa === 0 ? `${a.fecha}${a.hora}`.localeCompare(`${b.fecha}${b.hora}`) : `${b.fecha}${b.hora}`.localeCompare(`${a.fecha}${a.hora}`));
    })
    .slice(0, 40);
  const elegir = (r: ReferenciaChat) => {
    onElegir(r);
    setQ("");
    onCerrar();
  };
  const fila = "flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition hover:bg-primary/[0.06] focus-visible:bg-primary/[0.06] focus-visible:outline-none";
  return (
    <Dialog open={abierto} onOpenChange={(v) => !v && onCerrar()}>
      <DialogContent className="max-w-md rounded-3xl p-0">
        <DialogHeader className="px-5 pt-5">
          <DialogTitle>¿De quién hablás?</DialogTitle>
          <DialogDescription>Tu compañero toca el mensaje y abre la ficha o el turno.</DialogDescription>
        </DialogHeader>
        <div className="px-5">
          <div className="grid grid-cols-2 rounded-full bg-muted p-1" role="tablist">
            {(
              [
                ["paciente", "Paciente", UserRound],
                ["turno", "Turno", CalendarDays],
              ] as const
            ).map(([id, label, Icono]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={cn(
                  "inline-flex items-center justify-center gap-1.5 rounded-full py-2 text-sm font-semibold transition",
                  tab === id ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icono className="size-4" /> {label}
              </button>
            ))}
          </div>
          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={tab === "paciente" ? "Buscar por nombre o documento" : "Buscar por paciente, tratamiento o profesional"}
              className="h-11 rounded-full pl-9"
              aria-label="Buscar"
            />
          </div>
        </div>
        <div className="mt-2 max-h-[52vh] overflow-y-auto px-2 pb-4">
          {tab === "paciente" ? (
            listaPac.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">{q ? "Ningún paciente con ese nombre." : "Todavía no hay pacientes."}</p>
            ) : (
              listaPac.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={fila}
                  onClick={() =>
                    elegir({ tipo: "paciente", id: p.id, nombre: `${p.nombre} ${p.apellido}`.trim(), detalle: p.documento ? `DNI ${p.documento}` : (p.telefono ?? "") })
                  }
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                    <UserRound className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">
                      {p.nombre} {p.apellido}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">{p.documento ? `DNI ${p.documento}` : p.telefono || "—"}</span>
                  </span>
                </button>
              ))
            )
          ) : listaTur.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">{q ? "Ningún turno con esa búsqueda." : "No hay turnos desde la semana pasada."}</p>
          ) : (
            listaTur.map((t) => {
              const detalle = `${diaTurno(t.fecha)} ${t.hora} · ${t.tratamiento}${t.odontologo ? ` · ${t.odontologo}` : ""}`;
              return (
                <button
                  key={t.id}
                  type="button"
                  className={fila}
                  onClick={() => elegir({ tipo: "turno", id: t.id, nombre: t.paciente, detalle: `${formatearFecha(t.fecha).slice(0, 5)} ${t.hora} · ${t.tratamiento}`.slice(0, 160) })}
                >
                  <span className="grid w-12 shrink-0 place-items-center rounded-2xl bg-primary/10 py-1.5 text-primary">
                    <span className="text-[10px] font-bold uppercase leading-none">{diaTurno(t.fecha)}</span>
                    <span className="mt-0.5 text-xs font-bold tabular-nums leading-none">{t.hora}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{t.paciente}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {detalle.split(" · ").slice(1).join(" · ")} · {t.estado}
                    </span>
                  </span>
                </button>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Tarjeta del paciente o turno dentro del mensaje: al tocarla abre la ficha o el turno. */
function TarjetaReferencia({ r, clara }: { r: ReferenciaChat; clara: boolean }) {
  const navigate = useNavigate();
  const Icono = r.tipo === "turno" ? CalendarDays : UserRound;
  return (
    <button
      type="button"
      onClick={() => {
        pedirAbrir(r);
        void navigate({ to: r.tipo === "turno" ? "/demo/agenda" : "/demo/pacientes" });
      }}
      className={cn(
        "mt-2 flex w-72 max-w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition first:mt-0",
        clara ? "bg-white/15 hover:bg-white/25" : "bg-background ring-1 ring-border hover:ring-primary/40",
      )}
    >
      <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", clara ? "bg-white/20" : "bg-primary/10 text-primary")}>
        <Icono className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-bold uppercase tracking-[0.1em] opacity-70">{r.tipo === "turno" ? "Turno" : "Paciente"}</span>
        <span className="block truncate text-xs font-semibold">{r.nombre}</span>
        {r.detalle && <span className="block truncate text-[11px] opacity-75">{r.detalle}</span>}
      </span>
      <span className="inline-flex shrink-0 items-center text-[11px] font-semibold opacity-80">
        {r.tipo === "turno" ? "Ver" : "Ficha"} <ChevronRight className="size-3.5" />
      </span>
    </button>
  );
}

/** Botón para adjuntar un archivo */
function Adjuntar({ archivo, onArchivo, compacto = false }: { archivo: ArchivoNuevo | null; onArchivo: (a: ArchivoNuevo | null) => void; compacto?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={ref}
        type="file"
        className="hidden"
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          const r = await prepararArchivo(f);
          if (typeof r === "string") toast.error(r);
          else onArchivo(r);
        }}
      />
      {archivo ? (
        <span className="inline-flex max-w-full items-center gap-2 rounded-full bg-primary/[0.08] py-1 pl-3 pr-1 text-xs font-semibold text-primary">
          <Paperclip className="size-3.5 shrink-0" />
          <span className="truncate">{archivo.nombre}</span>
          <button type="button" onClick={() => onArchivo(null)} className="grid size-6 place-items-center rounded-full hover:bg-primary/15" aria-label="Quitar archivo">
            <X className="size-3.5" />
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full text-sm font-semibold text-muted-foreground transition hover:bg-primary/10 hover:text-primary",
            compacto ? "size-10 justify-center" : "px-3 py-2",
          )}
          title="Adjuntar archivo (hasta 5 MB)"
          aria-label="Adjuntar archivo"
        >
          <Paperclip className="size-[18px]" />
          {!compacto && "Adjuntar archivo"}
        </button>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════ */

export function ComunicacionInterna({ conEncabezado = true }: { conEncabezado?: boolean }) {
  const [res, setRes] = useState<ResumenChat | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [canalId, setCanalId] = useState<string | null>(null);
  const [vistaMovil, setVistaMovil] = useState<"lista" | "chat">("lista");
  const [buscar, setBuscar] = useState("");
  // Buscador de mensajes (en todas las conversaciones que la persona ve)
  const [hallados, setHallados] = useState<ResultadoBusqueda[] | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [irA, setIrA] = useState<{ canalId: string; mensajeId: string } | null>(null);
  useEffect(() => {
    const q = buscar.trim();
    if (q.length < 2) {
      setHallados(null);
      return;
    }
    setBuscando(true);
    const t = setTimeout(() => {
      buscarEnChat(q)
        .then(setHallados)
        .catch((e: unknown) => {
          setHallados([]);
          toast.error(e instanceof Error ? e.message : "No se pudo buscar.");
        })
        .finally(() => setBuscando(false));
    }, 350);
    return () => clearTimeout(t);
  }, [buscar]);
  const [dialogo, setDialogo] = useState<null | "comunicado" | "canal" | "privado" | "permisos" | "editar">(null);
  const version = useVersionChat();
  const real = esClinicaReal();

  const cargar = useCallback(() => {
    verChat()
      .then((r) => {
        setRes(r);
        setError(null);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "No se pudo cargar la comunicación interna."));
  }, []);
  useEffect(cargar, [cargar, version]);
  // Clínica real: se actualiza sola cada 20 segundos (si la pestaña está a la vista)
  useEffect(() => {
    if (!real) return;
    const t = setInterval(() => document.visibilityState === "visible" && cargar(), 20_000);
    return () => clearInterval(t);
  }, [real, cargar]);

  // Al abrir: primero lo que falta confirmar; si no, el General
  useEffect(() => {
    if (!res || canalId) return;
    const conPendiente = res.canales.find((c) => c.pendientes > 0);
    const general = res.canales.find((c) => c.tipo === "general");
    setCanalId((conPendiente ?? general ?? res.canales[0])?.id ?? null);
    // Desde un aviso: /…#canal=<id>
    const m = /canal=([\w-]+)/.exec(window.location.hash);
    if (m?.[1] && res.canales.some((c) => c.id === m[1])) {
      setCanalId(m[1]);
      setVistaMovil("chat");
    }
  }, [res, canalId]);

  const canal = res?.canales.find((c) => c.id === canalId) ?? null;

  if (error && !res) {
    return (
      <div className="ce-tarjeta p-8 text-center">
        <p className="text-sm text-destructive">{error}</p>
        <Button onClick={cargar} variant="outline" className="mt-4 rounded-full">
          Probar de nuevo
        </Button>
      </div>
    );
  }
  if (!res) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Abriendo la comunicación interna…
        </p>
      </div>
    );
  }

  const p = res.yo.permisos;
  const esAdmin = res.yo.rol === "admin";
  const q = buscar.trim().toLowerCase();
  const filtra = (c: CanalChat) => !q || c.nombre.toLowerCase().includes(q) || c.area.toLowerCase().includes(q);
  const orden = (a: CanalChat, b: CanalChat) => (b.ultimo?.fecha ?? b.creado).localeCompare(a.ultimo?.fecha ?? a.creado);
  const canales = res.canales.filter((c) => c.tipo !== "directo" && filtra(c)).sort((a, b) => (a.tipo === "general" ? -1 : b.tipo === "general" ? 1 : orden(a, b)));
  const privados = res.canales.filter((c) => c.tipo === "directo" && filtra(c)).sort(orden);
  const personaDe = (c: CanalChat) => res.personas.find((x) => c.miembros.includes(x.id) && x.id !== res.yo.id);
  const abrir = (id: string) => {
    setCanalId(id);
    setVistaMovil("chat");
  };

  const acciones = (
    <>
      {p.comunicados && (
        <Button onClick={() => setDialogo("comunicado")} className="ce-boton h-10 rounded-full px-5">
          <Megaphone className="mr-2 size-4" /> Nuevo comunicado
        </Button>
      )}
      {esAdmin && (
        <Button variant="outline" onClick={() => setDialogo("permisos")} className="ce-levanta h-10 rounded-full px-4">
          <ShieldCheck className="mr-2 size-4" /> Permisos
        </Button>
      )}
    </>
  );

  return (
    <div className="ce-clinica space-y-5">
      {conEncabezado && (
        <HeroModulo
          chip="Comunicación interna"
          icon={MessagesSquare}
          titulo="Comunicación interna"
          descripcion="El chat de tu equipo: comunicados con confirmación de lectura, canales por área, mensajes privados y archivos. Todo queda dentro de tu clínica."
          acciones={acciones}
          kpis={[
            { l: "Sin leer", v: res.avisos.noLeidos, s: "mensajes nuevos", i: MessagesSquare },
            { l: "Por confirmar", v: res.avisos.pendientes, s: "comunicados a leer", i: Megaphone },
            { l: "Canales", v: res.canales.filter((c) => c.tipo !== "directo").length, s: "General y por área", i: Hash },
            { l: "Equipo", v: res.personas.length, s: "personas en el chat", i: Users },
          ]}
        />
      )}
      {!conEncabezado && <div className="flex flex-wrap justify-end gap-2">{acciones}</div>}
      <MientrasNoEstabas onAbrir={abrir} />

      <section
        className={cn(
          "ce-tarjeta grid overflow-hidden",
          "h-[calc(100dvh-9rem)] min-h-[520px] lg:h-[min(78vh,780px)]",
          "lg:grid-cols-[310px_minmax(0,1fr)] 2xl:grid-cols-[310px_minmax(0,1fr)_290px]",
        )}
      >
        {/* ── Lista de conversaciones ── */}
        <aside
          className={cn(
            "min-h-0 flex-col border-border/70 bg-gradient-to-b from-primary/[0.035] to-transparent lg:flex lg:border-r",
            vistaMovil === "lista" ? "flex" : "hidden",
          )}
        >
          <div className="space-y-3 border-b border-border/60 p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={buscar}
                onChange={(e) => setBuscar(e.target.value)}
                placeholder="Buscar conversación o mensaje"
                className="h-10 rounded-full border-transparent bg-card pl-10 ring-1 ring-border"
                aria-label="Buscar conversación"
              />
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <AccionRapida icono={Megaphone} etiqueta="Comunicado" activo={p.comunicados} onClick={() => setDialogo("comunicado")} />
              <AccionRapida icono={Hash} etiqueta="Canal" activo={p.canales} onClick={() => setDialogo("canal")} />
              <AccionRapida icono={UserPlus} etiqueta="Privado" activo onClick={() => setDialogo("privado")} />
            </div>
          </div>
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-3 scroll-sutil">
            {buscar.trim().length >= 2 && (
              <GrupoLista titulo="Mensajes" cantidad={hallados?.length ?? 0}>
                {buscando && !hallados && (
                  <li className="flex items-center gap-2 px-2.5 py-3 text-xs text-muted-foreground">
                    <Loader2 className="size-3.5 animate-spin" /> Buscando…
                  </li>
                )}
                {hallados?.length === 0 && <li className="px-2.5 py-3 text-xs text-muted-foreground">Ningún mensaje con «{buscar.trim()}».</li>}
                {hallados?.map((h) => (
                  <li key={h.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setIrA({ canalId: h.canalId, mensajeId: h.id });
                        abrir(h.canalId);
                      }}
                      className="w-full rounded-2xl px-2.5 py-2.5 text-left transition hover:bg-card/80"
                    >
                      <span className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span className="truncate font-semibold text-foreground/80">
                          {h.tipoCanal === "directo" ? h.canal : `# ${h.canal}`}
                        </span>
                        <span className="ml-auto shrink-0 tabular-nums">{cuandoCorto(h.fecha)}</span>
                      </span>
                      <span className="mt-0.5 line-clamp-2 block text-xs">
                        <span className="font-semibold">{h.autor}: </span>
                        <Resaltar texto={h.texto} q={buscar.trim()} />
                      </span>
                    </button>
                  </li>
                ))}
              </GrupoLista>
            )}
            <GrupoLista titulo="Canales" cantidad={canales.length}>
              {canales.map((c) => (
                <ItemConversacion key={c.id} c={c} activo={c.id === canalId} onClick={() => abrir(c.id)} icono={<IconoCanal c={c} activo={c.id === canalId} />} />
              ))}
            </GrupoLista>
            <GrupoLista titulo="Mensajes privados" cantidad={privados.length}>
              {privados.length === 0 && (
                <button
                  type="button"
                  onClick={() => setDialogo("privado")}
                  className="w-full rounded-2xl border border-dashed border-primary/25 px-3 py-4 text-center text-xs text-muted-foreground transition hover:border-primary/50 hover:text-primary"
                >
                  Escribile por privado a alguien del equipo
                </button>
              )}
              {privados.map((c) => {
                const otro = personaDe(c);
                return (
                  <ItemConversacion
                    key={c.id}
                    c={c}
                    activo={c.id === canalId}
                    onClick={() => abrir(c.id)}
                    icono={<Avatar nombre={c.nombre} rol={otro?.rol ?? "asistente"} />}
                  />
                );
              })}
            </GrupoLista>
          </div>
          {esAdmin && (
            <button
              type="button"
              onClick={() => setDialogo("permisos")}
              className="flex items-center gap-2 border-t border-border/60 px-4 py-3 text-left text-xs font-semibold text-muted-foreground transition hover:bg-primary/[0.05] hover:text-primary"
            >
              <ShieldCheck className="size-4" /> Qué puede hacer cada rol en el chat
            </button>
          )}
        </aside>

        {/* ── Conversación ── */}
        <div className={cn("min-h-0 min-w-0 flex-col lg:flex", vistaMovil === "chat" ? "flex" : "hidden")}>
          {canal ? (
            <Conversacion
              key={canal.id}
              canal={canal}
              res={res}
              onVolver={() => setVistaMovil("lista")}
              onEditar={() => setDialogo("editar")}
              onLeido={cargar}
              irAMensaje={irA?.canalId === canal.id ? irA.mensajeId : null}
              onFueA={() => setIrA(null)}
            />
          ) : (
            <div className="grid flex-1 place-items-center p-8 text-center text-sm text-muted-foreground">Elegí una conversación.</div>
          )}
        </div>

        {/* ── Detalles (pantallas grandes) ── */}
        <aside className="hidden min-h-0 flex-col overflow-y-auto border-l border-border/70 bg-gradient-to-b from-primary/[0.03] to-transparent p-5 scroll-sutil 2xl:flex">
          {canal && <Detalles canal={canal} res={res} />}
        </aside>
      </section>

      <NuevoComunicado abierto={dialogo === "comunicado"} onCerrar={() => setDialogo(null)} res={res} onListo={(id) => id && abrir(id)} />
      <EditarCanal
        abierto={dialogo === "canal" || dialogo === "editar"}
        canal={dialogo === "editar" ? canal : null}
        onCerrar={() => setDialogo(null)}
        res={res}
        onListo={(id) => {
          if (id) abrir(id);
          else setCanalId(null);
        }}
      />
      <NuevoPrivado abierto={dialogo === "privado"} onCerrar={() => setDialogo(null)} res={res} onListo={abrir} />
      {esAdmin && res.permisosPorRol && (
        <DialogoPermisos abierto={dialogo === "permisos"} onCerrar={() => setDialogo(null)} actuales={res.permisosPorRol} />
      )}
    </div>
  );
}

function AccionRapida({ icono: Icono, etiqueta, activo, onClick }: { icono: typeof Hash; etiqueta: string; activo: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!activo}
      title={activo ? etiqueta : `${etiqueta}: el Administrador no lo habilitó para tu rol`}
      className="group flex flex-col items-center gap-1 rounded-2xl bg-card px-1 py-2 text-[11px] font-semibold text-foreground/80 ring-1 ring-border transition hover:-translate-y-0.5 hover:text-primary hover:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
    >
      <span className="grid size-7 place-items-center rounded-full bg-primary/[0.08] text-primary transition group-hover:bg-gradient-to-br group-hover:from-primary group-hover:to-fuchsia-500 group-hover:text-white">
        {activo ? <Icono className="size-3.5" /> : <Lock className="size-3.5" />}
      </span>
      {etiqueta}
    </button>
  );
}

function GrupoLista({ titulo, cantidad, children }: { titulo: string; cantidad: number; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 flex items-center gap-2 px-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
        <span className="h-1 w-3 rounded-full bg-gradient-to-r from-primary to-fuchsia-500" />
        {titulo}
        <span className="ml-auto tabular-nums opacity-70">{cantidad}</span>
      </p>
      <ul className="space-y-1">{children}</ul>
    </div>
  );
}

function ItemConversacion({ c, activo, onClick, icono }: { c: CanalChat; activo: boolean; onClick: () => void; icono: ReactNode }) {
  const vista = c.ultimo
    ? `${c.ultimo.tipo === "comunicado" ? "📣 " : ""}${c.ultimo.autor}: ${c.ultimo.texto || (c.ultimo.archivo ? "📎 Archivo" : "")}`
    : c.descripcion || "Sin mensajes todavía";
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        aria-current={activo ? "true" : undefined}
        className={cn(
          "group relative flex w-full items-center gap-3 rounded-2xl px-2.5 py-2.5 text-left transition-all duration-200",
          activo ? "bg-card shadow-[0_10px_24px_-18px_rgba(76,29,149,0.7)] ring-1 ring-primary/25" : "hover:bg-card/80",
        )}
      >
        {activo && <span className="absolute inset-y-3 left-0 w-1 rounded-r-full bg-gradient-to-b from-primary to-fuchsia-500" />}
        {icono}
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className={cn("truncate text-sm", c.noLeidos > 0 ? "font-bold" : "font-semibold")}>{c.nombre}</span>
            {c.ultimo && <span className="ml-auto shrink-0 text-[10px] tabular-nums text-muted-foreground">{cuandoCorto(c.ultimo.fecha)}</span>}
          </span>
          <span className="mt-0.5 flex items-center gap-2">
            <span className={cn("truncate text-xs", c.noLeidos > 0 ? "text-foreground/80" : "text-muted-foreground")}>{vista}</span>
            {(c.menciones ?? 0) > 0 && (
              <span className="ml-auto grid size-5 shrink-0 place-items-center rounded-full bg-fuchsia-500 text-white" title="Te mencionaron" aria-label="Te mencionaron">
                <AtSign className="size-3" />
              </span>
            )}
            {c.pendientes > 0 && (
              <span
                className={cn(
                  "inline-flex shrink-0 items-center gap-0.5 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300",
                  !(c.menciones ?? 0) && "ml-auto",
                )}
                title="Comunicados por confirmar"
              >
                <Megaphone className="size-3" />
                {c.pendientes}
              </span>
            )}
            {c.noLeidos > 0 && (
              <span className={cn("grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-gradient-to-r from-primary to-fuchsia-500 px-1.5 text-[10px] font-bold text-white", c.pendientes === 0 && !(c.menciones ?? 0) && "ml-auto")}>
                {c.noLeidos > 99 ? "99+" : c.noLeidos}
              </span>
            )}
          </span>
        </span>
      </button>
    </li>
  );
}

/* ───────────── La conversación ───────────── */
function Conversacion({
  canal,
  res,
  onVolver,
  onEditar,
  onLeido,
  irAMensaje = null,
  onFueA,
}: {
  canal: CanalChat;
  res: ResumenChat;
  onVolver: () => void;
  onEditar: () => void;
  onLeido: () => void;
  irAMensaje?: string | null;
  onFueA?: () => void;
}) {
  // Mensajes fijados arriba
  const [fijados, setFijados] = useState<MensajeChat[]>([]);
  const [puedoFijar, setPuedoFijar] = useState(false);
  const [verFijadosAbierto, setVerFijadosAbierto] = useState(false);
  const traerFijados = useCallback(() => {
    verFijados(canal.id)
      .then((r) => {
        setFijados(r.mensajes);
        setPuedoFijar(r.puedoFijar);
      })
      .catch(() => {
        /* sin conexión: se reintenta con el próximo cambio */
      });
  }, [canal.id]);
  const fijar = async (m: MensajeChat, fijado: boolean) => {
    try {
      await fijarMensaje(m.id, fijado);
      setMensajes((prev) => (prev ?? []).map((x) => (x.id === m.id ? { ...x, fijado } : x)));
      traerFijados();
      toast.success(fijado ? "Mensaje fijado arriba" : "Mensaje desfijado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo fijar.");
    }
  };
  /** Lleva la vista hasta un mensaje y lo marca un momento */
  const mostrarMensaje = (id: string) => {
    const el = listaRef.current?.querySelector<HTMLElement>(`[data-msg-id="${id}"]`);
    if (!el) return false;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("ce-mensaje-marcado");
    window.setTimeout(() => el.classList.remove("ce-mensaje-marcado"), 2600);
    return true;
  };
  const [mensajes, setMensajes] = useState<MensajeChat[] | null>(null);
  const [hayMas, setHayMas] = useState(false);
  const [texto, setTexto] = useState("");
  const [archivo, setArchivo] = useState<ArchivoNuevo | null>(null);
  const [referencia, setReferencia] = useState<ReferenciaChat | null>(null);
  const [eligiendoRef, setEligiendoRef] = useState(false);
  // Menciones: al escribir «@» aparece la lista de quienes están en esta conversación
  const textoRef = useRef<HTMLTextAreaElement>(null);
  const [mencionados, setMencionados] = useState<{ id: string; nombre: string }[]>([]);
  const [arroba, setArroba] = useState<{ q: string; desde: number; hasta: number } | null>(null);
  const [selArroba, setSelArroba] = useState(0);
  const [comoComunicado, setComoComunicado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const finRef = useRef<HTMLDivElement>(null);
  const listaRef = useRef<HTMLDivElement>(null);
  const version = useVersionChat();
  const real = esClinicaReal();
  const p = res.yo.permisos;
  const esAdmin = res.yo.rol === "admin";
  const puedoEscribir = canal.tipo !== "area" || canal.soyMiembro || esAdmin;
  const mencionables = res.personas.filter((x) => x.id !== res.yo.id && (canal.tipo === "general" || canal.miembros.includes(x.id)));
  const candidatos = arroba
    ? mencionables
        .filter((x) => {
          const q = sinAcentosChat(arroba.q);
          return !q || sinAcentosChat(x.nombre).split(/\s+/).some((w) => w.startsWith(q)) || sinAcentosChat(x.nombre).startsWith(q);
        })
        .slice(0, 6)
    : [];
  const detectarArroba = (valor: string, cursor: number) => {
    const antes = valor.slice(0, cursor);
    const m = /(?:^|\s)@([\p{L}\p{N}.]{0,20})$/u.exec(antes);
    if (!m) return setArroba(null);
    setArroba({ q: m[1] ?? "", desde: cursor - (m[1]?.length ?? 0) - 1, hasta: cursor });
    setSelArroba(0);
  };
  const mencionar = (x: { id: string; nombre: string }) => {
    if (!arroba) return;
    const nuevo = `${texto.slice(0, arroba.desde)}@${x.nombre} ${texto.slice(arroba.hasta)}`;
    const cursor = arroba.desde + x.nombre.length + 2;
    setTexto(nuevo);
    setMencionados((prev) => (prev.some((p) => p.id === x.id) ? prev : [...prev, { id: x.id, nombre: x.nombre }]));
    setArroba(null);
    requestAnimationFrame(() => {
      textoRef.current?.focus();
      textoRef.current?.setSelectionRange(cursor, cursor);
    });
  };

  const traer = useCallback(
    (bajar = false) => {
      verMensajes(canal.id)
        .then((r) => {
          setMensajes((prev) => {
            const cambio = !prev || prev.length !== r.mensajes.length || prev[prev.length - 1]?.id !== r.mensajes[r.mensajes.length - 1]?.id;
            if (cambio || bajar) requestAnimationFrame(() => finRef.current?.scrollIntoView({ block: "end" }));
            return r.mensajes;
          });
          setHayMas(r.hayMas);
          setError(null);
        })
        .catch((e: unknown) => setError(e instanceof Error ? e.message : "No se pudieron traer los mensajes."));
    },
    [canal.id],
  );
  useEffect(() => {
    traer(true);
    // Al abrirla queda leída: se actualizan los contadores
    const t = setTimeout(onLeido, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [traer]);
  useEffect(() => {
    if (version > 0) traer();
  }, [version, traer]);
  useEffect(() => {
    traerFijados();
  }, [traerFijados, version]);
  // Desde el buscador: cuando llegan los mensajes, se va hasta el buscado (y si es viejo, se traen más)
  const intentosIrA = useRef(0);
  useEffect(() => {
    if (!irAMensaje || !mensajes) return;
    const t = window.setTimeout(() => {
      if (mostrarMensaje(irAMensaje)) {
        intentosIrA.current = 0;
        onFueA?.();
      } else if (hayMas && intentosIrA.current < 5) {
        intentosIrA.current++;
        void masViejos();
      } else {
        intentosIrA.current = 0;
        onFueA?.();
      }
    }, 450);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [irAMensaje, mensajes]);
  // Clínica real: mensajes nuevos cada 8 segundos mientras la conversación está abierta
  useEffect(() => {
    if (!real) return;
    const t = setInterval(() => document.visibilityState === "visible" && traer(), 8_000);
    return () => clearInterval(t);
  }, [real, traer]);

  const masViejos = async () => {
    const primero = mensajes?.[0];
    if (!primero) return;
    try {
      const r = await verMensajes(canal.id, primero.fecha);
      setMensajes((prev) => [...r.mensajes, ...(prev ?? [])]);
      setHayMas(r.hayMas);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudieron traer los mensajes.");
    }
  };

  const enviar = async () => {
    const t = texto.trim();
    if ((!t && !archivo && !referencia) || enviando) return;
    setEnviando(true);
    try {
      const m = await enviarMensaje(canal.id, {
        texto: t,
        tipo: comoComunicado ? "comunicado" : "mensaje",
        archivo: archivo ?? undefined,
        referencia: referencia ?? undefined,
        menciones: mencionados.filter((x) => t.includes(`@${x.nombre}`)).map((x) => x.id),
      });
      setMensajes((prev) => [...(prev ?? []).filter((x) => x.id !== m.id), m]);
      setTexto("");
      setArchivo(null);
      setReferencia(null);
      setMencionados([]);
      setArroba(null);
      setComoComunicado(false);
      requestAnimationFrame(() => finRef.current?.scrollIntoView({ block: "end", behavior: "smooth" }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo enviar.");
    } finally {
      setEnviando(false);
    }
  };

  const otro = canal.tipo === "directo" ? res.personas.find((x) => canal.miembros.includes(x.id) && x.id !== res.yo.id) : undefined;
  // Fondo del chat elegido por esta persona (solo en su navegador, separado por clínica)
  const fondo = useFondoChat(res.yo.id, canal.id);
  const [eligiendoFondo, setEligiendoFondo] = useState(false);
  const sub =
    canal.tipo === "directo"
      ? (otro?.rolNombre ?? "Mensaje privado")
      : `${canal.miembros.length} ${canal.miembros.length === 1 ? "persona" : "personas"}${canal.descripcion ? ` · ${canal.descripcion}` : ""}`;
  const miembros = res.personas.filter((x) => canal.miembros.includes(x.id));

  // Agrupar: separador por día y mensajes seguidos de la misma persona
  const filas = useMemo(() => {
    const out: ({ tipo: "dia"; id: string; dia: string } | { tipo: "msg"; m: MensajeChat; seguido: boolean })[] = [];
    let diaAnt = "";
    let ant: MensajeChat | null = null;
    for (const m of mensajes ?? []) {
      const dia = new Date(m.fecha).toDateString();
      if (dia !== diaAnt) {
        out.push({ tipo: "dia", id: `d-${dia}`, dia: diaLargo(m.fecha) });
        diaAnt = dia;
        ant = null;
      }
      const seguido = !!ant && ant.autor.id === m.autor.id && ant.tipo === "mensaje" && m.tipo === "mensaje" && new Date(m.fecha).getTime() - new Date(ant.fecha).getTime() < 5 * 60_000;
      out.push({ tipo: "msg", m, seguido });
      ant = m;
    }
    return out;
  }, [mensajes]);

  return (
    <>
      {/* Encabezado */}
      <header className="flex items-center gap-3 border-b border-border/60 px-3 py-3 sm:px-5">
        <button type="button" onClick={onVolver} className="grid size-9 place-items-center rounded-full text-muted-foreground hover:bg-muted lg:hidden" aria-label="Volver a la lista">
          <ArrowLeft className="size-5" />
        </button>
        {canal.tipo === "directo" ? <Avatar nombre={canal.nombre} rol={otro?.rol ?? "asistente"} tam="lg" /> : <IconoCanal c={canal} activo />}
        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-2 truncate text-base font-bold tracking-tight sm:text-lg">
            {canal.nombre}
            {canal.tipo === "directo" && <Lock className="size-3.5 shrink-0 text-muted-foreground" aria-label="Privado" />}
          </h2>
          <p className="truncate text-xs text-muted-foreground">{sub}</p>
        </div>
        {canal.tipo !== "directo" && (
          <div className="hidden -space-x-2 sm:flex" aria-label="Miembros">
            {miembros.slice(0, 4).map((x) => (
              <Avatar key={x.id} nombre={x.nombre} rol={x.rol} tam="sm" />
            ))}
            {miembros.length > 4 && (
              <span className="grid size-7 place-items-center rounded-full bg-muted text-[10px] font-bold ring-2 ring-background">+{miembros.length - 4}</span>
            )}
          </div>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setEligiendoFondo(true)}
          className="ce-levanta h-9 shrink-0 rounded-full px-3"
          title="Cambiar el fondo del chat"
        >
          <Palette className="size-3.5 sm:mr-1.5" />
          <span className="hidden sm:inline">Fondo</span>
        </Button>
        {canal.puedoAdministrar && (
          <Button variant="outline" size="sm" onClick={onEditar} className="ce-levanta h-9 shrink-0 rounded-full px-3">
            <Pencil className="size-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline">Editar</span>
          </Button>
        )}
      </header>
      <ElegirFondo abierto={eligiendoFondo} onCerrar={() => setEligiendoFondo(false)} fondo={fondo} nombreChat={canal.nombre} />
      {fijados.length > 0 && (
        <div className="border-b border-border/60 bg-amber-50/70 dark:bg-amber-500/[0.06]">
          <button
            type="button"
            onClick={() => setVerFijadosAbierto((v) => !v)}
            aria-expanded={verFijadosAbierto}
            className="flex w-full items-center gap-2.5 px-4 py-2 text-left sm:px-5"
          >
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300">
              <Pin className="size-3.5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-amber-800 dark:text-amber-300">
                {fijados.length === 1 ? "Fijado" : `${fijados.length} fijados`}
              </span>
              {!verFijadosAbierto && (
                <span className="block truncate text-xs">
                  {fijados[0]?.texto || (fijados[0]?.referencia ? fijados[0].referencia.nombre : fijados[0]?.archivo?.nombre) || "Mensaje"}
                </span>
              )}
            </span>
            <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition", verFijadosAbierto && "rotate-180")} />
          </button>
          {verFijadosAbierto && (
            <ul className="max-h-60 space-y-1 overflow-y-auto px-3 pb-3 scroll-sutil sm:px-4">
              {fijados.map((f) => (
                <li key={f.id} className="flex items-start gap-2 rounded-2xl bg-card px-3 py-2 ring-1 ring-amber-500/15">
                  <button
                    type="button"
                    onClick={() => {
                      if (!mostrarMensaje(f.id)) toast("Es un mensaje viejo: lo tenés acá arriba en Fijados.");
                    }}
                    className="min-w-0 flex-1 text-left"
                  >
                    <span className="block text-[11px] text-muted-foreground">
                      <span className="font-semibold text-foreground/80">{f.mio ? "Vos" : f.autor.nombre}</span> · {cuandoCorto(f.fecha)}
                    </span>
                    <span className="mt-0.5 block whitespace-pre-wrap break-words text-xs">
                      {f.texto || (f.referencia ? `${f.referencia.tipo === "turno" ? "Turno" : "Paciente"}: ${f.referencia.nombre}` : f.archivo?.nombre)}
                    </span>
                  </button>
                  {puedoFijar && (
                    <button
                      type="button"
                      onClick={() => void fijar(f, false)}
                      className="grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-amber-500/15 hover:text-amber-800"
                      aria-label="Desfijar"
                      title="Desfijar"
                    >
                      <PinOff className="size-3.5" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Mensajes */}
      <div
        ref={listaRef}
        style={fondo.estilo}
        className={`min-h-0 flex-1 overflow-y-auto px-3 py-4 text-foreground transition-[background] duration-500 scroll-sutil sm:px-6 ${fondo.oscuro ? "dark" : ""}`}
      >
        {error && <p className="mb-3 rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}
        {!mensajes ? (
          <p className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Trayendo mensajes…
          </p>
        ) : mensajes.length === 0 ? (
          <div className="mx-auto flex max-w-sm flex-col items-center py-16 text-center">
            <span className="grid size-16 place-items-center rounded-3xl bg-gradient-to-br from-primary/15 to-fuchsia-500/15 text-primary">
              <MessagesSquare className="size-7" />
            </span>
            <p className="mt-4 font-bold">Todavía no hay mensajes</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {canal.tipo === "directo" ? `Escribile a ${canal.nombre}: solo lo ven ustedes dos.` : "¡Escribí el primero! Lo ven todas las personas del canal."}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {hayMas && (
              <div className="pb-3 text-center">
                <Button variant="outline" size="sm" onClick={() => void masViejos()} className="rounded-full">
                  Ver mensajes anteriores
                </Button>
              </div>
            )}
            {filas.map((f) =>
              f.tipo === "dia" ? (
                <div key={f.id} className="flex items-center gap-3 py-3" role="separator">
                  <span className="h-px flex-1 bg-border/70" />
                  <span className="rounded-full bg-card px-3 py-1 text-[11px] font-semibold text-muted-foreground ring-1 ring-border/70">{f.dia}</span>
                  <span className="h-px flex-1 bg-border/70" />
                </div>
              ) : (
                <Mensaje
                  key={f.m.id}
                  m={f.m}
                  seguido={f.seguido}
                  res={res}
                  canalNombre={canal.tipo === "directo" ? `privado con ${canal.nombre}` : canal.nombre}
                  onFijar={puedoFijar ? (fijado) => void fijar(f.m, fijado) : undefined}
                  onCambio={(nuevo) => setMensajes((prev) => (prev ?? []).map((x) => (x.id === nuevo.id ? nuevo : x)))}
                />
              ),
            )}
          </div>
        )}
        <div ref={finRef} />
      </div>

      {/* Escribir */}
      {puedoEscribir ? (
        <div data-ce-composer className="border-t border-border/60 bg-card/70 p-3 backdrop-blur sm:px-5">
          {(archivo || comoComunicado || referencia) && (
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {referencia && (
                <span className="inline-flex max-w-full items-center gap-2 rounded-full bg-primary/[0.08] py-1 pl-3 pr-1 text-xs font-semibold text-primary">
                  {referencia.tipo === "turno" ? <CalendarDays className="size-3.5 shrink-0" /> : <UserRound className="size-3.5 shrink-0" />}
                  <span className="truncate">
                    {referencia.nombre}
                    {referencia.tipo === "turno" && referencia.detalle ? ` · ${referencia.detalle.split(" · ")[0]}` : ""}
                  </span>
                  <button type="button" onClick={() => setReferencia(null)} className="grid size-6 place-items-center rounded-full hover:bg-primary/15" aria-label="Quitar paciente o turno">
                    <X className="size-3.5" />
                  </button>
                </span>
              )}
              {comoComunicado && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-800 dark:text-amber-200">
                  <Megaphone className="size-3.5" /> Se envía como comunicado (piden confirmar lectura)
                </span>
              )}
              {archivo && <Adjuntar archivo={archivo} onArchivo={setArchivo} />}
            </div>
          )}
          {arroba && (
            <div className="relative">
              <div
                role="listbox"
                aria-label="Mencionar a"
                className="absolute bottom-2 left-0 z-20 w-72 max-w-full overflow-hidden rounded-2xl border border-primary/15 bg-card p-1.5 shadow-[0_18px_40px_-18px_rgba(76,29,149,0.55)]"
              >
                <p className="px-2.5 pb-1 pt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Mencionar a</p>
                {candidatos.length === 0 ? (
                  <p className="px-2.5 py-2 text-xs text-muted-foreground">
                    {mencionables.length === 0 ? "Todavía no hay más personas en esta conversación." : "Nadie con ese nombre acá."}
                  </p>
                ) : (
                  candidatos.map((x, i) => (
                    <button
                      key={x.id}
                      type="button"
                      role="option"
                      aria-selected={i === selArroba}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => mencionar(x)}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition",
                        i === selArroba ? "bg-primary/[0.08]" : "hover:bg-primary/[0.05]",
                      )}
                    >
                      <Avatar nombre={x.nombre} rol={x.rol} tam="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{x.nombre}</span>
                        <span className="block truncate text-[11px] text-muted-foreground">{x.rolNombre}</span>
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
          <div className="flex items-end gap-1.5 rounded-3xl bg-background p-1.5 ring-1 ring-border transition focus-within:ring-2 focus-within:ring-primary/40">
            {p.archivos && !archivo && <Adjuntar archivo={null} onArchivo={setArchivo} compacto />}
            {!referencia && (
              <button
                type="button"
                onClick={() => setEligiendoRef(true)}
                className="grid size-10 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
                title="Hablar de un paciente o un turno"
                aria-label="Hablar de un paciente o un turno"
              >
                <UserRound className="size-[18px]" />
              </button>
            )}
            {p.comunicados && (
              <button
                type="button"
                onClick={() => setComoComunicado((v) => !v)}
                aria-pressed={comoComunicado}
                className={cn(
                  "grid size-10 shrink-0 place-items-center rounded-full transition",
                  comoComunicado ? "bg-amber-500 text-white" : "text-muted-foreground hover:bg-amber-500/10 hover:text-amber-700",
                )}
                title="Enviar como comunicado (con confirmación de lectura)"
                aria-label="Enviar como comunicado"
              >
                <Megaphone className="size-[18px]" />
              </button>
            )}
            <Textarea
              ref={textoRef}
              value={texto}
              onChange={(e) => {
                setTexto(e.target.value);
                detectarArroba(e.target.value, e.target.selectionStart ?? e.target.value.length);
              }}
              onKeyDown={(e) => {
                if (arroba && candidatos.length > 0) {
                  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                    e.preventDefault();
                    setSelArroba((i) => (i + (e.key === "ArrowDown" ? 1 : candidatos.length - 1)) % candidatos.length);
                    return;
                  }
                  if (e.key === "Enter" || e.key === "Tab") {
                    e.preventDefault();
                    const c = candidatos[selArroba] ?? candidatos[0];
                    if (c) mencionar(c);
                    return;
                  }
                  if (e.key === "Escape") {
                    e.preventDefault();
                    setArroba(null);
                    return;
                  }
                }
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void enviar();
                }
              }}
              onBlur={() => window.setTimeout(() => setArroba(null), 150)}
              rows={1}
              maxLength={4000}
              placeholder={
                canal.tipo === "directo"
                  ? `Mensaje para ${canal.nombre}`
                  : `Escribí en ${canal.nombre}${mencionables.length ? " · @ para mencionar" : ""}`
              }
              className="max-h-36 min-h-10 flex-1 resize-none border-0 bg-transparent px-2 py-2.5 text-sm shadow-none focus-visible:ring-0"
              aria-label="Mensaje"
            />
            <Button
              onClick={() => void enviar()}
              disabled={enviando || (!texto.trim() && !archivo && !referencia)}
              className="ce-boton size-10 shrink-0 rounded-full p-0"
              aria-label="Enviar"
            >
              {enviando ? <Loader2 className="size-4 animate-spin" /> : <SendHorizontal className="size-4" />}
            </Button>
          </div>
          <p className="mt-1.5 hidden px-2 text-[10px] text-muted-foreground sm:block">Enter para enviar · Shift + Enter para otra línea</p>
          <ElegirReferencia abierto={eligiendoRef} onCerrar={() => setEligiendoRef(false)} onElegir={setReferencia} />
        </div>
      ) : (
        <p className="border-t border-border/60 p-4 text-center text-xs text-muted-foreground">Solo las personas del canal pueden escribir acá.</p>
      )}
    </>
  );
}

/* ───────────── Un mensaje ───────────── */
/* Elegir el fondo del chat: fondos listos o una foto propia; para todos los chats o solo este. */
export function ElegirFondo({
  abierto,
  onCerrar,
  fondo,
  nombreChat,
}: {
  abierto: boolean;
  onCerrar: () => void;
  fondo: ReturnType<typeof useFondoChat>;
  nombreChat: string;
}) {
  const [soloEste, setSoloEste] = useState(fondo.soloEsteChat);
  const [subiendo, setSubiendo] = useState(false);
  const archivoRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (abierto) setSoloEste(fondo.soloEsteChat);
  }, [abierto, fondo.soloEsteChat]);
  const elegir = (f: FondoChat) => {
    try {
      fondo.guardar(f, soloEste);
      toast.success(soloEste ? `Fondo aplicado a «${nombreChat}»` : "Fondo aplicado a todos tus chats");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar el fondo.");
    }
  };
  const actualId = fondo.actual.tipo === "preset" ? fondo.actual.id : "imagen";
  return (
    <Dialog open={abierto} onOpenChange={(v) => !v && onCerrar()}>
      <DialogContent className="ce-clinica max-h-[92dvh] overflow-y-auto rounded-3xl sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-fuchsia-500 text-white">
              <Palette className="size-4" />
            </span>
            Fondo del chat
          </DialogTitle>
          <DialogDescription>Elegí cómo se ve tu chat. Solo lo ves vos, en este navegador.</DialogDescription>
        </DialogHeader>

        <div className="flex w-full gap-1 rounded-full bg-muted/60 p-1 text-xs font-medium" role="radiogroup" aria-label="Dónde se aplica">
          {[
            [false, "Todos mis chats"],
            [true, `Solo «${nombreChat}»`],
          ].map(([v, l]) => (
            <button
              key={String(v)}
              type="button"
              role="radio"
              aria-checked={soloEste === v}
              onClick={() => setSoloEste(v as boolean)}
              className={`flex-1 truncate rounded-full px-3 py-1.5 transition-all ${soloEste === v ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              {l as string}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
          {FONDOS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => elegir({ tipo: "preset", id: f.id })}
              className={`group relative overflow-hidden rounded-2xl text-left ring-1 transition-all duration-200 hover:-translate-y-0.5 ${
                actualId === f.id ? "ring-2 ring-primary shadow-[0_10px_24px_-14px_rgba(124,58,237,0.9)]" : "ring-border/70 hover:ring-primary/40"
              }`}
            >
              <span className="block h-20" style={{ background: f.fondo }}>
                {/* Mini burbujas de muestra */}
                <span className="flex h-full flex-col justify-center gap-1 px-2.5">
                  <span className={`h-2.5 w-3/5 rounded-full ${f.oscuro ? "bg-white/25" : "bg-white/90 shadow-sm"}`} />
                  <span className="ml-auto h-2.5 w-1/2 rounded-full bg-gradient-to-r from-primary to-fuchsia-500" />
                </span>
              </span>
              <span className="flex items-center justify-between gap-1 bg-card px-2.5 py-1.5 text-[11.5px] font-medium">
                {f.nombre}
                {actualId === f.id && <Check className="size-3.5 text-primary" />}
              </span>
            </button>
          ))}
          <button
            type="button"
            disabled={subiendo}
            onClick={() => archivoRef.current?.click()}
            className={`group relative flex flex-col overflow-hidden rounded-2xl text-left ring-1 transition-all duration-200 hover:-translate-y-0.5 ${
              actualId === "imagen" ? "ring-2 ring-primary" : "ring-border/70 hover:ring-primary/40"
            }`}
          >
            <span
              className="grid h-20 place-items-center bg-gradient-to-br from-primary/[0.08] to-fuchsia-500/[0.08] text-primary"
              style={fondo.actual.tipo === "imagen" ? { background: `url("${fondo.actual.url}") center / cover` } : undefined}
            >
              {fondo.actual.tipo !== "imagen" && (subiendo ? <Loader2 className="size-5 animate-spin" /> : <Upload className="size-5" />)}
            </span>
            <span className="flex items-center justify-between gap-1 bg-card px-2.5 py-1.5 text-[11.5px] font-medium">
              {fondo.actual.tipo === "imagen" ? "Tu foto" : "Subir foto"}
              {actualId === "imagen" && <Check className="size-3.5 text-primary" />}
            </span>
          </button>
          <input
            ref={archivoRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={async (e) => {
              const a = e.target.files?.[0];
              e.target.value = "";
              if (!a) return;
              setSubiendo(true);
              try {
                elegir({ tipo: "imagen", url: await prepararImagenFondo(a) });
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "No se pudo usar esa imagen.");
              } finally {
                setSubiendo(false);
              }
            }}
          />
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          <button
            type="button"
            onClick={() => {
              fondo.restablecer();
              toast.success("Volviste al fondo clásico");
            }}
            className="text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            Volver al clásico
          </button>
          <Button size="sm" onClick={onCerrar} className="rounded-full px-5">
            Listo
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Mensaje({
  m,
  seguido,
  res,
  canalNombre,
  onCambio,
  onFijar,
}: {
  m: MensajeChat;
  seguido: boolean;
  res: ResumenChat;
  canalNombre: string;
  onCambio: (m: MensajeChat) => void;
  onFijar?: ((fijado: boolean) => void) | undefined;
}) {
  const botonFijar =
    onFijar && !m.quitado ? (
      <button
        type="button"
        onClick={() => onFijar(!m.fijado)}
        className={cn(
          "grid size-7 shrink-0 place-items-center rounded-full transition hover:bg-amber-500/15 hover:text-amber-700 focus:opacity-100 group-hover:opacity-100",
          m.fijado ? "text-amber-600 opacity-100" : "text-muted-foreground opacity-0 [@media(hover:none)]:opacity-60",
        )}
        aria-label={m.fijado ? "Desfijar" : "Fijar arriba"}
        title={m.fijado ? "Desfijar" : "Fijar arriba"}
      >
        {m.fijado ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
      </button>
    ) : null;
  const puedeTareas = usePuedeCrearTareas();
  const yaEsTarea = !!useTareaDeMensaje(m.id);
  const [haciendoTarea, setHaciendoTarea] = useState(false);
  const botonTarea =
    puedeTareas && !m.quitado && !yaEsTarea ? (
      <button
        type="button"
        onClick={() => setHaciendoTarea(true)}
        className="grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground opacity-0 transition hover:bg-primary/10 hover:text-primary focus:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-60"
        aria-label="Convertir en tarea"
        title="Convertir en tarea"
      >
        <ClipboardCheck className="size-3.5" />
      </button>
    ) : null;
  const dialogoTarea = haciendoTarea && <TareaDesdeMensaje m={m} res={res} canalNombre={canalNombre} onCerrar={() => setHaciendoTarea(false)} />;
  const autor = res.personas.find((x) => x.id === m.autor.id);
  const rol = autor?.rol ?? "asistente";
  const puedoQuitar = !m.quitado && (m.mio || res.yo.rol === "admin");
  const [verLecturas, setVerLecturas] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  const quitar = async () => {
    if (!window.confirm("¿Quitar este mensaje? Deja de verse para todos (queda registrado que se quitó).")) return;
    try {
      await quitarMensaje(m.id);
      onCambio({ ...m, quitado: true, texto: "", archivo: null, confirmaciones: null });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo quitar.");
    }
  };
  const confirmar = async () => {
    setOcupado(true);
    try {
      await confirmarLectura(m.id);
      const ahora = new Date().toISOString();
      onCambio({
        ...m,
        confirmaciones: m.confirmaciones
          ? {
              ...m.confirmaciones,
              yoConfirme: true,
              leyeron: [...m.confirmaciones.leyeron, { id: res.yo.id, nombre: "Vos", fecha: ahora }],
              faltan: m.confirmaciones.faltan.filter((x) => x.id !== res.yo.id),
            }
          : null,
      });
      toast.success("Listo: quedó registrado que lo leíste.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo confirmar.");
    } finally {
      setOcupado(false);
    }
  };

  const archivo = m.archivo && (
    <button
      type="button"
      onClick={() => void bajarArchivo(m.archivo!).catch((e: unknown) => toast.error(e instanceof Error ? e.message : "No se pudo bajar el archivo."))}
      className={cn(
        "mt-2 flex w-72 max-w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition",
        m.mio && m.tipo === "mensaje" ? "bg-white/15 hover:bg-white/25" : "bg-background ring-1 ring-border hover:ring-primary/40",
      )}
    >
      <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", m.mio && m.tipo === "mensaje" ? "bg-white/20" : "bg-primary/10 text-primary")}>
        {m.archivo.tipo.startsWith("image/") ? <ImageIcon className="size-4" /> : <FileText className="size-4" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-semibold">{m.archivo.nombre}</span>
        <span className="block text-[10px] opacity-70">{pesoArchivo(m.archivo.tamano)}</span>
      </span>
      <Download className="size-4 shrink-0 opacity-80" />
    </button>
  );

  if (m.tipo === "comunicado" && !m.quitado) {
    const c = m.confirmaciones;
    const total = (c?.leyeron.length ?? 0) + (c?.faltan.length ?? 0);
    const pct = total ? Math.round(((c?.leyeron.length ?? 0) / total) * 100) : 0;
    return (
      <div data-msg-id={m.id} className="group py-2">
        <article className="relative overflow-hidden rounded-3xl border border-amber-500/25 bg-gradient-to-br from-amber-50 via-card to-card p-4 shadow-[0_14px_30px_-24px_rgba(180,83,9,0.6)] dark:from-amber-500/10 sm:p-5">
          <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-400 via-orange-400 to-pink-400" />
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm">
              <Megaphone className="size-[18px]" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-x-2 text-xs">
                <span className="font-bold uppercase tracking-[0.12em] text-amber-700 dark:text-amber-300">Comunicado</span>
                <span className="text-muted-foreground">
                  {m.mio ? "Vos" : m.autor.nombre} · {fechaHora(m.fecha)}
                </span>
              </p>
              <p className="mt-1.5 whitespace-pre-wrap break-words text-[15px] leading-relaxed">
                <TextoConMenciones texto={m.texto} menciones={m.menciones ?? []} clara={false} />
              </p>
              {m.referencia && <TarjetaReferencia r={m.referencia} clara={false} />}
              {archivo}
              <ChipTarea mensajeId={m.id} clara={false} />
            </div>
            {botonTarea}
            {botonFijar}
            {dialogoTarea}
            {puedoQuitar && (
              <button type="button" onClick={() => void quitar()} className="grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground opacity-0 transition hover:bg-destructive/10 hover:text-destructive focus:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-50" aria-label="Quitar comunicado">
                <Trash2 className="size-4" />
              </button>
            )}
          </div>
          {c && (
            <div className="mt-4 border-t border-amber-500/15 pt-3">
              {!m.mio && !c.yoConfirme && (
                <Button onClick={() => void confirmar()} disabled={ocupado} className="h-10 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-5 text-white shadow-sm hover:opacity-95">
                  {ocupado ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Check className="mr-2 size-4" />}
                  Confirmar lectura
                </Button>
              )}
              {!m.mio && c.yoConfirme && (
                <p className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  <CheckCheck className="size-3.5" /> Confirmaste la lectura
                </p>
              )}
              {(m.mio || res.yo.rol === "admin") && total > 0 && (
                <div className={cn(!m.mio && "mt-3")}>
                  <button type="button" onClick={() => setVerLecturas((v) => !v)} className="flex w-full items-center gap-3 text-left" aria-expanded={verLecturas}>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-amber-500/15">
                      <span className="block h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all" style={{ width: `${pct}%` }} />
                    </span>
                    <span className="shrink-0 text-xs font-semibold">
                      Leído por {c.leyeron.length} de {total}
                    </span>
                    <span className="shrink-0 text-xs font-semibold text-primary">{verLecturas ? "Ocultar" : "Ver quién"}</span>
                  </button>
                  {verLecturas && (
                    <div data-movil="1col" className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-300">Leyeron</p>
                        <ul className="space-y-1">
                          {c.leyeron.length === 0 && <li className="text-xs text-muted-foreground">Nadie todavía.</li>}
                          {c.leyeron.map((x) => (
                            <li key={x.id} className="flex items-center justify-between gap-2 text-xs">
                              <span className="flex min-w-0 items-center gap-1.5">
                                <CheckCheck className="size-3.5 shrink-0 text-emerald-600" />
                                <span className="truncate">{x.nombre}</span>
                              </span>
                              <span className="shrink-0 tabular-nums text-muted-foreground">{fechaHora(x.fecha)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-amber-700 dark:text-amber-300">Falta que lean</p>
                        <ul className="space-y-1">
                          {c.faltan.length === 0 && <li className="text-xs text-emerald-700 dark:text-emerald-300">¡Lo leyeron todos!</li>}
                          {c.faltan.map((x) => (
                            <li key={x.id} className="truncate text-xs text-muted-foreground">
                              {x.nombre}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </article>
      </div>
    );
  }

  return (
    <div data-msg-id={m.id} className={cn("group flex items-end gap-2.5", m.mio ? "flex-row-reverse" : "", seguido ? "pt-0.5" : "pt-3")}>
      {!m.mio && (seguido ? <span className="w-9 shrink-0" /> : <Avatar nombre={m.autor.nombre} rol={rol} />)}
      <div className={cn("flex min-w-0 max-w-[85%] flex-col sm:max-w-[70%]", m.mio ? "items-end" : "items-start")}>
        {!seguido && (
          <p className={cn("mb-1 flex items-center gap-2 px-1 text-[11px]", m.mio && "flex-row-reverse")}>
            <span className="font-semibold">{m.mio ? "Vos" : m.autor.nombre}</span>
            {!m.mio && autor && <span className={cn("rounded-full px-1.5 py-px text-[9px] font-bold", CHIP_ROL[rol])}>{autor.rolNombre}</span>}
            {!m.mio && m.meMencionan && !m.quitado && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-fuchsia-500 px-1.5 py-px text-[9px] font-bold text-white">
                <AtSign className="size-2.5" /> Te mencionó
              </span>
            )}
            <span className="tabular-nums text-muted-foreground">{hora(m.fecha)}</span>
          </p>
        )}
        <div className="flex max-w-full items-center gap-1.5">
          {m.mio && botonFijar}
          {m.mio && botonTarea}
          {dialogoTarea}
          {puedoQuitar && m.mio && (
            <button type="button" onClick={() => void quitar()} className="grid size-7 place-items-center rounded-full text-muted-foreground opacity-0 transition hover:bg-destructive/10 hover:text-destructive focus:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-50" aria-label="Quitar mensaje">
              <Trash2 className="size-3.5" />
            </button>
          )}
          <div
            className={cn(
              "min-w-0 max-w-full rounded-3xl px-4 py-2.5 text-sm leading-relaxed",
              m.quitado
                ? "bg-muted/60 italic text-muted-foreground"
                : m.mio
                  ? "rounded-br-lg bg-gradient-to-br from-primary to-fuchsia-600 text-white shadow-[0_12px_24px_-16px_rgba(124,58,237,0.9)]"
                  : m.meMencionan
                    ? "rounded-bl-lg bg-fuchsia-50 shadow-[0_10px_24px_-18px_rgba(192,38,211,0.8)] ring-2 ring-fuchsia-400/60 dark:bg-fuchsia-500/10"
                    : "rounded-bl-lg bg-card shadow-[0_1px_2px_rgba(30,0,60,0.06)] ring-1 ring-border/70",
            )}
          >
            {m.quitado
              ? "Mensaje quitado"
              : m.texto && (
                  <p className="whitespace-pre-wrap break-words">
                    <TextoConMenciones texto={m.texto} menciones={m.menciones ?? []} clara={m.mio} />
                  </p>
                )}
            {!m.quitado && m.referencia && <TarjetaReferencia r={m.referencia} clara={m.mio} />}
            {!m.quitado && archivo}
            {!m.quitado && <ChipTarea mensajeId={m.id} clara={m.mio} />}
          </div>
          {!m.mio && botonTarea}
          {!m.mio && botonFijar}
          {puedoQuitar && !m.mio && (
            <button type="button" onClick={() => void quitar()} className="grid size-7 place-items-center rounded-full text-muted-foreground opacity-0 transition hover:bg-destructive/10 hover:text-destructive focus:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-50" aria-label="Quitar mensaje">
              <Trash2 className="size-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ───────────── Detalles del canal ───────────── */
function Detalles({ canal, res }: { canal: CanalChat; res: ResumenChat }) {
  const miembros = res.personas.filter((x) => canal.miembros.includes(x.id));
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto w-fit">
          {canal.tipo === "directo" ? (
            <Avatar nombre={canal.nombre} rol={miembros.find((x) => x.id !== res.yo.id)?.rol ?? "asistente"} tam="lg" />
          ) : (
            <IconoCanal c={canal} activo />
          )}
        </div>
        <p className="mt-3 font-bold">{canal.nombre}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {canal.tipo === "general" ? "Canal de toda la clínica" : canal.tipo === "directo" ? "Conversación privada: solo la ven ustedes dos" : canal.area ? `Área: ${canal.area}` : "Canal por área"}
        </p>
      </div>
      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Personas · {miembros.length}</p>
        <ul className="space-y-2">
          {miembros.map((x) => (
            <li key={x.id} className="flex items-center gap-2.5">
              <Avatar nombre={x.nombre} rol={x.rol} tam="sm" />
              <span className="min-w-0 flex-1 truncate text-sm">
                {x.nombre}
                {x.id === res.yo.id && <span className="text-xs text-muted-foreground"> (vos)</span>}
              </span>
              <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold", CHIP_ROL[x.rol])}>{x.rolNombre}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-2xl bg-primary/[0.05] p-3.5 text-xs leading-relaxed text-muted-foreground">
        <p className="mb-1 flex items-center gap-1.5 font-semibold text-foreground">
          <Lock className="size-3.5 text-primary" /> Privado y seguro
        </p>
        Los mensajes y archivos se guardan cifrados y solo los ve tu clínica. Nada se borra a escondidas: si alguien quita un mensaje, queda registrado.
      </div>
    </div>
  );
}

/* ───────────── Nuevo comunicado ───────────── */
function NuevoComunicado({ abierto, onCerrar, res, onListo }: { abierto: boolean; onCerrar: () => void; res: ResumenChat; onListo: (canalId: string | null) => void }) {
  const [texto, setTexto] = useState("");
  const [destino, setDestino] = useState<"todos" | "personas">("todos");
  const [elegidas, setElegidas] = useState<string[]>([]);
  const [archivo, setArchivo] = useState<ArchivoNuevo | null>(null);
  const [enviando, setEnviando] = useState(false);
  useEffect(() => {
    if (abierto) {
      setTexto("");
      setDestino("todos");
      setElegidas([]);
      setArchivo(null);
    }
  }, [abierto]);
  const enviar = async () => {
    if (!texto.trim()) return toast.error("Escribí el comunicado.");
    if (destino === "personas" && elegidas.length === 0) return toast.error("Elegí a quién mandarlo.");
    setEnviando(true);
    try {
      const r = await enviarComunicado({ texto: texto.trim(), destino: destino === "todos" ? "todos" : elegidas, archivo: archivo ?? undefined });
      toast.success(destino === "todos" ? "Comunicado enviado a toda la clínica." : `Comunicado enviado a ${r.enviados} ${r.enviados === 1 ? "persona" : "personas"}.`);
      onCerrar();
      onListo(r.canales.length === 1 ? (r.canales[0] ?? null) : null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo enviar.");
    } finally {
      setEnviando(false);
    }
  };
  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent className="ce-clinica max-h-[92dvh] overflow-y-auto rounded-3xl sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5 text-xl">
            <span className="grid size-9 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white">
              <Megaphone className="size-4" />
            </span>
            Nuevo comunicado
          </DialogTitle>
          <DialogDescription>Cada persona lo tiene que confirmar como leído. Vos ves quién lo leyó y quién falta.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-muted/60 p-1">
            {(
              [
                ["todos", "Toda la clínica", Building2],
                ["personas", "Personas elegidas", Users],
              ] as const
            ).map(([id, label, Icono]) => (
              <button
                key={id}
                type="button"
                onClick={() => setDestino(id)}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
                  destino === id ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icono className="size-4" /> {label}
              </button>
            ))}
          </div>
          {destino === "personas" && (
            <ElegirPersonas personas={res.personas} elegidas={elegidas} onCambio={setElegidas} yo={res.yo.id} />
          )}
          <Textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={5}
            maxLength={4000}
            placeholder="Ej.: El viernes cerramos a las 16 hs por capacitación."
            className="rounded-2xl"
            aria-label="Texto del comunicado"
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            {res.yo.permisos.archivos ? <Adjuntar archivo={archivo} onArchivo={setArchivo} /> : <span />}
            <span className="text-[11px] tabular-nums text-muted-foreground">{texto.length}/4000</span>
          </div>
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onCerrar} className="rounded-full">
            Cancelar
          </Button>
          <Button onClick={() => void enviar()} disabled={enviando} className="ce-boton rounded-full px-6">
            {enviando ? <Loader2 className="mr-2 size-4 animate-spin" /> : <SendHorizontal className="mr-2 size-4" />}
            Enviar comunicado
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ───────────── Crear o editar un canal ───────────── */
function EditarCanal({
  abierto,
  canal,
  onCerrar,
  res,
  onListo,
}: {
  abierto: boolean;
  canal: CanalChat | null;
  onCerrar: () => void;
  res: ResumenChat;
  onListo: (canalId: string | null) => void;
}) {
  const [nombre, setNombre] = useState("");
  const [area, setArea] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [miembros, setMiembros] = useState<string[]>([]);
  const [guardando, setGuardando] = useState(false);
  useEffect(() => {
    if (!abierto) return;
    setNombre(canal?.nombre ?? "");
    setArea(canal?.area ?? "");
    setDescripcion(canal?.descripcion ?? "");
    setMiembros((canal?.miembros ?? []).filter((id) => id !== res.yo.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto, canal?.id]);
  const guardar = async () => {
    if (nombre.trim().length < 2) return toast.error("Escribí el nombre del canal.");
    setGuardando(true);
    try {
      const datos = { nombre: nombre.trim(), area: area.trim(), descripcion: descripcion.trim(), miembros: [...new Set([...miembros, res.yo.id])] };
      if (canal) {
        await cambiarCanal(canal.id, datos);
        toast.success("Canal actualizado.");
        onCerrar();
      } else {
        const id = await crearCanal(datos);
        toast.success(`Canal «${datos.nombre}» creado.`);
        onCerrar();
        onListo(id);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setGuardando(false);
    }
  };
  const archivar = async () => {
    if (!canal || !window.confirm(`¿Archivar «${canal.nombre}»? Deja de verse en la lista (los mensajes no se borran).`)) return;
    try {
      await cambiarCanal(canal.id, { archivar: true });
      toast.success("Canal archivado.");
      onCerrar();
      onListo(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo archivar.");
    }
  };
  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent className="ce-clinica max-h-[92dvh] overflow-y-auto rounded-3xl sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5 text-xl">
            <span className="grid size-9 place-items-center rounded-2xl bg-gradient-to-br from-primary to-fuchsia-500 text-white">
              <Hash className="size-4" />
            </span>
            {canal ? "Editar canal" : "Nuevo canal por área"}
          </DialogTitle>
          <DialogDescription>Solo las personas del canal lo ven y escriben en él (el Administrador ve todos los canales).</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold">Nombre</span>
            <Input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={80} placeholder="Ej.: Recepción" className="h-11 rounded-xl" />
          </label>
          <div className="space-y-1.5">
            <span className="text-sm font-semibold">Área</span>
            <div className="flex flex-wrap gap-1.5">
              {AREAS_SUGERIDAS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => {
                    setArea(a);
                    if (!nombre.trim()) setNombre(a);
                  }}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                    area === a ? "bg-primary text-white" : "bg-primary/[0.07] text-primary hover:bg-primary/15",
                  )}
                >
                  {a}
                </button>
              ))}
            </div>
            <Input value={area} onChange={(e) => setArea(e.target.value)} maxLength={60} placeholder="O escribí otra" className="h-10 rounded-xl" />
          </div>
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold">Descripción (opcional)</span>
            <Input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} maxLength={300} placeholder="¿Para qué es este canal?" className="h-10 rounded-xl" />
          </label>
          <div className="space-y-1.5">
            <span className="text-sm font-semibold">Personas del canal · {miembros.length + 1}</span>
            <ElegirPersonas personas={res.personas} elegidas={miembros} onCambio={setMiembros} yo={res.yo.id} />
          </div>
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
          {canal && (
            <Button variant="ghost" onClick={() => void archivar()} className="rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive sm:mr-auto">
              Archivar canal
            </Button>
          )}
          <Button variant="outline" onClick={onCerrar} className="rounded-full sm:ml-auto">
            Cancelar
          </Button>
          <Button onClick={() => void guardar()} disabled={guardando} className="ce-boton rounded-full px-6">
            {guardando ? <Loader2 className="mr-2 size-4 animate-spin" /> : canal ? <Check className="mr-2 size-4" /> : <Plus className="mr-2 size-4" />}
            {canal ? "Guardar" : "Crear canal"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ───────────── Nuevo mensaje privado ───────────── */
function NuevoPrivado({ abierto, onCerrar, res, onListo }: { abierto: boolean; onCerrar: () => void; res: ResumenChat; onListo: (canalId: string) => void }) {
  const [q, setQ] = useState("");
  const [ocupado, setOcupado] = useState<string | null>(null);
  const puedeA = (x: PersonaChat) => res.yo.permisos.directos || x.rol === "admin";
  const lista = res.personas.filter((x) => x.id !== res.yo.id && (!q || x.nombre.toLowerCase().includes(q.toLowerCase())));
  const abrir = async (x: PersonaChat) => {
    setOcupado(x.id);
    try {
      const id = await abrirDirecto(x.id);
      onCerrar();
      onListo(id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo abrir la conversación.");
    } finally {
      setOcupado(null);
    }
  };
  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent className="ce-clinica max-h-[92dvh] overflow-y-auto rounded-3xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Mensaje privado</DialogTitle>
          <DialogDescription>Solo lo ven ustedes dos.</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar persona" className="h-11 rounded-xl pl-9" />
        </div>
        <ul className="max-h-[50vh] space-y-1 overflow-y-auto scroll-sutil">
          {lista.length === 0 && <li className="py-6 text-center text-sm text-muted-foreground">No hay nadie con ese nombre.</li>}
          {lista.map((x) => {
            const ok = puedeA(x);
            return (
              <li key={x.id}>
                <button
                  type="button"
                  disabled={!ok || ocupado !== null}
                  onClick={() => void abrir(x)}
                  className="flex w-full items-center gap-3 rounded-2xl px-2.5 py-2.5 text-left transition hover:bg-primary/[0.06] disabled:cursor-not-allowed disabled:opacity-45"
                  title={ok ? undefined : "El Administrador no habilitó los mensajes privados entre compañeros"}
                >
                  <Avatar nombre={x.nombre} rol={x.rol} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{x.nombre}</span>
                    <span className="block truncate text-xs text-muted-foreground">{x.rolNombre}</span>
                  </span>
                  {ocupado === x.id ? <Loader2 className="size-4 animate-spin" /> : ok ? <SendHorizontal className="size-4 text-primary" /> : <Lock className="size-4" />}
                </button>
              </li>
            );
          })}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

/* ───────────── Permisos del chat (Administrador) ───────────── */
function DialogoPermisos({ abierto, onCerrar, actuales }: { abierto: boolean; onCerrar: () => void; actuales: Record<RolChat, PermisosChat> }) {
  const [p, setP] = useState(actuales);
  const [guardando, setGuardando] = useState(false);
  // Se toma lo guardado al abrir (las actualizaciones automáticas no pisan lo que estás cambiando)
  useEffect(() => {
    if (abierto) setP(actuales);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto]);
  const roles = Object.keys(NOMBRE_ROL_CHAT) as RolChat[];
  const guardar = async () => {
    setGuardando(true);
    try {
      await guardarPermisosChat(p);
      toast.success("Permisos del chat guardados. Se aplican al instante.");
      onCerrar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setGuardando(false);
    }
  };
  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent className="ce-clinica max-h-[92dvh] overflow-y-auto rounded-3xl sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5 text-xl">
            <span className="grid size-9 place-items-center rounded-2xl bg-gradient-to-br from-primary to-fuchsia-500 text-white">
              <ShieldCheck className="size-4" />
            </span>
            Qué puede hacer cada rol
          </DialogTitle>
          <DialogDescription>El Administrador puede todo. Al resto le das permiso vos. Todos pueden leer, escribir en sus canales y escribirte a vos.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {PERMISOS_CHAT_INFO.map((info) => (
            <div key={info.id} className="rounded-2xl p-4 ring-1 ring-border">
              <p className="text-sm font-bold">{info.titulo}</p>
              <p className="text-xs text-muted-foreground">{info.detalle}</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {roles.map((r) => (
                  <div key={r} className="flex items-center justify-between gap-2 rounded-xl bg-muted/50 px-3 py-2">
                    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", CHIP_ROL[r])}>{NOMBRE_ROL_CHAT[r]}</span>
                    <Interruptor
                      on={p[r][info.id]}
                      etiqueta={`${info.titulo}: ${NOMBRE_ROL_CHAT[r]}`}
                      onClick={() => setP((prev) => ({ ...prev, [r]: { ...prev[r], [info.id]: !prev[r][info.id] } }))}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onCerrar} className="rounded-full">
            Cancelar
          </Button>
          <Button onClick={() => void guardar()} disabled={guardando} className="ce-boton rounded-full px-6">
            {guardando ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Check className="mr-2 size-4" />}
            Guardar permisos
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
