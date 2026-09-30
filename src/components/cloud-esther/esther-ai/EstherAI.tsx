import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { useCloudEsther } from "@/lib/cloud-esther/data";
import { usePacientes } from "@/lib/cloud-esther/pacientes";
import { useSesion } from "@/lib/cloud-esther/auth-store";
import { sucursalesDelPlan } from "@/lib/cloud-esther/inventario-store";
import { ROL_IA_LABEL } from "@/lib/cloud-esther/esther-motor";
import type { RolIA } from "@/lib/cloud-esther/ia-store";
import { Modal } from "@/components/cloud-esther/rrhh/ui";
import { EstherImagen } from "./EstherImagen";
import { EstherSonrisa } from "./EstherSonrisa";
import type { EstherContext, EstherQuickAction } from "@/lib/cloud-esther/esther-ai";
import { EstherCharacter } from "./EstherCharacter";
import { EstherConversation } from "./EstherConversation";
import { EstherGlow } from "./EstherGlow";
import { EstherMessage } from "./EstherMessage";
import { EstherParticles } from "./EstherParticles";
import { EstherQuickActions as EstherQuickActionsBlock } from "./EstherQuickActions";
import { estherStates, type EstherState } from "./esther-states";
import { useEstherAI } from "./useEstherAI";
import "./esther-ai.css";

export type EstherAIProps = {
  state?: EstherState;
  message?: string;
  context?: EstherContext;
  onAction?: (action: EstherQuickAction) => void;
  variant?: "panel" | "compact";
};

export function EstherAI({
  state: controlledState,
  message: controlledMessage,
  context,
  onAction,
  variant = "panel",
}: EstherAIProps) {
  // Quién pregunta y sobre qué: la IA responde solo lo que ese usuario puede ver.
  const { plan } = useCloudEsther();
  const { pacientes } = usePacientes();
  const { usuario } = useSesion();
  const [pacienteId, setPacienteId] = useState<number | undefined>(undefined);
  const [rol, setRol] = useState<RolIA>("admin");
  const [sede, setSede] = useState("Todas");
  const [herramienta, setHerramienta] = useState<"imagen" | "sonrisa" | null>(null);
  const [aviso, setAviso] = useState("");
  const sedes = sucursalesDelPlan(plan === "grupo");
  const nombreUsuario = usuario?.nombre ?? "Jesús Méndez";
  const esther = useEstherAI({
    context: { ...context, plan, rol, sede, usuario: nombreUsuario, pacienteId },
  });
  useEffect(() => {
    if (!aviso) return;
    const t = window.setTimeout(() => setAviso(""), 3000);
    return () => window.clearTimeout(t);
  }, [aviso]);
  const state = controlledState ?? esther.state;
  const message = controlledMessage ?? esther.message;
  const config = estherStates[state];
  const compact = variant === "compact";

  const [isSmall, setIsSmall] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 768px)");
    const sync = () => setIsSmall(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  const handleAction = (action: EstherQuickAction) => {
    onAction?.(action);
    if (action.herramienta) {
      setHerramienta(action.herramienta);
      return;
    }
    void esther.send(action.prompt ?? action.label, action.section);
  };
  const SEL =
    "glass-panel h-8 rounded-full border-0 bg-transparent px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40";

  if (compact) {
    return (
      <div className="esther-ai glass-panel relative flex items-center gap-4 overflow-hidden rounded-2xl p-4">
        <div className="relative h-[220px] w-[140px] shrink-0">
          <EstherGlow intensity={config.glow} pulseKey={state} />
          <EstherParticles
            count={config.particles}
            drift={config.drift}
            dataFlow={config.dataFlow}
            compact
          />
          <EstherCharacter state={state} compact />
        </div>
        <div className="min-w-0">
          <EstherMessage state={state} message={message} />
        </div>
      </div>
    );
  }

  return (
    <section
      className="esther-ai relative min-h-screen w-full overflow-hidden"
      style={{ backgroundImage: "var(--gradient-canvas)" }}
      aria-label="Esther AI"
    >
      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-8 lg:px-8">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className="grid h-10 w-10 place-items-center rounded-xl font-display text-base font-bold text-primary-foreground"
              style={{ background: "var(--gradient-esther)" }}
            >
              E
            </span>
            <div>
              <h1 className="font-display text-lg font-semibold tracking-tight text-foreground">
                Esther AI
              </h1>
              <p className="text-xs text-muted-foreground">
                Inteligencia artificial de Cloud Esther
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Paciente en contexto"
              value={pacienteId ?? ""}
              onChange={(e) => setPacienteId(e.target.value ? Number(e.target.value) : undefined)}
              className={SEL}
            >
              <option value="">Sin paciente seleccionado</option>
              {pacientes.map((p) => (
                <option key={p.id} value={p.id}>
                  Paciente: {p.nombre} {p.apellido}
                </option>
              ))}
            </select>
            <select
              aria-label="Consultar como"
              value={rol}
              onChange={(e) => setRol(e.target.value as RolIA)}
              className={SEL}
              title="Esther respeta los permisos del rol"
            >
              {(Object.keys(ROL_IA_LABEL) as RolIA[]).map((r2) => (
                <option key={r2} value={r2}>
                  Como: {ROL_IA_LABEL[r2]}
                </option>
              ))}
            </select>
            {sedes.length > 1 && (
              <select
                aria-label="Sede"
                value={sede}
                onChange={(e) => setSede(e.target.value)}
                className={SEL}
              >
                <option value="Todas">Todas las sedes</option>
                {sedes.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>
            )}
          </div>
        </header>

        <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[1.05fr_1fr]">
          <motion.div
            className="glass-panel relative flex min-h-[420px] flex-col justify-end overflow-hidden rounded-3xl p-5"
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 0.61, 0.36, 1] }}
          >
            <EstherGlow intensity={config.glow} pulseKey={state} />
            <EstherParticles
              count={config.particles}
              drift={config.drift}
              dataFlow={config.dataFlow}
              compact={isSmall}
            />
            <div className="relative flex flex-1 items-end justify-center">
              <EstherCharacter state={state} compact={isSmall} />
            </div>
            <div className="relative pt-5">
              <EstherMessage state={state} message={message} />
            </div>
          </motion.div>

          <motion.div
            className="flex min-h-0 flex-col gap-5"
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 0.61, 0.36, 1] }}
          >
            <div className="glass-panel flex min-h-[320px] flex-1 flex-col rounded-3xl p-4">
              <EstherConversation
                messages={esther.messages}
                isBusy={esther.isBusy}
                onSend={(text) => void esther.send(text)}
                onTyping={esther.notifyTyping}
                voz
              />
            </div>

            <div className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Acciones rápidas
              </h2>
              <EstherQuickActionsBlock disabled={esther.isBusy} onAction={handleAction} />
              <p className="text-xs leading-relaxed text-muted-foreground">
                Esther responde con los datos reales de la clínica (pacientes, historia,
                odontograma, agenda, presupuestos, facturación, inventario, equipo y RRHH), solo de
                esta empresa y según el rol y la sede elegidos. Cada consulta queda registrada en
                auditoría. Asiste al profesional: no reemplaza el diagnóstico.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
      {herramienta &&
        // Fuera del tema oscuro de Esther: la ventana usa los colores normales de la app.
        createPortal(
          <Modal
            modulo="Cloud Esther IA"
            titulo={herramienta === "imagen" ? "Analizar imagen" : "Simulador de sonrisa"}
            onClose={() => setHerramienta(null)}
            ancho="max-w-5xl"
          >
            {herramienta === "imagen" ? (
              <EstherImagen
                pacienteInicial={pacienteId}
                usuario={nombreUsuario}
                onToast={setAviso}
              />
            ) : (
              <EstherSonrisa
                pacienteInicial={pacienteId}
                usuario={nombreUsuario}
                onToast={setAviso}
              />
            )}
          </Modal>,
          document.body,
        )}
      {aviso && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-[70] -translate-x-1/2 rounded-full bg-foreground px-4 py-2 text-xs font-medium text-background shadow-xl"
        >
          {aviso}
        </div>
      )}
    </section>
  );
}
