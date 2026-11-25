import { useEffect } from "react";

/* Ubicación: src/lib/blog/modo-claro.ts
   El blog público tiene su propio diseño (encabezado oscuro + tarjetas blancas con texto oscuro).
   Si el modo oscuro del panel, de la app de la clínica o de un portal quedó puesto en <html>
   (clase «dark»), la red de seguridad del tema oscurece las tarjetas blancas y los títulos dejan
   de verse. Mientras el blog está abierto se saca «dark» (y se vuelve a sacar si alguien la pone),
   y se le pide al navegador que no aplique su modo oscuro automático. Al salir, todo vuelve a como
   estaba. */
export function useModoClaroBlog() {
  useEffect(() => {
    if (typeof document === "undefined") return;
    const raiz = document.documentElement;
    const teniaOscuro = raiz.classList.contains("dark");
    raiz.classList.remove("dark");
    const obs = new MutationObserver(() => {
      if (raiz.classList.contains("dark")) raiz.classList.remove("dark");
    });
    obs.observe(raiz, { attributes: true, attributeFilter: ["class"] });

    let meta = document.head.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');
    const antes = meta?.getAttribute("content") ?? null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "color-scheme");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", "only light");

    return () => {
      obs.disconnect();
      if (teniaOscuro) raiz.classList.add("dark");
      if (antes === null) meta?.remove();
      else meta?.setAttribute("content", antes);
    };
  }, []);
}
