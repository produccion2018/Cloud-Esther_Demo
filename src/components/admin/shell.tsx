import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  Building2,
  CreditCard,
  Database,
  Eye,
  FileBarChart,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  Moon,
  MonitorPlay,
  Package,
  Receipt,
  ScrollText,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { BrandMark } from "./logo";
import { Campana } from "./notificaciones";
import { ROLES, canAccess, roleInitials, roleLabel, useRole, type AdminRole } from "./role";
import { CON_BACKEND, registrarSalida } from "@/lib/admin/api";
import { guardarPreferencias, usePreferencias } from "@/lib/admin/preferencias";
import { cerrarSesionAdmin, useSesionAdmin } from "@/lib/admin/sesion";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

// El acceso por rol de cada ítem se define en role.tsx (sectionAccess).
type NavItem = { to: string; label: string; icon: LucideIcon };

const nav: { section: string; items: NavItem[] }[] = [
  {
    section: "Negocio",
    items: [
      { to: "/admin", label: "Resumen", icon: LayoutDashboard },
      { to: "/admin/demos", label: "Demos e interesados", icon: MonitorPlay },
      { to: "/admin/clinicas", label: "Clínicas clientes", icon: Building2 },
      { to: "/admin/pagos", label: "Pagos y cobranza", icon: CreditCard },
      { to: "/admin/planes", label: "Planes y precios", icon: Package },
      { to: "/admin/ia", label: "Consumo de IA", icon: Sparkles },
    ],
  },
  {
    section: "Empresa",
    items: [
      { to: "/admin/personal", label: "Personal", icon: Users },
      { to: "/admin/nomina", label: "Nómina y pagos", icon: Wallet },
      { to: "/admin/gastos", label: "Gastos y proveedores", icon: Receipt },
    ],
  },
  {
    section: "Operaciones",
    items: [{ to: "/admin/soporte", label: "Soporte técnico", icon: LifeBuoy }],
  },
  {
    section: "Control",
    items: [
      { to: "/admin/auditoria", label: "Auditoría", icon: ScrollText },
      { to: "/admin/reportes", label: "Reportes", icon: FileBarChart },
      { to: "/admin/notificaciones", label: "Notificaciones", icon: Bell },
    ],
  },
  {
    section: "Cuenta",
    items: [
      { to: "/admin/cuenta", label: "Mi perfil y apariencia", icon: Settings },
      { to: "/admin/accesos", label: "Equipo y accesos", icon: ShieldCheck },
    ],
  },
];

function iniciales(nombre: string) {
  return nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

function Navegacion({ onIr }: { onIr?: () => void }) {
  const { role } = useRole();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
      {nav.map((group) => {
        const items = group.items.filter((i) => canAccess(role, i.to));
        if (!items.length) return null;
        return (
          <div key={group.section}>
            <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-sidebar-foreground/45">
              {group.section}
            </p>
            <div className="space-y-0.5">
              {items.map((item) => {
                const active =
                  item.to === "/admin" ? pathname === "/admin" : pathname.startsWith(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    {...(onIr ? { onClick: onIr } : {})}
                    className={cn(
                      "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-all",
                      active
                        ? "bg-card text-primary shadow-[0_10px_24px_-14px_rgba(0,0,0,0.6)]"
                        : "text-sidebar-foreground/72 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "grid h-7 w-7 place-items-center rounded-lg transition-colors",
                        active ? "bg-primary/10 text-primary" : "bg-sidebar-accent/70",
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                    </span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );
}

function TarjetaUsuario() {
  const sesion = useSesionAdmin();
  const { role } = useRole();
  const navigate = useNavigate();
  const nombre = sesion?.usuario.nombre ?? roleLabel[role];
  return (
    <div className="border-t border-sidebar-border p-3">
      <div className="flex items-center gap-3 rounded-2xl bg-sidebar-accent/70 px-3 py-2.5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-sidebar-primary text-xs font-bold text-sidebar-primary-foreground">
          {sesion ? iniciales(nombre) : roleInitials[role]}
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-sm font-semibold">{nombre}</p>
          <p className="truncate text-[11px] text-sidebar-foreground/60">{roleLabel[role]}</p>
        </div>
        <button
          type="button"
          title="Cerrar sesión"
          aria-label="Cerrar sesión"
          onClick={() => {
            void registrarSalida("Manual").finally(() => {
              cerrarSesionAdmin();
              void navigate({ to: "/admin/login" });
            });
          }}
          className="grid h-8 w-8 place-items-center rounded-lg text-sidebar-foreground/60 transition hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function Lateral({ onIr }: { onIr?: () => void }) {
  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="border-b border-sidebar-border px-5 py-5">
        <BrandMark subtitle="Administración interna" />
      </div>
      <Navegacion {...(onIr ? { onIr } : {})} />
      <TarjetaUsuario />
    </div>
  );
}

/** Cambio rápido claro/oscuro (más opciones en Mi perfil → Apariencia). */
function BotonTema() {
  const { tema } = usePreferencias();
  const oscuro =
    tema === "oscuro" ||
    (tema === "sistema" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  return (
    <button
      type="button"
      onClick={() => guardarPreferencias({ tema: oscuro ? "claro" : "oscuro" })}
      aria-label={oscuro ? "Usar modo claro" : "Usar modo oscuro"}
      title={oscuro ? "Modo claro" : "Modo oscuro"}
      className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-card text-foreground/80 transition hover:text-primary"
    >
      {oscuro ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

/** Etiqueta que aclara de dónde salen los datos. */
export function OrigenDatos() {
  return CON_BACKEND ? (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-success/25 bg-success/10 px-2.5 py-1 text-[11px] font-semibold text-success">
      <Database className="h-3 w-3" /> Datos en vivo
    </span>
  ) : (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-warning/40 bg-warning/15 px-2.5 py-1 text-[11px] font-semibold text-warning-foreground"
      title="Todavía no hay backend conectado: se muestran datos de ejemplo guardados en este navegador."
    >
      <Database className="h-3 w-3" /> <span className="hidden sm:inline">Datos de </span>ejemplo
    </span>
  );
}

export function AdminShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { role, setRole, vistaPrevia } = useRole();
  const [menu, setMenu] = useState(false);

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* La columna ocupa todo el alto de la página y el menú queda fijo al hacer scroll. */}
      <aside className="hidden w-[264px] shrink-0 self-stretch bg-sidebar lg:block">
        <div className="sticky top-0 h-screen">
          <Lateral />
        </div>
      </aside>

      <Sheet open={menu} onOpenChange={setMenu}>
        <SheetContent side="left" className="w-[280px] border-0 p-0">
          <SheetTitle className="sr-only">Menú del panel</SheetTitle>
          <Lateral onIr={() => setMenu(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barra superior */}
        <header className="sticky top-0 z-20 border-b border-border/70 bg-background/85 backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-2.5 md:px-8">
            <button
              type="button"
              onClick={() => setMenu(true)}
              aria-label="Abrir menú"
              className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-card lg:hidden"
            >
              <Menu className="h-4 w-4" />
            </button>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary">
              <ShieldCheck className="h-3 w-3" /> Panel interno
              <span className="hidden sm:inline"> · Cloud Esther</span>
            </span>
            <OrigenDatos />
            <div className="ml-auto flex items-center gap-2">
              <BotonTema />
              <Campana />
              {/* Solo en desarrollo: para revisar cómo ve el panel cada perfil. */}
              {import.meta.env.DEV && (
                <label className="hidden items-center gap-2 text-[11px] text-muted-foreground sm:flex">
                  <Eye className="h-3.5 w-3.5" />
                  Ver como
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as AdminRole)}
                    className="h-8 rounded-lg border border-border bg-card px-2 text-xs font-semibold text-foreground outline-none focus:border-primary/50"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {roleLabel[r]}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          </div>
          {vistaPrevia && (
            <div className="border-t border-warning/30 bg-warning/15 px-4 py-1.5 text-center text-[11px] font-semibold text-warning-foreground md:px-8">
              Vista previa como «{roleLabel[role]}» (solo desarrollo). Tus permisos reales no
              cambian.
              <button type="button" className="ml-2 underline" onClick={() => setRole(null)}>
                Volver a mi perfil
              </button>
            </div>
          )}
        </header>

        <main className="flex-1 px-4 py-6 md:px-8">
          <div className="mx-auto w-full max-w-[1360px] space-y-6">
            {/* Encabezado de la sección */}
            <section className="relative overflow-hidden rounded-[28px] border border-primary/15 bg-gradient-to-br from-card via-card to-primary/[0.06] p-5 shadow-[0_18px_44px_-34px_rgba(76,29,149,0.55)] md:p-7">
              <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-primary-deep via-primary to-primary-glow" />
              <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-primary/[0.06] blur-2xl" />
              <div className="relative flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <h1 className="text-2xl font-extrabold tracking-tight md:text-[30px]">{title}</h1>
                  {description && (
                    <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                      {description}
                    </p>
                  )}
                </div>
                {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
              </div>
            </section>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
