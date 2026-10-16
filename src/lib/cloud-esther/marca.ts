import { useCloudEstherOpcional } from "@/lib/cloud-esther/data";
import { MARCA_VACIA, useClinicSettings, type MarcaClinica } from "@/lib/cloud-esther/settings-store";

/* Ubicación: src/lib/cloud-esther/marca.ts
   MARCA PROPIA (white label) — planes Plus y Enterprise.
   La clínica sube su logo y elige su color; se muestran en el menú del sistema, en el portal del
   paciente y en los documentos (recetas, consentimientos, presupuestos…). Cada clínica ve SOLO
   la suya: la marca se guarda en la configuración de su empresa. */

export const PLANES_MARCA = new Set(["avanzada", "grupo"]);

export function useMarca(): {
  marca: MarcaClinica;
  /** Hay logo o color propio y el plan lo incluye */
  activa: boolean;
  /** El plan incluye marca propia (aunque todavía no se haya cargado) */
  disponible: boolean;
  nombre: string;
  direccion: string;
  telefono: string;
  email: string;
} {
  const ctx = useCloudEstherOpcional();
  const settings = useClinicSettings(ctx?.clinic ?? "demo");
  const disponible = !!ctx && PLANES_MARCA.has(ctx.plan);
  const marca = { ...MARCA_VACIA, ...(settings.marca ?? {}) };
  return {
    marca,
    activa: disponible && !!marca.logo,
    disponible,
    nombre: settings.datosClinica.nombre,
    direccion: settings.datosClinica.direccion,
    telefono: settings.datosClinica.telefono,
    email: settings.datosClinica.email,
  };
}

/** Membrete HTML para los documentos PDF (logo + datos de la clínica), o "" si no corresponde */
export function membreteHTML(m: ReturnType<typeof useMarca>, respaldo: string): string {
  const esc = (t: string) =>
    t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);
  const usar = m.activa && m.marca.enDocumentos;
  const nombre = m.nombre || respaldo;
  const color = usar ? m.marca.color : "#7c3aed";
  const datos = [m.direccion, m.telefono, m.email].filter(Boolean).map(esc).join(" · ");
  return `<div style="display:flex;align-items:center;gap:12px;border-bottom:3px solid ${color};padding-bottom:10px;margin-bottom:14px">
    ${usar ? `<img src="${m.marca.logo}" alt="" style="height:44px;max-width:120px;object-fit:contain"/>` : ""}
    <div><div style="font-size:15px;font-weight:700;color:${color}">${esc(nombre)}</div>${datos ? `<div style="font-size:9.5px;color:#6b6189">${datos}</div>` : ""}</div>
  </div>`;
}
