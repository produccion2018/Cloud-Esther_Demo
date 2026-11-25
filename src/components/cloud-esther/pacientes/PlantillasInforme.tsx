import { useCloudEstherOpcional } from "@/lib/cloud-esther/data";
import { useClinicaReal } from "@/lib/clinica/modo-clinica";
import {
  cargarSettings,
  guardarSettings,
  useClinicSettings,
  type PlantillaInforme,
} from "@/lib/cloud-esther/settings-store";

/* Ubicación: src/components/cloud-esther/pacientes/PlantillasInforme.tsx

   PLANTILLAS PARA INFORMAR ESTUDIOS: un toque y el informe queda escrito (se edita lo que haga
   falta). Vienen plantillas base por tipo de estudio y la clínica puede guardar las suyas
   (en una clínica real, el administrador). «{pieza}» se reemplaza por la pieza del estudio. */

type Base = { nombre: string; texto: string };

const BASE: { re: RegExp; plantillas: Base[] }[] = [
  {
    re: /periapical/i,
    plantillas: [
      { nombre: "Sin hallazgos", texto: "Pieza {pieza}: corona y raíz sin alteraciones. Espacio periodontal y lámina dura conservados. Región periapical sin imágenes compatibles con lesión." },
      { nombre: "Lesión periapical", texto: "Pieza {pieza}: imagen radiolúcida periapical de límites difusos, compatible con lesión periapical. Se sugiere evaluar vitalidad pulpar y tratamiento endodóntico." },
      { nombre: "Caries profunda", texto: "Pieza {pieza}: imagen radiolúcida coronaria de gran extensión, próxima a cámara pulpar, compatible con caries profunda. Región periapical sin lesión aparente." },
      { nombre: "Control de endodoncia", texto: "Pieza {pieza}: tratamiento endodóntico con obturación homogénea, a nivel del límite apical. Región periapical sin lesión / en reparación." },
      { nombre: "Conductometría", texto: "Pieza {pieza}: limas en conductos. Longitud de trabajo establecida a ___ mm de la referencia." },
    ],
  },
  {
    re: /panor/i,
    plantillas: [
      { nombre: "Sin hallazgos", texto: "Estructuras óseas maxilares y mandibulares sin alteraciones. Senos maxilares y articulaciones temporomandibulares sin particularidades. Sin hallazgos de relevancia." },
      { nombre: "Terceros molares", texto: "Terceros molares retenidos: ___. Relación con el conducto dentario inferior: ___. Se sugiere evaluación quirúrgica." },
      { nombre: "Pérdida ósea", texto: "Pérdida ósea horizontal generalizada, compatible con enfermedad periodontal. Se sugiere evaluación periodontal completa." },
      { nombre: "Planificación", texto: "Piezas ausentes: ___. Disponibilidad ósea aparente en zona ___. Se sugiere tomografía para planificación." },
    ],
  },
  {
    re: /bitewing|aleta/i,
    plantillas: [
      { nombre: "Sin caries", texto: "Sin imágenes compatibles con caries interproximales. Crestas óseas conservadas." },
      { nombre: "Caries interproximal", texto: "Imagen radiolúcida interproximal en pieza {pieza}, compatible con caries. Crestas óseas conservadas." },
      { nombre: "Cálculo / pérdida ósea", texto: "Depósitos de cálculo interproximal y pérdida ósea horizontal incipiente." },
    ],
  },
  {
    re: /tomograf|cbct/i,
    plantillas: [
      { nombre: "Evaluación para implante", texto: "Zona {pieza}: altura ósea ___ mm, espesor ___ mm. Distancia a estructuras nobles ___ mm. Densidad ósea ___. Apto para implante de ___ x ___ mm." },
      { nombre: "Lesión", texto: "Pieza {pieza}: imagen hipodensa de ___ mm en relación con el ápice. Corticales ___. Se sugiere ___." },
      { nombre: "Tercer molar", texto: "Tercer molar ___: relación con el conducto dentario inferior ___. Corticales ___." },
    ],
  },
  {
    re: /cefalom/i,
    plantillas: [
      { nombre: "Análisis cefalométrico", texto: "Clase esqueletal ___. Patrón de crecimiento ___. Inclinación de incisivos superiores ___ e inferiores ___. Perfil ___." },
    ],
  },
  {
    re: /oclusal/i,
    plantillas: [
      { nombre: "Sin hallazgos", texto: "Sin alteraciones en la zona evaluada." },
      { nombre: "Pieza retenida", texto: "Pieza retenida en posición ___. Relación con piezas vecinas ___." },
    ],
  },
  {
    re: /fotograf/i,
    plantillas: [
      { nombre: "Registro inicial", texto: "Registro fotográfico inicial para seguimiento del tratamiento." },
      { nombre: "Control", texto: "Registro fotográfico de control. Evolución ___." },
    ],
  },
];

const GENERICAS: Base[] = [
  { nombre: "Sin hallazgos", texto: "Sin hallazgos de relevancia." },
  { nombre: "Para controlar", texto: "Hallazgos: ___. Se sugiere control en ___." },
];

export function plantillasBase(tipo: string): Base[] {
  return BASE.find((b) => b.re.test(tipo))?.plantillas ?? GENERICAS;
}

/** Completa la plantilla con la pieza del estudio (si no hay pieza, queda para completar). */
export function completarPlantilla(texto: string, pieza?: string): string {
  return texto.replaceAll("{pieza}", pieza?.trim() || "___");
}

export function usePlantillasInforme(tipo: string) {
  const ctx = useCloudEstherOpcional();
  const clinicId = ctx?.clinic ?? "demo";
  const settings = useClinicSettings(clinicId);
  const real = useClinicaReal();
  const propias = (settings.plantillasInforme ?? []).filter((p) => p.tipo === tipo);
  const puedeGuardar = !real || real.rol === "admin";
  const guardar = (nombre: string, texto: string) => {
    const actual = cargarSettings(clinicId);
    const nueva: PlantillaInforme = { id: `pi-${Date.now().toString(36)}`, tipo, nombre: nombre.trim().slice(0, 40), texto };
    guardarSettings(clinicId, { ...actual, plantillasInforme: [...(actual.plantillasInforme ?? []), nueva] });
  };
  const borrar = (id: string) => {
    const actual = cargarSettings(clinicId);
    guardarSettings(clinicId, { ...actual, plantillasInforme: (actual.plantillasInforme ?? []).filter((p) => p.id !== id) });
  };
  return { base: plantillasBase(tipo), propias, guardar, borrar, puedeGuardar };
}
