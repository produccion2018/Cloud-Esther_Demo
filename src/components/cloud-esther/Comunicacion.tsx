import { useMemo, useState, type ReactNode } from "react";
import {
  Bell,
  CalendarClock,
  Check,
  CheckCheck,
  Edit3,
  Mail,
  MessageCircle,
  MoreHorizontal,
  Paperclip,
  Phone,
  Plus,
  Search,
  Send,
  Smartphone,
  Trash2,
  Users,
  X,
  Zap,
  Megaphone,
  Copy,
  Eye,
  Clock3,
} from "lucide-react";
import { AppShell } from "@/components/cloud-esther/AppShell";
import { CloudEstherProvider } from "@/lib/cloud-esther/data";

type Channel = "WhatsApp" | "SMS" | "Email";

type Section =
  | "conversaciones"
  | "recordatorios"
  | "plantillas"
  | "campanas"
  | "automatizaciones";

type Conversation = {
  id: number;
  patient: string;
  phone: string;
  channel: Channel;
  lastMessage: string;
  time: string;
  unread: number;
  status: "Respondido" | "Pendiente";
};

type Message = {
  id: number;
  from: "patient" | "clinic";
  text: string;
  time: string;
  status?: "sent" | "read";
};

type Template = {
  id: number;
  name: string;
  channel: Channel;
  text: string;
  sent: number;
};

type Reminder = {
  id: number;
  patient: string;
  date: string;
  time: string;
  channel: Channel;
  active: boolean;
};

type Campaign = {
  id: number;
  name: string;
  channel: Channel;
  recipients: number;
  status: "Activa" | "Programada" | "Borrador";
  sent: number;
  opened: number;
};

type Automation = {
  id: number;
  name: string;
  description: string;
  trigger: string;
  channel: Channel;
  active: boolean;
};

const conversations: Conversation[] = [
  {
    id: 1,
    patient: "María González",
    phone: "+54 9 11 4567-8890",
    channel: "WhatsApp",
    lastMessage: "Perfecto, entonces confirmo el turno.",
    time: "10:42",
    unread: 2,
    status: "Respondido",
  },
  {
    id: 2,
    patient: "Carlos Rodríguez",
    phone: "+54 9 11 3988-2211",
    channel: "WhatsApp",
    lastMessage: "¿Puedo cambiar el horario del turno?",
    time: "10:18",
    unread: 1,
    status: "Pendiente",
  },
  {
    id: 3,
    patient: "Laura Martínez",
    phone: "+54 9 11 5521-7834",
    channel: "SMS",
    lastMessage: "Recordatorio enviado correctamente.",
    time: "09:55",
    unread: 0,
    status: "Respondido",
  },
  {
    id: 4,
    patient: "Diego Fernández",
    phone: "+54 9 11 4412-6732",
    channel: "Email",
    lastMessage: "Te enviamos el presupuesto solicitado.",
    time: "09:21",
    unread: 0,
    status: "Respondido",
  },
  {
    id: 5,
    patient: "Sofía López",
    phone: "+54 9 11 6654-1198",
    channel: "WhatsApp",
    lastMessage: "¿Cuánto demora aproximadamente?",
    time: "Ayer",
    unread: 3,
    status: "Pendiente",
  },
];

const initialMessages: Record<number, Message[]> = {
  1: [
    {
      id: 1,
      from: "clinic",
      text: "Hola María, te escribimos de Clínica Dental Esther para confirmar tu turno de mañana a las 15:30 hs.",
      time: "10:31",
      status: "read",
    },
    {
      id: 2,
      from: "patient",
      text: "Hola, sí. Mañana a las 15:30. ¿Correcto?",
      time: "10:36",
    },
    {
      id: 3,
      from: "clinic",
      text: "Correcto 😊 Te esperamos mañana a las 15:30 hs.",
      time: "10:39",
      status: "read",
    },
    {
      id: 4,
      from: "patient",
      text: "Perfecto, entonces confirmo el turno.",
      time: "10:42",
    },
  ],
  2: [
    {
      id: 1,
      from: "clinic",
      text: "Hola Carlos, recordamos que tenés un turno mañana a las 11:00 hs.",
      time: "10:05",
      status: "read",
    },
    {
      id: 2,
      from: "patient",
      text: "¿Puedo cambiar el horario del turno?",
      time: "10:18",
    },
  ],
  3: [
    {
      id: 1,
      from: "clinic",
      text: "Recordatorio: tenés un turno con nosotros mañana a las 09:30 hs.",
      time: "09:55",
      status: "sent",
    },
  ],
  4: [
    {
      id: 1,
      from: "clinic",
      text: "Hola Diego. Te enviamos el presupuesto solicitado por correo.",
      time: "09:21",
      status: "read",
    },
  ],
  5: [
    {
      id: 1,
      from: "patient",
      text: "¿Cuánto demora aproximadamente?",
      time: "Ayer 18:42",
    },
  ],
};

const defaultTemplates: Template[] = [
  {
    id: 1,
    name: "Recordatorio 24 h",
    channel: "WhatsApp",
    text: "Hola {{paciente}}, te recordamos que tenés un turno el {{fecha}} a las {{hora}} hs.",
    sent: 1284,
  },
  {
    id: 2,
    name: "Confirmación de cita",
    channel: "SMS",
    text: "Hola {{paciente}}, confirmá tu turno del {{fecha}} a las {{hora}} hs.",
    sent: 968,
  },
  {
    id: 3,
    name: "Paciente inactivo 6 meses",
    channel: "Email",
    text: "Hola {{paciente}}, queremos saber cómo estás. Hace 6 meses que no nos visitás.",
    sent: 412,
  },
  {
    id: 4,
    name: "Presupuesto pendiente",
    channel: "WhatsApp",
    text: "Hola {{paciente}}, tenemos disponible tu presupuesto para continuar con tu tratamiento.",
    sent: 233,
  },
  {
    id: 5,
    name: "Post-operatorio implante",
    channel: "WhatsApp",
    text: "Hola {{paciente}}, ¿cómo te sentís después de tu procedimiento?",
    sent: 187,
  },
];

const defaultReminders: Reminder[] = [
  {
    id: 1,
    patient: "María González",
    date: "24/09/2026",
    time: "15:30",
    channel: "WhatsApp",
    active: true,
  },
  {
    id: 2,
    patient: "Carlos Rodríguez",
    date: "25/09/2026",
    time: "11:00",
    channel: "SMS",
    active: true,
  },
  {
    id: 3,
    patient: "Laura Martínez",
    date: "26/09/2026",
    time: "09:30",
    channel: "WhatsApp",
    active: false,
  },
];

const defaultCampaigns: Campaign[] = [
  {
    id: 1,
    name: "Reactivación pacientes inactivos 6 meses",
    channel: "WhatsApp",
    recipients: 412,
    status: "Activa",
    sent: 412,
    opened: 58,
  },
  {
    id: 2,
    name: "Revisión anual de higiene",
    channel: "Email",
    recipients: 690,
    status: "Activa",
    sent: 690,
    opened: 141,
  },
  {
    id: 3,
    name: "Promoción blanqueamiento verano",
    channel: "WhatsApp",
    recipients: 1200,
    status: "Borrador",
    sent: 1200,
    opened: 96,
  },
  {
    id: 4,
    name: "Seguimiento presupuestos sin aceptar",
    channel: "SMS",
    recipients: 87,
    status: "Programada",
    sent: 87,
    opened: 23,
  },
];

const defaultAutomations: Automation[] = [
  {
    id: 1,
    name: "Recordatorio de cita 24 h antes",
    description: "Envía automáticamente un recordatorio antes del turno.",
    trigger: "24 horas antes",
    channel: "WhatsApp",
    active: true,
  },
  {
    id: 2,
    name: "Confirmación al agendar",
    description: "Solicita confirmación cuando se crea una nueva cita.",
    trigger: "Al agendar",
    channel: "SMS",
    active: true,
  },
  {
    id: 3,
    name: "Encuesta de satisfacción tras la visita",
    description: "Envía una encuesta luego de la atención.",
    trigger: "Después de la visita",
    channel: "Email",
    active: true,
  },
  {
    id: 4,
    name: "Aviso de presupuesto pendiente a 7 días",
    description: "Recuerda al paciente un presupuesto todavía pendiente.",
    trigger: "7 días después",
    channel: "WhatsApp",
    active: false,
  },
  {
    id: 5,
    name: "Felicitación de cumpleaños",
    description: "Envía un saludo automático en el cumpleaños del paciente.",
    trigger: "Cumpleaños",
    channel: "Email",
    active: true,
  },
];

function channelIcon(channel: Channel) {
  if (channel === "WhatsApp") return <MessageCircle size={14} />;
  if (channel === "SMS") return <Smartphone size={14} />;
  return <Mail size={14} />;
}

function channelClass(channel: Channel) {
  if (channel === "WhatsApp") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (channel === "SMS") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  return "border-violet-200 bg-violet-50 text-violet-700";
}

function initials(name: string) {
  return name
    .split(" ")
    .map((item) => item[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/*
 * MISMO TAMAÑO / MISMA ESTRUCTURA.
 * Solo cambia el lenguaje visual de las cards:
 * - borde violeta suave
 * - gradiente blanco/lavanda
 * - halo lavanda arriba a la derecha
 * - sombra suave
 */
const ESTHER_CARD =
  "relative overflow-hidden rounded-2xl border border-violet-300/70 bg-[radial-gradient(circle_at_100%_0%,rgba(124,58,237,0.11)_0%,rgba(124,58,237,0.075)_18%,rgba(124,58,237,0)_34%),linear-gradient(135deg,#ffffff_0%,#fdfaff_48%,#f7f1ff_100%)] shadow-[0_2px_10px_rgba(124,58,237,0.08)] backdrop-blur";

const ESTHER_CARD_HOVER =
  "transition-all duration-200 hover:border-violet-400/80 hover:shadow-[0_8px_24px_rgba(124,58,237,0.12)]";

export function Comunicacion() {
  const [section, setSection] = useState<Section>("conversaciones");
  const [selectedConversation, setSelectedConversation] = useState(1);
  const [messages, setMessages] =
    useState<Record<number, Message[]>>(initialMessages);
  const [messageText, setMessageText] = useState("");
  const [search, setSearch] = useState("");
  const [channelFilter, setChannelFilter] =
    useState<"Todos" | Channel>("Todos");

  const [templates, setTemplates] = useState<Template[]>(defaultTemplates);
  const [reminders, setReminders] = useState<Reminder[]>(defaultReminders);
  const [campaigns, setCampaigns] = useState<Campaign[]>(defaultCampaigns);
  const [automations, setAutomations] =
    useState<Automation[]>(defaultAutomations);

  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [showReminderForm, setShowReminderForm] = useState(false);
  const [showCampaignForm, setShowCampaignForm] = useState(false);

  const [templateName, setTemplateName] = useState("");
  const [templateChannel, setTemplateChannel] =
    useState<Channel>("WhatsApp");
  const [templateText, setTemplateText] = useState("");

  const [reminderPatient, setReminderPatient] = useState("");
  const [reminderDate, setReminderDate] = useState("");
  const [reminderTime, setReminderTime] = useState("");
  const [reminderChannel, setReminderChannel] =
    useState<Channel>("WhatsApp");

  const [campaignName, setCampaignName] = useState("");
  const [campaignChannel, setCampaignChannel] =
    useState<Channel>("WhatsApp");
  const [campaignMessage, setCampaignMessage] = useState("");

  const [feedback, setFeedback] = useState<string | null>(null);

  const showFeedback = (text: string) => {
    setFeedback(text);
    window.setTimeout(() => setFeedback(null), 2400);
  };

  const filteredConversations = useMemo(() => {
    return conversations.filter((item) => {
      const term = search.toLowerCase().trim();

      const matchesSearch =
        !term ||
        item.patient.toLowerCase().includes(term) ||
        item.lastMessage.toLowerCase().includes(term);

      const matchesChannel =
        channelFilter === "Todos" || item.channel === channelFilter;

      return matchesSearch && matchesChannel;
    });
  }, [search, channelFilter]);

  const currentConversation = conversations.find(
    (item) => item.id === selectedConversation,
  );

  const currentMessages = messages[selectedConversation] ?? [];

  const sendMessage = () => {
    if (!messageText.trim()) return;

    const newMessage: Message = {
      id: Date.now(),
      from: "clinic",
      text: messageText.trim(),
      time: new Date().toLocaleTimeString("es-AR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      status: "sent",
    };

    setMessages((prev) => ({
      ...prev,
      [selectedConversation]: [
        ...(prev[selectedConversation] ?? []),
        newMessage,
      ],
    }));

    setMessageText("");
    showFeedback("Mensaje enviado correctamente");
  };

  const createTemplate = () => {
    if (!templateName.trim() || !templateText.trim()) {
      showFeedback("Completá el nombre y el mensaje");
      return;
    }

    setTemplates((prev) => [
      ...prev,
      {
        id: Date.now(),
        name: templateName.trim(),
        channel: templateChannel,
        text: templateText.trim(),
        sent: 0,
      },
    ]);

    setTemplateName("");
    setTemplateText("");
    setShowTemplateForm(false);
    showFeedback("Plantilla guardada correctamente");
  };

  const createReminder = () => {
    if (!reminderPatient || !reminderDate || !reminderTime) {
      showFeedback("Completá todos los datos del recordatorio");
      return;
    }

    setReminders((prev) => [
      ...prev,
      {
        id: Date.now(),
        patient: reminderPatient,
        date: reminderDate.split("-").reverse().join("/"),
        time: reminderTime,
        channel: reminderChannel,
        active: true,
      },
    ]);

    setReminderPatient("");
    setReminderDate("");
    setReminderTime("");
    setShowReminderForm(false);
    showFeedback("Recordatorio creado correctamente");
  };

  const createCampaign = () => {
    if (!campaignName.trim() || !campaignMessage.trim()) {
      showFeedback("Completá el nombre y el mensaje");
      return;
    }

    setCampaigns((prev) => [
      ...prev,
      {
        id: Date.now(),
        name: campaignName.trim(),
        channel: campaignChannel,
        recipients: 0,
        status: "Borrador",
        sent: 0,
        opened: 0,
      },
    ]);

    setCampaignName("");
    setCampaignMessage("");
    setShowCampaignForm(false);
    showFeedback("Campaña creada correctamente");
  };

  return (
    <CloudEstherProvider>
      <AppShell>
        <div className="relative min-h-full overflow-hidden bg-background text-foreground antialiased">
          <CommunicationBackground />

          {feedback && (
            <div className="fixed right-5 top-5 z-[100] flex items-center gap-2 rounded-xl border border-primary/20 bg-card px-4 py-3 text-sm font-medium text-foreground shadow-xl">
              <span className="grid size-7 place-items-center rounded-full bg-primary/10 text-primary">
                <Check size={15} />
              </span>
              {feedback}
            </div>
          )}

          <div className="relative mx-auto w-full max-w-[1500px] px-4 py-5 md:px-6 lg:px-8">
            <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="mb-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                  <MessageCircle size={14} />
                  Centro de operaciones
                </div>

                <h1 className="font-display text-2xl font-bold tracking-tight">
                  Comunicación
                </h1>

                <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  Gestioná conversaciones, recordatorios, plantillas,
                  campañas y automatizaciones desde un solo lugar.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <StatBox
                  label="Conversaciones"
                  value={conversations.length + 19}
                />
                <StatBox
                  label="Sin responder"
                  value={
                    conversations.filter((x) => x.status === "Pendiente")
                      .length + 4
                  }
                />
                <StatBox
                  label="Automatizaciones"
                  value={automations.filter((x) => x.active).length}
                />
              </div>
            </header>

            <div className="mb-5 flex flex-wrap gap-1 rounded-xl border border-border/70 bg-card/90 p-1.5 shadow-sm backdrop-blur">
              <NavButton
                active={section === "conversaciones"}
                icon={<MessageCircle size={15} />}
                onClick={() => setSection("conversaciones")}
              >
                Bandeja
              </NavButton>

              <NavButton
                active={section === "recordatorios"}
                icon={<CalendarClock size={15} />}
                onClick={() => setSection("recordatorios")}
              >
                Recordatorios
              </NavButton>

              <NavButton
                active={section === "plantillas"}
                icon={<Edit3 size={15} />}
                onClick={() => setSection("plantillas")}
              >
                Plantillas
              </NavButton>

              <NavButton
                active={section === "campanas"}
                icon={<Megaphone size={15} />}
                onClick={() => setSection("campanas")}
              >
                Campañas
              </NavButton>

              <NavButton
                active={section === "automatizaciones"}
                icon={<Zap size={15} />}
                onClick={() => setSection("automatizaciones")}
              >
                Automatizaciones
              </NavButton>
            </div>

            {section === "conversaciones" && (
              <ConversationView
                conversations={filteredConversations}
                selectedConversation={selectedConversation}
                setSelectedConversation={setSelectedConversation}
                search={search}
                setSearch={setSearch}
                channelFilter={channelFilter}
                setChannelFilter={setChannelFilter}
                currentConversation={currentConversation}
                currentMessages={currentMessages}
                templates={templates}
                messageText={messageText}
                setMessageText={setMessageText}
                sendMessage={sendMessage}
                showFeedback={showFeedback}
              />
            )}

            {section === "recordatorios" && (
              <ManagementSection
                title="Recordatorios"
                description="Automatizá el contacto antes y después de cada cita."
                icon={<CalendarClock size={18} />}
                actionLabel="Nuevo recordatorio"
                onAction={() => setShowReminderForm(true)}
              >
                <div className="grid gap-3">
                  {reminders.map((reminder) => (
                    <div
                      key={reminder.id}
                      className={`group ${ESTHER_CARD} ${ESTHER_CARD_HOVER} p-4`}
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-center">
                        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary transition-transform duration-200 group-hover:scale-105">
                          <Bell size={18} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold">
                            {reminder.patient}
                          </div>

                          <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                            <span>{reminder.date}</span>
                            <span>•</span>
                            <span>{reminder.time} hs</span>
                            <span>•</span>
                            <span>{reminder.channel}</span>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setReminders((prev) =>
                              prev.map((item) =>
                                item.id === reminder.id
                                  ? { ...item, active: !item.active }
                                  : item,
                              ),
                            );
                            showFeedback(
                              reminder.active
                                ? "Recordatorio pausado"
                                : "Recordatorio activado",
                            );
                          }}
                          className={`rounded-full border px-3 py-1 text-[10px] font-semibold transition-all ${
                            reminder.active
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              : "border-border bg-muted text-muted-foreground hover:bg-muted/70"
                          }`}
                        >
                          {reminder.active ? "Activo" : "Pausado"}
                        </button>

                        <button
                          onClick={() => {
                            setReminders((prev) =>
                              prev.filter((item) => item.id !== reminder.id),
                            );
                            showFeedback("Recordatorio eliminado");
                          }}
                          className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </ManagementSection>
            )}

            {section === "plantillas" && (
              <ManagementSection
                title="Plantillas de comunicación"
                description="Mensajes reutilizables para acelerar la atención."
                icon={<Edit3 size={18} />}
                actionLabel="Nueva plantilla"
                onAction={() => setShowTemplateForm(true)}
              >
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className={`group ${ESTHER_CARD} ${ESTHER_CARD_HOVER} p-4`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary transition-transform duration-200 group-hover:scale-105">
                            {channelIcon(template.channel)}
                          </div>

                          <div className="min-w-0">
                            <h3 className="truncate text-sm font-semibold">
                              {template.name}
                            </h3>

                            <span
                              className={`mt-2 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${channelClass(
                                template.channel,
                              )}`}
                            >
                              {template.channel}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setTemplates((prev) =>
                              prev.filter((item) => item.id !== template.id),
                            );
                            showFeedback("Plantilla eliminada");
                          }}
                          className="grid size-7 shrink-0 place-items-center rounded-lg text-muted-foreground opacity-70 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                        >
                          <MoreHorizontal size={16} />
                        </button>
                      </div>

                      <p className="mt-4 line-clamp-3 min-h-[54px] text-xs leading-relaxed text-muted-foreground">
                        {template.text}
                      </p>

                      <div className="mt-4 text-[10px] text-muted-foreground">
                        Enviada {template.sent} veces
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                          onClick={() => showFeedback("Editar plantilla")}
                          className="flex items-center justify-center gap-1.5 rounded-xl bg-primary/10 px-3 py-2 text-[11px] font-medium text-primary transition-all hover:bg-primary/15 hover:shadow-sm"
                        >
                          <Edit3 size={13} />
                          Editar
                        </button>

                        <button
                          onClick={() => {
                            setTemplateText(template.text);
                            showFeedback("Plantilla copiada al editor");
                          }}
                          className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-[11px] font-medium transition-all hover:border-primary/30 hover:bg-primary/5"
                        >
                          <Copy size={13} />
                          Copiar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </ManagementSection>
            )}

            {section === "campanas" && (
              <ManagementSection
                title="Campañas"
                description="Segmentá pacientes y medí el resultado de cada acción."
                icon={<Megaphone size={18} />}
                actionLabel="Nueva campaña"
                onAction={() => setShowCampaignForm(true)}
              >
                <div className="grid gap-4 lg:grid-cols-2">
                  {campaigns.map((campaign) => (
                    <div
                      key={campaign.id}
                      className={`group ${ESTHER_CARD} ${ESTHER_CARD_HOVER} p-5`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary transition-transform duration-200 group-hover:scale-105">
                            <Users size={17} />
                          </div>

                          <div>
                            <h3 className="text-sm font-semibold">
                              {campaign.name}
                            </h3>

                            <span
                              className={`mt-2 inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${
                                campaign.status === "Activa"
                                  ? "border-primary/20 bg-primary/10 text-primary"
                                  : campaign.status === "Programada"
                                    ? "border-blue-200 bg-blue-50 text-blue-700"
                                    : "border-border bg-muted text-muted-foreground"
                              }`}
                            >
                              {campaign.status === "Activa"
                                ? "En curso"
                                : campaign.status}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() =>
                            showFeedback("Más acciones de campaña")
                          }
                          className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
                        >
                          <MoreHorizontal size={16} />
                        </button>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-4 border-t border-violet-200/50 pt-4">
                        <Metric
                          label="Alcanzados"
                          value={campaign.recipients.toLocaleString("es-AR")}
                        />
                        <Metric
                          label="Citas generadas"
                          value={campaign.opened.toLocaleString("es-AR")}
                          accent
                        />
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          onClick={() => showFeedback("Detalle de campaña")}
                          className="flex items-center gap-1.5 rounded-xl bg-primary/10 px-3 py-2 text-[11px] font-medium text-primary transition-all hover:bg-primary/15"
                        >
                          <Eye size={13} />
                          Ver detalle
                        </button>

                        <button
                          onClick={() => showFeedback("Campaña pausada")}
                          className="flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-[11px] font-medium transition-all hover:border-primary/30 hover:bg-primary/5"
                        >
                          <Clock3 size={13} />
                          {campaign.status === "Programada"
                            ? "Programar"
                            : "Pausar"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </ManagementSection>
            )}

            {section === "automatizaciones" && (
              <ManagementSection
                title="Automatizaciones"
                description="Flujos automáticos para mantener el contacto sin trabajo manual."
                icon={<Zap size={18} />}
                actionLabel="Nueva automatización"
                onAction={() => showFeedback("Nueva automatización")}
              >
                <div
                  className={`${ESTHER_CARD} overflow-hidden`}
                >
                  {automations.map((automation, index) => (
                    <div
                      key={automation.id}
                      className={`group flex flex-col gap-4 p-4 transition-all duration-200 hover:bg-primary/[0.025] md:flex-row md:items-center ${
                        index !== automations.length - 1
                          ? "border-b border-violet-200/60"
                          : ""
                      }`}
                    >
                      <div className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary transition-all duration-200 group-hover:scale-105 group-hover:bg-primary/15">
                        <Zap size={17} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold">
                          {automation.name}
                        </h3>

                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Canal: {automation.channel}
                        </p>
                      </div>

                      <span
                        className={`rounded-full border px-3 py-1 text-[10px] font-semibold ${
                          automation.active
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-border bg-muted text-muted-foreground"
                        }`}
                      >
                        {automation.active ? "Activa" : "Pausada"}
                      </span>

                      <button
                        aria-label={`Cambiar estado de ${automation.name}`}
                        onClick={() => {
                          setAutomations((prev) =>
                            prev.map((item) =>
                              item.id === automation.id
                                ? { ...item, active: !item.active }
                                : item,
                            ),
                          );

                          showFeedback(
                            automation.active
                              ? "Automatización pausada"
                              : "Automatización activada",
                          );
                        }}
                        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                          automation.active ? "bg-primary" : "bg-muted"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 size-4 rounded-full bg-white shadow-sm transition-all ${
                            automation.active ? "left-[18px]" : "left-0.5"
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Zap size={15} className="text-primary" />
                    Las automatizaciones se aplican por sucursal según el
                    plan contratado. En esta versión frontend los cambios se
                    mantienen durante la sesión.
                  </div>
                </div>
              </ManagementSection>
            )}
          </div>

          {showTemplateForm && (
            <Modal
              title="Nueva plantilla"
              onClose={() => setShowTemplateForm(false)}
            >
              <div className="space-y-4">
                <Field label="Nombre">
                  <input
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="Ej. Confirmación de turno"
                    className={INPUT}
                  />
                </Field>

                <Field label="Canal">
                  <select
                    value={templateChannel}
                    onChange={(e) =>
                      setTemplateChannel(e.target.value as Channel)
                    }
                    className={INPUT}
                  >
                    <option>WhatsApp</option>
                    <option>SMS</option>
                    <option>Email</option>
                  </select>
                </Field>

                <Field label="Mensaje">
                  <textarea
                    value={templateText}
                    onChange={(e) => setTemplateText(e.target.value)}
                    rows={5}
                    placeholder="Escribí el mensaje..."
                    className={`${INPUT} h-auto resize-none py-3`}
                  />
                </Field>

                <div className="rounded-xl border border-primary/10 bg-primary/5 p-3 text-[11px] text-muted-foreground">
                  <div className="font-medium text-foreground">
                    Variables disponibles
                  </div>

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {["paciente", "fecha", "hora", "profesional"].map(
                      (variable) => (
                        <button
                          key={variable}
                          onClick={() =>
                            setTemplateText(
                              (prev) => `${prev} {{${variable}}}`,
                            )
                          }
                          className="rounded-full border border-primary/15 bg-card px-2 py-1 text-[10px] text-primary transition-colors hover:bg-primary/10"
                        >
                          {"{{" + variable + "}}"}
                        </button>
                      ),
                    )}
                  </div>
                </div>

                <ModalActions
                  onCancel={() => setShowTemplateForm(false)}
                  onConfirm={createTemplate}
                  confirmLabel="Guardar plantilla"
                />
              </div>
            </Modal>
          )}

          {showReminderForm && (
            <Modal
              title="Nuevo recordatorio"
              onClose={() => setShowReminderForm(false)}
            >
              <div className="space-y-4">
                <Field label="Paciente">
                  <select
                    value={reminderPatient}
                    onChange={(e) => setReminderPatient(e.target.value)}
                    className={INPUT}
                  >
                    <option value="">Seleccionar paciente</option>
                    <option>María González</option>
                    <option>Carlos Rodríguez</option>
                    <option>Laura Martínez</option>
                    <option>Diego Fernández</option>
                    <option>Sofía López</option>
                  </select>
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Fecha">
                    <input
                      type="date"
                      value={reminderDate}
                      onChange={(e) => setReminderDate(e.target.value)}
                      className={INPUT}
                    />
                  </Field>

                  <Field label="Hora">
                    <input
                      type="time"
                      value={reminderTime}
                      onChange={(e) => setReminderTime(e.target.value)}
                      className={INPUT}
                    />
                  </Field>
                </div>

                <Field label="Canal">
                  <select
                    value={reminderChannel}
                    onChange={(e) =>
                      setReminderChannel(e.target.value as Channel)
                    }
                    className={INPUT}
                  >
                    <option>WhatsApp</option>
                    <option>SMS</option>
                    <option>Email</option>
                  </select>
                </Field>

                <ModalActions
                  onCancel={() => setShowReminderForm(false)}
                  onConfirm={createReminder}
                  confirmLabel="Crear recordatorio"
                />
              </div>
            </Modal>
          )}

          {showCampaignForm && (
            <Modal
              title="Nueva campaña"
              onClose={() => setShowCampaignForm(false)}
            >
              <div className="space-y-4">
                <Field label="Nombre de campaña">
                  <input
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    placeholder="Ej. Campaña limpieza dental"
                    className={INPUT}
                  />
                </Field>

                <Field label="Canal">
                  <select
                    value={campaignChannel}
                    onChange={(e) =>
                      setCampaignChannel(e.target.value as Channel)
                    }
                    className={INPUT}
                  >
                    <option>WhatsApp</option>
                    <option>SMS</option>
                    <option>Email</option>
                  </select>
                </Field>

                <Field label="Mensaje">
                  <textarea
                    value={campaignMessage}
                    onChange={(e) => setCampaignMessage(e.target.value)}
                    rows={5}
                    placeholder="Escribí el mensaje de la campaña..."
                    className={`${INPUT} h-auto resize-none py-3`}
                  />
                </Field>

                <div className="rounded-xl border border-primary/10 bg-primary/5 p-3 text-xs text-muted-foreground">
                  La campaña se crea como borrador y luego puede programarse.
                </div>

                <ModalActions
                  onCancel={() => setShowCampaignForm(false)}
                  onConfirm={createCampaign}
                  confirmLabel="Crear campaña"
                />
              </div>
            </Modal>
          )}
        </div>
      </AppShell>
    </CloudEstherProvider>
  );
}

function CommunicationBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div
        className="absolute inset-0 opacity-[0.13]"
        style={{
          backgroundImage:
            "linear-gradient(180deg, rgba(255,255,255,.92), rgba(255,255,255,.96)), url('https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1800&q=80')",
          backgroundSize: "cover",
          backgroundPosition: "center top",
        }}
      />

      <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.055] via-transparent to-primary/[0.025]" />
      <div className="absolute -right-24 -top-28 size-[28rem] rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute -bottom-40 left-1/3 size-[32rem] rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute right-10 top-10 h-40 w-56 rounded-[40%] bg-primary/[0.035] blur-2xl" />
    </div>
  );
}

function ConversationView({
  conversations,
  selectedConversation,
  setSelectedConversation,
  search,
  setSearch,
  channelFilter,
  setChannelFilter,
  currentConversation,
  currentMessages,
  templates,
  messageText,
  setMessageText,
  sendMessage,
  showFeedback,
}: {
  conversations: Conversation[];
  selectedConversation: number;
  setSelectedConversation: (id: number) => void;
  search: string;
  setSearch: (value: string) => void;
  channelFilter: "Todos" | Channel;
  setChannelFilter: (value: "Todos" | Channel) => void;
  currentConversation?: Conversation;
  currentMessages: Message[];
  templates: Template[];
  messageText: string;
  setMessageText: (value: string) => void;
  sendMessage: () => void;
  showFeedback: (text: string) => void;
}) {
  return (
    <div
      className={`grid min-h-[650px] overflow-hidden lg:grid-cols-[330px_minmax(0,1fr)] ${ESTHER_CARD}`}
    >
      <aside className="border-b border-violet-200/60 lg:border-b-0 lg:border-r">
        <div className="border-b border-violet-200/60 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">Bandeja de entrada</h2>
              <p className="text-xs text-muted-foreground">
                {conversations.length} conversaciones
              </p>
            </div>

            <button
              onClick={() => showFeedback("Nueva conversación")}
              className="grid size-8 place-items-center rounded-lg border border-border text-muted-foreground transition-all hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
            >
              <Plus size={16} />
            </button>
          </div>

          <div className="relative">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar conversación..."
              className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-xs outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </div>

          <div className="mt-3 flex gap-1 overflow-x-auto">
            {(["Todos", "WhatsApp", "SMS", "Email"] as const).map(
              (channel) => (
                <button
                  key={channel}
                  onClick={() => setChannelFilter(channel)}
                  className={`whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[10px] font-medium transition-all ${
                    channelFilter === channel
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"
                  }`}
                >
                  {channel}
                </button>
              ),
            )}
          </div>
        </div>

        <div className="max-h-[570px] overflow-y-auto">
          {conversations.map((conversation) => (
            <button
              key={conversation.id}
              onClick={() => setSelectedConversation(conversation.id)}
              className={`w-full border-b border-violet-200/40 p-4 text-left transition-all hover:bg-primary/[0.025] ${
                selectedConversation === conversation.id
                  ? "bg-primary/[0.07] shadow-[inset_3px_0_0_hsl(var(--primary))]"
                  : ""
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                  {initials(conversation.patient)}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold">
                      {conversation.patient}
                    </span>

                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {conversation.time}
                    </span>
                  </div>

                  <div className="mt-1 flex items-center gap-1.5">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] ${channelClass(
                        conversation.channel,
                      )}`}
                    >
                      {channelIcon(conversation.channel)}
                      {conversation.channel}
                    </span>
                  </div>

                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <p className="truncate text-xs text-muted-foreground">
                      {conversation.lastMessage}
                    </p>

                    {conversation.unread > 0 && (
                      <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary text-[9px] font-semibold text-primary-foreground">
                        {conversation.unread}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </aside>

      <section className="flex min-w-0 flex-col">
        {currentConversation && (
          <>
            <div className="flex items-center justify-between border-b border-violet-200/60 px-5 py-3.5">
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid size-10 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {initials(currentConversation.patient)}
                </div>

                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">
                    {currentConversation.patient}
                  </div>

                  <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span>{currentConversation.phone}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-emerald-600">
                      <span className="size-1.5 rounded-full bg-emerald-500" />
                      En línea
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => showFeedback("Llamada iniciada")}
                  className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-primary/5 hover:text-primary"
                >
                  <Phone size={16} />
                </button>

                <button
                  onClick={() => showFeedback("Datos del paciente")}
                  className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-primary/5 hover:text-primary"
                >
                  <Users size={16} />
                </button>

                <button
                  onClick={() => showFeedback("Más acciones")}
                  className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-primary/5 hover:text-primary"
                >
                  <MoreHorizontal size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto bg-muted/20 p-5">
              <div className="flex justify-center">
                <span className="rounded-full border border-border/60 bg-card px-3 py-1 text-[10px] text-muted-foreground shadow-sm">
                  Hoy
                </span>
              </div>

              {currentMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.from === "clinic"
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm ${
                      message.from === "clinic"
                        ? "rounded-br-md bg-primary text-primary-foreground"
                        : "rounded-bl-md border border-border/70 bg-card"
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{message.text}</p>

                    <div
                      className={`mt-1 flex items-center justify-end gap-1 text-[9px] ${
                        message.from === "clinic"
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground"
                      }`}
                    >
                      {message.time}

                      {message.from === "clinic" &&
                        (message.status === "read" ? (
                          <CheckCheck size={12} />
                        ) : (
                          <Check size={12} />
                        ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-violet-200/60 bg-card p-4">
              <div className="mb-2 flex gap-2 overflow-x-auto">
                {templates.slice(0, 3).map((template) => (
                  <button
                    key={template.id}
                    onClick={() => setMessageText(template.text)}
                    className="whitespace-nowrap rounded-lg border border-border bg-muted/50 px-2.5 py-1.5 text-[10px] text-muted-foreground transition-all hover:border-primary/20 hover:bg-primary/5 hover:text-primary"
                  >
                    {template.name}
                  </button>
                ))}
              </div>

              <div className="flex items-end gap-2">
                <button
                  onClick={() => showFeedback("Adjuntar archivo")}
                  className="mb-1 grid size-9 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-primary/5 hover:text-primary"
                >
                  <Paperclip size={17} />
                </button>

                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  rows={2}
                  placeholder="Escribí un mensaje..."
                  className="min-h-[42px] flex-1 resize-none rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm outline-none transition-all focus:border-primary focus:bg-background focus:ring-2 focus:ring-primary/15"
                />

                <button
                  onClick={sendMessage}
                  className="mb-1 grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function NavButton({
  active,
  icon,
  children,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:bg-primary/8 hover:text-primary"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function ManagementSection({
  title,
  description,
  icon,
  actionLabel,
  onAction,
  children,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  actionLabel: string;
  onAction: () => void;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
            {icon}
          </div>

          <div>
            <h2 className="text-base font-semibold">{title}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {description}
            </p>
          </div>
        </div>

        <button
          onClick={onAction}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
        >
          <Plus size={15} />
          {actionLabel}
        </button>
      </div>

      {children}
    </section>
  );
}

function Metric({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div>
      <div className="text-[10px] text-muted-foreground">{label}</div>

      <div
        className={`mt-1 text-xl font-bold tabular-nums ${
          accent ? "text-emerald-600" : "text-foreground"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function StatBox({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div
      className={`${ESTHER_CARD} px-4 py-2.5`}
    >
      <div className="text-[10px] text-muted-foreground">{label}</div>

      <div className="mt-0.5 text-lg font-bold tabular-nums">
        {value}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium">{label}</span>
      {children}
    </label>
  );
}

function ModalActions({
  onCancel,
  onConfirm,
  confirmLabel,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel: string;
}) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <button
        onClick={onCancel}
        className="rounded-xl border border-border bg-background px-4 py-2.5 text-xs font-medium transition-colors hover:bg-muted"
      >
        Cancelar
      </button>

      <button
        onClick={onConfirm}
        className="rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground transition-all hover:-translate-y-0.5 hover:shadow-md"
      >
        {confirmLabel}
      </button>
    </div>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-foreground/35 p-4 backdrop-blur-[2px]">
      <div
        className={`max-h-[90vh] w-full max-w-lg overflow-y-auto ${ESTHER_CARD}`}
      >
        <div className="flex items-center justify-between border-b border-violet-200/60 px-5 py-4">
          <h2 className="text-sm font-semibold">{title}</h2>

          <button
            onClick={onClose}
            className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted"
          >
            <X size={17} />
          </button>
        </div>

        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

const INPUT =
  "h-10 w-full rounded-xl border border-border bg-background px-3 text-sm shadow-sm outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15";