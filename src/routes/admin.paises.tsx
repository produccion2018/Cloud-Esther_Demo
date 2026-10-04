import { createFileRoute } from "@tanstack/react-router";
import { Building2, Download, Globe2, MonitorPlay, Pencil, Plus, Rocket } from "lucide-react";
import { useState } from "react";

import { Cargando, KpiCard, Seccion, Vacio } from "@/components/admin/bits";
import {
  Campo,
  DialogoFormulario,
  INPUT,
  Pestanas,
  Pildora,
  Tabla,
  descargarCSV,
} from "@/components/admin/formularios";
import { RestrictedView } from "@/components/admin/restricted";
import { canAccess, permisos, useRole } from "@/components/admin/role";
import { AdminShell } from "@/components/admin/shell";
import { Button } from "@/components/ui/button";
import { nuevoIdLocal } from "@/lib/admin/api";
import { useClinicas, useColeccion, useDemos, useGuardarEn } from "@/lib/admin/consultas";
import { NOMBRE_PLAN, fecha, miles } from "@/lib/admin/formato";
import type { Clinica, CuentaDemo, PlanId } from "@/lib/admin/tipos";
import type { EstadoPais, PaisOperacion } from "@/lib/admin/tipos-empresa";

/* Ubicación: src/routes/admin.paises.tsx
   Países donde se vende Cloud Esther: clínicas contratadas y demos por país, y los datos de cada
   país (moneda, facturación electrónica, impuesto, zona horaria).
   TODO backend: GET/PUT /admin/empresa/paises (ya usa la colección genérica). */

export const Route = createFileRoute("/admin/paises")({
  head: () => ({
    meta: [
      { title: "Países — Cloud Esther Administración" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PaisesPage,
});

type Vista = "contratos" | "configuracion";

const ESTADOS: EstadoPais[] = ["Activo", "Próximamente", "Pausado"];
const PLANES: PlanId[] = ["inicial", "profesional", "avanzada", "grupo"];

/** Bandera a partir del código ISO (AR → 🇦🇷). */
function bandera(codigo: string) {
  const c = codigo.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(c)) return "🌐";
  return String.fromCodePoint(...[...c].map((l) => 0x1f1e6 + l.charCodeAt(0) - 65));
}

const normal = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

type Resumen = {
  pais: PaisOperacion;
  clinicas: Clinica[];
  demos: CuentaDemo[];
  porPlan: Record<PlanId, number>;
  enMora: number;
  convertidas: number;
};

function resumir(pais: PaisOperacion, clinicas: Clinica[], demos: CuentaDemo[]): Resumen {
  const deEste = clinicas.filter((c) => normal(c.pais) === normal(pais.nombre));
  const demosPais = demos.filter((d) => normal(d.pais) === normal(pais.nombre));
  const porPlan = { inicial: 0, profesional: 0, avanzada: 0, grupo: 0 } as Record<PlanId, number>;
  deEste.forEach((c) => (porPlan[c.plan] += 1));
  return {
    pais,
    clinicas: deEste,
    demos: demosPais,
    porPlan,
    enMora: deEste.filter((c) => c.estadoPago === "mora" || c.estadoPago === "suspendida").length,
    convertidas: demosPais.filter((d) => d.estado === "Convertida").length,
  };
}

function tonoEstado(e: EstadoPais) {
  return e === "Activo" ? "ok" : e === "Próximamente" ? "primario" : "neutro";
}

function PaisesPage() {
  const { role } = useRole();
  const { data: paises, isLoading } = useColeccion("paises");
  const { data: clinicas } = useClinicas();
  const { data: demos } = useDemos();
  const [vista, setVista] = useState<Vista>("contratos");
  const [editar, setEditar] = useState<PaisOperacion | "nuevo" | null>(null);
  if (!canAccess(role, "/admin/paises")) return <RestrictedView />;
  const puedeEditar = permisos.editarPaises(role);

  const lista = paises ?? [];
  const resumenes = lista.map((p) => resumir(p, clinicas ?? [], demos ?? []));
  const activos = lista.filter((p) => p.estado === "Activo");
  const conClinicas = resumenes.filter((r) => r.clinicas.length > 0);
  const conocidos = new Set(lista.map((p) => normal(p.nombre)));
  // Clínicas o demos de países que todavía no están cargados en la lista.
  const sinPais = [
    ...new Set(
      [...(clinicas ?? []).map((c) => c.pais), ...(demos ?? []).map((d) => d.pais)].filter(
        (n) => n && !conocidos.has(normal(n)),
      ),
    ),
  ];
  const ordenados = [...resumenes].sort(
    (a, b) => b.clinicas.length - a.clinicas.length || b.demos.length - a.demos.length,
  );
  const totalClinicas = (clinicas ?? []).length;

  const exportar = () =>
    descargarCSV("paises-cloud-esther", [
      ["País", "Estado", "Clínicas", "Start", "Pro", "Plus", "Enterprise", "Demos", "Moneda"],
      ...ordenados.map((r) => [
        r.pais.nombre,
        r.pais.estado,
        r.clinicas.length,
        r.porPlan.inicial,
        r.porPlan.profesional,
        r.porPlan.avanzada,
        r.porPlan.grupo,
        r.demos.length,
        r.pais.moneda,
      ]),
    ]);

  return (
    <AdminShell
      title="Países"
      description="En qué países tenés clínicas contratadas y demos, y los datos de cada país: moneda, facturación electrónica e impuestos."
      actions={
        <>
          <Button variant="outline" onClick={exportar} disabled={!lista.length}>
            <Download className="h-4 w-4" /> Exportar
          </Button>
          {puedeEditar && (
            <Button onClick={() => setEditar("nuevo")}>
              <Plus className="h-4 w-4" /> Agregar país
            </Button>
          )}
        </>
      }
    >
      {isLoading ? (
        <Cargando />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
            <KpiCard
              accent
              label="Países activos"
              value={String(activos.length)}
              hint={`de ${lista.length} cargados`}
              icon={<Globe2 className="h-4 w-4" />}
            />
            <KpiCard
              label="Con clínicas"
              value={String(conClinicas.length)}
              hint={`${miles(totalClinicas)} clínicas en total`}
              icon={<Building2 className="h-4 w-4" />}
            />
            <KpiCard
              label="Demos por país"
              value={miles(resumenes.reduce((s, r) => s + r.demos.length, 0))}
              hint={ordenados.find((r) => r.demos.length)?.pais.nombre ?? "Sin demos"}
              icon={<MonitorPlay className="h-4 w-4" />}
            />
            <KpiCard
              label="Próximos países"
              value={String(lista.filter((p) => p.estado === "Próximamente").length)}
              hint={
                lista
                  .filter((p) => p.estado === "Próximamente")
                  .map((p) => p.nombre)
                  .join(", ") || "—"
              }
              icon={<Rocket className="h-4 w-4" />}
            />
          </div>

          <Pestanas
            valor={vista}
            onCambiar={setVista}
            opciones={[
              { id: "contratos", label: "Clínicas y demos", cantidad: conClinicas.length },
              { id: "configuracion", label: "Datos de cada país", cantidad: lista.length },
            ]}
          />

          {sinPais.length > 0 && (
            <p className="rounded-2xl border border-warning/40 bg-warning/10 px-4 py-3 text-xs">
              Hay clínicas o demos de países que no están en la lista: <b>{sinPais.join(", ")}</b>.
              {puedeEditar ? " Agregalos para ver sus datos." : ""}
            </p>
          )}

          {!lista.length ? (
            <Vacio titulo="Todavía no cargaste países" texto="Agregá el primero para empezar." />
          ) : vista === "contratos" ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {ordenados.map((r) => (
                <TarjetaPais
                  key={r.pais.id}
                  r={r}
                  total={totalClinicas}
                  {...(puedeEditar ? { onEditar: () => setEditar(r.pais) } : {})}
                />
              ))}
            </div>
          ) : (
            <Seccion
              titulo="Datos de cada país"
              descripcion="Moneda, facturación electrónica, impuesto y zona horaria con que se opera en cada país."
              sinPadding
            >
              <Tabla
                columnas={[
                  "País",
                  "Estado",
                  "Moneda",
                  "Facturación",
                  "Impuesto",
                  "Desde",
                  ...(puedeEditar ? [""] : []),
                ]}
                minimo={860}
              >
                {lista.map((p) => (
                  <tr key={p.id} className="border-t border-border/60 align-top">
                    <td className="py-3 pl-5 pr-3">
                      <p className="font-semibold">
                        <span className="mr-1.5">{bandera(p.codigo)}</span>
                        {p.nombre}
                      </p>
                      <p className="text-[11px] text-muted-foreground">{p.zonaHoraria}</p>
                    </td>
                    <td className="px-3 py-3">
                      <Pildora tono={tonoEstado(p.estado)}>{p.estado}</Pildora>
                    </td>
                    <td className="px-3 py-3 text-xs">{p.moneda}</td>
                    <td className="px-3 py-3 text-xs">{p.facturacion}</td>
                    <td className="px-3 py-3 text-xs">{p.impuesto}</td>
                    <td className="px-3 py-3 text-xs">{p.desde ? fecha(p.desde) : "—"}</td>
                    {puedeEditar && (
                      <td className="py-3 pl-3 pr-5 text-right">
                        <Button variant="ghost" size="sm" onClick={() => setEditar(p)}>
                          <Pencil className="h-3.5 w-3.5" /> Editar
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </Tabla>
            </Seccion>
          )}
          <p className="text-[11px] text-muted-foreground">
            Datos de ejemplo hasta conectar el servidor. Las clínicas y demos se agrupan por el país
            que figura en su ficha.
          </p>
        </>
      )}

      {editar !== null && (
        <FormularioPais
          inicial={editar === "nuevo" ? null : editar}
          onCerrar={() => setEditar(null)}
        />
      )}
    </AdminShell>
  );
}

function TarjetaPais({ r, total, onEditar }: { r: Resumen; total: number; onEditar?: () => void }) {
  const pct = total ? Math.round((r.clinicas.length / total) * 100) : 0;
  return (
    <section
      className="flex flex-col rounded-[24px] border border-border/80 bg-card p-5"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="flex items-start gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary/[0.08] text-2xl">
          {bandera(r.pais.codigo)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-bold">{r.pais.nombre}</h2>
            <Pildora tono={tonoEstado(r.pais.estado)}>{r.pais.estado}</Pildora>
          </div>
          <p className="truncate text-[11px] text-muted-foreground">
            {r.pais.moneda} · {r.pais.impuesto}
          </p>
        </div>
        {onEditar && (
          <button
            type="button"
            onClick={onEditar}
            aria-label={`Editar ${r.pais.nombre}`}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <Dato valor={r.clinicas.length} texto="Clínicas" />
        <Dato valor={r.demos.length} texto="Demos" />
        <Dato
          valor={r.enMora}
          texto="En mora"
          {...(r.enMora ? { tono: "text-destructive" } : {})}
        />
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Participación en clínicas</span>
          <span className="font-semibold tabular-nums text-foreground">{pct} %</span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {PLANES.map((p) => (
          <span
            key={p}
            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              r.porPlan[p] ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
            }`}
          >
            {NOMBRE_PLAN[p]} · {r.porPlan[p]}
          </span>
        ))}
      </div>

      {r.clinicas.length > 0 && (
        <ul className="mt-4 space-y-1 border-t border-border/60 pt-3 text-xs">
          {r.clinicas.slice(0, 4).map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-2">
              <span className="truncate font-medium">{c.nombre}</span>
              <span className="shrink-0 text-muted-foreground">{c.ciudad}</span>
            </li>
          ))}
          {r.clinicas.length > 4 && (
            <li className="text-muted-foreground">y {r.clinicas.length - 4} más</li>
          )}
        </ul>
      )}
      {r.demos.length > 0 && (
        <p className="mt-3 text-[11px] text-muted-foreground">
          {r.demos.length} {r.demos.length === 1 ? "demo" : "demos"} · {r.convertidas}{" "}
          {r.convertidas === 1 ? "convertida" : "convertidas"}
        </p>
      )}
    </section>
  );
}

function Dato({ valor, texto, tono }: { valor: number; texto: string; tono?: string }) {
  return (
    <div className="rounded-xl bg-primary/[0.04] px-2 py-2">
      <p className={`text-lg font-extrabold tabular-nums ${tono ?? "text-primary"}`}>
        {miles(valor)}
      </p>
      <p className="text-[10.5px] text-muted-foreground">{texto}</p>
    </div>
  );
}

const VACIO: Omit<PaisOperacion, "id"> = {
  codigo: "",
  nombre: "",
  estado: "Próximamente",
  moneda: "",
  facturacion: "",
  impuesto: "",
  zonaHoraria: "",
  desde: "",
  notas: "",
};

function FormularioPais({
  inicial,
  onCerrar,
}: {
  inicial: PaisOperacion | null;
  onCerrar: () => void;
}) {
  const [f, setF] = useState<Omit<PaisOperacion, "id">>(inicial ?? VACIO);
  const [error, setError] = useState<string | null>(null);
  const guardar = useGuardarEn("paises", inicial ? "País actualizado" : "País agregado");
  const campo = (k: keyof typeof f) => ({
    value: f[k],
    onChange: (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value })),
    className: INPUT,
  });

  return (
    <DialogoFormulario
      abierto
      titulo={inicial ? `Editar ${inicial.nombre}` : "Agregar país"}
      descripcion="Los datos fiscales se usan para facturar a las clínicas de ese país."
      onCerrar={onCerrar}
      guardando={guardar.isPending}
      error={error}
      onGuardar={() => {
        if (!f.nombre.trim()) return setError("Escribí el nombre del país.");
        if (!/^[A-Za-z]{2}$/.test(f.codigo.trim()))
          return setError("El código ISO tiene dos letras (por ejemplo AR, UY, CL).");
        const item: PaisOperacion = {
          ...f,
          codigo: f.codigo.trim().toUpperCase(),
          nombre: f.nombre.trim(),
          id: inicial?.id ?? nuevoIdLocal("pais"),
        };
        guardar.mutate(
          {
            item,
            accion: `${inicial ? "Editó" : "Agregó"} el país ${item.nombre} (${item.estado})`,
          },
          { onSuccess: onCerrar },
        );
      }}
    >
      <div className="grid gap-3 sm:grid-cols-[1fr_96px]">
        <Campo label="País">
          <input {...campo("nombre")} placeholder="Uruguay" autoFocus />
        </Campo>
        <Campo label="Código ISO">
          <input {...campo("codigo")} placeholder="UY" maxLength={2} />
        </Campo>
      </div>
      <Campo label="Estado">
        <select {...campo("estado")}>
          {ESTADOS.map((e) => (
            <option key={e}>{e}</option>
          ))}
        </select>
      </Campo>
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo label="Moneda">
          <input {...campo("moneda")} placeholder="UYU · Peso uruguayo" />
        </Campo>
        <Campo label="Impuesto">
          <input {...campo("impuesto")} placeholder="IVA 22 %" />
        </Campo>
      </div>
      <Campo label="Facturación electrónica">
        <input {...campo("facturacion")} placeholder="DGI · CFE" />
      </Campo>
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo label="Zona horaria">
          <input {...campo("zonaHoraria")} placeholder="America/Montevideo (UTC−3)" />
        </Campo>
        <Campo label="Vende desde">
          <input type="date" {...campo("desde")} />
        </Campo>
      </div>
      <Campo label="Notas">
        <textarea {...campo("notas")} rows={2} className={`${INPUT} h-auto py-2`} />
      </Campo>
    </DialogoFormulario>
  );
}
