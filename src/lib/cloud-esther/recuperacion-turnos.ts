import {
  storeAgenda,
  type Espera,
  type Oferta,
  type Turno,
} from "@/lib/cloud-esther/agenda-store";

/* Ubicación: src/lib/cloud-esther/recuperacion-turnos.ts

   Motor de RECUPERACIÓN AUTOMÁTICA DE TURNOS. Cuando se cancela un turno:
   1) el horario queda libre, 2) se buscan pacientes compatibles en la lista de espera,
   3) se les crea una OFERTA con vencimiento, 4) el primero que acepta se queda con el turno,
   5) se lo saca de la lista y se cierran las ofertas del mismo horario (anti-doble reserva).

   Trabaja sobre el MISMO store de la agenda (storeAgenda), así funciona igual en el demo y en una
   clínica real (se sincroniza por clinic-data). El control de que dos no tomen el mismo horario es
   por re-chequeo al aceptar; el refuerzo server-side (transacción) queda como endurecimiento. */

/** Día de la semana (0=Dom … 6=Sáb) de una fecha "YYYY-MM-DD". */
function diaSemana(iso: string): number {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? -1 : d.getDay();
}

/** Franja de un horario "HH:MM". */
function franjaDe(hora: string): "Mañana" | "Tarde" {
  const h = parseInt(hora.slice(0, 2), 10);
  return Number.isFinite(h) && h < 13 ? "Mañana" : "Tarde";
}

type Horario = Pick<Turno, "fecha" | "hora" | "odontologo" | "sucursal">;

/** ¿La preferencia de la lista de espera encaja con el horario liberado? "" / vacío = cualquiera. */
function compatible(e: Espera, t: Horario): boolean {
  if (e.odontologo && e.odontologo !== t.odontologo) return false;
  if (e.sucursal && e.sucursal !== t.sucursal && e.sucursal.toLowerCase() !== "todas") return false;
  if (e.dias && e.dias.length > 0 && !e.dias.includes(diaSemana(t.fecha))) return false;
  // Franja tolerante: acepta "Mañana/Mañanas", "Tarde/Tardes"; "Hoy/Cualquiera/"" = sin restricción.
  const fr = (e.franja ?? "").toLowerCase();
  if (fr.startsWith("mañ") && franjaDe(t.hora) !== "Mañana") return false;
  if (fr.startsWith("tard") && franjaDe(t.hora) !== "Tarde") return false;
  return true;
}

/** Candidatos de la lista de espera para un horario liberado, ordenados (urgentes y más antiguos primero). */
export function candidatosEspera(t: Horario, espera: Espera[]): Espera[] {
  return espera
    .filter((e) => compatible(e, t))
    .sort((a, b) => {
      const pa = a.prioridad === "urgente" ? 0 : 1;
      const pb = b.prioridad === "urgente" ? 0 : 1;
      if (pa !== pb) return pa - pb;
      return (a.creada ?? "").localeCompare(b.creada ?? "");
    });
}

/** ¿El horario sigue libre? (no hay turno activo en esa fecha/hora/odontólogo). */
function horarioLibre(turnos: Turno[], t: Pick<Turno, "fecha" | "hora" | "odontologo">): boolean {
  return !turnos.some(
    (x) =>
      x.fecha === t.fecha &&
      x.hora === t.hora &&
      x.odontologo === t.odontologo &&
      x.estado !== "Cancelada",
  );
}

/** Al cancelar un turno: crea ofertas para los candidatos de la lista de espera.
    Devuelve a cuántos se les ofreció (0 si no hay lista compatible). */
export function recuperarTurno(
  turno: Turno,
  opts: { vigenciaMin?: number; canal?: string; maxOfertas?: number } = {},
): number {
  const est = storeAgenda.leer();
  const candis = candidatosEspera(turno, est.espera).slice(0, opts.maxOfertas ?? 3);
  if (!candis.length) return 0;
  const ahora = Date.now();
  const vence = new Date(ahora + (opts.vigenciaMin ?? 120) * 60000).toISOString();
  const nuevas: Oferta[] = candis.map((e, i) => ({
    id: ahora + i,
    fecha: turno.fecha,
    hora: turno.hora,
    odontologo: turno.odontologo,
    sucursal: turno.sucursal,
    tratamiento: turno.tratamiento,
    candidato: e.nombre,
    esperaId: e.id,
    telefono: e.telefono,
    estado: "ofrecida",
    canal: opts.canal ?? "Aviso interno",
    creada: new Date(ahora).toISOString(),
    vence,
  }));
  storeAgenda.poner({ ...est, ofertas: [...(est.ofertas ?? []), ...nuevas] });
  return nuevas.length;
}

/** El candidato acepta una oferta: reserva el turno (si sigue libre), lo saca de la lista de
    espera y cierra las demás ofertas del mismo horario (para que no lo tomen dos). */
export function aceptarOferta(ofertaId: number): { ok: boolean; motivo?: string } {
  const est = storeAgenda.leer();
  const ofertas = est.ofertas ?? [];
  const of = ofertas.find((o) => o.id === ofertaId);
  if (!of) return { ok: false, motivo: "La oferta ya no existe." };
  if (of.estado !== "ofrecida") return { ok: false, motivo: "La oferta ya no está disponible." };
  if (new Date(of.vence).getTime() < Date.now()) {
    storeAgenda.poner({
      ...est,
      ofertas: ofertas.map((o) => (o.id === ofertaId ? { ...o, estado: "vencida" } : o)),
    });
    return { ok: false, motivo: "La oferta venció." };
  }
  if (!horarioLibre(est.turnos, of)) {
    storeAgenda.poner({
      ...est,
      ofertas: ofertas.map((o) => (o.id === ofertaId ? { ...o, estado: "cancelada" } : o)),
    });
    return { ok: false, motivo: "Ese horario ya fue tomado por otra persona." };
  }
  const nuevoTurno: Turno = {
    id: Date.now(),
    fecha: of.fecha,
    hora: of.hora,
    paciente: of.candidato,
    tratamiento: of.tratamiento,
    odontologo: of.odontologo,
    sucursal: of.sucursal,
    gabinete: "",
    estado: "Confirmada",
    notas: "Turno recuperado desde la lista de espera",
  };
  storeAgenda.poner({
    ...est,
    turnos: [...est.turnos, nuevoTurno],
    espera: of.esperaId ? est.espera.filter((e) => e.id !== of.esperaId) : est.espera,
    ofertas: ofertas.map((o) => {
      if (o.id === ofertaId) return { ...o, estado: "aceptada" as const };
      // Cierra las otras ofertas vivas del mismo horario (anti-doble reserva).
      if (
        o.estado === "ofrecida" &&
        o.fecha === of.fecha &&
        o.hora === of.hora &&
        o.odontologo === of.odontologo
      )
        return { ...o, estado: "cancelada" as const };
      return o;
    }),
  });
  return { ok: true };
}

/** El candidato rechaza una oferta. */
export function rechazarOferta(ofertaId: number): void {
  const est = storeAgenda.leer();
  storeAgenda.poner({
    ...est,
    ofertas: (est.ofertas ?? []).map((o) =>
      o.id === ofertaId && o.estado === "ofrecida" ? { ...o, estado: "rechazada" } : o,
    ),
  });
}

/** Marca como vencidas las ofertas cuyo plazo pasó. Conviene llamarlo al abrir la agenda/portal. */
export function vencerOfertas(): void {
  const est = storeAgenda.leer();
  const ahora = Date.now();
  let cambio = false;
  const ofertas = (est.ofertas ?? []).map((o) => {
    if (o.estado === "ofrecida" && new Date(o.vence).getTime() < ahora) {
      cambio = true;
      return { ...o, estado: "vencida" as const };
    }
    return o;
  });
  if (cambio) storeAgenda.poner({ ...est, ofertas });
}

/** Ofertas vivas (vigentes) para un paciente, por nombre. */
export function ofertasPara(nombre: string, ofertas?: Oferta[]): Oferta[] {
  const lista = ofertas ?? storeAgenda.leer().ofertas ?? [];
  const ahora = Date.now();
  return lista.filter(
    (o) => o.candidato === nombre && o.estado === "ofrecida" && new Date(o.vence).getTime() >= ahora,
  );
}
