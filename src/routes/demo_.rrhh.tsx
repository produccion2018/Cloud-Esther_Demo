import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/cloud-esther/AppShell";
import { CloudEstherProvider } from "@/lib/cloud-esther/data";
import { RRHHModule } from "@/components/cloud-esther/RRHHModule";

export const Route = createFileRoute("/demo_/rrhh")({
  component: DemoRRHH,
  head: () => ({
    meta: [{ title: "Recursos Humanos | Cloud Esther" }],
  }),
});

function RRHHInner() {
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
        <h1 className="mb-4 text-2xl font-bold tracking-tight text-foreground">
          Recursos Humanos
        </h1>
        <RRHHModule onToast={mostrarToast} />
      </div>

      {mensaje && (
        <div className="fixed bottom-6 right-6 z-50 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background shadow-lg">
          {mensaje}
        </div>
      )}
    </AppShell>
  );
}

function DemoRRHH() {
  return (
    <CloudEstherProvider>
      <RRHHInner />
    </CloudEstherProvider>
  );
}