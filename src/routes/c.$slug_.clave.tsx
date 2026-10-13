import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { CampoClave, ReglasClave } from "@/components/admin/campos-clave";
import { MarcoClinica, MensajeError } from "@/components/clinica/marco";
import { Button } from "@/components/ui/button";
import { elegirClaveClinica, infoPublicaClinica, problemaClaveClinica } from "@/lib/clinica/api";

/* Ubicación: src/routes/c.$slug_.clave.tsx
   ELEGIR CONTRASEÑA con el enlace del correo (bienvenida, invitación o «olvidé mi contraseña»).
   El enlace trae el código después de "#t=": así nunca viaja a ningún servidor en la dirección.
   Al leerlo, se borra de la barra de direcciones. Solo sirve en la dirección de SU clínica. */

export const Route = createFileRoute("/c/$slug_/clave")({
  head: () => ({
    meta: [{ title: "Elegir contraseña — Cloud Esther" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: ElegirClave,
});

function ElegirClave() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(null);
  const [nombre, setNombre] = useState<string | null>(null);
  const [clave, setClave] = useState("");
  const [repetir, setRepetir] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    const t = new URLSearchParams(window.location.hash.replace(/^#/, "")).get("t") ?? "";
    setToken(/^[A-Za-z0-9_-]{20,200}$/.test(t) ? t : "");
    if (window.location.hash) window.history.replaceState(null, "", window.location.pathname);
    infoPublicaClinica(slug)
      .then((i) => setNombre(i.nombre))
      .catch(() => undefined);
  }, [slug]);

  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    const problema = problemaClaveClinica(clave);
    if (problema) return setError(problema);
    if (clave !== repetir) return setError("Las contraseñas no coinciden.");
    setError(null);
    setCargando(true);
    try {
      await elegirClaveClinica(slug, token, clave);
      toast.success("¡Listo! Ya podés ingresar con tu contraseña.");
      void navigate({ to: "/c/$slug", params: { slug } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la contraseña.");
      setCargando(false);
    }
  };

  return (
    <MarcoClinica nombre={nombre}>
      <h2 className="text-2xl font-extrabold tracking-tight">Elegí tu contraseña</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">Es la que vas a usar para entrar a la clínica.</p>
      {token === "" ? (
        <div className="mt-3 space-y-3">
          <MensajeError>El enlace no es válido. Pedí uno nuevo desde «¿Olvidaste tu contraseña?».</MensajeError>
          <Link to="/c/$slug" params={{ slug }} className="text-sm font-semibold text-primary hover:underline">
            Ir a ingresar
          </Link>
        </div>
      ) : (
        <form className="mt-4 space-y-4" onSubmit={guardar} noValidate>
          <CampoClave id="nueva" label="Contraseña" value={clave} onChange={setClave} />
          <ReglasClave clave={clave} />
          <CampoClave id="repetir" label="Repetir contraseña" value={repetir} onChange={setRepetir} />
          {error && <MensajeError>{error}</MensajeError>}
          <Button type="submit" className="ce-boton h-12 w-full rounded-full text-base" disabled={cargando || token === null}>
            {cargando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar contraseña
          </Button>
        </form>
      )}
    </MarcoClinica>
  );
}
