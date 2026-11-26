import { useEffect } from "react";
import { setTareasStore, setTurnosStore, storeAgenda } from "@/lib/cloud-esther/agenda-store";
import { MODULES, availableIn, useCloudEsther } from "@/lib/cloud-esther/data";
import { storeN8n } from "@/lib/cloud-esther/n8n-store";
import { storeLaboratorios } from "@/lib/cloud-esther/laboratorios-store";
import { setNotificaciones, storeNotificaciones, type NotifManual, generarRutinasDeHoy, subirTareasSinAtenderLocal } from "@/lib/cloud-esther/notificaciones-store";
import { leerPacientes } from "@/lib/cloud-esther/pacientes";
import { pacientesParaLlamar } from "@/components/cloud-esther/pacientes/VolverALlamar";
import { useClinicaReal } from "@/lib/clinica/modo-clinica";
import { moduloCargado } from "@/lib/clinica/sincronizar";
import { demoConDatosEnServidor } from "@/lib/cloud-esther/demo-servidor";
import { claveDemoServidor, tenantActual } from "@/lib/cloud-esther/tenant-store";

/** ¿Ya llegaron del servidor estos módulos? (clínica real o demo con cuenta). Así un aviso no se
    pierde porque las notificaciones del servidor llegan después y lo pisan. */
function cargados(real: boolean, claves: string[]) {
  if (real) return claves.every(moduloCargado);
  if (demoConDatosEnServidor()) return claves.every((k) => moduloCargado(claveDemoServidor(k, tenantActual())));
  return true;
}
import {
  DIAS_ORDEN_PENDIENTE,
  DIAS_TRATAMIENTO_INCONCLUSO,
  diasDesdeFecha,
  ultimaActividadTratamiento,
  cambiarRegistro,
  laboratorioLlego,
  leerRegistros,
  useTodosLosRegistros,
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
      // Rutinas (apertura, cierre…): las tareas de hoy se crean solas, una vez por día
      generarRutinasDeHoy();
      // Demo: las tareas urgentes sin atender suben a Dirección acá (en la clínica real, el servidor)
      if (!real) subirTareasSinAtenderLocal();
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

      // 7) Tratamientos que quedaron por la mitad (en curso, sin turno y sin venir hace 30 días)
      //    Con la automatización «tratamiento_inconcluso» activa, Esther los invita sola.
      if (conRegistros && !flujoActivo("tratamiento_inconcluso") && !existentes.has(`basico-trat-${hoy}`)) {
        const pacs = leerPacientes();
        const parados: string[] = [];
        for (const [pid, reg] of Object.entries(leerRegistros())) {
          const p = pacs.find((x) => String(x.id) === pid);
          if (!p) continue;
          const n = `${p.nombre} ${p.apellido}`.trim().toLowerCase();
          const suyos = turnos.filter((x) => x.paciente.trim().toLowerCase() === n);
          if (suyos.some((x) => x.fecha >= hoy && x.estado !== "Cancelada" && x.estado !== "Ausente")) continue;
          const visita = suyos.filter((x) => x.fecha < hoy && x.estado === "Atendida").map((x) => x.fecha).sort().pop() ?? "";
          for (const t of reg?.tratamientos ?? []) {
            if (t.estado !== "En tratamiento") continue;
            const u = ultimaActividadTratamiento(t, visita);
            if (!u || diasDesdeFecha(u) < DIAS_TRATAMIENTO_INCONCLUSO || (t.invitadoRetomar && t.invitadoRetomar > u)) continue;
            parados.push(`${p.nombre} ${p.apellido} (${t.nombre.toLowerCase()})`);
          }
        }
        if (parados.length)
          nuevos.push({
            ...base,
            id: `basico-trat-${hoy}`,
            titulo: `${parados.length} tratamiento${parados.length === 1 ? "" : "s"} sin terminar`,
            detalle: `${parados.slice(0, 3).join(", ")}${parados.length > 3 ? ` y ${parados.length - 3} más` : ""}. Hace ${DIAS_TRATAMIENTO_INCONCLUSO} días o más que no vienen y no tienen turno: invitalos a retomar desde la ficha → Tratamientos → «Invitar a retomar».`,
            categoria: "Pacientes",
            prioridad: "Normal",
          });
      }

      // 5b) Cumpleaños de hoy (sin el flujo automático: saludo a mano desde Comunicación)
      if (!flujoActivo("cumpleanos") && !existentes.has(`basico-cumple-${hoy}`)) {
        const cumplen = leerPacientes().filter(
          (p) => p.estado === "Activo" && (p.fechaNacimiento ?? "").slice(5, 10) === hoy.slice(5) && p.aceptaPromociones !== false,
        );
        if (cumplen.length)
          nuevos.push({
            ...base,
            id: `basico-cumple-${hoy}`,
            titulo: `Hoy ${cumplen.length === 1 ? "cumple" : "cumplen"} años ${cumplen.length === 1 ? `${cumplen[0]?.nombre ?? ""} ${cumplen[0]?.apellido ?? ""}` : `${cumplen.length} pacientes`}`,
            detalle: `${cumplen
              .slice(0, 3)
              .map((x) => `${x.nombre} ${x.apellido}`)
              .join(", ")}${cumplen.length > 3 ? ` y ${cumplen.length - 3} más` : ""}. Saludalos con un toque desde Comunicación → Recordatorios → «Cumpleaños de hoy».`,
            categoria: "Pacientes",
            prioridad: "Baja",
          });
      }

      // 6) Enlace del laboratorio por vencer: avisar para crear uno nuevo y mandárselo
      //    (un aviso a los 15 días, otro a los 3 y otro si ya venció)
      for (const l of storeLaboratorios.leer().laboratorios) {
        if (!l.enlaceVence) continue;
        const dias = Math.ceil((new Date(l.enlaceVence).getTime() - Date.now()) / 86_400_000);
        if (dias > 15 || dias < -30) continue;
        const etapa = dias <= 0 ? "vencido" : dias <= 3 ? "3" : "15";
        const id = `basico-lab-enlace-${l.id}-${l.enlaceVence.slice(0, 10)}-${etapa}`;
        if (existentes.has(id)) continue;
        const fecha = l.enlaceVence.slice(0, 10).split("-").reverse().join("/");
        nuevos.push({
          ...base,
          id,
          titulo: dias <= 0 ? `Venció el enlace de ${l.nombre}` : `El enlace de ${l.nombre} vence en ${dias} ${dias === 1 ? "día" : "días"}`,
          detalle: `${dias <= 0 ? `Venció el ${fecha}` : `Vence el ${fecha}`}: el laboratorio no va a poder ver sus órdenes. Creá uno nuevo en Laboratorio → Todos los laboratorios → Laboratorios → «Nuevo enlace» y mandáselo por WhatsApp.`,
          categoria: "Laboratorio",
          prioridad: dias <= 3 ? "Alta" : "Normal",
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

/* Lo que el LABORATORIO cambia desde su enlace (estado, entrega, nota) llega a la clínica:
   aviso en Notificaciones (una vez por novedad) y el trabajo queda marcado como avisado. */
export function useNovedadesLaboratorio() {
  const real = useClinicaReal();
  const puede = !real || ["admin", "secretaria", "odontologo"].includes(real.rol);
  const regs = useTodosLosRegistros();
  const notifs = storeNotificaciones.usar();
  useEffect(() => {
    if (!puede || !cargados(!!real, ["registros", "notificaciones"])) return;
    const pendientes = Object.entries(regs).flatMap(([pid, r]) =>
      (r?.laboratorio ?? []).filter((t) => t.novedadLab && !t.novedadLab.avisada).map((t) => ({ pid: Number(pid), t })),
    );
    if (!pendientes.length) return;
    const pacs = leerPacientes();
    const existentes = new Set(storeNotificaciones.leer().manuales.map((m) => m.id));
    const ahora = new Date().toISOString();
    const nuevos: NotifManual[] = pendientes
      .map(({ pid, t }) => {
        const p = pacs.find((x) => x.id === pid);
        const texto = t.novedadLab!.texto;
        return {
          id: `lab-nov-${pid}-${t.id}-${t.novedadLab!.fecha}`,
          titulo: `${t.proveedor || "El laboratorio"} actualizó ${t.tipo.toLowerCase()}${p ? ` de ${p.nombre} ${p.apellido}` : ""}`,
          detalle: `${texto.charAt(0).toUpperCase()}${texto.slice(1)}.${t.notaLaboratorio && !texto.includes(t.notaLaboratorio) ? ` Nota del laboratorio: «${t.notaLaboratorio}».` : ""}`,
          categoria: "Laboratorio" as const,
          prioridad: t.estado === "Listo para retirar" ? ("Alta" as const) : ("Normal" as const),
          asignado: "Recepción",
          vence: hoyISO(),
          horaVence: "",
          creada: ahora,
          creadaPor: "Laboratorio",
        };
      })
      .filter((n) => !existentes.has(n.id));
    if (nuevos.length) setNotificaciones("manuales", (prev) => [...nuevos, ...prev]);
    for (const { pid, t } of pendientes)
      cambiarRegistro(pid, "laboratorio", (prev) =>
        prev.map((x) => (x.id === t.id && x.novedadLab ? { ...x, novedadLab: { ...x.novedadLab, avisada: true } } : x)),
      );
  }, [regs, puede, notifs, real]);
}

/* Lo que el PACIENTE respondió con el enlace del recordatorio (confirmó, pidió cambiar o canceló):
   aviso en Notificaciones (una vez) y, si pidió cambiar, una tarea para reprogramarlo. */
export function useRespuestasTurnos() {
  const real = useClinicaReal();
  const puede = !real || ["admin", "secretaria", "odontologo"].includes(real.rol);
  const turnos = storeAgenda.usar().turnos;
  const notifs = storeNotificaciones.usar();
  useEffect(() => {
    if (!puede || !cargados(!!real, ["agenda", "notificaciones"])) return;
    // Encuestas respondidas (después del turno): aviso, con prioridad si la opinión es baja
    const encuestas = turnos.filter((t) => t.encuesta && !t.encuesta.avisada);
    if (encuestas.length) {
      const existentesE = new Set(storeNotificaciones.leer().manuales.map((m) => m.id));
      const nuevasE: NotifManual[] = encuestas
        .map((t) => {
          const e = t.encuesta!;
          const baja = e.puntaje <= 3;
          return {
            id: `encuesta-${t.id}-${e.fecha}`,
            titulo: baja ? `Opinión baja: ${t.paciente} puntuó ${e.puntaje}/5` : `${t.paciente} puntuó ${e.puntaje}/5 su atención`,
            detalle: `${e.comentario ? `«${e.comentario}». ` : ""}${baja ? "Contactalo para saber qué pasó y resolverlo." : "¡Bien! Si cargaste el enlace de Google en Marketing → Reseñas, se lo invitó a dejar su reseña."}`,
            categoria: "Pacientes" as const,
            prioridad: baja ? ("Alta" as const) : ("Normal" as const),
            asignado: "Recepción",
            vence: hoyISO(),
            horaVence: "",
            creada: new Date().toISOString(),
            creadaPor: "Paciente",
          };
        })
        .filter((n) => !existentesE.has(n.id));
      if (nuevasE.length) setNotificaciones("manuales", (prev) => [...nuevasE, ...prev]);
      const idsE = new Set(encuestas.map((t) => t.id));
      setTurnosStore((prev) =>
        prev.map((t) => (idsE.has(t.id) && t.encuesta ? { ...t, encuesta: { ...t.encuesta, avisada: true } } : t)),
      );
    }
    const pendientes = turnos.filter((t) => t.respuestaPaciente && !t.respuestaPaciente.avisada);
    if (!pendientes.length) return;
    const existentes = new Set(storeNotificaciones.leer().manuales.map((m) => m.id));
    const ahora = new Date().toISOString();
    const fecha = (f: string) => f.split("-").reverse().join("/").slice(0, 5);
    const nuevos: NotifManual[] = pendientes
      .map((t) => {
        const r = t.respuestaPaciente!;
        const cuando = `${fecha(t.fecha)} ${t.hora}`;
        const titulo =
          r.tipo === "confirmo"
            ? `${t.paciente} confirmó su turno del ${cuando}`
            : r.tipo === "cancelo"
              ? `${t.paciente} canceló su turno del ${cuando}`
              : `${t.paciente} pide cambiar su turno del ${cuando}`;
        return {
          id: `turno-resp-${t.id}-${r.fecha}`,
          titulo,
          detalle:
            r.tipo === "confirmo"
              ? "Lo confirmó con el enlace del recordatorio. Ya figura «Confirmada» en la Agenda."
              : r.tipo === "cancelo"
                ? `Lo canceló con el enlace del recordatorio: el horario quedó libre en la Agenda.${r.nota ? ` Dijo: «${r.nota}».` : ""}`
                : `Escribile para darle otro horario.${r.nota ? ` Dijo: «${r.nota}».` : ""}`,
          categoria: "Agenda" as const,
          prioridad: r.tipo === "confirmo" ? ("Normal" as const) : ("Alta" as const),
          asignado: "Recepción",
          vence: hoyISO(),
          horaVence: "",
          creada: ahora,
          creadaPor: "Paciente",
        };
      })
      .filter((n) => !existentes.has(n.id));
    if (nuevos.length) setNotificaciones("manuales", (prev) => [...nuevos, ...prev]);
    const cambios = pendientes.filter((t) => t.respuestaPaciente!.tipo === "cambiar");
    if (cambios.length)
      setTareasStore((prev) => {
        let id = Math.max(0, ...prev.map((x) => x.id));
        return [
          ...prev,
          ...cambios.map((t) => ({
            id: ++id,
            texto: `Reprogramar el turno del ${fecha(t.fecha)} ${t.hora}${t.respuestaPaciente!.nota ? ` («${t.respuestaPaciente!.nota}»)` : ""}`,
            categoria: "Llamar al paciente",
            paciente: t.paciente,
            fecha: hoyISO(),
            hecha: false,
          })),
        ];
      });
    const ids = new Set(pendientes.map((t) => t.id));
    setTurnosStore((prev) =>
      prev.map((t) => (ids.has(t.id) && t.respuestaPaciente ? { ...t, respuestaPaciente: { ...t.respuestaPaciente, avisada: true } } : t)),
    );
  }, [turnos, puede, notifs, real]);
}
