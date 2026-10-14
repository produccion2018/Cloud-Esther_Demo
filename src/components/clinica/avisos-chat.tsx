import { useCallback } from "react";
import { toast } from "sonner";
import { useAvisosChat, type AvisosChat } from "@/lib/clinica/chat";

/* Ubicación: src/components/clinica/avisos-chat.tsx
   AVISO DE MENSAJE NUEVO de la Comunicación interna (en cualquier pantalla de la clínica).
   Cuando llega un mensaje o un comunicado, aparece un aviso arriba con «Ver».
   No muestra nada en pantalla por sí mismo: solo los avisos. */
export function AvisosChatGlobal({ onVer, silencio = false }: { onVer: (canalId: string) => void; silencio?: boolean }) {
  const alLlegar = useCallback(
    (u: NonNullable<AvisosChat["ultimo"]>) => {
      // Si ya está mirando el chat, no hace falta avisar
      if (silencio || (typeof window !== "undefined" && window.location.pathname.includes("comunicacion-interna"))) return;
      const titulo = u.tipo === "comunicado" ? `📣 Comunicado de ${u.autor}` : `💬 ${u.autor}`;
      toast(titulo, {
        description: u.texto ? (u.texto.length > 90 ? `${u.texto.slice(0, 90)}…` : u.texto) : "Te mandó un archivo",
        duration: 8000,
        action: { label: "Ver", onClick: () => onVer(u.canalId) },
      });
    },
    [onVer, silencio],
  );
  useAvisosChat(alLlegar);
  return null;
}
