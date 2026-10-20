import { useEffect, useState } from "react";

/* Ubicación: src/lib/cloud-esther/composer-visible.ts
   ¿Hay una caja de "escribir mensaje" en pantalla? (chats de Comunicación y Comunicación interna)
   Los botones flotantes de Esther la usan para correrse arriba y achicarse,
   así nunca tapan el botón «Enviar». Las cajas se marcan con el atributo data-ce-composer. */

export function useHayComposer() {
  const [hay, setHay] = useState(false);
  useEffect(() => {
    let cuadro = 0;
    const revisar = () => {
      cancelAnimationFrame(cuadro);
      cuadro = requestAnimationFrame(() => setHay(!!document.querySelector("[data-ce-composer]")));
    };
    revisar();
    const mo = new MutationObserver(revisar);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      cancelAnimationFrame(cuadro);
      mo.disconnect();
    };
  }, []);
  return hay;
}

/** Clases de posición del botón flotante según haya o no un chat abierto. */
export const POS_FLOTANTE = "bottom-[calc(4.75rem+env(safe-area-inset-bottom))] lg:bottom-5";
export const POS_FLOTANTE_CHAT = "bottom-[calc(13rem+env(safe-area-inset-bottom))] lg:bottom-48";
