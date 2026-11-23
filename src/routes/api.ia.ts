import { createFileRoute } from "@tanstack/react-router";
import type { KeyObject } from "node:crypto";

/* Ubicación: src/routes/api.ia.ts
   PUENTE DE IA (solo servidor, en Vercel): el servidor de Cloud Esther (Render/Hostinger) le pide
   acá respuestas de IA y transcripciones de audio usando la llave de IA que ya está cargada en
   Vercel (ESTHER_IA_KEY / OPENAI_API_KEY). Así no hay que cargar la llave dos veces.
   Seguridad: cada pedido viene FIRMADO por el servidor (Ed25519). Acá se verifica con la llave
   pública que publica el servidor (GET /ia/llave-publica) y se rechazan pedidos viejos (más de
   2 minutos) o sin firma. Nadie más puede usar la IA por esta dirección. */

const API_URL = (import.meta.env["VITE_ADMIN_API_URL"] as string | undefined)?.replace(/\/$/, "");

let llave: { k: KeyObject; hasta: number } | null = null;
async function llavePublica(): Promise<KeyObject | null> {
  if (llave && llave.hasta > Date.now()) return llave.k;
  if (!API_URL) return null;
  try {
    const r = await fetch(`${API_URL}/ia/llave-publica`, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) return null;
    const { clave } = (await r.json()) as { clave?: string };
    if (!clave) return null;
    const { createPublicKey } = await import("node:crypto");
    const k = createPublicKey({ key: Buffer.from(clave, "base64"), format: "der", type: "spki" });
    llave = { k, hasta: Date.now() + 3_600_000 };
    return k;
  } catch {
    return null;
  }
}

function proveedor() {
  const key = process.env["OPENAI_API_KEY"] ?? process.env["ESTHER_IA_KEY"];
  const openai = !!process.env["OPENAI_API_KEY"];
  const chatUrl = openai ? "https://api.openai.com/v1/chat/completions" : (process.env["ESTHER_IA_URL"] ?? "https://api.openai.com/v1/chat/completions");
  const modelo = openai ? "gpt-4o-mini" : (process.env["ESTHER_IA_MODEL"] ?? "gpt-4o-mini");
  const audioUrl = openai ? "https://api.openai.com/v1/audio/transcriptions" : chatUrl.replace(/\/chat\/completions\/?$/, "/audio/transcriptions");
  const modeloAudio = openai ? "whisper-1" : /groq\.com/.test(chatUrl) ? "whisper-large-v3-turbo" : (process.env["ESTHER_TRANSCRIPCION_MODEL"] ?? "whisper-1");
  return { key, chatUrl, modelo, audioUrl, modeloAudio };
}

const json = (datos: unknown, status = 200) =>
  new Response(JSON.stringify(datos), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

type Pedido =
  | { tipo: "chat"; mensajes: { role: string; content: string }[]; maxTokens?: number; temperatura?: number; fecha: number }
  | { tipo: "transcribir"; audio: string; mime?: string; fecha: number };

/** Transcribe un audio con Whisper del proveedor (lo usan el puente y la demo). */
async function transcribirConProveedor(audio: Buffer, mime: string): Promise<string | null> {
  const p = proveedor();
  if (!p.key || audio.length === 0 || audio.length > 16 * 1024 * 1024) return null;
  const ext = mime.includes("mpeg") ? "mp3" : mime.includes("mp4") ? "m4a" : mime.includes("wav") ? "wav" : mime.includes("webm") ? "webm" : "ogg";
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(audio)], { type: mime || "audio/ogg" }), `audio.${ext}`);
  form.append("model", p.modeloAudio);
  form.append("language", "es");
  try {
    const r = await fetch(p.audioUrl, { method: "POST", headers: { Authorization: `Bearer ${p.key}` }, body: form, signal: AbortSignal.timeout(55_000) });
    if (!r.ok) return null;
    const d = (await r.json()) as { text?: unknown };
    return typeof d.text === "string" && d.text.trim() ? d.text.trim() : null;
  } catch {
    return null;
  }
}

export const Route = createFileRoute("/api/ia")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const cuerpo = await request.text();
        if (cuerpo.length > 23_000_000) return json({ error: "Demasiado grande." }, 413);
        const firma = request.headers.get("x-ce-firma") ?? "";
        const k = await llavePublica();
        if (!k || !firma) return json({ error: "Sin firma." }, 401);
        let ok = false;
        try {
          const { verify } = await import("node:crypto");
          ok = verify(null, Buffer.from(cuerpo), k, Buffer.from(firma, "base64"));
        } catch {
          ok = false;
        }
        if (!ok) return json({ error: "Firma inválida." }, 401);
        let p: Pedido;
        try {
          p = JSON.parse(cuerpo) as Pedido;
        } catch {
          return json({ error: "Pedido inválido." }, 400);
        }
        if (typeof p.fecha !== "number" || Math.abs(Date.now() - p.fecha) > 120_000) return json({ error: "Pedido vencido." }, 401);
        const prov = proveedor();
        if (!prov.key) return json({ texto: null, motivo: "sin-llave" });

        if (p.tipo === "transcribir") {
          const texto = await transcribirConProveedor(Buffer.from(p.audio ?? "", "base64"), p.mime ?? "audio/ogg");
          return json({ texto });
        }
        if (p.tipo === "chat" && Array.isArray(p.mensajes)) {
          try {
            const r = await fetch(prov.chatUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${prov.key}` },
              body: JSON.stringify({
                model: prov.modelo,
                messages: p.mensajes.slice(-30).map((m) => ({ role: m.role, content: String(m.content).slice(0, 12_000) })),
                max_tokens: Math.min(800, p.maxTokens ?? 350),
                temperature: p.temperatura ?? 0.4,
              }),
              signal: AbortSignal.timeout(22_000),
            });
            if (!r.ok) return json({ texto: null, motivo: `proveedor-${r.status}` });
            const d = (await r.json()) as { choices?: { message?: { content?: unknown } }[] };
            const texto = d.choices?.[0]?.message?.content;
            return json({ texto: typeof texto === "string" ? texto.trim() : null });
          } catch {
            return json({ texto: null, motivo: "error" });
          }
        }
        return json({ error: "Tipo desconocido." }, 400);
      },
    },
  },
});
