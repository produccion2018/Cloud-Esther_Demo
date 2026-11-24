import { useState } from "react";
import { BookmarkPlus, FileText, X } from "lucide-react";
import { useCloudEstherOpcional } from "@/lib/cloud-esther/data";
import { useClinicaReal } from "@/lib/clinica/modo-clinica";
import { cargarSettings, guardarSettings, useClinicSettings, type PlantillaEvolucion } from "@/lib/cloud-esther/settings-store";

/* Ubicación: src/components/cloud-esther/pacientes/PlantillasEvolucion.tsx
   PLANTILLAS DE EVOLUCIÓN (todos los planes): textos listos por tratamiento que se cargan con un
   toque y se completan (los […] marcan qué cambiar). La clínica guarda las suyas con
   «Guardar como plantilla» y se comparten con todo el equipo. */

export const PLANTILLAS_BASE: PlantillaEvolucion[] = [
  {
    id: "b-control",
    nombre: "Control",
    motivo: "Control periódico",
    detalle: "Examen clínico intraoral y extraoral. Tejidos blandos sin particularidades. Higiene [buena/regular/deficiente]. Sin hallazgos de caries activas [o detallar piezas].",
    indicaciones: "Cepillado 3 veces por día e hilo dental.",
    proximoControl: "En 6 meses",
  },
  {
    id: "b-limpieza",
    nombre: "Limpieza",
    motivo: "Profilaxis / tartrectomía",
    detalle: "Tartrectomía supra[/sub]gingival con ultrasonido. Pulido con pasta profiláctica. Aplicación de flúor [barniz/gel]. Sangrado al sondaje [sí/no].",
    indicaciones: "No comer ni beber por 30 minutos. Técnica de cepillado indicada.",
    proximoControl: "En 6 meses",
  },
  {
    id: "b-obturacion",
    nombre: "Obturación",
    motivo: "Caries",
    detalle: "Pieza [__]: anestesia [técnica/anestésico]. Remoción de caries, aislamiento [relativo/absoluto]. Grabado ácido, adhesivo y resina compuesta color [__], cara(s) [O/M/D/V/L]. Ajuste oclusal y pulido.",
    indicaciones: "Esperar a que pase la anestesia para comer. Puede haber sensibilidad unos días.",
  },
  {
    id: "b-extraccion",
    nombre: "Extracción",
    motivo: "Extracción dentaria",
    detalle: "Pieza [__]: anestesia [técnica/anestésico, cantidad de tubos]. Sindesmotomía, luxación y avulsión sin complicaciones. Curetaje del alvéolo, hemostasia con gasa. [Sutura: sí/no].",
    indicaciones: "Morder la gasa 30 minutos. Frío local las primeras horas. Dieta blanda y fría. No enjuagar ni escupir por 24 h. No fumar.",
    proximoControl: "En 7 días (retiro de puntos si corresponde)",
  },
  {
    id: "b-endodoncia",
    nombre: "Endodoncia",
    motivo: "Tratamiento de conducto",
    detalle: "Pieza [__], sesión [1/2/3]: anestesia, aislamiento absoluto. Apertura cameral, conductometría [__ mm], preparación químico-mecánica, irrigación con hipoclorito. [Medicación intraconducto / obturación del conducto]. Obturación provisoria.",
    indicaciones: "Evitar masticar del lado tratado hasta la restauración definitiva. Analgésico si hay dolor.",
    proximoControl: "Próxima sesión en [__] días",
  },
  {
    id: "b-urgencia",
    nombre: "Urgencia",
    motivo: "Urgencia por dolor",
    detalle: "Dolor en zona de pieza [__], de [__] días de evolución, [espontáneo/provocado]. Pruebas: frío [+/-], percusión [+/-]. Diagnóstico presuntivo: [pulpitis/absceso/otro]. Tratamiento: [__].",
    indicaciones: "Medicación indicada en la receta. Volver si aumenta el dolor o hay inflamación.",
    proximoControl: "En [__] días",
  },
  {
    id: "b-implante",
    nombre: "Implante",
    motivo: "Colocación de implante",
    detalle: "Zona [__]: anestesia, incisión y despegamiento. Fresado secuencial, colocación de implante [marca, diámetro x largo], torque [__ Ncm]. [Tapa de cierre / cicatrizal]. Sutura.",
    indicaciones: "Antibiótico y analgésico según receta. Frío local. Dieta blanda. No fumar.",
    proximoControl: "En 7-10 días (control y retiro de puntos)",
  },
  {
    id: "b-ortodoncia",
    nombre: "Ortodoncia",
    motivo: "Control de ortodoncia",
    detalle: "Control mensual. Cambio de arco [__]. Ligaduras [__]. [Elásticos clase __]. Higiene [buena/regular].",
    indicaciones: "Uso de elásticos según indicación. Evitar alimentos duros y pegajosos.",
    proximoControl: "En 30 días",
  },
  {
    id: "b-protesis",
    nombre: "Prótesis",
    motivo: "Prótesis",
    detalle: "[Toma de impresión / prueba de estructura / prueba de dientes / instalación]. [Detalle del paso realizado].",
    indicaciones: "[Indicaciones de uso e higiene de la prótesis].",
  },
  {
    id: "b-blanqueamiento",
    nombre: "Blanqueamiento",
    motivo: "Blanqueamiento dental",
    detalle: "Color inicial [__]. Protección gingival. Agente blanqueador [__ %], [__] aplicaciones de [__] min. Color final [__].",
    indicaciones: "Dieta blanca 48 h (sin café, té, vino, mate ni salsas). Puede haber sensibilidad.",
  },
];

export function usePlantillasEvolucion() {
  const ctx = useCloudEstherOpcional();
  const clinicId = ctx?.clinic ?? "demo";
  const settings = useClinicSettings(clinicId);
  const propias = settings.plantillasEvolucion ?? [];
  const guardar = (p: Omit<PlantillaEvolucion, "id">) => {
    const actual = cargarSettings(clinicId);
    const lista = actual.plantillasEvolucion ?? [];
    const nueva = { ...p, id: `c-${Date.now().toString(36)}` };
    guardarSettings(clinicId, {
      ...actual,
      plantillasEvolucion: [...lista.filter((x) => x.nombre.toLowerCase() !== p.nombre.toLowerCase()), nueva],
    });
  };
  const borrar = (id: string) => {
    const actual = cargarSettings(clinicId);
    guardarSettings(clinicId, {
      ...actual,
      plantillasEvolucion: (actual.plantillasEvolucion ?? []).filter((x) => x.id !== id),
    });
  };
  return { todas: [...propias, ...PLANTILLAS_BASE], propias, guardar, borrar };
}

/** Fila de plantillas para elegir con un toque (y guardar la evolución actual como plantilla). */
export function ElegirPlantilla({
  onUsar,
  actual,
}: {
  onUsar: (p: PlantillaEvolucion) => void;
  /** Lo que hay escrito ahora (para «Guardar como plantilla») */
  actual?: { motivo: string; detalle: string; indicaciones?: string; proximoControl?: string };
}) {
  const { todas, guardar, borrar } = usePlantillasEvolucion();
  const [nombrando, setNombrando] = useState(false);
  const [nombre, setNombre] = useState("");
  const [guardada, setGuardada] = useState(false);
  // Las plantillas propias quedan en la configuración de la clínica: las guarda el administrador
  const real = useClinicaReal();
  const puedeGuardar = !!actual && actual.detalle.trim().length > 10 && (!real || real.rol === "admin");

  return (
    <div className="rounded-2xl border border-primary/12 bg-primary/[0.03] p-2.5">
      <div className="mb-1.5 flex items-center justify-between gap-2 px-0.5">
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-primary/80">
          <FileText className="size-3.5" />
          Plantillas
        </p>
        {puedeGuardar && !nombrando && (
          <button
            type="button"
            onClick={() => {
              setNombre(actual?.motivo ?? "");
              setNombrando(true);
              setGuardada(false);
            }}
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold text-primary hover:bg-primary/10"
          >
            <BookmarkPlus className="size-3.5" />
            {guardada ? "Guardada ✓" : "Guardar como plantilla"}
          </button>
        )}
      </div>
      {nombrando && actual && (
        <div className="mb-2 flex gap-1.5">
          <input
            autoFocus
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            maxLength={30}
            placeholder="Nombre de la plantilla"
            className="h-9 min-w-0 flex-1 rounded-xl border border-primary/20 bg-white px-3 text-sm outline-none focus:border-primary/45 focus:ring-2 focus:ring-primary/15 dark:bg-card"
          />
          <button
            type="button"
            disabled={!nombre.trim()}
            onClick={() => {
              guardar({
                nombre: nombre.trim(),
                motivo: actual.motivo.trim(),
                detalle: actual.detalle.trim(),
                ...(actual.indicaciones?.trim() ? { indicaciones: actual.indicaciones.trim() } : {}),
                ...(actual.proximoControl?.trim() ? { proximoControl: actual.proximoControl.trim() } : {}),
              });
              setNombrando(false);
              setGuardada(true);
            }}
            className="btn-ce !min-h-9 disabled:opacity-40"
          >
            Guardar
          </button>
          <button
            type="button"
            onClick={() => setNombrando(false)}
            aria-label="Cancelar"
            className="grid size-9 shrink-0 place-items-center rounded-xl text-muted-foreground hover:bg-primary/5"
          >
            <X className="size-4" />
          </button>
        </div>
      )}
      <div className="flex flex-wrap gap-1.5">
        {todas.map((p) => {
          const propia = p.id.startsWith("c-");
          return (
            <span key={p.id} className="inline-flex items-center">
              <button
                type="button"
                onClick={() => onUsar(p)}
                title={p.detalle}
                className={`h-8 rounded-full border px-3 text-xs font-semibold transition hover:-translate-y-0.5 hover:border-primary hover:bg-primary hover:text-primary-foreground ${
                  propia
                    ? "border-fuchsia-300 bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-500/10 dark:text-fuchsia-300"
                    : "border-primary/15 bg-white text-foreground/80 dark:bg-card"
                } ${propia ? "rounded-r-none pr-2" : ""}`}
              >
                {p.nombre}
              </button>
              {propia && (
                <button
                  type="button"
                  onClick={() => borrar(p.id)}
                  aria-label={`Borrar la plantilla ${p.nombre}`}
                  className="grid h-8 w-6 place-items-center rounded-r-full border border-l-0 border-fuchsia-300 bg-fuchsia-50 text-fuchsia-600 hover:bg-fuchsia-100 dark:bg-fuchsia-500/10"
                >
                  <X className="size-3" />
                </button>
              )}
            </span>
          );
        })}
      </div>
      <p className="mt-1.5 px-0.5 text-[10.5px] text-muted-foreground">Tocá una y completá lo que está entre [ ].</p>
    </div>
  );
}

/** "En 6 meses" / "En 7 días" / "En 30 días" → fecha (yyyy-mm-dd). "" si no se puede saber. */
export function fechaDesdeTexto(t: string | undefined): string {
  const m = /(\d+)\s*(d[ií]as?|semanas?|mes(?:es)?)/i.exec(t ?? "");
  if (!m) return "";
  const n = Number(m[1]);
  const d = new Date();
  const u = m[2]!.toLowerCase();
  if (u.startsWith("d")) d.setDate(d.getDate() + n);
  else if (u.startsWith("s")) d.setDate(d.getDate() + n * 7);
  else d.setMonth(d.getMonth() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
