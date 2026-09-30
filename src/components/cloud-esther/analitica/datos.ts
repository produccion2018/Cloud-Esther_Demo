import { useMemo } from "react";
import { useTenantActual } from "@/lib/cloud-esther/tenant-store";
import { useEquipo } from "@/lib/cloud-esther/equipo-store";
import { storeAgenda, type Turno } from "@/lib/cloud-esther/agenda-store";
import { usePacientes } from "@/lib/cloud-esther/pacientes";
import { storeMarketing } from "@/lib/cloud-esther/marketing-store";
import { storeAnalitica, type EstadoAnalitica } from "@/lib/cloud-esther/analitica-store";
import { useTodosLosRegistros } from "@/components/cloud-esther/PacienteSecciones";
import {
  CATALOGO,
  generarHistorico,
  iso,
  pct,
  type Hecho,
  type LeadHecho,
  type PresupuestoHecho,
} from "@/lib/cloud-esther/analitica-datos";

/* Junta el histórico con los datos vivos de los módulos y calcula las métricas. */

export type Periodo = "7d" | "30d" | "90d" | "mes" | "12m" | "anio" | "custom";
export type Filtros = {
  periodo: Periodo;
  desde: string;
  hasta: string;
  sucursal: string;
  profesional: string;
};
export type Rango = {
  desde: string;
  hasta: string;
  prevDesde: string;
  prevHasta: string;
  dias: number;
};

const dia = (d: Date) => iso(d);
function sumarDias(f: string, n: number) {
  const d = new Date(`${f}T12:00:00`);
  d.setDate(d.getDate() + n);
  return dia(d);
}
export function diasEntre(a: string, b: string) {
  return Math.round(
    (new Date(`${b}T12:00:00`).getTime() - new Date(`${a}T12:00:00`).getTime()) / 86_400_000,
  );
}

export function rangoDe(f: Filtros): Rango {
  const hoy = dia(new Date());
  let desde = hoy;
  let hasta = hoy;
  if (f.periodo === "custom") {
    desde = f.desde || hoy;
    hasta = f.hasta || hoy;
  } else if (f.periodo === "mes") desde = `${hoy.slice(0, 7)}-01`;
  else if (f.periodo === "anio") desde = `${hoy.slice(0, 4)}-01-01`;
  else if (f.periodo === "12m") desde = sumarDias(hoy, -364);
  else desde = sumarDias(hoy, -(Number(f.periodo.replace("d", "")) - 1));
  const dias = diasEntre(desde, hasta) + 1;
  const prevHasta = sumarDias(desde, -1);
  const prevDesde =
    f.periodo === "mes" ? sumarDias(prevHasta, -(dias - 1)) : sumarDias(desde, -dias);
  return { desde, hasta, prevDesde, prevHasta, dias };
}

const PRECIO = new Map(CATALOGO.map((c) => [c[0], c]));
function catalogoDe(t: string) {
  return (
    PRECIO.get(t) ??
    CATALOGO.find((c) => t.toLowerCase().includes(c[0].toLowerCase().split(" ")[0]!)) ?? [
      "",
      "Otros",
      30_000,
      0,
    ]
  );
}
function grupoEdad(nac: string) {
  if (!nac) return "30-44";
  const e = new Date().getFullYear() - Number(nac.slice(0, 4));
  return e < 18 ? "0-17" : e < 30 ? "18-29" : e < 45 ? "30-44" : e < 60 ? "45-59" : "60+";
}
const CANAL_FUENTE: Record<string, string> = {
  Instagram: "Instagram",
  Facebook: "Meta Ads",
  Google: "Google",
  WhatsApp: "Presencial",
  "Sitio web": "Sitio web",
  Referido: "Recomendación",
  Doctoralia: "Sitio web",
  Presencial: "Presencial",
};
/** Inversión publicitaria mensual por canal (además de las campañas cargadas en Marketing). */
export const INVERSION_MENSUAL: Record<string, number> = {
  Google: 120_000,
  "Meta Ads": 150_000,
  Instagram: 60_000,
  "Sitio web": 25_000,
};

export function useAnalitica(profesionalesPlan: string[], sucursales: string[]) {
  const tenant = useTenantActual();
  const cfg = storeAnalitica.usar();
  const { miembros } = useEquipo();
  const turnos = storeAgenda.usar().turnos;
  const { pacientes } = usePacientes();
  const registros = useTodosLosRegistros();
  const mkt = storeMarketing.usar();
  const profes = miembros
    .filter((m) => m.role === "odontologo" && m.status !== "inactivo")
    .map((m) => `${m.firstName} ${m.lastName}`.trim());
  const profesionales = profes.length ? profes : profesionalesPlan;

  const hist = useMemo(
    () =>
      cfg.incluirHistorico
        ? generarHistorico(tenant, profesionales, sucursales)
        : {
            hechos: [] as Hecho[],
            presupuestos: [] as PresupuestoHecho[],
            leads: [] as LeadHecho[],
          },
    [cfg.incluirHistorico, tenant, profesionales.join(","), sucursales.join(",")], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const vivos = useMemo(() => {
    const porNombre = new Map(pacientes.map((p) => [`${p.nombre} ${p.apellido}`.toLowerCase(), p]));
    return turnos.map((t: Turno, i): Hecho => {
      const p = porNombre.get(t.paciente.toLowerCase());
      const [, cat, precio] = catalogoDe(t.tratamiento);
      const d = new Date(`${t.fecha}T12:00:00`);
      const estado: Hecho["estado"] =
        t.estado === "Atendida"
          ? "Atendida"
          : t.estado === "Ausente"
            ? "Ausente"
            : t.estado === "Cancelada"
              ? "Cancelada"
              : "Programada";
      return {
        id: `v${t.id}-${i}`,
        fecha: t.fecha,
        hora: Number(t.hora.slice(0, 2)) || 9,
        dow: d.getDay(),
        sucursal: t.sucursal,
        profesional: t.odontologo,
        tratamiento: t.tratamiento,
        categoria: cat,
        estado,
        paciente: p?.id ?? 900_000 + i,
        nuevo: /primera/i.test(t.tratamiento),
        canal: "Presencial",
        cobertura: p?.obraSocial || "Particular",
        edad: grupoEdad(p?.fechaNacimiento ?? ""),
        genero:
          p?.genero === "Masculino" ? "Masculino" : p?.genero === "Femenino" ? "Femenino" : "Otro",
        monto: estado === "Atendida" ? precio : 0,
        vivo: true,
      };
    });
  }, [turnos, pacientes]);

  const presReales = useMemo(() => {
    const out: PresupuestoHecho[] = [];
    for (const [pid, r] of Object.entries(registros)) {
      const pac = pacientes.find((p) => p.id === Number(pid));
      for (const pr of r.presupuestos) {
        if (pr.estado === "Borrador") continue;
        const bruto = pr.lineas.reduce((a, l) => a + l.cantidad * l.precio, 0);
        out.push({
          fecha: pr.fecha,
          sucursal: pac?.sucursal || sucursales[0] || "",
          profesional: pr.profesional ?? "",
          monto: Math.round(bruto * (1 - (pr.descuentoPct ?? 0) / 100)),
          estado:
            pr.estado === "Aprobado"
              ? "Aprobado"
              : pr.estado === "Rechazado"
                ? "Rechazado"
                : "Enviado",
          tratamiento: pr.lineas[0]?.descripcion ?? "Tratamiento",
        });
      }
    }
    return out;
  }, [registros, pacientes, sucursales]);

  const leadsReales = useMemo(
    () =>
      mkt.leads.map((l) => ({
        fecha: l.creado.slice(0, 10),
        canal: CANAL_FUENTE[l.fuente] ?? "Presencial",
        convertido: l.etapa === "Convertido",
        costo: 0,
      })),
    [mkt.leads],
  );

  return {
    cfg,
    profesionales,
    hechos: useMemo(() => [...hist.hechos, ...vivos], [hist, vivos]),
    presupuestos: useMemo(() => [...hist.presupuestos, ...presReales], [hist, presReales]),
    leads: useMemo(() => [...hist.leads, ...leadsReales], [hist, leadsReales]),
    campanias: mkt.campanias,
    resenas: mkt.resenas,
    pacientes,
    turnosVivos: turnos,
  };
}
export type DatosAnalitica = ReturnType<typeof useAnalitica>;

/* ───────────── Métricas ───────────── */

export function enRango<T extends { fecha: string }>(xs: T[], desde: string, hasta: string) {
  return xs.filter((x) => x.fecha >= desde && x.fecha <= hasta);
}
export function filtrar<T extends { sucursal: string; profesional: string }>(xs: T[], f: Filtros) {
  return xs.filter(
    (x) =>
      (f.sucursal === "Todas" || x.sucursal === f.sucursal) &&
      (f.profesional === "Todos" || x.profesional === f.profesional),
  );
}
/** Días de atención (lunes a viernes completos, sábado medio día). */
export function diasHabiles(desde: string, hasta: string) {
  let n = 0;
  for (let f = desde; f <= hasta; f = sumarDias(f, 1)) {
    const d = new Date(`${f}T12:00:00`).getDay();
    n += d === 0 ? 0 : d === 6 ? 0.5 : 1;
  }
  return n;
}

export type Metricas = ReturnType<typeof metricas>;
export function metricas(
  hs: Hecho[],
  pres: PresupuestoHecho[],
  cfg: EstadoAnalitica,
  sedes: string[],
  desde: string,
  hasta: string,
  profesionales = 0,
) {
  const at = hs.filter((h) => h.estado === "Atendida");
  const aus = hs.filter((h) => h.estado === "Ausente").length;
  const canc = hs.filter((h) => h.estado === "Cancelada").length;
  const produccion = at.reduce((a, h) => a + h.monto, 0);
  const capacidadHoras =
    sedes.reduce(
      (a, s) => a + (cfg.capacidad[s]?.gabinetes ?? 1) * (cfg.capacidad[s]?.horas ?? 8),
      0,
    ) * diasHabiles(desde, hasta);
  // Si se filtra un profesional, la capacidad es la de un gabinete.
  const capacidad = profesionales ? capacidadHoras / Math.max(1, profesionales) : capacidadHoras;
  const ocupadas = hs.filter((h) => h.estado !== "Cancelada").length * (cfg.duracionMin / 60);
  const aprobados = pres.filter((p) => p.estado === "Aprobado");
  const cerrados = pres.filter((p) => p.estado !== "Enviado").length;
  return {
    produccion,
    atenciones: at.length,
    nuevos: at.filter((h) => h.nuevo).length,
    ticket: at.length ? produccion / at.length : 0,
    ausentismo: pct(aus, at.length + aus),
    cancelacion: pct(canc, hs.length),
    ocupacion: capacidad ? Math.min(100, pct(ocupadas, capacidad)) : 0,
    pacientes: new Set(at.map((h) => h.paciente)).size,
    presupuestos: pres.length,
    presupuestado: pres.reduce((a, p) => a + p.monto, 0),
    aprobado: aprobados.reduce((a, p) => a + p.monto, 0),
    conversion: pct(aprobados.length, cerrados),
    programados: hs.filter((h) => h.estado === "Programada").length,
  };
}
