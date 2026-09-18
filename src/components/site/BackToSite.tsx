import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

/**
 * Link de salida hacia la landing pública.
 *
 * Pensado para las pantallas donde la persona entra y después
 * no encuentra cómo volver: /registro, /demostracion, onboarding,
 * pantallas de cuenta recién creada, etc.
 *
 * Uso:
 *   <BackToSite />
 *   <BackToSite label="Volver al inicio" />
 *   <BackToSite tone="light" />                    // sobre fondos oscuros
 *   <BackToSite tone="light" position="fixed" />    // fijo, abajo a la izquierda
 */

type BackToSiteProps = {
  /** Texto del link. Por defecto: "Volver al sitio público". */
  label?: string;
  /** "muted" para fondos claros, "light" para fondos oscuros. */
  tone?: "muted" | "light";
  /** "static" (default) fluye con el contenido. "fixed" lo ancla abajo a la izquierda de la pantalla. */
  position?: "static" | "fixed";
  className?: string;
};

export function BackToSite({
  label = "Volver al sitio público",
  tone = "muted",
  position = "static",
  className = "",
}: BackToSiteProps) {
  const toneClasses =
    tone === "light"
      ? "text-violet-300 hover:text-violet-200"
      : "text-muted-foreground hover:text-foreground";

  const positionClasses =
    position === "fixed" ? "fixed bottom-6 left-6 z-50" : "";

  return (
    <Link
      to="/"
      className={`group inline-flex items-center gap-2 rounded-md text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${toneClasses} ${positionClasses} ${className}`}
    >
      <ArrowLeft className="size-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
      {label}
    </Link>
  );
}