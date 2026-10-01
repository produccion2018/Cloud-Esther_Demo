import { crearStorePorEmpresa } from "@/lib/cloud-esther/tenant-store";

/* Ubicación: src/lib/cloud-esther/simulador-sonrisa.ts
   Simulador de Sonrisa con IA (odontología digital).

   Separación clara entre la interfaz de prueba y la futura conexión real:
   - SERVICIO_IA_CONECTADO = false: todavía NO hay un modelo de IA que genere simulaciones.
     Con fotos reales del paciente se puede cargar, revisar y guardar la foto, pero la
     generación responde «servicio no conectado» (no se inventa un resultado).
   - Caso de demostración: una ilustración preparada para el demo, con propuestas dibujadas
     para cada tratamiento. Se presenta siempre como «Caso de demostración».
   TODO backend: POST /ia/simulaciones-sonrisa { fotoId, tratamientos } con el token del
   tenant; consentimiento del paciente y permisos por rol antes de procesar la imagen. */

export const SERVICIO_IA_CONECTADO = false;

export type TratamientoEstetico =
  "blanqueamiento" | "carillas" | "diseno" | "alineacion" | "forma" | "restauraciones";

export const TRATAMIENTOS_ESTETICOS: Record<
  TratamientoEstetico,
  { nombre: string; detalle: string; paciente: string }
> = {
  blanqueamiento: {
    nombre: "Blanqueamiento dental",
    detalle: "Aclara el tono de los dientes.",
    paciente: "aclarar el tono de tus dientes",
  },
  carillas: {
    nombre: "Carillas dentales",
    detalle: "Color y forma uniformes en el sector anterior.",
    paciente: "emparejar color y forma de los dientes frontales",
  },
  diseno: {
    nombre: "Diseño de sonrisa",
    detalle: "Combina color, forma, alineación y restauraciones.",
    paciente: "armonizar color, forma y proporciones de la sonrisa",
  },
  alineacion: {
    nombre: "Corrección de alineación",
    detalle: "Vista de dientes alineados (ortodoncia o alineadores).",
    paciente: "ver tus dientes alineados",
  },
  forma: {
    nombre: "Forma y proporción",
    detalle: "Ajusta largo y ancho de las piezas para equilibrar la sonrisa.",
    paciente: "equilibrar la forma y la proporción de tus dientes",
  },
  restauraciones: {
    nombre: "Restauraciones estéticas",
    detalle: "Reemplaza zonas dañadas o con caries por resina del color del diente.",
    paciente: "restaurar las zonas dañadas con material del color del diente",
  },
};

export type Propuesta = { tratamientos: TratamientoEstetico[]; titulo: string; url: string };

export type OrigenFoto = "demo" | "paciente";

export class ServicioIANoDisponible extends Error {
  constructor() {
    super(
      "El servicio de IA Esther para simulaciones todavía no está conectado. La foto se puede guardar en la historia clínica y la simulación se generará cuando el servicio esté activo.",
    );
    this.name = "ServicioIANoDisponible";
  }
}

/* ───────────── Caso de demostración (ilustración) ───────────── */

type Correcciones = {
  color: "natural" | "blanco" | "carilla";
  alineado: boolean;
  forma: boolean;
  restaurado: boolean;
};

function correccionesDe(ts: TratamientoEstetico[]): Correcciones {
  const tiene = (t: TratamientoEstetico) => ts.includes(t) || ts.includes("diseno");
  return {
    color: tiene("carillas") ? "carilla" : tiene("blanqueamiento") ? "blanco" : "natural",
    alineado: tiene("alineacion"),
    forma: tiene("forma") || tiene("carillas"),
    restaurado: tiene("restauraciones") || tiene("carillas"),
  };
}

/** Dibuja la sonrisa del caso de demostración con las correcciones pedidas. */
function dibujarCaso(c: Correcciones): string {
  const cv = document.createElement("canvas");
  cv.width = 760;
  cv.height = 520;
  const g = cv.getContext("2d");
  if (!g) return "";
  // Piel y fondo
  const piel = g.createRadialGradient(380, 260, 60, 380, 260, 520);
  piel.addColorStop(0, "#efc6a6");
  piel.addColorStop(1, "#c98f6c");
  g.fillStyle = piel;
  g.fillRect(0, 0, 760, 520);
  // Labios
  g.fillStyle = "#b85a5f";
  g.beginPath();
  g.ellipse(380, 270, 250, 118, 0, 0, Math.PI * 2);
  g.fill();
  // Interior de la boca
  g.fillStyle = "#4a1820";
  g.beginPath();
  g.ellipse(380, 272, 222, 92, 0, 0, Math.PI * 2);
  g.fill();
  // Encía superior
  g.fillStyle = "#d9737c";
  g.beginPath();
  g.ellipse(380, 205, 205, 34, 0, 0, Math.PI);
  g.fill();

  const tono =
    c.color === "carilla"
      ? () => "#fbfaf6"
      : c.color === "blanco"
        ? (i: number) => (i % 3 === 0 ? "#f5f2e8" : "#f8f5ec")
        : (i: number) => ["#e3cf9c", "#e8d6a6", "#ecdcad", "#efe0b3"][i % 4] ?? "#e8d6a6";
  // Anchos desparejos (forma) vs proporción armónica
  const anchosBase = [34, 40, 44, 58, 52, 44, 37, 33];
  const anchosArm = [34, 39, 46, 56, 56, 46, 39, 34];
  const anchos = c.forma ? anchosArm : anchosBase;
  const largosBase = [52, 60, 66, 70, 78, 63, 58, 50];
  const largosArm = [52, 60, 68, 76, 76, 68, 60, 52];
  const largos = c.forma ? largosArm : largosBase;
  const giros = c.alineado
    ? [0, 0, 0, 0, 0, 0, 0, 0]
    : [0.06, -0.05, 0.1, -0.04, 0.08, -0.12, 0.05, -0.03];
  const desv = c.alineado ? [0, 0, 0, 0, 0, 0, 0, 0] : [3, -4, 6, 0, -5, 7, -2, 4];

  const total = anchos.reduce((a, b) => a + b + 3, 0);
  let x = 380 - total / 2;
  anchos.forEach((w, i) => {
    const h = largos[i] ?? 60;
    g.save();
    g.translate(x + w / 2, 212 + (desv[i] ?? 0));
    g.rotate(giros[i] ?? 0);
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, tono(i));
    grad.addColorStop(1, c.color === "natural" ? "#d8c08a" : "#ece8dc");
    g.fillStyle = grad;
    g.beginPath();
    g.roundRect(-w / 2, 0, w, h, [5, 5, 14, 14]);
    g.fill();
    // Brillo (más marcado con carillas)
    g.fillStyle = `rgba(255,255,255,${c.color === "carilla" ? 0.5 : 0.22})`;
    g.beginPath();
    g.roundRect(-w / 2 + 6, 6, w * 0.22, h * 0.55, 6);
    g.fill();
    // Zona dañada / caries y borde astillado (se restauran)
    if (!c.restaurado && i === 2) {
      g.fillStyle = "#7a5a32";
      g.beginPath();
      g.ellipse(4, h * 0.62, 7, 6, 0, 0, Math.PI * 2);
      g.fill();
    }
    if (!c.restaurado && i === 5) {
      g.fillStyle = "#4a1820";
      g.beginPath();
      g.moveTo(w / 2, h - 18);
      g.lineTo(w / 2 - 14, h);
      g.lineTo(w / 2, h);
      g.fill();
    }
    g.restore();
    x += w + 3;
  });
  // Dientes inferiores (apenas visibles)
  for (let i = 0; i < 8; i++) {
    g.fillStyle = c.color === "natural" ? "#d6c08e" : "#efebe0";
    g.beginPath();
    g.roundRect(236 + i * 36, 316, 33, 26, [10, 10, 4, 4]);
    g.fill();
  }
  // Marca de agua
  g.fillStyle = "rgba(255,255,255,0.85)";
  g.font = "600 15px Inter, system-ui, sans-serif";
  g.fillText("Caso de demostración · ilustración", 22, 498);
  return cv.toDataURL("image/jpeg", 0.88);
}

export function fotoCasoDemo(): string {
  return dibujarCaso({ color: "natural", alineado: false, forma: false, restaurado: false });
}

/* ───────────── Generación ───────────── */

/** Genera las propuestas: una por tratamiento elegido y, si hay más de uno, la combinada. */
export async function generarSimulacion(opciones: {
  origen: OrigenFoto;
  foto: string;
  tratamientos: TratamientoEstetico[];
}): Promise<Propuesta[]> {
  await new Promise((r) => setTimeout(r, 1400));
  if (opciones.origen === "paciente" && !SERVICIO_IA_CONECTADO) throw new ServicioIANoDisponible();
  // TODO backend: con SERVICIO_IA_CONECTADO, enviar la foto al servicio y devolver sus imágenes.
  const lista: Propuesta[] = opciones.tratamientos.map((t) => ({
    tratamientos: [t],
    titulo: TRATAMIENTOS_ESTETICOS[t].nombre,
    url: dibujarCaso(correccionesDe([t])),
  }));
  if (opciones.tratamientos.length > 1 && !opciones.tratamientos.includes("diseno"))
    lista.push({
      tratamientos: opciones.tratamientos,
      titulo: "Propuesta combinada",
      url: dibujarCaso(correccionesDe(opciones.tratamientos)),
    });
  return lista;
}

/* ───────────── Historial por empresa ───────────── */

export type SimulacionGuardada = {
  id: string;
  fecha: string; // ISO
  pacienteId: number;
  profesional: string;
  origen: OrigenFoto;
  foto: string;
  propuestas: Propuesta[];
  estado: "Guardada" | "Presentada al paciente";
  consentimiento: boolean;
  nota: string;
};

export const storeSimulador = crearStorePorEmpresa<{ simulaciones: SimulacionGuardada[] }>(
  () => ({ simulaciones: [] }),
  { persistir: "simulador-sonrisa" },
);

export function guardarSimulacion(s: SimulacionGuardada) {
  const e = storeSimulador.leer();
  storeSimulador.poner({
    simulaciones: [s, ...e.simulaciones.filter((x) => x.id !== s.id)].slice(0, 30),
  });
}

export function actualizarSimulacion(id: string, cambio: Partial<SimulacionGuardada>) {
  const e = storeSimulador.leer();
  storeSimulador.poner({
    simulaciones: e.simulaciones.map((x) => (x.id === id ? { ...x, ...cambio } : x)),
  });
}

export function eliminarSimulacion(id: string) {
  const e = storeSimulador.leer();
  storeSimulador.poner({ simulaciones: e.simulaciones.filter((x) => x.id !== id) });
}
