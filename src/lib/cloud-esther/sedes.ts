import { storeAgenda } from "@/lib/cloud-esther/agenda-store";
import { storeFinanzas } from "@/lib/cloud-esther/finanzas-store";
import { storeFacturacion } from "@/lib/cloud-esther/facturacion-store";
import { storeInventario } from "@/lib/cloud-esther/inventario-store";
import { storeRRHH } from "@/lib/cloud-esther/rrhh-store";
import { storePacientes } from "@/lib/cloud-esther/pacientes";
import { useEffect, useRef } from "react";
import { capitalizarNombre, capitalizarSede } from "@/lib/utils";
import { cargarSettings, guardarSettings } from "@/lib/cloud-esther/settings-store";
import { storeEquipo } from "@/lib/cloud-esther/equipo-store";
import { moduloCargado } from "@/lib/clinica/sincronizar";
import { storeRegistros } from "@/components/cloud-esther/PacienteSecciones";

/* Ubicación: src/lib/cloud-esther/sedes.ts
   SEDES DE VERDAD: una sola lista (Configuración → Sucursales = Multiempresa → Sucursales) que
   usan la Agenda, los turnos online, Finanzas, Inventario y Equipo. Acá está lo que se hace
   con una sede: normalizar su nombre y, si se renombra, pasar el nombre nuevo a todo lo que ya
   estaba cargado con el viejo (turnos, cobros, stock, legajos, pacientes). */

export type DatosSede = { direccion?: string; telefono?: string; horario?: string };

/** Lista limpia: nombres con mayúscula inicial, sin vacíos ni repetidos. */
export function normalizarSedes(lista: string[] | undefined): string[] {
  const out: string[] = [];
  for (const s of lista ?? []) {
    const n = capitalizarSede(s ?? "");
    if (n && !out.some((x) => x.toLocaleLowerCase("es") === n.toLocaleLowerCase("es"))) out.push(n);
  }
  return out;
}

/* Cambia el campo «sucursal» (y las claves por sede) en cualquier parte del estado */
function reemplazar<T>(
  valor: T,
  viejo: string,
  nuevo: string,
  campos: string[] = ["sucursal", "sede"],
  mapas: string[] = ["conteos"],
): { valor: T; cambio: boolean } {
  let cambio = false;
  const ir = (v: unknown, clave?: string): unknown => {
    if (Array.isArray(v)) {
      let c = false;
      const a = v.map((x) => {
        const y = ir(x);
        if (y !== x) c = true;
        return y;
      });
      return c ? a : v;
    }
    if (v && typeof v === "object") {
      let c = false;
      const o: Record<string, unknown> = {};
      for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
        let y: unknown;
        if (campos.includes(k) && x === viejo) y = nuevo;
        else y = ir(x, k);
        // Mapas por sede (ej. último conteo de inventario por sucursal)
        const k2 = clave && mapas.includes(clave) && k === viejo ? nuevo : k;
        if (y !== x || k2 !== k) c = true;
        o[k2] = y;
      }
      return c ? o : v;
    }
    return v;
  };
  const r = ir(valor) as T;
  if (r !== valor) cambio = true;
  return { valor: r, cambio };
}

const STORES = [storeAgenda, storeFinanzas, storeFacturacion, storeInventario, storeRRHH, storePacientes, storeRegistros] as {
  leer: () => unknown;
  poner: (v: unknown) => void;
}[];

/** La sede «viejo» pasa a llamarse «nuevo» en todo lo cargado. Devuelve cuántos módulos cambió. */
export function renombrarSedeEnDatos(viejo: string, nuevo: string): number {
  if (!viejo || !nuevo || viejo === nuevo) return 0;
  let n = 0;
  for (const st of STORES) {
    try {
      const { valor, cambio } = reemplazar(st.leer(), viejo, nuevo);
      if (cambio) {
        st.poner(valor);
        n++;
      }
    } catch {
      /* un módulo que no se pudo tocar no frena al resto */
    }
  }
  return n;
}

/** Una persona del equipo cambió cómo se escribe su nombre («ana ruiz» → «Ana Ruiz»): sus
    turnos, cobros, comisiones y trabajos de laboratorio pasan al nombre nuevo. */
export function renombrarPersonaEnDatos(viejo: string, nuevo: string): number {
  if (!viejo || !nuevo || viejo === nuevo) return 0;
  let n = 0;
  for (const st of STORES) {
    try {
      const { valor, cambio } = reemplazar(st.leer(), viejo, nuevo, ["odontologo", "profesional", "reemplazoDe"], ["comisiones"]);
      if (cambio) {
        st.poner(valor);
        n++;
      }
    } catch {
      /* sigue con el resto */
    }
  }
  return n;
}

/** Turnos que vienen (desde hoy) en una sede: para no borrar una sede con turnos dados. */
export function turnosProximosEnSede(sede: string): number {
  const d = new Date();
  const hoy = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return storeAgenda
    .leer()
    .turnos.filter((t) => t.sucursal === sede && t.fecha >= hoy && !["Cancelada", "Atendida", "Ausente"].includes(t.estado)).length;
}

/** Arreglo de una sola vez por clínica: sedes y nombres del equipo que se guardaron en
    minúscula o todo en mayúscula quedan con mayúscula inicial, y lo ya cargado los sigue. */
export function useMayusculaEnNombres(clinic: string, puedeEscribir: boolean, esReal: boolean) {
  const hecho = useRef("");
  useEffect(() => {
    if (!puedeEscribir || !clinic || hecho.current === clinic) return;
    let vueltas = 0;
    const id = window.setInterval(() => {
      vueltas++;
      const listo = !esReal || ["agenda", "equipo", "pacientes", "configuracion"].every((k) => moduloCargado(k));
      if (!listo && vueltas < 40) return;
      window.clearInterval(id);
      if (!listo) return;
      hecho.current = clinic;
      // Sedes
      const s = cargarSettings(clinic);
      const crudas = s.sucursales ?? [];
      const limpias = normalizarSedes(crudas);
      if (JSON.stringify(crudas) !== JSON.stringify(limpias)) {
        const datos = { ...(s.sedesDatos ?? {}) };
        for (const r of crudas) {
          const n = capitalizarSede(r ?? "");
          if (n && r !== n) {
            renombrarSedeEnDatos(r, n);
            if (datos[r] && !datos[n]) datos[n] = datos[r]!;
            delete datos[r];
          }
        }
        guardarSettings(clinic, { ...cargarSettings(clinic), sucursales: limpias, sedesDatos: datos });
      }
      // Personas del equipo
      const eq = storeEquipo.leer();
      let cambio = false;
      const miembros = eq.miembros.map((m) => {
        const firstName = capitalizarNombre(m.firstName ?? "");
        const lastName = capitalizarNombre(m.lastName ?? "");
        if (firstName === m.firstName && lastName === m.lastName) return m;
        cambio = true;
        renombrarPersonaEnDatos(`${m.firstName} ${m.lastName}`.trim(), `${firstName} ${lastName}`.trim());
        return { ...m, firstName, lastName };
      });
      if (cambio) storeEquipo.poner({ ...storeEquipo.leer(), miembros });
    }, 750);
    return () => window.clearInterval(id);
  }, [clinic, puedeEscribir, esReal]);
}
