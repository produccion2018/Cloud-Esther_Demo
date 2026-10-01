import { FileHeart, Printer, ScanSearch, Smile, Stethoscope } from "lucide-react";
import { TEETH_BY_FDI, TOOTH_STATE_META, type ToothState } from "@/lib/odontogram/fdi";
import { cargarTratamientos } from "@/lib/odontogram/historial";
import { imprimirHTML } from "@/components/cloud-esther/rrhh/ui";
import { storeRayosX, TIPOS_RX } from "@/lib/cloud-esther/rayos-x";
import { storeSimulador } from "@/lib/cloud-esther/simulador-sonrisa";

/* Ubicación: src/components/cloud-esther/odontograma3d/InformeIntegral.tsx
   Informe integral del paciente: une el odontograma 3D, el último análisis de rayos X y la
   última simulación de sonrisa en un solo documento a color, listo para explicar e imprimir. */

function Bloque({
  icon: Icon,
  titulo,
  children,
}: {
  icon: typeof Smile;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-primary/12 bg-white p-4">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <span className="grid size-8 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-4" />
        </span>
        {titulo}
      </p>
      <div className="mt-3">{children}</div>
    </div>
  );
}

export function InformeIntegral({
  pacienteId,
  clavePaciente,
  nombre,
  chart,
  profesional,
}: {
  pacienteId: number;
  clavePaciente: string;
  nombre: string;
  chart: Record<number, ToothState>;
  profesional: string;
}) {
  const rx = storeRayosX.usar().analisis.find((a) => a.pacienteId === pacienteId);
  const sim = storeSimulador.usar().simulaciones.find((s) => s.pacienteId === pacienteId);
  const tratamientos = cargarTratamientos(clavePaciente);
  const piezas = Object.entries(chart)
    .map(([fdi, estado]) => ({ fdi: Number(fdi), estado }))
    .filter((p) => p.estado !== "sano")
    .sort((a, b) => a.fdi - b.fdi);
  const conteo = (Object.keys(TOOTH_STATE_META) as ToothState[])
    .filter((e) => e !== "sano")
    .map((e) => [e, piezas.filter((p) => p.estado === e).length] as const)
    .filter(([, n]) => n > 0);
  const rxVigentes = rx?.hallazgos.filter((h) => h.estado !== "Descartado") ?? [];
  const simulacion = sim?.propuestas[0];

  const imprimir = () =>
    imprimirHTML(
      `Informe integral · ${nombre}`,
      `<h1>Informe integral</h1><p style="color:#6b7280">${nombre} · ${new Date().toLocaleDateString("es-AR")} · ${profesional}</p>
      <h2>Odontograma</h2>
      <p>${conteo.map(([e, n]) => `<span style="display:inline-block;margin:2px 6px 2px 0;padding:3px 10px;border-radius:999px;background:${TOOTH_STATE_META[e].color}33;font-weight:600">● ${TOOTH_STATE_META[e].label}: ${n}</span>`).join("") || "Sin hallazgos registrados."}</p>
      ${piezas.length ? `<table><tr><th>Pieza</th><th>Nombre</th><th>Estado</th><th>Tratamiento planificado</th></tr>${piezas.map((p) => `<tr><td>${p.fdi}</td><td>${TEETH_BY_FDI[p.fdi]?.name ?? ""}</td><td><span style="color:${TOOTH_STATE_META[p.estado].color};font-weight:700">●</span> ${TOOTH_STATE_META[p.estado].label}</td><td>${tratamientos[p.fdi] ?? "—"}</td></tr>`).join("")}</table>` : ""}
      ${rx ? `<h2>Rayos X · ${rx.tipoEstudio} (${new Date(rx.fecha).toLocaleDateString("es-AR")})</h2><img src="${rx.imagen}" style="width:100%;border-radius:10px"><ul>${rxVigentes.map((h) => `<li><span style="color:${TIPOS_RX[h.tipo].color};font-weight:700">●</span> Pieza ${h.pieza}: ${TIPOS_RX[h.tipo].nombre} (${h.severidad.toLowerCase()})</li>`).join("")}</ul>` : ""}
      ${sim && simulacion ? `<h2>Propuesta estética · ${simulacion.titulo}</h2><div style="display:flex;gap:8px"><img src="${sim.foto}" style="width:49%;border-radius:10px"><img src="${simulacion.url}" style="width:49%;border-radius:10px"></div><p style="color:#6b7280;font-size:11px">Simulación orientativa: no garantiza el resultado clínico.</p>` : ""}
      <p style="color:#6b7280;font-size:11px;margin-top:20px">Informe generado con Cloud Esther con los datos registrados por el profesional.</p>`,
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/12 bg-gradient-to-r from-primary/[0.06] via-white to-white p-4">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground">
            <FileHeart className="size-5" />
          </span>
          <div>
            <p className="font-semibold">Informe integral de {nombre}</p>
            <p className="text-xs text-muted-foreground">
              Odontograma 3D + rayos X + simulación de sonrisa en un solo documento a color.
            </p>
          </div>
        </div>
        <button type="button" className="btn-ce" onClick={imprimir}>
          <Printer className="size-4" /> Imprimir / PDF
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Bloque icon={Stethoscope} titulo="Odontograma 3D">
          {piezas.length ? (
            <>
              <div className="flex flex-wrap gap-1.5">
                {conteo.map(([e, n]) => (
                  <span
                    key={e}
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                    style={{ background: `${TOOTH_STATE_META[e].color}26` }}
                  >
                    <span
                      className="size-2 rounded-full"
                      style={{ background: TOOTH_STATE_META[e].color }}
                    />
                    {TOOTH_STATE_META[e].label}: {n}
                  </span>
                ))}
              </div>
              <ul className="mt-3 space-y-1 text-xs">
                {piezas.slice(0, 8).map((p) => (
                  <li key={p.fdi} className="flex items-center gap-2">
                    <span
                      className="size-2 rounded-full"
                      style={{ background: TOOTH_STATE_META[p.estado].color }}
                    />
                    <b>{p.fdi}</b> {TOOTH_STATE_META[p.estado].label}
                    {tratamientos[p.fdi] && (
                      <span className="text-muted-foreground">· {tratamientos[p.fdi]}</span>
                    )}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              Sin hallazgos registrados en el odontograma.
            </p>
          )}
        </Bloque>
        <Bloque icon={ScanSearch} titulo="Rayos X">
          {rx ? (
            <>
              <img
                src={rx.imagen}
                alt={rx.tipoEstudio}
                className="aspect-[2/1] w-full rounded-xl bg-black object-cover"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                {rx.tipoEstudio} · {new Date(rx.fecha).toLocaleDateString("es-AR")}
              </p>
              <ul className="mt-2 space-y-1 text-xs">
                {rxVigentes.slice(0, 6).map((h) => (
                  <li key={h.id} className="flex items-center gap-2">
                    <span
                      className="size-2 rounded-full"
                      style={{ background: TIPOS_RX[h.tipo].color }}
                    />
                    Pieza {h.pieza}: {TIPOS_RX[h.tipo].nombre}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              Todavía no hay análisis de rayos X guardados.
            </p>
          )}
        </Bloque>
        <Bloque icon={Smile} titulo="Propuesta estética">
          {sim && simulacion ? (
            <>
              <div className="grid grid-cols-2 gap-1.5">
                <img
                  src={sim.foto}
                  alt="Antes"
                  className="aspect-[19/13] w-full rounded-lg object-cover"
                />
                <img
                  src={simulacion.url}
                  alt="Simulación"
                  className="aspect-[19/13] w-full rounded-lg object-cover"
                />
              </div>
              <p className="mt-2 text-xs font-semibold text-primary">{simulacion.titulo}</p>
              <p className="text-[11px] text-muted-foreground">Simulación orientativa.</p>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">Todavía no hay simulaciones guardadas.</p>
          )}
        </Bloque>
      </div>
    </div>
  );
}
