import { Fragment, type ReactNode } from "react";
import { Quote } from "lucide-react";

import { slugify } from "@/lib/blog/blog";

/* Ubicación: src/components/blog/ContenidoArticulo.tsx
   Muestra el texto de un artículo con un formato simple que el equipo escribe desde el panel:
     ## Título de sección      ### Subtítulo
     - ítem de lista           1. ítem numerado
     > cita destacada          **negrita**   *cursiva*   [texto](https://enlace)
     ![descripción](https://imagen)   (imagen dentro del artículo)
   Se arma con elementos de React (nunca HTML crudo): no se puede inyectar código. */

export type Bloque =
  | { tipo: "h2" | "h3" | "p" | "cita"; texto: string; id?: string }
  | { tipo: "ul" | "ol"; items: string[] }
  | { tipo: "img"; src: string; alt: string };

export function parsearContenido(contenido: string): Bloque[] {
  const bloques: Bloque[] = [];
  const lineas = contenido.replace(/\r\n/g, "\n").split("\n");
  let parrafo: string[] = [];
  let lista: { tipo: "ul" | "ol"; items: string[] } | null = null;
  let cita: string[] = [];

  const cerrar = () => {
    if (parrafo.length) bloques.push({ tipo: "p", texto: parrafo.join(" ") });
    if (lista) bloques.push(lista);
    if (cita.length) bloques.push({ tipo: "cita", texto: cita.join(" ") });
    parrafo = [];
    lista = null;
    cita = [];
  };

  for (const cruda of lineas) {
    const l = cruda.trim();
    if (!l) {
      cerrar();
      continue;
    }
    const img = /^!\[([^\]]*)\]\((https:\/\/[^\s)]+|data:image\/[a-z]+;base64,[^\s)]+)\)$/i.exec(l);
    if (l.startsWith("### ")) {
      cerrar();
      bloques.push({ tipo: "h3", texto: l.slice(4) });
    } else if (l.startsWith("## ")) {
      cerrar();
      const texto = l.slice(3);
      bloques.push({ tipo: "h2", texto, id: slugify(texto) });
    } else if (img) {
      cerrar();
      bloques.push({ tipo: "img", alt: img[1] ?? "", src: img[2] ?? "" });
    } else if (l.startsWith("> ")) {
      if (parrafo.length || lista) cerrar();
      cita.push(l.slice(2));
    } else if (/^[-*•] /.test(l)) {
      if (parrafo.length || cita.length || lista?.tipo === "ol") cerrar();
      lista ??= { tipo: "ul", items: [] };
      lista.items.push(l.replace(/^[-*•] /, ""));
    } else if (/^\d+[.)] /.test(l)) {
      if (parrafo.length || cita.length || lista?.tipo === "ul") cerrar();
      lista ??= { tipo: "ol", items: [] };
      lista.items.push(l.replace(/^\d+[.)] /, ""));
    } else {
      if (lista || cita.length) cerrar();
      parrafo.push(l);
    }
  }
  cerrar();
  return bloques;
}

/** Negrita, cursiva y enlaces dentro de una línea. */
function enLinea(texto: string): ReactNode[] {
  const partes: ReactNode[] = [];
  const re = /\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\)/g;
  let ultimo = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(texto))) {
    if (m.index > ultimo) partes.push(texto.slice(ultimo, m.index));
    if (m[1]) partes.push(<strong key={k++} className="font-semibold text-[#1b1233]">{m[1]}</strong>);
    else if (m[2]) partes.push(<em key={k++}>{m[2]}</em>);
    else if (m[3] && m[4]) {
      const externo = m[4].startsWith("http");
      partes.push(
        <a
          key={k++}
          href={m[4]}
          {...(externo ? { target: "_blank", rel: "noopener noreferrer nofollow" } : {})}
          className="font-medium text-violet-700 underline decoration-violet-300 underline-offset-4 transition-colors hover:decoration-violet-600"
        >
          {m[3]}
        </a>,
      );
    }
    ultimo = re.lastIndex;
  }
  if (ultimo < texto.length) partes.push(texto.slice(ultimo));
  return partes;
}

export function ContenidoArticulo({ contenido }: { contenido: string }) {
  const bloques = parsearContenido(contenido);
  return (
    <div className="text-[17px] leading-[1.85] text-[#1b1233]/80 sm:text-[18px]">
      {bloques.map((b, i) => {
        switch (b.tipo) {
          case "h2":
            return (
              <h2
                key={i}
                id={b.id}
                className="mt-12 scroll-mt-28 font-display text-[1.65rem] font-bold leading-tight tracking-tight text-[#1b1233] first:mt-0 sm:text-3xl"
              >
                {enLinea(b.texto)}
              </h2>
            );
          case "h3":
            return (
              <h3 key={i} className="mt-8 font-display text-xl font-semibold tracking-tight text-[#1b1233]">
                {enLinea(b.texto)}
              </h3>
            );
          case "p":
            return (
              <p key={i} className="mt-5">
                {enLinea(b.texto)}
              </p>
            );
          case "cita":
            return (
              <blockquote
                key={i}
                className="relative my-9 overflow-hidden rounded-3xl border border-violet-200/70 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 px-6 py-6 sm:px-8"
              >
                <Quote aria-hidden className="absolute -right-2 -top-2 size-20 text-violet-200/60" />
                <span aria-hidden className="absolute inset-y-5 left-0 w-1 rounded-r-full bg-gradient-to-b from-violet-500 to-fuchsia-500" />
                <p className="relative font-display text-lg font-medium leading-relaxed text-[#2a1b55] sm:text-xl">
                  {enLinea(b.texto)}
                </p>
              </blockquote>
            );
          case "img":
            return (
              <figure key={i} className="my-9">
                <img src={b.src} alt={b.alt} loading="lazy" className="w-full rounded-3xl border border-violet-100 object-cover shadow-[0_30px_60px_-35px_rgba(76,29,149,0.45)]" />
                {b.alt && <figcaption className="mt-3 text-center text-sm text-[#1b1233]/50">{b.alt}</figcaption>}
              </figure>
            );
          case "ul":
            return (
              <ul key={i} className="mt-5 space-y-3">
                {b.items.map((it, j) => (
                  <li key={j} className="flex gap-3">
                    <span aria-hidden className="mt-[0.7em] size-2 shrink-0 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500" />
                    <span>{enLinea(it)}</span>
                  </li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={i} className="mt-5 space-y-3">
                {b.items.map((it, j) => (
                  <li key={j} className="flex gap-3.5">
                    <span
                      aria-hidden
                      className="mt-[0.2em] grid size-7 shrink-0 place-items-center rounded-full bg-violet-100 text-[13px] font-bold text-violet-700"
                    >
                      {j + 1}
                    </span>
                    <span>{enLinea(it)}</span>
                  </li>
                ))}
              </ol>
            );
          default:
            return <Fragment key={i} />;
        }
      })}
    </div>
  );
}

/** Títulos de sección (para el índice lateral del artículo). */
export function indiceDe(contenido: string) {
  const items: { id: string; texto: string }[] = [];
  for (const b of parsearContenido(contenido)) {
    if (b.tipo === "h2") items.push({ id: b.id ?? "", texto: b.texto.replace(/\*\*/g, "") });
  }
  return items;
}
