import { useEffect, useRef, useState } from "react";
import { CalendarCheck, FlaskConical, Mic, RotateCcw, Send, Siren, Square } from "lucide-react";
import { preguntarIA, transcribirAudioWeb } from "@/lib/cloud-esther/esther-llm";
import { storeAgenteIA, type Conversacion, type MensajeConv } from "@/lib/cloud-esther/agente-ia-store";
import {
  storeAgenda,
  setTurnosStore,
  ODONTOLOGOS,
  SUCURSALES,
  GABINETES,
  type Turno,
} from "@/lib/cloud-esther/agenda-store";
import { BTN_PRIMARIO, BTN_SECUNDARIO, INPUT } from "@/components/cloud-esther/rrhh/ui";

/* Ubicación: src/components/cloud-esther/automatizaciones/ProbadorAgente.tsx
   Probador del Agente IA: deja probar el "cerebro" del agente con IA REAL (preguntarIA) y la
   AGENDA REAL (ofrece horarios libres de verdad y agenda un turno real). Está claramente marcado
   como prueba y NO usa WhatsApp: el canal real se conecta aparte. No finge ninguna conexión. */

type Msg = { de: "paciente" | "agente"; texto: string };
type Slot = { fecha: string; hora: string; odon: string; label: string };

const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

function etiquetaDia(d: Date): string {
  const hoy = new Date();
  const mismaFecha = d.toDateString() === hoy.toDateString();
  const maniana = new Date(hoy);
  maniana.setDate(hoy.getDate() + 1);
  if (mismaFecha) return "hoy";
  if (d.toDateString() === maniana.toDateString()) return "mañana";
  return `${DIAS[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;
}

/** Horarios libres REALES: de 9 a 18, según la duración configurada, sin domingos, sin los ocupados. */
function horariosLibres(duracionMin: number, cantidad = 3): Slot[] {
  const turnos = storeAgenda.leer().turnos;
  const odon = ODONTOLOGOS[0] ?? "Profesional";
  const ahora = new Date();
  const out: Slot[] = [];
  for (let d = 0; d < 8 && out.length < cantidad; d++) {
    const dia = new Date(ahora);
    dia.setDate(ahora.getDate() + d);
    if (dia.getDay() === 0) continue; // domingo cerrado
    const fecha = dia.toISOString().slice(0, 10);
    const limiteHoy = ahora.getHours() * 60 + ahora.getMinutes() + 30;
    for (let min = 9 * 60; min + duracionMin <= 18 * 60 && out.length < cantidad; min += duracionMin) {
      if (d === 0 && min <= limiteHoy) continue;
      const hora = `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
      if (turnos.some((t) => t.fecha === fecha && t.hora === hora && t.odontologo === odon)) continue;
      out.push({ fecha, hora, odon, label: `${etiquetaDia(dia)} · ${hora}` });
    }
  }
  return out;
}

export function ProbadorAgente({ usuario: _usuario, onToast }: { usuario: string; onToast: (m: string) => void }) {
  const inicial = (): Msg[] => [{ de: "agente", texto: storeAgenteIA.leer().config.bienvenida }];
  const [msgs, setMsgs] = useState<Msg[]>(inicial);
  const [texto, setTexto] = useState("");
  const [cargando, setCargando] = useState(false);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [slotElegido, setSlotElegido] = useState<Slot | null>(null);
  const [nombre, setNombre] = useState("");
  const fin = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fin.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs, slots, slotElegido]);

  const esUrgencia = (t: string) => {
    const palabras = storeAgenteIA.leer().config.palabrasUrgencia;
    const low = t.toLowerCase();
    return palabras.some((p) => low.includes(p.toLowerCase()));
  };

  const registrarConversacion = (
    todos: Msg[],
    resultado: Conversacion["resultado"],
    paciente: string,
  ) => {
    const e = storeAgenteIA.leer();
    const mensajes: MensajeConv[] = todos.map((m) => ({
      de: m.de,
      texto: m.texto,
      hora: new Date().toISOString(),
    }));
    const conv: Conversacion = {
      id: Date.now(),
      paciente: paciente || "Paciente de prueba",
      canal: "probador",
      prueba: true,
      resultado,
      mensajes,
      fecha: new Date().toISOString(),
    };
    storeAgenteIA.poner({ ...e, conversaciones: [...e.conversaciones, conv] });
  };

  // 🎤 Audio: se graba con el micrófono, se pasa a texto con IA y se manda como mensaje del paciente
  // (igual que los audios de WhatsApp en la clínica real).
  const [grabando, setGrabando] = useState(false);
  const grabador = useRef<MediaRecorder | null>(null);
  const corte = useRef<number | null>(null);
  const grabar = async () => {
    if (grabando) {
      grabador.current?.stop();
      return;
    }
    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      onToast("Este navegador no permite grabar audio.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const partes: Blob[] = [];
      rec.ondataavailable = (e) => e.data.size && partes.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (corte.current) window.clearTimeout(corte.current);
        setGrabando(false);
        const blob = new Blob(partes, { type: rec.mimeType || "audio/webm" });
        if (blob.size < 1000) return;
        setCargando(true);
        try {
          const b64 = await new Promise<string>((res, rej) => {
            const fr = new FileReader();
            fr.onload = () => res(String(fr.result).split(",")[1] ?? "");
            fr.onerror = () => rej(new Error("audio"));
            fr.readAsDataURL(blob);
          });
          const { texto: t } = await transcribirAudioWeb({ data: { audio: b64, mime: blob.type } });
          setCargando(false);
          if (t) void enviar(`🎤 ${t}`);
          else onToast("No se pudo pasar el audio a texto. Probá de nuevo o escribí el mensaje.");
        } catch (err) {
          setCargando(false);
          onToast(err instanceof Error ? err.message : "No se pudo pasar el audio a texto.");
        }
      };
      grabador.current = rec;
      rec.start();
      setGrabando(true);
      corte.current = window.setTimeout(() => rec.state === "recording" && rec.stop(), 60_000);
    } catch {
      onToast("No se pudo usar el micrófono. Revisá los permisos del navegador.");
    }
  };

  const enviar = async (dictado?: string) => {
    const t = (dictado ?? texto).trim();
    if (!t || cargando) return;
    setTexto("");
    const urgente = esUrgencia(t);
    const base = [...msgs, { de: "paciente" as const, texto: t }];
    setMsgs(base);
    setCargando(true);

    // Respuesta de urgencia (protocolo): no diagnostica, deriva y recomienda atención presencial.
    if (urgente) {
      const cfg = storeAgenteIA.leer().config;
      const resp =
        "Entiendo que puede ser una urgencia. No puedo diagnosticar ni indicar medicación, pero es " +
        "importante que te vea un profesional cuanto antes. Si el dolor es intenso, hay sangrado que no " +
        `para o mucha inflamación, acercate a una guardia. Te derivo con ${cfg.derivarA} y puedo darte el ` +
        "primer turno disponible. ¿Querés que busque un horario ahora?";
      const todos = [...base, { de: "agente" as const, texto: resp }];
      setMsgs(todos);
      setCargando(false);
      registrarConversacion(todos, "urgencia", "Paciente de prueba");
      return;
    }

    // Conversación normal con IA real (misma que Esther). Si no hay clave, respaldo simple.
    const cfg = storeAgenteIA.leer().config;
    const contexto =
      `Fecha y hora actual: ${new Date().toLocaleString("es-AR")}.\n` +
      `Sos la asistente de la clínica por WhatsApp. Podés sacar turnos, responder consultas y derivar urgencias.\n` +
      `Tipos de consulta: ${cfg.tiposConsulta.join(", ")}.\n` +
      `Si el paciente quiere un turno, invitalo a tocar "Ver horarios disponibles" (no inventes horarios).`;
    const ia = await preguntarIA({ data: { pregunta: t, contexto } }).catch(() => null);
    const resp =
      ia?.text ??
      "¡Gracias por tu mensaje! Puedo ayudarte a sacar un turno o responder lo que necesites. " +
        'Si querés agendar, tocá "Ver horarios disponibles" acá abajo.';
    setMsgs([...base, { de: "agente", texto: resp }]);
    setCargando(false);
  };

  const buscarHorarios = () => {
    const dur = storeAgenteIA.leer().config.duracionTurnoMin;
    const libres = horariosLibres(dur);
    setSlots(libres);
    setMsgs((m) => [
      ...m,
      {
        de: "agente",
        texto: libres.length
          ? "Estos son los próximos horarios disponibles (de la agenda real). Elegí el que prefieras:"
          : "Por ahora no encuentro horarios libres en la agenda. Probá más adelante o avisá a recepción.",
      },
    ]);
  };

  const confirmarTurno = () => {
    if (!slotElegido) return;
    const nom = nombre.trim();
    if (!nom) {
      onToast("Poné el nombre del paciente para agendar.");
      return;
    }
    const nuevo: Turno = {
      id: Date.now(),
      fecha: slotElegido.fecha,
      hora: slotElegido.hora,
      paciente: nom,
      tratamiento: "Consulta general",
      odontologo: slotElegido.odon,
      sucursal: SUCURSALES[0] ?? "Sede principal",
      gabinete: GABINETES[0] ?? "Consultorio 1",
      estado: "Confirmada",
      notas: "Agendado por el Agente IA (prueba del probador)",
    };
    setTurnosStore((prev) => [...prev, nuevo]);
    const confirma =
      `¡Listo, ${nom}! Te agendé el turno para ${slotElegido.label} con ${slotElegido.odon}. ` +
      "Te espero en la clínica; te paso la dirección por acá. Si no podés venir, avisame y lo reprogramamos.";
    const todos = [...msgs, { de: "agente" as const, texto: confirma }];
    setMsgs(todos);
    registrarConversacion(todos, "turno", nom);
    setSlots(null);
    setSlotElegido(null);
    setNombre("");
    onToast(`Turno de prueba agendado en la agenda real (${slotElegido.label}).`);
  };

  const reiniciar = () => {
    setMsgs(inicial());
    setSlots(null);
    setSlotElegido(null);
    setNombre("");
    setTexto("");
  };

  return (
    <section className="card-grad p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="flex items-center gap-1.5 text-[13px] font-semibold">
            <FlaskConical className="size-4 text-primary" /> Probador del agente
          </p>
          <p className="text-[11px] text-muted-foreground">
            Escribí como si fueras el paciente. La IA responde de verdad y agenda en la agenda real.
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-700">
          Prueba · sin WhatsApp (el canal se conecta aparte)
        </span>
      </div>

      <div className="max-h-80 space-y-2 overflow-y-auto rounded-2xl border border-primary/10 bg-white/70 p-3 dark:bg-white/5">
        {msgs.map((m, i) => (
          <div key={i} className={`flex ${m.de === "paciente" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-[12.5px] leading-relaxed ${
                m.de === "paciente"
                  ? "bg-gradient-to-br from-primary to-fuchsia-500 text-white"
                  : "bg-primary/[0.06] text-foreground"
              }`}
            >
              {m.texto}
            </div>
          </div>
        ))}

        {/* Slots reales */}
        {slots && slots.length > 0 && !slotElegido && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {slots.map((s) => (
              <button
                key={`${s.fecha}-${s.hora}`}
                type="button"
                onClick={() => setSlotElegido(s)}
                className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-white px-3 py-1.5 text-[11.5px] font-semibold text-primary transition hover:bg-primary/5"
              >
                <CalendarCheck className="size-3.5" /> {s.label}
              </button>
            ))}
          </div>
        )}

        {/* Nombre para confirmar */}
        {slotElegido && (
          <div className="rounded-2xl border border-primary/20 bg-primary/[0.05] p-2.5">
            <p className="text-[11.5px] font-medium">
              Agendar <b>{slotElegido.label}</b> con {slotElegido.odon}. ¿A nombre de quién?
            </p>
            <div className="mt-2 flex gap-2">
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Nombre del paciente"
                className={INPUT}
                onKeyDown={(e) => e.key === "Enter" && confirmarTurno()}
              />
              <button type="button" className={BTN_PRIMARIO} onClick={confirmarTurno}>
                Confirmar
              </button>
            </div>
          </div>
        )}
        <div ref={fin} />
      </div>

      {/* Barra de acciones */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <div className="flex min-w-[220px] flex-1 gap-2">
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), enviar())}
            placeholder="Escribí un mensaje como paciente…"
            className={INPUT}
            disabled={cargando}
          />
          <button
            type="button"
            className={grabando ? `${BTN_PRIMARIO} animate-pulse bg-rose-500` : BTN_SECUNDARIO}
            onClick={() => void grabar()}
            disabled={cargando && !grabando}
            aria-label={grabando ? "Terminar audio" : "Mandar un audio"}
            title={grabando ? "Tocá para terminar y enviar" : "Mandar un audio (se pasa a texto)"}
          >
            {grabando ? <Square className="size-4" /> : <Mic className="size-4" />}
          </button>
          <button type="button" className={BTN_PRIMARIO} onClick={() => void enviar()} disabled={cargando}>
            <Send className="size-4" /> {cargando ? "…" : "Enviar"}
          </button>
        </div>
        <button type="button" className={BTN_SECUNDARIO} onClick={buscarHorarios}>
          <CalendarCheck className="size-4" /> Ver horarios disponibles
        </button>
        <button type="button" className={BTN_SECUNDARIO} onClick={reiniciar} title="Reiniciar">
          <RotateCcw className="size-4" />
        </button>
      </div>
      <p className="mt-2 flex items-center gap-1 text-[10.5px] text-muted-foreground">
        <Siren className="size-3" /> Si escribís algo como "me duele mucho una muela", el agente activa el
        protocolo de urgencia.
      </p>
    </section>
  );
}
