import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";

import { useInstalarApp } from "@/lib/pwa";

/* Ubicación: src/components/site/InstalarPortal.tsx
   Hace que un portal (paciente o profesional) se instale como SU PROPIA app:
   - Cambia el <link rel="manifest"> de la página al manifest del portal (nombre, ícono y
     pantalla de inicio propios). Al salir del portal se restaura el manifest general.
   - Deja las metas de iPhone/iPad para «Agregar a inicio» con el nombre del portal.
   - Muestra un botón «Instalar app» premium (Android/Chrome instala al toque; iPhone muestra el
     paso «Compartir → Agregar a inicio»). En escritorio o si ya está instalada, no molesta.
   No toca el service worker global (sigue como está). */

function setMeta(name: string, content: string, guardar: Map<string, string | null>) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", name);
    document.head.appendChild(el);
    guardar.set(name, null); // no existía: al salir se borra
  } else if (!guardar.has(name)) {
    guardar.set(name, el.getAttribute("content"));
  }
  el.setAttribute("content", content);
}

export function InstalarPortal({
  manifest,
  titulo,
  nombre,
  sobreBarraInferior = false,
}: {
  /** Ruta del manifest del portal, ej. "/portal-paciente.webmanifest". */
  manifest: string;
  /** Nombre con el que queda en la pantalla de inicio del iPhone. */
  titulo: string;
  /** Nombre del portal para el texto del botón. */
  nombre: string;
  /** En el celular, sube el aviso para no tapar una barra inferior fija (ej. el panel /admin). */
  sobreBarraInferior?: boolean;
}) {
  const app = useInstalarApp();
  const [cerrado, setCerrado] = useState(false);
  const [ayudaIOS, setAyudaIOS] = useState(false);

  // Cambia el manifest de la página al del portal (y restaura al salir).
  useEffect(() => {
    if (typeof document === "undefined") return;
    const link = document.head.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    const antes = link?.getAttribute("href") ?? null;
    if (link) link.setAttribute("href", manifest);

    const metas = new Map<string, string | null>();
    setMeta("apple-mobile-web-app-title", titulo, metas);
    setMeta("apple-mobile-web-app-capable", "yes", metas);
    setMeta("mobile-web-app-capable", "yes", metas);
    setMeta("apple-mobile-web-app-status-bar-style", "default", metas);

    return () => {
      if (link && antes) link.setAttribute("href", antes);
      metas.forEach((valor, name) => {
        const el = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
        if (!el) return;
        if (valor === null) el.remove();
        else el.setAttribute("content", valor);
      });
    };
  }, [manifest, titulo]);

  // Nada para mostrar: ya está instalada, o no hay forma de instalar en este navegador.
  if (cerrado || app.instalada || (!app.puedeInstalar && !app.ios)) return null;

  return (
    <div
      className={`fixed left-4 z-[60] max-w-[min(340px,calc(100vw-2rem))] ${
        sobreBarraInferior
          ? "bottom-[calc(5.5rem+env(safe-area-inset-bottom))] lg:bottom-4"
          : "bottom-[calc(1rem+env(safe-area-inset-bottom))]"
      }`}
    >
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-card/95 p-3 shadow-[0_20px_50px_-20px_rgba(76,29,149,0.65)] backdrop-blur-md">
        <span aria-hidden className="pointer-events-none absolute -right-10 -top-12 size-28 rounded-full bg-fuchsia-400/15 blur-2xl" />
        <button
          type="button"
          onClick={() => setCerrado(true)}
          aria-label="Cerrar"
          className="absolute right-2 top-2 grid size-7 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </button>
        <div className="relative flex items-start gap-3 pr-6">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-[0_12px_26px_-12px_rgba(124,58,237,0.9)]">
            <Download className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-bold leading-tight">Instalá {nombre}</p>
            <p className="mt-0.5 text-[11.5px] leading-snug text-muted-foreground">
              Accedé más rápido, como una app en tu teléfono.
            </p>

            {app.puedeInstalar && (
              <button
                type="button"
                onClick={() => void app.instalar()}
                className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 px-3.5 py-1.5 text-[12.5px] font-semibold text-white shadow-[0_10px_22px_-10px_rgba(124,58,237,0.9)] transition hover:brightness-110"
              >
                <Download className="size-3.5" />
                Instalar app
              </button>
            )}

            {!app.puedeInstalar && app.ios && (
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => setAyudaIOS((v) => !v)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3.5 py-1.5 text-[12.5px] font-semibold text-primary transition hover:bg-primary/15"
                >
                  <Share className="size-3.5" />
                  Cómo instalar en iPhone
                </button>
                {ayudaIOS && (
                  <p className="mt-2 rounded-xl bg-primary/[0.05] px-3 py-2 text-[11.5px] leading-relaxed text-foreground/80">
                    Tocá <b>Compartir</b> <Share className="inline size-3" /> abajo y después{" "}
                    <b>«Agregar a inicio»</b>. Queda con el ícono de {nombre}.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
