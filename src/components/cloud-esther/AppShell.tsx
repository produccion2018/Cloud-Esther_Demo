import { useEffect, useId, useRef, useState } from "react";
import { odontogramaDelPlan } from "@/lib/cloud-esther/planes-config";
import { Link, Navigate, useRouterState } from "@tanstack/react-router";
import { Bell, CalendarDays, Check, ChevronDown, LayoutDashboard, Lock, LogOut, Menu, MoreHorizontal, RotateCcw, Settings, ShieldCheck, Sparkles, Stethoscope, UserRound, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMarca } from "@/lib/cloud-esther/marca";
import {
  MODULES,
  comprableEn,
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
// Reloj del demo: solo con servidor (Etapa 3a). Sin servidor no se muestra nada.
import { ContadorDemo, ControlSesionDemo } from "@/components/cloud-esther/ControlDemo";
import { DEMO_EN_SERVIDOR } from "@/lib/cloud-esther/demo-servidor";
import { registrarActividadAuditoria } from "@/lib/cloud-esther/auditoria-store";
// Clínica real (Etapa 8b): mismas pantallas, sus datos en el servidor, menú según el rol
import { salirYVolver, slugDeSesionGuardada, useClinicaReal } from "@/lib/clinica/modo-clinica";
import { NOMBRE_ROL, moduloHabilitado, puedeVer } from "@/lib/clinica/permisos";
import { hayCambiosSinGuardar, useEstadoGuardado } from "@/lib/clinica/sincronizar";
import { avisarModuloAdicional, refrescarSesionClinica } from "@/lib/clinica/api";
import { useAvisosChat } from "@/lib/clinica/chat";
import { AvisosChatGlobal } from "@/components/clinica/avisos-chat";
import { CambiarVista } from "@/components/clinica/cambiar-vista";
import { useAlmacenClinicoListo } from "@/lib/clinica/almacen-clinico";
import { Toaster } from "@/components/ui/sonner";
import { ajustarCatalogosClinica } from "@/lib/cloud-esther/agenda-store";
import { borrarDatosGuardados } from "@/lib/cloud-esther/tenant-store";
import { contratarModuloExtra, storeModulosExtra } from "@/lib/cloud-esther/modulos-extra-store";
import { DialogoCompraModulo } from "@/components/cloud-esther/facturacion/DialogoCompraModulo";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useNotificaciones } from "@/components/cloud-esther/useNotificaciones";
import { buildSidebarPalette } from "@/lib/cloud-esther/sidebar-paleta";
import { EstherFlotante } from "@/components/cloud-esther/esther-ai/EstherFlotante";
import { EstherBriefing } from "@/components/cloud-esther/esther-ai/EstherBriefing";
import { AyudaEsther } from "@/components/cloud-esther/esther-ai/AyudaEsther";
import { vieneDeAccesoPrueba, volverSiEsPrueba } from "@/lib/acceso-prueba";
import { BotonInstalarApp } from "@/components/cloud-esther/InstalarApp";

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
  // Marca propia (Plus y Enterprise): el logo y el nombre de la clínica
  const m = useMarca();
  return (
    <Link to={"/demo" as never} className="flex items-center gap-2.5">
      <span className="relative shrink-0">
        <span aria-hidden className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-primary to-fuchsia-500 opacity-40 blur-md" />
        {m.activa ? (
          <img src={m.marca.logo} alt="" className="relative size-9 rounded-xl bg-white object-contain p-1 shadow-sm" />
        ) : (
          <BrandMark className="relative size-9" />
        )}
      </span>
      {!compact && (
        <span className="min-w-0 leading-tight">
          <span className="block truncate font-display text-[15px] font-semibold tracking-tight text-sidebar-foreground">
            {m.activa && m.nombre ? m.nombre : "Cloud Esther"}
          </span>
          <span className="block text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/50">
            {m.activa ? "con Cloud Esther" : "Dental Suite"}
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
  const real = useClinicaReal();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});
  // Módulos adicionales comprados: al agregarlos aparecen en el menú sin recargar.
  const extras = storeModulosExtra.usar().activos.map((x) => x.id);
  const toggle = (key: string, current: boolean) =>
    setOpenMap((prev) => ({ ...prev, [key]: !current }));
  // Contador de avisos sin leer (solo en el cliente, para no generar diferencias de hidratación).
  const { sinLeer } = useNotificaciones();
  // Comunicación interna: mensajes sin leer y comunicados por confirmar
  const chat = useAvisosChat();
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);

  return (
    <nav className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-3 pb-6 pt-1 [mask-image:linear-gradient(to_bottom,transparent,#000_10px,#000_calc(100%-28px),transparent)] [scrollbar-width:thin] [scrollbar-color:transparent_transparent] hover:[scrollbar-color:color-mix(in_oklab,var(--color-sidebar-foreground,currentColor)_18%,transparent)_transparent]">
      {GROUPS.map((group) => {
        const items = MODULES.filter((m) => m.group === group);
        // Cada plan ve solo sus módulos (sin mostrar los de otros planes).
        const visible = items.filter(
          (m) => availableIn(m, plan) && (!real || puedeVer(real.rol, m.id, real.sesion.usuario.modulos)),
        );
        if (!visible.length) return null;

        return (
          <div key={group}>
            <p className="flex items-center gap-2 px-2 pb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-sidebar-foreground/45">
              <span className="h-1 w-3 rounded-full bg-gradient-to-r from-primary to-fuchsia-500" />
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
                            "group flex items-center gap-2.5 rounded-xl px-2.5 py-2 pr-9 text-sm transition-all",
                            active
                              ? "bg-gradient-to-r from-primary to-fuchsia-500 font-semibold text-white shadow-[0_10px_24px_-14px_rgba(124,58,237,0.9)]"
                              : "text-sidebar-foreground/75 hover:translate-x-0.5 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                            off && "opacity-40",
                          )}
                        >
                          <ModuleIcon
                            name={m.icon}
                            className={cn("size-4 shrink-0", active ? "text-white" : "text-primary")}
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
                        "group flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm transition-all",
                        active
                          ? "bg-gradient-to-r from-primary to-fuchsia-500 font-semibold text-white shadow-[0_10px_24px_-14px_rgba(124,58,237,0.9)]"
                          : "text-sidebar-foreground/75 hover:translate-x-0.5 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                        off && "opacity-40",
                      )}
                    >
                      <ModuleIcon
                        name={m.icon}
                        className={cn("size-4 shrink-0", active ? "text-white" : "text-primary")}
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
                      {!off && m.id === "comunicacion-interna" && montado && chat.noLeidos + chat.pendientes > 0 && (
                        <span
                          className={cn(
                            "ml-auto grid min-w-5 place-items-center rounded-full px-1.5 text-[10px] font-bold",
                            chat.pendientes > 0 ? "bg-amber-500 text-white" : "bg-sidebar-primary text-sidebar-primary-foreground",
                          )}
                          aria-label={`${chat.noLeidos} mensajes sin leer, ${chat.pendientes} comunicados por confirmar`}
                        >
                          {chat.noLeidos + chat.pendientes > 99 ? "99+" : chat.noLeidos + chat.pendientes}
                        </span>
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
      {/* Clínica real: Tu cuenta. Demo: la administración de la clínica con el equipo de ejemplo. */}
      {(real || montado) && (
        <div>
          <p className="flex items-center gap-2 px-2 pb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-sidebar-foreground/45">
            <span className="h-1 w-3 rounded-full bg-gradient-to-r from-primary to-fuchsia-500" />
            {real ? "Tu cuenta" : "Administración de la clínica"}
          </p>
          <ul className="space-y-0.5">
            {[
              ...(!real || real.rol === "admin" ? [{ to: "/demo/accesos", label: "Accesos del equipo", icon: ShieldCheck }] : []),
              ...(real ? [{ to: "/demo/mi-cuenta", label: "Mi cuenta", icon: UserRound }] : []),
            ].map((it) => {
              const activo = pathname === it.to;
              return (
                <li key={it.to}>
                  <Link
                    to={it.to as never}
                    onClick={onNavigate}
                    className={cn(
                      "group flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm transition-all",
                      activo
                        ? "bg-gradient-to-r from-primary to-fuchsia-500 font-semibold text-white shadow-[0_10px_24px_-14px_rgba(124,58,237,0.9)]"
                        : "text-sidebar-foreground/75 hover:translate-x-0.5 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                    )}
                  >
                    <it.icon className={cn("size-4 shrink-0", activo ? "text-white" : "text-primary")} />
                    <span className="truncate">{it.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
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
    <div className="relative mx-3 mb-3 flex items-center gap-2.5 overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-violet-600 to-fuchsia-600 p-3 text-white shadow-[0_14px_30px_-18px_rgba(124,58,237,0.95)]">
      <span aria-hidden className="pointer-events-none absolute -right-6 -top-8 size-20 rounded-full bg-white/15 blur-xl" />
      <span className="relative grid size-9 shrink-0 place-items-center rounded-xl bg-white/20 text-[11px] font-bold ring-1 ring-white/30">
        {iniciales(clinica.nombre)}
      </span>
      <div className="relative min-w-0 flex-1 leading-tight">
        <p className="truncate font-display text-sm font-bold">{clinica.nombre}</p>
        <p className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] text-white/80">
          <span className="size-1.5 shrink-0 rounded-full bg-[#6ee7b7] shadow-[0_0_8px_rgba(110,231,183,0.9)]" />
          {usuario.nombre}
        </p>
      </div>
    </div>
  );
}

/* Selector de plan del demo: menú propio (premium) que se abre hacia arriba, con el público
   de cada plan, cuántos módulos trae y una marca en el elegido. Se cierra con Esc o tocando afuera. */
const TONO_PLAN: Record<PlanId, string> = {
  inicial: "from-sky-500 to-indigo-500",
  profesional: "from-violet-500 to-fuchsia-500",
  avanzada: "from-fuchsia-500 to-rose-500",
  grupo: "from-amber-500 to-rose-500",
};

function SelectorPlan({
  plan,
  setPlan,
  cantidad,
}: {
  plan: PlanId;
  setPlan: (p: PlanId) => void;
  cantidad: number;
}) {
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  const idLista = useId();
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => {
      if (caja.current && !caja.current.contains(e.target as Node)) setAbierto(false);
    };
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false);
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("keydown", tecla);
    };
  }, [abierto]);
  const ids = Object.keys(PLANS) as PlanId[];
  return (
    <div ref={caja} className="relative">
      {abierto && (
        <div
          id={idLista}
          role="listbox"
          aria-label="Planes"
          className="ce-aparecer absolute inset-x-0 bottom-[calc(100%+8px)] z-30 overflow-hidden rounded-2xl border border-sidebar-border/80 bg-sidebar/95 p-1.5 shadow-[0_24px_48px_-20px_rgba(46,16,101,0.55)] backdrop-blur-xl"
        >
          <p className="px-2.5 pb-1.5 pt-1 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/45">
            Probá cada plan
          </p>
          {ids.map((id) => {
            const on = id === plan;
            const mods = MODULES.filter((m) => availableIn(m, id)).length;
            return (
              <button
                key={id}
                type="button"
                role="option"
                aria-selected={on}
                onClick={() => {
                  setPlan(id);
                  setAbierto(false);
                }}
                className={cn(
                  "group/op flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left transition-all duration-200",
                  on ? "bg-gradient-to-r from-primary/[0.14] to-fuchsia-500/[0.08]" : "hover:bg-sidebar-accent/70",
                )}
              >
                <span
                  className={cn(
                    "grid size-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br text-[11px] font-semibold text-white shadow-[0_4px_10px_-6px_rgba(76,29,149,0.8)] transition-transform duration-200 group-hover/op:scale-105",
                    TONO_PLAN[id],
                  )}
                >
                  {PLANS[id].name.charAt(0)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold leading-tight text-sidebar-foreground">{PLANS[id].name}</span>
                  <span className="block truncate text-[10.5px] leading-tight text-sidebar-foreground/55">
                    {mods} módulos · {PLANS[id].audience}
                  </span>
                </span>
                {on && <Check className="size-3.5 shrink-0 text-primary" />}
              </button>
            );
          })}
        </div>
      )}
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={abierto}
        aria-controls={abierto ? idLista : undefined}
        aria-label="Probar otro plan"
        className={cn(
          "group/plan flex w-full items-center gap-2.5 rounded-2xl border bg-sidebar/70 p-1.5 pl-2 text-left shadow-[0_1px_0_rgba(255,255,255,0.5)_inset,0_8px_24px_-18px_rgba(76,29,149,0.6)] backdrop-blur transition-all duration-200 hover:border-sidebar-primary/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-primary/30",
          abierto ? "border-sidebar-primary/40" : "border-sidebar-border/70",
        )}
      >
        <span
          className={cn(
            "grid size-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white shadow-[0_6px_14px_-8px_rgba(124,58,237,0.9)]",
            TONO_PLAN[plan],
          )}
        >
          <Sparkles className="size-3.5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block whitespace-nowrap text-[9.5px] font-semibold uppercase leading-none tracking-[0.12em] text-sidebar-foreground/45">
            Plan del demo
          </span>
          <span className="mt-1 block truncate font-display text-sm font-semibold leading-tight text-sidebar-foreground">
            {PLANS[plan].name}
          </span>
        </span>
        <span
          className="shrink-0 rounded-full bg-sidebar-accent px-2 py-0.5 text-[10px] font-semibold tabular-nums text-sidebar-foreground/65"
          title={`${cantidad} módulos del plan ${PLANS[plan].name} en el menú`}
        >
          {cantidad} mód.
        </span>
        <ChevronDown
          className={cn(
            "mr-1 size-3.5 shrink-0 text-sidebar-foreground/45 transition-transform duration-300",
            abierto ? "rotate-180" : "",
          )}
        />
      </button>
    </div>
  );
}

function PlanFooter() {
  const { plan, setPlan, planContratado } = useCloudEsther();
  const real = useClinicaReal();
  const cantidad = MODULES.filter((m) => availableIn(m, plan)).length;
  return (
    <div className="relative shrink-0 border-t border-sidebar-border/70 px-3 pb-3 pt-2.5">
      {/* Plan: una sola fila compacta (no tapa el menú). En el demo abre un menú premium. */}
      {planContratado ? (
        <div className="flex items-center gap-2.5 rounded-2xl border border-sidebar-border/70 bg-sidebar/70 p-1.5 pl-2 shadow-[0_1px_0_rgba(255,255,255,0.5)_inset,0_8px_24px_-18px_rgba(76,29,149,0.6)] backdrop-blur">
          <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-fuchsia-500 text-white shadow-[0_6px_14px_-8px_rgba(124,58,237,0.9)]">
            <Lock className="size-3.5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[9.5px] font-semibold uppercase leading-none tracking-[0.16em] text-sidebar-foreground/45">
              Plan contratado
            </p>
            {/* Empresa con plan comprado: se muestra fijo, sin opción de cambiarlo. */}
            <p className="mt-1 truncate font-display text-sm font-semibold leading-tight text-sidebar-foreground" title={PLANS[plan].audience}>
              {PLANS[plan].name}
            </p>
          </div>
        </div>
      ) : (
        <SelectorPlan plan={plan} setPlan={setPlan} cantidad={cantidad} />
      )}
      <div className="mt-2 flex items-center gap-1.5">
        <Link
          to={"/" as never}
          onClick={(e) => {
            if (real) {
              e.preventDefault();
              salirYVolver();
              return;
            }
            cerrarSesion();
            if (vieneDeAccesoPrueba()) {
              e.preventDefault();
              volverSiEsPrueba();
            }
          }}
          className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-xl border border-sidebar-border/80 px-3 text-[11.5px] font-medium text-sidebar-foreground/70 transition-all duration-200 hover:border-sidebar-primary/30 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
        >
          <LogOut className="size-3.5" />
          {planContratado ? "Cerrar sesión" : "Salir del demo"}
        </Link>
        {!real && (
          <button
            type="button"
            title="Restablecer datos de práctica"
            aria-label="Restablecer datos de práctica"
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
            className="grid size-8 shrink-0 place-items-center rounded-xl border border-sidebar-border/80 text-sidebar-foreground/55 transition-all duration-200 hover:rotate-[-30deg] hover:border-sidebar-primary/30 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
          >
            <RotateCcw className="size-3.5" />
          </button>
        )}
      </div>
      {DEMO_EN_SERVIDOR && !real && <ContadorDemo />}
      {real && <IndicadorGuardado />}
    </div>
  );
}

/* Clínica real: se ve si lo último ya quedó guardado en el servidor */
function IndicadorGuardado() {
  const estado = useEstadoGuardado();
  return (
    <p className="mt-1.5 flex items-center justify-center gap-1.5 text-[10.5px] text-sidebar-foreground/55" aria-live="polite">
      <span
        className={cn(
          "size-1.5 rounded-full",
          estado === "guardando" ? "animate-pulse bg-amber-400" : estado === "error" ? "bg-destructive" : "bg-emerald-400",
        )}
      />
      {estado === "guardando" ? "Guardando…" : estado === "error" ? "Sin conexión: se reintenta" : "Todo guardado"}
    </p>
  );
}

/* Clínica real: el Administrador pasa del Centro de operaciones a Administración (mismos datos) */
function VistaDelDueno() {
  const real = useClinicaReal();
  // Demo: se muestran las dos vistas (Centro de operaciones y Administración) igual que en una clínica real
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);
  if (real) return real.rol === "admin" ? <CambiarVista actual="centro" className="mb-3 px-3" /> : null;
  return montado ? <CambiarVista actual="centro" demo className="mb-3 px-3" /> : null;
}

function SidebarInner({ onNavigate }: { onNavigate?: (() => void) | undefined }) {
  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-sidebar text-sidebar-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(168,85,247,0.22),transparent_48%),radial-gradient(circle_at_100%_55%,rgba(236,72,153,0.10),transparent_42%),radial-gradient(circle_at_0%_100%,rgba(99,102,241,0.12),transparent_45%)]"
      />
      <div className="relative flex min-h-0 flex-1 flex-col">
        <div className="px-4 py-4">
          <Logo />
        </div>
        <EmpresaActiva />
        <VistaDelDueno />
        <NavList onNavigate={onNavigate} />
        <PlanFooter />
      </div>
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
    <header className="sticky top-0 z-30 flex items-center gap-2.5 bg-background/80 px-3 pb-2.5 pt-[max(0.6rem,env(safe-area-inset-top))] shadow-[0_10px_30px_-24px_rgba(124,58,237,0.6)] backdrop-blur-xl lg:hidden">
      <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/45 to-transparent" />
      <Sheet open={menu} onOpenChange={setMenu}>
        <SheetTrigger asChild>
          <button type="button" className="btn-icono-portal" aria-label="Abrir menú">
            <Menu />
          </button>
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
      <span className="max-[379px]:hidden">
        <Logo compact />
      </span>
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate font-display text-[15px] font-bold tracking-tight">{titulo}</p>
        <p className="truncate text-[9.5px] font-semibold uppercase tracking-[0.12em] text-primary/80">Panel de la clínica</p>
      </div>
      <CampanaMovil />
      <UsuarioMovil />
    </header>
  );
}

/* Campana del encabezado en el celular: avisos sin leer y acceso directo a Notificaciones. */
function CampanaMovil() {
  const { sinLeer } = useNotificaciones();
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);
  return (
    <Link
      to={"/demo/notificaciones" as never}
      aria-label={montado && sinLeer > 0 ? `Notificaciones: ${sinLeer} sin leer` : "Notificaciones"}
      className="relative grid size-9 shrink-0 place-items-center rounded-full bg-card text-muted-foreground shadow-sm ring-1 ring-primary/15 transition-colors hover:text-primary"
    >
      <Bell className="size-[18px]" />
      {montado && sinLeer > 0 && (
        <span className="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full bg-destructive px-1 text-[9px] font-bold leading-4 text-white ring-2 ring-background">
          {sinLeer > 9 ? "9+" : sinLeer}
        </span>
      )}
    </Link>
  );
}

/* Usuario de la sesión arriba a la derecha (como en la PC), compacto para el celular.
   Al tocarlo abre su menú: portales, configuración y salir. */
function UsuarioMovil() {
  const { usuario, clinica } = useSesion();
  const { plan, planContratado } = useCloudEsther();
  const real = useClinicaReal();
  const rolTexto = real ? (real.sesion.usuario.rolNombre || NOMBRE_ROL[real.rol]) : "Dueño/a";
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!abierto) return;
    const cerrar = (e: Event) => {
      // El diálogo de «Instalar app» se abre fuera del menú: tocarlo no lo cierra.
      if ((e.target as Element | null)?.closest?.("[role=dialog]")) return;
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener("pointerdown", cerrar);
    return () => document.removeEventListener("pointerdown", cerrar);
  }, [abierto]);
  const nombre = usuario?.nombre ?? "Invitado";
  const primerNombre = nombre.split(/\s+/)[0] ?? nombre;
  const items: { href: string; titulo: string; icon: typeof Users; enterprise?: boolean }[] = real
    ? [
        { href: "/demo/mi-cuenta", titulo: "Mi cuenta", icon: UserRound },
        ...(real.rol === "admin" ? [{ href: "/demo/accesos", titulo: "Accesos del equipo", icon: ShieldCheck }] : []),
      ]
    : [
        { href: "/portal", titulo: "Portal del paciente", icon: UserRound, enterprise: true },
        { href: "/equipo", titulo: "Portal del profesional", icon: Stethoscope, enterprise: true },
        { href: "/demo/configuracion", titulo: "Configuración", icon: Settings },
        { href: "/acceso-prueba", titulo: "Probar los 5 perfiles", icon: ShieldCheck },
      ];
  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        aria-haspopup="menu"
        aria-label={`Usuario: ${nombre}`}
        className="flex max-w-[7.5rem] items-center gap-1.5 rounded-full bg-card py-1 pl-1 pr-2 shadow-sm ring-1 ring-primary/15 min-[400px]:max-w-[9rem]"
      >
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-fuchsia-500 text-[10.5px] font-bold text-white">
          {iniciales(nombre)}
        </span>
        <span className="min-w-0 text-left leading-tight">
          <span className="block truncate text-[11.5px] font-semibold text-foreground">{primerNombre}</span>
          <span className="block truncate text-[9px] text-muted-foreground">{rolTexto}</span>
        </span>
      </button>
      {abierto && (
        <div
          role="menu"
          className="absolute right-0 top-11 z-50 w-64 overflow-hidden rounded-2xl border border-primary/15 bg-card text-foreground shadow-2xl"
        >
          <div className="bg-gradient-to-br from-primary via-violet-600 to-fuchsia-600 p-3 text-white">
            <p className="truncate font-display text-sm font-bold">{nombre}</p>
            <p className="truncate text-[11px] text-white/80">
              {clinica ? `${rolTexto} · ${clinica.nombre}` : rolTexto}
            </p>
          </div>
          <ul className="p-1.5">
            {items
              .filter((it) => !it.enterprise || plan === "grupo")
              .map((it) => (
                <li key={it.href}>
                  <a
                    role="menuitem"
                    href={it.href}
                    onClick={() => setAbierto(false)}
                    className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm hover:bg-primary/5"
                  >
                    <it.icon className="size-4 text-primary" />
                    {it.titulo}
                  </a>
                </li>
              ))}
            <li>
              <BotonInstalarApp className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm font-semibold text-primary hover:bg-primary/5" />
            </li>
            <li className="mt-1 border-t border-primary/10 pt-1">
              <Link
                role="menuitem"
                to={"/" as never}
                onClick={(e) => {
                  if (real) {
                    e.preventDefault();
                    salirYVolver();
                    return;
                  }
                  cerrarSesion();
                  if (vieneDeAccesoPrueba()) {
                    e.preventDefault();
                    volverSiEsPrueba();
                  }
                }}
                className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm text-destructive hover:bg-destructive/5"
              >
                <LogOut className="size-4" />
                {planContratado ? "Cerrar sesión" : "Salir del demo"}
              </Link>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}

/* Barra inferior en el celular: navegación tipo aplicación con los accesos más usados.
   «Más» abre el menú completo con todos los módulos del plan. */
function BarraInferior({ onMas }: { onMas: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const real = useClinicaReal();
  const { sinLeer } = useNotificaciones();
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);
  const items = [
    { to: "/demo", label: "Inicio", icon: LayoutDashboard },
    { to: "/demo/agenda", label: "Agenda", icon: CalendarDays },
    { to: "/demo/pacientes", label: "Pacientes", icon: Users },
    { to: "/demo/notificaciones", label: "Avisos", icon: Bell },
  ].filter(
    (it) =>
      !real || puedeVer(real.rol, MODULES.find((m) => m.path === it.to)?.id ?? "dashboard", real.sesion.usuario.modulos),
  );
  return (
    <nav
      aria-label="Accesos rápidos"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-primary/10 bg-background/90 pb-[env(safe-area-inset-bottom)] shadow-[0_-12px_30px_-22px_rgba(124,58,237,0.55)] backdrop-blur-xl lg:hidden"
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
                  activo && "bg-gradient-to-r from-primary to-fuchsia-500 text-white shadow-[0_8px_18px_-10px_rgba(124,58,237,0.9)]",
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
  const real = useClinicaReal();
  // Se puede sumar como adicional (no los exclusivos de Enterprise). En una clínica real, solo el
  // Administrador, y antes se le avisa al panel de Cloud Esther para facturarlo.
  const comprable = !!modulo && comprableEn(modulo, plan) && (!real || real.rol === "admin");
  const [comprar, setComprar] = useState(false);
  const confirmarCompra = async () => {
    if (!modulo) return;
    // Clínica real: primero se avisa al panel de Cloud Esther (para facturarlo)
    if (real) {
      try {
        await avisarModuloAdicional(real.slug, modulo.id, "agregar");
      } catch (e) {
        window.alert(e instanceof Error ? e.message : "No se pudo avisar a Cloud Esther. Probá de nuevo.");
        return;
      }
    }
    // Activa + registra (módulo, fecha, hora, usuario) + avisa a admin/socio/secretaría
    contratarModuloExtra(modulo.id, modulo.label, usuario?.nombre ?? "Administración");
    setComprar(false);
  };
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
            <button type="button" className="btn-ce" onClick={() => setComprar(true)}>
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
      <DialogoCompraModulo
        abierto={comprar}
        modulo={modulo ? { label: modulo.label, icon: modulo.icon } : null}
        planContratado={planContratado}
        onCerrar={() => setComprar(false)}
        onConfirmar={confirmarCompra}
      />
    </div>
  );
}

/* Clínica real: módulo sin acceso para el rol, o todavía sin guardar en el servidor */
function AvisoClinica({ titulo, texto, icono }: { titulo: string; texto: string; icono: string }) {
  return (
    <div className="grid min-h-[70vh] place-items-center p-6">
      <div className="relative w-full max-w-lg overflow-hidden rounded-[30px] border border-primary/15 bg-gradient-to-br from-white via-white/96 to-primary/[0.05] p-8 text-center shadow-[0_24px_60px_-38px_rgba(76,29,149,0.6)] sm:p-10 dark:from-card dark:via-card">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-primary/55 via-primary to-pink-400/60" />
        <div className="pointer-events-none absolute -right-20 -top-24 size-60 rounded-full bg-primary/[0.06] blur-2xl" />
        <span className="relative mx-auto grid size-16 place-items-center rounded-[22px] bg-gradient-to-br from-primary to-fuchsia-500 text-white shadow-[0_16px_34px_-14px_rgba(124,58,237,0.9)]">
          <span aria-hidden className="absolute inset-0 rounded-[22px] bg-primary/30 motion-safe:animate-ping [animation-duration:2.6s]" />
          <ModuleIcon name={icono} className="relative size-7" />
        </span>
        <p className="relative mt-6 font-display text-xl font-bold tracking-tight text-foreground">{titulo}</p>
        <p className="relative mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{texto}</p>
        <div className="relative mt-6">
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
  const real = useClinicaReal();
  const { sesion } = useSesion();
  if (real) ajustarCatalogosClinica(real.sesion.clinica.nombre);
  const [montadoShell, setMontadoShell] = useState(false);
  useEffect(() => setMontadoShell(true), []);
  // Clínica real: odontograma, radiografías y configuración llegan del servidor antes de mostrarse
  const almacenListo = useAlmacenClinicoListo();
  // Clínica real: si se cierra la pestaña con algo sin guardar todavía, el navegador avisa
  const esReal = !!real;
  useEffect(() => {
    if (!esReal) return;
    const avisar = (e: BeforeUnloadEvent) => {
      if (!hayCambiosSinGuardar()) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [esReal]);
  // Sesión de clínica real guardada, pero sin su llave (se cerró la pestaña): a ingresar de nuevo
  useEffect(() => {
    if (sesion?.tipo === "cliente" && !real) {
      const slug = slugDeSesionGuardada();
      window.location.assign(slug ? `/c/${slug}` : "/");
    }
  }, [sesion, real]);
  // Clínica real: rol y plan de AHORA (si el Administrador le cambió el rol, se ve al instante;
  // si la sesión venció, se borra y se vuelve a ingresar)
  const slugReal = real?.slug;
  useEffect(() => {
    if (slugReal) void refrescarSesionClinica(slugReal).catch(() => undefined);
  }, [slugReal, pathname]);
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
    // Una clínica real no manda nada al seguimiento del demo ni guarda auditoría en el navegador
    if (real) return;
    registrarModuloDemo(nombreModulo);
    // Auditoría de la clínica: actividad de la sesión y (si está activado) accesos a módulos.
    if (clinicId) registrarActividadAuditoria(clinicId, nombreModulo, auditarModulos);
  }, [nombreModulo, clinicId, auditarModulos, real]);

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
      {DEMO_EN_SERVIDOR && !real && <ControlSesionDemo />}
      {real && <Toaster position="top-right" richColors closeButton />}
      {real && (
        <AvisosChatGlobal onVer={(id) => window.location.assign(`/demo/comunicacion-interna#canal=${id}`)} />
      )}
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

      <div className="relative flex min-w-0 flex-1 flex-col">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[560px] bg-[radial-gradient(circle_at_12%_0%,rgba(124,58,237,0.14),transparent_45%),radial-gradient(circle_at_88%_6%,rgba(236,72,153,0.10),transparent_40%)]"
        />
        <MobileHeader
          sidebarStyle={sidebarStyle}
          menu={menuMovil}
          setMenu={setMenuMovil}
          titulo={
            modulo
              ? etiquetaModulo(modulo, plan)
              : pathname === "/demo/accesos"
                ? "Accesos del equipo"
                : pathname === "/demo/mi-cuenta"
                  ? "Mi cuenta"
                  : "Inicio"
          }
        />
        {/* En el celular se deja lugar para la barra inferior. */}
        {/* Hasta saber en el navegador si es una clínica real, el contenido no se muestra:
            así nunca aparece ni por un instante un dato de ejemplo en una clínica real. */}
        <main
          className="panel-clinica relative min-w-0 flex-1 pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-0"
          style={montadoShell ? undefined : { visibility: "hidden" }}
        >
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
          ) : real && modulo && !puedeVer(real.rol, modulo.id, real.sesion.usuario.modulos) ? (
            <AvisoClinica
              titulo="No tenés acceso a este módulo"
              texto="Lo maneja otra persona de tu clínica. Si lo necesitás, pedíselo al Administrador."
              icono={modulo.icon}
            />
          ) : real && !almacenListo ? (
            <div className="grid min-h-[50vh] place-items-center" role="status" aria-live="polite">
              <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
                <span className="size-10 animate-spin rounded-full border-[3px] border-primary/20 border-t-primary" />
                Trayendo los datos de tu clínica…
              </div>
            </div>
          ) : real && modulo && !moduloHabilitado(modulo.id) ? (
            <AvisoClinica
              titulo={`${etiquetaModulo(modulo, plan)} se está preparando para tu clínica`}
              texto="Estamos dejando este módulo listo para guardar los datos de tu clínica de forma segura. Te avisamos apenas esté disponible."
              icono={modulo.icon}
            />
          ) : (
            children
          )}
        </main>
      </div>
      <BarraInferior onMas={() => setMenuMovil(true)} />
      {/* Esther a mano en todos los módulos, solo en planes con IA (Plus y Enterprise). */}
      {iaDisponible &&
        !real &&
        !bloqueado &&
        !pathname.startsWith("/demo/ia") &&
        // El Odontograma 2D (Start y Pro) no lleva IA ni audio: eso es del 3D.
        modulo?.id !== "odontograma" &&
        // RRHH ya tiene su propia Esther (especializada en el equipo) en el mismo lugar.
        !pathname.startsWith("/demo/rrhh") && (
          <>
            <EstherBriefing
              moduloId={modulo?.id ?? "dashboard"}
              modulo={modulo?.label ?? "el inicio"}
            />
            <EstherFlotante
              moduloId={modulo?.id ?? "dashboard"}
              modulo={modulo?.label ?? "el inicio"}
            />
          </>
        )}
      {/* Ayuda de Esther (todos los planes): cómo usar cada pantalla, sin datos de pacientes.
          Donde ya está Esther Infinity (Plus y Enterprise en el demo) no se duplica el botón. */}
      {planListo &&
        (!iaDisponible || !!real) &&
        !bloqueado &&
        !pathname.startsWith("/demo/ia") &&
        !pathname.startsWith("/demo/rrhh") && (
          <AyudaEsther moduloId={modulo?.id ?? "dashboard"} modulo={modulo?.label ?? "el inicio"} />
        )}
    </div>
  );
}