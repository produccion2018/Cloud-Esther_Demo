import { createFileRoute } from "@tanstack/react-router";
import { Download, FileSignature, Pencil, Plus, Receipt, Trash2, Truck } from "lucide-react";
import { useState } from "react";

import { Cargando, KpiCard, Seccion, Vacio } from "@/components/admin/bits";
import {
  Campo,
  DialogoFormulario,
  INPUT,
  Pestanas,
  Pildora,
  Tabla,
  confirmar,
  descargarCSV,
} from "@/components/admin/formularios";
import { RestrictedView } from "@/components/admin/restricted";
import { canAccess, useRole } from "@/components/admin/role";
import { AdminShell } from "@/components/admin/shell";
import { Button } from "@/components/ui/button";
import { nuevoIdLocal } from "@/lib/admin/api";
import { useBorrarDe, useColeccion, useGuardarEn } from "@/lib/admin/consultas";
import {
  diasHasta,
  fecha,
  hoyISO,
  importe,
  miles,
  periodoActual,
  periodoTexto,
} from "@/lib/admin/formato";
import type { Contrato, Gasto, Proveedor } from "@/lib/admin/tipos-empresa";

export const Route = createFileRoute("/admin/gastos")({
  head: () => ({
    meta: [
      { title: "Gastos y proveedores — Cloud Esther Administración" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: GastosPage,
});

const CATEGORIAS: Gasto["categoria"][] = [
  "Infraestructura y servidores",
  "Software y licencias",
  "Marketing",
  "Oficina",
  "Servicios profesionales",
  "Impuestos",
  "Otro",
];

type Vista = "gastos" | "proveedores" | "contratos";

function GastosPage() {
  const { role } = useRole();
  const [vista, setVista] = useState<Vista>("gastos");
  const { data: proveedores } = useColeccion("proveedores");
  const { data: contratos } = useColeccion("contratos");
  if (!canAccess(role, "/admin/gastos")) return <RestrictedView />;
  return (
    <AdminShell
      title="Gastos y proveedores"
      description="Lo que gasta la empresa para funcionar (servidores, licencias, marketing, honorarios), a quién se le paga y los contratos vigentes."
    >
      <Pestanas
        valor={vista}
        onCambiar={setVista}
        opciones={[
          { id: "gastos", label: "Gastos" },
          { id: "proveedores", label: "Proveedores", cantidad: (proveedores ?? []).length },
          {
            id: "contratos",
            label: "Contratos",
            cantidad: (contratos ?? []).filter((c) => c.estado !== "Finalizado").length,
          },
        ]}
      />
      {vista === "gastos" ? <Gastos /> : vista === "proveedores" ? <Proveedores /> : <Contratos />}
    </AdminShell>
  );
}

/* ───────────── Gastos ───────────── */

function Gastos() {
  const { data, isLoading } = useColeccion("gastos");
  const { data: proveedores } = useColeccion("proveedores");
  const borrar = useBorrarDe("gastos", "Gasto eliminado");
  const guardar = useGuardarEn("gastos", "Gasto marcado como pagado");
  const [editando, setEditando] = useState<Gasto | null>(null);
  const [periodo, setPeriodo] = useState(periodoActual());
  const [categoria, setCategoria] = useState("");
  if (isLoading) return <Cargando />;
  const prov = (id: string | null) =>
    id ? ((proveedores ?? []).find((p) => p.id === id)?.nombre ?? "—") : "—";
  const lista = (data ?? [])
    .filter(
      (g) => (!periodo || g.fecha.startsWith(periodo)) && (!categoria || g.categoria === categoria),
    )
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
  const total = (m: "ARS" | "USD", estado?: Gasto["estado"]) =>
    lista
      .filter((g) => g.moneda === m && (!estado || g.estado === estado))
      .reduce((s, g) => s + g.importe, 0);
  const porCategoria = CATEGORIAS.map((c) => ({
    c,
    ars: lista
      .filter((g) => g.categoria === c && g.moneda === "ARS")
      .reduce((s, g) => s + g.importe, 0),
    usd: lista
      .filter((g) => g.categoria === c && g.moneda === "USD")
      .reduce((s, g) => s + g.importe, 0),
  })).filter((x) => x.ars || x.usd);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
        <KpiCard
          accent
          label="Total en pesos"
          value={importe(total("ARS"))}
          hint={periodo ? periodoTexto(periodo) : "Todos los meses"}
          icon={<Receipt className="h-4 w-4" />}
        />
        <KpiCard
          label="Total en dólares"
          value={importe(total("USD"), "USD")}
          hint={periodo ? periodoTexto(periodo) : "Todos los meses"}
        />
        <KpiCard
          label="Pendiente (ARS)"
          value={importe(total("ARS", "Pendiente"))}
          hint="Sin pagar"
          tono="warning"
        />
        <KpiCard
          label="Pendiente (USD)"
          value={importe(total("USD", "Pendiente"), "USD")}
          hint="Sin pagar"
          tono="warning"
        />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <Seccion
          titulo="Gastos de la empresa"
          descripcion="Cargá cada gasto con su comprobante. Pesos y dólares se suman por separado."
          sinPadding
          acciones={
            <>
              <input
                type="month"
                className="h-9 rounded-xl border border-input bg-card px-3 text-xs font-semibold"
                value={periodo}
                onChange={(e) => setPeriodo(e.target.value)}
                aria-label="Mes"
              />
              <select
                className="h-9 rounded-xl border border-input bg-card px-3 text-xs font-semibold"
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                aria-label="Categoría"
              >
                <option value="">Todas las categorías</option>
                {CATEGORIAS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <Button
                size="sm"
                variant="outline"
                disabled={!lista.length}
                onClick={() =>
                  descargarCSV(`gastos-${periodo || "todos"}`, [
                    [
                      "Fecha",
                      "Categoría",
                      "Descripción",
                      "Proveedor",
                      "Moneda",
                      "Importe",
                      "Comprobante",
                      "Estado",
                    ],
                    ...lista.map((g) => [
                      g.fecha,
                      g.categoria,
                      g.descripcion,
                      prov(g.proveedorId),
                      g.moneda,
                      g.importe,
                      g.comprobante,
                      g.estado,
                    ]),
                  ])
                }
              >
                <Download className="mr-1 h-4 w-4" /> CSV
              </Button>
              <Button
                size="sm"
                onClick={() =>
                  setEditando({
                    id: nuevoIdLocal("g"),
                    fecha: hoyISO(),
                    categoria: "Infraestructura y servidores",
                    descripcion: "",
                    proveedorId: null,
                    importe: 0,
                    moneda: "ARS",
                    comprobante: "",
                    estado: "Pendiente",
                  })
                }
              >
                <Plus className="mr-1 h-4 w-4" /> Cargar gasto
              </Button>
            </>
          }
        >
          {lista.length === 0 ? (
            <div className="p-5">
              <Vacio titulo="No hay gastos en este filtro" />
            </div>
          ) : (
            <Tabla columnas={["Fecha", "Gasto", "Proveedor", "Importe", "Estado", ""]}>
              {lista.map((g) => (
                <tr key={g.id} className="border-t border-border/60">
                  <td className="py-3 pl-5 pr-3 text-xs">{fecha(g.fecha)}</td>
                  <td className="px-3 py-3">
                    <p className="font-semibold">{g.descripcion}</p>
                    <p className="text-xs text-muted-foreground">
                      {g.categoria}
                      {g.comprobante && ` · ${g.comprobante}`}
                    </p>
                  </td>
                  <td className="px-3 py-3 text-xs">{prov(g.proveedorId)}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-sm font-bold tabular-nums">
                    {importe(g.importe, g.moneda)}
                  </td>
                  <td className="px-3 py-3">
                    <Pildora tono={g.estado === "Pagado" ? "ok" : "alerta"}>{g.estado}</Pildora>
                  </td>
                  <td className="py-3 pl-3 pr-5 text-right whitespace-nowrap">
                    {g.estado === "Pendiente" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mr-1 h-8"
                        onClick={() =>
                          guardar.mutate({
                            item: { ...g, estado: "Pagado" },
                            accion: `Pagó el gasto «${g.descripcion}»`,
                          })
                        }
                      >
                        Marcar pagado
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Editar"
                      onClick={() => setEditando(g)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Eliminar"
                      onClick={() =>
                        confirmar(`¿Eliminar «${g.descripcion}»?`) &&
                        borrar.mutate({ id: g.id, accion: `Eliminó el gasto «${g.descripcion}»` })
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </Tabla>
          )}
        </Seccion>
        <Seccion titulo="Por categoría" descripcion="Del filtro actual.">
          {porCategoria.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin datos.</p>
          ) : (
            <ul className="space-y-2.5">
              {porCategoria.map((x) => (
                <li key={x.c} className="flex items-start justify-between gap-3 text-sm">
                  <span>{x.c}</span>
                  <span className="text-right text-xs font-semibold tabular-nums">
                    {x.ars > 0 && <span className="block">{importe(x.ars)}</span>}
                    {x.usd > 0 && <span className="block">{importe(x.usd, "USD")}</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Seccion>
      </div>
      {editando && (
        <FormGasto
          key={editando.id}
          inicial={editando}
          proveedores={proveedores ?? []}
          onCerrar={() => setEditando(null)}
        />
      )}
    </>
  );
}

function FormGasto({
  inicial,
  proveedores,
  onCerrar,
}: {
  inicial: Gasto;
  proveedores: Proveedor[];
  onCerrar: () => void;
}) {
  const [g, setG] = useState(inicial);
  const [error, setError] = useState<string | null>(null);
  const guardar = useGuardarEn("gastos", "Gasto guardado");
  const set = <K extends keyof Gasto>(k: K, v: Gasto[K]) => setG((x) => ({ ...x, [k]: v }));
  return (
    <DialogoFormulario
      abierto
      titulo="Gasto de la empresa"
      onCerrar={onCerrar}
      guardando={guardar.isPending}
      error={error}
      onGuardar={() => {
        if (!g.descripcion.trim()) return setError("Escribí una descripción.");
        if (g.importe <= 0) return setError("El importe tiene que ser mayor a cero.");
        guardar.mutate(
          { item: g, accion: `Cargó el gasto «${g.descripcion}»` },
          { onSuccess: onCerrar },
        );
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo label="Descripción" className="sm:col-span-2">
          <input
            className={INPUT}
            value={g.descripcion}
            onChange={(e) => set("descripcion", e.target.value)}
          />
        </Campo>
        <Campo label="Categoría">
          <select
            className={INPUT}
            value={g.categoria}
            onChange={(e) => set("categoria", e.target.value as Gasto["categoria"])}
          >
            {CATEGORIAS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Campo>
        <Campo label="Proveedor">
          <select
            className={INPUT}
            value={g.proveedorId ?? ""}
            onChange={(e) => set("proveedorId", e.target.value || null)}
          >
            <option value="">Sin proveedor</option>
            {proveedores.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </Campo>
        <Campo label="Importe">
          <input
            className={INPUT}
            type="number"
            min={0}
            value={g.importe}
            onChange={(e) => set("importe", Number(e.target.value))}
          />
        </Campo>
        <Campo label="Moneda">
          <select
            className={INPUT}
            value={g.moneda}
            onChange={(e) => set("moneda", e.target.value as Gasto["moneda"])}
          >
            <option>ARS</option>
            <option>USD</option>
          </select>
        </Campo>
        <Campo label="Fecha">
          <input
            className={INPUT}
            type="date"
            value={g.fecha}
            onChange={(e) => set("fecha", e.target.value)}
          />
        </Campo>
        <Campo label="Estado">
          <select
            className={INPUT}
            value={g.estado}
            onChange={(e) => set("estado", e.target.value as Gasto["estado"])}
          >
            <option>Pendiente</option>
            <option>Pagado</option>
          </select>
        </Campo>
        <Campo label="Comprobante" className="sm:col-span-2" ayuda="N.º de factura o recibo.">
          <input
            className={INPUT}
            value={g.comprobante}
            onChange={(e) => set("comprobante", e.target.value)}
          />
        </Campo>
      </div>
    </DialogoFormulario>
  );
}

/* ───────────── Proveedores ───────────── */

function Proveedores() {
  const { data, isLoading } = useColeccion("proveedores");
  const { data: gastos } = useColeccion("gastos");
  const borrar = useBorrarDe("proveedores", "Proveedor eliminado");
  const [editando, setEditando] = useState<Proveedor | null>(null);
  if (isLoading) return <Cargando />;
  const lista = data ?? [];
  return (
    <>
      <Seccion
        titulo="Proveedores"
        descripcion="Empresas y profesionales a los que Cloud Esther les paga."
        sinPadding
        acciones={
          <Button
            size="sm"
            onClick={() =>
              setEditando({
                id: nuevoIdLocal("prov"),
                nombre: "",
                rubro: "",
                contacto: "",
                email: "",
                telefono: "",
              })
            }
          >
            <Plus className="mr-1 h-4 w-4" /> Agregar proveedor
          </Button>
        }
      >
        {lista.length === 0 ? (
          <div className="p-5">
            <Vacio titulo="Sin proveedores" />
          </div>
        ) : (
          <Tabla columnas={["Proveedor", "Rubro", "Contacto", "Gastos cargados", ""]}>
            {lista.map((p) => {
              const usados = (gastos ?? []).filter((g) => g.proveedorId === p.id).length;
              return (
                <tr key={p.id} className="border-t border-border/60">
                  <td className="py-3 pl-5 pr-3 font-semibold">
                    <span className="inline-flex items-center gap-2">
                      <Truck className="h-4 w-4 text-primary" />
                      {p.nombre}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-xs">{p.rubro || "—"}</td>
                  <td className="px-3 py-3 text-xs">
                    {p.contacto || "—"}
                    <span className="block text-muted-foreground">
                      {[p.email, p.telefono].filter(Boolean).join(" · ")}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-xs">{usados}</td>
                  <td className="py-3 pl-3 pr-5 text-right whitespace-nowrap">
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Editar"
                      onClick={() => setEditando(p)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Eliminar"
                      disabled={usados > 0}
                      title={usados > 0 ? "Tiene gastos cargados" : undefined}
                      onClick={() =>
                        confirmar(`¿Eliminar a ${p.nombre}?`) && borrar.mutate({ id: p.id })
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </Tabla>
        )}
      </Seccion>
      {editando && (
        <FormProveedor key={editando.id} inicial={editando} onCerrar={() => setEditando(null)} />
      )}
    </>
  );
}

function FormProveedor({ inicial, onCerrar }: { inicial: Proveedor; onCerrar: () => void }) {
  const [p, setP] = useState(inicial);
  const [error, setError] = useState<string | null>(null);
  const guardar = useGuardarEn("proveedores", "Proveedor guardado");
  const set = <K extends keyof Proveedor>(k: K, v: Proveedor[K]) => setP((x) => ({ ...x, [k]: v }));
  return (
    <DialogoFormulario
      abierto
      titulo="Proveedor"
      onCerrar={onCerrar}
      guardando={guardar.isPending}
      error={error}
      onGuardar={() => {
        if (!p.nombre.trim()) return setError("Escribí el nombre.");
        guardar.mutate({ item: p }, { onSuccess: onCerrar });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo label="Nombre o razón social">
          <input
            className={INPUT}
            value={p.nombre}
            onChange={(e) => set("nombre", e.target.value)}
          />
        </Campo>
        <Campo label="Rubro">
          <input className={INPUT} value={p.rubro} onChange={(e) => set("rubro", e.target.value)} />
        </Campo>
        <Campo label="Persona de contacto">
          <input
            className={INPUT}
            value={p.contacto}
            onChange={(e) => set("contacto", e.target.value)}
          />
        </Campo>
        <Campo label="Email">
          <input
            className={INPUT}
            type="email"
            value={p.email}
            onChange={(e) => set("email", e.target.value)}
          />
        </Campo>
        <Campo label="Teléfono">
          <input
            className={INPUT}
            value={p.telefono}
            onChange={(e) => set("telefono", e.target.value)}
          />
        </Campo>
      </div>
    </DialogoFormulario>
  );
}

/* ───────────── Contratos ───────────── */

function Contratos() {
  const { data, isLoading } = useColeccion("contratos");
  const borrar = useBorrarDe("contratos", "Contrato eliminado");
  const [editando, setEditando] = useState<Contrato | null>(null);
  if (isLoading) return <Cargando />;
  const lista = [...(data ?? [])].sort((a, b) => (a.fin ?? "9999").localeCompare(b.fin ?? "9999"));
  return (
    <>
      <Seccion
        titulo="Contratos"
        descripcion="Contratos con proveedores, clientes y equipo. Se ordenan por fecha de fin para ver primero los que vencen."
        sinPadding
        acciones={
          <Button
            size="sm"
            onClick={() =>
              setEditando({
                id: nuevoIdLocal("ct"),
                titulo: "",
                contraparte: "",
                tipo: "Proveedor",
                inicio: hoyISO(),
                fin: null,
                importe: null,
                estado: "Vigente",
              })
            }
          >
            <Plus className="mr-1 h-4 w-4" /> Agregar contrato
          </Button>
        }
      >
        {lista.length === 0 ? (
          <div className="p-5">
            <Vacio titulo="Sin contratos" />
          </div>
        ) : (
          <Tabla columnas={["Contrato", "Tipo", "Inicio", "Fin", "Importe", "Estado", ""]}>
            {lista.map((c) => {
              const dias = c.fin ? diasHasta(c.fin) : null;
              return (
                <tr key={c.id} className="border-t border-border/60">
                  <td className="py-3 pl-5 pr-3">
                    <p className="inline-flex items-center gap-2 font-semibold">
                      <FileSignature className="h-4 w-4 text-primary" />
                      {c.titulo}
                    </p>
                    <p className="text-xs text-muted-foreground">{c.contraparte}</p>
                  </td>
                  <td className="px-3 py-3 text-xs">{c.tipo}</td>
                  <td className="px-3 py-3 text-xs">{fecha(c.inicio)}</td>
                  <td className="px-3 py-3 text-xs">
                    {c.fin ? fecha(c.fin) : "Sin fecha de fin"}
                    {dias !== null && dias >= 0 && dias <= 45 && c.estado !== "Finalizado" && (
                      <span className="block text-warning-foreground">Vence en {dias} días</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-xs tabular-nums">
                    {c.importe === null ? "—" : miles(c.importe)}
                  </td>
                  <td className="px-3 py-3">
                    <Pildora
                      tono={
                        c.estado === "Vigente"
                          ? "ok"
                          : c.estado === "Por renovar"
                            ? "alerta"
                            : "neutro"
                      }
                    >
                      {c.estado}
                    </Pildora>
                  </td>
                  <td className="py-3 pl-3 pr-5 text-right whitespace-nowrap">
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Editar"
                      onClick={() => setEditando(c)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Eliminar"
                      onClick={() =>
                        confirmar(`¿Eliminar «${c.titulo}»?`) && borrar.mutate({ id: c.id })
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </Tabla>
        )}
      </Seccion>
      {editando && (
        <FormContrato key={editando.id} inicial={editando} onCerrar={() => setEditando(null)} />
      )}
    </>
  );
}

function FormContrato({ inicial, onCerrar }: { inicial: Contrato; onCerrar: () => void }) {
  const [c, setC] = useState(inicial);
  const [error, setError] = useState<string | null>(null);
  const guardar = useGuardarEn("contratos", "Contrato guardado");
  const set = <K extends keyof Contrato>(k: K, v: Contrato[K]) => setC((x) => ({ ...x, [k]: v }));
  return (
    <DialogoFormulario
      abierto
      titulo="Contrato"
      onCerrar={onCerrar}
      guardando={guardar.isPending}
      error={error}
      onGuardar={() => {
        if (!c.titulo.trim() || !c.contraparte.trim())
          return setError("Completá el título y la contraparte.");
        if (c.fin && c.fin < c.inicio)
          return setError("La fecha de fin no puede ser anterior al inicio.");
        guardar.mutate(
          { item: c, accion: `Guardó el contrato «${c.titulo}»` },
          { onSuccess: onCerrar },
        );
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo label="Título" className="sm:col-span-2">
          <input
            className={INPUT}
            value={c.titulo}
            onChange={(e) => set("titulo", e.target.value)}
          />
        </Campo>
        <Campo label="Contraparte">
          <input
            className={INPUT}
            value={c.contraparte}
            onChange={(e) => set("contraparte", e.target.value)}
          />
        </Campo>
        <Campo label="Tipo">
          <select
            className={INPUT}
            value={c.tipo}
            onChange={(e) => set("tipo", e.target.value as Contrato["tipo"])}
          >
            {(["Proveedor", "Cliente", "Laboral", "Otro"] as const).map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Campo>
        <Campo label="Inicio">
          <input
            className={INPUT}
            type="date"
            value={c.inicio}
            onChange={(e) => set("inicio", e.target.value)}
          />
        </Campo>
        <Campo label="Fin" ayuda="Vacío si no tiene fecha de fin.">
          <input
            className={INPUT}
            type="date"
            value={c.fin ?? ""}
            onChange={(e) => set("fin", e.target.value || null)}
          />
        </Campo>
        <Campo label="Importe mensual" ayuda="Opcional.">
          <input
            className={INPUT}
            type="number"
            min={0}
            value={c.importe ?? ""}
            onChange={(e) => set("importe", e.target.value === "" ? null : Number(e.target.value))}
          />
        </Campo>
        <Campo label="Estado">
          <select
            className={INPUT}
            value={c.estado}
            onChange={(e) => set("estado", e.target.value as Contrato["estado"])}
          >
            {(["Vigente", "Por renovar", "Finalizado"] as const).map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Campo>
      </div>
    </DialogoFormulario>
  );
}
