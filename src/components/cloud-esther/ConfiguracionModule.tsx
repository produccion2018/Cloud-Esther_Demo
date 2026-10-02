import { Link } from "@tanstack/react-router";
import { useTenantActual } from "@/lib/cloud-esther/tenant-store";
import { useEffect, useState } from "react";
import {
  Settings,
  Palette,
  ShieldCheck,
  Bell,
  Sparkles,
  Moon,
  Type,
  Users,
  FolderOpen,
  Activity,
  FileClock,
  PlugZap,
  Building2,
  Search,
  ChevronRight,
  ExternalLink,
  LockKeyhole,
  CheckCircle2,
  Clock3,
  Shield,
  Database,
  Image,
  Receipt,
  ClipboardList,
  UserRound,
  CalendarDays,
  Mail,
  Smartphone,
  Bot,
  Workflow,
  CalendarCheck,
  BriefcaseBusiness,
  Sun,
} from "lucide-react";

import { PLANS, planLevel, useCloudEsther, type PlanId } from "@/lib/cloud-esther/data";

import {
  cargarSettings,
  DEFAULT_SETTINGS,
  guardarSettings,
  SIDEBAR_COLORS,
  FONT_SIZES,
  type ClinicSettings,
  type SidebarColor,
  type FontSize,
} from "@/lib/cloud-esther/settings-store";

import { ToggleSwitch } from "./ToggleSwitch";
import { buildSidebarPalette } from "@/lib/cloud-esther/sidebar-paleta";
import { SeguridadAuditoria } from "./configuracion/SeguridadAuditoria";
import { useSesion } from "@/lib/cloud-esther/auth-store";
import { registrarEventoAuditoria } from "@/lib/cloud-esther/auditoria-store";

const CARD =
  "rounded-2xl border border-border/70 bg-card/95 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_4px_14px_rgba(16,24,40,0.04)] backdrop-blur-sm";

const INNER_CARD = "rounded-xl border border-border/60 bg-background/70";

type TabId =
  | "general"
  | "profesionales"
  | "directorio"
  | "apariencia"
  | "notificaciones"
  | "integraciones"
  | "seguridad";

const TABS: {
  id: TabId;
  label: string;
  icon: typeof Settings;
  /** Nivel de plan mínimo: Start y Pro tienen la configuración básica; Plus y Enterprise, la avanzada. */
  min?: number;
}[] = [
  { id: "general", label: "General", icon: Settings },
  { id: "profesionales", label: "Profesionales", icon: Users },
  { id: "directorio", label: "Directorio", icon: FolderOpen, min: 3 },
  { id: "apariencia", label: "Apariencia", icon: Palette },
  { id: "notificaciones", label: "Notificaciones", icon: Bell },
  { id: "integraciones", label: "Integraciones", icon: PlugZap, min: 3 },
  { id: "seguridad", label: "Seguridad y auditoría", icon: ShieldCheck, min: 3 },
];

/** Nombres legibles de los ajustes (para el registro de auditoría). */
const ETIQUETA_AJUSTE: Partial<Record<keyof ClinicSettings, string>> = {
  darkModePage: "Modo oscuro",
  darkModeSidebar: "Menú lateral oscuro",
  sidebarColor: "Color del menú lateral",
  fontSize: "Tamaño de letra",
  aiEnabled: "Esther IA",
  notificationsEnabled: "Notificaciones",
  advancedSecurityEnabled: "Seguridad avanzada",
  auditLogEnabled: "Registrar accesos a módulos",
  auditRetentionDays: "Conservación de registros de auditoría",
};

type Props = {
  onToast: (msg: string) => void;
};

type ExtraSidebarColor = {
  id: string;
  label: string;
  hex: string;
};

const EXTRA_SIDEBAR_COLORS: ExtraSidebarColor[] = [
  {
    id: "blanco",
    label: "Blanco",
    hex: "#ffffff",
  },
  {
    id: "negro",
    label: "Negro",
    hex: "#000000",
  },
];

/**
 * Lista única de colores del sidebar: los de settings-store más los extra,
 * sin duplicados (blanco y negro ya están en settings-store).
 */
const ALL_SIDEBAR_COLORS: ExtraSidebarColor[] = [
  ...SIDEBAR_COLORS.map((color) => ({
    id: color.id as string,
    label: color.label,
    hex: color.hex,
  })),
  ...EXTRA_SIDEBAR_COLORS.filter((extra) => !SIDEBAR_COLORS.some((color) => color.id === extra.id)),
];

const DIRECTORIO_ITEMS = [
  {
    title: "Documentos clínicos",
    description: "Historias, consentimientos y formularios.",
    count: "12 archivos",
    icon: FolderOpen,
  },
  {
    title: "Imágenes",
    description: "Fotos, radiografías y estudios visuales.",
    count: "45 archivos",
    icon: Image,
  },
  {
    title: "Recetas y estudios",
    description: "Recetas, órdenes y estudios complementarios.",
    count: "28 archivos",
    icon: ClipboardList,
  },
  {
    title: "Facturación",
    description: "Comprobantes, facturas y presupuestos.",
    count: "16 archivos",
    icon: Receipt,
  },
  {
    title: "RRHH",
    description: "Legajos, contratos y capacitaciones.",
    count: "8 archivos",
    icon: UserRound,
  },
];

const INTEGRACIONES = [
  {
    name: "n8n",
    description: "Automatizaciones y flujos",
    icon: Workflow,
    status: "Disponible",
    statusClass: "bg-emerald-500/10 text-emerald-600",
  },
  {
    name: "OpenAI / IA Esther",
    description: "Asistente inteligente",
    icon: Bot,
    status: "Disponible",
    statusClass: "bg-emerald-500/10 text-emerald-600",
  },
  {
    name: "Microsoft 365",
    description: "Correo y calendario",
    icon: BriefcaseBusiness,
    status: "Conectado",
    statusClass: "bg-emerald-500/10 text-emerald-600",
  },
  {
    name: "Google Calendar",
    description: "Agenda y eventos",
    icon: CalendarCheck,
    status: "Conectado",
    statusClass: "bg-emerald-500/10 text-emerald-600",
  },
  {
    name: "Turno",
    description: "Base de datos opcional",
    icon: Database,
    status: "Disponible",
    statusClass: "bg-emerald-500/10 text-emerald-600",
  },
  {
    name: "Otras integraciones",
    description: "APIs y webhooks",
    icon: PlugZap,
    status: "En desarrollo",
    statusClass: "bg-muted text-muted-foreground",
  },
];

export function ConfiguracionModule({ onToast }: Props) {
  const { clinic, plan } = useCloudEsther();

  const [tab, setTab] = useState<TabId>("general");
  // Si se cambia a un plan que no incluye la pestaña abierta, se vuelve a General.
  useEffect(() => {
    const t = TABS.find((x) => x.id === tab);
    if (t?.min && planLevel(plan) < t.min) setTab("general");
  }, [plan, tab]);

  const [settings, setSettings] = useState<ClinicSettings>(DEFAULT_SETTINGS);
  const { clinicId, sesion } = useSesion();
  // Ajustes de la empresa de la sesión (se recargan si cambia la sesión).
  const tenant = useTenantActual();

  useEffect(() => {
    setSettings(cargarSettings(clinic));
  }, [clinic, tenant]);

  const actualizar = <K extends keyof ClinicSettings>(key: K, value: ClinicSettings[K]) => {
    const next = {
      ...settings,
      [key]: value,
    };

    setSettings(next);
    guardarSettings(clinic, next);
    // Auditoría: los cambios de configuración se registran siempre.
    if (clinicId && sesion)
      registrarEventoAuditoria(clinicId, {
        usuario: sesion.usuario.nombre,
        email: sesion.usuario.email,
        rol: "Propietario",
        tipo: "Configuración",
        accion: `Cambió «${ETIQUETA_AJUSTE[key] ?? String(key)}»`,
        modulo: "Configuración",
      });
  };

  const avanzada = planLevel(plan) >= 3;
  const visibles = TABS.filter((t) => !t.min || planLevel(plan) >= t.min);

  return (
    <div>
      <div className="relative">
        <section className="relative overflow-hidden rounded-[30px] border border-primary/15 bg-gradient-to-br from-white via-white/96 to-primary/[0.045] shadow-[0_20px_55px_-38px_rgba(76,29,149,0.55)]">
          <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-primary/55 via-primary to-pink-400/60" />
          <div className="pointer-events-none absolute -right-24 -top-28 size-72 rounded-full bg-primary/[0.055] blur-2xl" />
          <div className="relative p-5 md:p-7">
            <ConfiguracionHeader avanzada={avanzada} planNombre={PLANS[plan].name} />
            <nav
              className="mt-5 flex flex-wrap gap-1.5 rounded-2xl border border-primary/10 bg-primary/[0.025] p-1.5"
              aria-label="Secciones de configuración"
            >
              {visibles.map((item) => {
                const Icon = item.icon;
                const activo = tab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTab(item.id)}
                    aria-pressed={activo}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                      activo
                        ? "bg-primary text-primary-foreground shadow-[0_8px_18px_-10px_rgba(124,58,237,0.8)]"
                        : "text-muted-foreground hover:bg-white hover:text-foreground"
                    }`}
                  >
                    <Icon className="size-3.5" />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </section>

        <div className="mt-5">
          {tab === "general" && (
            <GeneralTab settings={settings} actualizar={actualizar} onToast={onToast} />
          )}

          {tab === "profesionales" && <ProfesionalesTab onToast={onToast} />}

          {tab === "directorio" && <DirectorioTab onToast={onToast} />}

          {tab === "apariencia" && <AparienciaTab settings={settings} actualizar={actualizar} />}

          {tab === "notificaciones" && (
            <NotificacionesTab settings={settings} actualizar={actualizar} onToast={onToast} />
          )}

          {tab === "integraciones" && <IntegracionesTab />}

          {tab === "seguridad" && (
            <SeguridadAuditoria
              plan={plan}
              settings={settings}
              actualizar={actualizar}
              onToast={onToast}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                               HEADER                                       */
/* -------------------------------------------------------------------------- */

function ConfiguracionHeader({ avanzada, planNombre }: { avanzada: boolean; planNombre: string }) {
  const { setPlan, planContratado } = useCloudEsther();
  return (
    <div className="flex flex-wrap items-start justify-between gap-5">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/10 bg-primary/[0.07] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
            <Settings className="size-3.5" />
            Sistema
          </span>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold ${avanzada ? "border-primary/20 bg-primary/10 text-primary" : "border-sky-200 bg-sky-50 text-sky-700"}`}
          >
            {avanzada ? "Configuración avanzada" : "Configuración básica"} · Plan {planNombre}
          </span>
        </div>
        <h1 className="mt-4 text-[32px] font-bold tracking-[-0.035em] md:text-[40px]">
          Configuración
        </h1>
        <p className="mt-2 max-w-2xl text-[13px] leading-6 text-muted-foreground md:text-sm">
          {avanzada
            ? "Datos de la clínica, profesionales, apariencia, notificaciones, integraciones y seguridad y auditoría."
            : "Datos de la clínica, profesionales, apariencia y notificaciones. La configuración avanzada (seguridad y auditoría, directorio e integraciones) viene con Plus y Enterprise."}
        </p>
      </div>
      {!avanzada && !planContratado && (
        <button type="button" className="btn-ce-outline" onClick={() => setPlan("avanzada")}>
          Probar la configuración avanzada (Plus)
        </button>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                GENERAL                                     */
/* -------------------------------------------------------------------------- */

function GeneralTab({
  settings,
  actualizar,
  onToast,
}: {
  settings: ClinicSettings;
  actualizar: <K extends keyof ClinicSettings>(key: K, value: ClinicSettings[K]) => void;
  onToast: (msg: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_1fr_300px]">
      <div className={`${CARD} p-5`}>
        <SectionHeader
          icon={Building2}
          title="Información de la clínica"
          description="Datos principales de tu clínica u organización."
        />

        <div className="mt-5 space-y-3">
          <InputVisual label="Nombre de la clínica" value="Centro Odontológico Esthetic" />

          <InputVisual label="RUC / CUIT" value="30-12345678-9" />

          <InputVisual label="Dirección" value="Av. Siempre Viva 123, CABA" />

          <InputVisual label="Teléfono" value="+54 11 1234-5678" />

          <InputVisual label="Email de contacto" value="info@cloudesther.com" />
        </div>

        <button type="button" onClick={() => onToast("Cambios guardados")} className="btn-ce mt-4">
          <CheckCircle2 className="size-4" />
          Guardar cambios
        </button>
      </div>

      <div className={`${CARD} p-5`}>
        <SectionHeader
          icon={Sparkles}
          title="Preferencias generales"
          description="Configurá el comportamiento de la plataforma."
        />

        <div className="mt-4 divide-y divide-border/60">
          <FilaSwitch
            icon={Moon}
            titulo="Modo oscuro"
            descripcion="Activa el modo oscuro para toda la aplicación."
            checked={settings.darkModePage}
            onChange={(value) => actualizar("darkModePage", value)}
          />

          <FilaSwitch
            icon={Sparkles}
            titulo="Esther AI"
            descripcion="Asistente inteligente disponible en la plataforma."
            checked={settings.aiEnabled}
            onChange={(value) => {
              actualizar("aiEnabled", value);
              onToast(value ? "Esther AI activada" : "Esther AI desactivada");
            }}
          />

          <FilaSwitch
            icon={Bell}
            titulo="Notificaciones"
            descripcion="Avisos de turnos, vencimientos y novedades."
            checked={settings.notificationsEnabled}
            onChange={(value) => actualizar("notificationsEnabled", value)}
          />
        </div>
      </div>

      <PreviewSidebar settings={settings} actualizar={actualizar} />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                              PROFESIONALES                                 */
/* -------------------------------------------------------------------------- */

function ProfesionalesTab({ onToast }: { onToast: (msg: string) => void }) {
  const profesionales = [
    {
      initials: "LM",
      name: "Profesional",
      specialty: "Odontología general",
      status: "Activo",
      statusClass: "bg-emerald-500/10 text-emerald-600",
    },
    {
      initials: "MG",
      name: "Profesional",
      specialty: "Especialidad odontológica",
      status: "Activo",
      statusClass: "bg-emerald-500/10 text-emerald-600",
    },
    {
      initials: "CR",
      name: "Profesional",
      specialty: "Especialidad odontológica",
      status: "Pendiente",
      statusClass: "bg-amber-500/10 text-amber-600",
    },
  ];

  return (
    <div className="space-y-4">
      <div className={`${CARD} p-5`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <SectionHeader
            icon={Users}
            title="Profesionales"
            description="Gestioná los profesionales que forman parte de tu clínica."
          />

          <a
            href="/demo/equipo-profesional"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-sm transition hover:opacity-90"
          >
            Abrir equipo profesional
            <ExternalLink className="size-3.5" />
          </a>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard icon={Users} label="Profesionales" value="3" />

          <StatCard icon={CheckCircle2} label="Activos" value="2" />

          <StatCard icon={Clock3} label="Pendientes" value="1" />
        </div>

        <div className="relative mt-5">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

          <input
            placeholder="Buscar profesionales..."
            className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-xs outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {profesionales.map((profesional, index) => (
          <div key={`${profesional.initials}-${index}`} className={`${CARD} p-5`}>
            <div className="flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-xl bg-primary/10 text-sm font-bold text-primary">
                {profesional.initials}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-display text-sm font-bold text-foreground">
                    {profesional.name}
                  </p>

                  <span
                    className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${profesional.statusClass}`}
                  >
                    {profesional.status}
                  </span>
                </div>

                <p className="mt-1 text-xs text-muted-foreground">{profesional.specialty}</p>
              </div>
            </div>

            <div className="mt-4 border-t border-border/60 pt-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Agenda</span>

                <span className="font-semibold text-foreground">Disponible</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <InfoBanner
        icon={Users}
        title="Estructura preparada"
        description="Esta sección utiliza la estructura actual de profesionales como base visual. Más adelante podés reemplazar estos datos directamente por los del backend."
        onClick={() => onToast("Sección de profesionales")}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                DIRECTORIO                                  */
/* -------------------------------------------------------------------------- */

function DirectorioTab({ onToast }: { onToast: (msg: string) => void }) {
  return (
    <div className="space-y-4">
      <div className={`${CARD} p-5`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <SectionHeader
            icon={FolderOpen}
            title="Directorio"
            description="Gestioná los archivos y documentos de tu clínica."
          />

          <button
            type="button"
            onClick={() => onToast("Directorio")}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-xs font-bold text-foreground transition hover:bg-muted/60"
          >
            <FolderOpen className="size-3.5" />
            Abrir directorio
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-primary/10 bg-primary/[0.045] p-3">
          <div className="flex items-start gap-2.5">
            <FolderOpen className="mt-0.5 size-4 shrink-0 text-primary" />

            <p className="text-xs leading-relaxed text-muted-foreground">
              El directorio centraliza los documentos y recursos asociados a tu clínica.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {DIRECTORIO_ITEMS.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.title}
              type="button"
              onClick={() => onToast(item.title)}
              className={`${CARD} group p-5 text-left transition hover:-translate-y-0.5 hover:border-primary/30`}
            >
              <div className="flex items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-4" />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="font-display text-sm font-bold text-foreground">{item.title}</p>

                  <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
                </div>

                <ChevronRight className="size-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
              </div>

              <div className="mt-4 border-t border-border/60 pt-3 text-[11px] font-medium text-muted-foreground">
                {item.count}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                APARIENCIA                                  */
/* -------------------------------------------------------------------------- */

function AparienciaTab({
  settings,
  actualizar,
}: {
  settings: ClinicSettings;
  actualizar: <K extends keyof ClinicSettings>(key: K, value: ClinicSettings[K]) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_340px]">
      <div className={`${CARD} p-5`}>
        <SectionHeader
          icon={Palette}
          title="Apariencia"
          description="Personalizá cómo se ve Cloud Esther para tu clínica."
        />

        <div className="mt-5">
          <p className="text-xs font-bold text-foreground">Color del sidebar</p>

          <p className="mt-1 text-[11px] text-muted-foreground">
            Elegí el color principal del menú lateral.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {ALL_SIDEBAR_COLORS.map((color) => {
              const activo = settings.sidebarColor === color.id;

              return (
                <ColorOption
                  key={color.id}
                  label={color.label}
                  hex={color.hex}
                  activo={activo}
                  onClick={() => actualizar("sidebarColor", color.id as SidebarColor)}
                />
              );
            })}
          </div>
        </div>

        <div className="mt-6 border-t border-border/60 pt-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-foreground">Modo oscuro</p>

              <p className="mt-1 text-xs text-muted-foreground">
                Activá el tema oscuro de la plataforma.
              </p>
            </div>

            <ToggleSwitch
              checked={settings.darkModePage}
              onChange={(value) => actualizar("darkModePage", value)}
              label="Modo oscuro"
            />
          </div>
        </div>

        <div className="mt-4 border-t border-border/60 pt-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-foreground">Sidebar oscuro</p>

              <p className="mt-1 text-xs text-muted-foreground">
                Oscurece el color elegido del menú lateral. El negro siempre se ve oscuro.
              </p>
            </div>

            <ToggleSwitch
              checked={settings.darkModeSidebar}
              onChange={(value) => actualizar("darkModeSidebar", value)}
              label="Sidebar oscuro"
            />
          </div>
        </div>

        <div className="mt-5 border-t border-border/60 pt-5">
          <p className="text-xs font-bold text-foreground">Tamaño de letra</p>

          <p className="mt-1 text-[11px] text-muted-foreground">
            Ajustá el tamaño del texto en toda la plataforma.
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {FONT_SIZES.map((font) => {
              const activo = settings.fontSize === font.id;

              return (
                <button
                  key={font.id}
                  type="button"
                  onClick={() => actualizar("fontSize", font.id as FontSize)}
                  className={`rounded-xl border px-4 py-2 text-xs font-semibold transition ${
                    activo
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-border bg-background text-foreground hover:bg-muted/60"
                  }`}
                >
                  <Type className="mr-1.5 inline-block size-3.5" />
                  {font.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <PreviewSidebar settings={settings} actualizar={actualizar} />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                              NOTIFICACIONES                                */
/* -------------------------------------------------------------------------- */

function NotificacionesTab({
  settings,
  actualizar,
  onToast,
}: {
  settings: ClinicSettings;
  actualizar: <K extends keyof ClinicSettings>(key: K, value: ClinicSettings[K]) => void;
  onToast: (msg: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className={`${CARD} p-5`}>
        <SectionHeader
          icon={Bell}
          title="Notificaciones"
          description="Controlá qué avisos querés recibir dentro de la plataforma."
        />

        <div className="mt-4 divide-y divide-border/60">
          <FilaSwitch
            icon={Bell}
            titulo="Notificaciones generales"
            descripcion="Avisos de turnos, vencimientos y novedades."
            checked={settings.notificationsEnabled}
            onChange={(value) => actualizar("notificationsEnabled", value)}
          />

          <FilaVisual
            icon={CalendarDays}
            title="Recordatorios de turnos"
            description="Recordatorios relacionados con la agenda."
            onToast={onToast}
          />

          <FilaVisual
            icon={Mail}
            title="Avisos por correo"
            description="Preparado para conectar las preferencias de email."
            onToast={onToast}
          />

          <FilaVisual
            icon={Smartphone}
            title="Avisos móviles"
            description="Preparado para notificaciones en dispositivos."
            onToast={onToast}
          />
        </div>
      </div>

      <div className={`${CARD} p-5`}>
        <SectionHeader
          icon={Sun}
          title="Preferencias de avisos"
          description="Configuración visual de tus notificaciones."
        />

        <div className="mt-5 space-y-3">
          <PreferenceBox
            icon={CalendarCheck}
            title="Agenda"
            description="Turnos nuevos, cambios y cancelaciones."
          />

          <PreferenceBox
            icon={Shield}
            title="Seguridad"
            description="Alertas de acceso y cambios importantes."
          />

          <PreferenceBox
            icon={Activity}
            title="Actividad"
            description="Resumen de novedades de la clínica."
          />
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                              INTEGRACIONES                                 */
/* -------------------------------------------------------------------------- */

function IntegracionesTab() {
  return (
    <div className="space-y-4">
      <div className={`${CARD} p-5`}>
        <SectionHeader
          icon={PlugZap}
          title="Integraciones"
          description="Conectá Cloud Esther con tus herramientas favoritas."
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {INTEGRACIONES.map((integration) => {
          const Icon = integration.icon;

          return (
            <div key={integration.name} className={`${CARD} p-5`}>
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-display text-sm font-bold text-foreground">
                      {integration.name}
                    </p>

                    {integration.name === "n8n" && (
                      <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[8px] font-bold text-primary">
                        Pro
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-xs text-muted-foreground">{integration.description}</p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${integration.statusClass}`}
                >
                  {integration.status}
                </span>

                <Link
                  to={"/demo/integraciones" as never}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Configurar
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                COMPONENTES                                 */
/* -------------------------------------------------------------------------- */

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Settings;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
        <Icon className="size-4.5" />
      </span>

      <div className="min-w-0">
        <h2 className="font-display text-base font-bold tracking-tight text-foreground">{title}</h2>

        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function FilaSwitch({
  icon: Icon,
  titulo,
  descripcion,
  checked,
  onChange,
}: {
  icon: typeof Settings;
  titulo: string;
  descripcion: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-4" />
        </span>

        <div className="min-w-0">
          <p className="font-display text-sm font-semibold text-foreground">{titulo}</p>

          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{descripcion}</p>
        </div>
      </div>

      <ToggleSwitch checked={checked} onChange={onChange} label={titulo} />
    </div>
  );
}

function FilaVisual({
  icon: Icon,
  title,
  description,
  onToast,
}: {
  icon: typeof Settings;
  title: string;
  description: string;
  onToast: (msg: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onToast(title)}
      className="flex w-full items-center justify-between gap-4 py-4 text-left"
    >
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-4" />
        </span>

        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>

          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
        </div>
      </div>

      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </button>
  );
}

function InputVisual({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </label>

      <div className="flex h-9 items-center rounded-lg border border-border/70 bg-background px-3 text-xs text-foreground">
        {value}
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Settings;
  label: string;
  value: string;
}) {
  return (
    <div className={`${INNER_CARD} p-4`}>
      <div className="flex items-center gap-2">
        <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4" />
        </span>

        <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      </div>

      <p className="mt-3 font-display text-2xl font-bold tracking-tight text-foreground">{value}</p>
    </div>
  );
}

function ActividadRow({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Settings;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-3 py-4">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
        <Icon className="size-4" />
      </span>

      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>

        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function PreferenceBox({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Settings;
  title: string;
  description: string;
}) {
  return (
    <div className={`${INNER_CARD} flex items-center gap-3 p-3.5`}>
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
        <Icon className="size-4" />
      </span>

      <div>
        <p className="text-xs font-bold text-foreground">{title}</p>

        <p className="mt-0.5 text-[11px] text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function InfoBanner({
  icon: Icon,
  title,
  description,
  onClick,
}: {
  icon: typeof Settings;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-primary/10 bg-primary/[0.045] p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-4" />
        </span>

        <div>
          <p className="text-xs font-bold text-foreground">{title}</p>

          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{description}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={onClick}
        className="shrink-0 rounded-lg border border-primary/20 bg-background px-3 py-2 text-[11px] font-bold text-primary"
      >
        Entendido
      </button>
    </div>
  );
}

function ColorOption({
  label,
  hex,
  activo,
  onClick,
}: {
  label: string;
  hex: string;
  activo: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border p-2.5 text-left transition-all ${
        activo
          ? "border-primary bg-primary/[0.06] shadow-sm"
          : "border-border/60 bg-background hover:border-primary/30"
      }`}
    >
      <span
        className={`relative block h-12 rounded-lg border ${
          label === "Blanco" ? "border-border" : "border-transparent"
        }`}
        style={{ backgroundColor: hex }}
      >
        {activo && (
          <span className="absolute right-2 top-2 grid size-5 place-items-center rounded-full bg-white shadow">
            <CheckCircle2 className="size-3.5 text-primary" />
          </span>
        )}
      </span>

      <span className="mt-2 block text-[10px] font-bold text-foreground">{label}</span>
    </button>
  );
}

function PreviewSidebar({
  settings,
  actualizar,
}: {
  settings: ClinicSettings;
  actualizar: <K extends keyof ClinicSettings>(key: K, value: ClinicSettings[K]) => void;
}) {
  const selectedColor =
    ALL_SIDEBAR_COLORS.find((color) => color.id === settings.sidebarColor)?.hex ?? "#7c3aed";

  // Misma paleta que el sidebar real (claro / oscuro y casos blanco y negro).
  const paleta = buildSidebarPalette(selectedColor, settings.darkModeSidebar);
  return (
    <div className={`${CARD} p-4`}>
      <div className="flex items-center gap-2">
        <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
          <Palette className="size-4" />
        </span>

        <div>
          <p className="text-sm font-bold text-foreground">Vista previa</p>

          <p className="text-[10px] text-muted-foreground">Así se verá tu sidebar.</p>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-border/60 shadow-sm">
        <div
          className="p-3"
          style={{ ...paleta, background: "var(--sidebar)", color: "var(--sidebar-foreground)" }}
        >
          <div className="flex items-center gap-2">
            <span
              className="grid size-7 place-items-center rounded-lg text-white"
              style={{ background: "linear-gradient(135deg,#b463f0,#4c1d95)" }}
            >
              <Settings className="size-3.5" />
            </span>
            <div>
              <p className="text-[10px] font-bold">Cloud Esther</p>
              <p className="text-[7px] opacity-60">Dental Suite</p>
            </div>
          </div>
          <div className="mt-4 space-y-1">
            {[
              "Dashboard",
              "Agenda y turnos",
              "Pacientes",
              "Historia clínica",
              "Odontograma",
              "Facturación",
              "Configuración",
            ].map((item) => (
              <div
                key={item}
                className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-[8px]"
                style={
                  item === "Configuración"
                    ? { background: "var(--sidebar-accent)", fontWeight: 700 }
                    : { opacity: 0.85 }
                }
              >
                {item}
                {item === "Agenda y turnos" && (
                  <span
                    className="rounded-full px-1.5 text-[7px] font-bold"
                    style={{
                      background: "var(--sidebar-primary)",
                      color: "var(--sidebar-primary-foreground)",
                    }}
                  >
                    3
                  </span>
                )}
              </div>
            ))}
          </div>
          <div
            className="mt-3 rounded-lg border px-2.5 py-2 text-[8px]"
            style={{ background: "var(--sidebar-accent)", borderColor: "var(--sidebar-border)" }}
          >
            Plan del demo
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-muted-foreground">Modo oscuro</span>

          <ToggleSwitch
            checked={settings.darkModeSidebar}
            onChange={(value) => actualizar("darkModeSidebar", value)}
            label="Modo oscuro del sidebar"
          />
        </div>

        <div className="flex items-center gap-2 rounded-lg bg-muted/40 px-2.5 py-2 text-[10px] text-muted-foreground">
          <span
            className="size-3 rounded-full border border-border"
            style={{
              backgroundColor: selectedColor,
            }}
          />
          Sidebar seleccionado
        </div>
      </div>
    </div>
  );
}
