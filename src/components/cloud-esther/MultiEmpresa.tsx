// src/components/cloud-esther/MultiEmpresa.tsx

import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Building2, CalendarCheck, ChevronRight, LifeBuoy, MapPin, Plus, Stethoscope, Users } from "lucide-react";
import { toast } from "sonner";

import { useCloudEsther } from "@/lib/cloud-esther/data";
import { useSesion } from "@/lib/cloud-esther/auth-store";
import { useClinicaReal } from "@/lib/clinica/modo-clinica";
import { useClinicSettings } from "@/lib/cloud-esther/settings-store";
import { useEquipo } from "@/lib/cloud-esther/equipo-store";
import { storeAgenda } from "@/lib/cloud-esther/agenda-store";
import { LIMITE_SUCURSALES } from "@/lib/cloud-esther/inventario-store";
import { mesISO } from "@/lib/cloud-esther/finanzas-store";
import { sedesDeMiembro, type TeamMember, type TeamRole } from "@/lib/cloud-esther/equipo-profesional-data";
import { SedesEditor } from "@/components/cloud-esther/SedesEditor";
import { TableroSedes } from "@/components/cloud-esther/TableroSedes";
import { CapacidadDeMiPlan } from "@/components/clinica/pedir-capacidad";

/* Ubicación: src/components/cloud-esther/MultiEmpresa.tsx
   MULTIEMPRESA (Enterprise): lo que el dueño de un grupo necesita ver de SU clínica, sin nada
   técnico ni de ejemplo. Resumen (cada sede con sus números reales), Sedes (la misma lista
   que Configuración), Equipo por sede (quién trabaja dónde) y Plan (cuánto usa y sumar más).
   Otra clínica con otra razón social es otra cuenta (así sus datos quedan separados): se pide
   a Cloud Esther desde Soporte. */

type TabId = "resumen" | "sedes" | "equipo" | "plan";
const TABS: { id: TabId; label: string }[] = [
  { id: "resumen", label: "Resumen" },
  { id: "sedes", label: "Sedes" },
  { id: "equipo", label: "Equipo por sede" },
  { id: "plan", label: "Plan" },
];

const ROL: Record<TeamRole, string> = {
  odontologo: "Odontólogo/a",
  asistente: "Asistente",
  secretaria: "Secretaria",
  administrador: "Administrador/a",
};

function FondoMultiEmpresa() {
  return (
    <>
      <style>{`
        @keyframes multiFloat {
          0%, 100% { transform: translate3d(0,0,0) scale(1); }
          50% { transform: translate3d(16px,-12px,0) scale(1.04); }
        }
        .multi-float { animation: multiFloat 13s ease-in-out infinite; }
      `}</style>
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.025] via-transparent to-primary/[0.02]" />
        <div className="multi-float absolute -left-32 top-24 h-96 w-96 rounded-full bg-primary/[0.035] blur-3xl" />
        <div className="multi-float absolute -right-32 top-1/3 h-[28rem] w-[28rem] rounded-full bg-violet-400/[0.035] blur-3xl" />
      </div>
    </>
  );
}

function StatCard({ label, value, hint, icon: Icon }: { label: string; value: string; hint: string; icon: typeof Users }) {
  return (
    <div className="group relative overflow-hidden rounded-3xl border border-primary/10 bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-md">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-primary/10 transition-transform duration-200 group-hover:scale-110"
      />
      <div className="relative flex items-start justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 shrink-0 text-primary/70" />
      </div>
      <div className="relative mt-3 text-[26px] font-bold leading-none text-primary">{value}</div>
      <div className="relative mt-2.5 truncate text-xs text-muted-foreground">{hint}</div>
    </div>
  );
}

function Panel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-primary/15 bg-card/85 p-5 shadow-sm backdrop-blur-md md:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

const iniciales = (n: string) =>
  n
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

export function MultiEmpresa() {
  const [tab, setTab] = useState<TabId>("resumen");
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);
  const { clinic, plan } = useCloudEsther();
  const { clinica } = useSesion();
  const real = useClinicaReal();
  const settings = useClinicSettings(clinic);
  const { miembros } = useEquipo();
  const { turnos } = storeAgenda.usar();

  const nombreClinica = real?.sesion.clinica.nombre || settings.datosClinica.nombre || clinica?.nombre || "Tu clínica";
  const sedes = settings.sucursales.length ? settings.sucursales : [nombreClinica];
  const limite = LIMITE_SUCURSALES[plan] ?? 1;
  const activos = miembros.filter((m) => m.status !== "inactivo");
  const profesionales = activos.filter((m) => m.role === "odontologo");
  const mes = mesISO(0);
  const turnosMes = turnos.filter((t) => t.fecha.startsWith(mes) && t.estado !== "Cancelada").length;

  if (!montado) {
    return <div className="mx-auto w-full max-w-[1420px] px-4 py-16 text-center text-sm text-muted-foreground">Cargando…</div>;
  }

  return (
    <div className="relative mx-auto w-full max-w-[1420px] space-y-5 px-4 py-6 md:px-6 lg:px-8">
      <FondoMultiEmpresa />

      {/* Encabezado */}
      <section className="relative overflow-hidden rounded-[30px] border border-primary/15 bg-gradient-to-br from-white via-white/96 to-primary/[0.045] shadow-[0_20px_55px_-38px_rgba(76,29,149,0.55)]">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-primary/55 via-primary to-pink-400/60" />
        <div className="relative flex flex-wrap items-start justify-between gap-5 p-5 md:p-7">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/10 bg-primary/[0.07] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
              <Building2 className="size-3.5" /> Enterprise
            </span>
            <h1 className="mt-4 text-[32px] font-bold tracking-[-0.035em] md:text-[40px]">Multiempresa</h1>
            <p className="mt-2 max-w-2xl text-[13px] leading-6 text-muted-foreground md:text-sm">
              Las sedes de {nombreClinica}, quién trabaja en cada una y cómo le va a cada sede, en un solo lugar.
            </p>
          </div>
          <button type="button" onClick={() => setTab("sedes")} className="btn-ce">
            <Plus className="h-4 w-4" /> Nueva sede
          </button>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        <StatCard label="Sedes" value={String(sedes.length)} hint={`Tu plan permite hasta ${limite}`} icon={MapPin} />
        <StatCard label="Equipo" value={String(activos.length)} hint="Personas activas" icon={Users} />
        <StatCard label="Profesionales" value={String(profesionales.length)} hint="Odontólogos activos" icon={Stethoscope} />
        <StatCard label="Turnos del mes" value={String(turnosMes)} hint="En todas las sedes" icon={CalendarCheck} />
      </div>

      <nav className="flex flex-wrap gap-1.5 rounded-2xl border border-primary/10 bg-primary/[0.025] p-1.5" aria-label="Secciones de Multiempresa">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            aria-pressed={tab === t.id}
            className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
              tab === t.id
                ? "bg-primary text-primary-foreground shadow-[0_8px_18px_-10px_rgba(124,58,237,0.8)]"
                : "text-muted-foreground hover:bg-card hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "resumen" && <TableroSedes nombreClinica={nombreClinica} />}

      {tab === "sedes" && (
        <Panel title="Sedes">
          <p className="mb-4 rounded-2xl bg-primary/[0.035] p-3 text-xs leading-relaxed text-muted-foreground">
            Es la misma lista que Configuración → Sucursales. Cada sede que cargás acá aparece en la Agenda, los turnos
            online, Finanzas, Inventario y Equipo. Si le cambiás el nombre, lo ya cargado pasa al nombre nuevo.
          </p>
          <SedesEditor onToast={(m) => toast.success(m)} nombreClinica={nombreClinica} />
        </Panel>
      )}

      {tab === "equipo" && <EquipoPorSede sedes={sedes} miembros={activos} />}

      {tab === "plan" && (
        <div className="space-y-5">
          <CapacidadDeMiPlan onToast={(m) => toast.success(m)} />
          <section className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-primary/15 bg-card/85 p-5 shadow-sm md:p-6">
            <div className="flex min-w-0 items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                <Building2 className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="font-semibold">¿Tenés otra clínica, con otra razón social?</p>
                <p className="mt-0.5 max-w-2xl text-xs leading-relaxed text-muted-foreground">
                  Cada clínica tiene su propia cuenta, así sus pacientes, cobros y facturas quedan separados. Si es la misma
                  clínica en otro lugar, cargala como una sede nueva. Si es otra empresa, escribinos y la damos de alta.
                </p>
              </div>
            </div>
            <Link to={"/demo/soporte" as never} className="btn-ce-outline shrink-0">
              <LifeBuoy className="size-4" /> Pedir otra clínica
            </Link>
          </section>
        </div>
      )}
    </div>
  );
}

/* Quién trabaja en cada sede (Equipo → Agendas y horarios → Sedes donde trabaja) */
function EquipoPorSede({ sedes, miembros }: { sedes: string[]; miembros: TeamMember[] }) {
  if (miembros.length === 0) {
    return (
      <Panel title="Equipo por sede">
        <div className="rounded-2xl border border-dashed border-primary/25 bg-primary/[0.03] p-5 text-center text-sm text-muted-foreground">
          Todavía no cargaste a tu equipo.
          <div className="mt-3">
            <Link to={"/demo/equipo-profesional" as never} className="btn-ce-outline">
              Ir a Equipo
            </Link>
          </div>
        </div>
      </Panel>
    );
  }
  return (
    <Panel
      title="Equipo por sede"
      action={
        sedes.length > 1 ? (
          <Link
            to={"/demo/equipo-profesional/agendas-horarios" as never}
            className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-card px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/[0.05]"
          >
            Cambiar quién trabaja dónde <ChevronRight className="size-3.5" />
          </Link>
        ) : undefined
      }
    >
      {sedes.length < 2 && (
        <p className="mb-4 rounded-2xl bg-primary/[0.035] p-3 text-xs text-muted-foreground">
          Con una sola sede, todo el equipo trabaja ahí. Cuando sumes otra sede, vas a poder elegir quién trabaja en cada una.
        </p>
      )}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" data-movil="1col">
        {sedes.map((sede) => {
          const de = miembros.filter((m) => m.role === "administrador" || sedesDeMiembro(m, sedes).includes(sede));
          return (
            <div key={sede} className="rounded-2xl border border-primary/10 bg-white/85 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Building2 className="size-4" />
                  </span>
                  <b className="truncate text-sm">{sede}</b>
                </span>
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {de.length} {de.length === 1 ? "persona" : "personas"}
                </span>
              </div>
              <ul className="mt-3 space-y-1.5">
                {de.map((m) => {
                  const nombre = `${m.firstName} ${m.lastName}`.trim();
                  const todas = m.role === "administrador" || sedesDeMiembro(m, sedes).length === sedes.length;
                  return (
                    <li key={m.id} className="flex items-center gap-2 text-[12.5px]">
                      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                        {iniciales(nombre)}
                      </span>
                      <span className="min-w-0 flex-1 truncate">
                        <b className="font-semibold">{nombre}</b>
                        <span className="text-muted-foreground"> · {ROL[m.role]}</span>
                      </span>
                      {sedes.length > 1 && todas && (
                        <span className="shrink-0 rounded-full bg-primary/[0.07] px-2 py-0.5 text-[10px] font-semibold text-primary">Todas</span>
                      )}
                    </li>
                  );
                })}
                {de.length === 0 && <li className="text-xs text-muted-foreground">Nadie asignado a esta sede.</li>}
              </ul>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
