import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink, Heart, Loader2, ShieldX } from "lucide-react";
import { useEffect, useState } from "react";

import { ToothLogo } from "@/components/admin/logo";
import { API_URL } from "@/lib/clinica/api";

/* Ubicación: src/routes/encuesta.$token.tsx
   PÁGINA PÚBLICA de la ENCUESTA después del turno: el paciente puntúa la atención del 1 al 5 y
   puede dejar un comentario. Si pone 4 o 5 y la clínica cargó su enlace de Google, se lo invita a
   dejar la reseña; si pone 1 a 3, la clínica recibe la alerta (no se lo manda a Google). */

export const Route = createFileRoute("/encuesta/$token")({
  head: () => ({
    meta: [{ title: "¿Cómo te atendimos? — Cloud Esther" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: Encuesta,
});

type Info = { clinica: string; nombre: string; fecha: string; profesional: string; atendido: boolean; puntaje: number; resena: string };

async function pedir<T>(ruta: string, metodo = "GET", cuerpo?: unknown): Promise<T> {
  const r = await fetch(`${API_URL}${ruta}`, {
    method: metodo,
    headers: cuerpo !== undefined ? { "Content-Type": "application/json" } : {},
    ...(cuerpo !== undefined ? { body: JSON.stringify(cuerpo) } : {}),
  });
  if (!r.ok) throw new Error((await r.text().catch(() => "")) || "No pudimos conectarnos. Probá de nuevo.");
  return (await r.json()) as T;
}

const CARAS = [
  { n: 1, cara: "😞", texto: "Muy mal" },
  { n: 2, cara: "😕", texto: "Mal" },
  { n: 3, cara: "😐", texto: "Regular" },
  { n: 4, cara: "🙂", texto: "Bien" },
  { n: 5, cara: "😍", texto: "Excelente" },
];

function Encuesta() {
  const { token } = Route.useParams();
  const [info, setInfo] = useState<Info | null>(null);
  const [error, setError] = useState("");
  const [puntaje, setPuntaje] = useState(0);
  const [comentario, setComentario] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!API_URL) return setError("Esta página todavía no está disponible.");
    pedir<Info>(`/public/encuestas/${token}`)
      .then(setInfo)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "El enlace no es válido."));
  }, [token]);

  const enviar = async () => {
    if (!puntaje) return;
    setEnviando(true);
    setError("");
    try {
      setInfo(await pedir<Info>(`/public/encuestas/${token}/responder`, "POST", { puntaje, ...(comentario.trim() ? { comentario: comentario.trim() } : {}) }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo enviar. Probá de nuevo.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_50%_0%,rgba(124,58,237,0.14),transparent_60%)] bg-background px-4 py-8 sm:py-14">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-5 flex items-center justify-center gap-2 text-sm font-semibold text-primary">
          <span className="grid size-9 place-items-center rounded-xl bg-primary/10">
            <ToothLogo className="size-5" />
          </span>
          {info?.clinica || "Tu opinión"}
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

          {info && info.puntaje > 0 && (
            <div className="py-2 text-center">
              <Heart className="mx-auto size-12 fill-rose-500 text-rose-500" />
              <p className="mt-3 text-xl font-extrabold">¡Gracias{info.nombre ? `, ${info.nombre}` : ""}!</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {info.puntaje >= 4
                  ? "Nos alegra mucho que te hayas sentido bien atendido."
                  : "Gracias por contarnos. Vamos a comunicarnos con vos para mejorar."}
              </p>
              {info.resena && (
                <a
                  href={info.resena}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary via-violet-500 to-fuchsia-500 text-base font-semibold text-white shadow-[0_14px_30px_-14px_rgba(124,58,237,0.9)]"
                >
                  Dejar mi reseña en Google <ExternalLink className="size-4" />
                </a>
              )}
              {info.resena && <p className="mt-2 text-[11px] text-muted-foreground">Nos ayuda mucho a que otras personas nos conozcan.</p>}
            </div>
          )}

          {info && !info.puntaje && !info.atendido && (
            <p className="rounded-xl bg-muted px-3 py-2.5 text-sm">La encuesta se responde después de tu turno. ¡Te esperamos!</p>
          )}

          {info && !info.puntaje && info.atendido && (
            <>
              <h1 className="text-xl font-extrabold leading-tight">Hola{info.nombre ? ` ${info.nombre}` : ""} 👋</h1>
              <p className="mt-1 text-sm text-muted-foreground">¿Cómo te atendimos en {info.clinica}?</p>
              <div className="mt-4 grid grid-cols-5 gap-1.5" role="radiogroup" aria-label="Puntaje del 1 al 5">
                {CARAS.map((c) => (
                  <button
                    key={c.n}
                    type="button"
                    role="radio"
                    aria-checked={puntaje === c.n}
                    aria-label={`${c.n} — ${c.texto}`}
                    onClick={() => setPuntaje(c.n)}
                    className={`flex flex-col items-center gap-1 rounded-2xl border px-1 py-2.5 transition ${
                      puntaje === c.n ? "scale-105 border-primary bg-primary/10 shadow-md" : "border-primary/10 bg-card hover:border-primary/30"
                    }`}
                  >
                    <span className="text-[28px] leading-none">{c.cara}</span>
                    <span className="text-[10px] font-semibold text-muted-foreground">{c.texto}</span>
                  </button>
                ))}
              </div>
              <textarea
                rows={3}
                maxLength={500}
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                placeholder={puntaje && puntaje <= 3 ? "Contanos qué pasó así lo mejoramos" : "¿Querés dejarnos un comentario? (opcional)"}
                className="mt-3 w-full resize-y rounded-xl border border-primary/15 bg-card px-3 py-2 text-sm"
              />
              {error && <p className="mt-2 text-sm font-medium text-destructive">{error}</p>}
              <button
                type="button"
                disabled={!puntaje || enviando}
                onClick={() => void enviar()}
                className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary via-violet-500 to-fuchsia-500 text-base font-semibold text-white shadow-[0_14px_30px_-14px_rgba(124,58,237,0.9)] disabled:opacity-50"
              >
                {enviando && <Loader2 className="size-5 animate-spin" />} Enviar
              </button>
            </>
          )}
        </div>
        <p className="mt-4 text-center text-[11px] text-muted-foreground">Tu opinión solo la ve tu clínica.</p>
      </div>
    </main>
  );
}
