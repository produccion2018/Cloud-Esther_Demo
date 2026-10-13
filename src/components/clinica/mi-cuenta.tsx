import { Loader2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { CampoClave, ReglasClave } from "@/components/admin/campos-clave";
import { MensajeError } from "@/components/clinica/marco";
import { Button } from "@/components/ui/button";
import { cambiarClaveClinica, problemaClaveClinica, type SesionClinica } from "@/lib/clinica/api";

/* Ubicación: src/components/clinica/mi-cuenta.tsx
   MI CUENTA: mis datos y cambiar mi contraseña (cierra mis otras sesiones abiertas). */
export function MiCuentaClinica({ slug, sesion }: { slug: string; sesion: SesionClinica }) {
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [repetir, setRepetir] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

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
    <div className="grid gap-4 md:grid-cols-2">
      <div className="ce-tarjeta p-6 text-sm sm:p-8">
        <h2 className="font-bold">Mis datos</h2>
        <dl className="mt-3 space-y-2">
          <div>
            <dt className="text-xs text-muted-foreground">Nombre</dt>
            <dd>{sesion.usuario.nombre}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Correo (con el que ingresás)</dt>
            <dd>{sesion.usuario.email}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Rol</dt>
            <dd>{sesion.usuario.rolNombre}</dd>
          </div>
        </dl>
      </div>
      <form className="ce-tarjeta space-y-3 p-6 sm:p-8" onSubmit={guardar} noValidate>
        <h2 className="font-bold">Cambiar mi contraseña</h2>
        <CampoClave id="actual" label="Contraseña actual" value={actual} onChange={setActual} autoComplete="current-password" />
        <CampoClave id="nueva" label="Contraseña nueva" value={nueva} onChange={setNueva} />
        <ReglasClave clave={nueva} />
        <CampoClave id="repetir" label="Repetir contraseña nueva" value={repetir} onChange={setRepetir} />
        {error && <MensajeError>{error}</MensajeError>}
        <Button type="submit" className="ce-boton h-11 w-full rounded-full" disabled={cargando}>
          {cargando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Guardar contraseña
        </Button>
      </form>
    </div>
  );
}
