import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Loader2, MailCheck, User } from "lucide-react";
import { useState, type FormEvent } from "react";

import { MarcoAcceso } from "@/components/admin/acceso";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { solicitarRecuperacion } from "@/lib/admin/api";

export const Route = createFileRoute("/admin/recuperar")({
  head: () => ({
    meta: [
      { title: "Recuperar contraseña — Cloud Esther Administración" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Recuperar,
});

function Recuperar() {
  const [email, setEmail] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [enlace, setEnlace] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError("Ingresá un correo válido.");
    setError(null);
    setCargando(true);
    try {
      const r = await solicitarRecuperacion(email);
      setEnlace(r.enlacePrueba ?? null);
      setEnviado(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar el enlace.");
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

      {enviado ? (
        <div>
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-success/12 text-success">
            <MailCheck className="h-6 w-6" />
          </span>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight">Revisá tu correo</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Si <b className="text-foreground">{email.trim()}</b> tiene acceso al panel, te enviamos
            un enlace para crear una contraseña nueva. El enlace vence en 30 minutos.
          </p>
          {enlace && import.meta.env.DEV && (
            <div className="mt-5 rounded-2xl border border-dashed border-primary/25 bg-primary/[0.03] p-3 text-xs">
              <p className="font-semibold text-primary">Sin backend conectado (prueba)</p>
              <p className="mt-1 text-muted-foreground">
                Todavía no se envían correos. Usá este enlace para probar el cambio:
              </p>
              <a href={enlace} className="mt-2 inline-block font-semibold text-primary underline">
                Abrir enlace de recuperación
              </a>
            </div>
          )}
          <Button variant="outline" className="mt-6 w-full" onClick={() => setEnviado(false)}>
            Usar otro correo
          </Button>
        </div>
      ) : (
        <>
          <h1 className="text-2xl font-extrabold tracking-tight">Recuperar contraseña</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Escribí el correo de tu acceso y te mandamos un enlace para crear una nueva.
          </p>
          <form className="mt-6 space-y-4" onSubmit={enviar} noValidate>
            <div className="space-y-2">
              <Label htmlFor="email">Correo</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nombre@cloudesther.com"
                  className="h-11 pl-9"
                />
              </div>
            </div>
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
              Enviar enlace
            </Button>
          </form>
        </>
      )}
    </MarcoAcceso>
  );
}
