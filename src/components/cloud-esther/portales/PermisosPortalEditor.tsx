import { Check, RotateCcw, ShieldOff } from "lucide-react";

import type { TeamMember } from "@/lib/cloud-esther/equipo-profesional-data";
import {
  ACCIONES,
  GRUPOS,
  MODULOS_PORTAL,
  cambiarPermiso,
  guardarPermisosMiembro,
  permisosSugeridos,
  puedeEn,
  usePermisosPortal,
  type ModuloPortal,
} from "@/lib/cloud-esther/permisos-portal";

/* Ubicación: src/components/cloud-esther/portales/PermisosPortalEditor.tsx
   Grilla de permisos por módulo y acción de un integrante (lectura, creación, edición,
   eliminación, aprobación y gestión). La usa el propietario en Equipo → Permisos y accesos.
   El portal del integrante (profesional o administrativo) muestra solo lo que tenga habilitado. */

export function PermisosPortalEditor({
  miembro,
  onCambio,
}: {
  miembro: TeamMember;
  onCambio: (accion: string) => void;
}) {
  const { mapa, configurados } = usePermisosPortal(miembro);
  const nombre = `${miembro.firstName} ${miembro.lastName}`.trim();
  const habilitados = MODULOS_PORTAL.filter((m) => puedeEn(mapa, m.id)).length;

  const alternar = (
    modulo: ModuloPortal,
    accion: (typeof ACCIONES)[number]["id"],
    label: string,
  ) => {
    const activo = !puedeEn(mapa, modulo, accion);
    cambiarPermiso(miembro, modulo, accion, activo);
    onCambio(`${activo ? "Habilitó" : "Quitó"} «${label}: ${accion}» a ${nombre}`);
  };

  return (
    <div className="rounded-3xl border border-primary/12 bg-card p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold">Permisos por módulo y acción · portales Plan 4</p>
          <p className="max-w-2xl text-xs text-muted-foreground">
            Vos decidís qué puede ver y hacer {nombre} en su portal. {habilitados} de{" "}
            {MODULOS_PORTAL.length} módulos habilitados.{" "}
            {configurados
              ? "Configurado por el propietario."
              : "Todavía con el punto de partida sugerido para su rol: revisalo."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              guardarPermisosMiembro(miembro.id, permisosSugeridos(miembro.role));
              onCambio(`Aplicó los permisos sugeridos del rol a ${nombre}`);
            }}
            className="btn-ce-outline"
          >
            <RotateCcw className="size-4" /> Sugeridos del rol
          </button>
          <button
            type="button"
            onClick={() => {
              guardarPermisosMiembro(miembro.id, {});
              onCambio(`Quitó todos los permisos de portal a ${nombre}`);
            }}
            className="btn-ce-outline"
          >
            <ShieldOff className="size-4" /> Sin acceso
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {GRUPOS.map((g) => (
          <div key={g.id} className="overflow-hidden rounded-2xl border border-border/70">
            <div className="flex flex-wrap items-baseline justify-between gap-2 bg-primary/[0.05] px-3 py-2">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">
                {g.label}
              </p>
              <p className="text-[11px] text-muted-foreground">{g.detalle}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm" data-apilar="no">
                <thead>
                  <tr className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                    <th className="px-3 py-2 text-left font-semibold">Módulo</th>
                    {ACCIONES.map((a) => (
                      <th key={a.id} className="px-1 py-2 text-center font-semibold">
                        {a.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {MODULOS_PORTAL.filter((m) => m.grupo === g.id).map((m) => (
                    <tr key={m.id}>
                      <td className="px-3 py-2 font-medium">{m.label}</td>
                      {ACCIONES.map((a) => {
                        const on = puedeEn(mapa, m.id, a.id);
                        return (
                          <td key={a.id} className="px-1 py-1.5 text-center">
                            <button
                              type="button"
                              role="checkbox"
                              aria-checked={on}
                              aria-label={`${m.label}: ${a.label}`}
                              onClick={() => alternar(m.id, a.id, m.label)}
                              className={`inline-grid size-8 place-items-center rounded-lg border transition ${
                                on
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border hover:border-primary/40"
                              }`}
                            >
                              {on && <Check className="size-4" />}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">
        Cualquier acción incluye la lectura del módulo. Quitar la lectura quita todo el módulo. Los
        cambios quedan en la auditoría de la clínica.
      </p>
    </div>
  );
}
