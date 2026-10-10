import { useEffect, useState } from "react";
import { tenantActual, useTenantActual } from "@/lib/cloud-esther/tenant-store";

export type SidebarColor =
  | "violeta"
  | "azul"
  | "verde"
  | "amarillo"
  | "rojo"
  | "rosa"
  | "naranja"
  | "gris"
  | "blanco"
  | "negro";

export const SIDEBAR_COLORS: { id: SidebarColor; label: string; hex: string }[] = [
  { id: "violeta", label: "Violeta", hex: "#7c3aed" },
  { id: "azul", label: "Azul", hex: "#2563eb" },
  { id: "verde", label: "Verde", hex: "#16a34a" },
  { id: "amarillo", label: "Amarillo", hex: "#eab308" },
  { id: "rojo", label: "Rojo", hex: "#dc2626" },
  { id: "rosa", label: "Rosa", hex: "#db2777" },
  { id: "naranja", label: "Naranja", hex: "#ea580c" },
  { id: "gris", label: "Gris oscuro", hex: "#475569" },
  { id: "blanco", label: "Blanco", hex: "#ffffff" },
  { id: "negro", label: "Negro", hex: "#000000" },
];

export type FontSize = "sm" | "md" | "lg";

export const FONT_SIZES: { id: FontSize; label: string }[] = [
  { id: "sm", label: "Pequeño" },
  { id: "md", label: "Mediano" },
  { id: "lg", label: "Grande" },
];

export const FONT_SIZE_PX: Record<FontSize, string> = {
  sm: "14px",
  md: "16px",
  lg: "18px",
};

/** Datos de la clínica (por empresa). Vacíos hasta que la clínica los complete.
 *  TODO backend: GET/PUT /clinicas/:id (el país debe ser uno de los «países seleccionados»). */
export interface DatosClinica {
  nombre: string;
  identificacionFiscal: string;
  direccion: string;
  telefono: string;
  email: string;
  /** Código ISO del país (AR, UY, CL…). */
  pais: string;
}

export const DATOS_CLINICA_VACIOS: DatosClinica = {
  nombre: "",
  identificacionFiscal: "",
  direccion: "",
  telefono: "",
  email: "",
  pais: "",
};

export interface ClinicSettings {
  darkModePage: boolean;
  darkModeSidebar: boolean;
  sidebarColor: SidebarColor;
  fontSize: FontSize;
  aiEnabled: boolean;
  notificationsEnabled: boolean;
  advancedSecurityEnabled: boolean;
  auditLogEnabled: boolean;
  /** Días que se conservan los registros de auditoría. */
  auditRetentionDays: number;
  datosClinica: DatosClinica;
}

export const DEFAULT_SETTINGS: ClinicSettings = {
  darkModePage: false,
  darkModeSidebar: false,
  sidebarColor: "violeta",
  fontSize: "md",
  aiEnabled: true,
  notificationsEnabled: true,
  advancedSecurityEnabled: false,
  auditLogEnabled: true,
  auditRetentionDays: 365,
  datosClinica: DATOS_CLINICA_VACIOS,
};

/* Los ajustes (colores, modo oscuro, etc.) se guardan por empresa de la sesión:
   lo que configura una clínica nunca cambia la apariencia de otra. */
function clave(clinicId: string) {
  return `cloud-esther:settings:${tenantActual()}:${clinicId}`;
}

const EVENTO_CAMBIO = "cloud-esther-settings-changed";

/**
 * Publica el color del sidebar en <html> para que el CSS
 * (sidebar-colors.css) pinte el sidebar real con el color elegido.
 */
function aplicarSidebarAlDocumento(settings: ClinicSettings) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.dataset.sidebarColor = settings.sidebarColor;
  root.dataset.sidebarDark = settings.darkModeSidebar ? "true" : "false";
}

export function cargarSettings(clinicId: string): ClinicSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(clave(clinicId));
    if (!raw) return DEFAULT_SETTINGS;
    const guardados = JSON.parse(raw) as Partial<ClinicSettings>;
    return {
      ...DEFAULT_SETTINGS,
      ...guardados,
      datosClinica: { ...DATOS_CLINICA_VACIOS, ...(guardados.datosClinica ?? {}) },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function guardarSettings(clinicId: string, settings: ClinicSettings) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(clave(clinicId), JSON.stringify(settings));
  } catch {
    /* almacenamiento no disponible: se ignora */
  }
  aplicarSidebarAlDocumento(settings);
  window.dispatchEvent(new CustomEvent(EVENTO_CAMBIO, { detail: { clinicId } }));
}

/** Hook para leer los settings de una clínica y reaccionar cuando cambian
 *  (incluso desde otro componente, como la página de Configuración). */
export function useClinicSettings(clinicId: string): ClinicSettings {
  const [settings, setSettings] = useState<ClinicSettings>(DEFAULT_SETTINGS);
  const tenant = useTenantActual();

  useEffect(() => {
    setSettings(cargarSettings(clinicId));

    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ clinicId: string }>).detail;
      if (!detail || detail.clinicId === clinicId) {
        setSettings(cargarSettings(clinicId));
      }
    };

    window.addEventListener(EVENTO_CAMBIO, handler);
    return () => window.removeEventListener(EVENTO_CAMBIO, handler);
  }, [clinicId, tenant]);

  // Mantiene el color del sidebar aplicado en <html> al cargar y al cambiar.
  useEffect(() => {
    aplicarSidebarAlDocumento(settings);
  }, [settings]);

  return settings;
}
