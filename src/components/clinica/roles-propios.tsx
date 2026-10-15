import { Briefcase, Crown, HeartPulse, Loader2, Pencil, Plus, ShieldCheck, Sparkles, Trash2, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { MODULES, ModuleIcon, availableIn, useCloudEstherOpcional, type PlanId } from "@/lib/cloud-esther/data";
import {
  borrarRolPropio,
  crearRolPropio,
  editarRolPropio,
  type EquipoClinica,
  type RolPropio,
} from "@/lib/clinica/api";
import { PLAN_DE_CODIGO } from "@/lib/clinica/permisos";
import { cn } from "@/lib/utils";

/* Ubicación: src/components/clinica/roles-propios.tsx
   ROLES DE TU CLÍNICA (Plus y Enterprise, solo el Administrador).
   Además de Odontólogo/a, Secretaría y Asistente, el Administrador crea los roles que usa su
   clínica (ej.: «Facturación» para Sandra, «Recursos humanos» para Luis) y elige qué módulos ve
   cada uno. Arrancan SIN datos de salud: solo ven lo que se les prende. El servidor lo cumple. */

/** Módulos con datos de salud (se marcan para que el Administrador lo piense dos veces) */
const SALUD = new Set(["historia", "odontograma", "odontograma3d", "recetas", "estudios", "laboratorio", "tratamientos", "ia"]);
const SIEMPRE = new Set(["dashboard", "notificaciones", "comunicacion-interna"]);

/** Sugerencias para arrancar rápido (se ajustan después) */
const SUGERENCIAS: { nombre: string; modulos: string[] }[] = [
  { nombre: "Facturación", modulos: ["presupuestos", "facturacion", "finanzas"] },
  { nombre: "Recursos humanos", modulos: ["equipo", "rrhh"] },
  { nombre: "Recepción", modulos: ["agenda", "pacientes", "comunicaciones"] },
  { nombre: "Contabilidad", modulos: ["facturacion", "finanzas", "bi"] },
  { nombre: "Marketing", modulos: ["marketing", "comunicaciones", "bi"] },
  { nombre: "Compras", modulos: ["inventario", "finanzas"] },
];

/** Colores de cada rol propio (según su lugar en la lista) */
export const TONOS_ROL_PROPIO = [
  { degrade: "from-violet-500 to-fuchsia-500", chip: "bg-violet-500/10 text-violet-700 dark:text-violet-300", punto: "bg-violet-500" },
  { degrade: "from-rose-500 to-orange-400", chip: "bg-rose-500/10 text-rose-700 dark:text-rose-300", punto: "bg-rose-500" },
  { degrade: "from-teal-500 to-cyan-500", chip: "bg-teal-500/10 text-teal-700 dark:text-teal-300", punto: "bg-teal-500" },
  { degrade: "from-indigo-500 to-blue-500", chip: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300", punto: "bg-indigo-500" },
  { degrade: "from-amber-500 to-pink-500", chip: "bg-amber-500/15 text-amber-800 dark:text-amber-200", punto: "bg-amber-500" },
  { degrade: "from-lime-500 to-emerald-500", chip: "bg-lime-500/15 text-lime-800 dark:text-lime-200", punto: "bg-lime-500" },
];
export const tonoRolPropio = (codigo: string, roles: RolPropio[] | undefined) =>
  TONOS_ROL_PROPIO[Math.max(0, roles?.findIndex((r) => r.codigo === codigo) ?? 0) % TONOS_ROL_PROPIO.length]!;

export function RolesPropiosPanel({
  slug,
  equipo,
  onEquipo,
}: {
  slug: string;
  equipo: EquipoClinica;
  onEquipo: (e: EquipoClinica) => void;
}) {
  const ctx = useCloudEstherOpcional();
  const plan: PlanId | null = ctx?.plan ?? PLAN_DE_CODIGO[equipo.plan ?? ""] ?? null;
  const [editando, setEditando] = useState<RolPropio | "nuevo" | null>(null);
  const [borrando, setBorrando] = useState<string | null>(null);
  const roles = equipo.rolesPropios ?? [];
  const modulosPlan = useMemo(
    () => MODULES.filter((m) => (!plan || availableIn(m, plan)) && m.id !== "admin" && !SIEMPRE.has(m.id)),
    [plan],
  );
  const nombreModulo = (id: string) => MODULES.find((m) => m.id === id)?.label ?? id;

  // Start y Pro: se muestra qué trae Plus/Enterprise (sin botones que no sirven)
  if (!equipo.puedeCrearRoles) {
    return (
      <section className="ce-tarjeta relative overflow-hidden p-6 sm:p-7">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-fuchsia-500/10 blur-3xl" />
        <div className="relative flex flex-wrap items-center gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-[0_10px_24px_-12px_rgba(124,58,237,0.9)]">
            <Crown className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold tracking-[-0.01em]">Roles de tu clínica</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Con los planes <b className="font-semibold text-foreground">Plus</b> y <b className="font-semibold text-foreground">Enterprise</b> creás tus propios roles —
              Facturación, Recursos humanos, Recepción…— y elegís qué ve cada uno.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const borrar = async (r: RolPropio) => {
    if (!window.confirm(`¿Borrar el rol «${r.nombre}»?`)) return;
    setBorrando(r.codigo);
    try {
      onEquipo(await borrarRolPropio(slug, r.codigo));
      toast.success(`Se borró el rol «${r.nombre}».`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo borrar el rol.");
    } finally {
      setBorrando(null);
    }
  };

  return (
    <section className="ce-tarjeta relative overflow-hidden p-6 sm:p-8">
      <div aria-hidden className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-fuchsia-500/[0.08] blur-3xl" />
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
            <Crown className="size-3.5" /> Plus y Enterprise
          </span>
          <h2 className="mt-2 text-xl font-semibold tracking-[-0.02em]">Roles de tu clínica</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Además de Odontólogo/a, Secretaría y Asistente, creá los roles que usa tu equipo y elegí qué ve cada uno.
            Arrancan sin datos de salud: solo ven lo que vos prendas.
          </p>
        </div>
        <Button onClick={() => setEditando("nuevo")} className="ce-boton h-10 rounded-full px-5">
          <Plus className="mr-1.5 size-4" /> Nuevo rol
        </Button>
      </div>

      {roles.length === 0 ? (
        <button
          type="button"
          onClick={() => setEditando("nuevo")}
          className="relative mt-5 flex w-full flex-col items-center gap-2 rounded-3xl border-2 border-dashed border-primary/20 px-6 py-8 text-center transition hover:border-primary/40 hover:bg-primary/[0.03]"
        >
          <Sparkles className="size-6 text-primary" />
          <span className="text-sm font-semibold">Creá tu primer rol</span>
          <span className="text-xs text-muted-foreground">Por ejemplo «Facturación» o «Recursos humanos»</span>
        </button>
      ) : (
        <ul className="relative mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3" data-movil="1col">
          {roles.map((r, n) => {
            const tono = TONOS_ROL_PROPIO[n % TONOS_ROL_PROPIO.length]!;
            const visibles = r.modulos.filter((m) => !SIEMPRE.has(m));
            const conSalud = visibles.some((m) => SALUD.has(m));
            return (
              <li
                key={r.codigo}
                style={{ animationDelay: `${n * 60}ms` }}
                className="ce-aparecer group relative overflow-hidden rounded-3xl border border-border/60 bg-card p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[0_18px_36px_-24px_rgba(76,29,149,0.55)]"
              >
                <div className="flex items-start gap-3">
                  <span className={cn("grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-[0_8px_18px_-10px_rgba(76,29,149,0.8)]", tono.degrade)}>
                    <Briefcase className="size-5" strokeWidth={1.9} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold tracking-[-0.01em]">{r.nombre}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 whitespace-nowrap text-xs text-muted-foreground">
                      <Users className="size-3.5 shrink-0" />
                      <span>{r.personas === 0 ? "Nadie todavía" : r.personas === 1 ? "1 persona" : `${r.personas} personas`}</span>
                      <span aria-hidden>·</span>
                      <span>{visibles.length} módulo{visibles.length === 1 ? "" : "s"}</span>
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => setEditando(r)}
                      className="grid size-8 place-items-center rounded-full text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
                      aria-label={`Editar ${r.nombre}`}
                      title="Editar"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void borrar(r)}
                      disabled={borrando === r.codigo}
                      className="grid size-8 place-items-center rounded-full text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                      aria-label={`Borrar ${r.nombre}`}
                      title={r.personas > 0 ? "Primero cambiá el rol de esas personas" : "Borrar"}
                    >
                      {borrando === r.codigo ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                    </button>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {visibles.length === 0 ? (
                    <span className="text-xs text-muted-foreground">Solo Inicio y Avisos</span>
                  ) : (
                    visibles.slice(0, 5).map((m) => (
                      <span key={m} className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-medium", tono.chip)}>
                        {nombreModulo(m)}
                      </span>
                    ))
                  )}
                  {visibles.length > 5 && <span className="px-1 text-[11px] text-muted-foreground">+{visibles.length - 5}</span>}
                </div>
                {conSalud && (
                  <p className="mt-2.5 flex items-center gap-1.5 text-[11px] text-rose-600 dark:text-rose-300">
                    <HeartPulse className="size-3.5" /> Ve datos de salud de los pacientes
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <EditarRol
        slug={slug}
        rol={editando}
        modulosPlan={modulosPlan}
        onCerrar={() => setEditando(null)}
        onListo={(e, nombre, nuevo) => {
          onEquipo(e);
          setEditando(null);
          toast.success(nuevo ? `Creaste el rol «${nombre}». Ya lo podés dar al invitar o desde «…» de cada persona.` : `Se guardó «${nombre}». Se aplica al instante.`);
        }}
      />
    </section>
  );
}

function EditarRol({
  slug,
  rol,
  modulosPlan,
  onCerrar,
  onListo,
}: {
  slug: string;
  rol: RolPropio | "nuevo" | null;
  modulosPlan: typeof MODULES;
  onCerrar: () => void;
  onListo: (e: EquipoClinica, nombre: string, nuevo: boolean) => void;
}) {
  const nuevo = rol === "nuevo";
  const [nombre, setNombre] = useState("");
  const [modulos, setModulos] = useState<string[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [abiertoPara, setAbiertoPara] = useState<string | null>(null);
  // Al abrir: carga lo del rol (o vacío si es nuevo)
  const clave = rol === null ? null : nuevo ? "nuevo" : rol.codigo;
  if (clave !== abiertoPara) {
    setAbiertoPara(clave);
    setNombre(rol && rol !== "nuevo" ? rol.nombre : "");
    setModulos(rol && rol !== "nuevo" ? rol.modulos.filter((m) => !SIEMPRE.has(m)) : []);
  }
  const grupos = [...new Set(modulosPlan.map((m) => m.group))];
  const disponibles = new Set(modulosPlan.map((m) => m.id));
  const alternar = (id: string) => setModulos((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const conSalud = modulos.some((m) => SALUD.has(m));

  const guardar = async () => {
    const n = nombre.trim().replace(/\s+/g, " ");
    if (n.length < 2) return toast.error("Escribí el nombre del rol.");
    setGuardando(true);
    try {
      const e = nuevo
        ? await crearRolPropio(slug, { nombre: n, modulos })
        : await editarRolPropio(slug, (rol as RolPropio).codigo, { nombre: n, modulos });
      onListo(e, n, nuevo);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar el rol.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog open={rol !== null} onOpenChange={(v) => !v && !guardando && onCerrar()}>
      <DialogContent className="ce-clinica max-h-[92dvh] overflow-y-auto rounded-3xl sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
              <ShieldCheck className="size-4" />
            </span>
            {nuevo ? "Nuevo rol" : `Editar «${(rol as RolPropio | null)?.nombre ?? ""}»`}
          </DialogTitle>
          <DialogDescription>
            Elegí el nombre y qué módulos ve. Inicio, Avisos y la Comunicación interna se ven siempre. Los cambios se aplican al instante a quien tenga este rol.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <label htmlFor="rol-nombre" className="text-xs font-medium text-muted-foreground">
            Nombre del rol
          </label>
          <Input
            id="rol-nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value.slice(0, 40))}
            placeholder="Ej.: Facturación"
            className="h-11 rounded-xl"
            autoComplete="off"
          />
          {nuevo && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {SUGERENCIAS.map((s) => (
                <button
                  key={s.nombre}
                  type="button"
                  onClick={() => {
                    setNombre(s.nombre);
                    setModulos(s.modulos.filter((m) => disponibles.has(m)));
                  }}
                  className="rounded-full border border-border/70 px-3 py-1 text-xs font-medium text-muted-foreground transition hover:border-primary/40 hover:bg-primary/[0.05] hover:text-primary"
                >
                  {s.nombre}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          {grupos.map((g) => (
            <div key={g}>
              <p className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                <span className="h-1 w-3 rounded-full bg-gradient-to-r from-primary to-fuchsia-500" />
                {g}
              </p>
              <ul className="grid gap-2 sm:grid-cols-2" data-movil="1col">
                {modulosPlan
                  .filter((m) => m.group === g)
                  .map((m) => {
                    const on = modulos.includes(m.id);
                    return (
                      <li key={m.id}>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={on}
                          onClick={() => alternar(m.id)}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left ring-1 transition-all duration-200",
                            on
                              ? "bg-card ring-primary/25 shadow-[0_8px_18px_-14px_rgba(124,58,237,0.7)]"
                              : "bg-muted/30 ring-border hover:ring-primary/40",
                          )}
                        >
                          <span className={cn("grid size-8 shrink-0 place-items-center rounded-xl", on ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                            <ModuleIcon name={m.icon} className="size-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13px] font-medium">{m.label}</span>
                            {SALUD.has(m.id) && (
                              <span className="flex items-center gap-1 text-[10.5px] text-rose-600 dark:text-rose-300">
                                <HeartPulse className="size-3" /> Datos de salud
                              </span>
                            )}
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
            </div>
          ))}
        </div>

        {conSalud && (
          <p className="flex items-start gap-2 rounded-2xl bg-rose-500/10 px-3 py-2 text-xs text-rose-800 dark:text-rose-200">
            <HeartPulse className="mt-0.5 size-4 shrink-0" />
            Este rol va a ver datos de salud de los pacientes. Prendé esos módulos solo si su trabajo lo necesita.
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onCerrar} disabled={guardando} className="rounded-full px-5">
            Cancelar
          </Button>
          <Button onClick={() => void guardar()} disabled={guardando} className="rounded-full px-6">
            {guardando ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : null}
            {nuevo ? "Crear rol" : "Guardar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
