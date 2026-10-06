import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  Briefcase,
  Building2,
  Crown,
  Download,
  Laptop,
  Loader2,
  Smartphone,
  Stethoscope,
  Tablet,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { BrandMark } from "@/components/cloud-esther/AppShell";
import { iniciarSesionAdmin } from "@/lib/admin/api";
import { guardarSesion } from "@/lib/admin/sesion";
import { setStoredPlan, type PlanId } from "@/lib/cloud-esther/data";
import {
  asegurarAcceso,
  guardarSesionEquipo,
  storeEquipoPortal,
} from "@/lib/cloud-esther/portal-equipo-store";
import { storeEquipo } from "@/lib/cloud-esther/equipo-store";
import { guardarSesionPortal, storePortal } from "@/lib/cloud-esther/portal-store";
import { useInstalarApp } from "@/lib/pwa";
import { BotonInstalarApp } from "@/components/cloud-esther/InstalarApp";
import { VERSION_APP } from "@/lib/version";
import { marcarAccesoPrueba } from "@/lib/acceso-prueba";

/* Ubicación: src/routes/acceso-prueba.tsx
   ACCESO DE PRUEBA (solo esta etapa): entrar con un toque a los perfiles de Cloud Esther
   para revisar diseño y funcionamiento en PC, tablet y celular.
   - Propietario: inicia sesión con la cuenta de ejemplo del Dueño.
   - Clínica: abre el panel con el plan elegido.
   - Profesional y paciente: abre el portal con una persona de ejemplo que tiene acceso activo.
   No reemplaza la autenticación real: permisos, roles y seguridad definitivos van en el backend.
   TODO backend: quitar esta página (o protegerla) cuando exista el inicio de sesión real. */

export const Route = createFileRoute("/acceso-prueba")({
  head: () => ({
    meta: [
      { title: "Acceso de prueba | Cloud Esther" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AccesoPrueba,
});

const PLANES: { id: PlanId; nombre: string }[] = [
  { id: "inicial", nombre: "Start" },
  { id: "profesional", nombre: "Pro" },
  { id: "avanzada", nombre: "Plus" },
  { id: "grupo", nombre: "Enterprise" },
];

type Perfil = {
  id: "propietario" | "clinica" | "profesional" | "secretaria" | "paciente";
  titulo: string;
  quien: string;
  detalle: string;
  icon: LucideIcon;
  color: string;
};

const PERFILES: Perfil[] = [
  {
    id: "propietario",
    titulo: "Panel del propietario",
    quien: "Vos, dueño de Cloud Esther",
    detalle: "Clínicas, demos, cobros, planes, empresa, soporte y auditoría.",
    icon: Crown,
    color: "from-amber-400 to-orange-500",
  },
  {
    id: "clinica",
    titulo: "Panel de la clínica",
    quien: "Dueño o administrador de la clínica",
    detalle: "Agenda, pacientes, historia clínica, odontograma y gestión, según el plan.",
    icon: Building2,
    color: "from-violet-500 to-primary",
  },
  {
    id: "profesional",
    titulo: "Portal del profesional",
    quien: "Odontólogos, asistentes y secretaría",
    detalle: "Agenda propia, fichas de pacientes, fichaje y avisos del equipo.",
    icon: Stethoscope,
    color: "from-indigo-500 to-violet-500",
  },
  {
    id: "secretaria",
    titulo: "Secretaría / administración",
    quien: "Recepción y personal administrativo",
    detalle: "Escritorio propio: turnos por confirmar, cobros, presupuestos, Word, Excel y tareas.",
    icon: Briefcase,
    color: "from-emerald-500 to-teal-500",
  },
  {
    id: "paciente",
    titulo: "Portal del paciente",
    quien: "Pacientes de la clínica",
    detalle: "Turnos, recetas, estudios, presupuestos, pagos y documentos.",
    icon: UserRound,
    color: "from-fuchsia-500 to-pink-500",
  },
];

function AccesoPrueba() {
  const navigate = useNavigate();
  const [cargando, setCargando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<PlanId>("avanzada");
  const app = useInstalarApp();

  const entrar = async (perfil: Perfil["id"]) => {
    setError(null);
    setCargando(perfil);
    marcarAccesoPrueba();
    try {
      if (perfil === "propietario") {
        const sesion = await iniciarSesionAdmin("dueno@cloudesther.com", "Dueno2026!");
        guardarSesion(sesion, true);
        await navigate({ to: "/admin" as never });
      } else if (perfil === "clinica") {
        setStoredPlan(plan);
        await navigate({ to: "/demo" as never });
      } else if (perfil === "secretaria") {
        const sec = storeEquipo
          .leer()
          .miembros.find((m) => m.role === "secretaria" && m.status === "activo");
        if (sec) {
          asegurarAcceso(sec.id);
          guardarSesionEquipo(sec.id);
          window.location.assign("/equipo");
        } else window.location.assign("/equipo?vista=1");
      } else if (perfil === "profesional") {
        const accesos = storeEquipoPortal.leer().accesos;
        const id = Object.keys(accesos).find((k) => accesos[k]?.estado === "Activo");
        if (id) {
          guardarSesionEquipo(id);
          window.location.assign("/equipo");
        } else window.location.assign("/equipo?vista=1");
      } else {
        const accesos = storePortal.leer().accesos;
        const id = Object.keys(accesos).find((k) => accesos[Number(k)]?.estado === "Activo");
        if (id) {
          guardarSesionPortal(Number(id));
          window.location.assign("/portal");
        } else window.location.assign("/portal?vista=1");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo entrar. Probá de nuevo.");
      setCargando(null);
    }
  };

  return (
    <main
      className="relative min-h-dvh overflow-hidden px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] text-white sm:px-6"
      style={{
        background:
          "linear-gradient(135deg, #1b0a45 0%, #3b1488 28%, #6d28d9 52%, #a21caf 78%, #db2777 100%)",
      }}
    >
      {/* Fondo: luces difusas y trama de puntos */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          className="absolute -left-32 -top-32 size-[520px] rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(139,92,246,0.55), transparent 65%)" }}
        />
        <div
          className="absolute -right-40 top-1/4 size-[560px] rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(236,72,153,0.45), transparent 65%)" }}
        />
        <div
          className="absolute -bottom-48 left-1/3 size-[600px] rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(56,189,248,0.25), transparent 65%)" }}
        />
        <div
          className="absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,0.55) 1px, transparent 1px)",
            backgroundSize: "26px 26px",
            maskImage: "linear-gradient(to bottom, black, transparent 85%)",
            WebkitMaskImage: "linear-gradient(to bottom, black, transparent 85%)",
          }}
        />
      </div>

      <div className="relative mx-auto w-full max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="rounded-2xl bg-white/15 p-1 ring-1 ring-white/25 backdrop-blur-md">
              <BrandMark className="size-10" />
            </span>
            <div className="leading-tight">
              <p className="font-display text-lg font-bold">Cloud Esther</p>
              <p className="text-xs text-white/70">Acceso de prueba</p>
            </div>
          </div>
          <span className="rounded-full border border-[#fde68a]/40 bg-[#fcd34d]/15 px-3 py-1 text-[11px] font-semibold text-[#fef3c7] backdrop-blur-md">
            Solo para revisar el diseño · sin permisos reales
          </span>
        </header>

        <section className="mt-8 overflow-hidden rounded-[32px] border border-white/20 bg-white/10 p-6 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.6)] backdrop-blur-xl sm:p-9">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white/85 ring-1 ring-white/20">
            <span className="size-1.5 rounded-full bg-[#6ee7b7] shadow-[0_0_10px_rgba(110,231,183,0.9)]" />
            Demo en vivo · Versión {VERSION_APP}
          </p>
          <h1 className="mt-4 max-w-3xl font-display text-3xl font-bold leading-[1.1] tracking-tight sm:text-5xl">
            Elegí qué{" "}
            <span className="bg-gradient-to-r from-[#fde68a] via-[#fbcfe8] to-[#f5d0fe] bg-clip-text text-transparent">
              experiencia
            </span>{" "}
            querés probar
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/80 sm:text-base">
            Entrás directo a cada perfil con datos de ejemplo. Funciona en la computadora, la tablet
            y el celular. Los permisos, roles y la seguridad definitivos se configuran después en el
            servidor.
          </p>
          <div className="mt-5 flex flex-wrap gap-2 text-[11px] font-semibold">
            {(
              [
                [Laptop, "PC: experiencia completa"],
                [Tablet, "Tablet: adaptada"],
                [Smartphone, "Celular: modo aplicación"],
              ] as const
            ).map(([Icono, texto]) => (
              <span
                key={texto}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1.5 text-white/90 ring-1 ring-white/20 backdrop-blur-md"
              >
                <Icono className="size-3.5" /> {texto}
              </span>
            ))}
          </div>
        </section>

        {error && (
          <p className="mt-4 rounded-2xl border border-rose-200/40 bg-rose-500/20 px-4 py-2.5 text-sm text-white backdrop-blur-md">
            {error}
          </p>
        )}

        <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {PERFILES.map((p) => (
            <article
              key={p.id}
              className="group relative flex flex-col overflow-hidden rounded-[28px] border border-white/40 bg-card/95 p-5 text-foreground shadow-[0_24px_60px_-30px_rgba(20,0,60,0.7)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:shadow-[0_34px_70px_-30px_rgba(20,0,60,0.85)] sm:p-6"
            >
              <span
                aria-hidden
                className={`pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${p.color}`}
              />
              <span
                aria-hidden
                className={`pointer-events-none absolute -right-16 -top-16 size-44 rounded-full bg-gradient-to-br ${p.color} opacity-[0.14] blur-2xl transition group-hover:opacity-25`}
              />
              <div className="relative flex items-start gap-3.5">
                <span
                  className={`grid size-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${p.color} text-white shadow-[0_12px_24px_-10px_rgba(80,0,120,0.6)]`}
                >
                  <p.icon className="size-7" />
                </span>
                <div className="min-w-0 pt-0.5">
                  <h2 className="font-display text-lg font-bold tracking-tight">{p.titulo}</h2>
                  <p className="text-xs font-semibold text-primary">{p.quien}</p>
                </div>
              </div>
              <p className="relative mt-4 flex-1 text-sm leading-relaxed text-muted-foreground">
                {p.detalle}
              </p>
              {p.id === "clinica" && (
                <div className="relative mt-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    Plan para probar
                  </p>
                  <div className="mt-2 grid grid-cols-4 gap-1 rounded-2xl bg-muted p-1">
                    {PLANES.map((x) => (
                      <button
                        key={x.id}
                        type="button"
                        onClick={() => setPlan(x.id)}
                        aria-pressed={plan === x.id}
                        className={`min-h-10 rounded-xl text-xs font-semibold transition ${
                          plan === x.id
                            ? "bg-gradient-to-r from-primary to-fuchsia-500 text-white shadow-md"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {x.nombre}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <button
                type="button"
                onClick={() => void entrar(p.id)}
                disabled={cargando !== null}
                className={`relative mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r ${p.color} text-sm font-bold text-white shadow-[0_14px_28px_-14px_rgba(80,0,120,0.8)] transition hover:brightness-110 disabled:opacity-60`}
              >
                {cargando === p.id ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
                )}
                Entrar
              </button>
            </article>
          ))}
        </div>

        <section className="mt-6 rounded-[28px] border border-white/20 bg-white/10 p-5 backdrop-blur-xl sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/25">
                <Download className="size-5" />
              </span>
              <div className="min-w-0">
                <h2 className="text-base font-bold">Instalar Cloud Esther como aplicación</h2>
                <p className="mt-1 max-w-xl text-sm text-white/75">
                  {app.instalada
                    ? "Ya la estás usando como aplicación instalada."
                    : app.ios
                      ? "En iPhone o iPad: tocá Compartir y después «Agregar a inicio»."
                      : "Queda un ícono en el celular, la tablet o la PC y se abre en pantalla completa, como una app."}
                </p>
              </div>
            </div>
            {!app.instalada && (
              <BotonInstalarApp className="inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-5 text-sm font-bold text-[#6d28d9] shadow-lg transition hover:-translate-y-0.5" />
            )}
          </div>
        </section>

        <p className="mt-6 text-center text-[11px] text-white/55">
          Cloud Esther · Gestión inteligente para clínicas odontológicas
        </p>
      </div>
    </main>
  );
}
