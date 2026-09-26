import { useState } from "react";
import { Cake, CalendarDays, Workflow, Bell, BellOff, PartyPopper } from "lucide-react";

const CARD =
  "rounded-2xl border border-border/70 bg-card p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_1px_3px_rgba(16,24,40,0.06)]";

type Persona = {
  id: string;
  nombre: string;
  puesto: string;
  fecha: string;
  diaMes: number;
  mesActual: boolean;
};

type Evento = {
  id: string;
  titulo: string;
  fecha: string;
};

const CUMPLEANOS: Persona[] = [
  { id: "1", nombre: "Lucía Fernández", puesto: "Asistente dental", fecha: "3 de octubre", diaMes: 3, mesActual: true },
  { id: "2", nombre: "Dr. Juan Pérez", puesto: "Odontólogo", fecha: "14 de octubre", diaMes: 14, mesActual: true },
  { id: "3", nombre: "Martín Souza", puesto: "Recepción", fecha: "8 de noviembre", diaMes: 8, mesActual: false },
];

const EVENTOS: Evento[] = [
  { id: "e1", titulo: "Capacitación en bioseguridad", fecha: "5 de octubre" },
  { id: "e2", titulo: "Reunión general de equipo", fecha: "20 de octubre" },
];

export function CumpleanosEventos({ onToast }: { onToast: (msg: string) => void }) {
  const [avisoAutomatico, setAvisoAutomatico] = useState(true);
  const [notificados, setNotificados] = useState<string[]>([]);

  const notificarAhora = (persona: Persona) => {
    setNotificados((prev) => [...prev, persona.id]);
    onToast(`Aviso de cumpleaños de ${persona.nombre} enviado al equipo`);
    onToast(`n8n: flujo "Aviso de cumpleaños" ejecutado`);
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
      <div className={CARD}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
              <Cake className="size-4.5" />
            </span>
            <h2 className="text-base font-bold tracking-tight text-foreground">Cumpleaños del equipo</h2>
          </div>
        </div>

        <ul className="mt-4 divide-y divide-border/60">
          {CUMPLEANOS.map((p) => {
            const yaNotificado = notificados.includes(p.id);
            return (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {p.nombre.charAt(0)}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{p.nombre}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.puesto} · {p.fecha}
                    </p>
                  </div>
                  {p.mesActual && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                      Este mes
                    </span>
                  )}
                </div>

                <button
                  onClick={() => notificarAhora(p)}
                  disabled={yaNotificado}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    yaNotificado
                      ? "cursor-default border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-border bg-background text-foreground hover:bg-muted/60"
                  }`}
                >
                  <PartyPopper className="size-3.5" />
                  {yaNotificado ? "Avisado" : "Avisar ahora"}
                </button>
              </li>
            );
          })}
        </ul>

        <div className="mt-5 flex items-center gap-2 border-t border-border/60 pt-4">
          <CalendarDays className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-bold text-foreground">Próximos eventos</h3>
        </div>
        <ul className="mt-2 space-y-2">
          {EVENTOS.map((e) => (
            <li key={e.id} className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2 text-xs">
              <span className="font-medium text-foreground">{e.titulo}</span>
              <span className="text-muted-foreground">{e.fecha}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className={CARD}>
        <div className="flex items-center gap-2">
          <Workflow className="size-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">Automatización n8n</h3>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Cuando está activo, el día del cumpleaños de cada persona se publica un aviso automático en
          Comunicaciones internas, sin que nadie tenga que acordarse de hacerlo a mano.
        </p>

        <button
          onClick={() => {
            setAvisoAutomatico((v) => !v);
            onToast(avisoAutomatico ? "Aviso automático de cumpleaños pausado" : "Aviso automático de cumpleaños activado");
          }}
          className={`mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-colors ${
            avisoAutomatico
              ? "border border-border bg-background text-foreground hover:bg-muted/60"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          }`}
        >
          {avisoAutomatico ? (
            <>
              <BellOff className="size-3.5" />
              Pausar aviso automático
            </>
          ) : (
            <>
              <Bell className="size-3.5" />
              Activar aviso automático
            </>
          )}
        </button>

        <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span
            className={`size-2 rounded-full ${avisoAutomatico ? "bg-emerald-500" : "bg-muted-foreground/40"}`}
          />
          Estado actual: {avisoAutomatico ? "Activo" : "Pausado"}
        </div>
      </div>
    </div>
  );
}