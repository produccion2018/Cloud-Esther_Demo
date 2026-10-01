import { useEffect, useRef, useState } from "react";
import {
  Bot,
  Headset,
  Mail,
  MessageCircle,
  MonitorSmartphone,
  Plus,
  Send,
  UserRound,
} from "lucide-react";
import { leerPacientes } from "@/lib/cloud-esther/pacientes";
import { setIA, storeIA, type ConversacionCC, type MensajeCC } from "@/lib/cloud-esther/ia-store";
import {
  DIALOGO_INICIAL,
  conversacionesEjemplo,
  responderPaciente,
  type EstadoDialogo,
} from "@/lib/cloud-esther/contact-center";

/* Contact Center con IA dentro de Cloud Esther IA: bandeja de conversaciones (WhatsApp,
   webchat, correo), simulador para escribir como paciente y la opción de tomar la conversación.
   Todo lo que Esther agenda o cambia impacta en la Agenda real de la empresa. */

const ICONO: Record<ConversacionCC["canal"], typeof MessageCircle> = {
  WhatsApp: MessageCircle,
  Webchat: MonitorSmartphone,
  Correo: Mail,
};
const TONO: Record<ConversacionCC["estado"], string> = {
  "Resuelta por IA": "bg-emerald-500/15 text-emerald-300",
  "Derivada a humano": "bg-amber-500/15 text-amber-300",
  "En curso": "bg-sky-500/15 text-sky-300",
};

export function ContactCenter({
  usuario,
  automatizado,
}: {
  usuario: string;
  automatizado: boolean;
}) {
  const ia = storeIA.usar();
  const conversaciones = ia.conversaciones.length ? ia.conversaciones : conversacionesEjemplo();
  const [activa, setActiva] = useState<string>(conversaciones[0]?.id ?? "");
  const [texto, setTexto] = useState("");
  const [dialogos, setDialogos] = useState<Record<string, EstadoDialogo>>({});
  const [ocupado, setOcupado] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const conv = conversaciones.find((c) => c.id === activa);
  const tomada = conv?.estado === "Derivada a humano";

  useEffect(() => {
    if (!ia.conversaciones.length) setIA("conversaciones", () => conversacionesEjemplo());
  }, [ia.conversaciones.length]);
  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [conv?.mensajes.length, activa]);

  const actualizar = (id: string, fn: (c: ConversacionCC) => ConversacionCC) =>
    setIA("conversaciones", (p) => p.map((c) => (c.id === id ? fn(c) : c)));

  const nueva = (canal: ConversacionCC["canal"]) => {
    const id = `cc-${Date.now()}`;
    const c: ConversacionCC = {
      id,
      canal,
      contacto:
        canal === "WhatsApp"
          ? "+54 9 11 ····-····"
          : canal === "Correo"
            ? "paciente@correo.com"
            : "Visitante del sitio",
      pacienteId: null,
      inicio: new Date().toISOString(),
      estado: "En curso",
      intencion: "Nueva conversación",
      mensajes: [],
    };
    setIA("conversaciones", (p) => [c, ...p]);
    setActiva(id);
  };

  const enviar = async (mensaje: string, como: MensajeCC["de"] = "paciente") => {
    const t = mensaje.trim();
    if (!t || !conv || ocupado) return;
    setTexto("");
    const ahora = () => new Date().toISOString();
    actualizar(conv.id, (c) => ({
      ...c,
      mensajes: [...c.mensajes, { de: como, texto: t, fecha: ahora() }],
    }));
    if (como === "humano") return;
    if (tomada) return; // una persona tomó la conversación: Esther no responde
    setOcupado(true);
    await new Promise((r) => setTimeout(r, 650));
    const r = responderPaciente(
      t,
      dialogos[conv.id] ?? { ...DIALOGO_INICIAL, pacienteId: conv.pacienteId },
    );
    setDialogos((d) => ({ ...d, [conv.id]: r.estado }));
    const pac = r.estado.pacienteId
      ? leerPacientes().find((p) => p.id === r.estado.pacienteId)
      : undefined;
    actualizar(conv.id, (c) => ({
      ...c,
      ...r.conversacion,
      ...(pac && c.contacto.includes("····") ? { contacto: `${pac.nombre} ${pac.apellido}` } : {}),
      estado: r.conversacion.estado ?? (c.estado === "Resuelta por IA" ? "En curso" : c.estado),
      mensajes: [
        ...c.mensajes,
        ...r.respuestas.map((x) => ({
          de: "esther" as const,
          texto: x.texto,
          fecha: ahora(),
          ...(x.opciones ? { opciones: x.opciones } : {}),
        })),
      ],
    }));
    setOcupado(false);
  };

  const resueltas = conversaciones.filter((c) => c.estado === "Resuelta por IA").length;
  const derivadas = conversaciones.filter((c) => c.estado === "Derivada a humano").length;
  const ultimas = conv?.mensajes.at(-1);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { l: "Conversaciones", v: String(conversaciones.length) },
          {
            l: "Resueltas por IA",
            v: `${Math.round((resueltas / Math.max(1, conversaciones.length)) * 100)} %`,
          },
          { l: "Derivadas a una persona", v: String(derivadas) },
          {
            l: "Turnos agendados",
            v: String(
              conversaciones.filter(
                (c) =>
                  /Turno nuevo|Reprogramación/.test(c.intencion) && c.estado === "Resuelta por IA",
              ).length,
            ),
          },
        ].map((k) => (
          <div key={k.l} className="glass-panel rounded-2xl px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {k.l}
            </p>
            <p className="mt-1 text-xl font-bold text-foreground">{k.v}</p>
          </div>
        ))}
      </div>
      <div className="grid min-h-[560px] gap-4 lg:grid-cols-[300px_1fr]">
        <div className="glass-panel flex flex-col rounded-3xl p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Bandeja
            </p>
            <div className="flex gap-1">
              {(["WhatsApp", "Webchat", "Correo"] as const).map((c) => {
                const I = ICONO[c];
                return (
                  <button
                    key={c}
                    type="button"
                    title={`Nueva conversación de prueba por ${c}`}
                    aria-label={`Nueva conversación por ${c}`}
                    onClick={() => nueva(c)}
                    className="glass-panel grid size-7 place-items-center rounded-lg text-muted-foreground hover:text-foreground"
                  >
                    <I className="size-3.5" />
                  </button>
                );
              })}
            </div>
          </div>
          <ul className="scroll-sutil -mr-1 flex-1 space-y-1.5 overflow-y-auto pr-1">
            {conversaciones.map((c) => {
              const I = ICONO[c.canal];
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setActiva(c.id)}
                    className={`w-full rounded-2xl px-3 py-2.5 text-left transition ${activa === c.id ? "bg-primary/10 ring-1 ring-primary/30" : "hover:bg-primary/5"}`}
                  >
                    <span className="flex items-center gap-2">
                      <I className="size-3.5 shrink-0 text-primary" />
                      <b className="min-w-0 flex-1 truncate text-[13px] text-foreground">
                        {c.contacto}
                      </b>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(c.inicio).toLocaleTimeString("es-AR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </span>
                    <span className="mt-1 flex items-center gap-1.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${TONO[c.estado]}`}
                      >
                        {c.estado}
                      </span>
                      <span className="truncate text-[11px] text-muted-foreground">
                        {c.intencion}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            onClick={() => nueva("WhatsApp")}
            className="mt-2 inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-primary-foreground"
            style={{ background: "var(--gradient-esther)" }}
          >
            <Plus className="size-3.5" /> Probar como paciente
          </button>
        </div>

        <div className="glass-panel flex min-h-0 flex-col rounded-3xl p-4">
          {conv ? (
            <>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{conv.contacto}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {conv.canal} · {conv.intencion}
                    {automatizado ? " · recordatorios y seguimientos automáticos con n8n" : ""}
                  </p>
                </div>
                {tomada ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-[11px] font-semibold text-amber-300">
                    <Headset className="size-3.5" /> Atendida por una persona
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      actualizar(conv.id, (c) => ({
                        ...c,
                        estado: "Derivada a humano",
                        intencion: c.intencion || "Derivación",
                      }))
                    }
                    className="glass-panel inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold text-foreground"
                  >
                    <Headset className="size-3.5" /> Tomar la conversación
                  </button>
                )}
              </div>
              <div
                ref={scroller}
                className="scroll-sutil min-h-[300px] flex-1 space-y-2.5 overflow-y-auto pr-1"
                role="log"
                aria-label="Conversación del Contact Center"
              >
                {!conv.mensajes.length && (
                  <p className="pt-10 text-center text-sm text-muted-foreground">
                    Escribí como si fueras un paciente: «Hola, quiero un turno para una limpieza»,
                    «Mi DNI es 95193944», «Quiero cancelar mi turno»…
                  </p>
                )}
                {conv.mensajes.map((m, i) => (
                  <div
                    key={i}
                    className={m.de === "paciente" ? "flex justify-start" : "flex justify-end"}
                  >
                    <div
                      className={
                        m.de === "paciente"
                          ? "max-w-[80%] rounded-2xl rounded-bl-sm bg-primary/[0.06] px-3.5 py-2 text-sm text-foreground"
                          : m.de === "humano"
                            ? "max-w-[80%] rounded-2xl rounded-br-sm bg-amber-500/20 px-3.5 py-2 text-sm text-foreground"
                            : "max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-3.5 py-2 text-sm text-primary-foreground"
                      }
                    >
                      <span className="mb-0.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.14em] opacity-75">
                        {m.de === "paciente" ? (
                          <UserRound className="size-3" />
                        ) : m.de === "humano" ? (
                          <Headset className="size-3" />
                        ) : (
                          <Bot className="size-3" />
                        )}
                        {m.de === "paciente" ? "Paciente" : m.de === "humano" ? usuario : "Esther"}
                      </span>
                      <span className="whitespace-pre-line">{m.texto}</span>
                    </div>
                  </div>
                ))}
                {ocupado && (
                  <p className="text-right text-[11px] text-muted-foreground">
                    Esther está escribiendo…
                  </p>
                )}
              </div>
              {ultimas?.de === "esther" && ultimas.opciones && !tomada && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {ultimas.opciones.map((o) => (
                    <button
                      key={o}
                      type="button"
                      onClick={() => void enviar(o)}
                      className="rounded-full border border-primary/40 bg-primary/15 px-3 py-1 text-[11.5px] font-semibold text-foreground hover:bg-primary/25"
                    >
                      {o}
                    </button>
                  ))}
                </div>
              )}
              <form
                className="glass-panel mt-3 flex items-center gap-2 rounded-2xl p-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void enviar(texto, tomada ? "humano" : "paciente");
                }}
              >
                <input
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  aria-label={tomada ? "Responder como persona" : "Escribir como paciente"}
                  placeholder={tomada ? `Responder como ${usuario}…` : "Escribí como paciente…"}
                  className="h-9 flex-1 bg-transparent px-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!texto.trim() || ocupado}
                  className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40"
                  style={{ background: "var(--gradient-esther)" }}
                >
                  <Send className="size-4" /> Enviar
                </button>
              </form>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Esther identifica al paciente, usa los horarios libres reales de la Agenda y
                registra cada turno. Urgencias o pedidos que no puede resolver pasan a una persona.
              </p>
            </>
          ) : (
            <p className="m-auto text-sm text-muted-foreground">
              Elegí una conversación o creá una de prueba.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
