import { Link, useRouterState } from "@tanstack/react-router";
import { Lock, LogOut, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { MODULES, availableIn, planLevel, ModuleIcon, PLANS, useCloudEsther } from "@/lib/cloud-esther/data";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const GROUPS = ["Clínico", "Operación", "Administración", "Inteligencia", "Organización", "Sistema"] as const;

function ToothIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="12 12 40 42" className={className} fill="none" aria-hidden="true">
      <path
        fill="currentColor"
        d="M23 14 C17.5 14 14 18 14 23.5 C14 28 15.6 31 17 35.5 C18.6 40.5 18.6 47 20.6 50 C22.2 52.4 25.2 51.6 26 48.4 C27 44.4 28.4 40.6 32 40.6 C35.6 40.6 37 44.4 38 48.4 C38.8 51.6 41.8 52.4 43.4 50 C45.4 47 45.4 40.5 47 35.5 C48.4 31 50 28 50 23.5 C50 18 46.5 14 41 14 C37.6 14 35 15.6 32 15.6 C29 15.6 26.4 14 23 14 Z"
      />
      <path
        d="M20 22 C20 19.6 21.6 18.4 23.6 18.4"
        stroke="#8B5CF6"
        strokeOpacity="0.35"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to={"/demo" as never} className="flex items-center gap-2.5">
      <span className="brand-gradient grid size-8 place-items-center rounded-full text-primary-foreground shadow-[0_6px_18px_-6px_oklch(0.5_0.18_295)]">
        <ToothIcon className="size-[18px]" />
      </span>
      {!compact && (
        <span className="leading-tight">
          <span className="block font-display text-[15px] font-semibold tracking-tight text-sidebar-foreground">Cloud Esther</span>
          <span className="block text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/50">Dental Suite</span>
        </span>
      )}
    </Link>
  );
}

function NavList({ onNavigate }: { onNavigate?: (() => void) | undefined }) {
  const { plan, disabled } = useCloudEsther();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="scrollbar-slim flex-1 space-y-5 overflow-y-auto px-3 pb-6">
      {GROUPS.map((group) => {
        const items = MODULES.filter((m) => m.group === group);
        const visible = items.filter((m) => availableIn(m, plan) || planLevel(m.minPlan) <= planLevel(plan) + 1);
        if (!visible.length) return null;
        return (
          <div key={group}>
            <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/40">{group}</p>
            <ul className="space-y-0.5">
              {visible.map((m) => {
                const unlocked = availableIn(m, plan);
                const off = disabled.includes(m.id);
                const active = m.path === "/demo" ? pathname === "/demo" : pathname.startsWith(m.path);
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

function PlanFooter() {
  const { plan } = useCloudEsther();
  return (
    <div className="border-t border-sidebar-border p-3">
      <div className="rounded-xl bg-sidebar-accent/60 p-3">
        <p className="text-[10px] uppercase tracking-[0.16em] text-sidebar-foreground/45">Plan activo</p>
        <p className="font-display text-sm font-semibold text-sidebar-foreground">{PLANS[plan].name}</p>
        <p className="mt-0.5 text-[11px] text-sidebar-foreground/55">{PLANS[plan].audience}</p>
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

function SidebarInner({ onNavigate }: { onNavigate?: (() => void) | undefined }) {
  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="px-4 py-4"><Logo /></div>
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
          <Button variant="ghost" size="icon"><Menu className="size-5" /></Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[280px] border-sidebar-border bg-sidebar p-0">
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