export type StockLevel = "normal" | "bajo"
export type OrderStatus = "Pendiente" | "En tránsito" | "Recibida"

export interface Supply {
  id: string
  name: string
  category: string
  clinic: string
  provider: string
  quantity: number
  unit: "cajas" | "kits" | "unidades"
  min: number
}

export interface PurchaseOrder {
  id: string
  provider: string
  clinic: string
  productsCount: number
  date: string
  status: OrderStatus
}

export const CLINICAS = ["Clínica Centro", "Clínica Norte", "Clínica Sur", "Clínica Belgrano"]
export const CATEGORIAS = ["Protección", "Anestesia", "Ortodoncia", "Operatoria", "Endodoncia", "Esterilización"]
export const UNIDADES: Supply["unit"][] = ["cajas", "kits", "unidades"]

export function stockLevel(s: Supply): StockLevel {
  return s.quantity <= s.min ? "bajo" : "normal"
}

export const SUPPLIES: Supply[] = [
  { id: "1", name: "Guantes de látex", category: "Protección", clinic: "Clínica Centro", provider: "Dental Supply", quantity: 24, unit: "cajas", min: 10 },
  { id: "2", name: "Anestesia local", category: "Anestesia", clinic: "Clínica Centro", provider: "OdontoMed", quantity: 6, unit: "cajas", min: 10 },
  { id: "3", name: "Material de ortodoncia", category: "Ortodoncia", clinic: "Clínica Norte", provider: "OrthoPro", quantity: 18, unit: "kits", min: 8 },
  { id: "4", name: "Resina composite", category: "Operatoria", clinic: "Clínica Sur", provider: "Dental Supply", quantity: 3, unit: "unidades", min: 8 },
  { id: "5", name: "Mascarillas", category: "Protección", clinic: "Clínica Centro", provider: "Dental Supply", quantity: 42, unit: "cajas", min: 15 },
]

export const PURCHASE_ORDERS: PurchaseOrder[] = [
  { id: "OC-2026-004", provider: "Proveedor pendiente", clinic: "Clínica Centro", productsCount: 2, date: "24/9/2026", status: "Pendiente" },
  { id: "OC-2026-003", provider: "Dental Supply", clinic: "Clínica Sur", productsCount: 4, date: "10/9/2026", status: "Pendiente" },
  { id: "OC-2026-001", provider: "OdontoMed", clinic: "Clínica Centro", productsCount: 3, date: "21/08/2026", status: "En tránsito" },
]

export function emptySupply(): Supply {
  return {
    id: crypto.randomUUID(),
    name: "",
    category: CATEGORIAS[0],
    clinic: CLINICAS[0],
    provider: "",
    quantity: 0,
    unit: "unidades",
    min: 1,
  }
}

export function emptyOrder(): PurchaseOrder {
  return {
    id: `OC-2026-${Math.floor(100 + Math.random() * 900)}`,
    provider: "",
    clinic: CLINICAS[0],
    productsCount: 1,
    date: new Date().toLocaleDateString("es-AR"),
    status: "Pendiente",
  }
}