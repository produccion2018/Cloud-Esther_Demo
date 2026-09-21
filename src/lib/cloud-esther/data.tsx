import { createContext, useContext, useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  FileText,
  Receipt,
  Boxes,
  BarChart3,
  Shield,
  Settings,
  Workflow,
  Sparkles,
  Stethoscope,
  Pill,
  ScanLine,
  Bell,
  MessageSquare,
} from "lucide-react";

export type PlanId = "inicial" | "profesional" | "avanzada" | "grupo";

export const PLANS: Record<
  PlanId,
  {
    id: PlanId;
    name: string;
    level: number;
    audience: string;
    price: string;
  }
> = {
  inicial: {
    id: "inicial",
    name: "Clínica Inicial",
    level: 1,
    audience: "Odontólogo independiente",
    price: "$29.000",
  },
  profesional: {
    id: "profesional",
    name: "Clínica Profesional",
    level: 2,
    audience: "Clínica en crecimiento",
    price: "$59.000",
  },
  avanzada: {
    id: "avanzada",
    name: "Clínica Avanzada",
    level: 3,
    audience: "Clínica integral",
    price: "$99.000",
  },
  grupo: {
    id: "grupo",
    name: "Grupo Odontológico",
    level: 4,
    audience: "Multi-sede",
    price: "$179.000",
  },
};

export function planLevel(id: PlanId) {
  return PLANS[id].level;
}

export const CLINICS = [
  { id: "centro", name: "Clínica Centro" },
  { id: "norte", name: "Clínica Norte" },
  { id: "palermo", name: "Clínica Palermo" },
  { id: "belgrano", name: "Clínica Belgrano" },
];

export const ROLES = [
  { id: "admin", label: "Administrador" },
  { id: "odontologo", label: "Odontólogo" },
  { id: "asistente", label: "Asistente" },
  { id: "secretaria", label: "Secretaria" },
];

export type ModuleGroup =
  | "Clínico"
  | "Operación"
  | "Administración"
  | "Inteligencia"
  | "Organización"
  | "Sistema";

export interface AppModule {
  id: string;
  label: string;
  icon: string;
  path: string;
  group: ModuleGroup;
  minPlan: PlanId;
}

export const MODULES: AppModule[] = [
  // ─────────────────────────────────────────────
  // CLÍNICO
  // ─────────────────────────────────────────────
  {
    id: "dashboard",
    label: "Dashboard",
    icon: "dashboard",
    path: "/demo",
    group: "Clínico",
    minPlan: "inicial",
  },
  {
    id: "agenda",
    label: "Agenda y turnos",
    icon: "calendar",
    path: "/demo/agenda",
    group: "Clínico",
    minPlan: "inicial",
  },
  {
    id: "pacientes",
    label: "Pacientes",
    icon: "users",
    path: "/demo/pacientes",
    group: "Clínico",
    minPlan: "inicial",
  },
  {
    id: "historia",
    label: "Historia clínica",
    icon: "file",
    path: "/demo/historia",
    group: "Clínico",
    minPlan: "inicial",
  },
  {
    id: "odontograma",
    label: "Odontograma",
    icon: "odontograma",
    path: "/demo/odontograma",
    group: "Clínico",
    minPlan: "inicial",
  },
  {
    id: "odontograma3d",
    label: "Odontograma 3D",
    icon: "odontograma3d",
    path: "/demo/odontograma-3d",
    group: "Clínico",
    minPlan: "avanzada",
  },
  {
    id: "recetas",
    label: "Recetas",
    icon: "pill",
    path: "/demo/recetas",
    group: "Clínico",
    minPlan: "inicial",
  },
  {
    id: "estudios",
    label: "Estudios y diagnóstico",
    icon: "studies",
    path: "/demo/estudios",
    group: "Clínico",
    minPlan: "inicial",
  },
  {
    id: "tratamientos",
    label: "Tratamientos",
    icon: "stethoscope",
    path: "/demo/tratamientos",
    group: "Clínico",
    minPlan: "inicial",
  },

  // ─────────────────────────────────────────────
  // OPERACIÓN
  // ─────────────────────────────────────────────
  {
    id: "presupuestos",
    label: "Presupuestos",
    icon: "receipt",
    path: "/demo/presupuestos",
    group: "Operación",
    minPlan: "profesional",
  },
  {
    id: "facturacion",
    label: "Facturación",
    icon: "receipt",
    path: "/demo/facturacion",
    group: "Operación",
    minPlan: "profesional",
  },
  {
    id: "recordatorios",
    label: "Recordatorios",
    icon: "bell",
    path: "/demo/recordatorios",
    group: "Operación",
    minPlan: "inicial",
  },
  {
    id: "comunicaciones",
    label: "Comunicaciones",
    icon: "message",
    path: "/demo/comunicaciones",
    group: "Operación",
    minPlan: "inicial",
  },

  // ─────────────────────────────────────────────
  // ADMINISTRACIÓN
  // ─────────────────────────────────────────────
  {
    id: "inventario",
    label: "Inventario",
    icon: "boxes",
    path: "/demo/inventario",
    group: "Administración",
    minPlan: "avanzada",
  },
  {
    id: "rrhh",
    label: "Recursos Humanos",
    icon: "users",
    path: "/demo/rrhh",
    group: "Administración",
    minPlan: "avanzada",
  },

  // ─────────────────────────────────────────────
  // INTELIGENCIA
  // ─────────────────────────────────────────────
  {
    id: "bi",
    label: "Business Intelligence",
    icon: "chart",
    path: "/demo/bi",
    group: "Inteligencia",
    minPlan: "avanzada",
  },
  {
    id: "ia",
    label: "Cloud Esther IA",
    icon: "sparkles",
    path: "/demo/ia",
    group: "Inteligencia",
    minPlan: "avanzada",
  },
  {
    id: "automatizaciones",
    label: "Automatizaciones",
    icon: "workflow",
    path: "/demo/automatizaciones",
    group: "Inteligencia",
    minPlan: "avanzada",
  },

  // ─────────────────────────────────────────────
  // SISTEMA
  // ─────────────────────────────────────────────
  {
    id: "seguridad",
    label: "Seguridad",
    icon: "shield",
    path: "/demo/seguridad",
    group: "Sistema",
    minPlan: "grupo",
  },
  {
    id: "configuracion",
    label: "Configuración",
    icon: "settings",
    path: "/demo/configuracion",
    group: "Sistema",
    minPlan: "inicial",
  },
];

export function availableIn(module: AppModule, plan: PlanId) {
  return planLevel(module.minPlan) <= planLevel(plan);
}

export const PLAN_HIGHLIGHTS: Record<PlanId, string[]> = {
  inicial: [
    "Agenda",
    "Pacientes",
    "Historia clínica",
    "Odontograma",
    "Recetas",
    "Estudios y diagnóstico",
    "Tratamientos",
    "Recordatorios",
    "Comunicaciones",
  ],
  profesional: [
    "Todo lo anterior",
    "Presupuestos",
    "Facturación",
  ],
  avanzada: [
    "Todo lo anterior",
    "Odontograma 3D",
    "Inventario",
    "RRHH",
    "IA",
    "Automatizaciones",
    "BI",
  ],
  grupo: [
    "Todo lo anterior",
    "Multi-clínica",
    "Dashboard corporativo",
    "IA corporativa",
  ],
};

const ICONS: Record<string, typeof LayoutDashboard> = {
  dashboard: LayoutDashboard,
  calendar: CalendarDays,
  users: Users,
  file: FileText,
  receipt: Receipt,
  boxes: Boxes,
  chart: BarChart3,
  shield: Shield,
  settings: Settings,
  workflow: Workflow,
  sparkles: Sparkles,
  stethoscope: Stethoscope,
  pill: Pill,
  odontograma: ScanLine,
  odontograma3d: ScanLine,
  studies: FileText,
  bell: Bell,
  message: MessageSquare,
};

export function ModuleIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const Icon = ICONS[name] ?? LayoutDashboard;
  return <Icon className={className} />;
}

interface CloudEstherContextValue {
  plan: PlanId;
  setPlan: (p: PlanId) => void;
  clinic: string;
  setClinic: (c: string) => void;
  role: string;
  disabled: string[];
}

const CloudEstherContext =
  createContext<CloudEstherContextValue | null>(null);

export function CloudEstherProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [plan, setPlan] = useState<PlanId>("avanzada");
  const [clinic, setClinic] = useState("centro");
  const [role] = useState("admin");
  const [disabled] = useState<string[]>([]);

  return (
    <CloudEstherContext.Provider
      value={{
        plan,
        setPlan,
        clinic,
        setClinic,
        role,
        disabled,
      }}
    >
      {children}
    </CloudEstherContext.Provider>
  );
}

export function useCloudEsther() {
  const ctx = useContext(CloudEstherContext);

  if (!ctx) {
    throw new Error(
      "useCloudEsther must be used within CloudEstherProvider",
    );
  }

  return ctx;
}