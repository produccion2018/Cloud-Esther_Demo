/* Ubicación: src/lib/cloud-esther/esther-conexiones.ts
   Con qué módulos está conectada Esther en el plan actual (con un dato vivo de cada uno) y
   qué detecta por su cuenta. Lee solo la empresa activa y solo lo que el plan incluye.
   n8n aparece únicamente en Enterprise o con el módulo adicional de Automatizaciones. */

import { MODULES, availableIn, type PlanId } from "@/lib/cloud-esther/data";
import { storeAgenda } from "@/lib/cloud-esther/agenda-store";
import { leerPacientes } from "@/lib/cloud-esther/pacientes";
import { leerRegistros } from "@/components/cloud-esther/PacienteSecciones";
import { estadoComprobante, storeFacturacion } from "@/lib/cloud-esther/facturacion-store";
import { nivelStock, storeInventario } from "@/lib/cloud-esther/inventario-store";
import { storeEquipo } from "@/lib/cloud-esther/equipo-store";
import { storeIA } from "@/lib/cloud-esther/ia-store";
import { storeN8n } from "@/lib/cloud-esther/n8n-store";

export type Conexion = {
  id: string;
  nombre: string;
  dato: string;
  pregunta?: string;
  to?: string;
  alerta?: boolean;
};

export type Hallazgo = {
  texto: string;
  detalle: string;
  pregunta: string;
  tono: "alerta" | "info";
};

const hoy = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const pl = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

export function conexionesEsther(plan: PlanId, conN8n: boolean): Conexion[] {
  const incluye = (id: string) => {
    const m = MODULES.find((x) => x.id === id);
    return m ? availableIn(m, plan) : false;
  };
  const pacientes = leerPacientes();
  const regs = leerRegistros();
  const turnosHoy = storeAgenda
    .leer()
    .turnos.filter((t) => t.fecha === hoy() && t.estado !== "Cancelada");
  const enviados = pacientes.flatMap((p) =>
    (regs[p.id]?.presupuestos ?? []).filter((x) => x.estado === "Enviado"),
  );
  const vencidas = storeFacturacion
    .leer()
    .comprobantes.filter((c) => estadoComprobante(c) === "Vencida");
  const bajo = storeInventario
    .leer()
    .insumos.filter((i) => ["Bajo", "Agotado"].includes(nivelStock(i)));
  const equipo = storeEquipo.leer().miembros;
  const conv = storeIA.leer().conversaciones;
  const conHallazgos = pacientes.filter((p) => (regs[p.id]?.tratamientos ?? []).length > 0).length;

  const lista: (Conexion & { modulo: string })[] = [
    {
      modulo: "pacientes",
      id: "pacientes",
      nombre: "Pacientes",
      dato: pl(pacientes.filter((p) => p.estado === "Activo").length, "activo", "activos"),
      pregunta: "¿Cuántos pacientes activos tenemos?",
    },
    {
      modulo: "agenda",
      id: "agenda",
      nombre: "Agenda",
      dato: pl(turnosHoy.length, "turno hoy", "turnos hoy"),
      pregunta: "¿Qué turnos hay hoy?",
    },
    {
      modulo: "historia",
      id: "historia",
      nombre: "Historia clínica",
      dato: pl(conHallazgos, "ficha con datos", "fichas con datos"),
      pregunta: "Resumí la historia clínica del paciente",
    },
    {
      modulo: "odontograma3d",
      id: "odontograma3d",
      nombre: "Odontograma 3D",
      dato: "pieza por pieza",
      pregunta: "Revisá el odontograma del paciente",
    },
    {
      modulo: "tratamientos",
      id: "tratamientos",
      nombre: "Tratamientos",
      dato: "planificados y en curso",
      pregunta: "¿Qué tratamientos están pendientes?",
    },
    {
      modulo: "presupuestos",
      id: "presupuestos",
      nombre: "Presupuestos",
      dato: pl(enviados.length, "sin respuesta", "sin respuesta"),
      pregunta: "¿Cuántos presupuestos pendientes hay?",
      alerta: enviados.length > 0,
    },
    {
      modulo: "facturacion",
      id: "facturacion",
      nombre: "Facturación",
      dato: pl(vencidas.length, "factura vencida", "facturas vencidas"),
      pregunta: "¿Qué facturas están vencidas?",
      alerta: vencidas.length > 0,
    },
    {
      modulo: "inventario",
      id: "inventario",
      nombre: "Inventario",
      dato: pl(bajo.length, "insumo bajo", "insumos bajos"),
      pregunta: "¿Qué insumos tienen stock bajo?",
      alerta: bajo.length > 0,
    },
    {
      modulo: "equipo",
      id: "equipo",
      nombre: "Equipo y accesos",
      dato: pl(equipo.length, "integrante", "integrantes"),
      pregunta: "¿Quiénes tienen acceso al sistema?",
    },
    {
      modulo: "portal-paciente",
      id: "portal",
      nombre: "Portal del paciente",
      dato: "accesos y uso",
      pregunta: "¿Cuántos pacientes usan el portal?",
    },
    {
      modulo: "ia",
      id: "contact",
      nombre: "Contact Center",
      dato: pl(
        conv.filter((c) => c.estado === "Derivada a humano").length,
        "derivada",
        "derivadas",
      ),
    },
  ];
  const visibles: Conexion[] = lista
    .filter((c) => incluye(c.modulo))
    .map(({ modulo: _m, ...c }) => c);
  if (conN8n) {
    const n8n = storeN8n.leer();
    visibles.push({
      id: "n8n",
      nombre: "n8n · Automatizaciones",
      dato: pl(n8n.flujos.filter((f) => f.activo).length, "flujo activo", "flujos activos"),
      to: "/demo/automatizaciones",
    });
  }
  return visibles;
}

/** Lo que Esther detecta sin que se lo pregunten (máximo 3). */
export function hallazgosEsther(plan: PlanId): Hallazgo[] {
  const incluye = (id: string) => {
    const m = MODULES.find((x) => x.id === id);
    return m ? availableIn(m, plan) : false;
  };
  const out: Hallazgo[] = [];
  const pacientes = leerPacientes();
  const regs = leerRegistros();
  if (incluye("presupuestos")) {
    const env = pacientes.flatMap((p) =>
      (regs[p.id]?.presupuestos ?? []).filter((x) => x.estado === "Enviado"),
    );
    if (env.length)
      out.push({
        texto: pl(env.length, "presupuesto espera respuesta", "presupuestos esperan respuesta"),
        detalle: "Un seguimiento a tiempo sube la aceptación.",
        pregunta: "¿Cuántos presupuestos pendientes hay?",
        tono: "alerta",
      });
  }
  const man = new Date();
  man.setDate(man.getDate() + 1);
  const isoMan = `${man.getFullYear()}-${String(man.getMonth() + 1).padStart(2, "0")}-${String(man.getDate()).padStart(2, "0")}`;
  const sinConfirmar = storeAgenda
    .leer()
    .turnos.filter((t) => t.fecha === isoMan && t.estado === "Pendiente");
  if (sinConfirmar.length)
    out.push({
      texto: pl(
        sinConfirmar.length,
        "turno de mañana sin confirmar",
        "turnos de mañana sin confirmar",
      ),
      detalle: "Conviene confirmarlos hoy para evitar ausencias.",
      pregunta: "¿Qué turnos hay mañana?",
      tono: "alerta",
    });
  if (incluye("facturacion")) {
    const v = storeFacturacion
      .leer()
      .comprobantes.filter((c) => estadoComprobante(c) === "Vencida");
    if (v.length)
      out.push({
        texto: pl(v.length, "factura vencida", "facturas vencidas"),
        detalle: "Revisá la cobranza de este mes.",
        pregunta: "¿Qué facturas están vencidas?",
        tono: "alerta",
      });
  }
  const inactivos = pacientes.filter((p) => p.estado === "Inactivo").length;
  if (inactivos)
    out.push({
      texto: pl(inactivos, "paciente inactivo", "pacientes inactivos"),
      detalle: "Podés invitarlos a un control.",
      pregunta: "Pacientes que no regresaron",
      tono: "info",
    });
  return out.slice(0, 3);
}
