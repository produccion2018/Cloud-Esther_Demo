import { createFileRoute } from "@tanstack/react-router";
import {
  Banknote,
  Download,
  FileText,
  HandCoins,
  Pencil,
  Plus,
  Printer,
  Trash2,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Cargando, KpiCard, Seccion, Vacio } from "@/components/admin/bits";
import {
  Campo,
  DialogoFormulario,
  INPUT,
  Pestanas,
  Pildora,
  Tabla,
  confirmar,
  descargarCSV,
} from "@/components/admin/formularios";
import { RestrictedView } from "@/components/admin/restricted";
import { canAccess, useRole } from "@/components/admin/role";
import { AdminShell } from "@/components/admin/shell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { nuevoIdLocal } from "@/lib/admin/api";
import { useBorrarDe, useColeccion, useGuardarEn } from "@/lib/admin/consultas";
import { fecha, hoyISO, importe, periodoActual, periodoTexto } from "@/lib/admin/formato";
import type {
  Anticipo,
  ConceptoNomina,
  Empleado,
  Liquidacion,
  PagoNomina,
} from "@/lib/admin/tipos-empresa";

export const Route = createFileRoute("/admin/nomina")({
  head: () => ({
    meta: [
      { title: "Nómina y pagos — Cloud Esther Administración" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: NominaPage,
});

/* Plantillas de liquidación por jurisdicción. Son un punto de partida editable:
   los porcentajes son de referencia y cada concepto se puede cambiar o quitar.
   TODO backend: guardar plantillas propias por país/régimen. */
const PLANTILLAS: { id: string; descuentos: { nombre: string; porcentaje: number }[] }[] = [
  {
    id: "Argentina — relación de dependencia",
    descuentos: [
      { nombre: "Jubilación", porcentaje: 11 },
      { nombre: "Obra social", porcentaje: 3 },
      { nombre: "Ley 19.032 (PAMI)", porcentaje: 3 },
    ],
  },
  {
    id: "Uruguay — relación de dependencia",
    descuentos: [
      { nombre: "Aporte jubilatorio (BPS)", porcentaje: 15 },
      { nombre: "FONASA", porcentaje: 4.5 },
      { nombre: "Fondo de reconversión laboral", porcentaje: 0.1 },
    ],
  },
  {
    id: "Chile — contrato de trabajo",
    descuentos: [
      { nombre: "AFP", porcentaje: 10 },
      { nombre: "Salud", porcentaje: 7 },
      { nombre: "Seguro de cesantía", porcentaje: 0.6 },
    ],
  },
  { id: "Factura / monotributo (sin retenciones)", descuentos: [] },
  { id: "Personalizada", descuentos: [] },
];

type Vista = "liquidaciones" | "pagos" | "anticipos" | "reportes";

const totales = (l: Pick<Liquidacion, "conceptos">) => {
  const bruto = l.conceptos.filter((c) => c.tipo === "Haber").reduce((s, c) => s + c.importe, 0);
  const descuentos = l.conceptos
    .filter((c) => c.tipo === "Descuento")
    .reduce((s, c) => s + c.importe, 0);
  return { bruto, descuentos, neto: bruto - descuentos };
};

type EstadoPago = "Pendiente" | "Parcial" | "Pagado";
const TONO_PAGO = { Pendiente: "peligro", Parcial: "alerta", Pagado: "ok" } as const;

/** Une liquidaciones, pagos y empleados para todas las pestañas. */
function useNomina() {
  const emp = useColeccion("empleados");
  const liq = useColeccion("liquidaciones");
  const pag = useColeccion("pagosNomina");
  const ant = useColeccion("anticipos");
  const empleados = useMemo(() => emp.data ?? [], [emp.data]);
  const pagos = useMemo(() => pag.data ?? [], [pag.data]);
  const filas = useMemo(
    () =>
      (liq.data ?? []).map((l) => {
        const t = totales(l);
        const pagado = pagos
          .filter((p) => p.liquidacionId === l.id)
          .reduce((s, p) => s + p.importe, 0);
        const estado: EstadoPago =
          pagado <= 0 ? "Pendiente" : pagado + 0.5 < t.neto ? "Parcial" : "Pagado";
        const e = empleados.find((x) => x.id === l.empleadoId);
        return {
          l,
          ...t,
          pagado,
          saldo: Math.max(0, t.neto - pagado),
          estado,
          empleado: e,
          moneda: e?.moneda ?? "ARS",
        };
      }),
    [liq.data, pagos, empleados],
  );
  return {
    cargando: emp.isLoading || liq.isLoading || pag.isLoading || ant.isLoading,
    empleados,
    pagos,
    anticipos: ant.data ?? [],
    filas,
    nombre: (id: string) => empleados.find((e) => e.id === id)?.nombre ?? "—",
  };
}
type FilaNomina = ReturnType<typeof useNomina>["filas"][number];

function NominaPage() {
  const { role } = useRole();
  const [vista, setVista] = useState<Vista>("liquidaciones");
  const n = useNomina();
  if (!canAccess(role, "/admin/nomina")) return <RestrictedView />;
  const periodo = periodoActual();
  const delMes = n.filas.filter((f) => f.l.periodo === periodo);
  return (
    <AdminShell
      title="Nómina y pagos"
      description="Liquidaciones del equipo interno con conceptos editables según el país o régimen, pagos registrados por separado (total o en partes) y anticipos que se descuentan solos."
    >
      <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
        <KpiCard
          accent
          label={`Neto ${periodoTexto(periodo)}`}
          value={importe(delMes.reduce((s, f) => s + f.neto, 0))}
          hint={`${delMes.length} liquidaciones`}
          icon={<Wallet className="h-4 w-4" />}
        />
        <KpiCard
          label="Saldo por pagar"
          value={importe(n.filas.reduce((s, f) => s + f.saldo, 0))}
          hint="Todas las liquidaciones"
          icon={<Banknote className="h-4 w-4" />}
          tono="warning"
        />
        <KpiCard
          label="Pagos parciales"
          value={String(n.filas.filter((f) => f.estado === "Parcial").length)}
          hint="Con saldo pendiente"
          icon={<HandCoins className="h-4 w-4" />}
        />
        <KpiCard
          label="Anticipos del mes"
          value={importe(
            n.anticipos.filter((a) => a.periodo === periodo).reduce((s, a) => s + a.importe, 0),
          )}
          hint="Se descuentan en la liquidación"
          icon={<FileText className="h-4 w-4" />}
        />
      </div>
      <Pestanas
        valor={vista}
        onCambiar={setVista}
        opciones={[
          { id: "liquidaciones", label: "Liquidaciones", cantidad: n.filas.length },
          { id: "pagos", label: "Pagos", cantidad: n.pagos.length },
          { id: "anticipos", label: "Anticipos", cantidad: n.anticipos.length },
          { id: "reportes", label: "Reportes" },
        ]}
      />
      {n.cargando ? (
        <Cargando />
      ) : vista === "liquidaciones" ? (
        <Liquidaciones n={n} />
      ) : vista === "pagos" ? (
        <Pagos n={n} />
      ) : vista === "anticipos" ? (
        <Anticipos n={n} />
      ) : (
        <Reportes n={n} />
      )}
    </AdminShell>
  );
}

/* ───────────── Liquidaciones ───────────── */

function Liquidaciones({ n }: { n: ReturnType<typeof useNomina> }) {
  const [editando, setEditando] = useState<Liquidacion | null>(null);
  const [recibo, setRecibo] = useState<FilaNomina | null>(null);
  const [pagar, setPagar] = useState<FilaNomina | null>(null);
  const [periodo, setPeriodo] = useState("");
  const filas = n.filas
    .filter((f) => !periodo || f.l.periodo === periodo)
    .sort((a, b) => b.l.periodo.localeCompare(a.l.periodo));
  const periodos = [...new Set(n.filas.map((f) => f.l.periodo))].sort().reverse();
  return (
    <>
      <Seccion
        titulo="Liquidaciones de sueldo"
        descripcion="Cada liquidación suma haberes y resta descuentos. El estado de pago se calcula con los pagos registrados."
        sinPadding
        acciones={
          <>
            <select
              className="h-9 rounded-xl border border-input bg-card px-3 text-xs font-semibold"
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              aria-label="Período"
            >
              <option value="">Todos los períodos</option>
              {periodos.map((p) => (
                <option key={p} value={p}>
                  {periodoTexto(p)}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              onClick={() =>
                setEditando({
                  id: nuevoIdLocal("liq"),
                  empleadoId: "",
                  periodo: periodoActual(),
                  jurisdiccion: PLANTILLAS[0]?.id ?? "Personalizada",
                  conceptos: [],
                  estado: "Borrador",
                  creada: new Date().toISOString(),
                })
              }
            >
              <Plus className="mr-1 h-4 w-4" /> Nueva liquidación
            </Button>
          </>
        }
      >
        {filas.length === 0 ? (
          <div className="p-5">
            <Vacio
              titulo="No hay liquidaciones"
              texto="Creá la primera: elegís la persona, el período y la plantilla del país, y ajustás los conceptos."
            />
          </div>
        ) : (
          <Tabla
            columnas={["Persona y período", "Bruto", "Descuentos", "Neto", "Pagado", "Pago", ""]}
            minimo={900}
          >
            {filas.map((f) => (
              <tr key={f.l.id} className="border-t border-border/60">
                <td className="py-3 pl-5 pr-3">
                  <p className="font-semibold">{f.empleado?.nombre ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">
                    {periodoTexto(f.l.periodo)} · {f.l.jurisdiccion} · {f.l.estado}
                  </p>
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-xs tabular-nums">
                  {importe(f.bruto, f.moneda)}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-xs tabular-nums text-destructive">
                  − {importe(f.descuentos, f.moneda)}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-sm font-bold tabular-nums">
                  {importe(f.neto, f.moneda)}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-xs tabular-nums">
                  {importe(f.pagado, f.moneda)}
                  {f.saldo > 0 && (
                    <span className="block text-muted-foreground">
                      Falta {importe(f.saldo, f.moneda)}
                    </span>
                  )}
                </td>
                <td className="px-3 py-3">
                  <Pildora tono={TONO_PAGO[f.estado]}>{f.estado}</Pildora>
                </td>
                <td className="py-3 pl-3 pr-5 text-right whitespace-nowrap">
                  {f.saldo > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mr-1 h-8"
                      onClick={() => setPagar(f)}
                    >
                      Registrar pago
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Recibo"
                    title="Ver recibo"
                    onClick={() => setRecibo(f)}
                  >
                    <Printer className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Editar"
                    onClick={() => setEditando(f.l)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </Tabla>
        )}
      </Seccion>
      {editando && (
        <FormLiquidacion
          key={editando.id}
          inicial={editando}
          n={n}
          nueva={!n.filas.some((f) => f.l.id === editando.id)}
          onCerrar={() => setEditando(null)}
        />
      )}
      {pagar && (
        <FormPago
          key={pagar.l.id}
          n={n}
          liquidacionId={pagar.l.id}
          onCerrar={() => setPagar(null)}
        />
      )}
      {recibo && <Recibo fila={recibo} onCerrar={() => setRecibo(null)} />}
    </>
  );
}

function conceptosDesdePlantilla(
  jurisdiccion: string,
  e: Empleado | undefined,
  anticipos: Anticipo[],
  periodo: string,
): ConceptoNomina[] {
  const base = e?.sueldoBase ?? 0;
  const plantilla = PLANTILLAS.find((p) => p.id === jurisdiccion);
  const anticipo = anticipos
    .filter((a) => a.empleadoId === e?.id && a.periodo === periodo)
    .reduce((s, a) => s + a.importe, 0);
  return [
    { id: nuevoIdLocal("c"), nombre: "Sueldo base", tipo: "Haber", importe: base },
    ...(plantilla?.descuentos ?? []).map((d) => ({
      id: nuevoIdLocal("c"),
      nombre: `${d.nombre} (${d.porcentaje}%)`,
      tipo: "Descuento" as const,
      importe: Math.round((base * d.porcentaje) / 100),
    })),
    ...(anticipo
      ? [
          {
            id: nuevoIdLocal("c"),
            nombre: "Anticipo",
            tipo: "Descuento" as const,
            importe: anticipo,
          },
        ]
      : []),
  ];
}

function FormLiquidacion({
  inicial,
  nueva,
  n,
  onCerrar,
}: {
  inicial: Liquidacion;
  nueva: boolean;
  n: ReturnType<typeof useNomina>;
  onCerrar: () => void;
}) {
  const [l, setL] = useState(inicial);
  const [error, setError] = useState<string | null>(null);
  const guardar = useGuardarEn("liquidaciones", "Liquidación guardada");
  const borrar = useBorrarDe("liquidaciones", "Liquidación eliminada");
  const empleado = n.empleados.find((e) => e.id === l.empleadoId);
  const t = totales(l);
  const aplicarPlantilla = (cambios: Partial<Liquidacion>) => {
    const sig = { ...l, ...cambios };
    const e = n.empleados.find((x) => x.id === sig.empleadoId);
    setL({
      ...sig,
      conceptos: conceptosDesdePlantilla(sig.jurisdiccion, e, n.anticipos, sig.periodo),
    });
  };
  const setConcepto = (id: string, c: Partial<ConceptoNomina>) =>
    setL((x) => ({ ...x, conceptos: x.conceptos.map((k) => (k.id === id ? { ...k, ...c } : k)) }));
  const tienePagos = n.pagos.some((p) => p.liquidacionId === l.id);

  return (
    <DialogoFormulario
      abierto
      ancho="sm:max-w-3xl"
      titulo={nueva ? "Nueva liquidación" : `Liquidación de ${empleado?.nombre ?? ""}`}
      descripcion="Elegí la plantilla del país o régimen y ajustá cada concepto. Los porcentajes son de referencia: confirmalos con tu contador."
      onCerrar={onCerrar}
      guardando={guardar.isPending}
      error={error}
      onGuardar={() => {
        if (!l.empleadoId) return setError("Elegí la persona.");
        if (!l.conceptos.length) return setError("Agregá al menos un concepto.");
        if (t.neto < 0) return setError("Los descuentos superan a los haberes.");
        guardar.mutate(
          { item: l, accion: `Liquidación ${periodoTexto(l.periodo)}: ${empleado?.nombre ?? ""}` },
          { onSuccess: onCerrar },
        );
      }}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <Campo label="Persona">
          <select
            className={INPUT}
            value={l.empleadoId}
            onChange={(e) => aplicarPlantilla({ empleadoId: e.target.value })}
          >
            <option value="">Elegí una persona</option>
            {n.empleados
              .filter((e) => e.estado !== "Baja")
              .map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre}
                </option>
              ))}
          </select>
        </Campo>
        <Campo label="Período">
          <input
            className={INPUT}
            type="month"
            value={l.periodo}
            onChange={(e) => setL({ ...l, periodo: e.target.value })}
          />
        </Campo>
        <Campo label="Estado">
          <select
            className={INPUT}
            value={l.estado}
            onChange={(e) => setL({ ...l, estado: e.target.value as Liquidacion["estado"] })}
          >
            <option>Borrador</option>
            <option>Aprobada</option>
          </select>
        </Campo>
        <Campo
          label="País o régimen (plantilla)"
          className="sm:col-span-3"
          ayuda="Al cambiarla se recalculan los conceptos con el sueldo base y los anticipos del período."
        >
          <div className="flex gap-2">
            <select
              className={INPUT}
              value={
                PLANTILLAS.some((p) => p.id === l.jurisdiccion) ? l.jurisdiccion : "Personalizada"
              }
              onChange={(e) => aplicarPlantilla({ jurisdiccion: e.target.value })}
            >
              {PLANTILLAS.map((p) => (
                <option key={p.id}>{p.id}</option>
              ))}
            </select>
            <Button
              type="button"
              variant="outline"
              onClick={() => aplicarPlantilla({})}
              disabled={!l.empleadoId}
            >
              Recalcular
            </Button>
          </div>
        </Campo>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border">
        <div className="grid grid-cols-[1fr_130px_140px_40px] gap-2 bg-primary/[0.04] px-3 py-2 text-[10.5px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
          <span>Concepto</span>
          <span>Tipo</span>
          <span>Importe</span>
          <span />
        </div>
        {l.conceptos.map((c) => (
          <div
            key={c.id}
            className="grid grid-cols-[1fr_130px_140px_40px] items-center gap-2 border-t border-border/60 px-3 py-2"
          >
            <input
              className={INPUT}
              value={c.nombre}
              aria-label="Concepto"
              onChange={(e) => setConcepto(c.id, { nombre: e.target.value })}
            />
            <select
              className={INPUT}
              value={c.tipo}
              aria-label="Tipo"
              onChange={(e) =>
                setConcepto(c.id, { tipo: e.target.value as ConceptoNomina["tipo"] })
              }
            >
              <option>Haber</option>
              <option>Descuento</option>
            </select>
            <input
              className={INPUT}
              type="number"
              min={0}
              value={c.importe}
              aria-label="Importe"
              onChange={(e) => setConcepto(c.id, { importe: Number(e.target.value) })}
            />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label="Quitar concepto"
              onClick={() =>
                setL((x) => ({ ...x, conceptos: x.conceptos.filter((k) => k.id !== c.id) }))
              }
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 bg-muted/40 px-3 py-2.5">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              setL((x) => ({
                ...x,
                conceptos: [
                  ...x.conceptos,
                  { id: nuevoIdLocal("c"), nombre: "", tipo: "Haber", importe: 0 },
                ],
              }))
            }
          >
            <Plus className="mr-1 h-4 w-4" /> Agregar concepto
          </Button>
          <p className="text-xs tabular-nums">
            Bruto <b>{importe(t.bruto, empleado?.moneda)}</b> · Descuentos{" "}
            <b className="text-destructive">{importe(t.descuentos, empleado?.moneda)}</b> · Neto{" "}
            <b className="text-primary">{importe(t.neto, empleado?.moneda)}</b>
          </p>
        </div>
      </div>
      {!nueva && (
        <button
          type="button"
          className="text-xs text-destructive underline disabled:opacity-50"
          disabled={tienePagos}
          title={tienePagos ? "Tiene pagos registrados: borrá primero los pagos." : undefined}
          onClick={() =>
            confirmar("¿Eliminar esta liquidación?") &&
            borrar.mutate({ id: l.id, accion: "Eliminó una liquidación" }, { onSuccess: onCerrar })
          }
        >
          Eliminar liquidación
        </button>
      )}
    </DialogoFormulario>
  );
}

function Recibo({ fila, onCerrar }: { fila: FilaNomina; onCerrar: () => void }) {
  const { l, empleado, moneda } = fila;
  return (
    <Dialog open onOpenChange={(v) => !v && onCerrar()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl print:max-h-none print:shadow-none">
        <div id="recibo" className="space-y-4 text-sm">
          <div className="flex items-start justify-between gap-3 border-b border-border pb-3">
            <div>
              <DialogTitle className="text-lg font-extrabold">Recibo de sueldo</DialogTitle>
              <p className="text-xs text-muted-foreground">Cloud Esther · {l.jurisdiccion}</p>
            </div>
            <Pildora tono={TONO_PAGO[fila.estado]}>{fila.estado}</Pildora>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <p>
              <span className="text-muted-foreground">Persona:</span>{" "}
              <b>{empleado?.nombre ?? "—"}</b>
            </p>
            <p>
              <span className="text-muted-foreground">Documento:</span> {empleado?.documento ?? "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Cargo:</span> {empleado?.cargo ?? "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Período:</span> {periodoTexto(l.periodo)}
            </p>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-1.5">Concepto</th>
                <th className="py-1.5 text-right">Haberes</th>
                <th className="py-1.5 text-right">Descuentos</th>
              </tr>
            </thead>
            <tbody>
              {l.conceptos.map((c) => (
                <tr key={c.id} className="border-b border-border/50">
                  <td className="py-1.5">{c.nombre}</td>
                  <td className="py-1.5 text-right tabular-nums">
                    {c.tipo === "Haber" ? importe(c.importe, moneda) : ""}
                  </td>
                  <td className="py-1.5 text-right tabular-nums">
                    {c.tipo === "Descuento" ? importe(c.importe, moneda) : ""}
                  </td>
                </tr>
              ))}
              <tr className="font-bold">
                <td className="py-2">Totales</td>
                <td className="py-2 text-right tabular-nums">{importe(fila.bruto, moneda)}</td>
                <td className="py-2 text-right tabular-nums">{importe(fila.descuentos, moneda)}</td>
              </tr>
            </tbody>
          </table>
          <div className="rounded-2xl bg-primary/[0.06] p-3 text-right">
            <p className="text-xs text-muted-foreground">Neto a cobrar</p>
            <p className="text-xl font-extrabold text-primary tabular-nums">
              {importe(fila.neto, moneda)}
            </p>
            <p className="text-xs text-muted-foreground">
              Pagado {importe(fila.pagado, moneda)} · saldo {importe(fila.saldo, moneda)}
            </p>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Comprobante interno de control. No reemplaza el recibo legal que exige cada
            jurisdicción.
          </p>
        </div>
        <div className="flex justify-end gap-2 print:hidden">
          <Button variant="outline" onClick={onCerrar}>
            Cerrar
          </Button>
          <Button onClick={() => window.print()}>
            <Printer className="mr-1 h-4 w-4" /> Imprimir o guardar PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ───────────── Pagos ───────────── */

function Pagos({ n }: { n: ReturnType<typeof useNomina> }) {
  const [nuevo, setNuevo] = useState(false);
  const borrar = useBorrarDe("pagosNomina", "Pago eliminado");
  const lista = [...n.pagos].sort((a, b) => b.fecha.localeCompare(a.fecha));
  return (
    <>
      <Seccion
        titulo="Pagos de sueldos"
        descripcion="Cada pago se registra aparte de la liquidación. Podés pagar en partes: el saldo se actualiza solo."
        sinPadding
        acciones={
          <Button
            size="sm"
            onClick={() => setNuevo(true)}
            disabled={!n.filas.some((f) => f.saldo > 0)}
          >
            <Plus className="mr-1 h-4 w-4" /> Registrar pago
          </Button>
        }
      >
        {lista.length === 0 ? (
          <div className="p-5">
            <Vacio titulo="Todavía no hay pagos registrados" />
          </div>
        ) : (
          <Tabla
            columnas={[
              "Fecha",
              "Persona",
              "Período",
              "Importe",
              "Método",
              "Referencia",
              "Estado de la liquidación",
              "",
            ]}
            minimo={900}
          >
            {lista.map((p) => {
              const f = n.filas.find((x) => x.l.id === p.liquidacionId);
              return (
                <tr key={p.id} className="border-t border-border/60">
                  <td className="py-3 pl-5 pr-3 text-xs">{fecha(p.fecha)}</td>
                  <td className="px-3 py-3 font-semibold">{n.nombre(p.empleadoId)}</td>
                  <td className="px-3 py-3 text-xs">{periodoTexto(p.periodo)}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-sm font-bold tabular-nums">
                    {importe(p.importe, f?.moneda)}
                  </td>
                  <td className="px-3 py-3 text-xs">{p.metodo}</td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">
                    {p.referencia || "—"}
                    {p.observaciones && <span className="block">{p.observaciones}</span>}
                  </td>
                  <td className="px-3 py-3">
                    {f ? <Pildora tono={TONO_PAGO[f.estado]}>{f.estado}</Pildora> : "—"}
                  </td>
                  <td className="py-3 pl-3 pr-5 text-right">
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Eliminar pago"
                      onClick={() =>
                        confirmar(
                          "¿Eliminar este pago? El saldo de la liquidación vuelve a quedar pendiente.",
                        ) &&
                        borrar.mutate({
                          id: p.id,
                          accion: `Eliminó un pago de ${n.nombre(p.empleadoId)}`,
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </Tabla>
        )}
      </Seccion>
      {nuevo && <FormPago n={n} onCerrar={() => setNuevo(false)} />}
    </>
  );
}

function FormPago({
  n,
  liquidacionId,
  onCerrar,
}: {
  n: ReturnType<typeof useNomina>;
  liquidacionId?: string;
  onCerrar: () => void;
}) {
  const conSaldo = n.filas.filter((f) => f.saldo > 0);
  const [liq, setLiq] = useState(liquidacionId ?? conSaldo[0]?.l.id ?? "");
  const fila = n.filas.find((f) => f.l.id === liq);
  const [p, setP] = useState<Omit<PagoNomina, "liquidacionId" | "empleadoId" | "periodo">>({
    id: nuevoIdLocal("pn"),
    importe: fila?.saldo ?? 0,
    fecha: hoyISO(),
    metodo: "Transferencia",
    referencia: "",
    observaciones: "",
  });
  const [error, setError] = useState<string | null>(null);
  const guardar = useGuardarEn("pagosNomina", "Pago registrado");
  return (
    <DialogoFormulario
      abierto
      titulo="Registrar pago de sueldo"
      descripcion="Si pagás una parte, el resto queda como saldo pendiente."
      onCerrar={onCerrar}
      guardando={guardar.isPending}
      error={error}
      onGuardar={() => {
        if (!fila) return setError("Elegí la liquidación.");
        if (p.importe <= 0) return setError("El importe tiene que ser mayor a cero.");
        if (p.importe > fila.saldo + 0.5)
          return setError(`El importe supera el saldo (${importe(fila.saldo, fila.moneda)}).`);
        guardar.mutate(
          {
            item: {
              ...p,
              liquidacionId: fila.l.id,
              empleadoId: fila.l.empleadoId,
              periodo: fila.l.periodo,
            },
            accion: `Pago de sueldo a ${fila.empleado?.nombre ?? ""}`,
          },
          { onSuccess: onCerrar },
        );
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo label="Liquidación" className="sm:col-span-2">
          <select
            className={INPUT}
            value={liq}
            onChange={(e) => {
              setLiq(e.target.value);
              const f = n.filas.find((x) => x.l.id === e.target.value);
              setP((x) => ({ ...x, importe: f?.saldo ?? 0 }));
            }}
          >
            {conSaldo.map((f) => (
              <option key={f.l.id} value={f.l.id}>
                {f.empleado?.nombre} · {periodoTexto(f.l.periodo)} · saldo{" "}
                {importe(f.saldo, f.moneda)}
              </option>
            ))}
          </select>
        </Campo>
        <Campo label="Importe">
          <input
            className={INPUT}
            type="number"
            min={0}
            value={p.importe}
            onChange={(e) => setP({ ...p, importe: Number(e.target.value) })}
          />
        </Campo>
        <Campo label="Fecha">
          <input
            className={INPUT}
            type="date"
            value={p.fecha}
            onChange={(e) => setP({ ...p, fecha: e.target.value })}
          />
        </Campo>
        <Campo label="Método">
          <select
            className={INPUT}
            value={p.metodo}
            onChange={(e) => setP({ ...p, metodo: e.target.value as PagoNomina["metodo"] })}
          >
            {(["Transferencia", "Efectivo", "Cheque", "Otro"] as const).map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </Campo>
        <Campo label="Referencia" ayuda="N.º de transferencia o comprobante.">
          <input
            className={INPUT}
            value={p.referencia}
            onChange={(e) => setP({ ...p, referencia: e.target.value })}
          />
        </Campo>
        <Campo label="Observaciones" className="sm:col-span-2">
          <input
            className={INPUT}
            value={p.observaciones}
            onChange={(e) => setP({ ...p, observaciones: e.target.value })}
          />
        </Campo>
      </div>
    </DialogoFormulario>
  );
}

/* ───────────── Anticipos ───────────── */

function Anticipos({ n }: { n: ReturnType<typeof useNomina> }) {
  const [editando, setEditando] = useState<Anticipo | null>(null);
  const borrar = useBorrarDe("anticipos", "Anticipo eliminado");
  const descontado = (a: Anticipo) =>
    n.filas.some(
      (f) =>
        f.l.empleadoId === a.empleadoId &&
        f.l.periodo === a.periodo &&
        f.l.conceptos.some((c) => c.tipo === "Descuento" && /anticipo/i.test(c.nombre)),
    );
  const lista = [...n.anticipos].sort((a, b) => b.fecha.localeCompare(a.fecha));
  return (
    <>
      <Seccion
        titulo="Anticipos de sueldo"
        descripcion="Al crear la liquidación del período, el anticipo se agrega solo como descuento."
        sinPadding
        acciones={
          <Button
            size="sm"
            onClick={() =>
              setEditando({
                id: nuevoIdLocal("an"),
                empleadoId: "",
                periodo: periodoActual(),
                importe: 0,
                fecha: hoyISO(),
                observaciones: "",
              })
            }
          >
            <Plus className="mr-1 h-4 w-4" /> Registrar anticipo
          </Button>
        }
      >
        {lista.length === 0 ? (
          <div className="p-5">
            <Vacio titulo="Sin anticipos" />
          </div>
        ) : (
          <Tabla columnas={["Fecha", "Persona", "Se descuenta en", "Importe", "Situación", ""]}>
            {lista.map((a) => {
              const e = n.empleados.find((x) => x.id === a.empleadoId);
              return (
                <tr key={a.id} className="border-t border-border/60">
                  <td className="py-3 pl-5 pr-3 text-xs">{fecha(a.fecha)}</td>
                  <td className="px-3 py-3 font-semibold">
                    {e?.nombre ?? "—"}
                    {a.observaciones && (
                      <span className="block text-xs font-normal text-muted-foreground">
                        {a.observaciones}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-xs">{periodoTexto(a.periodo)}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-sm font-bold tabular-nums">
                    {importe(a.importe, e?.moneda)}
                  </td>
                  <td className="px-3 py-3">
                    <Pildora tono={descontado(a) ? "ok" : "alerta"}>
                      {descontado(a) ? "Descontado" : "Pendiente de descontar"}
                    </Pildora>
                  </td>
                  <td className="py-3 pl-3 pr-5 text-right whitespace-nowrap">
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Editar"
                      onClick={() => setEditando(a)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Eliminar"
                      onClick={() =>
                        confirmar("¿Eliminar este anticipo?") && borrar.mutate({ id: a.id })
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </Tabla>
        )}
      </Seccion>
      {editando && (
        <FormAnticipo
          key={editando.id}
          inicial={editando}
          n={n}
          onCerrar={() => setEditando(null)}
        />
      )}
    </>
  );
}

function FormAnticipo({
  inicial,
  n,
  onCerrar,
}: {
  inicial: Anticipo;
  n: ReturnType<typeof useNomina>;
  onCerrar: () => void;
}) {
  const [a, setA] = useState(inicial);
  const [error, setError] = useState<string | null>(null);
  const guardar = useGuardarEn("anticipos", "Anticipo guardado");
  return (
    <DialogoFormulario
      abierto
      titulo="Anticipo de sueldo"
      onCerrar={onCerrar}
      guardando={guardar.isPending}
      error={error}
      onGuardar={() => {
        if (!a.empleadoId) return setError("Elegí la persona.");
        if (a.importe <= 0) return setError("El importe tiene que ser mayor a cero.");
        guardar.mutate(
          { item: a, accion: `Anticipo a ${n.nombre(a.empleadoId)}` },
          { onSuccess: onCerrar },
        );
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo label="Persona" className="sm:col-span-2">
          <select
            className={INPUT}
            value={a.empleadoId}
            onChange={(e) => setA({ ...a, empleadoId: e.target.value })}
          >
            <option value="">Elegí una persona</option>
            {n.empleados
              .filter((e) => e.estado !== "Baja")
              .map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre}
                </option>
              ))}
          </select>
        </Campo>
        <Campo label="Importe">
          <input
            className={INPUT}
            type="number"
            min={0}
            value={a.importe}
            onChange={(e) => setA({ ...a, importe: Number(e.target.value) })}
          />
        </Campo>
        <Campo label="Fecha de entrega">
          <input
            className={INPUT}
            type="date"
            value={a.fecha}
            onChange={(e) => setA({ ...a, fecha: e.target.value })}
          />
        </Campo>
        <Campo label="Se descuenta en el período">
          <input
            className={INPUT}
            type="month"
            value={a.periodo}
            onChange={(e) => setA({ ...a, periodo: e.target.value })}
          />
        </Campo>
        <Campo label="Observaciones">
          <input
            className={INPUT}
            value={a.observaciones}
            onChange={(e) => setA({ ...a, observaciones: e.target.value })}
          />
        </Campo>
      </div>
    </DialogoFormulario>
  );
}

/* ───────────── Reportes ───────────── */

function Reportes({ n }: { n: ReturnType<typeof useNomina> }) {
  const [periodo, setPeriodo] = useState("");
  const [persona, setPersona] = useState("");
  const filas = n.filas.filter(
    (f) => (!periodo || f.l.periodo === periodo) && (!persona || f.l.empleadoId === persona),
  );
  const periodos = [...new Set(n.filas.map((f) => f.l.periodo))].sort().reverse();
  const suma = (k: "bruto" | "descuentos" | "neto" | "pagado" | "saldo") =>
    filas.reduce((s, f) => s + f[k], 0);
  const exportar = () =>
    descargarCSV(`nomina${periodo ? `-${periodo}` : ""}`, [
      [
        "Persona",
        "Período",
        "Régimen",
        "Bruto",
        "Descuentos",
        "Neto",
        "Pagado",
        "Saldo",
        "Estado de pago",
      ],
      ...filas.map((f) => [
        f.empleado?.nombre ?? "",
        f.l.periodo,
        f.l.jurisdiccion,
        f.bruto,
        f.descuentos,
        f.neto,
        f.pagado,
        f.saldo,
        f.estado,
      ]),
    ]);
  return (
    <Seccion
      titulo="Reporte de nómina"
      descripcion="Filtrá por período o persona y descargá el detalle en CSV (abre en Excel)."
      sinPadding
      acciones={
        <>
          <select
            className="h-9 rounded-xl border border-input bg-card px-3 text-xs font-semibold"
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            aria-label="Período"
          >
            <option value="">Todos los períodos</option>
            {periodos.map((p) => (
              <option key={p} value={p}>
                {periodoTexto(p)}
              </option>
            ))}
          </select>
          <select
            className="h-9 rounded-xl border border-input bg-card px-3 text-xs font-semibold"
            value={persona}
            onChange={(e) => setPersona(e.target.value)}
            aria-label="Persona"
          >
            <option value="">Todas las personas</option>
            {n.empleados.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}
          </select>
          <Button size="sm" variant="outline" onClick={exportar} disabled={!filas.length}>
            <Download className="mr-1 h-4 w-4" /> Exportar CSV
          </Button>
        </>
      }
    >
      {filas.length === 0 ? (
        <div className="p-5">
          <Vacio titulo="No hay datos para este filtro" />
        </div>
      ) : (
        <Tabla columnas={["Persona", "Período", "Bruto", "Descuentos", "Neto", "Pagado", "Saldo"]}>
          {filas.map((f) => (
            <tr key={f.l.id} className="border-t border-border/60">
              <td className="py-3 pl-5 pr-3 font-semibold">{f.empleado?.nombre ?? "—"}</td>
              <td className="px-3 py-3 text-xs">{periodoTexto(f.l.periodo)}</td>
              <td className="whitespace-nowrap px-3 py-3 text-xs tabular-nums">
                {importe(f.bruto, f.moneda)}
              </td>
              <td className="whitespace-nowrap px-3 py-3 text-xs tabular-nums">
                {importe(f.descuentos, f.moneda)}
              </td>
              <td className="whitespace-nowrap px-3 py-3 text-xs font-bold tabular-nums">
                {importe(f.neto, f.moneda)}
              </td>
              <td className="whitespace-nowrap px-3 py-3 text-xs tabular-nums">
                {importe(f.pagado, f.moneda)}
              </td>
              <td className="whitespace-nowrap py-3 pl-3 pr-5 text-xs tabular-nums">
                {importe(f.saldo, f.moneda)}
              </td>
            </tr>
          ))}
          <tr className="border-t-2 border-primary/20 bg-primary/[0.03] font-bold">
            <td className="py-3 pl-5 pr-3" colSpan={2}>
              Totales ({filas.length})
            </td>
            <td className="whitespace-nowrap px-3 py-3 text-xs tabular-nums">
              {importe(suma("bruto"))}
            </td>
            <td className="whitespace-nowrap px-3 py-3 text-xs tabular-nums">
              {importe(suma("descuentos"))}
            </td>
            <td className="whitespace-nowrap px-3 py-3 text-xs tabular-nums">
              {importe(suma("neto"))}
            </td>
            <td className="whitespace-nowrap px-3 py-3 text-xs tabular-nums">
              {importe(suma("pagado"))}
            </td>
            <td className="whitespace-nowrap py-3 pl-3 pr-5 text-xs tabular-nums">
              {importe(suma("saldo"))}
            </td>
          </tr>
        </Tabla>
      )}
    </Seccion>
  );
}
