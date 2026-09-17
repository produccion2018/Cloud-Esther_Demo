import { Link } from "@tanstack/react-router";
import { Linkedin, Instagram, Facebook, Twitter } from "lucide-react";
import { motion } from "framer-motion";

function ToothIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 2c-2.2 0-3.5 1.1-4.6 1.1-1.4 0-2.9-1-4-.2-1.2.9-1.4 3-1.2 4.6.3 2.6 1.3 4.4 1.9 7.1.4 1.8.6 4.3 2.1 4.4 1.7.1 1.5-3.3 2.5-3.3s.8 3.4 2.5 3.3c1.5-.1 1.7-2.6 2.1-4.4.6-2.7 1.6-4.5 1.9-7.1.2-1.6 0-3.7-1.2-4.6-1.1-.8-2.6.2-4 .2C15.5 3.1 14.2 2 12 2z"
        fill="currentColor"
      />
    </svg>
  );
}

const columns: { title: string; links: { label: string; to: string }[] }[] = [
  {
    title: "Producto",
    links: [
      { label: "Características", to: "/caracteristicas" },
      { label: "Planes", to: "/planes" },
      { label: "Demo", to: "/demo" },
    ],
  },
  {
    title: "Empresa",
    links: [
      { label: "Nosotros", to: "/nosotros" },
      { label: "Contacto", to: "/demostracion" },
    ],
  },
  {
    title: "Soporte",
    links: [
      { label: "Preguntas frecuentes", to: "/preguntas-frecuentes" },
      { label: "Ayuda", to: "/preguntas-frecuentes" },
      { label: "Solicitar demostración", to: "/demostracion" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Términos", to: "/preguntas-frecuentes" },
      { label: "Privacidad", to: "/preguntas-frecuentes" },
    ],
  },
];

const socials = [Linkedin, Instagram, Facebook, Twitter];

export function Footer() {
  return (
    <footer className="relative overflow-hidden bg-neutral-950">
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-24 size-96 rounded-full bg-primary/30 blur-[100px]"
        animate={{ x: [0, 40, 0], y: [0, 30, 0], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -right-24 -bottom-24 size-96 rounded-full bg-brand/30 blur-[100px]"
        animate={{ x: [0, -30, 0], y: [0, -20, 0], opacity: [0.35, 0.65, 0.35] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />
      <div className="absolute inset-x-0 top-0 h-px overflow-hidden">
        <motion.div
          className="h-full w-full bg-gradient-to-r from-transparent via-primary to-transparent"
          style={{ backgroundSize: "200% 100%" }}
          animate={{ backgroundPositionX: ["0%", "200%"] }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        />
      </div>

      <div className="relative mx-auto grid max-w-7xl gap-10 px-5 py-16 lg:grid-cols-5 lg:px-8">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-2.5">
            <span className="bg-brand relative flex size-10 items-center justify-center rounded-xl">
              <motion.span
                aria-hidden
                className="absolute inset-0 -z-10 rounded-xl bg-brand blur-lg"
                animate={{ opacity: [0.5, 0.9, 0.5], scale: [1, 1.25, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              />
              <ToothIcon className="size-5 text-primary-foreground" />
            </span>
            <span className="font-display bg-gradient-to-r from-white to-primary bg-clip-text text-xl font-extrabold tracking-tight text-transparent">
              Cloud Esther
            </span>
          </div>
          <p className="mt-4 max-w-xs text-sm text-neutral-400">
            Software inteligente para clínicas odontológicas.
          </p>
          <div className="mt-6 flex gap-2.5">
            {socials.map((Icon, i) => (
              <motion.span
                key={i}
                animate={{ y: [0, -5, 0] }}
                transition={{
                  duration: 3.2,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.2,
                }}
                className="group relative flex size-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-neutral-400 transition-colors duration-300 hover:border-primary/50 hover:text-white"
              >
                <span className="absolute inset-0 -z-10 rounded-xl bg-primary opacity-0 blur-md transition-opacity duration-300 group-hover:opacity-40" />
                <Icon className="size-4.5" />
              </motion.span>
            ))}
          </div>
        </div>

        {columns.map((col) => (
          <div key={col.title}>
            <h4 className="text-sm font-semibold text-white">{col.title}</h4>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link
                    to={l.to}
                    className="group relative text-sm text-neutral-400 transition-colors hover:text-white"
                  >
                    {l.label}
                    <span className="absolute inset-x-0 -bottom-0.5 h-px scale-x-0 bg-primary transition-transform duration-300 group-hover:scale-x-100" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="relative border-t border-white/10">
        <p className="mx-auto max-w-7xl px-5 py-6 text-center text-xs text-neutral-500 lg:px-8">
          © 2026 Cloud Esther. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}