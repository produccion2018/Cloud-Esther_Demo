import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Check,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  ShieldCheck,
  Smartphone,
  TimerOff,
  User,
} from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState, type FormEvent } from "react";

import { MarcoAcceso } from "@/components/admin/acceso";
import { roleLabel } from "@/components/admin/role";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CON_BACKEND,
  completar2faAlta,
  completar2faCodigo,
  iniciarSesionAdmin,
} from "@/lib/admin/api";
import { ADMINS_INICIALES, CLAVES_PRUEBA } from "@/lib/admin/datos-ejemplo";
import { guardarSesion, motivoCierre } from "@/lib/admin/sesion";
import type { SesionAdmin } from "@/lib/admin/tipos";

export const Route = createFileRoute("/admin/login")({
  head: () => ({
    meta: [
      { title: "Acceso interno — Cloud Esther Administración" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "description", content: "Acceso restringido al panel de administración interna." },
    ],
  }),
  component: AdminLogin,
});

// Dónde estamos del ingreso:
//  clave        → correo + contraseña
//  alta         → primera vez: escanear el QR y confirmar un código
//  recuperacion → mostrar los códigos de recuperación (una sola vez)
//  codigo       → de siempre: pedir el código del momento
type Paso = "clave" | "alta" | "recuperacion" | "codigo";

function AdminLogin() {
  const navigate = useNavigate();
  const [paso, setPaso] = useState<Paso>("clave");

  // Paso 1: correo y contraseña
  const [email, setEmail] = useState("");
  const [clave, setClave] = useState("");
  const [ver, setVer] = useState(false);
  const [recordar, setRecordar] = useState(false);
  const [inactividad, setInactividad] = useState(false);

  // Paso 2: datos del 2FA
  const [desafio, setDesafio] = useState("");
  const [secreto, setSecreto] = useState("");
  const [qr, setQr] = useState("");
  const [codigo, setCodigo] = useState("");
  const [recuperacion, setRecuperacion] = useState<string[]>([]);
  const [guardados, setGuardados] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [sesionPendiente, setSesionPendiente] = useState<SesionAdmin | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => setInactividad(motivoCierre() === "inactividad"), []);

  const entrarConSesion = (sesion: SesionAdmin) => {
    guardarSesion(sesion, recordar);
    void navigate({ to: "/admin" });
  };

  // ---- Paso 1: correo + contraseña ----
  const enviarClave = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !clave) return setError("Completá el correo y la contraseña.");
    setCargando(true);
    try {
      const r = await iniciarSesionAdmin(email, clave);
      if (r.estado === "ok") {
        entrarConSesion(r.sesion); // modo demo (sin backend)
        return;
      }
      setDesafio(r.desafio);
      setCodigo("");
      if (r.estado === "2fa_alta") {
        setSecreto(r.secreto);
        try {
          setQr(await QRCode.toDataURL(r.otpauth, { margin: 1, width: 220 }));
        } catch {
          setQr(""); // si no se puede dibujar el QR, queda la carga manual del secreto
        }
        setPaso("alta");
      } else {
        setPaso("codigo");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo ingresar.");
    } finally {
      setCargando(false);
    }
  };

  // ---- Paso 2 (primera vez): confirmar el QR ----
  const confirmarAlta = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (codigo.trim().length < 6) return setError("Escribí el código de 6 dígitos de tu app.");
    setCargando(true);
    try {
      const { sesion, codigosRecuperacion } = await completar2faAlta(desafio, codigo);
      setSesionPendiente(sesion);
      setRecuperacion(codigosRecuperacion);
      setPaso("recuperacion");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo activar el 2FA.");
    } finally {
      setCargando(false);
    }
  };

  // ---- Paso 2 (de siempre): código del momento ----
  const confirmarCodigo = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (codigo.trim().length < 6) return setError("Escribí el código de tu app de autenticación.");
    setCargando(true);
    try {
      const sesion = await completar2faCodigo(desafio, codigo);
      entrarConSesion(sesion);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo verificar el código.");
    } finally {
      setCargando(false);
    }
  };

  const volverAInicio = () => {
    setPaso("clave");
    setError(null);
    setCodigo("");
    setClave("");
    setDesafio("");
  };

  const copiarRecuperacion = async () => {
    try {
      await navigator.clipboard.writeText(recuperacion.join("\n"));
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      /* si no se puede copiar, igual están a la vista */
    }
  };

  const avisoError = error && (
    <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
      {error}
    </p>
  );

  // ============ PASO: código del momento (ya tiene 2FA) ============
  if (paso === "codigo") {
    return (
      <MarcoAcceso>
        <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight">Código de verificación</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Abrí tu app de autenticación y escribí el código de 6 dígitos.
        </p>
        <form className="mt-6 space-y-4" onSubmit={confirmarCodigo} noValidate>
          <div className="space-y-2">
            <Label htmlFor="codigo">Código</Label>
            <Input
              id="codigo"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              placeholder="123456"
              className="h-12 text-center text-2xl tracking-[0.4em]"
            />
            <p className="text-xs text-muted-foreground">
              ¿Perdiste el teléfono? Escribí uno de tus códigos de recuperación.
            </p>
          </div>
          {avisoError}
          <Button type="submit" className="h-11 w-full" disabled={cargando}>
            {cargando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Entrar al panel
          </Button>
          <button
            type="button"
            onClick={volverAInicio}
            className="w-full text-center text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            Volver
          </button>
        </form>
      </MarcoAcceso>
    );
  }

  // ============ PASO: alta del 2FA (primera vez) ============
  if (paso === "alta") {
    const secretoGrupos = secreto.replace(/(.{4})/g, "$1 ").trim();
    return (
      <MarcoAcceso>
        <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Smartphone className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight">Activá el doble factor</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Por seguridad, el panel pide un segundo factor. Es obligatorio y se configura una sola vez.
        </p>

        <ol className="mt-5 space-y-3 text-sm">
          <li className="flex gap-2">
            <span className="font-bold text-primary">1.</span>
            Instalá <b>Google Authenticator</b> (o Authy / Microsoft Authenticator) en tu teléfono.
          </li>
          <li className="flex gap-2">
            <span className="font-bold text-primary">2.</span>
            En la app, tocá <b>“+”</b> → <b>Escanear código QR</b> y apuntá a este QR:
          </li>
        </ol>

        <div className="mt-4 flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-4">
          {qr ? (
            <img src={qr} alt="Código QR para configurar el 2FA" className="h-[200px] w-[200px] rounded-lg" />
          ) : (
            <p className="text-center text-xs text-muted-foreground">
              No se pudo dibujar el QR. Cargá la clave de abajo a mano en tu app.
            </p>
          )}
          <div className="w-full text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              ¿No podés escanear? Cargá esta clave:
            </p>
            <p className="mt-1 select-all break-all font-mono text-sm font-semibold">{secretoGrupos}</p>
          </div>
        </div>

        <form className="mt-5 space-y-4" onSubmit={confirmarAlta} noValidate>
          <div className="space-y-2">
            <Label htmlFor="codigo">3. Escribí el código que muestra la app</Label>
            <Input
              id="codigo"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              placeholder="123456"
              className="h-12 text-center text-2xl tracking-[0.4em]"
            />
          </div>
          {avisoError}
          <Button type="submit" className="h-11 w-full" disabled={cargando}>
            {cargando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Activar y entrar
          </Button>
          <button
            type="button"
            onClick={volverAInicio}
            className="w-full text-center text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            Volver
          </button>
        </form>
      </MarcoAcceso>
    );
  }

  // ============ PASO: códigos de recuperación (una sola vez) ============
  if (paso === "recuperacion") {
    return (
      <MarcoAcceso>
        <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <KeyRound className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight">Guardá tus códigos de recuperación</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Si perdés el teléfono, cada uno de estos códigos te deja entrar <b>una vez</b>. Guardalos en un
          lugar seguro. <b>No se vuelven a mostrar.</b>
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl border border-border bg-card p-4">
          {recuperacion.map((c) => (
            <span key={c} className="select-all text-center font-mono text-sm font-semibold">
              {c}
            </span>
          ))}
        </div>

        <button
          type="button"
          onClick={copiarRecuperacion}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-border py-2 text-sm font-semibold hover:bg-muted"
        >
          {copiado ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
          {copiado ? "Copiados" : "Copiar los códigos"}
        </button>

        <label className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Checkbox checked={guardados} onCheckedChange={(v) => setGuardados(v === true)} />
          Ya los guardé en un lugar seguro
        </label>

        <Button
          type="button"
          className="mt-4 h-11 w-full"
          disabled={!guardados || !sesionPendiente}
          onClick={() => sesionPendiente && entrarConSesion(sesionPendiente)}
        >
          Entrar al panel
        </Button>
      </MarcoAcceso>
    );
  }

  // ============ PASO: correo + contraseña (inicial) ============
  return (
    <MarcoAcceso>
      <h1 className="text-2xl font-extrabold tracking-tight">Ingreso del equipo</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Entrá con el correo y la contraseña de tu acceso interno.
      </p>

      {inactividad && (
        <p className="mt-5 flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/15 px-3 py-2.5 text-xs font-medium text-warning-foreground">
          <TimerOff className="mt-0.5 h-4 w-4 shrink-0" />
          Tu sesión se cerró después de 30 minutos sin actividad. Volvé a ingresar.
        </p>
      )}

      <form className="mt-6 space-y-4" onSubmit={enviarClave} noValidate>
        <div className="space-y-2">
          <Label htmlFor="email">Correo</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nombre@cloudesther.com"
              className="h-11 pl-9"
            />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="clave">Contraseña</Label>
            <Link to="/admin/recuperar" className="text-xs font-semibold text-primary hover:underline">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="clave"
              type={ver ? "text" : "password"}
              autoComplete="current-password"
              value={clave}
              onChange={(e) => setClave(e.target.value)}
              placeholder="Tu contraseña"
              className="h-11 px-9"
            />
            <button
              type="button"
              onClick={() => setVer((v) => !v)}
              aria-label={ver ? "Ocultar contraseña" : "Mostrar contraseña"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {ver ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Checkbox checked={recordar} onCheckedChange={(v) => setRecordar(v === true)} />
          Mantener la sesión en este equipo
        </label>

        {avisoError}

        <Button type="submit" className="h-11 w-full" disabled={cargando}>
          {cargando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Continuar
        </Button>
      </form>

      <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5" />
        Protegido con verificación en dos pasos.
      </p>

      {/* Cuentas de prueba: solo en desarrollo y sin backend conectado. */}
      {import.meta.env.DEV && !CON_BACKEND && (
        <div className="mt-6 rounded-2xl border border-dashed border-primary/25 bg-primary/[0.03] p-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-primary">
            Cuentas de prueba (sin backend)
          </p>
          <div className="mt-2 grid gap-1.5">
            {ADMINS_INICIALES.map((a) => (
              <button
                key={a.email}
                type="button"
                onClick={() => {
                  setEmail(a.email);
                  setClave(CLAVES_PRUEBA[a.email] ?? "");
                }}
                className="flex items-center justify-between rounded-lg bg-card px-2.5 py-1.5 text-left text-xs ring-1 ring-border transition hover:ring-primary/40"
              >
                <span className="font-semibold">{roleLabel[a.rol]}</span>
                <span className="text-muted-foreground">{a.email}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </MarcoAcceso>
  );
}
