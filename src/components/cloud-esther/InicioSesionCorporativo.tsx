import { Building2, Crown, FileClock } from "lucide-react";
import { PLANS, planLevel, type PlanId } from "@/lib/cloud-esther/data";
import { ToggleSwitch } from "./ToggleSwitch";
import type { ClinicSettings } from "@/lib/cloud-esther/settings-store";

const CARD =
  "rounded-2xl border border-border/70 bg-card/95 p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_1px_3px_rgba(16,24,40,0.06)] backdrop-blur-sm";

export const PLAN_MINIMO_DIRECTORIO: PlanId = "grupo";

type Props = {
  plan: PlanId;
  settings: ClinicSettings;
  actualizar: <K extends keyof ClinicSettings>(key: K, value: ClinicSettings[K]) => void;
  onToast: (msg: string) => void;
};

/* Este componente vive SOLO, aparte del resto de Configuración, para que
   nunca se pierda al editar otras partes del módulo. Siempre se renderiza
   completo, tenga o no el plan el acceso desbloqueado. */
export function InicioSesionCorporativo({ plan, settings, actualizar, onToast }: Props) {
  const tieneAcceso = planLevel(plan) >= planLevel(PLAN_MINIMO_DIRECTORIO);

  return (
    <div className={`${CARD} ${tieneAcceso ? "border-primary/25" : "border-dashed"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span
            className={`grid size-10 shrink-0 place-items-center rounded-xl ${
              tieneAcceso ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
            }`}
          >
            <Building2 className="size-4.5" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              <h3 className="font-display text-sm font-bold text-foreground">
                Inicio de sesión corporativo
              </h3>
              <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                <Crown className="size-3" />
                Plan {PLANS[PLAN_MINIMO_DIRECTORIO].name}
              </span>
            </div>
            <p className="mt-1 max-w-md text-xs leading-relaxed text-muted-foreground">
              Conectá el ingreso de tu equipo al directorio de usuarios de tu organización: gestión
              centralizada de cuentas, permisos y tokens de acceso — pensado para clínicas con varias
              sedes.
            </p>
          </div>
        </div>

        {tieneAcceso ? (
          <ToggleSwitch
            checked={settings.advancedSecurityEnabled}
            onChange={(v) => {
              actualizar("advancedSecurityEnabled", v);
              onToast(v ? "Inicio de sesión corporativo activado" : "Inicio de sesión corporativo desactivado");
            }}
            label="Inicio de sesión corporativo"
          />
        ) : (
          <button
            onClick={() => onToast(`Disponible desde el plan ${PLANS[PLAN_MINIMO_DIRECTORIO].name}`)}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted/60"
          >
            Actualizar plan
          </button>
        )}
      </div>

      {!tieneAcceso && (
        <p className="mt-3 rounded-lg bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
          Tu plan actual es <span className="font-semibold text-foreground">{PLANS[plan].name}</span>.
          Esta función se habilita a partir de {PLANS[PLAN_MINIMO_DIRECTORIO].name}.
        </p>
      )}
    </div>
  );
}

export function RegistroAuditoria({
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
          <FileClock className="size-4.5" />
        </span>
        <div>
          <h2 className="font-display text-base font-bold tracking-tight text-foreground">Seguridad</h2>
          <p className="text-xs text-muted-foreground">Configuración de acceso y trazabilidad del sistema.</p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 py-3.5">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <FileClock className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="font-display text-sm font-semibold text-foreground">Registro de auditoría</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              Guarda un historial de las acciones realizadas dentro de la plataforma.
            </p>
          </div>
        </div>
        <ToggleSwitch
          checked={settings.auditLogEnabled}
          onChange={(v) => actualizar("auditLogEnabled", v)}
          label="Registro de auditoría"
        />
      </div>
    </div>
  );
}