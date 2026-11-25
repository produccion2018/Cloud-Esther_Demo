/* Ubicación: src/lib/cloud-esther/interacciones.ts

   Avisos al recetar según los antecedentes del paciente: enfermedades (embarazo, hipertensión,
   problemas renales…), la medicación que ya toma (anticoagulantes, antidepresivos…), hábitos
   (alcohol) y la edad. Son reglas fijas y conocidas (no usa IA), por eso funcionan en todos los
   planes. Son orientativas: el profesional decide. Un aviso «alto» pide confirmar antes de
   emitir la receta; uno de «precaución» solo informa. */

export type NivelAviso = "alto" | "precaucion";

export type AvisoInteraccion = {
  nivel: NivelAviso;
  /** Motivo corto (ej. «Toma anticoagulantes») */
  motivo: string;
  /** Qué puede pasar y qué conviene hacer */
  detalle: string;
};

export type DatosClinicos = {
  enfermedades?: string[];
  medicacion?: string;
  habitos?: string[];
  observaciones?: string;
  /** Edad en años (si se conoce) */
  edad?: number | null;
};

// Familias de medicamentos (por nombre de droga, en los nombres de todos los países)
const F = {
  aine: /ibuprof|diclof|ketorol|naprox|nimesul|etoricox|celecox|meloxic|piroxic|aspirin|acetilsalic|aine/i,
  coxib: /etoricox|celecox/i,
  corticoide: /dexametas|betametas|predniso|metilpredn|hidrocortis/i,
  metronidazol: /metronid/i,
  macrolidoCyp: /claritro|eritrom/i,
  tetraciclina: /doxicic|tetracic|minocic/i,
  tramadol: /tramad/i,
  benzo: /diazep|alpraz|clonazep|lorazep|midazol/i,
  paracetamol: /paracet|acetaminof/i,
  dipirona: /dipiron|metamiz/i,
};

// Lo que ya toma el paciente (texto libre de «medicación habitual»)
const TOMA = {
  anticoagulante: /warfar|acenocum|sintrom|apixab|eliquis|rivaroxab|xarelto|dabigat|pradaxa|edoxab|heparin|enoxapar|clexane/i,
  antagonistaVitK: /warfar|acenocum|sintrom/i,
  antiagregante: /clopidog|prasugr|ticagrel|aspirin|acetilsalic|\baas\b/i,
  isrs: /fluoxet|sertral|paroxet|citalop|escitalop|venlafax|duloxet|fluvoxam|trazod/i,
  litio: /litio/i,
  metotrexato: /metotrex/i,
  estatinaCyp: /simvast|lovast|atorvast/i,
  benzo: /diazep|alpraz|clonazep|lorazep|bromazep/i,
  antihipertensivo: /enalap|losart|valsart|lisinop|ramipr|captop|amlodip|hidroclorot|furosem/i,
  bifosfonato: /alendron|risedron|ibandron|zoledron|denosum/i,
};

const tiene = (lista: string[] | undefined, re: RegExp) => (lista ?? []).some((x) => re.test(x));

/** Avisos para un medicamento según los antecedentes del paciente. */
export function avisosMedicamento(medicamento: string, d: DatosClinicos): AvisoInteraccion[] {
  const med = medicamento.trim();
  if (!med) return [];
  const toma = `${d.medicacion ?? ""} ${d.observaciones ?? ""}`;
  const enf = [...(d.enfermedades ?? []), d.observaciones ?? ""];
  const avisos: AvisoInteraccion[] = [];
  const add = (nivel: NivelAviso, motivo: string, detalle: string) => avisos.push({ nivel, motivo, detalle });

  const embarazo = tiene(enf, /embaraz|gestaci/i);
  const lactancia = tiene(enf, /lactan|amamant/i);
  const coagulacion = tiene(enf, /coagul|hemofil|von willebrand/i) || TOMA.anticoagulante.test(toma);
  const edad = d.edad ?? null;

  if (F.aine.test(med)) {
    if (coagulacion)
      add("alto", "Anticoagulado o con trastorno de coagulación", "Los antiinflamatorios aumentan el riesgo de sangrado. Preferí paracetamol.");
    else if (TOMA.antiagregante.test(toma))
      add("precaucion", "Toma antiagregantes", "Suma riesgo de sangrado digestivo y en la zona tratada.");
    if (embarazo)
      add("alto", "Embarazo", "Evitar antiinflamatorios, sobre todo en el tercer trimestre. Preferí paracetamol.");
    if (tiene(enf, /renal|ri[ñn][oó]n|di[aá]lisis/i))
      add("alto", "Problema renal", "Los antiinflamatorios pueden empeorar la función renal.");
    if (tiene(enf, /gastrit|[uú]lcera|reflujo|sangrado digest/i))
      add("precaucion", "Gastritis o úlcera", "Pueden irritar el estómago: indicá protector gástrico o usá paracetamol.");
    if (tiene(enf, /hipertens|presi[oó]n alta/i) || TOMA.antihipertensivo.test(toma))
      add("precaucion", "Hipertensión", "Pueden subir la presión y restarle efecto a la medicación antihipertensiva. Usar pocos días.");
    if (tiene(enf, /cardiop|card[ií]ac|infarto|insuficiencia card/i))
      add(F.coxib.test(med) ? "alto" : "precaucion", "Cardiopatía", "Suben el riesgo cardiovascular. Dosis mínima y por pocos días.");
    if (tiene(enf, /asma/i))
      add("precaucion", "Asma", "En algunos asmáticos desencadenan broncoespasmo. Preguntá si los tolera.");
    if (TOMA.isrs.test(toma))
      add("precaucion", "Toma antidepresivos (ISRS)", "La combinación aumenta el riesgo de sangrado.");
    if (TOMA.litio.test(toma))
      add("alto", "Toma litio", "Los antiinflamatorios suben el nivel de litio en sangre.");
    if (TOMA.metotrexato.test(toma))
      add("alto", "Toma metotrexato", "Aumentan la toxicidad del metotrexato.");
    if (edad !== null && edad >= 65)
      add("precaucion", "Mayor de 65 años", "Más riesgo renal, gástrico y cardiovascular: dosis mínima y por pocos días.");
    if (edad !== null && edad < 12 && /nimesul|ketorol|etoricox|celecox/i.test(med))
      add("alto", "Menor de 12 años", "No indicado en niños. Usá ibuprofeno o paracetamol según peso.");
  }

  if (F.metronidazol.test(med)) {
    if (tiene(d.habitos, /alcohol/i) || /alcohol/i.test(toma))
      add("alto", "Consume alcohol", "Con metronidazol produce un efecto antabús (náuseas, vómitos, taquicardia). No tomar alcohol hasta 3 días después.");
    if (TOMA.antagonistaVitK.test(toma))
      add("alto", "Toma acenocumarol o warfarina", "Potencia el anticoagulante: riesgo de sangrado. Consultar con su médico o controlar el RIN.");
    if (embarazo) add("precaucion", "Embarazo", "Evitar en el primer trimestre.");
    if (lactancia) add("precaucion", "Lactancia", "Pasa a la leche: suspender la lactancia durante el tratamiento o elegir otro antibiótico.");
  }

  if (F.macrolidoCyp.test(med)) {
    if (TOMA.estatinaCyp.test(toma))
      add("alto", "Toma estatinas", "Con claritromicina/eritromicina sube el riesgo de daño muscular. Preferí azitromicina.");
    if (TOMA.antagonistaVitK.test(toma))
      add("precaucion", "Toma acenocumarol o warfarina", "Puede potenciar el anticoagulante.");
    if (embarazo) add("precaucion", "Embarazo", "Preferí amoxicilina o azitromicina.");
  }

  if (F.tetraciclina.test(med)) {
    if (embarazo) add("alto", "Embarazo", "Las tetraciclinas tiñen los dientes del bebé y afectan el hueso. Contraindicadas.");
    if (lactancia) add("precaucion", "Lactancia", "Evitar durante la lactancia.");
    if (edad !== null && edad < 8) add("alto", "Menor de 8 años", "Tiñen los dientes en formación. Contraindicadas.");
  }

  if (F.corticoide.test(med)) {
    if (tiene(enf, /diabet/i)) add("precaucion", "Diabetes", "Los corticoides suben la glucemia: controlarla esos días.");
    if (tiene(enf, /hipertens/i)) add("precaucion", "Hipertensión", "Pueden subir la presión.");
    if (embarazo) add("precaucion", "Embarazo", "Usar solo si es necesario y por pocos días.");
  }

  if (F.tramadol.test(med)) {
    if (TOMA.isrs.test(toma))
      add("alto", "Toma antidepresivos", "Con tramadol hay riesgo de síndrome serotoninérgico y convulsiones.");
    if (tiene(enf, /epilep|convuls/i)) add("alto", "Epilepsia", "El tramadol baja el umbral de convulsiones.");
    if (TOMA.benzo.test(toma)) add("alto", "Toma ansiolíticos", "Suma sedación y depresión respiratoria.");
    if (embarazo) add("precaucion", "Embarazo", "Evitar, sobre todo al final del embarazo.");
    if (edad !== null && edad < 12) add("alto", "Menor de 12 años", "Contraindicado en niños.");
  }

  if (F.benzo.test(med)) {
    if (TOMA.benzo.test(toma)) add("precaucion", "Ya toma ansiolíticos", "Se suman los efectos: ajustar la dosis.");
    if (embarazo) add("alto", "Embarazo", "Evitar benzodiacepinas en el embarazo.");
    if (edad !== null && edad >= 65) add("precaucion", "Mayor de 65 años", "Más riesgo de caídas y confusión: dosis menor.");
    if (tiene(d.habitos, /alcohol/i)) add("precaucion", "Consume alcohol", "Suma sedación: no tomar alcohol.");
  }

  if (F.paracetamol.test(med)) {
    if (tiene(enf, /hepat|h[ií]gado|cirrosis/i))
      add("precaucion", "Problema hepático", "No superar 2 g por día.");
    if (tiene(d.habitos, /alcohol/i)) add("precaucion", "Consume alcohol", "Más riesgo de daño hepático: no superar 2 g por día.");
  }

  if (F.dipirona.test(med) && embarazo)
    add("precaucion", "Embarazo", "Evitar en el primer y el tercer trimestre.");

  // Sin repetir el mismo motivo (se queda con el aviso más fuerte)
  const porMotivo = new Map<string, AvisoInteraccion>();
  for (const a of avisos) {
    const prev = porMotivo.get(a.motivo);
    if (!prev || (prev.nivel === "precaucion" && a.nivel === "alto")) porMotivo.set(a.motivo, a);
  }
  return [...porMotivo.values()].sort((a, b) => (a.nivel === b.nivel ? 0 : a.nivel === "alto" ? -1 : 1));
}

/** Avisos sobre el procedimiento (según el diagnóstico de la receta). */
export function avisosDiagnostico(diagnostico: string, d: DatosClinicos): AvisoInteraccion[] {
  const dx = diagnostico.trim();
  if (!dx) return [];
  const avisos: AvisoInteraccion[] = [];
  const quirurgico = /exodon|extracc|cirug|implante|alveol|tercer molar/i.test(dx);
  const toma = `${d.medicacion ?? ""} ${d.observaciones ?? ""}`;
  if (quirurgico && (tiene(d.enfermedades, /bifosfon|osteopor/i) || TOMA.bifosfonato.test(toma)))
    avisos.push({
      nivel: "precaucion",
      motivo: "Bifosfonatos / osteoporosis",
      detalle: "Riesgo de osteonecrosis de los maxilares en cirugías y extracciones. Evaluar antes de intervenir.",
    });
  if (quirurgico && (tiene(d.enfermedades, /coagul/i) || TOMA.anticoagulante.test(toma)))
    avisos.push({
      nivel: "precaucion",
      motivo: "Anticoagulado",
      detalle: "Planificar la hemostasia local (ácido tranexámico, sutura) y consultar con su médico antes de cambiar la medicación.",
    });
  return avisos;
}

/** Edad en años a partir de la fecha de nacimiento (AAAA-MM-DD). null si no se sabe. */
export function edadDesde(fechaNacimiento: string | undefined): number | null {
  if (!fechaNacimiento) return null;
  const n = new Date(fechaNacimiento);
  if (Number.isNaN(n.getTime())) return null;
  const hoy = new Date();
  let e = hoy.getFullYear() - n.getFullYear();
  const m = hoy.getMonth() - n.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < n.getDate())) e--;
  return e >= 0 && e < 130 ? e : null;
}

/** Resumen de los antecedentes que se tienen en cuenta al recetar (para mostrar). */
export function antecedentesRelevantes(d: DatosClinicos): string[] {
  const r: string[] = [];
  for (const e of d.enfermedades ?? []) if (e.trim()) r.push(e.trim());
  const toma = (d.medicacion ?? "").trim();
  if (toma) r.push(`Toma: ${toma.length > 60 ? `${toma.slice(0, 57)}…` : toma}`);
  if (tiene(d.habitos, /alcohol/i)) r.push("Consume alcohol");
  return r;
}
