import { Link } from "@tanstack/react-router"
import { ArrowLeft, Info } from "lucide-react"

/* ───────────── Placeholder de las secciones de Equipo profesional ─────────────
   Datos de ejemplo hardcodeados, solo como guía visual.
   Cuando exista el backend, se reemplaza `SECCIONES` por los datos reales.
*/

export type EquipoSeccionId = "especialidades" | "agendas" | "permisos"

type Fila = { titulo: string; detalle: string; meta: string }

const SECCIONES: Record<
  EquipoSeccionId,
  { titulo: string; descripcion: string; filas: Fila[] }
> = {
  especialidades: {
    titulo: "Especialidades",
    descripcion:
      "Especialidades odontológicas que ofrece tu clínica y los profesionales asignados a cada una.",
    filas: [
      {
        titulo: "Odontología general",
        detalle: "Consultas, limpiezas, restauraciones",
        meta: "3 profesionales",
      },
      {
        titulo: "Ortodoncia",
        detalle: "Brackets, alineadores, retenedores",
        meta: "1 profesional",
      },
      {
        titulo: "Endodoncia",
        detalle: "Tratamientos de conducto",
        meta: "1 profesional",
      },
      {
        titulo: "Periodoncia",
        detalle: "Encías y tejidos de soporte",
        meta: "1 profesional",
      },
      {
        titulo: "Implantología",
        detalle: "Implantes y rehabilitación oral",
        meta: "Sin asignar",
      },
    ],
  },
  agendas: {
    titulo: "Agendas y horarios",
    descripcion:
      "Jornada semanal, descansos y consultorio de cada integrante del equipo.",
    filas: [
      {
        titulo: "Esther Méndez",
        detalle: "Lun a Vie · 09:00 – 18:00 · descanso 13:00 – 14:00",
        meta: "Consultorio 1",
      },
      {
        titulo: "Asistente dental",
        detalle: "Lun a Vie · 09:00 – 17:00",
        meta: "Consultorio 1",
      },
      {
        titulo: "Secretaria",
        detalle: "Lun a Sáb · 08:00 – 16:00",
        meta: "Recepción",
      },
      {
        titulo: "Profesional invitado",
        detalle: "Mar y Jue · 14:00 – 20:00",
        meta: "Consultorio 2",
      },
    ],
  },
  permisos: {
    titulo: "Permisos y accesos",
    descripcion:
      "Qué puede ver y hacer cada rol dentro del sistema.",
    filas: [
      {
        titulo: "Odontólogo/a",
        detalle: "Historia clínica, odontograma, agenda propia, recetas",
        meta: "6 permisos",
      },
      {
        titulo: "Asistente dental",
        detalle: "Agenda (solo lectura), preparación de consultorio",
        meta: "2 permisos",
      },
      {
        titulo: "Secretaria",
        detalle: "Agenda general, pacientes, cobros, comunicación",
        meta: "5 permisos",
      },
      {
        titulo: "Administrador/a",
        detalle: "Acceso total, facturación, equipo y configuración",
        meta: "Acceso total",
      },
    ],
  },
}

export function EquipoSeccion({ seccion }: { seccion: EquipoSeccionId }) {
  const data = SECCIONES[seccion]

  return (
    <div className="relative mx-auto w-full max-w-[1400px] px-4 py-5 md:px-6 lg:px-8">
      <Link
        to={"/demo/equipo-profesional" as never}
        className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Equipo profesional
      </Link>

      <h1 className="font-display text-2xl font-bold tracking-tight">
        {data.titulo}
      </h1>

      <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
        {data.descripcion}
      </p>

      <div className="mt-4 flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3.5 py-2.5 text-xs text-primary">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        <span>
          Vista de ejemplo con datos ficticios. Se conectará al backend más
          adelante.
        </span>
      </div>

      <ul className="mt-4 space-y-2.5">
        {data.filas.map((f) => (
          <li
            key={f.titulo}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3.5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold">{f.titulo}</p>

              <p className="mt-0.5 text-xs text-muted-foreground">
                {f.detalle}
              </p>
            </div>

            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              {f.meta}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}