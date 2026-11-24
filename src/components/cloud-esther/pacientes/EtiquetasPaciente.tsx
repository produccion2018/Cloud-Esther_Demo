import { useState } from "react";
import { Check, Plus, Tag, Trash2, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { COLORES_ETIQUETA, useEtiquetas, type Paciente } from "@/lib/cloud-esther/pacientes";

/* Ubicación: src/components/cloud-esther/pacientes/EtiquetasPaciente.tsx
   ETIQUETAS de pacientes: cada clínica arma las suyas (VIP, Debe dinero, Miedo al dentista…)
   con un color. En la lista se ven como chips; con «+» se ponen o sacan, y se crean nuevas. */

export const TONO_ETIQUETA: Record<string, string> = {
  violeta: "border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-500/40 dark:bg-violet-500/10 dark:text-violet-300",
  rosa: "border-pink-300 bg-pink-50 text-pink-700 dark:border-pink-500/40 dark:bg-pink-500/10 dark:text-pink-300",
  rojo: "border-red-300 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300",
  ambar: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300",
  verde: "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300",
  azul: "border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-300",
  gris: "border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-500/40 dark:bg-slate-500/10 dark:text-slate-300",
};
const PUNTO: Record<string, string> = {
  violeta: "bg-violet-500", rosa: "bg-pink-500", rojo: "bg-red-500", ambar: "bg-amber-500",
  verde: "bg-emerald-500", azul: "bg-sky-500", gris: "bg-slate-400",
};

export function ChipEtiqueta({ nombre, color }: { nombre: string; color: string }) {
  return (
    <span
      className={`inline-flex max-w-[11rem] items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${TONO_ETIQUETA[color] ?? TONO_ETIQUETA["gris"]}`}
    >
      <span className={`size-1.5 shrink-0 rounded-full ${PUNTO[color] ?? PUNTO["gris"]}`} />
      <span className="truncate">{nombre}</span>
    </span>
  );
}

export function EtiquetasPaciente({ paciente, editable = true }: { paciente: Paciente; editable?: boolean }) {
  const { catalogo, crear, borrar, alternar, colorDe } = useEtiquetas();
  const [nueva, setNueva] = useState("");
  const [color, setColor] = useState<string>("violeta");
  const [confirmarBorrar, setConfirmarBorrar] = useState("");
  const suyas = (paciente.etiquetas ?? []).filter((n) => catalogo.some((c) => c.nombre === n));

  const agregar = () => {
    const n = crear(nueva, color);
    if (n && !suyas.includes(n)) alternar(paciente.id, n);
    setNueva("");
  };

  return (
    <>
      {suyas.map((n) => (
        <ChipEtiqueta key={n} nombre={n} color={colorDe(n)} />
      ))}
      {editable && (
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={`Etiquetas de ${paciente.nombre} ${paciente.apellido}`}
              title="Etiquetas"
              className="inline-flex h-[22px] items-center gap-1 rounded-full border border-dashed border-primary/30 px-2 text-[11px] font-semibold text-primary/80 transition hover:border-primary hover:bg-primary/5 hover:text-primary"
            >
              {suyas.length ? <Plus className="size-3" /> : <><Tag className="size-3" /> Etiqueta</>}
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-72 rounded-2xl border-primary/15 p-3">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Etiquetas</p>
            <ul className="max-h-56 space-y-0.5 overflow-y-auto">
              {catalogo.map((c) => {
                const puesta = suyas.includes(c.nombre);
                return (
                  <li key={c.nombre} className="group flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => alternar(paciente.id, c.nombre)}
                      className={`flex min-w-0 flex-1 items-center gap-2 rounded-xl px-2 py-1.5 text-left text-sm transition hover:bg-primary/5 ${puesta ? "font-semibold" : ""}`}
                    >
                      <span
                        className={`grid size-4 shrink-0 place-items-center rounded border ${puesta ? "border-primary bg-primary text-primary-foreground" : "border-primary/30"}`}
                      >
                        {puesta && <Check className="size-3" />}
                      </span>
                      <span className={`size-2 shrink-0 rounded-full ${PUNTO[c.color] ?? PUNTO["gris"]}`} />
                      <span className="truncate">{c.nombre}</span>
                    </button>
                    {confirmarBorrar === c.nombre ? (
                      <span className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            borrar(c.nombre);
                            setConfirmarBorrar("");
                          }}
                          className="rounded-lg bg-destructive px-2 py-1 text-[11px] font-semibold text-white"
                        >
                          Borrar
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmarBorrar("")}
                          aria-label="Cancelar"
                          className="grid size-6 place-items-center rounded-lg text-muted-foreground hover:bg-primary/5"
                        >
                          <X className="size-3.5" />
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmarBorrar(c.nombre)}
                        aria-label={`Borrar la etiqueta ${c.nombre} de la clínica`}
                        title="Borrar de la clínica"
                        className="grid size-7 shrink-0 place-items-center rounded-lg text-muted-foreground/60 opacity-60 transition hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
            <div className="mt-2 border-t border-primary/10 pt-2">
              <p className="mb-1.5 text-[11px] font-semibold text-muted-foreground">Nueva etiqueta</p>
              <div className="flex gap-1.5">
                <input
                  value={nueva}
                  onChange={(e) => setNueva(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      agregar();
                    }
                  }}
                  maxLength={30}
                  placeholder="Ej: Paga en cuotas"
                  className="h-9 min-w-0 flex-1 rounded-xl border border-primary/20 bg-white px-3 text-sm outline-none focus:border-primary/45 focus:ring-2 focus:ring-primary/15 dark:bg-card"
                />
                <button
                  type="button"
                  onClick={agregar}
                  disabled={!nueva.trim()}
                  className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground disabled:opacity-40"
                  aria-label="Crear etiqueta"
                >
                  <Plus className="size-4" />
                </button>
              </div>
              <div className="mt-2 flex gap-1.5">
                {COLORES_ETIQUETA.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    aria-label={`Color ${c}`}
                    className={`size-6 rounded-full ${PUNTO[c]} ring-offset-2 transition ${color === c ? "ring-2 ring-primary" : "opacity-70 hover:opacity-100"}`}
                  />
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </>
  );
}
