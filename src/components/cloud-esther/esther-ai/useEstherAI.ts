import { useCallback, useEffect, useRef, useState } from "react";
import {
  askEsther,
  contextProgress,
  type EstherContext,
  type EstherSection,
} from "@/lib/cloud-esther/esther-ai";
import type { Bloque } from "@/lib/cloud-esther/esther-motor";
import { leerPacientes } from "@/lib/cloud-esther/pacientes";
import { escenaPara, estherStates, type EstherPose, type EstherState } from "./esther-states";

export type ChatMessage = {
  id: string;
  author: "user" | "esther";
  text: string;
  bloques?: Bloque[];
  /** Resultado de la consulta (para marcar respuestas sin permiso o fuera del plan). */
  resultado?: string;
};

type Options = {
  initialState?: EstherState;
  context?: EstherContext;
  saludo?: string;
};

let idCounter = 0;
const nextId = () => `m${++idCounter}`;

/* Voz de Esther (síntesis del navegador). TODO backend: voz neural propia de Cloud Esther. */
function vozEspanol(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const voces = window.speechSynthesis.getVoices();
  return (
    voces.find((v) => v.lang === "es-AR") ??
    voces.find(
      (v) => v.lang.startsWith("es") && /female|mujer|paulina|helena|sabina|monica/i.test(v.name),
    ) ??
    voces.find((v) => v.lang.startsWith("es")) ??
    null
  );
}
export const vozDisponible = () => typeof window !== "undefined" && "speechSynthesis" in window;

export function useEstherAI({ initialState = "idle", context = {}, saludo }: Options = {}) {
  const [state, setState] = useState<EstherState>(initialState);
  const [message, setMessage] = useState(estherStates[initialState].message);
  const [pose, setPose] = useState<EstherPose>(estherStates[initialState].pose);
  const [label, setLabel] = useState(estherStates[initialState].label);
  const [section, setSection] = useState<EstherSection>(context.section ?? "general");
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: nextId(), author: "esther", text: saludo ?? "Hola, estoy lista para ayudarte." },
  ]);
  const [isBusy, setIsBusy] = useState(false);
  const [leerEnVoz, setLeerEnVoz] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  // El contexto (paciente, rol, sede) cambia desde la pantalla: se lee siempre el último.
  const contextRef = useRef(context);
  contextRef.current = context;
  const stateRef = useRef(state);
  stateRef.current = state;
  const vozRef = useRef(leerEnVoz);
  vozRef.current = leerEnVoz;

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  useEffect(
    () => () => {
      clearTimers();
      if (vozDisponible()) window.speechSynthesis.cancel();
    },
    [clearTimers],
  );

  const wait = useCallback(
    (ms: number) =>
      new Promise<void>((resolve) => {
        timers.current.push(setTimeout(resolve, ms));
      }),
    [],
  );

  const poner = useCallback(
    (s: EstherState, extra?: { pose?: EstherPose; label?: string; message?: string }) => {
      setState(s);
      setPose(extra?.pose ?? estherStates[s].pose);
      setLabel(extra?.label ?? estherStates[s].label);
      setMessage(extra?.message ?? estherStates[s].message);
    },
    [],
  );

  const hablar = useCallback(
    (texto: string) =>
      new Promise<void>((resolve) => {
        if (!vozDisponible() || !texto) return resolve();
        const u = new SpeechSynthesisUtterance(texto.slice(0, 600));
        const v = vozEspanol();
        if (v) u.voice = v;
        u.lang = v?.lang ?? "es-AR";
        u.rate = 1.02;
        u.onend = () => resolve();
        u.onerror = () => resolve();
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(u);
      }),
    [],
  );

  const callar = useCallback(() => {
    if (vozDisponible()) window.speechSynthesis.cancel();
  }, []);

  const send = useCallback(
    async (text: string, target: EstherSection = section) => {
      const prompt = text.trim();
      if (!prompt || isBusy) return;

      setIsBusy(true);
      setSection(target);
      callar();
      setMessages((prev) => [...prev, { id: nextId(), author: "user", text: prompt }]);
      const p = leerPacientes().find((x) => x.id === contextRef.current.pacienteId);
      const escena = escenaPara(prompt, p ? `${p.nombre} ${p.apellido}` : undefined);

      try {
        // 1) Escucha y piensa, 2) adopta la postura de la tarea (buscar, revisar, saludar).
        poner("thinking");
        await wait(escena.saludo ? 350 : estherStates.thinking.duration);
        poner(escena.pose === "bending" ? "action" : "processing", {
          pose: escena.pose,
          label: escena.label,
          message: escena.message || contextProgress[target],
        });
        await wait(escena.saludo ? 700 : estherStates.processing.duration);

        const reply = await askEsther(prompt, { ...contextRef.current, section: target });
        setMessages((prev) => [
          ...prev,
          {
            id: nextId(),
            author: "esther",
            text: reply.text,
            ...(reply.bloques ? { bloques: reply.bloques } : {}),
            ...(reply.resultado ? { resultado: reply.resultado } : {}),
          },
        ]);
        // 3) Reacciona al resultado: sin permiso o fuera del plan no es un "listo".
        if (reply.resultado === "Sin permiso" || reply.resultado === "Fuera del plan")
          poner("error", {
            label: reply.resultado === "Sin permiso" ? "Sin permiso" : "Fuera del plan",
            message:
              reply.resultado === "Sin permiso"
                ? "Eso no lo puedo mostrar con este rol."
                : "Ese módulo no está en el plan actual.",
          });
        else if (reply.resultado === "Sin datos")
          poner("success", {
            label: "Sin datos",
            message: "No encontré registros para eso. No voy a inventar.",
          });
        else
          poner(
            "success",
            escena.saludo ? { pose: "waving", message: "¡Para eso estoy!" } : undefined,
          );

        if (vozRef.current) {
          await wait(400);
          poner("speaking", escena.saludo ? { pose: "waving" } : undefined);
          await hablar(reply.text);
        } else await wait(estherStates.success.duration);
        poner("idle");
      } catch {
        poner("error");
        setMessages((prev) => [
          ...prev,
          { id: nextId(), author: "esther", text: estherStates.error.message },
        ]);
        await wait(estherStates.error.duration);
        poner("idle");
      } finally {
        setIsBusy(false);
      }
    },
    [callar, hablar, isBusy, poner, section, wait],
  );

  const notifyTyping = useCallback(() => {
    if (isBusy) return;
    poner("listening");
    clearTimers();
    timers.current.push(
      setTimeout(() => {
        if (stateRef.current === "listening") poner("idle");
      }, 2200),
    );
  }, [clearTimers, isBusy, poner]);

  /** Mientras el micrófono está abierto Esther queda escuchando (sin volver a "disponible"). */
  const escuchar = useCallback(
    (activo: boolean) => {
      if (isBusy) return;
      clearTimers();
      callar();
      if (activo) poner("listening", { message: "Te escucho, hablá tranquilo…" });
      else poner("idle");
    },
    [callar, clearTimers, isBusy, poner],
  );

  return {
    state,
    message,
    pose,
    label,
    messages,
    section,
    isBusy,
    send,
    notifyTyping,
    escuchar,
    setSection,
    leerEnVoz,
    setLeerEnVoz: (v: boolean) => {
      if (!v) callar();
      setLeerEnVoz(v);
    },
    callar,
  };
}
