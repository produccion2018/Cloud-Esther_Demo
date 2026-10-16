import { useMemo, useState } from "react";
import {
  ArrowLeftRight,
  Bone,
  Crown,
  Download,
  Layers,
  Lock,
  Plus,
  Scissors,
  Smile,
  Stethoscope,
  Trash2,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { Cambiar, ContextoPaciente, Registros } from "@/components/cloud-esther/PacienteSecciones";
import { useCloudEsther } from "@/lib/cloud-esther/data";
import { descargarPDF } from "@/lib/descargas";

/* Ubicación: src/components/cloud-esther/pacientes/FichasEspecialidad.tsx
   FICHAS CLÍNICAS POR ESPECIALIDAD (desde el plan Pro): Ortodoncia, Periodoncia, Endodoncia,
   Implantología, Prótesis y Cirugía. Cada una con sus campos técnicos (análisis de Angle y
   cefalometría, estadio y grado periodontal, pruebas diagnósticas pulpares y periapicales,
   evaluación ósea, evaluación protética, prequirúrgico y ejecución).
   - Cada evaluación queda con fecha y profesional; «Nueva evaluación» parte de la anterior.
   - Comparar: elige dos evaluaciones y resalta lo que cambió.
   - PDF de la evaluación con un click.
   Es dato de SALUD: la Secretaría no lo ve (lo oculta el servidor). */

type TipoCampo = "texto" | "numero" | "opciones" | "fecha" | "largo";
type Campo = { id: string; label: string; tipo: TipoCampo; opciones?: string[]; unidad?: string };
type Grupo = { titulo: string; campos: Campo[] };
type Especialidad = { id: string; nombre: string; icon: LucideIcon; color: string; grupos: Grupo[] };

export type FichaEspecialidad = {
  id: number;
  especialidad: string;
  fecha: string;
  profesional: string;
  valores: Record<string, string>;
};

const SI_NO = ["No", "Sí"];
const ANGLE = ["Clase I", "Clase II div. 1", "Clase II div. 2", "Clase III"];

const ESPECIALIDADES: Especialidad[] = [
  {
    id: "ortodoncia",
    nombre: "Ortodoncia",
    icon: Smile,
    color: "from-violet-500 to-fuchsia-500",
    grupos: [
      {
        titulo: "Análisis de Angle",
        campos: [
          { id: "molarDer", label: "Relación molar derecha", tipo: "opciones", opciones: ANGLE },
          { id: "molarIzq", label: "Relación molar izquierda", tipo: "opciones", opciones: ANGLE },
          { id: "caninaDer", label: "Relación canina derecha", tipo: "opciones", opciones: ANGLE },
          { id: "caninaIzq", label: "Relación canina izquierda", tipo: "opciones", opciones: ANGLE },
          { id: "overjet", label: "Resalte (overjet)", tipo: "numero", unidad: "mm" },
          { id: "overbite", label: "Sobremordida (overbite)", tipo: "numero", unidad: "mm" },
          { id: "lineaMedia", label: "Línea media", tipo: "opciones", opciones: ["Centrada", "Desviada a derecha", "Desviada a izquierda"] },
          { id: "cruzada", label: "Mordida cruzada", tipo: "opciones", opciones: ["No", "Anterior", "Posterior unilateral", "Posterior bilateral"] },
          { id: "apinSup", label: "Apiñamiento superior", tipo: "numero", unidad: "mm" },
          { id: "apinInf", label: "Apiñamiento inferior", tipo: "numero", unidad: "mm" },
          { id: "perfil", label: "Perfil", tipo: "opciones", opciones: ["Recto", "Convexo", "Cóncavo"] },
        ],
      },
      {
        titulo: "Cefalometría",
        campos: [
          { id: "sna", label: "SNA", tipo: "numero", unidad: "°" },
          { id: "snb", label: "SNB", tipo: "numero", unidad: "°" },
          { id: "anb", label: "ANB", tipo: "numero", unidad: "°" },
          { id: "fma", label: "FMA", tipo: "numero", unidad: "°" },
          { id: "impa", label: "IMPA", tipo: "numero", unidad: "°" },
        ],
      },
      {
        titulo: "Tratamiento",
        campos: [
          { id: "aparato", label: "Aparatología", tipo: "opciones", opciones: ["Brackets metálicos", "Brackets estéticos", "Autoligado", "Alineadores", "Removible", "Contención"] },
          { id: "fase", label: "Fase", tipo: "opciones", opciones: ["Diagnóstico", "Alineación y nivelación", "Cierre de espacios", "Finalización", "Contención"] },
          { id: "arcoSup", label: "Arco superior", tipo: "texto" },
          { id: "arcoInf", label: "Arco inferior", tipo: "texto" },
          { id: "obs", label: "Observaciones", tipo: "largo" },
        ],
      },
    ],
  },
  {
    id: "periodoncia",
    nombre: "Periodoncia",
    icon: Layers,
    color: "from-rose-500 to-pink-500",
    grupos: [
      {
        titulo: "Índices",
        campos: [
          { id: "placa", label: "Índice de placa (O'Leary)", tipo: "numero", unidad: "%" },
          { id: "sangrado", label: "Índice de sangrado", tipo: "numero", unidad: "%" },
          { id: "psMedia", label: "Profundidad de sondaje media", tipo: "numero", unidad: "mm" },
          { id: "sitios5", label: "Sitios con PS ≥ 5 mm", tipo: "numero" },
        ],
      },
      {
        titulo: "Clasificación (2017)",
        campos: [
          { id: "estadio", label: "Estadio", tipo: "opciones", opciones: ["Salud / gingivitis", "Estadio I", "Estadio II", "Estadio III", "Estadio IV"] },
          { id: "grado", label: "Grado", tipo: "opciones", opciones: ["Grado A", "Grado B", "Grado C"] },
          { id: "extension", label: "Extensión", tipo: "opciones", opciones: ["Localizada", "Generalizada", "Patrón molar-incisivo"] },
          { id: "tabaco", label: "Fumador/a", tipo: "opciones", opciones: ["No", "< 10 cigarrillos/día", "≥ 10 cigarrillos/día"] },
          { id: "diabetes", label: "Diabetes", tipo: "opciones", opciones: ["No", "Controlada", "No controlada"] },
        ],
      },
      {
        titulo: "Plan",
        campos: [
          { id: "fase", label: "Fase", tipo: "opciones", opciones: ["Higiénica", "Raspaje y alisado", "Reevaluación", "Quirúrgica", "Mantenimiento"] },
          { id: "proximo", label: "Próximo mantenimiento", tipo: "fecha" },
          { id: "obs", label: "Diagnóstico y observaciones", tipo: "largo" },
        ],
      },
    ],
  },
  {
    id: "endodoncia",
    nombre: "Endodoncia",
    icon: Zap,
    color: "from-amber-500 to-orange-500",
    grupos: [
      {
        titulo: "Pruebas diagnósticas",
        campos: [
          { id: "pieza", label: "Pieza", tipo: "texto" },
          { id: "dolor", label: "Dolor", tipo: "opciones", opciones: ["Ninguno", "Provocado", "Espontáneo", "Nocturno / irradiado"] },
          { id: "frio", label: "Prueba de frío", tipo: "opciones", opciones: ["Normal", "Exagerada que cede", "Exagerada que persiste", "Sin respuesta"] },
          { id: "calor", label: "Prueba de calor", tipo: "opciones", opciones: ["Normal", "Exagerada", "Sin respuesta"] },
          { id: "electrica", label: "Prueba eléctrica", tipo: "opciones", opciones: ["No realizada", "Responde", "No responde"] },
          { id: "percusion", label: "Percusión", tipo: "opciones", opciones: ["Negativa", "Positiva"] },
          { id: "palpacion", label: "Palpación", tipo: "opciones", opciones: ["Negativa", "Positiva"] },
          { id: "movilidad", label: "Movilidad", tipo: "opciones", opciones: ["0", "1", "2", "3"] },
        ],
      },
      {
        titulo: "Diagnóstico",
        campos: [
          { id: "pulpar", label: "Diagnóstico pulpar", tipo: "opciones", opciones: ["Pulpa normal", "Pulpitis reversible", "Pulpitis irreversible sintomática", "Pulpitis irreversible asintomática", "Necrosis pulpar", "Previamente tratado", "Tratamiento previamente iniciado"] },
          { id: "periapical", label: "Diagnóstico periapical", tipo: "opciones", opciones: ["Tejidos apicales normales", "Periodontitis apical sintomática", "Periodontitis apical asintomática", "Absceso apical agudo", "Absceso apical crónico", "Osteítis condensante"] },
        ],
      },
      {
        titulo: "Tratamiento",
        campos: [
          { id: "conductos", label: "Cantidad de conductos", tipo: "numero" },
          { id: "lt", label: "Longitudes de trabajo", tipo: "texto" },
          { id: "sistema", label: "Sistema / técnica", tipo: "texto" },
          { id: "obturacion", label: "Obturación", tipo: "texto" },
          { id: "control", label: "Control radiográfico", tipo: "fecha" },
          { id: "obs", label: "Observaciones", tipo: "largo" },
        ],
      },
    ],
  },
  {
    id: "implantologia",
    nombre: "Implantología",
    icon: Bone,
    color: "from-sky-500 to-indigo-500",
    grupos: [
      {
        titulo: "Evaluación ósea",
        campos: [
          { id: "zona", label: "Zona / pieza", tipo: "texto" },
          { id: "densidad", label: "Densidad ósea (Misch)", tipo: "opciones", opciones: ["D1", "D2", "D3", "D4"] },
          { id: "altura", label: "Altura ósea disponible", tipo: "numero", unidad: "mm" },
          { id: "ancho", label: "Ancho óseo", tipo: "numero", unidad: "mm" },
          { id: "injerto", label: "Necesita", tipo: "opciones", opciones: ["Nada", "Regeneración ósea guiada", "Elevación de seno", "Injerto en bloque"] },
        ],
      },
      {
        titulo: "Implante",
        campos: [
          { id: "marca", label: "Marca y modelo", tipo: "texto" },
          { id: "diametro", label: "Diámetro", tipo: "numero", unidad: "mm" },
          { id: "longitud", label: "Longitud", tipo: "numero", unidad: "mm" },
          { id: "torque", label: "Torque de inserción", tipo: "numero", unidad: "Ncm" },
          { id: "isq", label: "Estabilidad (ISQ)", tipo: "numero" },
          { id: "carga", label: "Carga", tipo: "opciones", opciones: ["Inmediata", "Temprana", "Convencional"] },
          { id: "cirugia", label: "Fecha de cirugía", tipo: "fecha" },
        ],
      },
      {
        titulo: "Seguimiento",
        campos: [
          { id: "perdida", label: "Pérdida ósea marginal", tipo: "numero", unidad: "mm" },
          { id: "tejidos", label: "Tejidos periimplantarios", tipo: "opciones", opciones: ["Sanos", "Mucositis", "Periimplantitis"] },
          { id: "obs", label: "Observaciones", tipo: "largo" },
        ],
      },
    ],
  },
  {
    id: "protesis",
    nombre: "Prótesis",
    icon: Crown,
    color: "from-emerald-500 to-teal-500",
    grupos: [
      {
        titulo: "Evaluación protética",
        campos: [
          { id: "tipo", label: "Tipo", tipo: "opciones", opciones: ["Corona unitaria", "Puente fijo", "Removible parcial", "Completa", "Sobre implantes", "Carilla"] },
          { id: "piezas", label: "Piezas", tipo: "texto" },
          { id: "kennedy", label: "Clase de Kennedy", tipo: "opciones", opciones: ["No aplica", "Clase I", "Clase II", "Clase III", "Clase IV"] },
          { id: "material", label: "Material", tipo: "opciones", opciones: ["Disilicato de litio", "Zirconio", "Metal-porcelana", "Resina", "Acrílico", "Cromo-cobalto"] },
          { id: "color", label: "Color (guía Vita)", tipo: "texto" },
          { id: "dv", label: "Dimensión vertical", tipo: "opciones", opciones: ["Conservada", "Disminuida", "Aumentada"] },
          { id: "rc", label: "Relación céntrica registrada", tipo: "opciones", opciones: SI_NO },
        ],
      },
      {
        titulo: "Etapas",
        campos: [
          { id: "etapa", label: "Etapa", tipo: "opciones", opciones: ["Preparación", "Impresión", "Prueba de estructura", "Prueba de bizcocho", "Cementado / instalación", "Control"] },
          { id: "laboratorio", label: "Laboratorio", tipo: "texto" },
          { id: "ajustes", label: "Ajustes realizados", tipo: "largo" },
        ],
      },
    ],
  },
  {
    id: "cirugia",
    nombre: "Cirugía",
    icon: Scissors,
    color: "from-slate-500 to-slate-700",
    grupos: [
      {
        titulo: "Prequirúrgico",
        campos: [
          { id: "procedimiento", label: "Procedimiento", tipo: "texto" },
          { id: "zona", label: "Pieza / zona", tipo: "texto" },
          { id: "asa", label: "Riesgo ASA", tipo: "opciones", opciones: ["ASA I", "ASA II", "ASA III", "ASA IV"] },
          { id: "anticoag", label: "Anticoagulantes / antiagregantes", tipo: "opciones", opciones: SI_NO },
          { id: "premed", label: "Medicación previa", tipo: "texto" },
          { id: "consentimiento", label: "Consentimiento firmado", tipo: "opciones", opciones: SI_NO },
        ],
      },
      {
        titulo: "Ejecución",
        campos: [
          { id: "anestesia", label: "Anestesia (técnica y carpules)", tipo: "texto" },
          { id: "tecnica", label: "Técnica", tipo: "texto" },
          { id: "inicio", label: "Hora de inicio", tipo: "texto" },
          { id: "fin", label: "Hora de fin", tipo: "texto" },
          { id: "sutura", label: "Sutura", tipo: "texto" },
          { id: "complicaciones", label: "Complicaciones", tipo: "largo" },
        ],
      },
      {
        titulo: "Postoperatorio",
        campos: [
          { id: "indicaciones", label: "Indicaciones", tipo: "largo" },
          { id: "control", label: "Control", tipo: "fecha" },
          { id: "evolucion", label: "Evolución", tipo: "largo" },
        ],
      },
    ],
  },
];

const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const fechaCorta = (iso: string) => (iso ? iso.split("-").reverse().join("/") : "");
const esc = (t: string) =>
  t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);
const CAMPO =
  "mt-1 h-10 w-full rounded-xl border border-primary/15 bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary/45 focus:ring-4 focus:ring-primary/10";

export function FichasEspecialidadSec({
  datos,
  cambiar,
  onToast,
  contexto,
}: {
  datos: Registros;
  cambiar: Cambiar;
  onToast: (m: string) => void;
  contexto?: ContextoPaciente | undefined;
}) {
  const { plan } = useCloudEsther();
  const fichas = datos.fichasEspecialidad ?? [];
  const [espId, setEspId] = useState(ESPECIALIDADES[0]!.id);
  const esp = ESPECIALIDADES.find((e) => e.id === espId)!;
  const deEsta = useMemo(
    () => fichas.filter((f) => f.especialidad === espId).sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id),
    [fichas, espId],
  );
  const [actualId, setActualId] = useState<number | null>(null);
  const [comparar, setComparar] = useState<number | null>(null);
  const actual = deEsta.find((f) => f.id === actualId) ?? deEsta[0];
  const otra = deEsta.find((f) => f.id === comparar && f.id !== actual?.id);

  if (plan === "inicial")
    return (
      <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-primary/25 bg-gradient-to-br from-primary/[0.05] to-fuchsia-500/[0.05] px-6 py-12 text-center">
        <span className="grid size-14 place-items-center rounded-full bg-gradient-to-br from-primary to-fuchsia-500 text-white shadow-lg">
          <Lock className="size-6" />
        </span>
        <p className="font-display text-lg font-bold">Fichas por especialidad: desde el plan Pro</p>
        <p className="max-w-md text-sm text-muted-foreground">
          Ortodoncia, Periodoncia, Endodoncia, Implantología, Prótesis y Cirugía con sus campos técnicos y comparación entre evaluaciones.
        </p>
      </div>
    );

  const guardar = (f: FichaEspecialidad) =>
    cambiar("fichasEspecialidad", (prev) => (prev ?? []).map((x) => (x.id === f.id ? f : x)));
  const nueva = () => {
    const f: FichaEspecialidad = {
      id: Date.now(),
      especialidad: espId,
      fecha: hoyISO(),
      profesional: actual?.profesional ?? "",
      valores: { ...(actual?.valores ?? {}) },
    };
    cambiar("fichasEspecialidad", (prev) => [...(prev ?? []), f]);
    setActualId(f.id);
    setComparar(actual?.id ?? null);
    onToast(actual ? "Nueva evaluación: parte de la anterior, cambiá lo que evolucionó" : `Ficha de ${esp.nombre} creada`);
  };
  const borrar = (f: FichaEspecialidad) => {
    cambiar("fichasEspecialidad", (prev) => (prev ?? []).filter((x) => x.id !== f.id));
    setActualId(null);
    onToast("Evaluación eliminada");
  };
  const pdf = async (f: FichaEspecialidad) => {
    const grupos = esp.grupos
      .map(
        (g) =>
          `<h2>${esc(g.titulo)}</h2><table>${g.campos
            .map((c) => `<tr><th>${esc(c.label)}</th><td>${esc(f.valores[c.id] ?? "") || "—"}${f.valores[c.id] && c.unidad ? ` ${esc(c.unidad)}` : ""}</td></tr>`)
            .join("")}</table>`,
      )
      .join("");
    const html = `<!doctype html><html><head><meta charset="utf-8"><style>
      body{font-family:Inter,Arial,sans-serif;color:#1e1b2e;margin:0;padding:34px 40px;font-size:12px}
      .cab{background:linear-gradient(118deg,#4c1d95,#7c3aed 50%,#c026d3);color:#fff;border-radius:18px;padding:20px 24px;margin-bottom:14px}
      .cab p{margin:0;opacity:.8;font-size:10px;letter-spacing:.18em;text-transform:uppercase;font-weight:700}.cab h1{margin:4px 0 2px;font-size:21px}
      h2{font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#6d28d9;margin:18px 0 6px}
      table{width:100%;border-collapse:collapse}th{text-align:left;font-weight:600;color:#6b6189;width:42%;padding:6px 8px;border-bottom:1px solid #f1eefb}td{padding:6px 8px;border-bottom:1px solid #f1eefb}
      .firma{margin-top:60px;width:260px;border-top:1px solid #9e93bd;padding-top:6px;text-align:center;color:#6b6189}
    </style></head><body><div class="cab"><p>Ficha de ${esc(esp.nombre)}</p><h1>${esc(contexto?.paciente ?? "Paciente")}</h1><span>Evaluación del ${fechaCorta(f.fecha)}${f.profesional ? ` · ${esc(f.profesional)}` : ""}</span></div>
    ${grupos}<div class="firma">Firma y sello del profesional</div></body></html>`;
    const ok = await descargarPDF(html, `${esp.nombre} ${contexto?.paciente ?? ""} ${f.fecha}`);
    onToast(ok ? "PDF descargado" : "No se pudo armar el PDF");
  };

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-3xl bg-[linear-gradient(118deg,#4c1d95,#7c3aed_45%,#c026d3)] px-5 py-4 text-white shadow-[0_24px_50px_-30px_rgba(91,33,182,0.9)]">
        <div aria-hidden className="pointer-events-none absolute -right-10 -top-16 size-44 rounded-full bg-fuchsia-300/30 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:16px_16px] [mask-image:linear-gradient(100deg,transparent_45%,black)]" />
        <div className="relative flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl border border-white/30 bg-white/15">
            <Stethoscope className="size-5" />
          </span>
          <div>
            <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-white/70">Fichas clínicas</p>
            <p className="font-display text-lg font-bold">Por especialidad{contexto?.paciente ? ` · ${contexto.paciente}` : ""}</p>
          </div>
        </div>
      </div>

      {/* Especialidades */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {ESPECIALIDADES.map((e) => {
          const n = fichas.filter((f) => f.especialidad === e.id).length;
          const on = e.id === espId;
          return (
            <button
              key={e.id}
              type="button"
              onClick={() => {
                setEspId(e.id);
                setActualId(null);
                setComparar(null);
              }}
              className={`group relative flex flex-col items-center gap-1.5 overflow-hidden rounded-2xl border p-3 text-center transition duration-300 ${
                on ? "border-transparent bg-card shadow-[0_16px_34px_-20px_rgba(124,58,237,0.8)] ring-2 ring-primary" : "border-primary/10 bg-card hover:-translate-y-0.5 hover:border-primary/30"
              }`}
            >
              <span className={`grid size-10 place-items-center rounded-2xl bg-gradient-to-br ${e.color} text-white shadow-md transition group-hover:scale-110`}>
                <e.icon className="size-5" />
              </span>
              <span className="text-xs font-bold">{e.nombre}</span>
              <span className="text-[10.5px] text-muted-foreground">{n ? `${n} evaluaciones` : "Sin evaluaciones"}</span>
            </button>
          );
        })}
      </div>

      {!actual ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-primary/25 bg-gradient-to-br from-primary/[0.04] to-fuchsia-500/[0.04] px-6 py-10 text-center">
          <span className={`grid size-14 place-items-center rounded-full bg-gradient-to-br ${esp.color} text-white shadow-lg`}>
            <esp.icon className="size-6" />
          </span>
          <p className="font-display text-base font-bold">Sin ficha de {esp.nombre}</p>
          <p className="max-w-md text-xs text-muted-foreground">
            {esp.grupos.map((g) => g.titulo).join(" · ")}
          </p>
          <button type="button" onClick={nueva} className="btn-ce !min-h-11">
            <Plus className="size-4" /> Primera evaluación
          </button>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <div className="-mx-1 flex flex-1 gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
              {deEsta.map((f, i) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setActualId(f.id)}
                  className={`shrink-0 rounded-2xl px-3.5 py-2 text-left text-xs transition ${
                    f.id === actual.id ? "bg-gradient-to-r from-primary to-fuchsia-500 text-white shadow-[0_10px_22px_-12px_rgba(124,58,237,0.9)]" : "border border-primary/12 bg-card hover:border-primary/30"
                  }`}
                >
                  <span className="block font-bold">{fechaCorta(f.fecha)}</span>
                  <span className={f.id === actual.id ? "text-white/80" : "text-muted-foreground"}>{i === 0 ? "Última" : `Evaluación ${deEsta.length - i}`}</span>
                </button>
              ))}
            </div>
            {deEsta.length > 1 && (
              <label className="inline-flex items-center gap-2 rounded-xl border border-primary/12 bg-card px-2.5 py-1.5 text-xs font-semibold">
                <ArrowLeftRight className="size-4 text-primary" /> Comparar con
                <select value={comparar ?? ""} onChange={(e) => setComparar(e.target.value ? Number(e.target.value) : null)} className="h-8 rounded-lg bg-transparent outline-none">
                  <option value="">—</option>
                  {deEsta
                    .filter((f) => f.id !== actual.id)
                    .map((f) => (
                      <option key={f.id} value={f.id}>
                        {fechaCorta(f.fecha)}
                      </option>
                    ))}
                </select>
              </label>
            )}
            <button type="button" onClick={() => void pdf(actual)} className="btn-ce-outline !min-h-10">
              <Download className="size-4" /> PDF
            </button>
            <button type="button" onClick={nueva} className="btn-ce !min-h-10">
              <Plus className="size-4" /> Nueva evaluación
            </button>
          </div>

          <div className="grid gap-2 sm:grid-cols-[170px_1fr_auto]">
            <label className="text-[11px] font-semibold text-muted-foreground">
              Fecha
              <input type="date" value={actual.fecha} onChange={(e) => e.target.value && guardar({ ...actual, fecha: e.target.value })} className={CAMPO} />
            </label>
            <label className="text-[11px] font-semibold text-muted-foreground">
              Profesional
              <input value={actual.profesional} onChange={(e) => guardar({ ...actual, profesional: e.target.value.slice(0, 80) })} placeholder="Quién evaluó" className={CAMPO} />
            </label>
            <button type="button" onClick={() => borrar(actual)} className="mt-auto grid h-10 place-items-center rounded-xl px-3 text-muted-foreground hover:bg-rose-50 hover:text-rose-600" aria-label="Eliminar evaluación">
              <Trash2 className="size-4" />
            </button>
          </div>

          {otra && (
            <p className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50/70 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
              <ArrowLeftRight className="size-4" /> Comparando con la evaluación del {fechaCorta(otra.fecha)}: lo que cambió queda resaltado y debajo ves el valor anterior.
            </p>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            {esp.grupos.map((g) => (
              <section key={g.titulo} className={`rounded-3xl border border-primary/10 bg-card p-4 shadow-[0_16px_36px_-30px_rgba(76,29,149,0.7)] ${g.campos.length > 8 ? "lg:col-span-2" : ""}`}>
                <p className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
                  <span className={`h-1 w-4 rounded-full bg-gradient-to-r ${esp.color}`} />
                  {g.titulo}
                </p>
                <div className={`grid gap-x-3 gap-y-2.5 ${g.campos.length > 8 ? "sm:grid-cols-2 xl:grid-cols-3" : "sm:grid-cols-2"}`}>
                  {g.campos.map((c) => {
                    const v = actual.valores[c.id] ?? "";
                    const antes = otra?.valores[c.id] ?? "";
                    const cambio = !!otra && antes !== v;
                    const set = (x: string) => guardar({ ...actual, valores: { ...actual.valores, [c.id]: x.slice(0, 600) } });
                    return (
                      <label key={c.id} className={`text-[11px] font-semibold text-muted-foreground ${c.tipo === "largo" ? "sm:col-span-full" : ""}`}>
                        <span className="flex items-center justify-between gap-2">
                          {c.label}
                          {c.unidad && <span className="text-[10px] font-normal">{c.unidad}</span>}
                        </span>
                        {c.tipo === "opciones" ? (
                          <select value={v} onChange={(e) => set(e.target.value)} className={`${CAMPO} ${cambio ? "!border-amber-400 !bg-amber-50 dark:!bg-amber-500/10" : ""}`}>
                            <option value="">—</option>
                            {c.opciones!.map((o) => (
                              <option key={o}>{o}</option>
                            ))}
                          </select>
                        ) : c.tipo === "largo" ? (
                          <textarea value={v} onChange={(e) => set(e.target.value)} rows={2} className={`${CAMPO} !h-auto py-2 ${cambio ? "!border-amber-400 !bg-amber-50 dark:!bg-amber-500/10" : ""}`} />
                        ) : (
                          <input
                            type={c.tipo === "fecha" ? "date" : "text"}
                            inputMode={c.tipo === "numero" ? "decimal" : undefined}
                            value={v}
                            onChange={(e) => set(c.tipo === "numero" ? e.target.value.replace(/[^0-9.,-]/g, "") : e.target.value)}
                            className={`${CAMPO} ${cambio ? "!border-amber-400 !bg-amber-50 dark:!bg-amber-500/10" : ""}`}
                          />
                        )}
                        {cambio && <span className="mt-0.5 block text-[10.5px] font-normal text-amber-700 dark:text-amber-300">Antes: {antes || "—"}</span>}
                      </label>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
