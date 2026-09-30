import { MODULES, availableIn, useCloudEsther } from "@/lib/cloud-esther/data";
import { storeAgenda } from "@/lib/cloud-esther/agenda-store";
import { storeComunicacion } from "@/lib/cloud-esther/comunicacion-store";
import { usePacientes } from "@/lib/cloud-esther/pacientes";
import { useEquipo } from "@/lib/cloud-esther/equipo-store";
import { SUPPLIES, stockLevel } from "@/lib/cloud-esther/inventario-data";
import {
  storeNotificaciones,
  type CategoriaNotif,
  type EstadoNotif,
  type PrioridadNotif,
} from "@/lib/cloud-esther/notificaciones-store";
import { useTodosLosRegistros } from "@/components/cloud-esther/PacienteSecciones";

/* Ubicación: src/components/cloud-esther/useNotificaciones.ts

   Junta en una sola lista las alertas automáticas (calculadas en vivo desde Agenda,
   Comunicación, Laboratorio, Inventario, Pacientes y Equipo) y los avisos creados a mano.
   Cada plan recibe solo las alertas de los módulos que tiene contratados.
   TODO backend: estas reglas pasan a ejecutarse en el servidor (jobs por clinicId). */

export type Notif = {
  id: string;
  origen: "auto" | "manual";
  titulo: string;
  detalle: string;
  categoria: CategoriaNotif;
  prioridad: PrioridadNotif;
  fecha: string; // ISO: cuándo ocurrió o para cuándo es
  vence: string; // yyyy-mm-dd o ""
  horaVence: string;
  asignado: string;
  creadaPor: string;
  accion?: { label: string; to: string };
  estado: EstadoNotif;
};

function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function sumarDias(iso: string, n: number) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fechaCorta(iso: string) {
  return iso.slice(0, 10).split("-").reverse().slice(0, 2).join("/");
}

const MODULO_DE_CATEGORIA: Partial<Record<CategoriaNotif, string>> = {
  Comunicación: "comunicaciones",
  Laboratorio: "laboratorio",
  Insumos: "inventario",
};

export function useNotificaciones() {
  const { plan } = useCloudEsther();
  const { manuales, estados, preferencias } = storeNotificaciones.usar();
  const { turnos, espera, tareas } = storeAgenda.usar();
  const { conversaciones, recordatorios } = storeComunicacion.usar();
  const { pacientes } = usePacientes();
  const { miembros } = useEquipo();
  const registros = useTodosLosRegistros();

  const tiene = (moduloId: string) => {
    const m = MODULES.find((x) => x.id === moduloId);
    return !!m && availableIn(m, plan);
  };
  const conComunicacion = tiene("comunicaciones");

  const hoy = hoyISO();
  const manana = sumarDias(hoy, 1);
  const auto: Omit<Notif, "estado" | "origen" | "vence" | "horaVence" | "creadaPor">[] = [];

  /* ── Agenda ── */
  const pendientesHoy = turnos.filter((t) => t.fecha === hoy && t.estado === "Pendiente");
  if (pendientesHoy.length) {
    auto.push({
      id: `agenda-hoy-${hoy}`,
      titulo: `${pendientesHoy.length} ${pendientesHoy.length === 1 ? "turno de hoy sin confirmar" : "turnos de hoy sin confirmar"}`,
      detalle: pendientesHoy.map((t) => `${t.hora} ${t.paciente}`).join(" · "),
      categoria: "Agenda",
      prioridad: "Urgente",
      fecha: `${hoy}T07:30:00`,
      asignado: "Recepción",
      accion: { label: "Ver agenda", to: "/demo/agenda" },
    });
  }
  const pendientesManana = turnos.filter((t) => t.fecha === manana && t.estado === "Pendiente");
  if (pendientesManana.length) {
    const sinAviso = pendientesManana.filter((t) => !recordatorios[t.id]).length;
    auto.push({
      id: `agenda-manana-${manana}`,
      titulo: `${pendientesManana.length} ${pendientesManana.length === 1 ? "turno de mañana sin confirmar" : "turnos de mañana sin confirmar"}`,
      detalle: `${pendientesManana.map((t) => `${t.hora} ${t.paciente}`).join(" · ")}${conComunicacion && sinAviso ? ` — ${sinAviso} sin recordatorio enviado` : ""}`,
      categoria: "Agenda",
      prioridad: "Alta",
      fecha: `${hoy}T07:00:00`,
      asignado: "Recepción",
      accion: conComunicacion
        ? { label: "Enviar recordatorios", to: "/demo/comunicaciones" }
        : { label: "Ver agenda", to: "/demo/agenda" },
    });
  }
  for (const t of turnos.filter((x) => x.fecha === hoy && x.estado === "Ausente")) {
    auto.push({
      id: `agenda-ausente-${t.id}`,
      titulo: `${t.paciente} no asistió a su turno`,
      detalle: `${t.hora} hs · ${t.tratamiento} con ${t.odontologo}. Ofrecele un nuevo turno.`,
      categoria: "Agenda",
      prioridad: "Normal",
      fecha: `${t.fecha}T${t.hora}:00`,
      asignado: "Recepción",
      accion: { label: "Reprogramar", to: "/demo/agenda" },
    });
  }
  if (espera.length) {
    auto.push({
      id: `agenda-espera-${espera.length}`,
      titulo: `${espera.length} ${espera.length === 1 ? "paciente en lista de espera" : "pacientes en lista de espera"}`,
      detalle: espera
        .map((e) => `${e.nombre} (${e.motivo}, ${e.franja.toLowerCase()})`)
        .join(" · "),
      categoria: "Agenda",
      prioridad: "Baja",
      fecha: `${hoy}T08:00:00`,
      asignado: "Recepción",
      accion: { label: "Asignar turno", to: "/demo/agenda" },
    });
  }
  for (const t of tareas.filter((x) => !x.hecha && x.fecha <= hoy)) {
    auto.push({
      id: `tarea-${t.id}`,
      titulo: t.texto,
      detalle: `Tarea de la agenda${t.paciente ? ` · ${t.paciente}` : ""}${t.fecha < hoy ? ` · vencida el ${fechaCorta(t.fecha)}` : " · para hoy"}`,
      categoria: "Agenda",
      prioridad: t.fecha < hoy ? "Alta" : "Normal",
      fecha: `${t.fecha}T09:00:00`,
      asignado: "",
      accion: { label: "Ver tareas", to: "/demo/agenda" },
    });
  }

  /* ── Comunicación ── */
  if (conComunicacion) {
    const sinLeer = conversaciones.filter((c) => c.noLeidos > 0);
    if (sinLeer.length) {
      const total = sinLeer.reduce((a, c) => a + c.noLeidos, 0);
      const ultima = sinLeer
        .map((c) => c.mensajes.at(-1)?.fecha ?? "")
        .sort()
        .at(-1);
      auto.push({
        id: `com-sinleer-${total}-${ultima}`,
        titulo: `${total} ${total === 1 ? "mensaje sin leer" : "mensajes sin leer"}`,
        detalle: `De ${sinLeer.map((c) => c.paciente).join(", ")}`,
        categoria: "Comunicación",
        prioridad: "Alta",
        fecha: ultima || `${hoy}T08:00:00`,
        asignado: "Recepción",
        accion: { label: "Responder", to: "/demo/comunicaciones" },
      });
    }
  }

  /* ── Laboratorio y presupuestos (registros de pacientes) ── */
  const nombreDe = (id: number) => {
    const p = pacientes.find((x) => x.id === id);
    return p ? `${p.nombre} ${p.apellido}` : "Paciente";
  };
  for (const [idTxt, reg] of Object.entries(registros)) {
    const pid = Number(idTxt);
    if (tiene("laboratorio")) {
      for (const l of reg.laboratorio) {
        if (l.estado === "Listo para retirar") {
          auto.push({
            id: `lab-listo-${pid}-${l.id}`,
            titulo: `${l.tipo} listo para retirar`,
            detalle: `${nombreDe(pid)}${l.pieza ? ` · pieza ${l.pieza}` : ""} · ${l.proveedor || "Laboratorio"}. Coordiná el turno de colocación.`,
            categoria: "Laboratorio",
            prioridad: "Normal",
            fecha: `${hoy}T09:00:00`,
            asignado: l.profesional ?? "",
            accion: { label: "Ver trabajo", to: "/demo/laboratorio" },
          });
        } else if (
          (l.estado === "Enviado" || l.estado === "En proceso") &&
          l.fechaEntregaEstimada &&
          l.fechaEntregaEstimada < hoy
        ) {
          auto.push({
            id: `lab-demora-${pid}-${l.id}`,
            titulo: `${l.tipo} demorado en el laboratorio`,
            detalle: `${nombreDe(pid)} · entrega prevista el ${fechaCorta(l.fechaEntregaEstimada)} · ${l.proveedor || "Laboratorio"}. Reclamá al proveedor.`,
            categoria: "Laboratorio",
            prioridad: "Alta",
            fecha: `${l.fechaEntregaEstimada}T18:00:00`,
            asignado: l.profesional ?? "",
            accion: { label: "Ver trabajo", to: "/demo/laboratorio" },
          });
        }
      }
    }
    for (const p of reg.presupuestos.filter((x) => x.estado === "Enviado")) {
      auto.push({
        id: `pres-${pid}-${p.id}`,
        titulo: `Presupuesto ${p.numero} sin respuesta`,
        detalle: `${nombreDe(pid)} todavía no lo aprobó. Hacé un seguimiento.`,
        categoria: "Administración",
        prioridad: "Normal",
        fecha: `${p.fecha}T10:00:00`,
        asignado: p.profesional ?? "",
        accion: {
          label: "Ver presupuesto",
          to: tiene("presupuestos") ? "/demo/presupuestos" : "/demo/pacientes",
        },
      });
    }
  }

  /* ── Insumos ── TODO: leer del store de Inventario cuando sea por empresa. */
  if (tiene("inventario")) {
    for (const s of SUPPLIES.filter((x) => stockLevel(x) === "bajo")) {
      auto.push({
        id: `stock-${s.id}-${s.quantity}`,
        titulo: `Stock bajo: ${s.name}`,
        detalle: `Quedan ${s.quantity} ${s.unit} en ${s.clinic} (mínimo ${s.min}). Proveedor: ${s.provider}.`,
        categoria: "Insumos",
        prioridad: s.quantity <= s.min / 2 ? "Urgente" : "Alta",
        fecha: `${hoy}T07:15:00`,
        asignado: "Administración",
        accion: { label: "Pedir reposición", to: "/demo/inventario" },
      });
    }
  }

  /* ── Pacientes: cumpleaños ── */
  const md = (iso: string) => iso.slice(5, 10);
  const proximos7 = Array.from({ length: 7 }, (_, i) => md(sumarDias(hoy, i)));
  for (const p of pacientes.filter(
    (x) => x.estado === "Activo" && x.fechaNacimiento && proximos7.includes(md(x.fechaNacimiento)),
  )) {
    const esHoy = md(p.fechaNacimiento) === md(hoy);
    auto.push({
      id: `cumple-${p.id}-${hoy.slice(0, 4)}`,
      titulo: esHoy
        ? `Hoy cumple años ${p.nombre} ${p.apellido} 🎂`
        : `${p.nombre} ${p.apellido} cumple años el ${fechaCorta(`${hoy.slice(0, 4)}-${md(p.fechaNacimiento)}`)}`,
      detalle: conComunicacion
        ? "Mandale un saludo desde Comunicación."
        : "Un buen momento para saludarlo.",
      categoria: "Pacientes",
      prioridad: esHoy ? "Normal" : "Baja",
      fecha: `${hoy}T06:00:00`,
      asignado: "Recepción",
      accion: conComunicacion
        ? { label: "Saludar", to: "/demo/comunicaciones" }
        : { label: "Ver paciente", to: "/demo/pacientes" },
    });
  }

  /* ── Equipo ── */
  for (const m of miembros.filter((x) => x.status === "pendiente")) {
    auto.push({
      id: `equipo-${m.id}`,
      titulo: `Invitación pendiente: ${m.firstName} ${m.lastName}`,
      detalle: `Todavía no activó su cuenta${m.email ? ` (${m.email})` : ""}. Reenviá la invitación.`,
      categoria: "Equipo",
      prioridad: "Baja",
      fecha: `${hoy}T08:30:00`,
      asignado: "Administración",
      accion: { label: "Ver equipo", to: "/demo/equipo" },
    });
  }

  const ahora = new Date().toISOString();
  const todas: Notif[] = [
    ...auto.map((n) => ({
      ...n,
      origen: "auto" as const,
      vence: "",
      horaVence: "",
      creadaPor: "Cloud Esther",
      estado: estados[n.id] ?? {},
    })),
    ...manuales.map((m) => ({
      id: m.id,
      origen: "manual" as const,
      titulo: m.titulo,
      detalle: m.detalle,
      categoria: m.categoria,
      prioridad: m.prioridad,
      fecha: m.vence ? `${m.vence}T${m.horaVence || "09:00"}:00` : m.creada,
      vence: m.vence,
      horaVence: m.horaVence,
      asignado: m.asignado,
      creadaPor: m.creadaPor,
      estado: estados[m.id] ?? {},
    })),
  ].filter((n) => {
    const modulo = MODULO_DE_CATEGORIA[n.categoria];
    if (n.origen === "auto" && modulo && !tiene(modulo)) return false;
    const pref = preferencias.categorias[n.categoria];
    if (n.origen === "auto" && (!pref.activa || !pref.app)) return false;
    return !n.estado.oculta;
  });

  const visibles = todas.filter(
    (n) => !n.estado.pospuestaHasta || n.estado.pospuestaHasta <= ahora,
  );
  const pospuestas = todas.filter(
    (n) => n.estado.pospuestaHasta && n.estado.pospuestaHasta > ahora,
  );
  const sinLeer = visibles.filter((n) => !n.estado.leida && !n.estado.completada).length;

  return { notificaciones: visibles, pospuestas, sinLeer, tiene };
}
