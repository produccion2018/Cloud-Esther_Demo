import { crearStorePorEmpresa } from "@/lib/cloud-esther/tenant-store";

/* Ubicación: src/lib/cloud-esther/ia-store.ts
   Datos de Cloud Esther IA por empresa: auditoría de consultas, análisis de imágenes,
   simulaciones de sonrisa y conversaciones del Contact Center.
   TODO backend: /ia/* con auditoría inmutable. */

export type RolIA = "admin" | "odontologo" | "secretaria" | "asistente";

export type ConsultaIA = {
  id: string;
  fecha: string; // ISO
  usuario: string;
  rol: RolIA;
  sede: string;
  pregunta: string;
  modulo: string;
  resultado: "Respondida" | "Sin permiso" | "Fuera del plan" | "Sin datos";
};

export type HallazgoImagen = {
  id: string;
  tipo: string;
  zona: string;
  pieza: string;
  confianza: number; // 0..1
  severidad: "Revisar" | "Moderado" | "Importante";
  x: number; // % del ancho
  y: number; // % del alto
  r: number; // % del ancho
};
export type AnalisisImagen = {
  id: string;
  fecha: string;
  pacienteId: number;
  tipo: "Radiografía panorámica" | "Radiografía periapical" | "Bite-wing" | "Fotografía intraoral";
  archivo: string;
  imagen: string; // data URL (reducida)
  hallazgos: HallazgoImagen[];
  informeProfesional: string;
  explicacionPaciente: string;
  revisadoPor: string;
  guardado: boolean;
};

export type SimulacionSonrisa = {
  id: string;
  fecha: string;
  pacienteId: number;
  tratamiento: string;
  intensidad: number;
  antes: string;
  despues: string;
  explicacion: string;
  guardada: boolean;
};

export type MensajeCC = {
  de: "paciente" | "esther" | "humano";
  texto: string;
  fecha: string;
  opciones?: string[];
};
export type ConversacionCC = {
  id: string;
  canal: "WhatsApp" | "Webchat" | "Correo";
  contacto: string;
  pacienteId: number | null;
  inicio: string;
  estado: "Resuelta por IA" | "Derivada a humano" | "En curso";
  intencion: string;
  mensajes: MensajeCC[];
};

export type EstadoIA = {
  consultas: ConsultaIA[];
  analisis: AnalisisImagen[];
  simulaciones: SimulacionSonrisa[];
  conversaciones: ConversacionCC[];
};

export const storeIA = crearStorePorEmpresa<EstadoIA>(
  () => ({ consultas: [], analisis: [], simulaciones: [], conversaciones: [] }),
  { persistir: "ia" },
);

export function setIA<K extends keyof EstadoIA>(clave: K, fn: (prev: EstadoIA[K]) => EstadoIA[K]) {
  const actual = storeIA.leer();
  storeIA.poner({ ...actual, [clave]: fn(actual[clave]) });
}

export function auditarConsulta(c: Omit<ConsultaIA, "id" | "fecha">) {
  setIA("consultas", (p) =>
    [{ ...c, id: `q-${Date.now()}-${p.length}`, fecha: new Date().toISOString() }, ...p].slice(
      0,
      300,
    ),
  );
}
