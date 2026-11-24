import { useEffect, useMemo, useRef, useState } from "react";
import { ClipboardCheck, FileDown, Mic, MicOff, Stethoscope, Undo2 } from "lucide-react";

import { useMicrofono } from "@/components/cloud-esther/esther-ai/microfono";
import { documentoPDF } from "@/lib/descargas";
import type { EvaluacionPerio } from "./Periodontograma";

/* Ubicación: src/components/cloud-esther/pacientes/perio-extras.tsx
   Herramientas del periodontograma (2D y 3D, demo y clínica):
   1. DIAGNÓSTICO ORIENTATIVO: estadio (I–IV) y extensión según la clasificación AAP/EFP 2017,
      calculado con el sondaje cargado. El profesional lo confirma (grado y causa de ausencias
      dependen de datos que el sondaje no tiene).
   2. GRÁFICO CLÁSICO: línea roja del margen gingival y azul del fondo de bolsa por arcada y cara,
      como lo imprimen los periodoncistas, y PDF para entregar.
   3. SONDAJE DICTADO: el profesional dice los números ("tres dos tres") y el sistema los carga
      sitio por sitio y pasa solo a la pieza siguiente. También entiende "sangra", "placa",
      "ausente", "siguiente" y "atrás". */

type Sitio = { ps: number | null; mg: number | null; sangrado: boolean; placa: boolean };
type Pieza = EvaluacionPerio["piezas"][string];

const SUP = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const INF = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
const MOLARES = new Set([18, 17, 16, 26, 27, 28, 36, 37, 38, 46, 47, 48]);
const INCISIVOS = new Set([11, 12, 21, 22, 31, 32, 41, 42]);

const sitioVacio = (): Sitio => ({ ps: null, mg: null, sangrado: false, placa: false });
const piezaVacia = (): Pieza => ({
  ausente: false,
  implante: false,
  movilidad: 0,
  furca: 0,
  v: [sitioVacio(), sitioVacio(), sitioVacio()],
  p: [sitioVacio(), sitioVacio(), sitioVacio()],
});
/** Nivel de inserción clínica. Si no se cargó el margen gingival, se estima con lo que el sondaje
 *  excede a un surco sano (3 mm), para no marcar pérdida de inserción donde no la hay. */
const nic = (s: Sitio) => (s.ps == null ? null : s.mg == null ? Math.max(0, s.ps - 3) : s.ps - s.mg);

/* ───────────── 1. Diagnóstico orientativo ───────────── */

export type DiagnosticoPerio = {
  titulo: string;
  estadio: string | null;
  extension: string | null;
  tono: "salud" | "gingivitis" | "periodontitis" | "faltan";
  motivos: string[];
  aviso: string;
};

export function diagnosticoPerio(ev: EvaluacionPerio): DiagnosticoPerio {
  const presentes = [...SUP, ...INF].filter((n) => !ev.piezas[n]?.ausente);
  const ausentes = 32 - presentes.length;
  let sitios = 0;
  let conPs = 0;
  let sangran = 0;
  let maxNicInter = 0;
  let maxPs = 0;
  let furcaAvanzada = 0;
  let moviles = 0;
  const afectadas: number[] = [];
  let caraLibre = 0;
  for (const n of presentes) {
    const p = ev.piezas[n] ?? piezaVacia();
    if (p.implante) continue;
    // Interproximales: distal y mesial de cada cara (posiciones 0 y 2)
    const inter = [p.v[0], p.v[2], p.p[0], p.p[2]].map(nic).filter((x): x is number => x != null);
    const libres = [p.v[1], p.p[1]];
    const nicI = inter.length ? Math.max(...inter) : 0;
    if (nicI >= 2) afectadas.push(n);
    if (libres.some((s) => (nic(s) ?? 0) >= 3 && (s.ps ?? 0) > 3)) caraLibre++;
    maxNicInter = Math.max(maxNicInter, nicI);
    for (const s of [...p.v, ...p.p]) {
      sitios++;
      if (s.sangrado) sangran++;
      if (s.ps != null) {
        conPs++;
        maxPs = Math.max(maxPs, s.ps);
      }
    }
    if (MOLARES.has(n) && p.furca >= 2) furcaAvanzada++;
    if (p.movilidad >= 2) moviles++;
  }
  const bop = sitios ? Math.round((sangran / sitios) * 100) : 0;
  const sinMg = presentes.every((n) => [...(ev.piezas[n]?.v ?? []), ...(ev.piezas[n]?.p ?? [])].every((x) => x.mg == null));
  const aviso =
    "Orientativo, calculado con el sondaje cargado (AAP/EFP 2017). El grado (A, B o C) y si las ausencias fueron por periodontitis los define el profesional con radiografías, tabaco y diabetes.";

  if (conPs < Math.max(12, presentes.length)) {
    return {
      titulo: "Faltan datos para el diagnóstico",
      estadio: null,
      extension: null,
      tono: "faltan",
      motivos: [`Hay ${conPs} sitios sondados. Cargá al menos un sondaje por pieza para calcularlo.`],
      aviso,
    };
  }

  const esPeriodontitis = afectadas.length >= 2 || caraLibre >= 2;
  if (!esPeriodontitis) {
    if (bop >= 10)
      return {
        titulo: bop > 30 ? "Gingivitis generalizada" : "Gingivitis localizada",
        estadio: null,
        extension: bop > 30 ? "Generalizada" : "Localizada",
        tono: "gingivitis",
        motivos: [`Sangrado al sondaje en el ${bop} % de los sitios`, "Sin pérdida de inserción interproximal en 2 o más piezas"],
        aviso,
      };
    return {
      titulo: "Salud periodontal",
      estadio: null,
      extension: null,
      tono: "salud",
      motivos: [`Sangrado al sondaje en el ${bop} % de los sitios (menos del 10 %)`, `Sondaje máximo ${maxPs} mm`],
      aviso,
    };
  }

  // Estadio por la mayor pérdida de inserción interproximal y por la complejidad
  let estadio = maxNicInter >= 5 ? 3 : maxNicInter >= 3 ? 2 : 1;
  const motivos = [`Pérdida de inserción interproximal máxima: ${maxNicInter} mm`];
  if (maxPs >= 6) {
    estadio = Math.max(estadio, 3);
    motivos.push(`Bolsas de ${maxPs} mm o más`);
  } else if (maxPs === 5) {
    estadio = Math.max(estadio, 2);
    motivos.push("Bolsas de hasta 5 mm");
  } else motivos.push(`Sondaje máximo ${maxPs} mm`);
  if (furcaAvanzada) {
    estadio = Math.max(estadio, 3);
    motivos.push(`Furca grado II o III en ${furcaAvanzada} molar${furcaAvanzada > 1 ? "es" : ""}`);
  }
  let notaIV = "";
  if (estadio >= 3 && (moviles > 0 || presentes.length < 20 || ausentes >= 5)) {
    notaIV = " (posible IV)";
    if (moviles) motivos.push(`Movilidad 2 o más en ${moviles} pieza${moviles > 1 ? "s" : ""}`);
    if (presentes.length < 20) motivos.push(`Quedan ${presentes.length} piezas`);
    else if (ausentes >= 5) motivos.push(`${ausentes} piezas ausentes: confirmá si se perdieron por periodontitis`);
  }
  const pct = presentes.length ? Math.round((afectadas.length / presentes.length) * 100) : 0;
  const soloMI = afectadas.length > 0 && afectadas.every((n) => MOLARES.has(n) || INCISIVOS.has(n));
  const extension = soloMI && pct < 30 ? "Patrón molar-incisivo" : pct >= 30 ? "Generalizada" : "Localizada";
  motivos.push(`${afectadas.length} de ${presentes.length} piezas con pérdida de inserción (${pct} %)`);
  motivos.push(`Sangrado al sondaje: ${bop} %`);
  if (sinMg) motivos.push("Sin margen gingival cargado: la pérdida de inserción se estimó con el sondaje");
  const romano = ["I", "II", "III", "IV"][estadio - 1]!;
  return {
    titulo: `Periodontitis estadio ${romano}${notaIV}`,
    estadio: `${romano}${notaIV}`,
    extension,
    tono: "periodontitis",
    motivos,
    aviso,
  };
}

const TONO: Record<DiagnosticoPerio["tono"], string> = {
  salud: "from-emerald-500 to-teal-500",
  gingivitis: "from-amber-500 to-orange-500",
  periodontitis: "from-rose-500 to-fuchsia-600",
  faltan: "from-slate-400 to-slate-500",
};

export function DiagnosticoCard({ ev, onCopiar }: { ev: EvaluacionPerio; onCopiar: (texto: string) => void }) {
  const d = useMemo(() => diagnosticoPerio(ev), [ev]);
  const texto = `${d.titulo}${d.extension && d.tono === "periodontitis" ? ` · ${d.extension}` : ""}`;
  return (
    <section className="overflow-hidden rounded-3xl border border-primary/12 bg-card shadow-[0_18px_40px_-32px_rgba(76,29,149,0.7)]">
      <div className={`flex flex-wrap items-center gap-3 bg-gradient-to-r ${TONO[d.tono]} px-4 py-3 text-white`}>
        <span className="grid size-10 place-items-center rounded-2xl bg-white/20">
          <Stethoscope className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-white/80">Diagnóstico orientativo</p>
          <p className="font-display text-base font-bold leading-snug">{texto}</p>
        </div>
        {d.tono !== "faltan" && (
          <button
            type="button"
            onClick={() => onCopiar(texto)}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-xs font-semibold transition hover:bg-white/30"
          >
            <ClipboardCheck className="size-3.5" /> Pasar a notas
          </button>
        )}
      </div>
      <div className="space-y-2 p-4">
        <ul className="space-y-1 text-sm">
          {d.motivos.map((m) => (
            <li key={m} className="flex gap-2">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
              <span>{m}</span>
            </li>
          ))}
        </ul>
        <p className="text-[11px] leading-relaxed text-muted-foreground">{d.aviso}</p>
      </div>
    </section>
  );
}

/* ───────────── 2. Gráfico clásico ───────────── */

/** SVG de una fila del gráfico (una cara de una arcada). Devuelve texto para usarlo igual en
 *  pantalla y en el PDF. Las filas van en espejo como en el gráfico clásico: con invertir la raíz
 *  queda arriba. Línea roja = margen gingival; azul = fondo de bolsa. */
export function svgFila(ev: EvaluacionPerio, piezas: number[], cara: "v" | "p", titulo: string, invertir: boolean): string {
  const W = 44;
  const ancho = piezas.length * W;
  const H = 120;
  // Arriba (invertir) la raíz va hacia arriba; abajo, hacia abajo, como en los gráficos clásicos
  const y0 = invertir ? 66 : 54; // límite amelocementario
  const k = 5; // px por mm
  const y = (mm: number) => (invertir ? y0 + mm * k : y0 - mm * k);
  // Tramos de líneas: se cortan en las piezas ausentes
  const tramosMg: string[][] = [[]];
  const tramosFondo: string[][] = [[]];
  const areas: string[] = [];
  let tramoMg: string[] = tramosMg[0]!;
  let tramoF: string[] = tramosFondo[0]!;
  const cortar = () => {
    if (tramoMg.length && tramoF.length === tramoMg.length)
      areas.push(`<polygon points="${[...tramoMg, ...[...tramoF].reverse()].join(" ")}" fill="rgba(59,130,246,0.14)"/>`);
    tramoMg = [];
    tramoF = [];
    tramosMg.push(tramoMg);
    tramosFondo.push(tramoF);
  };
  let partes = "";
  piezas.forEach((n, i) => {
    const p = ev.piezas[n] ?? piezaVacia();
    const x0 = i * W;
    partes += `<rect x="${x0 + 1}" y="0" width="${W - 2}" height="${H}" rx="6" fill="${p.ausente ? "#f1f5f9" : i % 2 ? "#faf7ff" : "#ffffff"}"/>`;
    partes += `<text x="${x0 + W / 2}" y="${invertir ? H - 4 : 12}" text-anchor="middle" font-size="10" font-weight="700" fill="${p.ausente ? "#94a3b8" : "#4c1d95"}">${n}</text>`;
    if (p.ausente) {
      cortar();
      partes += `<line x1="${x0 + 8}" y1="20" x2="${x0 + W - 8}" y2="${H - 20}" stroke="#cbd5e1" stroke-width="2"/>`;
      return;
    }
    const caraP = p[cara];
    // De izquierda a derecha en pantalla: en el lado derecho del paciente (1x y 4x) va
    // distal → mesial; en el izquierdo (2x y 3x) mesial → distal (lo mesial mira a la línea media).
    const izquierdo = Math.floor(n / 10) === 2 || Math.floor(n / 10) === 3;
    const orden = izquierdo ? [2, 1, 0] : [0, 1, 2];
    caraP.forEach((_, j) => {
      const s = caraP[orden[j]!]!;
      const x = x0 + 8 + j * ((W - 16) / 2);
      const mg = s.mg ?? 0;
      const yMg = y(mg);
      tramoMg.push(`${x},${yMg}`);
      // Del lado de la corona (junto al número): sondajes de 4 mm o más, sangrado y placa
      if (s.ps != null) {
        tramoF.push(`${x},${y(mg - s.ps)}`);
        if (s.ps >= 4)
          partes += `<text x="${x}" y="${invertir ? H - 17 : 25}" text-anchor="middle" font-size="9" font-weight="700" fill="${s.ps >= 6 ? "#e11d48" : "#d97706"}">${s.ps}</text>`;
      } else tramoF.push(`${x},${yMg}`);
      if (s.sangrado) partes += `<circle cx="${x}" cy="${invertir ? H - 30 : 34}" r="3" fill="#e11d48"/>`;
      if (s.placa) partes += `<circle cx="${x}" cy="${invertir ? H - 38 : 42}" r="2.5" fill="#f59e0b"/>`;
    });
    if (MOLARES.has(n) && p.furca > 0)
      partes += `<text x="${x0 + 4}" y="${invertir ? H - 4 : 12}" font-size="8" font-weight="700" fill="#7c3aed">F${p.furca}</text>`;
    if (p.movilidad > 0)
      partes += `<text x="${x0 + W - 4}" y="${invertir ? H - 4 : 12}" text-anchor="end" font-size="8" font-weight="700" fill="#64748b">M${p.movilidad}</text>`;
  });
  cortar();
  const area = areas.join("");
  const linea = (tramos: string[][], color: string) =>
    tramos
      .filter((pts) => pts.length > 1)
      .map((pts) => `<polyline points="${pts.join(" ")}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round"/>`)
      .join("");
  let grilla = "";
  for (let mm = -2; mm <= 10; mm += 2) {
    const yy = y(-mm);
    if (yy < 14 || yy > H - 14) continue;
    grilla += `<line x1="0" y1="${yy}" x2="${ancho}" y2="${yy}" stroke="${mm === 0 ? "#a78bfa" : "#ede9fe"}" stroke-width="${mm === 0 ? 1.2 : 0.8}" ${mm === 0 ? "" : 'stroke-dasharray="3 3"'}/>`;
  }
  return `<div style="margin:6px 0"><p style="margin:0 0 3px;font:700 10px system-ui;letter-spacing:.1em;text-transform:uppercase;color:#6b7280">${titulo}</p><svg viewBox="0 0 ${ancho} ${H}" width="100%" style="min-width:${ancho}px;display:block" xmlns="http://www.w3.org/2000/svg">${partes}${grilla}${area}${linea(tramosFondo, "#2563eb")}${linea(tramosMg, "#e11d48")}</svg></div>`;
}

export function graficoCompleto(ev: EvaluacionPerio): string {
  return [
    svgFila(ev, SUP, "v", "Superior · vestibular", true),
    svgFila(ev, SUP, "p", "Superior · palatino", false),
    svgFila(ev, INF, "p", "Inferior · lingual", true),
    svgFila(ev, INF, "v", "Inferior · vestibular", false),
  ].join("");
}

export function GraficoPerio({
  ev,
  paciente,
  onToast,
}: {
  ev: EvaluacionPerio;
  paciente?: string | undefined;
  onToast: (m: string) => void;
}) {
  const html = useMemo(() => graficoCompleto(ev), [ev]);
  const pdf = () => {
    const d = diagnosticoPerio(ev);
    const w = documentoPDF(`periodontograma-${paciente ?? "paciente"}`);
    onToast("Descargando el periodontograma en PDF");
    w.document.write(`<html><head><meta charset="utf-8"><title>Periodontograma</title>
      <style>body{font-family:system-ui,sans-serif;color:#1f2937;padding:20px}h1{font-size:18px;margin:0}
      .sub{color:#6b7280;font-size:12px;margin:2px 0 12px}.dx{border:1px solid #ede9fe;border-radius:12px;padding:10px 12px;margin:10px 0}
      .ley{font-size:10px;color:#6b7280}</style></head><body>
      <h1>Periodontograma${paciente ? ` · ${paciente}` : ""}</h1>
      <p class="sub">${ev.fecha.split("-").reverse().join("/")}${ev.profesional ? ` · ${ev.profesional}` : ""}</p>
      <div class="dx"><b>${d.titulo}${d.extension && d.tono === "periodontitis" ? ` · ${d.extension}` : ""}</b>
      <ul style="margin:6px 0 4px;padding-left:18px;font-size:12px">${d.motivos.map((m) => `<li>${m}</li>`).join("")}</ul>
      <p class="ley">${d.aviso}</p></div>
      ${html}
      <p class="ley">Línea roja: margen gingival · Línea azul: fondo de la bolsa · Área celeste: bolsa · Punto rojo: sangrado · Punto amarillo: placa · F: furca · M: movilidad · Números: sondajes de 4 mm o más.</p>
      ${ev.notas ? `<p style="font-size:12px"><b>Notas:</b> ${ev.notas.replace(/</g, "&lt;")}</p>` : ""}
      <p class="ley" style="margin-top:16px">Generado con Cloud Esther.</p></body></html>`);
    w.document.close();
  };
  return (
    <section className="rounded-3xl border border-primary/12 bg-card p-4 shadow-[0_18px_40px_-32px_rgba(76,29,149,0.7)]">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-display text-sm font-bold">Gráfico periodontal</p>
          <p className="text-[11px] text-muted-foreground">
            <span className="font-semibold text-rose-600">Rojo</span>: margen gingival ·{" "}
            <span className="font-semibold text-blue-600">Azul</span>: fondo de bolsa · celeste: bolsa
          </p>
        </div>
        <button type="button" onClick={pdf} className="btn-ce-outline !min-h-10">
          <FileDown className="size-4" /> PDF para el paciente
        </button>
      </div>
      <div className="-mx-1 overflow-x-auto px-1 pb-1" dangerouslySetInnerHTML={{ __html: html }} />
    </section>
  );
}

/* ───────────── 3. Sondaje dictado por voz ───────────── */

const NUMEROS: Record<string, number> = {
  cero: 0, uno: 1, una: 1, un: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8,
  nueve: 9, diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15,
};
type Comando = { tipo: "ps"; v: number } | { tipo: "sangra" } | { tipo: "placa" } | { tipo: "ausente" } | { tipo: "salto" } | { tipo: "atras" };

/** Convierte lo dictado en comandos: números (palabras o cifras sueltas: "323" = 3, 2, 3). */
export function interpretarDictado(texto: string): Comando[] {
  const out: Comando[] = [];
  const palabras = texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[.,;:]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  for (const w of palabras) {
    if (w in NUMEROS) out.push({ tipo: "ps", v: NUMEROS[w]! });
    else if (/^\d+$/.test(w)) {
      // "10" a "15" son una sola medida; "323" son tres sitios
      const n = Number(w);
      if (w.length <= 2 && n <= 15) out.push({ tipo: "ps", v: n });
      else for (const c of w) out.push({ tipo: "ps", v: Number(c) });
    } else if (w.startsWith("sangr")) out.push({ tipo: "sangra" });
    else if (w.startsWith("placa")) out.push({ tipo: "placa" });
    else if (w.startsWith("ausent") || w === "falta") out.push({ tipo: "ausente" });
    else if (["siguiente", "salto", "saltar", "paso"].includes(w)) out.push({ tipo: "salto" });
    else if (["atras", "borrar", "corregir"].includes(w)) out.push({ tipo: "atras" });
  }
  return out;
}

/** Recorrido del sondaje: vestibular superior 18→28, palatino 28→18, lingual inferior 38→48,
 *  vestibular inferior 48→38. Cada pieza tiene 3 sitios por cara (distal, medio, mesial). */
type Paso = { fdi: number; cara: "v" | "p"; sitio: number };
function recorrido(ev: EvaluacionPerio): Paso[] {
  const pasos: Paso[] = [];
  const agregar = (piezas: number[], cara: "v" | "p") => {
    // Barrido continuo: si la sonda va hacia la línea media, distal → mesial; si se aleja, al revés
    const cuad = (n: number) => Math.floor(n / 10);
    const haciaMedia = (i: number) => {
      const a = piezas[i]!;
      const b = piezas[i + 1];
      if (b !== undefined && cuad(a) === cuad(b)) return b % 10 < a % 10;
      const prev = piezas[i - 1];
      if (prev !== undefined && cuad(prev) === cuad(a)) return a % 10 < prev % 10;
      return true;
    };
    piezas.forEach((fdi, i) => {
      if (ev.piezas[fdi]?.ausente) return;
      const haciaLaMedia = haciaMedia(i);
      const sitios = haciaLaMedia ? [0, 1, 2] : [2, 1, 0];
      for (const s of sitios) pasos.push({ fdi, cara, sitio: s });
    });
  };
  agregar(SUP, "v");
  agregar([...SUP].reverse(), "p");
  agregar([...INF].reverse(), "p");
  agregar(INF, "v");
  return pasos;
}
const NOMBRE_SITIO = ["distal", "medio", "mesial"];

export function DictadoSondaje({
  ev,
  guardar,
  onPieza,
  onToast,
}: {
  ev: EvaluacionPerio;
  guardar: (ev: EvaluacionPerio) => void;
  onPieza: (fdi: number) => void;
  onToast: (m: string) => void;
}) {
  const [activo, setActivo] = useState(false);
  const [pos, setPos] = useState(0);
  const [ultimo, setUltimo] = useState("");
  const evRef = useRef(ev);
  evRef.current = ev;
  const posRef = useRef(pos);
  posRef.current = pos;
  const activoRef = useRef(activo);
  activoRef.current = activo;

  const aplicar = (texto: string) => {
    const comandos = interpretarDictado(texto);
    setUltimo(texto);
    if (!comandos.length) return;
    let e: EvaluacionPerio = JSON.parse(JSON.stringify(evRef.current)) as EvaluacionPerio;
    let p = posRef.current;
    let ultimoSitio: Paso | null = p > 0 ? (recorrido(e)[p - 1] ?? null) : null;
    for (const c of comandos) {
      const pasos = recorrido(e);
      const paso = pasos[p];
      if (c.tipo === "atras") {
        p = Math.max(0, p - 1);
        const pa = pasos[p];
        if (pa) {
          const pz = (e.piezas[pa.fdi] ??= piezaVacia());
          pz[pa.cara][pa.sitio] = { ...pz[pa.cara][pa.sitio]!, ps: null, sangrado: false, placa: false };
        }
        ultimoSitio = p > 0 ? (pasos[p - 1] ?? null) : null;
        continue;
      }
      if ((c.tipo === "sangra" || c.tipo === "placa") && ultimoSitio) {
        const pz = (e.piezas[ultimoSitio.fdi] ??= piezaVacia());
        const s = pz[ultimoSitio.cara][ultimoSitio.sitio]!;
        pz[ultimoSitio.cara][ultimoSitio.sitio] = c.tipo === "sangra" ? { ...s, sangrado: true } : { ...s, placa: true };
        continue;
      }
      if (!paso) break;
      if (c.tipo === "ausente") {
        // La pieza actual queda ausente y se recalcula el recorrido desde la misma posición
        const pz = (e.piezas[paso.fdi] ??= piezaVacia());
        pz.ausente = true;
        p = pasos.findIndex((x) => x.fdi === paso.fdi);
        e = { ...e };
        continue;
      }
      if (c.tipo === "salto") {
        p++;
        ultimoSitio = paso;
        continue;
      }
      if (c.tipo === "ps") {
        const pz = (e.piezas[paso.fdi] ??= piezaVacia());
        pz[paso.cara][paso.sitio] = { ...pz[paso.cara][paso.sitio]!, ps: c.v };
        ultimoSitio = paso;
        p++;
      }
    }
    guardar(e);
    setPos(p);
    const siguiente = recorrido(e)[p];
    if (siguiente) onPieza(siguiente.fdi);
    else {
      setActivo(false);
      onToast("Sondaje completo: se cargaron todas las piezas");
    }
  };

  const micRef = useRef<ReturnType<typeof useMicrofono> | null>(null);
  const mic = useMicrofono({
    onTexto: (t) => aplicar(t),
    onEstado: (escuchando) => {
      // Manos libres: cuando termina una frase, vuelve a escuchar mientras el dictado esté activo
      // (con el micrófono más reciente, no el de esta frase)
      if (!escuchando && activoRef.current)
        window.setTimeout(() => {
          const m = micRef.current;
          if (activoRef.current && m && !m.escuchando) m.alternar();
        }, 400);
    },
  });
  micRef.current = mic;

  useEffect(() => {
    if (!activo && mic.escuchando) mic.alternar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activo]);

  const pasos = recorrido(ev);
  const actual = pasos[pos];

  const empezar = () => {
    // Arranca en el primer sitio sin cargar
    const i = pasos.findIndex((x) => ev.piezas[x.fdi]?.[x.cara][x.sitio]?.ps == null);
    const inicio = i >= 0 ? i : 0;
    setPos(inicio);
    if (pasos[inicio]) onPieza(pasos[inicio]!.fdi);
    setActivo(true);
    if (!mic.escuchando) mic.alternar();
  };

  return (
    <section className="rounded-3xl border border-primary/12 bg-gradient-to-br from-primary/[0.06] via-card to-fuchsia-500/[0.05] p-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => (activo ? setActivo(false) : empezar())}
          className={`grid size-12 shrink-0 place-items-center rounded-full text-white shadow-[0_12px_26px_-12px_rgba(124,58,237,0.9)] transition ${
            activo ? "animate-pulse bg-gradient-to-br from-rose-500 to-fuchsia-600" : "bg-gradient-to-br from-primary to-fuchsia-500"
          }`}
          aria-label={activo ? "Terminar dictado" : "Dictar sondaje"}
        >
          {activo ? <MicOff className="size-5" /> : <Mic className="size-5" />}
        </button>
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-bold">Sondaje dictado por voz</p>
          {activo && actual ? (
            <p className="text-sm">
              Ahora: pieza <b className="text-primary">{actual.fdi}</b> · {actual.cara === "v" ? "vestibular" : "palatino/lingual"} ·{" "}
              {NOMBRE_SITIO[actual.sitio]}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Decí los sondajes en orden («tres dos tres»). Va solo de pieza en pieza: vestibular y palatino de arriba,
              lingual y vestibular de abajo. También: «sangra», «placa», «ausente», «siguiente», «atrás».
            </p>
          )}
          {activo && (mic.parcial || ultimo) && (
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">«{mic.parcial || ultimo}»</p>
          )}
          {mic.aviso && <p className="mt-0.5 text-[11px] text-destructive">{mic.aviso}</p>}
        </div>
        {activo && (
          <button
            type="button"
            onClick={() => aplicar("atrás")}
            className="inline-flex items-center gap-1 rounded-full border border-primary/20 px-3 py-1.5 text-xs font-semibold text-primary"
          >
            <Undo2 className="size-3.5" /> Atrás
          </button>
        )}
      </div>
      {activo && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-primary/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-fuchsia-500 transition-all"
            style={{ width: `${pasos.length ? Math.round((pos / pasos.length) * 100) : 0}%` }}
          />
        </div>
      )}
    </section>
  );
}
