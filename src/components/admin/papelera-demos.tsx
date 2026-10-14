import { useState } from "react";
import { toast } from "sonner";
import { History, RotateCcw, Trash2, TriangleAlert } from "lucide-react";

import { Vacio } from "@/components/admin/bits";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  eliminarDemosDefinitivo,
  restaurarDemos,
  vaciarPapeleraDemos,
  type RegistroPapelera,
  type ResultadoPapelera,
} from "@/lib/admin/api";
import { useAccion, usePapeleraDemos } from "@/lib/admin/consultas";
import { fecha, haceCuanto } from "@/lib/admin/formato";
import { cn } from "@/lib/utils";

/* Ubicación: src/components/admin/papelera-demos.tsx
   PAPELERA DE DEMOS (solo Dueño y Socio).
   - En la papelera: el demo no aparece en la lista y no puede entrar. Se puede restaurar.
   - Eliminar definitivamente: borra el demo y su historial; el correo queda libre para
     volver a probar desde cero. Si una contratación vino de un demo, la contratación queda intacta.
   - Sin límite: «Vaciar papelera» y «Eliminar todo» borran todo, por tandas, y cada demo queda en el registro.
   - Registro: quién mandó a la papelera, restauró o eliminó cada demo, y cuándo. */

export const CLAVES_PAPELERA = ["demos", "papelera-demos"];

/** Texto del aviso después de una acción en lote */
export function resumenResultado(r: ResultadoPapelera, hecho: string) {
  const base = r.hechos === 1 ? `1 demo ${hecho}` : `${r.hechos} demos ${hecho}s`;
  return r.omitidos.length ? `${base}. ${r.omitidos.length} no se pudieron: ${r.omitidos[0]?.motivo ?? ""}` : base;
}

/* ───────────── Confirmación (con motivo opcional y, si se pide, palabra a escribir) ───────────── */

export function ConfirmarPapelera({
  abierta,
  onCerrar,
  titulo,
  texto,
  boton,
  peligro = false,
  palabra,
  ocupado,
  onConfirmar,
}: {
  abierta: boolean;
  onCerrar: () => void;
  titulo: string;
  texto: string;
  boton: string;
  peligro?: boolean;
  /** Si se indica, hay que escribirla para habilitar el botón (acciones sin vuelta atrás) */
  palabra?: string;
  ocupado: boolean;
  onConfirmar: (motivo: string) => void;
}) {
  const [motivo, setMotivo] = useState("");
  const [escrito, setEscrito] = useState("");
  const listo = !palabra || escrito.trim().toUpperCase() === palabra;
  return (
    <Dialog
      open={abierta}
      onOpenChange={(v) => {
        if (!v) {
          setMotivo("");
          setEscrito("");
          onCerrar();
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span
              className={cn(
                "grid size-9 place-items-center rounded-xl",
                peligro ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary",
              )}
            >
              {peligro ? <TriangleAlert className="size-4" /> : <Trash2 className="size-4" />}
            </span>
            {titulo}
          </DialogTitle>
          <DialogDescription>{texto}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label htmlFor="papelera-motivo" className="text-xs font-semibold text-muted-foreground">
              Motivo (opcional, queda en el registro)
            </label>
            <Textarea
              id="papelera-motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value.slice(0, 300))}
              placeholder="Ej.: pruebas internas, registro duplicado…"
              rows={2}
            />
          </div>
          {palabra && (
            <div className="space-y-1.5">
              <label htmlFor="papelera-palabra" className="text-xs font-semibold text-muted-foreground">
                Para confirmar, escribí <b className="text-foreground">{palabra}</b>
              </label>
              <Input
                id="papelera-palabra"
                value={escrito}
                onChange={(e) => setEscrito(e.target.value)}
                autoComplete="off"
              />
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={onCerrar} disabled={ocupado}>
              Cancelar
            </Button>
            <Button
              variant={peligro ? "destructive" : "default"}
              disabled={!listo || ocupado}
              onClick={() => onConfirmar(motivo.trim())}
            >
              {ocupado ? "Un momento…" : boton}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ───────────── Contenido de la papelera (va dentro de una hoja lateral) ───────────── */

const ACCION: Record<RegistroPapelera["accion"], { texto: string; clase: string }> = {
  papelera: { texto: "A la papelera", clase: "bg-warning/20 text-foreground" },
  restaurar: { texto: "Restaurado", clase: "bg-success/15 text-success" },
  eliminar: { texto: "Eliminado", clase: "bg-destructive/10 text-destructive" },
};

export function PapeleraDemos() {
  const { data, isLoading } = usePapeleraDemos();
  const [vista, setVista] = useState<"papelera" | "registro">("papelera");
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [confirmar, setConfirmar] = useState<"restaurar" | "eliminar" | "vaciar" | null>(null);

  const restaurar = useAccion(restaurarDemos, CLAVES_PAPELERA, (a) => `Listo: ${a.ids.length === 1 ? "1 demo restaurado" : `${a.ids.length} demos restaurados`}`);
  const eliminar = useAccion(eliminarDemosDefinitivo, CLAVES_PAPELERA);
  const vaciar = useAccion(vaciarPapeleraDemos, CLAVES_PAPELERA);
  const ocupado = restaurar.isPending || eliminar.isPending || vaciar.isPending;

  const demos = data?.demos ?? [];
  const registro = data?.registro ?? [];
  const ids = [...marcados].filter((id) => demos.some((d) => d.id === id));
  const todos = demos.length > 0 && ids.length === demos.length;
  const alternar = (id: string) =>
    setMarcados((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const terminar = () => {
    setConfirmar(null);
    setMarcados(new Set());
  };

  return (
    <div className="p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary-glow text-white shadow-md">
          <Trash2 className="size-5" />
        </span>
        <div>
          <h2 className="font-display text-xl font-bold tracking-tight">Papelera de demos</h2>
          <p className="text-sm text-muted-foreground">
            Lo que está acá no aparece en la lista y no puede entrar al demo. Restauralo o eliminalo para siempre.
          </p>
        </div>
      </div>

      <div className="mt-5 flex gap-1.5 rounded-2xl bg-muted/60 p-1" role="tablist">
        {(
          [
            { id: "papelera", label: `En la papelera (${demos.length})`, icon: Trash2 },
            { id: "registro", label: "Registro", icon: History },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={vista === t.id}
            onClick={() => setVista(t.id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition",
              vista === t.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <t.icon className="size-4" />
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Cargando…</p>
      ) : vista === "papelera" ? (
        <div className="mt-4 space-y-3">
          {demos.length === 0 ? (
            <Vacio titulo="La papelera está vacía" texto="Desde la lista de demos, tildá los que quieras y mandalos acá." />
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <label className="mr-auto flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    className="size-4 accent-[var(--primary)]"
                    checked={todos}
                    onChange={() => setMarcados(todos ? new Set() : new Set(demos.map((d) => d.id)))}
                  />
                  {ids.length ? `${ids.length} elegidos` : "Elegir todos"}
                </label>
                <Button size="sm" variant="outline" disabled={!ids.length || ocupado} onClick={() => setConfirmar("restaurar")}>
                  <RotateCcw className="size-4" /> Restaurar
                </Button>
                <Button size="sm" variant="destructive" disabled={!ids.length || ocupado} onClick={() => setConfirmar("eliminar")}>
                  <Trash2 className="size-4" /> Eliminar
                </Button>
              </div>
              <ul className="space-y-2">
                {demos.map((d) => (
                  <li
                    key={d.id}
                    className={cn(
                      "flex items-start gap-3 rounded-2xl border p-3 transition",
                      marcados.has(d.id) ? "border-primary/40 bg-primary/[0.04]" : "border-border/70 hover:border-primary/25",
                    )}
                  >
                    <input
                      type="checkbox"
                      className="mt-1 size-4 shrink-0 accent-[var(--primary)]"
                      checked={marcados.has(d.id)}
                      onChange={() => alternar(d.id)}
                      aria-label={`Elegir el demo de ${d.clinica}`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{d.clinica}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {d.nombre} · {d.email} · {d.pais}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        La mandó {d.enviadoPor || "alguien del equipo"} · {haceCuanto(d.enviado)}
                        {d.motivo ? ` · «${d.motivo}»` : ""}
                      </p>
                      {d.conContratacion && (
                        <span className="mt-1 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10.5px] font-semibold text-primary">
                          Tiene una contratación: la contratación queda intacta
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              <div className="rounded-2xl border border-destructive/20 bg-destructive/[0.04] p-3">
                <p className="text-sm font-semibold">Vaciar la papelera</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Elimina para siempre todos los demos de la papelera, sin límite. Los correos quedan libres para volver a probar desde cero.
                </p>
                <Button size="sm" variant="destructive" className="mt-2" disabled={ocupado} onClick={() => setConfirmar("vaciar")}>
                  <Trash2 className="size-4" /> Vaciar papelera
                </Button>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="mt-4">
          {registro.length === 0 ? (
            <Vacio titulo="Todavía no hay movimientos" />
          ) : (
            <ol className="relative space-y-3 border-l border-border pl-5">
              {registro.map((r) => (
                <li key={r.id} className="relative">
                  <span className="absolute -left-[26px] top-1.5 size-2.5 rounded-full bg-primary ring-4 ring-background" />
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn("rounded-full px-2 py-0.5 text-[10.5px] font-bold", ACCION[r.accion].clase)}>
                      {ACCION[r.accion].texto}
                    </span>
                    <span className="text-xs text-muted-foreground">{fecha(r.fecha, true)}</span>
                  </div>
                  <p className="mt-1 text-sm">
                    <b>{r.quien}</b> · {r.clinica}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {r.nombre} · {r.email}
                    {r.motivo ? ` · «${r.motivo}»` : ""}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      <ConfirmarPapelera
        abierta={confirmar === "restaurar"}
        onCerrar={() => setConfirmar(null)}
        titulo="Restaurar demos"
        texto={`Vuelven a la lista de demos (${ids.length}). Para entrar, cada persona inicia sesión de nuevo.`}
        boton="Restaurar"
        ocupado={ocupado}
        onConfirmar={() => restaurar.mutate({ ids }, { onSuccess: terminar })}
      />
      <ConfirmarPapelera
        abierta={confirmar === "eliminar"}
        onCerrar={() => setConfirmar(null)}
        titulo="Eliminar para siempre"
        texto={`Se borran ${ids.length === 1 ? "este demo" : `estos ${ids.length} demos`} y todo su historial. No se puede deshacer. Queda el registro de quién lo hizo.`}
        boton="Eliminar para siempre"
        peligro
        palabra="ELIMINAR"
        ocupado={ocupado}
        onConfirmar={(motivo) =>
          eliminar.mutate(
            { ids, ...(motivo ? { motivo } : {}) },
            {
              onSuccess: (r) => {
                notificar(resumenResultado(r, "eliminado"));
                terminar();
              },
            },
          )
        }
      />
      <ConfirmarPapelera
        abierta={confirmar === "vaciar"}
        onCerrar={() => setConfirmar(null)}
        titulo="Vaciar la papelera"
        texto={`Se eliminan para siempre todos los demos de la papelera (${demos.length}${demos.length >= 2000 ? " o más" : ""}). No se puede deshacer. Cada uno queda en el registro.`}
        boton="Vaciar papelera"
        peligro
        palabra="VACIAR"
        ocupado={ocupado}
        onConfirmar={(motivo) =>
          vaciar.mutate(
            motivo ? { motivo } : {},
            {
              onSuccess: (r) => {
                notificar(resumenResultado(r, "eliminado"));
                terminar();
              },
            },
          )
        }
      />
    </div>
  );
}

/* Aviso con el resultado (sonner, el mismo del panel) */
function notificar(texto: string) {
  toast.success(texto);
}
