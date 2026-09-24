import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Search,
  X,
  UserPlus,
  Users,
  ChevronRight,
  Phone,
  Mail,
  Contact,
  ArrowUpRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { AppShell } from "@/components/cloud-esther/AppShell";
import {
  CloudEstherProvider,
  useCloudEsther,
} from "@/lib/cloud-esther/data";
import {
  SeccionPaciente,
  useRegistrosPacientes,
} from "@/components/cloud-esther/PacienteSecciones";
import type {
  SeccionRegistros,
} from "@/components/cloud-esther/PacienteSecciones";
import { OdontogramaGate } from "@/components/cloud-esther/OdontogramaGate";
import { Odontograma3D } from "@/components/cloud-esther/Odontograma3D";
import { usePacientes } from "@/lib/cloud-esther/pacientes";
import type { Paciente } from "@/lib/cloud-esther/pacientes";

/*
  Página de acceso directo desde el sidebar.

  La lógica de navegación y selección se mantiene intacta.
  La presentación visual sigue la misma línea de Pacientes:
  cálida, moderna, expresiva y clínica sin verse sobria.
*/

export type SeccionDirectaId = SeccionRegistros | "odontograma" | "odontograma-3d";

export const headSeccion = (titulo: string) => () => ({
  meta: [{ title: `${titulo} | Cloud Esther` }],
  links: [
    {
      rel: "stylesheet",
      href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
    },
  ],
});

/* ─────────────────────────────────────────────
   Estilos
───────────────────────────────────────────── */

const INPUT =
  "h-12 w-full rounded-2xl border border-border/70 bg-background/90 px-4 text-sm shadow-sm outline-none transition-all placeholder:text-muted-foreground focus:border-primary/50 focus:ring-4 focus:ring-primary/10";

const BTN_PRIMARIO =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all duration-200 hover:bg-primary/90 hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20";

const BTN_SECUNDARIO =
  "inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-border/70 bg-background/80 px-3.5 py-2 text-xs font-semibold text-foreground shadow-sm transition-all duration-200 hover:border-primary/30 hover:bg-primary/5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25";

const CIRCULO_ICONO =
  "grid shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/10";

function formatearDocumento(digitos: string) {
  return digitos ? Number(digitos).toLocaleString("es-AR") : "";
}

function etiquetaObraSocial(o: string) {
  return o.startsWith("No aplica") ? "Particular" : o;
}

function iniciales(
  p: Pick<Paciente, "nombre" | "apellido">,
) {
  return `${p.nombre.charAt(0)}${p.apellido.charAt(0)}`.toUpperCase();
}

function useToast() {
  const [message, setMessage] = useState<string | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const show = (msg: string) => {
    setMessage(msg);

    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(
      () => setMessage(null),
      2400,
    );
  };

  return { message, show };
}

/* ─────────────────────────────────────────────
   Fondo visual
───────────────────────────────────────────── */

function FondoSeccion() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div className="absolute left-[-120px] top-[-100px] size-[380px] rounded-full bg-primary/[0.07] blur-3xl" />

      <div className="absolute bottom-[-150px] right-[-100px] size-[420px] rounded-full bg-violet-400/[0.06] blur-3xl" />

      <div className="absolute left-1/2 top-[250px] size-[280px] -translate-x-1/2 rounded-full bg-fuchsia-300/[0.035] blur-3xl" />
    </div>
  );
}

/* ─────────────────────────────────────────────
   Componentes visuales
───────────────────────────────────────────── */

function Avatar({
  paciente,
  className,
}: {
  paciente: Paciente;
  className: string;
}) {
  return (
    <span
      className={`grid shrink-0 place-items-center overflow-hidden rounded-full bg-primary/10 font-semibold text-primary ring-1 ring-primary/15 ${className}`}
    >
      {paciente.foto ? (
        <img
          src={paciente.foto}
          alt={`${paciente.nombre} ${paciente.apellido}`}
          className="size-full object-cover"
        />
      ) : (
        iniciales(paciente)
      )}
    </span>
  );
}

function BadgeEstado({
  estado,
}: {
  estado: Paciente["estado"];
}) {
  const activo = estado === "Activo";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
        activo
          ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/15"
          : "bg-muted text-muted-foreground ring-1 ring-inset ring-border"
      }`}
    >
      <span
        className={`size-1.5 rounded-full ${
          activo
            ? "bg-emerald-500"
            : "bg-muted-foreground/50"
        }`}
      />

      {estado}
    </span>
  );
}

function BadgeObraSocial({
  paciente,
}: {
  paciente: Paciente;
}) {
  return (
    <span className="rounded-full bg-primary/[0.06] px-2.5 py-1 text-[11px] font-medium text-primary/80 ring-1 ring-inset ring-primary/10">
      {etiquetaObraSocial(paciente.obraSocial)}
    </span>
  );
}

/* ─────────────────────────────────────────────
   Página
───────────────────────────────────────────── */

type Props = {
  seccion: SeccionDirectaId;
  titulo: string;
  descripcion: string;
  icon: LucideIcon;
};

function SeccionDirectaInner({
  seccion,
  titulo,
  descripcion,
  icon: Icon,
}: Props) {
  const { message, show } = useToast();

  const { plan } = useCloudEsther();

  const {
    pacientes,
    activoId,
    setActivoId,
  } = usePacientes();

  const registros = useRegistrosPacientes();

  const [busqueda, setBusqueda] = useState("");

  const activo =
    pacientes.find((p) => p.id === activoId) ?? null;

  const q = busqueda.trim().toLowerCase();

  const qDigitos = q.replace(/\D/g, "");

  const resultados = pacientes.filter(
    (p) =>
      !q ||
      `${p.nombre} ${p.apellido}`
        .toLowerCase()
        .includes(q) ||
      `${p.apellido} ${p.nombre}`
        .toLowerCase()
        .includes(q) ||
      (qDigitos.length > 0 &&
        (p.documento.includes(qDigitos) ||
          p.telefono
            .replace(/\D/g, "")
            .includes(qDigitos))),
  );

  const elegir = (p: Paciente) => {
    setActivoId(p.id);
    setBusqueda("");
  };

  return (
    <AppShell>
      <div className="relative min-h-full overflow-hidden bg-muted/[0.12]">
        <FondoSeccion />

        <div
          className="relative mx-auto w-full max-w-[1400px] px-4 py-6 md:px-6 lg:px-8"
          style={{
            fontFamily:
              '"Inter", ui-sans-serif, system-ui, sans-serif',
          }}
        >
          {/* ───────────────── Header ───────────────── */}

          <header className="overflow-hidden rounded-3xl border border-primary/15 bg-card/90 p-5 shadow-sm backdrop-blur-sm md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div className="flex min-w-0 items-start gap-4">
                <span
                  className={`${CIRCULO_ICONO} size-14 shadow-sm`}
                >
                  <Icon
                    className="size-6"
                    strokeWidth={2}
                  />
                </span>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-primary/75">
                      Espacio clínico
                    </p>

                    <span className="rounded-full bg-primary/[0.07] px-2.5 py-1 text-[10px] font-bold text-primary ring-1 ring-inset ring-primary/10">
                      {pacientes.length}{" "}
                      {pacientes.length === 1
                        ? "paciente"
                        : "pacientes"}
                    </span>
                  </div>

                  <h1 className="mt-1.5 font-display text-3xl font-bold tracking-tight text-foreground">
                    {titulo}
                  </h1>

                  <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">
                    {activo
                      ? `Historia y registros de ${activo.nombre} ${activo.apellido}.`
                      : descripcion}
                  </p>
                </div>
              </div>

              {activo && (
                <button
                  type="button"
                  onClick={() => setActivoId(null)}
                  className={BTN_SECUNDARIO}
                >
                  <Users className="size-3.5" />
                  Cambiar paciente
                </button>
              )}
            </div>

            {!activo && pacientes.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                <div className="rounded-xl bg-primary/[0.055] px-3 py-2 text-xs font-semibold text-primary ring-1 ring-inset ring-primary/10">
                  Acceso rápido
                </div>

                <div className="rounded-xl bg-muted/60 px-3 py-2 text-xs font-medium text-muted-foreground">
                  Nombre
                </div>

                <div className="rounded-xl bg-muted/60 px-3 py-2 text-xs font-medium text-muted-foreground">
                  DNI
                </div>

                <div className="rounded-xl bg-muted/60 px-3 py-2 text-xs font-medium text-muted-foreground">
                  Teléfono
                </div>
              </div>
            )}
          </header>

          {/* ───────────────── Sin paciente ───────────────── */}

          {!activo ? (
            <section className="mt-5">
              <div className="overflow-hidden rounded-3xl border border-primary/10 bg-card/90 shadow-sm backdrop-blur-sm">
                <div className="border-b border-border/60 bg-primary/[0.025] px-5 py-5 sm:px-7">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-base font-bold text-foreground">
                        Seleccioná un paciente
                      </p>

                      <p className="mt-1 text-sm text-muted-foreground">
                        Buscá por nombre, documento o teléfono
                        para entrar directamente a sus registros.
                      </p>
                    </div>

                    {pacientes.length > 0 && (
                      <div className="rounded-full bg-background/80 px-3 py-1.5 text-xs font-bold text-primary ring-1 ring-inset ring-primary/10">
                        {q
                          ? `${resultados.length} de ${pacientes.length}`
                          : pacientes.length}{" "}
                        {pacientes.length === 1
                          ? "paciente"
                          : "pacientes"}
                      </div>
                    )}
                  </div>

                  <div className="relative mt-5 max-w-3xl">
                    <Search className="pointer-events-none absolute left-4 top-1/2 size-4.5 -translate-y-1/2 text-primary/60" />

                    <input
                      autoFocus
                      value={busqueda}
                      onChange={(e) =>
                        setBusqueda(e.target.value)
                      }
                      onKeyDown={(e) => {
                        if (
                          e.key === "Enter" &&
                          resultados.length > 0
                        ) {
                          elegir(resultados[0]);
                        }
                      }}
                      placeholder="Buscar paciente por nombre, DNI o teléfono..."
                      className={`${INPUT} pl-11 ${
                        busqueda ? "pr-11" : ""
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
                  <div className="px-5 py-14 sm:px-7">
                    <div className="mx-auto max-w-md text-center">
                      <div className="mx-auto grid size-16 place-items-center rounded-3xl bg-primary/[0.07] text-primary ring-1 ring-inset ring-primary/10">
                        <Users className="size-7" />
                      </div>

                      <p className="mt-4 text-sm font-bold text-foreground">
                        {pacientes.length === 0
                          ? "Todavía no hay pacientes"
                          : "No encontramos coincidencias"}
                      </p>

                      <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                        {pacientes.length === 0
                          ? "Creá el primer paciente para comenzar a trabajar con sus registros."
                          : "Probá con otro nombre, documento o número de teléfono."}
                      </p>

                      {pacientes.length === 0 && (
                        <Link
                          to="/demo/pacientes"
                          className={`${BTN_PRIMARIO} mt-5`}
                        >
                          <UserPlus className="size-4" />
                          Ir a Pacientes
                        </Link>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 sm:p-4">
                    <div className="space-y-2">
                      {resultados.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => elegir(p)}
                          className="group flex w-full items-center gap-4 rounded-2xl border border-transparent bg-background/70 px-4 py-3.5 text-left transition-all duration-200 hover:border-primary/15 hover:bg-primary/[0.035] hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 sm:px-5"
                        >
                          <Avatar
                            paciente={p}
                            className="size-12 text-sm"
                          />

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-sm font-bold text-foreground">
                                {p.nombre} {p.apellido}
                              </p>

                              <BadgeEstado
                                estado={p.estado}
                              />
                            </div>

                            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                              <span>
                                DNI{" "}
                                {formatearDocumento(
                                  p.documento,
                                )}
                              </span>

                              {p.telefono && (
                                <span className="flex items-center gap-1">
                                  <Phone className="size-3" />
                                  {p.telefono}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="hidden shrink-0 sm:block">
                            <BadgeObraSocial paciente={p} />
                          </div>

                          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-muted/50 text-muted-foreground transition-all group-hover:bg-primary/10 group-hover:text-primary">
                            <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {pacientes.length > 0 && (
                <div className="mt-3 flex items-center gap-2 px-1 text-xs text-muted-foreground">
                  <Search className="size-3.5 text-primary/60" />

                  <span>
                    Presioná Enter para abrir el primer resultado.
                  </span>
                </div>
              )}
            </section>
          ) : (
            <>
              {/* ───────────────── Paciente seleccionado ───────────────── */}

              <section className="mt-5">
                <div className="overflow-hidden rounded-3xl border border-primary/12 bg-card/90 shadow-sm backdrop-blur-sm">
                  <div className="h-1 bg-primary" />

                  <div className="p-5 sm:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-5">
                      <div className="flex min-w-0 items-center gap-4">
                        <Avatar
                          paciente={activo}
                          className="size-16 text-lg"
                        />

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="truncate text-xl font-bold tracking-tight text-foreground">
                              {activo.nombre}{" "}
                              {activo.apellido}
                            </h2>

                            <BadgeEstado
                              estado={activo.estado}
                            />

                            <BadgeObraSocial
                              paciente={activo}
                            />
                          </div>

                          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                              <Contact className="size-3.5 text-primary/60" />
                              DNI{" "}
                              {formatearDocumento(
                                activo.documento,
                              )}
                            </span>

                            {activo.telefono && (
                              <span className="flex items-center gap-1.5">
                                <Phone className="size-3.5 text-primary/60" />
                                {activo.telefono}
                              </span>
                            )}

                            {activo.email && (
                              <span className="flex min-w-0 items-center gap-1.5">
                                <Mail className="size-3.5 shrink-0 text-primary/60" />

                                <span className="truncate">
                                  {activo.email}
                                </span>
                              </span>
                            )}

                            {activo.afiliado && (
                              <span>
                                Afiliado{" "}
                                {activo.afiliado}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setActivoId(null)}
                        className={BTN_SECUNDARIO}
                      >
                        <Users className="size-3.5" />
                        Cambiar paciente
                      </button>
                    </div>

                    <div className="mt-5 flex flex-wrap items-center gap-2 rounded-2xl bg-primary/[0.035] px-4 py-3 ring-1 ring-inset ring-primary/[0.08]">
                      <span className="size-2 rounded-full bg-emerald-500" />

                      <span className="text-xs font-semibold text-foreground">
                        Paciente seleccionado
                      </span>

                      <span className="text-muted-foreground/30">
                        /
                      </span>

                      <span className="text-xs font-semibold text-primary">
                        {titulo}
                      </span>

                      <ArrowUpRight className="ml-auto size-4 text-primary/60" />
                    </div>
                  </div>
                </div>
              </section>

              {/* ───────────────── Contenido ───────────────── */}

              <main className="mt-4">
                <div className="overflow-hidden rounded-3xl border border-primary/10 bg-card/90 p-4 shadow-sm backdrop-blur-sm sm:p-6">
                  {seccion === "odontograma" ? (
                    <OdontogramaGate
                      key={`${activo.id}-${plan}`}
                      pacienteId={activo.id}
                      onToast={show}
                      plan={plan}
                    />
                  ) : seccion === "odontograma-3d" ? (
                    <Odontograma3D
                      key={`${activo.id}-3d`}
                      pacienteId={String(activo.id)}
                      onToast={show}
                    />
                  ) : (
                    <SeccionPaciente
                      key={`${activo.id}-${seccion}`}
                      seccion={seccion}
                      datos={registros.de(activo.id)}
                      cambiar={(clave, fn) =>
                        registros.cambiar(
                          activo.id,
                          clave,
                          fn,
                        )
                      }
                      onToast={show}
                      contexto={{
                        paciente:
                          `${activo.nombre} ${activo.apellido}`.trim(),
                        email: activo.email,
                        telefono: activo.telefono,
                      }}
                    />
                  )}
                </div>
              </main>
            </>
          )}
        </div>
      </div>

      {/* Toast */}

      {message && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-foreground px-4 py-2.5 text-sm font-medium text-background shadow-xl">
          <span className="size-1.5 rounded-full bg-emerald-400" />
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