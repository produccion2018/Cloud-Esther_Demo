import { crearStorePorEmpresa } from "@/lib/cloud-esther/tenant-store";
import { esClinicaReal, useClinicaReal } from "@/lib/clinica/modo-clinica";
import { moduloCargado } from "@/lib/clinica/sincronizar";

/* Ubicación: src/lib/clinica/almacen-clinico.ts
   ALMACÉN CLÍNICO: odontograma (2D y 3D), su historial, radiografías e imágenes, y la
   configuración de la clínica.
   - En el DEMO sigue todo igual: se guarda en el navegador (datos de práctica).
   - En una CLÍNICA REAL se guarda en el SERVIDOR, cifrado y solo para esa clínica
     (módulos «odontograma», «odontograma-historial», «radiografias» y «configuracion»).
     NUNCA en el navegador: si una clave no tiene lugar en el servidor, no se guarda.
   Las pantallas usan almacenClinico.getItem / setItem igual que antes usaban localStorage. */

type NombreAlmacen = "odontograma" | "odontograma-historial" | "radiografias" | "configuracion";
type Mapa = Record<string, unknown>;

const ALMACENES: Record<NombreAlmacen, ReturnType<typeof crearStorePorEmpresa<Mapa>>> = {
  odontograma: crearStorePorEmpresa<Mapa>(() => ({}), { persistir: "odontograma" }),
  "odontograma-historial": crearStorePorEmpresa<Mapa>(() => ({}), { persistir: "odontograma-historial" }),
  radiografias: crearStorePorEmpresa<Mapa>(() => ({}), { persistir: "radiografias" }),
  configuracion: crearStorePorEmpresa<Mapa>(() => ({}), { persistir: "configuracion" }),
};
const NOMBRES = Object.keys(ALMACENES) as NombreAlmacen[];

/** Clave del navegador → módulo del servidor + clave dentro del módulo */
function destino(clave: string): { almacen: NombreAlmacen; sub: string } | null {
  const P2D = "cloud-esther:odontograma2d:";
  const P3D = "cloud-esther:odontograma3d:";
  if (clave.startsWith(P2D)) {
    const resto = clave.slice(P2D.length);
    return resto.endsWith(":historial")
      ? { almacen: "odontograma-historial", sub: `2d:${resto.slice(0, -":historial".length)}` }
      : { almacen: "odontograma", sub: `2d:${resto}` };
  }
  if (clave.startsWith(`${P3D}radiografias:`)) return { almacen: "radiografias", sub: clave.slice(`${P3D}radiografias:`.length) };
  if (clave.startsWith(`${P3D}historial:`)) return { almacen: "odontograma-historial", sub: `3d:${clave.slice(`${P3D}historial:`.length)}` };
  if (clave.startsWith(`${P3D}tratamientos:`)) return { almacen: "odontograma-historial", sub: `tratamientos:${clave.slice(`${P3D}tratamientos:`.length)}` };
  if (clave.startsWith(P3D)) return { almacen: "odontograma", sub: `3d:${clave.slice(P3D.length)}` };
  if (clave.startsWith("cloud-esther:settings:")) {
    // cloud-esther:settings:<empresa>:<sede> → solo importa la sede (la empresa ya es la clínica)
    const partes = clave.split(":");
    return { almacen: "configuracion", sub: `ajustes:${partes.at(-1) ?? ""}` };
  }
  return null;
}

export const almacenClinico = {
  getItem(clave: string): string | null {
    if (typeof window === "undefined") return null;
    if (!esClinicaReal()) {
      try {
        return window.localStorage.getItem(clave);
      } catch {
        return null;
      }
    }
    const d = destino(clave);
    if (!d) return null;
    const v = ALMACENES[d.almacen].leer()[d.sub];
    return v === undefined ? null : JSON.stringify(v);
  },
  setItem(clave: string, valor: string): void {
    if (typeof window === "undefined") return;
    if (!esClinicaReal()) {
      try {
        window.localStorage.setItem(clave, valor);
      } catch {
        /* sin espacio o bloqueado */
      }
      return;
    }
    const d = destino(clave);
    if (!d) return; // en una clínica real nada clínico va al navegador
    const s = ALMACENES[d.almacen];
    s.poner({ ...s.leer(), [d.sub]: JSON.parse(valor) as unknown });
  },
  removeItem(clave: string): void {
    if (typeof window === "undefined") return;
    if (!esClinicaReal()) {
      try {
        window.localStorage.removeItem(clave);
      } catch {
        /* nada */
      }
      return;
    }
    const d = destino(clave);
    if (!d) return;
    const s = ALMACENES[d.almacen];
    const { [d.sub]: _fuera, ...resto } = s.leer();
    s.poner(resto);
  },
};

/** Se re-dibuja cuando cambia el almacén (ej. llegan los datos del servidor). */
export function useAlmacen(nombre: NombreAlmacen): Mapa {
  return ALMACENES[nombre].usar();
}

/** Clínica real: ¿ya llegaron del servidor los datos clínicos? (en el demo, siempre sí).
 *  Hasta entonces la pantalla espera: así nada se dibuja vacío ni se guarda encima. */
export function useAlmacenClinicoListo(): boolean {
  const real = useClinicaReal();
  // Suscribirse a todos (orden fijo): al llegar cada uno, se vuelve a preguntar
  ALMACENES.odontograma.usar();
  ALMACENES["odontograma-historial"].usar();
  ALMACENES.radiografias.usar();
  ALMACENES.configuracion.usar();
  if (!real) return true;
  return NOMBRES.every((n) => moduloCargado(n));
}
