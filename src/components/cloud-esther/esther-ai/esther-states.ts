// Las 4 imágenes de Esther van en src/assets/ con exactamente estos nombres.
import restingUrl from "@/assets/esther-pose-resting.png";
import wavingUrl from "@/assets/esther-pose-waving.png";
import walkingUrl from "@/assets/esther-pose-walking.png";
import bendingUrl from "@/assets/esther-pose-bending.png";

export type EstherState =
  "idle" | "listening" | "thinking" | "processing" | "action" | "speaking" | "success" | "error";

export type EstherPose = "resting" | "waving" | "walking" | "bending";

/** alto: proporción de la altura del escenario (agachada se ve más baja que de pie). */
export const estherPoses: Record<EstherPose, { url: string; alt: string; alto: number }> = {
  resting: { url: restingUrl, alt: "Esther de pie, disponible", alto: 1 },
  waving: { url: wavingUrl, alt: "Esther saludando", alto: 1.04 },
  walking: { url: walkingUrl, alt: "Esther caminando con su maletín", alto: 0.98 },
  bending: { url: bendingUrl, alt: "Esther agachada con su maletín, revisando", alto: 0.9 },
};

export type EstherStateConfig = {
  pose: EstherPose;
  label: string;
  message: string;
  glow: number;
  particles: number;
  drift: number;
  dataFlow: boolean;
  scale: number;
  duration: number;
};

export const estherStates: Record<EstherState, EstherStateConfig> = {
  idle: {
    pose: "resting",
    label: "Disponible",
    message: "Estoy lista. Preguntame lo que necesites.",
    glow: 0.35,
    particles: 8,
    drift: 0.5,
    dataFlow: false,
    scale: 1,
    duration: 1600,
  },
  listening: {
    pose: "resting",
    label: "Escuchando",
    message: "Te estoy escuchando…",
    glow: 0.6,
    particles: 12,
    drift: 0.75,
    dataFlow: false,
    scale: 1.02,
    duration: 700,
  },
  thinking: {
    pose: "resting",
    label: "Pensando",
    message: "Déjame entender bien la consulta…",
    glow: 0.75,
    particles: 18,
    drift: 1.1,
    dataFlow: true,
    scale: 1.01,
    duration: 900,
  },
  processing: {
    pose: "walking",
    label: "Buscando",
    message: "Estoy buscando la información…",
    glow: 0.8,
    particles: 22,
    drift: 1.5,
    dataFlow: true,
    scale: 1.02,
    duration: 1200,
  },
  action: {
    pose: "bending",
    label: "Revisando",
    message: "Estoy revisando los registros…",
    glow: 0.9,
    particles: 24,
    drift: 1.7,
    dataFlow: true,
    scale: 1.02,
    duration: 1000,
  },
  speaking: {
    pose: "resting",
    label: "Hablando",
    message: "Te leo la respuesta…",
    glow: 0.55,
    particles: 10,
    drift: 0.6,
    dataFlow: false,
    scale: 1.01,
    duration: 1000,
  },
  success: {
    pose: "resting",
    label: "Listo",
    message: "Listo, acá tenés la respuesta.",
    glow: 0.5,
    particles: 10,
    drift: 0.6,
    dataFlow: false,
    scale: 1.01,
    duration: 1800,
  },
  error: {
    pose: "resting",
    label: "Revisión necesaria",
    message: "Encontré un problema. Voy a revisarlo.",
    glow: 0.45,
    particles: 9,
    drift: 0.4,
    dataFlow: false,
    scale: 0.99,
    duration: 2400,
  },
};

/* ───────────── Escena según la pregunta ─────────────
   Esther cambia de postura según lo que le piden: saluda, sale a buscar en la agenda o la
   administración, se agacha con el maletín para revisar la ficha clínica, o se queda
   atenta mientras piensa. */

export type Escena = {
  pose: EstherPose;
  label: string;
  message: string;
  saludo?: boolean;
};

const sinTildes = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

export function escenaPara(pregunta: string, paciente?: string): Escena {
  const q = sinTildes(pregunta);
  if (
    /^(hola|buen(os|as)? (dia|tarde|noche)s?|gracias|chau|adios|que tal|como estas)\b/.test(q) ||
    /quien sos|que podes hacer|que puedo consultarte|ayuda/.test(q)
  )
    return { pose: "waving", label: "Saludando", message: "¡Hola! Ya te ayudo.", saludo: true };
  if (/radiograf|imagen|foto|sonrisa/.test(q))
    return { pose: "bending", label: "Analizando la imagen", message: "Estoy mirando la imagen…" };
  if (/odontograma|\bpiezas?\b|\bdientes?\b|caries/.test(q))
    return {
      pose: "bending",
      label: "Revisando el odontograma",
      message: `Estoy revisando pieza por pieza${paciente ? ` de ${paciente}` : ""}…`,
    };
  if (/historia|antecedente|alergi|evolucion|resum/.test(q))
    return {
      pose: "bending",
      label: "Leyendo la historia clínica",
      message: `Estoy leyendo la historia clínica${paciente ? ` de ${paciente}` : ""}…`,
    };
  if (
    /paciente|consulta|tratamiento|diagnost|informe|receta/.test(q) &&
    !/pacientes (que|inactiv|nuevos)|cuantos pacientes/.test(q)
  )
    return {
      pose: "bending",
      label: "Revisando la ficha",
      message: `Estoy revisando la ficha${paciente ? ` de ${paciente}` : " del paciente"}…`,
    };
  if (/turno|cita|agenda|semana|manana|hoy|ausen|inactiv|no regresaron|volvieron/.test(q))
    return {
      pose: "walking",
      label: "Buscando en la agenda",
      message: "Voy a la agenda a buscarlo…",
    };
  if (/factur|cobr|presupuest|deud|pago|finanz|ingres|gasto|caja/.test(q))
    return {
      pose: "walking",
      label: "Consultando administración",
      message: "Estoy consultando facturación y presupuestos…",
    };
  if (/stock|insumo|inventario|proveedor/.test(q))
    return {
      pose: "walking",
      label: "Revisando inventario",
      message: "Estoy revisando el inventario…",
    };
  if (/equipo|usuario|rol|permiso|acceso|rrhh|emplead|sueldo|licencia|portal|clinica|sede/.test(q))
    return {
      pose: "walking",
      label: "Consultando el equipo",
      message: "Estoy consultando el equipo y los accesos…",
    };
  if (/reporte|analiz|pendiente|registro|resumen/.test(q))
    return {
      pose: "walking",
      label: "Analizando registros",
      message: "Estoy cruzando los registros de la clínica…",
    };
  return { pose: "resting", label: "Analizando", message: "Estoy analizando la consulta…" };
}
