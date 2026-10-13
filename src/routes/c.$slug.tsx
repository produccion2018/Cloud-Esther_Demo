import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Eye, EyeOff, Loader2, LockKeyhole, Mail, MailCheck } from "lucide-react";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";

import { MarcoClinica, MensajeError } from "@/components/clinica/marco";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CLINICA_CON_SERVIDOR,
  infoPublicaClinica,
  ingresarClinica,
  recuperarClaveClinica,
  useSesionClinica,
  type SesionClinica,
} from "@/lib/clinica/api";
import { entrarAClinica } from "@/lib/clinica/modo-clinica";

/* Ubicación: src/routes/c.$slug.tsx
   LA DIRECCIÓN DE CADA CLÍNICA: /c/<slug> (Etapa 8a).
   Sin sesión: ingresar u «olvidé mi contraseña». Con sesión: entra a las pantallas de Cloud Esther
   (las mismas del demo) con los datos de SU clínica guardados en el servidor (Etapa 8b).
   El servidor decide todo: una sesión de otra clínica acá no sirve. */

export const Route = createFileRoute("/c/$slug")({
  head: () => ({
    meta: [{ title: "Ingresar — Cloud Esther" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: PaginaClinica,
});

function PaginaClinica() {
  const { slug } = Route.useParams();
  const sesion = useSesionClinica(slug);
  const [nombre, setNombre] = useState<string | null>(null);
  const [noExiste, setNoExiste] = useState<string | null>(null);

  useEffect(() => {
    if (!CLINICA_CON_SERVIDOR) return;
    infoPublicaClinica(slug)
      .then((i) => setNombre(i.nombre))
      .catch((e: unknown) => setNoExiste(e instanceof Error ? e.message : "No encontramos esa clínica."));
  }, [slug]);

  if (!CLINICA_CON_SERVIDOR) {
    return (
      <MarcoClinica nombre={null}>
        <p className="text-sm text-muted-foreground">El acceso de las clínicas no está disponible en esta vista previa.</p>
      </MarcoClinica>
    );
  }
  if (sesion) return <Entrando sesion={sesion} />;
  if (noExiste) {
    return (
      <MarcoClinica nombre={null}>
        <MensajeError>{noExiste}</MensajeError>
      </MarcoClinica>
    );
  }
  return (
    <MarcoClinica nombre={nombre}>
      <Ingresar slug={slug} />
    </MarcoClinica>
  );
}

/* ───────────── Ingresar / Olvidé mi contraseña ───────────── */

function Ingresar({ slug }: { slug: string }) {
  const [modo, setModo] = useState<"ingresar" | "recuperar" | "enviado">("ingresar");
  const [email, setEmail] = useState("");
  const [clave, setClave] = useState("");
  const [verClave, setVerClave] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const ingresar = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !clave) return setError("Escribí tu correo y tu contraseña.");
    setError(null);
    setCargando(true);
    try {
      await ingresarClinica(slug, email.trim(), clave);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo ingresar.");
      setCargando(false);
    }
  };

  const recuperar = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return setError("Escribí tu correo.");
    setError(null);
    setCargando(true);
    try {
      await recuperarClaveClinica(slug, email.trim());
      setModo("enviado");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar el pedido.");
    } finally {
      setCargando(false);
    }
  };

  if (modo === "enviado") {
    return (
      <div className="space-y-5 text-sm">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <MailCheck className="h-6 w-6" />
        </span>
        <div>
          <h2 className="text-xl font-extrabold tracking-tight">Revisá tu correo</h2>
          <p className="mt-2 leading-relaxed text-muted-foreground">
            Si <strong className="text-foreground">{email.trim()}</strong> tiene acceso a esta clínica, le mandamos un
            enlace para elegir una contraseña nueva. Vence en 30 minutos.
          </p>
        </div>
        <Button variant="outline" className="h-11 w-full" onClick={() => setModo("ingresar")}>
          Volver a ingresar
        </Button>
      </div>
    );
  }

  if (modo === "recuperar") {
    return (
      <form className="space-y-5" onSubmit={recuperar} noValidate>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setModo("ingresar");
          }}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Volver
        </button>
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">¿Olvidaste tu contraseña?</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">Te mandamos un enlace para elegir una nueva.</p>
        </div>
        <CampoIcono id="rec-email" label="Correo" icono={<Mail className="h-4 w-4" />}>
          <Input
            id="rec-email"
            type="email"
            autoComplete="email"
            placeholder="tu@correo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 rounded-2xl pl-10"
          />
        </CampoIcono>
        {error && <MensajeError>{error}</MensajeError>}
        <Button type="submit" className="ce-boton h-12 w-full rounded-full text-base" disabled={cargando}>
          {cargando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Enviar enlace
        </Button>
      </form>
    );
  }

  return (
    <form className="space-y-5" onSubmit={ingresar} noValidate>
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight">Ingresar</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">Con el correo y la contraseña de tu acceso.</p>
      </div>
      <CampoIcono id="email" label="Correo" icono={<Mail className="h-4 w-4" />}>
        <Input
          id="email"
          type="email"
          autoComplete="username"
          placeholder="tu@correo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-12 rounded-2xl pl-10"
        />
      </CampoIcono>
      <CampoIcono
        id="clave"
        label="Contraseña"
        icono={<LockKeyhole className="h-4 w-4" />}
        extra={
          <button
            type="button"
            onClick={() => {
              setError(null);
              setModo("recuperar");
            }}
            className="text-xs font-semibold text-primary hover:underline"
          >
            ¿La olvidaste?
          </button>
        }
      >
        <Input
          id="clave"
          type={verClave ? "text" : "password"}
          autoComplete="current-password"
          value={clave}
          onChange={(e) => setClave(e.target.value)}
          className="h-12 rounded-2xl pl-10 pr-10"
        />
        <button
          type="button"
          onClick={() => setVerClave((v) => !v)}
          aria-label={verClave ? "Ocultar contraseña" : "Mostrar contraseña"}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          {verClave ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </CampoIcono>
      {error && <MensajeError>{error}</MensajeError>}
      <Button type="submit" className="ce-boton h-12 w-full rounded-full text-base" disabled={cargando}>
        {cargando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Ingresar
      </Button>
    </form>
  );
}

function CampoIcono({
  id,
  label,
  icono,
  extra,
  children,
}: {
  id: string;
  label: string;
  icono: ReactNode;
  extra?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>{label}</Label>
        {extra}
      </div>
      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">{icono}</span>
        {children}
      </div>
    </div>
  );
}

/* ───────────── Adentro: las pantallas de Cloud Esther (las mismas del demo) ───────────── */

// Con la sesión abierta, la clínica pasa a trabajar con SUS datos en las pantallas de siempre.
// Se recarga la página a propósito: así no queda nada en memoria de otra sesión.
const DESTINO: Record<string, string> = { equipo: "/demo/accesos", cuenta: "/demo/mi-cuenta" };

function Entrando({ sesion }: { sesion: SesionClinica }) {
  useEffect(() => {
    entrarAClinica(sesion);
    const h = window.location.hash.replace(/^#/, "");
    window.location.assign(DESTINO[h] ?? "/demo");
  }, [sesion]);
  return (
    <MarcoClinica nombre={sesion.clinica.nombre}>
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Entrando a {sesion.clinica.nombre}…
      </p>
    </MarcoClinica>
  );
}
