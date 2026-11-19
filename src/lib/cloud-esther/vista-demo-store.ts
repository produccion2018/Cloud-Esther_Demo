import { useEffect, useState, useSyncExternalStore } from "react";

import { puedeVer } from "@/lib/clinica/permisos";
import { verPermisosPorRol } from "@/lib/clinica/api";
import { SLUG_DEMO } from "@/lib/clinica/demo-admin";

/* Ubicación: src/lib/cloud-esther/vista-demo-store.ts

   «Ver como» en el DEMO: el dueño puede mirar el menú tal como lo ve cada rol (Odontóloga,
   Secretaría, Asistente), aplicando los permisos que configuró en Accesos → «Qué ve cada rol».
   Es solo una previsualización del demo (en una clínica real, cada persona entra con su cuenta y
   el menú ya se filtra solo). No cambia ningún dato: solo oculta/mostrar ítems del menú. */

export type RolVista = "odontologo" | "secretaria" | "asistente";

export const ROLES_VISTA: { id: RolVista; label: string }[] = [
  { id: "odontologo", label: "Odontóloga" },
  { id: "secretaria", label: "Secretaría" },
  { id: "asistente", label: "Asistente" },
];

// En memoria a propósito: la previsualización se reinicia al recargar (no querés quedar
// "atrapado" viendo como Secretaría) y así no hay diferencias de hidratación servidor/cliente.
let rolVista: RolVista | null = null;
const oyentes = new Set<() => void>();

/** Fija el rol que se está previsualizando (null = volver a Dueño, que ve todo). */
export function setRolVista(r: RolVista | null) {
  rolVista = r;
  oyentes.forEach((f) => f());
}

/** Rol que se está previsualizando en el demo (o null = Dueño). */
export function useRolVista(): RolVista | null {
  return useSyncExternalStore(
    (f) => {
      oyentes.add(f);
      return () => oyentes.delete(f);
    },
    () => rolVista,
    () => null,
  );
}

/** Previsualización del demo: devuelve el rol elegido y una función `ve(moduloId)` que aplica los
    permisos reales de ese rol (los que el dueño guardó en Accesos). Con Dueño, ve todo. */
export function useVistaDemo() {
  const rol = useRolVista();
  const [modulos, setModulos] = useState<string[] | null>(null);

  useEffect(() => {
    if (!rol) {
      setModulos(null);
      return;
    }
    let vivo = true;
    verPermisosPorRol(SLUG_DEMO)
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
  }, [rol]);

  // Con rol elegido, aplica sus permisos; sin rol (Dueño), ve todo.
  const ve = (moduloId: string) => (rol ? puedeVer(rol, moduloId, modulos) : true);
  return { rolVista: rol, ve };
}
