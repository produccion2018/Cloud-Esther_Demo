import { useEffect, useId, useState } from "react";
import { odontogramaDelPlan } from "@/lib/cloud-esther/planes-config";
import { Link, Navigate, useRouterState } from "@tanstack/react-router";
import { Bell, CalendarDays, ChevronDown, LayoutDashboard, Lock, LogOut, Menu, MoreHorizontal, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  MODULES,
  availableIn,
  etiquetaModulo,
  incluidoEnPlan,
  planLevel,
  ModuleIcon,
  PLANS,
  useCloudEsther,
  type PlanId,
} from "@/lib/cloud-esther/data";
import { nivelModulo } from "@/lib/cloud-esther/niveles";
import { useClinicSettings, SIDEBAR_COLORS, FONT_SIZE_PX } from "@/lib/cloud-esther/settings-store";
import { cerrarSesion, useSesion } from "@/lib/cloud-esther/auth-store";
import { registrarModuloDemo } from "@/lib/cloud-esther/demo-seguimiento";
import { registrarActividadAuditoria } from "@/lib/cloud-esther/auditoria-store";
import { borrarDatosGuardados } from "@/lib/cloud-esther/tenant-store";
import { agregarModuloExtra, storeModulosExtra } from "@/lib/cloud-esther/modulos-extra-store";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useNotificaciones } from "@/components/cloud-esther/useNotificaciones";
import { buildSidebarPalette } from "@/lib/cloud-esther/sidebar-paleta";
import { EstherFlotante } from "@/components/cloud-esther/esther-ai/EstherFlotante";

const GROUPS = [
  "Clínico",
  "Operación",
  "Administración",
  "Inteligencia",
  "Organización",
  "Sistema",
] as const;

type SubItem = { label: string; to?: string; minPlan?: PlanId };

const SUBMENUS: Record<string, { children: SubItem[] }> = {
  "/demo/equipo-profesional": {
    children: [
      { label: "Integrantes", to: "/demo/equipo-profesional" },
      { label: "Especialidades", to: "/demo/equipo-profesional/especialidades" },
      { label: "Agendas y horarios", to: "/demo/equipo-profesional/agendas-horarios" },
      {
        label: "Permisos y accesos",
        to: "/demo/equipo-profesional/permisos-accesos",
        minPlan: "avanzada",
      },
    ],
  },
};

export function BrandMark({ className }: { className?: string }) {
  // Id único: si hay dos logos en pantalla (uno oculto), el degradé no se pierde.
  const gradId = `ceBrand${useId().replace(/:/g, "")}`;
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="8" y1="4" x2="56" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#B463F0" />
          <stop offset="55%" stopColor="#8B3DE0" />
          <stop offset="100%" stopColor="#4C1D95" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="32" fill={`url(#${gradId})`} />
      <path
        d="M24.5 16.5c-6 0-10 4-10 10 0 4.4 1.8 6.8 2.8 11.2.7 3.6 1 8.6 3.6 9.8 2.2 1 3.4-2.4 4.3-6.2.6-2.6 1.8-3.8 4.8-3.8s4.2 1.2 4.8 3.8c.9 3.8 2.1 7.2 4.3 6.2 2.6-1.2 2.9-6.2 3.6-9.8 1-4.4 2.8-6.8 2.8-11.2 0-6-4-10-10-10-3 0-5.1 1.8-7.5 1.8s-4.5-1.8-7.5-1.8Z"
        fill="#FFFFFF"
      />
      <path
        d="M21 21.5c-2.2 1.9-3.4 4.4-3.4 7.3"
        stroke="#E9D9FB"
        strokeWidth="2.4"
        strokeLinecap="round"
        fill="none"
        opacity="0.85"
      />
    </svg>
  );
}

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to={"/demo" as never} className="flex items-center gap-2.5">
      <BrandMark className="size-9 shrink-0" />
      {!compact && (
        <span className="leading-tight">
          <span className="block font-display text-[15px] font-semibold tracking-tight text-sidebar-foreground">
            Cloud Esther
          </span>
          <span className="block text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/50">
            Dental Suite
          </span>
        </span>
      )}
    </Link>
  );
}

function SubList({
  items,
  open,
  pathname,
  onNavigate,
}: {
  items: SubItem[];
  open: boolean;
  pathname: string;
  onNavigate?: (() => void) | undefined;
}) {
  return (
    <div
      className={cn(
        "grid transition-[grid-template-rows] duration-200 ease-out",
        open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
      )}
      aria-hidden={!open}
    >
      <div className="overflow-hidden">
        <ul className="ml-4 mt-0.5 space-y-0.5 border-l border-sidebar-border pl-2">
          {items.map((c) => {
            if (c.to) {
              const childActive = pathname === c.to;
              return (
                <li key={c.label}>
                  <Link
                    to={c.to as never}
                    onClick={onNavigate}
                    tabIndex={open ? 0 : -1}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm transition-colors",
                      childActive
                        ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                    )}
                  >
                    <span className="truncate">{c.label}</span>
                  </Link>
                </li>
              );
            }
            return (
              <li key={c.label}>
                <button
                  type="button"
                  title="Próximamente"
                  aria-disabled="true"
                  tabIndex={open ? 0 : -1}
                  className="flex w-full cursor-default items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                >
                  <span className="truncate">{c.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function NavList({ onNavigate }: { onNavigate?: (() => void) | undefined }) {
  const { plan, disabled } = useCloudEsther();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});
  // Módulos adicionales comprados: al agregarlos aparecen en el menú sin recargar.
  const extras = storeModulosExtra.usar().activos.map((x) => x.id);
  const toggle = (key: string, current: boolean) =>
    setOpenMap((prev) => ({ ...prev, [key]: !current }));
  // Contador de avisos sin leer (solo en el cliente, para no generar diferencias de hidratación).
  const { sinLeer } = useNotificaciones();
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);

  return (
    <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-6 [scrollbar-width:thin] [scrollbar-color:transparent_transparent] hover:[scrollbar-color:color-mix(in_oklab,var(--color-sidebar-foreground,currentColor)_18%,transparent)_transparent]">
      {GROUPS.map((group) => {
        const items = MODULES.filter((m) => m.group === group);
        // Cada plan ve solo sus módulos (sin mostrar los de otros planes).
        const visible = items.filter((m) => availableIn(m, plan));
        if (!visible.length) return null;

        return (
          <div key={group}>
            <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/40">
              {group}
            </p>
            <ul className="space-y-0.5">
              {visible.map((m) => {
                const unlocked = availableIn(m, plan);
                const off = disabled.includes(m.id);
                const active =
                  m.path === "/demo"
                    ? pathname === "/demo"
                    : pathname === m.path || pathname.startsWith(`${m.path}/`);

                if (!unlocked) {
                  return (
                    <li key={m.id}>
                      <div className="flex cursor-not-allowed items-center gap-2.5 rounded-lg px-2 py-2 text-sm text-sidebar-foreground/35">
                        <ModuleIcon name={m.icon} className="size-4 shrink-0" />
                        <span className="truncate">{etiquetaModulo(m, plan)}</span>
                        <Lock className="ml-auto size-3" />
                      </div>
                    </li>
                  );
                }

                const submenu = SUBMENUS[m.path];

                if (submenu) {
                  const isOpen = openMap[m.id] ?? active;
                  return (
                    <li key={m.id}>
                      <div className="relative">
                        <Link
                          to={m.path as never}
                          onClick={onNavigate}
                          className={cn(
                            "group flex items-center gap-2.5 rounded-lg px-2 py-2 pr-9 text-sm transition-colors",
                            active
                              ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground shadow-[inset_2px_0_0_0_var(--color-sidebar-primary)]"
                              : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                            off && "opacity-40",
                          )}
                        >
                          <ModuleIcon
                            name={m.icon}
                            className={cn("size-4 shrink-0", active && "text-sidebar-primary")}
                          />
                          <span className="truncate">{etiquetaModulo(m, plan)}</span>
                          {extras.includes(m.id) && !incluidoEnPlan(m, plan) && (
                            <span className="ml-auto rounded-full bg-sidebar-primary/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-sidebar-primary">
                              Adicional
                            </span>
                          )}
                          {off && (
                            <span className="ml-auto text-[9px] uppercase tracking-wider">off</span>
                          )}
                        </Link>
                        <button
                          type="button"
                          aria-label={
                            isOpen
                              ? `Contraer ${etiquetaModulo(m, plan)}`
                              : `Desplegar ${etiquetaModulo(m, plan)}`
                          }
                          aria-expanded={isOpen}
                          onClick={() => toggle(m.id, isOpen)}
                          className={cn(
                            "absolute right-1.5 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md transition-colors",
                            active
                              ? "text-sidebar-accent-foreground hover:bg-sidebar-accent"
                              : "text-sidebar-foreground/60 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                            off && "opacity-40",
                          )}
                        >
                          <ChevronDown
                            className={cn(
                              "size-3.5 transition-transform duration-200",
                              isOpen && "rotate-180",
                            )}
                          />
                        </button>
                      </div>
                      <SubList
                        items={submenu.children.filter(
                          (c) => !c.minPlan || planLevel(c.minPlan) <= planLevel(plan),
                        )}
                        open={isOpen}
                        pathname={pathname}
                        onNavigate={onNavigate}
                      />
                    </li>
                  );
                }

                return (
                  <li key={m.id}>
                    <Link
                      to={m.path as never}
                      onClick={onNavigate}
                      className={cn(
                        "group flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm transition-colors",
                        active
                          ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground shadow-[inset_2px_0_0_0_var(--color-sidebar-primary)]"
                          : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                        off && "opacity-40",
                      )}
                    >
                      <ModuleIcon
                        name={m.icon}
                        className={cn("size-4 shrink-0", active && "text-sidebar-primary")}
                      />
                      <span className="truncate">{etiquetaModulo(m, plan)}</span>
                      {extras.includes(m.id) && !incluidoEnPlan(m, plan) && (
                        <span className="ml-auto rounded-full bg-sidebar-primary/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-sidebar-primary">
                          Adicional
                        </span>
                      )}
                      {off && (
                        <span className="ml-auto text-[9px] uppercase tracking-wider">off</span>
                      )}
                      {!off && m.id === "notificaciones" && montado && sinLeer > 0 && (
                        <span
                          className="ml-auto grid min-w-5 place-items-center rounded-full bg-sidebar-primary px-1.5 text-[10px] font-bold text-sidebar-primary-foreground"
                          aria-label={`${sinLeer} sin leer`}
                        >
                          {sinLeer > 99 ? "99+" : sinLeer}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

function iniciales(nombre: string) {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  return ((partes[0]?.[0] ?? "") + (partes[1]?.[0] ?? "")).toUpperCase() || "CE";
}

/** Clínica (empresa) y usuario de la sesión activa. Cada cuenta pertenece a
 *  una clínica, así que el sidebar muestra con qué empresa se está trabajando. */
function EmpresaActiva() {
  const { usuario, clinica } = useSesion();
  if (!usuario || !clinica) return null;

  return (
    <div className="mx-3 mb-3 flex items-center gap-2.5 rounded-xl border border-sidebar-border bg-sidebar-accent/50 p-2.5">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-sidebar-primary text-[11px] font-semibold text-sidebar-primary-foreground">
        {iniciales(clinica.nombre)}
      </span>
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate font-display text-sm font-semibold text-sidebar-foreground">
          {clinica.nombre}
        </p>
        <p className="truncate text-[11px] text-sidebar-foreground/55">{usuario.nombre}</p>
      </div>
    </div>
  );
}

function PlanFooter() {
  const { plan, setPlan, planContratado } = useCloudEsther();
  return (
    <div className="border-t border-sidebar-border p-3">
      <div className="rounded-xl bg-sidebar-accent/60 p-3">
        <p className="text-[10px] uppercase tracking-[0.16em] text-sidebar-foreground/45">
          {planContratado ? "Plan contratado" : "Plan del demo"}
        </p>
        {planContratado ? (
          // Empresa con plan comprado: se muestra fijo, sin opción de cambiarlo.
          <p className="mt-1 flex items-center gap-1.5 rounded-lg border border-sidebar-border bg-sidebar px-2.5 py-2 font-display text-sm font-semibold text-sidebar-foreground">
            <Lock className="size-3.5 shrink-0 text-sidebar-foreground/45" />
            {PLANS[plan].name}
          </p>
        ) : (
          // Demo: el visitante puede recorrer los planes para compararlos.
          <div className="relative mt-1">
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value as PlanId)}
              aria-label="Probar otro plan"
              className="w-full appearance-none rounded-lg border border-sidebar-border bg-sidebar px-2.5 py-2 pr-8 font-display text-sm font-semibold text-sidebar-foreground outline-none transition-colors hover:border-sidebar-primary/40 focus:border-sidebar-primary/60 focus:ring-2 focus:ring-sidebar-primary/15"
            >
              {(Object.keys(PLANS) as PlanId[]).map((id) => (
                <option key={id} value={id}>
                  {PLANS[id].name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-sidebar-foreground/45" />
          </div>
        )}
        <p className="mt-1.5 text-[11px] text-sidebar-foreground/55">
          {planContratado
            ? PLANS[plan].audience
            : `${MODULES.filter((m) => availableIn(m, plan)).length} módulos del plan ${PLANS[plan].name} en el menú`}
        </p>
      </div>
      <Link
        to={"/" as never}
        onClick={() => cerrarSesion()}
        className="mt-2 flex items-center justify-center gap-2 rounded-lg border border-sidebar-border px-3 py-2 text-xs font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
      >
        <LogOut className="size-3.5" />
        {planContratado ? "Cerrar sesión" : "Salir del demo"}
      </Link>
      <button
        type="button"
        onClick={() => {
          if (
            window.confirm(
              "¿Volver a los datos de ejemplo? Se borra lo que practicaste en esta empresa.",
            )
          ) {
            borrarDatosGuardados();
            window.location.reload();
          }
        }}
        className="mt-1.5 w-full text-center text-[10.5px] text-sidebar-foreground/45 transition-colors hover:text-sidebar-foreground/80"
      >
        Restablecer datos de práctica
      </button>
    </div>
  );
}

function SidebarInner({ onNavigate }: { onNavigate?: (() => void) | undefined }) {
  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="px-4 py-4">
        <Logo />
      </div>
      <EmpresaActiva />
      <NavList onNavigate={onNavigate} />
      <PlanFooter />
    </div>
  );
}

function MobileHeader({
  sidebarStyle,
  menu,
  setMenu,
  titulo,
}: {
  sidebarStyle: React.CSSProperties;
  menu: boolean;
  setMenu: (v: boolean) => void;
  titulo: string;
}) {
  return (
    <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-border/80 bg-background/85 px-2 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur-xl lg:hidden">
      <Sheet open={menu} onOpenChange={setMenu}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="size-11" aria-label="Abrir menú">
            <Menu className="size-5" />
          </Button>
        </SheetTrigger>
        <SheetContent
          side="left"
          className="w-[86vw] max-w-[300px] border-sidebar-border bg-sidebar p-0"
          style={sidebarStyle}
        >
          <SheetTitle className="sr-only">Navegación</SheetTitle>
          <SidebarInner onNavigate={() => setMenu(false)} />
        </SheetContent>
      </Sheet>
      <Logo compact />
      <p className="min-w-0 flex-1 truncate text-sm font-semibold">{titulo}</p>
    </header>
  );
}

/* Barra inferior en el celular: navegación tipo aplicación con los accesos más usados.
   «Más» abre el menú completo con todos los módulos del plan. */
function BarraInferior({ onMas }: { onMas: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { sinLeer } = useNotificaciones();
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);
  const items = [
    { to: "/demo", label: "Inicio", icon: LayoutDashboard },
    { to: "/demo/agenda", label: "Agenda", icon: CalendarDays },
    { to: "/demo/pacientes", label: "Pacientes", icon: Users },
    { to: "/demo/notificaciones", label: "Avisos", icon: Bell },
  ];
  return (
    <nav
      aria-label="Accesos rápidos"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
    >
      <div className="mx-auto grid max-w-md grid-cols-5">
        {items.map((it) => {
          const activo = it.to === "/demo" ? pathname === "/demo" : pathname.startsWith(it.to);
          return (
            <Link
              key={it.to}
              to={it.to as never}
              aria-current={activo ? "page" : undefined}
              className={cn(
                "relative flex min-h-14 flex-col items-center justify-center gap-0.5 text-[10.5px] font-semibold transition-colors",
                activo ? "text-primary" : "text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "grid h-7 w-12 place-items-center rounded-full transition-colors",
                  activo && "bg-primary/12",
                )}
              >
                <it.icon className="size-5" />
              </span>
              {it.label}
              {it.to === "/demo/notificaciones" && montado && sinLeer > 0 && (
                <span className="absolute right-[22%] top-1.5 grid min-w-4 place-items-center rounded-full bg-destructive px-1 text-[9px] font-bold text-white">
                  {sinLeer > 9 ? "9+" : sinLeer}
                </span>
              )}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={onMas}
          className="flex min-h-14 flex-col items-center justify-center gap-0.5 text-[10.5px] font-semibold text-muted-foreground"
        >
          <span className="grid h-7 w-12 place-items-center rounded-full">
            <MoreHorizontal className="size-5" />
          </span>
          Más
        </button>
      </div>
    </nav>
  );
}

/** Módulo al que pertenece la ruta actual (el de path más largo que coincide). */
function moduloDeRuta(pathname: string) {
  return MODULES.filter(
    (m) => m.path !== "/demo" && (pathname === m.path || pathname.startsWith(`${m.path}/`)),
  ).sort((a, b) => b.path.length - a.path.length)[0];
}

/** Subsecciones con plan propio dentro de un módulo (ej.: Permisos y accesos desde Plus). */
const SUBRUTAS_PLAN: { path: string; label: string; minPlan: PlanId }[] = Object.values(SUBMENUS)
  .flatMap((m) => m.children)
  .filter((c): c is SubItem & { to: string; minPlan: PlanId } => !!c.to && !!c.minPlan)
  .map((c) => ({ path: c.to, label: c.label, minPlan: c.minPlan }));

/** Aviso cuando se entra a algo que no incluye el plan activo. En el demo se puede probar el
    plan que lo incluye ahí mismo, sin salir de la página ni volver a registrarse. */
function ModuloNoIncluido({
  label,
  minPlan,
  moduloId,
}: {
  label: string;
  minPlan: PlanId;
  moduloId?: string | undefined;
}) {
  const { plan, setPlan, planContratado } = useCloudEsther();
  const { usuario } = useSesion();
  const modulo = MODULES.find((m) => m.id === moduloId);
  // Start, Pro y Plus pueden comprar el módulo suelto sin cambiar de plan.
  const comprable = !!modulo && planLevel(minPlan) > planLevel(plan);
  return (
    <div className="grid min-h-[70vh] place-items-center p-6">
      <div className="card-premium max-w-md p-8 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
          <Lock className="size-5" />
        </span>
        <p className="mt-4 text-base font-semibold text-foreground">
          {label} está incluido desde el plan {PLANS[minPlan].name}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {planContratado
            ? `Tu plan contratado es ${PLANS[plan].name}. Podés contratarlo como módulo adicional; el cargo se suma a tu próxima factura de Cloud Esther.`
            : `Estás viendo el demo con el plan ${PLANS[plan].name}. Podés sumarlo como módulo adicional o probar el plan ${PLANS[minPlan].name}, sin salir de acá.`}
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {comprable && (
            <button
              type="button"
              className="btn-ce"
              onClick={() => agregarModuloExtra(modulo.id, usuario?.nombre ?? "Administración")}
            >
              {planContratado ? `Contratar ${label}` : `Agregar ${label} a mi plan`}
            </button>
          )}
          {!planContratado && (
            <button
              type="button"
              className={comprable ? "btn-ce-outline" : "btn-ce"}
              onClick={() => setPlan(minPlan)}
            >
              Probar el plan {PLANS[minPlan].name}
            </button>
          )}
          <Link to={"/demo" as never} className="btn-ce-outline">
            Volver al Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { clinic, plan, planListo } = useCloudEsther();
  const settings = useClinicSettings(clinic);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const modulo = moduloDeRuta(pathname);
  const [menuMovil, setMenuMovil] = useState(false);
  storeModulosExtra.usar(); // al comprar un módulo, se desbloquea en el momento
  const subBloqueada = SUBRUTAS_PLAN.find(
    (x) =>
      (pathname === x.path || pathname.startsWith(`${x.path}/`)) &&
      planLevel(x.minPlan) > planLevel(plan),
  );
  const bloqueado = modulo && !availableIn(modulo, plan) ? modulo : null;
  /* El plan define el odontograma: si se entra a la página del otro (por ejemplo, después de
     cambiar de plan), se lleva directo al que corresponde. Nunca se muestran los dos. */
  const irAl3D = bloqueado?.id === "odontograma" && odontogramaDelPlan(plan) === "3d";
  const irAl2D = bloqueado?.id === "odontograma3d" && odontogramaDelPlan(plan) === "2d";
  const moduloIA = MODULES.find((m) => m.id === "ia");
  // Módulos que recorre una cuenta de demo (para medir el interés desde el panel admin).
  const nombreModulo = modulo?.label ?? (pathname === "/demo" ? "Dashboard" : null);
  const { clinicId } = useSesion();
  const auditarModulos = settings.auditLogEnabled;
  useEffect(() => {
    if (!nombreModulo) return;
    registrarModuloDemo(nombreModulo);
    // Auditoría de la clínica: actividad de la sesión y (si está activado) accesos a módulos.
    if (clinicId) registrarActividadAuditoria(clinicId, nombreModulo, auditarModulos);
  }, [nombreModulo, clinicId, auditarModulos]);

  // El motor 3D pesa: en los planes con Odontograma 3D se descarga en segundo plano apenas
  // el navegador está libre, así el odontograma aparece rápido cuando se abre.
  useEffect(() => {
    if (odontogramaDelPlan(plan) !== "3d") return;
    const precargar = () => void import("@/components/odontogram/Odontogram3D").catch(() => {});
    const w = window as unknown as {
      requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
    };
    if (w.requestIdleCallback) w.requestIdleCallback(precargar, { timeout: 4000 });
    else window.setTimeout(precargar, 2500);
  }, [plan]);
  // Hasta leer el plan guardado no se muestra Esther (evita un destello de IA en Start o Pro).
  const iaDisponible = planListo && !!moduloIA && availableIn(moduloIA, plan);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", settings.darkModePage);
    document.documentElement.style.fontSize = FONT_SIZE_PX[settings.fontSize];

    // Al salir de esta sección (por ejemplo, al cerrar sesión y volver a la
    // landing pública), se restaura el documento a su estado normal para no
    // dejar el modo oscuro o el tamaño de fuente "pegado" fuera de la app.
    return () => {
      document.documentElement.classList.remove("dark");
      document.documentElement.style.fontSize = "";
    };
  }, [settings.darkModePage, settings.fontSize]);

  // El color del menú lateral se elige desde Pro; en Start se usa el violeta de la marca.
  const conColorMenu = nivelModulo("configuracion", plan) !== "basico";
  const colorHex = conColorMenu
    ? (SIDEBAR_COLORS.find((c) => c.id === settings.sidebarColor)?.hex ?? "#7c3aed")
    : "#7c3aed";
  const sidebarStyle = buildSidebarPalette(
    colorHex,
    (conColorMenu && settings.darkModeSidebar) || settings.darkModePage,
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* La columna ocupa todo el alto de la página con el color del sidebar (sin espacio en
          blanco debajo aunque el contenido sea largo) y el menú queda fijo al hacer scroll. */}
      <aside
        className="hidden w-[264px] shrink-0 self-stretch border-r border-sidebar-border bg-sidebar lg:block"
        style={sidebarStyle}
      >
        <div className="sticky top-0 h-screen">
          <SidebarInner />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <MobileHeader
          sidebarStyle={sidebarStyle}
          menu={menuMovil}
          setMenu={setMenuMovil}
          titulo={modulo ? etiquetaModulo(modulo, plan) : "Inicio"}
        />
        {/* En el celular se deja lugar para la barra inferior. */}
        <main className="min-w-0 flex-1 pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-0">
          {irAl3D ? (
            <Navigate to={"/demo/odontograma-3d" as never} replace />
          ) : irAl2D ? (
            <Navigate to={"/demo/odontograma" as never} replace />
          ) : bloqueado ? (
            <ModuloNoIncluido
              label={bloqueado.label}
              minPlan={bloqueado.minPlan}
              moduloId={bloqueado.id}
            />
          ) : subBloqueada ? (
            <ModuloNoIncluido label={subBloqueada.label} minPlan={subBloqueada.minPlan} />
          ) : (
            children
          )}
        </main>
      </div>
      <BarraInferior onMas={() => setMenuMovil(true)} />
      {/* Esther a mano en todos los módulos, solo en planes con IA (Plus y Enterprise). */}
      {iaDisponible &&
        !bloqueado &&
        !pathname.startsWith("/demo/ia") &&
        // El Odontograma 2D (Start y Pro) no lleva IA ni audio: eso es del 3D.
        modulo?.id !== "odontograma" &&
        // RRHH ya tiene su propia Esther (especializada en el equipo) en el mismo lugar.
        !pathname.startsWith("/demo/rrhh") && (
          <EstherFlotante
            moduloId={modulo?.id ?? "dashboard"}
            modulo={modulo?.label ?? "el inicio"}
          />
        )}
    </div>
  );
}