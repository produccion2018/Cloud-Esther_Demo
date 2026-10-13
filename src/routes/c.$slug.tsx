import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowLeft,
  BellRing,
  CalendarDays,
  ChevronRight,
  Eye,
  EyeOff,
  FileHeart,
  KeyRound,
  LayoutGrid,
  Loader2,
  LockKeyhole,
  LogOut,
  Mail,
  MailCheck,
  MessagesSquare,
  Receipt,
  Smile,
  Stethoscope,
  UserPlus,
  UserRound,
  UsersRound,
} from "lucide-react";
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
import {
  CLINICA_CON_SERVIDOR,
  infoPublicaClinica,
  ingresarClinica,
  recuperarClaveClinica,
  refrescarSesionClinica,
  salirClinica,
  useSesionClinica,
  verEquipo,
  type EquipoClinica,
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

/* ───────────── Adentro de la clínica ───────────── */

// Cierre por inactividad en el navegador (el servidor también corta a las 2 horas)
const INACTIVIDAD_MS = 2 * 60 * 60 * 1000;

// Lo que incluye el plan, en palabras de la clínica (lo técnico —perfil, seguridad, configuración— no se muestra)
const FUNCIONES: { codigo: string; nombre: string; detalle: string; icono: typeof CalendarDays }[] = [
  { codigo: "agenda", nombre: "Agenda", detalle: "Turnos del día de cada profesional", icono: CalendarDays },
  { codigo: "patients", nombre: "Pacientes", detalle: "Fichas, datos y contacto", icono: UsersRound },
  { codigo: "clinical_history", nombre: "Historia clínica", detalle: "Evoluciones y antecedentes", icono: FileHeart },
  { codigo: "odontogram_2d", nombre: "Odontograma 2D", detalle: "Hallazgos pieza por pieza", icono: Smile },
  { codigo: "odontogram_3d", nombre: "Odontograma 3D", detalle: "La boca completa en tres dimensiones", icono: Smile },
  { codigo: "reminders", nombre: "Recordatorios", detalle: "Avisos de turno a los pacientes", icono: BellRing },
  { codigo: "basic_communications", nombre: "Comunicaciones", detalle: "Mensajes con tus pacientes", icono: MessagesSquare },
  { codigo: "treatments", nombre: "Tratamientos", detalle: "Planes y seguimiento", icono: Stethoscope },
  { codigo: "budgets", nombre: "Presupuestos", detalle: "Armados y aprobados", icono: Receipt },
];

const inicialesDe = (nombre: string) =>
  nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0]?.toUpperCase() ?? "")
    .join("") || "?";

function InicioClinica({ slug, sesion }: { slug: string; sesion: SesionClinica }) {
  const esAdmin = sesion.usuario.rol === "admin";
  const ultimaActividad = useRef(Date.now());
  const [pestana, setPestana] = useState<"inicio" | "equipo" | "cuenta">("inicio");
  const [equipo, setEquipo] = useState<EquipoClinica | null>(null);

  // Al abrir: datos y rol de AHORA (si el Administrador le cambió el rol, se ve al instante)
  useEffect(() => {
    void refrescarSesionClinica(slug).catch(() => undefined);
  }, [slug]);

  // Resumen del equipo para el Inicio (solo el Administrador lo puede ver)
  useEffect(() => {
    if (!esAdmin || pestana !== "inicio") return;
    verEquipo(slug)
      .then(setEquipo)
      .catch(() => undefined);
  }, [slug, esAdmin, pestana]);

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

  const primerNombre = sesion.usuario.nombre.split(" ")[0] ?? sesion.usuario.nombre;
  const hora = new Date().getHours();
  const saludo = hora < 12 ? "Buen día" : hora < 20 ? "Buenas tardes" : "Buenas noches";
  const fecha = new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
  const hoy = fecha.charAt(0).toUpperCase() + fecha.slice(1);
  const plan = sesion.clinica.plan ? sesion.clinica.plan.charAt(0) + sesion.clinica.plan.slice(1).toLowerCase() : null;
  const funciones = FUNCIONES.filter((f) => sesion.clinica.modulos.includes(f.codigo));
  const PESTANAS = [
    { id: "inicio" as const, nombre: "Inicio", icono: LayoutGrid },
    ...(esAdmin ? [{ id: "equipo" as const, nombre: "Equipo", icono: UsersRound }] : []),
    { id: "cuenta" as const, nombre: "Mi cuenta", icono: UserRound },
  ];
  const activas = equipo?.personas.filter((p) => p.estado === "activa").length ?? null;
  const invitadas = equipo?.personas.filter((p) => p.estado === "invitada").length ?? null;
  const libres = equipo ? (equipo.limite === null ? null : Math.max(0, equipo.limite - equipo.usados)) : undefined;

  return (
    <div className="ce-clinica min-h-screen bg-[oklch(0.985_0.006_300)] dark:bg-background">
      <Toaster position="top-right" richColors closeButton />

      {/* Franja de la clínica */}
      <div className="ce-franja relative overflow-hidden text-white">
        <ToothLogo className="pointer-events-none absolute -right-10 -top-6 h-72 w-72 opacity-[0.06]" />
        <header className="relative mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 pt-5 sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25 backdrop-blur">
              <ToothLogo className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-bold leading-tight">{sesion.clinica.nombre}</span>
              {plan && <span className="block text-[11px] font-medium text-white/70">Plan {plan}</span>}
            </span>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-white/10 py-1 pl-1 pr-1 ring-1 ring-white/20 backdrop-blur sm:pl-3">
            <span className="hidden text-right leading-tight sm:block">
              <span className="block text-[13px] font-semibold">{sesion.usuario.nombre}</span>
              <span className="block text-[11px] text-white/70">{sesion.usuario.rolNombre}</span>
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[11px] font-bold text-[oklch(0.42_0.2_292)] sm:ml-1.5">
              {inicialesDe(sesion.usuario.nombre)}
            </span>
            <button
              type="button"
              onClick={salir}
              title="Salir"
              aria-label="Salir"
              className="flex h-8 w-8 items-center justify-center rounded-full text-white/85 transition-colors hover:bg-white/20 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-12 sm:px-8">
          <p className="ce-entra text-sm font-medium text-white/75">{hoy}</p>
          <h1 className="ce-entra mt-1.5 text-[2rem] font-extrabold leading-[1.1] tracking-[-0.02em] sm:text-[2.75rem]">
            {saludo}, {primerNombre}
          </h1>
          <nav
            className="ce-entra-2 mt-8 inline-flex gap-1 rounded-full bg-white/10 p-1 ring-1 ring-white/20 backdrop-blur"
            aria-label="Secciones"
          >
            {PESTANAS.map((t) => {
              const Icono = t.icono;
              const activa = pestana === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setPestana(t.id)}
                  aria-current={activa ? "page" : undefined}
                  className={
                    activa
                      ? "inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[oklch(0.42_0.2_292)] shadow-[0_6px_16px_-8px_rgba(30,0,60,0.6)] transition-all"
                      : "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white/80 transition-all hover:bg-white/15 hover:text-white"
                  }
                >
                  <Icono className="h-4 w-4" />
                  {t.nombre}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      <main className="ce-entra-3 relative mx-auto -mt-10 max-w-6xl px-4 pb-16 sm:px-8">
        {pestana === "inicio" && (
          <div className="space-y-6">
            {esAdmin && (
              <section className="ce-tarjeta p-6 sm:p-8">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                  <div className="max-w-md">
                    <h2 className="text-xl font-extrabold tracking-tight">Tu clínica, lista para tu equipo</h2>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      Sumá a tus odontólogos, secretarias y asistentes. Cada uno recibe un correo, elige su contraseña y
                      entra con su propio acceso.
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-3 sm:gap-4">
                    <Dato valor={activas} texto="Con acceso" />
                    <Dato valor={invitadas} texto="Invitadas" />
                    <Dato valor={libres === undefined ? null : libres === null ? "∞" : libres} texto="Lugares libres" />
                  </div>
                </div>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <Atajo
                    icono={UserPlus}
                    titulo="Sumar personas"
                    detalle="Una por una o pegando tu lista"
                    onClick={() => setPestana("equipo")}
                  />
                  <Atajo
                    icono={KeyRound}
                    titulo="Mi cuenta"
                    detalle="Tus datos y tu contraseña"
                    onClick={() => setPestana("cuenta")}
                  />
                </div>
              </section>
            )}
            {!esAdmin && (
              <section className="ce-tarjeta p-6 sm:p-8">
                <h2 className="text-xl font-extrabold tracking-tight">Bienvenido a {sesion.clinica.nombre}</h2>
                <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
                  Este es tu acceso personal. Desde acá vas a trabajar con la agenda y los pacientes de la clínica.
                </p>
              </section>
            )}

            {funciones.length > 0 && (
              <section className="ce-tarjeta-suave p-6 sm:p-8">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-base font-bold">Lo que incluye tu plan{plan ? ` ${plan}` : ""}</h2>
                  <p className="text-xs text-muted-foreground">Se van habilitando en tu cuenta</p>
                </div>
                <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {funciones.map(({ codigo, nombre, detalle, icono: Icono }) => (
                    <li
                      key={codigo}
                      className="ce-levanta flex items-center gap-3.5 rounded-2xl bg-[oklch(0.975_0.01_300)] p-4 ring-1 ring-transparent hover:bg-card hover:ring-border dark:bg-muted/40"
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-[0_8px_18px_-10px_rgba(76,29,149,0.8)]" style={{ background: "var(--gradient-brand)" }}>
                        <Icono className="h-5 w-5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold">{nombre}</span>
                        <span className="block truncate text-xs text-muted-foreground">{detalle}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
        {pestana === "equipo" && esAdmin && <EquipoClinicaPanel slug={slug} />}
        {pestana === "cuenta" && <MiCuentaClinica slug={slug} sesion={sesion} />}
      </main>
    </div>
  );
}

function Dato({ valor, texto }: { valor: number | string | null; texto: string }) {
  return (
    <div className="min-w-[5.5rem] rounded-2xl bg-[oklch(0.975_0.01_300)] px-4 py-3 text-center dark:bg-muted/40">
      <p className="text-2xl font-extrabold tabular-nums tracking-tight">{valor ?? "–"}</p>
      <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">{texto}</p>
    </div>
  );
}

function Atajo({
  icono: Icono,
  titulo,
  detalle,
  onClick,
}: {
  icono: typeof UserPlus;
  titulo: string;
  detalle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="ce-levanta group flex items-center gap-4 rounded-2xl bg-card p-4 text-left ring-1 ring-border"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
        <Icono className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{titulo}</span>
        <span className="block text-xs text-muted-foreground">{detalle}</span>
      </span>
      <ChevronRight className="ce-flecha h-5 w-5 text-muted-foreground" />
    </button>
  );
}
