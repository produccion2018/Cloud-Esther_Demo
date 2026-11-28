import { storeFacturacion, numeroComprobante } from "@/lib/cloud-esther/facturacion-store";
import { storeAgenda } from "@/lib/cloud-esther/agenda-store";
import { leerPacientes } from "@/lib/cloud-esther/pacientes";
import { storeFinanzas } from "@/lib/cloud-esther/finanzas-store";
import { setProduccionAutomatica } from "@/lib/cloud-esther/rrhh-store";
import { leerRegistros } from "@/components/cloud-esther/PacienteSecciones";

/* Ubicación: src/components/cloud-esther/finanzas/comisiones.ts
   COMISIONES SOLAS: lo que cobró cada profesional en el período, con el detalle cobro por cobro
   (comprobantes y cuenta corriente: «Cobrar hoy», señas, «ya pagué»), y el laboratorio de sus
   trabajos. Lo usan Finanzas → Rentabilidad (liquidar y recibo) y RRHH → Nómina (producción
   automática de quien cobra por comisión o mixto). Mismo criterio que Rentabilidad. */

export type CobroProfesional = { fecha: string; paciente: string; concepto: string; monto: number };
export type ProduccionProfesional = { cobrado: number; lab: number; lineas: CobroProfesional[] };

const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

/** Lo cobrado por profesional en esos meses («2026-11»…), con cada cobro. */
export function produccionPorProfesional(meses: string[]): Map<string, ProduccionProfesional> {
  const enPeriodo = (f: string) => meses.some((m) => f.startsWith(m));
  const out = new Map<string, ProduccionProfesional>();
  const de = (k: string) => {
    let f = out.get(norm(k));
    if (!f) out.set(norm(k), (f = { cobrado: 0, lab: 0, lineas: [] }));
    return f;
  };
  const { comprobantes } = storeFacturacion.leer();
  const pacientes = leerPacientes();
  const nombrePac = (id: number | null | undefined) => {
    const p = pacientes.find((x) => x.id === id);
    return p ? `${p.nombre} ${p.apellido}`.trim() : "";
  };
  // 1) Cobros de comprobantes
  for (const c of comprobantes) {
    if (c.anulada || !c.profesional) continue;
    for (const p of c.pagos) {
      if (!enPeriodo(p.fecha) || !(p.monto > 0)) continue;
      const f = de(c.profesional);
      f.cobrado += p.monto;
      f.lineas.push({ fecha: p.fecha, paciente: c.cliente.nombre || nombrePac(c.pacienteId), concepto: `${c.tipo} ${numeroComprobante(c)}`, monto: p.monto });
    }
  }
  // 2) Cobros de la cuenta corriente, por su turno o su presupuesto
  const deComprobante = new Set(comprobantes.map((c) => `Cobro ${c.tipo} ${numeroComprobante(c)}`));
  const turnos = new Map(storeAgenda.leer().turnos.map((t) => [t.id, t]));
  for (const [pid, r] of Object.entries(leerRegistros())) {
    for (const m of r?.cuenta ?? []) {
      if (m.tipo !== "Pago" || m.medio === "Obra social" || !enPeriodo(m.fecha) || deComprobante.has(m.concepto)) continue;
      const t = m.turnoId ? turnos.get(m.turnoId) : undefined;
      const pr = m.presupuestoId ? r.presupuestos.find((x) => x.id === m.presupuestoId) : undefined;
      const prof = t?.odontologo || pr?.profesional || "";
      if (!prof) continue;
      const f = de(prof);
      f.cobrado += m.monto;
      f.lineas.push({ fecha: m.fecha, paciente: nombrePac(Number(pid)), concepto: t ? t.tratamiento : m.concepto, monto: m.monto });
    }
    // 3) Laboratorio de sus trabajos (para «comisión sobre lo cobrado menos laboratorio»)
    for (const l of r?.laboratorio ?? []) {
      if (!(l.costo > 0) || !l.profesional || !["Entregado", "Listo para retirar"].includes(l.estado)) continue;
      if (!enPeriodo(l.fechaEntregaEstimada || l.fechaEnvio)) continue;
      de(l.profesional).lab += l.costo;
    }
  }
  for (const f of out.values()) f.lineas.sort((a, b) => a.fecha.localeCompare(b.fecha));
  return out;
}

/** Sobre qué se calcula la comisión (lo elige la clínica en Finanzas → Rentabilidad). */
export function baseComision(p: Pick<ProduccionProfesional, "cobrado" | "lab">) {
  return Math.max(0, p.cobrado - (storeFinanzas.leer().comisionSinLab ? p.lab : 0));
}

export function produccionDe(nombre: string, mes: string): ProduccionProfesional {
  return produccionPorProfesional([mes]).get(norm(nombre)) ?? { cobrado: 0, lab: 0, lineas: [] };
}

// Nómina: quien cobra por comisión o mixto toma solo su producción del mes (si no la cargaron a mano)
setProduccionAutomatica((m, periodo) => baseComision(produccionDe(`${m.firstName} ${m.lastName}`, periodo)));
