import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Linkedin,
  Instagram,
  Facebook,
  Twitter,
  ArrowUpRight,
} from "lucide-react";

const columns: {
  title: string;
  links: { label: string; to: string }[];
}[] = [
  {
    title: "Producto",
    links: [
      { label: "Características", to: "/caracteristicas" },
      { label: "Planes y precios", to: "/planes" },
      { label: "Probar demo", to: "/registro" },
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

const socials = [
  {
    label: "LinkedIn",
    icon: Linkedin,
  },
  {
    label: "Instagram",
    icon: Instagram,
  },
  {
    label: "Facebook",
    icon: Facebook,
  },
  {
    label: "Twitter",
    icon: Twitter,
  },
];

export function Footer() {
  return (
    <footer className="relative overflow-hidden bg-[#0d0820] text-white">
      {/* =========================================================
          AMBIENTE / GLOW INFINITO
      ========================================================= */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          animate={{
            x: [-120, 180, -120],
            y: [0, -50, 0],
            scale: [1, 1.18, 1],
            opacity: [0.12, 0.24, 0.12],
          }}
          transition={{
            duration: 13,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -left-32 -top-40 size-[520px] rounded-full bg-violet-500/30 blur-[120px]"
        />

        <motion.div
          animate={{
            x: [160, -120, 160],
            y: [-20, 60, -20],
            scale: [1.05, 0.9, 1.05],
            opacity: [0.08, 0.2, 0.08],
          }}
          transition={{
            duration: 16,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -right-40 bottom-[-160px] size-[580px] rounded-full bg-fuchsia-500/25 blur-[130px]"
        />

        <motion.div
          animate={{
            opacity: [0.04, 0.1, 0.04],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute left-1/2 top-1/2 size-[650px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-500/10 blur-[150px]"
        />

        {/* Línea luminosa superior */}
        <motion.div
          animate={{
            x: ["-100%", "200%"],
          }}
          transition={{
            duration: 9,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute left-0 top-0 h-px w-1/2 bg-gradient-to-r from-transparent via-violet-400/70 to-transparent"
        />
      </div>

      {/* =========================================================
          CONTENIDO PRINCIPAL
      ========================================================= */}
      <div className="relative mx-auto max-w-7xl px-5 pb-10 pt-16 sm:pt-20 lg:px-8 lg:pt-24">
        <div className="grid gap-14 lg:grid-cols-[1.5fr_2fr] lg:gap-20">
          {/* =====================================================
              MARCA
          ===================================================== */}
          <div className="max-w-sm">
            <Link
              to="/"
              className="group inline-flex items-center gap-3"
            >
              {/* LOGO — SIN ESTRELLA */}
              <motion.span
                whileHover={{ scale: 1.05 }}
                className="relative flex size-12 items-center justify-center rounded-2xl border border-violet-300/20 bg-gradient-to-br from-violet-500 to-purple-700 shadow-[0_0_35px_rgba(139,92,246,0.25)]"
              >
                <span className="absolute inset-[5px] rounded-[13px] border border-white/10" />

                {/* Marca abstracta de Cloud Esther */}
                <span className="relative flex items-center gap-[3px]">
                  <span className="h-4 w-[3px] rounded-full bg-white/90" />
                  <span className="h-6 w-[3px] rounded-full bg-white" />
                  <span className="h-3.5 w-[3px] rounded-full bg-white/80" />
                </span>

                <motion.span
                  animate={{
                    opacity: [0.2, 0.8, 0.2],
                    scale: [0.8, 1.1, 0.8],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="absolute -inset-2 rounded-2xl bg-violet-500/20 blur-lg"
                />
              </motion.span>

              <span className="font-display text-xl font-bold tracking-tight text-white">
                Cloud Esther
              </span>
            </Link>

            <p className="mt-5 max-w-xs text-sm leading-6 text-white/55">
              La plataforma inteligente para simplificar la gestión de tu
              clínica odontológica.
            </p>

            {/* FRASE DE MARCA */}
            <motion.p
              animate={{
                opacity: [0.5, 0.85, 0.5],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="mt-6 text-xs font-medium uppercase tracking-[0.18em] text-violet-300/80"
            >
              Una plataforma. Toda tu clínica.
            </motion.p>

            {/* REDES */}
            <div className="mt-7 flex items-center gap-2.5">
              {socials.map(({ label, icon: Icon }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  className="group flex size-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/45 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-violet-400/40 hover:bg-violet-500/10 hover:text-violet-300 hover:shadow-[0_8px_25px_rgba(139,92,246,0.18)]"
                >
                  <Icon className="size-4 transition-transform duration-300 group-hover:scale-110" />
                </a>
              ))}
            </div>
          </div>

          {/* =====================================================
              COLUMNAS
          ===================================================== */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-12 sm:grid-cols-4">
            {columns.map((col) => (
              <div key={col.title}>
                <h4 className="text-sm font-semibold text-white">
                  {col.title}
                </h4>

                <ul className="mt-5 space-y-3.5">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        to={link.to}
                        className="group inline-flex items-center gap-1 text-sm text-white/45 transition-colors duration-300 hover:text-violet-300"
                      >
                        <span>{link.label}</span>

                        <ArrowUpRight className="size-3 -translate-x-1 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-70" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* =========================================================
            CONTACTO — PREPARADO PARA COMPLETAR DESPUÉS
        ========================================================= */}
        <div className="relative mt-16 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] px-5 py-5 backdrop-blur-xl sm:px-6">
          <motion.div
            animate={{
              x: ["-100%", "200%"],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "linear",
            }}
            className="pointer-events-none absolute top-0 h-px w-1/3 bg-gradient-to-r from-transparent via-violet-400/50 to-transparent"
          />

          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-white">
                ¿Querés conocer Cloud Esther?
              </p>

              <p className="mt-1 text-xs text-white/40">
                Estamos preparando nuestros canales de contacto.
              </p>
            </div>

            <Link
              to="/demostracion"
              className="group inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-violet-400/25 bg-violet-500/10 px-4 py-2.5 text-sm font-semibold text-violet-200 transition-all duration-300 hover:-translate-y-0.5 hover:border-violet-400/50 hover:bg-violet-500/20 hover:shadow-[0_10px_30px_rgba(139,92,246,0.18)]"
            >
              Solicitar demostración
              <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* =========================================================
          COPYRIGHT
      ========================================================= */}
      <div className="relative border-t border-white/[0.08]">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-6 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <p className="text-xs text-white/35">
            © 2026 Cloud Esther. Todos los derechos reservados.
          </p>

          <p className="text-xs text-white/25">
            Gestión inteligente para clínicas odontológicas.
          </p>
        </div>
      </div>
    </footer>
  );
}