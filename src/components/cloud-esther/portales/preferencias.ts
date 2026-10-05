import { useEffect, useState } from "react";

import { claveTenant } from "@/lib/cloud-esther/tenant-store";

/* Ubicación: src/components/cloud-esther/portales/preferencias.ts
   Preferencias de visualización de cada portal (paciente, profesional, administrativo):
   modo oscuro y modo del menú lateral. Se guardan en el navegador por empresa y por portal
   (y por usuario si se indica). Mientras el portal está abierto pone/quita la clase «dark» en
   <html>; al salir deja el tema como estaba. */

export type ModoLateral = "expandido" | "compacto" | "oculto";

export type PreferenciasPortal = { oscuro: boolean; lateral: ModoLateral };

const INICIAL: PreferenciasPortal = { oscuro: false, lateral: "expandido" };

function leer(clave: string): PreferenciasPortal {
  try {
    const raw = window.localStorage.getItem(claveTenant(`cloud-esther:portal-prefs:${clave}`));
    return raw ? { ...INICIAL, ...(JSON.parse(raw) as Partial<PreferenciasPortal>) } : INICIAL;
  } catch {
    return INICIAL;
  }
}

export function usePreferenciasPortal(clave: string) {
  const [prefs, setPrefs] = useState<PreferenciasPortal>(INICIAL);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    setPrefs(leer(clave));
    setListo(true);
  }, [clave]);

  // Tema del portal mientras está abierto; al salir se devuelve el que había.
  useEffect(() => {
    if (!listo) return;
    const raiz = document.documentElement;
    const tenia = raiz.classList.contains("dark");
    raiz.classList.toggle("dark", prefs.oscuro);
    return () => {
      raiz.classList.toggle("dark", tenia);
    };
  }, [prefs.oscuro, listo]);

  const cambiar = (p: Partial<PreferenciasPortal>) =>
    setPrefs((prev) => {
      const sig = { ...prev, ...p };
      try {
        window.localStorage.setItem(
          claveTenant(`cloud-esther:portal-prefs:${clave}`),
          JSON.stringify(sig),
        );
      } catch {
        /* sin almacenamiento: dura la sesión */
      }
      return sig;
    });

  return { prefs, cambiar };
}

/* ───────────── Notificaciones leídas ───────────── */

export function useLeidas(clave: string) {
  const k = `cloud-esther:notif-leidas:${clave}`;
  const [leidas, setLeidas] = useState<string[]>([]);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(claveTenant(k));
      setLeidas(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      setLeidas([]);
    }
  }, [k]);
  const marcar = (ids: string[]) =>
    setLeidas((prev) => {
      const sig = [...new Set([...prev, ...ids])].slice(-500);
      try {
        window.localStorage.setItem(claveTenant(k), JSON.stringify(sig));
      } catch {
        /* sin almacenamiento */
      }
      return sig;
    });
  return { leidas, marcar };
}
