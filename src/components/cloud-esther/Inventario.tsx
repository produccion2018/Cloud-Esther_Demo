import { useMemo, useState } from "react"
import type { ReactNode } from "react"
import {
  Search,
  Plus,
  ShoppingCart,
  Boxes,
  AlertTriangle,
  Package,
  TrendingDown,
  ClipboardList,
  Minus,
  X,
  ChevronDown,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

import {
  SUPPLIES,
  PURCHASE_ORDERS,
  CLINICAS,
  CATEGORIAS,
  UNIDADES,
  stockLevel,
  emptySupply,
  emptyOrder,
  type Supply,
  type PurchaseOrder,
  type OrderStatus,
} from "@/lib/cloud-esther/inventario-data"

/* ───────────── Estilos compartidos (mismo lenguaje visual que Agenda / Equipo) ───────────── */

const CARD =
  "rounded-xl border border-primary/25 bg-card/90 bg-gradient-to-b from-[oklch(0.96_0.025_292)]/70 to-transparent p-3.5 shadow-sm backdrop-blur-sm transition-all duration-300 hover:border-primary hover:shadow-lg hover:shadow-primary/10"

const STAT_CARD =
  "group relative flex flex-col overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-[oklch(0.96_0.03_292)] via-card/90 to-card/60 p-3.5 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10"

const ITEM =
  "rounded-xl border border-border bg-card p-3.5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"

const INPUT =
  "h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"

const INPUT_SM =
  "h-9 w-full rounded-lg border border-border bg-background px-3 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"

/* ───────────── Piezas reutilizables ───────────── */

function IconTile({ icon: Icon, tone = "primary" }: { icon: LucideIcon; tone?: "primary" | "amber" }) {
  return (
    <span
      className={`grid size-9 shrink-0 place-items-center rounded-full ${
        tone === "amber" ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" : "bg-primary/10 text-primary"
      }`}
    >
      <Icon className="size-4" />
    </span>
  )
}

function StatCard({ label, value, hint, icon: Icon }: { label: string; value: string | number; hint: string; icon: LucideIcon }) {
  return (
    <div className={STAT_CARD}>
      <span className="pointer-events-none absolute -right-3 -top-3 size-16 rounded-full bg-primary/10 transition-colors duration-300 group-hover:bg-primary/15" />
      <Icon className="absolute right-3 top-3 size-4 text-primary/70" />
      <p className="relative pr-8 text-[11px] font-semibold uppercase leading-4 tracking-wider text-muted-foreground">{label}</p>
      <p className="relative mt-0.5 text-2xl font-bold leading-tight tabular-nums">{value}</p>
      <p className="relative mt-0.5 text-[11px] text-muted-foreground">{hint}</p>
    </div>
  )
}

function SelectField({
  value,
  onChange,
  options,
  placeholder,
  compact,
}: {
  value: string
  onChange: (v: string) => void
  options: string[]
  placeholder?: string
  compact?: boolean
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${compact ? INPUT_SM : INPUT} appearance-none ${compact ? "pr-9" : "pr-10"}`}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <ChevronDown
        className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted-foreground ${compact ? "right-3 size-3.5" : "right-3.5 size-4"}`}
      />
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
    </label>
  )
}

function Modal({ title, subtitle, onClose, children }: { title: string; subtitle?: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-primary/15 bg-card bg-gradient-to-b from-primary/[0.06] to-transparent p-6 shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
            {subtitle && <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-primary/10"
          >
            <X className="size-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

const ESTADO_ORDEN_STYLES: Record<OrderStatus, string> = {
  Pendiente: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  "En tránsito": "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  Recibida: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
}

/* ───────────── Página ───────────── */

type Vista = "stock" | "alertas" | "ordenes" | "consumo"

export function Inventario() {
  const [supplies, setSupplies] = useState<Supply[]>(SUPPLIES)
  const [orders, setOrders] = useState<PurchaseOrder[]>(PURCHASE_ORDERS)
  const [vista, setVista] = useState<Vista>("stock")
  const [search, setSearch] = useState("")
  const [clinicFilter, setClinicFilter] = useState("")
  const [addSupplyOpen, setAddSupplyOpen] = useState(false)
  const [addOrderOpen, setAddOrderOpen] = useState(false)
  const [draftSupply, setDraftSupply] = useState<Supply>(emptySupply())
  const [draftOrder, setDraftOrder] = useState<PurchaseOrder>(emptyOrder())
  const [toast, setToast] = useState<string | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2600)
  }

  const filtered = useMemo(() => {
    return supplies.filter((s) => {
      const matchesSearch = !search || s.name.toLowerCase().includes(search.toLowerCase())
      const matchesClinic = !clinicFilter || s.clinic === clinicFilter
      return matchesSearch && matchesClinic
    })
  }, [supplies, search, clinicFilter])

  const alertas = supplies.filter((s) => stockLevel(s) === "bajo")
  const pendientes = orders.filter((o) => o.status !== "Recibida")

  const stats = {
    total: supplies.length,
    unidades: supplies.reduce((acc, s) => acc + s.quantity, 0),
    alertas: alertas.length,
    pendientes: pendientes.length,
  }

  function updateQty(id: string, delta: number) {
    setSupplies((prev) => prev.map((s) => (s.id === id ? { ...s, quantity: Math.max(0, s.quantity + delta) } : s)))
  }

  function removeSupply(s: Supply) {
    setSupplies((prev) => prev.filter((x) => x.id !== s.id))
    showToast(`${s.name} se quitó del inventario`)
  }

  function saveSupply() {
    if (!draftSupply.name || !draftSupply.provider) {
      showToast("Completá al menos nombre y proveedor")
      return
    }
    setSupplies((prev) => [...prev, draftSupply])
    showToast(`${draftSupply.name} se agregó al inventario`)
    setAddSupplyOpen(false)
    setDraftSupply(emptySupply())
  }

  function saveOrder() {
    if (!draftOrder.provider) {
      showToast("Completá el proveedor de la orden")
      return
    }
    setOrders((prev) => [draftOrder, ...prev])
    showToast(`Orden ${draftOrder.id} creada`)
    setAddOrderOpen(false)
    setDraftOrder(emptyOrder())
  }

  function markReponer(s: Supply) {
    showToast(`Reposición iniciada para ${s.name}`)
  }

  const VISTAS: { id: Vista; label: string; icon: LucideIcon; badge?: number }[] = [
    { id: "stock", label: "Stock", icon: Boxes },
    { id: "alertas", label: "Alertas", icon: AlertTriangle, badge: alertas.length },
    { id: "ordenes", label: "Órdenes de compra", icon: ShoppingCart },
    { id: "consumo", label: "Consumo", icon: TrendingDown },
  ]

  return (
    <div className="relative mx-auto w-full max-w-[1400px] px-4 py-5 md:px-6 lg:px-8">
      {/* Encabezado */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Inventario</h1>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Controlá insumos, stock, reposición, compras y consumo de cada sucursal.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              setDraftOrder(emptyOrder())
              setAddOrderOpen(true)
            }}
            className="flex items-center gap-2 rounded-lg border border-border bg-background px-3.5 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-muted"
          >
            <ShoppingCart className="size-4" />
            Nueva orden
          </button>
          <button
            onClick={() => {
              setDraftSupply(emptySupply())
              setAddSupplyOpen(true)
            }}
            className="flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
          >
            <Plus className="size-4" />
            Nuevo insumo
          </button>
        </div>
      </div>

      {/* Resumen */}
      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Insumos registrados" value={stats.total} hint={`${stats.unidades} unidades/cajas en stock`} icon={Boxes} />
        <StatCard label="Alertas activas" value={stats.alertas} hint="Revisar reposición" icon={AlertTriangle} />
        <StatCard label="Órdenes pendientes" value={stats.pendientes} hint="En curso" icon={ShoppingCart} />
        <StatCard label="Consumo del mes" value="—" hint="Se calculará con los movimientos" icon={TrendingDown} />
      </div>

      {/* Pestañas */}
      <div className="mt-4 inline-flex flex-wrap gap-1 rounded-full bg-muted/70 p-1 backdrop-blur-sm">
        {VISTAS.map((v) => (
          <button
            key={v.id}
            onClick={() => setVista(v.id)}
            className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              vista === v.id ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <v.icon className="size-3.5" />
            {v.label}
            {!!v.badge && (
              <span className="grid size-4 place-items-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                {v.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Stock */}
      {vista === "stock" && (
        <div className={`${CARD} mt-3`}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold tracking-tight">Inventario por sucursal</h2>
            <div className="flex flex-wrap gap-2">
              <div className="relative w-56">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar insumo..."
                  className={`${INPUT_SM} pl-9`}
                />
              </div>
              <div className="w-44">
                <SelectField compact value={clinicFilter} onChange={setClinicFilter} options={CLINICAS} placeholder="Todas las sucursales" />
              </div>
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
              No se encontraron insumos con ese filtro.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {filtered.map((s) => {
                const level = stockLevel(s)
                const pct = Math.min(100, Math.round((s.quantity / Math.max(s.min * 2, 1)) * 100))
                return (
                  <li key={s.id} className={ITEM}>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold">{s.name}</p>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              level === "bajo"
                                ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                                : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                            }`}
                          >
                            {level === "bajo" ? "Stock bajo" : "Normal"}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {s.category} · {s.clinic} · {s.provider}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQty(s.id, -1)}
                          className="grid size-8 place-items-center rounded-full border border-border bg-background transition-colors hover:bg-muted"
                        >
                          <Minus className="size-3.5" />
                        </button>
                        <div className="w-16 text-center">
                          <p className="text-lg font-bold leading-none tabular-nums">{s.quantity}</p>
                          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{s.unit}</p>
                        </div>
                        <button
                          onClick={() => updateQty(s.id, 1)}
                          className="grid size-8 place-items-center rounded-full border border-border bg-background transition-colors hover:bg-muted"
                        >
                          <Plus className="size-3.5" />
                        </button>
                        <button
                          onClick={() => removeSupply(s)}
                          aria-label="Quitar insumo"
                          className="grid size-8 place-items-center rounded-full text-destructive/70 transition-colors hover:bg-destructive/10 hover:text-destructive"
                        >
                          <X className="size-4" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-2.5">
                      <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                        <span>Nivel de stock</span>
                        <span>
                          {s.quantity} {s.unit} · mín. {s.min}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full ${level === "bajo" ? "bg-amber-500" : "bg-primary"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}

      {/* Alertas */}
      {vista === "alertas" && (
        <div className={`${CARD} mt-3`}>
          <div className="mb-3 flex items-center gap-2">
            <IconTile icon={AlertTriangle} tone="amber" />
            <h2 className="text-base font-semibold tracking-tight">Alertas de reposición</h2>
          </div>

          {alertas.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
              No hay alertas de stock por ahora.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {alertas.map((s) => (
                <li
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/25 bg-amber-500/5 p-3.5"
                >
                  <div className="flex items-center gap-3">
                    <IconTile icon={AlertTriangle} tone="amber" />
                    <div>
                      <p className="text-sm font-semibold">{s.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.clinic} · quedan <span className="font-semibold text-foreground">{s.quantity} {s.unit}</span> · mínimo {s.min}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => markReponer(s)}
                    className="flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm hover:opacity-90"
                  >
                    <ShoppingCart className="size-3.5" />
                    Reponer
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Órdenes de compra */}
      {vista === "ordenes" && (
        <div className={`${CARD} mt-3`}>
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <IconTile icon={ShoppingCart} />
              <h2 className="text-base font-semibold tracking-tight">Órdenes de compra</h2>
            </div>
            <button
              onClick={() => {
                setDraftOrder(emptyOrder())
                setAddOrderOpen(true)
              }}
              className="flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium shadow-sm transition-colors hover:bg-primary/5"
            >
              <Plus className="size-3.5" />
              Nueva orden
            </button>
          </div>

          {orders.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
              Todavía no hay órdenes de compra.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {orders.map((o) => (
                <li key={o.id} className={`${ITEM} flex flex-wrap items-center justify-between gap-3`}>
                  <div className="flex items-center gap-3">
                    <IconTile icon={ShoppingCart} />
                    <div>
                      <p className="text-sm font-semibold">{o.id}</p>
                      <p className="text-xs text-muted-foreground">
                        {o.provider} · {o.clinic}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {o.productsCount} producto{o.productsCount !== 1 ? "s" : ""} · {o.date}
                      </p>
                    </div>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ESTADO_ORDEN_STYLES[o.status]}`}>{o.status}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Consumo */}
      {vista === "consumo" && (
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className={`${CARD} flex flex-col items-center gap-2 py-8 text-center`}>
            <IconTile icon={TrendingDown} />
            <p className="text-sm font-semibold">Calculando consumo</p>
            <p className="max-w-[220px] text-xs text-muted-foreground">
              El sistema calculará automáticamente el consumo cuando se registren movimientos de entrada y salida.
            </p>
          </div>
          <div className={`${CARD} flex flex-col items-center gap-2 py-8 text-center`}>
            <IconTile icon={ClipboardList} />
            <p className="text-sm font-semibold">Mayor consumo</p>
            <p className="max-w-[220px] text-xs text-muted-foreground">Acá aparecerán los insumos con mayor consumo.</p>
          </div>
          <div className={`${CARD} flex flex-col items-center gap-2 py-8 text-center`}>
            <IconTile icon={Package} />
            <p className="text-sm font-semibold">Sin movimientos</p>
            <p className="max-w-[220px] text-xs text-muted-foreground">
              Las entradas, salidas, ajustes y transferencias entre sucursales aparecerán acá.
            </p>
          </div>
        </div>
      )}

      {/* Nuevo insumo */}
      {addSupplyOpen && (
        <Modal title="Nuevo insumo" subtitle="Agregá un insumo al inventario de tu clínica." onClose={() => setAddSupplyOpen(false)}>
          <div className="space-y-4">
            <Field label="Nombre">
              <input value={draftSupply.name} onChange={(e) => setDraftSupply({ ...draftSupply, name: e.target.value })} className={INPUT} />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Categoría">
                <SelectField value={draftSupply.category} onChange={(v) => setDraftSupply({ ...draftSupply, category: v })} options={CATEGORIAS} />
              </Field>
              <Field label="Sucursal">
                <SelectField value={draftSupply.clinic} onChange={(v) => setDraftSupply({ ...draftSupply, clinic: v })} options={CLINICAS} />
              </Field>
            </div>
            <Field label="Proveedor">
              <input value={draftSupply.provider} onChange={(e) => setDraftSupply({ ...draftSupply, provider: e.target.value })} className={INPUT} />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Cantidad">
                <input
                  type="number"
                  min={0}
                  value={draftSupply.quantity}
                  onChange={(e) => setDraftSupply({ ...draftSupply, quantity: Number(e.target.value) })}
                  className={INPUT}
                />
              </Field>
              <Field label="Unidad">
                <SelectField value={draftSupply.unit} onChange={(v) => setDraftSupply({ ...draftSupply, unit: v as Supply["unit"] })} options={UNIDADES} />
              </Field>
              <Field label="Mínimo">
                <input
                  type="number"
                  min={0}
                  value={draftSupply.min}
                  onChange={(e) => setDraftSupply({ ...draftSupply, min: Number(e.target.value) })}
                  className={INPUT}
                />
              </Field>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setAddSupplyOpen(false)}
                className="rounded-xl border border-border bg-background px-5 py-2.5 text-sm font-medium shadow-sm hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                onClick={saveSupply}
                className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90"
              >
                Guardar insumo
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Nueva orden */}
      {addOrderOpen && (
        <Modal title="Nueva orden de compra" subtitle="Generá una orden para reponer stock." onClose={() => setAddOrderOpen(false)}>
          <div className="space-y-4">
            <Field label="Proveedor">
              <input value={draftOrder.provider} onChange={(e) => setDraftOrder({ ...draftOrder, provider: e.target.value })} className={INPUT} />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Sucursal">
                <SelectField value={draftOrder.clinic} onChange={(v) => setDraftOrder({ ...draftOrder, clinic: v })} options={CLINICAS} />
              </Field>
              <Field label="Cantidad de productos">
                <input
                  type="number"
                  min={1}
                  value={draftOrder.productsCount}
                  onChange={(e) => setDraftOrder({ ...draftOrder, productsCount: Number(e.target.value) })}
                  className={INPUT}
                />
              </Field>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setAddOrderOpen(false)}
                className="rounded-xl border border-border bg-background px-5 py-2.5 text-sm font-medium shadow-sm hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                onClick={saveOrder}
                className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90"
              >
                Crear orden
              </button>
            </div>
          </div>
        </Modal>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background shadow-lg">{toast}</div>
      )}
    </div>
  )
}