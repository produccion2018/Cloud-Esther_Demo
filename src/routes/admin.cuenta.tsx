import { createFileRoute } from "@tanstack/react-router";
import { Check, Loader2, Monitor, Moon, ShieldCheck, Sun } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Seccion } from "@/components/admin/bits";
import { CampoClave, ReglasClave } from "@/components/admin/campos-clave";
import { roleDescription, roleLabel, useRole } from "@/components/admin/role";
import { AdminShell } from "@/components/admin/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { actualizarPerfil, cambiarClave, problemaClave } from "@/lib/admin/api";
import { fecha } from "@/lib/admin/formato";
import {
  COLORES_LATERAL,
  guardarPreferencias,
  usePreferencias,
  type Tema,
} from "@/lib/admin/preferencias";
import { INACTIVIDAD_MS, actualizarUsuarioSesion, useSesionAdmin } from "@/lib/admin/sesion";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/cuenta")({
  head: () => ({
    meta: [
      { title: "Mi perfil — Cloud Esther Administración" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const sesion = useSesionAdmin();
  const { role } = useRole();
  const u = sesion?.usuario;
  const [nombre, setNombre] = useState(u?.nombre ?? "");
  const [telefono, setTelefono] = useState(u?.telefono ?? "");
  const [guardando, setGuardando] = useState(false);

  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [repetir, setRepetir] = useState("");
  const [errorClave, setErrorClave] = useState<string | null>(null);
  const [cambiando, setCambiando] = useState(false);

  const guardarPerfil = async (e: FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      toast.error("Escribí tu nombre.");
      return;
    }
    setGuardando(true);
    try {
      const usuario = await actualizarPerfil({ nombre: nombre.trim(), telefono: telefono.trim() });
      actualizarUsuarioSesion({ nombre: usuario.nombre, telefono: usuario.telefono });
      toast.success("Perfil actualizado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setGuardando(false);
    }
  };

  const guardarClave = async (e: FormEvent) => {
    e.preventDefault();
    if (!actual) return setErrorClave("Escribí tu contraseña actual.");
    const problema = problemaClave(nueva);
    if (problema) return setErrorClave(problema);
    if (nueva !== repetir) return setErrorClave("Las contraseñas nuevas no coinciden.");
    setErrorClave(null);
    setCambiando(true);
    try {
      await cambiarClave(actual, nueva);
      setActual("");
      setNueva("");
      setRepetir("");
      toast.success("Contraseña actualizada");
    } catch (err) {
      setErrorClave(err instanceof Error ? err.message : "No se pudo cambiar la contraseña.");
    } finally {
      setCambiando(false);
    }
  };

  return (
    <AdminShell title="Mi perfil y contraseña" description="Tus datos de acceso al panel interno.">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Seccion titulo="Mis datos" descripcion="Así te ve el resto del equipo.">
          <form onSubmit={guardarPerfil} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre y apellido</Label>
                <Input
                  id="nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tel">Teléfono</Label>
                <Input
                  id="tel"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="+54 9 11 …"
                  className="h-11"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="email">Correo de acceso</Label>
                <Input id="email" value={u?.email ?? ""} disabled className="h-11" />
                <p className="text-xs text-muted-foreground">
                  El correo lo cambia el Dueño desde Equipo y accesos.
                </p>
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={guardando}>
                {guardando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar datos
              </Button>
            </div>
          </form>
        </Seccion>

        <Seccion titulo="Mi acceso">
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3 rounded-2xl bg-primary/[0.06] p-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="font-bold">{roleLabel[role]}</p>
                <p className="text-xs text-muted-foreground">{roleDescription[role]}</p>
              </div>
            </div>
            <dl className="divide-y divide-border/60 rounded-2xl border border-border">
              {(
                [
                  ["Ingreso actual", fecha(sesion?.inicio ?? null, true)],
                  ["Cuenta creada", fecha(u?.creado ?? null)],
                  ["Cierre por inactividad", `${INACTIVIDAD_MS / 60000} minutos`],
                ] as const
              ).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 px-3 py-2">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Seccion>
      </div>

      <Seccion
        titulo="Cambiar contraseña"
        descripcion="Si no recordás la actual, cerrá sesión y usá «¿Olvidaste tu contraseña?»."
      >
        <form
          onSubmit={guardarClave}
          className="grid gap-4 lg:grid-cols-[repeat(3,minmax(0,1fr))_auto] lg:items-end"
        >
          <CampoClave
            id="actual"
            label="Contraseña actual"
            value={actual}
            onChange={setActual}
            autoComplete="current-password"
          />
          <CampoClave id="nueva" label="Contraseña nueva" value={nueva} onChange={setNueva} />
          <CampoClave id="repetir" label="Repetir la nueva" value={repetir} onChange={setRepetir} />
          <Button type="submit" className="h-11" disabled={cambiando}>
            {cambiando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Cambiar contraseña
          </Button>
          <div className="lg:col-span-4">
            <ReglasClave clave={nueva} />
            {errorClave && (
              <p
                role="alert"
                className="mt-3 rounded-xl bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive"
              >
                {errorClave}
              </p>
            )}
          </div>
        </form>
      </Seccion>
      <Apariencia />
    </AdminShell>
  );
}

function Apariencia() {
  const p = usePreferencias();
  const temas: { id: Tema; label: string; icono: typeof Sun }[] = [
    { id: "claro", label: "Claro", icono: Sun },
    { id: "oscuro", label: "Oscuro", icono: Moon },
    { id: "sistema", label: "Como el sistema", icono: Monitor },
  ];
  return (
    <Seccion
      titulo="Apariencia"
      descripcion="Solo cambia cómo ves vos el panel en este navegador. No afecta al demo ni a las clínicas."
    >
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <p className="text-sm font-semibold">Modo</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {temas.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => guardarPreferencias({ tema: t.id })}
                aria-pressed={p.tema === t.id}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-xs font-semibold transition",
                  p.tema === t.id
                    ? "border-primary bg-primary/[0.07] text-primary"
                    : "border-border hover:border-primary/30",
                )}
              >
                <t.icono className="h-5 w-5" />
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold">Color del menú lateral</p>
          <div className="mt-2 flex flex-wrap gap-3">
            {COLORES_LATERAL.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => guardarPreferencias({ lateral: c.id })}
                aria-pressed={p.lateral === c.id}
                className="flex flex-col items-center gap-1.5 text-[11px] font-semibold"
              >
                <span
                  className={cn(
                    "grid h-11 w-11 place-items-center rounded-xl border-2 shadow-sm",
                    p.lateral === c.id ? "border-primary" : "border-border",
                  )}
                  style={{ background: c.muestra }}
                >
                  {p.lateral === c.id && (
                    <Check
                      className={cn("h-4 w-4", c.id === "claro" ? "text-primary" : "text-white")}
                    />
                  )}
                </span>
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Seccion>
  );
}
