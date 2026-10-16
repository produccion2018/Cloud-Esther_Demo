import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Download, Eraser, FileSignature, PenLine, ShieldCheck, X } from "lucide-react";

import { descargarPDF } from "@/lib/descargas";

/* Ubicación: src/components/cloud-esther/pacientes/ConsentimientoDigital.tsx
   CONSENTIMIENTOS DIGITALES con firma en pantalla (todos los planes):
   1. Se elige el modelo (general, endodoncia, cirugía, implantes, ortodoncia, blanqueamiento).
      Los modelos son una BASE: cada clínica debe revisarlos con su asesor legal.
   2. El paciente lo lee en la tablet / PC y firma con el dedo o el mouse.
   3. Se guarda una «foto legal» (snapshot) inmutable: el texto exacto, la versión del modelo, la
      firma, quién firmó (nombre y documento), fecha y hora, el dispositivo y una huella SHA-256
      de todo eso (si algo se cambiara después, la huella ya no coincide).
   4. Se descarga el PDF firmado.
   TODO backend / Cloudinary: la imagen de la firma pasa al almacenamiento de archivos de la
   clínica; hoy viaja dentro de la ficha (pesa pocos KB). */

export type FirmaConsentimiento = {
  modelo: string;
  version: string;
  texto: string;
  firmante: string;
  documento: string;
  /** Imagen PNG de la firma (data URL) */
  firma: string;
  fechaHora: string;
  dispositivo: string;
  huella: string;
};

type Modelo = { id: string; titulo: string; version: string; cuerpo: string };

const MODELOS: Modelo[] = [
  {
    id: "general",
    titulo: "Consentimiento informado general",
    version: "1.0",
    cuerpo:
      "Declaro que el/la profesional me explicó en lenguaje claro mi diagnóstico, el tratamiento propuesto, sus beneficios, los riesgos frecuentes y los poco frecuentes pero graves, las alternativas posibles (incluida la de no tratarme) y los cuidados posteriores. Pude hacer todas las preguntas que quise y me fueron respondidas. Sé que puedo revocar este consentimiento en cualquier momento antes del procedimiento, sin que eso afecte mi atención futura. Autorizo la realización del tratamiento y el registro de imágenes clínicas en mi historia clínica.",
  },
  {
    id: "endodoncia",
    titulo: "Consentimiento para tratamiento de conducto (endodoncia)",
    version: "1.0",
    cuerpo:
      "Se me explicó que la endodoncia consiste en limpiar, conformar y sellar los conductos de la pieza indicada. Comprendo que puede haber molestias posteriores, fractura de instrumentos dentro del conducto, perforaciones, necesidad de retratamiento o cirugía apical, y que la pieza tratada suele requerir una restauración o corona posterior para evitar su fractura. Conozco las alternativas, incluida la extracción. Autorizo el tratamiento.",
  },
  {
    id: "cirugia",
    titulo: "Consentimiento para cirugía bucal / extracción",
    version: "1.0",
    cuerpo:
      "Se me explicó el procedimiento quirúrgico, la anestesia local a utilizar y los posibles riesgos: dolor, inflamación, hematoma, sangrado, infección, alveolitis, trismus, comunicación con el seno maxilar y alteraciones transitorias o, con poca frecuencia, permanentes de la sensibilidad del labio, la lengua o el mentón. Informé mis enfermedades, alergias y la medicación que tomo (incluidos anticoagulantes). Me comprometo a cumplir las indicaciones postoperatorias. Autorizo la cirugía.",
  },
  {
    id: "implantes",
    titulo: "Consentimiento para implantes dentales",
    version: "1.0",
    cuerpo:
      "Se me explicó que el tratamiento con implantes incluye una o más cirugías y un período de integración antes de la prótesis. Comprendo que el éxito no puede garantizarse, que puede producirse la falta de integración o pérdida del implante, inflamación, infección, sangrado, lesión de estructuras vecinas o necesidad de injertos. Sé que fumar, la diabetes no controlada y la falta de higiene aumentan el riesgo. Me comprometo a asistir a los controles. Autorizo el tratamiento.",
  },
  {
    id: "ortodoncia",
    titulo: "Consentimiento para tratamiento de ortodoncia",
    version: "1.0",
    cuerpo:
      "Se me explicó la duración estimada del tratamiento, la aparatología a usar y que el resultado depende en gran parte de mi colaboración (higiene, uso de elásticos o alineadores y asistencia a los controles). Comprendo los riesgos: descalcificaciones o caries por mala higiene, reabsorción radicular, molestias, problemas articulares y recidiva si no uso la contención indicada. Autorizo el tratamiento.",
  },
  {
    id: "blanqueamiento",
    titulo: "Consentimiento para blanqueamiento dental",
    version: "1.0",
    cuerpo:
      "Se me explicó que el blanqueamiento aclara el color de los dientes naturales pero no el de restauraciones, coronas o carillas, que el resultado varía en cada persona y no es permanente. Puede haber sensibilidad dentaria y molestias en las encías de forma transitoria. Me comprometo a seguir las indicaciones. Autorizo el tratamiento.",
  },
];

async function sha256(texto: string) {
  try {
    const datos = new TextEncoder().encode(texto);
    const hash = await crypto.subtle.digest("SHA-256", datos);
    return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return "";
  }
}

const esc = (t: string) =>
  t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);

/** Pad de firma: dedo, lápiz o mouse (pointer events), con trazo suave. */
function PadFirma({ onCambio }: { onCambio: (png: string | null) => void }) {
  const lienzo = useRef<HTMLCanvasElement>(null);
  const dibujando = useRef(false);
  const ultimo = useRef<{ x: number; y: number } | null>(null);
  const [vacio, setVacio] = useState(true);

  useEffect(() => {
    const c = lienzo.current;
    if (!c) return;
    const r = c.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = Math.round(r.width * dpr);
    c.height = Math.round(r.height * dpr);
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1e1b4b";
    ctx.lineWidth = 2.4;
  }, []);

  const punto = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const limpiar = () => {
    const c = lienzo.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.restore();
    setVacio(true);
    onCambio(null);
  };

  return (
    <div>
      <div className="relative overflow-hidden rounded-2xl border-2 border-dashed border-primary/30 bg-[linear-gradient(#fff,#fff)] dark:bg-white">
        <canvas
          ref={lienzo}
          aria-label="Espacio para firmar"
          className="block h-44 w-full touch-none cursor-crosshair"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            dibujando.current = true;
            ultimo.current = punto(e);
          }}
          onPointerMove={(e) => {
            if (!dibujando.current) return;
            const ctx = lienzo.current?.getContext("2d");
            const p = punto(e);
            if (!ctx || !ultimo.current) return;
            ctx.beginPath();
            ctx.moveTo(ultimo.current.x, ultimo.current.y);
            ctx.quadraticCurveTo(ultimo.current.x, ultimo.current.y, (ultimo.current.x + p.x) / 2, (ultimo.current.y + p.y) / 2);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
            ultimo.current = p;
            if (vacio) setVacio(false);
          }}
          onPointerUp={() => {
            dibujando.current = false;
            ultimo.current = null;
            if (!vacio && lienzo.current) onCambio(lienzo.current.toDataURL("image/png"));
          }}
        />
        <span aria-hidden className="pointer-events-none absolute inset-x-8 bottom-10 border-b border-slate-300" />
        {vacio && (
          <span className="pointer-events-none absolute inset-0 grid place-items-center text-sm font-semibold text-slate-400">
            <span className="inline-flex items-center gap-2">
              <PenLine className="size-4" /> Firmá acá con el dedo o el mouse
            </span>
          </span>
        )}
      </div>
      <button type="button" onClick={limpiar} className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary">
        <Eraser className="size-3.5" /> Borrar y volver a firmar
      </button>
    </div>
  );
}

export function FirmarConsentimiento({
  paciente,
  clinica,
  onCerrar,
  onFirmado,
}: {
  paciente: string;
  clinica?: string | undefined;
  onCerrar: () => void;
  onFirmado: (titulo: string, firma: FirmaConsentimiento) => void;
}) {
  const [modeloId, setModeloId] = useState(MODELOS[0]!.id);
  const [detalle, setDetalle] = useState("");
  const [firmante, setFirmante] = useState(paciente);
  const [documento, setDocumento] = useState("");
  const [acepto, setAcepto] = useState(false);
  const [png, setPng] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const modelo = MODELOS.find((m) => m.id === modeloId)!;
  const texto = `${modelo.cuerpo}${detalle.trim() ? `\n\nProcedimiento / pieza: ${detalle.trim()}` : ""}`;
  const listo = !!png && acepto && firmante.trim().length > 2;

  const confirmar = async () => {
    if (!listo || !png) return;
    setGuardando(true);
    const fechaHora = new Date().toISOString();
    const dispositivo = typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 160) : "";
    const huella = await sha256([modelo.id, modelo.version, texto, firmante.trim(), documento.trim(), png, fechaHora].join("|"));
    onFirmado(modelo.titulo, {
      modelo: modelo.id,
      version: modelo.version,
      texto,
      firmante: firmante.trim(),
      documento: documento.trim(),
      firma: png,
      fechaHora,
      dispositivo,
      huella,
    });
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-[radial-gradient(circle_at_50%_0%,rgba(124,58,237,0.35),rgba(15,5,30,0.55))] backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={onCerrar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Firmar consentimiento"
        onMouseDown={(e) => e.stopPropagation()}
        className="max-h-[94vh] w-full overflow-y-auto rounded-t-[28px] border border-primary/15 bg-card shadow-[0_40px_90px_-30px_rgba(76,29,149,0.8)] sm:max-w-2xl sm:rounded-[28px]"
      >
        <div className="relative overflow-hidden bg-[linear-gradient(118deg,#4c1d95,#7c3aed_45%,#c026d3)] px-5 py-5 text-white sm:px-7">
          <div aria-hidden className="pointer-events-none absolute -right-10 -top-14 size-44 rounded-full bg-fuchsia-300/30 blur-3xl" />
          <div className="relative flex items-start gap-3">
            <span className="grid size-12 place-items-center rounded-2xl border border-white/30 bg-white/15">
              <FileSignature className="size-6" />
            </span>
            <div className="flex-1">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.2em] text-white/70">Consentimiento digital</p>
              <h2 className="font-display text-xl font-bold">{paciente}</h2>
              <p className="text-sm text-white/85">Leelo con el paciente y firmá en pantalla.</p>
            </div>
            <button type="button" onClick={onCerrar} aria-label="Cerrar" className="grid size-9 place-items-center rounded-xl bg-white/15 hover:bg-white/25">
              <X className="size-4" />
            </button>
          </div>
        </div>
        <div className="space-y-4 p-5 sm:p-7">
          <label className="block text-xs font-semibold">
            Modelo
            <select value={modeloId} onChange={(e) => setModeloId(e.target.value)} className="mt-1 h-11 w-full rounded-xl border border-primary/15 bg-card px-3 text-sm">
              {MODELOS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.titulo}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-semibold">
            Procedimiento o pieza (opcional)
            <input value={detalle} onChange={(e) => setDetalle(e.target.value.slice(0, 160))} placeholder="Ej.: Endodoncia pieza 36" className="mt-1 h-11 w-full rounded-xl border border-primary/15 bg-card px-3 text-sm" />
          </label>
          <div className="max-h-48 overflow-y-auto rounded-2xl border border-primary/10 bg-muted/30 p-4 text-sm leading-relaxed">
            <p className="mb-2 font-display font-bold">{modelo.titulo}</p>
            <p className="whitespace-pre-line text-foreground/85">{texto}</p>
            <p className="mt-3 text-[11px] text-muted-foreground">
              {clinica ? `${clinica} · ` : ""}Modelo versión {modelo.version}. Es una base: revisalo con tu asesor legal.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold">
              Firma (nombre y apellido)
              <input value={firmante} onChange={(e) => setFirmante(e.target.value.slice(0, 80))} className="mt-1 h-11 w-full rounded-xl border border-primary/15 bg-card px-3 text-sm" />
            </label>
            <label className="text-xs font-semibold">
              Documento
              <input value={documento} onChange={(e) => setDocumento(e.target.value.replace(/[^0-9a-zA-Z.-]/g, "").slice(0, 20))} className="mt-1 h-11 w-full rounded-xl border border-primary/15 bg-card px-3 text-sm" />
            </label>
          </div>
          <PadFirma onCambio={setPng} />
          <label className="flex items-start gap-2.5 rounded-2xl border border-primary/12 bg-primary/[0.04] p-3 text-sm">
            <input type="checkbox" checked={acepto} onChange={(e) => setAcepto(e.target.checked)} className="mt-0.5 size-4 accent-[#7c3aed]" />
            <span>Leí el consentimiento, me explicaron el tratamiento y lo acepto.</span>
          </label>
          <div className="flex gap-2">
            <button type="button" onClick={onCerrar} className="btn-ce-outline !min-h-11 flex-1 justify-center">
              Cancelar
            </button>
            <button type="button" disabled={!listo || guardando} onClick={() => void confirmar()} className="btn-ce !min-h-11 flex-1 justify-center disabled:opacity-50">
              <CheckCircle2 className="size-4" /> {guardando ? "Guardando…" : "Firmar y guardar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** PDF del consentimiento firmado (con la firma y la huella de verificación) */
export async function pdfConsentimiento(titulo: string, f: FirmaConsentimiento, paciente: string, clinica?: string) {
  const fecha = new Date(f.fechaHora).toLocaleString("es-AR", { dateStyle: "long", timeStyle: "short" });
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    body{font-family:Inter,Arial,sans-serif;color:#1e1b2e;margin:0;padding:36px 44px;font-size:12.5px;line-height:1.6}
    .cab{border-bottom:3px solid #7c3aed;padding-bottom:10px;margin-bottom:18px}.cab p{margin:0;color:#7c3aed;font-weight:700;font-size:11px;letter-spacing:.14em;text-transform:uppercase}
    h1{font-size:19px;margin:4px 0}.firma{margin-top:28px;display:flex;gap:30px;align-items:flex-end}
    .firma img{height:110px;border-bottom:1px solid #9e93bd}.meta{font-size:10px;color:#6b6189;margin-top:26px;border-top:1px dashed #d6cff0;padding-top:10px;word-break:break-all}
  </style></head><body><div class="cab"><p>${esc(clinica ?? "Consentimiento informado")}</p><h1>${esc(titulo)}</h1><span>Paciente: ${esc(paciente)}</span></div>
  <p style="white-space:pre-line">${esc(f.texto)}</p>
  <div class="firma"><div><img src="${f.firma}" alt="Firma"/><div>${esc(f.firmante)}${f.documento ? ` · Doc. ${esc(f.documento)}` : ""}</div></div><div>Firmado el ${esc(fecha)}</div></div>
  <div class="meta">Modelo ${esc(f.modelo)} v${esc(f.version)} · Huella SHA-256: ${esc(f.huella || "—")}<br/>Dispositivo: ${esc(f.dispositivo)}</div></body></html>`;
  return descargarPDF(html, `${titulo} ${paciente}`);
}

/** Vista del consentimiento firmado (la «foto legal») */
export function VerConsentimiento({
  titulo,
  firma,
  paciente,
  clinica,
  onCerrar,
  onToast,
}: {
  titulo: string;
  firma: FirmaConsentimiento;
  paciente: string;
  clinica?: string | undefined;
  onCerrar: () => void;
  onToast: (m: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/45 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={onCerrar}>
      <div role="dialog" aria-modal="true" aria-label={titulo} onMouseDown={(e) => e.stopPropagation()} className="max-h-[92vh] w-full overflow-y-auto rounded-t-[28px] border border-primary/15 bg-card p-5 shadow-2xl sm:max-w-xl sm:rounded-[28px] sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-md">
            <ShieldCheck className="size-5" />
          </span>
          <div className="flex-1">
            <p className="font-display text-base font-bold">{titulo}</p>
            <p className="text-xs text-muted-foreground">
              Firmado por {firma.firmante} · {new Date(firma.fechaHora).toLocaleString("es-AR")}
            </p>
          </div>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="grid size-9 place-items-center rounded-xl hover:bg-muted">
            <X className="size-4" />
          </button>
        </div>
        <p className="mt-4 max-h-56 overflow-y-auto whitespace-pre-line rounded-2xl bg-muted/40 p-4 text-sm leading-relaxed">{firma.texto}</p>
        <div className="mt-4 rounded-2xl border border-primary/10 bg-white p-3">
          <img src={firma.firma} alt={`Firma de ${firma.firmante}`} className="mx-auto h-28" />
        </div>
        <p className="mt-3 break-all text-[10.5px] text-muted-foreground">
          Versión {firma.version} · Huella SHA-256 {firma.huella || "—"}
        </p>
        <button
          type="button"
          onClick={() => void pdfConsentimiento(titulo, firma, paciente, clinica).then((ok) => onToast(ok ? "PDF descargado" : "No se pudo armar el PDF"))}
          className="btn-ce mt-4 !min-h-11 w-full justify-center"
        >
          <Download className="size-4" /> Descargar PDF firmado
        </button>
      </div>
    </div>
  );
}
