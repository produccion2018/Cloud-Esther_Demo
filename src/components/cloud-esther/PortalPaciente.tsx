import { useState } from "react";
import {
  CalendarDays,
  CalendarPlus,
  Check,
  ChevronRight,
  ClipboardList,
  Clock,
  CreditCard,
  Download,
  FileText,
  Home,
  LogOut,
  MapPin,
  MessageCircle,
  Phone,
  Pill,
  Wallet,
  X,
} from "lucide-react";

/* ─────────────────────────────────────────────
   Tipos
───────────────────────────────────────────── */

type Seccion =
  | "inicio"
  | "turnos"
  | "tratamientos"
  | "documentos"
  | "pagos";

type EstadoCita =
  | "Confirmada"
  | "Pendiente"
  | "Cancelada"
  | "Realizada";

type TipoDoc = "Receta" | "Estudio" | "Presupuesto";

type Cita = {
  id: number;
  fecha: string;
  hora: string;
  profesional: string;
  especialidad: string;
  motivo: string;
  estado: EstadoCita;
  direccion: string;
};

type Tratamiento = {
  id: number;
  nombre: string;
  profesional: string;
  pieza?: string;
  estado: "Planificado" | "En curso" | "Finalizado";
  progreso: number;
  descripcion: string;
};

type Documento = {
  id: number;
  tipo: TipoDoc;
  titulo: string;
  fecha: string;
  descripcion: string;
};

type Pago = {
  id: number;
  fecha: string;
  concepto: string;
  monto: number;
  estado: "Pagado" | "Pendiente";
};

/* ─────────────────────────────────────────────
   Datos demo
───────────────────────────────────────────── */

const PACIENTE = {
  nombre: "María González",
  corto: "María",
};

const CITAS_INICIALES: Cita[] = [
  {
    id: 1,
    fecha: "2026-09-25",
    hora: "15:30",
    profesional: "Dra. Lucía Ferrer",
    especialidad: "Odontología general",
    motivo: "Control y restauración",
    estado: "Confirmada",
    direccion: "Clínica Centro · Av. Corrientes 1250",
  },
  {
    id: 2,
    fecha: "2026-10-02",
    hora: "10:00",
    profesional: "Dra. Lucía Ferrer",
    especialidad: "Odontología general",
    motivo: "Control de tratamiento",
    estado: "Pendiente",
    direccion: "Clínica Centro · Av. Corrientes 1250",
  },
  {
    id: 3,
    fecha: "2026-08-28",
    hora: "15:00",
    profesional: "Dr. Carlos Rodríguez",
    especialidad: "Odontología general",
    motivo: "Restauración pieza 21",
    estado: "Realizada",
    direccion: "Clínica Centro · Av. Corrientes 1250",
  },
  {
    id: 4,
    fecha: "2026-08-12",
    hora: "11:00",
    profesional: "Dra. Lucía Ferrer",
    especialidad: "Odontología general",
    motivo: "Limpieza dental",
    estado: "Realizada",
    direccion: "Clínica Centro · Av. Corrientes 1250",
  },
];

const TRATAMIENTOS_INICIALES: Tratamiento[] = [
  {
    id: 1,
    nombre: "Restauración estética",
    profesional: "Dr. Carlos Rodríguez",
    pieza: "21",
    estado: "En curso",
    progreso: 65,
    descripcion:
      "Tratamiento de restauración estética de la pieza dental 21.",
  },
  {
    id: 2,
    nombre: "Limpieza y control",
    profesional: "Dra. Lucía Ferrer",
    estado: "Finalizado",
    progreso: 100,
    descripcion: "Limpieza profesional y control general.",
  },
];

const DOCUMENTOS_INICIALES: Documento[] = [
  {
    id: 1,
    tipo: "Receta",
    titulo: "Receta odontológica",
    fecha: "20/08/2026",
    descripcion: "Indicaciones posteriores al tratamiento.",
  },
  {
    id: 2,
    tipo: "Estudio",
    titulo: "Radiografía panorámica",
    fecha: "15/08/2026",
    descripcion: "Estudio radiográfico disponible.",
  },
  {
    id: 3,
    tipo: "Presupuesto",
    titulo: "Presupuesto tratamiento integral",
    fecha: "12/08/2026",
    descripcion: "Detalle del tratamiento propuesto.",
  },
  {
    id: 4,
    tipo: "Estudio",
    titulo: "Radiografía periapical",
    fecha: "08/08/2026",
    descripcion: "Estudio de pieza dental.",
  },
];

const PAGOS_INICIALES: Pago[] = [
  {
    id: 1,
    fecha: "20/08/2026",
    concepto: "Restauración estética",
    monto: 45000,
    estado: "Pagado",
  },
  {
    id: 2,
    fecha: "28/08/2026",
    concepto: "Control odontológico",
    monto: 18000,
    estado: "Pagado",
  },
  {
    id: 3,
    fecha: "25/09/2026",
    concepto: "Próxima sesión",
    monto: 35000,
    estado: "Pendiente",
  },
];

/* ─────────────────────────────────────────────
   Estilos
───────────────────────────────────────────── */

const BTN =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";

const BTN_PRIMARY =
  `${BTN} bg-primary text-primary-foreground shadow-sm hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-md`;

const BTN_SECONDARY =
  `${BTN} border border-border bg-background hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/5`;

const CARD =
  "rounded-2xl border border-border bg-card p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md md:p-5";

const INPUT =
  "h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20";

/* ─────────────────────────────────────────────
   Utilidades
───────────────────────────────────────────── */

function ars(valor: number) {
  return valor.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  });
}

function fechaCorta(valor: string) {
  const [ano, mes, dia] = valor.split("-");
  return `${dia}/${mes}/${ano}`;
}

function fechaLarga(valor: string) {
  const fecha = new Date(`${valor}T12:00:00`);

  return fecha.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function estadoStyle(estado: EstadoCita) {
  if (estado === "Confirmada") {
    return "bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20";
  }

  if (estado === "Pendiente") {
    return "bg-amber-500/10 text-amber-700 ring-1 ring-amber-500/20";
  }

  if (estado === "Realizada") {
    return "bg-primary/10 text-primary ring-1 ring-primary/20";
  }

  return "bg-muted text-muted-foreground ring-1 ring-border";
}

function documentoIcono(tipo: TipoDoc) {
  if (tipo === "Receta") return Pill;
  if (tipo === "Estudio") return FileText;
  return ClipboardList;
}

/* ─────────────────────────────────────────────
   Diente SVG
───────────────────────────────────────────── */

function DienteIcon({
  className = "size-7",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M10.1 4.8C7.2 4.8 5 7 5 9.9c0 2.4 1.1 3.9 1.7 5.9.7 2.3.7 5.8 2.1 7.7.7 1 2 1 2.6-.1.8-1.5.9-4 1.8-5.3.4-.6.8-.9 1.8-.9s1.4.3 1.8.9c.9 1.3 1 3.8 1.8 5.3.6 1.1 1.9 1.1 2.6.1 1.4-1.9 1.4-5.4 2.1-7.7.6-2 1.7-3.5 1.7-5.9 0-2.9-2.2-5.1-5.1-5.1-1.6 0-3.1.6-4.9 1.9-1.8-1.3-3.3-1.9-4.9-1.9Z"
        fill="currentColor"
        fillOpacity="0.14"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M12.2 8.2c1.1-.7 2.1-.9 3.8-.9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.7"
      />
    </svg>
  );
}

/* ─────────────────────────────────────────────
   Badge
───────────────────────────────────────────── */

function Badge({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${className}`}
    >
      {children}
    </span>
  );
}

/* ─────────────────────────────────────────────
   Encabezado
───────────────────────────────────────────── */

function Encabezado({
  titulo,
  descripcion,
}: {
  titulo: string;
  descripcion?: string;
}) {
  return (
    <div className="mb-5">
      <h2 className="text-xl font-bold tracking-tight">{titulo}</h2>
      {descripcion && (
        <p className="mt-1 text-sm text-muted-foreground">
          {descripcion}
        </p>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Cita
───────────────────────────────────────────── */

function CitaFila({
  cita,
  onCancelar,
}: {
  cita: Cita;
  onCancelar?: () => void;
}) {
  return (
    <div className={`${CARD} flex flex-col gap-4 sm:flex-row sm:items-center`}>
      <div className="flex shrink-0 items-center gap-3">
        <div className="grid size-14 place-items-center rounded-xl bg-primary/10 text-center text-primary">
          <span className="text-lg font-bold leading-none">
            {cita.hora}
          </span>
          <span className="text-[9px] font-medium uppercase">
            hs
          </span>
        </div>

        <div className="sm:hidden">
          <p className="text-sm font-semibold">
            {fechaCorta(cita.fecha)}
          </p>
          <Badge className={estadoStyle(cita.estado)}>
            {cita.estado}
          </Badge>
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-bold">{cita.motivo}</h3>

          <span className="hidden sm:inline-flex">
            <Badge className={estadoStyle(cita.estado)}>
              {cita.estado}
            </Badge>
          </span>
        </div>

        <p className="mt-1 text-sm text-muted-foreground">
          {cita.profesional} · {cita.especialidad}
        </p>

        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <CalendarDays className="size-3.5" />
            {fechaLarga(cita.fecha)}
          </span>

          <span className="flex items-center gap-1">
            <MapPin className="size-3.5" />
            {cita.direccion}
          </span>
        </div>
      </div>

      {onCancelar &&
        cita.estado !== "Cancelada" &&
        cita.estado !== "Realizada" && (
          <button
            type="button"
            onClick={onCancelar}
            className="self-start rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:border-destructive/30 hover:bg-destructive/5 hover:text-destructive sm:self-center"
          >
            Cancelar
          </button>
        )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Modal
───────────────────────────────────────────── */

function Modal({
  titulo,
  onClose,
  children,
}: {
  titulo: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-2xl md:p-6"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="text-lg font-bold">{titulo}</h2>

          <button
            type="button"
            onClick={onClose}
            className="grid size-9 place-items-center rounded-lg hover:bg-muted"
            aria-label="Cerrar"
          >
            <X className="size-4" />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Portal
───────────────────────────────────────────── */

export default function PortalPaciente() {
  const [seccion, setSeccion] = useState<Seccion>("inicio");

  const [citas, setCitas] =
    useState<Cita[]>(CITAS_INICIALES);

  const [pagos] =
    useState<Pago[]>(PAGOS_INICIALES);

  const [modal, setModal] = useState(false);

  const [mensaje, setMensaje] =
    useState<string | null>(null);

  const [form, setForm] = useState({
    fecha: "",
    hora: "",
    motivo: "",
    observaciones: "",
  });

  const proximas = citas
    .filter(
      (c) =>
        c.estado === "Confirmada" ||
        c.estado === "Pendiente",
    )
    .sort((a, b) =>
      `${a.fecha}${a.hora}`.localeCompare(
        `${b.fecha}${b.hora}`,
      ),
    );

  const historial = citas
    .filter(
      (c) =>
        c.estado === "Realizada" ||
        c.estado === "Cancelada",
    )
    .sort((a, b) =>
      `${b.fecha}${b.hora}`.localeCompare(
        `${a.fecha}${a.hora}`,
      ),
    );

  const proxima = proximas[0];

  const saldo = pagos
    .filter((p) => p.estado === "Pendiente")
    .reduce((total, p) => total + p.monto, 0);

  const avisar = (texto: string) => {
    setMensaje(texto);

    window.setTimeout(() => {
      setMensaje(null);
    }, 2600);
  };

  const ir = (destino: Seccion) => {
    setSeccion(destino);
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const cancelarCita = (id: number) => {
    setCitas((actuales) =>
      actuales.map((cita) =>
        cita.id === id
          ? { ...cita, estado: "Cancelada" }
          : cita,
      ),
    );

    avisar("Turno cancelado correctamente");
  };

  const solicitarTurno = (
    e: React.FormEvent<HTMLFormElement>,
  ) => {
    e.preventDefault();

    if (!form.fecha || !form.hora || !form.motivo) {
      avisar("Completá fecha, hora y motivo");
      return;
    }

    const nuevaCita: Cita = {
      id: Date.now(),
      fecha: form.fecha,
      hora: form.hora,
      profesional: "Dra. Lucía Ferrer",
      especialidad: "Odontología general",
      motivo: form.motivo,
      estado: "Pendiente",
      direccion:
        "Clínica Centro · Av. Corrientes 1250",
    };

    setCitas((actuales) => [
      ...actuales,
      nuevaCita,
    ]);

    setForm({
      fecha: "",
      hora: "",
      motivo: "",
      observaciones: "",
    });

    setModal(false);
    avisar("Solicitud de turno enviada");
  };

  const pagar = (pago: Pago) => {
    avisar(
      `Pago iniciado para ${pago.concepto}`,
    );
  };

  const nav = [
    {
      id: "inicio" as const,
      label: "Inicio",
      icon: Home,
    },
    {
      id: "turnos" as const,
      label: "Turnos",
      icon: CalendarDays,
    },
    {
      id: "tratamientos" as const,
      label: "Tratamientos",
      icon: ClipboardList,
    },
    {
      id: "documentos" as const,
      label: "Documentos",
      icon: FileText,
    },
    {
      id: "pagos" as const,
      label: "Pagos",
      icon: CreditCard,
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ─────────────────────────────────────
          Toast
      ───────────────────────────────────── */}

      {mensaje && (
        <div className="fixed left-1/2 top-4 z-[70] -translate-x-1/2">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold shadow-xl">
            <span className="grid size-6 place-items-center rounded-full bg-emerald-500/10 text-emerald-600">
              <Check className="size-3.5" />
            </span>
            {mensaje}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────
          Layout
      ───────────────────────────────────── */}

      <div className="flex min-h-screen">
        {/* Sidebar escritorio */}

        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-card/95 md:flex">
          <div className="border-b border-border p-5">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <DienteIcon className="size-7" />
              </span>

              <div>
                <p className="font-bold tracking-tight">
                  Cloud Esther
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Portal del paciente
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            <div className="mb-3 px-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Mi portal
              </p>
            </div>

            <nav className="space-y-1">
              {nav.map((item) => {
                const Icon = item.icon;
                const activo = seccion === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => ir(item.id)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${
                      activo
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-primary/5 hover:text-foreground"
                    }`}
                  >
                    <Icon className="size-4" />
                    {item.label}

                    {item.id === "turnos" &&
                      proximas.length > 0 && (
                        <span
                          className={`ml-auto rounded-full px-2 py-0.5 text-[10px] ${
                            activo
                              ? "bg-white/20"
                              : "bg-primary/10 text-primary"
                          }`}
                        >
                          {proximas.length}
                        </span>
                      )}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="border-t border-border p-3">
            <div className="mb-3 rounded-xl bg-primary/5 p-3">
              <p className="text-xs text-muted-foreground">
                Paciente
              </p>

              <p className="mt-1 text-sm font-bold">
                {PACIENTE.nombre}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                window.location.href = "/demo/agenda";
              }}
              className="flex w-full items-center gap-2 rounded-xl border border-border px-3 py-2.5 text-xs font-semibold transition-colors hover:bg-primary/5"
            >
              <LogOut className="size-4" />
              Volver a Cloud Esther
            </button>
          </div>
        </aside>

        {/* Contenido */}

        <div className="min-w-0 flex-1">
          {/* Header mobile */}

          <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur md:hidden">
            <div className="flex h-16 items-center justify-between px-4">
              <div className="flex items-center gap-2.5">
                <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
                  <DienteIcon className="size-6" />
                </span>

                <div>
                  <p className="text-sm font-bold">
                    Cloud Esther
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Portal del paciente
                  </p>
                </div>
              </div>

              <span className="grid size-9 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                MG
              </span>
            </div>
          </header>

          <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-5 sm:px-6 md:px-8 md:pb-10 md:pt-8">
            {/* ─────────────────────────────
                INICIO
            ───────────────────────────── */}

            {seccion === "inicio" && (
              <section>
                <div className="relative mb-6 overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/[0.14] via-card to-card p-5 shadow-sm md:p-7">
                  <div className="pointer-events-none absolute -right-16 -top-16 opacity-[0.08]">
                    <DienteIcon className="size-64" />
                  </div>

                  <div className="relative">
                    <p className="text-sm font-medium text-primary">
                      Bienvenida
                    </p>

                    <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">
                      Hola, {PACIENTE.corto}
                    </h1>

                    <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                      Desde acá podés consultar tus turnos,
                      tratamientos, documentos y pagos de
                      manera simple.
                    </p>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setModal(true)}
                        className={BTN_PRIMARY}
                      >
                        <CalendarPlus className="size-4" />
                        Solicitar turno
                      </button>

                      <button
                        type="button"
                        onClick={() => ir("documentos")}
                        className={BTN_SECONDARY}
                      >
                        <FileText className="size-4" />
                        Ver documentos
                      </button>
                    </div>
                  </div>
                </div>

                {/* Próximo turno + saldo */}

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(260px,1fr)]">
                  <div className={CARD}>
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold">
                          Próximo turno
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Tu próxima visita
                        </p>
                      </div>

                      <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
                        <CalendarDays className="size-4" />
                      </span>
                    </div>

                    {proxima ? (
                      <div className="rounded-xl border border-primary/15 bg-primary/[0.035] p-4">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                          <div className="flex items-center gap-3">
                            <div className="grid size-14 place-items-center rounded-xl bg-primary text-primary-foreground">
                              <span className="text-lg font-bold">
                                {proxima.hora}
                              </span>
                            </div>

                            <div>
                              <p className="text-sm font-bold capitalize">
                                {fechaLarga(
                                  proxima.fecha,
                                )}
                              </p>

                              <p className="mt-1 text-xs text-muted-foreground">
                                {proxima.profesional}
                              </p>
                            </div>
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold">
                              {proxima.motivo}
                            </p>

                            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="size-3.5" />
                              {proxima.direccion}
                            </p>
                          </div>

                          <Badge
                            className={estadoStyle(
                              proxima.estado,
                            )}
                          >
                            {proxima.estado}
                          </Badge>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-border p-6 text-center">
                        <CalendarDays className="mx-auto size-7 text-muted-foreground" />

                        <p className="mt-2 text-sm font-semibold">
                          No tenés próximos turnos
                        </p>

                        <button
                          type="button"
                          onClick={() => setModal(true)}
                          className="mt-3 text-xs font-bold text-primary"
                        >
                          Solicitar turno
                        </button>
                      </div>
                    )}
                  </div>

                  <div className={CARD}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-bold">
                          Cuenta
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Saldo pendiente
                        </p>
                      </div>

                      <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
                        <Wallet className="size-4" />
                      </span>
                    </div>

                    <p className="mt-5 text-2xl font-bold">
                      {ars(saldo)}
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground">
                      {saldo > 0
                        ? "Hay pagos pendientes."
                        : "No tenés saldo pendiente."}
                    </p>

                    <button
                      type="button"
                      onClick={() => ir("pagos")}
                      className="mt-5 flex items-center gap-1 text-xs font-bold text-primary"
                    >
                      Ver movimientos
                      <ChevronRight className="size-3.5" />
                    </button>
                  </div>
                </div>

                {/* Acciones rápidas */}

                <div className="mt-6">
                  <p className="mb-3 text-sm font-bold">
                    Accesos rápidos
                  </p>

                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    {[
                      {
                        titulo: "Turnos",
                        texto: "Consultar y solicitar",
                        icon: CalendarDays,
                        destino: "turnos" as const,
                      },
                      {
                        titulo: "Tratamientos",
                        texto: "Ver evolución",
                        icon: ClipboardList,
                        destino: "tratamientos" as const,
                      },
                      {
                        titulo: "Documentos",
                        texto: "Recetas y estudios",
                        icon: FileText,
                        destino: "documentos" as const,
                      },
                      {
                        titulo: "Pagos",
                        texto: "Consultar cuenta",
                        icon: CreditCard,
                        destino: "pagos" as const,
                      },
                    ].map((item) => {
                      const Icon = item.icon;

                      return (
                        <button
                          key={item.titulo}
                          type="button"
                          onClick={() =>
                            ir(item.destino)
                          }
                          className={`${CARD} group text-left`}
                        >
                          <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-105">
                            <Icon className="size-5" />
                          </span>

                          <p className="mt-4 text-sm font-bold">
                            {item.titulo}
                          </p>

                          <p className="mt-1 text-xs text-muted-foreground">
                            {item.texto}
                          </p>

                          <ChevronRight className="mt-3 size-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Tratamiento */}

                <div className="mt-6">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold">
                        Tratamiento actual
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Evolución de tu tratamiento
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        ir("tratamientos")
                      }
                      className="text-xs font-bold text-primary"
                    >
                      Ver todo
                    </button>
                  </div>

                  {TRATAMIENTOS_INICIALES.filter(
                    (t) => t.estado === "En curso",
                  ).map((t) => (
                    <div
                      key={t.id}
                      className={CARD}
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                          <DienteIcon className="size-7" />
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-bold">
                              {t.nombre}
                            </p>

                            {t.pieza && (
                              <Badge className="bg-primary/10 text-primary">
                                Pieza {t.pieza}
                              </Badge>
                            )}
                          </div>

                          <p className="mt-1 text-xs text-muted-foreground">
                            {t.profesional}
                          </p>

                          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary transition-all"
                              style={{
                                width: `${t.progreso}%`,
                              }}
                            />
                          </div>

                          <p className="mt-1.5 text-[11px] text-muted-foreground">
                            {t.progreso}% completado
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ─────────────────────────────
                TURNOS
            ───────────────────────────── */}

            {seccion === "turnos" && (
              <section>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <Encabezado
                    titulo="Mis turnos"
                    descripcion="Consultá tus próximas visitas e historial."
                  />

                  <button
                    type="button"
                    onClick={() => setModal(true)}
                    className={`${BTN_PRIMARY} mb-5`}
                  >
                    <CalendarPlus className="size-4" />
                    Solicitar turno
                  </button>
                </div>

                <div>
                  <p className="mb-3 text-sm font-bold">
                    Próximos turnos
                  </p>

                  {proximas.length > 0 ? (
                    <div className="space-y-3">
                      {proximas.map((cita) => (
                        <CitaFila
                          key={cita.id}
                          cita={cita}
                          onCancelar={() =>
                            cancelarCita(
                              cita.id,
                            )
                          }
                        />
                      ))}
                    </div>
                  ) : (
                    <div className={`${CARD} text-center`}>
                      <CalendarDays className="mx-auto size-8 text-muted-foreground" />
                      <p className="mt-3 text-sm font-bold">
                        No tenés próximos turnos
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-8">
                  <p className="mb-3 text-sm font-bold">
                    Historial
                  </p>

                  {historial.length > 0 ? (
                    <div className="space-y-3">
                      {historial.map((cita) => (
                        <CitaFila
                          key={cita.id}
                          cita={cita}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className={`${CARD} text-center`}>
                      <p className="text-sm text-muted-foreground">
                        Todavía no hay historial.
                      </p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* ─────────────────────────────
                TRATAMIENTOS
            ───────────────────────────── */}

            {seccion === "tratamientos" && (
              <section>
                <Encabezado
                  titulo="Mis tratamientos"
                  descripcion="Consultá el estado y evolución de tus tratamientos odontológicos."
                />

                <div className="space-y-4">
                  {TRATAMIENTOS_INICIALES.map(
                    (tratamiento) => (
                      <div
                        key={tratamiento.id}
                        className={CARD}
                      >
                        <div className="flex gap-4">
                          <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                            <DienteIcon className="size-7" />
                          </span>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-sm font-bold">
                                {tratamiento.nombre}
                              </h3>

                              {tratamiento.pieza && (
                                <Badge className="bg-primary/10 text-primary">
                                  Pieza{" "}
                                  {tratamiento.pieza}
                                </Badge>
                              )}

                              <Badge
                                className={
                                  tratamiento.estado ===
                                  "Finalizado"
                                    ? "bg-emerald-500/10 text-emerald-700"
                                    : "bg-primary/10 text-primary"
                                }
                              >
                                {
                                  tratamiento.estado
                                }
                              </Badge>
                            </div>

                            <p className="mt-1 text-xs text-muted-foreground">
                              {
                                tratamiento.profesional
                              }
                            </p>

                            <p className="mt-3 text-sm leading-6 text-muted-foreground">
                              {
                                tratamiento.descripcion
                              }
                            </p>

                            <div className="mt-4">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-semibold">
                                  Progreso
                                </span>

                                <span className="text-muted-foreground">
                                  {
                                    tratamiento.progreso
                                  }%
                                </span>
                              </div>

                              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                                <div
                                  className={`h-full rounded-full ${
                                    tratamiento.estado ===
                                    "Finalizado"
                                      ? "bg-emerald-500"
                                      : "bg-primary"
                                  }`}
                                  style={{
                                    width: `${tratamiento.progreso}%`,
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </section>
            )}

            {/* ─────────────────────────────
                DOCUMENTOS
            ───────────────────────────── */}

            {seccion === "documentos" && (
              <section>
                <Encabezado
                  titulo="Mis documentos"
                  descripcion="Recetas, estudios y presupuestos disponibles."
                />

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {DOCUMENTOS_INICIALES.map(
                    (documento) => {
                      const Icon =
                        documentoIcono(
                          documento.tipo,
                        );

                      return (
                        <div
                          key={documento.id}
                          className={`${CARD} group`}
                        >
                          <div className="flex gap-3">
                            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                              <Icon className="size-5" />
                            </span>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge className="bg-primary/10 text-primary">
                                  {
                                    documento.tipo
                                  }
                                </Badge>

                                <span className="text-[11px] text-muted-foreground">
                                  {
                                    documento.fecha
                                  }
                                </span>
                              </div>

                              <h3 className="mt-2 text-sm font-bold">
                                {
                                  documento.titulo
                                }
                              </h3>

                              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                {
                                  documento.descripcion
                                }
                              </p>

                              <button
                                type="button"
                                onClick={() =>
                                  avisar(
                                    `Abriendo ${documento.titulo}`,
                                  )
                                }
                                className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-primary"
                              >
                                <Download className="size-3.5" />
                                Ver documento
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>
              </section>
            )}

            {/* ─────────────────────────────
                PAGOS
            ───────────────────────────── */}

            {seccion === "pagos" && (
              <section>
                <Encabezado
                  titulo="Pagos y cuenta"
                  descripcion="Consultá tus pagos, movimientos y saldo pendiente."
                />

                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className={CARD}>
                    <p className="text-xs font-semibold text-muted-foreground">
                      Saldo pendiente
                    </p>

                    <p className="mt-2 text-2xl font-bold">
                      {ars(saldo)}
                    </p>
                  </div>

                  <div className={CARD}>
                    <p className="text-xs font-semibold text-muted-foreground">
                      Pagos realizados
                    </p>

                    <p className="mt-2 text-2xl font-bold">
                      {ars(
                        pagos
                          .filter(
                            (p) =>
                              p.estado ===
                              "Pagado",
                          )
                          .reduce(
                            (total, p) =>
                              total + p.monto,
                            0,
                          ),
                      )}
                    </p>
                  </div>

                  <div className={CARD}>
                    <p className="text-xs font-semibold text-muted-foreground">
                      Movimientos
                    </p>

                    <p className="mt-2 text-2xl font-bold">
                      {pagos.length}
                    </p>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  {pagos.map((pago) => (
                    <div
                      key={pago.id}
                      className={CARD}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                          <CreditCard className="size-5" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-bold">
                              {pago.concepto}
                            </p>

                            <Badge
                              className={
                                pago.estado ===
                                "Pagado"
                                  ? "bg-emerald-500/10 text-emerald-700"
                                  : "bg-amber-500/10 text-amber-700"
                              }
                            >
                              {pago.estado}
                            </Badge>
                          </div>

                          <p className="mt-1 text-xs text-muted-foreground">
                            {pago.fecha}
                          </p>
                        </div>

                        <div className="flex items-center justify-between gap-4 sm:justify-end">
                          <p className="text-base font-bold">
                            {ars(pago.monto)}
                          </p>

                          {pago.estado ===
                            "Pendiente" && (
                            <button
                              type="button"
                              onClick={() =>
                                pagar(pago)
                              }
                              className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90"
                            >
                              Pagar
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </main>

          {/* Botón flotante de contacto */}

          <button
            type="button"
            onClick={() =>
              avisar(
                "El contacto con la clínica estará disponible próximamente",
              )
            }
            className="fixed bottom-20 right-4 z-30 grid size-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:scale-105 hover:shadow-xl md:bottom-6 md:right-6"
            aria-label="Contactar a la clínica"
          >
            <MessageCircle className="size-5" />
          </button>

          {/* Navegación móvil */}

          <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
            <div className="mx-auto flex max-w-lg items-center justify-around py-1.5">
              {nav.map((item) => {
                const Icon = item.icon;
                const activo = seccion === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => ir(item.id)}
                    className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-semibold transition-colors ${
                      activo
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground"
                    }`}
                  >
                    <Icon className="size-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>
        </div>
      </div>

      {/* ─────────────────────────────────────
          Modal solicitar turno
      ───────────────────────────────────── */}

      {modal && (
        <Modal
          titulo="Solicitar un turno"
          onClose={() => setModal(false)}
        >
          <form
            onSubmit={solicitarTurno}
            className="space-y-4"
          >
            <div>
              <label className="mb-1.5 block text-sm font-semibold">
                Fecha
              </label>

              <input
                required
                type="date"
                value={form.fecha}
                onChange={(e) =>
                  setForm((actual) => ({
                    ...actual,
                    fecha: e.target.value,
                  }))
                }
                className={INPUT}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold">
                Hora preferida
              </label>

              <input
                required
                type="time"
                value={form.hora}
                onChange={(e) =>
                  setForm((actual) => ({
                    ...actual,
                    hora: e.target.value,
                  }))
                }
                className={INPUT}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold">
                Motivo
              </label>

              <select
                required
                value={form.motivo}
                onChange={(e) =>
                  setForm((actual) => ({
                    ...actual,
                    motivo: e.target.value,
                  }))
                }
                className={`${INPUT} appearance-none`}
              >
                <option value="">
                  Seleccionar motivo
                </option>
                <option value="Control odontológico">
                  Control odontológico
                </option>
                <option value="Limpieza dental">
                  Limpieza dental
                </option>
                <option value="Dolor / urgencia">
                  Dolor / urgencia
                </option>
                <option value="Restauración">
                  Restauración
                </option>
                <option value="Consulta general">
                  Consulta general
                </option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold">
                Observaciones
              </label>

              <textarea
                rows={3}
                value={form.observaciones}
                onChange={(e) =>
                  setForm((actual) => ({
                    ...actual,
                    observaciones:
                      e.target.value,
                  }))
                }
                className="w-full resize-y rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="Podés agregar alguna indicación..."
              />
            </div>

            <div className="rounded-xl bg-primary/5 p-3">
              <div className="flex gap-2">
                <Clock className="mt-0.5 size-4 shrink-0 text-primary" />

                <p className="text-xs leading-5 text-muted-foreground">
                  La solicitud queda pendiente de
                  confirmación por parte de la clínica.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModal(false)}
                className={BTN_SECONDARY}
              >
                Cancelar
              </button>

              <button
                type="submit"
                className={BTN_PRIMARY}
              >
                <CalendarPlus className="size-4" />
                Solicitar turno
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}