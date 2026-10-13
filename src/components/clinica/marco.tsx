import type { ReactNode } from "react";
import { CalendarDays, ShieldCheck, Stethoscope, UsersRound } from "lucide-react";

import { ToothLogo } from "@/components/admin/logo";
import { Toaster } from "@/components/ui/sonner";

/* Ubicación: src/components/clinica/marco.tsx
   Marco de las pantallas SIN sesión de cada clínica (ingresar, elegir o recuperar la contraseña).
   El protagonista es el NOMBRE de la clínica: es su casa, no la de Cloud Esther.
   Computadora: dos mitades (nombre grande a la izquierda, formulario a la derecha).
   Celular: una franja arriba con el nombre y el formulario abajo. */

const QUE_HAY_ADENTRO = [
  { icono: CalendarDays, texto: "La agenda del día de cada profesional" },
  { icono: Stethoscope, texto: "Pacientes, historias y odontogramas" },
  { icono: UsersRound, texto: "Tu equipo, cada uno con su acceso" },
];

export function MarcoClinica({ nombre, children }: { nombre: string | null; children: ReactNode }) {
  const titulo = nombre ?? "Tu clínica";
  return (
    <>
    {/* El aviso va FUERA de la grilla: si no, ocupa el lugar de la mitad violeta */}
    <Toaster position="top-center" richColors closeButton />
    <div className="grid min-h-screen bg-background lg:grid-cols-[1.1fr_1fr]">

      {/* Mitad de la clínica (solo computadora) */}
      <aside
        className="relative hidden overflow-hidden px-14 py-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between"
        style={{ background: "var(--gradient-primary)" }}
      >
        <ToothLogo className="pointer-events-none absolute -bottom-24 -right-20 h-[30rem] w-[30rem] opacity-[0.07]" />
        <div className="relative flex items-center gap-2.5 text-sm font-semibold opacity-90">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
            <ToothLogo className="h-5 w-5" />
          </span>
          Acceso de la clínica
        </div>

        <div className="relative max-w-lg">
          <h1 className="break-words text-5xl font-extrabold leading-[1.05] tracking-tight xl:text-6xl">{titulo}</h1>
          <p className="mt-5 text-base leading-relaxed opacity-90">
            Entrá con tu correo y tu contraseña. Cada persona del equipo tiene su propio acceso.
          </p>
          <ul className="mt-8 space-y-3 text-sm">
            {QUE_HAY_ADENTRO.map(({ icono: Icono, texto }) => (
              <li key={texto} className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/12 ring-1 ring-white/20">
                  <Icono className="h-4 w-4" />
                </span>
                <span className="opacity-95">{texto}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative flex items-center gap-2 text-xs opacity-80">
          <ShieldCheck className="h-4 w-4" /> Los datos de tu clínica son solo de tu clínica. Cada ingreso queda registrado.
        </p>
      </aside>

      {/* Formulario */}
      <main className="flex flex-col">
        <div
          className="px-6 pb-10 pt-8 text-primary-foreground lg:hidden"
          style={{ background: "var(--gradient-primary)" }}
        >
          <div className="flex items-center gap-2 text-xs font-semibold opacity-90">
            <ToothLogo className="h-4 w-4" /> Acceso de la clínica
          </div>
          <h1 className="mt-3 break-words text-3xl font-extrabold leading-tight tracking-tight">{titulo}</h1>
        </div>
        <div className="-mt-6 flex flex-1 items-start justify-center px-5 pb-10 lg:mt-0 lg:items-center lg:px-10">
          <div className="w-full max-w-sm rounded-3xl bg-background p-6 shadow-[0_20px_60px_-25px_rgba(76,29,149,0.35)] ring-1 ring-border lg:p-8 lg:shadow-none lg:ring-0">
            {children}
          </div>
        </div>
        <p className="pb-6 text-center text-xs text-muted-foreground">Cloud Esther</p>
      </main>
    </div>
    </>
  );
}

export function MensajeError({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
      {children}
    </p>
  );
}
