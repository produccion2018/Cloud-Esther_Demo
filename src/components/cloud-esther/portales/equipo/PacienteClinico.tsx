import { useState } from "react";
import { AlertTriangle, Phone, Search, ShieldCheck, UserRound } from "lucide-react";

import {
  SeccionPaciente,
  useRegistrosPacientes,
  type SeccionRegistros,
} from "@/components/cloud-esther/PacienteSecciones";
import { OdontogramaGate } from "@/components/cloud-esther/OdontogramaGate";
import { usePacientes, type Paciente } from "@/lib/cloud-esther/pacientes";
import type { ModuloPortal } from "@/lib/cloud-esther/permisos-portal";
import { PestanasPortal, TarjetaPortal } from "../PortalShell";

/* Ubicación: src/components/cloud-esther/portales/equipo/PacienteClinico.tsx
   Espacio clínico del Portal profesional: se busca al paciente y se trabaja sobre su ficha,
   historia clínica (evolución, diagnósticos, notas y archivos), tratamientos, estudios, recetas
   y órdenes, y el Odontograma 3D con sus herramientas. Reutiliza las secciones de la carpeta
   del paciente de la clínica, así lo que carga el profesional aparece en todo Cloud Esther.
   Cada pestaña se muestra solo si el propietario le dio ese permiso. */

export type PestanaClinica =
  "ficha" | "historia" | "tratamientos" | "estudios" | "recetas" | "documentos" | "odontograma";

const PESTANAS: {
  id: PestanaClinica;
  label: string;
  permiso: ModuloPortal;
  seccion?: SeccionRegistros;
}[] = [
  { id: "ficha", label: "Ficha", permiso: "pacientes" },
  { id: "historia", label: "Historia clínica", permiso: "historia", seccion: "historia" },
  { id: "odontograma", label: "Odontograma 3D", permiso: "odontograma" },
  { id: "tratamientos", label: "Tratamientos", permiso: "tratamientos", seccion: "tratamientos" },
  { id: "estudios", label: "Estudios", permiso: "estudios", seccion: "estudios" },
  { id: "recetas", label: "Recetas y órdenes", permiso: "recetas", seccion: "recetas" },
  { id: "documentos", label: "Archivos", permiso: "historia", seccion: "documentos" },
];

export function PacienteClinico({
  inicial,
  pacienteInicial,
  puede,
  onToast,
  soloPacientes,
}: {
  inicial: PestanaClinica;
  /** Nombre completo del paciente a abrir (por ejemplo desde un turno). */
  pacienteInicial?: string | null;
  puede: (modulo: ModuloPortal) => boolean;
  onToast: (m: string) => void;
  /** Nombres de pacientes visibles (ej.: los del profesional). Si falta, todos. */
  soloPacientes?: string[];
}) {
  const { pacientes } = usePacientes();
  const registros = useRegistrosPacientes();
  const nombre = (p: Paciente) => `${p.nombre} ${p.apellido}`.trim();
  const lista = pacientes.filter(
    (p) => p.estado === "Activo" && (!soloPacientes || soloPacientes.includes(nombre(p))),
  );
  const [actual, setActual] = useState<number | null>(
    () => pacientes.find((p) => nombre(p) === pacienteInicial)?.id ?? null,
  );
  const [busqueda, setBusqueda] = useState("");
  const pestanas = PESTANAS.filter((p) => puede(p.permiso));
  const [pestana, setPestana] = useState<PestanaClinica>(
    pestanas.some((p) => p.id === inicial) ? inicial : (pestanas[0]?.id ?? "ficha"),
  );
  const paciente = pacientes.find((p) => p.id === actual) ?? null;
  const q = busqueda.trim().toLowerCase();
  const resultados = lista.filter(
    (p) =>
      !q ||
      nombre(p).toLowerCase().includes(q) ||
      p.documento.includes(q.replace(/\D/g, "") || "~"),
  );

  if (!pestanas.length)
    return (
      <TarjetaPortal>
        <div className="py-10 text-center">
          <ShieldCheck className="mx-auto size-8 text-primary" />
          <p className="mt-2 text-sm font-semibold">
            Tu usuario no tiene acceso a la información clínica
          </p>
          <p className="text-xs text-muted-foreground">
            Lo habilita el propietario en Equipo → Permisos y accesos.
          </p>
        </div>
      </TarjetaPortal>
    );

  if (!paciente)
    return (
      <TarjetaPortal
        titulo="Elegí un paciente"
        detalle={`${lista.length} pacientes`}
        icon={UserRound}
      >
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            autoFocus
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o DNI"
            className="h-12 w-full rounded-2xl border border-primary/15 bg-card pl-10 pr-3 text-base outline-none focus:border-primary/45 sm:text-sm"
          />
        </label>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {resultados.slice(0, 30).map((p) => {
            const r = registros.de(p.id);
            const alergias = r.antecedentes.alergias.length;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => setActual(p.id)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-primary/10 bg-card p-3 text-left transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
                >
                  <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary to-fuchsia-500 text-sm font-bold text-white">
                    {p.nombre[0]}
                    {p.apellido[0]}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{nombre(p)}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      DNI {p.documento} · {p.obraSocial || "Particular"}
                    </span>
                  </span>
                  {alergias > 0 && (
                    <AlertTriangle
                      className="size-4 shrink-0 text-rose-500"
                      aria-label="Alergias"
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </TarjetaPortal>
    );

  const r = registros.de(paciente.id);
  const def = PESTANAS.find((p) => p.id === pestana);
  const edad = paciente.fechaNacimiento
    ? Math.floor(
        (Date.now() - new Date(`${paciente.fechaNacimiento}T12:00:00`).getTime()) / 31557600000,
      )
    : null;

  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-[28px] border border-primary/10 bg-card p-4 shadow-[0_16px_40px_-28px_rgba(124,58,237,0.7)] sm:p-5">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-gradient-to-br from-primary/15 to-fuchsia-500/10 blur-2xl"
        />
        <div className="relative flex flex-wrap items-center gap-3">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary to-fuchsia-500 text-lg font-bold text-white shadow-lg">
            {paciente.nombre[0]}
            {paciente.apellido[0]}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-xl font-bold tracking-tight">
              {nombre(paciente)}
            </p>
            <p className="text-xs text-muted-foreground">
              DNI {paciente.documento}
              {edad !== null ? ` · ${edad} años` : ""} · {paciente.obraSocial || "Particular"} ·{" "}
              {paciente.sucursal}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {r.antecedentes.alergias.map((a) => (
                <span
                  key={a}
                  className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700"
                >
                  Alergia: {a}
                </span>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActual(null)}
            className="btn-ce-outline !min-h-10"
          >
            Cambiar paciente
          </button>
        </div>
      </section>

      <PestanasPortal
        valor={pestana}
        onCambiar={setPestana}
        opciones={pestanas.map((p) => ({ id: p.id, label: p.label }))}
      />

      <div className="rounded-3xl border border-primary/10 bg-card p-3 shadow-sm sm:p-5">
        {pestana === "ficha" ? (
          <div className="grid gap-4 md:grid-cols-2">
            <TarjetaPortal titulo="Contacto" icon={Phone}>
              <dl className="space-y-1.5 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Teléfono</dt>
                  <dd className="font-semibold">{paciente.telefono || "—"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Email</dt>
                  <dd className="truncate font-semibold">{paciente.email || "—"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Dirección</dt>
                  <dd className="truncate font-semibold">{paciente.direccion || "—"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Afiliado</dt>
                  <dd className="font-semibold">{paciente.afiliado || "—"}</dd>
                </div>
              </dl>
            </TarjetaPortal>
            <TarjetaPortal titulo="Resumen clínico" icon={UserRound}>
              <dl className="space-y-1.5 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Notas y evoluciones</dt>
                  <dd className="font-semibold">{r.notasClinicas.length + r.historia.length}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Diagnósticos</dt>
                  <dd className="font-semibold">{r.diagnosticos.length}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Tratamientos</dt>
                  <dd className="font-semibold">{r.tratamientos.length}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Estudios</dt>
                  <dd className="font-semibold">{r.estudios.length}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Recetas</dt>
                  <dd className="font-semibold">{r.recetas.length}</dd>
                </div>
              </dl>
              {paciente.nota && (
                <p className="mt-3 rounded-xl bg-muted/60 px-3 py-2 text-xs">{paciente.nota}</p>
              )}
            </TarjetaPortal>
          </div>
        ) : pestana === "odontograma" ? (
          <OdontogramaGate
            key={`odo-${paciente.id}`}
            vista="3d"
            pacienteId={String(paciente.id)}
            pacienteNombre={nombre(paciente)}
            onToast={onToast}
          />
        ) : def?.seccion ? (
          <SeccionPaciente
            key={`${paciente.id}-${def.seccion}`}
            seccion={def.seccion}
            datos={r}
            cambiar={(clave, fn) => registros.cambiar(paciente.id, clave, fn)}
            onToast={onToast}
            contexto={{ paciente: nombre(paciente), email: paciente.email }}
          />
        ) : null}
      </div>
    </div>
  );
}
