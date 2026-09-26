import { useEffect, useState } from "react";

export type SidebarColor =
  | "violeta"
  | "azul"
  | "verde"
  | "amarillo"
  | "rojo"
  | "rosa"
  | "naranja"
  | "gris";

export const SIDEBAR_COLORS: { id: SidebarColor; label: string; hex: string }[] = [
  { id: "violeta", label: "Violeta", hex: "#7c3aed" },
  { id: "azul", label: "Azul", hex: "#2563eb" },
  { id: "verde", label: "Verde", hex: "#16a34a" },
  { id: "amarillo", label: "Amarillo", hex: "#eab308" },
  { id: "rojo", label: "Rojo", hex: "#dc2626" },
  { id: "rosa", label: "Rosa", hex: "#db2777" },
  { id: "naranja", label: "Naranja", hex: "#ea580c" },
  { id: "gris", label: "Gris oscuro", hex: "#475569" },
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

export interface ClinicSettings {
  darkModePage: boolean;
  darkModeSidebar: boolean;
  sidebarColor: SidebarColor;
  fontSize: FontSize;
  aiEnabled: boolean;
  notificationsEnabled: boolean;
  advancedSecurityEnabled: boolean;
  auditLogEnabled: boolean;
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
};

function clave(clinicId: string) {
  return `cloud-esther:settings:${clinicId}`;
}

const EVENTO_CAMBIO = "cloud-esther-settings-changed";

export function cargarSettings(clinicId: string): ClinicSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(clave(clinicId));
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function guardarSettings(clinicId: string, settings: ClinicSettings) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(clave(clinicId), JSON.stringify(settings));
  window.dispatchEvent(new CustomEvent(EVENTO_CAMBIO, { detail: { clinicId } }));
}

/** Hook para leer los settings de una clínica y reaccionar cuando cambian
 *  (incluso desde otro componente, como la página de Configuración). */
export function useClinicSettings(clinicId: string): ClinicSettings {
  const [settings, setSettings] = useState<ClinicSettings>(() => cargarSettings(clinicId));

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
  }, [clinicId]);

  return settings;
}