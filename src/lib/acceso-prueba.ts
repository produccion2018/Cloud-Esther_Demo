/* Ubicación: src/lib/acceso-prueba.ts
   Recorrido de prueba: si se entró a un portal desde /acceso-prueba, al cerrar sesión se vuelve
   ahí para elegir otro perfil (en vez de quedar en la pantalla de ingreso de ese portal).
   Se guarda solo en esta pestaña (sessionStorage). */

const CLAVE = "cloud-esther:desde-acceso-prueba";

export function marcarAccesoPrueba() {
  try {
    window.sessionStorage.setItem(CLAVE, "1");
  } catch {
    /* sin almacenamiento: se usa la salida normal */
  }
}

export function vieneDeAccesoPrueba() {
  try {
    return typeof window !== "undefined" && window.sessionStorage.getItem(CLAVE) === "1";
  } catch {
    return false;
  }
}

/** Después de cerrar sesión: vuelve al acceso de prueba si se vino de ahí. */
export function volverSiEsPrueba(): boolean {
  if (!vieneDeAccesoPrueba()) return false;
  window.location.assign("/acceso-prueba");
  return true;
}
