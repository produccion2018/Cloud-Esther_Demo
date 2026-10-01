import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Clock, LogIn, Sparkles, TimerOff } from "lucide-react";
import { cerrarSesion, useSesion } from "@/lib/cloud-esther/auth-store";
import {
  AVISO_DEMO_MS,
  formatearRestante,
  hayIngresoDemo,
  iniciarIngresoDemo,
  terminarIngresoDemo,
  useTiempoDemo,
} from "@/lib/cloud-esther/demo-seguimiento";

/* Ubicación: src/components/cloud-esther/ControlDemo.tsx
   Control de la sesión de demo (30 minutos por ingreso):
   - Contador visible en el menú lateral.
   - Aviso cuando quedan 5 minutos.
   - Al vencer, se cierra la sesión y se ofrece volver a entrar o ver los planes. */

const KEY_EXPIRADA = "cloud-esther:demo:expirada";

/** Contador para el menú lateral (solo con una cuenta de demo). */
export function ContadorDemo() {
  const { sesion } = useSesion();
  const restante = useTiempoDemo();
  if (sesion?.tipo !== "demo" || restante === null) return null;
  const poco = restante <= AVISO_DEMO_MS;
  return (
    <p
      className={`mt-2 flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-semibold tabular-nums ${
        poco
          ? "bg-amber-400/20 text-amber-700 dark:text-amber-300"
          : "bg-sidebar-accent/60 text-sidebar-foreground/75"
      }`}
      title="Cada ingreso al demo dura 30 minutos"
    >
      <Clock className="size-3.5" />
      Tu demo: {formatearRestante(restante)}
    </p>
  );
}

/** Aviso a los 5 minutos y cierre al vencer. Se monta una sola vez en el AppShell. */
export function ControlSesionDemo() {
  const { sesion } = useSesion();
  const restante = useTiempoDemo();
  const [avisoVisto, setAvisoVisto] = useState(false);
  const [expirada, setExpirada] = useState(false);

  useEffect(() => {
    try {
      setExpirada(window.sessionStorage.getItem(KEY_EXPIRADA) === "1");
    } catch {
      /* sin almacenamiento */
    }
  }, []);

  // Sesión de demo abierta antes de existir el límite: empieza a contar desde ahora.
  useEffect(() => {
    if (sesion?.tipo === "demo" && !hayIngresoDemo()) {
      iniciarIngresoDemo({
        email: sesion.usuario.email,
        nombre: sesion.usuario.nombre,
        clinica: sesion.clinica.nombre,
      });
    }
  }, [sesion]);

  useEffect(() => {
    if (sesion?.tipo !== "demo" || restante === null || restante > 0) return;
    terminarIngresoDemo("expiracion");
    cerrarSesion();
    try {
      window.sessionStorage.setItem(KEY_EXPIRADA, "1");
    } catch {
      /* sin almacenamiento */
    }
    setExpirada(true);
  }, [sesion, restante]);

  const cerrarAviso = () => {
    try {
      window.sessionStorage.removeItem(KEY_EXPIRADA);
    } catch {
      /* sin almacenamiento */
    }
    setExpirada(false);
  };

  if (expirada) {
    return (
      <div
        className="fixed inset-0 z-[90] grid place-items-center bg-black/55 p-4 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="demo-expirada"
      >
        <div className="w-full max-w-md overflow-hidden rounded-[28px] border border-primary/20 bg-card text-center shadow-2xl">
          <div className="h-1.5 bg-gradient-to-r from-primary via-primary/70 to-pink-400/70" />
          <div className="p-7">
            <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
              <TimerOff className="size-6" />
            </span>
            <h2 id="demo-expirada" className="mt-4 text-xl font-bold tracking-tight">
              Tu sesión de demo terminó
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Cada ingreso al demo dura 30 minutos. Podés volver a entrar con tu cuenta cuando
              quieras: lo que cargaste sigue guardado.
            </p>
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              <Link to={"/login" as never} onClick={cerrarAviso} className="btn-ce !h-10">
                <LogIn className="size-4" />
                Volver a entrar
              </Link>
              <Link to={"/planes" as never} onClick={cerrarAviso} className="btn-ce-outline !h-10">
                <Sparkles className="size-4" />
                Ver planes
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (
    sesion?.tipo === "demo" &&
    restante !== null &&
    restante > 0 &&
    restante <= AVISO_DEMO_MS &&
    !avisoVisto
  ) {
    return (
      <div className="fixed inset-x-0 top-3 z-[80] flex justify-center px-4" role="status">
        <div className="flex max-w-xl flex-wrap items-center gap-3 rounded-2xl border border-amber-400/40 bg-card px-4 py-3 shadow-xl">
          <span className="grid size-9 place-items-center rounded-xl bg-amber-400/20 text-amber-700 dark:text-amber-300">
            <Clock className="size-4" />
          </span>
          <p className="min-w-0 flex-1 text-sm">
            <b>Tu demo termina en {formatearRestante(restante)}.</b>{" "}
            <span className="text-muted-foreground">
              Después podés volver a entrar con tu cuenta.
            </span>
          </p>
          <button type="button" onClick={() => setAvisoVisto(true)} className="btn-ce-outline">
            Entendido
          </button>
        </div>
      </div>
    );
  }

  return null;
}
