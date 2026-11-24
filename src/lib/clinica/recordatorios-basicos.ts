import { useEffect } from "react";
import { storeAgenda } from "@/lib/cloud-esther/agenda-store";
import { MODULES, availableIn, useCloudEsther } from "@/lib/cloud-esther/data";
import { storeN8n } from "@/lib/cloud-esther/n8n-store";
import { setNotificaciones, storeNotificaciones, type NotifManual } from "@/lib/cloud-esther/notificaciones-store";
import { leerPacientes } from "@/lib/cloud-esther/pacientes";
import { pacientesParaLlamar } from "@/components/cloud-esther/pacientes/VolverALlamar";
import { useClinicaReal } from "@/lib/clinica/modo-clinica";
import { moduloCargado } from "@/lib/clinica/sincronizar";

/* Ubicación: src/lib/clinica/recordatorios-basicos.ts
   RECORDATORIOS BÁSICOS (TODOS LOS PLANES, sin IA): una vez por día, al abrir la app, quedan en
   Notificaciones los pendientes que una clínica no puede olvidar:
   · Pacientes para volver a llamar (los meses que eligió la clínica).
   · Turnos de mañana sin confirmar (para mandar el recordatorio con un toque).
   Si la clínica tiene Automatizaciones con ese flujo activo, no hace falta: lo hace Esther sola.
   Cada aviso tiene un id por día, así no se repite aunque se abra en varios dispositivos. */

const hoyISO = (n = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export function useRecordatoriosBasicos() {
  const real = useClinicaReal();
  const { plan } = useCloudEsther();
  const puede = !real || ["admin", "secretaria"].includes(real.rol);
  useEffect(() => {
    if (!puede) return;
    let hecho = false;
    const revisar = () => {
      if (hecho) return;
      // En una clínica real, recién cuando llegaron los datos del servidor
      if (real && !["agenda", "pacientes", "notificaciones"].every(moduloCargado)) return;
      hecho = true;
      const hoy = hoyISO();
      const { turnos, ajustes } = storeAgenda.leer();
      const modAuto = MODULES.find((m) => m.id === "automatizaciones");
      const conAuto = !!modAuto && availableIn(modAuto, plan);
      const flujoActivo = (evento: string) => conAuto && storeN8n.leer().flujos.some((f) => f.activo && f.evento === evento);
      const existentes = new Set(storeNotificaciones.leer().manuales.map((m) => m.id));
      const nuevos: NotifManual[] = [];
      const base = { asignado: "Recepción", vence: hoy, horaVence: "", creada: new Date().toISOString(), creadaPor: "Recordatorios" };

      // 1) Para volver a llamar
      if (!flujoActivo("paciente_inactivo") && !existentes.has(`basico-recall-${hoy}`)) {
        const lista = pacientesParaLlamar(leerPacientes(), turnos, ajustes).filter((x) => !x.avisado);
        if (lista.length)
          nuevos.push({
            ...base,
            id: `basico-recall-${hoy}`,
            titulo: `${lista.length} paciente${lista.length === 1 ? "" : "s"} para volver a llamar`,
            detalle: `${lista
              .slice(0, 3)
              .map((x) => `${x.p.nombre} ${x.p.apellido}`)
              .join(", ")}${lista.length > 3 ? ` y ${lista.length - 3} más` : ""}. Invitalos a un control desde Pacientes → «Para volver a llamar» (WhatsApp con un toque).`,
            categoria: "Pacientes",
            prioridad: "Normal",
          });
      }

      // 2) Turnos de mañana sin confirmar
      if (!flujoActivo("turno_proximo") && !existentes.has(`basico-manana-${hoy}`)) {
        const manana = hoyISO(1);
        const sinConfirmar = turnos.filter((t) => t.fecha === manana && t.estado === "Pendiente");
        if (sinConfirmar.length)
          nuevos.push({
            ...base,
            id: `basico-manana-${hoy}`,
            titulo: `Mañana hay ${sinConfirmar.length} turno${sinConfirmar.length === 1 ? "" : "s"} sin confirmar`,
            detalle: `Mandá el recordatorio por WhatsApp con un toque desde la Agenda (botón verde en cada turno) o desde Comunicación → Recordatorios.`,
            categoria: "Agenda",
            prioridad: "Alta",
          });
      }

      if (nuevos.length) setNotificaciones("manuales", (prev) => [...nuevos, ...prev.filter((p) => !nuevos.some((n) => n.id === p.id))]);
    };
    revisar();
    // Se reintenta mientras cargan los datos (y al volver a la pestaña otro día)
    const id = window.setInterval(() => {
      if (!hecho) revisar();
    }, 3000);
    const alVolver = () => {
      if (document.visibilityState === "visible") {
        hecho = false;
        revisar();
      }
    };
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [real?.slug, real?.rol, plan, puede]);
}
