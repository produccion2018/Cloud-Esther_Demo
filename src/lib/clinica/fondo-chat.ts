import { useSyncExternalStore, type CSSProperties } from "react";
import { claveTenant } from "@/lib/cloud-esther/tenant-store";

/* Ubicación: src/lib/clinica/fondo-chat.ts
   FONDOS DE COMUNICACIÓN INTERNA (todos los planes).
   - Cada persona elige su fondo: para todos los chats o solo para uno.
   - Fondos listos (degradés y dibujos suaves) o una foto propia (se achica antes de guardar).
   - Se guarda SOLO en el navegador de esa persona y separado por clínica y por persona
     (clave con la clínica + el id de la persona): no viaja al servidor ni lo ve nadie más. */

export type FondoChat = { tipo: "preset"; id: string } | { tipo: "imagen"; url: string };

type Guardado = { general?: FondoChat; porCanal?: Record<string, FondoChat> };

const tooth = (color: string) =>
  `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='72' height='72' viewBox='0 0 72 72' transform='rotate(-12)'><path d='M26 18c-5 0-8 4-8 9 0 6 3 10 4 16 1 5 2 11 5 11 3 0 3-6 5-9 1-2 3-2 4 0 2 3 2 9 5 9 3 0 4-6 5-11 1-6 4-10 4-16 0-5-3-9-8-9-4 0-6 2-8 2s-4-2-8-2z' fill='none' stroke='${color}' stroke-width='1.2' opacity='0.2'/></svg>`,
  )}")`;

const puntos = (color: string) =>
  `radial-gradient(${color} 1px, transparent 1.4px) 0 0 / 18px 18px`;

/** Fondos listos. «oscuro» avisa que los textos sueltos (fechas, avisos) van en claro. */
export const FONDOS: { id: string; nombre: string; fondo: string; oscuro?: boolean }[] = [
  {
    id: "clasico",
    nombre: "Clásico",
    fondo: "radial-gradient(120% 60% at 100% 0%, color-mix(in oklab, var(--color-primary) 5%, transparent), transparent)",
  },
  { id: "lavanda", nombre: "Lavanda", fondo: "linear-gradient(160deg, #f5f0ff 0%, #ede4ff 45%, #fdf2fb 100%)" },
  {
    id: "aurora",
    nombre: "Aurora",
    fondo:
      "radial-gradient(60% 50% at 15% 10%, rgba(167,139,250,0.35), transparent 70%), radial-gradient(50% 45% at 90% 30%, rgba(244,114,182,0.28), transparent 70%), radial-gradient(60% 50% at 50% 100%, rgba(56,189,248,0.22), transparent 70%), #fbf9ff",
  },
  { id: "menta", nombre: "Menta", fondo: "linear-gradient(160deg, #ecfdf5 0%, #e0f7f4 50%, #f0f9ff 100%)" },
  { id: "atardecer", nombre: "Atardecer", fondo: "linear-gradient(160deg, #fff7ed 0%, #ffe4e6 55%, #f5f0ff 100%)" },
  { id: "oceano", nombre: "Océano", fondo: "linear-gradient(160deg, #eff6ff 0%, #e0e7ff 50%, #ecfeff 100%)" },
  {
    id: "sonrisa",
    nombre: "Sonrisas",
    fondo: `${tooth("#7c3aed")} 0 0 / 88px 88px, linear-gradient(160deg, #faf7ff, #f3edff)`,
  },
  { id: "puntos", nombre: "Puntos", fondo: `${puntos("rgba(124,58,237,0.18)")}, #fcfbff` },
  {
    id: "noche",
    nombre: "Noche",
    oscuro: true,
    fondo:
      "radial-gradient(60% 50% at 20% 0%, rgba(124,58,237,0.45), transparent 70%), radial-gradient(50% 40% at 100% 100%, rgba(217,70,239,0.3), transparent 70%), #160c2e",
  },
  {
    id: "grafito",
    nombre: "Grafito",
    oscuro: true,
    fondo: `${puntos("rgba(255,255,255,0.07)")}, linear-gradient(160deg, #1f2433, #141824)`,
  },
];

const clave = (personaId: string) => claveTenant(`cloud-esther:fondo-chat:${personaId}`);

function leer(personaId: string): Guardado {
  try {
    const raw = localStorage.getItem(clave(personaId));
    return raw ? (JSON.parse(raw) as Guardado) : {};
  } catch {
    return {};
  }
}

const oyentes = new Set<() => void>();
let version = 0;
const avisar = () => {
  version++;
  oyentes.forEach((f) => f());
};

function escribir(personaId: string, g: Guardado) {
  try {
    localStorage.setItem(clave(personaId), JSON.stringify(g));
  } catch {
    throw new Error("No hay espacio para guardar esa imagen. Probá con una más chica.");
  } finally {
    avisar();
  }
}

/** Fondo que se ve en un chat (el del chat, si no el general, si no el clásico) + cómo pintarlo. */
export function useFondoChat(personaId: string, canalId: string) {
  useSyncExternalStore(
    (f) => {
      oyentes.add(f);
      return () => oyentes.delete(f);
    },
    () => version,
    () => 0,
  );
  const g = typeof window === "undefined" ? {} : leer(personaId);
  const propio = g.porCanal?.[canalId];
  const actual: FondoChat = propio ?? g.general ?? { tipo: "preset", id: "clasico" };
  const preset = actual.tipo === "preset" ? FONDOS.find((f) => f.id === actual.id) ?? FONDOS[0] : null;
  const estilo: CSSProperties =
    actual.tipo === "imagen"
      ? {
          background: `linear-gradient(rgba(255,255,255,0.18), rgba(255,255,255,0.18)), url("${actual.url}") center / cover no-repeat`,
        }
      : { background: preset!.fondo };
  return {
    actual,
    soloEsteChat: !!propio,
    oscuro: actual.tipo === "imagen" ? false : !!preset?.oscuro,
    conImagen: actual.tipo === "imagen",
    estilo,
    guardar(f: FondoChat, soloEste: boolean) {
      const g2 = leer(personaId);
      if (soloEste) escribir(personaId, { ...g2, porCanal: { ...(g2.porCanal ?? {}), [canalId]: f } });
      else {
        const porCanal = { ...(g2.porCanal ?? {}) };
        delete porCanal[canalId];
        escribir(personaId, { ...g2, general: f, porCanal });
      }
    },
    restablecer() {
      const g2 = leer(personaId);
      const porCanal = { ...(g2.porCanal ?? {}) };
      delete porCanal[canalId];
      escribir(personaId, { porCanal });
    },
  };
}

/** Achica la foto (máx. 1600 px, JPG) para que entre en el navegador. */
export function prepararImagenFondo(archivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!/^image\/(png|jpe?g|webp)$/.test(archivo.type)) {
      reject(new Error("Elegí una imagen JPG, PNG o WEBP."));
      return;
    }
    if (archivo.size > 15 * 1024 * 1024) {
      reject(new Error("La imagen es muy pesada (máximo 15 MB)."));
      return;
    }
    const img = new Image();
    const url = URL.createObjectURL(archivo);
    img.onload = () => {
      const escala = Math.min(1, 1600 / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * escala);
      c.height = Math.round(img.height * escala);
      c.getContext("2d")?.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.78));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer la imagen."));
    };
    img.src = url;
  });
}
