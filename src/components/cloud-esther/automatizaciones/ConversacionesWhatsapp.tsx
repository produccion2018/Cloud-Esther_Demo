import { useEffect, useMemo, useState } from "react";
import { Bot, Loader2, MessageCircle, Send, UserRound } from "lucide-react";
import { BTN_PRIMARIO, INPUT, hace } from "@/components/cloud-esther/rrhh/ui";
import { enviarWhatsappBusiness, verMensajesWhatsapp, type MensajeWhatsapp } from "@/lib/clinica/api";
import { useClinicaReal } from "@/lib/clinica/modo-clinica";

/* Ubicación: src/components/cloud-esther/automatizaciones/ConversacionesWhatsapp.tsx
   CONVERSACIONES REALES de WhatsApp Business (clínica real): lo que escriben los pacientes, lo que
   respondió el Agente IA o las automatizaciones, y desde acá alguien del equipo puede contestar
   (sale desde el número de la clínica). Se actualiza cada 20 segundos. */

export function ConversacionesWhatsapp({ onToast }: { onToast: (m: string) => void }) {
  const real = useClinicaReal();
  // El demo arranca vacío, igual que una clínica real (sin conversaciones de ejemplo)
  const [mensajes, setMensajes] = useState<MensajeWhatsapp[] | null>(() => (real ? null : []));
  const [elegido, setElegido] = useState<string | null>(null);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!real) return;
    let vivo = true;
    const traer = () =>
      verMensajesWhatsapp(real.slug)
        .then((l) => vivo && setMensajes(l))
        .catch(() => vivo && setMensajes((m) => m ?? []));
    void traer();
    const t = window.setInterval(() => void traer(), 20_000);
    return () => {
      vivo = false;
      window.clearInterval(t);
    };
  }, [real?.slug]);

  const chats = useMemo(() => {
    const porTel = new Map<string, MensajeWhatsapp[]>();
    for (const m of mensajes ?? []) porTel.set(m.telefono, [...(porTel.get(m.telefono) ?? []), m]);
    return [...porTel.entries()]
      .map(([tel, l]) => ({ tel, nombre: l.find((x) => x.direccion === "entrante" && x.nombre)?.nombre ?? l.find((x) => x.nombre)?.nombre ?? "", ultimo: l[0]!, lista: [...l].reverse() }))
      .sort((a, b) => b.ultimo.fecha.localeCompare(a.ultimo.fecha));
  }, [mensajes]);
  const chat = chats.find((c) => c.tel === elegido) ?? chats[0];

  return (
    <section className="card-grad p-4">
      <p className="mb-3 flex items-center gap-2 text-[13px] font-semibold">
        <MessageCircle className="size-4 text-primary" /> Conversaciones de WhatsApp
      </p>
      {mensajes === null ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Cargando…
        </p>
      ) : !chats.length ? (
        <p className="text-sm text-muted-foreground">Todavía no hay mensajes. Cuando un paciente le escriba al número de la clínica, aparece acá.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-[240px_1fr]">
          <ul className="max-h-[380px] space-y-1 overflow-y-auto">
            {chats.map((c) => (
              <li key={c.tel}>
                <button
                  type="button"
                  onClick={() => setElegido(c.tel)}
                  className={`w-full rounded-xl px-3 py-2 text-left transition ${chat?.tel === c.tel ? "bg-primary/10" : "hover:bg-primary/[0.04]"}`}
                >
                  <b className="block truncate text-[13px]">{c.nombre || `+${c.tel}`}</b>
                  <span className="block truncate text-[11.5px] text-muted-foreground">{c.ultimo.texto}</span>
                  <span className="text-[10.5px] text-muted-foreground">{hace(c.ultimo.fecha)}</span>
                </button>
              </li>
            ))}
          </ul>
          {chat && (
            <div className="flex min-h-[300px] flex-col rounded-2xl border border-primary/10 bg-white/70">
              <div className="flex-1 space-y-2 overflow-y-auto p-3" style={{ maxHeight: 320 }}>
                {chat.lista.map((m) => (
                  <div key={m.id} className={`flex ${m.direccion === "entrante" ? "justify-start" : "justify-end"}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-3 py-2 text-[13px] ${m.direccion === "entrante" ? "bg-muted" : m.estado === "error" ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-900"}`}
                    >
                      <p className="whitespace-pre-wrap">{m.texto}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-[10px] opacity-70">
                        {m.direccion === "saliente" && (m.por === "Agente IA" ? <Bot className="size-3" /> : <UserRound className="size-3" />)}
                        {m.direccion === "saliente" ? m.por : ""} · {hace(m.fecha)}
                        {m.estado === "error" ? " · no se envió" : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <form
                className="flex gap-2 border-t border-primary/10 p-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!texto.trim() || enviando) return;
                  if (!real) {
                    setMensajes((l) => [
                      { id: `demo-${Date.now()}`, telefono: chat.tel, nombre: chat.nombre, direccion: "saliente", texto: texto.trim(), por: "Vos", estado: "ok", fecha: new Date().toISOString() },
                      ...(l ?? []),
                    ]);
                    setTexto("");
                    onToast("Demo: en la clínica real sale desde el número de WhatsApp de la clínica");
                    return;
                  }
                  setEnviando(true);
                  enviarWhatsappBusiness(real.slug, { telefono: chat.tel, texto: texto.trim(), paciente: chat.nombre })
                    .then(async () => {
                      setTexto("");
                      setMensajes(await verMensajesWhatsapp(real.slug));
                    })
                    .catch((err: unknown) => onToast(err instanceof Error ? err.message : "No se pudo enviar."))
                    .finally(() => setEnviando(false));
                }}
              >
                <input className={INPUT} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Responder desde el número de la clínica…" />
                <button type="submit" className={BTN_PRIMARIO} disabled={enviando || !texto.trim()} aria-label="Enviar">
                  {enviando ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
