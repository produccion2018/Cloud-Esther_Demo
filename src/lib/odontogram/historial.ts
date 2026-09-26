import type { ToothState } from "./fdi";

export interface HistorialEntry {
  id: string;
  fdi: number;
  estadoAnterior: ToothState;
  estadoNuevo: ToothState;
  fecha: string;
}

function claveHistorial(pacienteId: string) {
  return `cloud-esther:odontograma3d:historial:${pacienteId}`;
}

export function cargarHistorial(pacienteId: string): HistorialEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(claveHistorial(pacienteId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function registrarCambio(
  pacienteId: string,
  fdi: number,
  estadoAnterior: ToothState,
  estadoNuevo: ToothState,
) {
  if (typeof window === "undefined") return;
  if (estadoAnterior === estadoNuevo) return;
  const historial = cargarHistorial(pacienteId);
  const entrada: HistorialEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    fdi,
    estadoAnterior,
    estadoNuevo,
    fecha: new Date().toISOString(),
  };
  const next = [entrada, ...historial].slice(0, 200);
  window.localStorage.setItem(claveHistorial(pacienteId), JSON.stringify(next));
}

function claveTratamientos(pacienteId: string) {
  return `cloud-esther:odontograma3d:tratamientos:${pacienteId}`;
}

export function cargarTratamientos(pacienteId: string): Record<number, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(claveTratamientos(pacienteId));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function guardarTratamiento(pacienteId: string, fdi: number, texto: string) {
  if (typeof window === "undefined") return;
  const actuales = cargarTratamientos(pacienteId);
  const next = { ...actuales, [fdi]: texto };
  window.localStorage.setItem(claveTratamientos(pacienteId), JSON.stringify(next));
}