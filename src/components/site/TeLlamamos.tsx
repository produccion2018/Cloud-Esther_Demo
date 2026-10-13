import { CheckCircle2, Loader2, PhoneCall } from "lucide-react";
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
const CAMPO = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm";

export function TeLlamamos() {
  const [abierto, setAbierto] = useState(false);
  const [pais, setPais] = useState("");
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
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="fixed bottom-5 left-5 z-40 inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-primary via-violet-600 to-fuchsia-500 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(124,58,237,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 sm:bottom-7 sm:left-7"
      >
        <PhoneCall className="size-4" /> Te llamamos gratis
      </button>

      <Dialog open={abierto} onOpenChange={cerrar}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Te llamamos gratis</DialogTitle>
            <DialogDescription>
              Dejanos tus datos y alguien del equipo de Cloud Esther te llama (por teléfono o WhatsApp) en el horario que
              elijas. Sin costo.
            </DialogDescription>
          </DialogHeader>

          {estado === "listo" ? (
            <div className="space-y-4 text-center">
              <CheckCircle2 className="mx-auto size-10 text-success" />
              <p className="font-semibold">¡Listo! Recibimos tu pedido.</p>
              <p className="text-sm text-muted-foreground">Te vamos a llamar en el horario que elegiste.</p>
              <Button onClick={() => cerrar(false)} className="w-full">
                Cerrar
              </Button>
            </div>
          ) : (
            <form onSubmit={(e) => void enviar(e)} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="ll-nombre">Tu nombre</Label>
                <Input id="ll-nombre" name="nombre" maxLength={120} required autoComplete="name" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ll-clinica">Clínica (opcional)</Label>
                <Input id="ll-clinica" name="clinica" maxLength={160} autoComplete="organization" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ll-pais">País</Label>
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
                <Label htmlFor="ll-telefono">Teléfono o WhatsApp</Label>
                <TelefonoPais pais={pais} id="ll-telefono" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ll-horario">¿Cuándo te llamamos?</Label>
                <select id="ll-horario" name="horario" className={CAMPO} defaultValue="Cuanto antes">
                  {HORARIOS.map((h) => (
                    <option key={h}>{h}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ll-motivo">¿Sobre qué querés hablar? (opcional)</Label>
                <textarea
                  id="ll-motivo"
                  name="motivo"
                  maxLength={500}
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Ej.: precios para 2 sucursales"
                />
              </div>
              {/* Campo trampa para robots (las personas no lo ven) */}
              <input type="text" name="web" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
              {error && (
                <p role="alert" className="text-sm font-medium text-destructive">
                  {error}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={estado === "enviando"}>
                {estado === "enviando" ? <Loader2 className="size-4 animate-spin" /> : <PhoneCall className="size-4" />}
                Pedir que me llamen
              </Button>
              <p className="text-[11px] text-muted-foreground">
                Usamos tus datos solo para llamarte por Cloud Esther. No los compartimos.
              </p>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
