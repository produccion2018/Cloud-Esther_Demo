import { createServerFn } from "@tanstack/react-start";

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

export const preguntarIA = createServerFn({ method: "POST" })
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
