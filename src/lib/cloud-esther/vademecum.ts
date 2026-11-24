import { normalizarBusqueda } from "@/lib/utils";

/* Ubicación: src/lib/cloud-esther/vademecum.ts

   Vademécum odontológico precargado, con los nombres que se usan en cada país (en Colombia se
   receta «Acetaminofén», en Argentina «Ketorolac», en España «Metamizol»…). Al escribir una
   letra en la receta aparecen las sugerencias y al elegir una se completan solas la
   presentación, la vía y la posología orientativa (el profesional siempre las puede editar).
   También trae los diagnósticos frecuentes y las piezas dentarias (numeración FDI). */

export type MedicamentoVademecum = {
  nombre: string;
  presentacion: string;
  via: string;
  posologia: string;
};

/* Nombres que cambian según el país. Clave = nombre «base» usado en la lista. */
const PAISES_ACETAMINOFEN = ["CO", "VE", "PA", "CR", "HN", "GT", "SV", "DO", "PR", "NI"];
const PAISES_RIOPLATENSES = ["AR", "UY", "PY"];
const PAISES_DIPIRONA = ["AR", "UY", "PY", "BO", "CO", "VE"];

function nombreLocal(base: string, pais: string): string {
  const p = pais.toUpperCase();
  if (base.startsWith("Paracetamol") && PAISES_ACETAMINOFEN.includes(p))
    return base.replace("Paracetamol", "Acetaminofén");
  if (base.startsWith("Ketorolac") && !PAISES_RIOPLATENSES.includes(p))
    return base.replace("Ketorolac", "Ketorolaco");
  if (base.startsWith("Diclofenac") && !PAISES_RIOPLATENSES.includes(p))
    return base.replace("Diclofenac", "Diclofenaco");
  if (base.startsWith("Dipirona") && !PAISES_DIPIRONA.includes(p))
    return base.replace("Dipirona", "Metamizol");
  return base;
}

const BASE: MedicamentoVademecum[] = [
  // Antibióticos
  { nombre: "Amoxicilina 500 mg", presentacion: "500 mg comprimidos", via: "Oral", posologia: "1 comprimido cada 8 horas por 7 días" },
  { nombre: "Amoxicilina 875 mg", presentacion: "875 mg comprimidos", via: "Oral", posologia: "1 comprimido cada 12 horas por 7 días" },
  { nombre: "Amoxicilina 2 g (profilaxis)", presentacion: "500 mg comprimidos", via: "Oral", posologia: "4 comprimidos juntos 1 hora antes del procedimiento" },
  { nombre: "Amoxicilina + ácido clavulánico 875/125 mg", presentacion: "875/125 mg comprimidos", via: "Oral", posologia: "1 comprimido cada 12 horas por 7 días" },
  { nombre: "Amoxicilina + ácido clavulánico 500/125 mg", presentacion: "500/125 mg comprimidos", via: "Oral", posologia: "1 comprimido cada 8 horas por 7 días" },
  { nombre: "Amoxicilina suspensión 250 mg/5 ml", presentacion: "250 mg/5 ml suspensión", via: "Oral", posologia: "Según peso: 50 mg/kg/día repartidos cada 8 horas por 7 días" },
  { nombre: "Azitromicina 500 mg", presentacion: "500 mg comprimidos", via: "Oral", posologia: "1 comprimido por día durante 3 días" },
  { nombre: "Claritromicina 500 mg", presentacion: "500 mg comprimidos", via: "Oral", posologia: "1 comprimido cada 12 horas por 7 días" },
  { nombre: "Clindamicina 300 mg", presentacion: "300 mg cápsulas", via: "Oral", posologia: "1 cápsula cada 8 horas por 7 días" },
  { nombre: "Clindamicina 600 mg (profilaxis)", presentacion: "300 mg cápsulas", via: "Oral", posologia: "2 cápsulas juntas 1 hora antes del procedimiento" },
  { nombre: "Metronidazol 500 mg", presentacion: "500 mg comprimidos", via: "Oral", posologia: "1 comprimido cada 8 horas por 7 días" },
  { nombre: "Cefalexina 500 mg", presentacion: "500 mg cápsulas", via: "Oral", posologia: "1 cápsula cada 6 horas por 7 días" },
  { nombre: "Doxiciclina 100 mg", presentacion: "100 mg comprimidos", via: "Oral", posologia: "1 comprimido cada 12 horas por 7 días" },
  { nombre: "Espiramicina + metronidazol", presentacion: "1,5 MUI/250 mg comprimidos", via: "Oral", posologia: "2 comprimidos cada 12 horas por 7 días" },
  // Analgésicos y antiinflamatorios
  { nombre: "Ibuprofeno 400 mg", presentacion: "400 mg comprimidos", via: "Oral", posologia: "1 comprimido cada 8 horas por 3 días" },
  { nombre: "Ibuprofeno 600 mg", presentacion: "600 mg comprimidos", via: "Oral", posologia: "1 comprimido cada 8 horas por 3 días" },
  { nombre: "Ibuprofeno suspensión 100 mg/5 ml", presentacion: "100 mg/5 ml suspensión", via: "Oral", posologia: "Según peso: 10 mg/kg cada 8 horas" },
  { nombre: "Ketorolac 10 mg", presentacion: "10 mg comprimidos", via: "Oral", posologia: "1 comprimido cada 8 horas (máximo 5 días)" },
  { nombre: "Ketorolac 20 mg sublingual", presentacion: "20 mg comprimidos sublinguales", via: "Sublingual", posologia: "1 comprimido cada 8 horas si hay dolor (máximo 5 días)" },
  { nombre: "Diclofenac 50 mg", presentacion: "50 mg comprimidos", via: "Oral", posologia: "1 comprimido cada 8 horas por 3 días" },
  { nombre: "Diclofenac 75 mg", presentacion: "75 mg comprimidos", via: "Oral", posologia: "1 comprimido cada 12 horas por 3 días" },
  { nombre: "Naproxeno 500 mg", presentacion: "500 mg comprimidos", via: "Oral", posologia: "1 comprimido cada 12 horas por 3 días" },
  { nombre: "Nimesulida 100 mg", presentacion: "100 mg comprimidos", via: "Oral", posologia: "1 comprimido cada 12 horas por 3 días" },
  { nombre: "Etoricoxib 90 mg", presentacion: "90 mg comprimidos", via: "Oral", posologia: "1 comprimido por día por 3 días" },
  { nombre: "Celecoxib 200 mg", presentacion: "200 mg cápsulas", via: "Oral", posologia: "1 cápsula cada 12 horas por 3 días" },
  { nombre: "Paracetamol 500 mg", presentacion: "500 mg comprimidos", via: "Oral", posologia: "1 comprimido cada 6 a 8 horas si hay dolor" },
  { nombre: "Paracetamol 1 g", presentacion: "1 g comprimidos", via: "Oral", posologia: "1 comprimido cada 8 horas si hay dolor" },
  { nombre: "Paracetamol gotas 100 mg/ml", presentacion: "100 mg/ml gotas", via: "Oral", posologia: "Según peso: 10 a 15 mg/kg cada 6 a 8 horas" },
  { nombre: "Dipirona 500 mg", presentacion: "500 mg comprimidos", via: "Oral", posologia: "1 comprimido cada 8 horas si hay dolor" },
  { nombre: "Tramadol 50 mg", presentacion: "50 mg cápsulas", via: "Oral", posologia: "1 cápsula cada 8 horas si hay dolor intenso" },
  // Corticoides
  { nombre: "Dexametasona 4 mg", presentacion: "4 mg comprimidos", via: "Oral", posologia: "1 comprimido cada 12 horas por 2 días" },
  { nombre: "Betametasona 0,6 mg", presentacion: "0,6 mg comprimidos", via: "Oral", posologia: "1 comprimido cada 12 horas por 2 días" },
  { nombre: "Prednisona 20 mg", presentacion: "20 mg comprimidos", via: "Oral", posologia: "1 comprimido por la mañana por 3 días" },
  // Uso local / tópicos
  { nombre: "Clorhexidina 0,12 % (colutorio)", presentacion: "0,12 % solución", via: "Enjuague bucal", posologia: "Enjuagar 15 ml durante 30 segundos, 2 veces al día por 7 días" },
  { nombre: "Clorhexidina gel 0,2 %", presentacion: "0,2 % gel", via: "Tópica", posologia: "Aplicar sobre la zona 2 veces al día por 7 días" },
  { nombre: "Triamcinolona 0,1 % pasta oral", presentacion: "0,1 % pasta adhesiva", via: "Tópica", posologia: "Aplicar sobre la lesión 3 veces al día por 5 días" },
  { nombre: "Benzocaína gel 20 %", presentacion: "20 % gel", via: "Tópica", posologia: "Aplicar sobre la zona hasta 4 veces al día" },
  { nombre: "Lidocaína gel 2 %", presentacion: "2 % gel", via: "Tópica", posologia: "Aplicar sobre la zona hasta 4 veces al día" },
  { nombre: "Nistatina suspensión 100.000 UI/ml", presentacion: "100.000 UI/ml suspensión", via: "Oral", posologia: "5 ml en buches 4 veces al día por 10 días" },
  { nombre: "Miconazol gel oral 2 %", presentacion: "2 % gel oral", via: "Tópica", posologia: "Aplicar 4 veces al día por 7 días" },
  { nombre: "Aciclovir 400 mg", presentacion: "400 mg comprimidos", via: "Oral", posologia: "1 comprimido cada 8 horas por 5 días" },
  { nombre: "Aciclovir crema 5 %", presentacion: "5 % crema", via: "Tópica", posologia: "Aplicar 5 veces al día por 5 días" },
  { nombre: "Pasta dental con flúor 5000 ppm", presentacion: "5000 ppm pasta", via: "Tópica", posologia: "Cepillar 2 veces al día; no enjuagar después" },
  // Otros
  { nombre: "Ácido tranexámico 500 mg", presentacion: "500 mg comprimidos", via: "Oral", posologia: "1 comprimido cada 8 horas por 2 días" },
  { nombre: "Omeprazol 20 mg", presentacion: "20 mg cápsulas", via: "Oral", posologia: "1 cápsula en ayunas mientras dure el tratamiento" },
  { nombre: "Loratadina 10 mg", presentacion: "10 mg comprimidos", via: "Oral", posologia: "1 comprimido por día" },
  { nombre: "Diazepam 5 mg", presentacion: "5 mg comprimidos", via: "Oral", posologia: "1 comprimido la noche anterior y 1 hora antes de la consulta" },
  { nombre: "Alprazolam 0,5 mg", presentacion: "0,5 mg comprimidos", via: "Oral", posologia: "1 comprimido 1 hora antes de la consulta" },
];

/** Vademécum con los nombres del país de la clínica (código ISO). */
export function vademecumDe(pais: string): MedicamentoVademecum[] {
  return BASE.map((m) => ({ ...m, nombre: nombreLocal(m.nombre, pais) }));
}

/** Busca un medicamento por nombre exacto (sin importar mayúsculas ni el país). */
export function buscarEnVademecum(nombre: string): MedicamentoVademecum | undefined {
  const k = normalizarBusqueda(nombre.trim());
  if (!k) return undefined;
  for (const m of BASE) {
    for (const p of ["AR", "CO", "ES"]) {
      const local = nombreLocal(m.nombre, p);
      if (normalizarBusqueda(local) === k) return { ...m, nombre: local };
    }
  }
  return undefined;
}

/** Ordena las opciones que coinciden con lo escrito: primero las que empiezan igual. */
export function filtrarSugerencias(opciones: string[], texto: string, max = 8): string[] {
  const q = normalizarBusqueda(texto.trim());
  if (!q) return [];
  const empieza: string[] = [];
  const contiene: string[] = [];
  const vistos = new Set<string>();
  for (const o of opciones) {
    const n = normalizarBusqueda(o);
    if (vistos.has(n) || n === q) continue;
    if (n.startsWith(q) || n.split(/\s+/).some((p) => p.startsWith(q))) {
      vistos.add(n);
      (n.startsWith(q) ? empieza : contiene).push(o);
    } else if (q.length >= 3 && n.includes(q)) {
      vistos.add(n);
      contiene.push(o);
    }
  }
  return [...empieza, ...contiene].slice(0, max);
}

/* ───────────── Diagnósticos y piezas ───────────── */

export const DIAGNOSTICOS_FRECUENTES = [
  "Caries dental",
  "Caries profunda",
  "Pulpitis reversible",
  "Pulpitis irreversible",
  "Necrosis pulpar",
  "Periodontitis apical",
  "Absceso periapical",
  "Absceso periodontal",
  "Celulitis odontogénica",
  "Pericoronaritis",
  "Alveolitis",
  "Gingivitis",
  "Periodontitis",
  "Hipersensibilidad dentaria",
  "Fractura dentaria",
  "Traumatismo dentario",
  "Exodoncia",
  "Exodoncia de tercer molar",
  "Postoperatorio de endodoncia",
  "Postoperatorio de cirugía",
  "Colocación de implante",
  "Profilaxis antibiótica",
  "Bruxismo",
  "Trastorno de ATM",
  "Estomatitis aftosa",
  "Herpes labial",
  "Candidiasis oral",
  "Mucositis",
  "Dolor dental",
];

/** Cómo se dice «pieza» en cada país. */
export function palabraPieza(pais: string): string {
  return ["AR", "UY", "PY", "ES", "CL", "BO"].includes(pais.toUpperCase()) ? "pieza" : "diente";
}

/** Piezas dentarias (FDI): permanentes 11–48 y temporales 51–85. */
export const PIEZAS_FDI: string[] = (() => {
  const r: string[] = [];
  for (const c of [1, 2, 3, 4]) for (let n = 1; n <= 8; n++) r.push(`${c}${n}`);
  for (const c of [5, 6, 7, 8]) for (let n = 1; n <= 5; n++) r.push(`${c}${n}`);
  return r;
})();

/** Sugerencias para el diagnóstico: diagnósticos al escribir letras y piezas al escribir
    «pieza 3…» / «diente 4…» o solo el número. */
export function sugerirDiagnostico(texto: string, pais: string, extra: string[] = []): string[] {
  const palabra = palabraPieza(pais);
  const conPieza = texto.match(/^(.*?)(\b(?:pieza|diente|pza\.?|d\.?)\s*)(\d{0,2})$/i);
  if (conPieza) {
    const [, antes = "", , num = ""] = conPieza;
    return PIEZAS_FDI.filter((p) => p.startsWith(num) && p !== num)
      .slice(0, 8)
      .map((p) => `${antes}${palabra} ${p}`);
  }
  const soloNumero = texto.match(/^(.*?)(\d{1,2})$/);
  if (soloNumero && /\s$|^$/.test(soloNumero[1] ?? "")) {
    const [, antes = "", num = ""] = soloNumero;
    return PIEZAS_FDI.filter((p) => p.startsWith(num) && p !== num)
      .slice(0, 8)
      .map((p) => `${antes}${palabra} ${p}`);
  }
  return filtrarSugerencias([...extra, ...DIAGNOSTICOS_FRECUENTES], texto);
}
