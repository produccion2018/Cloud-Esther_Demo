import { createFileRoute } from "@tanstack/react-router";
import { Download, FileBarChart } from "lucide-react";
import { useState } from "react";

import { Cargando, Seccion } from "@/components/admin/bits";
import { Tabla, descargarCSV } from "@/components/admin/formularios";
import { RestrictedView } from "@/components/admin/restricted";
import { canAccess, permisos, roleLabel, useRole, type AdminRole } from "@/components/admin/role";
import { AdminShell } from "@/components/admin/shell";
import { Button } from "@/components/ui/button";
import { useClinicas, useColeccion, useDemos, useSesionesPanel } from "@/lib/admin/consultas";
import { ETIQUETA_PAGO, NOMBRE_PLAN } from "@/lib/admin/formato";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/reportes")({
  head: () => ({
    meta: [
      { title: "Reportes — Cloud Esther Administración" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ReportesPage,
});

type Fila = { fecha: string | null; celdas: (string | number)[] };
type Reporte = {
  id: string;
  titulo: string;
  descripcion: string;
  columnas: string[];
  filas: Fila[];
};

const SELECT =
  "h-9 rounded-xl border border-input bg-card px-3 text-xs font-semibold outline-none focus:border-primary/50";

function ReportesPage() {
  const { role } = useRole();
  const clinicas = useClinicas();
  const demos = useDemos();
  const gastos = useColeccion("gastos");
  const liquidaciones = useColeccion("liquidaciones");
  const empleados = useColeccion("empleados");
  const tickets = useColeccion("ticketsSoporte");
  const sesiones = useSesionesPanel();
  const [elegido, setElegido] = useState("clinicas");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  if (!canAccess(role, "/admin/reportes")) return <RestrictedView />;
  const cargando = [clinicas, demos, gastos, liquidaciones, empleados, tickets, sesiones].some(
    (q) => q.isLoading,
  );
  const verImportes = permisos.verImportes(role);
  const nombreEmpleado = (id: string) =>
    (empleados.data ?? []).find((e) => e.id === id)?.nombre ?? "—";

  const reportes: Reporte[] = [
    {
      id: "clinicas",
      titulo: "Clínicas clientes",
      descripcion: "Plan, ciclo, estado de pago y uso de cada clínica.",
      columnas: [
        "Clínica",
        "País",
        "Plan",
        "Ciclo",
        "Estado de pago",
        ...(verImportes ? ["Monto inicial (US$)", "Monto mensual (US$)"] : []),
        "Pacientes activos",
        "Usuarios",
        "Cliente desde",
      ],
      filas: (clinicas.data ?? []).map((c) => ({
        fecha: c.clienteDesde,
        celdas: [
          c.nombre,
          c.pais,
          NOMBRE_PLAN[c.plan],
          c.ciclo,
          ETIQUETA_PAGO[c.estadoPago],
          ...(verImportes ? [c.montoInicial ?? "—", c.importe ?? "—"] : []),
          c.uso.pacientesActivos,
          c.uso.usuariosInternos,
          c.clienteDesde,
        ],
      })),
    },
    {
      id: "demos",
      titulo: "Demos e interesados",
      descripcion:
        "Quién probó el demo, cuántas veces entró, minutos de uso y estado del seguimiento.",
      columnas: [
        "Nombre",
        "Clínica",
        "Email",
        "Plan elegido",
        "Ingresos",
        "Minutos",
        "Agotó los 30 min",
        "Estado",
        "Registrado",
      ],
      filas: (demos.data ?? []).map((d) => ({
        fecha: d.registrado.slice(0, 10),
        celdas: [
          d.nombre,
          d.clinica,
          d.email,
          d.planElegido,
          d.ingresos.length,
          d.ingresos.reduce((s, i) => s + i.minutos, 0),
          d.ingresos.filter((i) => i.cierre === "Expiró").length,
          d.estado,
          d.registrado.slice(0, 10),
        ],
      })),
    },
    {
      id: "gastos",
      titulo: "Gastos de la empresa",
      descripcion: "Gastos por categoría, proveedor, moneda y estado.",
      columnas: ["Fecha", "Categoría", "Descripción", "Moneda", "Importe", "Estado"],
      filas: (gastos.data ?? []).map((g) => ({
        fecha: g.fecha,
        celdas: [g.fecha, g.categoria, g.descripcion, g.moneda, g.importe, g.estado],
      })),
    },
    {
      id: "nomina",
      titulo: "Nómina",
      descripcion: "Liquidaciones por persona y período con bruto, descuentos y neto.",
      columnas: ["Persona", "Período", "Régimen", "Bruto", "Descuentos", "Neto", "Estado"],
      filas: (liquidaciones.data ?? []).map((l) => {
        const bruto = l.conceptos
          .filter((c) => c.tipo === "Haber")
          .reduce((s, c) => s + c.importe, 0);
        const desc = l.conceptos
          .filter((c) => c.tipo === "Descuento")
          .reduce((s, c) => s + c.importe, 0);
        return {
          fecha: `${l.periodo}-01`,
          celdas: [
            nombreEmpleado(l.empleadoId),
            l.periodo,
            l.jurisdiccion,
            bruto,
            desc,
            bruto - desc,
            l.estado,
          ],
        };
      }),
    },
    {
      id: "soporte",
      titulo: "Soporte técnico",
      descripcion: "Tickets con categoría, prioridad, responsable y tiempos.",
      columnas: [
        "Ticket",
        "Clínica",
        "Asunto",
        "Categoría",
        "Prioridad",
        "Estado",
        "Responsable",
        "Abierto",
        "Resuelto",
      ],
      filas: (tickets.data ?? []).map((t) => ({
        fecha: t.abierto.slice(0, 10),
        celdas: [
          t.id,
          t.clinica,
          t.asunto,
          t.categoria,
          t.prioridad,
          t.estado,
          t.responsable ?? "Sin asignar",
          t.abierto.slice(0, 16).replace("T", " "),
          t.resuelto ? t.resuelto.slice(0, 16).replace("T", " ") : "—",
        ],
      })),
    },
    {
      id: "personal",
      titulo: "Personal",
      descripcion: "Equipo interno con cargo, área, contratación y estado.",
      columnas: ["Nombre", "Cargo", "Área", "Contratación", "Horas semanales", "Ingreso", "Estado"],
      filas: (empleados.data ?? []).map((e) => ({
        fecha: e.ingreso,
        celdas: [e.nombre, e.cargo, e.area, e.contratacion, e.jornadaHoras, e.ingreso, e.estado],
      })),
    },
    {
      id: "sesiones",
      titulo: "Accesos al panel",
      descripcion: "Sesiones del equipo con entrada, salida, dispositivo y navegador.",
      columnas: ["Persona", "Rol", "Entrada", "Salida", "Cierre", "Dispositivo", "Navegador"],
      filas: (sesiones.data ?? []).map((s) => ({
        fecha: s.inicio.slice(0, 10),
        celdas: [
          s.usuario,
          roleLabel[s.rol as AdminRole] ?? s.rol,
          s.inicio.slice(0, 16).replace("T", " "),
          s.fin ? s.fin.slice(0, 16).replace("T", " ") : "—",
          s.cierre ?? "Abierta",
          s.dispositivo,
          s.navegador,
        ],
      })),
    },
  ];

  const reporte = reportes.find((r) => r.id === elegido) ?? reportes[0];
  const filas = (reporte?.filas ?? []).filter(
    (f) => !f.fecha || ((!desde || f.fecha >= desde) && (!hasta || f.fecha <= hasta)),
  );

  return (
    <AdminShell
      title="Reportes"
      description="Reportes administrativos de toda la operación. Elegí uno, filtrá por fechas y descargalo en CSV para abrirlo en Excel o Google Sheets."
    >
      {cargando || !reporte ? (
        <Cargando />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[280px_1fr]">
          <div className="space-y-2">
            {reportes.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setElegido(r.id)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition",
                  r.id === reporte.id
                    ? "border-primary/40 bg-primary/[0.06]"
                    : "border-border bg-card hover:border-primary/25",
                )}
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <FileBarChart className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold">{r.titulo}</span>
                  <span className="block text-xs text-muted-foreground">
                    {r.filas.length} registros
                  </span>
                </span>
              </button>
            ))}
          </div>
          <Seccion
            titulo={reporte.titulo}
            descripcion={reporte.descripcion}
            sinPadding
            acciones={
              <>
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  Desde{" "}
                  <input
                    type="date"
                    className={SELECT}
                    value={desde}
                    onChange={(e) => setDesde(e.target.value)}
                  />
                </label>
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  Hasta{" "}
                  <input
                    type="date"
                    className={SELECT}
                    value={hasta}
                    onChange={(e) => setHasta(e.target.value)}
                  />
                </label>
                <Button
                  size="sm"
                  disabled={!filas.length}
                  onClick={() =>
                    descargarCSV(`reporte-${reporte.id}`, [
                      reporte.columnas,
                      ...filas.map((f) => f.celdas),
                    ])
                  }
                >
                  <Download className="mr-1 h-4 w-4" /> Descargar CSV
                </Button>
              </>
            }
          >
            <p className="border-b border-border/60 px-5 py-2 text-xs text-muted-foreground">
              {filas.length} registros
              {filas.length > 25 && " · se muestran los primeros 25 (el CSV incluye todos)"}
            </p>
            <Tabla
              columnas={reporte.columnas}
              minimo={Math.max(640, reporte.columnas.length * 120)}
            >
              {filas.slice(0, 25).map((f, i) => (
                <tr key={i} className="border-t border-border/60">
                  {f.celdas.map((c, j) => (
                    <td
                      key={j}
                      className={cn(
                        "px-3 py-2.5 text-xs",
                        j === 0 && "pl-5 font-semibold",
                        j === f.celdas.length - 1 && "pr-5",
                      )}
                    >
                      {typeof c === "number" ? c.toLocaleString("es-AR") : c}
                    </td>
                  ))}
                </tr>
              ))}
            </Tabla>
          </Seccion>
        </div>
      )}
    </AdminShell>
  );
}
