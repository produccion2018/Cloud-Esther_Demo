import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Search, X, UserPlus, Users, ChevronRight, Phone, Mail, Contact } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AppShell } from "@/components/cloud-esther/AppShell";
import { CloudEstherProvider } from "@/lib/cloud-esther/data";
import { SeccionPaciente, useRegistrosPacientes } from "@/components/cloud-esther/PacienteSecciones";
import type { SeccionRegistros } from "@/components/cloud-esther/PacienteSecciones";
import { OdontogramaGate } from "@/components/cloud-esther/OdontogramaGate";
import { usePacientes } from "@/lib/cloud-esther/pacientes";
import type { Paciente } from "@/lib/cloud-esther/pacientes";

/* Ubicación sugerida: src/components/cloud-esther/SeccionDirecta.tsx

   Página de acceso directo desde el sidebar: se busca al paciente por nombre / documento / teléfono
   y se abre directamente la sección elegida (historia, recetas, estudios, tratamientos, odontograma…).
   Usa exactamente los mismos componentes y datos que la carpeta del paciente. */

export type SeccionDirectaId = SeccionRegistros | "odontograma";

/* TODO: reemplazar por el origen real del plan contratado de la clínica
   (contexto de auth, AppShell, etc). Placeholder temporal para que compile. */
const PLAN_ACTUAL = "Clínica Avanzada";

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

/* ───────────── Estilos ───────────── */

const CARD =
  "rounded-2xl border border-border/70 bg-card shadow-[0_1px_2px_rgba(16,24,40,0.04),0_1px_3px_rgba(16,24,40,0.06)] p-5";

/* Ficha del paciente ya elegido: card compacta tipo "record header", más liviana, con acento
   de color en el borde superior en vez de un fondo degradado cargado. */
const FICHA_PACIENTE =
  "relative overflow-hidden rounded-2xl border border-border/70 bg-card p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_1px_3px_rgba(16,24,40,0.06)] sm:p-6";

/* Fila de resultado dentro de la lista de búsqueda (list view, no card-botón suelta). */
const FILA_RESULTADO =
  "group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-150 hover:bg-primary/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/30";

const INPUT =
  "h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm shadow-[0_1px_2px_rgba(16,24,40,0.04)] outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/50 focus:ring-4 focus:ring-primary/10";

/* Botón primario: sólido, sin degradé pesado — un tono limpio con hover sutil. */
const BTN_PRIMARIO =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-[0_1px_2px_rgba(16,24,40,0.05)] transition-all duration-200 hover:bg-primary/90 hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20";

/* Botón secundario: outline suave, para acciones de menor jerarquía ("Cambiar paciente"). */
const BTN_SECUNDARIO =
  "inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition-colors duration-200 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25";

const CIRCULO_ICONO =
  "grid shrink-0 place-items-center rounded-xl bg-primary/10 text-primary";

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

/* Avatar: círculo plano con anillo sutil en vez de degradado fuerte + sombra pesada. */
function Avatar({ paciente, className }: { paciente: Paciente; className: string }) {
  return (
    <span
      className={`grid shrink-0 place-items-center overflow-hidden rounded-full bg-primary/10 font-semibold text-primary ring-1 ring-primary/15 ${className}`}
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
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
        estado === "Activo"
          ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/15"
          : "bg-muted text-muted-foreground ring-1 ring-inset ring-border"
      }`}
    >
      <span className={`size-1.5 rounded-full ${estado === "Activo" ? "bg-emerald-500" : "bg-muted-foreground/50"}`} />
      {estado}
    </span>
  );
}

function BadgeObraSocial({ paciente }: { paciente: Paciente }) {
  return (
    <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-foreground/80">
      {etiquetaObraSocial(paciente.obraSocial)}
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

  const elegir = (p: Paciente) => {
    setActivoId(p.id);
    setBusqueda("");
  };

  return (
    <AppShell>
      <div className="relative min-h-full bg-muted/20">
        <div
          className="relative mx-auto w-full max-w-[1400px] px-4 py-6 md:px-6 lg:px-8"
          style={{ fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif' }}
        >
          {!activo ? (
            /* Acceso a Historia clínica: solo se mejora esta pantalla; la lógica queda intacta. */
            <>
              <section className="overflow-hidden rounded-[28px] border border-primary/20 bg-white/95 shadow-[0_8px_30px_rgba(76,29,149,0.08)]">
                <div className="relative px-6 pb-5 pt-6 sm:px-7 sm:pt-7">
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.045] via-transparent to-primary/[0.025]" />

                  <div className="relative flex items-start gap-4">
                    <span className="grid size-14 shrink-0 place-items-center rounded-[20px] border border-primary/15 bg-primary/10 text-primary shadow-sm">
                      <Icon className="size-6" />
                    </span>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary/75">
                          Espacio clínico
                        </span>
                        <span className="rounded-full border border-primary/15 bg-primary/[0.06] px-2.5 py-1 text-[10px] font-semibold text-primary">
                          {pacientes.length} {pacientes.length === 1 ? "paciente" : "pacientes"}
                        </span>
                      </div>

                      <h1 className="mt-1 text-[28px] font-bold leading-tight tracking-tight text-foreground sm:text-[30px]">
                        {titulo}
                      </h1>

                      <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                        {descripcion}
                      </p>
                    </div>
                  </div>

                  <div className="relative mt-5 flex flex-wrap gap-2">
                    {["Acceso rápido", "Nombre", "DNI", "Teléfono"].map((item, index) => (
                      <span
                        key={item}
                        className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold ${
                          index === 0
                            ? "border-primary/20 bg-primary/[0.07] text-primary"
                            : "border-border/70 bg-muted/40 text-muted-foreground"
                        }`}
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </section>

              <section className="mt-5 overflow-hidden rounded-[28px] border border-primary/15 bg-white/95 shadow-[0_8px_30px_rgba(76,29,149,0.06)]">
                <div className="border-b border-primary/10 px-6 pb-5 pt-6 sm:px-7">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-base font-bold tracking-tight text-foreground">
                        Seleccioná un paciente
                      </h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Buscá por nombre, documento o teléfono para entrar directamente a sus registros.
                      </p>
                    </div>

                    {pacientes.length > 0 && (
                      <span className="rounded-full border border-primary/15 bg-primary/[0.04] px-3 py-1.5 text-[11px] font-semibold text-primary">
                        {q ? `${resultados.length} de ${pacientes.length}` : pacientes.length}{" "}
                        {pacientes.length === 1 ? "paciente" : "pacientes"}
                      </span>
                    )}
                  </div>

                  <div className="relative mt-5 max-w-[780px]">
                    <Search className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-primary/60" />
                    <input
                      autoFocus
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && resultados.length > 0) elegir(resultados[0]);
                      }}
                      placeholder="Buscar paciente por nombre, DNI o teléfono..."
                      className={`h-12 w-full rounded-2xl border border-primary/15 bg-white px-4 pl-11 text-sm text-foreground shadow-[0_2px_8px_rgba(76,29,149,0.06)] outline-none transition-all placeholder:text-muted-foreground/80 hover:border-primary/25 focus:border-primary/40 focus:ring-4 focus:ring-primary/10 ${
                        busqueda ? "pr-10" : ""
                      }`}
                    />
                    {busqueda && (
                      <button
                        type="button"
                        onClick={() => setBusqueda("")}
                        aria-label="Limpiar búsqueda"
                        className="absolute right-3 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                      >
                        <X className="size-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {resultados.length === 0 ? (
                  <div className="mx-6 my-5 grid min-h-36 place-items-center rounded-2xl border border-dashed border-primary/15 bg-primary/[0.02] p-6 text-center sm:mx-7">
                    <div>
                      <Users className="mx-auto size-8 text-primary/35" />
                      <p className="mt-2 text-sm font-semibold text-foreground">
                        {pacientes.length === 0 ? "Todavía no hay pacientes" : "No hay pacientes que coincidan"}
                      </p>
                      <p className="text-sm text-muted-foreground">Podés crear uno desde la sección Pacientes.</p>
                      <Link to="/demo/pacientes" className={`${BTN_PRIMARIO} mt-4 inline-flex`}>
                        <UserPlus className="size-4" />
                        Ir a Pacientes
                      </Link>
                    </div>
                  </div>
                ) : (
                  <ul className="divide-y divide-primary/10">
                    {resultados.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => elegir(p)}
                          className={`${FILA_RESULTADO} gap-4 px-6 py-4 hover:bg-primary/[0.035] sm:px-7`}
                        >
                          <Avatar paciente={p} className="size-11 text-sm" />

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-sm font-bold text-foreground">
                                {p.nombre} {p.apellido}
                              </p>
                              <BadgeEstado estado={p.estado} />
                            </div>

                            <p className="mt-1 truncate text-xs text-muted-foreground">
                              DNI {formatearDocumento(p.documento)}
                              {p.telefono ? `  ·  ${p.telefono}` : ""}
                            </p>
                          </div>

                          <BadgeObraSocial paciente={p} />

                          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/[0.045] text-muted-foreground transition-all group-hover:bg-primary/10 group-hover:text-primary">
                            <ChevronRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" />
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          ) : (
            <>
              {/* Ficha compacta del paciente elegido */}
              <div className={`${FICHA_PACIENTE} mt-5`}>
                <div className="absolute inset-x-0 top-0 h-1 bg-primary" aria-hidden />

                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <Avatar paciente={activo} className="size-14 text-lg" />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-lg font-bold leading-tight text-foreground">
                          {activo.nombre} {activo.apellido}
                        </p>
                        <BadgeEstado estado={activo.estado} />
                        <BadgeObraSocial paciente={activo} />
                      </div>
                      <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Contact className="size-3.5" />
                          DNI {formatearDocumento(activo.documento)}
                        </span>
                        {activo.telefono && (
                          <span className="flex items-center gap-1.5">
                            <Phone className="size-3.5" />
                            {activo.telefono}
                          </span>
                        )}
                        {activo.email && (
                          <span className="flex min-w-0 items-center gap-1.5">
                            <Mail className="size-3.5 shrink-0" />
                            <span className="truncate">{activo.email}</span>
                          </span>
                        )}
                        {activo.afiliado && <span>Afiliado {activo.afiliado}</span>}
                      </p>
                    </div>
                  </div>

                  <button type="button" onClick={() => setActivoId(null)} className={BTN_SECUNDARIO}>
                    <Users className="size-3.5" />
                    Cambiar paciente
                  </button>
                </div>
              </div>

              {/* Sección */}
              <div className="mt-4 rounded-2xl border border-border/70 bg-card p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_1px_3px_rgba(16,24,40,0.06)]">
                {seccion === "odontograma" ? (
                  <OdontogramaGate key={activo.id} pacienteId={activo.id} onToast={show} plan={PLAN_ACTUAL} />
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