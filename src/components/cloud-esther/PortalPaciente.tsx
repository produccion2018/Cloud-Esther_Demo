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
  Pill,
  Upload,
  Wallet,
  X,
} from "lucide-react";

type Seccion =
  | "inicio"
  | "turnos"
  | "tratamientos"
  | "documentos"
  | "documentacion"
  | "pagos";

type EstadoCita =
  | "Confirmada"
  | "Pendiente"
  | "Cancelada"
  | "Realizada";

type TipoDoc = "Receta" | "Estudio" | "Presupuesto";

type EstadoDocumentacion =
  | "Pendiente"
  | "Adjuntada"
  | "En revisión"
  | "Aprobada"
  | "Rechazada";

type Cita = {
  id: number;
  fecha: string;
  hora: string;
  profesional: string;
  especialidad: string;
  motivo: string;
  estado: EstadoCita;
  observaciones?: string;
};

type Tratamiento = {
  id: number;
  nombre: string;
  descripcion: string;
  progreso: number;
  estado: "En curso" | "Finalizado";
  profesional: string;
  ultimaSesion: string;
};

type Documento = {
  id: number;
  tipo: TipoDoc;
  titulo: string;
  descripcion: string;
  fecha: string;
};

type Pago = {
  id: number;
  concepto: string;
  fecha: string;
  monto: number;
  estado: "Pagado" | "Pendiente";
};

type DocumentacionSolicitadaItem = {
  id: number;
  titulo: string;
  descripcion: string;
  obligatorio: boolean;
  estado: EstadoDocumentacion;
  archivo?: string;
};

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
    motivo: "Control y seguimiento",
    estado: "Confirmada",
    observaciones: "Continuar con el tratamiento restaurador.",
  },
  {
    id: 2,
    fecha: "2026-10-02",
    hora: "10:00",
    profesional: "Dra. Lucía Ferrer",
    especialidad: "Odontología general",
    motivo: "Restauración estética",
    estado: "Pendiente",
  },
  {
    id: 3,
    fecha: "2026-08-21",
    hora: "11:30",
    profesional: "Dra. Lucía Ferrer",
    especialidad: "Odontología general",
    motivo: "Limpieza y control",
    estado: "Realizada",
  },
  {
    id: 4,
    fecha: "2026-08-07",
    hora: "16:00",
    profesional: "Dra. Lucía Ferrer",
    especialidad: "Odontología general",
    motivo: "Evaluación inicial",
    estado: "Realizada",
  },
];

const TRATAMIENTOS: Tratamiento[] = [
  {
    id: 1,
    nombre: "Restauración estética",
    descripcion:
      "Tratamiento restaurador para mejorar la función y estética dental.",
    progreso: 65,
    estado: "En curso",
    profesional: "Dra. Lucía Ferrer",
    ultimaSesion: "2026-09-12",
  },
  {
    id: 2,
    nombre: "Limpieza y control",
    descripcion:
      "Limpieza profesional y control general de salud bucal.",
    progreso: 100,
    estado: "Finalizado",
    profesional: "Dra. Lucía Ferrer",
    ultimaSesion: "2026-08-21",
  },
];

const DOCUMENTOS: Documento[] = [
  {
    id: 1,
    tipo: "Receta",
    titulo: "Receta odontológica",
    descripcion: "Indicaciones posteriores a la consulta.",
    fecha: "2026-09-12",
  },
  {
    id: 2,
    tipo: "Estudio",
    titulo: "Radiografía panorámica",
    descripcion: "Estudio radiográfico odontológico.",
    fecha: "2026-08-07",
  },
  {
    id: 3,
    tipo: "Presupuesto",
    titulo: "Presupuesto tratamiento restaurador",
    descripcion: "Detalle del tratamiento y valores asociados.",
    fecha: "2026-08-07",
  },
  {
    id: 4,
    tipo: "Estudio",
    titulo: "Radiografía periapical",
    descripcion: "Estudio solicitado durante el tratamiento.",
    fecha: "2026-09-12",
  },
];

const PAGOS_INICIALES: Pago[] = [
  {
    id: 1,
    concepto: "Restauración estética",
    fecha: "2026-09-12",
    monto: 45000,
    estado: "Pagado",
  },
  {
    id: 2,
    concepto: "Limpieza y control",
    fecha: "2026-08-21",
    monto: 18000,
    estado: "Pagado",
  },
  {
    id: 3,
    concepto: "Restauración estética - próxima sesión",
    fecha: "2026-10-02",
    monto: 35000,
    estado: "Pendiente",
  },
];

const DOCUMENTACION_INICIAL: DocumentacionSolicitadaItem[] = [
  {
    id: 1,
    titulo: "Documento de identidad",
    descripcion:
      "Adjuntá una imagen clara del frente y dorso de tu documento.",
    obligatorio: true,
    estado: "Pendiente",
  },
  {
    id: 2,
    titulo: "Estudio radiográfico",
    descripcion:
      "Adjuntá el estudio radiográfico solicitado por la profesional.",
    obligatorio: true,
    estado: "Pendiente",
  },
  {
    id: 3,
    titulo: "Orden médica",
    descripcion:
      "Adjuntá la orden médica correspondiente al tratamiento.",
    obligatorio: false,
    estado: "Pendiente",
  },
];

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

function ars(valor: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(valor);
}

function fechaCorta(fecha: string) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
  }).format(new Date(`${fecha}T12:00:00`));
}

function fechaLarga(fecha: string) {
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${fecha}T12:00:00`));
}

function estadoStyle(estado: EstadoCita) {
  switch (estado) {
    case "Confirmada":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "Pendiente":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "Cancelada":
      return "border-red-200 bg-red-50 text-red-700";
    case "Realizada":
      return "border-blue-200 bg-blue-50 text-blue-700";
  }
}

function documentacionEstadoStyle(estado: EstadoDocumentacion) {
  switch (estado) {
    case "Pendiente":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "Adjuntada":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "En revisión":
      return "border-violet-200 bg-violet-50 text-violet-700";
    case "Aprobada":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "Rechazada":
      return "border-red-200 bg-red-50 text-red-700";
  }
}

function documentoIcono(tipo: TipoDoc) {
  switch (tipo) {
    case "Receta":
      return <Pill className="h-5 w-5" />;
    case "Estudio":
      return <FileText className="h-5 w-5" />;
    case "Presupuesto":
      return <Wallet className="h-5 w-5" />;
  }
}

function DienteIcon({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M14.5 8.5C11.4 8.5 9 11 9 14.1c0 3.3 1.7 5.6 2.6 8.2 1.2 3.5 1.2 10.5 4.5 10.5 2.7 0 2.5-8.2 7.9-8.2s5.2 8.2 7.9 8.2c3.3 0 3.3-7 4.5-10.5.9-2.6 2.6-4.9 2.6-8.2 0-3.1-2.4-5.6-5.5-5.6-3.2 0-5.1 1.9-7.5 1.9s-4.3-1.9-7.5-1.9Z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Badge({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}
    >
      {children}
    </span>
  );
}

function Encabezado({
  eyebrow,
  titulo,
  descripcion,
}: {
  eyebrow: string;
  titulo: string;
  descripcion: string;
}) {
  return (
    <div className="mb-6">
      <p className="mb-1 text-sm font-semibold text-primary">{eyebrow}</p>
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
        {titulo}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">{descripcion}</p>
    </div>
  );
}

function CitaFila({
  cita,
  onCancelar,
}: {
  cita: Cita;
  onCancelar?: (id: number) => void;
}) {
  return (
    <div className={CARD}>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-primary/10 text-primary">
            <span className="text-xs font-semibold uppercase">
              {new Intl.DateTimeFormat("es-AR", {
                month: "short",
              })
                .format(new Date(`${cita.fecha}T12:00:00`))
                .replace(".", "")}
            </span>
            <span className="text-lg font-bold">
              {new Date(`${cita.fecha}T12:00:00`).getDate()}
            </span>
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold">{cita.motivo}</h3>
              <Badge className={estadoStyle(cita.estado)}>
                {cita.estado}
              </Badge>
            </div>

            <div className="mt-2 space-y-1 text-sm text-muted-foreground">
              <p className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {cita.hora} hs · {fechaLarga(cita.fecha)}
              </p>
              <p className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {cita.profesional} · {cita.especialidad}
              </p>
            </div>

            {cita.observaciones && (
              <p className="mt-3 rounded-xl bg-muted/50 p-3 text-sm text-muted-foreground">
                {cita.observaciones}
              </p>
            )}
          </div>
        </div>

        {onCancelar && cita.estado !== "Cancelada" && (
          <button
            type="button"
            className={`${BTN_SECONDARY} shrink-0 text-red-600 hover:border-red-200 hover:bg-red-50`}
            onClick={() => onCancelar(cita.id)}
          >
            <X className="h-4 w-4" />
            Cancelar
          </button>
        )}
      </div>
    </div>
  );
}

function Modal({
  abierto,
  titulo,
  onCerrar,
  children,
}: {
  abierto: boolean;
  titulo: string;
  onCerrar: () => void;
  children: React.ReactNode;
}) {
  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border p-5">
          <h2 className="text-lg font-bold">{titulo}</h2>
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function DocumentacionSolicitada({
  documentos,
  onAdjuntar,
}: {
  documentos: DocumentacionSolicitadaItem[];
  onAdjuntar: (id: number, archivo: string) => void;
}) {
  return (
    <section>
      <Encabezado
        eyebrow="DOCUMENTACIÓN"
        titulo="Documentación solicitada"
        descripcion="Completá y adjuntá la documentación que la clínica necesita."
      />

      <div className="mb-6 rounded-2xl border border-primary/20 bg-primary/5 p-4 md:p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FileText className="h-5 w-5" />
          </div>

          <div>
            <h2 className="font-semibold">Documentación pendiente</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Adjuntá los archivos solicitados para que el equipo pueda
              revisar tu documentación.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {documentos.map((documento) => (
          <div key={documento.id} className={CARD}>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex min-w-0 items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <FileText className="h-5 w-5" />
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{documento.titulo}</h3>

                    <Badge
                      className={documentacionEstadoStyle(documento.estado)}
                    >
                      {documento.estado}
                    </Badge>

                    {documento.obligatorio && (
                      <span className="text-xs font-medium text-muted-foreground">
                        Obligatorio
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-sm text-muted-foreground">
                    {documento.descripcion}
                  </p>

                  {documento.archivo && (
                    <p className="mt-2 flex items-center gap-2 text-xs font-medium text-primary">
                      <Check className="h-4 w-4" />
                      {documento.archivo}
                    </p>
                  )}
                </div>
              </div>

              <label className={`${BTN_SECONDARY} shrink-0 cursor-pointer`}>
                <Upload className="h-4 w-4" />
                {documento.estado === "Pendiente"
                  ? "Adjuntar archivo"
                  : "Cambiar archivo"}

                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(event) => {
                    const archivo = event.target.files?.[0];

                    if (!archivo) return;

                    onAdjuntar(documento.id, archivo.name);
                    event.target.value = "";
                  }}
                />
              </label>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function PortalPaciente() {
  const [seccion, setSeccion] = useState<Seccion>("inicio");

  const [citas, setCitas] = useState<Cita[]>(CITAS_INICIALES);
  const [pagos, setPagos] = useState<Pago[]>(PAGOS_INICIALES);

  const [documentacion, setDocumentacion] = useState<
    DocumentacionSolicitadaItem[]
  >(DOCUMENTACION_INICIAL);

  const [modal, setModal] = useState<
    "turno" | "pago" | null
  >(null);

  const [mensaje, setMensaje] = useState<string | null>(null);

  const [form, setForm] = useState({
    fecha: "",
    hora: "",
    motivo: "",
    observaciones: "",
  });

  const proximas = citas.filter(
    (cita) =>
      cita.estado === "Confirmada" || cita.estado === "Pendiente"
  );

  const historial = citas.filter(
    (cita) =>
      cita.estado === "Realizada" || cita.estado === "Cancelada"
  );

  const proxima = proximas[0];

  const saldo = pagos
    .filter((pago) => pago.estado === "Pendiente")
    .reduce((total, pago) => total + pago.monto, 0);

  function avisar(texto: string) {
    setMensaje(texto);

    window.setTimeout(() => {
      setMensaje(null);
    }, 3500);
  }

  function ir(nuevaSeccion: Seccion) {
    setSeccion(nuevaSeccion);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelarCita(id: number) {
    setCitas((actuales) =>
      actuales.map((cita) =>
        cita.id === id
          ? { ...cita, estado: "Cancelada" }
          : cita
      )
    );

    avisar("El turno fue cancelado correctamente.");
  }

  function solicitarTurno(event: React.FormEvent) {
    event.preventDefault();

    if (!form.fecha || !form.hora || !form.motivo) {
      avisar("Completá los campos obligatorios.");
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
      observaciones: form.observaciones || undefined,
    };

    setCitas((actuales) => [...actuales, nuevaCita]);

    setForm({
      fecha: "",
      hora: "",
      motivo: "",
      observaciones: "",
    });

    setModal(null);
    avisar("Tu solicitud de turno fue enviada.");
  }

  function pagar(id: number) {
    setPagos((actuales) =>
      actuales.map((pago) =>
        pago.id === id
          ? { ...pago, estado: "Pagado" }
          : pago
      )
    );

    setModal(null);
    avisar("El pago fue registrado correctamente.");
  }

  function adjuntarDocumentacion(id: number, archivo: string) {
    setDocumentacion((actuales) =>
      actuales.map((documento) =>
        documento.id === id
          ? {
              ...documento,
              estado: "Adjuntada",
              archivo,
            }
          : documento
      )
    );

    avisar("La documentación fue adjuntada correctamente.");
  }

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
      id: "documentacion" as const,
      label: "Documentación solicitada",
      icon: Upload,
    },
    {
      id: "pagos" as const,
      label: "Pagos",
      icon: CreditCard,
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        {/* SIDEBAR */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-border bg-card/95 md:flex md:flex-col">
          <div className="flex h-full flex-col p-4">
            <div className="mb-8 flex items-center gap-3 px-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                <DienteIcon className="h-6 w-6" />
              </div>

              <div>
                <p className="font-bold leading-tight">Cloud Esther</p>
                <p className="text-xs text-muted-foreground">
                  Portal del paciente
                </p>
              </div>
            </div>

            <div className="mb-3 px-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Mi portal
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
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-all ${
                      activo
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-primary/5 hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="mt-auto">
              <div className="mb-3 rounded-2xl border border-border bg-background p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    MG
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {PACIENTE.nombre}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Paciente
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className={`${BTN_SECONDARY} w-full`}
                onClick={() => avisar("Volviendo a Cloud Esther...")}
              >
                <LogOut className="h-4 w-4" />
                Volver a Cloud Esther
              </button>
            </div>
          </div>
        </aside>

        {/* CONTENIDO */}
        <div className="min-w-0 flex-1">
          {/* MOBILE HEADER */}
          <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur md:hidden">
            <div className="flex h-16 items-center justify-between px-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <DienteIcon className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-sm font-bold">Cloud Esther</p>
                  <p className="text-[10px] text-muted-foreground">
                    Portal del paciente
                  </p>
                </div>
              </div>

              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                MG
              </div>
            </div>
          </header>

          <main className="mx-auto w-full max-w-6xl px-4 py-6 pb-28 md:px-6 md:py-8 md:pb-10">
            {/* INICIO */}
            {seccion === "inicio" && (
              <section>
                <div className="mb-6 overflow-hidden rounded-3xl border border-border bg-card">
                  <div className="relative p-6 md:p-8">
                    <div className="relative z-10 max-w-2xl">
                      <p className="mb-2 text-sm font-semibold text-primary">
                        BIENVENIDA
                      </p>

                      <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                        Hola, {PACIENTE.corto}
                      </h1>

                      <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground md:text-base">
                        Desde tu portal podés gestionar tus turnos,
                        consultar tratamientos, ver documentación y
                        administrar tus pagos.
                      </p>

                      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                        <button
                          type="button"
                          className={BTN_PRIMARY}
                          onClick={() => setModal("turno")}
                        >
                          <CalendarPlus className="h-4 w-4" />
                          Solicitar turno
                        </button>

                        <button
                          type="button"
                          className={BTN_SECONDARY}
                          onClick={() => ir("documentos")}
                        >
                          <FileText className="h-4 w-4" />
                          Ver documentos
                        </button>
                      </div>
                    </div>

                    <div className="pointer-events-none absolute -right-10 -top-10 hidden h-56 w-56 rounded-full bg-primary/5 md:block" />
                    <div className="pointer-events-none absolute -bottom-20 right-24 hidden h-48 w-48 rounded-full bg-primary/5 md:block" />
                  </div>
                </div>

                {/* PRÓXIMA CITA / SALDO */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className={CARD}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Próximo turno
                        </p>

                        {proxima ? (
                          <>
                            <h2 className="mt-1 text-xl font-bold">
                              {fechaCorta(proxima.fecha)} · {proxima.hora}
                            </h2>

                            <p className="mt-1 text-sm text-muted-foreground">
                              {proxima.motivo}
                            </p>

                            <p className="mt-3 text-sm font-medium">
                              {proxima.profesional}
                            </p>
                          </>
                        ) : (
                          <h2 className="mt-1 text-xl font-bold">
                            No tenés turnos próximos
                          </h2>
                        )}
                      </div>

                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <CalendarDays className="h-5 w-5" />
                      </div>
                    </div>

                    <button
                      type="button"
                      className="mt-5 flex items-center gap-1 text-sm font-semibold text-primary"
                      onClick={() => ir("turnos")}
                    >
                      Ver mis turnos
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>

                  <div className={CARD}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Saldo pendiente
                        </p>

                        <h2 className="mt-1 text-xl font-bold">
                          {ars(saldo)}
                        </h2>

                        <p className="mt-1 text-sm text-muted-foreground">
                          {pagos.filter(
                            (pago) => pago.estado === "Pendiente"
                          ).length}{" "}
                          pago
                          {pagos.filter(
                            (pago) => pago.estado === "Pendiente"
                          ).length !== 1
                            ? "s"
                            : ""}{" "}
                          pendiente
                          {pagos.filter(
                            (pago) => pago.estado === "Pendiente"
                          ).length !== 1
                            ? "s"
                            : ""}
                        </p>
                      </div>

                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Wallet className="h-5 w-5" />
                      </div>
                    </div>

                    <button
                      type="button"
                      className="mt-5 flex items-center gap-1 text-sm font-semibold text-primary"
                      onClick={() => ir("pagos")}
                    >
                      Ver pagos
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* ACCESOS RÁPIDOS */}
                <div className="mt-8">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-bold">Accesos rápidos</h2>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
                    <button
                      type="button"
                      className={`${CARD} text-left`}
                      onClick={() => ir("turnos")}
                    >
                      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <CalendarDays className="h-5 w-5" />
                      </div>

                      <h3 className="font-semibold">Turnos</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Consultá y gestioná tus turnos.
                      </p>
                    </button>

                    <button
                      type="button"
                      className={`${CARD} text-left`}
                      onClick={() => ir("tratamientos")}
                    >
                      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <ClipboardList className="h-5 w-5" />
                      </div>

                      <h3 className="font-semibold">Tratamientos</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Consultá el avance de tus tratamientos.
                      </p>
                    </button>

                    <button
                      type="button"
                      className={`${CARD} text-left`}
                      onClick={() => ir("documentos")}
                    >
                      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <FileText className="h-5 w-5" />
                      </div>

                      <h3 className="font-semibold">Documentos</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Accedé a tus recetas y estudios.
                      </p>
                    </button>

                    <button
                      type="button"
                      className={`${CARD} text-left`}
                      onClick={() => ir("documentacion")}
                    >
                      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Upload className="h-5 w-5" />
                      </div>

                      <h3 className="font-semibold">
                        Documentación
                      </h3>

                      <p className="mt-1 text-sm text-muted-foreground">
                        Adjuntá documentación solicitada.
                      </p>
                    </button>

                    <button
                      type="button"
                      className={`${CARD} text-left`}
                      onClick={() => ir("pagos")}
                    >
                      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <CreditCard className="h-5 w-5" />
                      </div>

                      <h3 className="font-semibold">Pagos</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Consultá tus pagos y saldo.
                      </p>
                    </button>
                  </div>
                </div>

                {/* TRATAMIENTO ACTUAL */}
                <div className="mt-8">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-bold">
                      Tratamiento actual
                    </h2>

                    <button
                      type="button"
                      className="text-sm font-semibold text-primary"
                      onClick={() => ir("tratamientos")}
                    >
                      Ver todos
                    </button>
                  </div>

                  <div className={CARD}>
                    {TRATAMIENTOS.filter(
                      (tratamiento) =>
                        tratamiento.estado === "En curso"
                    ).map((tratamiento) => (
                      <div key={tratamiento.id}>
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div>
                            <h3 className="font-semibold">
                              {tratamiento.nombre}
                            </h3>

                            <p className="mt-1 text-sm text-muted-foreground">
                              {tratamiento.descripcion}
                            </p>
                          </div>

                          <Badge className="w-fit border-blue-200 bg-blue-50 text-blue-700">
                            {tratamiento.progreso}% completado
                          </Badge>
                        </div>

                        <div className="mt-5 h-2 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{
                              width: `${tratamiento.progreso}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* TURNOS */}
            {seccion === "turnos" && (
              <section>
                <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                  <Encabezado
                    eyebrow="MI AGENDA"
                    titulo="Mis turnos"
                    descripcion="Consultá tus próximos turnos y el historial de atención."
                  />

                  <button
                    type="button"
                    className={`${BTN_PRIMARY} shrink-0`}
                    onClick={() => setModal("turno")}
                  >
                    <CalendarPlus className="h-4 w-4" />
                    Solicitar turno
                  </button>
                </div>

                <div className="mb-8">
                  <div className="mb-4 flex items-center gap-2">
                    <h2 className="text-lg font-bold">
                      Próximos turnos
                    </h2>

                    <Badge className="border-primary/20 bg-primary/5 text-primary">
                      {proximas.length}
                    </Badge>
                  </div>

                  <div className="space-y-4">
                    {proximas.length > 0 ? (
                      proximas.map((cita) => (
                        <CitaFila
                          key={cita.id}
                          cita={cita}
                          onCancelar={cancelarCita}
                        />
                      ))
                    ) : (
                      <div className={`${CARD} text-center`}>
                        <CalendarDays className="mx-auto h-10 w-10 text-muted-foreground" />
                        <h3 className="mt-3 font-semibold">
                          No tenés turnos próximos
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Solicitá un nuevo turno para continuar.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="mb-4 flex items-center gap-2">
                    <h2 className="text-lg font-bold">
                      Historial
                    </h2>

                    <Badge className="border-border bg-muted text-muted-foreground">
                      {historial.length}
                    </Badge>
                  </div>

                  <div className="space-y-4">
                    {historial.map((cita) => (
                      <CitaFila key={cita.id} cita={cita} />
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* TRATAMIENTOS */}
            {seccion === "tratamientos" && (
              <section>
                <Encabezado
                  eyebrow="MI SALUD"
                  titulo="Tratamientos"
                  descripcion="Consultá el estado y avance de tus tratamientos."
                />

                <div className="grid gap-4 lg:grid-cols-2">
                  {TRATAMIENTOS.map((tratamiento) => (
                    <div key={tratamiento.id} className={CARD}>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-lg font-bold">
                              {tratamiento.nombre}
                            </h2>

                            <Badge
                              className={
                                tratamiento.estado === "Finalizado"
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                  : "border-blue-200 bg-blue-50 text-blue-700"
                              }
                            >
                              {tratamiento.estado}
                            </Badge>
                          </div>

                          <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            {tratamiento.descripcion}
                          </p>
                        </div>

                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <ClipboardList className="h-5 w-5" />
                        </div>
                      </div>

                      <div className="mt-6">
                        <div className="mb-2 flex items-center justify-between text-sm">
                          <span className="font-medium">
                            Progreso
                          </span>
                          <span className="font-semibold text-primary">
                            {tratamiento.progreso}%
                          </span>
                        </div>

                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{
                              width: `${tratamiento.progreso}%`,
                            }}
                          />
                        </div>
                      </div>

                      <div className="mt-5 grid gap-3 border-t border-border pt-4 sm:grid-cols-2">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">
                            Profesional
                          </p>
                          <p className="mt-1 text-sm font-semibold">
                            {tratamiento.profesional}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-medium text-muted-foreground">
                            Última sesión
                          </p>
                          <p className="mt-1 text-sm font-semibold">
                            {fechaCorta(tratamiento.ultimaSesion)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* DOCUMENTOS */}
            {seccion === "documentos" && (
              <section>
                <Encabezado
                  eyebrow="MI DOCUMENTACIÓN"
                  titulo="Documentos"
                  descripcion="Consultá las recetas, estudios y presupuestos disponibles."
                />

                <div className="grid gap-4 md:grid-cols-2">
                  {DOCUMENTOS.map((documento) => (
                    <div key={documento.id} className={CARD}>
                      <div className="flex items-start gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          {documentoIcono(documento.tipo)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className="border-primary/20 bg-primary/5 text-primary">
                              {documento.tipo}
                            </Badge>

                            <span className="text-xs text-muted-foreground">
                              {fechaCorta(documento.fecha)}
                            </span>
                          </div>

                          <h2 className="mt-2 font-semibold">
                            {documento.titulo}
                          </h2>

                          <p className="mt-1 text-sm text-muted-foreground">
                            {documento.descripcion}
                          </p>

                          <button
                            type="button"
                            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary"
                            onClick={() =>
                              avisar(
                                `Abriendo ${documento.titulo}...`
                              )
                            }
                          >
                            <Download className="h-4 w-4" />
                            Ver documento
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* DOCUMENTACIÓN SOLICITADA */}
            {seccion === "documentacion" && (
              <DocumentacionSolicitada
                documentos={documentacion}
                onAdjuntar={adjuntarDocumentacion}
              />
            )}

            {/* PAGOS */}
            {seccion === "pagos" && (
              <section>
                <Encabezado
                  eyebrow="CUENTA"
                  titulo="Pagos"
                  descripcion="Consultá tus pagos realizados y los importes pendientes."
                />

                <div className="mb-6 grid gap-4 md:grid-cols-3">
                  <div className={CARD}>
                    <p className="text-sm text-muted-foreground">
                      Saldo pendiente
                    </p>
                    <p className="mt-1 text-2xl font-bold">
                      {ars(saldo)}
                    </p>
                  </div>

                  <div className={CARD}>
                    <p className="text-sm text-muted-foreground">
                      Pagado
                    </p>

                    <p className="mt-1 text-2xl font-bold">
                      {ars(
                        pagos
                          .filter(
                            (pago) => pago.estado === "Pagado"
                          )
                          .reduce(
                            (total, pago) => total + pago.monto,
                            0
                          )
                      )}
                    </p>
                  </div>

                  <div className={CARD}>
                    <p className="text-sm text-muted-foreground">
                      Movimientos
                    </p>

                    <p className="mt-1 text-2xl font-bold">
                      {pagos.length}
                    </p>
                  </div>
                </div>

                <div className={CARD}>
                  <div className="mb-4">
                    <h2 className="text-lg font-bold">
                      Movimientos
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Historial de pagos de tu cuenta.
                    </p>
                  </div>

                  <div className="divide-y divide-border">
                    {pagos.map((pago) => (
                      <div
                        key={pago.id}
                        className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <CreditCard className="h-5 w-5" />
                          </div>

                          <div>
                            <p className="font-semibold">
                              {pago.concepto}
                            </p>

                            <p className="text-sm text-muted-foreground">
                              {fechaCorta(pago.fecha)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-4 sm:justify-end">
                          <p className="font-bold">
                            {ars(pago.monto)}
                          </p>

                          {pago.estado === "Pagado" ? (
                            <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
                              <Check className="mr-1 h-3.5 w-3.5" />
                              Pagado
                            </Badge>
                          ) : (
                            <button
                              type="button"
                              className={`${BTN_PRIMARY} min-h-9 px-3 text-xs`}
                              onClick={() => {
                                setModal("pago");
                              }}
                            >
                              Pagar
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}
          </main>
        </div>
      </div>

      {/* BOTÓN CONTACTO */}
      <button
        type="button"
        onClick={() => avisar("Abriendo contacto con la clínica...")}
        className="fixed bottom-20 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl md:bottom-6 md:right-6"
        aria-label="Contactar con la clínica"
      >
        <MessageCircle className="h-5 w-5" />
      </button>

      {/* MOBILE NAV */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-card/95 backdrop-blur md:hidden">
        <div className="grid grid-cols-5 px-2 py-2">
          {[
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
              label: "Docs.",
              icon: FileText,
            },
            {
              id: "pagos" as const,
              label: "Pagos",
              icon: CreditCard,
            },
          ].map((item) => {
            const Icon = item.icon;
            const activo = seccion === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => ir(item.id)}
                className={`flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-semibold transition-colors ${
                  activo
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground"
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* MODAL SOLICITAR TURNO */}
      <Modal
        abierto={modal === "turno"}
        titulo="Solicitar turno"
        onCerrar={() => setModal(null)}
      >
        <form onSubmit={solicitarTurno} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold">
              Fecha
            </label>

            <input
              type="date"
              className={INPUT}
              value={form.fecha}
              min="2026-09-25"
              onChange={(event) =>
                setForm({
                  ...form,
                  fecha: event.target.value,
                })
              }
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold">
              Hora
            </label>

            <input
              type="time"
              className={INPUT}
              value={form.hora}
              onChange={(event) =>
                setForm({
                  ...form,
                  hora: event.target.value,
                })
              }
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold">
              Motivo de la consulta
            </label>

            <select
              className={INPUT}
              value={form.motivo}
              onChange={(event) =>
                setForm({
                  ...form,
                  motivo: event.target.value,
                })
              }
            >
              <option value="">Seleccionar motivo</option>
              <option value="Control y seguimiento">
                Control y seguimiento
              </option>
              <option value="Restauración estética">
                Restauración estética
              </option>
              <option value="Limpieza y control">
                Limpieza y control
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
              className="min-h-24 w-full resize-none rounded-xl border border-border bg-background px-3 py-3 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="Podés agregar información adicional..."
              value={form.observaciones}
              onChange={(event) =>
                setForm({
                  ...form,
                  observaciones: event.target.value,
                })
              }
            />
          </div>

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              className={BTN_SECONDARY}
              onClick={() => setModal(null)}
            >
              Cancelar
            </button>

            <button type="submit" className={BTN_PRIMARY}>
              <CalendarPlus className="h-4 w-4" />
              Solicitar turno
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL PAGO */}
      <Modal
        abierto={modal === "pago"}
        titulo="Realizar pago"
        onCerrar={() => setModal(null)}
      >
        <div className="space-y-5">
          <div className="rounded-xl border border-border bg-background p-4">
            <p className="text-sm text-muted-foreground">
              Seleccioná el pago pendiente que querés registrar.
            </p>
          </div>

          <div className="space-y-3">
            {pagos
              .filter((pago) => pago.estado === "Pendiente")
              .map((pago) => (
                <div
                  key={pago.id}
                  className="flex items-center justify-between gap-4 rounded-xl border border-border p-4"
                >
                  <div>
                    <p className="font-semibold">{pago.concepto}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {fechaCorta(pago.fecha)}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="font-bold">{ars(pago.monto)}</p>

                    <button
                      type="button"
                      className={`${BTN_PRIMARY} mt-2 min-h-9 px-3 text-xs`}
                      onClick={() => pagar(pago.id)}
                    >
                      Confirmar pago
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </Modal>

      {/* MENSAJE */}
      {mensaje && (
        <div className="fixed bottom-20 left-1/2 z-[60] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 md:bottom-6">
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-sm font-medium shadow-xl">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Check className="h-4 w-4" />
            </div>

            <span>{mensaje}</span>
          </div>
        </div>
      )}
    </div>
  );
}