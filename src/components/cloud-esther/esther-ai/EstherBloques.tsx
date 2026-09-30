import { useNavigate } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, Download, FileText, Info, Printer } from "lucide-react";
import type { Bloque } from "@/lib/cloud-esther/esther-motor";
import { descargarExcel } from "@/components/cloud-esther/rrhh/excel";
import { imprimirHTML } from "@/components/cloud-esther/rrhh/ui";

/* Respuestas visuales de Esther dentro del chat: indicadores, tablas, gráficos de barras,
   listas, informes (con PDF/Excel) y acciones sugeridas. Usan los tokens de color del tema. */

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function EstherBloques({
  bloques,
  onPregunta,
}: {
  bloques: Bloque[];
  onPregunta: (q: string) => void;
}) {
  const navigate = useNavigate();
  const tablas = bloques.filter((b): b is Extract<Bloque, { tipo: "tabla" }> => b.tipo === "tabla");
  const informe = bloques.find(
    (b): b is Extract<Bloque, { tipo: "informe" }> => b.tipo === "informe",
  );

  const pdf = () => {
    if (!informe) return;
    imprimirHTML(
      informe.titulo,
      `<h1>${esc(informe.titulo)}</h1><p style="color:#6b7280">Preparado por Cloud Esther IA · ${new Date().toLocaleString("es-AR")}</p>` +
        informe.secciones
          .map((s) => `<h2>${esc(s.titulo)}</h2><p>${esc(s.texto).replace(/\n/g, "<br>")}</p>`)
          .join("") +
        tablas
          .map(
            (t) =>
              `<h2>${esc(t.titulo ?? "Detalle")}</h2><table><tr>${t.columnas.map((c) => `<th>${esc(c)}</th>`).join("")}</tr>${t.filas
                .map((f) => `<tr>${f.map((v) => `<td>${esc(String(v))}</td>`).join("")}</tr>`)
                .join("")}</table>`,
          )
          .join("") +
        `<p style="margin-top:24px;color:#6b7280;font-size:11px">Información generada con los datos registrados en Cloud Esther. No reemplaza el criterio profesional.</p>`,
    );
  };
  const excel = () =>
    void descargarExcel(
      `${(informe?.titulo ?? "consulta-esther").toLowerCase().replace(/[^a-z0-9áéíóúñ]+/gi, "-")}.xlsx`,
      tablas.map((t, i) => ({
        nombre: (t.titulo ?? `Datos ${i + 1}`).slice(0, 31),
        columnas: t.columnas.map((c, j) => ({
          titulo: c,
          clave: `c${j}`,
          ancho: Math.max(12, c.length + 6),
        })),
        filas: t.filas.map((f) => Object.fromEntries(f.map((v, j) => [`c${j}`, v]))),
      })),
    );

  return (
    <div className="mt-2.5 space-y-2.5">
      {bloques.map((b, i) => {
        if (b.tipo === "kpis")
          return (
            <div key={i} className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              {b.items.map((k) => (
                <div
                  key={k.label}
                  className="rounded-xl border border-primary/15 bg-primary/[0.12] px-2.5 py-2"
                >
                  <p className="text-[9.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    {k.label}
                  </p>
                  <p className="mt-0.5 truncate text-base font-bold text-primary">{k.valor}</p>
                  {k.sub && <p className="text-[10px] text-muted-foreground">{k.sub}</p>}
                </div>
              ))}
            </div>
          );
        if (b.tipo === "tabla")
          return (
            <div key={i} className="overflow-hidden rounded-xl border border-primary/15">
              {b.titulo && (
                <p className="border-b border-primary/10 bg-primary/[0.05] px-2.5 py-1.5 text-[11px] font-semibold">
                  {b.titulo}
                </p>
              )}
              <div className="scroll-sutil max-h-64 overflow-auto">
                <table className="w-full text-[11.5px]">
                  <thead>
                    <tr className="text-left text-[10px] uppercase tracking-[0.05em] text-muted-foreground">
                      {b.columnas.map((c) => (
                        <th
                          key={c}
                          className="sticky top-0 whitespace-nowrap bg-background px-2.5 py-1.5"
                        >
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {b.filas.map((f, j) => (
                      <tr key={j} className="border-t border-primary/10">
                        {f.map((v, k) => (
                          <td key={k} className="whitespace-nowrap px-2.5 py-1.5 tabular-nums">
                            {v}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        if (b.tipo === "barras") {
          const max = Math.max(1, ...b.items.map((x) => x.valor));
          return (
            <div key={i} className="rounded-xl border border-primary/15 p-2.5">
              <p className="mb-1.5 text-[11px] font-semibold">{b.titulo}</p>
              <ul className="space-y-1.5">
                {b.items.map((x) => (
                  <li key={x.nombre}>
                    <div className="flex justify-between gap-2 text-[11px]">
                      <span className="truncate">{x.nombre}</span>
                      <b className="tabular-nums">{x.etiqueta}</b>
                    </div>
                    <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-primary/10">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.max(3, (x.valor / max) * 100)}%`,
                          background: "var(--gradient-esther)",
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          );
        }
        if (b.tipo === "lista")
          return (
            <div key={i} className="space-y-1.5">
              {b.titulo && <p className="text-[11px] font-semibold">{b.titulo}</p>}
              {b.items.map((x, j) => {
                const I =
                  x.tono === "alerta" ? AlertTriangle : x.tono === "ok" ? CheckCircle2 : Info;
                return (
                  <div
                    key={j}
                    className={`flex items-start gap-2 rounded-xl border px-2.5 py-2 text-[12px] ${x.tono === "alerta" ? "border-amber-300/50 bg-amber-500/10" : x.tono === "ok" ? "border-emerald-300/50 bg-emerald-500/10" : "border-primary/15 bg-primary/[0.05]"}`}
                  >
                    <I
                      className={`mt-0.5 size-3.5 shrink-0 ${x.tono === "alerta" ? "text-amber-600" : x.tono === "ok" ? "text-emerald-600" : "text-primary"}`}
                    />
                    <span>
                      {x.texto}
                      {x.detalle && (
                        <span className="block text-[11px] text-muted-foreground">{x.detalle}</span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        if (b.tipo === "informe")
          return (
            <div key={i} className="rounded-xl border border-primary/25 bg-primary/[0.08] p-3">
              <p className="flex items-center gap-1.5 text-[12.5px] font-semibold">
                <FileText className="size-3.5 text-primary" /> {b.titulo}
              </p>
              <div className="mt-2 space-y-2">
                {b.secciones.map((s) => (
                  <div key={s.titulo}>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-primary">
                      {s.titulo}
                    </p>
                    <p className="whitespace-pre-line text-[12px] leading-relaxed">{s.texto}</p>
                  </div>
                ))}
              </div>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={pdf}
                  className="inline-flex items-center gap-1 rounded-lg border border-primary/20 px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary/10"
                >
                  <Printer className="size-3" /> PDF
                </button>
                {tablas.length > 0 && (
                  <button
                    type="button"
                    onClick={excel}
                    className="inline-flex items-center gap-1 rounded-lg border border-primary/20 px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary/10"
                  >
                    <Download className="size-3" /> Excel
                  </button>
                )}
              </div>
            </div>
          );
        if (b.tipo === "acciones")
          return (
            <div key={i} className="flex flex-wrap gap-1.5">
              {b.items.map((a) => (
                <button
                  key={a.label}
                  type="button"
                  onClick={() =>
                    a.pregunta
                      ? onPregunta(a.pregunta)
                      : a.to && void navigate({ to: a.to as never })
                  }
                  className="rounded-full border border-primary/25 bg-primary/[0.06] px-2.5 py-1 text-[11px] font-semibold text-primary transition hover:bg-primary/15"
                >
                  {a.label}
                </button>
              ))}
              {!informe && tablas.length > 0 && (
                <button
                  type="button"
                  onClick={excel}
                  className="inline-flex items-center gap-1 rounded-full border border-primary/25 px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary/10"
                >
                  <Download className="size-3" /> Excel
                </button>
              )}
            </div>
          );
        return (
          <p
            key={i}
            className="rounded-lg bg-muted/60 px-2.5 py-1.5 text-[11px] text-muted-foreground"
          >
            {b.texto}
          </p>
        );
      })}
    </div>
  );
}
