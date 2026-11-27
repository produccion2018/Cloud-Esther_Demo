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

/** ¿El paciente pidió no recibir recordatorios? (se marca en su ficha o con su enlace) */
export function noQuiereRecordatorios(nombreCompleto: string): boolean {
  const p = leerPacientes().find(
    (x) => `${x.nombre} ${x.apellido}`.trim().toLowerCase() === nombreCompleto.trim().toLowerCase(),
  );
  return p?.aceptaRecordatorios === false;
}

/* PAÍS DE LA CLÍNICA para los teléfonos: los pacientes se cargan como se usa en cada país
   ("011 15 4444-5555", "099 123 456"…) y WhatsApp necesita el código de país. Lo fija el
   AppShell con el país de la clínica (multiempresa y multipaís). */
let paisTelefonos = "AR";
export function fijarPaisTelefonos(pais: string) {
  paisTelefonos = (pais || "AR").toUpperCase();
}

/** Código telefónico de cada país donde trabaja Cloud Esther */
export const CODIGO_PAIS: Record<string, string> = {
  AR: "54", UY: "598", CL: "56", CO: "57", PE: "51", EC: "593", VE: "58", MX: "52", ES: "34",
  BO: "591", PY: "595", CR: "506", PA: "507", GT: "502", SV: "503", HN: "504", NI: "505",
  DO: "1", PR: "1", CU: "53", US: "1",
};

/** Teléfono internacional (solo dígitos, con código de país). Igual que en el servidor. */
export function telefonoInternacional(telefono: string, pais = paisTelefonos): string {
  const crudo = (telefono ?? "").trim();
  let n = crudo.replace(/\D/g, "");
  if (!n) return "";
  if (crudo.startsWith("+")) return n;
  if (n.startsWith("00")) return n.slice(2);
  const p = pais.toUpperCase();
  const cc = CODIGO_PAIS[p] ?? "";
  if (!cc) return n;
  if (n.startsWith(cc) && n.length >= cc.length + 8) {
    if (p === "AR" && !n.startsWith("549") && n.length === 12) return `549${n.slice(2)}`;
    return n;
  }
  n = n.replace(/^0+/, "");
  if (p === "AR") {
    if (n.length === 12) {
      for (const area of [2, 3, 4]) {
        if (n.slice(area, area + 2) === "15") {
          n = n.slice(0, area) + n.slice(area + 2);
          break;
        }
      }
    }
    if (n.startsWith("9") && n.length === 11) n = n.slice(1);
    return `549${n}`;
  }
  return `${cc}${n}`;
}

/** Número para wa.me (internacional, según el país de la clínica). null si no alcanza para ser un teléfono. */
export function numeroWhatsApp(telefono: string | null | undefined): string | null {
  const n = telefonoInternacional(telefono ?? "");
  return n.length >= 10 ? n : null;
}

export function textoRecordatorioTurno(
  t: { paciente: string; fecha: string; hora: string; odontologo?: string; tratamiento?: string },
  clinica: string,
  enlace?: string | null,
) {
  const nombre = t.paciente.split(" ")[0] ?? t.paciente;
  const con = t.odontologo ? ` con ${t.odontologo}` : "";
  const pedido = enlace
    ? `Confirmalo, pedí cambiarlo o avisanos si no podés venir desde acá:\n${enlace}`
    : "¿Nos confirmás tu asistencia? Respondé SÍ para confirmar o escribinos si necesitás cambiarlo.";
  return `Hola ${nombre} 👋 Te recordamos tu turno ${fechaAmigable(t.fecha)} a las ${t.hora} hs${con} en ${clinica}. ${pedido}`;
}

/** Abre WhatsApp con el recordatorio (con el enlace para confirmar, si se puede crear).
    Devuelve false si el paciente no tiene teléfono. */
export function abrirRecordatorioWhatsApp(
  t: { id?: number; paciente: string; fecha: string; hora: string; odontologo?: string; tratamiento?: string },
  clinica: string,
): boolean {
  const numero = numeroWhatsApp(telefonoDePaciente(t.paciente));
  if (!numero) return false;
  const armar = (enlace: string | null) =>
    `https://wa.me/${numero}?text=${encodeURIComponent(textoRecordatorioTurno(t, clinica, enlace))}`;
  if (!t.id) {
    window.open(armar(null), "_blank", "noopener,noreferrer");
    return true;
  }
  // La ventana se abre YA (si no, el celular la bloquea) y el enlace se completa en un instante
  const ventana = window.open("", "_blank");
  void import("@/lib/clinica/enlace-estudio")
    .then(({ crearEnlaceTurno }) => crearEnlaceTurno(t.id!))
    .catch(() => null)
    .then((enlace) => {
      const url = armar(enlace);
      if (ventana && !ventana.closed) {
        ventana.opener = null;
        ventana.location.href = url;
      } else window.open(url, "_blank", "noopener,noreferrer");
    });
  return true;
}

/** Abre WhatsApp con el pedido de opinión después del turno (enlace a la encuesta de 1 a 5).
    Devuelve false si el paciente no tiene teléfono. */
export function abrirEncuestaWhatsApp(t: { id: number; paciente: string }, clinica: string): boolean {
  const numero = numeroWhatsApp(telefonoDePaciente(t.paciente));
  if (!numero) return false;
  const nombre = t.paciente.split(" ")[0] ?? t.paciente;
  const armar = (enlace: string | null) =>
    `https://wa.me/${numero}?text=${encodeURIComponent(
      enlace
        ? `Hola ${nombre} 👋 ¡Gracias por venir a ${clinica}! ¿Nos contás cómo te atendimos? Es un toque:\n${enlace}`
        : `Hola ${nombre} 👋 ¡Gracias por venir a ${clinica}! ¿Cómo te atendimos? Contanos del 1 al 5 respondiendo este mensaje.`,
    )}`;
  const ventana = window.open("", "_blank");
  void import("@/lib/clinica/enlace-estudio")
    .then(({ crearEnlaceTurno }) => crearEnlaceTurno(t.id, "encuesta"))
    .catch(() => null)
    .then((enlace) => {
      const url = armar(enlace);
      if (ventana && !ventana.closed) {
        ventana.opener = null;
        ventana.location.href = url;
      } else window.open(url, "_blank", "noopener,noreferrer");
    });
  return true;
}

/** Avisa al paciente que su profesional no va a estar ese día y le ofrece pasar el turno
    (con el enlace para pedir el cambio, si se puede crear). Devuelve false si no tiene teléfono. */
export function abrirAvisoAusenciaWhatsApp(
  t: { id: number; paciente: string; fecha: string; hora: string },
  clinica: string,
  profesional: string,
  /** Si otro profesional cubre el turno: el turno sigue en pie con él/ella */
  cubre?: string,
): boolean {
  const numero = numeroWhatsApp(telefonoDePaciente(t.paciente));
  if (!numero) return false;
  const nombre = t.paciente.split(" ")[0] ?? t.paciente;
  const dia = t.fecha.split("-").reverse().slice(0, 2).join("/");
  const armar = (enlace: string | null) =>
    `https://wa.me/${numero}?text=${encodeURIComponent(
      (cubre
        ? `Hola ${nombre} 👋 Te escribimos de ${clinica}. ${profesional} no va a estar el ${dia}: tu turno de las ${t.hora} sigue en pie y te va a atender ${cubre}.` +
          (enlace ? ` Si preferís confirmarlo o cambiarlo, hacelo acá:\n${enlace}` : " Si preferís cambiarlo, respondé este mensaje.")
        : `Hola ${nombre} 👋 Te escribimos de ${clinica}. ${profesional} no va a poder atender el ${dia} y tenías turno a las ${t.hora}. ¿Te lo pasamos a otro día?` +
          (enlace ? ` Avisanos acá y te buscamos otro horario:\n${enlace}` : " Respondé este mensaje y te buscamos otro horario.")),
    )}`;
  const ventana = window.open("", "_blank");
  void import("@/lib/clinica/enlace-estudio")
    .then(({ crearEnlaceTurno }) => crearEnlaceTurno(t.id))
    .catch(() => null)
    .then((enlace) => {
      const url = armar(enlace);
      if (ventana && !ventana.closed) {
        ventana.opener = null;
        ventana.location.href = url;
      } else window.open(url, "_blank", "noopener,noreferrer");
    });
  return true;
}
