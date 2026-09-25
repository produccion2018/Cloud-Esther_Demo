import { createFileRoute } from "@tanstack/react-router"
import { AppShell } from "@/components/cloud-esther/AppShell"
import { Inventario } from "@/components/cloud-esther/Inventario"
import { CloudEstherProvider } from "@/lib/cloud-esther/data"

// "demo_" (con guion bajo) hace que esta ruta NO quede anidada dentro de demo.tsx
export const Route = createFileRoute("/demo_/inventario")({
  head: () => ({
    meta: [{ title: "Inventario | Cloud Esther" }],
  }),
  component: InventarioPage,
})

function InventarioPage() {
  return (
    <CloudEstherProvider>
      <AppShell>
        <Inventario />
      </AppShell>
    </CloudEstherProvider>
  )
}