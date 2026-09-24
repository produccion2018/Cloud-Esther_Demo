import { createFileRoute } from "@tanstack/react-router"
import { AppShell } from "@/components/cloud-esther/AppShell"
import { EquipoProfesional } from "@/components/cloud-esther/EquipoProfesional"
import { CloudEstherProvider } from "@/lib/cloud-esther/data"

// "demo_" (con guion bajo) hace que esta ruta NO quede anidada dentro de demo.tsx
export const Route = createFileRoute("/demo_/equipo-profesional")({
  head: () => ({
    meta: [{ title: "Equipo profesional | Cloud Esther" }],
  }),
  component: EquipoProfesionalPage,
})

function EquipoProfesionalPage() {
  return (
    <CloudEstherProvider>
      <AppShell>
        <EquipoProfesional />
      </AppShell>
    </CloudEstherProvider>
  )
}