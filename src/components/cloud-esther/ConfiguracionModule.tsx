import { useEffect, useState } from "react";
import { Settings, Palette, ShieldCheck, Bell, Sparkles, Moon, Type } from "lucide-react";
import { useCloudEsther } from "@/lib/cloud-esther/data";
import {
  cargarSettings,
  guardarSettings,
  SIDEBAR_COLORS,
  FONT_SIZES,
  type ClinicSettings,
  type SidebarColor,
  type FontSize,
} from "@/lib/cloud-esther/settings-store";
import { ToggleSwitch } from "./ToggleSwitch";
import { InicioSesionCorporativo, RegistroAuditoria } from "./InicioSesionCorporativo";

const CARD =
  "rounded-2xl border border-border/70 bg-card/95 p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_1px_3px_rgba(16,24,40,0.06)] backdrop-blur-sm";

type TabId = "general" | "apariencia" | "seguridad";

const TABS: { id: TabId; label: string; icon: typeof Settings }[] = [
  { id: "general", label: "General", icon: Settings },
  { id: "apariencia", label: "Apariencia", icon: Palette },
  { id: "seguridad", label: "Seguridad", icon: ShieldCheck },
];

type Props = {
  onToast: (msg: string) => void;
};

export function ConfiguracionModule({ onToast }: Props) {
  const { clinic, plan } = useCloudEsther();
  /* Arranca en "Seguridad" a propósito, para que "Inicio de sesión
     corporativo" sea lo primero que se ve al entrar al módulo. */
  const [tab, setTab] = useState<TabId>("seguridad");
  const [settings, setSettings] = useState<ClinicSettings>(() => cargarSettings(clinic));

  useEffect(() => {
    setSettings(cargarSettings(clinic));
  }, [clinic]);

  const actualizar = <K extends keyof ClinicSettings>(key: K, value: ClinicSettings[K]) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    guardarSettings(clinic, next);
  };

  return (
    <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-primary/[0.10] via-primary/[0.03] to-transparent p-3 sm:p-5">
      <div className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-primary/[0.08] blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-16 size-64 rounded-full bg-primary/[0.06] blur-3xl" />

      <div className="relative grid grid-cols-1 gap-4 lg:grid-cols-[230px_1fr]">
        <div className={`${CARD} h-fit lg:sticky lg:top-4`}>
          <p className="mb-2 px-1 font-display text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Secciones
          </p>
          <div className="space-y-1">
            {TABS.map((t) => {
              const Icon = t.icon;
              const activo = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left font-display text-sm font-semibold transition-all ${
                    activo
                      ? "bg-primary text-primary-foreground shadow-[0_2px_8px_rgba(124,58,237,0.25)]"
                      : "text-foreground hover:bg-muted/60"
                  }`}
                >
                  <Icon className="size-4 shrink-0" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          {tab === "general" && (
            <GeneralTab settings={settings} actualizar={actualizar} onToast={onToast} />
          )}
          {tab === "apariencia" && <AparienciaTab settings={settings} actualizar={actualizar} />}
          {tab === "seguridad" && (
            <>
              <RegistroAuditoria settings={settings} actualizar={actualizar} />
              <InicioSesionCorporativo plan={plan} settings={settings} actualizar={actualizar} onToast={onToast} />
            </>
          )}
        </div>
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
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-3.5">
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
    <div className={CARD}>
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Settings className="size-4.5" />
        </span>
        <div>
          <h2 className="font-display text-base font-bold tracking-tight text-foreground">General</h2>
          <p className="text-xs text-muted-foreground">Preferencias generales del sistema.</p>
        </div>
      </div>

      <div className="mt-3 divide-y divide-border/60">
        <FilaSwitch
          icon={Sparkles}
          titulo="Inteligencia artificial (Esther AI)"
          descripcion="Activa el asistente inteligente en el odontograma y otras secciones."
          checked={settings.aiEnabled}
          onChange={(v) => {
            actualizar("aiEnabled", v);
            onToast(v ? "Esther AI activada" : "Esther AI desactivada");
          }}
        />
        <FilaSwitch
          icon={Bell}
          titulo="Notificaciones"
          descripcion="Avisos de turnos, vencimientos y novedades dentro de la plataforma."
          checked={settings.notificationsEnabled}
          onChange={(v) => actualizar("notificationsEnabled", v)}
        />
      </div>
    </div>
  );
}

function AparienciaTab({
  settings,
  actualizar,
}: {
  settings: ClinicSettings;
  actualizar: <K extends keyof ClinicSettings>(key: K, value: ClinicSettings[K]) => void;
}) {
  return (
    <div className={CARD}>
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Palette className="size-4.5" />
        </span>
        <div>
          <h2 className="font-display text-base font-bold tracking-tight text-foreground">Apariencia</h2>
          <p className="text-xs text-muted-foreground">Personalizá cómo se ve la plataforma para tu clínica.</p>
        </div>
      </div>

      <div className="mt-3 divide-y divide-border/60">
        <FilaSwitch
          icon={Moon}
          titulo="Modo oscuro (página)"
          descripcion="Aplica un tema oscuro a toda la interfaz."
          checked={settings.darkModePage}
          onChange={(v) => actualizar("darkModePage", v)}
        />
        <FilaSwitch
          icon={Moon}
          titulo="Modo oscuro (sidebar)"
          descripcion="Solo el menú lateral queda en tema oscuro."
          checked={settings.darkModeSidebar}
          onChange={(v) => actualizar("darkModeSidebar", v)}
        />

        <div className="py-3.5">
          <div className="mb-2.5 flex items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <Palette className="size-4" />
            </span>
            <div>
              <p className="font-display text-sm font-semibold text-foreground">Color del sidebar</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Elegí el acento de color del menú lateral.</p>
            </div>
          </div>
          <div className="ml-12 flex flex-wrap gap-2.5">
            {SIDEBAR_COLORS.map((c) => {
              const activo = settings.sidebarColor === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  title={c.label}
                  onClick={() => actualizar("sidebarColor", c.id as SidebarColor)}
                  className={`flex size-8 items-center justify-center rounded-full ring-offset-2 ring-offset-card transition-all ${
                    activo ? "scale-105 ring-2 ring-foreground" : "hover:scale-105"
                  }`}
                  style={{ backgroundColor: c.hex }}
                >
                  {activo && <span className="size-2 rounded-full bg-white" />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="py-3.5">
          <div className="mb-2.5 flex items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <Type className="size-4" />
            </span>
            <div>
              <p className="font-display text-sm font-semibold text-foreground">Tamaño de letra</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Ajustá el tamaño del texto en toda la plataforma.</p>
            </div>
          </div>
          <div className="ml-12 flex gap-2">
            {FONT_SIZES.map((f) => {
              const activo = settings.fontSize === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => actualizar("fontSize", f.id as FontSize)}
                  className={`rounded-lg border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                    activo
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-foreground hover:bg-muted/60"
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}