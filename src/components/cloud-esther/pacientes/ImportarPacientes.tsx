import { useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Upload,
  Users,
  X,
} from "lucide-react";

import { SUCURSALES } from "@/lib/cloud-esther/agenda-store";
import { usePacientes, type Paciente } from "@/lib/cloud-esther/pacientes";
import { normalizarBusqueda } from "@/lib/utils";

/* Ubicación: src/components/cloud-esther/pacientes/ImportarPacientes.tsx
   IMPORTAR PACIENTES desde Excel (.xlsx) o CSV, para migrar desde otro sistema sin cargar de a uno:
   1. Se sube el archivo (o se baja la plantilla).
   2. Las columnas se reconocen solas (Nombre, Apellido, DNI, Teléfono, Email, Obra social…),
      aunque vengan con otro nombre («Documento», «Celular», «Prepaga»…). Se pueden corregir a mano.
   3. Vista previa con validación: filas con error y DUPLICADOS (mismo documento ya cargado o
      repetido en el archivo) quedan marcados y no se importan.
   4. Se confirman y se suman a los pacientes de ESTA clínica (nunca a otra).
   Solo quien puede dar de alta pacientes (el Administrador) ve el botón. */

type Campo =
  | "nombre"
  | "apellido"
  | "completo"
  | "documento"
  | "telefono"
  | "email"
  | "obraSocial"
  | "afiliado"
  | "fechaNacimiento"
  | "direccion"
  | "nota";

const CAMPOS: { id: Campo; label: string; claves: string[] }[] = [
  { id: "nombre", label: "Nombre", claves: ["nombre", "nombres", "first name", "name"] },
  { id: "apellido", label: "Apellido", claves: ["apellido", "apellidos", "last name", "surname"] },
  { id: "completo", label: "Nombre y apellido juntos", claves: ["paciente", "nombre completo", "nombre y apellido", "apellido y nombre"] },
  { id: "documento", label: "Documento", claves: ["dni", "documento", "doc", "cedula", "cédula", "nro documento", "rut", "ci"] },
  { id: "telefono", label: "Teléfono", claves: ["telefono", "teléfono", "celular", "movil", "móvil", "whatsapp", "tel"] },
  { id: "email", label: "Email", claves: ["email", "e-mail", "correo", "mail"] },
  { id: "obraSocial", label: "Obra social", claves: ["obra social", "prepaga", "cobertura", "os", "seguro"] },
  { id: "afiliado", label: "N.º de afiliado", claves: ["afiliado", "nro afiliado", "numero de afiliado", "credencial"] },
  { id: "fechaNacimiento", label: "Nacimiento", claves: ["nacimiento", "fecha de nacimiento", "fecha nacimiento", "nac"] },
  { id: "direccion", label: "Dirección", claves: ["direccion", "dirección", "domicilio", "calle"] },
  { id: "nota", label: "Notas", claves: ["nota", "notas", "observaciones", "comentarios"] },
];

type Fila = Record<string, string | number>;
type Revisada = { n: number; datos: Omit<Paciente, "id">; problema: string | null; duplicado: boolean };

const norm = (s: string) => normalizarBusqueda(s).replace(/[^a-z0-9 ]/g, "").trim();
const titulo = (s: string) =>
  s
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .replace(/(^|\s)\S/g, (c) => c.toUpperCase());

function reconocer(cabeceras: string[]): Partial<Record<Campo, string>> {
  const mapa: Partial<Record<Campo, string>> = {};
  for (const c of CAMPOS) {
    const h = cabeceras.find((x) => c.claves.includes(norm(x))) ?? cabeceras.find((x) => c.claves.some((k) => k.length > 3 && norm(x).includes(k)));
    if (h && !Object.values(mapa).includes(h)) mapa[c.id] = h;
  }
  // Si hay columna de nombre completo no se usan nombre/apellido sueltos con el mismo encabezado
  return mapa;
}

/** Fechas «12/04/1988», «1988-04-12» o número de Excel → «1988-04-12» */
function fechaISO(v: string | number | undefined): string {
  if (v === undefined || v === "") return "";
  if (typeof v === "number") {
    const d = new Date(Date.UTC(1899, 11, 30) + v * 86_400_000);
    return d.toISOString().slice(0, 10);
  }
  const t = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10);
  const m = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (!m) return "";
  const anio = m[3]!.length === 2 ? `19${m[3]}` : m[3]!;
  return `${anio}-${m[2]!.padStart(2, "0")}-${m[1]!.padStart(2, "0")}`;
}

function revisar(filas: Fila[], mapa: Partial<Record<Campo, string>>, existentes: Paciente[]): Revisada[] {
  const val = (f: Fila, c: Campo) => {
    const k = mapa[c];
    return k ? String(f[k] ?? "").trim() : "";
  };
  const docsCargados = new Set(existentes.map((p) => p.documento).filter(Boolean));
  const vistos = new Set<string>();
  return filas.map((f, i) => {
    let nombre = val(f, "nombre");
    let apellido = val(f, "apellido");
    const completo = val(f, "completo");
    if ((!nombre || !apellido) && completo) {
      // «Pinto, Mauro» o «Mauro Pinto»
      if (completo.includes(",")) {
        const [a = "", n = ""] = completo.split(",");
        apellido ||= a;
        nombre ||= n;
      } else {
        const partes = completo.trim().split(/\s+/);
        apellido ||= partes.length > 1 ? (partes.pop() ?? "") : "";
        nombre ||= partes.join(" ");
      }
    }
    const documento = val(f, "documento").replace(/\D/g, "");
    const email = val(f, "email").toLowerCase();
    let problema: string | null = null;
    if (!nombre.trim() || !apellido.trim()) problema = "Falta nombre o apellido";
    else if (documento && !/^\d{6,12}$/.test(documento)) problema = "Documento con formato raro";
    else if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) problema = "Email inválido";
    const duplicado = !!documento && (docsCargados.has(documento) || vistos.has(documento));
    if (documento) vistos.add(documento);
    const obra = val(f, "obraSocial");
    return {
      n: i + 2,
      problema,
      duplicado,
      datos: {
        nombre: titulo(nombre),
        apellido: titulo(apellido),
        documento,
        fechaNacimiento: fechaISO(mapa.fechaNacimiento ? f[mapa.fechaNacimiento] : undefined),
        genero: "",
        email,
        telefono: val(f, "telefono"),
        sucursal: SUCURSALES[0] ?? "",
        obraSocial: obra || "No aplica / particular",
        afiliado: val(f, "afiliado"),
        direccion: val(f, "direccion"),
        nota: val(f, "nota"),
        estado: "Activo",
        foto: null,
      },
    };
  });
}

async function bajarPlantilla() {
  const { descargarExcel } = await import("@/components/cloud-esther/rrhh/excel");
  await descargarExcel("plantilla-pacientes.xlsx", [
    {
      nombre: "Pacientes",
      nota: "Completá una fila por paciente. Nombre y Apellido son obligatorios; lo demás es opcional.",
      columnas: [
        { titulo: "Nombre", clave: "nombre", ancho: 18 },
        { titulo: "Apellido", clave: "apellido", ancho: 18 },
        { titulo: "DNI", clave: "dni", ancho: 14 },
        { titulo: "Teléfono", clave: "tel", ancho: 18 },
        { titulo: "Email", clave: "email", ancho: 26 },
        { titulo: "Obra social", clave: "os", ancho: 18 },
        { titulo: "Afiliado", clave: "afiliado", ancho: 16 },
        { titulo: "Nacimiento", clave: "nac", ancho: 14 },
        { titulo: "Dirección", clave: "dir", ancho: 26 },
        { titulo: "Notas", clave: "notas", ancho: 30 },
      ],
      filas: [
        { nombre: "Ana", apellido: "Gómez", dni: "30111222", tel: "+54 11 5555-0101", email: "ana@correo.com", os: "OSDE", afiliado: "123456", nac: "12/04/1988", dir: "Av. Siempre Viva 123", notas: "" },
      ],
    },
  ]);
}

export function ImportarPacientes({
  onCerrar,
  onToast,
}: {
  onCerrar: () => void;
  onToast: (m: string) => void;
}) {
  const { pacientes, setPacientes } = usePacientes();
  const archivo = useRef<HTMLInputElement>(null);
  const [nombreArchivo, setNombreArchivo] = useState("");
  const [filas, setFilas] = useState<Fila[]>([]);
  const [cabeceras, setCabeceras] = useState<string[]>([]);
  const [mapa, setMapa] = useState<Partial<Record<Campo, string>>>({});
  const [error, setError] = useState("");
  const [leyendo, setLeyendo] = useState(false);

  const leer = async (f: File) => {
    setError("");
    if (f.size > 5 * 1024 * 1024) return setError("El archivo pesa más de 5 MB. Dividilo en partes.");
    setLeyendo(true);
    try {
      const { leerPlanilla } = await import("@/components/cloud-esther/rrhh/excel");
      const datos = (await leerPlanilla(f)).slice(0, 5000);
      if (!datos.length) return setError("No encontré filas. Revisá que la primera fila tenga los títulos.");
      const cab = [...new Set(datos.flatMap((d) => Object.keys(d)))];
      setNombreArchivo(f.name);
      setFilas(datos);
      setCabeceras(cab);
      setMapa(reconocer(cab));
    } catch {
      setError("No pude leer el archivo. Usá Excel (.xlsx) o CSV.");
    } finally {
      setLeyendo(false);
    }
  };

  const revisadas = filas.length ? revisar(filas, mapa, pacientes) : [];
  const validas = revisadas.filter((r) => !r.problema && !r.duplicado);
  const conError = revisadas.filter((r) => r.problema).length;
  const duplicados = revisadas.filter((r) => !r.problema && r.duplicado).length;

  const importar = () => {
    if (!validas.length) return;
    let id = Math.max(0, ...pacientes.map((p) => p.id));
    const nuevos = validas.map((r) => ({ ...r.datos, id: ++id }));
    setPacientes((prev) => [...nuevos, ...prev]);
    onToast(`${nuevos.length} pacientes importados desde ${nombreArchivo}`);
    onCerrar();
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-[radial-gradient(circle_at_50%_0%,rgba(124,58,237,0.35),rgba(15,5,30,0.55))] backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={onCerrar}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Importar pacientes"
        onMouseDown={(e) => e.stopPropagation()}
        className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-[28px] border border-primary/15 bg-card shadow-[0_40px_90px_-30px_rgba(76,29,149,0.8)] sm:max-w-3xl sm:rounded-[28px]"
      >
        <div className="relative overflow-hidden bg-[linear-gradient(118deg,#4c1d95,#7c3aed_45%,#c026d3)] px-5 pb-5 pt-5 text-white sm:px-7">
          <div aria-hidden className="pointer-events-none absolute -right-10 -top-16 size-48 rounded-full bg-fuchsia-300/30 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.2)_1px,transparent_1px)] [background-size:16px_16px] [mask-image:linear-gradient(100deg,transparent_40%,black)]" />
          <div className="relative flex items-start gap-3.5">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl border border-white/30 bg-white/15 backdrop-blur">
              <FileSpreadsheet className="size-6" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.2em] text-white/70">Migración</p>
              <h2 className="font-display text-xl font-bold tracking-tight sm:text-2xl">Importar pacientes</h2>
              <p className="mt-0.5 text-sm text-white/85">
                Desde Excel o CSV. Reconozco las columnas solo y marco los duplicados.
              </p>
            </div>
            <button
              type="button"
              onClick={onCerrar}
              aria-label="Cerrar"
              className="grid size-9 place-items-center rounded-xl bg-white/15 hover:bg-white/25"
            >
              <X className="size-4" />
            </button>
          </div>
          <ol className="relative mt-4 grid grid-cols-3 gap-2 text-[11px] font-semibold">
            {["Subir archivo", "Revisar columnas", "Confirmar"].map((p, i) => {
              const paso = filas.length ? (i < 2 ? "hecho" : "ahora") : i === 0 ? "ahora" : "luego";
              return (
                <li
                  key={p}
                  className={`flex items-center gap-2 rounded-xl px-2.5 py-2 ${paso === "luego" ? "bg-white/10 text-white/60" : "bg-white/20"}`}
                >
                  <span className={`grid size-5 place-items-center rounded-full text-[10px] ${paso === "hecho" ? "bg-emerald-400 text-emerald-950" : "bg-white text-primary"}`}>
                    {paso === "hecho" ? "✓" : i + 1}
                  </span>
                  {p}
                </li>
              );
            })}
          </ol>
        </div>

        <div className="space-y-4 p-5 sm:p-7">
          {!filas.length ? (
            <>
              <button
                type="button"
                onClick={() => archivo.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const f = e.dataTransfer.files?.[0];
                  if (f) void leer(f);
                }}
                className="group flex w-full flex-col items-center gap-3 rounded-3xl border-2 border-dashed border-primary/25 bg-gradient-to-br from-primary/[0.04] to-fuchsia-500/[0.05] px-6 py-10 text-center transition hover:border-primary/50 hover:bg-primary/[0.06]"
              >
                <span className="relative">
                  <span aria-hidden className="absolute -inset-3 rounded-full bg-primary/20 blur-xl transition group-hover:bg-primary/30" />
                  <span className="relative grid size-16 place-items-center rounded-full bg-gradient-to-br from-primary to-fuchsia-500 text-white shadow-lg transition group-hover:-translate-y-1">
                    <Upload className="size-7" />
                  </span>
                </span>
                <span className="font-display text-base font-bold">
                  {leyendo ? "Leyendo el archivo…" : "Arrastrá el archivo o tocá para elegirlo"}
                </span>
                <span className="text-xs text-muted-foreground">Excel (.xlsx) o CSV · hasta 5.000 pacientes por archivo</span>
              </button>
              <input
                ref={archivo}
                type="file"
                accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="hidden"
                aria-label="Archivo de pacientes"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void leer(f);
                  e.target.value = "";
                }}
              />
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/10 bg-muted/40 p-3.5">
                <p className="text-xs text-muted-foreground">
                  ¿No tenés el archivo armado? Bajá la plantilla, completala y subila.
                </p>
                <button type="button" onClick={() => void bajarPlantilla()} className="btn-ce-outline !min-h-10">
                  <Download className="size-4" /> Plantilla de Excel
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { t: "Listos para importar", v: validas.length, c: "from-emerald-500 to-teal-500", i: CheckCircle2 },
                  { t: "Duplicados", v: duplicados, c: "from-amber-500 to-orange-500", i: Users },
                  { t: "Con error", v: conError, c: "from-rose-500 to-pink-500", i: AlertTriangle },
                ].map((k) => (
                  <div key={k.t} className="relative overflow-hidden rounded-2xl border border-primary/10 bg-card p-3">
                    <span aria-hidden className={`absolute -right-6 -top-6 size-16 rounded-full bg-gradient-to-br ${k.c} opacity-15 blur-xl`} />
                    <span className={`grid size-8 place-items-center rounded-xl bg-gradient-to-br ${k.c} text-white`}>
                      <k.i className="size-4" />
                    </span>
                    <p className="mt-2 font-display text-2xl font-bold tabular-nums">{k.v}</p>
                    <p className="text-[11px] text-muted-foreground">{k.t}</p>
                  </div>
                ))}
              </div>

              <section>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  Columnas de «{nombreArchivo}»
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {CAMPOS.map((c) => (
                    <label key={c.id} className="flex items-center gap-2 rounded-xl border border-primary/10 bg-card px-3 py-2 text-xs">
                      <span className={`size-2 shrink-0 rounded-full ${mapa[c.id] ? "bg-emerald-500" : "bg-muted-foreground/30"}`} />
                      <span className="w-28 shrink-0 font-semibold">{c.label}</span>
                      <select
                        value={mapa[c.id] ?? ""}
                        onChange={(e) =>
                          setMapa((m) => {
                            const sig = { ...m };
                            if (e.target.value) sig[c.id] = e.target.value;
                            else delete sig[c.id];
                            return sig;
                          })
                        }
                        className="h-8 min-w-0 flex-1 rounded-lg border border-primary/10 bg-background px-2 outline-none focus:ring-2 focus:ring-primary/30"
                      >
                        <option value="">— No importar —</option>
                        {cabeceras.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
              </section>

              <section>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  Vista previa {revisadas.length > 8 ? `(primeras 8 de ${revisadas.length})` : ""}
                </p>
                <div className="overflow-x-auto rounded-2xl border border-primary/10">
                  <table className="w-full min-w-[560px] text-xs">
                    <thead className="bg-muted/50 text-left text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2">Fila</th>
                        <th className="px-3 py-2">Paciente</th>
                        <th className="px-3 py-2">Documento</th>
                        <th className="px-3 py-2">Obra social</th>
                        <th className="px-3 py-2">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {revisadas.slice(0, 8).map((r) => (
                        <tr key={r.n}>
                          <td className="px-3 py-2 tabular-nums text-muted-foreground">{r.n}</td>
                          <td className="px-3 py-2 font-semibold">
                            {`${r.datos.nombre} ${r.datos.apellido}`.trim() || "—"}
                          </td>
                          <td className="px-3 py-2 tabular-nums">{r.datos.documento || "—"}</td>
                          <td className="px-3 py-2">{r.datos.obraSocial}</td>
                          <td className="px-3 py-2">
                            {r.problema ? (
                              <span className="rounded-full bg-rose-100 px-2 py-0.5 font-semibold text-rose-700">{r.problema}</span>
                            ) : r.duplicado ? (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-700">Ya existe</span>
                            ) : (
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-700">Listo</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFilas([]);
                    setCabeceras([]);
                    setMapa({});
                  }}
                  className="btn-ce-outline !min-h-11 flex-1 justify-center"
                >
                  Elegir otro archivo
                </button>
                <button
                  type="button"
                  disabled={!validas.length}
                  onClick={importar}
                  className="btn-ce !min-h-11 flex-1 justify-center disabled:opacity-50"
                >
                  <CheckCircle2 className="size-4" /> Importar {validas.length} pacientes
                </button>
              </div>
            </>
          )}
          {error && (
            <p className="flex items-center gap-2 rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
              <AlertTriangle className="size-4" /> {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
