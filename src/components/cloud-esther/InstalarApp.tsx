/* Ubicación: src/components/cloud-esther/InstalarApp.tsx
   Botón «Instalar app» de Cloud Esther (PWA), igual en todos los lugares donde aparece.
   - Android, PC y tablets con Chrome, Edge, Samsung Internet u Opera: abre el instalador nativo
     del navegador con un toque (evento beforeinstallprompt).
   - iPhone y iPad: Apple no permite que una página se instale sola; se guía paso a paso con el
     botón Compartir → «Agregar a inicio», señalando dónde está ese botón en cada dispositivo.
   - Navegadores internos (WhatsApp, Instagram…) o páginas sin https: se explica por qué no se
     puede y se ofrece abrir en Chrome / copiar el enlace. */

import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  Loader2,
  MoreVertical,
  PlusSquare,
  Share,
  ShieldAlert,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { enlaceAbrirEnChrome, useInstalarApp, type Plataforma } from "@/lib/pwa";

type Estado = "listo" | "instalando" | "instalada" | "cancelada";

export function BotonInstalarApp({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  const app = useInstalarApp();
  const [abierto, setAbierto] = useState(false);
  const [estado, setEstado] = useState<Estado>("listo");

  const instalarNativo = async () => {
    setEstado("instalando");
    try {
      const ok = await app.instalar();
      setEstado(ok ? "instalada" : "cancelada");
      if (ok) setAbierto(true);
    } catch {
      setEstado("cancelada");
      setAbierto(true);
    }
  };

  return (
    <>
      <button
        type="button"
        data-instalar-app
        onClick={() => {
          // Con el instalador del navegador disponible, se abre directo (el toque es el permiso).
          if (app.puedeInstalar) void instalarNativo();
          else setAbierto(true);
        }}
        className={className}
      >
        {children ?? (
          <>
            <Download className="size-4" />
            {app.instalada ? "App instalada" : "Instalar app"}
          </>
        )}
      </button>
      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-3xl sm:max-w-md">
          <DialogTitle className="flex items-center gap-2 font-display text-lg">
            <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-fuchsia-500 text-white">
              <Download className="size-4" />
            </span>
            Instalar Cloud Esther
          </DialogTitle>
          <DialogDescription className="sr-only">
            Pasos para instalar Cloud Esther como aplicación en este dispositivo.
          </DialogDescription>
          <ContenidoInstalacion
            instalada={app.instalada || estado === "instalada"}
            puedeInstalar={app.puedeInstalar}
            seguro={app.seguro}
            plataforma={app.plataforma}
            estado={estado}
            onInstalar={() => void instalarNativo()}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

function ContenidoInstalacion({
  instalada,
  puedeInstalar,
  seguro,
  plataforma,
  estado,
  onInstalar,
}: {
  instalada: boolean;
  puedeInstalar: boolean;
  seguro: boolean;
  plataforma: Plataforma | null;
  estado: Estado;
  onInstalar: () => void;
}) {
  if (instalada) {
    return (
      <Aviso tono="ok" icono={<CheckCircle2 className="size-5" />}>
        ¡Listo! Cloud Esther quedó instalada. Buscá el ícono violeta en la pantalla de inicio (o en
        las aplicaciones de la PC) y abrila desde ahí: se abre en pantalla completa, como una app.
      </Aviso>
    );
  }
  if (!plataforma) return null;

  if (!seguro) {
    return (
      <Aviso tono="alerta" icono={<ShieldAlert className="size-5" />}>
        Esta dirección no es segura ({window.location.origin}). Android, iPhone y la PC solo dejan
        instalar aplicaciones desde una dirección con <b>https</b>, como la publicada en Vercel.
        Abrí Cloud Esther desde esa dirección y tocá «Instalar app» otra vez.
      </Aviso>
    );
  }

  // El instalador del navegador está listo (por ejemplo, llegó mientras se leían los pasos).
  if (puedeInstalar) {
    return (
      <div className="space-y-3">
        {estado === "cancelada" && (
          <p className="text-sm text-muted-foreground">
            Cancelaste la instalación. Podés volver a intentarlo cuando quieras.
          </p>
        )}
        <button
          type="button"
          onClick={onInstalar}
          disabled={estado === "instalando"}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-fuchsia-500 text-sm font-bold text-white shadow-lg disabled:opacity-70"
        >
          {estado === "instalando" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
          Instalar ahora
        </button>
      </div>
    );
  }

  if (plataforma.integrado) return <DesdeNavegadorInterno plataforma={plataforma} />;
  if (plataforma.so === "ios") return <PasosIOS plataforma={plataforma} />;
  return <PasosSinInstalador plataforma={plataforma} />;
}

/* iPhone / iPad: Safari (y desde iOS 16.4 también Chrome y Edge) agregan la app desde Compartir. */
function PasosIOS({ plataforma }: { plataforma: Plataforma }) {
  const enSafari = plataforma.navegador === "safari";
  // En el iPhone, Safari tiene el botón Compartir abajo; en el iPad y en Chrome/Edge, arriba.
  const arriba = plataforma.tablet || !enSafari;
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        En {plataforma.tablet ? "el iPad" : "el iPhone"} se instala en 3 toques desde{" "}
        {enSafari ? "Safari" : "este navegador"}:
      </p>
      <Pasos
        items={[
          <>
            Tocá <Chip icono={<Share className="size-3.5" />}>Compartir</Chip>{" "}
            {enSafari
              ? arriba
                ? "arriba a la derecha, junto a la barra de direcciones."
                : "en la barra de abajo de la pantalla."
              : "en la barra de direcciones (arriba a la derecha)."}
          </>,
          <>
            Deslizá y elegí{" "}
            <Chip icono={<PlusSquare className="size-3.5" />}>Agregar a inicio</Chip>.
          </>,
          <>
            Tocá <b>Agregar</b>. El ícono de Cloud Esther aparece en la pantalla de inicio.
          </>,
        ]}
      />
      {!enSafari && (
        <p className="text-xs text-muted-foreground">
          ¿No ves «Agregar a inicio»? Abrí esta página en <b>Safari</b> (necesita iOS 16.4 o más
          nuevo para hacerlo desde otros navegadores).
        </p>
      )}
      <div
        aria-hidden
        className={`flex items-center justify-center gap-1.5 text-xs font-semibold text-primary ${arriba ? "" : "flex-col-reverse"}`}
      >
        {arriba ? <ArrowUp className="size-5 animate-bounce" /> : null}
        <span>El botón Compartir está {arriba ? "arriba" : "abajo"}</span>
        {!arriba ? <ArrowDown className="size-5 animate-bounce" /> : null}
      </div>
    </div>
  );
}

/* Android o PC sin instalador del navegador todavía (Firefox, primera carga, etc.). */
function PasosSinInstalador({ plataforma }: { plataforma: Plataforma }) {
  const [esperando, setEsperando] = useState(true);
  useEffect(() => {
    const id = window.setTimeout(() => setEsperando(false), 2500);
    return () => window.clearTimeout(id);
  }, []);

  if (esperando && plataforma.navegador !== "firefox" && plataforma.navegador !== "safari") {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin text-primary" /> Preparando la instalación…
      </p>
    );
  }

  if (plataforma.so === "android") {
    if (plataforma.navegador === "firefox") {
      return (
        <Pasos
          items={[
            <>
              Tocá el menú <Chip icono={<MoreVertical className="size-3.5" />}>⋮</Chip>.
            </>,
            <>
              Elegí <b>Instalar</b> (o «Agregar a la pantalla de inicio»).
            </>,
          ]}
        />
      );
    }
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Tu navegador todavía no ofreció el instalador automático. Instalala desde el menú:
        </p>
        <Pasos
          items={[
            <>
              Tocá el menú <Chip icono={<MoreVertical className="size-3.5" />}>⋮</Chip> arriba a la
              derecha.
            </>,
            <>
              Elegí <b>Instalar app</b> (o «Agregar a la pantalla principal» → <b>Instalar</b>).
            </>,
          ]}
        />
        <p className="text-xs text-muted-foreground">
          Si no aparece, recargá la página una vez y volvé a tocar «Instalar app».
        </p>
      </div>
    );
  }

  // PC / Mac
  if (plataforma.navegador === "safari") {
    return (
      <Pasos
        items={[
          <>
            En la barra de menú de Safari, abrí <b>Archivo</b>.
          </>,
          <>
            Elegí <b>Agregar al Dock</b> (macOS Sonoma o más nuevo).
          </>,
        ]}
      />
    );
  }
  if (plataforma.navegador === "firefox") {
    return (
      <Aviso tono="info" icono={<ExternalLink className="size-5" />}>
        Firefox para PC no instala aplicaciones web. Abrí Cloud Esther en <b>Chrome</b> o{" "}
        <b>Edge</b> y tocá «Instalar app».
      </Aviso>
    );
  }
  return (
    <div className="space-y-3">
      <Pasos
        items={[
          <>
            Hacé clic en el ícono <Chip icono={<Download className="size-3.5" />}>Instalar</Chip> a
            la derecha de la barra de direcciones.
          </>,
          <>
            O abrí el menú <b>⋮</b> → «Transmitir, guardar y compartir» →{" "}
            <b>Instalar página como app</b>.
          </>,
        ]}
      />
      <p className="text-xs text-muted-foreground">
        Si no aparece, recargá la página una vez y volvé a tocar «Instalar app».
      </p>
    </div>
  );
}

/* WhatsApp, Instagram, Facebook…: su navegador interno no permite instalar aplicaciones. */
function DesdeNavegadorInterno({ plataforma }: { plataforma: Plataforma }) {
  const [copiado, setCopiado] = useState(false);
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiado(true);
    } catch {
      window.prompt("Copiá este enlace:", window.location.href);
    }
  };
  return (
    <div className="space-y-3">
      <Aviso tono="info" icono={<ExternalLink className="size-5" />}>
        Estás dentro del navegador de otra aplicación (por ejemplo, WhatsApp o Instagram) y desde
        ahí no se puede instalar. Abrila en {plataforma.so === "ios" ? "Safari" : "Chrome"} y tocá
        «Instalar app».
      </Aviso>
      {plataforma.so === "android" && (
        <a
          href={enlaceAbrirEnChrome()}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-fuchsia-500 text-sm font-bold text-white shadow-lg"
        >
          <ExternalLink className="size-4" /> Abrir en Chrome
        </a>
      )}
      <button
        type="button"
        onClick={() => void copiar()}
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-primary/20 text-sm font-semibold text-primary"
      >
        <Copy className="size-4" /> {copiado ? "Enlace copiado" : "Copiar enlace"}
      </button>
    </div>
  );
}

function Pasos({ items }: { items: ReactNode[] }) {
  return (
    <ol className="space-y-2.5">
      {items.map((it, i) => (
        <li
          key={i}
          className="flex gap-3 rounded-2xl bg-primary/5 p-3 text-sm ring-1 ring-primary/10"
        >
          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-fuchsia-500 text-xs font-bold text-white">
            {i + 1}
          </span>
          <span className="min-w-0 leading-relaxed">{it}</span>
        </li>
      ))}
    </ol>
  );
}

function Chip({ icono, children }: { icono: ReactNode; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg bg-card px-1.5 py-0.5 align-middle text-xs font-semibold text-primary ring-1 ring-primary/20">
      {icono}
      {children}
    </span>
  );
}

function Aviso({
  tono,
  icono,
  children,
}: {
  tono: "ok" | "alerta" | "info";
  icono: ReactNode;
  children: ReactNode;
}) {
  const estilos = {
    ok: "bg-emerald-500/10 text-emerald-800 ring-emerald-500/25 dark:text-emerald-200",
    alerta: "bg-amber-500/10 text-amber-900 ring-amber-500/30 dark:text-amber-100",
    info: "bg-primary/5 text-foreground ring-primary/15",
  }[tono];
  return (
    <div className={`flex gap-3 rounded-2xl p-3.5 text-sm leading-relaxed ring-1 ${estilos}`}>
      <span className="mt-0.5 shrink-0">{icono}</span>
      <p className="min-w-0">{children}</p>
    </div>
  );
}
