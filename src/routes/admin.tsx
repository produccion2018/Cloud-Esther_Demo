import { createFileRoute, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";

/* Ubicación: src/routes/admin.tsx
   Acceso directo al panel interno: escribir /admin en la web de Cloud Esther lleva al panel de
   administración (es otra aplicación, otro repositorio). También funciona con subrutas:
   /admin/demos → {panel}/admin/demos.
   - VITE_PANEL_URL: dirección publicada del panel (ej. https://admin.cloudesther.com).
   - En desarrollo, si no está configurada, usa el panel local en http://localhost:5174.
   La web pública no tiene ningún enlace visible a esta ruta. */

const PANEL_URL =
  (import.meta.env["VITE_PANEL_URL"] as string | undefined)?.replace(/\/$/, "") ??
  (import.meta.env.DEV ? "http://localhost:5174" : undefined);

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Panel de administración | Cloud Esther" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: IrAlPanel,
});

function IrAlPanel() {
  const { pathname, searchStr } = useRouterState({
    select: (s) => ({ pathname: s.location.pathname, searchStr: s.location.searchStr }),
  });
  const destino = PANEL_URL ? `${PANEL_URL}${pathname}${searchStr}` : null;

  useEffect(() => {
    if (destino) window.location.replace(destino);
  }, [destino]);

  return (
    <main className="grid min-h-screen place-items-center bg-background p-6 text-center">
      <div className="max-w-md space-y-3">
        <p className="text-lg font-bold text-foreground">
          {destino ? "Abriendo el panel de administración…" : "Panel no configurado"}
        </p>
        {destino ? (
          <p className="text-sm text-muted-foreground">
            Si no se abre solo,{" "}
            <a href={destino} className="font-semibold text-primary underline">
              entrá desde acá
            </a>
            .
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Falta indicar la dirección del panel en la variable VITE_PANEL_URL.
          </p>
        )}
      </div>
    </main>
  );
}
