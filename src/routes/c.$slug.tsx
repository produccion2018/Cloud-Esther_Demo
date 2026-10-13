import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Eye, EyeOff, Loader2, LockKeyhole, LogOut, Mail, MailCheck } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";

import { EquipoClinicaPanel } from "@/components/clinica/equipo";
import { MarcoClinica, MensajeError } from "@/components/clinica/marco";
import { MiCuentaClinica } from "@/components/clinica/mi-cuenta";
import { ToothLogo } from "@/components/admin/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CLINICA_CON_SERVIDOR,
  infoPublicaClinica,
  ingresarClinica,
  recuperarClaveClinica,
  refrescarSesionClinica,
  salirClinica,
  useSesionClinica,
  type SesionClinica,
} from "@/lib/clinica/api";

/* Ubicación: src/routes/c.$slug.tsx
   LA DIRECCIÓN DE CADA CLÍNICA: /c/<slug> (Etapa 8a).
   Sin sesión: ingresar u «olvidé mi contraseña». Con sesión: inicio, Equipo (solo Administrador) y Mi cuenta.
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
  if (sesion) return <InicioClinica slug={slug} sesion={sesion} />;
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
            className="h-12 rounded-xl pl-10"
          />
        </CampoIcono>
        {error && <MensajeError>{error}</MensajeError>}
        <Button type="submit" className="h-12 w-full rounded-xl text-base" disabled={cargando}>
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
          className="h-12 rounded-xl pl-10"
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
          className="h-12 rounded-xl pl-10 pr-10"
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
      <Button type="submit" className="h-12 w-full rounded-xl text-base" disabled={cargando}>
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

/* ───────────── Adentro de la clínica ───────────── */

// Cierre por inactividad en el navegador (el servidor también corta a las 2 horas)
const INACTIVIDAD_MS = 2 * 60 * 60 * 1000;

const NOMBRE_MODULO: Record<string, string> = {
  dashboard: "Inicio",
  agenda: "Agenda",
  patients: "Pacientes",
  clinical_history: "Historia clínica",
  odontogram_2d: "Odontograma 2D",
  odontogram_3d: "Odontograma 3D",
  reminders: "Recordatorios",
  basic_communications: "Comunicaciones",
  profile: "Perfil",
  security: "Seguridad",
  basic_settings: "Configuración",
  teams: "Equipo",
  specialties: "Especialidades",
  schedules: "Agenda y horarios",
  appointments: "Turnos",
  treatments: "Tratamientos",
  patient_communication: "Comunicación con pacientes",
  budgets: "Presupuestos",
  payments_billing: "Pagos y facturación",
  studies_diagnosis: "Estudios y diagnóstico",
};

function InicioClinica({ slug, sesion }: { slug: string; sesion: SesionClinica }) {
  const esAdmin = sesion.usuario.rol === "admin";
  const ultimaActividad = useRef(Date.now());

  // Al abrir: datos y rol de AHORA (si el Administrador le cambió el rol, se ve al instante)
  useEffect(() => {
    void refrescarSesionClinica(slug).catch(() => undefined);
  }, [slug]);

  useEffect(() => {
    const marcar = () => {
      ultimaActividad.current = Date.now();
    };
    const eventos = ["pointerdown", "keydown", "scroll"] as const;
    eventos.forEach((ev) => window.addEventListener(ev, marcar, { passive: true }));
    const reloj = window.setInterval(() => {
      if (Date.now() - ultimaActividad.current > INACTIVIDAD_MS) {
        void salirClinica(slug, "Inactividad").catch(() => undefined);
        toast.info("Se cerró la sesión por inactividad.");
      }
    }, 60_000);
    return () => {
      eventos.forEach((ev) => window.removeEventListener(ev, marcar));
      window.clearInterval(reloj);
    };
  }, [slug]);

  const salir = () => {
    void salirClinica(slug).catch(() => undefined);
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <Toaster position="top-right" richColors closeButton />
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-primary-foreground"
              style={{ background: "var(--gradient-primary)" }}
            >
              <ToothLogo className="h-5 w-5" />
            </div>
            <div className="min-w-0 leading-tight">
              <p className="truncate font-bold">{sesion.clinica.nombre}</p>
              <p className="truncate text-xs text-muted-foreground">
                {sesion.usuario.nombre} · {sesion.usuario.rolNombre}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={salir}>
            <LogOut className="mr-1.5 h-4 w-4" /> Salir
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <Tabs defaultValue="inicio">
          <TabsList>
            <TabsTrigger value="inicio">Inicio</TabsTrigger>
            {esAdmin && <TabsTrigger value="equipo">Equipo</TabsTrigger>}
            <TabsTrigger value="cuenta">Mi cuenta</TabsTrigger>
          </TabsList>

          <TabsContent value="inicio" className="mt-4 space-y-4">
            <div className="rounded-2xl border bg-card p-5">
              <h1 className="text-xl font-extrabold tracking-tight">¡Hola, {sesion.usuario.nombre.split(" ")[0]}!</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Bienvenido a {sesion.clinica.nombre}.
                {sesion.clinica.plan ? ` Plan ${sesion.clinica.plan.charAt(0)}${sesion.clinica.plan.slice(1).toLowerCase()}.` : ""}
              </p>
              {esAdmin && (
                <p className="mt-3 text-sm">
                  Como Administrador, desde <strong>Equipo</strong> podés invitar a tus odontólogos, secretarias y
                  asistentes. A cada uno le llega un correo para elegir su contraseña.
                </p>
              )}
            </div>
            {sesion.clinica.modulos.length > 0 && (
              <div className="rounded-2xl border bg-card p-5">
                <h2 className="text-sm font-bold">Lo que incluye tu plan</h2>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {sesion.clinica.modulos.map((m) => (
                    <li key={m} className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
                      {NOMBRE_MODULO[m] ?? m}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </TabsContent>

          {esAdmin && (
            <TabsContent value="equipo" className="mt-4">
              <EquipoClinicaPanel slug={slug} />
            </TabsContent>
          )}

          <TabsContent value="cuenta" className="mt-4">
            <MiCuentaClinica slug={slug} sesion={sesion} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
