import { useSyncExternalStore, type CSSProperties } from "react";
import { claveTenant } from "@/lib/cloud-esther/tenant-store";

/* Ubicación: src/lib/clinica/fondo-chat.ts
   FONDOS DE COMUNICACIÓN INTERNA (todos los planes).
   - Cada persona elige su fondo: para todos los chats o solo para uno.
   - Fondos listos (luces suaves y dibujos) o una foto propia (se achica antes de guardar).
   - Se guarda SOLO en el navegador de esa persona y separado por clínica y por persona
     (clave con la clínica + el id de la persona): no viaja al servidor ni lo ve nadie más. */

export type FondoChat = { tipo: "preset"; id: string } | { tipo: "imagen"; url: string };

type Guardado = { general?: FondoChat; porCanal?: Record<string, FondoChat> };

/** Diente dibujado en línea fina, para el fondo «Sonrisas». */
const tooth = (color: string, opacidad = 0.2) =>
  `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='72' height='72' viewBox='0 0 72 72' transform='rotate(-12)'><path d='M26 18c-5 0-8 4-8 9 0 6 3 10 4 16 1 5 2 11 5 11 3 0 3-6 5-9 1-2 3-2 4 0 2 3 2 9 5 9 3 0 4-6 5-11 1-6 4-10 4-16 0-5-3-9-8-9-4 0-6 2-8 2s-4-2-8-2z' fill='none' stroke='${color}' stroke-width='1.2' opacity='${opacidad}'/></svg>`,
  )}")`;

/** Grilla de puntos; «desfase» corre la grilla para poder superponer dos colores. */
const puntos = (color: string, desfase = "0 0") =>
  `radial-gradient(${color} 1px, transparent 1.4px) ${desfase} / 18px 18px`;

/** Fondos listos. «oscuro» avisa que los textos sueltos (fechas, avisos) van en claro. */
export const FONDOS: { id: string; nombre: string; fondo: string; oscuro?: boolean }[] = [
  {
    id: "clasico",
    nombre: "Clásico",
    fondo:
      "radial-gradient(120% 60% at 100% 0%, color-mix(in oklab, var(--color-primary) 6%, transparent), transparent), radial-gradient(90% 50% at 0% 100%, color-mix(in oklab, var(--color-primary) 3%, transparent), transparent)",
  },
  {
    id: "lavanda",
    nombre: "Lavanda",
    fondo:
      "radial-gradient(70% 55% at 0% 0%, rgba(196,181,253,0.55), transparent 70%), radial-gradient(60% 50% at 100% 100%, rgba(249,168,212,0.35), transparent 70%), linear-gradient(160deg, #f7f3ff 0%, #efe7ff 55%, #fdf4fb 100%)",
  },
  {
    id: "aurora",
    nombre: "Aurora",
    fondo:
      "radial-gradient(60% 50% at 15% 10%, rgba(167,139,250,0.38), transparent 70%), radial-gradient(50% 45% at 90% 30%, rgba(244,114,182,0.3), transparent 70%), radial-gradient(60% 50% at 50% 100%, rgba(56,189,248,0.25), transparent 70%), radial-gradient(40% 35% at 0% 70%, rgba(110,231,183,0.18), transparent 70%), #fbf9ff",
  },
  {
    id: "menta",
    nombre: "Menta",
    fondo:
      "radial-gradient(60% 50% at 100% 0%, rgba(110,231,183,0.4), transparent 70%), radial-gradient(55% 45% at 0% 100%, rgba(125,211,252,0.3), transparent 70%), linear-gradient(160deg, #f0fdf8 0%, #e6f8f5 55%, #f2faff 100%)",
  },
  {
    id: "atardecer",
    nombre: "Atardecer",
    fondo:
      "radial-gradient(60% 50% at 0% 0%, rgba(253,186,116,0.45), transparent 70%), radial-gradient(55% 50% at 100% 60%, rgba(251,146,180,0.35), transparent 70%), linear-gradient(160deg, #fff8f0 0%, #ffe9ea 55%, #f6f0ff 100%)",
  },
  {
    id: "oceano",
    nombre: "Océano",
    fondo:
      "radial-gradient(65% 50% at 100% 0%, rgba(96,165,250,0.4), transparent 70%), radial-gradient(60% 50% at 0% 100%, rgba(103,232,249,0.3), transparent 70%), linear-gradient(160deg, #f0f6ff 0%, #e3e9ff 55%, #eefcff 100%)",
  },
  {
    id: "sonrisa",
    nombre: "Sonrisas",
    fondo: `${tooth("#7c3aed", 0.22)} 0 0 / 96px 96px, ${tooth("#a855f7", 0.14)} 48px 48px / 96px 96px, radial-gradient(70% 50% at 50% 0%, rgba(196,181,253,0.35), transparent 70%), linear-gradient(160deg, #faf7ff, #f3edff)`,
  },
  {
    id: "puntos",
    nombre: "Puntos",
    fondo: `${puntos("rgba(124,58,237,0.2)")}, ${puntos("rgba(244,114,182,0.15)", "9px 9px")}, radial-gradient(70% 50% at 100% 0%, rgba(196,181,253,0.25), transparent 70%), #fcfbff`,
  },
  {
    id: "noche",
    nombre: "Noche",
    oscuro: true,
    fondo:
      "radial-gradient(60% 50% at 20% 0%, rgba(124,58,237,0.5), transparent 70%), radial-gradient(50% 40% at 100% 100%, rgba(217,70,239,0.32), transparent 70%), radial-gradient(45% 35% at 50% 55%, rgba(99,102,241,0.14), transparent 70%), #160c2e",
  },
  {
    id: "grafito",
    nombre: "Grafito",
    oscuro: true,
    fondo: `${puntos("rgba(255,255,255,0.07)")}, radial-gradient(60% 40% at 80% 0%, rgba(124,58,237,0.2), transparent 70%), linear-gradient(160deg, #1f2433, #141824)`,
  },
  {
    id: "bosque",
    nombre: "Bosque",
    oscuro: true,
    fondo:
      "radial-gradient(60% 50% at 0% 0%, rgba(52,211,153,0.28), transparent 70%), radial-gradient(55% 45% at 100% 100%, rgba(45,212,191,0.2), transparent 70%), linear-gradient(160deg, #0f2a24, #0a1c1a)",
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
          background: `linear-gradient(rgba(255,255,255,0.14), rgba(255,255,255,0.14)), url("${actual.url}") center / cover no-repeat`,
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

/* Foto propia: tamaño máximo y peso objetivo (para que entre en el navegador sin problemas). */
const LADO_MAX = 1400;
const PESO_MAX = 450_000; // caracteres del dato guardado, aprox. 330 KB de imagen

/** Achica la foto (máx. 1400 px, JPG) y ajusta la calidad hasta que pese poco. */
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
      const escala = Math.min(1, LADO_MAX / Math.max(img.width, img.height));
      const ancho = Math.max(1, Math.round(img.width * escala));
      const alto = Math.max(1, Math.round(img.height * escala));
      const c = document.createElement("canvas");
      c.width = ancho;
      c.height = alto;
      const ctx = c.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("No se pudo procesar la imagen."));
        return;
      }
      // Fondo blanco: las PNG con transparencia no se ven negras al pasar a JPG
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, ancho, alto);
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, ancho, alto);
      URL.revokeObjectURL(url);
      let calidad = 0.84;
      let salida = c.toDataURL("image/jpeg", calidad);
      while (salida.length > PESO_MAX && calidad > 0.5) {
        calidad -= 0.08;
        salida = c.toDataURL("image/jpeg", calidad);
      }
      resolve(salida);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer la imagen."));
    };
    img.src = url;
  });
}