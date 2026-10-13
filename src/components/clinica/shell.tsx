import { LogOut, Menu, UserRound } from "lucide-react";
import { useState, type ReactNode } from "react";

import { ToothLogo } from "@/components/admin/logo";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { MODULES, ModuleIcon, etiquetaModulo, incluidoEnPlan, type AppModule, type PlanId } from "@/lib/cloud-esther/data";
import type { RolClinica, SesionClinica } from "@/lib/clinica/api";
import { cn } from "@/lib/utils";

/* Ubicación: src/components/clinica/shell.tsx
   LA ESTRUCTURA DE LA CLÍNICA REAL = la misma del demo: menú lateral con los grupos
   (Clínico, Operación, Administración…), los mismos módulos e íconos.
   Cada persona ve SOLO lo que incluye el plan de su clínica Y lo que le corresponde a su rol. */

export const PLAN_DE_CODIGO: Record<string, PlanId> = {
  START: "inicial",
  PRO: "profesional",
  PLUS: "avanzada",
  ENTERPRISE: "grupo",
};

const GRUPOS = ["Clínico", "Operación", "Administración", "Inteligencia", "Organización", "Sistema"] as const;

/* Qué módulos ve cada rol (además de lo que permita el plan).
   - Administrador: todo.
   - Odontólogo/a: lo clínico de sus pacientes, comunicación y avisos.
   - Secretaría: recepción (agenda de todos, pacientes, comunicación, cobros). Sin datos de salud.
   - Asistente: ayuda en el consultorio (agenda, pacientes, estudios y laboratorio; lo clínico para leer). */
const ACCESO_ROL: Record<Exclude<RolClinica, "admin">, string[]> = {
  odontologo: [
    "dashboard", "agenda", "pacientes", "historia", "odontograma", "odontograma3d", "recetas",
    "estudios", "laboratorio", "tratamientos", "comunicaciones", "notificaciones", "presupuestos", "ia",
  ],
  secretaria: [
    "dashboard", "agenda", "pacientes", "comunicaciones", "notificaciones", "presupuestos", "facturacion",
    "marketing", "portal-paciente",
  ],
  asistente: [
    "dashboard", "agenda", "pacientes", "historia", "odontograma", "odontograma3d", "estudios", "laboratorio",
    "tratamientos", "notificaciones",
  ],
};

export function puedeVer(rol: RolClinica, moduloId: string): boolean {
  return rol === "admin" || (ACCESO_ROL[rol]?.includes(moduloId) ?? false);
}

/** Los módulos que esta persona ve, en el orden del demo */
export function modulosDe(sesion: SesionClinica): AppModule[] {
  const plan = PLAN_DE_CODIGO[sesion.clinica.plan ?? ""] ?? "inicial";
  return MODULES.filter((m) => incluidoEnPlan(m, plan) && puedeVer(sesion.usuario.rol, m.id));
}

const iniciales = (n: string) =>
  n
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "?";

export function ClinicaShell({
  sesion,
  actual,
  onIr,
  onSalir,
  titulo,
  children,
}: {
  sesion: SesionClinica;
  actual: string;
  onIr: (id: string) => void;
  onSalir: () => void;
  titulo: string;
  children: ReactNode;
}) {
  const [menuMovil, setMenuMovil] = useState(false);
  const plan = PLAN_DE_CODIGO[sesion.clinica.plan ?? ""] ?? "inicial";
  const planNombre = sesion.clinica.plan
    ? sesion.clinica.plan.charAt(0) + sesion.clinica.plan.slice(1).toLowerCase()
    : null;
  const modulos = modulosDe(sesion);

  const Menu_ = ({ alElegir }: { alElegir?: () => void }) => (
    <div className="flex h-full flex-col">
      {/* Clínica */}
      <div className="flex items-center gap-3 px-5 pb-5 pt-6">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-white shadow-[0_10px_22px_-12px_rgba(76,29,149,0.9)]"
          style={{ background: "var(--gradient-brand)" }}
        >
          <ToothLogo className="h-5 w-5" />
        </span>
        <span className="min-w-0 leading-tight">
          <span className="block truncate text-[15px] font-bold text-sidebar-foreground">{sesion.clinica.nombre}</span>
          <span className="block text-[11px] font-medium text-sidebar-foreground/55">
            {planNombre ? `Plan ${planNombre}` : "Cloud Esther"}
          </span>
        </span>
      </div>

      {/* Módulos */}
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4 [scrollbar-width:thin]" aria-label="Módulos">
        {GRUPOS.map((g) => {
          const items = modulos.filter((m) => m.group === g);
          if (!items.length) return null;
          return (
            <div key={g}>
              <p className="flex items-center gap-2 px-2.5 pb-1.5 text-[11px] font-semibold text-sidebar-foreground/45">
                <span className="h-1 w-3 rounded-full" style={{ background: "var(--gradient-brand)" }} />
                {g}
              </p>
              <ul className="space-y-0.5">
                {items.map((m) => {
                  const activo = actual === m.id;
                  return (
                    <li key={m.id}>
                      <button
                        type="button"
                        onClick={() => {
                          onIr(m.id);
                          alElegir?.();
                        }}
                        aria-current={activo ? "page" : undefined}
                        className={cn(
                          "group flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm transition-all duration-200",
                          activo
                            ? "font-semibold text-white shadow-[0_10px_24px_-14px_rgba(124,58,237,0.9)]"
                            : "text-sidebar-foreground/75 hover:translate-x-0.5 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground",
                        )}
                        style={activo ? { background: "var(--gradient-brand)" } : undefined}
                      >
                        <ModuleIcon name={m.icon} className={cn("size-4 shrink-0", activo ? "text-white" : "text-primary")} />
                        <span className="truncate">{etiquetaModulo(m, plan)}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* Persona */}
      <div className="border-t border-sidebar-border p-3">
        <button
          type="button"
          onClick={() => {
            onIr("cuenta");
            alElegir?.();
          }}
          className={cn(
            "flex w-full items-center gap-3 rounded-2xl p-2 text-left transition-colors",
            actual === "cuenta" ? "bg-sidebar-accent" : "hover:bg-sidebar-accent/70",
          )}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/12 text-xs font-bold text-primary">
            {iniciales(sesion.usuario.nombre)}
          </span>
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-sm font-semibold text-sidebar-foreground">{sesion.usuario.nombre}</span>
            <span className="block truncate text-[11px] text-sidebar-foreground/55">{sesion.usuario.rolNombre}</span>
          </span>
          <UserRound className="h-4 w-4 text-sidebar-foreground/45" />
        </button>
        <button
          type="button"
          onClick={onSalir}
          className="mt-1 flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-sidebar-foreground/65 transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="h-4 w-4" /> Salir
        </button>
      </div>
    </div>
  );

  return (
    <div className="ce-clinica flex min-h-screen bg-[oklch(0.985_0.006_300)] dark:bg-background">
      <aside className="hidden w-[264px] shrink-0 self-stretch border-r border-sidebar-border bg-sidebar lg:block">
        <div className="sticky top-0 h-screen">
          <Menu_ />
        </div>
      </aside>

      <div className="relative flex min-w-0 flex-1 flex-col">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[480px] bg-[radial-gradient(circle_at_12%_0%,rgba(124,58,237,0.12),transparent_45%),radial-gradient(circle_at_88%_6%,rgba(236,72,153,0.08),transparent_40%)]"
        />
        {/* Barra de arriba en el celular */}
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b bg-background/85 px-4 py-3 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setMenuMovil(true)}
            aria-label="Abrir el menú"
            className="flex h-10 w-10 items-center justify-center rounded-xl ring-1 ring-border"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-sm font-bold">{titulo}</span>
            <span className="block truncate text-[11px] text-muted-foreground">{sesion.clinica.nombre}</span>
          </span>
        </header>
        <Sheet open={menuMovil} onOpenChange={setMenuMovil}>
          <SheetContent side="left" className="ce-clinica w-[280px] bg-sidebar p-0">
            <SheetTitle className="sr-only">Menú de la clínica</SheetTitle>
            <Menu_ alElegir={() => setMenuMovil(false)} />
          </SheetContent>
        </Sheet>

        <main className="relative mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-6 sm:px-8 lg:pt-10">{children}</main>
      </div>
    </div>
  );
}

/* Cabecera de cada módulo (título grande + descripción), igual en todas las pantallas */
export function CabeceraModulo({
  icono,
  titulo,
  detalle,
  accion,
}: {
  icono: string;
  titulo: string;
  detalle: string;
  accion?: ReactNode;
}) {
  return (
    <div className="ce-entra mb-7 flex flex-wrap items-end justify-between gap-4">
      <div className="flex items-center gap-4">
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-[0_12px_26px_-14px_rgba(76,29,149,0.9)]"
          style={{ background: "var(--gradient-brand)" }}
        >
          <ModuleIcon name={icono} className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-[1.75rem]">{titulo}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{detalle}</p>
        </div>
      </div>
      {accion}
    </div>
  );
}
