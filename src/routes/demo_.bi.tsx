import { createFileRoute } from "@tanstack/react-router"
import { AppShell } from "@/components/cloud-esther/AppShell"
import { Analitica } from "@/components/cloud-esther/Analitica"
import { CloudEstherProvider } from "@/lib/cloud-esther/data"

// "demo_" (con guion bajo) hace que esta ruta NO quede anidada dentro de demo.tsx
export const Route = createFileRoute("/demo_/bi")({
  head: () => ({
    meta: [{ title: "Analítica | Cloud Esther" }],
  }),
  component: AnaliticaPage,
})

function AnaliticaPage() {
  return (
    <CloudEstherProvider>
      <AppShell>
        <Analitica />
      </AppShell>
    </CloudEstherProvider>
  )
}