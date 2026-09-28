import { createFileRoute } from "@tanstack/react-router"
import { AppShell } from "@/components/cloud-esther/AppShell"
import { EstherAI } from "@/components/cloud-esther/esther-ai/EstherAI"
import { CloudEstherProvider } from "@/lib/cloud-esther/data"

// "demo_" (con guion bajo) hace que esta ruta NO quede anidada dentro de demo.tsx
export const Route = createFileRoute("/demo_/ia")({
  head: () => ({
    meta: [{ title: "Esther AI | Cloud Esther" }],
  }),
  component: EstherAIPage,
})

function EstherAIPage() {
  return (
    <CloudEstherProvider>
      <AppShell>
        <EstherAI context={{ section: "general" }} />
      </AppShell>
    </CloudEstherProvider>
  )
}