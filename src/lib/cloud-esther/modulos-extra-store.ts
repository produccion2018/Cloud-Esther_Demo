import { crearStorePorEmpresa } from "@/lib/cloud-esther/tenant-store";
import { setNotificaciones } from "@/lib/cloud-esther/notificaciones-store";

/* Ubicación: src/lib/cloud-esther/modulos-extra-store.ts
   Módulos adicionales comprados por la empresa: Start, Pro y Plus pueden sumar módulos que su
   plan no incluye. Se guardan por empresa (nunca se cruzan entre clínicas).
   El precio de cada módulo lo informa el backend. TODO backend: /suscripcion/modulos. */

export type ModuloExtra = { id: string; desde: string; usuario: string };
export type EstadoModulosExtra = { activos: ModuloExtra[] };

export const storeModulosExtra = crearStorePorEmpresa<EstadoModulosExtra>(() => ({ activos: [] }), {
  persistir: "modulos-extra",
});

export function modulosExtra(): string[] {
  return storeModulosExtra.leer().activos.map((m) => m.id);
}

export function agregarModuloExtra(id: string, usuario: string) {
  const e = storeModulosExtra.leer();
  if (e.activos.some((m) => m.id === id)) return;
  storeModulosExtra.poner({
    activos: [...e.activos, { id, desde: new Date().toISOString(), usuario }],
  });
}

export function quitarModuloExtra(id: string) {
  const e = storeModulosExtra.leer();
  storeModulosExtra.poner({ activos: e.activos.filter((m) => m.id !== id) });
}

/* Compra de un módulo adicional (plan 1/2/3 suma un módulo de un plan superior):
   1) activa y registra la compra (módulo + fecha + hora + usuario, por empresa y aislada);
   2) avisa al equipo —Administración, socio y secretaría ven este aviso— con la clínica,
      el módulo y la fecha/hora;
   3) deja el registro listo para la facturación del mes (el aviso al superpanel del backend
      lo hace `avisarModuloAdicional` en la clínica real, antes de llamar a esto).
   Devuelve los datos de la compra por si la pantalla quiere mostrarlos. */
export function contratarModuloExtra(id: string, label: string, usuario: string) {
  agregarModuloExtra(id, usuario);
  const ahora = new Date();
  const fecha = ahora.toLocaleDateString("es-AR");
  const hora = ahora.toTimeString().slice(0, 5);
  setNotificaciones("manuales", (prev) => {
    if (prev.some((n) => n.id === `compra-${id}`)) return prev;
    return [
      {
        id: `compra-${id}`,
        titulo: `Nuevo módulo contratado: ${label}`,
        detalle: `${usuario} contrató el módulo «${label}» el ${fecha} a las ${hora} hs. Quedó activo y registrado para la facturación del mes. (Aviso para Administración, socio y secretaría.)`,
        categoria: "Administración",
        prioridad: "Alta",
        asignado: "",
        vence: "",
        horaVence: "",
        creada: ahora.toISOString(),
        creadaPor: "Cloud Esther",
      },
      ...prev,
    ];
  });
  return { id, label, usuario, fecha, hora };
}
