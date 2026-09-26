import { useState } from "react";
import { FileText, Upload, Workflow, CheckCircle2, User, Search } from "lucide-react";

const CARD =
  "rounded-2xl border border-border/70 bg-card p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_1px_3px_rgba(16,24,40,0.06)]";

type Documento = {
  id: string;
  nombre: string;
  tipo: string;
  fecha: string;
};

type Empleado = {
  id: string;
  nombre: string;
  puesto: string;
  documentos: Documento[];
};

const EMPLEADOS_INICIALES: Empleado[] = [
  {
    id: "1",
    nombre: "Dr. Juan Pérez",
    puesto: "Odontólogo",
    documentos: [
      { id: "d1", nombre: "DNI (frente y dorso)", tipo: "Identificación", fecha: "12 Mar 2024" },
      { id: "d2", nombre: "Título profesional", tipo: "Certificación", fecha: "12 Mar 2024" },
      { id: "d3", nombre: "Contrato firmado", tipo: "Contrato", fecha: "15 Mar 2024" },
    ],
  },
  {
    id: "2",
    nombre: "Lucía Fernández",
    puesto: "Asistente dental",
    documentos: [
      { id: "d4", nombre: "DNI (frente y dorso)", tipo: "Identificación", fecha: "02 Jun 2024" },
    ],
  },
  {
    id: "3",
    nombre: "Martín Souza",
    puesto: "Recepción",
    documentos: [],
  },
];

export function LegajosDigitales({ onToast }: { onToast: (msg: string) => void }) {
  const [empleados, setEmpleados] = useState<Empleado[]>(EMPLEADOS_INICIALES);
  const [seleccionado, setSeleccionado] = useState<string>(EMPLEADOS_INICIALES[0]!.id);
  const [busqueda, setBusqueda] = useState("");

  const filtrados = empleados.filter((e) =>
    e.nombre.toLowerCase().includes(busqueda.trim().toLowerCase()),
  );
  const empleado = empleados.find((e) => e.id === seleccionado) ?? empleados[0]!;

  const subirDocumento = () => {
    const nuevo: Documento = {
      id: `${Date.now()}`,
      nombre: "Documento cargado",
      tipo: "General",
      fecha: new Date().toLocaleDateString("es-AR"),
    };
    setEmpleados((prev) =>
      prev.map((e) =>
        e.id === empleado.id ? { ...e, documentos: [nuevo, ...e.documentos] } : e,
      ),
    );
    onToast(`Documento agregado al legajo de ${empleado.nombre}`);
    onToast(`n8n: flujo "Notificar documento nuevo" disparado`);
  };

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-[240px_1fr]">
      <div className={CARD}>
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar empleado..."
            className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-xs outline-none placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
          />
        </div>
        <div className="space-y-1">
          {filtrados.map((e) => (
            <button
              key={e.id}
              onClick={() => setSeleccionado(e.id)}
              className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs transition-colors ${
                seleccionado === e.id
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-muted/60"
              }`}
            >
              <span
                className={`grid size-7 shrink-0 place-items-center rounded-full text-[10px] font-bold ${
                  seleccionado === e.id
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-primary/10 text-primary"
                }`}
              >
                {e.nombre.charAt(0)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{e.nombre}</span>
                <span
                  className={`block truncate text-[10px] ${
                    seleccionado === e.id ? "text-primary-foreground/80" : "text-muted-foreground"
                  }`}
                >
                  {e.documentos.length} documento{e.documentos.length !== 1 ? "s" : ""}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className={CARD}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="grid size-10 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              <User className="size-4" />
            </span>
            <div>
              <p className="text-sm font-bold text-foreground">{empleado.nombre}</p>
              <p className="text-xs text-muted-foreground">{empleado.puesto}</p>
            </div>
          </div>
          <button
            onClick={subirDocumento}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <Upload className="size-3.5" />
            Subir documento
          </button>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-xl border border-dashed border-primary/30 bg-primary/[0.03] px-3 py-2.5">
          <Workflow className="size-4 shrink-0 text-primary" />
          <p className="text-[11px] text-muted-foreground">
            <span className="font-semibold text-foreground">Automatización activa:</span> al subir un
            documento, n8n notifica al empleado y a RR.HH. por email/WhatsApp.
          </p>
        </div>

        <div className="mt-4">
          {empleado.documentos.length === 0 ? (
            <div className="grid min-h-40 place-items-center rounded-xl border border-dashed border-border/70 text-center">
              <p className="text-xs text-muted-foreground">Este legajo todavía no tiene documentos cargados.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {empleado.documentos.map((d) => (
                <li key={d.id} className="flex items-center gap-3 py-2.5">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted/50 text-muted-foreground">
                    <FileText className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-foreground">{d.nombre}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {d.tipo} · {d.fecha}
                    </p>
                  </div>
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}