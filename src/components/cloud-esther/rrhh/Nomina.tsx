import { useRef, useState } from "react";
import {
  AlertTriangle,
  Banknote,
  Building2,
  Check,
  CircleDollarSign,
  Download,
  FileSpreadsheet,
  FileText,
  Globe2,
  Landmark,
  Lock,
  Pencil,
  Plus,
  Printer,
  Receipt,
  Send,
  Upload,
  Users,
} from "lucide-react";
import { useEquipo } from "@/lib/cloud-esther/equipo-store";
import type { TeamMember } from "@/lib/cloud-esther/equipo-profesional-data";
import {
  MONEDA_BASE,
  auditar,
  calcularRecibo,
  diaISO,
  legajoDe,
  marcas,
  nombreDe,
  nombrePeriodo,
  periodoActual,
  periodoAnterior,
  setRRHH,
  storeRRHH,
  type AjusteRecibo,
  type EstadoLote,
  type EstadoPeriodo,
  type Legajo,
  type LotePago,
  type Recibo,
} from "@/lib/cloud-esther/rrhh-store";
import { contratoDe, formatoMoneda, paisDe, type PaisId } from "@/lib/cloud-esther/nomina-paises";
import {
  Acciones,
  BTN_ICONO,
  BTN_PRIMARIO,
  BTN_SECUNDARIO,
  CHIP,
  Encabezado,
  Field,
  INPUT,
  Mini,
  Modal,
  Pill,
  ars,
  fecha,
  imprimirHTML,
  type Ctx,
} from "./ui";
import { descargarExcel, leerPlanilla } from "./excel";

const ESTILO: Record<EstadoPeriodo, string> = {
  Borrador: "bg-muted text-muted-foreground",
  Liquidada: "bg-violet-100 text-violet-700",
  Pagada: "bg-emerald-100 text-emerald-700",
};
const ESTILO_LOTE: Record<EstadoLote, string> = {
  Preparado: "bg-amber-100 text-amber-700",
  "Enviado al banco": "bg-sky-100 text-sky-700",
  Pagado: "bg-emerald-100 text-emerald-700",
};

const baseEtiqueta = (r: Recibo, l: Legajo) =>
  r.esquema === "Por hora"
    ? `Horas trabajadas (${r.horasTrabajadas} h × ${formatoMoneda(l.valorHora, r.moneda)})`
    : r.clase === "independiente"
      ? "Honorarios"
      : "Sueldo básico";

export function imprimirRecibo(r: Recibo, m: TeamMember, l: Legajo, clinica: string) {
  const deps = r.clase === "dependencia";
  const $ = (n: number) => formatoMoneda(n, r.moneda);
  const fila = (c: string, v: number, desc = false) =>
    v
      ? `<tr><td>${c}</td><td class="r">${desc ? "" : $(v)}</td><td class="r">${desc ? $(v) : ""}</td></tr>`
      : "";
  const pais = paisDe(r.pais);
  imprimirHTML(
    `Recibo ${nombreDe(m)} ${r.periodo}`,
    `<h1>${deps ? "Recibo de haberes" : "Liquidación de honorarios"}</h1><p>${clinica} · Período ${nombrePeriodo(r.periodo)} · ${pais.bandera} ${pais.nombre} (${r.moneda})</p>
<div class="meta"><div><b>${nombreDe(m)}</b><br>Legajo ${l.numero} · ${l.cuil || "—"}<br>${l.puesto} · ${l.sucursal}</div><div>Ingreso: ${fecha(l.ingreso)}<br>Contrato: ${r.modalidad}<br>Forma de pago: ${r.esquema}<br>${pais.cuenta}: ${l.cbu || "—"}</div></div>
<table style="margin-top:18px"><thead><tr><th>Concepto</th><th class="r">Haberes</th><th class="r">Descuentos</th></tr></thead><tbody>
${fila(baseEtiqueta(r, l), r.basico)}${fila("Antigüedad", r.antiguedad)}${fila("Presentismo", r.presentismo)}${fila("Horas extra", r.horasExtra)}${fila("Bono", r.bono)}${fila("Comisiones sobre producción", r.comisiones)}
${fila("Descuento", r.descuento, true)}${fila(deps ? "Aportes a cargo del trabajador" : "Aportes", r.aportes, true)}${fila("Retención de impuestos", r.retencion, true)}${fila("Adelanto", r.adelanto, true)}
<tr class="tot"><td>Neto a cobrar</td><td class="r" colspan="2">${$(r.neto)}</td></tr></tbody></table>
${r.pierdePresentismo ? `<p style="color:#b45309">No corresponde presentismo: ${r.llegadasTarde} llegadas tarde en el mes.</p>` : ""}
${r.requiereFactura ? "<p>Pago contra factura / cuenta de cobro del prestador.</p>" : ""}
<div class="firma"><span>Firma del empleador</span><span>Recibí conforme · ${nombreDe(m)}</span></div>`,
  );
}

type Novedad = { miembroId: string; nombre: string; ajuste: AjusteRecibo; cambios: string[] };

export function Nomina({ ctx }: { ctx: Ctx }) {
  const { miembros, ausencias } = useEquipo();
  const rrhh = storeRRHH.usar();
  const { legajos, periodos, config, fichajes, flujos } = rrhh;
  const lotes = rrhh.lotes ?? [];
  const [sel, setSel] = useState(periodos.at(-1)?.periodo ?? periodoActual());
  const [pais, setPais] = useState<"" | PaisId>("");
  const [vista, setVista] = useState<"liquidacion" | "pagos">("liquidacion");
  const [ajustar, setAjustar] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState<"liquidar" | null>(null);
  const [novedades, setNovedades] = useState<Novedad[] | null>(null);
  const archivo = useRef<HTMLInputElement>(null);
  const periodo = periodos.find((p) => p.periodo === sel) ?? periodos.at(-1)!;
  const activos = miembros.filter((m) => {
    const l = legajoDe(m, legajos);
    const bajaAntes = l.baja && l.baja.fecha.slice(0, 7) < periodo.periodo;
    return (
      m.status !== "pendiente" &&
      !bajaAntes &&
      (m.status !== "inactivo" || !!l.baja) &&
      l.ingreso.slice(0, 7) <= periodo.periodo &&
      ctx.sucursales.includes(l.sucursal)
    );
  });
  const todas = marcas(fichajes, miembros, config.toleranciaMin);
  const todos = activos.map((m) => {
    const l = legajoDe(m, legajos);
    return { m, l, r: calcularRecibo(m, l, periodo, config, todas, ausencias) };
  });
  const paises = [...new Set(todos.map((x) => x.r.pais))];
  const recibos = todos.filter((x) => !pais || x.r.pais === pais);
  const editable = periodo.estado === "Borrador";
  const siguiente = periodoAnterior(periodos.at(-1)!.periodo, -1);
  const clinica = "Clínica Dental Esther";
  const lotePeriodo = lotes.find((x) => x.periodo === periodo.periodo);
  const porMoneda = Object.entries(
    recibos.reduce<Record<string, { neto: number; costo: number }>>((a, { r }) => {
      const t = a[r.moneda] ?? { neto: 0, costo: 0 };
      t.neto += r.neto;
      t.costo += r.costo;
      a[r.moneda] = t;
      return a;
    }, {}),
  );
  const netoBase = recibos.reduce((a, x) => a + x.r.netoBase, 0);
  const costoBase = recibos.reduce((a, x) => a + x.r.costoBase, 0);

  const plantilla = () =>
    descargarExcel(`novedades-${periodo.periodo}.xlsx`, [
      {
        nombre: "Novedades",
        nota: `Novedades de ${nombrePeriodo(periodo.periodo)}. Completá las columnas en violeta claro y subí el archivo en Nómina → Importar novedades. Dejá vacío lo que no cambia.`,
        columnas: [
          { titulo: "Legajo", clave: "legajo", ancho: 10 },
          { titulo: "Nombre", clave: "nombre", ancho: 22 },
          { titulo: "País", clave: "pais", ancho: 12 },
          { titulo: "Contrato", clave: "contrato", ancho: 24 },
          { titulo: "Forma de pago", clave: "esquema", ancho: 14 },
          { titulo: "Moneda", clave: "moneda", ancho: 9 },
          { titulo: "Horas trabajadas", clave: "horas", ancho: 16 },
          { titulo: "Horas extra", clave: "horasExtra", ancho: 12 },
          { titulo: "Bono", clave: "bono", ancho: 12, moneda: true },
          { titulo: "Descuento", clave: "descuento", ancho: 12, moneda: true },
          { titulo: "Adelanto", clave: "adelanto", ancho: 12, moneda: true },
          { titulo: "Producción", clave: "produccion", ancho: 14, moneda: true },
          { titulo: "Nota", clave: "nota", ancho: 26 },
        ],
        filas: todos.map(({ m, l, r }) => {
          const aj = periodo.ajustes[m.id];
          return {
            legajo: l.numero,
            nombre: nombreDe(m),
            pais: paisDe(l.pais).nombre,
            contrato: r.modalidad,
            esquema: r.esquema,
            moneda: r.moneda,
            horas: r.esquema === "Por hora" ? r.horasTrabajadas : "",
            horasExtra: aj?.horasExtra || "",
            bono: aj?.bono || "",
            descuento: aj?.descuento || "",
            adelanto: aj?.adelanto || "",
            produccion:
              r.esquema === "Por comisión" || r.esquema === "Mixto" ? (aj?.produccion ?? "") : "",
            nota: aj?.nota ?? "",
          };
        }),
      },
    ]);

  const exportar = () => {
    const hojaPais = (pid: PaisId) => {
      const lista = todos.filter((x) => x.r.pais === pid);
      const p = paisDe(pid);
      const suma = (k: keyof Recibo) => lista.reduce((a, x) => a + (x.r[k] as number), 0);
      return {
        nombre: `${p.nombre} (${p.moneda})`,
        nota: `Liquidación ${nombrePeriodo(periodo.periodo)} · ${p.nombre} · importes en ${p.moneda} · estado ${periodo.estado}`,
        columnas: [
          { titulo: "Legajo", clave: "legajo", ancho: 10 },
          { titulo: "Nombre", clave: "nombre", ancho: 22 },
          { titulo: "Contrato", clave: "contrato", ancho: 24 },
          { titulo: "Forma de pago", clave: "esquema", ancho: 14 },
          { titulo: "Horas", clave: "horas", ancho: 8 },
          { titulo: "Base", clave: "basico", moneda: true },
          { titulo: "Antigüedad", clave: "antiguedad", moneda: true },
          { titulo: "Presentismo", clave: "presentismo", moneda: true },
          { titulo: "Horas extra", clave: "horasExtra", moneda: true },
          { titulo: "Bono", clave: "bono", moneda: true },
          { titulo: "Comisiones", clave: "comisiones", moneda: true },
          { titulo: "Descuento", clave: "descuento", moneda: true },
          { titulo: "Bruto", clave: "bruto", moneda: true },
          { titulo: "Aportes", clave: "aportes", moneda: true },
          { titulo: "Retención", clave: "retencion", moneda: true },
          { titulo: "Adelanto", clave: "adelanto", moneda: true },
          { titulo: "Neto", clave: "neto", moneda: true },
          { titulo: "Contribuciones", clave: "contribuciones", moneda: true },
          { titulo: "Costo total", clave: "costo", moneda: true },
          { titulo: p.cuenta, clave: "cuenta", ancho: 30 },
          { titulo: "Requiere factura", clave: "factura", ancho: 14 },
        ],
        filas: lista.map(({ m, l, r }) => ({
          legajo: l.numero,
          nombre: nombreDe(m),
          contrato: r.modalidad,
          esquema: r.esquema,
          horas: r.horasTrabajadas,
          basico: r.basico,
          antiguedad: r.antiguedad,
          presentismo: r.presentismo,
          horasExtra: r.horasExtra,
          bono: r.bono,
          comisiones: r.comisiones,
          descuento: r.descuento,
          bruto: r.bruto,
          aportes: r.aportes,
          retencion: r.retencion,
          adelanto: r.adelanto,
          neto: r.neto,
          contribuciones: r.contribuciones,
          costo: r.costo,
          cuenta: l.cbu,
          factura: r.requiereFactura ? "Sí" : "No",
        })),
        totales: {
          nombre: "Total",
          bruto: suma("bruto"),
          aportes: suma("aportes"),
          retencion: suma("retencion"),
          neto: suma("neto"),
          contribuciones: suma("contribuciones"),
          costo: suma("costo"),
        },
      };
    };
    void descargarExcel(`nomina-${periodo.periodo}.xlsx`, [
      {
        nombre: "Resumen",
        nota: `Nómina ${nombrePeriodo(periodo.periodo)} · consolidado en ${MONEDA_BASE} con las cotizaciones de configuración`,
        columnas: [
          { titulo: "País", clave: "pais", ancho: 18 },
          { titulo: "Moneda", clave: "moneda", ancho: 9 },
          { titulo: "Personas", clave: "personas", ancho: 10 },
          { titulo: "Neto", clave: "neto", moneda: true, ancho: 16 },
          { titulo: "Costo total", clave: "costo", moneda: true, ancho: 16 },
          { titulo: `Neto en ${MONEDA_BASE}`, clave: "netoBase", moneda: true, ancho: 18 },
          { titulo: `Costo en ${MONEDA_BASE}`, clave: "costoBase", moneda: true, ancho: 18 },
        ],
        filas: paises.map((pid) => {
          const lista = todos.filter((x) => x.r.pais === pid);
          return {
            pais: paisDe(pid).nombre,
            moneda: paisDe(pid).moneda,
            personas: lista.length,
            neto: lista.reduce((a, x) => a + x.r.neto, 0),
            costo: lista.reduce((a, x) => a + x.r.costo, 0),
            netoBase: Math.round(lista.reduce((a, x) => a + x.r.netoBase, 0)),
            costoBase: Math.round(lista.reduce((a, x) => a + x.r.costoBase, 0)),
          };
        }),
        totales: {
          pais: "Total",
          netoBase: Math.round(todos.reduce((a, x) => a + x.r.netoBase, 0)),
          costoBase: Math.round(todos.reduce((a, x) => a + x.r.costoBase, 0)),
        },
      },
      ...paises.map(hojaPais),
    ]).then(() => ctx.onToast("Excel de la liquidación descargado"));
    auditar(ctx.usuario, "Nómina", `Exportó a Excel ${nombrePeriodo(periodo.periodo)}`);
  };

  const importar = async (f: File) => {
    try {
      const filas = await leerPlanilla(f);
      const num = (v: unknown) => {
        const n =
          typeof v === "number"
            ? v
            : Number(
                String(v ?? "")
                  .replace(/\./g, "")
                  .replace(",", "."),
              );
        return Number.isFinite(n) ? n : 0;
      };
      const lista: Novedad[] = [];
      for (const fila of filas) {
        const leg = String(fila["Legajo"] ?? "").trim();
        const nom = String(fila["Nombre"] ?? "")
          .trim()
          .toLocaleLowerCase("es");
        const x = todos.find(
          ({ m, l }) =>
            (leg && l.numero === leg) || (nom && nombreDe(m).toLocaleLowerCase("es") === nom),
        );
        if (!x) continue;
        const prev = periodo.ajustes[x.m.id] ?? { horasExtra: 0, bono: 0, adelanto: 0 };
        const aj: AjusteRecibo = { ...prev };
        const cambios: string[] = [];
        const campo = (
          col: string,
          k: "horasExtra" | "bono" | "adelanto" | "descuento" | "horas" | "produccion",
          etiqueta: string,
        ) => {
          const v = fila[col];
          if (v === undefined || v === "") return;
          const n = num(v);
          if (n === (prev[k] ?? 0)) return;
          aj[k] = n;
          cambios.push(`${etiqueta}: ${n.toLocaleString("es-AR")}`);
        };
        campo("Horas trabajadas", "horas", "horas");
        campo("Horas extra", "horasExtra", "extras");
        campo("Bono", "bono", "bono");
        campo("Descuento", "descuento", "descuento");
        campo("Adelanto", "adelanto", "adelanto");
        campo("Producción", "produccion", "producción");
        const nota = String(fila["Nota"] ?? "").trim();
        if (nota && nota !== prev.nota) {
          aj.nota = nota;
          cambios.push(`nota: ${nota}`);
        }
        if (cambios.length)
          lista.push({ miembroId: x.m.id, nombre: nombreDe(x.m), ajuste: aj, cambios });
      }
      if (!lista.length) return ctx.onToast("El archivo no trae cambios para este período.");
      setNovedades(lista);
    } catch {
      ctx.onToast("No pude leer el archivo. Usá la plantilla de novedades (.xlsx o .csv).");
    }
  };

  const prepararPago = () => {
    const numero = `LP-${String(lotes.length + 1).padStart(4, "0")}`;
    const lote: LotePago = {
      id: numero,
      periodo: periodo.periodo,
      creado: new Date().toISOString(),
      estado: "Preparado",
      items: todos
        .filter((x) => x.r.neto > 0)
        .map(({ m, l, r }) => ({
          miembroId: m.id,
          moneda: r.moneda,
          monto: r.neto,
          cuenta: l.cbu,
          requiereFactura: r.requiereFactura,
          factura: "",
          pagado: false,
        })),
    };
    setRRHH("lotes", (p) => [...(p ?? []), lote]);
    auditar(ctx.usuario, "Pago", `Preparó el lote ${numero} (${lote.items.length} pagos)`);
    setVista("pagos");
    ctx.onToast(`Lote ${numero} preparado: revisá facturas y enviá al banco`);
  };

  return (
    <div className="space-y-3">
      <Encabezado
        icon={Receipt}
        titulo="Nómina y pagos"
        descripcion="Liquidación por país, tipo de contrato y forma de pago. Novedades desde Excel y pago por lotes."
      >
        <button type="button" className={BTN_SECUNDARIO} onClick={() => void plantilla()}>
          <FileSpreadsheet className="size-4" />
          Plantilla de novedades
        </button>
        {editable && (
          <>
            <button
              type="button"
              className={BTN_SECUNDARIO}
              onClick={() => archivo.current?.click()}
            >
              <Upload className="size-4" />
              Importar novedades
            </button>
            <input
              ref={archivo}
              type="file"
              accept=".xlsx,.csv"
              className="hidden"
              aria-label="Importar novedades de nómina"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void importar(f);
                e.target.value = "";
              }}
            />
          </>
        )}
        <button type="button" className={BTN_SECUNDARIO} onClick={exportar}>
          <Download className="size-4" />
          Exportar a Excel
        </button>
        {periodo.estado === "Borrador" && (
          <button type="button" className={BTN_PRIMARIO} onClick={() => setConfirmar("liquidar")}>
            <Lock className="size-4" />
            Liquidar período
          </button>
        )}
        {periodo.estado === "Liquidada" && !lotePeriodo && (
          <button type="button" className={BTN_PRIMARIO} onClick={prepararPago}>
            <Banknote className="size-4" />
            Preparar pago
          </button>
        )}
        {periodo.estado === "Pagada" && periodo.periodo === periodos.at(-1)?.periodo && (
          <button
            type="button"
            className={BTN_PRIMARIO}
            onClick={() => {
              setRRHH("periodos", (p) => [
                ...p,
                { periodo: siguiente, estado: "Borrador", pagado: "", ajustes: {} },
              ]);
              setSel(siguiente);
              auditar(ctx.usuario, "Nómina", `Abrió el período ${nombrePeriodo(siguiente)}`);
              ctx.onToast(`Período ${nombrePeriodo(siguiente)} abierto`);
            }}
          >
            <Plus className="size-4" />
            Abrir {nombrePeriodo(siguiente)}
          </button>
        )}
      </Encabezado>

      <div className="card-grad flex flex-wrap items-center gap-1 p-2">
        {periodos.map((p) => (
          <button
            key={p.periodo}
            type="button"
            className={CHIP(p.periodo === periodo.periodo)}
            onClick={() => setSel(p.periodo)}
          >
            {nombrePeriodo(p.periodo)}
            <span
              className={`ml-1 rounded-full px-1.5 text-[9px] ${p.periodo === periodo.periodo ? "bg-white/25" : ESTILO[p.estado]}`}
            >
              {p.estado}
            </span>
          </button>
        ))}
        <span className="mx-1 h-5 w-px bg-primary/15" />
        <button
          type="button"
          className={CHIP(vista === "liquidacion")}
          onClick={() => setVista("liquidacion")}
        >
          <Receipt className="size-3.5" /> Liquidación
        </button>
        <button type="button" className={CHIP(vista === "pagos")} onClick={() => setVista("pagos")}>
          <Landmark className="size-3.5" /> Pagos {lotes.length ? `(${lotes.length})` : ""}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Mini
          label={`Neto a pagar (${MONEDA_BASE})`}
          valor={ars(netoBase)}
          icon={Banknote}
          tono="text-primary"
          sub={
            porMoneda.length > 1 ? `En ${porMoneda.length} monedas` : `${recibos.length} personas`
          }
        />
        <Mini
          label={`Costo laboral (${MONEDA_BASE})`}
          valor={ars(costoBase)}
          icon={CircleDollarSign}
          tono="text-fuchsia-600"
          sub={
            periodo.pagado ? `Pagado el ${fecha(periodo.pagado)}` : `Pago el día ${config.diaPago}`
          }
        />
        <Mini
          label="Personas"
          valor={String(recibos.length)}
          icon={Users}
          sub={`${recibos.filter((x) => x.r.clase === "dependencia").length} en relación de dependencia · ${recibos.filter((x) => x.r.clase === "independiente").length} independientes`}
        />
        <Mini
          label="Países"
          valor={String(paises.length)}
          icon={Globe2}
          sub={paises.map((p) => paisDe(p).bandera).join(" ")}
        />
      </div>

      {porMoneda.length > 1 && (
        <div className="card-grad flex flex-wrap gap-2 p-3">
          {porMoneda.map(([mon, t]) => (
            <span
              key={mon}
              className="rounded-xl bg-white/85 px-3 py-1.5 text-xs ring-1 ring-primary/10"
            >
              <b className="text-primary">{formatoMoneda(t.neto, mon)}</b>{" "}
              <span className="text-muted-foreground">
                neto · costo {formatoMoneda(t.costo, mon)}
              </span>
            </span>
          ))}
        </div>
      )}

      {vista === "pagos" ? (
        <Pagos ctx={ctx} lotes={lotes} />
      ) : (
        <div className="card-grad p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold">
              {nombrePeriodo(periodo.periodo)}{" "}
              <Pill clase={ESTILO[periodo.estado]}>{periodo.estado}</Pill>
            </p>
            <div className="flex flex-wrap gap-1">
              <button type="button" className={CHIP(!pais)} onClick={() => setPais("")}>
                Todos los países
              </button>
              {paises.map((p) => (
                <button
                  key={p}
                  type="button"
                  className={CHIP(pais === p)}
                  onClick={() => setPais(p)}
                >
                  {paisDe(p).bandera} {paisDe(p).nombre}
                </button>
              ))}
            </div>
          </div>
          <div className="scroll-sutil mt-3 overflow-x-auto">
            <table className="w-full min-w-[980px] text-xs">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                  <th className="pb-2 font-semibold">Persona</th>
                  <th className="pb-2 text-right font-semibold">Base</th>
                  <th className="pb-2 text-right font-semibold">Adicionales</th>
                  <th className="pb-2 text-right font-semibold">Extras / bono / com.</th>
                  <th className="pb-2 text-right font-semibold">Descuento</th>
                  <th className="pb-2 text-right font-semibold">Aportes y ret.</th>
                  <th className="pb-2 text-right font-semibold">Adelanto</th>
                  <th className="pb-2 text-right font-semibold">Neto</th>
                  <th className="pb-2 text-right font-semibold">Costo</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              {(pais ? [pais] : paises).map((pid) => {
                const p = paisDe(pid);
                const lista = recibos.filter((x) => x.r.pais === pid);
                const $ = (n: number) => formatoMoneda(n, p.moneda);
                return (
                  <tbody key={pid}>
                    <tr>
                      <td colSpan={10} className="pb-1 pt-3">
                        <span className="inline-flex items-center gap-2 rounded-full bg-primary/[0.07] px-3 py-1 text-[11px] font-semibold text-primary">
                          {p.bandera} {p.nombre} · {p.moneda} · {lista.length}{" "}
                          {lista.length === 1 ? "persona" : "personas"} · neto{" "}
                          {$(lista.reduce((a, x) => a + x.r.neto, 0))}
                        </span>
                      </td>
                    </tr>
                    {lista.map(({ m, l, r }) => (
                      <tr key={m.id} className="border-t border-primary/10">
                        <td className="py-2 pr-2">
                          <p className="font-semibold">{nombreDe(m)}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {r.modalidad} · {r.esquema}
                            {r.esquema === "Por hora" ? ` · ${r.horasTrabajadas} h` : ""}
                            {l.baja ? " · baja en el período" : ""}
                          </p>
                          {periodo.ajustes[m.id]?.nota && (
                            <p className="text-[10px] italic text-muted-foreground">
                              “{periodo.ajustes[m.id]?.nota}”
                            </p>
                          )}
                        </td>
                        <td className="py-2 text-right">{$(r.basico)}</td>
                        <td className="py-2 text-right">
                          {r.pierdePresentismo ? (
                            <Pill clase="bg-orange-100 text-orange-700">Pierde presentismo</Pill>
                          ) : r.antiguedad + r.presentismo ? (
                            $(r.antiguedad + r.presentismo)
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="py-2 text-right">
                          {r.horasExtra + r.bono + r.comisiones
                            ? $(r.horasExtra + r.bono + r.comisiones)
                            : "—"}
                        </td>
                        <td className="py-2 text-right text-rose-600">
                          {r.descuento ? `−${$(r.descuento)}` : "—"}
                        </td>
                        <td className="py-2 text-right text-rose-600">
                          {r.aportes + r.retencion ? `−${$(r.aportes + r.retencion)}` : "—"}
                        </td>
                        <td className="py-2 text-right text-rose-600">
                          {r.adelanto ? `−${$(r.adelanto)}` : "—"}
                        </td>
                        <td className="py-2 text-right text-sm font-bold text-primary">
                          {$(r.neto)}
                        </td>
                        <td className="py-2 text-right text-muted-foreground">{$(r.costo)}</td>
                        <td className="py-2 pl-2">
                          <div className="flex justify-end gap-1">
                            {editable && (
                              <button
                                type="button"
                                aria-label={`Ajustar recibo de ${nombreDe(m)}`}
                                className={BTN_ICONO}
                                onClick={() => setAjustar(m.id)}
                              >
                                <Pencil className="size-3.5" />
                              </button>
                            )}
                            <button
                              type="button"
                              aria-label={`Imprimir recibo de ${nombreDe(m)}`}
                              className={BTN_ICONO}
                              onClick={() => imprimirRecibo(r, m, l, clinica)}
                            >
                              <Printer className="size-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                );
              })}
            </table>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Cada país usa sus propios aportes, contribuciones y retenciones según el tipo de
            contrato (editables en Reportes y ajustes → Configuración). En Argentina se suman
            antigüedad ({config.antiguedadPct}% por año) y presentismo ({config.presentismoPct}%, se
            pierde con 3 llegadas tarde). Los independientes cobran contra factura.
          </p>
        </div>
      )}

      {ajustar &&
        (() => {
          const x = todos.find((t) => t.m.id === ajustar);
          if (!x) return null;
          return (
            <Modal titulo={`Novedades de ${nombreDe(x.m)}`} onClose={() => setAjustar(null)}>
              <AjusteForm
                recibo={x.r}
                l={x.l}
                inicial={periodo.ajustes[ajustar] ?? { horasExtra: 0, bono: 0, adelanto: 0 }}
                onCancel={() => setAjustar(null)}
                onGuardar={(a) => {
                  setRRHH("periodos", (p) =>
                    p.map((y) =>
                      y.periodo === periodo.periodo
                        ? { ...y, ajustes: { ...y.ajustes, [ajustar]: a } }
                        : y,
                    ),
                  );
                  auditar(
                    ctx.usuario,
                    "Nómina",
                    `Novedades de ${nombreDe(x.m)}: ${a.horasExtra} h extra, bono ${a.bono}, descuento ${a.descuento ?? 0}, adelanto ${a.adelanto}`,
                  );
                  setAjustar(null);
                  ctx.onToast("Recibo recalculado");
                }}
              />
            </Modal>
          );
        })()}
      {novedades && (
        <Modal titulo="Novedades importadas" onClose={() => setNovedades(null)} ancho="max-w-2xl">
          <p className="text-sm text-muted-foreground">
            Revisá los cambios antes de aplicarlos a {nombrePeriodo(periodo.periodo)}.
          </p>
          <ul className="scroll-sutil mt-3 max-h-[50vh] space-y-1.5 overflow-y-auto">
            {novedades.map((n) => (
              <li
                key={n.miembroId}
                className="rounded-xl bg-primary/[0.04] px-3 py-2 ring-1 ring-primary/10"
              >
                <p className="text-sm font-semibold">{n.nombre}</p>
                <p className="text-[11px] text-muted-foreground">{n.cambios.join(" · ")}</p>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" className={BTN_SECUNDARIO} onClick={() => setNovedades(null)}>
              Cancelar
            </button>
            <button
              type="button"
              className={BTN_PRIMARIO}
              onClick={() => {
                setRRHH("periodos", (p) =>
                  p.map((y) =>
                    y.periodo === periodo.periodo
                      ? {
                          ...y,
                          ajustes: {
                            ...y.ajustes,
                            ...Object.fromEntries(novedades.map((n) => [n.miembroId, n.ajuste])),
                          },
                        }
                      : y,
                  ),
                );
                auditar(
                  ctx.usuario,
                  "Nómina",
                  `Importó novedades de ${novedades.length} personas desde Excel`,
                );
                ctx.onToast(
                  `Novedades aplicadas a ${novedades.length} personas: recibos recalculados`,
                );
                setNovedades(null);
              }}
            >
              <Check className="size-4" />
              Aplicar {novedades.length} cambios
            </button>
          </div>
        </Modal>
      )}
      {confirmar && (
        <Modal
          titulo={`Liquidar ${nombrePeriodo(periodo.periodo)}`}
          onClose={() => setConfirmar(null)}
        >
          <p className="text-sm text-muted-foreground">
            Se cierran {todos.length} recibos de {paises.length}{" "}
            {paises.length === 1 ? "país" : "países"} por{" "}
            {ars(todos.reduce((a, x) => a + x.r.netoBase, 0))} netos (equivalente en {MONEDA_BASE}).
            Después se prepara el lote de pago.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" className={BTN_SECUNDARIO} onClick={() => setConfirmar(null)}>
              Cancelar
            </button>
            <button
              type="button"
              className={BTN_PRIMARIO}
              onClick={() => {
                setRRHH("periodos", (p) =>
                  p.map((x) => (x.periodo === periodo.periodo ? { ...x, estado: "Liquidada" } : x)),
                );
                auditar(
                  ctx.usuario,
                  "Nómina",
                  `Período ${nombrePeriodo(periodo.periodo)} liquidado`,
                );
                setConfirmar(null);
                ctx.onToast("Período liquidado: ahora podés preparar el pago");
              }}
            >
              <Lock className="size-4" />
              Confirmar
            </button>
          </div>
        </Modal>
      )}
      {flujos.find((f) => f.id === "f5")?.activo === false && vista === "pagos" && (
        <p className="text-[11px] text-muted-foreground">
          El envío automático de recibos está desactivado.
        </p>
      )}
    </div>
  );
}

/* ───────────── Pagos por lote ───────────── */

function Pagos({ ctx, lotes }: { ctx: Ctx; lotes: LotePago[] }) {
  const { miembros } = useEquipo();
  const { legajos, flujos } = storeRRHH.usar();
  if (!lotes.length)
    return (
      <div className="card-grad flex flex-col items-center gap-2 p-8 text-center">
        <span className="grid size-10 place-items-center rounded-full bg-primary/10 text-primary">
          <Landmark className="size-5" />
        </span>
        <p className="text-sm text-muted-foreground">
          Todavía no hay lotes de pago. Liquidá el período y tocá “Preparar pago”.
        </p>
      </div>
    );
  const nombre = (id: string) => {
    const m = miembros.find((x) => x.id === id);
    return m ? nombreDe(m) : "—";
  };
  const actualizar = (id: string, fn: (l: LotePago) => LotePago) =>
    setRRHH("lotes", (p) => (p ?? []).map((x) => (x.id === id ? fn(x) : x)));
  return (
    <div className="space-y-3">
      {[...lotes].reverse().map((lote) => {
        const sinFactura = lote.items.filter((i) => i.requiereFactura && !i.factura);
        const monedas = Object.entries(
          lote.items.reduce<Record<string, number>>(
            (a, i) => ({ ...a, [i.moneda]: (a[i.moneda] ?? 0) + i.monto }),
            {},
          ),
        );
        const archivo = () =>
          descargarExcel(
            `pago-${lote.id}.xlsx`,
            monedas.map(([mon]) => ({
              nombre: `Pagos ${mon}`,
              nota: `Lote ${lote.id} · ${nombrePeriodo(lote.periodo)} · transferencias en ${mon}`,
              columnas: [
                { titulo: "Legajo", clave: "legajo", ancho: 10 },
                { titulo: "Beneficiario", clave: "nombre", ancho: 24 },
                { titulo: "Documento", clave: "doc", ancho: 18 },
                { titulo: "País", clave: "pais", ancho: 12 },
                { titulo: "Cuenta", clave: "cuenta", ancho: 32 },
                { titulo: "Moneda", clave: "moneda", ancho: 9 },
                { titulo: "Importe", clave: "monto", ancho: 16, moneda: true },
                { titulo: "Referencia", clave: "ref", ancho: 22 },
                { titulo: "Factura", clave: "factura", ancho: 16 },
              ],
              filas: lote.items
                .filter((i) => i.moneda === mon)
                .map((i) => {
                  const m = miembros.find((x) => x.id === i.miembroId);
                  const l = m ? legajoDe(m, legajos) : null;
                  return {
                    legajo: l?.numero ?? "",
                    nombre: nombre(i.miembroId),
                    doc: l?.cuil ?? "",
                    pais: l ? paisDe(l.pais).nombre : "",
                    cuenta: i.cuenta,
                    moneda: i.moneda,
                    monto: i.monto,
                    ref: `Sueldo ${nombrePeriodo(lote.periodo)}`,
                    factura: i.requiereFactura ? i.factura || "PENDIENTE" : "No aplica",
                  };
                }),
              totales: {
                nombre: "Total",
                monto: lote.items.filter((i) => i.moneda === mon).reduce((a, i) => a + i.monto, 0),
              },
            })),
          ).then(() => ctx.onToast("Archivo para el banco descargado"));
        return (
          <div key={lote.id} className="card-grad p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <Landmark className="size-4 text-primary" /> Lote {lote.id} ·{" "}
                  {nombrePeriodo(lote.periodo)}{" "}
                  <Pill clase={ESTILO_LOTE[lote.estado]}>{lote.estado}</Pill>
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {lote.items.length} pagos ·{" "}
                  {monedas.map(([m, t]) => formatoMoneda(t, m)).join(" · ")} · creado{" "}
                  {fecha(lote.creado)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className={BTN_SECUNDARIO} onClick={() => void archivo()}>
                  <FileSpreadsheet className="size-4" />
                  Archivo para el banco
                </button>
                {lote.estado === "Preparado" && (
                  <button
                    type="button"
                    className={BTN_PRIMARIO}
                    onClick={() => {
                      if (sinFactura.length)
                        return ctx.onToast(
                          `Faltan ${sinFactura.length} facturas: ${sinFactura.map((i) => nombre(i.miembroId)).join(", ")}`,
                        );
                      actualizar(lote.id, (l) => ({ ...l, estado: "Enviado al banco" }));
                      auditar(ctx.usuario, "Pago", `Lote ${lote.id} enviado al banco`);
                      ctx.onToast("Lote enviado al banco: confirmá cuando se acrediten");
                    }}
                  >
                    <Send className="size-4" />
                    Enviar al banco
                  </button>
                )}
                {lote.estado === "Enviado al banco" && (
                  <button
                    type="button"
                    className={BTN_PRIMARIO}
                    onClick={() => {
                      actualizar(lote.id, (l) => ({
                        ...l,
                        estado: "Pagado",
                        items: l.items.map((i) => ({ ...i, pagado: true })),
                      }));
                      setRRHH("periodos", (p) =>
                        p.map((x) =>
                          x.periodo === lote.periodo
                            ? { ...x, estado: "Pagada", pagado: diaISO() }
                            : x,
                        ),
                      );
                      if (flujos.find((f) => f.id === "f5")?.activo)
                        setRRHH("flujos", (p) =>
                          p.map((f) =>
                            f.id === "f5"
                              ? { ...f, ejecuciones: f.ejecuciones + lote.items.length }
                              : f,
                          ),
                        );
                      auditar(
                        ctx.usuario,
                        "Pago",
                        `Lote ${lote.id} pagado (${lote.items.length} transferencias)`,
                      );
                      ctx.onToast(
                        `Pagos confirmados. ${lote.items.length} recibos enviados al portal del equipo`,
                      );
                    }}
                  >
                    <Check className="size-4" />
                    Confirmar pagos
                  </button>
                )}
              </div>
            </div>
            {sinFactura.length > 0 && lote.estado === "Preparado" && (
              <p className="mt-2 flex items-center gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-[11px] text-amber-800 ring-1 ring-amber-200">
                <AlertTriangle className="size-3.5" /> Los independientes cobran contra factura:
                cargá el número para poder enviar el lote.
              </p>
            )}
            <ul className="mt-3 grid grid-cols-1 gap-2 lg:grid-cols-2">
              {lote.items.map((i) => {
                const m = miembros.find((x) => x.id === i.miembroId);
                const l = m ? legajoDe(m, legajos) : null;
                return (
                  <li
                    key={i.miembroId}
                    className="flex flex-wrap items-center gap-2 rounded-xl bg-white/85 px-3 py-2 ring-1 ring-primary/10"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {l ? paisDe(l.pais).bandera : ""} {nombre(i.miembroId)}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {l ? contratoDe(l.contratoId, l.pais).nombre : ""} ·{" "}
                        {i.cuenta || "Sin cuenta cargada"}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-primary">
                      {formatoMoneda(i.monto, i.moneda)}
                    </span>
                    {i.requiereFactura &&
                      (lote.estado === "Preparado" ? (
                        <input
                          value={i.factura}
                          placeholder="N.º factura"
                          aria-label={`Factura de ${nombre(i.miembroId)}`}
                          onChange={(e) =>
                            actualizar(lote.id, (lo) => ({
                              ...lo,
                              items: lo.items.map((x) =>
                                x.miembroId === i.miembroId ? { ...x, factura: e.target.value } : x,
                              ),
                            }))
                          }
                          className={`${INPUT} w-32`}
                        />
                      ) : (
                        <Pill clase="bg-primary/10 text-primary">
                          <FileText className="size-3" /> {i.factura}
                        </Pill>
                      ))}
                    {i.pagado && <Pill clase="bg-emerald-100 text-emerald-700">Pagado</Pill>}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Building2 className="size-3.5" /> El archivo para el banco tiene una hoja por moneda. TODO
        backend: integración directa con el banco de cada país.
      </p>
    </div>
  );
}

function AjusteForm({
  recibo,
  l,
  inicial,
  onCancel,
  onGuardar,
}: {
  recibo: Recibo;
  l: Legajo;
  inicial: AjusteRecibo;
  onCancel: () => void;
  onGuardar: (a: AjusteRecibo) => void;
}) {
  const [a, setA] = useState({
    horasExtra: String(inicial.horasExtra || ""),
    bono: String(inicial.bono || ""),
    descuento: String(inicial.descuento || ""),
    adelanto: String(inicial.adelanto || ""),
    horas: inicial.horas !== undefined ? String(inicial.horas) : "",
    produccion: inicial.produccion !== undefined ? String(inicial.produccion) : "",
    nota: inicial.nota ?? "",
  });
  const mon = recibo.moneda;
  const n = (v: string) => Math.max(0, Number(v) || 0);
  const campo = (k: keyof typeof a, label: string, ph = "0") => (
    <Field label={label}>
      <input
        type="number"
        min={0}
        step="any"
        value={a[k]}
        placeholder={ph}
        onChange={(e) => setA((p) => ({ ...p, [k]: e.target.value }))}
        className={INPUT}
        aria-label={label}
      />
    </Field>
  );
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const r: AjusteRecibo = {
          horasExtra: n(a.horasExtra),
          bono: n(a.bono),
          adelanto: n(a.adelanto),
          descuento: n(a.descuento),
        };
        if (a.horas !== "") r.horas = n(a.horas);
        if (a.produccion !== "") r.produccion = n(a.produccion);
        if (a.nota.trim()) r.nota = a.nota.trim();
        onGuardar(r);
      }}
      className="space-y-3"
    >
      <p className="rounded-xl bg-primary/[0.05] px-3 py-2 text-[11px] text-muted-foreground">
        {paisDe(l.pais).bandera} {recibo.modalidad} · {recibo.esquema} · importes en{" "}
        <b className="text-foreground">{mon}</b>
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {recibo.esquema === "Por hora" &&
          campo("horas", "Horas trabajadas", `${recibo.horasTrabajadas} (fichadas)`)}
        {(recibo.esquema === "Por comisión" || recibo.esquema === "Mixto") &&
          campo("produccion", `Producción (${mon})`)}
        {campo("horasExtra", "Horas extra")}
        {campo("bono", `Bono (${mon})`)}
        {campo("descuento", `Descuento (${mon})`)}
        {campo("adelanto", `Adelanto (${mon})`)}
      </div>
      <Field label="Nota">
        <input
          value={a.nota}
          onChange={(e) => setA((p) => ({ ...p, nota: e.target.value }))}
          className={INPUT}
          placeholder="Ej: guardia del sábado, uniforme…"
        />
      </Field>
      <Acciones etiqueta="Recalcular" onCancel={onCancel} />
    </form>
  );
}
