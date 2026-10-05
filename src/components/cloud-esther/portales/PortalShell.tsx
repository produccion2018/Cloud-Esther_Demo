import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  Columns2,
  LogOut,
  Menu,
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
  children: ReactNode;
}) {
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
            <p className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-sidebar-foreground/40">
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
                        ? "bg-gradient-to-r from-primary to-fuchsia-500 text-white shadow-[0_10px_24px_-14px_rgba(124,58,237,0.9)]"
                        : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    }`}
                  >
                    <span
                      className={`grid size-8 shrink-0 place-items-center rounded-lg transition ${
                        on ? "bg-white/20" : "bg-sidebar-accent/60 group-hover:bg-sidebar-accent"
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
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(168,85,247,0.18),transparent_45%),radial-gradient(circle_at_100%_100%,rgba(236,72,153,0.10),transparent_40%)]"
      />
      <div className={`relative pb-4 pt-5 ${modoCompacto ? "px-3" : "px-5"}`}>
        <div className={`flex items-center gap-2.5 ${modoCompacto ? "justify-center" : ""}`}>
          <BrandMark className="size-9 shrink-0" />
          {!modoCompacto && (
            <span className="leading-tight">
              <span className="block font-display text-[15px] font-semibold tracking-tight text-sidebar-foreground">
                Cloud Esther
              </span>
              <span className="block text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/50">
                {portal}
              </span>
            </span>
          )}
        </div>
        {!modoCompacto && (
          <div className="mt-4 rounded-2xl border border-sidebar-border bg-sidebar-accent/40 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/45">
              Clínica
            </p>
            <p className="truncate text-[13px] font-semibold text-sidebar-foreground">{clinica}</p>
          </div>
        )}
      </div>
      <div className="relative flex min-h-0 flex-1 flex-col">{navegacion(modoCompacto)}</div>
      <div
        className={`relative space-y-2 border-t border-sidebar-border ${modoCompacto ? "p-2" : "p-3"}`}
      >
        {!modoCompacto && (
          <div className="flex items-center gap-2.5 rounded-2xl bg-sidebar-accent/50 p-2.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-fuchsia-500 text-xs font-bold text-white">
              {usuario.iniciales}
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
          className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(circle_at_12%_0%,rgba(124,58,237,0.13),transparent_42%),radial-gradient(circle_at_88%_8%,rgba(236,72,153,0.08),transparent_38%)]"
        />
        <header className="sticky top-0 z-30 border-b border-primary/10 bg-background/80 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-[1320px] items-center gap-2.5 px-4 py-2.5 md:px-6 lg:px-8">
            <button
              type="button"
              aria-label="Abrir menú"
              onClick={() => setHoja(true)}
              className={`grid size-10 shrink-0 place-items-center rounded-full border border-primary/15 bg-card ${
                prefs.lateral === "oculto" ? "" : "lg:hidden"
              }`}
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
              className="grid size-10 shrink-0 place-items-center rounded-full border border-primary/15 bg-card shadow-sm transition hover:border-primary/35"
            >
              {prefs.oscuro ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
            </button>
            <div ref={vistaRef} className="relative hidden lg:block">
              <button
                type="button"
                onClick={() => setMenuVista((v) => !v)}
                aria-label="Modo del menú lateral"
                aria-expanded={menuVista}
                className="grid size-10 place-items-center rounded-full border border-primary/15 bg-card shadow-sm transition hover:border-primary/35"
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
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-primary/10 bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
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
    <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-primary via-violet-600 to-fuchsia-600 p-5 text-white shadow-[0_24px_60px_-30px_rgba(124,58,237,0.75)] sm:p-7">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-white/10 blur-2xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 left-1/3 size-72 rounded-full bg-fuchsia-300/20 blur-3xl"
      />
      <p className="relative text-xs font-semibold uppercase tracking-[0.18em] text-white/75">
        {saludo}
      </p>
      <h1 className="relative mt-1 font-display text-2xl font-bold tracking-tight sm:text-3xl">
        {titulo}
      </h1>
      {detalle && <p className="relative mt-1.5 max-w-2xl text-sm text-white/85">{detalle}</p>}
      {children && <div className="relative mt-4">{children}</div>}
    </section>
  );
}

/** Encabezado con degradé para cada sección (versión compacta del héroe). */
export function EncabezadoSeccion({
  area,
  titulo,
  detalle,
  icon: Icon,
}: {
  area: string;
  titulo: string;
  detalle?: string | undefined;
  icon?: LucideIcon | undefined;
}) {
  return (
    <section className="relative mb-5 overflow-hidden rounded-[26px] bg-gradient-to-r from-primary via-violet-600 to-fuchsia-600 px-5 py-4 text-white shadow-[0_20px_50px_-30px_rgba(124,58,237,0.8)] sm:px-6 sm:py-5">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-16 size-48 rounded-full bg-white/10 blur-2xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-20 right-1/3 size-56 rounded-full bg-fuchsia-300/20 blur-3xl"
      />
      <div className="relative flex items-center gap-3.5">
        {Icon && (
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl border border-white/25 bg-white/15 shadow-inner backdrop-blur-md">
            <Icon className="size-[22px]" />
          </span>
        )}
        <div className="min-w-0">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-white/75">
            {area}
          </p>
          <h1 className="truncate font-display text-xl font-bold tracking-tight sm:text-2xl">
            {titulo}
          </h1>
          {detalle && <p className="mt-0.5 text-sm text-white/85">{detalle}</p>}
        </div>
      </div>
    </section>
  );
}

export function KpiPortal({
  titulo,
  valor,
  detalle,
  icon: Icon,
  tono = "violeta",
  onClick,
}: {
  titulo: string;
  valor: string;
  detalle?: string;
  icon: LucideIcon;
  tono?: "violeta" | "verde" | "ambar" | "rosa" | "azul";
  onClick?: (() => void) | undefined;
}) {
  const tonos = {
    violeta: "from-primary to-fuchsia-500",
    verde: "from-emerald-500 to-teal-500",
    ambar: "from-amber-500 to-orange-500",
    rosa: "from-rose-500 to-pink-500",
    azul: "from-sky-500 to-indigo-500",
  }[tono];
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      {...(onClick ? { type: "button" as const, onClick } : {})}
      className="group relative overflow-hidden rounded-3xl border border-primary/10 bg-card p-4 text-left shadow-[0_12px_32px_-24px_rgba(124,58,237,0.6)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-24px_rgba(124,58,237,0.7)]"
    >
      <span
        aria-hidden
        className={`pointer-events-none absolute -right-10 -top-12 size-32 rounded-full bg-gradient-to-br ${tonos} opacity-[0.12] blur-2xl transition group-hover:opacity-20`}
      />
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-x-4 bottom-0 h-[3px] rounded-full bg-gradient-to-r ${tonos} opacity-70`}
      />
      <div className="relative flex items-start justify-between gap-2">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
          {titulo}
        </p>
        <span
          className={`grid size-9 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${tonos} text-white shadow-md`}
        >
          <Icon className="size-4" />
        </span>
      </div>
      <p className="relative mt-1 truncate font-display text-2xl font-bold tabular-nums tracking-tight">
        {valor}
      </p>
      {detalle && <p className="relative truncate text-xs text-muted-foreground">{detalle}</p>}
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
      className={`relative overflow-hidden rounded-3xl border border-primary/10 bg-card p-4 shadow-[0_12px_32px_-26px_rgba(124,58,237,0.55)] sm:p-5 ${className}`}
    >
      {titulo && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-fuchsia-500 to-pink-400 opacity-70"
        />
      )}
      {(titulo || acciones) && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            {Icon && (
              <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary to-fuchsia-500 text-white shadow-[0_8px_18px_-10px_rgba(124,58,237,0.9)]">
                <Icon className="size-[18px]" />
              </span>
            )}
            <div className="min-w-0">
              {titulo && (
                <h2 className="truncate font-display text-[15px] font-bold tracking-tight">
                  {titulo}
                </h2>
              )}
              {detalle && <p className="truncate text-xs text-muted-foreground">{detalle}</p>}
            </div>
          </div>
          {acciones}
        </div>
      )}
      {children}
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
    <div
      className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0"
      role="tablist"
    >
      {opciones.map((o) => (
        <button
          key={o.id}
          type="button"
          role="tab"
          aria-selected={valor === o.id}
          onClick={() => onCambiar(o.id)}
          className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition ${
            valor === o.id
              ? "bg-gradient-to-r from-primary to-fuchsia-500 text-white shadow-[0_8px_20px_-12px_rgba(124,58,237,0.9)]"
              : "border border-primary/12 bg-card text-muted-foreground hover:text-foreground"
          }`}
        >
          {o.label}
          {o.cantidad !== undefined && (
            <span
              className={`rounded-full px-1.5 text-[10px] ${
                valor === o.id ? "bg-white/25" : "bg-primary/10 text-primary"
              }`}
            >
              {o.cantidad}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
