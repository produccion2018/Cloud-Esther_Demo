import {
  ArrowLeft,
  Building2,
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
  Paperclip,
  Pencil,
  Plus,
  Search,
  SendHorizontal,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { HeroModulo } from "@/components/clinica/hero-modulo";
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
  cambiarCanal,
  confirmarLectura,
  crearCanal,
  enviarComunicado,
  enviarMensaje,
  guardarPermisosChat,
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
  type ResumenChat,
  type RolChat,
} from "@/lib/clinica/chat";
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
                placeholder="Buscar canal o persona"
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
            {c.pendientes > 0 && (
              <span className="ml-auto inline-flex shrink-0 items-center gap-0.5 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300" title="Comunicados por confirmar">
                <Megaphone className="size-3" />
                {c.pendientes}
              </span>
            )}
            {c.noLeidos > 0 && (
              <span className={cn("grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-gradient-to-r from-primary to-fuchsia-500 px-1.5 text-[10px] font-bold text-white", c.pendientes === 0 && "ml-auto")}>
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
}: {
  canal: CanalChat;
  res: ResumenChat;
  onVolver: () => void;
  onEditar: () => void;
  onLeido: () => void;
}) {
  const [mensajes, setMensajes] = useState<MensajeChat[] | null>(null);
  const [hayMas, setHayMas] = useState(false);
  const [texto, setTexto] = useState("");
  const [archivo, setArchivo] = useState<ArchivoNuevo | null>(null);
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
    if ((!t && !archivo) || enviando) return;
    setEnviando(true);
    try {
      const m = await enviarMensaje(canal.id, { texto: t, tipo: comoComunicado ? "comunicado" : "mensaje", archivo: archivo ?? undefined });
      setMensajes((prev) => [...(prev ?? []).filter((x) => x.id !== m.id), m]);
      setTexto("");
      setArchivo(null);
      setComoComunicado(false);
      requestAnimationFrame(() => finRef.current?.scrollIntoView({ block: "end", behavior: "smooth" }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo enviar.");
    } finally {
      setEnviando(false);
    }
  };

  const otro = canal.tipo === "directo" ? res.personas.find((x) => canal.miembros.includes(x.id) && x.id !== res.yo.id) : undefined;
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
        {canal.puedoAdministrar && (
          <Button variant="outline" size="sm" onClick={onEditar} className="ce-levanta h-9 shrink-0 rounded-full px-3">
            <Pencil className="size-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline">Editar</span>
          </Button>
        )}
      </header>

      {/* Mensajes */}
      <div ref={listaRef} className="min-h-0 flex-1 overflow-y-auto bg-[radial-gradient(120%_60%_at_100%_0%,color-mix(in_oklab,var(--primary)_5%,transparent),transparent)] px-3 py-4 scroll-sutil sm:px-6">
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
        <div className="border-t border-border/60 bg-card/70 p-3 backdrop-blur sm:px-5">
          {(archivo || comoComunicado) && (
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {comoComunicado && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-800 dark:text-amber-200">
                  <Megaphone className="size-3.5" /> Se envía como comunicado (piden confirmar lectura)
                </span>
              )}
              {archivo && <Adjuntar archivo={archivo} onArchivo={setArchivo} />}
            </div>
          )}
          <div className="flex items-end gap-1.5 rounded-3xl bg-background p-1.5 ring-1 ring-border transition focus-within:ring-2 focus-within:ring-primary/40">
            {p.archivos && !archivo && <Adjuntar archivo={null} onArchivo={setArchivo} compacto />}
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
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void enviar();
                }
              }}
              rows={1}
              maxLength={4000}
              placeholder={canal.tipo === "directo" ? `Mensaje para ${canal.nombre}` : `Escribí en ${canal.nombre}`}
              className="max-h-36 min-h-10 flex-1 resize-none border-0 bg-transparent px-2 py-2.5 text-sm shadow-none focus-visible:ring-0"
              aria-label="Mensaje"
            />
            <Button
              onClick={() => void enviar()}
              disabled={enviando || (!texto.trim() && !archivo)}
              className="ce-boton size-10 shrink-0 rounded-full p-0"
              aria-label="Enviar"
            >
              {enviando ? <Loader2 className="size-4 animate-spin" /> : <SendHorizontal className="size-4" />}
            </Button>
          </div>
          <p className="mt-1.5 hidden px-2 text-[10px] text-muted-foreground sm:block">Enter para enviar · Shift + Enter para otra línea</p>
        </div>
      ) : (
        <p className="border-t border-border/60 p-4 text-center text-xs text-muted-foreground">Solo las personas del canal pueden escribir acá.</p>
      )}
    </>
  );
}

/* ───────────── Un mensaje ───────────── */
function Mensaje({ m, seguido, res, onCambio }: { m: MensajeChat; seguido: boolean; res: ResumenChat; onCambio: (m: MensajeChat) => void }) {
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
      <div className="group py-2">
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
              <p className="mt-1.5 whitespace-pre-wrap break-words text-[15px] leading-relaxed">{m.texto}</p>
              {archivo}
            </div>
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
    <div className={cn("group flex items-end gap-2.5", m.mio ? "flex-row-reverse" : "", seguido ? "pt-0.5" : "pt-3")}>
      {!m.mio && (seguido ? <span className="w-9 shrink-0" /> : <Avatar nombre={m.autor.nombre} rol={rol} />)}
      <div className={cn("flex min-w-0 max-w-[85%] flex-col sm:max-w-[70%]", m.mio ? "items-end" : "items-start")}>
        {!seguido && (
          <p className={cn("mb-1 flex items-center gap-2 px-1 text-[11px]", m.mio && "flex-row-reverse")}>
            <span className="font-semibold">{m.mio ? "Vos" : m.autor.nombre}</span>
            {!m.mio && autor && <span className={cn("rounded-full px-1.5 py-px text-[9px] font-bold", CHIP_ROL[rol])}>{autor.rolNombre}</span>}
            <span className="tabular-nums text-muted-foreground">{hora(m.fecha)}</span>
          </p>
        )}
        <div className="flex max-w-full items-center gap-1.5">
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
                  : "rounded-bl-lg bg-card shadow-[0_1px_2px_rgba(30,0,60,0.06)] ring-1 ring-border/70",
            )}
          >
            {m.quitado ? "Mensaje quitado" : m.texto && <p className="whitespace-pre-wrap break-words">{m.texto}</p>}
            {!m.quitado && archivo}
          </div>
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
