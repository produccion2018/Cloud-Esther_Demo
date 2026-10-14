import {
  Activity,
  ArrowRight,
  Download,
  Eye,
  Loader2,
  LogOut,
  Megaphone,
  Pencil,
  RotateCcw,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { descargarExcel } from "@/components/cloud-esther/rrhh/excel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  verActividad,
  type ActividadEquipo as DatosActividad,
  type ActividadEvento,
  type ActividadPersona,
  type CambioCantidad,
  type RolClinica,
} from "@/lib/clinica/api";

/* Ubicación: src/components/clinica/actividad-equipo.tsx
   ACTIVIDAD DEL EQUIPO (solo el Administrador): todo lo que hace cada persona de la clínica.
   Quién entró y salió, qué cambió en cada módulo («Agenda: agregó 1 turno»), qué fichas
   clínicas abrió y qué comunicados mandó. Nunca muestra datos de pacientes: solo quién,
   qué, cuántos y cuándo. Se actualiza sola cada 30 segundos. */

const COLOR_ROL: Record<RolClinica, string> = {
  admin: "from-primary to-fuchsia-500",
  odontologo: "from-sky-500 to-sky-700",
  secretaria: "from-amber-400 to-amber-600",
  asistente: "from-emerald-500 to-emerald-700",
};

/** Nombre de cada módulo guardado en el servidor */
const MODULO: Record<string, string> = {
  agenda: "Agenda y turnos",
  pacientes: "Pacientes",
  registros: "Fichas de pacientes",
  odontograma: "Odontograma",
  "odontograma-historial": "Historial del odontograma",
  radiografias: "Radiografías e imágenes",
  "rayos-x": "Rayos X",
  "simulador-sonrisa": "Simulador de sonrisa",
  equipo: "Equipo",
  comunicacion: "Comunicación con pacientes",
  "comunicacion-interna": "Comunicación interna",
  notificaciones: "Notificaciones",
  "mensajes-equipo": "Mensajes del equipo",
  marketing: "Marketing",
  inventario: "Inventario",
  rrhh: "RRHH",
  facturacion: "Facturación",
  "presupuestos-config": "Presupuestos",
  finanzas: "Finanzas",
  analitica: "Analítica",
  integraciones: "Integraciones",
  ia: "Esther IA",
  configuracion: "Configuración",
  portal: "Portal",
  "portal-equipo": "Portal del equipo",
  "permisos-portal": "Permisos del portal",
  autorizaciones: "Autorizaciones",
  "modulos-extra": "Módulos adicionales",
};
export const nombreModuloGuardado = (k: string | null) =>
  k ? (MODULO[k] ?? k.charAt(0).toUpperCase() + k.slice(1).replace(/-/g, " ")) : "";

/** Qué se cuenta en cada lista: [singular, plural] */
const COSA: Record<string, [string, string]> = {
  turnos: ["turno", "turnos"],
  pacientes: ["paciente", "pacientes"],
  tareas: ["tarea", "tareas"],
  espera: ["persona en espera", "personas en espera"],
  bloqueos: ["bloqueo de agenda", "bloqueos de agenda"],
  recordatorios: ["recordatorio", "recordatorios"],
  conversaciones: ["conversación", "conversaciones"],
  envios: ["envío", "envíos"],
  campanas: ["campaña", "campañas"],
  plantillas: ["plantilla", "plantillas"],
  integrantes: ["integrante", "integrantes"],
  items: ["aviso", "avisos"],
};
function cosa(modulo: string | null, clave: string): [string, string] {
  if (clave !== "_") return COSA[clave] ?? ["dato", "datos"];
  if (modulo === "registros") return ["ficha", "fichas"];
  if (modulo === "pacientes") return ["paciente", "pacientes"];
  if (modulo?.startsWith("odontograma")) return ["odontograma", "odontogramas"];
  if (modulo === "radiografias" || modulo === "rayos-x") return ["paciente con imágenes", "pacientes con imágenes"];
  return ["dato", "datos"];
}
const n = (k: number, [uno, varios]: [string, string]) => `${k} ${k === 1 ? uno : varios}`;

/** «agregó 1 turno, cambió 2 tareas» */
export function textoCambios(modulo: string | null, d: Record<string, CambioCantidad> | null): string {
  if (!d) return "guardó cambios";
  const partes: string[] = [];
  for (const [clave, c] of Object.entries(d)) {
    const que = cosa(modulo, clave);
    if (c.a) partes.push(`agregó ${n(c.a, que)}`);
    if (c.m) partes.push(`cambió ${n(c.m, que)}`);
    if (c.b) partes.push(`quitó ${n(c.b, que)}`);
  }
  return partes.length ? partes.slice(0, 4).join(", ") : "guardó cambios";
}

const SALIDA: Record<string, string> = {
  Manual: "cerró la sesión",
  Inactividad: "se le cerró la sesión por inactividad",
  Expirada: "se le venció la sesión",
  Revocada: "se le cerró la sesión (cambió su acceso)",
};

function describir(e: ActividadEvento): { texto: string; icono: typeof Pencil; tono: string } {
  switch (e.tipo) {
    case "cambio":
      return { texto: `${nombreModuloGuardado(e.modulo)}: ${textoCambios(e.modulo, e.detalle)}`, icono: Pencil, tono: "bg-primary/10 text-primary" };
    case "consulta":
      return { texto: `Abrió ${nombreModuloGuardado(e.modulo)} (datos de salud)`, icono: Eye, tono: "bg-sky-500/10 text-sky-700 dark:text-sky-300" };
    case "ingreso":
      return { texto: "Entró a la clínica", icono: ArrowRight, tono: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" };
    case "salida":
      return { texto: `Salió: ${SALIDA[e.motivo ?? ""] ?? "cerró la sesión"}`, icono: LogOut, tono: "bg-muted text-muted-foreground" };
    case "comunicado":
      return { texto: "Mandó un comunicado en la Comunicación interna", icono: Megaphone, tono: "bg-amber-500/15 text-amber-700 dark:text-amber-300" };
  }
}

const iniciales = (nombre: string) =>
  nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "?";
const hora = (iso: string) => new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false });
function hace(iso: string | null) {
  if (!iso) return "Sin actividad";
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (min < 1) return "Activo ahora";
  if (min < 60) return `Hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `Hace ${h} h`;
  return new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}
function dia(iso: string) {
  const d = new Date(iso);
  const hoy = new Date();
  if (d.toDateString() === hoy.toDateString()) return "Hoy";
  const ayer = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 1);
  if (d.toDateString() === ayer.toDateString()) return "Ayer";
  const t = d.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
  return t.charAt(0).toUpperCase() + t.slice(1);
}

const PERIODOS = [
  { dias: 1, label: "Hoy" },
  { dias: 7, label: "7 días" },
  { dias: 30, label: "30 días" },
];

export function ActividadEquipo({ slug }: { slug: string }) {
  const [dias, setDias] = useState(7);
  const [persona, setPersona] = useState<string | null>(null);
  const [tipo, setTipo] = useState<"todo" | "cambio" | "ingreso" | "consulta">("todo");
  const [datos, setDatos] = useState<DatosActividad | null>(null);
  const [todas, setTodas] = useState<ActividadPersona[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const cargar = useCallback(() => {
    setCargando(true);
    verActividad(slug, dias, persona ?? undefined)
      .then((r) => {
        setDatos(r);
        if (!persona) setTodas(r.personas);
        setError(null);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "No se pudo cargar la actividad."))
      .finally(() => setCargando(false));
  }, [slug, dias, persona]);
  useEffect(cargar, [cargar]);
  useEffect(() => {
    const t = setInterval(() => document.visibilityState === "visible" && cargar(), 30_000);
    return () => clearInterval(t);
  }, [cargar]);

  const nombreDe = useMemo(() => new Map(todas.map((p) => [p.id, p])), [todas]);
  const eventos = (datos?.eventos ?? []).filter((e) =>
    tipo === "todo" ? true : tipo === "ingreso" ? e.tipo === "ingreso" || e.tipo === "salida" : tipo === "cambio" ? e.tipo === "cambio" || e.tipo === "comunicado" : e.tipo === tipo,
  );
  const porDia = useMemo(() => {
    const g: { dia: string; items: ActividadEvento[] }[] = [];
    for (const e of eventos) {
      const d = dia(e.fecha);
      const ult = g[g.length - 1];
      if (ult?.dia === d) ult.items.push(e);
      else g.push({ dia: d, items: [e] });
    }
    return g;
  }, [eventos]);

  const excel = async () => {
    if (!datos) return;
    try {
      await descargarExcel(`actividad-equipo-${new Date().toISOString().slice(0, 10)}.xlsx`, [
        {
          nombre: "Actividad",
          nota: `Actividad del equipo · últimos ${dias} ${dias === 1 ? "día" : "días"} (sin datos de pacientes)`,
          columnas: [
            { titulo: "Fecha", clave: "fecha", ancho: 20 },
            { titulo: "Persona", clave: "persona", ancho: 28 },
            { titulo: "Rol", clave: "rol", ancho: 16 },
            { titulo: "Qué hizo", clave: "que", ancho: 70 },
          ],
          filas: datos.eventos.map((e) => ({
            fecha: new Date(e.fecha).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" }),
            persona: nombreDe.get(e.personaId)?.nombre ?? "Persona",
            rol: nombreDe.get(e.personaId)?.rolNombre ?? "",
            que: describir(e).texto,
          })),
        },
      ]);
    } catch {
      toast.error("No se pudo armar el Excel. Probá de nuevo.");
    }
  };

  const enLinea = todas.filter((p) => p.enLinea).length;
  const cambiosTotal = todas.reduce((s, p) => s + p.cambios, 0);

  return (
    <div className="space-y-5">
      <section className="ce-tarjeta p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-extrabold tracking-tight">
              <Activity className="size-5 text-primary" /> Actividad del equipo
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {enLinea > 0 ? `${enLinea} ${enLinea === 1 ? "persona trabajando" : "personas trabajando"} ahora · ` : ""}
              {cambiosTotal} {cambiosTotal === 1 ? "cambio" : "cambios"} en {dias === 1 ? "el día" : `los últimos ${dias} días`}. Sin datos de pacientes.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-full bg-muted/70 p-1" role="group" aria-label="Período">
              {PERIODOS.map((x) => (
                <button
                  key={x.dias}
                  type="button"
                  onClick={() => setDias(x.dias)}
                  aria-pressed={dias === x.dias}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 text-xs font-semibold transition",
                    dias === x.dias ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {x.label}
                </button>
              ))}
            </div>
            <Button variant="outline" onClick={cargar} className="ce-levanta h-10 rounded-full px-3" aria-label="Actualizar" title="Actualizar">
              {cargando ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
            </Button>
            <Button variant="outline" onClick={() => void excel()} disabled={!datos} className="ce-levanta h-10 rounded-full px-4">
              <Download className="mr-2 size-4" /> Excel
            </Button>
          </div>
        </div>

        {/* Personas */}
        <div data-movil="1col" className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          <button
            type="button"
            onClick={() => setPersona(null)}
            aria-pressed={persona === null}
            className={cn(
              "flex items-center gap-3 rounded-2xl p-3.5 text-left ring-1 transition hover:-translate-y-0.5",
              persona === null ? "bg-gradient-to-br from-primary to-fuchsia-500 text-white ring-transparent shadow-[0_14px_28px_-18px_rgba(124,58,237,0.9)]" : "bg-card ring-border hover:ring-primary/40",
            )}
          >
            <span className={cn("grid size-10 place-items-center rounded-full", persona === null ? "bg-white/20" : "bg-primary/10 text-primary")}>
              <Users className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold">Todo el equipo</span>
              <span className={cn("block text-xs", persona === null ? "text-white/80" : "text-muted-foreground")}>{todas.length} personas</span>
            </span>
          </button>
          {todas.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPersona(persona === p.id ? null : p.id)}
              aria-pressed={persona === p.id}
              className={cn(
                "flex items-center gap-3 rounded-2xl p-3.5 text-left ring-1 transition hover:-translate-y-0.5",
                persona === p.id ? "bg-primary/[0.07] ring-2 ring-primary/50" : "bg-card ring-border hover:ring-primary/40",
                p.estado === "desactivada" && "opacity-60",
              )}
            >
              <span className="relative">
                <span className={cn("grid size-10 place-items-center rounded-full bg-gradient-to-br text-xs font-bold text-white", COLOR_ROL[p.rol])}>
                  {iniciales(p.nombre)}
                </span>
                {p.enLinea && (
                  <span className="absolute -bottom-0.5 -right-0.5 flex size-3.5">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                    <span className="relative inline-flex size-3.5 rounded-full border-2 border-card bg-emerald-500" />
                  </span>
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold">{p.nombre}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {p.rolNombre} · {p.enLinea ? <span className="font-semibold text-emerald-600">En línea</span> : hace(p.ultimaActividad)}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block text-base font-extrabold tabular-nums text-primary">{p.cambios}</span>
                <span className="block text-[10px] text-muted-foreground">{p.cambios === 1 ? "cambio" : "cambios"}</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Línea de tiempo */}
      <section className="ce-tarjeta-suave p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center gap-1.5" role="group" aria-label="Filtrar">
          {(
            [
              ["todo", "Todo"],
              ["cambio", "Cambios"],
              ["ingreso", "Ingresos y salidas"],
              ["consulta", "Fichas abiertas"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTipo(id)}
              aria-pressed={tipo === id}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-xs font-semibold transition",
                tipo === id ? "bg-primary text-white shadow-sm" : "bg-primary/[0.06] text-primary hover:bg-primary/[0.12]",
              )}
            >
              {label}
            </button>
          ))}
          {persona && (
            <span className="ml-auto truncate text-xs text-muted-foreground">
              Solo {nombreDe.get(persona)?.nombre ?? "esta persona"}
            </span>
          )}
        </div>

        {error && <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        {!datos && !error && (
          <p className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Cargando la actividad…
          </p>
        )}
        {datos && eventos.length === 0 && (
          <div className="py-12 text-center">
            <span className="mx-auto grid size-14 place-items-center rounded-3xl bg-primary/10 text-primary">
              <Activity className="size-6" />
            </span>
            <p className="mt-3 font-bold">Sin movimientos en este período</p>
            <p className="mt-1 text-sm text-muted-foreground">Cuando tu equipo trabaje en la clínica, lo vas a ver acá.</p>
          </div>
        )}
        <div className="space-y-6">
          {porDia.map((g) => (
            <div key={g.dia}>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{g.dia}</p>
              <ol className="relative space-y-1 border-l-2 border-primary/10 pl-5">
                {g.items.map((e) => {
                  const d = describir(e);
                  const p = nombreDe.get(e.personaId);
                  return (
                    <li key={e.id} className="relative flex items-start gap-3 rounded-2xl py-2 pr-2 transition hover:bg-muted/40">
                      <span className={cn("absolute -left-[31px] top-2.5 grid size-5 place-items-center rounded-full ring-4 ring-card", d.tono)}>
                        <d.icono className="size-3" />
                      </span>
                      <span className={cn("grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-br text-[10px] font-bold text-white", COLOR_ROL[p?.rol ?? "asistente"])}>
                        {iniciales(p?.nombre ?? "?")}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm">
                          <span className="font-semibold">{p?.nombre ?? "Persona"}</span>{" "}
                          <span className="text-muted-foreground">· {p?.rolNombre ?? ""}</span>
                        </span>
                        <span className="block break-words text-sm text-foreground/80">{d.texto}</span>
                      </span>
                      <span className="shrink-0 pt-0.5 text-xs tabular-nums text-muted-foreground">{hora(e.fecha)}</span>
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
