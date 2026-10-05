import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { MarcoAcceso } from "@/components/admin/acceso";
import { CampoClave, ReglasClave } from "@/components/admin/campos-clave";
import { Button } from "@/components/ui/button";
import { problemaClave, restablecerClave } from "@/lib/admin/api";

export const Route = createFileRoute("/admin/restablecer")({
  validateSearch: (s: Record<string, unknown>) => ({
    token: typeof s["token"] === "string" ? s["token"] : "",
  }),
  head: () => ({
    meta: [
      { title: "Nueva contraseña — Cloud Esther Administración" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Restablecer,
});

function Restablecer() {
  const { token } = Route.useSearch();
  const navigate = useNavigate();
  const [clave, setClave] = useState("");
  const [repetir, setRepetir] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    const problema = problemaClave(clave);
    if (problema) return setError(problema);
    if (clave !== repetir) return setError("Las contraseñas no coinciden.");
    setError(null);
    setCargando(true);
    try {
      await restablecerClave(token, clave);
      toast.success("Contraseña actualizada. Ya podés ingresar.");
      void navigate({ to: "/admin/login" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar la contraseña.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <MarcoAcceso>
      <Link
        to="/admin/login"
        className="mb-6 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Volver al ingreso
      </Link>
      <h1 className="text-2xl font-extrabold tracking-tight">Crear contraseña nueva</h1>
      {!token ? (
        <p className="mt-3 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
          El enlace no es válido. Pedí uno nuevo desde «¿Olvidaste tu contraseña?».
        </p>
      ) : (
        <form className="mt-6 space-y-4" onSubmit={guardar} noValidate>
          <CampoClave id="nueva" label="Contraseña nueva" value={clave} onChange={setClave} />
          <ReglasClave clave={clave} />
          <CampoClave
            id="repetir"
            label="Repetir contraseña"
            value={repetir}
            onChange={setRepetir}
          />
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
            Guardar contraseña
          </Button>
        </form>
      )}
    </MarcoAcceso>
  );
}
