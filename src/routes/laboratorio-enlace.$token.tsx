import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, CheckCircle2, FlaskConical, Hammer, Loader2, MessageSquareText, Paperclip, RotateCcw, ShieldX } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { ToothLogo } from "@/components/admin/logo";
import { API_URL } from "@/lib/clinica/api";

/* Ubicación: src/routes/laboratorio-enlace.$token.tsx
   PÁGINA PÚBLICA para el LABORATORIO DENTAL, con el enlace que le mandó la clínica. Sin cuenta.
   Ve solo sus órdenes (paciente abreviado, indicaciones, archivos) y puede marcar «En proceso»,
   «Listo», cambiar la fecha de entrega o dejar una nota. La clínica se entera sola. */

export const Route = createFileRoute("/laboratorio-enlace/$token")({
  head: () => ({
    meta: [{ title: "Órdenes de laboratorio — Cloud Esther" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: EnlaceLaboratorio,
});

type Trabajo = {
  ref: string;
  paciente: string;
  tipo: string;
  pieza: string;
  material: string;
  color: string;
  profesional: string;
  fechaEnvio: string;
  fechaEntregaEstimada: string;
  estado: string;
  notas: string;
  notaLaboratorio: string;
  ajuste: string;
  repeticion: string;
  archivos: { nombre: string; url: string; categoria: string }[];
};
type Info = { clinica: string; laboratorio: string; trabajos: Trabajo[] };

async function pedir<T>(ruta: string, metodo = "GET", cuerpo?: unknown): Promise<T> {
  const r = await fetch(`${API_URL}${ruta}`, {
    method: metodo,
    headers: cuerpo !== undefined ? { "Content-Type": "application/json" } : {},
    ...(cuerpo !== undefined ? { body: JSON.stringify(cuerpo) } : {}),
  });
  if (!r.ok) throw new Error((await r.text().catch(() => "")) || "No pudimos conectarnos. Probá de nuevo.");
  return (await r.json()) as T;
}

const fecha = (f: string) => (f ? f.split("-").reverse().join("/") : "—");
const hoy = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());
const esImagen = (a: { url: string; nombre: string }) => /\.(jpe?g|png|webp|gif)$/i.test(a.url.split("?")[0] ?? "") || /\.(jpe?g|png|webp|gif)$/i.test(a.nombre);
const COLOR: Record<string, string> = {
  Enviado: "bg-violet-100 text-violet-700",
  "En proceso": "bg-sky-100 text-sky-700",
  "Listo para retirar": "bg-emerald-100 text-emerald-700",
  Entregado: "bg-slate-100 text-slate-600",
};
const FILTROS = [
  ["pendientes", "Por hacer"],
  ["listos", "Listos"],
  ["todos", "Todos"],
] as const;

function EnlaceLaboratorio() {
  const { token } = Route.useParams();
  const [info, setInfo] = useState<Info | null>(null);
  const [error, setError] = useState("");
  const [filtro, setFiltro] = useState<(typeof FILTROS)[number][0]>("pendientes");

  const cargar = useCallback(() => {
    if (!API_URL) return setError("Esta página todavía no está disponible.");
    pedir<Info>(`/public/laboratorio/${token}`)
      .then((i) => {
        setInfo(i);
        setError("");
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "El enlace no es válido."));
  }, [token]);
  useEffect(() => cargar(), [cargar]);

  const actualizar = (t: Trabajo) => setInfo((i) => (i ? { ...i, trabajos: i.trabajos.map((x) => (x.ref === t.ref ? t : x)) } : i));
  const lista = (info?.trabajos ?? []).filter((t) =>
    filtro === "todos" ? true : filtro === "listos" ? t.estado === "Listo para retirar" || t.estado === "Entregado" : t.estado === "Enviado" || t.estado === "En proceso",
  );
  const cuenta = (f: (typeof FILTROS)[number][0]) =>
    (info?.trabajos ?? []).filter((t) =>
      f === "todos" ? true : f === "listos" ? t.estado === "Listo para retirar" || t.estado === "Entregado" : t.estado === "Enviado" || t.estado === "En proceso",
    ).length;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_50%_0%,rgba(124,58,237,0.14),transparent_60%)] bg-background px-4 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-5 flex items-center justify-center gap-2 text-sm font-semibold text-primary">
          <span className="grid size-9 place-items-center rounded-xl bg-primary/10">
            <ToothLogo className="size-5" />
          </span>
          {info?.clinica || "Órdenes de laboratorio"}
        </div>

        {!info && !error && (
          <div className="flex items-center justify-center gap-2 rounded-[26px] border border-primary/15 bg-card py-12 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Abriendo…
          </div>
        )}

        {!info && error && (
          <div className="flex items-start gap-3 rounded-[26px] border-2 border-red-300 bg-red-50 p-5 text-red-800">
            <ShieldX className="mt-0.5 size-7 shrink-0" />
            <div>
              <p className="text-lg font-extrabold leading-tight">No se puede usar este enlace</p>
              <p className="mt-1 text-sm">{error}</p>
            </div>
          </div>
        )}

        {info && (
          <>
            <section className="rounded-[26px] border border-primary/15 bg-card p-5 shadow-[0_30px_70px_-35px_rgba(76,29,149,0.6)]">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">Laboratorio</p>
              <h1 className="mt-0.5 text-xl font-extrabold leading-tight">{info.laboratorio}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Órdenes que te mandó {info.clinica}. Marcá cuándo empezás y cuándo está listo: la clínica se entera al instante.
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {FILTROS.map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={filtro === id}
                    onClick={() => setFiltro(id)}
                    className={`min-h-9 rounded-full px-3.5 text-[13px] font-semibold transition ${
                      filtro === id
                        ? "bg-gradient-to-r from-primary via-violet-500 to-fuchsia-500 text-white shadow-[0_10px_22px_-12px_rgba(124,58,237,0.95)]"
                        : "bg-primary/[0.06] text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {label} ({cuenta(id)})
                  </button>
                ))}
              </div>
            </section>

            {lista.length === 0 ? (
              <p className="mt-4 rounded-[22px] border border-dashed border-primary/25 bg-card/70 px-4 py-10 text-center text-sm text-muted-foreground">
                {filtro === "pendientes" ? "No tenés trabajos pendientes. ¡Todo al día!" : "No hay trabajos acá."}
              </p>
            ) : (
              <ul className="mt-4 grid gap-3 md:grid-cols-2">
                {lista.map((t) => (
                  <TarjetaTrabajo key={t.ref} t={t} token={token} onCambio={actualizar} />
                ))}
              </ul>
            )}
            <p className="mt-5 text-center text-[11px] text-muted-foreground">
              Este enlace es solo para {info.laboratorio}. No lo compartas: con él se ven las órdenes de la clínica.
            </p>
          </>
        )}
      </div>
    </main>
  );
}

function TarjetaTrabajo({ t, token, onCambio }: { t: Trabajo; token: string; onCambio: (t: Trabajo) => void }) {
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [hecho, setHecho] = useState("");
  const [editarFecha, setEditarFecha] = useState(false);
  const [entrega, setEntrega] = useState(t.fechaEntregaEstimada >= hoy() ? t.fechaEntregaEstimada : "");
  const [editarNota, setEditarNota] = useState(false);
  const [nota, setNota] = useState(t.notaLaboratorio);
  const atrasado = (t.estado === "Enviado" || t.estado === "En proceso") && !!t.fechaEntregaEstimada && t.fechaEntregaEstimada < hoy();
  const abierto = t.estado === "Enviado" || t.estado === "En proceso" || t.estado === "Listo para retirar";

  const enviar = async (cuerpo: Record<string, string>, aviso: string) => {
    setGuardando(true);
    setError("");
    try {
      const nuevo = await pedir<Trabajo>(`/public/laboratorio/${token}/trabajo`, "POST", { ref: t.ref, ...cuerpo });
      onCambio(nuevo);
      setHecho(aviso);
      setEditarFecha(false);
      setEditarNota(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar. Probá de nuevo.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <li className={`rounded-[22px] border bg-card p-4 shadow-[0_18px_40px_-32px_rgba(76,29,149,0.7)] ${atrasado ? "border-rose-300" : "border-primary/12"}`}>
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
          <FlaskConical className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold leading-tight">
            {t.tipo}
            {t.pieza ? ` · pieza ${t.pieza}` : ""}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t.paciente}
            {t.profesional ? ` · ${t.profesional}` : ""}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10.5px] font-bold ${COLOR[t.estado] ?? "bg-muted"}`}>{t.estado}</span>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
        {t.material && (
          <div>
            <dt className="text-muted-foreground">Material</dt>
            <dd className="font-semibold">{t.material}</dd>
          </div>
        )}
        {t.color && (
          <div>
            <dt className="text-muted-foreground">Color</dt>
            <dd className="font-semibold">{t.color}</dd>
          </div>
        )}
        <div>
          <dt className="text-muted-foreground">Enviado</dt>
          <dd className="font-semibold tabular-nums">{fecha(t.fechaEnvio)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Entrega</dt>
          <dd className={`font-semibold tabular-nums ${atrasado ? "text-rose-600" : ""}`}>
            {fecha(t.fechaEntregaEstimada)}
            {atrasado ? " · atrasado" : ""}
          </dd>
        </div>
      </dl>

      {t.notas && <p className="mt-2.5 rounded-xl bg-primary/[0.05] px-3 py-2 text-xs">{t.notas}</p>}
      {t.repeticion && (
        <p className="mt-2 flex gap-1.5 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-800">
          <RotateCcw className="mt-0.5 size-3.5 shrink-0" />
          <span>
            <b>Repetición:</b> {t.repeticion}
          </span>
        </p>
      )}
      {t.ajuste && (
        <p className="mt-2 flex gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <Hammer className="mt-0.5 size-3.5 shrink-0" />
          <span>
            <b>Ajuste pedido:</b> {t.ajuste}
          </span>
        </p>
      )}

      {t.archivos.length > 0 && (
        <div className="mt-2.5">
          <p className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
            <Paperclip className="size-3.5" /> Archivos ({t.archivos.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {t.archivos.map((a) => (
              <a key={a.url} href={a.url} target="_blank" rel="noreferrer" title={`${a.categoria}: ${a.nombre}`} className="shrink-0">
                {esImagen(a) ? (
                  <img src={a.url} alt={a.nombre} loading="lazy" className="size-14 rounded-xl border border-primary/10 object-cover" />
                ) : (
                  <span className="grid size-14 place-items-center rounded-xl border border-primary/10 bg-primary/[0.06] px-1 text-center text-[10px] font-bold text-primary">
                    {(a.nombre.split(".").pop() ?? "").slice(0, 4).toUpperCase() || "ARCH"}
                    <span className="block text-[8.5px] font-medium normal-case text-muted-foreground">Descargar</span>
                  </span>
                )}
              </a>
            ))}
          </div>
        </div>
      )}

      {t.notaLaboratorio && !editarNota && (
        <p className="mt-2 rounded-xl bg-sky-50 px-3 py-2 text-xs text-sky-900">
          <b>Tu nota:</b> {t.notaLaboratorio}
        </p>
      )}

      {abierto && (
        <div className="mt-3 space-y-2 border-t border-border/60 pt-3">
          <div className="flex flex-wrap gap-1.5">
            {t.estado === "Enviado" && (
              <button type="button" disabled={guardando} onClick={() => void enviar({ estado: "En proceso" }, "Marcado en proceso")} className="btn-ce-outline !min-h-10">
                <Hammer className="size-4" /> Empecé
              </button>
            )}
            {(t.estado === "Enviado" || t.estado === "En proceso") && (
              <button type="button" disabled={guardando} onClick={() => void enviar({ estado: "Listo para retirar" }, "¡Listo! La clínica ya se enteró")} className="btn-ce !min-h-10">
                <CheckCircle2 className="size-4" /> Está listo
              </button>
            )}
            {t.estado !== "Listo para retirar" && (
              <button type="button" disabled={guardando} onClick={() => setEditarFecha((v) => !v)} className="btn-ce-outline !min-h-10">
                <CalendarDays className="size-4" /> Fecha
              </button>
            )}
            <button type="button" disabled={guardando} onClick={() => setEditarNota((v) => !v)} className="btn-ce-outline !min-h-10">
              <MessageSquareText className="size-4" /> Nota
            </button>
          </div>

          {editarFecha && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl bg-primary/[0.04] p-2.5">
              <input
                type="date"
                min={hoy()}
                value={entrega}
                onChange={(e) => setEntrega(e.target.value)}
                className="h-10 rounded-xl border border-primary/15 bg-card px-3 text-sm"
                aria-label="Nueva fecha de entrega"
              />
              <button type="button" disabled={!entrega || guardando} onClick={() => void enviar({ entrega }, "Fecha de entrega actualizada")} className="btn-ce !min-h-10 disabled:opacity-50">
                Guardar fecha
              </button>
            </div>
          )}

          {editarNota && (
            <div className="space-y-2 rounded-xl bg-primary/[0.04] p-2.5">
              <textarea
                rows={2}
                maxLength={300}
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                placeholder="Ej: falta el antagonista, ¿confirman el color A2?"
                className="w-full resize-y rounded-xl border border-primary/15 bg-card px-3 py-2 text-sm"
              />
              <button type="button" disabled={guardando} onClick={() => void enviar({ nota: nota.trim() }, "Nota enviada a la clínica")} className="btn-ce !min-h-10">
                Enviar nota
              </button>
            </div>
          )}

          {guardando && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" /> Guardando…
            </p>
          )}
          {hecho && !guardando && !error && (
            <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="size-3.5" /> {hecho}
            </p>
          )}
          {error && <p className="text-xs font-medium text-destructive">{error}</p>}
        </div>
      )}
    </li>
  );
}
