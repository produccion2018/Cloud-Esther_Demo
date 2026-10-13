import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";

import { ToothLogo } from "@/components/admin/logo";
import { Toaster } from "@/components/ui/sonner";

/* Ubicación: src/components/clinica/marco.tsx
   Marco de las pantallas SIN sesión de cada clínica (ingresar, elegir o recuperar la contraseña).
   Muestra el nombre de LA clínica de esta dirección. */
export function MarcoClinica({ nombre, children }: { nombre: string | null; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 px-4 py-10">
      <Toaster position="top-center" richColors closeButton />
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl text-primary-foreground"
            style={{ background: "var(--gradient-primary)" }}
          >
            <ToothLogo className="h-8 w-8" />
          </div>
          <div>
            <p className="text-xl font-extrabold tracking-tight">{nombre ?? "Tu clínica"}</p>
            <p className="text-xs text-muted-foreground">Cloud Esther</p>
          </div>
        </div>
        <div className="rounded-2xl border bg-card p-6 shadow-sm">{children}</div>
        <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" /> Acceso privado de la clínica. Cada ingreso queda registrado.
        </p>
      </div>
    </div>
  );
}

export function MensajeError({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
      {children}
    </p>
  );
}
