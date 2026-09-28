import { useCallback, useEffect, useRef, useState } from "react";
import {
  askEsther,
  contextProgress,
  type EstherContext,
  type EstherSection,
} from "@/lib/cloud-esther/esther-ai";
import { estherSequence, estherStates, type EstherState } from "./esther-states";

export type ChatMessage = {
  id: string;
  author: "user" | "esther";
  text: string;
};

type Options = {
  initialState?: EstherState;
  context?: EstherContext;
};

let idCounter = 0;
const nextId = () => `m${++idCounter}`;

export function useEstherAI({ initialState = "idle", context = {} }: Options = {}) {
  const [state, setState] = useState<EstherState>(initialState);
  const [message, setMessage] = useState(estherStates[initialState].message);
  const [section, setSection] = useState<EstherSection>(context.section ?? "general");
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: nextId(), author: "esther", text: "Hola, estoy lista para ayudarte." },
  ]);
  const [isBusy, setIsBusy] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const wait = useCallback(
    (ms: number) =>
      new Promise<void>((resolve) => {
        timers.current.push(setTimeout(resolve, ms));
      }),
    [],
  );

  const send = useCallback(
    async (text: string, target: EstherSection = section) => {
      const prompt = text.trim();
      if (!prompt || isBusy) return;

      setIsBusy(true);
      setSection(target);
      setMessages((prev) => [...prev, { id: nextId(), author: "user", text: prompt }]);

      try {
        for (const step of estherSequence.slice(0, -1)) {
          setState(step);
          setMessage(
            step === "processing" || step === "action"
              ? contextProgress[target]
              : estherStates[step].message,
          );
          await wait(estherStates[step].duration);
        }

        const reply = await askEsther(prompt, { ...context, section: target });
        setState("success");
        setMessage(estherStates.success.message);
        setMessages((prev) => [...prev, { id: nextId(), author: "esther", text: reply.text }]);
        await wait(estherStates.success.duration);
        setState("idle");
        setMessage(estherStates.idle.message);
      } catch {
        setState("error");
        setMessage(estherStates.error.message);
        setMessages((prev) => [
          ...prev,
          { id: nextId(), author: "esther", text: estherStates.error.message },
        ]);
        await wait(estherStates.error.duration);
        setState("idle");
        setMessage(estherStates.idle.message);
      } finally {
        setIsBusy(false);
      }
    },
    [context, isBusy, section, wait],
  );

  const notifyTyping = useCallback(() => {
    if (isBusy) return;
    setState("listening");
    setMessage(estherStates.listening.message);
    clearTimers();
    timers.current.push(
      setTimeout(() => {
        setState((current) => (current === "listening" ? "idle" : current));
        setMessage((current) =>
          current === estherStates.listening.message ? estherStates.idle.message : current,
        );
      }, 2200),
    );
  }, [clearTimers, isBusy]);

  return { state, message, messages, section, isBusy, send, notifyTyping, setSection };
}