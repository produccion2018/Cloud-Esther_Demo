import { useMemo, useState } from "react"
import type { ComponentType, ReactNode } from "react"
import {
  Search,
  Plus,
  Eye,
  Pencil,
  CalendarDays,
  ShieldCheck,
  UserX,
  UserCheck,
  Users,
  ClipboardList,
  Percent,
  Phone,
  Mail,
  Clock,
  X,
  ChevronDown,
  Briefcase,
  Headset,
  Settings2,
  Download,
  TrendingUp,
  CalendarOff,
  UserPlus,
} from "lucide-react"

import {
  emptyMember,
  permsFor,
  type TeamMember,
  type TeamRole,
  type MemberStatus,
} from "@/lib/cloud-esther/equipo-profesional-data"
import { useEquipo } from "@/lib/cloud-esther/equipo-store"
import { capitalizarNombre } from "@/lib/utils"
import { storeAgenda } from "@/lib/cloud-esther/agenda-store"
import { AusenciasEquipo, DesempenoEquipo, InvitacionesEquipo, ausenteHoy, hoyISO, turnosDe } from "@/components/cloud-esther/EquipoPaneles"

type VistaEquipo = "integrantes" | "desempeno" | "ausencias" | "invitaciones"

const VISTAS: { id: VistaEquipo; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { id: "integrantes", label: "Integrantes", icon: Users },
  { id: "desempeno", label: "Desempeño", icon: TrendingUp },
  { id: "ausencias", label: "Ausencias y licencias", icon: CalendarOff },
  { id: "invitaciones", label: "Invitaciones", icon: UserPlus },
]

const DIAS_SEMANA = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"] as const

/** Jornada de hoy del integrante (o null si hoy no trabaja). */
function horarioDeHoy(m: TeamMember) {
  const hoy = DIAS_SEMANA[new Date().getDay()]
  return m.schedule.find((d) => d.day === hoy && d.active) ?? null
}

function minutosJornada(d: { start: string; end: string }) {
  const [h1 = 0, m1 = 0] = d.start.split(":").map(Number)
  const [h2 = 0, m2 = 0] = d.end.split(":").map(Number)
  return Math.max(60, h2 * 60 + m2 - (h1 * 60 + m1))
}

/* ───────────── Ícono de diente propio (lucide-react no trae uno) ───────────── */

type IconType = ComponentType<{ className?: string }>

function ToothIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M20 8C12 8 7 14 7 22c0 7 3 11 4.5 18 1 6 1.5 14 5.5 16 3.500 1.500 5.500-4 7-10 1-4 3-6 8-6s7 2 8 6c1.500 6 3.500 11.500 7 10 4-2 4.500-10 5.500-16C54 33 57 29 57 22c0-8-5-14-13-14-5 0-8.500 3-12 3S25 8 20 8Z"
        fill="currentColor"
      />
    </svg>
  )
}

/* ───────────── Estilos compartidos (mismo lenguaje visual que Agenda) ───────────── */

const CARD =
  "rounded-xl border border-primary/25 bg-card/90 bg-gradient-to-b from-[oklch(0.96_0.025_292)]/70 to-transparent p-3.5 shadow-sm backdrop-blur-sm transition-all duration-300 hover:border-primary hover:shadow-lg hover:shadow-primary/10"

const STAT_CARD =
  "group relative flex flex-col overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-[oklch(0.96_0.03_292)] via-card/90 to-card/60 p-3.5 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10"

const ITEM =
  "rounded-xl border border-border bg-card p-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"

const INPUT =
  "h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"

const INPUT_SM =
  "h-9 w-full rounded-lg border border-border bg-background px-3 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"

/* ───────────── Metadata visual ───────────── */

const ROLE_LABEL: Record<TeamRole, string> = {
  odontologo: "Odontólogo/a",
  asistente: "Asistente dental",
  secretaria: "Secretaria",
  administrador: "Administrador/a",
}

const ROLE_META: Record<TeamRole, { icon: IconType; chip: string }> = {
  odontologo: { icon: ToothIcon, chip: "bg-primary/10 text-primary" },
  asistente: { icon: Headset, chip: "bg-sky-500/10 text-sky-700 dark:text-sky-300" },
  secretaria: { icon: ClipboardList, chip: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  administrador: { icon: Briefcase, chip: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
}

const STATUS_META: Record<MemberStatus, { label: string; dot: string; chip: string }> = {
  activo: {
    label: "Activo",
    dot: "bg-emerald-500",
    chip: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  pendiente: {
    label: "Pendiente",
    dot: "bg-amber-500",
    chip: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  },
  inactivo: {
    label: "Inactivo",
    dot: "bg-muted-foreground/50",
    chip: "bg-muted text-muted-foreground",
  },
}

type FilterKey = "todos" | TeamRole | "activos" | "inactivos"

const FILTROS: { id: FilterKey; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "odontologo", label: "Odontólogos" },
  { id: "asistente", label: "Asistentes" },
  { id: "secretaria", label: "Secretarias" },
  { id: "administrador", label: "Administradores" },
  { id: "activos", label: "Activos" },
  { id: "inactivos", label: "Inactivos" },
]

function initials(m: TeamMember) {
  return `${m.firstName[0] ?? ""}${m.lastName[0] ?? ""}`.toUpperCase()
}

function fullName(m: TeamMember) {
  return `${m.firstName} ${m.lastName}`.trim()
}

/* ───────────── Piezas reutilizables ───────────── */

function IconTile({ icon: Icon }: { icon: IconType }) {
  return (
    <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
      <Icon className="size-4" />
    </span>
  )
}

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string
  value: number
  hint: string
  icon: IconType
}) {
  return (
    <div className={STAT_CARD}>
      <span className="pointer-events-none absolute -right-3 -top-3 size-16 rounded-full bg-primary/10 transition-colors duration-300 group-hover:bg-primary/15" />
      <Icon className="absolute right-3 top-3 size-4 text-primary/70" />
      <p className="relative pr-8 text-[11px] font-semibold uppercase leading-4 tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="relative mt-0.5 text-2xl font-bold leading-tight tabular-nums">
        {value}
      </p>
      <p className="relative mt-0.5 text-[11px] text-muted-foreground">
        {hint}
      </p>
    </div>
  )
}

function StatusBadge({ status }: { status: MemberStatus }) {
  const meta = STATUS_META[status]

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.chip}`}
    >
      <span className={`size-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  )
}

function BotonAccion({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon?: IconType
  label: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium shadow-sm transition-colors ${
        danger
          ? "border-destructive/30 bg-destructive/5 text-destructive hover:bg-destructive/10"
          : "border-border bg-background hover:bg-primary/5"
      }`}
    >
      {Icon && <Icon className="size-3.5" />}
      {label}
    </button>
  )
}

function SelectField({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  options: string[]
  placeholder?: string
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${INPUT} appearance-none pr-10`}
      >
        {placeholder && <option value="">{placeholder}</option>}

        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>

      <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
    </label>
  )
}

function Modal({
  title,
  subtitle,
  onClose,
  wide,
  children,
}: {
  title: string
  subtitle?: string
  onClose: () => void
  wide?: boolean
  children: ReactNode
}) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`max-h-[92vh] w-full ${
          wide ? "max-w-2xl" : "max-w-lg"
        } overflow-y-auto rounded-2xl border border-primary/15 bg-card bg-gradient-to-b from-primary/[0.06] to-transparent p-6 shadow-2xl`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">{title}</h2>

            {subtitle && (
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {subtitle}
              </p>
            )}
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

/* ───────────── Página ───────────── */

type DetailTab = "info" | "agenda" | "permisos" | "comisiones"

export function EquipoProfesional() {
  // Equipo compartido con Especialidades / Agendas / Permisos, separado por empresa.
  const { miembros: members, setMiembros: setMembers, especialidades: especialidadesClinica, ausencias } = useEquipo()
  const { turnos } = storeAgenda.usar()
  const [vista, setVista] = useState<VistaEquipo>("integrantes")
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<FilterKey>("todos")
  const [selected, setSelected] = useState<TeamMember | null>(null)
  const [detailTab, setDetailTab] = useState<DetailTab>("info")

  const [addOpen, setAddOpen] = useState(false)

  const [editingMember, setEditingMember] = useState<TeamMember | null>(null)

  const [confirmDeactivate, setConfirmDeactivate] =
    useState<TeamMember | null>(null)

  const [toast, setToast] = useState<string | null>(null)

  const [draft, setDraft] = useState<TeamMember>(emptyMember())

  const [commissionOpen, setCommissionOpen] = useState(false)
  const [commissionService, setCommissionService] = useState("")
  const [commissionPercentage, setCommissionPercentage] = useState("")

  function showToast(msg: string) {
    setToast(msg)

    setTimeout(() => setToast(null), 2600)
  }

  const filtered = useMemo(() => {
    return members.filter((m) => {
      const matchesSearch =
        !search ||
        fullName(m).toLowerCase().includes(search.toLowerCase()) ||
        (m.licenseNumber ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (m.specialties ?? []).some((s) =>
          s.toLowerCase().includes(search.toLowerCase())
        )

      const matchesFilter =
        filter === "todos" ||
        (filter === "activos" && m.status === "activo") ||
        (filter === "inactivos" && m.status === "inactivo") ||
        filter === m.role

      return matchesSearch && matchesFilter
    })
  }, [members, search, filter])

  const hoyStr = hoyISO()
  const stats = {
    profesionales: members.filter((m) => m.role === "odontologo" && m.status !== "inactivo").length,
    asistentes: members.filter((m) => m.role === "asistente" && m.status === "activo").length,
    administracion: members.filter((m) => (m.role === "secretaria" || m.role === "administrador") && m.status !== "inactivo").length,
    trabajanHoy: members.filter((m) => m.status === "activo" && horarioDeHoy(m) && !ausenteHoy(ausencias, m.id)).length,
    fueraHoy: members.filter((m) => m.status === "activo" && ausenteHoy(ausencias, m.id)).length,
    turnosHoy: turnos.filter((t) => t.fecha === hoyStr && t.estado !== "Cancelada").length,
    atendidosHoy: turnos.filter((t) => t.fecha === hoyStr && t.estado === "Atendida").length,
    pendientesHoy: turnos.filter((t) => t.fecha === hoyStr && (t.estado === "Pendiente" || t.estado === "Confirmada")).length,
    pendientes: members.filter((m) => m.status === "pendiente").length,
  }

  function exportarEquipo() {
    const filas = [
      ["Nombre", "Rol", "Estado", "Especialidades", "Matrícula", "Correo", "Teléfono", "Días por semana"],
      ...members.map((m) => [fullName(m), ROLE_LABEL[m.role], STATUS_META[m.status].label, (m.specialties ?? []).join(" / "), m.licenseNumber ?? "", m.email, m.phone, String(m.schedule.filter((d) => d.active).length)]),
    ]
    const csv = filas.map((f) => f.map((c) => `"${c.replace(/"/g, '""')}"`).join(";")).join("\n")
    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }))
    const a = document.createElement("a")
    a.href = url
    a.download = `equipo-${hoyStr}.csv`
    a.click()
    URL.revokeObjectURL(url)
    showToast(`${members.length} integrantes exportados`)
  }

  function openDetail(m: TeamMember, tab: DetailTab = "info") {
    setSelected(m)
    setDetailTab(tab)
  }

  function openEdit(m: TeamMember) {
    setDraft({ ...m })
    setEditingMember(m)
    setAddOpen(true)
  }

  function toggleStatus(member: TeamMember) {
    setMembers((prev) =>
      prev.map((m) =>
        m.id === member.id
          ? { ...m, status: "inactivo" as MemberStatus }
          : m
      )
    )

    showToast(`${fullName(member)} fue desactivado/a`)
    setConfirmDeactivate(null)
    setSelected(null)
  }

  function activate(member: TeamMember) {
    setMembers((prev) =>
      prev.map((m) =>
        m.id === member.id
          ? { ...m, status: "activo" as MemberStatus }
          : m
      )
    )

    showToast(`${fullName(member)} fue activado/a`)
  }

  function saveDraft() {
    if (!draft.firstName || !draft.lastName || !draft.email) {
      showToast("Completá al menos nombre, apellido y email")
      return
    }

    // Nombres siempre con mayúscula inicial, sin importar cómo se escribieron.
    const normalizado = {
      ...draft,
      firstName: capitalizarNombre(draft.firstName),
      lastName: capitalizarNombre(draft.lastName),
    }

    if (editingMember) {
      setMembers((prev) =>
        prev.map((m) =>
          m.id === editingMember.id ? normalizado : m
        )
      )

      setSelected((prev) =>
        prev?.id === normalizado.id ? normalizado : prev
      )

      showToast(`${fullName(normalizado)} fue actualizado/a`)
    } else {
      setMembers((prev) => [...prev, normalizado])
      showToast(`${fullName(normalizado)} se agregó al equipo`)
    }

    setAddOpen(false)
    setEditingMember(null)
    setDraft(emptyMember())
  }

  function openCommission(member: TeamMember) {
    setSelected(member)
    setDetailTab("comisiones")
    setCommissionService("")
    setCommissionPercentage("")
    setCommissionOpen(true)
  }

  function saveCommission() {
    if (!selected) return

    if (!commissionService || !commissionPercentage) {
      showToast("Completá el servicio y el porcentaje")
      return
    }

    const percentage = Number(commissionPercentage)

    if (Number.isNaN(percentage) || percentage < 0 || percentage > 100) {
      showToast("Ingresá un porcentaje válido")
      return
    }

    const existing = selected.commissions ?? []

    const updatedCommissions = [
      ...existing.filter(
        (c) => c.service !== commissionService
      ),
      {
        service: commissionService,
        percentage,
      },
    ]

    const updatedMember = {
      ...selected,
      commissions: updatedCommissions,
    }

    setMembers((prev) =>
      prev.map((m) =>
        m.id === selected.id ? updatedMember : m
      )
    )

    setSelected(updatedMember)
    setCommissionOpen(false)

    showToast("Comisión configurada correctamente")
  }

  return (
    <div className="relative min-h-full overflow-hidden bg-[#faf9ff]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_5%,rgba(124,58,237,0.15),transparent_28%),radial-gradient(circle_at_92%_12%,rgba(56,189,248,0.10),transparent_27%),linear-gradient(135deg,#f8f6ff_0%,#f3effd_48%,#faf8ff_100%)]"
      />
    <div className="relative mx-auto w-full max-w-[1420px] px-4 py-6 md:px-6 lg:px-8">
      {/* Encabezado */}
      <section className="relative overflow-hidden rounded-[30px] border border-primary/15 bg-gradient-to-br from-white via-white/96 to-primary/[0.045] shadow-[0_20px_55px_-38px_rgba(76,29,149,0.55)]">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-primary/55 via-primary to-sky-400/55" />
        <div className="pointer-events-none absolute -right-24 -top-28 size-72 rounded-full bg-primary/[0.055] blur-2xl" />
        <div className="relative p-5 md:p-7">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/10 bg-primary/[0.07] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
                  <Users className="size-3.5" />
                  Tu equipo
                </span>
                <span className="rounded-full border border-amber-200/70 bg-amber-50/80 px-3 py-1.5 text-[11px] font-bold text-amber-700">
                  {members.filter((m) => m.status === "activo").length} activos
                </span>
              </div>
              <h1 className="mt-4 text-[34px] font-bold tracking-[-0.035em] md:text-[42px]">Equipo profesional</h1>
              <p className="mt-2 max-w-2xl text-[13px] leading-6 text-muted-foreground md:text-sm">
                Profesionales y colaboradores de tu clínica: roles, especialidades, horarios, agenda del día, desempeño,
                ausencias y accesos.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <button onClick={exportarEquipo} className="btn-ce-outline">
                <Download className="size-4" />
                Exportar
              </button>
              <button
                onClick={() => {
                  setDraft(emptyMember())
                  setEditingMember(null)
                  setAddOpen(true)
                }}
                className="btn-ce"
              >
                <Plus className="size-4" />
                Agregar integrante
              </button>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Profesionales" value={stats.profesionales} hint={`${stats.asistentes} asistentes · ${stats.administracion} administración`} icon={ToothIcon} />
            <StatCard label="Trabajando hoy" value={stats.trabajanHoy} hint={stats.fueraHoy ? `${stats.fueraHoy} de licencia o ausente` : "Nadie ausente hoy"} icon={Clock} />
            <StatCard label="Turnos de hoy" value={stats.turnosHoy} hint={`${stats.atendidosHoy} atendidos · ${stats.pendientesHoy} por atender`} icon={CalendarDays} />
            <StatCard label="Invitaciones" value={stats.pendientes} hint={stats.pendientes ? "Pendientes de aceptar" : "Todas aceptadas"} icon={Mail} />
          </div>

          <nav className="mt-4 flex flex-wrap gap-1.5 rounded-2xl border border-primary/10 bg-primary/[0.025] p-1.5" aria-label="Vistas del equipo">
            {VISTAS.map((v) => (
              <button
                key={v.id}
                onClick={() => setVista(v.id)}
                aria-pressed={vista === v.id}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                  vista === v.id ? "bg-primary text-primary-foreground shadow-[0_8px_18px_-10px_rgba(124,58,237,0.8)]" : "text-muted-foreground hover:bg-white hover:text-foreground"
                }`}
              >
                <v.icon className="size-3.5" />
                {v.label}
                {v.id === "invitaciones" && stats.pendientes > 0 && (
                  <span className={`grid min-w-4 place-items-center rounded-full px-1 text-[10px] ${vista === v.id ? "bg-white/25" : "bg-primary text-primary-foreground"}`}>{stats.pendientes}</span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </section>

      <div className="mt-5">
        {vista === "desempeno" && <DesempenoEquipo />}
        {vista === "ausencias" && <AusenciasEquipo onToast={showToast} />}
        {vista === "invitaciones" && <InvitacionesEquipo onToast={showToast} />}
        {vista === "integrantes" && (
          <div className="space-y-3">
            <div className="card-grad flex flex-col gap-2.5 p-2.5 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary/60" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nombre, especialidad o matrícula"
                  className={`${INPUT_SM} pl-9`}
                />
              </div>
              <div className="inline-flex flex-wrap gap-1 rounded-full bg-primary/[0.06] p-0.5">
                {FILTROS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id)}
                    aria-pressed={filter === f.id}
                    className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                      filter === f.id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {filtered.length === 0 ? (
              <p className="card-grad py-10 text-center text-sm text-muted-foreground">No se encontraron integrantes con ese filtro.</p>
            ) : (
              <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-3">
                {filtered.map((m) => {
                  const role = ROLE_META[m.role]
                  const RoleIcon = role.icon
                  const hoyDia = horarioDeHoy(m)
                  const ausencia = ausenteHoy(ausencias, m.id)
                  const suyos = turnosDe(turnos, m)
                  const deHoy = suyos.filter((t) => t.fecha === hoyStr && t.estado !== "Cancelada").sort((a, b) => a.hora.localeCompare(b.hora))
                  const proximo = deHoy.find((t) => t.estado === "Pendiente" || t.estado === "Confirmada")
                  const ocupacion = hoyDia ? Math.min(100, Math.round(((deHoy.length * 45) / minutosJornada(hoyDia)) * 100)) : 0
                  return (
                    <li
                      key={m.id}
                      className={`card-grad group flex cursor-pointer flex-col p-4 transition-all hover:-translate-y-0.5 ${m.status === "inactivo" ? "opacity-60" : ""}`}
                      onClick={() => openDetail(m)}
                    >
                      <div className="flex items-start gap-3">
                        <span className="relative">
                          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary to-violet-400 text-sm font-bold text-white shadow-[0_8px_18px_-8px_rgba(124,58,237,0.7)]">
                            {initials(m)}
                          </span>
                          <span className={`absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border-2 border-white ${ausencia ? "bg-amber-400" : STATUS_META[m.status].dot}`} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold">
                            {fullName(m) || m.email}
                            <StatusBadge status={m.status} />
                          </p>
                          <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ${role.chip}`}>
                              <RoleIcon className="size-3" />
                              {ROLE_LABEL[m.role]}
                            </span>
                            {m.licenseNumber && <span>{m.licenseNumber}</span>}
                          </p>
                          {!!m.specialties?.length && <p className="mt-1 truncate text-[11px] text-muted-foreground">{m.specialties.join(" · ")}</p>}
                        </div>
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          {m.phone && (
                            <a href={`tel:${m.phone.replace(/[^\d+]/g, "")}`} className="grid size-8 place-items-center rounded-full border border-primary/12 bg-white text-muted-foreground hover:bg-primary/10 hover:text-primary" aria-label="Llamar" title={m.phone}>
                              <Phone className="size-3.5" />
                            </a>
                          )}
                          {m.email && (
                            <a href={`mailto:${m.email}`} className="grid size-8 place-items-center rounded-full border border-primary/12 bg-white text-muted-foreground hover:bg-primary/10 hover:text-primary" aria-label="Enviar correo" title={m.email}>
                              <Mail className="size-3.5" />
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
                        <div className="rounded-xl bg-white/80 px-1 py-1.5">
                          <p className="text-[10px] text-muted-foreground">Hoy</p>
                          <p className="text-xs font-bold">{ausencia ? ausencia.tipo : hoyDia ? `${hoyDia.start}–${hoyDia.end}` : "No trabaja"}</p>
                        </div>
                        <div className="rounded-xl bg-white/80 px-1 py-1.5">
                          <p className="text-[10px] text-muted-foreground">Turnos hoy</p>
                          <p className="text-xs font-bold">{m.role === "odontologo" ? deHoy.length : "—"}</p>
                        </div>
                        <div className="rounded-xl bg-white/80 px-1 py-1.5">
                          <p className="text-[10px] text-muted-foreground">Días / semana</p>
                          <p className="text-xs font-bold">{m.schedule.filter((d) => d.active).length}</p>
                        </div>
                      </div>

                      {m.role === "odontologo" && hoyDia && !ausencia && (
                        <div className="mt-2.5">
                          <div className="flex justify-between text-[10.5px]">
                            <span className="text-muted-foreground">{proximo ? `Próximo: ${proximo.hora} ${proximo.paciente}` : deHoy.length ? "Sin más turnos hoy" : "Agenda libre hoy"}</span>
                            <span className="font-semibold">{ocupacion}% ocupada</span>
                          </div>
                          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-primary/10">
                            <div className="h-full rounded-full bg-gradient-to-r from-primary to-fuchsia-500" style={{ width: `${ocupacion}%` }} />
                          </div>
                        </div>
                      )}

                      <div className="min-h-3 flex-1" />
                      <div className="flex flex-wrap items-center justify-end gap-1.5 border-t border-primary/10 pt-2.5" onClick={(e) => e.stopPropagation()}>
                        <BotonAccion icon={Eye} label="Perfil" onClick={() => openDetail(m)} />
                        <BotonAccion icon={Pencil} label="Editar" onClick={() => openEdit(m)} />
                        <BotonAccion icon={CalendarDays} label="Horario" onClick={() => openDetail(m, "agenda")} />
                        <BotonAccion icon={ShieldCheck} label="Permisos" onClick={() => openDetail(m, "permisos")} />
                        {m.status === "inactivo" ? (
                          <BotonAccion icon={UserCheck} label="Activar" onClick={() => activate(m)} />
                        ) : (
                          <BotonAccion icon={UserX} label="Desactivar" danger onClick={() => setConfirmDeactivate(m)} />
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Perfil */}

      {selected && (
        <Modal
          title={fullName(selected)}
          subtitle={`${ROLE_LABEL[selected.role]}${
            selected.specialties?.length
              ? " · " + selected.specialties.join(", ")
              : ""
          }`}
          onClose={() => setSelected(null)}
          wide
        >
          <div className="mb-4 inline-flex rounded-full bg-muted/70 p-1">
            {(
              [
                ["info", "Info"],
                ["agenda", "Agenda"],
                ["permisos", "Permisos"],
                ["comisiones", "Comisiones"],
              ] as [DetailTab, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setDetailTab(id)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  detailTab === id
                    ? "bg-background shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {detailTab === "info" && (
            <div className="space-y-4">
              <div className="space-y-1 text-sm">
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="size-4" />
                  {selected.email}
                </p>

                <p className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="size-4" />
                  {selected.phone}
                </p>

                {selected.office && (
                  <p className="text-muted-foreground">
                    Consultorio: {selected.office}
                  </p>
                )}

                {selected.licenseNumber && (
                  <p className="text-muted-foreground">
                    Matrícula: {selected.licenseNumber}
                  </p>
                )}
              </div>

              {selected.role === "odontologo" && (
                <div className={ITEM}>
                  <p className="mb-2 text-sm font-semibold">
                    Especialidades
                  </p>

                  <div className="flex flex-wrap gap-1.5">
                    {(selected.specialties ?? []).map((s) => (
                      <span
                        key={s}
                        className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                      >
                        {s}
                      </span>
                    ))}
                  </div>

                  {!!selected.assistants?.length && (
                    <>
                      <p className="mb-1 mt-3 text-sm font-semibold">
                        Asistentes asociados
                      </p>

                      <div className="space-y-1 text-sm text-muted-foreground">
                        {selected.assistants.map((id) => {
                          const a = members.find((m) => m.id === id)

                          return a ? (
                            <p key={id}>• {fullName(a)}</p>
                          ) : null
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}

              {selected.role === "asistente" &&
                !!selected.assistantOf?.length && (
                  <div className={ITEM}>
                    <p className="mb-1 text-sm font-semibold">
                      Asiste a
                    </p>

                    <div className="space-y-1 text-sm text-muted-foreground">
                      {selected.assistantOf.map((id) => {
                        const d = members.find((m) => m.id === id)

                        return d ? (
                          <p key={id}>• {fullName(d)}</p>
                        ) : null
                      })}
                    </div>
                  </div>
                )}

              {selected.nextAppointment && (
                <div className="rounded-xl bg-primary/10 p-3 text-sm text-primary">
                  <p className="font-semibold">Próximo turno</p>

                  <p>{selected.nextAppointment}</p>

                  {selected.todayAppointments != null && (
                    <p className="mt-1 text-xs opacity-80">
                      {selected.todayAppointments} turnos hoy
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {detailTab === "agenda" && (
            <div className="space-y-2">
              {selected.schedule.map((d) => (
                <div
                  key={d.day}
                  className={`${ITEM} flex items-center justify-between`}
                >
                  <span className="text-sm font-medium">{d.day}</span>

                  {d.active ? (
                    <span className="text-sm text-muted-foreground">
                      {d.start} — {d.end}
                      {d.breakStart &&
                        ` (descanso ${d.breakStart}-${d.breakEnd})`}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground/60">
                      No disponible
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {detailTab === "permisos" && (
            <div className="space-y-2">
              {selected.permissions.map((p) => (
                <label
                  key={p.key}
                  className={`${ITEM} flex cursor-pointer items-center justify-between`}
                >
                  <span className="text-sm">{p.label}</span>

                  <input
                    type="checkbox"
                    checked={p.enabled}
                    onChange={(e) =>
                      setMembers((prev) =>
                        prev.map((m) =>
                          m.id === selected.id
                            ? {
                                ...m,
                                permissions: m.permissions.map((perm) =>
                                  perm.key === p.key
                                    ? {
                                        ...perm,
                                        enabled: e.target.checked,
                                      }
                                    : perm
                                ),
                              }
                            : m
                        )
                      )
                    }
                    className="size-4 accent-[var(--primary)]"
                  />
                </label>
              ))}
            </div>
          )}

          {detailTab === "comisiones" && (
            <div className="space-y-2">
              {selected.commissions?.length ? (
                selected.commissions.map((c) => (
                  <div
                    key={c.service}
                    className={`${ITEM} flex items-center justify-between`}
                  >
                    <span className="text-sm">{c.service}</span>

                    <span className="flex items-center gap-1 text-sm font-semibold text-primary">
                      <Percent className="size-3.5" />
                      {c.percentage}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Sin comisiones configuradas.
                </p>
              )}

              <BotonAccion
                icon={Settings2}
                label="Configurar comisión"
                onClick={() => openCommission(selected)}
              />
            </div>
          )}
        </Modal>
      )}

      {/* Confirmar desactivación */}

      {confirmDeactivate && (
        <Modal
          title="Desactivar integrante"
          onClose={() => setConfirmDeactivate(null)}
        >
          <p className="text-sm text-muted-foreground">
            ¿Seguro que querés desactivar a{" "}
            {fullName(confirmDeactivate)}? Ya no tendrá acceso al sistema.
          </p>

          <div className="mt-5 flex justify-end gap-3">
            <button
              onClick={() => setConfirmDeactivate(null)}
              className="rounded-xl border border-border bg-background px-5 py-2.5 text-sm font-medium shadow-sm hover:bg-muted"
            >
              Cancelar
            </button>

            <button
              onClick={() => toggleStatus(confirmDeactivate)}
              className="rounded-xl bg-destructive px-5 py-2.5 text-sm font-semibold text-destructive-foreground shadow-sm hover:opacity-90"
            >
              Desactivar
            </button>
          </div>
        </Modal>
      )}

      {/* Agregar / editar integrante */}

      {addOpen && (
        <Modal
          title={editingMember ? "Editar integrante" : "Agregar integrante"}
          subtitle={
            editingMember
              ? "Actualizá los datos del integrante del equipo."
              : "Completá los datos del nuevo miembro del equipo."
          }
          onClose={() => {
            setAddOpen(false)
            setEditingMember(null)
            setDraft(emptyMember())
          }}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Nombre">
                <input
                  value={draft.firstName}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      firstName: e.target.value,
                    })
                  }
                  className={INPUT}
                />
              </Field>

              <Field label="Apellido">
                <input
                  value={draft.lastName}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      lastName: e.target.value,
                    })
                  }
                  className={INPUT}
                />
              </Field>

              <Field label="Email">
                <input
                  value={draft.email}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      email: e.target.value,
                    })
                  }
                  className={INPUT}
                />
              </Field>

              <Field label="Teléfono">
                <input
                  value={draft.phone}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      phone: e.target.value,
                    })
                  }
                  className={INPUT}
                />
              </Field>
            </div>

            <Field label="Rol">
              <SelectField
                value={draft.role}
                onChange={(v) =>
                  setDraft({
                    ...draft,
                    role: v as TeamRole,
                    permissions: permsFor(v as TeamRole),
                  })
                }
                options={[
                  "odontologo",
                  "asistente",
                  "secretaria",
                  "administrador",
                ]}
              />
            </Field>

            {draft.role === "odontologo" && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Matrícula">
                  <input
                    value={draft.licenseNumber}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        licenseNumber: e.target.value,
                      })
                    }
                    className={INPUT}
                  />
                </Field>

                <Field label="Consultorio">
                  <input
                    value={draft.office}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        office: e.target.value,
                      })
                    }
                    className={INPUT}
                  />
                </Field>

                <div className="sm:col-span-2">
                  <Field label="Especialidad">
                    <SelectField
                      value={draft.specialties?.[0] ?? ""}
                      onChange={(v) =>
                        setDraft({
                          ...draft,
                          specialties: [v],
                        })
                      }
                      options={especialidadesClinica}
                      placeholder="Elegir especialidad"
                    />
                  </Field>
                </div>
              </div>
            )}

            <Field label="Horario general (lunes a viernes)">
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={draft.schedule[0].start}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      schedule: draft.schedule.map((d) =>
                        d.active
                          ? {
                              ...d,
                              start: e.target.value,
                            }
                          : d
                      ),
                    })
                  }
                  className={INPUT}
                />

                <span className="text-muted-foreground">—</span>

                <input
                  type="time"
                  value={draft.schedule[0].end}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      schedule: draft.schedule.map((d) =>
                        d.active
                          ? {
                              ...d,
                              end: e.target.value,
                            }
                          : d
                      ),
                    })
                  }
                  className={INPUT}
                />
              </div>
            </Field>

            <div className={ITEM}>
              <p className="mb-2 text-sm font-semibold">
                Permisos según rol
              </p>

              <div className="space-y-2">
                {draft.permissions.map((p) => (
                  <label
                    key={p.key}
                    className="flex cursor-pointer items-center justify-between text-sm"
                  >
                    <span className="text-muted-foreground">
                      {p.label}
                    </span>

                    <input
                      type="checkbox"
                      checked={p.enabled}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          permissions: draft.permissions.map((perm) =>
                            perm.key === p.key
                              ? {
                                  ...perm,
                                  enabled: e.target.checked,
                                }
                              : perm
                          ),
                        })
                      }
                      className="size-4 accent-[var(--primary)]"
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setAddOpen(false)
                  setEditingMember(null)
                  setDraft(emptyMember())
                }}
                className="rounded-xl border border-border bg-background px-5 py-2.5 text-sm font-medium shadow-sm hover:bg-muted"
              >
                Cancelar
              </button>

              <button
                onClick={saveDraft}
                className="btn-ce"
              >
                {editingMember
                  ? "Guardar cambios"
                  : "Guardar integrante"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Configurar comisión */}

      {commissionOpen && selected && (
        <Modal
          title="Configurar comisión"
          subtitle={`Configurá la comisión para ${fullName(selected)}.`}
          onClose={() => setCommissionOpen(false)}
        >
          <div className="space-y-4">
            <Field label="Servicio">
              <input
                value={commissionService}
                onChange={(e) =>
                  setCommissionService(e.target.value)
                }
                placeholder="Ej. Consultas"
                className={INPUT}
              />
            </Field>

            <Field label="Porcentaje">
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={commissionPercentage}
                  onChange={(e) =>
                    setCommissionPercentage(e.target.value)
                  }
                  placeholder="Ej. 20"
                  className={`${INPUT} pr-10`}
                />

                <Percent className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              </div>
            </Field>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setCommissionOpen(false)}
                className="rounded-xl border border-border bg-background px-5 py-2.5 text-sm font-medium shadow-sm hover:bg-muted"
              >
                Cancelar
              </button>

              <button
                onClick={saveCommission}
                className="btn-ce"
              >
                Guardar comisión
              </button>
            </div>
          </div>
        </Modal>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-foreground px-4 py-2 text-xs font-medium text-background shadow-xl" role="status">
          {toast}
        </div>
      )}
    </div>
    </div>
  )
}