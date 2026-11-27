import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Eraser, FileText, Loader2, MapPin, Phone, ShieldCheck, ShieldX, Stethoscope, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { API_URL } from "@/lib/clinica/api";
import { telefonoInternacional } from "@/lib/clinica/whatsapp";
import { IconoWhatsApp } from "@/components/cloud-esther/IconoWhatsApp";

/* Ubicación: src/routes/presupuesto.$token.tsx
   PÁGINA PÚBLICA del PRESUPUESTO: el paciente lo abre desde el WhatsApp de la clínica, lo ve
   lindo en el celular y lo aprueba con su firma (o lo rechaza). Sin portal ni cuenta: sirve
   en todos los planes. La clínica recibe el aviso y el cargo queda en la cuenta del paciente. */

export const Route = createFileRoute("/presupuesto/$token")({
  head: () => ({
    meta: [{ title: "Tu presupuesto — Cloud Esther" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: PresupuestoPaciente,
});

type Opcion = {
  id: number;
  opcion: string;
  opcionNombre: string;
  numero: string;
  fecha: string;
  validez: string;
  vencido: boolean;
  estado: string;
  profesional: string;
  notas: string;
  lineas: { descripcion: string; pieza: string; cantidad: number; precio: number }[];
  descuentoPct: number;
  subtotal: number;
  descuento: number;
  total: number;
  final: number;
  cuotas: number;
  cuota: number;
  plan: string;
  firmado: boolean;
};

type Info = Opcion & {
  clinica: string;
  logo: string;
  color: string;
  telefono: string;
  direccion: string;
  pais: string;
  moneda: string;
  paciente: string;
  numero: string;
  fecha: string;
  validez: string;
  vencido: boolean;
  estado: string;
  profesional: string;
  notas: string;
  condiciones: string;
  lineas: { descripcion: string; pieza: string; cantidad: number; precio: number }[];
  descuentoPct: number;
  subtotal: number;
  descuento: number;
  total: number;
  final: number;
  cuotas: number;
  cuota: number;
  plan: string;
  firmado: boolean;
  opciones: Opcion[];
  senaPct?: number;
  pagado?: number;
  datosPago?: { titular: string; banco: string; cuenta: string; alias: string; link: string; instrucciones: string };
};

async function pedir<T>(ruta: string, metodo = "GET", cuerpo?: unknown): Promise<T> {
  const r = await fetch(`${API_URL}${ruta}`, {
    method: metodo,
    headers: cuerpo !== undefined ? { "Content-Type": "application/json" } : {},
    ...(cuerpo !== undefined ? { body: JSON.stringify(cuerpo) } : {}),
  });
  if (!r.ok) throw new Error((await r.text().catch(() => "")) || "No pudimos conectarnos. Probá de nuevo.");
  return (await r.json()) as T;
}

const vos = (pais: string) => ["AR", "UY", "PY"].includes((pais || "").toUpperCase());

function fechaCorta(f: string) {
  const d = new Date(`${f.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return f;
  return d.toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" });
}

function PresupuestoPaciente() {
  const { token } = Route.useParams();
  const [info, setInfo] = useState<Info | null>(null);
  const [error, setError] = useState("");
  const [paso, setPaso] = useState<"ver" | "firmar" | "rechazar">("ver");
  const [elegida, setElegida] = useState<number | null>(null);

  useEffect(() => {
    if (!API_URL) return setError("Esta página todavía no está disponible.");
    pedir<Info>(`/public/presupuestos/${token}`)
      .then(setInfo)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "El enlace no es válido."));
  }, [token]);

  const t = (a: string, b: string) => (vos(info?.pais ?? "AR") ? a : b);
  const plata = (n: number) => {
    try {
      return new Intl.NumberFormat(`es-${info?.pais || "AR"}`, { style: "currency", currency: info?.moneda || "ARS", maximumFractionDigits: 0 }).format(n);
    } catch {
      return `$ ${Math.round(n).toLocaleString("es")}`;
    }
  };
  const color = info?.color || "#7c3aed";
  const wa = info?.telefono ? `https://wa.me/${telefonoInternacional(info.telefono, info.pais)}?text=${encodeURIComponent(`Hola, tengo una consulta sobre el presupuesto ${info.numero}.`)}` : "";

  return (
    <main
      style={{ ["--marca" as string]: color }}
      className="min-h-screen bg-[radial-gradient(circle_at_50%_0%,color-mix(in_srgb,var(--marca)_16%,transparent),transparent_60%)] bg-[#faf8ff] px-4 py-7 text-[#1f1a33] sm:py-12"
    >
      <div className="mx-auto w-full max-w-lg">
        {!info && !error && (
          <div className="flex items-center justify-center gap-2 py-24 text-sm text-[#6b6385]">
            <Loader2 className="size-4 animate-spin" /> Abriendo tu presupuesto…
          </div>
        )}

        {!info && error && (
          <div className="mt-10 flex items-start gap-3 rounded-3xl border-2 border-red-200 bg-white p-5 text-red-800 shadow-sm">
            <ShieldX className="mt-0.5 size-7 shrink-0" />
            <div>
              <p className="text-lg font-extrabold leading-tight">No se puede abrir este enlace</p>
              <p className="mt-1 text-sm">{error}</p>
            </div>
          </div>
        )}

        {info && (() => {
          const hayOpciones = (info.opciones?.length ?? 0) > 1;
          const eligiendo = hayOpciones && info.estado === "Enviado";
          const ver: Info = eligiendo ? { ...info, ...(info.opciones.find((o) => o.id === (elegida ?? info.id)) ?? {}) } : info;
          return (
          <>
            {/* Encabezado de la clínica */}
            <section className="relative overflow-hidden rounded-[28px] bg-white p-5 shadow-[0_30px_70px_-40px_rgba(76,29,149,0.55)] ring-1 ring-black/5">
              <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[var(--marca)] via-fuchsia-500 to-amber-300" />
              <div className="flex items-center gap-3.5">
                {info.logo ? (
                  <img src={info.logo} alt="" className="size-14 shrink-0 rounded-2xl bg-white object-contain p-1.5 shadow ring-1 ring-black/5" />
                ) : (
                  <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[var(--marca)] to-fuchsia-500 text-white shadow-lg">
                    <FileText className="size-6" />
                  </span>
                )}
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--marca)]">Presupuesto {ver.numero}</p>
                  <h1 className="truncate text-xl font-bold leading-tight">{info.clinica}</h1>
                </div>
              </div>
              {(info.direccion || info.telefono) && (
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-[#6b6385]">
                  {info.direccion && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="size-3.5 text-[var(--marca)]" /> {info.direccion}
                    </span>
                  )}
                  {info.telefono && (
                    <a href={`tel:${info.telefono.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-1.5">
                      <Phone className="size-3.5 text-[var(--marca)]" /> {info.telefono}
                    </a>
                  )}
                </div>
              )}
            </section>

            {eligiendo && (
              <section className="mt-4">
                <p className="px-1 text-sm font-bold">{t("Tenés", "Tienes")} {info.opciones.length} opciones · {t("elegí la que prefieras", "elige la que prefieras")}</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {info.opciones.map((o) => {
                    const activa = o.id === (elegida ?? info.id);
                    return (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => {
                          setElegida(o.id);
                          setPaso("ver");
                        }}
                        className={`rounded-3xl p-3.5 text-left transition-all ${activa ? "bg-white shadow-[0_18px_40px_-24px_rgba(124,58,237,0.8)] ring-2 ring-[var(--marca)]" : "bg-white/70 ring-1 ring-black/5"}`}
                      >
                        <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] ${activa ? "bg-[var(--marca)] text-white" : "bg-[#f1edfb] text-[#6b6385]"}`}>
                          Opción {o.opcion}
                        </span>
                        <p className="mt-1.5 truncate text-sm font-semibold">{o.opcionNombre || o.lineas[0]?.descripcion || o.numero}</p>
                        <p className="mt-0.5 text-lg font-extrabold tabular-nums text-[var(--marca)]">{plata(o.final)}</p>
                        {o.cuotas > 1 && <p className="text-[11px] text-[#6b6385]">{o.cuotas} × {plata(o.cuota)}</p>}
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Total */}
            <section className="mt-4 rounded-[28px] bg-gradient-to-br from-[var(--marca)] via-violet-600 to-fuchsia-600 p-5 text-white shadow-[0_24px_50px_-28px_rgba(124,58,237,0.9)]">
              <p className="text-sm text-white/85">
                Hola{info.paciente ? ` ${info.paciente}` : ""} 👋 {t("este es tu presupuesto", "este es tu presupuesto")}
              </p>
              <p className="mt-2 text-[34px] font-extrabold leading-none tracking-[-0.02em] tabular-nums">{plata(ver.final)}</p>
              {ver.cuotas > 1 && (
                <p className="mt-1.5 text-sm font-semibold text-white/95">
                  {ver.cuotas} cuotas de {plata(ver.cuota)}
                  {ver.plan ? ` · ${ver.plan}` : ""}
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
                {ver.profesional && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 ring-1 ring-white/25">
                    <Stethoscope className="size-3" /> {ver.profesional}
                  </span>
                )}
                {ver.validez && (
                  <span className={`rounded-full px-2.5 py-1 ring-1 ${ver.vencido ? "bg-rose-500/30 ring-rose-200/50" : "bg-white/15 ring-white/25"}`}>
                    {ver.vencido ? "Venció el" : "Válido hasta el"} {fechaCorta(ver.validez)}
                  </span>
                )}
              </div>
            </section>

            {/* Detalle */}
            <section className="mt-4 rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-black/5">
              <p className="text-sm font-bold">Qué incluye</p>
              <ul className="mt-3 divide-y divide-[#efeaf9]">
                {ver.lineas.map((l, i) => (
                  <li key={i} className="flex items-start justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-snug">{l.descripcion}</p>
                      <p className="text-[11px] text-[#8a83a3]">
                        {l.pieza ? `Pieza ${l.pieza} · ` : ""}
                        {l.cantidad > 1 ? `${l.cantidad} × ${plata(l.precio)}` : "1 vez"}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold tabular-nums">{plata(l.cantidad * l.precio)}</p>
                  </li>
                ))}
              </ul>
              <div className="mt-2 space-y-1 border-t border-[#efeaf9] pt-3 text-sm">
                {ver.descuento > 0 && (
                  <>
                    <Fila a="Subtotal" b={plata(ver.subtotal)} />
                    <Fila a={`Descuento ${ver.descuentoPct}%`} b={`−${plata(ver.descuento)}`} verde />
                  </>
                )}
                {ver.final !== ver.total && <Fila a={ver.plan || "Plan de pago"} b={plata(ver.final - ver.total)} />}
                <div className="flex justify-between pt-1 text-base font-extrabold text-[var(--marca)]">
                  <span>Total</span>
                  <span className="tabular-nums">{plata(ver.final)}</span>
                </div>
              </div>
              {ver.notas && <p className="mt-3 rounded-2xl bg-[#f6f3fd] px-3.5 py-2.5 text-[13px] leading-relaxed text-[#4b4466]">{ver.notas}</p>}
              {info.condiciones && (
                <details className="mt-3 text-[12px] text-[#6b6385]">
                  <summary className="cursor-pointer font-semibold text-[#4b4466]">Condiciones</summary>
                  <p className="mt-1.5 leading-relaxed">{info.condiciones}</p>
                </details>
              )}
            </section>

            {/* Respuesta */}
            <section className="mt-4 rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-black/5">
              {ver.estado === "Aprobado" ? (
                <div className="py-2 text-center">
                  <CheckCircle2 className="mx-auto size-14 text-emerald-500" />
                  <p className="mt-2 text-xl font-extrabold">¡Presupuesto aprobado!</p>
                  {hayOpciones && ver.opcion && (
                    <p className="mt-1 text-sm font-semibold text-[var(--marca)]">
                      {t("Elegiste", "Elegiste")} la opción {ver.opcion}
                      {ver.opcionNombre ? ` · ${ver.opcionNombre}` : ""}
                    </p>
                  )}
                  <p className="mx-auto mt-1 max-w-xs text-sm text-[#6b6385]">
                    {t("Gracias. La clínica ya lo sabe y te escribe para coordinar los turnos.", "Gracias. La clínica ya lo sabe y te escribirá para coordinar los turnos.")}
                  </p>
                  <ComoPagar info={info} ver={ver} plata={plata} t={t} />
                </div>
              ) : ver.estado === "Rechazado" ? (
                <div className="py-2 text-center">
                  <XCircle className="mx-auto size-12 text-[#a59dc0]" />
                  <p className="mt-2 text-lg font-bold">{t("Le avisamos a la clínica", "Le avisamos a la clínica")}</p>
                  <p className="mx-auto mt-1 max-w-xs text-sm text-[#6b6385]">
                    {t("Si cambiás de idea o querés otra opción, escribinos.", "Si cambias de idea o quieres otra opción, escríbenos.")}
                  </p>
                </div>
              ) : ver.vencido ? (
                <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  {t("Este presupuesto venció. Pedile a la clínica uno actualizado.", "Este presupuesto venció. Pídele a la clínica uno actualizado.")}
                </p>
              ) : paso === "firmar" ? (
                <Firmar info={ver} token={token} t={t} onListo={setInfo} onVolver={() => setPaso("ver")} />
              ) : paso === "rechazar" ? (
                <Rechazar token={token} t={t} onListo={setInfo} onVolver={() => setPaso("ver")} />
              ) : (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setPaso("firmar")}
                    className="flex h-13 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[var(--marca)] via-violet-500 to-fuchsia-500 py-3.5 text-base font-semibold text-white shadow-[0_14px_30px_-14px_rgba(124,58,237,0.9)]"
                  >
                    <CheckCircle2 className="size-5" /> {eligiendo ? `Elijo la opción ${ver.opcion}` : "Lo apruebo"}
                  </button>
                  <button type="button" onClick={() => setPaso("rechazar")} className="h-11 w-full rounded-full text-sm font-semibold text-[#6b6385] hover:bg-[#f6f3fd]">
                    {t("Ahora no", "Ahora no")}
                  </button>
                </div>
              )}
              {wa && (
                <a href={wa} target="_blank" rel="noreferrer" className="mt-3 flex items-center justify-center gap-2 text-[13px] font-semibold text-emerald-700">
                  <IconoWhatsApp /> {t("¿Tenés dudas? Escribinos", "¿Tienes dudas? Escríbenos")}
                </a>
              )}
            </section>

            <p className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-[#8a83a3]">
              <ShieldCheck className="size-3.5" /> {vos(info.pais) ? "Solo vos" : "Solo tú"} y la clínica ven este presupuesto · Cloud Esther
            </p>
          </>
          );
        })()}
      </div>
    </main>
  );
}

function Fila({ a, b, verde }: { a: string; b: string; verde?: boolean }) {
  return (
    <div className={`flex justify-between ${verde ? "text-emerald-600" : "text-[#6b6385]"}`}>
      <span>{a}</span>
      <span className="tabular-nums">{b}</span>
    </div>
  );
}

/** Firma con el dedo + nombre completo. La imagen se achica antes de mandarla. */
function Firmar({
  info,
  token,
  t,
  onListo,
  onVolver,
}: {
  info: Info;
  token: string;
  t: (a: string, b: string) => string;
  onListo: (i: Info) => void;
  onVolver: () => void;
}) {
  const lienzo = useRef<HTMLCanvasElement | null>(null);
  const dibujando = useRef(false);
  const [trazos, setTrazos] = useState(0);
  const [nombre, setNombre] = useState("");
  const [acepto, setAcepto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

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
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1f1a33";
  }, []);

  const punto = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const borrar = () => {
    const c = lienzo.current;
    c?.getContext("2d")?.clearRect(0, 0, c.width, c.height);
    setTrazos(0);
  };

  const enviar = async () => {
    setError("");
    if (nombre.trim().length < 3) return setError(t("Escribí tu nombre y apellido.", "Escribe tu nombre y apellido."));
    if (trazos < 1) return setError(t("Firmá con el dedo en el recuadro.", "Firma con el dedo en el recuadro."));
    if (!acepto) return setError(t("Marcá que estás de acuerdo con el presupuesto.", "Marca que estás de acuerdo con el presupuesto."));
    const c = lienzo.current;
    if (!c) return;
    // Se achica a 420 px de ancho: liviana y nítida
    const chico = document.createElement("canvas");
    const escala = Math.min(1, 420 / c.width);
    chico.width = Math.round(c.width * escala);
    chico.height = Math.round(c.height * escala);
    chico.getContext("2d")?.drawImage(c, 0, 0, chico.width, chico.height);
    const firma = chico.toDataURL("image/png");
    setEnviando(true);
    try {
      onListo(await pedir<Info>(`/public/presupuestos/${token}/responder`, "POST", { respuesta: "aprobar", nombre: nombre.trim(), firma, ...(info.opciones?.length > 1 ? { opcionId: info.id } : {}) }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar. Probá de nuevo.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-base font-bold">{t("Aprobá con tu firma", "Aprueba con tu firma")}</p>
      <label className="block">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a83a3]">Nombre y apellido</span>
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          maxLength={80}
          autoComplete="name"
          className="mt-1 h-12 w-full rounded-2xl border border-[#e6e1f5] bg-white px-4 text-base outline-none focus:border-[var(--marca)]"
        />
      </label>
      <div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a83a3]">{t("Firmá acá", "Firma aquí")}</span>
          {trazos > 0 && (
            <button type="button" onClick={borrar} className="inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--marca)]">
              <Eraser className="size-3.5" /> Borrar
            </button>
          )}
        </div>
        <canvas
          ref={lienzo}
          aria-label="Recuadro para firmar"
          className="mt-1 h-40 w-full touch-none rounded-2xl border-2 border-dashed border-[#d9d1f0] bg-[#fcfbff]"
          onPointerDown={(e) => {
            const ctx = e.currentTarget.getContext("2d");
            if (!ctx) return;
            e.currentTarget.setPointerCapture(e.pointerId);
            dibujando.current = true;
            const p = punto(e);
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x + 0.1, p.y + 0.1);
            ctx.stroke();
          }}
          onPointerMove={(e) => {
            if (!dibujando.current) return;
            const ctx = e.currentTarget.getContext("2d");
            const p = punto(e);
            ctx?.lineTo(p.x, p.y);
            ctx?.stroke();
          }}
          onPointerUp={() => {
            if (dibujando.current) setTrazos((n) => n + 1);
            dibujando.current = false;
          }}
          onPointerCancel={() => {
            dibujando.current = false;
          }}
        />
      </div>
      <label className="flex items-start gap-2.5 rounded-2xl bg-[#f6f3fd] px-3.5 py-3 text-[13px] leading-snug">
        <input type="checkbox" checked={acepto} onChange={(e) => setAcepto(e.target.checked)} className="mt-0.5 size-4 shrink-0 accent-[var(--marca)]" />
        <span>
          Estoy de acuerdo con el presupuesto {info.numero}
          {info.opciones?.length > 1 && info.opcion ? ` (opción ${info.opcion}${info.opcionNombre ? ` · ${info.opcionNombre}` : ""})` : ""} y sus condiciones.
        </span>
      </label>
      {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <button
        type="button"
        disabled={enviando}
        onClick={() => void enviar()}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[var(--marca)] via-violet-500 to-fuchsia-500 py-3.5 text-base font-semibold text-white shadow-[0_14px_30px_-14px_rgba(124,58,237,0.9)] disabled:opacity-60"
      >
        {enviando ? <Loader2 className="size-5 animate-spin" /> : <CheckCircle2 className="size-5" />} {t("Aprobar presupuesto", "Aprobar presupuesto")}
      </button>
      <button type="button" onClick={onVolver} className="h-10 w-full rounded-full text-sm font-semibold text-[#6b6385]">
        Volver
      </button>
    </div>
  );
}

function Rechazar({
  token,
  t,
  onListo,
  onVolver,
}: {
  token: string;
  t: (a: string, b: string) => string;
  onListo: (i: Info) => void;
  onVolver: () => void;
}) {
  const MOTIVOS = ["Lo voy a pensar", "Me queda caro", "Prefiero otra opción", "Me lo hago más adelante"];
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const enviar = async () => {
    setEnviando(true);
    setError("");
    try {
      onListo(await pedir<Info>(`/public/presupuestos/${token}/responder`, "POST", { respuesta: "rechazar", ...(motivo.trim() ? { motivo: motivo.trim() } : {}) }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar. Probá de nuevo.");
    } finally {
      setEnviando(false);
    }
  };
  return (
    <div className="space-y-3">
      <p className="text-base font-bold">{t("¿Nos contás por qué?", "¿Nos cuentas por qué?")}</p>
      <p className="-mt-2 text-[13px] text-[#6b6385]">{t("Es opcional y nos ayuda a ofrecerte algo mejor.", "Es opcional y nos ayuda a ofrecerte algo mejor.")}</p>
      <div className="flex flex-wrap gap-1.5">
        {MOTIVOS.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMotivo(m)}
            className={`rounded-full px-3 py-1.5 text-[13px] font-medium ring-1 ${motivo === m ? "bg-[var(--marca)] text-white ring-[var(--marca)]" : "bg-white text-[#4b4466] ring-[#e6e1f5]"}`}
          >
            {m}
          </button>
        ))}
      </div>
      <textarea
        rows={2}
        maxLength={300}
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        placeholder={t("O escribilo con tus palabras", "O escríbelo con tus palabras")}
        className="w-full rounded-2xl border border-[#e6e1f5] bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[var(--marca)]"
      />
      {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={onVolver} className="h-11 rounded-full border border-[#e6e1f5] text-sm font-semibold">
          Volver
        </button>
        <button type="button" disabled={enviando} onClick={() => void enviar()} className="h-11 rounded-full bg-[#1f1a33] text-sm font-semibold text-white disabled:opacity-60">
          {enviando ? "Enviando…" : "Enviar"}
        </button>
      </div>
    </div>
  );
}

/** Después de aprobar: la seña (si la clínica la pide), lo que falta y cómo pagar. */
function ComoPagar({ info, ver, plata, t }: { info: Info; ver: Info; plata: (n: number) => string; t: (a: string, b: string) => string }) {
  const [copiado, setCopiado] = useState("");
  const pagado = info.pagado ?? 0;
  const falta = Math.max(0, ver.final - pagado);
  const sena = Math.round((ver.final * (info.senaPct ?? 0)) / 100);
  const faltaSena = Math.max(0, sena - pagado);
  const dp = info.datosPago;
  const hayDatos = !!(dp && (dp.alias || dp.cuenta || dp.link || dp.instrucciones));
  if (falta === 0)
    return pagado > 0 ? (
      <p className="mx-auto mt-4 w-fit rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">Pagado completo ✓</p>
    ) : null;
  if (!faltaSena && !hayDatos && !pagado) return null;
  const copiar = (v: string) => {
    void navigator.clipboard?.writeText(v).catch(() => {});
    setCopiado(v);
    window.setTimeout(() => setCopiado(""), 1800);
  };
  const wa = info.telefono
    ? `https://wa.me/${telefonoInternacional(info.telefono, info.pais)}?text=${encodeURIComponent(`Hola, te mando el comprobante del pago del presupuesto ${ver.numero}.`)}`
    : "";
  return (
    <div className="mt-5 rounded-3xl bg-[#f6f3fd] p-4 text-left">
      <p className="text-sm font-bold">
        {faltaSena > 0
          ? `${t("Para reservar tus turnos, la seña es de", "Para reservar tus turnos, la seña es de")} ${plata(faltaSena)}`
          : `${t("Te queda un saldo de", "Te queda un saldo de")} ${plata(falta)}`}
      </p>
      {pagado > 0 && <p className="mt-0.5 text-xs text-[#6b6385]">Ya {t("pagaste", "pagaste")} {plata(pagado)} de {plata(ver.final)}.</p>}
      {hayDatos && dp && (
        <div className="mt-3 space-y-1.5">
          {[
            ["Alias", dp.alias],
            ["Cuenta", dp.cuenta],
            ["Titular", dp.titular],
            ["Banco", dp.banco],
          ]
            .filter(([, v]) => v)
            .map(([l, v]) => (
              <div key={l} className="flex items-center justify-between gap-2 rounded-2xl bg-white px-3.5 py-2.5 ring-1 ring-black/5">
                <span className="min-w-0">
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a83a3]">{l}</span>
                  <span className="block truncate text-sm font-semibold">{v}</span>
                </span>
                {(l === "Alias" || l === "Cuenta") && (
                  <button type="button" onClick={() => copiar(v!)} className="shrink-0 rounded-full bg-[var(--marca)]/10 px-3 py-1 text-xs font-semibold text-[var(--marca)]">
                    {copiado === v ? "¡Copiado!" : "Copiar"}
                  </button>
                )}
              </div>
            ))}
          {dp.instrucciones && <p className="px-1 text-xs text-[#6b6385]">{dp.instrucciones}</p>}
          {dp.link && (
            <a href={dp.link} target="_blank" rel="noreferrer" className="flex h-11 items-center justify-center rounded-full bg-[var(--marca)] text-sm font-semibold text-white">
              {t("Pagar online", "Pagar en línea")}
            </a>
          )}
        </div>
      )}
      {wa && (
        <a href={wa} target="_blank" rel="noreferrer" className="mt-2.5 flex items-center justify-center gap-2 text-[13px] font-semibold text-emerald-700">
          <IconoWhatsApp /> {t("Mandar el comprobante", "Enviar el comprobante")}
        </a>
      )}
    </div>
  );
}
