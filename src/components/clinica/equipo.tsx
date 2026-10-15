import {
  Check,
  ClipboardPaste,
  Download,
  Eye,
  Lock,
  FileSpreadsheet,
  Loader2,
  MailPlus,
  MoreHorizontal,
  Plus,
  Search,
  UserCheck,
  UserPlus,
  UserX,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { MensajeError } from "@/components/clinica/marco";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MODULES, ModuleIcon, availableIn, useCloudEstherOpcional } from "@/lib/cloud-esther/data";
import { modulosDelRol } from "@/lib/clinica/permisos";
import { PermisosPorRolPanel } from "@/components/clinica/permisos-rol";
import { cn } from "@/lib/utils";
import { descargarEquipoExcel, descargarPlantillaEquipo, leerPersonasDeArchivo } from "@/lib/clinica/excel-equipo";
import {
  ROLES_CLINICA,
  cambiarPersonaEquipo,
  invitarVarios,
  nombrePersona,
  reenviarInvitacion,
  verEquipo,
  type EquipoClinica,
  type PersonaEquipo,
  type RolClinica,
} from "@/lib/clinica/api";

/* Ubicación: src/components/clinica/equipo.tsx
   EQUIPO de la clínica (solo el Administrador).
   - Arriba, los LUGARES del plan: cada persona ocupa uno (se ven sus iniciales) y los libres quedan punteados.
   - Buscar y filtrar por rol (para clínicas de 15 o 20 personas).
   - «Sumar personas»: se arma una lista de varias a la vez (o se pega desde Excel / WhatsApp)
     y se mandan todas las invitaciones juntas. A cada una le llega su correo. */

const COLOR_ROL: Record<RolClinica, { fondo: string; texto: string; anillo: string }> = {
  admin: { fondo: "bg-primary", texto: "text-primary-foreground", anillo: "ring-primary/30" },
  odontologo: { fondo: "bg-sky-600", texto: "text-white", anillo: "ring-sky-600/30" },
  secretaria: { fondo: "bg-amber-500", texto: "text-white", anillo: "ring-amber-500/30" },
  asistente: { fondo: "bg-emerald-600", texto: "text-white", anillo: "ring-emerald-600/30" },
};
const CHIP_ROL: Record<RolClinica, string> = {
  admin: "bg-primary/10 text-primary",
  odontologo: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  secretaria: "bg-amber-500/15 text-amber-800 dark:text-amber-200",
  asistente: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
};
const NOMBRE_ROL = Object.fromEntries(ROLES_CLINICA.map((r) => [r.id, r.nombre])) as Record<RolClinica, string>;
const PLURAL_ROL: Record<RolClinica, string> = {
  admin: "Administradores",
  odontologo: "Odontólogos",
  secretaria: "Secretaría",
  asistente: "Asistentes",
};

const iniciales = (nombre: string) =>
  nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "?";

const cuando = (iso: string | null) => {
  if (!iso) return null;
  const d = new Date(iso);
  const dias = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (dias <= 0) return `hoy ${d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false })}`;
  if (dias === 1) return "ayer";
  return d.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
};

function Avatar({ p, chico = false }: { p: { nombre: string; rol: RolClinica }; chico?: boolean }) {
  const c = COLOR_ROL[p.rol];
  return (
    <span
      className={cn(
        "ce-avatar inline-flex shrink-0 items-center justify-center rounded-full font-bold",
        c.fondo,
        c.texto,
        chico ? "h-10 w-10 text-xs ring-2 ring-background" : "h-11 w-11 text-sm shadow-sm",
      )}
      aria-hidden="true"
    >
      {iniciales(p.nombre)}
    </span>
  );
}

export function EquipoClinicaPanel({
  slug,
  onEquipo,
}: {
  slug: string;
  /** Avisa cada vez que cambia el equipo (para los indicadores del encabezado) */
  onEquipo?: ((e: EquipoClinica) => void) | undefined;
}) {
  const [equipo, setEquipo] = useState<EquipoClinica | null>(null);
  useEffect(() => {
    if (equipo) onEquipo?.(equipo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [equipo]);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [sumar, setSumar] = useState(false);
  const [buscar, setBuscar] = useState("");
  const [filtro, setFiltro] = useState<RolClinica | "todos">("todos");
  const [queVe, setQueVe] = useState<PersonaEquipo | null>(null);

  const cargar = useCallback(() => {
    setError(null);
    verEquipo(slug)
      .then(setEquipo)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "No se pudo cargar el equipo."));
  }, [slug]);
  useEffect(cargar, [cargar]);

  const cambiar = async (
    p: PersonaEquipo,
    cambios: { rol?: RolClinica; activo?: boolean; modulos?: string[] | null },
    ok: string,
  ): Promise<boolean> => {
    setOcupado(p.id);
    try {
      setEquipo(await cambiarPersonaEquipo(slug, p.id, cambios));
      toast.success(ok);
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar.");
      return false;
    } finally {
      setOcupado(null);
    }
  };

  const reenviar = async (p: PersonaEquipo) => {
    setOcupado(p.id);
    try {
      await reenviarInvitacion(slug, p.id);
      toast.success(`Invitación reenviada a ${p.email}.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo reenviar.");
    } finally {
      setOcupado(null);
    }
  };

  const visibles = useMemo(() => {
    if (!equipo) return [];
    const q = buscar.trim().toLowerCase();
    return equipo.personas.filter(
      (p) =>
        (filtro === "todos" || p.rol === filtro) &&
        (!q || p.nombre.toLowerCase().includes(q) || p.email.toLowerCase().includes(q)),
    );
  }, [equipo, buscar, filtro]);

  if (error) return <MensajeError>{error}</MensajeError>;
  if (!equipo) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Cargando el equipo…
      </p>
    );
  }

  const libres = equipo.limite === null ? null : Math.max(0, equipo.limite - equipo.usados);
  const ocupan = equipo.personas.filter((p) => p.estado !== "desactivada");
  const cuenta = (r: RolClinica) => equipo.personas.filter((p) => p.rol === r).length;

  return (
    <div className="space-y-5">
      {/* Lugares del plan */}
      <section className="ce-tarjeta p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="flex items-baseline gap-3 text-xl font-semibold tracking-[-0.02em]">
              Tu equipo
              {equipo.limite !== null && (
                <span className="text-sm font-semibold tabular-nums text-muted-foreground">
                  {equipo.usados}/{equipo.limite}
                </span>
              )}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {libres === null
                ? `${equipo.usados} personas con acceso. Tu plan no tiene límite.`
                : libres === 0
                  ? `Usaste los ${equipo.limite} lugares de tu plan.`
                  : `${equipo.usados} de ${equipo.limite} lugares ocupados · te quedan ${libres}.`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={() =>
                void descargarEquipoExcel(equipo, slug).catch(() => toast.error("No se pudo armar el Excel. Probá de nuevo."))
              }
              className="ce-levanta h-11 rounded-full px-5"
              title="Descargar el equipo en Excel"
            >
              <Download className="mr-2 h-4 w-4" /> Excel
            </Button>
            <Button
              onClick={() => setSumar(true)}
              disabled={libres === 0}
              className="ce-boton h-11 rounded-full px-6"
              title={libres === 0 ? "Llegaste al límite de tu plan" : undefined}
            >
              <UserPlus className="mr-2 h-4 w-4" /> Sumar personas
            </Button>
          </div>
        </div>
        <Lugares ocupan={ocupan} limite={equipo.limite} onLibre={() => setSumar(true)} />
        {libres === 0 && (
          <p className="mt-4 rounded-xl bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-200">
            Para sumar a alguien, desactivá a otra persona o pasate a un plan con más lugares.
          </p>
        )}
      </section>

      {/* Panel de control: qué ve cada rol (siempre visible, aunque todavía no haya nadie invitado) */}
      <PermisosPorRolPanel slug={slug} equipo={equipo} />

      {/* Buscar y filtrar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:w-72">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
            placeholder="Buscar por nombre o correo"
            className="h-11 rounded-full border-transparent bg-card pl-10 shadow-[0_1px_2px_rgba(30,0,60,0.06)] ring-1 ring-border"
            aria-label="Buscar en el equipo"
          />
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por rol">
          <Filtro activo={filtro === "todos"} onClick={() => setFiltro("todos")}>
            Todos <span className="opacity-60">{equipo.personas.length}</span>
          </Filtro>
          {ROLES_CLINICA.filter((r) => cuenta(r.id) > 0).map((r) => (
            <Filtro key={r.id} activo={filtro === r.id} onClick={() => setFiltro(r.id)}>
              <span className={cn("h-2 w-2 rounded-full", COLOR_ROL[r.id].fondo)} />
              {PLURAL_ROL[r.id]} <span className="opacity-60">{cuenta(r.id)}</span>
            </Filtro>
          ))}
        </div>
      </div>

      {/* Personas */}
      <ul className="ce-tarjeta-suave divide-y divide-border/60 overflow-hidden">
        {visibles.length === 0 && (
          <li className="px-5 py-10 text-center text-sm text-muted-foreground">Nadie coincide con la búsqueda.</li>
        )}
        {visibles.map((p) => (
          <li
            key={p.id}
            className={cn(
              "group relative flex items-center gap-4 px-4 py-4 transition-colors duration-200 hover:bg-[oklch(0.975_0.012_300)] dark:hover:bg-muted/40 sm:px-6",
              p.estado === "desactivada" && "opacity-55",
            )}
          >
            <span
              aria-hidden="true"
              className="absolute inset-y-3 left-0 w-1 origin-center scale-y-0 rounded-r-full bg-primary transition-transform duration-300 group-hover:scale-y-100"
            />
            <Avatar p={p} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">
                {p.nombre} {p.soyYo && <span className="text-xs font-normal text-muted-foreground">(vos)</span>}
              </p>
              <p className="truncate text-xs text-muted-foreground">{p.email}</p>
              <div className="mt-1 sm:hidden">
                <Estado p={p} />
              </div>
            </div>
            <span className={cn("hidden rounded-full px-3 py-1 text-xs font-semibold sm:inline", CHIP_ROL[p.rol])}>
              {p.rolNombre}
            </span>
            <div className="hidden w-60 sm:block">
              <Estado p={p} />
            </div>
            {p.rol !== "admin" && p.estado !== "desactivada" ? (
              <button
                type="button"
                onClick={() => setQueVe(p)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition hover:-translate-y-0.5",
                  p.modulosPersonalizados
                    ? "bg-primary text-white shadow-[0_8px_18px_-10px_rgba(124,58,237,0.9)]"
                    : "bg-primary/[0.07] text-primary hover:bg-primary/[0.14]",
                )}
                title="Elegí qué módulos ve esta persona en particular"
              >
                <Eye className="size-3.5" />
                <span className="hidden md:inline">
                  {p.modulosPersonalizados ? "Acceso elegido por vos" : "Usa los permisos de su rol"}
                </span>
                <span className="md:hidden">Qué ve</span>
              </button>
            ) : (
              <span className="hidden w-[118px] shrink-0 md:block" />
            )}

            {p.soyYo ? (
              <span className="w-9" />
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full text-muted-foreground opacity-70 transition-opacity group-hover:opacity-100 hover:bg-primary/10 hover:text-primary data-[state=open]:opacity-100"
                    disabled={ocupado === p.id}
                    aria-label={`Opciones de ${p.nombre}`}
                  >
                    {ocupado === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {p.estado !== "desactivada" && (
                    <>
                      <DropdownMenuLabel>Rol</DropdownMenuLabel>
                      <DropdownMenuRadioGroup
                        value={p.rol}
                        onValueChange={(v) =>
                          v !== p.rol && void cambiar(p, { rol: v as RolClinica }, `${p.nombre} ahora es ${NOMBRE_ROL[v as RolClinica]}.`)
                        }
                      >
                        {ROLES_CLINICA.map((r) => (
                          <DropdownMenuRadioItem key={r.id} value={r.id}>
                            {r.nombre}
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  {p.estado === "invitada" && (
                    <DropdownMenuItem onSelect={() => void reenviar(p)}>
                      <MailPlus className="mr-2 h-4 w-4" /> Reenviar invitación
                    </DropdownMenuItem>
                  )}
                  {p.estado === "desactivada" ? (
                    <DropdownMenuItem onSelect={() => void cambiar(p, { activo: true }, `${p.nombre} vuelve a tener acceso.`)}>
                      <UserCheck className="mr-2 h-4 w-4" /> Reactivar acceso
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onSelect={() => {
                        if (window.confirm(`¿Quitarle el acceso a ${p.nombre}? Lo pierde en este mismo momento.`)) {
                          void cambiar(p, { activo: false }, `${p.nombre} ya no tiene acceso.`);
                        }
                      }}
                    >
                      <UserX className="mr-2 h-4 w-4" /> Quitar acceso
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </li>
        ))}
      </ul>

      <QueVe
        persona={queVe}
        ocupado={!!queVe && ocupado === queVe.id}
        onCerrar={() => setQueVe(null)}
        onGuardar={async (modulos) => {
          if (!queVe) return;
          const ok = await cambiar(
            queVe,
            { modulos },
            modulos === null ? `${queVe.nombre} ve lo de su rol.` : `Listo: ${queVe.nombre} ve solo lo que elegiste.`,
          );
          if (ok) setQueVe(null);
        }}
      />

      <SumarPersonas
        slug={slug}
        abierto={sumar}
        libres={libres}
        onCerrar={() => setSumar(false)}
        onListo={(e) => {
          setEquipo(e);
          setSumar(false);
        }}
      />
    </div>
  );
}

/* QUÉ VE CADA PERSONA: el Administrador elige, módulo por módulo (nunca más de lo que permite
   su rol). El servidor lo cumple al instante, sin que la persona tenga que volver a entrar. */
const SIEMPRE_VISIBLES = new Set(["dashboard", "notificaciones"]);
function QueVe({
  persona,
  ocupado,
  onCerrar,
  onGuardar,
}: {
  persona: PersonaEquipo | null;
  ocupado: boolean;
  onCerrar: () => void;
  onGuardar: (modulos: string[] | null) => void | Promise<void>;
}) {
  const ctx = useCloudEstherOpcional();
  const delRol = persona ? (persona.modulosRol?.length ? persona.modulosRol : modulosDelRol(persona.rol)) : [];
  // Solo los módulos que existen y que incluye el plan de la clínica
  const lista = delRol
    .map((id) => MODULES.find((m) => m.id === id))
    .filter((m): m is (typeof MODULES)[number] => !!m && (!ctx || availableIn(m, ctx.plan)));
  const [elegidos, setElegidos] = useState<string[]>([]);
  useEffect(() => {
    if (persona) setElegidos(persona.modulos ?? delRol);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persona?.id]);
  const grupos = [...new Set(lista.map((m) => m.group))];
  const alternar = (id: string) =>
    SIEMPRE_VISIBLES.has(id) ? undefined : setElegidos((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const cuantos = lista.filter((m) => elegidos.includes(m.id) || SIEMPRE_VISIBLES.has(m.id)).length;
  const todo = lista.every((m) => elegidos.includes(m.id) || SIEMPRE_VISIBLES.has(m.id));

  return (
    <Sheet open={!!persona} onOpenChange={(o) => !o && onCerrar()}>
      <SheetContent side="right" className="ce-clinica flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="border-b px-6 py-5 text-left">
          <SheetTitle className="flex items-center gap-2 text-xl font-semibold tracking-[-0.02em]">
            <Eye className="size-5 text-primary" /> Qué ve {persona?.nombre.split(" ")[0] ?? ""}
          </SheetTitle>
          <SheetDescription>
            {persona?.rolNombre}: prendé o apagá cada módulo. Lo que apagues deja de verlo al instante, en las dos vistas, y el servidor
            no se lo entrega.
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-primary/[0.06] px-4 py-3">
            <p className="text-sm">
              Ve <span className="font-extrabold text-primary">{cuantos}</span> de {lista.length} módulos
            </p>
            <button
              type="button"
              onClick={() => setElegidos(todo ? [...SIEMPRE_VISIBLES] : lista.map((m) => m.id))}
              className="text-xs font-semibold text-primary hover:underline"
            >
              {todo ? "Dejar solo lo básico" : "Prender todo"}
            </button>
          </div>
          {grupos.map((g) => (
            <div key={g}>
              <p className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                <span className="h-1 w-3 rounded-full bg-gradient-to-r from-primary to-fuchsia-500" />
                {g}
              </p>
              <ul className="space-y-1.5">
                {lista
                  .filter((m) => m.group === g)
                  .map((m) => {
                    const fijo = SIEMPRE_VISIBLES.has(m.id);
                    const on = fijo || elegidos.includes(m.id);
                    return (
                      <li key={m.id}>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={on}
                          disabled={fijo}
                          onClick={() => alternar(m.id)}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left ring-1 transition",
                            on ? "bg-card ring-primary/25 shadow-[0_6px_16px_-12px_rgba(124,58,237,0.6)]" : "bg-muted/40 ring-transparent opacity-70 hover:opacity-100",
                            fijo && "cursor-default",
                          )}
                        >
                          <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", on ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                            <ModuleIcon name={m.icon} className="size-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold">{m.label}</span>
                            {fijo && <span className="block text-[11px] text-muted-foreground">Siempre visible</span>}
                          </span>
                          {fijo ? (
                            <Lock className="size-4 text-muted-foreground" />
                          ) : (
                            <span className={cn("relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors", on ? "bg-gradient-to-r from-primary to-fuchsia-500" : "bg-muted-foreground/25")}>
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
          <p className="rounded-2xl bg-muted/50 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
            La Comunicación interna la tiene todo el equipo. Lo que puede hacer cada rol ahí (comunicados, canales, archivos) se elige
            en Comunicación interna → Permisos.
          </p>
        </div>
        <div className="flex flex-col-reverse gap-2 border-t px-6 py-4 sm:flex-row sm:justify-between">
          <Button variant="ghost" onClick={() => void onGuardar(null)} disabled={ocupado} className="rounded-full">
            Que use los permisos de su rol
          </Button>
          <Button
            onClick={() => void onGuardar([...new Set([...elegidos, ...SIEMPRE_VISIBLES])])}
            disabled={ocupado}
            className="ce-boton rounded-full px-6"
          >
            {ocupado ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Check className="mr-2 size-4" />}
            Guardar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* Los lugares del plan: cada persona activa o invitada ocupa uno; los libres se pueden tocar para sumar. */
function Lugares({
  ocupan,
  limite,
  onLibre,
}: {
  ocupan: PersonaEquipo[];
  limite: number | null;
  onLibre: () => void;
}) {
  const MAX = 24;
  const libres = limite === null ? 0 : Math.max(0, limite - ocupan.length);
  const mostrarLibres = Math.min(libres, Math.max(0, MAX - ocupan.length));
  const sobran = Math.max(0, ocupan.length - MAX);
  const total = limite ?? ocupan.length;
  const porcentaje = total > 0 ? Math.min(100, Math.round((ocupan.length / total) * 100)) : 0;
  return (
    <div className="mt-6 space-y-4">
      {limite !== null && (
        <div className="h-2 overflow-hidden rounded-full bg-[oklch(0.95_0.015_300)] dark:bg-muted" aria-hidden="true">
          <div className="ce-barra h-full rounded-full" style={{ width: `${porcentaje}%` }} />
        </div>
      )}
    <div className="flex flex-wrap items-center gap-2.5">
      {ocupan.slice(0, MAX).map((p) => (
        <span key={p.id} title={`${p.nombre} · ${p.rolNombre}${p.estado === "invitada" ? " (invitada)" : ""}`}>
          <span className={cn("block rounded-full", p.estado === "invitada" && "opacity-50")}>
            <Avatar p={p} chico />
          </span>
        </span>
      ))}
      {sobran > 0 && <span className="text-xs font-semibold text-muted-foreground">+{sobran}</span>}
      {Array.from({ length: mostrarLibres }, (_, i) => (
        <button
          key={`libre-${i}`}
          type="button"
          onClick={onLibre}
          aria-label="Lugar libre: sumar una persona"
          className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/30 text-muted-foreground/60 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary hover:bg-primary/5 hover:text-primary"
        >
          <Plus className="h-4 w-4" />
        </button>
      ))}
    </div>
    </div>
  );
}

function Filtro({ activo, onClick, children }: { activo: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold transition-all duration-200",
        activo
          ? "border-transparent bg-[oklch(0.24_0.09_293)] text-white shadow-[0_8px_18px_-10px_rgba(30,0,60,0.7)] dark:bg-primary"
          : "bg-card text-foreground/80 hover:-translate-y-px hover:border-primary/40 hover:text-foreground hover:shadow-sm",
      )}
    >
      {children}
    </button>
  );
}

function Estado({ p }: { p: PersonaEquipo }) {
  const u = cuando(p.ultimoIngreso);
  const [punto, texto] =
    p.estado === "invitada"
      ? ["bg-amber-500", "Invitada · falta su contraseña"]
      : p.estado === "desactivada"
        ? ["bg-muted-foreground/40", "Sin acceso"]
        : ["bg-emerald-500", u ? `Activa · entró ${u}` : "Activa · todavía no entró"];
  return (
    <p className="flex items-center gap-1.5 whitespace-nowrap text-xs text-muted-foreground">
      <span className={cn("h-2 w-2 shrink-0 rounded-full", punto)} />
      <span className={p.estado === "invitada" ? "font-medium text-amber-700 dark:text-amber-300" : undefined}>{texto}</span>
    </p>
  );
}

/* ───────────── Sumar personas (varias a la vez) ───────────── */

type Fila = { clave: number; nombre: string; email: string; rol: RolClinica };
const CORREO = /[^\s,;<>"']+@[^\s,;<>"']+\.[^\s,;<>"']+/;
let siguiente = 1;
const filaNueva = (rol: RolClinica, nombre = "", email = ""): Fila => ({ clave: siguiente++, nombre, email, rol });

function SumarPersonas({
  slug,
  abierto,
  libres,
  onCerrar,
  onListo,
}: {
  slug: string;
  abierto: boolean;
  libres: number | null;
  onCerrar: () => void;
  onListo: (e: EquipoClinica) => void;
}) {
  const [rolBase, setRolBase] = useState<RolClinica>("odontologo");
  const [filas, setFilas] = useState<Fila[]>(() => [filaNueva("odontologo")]);
  const [pegar, setPegar] = useState(false);
  const [texto, setTexto] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (abierto) {
      setFilas([filaNueva(rolBase)]);
      setError(null);
      setPegar(false);
      setTexto("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto]);

  const completas = filas.filter((f) => f.nombre.trim() || f.email.trim());
  const pasa = libres !== null && completas.length > libres;

  const cambiarFila = (clave: number, cambios: Partial<Fila>) =>
    setFilas((fs) => fs.map((f) => (f.clave === clave ? { ...f, ...cambios } : f)));

  const pasarLista = () => {
    const nuevas: Fila[] = [];
    for (const linea of texto.split(/\r?\n/)) {
      const correo = CORREO.exec(linea)?.[0];
      if (!correo) continue;
      const nombre = linea.replace(correo, "").replace(/[\t,;<>|]+/g, " ").replace(/\s+/g, " ").trim();
      nuevas.push(filaNueva(rolBase, nombre, correo.toLowerCase()));
    }
    if (nuevas.length === 0) return setError("No encontramos correos en lo que pegaste. Poné una persona por línea.");
    setError(null);
    setFilas((fs) => [...fs.filter((f) => f.nombre.trim() || f.email.trim()), ...nuevas]);
    setTexto("");
    setPegar(false);
    toast.success(`${nuevas.length} ${nuevas.length === 1 ? "persona agregada" : "personas agregadas"} a la lista.`);
  };

  // Subir el personal desde un Excel (o CSV): pasa a la lista para revisarlo antes de invitar
  const [leyendo, setLeyendo] = useState(false);
  const subirExcel = async (archivo: File | undefined) => {
    if (!archivo) return;
    if (archivo.size > 5 * 1024 * 1024) return setError("El archivo es muy grande (máximo 5 MB).");
    setLeyendo(true);
    try {
      const personas = await leerPersonasDeArchivo(archivo);
      if (personas.length === 0) {
        setError("No encontramos correos en el archivo. Usá la plantilla: Nombre y apellido, Correo y Rol.");
        return;
      }
      setError(null);
      const yaEstan = new Set(filas.map((f) => f.email.trim().toLowerCase()).filter(Boolean));
      const nuevas = personas
        .filter((p) => !yaEstan.has(p.email))
        .map((p) => filaNueva(p.rol ?? rolBase, nombrePersona(p.nombre), p.email));
      setFilas((fs) => [...fs.filter((f) => f.nombre.trim() || f.email.trim()), ...nuevas]);
      toast.success(
        `${nuevas.length} ${nuevas.length === 1 ? "persona cargada" : "personas cargadas"} desde el Excel. Revisalas y mandá las invitaciones.`,
      );
    } catch {
      setError("No pudimos leer el archivo. Guardalo como Excel (.xlsx) o CSV y probá de nuevo.");
    } finally {
      setLeyendo(false);
    }
  };

  const enviar = async () => {
    if (completas.length === 0) return setError("Agregá al menos una persona.");
    for (const f of completas) {
      if (f.nombre.trim().length < 2) return setError(`Falta el nombre de ${f.email || "una persona"}.`);
      if (!CORREO.test(f.email.trim())) return setError(`El correo de ${f.nombre || "una persona"} no es válido.`);
    }
    if (pasa) return setError(`Te quedan ${libres} lugares en tu plan: sacá ${completas.length - (libres ?? 0)} de la lista.`);
    setError(null);
    setEnviando(true);
    try {
      const r = await invitarVarios(
        slug,
        completas.map((f) => ({ nombre: f.nombre.trim(), email: f.email.trim().toLowerCase(), rol: f.rol })),
      );
      if (r.sinCorreo.length > 0) {
        toast.warning(`Quedaron invitadas, pero a ${r.sinCorreo.join(", ")} no le salió el correo. Usá «Reenviar invitación».`);
      } else {
        toast.success(r.enviadas === 1 ? "Invitación enviada." : `${r.enviadas} invitaciones enviadas.`);
      }
      onListo(r.equipo);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron enviar las invitaciones.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Sheet open={abierto} onOpenChange={(v) => !v && onCerrar()}>
      <SheetContent side="right" className="ce-clinica flex w-full flex-col gap-0 p-0 sm:max-w-xl">
        <SheetHeader className="border-b px-6 py-5 text-left">
          <SheetTitle className="text-xl font-semibold tracking-[-0.02em]">Sumar personas</SheetTitle>
          <SheetDescription>
            Armá la lista y mandá todas las invitaciones juntas. A cada una le llega un correo para elegir su contraseña.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {/* Rol para las filas nuevas */}
          <div>
            <p className="text-sm font-semibold">¿Qué rol van a tener?</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {ROLES_CLINICA.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRolBase(r.id)}
                  aria-pressed={rolBase === r.id}
                  className={cn(
                    "flex items-center gap-2.5 rounded-2xl border px-3 py-3 text-left transition-all duration-200",
                    rolBase === r.id
                      ? "border-primary bg-primary/5 shadow-[0_10px_24px_-16px_rgba(76,29,149,0.8)] ring-2 ring-primary/20"
                      : "hover:-translate-y-px hover:border-primary/40 hover:shadow-sm",
                  )}
                >
                  <span className={cn("h-3 w-3 shrink-0 rounded-full", COLOR_ROL[r.id].fondo)} />
                  <span>
                    <span className="block text-sm font-semibold">{r.nombre}</span>
                    <span className="block text-xs text-muted-foreground">{r.detalle}</span>
                  </span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Se usa para las personas que agregues. Cada una se puede cambiar abajo.</p>
          </div>

          {/* Subir un Excel */}
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <label
              className={cn(
                "group flex cursor-pointer items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.05] px-4 py-3 text-left text-sm transition-all duration-200 hover:-translate-y-px hover:border-emerald-500/60 hover:shadow-[0_10px_24px_-18px_rgba(16,185,129,0.9)]",
                leyendo && "pointer-events-none opacity-60",
              )}
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-600 text-white shadow-sm">
                {leyendo ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileSpreadsheet className="h-5 w-5" />}
              </span>
              <span>
                <span className="block font-semibold">Subir tu personal desde Excel</span>
                <span className="block text-xs text-muted-foreground">Archivo .xlsx o .csv con nombre, correo y rol.</span>
              </span>
              <input
                type="file"
                accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                className="sr-only"
                onChange={(e) => {
                  void subirExcel(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
            <button
              type="button"
              onClick={() => void descargarPlantillaEquipo().catch(() => toast.error("No se pudo descargar la plantilla."))}
              className="flex items-center justify-center gap-1.5 rounded-2xl border px-4 py-3 text-xs font-semibold text-muted-foreground transition hover:border-primary hover:text-primary"
            >
              <Download className="h-4 w-4" /> Plantilla
            </button>
          </div>

          {/* Pegar una lista */}
          {pegar ? (
            <div className="space-y-2 rounded-2xl border border-dashed p-4">
              <p className="text-sm font-semibold">Pegá tu lista</p>
              <p className="text-xs text-muted-foreground">
                Una persona por línea, con su nombre y su correo. Sirve copiar desde Excel, WhatsApp o un correo.
              </p>
              <textarea
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                rows={6}
                autoFocus
                placeholder={"Laura Gómez, laura@correo.com\nMartín Ruiz  martin@correo.com"}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 font-mono text-xs"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={pasarLista} disabled={!texto.trim()}>
                  Agregar como {NOMBRE_ROL[rolBase]}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setPegar(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setPegar(true)}
              className="flex w-full items-center gap-3 rounded-2xl border border-dashed px-4 py-3 text-left text-sm hover:border-primary hover:text-primary"
            >
              <ClipboardPaste className="h-5 w-5 shrink-0" />
              <span>
                <span className="block font-semibold">¿La tenés copiada de WhatsApp o un correo?</span>
                <span className="block text-xs text-muted-foreground">Pegala y se cargan todas de una.</span>
              </span>
            </button>
          )}

          {/* Lista */}
          <div className="space-y-2">
            <p className="text-sm font-semibold">
              Personas a invitar <span className="font-normal text-muted-foreground">({completas.length})</span>
            </p>
            {filas.map((f, i) => (
              <div key={f.clave} className="flex items-start gap-2 rounded-2xl bg-muted/50 p-2.5">
                <Avatar p={{ nombre: f.nombre || "?", rol: f.rol }} chico />
                <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
                  <Input
                    value={f.nombre}
                    onChange={(e) => cambiarFila(f.clave, { nombre: e.target.value })}
                    placeholder="Nombre y apellido"
                    aria-label={`Nombre de la persona ${i + 1}`}
                    maxLength={160}
                    className="h-9 bg-background"
                  />
                  <Input
                    value={f.email}
                    type="email"
                    onChange={(e) => cambiarFila(f.clave, { email: e.target.value })}
                    placeholder="correo@ejemplo.com"
                    aria-label={`Correo de la persona ${i + 1}`}
                    maxLength={254}
                    className="h-9 bg-background"
                  />
                  <select
                    value={f.rol}
                    onChange={(e) => cambiarFila(f.clave, { rol: e.target.value as RolClinica })}
                    aria-label={`Rol de la persona ${i + 1}`}
                    className="h-9 rounded-md border border-input bg-background px-2 text-sm sm:col-span-2"
                  >
                    {ROLES_CLINICA.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => setFilas((fs) => (fs.length === 1 ? [filaNueva(rolBase)] : fs.filter((x) => x.clave !== f.clave)))}
                  aria-label={`Sacar a la persona ${i + 1} de la lista`}
                  className="mt-1.5 rounded-full p-1 text-muted-foreground hover:bg-background hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            <Button
              variant="outline"
              className="w-full rounded-2xl border-dashed"
              onClick={() => setFilas((fs) => [...fs, filaNueva(rolBase)])}
            >
              <Plus className="mr-1.5 h-4 w-4" /> Otra persona
            </Button>
          </div>
        </div>

        {/* Pie fijo */}
        <div className="space-y-3 border-t bg-background px-6 py-4">
          {error && <MensajeError>{error}</MensajeError>}
          <div className="flex items-center justify-between gap-3">
            <p className={cn("text-xs", pasa ? "font-semibold text-destructive" : "text-muted-foreground")}>
              {libres === null
                ? "Tu plan no tiene límite de personas."
                : pasa
                  ? `Te quedan ${libres} lugares y la lista tiene ${completas.length}.`
                  : `Te quedan ${libres - completas.length} lugares después de esto.`}
            </p>
            <Button className="ce-boton h-11 rounded-full px-6" onClick={() => void enviar()} disabled={enviando || completas.length === 0 || pasa}>
              {enviando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {completas.length <= 1 ? "Enviar invitación" : `Enviar ${completas.length} invitaciones`}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
