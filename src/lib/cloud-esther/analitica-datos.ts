/* Ubicación: src/lib/cloud-esther/analitica-datos.ts
   Datos de Analítica. El "histórico importado" son 12 meses de atenciones generados de forma
   estable por empresa (misma empresa → mismos números), como si vinieran del sistema anterior;
   encima se suman los datos en vivo de Agenda, Facturación, Presupuestos y Marketing.
   TODO backend: reemplazar por el data warehouse (tabla de hechos de atenciones por clinicId). */

export type EstadoHecho = "Atendida" | "Ausente" | "Cancelada" | "Programada";
export type Hecho = {
  id: string;
  fecha: string; // yyyy-mm-dd
  hora: number; // 8..20
  dow: number; // 0 domingo .. 6 sábado
  sucursal: string;
  profesional: string;
  tratamiento: string;
  categoria: string;
  estado: EstadoHecho;
  paciente: number;
  nuevo: boolean;
  canal: string;
  cobertura: string;
  edad: string;
  genero: "Femenino" | "Masculino" | "Otro";
  monto: number;
  vivo: boolean; // true si viene de la Agenda real
};
export type PresupuestoHecho = {
  fecha: string;
  sucursal: string;
  profesional: string;
  monto: number;
  estado: "Enviado" | "Aprobado" | "Rechazado";
  tratamiento: string;
};
export type LeadHecho = { fecha: string; canal: string; convertido: boolean; costo: number };

export const CANALES = [
  "Recomendación",
  "Google",
  "Instagram",
  "Obra social",
  "Sitio web",
  "Meta Ads",
  "Presencial",
] as const;
export const COBERTURAS = ["Particular", "OSDE", "Swiss Medical", "Galeno", "Medifé", "IOMA"];
export const EDADES = ["0-17", "18-29", "30-44", "45-59", "60+"];

/** [tratamiento, categoría, precio de lista, peso relativo] */
export const CATALOGO: [string, string, number, number][] = [
  ["Primera consulta", "Diagnóstico", 25_000, 0],
  ["Control", "Diagnóstico", 18_000, 16],
  ["Radiografía panorámica", "Diagnóstico", 18_000, 5],
  ["Limpieza dental", "Prevención", 45_000, 15],
  ["Aplicación de flúor", "Prevención", 18_000, 3],
  ["Restauración", "Operatoria", 72_000, 13],
  ["Endodoncia", "Endodoncia", 150_000, 5],
  ["Extracción", "Cirugía", 70_000, 5],
  ["Implante", "Implantes", 650_000, 2],
  ["Corona", "Prótesis", 280_000, 3],
  ["Control de ortodoncia", "Ortodoncia", 35_000, 11],
  ["Alineadores", "Ortodoncia", 1_200_000, 0.4],
  ["Blanqueamiento", "Estética", 90_000, 3],
  ["Carilla", "Estética", 95_000, 1.6],
  ["Urgencia", "Urgencias", 30_000, 4],
];

const PESO_SUCURSAL: Record<string, number> = {
  "Clínica Centro": 11,
  "Clínica Norte": 7,
  "Clínica Sur": 4,
  "Clínica Belgrano": 5,
};

function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
function elegir<T>(r: () => number, items: readonly T[], pesos: readonly number[]): T {
  const total = pesos.reduce((a, b) => a + b, 0);
  let x = r() * total;
  for (let i = 0; i < items.length; i++) {
    x -= pesos[i] ?? 0;
    if (x <= 0) return items[i]!;
  }
  return items[items.length - 1]!;
}
export function iso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const cache = new Map<
  string,
  { hechos: Hecho[]; presupuestos: PresupuestoHecho[]; leads: LeadHecho[] }
>();

/** 12 meses hacia atrás y 3 semanas hacia adelante (turnos ya programados). */
export function generarHistorico(tenant: string, profesionales: string[], sucursales: string[]) {
  const hoy = new Date();
  const clave = `${tenant}|${profesionales.join(",")}|${sucursales.join(",")}|${iso(hoy)}`;
  const previo = cache.get(clave);
  if (previo) return previo;
  const r = mulberry32(hash(tenant) || 7);
  const profs = profesionales.length ? profesionales : ["Profesional"];
  // Cada profesional atiende en 1 o 2 sedes (estable).
  const sedesDe = new Map(
    profs.map((p, i) => [
      p,
      sucursales.filter((_, j) => j === i % sucursales.length || (i + j) % 3 === 0),
    ]),
  );
  const pacientes: {
    id: number;
    canal: string;
    cobertura: string;
    edad: string;
    genero: Hecho["genero"];
    sucursal: string;
    ultima: string;
  }[] = [];
  const hechos: Hecho[] = [];
  const presupuestos: PresupuestoHecho[] = [];
  const leads: LeadHecho[] = [];
  const inicio = new Date(hoy);
  inicio.setMonth(inicio.getMonth() - 12, 1);
  const fin = new Date(hoy);
  fin.setDate(fin.getDate() + 21);
  const hoyIso = iso(hoy);
  const horas = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
  const pesoHora = [3, 6, 9, 9, 7, 4, 4, 6, 7, 9, 9, 6];
  let n = 0;
  for (const d = new Date(inicio); d <= fin; d.setDate(d.getDate() + 1)) {
    const dow = d.getDay();
    if (dow === 0) continue;
    const f = iso(d);
    const mesesDesdeInicio =
      (d.getFullYear() - inicio.getFullYear()) * 12 + d.getMonth() - inicio.getMonth();
    const tendencia = 1 + mesesDesdeInicio * 0.018;
    const estacional =
      d.getMonth() === 0 ? 0.6 : d.getMonth() === 1 ? 0.85 : d.getMonth() === 11 ? 0.88 : 1;
    const diaFactor = dow === 6 ? 0.4 : dow === 1 ? 1.08 : 1;
    for (const suc of sucursales) {
      if (dow === 6 && suc !== sucursales[0]) continue;
      const base = (PESO_SUCURSAL[suc] ?? 8) * tendencia * estacional * diaFactor;
      const cant = Math.max(0, Math.round(base + (r() - 0.5) * 3));
      const profsSede = profs.filter((p) => sedesDe.get(p)?.includes(suc));
      for (let k = 0; k < cant; k++) {
        const futuro = f > hoyIso;
        const esNuevo = r() < 0.17 || pacientes.length < 40;
        let pac;
        if (esNuevo) {
          const canal = elegir(r, CANALES, [28, 20, 16, 12, 8, 10, 6]);
          pac = {
            id: 10_000 + pacientes.length,
            canal,
            cobertura: elegir(r, COBERTURAS, [42, 18, 13, 10, 8, 9]),
            edad: elegir(r, EDADES, [12, 22, 30, 22, 14]),
            genero: elegir(r, ["Femenino", "Masculino", "Otro"] as const, [56, 43, 1]),
            sucursal: suc,
            ultima: f,
          };
          pacientes.push(pac);
          leads.push({ fecha: f, canal, convertido: true, costo: 0 });
        } else {
          // Los pacientes vuelven con más probabilidad a su sede y si vinieron hace poco.
          let intento = 0;
          do {
            pac = pacientes[Math.floor(Math.pow(r(), 0.55) * pacientes.length)]!;
            intento++;
          } while (pac.sucursal !== suc && intento < 3);
        }
        const [trat, cat, precio] = esNuevo
          ? CATALOGO[0]!
          : elegir(
              r,
              CATALOGO,
              CATALOGO.map((c) => c[3]),
            );
        const ausente = (dow === 1 ? 0.13 : 0.085) + (pac.edad === "18-29" ? 0.04 : 0);
        const x = r();
        const estado: EstadoHecho = futuro
          ? "Programada"
          : x < ausente
            ? "Ausente"
            : x < ausente + 0.06
              ? "Cancelada"
              : "Atendida";
        const prof = profsSede.length ? profsSede[Math.floor(r() * profsSede.length)]! : profs[0]!;
        hechos.push({
          id: `h${++n}`,
          fecha: f,
          hora: elegir(r, horas, pesoHora),
          dow,
          sucursal: suc,
          profesional: prof,
          tratamiento: trat,
          categoria: cat,
          estado,
          paciente: pac.id,
          nuevo: esNuevo,
          canal: pac.canal,
          cobertura: pac.cobertura,
          edad: pac.edad,
          genero: pac.genero,
          monto: estado === "Atendida" ? Math.round((precio * (0.9 + r() * 0.2)) / 100) * 100 : 0,
          vivo: false,
        });
        if (estado === "Atendida") pac.ultima = f;
        // Presupuestos: salen de primeras consultas y de algunos controles.
        if (estado === "Atendida" && (esNuevo ? r() < 0.55 : r() < 0.05)) {
          const [pt] = elegir(
            r,
            CATALOGO.slice(5),
            CATALOGO.slice(5).map((c) => (c[2] > 200_000 ? 2 : 4)),
          );
          const monto =
            Math.round(
              ((CATALOGO.find((c) => c[0] === pt)?.[2] ?? 100_000) * (1 + r() * 1.6)) / 1000,
            ) * 1000;
          const y = r();
          presupuestos.push({
            fecha: f,
            sucursal: suc,
            profesional: prof,
            monto,
            tratamiento: pt,
            estado:
              f > iso(new Date(hoy.getTime() - 10 * 86_400_000)) && y < 0.45
                ? "Enviado"
                : y < 0.52
                  ? "Aprobado"
                  : "Rechazado",
          });
        }
      }
    }
    // Consultas que no se convirtieron (para la tasa de conversión de captación).
    if (f <= hoyIso) {
      const perdidos = Math.round(r() * 5);
      for (let i = 0; i < perdidos; i++)
        leads.push({
          fecha: f,
          canal: elegir(r, CANALES, [10, 26, 26, 6, 12, 16, 4]),
          convertido: false,
          costo: 0,
        });
    }
  }
  const salida = { hechos, presupuestos, leads };
  cache.set(clave, salida);
  return salida;
}

/* ───────────── Utilidades de cálculo ───────────── */

export function mesDe(f: string) {
  return f.slice(0, 7);
}
export function nombreMesCorto(mes: string) {
  const [a = "2026", m = "1"] = mes.split("-");
  return new Date(Number(a), Number(m) - 1, 1)
    .toLocaleDateString("es-AR", { month: "short" })
    .replace(".", "")
    .replace(/^\w/, (c) => c.toUpperCase());
}
export function nombreMesLargo(mes: string) {
  const [a = "2026", m = "1"] = mes.split("-");
  const t = new Date(Number(a), Number(m) - 1, 1).toLocaleDateString("es-AR", {
    month: "long",
    year: "numeric",
  });
  return t.charAt(0).toUpperCase() + t.slice(1);
}
export const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export function agrupar<T, K extends string | number>(xs: T[], k: (x: T) => K) {
  const m = new Map<K, T[]>();
  for (const x of xs) {
    const key = k(x);
    const arr = m.get(key);
    if (arr) arr.push(x);
    else m.set(key, [x]);
  }
  return m;
}
export function pct(a: number, b: number) {
  return b ? (a / b) * 100 : 0;
}
export function variacion(actual: number, anterior: number) {
  return anterior ? ((actual - anterior) / Math.abs(anterior)) * 100 : actual ? 100 : 0;
}
