/* Ubicación: src/lib/cloud-esther/esther-motor.ts
   Motor de Cloud Esther IA: entiende preguntas en lenguaje natural, verifica plan, rol y sede,
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
  | { tipo: "aviso"; texto: string };

export type RespuestaEsther = {
  texto: string;
  bloques?: Bloque[];
  modulo: string;
  resultado: "Respondida" | "Sin permiso" | "Fuera del plan" | "Sin datos";
};

export type ContextoIA = {
  plan: PlanId;
  rol: RolIA;
  sede: string; // "Todas" o una sede
  usuario: string;
  pacienteId?: number | undefined;
  seccion?: string | undefined;
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
  const permitidos = PERMISOS_ROL[ctx.rol];
  if (!permitidos.includes("*") && !permitidos.includes(modulo))
    return {
      texto: `Con el rol ${ROL_IA_LABEL[ctx.rol]} no tenés permiso para consultar ${NOMBRE_MODULO[modulo] ?? modulo}. Pedíselo a un administrador.`,
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
  const todas = sucursalesDelPlan(ctx.plan === "grupo");
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
  return storeAgenda.leer().turnos.filter((t) => sedes.includes(t.sucursal));
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
    const raw = window.localStorage.getItem(`cloud-esther:odontograma3d:${clave}`);
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
      texto: `${con.length} persona${con.length === 1 ? "" : "s"} activa${con.length === 1 ? "" : "s"} tiene${con.length === 1 ? "" : "n"} acceso a ${acceso[2]}.`,
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
  const accesos = storePortal.leer().accesos;
  const pacs = pacientesVisibles(ctx);
  const filas = Object.entries(accesos)
    .map(([id, a]) => ({ p: pacs.find((x) => x.id === Number(id)), a }))
    .filter((x) => x.p);
  const activos = filas.filter((x) => x.a.estado === "Activo");
  return {
    texto: `${activos.length} paciente${activos.length === 1 ? "" : "s"} tiene${activos.length === 1 ? "" : "n"} acceso activo al portal; ${(() => {
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
  const sedes = sucursalesDelPlan(ctx.plan === "grupo");
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
  const b = verificar("agenda", ctx);
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
      ? `${lista.length} cita${lista.length === 1 ? "" : "s"} ${estado === "Cancelada" ? "cancelada" : "con ausente"}${lista.length === 1 ? "" : "s"} ${p.nombre}.`
      : `Hay ${lista.length} cita${lista.length === 1 ? "" : "s"} ${p.nombre}${ctx.sede !== "Todas" ? ` en ${ctx.sede}` : ""}.`,
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
  const b = verificar("pacientes", ctx);
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
      texto: `${lista.length} paciente${lista.length === 1 ? "" : "s"} no tiene${lista.length === 1 ? "" : "n"} un turno próximo agendado (o están inactivos). Son candidatos para recontactar.`,
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
  const b = verificar("presupuestos", ctx);
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
      : `Hay ${lista.length} presupuesto${lista.length === 1 ? "" : "s"} ${estado} (${pacientesUnicos} paciente${pacientesUnicos === 1 ? "" : "s"}) por ${$(monto)}.`,
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
  const b = verificar("facturacion", ctx);
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
  const cobrado = comps
    .flatMap((c) => c.pagos)
    .filter((p) => enPeriodo(p.fecha, per))
    .reduce((a, p) => a + p.monto, 0);
  const porCobrar = comps.reduce((a, c) => a + saldo(c), 0);
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
    texto: `${per.nombre.charAt(0).toUpperCase() + per.nombre.slice(1)} se facturaron ${$(facturado)} en ${delPer.length} comprobantes y se cobraron ${$(cobrado)}. Quedan ${$(porCobrar)} por cobrar${vencido ? `, ${$(vencido)} vencidos` : ""}.`,
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
      { tipo: "acciones", items: [{ label: "Ir a Facturación", to: "/demo/facturacion" }] },
    ],
    modulo: "facturacion",
    resultado: "Respondida",
  };
}

function tratamientosPendientes(q: string, ctx: ContextoIA): RespuestaEsther | null {
  if (!/tratamientos?/.test(q) || !/pendiente|en curso|planificad|abierto/.test(q)) return null;
  const b = verificar("tratamientos", ctx);
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
    texto: `Hay ${filas.length} tratamiento${filas.length === 1 ? "" : "s"} pendiente${filas.length === 1 ? "" : "s"} en ${new Set(filas.map((x) => x.p.id)).size} paciente${new Set(filas.map((x) => x.p.id)).size === 1 ? "" : "s"}.`,
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
  const b = verificar("inventario", ctx);
  if (b) return b;
  const sedes = sedesVisibles(ctx);
  const ins = storeInventario.leer().insumos.filter((i) => sedes.includes(i.sucursal));
  const bajos = ins.filter((i) => nivelStock(i) === "Bajo" || nivelStock(i) === "Agotado");
  return {
    texto: `${bajos.length} insumo${bajos.length === 1 ? "" : "s"} con stock bajo o agotado de ${ins.length} en total.`,
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
    [/cancelac/, "citas canceladas este mes"],
    [/inactiv|no regres/, "pacientes que no regresaron"],
    [/factur|cobr/, "facturación de este mes"],
    [/tratamiento/, "tratamientos pendientes"],
    [/inventario|stock/, "stock bajo de inventario"],
    [/agenda|turno|cita/, "citas de esta semana"],
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
      texto: `${t.length} citas hoy, ${sinConf.length} sin confirmar`,
      detalle: sinConf.map((x) => `${x.hora} ${x.paciente}`).join(" · "),
      tono: sinConf.length ? "alerta" : "ok",
    });
    acciones.push({ label: "Citas de mañana", pregunta: "¿Cuántas citas tenemos mañana?" });
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

/* ───────────── Ayuda ───────────── */

export const EJEMPLOS = [
  "¿Cuántos pacientes tenemos?",
  "¿Cuántas citas tenemos mañana?",
  "¿Cuántos presupuestos pendientes hay?",
  "¿Cuánto facturamos este mes?",
  "¿Quién tiene acceso al módulo de facturación?",
  "¿Qué tratamientos están pendientes?",
  "Prepárame un reporte de los presupuestos pendientes",
  "Pacientes que no regresaron",
];

function ayuda(ctx: ContextoIA, pregunta: string, intro = false): RespuestaEsther {
  return {
    texto: `${intro ? "Puedo ayudarte con los datos de la clínica." : `No encontré datos para "${pregunta}" y prefiero no inventar.`} Puedo responder sobre pacientes, agenda, presupuestos, tratamientos, facturación, inventario, usuarios y accesos, y preparar reportes. Probá con alguna de estas:`,
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

export function responder(pregunta: string, ctx: ContextoIA, interno = false): RespuestaEsther {
  const q = norm(pregunta.replace(/^\s*esther[,:]?\s*/i, ""));
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
            "citas canceladas",
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
    tratamientosPendientes,
    presupuestos,
    facturacion,
    inventario,
    turnos,
    pacientesConsulta,
  ]) {
    const r = f(q, ctx);
    if (r) return r;
  }
  return ayuda(ctx, pregunta);
}

export const SEDES_BASE = SUCURSALES;
