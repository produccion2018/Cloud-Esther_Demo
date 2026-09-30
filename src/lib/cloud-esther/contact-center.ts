/* Ubicación: src/lib/cloud-esther/contact-center.ts
   Contact Center con IA: atiende a pacientes por WhatsApp, webchat o correo. Identifica al
   paciente, consulta la agenda real, propone horarios libres, registra el turno, confirma,
   cancela o reprograma, responde preguntas frecuentes y el estado de presupuestos.
   Si no puede resolver algo (o es una urgencia), DERIVA A UNA PERSONA.
   TODO backend: webhooks de WhatsApp Business / correo → este flujo en el servidor, y en
   Enterprise, n8n para recordatorios y seguimientos automáticos. */

import {
  storeAgenda,
  setTurnosStore,
  ODONTOLOGOS,
  SUCURSALES,
  type Turno,
} from "@/lib/cloud-esther/agenda-store";
import { leerPacientes, type Paciente } from "@/lib/cloud-esther/pacientes";
import { leerRegistros } from "@/components/cloud-esther/PacienteSecciones";
import { storeEquipo } from "@/lib/cloud-esther/equipo-store";
import { norm } from "@/lib/cloud-esther/esther-motor";
import type { ConversacionCC, MensajeCC } from "@/lib/cloud-esther/ia-store";

export type EstadoDialogo = {
  paso: "inicio" | "identificar" | "motivo" | "horario" | "cancelar" | "nombre" | "derivada";
  pacienteId: number | null;
  nombreNuevo: string;
  intencion: "turno" | "cancelar" | "reprogramar" | "confirmar" | "presupuesto" | "";
  motivo: string;
  opciones: { fecha: string; hora: string; profesional: string; sucursal: string }[];
  turnoId: number | null;
  fallos: number;
};

export const DIALOGO_INICIAL: EstadoDialogo = {
  paso: "inicio",
  pacienteId: null,
  nombreNuevo: "",
  intencion: "",
  motivo: "",
  opciones: [],
  turnoId: null,
  fallos: 0,
};

export type Resultado = {
  respuestas: { texto: string; opciones?: string[] }[];
  estado: EstadoDialogo;
  conversacion: Partial<Pick<ConversacionCC, "estado" | "intencion" | "pacienteId">>;
};

const HORARIOS =
  "Atendemos de lunes a viernes de 8 a 20 h y los sábados de 9 a 13 h (sábados solo en Clínica Centro).";
const DIRECCIONES: Record<string, string> = {
  "Clínica Centro": "Av. Santa Fe 1234, CABA",
  "Clínica Norte": "Av. Cabildo 2100, CABA",
  "Clínica Sur": "Av. Mitre 850, Avellaneda",
};
const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

function iso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function legible(fecha: string, hora: string) {
  const d = new Date(`${fecha}T12:00:00`);
  return `${DIAS[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1} a las ${hora}`;
}
const nombre = (p: Paciente) => `${p.nombre} ${p.apellido}`;

function profesionales() {
  const eq = storeEquipo
    .leer()
    .miembros.filter((m) => m.role === "odontologo" && m.status !== "inactivo")
    .map((m) => `${m.firstName} ${m.lastName}`.trim());
  return eq.length ? eq : ODONTOLOGOS;
}

/** Horarios libres reales: días hábiles, cada 30 min, sin superponer con turnos del profesional. */
export function horariosLibres(sucursal: string, cantidad = 3, desdeDias = 1) {
  const turnos = storeAgenda.leer().turnos.filter((t) => t.estado !== "Cancelada");
  const profs = profesionales();
  const libres: EstadoDialogo["opciones"] = [];
  const ahora = new Date();
  for (let d = desdeDias; d < 21 && libres.length < cantidad; d++) {
    const dia = new Date(ahora);
    dia.setDate(ahora.getDate() + d);
    const dow = dia.getDay();
    if (dow === 0 || (dow === 6 && sucursal !== SUCURSALES[0])) continue;
    const f = iso(dia);
    const horas =
      dow === 6
        ? ["09:00", "10:30", "12:00"]
        : ["09:00", "10:30", "11:30", "15:00", "16:30", "18:00"];
    for (const h of horas) {
      const prof = profs[(d + horas.indexOf(h)) % profs.length] ?? "Odontólogo/a";
      const ocupado = turnos.some(
        (t) => t.fecha === f && t.hora === h && (t.odontologo === prof || t.sucursal === sucursal),
      );
      if (!ocupado) {
        libres.push({ fecha: f, hora: h, profesional: prof, sucursal });
        break; // uno por día para dar variedad
      }
    }
  }
  return libres;
}

function buscarPaciente(q: string): Paciente | undefined {
  const pacs = leerPacientes();
  const dni = q.match(/\b\d{7,8}\b/)?.[0];
  if (dni) return pacs.find((p) => p.documento === dni);
  return pacs.find((p) => q.includes(norm(nombre(p))));
}
function proximoTurno(p: Paciente | undefined, nombreLibre: string): Turno | undefined {
  const hoy = iso(new Date());
  const n = norm(p ? nombre(p) : nombreLibre);
  return storeAgenda
    .leer()
    .turnos.filter(
      (t) =>
        norm(t.paciente) === n &&
        t.fecha >= hoy &&
        t.estado !== "Cancelada" &&
        t.estado !== "Atendida",
    )
    .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora))[0];
}

function motivoDe(q: string) {
  if (/limpieza/.test(q)) return "Limpieza dental";
  if (/control/.test(q)) return "Control";
  if (/blanque/.test(q)) return "Blanqueamiento";
  if (/implante/.test(q)) return "Evaluación de implante";
  if (/ortodon|brackets|alineador/.test(q)) return "Control de ortodoncia";
  if (/dolor|urgencia|muela/.test(q)) return "Urgencia";
  if (/extrac|sacar (una|la) muela/.test(q)) return "Extracción";
  return "";
}

function ofrecer(e: EstadoDialogo, pac: Paciente | undefined): Resultado {
  const sede = pac?.sucursal || SUCURSALES[0] || "Clínica Centro";
  const opciones = horariosLibres(sede);
  return {
    respuestas: [
      {
        texto: opciones.length
          ? `Tengo estos horarios en ${sede} para ${e.motivo || "tu consulta"}:\n${opciones.map((o, i) => `${i + 1}. ${legible(o.fecha, o.hora)} con ${o.profesional}`).join("\n")}\n¿Cuál te queda mejor?`
          : "No encuentro horarios libres en las próximas semanas. Te paso con recepción para buscar una alternativa.",
        opciones: opciones.map((o, i) => `${i + 1}. ${legible(o.fecha, o.hora)}`),
      },
    ],
    estado: { ...e, paso: opciones.length ? "horario" : "derivada", opciones },
    conversacion: opciones.length ? {} : { estado: "Derivada a humano" },
  };
}

function derivar(e: EstadoDialogo, motivo: string, urgente = false): Resultado {
  return {
    respuestas: [
      {
        texto: urgente
          ? "Entiendo, eso requiere atención. Ya le aviso a recepción con prioridad para que te contacten enseguida. Si el dolor es muy fuerte o hay hinchazón con fiebre, acercate a la guardia más cercana."
          : `Te paso con una persona del equipo para ${motivo}. En breve te responden por este mismo canal.`,
      },
    ],
    estado: { ...e, paso: "derivada" },
    conversacion: { estado: "Derivada a humano", intencion: urgente ? "Urgencia" : "Derivación" },
  };
}

/** Procesa un mensaje del paciente y devuelve las respuestas de Esther. */
export function responderPaciente(texto: string, e0: EstadoDialogo): Resultado {
  const q = norm(texto);
  let e = { ...e0 };
  if (e.paso === "derivada")
    return {
      respuestas: [{ texto: "Ya avisé al equipo; una persona te va a responder en breve." }],
      estado: e,
      conversacion: {},
    };

  // Siempre prioritario: urgencias y pedido de hablar con alguien.
  if (/dolor fuerte|mucho dolor|urgencia|sangr|hinchad|hinchazon|accidente|se me rompio/.test(q))
    return derivar(e, "una urgencia", true);
  if (/humano|persona|operador|recepcion|hablar con alguien|secretaria/.test(q))
    return derivar(e, "seguir tu consulta");

  const pac = e.pacienteId ? leerPacientes().find((p) => p.id === e.pacienteId) : buscarPaciente(q);
  if (pac && !e.pacienteId) e = { ...e, pacienteId: pac.id };

  // Elegir horario ofrecido
  if (e.paso === "horario") {
    const n = Number(
      q.match(/^\s*(\d)/)?.[1] ??
        (/primer/.test(q) ? 1 : /segund/.test(q) ? 2 : /tercer/.test(q) ? 3 : 0),
    );
    const op =
      e.opciones[n - 1] ??
      e.opciones.find((o) => q.includes(o.hora.replace(":00", "")) || q.includes(o.hora));
    if (!op) {
      if (/otro|ninguno|no me sirve|otra/.test(q)) return derivar(e, "buscar otro horario");
      return {
        respuestas: [
          {
            texto: "Decime el número de la opción (1, 2 o 3) o escribí «otro horario».",
            opciones: e.opciones.map((o, i) => `${i + 1}. ${legible(o.fecha, o.hora)}`),
          },
        ],
        estado: e,
        conversacion: {},
      };
    }
    const quien = pac ? nombre(pac) : e.nombreNuevo || "Paciente nuevo";
    const id = Date.now();
    const nuevo: Turno = {
      id,
      fecha: op.fecha,
      hora: op.hora,
      paciente: quien,
      tratamiento: e.motivo || (pac ? "Control" : "Primera consulta"),
      odontologo: op.profesional,
      sucursal: op.sucursal,
      gabinete: "Gabinete 1",
      estado: "Confirmada",
      notas: "Agendado por Esther (Contact Center IA)",
    };
    // Reprogramar: se cancela el turno anterior.
    setTurnosStore((prev) => [
      ...prev.map((t) =>
        e.intencion === "reprogramar" && t.id === e.turnoId
          ? {
              ...t,
              estado: "Cancelada" as const,
              notas: `${t.notas} Reprogramado por Esther`.trim(),
            }
          : t,
      ),
      nuevo,
    ]);
    return {
      respuestas: [
        {
          texto: `¡Listo, ${quien.split(" ")[0]}! Te agendé para el ${legible(op.fecha, op.hora)} con ${op.profesional} en ${op.sucursal} (${DIRECCIONES[op.sucursal] ?? ""}). Te vamos a mandar un recordatorio el día anterior. Si necesitás cambiarlo, escribime por acá.`,
        },
      ],
      estado: { ...DIALOGO_INICIAL, pacienteId: e.pacienteId },
      conversacion: {
        estado: "Resuelta por IA",
        intencion: e.intencion === "reprogramar" ? "Reprogramación" : "Turno nuevo",
        pacienteId: e.pacienteId,
      },
    };
  }

  if (e.paso === "cancelar") {
    if (/^(si|sí|dale|ok|confirmo|cancelalo|cancela)/.test(q)) {
      setTurnosStore((prev) =>
        prev.map((t) =>
          t.id === e.turnoId
            ? {
                ...t,
                estado: "Cancelada",
                notas: `${t.notas} Cancelado por el paciente vía Esther`.trim(),
              }
            : t,
        ),
      );
      return {
        respuestas: [
          {
            texto: "Listo, cancelé tu turno. ¿Querés que te busque otro horario?",
            opciones: ["Sí, otro horario", "No, gracias"],
          },
        ],
        estado: { ...DIALOGO_INICIAL, pacienteId: e.pacienteId, intencion: "turno" },
        conversacion: { estado: "Resuelta por IA", intencion: "Cancelación" },
      };
    }
    return {
      respuestas: [{ texto: "Perfecto, tu turno sigue en pie." }],
      estado: { ...DIALOGO_INICIAL, pacienteId: e.pacienteId },
      conversacion: { estado: "Resuelta por IA", intencion: "Consulta de turno" },
    };
  }

  if (e.paso === "nombre") {
    const n = texto.trim().replace(/^(soy|me llamo)\s+/i, "");
    if (n.split(/\s+/).length < 2)
      return {
        respuestas: [{ texto: "¿Me pasás nombre y apellido?" }],
        estado: e,
        conversacion: {},
      };
    e = {
      ...e,
      nombreNuevo: n.toLocaleLowerCase("es").replace(/(^|\s)\p{L}/gu, (c) => c.toUpperCase()),
      motivo: e.motivo || "Primera consulta",
    };
    return ofrecer(e, undefined);
  }

  // Intenciones
  const intencion: EstadoDialogo["intencion"] = /cancel|no voy a poder|no puedo ir/.test(q)
    ? "cancelar"
    : /reprogram|cambiar (el|mi) turno|mover (el|mi) turno|otro dia/.test(q)
      ? "reprogramar"
      : /confirm/.test(q)
        ? "confirmar"
        : /presupuesto/.test(q)
          ? "presupuesto"
          : /turno|cita|reservar|sacar|agendar|consulta|atenderme|si, otro horario/.test(q)
            ? "turno"
            : e.intencion;

  // Preguntas frecuentes (no necesitan identificar)
  if (!intencion) {
    if (/horario|atienden|abren|cierran|sabado/.test(q))
      return {
        respuestas: [
          {
            texto: `${HORARIOS} ¿Querés que te reserve un turno?`,
            opciones: ["Sí, quiero un turno"],
          },
        ],
        estado: e,
        conversacion: { intencion: "Horarios", estado: "Resuelta por IA" },
      };
    if (/donde|direccion|ubicad|como llego/.test(q))
      return {
        respuestas: [
          {
            texto: Object.entries(DIRECCIONES)
              .map(([s, d]) => `• ${s}: ${d}`)
              .join("\n"),
          },
        ],
        estado: e,
        conversacion: { intencion: "Ubicación", estado: "Resuelta por IA" },
      };
    if (/obra social|prepaga|cubren|osde|swiss|galeno|ioma|pami/.test(q))
      return {
        respuestas: [
          {
            texto:
              "Trabajamos con OSDE, Swiss Medical, Galeno, Medifé, IOMA y PAMI, y también atendemos de forma particular. La cobertura exacta depende de tu plan: traé la credencial a la consulta.",
          },
        ],
        estado: e,
        conversacion: { intencion: "Coberturas", estado: "Resuelta por IA" },
      };
    if (/precio|cuanto (sale|cuesta)|valor|arancel/.test(q))
      return {
        respuestas: [
          {
            texto:
              "El valor depende del tratamiento que necesites, y eso lo define el profesional en la consulta. Te puedo agendar una primera consulta para evaluarte y armarte el presupuesto. ¿Te busco un horario?",
            opciones: ["Sí, quiero un turno"],
          },
        ],
        estado: { ...e, intencion: "turno", motivo: "Primera consulta" },
        conversacion: { intencion: "Precios" },
      };
    if (/^(hola|buen(as|os)|que tal)/.test(q))
      return {
        respuestas: [
          {
            texto:
              "¡Hola! Soy Esther, la asistente de la clínica. Puedo darte un turno, confirmar, cancelar o cambiar el que tenés, contarte los horarios o el estado de tu presupuesto. ¿En qué te ayudo?",
            opciones: [
              "Quiero un turno",
              "Confirmar mi turno",
              "Cancelar mi turno",
              "Estado de mi presupuesto",
            ],
          },
        ],
        estado: e,
        conversacion: {},
      };
    if (/gracias|chau|nada mas/.test(q))
      return {
        respuestas: [{ texto: "¡Gracias a vos! Cualquier cosa, escribime por acá." }],
        estado: { ...DIALOGO_INICIAL, pacienteId: e.pacienteId },
        conversacion: { estado: "Resuelta por IA" },
      };
    const fallos = e.fallos + 1;
    if (fallos >= 2) return derivar({ ...e, fallos }, "ayudarte mejor");
    return {
      respuestas: [
        {
          texto:
            "No te entendí bien. Puedo darte un turno, confirmar, cancelar o reprogramar el que tenés, o contarte horarios y coberturas.",
          opciones: ["Quiero un turno", "Cancelar mi turno", "Horarios"],
        },
      ],
      estado: { ...e, fallos },
      conversacion: {},
    };
  }

  e = { ...e, intencion, motivo: e.motivo || motivoDe(q) };
  const p = e.pacienteId ? leerPacientes().find((x) => x.id === e.pacienteId) : undefined;
  if (!p && intencion !== "turno")
    return {
      respuestas: [
        { texto: "Para buscar tu información necesito identificarte: ¿me pasás tu DNI?" },
      ],
      estado: { ...e, paso: "identificar" },
      conversacion: {},
    };
  if (!p && intencion === "turno") {
    if (e.paso === "identificar" && /no (soy|tengo)|nuevo|primera vez|nunca/.test(q))
      return {
        respuestas: [{ texto: "¡Bienvenido/a! ¿Me decís tu nombre y apellido?" }],
        estado: { ...e, paso: "nombre" },
        conversacion: { intencion: "Paciente nuevo" },
      };
    if (e.paso === "identificar" && /\d{7,8}/.test(q))
      return {
        respuestas: [
          {
            texto:
              "No encuentro ese DNI entre nuestros pacientes. Si es tu primera vez, decime nombre y apellido y te agendo una primera consulta.",
          },
        ],
        estado: { ...e, paso: "nombre" },
        conversacion: {},
      };
    return {
      respuestas: [
        {
          texto: "¡Dale! ¿Ya sos paciente de la clínica? Pasame tu DNI, o escribí «soy nuevo».",
          opciones: ["Soy nuevo"],
        },
      ],
      estado: { ...e, paso: "identificar" },
      conversacion: { intencion: "Turno nuevo" },
    };
  }
  const pac2 = p!;
  const saludo = `Gracias, ${pac2.nombre}.`;
  if (intencion === "presupuesto") {
    const pres = (leerRegistros()[pac2.id]?.presupuestos ?? []).filter(
      (x) => x.estado !== "Borrador",
    );
    return {
      respuestas: [
        {
          texto: pres.length
            ? `${saludo} Estos son tus presupuestos:\n${pres.map((x) => `• ${x.numero}: ${x.estado.toLowerCase()}${x.estado === "Enviado" ? " (esperando tu respuesta)" : ""}`).join("\n")}\nSi querés aprobar uno o tenés dudas, te paso con recepción.`
            : `${saludo} No tenés presupuestos pendientes.`,
          ...(pres.some((x) => x.estado === "Enviado")
            ? { opciones: ["Quiero aprobarlo", "Tengo una duda"] }
            : {}),
        },
      ],
      estado: { ...e, paso: "inicio", intencion: "" },
      conversacion: {
        intencion: "Estado de presupuesto",
        estado: "Resuelta por IA",
        pacienteId: pac2.id,
      },
    };
  }
  const t = proximoTurno(pac2, "");
  if (intencion === "confirmar") {
    if (!t)
      return {
        respuestas: [
          {
            texto: `${saludo} No veo turnos próximos a tu nombre. ¿Querés reservar uno?`,
            opciones: ["Sí, quiero un turno"],
          },
        ],
        estado: { ...e, intencion: "turno" },
        conversacion: {},
      };
    setTurnosStore((prev) => prev.map((x) => (x.id === t.id ? { ...x, estado: "Confirmada" } : x)));
    return {
      respuestas: [
        {
          texto: `${saludo} Confirmé tu turno del ${legible(t.fecha, t.hora)} con ${t.odontologo} en ${t.sucursal}. ¡Te esperamos!`,
        },
      ],
      estado: { ...DIALOGO_INICIAL, pacienteId: pac2.id },
      conversacion: { intencion: "Confirmación", estado: "Resuelta por IA", pacienteId: pac2.id },
    };
  }
  if (intencion === "cancelar") {
    if (!t)
      return {
        respuestas: [{ texto: `${saludo} No tenés turnos próximos para cancelar.` }],
        estado: { ...DIALOGO_INICIAL, pacienteId: pac2.id },
        conversacion: { estado: "Resuelta por IA" },
      };
    return {
      respuestas: [
        {
          texto: `${saludo} Tenés turno el ${legible(t.fecha, t.hora)} con ${t.odontologo}. ¿Lo cancelo?`,
          opciones: ["Sí, cancelalo", "No, lo mantengo"],
        },
      ],
      estado: { ...e, paso: "cancelar", turnoId: t.id },
      conversacion: { intencion: "Cancelación", pacienteId: pac2.id },
    };
  }
  if (intencion === "reprogramar") {
    if (!t) return ofrecer({ ...e, intencion: "turno" }, pac2);
    const r = ofrecer({ ...e, turnoId: t.id, motivo: e.motivo || t.tratamiento }, pac2);
    r.respuestas.unshift({
      texto: `${saludo} Tu turno actual es el ${legible(t.fecha, t.hora)}. Te busco otro horario:`,
    });
    r.conversacion = { ...r.conversacion, intencion: "Reprogramación", pacienteId: pac2.id };
    return r;
  }
  if (t && e.paso !== "horario" && !/otro|nuevo|otra/.test(q)) {
    const r = ofrecer(e, pac2);
    r.respuestas.unshift({
      texto: `${saludo} Ya tenés un turno el ${legible(t.fecha, t.hora)}. Si igual querés otro, elegí una opción:`,
    });
    r.conversacion = { ...r.conversacion, pacienteId: pac2.id, intencion: "Turno nuevo" };
    return r;
  }
  const r = ofrecer(e, pac2);
  r.respuestas.unshift({ texto: saludo });
  r.conversacion = { ...r.conversacion, pacienteId: pac2.id, intencion: "Turno nuevo" };
  return r;
}

/** Conversaciones de ejemplo para practicar (se muestran la primera vez). */
export function conversacionesEjemplo(): ConversacionCC[] {
  const h = (min: number) => new Date(Date.now() - min * 60_000).toISOString();
  const m = (de: MensajeCC["de"], texto: string, min: number): MensajeCC => ({
    de,
    texto,
    fecha: h(min),
  });
  return [
    {
      id: "cc1",
      canal: "WhatsApp",
      contacto: "+54 9 11 5566-7788",
      pacienteId: 2,
      inicio: h(95),
      estado: "Resuelta por IA",
      intencion: "Confirmación",
      mensajes: [
        m("paciente", "Hola, quiero confirmar mi turno", 95),
        m("esther", "Para buscar tu información necesito identificarte: ¿me pasás tu DNI?", 94),
        m("paciente", "Soy Julián Ortega", 93),
        m("esther", "Gracias, Julián. Confirmé tu turno. ¡Te esperamos!", 93),
      ],
    },
    {
      id: "cc2",
      canal: "Webchat",
      contacto: "Visitante del sitio",
      pacienteId: null,
      inicio: h(40),
      estado: "Derivada a humano",
      intencion: "Urgencia",
      mensajes: [
        m("paciente", "Hola, tengo mucho dolor en una muela y se me hinchó la cara", 40),
        m(
          "esther",
          "Entiendo, eso requiere atención. Ya le aviso a recepción con prioridad para que te contacten enseguida.",
          40,
        ),
      ],
    },
    {
      id: "cc3",
      canal: "WhatsApp",
      contacto: "+54 9 11 4433-2211",
      pacienteId: 4,
      inicio: h(12),
      estado: "Resuelta por IA",
      intencion: "Estado de presupuesto",
      mensajes: [
        m("paciente", "Hola! Quería saber en qué quedó mi presupuesto", 12),
        m("esther", "Para buscar tu información necesito identificarte: ¿me pasás tu DNI?", 12),
        m("paciente", "Lucía Paz", 11),
        m(
          "esther",
          "Gracias, Lucía. Estos son tus presupuestos: PR-0005 enviado (esperando tu respuesta).",
          11,
        ),
      ],
    },
  ];
}
