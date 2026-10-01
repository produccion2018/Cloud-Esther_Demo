import { Link } from "@tanstack/react-router";
import { Maximize2, Volume2, VolumeX, X } from "lucide-react";
import { useCloudEsther } from "@/lib/cloud-esther/data";
import { useSesion } from "@/lib/cloud-esther/auth-store";
import { useConN8n } from "@/lib/cloud-esther/n8n-acceso";
import type { EstherSection } from "@/lib/cloud-esther/esther-ai";
import { EstherCharacter } from "./EstherCharacter";
import { EstherConversation } from "./EstherConversation";
import { useEstherAI, vozDisponible } from "./useEstherAI";
import { useMicrofono } from "./microfono";
import "./esther-ai.css";

const SECCION: Record<string, EstherSection> = {
  agenda: "turnos",
  pacientes: "paciente",
  historia: "historia",
  odontograma3d: "odontograma",
  rrhh: "rrhh",
};
const SUGERENCIAS: Record<string, string[]> = {
  dashboard: ["Revisar pendientes", "¿Qué turnos hay hoy?", "¿Cuánto facturamos este mes?"],
  agenda: [
    "¿Qué turnos hay hoy?",
    "¿Qué turnos hay mañana?",
    "¿Cuántas citas tenemos esta semana?",
  ],
  pacientes: ["¿Cuántos pacientes activos tenemos?", "Pacientes que no regresaron"],
  historia: ["Resumí la historia clínica del paciente", "¿Qué tratamientos están pendientes?"],
  odontograma3d: ["Revisá el odontograma del paciente", "¿Qué tratamientos están pendientes?"],
  tratamientos: ["¿Qué tratamientos están pendientes?"],
  presupuestos: [
    "¿Cuántos presupuestos pendientes hay?",
    "Prepárame un reporte de los presupuestos pendientes",
  ],
  facturacion: ["¿Cuánto facturamos este mes?", "¿Qué facturas están vencidas?"],
  finanzas: ["¿Cuánto facturamos este mes?", "¿Qué facturas están vencidas?"],
  inventario: ["¿Qué insumos tienen stock bajo?"],
  equipo: ["¿Quiénes tienen acceso al sistema?"],
  "portal-paciente": ["¿Cuántos pacientes usan el portal?"],
  rrhh: ["¿Quién falta hoy?", "Pendientes de RRHH"],
};

export default function EstherPanelFlotante({
  moduloId,
  modulo,
  onClose,
}: {
  moduloId: string;
  modulo: string;
  onClose: () => void;
}) {
  const { plan } = useCloudEsther();
  const { usuario } = useSesion();
  const conN8n = useConN8n();
  const nombre = usuario?.nombre ?? "Jesús Méndez";
  const esther = useEstherAI({
    context: {
      section: SECCION[moduloId] ?? "general",
      plan,
      rol: "admin",
      sede: "Todas",
      usuario: nombre,
      n8n: conN8n,
    },
    saludo: `Estás en ${modulo}. ¿Qué querés saber?`,
  });
  const microfono = useMicrofono({
    onTexto: (t) => void esther.send(t),
    onEstado: esther.escuchar,
  });

  return (
    <div
      role="dialog"
      aria-label="Esther IA"
      className="esther-ai fixed bottom-24 right-5 z-[60] flex h-[min(600px,calc(100vh-8rem))] w-[min(400px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-3xl border border-primary/15 bg-card shadow-[0_30px_70px_-30px_rgba(76,29,149,0.6)]"
    >
      <div
        className="relative flex items-end gap-3 border-b border-primary/10 px-4 pt-3"
        style={{ background: "var(--gradient-stage)" }}
      >
        <div className="relative h-[92px] w-[64px] shrink-0">
          <EstherCharacter state={esther.state} pose={esther.pose} compact alto={88} />
        </div>
        <div className="min-w-0 flex-1 pb-3">
          <p className="text-sm font-bold">Esther IA</p>
          <p className="truncate text-[11px] font-semibold text-primary">{esther.label}</p>
          <p className="truncate text-[11px] text-muted-foreground">{esther.message}</p>
        </div>
        <div className="flex gap-1 self-start">
          <button
            type="button"
            onClick={() => esther.setLeerEnVoz(!esther.leerEnVoz)}
            disabled={!vozDisponible()}
            aria-pressed={esther.leerEnVoz}
            aria-label="Respuesta en voz alta"
            title="Respuesta en voz alta"
            className={`grid size-8 place-items-center rounded-full transition ${esther.leerEnVoz ? "bg-primary text-primary-foreground" : "bg-card/80 text-muted-foreground hover:text-primary"}`}
          >
            {esther.leerEnVoz ? <Volume2 className="size-3.5" /> : <VolumeX className="size-3.5" />}
          </button>
          <Link
            to={"/demo/ia" as never}
            aria-label="Abrir Esther IA completa"
            title="Abrir Esther IA completa"
            className="grid size-8 place-items-center rounded-full bg-card/80 text-muted-foreground transition hover:text-primary"
          >
            <Maximize2 className="size-3.5" />
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="grid size-8 place-items-center rounded-full bg-card/80 text-muted-foreground transition hover:text-primary"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col p-3">
        <EstherConversation
          messages={esther.messages}
          isBusy={esther.isBusy}
          onSend={(t) => void esther.send(t)}
          onTyping={esther.notifyTyping}
          microfono={microfono}
          sugerencias={SUGERENCIAS[moduloId] ?? SUGERENCIAS["dashboard"] ?? []}
          compacto
        />
      </div>
    </div>
  );
}
