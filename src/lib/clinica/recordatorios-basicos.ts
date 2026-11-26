import { useEffect } from "react";
import { storeAgenda } from "@/lib/cloud-esther/agenda-store";
import { MODULES, availableIn, useCloudEsther } from "@/lib/cloud-esther/data";
import { storeN8n } from "@/lib/cloud-esther/n8n-store";
import { setNotificaciones, storeNotificaciones, type NotifManual } from "@/lib/cloud-esther/notificaciones-store";
import { leerPacientes } from "@/lib/cloud-esther/pacientes";
import { pacientesParaLlamar } from "@/components/cloud-esther/pacientes/VolverALlamar";
import { useClinicaReal } from "@/lib/clinica/modo-clinica";
import { moduloCargado } from "@/lib/clinica/sincronizar";
import {
  DIAS_ORDEN_PENDIENTE,
  laboratorioLlego,
  leerRegistros,
  type Registros,
} from "@/components/cloud-esther/PacienteSecciones";
import type { Turno } from "@/lib/cloud-esther/agenda-store";
import type { Paciente } from "@/lib/cloud-esther/pacientes";
import { normalizarBusqueda } from "@/lib/utils";

/** Turnos atendidos (últimos `dias` días) que todavía no tienen evolución ni nota clínica ese día */
export function turnosSinEvolucion(
  turnos: Turno[],
  pacientes: Paciente[],
  registros: Record<number, Registros>,
  dias = 7,
): { turno: Turno; paciente: Paciente }[] {
  const hoy = hoyISO();
  const desde = hoyISO(-dias);
  const porNombre = new Map(pacientes.map((p) => [normalizarBusqueda(`${p.nombre} ${p.apellido}`), p]));
  const out: { turno: Turno; paciente: Paciente }[] = [];
  for (const t of turnos) {
    if (t.estado !== "Atendida" || t.fecha > hoy || t.fecha < desde) continue;
    const p = porNombre.get(normalizarBusqueda(t.paciente));
    if (!p) continue;
    const r = registros[p.id];
    const tiene =
      (r?.historia ?? []).some((e) => e.fecha === t.fecha) || (r?.notasClinicas ?? []).some((n) => n.fecha === t.fecha);
    if (!tiene) out.push({ turno: t, paciente: p });
  }
  return out.sort((a, b) => `${b.turno.fecha}${b.turno.hora}`.localeCompare(`${a.turno.fecha}${a.turno.hora}`));
}

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
  const puede = !real || ["admin", "secretaria", "odontologo"].includes(real.rol);
  useEffect(() => {
    if (!puede) return;
    let hecho = false;
    let pendienteEvolucion = false;
    const revisar = () => {
      if (hecho) return;
      // En una clínica real, recién cuando llegaron los datos del servidor
      if (real && !["agenda", "pacientes", "notificaciones"].every(moduloCargado)) return;
      // La carpeta clínica puede tardar más en llegar: el aviso de evoluciones espera a tenerla
      const conRegistros = !real || moduloCargado("registros");
      if (!conRegistros) pendienteEvolucion = true;
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

      // 3) Turnos atendidos sin evolución cargada (historia clínica completa y al día)
      if (conRegistros && !existentes.has(`basico-evolucion-${hoy}`)) {
        pendienteEvolucion = false;
        const faltan = turnosSinEvolucion(turnos, leerPacientes(), leerRegistros());
        if (faltan.length)
          nuevos.push({
            ...base,
            asignado: "Profesionales",
            id: `basico-evolucion-${hoy}`,
            titulo: `${faltan.length} turno${faltan.length === 1 ? "" : "s"} atendido${faltan.length === 1 ? "" : "s"} sin evolución`,
            detalle: `${faltan
              .slice(0, 4)
              .map((x) => `${x.turno.fecha.slice(8, 10)}/${x.turno.fecha.slice(5, 7)} ${x.paciente.nombre} ${x.paciente.apellido}${x.turno.odontologo ? ` (${x.turno.odontologo})` : ""}`)
              .join(", ")}${faltan.length > 4 ? ` y ${faltan.length - 4} más` : ""}. Cargala desde la ficha del paciente → Historia clínica (hay plantillas para hacerlo rápido).`,
            categoria: "Pacientes",
            prioridad: "Normal",
          });
      }

      // 4) Órdenes de estudio pedidas hace 7 días o más y todavía sin recibir
      //    (con la automatización «Estudio pendiente» activa, le escribe sola al paciente)
      if (conRegistros && !flujoActivo("estudio_pendiente") && !existentes.has(`basico-estudios-${hoy}`)) {
        const pacs = leerPacientes();
        const atrasadas: { paciente: string; tipo: string; dias: number }[] = [];
        for (const [pid, reg] of Object.entries(leerRegistros())) {
          for (const o of reg?.ordenesEstudio ?? []) {
            if (o.estado !== "Pendiente") continue;
            const dias = Math.floor((Date.parse(hoy) - Date.parse(o.fecha)) / 86_400_000);
            if (dias < DIAS_ORDEN_PENDIENTE) continue;
            const p = pacs.find((x) => String(x.id) === pid);
            atrasadas.push({ paciente: p ? `${p.nombre} ${p.apellido}` : "Paciente", tipo: o.tipo, dias });
          }
        }
        if (atrasadas.length)
          nuevos.push({
            ...base,
            id: `basico-estudios-${hoy}`,
            titulo: `${atrasadas.length} estudio${atrasadas.length === 1 ? "" : "s"} pedido${atrasadas.length === 1 ? "" : "s"} sin recibir`,
            detalle: `${atrasadas
              .slice(0, 3)
              .map((x) => `${x.paciente} (${x.tipo.toLowerCase()}, hace ${x.dias} días)`)
              .join(", ")}${atrasadas.length > 3 ? ` y ${atrasadas.length - 3} más` : ""}. Recordáselo por WhatsApp desde la ficha → Estudios → «Enviar por WhatsApp».`,
            categoria: "Pacientes",
            prioridad: "Normal",
          });
      }

      // 5) Laboratorio: trabajos que llegaron sin avisar al paciente, y trabajos atrasados
      //    (con las automatizaciones «laboratorio» activas, Esther avisa y reclama sola)
      if (conRegistros) {
        const pacs = leerPacientes();
        const nombreDe = (pid: string) => {
          const p = pacs.find((x) => String(x.id) === pid);
          return p ? `${p.nombre} ${p.apellido}` : "Paciente";
        };
        const sinAvisar: string[] = [];
        const atrasados: string[] = [];
        for (const [pid, reg] of Object.entries(leerRegistros())) {
          for (const t of reg?.laboratorio ?? []) {
            if (laboratorioLlego(t) && !t.avisadoPaciente) sinAvisar.push(`${nombreDe(pid)} (${t.tipo.toLowerCase()})`);
            else if (
              (t.estado === "Enviado" || t.estado === "En proceso") &&
              t.fechaEntregaEstimada &&
              t.fechaEntregaEstimada < hoy &&
              t.reclamadoEl !== hoy
            )
              atrasados.push(`${nombreDe(pid)} (${t.tipo.toLowerCase()}${t.proveedor ? `, ${t.proveedor}` : ""})`);
          }
        }
        const resumen = (l: string[]) => `${l.slice(0, 3).join(", ")}${l.length > 3 ? ` y ${l.length - 3} más` : ""}`;
        if (sinAvisar.length && !flujoActivo("laboratorio_listo") && !existentes.has(`basico-lab-listo-${hoy}`))
          nuevos.push({
            ...base,
            id: `basico-lab-listo-${hoy}`,
            titulo: `${sinAvisar.length} trabajo${sinAvisar.length === 1 ? "" : "s"} de laboratorio listo${sinAvisar.length === 1 ? "" : "s"} para avisar al paciente`,
            detalle: `${resumen(sinAvisar)}. Avisales para coordinar la colocación desde Laboratorio o la ficha → Laboratorio → «Avisar al paciente».`,
            categoria: "Laboratorio",
            prioridad: "Normal",
          });
        if (atrasados.length && !flujoActivo("laboratorio_atrasado") && !existentes.has(`basico-lab-atraso-${hoy}`))
          nuevos.push({
            ...base,
            id: `basico-lab-atraso-${hoy}`,
            titulo: `${atrasados.length} trabajo${atrasados.length === 1 ? "" : "s"} de laboratorio atrasado${atrasados.length === 1 ? "" : "s"}`,
            detalle: `${resumen(atrasados)}. Reclamale al laboratorio por WhatsApp desde Laboratorio → «Reclamar».`,
            categoria: "Laboratorio",
            prioridad: "Alta",
          });
      }

      if (nuevos.length) setNotificaciones("manuales", (prev) => [...nuevos, ...prev.filter((p) => !nuevos.some((n) => n.id === p.id))]);
    };
    revisar();
    // Se reintenta mientras cargan los datos (y al volver a la pestaña otro día)
    const id = window.setInterval(() => {
      if (!hecho) revisar();
      else if (pendienteEvolucion && moduloCargado("registros")) {
        hecho = false;
        revisar();
      }
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
