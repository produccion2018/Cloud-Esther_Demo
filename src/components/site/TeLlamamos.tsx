import { Building2, CheckCircle2, Clock, Loader2, MessageCircle, PhoneCall, ShieldCheck, Sparkles, User } from "lucide-react";
import { useState, type FormEvent } from "react";

import { TelefonoPais } from "@/components/site/TelefonoPais";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PAISES_DEMO } from "@/lib/cloud-esther/demo-servidor";

/* Ubicación: src/components/site/TeLlamamos.tsx
   «TE LLAMAMOS GRATIS» (web pública): botón flotante abajo a la izquierda. La clínica deja su nombre,
   teléfono, motivo y horario; llega al panel (Atención → Pedidos de llamada) con aviso en la campanita.
   Las secretarias llaman por WhatsApp (gratis) o por teléfono. */

const API_URL = (import.meta.env["VITE_ADMIN_API_URL"] as string | undefined)?.replace(/\/$/, "");
const HORARIOS = ["Cuanto antes", "Mañana (9 a 12)", "Mediodía (12 a 15)", "Tarde (15 a 19)"] as const;
// Campos grandes y redondeados (formulario de venta: tiene que verse impecable)
const CAMPO =
  "h-12 w-full rounded-2xl border border-primary/15 bg-white px-4 text-[15px] shadow-[0_1px_2px_rgba(30,0,60,0.05)] outline-none transition placeholder:text-muted-foreground/70 focus:border-primary/40 focus:ring-4 focus:ring-primary/10 dark:bg-card";
const ETIQUETA = "text-[13px] font-semibold tracking-tight text-foreground/85";

export function TeLlamamos() {
  const [abierto, setAbierto] = useState(false);
  const [pais, setPais] = useState("");
  const [horario, setHorario] = useState<string>(HORARIOS[0]);
  const [estado, setEstado] = useState<"inicio" | "enviando" | "listo">("inicio");
  const [error, setError] = useState<string | null>(null);

  // Sin servidor conectado (vista previa) no se muestra
  if (!API_URL) return null;

  const enviar = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const dato = (k: string) => String(f.get(k) ?? "").trim();
    if (!dato("nombre")) return setError("Escribí tu nombre.");
    if (!pais) return setError("Elegí tu país.");
    if (!dato("telefono")) return setError("Escribí tu teléfono.");
    setError(null);
    setEstado("enviando");
    try {
      const r = await fetch(`${API_URL}/llamame`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: dato("nombre"),
          telefono: dato("telefono"),
          pais,
          horario: dato("horario") || "Cuanto antes",
          ...(dato("clinica") ? { clinica: dato("clinica") } : {}),
          ...(dato("motivo") ? { motivo: dato("motivo") } : {}),
          ...(dato("web") ? { web: dato("web") } : {}),
        }),
      });
      if (!r.ok) {
        setError((await r.text().catch(() => "")) || "No pudimos enviar el pedido. Probá de nuevo.");
        setEstado("inicio");
        return;
      }
      setEstado("listo");
    } catch {
      setError("No pudimos conectarnos. Probá de nuevo en unos segundos.");
      setEstado("inicio");
    }
  };

  const cerrar = (v: boolean) => {
    setAbierto(v);
    if (!v && estado === "listo") {
      setEstado("inicio");
      setPais("");
      setHorario(HORARIOS[0]);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        aria-label="Te llamamos gratis: dejanos tu teléfono"
        className="group fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-4 z-40 inline-flex items-center gap-2.5 overflow-hidden rounded-full border border-white/30 bg-gradient-to-br from-primary via-violet-600 to-fuchsia-500 py-1.5 pl-1.5 pr-4 text-white shadow-[0_14px_34px_-10px_rgba(124,58,237,0.65),inset_0_1px_0_rgba(255,255,255,0.35)] ring-1 ring-primary/20 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_44px_-12px_rgba(124,58,237,0.8),inset_0_1px_0_rgba(255,255,255,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 active:translate-y-0 sm:left-6 sm:gap-3 sm:py-2 sm:pl-2 sm:pr-5 md:bottom-7 md:left-7"
      >
        {/* Brillo que cruza el botón al pasar el mouse */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 transition-all duration-700 group-hover:left-full group-hover:opacity-100"
        />
        <span className="relative grid size-9 shrink-0 place-items-center rounded-full bg-white text-primary shadow-[0_6px_14px_-6px_rgba(0,0,0,0.35)] sm:size-10">
          <span aria-hidden className="absolute inset-0 rounded-full bg-white/70 motion-safe:animate-ping [animation-duration:2.4s]" />
          <PhoneCall className="relative size-4 transition-transform duration-300 group-hover:rotate-12 sm:size-[18px]" />
        </span>
        <span className="relative text-left leading-tight">
          <span className="block text-[13px] font-bold tracking-tight sm:text-sm">Te llamamos gratis</span>
          <span className="hidden text-[11px] font-medium text-white/80 sm:block">Por teléfono o WhatsApp</span>
        </span>
        <span aria-hidden className="relative -mr-1 hidden size-2 rounded-full bg-[#6ee7b7] shadow-[0_0_10px_rgba(110,231,183,0.95)] sm:block" />
      </button>

      <Dialog open={abierto} onOpenChange={cerrar}>
        <DialogContent className="max-h-[92dvh] gap-0 overflow-y-auto rounded-[28px] [&>button:last-child]:z-10 [&>button:last-child]:text-white [&>button:last-child]:opacity-90 border-primary/15 p-0 shadow-[0_40px_90px_-40px_rgba(76,29,149,0.6)] sm:max-w-[480px]">
          {/* Encabezado con la marca */}
          <div className="relative overflow-hidden bg-gradient-to-br from-primary via-violet-600 to-fuchsia-500 px-6 pb-6 pt-7 text-white sm:px-8">
            <span aria-hidden className="pointer-events-none absolute -right-14 -top-16 size-48 rounded-full bg-white/15 blur-2xl" />
            <span aria-hidden className="pointer-events-none absolute -bottom-20 -left-10 size-40 rounded-full bg-fuchsia-300/30 blur-2xl" />
            <DialogHeader className="relative space-y-2 text-left">
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ring-1 ring-white/25">
                <Sparkles className="size-3" /> Asesoría sin costo
              </span>
              <DialogTitle className="flex items-center gap-3 text-[26px] font-extrabold leading-tight tracking-[-0.02em] text-white">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white text-primary shadow-[0_10px_24px_-10px_rgba(0,0,0,0.45)]">
                  <PhoneCall className="size-5" />
                </span>
                Te llamamos gratis
              </DialogTitle>
              <DialogDescription className="text-[14px] leading-relaxed text-white/85">
                Dejanos tus datos y alguien del equipo de Cloud Esther te llama por teléfono o WhatsApp, en el horario que elijas.
              </DialogDescription>
            </DialogHeader>
            <div className="relative mt-4 flex flex-wrap gap-2 text-[11px] font-semibold">
              {[
                { i: CheckCircle2, t: "Sin costo" },
                { i: MessageCircle, t: "Teléfono o WhatsApp" },
                { i: ShieldCheck, t: "Datos protegidos" },
              ].map((x) => (
                <span key={x.t} className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-2.5 py-1 ring-1 ring-white/20">
                  <x.i className="size-3.5" /> {x.t}
                </span>
              ))}
            </div>
          </div>

          <div className="px-6 py-6 sm:px-8">
            {estado === "listo" ? (
              <div className="space-y-4 py-4 text-center">
                <span className="mx-auto grid size-16 place-items-center rounded-3xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-[0_16px_30px_-14px_rgba(16,185,129,0.8)]">
                  <CheckCircle2 className="size-8" />
                </span>
                <p className="text-xl font-extrabold tracking-tight">¡Listo! Recibimos tu pedido</p>
                <p className="text-sm text-muted-foreground">Te vamos a llamar en el horario que elegiste. ¡Gracias por elegir Cloud Esther!</p>
                <Button onClick={() => cerrar(false)} className="h-12 w-full rounded-2xl text-[15px] font-bold">
                  Cerrar
                </Button>
              </div>
            ) : (
              <form onSubmit={(e) => void enviar(e)} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="ll-nombre" className={ETIQUETA}>
                      Tu nombre
                    </Label>
                    <div className="relative">
                      <User className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-primary/60" />
                      <Input id="ll-nombre" name="nombre" maxLength={120} required autoComplete="name" placeholder="Nombre y apellido" className={`${CAMPO} pl-10`} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ll-clinica" className={ETIQUETA}>
                      Clínica <span className="font-normal text-muted-foreground">(opcional)</span>
                    </Label>
                    <div className="relative">
                      <Building2 className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-primary/60" />
                      <Input id="ll-clinica" name="clinica" maxLength={160} autoComplete="organization" placeholder="Nombre de la clínica" className={`${CAMPO} pl-10`} />
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ll-pais" className={ETIQUETA}>
                    País
                  </Label>
                  <select id="ll-pais" value={pais} onChange={(e) => setPais(e.target.value)} className={CAMPO} required>
                    <option value="">Elegí tu país</option>
                    {PAISES_DEMO.map((p) => (
                      <option key={p.codigo} value={p.codigo}>
                        {p.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ll-telefono" className={ETIQUETA}>
                    Teléfono o WhatsApp
                  </Label>
                  <TelefonoPais pais={pais} id="ll-telefono" premium />
                </div>
                <fieldset className="space-y-2">
                  <legend className={`${ETIQUETA} mb-1.5 flex items-center gap-1.5`}>
                    <Clock className="size-3.5 text-primary" /> ¿Cuándo te llamamos?
                  </legend>
                  <input type="hidden" name="horario" value={horario} />
                  <div className="grid grid-cols-2 gap-2">
                    {HORARIOS.map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setHorario(h)}
                        aria-pressed={horario === h}
                        className={
                          horario === h
                            ? "rounded-2xl bg-gradient-to-br from-primary to-fuchsia-500 px-3 py-2.5 text-[13px] font-bold text-white shadow-[0_10px_22px_-12px_rgba(124,58,237,0.9)]"
                            : "rounded-2xl border border-primary/15 bg-white px-3 py-2.5 text-[13px] font-semibold text-foreground/75 transition hover:border-primary/40 hover:text-primary dark:bg-card"
                        }
                      >
                        {h}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <div className="space-y-1.5">
                  <Label htmlFor="ll-motivo" className={ETIQUETA}>
                    ¿Sobre qué querés hablar? <span className="font-normal text-muted-foreground">(opcional)</span>
                  </Label>
                  <textarea
                    id="ll-motivo"
                    name="motivo"
                    maxLength={500}
                    rows={3}
                    className="w-full resize-none rounded-2xl border border-primary/15 bg-white px-4 py-3 text-[15px] shadow-[0_1px_2px_rgba(30,0,60,0.05)] outline-none transition placeholder:text-muted-foreground/70 focus:border-primary/40 focus:ring-4 focus:ring-primary/10 dark:bg-card"
                    placeholder="Ej.: precios para 2 sucursales"
                  />
                </div>
                {/* Campo trampa para robots (las personas no lo ven) */}
                <input type="text" name="web" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
                {error && (
                  <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
                    {error}
                  </p>
                )}
                <Button
                  type="submit"
                  disabled={estado === "enviando"}
                  className="h-13 w-full rounded-2xl bg-gradient-to-r from-primary via-violet-600 to-fuchsia-500 py-3.5 text-[15px] font-bold text-white shadow-[0_16px_32px_-14px_rgba(124,58,237,0.9)] transition hover:-translate-y-0.5 hover:opacity-95"
                >
                  {estado === "enviando" ? <Loader2 className="size-4 animate-spin" /> : <PhoneCall className="size-4" />}
                  Pedir que me llamen
                </Button>
                <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground">
                  <ShieldCheck className="size-3.5 text-emerald-600" /> Usamos tus datos solo para llamarte. No los compartimos.
                </p>
              </form>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
