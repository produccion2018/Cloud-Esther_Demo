import { createFileRoute } from "@tanstack/react-router"
import { AppShell } from "@/components/cloud-esther/AppShell"
import { EquipoSeccion } from "@/components/cloud-esther/EquipoSeccion"
import { CloudEstherProvider } from "@/lib/cloud-esther/data"

// "demo_" y "equipo-profesional_" (con guion bajo) hacen que esta ruta NO quede
// anidada dentro de demo.tsx ni de demo_.equipo-profesional.tsx (que no tiene <Outlet />)
export const Route = createFileRoute("/demo_/equipo-profesional_/permisos-accesos")({
  head: () => ({
    meta: [{ title: "Permisos y accesos | Cloud Esther" }],
  }),
  component: PermisosAccesosPage,
})

function PermisosAccesosPage() {
  return (
    <CloudEstherProvider>
      <AppShell>
        <EquipoSeccion seccion="permisos" />
      </AppShell>
    </CloudEstherProvider>
  )
}