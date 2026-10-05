import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Loader2, Lock, TimerOff, User } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

import { MarcoAcceso } from "@/components/admin/acceso";
import { roleLabel } from "@/components/admin/role";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CON_BACKEND, iniciarSesionAdmin } from "@/lib/admin/api";
import { ADMINS_INICIALES, CLAVES_PRUEBA } from "@/lib/admin/datos-ejemplo";
import { guardarSesion, motivoCierre } from "@/lib/admin/sesion";

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

function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [clave, setClave] = useState("");
  const [ver, setVer] = useState(false);
  const [recordar, setRecordar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [inactividad, setInactividad] = useState(false);

  useEffect(() => setInactividad(motivoCierre() === "inactividad"), []);

  const entrar = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !clave) return setError("Completá el correo y la contraseña.");
    setCargando(true);
    try {
      const sesion = await iniciarSesionAdmin(email, clave);
      guardarSesion(sesion, recordar);
      void navigate({ to: "/admin" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo ingresar.");
    } finally {
      setCargando(false);
    }
  };

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

      <form className="mt-6 space-y-4" onSubmit={entrar} noValidate>
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
            <Link
              to="/admin/recuperar"
              className="text-xs font-semibold text-primary hover:underline"
            >
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

        {error && (
          <p
            role="alert"
            className="rounded-xl bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive"
          >
            {error}
          </p>
        )}

        <Button type="submit" className="h-11 w-full" disabled={cargando}>
          {cargando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Entrar al panel
        </Button>
      </form>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Por seguridad, la sesión se cierra tras 30 minutos sin actividad.
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
