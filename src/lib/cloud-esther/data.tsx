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
  FlaskConical,
  Megaphone,
  UserCircle2,
  UserCog,
  Mails,
  Plug,
  FolderOpen,
  Wallet,
} from "lucide-react";

export type PlanId = "inicial" | "profesional" | "avanzada" | "grupo";

type PlanInfo = {
  id: PlanId;
  name: string;
  level: number;
  audience: string;
  price: string;
};

export const PLANS: Record<PlanId, PlanInfo> = {
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

/* ─────────────────────────────────────────────
   Persistencia del plan (localStorage)
───────────────────────────────────────────── */

const PLAN_STORAGE_KEY = "cloud-esther-demo:plan";

function isPlanId(value: string): value is PlanId {
  return value === "inicial" || value === "profesional" || value === "avanzada" || value === "grupo";
}

function getStoredPlan(): PlanId {
  if (typeof window === "undefined") {
    return "avanzada";
  }

  const raw = window.localStorage.getItem(PLAN_STORAGE_KEY);

  return raw && isPlanId(raw) ? raw : "avanzada";
}

export function setStoredPlan(id: PlanId) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(PLAN_STORAGE_KEY, id);
}

export function mapSitePlanToPlanId(siteId: string): PlanId {
  switch (siteId) {
    case "esencial":
      return "inicial";
    case "profesional":
      return "profesional";
    case "avanzado":
      return "avanzada";
    case "enterprise":
      return "grupo";
    default:
      return "inicial";
  }
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
    id: "laboratorio",
    label: "Laboratorio",
    icon: "laboratorio",
    path: "/demo/laboratorio",
    group: "Clínico",
    minPlan: "profesional",
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
  // OPERACIÓN (Centro de Operaciones)
  // ─────────────────────────────────────────────
  {
    id: "comunicaciones",
    label: "Comunicación",
    icon: "message",
    path: "/demo/comunicaciones",
    group: "Operación",
    minPlan: "inicial",
  },
  {
    id: "notificaciones",
    label: "Notificaciones",
    icon: "bell",
    path: "/demo/notificaciones",
    group: "Operación",
    minPlan: "inicial",
  },
  {
    id: "equipo",
    label: "Equipo",
    icon: "team",
    path: "/demo/equipo-profesional",
    group: "Operación",
    minPlan: "inicial",
  },
  {
    id: "marketing",
    label: "Marketing y captación",
    icon: "marketing",
    path: "/demo/marketing",
    group: "Operación",
    minPlan: "profesional",
  },
  {
    id: "portal-paciente",
    label: "Portal del paciente",
    icon: "portal-paciente",
    path: "/demo/portal-paciente",
    group: "Operación",
    minPlan: "profesional",
  },
  {
    id: "inventario",
    label: "Inventario",
    icon: "boxes",
    path: "/demo/inventario",
    group: "Operación",
    minPlan: "avanzada",
  },
  {
    id: "rrhh",
    label: "Equipo y RRHH",
    icon: "users",
    path: "/demo/rrhh",
    group: "Operación",
    minPlan: "avanzada",
  },
  {
    id: "presupuestos",
    label: "Presupuestos",
    icon: "receipt",
    path: "/demo/presupuestos",
    group: "Operación",
    minPlan: "profesional",
  },

  // ─────────────────────────────────────────────
  // ADMINISTRACIÓN
  // ─────────────────────────────────────────────
  {
    id: "facturacion",
    label: "Facturación",
    icon: "receipt",
    path: "/demo/facturacion",
    group: "Administración",
    minPlan: "profesional",
  },
  {
    id: "finanzas",
    label: "Finanzas",
    icon: "finanzas",
    path: "/demo/finanzas",
    group: "Administración",
    minPlan: "profesional",
  },
  {
    id: "bi",
    label: "Analítica",
    icon: "chart",
    path: "/demo/bi",
    group: "Administración",
    minPlan: "avanzada",
  },
  {
    id: "ia",
    label: "IA Esther",
    icon: "sparkles",
    path: "/demo/ia",
    group: "Administración",
    minPlan: "avanzada",
  },
  {
    id: "automatizaciones",
    label: "Automatizaciones",
    icon: "workflow",
    path: "/demo/automatizaciones",
    group: "Administración",
    minPlan: "avanzada",
  },
  {
    id: "multiempresa",
    label: "Multiempresa",
    icon: "multiempresa",
    path: "/demo/multiempresa",
    group: "Administración",
    minPlan: "grupo",
  },
  {
    id: "integraciones",
    label: "Integraciones",
    icon: "integraciones",
    path: "/demo/integraciones",
    group: "Administración",
    minPlan: "grupo",
  },
  {
    id: "documentos",
    label: "Documentos y seguridad",
    icon: "documentos",
    path: "/demo/documentos",
    group: "Administración",
    minPlan: "grupo",
  },
  {
    id: "seguridad",
    label: "Seguridad",
    icon: "shield",
    path: "/demo/seguridad",
    group: "Administración",
    minPlan: "grupo",
  },
  {
    id: "configuracion",
    label: "Configuración",
    icon: "settings",
    path: "/demo/configuracion",
    group: "Administración",
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
    "Equipo",
    "Comunicación",
    "Notificaciones",
    "Configuración",
  ],
  profesional: [
    "Todo lo anterior",
    "Presupuestos",
    "Finanzas",
    "Laboratorio",
    "Marketing y captación",
    "Portal del paciente",
  ],
  avanzada: [
    "Todo lo anterior",
    "Odontograma 3D",
    "Inventario",
    "Equipo y RRHH",
    "IA Esther",
    "Automatizaciones",
    "Analítica",
  ],
  grupo: [
    "Todo lo anterior",
    "Multi-clínica",
    "Multiempresa",
    "Integraciones",
    "Documentos y seguridad",
    "Seguridad",
  ],
};

const ICONS: Record<string, typeof LayoutDashboard> = {
  dashboard: LayoutDashboard,
  calendar: CalendarDays,
  users: Users,
  team: UserCog,
  file: FileText,
  receipt: Receipt,
  finanzas: Wallet,
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
  laboratorio: FlaskConical,
  marketing: Megaphone,
  "portal-paciente": UserCircle2,
  multiempresa: Mails,
  integraciones: Plug,
  documentos: FolderOpen,
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
  const [plan, setPlanState] = useState<PlanId>(() => getStoredPlan());
  const [clinic, setClinic] = useState("centro");
  const [role] = useState("admin");
  const [disabled] = useState<string[]>([]);

  const setPlan = (p: PlanId) => {
    setPlanState(p);
    setStoredPlan(p);
  };

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