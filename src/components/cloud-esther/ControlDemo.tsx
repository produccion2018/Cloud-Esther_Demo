import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  CheckCircle2,
  Clock,
  Crown,
  Hourglass,
  LogIn,
  MessageSquare,
  Sparkles,
  TimerOff,
  UserPlus,
} from "lucide-react";
import { cerrarSesion, useSesion } from "@/lib/cloud-esther/auth-store";
import {
  avisoDemoMs,
  configDemo,
  contactoVisitante,
  esperaDemoHasta,
  formatearRestante,
  hayIngresoDemo,
  identidadVisitante,
  iniciarIngresoDemo,
  registrarSolicitudDemo,
  salirModoDueno,
  terminarIngresoDemo,
  useModoDueno,
  useTiempoDemo,
} from "@/lib/cloud-esther/demo-seguimiento";
import {
  DEMO_EN_SERVIDOR,
  demoServidorActivo,
  enviarPedidoDemo,
} from "@/lib/cloud-esther/demo-servidor";

/* Ubicación: src/components/cloud-esther/ControlDemo.tsx
   Control del uso del demo (30 minutos por ingreso), con cuenta o sin cuenta:
   - Contador visible en el menú lateral y aviso cuando quedan 5 minutos.
   - Al vencer, se cierra el acceso y hay un período de espera antes de volver a entrar.
   - Se ofrecen pedir información comercial, ver planes o crear una cuenta (queda registrado).
   TODO backend: el servidor valida la duración y la espera (el navegador solo acompaña). */

/** Contador para el menú lateral. */
export function ContadorDemo() {
  const { sesion } = useSesion();
  const restante = useTiempoDemo();
  const dueno = useModoDueno();
  if (dueno) {
    return (
      <div className="mt-2">
        <p
          className="flex items-center justify-center gap-1.5 rounded-lg bg-sidebar-accent/60 px-2 py-1.5 text-[11px] font-semibold text-sidebar-foreground/80"
          title="Entraste como dueño: sin límite de tiempo y sin registrarse como demo"
        >
          <Crown className="size-3.5" />
          Modo dueño · sin límite
        </p>
        <button
          type="button"
          onClick={salirModoDueno}
          className="mt-1 w-full text-center text-[10px] text-sidebar-foreground/50 underline-offset-2 hover:underline"
        >
          Salir del modo dueño
        </button>
      </div>
    );
  }
  if ((sesion && sesion.tipo !== "demo") || restante === null) return null;
  const poco = restante <= avisoDemoMs();
  return (
    <div className="mt-2">
      <p
        className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-semibold tabular-nums ${
          poco
            ? "bg-amber-400/20 text-amber-700 dark:text-amber-300"
            : "bg-sidebar-accent/60 text-sidebar-foreground/75"
        }`}
        title={
          sesion && demoServidorActivo(sesion.usuario.email)
            ? "El tiempo de tu demo lo define el equipo de Cloud Esther"
            : `Cada ingreso al demo dura ${configDemo().minutos} minutos`
        }
      >
        <Clock className="size-3.5" />
        Tu demo: {formatearRestante(restante)}
      </p>
      <p className="mt-1 text-center text-[10px] leading-snug text-sidebar-foreground/50">
        Registramos el uso del demo (tiempo y módulos) para el seguimiento comercial. No se
        registran datos de pacientes.
      </p>
    </div>
  );
}

/** Aviso a los 5 minutos, cierre al vencer y período de espera. Se monta una vez en el AppShell. */
export function ControlSesionDemo() {
  const { sesion } = useSesion();
  const restante = useTiempoDemo();
  const dueno = useModoDueno();
  const [avisoVisto, setAvisoVisto] = useState(false);
  const [espera, setEspera] = useState<number | null>(null);
  const conCuenta = sesion?.tipo === "demo" && !dueno;
  const sinCuenta = !sesion && !dueno;
  // Demo controlado por el servidor: al vencer NO se cierra la sesión; se muestra el aviso
  // hasta que el equipo le dé más tiempo (o contrate un plan).
  const enServidor = conCuenta && !!sesion && demoServidorActivo(sesion.usuario.email);

  // Al entrar: si esta identidad está en período de espera, se muestra el aviso; si no, empieza
  // el ingreso (también para quien recorre el demo sin cuenta).
  useEffect(() => {
    if (!conCuenta && !sinCuenta) return;
    const identidad = conCuenta ? (sesion?.usuario.email ?? "") : identidadVisitante();
    const hasta =
      esperaDemoHasta(identidad) ?? (sinCuenta ? esperaDemoHasta(identidadVisitante()) : null);
    if (hasta) {
      setEspera(hasta);
      return;
    }
    if (!hayIngresoDemo()) {
      iniciarIngresoDemo(
        conCuenta && sesion
          ? {
              email: sesion.usuario.email,
              nombre: sesion.usuario.nombre,
              clinica: sesion.clinica.nombre,
            }
          : contactoVisitante(),
      );
    }
  }, [sesion, conCuenta, sinCuenta]);

  // Vencimiento.
  useEffect(() => {
    if (enServidor) return;
    if ((!conCuenta && !sinCuenta) || restante === null || restante > 0) return;
    terminarIngresoDemo("expiracion");
    if (conCuenta) cerrarSesion("Vencida");
    setEspera(esperaDemoHasta(identidadVisitante()));
  }, [restante, conCuenta, sinCuenta, enServidor]);

  // Con servidor, el demo es con registro: así cada demo tiene su reloj y el equipo lo ve.
  // (Las cuentas creadas antes en este navegador, sin enlace del servidor, también pasan por acá.)
  if (DEMO_EN_SERVIDOR && !dueno && (sinCuenta || (conCuenta && !enServidor))) {
    return <RegistroRequerido />;
  }

  if (enServidor && restante === 0) return <DemoVencidoServidor />;

  if (espera) {
    const hora = new Date(espera).toLocaleTimeString("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
    });
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
              Terminó tu tiempo de prueba
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Cada ingreso al demo dura {configDemo().minutos} minutos. Podés volver a probar a
              partir de las <b className="text-foreground">{hora.replace(/\.$/, "")}</b>. Si querés
              seguir ahora, te contamos los planes o te ayudamos a contratar.
            </p>
            <div className="mt-6 grid gap-2">
              <Link
                to={"/formulario" as never}
                onClick={() => registrarSolicitudDemo("Información comercial")}
                className="btn-ce !h-10"
              >
                <MessageSquare className="size-4" />
                Pedir información comercial
              </Link>
              <div className="grid gap-2 sm:grid-cols-2">
                <Link
                  to={"/planes" as never}
                  onClick={() => registrarSolicitudDemo("Contratación")}
                  className="btn-ce-outline !h-10"
                >
                  <Sparkles className="size-4" />
                  Ver planes y contratar
                </Link>
                {sinCuenta ? (
                  <Link to={"/registro" as never} className="btn-ce-outline !h-10">
                    <UserPlus className="size-4" />
                    Crear una cuenta
                  </Link>
                ) : (
                  <Link to={"/" as never} className="btn-ce-outline !h-10">
                    <LogIn className="size-4" />
                    Volver al inicio
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (
    (conCuenta || sinCuenta) &&
    restante !== null &&
    restante > 0 &&
    restante <= avisoDemoMs() &&
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
              {enServidor
                ? "Si necesitás más tiempo, lo vas a poder pedir desde acá."
                : "Después hay una espera para volver a entrar."}
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

/** Aviso cuando termina un demo controlado por el servidor: pedir más tiempo o ver planes.
 *  No borra nada: si el equipo le da más tiempo, el aviso desaparece solo. */
function DemoVencidoServidor() {
  const [estado, setEstado] = useState<"inicio" | "enviando" | "pedido" | "error">("inicio");
  const [error, setError] = useState("");
  const pedirTiempo = async () => {
    setEstado("enviando");
    const r = await enviarPedidoDemo("extension");
    if (r.ok) setEstado("pedido");
    else {
      setError(r.error ?? "No se pudo enviar el pedido.");
      setEstado("error");
    }
  };
  return (
    <div
      className="fixed inset-0 z-[90] grid place-items-center bg-black/55 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="demo-terminado"
    >
      <div className="w-full max-w-md overflow-hidden rounded-[28px] border border-primary/20 bg-card text-center shadow-2xl">
        <div className="h-1.5 bg-gradient-to-r from-primary via-primary/70 to-pink-400/70" />
        <div className="p-7">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
            <TimerOff className="size-6" />
          </span>
          <h2 id="demo-terminado" className="mt-4 text-xl font-bold tracking-tight">
            Terminó el tiempo de tu demo
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Podés pedirle más tiempo al equipo de Cloud Esther o contratar un plan. Lo que cargaste
            en el demo no se borra.
          </p>
          {estado === "pedido" ? (
            <p className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-success/10 px-3 py-2.5 text-sm font-semibold text-success">
              <CheckCircle2 className="size-4" /> Pedido enviado. Te avisamos cuando tengas más
              tiempo.
            </p>
          ) : null}
          {estado === "error" ? (
            <p role="alert" className="mt-5 text-sm font-medium text-destructive">
              {error}
            </p>
          ) : null}
          <div className="mt-6 grid gap-2">
            {estado !== "pedido" && (
              <button
                type="button"
                className="btn-ce !h-10"
                disabled={estado === "enviando"}
                onClick={() => void pedirTiempo()}
              >
                <Hourglass className="size-4" />
                {estado === "enviando" ? "Enviando…" : "Pedir más tiempo"}
              </button>
            )}
            <div className="grid gap-2 sm:grid-cols-2">
              <Link
                to={"/planes" as never}
                onClick={() => registrarSolicitudDemo("Contratación")}
                className="btn-ce-outline !h-10"
              >
                <Sparkles className="size-4" />
                Ver planes y contratar
              </Link>
              <Link
                to={"/formulario" as never}
                onClick={() => registrarSolicitudDemo("Información comercial")}
                className="btn-ce-outline !h-10"
              >
                <MessageSquare className="size-4" />
                Pedir información
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Con servidor: para usar el demo hay que registrarse (gratis) o entrar con el enlace del demo. */
function RegistroRequerido() {
  return (
    <div
      className="fixed inset-0 z-[90] grid place-items-center bg-black/55 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="demo-registro"
    >
      <div className="w-full max-w-md overflow-hidden rounded-[28px] border border-primary/20 bg-card text-center shadow-2xl">
        <div className="h-1.5 bg-gradient-to-r from-primary via-primary/70 to-pink-400/70" />
        <div className="p-7">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Sparkles className="size-6" />
          </span>
          <h2 id="demo-registro" className="mt-4 text-xl font-bold tracking-tight">
            Probá Cloud Esther gratis
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Para usar el demo dejanos tus datos: es gratis y entrás enseguida. Si ya tenés un demo,
            entrá con tu correo.
          </p>
          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            <Link to={"/registro" as never} className="btn-ce !h-10">
              <UserPlus className="size-4" />
              Registrarme gratis
            </Link>
            <Link to={"/login" as never} className="btn-ce-outline !h-10">
              <LogIn className="size-4" />
              Ya tengo un demo
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
