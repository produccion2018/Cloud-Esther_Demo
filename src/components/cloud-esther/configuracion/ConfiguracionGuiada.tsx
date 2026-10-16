import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BellRing,
  Building2,
  CalendarOff,
  Check,
  ChevronLeft,
  Clock3,
  Palette,
  ReceiptText,
  Rocket,
  Sparkles,
  Stethoscope,
  Users,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { storeAgenda } from "@/lib/cloud-esther/agenda-store";
import { useCloudEsther } from "@/lib/cloud-esther/data";
import { useEquipo } from "@/lib/cloud-esther/equipo-store";
import { PLANES_MARCA } from "@/lib/cloud-esther/marca";
import { usePacientes } from "@/lib/cloud-esther/pacientes";
import { storePresupuestos } from "@/lib/cloud-esther/presupuestos-store";
import {
  DATOS_CLINICA_VACIOS,
  cargarSettings,
  guardarSettings,
  useClinicSettings,
  type DatosClinica,
} from "@/lib/cloud-esther/settings-store";
import { tenantActual } from "@/lib/cloud-esther/tenant-store";
import { PAISES_SOPORTADOS, bandera } from "@/lib/paises";

/* Ubicación: src/components/cloud-esther/configuracion/ConfiguracionGuiada.tsx
   CONFIGURACIÓN GUIADA (todos los planes, solo el Administrador):
   - Tarjeta «Primeros pasos» en el inicio con el checklist de lo que falta. Cada paso se marca
     SOLO cuando el dato existe de verdad en la clínica (no hay que tildar nada a mano).
   - Asistente paso a paso: datos de la clínica (se completan ahí mismo), profesionales, horarios,
     lista de precios, pacientes (o importarlos), feriados, recordatorios y marca propia (Plus+).
   - Se abre solo la primera vez que entra el Administrador de una clínica sin datos.
   Todo es de SU clínica (los datos salen de los módulos de esa empresa). */

type Paso = {
  id: string;
  titulo: string;
  detalle: string;
  icon: LucideIcon;
  hecho: boolean;
  ir: string;
  boton: string;
};

function usePasos(): Paso[] {
  const { clinic, plan } = useCloudEsther();
  const settings = useClinicSettings(clinic);
  const { miembros } = useEquipo();
  const { pacientes } = usePacientes();
  const { feriados = [], recordatorios } = storeAgenda.usar();
  const { aranceles } = storePresupuestos.usar();
  const d = settings.datosClinica;
  const odontologos = miembros.filter((m) => m.role === "odontologo" && m.status !== "inactivo");
  const pasos: Paso[] = [
    {
      id: "datos",
      titulo: "Datos de la clínica",
      detalle: "Nombre, dirección, teléfono y país: salen en recetas, documentos y el portal.",
      icon: Building2,
      hecho: !!(d.nombre && d.direccion && d.telefono),
      ir: "/demo/configuracion",
      boton: "Completar datos",
    },
    {
      id: "profesionales",
      titulo: "Profesionales",
      detalle: "Sumá a los odontólogos con su especialidad y matrícula.",
      icon: Stethoscope,
      hecho: odontologos.length > 0,
      ir: "/demo/equipo-profesional",
      boton: "Ir a Equipo",
    },
    {
      id: "horarios",
      titulo: "Horarios de atención",
      detalle: "Días y horas de cada profesional: la agenda ofrece turnos solo ahí.",
      icon: Clock3,
      hecho: odontologos.some((m) => m.schedule.some((s) => s.active)),
      ir: "/demo/equipo-profesional/agendas-horarios",
      boton: "Cargar horarios",
    },
    {
      id: "precios",
      titulo: "Lista de precios",
      detalle: "Aranceles de cada práctica para presupuestos, cobros y liquidaciones.",
      icon: ReceiptText,
      hecho: aranceles.length > 0,
      ir: "/demo/presupuestos",
      boton: "Ver aranceles",
    },
    {
      id: "pacientes",
      titulo: "Pacientes",
      detalle: "Dalos de alta o importá tu listado desde Excel en un minuto.",
      icon: Users,
      hecho: pacientes.length > 0,
      ir: "/demo/pacientes",
      boton: "Ir a Pacientes",
    },
    {
      id: "feriados",
      titulo: "Feriados y días sin atención",
      detalle: "Se marcan en la agenda y no se ofrecen turnos esos días.",
      icon: CalendarOff,
      hecho: feriados.length > 0,
      ir: "/demo/agenda",
      boton: "Ir a la Agenda",
    },
    {
      id: "recordatorios",
      titulo: "Recordatorios de turnos",
      detalle: "Avisos automáticos antes de cada turno para reducir ausencias.",
      icon: BellRing,
      hecho: recordatorios.some((r) => r.activo),
      ir: "/demo/comunicaciones",
      boton: "Configurar avisos",
    },
  ];
  if (PLANES_MARCA.has(plan))
    pasos.push({
      id: "marca",
      titulo: "Tu marca",
      detalle: "Logo y color de la clínica en el sistema, el portal y los documentos.",
      icon: Palette,
      hecho: !!settings.marca?.logo,
      ir: "/demo/configuracion",
      boton: "Subir logo",
    });
  return pasos;
}

const claveVisto = () => `cloud-esther:guia-vista:${tenantActual()}`;

/** Tarjeta «Primeros pasos» del inicio (se oculta sola al completar todo) */
export function PrimerosPasos() {
  const pasos = usePasos();
  const [abierto, setAbierto] = useState(false);
  const [oculto, setOculto] = useState(false);
  const hechos = pasos.filter((p) => p.hecho).length;
  const total = pasos.length;
  const avance = Math.round((hechos / total) * 100);

  // Primera vez del Administrador con la clínica casi vacía: se abre el asistente solo
  useEffect(() => {
    try {
      const visto = window.localStorage.getItem(claveVisto());
      setOculto(window.localStorage.getItem(`${claveVisto()}:oculta`) === "1");
      if (!visto && hechos <= 2) {
        window.localStorage.setItem(claveVisto(), "1");
        setAbierto(true);
      }
    } catch {
      /* sin almacenamiento: no se abre solo */
    }
    // solo al montar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if ((hechos === total || oculto) && !abierto) return null;
  const siguiente = pasos.find((p) => !p.hecho);
  const R = 30;
  const C = 2 * Math.PI * R;

  return (
    <>
      <section className="ce-portal-entrar relative mb-5 mt-6 overflow-hidden rounded-[28px] border border-primary/12 bg-card shadow-[0_24px_54px_-38px_rgba(76,29,149,0.7)]">
        <div aria-hidden className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-gradient-to-br from-primary/15 to-fuchsia-400/15 blur-3xl" />
        <div className="relative grid gap-5 p-5 lg:grid-cols-[auto_1fr_auto] lg:items-center">
          <div className="flex items-center gap-4">
            <div className="relative size-[76px] shrink-0">
              <svg viewBox="0 0 76 76" className="size-full -rotate-90">
                <defs>
                  <linearGradient id="ce-guia-anillo" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#7c3aed" />
                    <stop offset="100%" stopColor="#d946ef" />
                  </linearGradient>
                </defs>
                <circle cx="38" cy="38" r={R} fill="none" stroke="currentColor" strokeWidth="7" className="text-muted" />
                <circle cx="38" cy="38" r={R} fill="none" stroke="url(#ce-guia-anillo)" strokeWidth="7" strokeLinecap="round" strokeDasharray={`${Math.max(0.01, (avance / 100) * C)} ${C}`} className="ce-grafico-trazo" />
              </svg>
              <span className="absolute inset-0 grid place-items-center font-display text-base font-bold tabular-nums">{avance}%</span>
            </div>
            <div className="lg:hidden">
              <p className="font-display text-lg font-bold">Primeros pasos</p>
              <p className="text-xs text-muted-foreground">{hechos} de {total} listos</p>
            </div>
          </div>
          <div className="min-w-0">
            <p className="hidden items-center gap-2 font-display text-lg font-bold lg:flex">
              <Rocket className="size-5 text-primary" /> Primeros pasos · {hechos} de {total} listos
            </p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {pasos.map((p) => (
                <li key={p.id}>
                  <Link
                    to={p.ir as never}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      p.hecho
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                        : "border border-primary/15 bg-card text-foreground/80 hover:border-primary/40 hover:text-primary"
                    }`}
                  >
                    {p.hecho ? <Check className="size-3.5" /> : <p.icon className="size-3.5 text-primary" />}
                    {p.titulo}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setAbierto(true)} className="btn-ce !min-h-11">
              <Sparkles className="size-4" /> {siguiente ? "Seguir configurando" : "Ver la guía"}
            </button>
            <button
              type="button"
              onClick={() => {
                setOculto(true);
                try {
                  window.localStorage.setItem(`${claveVisto()}:oculta`, "1");
                } catch {
                  /* nada */
                }
              }}
              className="grid size-11 place-items-center rounded-xl text-muted-foreground hover:bg-muted"
              aria-label="Ocultar primeros pasos"
              title="Ocultar"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-1 bg-muted">
          <span className="ce-portal-crecer block h-full bg-gradient-to-r from-primary via-violet-500 to-fuchsia-500" style={{ width: `${avance}%` }} />
        </span>
      </section>
      {abierto && <AsistenteConfiguracion pasos={pasos} onCerrar={() => setAbierto(false)} />}
    </>
  );
}

function AsistenteConfiguracion({ pasos, onCerrar }: { pasos: Paso[]; onCerrar: () => void }) {
  const { clinic } = useCloudEsther();
  const primero = Math.max(0, pasos.findIndex((p) => !p.hecho));
  const [i, setI] = useState(primero);
  const [datos, setDatos] = useState<DatosClinica>(() => ({ ...DATOS_CLINICA_VACIOS, ...cargarSettings(clinic).datosClinica }));
  const [guardado, setGuardado] = useState(false);
  const fin = i >= pasos.length;
  const paso = pasos[i];

  const guardarDatos = () => {
    const s = cargarSettings(clinic);
    guardarSettings(clinic, { ...s, datosClinica: { ...datos, nombre: datos.nombre.trim(), direccion: datos.direccion.trim() } });
    setGuardado(true);
    window.setTimeout(() => setGuardado(false), 1800);
  };
  const campo = (k: keyof DatosClinica, label: string, ph = "") => (
    <label className="text-xs font-semibold">
      {label}
      <input
        value={datos[k]}
        placeholder={ph}
        onChange={(e) => setDatos((x) => ({ ...x, [k]: e.target.value.slice(0, 120) }))}
        className="mt-1 h-11 w-full rounded-xl border border-primary/15 bg-card px-3 text-sm outline-none focus:border-primary/45 focus:ring-4 focus:ring-primary/10"
      />
    </label>
  );

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-[radial-gradient(circle_at_50%_0%,rgba(124,58,237,0.35),rgba(15,5,30,0.55))] backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={onCerrar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Configuración guiada"
        onMouseDown={(e) => e.stopPropagation()}
        className="grid max-h-[94vh] w-full overflow-hidden rounded-t-[28px] border border-primary/15 bg-card shadow-[0_40px_90px_-30px_rgba(76,29,149,0.8)] sm:max-w-3xl sm:grid-cols-[230px_1fr] sm:rounded-[28px]"
      >
        {/* Pasos */}
        <aside className="relative hidden overflow-hidden bg-[linear-gradient(160deg,#3b0764,#6d28d9_55%,#a21caf)] p-5 text-white sm:block">
          <div aria-hidden className="pointer-events-none absolute -bottom-16 -left-10 size-48 rounded-full bg-fuchsia-300/25 blur-3xl" />
          <p className="relative text-[10.5px] font-bold uppercase tracking-[0.2em] text-white/70">Configuración guiada</p>
          <ol className="relative mt-4 space-y-1">
            {pasos.map((p, n) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => setI(n)}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left text-[12.5px] transition ${n === i ? "bg-white/20 font-bold" : "text-white/80 hover:bg-white/10"}`}
                >
                  <span className={`grid size-6 shrink-0 place-items-center rounded-full text-[10.5px] font-bold ${p.hecho ? "bg-emerald-400 text-emerald-950" : n === i ? "bg-white text-primary" : "bg-white/15"}`}>
                    {p.hecho ? <Check className="size-3.5" /> : n + 1}
                  </span>
                  <span className="truncate">{p.titulo}</span>
                </button>
              </li>
            ))}
          </ol>
        </aside>

        <div className="flex min-h-[420px] flex-col overflow-y-auto p-5 sm:p-7">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              {fin ? "Listo" : `Paso ${i + 1} de ${pasos.length}`}
            </p>
            <button type="button" onClick={onCerrar} aria-label="Cerrar" className="grid size-9 place-items-center rounded-xl hover:bg-muted">
              <X className="size-4" />
            </button>
          </div>

          {fin || !paso ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
              <span className="relative">
                <span aria-hidden className="ce-esther-halo absolute -inset-4 rounded-full bg-primary/25 blur-xl" />
                <span className="relative grid size-16 place-items-center rounded-full bg-gradient-to-br from-primary to-fuchsia-500 text-white shadow-lg">
                  <Rocket className="size-7" />
                </span>
              </span>
              <p className="font-display text-2xl font-bold">¡Tu clínica está en marcha!</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                {pasos.filter((p) => !p.hecho).length
                  ? "Los pasos que faltan quedan en la tarjeta «Primeros pasos» del inicio para retomarlos cuando quieras."
                  : "Completaste todos los pasos. Ya podés trabajar con todo Cloud Esther."}
              </p>
              <button type="button" onClick={onCerrar} className="btn-ce mt-2 !min-h-11">
                Empezar a trabajar
              </button>
            </div>
          ) : (
            <>
              <div className="mt-4 flex items-start gap-3">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary to-fuchsia-500 text-white shadow-[0_12px_24px_-12px_rgba(124,58,237,0.95)]">
                  <paso.icon className="size-6" />
                </span>
                <div>
                  <h2 className="font-display text-xl font-bold tracking-tight">{paso.titulo}</h2>
                  <p className="mt-0.5 text-sm text-muted-foreground">{paso.detalle}</p>
                </div>
              </div>

              <div className="mt-5 flex-1">
                {paso.id === "datos" ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {campo("nombre", "Nombre de la clínica", "Ej.: Clínica Dental Sonrisas")}
                    {campo("telefono", "Teléfono", "+54 11 …")}
                    <div className="sm:col-span-2">{campo("direccion", "Dirección", "Calle, número y ciudad")}</div>
                    {campo("email", "Correo de la clínica", "turnos@tuclinica.com")}
                    <label className="text-xs font-semibold">
                      País
                      <select
                        value={datos.pais}
                        onChange={(e) => setDatos((x) => ({ ...x, pais: e.target.value }))}
                        className="mt-1 h-11 w-full rounded-xl border border-primary/15 bg-card px-3 text-sm"
                      >
                        <option value="">Elegí el país</option>
                        {PAISES_SOPORTADOS.map((p) => (
                          <option key={p.codigo} value={p.codigo}>
                            {bandera(p.codigo)} {p.nombre}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="sm:col-span-2">
                      <button type="button" onClick={guardarDatos} disabled={!datos.nombre.trim()} className="btn-ce !min-h-11 disabled:opacity-50">
                        <Check className="size-4" /> {guardado ? "¡Guardado!" : "Guardar datos"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className={`rounded-3xl border p-5 ${paso.hecho ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-500/30 dark:bg-emerald-500/5" : "border-primary/12 bg-gradient-to-br from-primary/[0.04] to-fuchsia-500/[0.04]"}`}>
                    <p className="flex items-center gap-2 text-sm font-bold">
                      {paso.hecho ? (
                        <>
                          <Check className="size-4 text-emerald-600" /> Este paso ya está listo
                        </>
                      ) : (
                        <>
                          <Sparkles className="size-4 text-primary" /> Falta completarlo
                        </>
                      )}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Se marca solo cuando el dato existe en tu clínica. Podés hacerlo ahora o más tarde.
                    </p>
                    <Link to={paso.ir as never} onClick={onCerrar} className="btn-ce mt-4 !min-h-11">
                      {paso.boton} <ArrowRight className="size-4" />
                    </Link>
                  </div>
                )}
              </div>

              <div className="mt-6 flex items-center justify-between gap-2">
                <button type="button" onClick={() => setI((x) => Math.max(0, x - 1))} disabled={i === 0} className="btn-ce-outline !min-h-11 disabled:opacity-40">
                  <ChevronLeft className="size-4" /> Anterior
                </button>
                <button type="button" onClick={() => setI((x) => x + 1)} className="btn-ce !min-h-11">
                  {i === pasos.length - 1 ? "Terminar" : "Siguiente"} <ArrowRight className="size-4" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
