import { Check, Loader2, Lock, MessagesSquare, RotateCcw, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MODULES, ModuleIcon, availableIn, useCloudEstherOpcional, type PlanId } from "@/lib/cloud-esther/data";
import {
  guardarPermisosPorRol,
  verPermisosPorRol,
  type EquipoClinica,
  type PermisosPorRol,
  type RolConPermisos,
} from "@/lib/clinica/api";
import { PERMISOS_CHAT_INFO, guardarPermisosChat, verChat, type PermisosChat, type RolChat } from "@/lib/clinica/chat";
import { PLAN_DE_CODIGO } from "@/lib/clinica/permisos";

/* Ubicación: src/components/clinica/permisos-rol.tsx
   PERMISOS POR ROL (Accesos del equipo, solo el Administrador): el panel de control de la clínica.
   Para cada rol (Odontólogo/a, Secretaría, Asistente) se prende o apaga cada módulo del plan, y en el
   mismo lugar qué puede hacer en la Comunicación interna. Se aplica al instante a todas las personas
   de ese rol (quien tenga permisos elegidos a mano con «Ve todo su rol» usa los suyos).
   Lo que un rol no puede tener por seguridad aparece con candado y el motivo. */

const ROLES: { id: RolConPermisos; nombre: string; plural: string; chip: string; punto: string }[] = [
  { id: "odontologo", nombre: "Odontólogo/a", plural: "Odontólogos", chip: "bg-sky-500/10 text-sky-700 dark:text-sky-300", punto: "bg-sky-600" },
  { id: "secretaria", nombre: "Secretaría", plural: "Secretaría", chip: "bg-amber-500/15 text-amber-800 dark:text-amber-200", punto: "bg-amber-500" },
  { id: "asistente", nombre: "Asistente", plural: "Asistentes", chip: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300", punto: "bg-emerald-600" },
];

const CLINICOS = new Set(["historia", "odontograma", "odontograma3d", "recetas", "estudios", "laboratorio", "tratamientos"]);
const SOLO_ADMIN = new Set(["equipo", "configuracion", "finanzas", "rrhh", "bi", "integraciones", "automatizaciones", "multiempresa", "admin"]);
function motivoBloqueo(rol: RolConPermisos, id: string) {
  if (SOLO_ADMIN.has(id)) return "Solo el Administrador";
  if (rol === "secretaria" && CLINICOS.has(id)) return "Datos de salud: solo el equipo clínico";
  return "No corresponde a este rol";
}

export function PermisosPorRolPanel({ slug, equipo }: { slug: string; equipo: EquipoClinica | null }) {
  const ctx = useCloudEstherOpcional();
  const plan: PlanId | null = ctx?.plan ?? PLAN_DE_CODIGO[equipo?.plan ?? ""] ?? null;
  const [datos, setDatos] = useState<PermisosPorRol | null>(null);
  const [chat, setChat] = useState<Record<RolChat, PermisosChat> | null>(null);
  const [rol, setRol] = useState<RolConPermisos>("secretaria");
  // Borradores (se guardan todos juntos con «Guardar»)
  const [mods, setMods] = useState<Record<RolConPermisos, string[]> | null>(null);
  const [perms, setPerms] = useState<Record<RolChat, PermisosChat> | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(() => {
    Promise.all([verPermisosPorRol(slug), verChat().catch(() => null)])
      .then(([p, c]) => {
        setDatos(p);
        setMods({
          odontologo: p.roles.odontologo ?? p.maximos.odontologo,
          secretaria: p.roles.secretaria ?? p.maximos.secretaria,
          asistente: p.roles.asistente ?? p.maximos.asistente,
        });
        if (c?.permisosPorRol) {
          setChat(c.permisosPorRol);
          setPerms(c.permisosPorRol);
        }
        setError(null);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "No se pudieron cargar los permisos."));
  }, [slug]);
  useEffect(cargar, [cargar]);

  // Todos los módulos del plan de la clínica, en el orden del menú
  const modulosPlan = useMemo(
    () => MODULES.filter((m) => (!plan || availableIn(m, plan)) && m.id !== "admin"),
    [plan],
  );
  const grupos = [...new Set(modulosPlan.map((m) => m.group))];

  if (error) {
    return (
      <section className="ce-tarjeta p-6">
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="outline" onClick={cargar} className="mt-3 rounded-full">
          Probar de nuevo
        </Button>
      </section>
    );
  }
  if (!datos || !mods) {
    return (
      <section className="ce-tarjeta flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Cargando los permisos por rol…
      </section>
    );
  }

  const maximos = datos.maximos[rol];
  const elegidos = mods[rol];
  const siempre = new Set([...datos.siempre, "comunicacion-interna"]);
  const habilitables = modulosPlan.filter((m) => maximos.includes(m.id) && !siempre.has(m.id));
  const prendidos = habilitables.filter((m) => elegidos.includes(m.id)).length;
  const cambiosMods = ROLES.some((r) => {
    const antes = datos.roles[r.id] ?? datos.maximos[r.id];
    const ahora = mods[r.id];
    return antes.length !== ahora.length || antes.some((x) => !ahora.includes(x));
  });
  const cambiosChat = !!chat && !!perms && JSON.stringify(chat) !== JSON.stringify(perms);
  const personasDelRol = equipo?.personas.filter((p) => p.rol === rol && p.estado !== "desactivada") ?? [];
  const aMano = personasDelRol.filter((p) => p.modulosPersonalizados).length;

  const alternar = (id: string) =>
    setMods((prev) =>
      prev ? { ...prev, [rol]: prev[rol].includes(id) ? prev[rol].filter((x) => x !== id) : [...prev[rol], id] } : prev,
    );
  const todo = (on: boolean) =>
    setMods((prev) => (prev ? { ...prev, [rol]: on ? [...datos.maximos[rol]] : [...datos.siempre] } : prev));

  const guardar = async () => {
    setGuardando(true);
    try {
      if (cambiosMods) {
        const cuerpo: Partial<Record<RolConPermisos, string[] | null>> = {};
        for (const r of ROLES) {
          const max = datos.maximos[r.id];
          const lista = mods[r.id];
          cuerpo[r.id] = max.every((m) => lista.includes(m) || datos.siempre.includes(m)) ? null : lista;
        }
        setDatos(await guardarPermisosPorRol(slug, cuerpo));
      }
      if (cambiosChat && perms) {
        setChat(await guardarPermisosChat(perms));
      }
      toast.success("Permisos guardados. Ya se aplican a todo el equipo.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudieron guardar los permisos.");
    } finally {
      setGuardando(false);
    }
  };

  const infoRol = ROLES.find((r) => r.id === rol)!;

  return (
    <section className="ce-tarjeta overflow-hidden">
      {/* Encabezado */}
      <div className="border-b border-border/60 bg-gradient-to-br from-primary/[0.06] via-transparent to-fuchsia-500/[0.05] p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
              <ShieldCheck className="size-3.5" /> Panel de control
            </p>
            <h2 className="mt-3 text-xl font-extrabold tracking-tight sm:text-2xl">Permisos por rol</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Elegí qué ve cada rol de tu clínica. Se aplica al instante a todas las personas de ese rol, en el Centro de
              operaciones y en Administración. El servidor también lo cumple: lo que apagás, no se entrega.
            </p>
          </div>
          <Button onClick={() => void guardar()} disabled={guardando || (!cambiosMods && !cambiosChat)} className="ce-boton h-11 rounded-full px-6">
            {guardando ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Check className="mr-2 size-4" />}
            {cambiosMods || cambiosChat ? "Guardar cambios" : "Guardado"}
          </Button>
        </div>

        {/* Roles */}
        <div className="mt-5 grid grid-cols-3 gap-2" role="tablist" aria-label="Rol">
          {ROLES.map((r) => {
            const cant = equipo?.personas.filter((p) => p.rol === r.id && p.estado !== "desactivada").length ?? 0;
            const on = rol === r.id;
            return (
              <button
                key={r.id}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setRol(r.id)}
                className={cn(
                  "flex min-w-0 flex-col items-center gap-1 rounded-2xl px-2 py-3 text-center transition sm:flex-row sm:gap-3 sm:px-4 sm:text-left",
                  on
                    ? "bg-gradient-to-br from-primary to-fuchsia-500 text-white shadow-[0_12px_26px_-14px_rgba(124,58,237,0.9)]"
                    : "bg-card ring-1 ring-border hover:ring-primary/40",
                )}
              >
                <span className={cn("size-2.5 shrink-0 rounded-full", on ? "bg-white" : r.punto)} />
                <span className="min-w-0">
                  <span className="block truncate text-xs font-bold sm:text-sm">{r.nombre}</span>
                  <span className={cn("block text-[10px] sm:text-xs", on ? "text-white/80" : "text-muted-foreground")}>
                    {cant} {cant === 1 ? "persona" : "personas"}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-6 p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-primary/[0.05] px-4 py-3">
          <p className="text-sm">
            <span className={cn("mr-2 rounded-full px-2.5 py-0.5 text-xs font-semibold", infoRol.chip)}>{infoRol.nombre}</span>
            ve <span className="font-extrabold text-primary">{prendidos}</span> de {habilitables.length} módulos que puede tener
          </p>
          <div className="flex gap-3 text-xs font-semibold">
            <button type="button" onClick={() => todo(true)} className="text-primary hover:underline">
              Prender todo
            </button>
            <button type="button" onClick={() => todo(false)} className="text-muted-foreground hover:text-foreground hover:underline">
              Solo lo básico
            </button>
          </div>
        </div>

        {grupos.map((g) => (
          <div key={g}>
            <p className="mb-2.5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              <span className="h-1 w-3 rounded-full bg-gradient-to-r from-primary to-fuchsia-500" />
              {g}
            </p>
            <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3" data-movil="1col">
              {modulosPlan
                .filter((m) => m.group === g)
                .map((m) => {
                  const fijo = siempre.has(m.id);
                  const puede = maximos.includes(m.id) || m.id === "comunicacion-interna";
                  const on = fijo || (puede && elegidos.includes(m.id));
                  const bloqueado = !puede;
                  return (
                    <li key={m.id}>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={on}
                        disabled={fijo || bloqueado}
                        onClick={() => alternar(m.id)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left ring-1 transition",
                          bloqueado
                            ? "cursor-not-allowed bg-muted/40 ring-transparent"
                            : on
                              ? "bg-card ring-primary/25 shadow-[0_8px_18px_-14px_rgba(124,58,237,0.7)] hover:-translate-y-0.5"
                              : "bg-muted/30 ring-border hover:ring-primary/40",
                          fijo && "cursor-default hover:translate-y-0",
                        )}
                      >
                        <span
                          className={cn(
                            "grid size-9 shrink-0 place-items-center rounded-xl",
                            on ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                          )}
                        >
                          <ModuleIcon name={m.icon} className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={cn("block truncate text-sm font-semibold", bloqueado && "text-muted-foreground")}>{m.label}</span>
                          <span className="block truncate text-[11px] text-muted-foreground">
                            {m.id === "comunicacion-interna"
                              ? "Todo el equipo (permisos abajo)"
                              : fijo
                                ? "Siempre visible"
                                : bloqueado
                                  ? motivoBloqueo(rol, m.id)
                                  : on
                                    ? "Lo ve"
                                    : "No lo ve"}
                          </span>
                        </span>
                        {fijo || bloqueado ? (
                          <Lock className="size-4 shrink-0 text-muted-foreground/70" />
                        ) : (
                          <span
                            className={cn(
                              "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
                              on ? "bg-gradient-to-r from-primary to-fuchsia-500" : "bg-muted-foreground/25",
                            )}
                          >
                            <span className={cn("size-5 rounded-full bg-white shadow transition-transform", on ? "translate-x-[22px]" : "translate-x-0.5")} />
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
            </ul>
          </div>
        ))}

        {/* Comunicación interna */}
        <div className="rounded-3xl border border-primary/15 bg-gradient-to-br from-primary/[0.04] to-transparent p-4 sm:p-5">
          <p className="flex items-center gap-2 text-sm font-bold">
            <span className="grid size-8 place-items-center rounded-xl bg-gradient-to-br from-primary to-fuchsia-500 text-white">
              <MessagesSquare className="size-4" />
            </span>
            Comunicación interna · {infoRol.plural}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Todos pueden leer, escribir en sus canales y escribirte a vos. Elegí qué más puede hacer este rol.
          </p>
          {perms ? (
            <ul className="mt-3 grid gap-2 sm:grid-cols-2" data-movil="1col">
              {PERMISOS_CHAT_INFO.map((info) => {
                const on = perms[rol][info.id];
                return (
                  <li key={info.id}>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={on}
                      onClick={() => setPerms((prev) => (prev ? { ...prev, [rol]: { ...prev[rol], [info.id]: !prev[rol][info.id] } } : prev))}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left ring-1 transition",
                        on ? "bg-card ring-primary/25" : "bg-muted/30 ring-border hover:ring-primary/40",
                      )}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold">{info.titulo}</span>
                        <span className="block text-[11px] leading-snug text-muted-foreground">{info.detalle}</span>
                      </span>
                      <span
                        className={cn(
                          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
                          on ? "bg-gradient-to-r from-primary to-fuchsia-500" : "bg-muted-foreground/25",
                        )}
                      >
                        <span className={cn("size-5 rounded-full bg-white shadow transition-transform", on ? "translate-x-[22px]" : "translate-x-0.5")} />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">No se pudieron cargar los permisos del chat.</p>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {aMano > 0
              ? `${aMano} ${aMano === 1 ? "persona de este rol tiene" : "personas de este rol tienen"} permisos elegidos a mano (usan los suyos: «Acceso elegido por vos» en la lista).`
              : "Para una persona en particular, usá «Ve todo su rol» en la lista del equipo."}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={cargar} disabled={guardando} className="rounded-full" title="Descartar cambios">
              <RotateCcw className="mr-2 size-4" /> Descartar
            </Button>
            <Button onClick={() => void guardar()} disabled={guardando || (!cambiosMods && !cambiosChat)} className="ce-boton rounded-full px-6">
              {guardando ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Check className="mr-2 size-4" />}
              Guardar cambios
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
