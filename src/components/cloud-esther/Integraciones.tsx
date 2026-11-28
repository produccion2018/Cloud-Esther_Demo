import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  CalendarDays,
  CheckCircle2,
  Circle,
  Loader2,
  Lock,
  MessageSquare,
  Plug,
  Receipt,
  ScanLine,
  Search,
  Settings2,
  ShieldCheck,
  Stethoscope,
  Wallet,
  Webhook,
  Workflow,
  X,
} from "lucide-react";

import { AppShell } from "@/components/cloud-esther/AppShell";
import {
  CloudEstherProvider,
  PLANS,
  planLevel,
  useCloudEsther,
  type PlanId,
} from "@/lib/cloud-esther/data";
import {
  DATOS_INICIALES,
  useIntegraciones,
  type CategoriaConector,
  type Conector,
} from "@/lib/cloud-esther/integraciones";
import { useConN8n } from "@/lib/cloud-esther/n8n-acceso";
import { useEstadoAutomatizaciones } from "@/lib/clinica/automatizaciones";
import { useClinicaReal } from "@/lib/clinica/modo-clinica";

/* Ubicación: src/components/cloud-esther/Integraciones.tsx
   Conectores externos por empresa. Cada uno tiene su configuración (credenciales, cuenta,
   eventos) y una prueba de conexión. Disponibilidad por plan: Pro trae las básicas, Plus suma
   DICOM y Webhooks, Enterprise suma n8n. TODO backend: OAuth/credenciales cifradas por tenant. */

const ICONOS: Record<string, typeof Plug> = {
  message: MessageSquare,
  calendar: CalendarDays,
  wallet: Wallet,
  receipt: Receipt,
  workflow: Workflow,
  stethoscope: Stethoscope,
  scan: ScanLine,
  plug: Webhook,
};
const CATEGORIAS: CategoriaConector[] = [
  "Comunicación",
  "Pagos y facturación",
  "Clínico",
  "Automatización",
];

/* Lo que hace HOY cada conector, sin vender humo.
   · «funciona»: está conectado de verdad (se configura donde dice «ir», con las claves cifradas
     en el servidor).
   · «proximamente»: todavía no se conecta a nada; no se piden datos que no se usan. «mientras»
     dice qué se puede usar hoy en su lugar. */
type Definicion = {
  minPlan: PlanId;
  hoy: "funciona" | "proximamente";
  detalle: string;
  ir?: { label: string; to: string };
  mientras?: { texto: string; to?: string; label?: string };
};
const DEFINICION: Record<string, Definicion> = {
  whatsapp: {
    minPlan: "inicial",
    hoy: "funciona",
    detalle:
      "Manda los recordatorios y mensajes desde el número de WhatsApp Business de tu clínica.",
    ir: { label: "Configurar en Automatizaciones", to: "/demo/automatizaciones" },
  },
  n8n: {
    minPlan: "grupo",
    hoy: "funciona",
    detalle: "Dispara los flujos de Automatizaciones (incluido el agente de WhatsApp 24/7).",
    ir: { label: "Configurar en Automatizaciones", to: "/demo/automatizaciones" },
  },
  "google-calendar": {
    minPlan: "profesional",
    hoy: "proximamente",
    detalle: "Cada profesional va a ver sus turnos en el calendario de su celular.",
  },
  "pasarela-pagos": {
    minPlan: "profesional",
    hoy: "proximamente",
    detalle:
      "Cobros online con link de pago (Mercado Pago) que entran solos a la cuenta corriente.",
    mientras: {
      texto:
        "Hoy podés mandar el enlace «Ya pagué»: el paciente sube su comprobante y vos lo confirmás.",
      to: "/demo/facturacion",
      label: "Ir a Facturación",
    },
  },
  "facturacion-electronica": {
    minPlan: "profesional",
    hoy: "proximamente",
    detalle: "Autorizar los comprobantes ante el organismo fiscal de tu país (ARCA, SII, SAT…).",
    mientras: {
      texto:
        "Hoy los comprobantes salen en modo prueba: sirven como recibo, pero no tienen validez fiscal.",
    },
  },
  doctoralia: {
    minPlan: "profesional",
    hoy: "proximamente",
    detalle: "Los turnos que te reservan en Doctoralia van a entrar solos a la Agenda.",
    mientras: {
      texto: "Hoy tus pacientes pueden reservar en tu propia página de turnos online.",
      to: "/demo/agenda",
      label: "Ir a la Agenda",
    },
  },
  dicom: {
    minPlan: "avanzada",
    hoy: "proximamente",
    detalle: "Las radiografías van a llegar solas desde el equipo de rayos o el PACS.",
    mientras: {
      texto: "Hoy subís las imágenes en Estudios y diagnóstico (también desde el celular).",
      to: "/demo/estudios",
      label: "Ir a Estudios",
    },
  },
  webhooks: {
    minPlan: "avanzada",
    hoy: "proximamente",
    detalle: "Avisarle a tu propio sistema cada turno, paciente o cobro nuevo.",
  },
};

export default function Integraciones() {
  return (
    <CloudEstherProvider>
      <AppShell>
        <IntegracionesInner />
      </AppShell>
    </CloudEstherProvider>
  );
}

function IntegracionesInner() {
  const { plan, setPlan, planContratado } = useCloudEsther();
  const conN8n = useConN8n();
  const { conectores, setConectores } = useIntegraciones();
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<"Todas" | CategoriaConector>("Todas");
  const [toast, setToast] = useState<string | null>(null);
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);

  const aviso = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(null), 2600);
  };
  const incluido = (c: Conector) => {
    const d = DEFINICION[c.id];
    if (c.id === "n8n") return conN8n;
    return !d || planLevel(plan) >= planLevel(d.minPlan);
  };
  // Clínica real: WhatsApp Business y n8n muestran lo que confirmó el servidor (se configuran en
  // Automatizaciones › Conexión, con las llaves cifradas en el servidor)
  const real = useClinicaReal();
  const estServ = useEstadoAutomatizaciones();
  // Los que funcionan muestran su estado REAL (del servidor). En el demo se simulan.
  const estadoReal = (c: Conector): "conectado" | "sin-conectar" | "demo" | "proximamente" => {
    if (DEFINICION[c.id]?.hoy !== "funciona") return "proximamente";
    if (!real) return "demo";
    if (c.id === "whatsapp") return estServ?.whatsapp.conectado ? "conectado" : "sin-conectar";
    if (c.id === "n8n") return estServ?.n8n.eventosUrl ? "conectado" : "sin-conectar";
    return "sin-conectar";
  };
  // Siempre el catálogo completo (lo guardado ya no decide qué se muestra)
  const vista = DATOS_INICIALES;
  // Datos que se habían cargado en conectores que no se usaban (incluidas claves): se borran
  useEffect(() => {
    if (!montado || (real && real.rol !== "admin")) return;
    if (conectores.some((c) => c.config || c.ultimaPrueba || c.estado !== "Desconectado"))
      setConectores((prev) =>
        prev.map((c) => ({
          ...c,
          estado: "Desconectado",
          config: undefined,
          ultimaPrueba: undefined,
        })),
      );
  }, [montado, conectores.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const delPlan = vista.filter(incluido);
  const ocultos = vista.length - delPlan.length;
  const proximoPlan: PlanId | null = planLevel(plan) < 3 ? "avanzada" : !conN8n ? "grupo" : null;

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return delPlan.filter(
      (c) =>
        (filtro === "Todas" || c.categoria === filtro) &&
        (!q || c.nombre.toLowerCase().includes(q) || c.descripcion.toLowerCase().includes(q)),
    );
  }, [delPlan, filtro, busqueda]);

  const funcionan = delPlan.filter((c) => estadoReal(c) !== "proximamente");
  const conectadas = delPlan.filter((c) => estadoReal(c) === "conectado");
  const kpis = [
    {
      l: "Conectadas",
      v: conectadas.length,
      s: real ? "funcionando ahora" : "en el demo se simulan",
      i: CheckCircle2,
    },
    { l: "Listas para usar", v: funcionan.length, s: "en tu plan", i: Circle },
    { l: "Próximamente", v: delPlan.length - funcionan.length, s: "en camino", i: Workflow },
    { l: "Del plan", v: delPlan.length, s: `plan ${PLANS[plan].name}`, i: Settings2 },
  ];

  return (
    <div className="relative min-h-full overflow-clip bg-[#faf9ff]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_5%,rgba(124,58,237,0.15),transparent_28%),radial-gradient(circle_at_92%_12%,rgba(236,72,153,0.10),transparent_27%),linear-gradient(135deg,#f8f6ff_0%,#f3effd_48%,#faf8ff_100%)]"
      />
      <div className="relative mx-auto w-full max-w-[1420px] px-4 py-6 md:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-[30px] border border-primary/15 bg-gradient-to-br from-white via-white/96 to-primary/[0.045] shadow-[0_20px_55px_-38px_rgba(76,29,149,0.55)]">
          <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-primary/55 via-primary to-pink-400/60" />
          <div className="relative p-5 md:p-7">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/10 bg-primary/[0.07] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
              <Plug className="size-3.5" /> Plan {PLANS[plan].name}
            </span>
            <h1 className="mt-4 text-[32px] font-bold tracking-[-0.035em] md:text-[40px]">
              Integraciones
            </h1>
            <p className="mt-2 max-w-2xl text-[13px] leading-6 text-muted-foreground md:text-sm">
              Conectá Cloud Esther con las herramientas que ya usás: mensajería, calendario, pagos,
              facturación fiscal, equipos de diagnóstico y automatización.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
              {kpis.map((k, idx) => {
                const tonos = [
                  {
                    icon: "from-primary to-fuchsia-500",
                    val: "text-primary",
                    orb: "from-primary/20 to-fuchsia-400/10",
                  },
                  {
                    icon: "from-sky-400 to-blue-600",
                    val: "text-sky-600",
                    orb: "from-sky-400/20 to-blue-500/10",
                  },
                  {
                    icon: "from-emerald-400 to-teal-600",
                    val: "text-emerald-600",
                    orb: "from-emerald-400/20 to-teal-500/10",
                  },
                  {
                    icon: "from-amber-400 to-orange-500",
                    val: "text-amber-600",
                    orb: "from-amber-400/20 to-orange-500/10",
                  },
                ];
                const t = tonos[idx % 4];
                return (
                  <div
                    key={k.l}
                    className="group relative min-h-[100px] overflow-hidden rounded-[22px] border border-primary/15 bg-gradient-to-br from-white via-white to-primary/[0.04] p-4 shadow-[0_12px_28px_-20px_rgba(124,58,237,0.48)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_44px_-26px_rgba(124,58,237,0.6)]"
                  >
                    <div
                      className={`pointer-events-none absolute -right-7 -top-9 size-[100px] rounded-full bg-gradient-to-br opacity-70 transition-transform duration-300 group-hover:scale-110 ${t.orb}`}
                    />
                    <div className="relative flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.09em] text-muted-foreground">
                          {k.l}
                        </p>
                        <p
                          className={`mt-2 text-[27px] font-bold leading-none tracking-tight ${t.val}`}
                        >
                          {k.v}
                        </p>
                        <p className="mt-2 text-[11px] text-muted-foreground">{k.s}</p>
                      </div>
                      <span
                        className={`grid size-9 place-items-center rounded-xl bg-gradient-to-br text-white shadow-[0_8px_16px_-8px_rgba(0,0,0,0.35)] ${t.icon}`}
                      >
                        <k.i className="size-4" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex flex-col gap-2 rounded-2xl border border-primary/10 bg-primary/[0.025] p-1.5 md:flex-row md:items-center">
              <div className="relative md:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar integración…"
                  className="h-9 w-full rounded-xl border border-primary/12 bg-white pl-9 pr-3 text-sm outline-none focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(["Todas", ...CATEGORIAS] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setFiltro(c)}
                    aria-pressed={filtro === c}
                    className={`rounded-xl px-3 py-2 text-xs font-semibold transition-all ${filtro === c ? "bg-primary text-primary-foreground shadow-[0_8px_18px_-10px_rgba(124,58,237,0.8)]" : "text-muted-foreground hover:bg-card hover:text-foreground"}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {[...filtrados]
            .sort(
              (a, b) =>
                Number(estadoReal(a) === "proximamente") - Number(estadoReal(b) === "proximamente"),
            )
            .map((c) => {
              const Icon = ICONOS[c.icon] ?? Plug;
              const def = DEFINICION[c.id];
              const e = estadoReal(c);
              const badge =
                e === "conectado"
                  ? "bg-emerald-50 text-emerald-700"
                  : e === "sin-conectar"
                    ? "bg-amber-50 text-amber-700"
                    : e === "demo"
                      ? "bg-sky-50 text-sky-700"
                      : "bg-muted text-muted-foreground";
              const punto =
                e === "conectado"
                  ? "bg-emerald-500"
                  : e === "sin-conectar"
                    ? "bg-amber-500"
                    : e === "demo"
                      ? "bg-sky-500"
                      : "bg-muted-foreground/50";
              const texto =
                e === "conectado"
                  ? "Conectado"
                  : e === "sin-conectar"
                    ? "Sin conectar"
                    : e === "demo"
                      ? "En el demo se simula"
                      : "Próximamente";
              return (
                <div
                  key={c.id}
                  className={`card-grad flex flex-col p-4 ${e === "proximamente" ? "opacity-90" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span
                      className={`grid size-10 place-items-center rounded-xl ${e === "proximamente" ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"}`}
                    >
                      <Icon className="size-5" />
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10.5px] font-semibold ${badge}`}
                    >
                      <span className={`size-1.5 rounded-full ${punto}`} />
                      {texto}
                    </span>
                  </div>
                  <p className="mt-3 font-semibold">{c.nombre}</p>
                  <p className="mt-1 flex-1 text-[13px] leading-5 text-muted-foreground">
                    {def?.detalle ?? c.descripcion}
                  </p>
                  {def?.mientras && (
                    <p className="mt-2 rounded-xl bg-primary/[0.04] px-3 py-2 text-[11.5px] leading-5 text-foreground/80">
                      {def.mientras.texto}
                      {def.mientras.to && (
                        <>
                          {" "}
                          <Link
                            to={def.mientras.to as never}
                            className="font-semibold text-primary hover:underline"
                          >
                            {def.mientras.label ?? "Ir"} →
                          </Link>
                        </>
                      )}
                    </p>
                  )}
                  <p className="mt-2 text-[11px] text-muted-foreground">{c.categoria}</p>
                  {def?.ir && e !== "proximamente" && (
                    <Link to={def.ir.to as never} className="btn-ce mt-3 justify-center">
                      <Settings2 className="size-4" />{" "}
                      {e === "conectado" ? "Ver conexión" : def.ir.label}
                    </Link>
                  )}
                </div>
              );
            })}
          {!filtrados.length && (
            <p className="card-grad p-8 text-center text-sm text-muted-foreground md:col-span-2 xl:col-span-3">
              No hay integraciones con ese filtro.
            </p>
          )}
        </div>

        {ocultos > 0 && proximoPlan && (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-primary/15 bg-gradient-to-r from-primary/[0.05] via-white to-white px-4 py-3">
            <Lock className="size-4 text-primary" />
            <p className="min-w-0 flex-1 text-sm">
              <b>{ocultos} integraciones más</b>{" "}
              <span className="text-muted-foreground">
                ({planLevel(plan) < 3 ? "DICOM, Webhooks" : ""}
                {planLevel(plan) < 3 ? " y Automatización" : "Automatización"}) vienen con los
                planes superiores.
              </span>
            </p>
            {!planContratado && (
              <button type="button" className="btn-ce-outline" onClick={() => setPlan(proximoPlan)}>
                Probar el plan {PLANS[proximoPlan].name}
              </button>
            )}
          </div>
        )}
        <p className="mt-4 flex items-center gap-2 text-[11px] text-muted-foreground">
          <ShieldCheck className="size-3.5 shrink-0 text-primary" />
          Las claves de WhatsApp y del motor de automatización se guardan cifradas en el servidor y
          no se vuelven a mostrar. Lo que dice «Próximamente» todavía no se conecta: no te pedimos
          datos que no se usan.
        </p>
      </div>

      {toast && (
        <div className="fixed bottom-24 left-1/2 z-[70] -translate-x-1/2 rounded-full bg-foreground px-4 py-2 text-xs font-medium text-background shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}
