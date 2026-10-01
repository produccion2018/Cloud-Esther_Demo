import { useMemo, useState } from "react";
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
  useIntegraciones,
  type CategoriaConector,
  type Conector,
} from "@/lib/cloud-esther/integraciones";
import { useConN8n } from "@/lib/cloud-esther/n8n-acceso";
import { clinicaActualId } from "@/lib/cloud-esther/auth-store";

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

type Campo = {
  k: string;
  l: string;
  tipo?: "text" | "password" | "select";
  opciones?: string[];
  placeholder?: string;
  opcional?: boolean;
};

/** Plan mínimo y datos que pide cada conector. */
const DEFINICION: Record<
  string,
  { minPlan: PlanId; campos: Campo[]; ayuda: string; ir?: { label: string; to: string } }
> = {
  whatsapp: {
    minPlan: "profesional",
    campos: [
      { k: "numero", l: "Número de WhatsApp Business", placeholder: "+54 9 11 4455-1200" },
      { k: "token", l: "Token de acceso (Meta)", tipo: "password", placeholder: "EAAG…" },
    ],
    ayuda: "Se usa en Comunicación, recordatorios de turnos y el Contact Center de Esther.",
    ir: { label: "Abrir Comunicación", to: "/demo/comunicaciones" },
  },
  "google-calendar": {
    minPlan: "profesional",
    campos: [
      { k: "cuenta", l: "Cuenta de Google", placeholder: "agenda@tuclinica.com" },
      {
        k: "sentido",
        l: "Sincronización",
        tipo: "select",
        opciones: ["Cloud Esther → Google", "En ambos sentidos"],
      },
    ],
    ayuda: "Cada profesional ve sus turnos en su calendario.",
  },
  "pasarela-pagos": {
    minPlan: "profesional",
    campos: [
      {
        k: "proveedor",
        l: "Proveedor",
        tipo: "select",
        opciones: ["Mercado Pago", "Stripe", "Payway"],
      },
      { k: "clave", l: "Clave pública", placeholder: "APP_USR-…" },
      { k: "secreto", l: "Clave secreta", tipo: "password" },
    ],
    ayuda: "Habilita links de pago en Facturación, presupuestos y el portal del paciente.",
    ir: { label: "Abrir Facturación", to: "/demo/facturacion" },
  },
  "facturacion-electronica": {
    minPlan: "profesional",
    campos: [
      { k: "cuit", l: "CUIT / identificación fiscal", placeholder: "30-12345678-9" },
      { k: "puntoVenta", l: "Punto de venta", placeholder: "0003" },
      {
        k: "certificado",
        l: "Certificado digital",
        placeholder: "certificado.crt",
        opcional: true,
      },
    ],
    ayuda: "Los comprobantes de Facturación se autorizan ante el organismo fiscal de tu país.",
    ir: { label: "Datos fiscales", to: "/demo/facturacion" },
  },
  doctoralia: {
    minPlan: "profesional",
    campos: [{ k: "perfil", l: "ID de perfil de Doctoralia", placeholder: "dra-paula-arriaga" }],
    ayuda: "Los turnos reservados online entran directo a la Agenda.",
  },
  dicom: {
    minPlan: "avanzada",
    campos: [
      { k: "aeTitle", l: "AE Title", placeholder: "CLOUDESTHER" },
      { k: "host", l: "Servidor PACS / equipo", placeholder: "192.168.0.20" },
      { k: "puerto", l: "Puerto", placeholder: "104" },
    ],
    ayuda: "Las imágenes llegan a Estudios y al análisis de rayos X del Odontograma 3D.",
  },
  webhooks: {
    minPlan: "avanzada",
    campos: [
      { k: "url", l: "URL de destino", placeholder: "https://tu-sistema.com/webhooks" },
      {
        k: "eventos",
        l: "Eventos",
        tipo: "select",
        opciones: ["Turnos", "Turnos y pacientes", "Turnos, pacientes y facturación"],
      },
    ],
    ayuda: "Cada evento se envía firmado con la clave de tu clínica.",
  },
  n8n: {
    minPlan: "grupo",
    campos: [
      { k: "instancia", l: "URL de la instancia n8n", placeholder: "https://n8n.tuclinica.com" },
    ],
    ayuda: "Los flujos, plantillas y ejecuciones se manejan desde Automatizaciones.",
    ir: { label: "Abrir Automatizaciones", to: "/demo/automatizaciones" },
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
  const [abierto, setAbierto] = useState<Conector | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const aviso = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(null), 2600);
  };
  const incluido = (c: Conector) => {
    const d = DEFINICION[c.id];
    if (c.id === "n8n") return conN8n;
    return !d || planLevel(plan) >= planLevel(d.minPlan);
  };
  const delPlan = conectores.filter(incluido);
  const ocultos = conectores.length - delPlan.length;
  const proximoPlan: PlanId | null = planLevel(plan) < 3 ? "avanzada" : !conN8n ? "grupo" : null;

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return delPlan.filter(
      (c) =>
        (filtro === "Todas" || c.categoria === filtro) &&
        (!q || c.nombre.toLowerCase().includes(q) || c.descripcion.toLowerCase().includes(q)),
    );
  }, [delPlan, filtro, busqueda]);

  const conectadas = delPlan.filter((c) => c.estado === "Conectado");
  const actualizar = (id: string, cambio: Partial<Conector>) =>
    setConectores((prev) => prev.map((x) => (x.id === id ? { ...x, ...cambio } : x)));

  const kpis = [
    { l: "Conectadas", v: conectadas.length, s: `de ${delPlan.length} del plan`, i: CheckCircle2 },
    {
      l: "Disponibles",
      v: delPlan.length - conectadas.length,
      s: "listas para conectar",
      i: Circle,
    },
    {
      l: "Automatización",
      v: delPlan.filter((c) => c.categoria === "Automatización" && c.estado === "Conectado").length,
      s: "conectores activos",
      i: Workflow,
    },
    {
      l: "Configuradas",
      v: delPlan.filter((c) => c.config && Object.keys(c.config).length).length,
      s: "con datos cargados",
      i: Settings2,
    },
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
              {kpis.map((k) => (
                <div
                  key={k.l}
                  className="relative min-h-[100px] overflow-hidden rounded-[22px] border border-primary/25 bg-gradient-to-br from-white via-white to-primary/[0.065] p-4 shadow-[0_12px_28px_-20px_rgba(124,58,237,0.48)]"
                >
                  <div className="relative flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.09em] text-primary/75">
                        {k.l}
                      </p>
                      <p className="mt-2 text-[27px] font-bold leading-none tracking-tight text-primary">
                        {k.v}
                      </p>
                      <p className="mt-2 text-[11px] text-muted-foreground">{k.s}</p>
                    </div>
                    <span className="grid size-9 place-items-center rounded-full bg-primary/[0.08] text-primary">
                      <k.i className="size-4" />
                    </span>
                  </div>
                </div>
              ))}
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
                    className={`rounded-xl px-3 py-2 text-xs font-semibold transition-all ${filtro === c ? "bg-primary text-primary-foreground shadow-[0_8px_18px_-10px_rgba(124,58,237,0.8)]" : "text-muted-foreground hover:bg-white hover:text-foreground"}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtrados.map((c) => {
            const Icon = ICONOS[c.icon] ?? Plug;
            const on = c.estado === "Conectado";
            return (
              <div key={c.id} className="card-grad flex flex-col p-4">
                <div className="flex items-start justify-between gap-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10.5px] font-semibold ${on ? "bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground"}`}
                  >
                    <span
                      className={`size-1.5 rounded-full ${on ? "bg-emerald-500" : "bg-muted-foreground/50"}`}
                    />
                    {on ? "Conectado" : "Sin conectar"}
                  </span>
                </div>
                <p className="mt-3 font-semibold">{c.nombre}</p>
                <p className="mt-1 flex-1 text-[13px] leading-5 text-muted-foreground">
                  {c.descripcion}
                </p>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {c.categoria}
                  {c.ultimaPrueba
                    ? ` · probada ${new Date(c.ultimaPrueba).toLocaleDateString("es-AR")}`
                    : ""}
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    className="btn-ce flex-1 justify-center"
                    onClick={() => setAbierto(c)}
                  >
                    <Settings2 className="size-4" /> {on ? "Configuración" : "Conectar"}
                  </button>
                  {on && (
                    <button
                      type="button"
                      className="btn-ce-outline"
                      onClick={() => {
                        actualizar(c.id, { estado: "Desconectado" });
                        aviso(`${c.nombre} desconectado`);
                      }}
                    >
                      Desconectar
                    </button>
                  )}
                </div>
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
                {planLevel(plan) < 3 ? " y n8n" : "n8n"}) vienen con los planes superiores.
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
          <ShieldCheck className="size-3.5 text-primary" />
          Las credenciales quedan solo en esta clínica (tenant {clinicaActualId() ?? "demo"}). En
          producción se guardan cifradas.
        </p>
      </div>

      {abierto && (
        <ConfigConector
          c={conectores.find((x) => x.id === abierto.id) ?? abierto}
          onClose={() => setAbierto(null)}
          onGuardar={(cambio, msg) => {
            actualizar(abierto.id, cambio);
            aviso(msg);
          }}
        />
      )}
      {toast && (
        <div className="fixed bottom-24 left-1/2 z-[70] -translate-x-1/2 rounded-full bg-foreground px-4 py-2 text-xs font-medium text-background shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}

function ConfigConector({
  c,
  onClose,
  onGuardar,
}: {
  c: Conector;
  onClose: () => void;
  onGuardar: (cambio: Partial<Conector>, msg: string) => void;
}) {
  const def = DEFINICION[c.id];
  const campos = def?.campos ?? [];
  const [valores, setValores] = useState<Record<string, string>>(() => {
    const base: Record<string, string> = {};
    campos.forEach(
      (f) => (base[f.k] = c.config?.[f.k] ?? (f.tipo === "select" ? (f.opciones?.[0] ?? "") : "")),
    );
    return base;
  });
  const [probando, setProbando] = useState(false);
  const [error, setError] = useState("");
  const faltan = campos.filter((f) => !f.opcional && !valores[f.k]?.trim());

  const probarYConectar = () => {
    if (faltan.length) {
      setError(`Completá: ${faltan.map((f) => f.l).join(", ")}.`);
      return;
    }
    if (c.id === "webhooks" || c.id === "n8n") {
      const url = valores["url"] ?? valores["instancia"] ?? "";
      if (!/^https:\/\/.+\..+/.test(url)) {
        setError("La URL tiene que empezar con https://");
        return;
      }
    }
    setError("");
    setProbando(true);
    window.setTimeout(() => {
      setProbando(false);
      onGuardar(
        { estado: "Conectado", config: valores, ultimaPrueba: new Date().toISOString() },
        `${c.nombre}: conexión verificada`,
      );
      onClose();
    }, 900);
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Configurar ${c.nombre}`}
        className="w-full max-w-lg rounded-3xl border border-border bg-card p-5 shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              Integraciones
            </p>
            <h2 className="mt-1 text-lg font-semibold">{c.nombre}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{def?.ayuda ?? c.descripcion}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="grid size-8 place-items-center rounded-xl text-muted-foreground hover:bg-muted"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="mt-4 space-y-3">
          {campos.map((f) => (
            <label key={f.k} className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {f.l}
                {f.opcional ? " (opcional)" : ""}
              </span>
              {f.tipo === "select" ? (
                <select
                  value={valores[f.k] ?? ""}
                  onChange={(e) => setValores((v) => ({ ...v, [f.k]: e.target.value }))}
                  className="h-10 w-full rounded-xl border border-primary/15 bg-white px-3 text-sm outline-none focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
                >
                  {f.opciones?.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={f.tipo === "password" ? "password" : "text"}
                  value={valores[f.k] ?? ""}
                  placeholder={f.placeholder}
                  autoComplete="off"
                  onChange={(e) => setValores((v) => ({ ...v, [f.k]: e.target.value }))}
                  className="h-10 w-full rounded-xl border border-primary/15 bg-white px-3 text-sm outline-none focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
                />
              )}
            </label>
          ))}
        </div>
        {error && (
          <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
            {error}
          </p>
        )}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
          {def?.ir ? (
            <Link
              to={def.ir.to as never}
              className="text-xs font-semibold text-primary hover:underline"
            >
              {def.ir.label} →
            </Link>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button type="button" className="btn-ce-outline" onClick={onClose}>
              Cancelar
            </button>
            <button type="button" className="btn-ce" onClick={probarYConectar} disabled={probando}>
              {probando ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CheckCircle2 className="size-4" />
              )}
              {probando
                ? "Probando…"
                : c.estado === "Conectado"
                  ? "Guardar y probar"
                  : "Probar y conectar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
