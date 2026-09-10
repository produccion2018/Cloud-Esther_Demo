import { Link } from "@tanstack/react-router";
import { Sparkles, Linkedin, Instagram, Facebook, Twitter } from "lucide-react";

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
    <footer className="border-t border-border bg-soft">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 lg:grid-cols-5 lg:px-8">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-2.5">
            <span className="bg-brand flex size-9 items-center justify-center rounded-xl">
              <Sparkles className="size-4.5 text-primary-foreground" />
            </span>
            <span className="font-display text-lg font-bold">Cloud Esther</span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            Software inteligente para clínicas.
          </p>
          <div className="mt-5 flex gap-2">
            {socials.map((Icon, i) => (
              <span
                key={i}
                className="flex size-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-all duration-300 hover:-translate-y-0.5 hover:text-primary"
              >
                <Icon className="size-4" />
              </span>
            ))}
          </div>
        </div>

        {columns.map((col) => (
          <div key={col.title}>
            <h4 className="text-sm font-semibold">{col.title}</h4>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link
                    to={l.to}
                    className="text-sm text-muted-foreground transition-colors hover:text-primary"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border">
        <p className="mx-auto max-w-7xl px-5 py-6 text-center text-xs text-muted-foreground lg:px-8">
          © 2026 Cloud Esther. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}
