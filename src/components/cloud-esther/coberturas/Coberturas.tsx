import { useMemo, useRef, useState } from "react";
import {
  Building2,
  CalendarDays,
  Check,
  FileSpreadsheet,
  Globe2,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  Wand2,
} from "lucide-react";

import {
  COBERTURAS_SUGERIDAS,
  nombreCobertura,
  nuevaCobertura,
  usePaisClinica,
} from "@/lib/cloud-esther/coberturas";
import { storeAgenda } from "@/lib/cloud-esther/agenda-store";
import { setFacturacion } from "@/lib/cloud-esther/facturacion-store";
import { usePacientes } from "@/lib/cloud-esther/pacientes";
import {
  setPresupuestos,
  storePresupuestos,
  type Cobertura,
  type PracticaNomenclador,
  type TipoCobertura,
} from "@/lib/cloud-esther/presupuestos-store";
import { useClinicaReal } from "@/lib/clinica/modo-clinica";
import { PAISES_SOPORTADOS, bandera } from "@/lib/paises";
import { normalizarBusqueda } from "@/lib/utils";

/* Ubicación: src/components/cloud-esther/coberturas/Coberturas.tsx
   COBERTURAS Y NOMENCLADOR (Facturación → Obras sociales y Administración), desde el plan Pro.
   1. Coberturas: el catálogo de la clínica. «Sumar las de mi país» carga de una vez las más
      conocidas (Argentina, Uruguay, Chile, México, Colombia, Perú, Ecuador, Paraguay, Bolivia y
      España); también se importan desde Excel/CSV o se cargan a mano. Sirve para cualquier país.
   2. Nomenclador: el código de cada práctica y cuánto reconoce cada cobertura (y el coseguro que
      paga el paciente). Se arma desde los aranceles de la clínica o importando la planilla de la
      entidad (los códigos oficiales cambian por país y por entidad: no se inventan).
   3. Planilla mensual: las prácticas atendidas a los afiliados de una cobertura en un mes, lista
      para presentar (Excel) o para crear la liquidación en Facturación.
   Solo el Administrador cambia el catálogo y el nomenclador (el servidor lo controla). */

type Vista = "coberturas" | "nomenclador" | "planilla";
const TIPOS: TipoCobertura[] = ["Obra social", "Prepaga", "Mutualista", "Seguro", "Pública", "Otra"];
const INPUT =
  "h-10 w-full rounded-xl border border-primary/15 bg-card px-3 text-sm outline-none transition focus:border-primary/45 focus:ring-4 focus:ring-primary/10";
const pesos = (n: number) => `$ ${Math.round(n).toLocaleString("es-AR")}`;
const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const palabras = (t: string) =>
  normalizarBusqueda(t)
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 3);

export function CoberturasNomenclador({ onToast }: { onToast: (m: string) => void }) {
  const real = useClinicaReal();
  const editable = !real || real.rol === "admin";
  const pais = usePaisClinica();
  const nombres = nombreCobertura(pais);
  const [vista, setVista] = useState<Vista>("coberturas");
  const { coberturas = [], nomenclador = [] } = storePresupuestos.usar();

  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-[26px] bg-[linear-gradient(118deg,#4c1d95,#7c3aed_45%,#c026d3)] p-5 text-white shadow-[0_26px_60px_-36px_rgba(91,33,182,0.95)]">
        <div aria-hidden className="pointer-events-none absolute -right-12 -top-16 size-56 rounded-full bg-fuchsia-300/30 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:16px_16px] [mask-image:linear-gradient(100deg,transparent_45%,black)]" />
        <div className="relative flex flex-wrap items-center gap-4">
          <span className="grid size-12 place-items-center rounded-2xl border border-white/30 bg-white/15">
            <ShieldCheck className="size-6" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.2em] text-white/70">
              {bandera(pais)} Coberturas y nomenclador
            </p>
            <h2 className="font-display text-xl font-bold tracking-tight">{nombres.plural}</h2>
            <p className="text-sm text-white/85">
              {coberturas.filter((c) => c.activa).length} activas · {nomenclador.length} prácticas en el nomenclador
            </p>
          </div>
          <div className="inline-flex gap-1 rounded-2xl bg-white/15 p-1 backdrop-blur" role="tablist">
            {(
              [
                ["coberturas", "Coberturas"],
                ["nomenclador", "Nomenclador"],
                ["planilla", "Planilla mensual"],
              ] as const
            ).map(([id, l]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={vista === id}
                onClick={() => setVista(id)}
                className={`min-h-9 rounded-xl px-3.5 text-[13px] font-semibold transition ${vista === id ? "bg-white text-primary shadow" : "text-white/85 hover:bg-white/10"}`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </section>
      {!editable && (
        <p className="rounded-2xl border border-amber-200 bg-amber-50/70 px-3 py-2 text-xs text-amber-800">
          Solo el Administrador cambia el catálogo y el nomenclador. Vos podés consultarlos y armar la planilla mensual.
        </p>
      )}
      {vista === "coberturas" && <ListaCoberturas editable={editable} pais={pais} onToast={onToast} />}
      {vista === "nomenclador" && <Nomenclador editable={editable} onToast={onToast} />}
      {vista === "planilla" && <PlanillaMensual onToast={onToast} />}
    </div>
  );
}

/* ───────────── Coberturas ───────────── */

function ListaCoberturas({ editable, pais, onToast }: { editable: boolean; pais: string; onToast: (m: string) => void }) {
  const { coberturas = [] } = storePresupuestos.usar();
  const { pacientes } = usePacientes();
  const [paisSug, setPaisSug] = useState(pais);
  const [q, setQ] = useState("");
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState<TipoCobertura>("Obra social");
  const archivo = useRef<HTMLInputElement>(null);
  const sugeridas = COBERTURAS_SUGERIDAS[paisSug] ?? [];
  const yaEsta = (n: string) => coberturas.some((c) => normalizarBusqueda(c.nombre) === normalizarBusqueda(n));
  const faltan = sugeridas.filter((s) => !yaEsta(s.nombre));
  const afiliados = (c: Cobertura) => pacientes.filter((p) => p.obraSocial === c.nombre).length;
  const lista = coberturas
    .filter((c) => !q || normalizarBusqueda(`${c.nombre} ${c.tipo} ${c.codigo}`).includes(normalizarBusqueda(q)))
    .sort((a, b) => Number(b.activa) - Number(a.activa) || a.nombre.localeCompare(b.nombre, "es"));
  const cambiar = (id: string, c: Partial<Cobertura>) =>
    setPresupuestos("coberturas", (prev) => (prev ?? []).map((x) => (x.id === id ? { ...x, ...c } : x)));
  const sumar = (nuevas: Cobertura[]) => setPresupuestos("coberturas", (prev) => [...(prev ?? []), ...nuevas]);

  const importar = async (f: File) => {
    try {
      const { leerPlanilla } = await import("@/components/cloud-esther/rrhh/excel");
      const filas = await leerPlanilla(f);
      const nuevas: Cobertura[] = [];
      for (const fila of filas) {
        const k = Object.keys(fila);
        const col = (re: RegExp) => k.find((x) => re.test(normalizarBusqueda(x)));
        const n = String(fila[col(/nombre|cobertura|obra|entidad|seguro|prepaga/) ?? k[0] ?? ""] ?? "").trim();
        if (!n || yaEsta(n) || nuevas.some((x) => x.nombre === n)) continue;
        const t = String(fila[col(/tipo/) ?? ""] ?? "");
        const c = nuevaCobertura(n, (TIPOS.find((x) => normalizarBusqueda(x) === normalizarBusqueda(t)) ?? "Obra social") as TipoCobertura, pais);
        c.codigo = String(fila[col(/codigo|cod|numero|prestador/) ?? ""] ?? "").slice(0, 30);
        nuevas.push(c);
      }
      if (!nuevas.length) return onToast("No encontré coberturas nuevas en el archivo");
      sumar(nuevas);
      onToast(`${nuevas.length} coberturas importadas`);
    } catch {
      onToast("No pude leer el archivo. Usá Excel (.xlsx) o CSV.");
    }
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary/70" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar cobertura o código" className={`${INPUT} pl-10`} />
          </label>
          {editable && (
            <>
              <button type="button" onClick={() => archivo.current?.click()} className="btn-ce-outline !min-h-10">
                <Upload className="size-4" /> Importar
              </button>
              <input
                ref={archivo}
                type="file"
                accept=".xlsx,.csv"
                className="hidden"
                aria-label="Archivo de coberturas"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) void importar(f);
                }}
              />
            </>
          )}
        </div>
        {lista.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-primary/25 bg-gradient-to-br from-primary/[0.04] to-fuchsia-500/[0.04] px-6 py-10 text-center">
            <span className="grid size-14 place-items-center rounded-full bg-gradient-to-br from-primary to-fuchsia-500 text-white shadow-lg">
              <ShieldCheck className="size-6" />
            </span>
            <p className="font-display text-base font-bold">Todavía no armaste tu catálogo</p>
            <p className="max-w-sm text-xs text-muted-foreground">
              Sumá las coberturas de tu país con un click (panel de la derecha), importalas desde Excel o cargalas a mano.
            </p>
          </div>
        ) : (
          <ul className="grid gap-2.5 md:grid-cols-2">
            {lista.map((c) => (
              <li key={c.id} className={`relative overflow-hidden rounded-2xl border bg-card p-3.5 shadow-[0_14px_30px_-26px_rgba(76,29,149,0.7)] transition ${c.activa ? "border-primary/12" : "border-border/60 opacity-60"}`}>
                <div className="flex items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary/15 to-fuchsia-500/10 text-sm font-bold text-primary">
                    {c.nombre.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{c.nombre}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {bandera(c.pais)} {c.tipo} · {afiliados(c)} pacientes{c.codigo ? ` · cód. ${c.codigo}` : ""}
                    </p>
                  </div>
                  {editable && (
                    <button type="button" aria-label="Quitar" onClick={() => setPresupuestos("coberturas", (p) => (p ?? []).filter((x) => x.id !== c.id))} className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-rose-50 hover:text-rose-600">
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
                {editable && (
                  <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px]">
                    <input value={c.codigo} onChange={(e) => cambiar(c.id, { codigo: e.target.value.slice(0, 30) })} placeholder="Código de prestador" className="h-8 w-36 rounded-lg border border-primary/12 bg-background px-2" />
                    <label className="inline-flex items-center gap-1.5 font-semibold">
                      <input type="checkbox" checked={c.requiereAutorizacion} onChange={(e) => cambiar(c.id, { requiereAutorizacion: e.target.checked })} className="accent-[#7c3aed]" />
                      Pide autorización
                    </label>
                    <label className="inline-flex items-center gap-1.5 font-semibold">
                      <input type="checkbox" checked={c.activa} onChange={(e) => cambiar(c.id, { activa: e.target.checked })} className="accent-[#7c3aed]" />
                      Activa
                    </label>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {editable && (
        <aside className="space-y-3">
          <section className="rounded-3xl border border-primary/12 bg-card p-4 shadow-[0_18px_40px_-32px_rgba(76,29,149,0.7)]">
            <p className="flex items-center gap-2 font-display text-sm font-bold">
              <Sparkles className="size-4 text-primary" /> Sumar las de un país
            </p>
            <select value={paisSug} onChange={(e) => setPaisSug(e.target.value)} className={`${INPUT} mt-3`}>
              {PAISES_SOPORTADOS.map((p) => (
                <option key={p.codigo} value={p.codigo}>
                  {bandera(p.codigo)} {p.nombre}
                  {COBERTURAS_SUGERIDAS[p.codigo] ? "" : " (cargá las tuyas)"}
                </option>
              ))}
            </select>
            {sugeridas.length ? (
              <>
                <ul className="mt-3 max-h-56 space-y-1 overflow-y-auto text-xs">
                  {sugeridas.map((s) => (
                    <li key={s.nombre} className="flex items-center justify-between gap-2 rounded-lg bg-muted/40 px-2.5 py-1.5">
                      <span className="truncate">{s.nombre}</span>
                      {yaEsta(s.nombre) ? <Check className="size-3.5 text-emerald-600" /> : <span className="text-[10px] text-muted-foreground">{s.tipo}</span>}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  disabled={!faltan.length}
                  onClick={() => {
                    sumar(faltan.map((s) => nuevaCobertura(s.nombre, s.tipo, paisSug)));
                    onToast(`${faltan.length} coberturas sumadas: revisalas y desactivá las que no uses`);
                  }}
                  className="btn-ce mt-3 !min-h-10 w-full justify-center disabled:opacity-50"
                >
                  <Plus className="size-4" /> {faltan.length ? `Sumar ${faltan.length}` : "Ya están todas"}
                </button>
                <p className="mt-2 text-[10.5px] text-muted-foreground">Lista para empezar rápido (solo nombres): revisala con las entidades con las que trabajás.</p>
              </>
            ) : (
              <p className="mt-3 flex items-start gap-2 rounded-xl bg-primary/[0.05] px-3 py-2 text-[11px] text-muted-foreground">
                <Globe2 className="mt-0.5 size-3.5 shrink-0 text-primary" /> Para este país cargá tus coberturas a mano o importalas desde Excel.
              </p>
            )}
          </section>
          <section className="rounded-3xl border border-primary/12 bg-card p-4 shadow-[0_18px_40px_-32px_rgba(76,29,149,0.7)]">
            <p className="flex items-center gap-2 font-display text-sm font-bold">
              <Building2 className="size-4 text-primary" /> Agregar a mano
            </p>
            <form
              className="mt-3 space-y-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!nombre.trim()) return;
                if (yaEsta(nombre)) return onToast("Esa cobertura ya está");
                sumar([nuevaCobertura(nombre, tipo, pais)]);
                setNombre("");
                onToast("Cobertura agregada");
              }}
            >
              <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre de la cobertura" className={INPUT} />
              <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoCobertura)} className={INPUT}>
                {TIPOS.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
              <button type="submit" disabled={!nombre.trim()} className="btn-ce !min-h-10 w-full justify-center disabled:opacity-50">
                <Plus className="size-4" /> Agregar
              </button>
            </form>
          </section>
        </aside>
      )}
    </div>
  );
}

/* ───────────── Nomenclador ───────────── */

function Nomenclador({ editable, onToast }: { editable: boolean; onToast: (m: string) => void }) {
  const { coberturas = [], nomenclador = [], aranceles } = storePresupuestos.usar();
  const activas = coberturas.filter((c) => c.activa);
  const [cobId, setCobId] = useState(activas[0]?.id ?? "");
  const [q, setQ] = useState("");
  const archivo = useRef<HTMLInputElement>(null);
  const cob = activas.find((c) => c.id === cobId) ?? activas[0];
  const lista = nomenclador.filter((p) => !q || normalizarBusqueda(`${p.codigo} ${p.descripcion}`).includes(normalizarBusqueda(q)));
  const precioArancel = (p: PracticaNomenclador) => aranceles.find((a) => a.id === p.arancelId)?.precio ?? 0;
  const setValor = (pid: string, campo: "cubre" | "coseguro" | "autorizacion", v: number | boolean) => {
    if (!cob) return;
    setPresupuestos("nomenclador", (prev) =>
      (prev ?? []).map((p) =>
        p.id === pid
          ? { ...p, valores: { ...p.valores, [cob.id]: { cubre: 0, coseguro: 0, autorizacion: false, ...p.valores[cob.id], [campo]: v } } }
          : p,
      ),
    );
  };
  const desdeAranceles = () => {
    const nuevas = aranceles
      .filter((a) => a.activo && !nomenclador.some((p) => p.arancelId === a.id))
      .map<PracticaNomenclador>((a) => ({ id: `nom-${a.id}`, codigo: a.codigo, descripcion: a.nombre, arancelId: a.id, valores: {} }));
    if (!nuevas.length) return onToast("Todos tus aranceles ya están en el nomenclador");
    setPresupuestos("nomenclador", (prev) => [...(prev ?? []), ...nuevas]);
    onToast(`${nuevas.length} prácticas sumadas desde tus aranceles`);
  };
  const importar = async (f: File) => {
    try {
      const { leerPlanilla } = await import("@/components/cloud-esther/rrhh/excel");
      const filas = await leerPlanilla(f);
      let n = 0;
      const actual = [...nomenclador];
      for (const fila of filas) {
        const k = Object.keys(fila);
        const col = (re: RegExp) => k.find((x) => re.test(normalizarBusqueda(x)));
        const codigo = String(fila[col(/codigo|cod/) ?? ""] ?? "").trim();
        const desc = String(fila[col(/descrip|practica|prestacion|nombre/) ?? ""] ?? "").trim();
        if (!codigo || !desc) continue;
        const cubre = Number(String(fila[col(/valor|cubre|importe|honorario/) ?? ""] ?? "").replace(/[^0-9.,]/g, "").replace(",", ".")) || 0;
        const coseguro = Number(String(fila[col(/coseguro|copago/) ?? ""] ?? "").replace(/[^0-9.,]/g, "").replace(",", ".")) || 0;
        const existente = actual.find((p) => p.codigo === codigo);
        const pa = palabras(desc);
        const arancel = aranceles.reduce<{ id: string; pts: number }>((m, a) => {
          const pts = palabras(a.nombre).filter((w) => pa.includes(w)).length;
          return pts > m.pts ? { id: a.id, pts } : m;
        }, { id: "", pts: 0 });
        const valores = cob && (cubre || coseguro) ? { [cob.id]: { cubre, coseguro, autorizacion: false } } : {};
        if (existente) Object.assign(existente, { descripcion: desc, valores: { ...existente.valores, ...valores } });
        else actual.push({ id: `nom-${Date.now().toString(36)}-${n}`, codigo, descripcion: desc, arancelId: arancel.id, valores });
        n++;
      }
      if (!n) return onToast("No encontré filas con código y descripción");
      setPresupuestos("nomenclador", () => actual);
      onToast(`${n} prácticas importadas${cob ? ` (valores de ${cob.nombre})` : ""}`);
    } catch {
      onToast("No pude leer el archivo. Usá Excel (.xlsx) o CSV.");
    }
  };
  const exportar = async () => {
    const { descargarExcel } = await import("@/components/cloud-esther/rrhh/excel");
    await descargarExcel(`nomenclador-${cob?.nombre ?? "clinica"}.xlsx`, [
      {
        nombre: "Nomenclador",
        nota: cob ? `Valores reconocidos por ${cob.nombre}` : "Nomenclador de la clínica",
        columnas: [
          { titulo: "Código", clave: "codigo", ancho: 12 },
          { titulo: "Práctica", clave: "descripcion", ancho: 40 },
          { titulo: "Arancel particular", clave: "particular", ancho: 16, moneda: true },
          { titulo: "Cubre la cobertura", clave: "cubre", ancho: 18, moneda: true },
          { titulo: "Coseguro del paciente", clave: "coseguro", ancho: 20, moneda: true },
          { titulo: "Pide autorización", clave: "aut", ancho: 16 },
        ],
        filas: nomenclador.map((p) => ({
          codigo: p.codigo,
          descripcion: p.descripcion,
          particular: precioArancel(p),
          cubre: cob ? (p.valores[cob.id]?.cubre ?? 0) : 0,
          coseguro: cob ? (p.valores[cob.id]?.coseguro ?? 0) : 0,
          aut: cob && p.valores[cob.id]?.autorizacion ? "Sí" : "No",
        })),
      },
    ]);
    onToast("Nomenclador exportado a Excel");
  };

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex items-center gap-2 rounded-2xl border border-primary/12 bg-card py-1 pl-3 pr-1 text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
          Valores de
          <select value={cob?.id ?? ""} onChange={(e) => setCobId(e.target.value)} className="h-9 rounded-xl bg-primary/[0.06] px-2 text-sm font-semibold normal-case tracking-normal text-foreground outline-none">
            {activas.length === 0 && <option value="">Sin coberturas</option>}
            {activas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="relative min-w-[180px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary/70" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar código o práctica" className={`${INPUT} pl-10`} />
        </label>
        {editable && (
          <>
            <button type="button" onClick={desdeAranceles} className="btn-ce-outline !min-h-10">
              <Wand2 className="size-4" /> Desde mis aranceles
            </button>
            <button type="button" onClick={() => archivo.current?.click()} className="btn-ce-outline !min-h-10">
              <Upload className="size-4" /> Importar
            </button>
            <input
              ref={archivo}
              type="file"
              accept=".xlsx,.csv"
              className="hidden"
              aria-label="Archivo del nomenclador"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void importar(f);
              }}
            />
          </>
        )}
        <button type="button" onClick={() => void exportar()} disabled={!nomenclador.length} className="btn-ce !min-h-10 disabled:opacity-50">
          <FileSpreadsheet className="size-4" /> Excel
        </button>
      </div>
      {nomenclador.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-primary/25 bg-gradient-to-br from-primary/[0.04] to-fuchsia-500/[0.04] px-6 py-10 text-center">
          <span className="grid size-14 place-items-center rounded-full bg-gradient-to-br from-primary to-fuchsia-500 text-white shadow-lg">
            <FileSpreadsheet className="size-6" />
          </span>
          <p className="font-display text-base font-bold">El nomenclador está vacío</p>
          <p className="max-w-md text-xs text-muted-foreground">
            Armalo en un click desde tus aranceles (usa sus códigos) o importá la planilla que te da cada entidad con «Código», «Práctica», «Valor» y «Coseguro».
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-primary/12 bg-card shadow-[0_18px_40px_-34px_rgba(76,29,149,0.7)]">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-muted/40 text-left text-[10.5px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Código</th>
                <th className="px-3 py-3">Práctica</th>
                <th className="px-3 py-3 text-right">Particular</th>
                <th className="px-3 py-3 text-right">Cubre {cob ? cob.nombre : ""}</th>
                <th className="px-3 py-3 text-right">Coseguro</th>
                <th className="px-3 py-3 text-center">Autorización</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {lista.map((p) => {
                const v = cob ? p.valores[cob.id] : undefined;
                const num = (campo: "cubre" | "coseguro") =>
                  editable && cob ? (
                    <input
                      inputMode="numeric"
                      value={v?.[campo] ? String(v[campo]) : ""}
                      placeholder="0"
                      onChange={(e) => setValor(p.id, campo, Number(e.target.value.replace(/\D/g, "")) || 0)}
                      className="h-8 w-28 rounded-lg border border-primary/12 bg-background px-2 text-right tabular-nums"
                    />
                  ) : (
                    <span className="tabular-nums">{pesos(v?.[campo] ?? 0)}</span>
                  );
                return (
                  <tr key={p.id} className="transition hover:bg-primary/[0.03]">
                    <td className="px-4 py-2.5 font-bold tabular-nums text-primary">{p.codigo}</td>
                    <td className="px-3 py-2.5">{p.descripcion}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">{pesos(precioArancel(p))}</td>
                    <td className="px-3 py-2.5 text-right">{num("cubre")}</td>
                    <td className="px-3 py-2.5 text-right">{num("coseguro")}</td>
                    <td className="px-3 py-2.5 text-center">
                      <input type="checkbox" disabled={!editable || !cob} checked={!!v?.autorizacion} onChange={(e) => setValor(p.id, "autorizacion", e.target.checked)} className="accent-[#7c3aed]" aria-label={`Autorización ${p.codigo}`} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/* ───────────── Planilla mensual por cobertura ───────────── */

function PlanillaMensual({ onToast }: { onToast: (m: string) => void }) {
  const { coberturas = [], nomenclador = [], aranceles } = storePresupuestos.usar();
  const { turnos } = storeAgenda.usar();
  const { pacientes } = usePacientes();
  const activas = coberturas.filter((c) => c.activa);
  const [cobId, setCobId] = useState(activas[0]?.id ?? "");
  const [mes, setMes] = useState(hoyISO().slice(0, 7));
  const cob = activas.find((c) => c.id === cobId) ?? activas[0];

  const filas = useMemo(() => {
    if (!cob) return [];
    const afiliados = pacientes.filter((p) => p.obraSocial === cob.nombre);
    return turnos
      .filter((t) => t.estado === "Atendida" && t.fecha.startsWith(mes) && afiliados.some((p) => `${p.nombre} ${p.apellido}` === t.paciente))
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
      .map((t) => {
        const pac = afiliados.find((p) => `${p.nombre} ${p.apellido}` === t.paciente)!;
        const pt = palabras(t.tratamiento);
        let mejor: PracticaNomenclador | undefined;
        let pts = 0;
        for (const p of nomenclador) {
          const ar = aranceles.find((a) => a.id === p.arancelId);
          const n = palabras(`${p.descripcion} ${ar?.nombre ?? ""}`).filter((w) => pt.includes(w)).length;
          if (n > pts) {
            pts = n;
            mejor = p;
          }
        }
        const v = mejor?.valores[cob.id];
        return { t, pac, practica: mejor, importe: v?.cubre ?? 0, coseguro: v?.coseguro ?? 0 };
      });
  }, [cob, mes, turnos, pacientes, nomenclador, aranceles]);
  const total = filas.reduce((a, f) => a + f.importe, 0);
  const sinCodigo = filas.filter((f) => !f.practica).length;

  const excel = async () => {
    if (!cob) return;
    const { descargarExcel } = await import("@/components/cloud-esther/rrhh/excel");
    await descargarExcel(`planilla-${cob.nombre}-${mes}.xlsx`, [
      {
        nombre: "Planilla mensual",
        nota: `${cob.nombre}${cob.codigo ? ` · prestador ${cob.codigo}` : ""} · período ${mes}`,
        columnas: [
          { titulo: "Fecha", clave: "fecha", ancho: 12 },
          { titulo: "Afiliado", clave: "afiliado", ancho: 26 },
          { titulo: "N.º de afiliado", clave: "nro", ancho: 16 },
          { titulo: "Documento", clave: "doc", ancho: 14 },
          { titulo: "Código", clave: "codigo", ancho: 10 },
          { titulo: "Práctica", clave: "practica", ancho: 34 },
          { titulo: "Profesional", clave: "prof", ancho: 22 },
          { titulo: "Importe", clave: "importe", ancho: 14, moneda: true },
        ],
        filas: filas.map((f) => ({
          fecha: f.t.fecha.split("-").reverse().join("/"),
          afiliado: `${f.pac.apellido}, ${f.pac.nombre}`,
          nro: f.pac.afiliado,
          doc: f.pac.documento,
          codigo: f.practica?.codigo ?? "—",
          practica: f.practica?.descripcion ?? f.t.tratamiento,
          prof: f.t.odontologo,
          importe: f.importe,
        })),
        totales: { practica: "Total", importe: total },
      },
    ]);
    onToast("Planilla descargada");
  };
  const liquidacion = () => {
    if (!cob || !filas.length) return;
    setFacturacion("liquidaciones", (prev) => [
      ...prev,
      {
        id: `l-${Date.now()}`,
        obraSocial: cob.nombre,
        periodo: mes,
        estado: "Borrador",
        presentada: "",
        cobrada: "",
        prestaciones: filas.map((f) => ({
          pacienteId: f.pac.id,
          paciente: `${f.pac.nombre} ${f.pac.apellido}`,
          fecha: f.t.fecha,
          codigo: f.practica?.codigo ?? "",
          descripcion: f.practica?.descripcion ?? f.t.tratamiento,
          importe: f.importe,
          debitado: false,
          motivoDebito: "",
        })),
      },
    ]);
    onToast(`Liquidación de ${cob.nombre} ${mes} creada en Facturación → Obras sociales`);
  };

  if (!activas.length)
    return (
      <p className="rounded-2xl border border-dashed border-primary/25 px-4 py-8 text-center text-sm text-muted-foreground">
        Primero armá el catálogo de coberturas en la pestaña «Coberturas».
      </p>
    );

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <select value={cob?.id ?? ""} onChange={(e) => setCobId(e.target.value)} className={`${INPUT} !w-auto min-w-[200px]`}>
          {activas.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
        <label className="inline-flex items-center gap-2 rounded-xl border border-primary/12 bg-card px-2.5">
          <CalendarDays className="size-4 text-primary" />
          <input type="month" value={mes} onChange={(e) => e.target.value && setMes(e.target.value)} className="h-10 bg-transparent text-sm font-semibold outline-none" />
        </label>
        <div className="ml-auto flex flex-wrap gap-2">
          <button type="button" onClick={() => void excel()} disabled={!filas.length} className="btn-ce-outline !min-h-10 disabled:opacity-50">
            <FileSpreadsheet className="size-4" /> Planilla Excel
          </button>
          <button type="button" onClick={liquidacion} disabled={!filas.length} className="btn-ce !min-h-10 disabled:opacity-50">
            <Plus className="size-4" /> Crear liquidación
          </button>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        {[
          ["Prácticas", String(filas.length)],
          ["A presentar", pesos(total)],
          ["Sin código", String(sinCodigo)],
        ].map(([k, v], i) => (
          <div key={k} className={`rounded-2xl p-3 ${i === 1 ? "bg-gradient-to-br from-primary to-fuchsia-500 text-white" : "border border-primary/10 bg-card"}`}>
            <p className={`text-[10px] font-bold uppercase tracking-[0.1em] ${i === 1 ? "text-white/75" : "text-muted-foreground"}`}>{k}</p>
            <p className="font-display text-xl font-bold tabular-nums">{v}</p>
          </div>
        ))}
      </div>
      {filas.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-primary/25 px-4 py-8 text-center text-sm text-muted-foreground">
          No hay turnos «Atendida» de afiliados de {cob?.nombre} en {mes}.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-primary/12 bg-card">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-muted/40 text-left text-[10.5px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-3 py-3">Afiliado</th>
                <th className="px-3 py-3">Código</th>
                <th className="px-3 py-3">Práctica</th>
                <th className="px-3 py-3 text-right">Importe</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filas.map((f) => (
                <tr key={f.t.id}>
                  <td className="px-4 py-2.5 tabular-nums">{f.t.fecha.split("-").reverse().join("/")}</td>
                  <td className="px-3 py-2.5 font-semibold">
                    {f.pac.apellido}, {f.pac.nombre}
                    <span className="block text-[11px] font-normal text-muted-foreground">Afiliado {f.pac.afiliado || "—"}</span>
                  </td>
                  <td className="px-3 py-2.5 font-bold text-primary">{f.practica?.codigo ?? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10.5px] text-amber-700">Sin código</span>}</td>
                  <td className="px-3 py-2.5">{f.practica?.descripcion ?? f.t.tratamiento}</td>
                  <td className="px-3 py-2.5 text-right font-bold tabular-nums">{pesos(f.importe)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
