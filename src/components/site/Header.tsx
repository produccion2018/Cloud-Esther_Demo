import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Home,
  Menu,
  ReceiptText,
  Sparkles,
  Stethoscope,
  Tag,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ModulosPanel } from "@/components/site/ModulosPanel";
import { SlideToDemo } from "@/components/site/SlideToDemo";

const nav = [
  { label: "Inicio", to: "/" },
  { label: "Planes", to: "/planes" },
  { label: "Nosotros", to: "/nosotros" },
];

/* Ítems del menú móvil con su ícono (para el panel rediseñado). */
const navMovil = [
  { label: "Inicio", to: "/", icon: Home, exact: true },
  { label: "Planes", to: "/planes", icon: Tag, exact: false },
  { label: "Nosotros", to: "/nosotros", icon: Users, exact: false },
];

const featureItems = [
  {
    label: "Agenda y turnos",
    description: "Organizá tu agenda",
    icon: CalendarDays,
  },
  {
    label: "Pacientes",
    description: "Toda la información en un lugar",
    icon: Users,
  },
  {
    label: "Tratamientos",
    description: "Seguimiento clínico simple",
    icon: Stethoscope,
  },
  {
    label: "Facturación",
    description: "Controlá tus ingresos",
    icon: ReceiptText,
  },
  {
    label: "Reportes",
    description: "Datos para hacer crecer tu clínica",
    icon: BarChart3,
  },
];

/* =========================================================
   LOGO — DIENTE
========================================================= */
function ToothIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="12 12 40 42"
      className={className}
      fill="none"
      aria-hidden="true"
    >
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

/* =========================================================
   PÍLDORA DE HOVER (se desliza entre opciones)
========================================================= */
function HoverPill() {
  return (
    <motion.span
      layoutId="nav-hover"
      className="absolute inset-0 rounded-xl bg-lavender shadow-[0_5px_18px_rgba(124,58,237,0.1)]"
      transition={{ type: "spring", stiffness: 420, damping: 34 }}
    />
  );
}

/* =========================================================
   LINK DEL NAV (desktop)
========================================================= */
function NavLink({
  to,
  label,
  exact = false,
  hovered,
  onHover,
}: {
  to: string;
  label: string;
  exact?: boolean;
  hovered: string | null;
  onHover: (value: string | null) => void;
}) {
  return (
    <Link
      to={to as never}
      activeOptions={{ exact }}
      onMouseEnter={() => onHover(to)}
      onFocus={() => onHover(to)}
      className="group relative rounded-xl px-4 py-2.5 text-[15px] font-semibold text-foreground/70 transition-colors duration-200 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 data-[status=active]:text-foreground"
    >
      {hovered === to && <HoverPill />}

      <span className="relative z-10">{label}</span>

      <span className="pointer-events-none absolute bottom-0.5 left-1/2 z-10 h-[2px] w-6 -translate-x-1/2 scale-x-0 rounded-full bg-primary opacity-0 shadow-[0_0_12px_rgba(124,58,237,0.6)] transition-all duration-300 group-hover:scale-x-100 group-hover:opacity-100 group-data-[status=active]:scale-x-100 group-data-[status=active]:opacity-100" />
    </Link>
  );
}

export function Header() {
  const [open, setOpen] = useState(false);
  const [featuresOpen, setFeaturesOpen] = useState(false);
  const [mobileFeaturesOpen, setMobileFeaturesOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!featuresOpen && !open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setFeaturesOpen(false);
        setOpen(false);
        setMobileFeaturesOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [featuresOpen, open]);

  const closeMenu = () => {
    setOpen(false);
    setFeaturesOpen(false);
    setMobileFeaturesOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full px-3 pt-3 sm:px-5">
      <div
        className={`mx-auto max-w-7xl rounded-2xl border transition-all duration-300 ${
          scrolled
            ? "border-primary/15 bg-background/90 shadow-[0_14px_45px_rgba(88,28,135,0.12)] backdrop-blur-2xl"
            : "border-white/70 bg-background/75 shadow-[0_10px_35px_rgba(88,28,135,0.07)] backdrop-blur-xl"
        }`}
      >
        <div className="flex h-[68px] items-center justify-between gap-4 px-4 sm:px-6 xl:px-7">
          {/* =====================================================
              LOGO
          ===================================================== */}
          <Link
            to="/"
            onClick={closeMenu}
            className="group flex shrink-0 items-center gap-2.5"
          >
            <span className="relative flex size-9 items-center justify-center overflow-hidden rounded-full bg-primary shadow-[0_6px_20px_rgba(124,58,237,0.25)] transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_8px_25px_rgba(124,58,237,0.35)]">
              <ToothIcon className="relative z-10 size-5 text-primary-foreground" />

              <span className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-br from-white/25 via-transparent to-transparent" />
            </span>

            <span className="font-display text-xl font-extrabold tracking-tight">
              Cloud <span className="text-primary">Esther</span>
            </span>
          </Link>

          {/* =====================================================
              DESKTOP NAV (desde 1280px; debajo, menú hamburguesa)
          ===================================================== */}
          <nav
            className="hidden items-center gap-1 xl:flex"
            onMouseLeave={() => setHovered(null)}
          >
            {/* INICIO */}
            <NavLink
              to="/"
              label="Inicio"
              exact
              hovered={hovered}
              onHover={setHovered}
            />

            {/* CARACTERÍSTICAS → despliega el panel de módulos ahí mismo */}
            <div className="relative">
              <button
                type="button"
                aria-expanded={featuresOpen}
                aria-haspopup="true"
                onClick={() => {
                  setFeaturesOpen((v) => !v);
                  setHovered("features");
                }}
                className={`group relative flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-[15px] font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                  featuresOpen ? "text-foreground" : "text-foreground/70 hover:text-foreground"
                }`}
              >
                {hovered === "features" && <HoverPill />}
                <span className="relative z-10">Características</span>
                <ChevronDown className={`relative z-10 size-3.5 transition-transform duration-300 ${featuresOpen ? "rotate-180 text-primary" : ""}`} />
                <span
                  className={`pointer-events-none absolute bottom-0.5 left-1/2 z-10 h-[2px] w-6 -translate-x-1/2 rounded-full bg-primary shadow-[0_0_12px_rgba(124,58,237,0.6)] transition-all duration-300 ${
                    featuresOpen ? "scale-x-100 opacity-100" : "scale-x-0 opacity-0 group-hover:scale-x-100 group-hover:opacity-100"
                  }`}
                />
              </button>

              {featuresOpen && (
                <div className="fixed inset-0 z-40" onClick={() => setFeaturesOpen(false)} aria-hidden />
              )}
              <AnimatePresence>
                {featuresOpen && (
                  <motion.div
                    key="caract-panel"
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.98 }}
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    className="fixed left-1/2 top-[78px] z-50 w-[min(920px,94vw)] -translate-x-1/2"
                  >
                    <ModulosPanel onLinkClick={() => setFeaturesOpen(false)} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* =================================================
                PLANES + NOSOTROS
            ================================================= */}
            {nav.slice(1).map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                label={item.label}
                hovered={hovered}
                onHover={setHovered}
              />
            ))}
          </nav>

          {/* =====================================================
              DESKTOP ACTIONS
          ===================================================== */}
          <div className="hidden items-center gap-2 xl:flex">
            <span
              aria-hidden="true"
              className="mr-2 h-6 w-px bg-border/80"
            />

            <Button
              asChild
              variant="ghost"
              size="sm"
              className="h-10 rounded-xl px-3.5 text-[15px] font-semibold text-foreground/70 transition-all hover:bg-lavender/70 hover:text-foreground"
            >
              <Link to="/login">Iniciar sesión</Link>
            </Button>

            {/* Píldora de acción (Contratar servicio + Probar demo) — colores exactos de la referencia */}
            <div className="flex items-center gap-1 rounded-full bg-[#ece7f3] p-1">
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="h-9 rounded-full bg-white px-4 text-[15px] font-semibold text-foreground shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-white"
              >
                <Link to="/demostracion">Contratar servicio</Link>
              </Button>

              <Button
                asChild
                variant="ghost"
                size="sm"
                className="h-9 rounded-full bg-[linear-gradient(90deg,#b43ae6,#f138df)] px-5 text-[15px] font-semibold text-white shadow-[0_8px_24px_rgba(180,58,230,0.3)] transition-all duration-200 hover:-translate-y-0.5 hover:opacity-95 hover:text-white"
              >
                <Link to="/registro">Probar demo</Link>
              </Button>
            </div>
          </div>

          {/* =====================================================
              DERECHA EN TABLET/CELULAR: deslizable + hamburguesa
          ===================================================== */}
          <div className="flex items-center gap-2.5 xl:hidden">
            {/* TABLET: botón deslizable "Probar demo" siempre visible (sin abrir el menú).
                En celular va en el hero y dentro del menú. */}
            <SlideToDemo className="hidden w-[228px] md:flex" />

          {/* =====================================================
              MOBILE / TABLET BUTTON (hamburguesa)
          ===================================================== */}
          <button
            type="button"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((value) => !value)}
            className="flex size-11 items-center justify-center rounded-xl border border-border/70 bg-background/70 text-foreground shadow-sm transition-all hover:border-primary/20 hover:bg-lavender xl:hidden"
          >
            <AnimatePresence mode="wait" initial={false}>
              {open ? (
                <motion.span
                  key="close"
                  initial={{ opacity: 0, rotate: -90 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  exit={{ opacity: 0, rotate: 90 }}
                >
                  <X className="size-5" />
                </motion.span>
              ) : (
                <motion.span
                  key="menu"
                  initial={{ opacity: 0, rotate: 90 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  exit={{ opacity: 0, rotate: -90 }}
                >
                  <Menu className="size-5" />
                </motion.span>
              )}
            </AnimatePresence>
          </button>
          </div>
        </div>

        {/* =======================================================
            MENÚ MÓVIL — rediseño completo (panel con cabecera en gradiente,
            filas con ícono que entran escalonadas y CTA deslizable abajo)
        ======================================================= */}
        <AnimatePresence>
          {open && (
            <motion.button
              key="backdrop"
              type="button"
              aria-label="Cerrar menú"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={closeMenu}
              className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-md xl:hidden"
            />
          )}
          {open && (
            <motion.div
              key="panel"
              id="mobile-menu"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 32 }}
              className="fixed right-0 top-0 z-50 flex h-[100dvh] w-[90%] max-w-[390px] flex-col overflow-hidden rounded-l-[30px] border-l border-primary/10 bg-background shadow-[-30px_0_80px_-24px_rgba(76,29,149,0.5)] xl:hidden"
            >
              {/* Cabecera en gradiente */}
              <div className="relative overflow-hidden bg-[linear-gradient(135deg,#7c3aed_0%,#b43ae6_55%,#f138df_100%)] px-5 pb-7 pt-5 text-white">
                <span aria-hidden className="pointer-events-none absolute -right-10 -top-16 size-48 rounded-full bg-white/15 blur-2xl" />
                <span aria-hidden className="pointer-events-none absolute -bottom-20 -left-8 size-44 rounded-full bg-fuchsia-300/25 blur-2xl" />
                <div className="relative flex items-center justify-between">
                  <span className="inline-flex items-center gap-2.5">
                    <span className="grid size-9 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/25 backdrop-blur-sm">
                      <ToothIcon className="size-5 text-white" />
                    </span>
                    <span className="font-display text-[17px] font-extrabold tracking-tight">Cloud Esther</span>
                  </span>
                  <button
                    type="button"
                    aria-label="Cerrar menú"
                    onClick={closeMenu}
                    className="grid size-9 place-items-center rounded-full bg-white/15 text-white ring-1 ring-white/25 transition hover:bg-white/25"
                  >
                    <X className="size-4" />
                  </button>
                </div>
                <p className="relative mt-4 text-[13px] font-medium text-white/85">
                  Gestioná tu clínica y hacela crecer, todo en un solo lugar.
                </p>
              </div>

              {/* Navegación: filas con ícono, entran escalonadas */}
              <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto px-4 py-5">
                {/* Inicio */}
                <motion.div
                  initial={{ opacity: 0, x: 26 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.06, type: "spring", stiffness: 300, damping: 30 }}
                >
                  <Link
                    to="/"
                    onClick={closeMenu}
                    activeOptions={{ exact: true }}
                    className="group flex items-center gap-3 rounded-2xl border border-transparent px-3.5 py-3 text-[15px] font-semibold text-foreground/80 transition-all hover:border-primary/15 hover:bg-lavender/60 hover:text-foreground data-[status=active]:border-primary/20 data-[status=active]:bg-lavender data-[status=active]:text-foreground"
                  >
                    <span className="grid size-10 place-items-center rounded-xl bg-lavender text-primary transition-colors group-hover:bg-white group-data-[status=active]:bg-white">
                      <Home className="size-[18px]" />
                    </span>
                    <span className="flex-1">Inicio</span>
                    <ChevronRight className="size-4 text-foreground/30 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                  </Link>
                </motion.div>

                {/* Características (desplegable) */}
                <motion.div
                  initial={{ opacity: 0, x: 26 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.11, type: "spring", stiffness: 300, damping: 30 }}
                >
                  <button
                    type="button"
                    aria-expanded={mobileFeaturesOpen}
                    onClick={() => setMobileFeaturesOpen((v) => !v)}
                    className={`group flex w-full items-center gap-3 rounded-2xl border px-3.5 py-3 text-[15px] font-semibold transition-all ${
                      mobileFeaturesOpen
                        ? "border-primary/20 bg-lavender text-foreground"
                        : "border-transparent text-foreground/80 hover:border-primary/15 hover:bg-lavender/60 hover:text-foreground"
                    }`}
                  >
                    <span className={`grid size-10 place-items-center rounded-xl text-primary transition-colors ${mobileFeaturesOpen ? "bg-white" : "bg-lavender group-hover:bg-white"}`}>
                      <Sparkles className="size-[18px]" />
                    </span>
                    <span className="flex-1 text-left">Características</span>
                    <ChevronDown className={`size-4 text-foreground/40 transition-transform duration-300 ${mobileFeaturesOpen ? "rotate-180 text-primary" : ""}`} />
                  </button>
                  <AnimatePresence>
                    {mobileFeaturesOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-1 py-2">
                          <ModulosPanel onLinkClick={closeMenu} />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* Planes + Nosotros */}
                {navMovil.slice(1).map((item, i) => (
                  <motion.div
                    key={item.to}
                    initial={{ opacity: 0, x: 26 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.16 + i * 0.05, type: "spring", stiffness: 300, damping: 30 }}
                  >
                    <Link
                      to={item.to as never}
                      onClick={closeMenu}
                      activeOptions={{ exact: item.exact }}
                      className="group flex items-center gap-3 rounded-2xl border border-transparent px-3.5 py-3 text-[15px] font-semibold text-foreground/80 transition-all hover:border-primary/15 hover:bg-lavender/60 hover:text-foreground data-[status=active]:border-primary/20 data-[status=active]:bg-lavender data-[status=active]:text-foreground"
                    >
                      <span className="grid size-10 place-items-center rounded-xl bg-lavender text-primary transition-colors group-hover:bg-white group-data-[status=active]:bg-white">
                        <item.icon className="size-[18px]" />
                      </span>
                      <span className="flex-1">{item.label}</span>
                      <ChevronRight className="size-4 text-foreground/30 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                    </Link>
                  </motion.div>
                ))}
              </div>

              {/* Acciones (fijas abajo) — CTA deslizable arriba del todo */}
              <div className="space-y-2.5 border-t border-border/60 bg-background/90 px-4 py-4 backdrop-blur">
                <SlideToDemo tono="claro" onAbrir={closeMenu} />
                <div className="grid grid-cols-2 gap-2">
                  <Button asChild variant="ghost" onClick={closeMenu} className="rounded-xl">
                    <Link to="/login">Iniciar sesión</Link>
                  </Button>
                  <Button asChild variant="outlineBrand" onClick={closeMenu} className="rounded-xl">
                    <Link to="/demostracion">Contratar</Link>
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}