import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronDown, Lock, LogOut, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  MODULES,
  availableIn,
  planLevel,
  ModuleIcon,
  PLANS,
  useCloudEsther,
  type PlanId,
} from "@/lib/cloud-esther/data";
import {
  useClinicSettings,
  SIDEBAR_COLORS,
  FONT_SIZE_PX,
} from "@/lib/cloud-esther/settings-store";
import { cerrarSesion, useSesion } from "@/lib/cloud-esther/auth-store";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const GROUPS = [
  "Clínico",
  "Operación",
  "Administración",
  "Inteligencia",
  "Organización",
  "Sistema",
] as const;

type SubItem = { label: string; to?: string };

const SUBMENUS: Record<string, { children: SubItem[] }> = {
  "/demo/equipo-profesional": {
    children: [
      { label: "Integrantes", to: "/demo/equipo-profesional" },
      { label: "Especialidades", to: "/demo/equipo-profesional/especialidades" },
      { label: "Agendas y horarios", to: "/demo/equipo-profesional/agendas-horarios" },
      { label: "Permisos y accesos", to: "/demo/equipo-profesional/permisos-accesos" },
    ],
  },
};

function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="cloudEstherBrandGradient" x1="8" y1="4" x2="56" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#B463F0" />
          <stop offset="55%" stopColor="#8B3DE0" />
          <stop offset="100%" stopColor="#4C1D95" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="32" fill="url(#cloudEstherBrandGradient)" />
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
      className={cn("grid transition-[grid-template-rows] duration-200 ease-out", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}
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
  const toggle = (key: string, current: boolean) => setOpenMap((prev) => ({ ...prev, [key]: !current }));

  return (
    <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-6 [scrollbar-width:thin] [scrollbar-color:transparent_transparent] hover:[scrollbar-color:color-mix(in_oklab,var(--color-sidebar-foreground,currentColor)_18%,transparent)_transparent]">
      {GROUPS.map((group) => {
        const items = MODULES.filter((m) => m.group === group);
        const visible = items.filter((m) => availableIn(m, plan) || planLevel(m.minPlan) <= planLevel(plan) + 1);
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
                  m.path === "/demo" ? pathname === "/demo" : pathname === m.path || pathname.startsWith(`${m.path}/`);

                if (!unlocked) {
                  return (
                    <li key={m.id}>
                      <div className="flex cursor-not-allowed items-center gap-2.5 rounded-lg px-2 py-2 text-sm text-sidebar-foreground/35">
                        <ModuleIcon name={m.icon} className="size-4 shrink-0" />
                        <span className="truncate">{m.label}</span>
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
                          <ModuleIcon name={m.icon} className={cn("size-4 shrink-0", active && "text-sidebar-primary")} />
                          <span className="truncate">{m.label}</span>
                          {off && <span className="ml-auto text-[9px] uppercase tracking-wider">off</span>}
                        </Link>
                        <button
                          type="button"
                          aria-label={isOpen ? `Contraer ${m.label}` : `Desplegar ${m.label}`}
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
                          <ChevronDown className={cn("size-3.5 transition-transform duration-200", isOpen && "rotate-180")} />
                        </button>
                      </div>
                      <SubList items={submenu.children} open={isOpen} pathname={pathname} onNavigate={onNavigate} />
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
                      <ModuleIcon name={m.icon} className={cn("size-4 shrink-0", active && "text-sidebar-primary")} />
                      <span className="truncate">{m.label}</span>
                      {off && <span className="ml-auto text-[9px] uppercase tracking-wider">off</span>}
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
        <p className="truncate font-display text-sm font-semibold text-sidebar-foreground">{clinica.nombre}</p>
        <p className="truncate text-[11px] text-sidebar-foreground/55">{usuario.nombre}</p>
      </div>
    </div>
  );
}

function PlanFooter() {
  const { plan, setPlan } = useCloudEsther();
  return (
    <div className="border-t border-sidebar-border p-3">
      <div className="rounded-xl bg-sidebar-accent/60 p-3">
        <p className="text-[10px] uppercase tracking-[0.16em] text-sidebar-foreground/45">Plan activo</p>
        <div className="relative mt-1">
          <select
            value={plan}
            onChange={(e) => setPlan(e.target.value as PlanId)}
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
        <p className="mt-1.5 text-[11px] text-sidebar-foreground/55">{PLANS[plan].audience}</p>
      </div>
      <Link
        to={"/" as never}
        onClick={cerrarSesion}
        className="mt-2 flex items-center justify-center gap-2 rounded-lg border border-sidebar-border px-3 py-2 text-xs font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
      >
        <LogOut className="size-3.5" />
        Cerrar sesión
      </Link>
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

function MobileHeader({ sidebarStyle }: { sidebarStyle: React.CSSProperties }) {
  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border/80 bg-background/85 px-3 py-2.5 backdrop-blur-xl lg:hidden">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon">
            <Menu className="size-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[280px] border-sidebar-border bg-sidebar p-0" style={sidebarStyle}>
          <SheetTitle className="sr-only">Navegación</SheetTitle>
          <SidebarInner />
        </SheetContent>
      </Sheet>
      <Logo compact />
    </header>
  );
}

function hexToRgb(hex: string) {
  const clean = hex.replace("#", "");
  const bigint = parseInt(clean, 16);
  return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
}

function rgbToHex(r: number, g: number, b: number) {
  const toHex = (v: number) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function mix(hex: string, target: "white" | "black", amount: number) {
  const { r, g, b } = hexToRgb(hex);
  const t = target === "white" ? 255 : 0;
  return rgbToHex(r + (t - r) * amount, g + (t - g) * amount, b + (t - b) * amount);
}

function luminance(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const [rl, gl, bl] = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}

function buildSidebarPalette(baseHex: string, dark: boolean): React.CSSProperties {
  const background = dark ? mix(baseHex, "black", 0.86) : mix(baseHex, "white", 0.87);

  const foreground = dark ? mix(baseHex, "white", 0.82) : mix(baseHex, "black", 0.72);
  const accent = dark ? mix(baseHex, "black", 0.72) : mix(baseHex, "white", 0.72);
  const accentForeground = foreground;
  const border = dark ? mix(baseHex, "black", 0.68) : mix(baseHex, "white", 0.62);
  const primary = dark ? mix(baseHex, "white", 0.28) : mix(baseHex, "black", 0.12);
  const primaryForeground = "#ffffff";

  const vars: Record<string, string> = {
    "--sidebar": background,
    "--sidebar-foreground": foreground,
    "--sidebar-accent": accent,
    "--sidebar-accent-foreground": accentForeground,
    "--sidebar-border": border,
    "--sidebar-primary": primary,
    "--sidebar-primary-foreground": primaryForeground,
  };

  for (const [k, v] of Object.entries({ ...vars })) {
    vars[k.replace("--sidebar", "--color-sidebar")] = v;
  }

  return vars as React.CSSProperties;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { clinic } = useCloudEsther();
  const settings = useClinicSettings(clinic);

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

  const colorHex = SIDEBAR_COLORS.find((c) => c.id === settings.sidebarColor)?.hex ?? "#7c3aed";
  const sidebarStyle = buildSidebarPalette(colorHex, settings.darkModeSidebar || settings.darkModePage);

  return (
    <div className="flex min-h-screen bg-background">
      <aside
        className="sticky top-0 hidden h-screen w-[264px] shrink-0 border-r border-sidebar-border lg:block"
        style={sidebarStyle}
      >
        <SidebarInner />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <MobileHeader sidebarStyle={sidebarStyle} />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
