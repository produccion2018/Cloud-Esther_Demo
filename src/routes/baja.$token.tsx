import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Loader2, ShieldX } from "lucide-react";
import { useEffect, useState } from "react";

import { ToothLogo } from "@/components/admin/logo";
import { API_URL } from "@/lib/clinica/api";

/* Ubicación: src/routes/baja.$token.tsx
   PÁGINA PÚBLICA para que el PACIENTE elija qué mensajes recibe de su clínica (recordatorios y
   promociones) o se dé de baja. Va en cada promoción (muchos países lo exigen) y la clínica la
   puede mandar desde la ficha. Se guarda en la ficha del paciente: campañas y automatizaciones
   lo respetan. */

export const Route = createFileRoute("/baja/$token")({
  head: () => ({
    meta: [{ title: "Tus mensajes — Cloud Esther" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: Baja,
});

type Info = { clinica: string; nombre: string; promociones: boolean; recordatorios: boolean };

async function pedir<T>(ruta: string, metodo = "GET", cuerpo?: unknown): Promise<T> {
  const r = await fetch(`${API_URL}${ruta}`, {
    method: metodo,
    headers: cuerpo !== undefined ? { "Content-Type": "application/json" } : {},
    ...(cuerpo !== undefined ? { body: JSON.stringify(cuerpo) } : {}),
  });
  if (!r.ok) throw new Error((await r.text().catch(() => "")) || "No pudimos conectarnos. Probá de nuevo.");
  return (await r.json()) as T;
}

function Interruptor({ activo, onCambio, titulo, texto }: { activo: boolean; onCambio: (v: boolean) => void; titulo: string; texto: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      onClick={() => onCambio(!activo)}
      className="flex w-full items-center gap-3 rounded-2xl border border-primary/12 bg-card p-3.5 text-left transition hover:border-primary/30"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{titulo}</span>
        <span className="block text-xs text-muted-foreground">{texto}</span>
      </span>
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition ${activo ? "bg-primary" : "bg-muted-foreground/30"}`}>
        <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${activo ? "left-[22px]" : "left-0.5"}`} />
      </span>
    </button>
  );
}

function Baja() {
  const { token } = Route.useParams();
  const [info, setInfo] = useState<Info | null>(null);
  const [error, setError] = useState("");
  const [promos, setPromos] = useState(true);
  const [recs, setRecs] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    if (!API_URL) return setError("Esta página todavía no está disponible.");
    pedir<Info>(`/public/baja/${token}`)
      .then((i) => {
        setInfo(i);
        setPromos(i.promociones);
        setRecs(i.recordatorios);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "El enlace no es válido."));
  }, [token]);

  const guardar = async (p = promos, r = recs) => {
    setGuardando(true);
    setError("");
    try {
      const i = await pedir<Info>(`/public/baja/${token}`, "POST", { promociones: p, recordatorios: r });
      setInfo(i);
      setPromos(i.promociones);
      setRecs(i.recordatorios);
      setListo(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar. Probá de nuevo.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_50%_0%,rgba(124,58,237,0.14),transparent_60%)] bg-background px-4 py-8 sm:py-14">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-5 flex items-center justify-center gap-2 text-sm font-semibold text-primary">
          <span className="grid size-9 place-items-center rounded-xl bg-primary/10">
            <ToothLogo className="size-5" />
          </span>
          {info?.clinica || "Tus mensajes"}
        </div>
        <div className="rounded-[26px] border border-primary/15 bg-card p-5 shadow-[0_30px_70px_-35px_rgba(76,29,149,0.6)] sm:p-6">
          {!info && !error && (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Abriendo…
            </div>
          )}
          {!info && error && (
            <div className="flex items-start gap-3 rounded-2xl border-2 border-red-300 bg-red-50 p-4 text-red-800">
              <ShieldX className="mt-0.5 size-7 shrink-0" />
              <div>
                <p className="text-lg font-extrabold leading-tight">No se puede usar este enlace</p>
                <p className="mt-1 text-sm">{error}</p>
              </div>
            </div>
          )}
          {info && (
            <>
              <h1 className="text-xl font-extrabold leading-tight">Hola{info.nombre ? ` ${info.nombre}` : ""} 👋</h1>
              <p className="mt-1 text-sm text-muted-foreground">Elegí qué mensajes querés recibir de {info.clinica}:</p>
              <div className="mt-4 space-y-2">
                <Interruptor
                  activo={recs}
                  onCambio={(v) => {
                    setRecs(v);
                    setListo(false);
                  }}
                  titulo="Recordatorios"
                  texto="Turnos, estudios pendientes y la encuesta después de tu turno."
                />
                <Interruptor
                  activo={promos}
                  onCambio={(v) => {
                    setPromos(v);
                    setListo(false);
                  }}
                  titulo="Promociones y novedades"
                  texto="Campañas, descuentos e invitaciones a volver a control."
                />
              </div>
              {error && <p className="mt-3 text-sm font-medium text-destructive">{error}</p>}
              <button
                type="button"
                disabled={guardando}
                onClick={() => void guardar()}
                className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary via-violet-500 to-fuchsia-500 text-base font-semibold text-white shadow-[0_14px_30px_-14px_rgba(124,58,237,0.9)] disabled:opacity-50"
              >
                {guardando && <Loader2 className="size-5 animate-spin" />} Guardar
              </button>
              {(promos || recs) && (
                <button
                  type="button"
                  disabled={guardando}
                  onClick={() => {
                    setPromos(false);
                    setRecs(false);
                    void guardar(false, false);
                  }}
                  className="mt-2 w-full text-center text-sm font-semibold text-rose-600 underline-offset-2 hover:underline"
                >
                  No quiero recibir ningún mensaje
                </button>
              )}
              {listo && (
                <p className="mt-3 flex items-center justify-center gap-1.5 text-sm font-semibold text-emerald-700">
                  <CheckCircle2 className="size-4" /> ¡Listo! Guardamos tu elección.
                </p>
              )}
              <p className="mt-3 text-center text-[11px] text-muted-foreground">Podés cambiarlo cuando quieras desde este mismo enlace.</p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
