import { Pill, X } from "lucide-react";
import { useCloudEstherOpcional } from "@/lib/cloud-esther/data";
import { useClinicaReal } from "@/lib/clinica/modo-clinica";
import {
  cargarSettings,
  guardarSettings,
  useClinicSettings,
  type MedicamentoFrecuente,
} from "@/lib/cloud-esther/settings-store";

/* Ubicación: src/components/cloud-esther/pacientes/MedicamentosFrecuentes.tsx

   Vademécum propio de cada clínica: los medicamentos que receta seguido, con presentación, vía y
   posología. Se cargan en la receta con un toque. Se suman los más recetados en la clínica
   (calculados de las recetas ya emitidas), así sirve desde el primer día sin configurar nada.
   Quedan en la configuración de la clínica (por empresa): en una clínica real los guarda el
   administrador. */

export type MedicamentoUso = Omit<MedicamentoFrecuente, "id">;

const clave = (n: string) => n.trim().toLowerCase();

export function useMedicamentosFrecuentes() {
  const ctx = useCloudEstherOpcional();
  const clinicId = ctx?.clinic ?? "demo";
  const settings = useClinicSettings(clinicId);
  const real = useClinicaReal();
  const propios = settings.medicamentosFrecuentes ?? [];
  const puedeEditar = !real || real.rol === "admin";
  const guardar = (m: MedicamentoUso) => {
    const actual = cargarSettings(clinicId);
    const lista = actual.medicamentosFrecuentes ?? [];
    const nuevo = { ...m, nombre: m.nombre.trim(), id: `m-${Date.now().toString(36)}` };
    guardarSettings(clinicId, {
      ...actual,
      medicamentosFrecuentes: [...lista.filter((x) => clave(x.nombre) !== clave(m.nombre)), nuevo],
    });
  };
  const borrar = (id: string) => {
    const actual = cargarSettings(clinicId);
    guardarSettings(clinicId, {
      ...actual,
      medicamentosFrecuentes: (actual.medicamentosFrecuentes ?? []).filter((x) => x.id !== id),
    });
  };
  const esPropio = (nombre: string) => propios.some((p) => clave(p.nombre) === clave(nombre));
  return { propios, guardar, borrar, esPropio, puedeEditar };
}

/** Los más recetados en la clínica (de todas las recetas de todos los pacientes). */
export function masRecetados(
  recetas: { fecha: string; medicamentos: { nombre: string; presentacion: string; via: string; posologia: string }[] }[],
  max = 6,
): MedicamentoUso[] {
  const cuenta = new Map<string, { veces: number; fecha: string; m: MedicamentoUso }>();
  for (const r of recetas) {
    for (const m of r.medicamentos ?? []) {
      if (!m?.nombre?.trim()) continue;
      const k = clave(m.nombre);
      const prev = cuenta.get(k);
      const dato = { nombre: m.nombre.trim(), presentacion: m.presentacion ?? "", via: m.via ?? "", posologia: m.posologia ?? "" };
      if (!prev) cuenta.set(k, { veces: 1, fecha: r.fecha, m: dato });
      else {
        prev.veces += 1;
        // Se queda con la forma de recetarlo más reciente
        if (r.fecha >= prev.fecha) {
          prev.fecha = r.fecha;
          prev.m = dato;
        }
      }
    }
  }
  return [...cuenta.values()]
    .sort((a, b) => b.veces - a.veces || b.fecha.localeCompare(a.fecha))
    .slice(0, max)
    .map((x) => x.m);
}

/** Fila de medicamentos frecuentes: un toque y se agrega a la receta completo. */
export function ElegirMedicamentoFrecuente({
  usados,
  onUsar,
}: {
  /** Más recetados en la clínica (se muestran después de los propios) */
  usados: MedicamentoUso[];
  onUsar: (m: MedicamentoUso) => void;
}) {
  const { propios, borrar, puedeEditar } = useMedicamentosFrecuentes();
  const extra = usados.filter((u) => !propios.some((p) => clave(p.nombre) === clave(u.nombre)));
  if (propios.length === 0 && extra.length === 0) {
    return (
      <p className="mb-2 rounded-xl border border-dashed border-primary/20 px-3 py-2 text-[11px] text-muted-foreground">
        Tocá el marcador de un medicamento para guardarlo como frecuente de la clínica y cargarlo
        con un toque en las próximas recetas.
      </p>
    );
  }
  return (
    <div className="mb-2 rounded-2xl border border-primary/12 bg-primary/[0.03] p-2.5">
      <p className="mb-1.5 flex items-center gap-1.5 px-0.5 text-[11px] font-bold uppercase tracking-wider text-primary/80">
        <Pill className="size-3.5" />
        Frecuentes de la clínica
      </p>
      <div className="flex flex-wrap gap-1.5">
        {propios.map((p) => (
          <span key={p.id} className="inline-flex items-center">
            <button
              type="button"
              onClick={() => onUsar(p)}
              title={[p.presentacion, p.posologia].filter(Boolean).join(" · ")}
              className={`h-8 rounded-full border border-fuchsia-300 bg-fuchsia-50 px-3 text-xs font-semibold text-fuchsia-700 transition hover:-translate-y-0.5 hover:border-primary hover:bg-primary hover:text-primary-foreground dark:bg-fuchsia-500/10 dark:text-fuchsia-300 ${
                puedeEditar ? "rounded-r-none pr-2" : ""
              }`}
            >
              {p.nombre}
            </button>
            {puedeEditar && (
              <button
                type="button"
                onClick={() => borrar(p.id)}
                aria-label={`Quitar ${p.nombre} de los frecuentes`}
                className="grid h-8 w-6 place-items-center rounded-r-full border border-l-0 border-fuchsia-300 bg-fuchsia-50 text-fuchsia-600 hover:bg-fuchsia-100 dark:bg-fuchsia-500/10"
              >
                <X className="size-3" />
              </button>
            )}
          </span>
        ))}
        {extra.map((u) => (
          <button
            key={u.nombre}
            type="button"
            onClick={() => onUsar(u)}
            title={[u.presentacion, u.posologia].filter(Boolean).join(" · ")}
            className="h-8 rounded-full border border-primary/15 bg-white px-3 text-xs font-semibold text-foreground/80 transition hover:-translate-y-0.5 hover:border-primary hover:bg-primary hover:text-primary-foreground dark:bg-card"
          >
            {u.nombre}
          </button>
        ))}
      </div>
    </div>
  );
}
