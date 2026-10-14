import { Building2, Check, Eye, EyeOff, KeyRound, Loader2, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";

import { MensajeError } from "@/components/clinica/marco";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { cambiarClaveClinica, problemaClaveClinica, type SesionClinica } from "@/lib/clinica/api";

/* Ubicación: src/components/clinica/mi-cuenta.tsx
   MI CUENTA: mi tarjeta (nombre, rol, correo, clínica) y cambiar mi contraseña,
   con medidor de seguridad. Al cambiarla se cierran mis otras sesiones abiertas. */

const COLOR_ROL: Record<string, string> = {
  admin: "from-[oklch(0.42_0.2_292)] to-[oklch(0.62_0.21_302)]",
  odontologo: "from-sky-700 to-sky-500",
  secretaria: "from-amber-600 to-amber-400",
  asistente: "from-emerald-700 to-emerald-500",
};

const iniciales = (n: string) =>
  n
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "?";

function reglas(c: string) {
  return [
    { texto: "10 caracteres o más", ok: c.length >= 10 },
    { texto: "Mayúsculas y minúsculas", ok: /[A-Z]/.test(c) && /[a-z]/.test(c) },
    { texto: "Al menos un número", ok: /[0-9]/.test(c) },
  ];
}

// Medidor: cuántas reglas cumple + un punto extra si es larga y tiene un símbolo
function fuerza(c: string): { nivel: number; texto: string; color: string } {
  if (!c) return { nivel: 0, texto: "", color: "" };
  const base = reglas(c).filter((r) => r.ok).length;
  const extra = c.length >= 14 && /[^A-Za-z0-9]/.test(c) ? 1 : 0;
  const nivel = base + extra;
  if (nivel <= 1) return { nivel: 1, texto: "Débil", color: "bg-destructive" };
  if (nivel === 2) return { nivel: 2, texto: "Regular", color: "bg-amber-500" };
  if (nivel === 3) return { nivel: 3, texto: "Buena", color: "bg-emerald-500" };
  return { nivel: 4, texto: "Muy segura", color: "bg-emerald-600" };
}

export function MiCuentaClinica({ slug, sesion }: { slug: string; sesion: SesionClinica }) {
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [repetir, setRepetir] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const f = fuerza(nueva);
  const coinciden = repetir.length > 0 && repetir === nueva;

  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    if (!actual) return setError("Escribí tu contraseña actual.");
    const problema = problemaClaveClinica(nueva);
    if (problema) return setError(problema);
    if (nueva !== repetir) return setError("Las contraseñas nuevas no coinciden.");
    setError(null);
    setCargando(true);
    try {
      await cambiarClaveClinica(slug, actual, nueva);
      toast.success("Contraseña cambiada. Se cerraron tus otras sesiones abiertas.");
      setActual("");
      setNueva("");
      setRepetir("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cambiar la contraseña.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      {/* Mi tarjeta */}
      <section className="ce-tarjeta overflow-hidden">
        <div className="h-24 bg-[linear-gradient(135deg,oklch(0.93_0.05_298),oklch(0.97_0.025_305))] dark:bg-muted" />
        <div className="relative z-10 -mt-11 px-6 pb-7 sm:px-8">
          <span
            className={cn(
              "flex h-[5.5rem] w-[5.5rem] items-center justify-center rounded-[1.75rem] bg-gradient-to-br text-2xl font-extrabold text-white shadow-[0_16px_30px_-14px_rgba(60,10,120,0.7)] ring-4 ring-card",
              COLOR_ROL[sesion.usuario.rol] ?? COLOR_ROL["admin"],
            )}
            aria-hidden="true"
          >
            {iniciales(sesion.usuario.nombre)}
          </span>
          <h2 className="mt-4 text-2xl font-extrabold tracking-tight">{sesion.usuario.nombre}</h2>
          <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <ShieldCheck className="h-3.5 w-3.5" /> {sesion.usuario.rolNombre}
          </span>

          <dl className="mt-6 space-y-2">
            <Dato icono={<Mail className="h-4 w-4" />} titulo="Correo con el que ingresás" valor={sesion.usuario.email} />
            <Dato icono={<Building2 className="h-4 w-4" />} titulo="Clínica" valor={sesion.clinica.nombre} />
          </dl>
          <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
            Para cambiar tu nombre, tu correo o tu rol, pedíselo al Administrador de tu clínica.
          </p>
        </div>
      </section>

      {/* Cambiar contraseña */}
      <form className="ce-tarjeta p-6 sm:p-8" onSubmit={guardar} noValidate>
        <div className="flex items-start gap-4">
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-[0_10px_22px_-12px_rgba(76,29,149,0.85)]"
            style={{ background: "var(--gradient-brand)" }}
          >
            <KeyRound className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-xl font-extrabold tracking-tight">Cambiar mi contraseña</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Al guardarla, se cierran tus sesiones abiertas en otras computadoras o celulares.
            </p>
          </div>
        </div>

        <div className="mt-7 space-y-5">
          <CampoClave id="actual" label="Contraseña actual" value={actual} onChange={setActual} autoComplete="current-password" />

          <div className="h-px bg-border/70" />

          <div className="space-y-3">
            <CampoClave id="nueva" label="Contraseña nueva" value={nueva} onChange={setNueva} />
            {/* Medidor */}
            <div className="flex items-center gap-3" aria-live="polite">
              <div className="grid flex-1 grid-cols-4 gap-1.5" aria-hidden="true">
                {[1, 2, 3, 4].map((n) => (
                  <span
                    key={n}
                    className={cn("h-1.5 rounded-full transition-colors duration-300", n <= f.nivel ? f.color : "bg-muted")}
                  />
                ))}
              </div>
              <span className="w-20 text-right text-xs font-semibold text-muted-foreground">{f.texto}</span>
            </div>
            <ul className="flex flex-wrap gap-2">
              {reglas(nueva).map((r) => (
                <li
                  key={r.texto}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors duration-300",
                    r.ok ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground",
                  )}
                >
                  <Check className={cn("h-3.5 w-3.5 transition-opacity", r.ok ? "opacity-100" : "opacity-40")} />
                  {r.texto}
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-2">
            <CampoClave id="repetir" label="Repetir contraseña nueva" value={repetir} onChange={setRepetir} />
            {repetir.length > 0 && (
              <p className={cn("text-xs font-medium", coinciden ? "text-emerald-600" : "text-destructive")}>
                {coinciden ? "Coinciden." : "Todavía no coinciden."}
              </p>
            )}
          </div>

          {error && <MensajeError>{error}</MensajeError>}
          <Button type="submit" className="ce-boton h-12 w-full rounded-full text-base" disabled={cargando}>
            {cargando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar contraseña
          </Button>
        </div>
      </form>
    </div>
  );
}

function Dato({ icono, titulo, valor }: { icono: ReactNode; titulo: string; valor: string }) {
  return (
    <div className="flex items-center gap-3.5 rounded-2xl bg-[oklch(0.975_0.01_300)] px-4 py-3 dark:bg-muted/40">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-card text-primary shadow-sm ring-1 ring-border">
        {icono}
      </span>
      <div className="min-w-0">
        <dt className="text-[11px] font-medium text-muted-foreground">{titulo}</dt>
        <dd className="truncate text-sm font-semibold">{valor}</dd>
      </div>
    </div>
  );
}

function CampoClave({
  id,
  label,
  value,
  onChange,
  autoComplete = "new-password",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
}) {
  const [ver, setVer] = useState(false);
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={id}
          type={ver ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-12 rounded-2xl pl-10 pr-11"
        />
        <button
          type="button"
          onClick={() => setVer((v) => !v)}
          aria-label={ver ? "Ocultar contraseña" : "Mostrar contraseña"}
          className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {ver ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
