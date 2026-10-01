import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/cloud-esther/AppShell";
import { CloudEstherProvider } from "@/lib/cloud-esther/data";
import { ConfiguracionModule } from "@/components/cloud-esther/ConfiguracionModule";

export const Route = createFileRoute("/demo_/configuracion")({
  component: DemoConfiguracion,
  head: () => ({
    meta: [{ title: "Configuración | Cloud Esther" }],
  }),
});

function ConfiguracionInner() {
  const [mensaje, setMensaje] = useState<string | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const mostrarToast = (msg: string) => {
    setMensaje(msg);
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => setMensaje(null), 2600);
  };

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[1400px] px-4 py-6 md:px-6 lg:px-8">
        <ConfiguracionModule onToast={mostrarToast} />
      </div>

      {mensaje && (
        <div className="fixed bottom-6 right-6 z-50 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background shadow-lg">
          {mensaje}
        </div>
      )}
    </AppShell>
  );
}

function DemoConfiguracion() {
  return (
    <CloudEstherProvider>
      <ConfiguracionInner />
    </CloudEstherProvider>
  );
}
