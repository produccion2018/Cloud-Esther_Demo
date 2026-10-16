import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  Columns2,
  LogOut,
  Menu,
  Repeat,
  Moon,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { BrandMark } from "@/components/cloud-esther/AppShell";
import type { ModoLateral, PreferenciasPortal } from "./preferencias";
import { VERSION_APP } from "@/lib/version";
import { vieneDeAccesoPrueba } from "@/lib/acceso-prueba";
import { CambiarVista, type VistaDueno } from "@/components/clinica/cambiar-vista";
import { useMarca } from "@/lib/cloud-esther/marca";

/* Ubicación: src/components/cloud-esther/portales/PortalShell.tsx
   Marco común de los portales del Plan 4 (paciente, profesional y administrativo), con el ADN
   visual de Cloud Esther: violeta, tarjetas redondeadas y gradientes suaves.
   - Menú lateral con 3 modos: expandido, compacto (solo íconos) y oculto.
   - Modo oscuro propio del portal.
   - Encabezado con título, notificaciones universales y acciones.
   - En el celular: barra inferior tipo app (4 accesos + «Más») y menú completo en hoja. */

export type ItemPortal = {
  id: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
};

export type GrupoPortal = { titulo: string; items: ItemPortal[] };

const MODOS: { id: ModoLateral; label: string; icon: LucideIcon }[] = [
  { id: "expandido", label: "Menú expandido", icon: PanelLeftOpen },
  { id: "compacto", label: "Solo íconos", icon: Columns2 },
  { id: "oculto", label: "Menú oculto", icon: PanelLeftClose },
];

export function PortalShell({
  portal,
  clinica,
  usuario,
  grupos,
  activo,
  onIr,
  titulo,
  subtitulo,
  acciones,
  prefs,
  onPrefs,
  onSalir,
  salirLabel = "Cerrar sesión",
  aviso,
  principales,
  vistaDueno,
  vistaDuenoDemo,
  children,
}: {
  portal: string;
  clinica: string;
  usuario: { nombre: string; detalle: string; iniciales: string };
  grupos: GrupoPortal[];
  activo: string;
  onIr: (id: string) => void;
  titulo: string;
  subtitulo?: string;
  /** Botones del encabezado (ej.: campana de notificaciones). */
  acciones?: ReactNode;
  prefs: PreferenciasPortal;
  onPrefs: (p: Partial<PreferenciasPortal>) => void;
  onSalir: () => void;
  salirLabel?: string;
  /** Banda superior opcional (ej.: vista previa del equipo). */
  aviso?: ReactNode;
  /** Ids que van en la barra inferior del celular (máx. 4). */
  principales?: string[];
  /** Clínica real, Administrador: selector entre Centro de operaciones y Administración. */
  vistaDueno?: VistaDueno | undefined;
  /** Demo: la Administración del Dueño/a con los datos de ejemplo */
  vistaDuenoDemo?: boolean | undefined;
  children: ReactNode;
}) {
  const [deAccesoPrueba, setDeAccesoPrueba] = useState(false);
  // Marca propia (Plus y Enterprise): logo y nombre de la clínica en lugar de Cloud Esther
  const m = useMarca();
  const conMarca = m.activa && (portal !== "Portal del paciente" || m.marca.enPortal);
  useEffect(() => setDeAccesoPrueba(vieneDeAccesoPrueba()), []);
  const [hoja, setHoja] = useState(false);
  const [menuVista, setMenuVista] = useState(false);
  const vistaRef = useRef<HTMLDivElement>(null);
  const todos = grupos.flatMap((g) => g.items);
  const barra = (principales ?? todos.slice(0, 4).map((i) => i.id))
    .map((id) => todos.find((i) => i.id === id))
    .filter((i): i is ItemPortal => !!i)
    .slice(0, 4);
  const compacto = prefs.lateral === "compacto";

  useEffect(() => {
    if (!menuVista) return;
    const cerrar = (e: MouseEvent) => {
      if (vistaRef.current && !vistaRef.current.contains(e.target as Node)) setMenuVista(false);
    };
    document.addEventListener("mousedown", cerrar);
    return () => document.removeEventListener("mousedown", cerrar);
  }, [menuVista]);

  const ir = (id: string) => {
    onIr(id);
    setHoja(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const navegacion = (modoCompacto: boolean) => (
    <nav className="flex-1 space-y-4 overflow-y-auto px-3 pb-4" aria-label={portal}>
      {grupos.map((g) => (
        <div key={g.titulo}>
          {!modoCompacto && (
            <p className="flex items-center gap-2 px-2 pb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-sidebar-foreground/45">
              <span className="h-1 w-3 rounded-full bg-gradient-to-r from-primary to-fuchsia-500" />
              {g.titulo}
            </p>
          )}
          <ul className="space-y-0.5">
            {g.items.map((it) => {
              const on = it.id === activo;
              return (
                <li key={it.id}>
                  <button
                    type="button"
                    onClick={() => ir(it.id)}
                    title={modoCompacto ? it.label : undefined}
                    aria-current={on ? "page" : undefined}
                    className={`group relative flex w-full items-center gap-3 rounded-xl text-left text-[13px] font-medium transition-all ${
                      modoCompacto ? "justify-center px-0 py-2.5" : "px-2.5 py-2"
                    } ${
                      on
                        ? "bg-gradient-to-r from-primary via-violet-500 to-fuchsia-500 text-white shadow-[0_14px_28px_-14px_rgba(124,58,237,0.95),inset_0_1px_0_rgba(255,255,255,0.28)] ring-1 ring-white/15"
                        : "text-sidebar-foreground/75 hover:translate-x-0.5 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    }`}
                  >
                    {on && !modoCompacto && (
                      <span
                        aria-hidden
                        className="absolute -left-3 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-primary to-fuchsia-500 shadow-[0_0_12px_rgba(217,70,239,0.9)]"
                      />
                    )}
                    <span
                      className={`grid size-8 shrink-0 place-items-center rounded-lg transition ${
                        on
                          ? "bg-white/20 shadow-inner"
                          : "bg-sidebar-accent/60 text-primary group-hover:bg-gradient-to-br group-hover:from-primary group-hover:to-fuchsia-500 group-hover:text-white"
                      }`}
                    >
                      <it.icon className="size-4" />
                    </span>
                    {!modoCompacto && <span className="min-w-0 flex-1 truncate">{it.label}</span>}
                    {!!it.badge && (
                      <span
                        className={`grid min-w-5 place-items-center rounded-full px-1.5 text-[10px] font-bold ${
                          modoCompacto ? "absolute right-1 top-1" : ""
                        } ${on ? "bg-white/25 text-white" : "bg-primary text-primary-foreground"}`}
                      >
                        {it.badge > 99 ? "99+" : it.badge}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  const lateral = (modoCompacto: boolean) => (
    <div className="relative flex h-full flex-col overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(168,85,247,0.26),transparent_48%),radial-gradient(circle_at_100%_55%,rgba(236,72,153,0.12),transparent_42%),radial-gradient(circle_at_0%_100%,rgba(99,102,241,0.14),transparent_45%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-primary/40 via-fuchsia-500/25 to-transparent"
      />
      <div className={`relative pb-4 pt-5 ${modoCompacto ? "px-3" : "px-5"}`}>
        <div className={`flex items-center gap-2.5 ${modoCompacto ? "justify-center" : ""}`}>
          <span className="relative shrink-0">
            <span
              aria-hidden
              className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-primary to-fuchsia-500 opacity-40 blur-md"
            />
            {conMarca ? (
              <img src={m.marca.logo} alt={clinica} className="relative size-9 rounded-xl bg-white object-contain p-1 shadow-sm" />
            ) : (
              <BrandMark className="relative size-9" />
            )}
          </span>
          {!modoCompacto && (
            <span className="min-w-0 leading-tight">
              <span className="block truncate font-display text-[15px] font-semibold tracking-tight text-sidebar-foreground">
                {conMarca ? m.nombre || clinica : "Cloud Esther"}
              </span>
              <span className="block text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/50">
                {portal}
              </span>
            </span>
          )}
        </div>
        {!modoCompacto && (
          <div
            className="relative mt-4 overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-violet-600 to-fuchsia-600 p-3 text-white shadow-[0_14px_30px_-18px_rgba(124,58,237,0.95)]"
            style={conMarca ? { background: `linear-gradient(135deg, ${m.marca.color}, ${m.marca.color}bb)` } : undefined}
          >
            <span
              aria-hidden
              className="pointer-events-none absolute -right-6 -top-8 size-20 rounded-full bg-white/15 blur-xl"
            />
            <p className="relative text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
              Clínica
            </p>
            <p className="relative truncate text-[13px] font-bold">{clinica}</p>
            <p className="relative mt-1 inline-flex items-center gap-1.5 text-[10.5px] font-semibold text-white/80">
              <span className="size-1.5 rounded-full bg-[#6ee7b7] shadow-[0_0_8px_rgba(110,231,183,0.9)]" />
              Conectado
            </p>
          </div>
        )}
      </div>
      {vistaDueno && (
        <CambiarVista
          actual={vistaDueno}
          demo={!!vistaDuenoDemo}
          compacto={modoCompacto}
          className={`relative mb-3 ${modoCompacto ? "px-3" : "px-4"}`}
        />
      )}
      <div className="relative flex min-h-0 flex-1 flex-col">{navegacion(modoCompacto)}</div>
      <div
        className={`relative space-y-2 border-t border-sidebar-border ${modoCompacto ? "p-2" : "p-3"}`}
      >
        {!modoCompacto && (
          <div className="flex items-center gap-2.5 rounded-2xl bg-sidebar-accent/50 p-2.5">
            <span className="relative grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-fuchsia-500 text-xs font-bold text-white ring-2 ring-white/70 ring-offset-2 ring-offset-sidebar">
              {usuario.iniciales}
              <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-[#22c55e] ring-2 ring-sidebar" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-semibold text-sidebar-foreground">
                {usuario.nombre}
              </span>
              <span className="block truncate text-[11px] text-sidebar-foreground/55">
                {usuario.detalle}
              </span>
            </span>
          </div>
        )}
        <button
          type="button"
          onClick={onSalir}
          title={modoCompacto ? salirLabel : undefined}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-sidebar-border px-3 py-2 text-xs text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          <LogOut className="size-3.5" />
          {!modoCompacto && salirLabel}
        </button>
        {deAccesoPrueba && (
          <a
            href="/acceso-prueba"
            title={modoCompacto ? "Cambiar de portal" : undefined}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary/10 to-fuchsia-500/10 px-3 py-2 text-xs font-semibold text-primary transition hover:from-primary/20 hover:to-fuchsia-500/20"
          >
            <Repeat className="size-3.5" />
            {!modoCompacto && "Cambiar de portal"}
          </a>
        )}
        {!modoCompacto && (
          <p className="mt-2 text-center text-[10px] text-sidebar-foreground/45">
            Versión {VERSION_APP}
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {prefs.lateral !== "oculto" && (
        <aside
          className={`hidden shrink-0 self-stretch border-r border-sidebar-border bg-sidebar transition-[width] duration-200 lg:block ${
            compacto ? "w-[84px]" : "w-[272px]"
          }`}
        >
          <div className="sticky top-0 h-screen">{lateral(compacto)}</div>
        </aside>
      )}

      {hoja && (
        <div
          className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px]"
          onClick={() => setHoja(false)}
        >
          <aside
            className="h-full w-[290px] max-w-[85vw] bg-sidebar shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Cerrar menú"
              onClick={() => setHoja(false)}
              className="absolute left-[calc(min(290px,85vw)-2.75rem)] top-4 z-10 grid size-8 place-items-center rounded-full bg-sidebar-accent text-sidebar-foreground"
            >
              <X className="size-4" />
            </button>
            {lateral(false)}
          </aside>
        </div>
      )}

      <div className="relative flex min-w-0 flex-1 flex-col">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[560px] bg-[radial-gradient(circle_at_12%_0%,rgba(124,58,237,0.18),transparent_45%),radial-gradient(circle_at_88%_6%,rgba(236,72,153,0.12),transparent_40%),radial-gradient(circle_at_50%_40%,rgba(99,102,241,0.06),transparent_50%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none fixed bottom-0 right-0 h-[420px] w-[520px] bg-[radial-gradient(circle_at_100%_100%,rgba(217,70,239,0.10),transparent_60%)]"
        />
        <header className="sticky top-0 z-30 bg-background/75 pt-[env(safe-area-inset-top)] shadow-[0_10px_30px_-24px_rgba(124,58,237,0.6)] backdrop-blur-xl">
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/45 to-transparent"
          />
          <div className="mx-auto flex w-full max-w-[1320px] items-center gap-2.5 px-4 py-2.5 md:px-6 lg:px-8">
            <button
              type="button"
              aria-label="Abrir menú"
              onClick={() => setHoja(true)}
              className={`btn-icono-portal ${prefs.lateral === "oculto" ? "" : "lg:hidden"}`}
            >
              <Menu className="size-[18px]" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-base font-bold tracking-tight sm:text-lg">
                {titulo}
              </p>
              {subtitulo && (
                <p className="hidden truncate text-xs text-muted-foreground sm:block">
                  {subtitulo}
                </p>
              )}
            </div>
            {acciones}
            <button
              type="button"
              onClick={() => onPrefs({ oscuro: !prefs.oscuro })}
              aria-label={prefs.oscuro ? "Usar modo claro" : "Usar modo oscuro"}
              className="btn-icono-portal"
            >
              {prefs.oscuro ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
            </button>
            <div ref={vistaRef} className="relative hidden lg:block">
              <button
                type="button"
                onClick={() => setMenuVista((v) => !v)}
                aria-label="Modo del menú lateral"
                aria-expanded={menuVista}
                className="btn-icono-portal"
              >
                <Columns2 className="size-[18px]" />
              </button>
              {menuVista && (
                <div className="absolute right-0 top-12 z-40 w-52 overflow-hidden rounded-2xl border border-primary/15 bg-card p-1.5 shadow-xl">
                  <p className="px-2.5 pb-1 pt-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    Menú lateral
                  </p>
                  {MODOS.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        onPrefs({ lateral: m.id });
                        setMenuVista(false);
                      }}
                      className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm transition ${
                        prefs.lateral === m.id
                          ? "bg-primary/10 font-semibold text-primary"
                          : "hover:bg-muted"
                      }`}
                    >
                      <m.icon className="size-4" />
                      {m.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="relative mx-auto w-full max-w-[1320px] flex-1 px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-4 md:px-6 lg:px-8 lg:pb-10 lg:pt-6">
          {aviso}
          {children}
        </main>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 grid border-t border-primary/10 bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
        style={{ gridTemplateColumns: `repeat(${barra.length + 1}, minmax(0, 1fr))` }}
        aria-label="Accesos rápidos"
      >
        {barra.map((it) => {
          const on = it.id === activo;
          return (
            <button
              key={it.id}
              type="button"
              onClick={() => ir(it.id)}
              className={`relative flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold ${
                on ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {on && <span className="absolute inset-x-5 top-0 h-0.5 rounded-full bg-primary" />}
              <span
                className={`grid h-7 w-12 place-items-center rounded-full ${on ? "bg-primary/12" : ""}`}
              >
                <it.icon className="size-5" />
              </span>
              <span className="max-w-full truncate px-1">{it.label}</span>
              {!!it.badge && (
                <span className="absolute right-[18%] top-1 grid min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
                  {it.badge > 9 ? "9+" : it.badge}
                </span>
              )}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setHoja(true)}
          className="flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold text-muted-foreground"
        >
          <span className="grid h-7 w-12 place-items-center rounded-full">
            <MoreHorizontal className="size-5" />
          </span>
          Más
        </button>
      </nav>
    </div>
  );
}

/* ───────────── Piezas visuales compartidas (ADN Cloud Esther) ───────────── */

export function HeroPortal({
  saludo,
  titulo,
  detalle,
  children,
}: {
  saludo: string;
  titulo: string;
  detalle?: string;
  children?: ReactNode;
}) {
  return (
    <section className="ce-portal-entrar relative overflow-hidden rounded-[30px] bg-gradient-to-br from-white/50 via-fuchsia-300/40 to-violet-400/40 p-px shadow-[0_34px_80px_-42px_rgba(91,33,182,0.95)]">
      <div className="relative overflow-hidden rounded-[29px] bg-[linear-gradient(118deg,#3b0764_0%,#5b21b6_24%,#7c3aed_48%,#a21caf_78%,#db2777_100%)] p-5 text-white sm:p-7">
        <div
          aria-hidden
          className="ce-portal-orbe pointer-events-none absolute -right-16 -top-24 size-72 rounded-full bg-fuchsia-300/35 blur-3xl"
        />
        <div
          aria-hidden
          className="ce-portal-orbe pointer-events-none absolute -bottom-32 left-1/4 size-80 rounded-full bg-indigo-400/30 blur-3xl [animation-delay:-4s]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.2)_1px,transparent_1px)] [background-size:16px_16px] [mask-image:linear-gradient(100deg,transparent_40%,black_85%)]"
        />
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="ce-portal-brillo absolute inset-y-0 -left-1/3 w-1/4 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
        </div>
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent"
        />
        <p className="relative inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-white/75">
          <span className="size-1.5 rounded-full bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.95)]" />
          {saludo}
        </p>
        <h1 className="relative mt-1.5 font-display text-[28px] font-bold leading-tight tracking-[-0.02em] drop-shadow-[0_2px_12px_rgba(40,0,80,0.35)] sm:text-[34px]">
          {titulo}
        </h1>
        {detalle && <p className="relative mt-1.5 max-w-2xl text-sm leading-relaxed text-white/85">{detalle}</p>}
        {children && <div className="relative mt-5">{children}</div>}
      </div>
    </section>
  );
}

/** Fecha de hoy para los encabezados («Jueves 15 de octubre»). */
function fechaHoyLarga() {
  const t = new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Encabezado premium de cada sección: degradé profundo con orbes, trama de puntos, brillo que
    cruza, ícono en vidrio con halo, ruta (área › sección), fecha de hoy y acciones opcionales. */
export function EncabezadoSeccion({
  area,
  titulo,
  detalle,
  icon: Icon,
  acciones,
}: {
  area: string;
  titulo: string;
  detalle?: string | undefined;
  icon?: LucideIcon | undefined;
  /** Botones o datos a la derecha (ej.: «Exportar»). */
  acciones?: ReactNode;
}) {
  return (
    <section className="ce-portal-entrar relative mb-6 overflow-hidden rounded-[28px] bg-gradient-to-br from-white/50 via-fuchsia-300/40 to-violet-400/40 p-px shadow-[0_32px_70px_-42px_rgba(91,33,182,0.95)]">
      <div className="relative overflow-hidden rounded-[27px] bg-[linear-gradient(118deg,#4c1d95_0%,#6d28d9_28%,#7c3aed_48%,#a21caf_78%,#db2777_100%)] px-5 py-5 text-white sm:px-7 sm:py-6">
        <div
          aria-hidden
          className="ce-portal-orbe pointer-events-none absolute -right-14 -top-20 size-64 rounded-full bg-fuchsia-300/35 blur-3xl"
        />
        <div
          aria-hidden
          className="ce-portal-orbe pointer-events-none absolute -bottom-28 left-[22%] size-72 rounded-full bg-indigo-400/30 blur-3xl [animation-delay:-4s]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.22)_1px,transparent_1px)] [background-size:16px_16px] [mask-image:linear-gradient(100deg,transparent_35%,black_80%)]"
        />
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="ce-portal-brillo absolute inset-y-0 -left-1/3 w-1/4 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
        </div>
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent"
        />
        <div className="relative flex flex-wrap items-center gap-4">
          {Icon && (
            <span className="relative shrink-0">
              <span aria-hidden className="absolute -inset-2 rounded-[22px] bg-white/25 blur-lg" />
              <span className="relative grid size-14 place-items-center rounded-[20px] border border-white/35 bg-gradient-to-br from-white/35 to-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_14px_30px_-14px_rgba(30,0,60,0.8)] backdrop-blur-md">
                <Icon className="size-6 drop-shadow-[0_2px_6px_rgba(40,0,80,0.45)]" />
              </span>
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.2em] text-white/70">
              <span>Administración</span>
              {area && area !== "Administración" && (
                <>
                  <span aria-hidden className="text-white/40">›</span>
                  <span className="text-white/90">{area}</span>
                </>
              )}
            </p>
            <h1 className="mt-0.5 truncate font-display text-[26px] font-bold leading-tight tracking-[-0.02em] drop-shadow-[0_2px_10px_rgba(40,0,80,0.35)] sm:text-[30px]">
              {titulo}
            </h1>
            {detalle && <p className="mt-1 max-w-2xl text-sm leading-relaxed text-white/85">{detalle}</p>}
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <span className="hidden items-center gap-2 rounded-full border border-white/25 bg-white/12 px-3.5 py-1.5 text-xs font-semibold text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.3)] backdrop-blur-md md:inline-flex">
              <span className="size-1.5 rounded-full bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.95)]" />
              {fechaHoyLarga()}
            </span>
            {acciones}
          </div>
        </div>
      </div>
    </section>
  );
}

const TONOS_KPI = {
  violeta: { grad: "from-primary to-fuchsia-500", sombra: "rgba(124,58,237,0.55)", tinte: "from-violet-500/[0.07]" },
  verde: { grad: "from-emerald-500 to-teal-500", sombra: "rgba(16,185,129,0.5)", tinte: "from-emerald-500/[0.07]" },
  ambar: { grad: "from-amber-500 to-orange-500", sombra: "rgba(245,158,11,0.5)", tinte: "from-amber-500/[0.08]" },
  rosa: { grad: "from-rose-500 to-pink-500", sombra: "rgba(244,63,94,0.5)", tinte: "from-rose-500/[0.07]" },
  azul: { grad: "from-sky-500 to-indigo-500", sombra: "rgba(14,165,233,0.5)", tinte: "from-sky-500/[0.07]" },
} as const;

export type TonoPortal = keyof typeof TONOS_KPI;

export function KpiPortal({
  titulo,
  valor,
  detalle,
  icon: Icon,
  tono = "violeta",
  onClick,
  progreso,
}: {
  titulo: string;
  valor: string;
  detalle?: string;
  icon: LucideIcon;
  tono?: TonoPortal;
  onClick?: (() => void) | undefined;
  /** 0 a 100: barra fina de avance debajo de la cifra. */
  progreso?: number | undefined;
}) {
  const t = TONOS_KPI[tono];
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      {...(onClick ? { type: "button" as const, onClick } : {})}
      className={`ce-portal-entrar group relative flex flex-col overflow-hidden rounded-3xl border border-primary/10 bg-gradient-to-br ${t.tinte} via-card to-card p-4 text-left shadow-[0_18px_40px_-30px_rgba(76,29,149,0.6),inset_0_1px_0_rgba(255,255,255,0.7)] transition duration-300 hover:-translate-y-1 hover:border-primary/25 hover:shadow-[0_26px_50px_-28px_rgba(76,29,149,0.7)] dark:shadow-none`}
    >
      <span
        aria-hidden
        className={`pointer-events-none absolute -right-12 -top-14 size-36 rounded-full bg-gradient-to-br ${t.grad} opacity-[0.14] blur-2xl transition duration-500 group-hover:scale-125 group-hover:opacity-25`}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -right-6 -top-6 size-24 rounded-full border border-primary/10"
      />
      <div className="relative flex items-start justify-between gap-2">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.13em] text-muted-foreground">
          {titulo}
        </p>
        <span
          className={`grid size-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${t.grad} text-white ring-4 ring-white/60 transition duration-300 group-hover:rotate-[-6deg] group-hover:scale-110 dark:ring-white/5`}
          style={{ boxShadow: `0 10px 22px -10px ${t.sombra}` }}
        >
          <Icon className="size-[18px]" />
        </span>
      </div>
      <p className="relative mt-1.5 truncate font-display text-[28px] font-bold leading-none tabular-nums tracking-[-0.02em]">
        {valor}
      </p>
      {progreso !== undefined && (
        <span className="relative mt-3 block h-1.5 overflow-hidden rounded-full bg-muted">
          <span
            className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${t.grad}`}
            style={{ width: `${Math.max(0, Math.min(100, progreso))}%` }}
          />
        </span>
      )}
      {detalle && <p className="relative mt-2 truncate text-xs text-muted-foreground">{detalle}</p>}
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-x-5 bottom-0 h-[3px] rounded-t-full bg-gradient-to-r ${t.grad} opacity-60 transition group-hover:inset-x-0 group-hover:opacity-90`}
      />
    </Tag>
  );
}

export function TarjetaPortal({
  titulo,
  detalle,
  icon: Icon,
  acciones,
  children,
  className = "",
}: {
  titulo?: string;
  detalle?: string;
  icon?: LucideIcon;
  acciones?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`ce-portal-entrar relative overflow-hidden rounded-[26px] border border-transparent p-4 shadow-[0_22px_50px_-36px_rgba(76,29,149,0.65)] [background:linear-gradient(var(--card),var(--card))_padding-box,linear-gradient(140deg,rgba(124,58,237,0.32),rgba(217,70,239,0.14)_45%,rgba(124,58,237,0.06))_border-box] sm:p-5 ${className}`}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -right-20 -top-24 size-56 rounded-full bg-gradient-to-br from-primary/10 to-fuchsia-400/10 blur-3xl"
      />
      {(titulo || acciones) && (
        <div className="relative mb-4 flex flex-wrap items-center justify-between gap-2 pb-3.5">
          <div className="flex min-w-0 items-center gap-3">
            {Icon && (
              <span className="relative grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary via-violet-500 to-fuchsia-500 text-white shadow-[0_12px_24px_-12px_rgba(124,58,237,0.95),inset_0_1px_0_rgba(255,255,255,0.35)]">
                <Icon className="size-[19px]" />
              </span>
            )}
            <div className="min-w-0">
              {titulo && (
                <h2 className="truncate font-display text-base font-bold tracking-[-0.01em]">
                  {titulo}
                </h2>
              )}
              {detalle && <p className="truncate text-xs text-muted-foreground">{detalle}</p>}
            </div>
          </div>
          {acciones}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-primary/25 via-fuchsia-400/15 to-transparent"
          />
        </div>
      )}
      <div className="relative">{children}</div>
    </section>
  );
}

export function PestanasPortal<T extends string>({
  valor,
  opciones,
  onCambiar,
}: {
  valor: T;
  opciones: { id: T; label: string; cantidad?: number }[];
  onCambiar: (v: T) => void;
}) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0">
      <div
        className="inline-flex min-w-max gap-1 rounded-2xl border border-primary/10 bg-card/80 p-1 shadow-[inset_0_1px_3px_rgba(76,29,149,0.08),0_10px_26px_-22px_rgba(76,29,149,0.6)] backdrop-blur-md"
        role="tablist"
      >
        {opciones.map((o) => {
          const on = valor === o.id;
          return (
            <button
              key={o.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => onCambiar(o.id)}
              className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-xl px-3.5 text-[13px] font-semibold transition-all duration-300 ${
                on
                  ? "bg-gradient-to-r from-primary via-violet-500 to-fuchsia-500 text-white shadow-[0_10px_22px_-12px_rgba(124,58,237,0.95),inset_0_1px_0_rgba(255,255,255,0.3)]"
                  : "text-muted-foreground hover:bg-primary/[0.06] hover:text-foreground"
              }`}
            >
              {o.label}
              {o.cantidad !== undefined && (
                <span
                  className={`grid min-w-5 place-items-center rounded-full px-1.5 text-[10px] font-bold tabular-nums ${
                    on ? "bg-white/25" : "bg-primary/10 text-primary"
                  }`}
                >
                  {o.cantidad}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Estado vacío premium: ícono en un orbe con halo, título, texto y acción opcional. */
export function VacioPortal({
  icon: Icon,
  titulo,
  texto,
  accion,
  compacto = false,
}: {
  icon: LucideIcon;
  titulo: string;
  texto?: string;
  accion?: ReactNode;
  compacto?: boolean;
}) {
  return (
    <div className={`flex flex-col items-center text-center ${compacto ? "py-5" : "py-9"}`}>
      <span className="relative">
        <span aria-hidden className="ce-esther-halo absolute -inset-3 rounded-full bg-gradient-to-br from-primary/25 to-fuchsia-400/25 blur-xl" />
        <span
          aria-hidden
          className="absolute -inset-2 rounded-full border border-dashed border-primary/25"
        />
        <span
          className={`relative grid place-items-center rounded-full bg-gradient-to-br from-primary/15 via-fuchsia-500/10 to-transparent text-primary ring-1 ring-primary/15 ${compacto ? "size-12" : "size-16"}`}
        >
          <Icon className={compacto ? "size-5" : "size-7"} />
        </span>
      </span>
      <p className={`font-display font-bold tracking-tight ${compacto ? "mt-3 text-sm" : "mt-4 text-base"}`}>
        {titulo}
      </p>
      {texto && <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">{texto}</p>}
      {accion && <div className="mt-4">{accion}</div>}
    </div>
  );
}

const AVATAR_TONOS = [
  "from-violet-500 to-fuchsia-500",
  "from-sky-500 to-indigo-500",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
  "from-rose-500 to-pink-500",
  "from-indigo-500 to-violet-600",
];

/** Avatar con iniciales y degradé estable según el nombre (siempre el mismo color por persona). */
export function AvatarPortal({
  nombre,
  tam = "md",
  className = "",
}: {
  nombre: string;
  tam?: "sm" | "md" | "lg";
  className?: string;
}) {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  const ini = `${partes[0]?.[0] ?? ""}${partes[1]?.[0] ?? ""}`.toUpperCase() || "?";
  let h = 0;
  for (const c of nombre) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const tono = AVATAR_TONOS[h % AVATAR_TONOS.length];
  const caja = { sm: "size-8 text-[11px] rounded-xl", md: "size-11 text-sm rounded-2xl", lg: "size-14 text-base rounded-[20px]" }[tam];
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center bg-gradient-to-br ${tono} font-bold text-white shadow-[0_10px_20px_-12px_rgba(76,29,149,0.9),inset_0_1px_0_rgba(255,255,255,0.35)] ${caja} ${className}`}
    >
      {ini}
    </span>
  );
}

/** Selector de fecha / mes con etiqueta en píldora (filtros de período de las secciones). */
export function FiltroPeriodo({
  label,
  tipo = "date",
  valor,
  onCambiar,
  icon: Icon,
}: {
  label: string;
  tipo?: "date" | "month";
  valor: string;
  onCambiar: (v: string) => void;
  icon: LucideIcon;
}) {
  return (
    <label className="inline-flex items-center gap-2 rounded-2xl border border-primary/12 bg-card/90 py-1 pl-1 pr-2 shadow-[0_10px_26px_-22px_rgba(76,29,149,0.6)] backdrop-blur">
      <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-fuchsia-500 text-white">
        <Icon className="size-4" />
      </span>
      <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{label}</span>
      <input
        type={tipo}
        value={valor}
        onChange={(e) => e.target.value && onCambiar(e.target.value)}
        className="h-9 rounded-lg bg-transparent px-1.5 text-sm font-semibold tabular-nums outline-none focus:ring-2 focus:ring-primary/30"
      />
    </label>
  );
}
