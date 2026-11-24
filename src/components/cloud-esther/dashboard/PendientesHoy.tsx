import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  CakeSlice,
  CheckCircle2,
  ChevronRight,
  FlaskConical,
  ListTodo,
  PackageMinus,
  ReceiptText,
  type LucideIcon,
} from "lucide-react";

import { useTodosLosRegistros } from "@/components/cloud-esther/PacienteSecciones";
import { MODULES, availableIn, useCloudEsther } from "@/lib/cloud-esther/data";
import { storeAgenda } from "@/lib/cloud-esther/agenda-store";
import { storeInventario } from "@/lib/cloud-esther/inventario-store";
import { usePacientes } from "@/lib/cloud-esther/pacientes";
import { normalizarBusqueda } from "@/lib/utils";

/* Ubicación: src/components/cloud-esther/dashboard/PendientesHoy.tsx
   PENDIENTES DE HOY (Dashboard, demo y clínica): en una sola tarjeta, lo que hay que atender hoy.
   · Pacientes con alergias o enfermedades que tienen turno hoy (para tenerlo presente al atender).
   · Cumpleaños de pacientes (para saludarlos).
   · Presupuestos enviados hace 3 días o más que siguen sin respuesta.
   · Trabajos de laboratorio atrasados.
   · Insumos con stock en el mínimo o por debajo.
   Solo aparece lo de los módulos que la clínica tiene. Cada fila lleva a resolverlo. */

type Fila = {
  id: string;
  icon: LucideIcon;
  tono: string;
  titulo: string;
  detalle: string[];
  ir: string;
  accion: string;
};

const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const haceDias = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const lista = (xs: string[], max = 3) => (xs.length > max ? [...xs.slice(0, max), `y ${xs.length - max} más`] : xs);

export function PendientesHoy() {
  const { plan } = useCloudEsther();
  const { turnos } = storeAgenda.usar();
  const { pacientes } = usePacientes();
  const registros = useTodosLosRegistros();
  const { insumos } = storeInventario.usar();

  const tiene = (id: string) => {
    const m = MODULES.find((x) => x.id === id);
    return !!m && availableIn(m, plan);
  };

  const filas = useMemo<Fila[]>(() => {
    const hoy = hoyISO();
    const out: Fila[] = [];
    const porNombre = new Map(pacientes.map((p) => [normalizarBusqueda(`${p.nombre} ${p.apellido}`), p]));

    // 1) Alertas médicas de los pacientes con turno hoy
    const alertas: string[] = [];
    for (const t of turnos.filter((x) => x.fecha === hoy && x.estado !== "Cancelada").sort((a, b) => a.hora.localeCompare(b.hora))) {
      const p = porNombre.get(normalizarBusqueda(t.paciente));
      const a = p ? registros[p.id]?.antecedentes : undefined;
      const que = [...(a?.alergias ?? []).map((x) => `alergia a ${x}`), ...(a?.enfermedades ?? [])];
      if (que.length) alertas.push(`${t.hora} ${t.paciente}: ${que.slice(0, 2).join(", ")}`);
    }
    if (alertas.length)
      out.push({
        id: "alertas",
        icon: AlertTriangle,
        tono: "from-rose-500 to-red-500",
        titulo: `${alertas.length} paciente${alertas.length > 1 ? "s" : ""} con alertas médicas tiene${alertas.length > 1 ? "n" : ""} turno hoy`,
        detalle: lista(alertas),
        ir: "/demo/agenda",
        accion: "Ver agenda",
      });

    // 2) Cumpleaños
    const mmdd = hoy.slice(5);
    const cumple = pacientes
      .filter((p) => p.estado === "Activo" && p.fechaNacimiento?.slice(5) === mmdd)
      .map((p) => `${p.nombre} ${p.apellido}`);
    if (cumple.length)
      out.push({
        id: "cumple",
        icon: CakeSlice,
        tono: "from-pink-500 to-fuchsia-500",
        titulo: `${cumple.length === 1 ? "Cumple años" : `Cumplen años ${cumple.length} pacientes`}`,
        detalle: lista(cumple),
        ir: "/demo/comunicaciones",
        accion: "Saludar",
      });

    // 3) Presupuestos enviados sin respuesta (3 días o más)
    if (tiene("presupuestos")) {
      const limite = haceDias(3);
      const sinRespuesta: string[] = [];
      for (const p of pacientes) {
        for (const pr of registros[p.id]?.presupuestos ?? [])
          if (pr.estado === "Enviado" && (pr.enviado ?? pr.fecha) <= limite)
            sinRespuesta.push(`${pr.numero} · ${p.nombre} ${p.apellido}`);
      }
      if (sinRespuesta.length)
        out.push({
          id: "presupuestos",
          icon: ReceiptText,
          tono: "from-amber-500 to-orange-500",
          titulo: `${sinRespuesta.length} presupuesto${sinRespuesta.length > 1 ? "s" : ""} sin respuesta hace 3 días o más`,
          detalle: lista(sinRespuesta),
          ir: "/demo/presupuestos",
          accion: "Hacer seguimiento",
        });
    }

    // 4) Laboratorio atrasado
    if (tiene("laboratorio")) {
      const atrasados: string[] = [];
      for (const p of pacientes)
        for (const t of registros[p.id]?.laboratorio ?? [])
          if ((t.estado === "Enviado" || t.estado === "En proceso") && t.fechaEntregaEstimada && t.fechaEntregaEstimada < hoy)
            atrasados.push(`${t.tipo} · ${p.nombre} ${p.apellido}${t.proveedor ? ` (${t.proveedor})` : ""}`);
      if (atrasados.length)
        out.push({
          id: "laboratorio",
          icon: FlaskConical,
          tono: "from-sky-500 to-indigo-500",
          titulo: `${atrasados.length} trabajo${atrasados.length > 1 ? "s" : ""} de laboratorio atrasado${atrasados.length > 1 ? "s" : ""}`,
          detalle: lista(atrasados),
          ir: "/demo/laboratorio",
          accion: "Reclamar",
        });
    }

    // 5) Stock bajo
    if (tiene("inventario")) {
      const bajos = insumos.filter((i) => i.stock <= i.minimo).map((i) => `${i.nombre} (${i.stock} ${i.unidad})`);
      if (bajos.length)
        out.push({
          id: "stock",
          icon: PackageMinus,
          tono: "from-emerald-500 to-teal-500",
          titulo: `${bajos.length} insumo${bajos.length > 1 ? "s" : ""} con stock bajo`,
          detalle: lista(bajos),
          ir: "/demo/inventario",
          accion: "Reponer",
        });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnos, pacientes, registros, insumos, plan]);

  return (
    <section className="relative overflow-hidden rounded-3xl border border-primary/12 bg-card p-4 shadow-[0_18px_40px_-32px_rgba(76,29,149,0.7)] sm:p-5">
      <div className="mb-3 flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary to-fuchsia-500 text-white shadow-[0_10px_22px_-12px_rgba(124,58,237,0.9)]">
          <ListTodo className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-[15px] font-bold tracking-tight">Pendientes de hoy</h2>
          <p className="text-xs text-muted-foreground">Lo que conviene atender antes de que se complique</p>
        </div>
        {filas.length > 0 && (
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">{filas.length}</span>
        )}
      </div>
      {filas.length === 0 ? (
        <p className="flex items-center gap-2 rounded-2xl border border-dashed border-emerald-500/30 bg-emerald-500/[0.06] px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="size-4 shrink-0" /> Todo al día: no hay alertas médicas, cumpleaños, presupuestos sin
          respuesta, laboratorio atrasado ni stock bajo.
        </p>
      ) : (
        <ul className="grid gap-2 lg:grid-cols-2">
          {filas.map((f) => (
            <li key={f.id}>
              <Link
                to={f.ir as never}
                className="group flex h-full items-start gap-3 rounded-2xl border border-primary/10 bg-card p-3 transition hover:-translate-y-px hover:border-primary/30 hover:shadow-[0_14px_30px_-24px_rgba(76,29,149,0.8)]"
              >
                <span className={`grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${f.tono} text-white`}>
                  <f.icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold leading-snug">{f.titulo}</span>
                  {f.detalle.map((d) => (
                    <span key={d} className="block truncate text-xs text-muted-foreground">
                      {d}
                    </span>
                  ))}
                  <span className="mt-1 inline-flex items-center gap-0.5 text-xs font-semibold text-primary">
                    {f.accion} <ChevronRight className="size-3.5 transition group-hover:translate-x-0.5" />
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
