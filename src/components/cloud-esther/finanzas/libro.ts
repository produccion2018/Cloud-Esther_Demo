import { useEquipo } from "@/lib/cloud-esther/equipo-store";
import {
  estadoComprobante,
  saldo,
  storeFacturacion,
  totalesComprobante,
  type MedioPago,
} from "@/lib/cloud-esther/facturacion-store";
import {
  calcularRecibo,
  legajoDe,
  marcas,
  nombrePeriodo,
  periodoActual,
  storeRRHH,
} from "@/lib/cloud-esther/rrhh-store";
import { storeInventario, totalOrden } from "@/lib/cloud-esther/inventario-store";
import { useTodosLosRegistros } from "@/components/cloud-esther/PacienteSecciones";
import {
  SUCURSAL_GENERAL,
  diaISO,
  storeFinanzas,
  type Categoria,
  type EstadoFinanzas,
  type TipoMov,
} from "@/lib/cloud-esther/finanzas-store";

/* Libro de Finanzas: une los movimientos propios con lo que viene de otros módulos
   (cobros de Facturación, obras sociales, caja diaria, nómina de RRHH). Nada se duplica:
   cada módulo sigue siendo el dueño de su dato y acá solo se lee. */

export type OrigenAsiento =
  | "Manual"
  | "Proveedores"
  | "Comisiones"
  | "Transferencia"
  | "Facturación"
  | "Obras sociales"
  | "Caja diaria"
  | "Nómina";

export type Asiento = {
  id: string;
  fecha: string;
  tipo: TipoMov;
  categoria: Categoria;
  concepto: string;
  monto: number;
  cuentaId: string;
  sucursal: string;
  origen: OrigenAsiento;
  editable: boolean;
  comprobante: string;
};

export function cuentaDeMedio(medio: MedioPago) {
  return medio === "Efectivo" ? "efectivo" : medio === "Mercado Pago" ? "mp" : "banco";
}

export type CobroEsperado = { fecha: string; concepto: string; monto: number; origen: string };
export type Sugerencia = {
  ref: string;
  proveedor: string;
  concepto: string;
  categoria: "Insumos" | "Laboratorio";
  sucursal: string;
  fecha: string;
  monto: number;
  origen: "Orden de compra" | "Laboratorio";
};

export function useLibro() {
  const fin = storeFinanzas.usar();
  const fac = storeFacturacion.usar();
  const rrhh = storeRRHH.usar();
  const inv = storeInventario.usar();
  const registros = useTodosLosRegistros();
  const { miembros, ausencias } = useEquipo();

  const asientos: Asiento[] = fin.movimientos.map((m) => ({
    ...m,
    editable: m.origen === "Manual",
  }));

  // Cobros registrados en Facturación (las obras sociales entran por su liquidación).
  for (const c of fac.comprobantes) {
    if (c.clase !== "Factura") continue;
    for (const p of c.pagos) {
      if (p.medio === "Obra social") continue;
      asientos.push({
        id: `fac:${c.id}:${p.id}`,
        fecha: p.fecha.slice(0, 10),
        tipo: "Ingreso",
        categoria: "Prestaciones",
        concepto: `Cobro ${c.tipo} ${String(c.puntoVenta).padStart(4, "0")}-${String(c.numero).padStart(8, "0")} · ${c.cliente.nombre}`,
        monto: p.monto,
        cuentaId: cuentaDeMedio(p.medio),
        sucursal: c.sucursal || SUCURSAL_GENERAL,
        origen: "Facturación",
        editable: false,
        comprobante: p.referencia,
      });
    }
  }
  for (const l of fac.liquidaciones) {
    if (!l.cobrada) continue;
    const monto = l.prestaciones.filter((p) => !p.debitado).reduce((a, p) => a + p.importe, 0);
    asientos.push({
      id: `os:${l.id}`,
      fecha: l.cobrada.slice(0, 10),
      tipo: "Ingreso",
      categoria: "Obras sociales",
      concepto: `Liquidación ${l.obraSocial} ${l.periodo}`,
      monto,
      cuentaId: "banco",
      sucursal: SUCURSAL_GENERAL,
      origen: "Obras sociales",
      editable: false,
      comprobante: "",
    });
  }
  // Egresos pagados con la caja del mostrador.
  for (const m of fac.movimientos) {
    if (m.tipo !== "Egreso") continue;
    const s = fac.sesiones.find((x) => x.id === m.sesionId);
    asientos.push({
      id: `caja:${m.id}`,
      fecha: m.fecha.slice(0, 10),
      tipo: "Egreso",
      categoria: /insumo|guante|descartable/i.test(m.concepto) ? "Insumos" : "Otros gastos",
      concepto: `${m.concepto} (caja)`,
      monto: m.monto,
      cuentaId: "efectivo",
      sucursal: s?.sucursal ?? SUCURSAL_GENERAL,
      origen: "Caja diaria",
      editable: false,
      comprobante: "",
    });
  }

  // Nómina: costo total (neto + cargas) de cada período pagado en RRHH.
  const activos = miembros.filter((m) => m.status !== "inactivo" && !rrhh.legajos[m.id]?.baja);
  const todas = marcas(rrhh.fichajes, miembros, rrhh.config.toleranciaMin);
  const costoPeriodo = (p: (typeof rrhh.periodos)[number]) =>
    Math.round(
      activos.reduce(
        (a, m) =>
          a +
          calcularRecibo(m, legajoDe(m, rrhh.legajos), p, rrhh.config, todas, ausencias).costoBase,
        0,
      ),
    );
  for (const p of rrhh.periodos) {
    if (p.estado !== "Pagada" || !p.pagado) continue;
    asientos.push({
      id: `nom:${p.periodo}`,
      fecha: p.pagado.slice(0, 10),
      tipo: "Egreso",
      categoria: "Sueldos y cargas sociales",
      concepto: `Sueldos y cargas · ${nombrePeriodo(p.periodo)}`,
      monto: costoPeriodo(p),
      cuentaId: "banco",
      sucursal: SUCURSAL_GENERAL,
      origen: "Nómina",
      editable: false,
      comprobante: "",
    });
  }
  const actual = rrhh.periodos.find((p) => p.periodo === periodoActual()) ?? {
    periodo: periodoActual(),
    estado: "Borrador" as const,
    pagado: "",
    ajustes: {},
  };
  const nominaPendiente = actual.estado === "Pagada" ? 0 : costoPeriodo(actual);

  asientos.sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id.localeCompare(a.id));

  // Lo que se espera cobrar: facturas con saldo y liquidaciones presentadas.
  const cobrosEsperados: CobroEsperado[] = [
    ...fac.comprobantes
      .filter((c) => c.clase === "Factura" && !c.anulada && saldo(c) > 0)
      .map((c) => ({
        fecha: estadoComprobante(c) === "Vencida" ? diaISO(3) : c.vencimiento || diaISO(7),
        concepto: `${c.cliente.nombre} · ${c.tipo}`,
        monto: saldo(c),
        origen: "Facturas por cobrar",
      })),
    ...fac.liquidaciones
      .filter((l) => l.estado === "Presentada")
      .map((l) => {
        const d = new Date(l.presentada || diaISO());
        d.setDate(d.getDate() + 30);
        return {
          fecha: d.toISOString().slice(0, 10),
          concepto: `${l.obraSocial} ${l.periodo}`,
          monto: l.prestaciones.filter((p) => !p.debitado).reduce((a, p) => a + p.importe, 0),
          origen: "Obras sociales",
        };
      }),
  ];

  // Compras de Inventario recibidas y trabajos de laboratorio entregados sin cargar como deuda.
  const sugerencias: Sugerencia[] = [
    ...inv.ordenes
      .filter((o) => o.estado === "Recibida" && !fin.ordenesRegistradas.includes(o.id))
      .map((o) => ({
        ref: `oc:${o.id}`,
        proveedor: inv.proveedores.find((p) => p.id === o.proveedorId)?.nombre ?? "Proveedor",
        concepto: `Orden de compra ${o.id}${o.nota ? ` · ${o.nota}` : ""}`,
        categoria: "Insumos" as const,
        sucursal: o.sucursal,
        fecha: o.fecha,
        monto: totalOrden(o),
        origen: "Orden de compra" as const,
      })),
    ...Object.entries(registros).flatMap(([pid, r]) =>
      r.laboratorio
        .filter(
          (t) =>
            t.costo > 0 &&
            (t.estado === "Entregado" || t.estado === "Listo para retirar") &&
            !fin.laboratorioRegistrado.includes(`${pid}:${t.id}`),
        )
        .map((t) => ({
          ref: `lab:${pid}:${t.id}`,
          proveedor: t.proveedor || "Laboratorio",
          concepto: `${t.tipo}${t.pieza ? ` pieza ${t.pieza}` : ""}`,
          categoria: "Laboratorio" as const,
          sucursal: SUCURSAL_GENERAL,
          fecha: t.fechaEntregaEstimada || t.fechaEnvio,
          monto: t.costo,
          origen: "Laboratorio" as const,
        })),
    ),
  ];

  const saldoCuenta = (id: string) => {
    const c = fin.cuentas.find((x) => x.id === id);
    return (
      (c?.saldoInicial ?? 0) +
      asientos
        .filter((a) => a.cuentaId === id)
        .reduce((s, a) => s + (a.tipo === "Ingreso" ? a.monto : -a.monto), 0)
    );
  };

  return {
    fin,
    fac,
    asientos,
    /** Sin transferencias internas: es lo que cuenta para resultados y presupuesto. */
    operativos: asientos.filter((a) => a.origen !== "Transferencia"),
    cobrosEsperados,
    sugerencias,
    nominaPendiente,
    saldoCuenta,
    comprobantes: fac.comprobantes.filter((c) => c.clase === "Factura" && !c.anulada),
    totalComprobante: (c: (typeof fac.comprobantes)[number]) => totalesComprobante(c).total,
  };
}

export type Libro = ReturnType<typeof useLibro>;

export function delMes(asientos: Asiento[], mes: string) {
  return asientos.filter((a) => a.fecha.startsWith(mes));
}
export function sumar(asientos: Asiento[], tipo: TipoMov) {
  return asientos.filter((a) => a.tipo === tipo).reduce((s, a) => s + a.monto, 0);
}
export function porCategoria(asientos: Asiento[], tipo: TipoMov) {
  const m = new Map<Categoria, number>();
  for (const a of asientos)
    if (a.tipo === tipo) m.set(a.categoria, (m.get(a.categoria) ?? 0) + a.monto);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}
export type { EstadoFinanzas };
