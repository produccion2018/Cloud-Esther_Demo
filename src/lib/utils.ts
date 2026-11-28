import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/* Palabras que van en minúscula dentro de un nombre (salvo al principio): "María de los Ángeles". */
const CONECTORES = new Set([
  "de",
  "del",
  "la",
  "las",
  "los",
  "y",
  "e",
  "da",
  "do",
  "dos",
  "van",
  "von",
]);

function capitalizarPalabra(palabra: string) {
  // Siglas con punto (S.A., S.R.L.) se dejan tal cual.
  if (palabra.includes(".")) return palabra.toUpperCase();
  return palabra
    .split(/([-'’])/)
    .map((parte) =>
      parte.length
        ? parte[0]!.toLocaleUpperCase("es") + parte.slice(1).toLocaleLowerCase("es")
        : parte,
    )
    .join("");
}

/** Normaliza nombres de personas y empresas: primera letra de cada palabra en mayúscula,
 *  el resto en minúscula, sin importar cómo lo hayan escrito ("jUAN pérez" → "Juan Pérez"). */
export function capitalizarNombre(texto: string) {
  return texto
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((p, i) =>
      i > 0 && CONECTORES.has(p.toLocaleLowerCase("es"))
        ? p.toLocaleLowerCase("es")
        : capitalizarPalabra(p),
    )
    .join(" ");
}

/** Texto para comparar en búsquedas: minúsculas y sin acentos ("Gómez" → "gomez"). */
export function normalizarBusqueda(texto: string) {
  return texto
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

/** Igual que capitalizarNombre pero sin recortar espacios: sirve mientras se escribe
 *  («juan » → «Juan », así se puede seguir tipeando el apellido). */
export function capitalizarEnVivo(texto: string) {
  let n = 0;
  return texto.replace(/\S+/g, (p) => {
    const primera = n++ === 0;
    return !primera && CONECTORES.has(p.toLocaleLowerCase("es")) ? p.toLocaleLowerCase("es") : capitalizarPalabra(p);
  });
}

/** Nombre de una sede: mayúscula inicial en cada palabra como sea que la escriban
 *  («sede centro», «SEDE CENTRO» → «Sede Centro»), pero respeta siglas cortas escritas en
 *  mayúscula dentro de un nombre normal («Sede CABA»). */
export function capitalizarSede(texto: string) {
  const limpio = texto.trim().replace(/\s+/g, " ");
  if (!limpio) return "";
  const todoMayuscula = limpio === limpio.toLocaleUpperCase("es") && /\p{L}{5,}/u.test(limpio);
  let n = 0;
  return limpio.replace(/\S+/g, (p) => {
    const primera = n++ === 0;
    if (!todoMayuscula && /^\p{Lu}{2,4}$/u.test(p)) return p;
    return !primera && CONECTORES.has(p.toLocaleLowerCase("es")) ? p.toLocaleLowerCase("es") : capitalizarPalabra(p);
  });
}
