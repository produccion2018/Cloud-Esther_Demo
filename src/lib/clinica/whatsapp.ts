import { leerPacientes } from "@/lib/cloud-esther/pacientes";

/* Ubicación: src/lib/clinica/whatsapp.ts
   RECORDATORIO DE TURNO POR WHATSAPP (todos los planes, también Start y Pro).
   Con un toque se abre el WhatsApp de la clínica con el mensaje ya escrito para el paciente:
   la clínica lo envía desde su propio número. (El envío automático, sin tocar nada, necesita
   conectar WhatsApp Business oficial: es otra etapa.) */

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

function fechaAmigable(iso: string) {
  const [a, m, d] = iso.split("-").map(Number);
  const fecha = new Date(a ?? 2000, (m ?? 1) - 1, d ?? 1);
  const hoy = new Date();
  const manana = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1);
  if (fecha.toDateString() === hoy.toDateString()) return "hoy";
  if (fecha.toDateString() === manana.toDateString()) return "mañana";
  return `el ${DIAS[fecha.getDay()]} ${d}/${m}`;
}

/** Teléfono del paciente (por su nombre completo, como figura en el turno) */
export function telefonoDePaciente(nombreCompleto: string): string | null {
  const p = leerPacientes().find(
    (x) => `${x.nombre} ${x.apellido}`.trim().toLowerCase() === nombreCompleto.trim().toLowerCase(),
  );
  return p?.telefono?.trim() || null;
}

/** Número para wa.me (solo dígitos, con código de país). null si no alcanza para ser un teléfono. */
export function numeroWhatsApp(telefono: string | null | undefined): string | null {
  const n = (telefono ?? "").replace(/\D/g, "");
  return n.length >= 8 ? n : null;
}

export function textoRecordatorioTurno(
  t: { paciente: string; fecha: string; hora: string; odontologo?: string; tratamiento?: string },
  clinica: string,
) {
  const nombre = t.paciente.split(" ")[0] ?? t.paciente;
  const con = t.odontologo ? ` con ${t.odontologo}` : "";
  return `Hola ${nombre} 👋 Te recordamos tu turno ${fechaAmigable(t.fecha)} a las ${t.hora} hs${con} en ${clinica}. ¿Nos confirmás tu asistencia? Respondé SÍ para confirmar o escribinos si necesitás cambiarlo.`;
}

/** Abre WhatsApp con el recordatorio. Devuelve false si el paciente no tiene teléfono. */
export function abrirRecordatorioWhatsApp(
  t: { paciente: string; fecha: string; hora: string; odontologo?: string; tratamiento?: string },
  clinica: string,
): boolean {
  const numero = numeroWhatsApp(telefonoDePaciente(t.paciente));
  if (!numero) return false;
  const url = `https://wa.me/${numero}?text=${encodeURIComponent(textoRecordatorioTurno(t, clinica))}`;
  window.open(url, "_blank", "noopener,noreferrer");
  return true;
}
