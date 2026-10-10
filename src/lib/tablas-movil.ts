import { useEffect, type RefObject } from "react";

/* Ubicación: src/lib/tablas-movil.ts
   Tablas cómodas en el celular. En pantallas chicas (< 640 px) cada fila de una tabla se muestra
   como una tarjeta con «etiqueta: valor» (estilos .tabla-apilable en styles.css). Este hook pone a
   cada celda la etiqueta de su columna (data-label) leyendo el encabezado de la tabla, así no hay
   que tocar cada pantalla. En tablet y PC las tablas se ven igual que siempre. */

function etiquetar(raiz: HTMLElement) {
  raiz.querySelectorAll("table").forEach((tabla) => {
    if (tabla.dataset["apilar"] === "no") return;
    const titulos = [...tabla.querySelectorAll("thead th")].map(
      (th) => th.textContent?.trim() ?? "",
    );
    if (!titulos.length) return;
    tabla.classList.add("tabla-apilable");
    tabla.querySelectorAll("tbody tr").forEach((fila) => {
      [...fila.children].forEach((celda, i) => {
        const etiqueta = titulos[i] ?? "";
        if (celda.getAttribute("data-label") !== etiqueta)
          celda.setAttribute("data-label", etiqueta);
      });
    });
  });
}

/** Etiqueta las tablas dentro del contenedor y las mantiene al día cuando cambian las filas. */
export function useTablasApilables(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const raiz = ref.current;
    if (!raiz || typeof MutationObserver === "undefined") return;
    etiquetar(raiz);
    // Solo se observan altas y bajas de nodos: cambiar atributos no vuelve a disparar el observador.
    const observador = new MutationObserver(() => etiquetar(raiz));
    observador.observe(raiz, { childList: true, subtree: true });
    return () => observador.disconnect();
  }, [ref]);
}
