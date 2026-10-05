import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  Briefcase,
  Building2,
  Crown,
  Download,
  Laptop,
  Loader2,
  Share,
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
    <main className="min-h-dvh bg-background px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] text-foreground sm:px-6">
      <div className="mx-auto w-full max-w-5xl">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <BrandMark className="size-10" />
            <div className="leading-tight">
              <p className="font-display text-lg font-bold">Cloud Esther</p>
              <p className="text-xs text-muted-foreground">Acceso de prueba</p>
            </div>
          </div>
          <span className="rounded-full border border-amber-300/60 bg-amber-100/60 px-3 py-1 text-[11px] font-semibold text-amber-800 dark:bg-amber-400/10 dark:text-amber-200">
            Solo para revisar el diseño · sin permisos reales
          </span>
        </header>

        <section className="mt-6 rounded-3xl border border-primary/15 bg-card p-5 shadow-sm sm:p-7">
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Elegí qué experiencia querés probar
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Entrás directo a cada perfil con datos de ejemplo. Funciona en la computadora, la tablet
            y el celular. Los permisos, roles y la seguridad definitivos se configuran después en el
            servidor.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1">
              <Laptop className="size-3.5" /> PC: experiencia completa
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1">
              <Tablet className="size-3.5" /> Tablet: adaptada
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1">
              <Smartphone className="size-3.5" /> Celular: modo aplicación
            </span>
          </div>
        </section>

        {error && (
          <p className="mt-4 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {PERFILES.map((p) => (
            <article
              key={p.id}
              className="flex flex-col rounded-3xl border border-border bg-card p-5 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <span
                  className={`grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${p.color} text-white shadow-md`}
                >
                  <p.icon className="size-6" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-base font-bold">{p.titulo}</h2>
                  <p className="text-xs font-medium text-primary">{p.quien}</p>
                </div>
              </div>
              <p className="mt-3 flex-1 text-sm text-muted-foreground">{p.detalle}</p>
              {p.id === "clinica" && (
                <div className="mt-3">
                  <p className="text-[11px] font-semibold text-muted-foreground">
                    Plan para probar
                  </p>
                  <div className="mt-1.5 grid grid-cols-4 gap-1 rounded-xl bg-muted p-1">
                    {PLANES.map((x) => (
                      <button
                        key={x.id}
                        type="button"
                        onClick={() => setPlan(x.id)}
                        aria-pressed={plan === x.id}
                        className={`min-h-10 rounded-lg text-xs font-semibold transition ${
                          plan === x.id
                            ? "bg-card text-primary shadow-sm"
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
                className="btn-ce mt-4 !min-h-12 w-full justify-center"
              >
                {cargando === p.id ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ArrowRight className="size-4" />
                )}
                Entrar
              </button>
            </article>
          ))}
        </div>

        <section className="mt-5 rounded-3xl border border-primary/15 bg-gradient-to-br from-primary/[0.07] to-card p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-base font-bold">Instalar Cloud Esther como aplicación</h2>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                {app.instalada
                  ? "Ya la estás usando como aplicación instalada."
                  : app.ios
                    ? "En iPhone o iPad: tocá Compartir y después «Agregar a inicio»."
                    : "Queda un ícono en el celular, la tablet o la PC y se abre en pantalla completa, como una app."}
              </p>
            </div>
            {app.puedeInstalar ? (
              <button
                type="button"
                onClick={() => void app.instalar()}
                className="btn-ce !min-h-12"
              >
                <Download className="size-4" /> Instalar app
              </button>
            ) : app.ios ? (
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold">
                <Share className="size-4" /> Compartir → Agregar a inicio
              </span>
            ) : null}
          </div>
          {!app.instalada && !app.puedeInstalar && !app.ios && (
            <p className="mt-3 text-[11px] text-muted-foreground">
              Si no aparece el botón: en Chrome o Edge usá el menú ⋮ → «Instalar Cloud Esther». La
              instalación necesita la dirección publicada (https).
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
