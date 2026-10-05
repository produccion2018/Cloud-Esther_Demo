import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { registrarPlanDemo } from "@/lib/cloud-esther/demo-seguimiento";
import { claveTenant, TENANT_DEMO, useTenantActual } from "@/lib/cloud-esther/tenant-store";
import { modulosExtra } from "@/lib/cloud-esther/modulos-extra-store";
import { useSesion } from "@/lib/cloud-esther/auth-store";
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
};

export const PLANS: Record<PlanId, PlanInfo> = {
  inicial: {
    id: "inicial",
    name: "Start",
    level: 1,
    audience: "Odontólogo independiente",
  },
  profesional: {
    id: "profesional",
    name: "Pro",
    level: 2,
    audience: "Clínica en crecimiento",
  },
  avanzada: {
    id: "avanzada",
    name: "Plus",
    level: 3,
    audience: "Clínica integral",
  },
  grupo: {
    id: "grupo",
    name: "Enterprise",
    level: 4,
    audience: "Multi-sede",
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
  return (
    value === "inicial" || value === "profesional" || value === "avanzada" || value === "grupo"
  );
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
  "Clínico" | "Operación" | "Administración" | "Inteligencia" | "Organización" | "Sistema";

export interface AppModule {
  id: string;
  label: string;
  icon: string;
  path: string;
  group: ModuleGroup;
  minPlan: PlanId;
  /** Último plan que lo muestra (ej. el 2D deja de verse cuando el plan ya tiene 3D). */
  maxPlan?: PlanId;
  /** Nombre visible distinto según el plan (sin palabras como «básico» o «avanzado»). */
  labelPorPlan?: Partial<Record<PlanId, string>>;
}

/** Nombre del módulo que se muestra para ese plan. */
export function etiquetaModulo(m: AppModule, plan: PlanId) {
  return m.labelPorPlan?.[plan] ?? m.label;
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
    // Regla comercial: el 2D es de Start y Pro; Plus y Enterprise usan directamente el 3D.
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
    labelPorPlan: { inicial: "Estudios clínicos" },
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
    minPlan: "avanzada",
  },
  {
    id: "portal-paciente",
    label: "Portal del paciente",
    icon: "portal-paciente",
    path: "/demo/portal-paciente",
    group: "Operación",
    minPlan: "grupo",
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
    label: "Pagos y facturación",
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
    minPlan: "avanzada",
  },
  {
    id: "bi",
    label: "Analítica y reportes",
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

/** ¿El plan incluye el módulo? (sin contar módulos adicionales comprados). */
export function incluidoEnPlan(module: AppModule, plan: PlanId) {
  return (
    planLevel(module.minPlan) <= planLevel(plan) &&
    (!module.maxPlan || planLevel(plan) <= planLevel(module.maxPlan))
  );
}

/** Módulos que el plan no incluye y se pueden comprar como adicionales (Start, Pro y Plus). */
export function comprableEn(module: AppModule, plan: PlanId) {
  // Los odontogramas no se compran: el plan define cuál se usa (2D en Start/Pro, 3D en Plus/Enterprise).
  if (module.id === "odontograma" || module.id === "odontograma3d") return false;
  return planLevel(module.minPlan) > planLevel(plan);
}

/** ¿Está disponible para la empresa? Plan contratado + módulos adicionales comprados. */
export function availableIn(module: AppModule, plan: PlanId) {
  const extras = modulosExtra();
  return incluidoEnPlan(module, plan) || (comprableEn(module, plan) && extras.includes(module.id));
}

export const PLAN_HIGHLIGHTS: Record<PlanId, string[]> = {
  inicial: [
    "Agenda y turnos",
    "Pacientes",
    "Historia clínica",
    "Odontograma 2D",
    "Recetas y tratamientos",
    "Equipo: integrantes, especialidades y horarios",
    "Estudios clínicos",
    "Laboratorio",
    "Comunicación",
    "Notificaciones",
    "Configuración con modo oscuro",
  ],
  profesional: [
    "Todo lo de Start",
    "Odontograma 2D con más herramientas",
    "Comunicación con pacientes",
    "Presupuestos",
    "Pagos y facturación",
    "Estudios y diagnóstico",
    "Laboratorio con seguimiento",
    "Analítica y reportes",
    "Documentos de la clínica",
    "Notificaciones con filtros y reglas",
    "Configuración: modo oscuro y color del menú",
    "Integraciones",
  ],
  avanzada: [
    "Todo lo anterior",
    "Odontograma 3D con rayos X y simulador de sonrisa",
    "Finanzas",
    "Marketing y captación",
    "Inventario",
    "Equipo y RRHH",
    "IA Esther",
  ],
  grupo: [
    "Todo lo anterior",
    "Odontograma 3D avanzado",
    "Portal del paciente y portal del profesional",
    "Automatizaciones con n8n",
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

export function ModuleIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? LayoutDashboard;
  return <Icon className={className} />;
}

interface CloudEstherContextValue {
  plan: PlanId;
  setPlan: (p: PlanId) => void;
  /** true cuando hay una empresa con plan contratado: el plan no se puede cambiar.
   *  false en el demo (sin sesión), donde se pueden probar todos los planes. */
  planContratado: boolean;
  /** true cuando ya se leyó el plan guardado de la empresa (después de montar). Hasta entonces
   *  el plan es provisorio y no se muestra nada que dependa de IA o audio. */
  planListo: boolean;
  clinic: string;
  setClinic: (c: string) => void;
  role: string;
  disabled: string[];
}

const CloudEstherContext = createContext<CloudEstherContextValue | null>(null);

export function CloudEstherProvider({ children }: { children: ReactNode }) {
  // Arranca igual en servidor y cliente ("avanzada") y después de montar lee el plan
  // guardado de la empresa de la sesión; se vuelve a leer si cambia la sesión.
  const [plan, setPlanState] = useState<PlanId>("avanzada");
  const tenant = useTenantActual();
  const [planListo, setPlanListo] = useState(false);
  useEffect(() => {
    setPlanState(getStoredPlan());
    setPlanListo(true);
  }, [tenant]);
  const [clinic, setClinic] = useState("centro");
  const [role] = useState("admin");
  const [disabled] = useState<string[]>([]);

  // Demo (sin sesión o cuenta creada desde «Probar demo»): se recorren los 4 planes libremente.
  // Solo una empresa con contratación real (tipo "cliente", la crea el backend) tiene el plan fijo.
  const { sesion } = useSesion();
  const planContratado = tenant !== TENANT_DEMO && sesion?.tipo === "cliente";
  const setPlan = (p: PlanId) => {
    if (planContratado) return;
    setPlanState(p);
    setStoredPlan(p);
    registrarPlanDemo(PLANS[p].name);
  };

  return (
    <CloudEstherContext.Provider
      value={{
        plan,
        setPlan,
        planContratado,
        planListo,
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

/** Como useCloudEsther, pero devuelve null fuera del proveedor (portales, pantallas públicas). */
export function useCloudEstherOpcional() {
  return useContext(CloudEstherContext);
}

export function useCloudEsther() {
  const ctx = useContext(CloudEstherContext);

  if (!ctx) {
    throw new Error("useCloudEsther must be used within CloudEstherProvider");
  }

  return ctx;
}
