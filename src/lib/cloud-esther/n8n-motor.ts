/* Ubicación: src/lib/cloud-esther/n8n-motor.ts
   Ejecuta un flujo de n8n con los datos reales de la empresa activa (modo prueba del demo).
   Evento de Cloud Esther → n8n → Esther Infinity (analiza / redacta) → n8n → acción → registro.
   Los envíos externos (WhatsApp, correo, webhooks) se simulan; los efectos internos
   (seguimiento del presupuesto, tarea en la Agenda, aviso en Notificaciones) son reales.
   TODO backend: n8n llama a /ia/tareas con el token del tenant y devuelve el resultado por webhook. */

import { storeAgenda, setTareasStore } from "@/lib/cloud-esther/agenda-store";
import { leerPacientes, type Paciente } from "@/lib/cloud-esther/pacientes";
import {
  DIAS_ORDEN_PENDIENTE,
  DIAS_TRATAMIENTO_INCONCLUSO,
  diasDesdeFecha,
  ultimaActividadTratamiento,
  laboratorioLlego,
  leerRegistros,
  cambiarRegistro,
} from "@/components/cloud-esther/PacienteSecciones";
import { storeLaboratorios } from "@/lib/cloud-esther/laboratorios-store";
import { plantillaCumple, plantillasIndicaciones, storeComunicacion } from "@/lib/cloud-esther/comunicacion-store";
import {
  deudaDe,
  estadoComprobante,
  paisFiscal,
  saldo,
  storeFacturacion,
} from "@/lib/cloud-esther/facturacion-store";
import { nivelStock, storeInventario } from "@/lib/cloud-esther/inventario-store";
import { formatoMoneda } from "@/lib/cloud-esther/nomina-paises";
import { setNotificaciones } from "@/lib/cloud-esther/notificaciones-store";
import { auditarConsulta } from "@/lib/cloud-esther/ia-store";
import { leerEstadoAutomatizaciones } from "@/lib/clinica/automatizaciones";
import { clinicaReal } from "@/lib/clinica/modo-clinica";
import {
  EVENTOS,
  PASOS,
  storeN8n,
  setN8n,
  type Ejecucion,
  type Flujo,
  type PasoEjecutado,
} from "@/lib/cloud-esther/n8n-store";

/** Lo que disparó el evento: siempre un registro real de esta empresa. */
export type Disparo = {
  titulo: string; // "Presupuesto PR-0004 de Mauro Pinto"
  paciente: string;
  pacienteId: number | null;
  telefono: string;
  sede: string;
  monto: number;
  presupuestoId?: number;
  respondido?: boolean;
  dato: string; // detalle para la IA
};

const hoyISO = () => new Date().toISOString().slice(0, 10);
function diaISO(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function sumarDias(f: string, n: number) {
  const d = new Date(`${f}T12:00:00`);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
/** Textos de ejemplo de las plantillas («Confirmación del turno»…) no se envían tal cual. */
const ETIQUETAS_MENSAJE = new Set(["Mensaje redactado por Esther Infinity", "Confirmación del turno"]);
/** Completa {paciente} y {dato} del mensaje escrito en el paso (si es un mensaje y no una etiqueta). */
export function mensajeDelPaso(mensaje: string | undefined, d: Pick<Disparo, "paciente" | "dato">, laboratorio = false) {
  const m = (mensaje ?? "").trim();
  if (!m || ETIQUETAS_MENSAJE.has(m)) return "";
  const quien = laboratorio ? d.paciente : (d.paciente.split(" ")[0] ?? d.paciente);
  return m.replaceAll("{paciente}", quien).replaceAll("{dato}", d.dato);
}
const fecha = (f: string) => (f ? f.slice(0, 10).split("-").reverse().join("/") : "—");
const $ = (n: number) => formatoMoneda(n, paisFiscal(storeFacturacion.leer().config.pais).moneda);
const nombre = (p: Paciente) => `${p.nombre} ${p.apellido}`.trim();
const primerNombre = (s: string) => s.split(" ")[0] ?? s;

function pacientePorNombre(n: string) {
  const k = n.trim().toLowerCase();
  return leerPacientes().find((p) => nombre(p).toLowerCase() === k);
}

/** Busca los registros reales que cumplen el evento del flujo (respetando la sede elegida). */
export function candidatos(flujo: Pick<Flujo, "evento" | "sedes">): Disparo[] {
  const enSede = (s: string) => flujo.sedes === "Todas" || !s || s === flujo.sedes;
  const pacientes = leerPacientes();
  const regs = leerRegistros();
  const turnos = storeAgenda.leer().turnos;
  const deTurno = (t: (typeof turnos)[number]): Disparo => {
    const p = pacientePorNombre(t.paciente);
    return {
      titulo: `Turno de ${t.paciente} — ${fecha(t.fecha)} ${t.hora}`,
      paciente: t.paciente,
      pacienteId: p?.id ?? null,
      telefono: p?.telefono ?? "",
      sede: t.sucursal,
      monto: 0,
      dato: `${t.tratamiento} con ${t.odontologo} el ${fecha(t.fecha)} a las ${t.hora} en ${t.sucursal}`,
    };
  };
  const presupuestos = pacientes.flatMap((p) =>
    (regs[p.id]?.presupuestos ?? []).map((pr) => ({
      p,
      pr,
      total: Math.round(
        pr.lineas.reduce((a, l) => a + l.cantidad * l.precio, 0) *
          (1 - (pr.descuentoPct ?? 0) / 100),
      ),
    })),
  );
  const dePres = (x: (typeof presupuestos)[number]): Disparo => ({
    titulo: `Presupuesto ${x.pr.numero} de ${nombre(x.p)}`,
    paciente: nombre(x.p),
    pacienteId: x.p.id,
    telefono: x.p.telefono,
    sede: x.p.sucursal,
    monto: x.total,
    presupuestoId: x.pr.id,
    respondido: Boolean(x.pr.respondido),
    dato: `${[...new Set(x.pr.lineas.map((l) => l.descripcion))].join(", ") || "tratamiento"} por ${$(x.total)}, emitido el ${fecha(x.pr.fecha)}`,
  });

  let lista: Disparo[] = [];
  switch (flujo.evento) {
    case "presupuesto_sin_respuesta":
      lista = presupuestos
        .filter((x) => x.pr.estado === "Enviado")
        .sort((a, b) => (a.pr.enviado ?? a.pr.fecha).localeCompare(b.pr.enviado ?? b.pr.fecha))
        .map(dePres);
      break;
    case "presupuesto_creado":
      lista = presupuestos.sort((a, b) => b.pr.fecha.localeCompare(a.pr.fecha)).map(dePres);
      break;
    case "turno_creado":
      lista = turnos
        .filter((t) => t.fecha >= hoyISO() && t.estado === "Pendiente")
        .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora))
        .map(deTurno);
      break;
    case "turno_proximo": {
      const man = diaISO(1);
      const prox = turnos.filter(
        (t) => t.fecha === man && (t.estado === "Pendiente" || t.estado === "Confirmada"),
      );
      lista = (
        prox.length ? prox : turnos.filter((t) => t.fecha >= hoyISO() && t.estado === "Pendiente")
      )
        .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora))
        .map(deTurno);
      break;
    }
    case "turno_cancelado":
      lista = turnos.filter((t) => t.estado === "Cancelada").map(deTurno);
      break;
    case "paciente_inactivo": {
      // Igual que «Para volver a llamar» en Pacientes: meses que elige la clínica, última visita
      // atendida, sin turno agendado y sin aviso a mano dentro del período.
      const ajustes = storeAgenda.leer().ajustes;
      const meses = Math.min(60, Math.max(1, Math.round(ajustes?.recallMeses ?? 6)));
      const avisados = ajustes?.recallAvisados ?? {};
      const hoy = hoyISO();
      const corte = diaISO(-Math.round(meses * 30.44));
      lista = pacientes
        .filter((p) => p.estado === "Activo")
        .flatMap((p) => {
          const suyos = turnos.filter((t) => t.paciente.trim().toLowerCase() === nombre(p).toLowerCase());
          if (suyos.some((t) => t.fecha >= hoy && t.estado !== "Cancelada")) return [];
          const ult = suyos
            .filter((t) => t.estado === "Atendida" && t.fecha < hoy)
            .sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
          if (!ult || ult.fecha >= corte) return [];
          const aviso = (avisados[String(p.id)] ?? "").slice(0, 10);
          if (aviso && aviso >= corte) return [];
          return [
            {
              titulo: `${nombre(p)} sin venir hace ${meses} meses o más`,
              paciente: nombre(p),
              pacienteId: p.id,
              telefono: p.telefono,
              sede: p.sucursal,
              monto: 0,
              dato: `última visita el ${fecha(ult.fecha)} (${ult.tratamiento})`,
            },
          ];
        });
      break;
    }
    case "paciente_nuevo":
      lista = [...pacientes]
        .sort((a, b) => b.id - a.id)
        .map((p) => ({
          titulo: `Paciente nuevo: ${nombre(p)}`,
          paciente: nombre(p),
          pacienteId: p.id,
          telefono: p.telefono,
          sede: p.sucursal,
          monto: 0,
          dato: `obra social ${p.obraSocial || "particular"}`,
        }));
      break;
    case "tratamiento_finalizado":
      lista = pacientes.flatMap((p) =>
        (regs[p.id]?.tratamientos ?? [])
          .filter((t) => t.estado === "Finalizado")
          .map((t) => ({
            titulo: `${t.nombre} de ${nombre(p)} finalizado`,
            paciente: nombre(p),
            pacienteId: p.id,
            telefono: p.telefono,
            sede: p.sucursal,
            monto: 0,
            dato: `${t.nombre}${t.pieza ? ` en la pieza ${t.pieza}` : ""}`,
          })),
      );
      break;
    case "factura_vencida":
      lista = storeFacturacion
        .leer()
        .comprobantes.filter((c) => estadoComprobante(c) === "Vencida")
        .map((c) => ({
          titulo: `${c.tipo} ${String(c.puntoVenta).padStart(4, "0")}-${String(c.numero).padStart(8, "0")} de ${c.cliente.nombre}`,
          paciente: c.cliente.nombre,
          pacienteId: c.pacienteId,
          telefono: c.cliente.telefono,
          sede: c.sucursal,
          monto: saldo(c),
          dato: `saldo de ${$(saldo(c))} vencido el ${fecha(c.vencimiento)}`,
        }));
      break;
    case "saldo_pendiente":
      lista = pacientes.flatMap((p) => {
        const d = deudaDe(regs[p.id]?.cuenta);
        if (d.saldo <= 0 || !d.desde || d.desde > diaISO(-15)) return [];
        return [
          {
            titulo: `${nombre(p)} tiene un saldo pendiente`,
            paciente: nombre(p),
            pacienteId: p.id,
            telefono: p.telefono,
            sede: p.sucursal,
            monto: d.saldo,
            dato: `${$(d.saldo)} desde el ${fecha(d.desde)}`,
          },
        ];
      });
      break;
    case "stock_bajo":
      lista = storeInventario
        .leer()
        .insumos.filter((i) => ["Bajo", "Agotado"].includes(nivelStock(i)))
        .map((i) => ({
          titulo: `${i.nombre} (${i.stock} ${i.unidad}, mínimo ${i.minimo})`,
          paciente: "",
          pacienteId: null,
          telefono: "",
          sede: i.sucursal,
          monto: 0,
          dato: `${i.nombre}: quedan ${i.stock} ${i.unidad} y el mínimo es ${i.minimo}`,
        }));
      break;
    case "estudio_pendiente": {
      // Órdenes de estudio pedidas hace 7 días o más y todavía sin recibir
      const hoy = hoyISO();
      lista = Object.entries(leerRegistros()).flatMap(([pid, reg]) =>
        (reg?.ordenesEstudio ?? [])
          .filter((o) => o.estado === "Pendiente")
          .filter((o) => (Date.parse(hoy) - Date.parse(o.fecha)) / 86_400_000 >= DIAS_ORDEN_PENDIENTE)
          .flatMap((o) => {
            const p = pacientes.find((x) => String(x.id) === pid);
            if (!p) return [];
            return [
              {
                titulo: `${o.tipo} de ${nombre(p)} sin recibir`,
                paciente: nombre(p),
                pacienteId: p.id,
                telefono: p.telefono,
                sede: p.sucursal,
                monto: 0,
                dato: `${o.tipo.toLowerCase()}${o.piezas ? ` de las piezas ${o.piezas}` : ""}, pedido el ${fecha(o.fecha)}`,
              },
            ];
          }),
      );
      break;
    }
    case "encuesta_satisfaccion": {
      // Turnos atendidos hoy sin encuesta respondida (en la clínica real el enlace lo arma el servidor)
      const hoy = hoyISO();
      lista = storeAgenda
        .leer()
        .turnos.filter((t) => t.fecha === hoy && t.estado === "Atendida" && !t.encuesta)
        .map((t) => {
          const p = pacientes.find((x) => nombre(x).trim().toLowerCase() === t.paciente.trim().toLowerCase());
          return {
            titulo: `Encuesta para ${t.paciente}`,
            paciente: t.paciente,
            pacienteId: p?.id ?? null,
            telefono: p?.telefono ?? "",
            sede: t.sucursal,
            monto: 0,
            dato: "(enlace de la encuesta)",
          };
        });
      break;
    }
    case "indicaciones_postoperatorias": {
      // Sesiones registradas hoy en tratamientos que tienen plantilla de indicaciones de la clínica
      const hoy = hoyISO();
      const plantillas = storeComunicacion.leer().plantillas;
      const clinica = clinicaReal()?.sesion.clinica.nombre ?? "la clínica";
      lista = pacientes.flatMap((p) =>
        (regs[p.id]?.tratamientos ?? [])
          .filter((t) => (t.sesiones ?? []).some((s) => s.fecha === hoy) && t.indicacionesEl !== hoy)
          .flatMap((t) => {
            const pl = plantillasIndicaciones(plantillas, t.nombre)[0];
            if (!pl) return [];
            return [
              {
                titulo: `Indicaciones de ${t.nombre} para ${nombre(p)}`,
                paciente: nombre(p),
                pacienteId: p.id,
                telefono: p.telefono,
                sede: p.sucursal,
                monto: 0,
                dato: pl.texto.replaceAll("{{paciente}}", p.nombre).replaceAll("{{clinica}}", String(clinica)).replace(/\{\{\w+\}\}/g, ""),
              },
            ];
          }),
      );
      break;
    }
    case "cumpleanos": {
      const hoy = hoyISO().slice(5);
      const pl = plantillaCumple(storeComunicacion.leer().plantillas);
      lista = pacientes
        .filter((p) => p.estado === "Activo" && (p.fechaNacimiento ?? "").slice(5, 10) === hoy && p.aceptaPromociones !== false)
        .map((p) => ({
          titulo: `Cumpleaños de ${nombre(p)}`,
          paciente: nombre(p),
          pacienteId: p.id,
          telefono: p.telefono,
          sede: p.sucursal,
          monto: 0,
          dato: pl
            ? pl.texto.replaceAll("{{paciente}}", p.nombre).replaceAll("{{clinica}}", clinicaReal()?.sesion.clinica.nombre ?? "la clínica").replace(/\{\{\w+\}\}/g, "")
            : `¡Feliz cumpleaños ${p.nombre}! 🎉`,
        }));
      break;
    }
    case "tratamiento_inconcluso": {
      // En tratamiento, sin turno agendado y sin venir hace 30 días o más
      const turnos = storeAgenda.leer().turnos;
      const hoy = hoyISO();
      lista = pacientes.flatMap((p) => {
        const n = nombre(p).trim().toLowerCase();
        const suyos = turnos.filter((x) => x.paciente.trim().toLowerCase() === n);
        if (suyos.some((x) => x.fecha >= hoy && x.estado !== "Cancelada" && x.estado !== "Ausente")) return [];
        const visita = suyos.filter((x) => x.fecha < hoy && x.estado === "Atendida").map((x) => x.fecha).sort().pop() ?? "";
        return (regs[p.id]?.tratamientos ?? [])
          .filter((t) => {
            if (t.estado !== "En tratamiento") return false;
            const u = ultimaActividadTratamiento(t, visita);
            return !!u && diasDesdeFecha(u) >= DIAS_TRATAMIENTO_INCONCLUSO && !(t.invitadoRetomar && t.invitadoRetomar > u);
          })
          .map((t) => ({
            titulo: `${nombre(p)}: ${t.nombre} sin terminar`,
            paciente: nombre(p),
            pacienteId: p.id,
            telefono: p.telefono,
            sede: p.sucursal,
            monto: 0,
            dato: `${t.nombre.toLowerCase()}${t.pieza ? ` (pieza ${t.pieza})` : ""}`,
          }));
      });
      break;
    }
    case "laboratorio_listo":
      // Trabajos que volvieron del laboratorio y todavía no se le avisó al paciente
      lista = pacientes.flatMap((p) =>
        (regs[p.id]?.laboratorio ?? [])
          .filter((t) => laboratorioLlego(t) && !t.avisadoPaciente)
          .map((t) => ({
            titulo: `${t.tipo} de ${nombre(p)} llegó del laboratorio`,
            paciente: nombre(p),
            pacienteId: p.id,
            telefono: p.telefono,
            sede: p.sucursal,
            monto: 0,
            dato: `${t.tipo.toLowerCase()}${t.pieza ? ` (pieza ${t.pieza})` : ""}`,
          })),
      );
      break;
    case "laboratorio_atrasado": {
      // Trabajos en curso con la entrega vencida: el mensaje va al LABORATORIO
      const hoy = hoyISO();
      const labs = storeLaboratorios.leer().laboratorios;
      lista = pacientes.flatMap((p) =>
        (regs[p.id]?.laboratorio ?? []).flatMap((t) => {
          if (t.estado !== "Enviado" && t.estado !== "En proceso") return [];
          const lab = labs.find((l) => l.nombre.trim().toLowerCase() === t.proveedor.trim().toLowerCase());
          const entrega = t.fechaEntregaEstimada || (lab?.plazoDias ? sumarDias(t.fechaEnvio, lab.plazoDias) : "");
          if (!entrega || entrega >= hoy) return [];
          return [
            {
              titulo: `${t.tipo} de ${nombre(p)} atrasado (${t.proveedor || "sin laboratorio"})`,
              paciente: lab?.contacto || lab?.nombre || t.proveedor,
              pacienteId: null,
              telefono: lab?.telefono ?? "",
              sede: p.sucursal,
              monto: 0,
              dato: `${t.tipo}${t.pieza ? ` (pieza ${t.pieza})` : ""} del paciente ${nombre(p)}, que tenía entrega el ${fecha(entrega)}`,
            },
          ];
        }),
      );
      break;
    }
    case "mensaje_contact_center": {
      const p = pacientes.find((x) => x.estado === "Activo") ?? pacientes[0];
      if (p)
        lista = [
          {
            titulo: `WhatsApp de ${nombre(p)}: "Hola, quiero un turno para control"`,
            paciente: nombre(p),
            pacienteId: p.id,
            telefono: p.telefono,
            sede: p.sucursal,
            monto: 0,
            dato: "pide un turno para control",
          },
        ];
      break;
    }
  }
  return lista.filter((d) => enSede(d.sede));
}

/* ───────────── Esther Infinity dentro del flujo ───────────── */

/** Cómo va a salir el mensaje de un flujo, con el primer caso real que hay hoy (o un modelo si no hay). */
export function vistaPrevia(flujo: Flujo): { texto: string; con: string } | null {
  const paso = flujo.pasos.find((p) => p.tipo === "whatsapp" || p.tipo === "email");
  if (!paso) return null;
  const real = candidatos(flujo)[0];
  const d: Disparo = real ?? {
    titulo: "",
    paciente: "[Nombre]",
    pacienteId: null,
    telefono: "",
    sede: "",
    monto: 0,
    dato: "[detalle]",
  };
  const texto = mensajeDelPaso(paso.config.mensaje, d, flujo.evento === "laboratorio_atrasado") || redactar(flujo, d);
  return { texto, con: real ? real.titulo : "" };
}

function redactar(flujo: Flujo, d: Disparo): string {
  const n = primerNombre(d.paciente);
  switch (flujo.evento) {
    case "presupuesto_sin_respuesta":
    case "presupuesto_creado":
      return `Hola ${n}, ¿cómo estás? Te escribimos de la clínica por el presupuesto de ${d.dato.split(" por ")[0]}. Si tenés dudas sobre el tratamiento o las formas de pago, respondé este mensaje y te ayudamos. ¡Quedamos atentos!`;
    case "turno_proximo":
    case "turno_creado":
      return `Hola ${n}, te recordamos tu turno: ${d.dato}. Respondé SÍ para confirmar, NO para cancelar o CAMBIAR para reprogramar.`;
    case "turno_cancelado":
      return `Hola ${n}, vimos que se canceló tu turno. ¿Querés que te busquemos un nuevo horario?`;
    case "paciente_inactivo":
      return `Hola ${n}, hace un tiempo que no te vemos (${d.dato}). Te invitamos a un control preventivo; respondé este mensaje y te ofrecemos horarios.`;
    case "paciente_nuevo":
      return `¡Bienvenido/a ${n}! Gracias por elegirnos. En el portal del paciente vas a encontrar tus turnos, presupuestos e indicaciones.`;
    case "tratamiento_finalizado":
      return `Hola ${n}, terminamos tu ${d.dato}. Te dejamos las indicaciones de cuidado y te esperamos para el control en 6 meses.`;
    case "factura_vencida":
      return `Hola ${n}, te recordamos que tenés un ${d.dato}. Podés abonarlo desde el link de pago o en la clínica. Si ya lo pagaste, desestimá este mensaje.`;
    case "saldo_pendiente":
      return `Hola ${n}, te escribimos de la clínica: te queda un saldo de ${d.dato.split(" desde ")[0]}. Cuando puedas, lo abonás y nos avisás. ¡Gracias!`;
    case "stock_bajo":
      return `Reposición sugerida: ${d.dato}.`;
    case "estudio_pendiente":
      return `Hola ${n}, te recordamos que tenés pendiente tu ${d.dato}. Cuando lo tengas, mandanos una foto o el archivo por acá y lo sumamos a tu ficha.`;
    case "indicaciones_postoperatorias":
    case "cumpleanos":
    case "resumen_equipo":
      return d.dato;
    case "encuesta_satisfaccion":
      return `Hola ${n}, ¡gracias por venir! ¿Nos contás cómo te atendimos? Es un toque: ${d.dato}`;
    case "tratamiento_inconcluso":
      return `Hola ${n}, ¿cómo estás? Vimos que tu ${d.dato} quedó sin terminar. Respondé este mensaje y te damos un turno para continuarlo.`;
    case "laboratorio_listo":
      return `Hola ${n}, ya tenemos tu ${d.dato} del laboratorio. Respondé este mensaje y coordinamos el turno para colocarlo.`;
    case "laboratorio_atrasado":
      return `Hola ${d.paciente}, te escribimos por el trabajo de ${d.dato}. Todavía no lo recibimos: ¿nos confirmás para cuándo lo tenés? ¡Gracias!`;
    case "mensaje_contact_center":
      return `Hola ${n}, ¡claro! Tengo horarios disponibles esta semana. ¿Preferís mañana o tarde?`;
  }
}

function pasoIA(tarea: string, flujo: Flujo, d: Disparo, ctx: { texto: string }): string {
  if (tarea === "Redactar mensaje") {
    ctx.texto = redactar(flujo, d);
    return `Mensaje personalizado: "${ctx.texto}"`;
  }
  if (tarea === "Clasificar respuesta") {
    if (flujo.evento === "mensaje_contact_center")
      return 'Intención detectada: "Pedir turno" (confianza alta). Se ofrece un horario libre de la agenda.';
    return 'Respuesta simulada del paciente "Sí, confirmo" → clasificada como Confirmación.';
  }
  if (tarea === "Priorizar") {
    const alta = d.monto > 300_000 || /sin turnos registrados|20\d\d/.test(d.dato);
    return `Prioridad ${alta ? "alta" : "media"} para ${d.paciente || d.titulo}: ${d.dato}.`;
  }
  return `Contexto analizado: ${d.dato}.${d.monto ? ` Monto ${$(d.monto)}.` : ""} Se recomienda contacto personal${d.monto > 300_000 ? " por el monto" : ""}.`;
}

function cumple(regla: string, d: Disparo): boolean {
  if (regla.startsWith("Sin respuesta")) return !d.respondido;
  if (regla.startsWith("Monto mayor")) return d.monto > 300_000;
  if (regla.startsWith("Paciente con WhatsApp")) return d.telefono.replace(/\D/g, "").length >= 8;
  if (regla.startsWith("Prioridad alta")) return d.monto > 300_000;
  return true;
}

/* ───────────── Ejecución ───────────── */

export function ejecutarFlujo(
  flujo: Flujo,
  opciones: { usuario: string; disparo?: Disparo; modo?: Ejecucion["modo"] },
): Ejecucion | null {
  const d = opciones.disparo ?? candidatos(flujo)[0];
  if (!d) return null;
  const creds = storeN8n.leer().credenciales;
  // Clínica real: WhatsApp Business según el servidor y el correo sale por Cloud Esther (siempre)
  const estReal = clinicaReal() ? leerEstadoAutomatizaciones() : null;
  const conectada = (id: string) =>
    estReal
      ? id === "whatsapp"
        ? estReal.whatsapp.conectado
        : id === "smtp"
          ? true
          : creds.find((c) => c.id === id)?.conectada ?? false
      : (creds.find((c) => c.id === id)?.conectada ?? false);
  const ctx = { texto: "" };
  const pasos: PasoEjecutado[] = [];
  let estado: Ejecucion["estado"] = "Completada";
  let detenido = false;

  for (const paso of flujo.pasos) {
    const meta = PASOS[paso.tipo];
    const titulo = `${meta.nombre}${paso.config.tarea ? `: ${paso.config.tarea}` : ""}`;
    if (detenido) {
      pasos.push({ tipo: paso.tipo, titulo, resultado: "No se ejecutó", estado: "omitido" });
      continue;
    }
    let resultado = "";
    let e: PasoEjecutado["estado"] = "ok";
    switch (paso.tipo) {
      case "esperar":
        resultado =
          opciones.modo === "Automática"
            ? `Esperando ${paso.config.dias ?? "1"} días`
            : `En prueba se saltea la espera de ${paso.config.dias ?? "1"} días`;
        if (opciones.modo === "Automática") {
          e = "espera";
          estado = "En espera";
          detenido = true;
        }
        break;
      case "condicion": {
        const regla = paso.config.regla ?? "";
        const ok = cumple(regla, d);
        resultado = `${regla}: ${ok ? "se cumple" : "no se cumple, el flujo se detiene"}`;
        if (!ok) {
          e = "omitido";
          estado = "Detenida";
          detenido = true;
        }
        break;
      }
      case "ia":
        resultado = pasoIA(paso.config.tarea ?? "Analizar contexto", flujo, d, ctx);
        auditarConsulta({
          usuario: `n8n · ${flujo.nombre}`,
          rol: "admin",
          sede: d.sede || "Todas",
          pregunta: `${paso.config.tarea ?? "Analizar contexto"} — ${d.titulo}`,
          modulo: "automatizaciones",
          resultado: "Respondida",
        });
        break;
      case "whatsapp":
        if (!conectada("whatsapp")) {
          resultado = "WhatsApp Business no está conectado (Automatizaciones › Conexión)";
          e = "error";
        } else if (!d.telefono) {
          resultado = flujo.evento === "laboratorio_atrasado" ? "El laboratorio no tiene WhatsApp cargado (Laboratorio → Laboratorios)" : "El paciente no tiene teléfono cargado";
          e = "error";
        } else {
          const texto =
            ctx.texto || mensajeDelPaso(paso.config.mensaje, d, flujo.evento === "laboratorio_atrasado") || redactar(flujo, d);
          resultado = `Enviado a ${d.telefono}: "${texto.slice(0, 90)}${texto.length > 90 ? "…" : ""}" (simulado)`;
        }
        break;
      case "email":
        resultado = conectada("smtp")
          ? `Correo "${paso.config.asunto ?? ""}" enviado a ${d.paciente || "el equipo"} (simulado)`
          : "El correo (SMTP) no está conectado en n8n";
        if (!conectada("smtp")) e = "error";
        break;
      case "tarea": {
        const texto = paso.config.texto ?? "Seguimiento";
        setTareasStore((prev) => [
          ...prev,
          {
            id: Math.max(0, ...prev.map((t) => t.id)) + 1,
            texto: `${texto} (${flujo.nombre})`,
            categoria: "Llamar al paciente",
            paciente: d.paciente,
            fecha: hoyISO(),
            hecha: false,
          },
        ]);
        resultado = `Tarea creada en la Agenda para hoy: "${texto}"${d.paciente ? ` — ${d.paciente}` : ""}`;
        break;
      }
      case "actualizar": {
        const accion = paso.config.accion ?? "Registrar seguimiento";
        if (accion === "Registrar seguimiento" && d.pacienteId && d.presupuestoId) {
          const pid = d.presupuestoId;
          cambiarRegistro(d.pacienteId, "presupuestos", (prev) =>
            prev.map((pr) =>
              pr.id === pid
                ? {
                    ...pr,
                    seguimientos: [
                      ...(pr.seguimientos ?? []),
                      {
                        fecha: new Date().toISOString(),
                        texto: `Seguimiento automático (n8n + Esther Infinity): ${ctx.texto ? "mensaje enviado por WhatsApp" : "contacto registrado"}`,
                        autor: "Automatización",
                      },
                    ],
                  }
                : pr,
            ),
          );
          resultado = "Seguimiento registrado en el presupuesto del paciente";
        } else if (accion === "Marcar para llamar") {
          setTareasStore((prev) => [
            ...prev,
            {
              id: Math.max(0, ...prev.map((t) => t.id)) + 1,
              texto: `Llamar: ${d.titulo}`,
              categoria: "Llamar al paciente",
              paciente: d.paciente,
              fecha: hoyISO(),
              hecha: false,
            },
          ]);
          resultado = "Marcado para llamar (tarea en la Agenda)";
        } else {
          avisar(flujo, d, opciones.usuario);
          resultado =
            accion === "Registrar seguimiento"
              ? "Resultado registrado en Notificaciones"
              : "Aviso creado en Notificaciones";
        }
        break;
      }
      case "webhook":
        resultado = `POST ${paso.config.url ?? ""} → 200 OK (simulado)`;
        break;
      case "notificar":
        if (paso.config.canal === "Slack" && !conectada("slack")) {
          resultado = "Slack no está conectado en n8n";
          e = "error";
        } else {
          avisar(flujo, d, opciones.usuario);
          resultado = `Aviso enviado al equipo (${paso.config.canal ?? "Aviso interno"})`;
        }
        break;
    }
    if (e === "error") {
      estado = "Error";
      detenido = true;
    }
    pasos.push({ tipo: paso.tipo, titulo, resultado, estado: e });
  }

  const ej: Ejecucion = {
    id: `ej-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    flujoId: flujo.id,
    flujo: flujo.nombre,
    fecha: new Date().toISOString(),
    disparador: `${EVENTOS[flujo.evento].nombre}: ${d.titulo}`,
    sede: d.sede || "—",
    estado,
    pasos,
    modo: opciones.modo ?? "Prueba",
  };
  setN8n("ejecuciones", (p) => [ej, ...p].slice(0, 200));
  return ej;
}

function avisar(flujo: Flujo, d: Disparo, usuario: string) {
  const categoria =
    flujo.evento === "stock_bajo"
      ? "Insumos"
      : flujo.evento.startsWith("turno")
        ? "Agenda"
        : flujo.evento === "factura_vencida"
          ? "Administración"
          : "Pacientes";
  setNotificaciones("manuales", (prev) => [
    {
      id: `n8n-${Date.now()}-${prev.length}`,
      titulo: `${flujo.nombre}: ${d.titulo}`,
      detalle: `Generado por la automatización "${flujo.nombre}". ${d.dato}.`,
      categoria,
      prioridad: d.monto > 300_000 ? "Alta" : "Normal",
      asignado: "Recepción",
      vence: hoyISO(),
      horaVence: "",
      creada: new Date().toISOString(),
      creadaPor: `${usuario} (n8n)`,
    },
    ...prev,
  ]);
}
