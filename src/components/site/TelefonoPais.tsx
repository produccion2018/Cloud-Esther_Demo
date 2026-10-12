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
}: {
  /** Código del país elegido (AR, CL…). Vacío = todavía no eligió. */
  pais: string;
  id?: string;
  name?: string;
  placeholder?: string;
}) {
  const [numero, setNumero] = useState("");
  const prefijo = PAISES_DEMO.find((p) => p.codigo === pais)?.prefijo;
  const limpio = numero.replace(/[^0-9 ()\-.]/g, "");
  return (
    <div>
      <div className="flex">
        <span
          className="inline-flex h-10 min-w-[64px] items-center justify-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm font-semibold text-muted-foreground"
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
          className="h-10 rounded-l-none"
        />
      </div>
      <input type="hidden" name={name} value={prefijo && limpio ? `+${prefijo} ${limpio}` : ""} />
      <p className="mt-1 text-[11px] text-muted-foreground">
        El código del país se pone solo según el país que elegiste.
      </p>
    </div>
  );
}
