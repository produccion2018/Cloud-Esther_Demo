import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Search, X, UserPlus, Users, ChevronRight, Activity } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AppShell } from "@/components/cloud-esther/AppShell";
import { CloudEstherProvider } from "@/lib/cloud-esther/data";
import { SeccionPaciente, useRegistrosPacientes } from "@/components/cloud-esther/PacienteSecciones";
import type { SeccionRegistros } from "@/components/cloud-esther/PacienteSecciones";
import { usePacientes } from "@/lib/cloud-esther/pacientes";
import type { Paciente } from "@/lib/cloud-esther/pacientes";

/* Ubicación sugerida: src/components/cloud-esther/SeccionDirecta.tsx

   Página de acceso directo desde el sidebar: se busca al paciente por nombre / documento / teléfono
   y se abre directamente la sección elegida (historia, recetas, estudios, tratamientos…).
   Usa exactamente los mismos componentes y datos que la carpeta del paciente. */

export type SeccionDirectaId = SeccionRegistros | "odontograma";

/* Head común de las rutas (título + tipografía Inter, igual que Pacientes). */
export const headSeccion = (titulo: string) => () => ({
  meta: [{ title: `${titulo} | Cloud Esther` }],
  links: [
    {
      rel: "stylesheet",
      href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
    },
  ],
});

/* ───────────── Estilos (mismos que Pacientes) ───────────── */

const CARD =
  "rounded-xl border border-primary/25 bg-card/90 bg-gradient-to-b from-[oklch(0.96_0.025_292)]/70 to-transparent p-4 shadow-sm backdrop-blur-sm";

const DATO_CARD =
  "relative overflow-hidden rounded-xl border border-primary/20 bg-card bg-gradient-to-br from-card via-card to-[oklch(0.94_0.035_292)] p-3 shadow-sm";

const INPUT =
  "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20";

const BTN_PRIMARIO =
  "flex items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-primary to-[oklch(0.5_0.2_292)] px-4 py-2 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/25 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/30 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2";

const BTN_SECUNDARIO =
  "flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/5 hover:shadow-md active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2";

const CIRCULO_ICONO =
  "grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-primary ring-1 ring-primary/15";

/* ───────────── Utilidades ───────────── */

function formatearDocumento(digitos: string) {
  return digitos ? Number(digitos).toLocaleString("es-AR") : "";
}

function etiquetaObraSocial(o: string) {
  return o.startsWith("No aplica") ? "Particular" : o;
}

function iniciales(p: Pick<Paciente, "nombre" | "apellido">) {
  return `${p.nombre.charAt(0)}${p.apellido.charAt(0)}`.toUpperCase();
}

function useToast() {
  const [message, setMessage] = useState<string | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const show = (msg: string) => {
    setMessage(msg);
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => setMessage(null), 2400);
  };
  return { message, show };
}

function Avatar({ paciente, className }: { paciente: Paciente; className: string }) {
  return (
    <span
      className={`grid shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-primary to-[oklch(0.45_0.2_290)] font-semibold text-primary-foreground shadow-md shadow-primary/25 ring-2 ring-card ${className}`}
    >
      {paciente.foto ? (
        <img src={paciente.foto} alt={`${paciente.nombre} ${paciente.apellido}`} className="size-full object-cover" />
      ) : (
        iniciales(paciente)
      )}
    </span>
  );
}

function BadgeEstado({ estado }: { estado: Paciente["estado"] }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        estado === "Activo" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
      }`}
    >
      {estado}
    </span>
  );
}

/* ───────────── Página ───────────── */

type Props = {
  seccion: SeccionDirectaId;
  titulo: string;
  descripcion: string;
  icon: LucideIcon;
};

function SeccionDirectaInner({ seccion, titulo, descripcion, icon: Icon }: Props) {
  const { message, show } = useToast();
  const { pacientes, activoId, setActivoId } = usePacientes();
  const registros = useRegistrosPacientes();
  const [busqueda, setBusqueda] = useState("");

  const activo = pacientes.find((p) => p.id === activoId) ?? null;

  const q = busqueda.trim().toLowerCase();
  const qDigitos = q.replace(/\D/g, "");
  const resultados = pacientes.filter(
    (p) =>
      !q ||
      `${p.nombre} ${p.apellido}`.toLowerCase().includes(q) ||
      `${p.apellido} ${p.nombre}`.toLowerCase().includes(q) ||
      (qDigitos.length > 0 && (p.documento.includes(qDigitos) || p.telefono.replace(/\D/g, "").includes(qDigitos))),
  );

  return (
    <AppShell>
      <div className="relative min-h-full">
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.05] via-transparent to-primary/[0.04]" />
          <div className="absolute -left-24 -top-24 size-96 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-32 -right-24 size-[28rem] rounded-full bg-primary/10 blur-3xl" />
        </div>

        <div
          className="relative mx-auto w-full max-w-[1400px] px-4 py-5 md:px-6 lg:px-8"
          style={{ fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif' }}
        >
          {/* Encabezado */}
          <div className="flex items-start gap-3">
            <span className={`${CIRCULO_ICONO} size-11`}>
              <Icon className="size-5" />
            </span>
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight">{titulo}</h1>
              <p className="mt-0.5 max-w-2xl text-sm text-muted-foreground">{descripcion}</p>
            </div>
          </div>

          {!activo ? (
            /* Buscador de paciente */
            <div className={`${CARD} mt-4`}>
              <p className="text-sm font-semibold">Elegí un paciente</p>
              <p className="text-xs text-muted-foreground">Buscá por nombre, documento o teléfono.</p>

              <div className="relative mt-3">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  autoFocus
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar paciente por nombre, documento o teléfono"
                  className={`${INPUT} pl-9 ${busqueda ? "pr-9" : ""}`}
                />
                {busqueda && (
                  <button
                    type="button"
                    onClick={() => setBusqueda("")}
                    aria-label="Limpiar búsqueda"
                    className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-primary/10"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>

              {resultados.length === 0 ? (
                <div className="mt-3 grid min-h-32 place-items-center rounded-xl border border-dashed border-border p-6 text-center">
                  <div>
                    <Users className="mx-auto size-8 text-primary/60" />
                    <p className="mt-2 text-sm font-semibold">
                      {pacientes.length === 0 ? "Todavía no hay pacientes" : "No hay pacientes que coincidan"}
                    </p>
                    <p className="text-sm text-muted-foreground">Podés crear uno desde la sección Pacientes.</p>
                    <Link to="/demo/pacientes" className={`${BTN_PRIMARIO} mt-3 inline-flex`}>
                      <UserPlus className="size-4" />
                      Ir a Pacientes
                    </Link>
                  </div>
                </div>
              ) : (
                <ul className="mt-3 space-y-2">
                  {resultados.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setActivoId(p.id);
                          setBusqueda("");
                        }}
                        className="flex w-full items-center gap-3 rounded-xl border border-border bg-card/95 p-3 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      >
                        <Avatar paciente={p} className="size-11 text-sm" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">
                            {p.nombre} {p.apellido}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            DNI {formatearDocumento(p.documento)}
                            {p.telefono ? ` · ${p.telefono}` : ""}
                          </p>
                        </div>
                        <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
                          <BadgeEstado estado={p.estado} />
                          <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[11px] font-semibold">
                            {etiquetaObraSocial(p.obraSocial)}
                          </span>
                        </div>
                        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <>
              {/* Paciente elegido */}
              <div className={`${DATO_CARD} mt-4 flex flex-wrap items-center gap-3`}>
                <Avatar paciente={activo} className="size-12 text-base" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold leading-tight">
                    {activo.nombre} {activo.apellido}
                  </p>
                  <p className="text-sm text-muted-foreground">DNI {formatearDocumento(activo.documento)}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <BadgeEstado estado={activo.estado} />
                    <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[11px] font-semibold">
                      {etiquetaObraSocial(activo.obraSocial)}
                    </span>
                  </div>
                </div>
                <button type="button" onClick={() => setActivoId(null)} className={BTN_SECUNDARIO}>
                  <Users className="size-4" />
                  Cambiar paciente
                </button>
              </div>

              {/* Sección */}
              <div className="mt-3 rounded-xl border border-primary/25 bg-card/95 p-4">
                {seccion === "odontograma" ? (
                  <div className="grid min-h-48 place-items-center rounded-xl border border-dashed border-border text-center">
                    <div>
                      <Activity className="mx-auto size-8 text-primary/60" />
                      <p className="mt-2 text-sm font-semibold">{titulo}</p>
                      <p className="text-sm text-muted-foreground">Esta sección estará disponible próximamente.</p>
                    </div>
                  </div>
                ) : (
                  <SeccionPaciente
                    key={`${activo.id}-${seccion}`}
                    seccion={seccion}
                    datos={registros.de(activo.id)}
                    cambiar={(clave, fn) => registros.cambiar(activo.id, clave, fn)}
                    onToast={show}
                    contexto={{
                      paciente: `${activo.nombre} ${activo.apellido}`.trim(),
                      email: activo.email,
                    }}
                  />
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {message && (
        <div className="fixed bottom-6 right-6 z-50 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background shadow-lg">
          {message}
        </div>
      )}
    </AppShell>
  );
}

export function PaginaSeccionPaciente(props: Props) {
  return (
    <CloudEstherProvider>
      <SeccionDirectaInner {...props} />
    </CloudEstherProvider>
  );
}