import { createServerFn } from "@tanstack/react-start";
import { preguntarIAServidor } from "@/lib/clinica/api";
import { clinicaReal } from "@/lib/clinica/modo-clinica";

/* Ubicación: src/lib/cloud-esther/esther-llm.ts
   Cerebro real de Esther Infinity: un endpoint de SERVIDOR (solo planes con IA) que le pasa a
   OpenAI la pregunta + un contexto corto con los datos REALES de la clínica, y devuelve una
   respuesta natural. La clave (OPENAI_API_KEY) vive solo en el servidor (Vercel), nunca llega al
   navegador. Si no hay clave o falla, devuelve null y la pantalla usa el motor interno de reglas.
   Costo acotado a propósito: modelo económico (gpt-4o-mini), respuesta corta y contexto breve. */

type EntradaIA = {
  pregunta: string;
  /** Resumen corto con datos reales de la clínica (ya aterrizados por el motor interno). */
  contexto: string;
};

const SISTEMA =
  "Sos Esther Infinity, la asistente de IA de una clínica odontológica (software Cloud Esther). " +
  "Respondé en español rioplatense, con calidez, de forma breve y clara. " +
  "Usá ÚNICAMENTE la información del bloque CONTEXTO para dar datos concretos (números, nombres, montos, fechas): " +
  "si un dato no está en el CONTEXTO, decí con naturalidad que no lo tenés a mano y sugerí en qué módulo verlo; " +
  "NUNCA inventes datos, cifras ni nombres. No hables de modelos de IA, proveedores ni de cómo estás hecha.";

const preguntarIAVercel = createServerFn({ method: "POST" })
  .inputValidator((d: EntradaIA) => d)
  .handler(async ({ data }): Promise<{ text: string } | null> => {
    // Proveedor flexible (todos usan la misma API estilo OpenAI):
    //  - OpenAI (pago):   OPENAI_API_KEY   (sin más, usa gpt-4o-mini)
    //  - Gratuito (Groq / Gemini u otro): ESTHER_IA_KEY + ESTHER_IA_URL + ESTHER_IA_MODEL
    const key = process.env.OPENAI_API_KEY ?? process.env.ESTHER_IA_KEY;
    if (!key) return null; // sin clave: la pantalla usa el motor interno
    const url = process.env.ESTHER_IA_URL ?? "https://api.openai.com/v1/chat/completions";
    const model = process.env.ESTHER_IA_MODEL ?? "gpt-4o-mini";

    try {
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 12000);
      const r = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model,
          max_tokens: 400,
          temperature: 0.3,
          messages: [
            { role: "system", content: SISTEMA },
            {
              role: "user",
              content:
                `Pregunta del usuario:\n${data.pregunta}\n\n` +
                `CONTEXTO (datos reales de la clínica; usá SOLO esto, no inventes):\n${data.contexto}`,
            },
          ],
        }),
        signal: ctrl.signal,
      });
      clearTimeout(timeout);
      if (!r.ok) return null;
      const j = (await r.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const text = j?.choices?.[0]?.message?.content?.trim();
      return text ? { text } : null;
    } catch {
      return null; // cualquier error: respaldo al motor interno
    }
  });

/** Pregunta a la IA. En una CLÍNICA REAL va primero al servidor de Cloud Esther (con su llave y
 *  el límite diario de la clínica); si no hay llave ahí, prueba el endpoint de Vercel; si nada
 *  responde, devuelve null y la pantalla usa el motor interno. Nunca rompe. */
export async function preguntarIA(args: { data: EntradaIA }): Promise<{ text: string } | null> {
  const real = clinicaReal();
  if (real) {
    try {
      const r = await preguntarIAServidor(real.slug, { pregunta: args.data.pregunta, contexto: args.data.contexto.slice(0, 6000) });
      if (r.texto) return { text: r.texto };
    } catch {
      /* sin conexión o sin el módulo: se prueba la otra vía */
    }
  }
  try {
    return await preguntarIAVercel(args);
  } catch {
    return null;
  }
}

/** AUDIO → TEXTO (Probador del Agente IA, en la demo y en la clínica): Whisper del mismo proveedor
 *  de IA cargado en Vercel. Máximo ~3 MB (un audio de 1 minuto). null si no se pudo. */
export const transcribirAudioWeb = createServerFn({ method: "POST" })
  .inputValidator((d: { audio: string; mime: string }) => {
    if (typeof d?.audio !== "string" || d.audio.length > 4_200_000) throw new Error("El audio es demasiado largo (máximo 1 minuto).");
    return { audio: d.audio, mime: typeof d.mime === "string" ? d.mime.slice(0, 60) : "audio/webm" };
  })
  .handler(async ({ data }): Promise<{ texto: string | null }> => {
    const key = process.env["OPENAI_API_KEY"] ?? process.env["ESTHER_IA_KEY"];
    if (!key) return { texto: null };
    const openai = !!process.env["OPENAI_API_KEY"];
    const chatUrl = openai ? "https://api.openai.com/v1/chat/completions" : (process.env["ESTHER_IA_URL"] ?? "https://api.openai.com/v1/chat/completions");
    const url = openai ? "https://api.openai.com/v1/audio/transcriptions" : chatUrl.replace(/\/chat\/completions\/?$/, "/audio/transcriptions");
    const model = openai ? "whisper-1" : /groq\.com/.test(chatUrl) ? "whisper-large-v3-turbo" : (process.env["ESTHER_TRANSCRIPCION_MODEL"] ?? "whisper-1");
    const audio = Buffer.from(data.audio, "base64");
    if (!audio.length) return { texto: null };
    const ext = data.mime.includes("mp4") ? "m4a" : data.mime.includes("ogg") ? "ogg" : data.mime.includes("mpeg") ? "mp3" : "webm";
    const form = new FormData();
    form.append("file", new Blob([new Uint8Array(audio)], { type: data.mime }), `audio.${ext}`);
    form.append("model", model);
    form.append("language", "es");
    try {
      const r = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${key}` }, body: form, signal: AbortSignal.timeout(45_000) });
      if (!r.ok) return { texto: null };
      const d = (await r.json()) as { text?: unknown };
      return { texto: typeof d.text === "string" && d.text.trim() ? d.text.trim() : null };
    } catch {
      return { texto: null };
    }
  });
