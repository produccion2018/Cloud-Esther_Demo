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

import { useCloudEsther } from "@/lib/cloud-esther/data";

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
import {
  InicioSesionCorporativo,
  RegistroAuditoria,
} from "./InicioSesionCorporativo";

const CARD =
  "rounded-2xl border border-border/70 bg-card/95 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_4px_14px_rgba(16,24,40,0.04)] backdrop-blur-sm";

const INNER_CARD =
  "rounded-xl border border-border/60 bg-background/70";

type TabId =
  | "general"
  | "profesionales"
  | "directorio"
  | "actividad"
  | "apariencia"
  | "notificaciones"
  | "integraciones"
  | "seguridad"
  | "auditoria";

const TABS: {
  id: TabId;
  label: string;
  icon: typeof Settings;
}[] = [
  { id: "general", label: "General", icon: Settings },
  { id: "profesionales", label: "Profesionales", icon: Users },
  { id: "directorio", label: "Directorio", icon: FolderOpen },
  { id: "actividad", label: "Actividad", icon: Activity },
  { id: "apariencia", label: "Apariencia", icon: Palette },
  { id: "notificaciones", label: "Notificaciones", icon: Bell },
  { id: "integraciones", label: "Integraciones", icon: PlugZap },
  { id: "seguridad", label: "Seguridad", icon: ShieldCheck },
  { id: "auditoria", label: "Auditoría", icon: FileClock },
];

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
  ...EXTRA_SIDEBAR_COLORS.filter(
    (extra) => !SIDEBAR_COLORS.some((color) => color.id === extra.id),
  ),
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

  const [settings, setSettings] = useState<ClinicSettings>(DEFAULT_SETTINGS);
  // Ajustes de la empresa de la sesión (se recargan si cambia la sesión).
  const tenant = useTenantActual();

  useEffect(() => {
    setSettings(cargarSettings(clinic));
  }, [clinic, tenant]);

  const actualizar = <K extends keyof ClinicSettings>(
    key: K,
    value: ClinicSettings[K],
  ) => {
    const next = {
      ...settings,
      [key]: value,
    };

    setSettings(next);
    guardarSettings(clinic, next);
  };

  return (
    <div className="relative overflow-hidden rounded-[30px] border border-border/60 bg-gradient-to-br from-primary/[0.07] via-background to-background p-3 sm:p-5">
      <div className="pointer-events-none absolute -right-32 -top-32 size-96 rounded-full bg-primary/[0.07] blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-24 size-80 rounded-full bg-primary/[0.045] blur-3xl" />

      <div className="relative">
        <ConfiguracionHeader />

        {/* PESTAÑAS EN UNA SOLA LÍNEA, SIN SCROLL */}
        <div className="mt-5 w-full border-b border-border/70">
          <div className="flex w-full items-stretch gap-0">
            {TABS.map((item) => {
              const Icon = item.icon;
              const activo = tab === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`relative flex min-w-0 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-t-xl px-1.5 py-2.5 text-[10px] font-semibold transition-all sm:gap-2 sm:px-2 sm:text-[11px] ${
                    activo
                      ? "bg-card text-primary"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`}
                >
                  <Icon className="size-3 shrink-0 sm:size-3.5" />
                  <span className="truncate">{item.label}</span>

                  {activo && (
                    <span className="absolute inset-x-1.5 -bottom-px h-0.5 rounded-full bg-primary sm:inset-x-2" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5">
          {tab === "general" && (
            <GeneralTab
              settings={settings}
              actualizar={actualizar}
              onToast={onToast}
            />
          )}

          {tab === "profesionales" && (
            <ProfesionalesTab onToast={onToast} />
          )}

          {tab === "directorio" && (
            <DirectorioTab onToast={onToast} />
          )}

          {tab === "actividad" && <ActividadTab />}

          {tab === "apariencia" && (
            <AparienciaTab
              settings={settings}
              actualizar={actualizar}
            />
          )}

          {tab === "notificaciones" && (
            <NotificacionesTab
              settings={settings}
              actualizar={actualizar}
              onToast={onToast}
            />
          )}

          {tab === "integraciones" && <IntegracionesTab />}

          {tab === "seguridad" && (
            <SeguridadTab
              plan={plan}
              settings={settings}
              actualizar={actualizar}
              onToast={onToast}
            />
          )}

          {tab === "auditoria" && (
            <AuditoriaTab
              settings={settings}
              actualizar={actualizar}
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

function ConfiguracionHeader() {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/10">
          <Settings className="size-5" />
        </span>

        <div>
          <h1 className="font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Configuración
          </h1>

          <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
            Personalizá tu experiencia, gestioná tu clínica y controlá los accesos.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-card px-3 py-2 text-xs text-muted-foreground shadow-sm">
        <span className="size-2 rounded-full bg-emerald-500" />
        Configuración activa
      </div>
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
  actualizar: <K extends keyof ClinicSettings>(
    key: K,
    value: ClinicSettings[K],
  ) => void;
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
          <InputVisual
            label="Nombre de la clínica"
            value="Centro Odontológico Esthetic"
          />

          <InputVisual
            label="RUC / CUIT"
            value="30-12345678-9"
          />

          <InputVisual
            label="Dirección"
            value="Av. Siempre Viva 123, CABA"
          />

          <InputVisual
            label="Teléfono"
            value="+54 11 1234-5678"
          />

          <InputVisual
            label="Email de contacto"
            value="info@cloudesther.com"
          />
        </div>

        <button
          type="button"
          onClick={() => onToast("Cambios guardados")}
          className="btn-ce mt-4"
        >
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
            onChange={(value) =>
              actualizar("darkModePage", value)
            }
          />

          <FilaSwitch
            icon={Sparkles}
            titulo="Esther AI"
            descripcion="Asistente inteligente disponible en la plataforma."
            checked={settings.aiEnabled}
            onChange={(value) => {
              actualizar("aiEnabled", value);
              onToast(
                value
                  ? "Esther AI activada"
                  : "Esther AI desactivada",
              );
            }}
          />

          <FilaSwitch
            icon={Bell}
            titulo="Notificaciones"
            descripcion="Avisos de turnos, vencimientos y novedades."
            checked={settings.notificationsEnabled}
            onChange={(value) =>
              actualizar("notificationsEnabled", value)
            }
          />
        </div>
      </div>

      <PreviewSidebar
        settings={settings}
        actualizar={actualizar}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                              PROFESIONALES                                 */
/* -------------------------------------------------------------------------- */

function ProfesionalesTab({
  onToast,
}: {
  onToast: (msg: string) => void;
}) {
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
          <StatCard
            icon={Users}
            label="Profesionales"
            value="3"
          />

          <StatCard
            icon={CheckCircle2}
            label="Activos"
            value="2"
          />

          <StatCard
            icon={Clock3}
            label="Pendientes"
            value="1"
          />
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
          <div
            key={`${profesional.initials}-${index}`}
            className={`${CARD} p-5`}
          >
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

                <p className="mt-1 text-xs text-muted-foreground">
                  {profesional.specialty}
                </p>
              </div>
            </div>

            <div className="mt-4 border-t border-border/60 pt-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  Agenda
                </span>

                <span className="font-semibold text-foreground">
                  Disponible
                </span>
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

function DirectorioTab({
  onToast,
}: {
  onToast: (msg: string) => void;
}) {
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
              El directorio centraliza los documentos y recursos
              asociados a tu clínica.
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
                  <p className="font-display text-sm font-bold text-foreground">
                    {item.title}
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.description}
                  </p>
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
/*                                 ACTIVIDAD                                  */
/* -------------------------------------------------------------------------- */

function ActividadTab() {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
      <div className={`${CARD} p-5`}>
        <SectionHeader
          icon={Activity}
          title="Actividad"
          description="Resumen de actividad reciente de la clínica."
        />

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard
            icon={CalendarDays}
            label="Turnos hoy"
            value="20"
          />

          <StatCard
            icon={Users}
            label="Profesionales"
            value="3"
          />

          <StatCard
            icon={FolderOpen}
            label="Documentos"
            value="12"
          />

          <StatCard
            icon={Shield}
            label="Eventos"
            value="0"
          />
        </div>

        <div className="mt-5 divide-y divide-border/60">
          <ActividadRow
            icon={CalendarCheck}
            title="Agenda"
            description="La agenda está preparada para mostrar actividad y movimientos recientes."
          />

          <ActividadRow
            icon={Users}
            title="Profesionales"
            description="La actividad del equipo se mostrará en este espacio."
          />

          <ActividadRow
            icon={FolderOpen}
            title="Directorio"
            description="Los movimientos sobre documentos quedarán centralizados aquí."
          />
        </div>
      </div>

      <div className={`${CARD} p-5`}>
        <SectionHeader
          icon={Clock3}
          title="Actividad reciente"
          description="Últimos eventos del sistema."
        />

        <div className="mt-5 rounded-xl border border-dashed border-border bg-muted/20 p-7 text-center">
          <span className="mx-auto grid size-11 place-items-center rounded-xl bg-background text-muted-foreground shadow-sm">
            <Activity className="size-5" />
          </span>

          <p className="mt-3 text-sm font-semibold text-foreground">
            Sin actividad registrada
          </p>

          <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">
            El historial se conectará posteriormente con los datos reales del sistema.
          </p>
        </div>
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
  actualizar: <K extends keyof ClinicSettings>(
    key: K,
    value: ClinicSettings[K],
  ) => void;
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
          <p className="text-xs font-bold text-foreground">
            Color del sidebar
          </p>

          <p className="mt-1 text-[11px] text-muted-foreground">
            Elegí el color principal del menú lateral.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {ALL_SIDEBAR_COLORS.map((color) => {
              const activo =
                settings.sidebarColor === color.id;

              return (
                <ColorOption
                  key={color.id}
                  label={color.label}
                  hex={color.hex}
                  activo={activo}
                  onClick={() =>
                    actualizar(
                      "sidebarColor",
                      color.id as SidebarColor,
                    )
                  }
                />
              );
            })}
          </div>
        </div>

        <div className="mt-6 border-t border-border/60 pt-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-foreground">
                Modo oscuro
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                Activá el tema oscuro de la plataforma.
              </p>
            </div>

            <ToggleSwitch
              checked={settings.darkModePage}
              onChange={(value) =>
                actualizar("darkModePage", value)
              }
              label="Modo oscuro"
            />
          </div>
        </div>

        <div className="mt-4 border-t border-border/60 pt-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-foreground">
                Sidebar oscuro
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                Oscurece el color elegido del menú lateral. Blanco y negro no cambian.
              </p>
            </div>

            <ToggleSwitch
              checked={settings.darkModeSidebar}
              onChange={(value) =>
                actualizar("darkModeSidebar", value)
              }
              label="Sidebar oscuro"
            />
          </div>
        </div>

        <div className="mt-5 border-t border-border/60 pt-5">
          <p className="text-xs font-bold text-foreground">
            Tamaño de letra
          </p>

          <p className="mt-1 text-[11px] text-muted-foreground">
            Ajustá el tamaño del texto en toda la plataforma.
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {FONT_SIZES.map((font) => {
              const activo =
                settings.fontSize === font.id;

              return (
                <button
                  key={font.id}
                  type="button"
                  onClick={() =>
                    actualizar(
                      "fontSize",
                      font.id as FontSize,
                    )
                  }
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

      <PreviewSidebar
        settings={settings}
        actualizar={actualizar}
      />
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
  actualizar: <K extends keyof ClinicSettings>(
    key: K,
    value: ClinicSettings[K],
  ) => void;
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
            onChange={(value) =>
              actualizar("notificationsEnabled", value)
            }
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
            <div
              key={integration.name}
              className={`${CARD} p-5`}
            >
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

                  <p className="mt-1 text-xs text-muted-foreground">
                    {integration.description}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${integration.statusClass}`}
                >
                  {integration.status}
                </span>

                <button
                  type="button"
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Configurar
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                SEGURIDAD                                   */
/* -------------------------------------------------------------------------- */

function SeguridadTab({
  plan,
  settings,
  actualizar,
  onToast,
}: {
  plan: string;
  settings: ClinicSettings;
  actualizar: <K extends keyof ClinicSettings>(
    key: K,
    value: ClinicSettings[K],
  ) => void;
  onToast: (msg: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <div className={`${CARD} p-5`}>
        <SectionHeader
          icon={ShieldCheck}
          title="Seguridad"
          description="Protegé tu información y controlá los accesos."
        />

        <div className="mt-4 divide-y divide-border/60">
          <FilaVisual
            icon={LockKeyhole}
            title="Autenticación de dos factores"
            description="Agregá una capa adicional de protección."
            onToast={onToast}
          />

          <FilaVisual
            icon={Users}
            title="Bloquear usuarios inactivos"
            description="Controlá automáticamente las cuentas inactivas."
            onToast={onToast}
          />

          <FilaVisual
            icon={Shield}
            title="Control de acceso"
            description="Gestioná permisos y accesos según el rol."
            onToast={onToast}
          />
        </div>
      </div>

      <div className={`${CARD} p-5`}>
        <InicioSesionCorporativo
          plan={plan}
          settings={settings}
          actualizar={actualizar}
          onToast={onToast}
        />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                AUDITORÍA                                   */
/* -------------------------------------------------------------------------- */

function AuditoriaTab({
  settings,
  actualizar,
}: {
  settings: ClinicSettings;
  actualizar: <K extends keyof ClinicSettings>(
    key: K,
    value: ClinicSettings[K],
  ) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_340px]">
      <div className={`${CARD} p-5`}>
        <SectionHeader
          icon={FileClock}
          title="Auditoría"
          description="Visualizá y controlá el registro de actividad del sistema."
        />

        <div className="mt-5">
          <RegistroAuditoria
            settings={settings}
            actualizar={actualizar}
          />
        </div>

        <div className="mt-5 rounded-xl border border-dashed border-border bg-muted/20 p-7 text-center">
          <FileClock className="mx-auto size-7 text-muted-foreground" />

          <p className="mt-3 text-sm font-semibold text-foreground">
            Historial de auditoría
          </p>

          <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-muted-foreground">
            La estructura visual queda preparada para mostrar los eventos,
            cambios y acciones cuando conectes el registro definitivo.
          </p>
        </div>
      </div>

      <div className={`${CARD} p-5`}>
        <SectionHeader
          icon={Shield}
          title="Estado de auditoría"
          description="Configuración actual del registro."
        />

        <div className="mt-5 rounded-xl border border-border/60 bg-muted/20 p-4">
          <div className="flex items-center gap-3">
            <span
              className={`grid size-9 place-items-center rounded-xl ${
                settings.auditLogEnabled
                  ? "bg-emerald-500/10 text-emerald-600"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <FileClock className="size-4" />
            </span>

            <div>
              <p className="text-sm font-bold text-foreground">
                Registro de auditoría
              </p>

              <p className="mt-0.5 text-xs text-muted-foreground">
                {settings.auditLogEnabled
                  ? "Actualmente activado"
                  : "Actualmente desactivado"}
              </p>
            </div>
          </div>
        </div>
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
        <h2 className="font-display text-base font-bold tracking-tight text-foreground">
          {title}
        </h2>

        <p className="mt-0.5 text-xs text-muted-foreground">
          {description}
        </p>
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
          <p className="font-display text-sm font-semibold text-foreground">
            {titulo}
          </p>

          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {descripcion}
          </p>
        </div>
      </div>

      <ToggleSwitch
        checked={checked}
        onChange={onChange}
        label={titulo}
      />
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
          <p className="text-sm font-semibold text-foreground">
            {title}
          </p>

          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
      </div>

      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </button>
  );
}

function InputVisual({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
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

        <span className="text-[11px] font-medium text-muted-foreground">
          {label}
        </span>
      </div>

      <p className="mt-3 font-display text-2xl font-bold tracking-tight text-foreground">
        {value}
      </p>
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
        <p className="text-sm font-semibold text-foreground">
          {title}
        </p>

        <p className="mt-0.5 text-xs text-muted-foreground">
          {description}
        </p>
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
        <p className="text-xs font-bold text-foreground">
          {title}
        </p>

        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {description}
        </p>
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
          <p className="text-xs font-bold text-foreground">
            {title}
          </p>

          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            {description}
          </p>
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
          label === "Blanco"
            ? "border-border"
            : "border-transparent"
        }`}
        style={{ backgroundColor: hex }}
      >
        {activo && (
          <span className="absolute right-2 top-2 grid size-5 place-items-center rounded-full bg-white shadow">
            <CheckCircle2 className="size-3.5 text-primary" />
          </span>
        )}
      </span>

      <span className="mt-2 block text-[10px] font-bold text-foreground">
        {label}
      </span>
    </button>
  );
}

function PreviewSidebar({
  settings,
  actualizar,
}: {
  settings: ClinicSettings;
  actualizar: <K extends keyof ClinicSettings>(
    key: K,
    value: ClinicSettings[K],
  ) => void;
}) {
  const selectedColor =
    ALL_SIDEBAR_COLORS.find(
      (color) => color.id === settings.sidebarColor,
    )?.hex ?? "#7c3aed";

  const esBlanco = settings.sidebarColor === "blanco";
  const esNegro = settings.sidebarColor === "negro";

  // El color elegido manda. El interruptor "Sidebar oscuro" solo oscurece
  // los colores intermedios: blanco sigue blanco y negro sigue negro.
  const oscurecer = settings.darkModeSidebar && !esBlanco && !esNegro;

  const fondo = oscurecer
    ? `color-mix(in oklab, ${selectedColor} 45%, black)`
    : selectedColor;

  // Texto oscuro sobre fondos claros (blanco y amarillo sin oscurecer).
  const esClaro =
    esBlanco || (settings.sidebarColor === "amarillo" && !oscurecer);

  return (
    <div className={`${CARD} p-4`}>
      <div className="flex items-center gap-2">
        <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
          <Palette className="size-4" />
        </span>

        <div>
          <p className="text-sm font-bold text-foreground">
            Vista previa
          </p>

          <p className="text-[10px] text-muted-foreground">
            Así se verá tu sidebar.
          </p>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-border/60 shadow-sm">
        <div
          className="p-3"
          style={{
            backgroundColor: fondo,
          }}
        >
          <div
            className={`flex items-center gap-2 ${
              esClaro ? "text-gray-900" : "text-white"
            }`}
          >
            <span
              className={`grid size-7 place-items-center rounded-lg ${
                esClaro ? "bg-gray-900/10" : "bg-white/15"
              }`}
            >
              <Settings className="size-3.5" />
            </span>

            <div>
              <p className="text-[10px] font-bold">
                Cloud Esther
              </p>

              <p
                className={`text-[7px] ${
                  esClaro ? "text-gray-500" : "text-white/70"
                }`}
              >
                Tu clínica, en la nube
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-1">
            {[
              "Inicio",
              "Pacientes",
              "Agenda",
              "Historia clínica",
              "Odontograma",
              "Presupuestos",
              "Facturación",
              "Configuración",
            ].map((item) => (
              <div
                key={item}
                className={`rounded-lg px-2.5 py-1.5 text-[8px] ${
                  item === "Configuración"
                    ? esClaro
                      ? "bg-gray-900/10 font-bold text-gray-900"
                      : "bg-white/20 font-bold text-white"
                    : esClaro
                      ? "text-gray-600"
                      : "text-white/80"
                }`}
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-muted-foreground">
            Modo oscuro
          </span>

          <ToggleSwitch
            checked={settings.darkModeSidebar}
            onChange={(value) =>
              actualizar("darkModeSidebar", value)
            }
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