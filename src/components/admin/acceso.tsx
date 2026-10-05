import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";

import { ToothLogo } from "./logo";

/* Marco común de las pantallas sin sesión (ingreso, recuperar y restablecer contraseña). */
export function MarcoAcceso({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[1.05fr_1fr]">
      <div
        className="relative hidden overflow-hidden p-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between"
        style={{ background: "var(--gradient-primary)" }}
      >
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-white/[0.07] blur-3xl" />
        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
            <ToothLogo className="h-7 w-7" />
          </div>
          <div className="leading-tight">
            <p className="text-lg font-extrabold tracking-tight">Cloud Esther</p>
            <p className="text-xs uppercase tracking-[0.18em] opacity-80">Administración interna</p>
          </div>
        </div>
        <div className="relative max-w-md space-y-4">
          <h2 className="text-4xl font-extrabold leading-tight tracking-tight">
            El negocio de Cloud Esther en un solo lugar
          </h2>
          <p className="text-sm leading-relaxed opacity-90">
            Clínicas clientes, demos e interesados, cobranza, planes y precios, consumo de IA y
            soporte. Este acceso es solo para el equipo interno: no es el panel de las clínicas.
          </p>
          <ul className="space-y-2 pt-2 text-sm opacity-90">
            {[
              "Dueño y Socio: seguimiento completo del negocio",
              "Soporte técnico: tickets, registros y consumo",
              "Asistente / Secretaría: demos para contactar y cobranza",
            ].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
                {t}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative flex items-center gap-2 text-xs opacity-80">
          <ShieldCheck className="h-4 w-4" /> Acceso restringido. Cada ingreso queda registrado.
        </p>
      </div>

      <div className="flex items-center justify-center px-6 py-14">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center gap-3 lg:hidden">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl text-primary-foreground"
              style={{ background: "var(--gradient-primary)" }}
            >
              <ToothLogo className="h-8 w-8" />
            </div>
            <p className="text-lg font-extrabold tracking-tight">Cloud Esther · Administración</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
