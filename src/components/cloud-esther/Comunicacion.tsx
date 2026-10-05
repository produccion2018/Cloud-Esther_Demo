import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  Bell,
  CalendarCheck2,
  CalendarClock,
  Check,
  CheckCheck,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  Copy,
  Download,
  FileText,
  FolderOpen,
  Inbox,
  Lock,
  Mail,
  Megaphone,
  MessageCircle,
  MessagesSquare,
  Paperclip,
  Pencil,
  Phone,
  Pin,
  Plus,
  RefreshCcw,
  Search,
  Send,
  Settings2,
  Smartphone,
  Sparkles,
  StickyNote,
  Tag,
  Trash2,
  UserRound,
  X,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AppShell } from "@/components/cloud-esther/AppShell";
import { CloudEstherProvider, PLANS, planLevel, useCloudEsther } from "@/lib/cloud-esther/data";
import { useSesion } from "@/lib/cloud-esther/auth-store";
import { usePacientes } from "@/lib/cloud-esther/pacientes";
import { useEquipo } from "@/lib/cloud-esther/equipo-store";
import { useIntegraciones } from "@/lib/cloud-esther/integraciones";
import { useNivel, type NivelModulo } from "@/lib/cloud-esther/niveles";
import { setTurnosStore, storeAgenda, type Turno } from "@/lib/cloud-esther/agenda-store";
import {
  CANALES,
  CATEGORIAS_PLANTILLA,
  setComunicacion,
  storeComunicacion,
  type Audiencia,
  type Campana,
  type Canal,
  type CategoriaPlantilla,
  type Conversacion,
  type Envio,
  type EstadoConversacion,
  type EstadoEntrega,
  type Mensaje,
  type Plantilla,
  type TipoEnvio,
} from "@/lib/cloud-esther/comunicacion-store";
import { normalizarBusqueda } from "@/lib/utils";

/* Ubicación: src/components/cloud-esther/Comunicacion.tsx

   Módulo Comunicación: bandeja unificada (WhatsApp, SMS y correo), recordatorios de
   turnos conectados con la Agenda, plantillas, campañas masivas, historial de envíos
   y configuración de canales. Todo es de práctica y separado por empresa.
   TODO backend: conectar con WhatsApp Business API, proveedor de SMS y correo. */

type Seccion = "bandeja" | "recordatorios" | "plantillas" | "campanas" | "historial" | "canales";

/* Nivel mínimo de cada sección según el plan (uso interno, no se muestra):
   Start: bandeja, recordatorios e historial. Pro: además plantillas y canales.
   Plus y Enterprise: además campañas. */
const SECCIONES: { id: Seccion; label: string; icon: LucideIcon; desde: NivelModulo }[] = [
  { id: "bandeja", label: "Bandeja", icon: Inbox, desde: "basico" },
  { id: "recordatorios", label: "Recordatorios", icon: Bell, desde: "basico" },
  { id: "plantillas", label: "Plantillas", icon: FileText, desde: "avanzado" },
  { id: "campanas", label: "Campañas", icon: Megaphone, desde: "completo" },
  { id: "historial", label: "Historial de envíos", icon: Clock3, desde: "basico" },
  { id: "canales", label: "Canales y horarios", icon: Settings2, desde: "avanzado" },
];

const VARIABLES = ["paciente", "fecha", "hora", "profesional", "clinica", "tratamiento"] as const;
const RESPUESTAS_RAPIDAS = [
  "¡Hola! ¿En qué te podemos ayudar?",
  "Te confirmamos el turno 👍",
  "Te pasamos los horarios disponibles en un momento.",
  "¡Gracias por avisar! Lo reprogramamos.",
];
const ETIQUETAS = ["Turno", "Presupuesto", "Consulta", "Post-operatorio", "Cobranza", "Urgencia"];
const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const AUDIENCIAS: { id: Audiencia; label: string; ayuda: string }[] = [
  { id: "activos", label: "Todos los pacientes activos", ayuda: "Pacientes con estado activo." },
  {
    id: "sin-visita",
    label: "Sin visita hace 6 meses",
    ayuda: "Sin turnos en los últimos 180 días ni turnos próximos.",
  },
  { id: "cumpleanos", label: "Cumpleaños del mes", ayuda: "Pacientes que cumplen años este mes." },
  { id: "obra-social", label: "Por obra social", ayuda: "Pacientes de una obra social puntual." },
  { id: "sucursal", label: "Por sucursal", ayuda: "Pacientes atendidos en una sucursal." },
];

/* ───────────── Utilidades ───────────── */

function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function sumarDias(iso: string, n: number) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatearFecha(iso: string) {
  return iso ? iso.slice(0, 10).split("-").reverse().join("/") : "";
}

function horaDe(iso: string) {
  return new Date(iso).toTimeString().slice(0, 5);
}

/** "10:42", "Ayer" o "12/09" según cuándo fue. */
function cuandoCorto(iso: string) {
  const dia = new Date(iso);
  const clave = `${dia.getFullYear()}-${String(dia.getMonth() + 1).padStart(2, "0")}-${String(dia.getDate()).padStart(2, "0")}`;
  if (clave === hoyISO()) return horaDe(iso);
  if (clave === sumarDias(hoyISO(), -1)) return "Ayer";
  return formatearFecha(clave).slice(0, 5);
}

function etiquetaDia(iso: string) {
  if (iso === hoyISO()) return "Hoy";
  if (iso === sumarDias(hoyISO(), 1)) return "Mañana";
  const d = new Date(`${iso}T12:00:00`);
  return `${DIAS[d.getDay()]} ${formatearFecha(iso).slice(0, 5)}`;
}

function iniciales(nombre: string) {
  return nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");
}

function formatearMonto(n: number) {
  return `$ ${n.toLocaleString("es-AR")}`;
}

type DatosVariables = Partial<Record<(typeof VARIABLES)[number], string>>;

function rellenar(texto: string, datos: DatosVariables) {
  return texto.replace(
    /\{\{(\w+)\}\}/g,
    (todo, clave: string) => datos[clave as keyof DatosVariables] || todo,
  );
}

function proximoTurno(turnos: Turno[], paciente: string) {
  const hoy = hoyISO();
  return turnos
    .filter(
      (t) =>
        t.paciente === paciente &&
        t.fecha >= hoy &&
        t.estado !== "Cancelada" &&
        t.estado !== "Atendida" &&
        t.estado !== "Ausente",
    )
    .sort((a, b) => `${a.fecha}${a.hora}`.localeCompare(`${b.fecha}${b.hora}`))[0];
}

function dentroDeHorario(desde: string, hasta: string, dias: number[]) {
  const ahora = new Date();
  const hhmm = ahora.toTimeString().slice(0, 5);
  return dias.includes(ahora.getDay()) && hhmm >= desde && hhmm < hasta;
}

function segmentosSMS(texto: string) {
  return Math.max(1, Math.ceil(texto.length / 160));
}

/* ───────────── Estilos ───────────── */

const INPUT =
  "h-9 w-full rounded-xl border border-primary/12 bg-white px-3 text-sm outline-none transition-all placeholder:text-muted-foreground focus:border-primary/45 focus:ring-4 focus:ring-primary/10";
const TEXTAREA =
  "w-full resize-y rounded-xl border border-primary/12 bg-white px-3 py-2 text-sm outline-none transition-all placeholder:text-muted-foreground focus:border-primary/45 focus:ring-4 focus:ring-primary/10";
const BTN_PRIMARIO =
  "btn-ce focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";
const BTN_SECUNDARIO =
  "btn-ce-outline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";
const BTN_ICONO =
  "grid size-8 shrink-0 place-items-center rounded-full border border-primary/12 bg-white text-muted-foreground transition-all hover:border-primary/30 hover:bg-primary/10 hover:text-primary";

const CANAL_ESTILO: Record<Canal, { icon: LucideIcon; chip: string; burbuja: string }> = {
  WhatsApp: {
    icon: MessageCircle,
    chip: "border-emerald-200 bg-emerald-50 text-emerald-700",
    burbuja: "from-emerald-500 to-emerald-600",
  },
  SMS: {
    icon: Smartphone,
    chip: "border-sky-200 bg-sky-50 text-sky-700",
    burbuja: "from-sky-500 to-sky-600",
  },
  Email: {
    icon: Mail,
    chip: "border-violet-200 bg-violet-50 text-violet-700",
    burbuja: "from-primary to-violet-600",
  },
};

const ESTADO_CONV: Record<EstadoConversacion, string> = {
  Abierta: "bg-primary/10 text-primary",
  Pendiente: "bg-amber-100 text-amber-700",
  Resuelta: "bg-emerald-100 text-emerald-700",
};

const ESTADO_ENVIO: Record<EstadoEntrega, { label: string; clase: string }> = {
  enviado: { label: "Enviado", clase: "bg-muted text-muted-foreground" },
  entregado: { label: "Entregado", clase: "bg-sky-100 text-sky-700" },
  leido: { label: "Leído", clase: "bg-emerald-100 text-emerald-700" },
  fallido: { label: "Falló", clase: "bg-destructive/10 text-destructive" },
};

function ChipCanal({ canal, compacto = false }: { canal: Canal; compacto?: boolean }) {
  const { icon: Icon, chip } = CANAL_ESTILO[canal];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-semibold ${chip} ${compacto ? "px-1.5 py-0 text-[10px]" : "px-2 py-0.5 text-[11px]"}`}
    >
      <Icon className="size-3" />
      {canal}
    </span>
  );
}

function Pill({ children, clase }: { children: ReactNode; clase: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${clase}`}
    >
      {children}
    </span>
  );
}

function Field({ label, children, ayuda }: { label: string; children: ReactNode; ayuda?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </span>
      {children}
      {ayuda && <span className="mt-1 block text-[11px] text-muted-foreground">{ayuda}</span>}
    </label>
  );
}

function Select<T extends string>({
  value,
  onChange,
  opciones,
}: {
  value: T;
  onChange: (v: T) => void;
  opciones: readonly { value: T; label: string }[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className={`${INPUT} appearance-none pr-8`}
      >
        {opciones.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

function Interruptor({
  activo,
  onChange,
  etiqueta,
}: {
  activo: boolean;
  onChange: (v: boolean) => void;
  etiqueta: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      aria-label={etiqueta}
      onClick={() => onChange(!activo)}
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${activo ? "bg-primary" : "bg-muted-foreground/30"}`}
    >
      <span
        className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-all ${activo ? "left-[18px]" : "left-0.5"}`}
      />
    </button>
  );
}

function Modal({
  titulo,
  onClose,
  children,
  ancho = "max-w-xl",
}: {
  titulo: string;
  onClose: () => void;
  children: ReactNode;
  ancho?: string;
}) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className={`max-h-[92vh] w-full overflow-y-auto rounded-3xl border border-border bg-card p-5 shadow-2xl ${ancho}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              Comunicación
            </p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight">{titulo}</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="grid size-8 place-items-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Acciones({
  etiqueta,
  onCancel,
  icon: Icon = Check,
}: {
  etiqueta: string;
  onCancel: () => void;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <button type="button" onClick={onCancel} className={BTN_SECUNDARIO}>
        Cancelar
      </button>
      <button type="submit" className={BTN_PRIMARIO}>
        <Icon className="size-4" />
        {etiqueta}
      </button>
    </div>
  );
}

type TonoStat = "primary" | "emerald" | "amber" | "violet";
const TONOS_STAT: Record<TonoStat, { label: string; value: string; circle: string }> = {
  primary: {
    label: "text-primary/75",
    value: "text-primary",
    circle: "bg-primary/[0.08] text-primary",
  },
  emerald: {
    label: "text-emerald-600/85",
    value: "text-emerald-600",
    circle: "bg-emerald-400/[0.1] text-emerald-600",
  },
  amber: {
    label: "text-amber-600/85",
    value: "text-amber-600",
    circle: "bg-amber-400/[0.12] text-amber-600",
  },
  violet: {
    label: "text-violet-600/80",
    value: "text-foreground",
    circle: "bg-violet-400/[0.1] text-violet-600",
  },
};

function StatCard({
  label,
  value,
  icon: Icon,
  tono,
  trend,
  detail,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tono: TonoStat;
  trend: string;
  detail: string;
}) {
  const t = TONOS_STAT[tono];
  return (
    <div className="group relative min-h-[112px] overflow-hidden rounded-[22px] border border-primary/25 bg-gradient-to-br from-white via-white to-primary/[0.065] p-4 shadow-[0_12px_28px_-20px_rgba(124,58,237,0.48)] transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/45">
      <div className="pointer-events-none absolute -right-7 -top-9 size-[100px] rounded-full bg-primary/[0.035] ring-[13px] ring-primary/[0.035] transition-transform duration-300 group-hover:scale-110" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className={`text-[10px] font-bold uppercase leading-[1.25] tracking-[0.09em] ${t.label}`}
          >
            {label}
          </p>
          <p className={`mt-2 text-[27px] font-bold leading-none tracking-tight ${t.value}`}>
            {value}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] leading-4">
            <span
              className={`font-semibold ${t.value === "text-foreground" ? "text-violet-600" : t.value}`}
            >
              {trend}
            </span>
            <span className="text-muted-foreground">{detail}</span>
          </div>
        </div>
        <div className={`grid size-9 shrink-0 place-items-center rounded-full ${t.circle}`}>
          <Icon className="size-4" strokeWidth={1.7} />
        </div>
      </div>
    </div>
  );
}

function EncabezadoSeccion({
  icon: Icon,
  titulo,
  descripcion,
  children,
}: {
  icon: LucideIcon;
  titulo: string;
  descripcion: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary/15 via-primary/8 to-primary/[0.03] text-primary ring-1 ring-primary/15">
          <Icon className="size-5" />
        </span>
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{titulo}</h2>
          <p className="text-sm text-muted-foreground">{descripcion}</p>
        </div>
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

function Vacio({ icon: Icon, titulo, texto }: { icon: LucideIcon; titulo: string; texto: string }) {
  return (
    <div className="card-grad grid min-h-40 place-items-center p-6 text-center">
      <div>
        <Icon className="mx-auto size-8 text-primary/60" />
        <p className="mt-2 text-sm font-semibold">{titulo}</p>
        <p className="text-sm text-muted-foreground">{texto}</p>
      </div>
    </div>
  );
}

function Filtros<T extends string>({
  valor,
  onChange,
  opciones,
}: {
  valor: T;
  onChange: (v: T) => void;
  opciones: { id: T; label: string }[];
}) {
  return (
    <>
      {opciones.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          aria-pressed={valor === o.id}
          className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors ${
            valor === o.id
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-primary/10 hover:text-foreground"
          }`}
        >
          {o.label}
        </button>
      ))}
    </>
  );
}

/* ───────────── Contexto compartido de las secciones ───────────── */

type Ctx = {
  clinica: string;
  usuario: string;
  onToast: (msg: string) => void;
  abrirChat: (paciente: string, canal?: Canal, texto?: string) => void;
  datosDe: (paciente: string) => DatosVariables;
};

function registrarEnvio(e: Omit<Envio, "id" | "fecha">) {
  setComunicacion("envios", (prev) => [
    { ...e, id: Date.now() + Math.random(), fecha: new Date().toISOString() },
    ...prev,
  ]);
  setComunicacion("config", (prev) => ({
    ...prev,
    canales: {
      ...prev.canales,
      [e.canal]: { ...prev.canales[e.canal], enviadosMes: prev.canales[e.canal].enviadosMes + 1 },
    },
  }));
}

function actualizarConversacion(id: number, fn: (c: Conversacion) => Conversacion) {
  setComunicacion("conversaciones", (prev) => prev.map((c) => (c.id === id ? fn(c) : c)));
}

function agregarMensaje(id: number, mensaje: Omit<Mensaje, "id" | "fecha">) {
  const nuevo: Mensaje = {
    ...mensaje,
    id: Date.now() + Math.random(),
    fecha: new Date().toISOString(),
  };
  actualizarConversacion(id, (c) => ({ ...c, mensajes: [...c.mensajes, nuevo] }));
  return nuevo.id;
}

/* ───────────── Página ───────────── */

function ComunicacionInner() {
  const { plan } = useCloudEsther();
  const { clinica: clinicaSesion, usuario: usuarioSesion } = useSesion();
  const estado = storeComunicacion.usar();
  const { turnos } = storeAgenda.usar();
  const { pacientes } = usePacientes();
  const [montado, setMontado] = useState(false);
  const [seccion, setSeccion] = useState<Seccion>("bandeja");
  const [chatId, setChatId] = useState<number | null>(null);
  const [borrador, setBorrador] = useState<{ id: number; texto: string } | null>(null);
  const [nuevaConv, setNuevaConv] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);

  useEffect(() => setMontado(true), []);

  // WhatsApp refleja siempre lo que dice el módulo Integraciones.
  const { conectores } = useIntegraciones();
  const whatsappConectado = conectores.find((c) => c.id === "whatsapp")?.estado === "Conectado";
  useEffect(() => {
    if (whatsappConectado !== estado.config.canales.WhatsApp.conectado) {
      setComunicacion("config", (c) => ({
        ...c,
        canales: {
          ...c.canales,
          WhatsApp: { ...c.canales.WhatsApp, conectado: whatsappConectado },
        },
      }));
    }
  }, [whatsappConectado, estado.config.canales.WhatsApp.conectado]);

  const clinica = clinicaSesion?.nombre ?? "Clínica Dental Esther";
  const usuario = usuarioSesion?.nombre ?? "Recepción";
  const nivelCom = useNivel("comunicaciones");
  const conCampanas = nivelCom.desde("completo");
  const secciones = SECCIONES.filter((x) => nivelCom.desde(x.desde));
  const seccionVisible: Seccion = secciones.some((x) => x.id === seccion) ? seccion : "bandeja";

  const onToast = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2800);
  };

  const datosDe = (paciente: string): DatosVariables => {
    const t = proximoTurno(turnos, paciente);
    return {
      paciente: paciente.split(" ")[0] ?? paciente,
      clinica,
      ...(t
        ? {
            fecha: formatearFecha(t.fecha),
            hora: t.hora,
            profesional: t.odontologo,
            tratamiento: t.tratamiento,
          }
        : {}),
    };
  };

  // Abre (o crea) la conversación del paciente en la bandeja.
  const abrirChat = (paciente: string, canal: Canal = "WhatsApp", texto?: string) => {
    const existente = storeComunicacion.leer().conversaciones.find((c) => c.paciente === paciente);
    let id = existente?.id;
    if (!existente) {
      const p = pacientes.find((x) => `${x.nombre} ${x.apellido}` === paciente);
      id = Date.now();
      setComunicacion("conversaciones", (prev) => [
        {
          id: id as number,
          paciente,
          telefono: p?.telefono ?? "",
          email: p?.email ?? "",
          canal,
          estado: "Abierta",
          asignado: "",
          etiquetas: [],
          noLeidos: 0,
          fijada: false,
          mensajes: [],
        },
        ...prev,
      ]);
    }
    setChatId(id ?? null);
    if (texto && id) setBorrador({ id, texto });
    setSeccion("bandeja");
  };

  const ctx: Ctx = { clinica, usuario, onToast, abrirChat, datosDe };

  // Métricas del encabezado
  const noLeidos = estado.conversaciones.reduce((acc, c) => acc + c.noLeidos, 0);
  const porResponder = estado.conversaciones.filter((c) => c.estado === "Pendiente").length;
  const hoy = hoyISO();
  const proximos = turnos.filter(
    (t) =>
      t.fecha >= hoy &&
      t.fecha <= sumarDias(hoy, 7) &&
      (t.estado === "Pendiente" || t.estado === "Confirmada"),
  );
  const confirmados = proximos.filter((t) => t.estado === "Confirmada").length;
  const manana = turnos.filter((t) => t.fecha === sumarDias(hoy, 1) && t.estado === "Pendiente");
  const mananaSinAviso = manana.filter((t) => !estado.recordatorios[t.id]).length;
  const enviadosMes = CANALES.reduce((acc, c) => acc + estado.config.canales[c].enviadosMes, 0);
  const costoMes = CANALES.reduce(
    (acc, c) => acc + estado.config.canales[c].enviadosMes * estado.config.canales[c].costoUnitario,
    0,
  );

  return (
    <AppShell>
      <div className="relative min-h-full overflow-hidden bg-[#faf9ff]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_5%,rgba(124,58,237,0.15),transparent_28%),radial-gradient(circle_at_92%_12%,rgba(167,139,250,0.14),transparent_27%),radial-gradient(circle_at_78%_88%,rgba(52,211,153,0.07),transparent_30%),linear-gradient(135deg,#f8f6ff_0%,#f3effd_48%,#faf8ff_100%)]"
        />

        <div className="relative mx-auto w-full max-w-[1420px] px-4 py-6 md:px-6 lg:px-8">
          {/* ───────────── Encabezado ───────────── */}
          <section className="relative overflow-hidden rounded-[30px] border border-primary/15 bg-gradient-to-br from-white via-white/96 to-primary/[0.045] shadow-[0_20px_55px_-38px_rgba(76,29,149,0.55)]">
            <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-primary/55 via-primary to-emerald-400/55" />
            <div className="pointer-events-none absolute -right-24 -top-28 size-72 rounded-full bg-primary/[0.055] blur-2xl" />
            <div className="relative p-5 md:p-7">
              <div className="flex flex-wrap items-start justify-between gap-6">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/10 bg-primary/[0.07] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
                      <MessagesSquare className="size-3.5" />
                      Centro de mensajes
                    </span>
                    {montado && noLeidos > 0 && (
                      <span className="rounded-full border border-amber-200/70 bg-amber-50/80 px-3 py-1.5 text-[11px] font-bold text-amber-700">
                        {noLeidos} sin leer
                      </span>
                    )}
                  </div>
                  <h1 className="mt-4 text-[34px] font-bold tracking-[-0.035em] md:text-[42px]">
                    Comunicación
                  </h1>
                  <p className="mt-2 max-w-2xl text-[13px] leading-6 text-muted-foreground md:text-sm">
                    WhatsApp, SMS y correo en un solo lugar: respondé a tus pacientes, enviá
                    recordatorios que confirman turnos solos, usá plantillas y medí cada envío.
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <button className={BTN_SECUNDARIO} onClick={() => setSeccion("plantillas")}>
                    <FileText className="size-4" />
                    Plantillas
                  </button>
                  <button
                    className={BTN_PRIMARIO}
                    onClick={() => {
                      setSeccion("bandeja");
                      setNuevaConv(true);
                    }}
                  >
                    <Send className="size-4" />
                    Nuevo mensaje
                  </button>
                </div>
              </div>

              {montado && (
                <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <StatCard
                    label="Mensajes sin leer"
                    value={String(noLeidos)}
                    icon={Inbox}
                    tono="primary"
                    trend={`${porResponder} por responder`}
                    detail={`${estado.conversaciones.length} conversaciones`}
                  />
                  <StatCard
                    label="Recordatorios de mañana"
                    value={String(manana.length)}
                    icon={Bell}
                    tono="amber"
                    trend={mananaSinAviso ? `${mananaSinAviso} sin enviar` : "Todos enviados"}
                    detail="turnos pendientes"
                  />
                  <StatCard
                    label="Confirmación próximos 7 días"
                    value={`${proximos.length ? Math.round((confirmados / proximos.length) * 100) : 0}%`}
                    icon={CalendarCheck2}
                    tono="emerald"
                    trend={`${confirmados} de ${proximos.length}`}
                    detail="turnos confirmados"
                  />
                  <StatCard
                    label="Enviados este mes"
                    value={enviadosMes.toLocaleString("es-AR")}
                    icon={Send}
                    tono="violet"
                    trend={formatearMonto(costoMes)}
                    detail="costo estimado"
                  />
                </div>
              )}

              <nav
                className="mt-4 flex flex-wrap gap-1.5 rounded-2xl border border-primary/10 bg-primary/[0.025] p-1.5"
                aria-label="Secciones de comunicación"
              >
                {secciones.map((s) => {
                  const contador =
                    s.id === "bandeja" && montado && noLeidos > 0
                      ? noLeidos
                      : s.id === "recordatorios" && montado && mananaSinAviso > 0
                        ? mananaSinAviso
                        : 0;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSeccion(s.id)}
                      aria-pressed={seccionVisible === s.id}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                        seccionVisible === s.id
                          ? "bg-primary text-primary-foreground shadow-[0_8px_18px_-10px_rgba(124,58,237,0.8)]"
                          : "text-muted-foreground hover:bg-card hover:text-foreground"
                      }`}
                    >
                      <s.icon className="size-3.5" />
                      {s.label}
                      {contador > 0 && (
                        <span
                          className={`grid min-w-4 place-items-center rounded-full px-1 text-[10px] ${seccionVisible === s.id ? "bg-white/25" : "bg-primary text-primary-foreground"}`}
                        >
                          {contador}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>
          </section>

          <div className="mt-5">
            {!montado ? (
              <div className="card-grad h-[560px] animate-pulse" />
            ) : seccionVisible === "bandeja" ? (
              <Bandeja
                ctx={ctx}
                chatId={chatId}
                setChatId={setChatId}
                borrador={borrador}
                limpiarBorrador={() => setBorrador(null)}
                nueva={nuevaConv}
                setNueva={setNuevaConv}
              />
            ) : seccionVisible === "recordatorios" ? (
              <Recordatorios ctx={ctx} />
            ) : seccionVisible === "plantillas" ? (
              <Plantillas ctx={ctx} />
            ) : seccionVisible === "campanas" ? (
              conCampanas ? (
                <Campanas ctx={ctx} />
              ) : (
                <CampanasBloqueadas />
              )
            ) : seccionVisible === "historial" ? (
              <Historial ctx={ctx} />
            ) : (
              <Canales ctx={ctx} />
            )}
          </div>
        </div>

        {toast && (
          <div
            className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-foreground px-4 py-2 text-xs font-medium text-background shadow-xl"
            role="status"
          >
            {toast}
          </div>
        )}
      </div>
    </AppShell>
  );
}

export function ComunicacionPage() {
  return (
    <CloudEstherProvider>
      <ComunicacionInner />
    </CloudEstherProvider>
  );
}

/* ───────────── Bandeja ───────────── */

type FiltroBandeja = "todas" | "noLeidas" | "Pendiente" | "Resuelta";

function Bandeja({
  ctx,
  chatId,
  setChatId,
  borrador,
  limpiarBorrador,
  nueva,
  setNueva,
}: {
  ctx: Ctx;
  chatId: number | null;
  setChatId: (id: number | null) => void;
  borrador: { id: number; texto: string } | null;
  limpiarBorrador: () => void;
  nueva: boolean;
  setNueva: (v: boolean) => void;
}) {
  const { conversaciones, config } = storeComunicacion.usar();
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<FiltroBandeja>("todas");
  const [canal, setCanal] = useState<"" | Canal>("");

  const texto = normalizarBusqueda(busqueda);
  const lista = [...conversaciones]
    .filter((c) => {
      if (filtro === "noLeidas" && c.noLeidos === 0) return false;
      if ((filtro === "Pendiente" || filtro === "Resuelta") && c.estado !== filtro) return false;
      if (canal && c.canal !== canal) return false;
      if (
        texto &&
        !normalizarBusqueda(
          `${c.paciente} ${c.telefono} ${c.mensajes.at(-1)?.texto ?? ""}`,
        ).includes(texto)
      )
        return false;
      return true;
    })
    .sort(
      (a, b) =>
        Number(b.fijada) - Number(a.fijada) ||
        (b.mensajes.at(-1)?.fecha ?? "").localeCompare(a.mensajes.at(-1)?.fecha ?? ""),
    );

  const activa = conversaciones.find((c) => c.id === chatId) ?? lista[0] ?? null;

  // Al abrir una conversación se marcan sus mensajes como leídos.
  useEffect(() => {
    if (activa && activa.noLeidos > 0)
      actualizarConversacion(activa.id, (c) => ({ ...c, noLeidos: 0 }));
  }, [activa?.id, activa?.noLeidos]);

  const enHorario = dentroDeHorario(
    config.horario.desde,
    config.horario.hasta,
    config.horario.dias,
  );

  return (
    <div className="space-y-3">
      {!enHorario && config.autoRespuesta.activa && (
        <p className="card-grad flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
          <Clock3 className="size-4 text-amber-600" />
          Estás fuera del horario de atención ({config.horario.desde} a {config.horario.hasta}). Los
          pacientes que escriban reciben la respuesta automática.
        </p>
      )}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[290px_minmax(0,1fr)] xl:grid-cols-[290px_minmax(0,1fr)_230px] 2xl:grid-cols-[320px_minmax(0,1fr)_280px]">
        {/* Lista */}
        <div className="card-grad flex h-[620px] flex-col overflow-hidden">
          <div className="space-y-2 border-b border-primary/10 p-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-primary/60" />
                <input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar paciente o mensaje"
                  className={`${INPUT} pl-8`}
                />
              </div>
              <button
                className={BTN_ICONO}
                aria-label="Nueva conversación"
                title="Nueva conversación"
                onClick={() => setNueva(true)}
              >
                <Plus className="size-4" />
              </button>
            </div>
            <div className="flex justify-between gap-0.5 rounded-xl bg-primary/[0.05] p-0.5">
              {(
                [
                  ["todas", "Todas"],
                  [
                    "noLeidas",
                    `Sin leer ${conversaciones.filter((c) => c.noLeidos > 0).length || ""}`,
                  ],
                  ["Pendiente", "Pendientes"],
                  ["Resuelta", "Resueltas"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setFiltro(id)}
                  aria-pressed={filtro === id}
                  className={`flex-1 whitespace-nowrap rounded-lg px-1.5 py-1 text-[10.5px] font-semibold transition-colors ${
                    filtro === id
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex gap-1">
              {(["", ...CANALES] as const).map((c) => (
                <button
                  key={c || "todos"}
                  onClick={() => setCanal(c)}
                  aria-pressed={canal === c}
                  className={`flex-1 rounded-lg border px-1.5 py-1 text-[10px] font-semibold transition-colors ${canal === c ? "border-primary/40 bg-primary/10 text-primary" : "border-transparent text-muted-foreground hover:bg-primary/5"}`}
                >
                  {c || "Todos"}
                </button>
              ))}
            </div>
          </div>
          <ul className="flex-1 overflow-y-auto p-1.5">
            {lista.length === 0 && (
              <li className="p-6 text-center text-xs text-muted-foreground">
                No hay conversaciones con ese filtro.
              </li>
            )}
            {lista.map((c) => {
              const ultimo = c.mensajes.at(-1);
              const Icon = CANAL_ESTILO[c.canal].icon;
              return (
                <li key={c.id}>
                  <button
                    onClick={() => setChatId(c.id)}
                    className={`flex w-full items-start gap-2.5 rounded-xl p-2.5 text-left transition-colors ${activa?.id === c.id ? "bg-primary/10" : "hover:bg-primary/[0.04]"}`}
                  >
                    <span className="relative grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-xs font-bold text-primary">
                      {iniciales(c.paciente)}
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 grid size-4 place-items-center rounded-full border-2 border-white bg-gradient-to-br text-white ${CANAL_ESTILO[c.canal].burbuja}`}
                      >
                        <Icon className="size-2.5" />
                      </span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1">
                        <span
                          className={`truncate text-sm ${c.noLeidos ? "font-bold" : "font-semibold"}`}
                        >
                          {c.paciente}
                        </span>
                        {c.fijada && <Pin className="size-3 shrink-0 text-primary" />}
                        <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
                          {ultimo ? cuandoCorto(ultimo.fecha) : ""}
                        </span>
                      </span>
                      <span className="mt-0.5 flex items-center gap-1">
                        <span
                          className={`truncate text-xs ${c.noLeidos ? "font-medium text-foreground" : "text-muted-foreground"}`}
                        >
                          {ultimo
                            ? `${ultimo.de === "clinica" ? "Vos: " : ultimo.de === "nota" ? "Nota: " : ""}${ultimo.texto}`
                            : "Sin mensajes todavía"}
                        </span>
                        {c.noLeidos > 0 && (
                          <span className="ml-auto grid min-w-5 shrink-0 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                            {c.noLeidos}
                          </span>
                        )}
                      </span>
                      <span className="mt-1 flex flex-wrap gap-1">
                        {c.estado !== "Abierta" && (
                          <Pill clase={`${ESTADO_CONV[c.estado]} !px-1.5 !py-0 !text-[10px]`}>
                            {c.estado}
                          </Pill>
                        )}
                        {c.etiquetas.slice(0, 2).map((e) => (
                          <Pill
                            key={e}
                            clase="bg-muted !px-1.5 !py-0 !text-[10px] text-muted-foreground"
                          >
                            {e}
                          </Pill>
                        ))}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Chat */}
        {activa ? (
          <Chat
            key={activa.id}
            conv={activa}
            ctx={ctx}
            borrador={borrador?.id === activa.id ? borrador.texto : ""}
            limpiarBorrador={limpiarBorrador}
          />
        ) : (
          <div className="card-grad grid h-[620px] place-items-center text-center">
            <div>
              <MessagesSquare className="mx-auto size-10 text-primary/50" />
              <p className="mt-2 text-sm font-semibold">Elegí una conversación</p>
              <p className="text-xs text-muted-foreground">O empezá una nueva con el botón +</p>
            </div>
          </div>
        )}

        {/* Ficha del paciente */}
        {activa && <PanelPaciente conv={activa} ctx={ctx} />}
      </div>

      {nueva && (
        <Modal titulo="Nueva conversación" onClose={() => setNueva(false)}>
          <NuevaConversacionForm
            onCancel={() => setNueva(false)}
            onSubmit={(paciente, canal, texto) => {
              setNueva(false);
              ctx.abrirChat(paciente, canal, texto);
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function NuevaConversacionForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (paciente: string, canal: Canal, texto: string) => void;
  onCancel: () => void;
}) {
  const { pacientes } = usePacientes();
  const { plantillas } = storeComunicacion.usar();
  const nombres = pacientes
    .filter((p) => p.estado === "Activo")
    .map((p) => `${p.nombre} ${p.apellido}`);
  const [paciente, setPaciente] = useState(nombres[0] ?? "");
  const [canal, setCanal] = useState<Canal>("WhatsApp");
  const [plantillaId, setPlantillaId] = useState("");
  return (
    <form
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        if (!paciente) return;
        onSubmit(
          paciente,
          canal,
          plantillas.find((p) => String(p.id) === plantillaId)?.texto ?? "",
        );
      }}
      className="space-y-3"
    >
      <Field label="Paciente *">
        <Select
          value={paciente}
          onChange={setPaciente}
          opciones={nombres.map((n) => ({ value: n, label: n }))}
        />
      </Field>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Canal">
          <Select
            value={canal}
            onChange={setCanal}
            opciones={CANALES.map((c) => ({ value: c, label: c }))}
          />
        </Field>
        <Field label="Empezar con una plantilla">
          <Select
            value={plantillaId}
            onChange={setPlantillaId}
            opciones={[
              { value: "", label: "Mensaje libre" },
              ...plantillas
                .filter((p) => p.canal === canal)
                .map((p) => ({ value: String(p.id), label: p.nombre })),
            ]}
          />
        </Field>
      </div>
      <Acciones etiqueta="Abrir conversación" onCancel={onCancel} icon={MessageCircle} />
    </form>
  );
}

const RESPUESTAS_SIMULADAS: [RegExp, string][] = [
  [/confirm|turno|recorda/i, "¡Sí, confirmo! Gracias 🙌"],
  [/cuota|pago|precio|presupuesto/i, "Buenísimo, lo charlo en casa y les aviso."],
  [/horario|disponible/i, "El jueves a la tarde me quedaría bien."],
  [/\?/, "Sí, perfecto."],
];

function Chat({
  conv,
  ctx,
  borrador,
  limpiarBorrador,
}: {
  conv: Conversacion;
  ctx: Ctx;
  borrador: string;
  limpiarBorrador: () => void;
}) {
  const { plantillas, config } = storeComunicacion.usar();
  const { miembros } = useEquipo();
  const [texto, setTexto] = useState(
    borrador ? rellenar(borrador, ctx.datosDe(conv.paciente)) : "",
  );
  const [nota, setNota] = useState(false);
  const [verPlantillas, setVerPlantillas] = useState(false);
  const [verEtiquetas, setVerEtiquetas] = useState(false);
  const finRef = useRef<HTMLDivElement>(null);
  const archivoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (borrador) limpiarBorrador();
  }, []);
  useEffect(() => {
    finRef.current?.scrollIntoView({ block: "end" });
  }, [conv.mensajes.length]);

  const canalConectado = config.canales[conv.canal].conectado;
  const equipo = miembros
    .filter((m) => m.status !== "inactivo")
    .map((m) => `${m.firstName} ${m.lastName}`.trim());

  const enviar = (contenido: string, adjunto?: string) => {
    const limpio = contenido.trim();
    if (!limpio && !adjunto) return;
    if (nota) {
      agregarMensaje(conv.id, { de: "nota", texto: limpio, autor: ctx.usuario });
      setTexto("");
      ctx.onToast("Nota interna guardada (el paciente no la ve)");
      return;
    }
    if (!canalConectado) {
      ctx.onToast(`${conv.canal} está desconectado. Conectalo en "Canales y horarios".`);
      return;
    }
    const firma =
      conv.canal === "Email" && config.firma
        ? `\n\n${rellenar(config.firma, { clinica: ctx.clinica })}`
        : "";
    const id = agregarMensaje(conv.id, {
      de: "clinica",
      texto: limpio + firma,
      estado: "enviado",
      autor: ctx.usuario,
      ...(adjunto ? { adjunto } : {}),
    });
    actualizarConversacion(conv.id, (c) => ({
      ...c,
      estado: c.estado === "Pendiente" ? "Abierta" : c.estado,
    }));
    registrarEnvio({
      paciente: conv.paciente,
      canal: conv.canal,
      tipo: "Mensaje",
      texto: limpio || adjunto || "",
      estado: "entregado",
    });
    setTexto("");

    // Simulación de entrega, lectura y respuesta del paciente (solo práctica).
    const marcar = (estado: EstadoEntrega) =>
      actualizarConversacion(conv.id, (c) => ({
        ...c,
        mensajes: c.mensajes.map((x) => (x.id === id ? { ...x, estado } : x)),
      }));
    window.setTimeout(() => marcar("entregado"), 700);
    if (conv.canal === "WhatsApp") window.setTimeout(() => marcar("leido"), 1800);
    if (conv.canal !== "Email") {
      const respuesta = RESPUESTAS_SIMULADAS.find(([re]) => re.test(limpio))?.[1];
      if (respuesta) {
        window.setTimeout(() => {
          agregarMensaje(conv.id, { de: "paciente", texto: respuesta });
          actualizarConversacion(conv.id, (c) => ({ ...c, noLeidos: c.noLeidos + 1 }));
        }, 3200);
      }
    }
  };

  const cambiarEstado = (estado: EstadoConversacion) => {
    actualizarConversacion(conv.id, (c) => ({ ...c, estado }));
    agregarMensaje(conv.id, {
      de: "sistema",
      texto:
        estado === "Resuelta"
          ? "Conversación marcada como resuelta"
          : `Conversación reabierta por ${ctx.usuario}`,
    });
    ctx.onToast(estado === "Resuelta" ? "Conversación resuelta" : "Conversación reabierta");
  };

  const plantillasCanal = plantillas.filter(
    (p) => p.canal === conv.canal || conv.canal !== "Email",
  );

  return (
    <div className="card-grad flex h-[620px] min-w-0 flex-col overflow-hidden">
      {/* Cabecera */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-2 border-b border-primary/10 px-4 py-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-xs font-bold text-primary">
          {iniciales(conv.paciente)}
        </span>
        <div className="min-w-[160px] flex-1">
          <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold">
            {conv.paciente}
            <ChipCanal canal={conv.canal} compacto />
            <Pill clase={`${ESTADO_CONV[conv.estado]} !py-0 !text-[10px]`}>{conv.estado}</Pill>
          </p>
          <p className="truncate text-[11px] text-muted-foreground">
            {conv.canal === "Email" ? conv.email : conv.telefono}
            {conv.asignado ? ` · Asignada a ${conv.asignado}` : " · Sin asignar"}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <select
            value={conv.asignado}
            onChange={(e) => {
              actualizarConversacion(conv.id, (c) => ({ ...c, asignado: e.target.value }));
              ctx.onToast(
                e.target.value ? `Asignada a ${e.target.value}` : "Conversación sin asignar",
              );
            }}
            aria-label="Asignar conversación"
            className="h-8 max-w-[130px] rounded-full border border-primary/12 bg-white px-2 text-[11px] outline-none"
          >
            <option value="">Asignar a…</option>
            {equipo.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <div className="relative">
            <button
              className={BTN_ICONO}
              aria-label="Etiquetas"
              title="Etiquetas"
              onClick={() => setVerEtiquetas((v) => !v)}
            >
              <Tag className="size-3.5" />
            </button>
            {verEtiquetas && (
              <div className="absolute right-0 top-9 z-20 w-44 rounded-xl border border-border bg-card p-1.5 shadow-xl">
                {ETIQUETAS.map((e) => {
                  const tiene = conv.etiquetas.includes(e);
                  return (
                    <button
                      key={e}
                      onClick={() =>
                        actualizarConversacion(conv.id, (c) => ({
                          ...c,
                          etiquetas: tiene
                            ? c.etiquetas.filter((x) => x !== e)
                            : [...c.etiquetas, e],
                        }))
                      }
                      className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-xs hover:bg-primary/5"
                    >
                      {e}
                      {tiene && <Check className="size-3.5 text-primary" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <button
            className={`${BTN_ICONO} ${conv.fijada ? "!border-primary/30 !bg-primary/10 !text-primary" : ""}`}
            aria-label={conv.fijada ? "Desfijar" : "Fijar arriba"}
            title={conv.fijada ? "Desfijar" : "Fijar arriba"}
            onClick={() => actualizarConversacion(conv.id, (c) => ({ ...c, fijada: !c.fijada }))}
          >
            <Pin className="size-3.5" />
          </button>
          {conv.telefono && (
            <a
              className={BTN_ICONO}
              href={`tel:${conv.telefono.replace(/[^\d+]/g, "")}`}
              aria-label="Llamar"
              title="Llamar"
            >
              <Phone className="size-3.5" />
            </a>
          )}
          {conv.estado === "Resuelta" ? (
            <button className={BTN_SECUNDARIO} onClick={() => cambiarEstado("Abierta")}>
              <RefreshCcw className="size-3.5" />
              Reabrir
            </button>
          ) : (
            <button className={BTN_SECUNDARIO} onClick={() => cambiarEstado("Resuelta")}>
              <CheckCheck className="size-3.5" />
              Resolver
            </button>
          )}
        </div>
      </div>

      {/* Mensajes */}
      <div className="flex-1 space-y-2 overflow-y-auto bg-[radial-gradient(rgba(124,58,237,0.06)_1px,transparent_1px)] bg-[length:18px_18px] px-4 py-3">
        {conv.mensajes.length === 0 && (
          <p className="py-10 text-center text-xs text-muted-foreground">
            Escribí el primer mensaje o elegí una plantilla.
          </p>
        )}
        {conv.mensajes.map((msg, i) => {
          const anterior = conv.mensajes[i - 1];
          const nuevoDia = !anterior || anterior.fecha.slice(0, 10) !== msg.fecha.slice(0, 10);
          return (
            <div key={msg.id}>
              {nuevoDia && (
                <p className="my-2 text-center">
                  <span className="rounded-full bg-white/90 px-2.5 py-0.5 text-[10px] font-semibold text-muted-foreground shadow-sm">
                    {etiquetaDia(msg.fecha.slice(0, 10))}
                  </span>
                </p>
              )}
              <BurbujaMensaje msg={msg} canal={conv.canal} />
            </div>
          );
        })}
        <div ref={finRef} />
      </div>

      {/* Redactar */}
      <div className="border-t border-primary/10 p-3">
        {verPlantillas && (
          <div className="mb-2 max-h-40 overflow-y-auto rounded-xl border border-primary/10 bg-white p-1.5">
            {plantillasCanal.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setTexto(rellenar(p.texto, ctx.datosDe(conv.paciente)));
                  setVerPlantillas(false);
                  setComunicacion("plantillas", (prev) =>
                    prev.map((x) => (x.id === p.id ? { ...x, usos: x.usos + 1 } : x)),
                  );
                }}
                className="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-primary/5"
              >
                <FileText className="mt-0.5 size-3.5 shrink-0 text-primary" />
                <span className="min-w-0">
                  <span className="block text-xs font-semibold">{p.nombre}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {rellenar(p.texto, ctx.datosDe(conv.paciente))}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
        <div className="mb-2 flex flex-wrap gap-1">
          {RESPUESTAS_RAPIDAS.map((r) => (
            <button
              key={r}
              onClick={() => setTexto(r)}
              className="rounded-full border border-primary/15 bg-white px-2 py-0.5 text-[11px] text-muted-foreground hover:border-primary/35 hover:text-primary"
            >
              {r}
            </button>
          ))}
        </div>
        <div
          className={`flex items-end gap-2 rounded-2xl border p-1.5 ${nota ? "border-amber-300 bg-amber-50" : "border-primary/15 bg-white"}`}
        >
          <button
            className={BTN_ICONO}
            aria-label="Plantillas"
            title="Plantillas"
            onClick={() => setVerPlantillas((v) => !v)}
          >
            <Zap className="size-3.5" />
          </button>
          <button
            className={BTN_ICONO}
            aria-label="Adjuntar archivo"
            title="Adjuntar archivo"
            onClick={() => archivoRef.current?.click()}
          >
            <Paperclip className="size-3.5" />
          </button>
          <input
            ref={archivoRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) enviar(texto, f.name);
              e.target.value = "";
            }}
          />
          <textarea
            rows={1}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                enviar(texto);
              }
            }}
            placeholder={
              nota
                ? "Nota interna para el equipo (el paciente no la ve)…"
                : `Escribí por ${conv.canal}…`
            }
            className="max-h-28 min-h-8 flex-1 resize-none bg-transparent px-1 py-1.5 text-sm outline-none placeholder:text-muted-foreground"
          />
          <button
            className={`${BTN_ICONO} ${nota ? "!border-amber-300 !bg-amber-100 !text-amber-700" : ""}`}
            aria-label="Nota interna"
            aria-pressed={nota}
            title="Nota interna"
            onClick={() => setNota((v) => !v)}
          >
            <StickyNote className="size-3.5" />
          </button>
          <button className={BTN_PRIMARIO} onClick={() => enviar(texto)} disabled={!texto.trim()}>
            <Send className="size-3.5" />
            {nota ? "Guardar" : "Enviar"}
          </button>
        </div>
        <p className="mt-1 flex justify-between px-1 text-[10px] text-muted-foreground">
          <span>
            {canalConectado
              ? `Se envía desde ${config.canales[conv.canal].remitente} · Enter envía, Shift+Enter nueva línea`
              : `${conv.canal} desconectado`}
          </span>
          {conv.canal === "SMS" && texto && (
            <span>
              {texto.length} caracteres · {segmentosSMS(texto)} SMS
            </span>
          )}
        </p>
      </div>
    </div>
  );
}

function BurbujaMensaje({ msg, canal }: { msg: Mensaje; canal: Canal }) {
  if (msg.de === "sistema") {
    return (
      <p className="text-center text-[10px] italic text-muted-foreground">
        {msg.texto} · {horaDe(msg.fecha)}
      </p>
    );
  }
  if (msg.de === "nota") {
    return (
      <div className="mx-auto max-w-[85%] rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
        <p className="mb-0.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">
          <StickyNote className="size-3" /> Nota interna{msg.autor ? ` · ${msg.autor}` : ""}
        </p>
        {msg.texto}
      </div>
    );
  }
  const propio = msg.de === "clinica";
  return (
    <div className={`flex ${propio ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[78%] whitespace-pre-line rounded-2xl px-3 py-2 text-sm shadow-sm ${
          propio
            ? `rounded-br-md bg-gradient-to-br text-white ${CANAL_ESTILO[canal].burbuja}`
            : "rounded-bl-md border border-primary/10 bg-white"
        }`}
      >
        {msg.autor && propio && (
          <p className="mb-0.5 text-[10px] font-semibold opacity-80">{msg.autor}</p>
        )}
        {msg.adjunto && (
          <p
            className={`mb-1 flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs ${propio ? "bg-white/15" : "bg-primary/5"}`}
          >
            <Paperclip className="size-3.5" />
            {msg.adjunto}
          </p>
        )}
        {msg.texto}
        <span
          className={`mt-0.5 flex items-center justify-end gap-1 text-[10px] ${propio ? "text-white/75" : "text-muted-foreground"}`}
        >
          {horaDe(msg.fecha)}
          {propio && msg.estado === "enviado" && <Check className="size-3" />}
          {propio && msg.estado === "entregado" && <CheckCheck className="size-3" />}
          {propio && msg.estado === "leido" && <CheckCheck className="size-3 text-sky-200" />}
        </span>
      </div>
    </div>
  );
}

function PanelPaciente({ conv, ctx }: { conv: Conversacion; ctx: Ctx }) {
  const { pacientes, setActivoId } = usePacientes();
  const { turnos } = storeAgenda.usar();
  const { recordatorios } = storeComunicacion.usar();
  const p = pacientes.find((x) => `${x.nombre} ${x.apellido}` === conv.paciente);
  const turno = proximoTurno(turnos, conv.paciente);
  const visitas = turnos.filter(
    (t) => t.paciente === conv.paciente && t.estado === "Atendida",
  ).length;
  const hoy = hoyISO();

  const confirmar = (t: Turno) => {
    setTurnosStore((prev) => prev.map((x) => (x.id === t.id ? { ...x, estado: "Confirmada" } : x)));
    setComunicacion("recordatorios", (prev) => ({
      ...prev,
      [t.id]: { estado: "Confirmado", fecha: new Date().toISOString(), canal: conv.canal },
    }));
    agregarMensaje(conv.id, {
      de: "sistema",
      texto: `Turno del ${formatearFecha(t.fecha)} ${t.hora} confirmado en la agenda`,
    });
    ctx.onToast("Turno confirmado en la agenda");
  };

  return (
    <aside className="card-grad hidden h-[620px] flex-col gap-3 overflow-y-auto p-3.5 xl:flex">
      <div className="text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-gradient-to-br from-primary/25 to-primary/5 text-base font-bold text-primary">
          {iniciales(conv.paciente)}
        </span>
        <p className="mt-2 text-sm font-semibold">{conv.paciente}</p>
        <p className="text-[11px] text-muted-foreground">
          {p ? `DNI ${p.documento.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}` : "Contacto sin ficha"}
        </p>
      </div>
      <dl className="space-y-1.5 rounded-xl bg-white/70 p-3 text-xs">
        {[
          ["Teléfono", p?.telefono ?? conv.telefono],
          ["Correo", p?.email ?? conv.email],
          ["Obra social", p?.obraSocial ?? "—"],
          ["Sucursal", p?.sucursal ?? "—"],
          ["Visitas", String(visitas)],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between gap-2">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="truncate text-right font-medium">{v || "—"}</dd>
          </div>
        ))}
      </dl>
      <div className="rounded-xl border border-primary/15 bg-gradient-to-br from-primary/[0.07] to-transparent p-3">
        <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-primary">
          <CalendarClock className="size-3.5" /> Próximo turno
        </p>
        {turno ? (
          <>
            <p className="mt-1 text-sm font-semibold">
              {turno.fecha === hoy ? "Hoy" : etiquetaDia(turno.fecha)} · {turno.hora} hs
            </p>
            <p className="text-[11px] text-muted-foreground">
              {turno.tratamiento} · {turno.odontologo}
            </p>
            <p className="mt-1.5 flex flex-wrap gap-1">
              <Pill
                clase={
                  turno.estado === "Confirmada"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                }
              >
                {turno.estado}
              </Pill>
              {recordatorios[turno.id] && (
                <Pill clase="bg-sky-100 text-sky-700">
                  Recordatorio {recordatorios[turno.id]?.estado.toLowerCase()}
                </Pill>
              )}
            </p>
            <div className="mt-2 grid gap-1.5 [&>*]:w-full [&>*]:min-w-0">
              {turno.estado !== "Confirmada" && (
                <button className={BTN_PRIMARIO} onClick={() => confirmar(turno)}>
                  <Check className="size-3.5" />
                  Confirmar turno
                </button>
              )}
              <button
                className={BTN_SECUNDARIO}
                onClick={() =>
                  ctx.abrirChat(
                    conv.paciente,
                    conv.canal,
                    storeComunicacion.leer().plantillas[0]?.texto ?? "",
                  )
                }
              >
                <Bell className="size-3.5" />
                Recordatorio
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mt-1 text-xs text-muted-foreground">No tiene turnos próximos.</p>
            <Link to="/demo/agenda" className={`${BTN_SECUNDARIO} mt-2 w-full`}>
              <CalendarClock className="size-3.5" />
              Agendar turno
            </Link>
          </>
        )}
      </div>
      {p && (
        <Link
          to="/demo/pacientes"
          onClick={() => setActivoId(p.id)}
          className={`${BTN_SECUNDARIO} w-full`}
        >
          <FolderOpen className="size-3.5" />
          Abrir carpeta
        </Link>
      )}
      {conv.etiquetas.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            Etiquetas
          </p>
          <p className="mt-1 flex flex-wrap gap-1">
            {conv.etiquetas.map((e) => (
              <Pill key={e} clase="bg-primary/10 text-primary">
                {e}
              </Pill>
            ))}
          </p>
        </div>
      )}
    </aside>
  );
}

/* ───────────── Recordatorios ───────────── */

function Recordatorios({ ctx }: { ctx: Ctx }) {
  const { turnos } = storeAgenda.usar();
  const { recordatorios, config, plantillas } = storeComunicacion.usar();
  const [dias, setDias] = useState<"1" | "3" | "7">("7");
  const hoy = hoyISO();
  const cfg = config.recordatorios;
  const plantilla = plantillas.find((p) => p.id === cfg.plantillaId) ?? plantillas[0];

  const lista = turnos
    .filter(
      (t) =>
        t.fecha >= hoy &&
        t.fecha <= sumarDias(hoy, Number(dias)) &&
        (t.estado === "Pendiente" || t.estado === "Confirmada"),
    )
    .sort((a, b) => `${a.fecha}${a.hora}`.localeCompare(`${b.fecha}${b.hora}`));
  const porDia = lista.reduce<Record<string, Turno[]>>(
    (acc, t) => ({ ...acc, [t.fecha]: [...(acc[t.fecha] ?? []), t] }),
    {},
  );

  const sinEnviar = lista.filter((t) => !recordatorios[t.id] && t.estado === "Pendiente");
  const enviados = lista.filter((t) => recordatorios[t.id]?.estado === "Enviado").length;
  const confirmados = lista.filter((t) => t.estado === "Confirmada").length;
  const reprogramar = lista.filter((t) => recordatorios[t.id]?.estado === "Reprogramar").length;

  const setCfg = (cambios: Partial<typeof cfg>) =>
    setComunicacion("config", (prev) => ({
      ...prev,
      recordatorios: { ...prev.recordatorios, ...cambios },
    }));

  const enviar = (t: Turno, silencioso = false) => {
    if (!config.canales[cfg.canal].conectado) {
      ctx.onToast(`${cfg.canal} está desconectado. Conectalo en "Canales y horarios".`);
      return false;
    }
    const texto = rellenar(plantilla?.texto ?? "Recordatorio de turno {{fecha}} {{hora}}", {
      paciente: t.paciente.split(" ")[0] ?? t.paciente,
      fecha: formatearFecha(t.fecha),
      hora: t.hora,
      profesional: t.odontologo,
      clinica: ctx.clinica,
      tratamiento: t.tratamiento,
    });
    setComunicacion("recordatorios", (prev) => ({
      ...prev,
      [t.id]: { estado: "Enviado", fecha: new Date().toISOString(), canal: cfg.canal },
    }));
    registrarEnvio({
      paciente: t.paciente,
      canal: cfg.canal,
      tipo: "Recordatorio",
      texto,
      estado: "entregado",
    });

    // El mensaje también queda en la conversación del paciente.
    let conv = storeComunicacion.leer().conversaciones.find((c) => c.paciente === t.paciente);
    if (!conv) {
      conv = {
        id: Date.now() + t.id,
        paciente: t.paciente,
        telefono: "",
        email: "",
        canal: cfg.canal,
        estado: "Abierta",
        asignado: "",
        etiquetas: ["Turno"],
        noLeidos: 0,
        fijada: false,
        mensajes: [],
      };
      const nueva = conv;
      setComunicacion("conversaciones", (prev) => [nueva, ...prev]);
    }
    const convId = conv.id;
    agregarMensaje(convId, { de: "clinica", texto, estado: "entregado", autor: "Recordatorio" });

    // Práctica: el paciente responde y el turno se confirma solo en la Agenda.
    window.setTimeout(() => {
      const turnoActual = storeAgenda.leer().turnos.find((x) => x.id === t.id);
      if (!turnoActual || turnoActual.estado !== "Pendiente") return;
      agregarMensaje(convId, { de: "paciente", texto: "SI, confirmo 👍" });
      actualizarConversacion(convId, (c) => ({ ...c, noLeidos: c.noLeidos + 1 }));
      setTurnosStore((prev) =>
        prev.map((x) => (x.id === t.id ? { ...x, estado: "Confirmada" } : x)),
      );
      setComunicacion("recordatorios", (prev) => ({
        ...prev,
        [t.id]: { estado: "Confirmado", fecha: new Date().toISOString(), canal: cfg.canal },
      }));
      ctx.onToast(`${t.paciente} confirmó su turno del ${formatearFecha(t.fecha)}`);
    }, 3500);

    if (!silencioso) ctx.onToast(`Recordatorio enviado a ${t.paciente} por ${cfg.canal}`);
    return true;
  };

  const enviarTodos = () => {
    let n = 0;
    for (const t of sinEnviar) if (enviar(t, true)) n++;
    if (n) ctx.onToast(`${n} recordatorios enviados por ${cfg.canal}`);
  };

  const marcar = (t: Turno, estado: "Confirmado" | "Reprogramar") => {
    if (estado === "Confirmado")
      setTurnosStore((prev) =>
        prev.map((x) => (x.id === t.id ? { ...x, estado: "Confirmada" } : x)),
      );
    setComunicacion("recordatorios", (prev) => ({
      ...prev,
      [t.id]: { estado, fecha: new Date().toISOString(), canal: prev[t.id]?.canal ?? cfg.canal },
    }));
    ctx.onToast(
      estado === "Confirmado"
        ? `Turno de ${t.paciente} confirmado`
        : `${t.paciente} quedó para reprogramar`,
    );
  };

  return (
    <div className="space-y-3">
      <EncabezadoSeccion
        icon={Bell}
        titulo="Recordatorios de turnos"
        descripcion="Conectados con la Agenda: cuando el paciente confirma, el turno se confirma solo."
      >
        <div className="flex rounded-full border border-primary/15 bg-white p-0.5">
          <Filtros
            valor={dias}
            onChange={setDias}
            opciones={[
              { id: "1", label: "Hasta mañana" },
              { id: "3", label: "3 días" },
              { id: "7", label: "7 días" },
            ]}
          />
        </div>
        <button className={BTN_PRIMARIO} onClick={enviarTodos} disabled={sinEnviar.length === 0}>
          <Send className="size-4" />
          Enviar pendientes ({sinEnviar.length})
        </button>
      </EncabezadoSeccion>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
            {[
              { l: "Sin enviar", v: sinEnviar.length, c: "text-amber-600", i: Clock3 },
              { l: "Enviados", v: enviados, c: "text-sky-600", i: Send },
              { l: "Confirmados", v: confirmados, c: "text-emerald-600", i: CalendarCheck2 },
              {
                l: "Para reprogramar",
                v: reprogramar,
                c: reprogramar ? "text-destructive" : "text-foreground",
                i: RefreshCcw,
              },
            ].map((s) => (
              <div key={s.l} className="card-grad flex items-start justify-between p-3.5">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    {s.l}
                  </p>
                  <p className={`mt-1 text-xl font-bold ${s.c}`}>{s.v}</p>
                </div>
                <span className="grid size-8 place-items-center rounded-xl bg-primary/10 text-primary">
                  <s.i className="size-4" />
                </span>
              </div>
            ))}
          </div>

          {lista.length === 0 ? (
            <Vacio
              icon={CalendarClock}
              titulo="No hay turnos en ese rango"
              texto="Los turnos pendientes de la Agenda aparecen acá para recordarlos."
            />
          ) : (
            Object.entries(porDia).map(([dia, ts]) => (
              <div key={dia} className="card-grad overflow-hidden">
                <p className="flex items-center justify-between border-b border-primary/10 bg-primary/[0.04] px-4 py-2 text-xs font-bold">
                  <span>{etiquetaDia(dia)}</span>
                  <span className="font-medium text-muted-foreground">
                    {ts.length} {ts.length === 1 ? "turno" : "turnos"}
                  </span>
                </p>
                <ul className="divide-y divide-primary/[0.07]">
                  {ts.map((t) => {
                    const r = recordatorios[t.id];
                    const estado =
                      t.estado === "Confirmada" ? "Confirmado" : (r?.estado ?? "Sin enviar");
                    const clase =
                      estado === "Confirmado"
                        ? "bg-emerald-100 text-emerald-700"
                        : estado === "Enviado"
                          ? "bg-sky-100 text-sky-700"
                          : estado === "Reprogramar"
                            ? "bg-destructive/10 text-destructive"
                            : "bg-amber-100 text-amber-700";
                    return (
                      <li key={t.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                        <span className="w-12 shrink-0 text-sm font-bold text-primary">
                          {t.hora}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold">{t.paciente}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {t.tratamiento} · {t.odontologo} · {t.sucursal}
                          </p>
                        </div>
                        <Pill clase={clase}>
                          {estado}
                          {r && estado !== "Confirmado" ? ` · ${cuandoCorto(r.fecha)}` : ""}
                        </Pill>
                        <div className="flex flex-wrap gap-1.5">
                          {estado === "Sin enviar" && (
                            <button className={BTN_SECUNDARIO} onClick={() => enviar(t)}>
                              <Send className="size-3.5" />
                              Enviar
                            </button>
                          )}
                          {(estado === "Enviado" || estado === "Reprogramar") && (
                            <button
                              className={BTN_SECUNDARIO}
                              onClick={() => marcar(t, "Confirmado")}
                            >
                              <Check className="size-3.5" />
                              Confirmar
                            </button>
                          )}
                          {estado === "Enviado" && (
                            <button
                              className={BTN_SECUNDARIO}
                              onClick={() => marcar(t, "Reprogramar")}
                            >
                              <RefreshCcw className="size-3.5" />
                              Reprogramar
                            </button>
                          )}
                          <button
                            className={BTN_ICONO}
                            aria-label="Ver conversación"
                            title="Ver conversación"
                            onClick={() => ctx.abrirChat(t.paciente, r?.canal ?? cfg.canal)}
                          >
                            <MessageCircle className="size-3.5" />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </div>

        {/* Configuración de envío automático */}
        <div className="card-grad h-fit space-y-3 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="size-4 text-primary" /> Envío automático
            </p>
            <Interruptor
              activo={cfg.activo}
              onChange={(v) => {
                setCfg({ activo: v });
                ctx.onToast(
                  v ? "Recordatorios automáticos activados" : "Recordatorios automáticos pausados",
                );
              }}
              etiqueta="Recordatorios automáticos"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {cfg.activo
              ? `Cada turno recibe un aviso ${cfg.anticipacion} h antes por ${cfg.canal}.`
              : "Pausado: los recordatorios se envían solo a mano."}
          </p>
          <Field label="Anticipación">
            <Select
              value={String(cfg.anticipacion) as "24" | "48" | "72"}
              onChange={(v) => setCfg({ anticipacion: Number(v) as 24 | 48 | 72 })}
              opciones={[
                { value: "24", label: "24 horas antes" },
                { value: "48", label: "48 horas antes" },
                { value: "72", label: "72 horas antes" },
              ]}
            />
          </Field>
          <Field label="Canal">
            <Select
              value={cfg.canal}
              onChange={(v) => setCfg({ canal: v })}
              opciones={CANALES.map((c) => ({
                value: c,
                label: config.canales[c].conectado ? c : `${c} (desconectado)`,
              }))}
            />
          </Field>
          <Field label="Plantilla">
            <Select
              value={String(cfg.plantillaId)}
              onChange={(v) => setCfg({ plantillaId: Number(v) })}
              opciones={plantillas
                .filter((p) => p.categoria === "Turnos")
                .map((p) => ({ value: String(p.id), label: p.nombre }))}
            />
          </Field>
          <label className="flex items-center justify-between gap-2 text-xs">
            <span>Segundo aviso 2 h antes</span>
            <Interruptor
              activo={cfg.segundoAviso}
              onChange={(v) => setCfg({ segundoAviso: v })}
              etiqueta="Segundo aviso"
            />
          </label>
          {plantilla && (
            <div className="rounded-xl border border-primary/10 bg-white p-3">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                Vista previa
              </p>
              <p className="whitespace-pre-line text-xs">
                {rellenar(plantilla.texto, {
                  paciente: "Lucía",
                  fecha: formatearFecha(sumarDias(hoy, 1)),
                  hora: "10:30",
                  profesional: "Dra. Laura Gómez",
                  clinica: ctx.clinica,
                  tratamiento: "Limpieza dental",
                })}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ───────────── Plantillas ───────────── */

function TextoConVariables({ texto }: { texto: string }) {
  const partes = texto.split(/(\{\{\w+\}\})/g);
  return (
    <>
      {partes.map((p, i) =>
        /^\{\{\w+\}\}$/.test(p) ? (
          <span key={i} className="rounded bg-primary/10 px-1 font-semibold text-primary">
            {p.slice(2, -2)}
          </span>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

function Plantillas({ ctx }: { ctx: Ctx }) {
  const { plantillas } = storeComunicacion.usar();
  const [categoria, setCategoria] = useState<"" | CategoriaPlantilla>("");
  const [canal, setCanal] = useState<"" | Canal>("");
  const [busqueda, setBusqueda] = useState("");
  const [editar, setEditar] = useState<Plantilla | null>(null);
  const [abierto, setAbierto] = useState(false);
  const texto = normalizarBusqueda(busqueda);

  const lista = plantillas.filter(
    (p) =>
      (!categoria || p.categoria === categoria) &&
      (!canal || p.canal === canal) &&
      (!texto || normalizarBusqueda(`${p.nombre} ${p.texto}`).includes(texto)),
  );

  return (
    <div className="space-y-3">
      <EncabezadoSeccion
        icon={FileText}
        titulo="Plantillas de mensajes"
        descripcion="Textos listos con variables que se completan solas con los datos del paciente y del turno."
      >
        <button className={BTN_PRIMARIO} onClick={() => setAbierto(true)}>
          <Plus className="size-4" />
          Nueva plantilla
        </button>
      </EncabezadoSeccion>

      <div className="card-grad flex flex-wrap items-center gap-1.5 p-2">
        <Filtros
          valor={categoria}
          onChange={setCategoria}
          opciones={[
            { id: "", label: `Todas (${plantillas.length})` },
            ...CATEGORIAS_PLANTILLA.map((c) => ({ id: c, label: c })),
          ]}
        />
        <div className="ml-auto flex flex-wrap gap-1.5">
          <select
            value={canal}
            onChange={(e) => setCanal(e.target.value as "" | Canal)}
            className="h-8 rounded-full border border-border bg-background px-3 text-xs outline-none"
            aria-label="Canal"
          >
            <option value="">Todos los canales</option>
            {CANALES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar plantilla"
            className="h-8 w-44 rounded-full border border-border bg-background px-3 text-xs outline-none focus:border-primary"
          />
        </div>
      </div>

      {lista.length === 0 ? (
        <Vacio
          icon={FileText}
          titulo="No hay plantillas"
          texto="Probá con otro filtro o creá una nueva."
        />
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {lista.map((p) => (
            <li
              key={p.id}
              className="card-grad flex flex-col p-4 transition-all hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{p.nombre}</p>
                  <p className="mt-1 flex flex-wrap gap-1">
                    <ChipCanal canal={p.canal} compacto />
                    <Pill clase="bg-muted !py-0 !text-[10px] text-muted-foreground">
                      {p.categoria}
                    </Pill>
                  </p>
                </div>
                <span className="shrink-0 text-right">
                  <span className="block text-sm font-bold text-primary">
                    {p.usos.toLocaleString("es-AR")}
                  </span>
                  <span className="text-[10px] text-muted-foreground">usos</span>
                </span>
              </div>
              {p.asunto && (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Asunto: <TextoConVariables texto={p.asunto} />
                </p>
              )}
              <p className="mt-2 flex-1 rounded-xl bg-white/80 p-2.5 text-xs leading-5">
                <TextoConVariables texto={p.texto} />
              </p>
              <div className="mt-3 flex flex-wrap items-center justify-end gap-1.5 border-t border-primary/10 pt-2.5">
                <button
                  className={BTN_SECUNDARIO}
                  onClick={() => {
                    navigator.clipboard?.writeText(p.texto).catch(() => {});
                    ctx.onToast("Plantilla copiada");
                  }}
                >
                  <Copy className="size-3.5" />
                  Copiar
                </button>
                <button
                  className={BTN_SECUNDARIO}
                  onClick={() => {
                    setComunicacion("plantillas", (prev) => [
                      ...prev,
                      { ...p, id: Date.now(), nombre: `${p.nombre} (copia)`, usos: 0 },
                    ]);
                    ctx.onToast("Plantilla duplicada");
                  }}
                >
                  <Plus className="size-3.5" />
                  Duplicar
                </button>
                <button className={BTN_SECUNDARIO} onClick={() => setEditar(p)}>
                  <Pencil className="size-3.5" />
                  Editar
                </button>
                <button
                  className={`${BTN_ICONO} hover:!border-destructive/30 hover:!bg-destructive/10 hover:!text-destructive`}
                  aria-label="Eliminar plantilla"
                  onClick={() => {
                    setComunicacion("plantillas", (prev) => prev.filter((x) => x.id !== p.id));
                    ctx.onToast("Plantilla eliminada");
                  }}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {(abierto || editar) && (
        <Modal
          titulo={editar ? "Editar plantilla" : "Nueva plantilla"}
          onClose={() => {
            setAbierto(false);
            setEditar(null);
          }}
          ancho="max-w-3xl"
        >
          <PlantillaForm
            inicial={editar}
            clinica={ctx.clinica}
            onCancel={() => {
              setAbierto(false);
              setEditar(null);
            }}
            onSubmit={(datos) => {
              if (editar)
                setComunicacion("plantillas", (prev) =>
                  prev.map((x) => (x.id === editar.id ? { ...x, ...datos } : x)),
                );
              else
                setComunicacion("plantillas", (prev) => [
                  ...prev,
                  { ...datos, id: Date.now(), usos: 0 },
                ]);
              ctx.onToast(editar ? "Plantilla actualizada" : "Plantilla creada");
              setAbierto(false);
              setEditar(null);
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function PlantillaForm({
  inicial,
  clinica,
  onSubmit,
  onCancel,
}: {
  inicial: Plantilla | null;
  clinica: string;
  onSubmit: (p: Omit<Plantilla, "id" | "usos">) => void;
  onCancel: () => void;
}) {
  const [nombre, setNombre] = useState(inicial?.nombre ?? "");
  const [categoria, setCategoria] = useState<CategoriaPlantilla>(inicial?.categoria ?? "Turnos");
  const [canal, setCanal] = useState<Canal>(inicial?.canal ?? "WhatsApp");
  const [asunto, setAsunto] = useState(inicial?.asunto ?? "");
  const [texto, setTexto] = useState(inicial?.texto ?? "Hola {{paciente}}, ");
  const areaRef = useRef<HTMLTextAreaElement>(null);

  const insertar = (v: string) => {
    const el = areaRef.current;
    const token = `{{${v}}}`;
    if (!el) return setTexto((t) => t + token);
    const ini = el.selectionStart;
    const fin = el.selectionEnd;
    setTexto((t) => t.slice(0, ini) + token + t.slice(fin));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(ini + token.length, ini + token.length);
    });
  };

  const ejemplo: DatosVariables = {
    paciente: "Lucía",
    fecha: formatearFecha(sumarDias(hoyISO(), 1)),
    hora: "10:30",
    profesional: "Dra. Laura Gómez",
    clinica,
    tratamiento: "Limpieza dental",
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          nombre: nombre.trim(),
          categoria,
          canal,
          texto: texto.trim(),
          ...(canal === "Email" && asunto.trim() ? { asunto: asunto.trim() } : {}),
        });
      }}
      className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_280px]"
    >
      <div className="space-y-3">
        <Field label="Nombre *">
          <input
            autoFocus
            required
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className={INPUT}
            placeholder="Ej: Recordatorio de control"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Categoría">
            <Select
              value={categoria}
              onChange={setCategoria}
              opciones={CATEGORIAS_PLANTILLA.map((c) => ({ value: c, label: c }))}
            />
          </Field>
          <Field label="Canal">
            <Select
              value={canal}
              onChange={setCanal}
              opciones={CANALES.map((c) => ({ value: c, label: c }))}
            />
          </Field>
        </div>
        {canal === "Email" && (
          <Field label="Asunto del correo">
            <input
              value={asunto}
              onChange={(e) => setAsunto(e.target.value)}
              className={INPUT}
              placeholder="Ej: Tu turno en {{clinica}}"
            />
          </Field>
        )}
        <Field
          label="Mensaje *"
          ayuda={
            canal === "SMS"
              ? `${texto.length} caracteres · ${segmentosSMS(texto)} SMS (160 caracteres por SMS)`
              : `${texto.length} caracteres`
          }
        >
          <textarea
            ref={areaRef}
            required
            rows={6}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            className={TEXTAREA}
          />
        </Field>
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Insertar variable
          </p>
          <div className="flex flex-wrap gap-1">
            {VARIABLES.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => insertar(v)}
                className="rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 text-[11px] font-semibold text-primary hover:bg-primary/10"
              >
                + {v}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Así lo ve el paciente
        </p>
        <div className="rounded-2xl border border-primary/10 bg-[radial-gradient(rgba(124,58,237,0.07)_1px,transparent_1px)] bg-[length:16px_16px] p-3">
          {canal === "Email" && asunto && (
            <p className="mb-2 rounded-lg bg-white px-2 py-1 text-[11px] font-semibold">
              {rellenar(asunto, ejemplo)}
            </p>
          )}
          <div
            className={`ml-auto max-w-[95%] whitespace-pre-line rounded-2xl rounded-br-md bg-gradient-to-br px-3 py-2 text-xs text-white shadow ${CANAL_ESTILO[canal].burbuja}`}
          >
            {rellenar(texto, ejemplo) || "…"}
          </div>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Las variables se reemplazan con los datos reales del paciente y su próximo turno.
        </p>
        <div className="mt-3">
          <Acciones
            etiqueta={inicial ? "Guardar cambios" : "Crear plantilla"}
            onCancel={onCancel}
          />
        </div>
      </div>
    </form>
  );
}

/* ───────────── Campañas ───────────── */

function CampanasBloqueadas() {
  return (
    <div className="card-grad grid min-h-64 place-items-center p-8 text-center">
      <div className="max-w-md">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
          <Lock className="size-5" />
        </span>
        <p className="mt-3 text-base font-semibold">Campañas masivas</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Enviá mensajes a grupos de pacientes (control semestral, cumpleaños, por obra social) y
          medí cuántos sacaron turno. Disponible desde el plan{" "}
          <b className="text-foreground">{PLANS.avanzada.name}</b>.
        </p>
      </div>
    </div>
  );
}

function useAudiencia() {
  const { pacientes } = usePacientes();
  const { turnos } = storeAgenda.usar();
  return (audiencia: Audiencia, filtro: string) => {
    const hoy = hoyISO();
    const hace6m = sumarDias(hoy, -180);
    const mes = hoy.slice(5, 7);
    return pacientes.filter((p) => {
      if (p.estado !== "Activo") return false;
      const nombre = `${p.nombre} ${p.apellido}`;
      if (audiencia === "obra-social") return p.obraSocial === filtro;
      if (audiencia === "sucursal") return p.sucursal === filtro;
      if (audiencia === "cumpleanos") return p.fechaNacimiento.slice(5, 7) === mes;
      if (audiencia === "sin-visita")
        return !turnos.some((t) => t.paciente === nombre && t.fecha >= hace6m);
      return true;
    });
  };
}

function Campanas({ ctx }: { ctx: Ctx }) {
  const { campanas, config } = storeComunicacion.usar();
  const audienciaDe = useAudiencia();
  const [editar, setEditar] = useState<Campana | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [filtro, setFiltro] = useState<"" | Campana["estado"]>("");

  const lista = campanas.filter((c) => !filtro || c.estado === filtro);
  const enviadas = campanas.filter((c) => c.estado === "Enviada");
  const totalEnviados = enviadas.reduce((a, c) => a + c.destinatarios, 0);
  const totalLeidos = enviadas.reduce((a, c) => a + c.leidos, 0);
  const totalTurnos = enviadas.reduce((a, c) => a + c.turnos, 0);

  const enviarAhora = (c: Campana) => {
    if (!config.canales[c.canal].conectado) {
      ctx.onToast(`${c.canal} está desconectado. Conectalo en "Canales y horarios".`);
      return;
    }
    const destinatarios = audienciaDe(c.audiencia, c.filtro);
    if (destinatarios.length === 0) {
      ctx.onToast("La audiencia elegida no tiene pacientes");
      return;
    }
    const n = destinatarios.length;
    setComunicacion("campanas", (prev) =>
      prev.map((x) =>
        x.id === c.id
          ? {
              ...x,
              estado: "Enviada",
              programada: new Date().toISOString(),
              destinatarios: n,
              entregados: Math.round(n * 0.96),
              leidos: Math.round(n * 0.78),
              respondidos: Math.round(n * 0.3),
              turnos: Math.round(n * 0.15),
            }
          : x,
      ),
    );
    setComunicacion("envios", (prev) => [
      ...destinatarios.map((p, i) => ({
        id: Date.now() + i,
        fecha: new Date().toISOString(),
        paciente: `${p.nombre} ${p.apellido}`,
        canal: c.canal,
        tipo: "Campaña" as TipoEnvio,
        texto: c.nombre,
        estado: (i % 25 === 24 ? "fallido" : i % 5 === 0 ? "entregado" : "leido") as EstadoEntrega,
      })),
      ...prev,
    ]);
    setComunicacion("config", (prev) => ({
      ...prev,
      canales: {
        ...prev.canales,
        [c.canal]: { ...prev.canales[c.canal], enviadosMes: prev.canales[c.canal].enviadosMes + n },
      },
    }));
    ctx.onToast(`Campaña enviada a ${n} pacientes`);
  };

  return (
    <div className="space-y-3">
      <EncabezadoSeccion
        icon={Megaphone}
        titulo="Campañas"
        descripcion="Mensajes a grupos de pacientes, programados o inmediatos, con resultados medibles."
      >
        <button className={BTN_PRIMARIO} onClick={() => setAbierto(true)}>
          <Plus className="size-4" />
          Nueva campaña
        </button>
      </EncabezadoSeccion>

      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        {[
          { l: "Campañas enviadas", v: String(enviadas.length), i: Megaphone },
          { l: "Mensajes enviados", v: totalEnviados.toLocaleString("es-AR"), i: Send },
          {
            l: "Tasa de lectura",
            v: `${totalEnviados ? Math.round((totalLeidos / totalEnviados) * 100) : 0}%`,
            i: CheckCheck,
          },
          { l: "Turnos generados", v: String(totalTurnos), i: CalendarCheck2 },
        ].map((s) => (
          <div key={s.l} className="card-grad flex items-start justify-between p-3.5">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {s.l}
              </p>
              <p className="mt-1 text-xl font-bold">{s.v}</p>
            </div>
            <span className="grid size-8 place-items-center rounded-xl bg-primary/10 text-primary">
              <s.i className="size-4" />
            </span>
          </div>
        ))}
      </div>

      <div className="card-grad flex flex-wrap gap-1.5 p-2">
        <Filtros
          valor={filtro}
          onChange={setFiltro}
          opciones={[
            { id: "", label: `Todas (${campanas.length})` },
            { id: "Borrador", label: "Borradores" },
            { id: "Programada", label: "Programadas" },
            { id: "Enviada", label: "Enviadas" },
          ]}
        />
      </div>

      {lista.length === 0 ? (
        <Vacio
          icon={Megaphone}
          titulo="No hay campañas"
          texto="Creá una campaña para llegar a un grupo de pacientes."
        />
      ) : (
        <ul className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {lista.map((c) => {
            const audiencia = AUDIENCIAS.find((a) => a.id === c.audiencia);
            const alcance =
              c.estado === "Enviada" ? c.destinatarios : audienciaDe(c.audiencia, c.filtro).length;
            const barras = [
              { l: "Entregados", v: c.entregados, color: "from-sky-400 to-sky-500" },
              { l: "Leídos", v: c.leidos, color: "from-primary to-violet-500" },
              { l: "Respondieron", v: c.respondidos, color: "from-amber-400 to-amber-500" },
              { l: "Sacaron turno", v: c.turnos, color: "from-emerald-400 to-emerald-500" },
            ];
            return (
              <li key={c.id} className="card-grad flex flex-col p-4">
                <div className="flex items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary/15 to-primary/[0.03] text-primary ring-1 ring-primary/15">
                    <Megaphone className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{c.nombre}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-1">
                      <ChipCanal canal={c.canal} compacto />
                      <Pill
                        clase={`${c.estado === "Enviada" ? "bg-emerald-100 text-emerald-700" : c.estado === "Programada" ? "bg-sky-100 text-sky-700" : "bg-muted text-muted-foreground"} !py-0 !text-[10px]`}
                      >
                        {c.estado}
                      </Pill>
                      <span className="text-[11px] text-muted-foreground">
                        {audiencia?.label}
                        {c.filtro ? `: ${c.filtro}` : ""} · {alcance}{" "}
                        {alcance === 1 ? "paciente" : "pacientes"}
                      </span>
                    </p>
                  </div>
                </div>
                <p className="mt-2 line-clamp-2 rounded-xl bg-white/80 px-2.5 py-1.5 text-xs text-muted-foreground">
                  <TextoConVariables texto={c.texto} />
                </p>
                {c.estado === "Enviada" ? (
                  <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
                    {barras.map((b) => {
                      const pct = c.destinatarios ? Math.round((b.v / c.destinatarios) * 100) : 0;
                      return (
                        <div key={b.l}>
                          <p className="flex justify-between text-[11px]">
                            <span className="text-muted-foreground">{b.l}</span>
                            <span className="font-semibold">
                              {b.v} · {pct}%
                            </span>
                          </p>
                          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-primary/10">
                            <div
                              className={`h-full rounded-full bg-gradient-to-r ${b.color}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-muted-foreground">
                    {c.estado === "Programada" && c.programada
                      ? `Se envía el ${formatearFecha(c.programada)} a las ${c.programada.slice(11, 16)} hs.`
                      : c.estado === "Programada"
                        ? "Se envía automáticamente el primer día de cada mes."
                        : "Borrador: revisalo y envialo cuando quieras."}
                  </p>
                )}
                <div className="min-h-3 flex-1" />
                <div className="flex flex-wrap items-center justify-end gap-1.5 border-t border-primary/10 pt-2.5">
                  {c.estado !== "Enviada" && (
                    <button className={BTN_PRIMARIO} onClick={() => enviarAhora(c)}>
                      <Send className="size-3.5" />
                      Enviar ahora
                    </button>
                  )}
                  <button
                    className={BTN_SECUNDARIO}
                    onClick={() => {
                      setComunicacion("campanas", (prev) => [
                        ...prev,
                        {
                          ...c,
                          id: Date.now(),
                          nombre: `${c.nombre} (copia)`,
                          estado: "Borrador",
                          programada: "",
                          destinatarios: 0,
                          entregados: 0,
                          leidos: 0,
                          respondidos: 0,
                          turnos: 0,
                        },
                      ]);
                      ctx.onToast("Campaña duplicada como borrador");
                    }}
                  >
                    <Copy className="size-3.5" />
                    Duplicar
                  </button>
                  {c.estado !== "Enviada" && (
                    <button className={BTN_SECUNDARIO} onClick={() => setEditar(c)}>
                      <Pencil className="size-3.5" />
                      Editar
                    </button>
                  )}
                  <button
                    className={`${BTN_ICONO} hover:!border-destructive/30 hover:!bg-destructive/10 hover:!text-destructive`}
                    aria-label="Eliminar campaña"
                    onClick={() => {
                      setComunicacion("campanas", (prev) => prev.filter((x) => x.id !== c.id));
                      ctx.onToast("Campaña eliminada");
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {(abierto || editar) && (
        <Modal
          titulo={editar ? "Editar campaña" : "Nueva campaña"}
          onClose={() => {
            setAbierto(false);
            setEditar(null);
          }}
          ancho="max-w-2xl"
        >
          <CampanaForm
            inicial={editar}
            onCancel={() => {
              setAbierto(false);
              setEditar(null);
            }}
            onSubmit={(datos, enviar) => {
              const id = editar?.id ?? Date.now();
              const base: Campana = {
                ...datos,
                id,
                destinatarios: 0,
                entregados: 0,
                leidos: 0,
                respondidos: 0,
                turnos: 0,
              };
              if (editar)
                setComunicacion("campanas", (prev) => prev.map((x) => (x.id === id ? base : x)));
              else setComunicacion("campanas", (prev) => [base, ...prev]);
              setAbierto(false);
              setEditar(null);
              if (enviar) enviarAhora(base);
              else
                ctx.onToast(
                  datos.estado === "Programada"
                    ? "Campaña programada"
                    : "Campaña guardada como borrador",
                );
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function CampanaForm({
  inicial,
  onSubmit,
  onCancel,
}: {
  inicial: Campana | null;
  onSubmit: (
    c: Omit<Campana, "id" | "destinatarios" | "entregados" | "leidos" | "respondidos" | "turnos">,
    enviar: boolean,
  ) => void;
  onCancel: () => void;
}) {
  const { pacientes } = usePacientes();
  const { plantillas } = storeComunicacion.usar();
  const audienciaDe = useAudiencia();
  const obras = [...new Set(pacientes.map((p) => p.obraSocial).filter(Boolean))];
  const sucursales = [...new Set(pacientes.map((p) => p.sucursal).filter(Boolean))];
  const [nombre, setNombre] = useState(inicial?.nombre ?? "");
  const [canal, setCanal] = useState<Canal>(inicial?.canal ?? "WhatsApp");
  const [audiencia, setAudiencia] = useState<Audiencia>(inicial?.audiencia ?? "activos");
  const [filtro, setFiltro] = useState(inicial?.filtro ?? "");
  const [texto, setTexto] = useState(inicial?.texto ?? "");
  const [cuando, setCuando] = useState<"ahora" | "programar" | "borrador">(
    inicial?.estado === "Programada" ? "programar" : "borrador",
  );
  const [fecha, setFecha] = useState(
    inicial?.programada ? inicial.programada.slice(0, 10) : sumarDias(hoyISO(), 1),
  );
  const [hora, setHora] = useState(
    inicial?.programada ? inicial.programada.slice(11, 16) : "10:00",
  );
  const [error, setError] = useState("");

  const opcionesFiltro =
    audiencia === "obra-social" ? obras : audiencia === "sucursal" ? sucursales : [];
  const filtroEfectivo = opcionesFiltro.length
    ? opcionesFiltro.includes(filtro)
      ? filtro
      : (opcionesFiltro[0] ?? "")
    : "";
  const alcance = audienciaDe(audiencia, filtroEfectivo);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!texto.trim()) return setError("Escribí el mensaje o elegí una plantilla.");
        if (cuando === "programar" && `${fecha}T${hora}` <= new Date().toISOString().slice(0, 16))
          return setError("La fecha programada tiene que ser futura.");
        onSubmit(
          {
            nombre: nombre.trim(),
            canal,
            audiencia,
            filtro: filtroEfectivo,
            texto: texto.trim(),
            estado: cuando === "programar" ? "Programada" : "Borrador",
            programada: cuando === "programar" ? `${fecha}T${hora}` : "",
          },
          cuando === "ahora",
        );
      }}
      className="space-y-3"
    >
      <Field label="Nombre de la campaña *">
        <input
          autoFocus
          required
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className={INPUT}
          placeholder="Ej: Control semestral de octubre"
        />
      </Field>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Canal">
          <Select
            value={canal}
            onChange={setCanal}
            opciones={CANALES.map((c) => ({ value: c, label: c }))}
          />
        </Field>
        <Field label="Audiencia">
          <Select
            value={audiencia}
            onChange={setAudiencia}
            opciones={AUDIENCIAS.map((a) => ({ value: a.id, label: a.label }))}
          />
        </Field>
        {opcionesFiltro.length > 0 ? (
          <Field label={audiencia === "obra-social" ? "Obra social" : "Sucursal"}>
            <Select
              value={filtroEfectivo}
              onChange={setFiltro}
              opciones={opcionesFiltro.map((o) => ({ value: o, label: o }))}
            />
          </Field>
        ) : (
          <div className="rounded-xl border border-primary/15 bg-primary/[0.05] px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-primary">Alcance</p>
            <p className="text-lg font-bold">
              {alcance.length}{" "}
              <span className="text-xs font-medium text-muted-foreground">pacientes</span>
            </p>
          </div>
        )}
      </div>
      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <UserRound className="size-3.5" />
        {AUDIENCIAS.find((a) => a.id === audiencia)?.ayuda}{" "}
        {opcionesFiltro.length > 0 && (
          <b className="text-foreground">{alcance.length} pacientes.</b>
        )}
        {alcance.length > 0 &&
          ` Ej: ${alcance
            .slice(0, 3)
            .map((p) => `${p.nombre} ${p.apellido}`)
            .join(", ")}${alcance.length > 3 ? "…" : ""}`}
      </p>
      <Field label="Mensaje *">
        <div className="mb-1.5 flex flex-wrap gap-1">
          {plantillas
            .filter((p) => p.categoria === "Marketing" || p.categoria === "Seguimiento")
            .map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setTexto(p.texto)}
                className="rounded-full border border-primary/15 bg-white px-2 py-0.5 text-[11px] text-muted-foreground hover:border-primary/35 hover:text-primary"
              >
                {p.nombre}
              </button>
            ))}
        </div>
        <textarea
          rows={4}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          className={TEXTAREA}
          placeholder="Hola {{paciente}}, …"
        />
      </Field>
      <div className="grid grid-cols-3 gap-1.5 rounded-2xl border border-primary/10 bg-primary/[0.03] p-1">
        {(
          [
            ["borrador", "Guardar borrador"],
            ["programar", "Programar"],
            ["ahora", "Enviar ahora"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setCuando(id)}
            className={`rounded-xl py-1.5 text-xs font-semibold ${cuando === id ? "bg-white text-primary shadow" : "text-muted-foreground"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {cuando === "programar" && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Fecha">
            <input
              type="date"
              min={hoyISO()}
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className={INPUT}
            />
          </Field>
          <Field label="Hora">
            <input
              type="time"
              value={hora}
              onChange={(e) => setHora(e.target.value)}
              className={INPUT}
            />
          </Field>
        </div>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Acciones
        etiqueta={
          cuando === "ahora"
            ? `Enviar a ${alcance.length}`
            : cuando === "programar"
              ? "Programar campaña"
              : "Guardar borrador"
        }
        onCancel={onCancel}
        icon={cuando === "ahora" ? Send : Check}
      />
    </form>
  );
}

/* ───────────── Historial ───────────── */

function Historial({ ctx }: { ctx: Ctx }) {
  const { envios } = storeComunicacion.usar();
  const [busqueda, setBusqueda] = useState("");
  const [canal, setCanal] = useState<"" | Canal>("");
  const [tipo, setTipo] = useState<"" | TipoEnvio>("");
  const [estado, setEstado] = useState<"" | EstadoEntrega>("");
  const [limite, setLimite] = useState(25);
  const texto = normalizarBusqueda(busqueda);

  const lista = useMemo(
    () =>
      envios.filter(
        (e) =>
          (!canal || e.canal === canal) &&
          (!tipo || e.tipo === tipo) &&
          (!estado || e.estado === estado) &&
          (!texto || normalizarBusqueda(`${e.paciente} ${e.texto}`).includes(texto)),
      ),
    [envios, canal, tipo, estado, texto],
  );
  const fallidos = envios.filter((e) => e.estado === "fallido").length;

  const exportar = () => {
    const filas = [
      ["Fecha", "Hora", "Paciente", "Canal", "Tipo", "Estado", "Mensaje"],
      ...lista.map((e) => [
        formatearFecha(e.fecha.slice(0, 10)),
        horaDe(e.fecha),
        e.paciente,
        e.canal,
        e.tipo,
        ESTADO_ENVIO[e.estado].label,
        e.texto.replace(/\s+/g, " "),
      ]),
    ];
    const csv = filas.map((f) => f.map((c) => `"${c.replace(/"/g, '""')}"`).join(";")).join("\n");
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `envios-${hoyISO()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    ctx.onToast(`${lista.length} envíos exportados`);
  };

  return (
    <div className="space-y-3">
      <EncabezadoSeccion
        icon={Clock3}
        titulo="Historial de envíos"
        descripcion="Todo lo que salió de la clínica: mensajes, recordatorios, campañas y envíos automáticos."
      >
        {fallidos > 0 && (
          <button className={BTN_SECUNDARIO} onClick={() => setEstado("fallido")}>
            <X className="size-3.5 text-destructive" />
            {fallidos} fallidos
          </button>
        )}
        <button className={BTN_SECUNDARIO} onClick={exportar}>
          <Download className="size-4" />
          Exportar
        </button>
      </EncabezadoSeccion>

      <div className="card-grad flex flex-wrap items-center gap-2 p-2">
        <div className="relative min-w-52 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-primary/60" />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar paciente o mensaje"
            className={`${INPUT} h-8 pl-8`}
          />
        </div>
        {(
          [
            [canal, setCanal, [["", "Todos los canales"], ...CANALES.map((c) => [c, c])], "Canal"],
            [
              tipo,
              setTipo,
              [
                ["", "Todos los tipos"],
                ["Mensaje", "Mensaje"],
                ["Recordatorio", "Recordatorio"],
                ["Campaña", "Campaña"],
                ["Automático", "Automático"],
              ],
              "Tipo",
            ],
            [
              estado,
              setEstado,
              [
                ["", "Todos los estados"],
                ...Object.entries(ESTADO_ENVIO).map(([k, v]) => [k, v.label]),
              ],
              "Estado",
            ],
          ] as [string, (v: never) => void, string[][], string][]
        ).map(([valor, set, opciones, etiqueta]) => (
          <select
            key={etiqueta}
            aria-label={etiqueta}
            value={valor}
            onChange={(e) => (set as (v: string) => void)(e.target.value)}
            className="h-8 rounded-full border border-border bg-background px-3 text-xs outline-none"
          >
            {opciones.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        ))}
      </div>

      {lista.length === 0 ? (
        <Vacio
          icon={Clock3}
          titulo="Sin envíos"
          texto="No hay envíos que coincidan con los filtros."
        />
      ) : (
        <div className="card-grad overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead className="bg-primary/[0.04] text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Fecha</th>
                  <th className="px-3 py-2.5 font-semibold">Paciente</th>
                  <th className="px-3 py-2.5 font-semibold">Canal</th>
                  <th className="px-3 py-2.5 font-semibold">Tipo</th>
                  <th className="px-3 py-2.5 font-semibold">Mensaje</th>
                  <th className="px-3 py-2.5 font-semibold">Estado</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/[0.07]">
                {lista.slice(0, limite).map((e) => (
                  <tr key={e.id} className="hover:bg-primary/[0.025]">
                    <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">
                      {formatearFecha(e.fecha.slice(0, 10))} · {horaDe(e.fecha)}
                    </td>
                    <td className="px-3 py-2.5 font-semibold">{e.paciente}</td>
                    <td className="px-3 py-2.5">
                      <ChipCanal canal={e.canal} compacto />
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">{e.tipo}</td>
                    <td
                      className="max-w-[320px] truncate px-3 py-2.5 text-muted-foreground"
                      title={e.texto}
                    >
                      {e.texto}
                    </td>
                    <td className="px-3 py-2.5">
                      <Pill clase={ESTADO_ENVIO[e.estado].clase}>
                        {ESTADO_ENVIO[e.estado].label}
                      </Pill>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {e.estado === "fallido" ? (
                        <button
                          className={BTN_SECUNDARIO}
                          onClick={() => {
                            setComunicacion("envios", (prev) =>
                              prev.map((x) => (x.id === e.id ? { ...x, estado: "entregado" } : x)),
                            );
                            ctx.onToast(`Reenviado a ${e.paciente}`);
                          }}
                        >
                          <RefreshCcw className="size-3.5" />
                          Reintentar
                        </button>
                      ) : (
                        <button
                          className={BTN_ICONO}
                          aria-label="Ver conversación"
                          title="Ver conversación"
                          onClick={() => ctx.abrirChat(e.paciente, e.canal)}
                        >
                          <MessageCircle className="size-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="flex items-center justify-between border-t border-primary/10 px-4 py-2 text-[11px] text-muted-foreground">
            <span>
              Mostrando {Math.min(limite, lista.length)} de {lista.length}
            </span>
            {lista.length > limite && (
              <button
                className="font-semibold text-primary hover:underline"
                onClick={() => setLimite((l) => l + 25)}
              >
                Ver más
              </button>
            )}
          </p>
        </div>
      )}
    </div>
  );
}

/* ───────────── Canales y horarios ───────────── */

function Canales({ ctx }: { ctx: Ctx }) {
  const { config } = storeComunicacion.usar();
  const { setConectores } = useIntegraciones();
  const setConfig = (fn: (c: typeof config) => typeof config) => setComunicacion("config", fn);

  const conectar = (canal: Canal, conectado: boolean) => {
    setConfig((c) => ({
      ...c,
      canales: { ...c.canales, [canal]: { ...c.canales[canal], conectado } },
    }));
    if (canal === "WhatsApp")
      setConectores((prev) =>
        prev.map((x) =>
          x.id === "whatsapp" ? { ...x, estado: conectado ? "Conectado" : "Desconectado" } : x,
        ),
      );
    ctx.onToast(`${canal} ${conectado ? "conectado" : "desconectado"}`);
  };

  const DESCRIPCION: Record<Canal, string> = {
    WhatsApp: "Número oficial de WhatsApp Business para chats, recordatorios y campañas.",
    SMS: "Mensajes de texto cortos. Ideales para recordatorios cuando el paciente no usa WhatsApp.",
    Email: "Correos con tu firma para presupuestos, encuestas y comunicaciones largas.",
  };

  const enHorario = dentroDeHorario(
    config.horario.desde,
    config.horario.hasta,
    config.horario.dias,
  );

  return (
    <div className="space-y-3">
      <EncabezadoSeccion
        icon={Settings2}
        titulo="Canales y horarios"
        descripcion="Conectá tus canales, definí el horario de atención y la respuesta automática."
      />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {CANALES.map((canal) => {
          const c = config.canales[canal];
          const Icon = CANAL_ESTILO[canal].icon;
          return (
            <div key={canal} className="card-grad flex flex-col p-4">
              <div className="flex items-start gap-3">
                <span
                  className={`grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-md ${CANAL_ESTILO[canal].burbuja}`}
                >
                  <Icon className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    {canal === "WhatsApp"
                      ? "WhatsApp Business"
                      : canal === "Email"
                        ? "Correo electrónico"
                        : "SMS"}
                    <Pill
                      clase={
                        c.conectado
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-muted text-muted-foreground"
                      }
                    >
                      {c.conectado ? "Conectado" : "Desconectado"}
                    </Pill>
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{DESCRIPCION[canal]}</p>
                </div>
              </div>
              <div className="mt-3">
                <Field
                  label={
                    canal === "Email"
                      ? "Correo remitente"
                      : canal === "SMS"
                        ? "Nombre remitente"
                        : "Número"
                  }
                >
                  <input
                    value={c.remitente}
                    onChange={(e) =>
                      setConfig((cfg) => ({
                        ...cfg,
                        canales: {
                          ...cfg.canales,
                          [canal]: {
                            ...cfg.canales[canal],
                            remitente:
                              canal === "SMS"
                                ? e.target.value.toUpperCase().slice(0, 11)
                                : e.target.value,
                          },
                        },
                      }))
                    }
                    className={INPUT}
                  />
                </Field>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-white/80 p-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Este mes
                  </p>
                  <p className="text-base font-bold">{c.enviadosMes.toLocaleString("es-AR")}</p>
                </div>
                <div className="rounded-xl bg-white/80 p-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Costo estimado
                  </p>
                  <p className="text-base font-bold">
                    {c.costoUnitario
                      ? formatearMonto(c.enviadosMes * c.costoUnitario)
                      : "Sin costo"}
                  </p>
                </div>
              </div>
              <div className="min-h-3 flex-1" />
              <div className="flex justify-end gap-1.5 border-t border-primary/10 pt-2.5">
                {c.conectado && (
                  <button
                    className={BTN_SECUNDARIO}
                    onClick={() => ctx.onToast(`Mensaje de prueba enviado desde ${c.remitente}`)}
                  >
                    <Send className="size-3.5" />
                    Probar
                  </button>
                )}
                <button
                  className={c.conectado ? BTN_SECUNDARIO : BTN_PRIMARIO}
                  onClick={() => conectar(canal, !c.conectado)}
                >
                  {c.conectado ? <X className="size-3.5" /> : <Zap className="size-3.5" />}
                  {c.conectado ? "Desconectar" : "Conectar"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="card-grad space-y-3 p-4">
          <p className="flex items-center justify-between gap-2 text-sm font-semibold">
            <span className="flex items-center gap-2">
              <Clock3 className="size-4 text-primary" /> Horario de atención
            </span>
            <Pill
              clase={enHorario ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}
            >
              {enHorario ? "Abierto ahora" : "Cerrado ahora"}
            </Pill>
          </p>
          <div className="flex flex-wrap gap-1.5">
            {DIAS.map((d, i) => {
              const activo = config.horario.dias.includes(i);
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={activo}
                  onClick={() =>
                    setConfig((c) => ({
                      ...c,
                      horario: {
                        ...c.horario,
                        dias: activo
                          ? c.horario.dias.filter((x) => x !== i)
                          : [...c.horario.dias, i].sort(),
                      },
                    }))
                  }
                  className={`h-8 w-11 rounded-full text-xs font-semibold transition-colors ${activo ? "bg-primary text-primary-foreground" : "border border-border bg-white text-muted-foreground"}`}
                >
                  {d}
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Desde">
              <input
                type="time"
                value={config.horario.desde}
                onChange={(e) =>
                  setConfig((c) => ({ ...c, horario: { ...c.horario, desde: e.target.value } }))
                }
                className={INPUT}
              />
            </Field>
            <Field label="Hasta">
              <input
                type="time"
                value={config.horario.hasta}
                onChange={(e) =>
                  setConfig((c) => ({ ...c, horario: { ...c.horario, hasta: e.target.value } }))
                }
                className={INPUT}
              />
            </Field>
          </div>
          {config.horario.hasta <= config.horario.desde && (
            <p className="text-xs text-destructive">
              El horario de cierre tiene que ser posterior al de apertura.
            </p>
          )}
        </div>

        <div className="card-grad space-y-3 p-4">
          <p className="flex items-center justify-between gap-2 text-sm font-semibold">
            <span className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" /> Respuesta automática fuera de horario
            </span>
            <Interruptor
              activo={config.autoRespuesta.activa}
              onChange={(v) =>
                setConfig((c) => ({ ...c, autoRespuesta: { ...c.autoRespuesta, activa: v } }))
              }
              etiqueta="Respuesta automática"
            />
          </p>
          <textarea
            rows={3}
            value={config.autoRespuesta.texto}
            onChange={(e) =>
              setConfig((c) => ({
                ...c,
                autoRespuesta: { ...c.autoRespuesta, texto: e.target.value },
              }))
            }
            className={TEXTAREA}
            disabled={!config.autoRespuesta.activa}
          />
          <Field label="Firma de los correos" ayuda="Podés usar {{clinica}}.">
            <input
              value={config.firma}
              onChange={(e) => setConfig((c) => ({ ...c, firma: e.target.value }))}
              className={INPUT}
            />
          </Field>
          <p className="rounded-xl bg-white/80 px-3 py-2 text-xs text-muted-foreground">
            Vista previa de la firma:{" "}
            <b className="text-foreground">
              {rellenar(config.firma, { clinica: ctx.clinica }) || "—"}
            </b>
          </p>
        </div>
      </div>
    </div>
  );
}
