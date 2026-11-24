import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { escucharInstalacion, registrarServiceWorker } from "../lib/pwa";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

/* Recarga automática: cuando se publica una versión nueva, una pestaña abierta todavía pide los
   archivos de la versión anterior (que ya no existen) → "Failed to fetch dynamically imported
   module". En vez de mostrar un error, se recarga sola con la versión nueva. El mismo código corre
   antes que la app (script del <head>) para atraparlo también al navegar entre páginas. */
const PATRON_VERSION_VIEJA =
  "Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Unable to preload CSS|ChunkLoadError|Loading chunk|Loading CSS chunk|dynamically imported module";
const SCRIPT_RECARGA = `(function(){var K='ce-recarga',M=new RegExp(${JSON.stringify(PATRON_VERSION_VIEJA)},'i');
window.__ceEsVersionVieja=function(m){return M.test(String(m||''))};
window.__ceRecargar=function(){try{var t=+(sessionStorage.getItem(K)||0);if(Date.now()-t<20000)return false;sessionStorage.setItem(K,String(Date.now()))}catch(e){}location.reload();return true};
window.__ceAviso=function(){if(document.getElementById('ce-aviso')||!document.body)return;var d=document.createElement('div');d.id='ce-aviso';d.setAttribute('style','position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;padding:1.5rem;background:rgba(250,248,255,.92);backdrop-filter:blur(6px);font-family:inherit');d.innerHTML='<div style="max-width:22rem;width:100%;text-align:center;padding:2rem 1.75rem;background:#fff;border:1px solid rgba(124,58,237,.15);border-radius:1.5rem;box-shadow:0 30px 60px -35px rgba(76,29,149,.55)"><img src="/favicon.svg" alt="" style="width:48px;height:48px;margin:0 auto"/><h1 style="font-size:1.1rem;font-weight:600;margin:1rem 0 .5rem;color:#1e1b2e">Estamos actualizando la página</h1><p style="color:#6b6880;margin:0 0 1.5rem;font-size:.92rem">Revisá tu conexión y tocá «Recargar». Tus datos están guardados.</p><button style="padding:.6rem 1.4rem;border-radius:999px;border:0;font-weight:600;color:#fff;background:linear-gradient(135deg,#7c3aed,#c026d3);cursor:pointer">Recargar</button></div>';d.querySelector('button').onclick=function(){try{sessionStorage.removeItem(K)}catch(e){}location.reload()};document.body.appendChild(d)};
function vieja(){if(!window.__ceRecargar())window.__ceAviso()}
window.addEventListener('vite:preloadError',function(e){if(e.preventDefault)e.preventDefault();vieja()});
window.addEventListener('unhandledrejection',function(e){var r=e&&e.reason;if(window.__ceEsVersionVieja(r&&(r.message||r))){if(e.preventDefault)e.preventDefault();vieja()}});
window.addEventListener('error',function(e){if(window.__ceEsVersionVieja(e&&e.message))vieja()},true);})();`;

type VentanaRecarga = Window & { __ceRecargar?: () => boolean; __ceEsVersionVieja?: (m: unknown) => boolean };

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  const e = error as { message?: string; name?: string } | undefined;
  const mensaje = `${e?.message ?? ""} ${e?.name ?? ""}`;
  const versionVieja = new RegExp(PATRON_VERSION_VIEJA, "i").test(mensaje);
  const [recargando, setRecargando] = useState(true);
  useEffect(() => {
    if (!versionVieja) reportLovableError(error, { boundary: "tanstack_root_error_component" });
    const w = window as VentanaRecarga;
    // Versión nueva publicada: se recarga sola. Otro error: un reintento silencioso primero.
    if (versionVieja) {
      if (w.__ceRecargar?.() ?? (location.reload(), true)) return;
      setRecargando(false);
      return;
    }
    let clave = "ce-reintento";
    try {
      const t = Number(sessionStorage.getItem(clave) || 0);
      if (Date.now() - t > 20000) {
        sessionStorage.setItem(clave, String(Date.now()));
        router.invalidate();
        reset();
        return;
      }
    } catch {
      clave = "";
    }
    setRecargando(false);
  }, [error]); // eslint-disable-line react-hooks/exhaustive-deps

  if (recargando) return <PantallaCargando texto={versionVieja ? "Actualizando a la última versión…" : "Cargando…"} />;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top,rgba(124,58,237,0.10),transparent_60%)] bg-background px-4">
      <div className="w-full max-w-sm rounded-3xl border border-primary/15 bg-card/90 p-7 text-center shadow-[0_30px_60px_-35px_rgba(76,29,149,0.55)] backdrop-blur">
        <img src="/favicon.svg" alt="" className="mx-auto size-12" />
        <h1 className="mt-4 font-display text-lg font-semibold tracking-tight text-foreground">
          Estamos actualizando la página
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tocá «Recargar» y seguís donde estabas. Tus datos están guardados.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              try {
                sessionStorage.removeItem("ce-recarga");
                sessionStorage.removeItem("ce-reintento");
              } catch {
                /* nada */
              }
              location.reload();
            }}
            className="btn-ce"
          >
            Recargar
          </button>
          <a href="/" className="btn-ce-outline">
            Ir al inicio
          </a>
        </div>
      </div>
    </div>
  );
}

function PantallaCargando({ texto }: { texto: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
      <div className="relative grid size-16 place-items-center">
        <span className="absolute inset-0 animate-spin rounded-full border-[3px] border-primary/15 border-t-primary" />
        <img src="/favicon.svg" alt="" className="size-8" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">{texto}</p>
    </div>
  );
}

/* SEO: dirección pública del sitio (para Google, WhatsApp, Facebook, LinkedIn…). Cuando la página
   pase al dominio propio (Hostinger), se carga VITE_SITE_URL en Vercel y todo apunta ahí. */
const SITIO = ((import.meta.env["VITE_SITE_URL"] as string | undefined) ?? "https://cloud-esther-staging.vercel.app").replace(/\/$/, "");
const IMAGEN_SOCIAL = `${SITIO}/og-cloud-esther.png`;

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "theme-color", content: "#6d28d9" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      // PWA: se instala y se abre como aplicación (Android, iPhone, tablet y PC).
      { name: "application-name", content: "Cloud Esther" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "Cloud Esther" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "format-detection", content: "telephone=no" },
      { title: "Cloud Esther — Software de gestión para clínicas odontológicas" },
      {
        name: "description",
        content:
          "Cloud Esther centraliza agenda, pacientes, tratamientos y facturación de tu clínica odontológica en una sola plataforma.",
      },
      { property: "og:title", content: "Cloud Esther — Gestión inteligente para clínicas" },
      {
        property: "og:description",
        content: "Agenda, pacientes, tratamientos, finanzas y analítica en un solo lugar.",
      },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Cloud Esther" },
      { property: "og:locale", content: "es_AR" },
      { property: "og:image", content: IMAGEN_SOCIAL },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "Cloud Esther — Software de gestión para clínicas odontológicas" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Cloud Esther — Gestión inteligente para clínicas" },
      {
        name: "twitter:description",
        content: "Agenda, pacientes, odontograma 3D, IA y WhatsApp para tu clínica odontológica, en un solo lugar.",
      },
      { name: "twitter:image", content: IMAGEN_SOCIAL },
      { name: "robots", content: "index, follow, max-image-preview:large" },
      {
        name: "keywords",
        content:
          "software odontológico, sistema para clínicas dentales, agenda odontológica, odontograma 3D, historia clínica odontológica, gestión de consultorio dental, turnos online dentista, software para dentistas",
      },
      { name: "author", content: "Cloud Esther" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap",
      },
      // Favicon con el mismo símbolo de Cloud Esther que usa la app.
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "icon", href: "/favicon.ico", sizes: "any" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      // use-credentials: las direcciones de cada deploy de Vercel piden inicio de sesión; sin
      // credenciales el navegador recibe 401 al leer el manifest y no ofrece instalar la app.
      { rel: "manifest", href: "/manifest.webmanifest", crossOrigin: "use-credentials" },
    ],
    // PWA: se guarda el aviso de instalación de Android/Chrome aunque llegue antes de que la
    // app termine de cargar (si no, el botón «Instalar app» no lo encontraría).
    scripts: [
      // Antes que nada: si una versión nueva reemplazó los archivos, recarga sola (sin error).
      { children: SCRIPT_RECARGA },
      {
        children:
          "window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__ceInstalar=e;});",
      },
    ],
  }),

  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  // PWA: aviso de instalación del navegador y service worker (una sola vez).
  useEffect(() => {
    escucharInstalacion();
    registrarServiceWorker();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
    </QueryClientProvider>
  );
}
