import { useEffect, useState } from "react";

import { puedeVer } from "@/lib/clinica/permisos";
import { verPermisosPorRol } from "@/lib/clinica/api";
import { SLUG_DEMO } from "@/lib/clinica/demo-admin";

/* Ubicación: src/lib/cloud-esther/vista-demo-store.ts

   «Ver como» (apartado en Configuración del demo): el dueño elige un rol y ve un PREVIEW de cómo
   le quedaría el menú a esa persona, aplicando los permisos que configuró en Accesos → «Qué ve
   cada rol». Es una previsualización local: no cambia el menú real ni ningún dato. */

export type RolVista = "odontologo" | "secretaria" | "asistente";

export const ROLES_VISTA: { id: RolVista; label: string }[] = [
  { id: "odontologo", label: "Odontóloga" },
  { id: "secretaria", label: "Secretaría" },
  { id: "asistente", label: "Asistente" },
];

/** Para un rol elegido, devuelve `ve(moduloId)` con los permisos reales de ese rol (los que el
    dueño guardó en Accesos). Con `null` (Dueño), ve todo. `slug`: la clínica (demo por defecto). */
export function useVistaRol(rol: RolVista | null, slug: string = SLUG_DEMO) {
  const [modulos, setModulos] = useState<string[] | null>(null);

  useEffect(() => {
    if (!rol) {
      setModulos(null);
      return;
    }
    let vivo = true;
    verPermisosPorRol(slug)
      .then((p) => {
        if (!vivo) return;
        setModulos(p.roles[rol] ?? p.predeterminados?.[rol] ?? p.maximos[rol] ?? null);
      })
      .catch(() => {
        if (vivo) setModulos(null);
      });
    return () => {
      vivo = false;
    };
  }, [rol, slug]);

  const ve = (moduloId: string) => (rol ? puedeVer(rol, moduloId, modulos) : true);
  return { ve };
}
