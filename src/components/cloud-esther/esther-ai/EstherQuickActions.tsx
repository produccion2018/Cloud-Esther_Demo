import { useState } from "react";
import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  FileText,
  ScanLine,
  Search,
  Smile,
  Stethoscope,
  UserRoundSearch,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { estherQuickActions, type EstherQuickAction } from "@/lib/cloud-esther/esther-ai";

type Props = {
  disabled?: boolean;
  onAction: (action: EstherQuickAction) => void;
  /** Acciones visibles antes de "Más acciones" (para no llenar la pantalla de botones). */
  visibles?: number;
};

const ICONOS: Record<string, LucideIcon> = {
  "analizar-paciente": UserRoundSearch,
  "resumir-historia": FileText,
  "revisar-odontograma": Stethoscope,
  "preparar-informe": ClipboardList,
  "buscar-informacion": Search,
  "analizar-registros": BarChart3,
  "analizar-radiografia": ScanLine,
  "simular-sonrisa": Smile,
  "analizar-tratamientos": Stethoscope,
  "revisar-presupuestos": Wallet,
  "analizar-agenda": CalendarDays,
  "pacientes-inactivos": Users,
  "consultar-datos": BarChart3,
};

export function EstherQuickActions({ disabled, onAction, visibles = 9 }: Props) {
  const [todas, setTodas] = useState(false);
  const lista = todas ? estherQuickActions : estherQuickActions.slice(0, visibles);
  const ocultas = estherQuickActions.length - visibles;
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {lista.map((action) => {
          const Icon = ICONOS[action.id] ?? Users;
          return (
            <button
              key={action.id}
              type="button"
              disabled={disabled === true}
              onClick={() => onAction(action)}
              className="group flex items-center gap-2.5 rounded-2xl border border-primary/12 bg-gradient-to-br from-card via-card to-primary/[0.06] px-3 py-2.5 text-left text-[13px] font-semibold text-foreground transition-all hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-[var(--shadow-glow)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary transition group-hover:text-primary-foreground group-hover:[background:var(--gradient-esther)]">
                <Icon className="size-4" />
              </span>
              <span className="min-w-0 leading-tight">{action.label}</span>
            </button>
          );
        })}
      </div>
      {ocultas > 0 && (
        <button
          type="button"
          onClick={() => setTodas((v) => !v)}
          className="text-xs font-semibold text-primary hover:underline"
        >
          {todas ? "Menos acciones" : `Más acciones (${ocultas})`}
        </button>
      )}
    </div>
  );
}
