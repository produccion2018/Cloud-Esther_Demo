import { useCallback, useEffect, useRef, useState } from "react";
import { audioATexto } from "@/lib/cloud-esther/esther-llm";

/* Dictado para hablarle a Esther. Usa el dictado del navegador (Web Speech API) y, si el
   navegador no lo tiene (iPhone, navegadores dentro de apps) o falla, graba el audio y lo pasa a
   texto con el servidor de IA. Así funciona en todos los celulares, en el demo y en la clínica. */
type Reconocedor = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult:
    | ((e: {
        results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
      }) => void)
    | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start: () => void;
  stop: () => void;
};
function crearReconocedor(): Reconocedor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => Reconocedor;
    webkitSpeechRecognition?: new () => Reconocedor;
  };
  const C = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return C ? new C() : null;
}

export type Microfono = {
  escuchando: boolean;
  parcial: string;
  aviso: string;
  soportado: boolean;
  alternar: () => void;
};

export function useMicrofono({
  onTexto,
  onEstado,
}: {
  /** Texto final dictado (sin el "Esther," del comienzo). */
  onTexto: (t: string) => void;
  onEstado?: (escuchando: boolean) => void;
}): Microfono {
  const [escuchando, setEscuchando] = useState(false);
  const [parcial, setParcial] = useState("");
  const [aviso, setAviso] = useState("");
  const [soportado, setSoportado] = useState(true);
  const rec = useRef<Reconocedor | null>(null);
  const texto = useRef("");
  const cb = useRef({ onTexto, onEstado });
  cb.current = { onTexto, onEstado };

  const grabador = useRef<MediaRecorder | null>(null);
  const corte = useRef<number | null>(null);
  useEffect(() => {
    const w = window as unknown as Record<string, unknown>;
    const puedeGrabar = !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined";
    setSoportado(Boolean(w["SpeechRecognition"] ?? w["webkitSpeechRecognition"]) || puedeGrabar);
    return () => {
      rec.current?.stop();
      grabador.current?.stop();
    };
  }, []);

  /* Respaldo: grabar y transcribir en el servidor. Tocar de nuevo termina (o a los 45 s). */
  const grabarYTranscribir = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setAviso("Este navegador no permite usar el micrófono. Escribí la consulta.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const r = new MediaRecorder(stream);
      const partes: Blob[] = [];
      r.ondataavailable = (e) => e.data.size && partes.push(e.data);
      r.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (corte.current) window.clearTimeout(corte.current);
        grabador.current = null;
        setParcial("Pasando tu audio a texto…");
        const t = await audioATexto(new Blob(partes, { type: r.mimeType || "audio/webm" }));
        setParcial("");
        setEscuchando(false);
        cb.current.onEstado?.(false);
        const final = (t ?? "").replace(/^\s*(hola\s+)?esther[,:]?\s*/i, "").trim();
        if (final) cb.current.onTexto(final);
        else setAviso("No te escuché bien, probá de nuevo o escribí la consulta.");
      };
      grabador.current = r;
      r.start();
      setEscuchando(true);
      setParcial("Te escucho… tocá de nuevo el micrófono para terminar");
      cb.current.onEstado?.(true);
      corte.current = window.setTimeout(() => r.state !== "inactive" && r.stop(), 45_000);
    } catch {
      setAviso("Habilitá el micrófono en el navegador para hablarle a Esther.");
    }
  }, []);
  useEffect(() => {
    if (!aviso) return;
    const t = window.setTimeout(() => setAviso(""), 5000);
    return () => window.clearTimeout(t);
  }, [aviso]);

  const alternar = useCallback(() => {
    if (escuchando) {
      if (grabador.current) grabador.current.stop();
      else rec.current?.stop();
      return;
    }
    const r = crearReconocedor();
    if (!r) {
      void grabarYTranscribir();
      return;
    }
    setAviso("");
    setParcial("");
    texto.current = "";
    r.lang = "es-AR";
    r.interimResults = true;
    r.continuous = false;
    r.onresult = (e) => {
      texto.current = Array.from(e.results)
        .map((x) => x[0]?.transcript ?? "")
        .join(" ")
        .trim();
      setParcial(texto.current);
    };
    r.onerror = (e) => {
      // Sin servicio de dictado en este navegador: se graba y se transcribe en el servidor.
      if (e.error === "network" || e.error === "service-not-allowed" || e.error === "language-not-supported") {
        texto.current = "";
        rec.current = null;
        window.setTimeout(() => void grabarYTranscribir(), 300);
        return;
      }
      setAviso(
        e.error === "not-allowed" || e.error === "service-not-allowed"
          ? "Habilitá el micrófono en el navegador para hablarle a Esther."
          : e.error === "no-speech"
            ? "No escuché nada. Tocá el micrófono y hablá."
            : "No te escuché bien, probá de nuevo.",
      );
    };
    r.onend = () => {
      setEscuchando(false);
      setParcial("");
      cb.current.onEstado?.(false);
      const final = texto.current.replace(/^\s*(hola\s+)?esther[,:]?\s*/i, "").trim();
      if (final) cb.current.onTexto(final);
    };
    rec.current = r;
    setEscuchando(true);
    cb.current.onEstado?.(true);
    try {
      r.start();
    } catch {
      setEscuchando(false);
      cb.current.onEstado?.(false);
    }
  }, [escuchando, grabarYTranscribir]);

  return { escuchando, parcial, aviso, soportado, alternar };
}
