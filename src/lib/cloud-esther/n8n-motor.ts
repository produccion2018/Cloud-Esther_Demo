/* Ubicación: src/lib/cloud-esther/n8n-motor.ts
   Ejecuta un flujo de n8n con los datos reales de la empresa activa (modo prueba del demo).
   Evento de Cloud Esther → n8n → Esther IA (analiza / redacta) → n8n → acción → registro.
   Los envíos externos (WhatsApp, correo, webhooks) se simulan; los efectos internos
   (seguimiento del presupuesto, tarea en la Agenda, aviso en Notificaciones) son reales.
   TODO backend: n8n llama a /ia/tareas con el token del tenant y devuelve el resultado por webhook. */

import { storeAgenda, setTareasStore } from "@/lib/cloud-esther/agenda-store";
import { leerPacientes, type Paciente } from "@/lib/cloud-esther/pacientes";
import { leerRegistros, cambiarRegistro } from "@/components/cloud-esther/PacienteSecciones";
import {
  estadoComprobante,
  paisFiscal,
  saldo,
  storeFacturacion,
} from "@/lib/cloud-esther/facturacion-store";
import { nivelStock, storeInventario } from "@/lib/cloud-esther/inventario-store";
import { formatoMoneda } from "@/lib/cloud-esther/nomina-paises";
import { setNotificaciones } from "@/lib/cloud-esther/notificaciones-store";
import { auditarConsulta } from "@/lib/cloud-esther/ia-store";
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
  titulo: string; // "Presupuesto PR-0004 de Lucía Gómez"
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
      const corte = diaISO(-180);
      lista = pacientes
        .filter(
          (p) =>
            p.estado === "Inactivo" ||
            !turnos.some((t) => t.paciente === nombre(p) && t.fecha >= corte),
        )
        .map((p) => {
          const ult = turnos
            .filter((t) => t.paciente === nombre(p))
            .sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
          return {
            titulo: `${nombre(p)} sin turnos recientes`,
            paciente: nombre(p),
            pacienteId: p.id,
            telefono: p.telefono,
            sede: p.sucursal,
            monto: 0,
            dato: ult
              ? `último turno el ${fecha(ult.fecha)} (${ult.tratamiento})`
              : "sin turnos registrados",
          };
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

/* ───────────── Esther IA dentro del flujo ───────────── */

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
    case "stock_bajo":
      return `Reposición sugerida: ${d.dato}.`;
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
  const conectada = (id: string) => creds.find((c) => c.id === id)?.conectada ?? false;
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
          resultado = "WhatsApp Business no está conectado en n8n";
          e = "error";
        } else if (!d.telefono) {
          resultado = "El paciente no tiene teléfono cargado";
          e = "error";
        } else
          resultado = `Enviado a ${d.telefono}: "${(ctx.texto || paso.config.mensaje || "").slice(0, 90)}${(ctx.texto || "").length > 90 ? "…" : ""}" (simulado)`;
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
                        texto: `Seguimiento automático (n8n + Esther IA): ${ctx.texto ? "mensaje enviado por WhatsApp" : "contacto registrado"}`,
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
