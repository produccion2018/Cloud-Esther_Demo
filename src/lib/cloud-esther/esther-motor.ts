/* Ubicación: src/lib/cloud-esther/esther-motor.ts
   Motor de Cloud Esther Infinity: entiende preguntas en lenguaje natural, verifica plan, rol y sede,
   lee los datos reales de cada módulo de la empresa activa y arma la respuesta (texto +
   indicadores, tablas, gráficos o informes). Nunca inventa datos: si no hay información, lo dice.
   TODO backend: reemplazar la interpretación por el modelo de lenguaje con herramientas
   (function calling) que consulten la API con el token del usuario (tenant + rol + sede). */

import { MODULES, availableIn, type PlanId } from "@/lib/cloud-esther/data";
import { storeAgenda, SUCURSALES } from "@/lib/cloud-esther/agenda-store";
import { leerPacientes, type Paciente } from "@/lib/cloud-esther/pacientes";
import { leerRegistros, type Registros } from "@/components/cloud-esther/PacienteSecciones";
import { storeEquipo } from "@/lib/cloud-esther/equipo-store";
import { storePortal } from "@/lib/cloud-esther/portal-store";
import {
  estadoComprobante,
  paisFiscal,
  saldo,
  storeFacturacion,
  totalesComprobante,
} from "@/lib/cloud-esther/facturacion-store";
import {
  nivelStock,
  storeInventario,
  sucursalesDelPlan,
} from "@/lib/cloud-esther/inventario-store";
import { formatoMoneda } from "@/lib/cloud-esther/nomina-paises";
import { TEETH_BY_FDI, TOOTH_STATE_META, type ToothState } from "@/lib/odontogram/fdi";
import { cargarTratamientos } from "@/lib/odontogram/historial";
import { odontogramKey } from "@/lib/odontograma2d/types";
import { clinicaActualId } from "@/lib/cloud-esther/auth-store";
import type { RolIA } from "@/lib/cloud-esther/ia-store";
import { almacenClinico } from "@/lib/clinica/almacen-clinico";
import { deudaDe } from "@/lib/cloud-esther/facturacion-store";
import { storeFinanzas } from "@/lib/cloud-esther/finanzas-store";
import { clinicaReal, esClinicaReal } from "@/lib/clinica/modo-clinica";
import { puedeVer } from "@/lib/clinica/permisos";
import { moduloCargado } from "@/lib/clinica/sincronizar";
import { demoConDatosEnServidor } from "@/lib/cloud-esther/demo-servidor";
import { claveDemoServidor, tenantActual } from "@/lib/cloud-esther/tenant-store";
import type { Libro } from "@/components/cloud-esther/finanzas/libro";
import { setTurnosStore, tiemposAgenda, aMinutos, turnoSolapa, type Turno } from "@/lib/cloud-esther/agenda-store";
import { setFacturacion } from "@/lib/cloud-esther/facturacion-store";
import { setComunicacion } from "@/lib/cloud-esther/comunicacion-store";
import { storePresupuestos } from "@/lib/cloud-esther/presupuestos-store";
import { leerSesionActual } from "@/lib/cloud-esther/auth-store";
import {
  abrirRecordatorioWhatsApp,
  noQuiereRecordatorios,
  numeroWhatsApp,
  telefonoInternacional,
} from "@/lib/clinica/whatsapp";
import { abrirWhatsAppConEnlacePago } from "@/lib/clinica/enlace-estudio";

/* ───────────── Tipos de respuesta ───────────── */

export type Bloque =
  | { tipo: "kpis"; items: { label: string; valor: string; sub?: string | undefined }[] }
  | { tipo: "tabla"; titulo?: string; columnas: string[]; filas: (string | number)[][] }
  | { tipo: "barras"; titulo: string; items: { nombre: string; valor: number; etiqueta: string }[] }
  | {
      tipo: "lista";
      titulo?: string;
      items: { texto: string; detalle?: string; tono?: "alerta" | "ok" | "info" }[];
    }
  | { tipo: "informe"; titulo: string; secciones: { titulo: string; texto: string }[] }
  | { tipo: "acciones"; items: { label: string; to?: string; pregunta?: string }[] }
  | { tipo: "aviso"; texto: string }
  /** Algo que Esther va a HACER: se muestra y solo se hace si la persona toca «Confirmar». */
  | { tipo: "confirmar"; accionId: string; titulo: string; lineas: string[]; boton: string; aviso?: string }
  /** Mensajes para mandar de a uno (cada botón abre WhatsApp: la persona toca «Enviar» ahí). */
  | { tipo: "envios"; titulo?: string; items: { accionId: string; texto: string; detalle?: string }[] };

export type RespuestaEsther = {
  texto: string;
  bloques?: Bloque[];
  modulo: string;
  resultado: "Respondida" | "Sin permiso" | "Fuera del plan" | "Sin datos";
  /** Los datos todavía no llegaron del servidor: no se reescribe ni se audita como respuesta. */
  cargando?: boolean;
  /** Respuesta con una acción para confirmar: el texto queda tal cual (no lo reescribe la IA). */
  sinIA?: boolean;
};

export type ContextoIA = {
  plan: PlanId;
  rol: RolIA;
  sede: string; // "Todas" o una sede
  usuario: string;
  pacienteId?: number | undefined;
  seccion?: string | undefined;
  /** Libro de Finanzas ya armado por la pantalla (cobros, gastos, cuentas a pagar). */
  libro?: Libro | undefined;
};

/* ───────────── Permisos ───────────── */

/** Qué módulos puede consultar cada rol a través de la IA (además de lo que incluya el plan). */
const PERMISOS_ROL: Record<RolIA, string[]> = {
  admin: ["*"],
  odontologo: [
    "pacientes",
    "historia",
    "odontograma",
    "odontograma3d",
    "tratamientos",
    "agenda",
    "presupuestos",
    "estudios",
    "recetas",
    "bi",
  ],
  secretaria: [
    "pacientes",
    "agenda",
    "presupuestos",
    "facturacion",
    "portal-paciente",
    "comunicaciones",
  ],
  asistente: [
    "pacientes",
    "agenda",
    "historia",
    "odontograma",
    "odontograma3d",
    "tratamientos",
    "inventario",
  ],
};
export const ROL_IA_LABEL: Record<RolIA, string> = {
  admin: "Administración",
  odontologo: "Odontólogo/a",
  secretaria: "Recepción",
  asistente: "Asistente",
};
const NOMBRE_MODULO: Record<string, string> = {
  pacientes: "Pacientes",
  historia: "Historia clínica",
  odontograma3d: "Odontograma 3D",
  tratamientos: "Tratamientos",
  agenda: "Agenda",
  presupuestos: "Presupuestos",
  facturacion: "Facturación",
  inventario: "Inventario",
  equipo: "Equipo, usuarios y permisos",
  "portal-paciente": "Portal del paciente",
  bi: "Reportes",
  configuracion: "Configuración",
  rrhh: "Recursos humanos",
  finanzas: "Finanzas",
  recetas: "Recetas",
  laboratorio: "Laboratorio",
  marketing: "Marketing",
  comunicaciones: "Comunicación",
  estudios: "Estudios",
  automatizaciones: "Automatizaciones",
  odontograma: "Odontograma",
};

function verificar(modulo: string, ctx: ContextoIA): RespuestaEsther | null {
  const m = MODULES.find((x) => x.id === modulo);
  // El odontograma 2D queda incluido en el 3D desde Plus.
  if (
    m &&
    !availableIn(m, ctx.plan) &&
    !(modulo === "odontograma" && ctx.plan !== "inicial" && ctx.plan !== "profesional")
  )
    return {
      texto: `${NOMBRE_MODULO[modulo] ?? m.label} no está incluido en el plan actual, así que no puedo consultarlo.`,
      modulo,
      resultado: "Fuera del plan",
    };
  // Clínica real: lo que esta persona tiene en su menú (rol + lo que eligió el Administrador).
  // Es lo mismo que el servidor le deja leer; en el demo se simula con el rol elegido.
  const real = clinicaReal();
  const sinPermiso = real
    ? !puedeVer(real.sesion.usuario.rol, modulo, real.sesion.usuario.modulos)
    : !PERMISOS_ROL[ctx.rol].includes("*") && !PERMISOS_ROL[ctx.rol].includes(modulo);
  if (sinPermiso)
    return {
      texto: `Con tu usuario (${ROL_IA_LABEL[ctx.rol]}) no tenés acceso a ${NOMBRE_MODULO[modulo] ?? modulo}, así que no te lo puedo mostrar. Si lo necesitás, pedíselo al Administrador.`,
      modulo,
      resultado: "Sin permiso",
    };
  return null;
}

/* ───────────── Utilidades ───────────── */

const quitarTildes = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
export const norm = (s: string) =>
  quitarTildes(s.toLowerCase())
    .replace(/[¿?¡!.,;:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function iso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function dia(n = 0) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return iso(d);
}
const fecha = (f: string) => (f ? f.slice(0, 10).split("-").reverse().join("/") : "—");
function moneda() {
  return paisFiscal(storeFacturacion.leer().config.pais).moneda;
}
const $ = (n: number) => formatoMoneda(n, moneda());
const n0 = (n: number) => Math.round(n).toLocaleString("es-AR");

type Periodo = { desde: string; hasta: string; nombre: string };
function periodoDe(q: string, defecto: "hoy" | "mes" | "semana" = "mes"): Periodo {
  const hoy = dia();
  if (/\bmanana\b/.test(q)) return { desde: dia(1), hasta: dia(1), nombre: "mañana" };
  if (/\bayer\b/.test(q)) return { desde: dia(-1), hasta: dia(-1), nombre: "ayer" };
  if (/\bhoy\b/.test(q)) return { desde: hoy, hasta: hoy, nombre: "hoy" };
  if (/proxima semana|semana que viene/.test(q))
    return { desde: dia(1), hasta: dia(7), nombre: "los próximos 7 días" };
  if (/esta semana|semana/.test(q)) {
    const d = new Date();
    const lunes = new Date(d);
    lunes.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    const dom = new Date(lunes);
    dom.setDate(lunes.getDate() + 6);
    return { desde: iso(lunes), hasta: iso(dom), nombre: "esta semana" };
  }
  if (/mes pasado|mes anterior/.test(q)) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - 1);
    const fin = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return { desde: iso(d), hasta: iso(fin), nombre: "el mes pasado" };
  }
  if (/este ano|\bano\b/.test(q))
    return { desde: `${hoy.slice(0, 4)}-01-01`, hasta: hoy, nombre: "este año" };
  if (/este mes|\bmes\b/.test(q) || defecto === "mes") {
    const fin = new Date(Number(hoy.slice(0, 4)), Number(hoy.slice(5, 7)), 0);
    return { desde: `${hoy.slice(0, 7)}-01`, hasta: iso(fin), nombre: "este mes" };
  }
  if (defecto === "semana") return { desde: hoy, hasta: dia(6), nombre: "los próximos 7 días" };
  return { desde: hoy, hasta: hoy, nombre: "hoy" };
}
const enPeriodo = (f: string, p: Periodo) => f.slice(0, 10) >= p.desde && f.slice(0, 10) <= p.hasta;

/* ───────────── Acceso a datos (siempre de la empresa activa) ───────────── */

function sedesVisibles(ctx: ContextoIA) {
  const todas = sucursalesDelPlan(ctx.plan);
  return ctx.sede === "Todas" ? todas : todas.filter((s) => s === ctx.sede);
}
function pacientesVisibles(ctx: ContextoIA) {
  const sedes = sedesVisibles(ctx);
  return leerPacientes().filter(
    (p) => ctx.sede === "Todas" || sedes.includes(p.sucursal) || !p.sucursal,
  );
}
function turnosVisibles(ctx: ContextoIA) {
  const sedes = sedesVisibles(ctx);
  if (ctx.sede === "Todas") return storeAgenda.leer().turnos;
  return storeAgenda.leer().turnos.filter((t) => sedes.includes(t.sucursal) || !t.sucursal);
}
const nombreCompleto = (p: Paciente) => `${p.nombre} ${p.apellido}`.trim();
function registrosDe(id: number): Registros | undefined {
  return leerRegistros()[id];
}

/** Busca un paciente mencionado en la pregunta (nombre y apellido, o apellido). */
function pacienteMencionado(q: string, ctx: ContextoIA): Paciente | undefined {
  const lista = pacientesVisibles(ctx);
  const completo = lista.find((p) => q.includes(norm(nombreCompleto(p))));
  if (completo) return completo;
  const porApellido = lista.filter(
    (p) => p.apellido.length > 3 && new RegExp(`\\b${norm(p.apellido)}\\b`).test(q),
  );
  if (porApellido.length === 1) return porApellido[0];
  if (
    ctx.pacienteId &&
    /(este|el|del|al|la) paciente|paciente seleccionad|analiza(r)? (el |este )?paciente|\bsu(s)? |historia|odontograma|pendiente|consulta|informe|presupuesto del paciente/.test(
      q,
    )
  )
    return lista.find((p) => p.id === ctx.pacienteId);
  return undefined;
}

/* ───────────── Análisis de paciente ───────────── */

function edad(nac: string) {
  if (!nac) return null;
  const d = new Date(nac);
  const h = new Date();
  let e = h.getFullYear() - d.getFullYear();
  if (h.getMonth() < d.getMonth() || (h.getMonth() === d.getMonth() && h.getDate() < d.getDate()))
    e--;
  return e;
}
function chart3D(p: Paciente): Record<number, ToothState> {
  if (typeof window === "undefined") return {};
  try {
    const clave = odontogramKey(clinicaActualId() ?? "demo", String(p.id));
    const raw = almacenClinico.getItem(`cloud-esther:odontograma3d:${clave}`);
    return raw ? (JSON.parse(raw) as Record<number, ToothState>) : {};
  } catch {
    return {};
  }
}
function tratamientosOdontograma(p: Paciente) {
  try {
    return cargarTratamientos(odontogramKey(clinicaActualId() ?? "demo", String(p.id)));
  } catch {
    return {};
  }
}
const totalPres = (pr: Registros["presupuestos"][number]) =>
  Math.round(
    pr.lineas.reduce((a, l) => a + l.cantidad * l.precio, 0) * (1 - (pr.descuentoPct ?? 0) / 100),
  );

function analizarPaciente(p: Paciente, q: string, ctx: ContextoIA): RespuestaEsther {
  const r = registrosDe(p.id);
  const hoy = dia();
  const turnos = storeAgenda
    .leer()
    .turnos.filter((t) => norm(t.paciente) === norm(nombreCompleto(p)));
  const proximos = turnos
    .filter((t) => t.fecha >= hoy && (t.estado === "Pendiente" || t.estado === "Confirmada"))
    .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));
  const pasados = turnos
    .filter((t) => t.fecha < hoy || t.estado === "Atendida")
    .sort((a, b) => (b.fecha + b.hora).localeCompare(a.fecha + a.hora));
  const trat = r?.tratamientos ?? [];
  const pendientes = trat.filter(
    (t) => t.estado === "Planificado" || t.estado === "En tratamiento",
  );
  const pres = r?.presupuestos ?? [];
  const presPend = pres.filter((x) => x.estado === "Enviado");
  const cargos = (r?.cuenta ?? [])
    .filter((m) => m.tipo === "Cargo")
    .reduce((a, m) => a + m.monto, 0);
  const pagos = (r?.cuenta ?? [])
    .filter((m) => m.tipo !== "Cargo")
    .reduce((a, m) => a + m.monto, 0);
  const ant = r?.antecedentes;
  const alertas = [
    ...(ant?.alergias ?? []).map((a) => `Alergia: ${a}`),
    ...(ant?.enfermedades ?? []),
    ...(ant?.habitos ?? []),
  ];
  const ultimaEvol = [...(r?.historia ?? [])].sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
  const ultimaNota = [...(r?.notasClinicas ?? [])].sort((a, b) =>
    (b.fecha + b.hora).localeCompare(a.fecha + a.hora),
  )[0];
  const e = edad(p.fechaNacimiento);
  const quiereHistoria =
    /historia|evolucion|resum/.test(q) && !/antes|previo|pre ?consulta|despues|post/.test(q);
  const quiereOdonto = /odontograma|\bpiezas?\b|\bdientes?\b|\b3d\b/.test(q);
  const quierePend = /pendiente|tratamientos?/.test(q) && !quiereOdonto && !quiereHistoria;
  const quierePres = /presupuesto/.test(q);
  const post = /despues|post|posterior/.test(q);

  if (quiereOdonto) {
    const bloqueo = verificar(
      ctx.plan === "inicial" || ctx.plan === "profesional" ? "odontograma" : "odontograma3d",
      ctx,
    );
    if (bloqueo) return bloqueo;
    const chart = chart3D(p);
    const planif = tratamientosOdontograma(p);
    const piezas = Object.entries(chart)
      .map(([fdi, est]) => ({ fdi: Number(fdi), est }))
      .filter((x) => x.est !== "sano")
      .sort((a, b) => a.fdi - b.fdi);
    const presPiezas = pres.flatMap((x) =>
      x.lineas
        .filter((l) => l.pieza)
        .map((l) => ({ pieza: l.pieza, desc: l.descripcion, pres: x.numero, estado: x.estado })),
    );
    const tratPiezas = trat.filter((t) => t.pieza);
    const filas = new Map<string, (string | number)[]>();
    for (const x of piezas)
      filas.set(String(x.fdi), [
        x.fdi,
        TEETH_BY_FDI[x.fdi]?.name ?? "Pieza",
        TOOTH_STATE_META[x.est].label,
        planif[x.fdi] ?? "—",
        "—",
      ]);
    for (const t of tratPiezas)
      for (const pz of t.pieza.split(/[ ,y]+/).filter(Boolean)) {
        const f = filas.get(pz) ?? [
          pz,
          TEETH_BY_FDI[Number(pz)]?.name ?? "Pieza",
          "Sin registrar en el odontograma",
          "—",
          "—",
        ];
        f[3] = `${t.nombre} (${t.estado})`;
        filas.set(pz, f);
      }
    for (const l of presPiezas) {
      const f = filas.get(l.pieza) ?? [
        l.pieza,
        TEETH_BY_FDI[Number(l.pieza)]?.name ?? "Pieza",
        "Sin registrar en el odontograma",
        "—",
        "—",
      ];
      f[4] = `${l.pres} · ${l.desc} (${l.estado})`;
      filas.set(l.pieza, f);
    }
    const tabla = [...filas.values()].sort((a, b) => Number(a[0]) - Number(b[0]));
    return {
      texto: tabla.length
        ? `Odontograma de ${nombreCompleto(p)}: ${piezas.length} pieza${piezas.length === 1 ? "" : "s"} con hallazgos registrados${tratPiezas.length ? `, ${tratPiezas.length} tratamientos asociados a piezas` : ""}${presPiezas.length ? ` y ${presPiezas.length} ítems de presupuesto por pieza` : ""}. Te dejo la relación pieza por pieza.`
        : `El odontograma de ${nombreCompleto(p)} no tiene hallazgos cargados y no hay tratamientos ni presupuestos asociados a piezas. No voy a suponer un estado que no esté registrado.`,
      bloques: tabla.length
        ? [
            {
              tipo: "kpis",
              items: [
                { label: "Piezas con hallazgos", valor: String(piezas.length) },
                { label: "Tratamientos por pieza", valor: String(tratPiezas.length) },
                { label: "Ítems presupuestados", valor: String(presPiezas.length) },
              ],
            },
            {
              tipo: "tabla",
              titulo: "Piezas relacionadas",
              columnas: ["Pieza", "Nombre", "Estado", "Tratamiento", "Presupuesto"],
              filas: tabla,
            },
            {
              tipo: "acciones",
              items: [
                {
                  label: "Abrir odontograma",
                  to:
                    ctx.plan === "inicial" || ctx.plan === "profesional"
                      ? "/demo/odontograma"
                      : "/demo/odontograma-3d",
                },
              ],
            },
          ]
        : [
            {
              tipo: "acciones",
              items: [{ label: "Abrir odontograma", to: "/demo/odontograma-3d" }],
            },
          ],
      modulo: "odontograma3d",
      resultado: tabla.length ? "Respondida" : "Sin datos",
    };
  }

  if (quierePres) {
    const b = verificar("presupuestos", ctx);
    if (b) return b;
    return {
      texto: pres.length
        ? `${nombreCompleto(p)} tiene ${pres.length} presupuesto${pres.length === 1 ? "" : "s"}; ${presPend.length} esperan respuesta.`
        : `${nombreCompleto(p)} no tiene presupuestos cargados.`,
      bloques: pres.length
        ? [
            {
              tipo: "tabla",
              columnas: ["Número", "Fecha", "Estado", "Total"],
              filas: pres.map((x) => [x.numero, fecha(x.fecha), x.estado, $(totalPres(x))]),
            },
          ]
        : [],
      modulo: "presupuestos",
      resultado: pres.length ? "Respondida" : "Sin datos",
    };
  }

  if (quierePend) {
    const bt = verificar("tratamientos", ctx);
    if (bt) return bt;
    return {
      texto: pendientes.length
        ? `${nombreCompleto(p)} tiene ${pendientes.length} tratamiento${pendientes.length === 1 ? "" : "s"} pendiente${pendientes.length === 1 ? "" : "s"}${presPend.length ? ` y ${presPend.length} presupuesto${presPend.length === 1 ? "" : "s"} sin respuesta` : ""}.`
        : `${nombreCompleto(p)} no tiene tratamientos pendientes registrados.`,
      bloques: pendientes.length
        ? [
            {
              tipo: "tabla",
              columnas: ["Tratamiento", "Pieza", "Estado", "Profesional", "Prioridad"],
              filas: pendientes.map((t) => [
                t.nombre,
                t.pieza || "—",
                t.estado,
                t.profesional,
                t.prioridad ?? "—",
              ]),
            },
          ]
        : [],
      modulo: "tratamientos",
      resultado: pendientes.length ? "Respondida" : "Sin datos",
    };
  }

  const b = verificar("historia", ctx);
  if (b && quiereHistoria) return b;
  const puedeClinico = !b;

  const secciones: { titulo: string; texto: string }[] = [];
  secciones.push({
    titulo: "Datos",
    texto: `${nombreCompleto(p)}${e !== null ? `, ${e} años` : ""}. ${p.obraSocial ? `Cobertura: ${p.obraSocial}${p.afiliado ? ` (${p.afiliado})` : ""}` : "Particular"}. Sede: ${p.sucursal || "—"}. Estado: ${p.estado}.`,
  });
  if (puedeClinico) {
    secciones.push({
      titulo: "Alertas médicas",
      texto: alertas.length
        ? `${alertas.join(" · ")}${ant?.medicacion ? `. Medicación: ${ant.medicacion}` : ""}.`
        : "Sin alertas médicas cargadas (conviene confirmarlo en la consulta).",
    });
    secciones.push({
      titulo: post ? "Lo último registrado" : "Última atención",
      texto: ultimaNota
        ? `${fecha(ultimaNota.fecha)} con ${ultimaNota.profesional}: ${ultimaNota.motivoConsulta}. Diagnóstico: ${ultimaNota.diagnostico || "—"}. Procedimiento: ${ultimaNota.procedimiento || "—"}.${ultimaNota.indicaciones ? ` Indicaciones: ${ultimaNota.indicaciones}.` : ""}${ultimaNota.proximoControl ? ` Próximo control: ${fecha(ultimaNota.proximoControl)}.` : ""}`
        : ultimaEvol
          ? `${fecha(ultimaEvol.fecha)} con ${ultimaEvol.profesional}: ${ultimaEvol.motivo}${ultimaEvol.pieza ? ` (pieza ${ultimaEvol.pieza})` : ""}. ${ultimaEvol.detalle}`
          : "No hay evoluciones ni notas clínicas cargadas.",
    });
    if (quiereHistoria) {
      const evols = [...(r?.historia ?? [])].sort((a, b2) => b2.fecha.localeCompare(a.fecha));
      secciones.push({
        titulo: "Evolución",
        texto: evols.length
          ? evols
              .slice(0, 6)
              .map(
                (x) =>
                  `${fecha(x.fecha)} · ${x.motivo}${x.pieza ? ` (pieza ${x.pieza})` : ""}: ${x.detalle}`,
              )
              .join("\n")
          : "Sin evoluciones.",
      });
      const estudios = r?.estudios ?? [];
      if (estudios.length)
        secciones.push({
          titulo: "Estudios",
          texto: estudios
            .map((x) => `${fecha(x.fecha)} · ${x.tipo}${x.diagnostico ? `: ${x.diagnostico}` : ""}`)
            .join("\n"),
        });
      const recetas = r?.recetas ?? [];
      if (recetas.length)
        secciones.push({
          titulo: "Recetas",
          texto: recetas
            .map(
              (x) =>
                `${fecha(x.fecha)} · ${x.medicamentos.map((m) => m.nombre).join(", ")} (${x.estado})`,
            )
            .join("\n"),
        });
    }
    secciones.push({
      titulo: "Tratamientos",
      texto: trat.length
        ? `${pendientes.length} pendientes de ${trat.length}. ${pendientes.map((t) => `${t.nombre}${t.pieza ? ` pieza ${t.pieza}` : ""} (${t.estado})`).join(", ") || "Todo lo planificado está completo."}`
        : "Sin tratamientos cargados.",
    });
  }
  const permPres = !verificar("presupuestos", ctx);
  if (permPres)
    secciones.push({
      titulo: "Presupuestos",
      texto: pres.length
        ? pres.map((x) => `${x.numero} ${x.estado} · ${$(totalPres(x))}`).join(" · ")
        : "Sin presupuestos.",
    });
  secciones.push({
    titulo: "Turnos",
    texto: `${proximos.length ? `Próximo: ${fecha(proximos[0]!.fecha)} ${proximos[0]!.hora} (${proximos[0]!.tratamiento} con ${proximos[0]!.odontologo}).` : "Sin turnos próximos."} ${pasados.length ? `Último: ${fecha(pasados[0]!.fecha)} (${pasados[0]!.tratamiento}, ${pasados[0]!.estado.toLowerCase()}).` : ""}`,
  });
  if (!verificar("facturacion", ctx))
    secciones.push({
      titulo: "Cuenta corriente",
      texto: cargos - pagos > 0 ? `Saldo pendiente: ${$(cargos - pagos)}.` : "Sin deuda.",
    });

  // Sugerencias para la consulta (solo a partir de lo registrado).
  const sugerencias: { texto: string; tono?: "alerta" | "ok" | "info" }[] = [];
  if (alertas.some((a) => /alergia/i.test(a)))
    sugerencias.push({
      texto: `Revisar alergias antes de indicar medicación (${alertas.filter((a) => /alergia/i.test(a)).join(", ")}).`,
      tono: "alerta",
    });
  if ((ant?.enfermedades ?? []).some((x) => /hipertens|coagul|diabet|cardio/i.test(x)))
    sugerencias.push({
      texto:
        "Tiene antecedentes sistémicos: controlar presión o coagulación antes de procedimientos invasivos.",
      tono: "alerta",
    });
  if (pendientes.length)
    sugerencias.push({
      texto: `Retomar ${pendientes[0]!.nombre}${pendientes[0]!.pieza ? ` en pieza ${pendientes[0]!.pieza}` : ""}.`,
      tono: "info",
    });
  if (presPend.length && permPres)
    sugerencias.push({
      texto: `Consultar por el presupuesto ${presPend[0]!.numero} (${$(totalPres(presPend[0]!))}) que sigue sin respuesta.`,
      tono: "info",
    });
  if (cargos - pagos > 0 && !verificar("facturacion", ctx))
    sugerencias.push({ texto: `Tiene saldo pendiente de ${$(cargos - pagos)}.`, tono: "info" });
  if (post)
    sugerencias.push({
      texto: "Registrar la evolución de hoy y agendar el próximo control desde la ficha.",
      tono: "ok",
    });

  return {
    texto: post
      ? `Resumen posterior a la consulta de ${nombreCompleto(p)}.`
      : quiereHistoria
        ? `Resumen de la historia clínica de ${nombreCompleto(p)}, con lo que está registrado en Cloud Esther.`
        : `Resumen de ${nombreCompleto(p)} para antes de la consulta.`,
    bloques: [
      {
        tipo: "kpis",
        items: [
          { label: "Tratamientos pendientes", valor: String(pendientes.length) },
          { label: "Presupuestos sin respuesta", valor: permPres ? String(presPend.length) : "—" },
          {
            label: "Próximo turno",
            valor: proximos[0] ? fecha(proximos[0].fecha) : "—",
            sub: proximos[0]?.hora,
          },
          { label: "Alertas médicas", valor: puedeClinico ? String(alertas.length) : "—" },
        ],
      },
      {
        tipo: "informe",
        titulo: `${quiereHistoria ? "Historia clínica" : post ? "Post consulta" : "Pre consulta"} · ${nombreCompleto(p)}`,
        secciones,
      },
      ...(sugerencias.length
        ? [{ tipo: "lista" as const, titulo: "Para tener en cuenta", items: sugerencias }]
        : []),
      {
        tipo: "acciones",
        items: [
          { label: "Abrir ficha", to: "/demo/pacientes" },
          { label: "Ver odontograma", pregunta: `Revisá el odontograma de ${nombreCompleto(p)}` },
          {
            label: "Tratamientos pendientes",
            pregunta: `¿Qué tratamientos tiene pendientes ${nombreCompleto(p)}?`,
          },
        ],
      },
      ...(!puedeClinico
        ? [
            {
              tipo: "aviso" as const,
              texto: `Con el rol ${ROL_IA_LABEL[ctx.rol]} no se muestran datos clínicos.`,
            },
          ]
        : []),
    ],
    modulo: "pacientes",
    resultado: "Respondida",
  };
}

/* ───────────── Consultas generales ───────────── */

const MODULO_PERMISO: [RegExp, string, string][] = [
  [/factura/, "gestionar_facturacion", "Facturación"],
  [/reporte|analitica/, "ver_reportes", "Reportes"],
  [/inventario|stock/, "gestionar_inventario", "Inventario"],
  [/configuracion/, "acceder_configuracion", "Configuración"],
  [/historia/, "ver_historias", "Historias clínicas"],
  [/agenda/, "gestionar_agenda", "Agenda"],
  [/turno/, "gestionar_turnos", "Turnos"],
  [/paciente/, "ver_pacientes", "Pacientes"],
  [/mensaje|comunicacion/, "acceder_mensajes", "Mensajes"],
];

function equipo(q: string, ctx: ContextoIA): RespuestaEsther | null {
  if (
    !/usuario|profesional|odontolog|emplead|equipo|acceso|permiso|rol(es)?\b|bloquead|inactiv|quien (tiene|puede)/.test(
      q,
    ) ||
    /portal/.test(q)
  )
    return null;
  if (ctx.rol !== "admin")
    return {
      texto:
        "La información de usuarios, roles y accesos solo la puede consultar un administrador.",
      modulo: "equipo",
      resultado: "Sin permiso",
    };
  const b = verificar("equipo", ctx);
  if (b) return b;
  const miembros = storeEquipo.leer().miembros;
  const nombre = (m: (typeof miembros)[number]) => `${m.firstName} ${m.lastName}`.trim();
  const ROL: Record<string, string> = {
    odontologo: "Odontólogo/a",
    asistente: "Asistente",
    secretaria: "Recepción",
    administrador: "Administración",
  };
  const acceso = MODULO_PERMISO.find(([r]) => r.test(q));
  if (/acceso|puede|permiso/.test(q) && acceso) {
    const con = miembros.filter(
      (m) => m.status === "activo" && m.permissions.some((p) => p.key === acceso[1] && p.enabled),
    );
    return {
      texto: con.length
      ? `${con.length} persona${con.length === 1 ? "" : "s"} activa${con.length === 1 ? "" : "s"} tiene${con.length === 1 ? "" : "n"} acceso a ${acceso[2]}.`
      : `Por ahora nadie del equipo tiene acceso a ${acceso[2]} (además del Administrador).`,
      bloques: [
        {
          tipo: "tabla",
          columnas: ["Nombre", "Rol", "Correo"],
          filas: con.map((m) => [nombre(m), ROL[m.role] ?? m.role, m.email]),
        },
        ...(ctx.plan === "inicial" || ctx.plan === "profesional"
          ? []
          : [
              {
                tipo: "acciones" as const,
                items: [
                  { label: "Permisos y accesos", to: "/demo/equipo-profesional/permisos-accesos" },
                ],
              },
            ]),
      ],
      modulo: "equipo",
      resultado: "Respondida",
    };
  }
  const soloOd = /odontolog|profesional/.test(q) && !/usuario|emplead/.test(q);
  const base = soloOd ? miembros.filter((m) => m.role === "odontologo") : miembros;
  const bloq = /bloquead|inactiv|desactivad/.test(q);
  const lista = base.filter((m) => (bloq ? m.status === "inactivo" : m.status !== "inactivo"));
  const quien = soloOd ? "profesionales (odontólogos)" : "usuarios";
  return {
    texto: `${lista.length === 1 ? "Hay 1" : `Hay ${lista.length}`} ${lista.length === 1 ? quien.replace(/es\b/, "").replace(/s\b/, "").replace("profesional (odontólogos)", "profesional (odontólogo)") : quien} ${bloq ? (lista.length === 1 ? "bloqueado o inactivo" : "bloqueados o inactivos") : lista.length === 1 ? "activo" : "activos"}${bloq ? "" : ` de ${base.length} en total`}.`,
    bloques: [
      {
        tipo: "kpis",
        items: [
          {
            label: `${soloOd ? "Profesionales" : "Usuarios"} activos`,
            valor: String(base.filter((m) => m.status !== "inactivo").length),
          },
          {
            label: "Bloqueados / inactivos",
            valor: String(base.filter((m) => m.status === "inactivo").length),
          },
          { label: "Total", valor: String(base.length) },
        ],
      },
      ...(lista.length
        ? [
            {
              tipo: "tabla" as const,
              columnas: ["Nombre", "Rol", "Estado", "Correo"],
              filas: lista.map((m) => [
                nombre(m),
                ROL[m.role] ?? m.role,
                m.status === "inactivo" ? "Bloqueado" : "Activo",
                m.email,
              ]),
            },
          ]
        : []),
    ],
    modulo: "equipo",
    resultado: "Respondida",
  };
}

function portal(q: string, ctx: ContextoIA): RespuestaEsther | null {
  if (!/portal/.test(q)) return null;
  const b = verificar("portal-paciente", ctx);
  if (b) return b;
  const accesos = storePortal.leer().accesos ?? {};
  const pacs = pacientesVisibles(ctx);
  const filas = Object.entries(accesos)
    .map(([id, a]) => ({ p: pacs.find((x) => x.id === Number(id)), a }))
    .filter((x) => x.p);
  const activos = filas.filter((x) => x.a.estado === "Activo");
  return {
    texto: !filas.length
      ? "Todavía ningún paciente tiene acceso al portal. Se lo das desde la carpeta del paciente o desde Portal del paciente."
      : `${activos.length} paciente${activos.length === 1 ? "" : "s"} tiene${activos.length === 1 ? "" : "n"} acceso activo al portal; ${(() => {
      const n = filas.filter((x) => x.a.estado === "Invitado").length;
      return n === 1
        ? "1 está invitado sin entrar todavía"
        : `${n} están invitados sin entrar todavía`;
    })()}.`,
    bloques: [
      {
        tipo: "tabla",
        columnas: ["Paciente", "Estado", "Último ingreso", "Ingresos"],
        filas: filas.map((x) => [
          nombreCompleto(x.p!),
          x.a.estado,
          x.a.ultimoIngreso ? fecha(x.a.ultimoIngreso) : "—",
          x.a.ingresos,
        ]),
      },
    ],
    modulo: "portal-paciente",
    resultado: "Respondida",
  };
}

function clinicas(q: string, ctx: ContextoIA): RespuestaEsther | null {
  if (!/clinicas?|sedes?|sucursal/.test(q) || !/cuant|cuales|que |lista/.test(q)) return null;
  const sedes = sucursalesDelPlan(ctx.plan);
  return {
    texto: `La empresa tiene ${sedes.length} sede${sedes.length === 1 ? "" : "s"}${ctx.sede !== "Todas" ? `; vos estás consultando desde ${ctx.sede}` : ""}.`,
    bloques: [
      {
        tipo: "lista",
        items: sedes.map((s) => ({
          texto: s,
          tono: s === ctx.sede ? ("ok" as const) : ("info" as const),
        })),
      },
    ],
    modulo: "configuracion",
    resultado: "Respondida",
  };
}

function turnos(q: string, ctx: ContextoIA): RespuestaEsther | null {
  if (!/cita|turno|agenda|cancelad|ausent|ocupacion|hueco|libre/.test(q)) return null;
  const b = verificar("agenda", ctx) ?? cargando(["agenda"], "la agenda");
  if (b) return b;
  const p = periodoDe(q, /cancel|ausent/.test(q) ? "mes" : "hoy");
  const t = turnosVisibles(ctx)
    .filter((x) => enPeriodo(x.fecha, p))
    .sort((a, b2) => (a.fecha + a.hora).localeCompare(b2.fecha + b2.hora));
  const estado = /cancelad/.test(q) ? "Cancelada" : /ausent|no vin/.test(q) ? "Ausente" : null;
  const lista = estado
    ? t.filter((x) => x.estado === estado)
    : t.filter((x) => x.estado !== "Cancelada");
  const porEstado = ["Confirmada", "Pendiente", "Atendida", "Ausente", "Cancelada"].map((e) => ({
    nombre: e,
    valor: t.filter((x) => x.estado === e).length,
    etiqueta: String(t.filter((x) => x.estado === e).length),
  }));
  return {
    texto: estado
      ? lista.length
        ? `${lista.length} turno${lista.length === 1 ? "" : "s"} ${estado === "Cancelada" ? "cancelado" : "con ausente"}${lista.length === 1 ? "" : "s"} ${p.nombre}.`
        : `No hubo turnos ${estado === "Cancelada" ? "cancelados" : "con ausentes"} ${p.nombre}.`
      : lista.length
        ? `Hay ${lista.length} turno${lista.length === 1 ? "" : "s"} ${p.nombre}${ctx.sede !== "Todas" ? ` en ${ctx.sede}` : ""}.`
        : `No hay turnos ${p.nombre}${ctx.sede !== "Todas" ? ` en ${ctx.sede}` : ""}.`,
    bloques: [
      ...(estado
        ? []
        : [
            {
              tipo: "barras" as const,
              titulo: "Por estado",
              items: porEstado.filter((x) => x.valor),
            },
          ]),
      ...(lista.length
        ? [
            {
              tipo: "tabla" as const,
              columnas: [
                "Fecha",
                "Hora",
                "Paciente",
                "Tratamiento",
                "Profesional",
                "Sede",
                "Estado",
              ],
              filas: lista
                .slice(0, 40)
                .map((x) => [
                  fecha(x.fecha),
                  x.hora,
                  x.paciente,
                  x.tratamiento,
                  x.odontologo,
                  x.sucursal,
                  x.estado,
                ]),
            },
          ]
        : []),
      { tipo: "acciones", items: [{ label: "Abrir agenda", to: "/demo/agenda" }] },
    ],
    modulo: "agenda",
    resultado: lista.length ? "Respondida" : "Sin datos",
  };
}

function pacientesConsulta(q: string, ctx: ContextoIA): RespuestaEsther | null {
  if (!/pacientes?/.test(q)) return null;
  const b = verificar("pacientes", ctx) ?? cargando(["pacientes"], "los pacientes");
  if (b) return b;
  const pacs = pacientesVisibles(ctx);
  const turnosT = storeAgenda.leer().turnos;
  if (
    /no (regresaron|volvieron|vinieron)|inactiv|sin volver|dormid|recontactar|reactivar/.test(q)
  ) {
    const limite = dia(-180);
    const hoy = dia();
    const lista = pacs.filter((p) => {
      const suyos = turnosT.filter((t) => norm(t.paciente) === norm(nombreCompleto(p)));
      const reciente = suyos.some((t) => t.fecha >= limite);
      return p.estado === "Inactivo" || !reciente || !suyos.some((t) => t.fecha >= hoy);
    });
    const filas = lista.map((p) => {
      const ult = turnosT
        .filter((t) => norm(t.paciente) === norm(nombreCompleto(p)) && t.fecha < hoy)
        .sort((a, c) => c.fecha.localeCompare(a.fecha))[0];
      return [
        nombreCompleto(p),
        p.telefono || "—",
        ult ? fecha(ult.fecha) : "Sin turnos",
        p.estado,
      ];
    });
    return {
      texto: lista.length
        ? `${lista.length} paciente${lista.length === 1 ? "" : "s"} no tiene${lista.length === 1 ? "" : "n"} un turno próximo agendado (o ${lista.length === 1 ? "está inactivo" : "están inactivos"}). ${lista.length === 1 ? "Es candidato" : "Son candidatos"} para recontactar.`
        : "Todos los pacientes tienen un turno próximo: no hay nadie para recontactar.",
      bloques: [
        { tipo: "tabla", columnas: ["Paciente", "Teléfono", "Última visita", "Estado"], filas },
        { tipo: "acciones", items: [{ label: "Campaña de reactivación", to: "/demo/marketing" }] },
      ],
      modulo: "pacientes",
      resultado: "Respondida",
    };
  }
  if (/nuevo/.test(q)) {
    const p = periodoDe(q, "mes");
    const primeras = turnosVisibles(ctx).filter(
      (t) => /primera/i.test(t.tratamiento) && enPeriodo(t.fecha, p) && t.estado !== "Cancelada",
    );
    return {
      texto: `${primeras.length} paciente${primeras.length === 1 ? "" : "s"} nuevo${primeras.length === 1 ? "" : "s"} ${p.nombre} (primeras consultas agendadas o atendidas).`,
      bloques: primeras.length
        ? [
            {
              tipo: "tabla",
              columnas: ["Fecha", "Paciente", "Profesional", "Sede", "Estado"],
              filas: primeras.map((t) => [
                fecha(t.fecha),
                t.paciente,
                t.odontologo,
                t.sucursal,
                t.estado,
              ]),
            },
          ]
        : [],
      modulo: "pacientes",
      resultado: "Respondida",
    };
  }
  if (/cuant|total|cantidad|lista|tenemos/.test(q)) {
    const act = pacs.filter((p) => p.estado === "Activo").length;
    const porSede = sedesVisibles(ctx).map((s) => ({
      nombre: s,
      valor: pacs.filter((p) => p.sucursal === s).length,
      etiqueta: String(pacs.filter((p) => p.sucursal === s).length),
    }));
    const cob = [...new Set(pacs.map((p) => p.obraSocial || "Particular"))].map((c) => ({
      nombre: c,
      valor: pacs.filter((p) => (p.obraSocial || "Particular") === c).length,
      etiqueta: String(pacs.filter((p) => (p.obraSocial || "Particular") === c).length),
    }));
    return {
      texto: `Tenemos ${pacs.length} pacientes${ctx.sede !== "Todas" ? ` en ${ctx.sede}` : ""}: ${act} activo${act === 1 ? "" : "s"} y ${pacs.length - act} inactivo${pacs.length - act === 1 ? "" : "s"}.`,
      bloques: [
        {
          tipo: "kpis",
          items: [
            { label: "Pacientes", valor: String(pacs.length) },
            { label: "Activos", valor: String(act) },
            { label: "Inactivos", valor: String(pacs.length - act) },
          ],
        },
        { tipo: "barras", titulo: "Por sede", items: porSede.filter((x) => x.valor) },
        { tipo: "barras", titulo: "Por cobertura", items: cob.sort((a, c) => c.valor - a.valor) },
      ],
      modulo: "pacientes",
      resultado: "Respondida",
    };
  }
  return null;
}

function presupuestos(q: string, ctx: ContextoIA): RespuestaEsther | null {
  if (!/presupuesto/.test(q)) return null;
  const b = verificar("presupuestos", ctx) ?? cargando(["registros", "pacientes"], "los presupuestos");
  if (b) return b;
  const pacs = pacientesVisibles(ctx);
  const regs = leerRegistros();
  const todos = pacs.flatMap((p) => (regs[p.id]?.presupuestos ?? []).map((pr) => ({ p, pr })));
  const creados = /cread|nuevo|emitid|hic/.test(q);
  const per = periodoDe(q, creados ? "hoy" : "mes");
  const lista = creados
    ? todos.filter((x) => enPeriodo(x.pr.fecha, per))
    : todos.filter((x) =>
        /aprobad/.test(q)
          ? x.pr.estado === "Aprobado"
          : /rechazad/.test(q)
            ? x.pr.estado === "Rechazado"
            : x.pr.estado === "Enviado",
      );
  const monto = lista.reduce((a, x) => a + totalPres(x.pr), 0);
  const estado = /aprobad/.test(q)
    ? "aprobados"
    : /rechazad/.test(q)
      ? "rechazados"
      : "pendientes de respuesta";
  const pacientesUnicos = new Set(lista.map((x) => x.p.id)).size;
  return {
    texto: creados
      ? `Se crearon ${lista.length} presupuesto${lista.length === 1 ? "" : "s"} ${per.nombre} por ${$(monto)}.`
      : lista.length
        ? `Hay ${lista.length} presupuesto${lista.length === 1 ? "" : "s"} ${estado} (${pacientesUnicos} paciente${pacientesUnicos === 1 ? "" : "s"}) por ${$(monto)}.`
        : `No hay presupuestos ${estado}.`,
    bloques: [
      {
        tipo: "kpis",
        items: [
          { label: "Presupuestos", valor: String(lista.length) },
          { label: "Pacientes", valor: String(pacientesUnicos) },
          { label: "Monto", valor: $(monto) },
          {
            label: "Conversión histórica",
            valor: `${Math.round((todos.filter((x) => x.pr.estado === "Aprobado").length / Math.max(1, todos.filter((x) => x.pr.estado === "Aprobado" || x.pr.estado === "Rechazado").length)) * 100)} %`,
          },
        ],
      },
      ...(lista.length
        ? [
            {
              tipo: "tabla" as const,
              columnas: ["Número", "Paciente", "Fecha", "Estado", "Profesional", "Total"],
              filas: lista.map((x) => [
                x.pr.numero,
                nombreCompleto(x.p),
                fecha(x.pr.fecha),
                x.pr.estado,
                x.pr.profesional ?? "—",
                $(totalPres(x.pr)),
              ]),
            },
          ]
        : []),
      { tipo: "acciones", items: [{ label: "Ir a Presupuestos", to: "/demo/presupuestos" }] },
    ],
    modulo: "presupuestos",
    resultado: "Respondida",
  };
}

function facturacion(q: string, ctx: ContextoIA): RespuestaEsther | null {
  if (!/factur|cobr|ingres|venta|deuda|por cobrar/.test(q)) return null;
  const b = verificar("facturacion", ctx) ?? cargando(["facturacion", "registros"], "los cobros");
  if (b) return b;
  const per = periodoDe(q, "mes");
  const sedes = sedesVisibles(ctx);
  const comps = storeFacturacion
    .leer()
    .comprobantes.filter(
      (c) =>
        c.clase === "Factura" && !c.anulada && (ctx.sede === "Todas" || sedes.includes(c.sucursal)),
    );
  const delPer = comps.filter((c) => enPeriodo(c.fecha, per));
  const facturado = delPer.reduce((a, c) => a + totalesComprobante(c).total, 0);
  // Cobrado = lo mismo que ve Finanzas: cobros de comprobantes + cobros en la cuenta del paciente
  const cobrado = ctx.libro
    ? ctx.libro.asientos
        .filter((a) => a.tipo === "Ingreso" && (a.origen === "Facturación" || a.origen === "Cobros") && enPeriodo(a.fecha, per))
        .reduce((x, a) => x + a.monto, 0)
    : comps
        .flatMap((c) => c.pagos)
        .filter((p) => enPeriodo(p.fecha, per))
        .reduce((a, p) => a + p.monto, 0);
  const deudaPacientes = Object.values(leerRegistros()).reduce((a, r) => a + deudaDe(r?.cuenta).saldo, 0);
  const porCobrar = comps.reduce((a, c) => a + saldo(c), 0) + deudaPacientes;
  const vencido = comps
    .filter((c) => estadoComprobante(c) === "Vencida")
    .reduce((a, c) => a + saldo(c), 0);
  const porProf = [...new Set(delPer.map((c) => c.profesional || "Sin profesional"))].map((pr) => {
    const v = delPer
      .filter((c) => (c.profesional || "Sin profesional") === pr)
      .reduce((a, c) => a + totalesComprobante(c).total, 0);
    return { nombre: pr, valor: v, etiqueta: $(v) };
  });
  return {
    texto: `${per.nombre.charAt(0).toUpperCase() + per.nombre.slice(1)} ${facturado ? `se facturaron ${$(facturado)} en ${delPer.length} ${delPer.length === 1 ? "comprobante" : "comprobantes"} y ` : ""}se ${cobrado === 1 ? "cobró" : "cobraron"} ${$(cobrado)}. ${porCobrar ? `Quedan ${$(porCobrar)} por cobrar${vencido ? `, ${$(vencido)} vencidos` : ""}.` : "No hay nada pendiente de cobro."}`,
    bloques: [
      {
        tipo: "kpis",
        items: [
          { label: "Facturado", valor: $(facturado), sub: `${delPer.length} comprobantes` },
          { label: "Cobrado", valor: $(cobrado) },
          { label: "Por cobrar", valor: $(porCobrar) },
          { label: "Vencido", valor: $(vencido) },
        ],
      },
      ...(porProf.length
        ? [
            {
              tipo: "barras" as const,
              titulo: "Facturado por profesional",
              items: porProf.sort((a, c) => c.valor - a.valor),
            },
          ]
        : []),
      {
        tipo: "acciones",
        items: [
          { label: "Ir a Facturación", to: "/demo/facturacion" },
          ...(deudaPacientes ? [{ label: "¿Quién me debe?", pregunta: "¿Quién me debe?" }] : []),
        ],
      },
    ],
    modulo: "facturacion",
    resultado: "Respondida",
  };
}

function tratamientosPendientes(q: string, ctx: ContextoIA): RespuestaEsther | null {
  if (!/tratamientos?/.test(q) || !/pendiente|en curso|planificad|abierto/.test(q)) return null;
  const b = verificar("tratamientos", ctx) ?? cargando(["registros", "pacientes"], "los tratamientos");
  if (b) return b;
  const regs = leerRegistros();
  const filas = pacientesVisibles(ctx).flatMap((p) =>
    (regs[p.id]?.tratamientos ?? [])
      .filter((t) => t.estado === "Planificado" || t.estado === "En tratamiento")
      .map((t) => ({ p, t })),
  );
  const porTipo = [...new Set(filas.map((x) => x.t.nombre))].map((n) => ({
    nombre: n,
    valor: filas.filter((x) => x.t.nombre === n).length,
    etiqueta: String(filas.filter((x) => x.t.nombre === n).length),
  }));
  return {
    texto: filas.length
      ? `Hay ${filas.length} tratamiento${filas.length === 1 ? "" : "s"} pendiente${filas.length === 1 ? "" : "s"} en ${new Set(filas.map((x) => x.p.id)).size} paciente${new Set(filas.map((x) => x.p.id)).size === 1 ? "" : "s"}.`
      : "No hay tratamientos pendientes.",
    bloques: [
      ...(porTipo.length
        ? [
            {
              tipo: "barras" as const,
              titulo: "Por tratamiento",
              items: porTipo.sort((a, c) => c.valor - a.valor).slice(0, 8),
            },
          ]
        : []),
      ...(filas.length
        ? [
            {
              tipo: "tabla" as const,
              columnas: ["Paciente", "Tratamiento", "Pieza", "Estado", "Profesional", "Desde"],
              filas: filas.map((x) => [
                nombreCompleto(x.p),
                x.t.nombre,
                x.t.pieza || "—",
                x.t.estado,
                x.t.profesional,
                fecha(x.t.inicio),
              ]),
            },
          ]
        : []),
    ],
    modulo: "tratamientos",
    resultado: filas.length ? "Respondida" : "Sin datos",
  };
}

function inventario(q: string, ctx: ContextoIA): RespuestaEsther | null {
  if (!/inventario|stock|insumo|faltante|reponer|vencid/.test(q)) return null;
  const b = verificar("inventario", ctx) ?? cargando(["inventario"], "el inventario");
  if (b) return b;
  const sedes = sedesVisibles(ctx);
  const ins = storeInventario
    .leer()
    .insumos.filter((i) => ctx.sede === "Todas" || sedes.includes(i.sucursal) || !i.sucursal);
  const bajos = ins.filter((i) => nivelStock(i) === "Bajo" || nivelStock(i) === "Agotado");
  return {
    texto: !ins.length
      ? "Todavía no hay insumos cargados en Inventario."
      : bajos.length
        ? `${bajos.length} insumo${bajos.length === 1 ? "" : "s"} con stock bajo o agotado de ${ins.length} en total.`
        : `Todo el stock está bien: ninguno de los ${ins.length} insumos está bajo.`,
    bloques: [
      ...(bajos.length
        ? [
            {
              tipo: "tabla" as const,
              columnas: ["Insumo", "Sede", "Stock", "Mínimo", "Estado"],
              filas: bajos.map((i) => [
                i.nombre,
                i.sucursal,
                `${i.stock} ${i.unidad}`,
                i.minimo,
                nivelStock(i),
              ]),
            },
          ]
        : []),
      { tipo: "acciones", items: [{ label: "Ir a Inventario", to: "/demo/inventario" }] },
    ],
    modulo: "inventario",
    resultado: "Respondida",
  };
}

/* ───────────── Reportes inteligentes ───────────── */

function reporte(q: string, ctx: ContextoIA): RespuestaEsther | null {
  if (!/reporte|informe|prepara(me)?|arma(me)?/.test(q)) return null;
  const temas: [RegExp, string][] = [
    [/presupuesto/, "presupuestos pendientes"],
    [/cancelac/, "turnos cancelados este mes"],
    [/inactiv|no regres/, "pacientes que no regresaron"],
    [/factur|cobr/, "facturación de este mes"],
    [/tratamiento/, "tratamientos pendientes"],
    [/inventario|stock/, "stock bajo de inventario"],
    [/agenda|turno|cita/, "turnos de esta semana"],
    [/paciente/, "cuántos pacientes tenemos"],
    [/productividad|profesional/, "productividad"],
  ];
  const tema = temas.find(([r]) => r.test(q));
  if (!tema) return null;
  if (tema[1] === "productividad") {
    const b = verificar("agenda", ctx);
    if (b) return b;
    const per = periodoDe(q, "mes");
    const t = turnosVisibles(ctx).filter((x) => enPeriodo(x.fecha, per));
    const profs = [...new Set(t.map((x) => x.odontologo))];
    const filas = profs.map((pr) => {
      const suyos = t.filter((x) => x.odontologo === pr);
      const at = suyos.filter((x) => x.estado === "Atendida").length;
      const aus = suyos.filter((x) => x.estado === "Ausente").length;
      return [pr, suyos.length, at, aus, `${Math.round((aus / Math.max(1, at + aus)) * 100)} %`];
    });
    return {
      texto: `Reporte de productividad de ${per.nombre}, con los turnos de la agenda.`,
      bloques: [
        {
          tipo: "tabla",
          titulo: "Productividad por profesional",
          columnas: ["Profesional", "Turnos", "Atendidos", "Ausentes", "Ausentismo"],
          filas,
        },
        { tipo: "acciones", items: [{ label: "Ver Analítica completa", to: "/demo/bi" }] },
      ],
      modulo: "bi",
      resultado: "Respondida",
    };
  }
  const base = responder(tema[1], ctx, true);
  if (base.resultado !== "Respondida" && base.resultado !== "Sin datos") return base;
  const tabla = base.bloques?.find((x) => x.tipo === "tabla");
  return {
    ...base,
    texto: `Listo, preparé el reporte de ${tema[1]}. ${base.texto}`,
    bloques: [
      {
        tipo: "informe",
        titulo: `Reporte de ${tema[1]}`,
        secciones: [
          { titulo: "Resumen", texto: base.texto },
          {
            titulo: "Alcance",
            texto: `Generado el ${fecha(dia())} por ${ctx.usuario} (${ROL_IA_LABEL[ctx.rol]}) · Sede: ${ctx.sede}. Datos de Cloud Esther al momento de la consulta.`,
          },
        ],
      },
      ...(base.bloques ?? []).filter((x) => x !== tabla),
      ...(tabla ? [tabla] : []),
    ],
  };
}

/* ───────────── Pendientes generales ───────────── */

function pendientes(q: string, ctx: ContextoIA): RespuestaEsther | null {
  if (
    /tratamiento|presupuesto|factura|turno|cita/.test(q) ||
    !/^(revisar )?pendientes$|revisar pendientes|que (tengo|hay) pendiente|analizar registros|que tengo que (hacer|resolver)/.test(
      q,
    )
  )
    return null;
  const items: { texto: string; detalle?: string; tono?: "alerta" | "ok" | "info" }[] = [];
  const acciones: { label: string; pregunta: string }[] = [];
  const hoy = dia();
  if (!verificar("agenda", ctx)) {
    const t = turnosVisibles(ctx).filter((x) => x.fecha === hoy);
    const sinConf = t.filter((x) => x.estado === "Pendiente");
    items.push({
      texto: `${t.length} turnos hoy, ${sinConf.length} sin confirmar`,
      detalle: sinConf.map((x) => `${x.hora} ${x.paciente}`).join(" · "),
      tono: sinConf.length ? "alerta" : "ok",
    });
    acciones.push({ label: "Turnos de mañana", pregunta: "¿Cuántos turnos tenemos mañana?" });
  }
  if (!verificar("presupuestos", ctx)) {
    const regs = leerRegistros();
    const env = pacientesVisibles(ctx).flatMap((p) =>
      (regs[p.id]?.presupuestos ?? []).filter((x) => x.estado === "Enviado"),
    );
    items.push({
      texto: `${env.length} presupuestos esperan respuesta`,
      detalle: $(env.reduce((a, x) => a + totalPres(x), 0)),
      tono: env.length ? "alerta" : "ok",
    });
    acciones.push({ label: "Ver presupuestos", pregunta: "¿Cuántos presupuestos pendientes hay?" });
  }
  if (!verificar("tratamientos", ctx)) {
    const regs = leerRegistros();
    const tr = pacientesVisibles(ctx).flatMap((p) =>
      (regs[p.id]?.tratamientos ?? []).filter(
        (t) => t.estado === "Planificado" || t.estado === "En tratamiento",
      ),
    );
    items.push({ texto: `${tr.length} tratamientos en curso o planificados`, tono: "info" });
    acciones.push({ label: "Ver tratamientos", pregunta: "¿Qué tratamientos están pendientes?" });
  }
  if (!verificar("facturacion", ctx)) {
    const venc = storeFacturacion
      .leer()
      .comprobantes.filter(
        (c) => c.clase === "Factura" && !c.anulada && estadoComprobante(c) === "Vencida",
      );
    items.push({
      texto: `${venc.length} facturas vencidas`,
      detalle: $(venc.reduce((a, c) => a + saldo(c), 0)),
      tono: venc.length ? "alerta" : "ok",
    });
  }
  if (!verificar("inventario", ctx)) {
    const bajos = storeInventario
      .leer()
      .insumos.filter(
        (i) =>
          sedesVisibles(ctx).includes(i.sucursal) &&
          (nivelStock(i) === "Bajo" || nivelStock(i) === "Agotado"),
      );
    items.push({
      texto: `${bajos.length} insumos para reponer`,
      tono: bajos.length ? "alerta" : "ok",
    });
  }
  return {
    texto: "Esto es lo que está pendiente ahora, según lo que tu rol puede ver:",
    bloques: [
      { tipo: "lista", items },
      { tipo: "acciones", items: acciones },
    ],
    modulo: "general",
    resultado: "Respondida",
  };
}


/* ───────────── Datos todavía cargando (clínica real) ───────────── */

/** En una clínica real los datos llegan del servidor: mientras tanto no se responde «0». */
function cargando(claves: string[], que: string): RespuestaEsther | null {
  const listo = esClinicaReal()
    ? claves.every(moduloCargado)
    : demoConDatosEnServidor()
      ? claves.every((k) => moduloCargado(claveDemoServidor(k, tenantActual())))
      : true;
  if (listo) return null;
  return {
    texto: `Estoy terminando de traer ${que} de la clínica. Preguntame de nuevo en unos segundos así te respondo con los números reales.`,
    modulo: "general",
    resultado: "Sin datos",
    cargando: true,
  };
}

/* ───────────── Quién debe ───────────── */

function deudores(q: string, ctx: ContextoIA): RespuestaEsther | null {
  if (!/quien(es)? (me |nos )?deben?|me deben|nos deben|deudor|deudas? de (los )?pacientes|pacientes? (que|con) deuda|saldos? (pendiente|a favor)/.test(q))
    return null;
  const b = verificar("facturacion", ctx) ?? cargando(["registros", "pacientes"], "las cuentas de los pacientes");
  if (b) return b;
  const regs = leerRegistros();
  const filas = pacientesVisibles(ctx)
    .map((p) => ({ p, d: deudaDe(regs[p.id]?.cuenta) }))
    .filter((x) => x.d.saldo > 0)
    .sort((a, c) => c.d.saldo - a.d.saldo);
  const total = filas.reduce((a, x) => a + x.d.saldo, 0);
  if (!filas.length)
    return {
      texto: "Nadie te debe: todas las cuentas de los pacientes están al día.",
      bloques: [{ tipo: "acciones", items: [{ label: "Ir a Cobranzas", to: "/demo/facturacion" }] }],
      modulo: "facturacion",
      resultado: "Respondida",
    };
  return {
    texto: `${filas.length === 1 ? "Te debe 1 paciente" : `Te deben ${filas.length} pacientes`}: ${$(total)} en total.${filas[0] ? ` El saldo más alto es de ${nombreCompleto(filas[0].p)} (${$(filas[0].d.saldo)}).` : ""}`,
    bloques: [
      {
        tipo: "tabla",
        columnas: ["Paciente", "Debe", "Desde"],
        filas: filas.slice(0, 30).map((x) => [nombreCompleto(x.p), $(x.d.saldo), fecha(x.d.desde)]),
      },
      { tipo: "acciones", items: [{ label: "Mandar recordatorios desde Cobranzas", to: "/demo/facturacion" }] },
    ],
    modulo: "facturacion",
    resultado: "Respondida",
  };
}

/* ───────────── Caja del día ───────────── */

function caja(q: string, ctx: ContextoIA): RespuestaEsther | null {
  if (!/\bcaja\b/.test(q)) return null;
  const b = verificar("facturacion", ctx) ?? cargando(["facturacion"], "la caja");
  if (b) return b;
  const { sesiones, movimientos } = storeFacturacion.leer();
  const visibles = sesiones.filter((s) => ctx.sede === "Todas" || s.sucursal === ctx.sede || !s.sucursal);
  const abiertas = visibles.filter((s) => !s.cerrada);
  const resumen = (s: (typeof sesiones)[number]) => {
    const movs = movimientos.filter((m) => m.sesionId === s.id);
    const ing = movs.filter((m) => m.tipo === "Ingreso").reduce((a, m) => a + m.monto, 0);
    const egr = movs.filter((m) => m.tipo === "Egreso").reduce((a, m) => a + m.monto, 0);
    const efectivo =
      s.inicial +
      movs.filter((m) => m.medio === "Efectivo").reduce((a, m) => a + (m.tipo === "Ingreso" ? m.monto : -m.monto), 0);
    return { ing, egr, efectivo, n: movs.filter((m) => m.tipo === "Ingreso").length };
  };
  if (abiertas.length) {
    const filas = abiertas.map((s) => ({ s, r: resumen(s) }));
    const ing = filas.reduce((a, x) => a + x.r.ing, 0);
    const ef = filas.reduce((a, x) => a + x.r.efectivo, 0);
    return {
      texto: `La caja está abierta. Van ${$(ing)} cobrados y tendría que haber ${$(ef)} en efectivo.`,
      bloques: [
        {
          tipo: "kpis",
          items: [
            { label: "Cobrado", valor: $(ing), sub: `${filas.reduce((a, x) => a + x.r.n, 0)} cobros` },
            { label: "Gastos", valor: $(filas.reduce((a, x) => a + x.r.egr, 0)) },
            { label: "Efectivo esperado", valor: $(ef) },
          ],
        },
        { tipo: "acciones", items: [{ label: "Ir a la Caja", to: "/demo/facturacion" }] },
      ],
      modulo: "facturacion",
      resultado: "Respondida",
    };
  }
  const ultima = [...visibles].sort((a, c) => c.cerrada.localeCompare(a.cerrada))[0];
  if (!ultima)
    return {
      texto: "Todavía no se abrió ninguna caja. Se abre desde Facturación → Caja al empezar el día.",
      bloques: [{ tipo: "acciones", items: [{ label: "Abrir la caja", to: "/demo/facturacion" }] }],
      modulo: "facturacion",
      resultado: "Sin datos",
    };
  const r = resumen(ultima);
  const dif = ultima.contado - r.efectivo;
  return {
    texto: `La caja está cerrada. La última se cerró el ${fecha(ultima.cerrada)}: se cobraron ${$(r.ing)} y ${dif === 0 ? "el efectivo dio justo" : `${dif > 0 ? "sobraron" : "faltaron"} ${$(Math.abs(dif))}`}.`,
    bloques: [{ tipo: "acciones", items: [{ label: "Ir a la Caja", to: "/demo/facturacion" }] }],
    modulo: "facturacion",
    resultado: "Respondida",
  };
}

/* ───────────── Gastos y cuánto quedó (Finanzas) ───────────── */

function finanzas(q: string, ctx: ContextoIA): RespuestaEsther | null {
  if (
    !/gast|ganancia|ganamos|gane|(me|nos|te) quedo|cuanto quedo|resultado|egreso|finanzas|cuentas? a pagar|(que|cuanto) (tengo|tenemos|hay) que pagar|por pagar|proveedor/.test(
      q,
    )
  )
    return null;
  const b = verificar("finanzas", ctx) ?? cargando(["finanzas", "facturacion", "registros"], "los números de Finanzas");
  if (b) return b;
  if (!ctx.libro) return null;
  const per = periodoDe(q, "mes");
  const ops = ctx.libro.operativos.filter((a) => enPeriodo(a.fecha, per));
  const ing = ops.filter((a) => a.tipo === "Ingreso").reduce((x, a) => x + a.monto, 0);
  const egr = ops.filter((a) => a.tipo === "Egreso").reduce((x, a) => x + a.monto, 0);
  const cats = new Map<string, number>();
  for (const a of ops) if (a.tipo === "Egreso") cats.set(a.categoria, (cats.get(a.categoria) ?? 0) + a.monto);
  const porPagar = storeFinanzas
    .leer()
    .cuentasPagar.filter((c) => c.estado === "Pendiente" && c.vence <= per.hasta)
    .sort((a, c) => a.vence.localeCompare(c.vence));
  const totalPagar = porPagar.reduce((a, c) => a + c.monto, 0);
  const quedo = ing - egr;
  const Per = per.nombre.charAt(0).toUpperCase() + per.nombre.slice(1);
  const texto = /pagar|proveedor/.test(q)
    ? porPagar.length
      ? `Tenés ${porPagar.length} ${porPagar.length === 1 ? "pago pendiente" : "pagos pendientes"} por ${$(totalPagar)}. El primero vence el ${fecha(porPagar[0]!.vence)}.`
      : "No tenés pagos pendientes en ese período."
    : !ops.length
      ? `${Per} todavía no hay movimientos cargados en Finanzas.`
      : `${Per} entraron ${$(ing)} y se gastaron ${$(egr)}: ${quedo >= 0 ? `quedaron ${$(quedo)}` : `salió ${$(-quedo)} más de lo que entró`}.`;
  return {
    texto,
    bloques: [
      {
        tipo: "kpis",
        items: [
          { label: "Entró", valor: $(ing) },
          { label: "Gastos", valor: $(egr) },
          { label: "Quedó", valor: $(quedo) },
          { label: "Por pagar", valor: $(totalPagar), sub: `${porPagar.length} ${porPagar.length === 1 ? "pago" : "pagos"}` },
        ],
      },
      ...(cats.size
        ? [
            {
              tipo: "barras" as const,
              titulo: "En qué se gastó",
              items: [...cats.entries()]
                .sort((a, c) => c[1] - a[1])
                .slice(0, 6)
                .map(([nombre, v]) => ({ nombre, valor: v, etiqueta: $(v) })),
            },
          ]
        : []),
      ...(porPagar.length && /pagar|proveedor/.test(q)
        ? [
            {
              tipo: "tabla" as const,
              columnas: ["Vence", "Proveedor", "Concepto", "Monto"],
              filas: porPagar.slice(0, 20).map((c) => [fecha(c.vence), c.proveedor || "—", c.concepto, $(c.monto)]),
            },
          ]
        : []),
      { tipo: "acciones", items: [{ label: "Ir a Finanzas", to: "/demo/finanzas" }] },
    ],
    modulo: "finanzas",
    resultado: "Respondida",
  };
}

/* ───────────── Recetas ───────────── */

function recetas(q: string, ctx: ContextoIA): RespuestaEsther | null {
  if (!/receta/.test(q)) return null;
  const b = verificar("recetas", ctx) ?? cargando(["registros", "pacientes"], "las recetas");
  if (b) return b;
  const per = periodoDe(q, "mes");
  const regs = leerRegistros();
  const filas = pacientesVisibles(ctx)
    .flatMap((p) => (regs[p.id]?.recetas ?? []).map((r) => ({ p, r })))
    .filter((x) => x.r.estado !== "Anulada" && x.r.estado !== "Borrador" && enPeriodo(x.r.fecha, per))
    .sort((a, c) => c.r.fecha.localeCompare(a.r.fecha));
  return {
    texto: filas.length
      ? `${per.nombre.charAt(0).toUpperCase() + per.nombre.slice(1)} se ${filas.length === 1 ? "hizo 1 receta" : `hicieron ${filas.length} recetas`}.`
      : `No hay recetas ${per.nombre === "hoy" ? "de hoy" : per.nombre}.`,
    bloques: [
      ...(filas.length
        ? [
            {
              tipo: "tabla" as const,
              columnas: ["Fecha", "Paciente", "Medicamentos", "Profesional"],
              filas: filas.slice(0, 30).map((x) => [
                fecha(x.r.fecha),
                nombreCompleto(x.p),
                x.r.medicamentos.map((m) => m.nombre).join(", ") || "—",
                x.r.profesional || "—",
              ]),
            },
          ]
        : []),
      { tipo: "acciones", items: [{ label: "Ir a Recetas", to: "/demo/recetas" }] },
    ],
    modulo: "recetas",
    resultado: filas.length ? "Respondida" : "Sin datos",
  };
}

/* ───────────── Laboratorio ───────────── */

function laboratorio(q: string, ctx: ContextoIA): RespuestaEsther | null {
  if (!/laboratorio|trabajos? (de|del) lab|\blab\b|protesis/.test(q)) return null;
  const b = verificar("laboratorio", ctx) ?? cargando(["registros", "pacientes"], "los trabajos de laboratorio");
  if (b) return b;
  const hoy = dia();
  const regs = leerRegistros();
  const filas = pacientesVisibles(ctx)
    .flatMap((p) => (regs[p.id]?.laboratorio ?? []).map((t) => ({ p, t })))
    .filter((x) => x.t.estado !== "Entregado")
    .sort((a, c) => (a.t.fechaEntregaEstimada || "9").localeCompare(c.t.fechaEntregaEstimada || "9"));
  const listos = filas.filter((x) => x.t.estado === "Listo para retirar").length;
  const atrasados = filas.filter((x) => x.t.estado !== "Listo para retirar" && x.t.fechaEntregaEstimada && x.t.fechaEntregaEstimada < hoy).length;
  return {
    texto: filas.length
      ? `Hay ${filas.length} ${filas.length === 1 ? "trabajo" : "trabajos"} en el laboratorio${listos ? `, ${listos} ${listos === 1 ? "listo" : "listos"} para retirar` : ""}${atrasados ? ` y ${atrasados} ${atrasados === 1 ? "atrasado" : "atrasados"}` : ""}.`
      : "No hay trabajos pendientes en el laboratorio.",
    bloques: [
      ...(filas.length
        ? [
            {
              tipo: "tabla" as const,
              columnas: ["Paciente", "Trabajo", "Laboratorio", "Estado", "Llega"],
              filas: filas.slice(0, 30).map((x) => [
                nombreCompleto(x.p),
                `${x.t.tipo}${x.t.pieza ? ` (${x.t.pieza})` : ""}`,
                x.t.proveedor || "—",
                x.t.estado,
                fecha(x.t.fechaEntregaEstimada),
              ]),
            },
          ]
        : []),
      { tipo: "acciones", items: [{ label: "Ir a Laboratorio", to: "/demo/laboratorio" }] },
    ],
    modulo: "laboratorio",
    resultado: filas.length ? "Respondida" : "Sin datos",
  };
}

/* ───────────── Turnos sacados por internet ───────────── */

function turnosOnline(q: string, ctx: ContextoIA): RespuestaEsther | null {
  if (!/online|por internet|por la web|reservas?\b|reservaron/.test(q)) return null;
  const b = verificar("agenda", ctx) ?? cargando(["agenda"], "la agenda");
  if (b) return b;
  const per = periodoDe(q, "mes");
  const t = turnosVisibles(ctx)
    .filter((x) => x.reservaOnline && enPeriodo(x.reservaOnline.fecha || x.fecha, per))
    .sort((a, c) => (a.fecha + a.hora).localeCompare(c.fecha + c.hora));
  return {
    texto: t.length
      ? `${per.nombre.charAt(0).toUpperCase() + per.nombre.slice(1)} se ${t.length === 1 ? "sacó 1 turno" : `sacaron ${t.length} turnos`} por internet.`
      : `${per.nombre.charAt(0).toUpperCase() + per.nombre.slice(1)} no se sacaron turnos por internet.`,
    bloques: [
      ...(t.length
        ? [
            {
              tipo: "tabla" as const,
              columnas: ["Turno", "Paciente", "Tratamiento", "Estado"],
              filas: t.slice(0, 30).map((x) => [`${fecha(x.fecha)} ${x.hora}`, x.paciente, x.tratamiento, x.estado]),
            },
          ]
        : []),
      { tipo: "acciones", items: [{ label: "Ver Turnos online", to: "/demo/agenda" }] },
    ],
    modulo: "agenda",
    resultado: t.length ? "Respondida" : "Sin datos",
  };
}

/* ───────────── Lo que no sé: te llevo a la pantalla ───────────── */

const PANTALLAS: [RegExp, string, string, string][] = [
  [/marketing|campana|publicidad|redes|instagram|captacion/, "marketing", "Marketing", "/demo/marketing"],
  [/mensaje|whatsapp|comunicacion|mail|correo/, "comunicaciones", "Comunicaciones", "/demo/comunicaciones"],
  [/estudio|radiograf|tomograf|placa/, "estudios", "Estudios y diagnóstico", "/demo/estudios"],
  [/odontograma|diente|pieza/, "odontograma", "Odontograma", "/demo/odontograma"],
  [/historia|evolucion|antecedente|alergi/, "historia", "Historia clínica", "/demo/historia"],
  [/automatiz|recordatorio automatic/, "automatizaciones", "Automatizaciones", "/demo/automatizaciones"],
  [/precio|arancel|lista de precios|cuanto cobr/, "presupuestos", "Presupuestos → Aranceles", "/demo/presupuestos"],
  [/factura electronica|afip|arca|cae|comprobante/, "facturacion", "Facturación", "/demo/facturacion"],
  [/sueldo|liquidacion|vacacion|licencia|empleado/, "rrhh", "Recursos humanos", "/demo/rrhh"],
  [/usuario|permiso|contrasena|clave/, "equipo", "Equipo", "/demo/equipo-profesional"],
  [/grafico|estadistica|comparar|evolucion de|analitica|metas?\b/, "bi", "Analítica", "/demo/bi"],
  [/logo|horario|datos de la clinica|configur|pais|moneda/, "configuracion", "Configuración", "/demo/configuracion"],
];

function aLaPantalla(q: string, ctx: ContextoIA): RespuestaEsther | null {
  const hit = PANTALLAS.find(([re]) => re.test(q));
  if (!hit) return null;
  const [, modulo, nombre, to] = hit;
  const b = verificar(modulo, ctx);
  if (b) return b;
  return {
    texto: `Eso no lo puedo responder yo todavía, pero lo encontrás en ${nombre}. Te llevo:`,
    bloques: [{ tipo: "acciones", items: [{ label: `Ir a ${nombre.split(" →")[0]}`, to }] }],
    modulo,
    resultado: "Sin datos",
  };
}


/* ───────────── Acciones: Esther HACE cosas, siempre con tu confirmación ───────────── */

export type ResultadoAccion = { texto: string; bloques?: Bloque[] };
const ACCIONES = new Map<string, () => ResultadoAccion>();
let nAccion = 0;
function registrarAccion(fn: () => ResultadoAccion) {
  const id = `acc-${Date.now()}-${++nAccion}`;
  ACCIONES.set(id, fn);
  return id;
}
/** La pantalla la llama cuando la persona confirma (o toca «Mandar»). */
export function ejecutarAccionEsther(id: string): ResultadoAccion {
  const fn = ACCIONES.get(id);
  if (!fn) return { texto: "Esa acción ya no está disponible. Pedímela de nuevo y la preparo." };
  ACCIONES.delete(id);
  try {
    return fn();
  } catch {
    return { texto: "No pude hacerlo. Probá de nuevo desde la pantalla correspondiente." };
  }
}

const nombreClinica = () => leerSesionActual()?.clinica.nombre || "la clínica";
const DIAS_SEMANA = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
function diaLindo(f: string) {
  if (f === dia()) return "hoy";
  if (f === dia(1)) return "mañana";
  const d = new Date(`${f}T12:00:00`);
  return `el ${["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"][d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;
}

/** Fecha pedida en la frase: hoy, mañana, pasado mañana, un día de la semana o 5/12. */
function fechaPedida(q: string): string | null {
  if (/pasado manana/.test(q)) return dia(2);
  if (/\bmanana\b/.test(q)) return dia(1);
  if (/\bhoy\b/.test(q)) return dia();
  const num = q.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (num) {
    const hoy = new Date();
    let anio = num[3] ? Number(num[3].length === 2 ? `20${num[3]}` : num[3]) : hoy.getFullYear();
    const f = new Date(anio, Number(num[2]) - 1, Number(num[1]));
    if (!num[3] && iso(f) < dia()) f.setFullYear(++anio);
    return iso(f);
  }
  const ds = DIAS_SEMANA.findIndex((d) => new RegExp(`\\b${d}\\b`).test(q));
  if (ds >= 0) {
    const hoy = new Date();
    let suma = (ds - hoy.getDay() + 7) % 7;
    if (suma === 0) suma = 7;
    return dia(suma);
  }
  return null;
}
/** Hora pedida: «a las 10», «10:30», «a las 5 y media», «17 hs». A la tarde si dice 1 a 7. */
function horaPedida(q: string): string | null {
  const m =
    q.match(/a las? (\d{1,2})(?:[:.](\d{2}))?( y media| y cuarto)?/) ??
    q.match(/\b(\d{1,2})[:.](\d{2})\b()/) ??
    q.match(/\b(\d{1,2})\s*(?:hs|horas)\b()()/);
  if (!m) return null;
  let h = Number(m[1]);
  let min = m[2] ? Number(m[2]) : m[3] === " y media" ? 30 : m[3] === " y cuarto" ? 15 : 0;
  if (h >= 1 && h <= 7) h += 12;
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function accionAgendar(q: string, ctx: ContextoIA): RespuestaEsther | null {
  if (
    !/^(che |por favor |esther )?(agenda|anota|reserva)(le|me)?\b/.test(q) &&
    !/\b(agendale|agendame|agendar|anotale|anotar|reservale|reservar|dale (un )?turno|dar(le)? (un )?turno|sacale (un )?turno)\b/.test(q)
  )
    return null;
  if (/\b(cuant|que turnos|cuales)\b/.test(q)) return null;
  const b = verificar("agenda", ctx) ?? cargando(["agenda", "pacientes", "equipo"], "la agenda");
  if (b) return b;
  const pac = pacienteMencionado(q, ctx);
  if (!pac)
    return {
      texto: "¿A qué paciente le doy el turno? Escribime nombre y apellido como figura en Pacientes. Por ejemplo: «Agendá a Laura Gómez el martes a las 10».",
      modulo: "agenda",
      resultado: "Sin datos",
      sinIA: true,
    };
  const fecha = fechaPedida(q);
  const hora = horaPedida(q);
  if (!fecha || !hora)
    return {
      texto: `¿Para qué día y a qué hora le doy el turno a ${nombreCompleto(pac)}? Por ejemplo: «Agendá a ${nombreCompleto(pac)} el martes a las 10».`,
      modulo: "agenda",
      resultado: "Sin datos",
      sinIA: true,
    };
  const agenda = storeAgenda.leer();
  const odontos = storeEquipo
    .leer()
    .miembros.filter((m) => m.role === "odontologo" && m.status !== "inactivo")
    .map((m) => `${m.firstName} ${m.lastName}`.trim());
  const prof =
    odontos.find((o) => o.split(" ").some((w) => w.length > 2 && new RegExp(`\\b${norm(w)}\\b`).test(q))) ??
    agenda.turnos.filter((t) => t.paciente === nombreCompleto(pac) && t.odontologo).sort((a, c) => c.fecha.localeCompare(a.fecha))[0]?.odontologo ??
    odontos[0] ??
    "";
  const aranceles = storePresupuestos.leer().aranceles?.filter((a) => a.activo !== false).map((a) => a.nombre) ?? [];
  const trat =
    [...aranceles].sort((a, c) => c.length - a.length).find((n) => q.includes(norm(n))) ??
    (/limpieza/.test(q) ? "Limpieza dental" : /control/.test(q) ? "Control" : /urgencia/.test(q) ? "Urgencia" : "Consulta");
  const { duracion } = tiemposAgenda(agenda.ajustes);
  const sede = ctx.sede !== "Todas" ? ctx.sede : (sucursalesDelPlan(ctx.plan)[0] ?? "");
  const ini = aMinutos(hora);
  const choca = agenda.turnos.find(
    (t) =>
      t.fecha === fecha &&
      t.estado !== "Cancelada" &&
      (!prof || t.odontologo === prof) &&
      turnoSolapa(t, ini, ini + duracion, duracion),
  );
  const yaTiene = agenda.turnos.find((t) => t.fecha === fecha && t.paciente === nombreCompleto(pac) && t.estado !== "Cancelada");
  const pasado = fecha < dia() || (fecha === dia() && ini < new Date().getHours() * 60 + new Date().getMinutes());
  const avisos = [
    pasado ? "Ese horario ya pasó." : "",
    choca ? `${prof || "La agenda"} ya tiene a ${choca.paciente} a las ${choca.hora}.` : "",
    yaTiene ? `${nombreCompleto(pac)} ya tiene un turno ese día a las ${yaTiene.hora}.` : "",
    !prof ? "Todavía no hay odontólogos cargados en Equipo: el turno queda sin profesional." : "",
  ].filter(Boolean);
  const accionId = registrarAccion(() => {
    const nuevo: Turno = {
      id: Date.now(),
      fecha,
      hora,
      paciente: nombreCompleto(pac),
      tratamiento: trat,
      odontologo: prof,
      sucursal: sede,
      gabinete: "",
      estado: "Pendiente",
      notas: "Agendado por Esther",
      duracion,
    };
    setTurnosStore((prev) => [...prev, nuevo]);
    const tel = numeroWhatsApp(pac.telefono ? telefonoInternacional(pac.telefono) : null);
    return {
      texto: `Listo: agendé a ${nombreCompleto(pac)} ${diaLindo(fecha)} a las ${hora}${prof ? ` con ${prof}` : ""}. Ya está en la Agenda.`,
      bloques: [
        ...(tel
          ? [
              {
                tipo: "envios" as const,
                items: [
                  {
                    accionId: registrarAccion(() => {
                      abrirRecordatorioWhatsApp(nuevo, nombreClinica());
                      return { texto: `Se abrió WhatsApp con el aviso para ${pac.nombre}. Tocá «Enviar» ahí.` };
                    }),
                    texto: `Avisarle a ${pac.nombre} por WhatsApp`,
                  },
                ],
              },
            ]
          : []),
        { tipo: "acciones" as const, items: [{ label: "Ver en la Agenda", to: "/demo/agenda" }] },
      ],
    };
  });
  return {
    texto: `Te preparo este turno. ¿Lo agendo?`,
    bloques: [
      {
        tipo: "confirmar",
        accionId,
        titulo: "Nuevo turno",
        lineas: [
          `Paciente: ${nombreCompleto(pac)}`,
          `Día: ${diaLindo(fecha)} (${fecha.split("-").reverse().join("/")})`,
          `Hora: ${hora} · ${duracion} min`,
          `Profesional: ${prof || "sin asignar"}`,
          `Tratamiento: ${trat}`,
          ...(sucursalesDelPlan(ctx.plan).length > 1 && sede ? [`Sede: ${sede}`] : []),
        ],
        boton: "Sí, agendalo",
        ...(avisos.length ? { aviso: avisos.join(" ") } : {}),
      },
    ],
    modulo: "agenda",
    resultado: "Respondida",
    sinIA: true,
  };
}

function accionRecordatorios(q: string, ctx: ContextoIA): RespuestaEsther | null {
  if (!/(manda|envia|recorda)(le|les|r|me)?\b.*(recordatorio|turno)|recordatorios?\b.*(manana|hoy)|recordale(s)? (el|los|a)/.test(q)) return null;
  if (/debe|deuda|saldo|pag/.test(q)) return null;
  const b = verificar("agenda", ctx) ?? cargando(["agenda", "pacientes"], "la agenda");
  if (b) return b;
  const fecha = /\bhoy\b/.test(q) ? dia() : (fechaPedida(q) ?? dia(1));
  const pac = pacienteMencionado(q, ctx);
  const turnos = turnosVisibles(ctx)
    .filter(
      (t) =>
        t.fecha === fecha &&
        (t.estado === "Pendiente" || t.estado === "Confirmada") &&
        (!pac || t.paciente === nombreCompleto(pac)),
    )
    .sort((a, c) => a.hora.localeCompare(c.hora));
  const sinConfirmar = turnos.filter((t) => t.estado !== "Confirmada" && !t.respuestaPaciente);
  const lista = (pac ? turnos : sinConfirmar).filter((t) => !noQuiereRecordatorios(t.paciente));
  const noQuieren = (pac ? turnos : sinConfirmar).length - lista.length;
  if (!lista.length)
    return {
      texto: turnos.length
        ? `Los turnos de ${diaLindo(fecha)} ya están confirmados${noQuieren ? ` (o el paciente pidió no recibir recordatorios)` : ""}. No hace falta mandar nada.`
        : `No hay turnos ${diaLindo(fecha)}${pac ? ` para ${nombreCompleto(pac)}` : ""}.`,
      modulo: "agenda",
      resultado: "Sin datos",
      sinIA: true,
    };
  const clinica = nombreClinica();
  return {
    texto: `${lista.length === 1 ? "Hay 1 turno" : `Hay ${lista.length} turnos`} ${diaLindo(fecha)} para recordar. Tocá «Mandar» en cada uno: se abre WhatsApp con el mensaje y el enlace para confirmar, y vos tocás «Enviar».${noQuieren ? ` (${noQuieren} ${noQuieren === 1 ? "paciente pidió" : "pacientes pidieron"} no recibir recordatorios.)` : ""}`,
    bloques: [
      {
        tipo: "envios",
        titulo: `Recordatorios de ${diaLindo(fecha)}`,
        items: lista.map((t) => ({
          accionId: registrarAccion(() => {
            if (!abrirRecordatorioWhatsApp(t, clinica))
              return { texto: `${t.paciente} no tiene teléfono cargado. Agregalo en su ficha de Pacientes.` };
            setComunicacion("recordatorios", (prev) => ({
              ...prev,
              [t.id]: { estado: "Enviado", fecha: new Date().toISOString(), canal: "WhatsApp" },
            }));
            return { texto: `Se abrió WhatsApp para ${t.paciente}. Tocá «Enviar» ahí.` };
          }),
          texto: t.paciente,
          detalle: `${t.hora}${t.odontologo ? ` · ${t.odontologo}` : ""}`,
        })),
      },
    ],
    modulo: "agenda",
    resultado: "Respondida",
    sinIA: true,
  };
}

function accionCobrar(q: string, ctx: ContextoIA): RespuestaEsther | null {
  if (!/(recorda|reclama|cobra|manda|avisa)(le|les|r)?\b.*(debe|deuda|saldo|pagar|pague)/.test(q)) return null;
  const b = verificar("facturacion", ctx) ?? cargando(["registros", "pacientes"], "las cuentas de los pacientes");
  if (b) return b;
  const regs = leerRegistros();
  const pac = pacienteMencionado(q, ctx);
  const deben = (pac ? [pac] : pacientesVisibles(ctx))
    .map((p) => ({ p, saldo: deudaDe(regs[p.id]?.cuenta).saldo }))
    .filter((x) => x.saldo > 0)
    .sort((a, c) => c.saldo - a.saldo);
  if (!deben.length)
    return {
      texto: pac ? `${nombreCompleto(pac)} no debe nada: su cuenta está al día.` : "Nadie debe nada: no hay a quién recordarle.",
      modulo: "facturacion",
      resultado: "Sin datos",
      sinIA: true,
    };
  const clinica = nombreClinica();
  return {
    texto: `${deben.length === 1 ? `${nombreCompleto(deben[0]!.p)} debe ${$(deben[0]!.saldo)}` : `Te deben ${deben.length} pacientes`}. Tocá «Mandar»: se abre WhatsApp con el saldo y el enlace para pagar, y vos tocás «Enviar».`,
    bloques: [
      {
        tipo: "envios",
        titulo: "Recordatorios de pago",
        items: deben.slice(0, 30).map((x) => ({
          accionId: registrarAccion(() => {
            const numero = numeroWhatsApp(x.p.telefono ? telefonoInternacional(x.p.telefono) : null);
            if (!numero) return { texto: `${nombreCompleto(x.p)} no tiene teléfono cargado. Agregalo en su ficha de Pacientes.` };
            abrirWhatsAppConEnlacePago(numero, x.p.id, (enlace) =>
              `Hola ${x.p.nombre} 👋 ¿Cómo estás? Te escribimos de ${clinica} para recordarte que te queda un saldo de ${$(x.saldo)}.${enlace ? ` Acá ves cómo pagarlo y nos avisás cuando lo hagas:\n${enlace}` : " Cuando puedas, lo abonás en la clínica o por transferencia."}\nSi ya lo pagaste, avisanos y lo revisamos. ¡Gracias!`,
            );
            setFacturacion("recordatoriosDeuda", (prev) => ({ ...(prev ?? {}), [String(x.p.id)]: dia() }));
            return { texto: `Se abrió WhatsApp para ${x.p.nombre}. Tocá «Enviar» ahí.` };
          }),
          texto: nombreCompleto(x.p),
          detalle: `Debe ${$(x.saldo)}`,
        })),
      },
    ],
    modulo: "facturacion",
    resultado: "Respondida",
    sinIA: true,
  };
}

/* ───────────── Ayuda ───────────── */

export const EJEMPLOS = [
  "¿Cuántos turnos tenemos mañana?",
  "¿Quién me debe?",
  "¿Cuánto cobramos este mes?",
  "¿Cuánto gastamos este mes?",
  "¿Cómo está la caja?",
  "¿Cuántos presupuestos pendientes hay?",
  "¿Qué trabajos hay en el laboratorio?",
  "Pacientes que no regresaron",
];

function ayuda(ctx: ContextoIA, pregunta: string, intro = false): RespuestaEsther {
  return {
    texto: `${intro ? "Puedo ayudarte con los datos de la clínica." : `No tengo una respuesta para "${pregunta}" y prefiero no inventar.`} Sé de pacientes, agenda, turnos online, presupuestos, tratamientos, cobros y deudas, caja, gastos, recetas, laboratorio, inventario y equipo. Probá con alguna de estas:`,
    bloques: [
      { tipo: "acciones", items: EJEMPLOS.map((e) => ({ label: e, pregunta: e })) },
      ...(ctx.pacienteId
        ? []
        : [
            {
              tipo: "aviso" as const,
              texto: "Para analizar a un paciente, elegilo arriba o nombralo en la pregunta.",
            },
          ]),
    ],
    modulo: "general",
    resultado: "Sin datos",
  };
}

/* ───────────── Entrada principal ───────────── */

/** Rol de quien pregunta: en una clínica real, el de su sesión (no se puede elegir otro). */
export function rolDeQuienPregunta(pedido: RolIA | undefined): RolIA {
  return clinicaReal()?.sesion.usuario.rol ?? pedido ?? "admin";
}

export function responder(pregunta: string, ctxPedido: ContextoIA, interno = false): RespuestaEsther {
  const ctx: ContextoIA = { ...ctxPedido, rol: rolDeQuienPregunta(ctxPedido.rol) };
  const q = norm(pregunta.replace(/^\s*esther[,:]?\s*/i, ""));
  // Primero lo que Esther tiene que HACER (con confirmación), después las consultas
  for (const f of [accionCobrar, accionRecordatorios, accionAgendar]) {
    const r = f(q, ctx);
    if (r) return r;
  }
  if (!interno) {
    const r = reporte(q, ctx);
    if (r) return r;
  }
  const pac = pacienteMencionado(q, ctx);
  if (pac) {
    const b = verificar("pacientes", ctx);
    return b ?? analizarPaciente(pac, q, ctx);
  }
  if (
    !ctx.pacienteId &&
    /analiza(r)? (el |este |al )?paciente|resum(ir|e|en) (la )?historia|antes de la consulta|revisa(r)? (el )?odontograma/.test(
      q,
    )
  )
    return {
      texto:
        "¿De qué paciente? Elegilo en el selector de arriba o nombralo en la pregunta (por ejemplo: «Analizá a Mauro Pinto»).",
      bloques: [
        {
          tipo: "acciones",
          items: pacientesVisibles(ctx)
            .slice(0, 6)
            .map((p) => ({
              label: nombreCompleto(p),
              pregunta: `Analizá a ${nombreCompleto(p)} antes de la consulta`,
            })),
        },
      ],
      modulo: "pacientes",
      resultado: "Sin datos",
    };
  if (
    /^(hola|buen(os|as)?\b|gracias|muchas gracias|chau|adios|que tal|como estas|esther$)/.test(q)
  ) {
    const despedida = /^(gracias|muchas gracias|chau|adios)/.test(q);
    return {
      texto: despedida
        ? "¡De nada! Cuando necesites algo, acá estoy."
        : `¡Hola${ctx.usuario ? ` ${ctx.usuario.split(" ")[0]}` : ""}! ¿Qué necesitás? Puedo revisar la agenda, analizar un paciente, preparar un informe o consultar presupuestos y facturación.`,
      bloques: despedida
        ? []
        : [
            {
              tipo: "acciones",
              items: [
                { label: "Turnos de hoy", pregunta: "¿Qué turnos hay hoy?" },
                { label: "Revisar pendientes", pregunta: "Revisar pendientes" },
                { label: "¿Qué puedo consultarte?", pregunta: "¿Qué puedo consultarte?" },
              ],
            },
          ],
      modulo: "ayuda",
      resultado: "Respondida",
    };
  }
  if (/que puedo|ayuda|que sabes|que podes/.test(q)) return ayuda(ctx, pregunta, true);
  if (!pac && /informe|reporte/.test(q))
    return {
      texto: "¿Qué reporte querés? Elegí uno o pedímelo con tus palabras.",
      bloques: [
        {
          tipo: "acciones",
          items: [
            "presupuestos pendientes",
            "facturación del mes",
            "turnos cancelados",
            "pacientes inactivos",
            "tratamientos pendientes",
            "productividad",
            "inventario",
          ].map((t) => ({ label: `Reporte de ${t}`, pregunta: `Preparame un reporte de ${t}` })),
        },
      ],
      modulo: "bi",
      resultado: "Sin datos",
    };
  for (const f of [
    pendientes,
    equipo,
    portal,
    clinicas,
    deudores,
    caja,
    finanzas,
    recetas,
    laboratorio,
    turnosOnline,
    tratamientosPendientes,
    presupuestos,
    facturacion,
    inventario,
    turnos,
    pacientesConsulta,
    aLaPantalla,
  ]) {
    const r = f(q, ctx);
    if (r) return r;
  }
  return ayuda(ctx, pregunta);
}

export const SEDES_BASE = SUCURSALES;
