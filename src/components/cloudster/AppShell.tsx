import { Link } from "@tanstack/react-router";
import {
  LayoutGrid, Calendar, Users, FileText, Boxes, Pill, Stethoscope,
  Bell, MessageSquare, Search, ChevronDown, Menu, Command,
} from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const CLINICO = [
  { label: "Dashboard", icon: LayoutGrid, active: true },
  { label: "Agenda y turnos", icon: Calendar },
  { label: "Pacientes", icon: Users },
  { label: "Historia clínica", icon: FileText },
  { label: "Odontograma y 3D", icon: Boxes },
  { label: "Recetas", icon: Pill },
  { label: "Estudios y diagnóstico", icon: Stethoscope },
];

const OPERACION = [
  { label: "Recordatorios", icon: Bell },
  { label: "Comunicaciones", icon: MessageSquare },
];

function Logo() {
  return (
    <Link to={"/app" as never} className="flex items-center gap-2.5">
      <span className="grid size-8 place-items-center rounded-[10px] bg-primary font-bold text-primary-foreground">
        C
      </span>
      <span className="leading-tight">
        <span className="block text-[15px] font-semibold tracking-tight text-sidebar-foreground">Cloudster</span>
        <span className="block text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/50">Dental Suite</span>
      </span>
    </Link>
  );
}

type NavItem = { label: string; icon: typeof LayoutGrid; active?: boolean };

function NavGroup({ title, items }: { title: string; items: NavItem[] }) {
  return (
    <div>
      <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/40">{title}</p>
      <ul className="space-y-0.5">
        {items.map((m) => (
          <li key={m.label}>
            <a
              href="#"
              className={
                m.active
                  ? "flex items-center gap-2.5 rounded-lg bg-sidebar-accent px-2 py-2 text-sm font-medium text-sidebar-accent-foreground"
                  : "flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
              }
            >
              <m.icon className="size-4 shrink-0" />
              <span className="truncate">{m.label}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SidebarInner() {
  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="px-4 py-4">
        <Logo />
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-6">
        <NavGroup title="Clínico" items={CLINICO} />
        <NavGroup title="Operación" items={OPERACION} />
      </nav>
      <div className="border-t border-sidebar-border p-3">
        <div className="rounded-xl bg-sidebar-accent/60 p-3">
          <p className="text-[10px] uppercase tracking-[0.16em] text-sidebar-foreground/45">Plan activo</p>
          <p className="text-sm font-semibold text-sidebar-foreground">Clínica Avanzada</p>
          <p className="mt-0.5 text-[11px] text-sidebar-foreground/55">Clínica con múltiples consultorios</p>
          <button className="mt-2.5 block w-full rounded-lg bg-sidebar-primary px-3 py-1.5 text-center text-xs font-semibold text-sidebar-primary-foreground hover:opacity-90">
            Comparar planes
          </button>
        </div>
      </div>
    </div>
  );
}

function Topbar() {
  return (
    <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-border/80 bg-background/85 px-3 py-2.5 backdrop-blur-xl md:px-6">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden">
            <Menu className="size-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[280px] border-sidebar-border bg-sidebar p-0">
          <SheetTitle className="sr-only">Navegación</SheetTitle>
          <SidebarInner />
        </SheetContent>
      </Sheet>

      <div className="relative hidden min-w-0 flex-1 md:block md:max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar paciente, turno, factura…" className="h-9 pl-9 pr-14" />
        <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground lg:flex">
          <Command className="size-2.5" />K
        </kbd>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium">Clínica Avanzada</div>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="size-4.5" />
          <span className="absolute right-2 top-2 size-1.5 rounded-full bg-destructive" />
        </Button>
        <div className="flex items-center gap-2 rounded-full border border-border bg-card py-1 pl-1 pr-2.5">
          <span className="grid size-7 place-items-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">MP</span>
          <span className="hidden leading-tight sm:block">
            <span className="block text-xs font-medium">Mauro Pinto</span>
            <span className="block text-[10px] text-muted-foreground">Administrador de clínica</span>
          </span>
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </div>
      </div>
    </header>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 flex h-screen w-[264px] shrink-0 border-r border-sidebar-border">
        <SidebarInner />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}