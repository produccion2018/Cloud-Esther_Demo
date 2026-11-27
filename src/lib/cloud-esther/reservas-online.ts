import type { PlanId } from "@/lib/cloud-esther/data";
import type { ConfigReservaOnline, EstadoAgenda } from "@/lib/cloud-esther/agenda-store";
import type { TeamMember } from "@/lib/cloud-esther/equipo-profesional-data";
import type { Ausencia } from "@/lib/cloud-esther/equipo-store";
import { API_URL } from "@/lib/clinica/api";
import { storeModulosExtra } from "@/lib/cloud-esther/modulos-extra-store";

/* Ubicación: src/lib/cloud-esther/reservas-online.ts
   PÁGINA PÚBLICA DE TURNOS de cada clínica (/turnos/<clínica>).
   Por plan:
   - Start: la página muestra la clínica, el equipo y el botón de WhatsApp (sin reservar online).
   - Pro:   el paciente reserva solo; el turno queda «Pendiente» y la clínica lo confirma.
   - Plus:  además, la clínica puede elegir que se confirme solo.
   - Grupo: además, el paciente elige la sede.
   En una clínica real todo pasa por el servidor; en el demo se calcula con los datos del navegador
   (mismo criterio que el servidor: horario, descanso, ausencias, turnos, bloqueos y feriados). */

export type NivelReserva = "start" | "pro" | "plus" | "grupo";

export const nivelReserva = (plan: PlanId | undefined): NivelReserva =>
  plan === "grupo" ? "grupo" : plan === "avanzada" ? "plus" : plan === "profesional" ? "pro" : "start";

/** Nivel de la página según el plan; un Start que compró «Turnos online» reserva como Pro. */
export function useNivelReserva(plan: PlanId | undefined): { nivel: NivelReserva; porAdicional: boolean } {
  const extra = storeModulosExtra.usar().activos.some((a) => a.id === "turnos-online");
  const base = nivelReserva(plan);
  return base === "start" && extra ? { nivel: "pro", porAdicional: true } : { nivel: base, porAdicional: false };
}

export const RESERVA_POR_DEFECTO: ConfigReservaOnline = {
  activa: false,
  tratamientos: ["Primera consulta", "Control", "Limpieza dental"],
  diasAdelante: 30,
  horasAnticipacion: 2,
  confirmarSolo: false,
  bienvenida: "",
  mostrarEquipo: true,
};

export const configReserva = (c?: Partial<ConfigReservaOnline>): ConfigReservaOnline => ({
  ...RESERVA_POR_DEFECTO,
  ...(c ?? {}),
  tratamientos: c?.tratamientos?.length ? c.tratamientos : RESERVA_POR_DEFECTO.tratamientos,
});

/** Lo que la página pública necesita de la clínica (igual en el demo y en el servidor) */
export type InfoReserva = {
  clinica: string;
  pais: string;
  direccion: string;
  telefono: string;
  email: string;
  logo: string;
  color: string;
  plan: NivelReserva;
  reservaOnline: boolean;
  bienvenida: string;
  tratamientos: string[];
  duracion: number;
  diasAdelante: number;
  confirmaSolo: boolean;
  sedes: string[];
  profesionales: { id: string; nombre: string; especialidades: string[]; foto: string; bio: string }[];
};
export type Libre = { fecha: string; hora: string; profesionalId: string };
export type DatosReserva = {
  nombre: string;
  telefono: string;
  email?: string;
  tratamiento: string;
  profesionalId?: string;
  sede?: string;
  fecha: string;
  hora: string;
  web?: string;
};
export type ResultadoReserva = { ok: true; estado: string; profesional: string; sede: string; enlace?: string };

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const aMin = (h: string) => {
  const [a = 0, b = 0] = (h ?? "").split(":").map(Number);
  return a * 60 + b;
};
const aHora = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const isoLocal = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const visibleEnReserva = (m: TeamMember) => m.role === "odontologo" && m.status === "activo" && m.mostrarEnPortal !== false;

/** Horarios libres (demo, con los datos del navegador). */
export function libresLocales(o: {
  agenda: EstadoAgenda;
  miembros: TeamMember[];
  ausencias: Ausencia[];
  profesionalId?: string;
  ahora?: Date;
}): Libre[] {
  const config = configReserva(o.agenda.ajustes?.reservaOnline);
  const intervalo = Math.min(240, Math.max(5, Math.round(o.agenda.ajustes?.intervaloMin ?? 30)));
  const duracion = Math.min(480, Math.max(5, Math.round(o.agenda.ajustes?.duracionMin ?? intervalo)));
  const ahora = o.ahora ?? new Date();
  const ahoraMin = ahora.getHours() * 60 + ahora.getMinutes();
  const desdeMin = ahoraMin + config.horasAnticipacion * 60;
  const turnos = o.agenda.turnos.filter((t) => t.estado !== "Cancelada");
  const feriados = new Set((o.agenda.feriados ?? []).map((f) => f.fecha));
  const profs = o.miembros.filter(visibleEnReserva).filter((p) => !o.profesionalId || p.id === o.profesionalId);
  const out: Libre[] = [];
  for (let i = 0; i <= config.diasAdelante; i++) {
    const d = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + i, 12);
    const fecha = isoLocal(d);
    if (feriados.has(fecha)) continue;
    const minimo = desdeMin - i * 1440;
    if (minimo >= 1440) continue;
    const dia = DIAS[d.getDay()];
    const bloq = o.agenda.bloqueos.filter((b) => b.fecha === fecha).map((b) => [aMin(b.desde), aMin(b.hasta)] as const);
    const porHora = new Map<string, string>();
    for (const p of profs) {
      const h = p.schedule.find((x) => x.day === dia && x.active);
      if (!h?.start || !h.end) continue;
      if (o.ausencias.some((a) => a.miembroId === p.id && a.desde <= fecha && fecha <= (a.hasta || a.desde))) continue;
      const nombre = `${p.firstName} ${p.lastName}`.trim().toLowerCase();
      const ocupados = turnos
        .filter((t) => t.fecha === fecha && t.odontologo.trim().toLowerCase() === nombre)
        .map((t) => [aMin(t.hora), aMin(t.hora) + (t.duracion ?? duracion)] as const);
      const dIni = h.breakStart ? aMin(h.breakStart) : -1;
      const dFin = h.breakEnd ? aMin(h.breakEnd) : -1;
      for (let m = aMin(h.start); m + duracion <= aMin(h.end); m += intervalo) {
        if (m < minimo) continue;
        const e = m + duracion;
        if (dIni >= 0 && dFin > dIni && m < dFin && e > dIni) continue;
        if (ocupados.some(([a, b]) => m < b && e > a)) continue;
        if (bloq.some(([a, b]) => m < b && e > a)) continue;
        if (!porHora.has(aHora(m))) porHora.set(aHora(m), p.id);
      }
    }
    for (const [hora, profesionalId] of [...porHora.entries()].sort((a, b) => a[0].localeCompare(b[0])))
      out.push({ fecha, hora, profesionalId });
  }
  return out;
}

/* ── Servidor (clínicas reales) ── */
async function pedir<T>(ruta: string, metodo = "GET", cuerpo?: unknown): Promise<T> {
  if (!API_URL) throw new Error("Esta página todavía no está disponible.");
  const r = await fetch(`${API_URL}${ruta}`, {
    method: metodo,
    headers: cuerpo !== undefined ? { "Content-Type": "application/json" } : {},
    ...(cuerpo !== undefined ? { body: JSON.stringify(cuerpo) } : {}),
  });
  if (!r.ok) {
    const t = (await r.text().catch(() => "")).trim();
    throw new Error(t && t.length < 200 ? t : "No pudimos conectarnos. Probá de nuevo.");
  }
  return (await r.json()) as T;
}
export const infoReservaServidor = (slug: string) => pedir<InfoReserva>(`/public/reservas/${slug}`);
export const libresServidor = (slug: string, profesionalId?: string) =>
  pedir<{ libres: Libre[] }>(`/public/reservas/${slug}/libres${profesionalId ? `?profesional=${encodeURIComponent(profesionalId)}` : ""}`).then((r) => r.libres);
export const reservarServidor = (slug: string, datos: DatosReserva) =>
  pedir<ResultadoReserva>(`/public/reservas/${slug}`, "POST", datos);

/** Dirección pública de la página de turnos de la clínica */
export const enlaceReserva = (slug: string) =>
  `${typeof window !== "undefined" ? window.location.origin : ""}/turnos/${slug}`;

/** Código para pegar en la página web que la clínica YA tiene (cualquier sitio: WordPress, Wix…) */
export function codigosParaWeb(slug: string, color: string) {
  const link = enlaceReserva(slug);
  const boton = `<a href="${link}" target="_blank" rel="noopener" style="display:inline-block;padding:14px 26px;border-radius:999px;background:${color};color:#fff;font:600 16px/1 system-ui,sans-serif;text-decoration:none;box-shadow:0 10px 24px -12px ${color}">Sacar turno online</a>`;
  const turnero =
    `<iframe id="cloud-esther-turnos" src="${link}?modo=web" title="Sacar turno" style="width:100%;min-height:760px;border:0;border-radius:24px" loading="lazy"></iframe>\n` +
    `<script>addEventListener("message",function(e){if(e.data&&e.data.cloudEstherAlto){document.getElementById("cloud-esther-turnos").style.height=e.data.cloudEstherAlto+"px"}})</script>`;
  return { link, boton, turnero };
}
