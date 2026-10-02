import { Check, Eye, EyeOff } from "lucide-react";
import { useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/* Campo de contraseña con mostrar/ocultar y reglas visibles. */

export function CampoClave({
  id,
  label,
  value,
  onChange,
  autoComplete = "new-password",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
}) {
  const [ver, setVer] = useState(false);
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={ver ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 pr-9"
        />
        <button
          type="button"
          onClick={() => setVer((v) => !v)}
          aria-label={ver ? "Ocultar contraseña" : "Mostrar contraseña"}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          {ver ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

export function ReglasClave({ clave }: { clave: string }) {
  const reglas = [
    ["Al menos 10 caracteres", clave.length >= 10],
    ["Mayúsculas y minúsculas", /[A-Z]/.test(clave) && /[a-z]/.test(clave)],
    ["Al menos un número", /[0-9]/.test(clave)],
  ] as const;
  return (
    <ul className="grid gap-1 text-xs">
      {reglas.map(([t, ok]) => (
        <li
          key={t}
          className={cn("flex items-center gap-1.5", ok ? "text-success" : "text-muted-foreground")}
        >
          <Check className={cn("h-3.5 w-3.5", ok ? "opacity-100" : "opacity-30")} />
          {t}
        </li>
      ))}
    </ul>
  );
}
