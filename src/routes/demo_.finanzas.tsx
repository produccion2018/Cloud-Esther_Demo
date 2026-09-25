import { createFileRoute } from "@tanstack/react-router"
import { AppShell } from "@/components/cloud-esther/AppShell"
import { Finanzas } from "@/components/cloud-esther/Finanzas"
import { CloudEstherProvider } from "@/lib/cloud-esther/data"

// "demo_" (con guion bajo) hace que esta ruta NO quede anidada dentro de demo.tsx
export const Route = createFileRoute("/demo_/finanzas")({
  head: () => ({
    meta: [{ title: "Finanzas | Cloud Esther" }],
  }),
  component: FinanzasPage,
})

function FinanzasPage() {
  return (
    <CloudEstherProvider>
      <AppShell>
        <Finanzas />
      </AppShell>
    </CloudEstherProvider>
  )
}