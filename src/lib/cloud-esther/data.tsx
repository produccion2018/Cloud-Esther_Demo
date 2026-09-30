import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { claveTenant, TENANT_DEMO, useTenantActual } from "@/lib/cloud-esther/tenant-store";
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
    name: "Start",
    level: 1,
    audience: "Odontólogo independiente",
    price: "$29.000",
  },
  profesional: {
    id: "profesional",
    name: "Pro",
    level: 2,
    audience: "Clínica en crecimiento",
    price: "$59.000",
  },
  avanzada: {
    id: "avanzada",
    name: "Plus",
    level: 3,
    audience: "Clínica integral",
    price: "$99.000",
  },
  grupo: {
    id: "grupo",
    name: "Enterprise",
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

  // El plan se guarda por empresa: cada clínica tiene el suyo.
  const raw = window.localStorage.getItem(claveTenant(PLAN_STORAGE_KEY));

  return raw && isPlanId(raw) ? raw : "avanzada";
}

export function setStoredPlan(id: PlanId) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(claveTenant(PLAN_STORAGE_KEY), id);
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
  /** Último plan que lo muestra (ej. el 2D deja de verse cuando el plan ya tiene 3D). */
  maxPlan?: PlanId;
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
    label: "Odontograma 2D",
    icon: "odontograma",
    path: "/demo/odontograma",
    group: "Clínico",
    minPlan: "inicial",
    maxPlan: "profesional",
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
    minPlan: "profesional",
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
    minPlan: "avanzada",
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
    minPlan: "inicial",
  },
  {
    id: "finanzas",
    label: "Finanzas",
    icon: "finanzas",
    path: "/demo/finanzas",
    group: "Administración",
    minPlan: "inicial",
  },
  {
    id: "bi",
    label: "Analítica",
    icon: "chart",
    path: "/demo/bi",
    group: "Administración",
    minPlan: "profesional",
  },
  {
    id: "ia",
    label: "IA Esther",
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
    group: "Administración",
    minPlan: "grupo",
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
    minPlan: "profesional",
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
  return (
    planLevel(module.minPlan) <= planLevel(plan) &&
    (!module.maxPlan || planLevel(plan) <= planLevel(module.maxPlan))
  );
}

export const PLAN_HIGHLIGHTS: Record<PlanId, string[]> = {
  inicial: [
    "Agenda",
    "Pacientes",
    "Historia clínica",
    "Odontograma 2D (básico)",
    "Recetas",
    "Estudios y diagnóstico",
    "Tratamientos",
    "Equipo",
    "Notificaciones",
    "Finanzas y facturación básica",
    "Configuración",
  ],
  profesional: [
    "Todo lo anterior",
    "Odontograma 2D completo",
    "Comunicación",
    "Presupuestos",
    "Laboratorio",
    "Portal del paciente",
    "Analítica y reportes",
    "Integraciones básicas",
  ],
  avanzada: [
    "Todo lo anterior",
    "Odontograma 3D",
    "Marketing y captación",
    "Inventario",
    "Equipo y RRHH",
    "IA Esther",
    "Automatizaciones",
  ],
  grupo: [
    "Todo lo anterior",
    "Odontograma 3D avanzado",
    "Multi-clínica",
    "Multiempresa",
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
  /** true cuando hay una empresa con plan contratado: el plan no se puede cambiar.
   *  false en el demo (sin sesión), donde se pueden probar todos los planes. */
  planContratado: boolean;
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
  // Arranca igual en servidor y cliente ("avanzada") y después de montar lee el plan
  // guardado de la empresa de la sesión; se vuelve a leer si cambia la sesión.
  const [plan, setPlanState] = useState<PlanId>("avanzada");
  const tenant = useTenantActual();
  useEffect(() => {
    setPlanState(getStoredPlan());
  }, [tenant]);
  const [clinic, setClinic] = useState("centro");
  const [role] = useState("admin");
  const [disabled] = useState<string[]>([]);

  // Demo (sin sesión): se puede cambiar de plan para conocerlos.
  // Empresa registrada: el plan es el contratado y no se cambia desde la app.
  const planContratado = tenant !== TENANT_DEMO;
  const setPlan = (p: PlanId) => {
    if (planContratado) return;
    setPlanState(p);
    setStoredPlan(p);
  };

  return (
    <CloudEstherContext.Provider
      value={{
        plan,
        setPlan,
        planContratado,
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