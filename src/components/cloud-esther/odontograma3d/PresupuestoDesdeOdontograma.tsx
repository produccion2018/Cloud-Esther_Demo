import { useMemo, useState } from "react";
import { Calculator, Check, FileText, Receipt } from "lucide-react";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Seleccion } from "@/components/ui/seleccion";
import {
  cambiarRegistro,
  leerRegistros,
  type LineaPresupuesto,
  type PresupuestoPaciente,
} from "@/components/cloud-esther/PacienteSecciones";
import { storePresupuestos, type Arancel } from "@/lib/cloud-esther/presupuestos-store";
import { almacenClinico } from "@/lib/clinica/almacen-clinico";
import { useSesion } from "@/lib/cloud-esther/auth-store";
import { ars as formatMoney } from "@/components/cloud-esther/rrhh/ui";
import type { ToothState } from "@/lib/odontogram/fdi";
import { SURFACE_LABELS, type OdontogramState, type Surface } from "@/lib/odontograma2d/types";

/* Ubicación: src/components/cloud-esther/odontograma3d/PresupuestoDesdeOdontograma.tsx
   PRESUPUESTO DESDE EL ODONTOGRAMA (2D y 3D, demo y clínica): junta lo que queda por hacer
   —caries y fracturas (restauración), extracciones indicadas y los tratamientos planificados
   que todavía no tienen presupuesto— le busca el arancel de la clínica y, con un toque, crea el
   presupuesto como borrador en Presupuestos. Los tratamientos quedan vinculados al presupuesto. */

type Item = {
  clave: string;
  descripcion: string;
  pieza: string;
  tipo: Tipo;
  precio: number;
  arancelId: string;
  tratamientoId?: number;
  incluido: boolean;
};
type Tipo =
  | "restauracion"
  | "extraccion"
  | "endodoncia"
  | "corona"
  | "implante"
  | "protesis"
  | "perno"
  | "carilla"
  | "sellante"
  | "control"
  | "otro";

const PALABRAS: Record<Exclude<Tipo, "otro">, RegExp> = {
  restauracion: /restaur|obtura|resina|composite|amalgama|caries/i,
  extraccion: /extrac|exodon/i,
  endodoncia: /endodon|conducto/i,
  corona: /corona/i,
  implante: /implante/i,
  protesis: /pr[oó]tesis|puente/i,
  perno: /perno|mu[nñ][oó]n/i,
  carilla: /carilla/i,
  sellante: /sellante|sellador/i,
  control: /control|consulta|revisi/i,
};
const tipoDe = (texto: string): Tipo =>
  (Object.entries(PALABRAS).find(([, re]) => re.test(texto))?.[0] as Tipo | undefined) ?? "otro";

function arancelPara(tipo: Tipo, aranceles: Arancel[]): Arancel | undefined {
  if (tipo === "otro") return undefined;
  return aranceles.find((a) => a.activo && PALABRAS[tipo].test(a.nombre));
}

function leer2D(clave: string): OdontogramState {
  try {
    return JSON.parse(almacenClinico.getItem(`cloud-esther:odontograma2d:${clave}`) ?? "{}") as OdontogramState;
  } catch {
    return {};
  }
}

/** Lo pendiente del paciente, listo para presupuestar. */
function armarItems(
  pacienteId: string,
  clavePaciente: string,
  chart3D: Record<number, ToothState> | null,
  aranceles: Arancel[],
): Item[] {
  const items: Item[] = [];
  const agregar = (descripcion: string, pieza: string, precioBase = 0, tratamientoId?: number) => {
    const tipo = tipoDe(descripcion);
    const ar = arancelPara(tipo, aranceles);
    items.push({
      clave: `${tratamientoId ?? "o"}-${pieza}-${descripcion}`,
      descripcion: ar && !tratamientoId ? ar.nombre : descripcion,
      pieza,
      tipo,
      precio: ar?.precio ?? precioBase,
      arancelId: ar?.id ?? "",
      ...(tratamientoId !== undefined ? { tratamientoId } : {}),
      incluido: true,
    });
  };

  // 1) Tratamientos planificados sin presupuesto (de la ficha, el 3D o la historia clínica)
  const reg = leerRegistros()[Number(pacienteId)];
  const planificados = (reg?.tratamientos ?? []).filter((t) => t.estado === "Planificado" && !t.presupuestoId);
  for (const t of planificados) agregar(t.nombre, t.pieza ?? "", t.costo ?? 0, t.id);
  const yaPlanificado = (pieza: string, tipo: Tipo) =>
    items.some((i) => i.tratamientoId !== undefined && i.tipo === tipo && i.pieza.split(/\D+/).includes(pieza));

  // 2) Odontograma 3D: caries y fracturas → restauración; a extraer → extracción
  if (chart3D) {
    for (const [fdi, estado] of Object.entries(chart3D)) {
      if ((estado === "caries" || estado === "fractura") && !yaPlanificado(fdi, "restauracion"))
        agregar(`Restauración (${estado === "caries" ? "caries" : "fractura"})`, fdi);
      if (estado === "extraer" && !yaPlanificado(fdi, "extraccion")) agregar("Extracción", fdi);
    }
  } else {
    // 3) Odontograma 2D: caries o fractura por cara → restauración con sus caras; extracción indicada
    for (const [fdi, t] of Object.entries(leer2D(clavePaciente))) {
      const caras = (Object.entries(t.surfaces ?? {}) as [Surface, string][])
        .filter(([, h]) => h === "caries" || h === "fractura")
        .map(([c]) => c);
      if (caras.length && !(t.whole ?? []).includes("ausente") && !yaPlanificado(fdi, "restauracion"))
        agregar(`Restauración ${caras.length > 1 ? `${caras.length} caras` : "1 cara"} (${caras.map((c) => SURFACE_LABELS[c].split(" ")[0]).join(", ")})`, fdi);
      if ((t.whole ?? []).includes("extraccion") && !yaPlanificado(fdi, "extraccion")) agregar("Extracción", fdi);
      else if ((t.whole ?? []).includes("resto") && !yaPlanificado(fdi, "extraccion"))
        agregar("Extracción de resto radicular", fdi);
      // Lo marcado como "a realizar" (rojo) en la convención rojo/azul
      const pend = new Set(t.aRealizar ?? []);
      const obturar = (Object.entries(t.surfaces ?? {}) as [Surface, string][])
        .filter(([c, h]) => h === "obturacion" && pend.has(`s:${c}`))
        .map(([c]) => c);
      if (obturar.length && !caras.length && !yaPlanificado(fdi, "restauracion"))
        agregar(`Restauración ${obturar.length > 1 ? `${obturar.length} caras` : "1 cara"} (${obturar.map((c) => SURFACE_LABELS[c].split(" ")[0]).join(", ")})`, fdi);
      if (Object.entries(t.surfaces ?? {}).some(([c, h]) => h === "sellante" && pend.has(`s:${c}`)) && !yaPlanificado(fdi, "sellante"))
        agregar("Sellante", fdi);
      const NOMBRES: Partial<Record<string, string>> = {
        corona: "Corona",
        endodoncia: "Endodoncia",
        implante: "Implante",
        perno: "Perno-muñón",
        carilla: "Carilla",
        puente: "Puente (prótesis fija)",
      };
      for (const w of t.whole ?? []) {
        const nombre = NOMBRES[w];
        if (nombre && pend.has(`w:${w}`) && !yaPlanificado(fdi, tipoDe(nombre))) agregar(nombre, fdi);
      }
    }
  }
  // Orden por pieza
  return items.sort((a, b) => (Number(a.pieza) || 99) - (Number(b.pieza) || 99));
}

export function PresupuestoDesdeOdontograma({
  pacienteId,
  clavePaciente,
  chart3D,
  onToast,
}: {
  pacienteId: string;
  clavePaciente: string;
  /** Estado del odontograma 3D (si la clínica usa 3D); null = se lee el 2D. */
  chart3D: Record<number, ToothState> | null;
  onToast: (msg: string) => void;
}) {
  const { aranceles } = storePresupuestos.usar();
  const { usuario } = useSesion();
  const [abierto, setAbierto] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const activos = useMemo(() => aranceles.filter((a) => a.activo), [aranceles]);

  const abrir = () => {
    const lista = armarItems(pacienteId, clavePaciente, chart3D, activos);
    if (!lista.length) {
      onToast("No hay nada pendiente para presupuestar: marcá caries, fracturas, extracciones o planificá tratamientos");
      return;
    }
    setItems(lista);
    setAbierto(true);
  };

  const cambiar = (clave: string, cambios: Partial<Item>) =>
    setItems((prev) => prev.map((i) => (i.clave === clave ? { ...i, ...cambios } : i)));

  const elegidos = items.filter((i) => i.incluido);
  const total = elegidos.reduce((t, i) => t + (Number(i.precio) || 0), 0);

  const crear = () => {
    if (!elegidos.length) return;
    const todos = Object.values(leerRegistros()).flatMap((r) => r.presupuestos ?? []);
    const numMax = todos.reduce((a, x) => Math.max(a, Number(x.numero.replace(/\D/g, "")) || 0), 0);
    const numero = `PR-${String(numMax + 1).padStart(4, "0")}`;
    const id = Date.now();
    const lineas: LineaPresupuesto[] = elegidos.map((i) => ({
      descripcion: i.descripcion,
      pieza: i.pieza,
      cantidad: 1,
      precio: Number(i.precio) || 0,
      ...(i.arancelId ? { arancelId: i.arancelId } : {}),
    }));
    const autor = usuario?.nombre ?? "Profesional";
    const nuevo: PresupuestoPaciente = {
      id,
      numero,
      fecha: new Date().toISOString().slice(0, 10),
      estado: "Borrador",
      lineas,
      notas: "Armado desde el odontograma",
      profesional: autor,
      seguimientos: [{ fecha: new Date().toISOString(), texto: "Creado como borrador desde el odontograma", autor }],
    };
    const pid = Number(pacienteId);
    cambiarRegistro(pid, "presupuestos", (prev) => [...(prev ?? []), nuevo]);
    // Los tratamientos planificados quedan vinculados a este presupuesto
    const ids = new Set(elegidos.map((i) => i.tratamientoId).filter((x): x is number => x !== undefined));
    if (ids.size)
      cambiarRegistro(pid, "tratamientos", (prev) => (prev ?? []).map((t) => (ids.has(t.id) ? { ...t, presupuestoId: id } : t)));
    cambiarRegistro(pid, "auditoria", (prev) => [
      ...(prev ?? []),
      {
        id,
        usuario: autor,
        accion: `Creó el presupuesto ${numero} desde el odontograma`,
        fecha: new Date().toISOString().slice(0, 10),
        hora: new Date().toTimeString().slice(0, 5),
      },
    ]);
    setAbierto(false);
    onToast(`Presupuesto ${numero} creado como borrador (${formatMoney(total)}). Lo ves en Presupuestos del paciente.`);
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-primary/12 bg-gradient-to-r from-primary/[0.06] via-card to-fuchsia-500/[0.05] p-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-fuchsia-500 text-white">
          <Calculator className="size-5" />
        </span>
        <div className="min-w-[12rem] flex-1">
          <p className="text-sm font-semibold">Presupuesto desde el odontograma</p>
          <p className="text-xs text-muted-foreground">
            Junta caries, fracturas, extracciones y tratamientos planificados con los precios de tu clínica.
          </p>
        </div>
        <button type="button" onClick={abrir} className="btn-ce !min-h-10 w-full justify-center sm:w-auto">
          <Receipt className="size-4" /> Armar presupuesto
        </button>
      </div>

      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle>Presupuesto desde el odontograma</DialogTitle>
            <DialogDescription>
              Revisá lo que se va a presupuestar. Podés quitar ítems, cambiar el arancel o el precio.
            </DialogDescription>
          </DialogHeader>
          {!activos.length && (
            <p className="rounded-xl bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
              Tu clínica todavía no cargó aranceles: los precios quedan en 0 y los completás acá o en Presupuestos
              (Configuración de presupuestos → Aranceles).
            </p>
          )}
          <ul className="space-y-2">
            {items.map((i) => (
              <li
                key={i.clave}
                className={`rounded-2xl border p-3 transition ${i.incluido ? "border-primary/20 bg-card" : "border-border bg-muted/30 opacity-60"}`}
              >
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => cambiar(i.clave, { incluido: !i.incluido })}
                    aria-label={i.incluido ? "Quitar del presupuesto" : "Agregar al presupuesto"}
                    className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-lg border-2 transition ${
                      i.incluido ? "border-primary bg-primary text-white" : "border-primary/30"
                    }`}
                  >
                    {i.incluido && <Check className="size-3.5" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">
                      {i.descripcion}
                      {i.pieza && <span className="ml-1.5 rounded-md bg-primary/10 px-1.5 py-0.5 text-[11px] text-primary">Pieza {i.pieza}</span>}
                    </p>
                    {i.tratamientoId !== undefined && (
                      <p className="text-[11px] text-muted-foreground">Tratamiento planificado</p>
                    )}
                    <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_140px]">
                      <Seleccion
                        aria-label="Arancel"
                        value={i.arancelId}
                        onChange={(e) => {
                          const ar = activos.find((a) => a.id === e.target.value);
                          cambiar(i.clave, {
                            arancelId: e.target.value,
                            ...(ar ? { precio: ar.precio, descripcion: i.tratamientoId !== undefined ? i.descripcion : ar.nombre } : {}),
                          });
                        }}
                        className="h-10 w-full rounded-xl border border-primary/15 bg-card px-3 text-sm"
                      >
                        <option value="">Sin arancel (precio a mano)</option>
                        {activos.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.nombre} · {formatMoney(a.precio)}
                          </option>
                        ))}
                      </Seleccion>
                      <input
                        type="number"
                        min={0}
                        inputMode="decimal"
                        aria-label="Precio"
                        value={i.precio}
                        onChange={(e) => cambiar(i.clave, { precio: Math.max(0, Number(e.target.value) || 0) })}
                        className="h-10 w-full rounded-xl border border-primary/15 bg-card px-3 text-right text-sm tabular-nums"
                      />
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-primary/10 pt-3">
            <p className="text-sm">
              {elegidos.length} ítem{elegidos.length === 1 ? "" : "s"} ·{" "}
              <b className="font-display text-lg tabular-nums">{formatMoney(total)}</b>
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setAbierto(false)} className="btn-ce-outline !min-h-10">
                Cancelar
              </button>
              <button type="button" disabled={!elegidos.length} onClick={crear} className="btn-ce !min-h-10">
                <FileText className="size-4" /> Crear presupuesto
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
