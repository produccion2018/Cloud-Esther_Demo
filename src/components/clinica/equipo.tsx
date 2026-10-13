import {
  ClipboardPaste,
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
import { cn } from "@/lib/utils";
import {
  ROLES_CLINICA,
  cambiarPersonaEquipo,
  invitarVarios,
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
  if (dias <= 0) return `hoy ${d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}`;
  if (dias === 1) return "ayer";
  return d.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
};

function Avatar({ p, chico = false }: { p: { nombre: string; rol: RolClinica }; chico?: boolean }) {
  const c = COLOR_ROL[p.rol];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-bold",
        c.fondo,
        c.texto,
        chico ? "h-9 w-9 text-xs ring-2 ring-background" : "h-11 w-11 text-sm",
      )}
      aria-hidden="true"
    >
      {iniciales(p.nombre)}
    </span>
  );
}

export function EquipoClinicaPanel({ slug }: { slug: string }) {
  const [equipo, setEquipo] = useState<EquipoClinica | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [sumar, setSumar] = useState(false);
  const [buscar, setBuscar] = useState("");
  const [filtro, setFiltro] = useState<RolClinica | "todos">("todos");

  const cargar = useCallback(() => {
    setError(null);
    verEquipo(slug)
      .then(setEquipo)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "No se pudo cargar el equipo."));
  }, [slug]);
  useEffect(cargar, [cargar]);

  const cambiar = async (p: PersonaEquipo, cambios: { rol?: RolClinica; activo?: boolean }, ok: string) => {
    setOcupado(p.id);
    try {
      setEquipo(await cambiarPersonaEquipo(slug, p.id, cambios));
      toast.success(ok);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar.");
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
      <section className="rounded-3xl border bg-card p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight">Tu equipo</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {libres === null
                ? `${equipo.usados} personas con acceso. Tu plan no tiene límite.`
                : libres === 0
                  ? `Usaste los ${equipo.limite} lugares de tu plan.`
                  : `${equipo.usados} de ${equipo.limite} lugares ocupados · te quedan ${libres}.`}
            </p>
          </div>
          <Button
            onClick={() => setSumar(true)}
            disabled={libres === 0}
            className="h-11 rounded-xl px-5"
            title={libres === 0 ? "Llegaste al límite de tu plan" : undefined}
          >
            <UserPlus className="mr-2 h-4 w-4" /> Sumar personas
          </Button>
        </div>
        <Lugares ocupan={ocupan} limite={equipo.limite} onLibre={() => setSumar(true)} />
        {libres === 0 && (
          <p className="mt-4 rounded-xl bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-200">
            Para sumar a alguien, desactivá a otra persona o pasate a un plan con más lugares.
          </p>
        )}
      </section>

      {/* Buscar y filtrar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
            placeholder="Buscar por nombre o correo"
            className="h-10 rounded-xl pl-9"
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
      <ul className="divide-y overflow-hidden rounded-3xl border bg-card">
        {visibles.length === 0 && (
          <li className="px-5 py-10 text-center text-sm text-muted-foreground">Nadie coincide con la búsqueda.</li>
        )}
        {visibles.map((p) => (
          <li
            key={p.id}
            className={cn("flex items-center gap-4 px-4 py-3.5 sm:px-5", p.estado === "desactivada" && "opacity-55")}
          >
            <Avatar p={p} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">
                {p.nombre} {p.soyYo && <span className="text-xs font-normal text-muted-foreground">(vos)</span>}
              </p>
              <p className="truncate text-xs text-muted-foreground">{p.email}</p>
            </div>
            <div className="hidden w-36 sm:block">
              <p className="text-sm font-medium">{p.rolNombre}</p>
              <Estado p={p} />
            </div>
            <div className="sm:hidden">
              <Estado p={p} />
            </div>
            {p.soyYo ? (
              <span className="w-9" />
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full"
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
  return (
    <div className="mt-5 flex flex-wrap items-center gap-2">
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
          className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/30 text-muted-foreground/60 transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Plus className="h-4 w-4" />
        </button>
      ))}
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
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
        activo ? "border-foreground bg-foreground text-background" : "bg-card hover:border-foreground/40",
      )}
    >
      {children}
    </button>
  );
}

function Estado({ p }: { p: PersonaEquipo }) {
  if (p.estado === "invitada")
    return <p className="text-xs font-medium text-amber-700 dark:text-amber-300">Invitada · falta su contraseña</p>;
  if (p.estado === "desactivada") return <p className="text-xs text-muted-foreground">Sin acceso</p>;
  const u = cuando(p.ultimoIngreso);
  return <p className="text-xs text-muted-foreground">{u ? `Entró ${u}` : "Todavía no entró"}</p>;
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
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-xl">
        <SheetHeader className="border-b px-6 py-5 text-left">
          <SheetTitle className="text-xl font-extrabold tracking-tight">Sumar personas</SheetTitle>
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
                    "flex items-center gap-2.5 rounded-2xl border px-3 py-2.5 text-left transition-colors",
                    rolBase === r.id ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "hover:border-foreground/30",
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
                <span className="block font-semibold">¿Tenés la lista en Excel o WhatsApp?</span>
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
            <Button className="h-11 rounded-xl px-5" onClick={() => void enviar()} disabled={enviando || completas.length === 0 || pasa}>
              {enviando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {completas.length <= 1 ? "Enviar invitación" : `Enviar ${completas.length} invitaciones`}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
