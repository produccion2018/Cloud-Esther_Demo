/* Ubicación: src/lib/contratacion.ts
   Solicitudes de contratación del sitio público («Contratar servicio»). Es DISTINTO del demo
   gratis: acá la clínica pide contratar (va a pagar).
   Con servidor (VITE_ADMIN_API_URL): se manda a POST /contratacion; llega al panel del equipo
   (Clínicas) y se avisa por correo al Dueño, al Socio y a la Secretaría. Después de revisar y
   cobrar, el Dueño o el Socio aprietan «Activar».
   Sin servidor: se guarda en este navegador para que el flujo se pueda recorrer. */

import { mapSitePlanToPlanId } from "@/lib/cloud-esther/data";

const API_URL = (import.meta.env["VITE_ADMIN_API_URL"] as string | undefined)?.replace(/\/$/, "");
export const CONTRATACION_EN_SERVIDOR = Boolean(API_URL);

export type SolicitudContratacion = {
  /** id del plan en el sitio (esencial, profesional, avanzado, enterprise) */
  plan: string;
  /** nombre visible del plan (Start, Pro, Plus, Enterprise) */
  planNombre: string;
  modulos: string[];
  periodo: "Mensual" | "Anual";
  clinica: string;
  /** código del país (AR, CL, CO, PE, EC, VE, MX, ES) */
  pais: string;
  ciudad: string;
  sucursales: string;
  profesionales: string;
  contacto: string;
  email: string;
  telefono: string;
  comentarios: string;
  /** campo trampa para robots (las personas no lo ven) */
  web: string;
};

export type SolicitudGuardada = { email: string; planNombre: string; modulos: number };

const CLAVE = "cloud-esther:contrataciones";
const SIN_CONEXION = "No pudimos enviar la solicitud. Probá de nuevo en unos segundos.";

export async function enviarSolicitudContratacion(
  datos: SolicitudContratacion,
): Promise<{ ok: true; solicitud: SolicitudGuardada } | { ok: false; error: string }> {
  const solicitud: SolicitudGuardada = {
    email: datos.email.trim().toLowerCase(),
    planNombre: datos.planNombre,
    modulos: datos.modulos.length,
  };

  if (CONTRATACION_EN_SERVIDOR) {
    try {
      const r = await fetch(`${API_URL}/contratacion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: datos.contacto,
          email: datos.email,
          telefono: datos.telefono,
          clinica: datos.clinica,
          pais: datos.pais,
          ...(datos.ciudad.trim() ? { ciudad: datos.ciudad } : {}),
          plan: mapSitePlanToPlanId(datos.plan),
          ciclo: datos.periodo === "Anual" ? "anual" : "mensual",
          modulos: datos.modulos,
          ...(datos.sucursales ? { sucursales: datos.sucursales } : {}),
          ...(datos.profesionales ? { profesionales: datos.profesionales } : {}),
          ...(datos.comentarios.trim() ? { comentarios: datos.comentarios } : {}),
          ...(datos.web ? { web: datos.web } : {}),
        }),
      });
      if (!r.ok) return { ok: false, error: (await r.text().catch(() => "")) || SIN_CONEXION };
      return { ok: true, solicitud };
    } catch {
      return { ok: false, error: SIN_CONEXION };
    }
  }

  // Sin servidor: queda en este navegador
  await new Promise((r) => setTimeout(r, 700));
  try {
    const previas = JSON.parse(localStorage.getItem(CLAVE) ?? "[]") as unknown[];
    const { web: _web, ...guardar } = datos;
    localStorage.setItem(
      CLAVE,
      JSON.stringify([{ ...guardar, fecha: new Date().toISOString() }, ...previas].slice(0, 20)),
    );
  } catch {
    /* sin almacenamiento: el flujo sigue igual */
  }
  return { ok: true, solicitud };
}
