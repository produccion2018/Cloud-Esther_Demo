import { useRef, useState } from "react";
import { FileText, ImagePlus, Lock, Palette, Smartphone, Trash2 } from "lucide-react";

import { MARCA_VACIA, type ClinicSettings, type MarcaClinica } from "@/lib/cloud-esther/settings-store";
import { ToggleSwitch } from "@/components/cloud-esther/ToggleSwitch";

/* Ubicación: src/components/cloud-esther/configuracion/MarcaClinica.tsx
   Configuración → Apariencia → MARCA PROPIA (white label, Plus y Enterprise).
   Logo y color de la clínica: aparecen en el menú del sistema, el portal del paciente y los
   documentos (recetas, consentimientos…). Solo el Administrador lo cambia.
   El logo se achica a 256 px antes de guardarse (TODO Cloudinary: subirlo allá). */

const COLORES = ["#7c3aed", "#2563eb", "#0891b2", "#059669", "#d97706", "#e11d48", "#db2777", "#0f172a"];

async function achicarLogo(f: File): Promise<string> {
  const url = URL.createObjectURL(f);
  try {
    const img = await new Promise<HTMLImageElement>((ok, mal) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = mal;
      i.src = url;
    });
    const escala = Math.min(1, 256 / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(img.width * escala));
    c.height = Math.max(1, Math.round(img.height * escala));
    c.getContext("2d")?.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function MarcaClinicaCard({
  settings,
  actualizar,
  habilitada,
  onToast,
}: {
  settings: ClinicSettings;
  actualizar: <K extends keyof ClinicSettings>(key: K, value: ClinicSettings[K]) => void;
  habilitada: boolean;
  onToast: (m: string) => void;
}) {
  const marca: MarcaClinica = { ...MARCA_VACIA, ...(settings.marca ?? {}) };
  const archivo = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const cambiar = (c: Partial<MarcaClinica>) => actualizar("marca", { ...marca, ...c });
  const nombre = settings.datosClinica.nombre || "Tu clínica";

  return (
    <section className="relative mt-5 overflow-hidden rounded-3xl border border-primary/12 bg-card shadow-[0_22px_50px_-36px_rgba(76,29,149,0.65)]">
      <div className="relative overflow-hidden bg-[linear-gradient(118deg,#4c1d95,#7c3aed_45%,#c026d3)] px-5 py-4 text-white">
        <div aria-hidden className="pointer-events-none absolute -right-10 -top-14 size-40 rounded-full bg-fuchsia-300/30 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl border border-white/30 bg-white/15">
            <Palette className="size-5" />
          </span>
          <div className="flex-1">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-white/70">Marca propia · Plus y Enterprise</p>
            <p className="font-display text-lg font-bold">Tu logo y tu color en todo el sistema</p>
          </div>
        </div>
      </div>

      {!habilitada ? (
        <div className="flex flex-col items-center gap-2 px-6 py-8 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-gradient-to-br from-primary to-fuchsia-500 text-white">
            <Lock className="size-5" />
          </span>
          <p className="font-display font-bold">Disponible en los planes Plus y Enterprise</p>
          <p className="max-w-md text-xs text-muted-foreground">
            Tus pacientes ven tu clínica, no la nuestra: logo y color en el sistema, el portal del paciente y los documentos.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 p-5 lg:grid-cols-[1fr_300px]">
          <div className="space-y-4">
            <div>
              <p className="text-sm font-bold">Logo</p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <span className="grid size-20 place-items-center overflow-hidden rounded-2xl border border-dashed border-primary/25 bg-muted/40">
                  {marca.logo ? <img src={marca.logo} alt="Logo de la clínica" className="max-h-16 max-w-16 object-contain" /> : <ImagePlus className="size-6 text-muted-foreground" />}
                </span>
                <button type="button" onClick={() => archivo.current?.click()} className="btn-ce-outline !min-h-10">
                  <ImagePlus className="size-4" /> {marca.logo ? "Cambiar logo" : "Subir logo"}
                </button>
                {marca.logo && (
                  <button type="button" onClick={() => cambiar({ logo: "" })} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-muted-foreground hover:bg-rose-50 hover:text-rose-600">
                    <Trash2 className="size-4" /> Quitar
                  </button>
                )}
                <input
                  ref={archivo}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                  aria-label="Logo de la clínica"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (!f) return;
                    setError("");
                    if (f.size > 4 * 1024 * 1024) return setError("La imagen pesa más de 4 MB.");
                    try {
                      cambiar({ logo: await achicarLogo(f) });
                      onToast("Logo actualizado");
                    } catch {
                      setError("No pude leer la imagen. Probá con PNG o JPG.");
                    }
                  }}
                />
              </div>
              <p className="mt-1.5 text-[11px] text-muted-foreground">PNG con fondo transparente queda mejor. Se achica solo.</p>
              {error && <p className="mt-1 text-xs font-semibold text-rose-600">{error}</p>}
            </div>
            <div>
              <p className="text-sm font-bold">Color de la marca</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {COLORES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Color ${c}`}
                    aria-pressed={marca.color === c}
                    onClick={() => cambiar({ color: c })}
                    className={`size-9 rounded-xl shadow-sm transition hover:scale-110 ${marca.color === c ? "ring-2 ring-offset-2 ring-offset-card" : ""}`}
                    style={{ background: c, ["--tw-ring-color" as string]: c }}
                  />
                ))}
                <label className="inline-flex items-center gap-2 rounded-xl border border-primary/12 px-2 py-1 text-xs font-semibold">
                  Otro
                  <input type="color" value={marca.color} onChange={(e) => cambiar({ color: e.target.value })} className="size-7 cursor-pointer rounded-md border-0 bg-transparent" />
                </label>
              </div>
            </div>
            <div className="space-y-2.5 rounded-2xl border border-primary/10 bg-muted/30 p-3.5">
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <Smartphone className="size-4 text-primary" /> En el portal del paciente
                </span>
                <ToggleSwitch checked={marca.enPortal} onChange={(v) => cambiar({ enPortal: v })} label="Marca en el portal del paciente" />
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <FileText className="size-4 text-primary" /> En recetas y documentos
                </span>
                <ToggleSwitch checked={marca.enDocumentos} onChange={(v) => cambiar({ enDocumentos: v })} label="Marca en documentos" />
              </div>
            </div>
          </div>
          {/* Vista previa */}
          <div className="space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Vista previa</p>
            <div className="overflow-hidden rounded-2xl border border-primary/10 shadow-sm">
              <div className="flex items-center gap-2.5 px-3.5 py-3 text-white" style={{ background: `linear-gradient(118deg, ${marca.color}, ${marca.color}cc)` }}>
                {marca.logo ? <img src={marca.logo} alt="" className="size-9 rounded-lg bg-white/90 object-contain p-1" /> : <span className="grid size-9 place-items-center rounded-lg bg-white/20 text-sm font-bold">{nombre[0]}</span>}
                <span>
                  <span className="block text-sm font-bold">{nombre}</span>
                  <span className="block text-[10.5px] text-white/80">Portal del paciente</span>
                </span>
              </div>
              <div className="space-y-1.5 bg-card p-3.5">
                <span className="block h-2 w-3/4 rounded-full bg-muted" />
                <span className="block h-2 w-1/2 rounded-full bg-muted" />
                <span className="mt-2 inline-block rounded-lg px-3 py-1.5 text-[11px] font-bold text-white" style={{ background: marca.color }}>Pedir turno</span>
              </div>
            </div>
            <div className="rounded-2xl border border-primary/10 bg-white p-3.5 text-slate-800 shadow-sm">
              <div className="flex items-center gap-2 border-b-2 pb-2" style={{ borderColor: marca.color }}>
                {marca.logo && <img src={marca.logo} alt="" className="h-7 max-w-16 object-contain" />}
                <span className="text-xs font-bold" style={{ color: marca.color }}>{nombre}</span>
              </div>
              <p className="mt-2 text-[10px] text-slate-500">Receta · membrete con tu marca</p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
