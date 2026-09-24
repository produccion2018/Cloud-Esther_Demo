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

/* Diente de la marca */
function ToothIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M19 7C12.5 7 7 12.4 7 19.2c0 5.8 2.1 9.3 4 14.1 2.1 5.4 2.1 13.9 4.9 17.8 1.5 2.1 4.2 2.2 5.7-.2 2.1-3.4 2.5-9.3 5.3-12.4 1.3-1.5 2.7-2.3 5.1-2.3s3.8.8 5.1 2.3c2.8 3.1 3.2 9 5.3 12.4 1.5 2.4 4.2 2.3 5.7.2 2.8-3.9 2.8-12.4 4.9-17.8 1.9-4.8 4-8.3 4-14.1C57 12.4 51.5 7 45 7c-4.1 0-7.5 1.9-13 4.8C26.5 8.9 23.1 7 19 7Z"
        fill="currentColor"
      />
    </svg>
  );
}

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to={"/demo" as never} className="flex items-center gap-2.5">
      <ToothIcon className="size-9 shrink-0 text-sidebar-primary" />

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

function NavList({
  onNavigate,
}: {
  onNavigate?: (() => void) | undefined;
}) {
  const { plan, disabled } = useCloudEsther();

  const pathname = useRouterState({
    select: (s) => s.location.pathname,
  });

  return (
    <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-6 [scrollbar-width:thin] [scrollbar-color:transparent_transparent] hover:[scrollbar-color:color-mix(in_oklab,var(--color-sidebar-foreground,currentColor)_18%,transparent)_transparent]">
      {GROUPS.map((group) => {
        const items = MODULES.filter((m) => m.group === group);

        const visible = items.filter(
          (m) =>
            availableIn(m, plan) ||
            planLevel(m.minPlan) <= planLevel(plan) + 1,
        );

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
                    : pathname.startsWith(m.path);

                if (!unlocked) {
                  return (
                    <li key={m.id}>
                      <div className="flex cursor-not-allowed items-center gap-2.5 rounded-lg px-2 py-2 text-sm text-sidebar-foreground/35">
                        <ModuleIcon
                          name={m.icon}
                          className="size-4 shrink-0"
                        />

                        <span className="truncate">{m.label}</span>

                        <Lock className="ml-auto size-3" />
                      </div>
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
                        className={cn(
                          "size-4 shrink-0",
                          active && "text-sidebar-primary",
                        )}
                      />

                      <span className="truncate">{m.label}</span>

                      {off && (
                        <span className="ml-auto text-[9px] uppercase tracking-wider">
                          off
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

/* ─────────────────────────────────────────────
   Selector de plan (demo)
   Antes era texto fijo ("Clínica Avanzada" hardcodeado
   en el estado inicial de CloudEstherProvider). Ahora es
   un <select> real que llama a setPlan del contexto, para
   poder probar el bloqueo por plan (Odontograma 2D/3D,
   Inventario, RRHH, etc.) sin tocar código.
───────────────────────────────────────────── */

function PlanFooter() {
  const { plan, setPlan } = useCloudEsther();

  return (
    <div className="border-t border-sidebar-border p-3">
      <div className="rounded-xl bg-sidebar-accent/60 p-3">
        <p className="text-[10px] uppercase tracking-[0.16em] text-sidebar-foreground/45">
          Plan activo
        </p>

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

        <p className="mt-1.5 text-[11px] text-sidebar-foreground/55">
          {PLANS[plan].audience}
        </p>
      </div>

      <Link
        to={"/" as never}
        className="mt-2 flex items-center justify-center gap-2 rounded-lg border border-sidebar-border px-3 py-2 text-xs font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
      >
        <LogOut className="size-3.5" />
        Cerrar sesión
      </Link>
    </div>
  );
}

function SidebarInner({
  onNavigate,
}: {
  onNavigate?: (() => void) | undefined;
}) {
  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="px-4 py-4">
        <Logo />
      </div>

      <NavList onNavigate={onNavigate} />

      <PlanFooter />
    </div>
  );
}

function MobileHeader() {
  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border/80 bg-background/85 px-3 py-2.5 backdrop-blur-xl lg:hidden">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon">
            <Menu className="size-5" />
          </Button>
        </SheetTrigger>

        <SheetContent
          side="left"
          className="w-[280px] border-sidebar-border bg-sidebar p-0"
        >
          <SheetTitle className="sr-only">Navegación</SheetTitle>

          <SidebarInner />
        </SheetContent>
      </Sheet>

      <Logo compact />
    </header>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen w-[264px] shrink-0 border-r border-sidebar-border lg:block">
        <SidebarInner />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <MobileHeader />

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}