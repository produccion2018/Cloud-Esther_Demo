import { useCallback, useEffect, useRef, useState } from "react";

/* Dictado del navegador (Web Speech API) para hablarle a Esther.
   TODO backend: transcripción del servidor para navegadores sin soporte y audios largos. */
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

  useEffect(() => {
    const w = window as unknown as Record<string, unknown>;
    setSoportado(Boolean(w["SpeechRecognition"] ?? w["webkitSpeechRecognition"]));
    return () => rec.current?.stop();
  }, []);
  useEffect(() => {
    if (!aviso) return;
    const t = window.setTimeout(() => setAviso(""), 5000);
    return () => window.clearTimeout(t);
  }, [aviso]);

  const alternar = useCallback(() => {
    if (escuchando) {
      rec.current?.stop();
      return;
    }
    const r = crearReconocedor();
    if (!r) {
      setAviso("Tu navegador no permite dictar. Probá con Chrome o Edge, o escribí la consulta.");
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
    r.onerror = (e) =>
      setAviso(
        e.error === "not-allowed" || e.error === "service-not-allowed"
          ? "Habilitá el micrófono en el navegador para hablarle a Esther."
          : e.error === "no-speech"
            ? "No escuché nada. Tocá el micrófono y hablá."
            : "No te escuché bien, probá de nuevo.",
      );
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
  }, [escuchando]);

  return { escuchando, parcial, aviso, soportado, alternar };
}
