import { createServerFn } from "@tanstack/react-start";

/* Ubicación: src/lib/cloud-esther/integraciones-probar.ts
   Prueba REAL de conexión para integraciones basadas en URL (webhooks, instancia de n8n).
   Corre en el SERVIDOR (evita el CORS del navegador): intenta llegar a la URL y responde si
   contestó. Si contesta cualquier cosa (incluso 4xx) el servidor está vivo = accesible; si hay
   error de red o se vence el tiempo, no es accesible. No es un setTimeout de mentira. */

async function alcanzar(url: string, metodo: "HEAD" | "GET"): Promise<number> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch(url, { method: metodo, redirect: "manual", signal: ctrl.signal });
    return r.status;
  } finally {
    clearTimeout(t);
  }
}

export const probarUrl = createServerFn({ method: "POST" })
  .inputValidator((d: { url: string }) => d)
  .handler(async ({ data }): Promise<{ ok: boolean; estado?: number }> => {
    const url = data.url.trim();
    if (!/^https:\/\/.+\..+/.test(url)) return { ok: false };
    try {
      // Muchos endpoints de webhook no aceptan HEAD: si falla, se reintenta con GET.
      let estado: number;
      try {
        estado = await alcanzar(url, "HEAD");
      } catch {
        estado = await alcanzar(url, "GET");
      }
      return { ok: true, estado };
    } catch {
      return { ok: false };
    }
  });
