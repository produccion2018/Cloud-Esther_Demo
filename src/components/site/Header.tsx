import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  CalendarDays,
  ChevronDown,
  Menu,
  ReceiptText,
  Stethoscope,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const nav = [
  { label: "Inicio", to: "/" },
  { label: "Planes y precios", to: "/planes" },
  { label: "Nosotros", to: "/nosotros" },
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

export function Header() {
  const [open, setOpen] = useState(false);
  const [featuresOpen, setFeaturesOpen] = useState(false);
  const [mobileFeaturesOpen, setMobileFeaturesOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);

    onScroll();
    window.addEventListener("scroll", onScroll);

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
        <div className="flex h-[68px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-7">
          {/* =====================================================
              LOGO
          ===================================================== */}
          <Link
            to="/"
            onClick={closeMenu}
            className="group flex shrink-0 items-center gap-2.5"
          >
            <span className="relative flex size-9 items-center justify-center overflow-hidden rounded-full bg-primary shadow-[0_6px_20px_rgba(124,58,237,0.25)] transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_8px_25px_rgba(124,58,237,0.35)]">
              <span className="text-[15px] font-bold text-primary-foreground">
                C
              </span>

              <span className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-br from-white/25 via-transparent to-transparent" />
            </span>

            <span className="font-display text-[17px] font-bold tracking-tight">
              Cloud <span className="text-primary">Esther</span>
            </span>
          </Link>

          {/* =====================================================
              DESKTOP NAV
          ===================================================== */}
          <nav className="hidden items-center gap-1 lg:flex">
            {/* INICIO */}
            <Link
              to="/"
              activeOptions={{ exact: true }}
              activeProps={{
                className:
                  "group relative rounded-xl bg-lavender px-4 py-2.5 font-display text-[14px] font-semibold tracking-[0.01em] text-foreground shadow-sm after:absolute after:bottom-1 after:left-1/2 after:h-[2px] after:w-6 after:-translate-x-1/2 after:rounded-full after:bg-primary after:shadow-[0_0_12px_rgba(124,58,237,0.6)]",
              }}
              className="group relative rounded-xl px-4 py-2.5 font-display text-[14px] font-medium tracking-[0.01em] text-muted-foreground transition-all duration-300 hover:-translate-y-[1px] hover:bg-lavender/75 hover:text-foreground hover:shadow-[0_5px_18px_rgba(124,58,237,0.08)] after:absolute after:bottom-1 after:left-1/2 after:h-[2px] after:w-6 after:-translate-x-1/2 after:scale-x-0 after:rounded-full after:bg-primary after:opacity-0 after:shadow-[0_0_12px_rgba(124,58,237,0.55)] after:transition-all after:duration-300 after:content-[''] hover:after:scale-x-100 hover:after:opacity-100"
            >
              <span className="relative z-10">Inicio</span>
            </Link>

            {/* =================================================
                CARACTERÍSTICAS
            ================================================= */}
            <div
              className="relative"
              onMouseEnter={() => setFeaturesOpen(true)}
              onMouseLeave={() => setFeaturesOpen(false)}
            >
              <button
                type="button"
                aria-expanded={featuresOpen}
                onClick={() => setFeaturesOpen((value) => !value)}
                className={`group relative flex items-center gap-1.5 rounded-xl px-4 py-2.5 font-display text-[14px] tracking-[0.01em] transition-all duration-300 after:absolute after:bottom-1 after:left-1/2 after:h-[2px] after:w-6 after:-translate-x-1/2 after:rounded-full after:bg-primary after:shadow-[0_0_12px_rgba(124,58,237,0.55)] after:transition-all after:duration-300 after:content-[''] ${
                  featuresOpen
                    ? "bg-lavender font-semibold text-foreground after:scale-x-100 after:opacity-100"
                    : "font-medium text-muted-foreground after:scale-x-0 after:opacity-0 hover:-translate-y-[1px] hover:bg-lavender/75 hover:text-foreground hover:shadow-[0_5px_18px_rgba(124,58,237,0.08)] hover:after:scale-x-100 hover:after:opacity-100"
                }`}
              >
                <span className="relative z-10">Características</span>

                <ChevronDown
                  className={`relative z-10 size-3.5 transition-transform duration-300 ${
                    featuresOpen ? "rotate-180 text-primary" : ""
                  }`}
                />
              </button>

              <AnimatePresence>
                {featuresOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.97 }}
                    transition={{
                      duration: 0.2,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className="absolute left-1/2 top-full mt-3 w-[310px] -translate-x-1/2 overflow-hidden rounded-2xl border border-primary/10 bg-background/95 p-2 shadow-[0_20px_55px_rgba(88,28,135,0.16)] backdrop-blur-2xl"
                  >
                    <div className="px-3 pb-2 pt-2">
                      <p className="font-display text-xs font-semibold uppercase tracking-[0.12em] text-primary">
                        Todo lo que necesitás
                      </p>
                    </div>

                    <div className="space-y-1">
                      {featureItems.map((item) => {
                        const Icon = item.icon;

                        return (
                          <Link
                            key={item.label}
                            to="/caracteristicas"
                            onClick={closeMenu}
                            className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 hover:bg-lavender"
                          >
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-lavender text-primary transition-all duration-200 group-hover:scale-105 group-hover:bg-primary group-hover:text-primary-foreground group-hover:shadow-[0_5px_16px_rgba(124,58,237,0.2)]">
                              <Icon className="size-4" />
                            </span>

                            <span className="min-w-0">
                              <span className="block font-display text-sm font-semibold tracking-[-0.01em] text-foreground">
                                {item.label}
                              </span>

                              <span className="block truncate text-xs text-muted-foreground">
                                {item.description}
                              </span>
                            </span>

                            <motion.span
                              initial={{ opacity: 0, x: -4 }}
                              whileHover={{ opacity: 1, x: 0 }}
                              className="ml-auto text-primary"
                            >
                              →
                            </motion.span>
                          </Link>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* =================================================
                PLANES + NOSOTROS
            ================================================= */}
            {nav.slice(1).map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="group relative rounded-xl px-4 py-2.5 font-display text-[14px] font-medium tracking-[0.01em] text-muted-foreground transition-all duration-300 hover:-translate-y-[1px] hover:bg-lavender/75 hover:text-foreground hover:shadow-[0_5px_18px_rgba(124,58,237,0.08)] after:absolute after:bottom-1 after:left-1/2 after:h-[2px] after:w-6 after:-translate-x-1/2 after:scale-x-0 after:rounded-full after:bg-primary after:opacity-0 after:shadow-[0_0_12px_rgba(124,58,237,0.55)] after:transition-all after:duration-300 after:content-[''] hover:after:scale-x-100 hover:after:opacity-100"
                activeProps={{
                  className:
                    "group relative rounded-xl bg-lavender px-4 py-2.5 font-display text-[14px] font-semibold tracking-[0.01em] text-foreground shadow-sm after:absolute after:bottom-1 after:left-1/2 after:h-[2px] after:w-6 after:-translate-x-1/2 after:rounded-full after:bg-primary after:shadow-[0_0_12px_rgba(124,58,237,0.6)]",
                }}
              >
                <span className="relative z-10">{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* =====================================================
              DESKTOP ACTIONS
          ===================================================== */}
          <div className="hidden items-center gap-2 lg:flex">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="rounded-xl px-3.5 text-muted-foreground transition-all hover:bg-lavender/70 hover:text-foreground"
            >
              <Link to="/login">Iniciar sesión</Link>
            </Button>

            <Button
              asChild
              variant="outlineBrand"
              size="sm"
              className="rounded-xl px-4 transition-all duration-200 hover:-translate-y-0.5"
            >
              <Link to="/demostracion">Solicitar demostración</Link>
            </Button>

            <Button
              asChild
              variant="hero"
              size="sm"
              className="rounded-xl px-5 shadow-[0_8px_24px_rgba(124,58,237,0.22)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(124,58,237,0.32)]"
            >
              <Link to="/registro">Probar demo</Link>
            </Button>
          </div>

          {/* =====================================================
              MOBILE BUTTON
          ===================================================== */}
          <button
            type="button"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
            className="flex size-10 items-center justify-center rounded-xl border border-border/70 bg-background/70 text-foreground shadow-sm transition-all hover:border-primary/20 hover:bg-lavender lg:hidden"
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

        {/* =======================================================
            MOBILE MENU
        ======================================================= */}
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{
                duration: 0.28,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="overflow-hidden border-t border-border/60 lg:hidden"
            >
              <div className="flex flex-col gap-1 px-4 pb-4 pt-3 sm:px-6">
                <Link
                  to="/"
                  onClick={closeMenu}
                  activeOptions={{ exact: true }}
                  activeProps={{
                    className:
                      "relative rounded-xl bg-lavender px-4 py-3 font-display text-sm font-semibold tracking-[0.01em] text-foreground",
                  }}
                  className="group relative rounded-xl px-4 py-3 font-display text-sm font-medium tracking-[0.01em] text-muted-foreground transition-all duration-300 hover:translate-x-1 hover:bg-lavender/70 hover:text-foreground"
                >
                  Inicio
                </Link>

                <button
                  type="button"
                  onClick={() =>
                    setMobileFeaturesOpen((value) => !value)
                  }
                  className={`relative flex items-center justify-between rounded-xl px-4 py-3 font-display text-sm tracking-[0.01em] transition-all duration-300 ${
                    mobileFeaturesOpen
                      ? "bg-lavender font-semibold text-foreground"
                      : "font-medium text-muted-foreground hover:translate-x-1 hover:bg-lavender/70 hover:text-foreground"
                  }`}
                >
                  <span>Características</span>

                  <ChevronDown
                    className={`size-4 transition-transform duration-300 ${
                      mobileFeaturesOpen ? "rotate-180 text-primary" : ""
                    }`}
                  />
                </button>

                <AnimatePresence>
                  {mobileFeaturesOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden pl-3"
                    >
                      {featureItems.map((item) => {
                        const Icon = item.icon;

                        return (
                          <Link
                            key={item.label}
                            to="/caracteristicas"
                            onClick={closeMenu}
                            className="group flex items-center gap-3 rounded-xl px-4 py-2.5 font-display text-sm font-medium text-muted-foreground transition-all duration-200 hover:translate-x-1 hover:bg-lavender hover:text-foreground"
                          >
                            <Icon className="size-4 text-primary transition-transform duration-200 group-hover:scale-110" />
                            {item.label}
                          </Link>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>

                {nav.slice(1).map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={closeMenu}
                    className="rounded-xl px-4 py-3 font-display text-sm font-medium tracking-[0.01em] text-muted-foreground transition-all duration-300 hover:translate-x-1 hover:bg-lavender/70 hover:text-foreground"
                    activeProps={{
                      className:
                        "rounded-xl bg-lavender px-4 py-3 font-display text-sm font-semibold tracking-[0.01em] text-foreground",
                    }}
                  >
                    {item.label}
                  </Link>
                ))}

                <div className="mt-3 grid gap-2 border-t border-border/60 pt-4">
                  <Button
                    asChild
                    variant="ghost"
                    onClick={closeMenu}
                    className="w-full rounded-xl"
                  >
                    <Link to="/login">Iniciar sesión</Link>
                  </Button>

                  <Button
                    asChild
                    variant="outlineBrand"
                    onClick={closeMenu}
                    className="w-full rounded-xl"
                  >
                    <Link to="/demostracion">
                      Solicitar demostración
                    </Link>
                  </Button>

                  <Button
                    asChild
                    variant="hero"
                    onClick={closeMenu}
                    className="w-full rounded-xl shadow-[0_8px_24px_rgba(124,58,237,0.25)]"
                  >
                    <Link to="/registro">Probar demo</Link>
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