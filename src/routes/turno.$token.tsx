import { createFileRoute } from "@tanstack/react-router";
import { CalendarCheck2, CalendarClock, CalendarX2, CheckCircle2, Loader2, MapPin, ShieldX, Stethoscope } from "lucide-react";
import { useEffect, useState } from "react";

import { ToothLogo } from "@/components/admin/logo";
import { API_URL } from "@/lib/clinica/api";

/* Ubicación: src/routes/turno.$token.tsx
   PÁGINA PÚBLICA para que el PACIENTE confirme, pida cambiar o cancele su turno con el enlace
   del recordatorio. Sin iniciar sesión. La Agenda de la clínica se actualiza sola. */

export const Route = createFileRoute("/turno/$token")({
  head: () => ({
    meta: [{ title: "Tu turno — Cloud Esther" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: TurnoPaciente,
});

type Info = {
  clinica: string;
  nombre: string;
  fecha: string;
  hora: string;
  profesional: string;
  sucursal: string;
  estado: string;
  respuesta: string;
  pasado: boolean;
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

function fechaLarga(f: string) {
  const d = new Date(`${f}T12:00:00`);
  if (Number.isNaN(d.getTime())) return f;
  const t = d.toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" });
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function TurnoPaciente() {
  const { token } = Route.useParams();
  const [info, setInfo] = useState<Info | null>(null);
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [cambiar, setCambiar] = useState(false);
  const [cancelar, setCancelar] = useState(false);
  const [nota, setNota] = useState("");

  useEffect(() => {
    if (!API_URL) return setError("Esta página todavía no está disponible.");
    pedir<Info>(`/public/turnos/${token}`)
      .then(setInfo)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "El enlace no es válido."));
  }, [token]);

  const responder = async (respuesta: "confirmo" | "cambiar" | "cancelo") => {
    setEnviando(true);
    setError("");
    try {
      setInfo(await pedir<Info>(`/public/turnos/${token}/responder`, "POST", { respuesta, ...(nota.trim() ? { nota: nota.trim() } : {}) }));
      setCambiar(false);
      setCancelar(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar. Probá de nuevo.");
    } finally {
      setEnviando(false);
    }
  };

  const cerrado = info && (info.pasado || ["Cancelada", "Atendida", "Ausente"].includes(info.estado));
  const respondio = info?.respuesta;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_50%_0%,rgba(124,58,237,0.14),transparent_60%)] bg-background px-4 py-8 sm:py-14">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-5 flex items-center justify-center gap-2 text-sm font-semibold text-primary">
          <span className="grid size-9 place-items-center rounded-xl bg-primary/10">
            <ToothLogo className="size-5" />
          </span>
          {info?.clinica || "Tu turno"}
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
              <p className="mt-1 text-sm text-muted-foreground">Este es tu turno en {info.clinica}:</p>

              <div className="mt-4 rounded-2xl border border-primary/15 bg-primary/[0.04] p-4">
                <p className="text-lg font-bold leading-tight">{fechaLarga(info.fecha)}</p>
                <p className="mt-0.5 text-2xl font-extrabold tabular-nums text-primary">{info.hora} hs</p>
                <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {info.profesional && (
                    <p className="flex items-center gap-1.5">
                      <Stethoscope className="size-4 text-primary/70" /> {info.profesional}
                    </p>
                  )}
                  {info.sucursal && (
                    <p className="flex items-center gap-1.5">
                      <MapPin className="size-4 text-primary/70" /> {info.sucursal}
                    </p>
                  )}
                </div>
              </div>

              {cerrado ? (
                <p className="mt-4 rounded-xl bg-muted px-3 py-2.5 text-sm">
                  {info.estado === "Cancelada" && respondio === "cancelo"
                    ? "Listo, cancelaste tu turno. ¡Gracias por avisar! Cuando quieras uno nuevo, escribile a la clínica."
                    : info.estado === "Cancelada"
                    ? "Este turno está cancelado. Si querés uno nuevo, escribile a la clínica."
                    : info.pasado || info.estado === "Atendida"
                      ? "Este turno ya pasó. ¡Gracias!"
                      : "Este turno ya no se puede modificar. Escribile a la clínica."}
                </p>
              ) : respondio === "confirmo" || info.estado === "Confirmada" ? (
                <div className="mt-4 text-center">
                  <CheckCircle2 className="mx-auto size-12 text-emerald-500" />
                  <p className="mt-2 text-lg font-extrabold">¡Turno confirmado!</p>
                  <p className="text-sm text-muted-foreground">Te esperamos. Si te surge algo, podés pedir cambiarlo acá.</p>
                  {!cambiar && (
                    <button type="button" onClick={() => setCambiar(true)} className="mt-3 text-sm font-semibold text-primary underline-offset-2 hover:underline">
                      Necesito cambiarlo
                    </button>
                  )}
                </div>
              ) : respondio === "cambiar" && !cambiar ? (
                <div className="mt-4 text-center">
                  <CalendarClock className="mx-auto size-12 text-amber-500" />
                  <p className="mt-2 text-lg font-extrabold">¡Listo! Te vamos a escribir</p>
                  <p className="text-sm text-muted-foreground">La clínica ya sabe que necesitás otro horario y te contacta para darte uno.</p>
                </div>
              ) : (
                !cambiar &&
                !cancelar && (
                  <div className="mt-4 space-y-2">
                    <button
                      type="button"
                      disabled={enviando}
                      onClick={() => void responder("confirmo")}
                      className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary via-violet-500 to-fuchsia-500 text-base font-semibold text-white shadow-[0_14px_30px_-14px_rgba(124,58,237,0.9)] disabled:opacity-50"
                    >
                      {enviando ? <Loader2 className="size-5 animate-spin" /> : <CalendarCheck2 className="size-5" />} Confirmo
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" disabled={enviando} onClick={() => setCambiar(true)} className="h-11 rounded-full border border-primary/20 bg-card text-sm font-semibold text-primary hover:bg-primary/5">
                        Necesito cambiarlo
                      </button>
                      <button type="button" disabled={enviando} onClick={() => setCancelar(true)} className="h-11 rounded-full border border-rose-200 bg-card text-sm font-semibold text-rose-600 hover:bg-rose-50">
                        No puedo ir
                      </button>
                    </div>
                  </div>
                )
              )}

              {!cerrado && (cambiar || cancelar) && (
                <div className="mt-4 space-y-2.5 rounded-2xl border border-primary/15 p-3">
                  <p className="text-sm font-semibold">
                    {cambiar ? "¿Qué días u horarios te quedan mejor?" : "¿Querés contarnos el motivo? (opcional)"}
                  </p>
                  <textarea
                    rows={2}
                    maxLength={300}
                    value={nota}
                    onChange={(e) => setNota(e.target.value)}
                    placeholder={cambiar ? "Ej: martes o jueves por la tarde" : "Ej: me surgió un viaje"}
                    className="w-full resize-y rounded-xl border border-primary/15 bg-card px-3 py-2 text-sm"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCambiar(false);
                        setCancelar(false);
                      }}
                      className="h-11 rounded-full border border-border bg-card text-sm font-semibold"
                    >
                      Volver
                    </button>
                    <button
                      type="button"
                      disabled={enviando}
                      onClick={() => void responder(cambiar ? "cambiar" : "cancelo")}
                      className={`flex h-11 items-center justify-center gap-1.5 rounded-full text-sm font-semibold text-white disabled:opacity-50 ${cambiar ? "bg-primary" : "bg-rose-600"}`}
                    >
                      {enviando ? <Loader2 className="size-4 animate-spin" /> : cambiar ? <CalendarClock className="size-4" /> : <CalendarX2 className="size-4" />}
                      {cambiar ? "Pedir otro horario" : "Cancelar turno"}
                    </button>
                  </div>
                </div>
              )}

              {error && <p className="mt-3 text-sm font-medium text-destructive">{error}</p>}
            </>
          )}
        </div>
        <p className="mt-4 text-center text-[11px] text-muted-foreground">Tus datos se guardan de forma segura y solo los ve tu clínica.</p>
      </div>
    </main>
  );
}
