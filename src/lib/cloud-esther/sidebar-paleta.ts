import type { CSSProperties } from "react";

/* Ubicación: src/lib/cloud-esther/sidebar-paleta.ts
   Paleta del sidebar a partir del color elegido en Configuración > Apariencia.
   La usan el sidebar real (AppShell) y la vista previa, así se ven igual. */

function hexToRgb(hex: string) {
  const clean = hex.replace("#", "");
  const bigint = parseInt(clean, 16);
  return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
}

function rgbToHex(r: number, g: number, b: number) {
  const toHex = (v: number) =>
    Math.round(Math.max(0, Math.min(255, v)))
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function mix(hex: string, target: "white" | "black", amount: number) {
  const { r, g, b } = hexToRgb(hex);
  const t = target === "white" ? 255 : 0;
  return rgbToHex(r + (t - r) * amount, g + (t - g) * amount, b + (t - b) * amount);
}

function luminance(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const [rl, gl, bl] = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * (rl ?? 0) + 0.7152 * (gl ?? 0) + 0.0722 * (bl ?? 0);
}

/* Colores neutros: con blanco o negro el acento sale del violeta de marca, así el ítem activo,
   el recuadro del plan y los contadores siempre se distinguen. */
const PALETA_NEUTRA = {
  claro: {
    background: "#ffffff",
    foreground: "#2b2638",
    accent: "#f1edfb",
    border: "#e8e3f2",
    primary: "#7c3aed",
  },
  oscuro: {
    background: "#0d0c11",
    foreground: "#ece9f4",
    accent: "#24212d",
    border: "#2c2936",
    primary: "#a78bfa",
  },
};

export function buildSidebarPalette(baseHex: string, dark: boolean): CSSProperties {
  const lum = luminance(baseHex);
  const neutra =
    lum > 0.9
      ? dark
        ? PALETA_NEUTRA.oscuro
        : PALETA_NEUTRA.claro
      : lum < 0.02
        ? PALETA_NEUTRA.oscuro
        : null;
  const background =
    neutra?.background ?? (dark ? mix(baseHex, "black", 0.86) : mix(baseHex, "white", 0.87));

  const foreground =
    neutra?.foreground ?? (dark ? mix(baseHex, "white", 0.82) : mix(baseHex, "black", 0.72));
  const accent =
    neutra?.accent ?? (dark ? mix(baseHex, "black", 0.72) : mix(baseHex, "white", 0.72));
  const accentForeground = foreground;
  const border =
    neutra?.border ?? (dark ? mix(baseHex, "black", 0.68) : mix(baseHex, "white", 0.62));
  // En oscuro el primario se aclara solo lo justo para que el texto blanco siga leyéndose.
  const primary =
    neutra?.primary ?? (dark ? mix(baseHex, "white", 0.12) : mix(baseHex, "black", 0.12));
  const primaryForeground = "#ffffff";

  const vars: Record<string, string> = {
    "--sidebar": background,
    "--sidebar-foreground": foreground,
    "--sidebar-accent": accent,
    "--sidebar-accent-foreground": accentForeground,
    "--sidebar-border": border,
    "--sidebar-primary": primary,
    "--sidebar-primary-foreground": primaryForeground,
  };

  for (const [k, v] of Object.entries({ ...vars })) {
    vars[k.replace("--sidebar", "--color-sidebar")] = v;
  }

  return vars as CSSProperties;
}
