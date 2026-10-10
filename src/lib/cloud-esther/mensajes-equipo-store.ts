import { crearStorePorEmpresa } from "@/lib/cloud-esther/tenant-store";

/* Ubicación: src/lib/cloud-esther/mensajes-equipo-store.ts
   Mensajes internos del equipo de la clínica (profesionales, secretaría y administración), por
   empresa. Canal general o mensaje directo a un integrante.
   TODO backend: mensajería en tiempo real (WebSocket) y aviso push. */

export type MensajeEquipo = {
  id: string;
  deId: string;
  deNombre: string;
  /** "todos" = canal general del equipo; si no, id del integrante destinatario. */
  para: string;
  texto: string;
  fecha: string; // ISO
};

const hace = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();

export const storeMensajesEquipo = crearStorePorEmpresa<{ mensajes: MensajeEquipo[] }>(
  () => ({
    mensajes: [
      {
        id: "me-1",
        deId: "4",
        deNombre: "Sofía Rodríguez",
        para: "todos",
        texto: "Buen día equipo. Hoy la agenda de la tarde está completa: avisen si se demoran.",
        fecha: hace(5),
      },
      {
        id: "me-2",
        deId: "1",
        deNombre: "Laura Martínez",
        para: "todos",
        texto: "Perfecto. Necesito el sillón 2 a las 15 para una endodoncia.",
        fecha: hace(4),
      },
    ],
  }),
  { persistir: "mensajes-equipo" },
);

export function enviarMensajeEquipo(m: Omit<MensajeEquipo, "id" | "fecha">) {
  const e = storeMensajesEquipo.leer();
  storeMensajesEquipo.poner({
    mensajes: [
      ...e.mensajes,
      { ...m, id: `me-${Date.now().toString(36)}`, fecha: new Date().toISOString() },
    ].slice(-500),
  });
}
