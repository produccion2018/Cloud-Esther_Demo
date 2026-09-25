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
} from "lucide-react"

import {
  TEAM_MEMBERS,
  ESPECIALIDADES,
  emptyMember,
  permsFor,
  type TeamMember,
  type TeamRole,
  type MemberStatus,
} from "@/lib/cloud-esther/equipo-profesional-data"

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
  const [members, setMembers] = useState<TeamMember[]>(TEAM_MEMBERS)
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

  const stats = useMemo(() => {
    const profesionales = members.filter(
      (m) => m.role === "odontologo"
    ).length

    const asistentes = members.filter(
      (m) => m.role === "asistente" && m.status === "activo"
    ).length

    const administracion = members.filter(
      (m) => m.role === "secretaria" || m.role === "administrador"
    ).length

    const activosHoy = members.filter(
      (m) =>
        m.status === "activo" &&
        m.schedule.some((d) => d.active)
    ).length

    return {
      profesionales,
      asistentes,
      administracion,
      activosHoy,
    }
  }, [members])

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

    if (editingMember) {
      setMembers((prev) =>
        prev.map((m) =>
          m.id === editingMember.id ? draft : m
        )
      )

      setSelected((prev) =>
        prev?.id === draft.id ? draft : prev
      )

      showToast(`${fullName(draft)} fue actualizado/a`)
    } else {
      setMembers((prev) => [...prev, draft])
      showToast(`${fullName(draft)} se agregó al equipo`)
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
    <div className="relative mx-auto w-full max-w-[1400px] px-4 py-5 md:px-6 lg:px-8">

      {/* Encabezado */}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">
            Equipo profesional
          </h1>

          <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Gestioná los profesionales y colaboradores de tu clínica, sus roles,
            especialidades, horarios, agendas y permisos.
          </p>
        </div>

        <button
          onClick={() => {
            setDraft(emptyMember())
            setEditingMember(null)
            setAddOpen(true)
          }}
          className="flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
        >
          <Plus className="size-4" />
          Agregar integrante
        </button>
      </div>

      {/* Resumen */}

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Profesionales"
          value={stats.profesionales}
          hint="Odontólogos y especialistas"
          icon={ToothIcon}
        />

        <StatCard
          label="Asistentes"
          value={stats.asistentes}
          hint="Activos"
          icon={Users}
        />

        <StatCard
          label="Administración"
          value={stats.administracion}
          hint="Secretarias y admins"
          icon={ClipboardList}
        />

        <StatCard
          label="Activos hoy"
          value={stats.activosHoy}
          hint="Con jornada configurada"
          icon={Clock}
        />
      </div>

      {/* Buscador y filtros */}

      <div className={`${CARD} mt-3`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o especialidad..."
              className={`${INPUT_SM} pl-9`}
            />
          </div>

          <div className="inline-flex flex-wrap gap-1 rounded-full bg-muted/70 p-1 backdrop-blur-sm">
            {FILTROS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  filter === f.id
                    ? "bg-background shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Listado */}

      <div className={`${CARD} mt-3`}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <IconTile icon={Users} />

            <h2 className="text-base font-semibold tracking-tight">
              Integrantes del equipo
            </h2>
          </div>

          <span className="text-xs text-muted-foreground">
            {filtered.length} resultado(s)
          </span>
        </div>

        {filtered.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
            No se encontraron integrantes con ese filtro.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {filtered.map((m) => {
              const role = ROLE_META[m.role]
              const RoleIcon = role.icon

              return (
                <li
                  key={m.id}
                  className={`${ITEM} flex cursor-pointer flex-wrap items-center gap-3`}
                  onClick={() => openDetail(m)}
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-primary/60 text-sm font-bold text-primary-foreground shadow-sm">
                    {initials(m)}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold">
                        {fullName(m)}
                      </p>

                      <StatusBadge status={m.status} />
                    </div>

                    <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${role.chip}`}
                      >
                        <RoleIcon className="size-3" />
                        {ROLE_LABEL[m.role]}
                      </span>

                      {m.specialties?.length ? (
                        <span>{m.specialties.join(", ")}</span>
                      ) : null}

                      {m.licenseNumber ? (
                        <span>{m.licenseNumber}</span>
                      ) : null}

                      {m.schedule.some((d) => d.active) && (
                        <span>
                          {m.schedule.find((d) => d.active)?.start}–
                          {m.schedule.find((d) => d.active)?.end}
                        </span>
                      )}
                    </p>
                  </div>

                  <div
                    className="flex flex-wrap justify-end gap-1.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <BotonAccion
                      icon={Eye}
                      label="Ver perfil"
                      onClick={() => openDetail(m)}
                    />

                    <BotonAccion
                      icon={Pencil}
                      label="Editar"
                      onClick={() => openEdit(m)}
                    />

                    <BotonAccion
                      icon={CalendarDays}
                      label="Agenda"
                      onClick={() => openDetail(m, "agenda")}
                    />

                    <BotonAccion
                      icon={ShieldCheck}
                      label="Permisos"
                      onClick={() => openDetail(m, "permisos")}
                    />

                    {m.status === "inactivo" ? (
                      <BotonAccion
                        icon={UserCheck}
                        label="Activar"
                        onClick={() => activate(m)}
                      />
                    ) : (
                      <BotonAccion
                        icon={UserX}
                        label="Desactivar"
                        danger
                        onClick={() => setConfirmDeactivate(m)}
                      />
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
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
                      options={ESPECIALIDADES}
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
                className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90"
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
                className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90"
              >
                Guardar comisión
              </button>
            </div>
          </div>
        </Modal>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}