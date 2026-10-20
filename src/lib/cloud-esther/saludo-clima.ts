import { useEffect, useState } from "react";

/* Ubicación: src/lib/cloud-esther/saludo-clima.ts
   Saludo por hora del día y clima real (API gratuita Open-Meteo, sin credenciales).
   - saludoHora(): «Buenos días» / «Buenas tardes» / «Buenas noches» según la hora.
   - useClima(): pide el clima real por la ubicación del navegador. Si el navegador no da permiso
     o no hay internet, devuelve null y el saludo simplemente no menciona el clima (sin inventar). */

export function saludoHora(fecha = new Date()): string {
  const h = fecha.getHours();
  if (h >= 6 && h < 13) return "Buenos días";
  if (h >= 13 && h < 20) return "Buenas tardes";
  return "Buenas noches";
}

/** Primer nombre a partir del nombre completo. */
export function primerNombreDe(nombre: string): string {
  return (nombre || "").trim().split(/\s+/)[0] ?? "";
}

export type Clima = { tempC: number; descripcion: string; ciudad: string };

// Códigos de tiempo de Open-Meteo → texto corto en español.
const WMO: Record<number, string> = {
  0: "despejado", 1: "mayormente despejado", 2: "parcialmente nublado", 3: "nublado",
  45: "con niebla", 48: "con niebla", 51: "llovizna", 53: "llovizna", 55: "llovizna",
  61: "con lluvia", 63: "con lluvia", 65: "con lluvia fuerte", 71: "con nieve", 73: "con nieve",
  75: "con nieve", 80: "con chaparrones", 81: "con chaparrones", 82: "con chaparrones fuertes",
  95: "con tormenta", 96: "con tormenta", 99: "con tormenta",
};

async function traerClima(lat: number, lon: number): Promise<Clima | null> {
  try {
    const u = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code`;
    const r = await fetch(u);
    if (!r.ok) return null;
    const d = await r.json();
    const temp = d?.current?.temperature_2m;
    const code = d?.current?.weather_code;
    if (typeof temp !== "number") return null;
    // Ciudad por geocodificación inversa (también gratis, sin credenciales). Si falla, sin ciudad.
    let ciudad = "";
    try {
      const g = await fetch(`https://geocoding-api.open-meteo.com/v1/search?latitude=${lat}&longitude=${lon}&count=1&language=es`);
      if (g.ok) ciudad = (await g.json())?.results?.[0]?.name ?? "";
    } catch { /* sin ciudad */ }
    return { tempC: Math.round(temp), descripcion: WMO[code] ?? "", ciudad };
  } catch {
    return null;
  }
}

/** Clima real por la ubicación del navegador. null mientras carga o si no hay permiso/internet. */
export function useClima(): Clima | null {
  const [clima, setClima] = useState<Clima | null>(null);
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    let vivo = true;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const c = await traerClima(pos.coords.latitude, pos.coords.longitude);
        if (vivo) setClima(c);
      },
      () => { /* sin permiso: no se muestra clima, no se inventa */ },
      { timeout: 8000, maximumAge: 600000 },
    );
    return () => { vivo = false; };
  }, []);
  return clima;
}

/** Texto del clima para el saludo, o "" si todavía no hay dato. */
export function fraseClima(clima: Clima | null): string {
  if (!clima) return "";
  const lugar = clima.ciudad ? ` en ${clima.ciudad}` : "";
  const desc = clima.descripcion ? `, ${clima.descripcion}` : "";
  return `Ahora${lugar} hay ${clima.tempC}°${desc}.`;
}
