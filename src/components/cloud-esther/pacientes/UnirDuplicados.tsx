import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, Check, Copy, Users, X } from "lucide-react";
import { storeAgenda } from "@/lib/cloud-esther/agenda-store";
import { usePacientes, type Paciente } from "@/lib/cloud-esther/pacientes";
import { unirRegistros, useTodosLosRegistros } from "@/components/cloud-esther/PacienteSecciones";
import { normalizarDocumento } from "@/lib/cloud-esther/terminologia";
import { normalizarBusqueda } from "@/lib/utils";
import { almacenClinico } from "@/lib/clinica/almacen-clinico";
import { clinicaActualId } from "@/lib/cloud-esther/auth-store";
import { odontogramKey } from "@/lib/odontograma2d/types";
import { storeAutorizaciones } from "@/lib/cloud-esther/autorizaciones-store";
import { storePortal } from "@/lib/cloud-esther/portal-store";
import { storeSimulador } from "@/lib/cloud-esther/simulador-sonrisa";
import { storeFacturacion } from "@/lib/cloud-esther/facturacion-store";
import { storeFinanzas } from "@/lib/cloud-esther/finanzas-store";
import { storeIA } from "@/lib/cloud-esther/ia-store";
import { storeRayosX } from "@/lib/cloud-esther/rayos-x";

/* Ubicación: src/components/cloud-esther/pacientes/UnirDuplicados.tsx
   UNIR PACIENTES DUPLICADOS: detecta fichas que parecen la misma persona (mismo documento, mismo
   nombre y apellido o mismo teléfono). La clínica elige cuál queda y se juntan en una sola, SIN
   perder nada: historia, tratamientos, recetas, presupuestos, cuenta, turnos de la agenda,
   facturas, odontograma, etiquetas… Los datos vacíos de la que queda se completan con la otra. */

type Par = { a: Paciente; b: Paciente; motivo: string };

const nombreDe = (p: Paciente) => `${p.nombre} ${p.apellido}`.trim();
const tel8 = (t: string) => (t ?? "").replace(/\D/g, "").slice(-8);

export function buscarDuplicados(pacientes: Paciente[]): Par[] {
  const pares: Par[] = [];
  const visto = new Set<string>();
  for (let i = 0; i < pacientes.length; i++) {
    for (let j = i + 1; j < pacientes.length; j++) {
      const a = pacientes[i]!;
      const b = pacientes[j]!;
      const da = normalizarDocumento(a.documento);
      const motivo =
        da && da === normalizarDocumento(b.documento)
          ? "Mismo documento"
          : normalizarBusqueda(nombreDe(a)) === normalizarBusqueda(nombreDe(b))
            ? "Mismo nombre y apellido"
            : tel8(a.telefono).length === 8 && tel8(a.telefono) === tel8(b.telefono) &&
                normalizarBusqueda(a.apellido) === normalizarBusqueda(b.apellido)
              ? "Mismo teléfono y apellido"
              : "";
      const k = `${a.id}-${b.id}`;
      if (motivo && !visto.has(k)) {
        visto.add(k);
        pares.push({ a, b, motivo });
      }
    }
  }
  return pares;
}

/* Cambia pacienteId: sale → queda en cualquier store (facturas, cobros, portal, IA…) */
function reasignar<T>(valor: T, sale: number, queda: number, nombreSale: string, nombreQueda: string): T {
  if (Array.isArray(valor)) return valor.map((v) => reasignar(v, sale, queda, nombreSale, nombreQueda)) as T;
  if (valor && typeof valor === "object") {
    const o = valor as Record<string, unknown>;
    let cambio = false;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(o)) {
      let nv = v;
      if (k === "pacienteId" && (v === sale || v === String(sale))) nv = typeof v === "string" ? String(queda) : queda;
      else if ((k === "paciente" || k === "pacienteNombre") && typeof v === "string" && nombreSale !== nombreQueda && normalizarBusqueda(v) === normalizarBusqueda(nombreSale))
        nv = nombreQueda;
      else nv = reasignar(v, sale, queda, nombreSale, nombreQueda);
      if (nv !== v) cambio = true;
      out[k] = nv;
    }
    return (cambio ? out : valor) as T;
  }
  return valor;
}

function unir(queda: Paciente, sale: Paciente, setPacientes: (fn: (p: Paciente[]) => Paciente[]) => void) {
  const nq = nombreDe(queda);
  const ns = nombreDe(sale);
  // 1) La ficha: lo vacío de la que queda se completa con la otra; etiquetas juntas
  const completar = { ...queda } as Record<string, unknown>;
  for (const [k, v] of Object.entries(sale)) {
    if (k === "id") continue;
    const actual = completar[k];
    if ((actual === "" || actual === null || actual === undefined) && v) completar[k] = v;
  }
  completar["etiquetas"] = Array.from(new Set([...(queda.etiquetas ?? []), ...(sale.etiquetas ?? [])]));
  setPacientes((prev) => prev.filter((p) => p.id !== sale.id).map((p) => (p.id === queda.id ? (completar as Paciente) : p)));
  // 2) Carpeta clínica (historia, tratamientos, recetas, presupuestos, cuenta…)
  unirRegistros(queda.id, sale.id);
  // 3) Agenda: los turnos quedan a nombre del que queda (y su aviso de «volver a llamar»)
  const ag = storeAgenda.leer();
  const avisados = { ...(ag.ajustes?.recallAvisados ?? {}) };
  if (avisados[String(sale.id)] && !avisados[String(queda.id)]) avisados[String(queda.id)] = avisados[String(sale.id)]!;
  delete avisados[String(sale.id)];
  storeAgenda.poner({
    ...reasignar(ag, sale.id, queda.id, ns, nq),
    ...(ag.ajustes ? { ajustes: { ...ag.ajustes, recallAvisados: avisados } } : {}),
  });
  // 4) Facturas, cobros, autorizaciones, portal, IA, simulaciones y radiografías
  for (const st of [storeFacturacion, storeFinanzas, storeAutorizaciones, storePortal, storeIA, storeSimulador, storeRayosX] as {
    leer: () => unknown;
    poner: (v: never) => void;
  }[]) {
    try {
      const v = st.leer();
      const nv = reasignar(v, sale.id, queda.id, ns, nq);
      if (nv !== v) st.poner(nv as never);
    } catch {
      /* módulo sin datos */
    }
  }
  // 5) Odontograma 2D/3D: si el que queda no tiene, se usa el del otro
  try {
    const t = clinicaActualId() ?? "demo";
    for (const base of ["cloud-esther:odontograma3d:", "cloud-esther:odontograma2d:"]) {
      const kq = `${base}${odontogramKey(t, String(queda.id))}`;
      const ks = `${base}${odontogramKey(t, String(sale.id))}`;
      const vs = almacenClinico.getItem(ks);
      if (vs && !almacenClinico.getItem(kq)) almacenClinico.setItem(kq, vs);
    }
  } catch {
    /* sin odontograma */
  }
}

export function UnirDuplicados({
  onToast,
  onAuditar,
}: {
  onToast: (m: string) => void;
  onAuditar?: (texto: string) => void;
}) {
  const { pacientes, setPacientes } = usePacientes();
  const registros = useTodosLosRegistros();
  const { turnos } = storeAgenda.usar();
  const pares = useMemo(() => buscarDuplicados(pacientes), [pacientes]);
  const [ignorados, setIgnorados] = useState<string[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [eleccion, setEleccion] = useState<Record<string, number>>({});
  const [confirmar, setConfirmar] = useState("");
  const visibles = pares.filter((p) => !ignorados.includes(`${p.a.id}-${p.b.id}`));
  if (!visibles.length) return null;

  const resumen = (p: Paciente) => {
    const r = registros[p.id];
    const n = r
      ? Object.values(r).reduce((s, v) => s + (Array.isArray(v) ? v.length : 0), 0)
      : 0;
    const t = turnos.filter((x) => normalizarBusqueda(x.paciente) === normalizarBusqueda(nombreDe(p))).length;
    return `${t} turno${t === 1 ? "" : "s"} · ${n} registro${n === 1 ? "" : "s"} clínico${n === 1 ? "" : "s"}`;
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-amber-300/60 bg-gradient-to-br from-amber-50 to-white px-4 py-3 text-left shadow-sm transition hover:-translate-y-0.5 dark:from-amber-500/10 dark:to-card"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm">
          <Copy className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold tracking-tight">
            {visibles.length} posible{visibles.length === 1 ? "" : "s"} paciente{visibles.length === 1 ? "" : "s"} duplicado{visibles.length === 1 ? "" : "s"}
          </span>
          <span className="block text-[11.5px] text-muted-foreground">Revisalos y unilos en una sola ficha, sin perder nada</span>
        </span>
        <ArrowRight className="size-4 shrink-0 text-amber-600" />
      </button>

      {abierto &&
        typeof document !== "undefined" &&
        createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Pacientes duplicados"
          className="fixed inset-0 z-[200] grid place-items-center bg-[#2e1065]/35 p-3 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setAbierto(false)}
        >
          <div className="ce-dialogo max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-primary/15 bg-card p-5 shadow-2xl">
            <div className="mb-4 flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white">
                <Users className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-lg font-semibold">Pacientes duplicados</h2>
                <p className="text-xs text-muted-foreground">
                  Elegí qué ficha queda. Todo lo de la otra (historia, turnos, presupuestos, cuenta, facturas, odontograma) pasa a la que queda.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAbierto(false)}
                aria-label="Cerrar"
                className="grid size-9 place-items-center rounded-full bg-primary/10 text-primary"
              >
                <X className="size-4" />
              </button>
            </div>

            <ul className="space-y-3">
              {visibles.map(({ a, b, motivo }) => {
                const k = `${a.id}-${b.id}`;
                const quedaId = eleccion[k] ?? a.id;
                const queda = quedaId === a.id ? a : b;
                const sale = quedaId === a.id ? b : a;
                return (
                  <li key={k} className="rounded-2xl border border-primary/12 bg-primary/[0.025] p-3">
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">{motivo}</p>
                    <div className="grid gap-2 sm:grid-cols-2" data-movil="1col">
                      {[a, b].map((p) => {
                        const elegido = p.id === quedaId;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setEleccion((e) => ({ ...e, [k]: p.id }))}
                            className={`rounded-xl border p-3 text-left transition ${elegido ? "border-primary bg-white shadow-sm ring-2 ring-primary/20 dark:bg-card" : "border-primary/12 bg-white/60 opacity-80 hover:opacity-100 dark:bg-card"}`}
                          >
                            <span className="flex items-center justify-between gap-2">
                              <span className="truncate text-sm font-semibold">{nombreDe(p)}</span>
                              {elegido && (
                                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                                  <Check className="size-3" /> Queda
                                </span>
                              )}
                            </span>
                            <span className="mt-1 block text-[11.5px] text-muted-foreground">
                              Doc. {p.documento || "—"} · {p.telefono || "sin teléfono"}
                            </span>
                            <span className="block text-[11.5px] text-muted-foreground">{p.email || "sin correo"}</span>
                            <span className="mt-1 block text-[11.5px] font-medium text-foreground/80">{resumen(p)}</span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="mt-2.5 flex flex-wrap items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIgnorados((x) => [...x, k])}
                        className="rounded-xl px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-primary/5"
                      >
                        No son la misma persona
                      </button>
                      {confirmar === k ? (
                        <button
                          type="button"
                          onClick={() => {
                            unir(queda, sale, setPacientes);
                            setConfirmar("");
                            onAuditar?.(`Unió «${nombreDe(sale)}» (doc. ${sale.documento || "—"}) en «${nombreDe(queda)}»`);
                            onToast(`Listo: ${nombreDe(sale)} quedó unido en la ficha de ${nombreDe(queda)}`);
                          }}
                          className="btn-ce !bg-gradient-to-r !from-amber-500 !to-orange-500"
                        >
                          Sí, unir en {queda.nombre}
                        </button>
                      ) : (
                        <button type="button" onClick={() => setConfirmar(k)} className="btn-ce">
                          Unir fichas
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
