import { Lock, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { Cargando, Seccion, Vacio } from "@/components/admin/bits";
import { Campo, DialogoFormulario, INPUT, Pildora, Tabla, confirmar } from "@/components/admin/formularios";
import { BotonExcel } from "@/components/admin/herramientas-atencion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { borrarDe, guardarEn, nuevoIdLocal } from "@/lib/admin/api";
import { useAccion, useColeccion, useEquipo } from "@/lib/admin/consultas";
import { descargarExcel } from "@/lib/admin/excel";
import { fecha } from "@/lib/admin/formato";
import type { ConsumoIA, HerramientaIA, PresupuestoIA } from "@/lib/admin/tipos-empresa";
import { cn } from "@/lib/utils";

/* Ubicación: src/components/admin/uso-ia-equipo.tsx
   USO DE IA DEL EQUIPO — SOLO Dueño y Socio (el servidor no se lo muestra a nadie más,
   tampoco a la persona). Pedido de Camilo (13 oct): «le daré presupuesto para que use ChatGPT,
   Claude, IA para generar video… necesito saber cuánto consume y si en realidad está haciendo
   su trabajo».
   · Presupuesto por persona, herramienta y mes.
   · Consumo: se copia del panel de facturación de cada herramienta (costo y qué se hizo).
   · Trabajo hecho en el mes, contado SOLO desde el panel: publicaciones publicadas, contactos de
     redes, llamadas y casos de atención a su nombre. Así se compara lo gastado con lo producido. */

const HERRAMIENTAS: HerramientaIA[] = ["ChatGPT", "Claude", "Gemini", "Generador de video", "Generador de imágenes", "Otra"];
const UNIDADES: ConsumoIA["unidad"][] = ["Videos", "Imágenes", "Textos", "Minutos", "Créditos", "Otro"];
const usd = (n: number) => `USD ${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const mesActual = () => new Date().toISOString().slice(0, 7);

export function UsoIAEquipo() {
  const { data: equipo } = useEquipo();
  const { data: presupuestos, isLoading } = useColeccion("presupuestosIA");
  const { data: consumos } = useColeccion("consumosIA");
  const { data: publicaciones } = useColeccion("publicaciones");
  const { data: contactos } = useColeccion("contactosRedes");
  const { data: llamadas } = useColeccion("llamadas");
  const { data: casos } = useColeccion("atencionClinicas");
  const [periodo, setPeriodo] = useState(mesActual());
  const [editPres, setEditPres] = useState<PresupuestoIA | "nuevo" | null>(null);
  const [editCons, setEditCons] = useState<ConsumoIA | "nuevo" | null>(null);
  const borrarCons = useAccion((id: string) => borrarDe("consumosIA", id), ["consumosIA"], "Consumo eliminado");

  const personas = useMemo(() => {
    const nombres = new Set<string>();
    (equipo ?? []).filter((a) => a.activo && a.rol !== "owner" && a.rol !== "partner").forEach((a) => nombres.add(a.nombre));
    (presupuestos ?? []).forEach((p) => nombres.add(p.persona));
    (consumos ?? []).forEach((c) => nombres.add(c.persona));
    return [...nombres].sort();
  }, [equipo, presupuestos, consumos]);

  const delMes = (consumos ?? []).filter((c) => c.fecha.startsWith(periodo)).sort((a, b) => b.fecha.localeCompare(a.fecha));
  const resumen = personas.map((persona) => {
    const pres = (presupuestos ?? []).filter((p) => p.persona === persona && p.periodo === periodo);
    const cons = delMes.filter((c) => c.persona === persona);
    const presupuesto = pres.reduce((s, p) => s + p.montoUSD, 0);
    const gastado = cons.reduce((s, c) => s + c.costoUSD, 0);
    const producido = cons.reduce<Record<string, number>>((acc, c) => {
      acc[c.unidad] = (acc[c.unidad] ?? 0) + c.cantidad;
      return acc;
    }, {});
    const trabajo = {
      publicadas: (publicaciones ?? []).filter((p) => p.responsable === persona && p.estado === "Publicada" && p.fecha.startsWith(periodo)).length,
      contactos: (contactos ?? []).filter((c) => c.responsable === persona && c.fecha.startsWith(periodo)).length,
      llamadas: (llamadas ?? []).filter((l) => l.atendio === persona && l.fecha.startsWith(periodo)).length,
      casos: (casos ?? []).filter((c) => c.responsable === persona && c.creado.startsWith(periodo)).length,
    };
    return { persona, presupuesto, gastado, producido, trabajo, cantidadPres: pres.length };
  });

  const exportar = () =>
    descargarExcel(`uso-ia-${periodo}`, "Uso de IA", [
      ["Fecha", "Persona", "Herramienta", "Para qué", "Cantidad", "Unidad", "Costo USD", "Enlace", "Notas"],
      ...delMes.map((c) => [c.fecha, c.persona, c.herramienta, c.para, c.cantidad, c.unidad, c.costoUSD, c.enlace, c.notas]),
    ]);

  return (
    <>
      <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/[0.04] p-4 text-sm">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p className="text-muted-foreground">
          <b className="text-foreground">Solo lo ven el Dueño y el Socio.</b> Las secretarias y el técnico no ven esta
          pestaña ni sus datos (lo controla el servidor). Cargá el presupuesto de cada persona y lo que consumió según el
          panel de facturación de cada herramienta; el trabajo hecho se cuenta solo desde el panel.
        </p>
      </div>

      <Seccion
        titulo="Presupuesto, consumo y trabajo de cada persona"
        descripcion="Si el gasto se acerca al presupuesto se pone amarillo; si lo pasa, rojo."
        acciones={
          <div className="flex flex-wrap gap-2">
            <input type="month" value={periodo} onChange={(e) => setPeriodo(e.target.value || mesActual())} className={`${INPUT} w-auto`} aria-label="Mes" />
            <Button size="sm" variant="outline" onClick={() => setEditPres("nuevo")}>
              <Plus className="mr-1 h-4 w-4" /> Presupuesto
            </Button>
            <Button size="sm" onClick={() => setEditCons("nuevo")}>
              <Plus className="mr-1 h-4 w-4" /> Registrar consumo
            </Button>
          </div>
        }
        sinPadding
      >
        {isLoading ? (
          <div className="p-5">
            <Cargando />
          </div>
        ) : resumen.length === 0 ? (
          <div className="p-5">
            <Vacio titulo="Todavía no hay personas en el equipo" texto="Cuando des acceso a las secretarias, aparecen acá." />
          </div>
        ) : (
          <Tabla columnas={["Persona", "Presupuesto", "Gastado", "Lo que generó con IA", "Trabajo hecho en el panel"]} minimo={820}>
            {resumen.map((r) => {
              const pct = r.presupuesto ? (r.gastado / r.presupuesto) * 100 : r.gastado ? 100 : 0;
              const tono = r.presupuesto && pct > 100 ? "text-destructive" : pct >= 80 ? "text-warning-foreground" : "text-success";
              return (
                <tr key={r.persona} className="border-t border-border/60 align-top">
                  <td className="py-3 pl-5 pr-3 font-semibold">{r.persona}</td>
                  <td className="px-3 py-3 text-sm">
                    {r.presupuesto ? usd(r.presupuesto) : <span className="text-muted-foreground">Sin presupuesto</span>}
                  </td>
                  <td className="px-3 py-3">
                    <p className={cn("text-sm font-bold", tono)}>{usd(r.gastado)}</p>
                    {r.presupuesto > 0 && (
                      <div className="mt-1 h-1.5 w-28 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn("h-full", pct > 100 ? "bg-destructive" : pct >= 80 ? "bg-warning" : "bg-success")}
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>
                    )}
                    {r.presupuesto > 0 && <p className="text-[11px] text-muted-foreground">{pct.toFixed(0)} % del presupuesto</p>}
                  </td>
                  <td className="px-3 py-3 text-xs">
                    {Object.keys(r.producido).length === 0 ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(r.producido).map(([u, n]) => (
                          <Pildora key={u} tono="primario">
                            {n} {u.toLowerCase()}
                          </Pildora>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="py-3 pl-3 pr-5 text-xs text-muted-foreground">
                    {r.trabajo.publicadas} publicaciones publicadas · {r.trabajo.contactos} contactos de redes · {r.trabajo.llamadas} llamadas ·{" "}
                    {r.trabajo.casos} casos
                  </td>
                </tr>
              );
            })}
          </Tabla>
        )}
      </Seccion>

      <Seccion
        titulo="Consumos del mes"
        descripcion="Cada uso cargado: herramienta, para qué se usó, cuánto generó y cuánto costó."
        acciones={<BotonExcel onClick={exportar} />}
        sinPadding
      >
        {delMes.length === 0 ? (
          <div className="p-5">
            <Vacio titulo="Sin consumos este mes" />
          </div>
        ) : (
          <Tabla columnas={["Fecha", "Persona", "Herramienta", "Para qué", "Generó", "Costo", ""]} minimo={820}>
            {delMes.map((c) => (
              <tr key={c.id} className="border-t border-border/60">
                <td className="py-3 pl-5 pr-3 text-xs">{fecha(c.fecha)}</td>
                <td className="px-3 py-3 text-sm font-semibold">{c.persona}</td>
                <td className="px-3 py-3 text-xs">
                  <span className="inline-flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5 text-primary" /> {c.herramienta}
                  </span>
                </td>
                <td className="max-w-[260px] px-3 py-3 text-xs">
                  {c.enlace ? (
                    <a href={c.enlace} target="_blank" rel="noreferrer" className="text-primary underline">
                      {c.para || "Ver"}
                    </a>
                  ) : (
                    c.para || "—"
                  )}
                </td>
                <td className="px-3 py-3 text-xs">
                  {c.cantidad} {c.unidad.toLowerCase()}
                </td>
                <td className="px-3 py-3 text-sm font-semibold">{usd(c.costoUSD)}</td>
                <td className="py-3 pl-3 pr-5 text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setEditCons(c)} title="Editar">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" title="Eliminar" onClick={() => confirmar("¿Eliminar este consumo?") && borrarCons.mutate(c.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </Tabla>
        )}
      </Seccion>

      <Seccion titulo="Presupuestos del mes" descripcion="Uno por persona y herramienta. Tocá uno para cambiarlo.">
        {(presupuestos ?? []).filter((p) => p.periodo === periodo).length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay presupuestos cargados para este mes.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {(presupuestos ?? [])
              .filter((p) => p.periodo === periodo)
              .map((p) => (
                <button key={p.id} type="button" onClick={() => setEditPres(p)} className="rounded-xl border border-border px-3 py-2 text-left text-sm hover:border-primary/40">
                  <b>{p.persona}</b> · {p.herramienta} · {usd(p.montoUSD)}
                </button>
              ))}
          </div>
        )}
      </Seccion>

      {editPres && (
        <DialogoPresupuesto personas={personas} periodo={periodo} inicial={editPres === "nuevo" ? null : editPres} onCerrar={() => setEditPres(null)} />
      )}
      {editCons && <DialogoConsumo personas={personas} inicial={editCons === "nuevo" ? null : editCons} onCerrar={() => setEditCons(null)} />}
    </>
  );
}

function SelectorPersona({ personas, valor, onCambiar }: { personas: string[]; valor: string; onCambiar: (v: string) => void }) {
  return (
    <>
      <input list="personas-ia" value={valor} onChange={(e) => onCambiar(e.target.value)} className={INPUT} placeholder="Elegí la persona" />
      <datalist id="personas-ia">
        {personas.map((p) => (
          <option key={p} value={p} />
        ))}
      </datalist>
    </>
  );
}

function DialogoPresupuesto({
  personas,
  periodo,
  inicial,
  onCerrar,
}: {
  personas: string[];
  periodo: string;
  inicial: PresupuestoIA | null;
  onCerrar: () => void;
}) {
  const guardar = useAccion((p: PresupuestoIA) => guardarEn("presupuestosIA", p), ["presupuestosIA"], "Presupuesto guardado");
  const borrar = useAccion((id: string) => borrarDe("presupuestosIA", id), ["presupuestosIA"], "Presupuesto eliminado");
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState<PresupuestoIA>(
    inicial ?? { id: nuevoIdLocal("pia"), persona: personas[0] ?? "", herramienta: "ChatGPT", periodo, montoUSD: 0, notas: "" },
  );
  const enviar = () => {
    if (!f.persona.trim()) return setError("Elegí la persona.");
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(f.periodo)) return setError("Elegí el mes.");
    if (!Number.isFinite(f.montoUSD) || f.montoUSD < 0) return setError("El monto no es válido.");
    setError(null);
    guardar.mutate({ ...f, persona: f.persona.trim(), montoUSD: Math.round(f.montoUSD * 100) / 100 }, { onSuccess: onCerrar });
  };
  return (
    <DialogoFormulario abierto titulo={inicial ? "Editar presupuesto" : "Presupuesto de IA"} onCerrar={onCerrar} onGuardar={enviar} guardando={guardar.isPending} error={error}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo label="Persona" className="sm:col-span-2">
          <SelectorPersona personas={personas} valor={f.persona} onCambiar={(v) => setF({ ...f, persona: v })} />
        </Campo>
        <Campo label="Herramienta">
          <select value={f.herramienta} onChange={(e) => setF({ ...f, herramienta: e.target.value as HerramientaIA })} className={INPUT}>
            {HERRAMIENTAS.map((h) => (
              <option key={h}>{h}</option>
            ))}
          </select>
        </Campo>
        <Campo label="Mes">
          <input type="month" value={f.periodo} onChange={(e) => setF({ ...f, periodo: e.target.value })} className={INPUT} />
        </Campo>
        <Campo label="Monto (USD)">
          <input type="number" min={0} step={0.01} value={f.montoUSD} onChange={(e) => setF({ ...f, montoUSD: Number(e.target.value) })} className={INPUT} />
        </Campo>
        <Campo label="Notas" className="sm:col-span-2">
          <Textarea value={f.notas} onChange={(e) => setF({ ...f, notas: e.target.value })} rows={2} maxLength={1000} />
        </Campo>
      </div>
      {inicial && (
        <Button
          type="button"
          variant="ghost"
          className="mt-2 text-destructive"
          onClick={() => confirmar("¿Eliminar este presupuesto?") && borrar.mutate(inicial.id, { onSuccess: onCerrar })}
        >
          <Trash2 className="mr-1 h-4 w-4" /> Eliminar
        </Button>
      )}
    </DialogoFormulario>
  );
}

function DialogoConsumo({ personas, inicial, onCerrar }: { personas: string[]; inicial: ConsumoIA | null; onCerrar: () => void }) {
  const guardar = useAccion((c: ConsumoIA) => guardarEn("consumosIA", c), ["consumosIA"], "Consumo guardado");
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState<ConsumoIA>(
    inicial ?? {
      id: nuevoIdLocal("cia"),
      fecha: new Date().toISOString().slice(0, 10),
      persona: personas[0] ?? "",
      herramienta: "ChatGPT",
      para: "",
      cantidad: 1,
      unidad: "Videos",
      costoUSD: 0,
      enlace: "",
      notas: "",
    },
  );
  const enviar = () => {
    if (!f.persona.trim()) return setError("Elegí la persona.");
    if (!Number.isFinite(f.costoUSD) || f.costoUSD < 0) return setError("El costo no es válido.");
    if (f.enlace && !/^https?:\/\//i.test(f.enlace.trim())) return setError("El enlace tiene que empezar con https://");
    setError(null);
    guardar.mutate(
      {
        ...f,
        persona: f.persona.trim(),
        enlace: f.enlace.trim(),
        cantidad: Math.max(0, Math.floor(f.cantidad || 0)),
        costoUSD: Math.round(f.costoUSD * 100) / 100,
      },
      { onSuccess: onCerrar },
    );
  };
  return (
    <DialogoFormulario
      abierto
      titulo={inicial ? "Editar consumo" : "Registrar consumo de IA"}
      descripcion="Copiá el costo del panel de facturación de la herramienta (ChatGPT, Claude, el generador de video…)."
      onCerrar={onCerrar}
      onGuardar={enviar}
      guardando={guardar.isPending}
      error={error}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo label="Persona">
          <SelectorPersona personas={personas} valor={f.persona} onCambiar={(v) => setF({ ...f, persona: v })} />
        </Campo>
        <Campo label="Fecha">
          <input type="date" value={f.fecha} onChange={(e) => setF({ ...f, fecha: e.target.value })} className={INPUT} />
        </Campo>
        <Campo label="Herramienta">
          <select value={f.herramienta} onChange={(e) => setF({ ...f, herramienta: e.target.value as HerramientaIA })} className={INPUT}>
            {HERRAMIENTAS.map((h) => (
              <option key={h}>{h}</option>
            ))}
          </select>
        </Campo>
        <Campo label="Costo (USD)">
          <input type="number" min={0} step={0.01} value={f.costoUSD} onChange={(e) => setF({ ...f, costoUSD: Number(e.target.value) })} className={INPUT} />
        </Campo>
        <Campo label="Qué generó (cantidad)">
          <input type="number" min={0} value={f.cantidad} onChange={(e) => setF({ ...f, cantidad: Number(e.target.value) })} className={INPUT} />
        </Campo>
        <Campo label="Unidad">
          <select value={f.unidad} onChange={(e) => setF({ ...f, unidad: e.target.value as ConsumoIA["unidad"] })} className={INPUT}>
            {UNIDADES.map((u) => (
              <option key={u}>{u}</option>
            ))}
          </select>
        </Campo>
        <Campo label="Para qué lo usó" className="sm:col-span-2">
          <input value={f.para} onChange={(e) => setF({ ...f, para: e.target.value })} maxLength={300} className={INPUT} placeholder="Ej.: 2 videos de la agenda para Instagram" />
        </Campo>
        <Campo label="Enlace al resultado (opcional)" className="sm:col-span-2">
          <input value={f.enlace} onChange={(e) => setF({ ...f, enlace: e.target.value })} className={INPUT} placeholder="https://…" />
        </Campo>
        <Campo label="Notas" className="sm:col-span-2">
          <Textarea value={f.notas} onChange={(e) => setF({ ...f, notas: e.target.value })} rows={2} maxLength={1000} />
        </Campo>
      </div>
    </DialogoFormulario>
  );
}
