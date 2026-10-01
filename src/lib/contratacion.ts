/* Ubicación: src/lib/contratacion.ts
   Solicitudes de contratación del sitio público. En esta etapa se guardan en el navegador
   para que el flujo sea completo; el backend las recibirá y las mostrará en el panel
   administrativo. TODO backend: POST /contrataciones (y aviso al equipo comercial). */

export type SolicitudContratacion = {
  plan: string;
  modulos: string[];
  periodo: "Mensual" | "Anual";
  clinica: string;
  pais: string;
  sucursales: string;
  profesionales: string;
  contacto: string;
  email: string;
  telefono: string;
  comentarios: string;
};

export type SolicitudGuardada = SolicitudContratacion & { id: string; fecha: string };

const CLAVE = "cloud-esther:contrataciones";

export async function enviarSolicitudContratacion(
  datos: SolicitudContratacion,
): Promise<SolicitudGuardada> {
  await new Promise((r) => setTimeout(r, 700));
  const guardada: SolicitudGuardada = {
    ...datos,
    id: `CT-${Date.now().toString().slice(-6)}`,
    fecha: new Date().toISOString(),
  };
  try {
    const previas = JSON.parse(localStorage.getItem(CLAVE) ?? "[]") as SolicitudGuardada[];
    localStorage.setItem(CLAVE, JSON.stringify([guardada, ...previas].slice(0, 20)));
  } catch {
    /* sin almacenamiento: el flujo sigue igual */
  }
  return guardada;
}
