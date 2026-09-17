import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const nav = [
  { label: "Inicio", to: "/" },
  { label: "Características", to: "/caracteristicas" },
  { label: "Planes y precios", to: "/planes" },
  { label: "Nosotros", to: "/nosotros" },
];

function ToothIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 2c-2.2 0-3.5 1.1-4.6 1.1-1.4 0-2.9-1-4-.2-1.2.9-1.4 3-1.2 4.6.3 2.6 1.3 4.4 1.9 7.1.4 1.8.6 4.3 2.1 4.4 1.7.1 1.5-3.3 2.5-3.3s.8 3.4 2.5 3.3c1.5-.1 1.7-2.6 2.1-4.4.6-2.7 1.6-4.5 1.9-7.1.2-1.6 0-3.7-1.2-4.6-1.1-.8-2.6.2-4 .2C15.5 3.1 14.2 2 12 2z"
        fill="currentColor"
      />
    </svg>
  );
}

export function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        scrolled ? "border-b border-border bg-background/85 backdrop-blur-xl" : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between gap-4 px-5 py-4 lg:px-8">
        <Link to="/" className="group flex items-center gap-2.5" onClick={() => setOpen(false)}>
          <span className="bg-brand relative flex size-9 items-center justify-center rounded-xl shadow-soft transition-transform duration-300 group-hover:scale-105">
            <span className="absolute inset-0 -z-10 rounded-xl bg-brand blur-md opacity-60 transition-opacity duration-300 group-hover:opacity-90" />
            <ToothIcon className="size-4.5 text-primary-foreground" />
          </span>
          <span className="font-display bg-gradient-to-r from-foreground to-brand bg-clip-text text-xl font-extrabold tracking-tight text-transparent">
            Cloud Esther
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="group relative rounded-lg px-3.5 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "text-foreground" }}
              activeOptions={{ exact: item.to === "/" }}
            >
              {item.label}
              <span className="absolute inset-x-3.5 -bottom-0.5 h-0.5 scale-x-0 rounded-full bg-brand transition-transform duration-300 group-hover:scale-x-100" />
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <Button asChild variant="ghost" size="sm">
            <Link to="/login">Iniciar sesión</Link>
          </Button>
          <Button asChild variant="outlineBrand" size="sm">
            <Link to="/demostracion">Solicitar demostración</Link>
          </Button>
          <Button
            asChild
            variant="hero"
            size="sm"
            className="relative overflow-hidden shadow-[0_0_20px_-4px_theme(colors.brand.DEFAULT)] transition-shadow duration-300 hover:shadow-[0_0_28px_-2px_theme(colors.brand.DEFAULT)]"
          >
            <Link to="/registro">Probar demo</Link>
          </Button>
        </div>

        <button
          aria-label="Abrir menú"
          onClick={() => setOpen((v) => !v)}
          className="flex size-10 items-center justify-center rounded-xl border border-border bg-card text-foreground lg:hidden"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-border bg-background/95 backdrop-blur-xl lg:hidden"
          >
            <div className="mx-auto flex max-w-7xl flex-col gap-1 px-5 py-4">
              {nav.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-lavender hover:text-foreground"
                  activeProps={{ className: "bg-lavender text-lavender-foreground" }}
                  activeOptions={{ exact: item.to === "/" }}
                >
                  {item.label}
                </Link>
              ))}
              <div className="mt-3 grid gap-2">
                <Button asChild variant="outlineBrand" onClick={() => setOpen(false)}>
                  <Link to="/demostracion">Solicitar demostración</Link>
                </Button>
                <Button asChild variant="soft" onClick={() => setOpen(false)}>
                  <Link to="/login">Iniciar sesión</Link>
                </Button>
                <Button asChild variant="hero" onClick={() => setOpen(false)}>
                  <Link to="/registro">Probar demo</Link>
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}