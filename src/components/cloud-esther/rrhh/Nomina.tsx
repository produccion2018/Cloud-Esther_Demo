import { useState } from "react";
import {
  Banknote,
  CircleDollarSign,
  Download,
  FileCheck2,
  Lock,
  Pencil,
  Plus,
  Printer,
  Receipt,
  Send,
  Users,
} from "lucide-react";
import { useEquipo } from "@/lib/cloud-esther/equipo-store";
import {
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
  type EstadoPeriodo,
  type Recibo,
} from "@/lib/cloud-esther/rrhh-store";
import type { TeamMember } from "@/lib/cloud-esther/equipo-profesional-data";
import type { Legajo } from "@/lib/cloud-esther/rrhh-store";
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
  descargarCSV,
  fecha,
  imprimirHTML,
  type Ctx,
} from "./ui";

const ESTILO: Record<EstadoPeriodo, string> = {
  Borrador: "bg-muted text-muted-foreground",
  Liquidada: "bg-violet-100 text-violet-700",
  Pagada: "bg-emerald-100 text-emerald-700",
};

export function imprimirRecibo(r: Recibo, m: TeamMember, l: Legajo, clinica: string) {
  const deps = r.modalidad === "Relación de dependencia" || r.modalidad === "Plazo fijo";
  const fila = (c: string, v: number, desc = false) =>
    v
      ? `<tr><td>${c}</td><td class="r">${desc ? "" : ars(v)}</td><td class="r">${desc ? ars(v) : ""}</td></tr>`
      : "";
  imprimirHTML(
    `Recibo ${nombreDe(m)} ${r.periodo}`,
    `<h1>${deps ? "Recibo de haberes" : "Liquidación de honorarios"}</h1><p>${clinica} · Período ${nombrePeriodo(r.periodo)}</p>
<div class="meta"><div><b>${nombreDe(m)}</b><br>Legajo ${l.numero} · CUIL ${l.cuil || "—"}<br>${l.puesto} · ${l.sucursal}</div><div>Ingreso: ${fecha(l.ingreso)}<br>Modalidad: ${l.modalidad}<br>Convenio: ${l.convenio || "—"}<br>CBU: ${l.cbu || "—"}</div></div>
<table style="margin-top:18px"><thead><tr><th>Concepto</th><th class="r">Haberes</th><th class="r">Descuentos</th></tr></thead><tbody>
${fila(deps ? "Sueldo básico" : "Honorarios", r.basico)}${fila("Antigüedad", r.antiguedad)}${fila("Presentismo", r.presentismo)}${fila("Horas extra", r.horasExtra)}${fila("Bono", r.bono)}${fila("Comisiones", r.comisiones)}
${fila("Aportes (jubilación, obra social, PAMI)", r.aportes, true)}${fila("Adelanto de sueldo", r.adelanto, true)}
<tr class="tot"><td>Neto a cobrar</td><td class="r" colspan="2">${ars(r.neto)}</td></tr></tbody></table>
${r.pierdePresentismo ? `<p style="color:#b45309">No corresponde presentismo: ${r.llegadasTarde} llegadas tarde en el mes.</p>` : ""}
<div class="firma"><span>Firma del empleador</span><span>Recibí conforme · ${nombreDe(m)}</span></div>`,
  );
}

export function Nomina({ ctx }: { ctx: Ctx }) {
  const { miembros, ausencias } = useEquipo();
  const { legajos, periodos, config, fichajes, flujos } = storeRRHH.usar();
  const [sel, setSel] = useState(periodos.at(-1)?.periodo ?? periodoActual());
  const [ajustar, setAjustar] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState<"liquidar" | "pagar" | null>(null);
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
  const recibos = activos.map((m) => ({
    m,
    l: legajoDe(m, legajos),
    r: calcularRecibo(m, legajoDe(m, legajos), periodo, config, todas, ausencias),
  }));
  const total = (k: keyof Recibo) => recibos.reduce((a, x) => a + (x.r[k] as number), 0);
  const editable = periodo.estado === "Borrador";
  const siguiente = periodoAnterior(periodos.at(-1)!.periodo, -1);
  const clinica = "Clínica Dental Esther";

  return (
    <div className="space-y-3">
      <Encabezado
        icon={Receipt}
        titulo="Nómina y liquidación de sueldos"
        descripcion="Básico, antigüedad, presentismo (según asistencia), horas extra y aportes. Recibos listos para imprimir."
      >
        <button
          type="button"
          className={BTN_SECUNDARIO}
          onClick={() =>
            descargarCSV(`planilla-bancaria-${periodo.periodo}.csv`, [
              ["Legajo", "Nombre", "CUIL", "CBU", "Neto"],
              ...recibos.map(({ m, l, r }) => [l.numero, nombreDe(m), l.cuil, l.cbu, r.neto]),
            ])
          }
        >
          <Download className="size-4" />
          Planilla bancaria
        </button>
        {periodo.estado === "Borrador" && (
          <button type="button" className={BTN_PRIMARIO} onClick={() => setConfirmar("liquidar")}>
            <Lock className="size-4" />
            Liquidar período
          </button>
        )}
        {periodo.estado === "Liquidada" && (
          <button type="button" className={BTN_PRIMARIO} onClick={() => setConfirmar("pagar")}>
            <Banknote className="size-4" />
            Marcar como pagado
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
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Mini
          label="Neto a pagar"
          valor={ars(total("neto"))}
          icon={Banknote}
          tono="text-primary"
          sub={`${recibos.length} personas`}
        />
        <Mini
          label="Bruto"
          valor={ars(total("bruto"))}
          icon={CircleDollarSign}
          sub={`Aportes ${ars(total("aportes"))}`}
        />
        <Mini
          label="Contribuciones"
          valor={ars(total("contribuciones"))}
          icon={FileCheck2}
          sub={`${config.contribucionesPct}% a cargo de la clínica`}
        />
        <Mini
          label="Costo laboral"
          valor={ars(total("costo"))}
          icon={Users}
          tono="text-fuchsia-600"
          sub={
            periodo.pagado ? `Pagado el ${fecha(periodo.pagado)}` : `Pago el día ${config.diaPago}`
          }
        />
      </div>

      <div className="card-grad p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold">
            {nombrePeriodo(periodo.periodo)}{" "}
            <Pill clase={ESTILO[periodo.estado]}>{periodo.estado}</Pill>
          </p>
          {!editable && (
            <p className="text-[11px] text-muted-foreground">
              Período cerrado: los importes ya no se modifican.
            </p>
          )}
        </div>
        <div className="scroll-sutil mt-3 overflow-x-auto">
          <table className="w-full min-w-[900px] text-xs">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                <th className="pb-2 font-semibold">Persona</th>
                <th className="pb-2 text-right font-semibold">Básico</th>
                <th className="pb-2 text-right font-semibold">Antig.</th>
                <th className="pb-2 text-right font-semibold">Presentismo</th>
                <th className="pb-2 text-right font-semibold">Extras / bono</th>
                <th className="pb-2 text-right font-semibold">Aportes</th>
                <th className="pb-2 text-right font-semibold">Adelanto</th>
                <th className="pb-2 text-right font-semibold">Neto</th>
                <th className="pb-2 text-right font-semibold">Costo</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody>
              {recibos.map(({ m, l, r }) => (
                <tr key={m.id} className="border-t border-primary/10">
                  <td className="py-2 pr-2">
                    <p className="font-semibold">{nombreDe(m)}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {l.modalidad}
                      {l.baja ? " · baja en el período" : ""}
                    </p>
                  </td>
                  <td className="py-2 text-right">{ars(r.basico)}</td>
                  <td className="py-2 text-right">{r.antiguedad ? ars(r.antiguedad) : "—"}</td>
                  <td className="py-2 text-right">
                    {r.pierdePresentismo ? (
                      <Pill clase="bg-orange-100 text-orange-700">
                        Pierde ({r.llegadasTarde} tarde)
                      </Pill>
                    ) : r.presentismo ? (
                      ars(r.presentismo)
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-2 text-right">
                    {r.horasExtra + r.bono + r.comisiones
                      ? ars(r.horasExtra + r.bono + r.comisiones)
                      : "—"}
                  </td>
                  <td className="py-2 text-right text-rose-600">
                    {r.aportes ? `−${ars(r.aportes)}` : "—"}
                  </td>
                  <td className="py-2 text-right text-rose-600">
                    {r.adelanto ? `−${ars(r.adelanto)}` : "—"}
                  </td>
                  <td className="py-2 text-right text-sm font-bold text-primary">{ars(r.neto)}</td>
                  <td className="py-2 text-right text-muted-foreground">{ars(r.costo)}</td>
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
              <tr className="border-t-2 border-primary/20 font-bold">
                <td className="py-2">Total</td>
                <td className="py-2 text-right">{ars(total("basico"))}</td>
                <td className="py-2 text-right">{ars(total("antiguedad"))}</td>
                <td className="py-2 text-right">{ars(total("presentismo"))}</td>
                <td className="py-2 text-right">
                  {ars(total("horasExtra") + total("bono") + total("comisiones"))}
                </td>
                <td className="py-2 text-right text-rose-600">−{ars(total("aportes"))}</td>
                <td className="py-2 text-right text-rose-600">−{ars(total("adelanto"))}</td>
                <td className="py-2 text-right text-sm text-primary">{ars(total("neto"))}</td>
                <td className="py-2 text-right">{ars(total("costo"))}</td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Antigüedad {config.antiguedadPct}% por año · presentismo {config.presentismoPct}% (se
          pierde con 3 llegadas tarde) · horas extra con recargo del {config.recargoExtraPct}% ·
          aportes {config.aportesPct}%. Los monotributistas cobran honorarios sin aportes.
        </p>
      </div>

      {ajustar && (
        <Modal
          titulo={`Ajustes de ${nombreDe(miembros.find((m) => m.id === ajustar)!)}`}
          onClose={() => setAjustar(null)}
        >
          <AjusteForm
            inicial={periodo.ajustes[ajustar] ?? { horasExtra: 0, bono: 0, adelanto: 0 }}
            onCancel={() => setAjustar(null)}
            onGuardar={(a) => {
              setRRHH("periodos", (p) =>
                p.map((x) =>
                  x.periodo === periodo.periodo
                    ? { ...x, ajustes: { ...x.ajustes, [ajustar]: a } }
                    : x,
                ),
              );
              auditar(
                ctx.usuario,
                "Nómina",
                `Ajustes de ${nombreDe(miembros.find((m) => m.id === ajustar)!)}: ${a.horasExtra} h extra, bono ${ars(a.bono)}, adelanto ${ars(a.adelanto)}`,
              );
              setAjustar(null);
              ctx.onToast("Recibo recalculado");
            }}
          />
        </Modal>
      )}
      {confirmar && (
        <Modal
          titulo={
            confirmar === "liquidar"
              ? `Liquidar ${nombrePeriodo(periodo.periodo)}`
              : `Pagar ${nombrePeriodo(periodo.periodo)}`
          }
          onClose={() => setConfirmar(null)}
        >
          <p className="text-sm text-muted-foreground">
            {confirmar === "liquidar"
              ? `Se cierran ${recibos.length} recibos por ${ars(total("neto"))} netos. Después no se pueden editar.`
              : `Se registra el pago de ${ars(total("neto"))}.${flujos.find((f) => f.id === "f5")?.activo ? " La automatización envía el recibo por correo a cada persona." : ""}`}
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" className={BTN_SECUNDARIO} onClick={() => setConfirmar(null)}>
              Cancelar
            </button>
            <button
              type="button"
              className={BTN_PRIMARIO}
              onClick={() => {
                const estado: EstadoPeriodo = confirmar === "liquidar" ? "Liquidada" : "Pagada";
                setRRHH("periodos", (p) =>
                  p.map((x) =>
                    x.periodo === periodo.periodo
                      ? { ...x, estado, pagado: estado === "Pagada" ? diaISO() : x.pagado }
                      : x,
                  ),
                );
                if (estado === "Pagada" && flujos.find((f) => f.id === "f5")?.activo)
                  setRRHH("flujos", (p) =>
                    p.map((f) =>
                      f.id === "f5" ? { ...f, ejecuciones: f.ejecuciones + recibos.length } : f,
                    ),
                  );
                auditar(
                  ctx.usuario,
                  "Nómina",
                  `Período ${nombrePeriodo(periodo.periodo)} ${estado.toLowerCase()} (${ars(total("neto"))})`,
                );
                setConfirmar(null);
                ctx.onToast(
                  estado === "Pagada"
                    ? `Pagado. ${recibos.length} recibos enviados`
                    : "Período liquidado",
                );
              }}
            >
              {confirmar === "liquidar" ? <Lock className="size-4" /> : <Send className="size-4" />}
              Confirmar
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function AjusteForm({
  inicial,
  onCancel,
  onGuardar,
}: {
  inicial: AjusteRecibo;
  onCancel: () => void;
  onGuardar: (a: AjusteRecibo) => void;
}) {
  const [a, setA] = useState({
    horasExtra: String(inicial.horasExtra),
    bono: String(inicial.bono),
    adelanto: String(inicial.adelanto),
  });
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onGuardar({
          horasExtra: Math.max(0, Number(a.horasExtra) || 0),
          bono: Math.max(0, Number(a.bono) || 0),
          adelanto: Math.max(0, Number(a.adelanto) || 0),
        });
      }}
      className="space-y-3"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Horas extra">
          <input
            type="number"
            min={0}
            value={a.horasExtra}
            onChange={(e) => setA((p) => ({ ...p, horasExtra: e.target.value }))}
            className={INPUT}
            aria-label="Horas extra"
          />
        </Field>
        <Field label="Bono">
          <input
            type="number"
            min={0}
            value={a.bono}
            onChange={(e) => setA((p) => ({ ...p, bono: e.target.value }))}
            className={INPUT}
            aria-label="Bono"
          />
        </Field>
        <Field label="Adelanto a descontar">
          <input
            type="number"
            min={0}
            value={a.adelanto}
            onChange={(e) => setA((p) => ({ ...p, adelanto: e.target.value }))}
            className={INPUT}
            aria-label="Adelanto"
          />
        </Field>
      </div>
      <Acciones etiqueta="Recalcular" onCancel={onCancel} />
    </form>
  );
}
