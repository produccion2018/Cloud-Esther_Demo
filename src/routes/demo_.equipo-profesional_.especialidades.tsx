import { createFileRoute } from "@tanstack/react-router"
import { AppShell } from "@/components/cloud-esther/AppShell"
import { EquipoSeccion } from "@/components/cloud-esther/EquipoSeccion"
import { CloudEstherProvider } from "@/lib/cloud-esther/data"

// "demo_" y "equipo-profesional_" (con guion bajo) hacen que esta ruta NO quede
// anidada dentro de demo.tsx ni de demo_.equipo-profesional.tsx (que no tiene <Outlet />)
export const Route = createFileRoute("/demo_/equipo-profesional_/especialidades")({
  head: () => ({
    meta: [{ title: "Especialidades | Cloud Esther" }],
  }),
  component: EspecialidadesPage,
})

function EspecialidadesPage() {
  return (
    <CloudEstherProvider>
      <AppShell>
        <EquipoSeccion seccion="especialidades" />
      </AppShell>
    </CloudEstherProvider>
  )
}