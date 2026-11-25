import { createFileRoute } from "@tanstack/react-router";
import { Camera, CheckCircle2, FileUp, Loader2, ShieldX, Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { ToothLogo } from "@/components/admin/logo";
import { API_URL } from "@/lib/clinica/api";
import { achicarFoto } from "@/lib/clinica/subir-imagen";

/* Ubicación: src/routes/subir-estudio.$token.tsx
   PÁGINA PÚBLICA para que el PACIENTE suba su estudio (radiografía, tomografía, PDF del centro
   radiológico) con el enlace que le mandó la clínica por WhatsApp. Sin iniciar sesión.
   Los archivos van directo a Cloudinary; la ficha del paciente lo recibe solo, para revisar. */

export const Route = createFileRoute("/subir-estudio/$token")({
  head: () => ({
    meta: [{ title: "Subir estudio — Cloud Esther" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: SubirEstudio,
});

type Info = { clinica: string; nombre: string; tipo: string; vence: string; restantes: number };
type Firma = { cloudName: string; apiKey: string; timestamp: number; signature: string; folder: string };

async function pedir<T>(ruta: string, metodo = "GET", cuerpo?: unknown): Promise<T> {
  const r = await fetch(`${API_URL}${ruta}`, {
    method: metodo,
    headers: cuerpo !== undefined ? { "Content-Type": "application/json" } : {},
    ...(cuerpo !== undefined ? { body: JSON.stringify(cuerpo) } : {}),
  });
  if (!r.ok) throw new Error((await r.text().catch(() => "")) || "No pudimos conectarnos. Probá de nuevo.");
  return (await r.json()) as T;
}

function SubirEstudio() {
  const { token } = Route.useParams();
  const [info, setInfo] = useState<Info | null>(null);
  const [error, setError] = useState("");
  const [archivos, setArchivos] = useState<File[]>([]);
  const [subiendo, setSubiendo] = useState(false);
  const [listo, setListo] = useState(false);
  const archivoRef = useRef<HTMLInputElement>(null);
  const camaraRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!API_URL) return setError("Esta página todavía no está disponible.");
    pedir<Info>(`/public/estudios/${token}`)
      .then(setInfo)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "El enlace no es válido."));
  }, [token]);

  const agregar = (lista: FileList | null) => {
    if (!lista || !info) return;
    const validos = Array.from(lista).filter((f) => f.type.startsWith("image/") || f.type === "application/pdf");
    if (validos.length < lista.length) setError("Solo se pueden subir fotos o archivos PDF.");
    else setError("");
    const grandes = validos.filter((f) => f.size > 15 * 1024 * 1024);
    if (grandes.length) setError("Algún archivo pesa más de 15 MB.");
    setArchivos((prev) => [...prev, ...validos.filter((f) => f.size <= 15 * 1024 * 1024)].slice(0, info.restantes));
  };

  const enviar = async () => {
    if (!archivos.length) return;
    setSubiendo(true);
    setError("");
    try {
      const subidos: { url: string; nombre: string; formato: string }[] = [];
      for (const f of archivos) {
        // Las fotos se achican un poco (se siguen viendo nítidas) para que suban rápido
        const archivo = f.type.startsWith("image/") ? await achicarFoto(f, 2400) : f;
        const firma = await pedir<Firma>(`/public/estudios/${token}/firma`, "POST");
        const fd = new FormData();
        fd.append("file", archivo, f.name);
        fd.append("api_key", firma.apiKey);
        fd.append("timestamp", String(firma.timestamp));
        fd.append("signature", firma.signature);
        fd.append("folder", firma.folder);
        const r = await fetch(`https://api.cloudinary.com/v1_1/${firma.cloudName}/auto/upload`, { method: "POST", body: fd });
        if (!r.ok) throw new Error("No se pudo subir un archivo. Revisá tu conexión y probá de nuevo.");
        const j = (await r.json()) as { secure_url?: string; format?: string };
        if (!j.secure_url) throw new Error("No se pudo subir un archivo. Probá de nuevo.");
        subidos.push({ url: j.secure_url, nombre: f.name.slice(0, 160), formato: j.format ?? "" });
      }
      await pedir(`/public/estudios/${token}/listo`, "POST", { archivos: subidos });
      setListo(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir. Probá de nuevo.");
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_50%_0%,rgba(124,58,237,0.14),transparent_60%)] bg-background px-4 py-8 sm:py-14">
      <div className="mx-auto w-full max-w-lg">
        <div className="mb-5 flex items-center justify-center gap-2 text-sm font-semibold text-primary">
          <span className="grid size-9 place-items-center rounded-xl bg-primary/10">
            <ToothLogo className="size-5" />
          </span>
          {info?.clinica || "Subir estudio"}
        </div>

        <div className="rounded-[26px] border border-primary/15 bg-card p-5 shadow-[0_30px_70px_-35px_rgba(76,29,149,0.6)] sm:p-6">
          {!info && !error && (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Abriendo…
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

          {info && listo && (
            <div className="py-4 text-center">
              <CheckCircle2 className="mx-auto size-14 text-emerald-500" />
              <p className="mt-3 text-xl font-extrabold">¡Listo{info.nombre ? `, ${info.nombre}` : ""}!</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Tu estudio ya llegó a {info.clinica}. Ya podés cerrar esta página.
              </p>
            </div>
          )}

          {info && !listo && (
            <>
              <h1 className="text-xl font-extrabold leading-tight">
                Hola{info.nombre ? ` ${info.nombre}` : ""} 👋
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Subí acá {info.tipo ? `tu ${info.tipo.toLowerCase()}` : "tu estudio"}: una foto clara de la placa o el
                PDF que te dio el centro radiológico. Llega directo a tu ficha en {info.clinica}.
              </p>

              {info.restantes <= 0 ? (
                <p className="mt-4 rounded-xl bg-muted px-3 py-2 text-sm">Ya se subieron todos los archivos de este enlace.</p>
              ) : (
                <>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => camaraRef.current?.click()}
                      className="flex flex-col items-center gap-1.5 rounded-2xl border border-primary/20 bg-primary/[0.04] px-3 py-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/[0.08]"
                    >
                      <Camera className="size-6" />
                      Sacar foto
                    </button>
                    <button
                      type="button"
                      onClick={() => archivoRef.current?.click()}
                      className="flex flex-col items-center gap-1.5 rounded-2xl border border-primary/20 bg-primary/[0.04] px-3 py-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/[0.08]"
                    >
                      <FileUp className="size-6" />
                      Elegir archivo
                    </button>
                  </div>
                  <input
                    ref={camaraRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      agregar(e.target.files);
                      e.target.value = "";
                    }}
                  />
                  <input
                    ref={archivoRef}
                    type="file"
                    accept="image/*,application/pdf"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      agregar(e.target.files);
                      e.target.value = "";
                    }}
                  />

                  {archivos.length > 0 && (
                    <ul className="mt-3 space-y-1.5">
                      {archivos.map((f, i) => (
                        <li key={`${f.name}-${i}`} className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm">
                          <Upload className="size-4 shrink-0 text-primary" />
                          <span className="min-w-0 flex-1 truncate">{f.name}</span>
                          {!subiendo && (
                            <button
                              type="button"
                              aria-label={`Quitar ${f.name}`}
                              onClick={() => setArchivos((prev) => prev.filter((_, j) => j !== i))}
                              className="grid size-6 place-items-center rounded-full text-muted-foreground hover:bg-muted"
                            >
                              <X className="size-3.5" />
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}

                  {error && <p className="mt-3 text-sm font-medium text-destructive">{error}</p>}

                  <button
                    type="button"
                    disabled={!archivos.length || subiendo}
                    onClick={() => void enviar()}
                    className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary via-violet-500 to-fuchsia-500 text-base font-semibold text-white shadow-[0_14px_30px_-14px_rgba(124,58,237,0.9)] transition-opacity disabled:opacity-50"
                  >
                    {subiendo ? <Loader2 className="size-5 animate-spin" /> : <Upload className="size-5" />}
                    {subiendo ? "Subiendo…" : archivos.length > 1 ? `Enviar ${archivos.length} archivos` : "Enviar"}
                  </button>
                  <p className="mt-2 text-center text-[11px] text-muted-foreground">
                    Hasta {info.restantes} archivo{info.restantes === 1 ? "" : "s"} · Fotos o PDF de hasta 15 MB
                  </p>
                </>
              )}
            </>
          )}
        </div>
        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          Tus archivos se guardan de forma segura y solo los ve tu clínica.
        </p>
      </div>
    </main>
  );
}
