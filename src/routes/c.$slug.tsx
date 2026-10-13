import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowLeft,
  BarChart3,
  BellRing,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Eye,
  EyeOff,
  FileHeart,
  FileText,
  FlaskConical,
  Hourglass,
  KeyRound,
  LayoutGrid,
  Loader2,
  LockKeyhole,
  LogOut,
  Mail,
  MailCheck,
  MessagesSquare,
  Mic,
  Package,
  Pill,
  Plug,
  Receipt,
  ScanLine,
  Settings2,
  ShieldCheck,
  Smile,
  Sparkles,
  Stethoscope,
  UserCheck,
  UserPlus,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";

import { EquipoClinicaPanel } from "@/components/clinica/equipo";
import { MarcoClinica, MensajeError } from "@/components/clinica/marco";
import { MiCuentaClinica } from "@/components/clinica/mi-cuenta";
import { CabeceraModulo, ClinicaShell, PLAN_DE_CODIGO, modulosDe } from "@/components/clinica/shell";
import { ModuleIcon, etiquetaModulo } from "@/lib/cloud-esther/data";
import { ToothLogo } from "@/components/admin/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import { plans as PLANES_WEB } from "@/lib/site-data";
import { cn } from "@/lib/utils";
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

// Lo que incluye el plan: la MISMA lista que ve el cliente en la web pública (src/lib/site-data.ts)
const PLAN_WEB: Record<string, string> = { START: "esencial", PRO: "profesional", PLUS: "avanzado", ENTERPRISE: "enterprise" };

// Ícono de cada función según de qué se trata
const ICONOS: [RegExp, typeof CalendarDays][] = [
  [/^todo lo del plan/i, Sparkles],
  [/dashboard/i, LayoutGrid],
  [/agenda|turnos/i, CalendarDays],
  [/odontograma/i, Smile],
  [/historia/i, FileHeart],
  [/paciente|portal/i, UsersRound],
  [/receta/i, Pill],
  [/tratamiento/i, Stethoscope],
  [/equipo|recursos humanos|permisos/i, UsersRound],
  [/estudio|diagn|rayos/i, ScanLine],
  [/laboratorio/i, FlaskConical],
  [/comunicaci|marketing/i, MessagesSquare],
  [/configuraci/i, Settings2],
  [/notificaci|recordatorio/i, BellRing],
  [/presupuesto|pago|factura/i, Receipt],
  [/anal[ií]tica|reporte|auditor/i, BarChart3],
  [/esther ia|ia\b/i, Sparkles],
  [/inventario/i, Package],
  [/documento/i, FileText],
  [/integraci|n8n|automatiza/i, Plug],
  [/voz|audio/i, Mic],
  [/seguridad/i, ShieldCheck],
];
const iconoDe = (texto: string) => ICONOS.find(([re]) => re.test(texto))?.[1] ?? CheckCircle2;

const inicialesDe = (nombre: string) =>
  nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0]?.toUpperCase() ?? "")
    .join("") || "?";

// Qué hace cada módulo (cabecera de la pantalla)
const DETALLE_MODULO: Record<string, string> = {
  agenda: "Los turnos del día de cada profesional",
  pacientes: "Fichas, datos de contacto y cobertura",
  historia: "Evoluciones, antecedentes y alergias",
  odontograma: "Hallazgos y tratamientos pieza por pieza",
  odontograma3d: "La boca completa en tres dimensiones",
  recetas: "Recetas para imprimir o enviar",
  estudios: "Radiografías y estudios de cada paciente",
  laboratorio: "Trabajos enviados al laboratorio",
  tratamientos: "Planes de tratamiento y seguimiento",
  comunicaciones: "Mensajes con tus pacientes",
  notificaciones: "Avisos de la clínica",
  presupuestos: "Presupuestos armados y aprobados",
  facturacion: "Cobros y facturas",
  configuracion: "Datos de la clínica, horarios y apariencia",
  equipo: "Quién trabaja en la clínica y con qué acceso",
};

function InicioClinica({ slug, sesion }: { slug: string; sesion: SesionClinica }) {
  const esAdmin = sesion.usuario.rol === "admin";
  const ultimaActividad = useRef(Date.now());
  const visibles = modulosDe(sesion);
  const desdeDireccion = () => {
    const h = typeof window === "undefined" ? "" : window.location.hash.replace(/^#/, "");
    return h === "cuenta" || visibles.some((m) => m.id === h) ? h : "dashboard";
  };
  const [vista, setVista] = useState<string>(desdeDireccion);
  const [equipo, setEquipo] = useState<EquipoClinica | null>(null);

  // La sección queda en la dirección (#agenda): al recargar se vuelve al mismo lugar
  const ir = (id: string) => {
    setVista(id);
    window.history.replaceState(null, "", id === "dashboard" ? window.location.pathname : `#${id}`);
    window.scrollTo({ top: 0 });
  };

  // Al abrir: datos y rol de AHORA (si el Administrador le cambió el rol, se ve al instante)
  useEffect(() => {
    void refrescarSesionClinica(slug).catch(() => undefined);
  }, [slug]);

  // Si le cambiaron el rol y ya no puede ver esta sección, vuelve al inicio
  useEffect(() => {
    if (vista !== "dashboard" && vista !== "cuenta" && !visibles.some((m) => m.id === vista)) setVista("dashboard");
  }, [vista, visibles]);

  // Resumen del equipo para el Inicio (solo el Administrador lo puede ver)
  useEffect(() => {
    if (!esAdmin || vista !== "dashboard") return;
    verEquipo(slug)
      .then(setEquipo)
      .catch(() => undefined);
  }, [slug, esAdmin, vista]);

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
  const planWeb = PLANES_WEB.find((p) => p.id === PLAN_WEB[sesion.clinica.plan ?? ""]);
  const activas = equipo?.personas.filter((p) => p.estado === "activa").length ?? null;
  const invitadas = equipo?.personas.filter((p) => p.estado === "invitada").length ?? null;
  const libres = equipo ? (equipo.limite === null ? null : Math.max(0, equipo.limite - equipo.usados)) : undefined;
  const planId = PLAN_DE_CODIGO[sesion.clinica.plan ?? ""] ?? "inicial";
  const modulo = visibles.find((m) => m.id === vista);
  const titulo = vista === "cuenta" ? "Mi cuenta" : vista === "dashboard" ? "Inicio" : (modulo ? etiquetaModulo(modulo, planId) : "Inicio");

  return (
    <>
      <Toaster position="top-right" richColors closeButton />
      <ClinicaShell sesion={sesion} actual={vista} onIr={ir} onSalir={salir} titulo={titulo}>
        {vista === "dashboard" && (
          <div className="space-y-6">
            <section className="ce-franja ce-entra relative overflow-hidden rounded-[1.75rem] px-6 py-8 text-white shadow-[0_24px_48px_-28px_rgba(60,10,120,0.8)] sm:px-9 sm:py-10">
              <ToothLogo className="pointer-events-none absolute -right-6 -top-6 h-56 w-56 opacity-[0.08]" />
              <p className="relative text-sm font-medium text-white/75">{hoy}</p>
              <h1 className="relative mt-1.5 text-[2rem] font-extrabold leading-[1.1] tracking-[-0.02em] sm:text-[2.5rem]">
                {saludo}, {primerNombre}
              </h1>
              <p className="relative mt-2 max-w-xl text-sm text-white/80">
                {sesion.usuario.rolNombre} en {sesion.clinica.nombre}
                {plan ? ` · Plan ${plan}` : ""}
              </p>
            </section>
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
                  <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                    <Dato valor={activas} texto="Con acceso" icono={UserCheck} tono="verde" />
                    <Dato valor={invitadas} texto="Invitadas" icono={Hourglass} tono="ambar" />
                    <Dato valor={libres === undefined ? null : libres === null ? "∞" : libres} texto="Lugares libres" icono={UserPlus} tono="violeta" />
                  </div>
                </div>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <Atajo
                    icono={UserPlus}
                    titulo="Sumar personas"
                    detalle="Una por una o pegando tu lista"
                    onClick={() => ir("equipo")}
                  />
                  <Atajo
                    icono={KeyRound}
                    titulo="Mi cuenta"
                    detalle="Tus datos y tu contraseña"
                    onClick={() => ir("cuenta")}
                  />
                </div>
              </section>
            )}
            {!esAdmin && (
              <section className="ce-tarjeta p-6 sm:p-8">
                <h2 className="text-xl font-extrabold tracking-tight">Tus accesos</h2>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Lo que podés usar en {sesion.clinica.nombre} como {sesion.usuario.rolNombre}.
                </p>
                <ul className="mt-6 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {visibles
                    .filter((m) => m.id !== "dashboard")
                    .map((m) => (
                      <li key={m.id}>
                        <button
                          type="button"
                          onClick={() => ir(m.id)}
                          className="ce-levanta group flex w-full items-center gap-3 rounded-2xl bg-[oklch(0.975_0.01_300)] p-3 pr-4 text-left ring-1 ring-transparent hover:bg-card hover:ring-border dark:bg-muted/40"
                        >
                          <span
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-[0_8px_18px_-10px_rgba(76,29,149,0.8)]"
                            style={{ background: "var(--gradient-brand)" }}
                          >
                            <ModuleIcon name={m.icon} className="h-[18px] w-[18px]" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold">{etiquetaModulo(m, planId)}</span>
                            <span className="block truncate text-xs text-muted-foreground">{DETALLE_MODULO[m.id] ?? ""}</span>
                          </span>
                          <ChevronRight className="ce-flecha h-4 w-4 text-muted-foreground" />
                        </button>
                      </li>
                    ))}
                </ul>
              </section>
            )}

            {esAdmin && planWeb && (
              <section className="ce-tarjeta-suave p-6 sm:p-8">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-extrabold tracking-tight">Lo que incluye tu plan {planWeb.name}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{planWeb.tagline}</p>
                  </div>
                  <ul className="flex flex-wrap gap-2 text-xs font-semibold">
                    {[planWeb.branches, planWeb.users, planWeb.externalUsers].filter(Boolean).map((l) => (
                      <li key={l} className="rounded-full bg-primary/10 px-3 py-1.5 text-primary">
                        {l}
                      </li>
                    ))}
                  </ul>
                </div>
                <ul className="mt-6 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {planWeb.features.map((texto) => {
                    const Icono = iconoDe(texto);
                    return (
                      <li
                        key={texto}
                        className="ce-levanta group flex items-center gap-3 rounded-2xl bg-[oklch(0.975_0.01_300)] p-3 pr-4 ring-1 ring-transparent hover:bg-card hover:ring-border dark:bg-muted/40"
                      >
                        <span
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-[0_8px_18px_-10px_rgba(76,29,149,0.8)] transition-transform duration-300 group-hover:scale-105"
                          style={{ background: "var(--gradient-brand)" }}
                        >
                          <Icono className="h-[18px] w-[18px]" />
                        </span>
                        <span className="text-sm font-semibold leading-snug">{texto}</span>
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-5 text-xs text-muted-foreground">
                  Los módulos se van habilitando en tu cuenta. Para sumar más, podés pasarte a un plan mayor.
                </p>
              </section>
            )}
          </div>
        )}
        {vista === "equipo" && esAdmin && (
          <>
            <CabeceraModulo icono="team" titulo="Equipo" detalle={DETALLE_MODULO["equipo"]!} />
            <EquipoClinicaPanel slug={slug} />
          </>
        )}
        {vista === "cuenta" && (
          <>
            <CabeceraModulo icono="users" titulo="Mi cuenta" detalle="Tus datos y tu contraseña" />
            <MiCuentaClinica slug={slug} sesion={sesion} />
          </>
        )}
        {modulo && vista !== "dashboard" && vista !== "equipo" && (
          <>
            <CabeceraModulo icono={modulo.icon} titulo={etiquetaModulo(modulo, planId)} detalle={DETALLE_MODULO[modulo.id] ?? ""} />
            <ModuloEnPreparacion nombre={etiquetaModulo(modulo, planId)} icono={modulo.icon} />
          </>
        )}
      </ClinicaShell>
    </>
  );
}

/* Mientras un módulo todavía no guarda en el servidor, NO se muestra con datos de ejemplo:
   así nadie carga información real de un paciente en un lugar que no la guarda. */
function ModuloEnPreparacion({ nombre, icono }: { nombre: string; icono: string }) {
  return (
    <section className="ce-tarjeta relative overflow-hidden px-6 py-14 text-center sm:px-10 sm:py-20">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(124,58,237,0.10),transparent_60%)]"
      />
      <span
        className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-[1.25rem] text-white shadow-[0_18px_36px_-16px_rgba(76,29,149,0.9)]"
        style={{ background: "var(--gradient-brand)" }}
      >
        <ModuleIcon name={icono} className="h-7 w-7" />
      </span>
      <h2 className="relative mt-6 text-xl font-extrabold tracking-tight">{nombre} se está preparando para tu clínica</h2>
      <p className="relative mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        Estamos dejando este módulo listo para guardar los datos de tu clínica de forma segura. Te avisamos apenas esté
        disponible.
      </p>
    </section>
  );
}

const TONO_DATO = {
  verde: { icono: "bg-emerald-500/12 text-emerald-600", barra: "bg-emerald-500" },
  ambar: { icono: "bg-amber-500/15 text-amber-600", barra: "bg-amber-500" },
  violeta: { icono: "bg-primary/10 text-primary", barra: "bg-primary" },
};

function Dato({
  valor,
  texto,
  icono: Icono,
  tono,
}: {
  valor: number | string | null;
  texto: string;
  icono: typeof UserPlus;
  tono: keyof typeof TONO_DATO;
}) {
  const t = TONO_DATO[tono];
  return (
    <div className="ce-levanta relative overflow-hidden rounded-2xl bg-card p-3.5 ring-1 ring-border sm:min-w-[8.5rem] sm:p-4">
      <span className={cn("absolute inset-x-0 top-0 h-1", t.barra)} aria-hidden="true" />
      <span className={cn("flex h-8 w-8 items-center justify-center rounded-xl sm:h-9 sm:w-9", t.icono)}>
        <Icono className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
      </span>
      <p className="mt-3 text-2xl font-extrabold tabular-nums leading-none tracking-tight sm:text-3xl">{valor ?? "–"}</p>
      <p className="mt-1.5 text-[11px] font-semibold leading-tight text-muted-foreground sm:text-xs">{texto}</p>
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
