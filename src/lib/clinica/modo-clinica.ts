import {
  leerSesionActual,
  ponerSesionClinicaReal,
  quitarSesionClinicaReal,
} from "@/lib/cloud-esther/auth-store";
import { useSyncExternalStore } from "react";
import {
  leerSesionClinica,
  salirClinica,
  useSesionClinica,
  type RolClinica,
  type SesionClinica,
} from "@/lib/clinica/api";

/* Ubicación: src/lib/clinica/modo-clinica.ts
   MODO CLÍNICA REAL (Etapa 8b): la clínica que pagó usa LAS MISMAS pantallas del demo,
   pero con SUS datos guardados en el servidor (no en el navegador) y sin nada de demo.
   - La clínica activa queda solo en esta pestaña (sessionStorage): al cerrar la pestaña, hay que volver a entrar.
   - El id de "empresa" que usan las pantallas es c-<dirección>: así nunca se mezcla con un demo. */

const CLAVE_ACTIVA = "cloud-esther-clinica:activa";
export const PREFIJO_TENANT = "c-";

export function slugActivo(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(CLAVE_ACTIVA);
  } catch {
    return null;
  }
}

/** La clínica real con la que se trabaja en esta pestaña (o null si es el demo). */
export function clinicaReal(): { slug: string; sesion: SesionClinica } | null {
  const slug = slugActivo();
  if (!slug) return null;
  const sesion = leerSesionClinica(slug);
  return sesion ? { slug, sesion } : null;
}

export const esClinicaReal = () => clinicaReal() !== null;

export function rolClinica(): RolClinica | null {
  return clinicaReal()?.sesion.usuario.rol ?? null;
}

/** Después de ingresar en /c/<dirección>: la app pasa a trabajar con esta clínica. */
export function entrarAClinica(s: SesionClinica) {
  try {
    window.sessionStorage.setItem(CLAVE_ACTIVA, s.clinica.slug);
  } catch {
    /* sin almacenamiento */
  }
  ponerSesionClinicaReal({
    usuarioId: s.usuario.id,
    nombre: s.usuario.nombre,
    email: s.usuario.email,
    clinicaId: `${PREFIJO_TENANT}${s.clinica.slug}`,
    clinicaNombre: s.clinica.nombre,
  });
}

/** Salir: se cierra la sesión en el servidor y se vuelve a la pantalla de ingreso de la clínica. */
export async function salirDeClinica(motivo: "Manual" | "Inactividad" = "Manual"): Promise<string | null> {
  const slug = slugActivo() ?? slugDeSesionGuardada();
  try {
    if (slug) await salirClinica(slug, motivo).catch(() => undefined);
  } finally {
    try {
      window.sessionStorage.removeItem(CLAVE_ACTIVA);
    } catch {
      /* nada */
    }
    if (leerSesionActual()?.tipo === "cliente") quitarSesionClinicaReal();
  }
  return slug;
}

/** Si quedó una sesión de clínica real guardada pero sin su llave (se cerró la pestaña),
 *  devuelve la dirección de la clínica para mandar a ingresar de nuevo. */
export function slugDeSesionGuardada(): string | null {
  const s = leerSesionActual();
  if (s?.tipo !== "cliente" || !s.clinica.id.startsWith(PREFIJO_TENANT)) return null;
  return s.clinica.id.slice(PREFIJO_TENANT.length);
}

/** Salir y volver a la pantalla de ingreso de la clínica (recargando: no queda nada en memoria). */
export function salirYVolver(motivo: "Manual" | "Inactividad" = "Manual") {
  void salirDeClinica(motivo).then((slug) => {
    window.location.assign(slug ? `/c/${slug}` : "/");
  });
}

// "Salir" desde cualquier menú de las pantallas del demo, estando en una clínica real
if (typeof window !== "undefined") {
  window.addEventListener("cloud-esther:salir-clinica", () => salirYVolver());
}

const sinCambios = () => () => {};
/** Hook: la clínica real de esta pestaña (null en el demo, y también al dibujar en el servidor). */
export function useClinicaReal(): { slug: string; sesion: SesionClinica; rol: RolClinica } | null {
  const slug = useSyncExternalStore(sinCambios, slugActivo, () => null);
  const sesion = useSesionClinica(slug ?? "");
  return slug && sesion ? { slug, sesion, rol: sesion.usuario.rol } : null;
}
