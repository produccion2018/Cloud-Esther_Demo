import { useState } from "react";
import { Input } from "@/components/ui/input";
import { PAISES_DEMO } from "@/lib/cloud-esther/demo-servidor";

/* Ubicación: src/components/site/TelefonoPais.tsx
   Teléfono con el código del país FIJO (+54 Argentina, +57 Colombia…): no se puede cambiar.
   El número que se manda es "+<código> <lo que escribió>" en el campo oculto `name`.
   El servidor vuelve a verificar que el teléfono sea del país elegido. */

export function TelefonoPais({
  pais,
  id = "telefono",
  name = "telefono",
  placeholder = "11 5555 5555",
  premium = false,
}: {
  /** Estilo de los formularios destacados (más alto y redondeado) */
  premium?: boolean;
  /** Código del país elegido (AR, CL…). Vacío = todavía no eligió. */
  pais: string;
  id?: string;
  name?: string;
  placeholder?: string;
}) {
  const [numero, setNumero] = useState("");
  const prefijo = PAISES_DEMO.find((p) => p.codigo === pais)?.prefijo;
  // Si la persona escribe el código del país ("+54 11…"), se saca: ya va fijo adelante
  let limpio = numero.replace(/[^0-9+ ()\-.]/g, "");
  if (prefijo && limpio.trim().startsWith("+")) {
    limpio = limpio.trim().slice(1).trimStart();
    if (limpio.startsWith(prefijo)) limpio = limpio.slice(prefijo.length).trimStart();
  }
  limpio = limpio.replace(/\+/g, "");
  return (
    <div>
      <div className="flex">
        <span
          className={
            premium
              ? "inline-flex h-12 min-w-[72px] items-center justify-center rounded-l-2xl border border-r-0 border-primary/20 bg-primary/[0.07] px-3 text-sm font-bold text-primary"
              : "inline-flex h-10 min-w-[64px] items-center justify-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm font-semibold text-muted-foreground"
          }
          title="Código del país elegido (no se puede cambiar)"
        >
          {prefijo ? `+${prefijo}` : "+ —"}
        </span>
        <Input
          id={id}
          type="tel"
          inputMode="tel"
          required
          disabled={!prefijo}
          maxLength={30}
          value={limpio}
          onChange={(e) => setNumero(e.target.value)}
          placeholder={prefijo ? placeholder : "Primero elegí el país"}
          className={
            premium
              ? "h-12 rounded-l-none rounded-r-2xl border-primary/15 bg-white text-[15px] shadow-[0_1px_2px_rgba(30,0,60,0.05)] focus-visible:ring-primary/40 dark:bg-card"
              : "h-10 rounded-l-none"
          }
        />
      </div>
      <input type="hidden" name={name} value={prefijo && limpio ? `+${prefijo} ${limpio}` : ""} />
      <p className="mt-1 text-[11px] text-muted-foreground">
        El código del país se pone solo según el país que elegiste.
      </p>
    </div>
  );
}
